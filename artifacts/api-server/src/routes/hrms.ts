import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import { createRequire } from "module";
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
} from "../lib/erpnext";

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
  try { return JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()); }
  catch { return {}; }
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
${text.slice(0, 14000)}`;

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
  const resp = await openai.chat.completions.create({ model: "gpt-4o", messages, max_tokens: 3000 });
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
          text: `You are a senior HR expert specializing in Indian engineering and technical resumes. Extract EVERY piece of information visible in this resume image. Extract career_objective, internships (separate from experience), all education levels (B.Tech, Diploma, HSC, SSLC etc.) with percentage/CGPA, all certifications with scores, all projects with year and highlights, all achievements with year and organization. Return ONLY valid JSON with this schema:\n${RESUME_JSON_SCHEMA}`
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } }
      ]
    }],
    max_tokens: 4000,
  });
  return parseJsonResponse(resp.choices[0]?.message?.content || "{}");
}

async function assessCandidate(openai: OpenAI, resumeData: Record<string, unknown>, linkedinContent?: string) {
  const contextParts = [`Resume Data:\n${JSON.stringify(resumeData, null, 2).slice(0, 6000)}`];
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
    max_tokens: 3000,
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
    const openai = getOpenAI();
    const mime = req.file.mimetype;
    const buf = req.file.buffer;

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

      let text = "";
      try { const parsed = await pdfParse(buf); text = parsed.text; } catch { text = ""; }

      const jpegs = extractJpegsFromPdf(buf);
      if (jpegs.length > 0) {
        photoBase64 = jpegs[0].toString("base64");
        photoMime = "image/jpeg";
      }

      resumeData = await analyzeResumeText(openai, text, photoBase64 ?? undefined, photoMime ?? undefined);
    } else {
      res.status(400).json({ error: "Unsupported file type. Please upload PDF or image." });
      return;
    }

    const assessment = await assessCandidate(openai, resumeData);

    res.json({
      resume: resumeData,
      assessment,
      photo_base64: photoBase64,
      photo_mime: photoMime,
      pdf_base64: pdfBase64,
    });
  } catch (e) {
    console.error("resume-analyze error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/hrms/resume-analyze-erp", async (req, res) => {
  try {
    const { file_path } = req.body as { file_path?: string };
    if (!file_path) { res.status(400).json({ error: "file_path required" }); return; }

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
      let text = "";
      try { const parsed = await pdfParse(buffer); text = parsed.text; } catch { text = ""; }
      const jpegs = extractJpegsFromPdf(buffer);
      if (jpegs.length > 0) {
        photoBase64 = jpegs[0].toString("base64");
        photoMime = "image/jpeg";
      }
      resumeData = await analyzeResumeText(openai, text, photoBase64 ?? undefined, photoMime ?? undefined);
    } else {
      res.status(400).json({ error: "Unsupported file type" }); return;
    }

    const assessment = await assessCandidate(openai, resumeData);

    // Auto-enrich with LinkedIn if found in resume
    let linkedinEnriched = false;
    const linkedinUrl = (resumeData.linkedin_url as string) || "";
    if (linkedinUrl) {
      const linkedinContent = await fetchLinkedInData(linkedinUrl);
      if (linkedinContent) {
        const enrichedAssessment = await assessCandidate(openai, resumeData, linkedinContent);
        res.json({ resume: resumeData, assessment: enrichedAssessment, photo_base64: photoBase64, photo_mime: photoMime, pdf_base64: pdfBase64, linkedin_enriched: true });
        return;
      }
    }

    res.json({ resume: resumeData, assessment, photo_base64: photoBase64, photo_mime: photoMime, pdf_base64: pdfBase64, linkedin_enriched: linkedinEnriched });
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
