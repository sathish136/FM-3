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

async function analyzeResumeText(openai: OpenAI, text: string, photoBase64?: string, photoMime?: string) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (photoBase64 && photoMime) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `You are an expert resume parser. Extract all information from this resume. Return ONLY valid JSON (no markdown, no code blocks) with these fields:\n{\n  "name": "",\n  "email": "",\n  "phone": "",\n  "location": "",\n  "current_title": "",\n  "summary": "",\n  "skills": [],\n  "languages": [],\n  "experience": [{"company":"","title":"","duration":"","description":""}],\n  "education": [{"institution":"","degree":"","year":""}],\n  "certifications": [],\n  "total_experience_years": 0\n}\n\nResume text:\n${text.slice(0, 8000)}`
        },
        {
          type: "image_url",
          image_url: { url: `data:${photoMime};base64,${photoBase64}`, detail: "low" }
        }
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: `You are an expert resume parser. Extract all information from this resume text. Return ONLY valid JSON (no markdown, no code blocks) with these fields:\n{\n  "name": "",\n  "email": "",\n  "phone": "",\n  "location": "",\n  "current_title": "",\n  "summary": "",\n  "skills": [],\n  "languages": [],\n  "experience": [{"company":"","title":"","duration":"","description":""}],\n  "education": [{"institution":"","degree":"","year":""}],\n  "certifications": [],\n  "total_experience_years": 0\n}\n\nResume text:\n${text.slice(0, 12000)}`
    });
  }
  const resp = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, max_tokens: 2000 });
  const raw = resp.choices[0]?.message?.content || "{}";
  try { return JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()); }
  catch { return {}; }
}

async function analyzeResumeImage(openai: OpenAI, imageBase64: string, mimeType: string) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are an expert resume parser with vision. Extract ALL information visible in this resume image. Return ONLY valid JSON (no markdown, no code blocks) with these fields:\n{\n  "name": "",\n  "email": "",\n  "phone": "",\n  "location": "",\n  "current_title": "",\n  "summary": "",\n  "skills": [],\n  "languages": [],\n  "experience": [{"company":"","title":"","duration":"","description":""}],\n  "education": [{"institution":"","degree":"","year":""}],\n  "certifications": [],\n  "total_experience_years": 0,\n  "has_photo": false\n}`
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" }
        }
      ]
    }],
    max_tokens: 2000,
  });
  const raw = resp.choices[0]?.message?.content || "{}";
  try { return JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()); }
  catch { return {}; }
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

    let analysis: Record<string, unknown> = {};
    let photoBase64: string | null = null;
    let photoMime: string | null = null;

    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");

    if (isImage) {
      const b64 = buf.toString("base64");
      analysis = await analyzeResumeImage(openai, b64, mime);
      photoBase64 = b64;
      photoMime = mime;
    } else if (isPdf) {
      let text = "";
      try {
        const parsed = await pdfParse(buf);
        text = parsed.text;
      } catch { text = ""; }

      const jpegs = extractJpegsFromPdf(buf);
      if (jpegs.length > 0) {
        photoBase64 = jpegs[0].toString("base64");
        photoMime = "image/jpeg";
      }

      analysis = await analyzeResumeText(openai, text, photoBase64 ?? undefined, photoMime ?? undefined);
    } else {
      res.status(400).json({ error: "Unsupported file type. Please upload PDF or image." });
      return;
    }

    res.json({ ...analysis, photo_base64: photoBase64, photo_mime: photoMime });
  } catch (e) {
    console.error("resume-analyze error:", e);
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
