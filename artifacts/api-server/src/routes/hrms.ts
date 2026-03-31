import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import { createRequire } from "module";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { createHash } from "crypto";
import { db, pool, resumeAnalysisCacheTable } from "@workspace/db";
import { eq } from "drizzle-orm";

pool
  .query(`
    CREATE TABLE IF NOT EXISTS resume_analysis_cache (
      id SERIAL PRIMARY KEY,
      file_hash TEXT NOT NULL UNIQUE,
      result JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  .then(() => console.log("resume_analysis_cache table ready"))
  .catch((e: any) => console.error("resume_analysis_cache table error:", e.message));
const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
import {
  fetchErpNextEmployees,
  fetchErpNextLeaveApplications,
  fetchErpNextAttendance,
  fetchErpNextUserRoles,
  fetchErpNextManagedDepartments,
  fetchErpNextUserDepartmentPermissions,
  fetchErpNextSubordinates,
  fetchErpNextUsers,
  fetchErpNextCheckins,
  createErpNextCheckin,
  fetchErpNextLeaveTypes,
  createErpNextLeaveApplication,
  fetchErpNextExpenseClaims,
  fetchErpNextExpenseClaimTypes,
  createErpNextExpenseClaim,
  fetchErpNextRecruitmentTrackers,
  fetchErpNextRecruitmentTracker,
  fetchErpNextGrievances,
} from "../lib/erpnext";
import { chatPool } from "../chat-ws";

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function erpAuthHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

async function fetchErpFile(filePath: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const url = `${ERPNEXT_URL}${filePath}`;
  const res = await fetch(url, { headers: { Authorization: erpAuthHeader() } });
  if (!res.ok) throw new Error(`ERPNext file fetch error ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return { buffer, contentType, ext };
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function renderPdfPages(pdfBuf: Buffer): Promise<{ pages: { base64: string; mime: string }[]; text: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resume-"));
  const pdfPath = path.join(tmpDir, "resume.pdf");
  const outPrefix = path.join(tmpDir, "page");
  try {
    await fs.writeFile(pdfPath, pdfBuf);

    // Extract text
    let text = "";
    try { const parsed = await pdfParse(pdfBuf); text = parsed.text; } catch { text = ""; }

    // Render pages to JPEG at 150 DPI (good quality / reasonable size)
    try {
      await execFileAsync("pdftoppm", ["-jpeg", "-r", "150", "-jpegopt", "quality=85", pdfPath, outPrefix]);
    } catch {
      // Try without jpegopt (older versions)
      try { await execFileAsync("pdftoppm", ["-jpeg", "-r", "150", pdfPath, outPrefix]); } catch { /* fall through */ }
    }

    const files = await fs.readdir(tmpDir);
    const pageFiles = files.filter(f => f.startsWith("page") && (f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".ppm"))).sort();

    const pages: { base64: string; mime: string }[] = [];
    for (const file of pageFiles) {
      const buf = await fs.readFile(path.join(tmpDir, file));
      pages.push({ base64: buf.toString("base64"), mime: file.endsWith(".ppm") ? "image/x-portable-pixmap" : "image/jpeg" });
    }
    return { pages, text: text.replace(/\s+/g, " ").trim() };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function extractJpegsFromPdf(buf: Buffer): Buffer[] {
  const jpegs: Buffer[] = [];
  let i = 0;
  while (i < buf.length - 3) {
    if (buf[i] === 0xFF && buf[i + 1] === 0xD8 && buf[i + 2] === 0xFF) {
      const start = i;
      let j = i + 2;
      while (j < buf.length - 1) {
        if (buf[j] === 0xFF && buf[j + 1] === 0xD9) { j += 2; break; }
        j++;
      }
      const candidate = buf.slice(start, j);
      if (candidate.length > 5000) jpegs.push(candidate);
      i = j;
    } else { i++; }
  }
  return jpegs;
}

const RESUME_JSON_SCHEMA = `{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "current_title": "",
  "linkedin_url": "",
  "github_url": "",
  "portfolio_url": "",
  "career_objective": "",
  "summary": "",
  "skills": [],
  "technical_skills": [],
  "soft_skills": [],
  "languages": [{"language":"","proficiency":"","can_write": true}],
  "experience": [{"company":"","title":"","duration":"","start_year":"","end_year":"","location":"","description":"","achievements":[]}],
  "internships": [{"company":"","title":"","duration":"","location":"","description":"","responsibilities":[]}],
  "education": [
    {"institution":"","degree":"","field":"","year":"","gpa":"","percentage":"","grade":"","level":""}
  ],
  "certifications": [{"name":"","issuer":"","platform":"","year":"","score":"","percentage":""}],
  "projects": [{"name":"","year":"","description":"","technologies":[],"highlights":[]}],
  "achievements": [{"title":"","year":"","organization":"","description":""}],
  "awards": [],
  "publications": [],
  "total_experience_years": 0,
  "career_level": "",
  "industry": "",
  "has_photo": false
}`;

const ASSESSMENT_JSON_SCHEMA = `{
  "overall_rating": 0,
  "rating_breakdown": {
    "technical_skills": 0,
    "experience_depth": 0,
    "career_growth": 0,
    "education": 0,
    "presentation": 0
  },
  "hiring_recommendation": "",
  "hiring_reason": "",
  "strengths": [],
  "concerns": [],
  "red_flags": [],
  "career_trajectory": "",
  "career_trajectory_detail": "",
  "key_achievements": [],
  "personality_insights": "",
  "company_analysis": [{"company":"","reputation":"","tier":"","notes":""}],
  "interview_questions": [{"question":"","category":"","purpose":""}],
  "salary_assessment": "",
  "growth_potential": "",
  "culture_fit_notes": "",
  "comparable_roles": []
}`;

function parseJsonResponse(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to recover truncated JSON by finding the last valid closing brace
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > 0) {
      let partial = cleaned.slice(0, lastBrace + 1);
      // Balance any unclosed arrays before the closing brace
      let openArrays = (partial.match(/\[/g) || []).length - (partial.match(/\]/g) || []).length;
      for (let i = 0; i < openArrays; i++) partial += "]";
      try { return JSON.parse(partial); } catch { /* fall through */ }
    }
    console.error("parseJsonResponse: failed to parse, raw length:", raw.length, "start:", raw.slice(0, 200));
    return {};
  }
}

async function analyzeResumeText(openai: OpenAI, text: string, photoBase64?: string, photoMime?: string) {
  const prompt = `You are a senior HR expert specializing in Indian engineering and technical resumes. Extract EVERY piece of information from this resume with maximum detail.

IMPORTANT RULES:
1. career_objective: Extract the full career objective / personal statement verbatim.
2. experience: Only full-time professional work experience (not internships).
3. internships: Extract ALL internships separately — include company, title, duration (e.g. "31 days"), location, description, and a responsibilities array.
4. education: Extract ALL levels — B.Tech/B.E., Diploma, B.A., HSC (12th), SSLC (10th), etc. For each, capture: institution, degree, field, year (graduation/passing year), gpa (CGPA), percentage (e.g. "82.3%"), grade ("First class", "Distinction" etc.), and level ("undergraduate", "diploma", "postgraduate", "12th", "10th", "certification_program").
5. certifications: Extract ALL certifications — include name, issuer (e.g. "NPTEL", "IGNOU"), platform (e.g. "Swayam portal", "CABI Academy"), year, and score/percentage if mentioned (e.g. "69%", "73%"). Also include professional diplomas as certifications.
6. projects: Extract ALL projects with name, year (e.g. "2025-2026"), full description, technologies/tools used, and key highlights as bullet points.
7. achievements: Extract competitions, hackathons, recognitions — include title, year, organization name, and description.
8. skills: All skills listed (software, tools, domain skills).
9. technical_skills: Technical/software tools only (SolidWorks, AutoCAD, GIS, etc.).
10. languages: All languages with proficiency level ("Speak and Write" or "Speak only").
11. Set has_photo: true only if a passport-style photograph is embedded in the resume.
12. For total_experience_years: count internship months as partial experience for freshers.
13. career_level: "fresher", "entry", "mid", "senior", or "executive".

Return ONLY valid JSON matching this exact schema:
${RESUME_JSON_SCHEMA}

Resume text:
${text.slice(0, 20000)}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (photoBase64 && photoMime) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${photoMime};base64,${photoBase64}`, detail: "low" } }
      ]
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }
  const resp = await openai.chat.completions.create({ model: "gpt-4o", messages, max_tokens: 6000 });
  return parseJsonResponse(resp.choices[0]?.message?.content || "{}");
}

async function analyzeResumePdfPages(openai: OpenAI, pages: { base64: string; mime: string }[], text: string) {
  // Build content with all page images so AI can see the full resume
  const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = pages.slice(0, 4).map(p => ({
    type: "image_url" as const,
    image_url: { url: `data:${p.mime === "image/x-portable-pixmap" ? "image/jpeg" : p.mime};base64,${p.base64}`, detail: "high" as const }
  }));

  const textHint = text ? `\n\nExtracted text (may be incomplete):\n${text.slice(0, 5000)}` : "";

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are a senior HR expert specializing in Indian engineering and technical resumes. Extract EVERY piece of information visible across ALL pages of this resume with maximum detail. Extract career_objective, internships (separate from experience), all education levels (B.Tech/B.E., Diploma, HSC/12th, SSLC/10th etc.) with CGPA/percentage, all certifications with scores/percentages, all projects with year and highlights, all achievements with year and organization, skills, technical_skills, soft_skills, languages (with proficiency). Return ONLY valid JSON with this schema:\n${RESUME_JSON_SCHEMA}${textHint}`
        },
        ...imageContent
      ]
    }],
    max_tokens: 6000,
  });
  return parseJsonResponse(resp.choices[0]?.message?.content || "{}");
}

async function analyzeResumeImage(openai: OpenAI, imageBase64: string, mimeType: string) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are a senior HR expert specializing in Indian engineering and technical resumes. Extract EVERY piece of information visible in this resume image with maximum detail. Extract career_objective, internships (separate from experience), all education levels (B.Tech, Diploma, HSC, SSLC etc.) with percentage/CGPA, all certifications with scores/percentages, all projects with year and highlights, all achievements with year and organization, skills, technical_skills, soft_skills, languages. Return ONLY valid JSON with this schema:\n${RESUME_JSON_SCHEMA}`
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } }
      ]
    }],
    max_tokens: 6000,
  });
  return parseJsonResponse(resp.choices[0]?.message?.content || "{}");
}

async function assessCandidate(openai: OpenAI, resumeData: Record<string, unknown>, linkedinContent?: string) {
  const contextParts = [`Resume Data:\n${JSON.stringify(resumeData, null, 2).slice(0, 8000)}`];
  if (linkedinContent) contextParts.push(`\nLinkedIn/Web Profile:\n${linkedinContent.slice(0, 3000)}`);

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: `You are a world-class HR assessor and talent intelligence expert. Perform a comprehensive candidate assessment based on the provided data.

Rate on a scale of 1-10 for each dimension. Hiring recommendation must be one of: "Strong Hire", "Hire", "Consider", "Pass".
Career trajectory must be one of: "Upward", "Lateral", "Mixed", "Downward", "Early Career".
Company tier must be one of: "Tier 1 (MNC/Top)", "Tier 2 (Mid-size)", "Tier 3 (Startup/SME)", "Unknown".

Be honest, detailed and specific. Return ONLY valid JSON with this schema:\n${ASSESSMENT_JSON_SCHEMA}

${contextParts.join("\n\n")}`
    }],
    max_tokens: 4000,
  });
  return parseJsonResponse(resp.choices[0]?.message?.content || "{}");
}

async function fetchLinkedInData(url: string): Promise<string> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) return "";
    const resp = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return "";
    const html = await resp.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 5000);
  } catch {
    return "";
  }
}

// Determine what data a user is allowed to see.
// scope: "all" = HR Manager / System Manager
//        "department" = Department Manager (can see their dept)
//        "self" = regular employee (can see only themselves)
router.get("/hrms/user-scope", async (req, res) => {
  try {
    const { email } = req.query as Record<string, string>;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    // Fetch all employees to find the one matching this user
    const allEmps = await fetchErpNextEmployees();
    const employee = allEmps.find(e => e.user_id?.toLowerCase() === email.toLowerCase()) ?? null;

    // Fetch the user's ERPNext roles
    const roles = await fetchErpNextUserRoles(email);
    const ADMIN_ROLES = ["System Manager", "HR Manager", "HR User", "Administrator"];
    const isAdmin = roles.some(r => ADMIN_ROLES.includes(r));

    if (isAdmin) {
      res.json({ scope: "all", employee, departments: [], roles });
      return;
    }

    if (!employee) {
      res.json({ scope: "self", employee: null, departments: [], roles });
      return;
    }

    // HOD check via ERPNext role (may return [] if API key lacks permission)
    const isHOD = roles.includes("HOD");
    if (isHOD && employee.department) {
      const permDepts = await fetchErpNextUserDepartmentPermissions(email);
      const depts = permDepts.length > 0 ? permDepts : [employee.department];
      res.json({ scope: "department", employee, departments: depts, roles });
      return;
    }

    // Check if this employee is listed as department_manager for any department
    const managedDepts = await fetchErpNextManagedDepartments(employee.name);
    if (managedDepts.length > 0) {
      res.json({ scope: "department", employee, departments: managedDepts, roles });
      return;
    }

    // Fallback: check if anyone reports_to this employee (manager/HOD via org chart)
    const subordinates = await fetchErpNextSubordinates(employee.name);
    if (subordinates.length > 0 && employee.department) {
      // Collect distinct departments of subordinates, defaulting to employee's own dept
      const subDepts = [...new Set(subordinates.map(s => s.department).filter(Boolean) as string[])];
      const depts = subDepts.length > 0 ? subDepts : [employee.department];
      res.json({ scope: "department", employee, departments: depts, roles });
      return;
    }

    // Regular employee — self only
    res.json({ scope: "self", employee, departments: employee.department ? [employee.department] : [], roles });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/employees", async (req, res) => {
  try {
    const { status, department } = req.query as Record<string, string>;
    const data = await fetchErpNextEmployees({ status, department });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/leave-applications", async (req, res) => {
  try {
    const { status, employee } = req.query as Record<string, string>;
    const data = await fetchErpNextLeaveApplications({ status, employee });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/attendance", async (req, res) => {
  try {
    const { status, department, employee } = req.query as Record<string, string>;
    const data = await fetchErpNextAttendance({ status, department, employee });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});


router.get("/hrms/image-proxy", async (req, res) => {
  try {
    const { path: imgPath } = req.query as Record<string, string>;
    if (!imgPath || !ERPNEXT_URL) {
      res.status(400).send("Missing path or ERPNext not configured");
      return;
    }
    const url = imgPath.startsWith("http") ? imgPath : `${ERPNEXT_URL}${imgPath}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
      },
    });
    if (!response.ok) {
      res.status(response.status).send("Image not found");
      return;
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buf = await response.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).send(String(e));
  }
});

router.get("/employees", async (req, res) => {
  try {
    const { q = "" } = req.query as Record<string, string>;
    const employees = await fetchErpNextEmployees({ status: "Active" });
    const filtered = employees
      .filter(e => {
        const name = (e.employee_name || "").toLowerCase();
        return !q || name.includes(q.toLowerCase());
      })
      .slice(0, 30)
      .map(e => ({
        id: e.name,
        name: e.employee_name,
        designation: e.designation || "",
        department: e.department || "",
        avatar: e.image ? `${ERPNEXT_URL}${e.image}` : null,
      }));
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Employee Checkin ──────────────────────────────────────────────────────────

router.get("/hrms/checkins", async (req, res) => {
  try {
    const { employee, from_date, to_date } = req.query as Record<string, string>;
    const data = await fetchErpNextCheckins({ employee, from_date, to_date });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/checkins", async (req, res) => {
  try {
    const { employee, time, log_type, device_id } = req.body;
    if (!employee || !time || !log_type) {
      res.status(400).json({ error: "employee, time, log_type required" });
      return;
    }
    const data = await createErpNextCheckin({ employee, time, log_type, device_id });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Leave Types ───────────────────────────────────────────────────────────────

router.get("/hrms/leave-types", async (req, res) => {
  try {
    const data = await fetchErpNextLeaveTypes();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/leave-requests", async (req, res) => {
  try {
    const { employee, leave_type, from_date, to_date, half_day, half_day_date, description } = req.body;
    if (!employee || !leave_type || !from_date || !to_date) {
      res.status(400).json({ error: "employee, leave_type, from_date, to_date required" });
      return;
    }
    const data = await createErpNextLeaveApplication({ employee, leave_type, from_date, to_date, half_day, half_day_date, description });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Expense Claims ────────────────────────────────────────────────────────────

router.get("/hrms/claims", async (req, res) => {
  try {
    const { employee, approval_status } = req.query as Record<string, string>;
    const data = await fetchErpNextExpenseClaims({ employee, approval_status });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/claim-types", async (req, res) => {
  try {
    const data = await fetchErpNextExpenseClaimTypes();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/claims", async (req, res) => {
  try {
    const { employee, posting_date, company, remark, expenses } = req.body;
    if (!employee || !posting_date || !expenses || !Array.isArray(expenses) || expenses.length === 0) {
      res.status(400).json({ error: "employee, posting_date, expenses[] required" });
      return;
    }
    const data = await createErpNextExpenseClaim({ employee, posting_date, company, remark, expenses });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Recruitment Tracker ───────────────────────────────────────────────────────

router.get("/hrms/recruitment", async (req, res) => {
  try {
    const { status, department, position } = req.query as Record<string, string>;
    const data = await fetchErpNextRecruitmentTrackers({ status, department, position });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/recruitment/:name", async (req, res) => {
  try {
    const data = await fetchErpNextRecruitmentTracker(req.params.name);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/resume-analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const buf = req.file.buffer;

    // Check cache first using SHA256 hash of the file
    const fileHash = createHash("sha256").update(buf).digest("hex");
    const cached = await db.select().from(resumeAnalysisCacheTable).where(eq(resumeAnalysisCacheTable.fileHash, fileHash)).limit(1);
    if (cached.length > 0) {
      console.log(`resume-analyze: cache hit for hash ${fileHash}`);
      res.json({ ...(cached[0].result as object), cached: true });
      return;
    }

    const openai = getOpenAI();
    const mime = req.file.mimetype;

    let resumeData: Record<string, unknown> = {};
    let photoBase64: string | null = null;
    let photoMime: string | null = null;
    let pdfBase64: string | null = null;

    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");

    if (isImage) {
      const b64 = buf.toString("base64");
      resumeData = await analyzeResumeImage(openai, b64, mime);
      photoBase64 = b64;
      photoMime = mime;
    } else if (isPdf) {
      pdfBase64 = buf.toString("base64");
      const { pages, text } = await renderPdfPages(buf);
      console.log(`resume-analyze (upload): pages=${pages.length}, text length=${text.length}`);

      // Extract portrait photo from embedded JPEGs
      const jpegs = extractJpegsFromPdf(buf);
      if (jpegs.length > 0) {
        // Use the smallest JPEG as the portrait photo (smallest = photo, largest = page render)
        const sorted = [...jpegs].sort((a, b) => a.length - b.length);
        photoBase64 = sorted[0].toString("base64");
        photoMime = "image/jpeg";
      }

      if (pages.length > 0) {
        // Use rendered pages for accurate vision-based extraction, supplemented with text
        resumeData = await analyzeResumePdfPages(openai, pages, text);
      } else if (text.length > 100) {
        resumeData = await analyzeResumeText(openai, text, photoBase64 ?? undefined, photoMime ?? undefined);
      } else {
        res.status(422).json({ error: "Could not extract content from this PDF. Please ensure it is not password-protected." });
        return;
      }
    } else {
      res.status(400).json({ error: "Unsupported file type. Please upload PDF or image." });
      return;
    }

    const assessment = await assessCandidate(openai, resumeData);

    const resultPayload = {
      resume: resumeData,
      assessment,
      photo_base64: photoBase64,
      photo_mime: photoMime,
      pdf_base64: pdfBase64,
    };

    // Store in cache
    try {
      await db.insert(resumeAnalysisCacheTable).values({ fileHash, result: resultPayload });
      console.log(`resume-analyze: cached result for hash ${fileHash}`);
    } catch (cacheErr) {
      console.warn("resume-analyze: failed to cache result:", cacheErr);
    }

    res.json(resultPayload);
  } catch (e) {
    console.error("resume-analyze error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/resume-analyze-erp", async (req, res) => {
  try {
    const { file_path } = req.body as { file_path?: string };
    if (!file_path) { res.status(400).json({ error: "file_path required" }); return; }

    // Check cache using file_path as the cache key
    const fileHash = createHash("sha256").update(file_path).digest("hex");
    const cached = await db.select().from(resumeAnalysisCacheTable).where(eq(resumeAnalysisCacheTable.fileHash, fileHash)).limit(1);
    if (cached.length > 0) {
      console.log(`resume-analyze-erp: cache hit for ${file_path}`);
      res.json({ ...(cached[0].result as object), cached: true });
      return;
    }

    const { buffer, contentType, ext } = await fetchErpFile(file_path);
    const openai = getOpenAI();

    let resumeData: Record<string, unknown> = {};
    let photoBase64: string | null = null;
    let photoMime: string | null = null;
    let pdfBase64: string | null = null;

    const isImage = contentType.startsWith("image/") || ["jpg","jpeg","png","webp"].includes(ext);
    const isPdf = contentType === "application/pdf" || ext === "pdf";

    if (isImage) {
      const mime = contentType.startsWith("image/") ? contentType : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const b64 = buffer.toString("base64");
      resumeData = await analyzeResumeImage(openai, b64, mime);
      photoBase64 = b64;
      photoMime = mime;
    } else if (isPdf) {
      pdfBase64 = buffer.toString("base64");
      const { pages, text } = await renderPdfPages(buffer);
      console.log(`resume-analyze-erp: pages=${pages.length}, text length=${text.length}`);

      // Extract portrait photo from embedded JPEGs (separate from page renders)
      const jpegs = extractJpegsFromPdf(buffer);
      if (jpegs.length > 0) {
        const sorted = [...jpegs].sort((a, b) => a.length - b.length);
        photoBase64 = sorted[0].toString("base64");
        photoMime = "image/jpeg";
      }

      if (pages.length > 0) {
        console.log(`resume-analyze-erp: using page rendering (${pages.length} pages)`);
        resumeData = await analyzeResumePdfPages(openai, pages, text);
      } else if (text.length > 100) {
        console.log(`resume-analyze-erp: falling back to text extraction (${text.length} chars)`);
        resumeData = await analyzeResumeText(openai, text, photoBase64 ?? undefined, photoMime ?? undefined);
      } else {
        res.status(422).json({ error: "Could not extract content from this PDF." }); return;
      }
    } else {
      res.status(400).json({ error: "Unsupported file type" }); return;
    }

    const assessment = await assessCandidate(openai, resumeData);

    // Auto-enrich with LinkedIn if found in resume
    const linkedinUrl = (resumeData.linkedin_url as string) || "";
    let resultPayload: Record<string, unknown>;
    if (linkedinUrl) {
      const linkedinContent = await fetchLinkedInData(linkedinUrl);
      if (linkedinContent) {
        const enrichedAssessment = await assessCandidate(openai, resumeData, linkedinContent);
        resultPayload = { resume: resumeData, assessment: enrichedAssessment, photo_base64: photoBase64, photo_mime: photoMime, pdf_base64: pdfBase64, linkedin_enriched: true };
      } else {
        resultPayload = { resume: resumeData, assessment, photo_base64: photoBase64, photo_mime: photoMime, pdf_base64: pdfBase64, linkedin_enriched: false };
      }
    } else {
      resultPayload = { resume: resumeData, assessment, photo_base64: photoBase64, photo_mime: photoMime, pdf_base64: pdfBase64, linkedin_enriched: false };
    }

    // Store in cache
    try {
      await db.insert(resumeAnalysisCacheTable).values({ fileHash, result: resultPayload });
      console.log(`resume-analyze-erp: cached result for ${file_path}`);
    } catch (cacheErr) {
      console.warn("resume-analyze-erp: failed to cache result:", cacheErr);
    }

    res.json(resultPayload);
  } catch (e) {
    console.error("resume-analyze-erp error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/candidate-enrich", async (req, res) => {
  try {
    const { linkedin_url, name, companies, resume_summary } = req.body as {
      linkedin_url?: string;
      name?: string;
      companies?: string[];
      resume_summary?: string;
    };
    const openai = getOpenAI();

    let linkedinContent = "";
    if (linkedin_url) {
      linkedinContent = await fetchLinkedInData(linkedin_url);
    }

    const assessment = await assessCandidate(openai, { name, companies, resume_summary }, linkedinContent || undefined);

    res.json({ assessment, linkedin_fetched: !!linkedinContent, linkedin_content_length: linkedinContent.length });
  } catch (e) {
    console.error("candidate-enrich error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/recruitment-insights", async (req, res) => {
  try {
    const { candidates } = req.body as {
      candidates: Array<{
        candidate_name: string;
        applying_for_the_post: string;
        department: string | null;
        status: string;
        not_suitable_reason: string | null;
        experience_status: string | null;
        telephonic_interview_commands: string | null;
        existing_salary_per_month: number;
        expected_salary: number;
        date: string;
      }>;
    };
    if (!candidates || candidates.length === 0) {
      res.status(400).json({ error: "candidates array required" });
      return;
    }
    const openai = getOpenAI();
    const summary = candidates.map(c => ({
      name: c.candidate_name,
      position: c.applying_for_the_post,
      department: c.department,
      status: c.status,
      rejection_reason: c.not_suitable_reason || null,
      interview_notes: c.telephonic_interview_commands || null,
      experience_status: c.experience_status || null,
      salary_ask: c.expected_salary,
    }));

    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `You are a senior HR analytics expert. Analyze this recruitment data and provide deep actionable insights.

Recruitment Data (${candidates.length} candidates):
${JSON.stringify(summary, null, 2).slice(0, 8000)}

Return ONLY valid JSON with this schema:
{
  "key_metrics": {
    "acceptance_rate_pct": 0,
    "rejection_rate_pct": 0,
    "avg_salary_ask": 0,
    "top_applied_position": "",
    "top_rejection_reason_category": ""
  },
  "rejection_patterns": [
    {"category": "", "count": 0, "percentage": 0, "description": "", "recommendation": ""}
  ],
  "position_insights": [
    {"position": "", "total_applied": 0, "selected": 0, "rejected": 0, "open": 0, "difficulty": "easy|medium|hard", "insight": ""}
  ],
  "department_insights": [
    {"department": "", "total": 0, "hired": 0, "pipeline": 0, "insight": ""}
  ],
  "overall_insights": [""],
  "hiring_recommendations": [""],
  "pipeline_health": "healthy|moderate|critical",
  "pipeline_health_reason": ""
}`
      }],
      max_tokens: 2500,
    });
    const raw = resp.choices[0]?.message?.content || "{}";
    res.json(parseJsonResponse(raw));
  } catch (e) {
    console.error("recruitment-insights error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ── HR Analytics ─────────────────────────────────────────────────────────────
router.get("/hrms/analytics", async (req, res) => {
  try {
    const now = new Date();
    const todayStr     = now.toISOString().split("T")[0];
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const yesterdayStr = yest.toISOString().split("T")[0];
    const year = now.getFullYear();
    const yearStart    = `${year}-01-01`;
    const monthStart   = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonth    = new Date(year, now.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonthEnd   = new Date(year, now.getMonth(), 0);
    const prevMonthEndStr = `${prevMonthEnd.getFullYear()}-${String(prevMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(prevMonthEnd.getDate()).padStart(2, "0")}`;

    // Parallel fetches
    const [
      allEmps,
      absentToday,
      absentYest,
      absentMonth,
      recruiters,
      grievYTD,
      grievMonth,
      grievPrevMonth,
      incidentStats,
    ] = await Promise.all([
      fetchErpNextEmployees(),
      fetchErpNextAttendance({ status: "Absent", from_date: todayStr, to_date: todayStr }),
      fetchErpNextAttendance({ status: "Absent", from_date: yesterdayStr, to_date: yesterdayStr }),
      fetchErpNextAttendance({ status: "Absent", from_date: monthStart, to_date: todayStr }),
      fetchErpNextRecruitmentTrackers(),
      fetchErpNextGrievances({ from_date: yearStart, to_date: todayStr }),
      fetchErpNextGrievances({ from_date: monthStart, to_date: todayStr }),
      fetchErpNextGrievances({ from_date: prevMonthStart, to_date: prevMonthEndStr }),
      chatPool.query(`
        SELECT
          COUNT(*) FILTER (WHERE true) AS total,
          COUNT(*) FILTER (WHERE created_at >= $1) AS year,
          COUNT(*) FILTER (WHERE created_at >= $2) AS month,
          COUNT(*) FILTER (WHERE created_at >= $3) AS prev_month_count,
          COUNT(*) FILTER (WHERE created_at < $2) AS prev_month_end_count
        FROM hr_incidents
      `, [yearStart, monthStart, prevMonthStart]).catch(() => null),
    ]);

    // Employee counts
    const active = allEmps.filter(e => e.status === "Active");
    const joinersYear  = allEmps.filter(e => e.date_of_joining && e.date_of_joining >= yearStart);
    const joinersMonth = allEmps.filter(e => e.date_of_joining && e.date_of_joining >= monthStart);
    const attritionYear  = allEmps.filter(e => e.status === "Left" && e.date_of_joining && e.date_of_joining >= yearStart);

    // Department headcount
    const deptMap: Record<string, number> = {};
    for (const e of active) {
      const d = e.department || "Unknown";
      deptMap[d] = (deptMap[d] || 0) + 1;
    }
    const deptHeadcount = Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count);

    // Recruitment stats
    const statusCount = (status: string) => recruiters.filter(r => r.status === status).length;
    const interviewsYear  = recruiters.filter(r => r.rt_telephonic_interview && r.rt_telephonic_interview >= yearStart).length;
    const interviewsMonth = recruiters.filter(r => r.rt_telephonic_interview && r.rt_telephonic_interview >= monthStart).length;
    const interviewsToday = recruiters.filter(r => r.rt_telephonic_interview === todayStr).length;
    const interviewsYest  = recruiters.filter(r => r.rt_telephonic_interview === yesterdayStr).length;

    const followupsYear  = recruiters.filter(r => r.rt_last_convo && r.rt_last_convo >= yearStart).length;
    const followupsMonth = recruiters.filter(r => r.rt_last_convo && r.rt_last_convo >= monthStart).length;
    const followupsToday = recruiters.filter(r => r.rt_last_convo === todayStr).length;
    const followupsYest  = recruiters.filter(r => r.rt_last_convo === yesterdayStr).length;

    // Absent list formatting
    const fmtAbsent = (list: typeof absentToday) => list.map(a => ({
      name: a.employee_name,
      employee: a.employee,
      department: a.department || "—",
      date: a.attendance_date,
    }));

    const incRow = incidentStats?.rows?.[0] ?? {};

    // Monthly trend from recruiters (12 months)
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      return {
        month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
        joiners: allEmps.filter(e => e.date_of_joining && e.date_of_joining >= mStart && e.date_of_joining <= mEnd).length,
        attrition: allEmps.filter(e => e.status === "Left" && e.date_of_joining && e.date_of_joining >= mStart && e.date_of_joining <= mEnd).length,
        interviews: recruiters.filter(r => r.rt_telephonic_interview && r.rt_telephonic_interview >= mStart && r.rt_telephonic_interview <= mEnd).length,
        followups: recruiters.filter(r => r.rt_last_convo && r.rt_last_convo >= mStart && r.rt_last_convo <= mEnd).length,
      };
    });

    res.json({
      employees: {
        total: allEmps.length,
        active: active.length,
        absentToday: absentToday.length,
        absentYesterday: absentYest.length,
        presentToday: Math.max(0, active.length - absentToday.length),
        joiners: { year: joinersYear.length, month: joinersMonth.length },
        attrition: { year: attritionYear.length, month: 0 },
        deptHeadcount,
      },
      recruitment: {
        openings: statusCount("Open"),
        shortlisted: statusCount("Shortlisted"),
        hired: statusCount("Hired"),
        processing: statusCount("Processing"),
        rejected: statusCount("Rejected"),
        notInterested: statusCount("Not Interested"),
        interviews: { year: interviewsYear, month: interviewsMonth, today: interviewsToday, yesterday: interviewsYest },
        followups: { year: followupsYear, month: followupsMonth, today: followupsToday, yesterday: followupsYest },
      },
      attendance: {
        absentToday: fmtAbsent(absentToday),
        absentYesterday: fmtAbsent(absentYest),
        absentMonth: fmtAbsent(absentMonth),
      },
      grievances: {
        year: grievYTD.length,
        month: grievMonth.length,
        prevMonth: grievPrevMonth.length,
        list: grievYTD.slice(0, 50).map(g => ({ name: g.employee_name, dept: g.department || "—", date: g.date, type: g.grievance_type || "—", status: g.status })),
      },
      incidents: {
        year: Number(incRow.year ?? 0),
        month: Number(incRow.month ?? 0),
        prevMonth: Math.max(0, Number(incRow.prev_month_count ?? 0)),
        total: Number(incRow.total ?? 0),
      },
      monthlyTrend,
    });
  } catch (e) {
    console.error("hr analytics error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/users/mention", async (req, res) => {
  try {
    const { q = "" } = req.query as Record<string, string>;
    const users = await fetchErpNextUsers();
    const filtered = users
      .filter(u => {
        const name = (u.full_name || u.email || "").toLowerCase();
        return !q || name.includes(q.toLowerCase());
      })
      .slice(0, 20)
      .map(u => ({
        id: u.email,
        name: u.full_name || u.email,
        designation: "",
        department: u.email,
        avatar: u.user_image ? `${ERPNEXT_URL}${u.user_image}` : null,
      }));
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
