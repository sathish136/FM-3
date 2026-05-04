import { Router } from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}
import { mkdir, readFile, unlink, stat, rename } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, extname } from "node:path";
import { db, pool } from "@workspace/db";
import {
  projectsTable,
  tasksTable,
  taskCommentsTable,
  fmTasksTable,
  fmTaskCommentsTable,
  campaignsTable,
  leadsTable,
  teamMembersTable,
  userPermissionsTable,
  roleTemplatesTable,
  projectDrawingsTable,
  systemActivityTable,
  inAppNotificationsTable,
  design3dRecordsTable,
} from "@workspace/db/schema";
import { eq, sql, desc, gt } from "drizzle-orm";
import { sendNotification } from "./notifications";

// Ensure all PM tables exist on startup
pool
  .query(
    `
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    status TEXT NOT NULL DEFAULT 'planning', priority TEXT DEFAULT 'medium',
    progress INTEGER NOT NULL DEFAULT 0, due_date TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium',
    assignee TEXT, due_date TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    status TEXT NOT NULL DEFAULT 'draft', type TEXT NOT NULL,
    budget NUMERIC(12,2) NOT NULL DEFAULT 0, spent NUMERIC(12,2) DEFAULT 0,
    leads INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
    start_date TEXT, end_date TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    phone TEXT, company TEXT, status TEXT NOT NULL DEFAULT 'new',
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    role TEXT NOT NULL, department TEXT, avatar TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS user_permissions (
    email TEXT PRIMARY KEY, full_name TEXT, has_access BOOLEAN NOT NULL DEFAULT true,
    modules TEXT NOT NULL DEFAULT '[]', module_roles TEXT NOT NULL DEFAULT '{}',
    allowed_projects TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS module_roles TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system';
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS navbar_style TEXT NOT NULL DEFAULT 'full';
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS hod_dept TEXT;
  CREATE TABLE IF NOT EXISTS drawing_approval_recipients (
    id SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    company_email TEXT NOT NULL DEFAULT '',
    official_mobile TEXT NOT NULL DEFAULT '',
    notify_email BOOLEAN NOT NULL DEFAULT true,
    notify_whatsapp BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS project_drawings (
    id TEXT PRIMARY KEY,
    drawing_no TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    project TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    drawing_type TEXT NOT NULL DEFAULT '',
    system_name TEXT NOT NULL DEFAULT '',
    uploaded_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    revision_no INTEGER NOT NULL DEFAULT 0,
    revision_label TEXT NOT NULL DEFAULT '',
    file_data TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    uploaded_by TEXT NOT NULL DEFAULT '',
    history JSONB NOT NULL DEFAULT '[]',
    view_log JSONB NOT NULL DEFAULT '[]',
    checked_by JSONB,
    approved_by JSONB,
    erp_file_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE project_drawings ADD COLUMN IF NOT EXISTS drawing_type TEXT NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TEXT;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2);
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS erp_task_id TEXT;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS erp_status TEXT;
  CREATE TABLE IF NOT EXISTS system_activity (
    id SERIAL PRIMARY KEY,
    device_username TEXT NOT NULL UNIQUE DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    designation TEXT NOT NULL DEFAULT '',
    erp_employee_id TEXT NOT NULL DEFAULT '',
    erp_image TEXT NOT NULL DEFAULT '',
    active_app TEXT NOT NULL DEFAULT '',
    window_title TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    device_name TEXT NOT NULL DEFAULT '',
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS device_username TEXT NOT NULL DEFAULT '';
  ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS designation TEXT NOT NULL DEFAULT '';
  ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS erp_employee_id TEXT NOT NULL DEFAULT '';
  ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS erp_image TEXT NOT NULL DEFAULT '';
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'system_activity_device_username_unique'
    ) THEN
      ALTER TABLE system_activity ADD CONSTRAINT system_activity_device_username_unique UNIQUE (device_username);
    END IF;
  END $$;
  CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    device_username TEXT NOT NULL,
    active_app TEXT NOT NULL DEFAULT '',
    window_title TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    logged_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS activity_log_device_idx ON activity_log (device_username, logged_at DESC);

  CREATE TABLE IF NOT EXISTS design_3d_records (
    name TEXT PRIMARY KEY,
    project TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    system_name TEXT NOT NULL DEFAULT '',
    attach TEXT,
    modified TEXT NOT NULL DEFAULT '',
    synced_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS revision TEXT NOT NULL DEFAULT '';
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'erpnext';
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS original_filename TEXT;
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS file_path TEXT;
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS file_size TEXT;
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS file_mime TEXT;
  ALTER TABLE design_3d_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
  CREATE INDEX IF NOT EXISTS design_3d_records_source_modified_idx ON design_3d_records (source, modified DESC);

  -- Project Meeting Discussion: per-project, per-stage, per-department milestone tracking.
  -- A milestone represents one trackable step (planned vs actual date, status, owner, notes).
  -- Stages are fixed: kickoff, design, purchase, workshop, shipment, commissioning.
  -- Department is free-form (Process, Mechanical, Electrical, PLC, etc.).
  CREATE TABLE IF NOT EXISTS pm_meeting_milestones (
    id SERIAL PRIMARY KEY,
    project TEXT NOT NULL,
    stage TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    planned_date DATE,
    actual_date DATE,
    owner TEXT NOT NULL DEFAULT '',
    challenges TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE pm_meeting_milestones ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT '';
  ALTER TABLE pm_meeting_milestones ADD COLUMN IF NOT EXISTS responsible_person TEXT NOT NULL DEFAULT '';
  -- "blocked" status was retired — migrate any existing rows to "pending" so
  -- the UI doesn't render an unknown status.
  UPDATE pm_meeting_milestones SET status = 'pending' WHERE status = 'blocked';
  CREATE INDEX IF NOT EXISTS pm_meeting_milestones_project_idx
    ON pm_meeting_milestones (project, stage, sort_order);

  -- Free-form discussion notes per project (meeting summaries / general challenges).
  CREATE TABLE IF NOT EXISTS pm_meeting_notes (
    id SERIAL PRIMARY KEY,
    project TEXT NOT NULL,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pm_meeting_notes_project_idx
    ON pm_meeting_notes (project, meeting_date DESC);
`,
  )
  .then(() => console.log("PM tables ready"))
  .catch((e: any) => console.error("PM tables migration error:", e.message));
import {
  isErpNextConfigured,
  fetchErpNextProjects,
  fetchErpNextDrawings,
  fetchErpNextDesign3D,
  fetchErpNextDesign2D,
  fetchErpNextPresentations,
  fetchErpNextPID,
  fetchErpNextMaterialRequests,
  fetchErpNextMaterialRequest,
  createErpNextMaterialRequest,
  fetchErpNextMaterialRequestItems,
  fetchErpNextWarehouses,
  fetchErpNextCompanies,
  fetchErpNextUsers,
  fetchErpNextUser,
  fetchErpNextEmployees,
  createErpNextTaskAllocation,
  fetchErpNextPurchaseOrders,
  fetchErpNextPurchaseOrder,
  fetchErpNextSuppliers,
  fetchErpNextTasks,
  fetchErpNextCheckins,
} from "../lib/erpnext";

const router = Router();

// ─── Notification helpers ────────────────────────────────────────────────────

const ULTRAMSG_INSTANCE = "instance149987";
const ULTRAMSG_TOKEN = "6baxh4iuxajibxez";
const ULTRAMSG_BASE = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}`;
const GMAIL_USER = process.env.GMAIL_USER || "noreply@wttint.com";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || "ejjjsfufipqmvpuh";
const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
const ERP_AUTH = () => `token ${process.env.ERPNEXT_API_KEY || ""}:${process.env.ERPNEXT_API_SECRET || ""}`;

async function sendWhatsAppMsg(to: string, body: string) {
  const params = new URLSearchParams({ token: ULTRAMSG_TOKEN, to, body, priority: "10" });
  await fetch(`${ULTRAMSG_BASE}/messages/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

async function sendEmailMsg(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 587, secure: false,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  await transporter.sendMail({ from: `"WTT International" <${GMAIL_USER}>`, to, subject, html });
}

async function getApprovalRecipients() {
  const rows = await pool.query("SELECT * FROM drawing_approval_recipients ORDER BY created_at");
  return rows.rows;
}

async function searchErpEmployees(query: string): Promise<any[]> {
  const fields = '["name","employee_name","company_email","cell_number","prefered_contact_email","personal_email","user_id"]';
  const hdr = { Authorization: ERP_AUTH(), Accept: "application/json" };

  // Strategy 1: direct lookup by exact employee ID (e.g. WTT948)
  const r1 = await fetch(
    `${ERP_URL}/api/resource/Employee/${encodeURIComponent(query.toUpperCase())}?fields=${encodeURIComponent(fields)}`,
    { headers: hdr }
  );
  if (r1.ok) {
    const d: any = await r1.json();
    const emp = d.data || d;
    if (emp?.name) return [emp];
  }

  // Strategy 2: also try as-is (mixed case)
  if (query !== query.toUpperCase()) {
    const r1b = await fetch(
      `${ERP_URL}/api/resource/Employee/${encodeURIComponent(query)}?fields=${encodeURIComponent(fields)}`,
      { headers: hdr }
    );
    if (r1b.ok) {
      const d: any = await r1b.json();
      const emp = d.data || d;
      if (emp?.name) return [emp];
    }
  }

  // Strategy 3: search by employee_name LIKE %query% — returns ALL matches
  const nameFilter = encodeURIComponent(`[["employee_name","like","%${query}%"]]`);
  const r2 = await fetch(
    `${ERP_URL}/api/resource/Employee?filters=${nameFilter}&fields=${encodeURIComponent(fields)}&limit=20`,
    { headers: hdr }
  );
  if (r2.ok) {
    const d: any = await r2.json();
    const list: any[] = d.data || [];
    if (list.length > 0) return list;
  }

  // Strategy 4: search by user_id LIKE %query%
  const emailFilter = encodeURIComponent(`[["user_id","like","%${query}%"]]`);
  const r3 = await fetch(
    `${ERP_URL}/api/resource/Employee?filters=${emailFilter}&fields=${encodeURIComponent(fields)}&limit=20`,
    { headers: hdr }
  );
  if (r3.ok) {
    const d: any = await r3.json();
    const list: any[] = d.data || [];
    if (list.length > 0) return list;
  }

  return [];
}

async function triggerDrawingApprovalNotifications(drawing: any) {
  const recipients = await getApprovalRecipients();
  if (!recipients.length) return;

  const drawingNo = drawing.drawing_no || drawing.drawingNo || "";
  const title = drawing.title || "";
  const project = drawing.project || "";
  const approvedBy = drawing.approved_by?.name || drawing.approvedBy?.name || "Admin";
  const approvedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const subject = `Drawing Approved: ${drawingNo}${title ? " — " + title : ""}`;
  const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <div style="background:#1e3a5f;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Drawing Approved ✓</h2>
        <p style="margin:4px 0 0;opacity:.8;font-size:13px;">WTT International — FlowMatriX</p>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:130px;">Drawing No.</td><td style="padding:8px 0;font-weight:700;color:#111827;">${drawingNo}</td></tr>
          ${title ? `<tr><td style="padding:8px 0;color:#6b7280;">Title</td><td style="padding:8px 0;color:#111827;">${title}</td></tr>` : ""}
          ${project ? `<tr><td style="padding:8px 0;color:#6b7280;">Project</td><td style="padding:8px 0;color:#111827;">${project}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">Approved By</td><td style="padding:8px 0;color:#111827;">${approvedBy}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Date & Time</td><td style="padding:8px 0;color:#111827;">${approvedAt} IST</td></tr>
        </table>
        <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;">
          <p style="margin:0;font-size:13px;color:#166534;">This drawing has received Final Approval and is now a <strong>Final Copy</strong>.</p>
        </div>
      </div>
    </div>`;

  const waMsg = `✅ *Drawing Approved — WTT International*\n\n📋 *Drawing No.:* ${drawingNo}${title ? "\n📌 *Title:* " + title : ""}${project ? "\n🏗️ *Project:* " + project : ""}\n👤 *Approved By:* ${approvedBy}\n🕒 *Time:* ${approvedAt} IST\n\nThis drawing is now a *Final Copy*.`;

  for (const r of recipients) {
    if (r.notify_email && r.company_email) {
      sendEmailMsg(r.company_email, subject, emailHtml).catch((e: any) =>
        console.error(`Drawing approval email failed for ${r.company_email}:`, e.message));
    }
    if (r.notify_whatsapp && r.official_mobile) {
      const phone = r.official_mobile.replace(/\D/g, "");
      const intl = phone.startsWith("91") ? phone : `91${phone}`;
      sendWhatsAppMsg(`+${intl}`, waMsg).catch((e: any) =>
        console.error(`Drawing approval WhatsApp failed for ${r.official_mobile}:`, e.message));
    }
  }
}

// ─── Drawing Approval Recipients ─────────────────────────────────────────────

router.get("/drawing-approval-recipients", async (_req, res) => {
  try {
    const rows = await pool.query("SELECT * FROM drawing_approval_recipients ORDER BY created_at");
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/drawing-approval-recipients", async (req, res) => {
  const { employeeId, name, companyEmail, officialMobile, notifyEmail, notifyWhatsapp } = req.body;
  if (!employeeId) return res.status(400).json({ error: "employeeId is required" });
  try {
    const result = await pool.query(
      `INSERT INTO drawing_approval_recipients (employee_id, name, company_email, official_mobile, notify_email, notify_whatsapp)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (employee_id) DO UPDATE SET name=$2, company_email=$3, official_mobile=$4, notify_email=$5, notify_whatsapp=$6
       RETURNING *`,
      [employeeId, name || "", companyEmail || "", officialMobile || "",
        notifyEmail !== false, notifyWhatsapp !== false]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put("/drawing-approval-recipients/:id", async (req, res) => {
  const { notifyEmail, notifyWhatsapp, companyEmail, officialMobile } = req.body;
  try {
    const result = await pool.query(
      `UPDATE drawing_approval_recipients SET notify_email=$1, notify_whatsapp=$2, company_email=COALESCE($3, company_email), official_mobile=COALESCE($4, official_mobile) WHERE id=$5 RETURNING *`,
      [notifyEmail !== false, notifyWhatsapp !== false, companyEmail || null, officialMobile || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/drawing-approval-recipients/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM drawing_approval_recipients WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/erpnext-employee/:id — fetch employee details from ERPNext (supports multiple results)
router.get("/erpnext-employee/:id", async (req, res) => {
  try {
    const results = await searchErpEmployees(req.params.id);
    if (!results.length) return res.status(404).json({ error: "Employee not found. Try the employee ID (e.g. WTT948) or their full name." });
    const mapped = results.map((emp: any) => ({
      employeeId: emp.name,
      name: emp.employee_name || "",
      companyEmail: emp.company_email || emp.prefered_contact_email || "",
      officialMobile: emp.cell_number || "",
    }));
    // Return single object if only one result, array if multiple
    if (mapped.length === 1) return res.json(mapped[0]);
    res.json({ multiple: true, results: mapped });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// ─── Projects ───────────────────────────────────────────────────────────────

router.get("/projects", async (req, res) => {
  try {
    const { email } = req.query as { email?: string };
    let allowedProjects: string[] = [];
    if (email) {
      const [perm] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, email));
      if (perm) { try { allowedProjects = JSON.parse(perm.allowedProjects || "[]"); } catch {} }
    }
    if (isErpNextConfigured()) {
      let projects = await fetchErpNextProjects();
      if (allowedProjects.length > 0) {
        // Match by display name OR erpnextName (ERP doc code) to handle both save formats
        projects = projects.filter(p =>
          allowedProjects.includes(p.name) || allowedProjects.includes(p.erpnextName)
        );
      }
      return res.json(projects);
    }
    const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    let all = rows.map((r) => ({ ...r, erpnextName: r.name, createdAt: r.createdAt.toISOString() }));
    if (allowedProjects.length > 0) all = all.filter(p => allowedProjects.includes(p.name));
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const [row] = await db.insert(projectsTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(projectsTable)
      .set(req.body)
      .where(eq(projectsTable.id, Number(req.params.id)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

router.get("/tasks", async (req, res) => {
  try {
    const { projectId } = req.query;
    let q = db.select().from(tasksTable);
    if (projectId) {
      const rows = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.projectId, Number(projectId)))
        .orderBy(tasksTable.createdAt);
      return res.json(
        rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      );
    }
    const rows = await q.orderBy(tasksTable.createdAt);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const [row] = await db.insert(tasksTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(tasksTable)
      .set(req.body)
      .where(eq(tasksTable.id, Number(req.params.id)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Task Comments ────────────────────────────────────────────────────────────

router.get("/task-comments", async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    const rows = await db
      .select()
      .from(taskCommentsTable)
      .where(eq(taskCommentsTable.taskId, Number(taskId)))
      .orderBy(taskCommentsTable.createdAt);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/task-comments", async (req, res) => {
  try {
    const { taskId, author, message } = req.body;
    if (!taskId || !author || !message) return res.status(400).json({ error: "taskId, author and message are required" });
    const [row] = await db.insert(taskCommentsTable).values({ taskId: Number(taskId), author, message }).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/task-comments/:id", async (req, res) => {
  try {
    await db.delete(taskCommentsTable).where(eq(taskCommentsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── FlowMatriX Users ─────────────────────────────────────────────────────────

router.get("/flowmatrix-users", async (_req, res) => {
  try {
    const rows = await db
      .select({
        email: userPermissionsTable.email,
        fullName: userPermissionsTable.fullName,
        hasAccess: userPermissionsTable.hasAccess,
      })
      .from(userPermissionsTable)
      .where(eq(userPermissionsTable.hasAccess, true));
    res.json(rows.map(r => ({ email: r.email, full_name: r.fullName || r.email })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── ERPNext Task Sync ────────────────────────────────────────────────────────

const ERP_STATUS_MAP: Record<string, string> = {
  "Open": "todo",
  "Working": "in_progress",
  "Pending Review": "review",
  "Completed": "done",
  "Cancelled": "done",
  "Overdue": "in_progress",
  "Template": "todo",
};

const ERP_PRIORITY_MAP: Record<string, string> = {
  "High": "high",
  "Medium": "medium",
  "Low": "low",
};

router.get("/erp-tasks", async (req, res) => {
  try {
    const { project } = req.query as { project?: string };
    const tasks = await fetchErpNextTasks(project);
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/erp-tasks/sync", async (req, res) => {
  try {
    const { project, projectId } = req.body as { project?: string; projectId?: number };
    const erpTasks = await fetchErpNextTasks(project);
    const imported: any[] = [];
    const updated: any[] = [];
    for (const et of erpTasks) {
      const mappedStatus = ERP_STATUS_MAP[et.status] || "todo";
      const mappedPriority = ERP_PRIORITY_MAP[et.priority] || "medium";
      const existing = await db.select().from(tasksTable).where(eq(tasksTable.erpTaskId as any, et.name));
      if (existing.length > 0) {
        const [row] = await db
          .update(tasksTable)
          .set({
            title: et.subject,
            status: mappedStatus,
            erpStatus: et.status,
            priority: mappedPriority,
            dueDate: et.exp_end_date,
            startDate: et.exp_start_date,
            description: et.description,
            assignee: et.assigned_to,
          } as any)
          .where(eq(tasksTable.erpTaskId as any, et.name))
          .returning();
        updated.push(row);
      } else {
        const [row] = await db
          .insert(tasksTable)
          .values({
            title: et.subject,
            description: et.description,
            projectId: projectId || null,
            status: mappedStatus,
            priority: mappedPriority,
            assignee: et.assigned_to,
            dueDate: et.exp_end_date,
            startDate: et.exp_start_date,
            erpTaskId: et.name,
            erpStatus: et.status,
          } as any)
          .returning();
        imported.push(row);
      }
    }
    res.json({
      imported: imported.length,
      updated: updated.length,
      total: erpTasks.length,
      tasks: [...imported, ...updated].map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

router.get("/campaigns", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(campaignsTable)
      .orderBy(campaignsTable.createdAt);
    res.json(
      rows.map((r) => ({
        ...r,
        budget: Number(r.budget),
        spent: r.spent ? Number(r.spent) : 0,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const [row] = await db.insert(campaignsTable).values(req.body).returning();
    res
      .status(201)
      .json({
        ...row,
        budget: Number(row.budget),
        spent: row.spent ? Number(row.spent) : 0,
        createdAt: row.createdAt.toISOString(),
      });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/campaigns/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(campaignsTable)
      .set(req.body)
      .where(eq(campaignsTable.id, Number(req.params.id)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      ...row,
      budget: Number(row.budget),
      spent: row.spent ? Number(row.spent) : 0,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    await db
      .delete(campaignsTable)
      .where(eq(campaignsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Leads ───────────────────────────────────────────────────────────────────

router.get("/leads", async (req, res) => {
  try {
    const { campaignId } = req.query;
    if (campaignId) {
      const rows = await db
        .select()
        .from(leadsTable)
        .where(eq(leadsTable.campaignId, Number(campaignId)))
        .orderBy(leadsTable.createdAt);
      return res.json(
        rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      );
    }
    const rows = await db
      .select()
      .from(leadsTable)
      .orderBy(leadsTable.createdAt);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const [row] = await db.insert(leadsTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(leadsTable)
      .set(req.body)
      .where(eq(leadsTable.id, Number(req.params.id)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    await db.delete(leadsTable).where(eq(leadsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Team Members ─────────────────────────────────────────────────────────────

router.get("/team", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(teamMembersTable)
      .orderBy(teamMembersTable.createdAt);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/team", async (req, res) => {
  try {
    const [row] = await db
      .insert(teamMembersTable)
      .values(req.body)
      .returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── ERPNext Status ───────────────────────────────────────────────────────────

router.get("/erpnext/status", (_req, res) => {
  res.json({
    configured: isErpNextConfigured(),
    url: process.env.ERPNEXT_URL || null,
  });
});

// ─── Analytics Summary ────────────────────────────────────────────────────────

router.get("/analytics/summary", async (_req, res) => {
  const safeQuery = async <T>(
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const [leadStats] = await safeQuery(
    () =>
      db
        .select({
          totalLeads: sql<number>`count(*)::int`,
          totalConversions: sql<number>`sum(case when status = 'converted' then 1 else 0 end)::int`,
        })
        .from(leadsTable),
    [{ totalLeads: 0, totalConversions: 0 }],
  );

  const [campaignStats] = await safeQuery(
    () =>
      db
        .select({
          totalBudget: sql<number>`coalesce(sum(budget::numeric), 0)::float`,
          totalSpent: sql<number>`coalesce(sum(spent::numeric), 0)::float`,
          activeCampaigns: sql<number>`sum(case when status = 'active' then 1 else 0 end)::int`,
        })
        .from(campaignsTable),
    [{ totalBudget: 0, totalSpent: 0, activeCampaigns: 0 }],
  );

  const [projectStats] = await safeQuery(
    () =>
      db
        .select({
          activeProjects: sql<number>`sum(case when status = 'active' then 1 else 0 end)::int`,
        })
        .from(projectsTable),
    [{ activeProjects: 0 }],
  );

  const [taskStats] = await safeQuery(
    () =>
      db
        .select({
          completedTasks: sql<number>`sum(case when status = 'done' then 1 else 0 end)::int`,
          pendingTasks: sql<number>`sum(case when status != 'done' then 1 else 0 end)::int`,
        })
        .from(tasksTable),
    [{ completedTasks: 0, pendingTasks: 0 }],
  );

  const totalLeads = leadStats?.totalLeads || 0;
  const totalConversions = leadStats?.totalConversions || 0;

  res.json({
    totalLeads,
    totalConversions,
    totalBudget: campaignStats?.totalBudget || 0,
    totalSpent: campaignStats?.totalSpent || 0,
    activeCampaigns: campaignStats?.activeCampaigns || 0,
    activeProjects: projectStats?.activeProjects || 0,
    completedTasks: taskStats?.completedTasks || 0,
    pendingTasks: taskStats?.pendingTasks || 0,
    conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
    monthlyLeads: [],
  });
});

// ─── Drawings ────────────────────────────────────────────────────────────────

router.get("/drawings", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const drawings = await fetchErpNextDrawings(department);
    res.json(drawings);
  } catch (e) {
    console.error("Drawings fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Marketing Presentations ─────────────────────────────────────────────────

router.get("/presentations", async (req, res) => {
  try {
    const records = await fetchErpNextPresentations();
    res.json(records);
  } catch (e) {
    console.error("Presentations fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── P&ID ─────────────────────────────────────────────────────────────────────

router.get("/pid", async (_req, res) => {
  try {
    const records = await fetchErpNextPID();
    res.json(records);
  } catch (e) {
    console.error("P&ID fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Design 2D ───────────────────────────────────────────────────────────────

router.get("/design-2d", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const records = await fetchErpNextDesign2D(department);
    res.json(records);
  } catch (e) {
    console.error("Design 2D fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Design 3D ───────────────────────────────────────────────────────────────

// In-memory cache for ERPNext design-3d list (avoids hitting ERPNext on every page open).
// Local PG records are NOT cached — they're cheap to query and need to show up immediately.
const design3dCache = new Map<string, { data: any[]; expiresAt: number }>();
const DESIGN3D_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Local file storage for privately-uploaded 3D models.
const LOCAL_3D_DIR = join(process.cwd(), ".local-3d-uploads");
mkdir(LOCAL_3D_DIR, { recursive: true }).catch(() => {});

// Resolve the on-disk file for a given local Design-3D record name.
// Exported as a helper so the step-file / step-mesh routes (in auth.ts) can use it
// to serve "local-3d://<name>" URLs without going through ERPNext.
export async function getLocalDesign3dFile(
  name: string,
): Promise<{ filePath: string; mime: string; originalName: string } | null> {
  try {
    const r = await pool.query(
      `SELECT file_path, file_mime, original_filename
         FROM design_3d_records
        WHERE name = $1 AND source = 'local'`,
      [name],
    );
    const row = r.rows?.[0];
    if (!row || !row.file_path) return null;
    // Confirm the file actually exists on disk
    await stat(row.file_path);
    return {
      filePath: row.file_path,
      mime: row.file_mime || "application/octet-stream",
      originalName: row.original_filename || `${name}.step`,
    };
  } catch {
    return null;
  }
}

// Generate a sequential local record name in the form LOC-YYYY-MM-NNNN.
// NNNN is the per-month counter (zero-padded to 4 digits).
async function nextLocalDesignName(): Promise<string> {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const prefix = `LOC-${y}-${m}-`;
  const r = await pool.query(
    `SELECT name FROM design_3d_records
      WHERE source = 'local' AND name LIKE $1
      ORDER BY name DESC LIMIT 1`,
    [`${prefix}%`],
  );
  let next = 1;
  if (r.rows?.[0]?.name) {
    const tail = String(r.rows[0].name).slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

// Map a Postgres design_3d_records row to the wire shape the frontend expects.
function pgRowToRecord(row: any): any {
  return {
    name: row.name,
    project: row.project || "",
    project_name: row.project_name || row.project || "",
    department: row.department || "",
    revision: row.revision || "",
    tag: row.tag || "",
    system_name: row.system_name || "",
    attach: row.attach || null,
    modified: row.modified || (row.created_at ? new Date(row.created_at).toISOString() : ""),
    source: row.source || "local",
  };
}

router.get("/design-3d", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const cacheKey = department || "__all__";
    const now = Date.now();

    // Always read local PG records fresh
    const localRowsRes = department
      ? await pool.query(
          `SELECT * FROM design_3d_records
            WHERE source = 'local' AND department ILIKE $1
            ORDER BY modified DESC`,
          [`%${department}%`],
        )
      : await pool.query(
          `SELECT * FROM design_3d_records
            WHERE source = 'local'
            ORDER BY modified DESC`,
        );
    const localRecords = (localRowsRes.rows || []).map(pgRowToRecord);

    // Try ERPNext (with cache); if it fails, return only local records so uploads still show
    let erpRecords: any[] = [];
    let erpStatus: "hit" | "miss" | "error" | "skipped" = "skipped";
    try {
      const cached = design3dCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        erpRecords = cached.data;
        erpStatus = "hit";
      } else {
        erpRecords = await fetchErpNextDesign3D(department);
        design3dCache.set(cacheKey, { data: erpRecords, expiresAt: now + DESIGN3D_TTL_MS });
        erpStatus = "miss";
      }
    } catch (erpErr: any) {
      console.warn("Design 3D ERPNext fetch failed (returning local only):", erpErr?.message || erpErr);
      erpStatus = "error";
    }

    const tagged = erpRecords.map((r: any) => ({ ...r, source: r.source || "erpnext" }));

    // Local first (newest uploads on top), then ERPNext
    const merged = [...localRecords, ...tagged];

    res.setHeader("X-Erpnext-Status", erpStatus);
    res.setHeader("X-Local-Count", String(localRecords.length));
    res.json(merged);
  } catch (e) {
    console.error("Design 3D fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// Create a new Design 3D record locally (private to this app — never pushed to ERPNext).
// Accepts a multipart upload with the STEP/IGES file plus metadata. The file is streamed
// directly to disk (NOT buffered in memory) and a row is inserted into design_3d_records
// with source='local'. Streaming to disk is critical for large files: memoryStorage would
// hold the entire file in RAM and stall the event loop, which causes the browser to appear
// frozen while waiting for the upload response.
const design3dUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOCAL_3D_DIR),
    filename: (_req, file, cb) => {
      // Use a temp name; the route handler renames to the final LOC-YYYY-MM-NNNN slot
      // once it has reserved the next sequence number from the DB.
      const ext = (extname(file.originalname).toLowerCase() || ".step").replace(/[^.a-z0-9]/gi, "");
      const tmp = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      cb(null, tmp);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

router.post("/design-3d", design3dUpload.single("file"), async (req, res) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    if (!file) return res.status(400).json({ error: "file is required" });

    const project = String(req.body?.project || "").trim();
    const projectName = String(req.body?.project_name || project || "").trim();
    const department = String(req.body?.department || "").trim();
    const tag = String(req.body?.tag || "").trim();
    const systemName = String(req.body?.system_name || "").trim();
    const revision = String(req.body?.revision || "").trim();

    const name = await nextLocalDesignName();
    // Preserve the original extension so server-side OCCT can detect the format
    const ext = (extname(file.originalname).toLowerCase() || ".step").replace(/[^.a-z0-9]/gi, "");
    const finalPath = join(LOCAL_3D_DIR, `${name}${ext}`);

    // Rename the streamed temp file to the final LOC-YYYY-MM-NNNN.<ext> name.
    // No memory buffer copy — just a metadata operation on disk.
    await rename(file.path, finalPath);

    const modified = new Date().toISOString();
    // attach uses the local-3d:// scheme so the viewer's step-file / step-mesh routes
    // know to serve from disk rather than ERPNext.
    const attach = `local-3d://${name}`;

    try {
      await pool.query(
        `INSERT INTO design_3d_records
          (name, project, project_name, department, tag, system_name, revision,
           attach, modified, source, original_filename, file_path, file_size, file_mime)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'local',$10,$11,$12,$13)`,
        [
          name, project, projectName, department, tag, systemName, revision,
          attach, modified, file.originalname, finalPath,
          String(file.size), file.mimetype || "application/octet-stream",
        ],
      );
    } catch (dbErr) {
      // Roll back the file on DB failure so we don't leave an orphan
      await unlink(finalPath).catch(() => {});
      throw dbErr;
    }

    res.status(201).json({
      name,
      project,
      project_name: projectName,
      department,
      tag,
      system_name: systemName,
      revision,
      attach,
      modified,
      source: "local",
    });
  } catch (e: any) {
    // If the upload was streamed to a temp file but something else failed afterwards,
    // clean up the orphaned temp file on disk.
    if (file?.path) await unlink(file.path).catch(() => {});
    console.error("Design 3D create error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Stream a locally-uploaded Design 3D file (used as a fallback download URL).
router.get("/design-3d/file/:name", async (req, res) => {
  try {
    const info = await getLocalDesign3dFile(req.params.name);
    if (!info) return res.status(404).json({ error: "Not found" });
    const fileStat = await stat(info.filePath);
    res.setHeader("Content-Type", info.mime);
    res.setHeader("Content-Length", String(fileStat.size));
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", `inline; filename="${info.originalName.replace(/"/g, "")}"`);
    createReadStream(info.filePath).pipe(res);
  } catch (e: any) {
    console.error("Design 3D file serve error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Delete a locally-uploaded Design 3D record (also removes the on-disk file).
// Only local records can be deleted here — ERPNext records must be managed in ERPNext.
router.delete("/design-3d/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const r = await pool.query(
      `SELECT file_path FROM design_3d_records WHERE name = $1 AND source = 'local'`,
      [name],
    );
    if (!r.rows?.[0]) return res.status(404).json({ error: "Not found or not a local record" });
    const filePath = r.rows[0].file_path;
    await pool.query(`DELETE FROM design_3d_records WHERE name = $1 AND source = 'local'`, [name]);
    if (filePath) await unlink(filePath).catch(() => {});
    res.json({ ok: true });
  } catch (e: any) {
    console.error("Design 3D delete error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ─── Project Meeting Discussion ───────────────────────────────────────────────
// One-page-per-project tracker covering kickoff → design → purchase → workshop
// → shipment → commissioning. Each milestone stores a planned date, an actual
// date (set when the work is finished), a status, an owner, and free-form
// challenges/notes. The frontend highlights any milestone whose actual_date is
// past planned_date (or whose planned_date has passed without an actual_date).

const ALLOWED_STAGES = new Set([
  "kickoff", "design", "purchase", "workshop", "shipment", "commissioning",
]);
const ALLOWED_STATUSES = new Set([
  "pending", "in_progress", "completed", "delayed",
]);

// Default seed milestones used when a project has no entries yet. Returned by
// GET /meeting-discussions?project=X&seed=1 the first time a project is opened.
const SEED_MILESTONES: Array<{
  stage: string; department: string; title: string; sort_order: number;
}> = [
  // Kickoff
  { stage: "kickoff", department: "Project",     title: "Project Kick-off Meeting", sort_order: 10 },
  { stage: "kickoff", department: "Project",     title: "Scope & Schedule Freeze",  sort_order: 20 },
  { stage: "kickoff", department: "Project",     title: "Customer PO Received",     sort_order: 30 },
  // Design
  { stage: "design",  department: "Process",     title: "Process Calculations",     sort_order: 10 },
  { stage: "design",  department: "Process",     title: "PFD / P&ID Released",      sort_order: 20 },
  { stage: "design",  department: "Mechanical",  title: "Equipment Sizing",         sort_order: 30 },
  { stage: "design",  department: "Mechanical",  title: "3D Layout Approval",       sort_order: 40 },
  { stage: "design",  department: "Mechanical",  title: "GA Drawing Release",       sort_order: 50 },
  { stage: "design",  department: "Electrical",  title: "Single Line Diagram",      sort_order: 60 },
  { stage: "design",  department: "Electrical",  title: "Cable Schedule",           sort_order: 70 },
  // Purchase
  { stage: "purchase", department: "Purchase",   title: "Material Requests Released", sort_order: 10 },
  { stage: "purchase", department: "Purchase",   title: "Purchase Orders Released",   sort_order: 20 },
  { stage: "purchase", department: "Purchase",   title: "Vendor Follow-up",           sort_order: 30 },
  { stage: "purchase", department: "Finance",    title: "Advance Payment Released",   sort_order: 40 },
  { stage: "purchase", department: "Purchase",   title: "Supplier Delivery Tracking", sort_order: 50 },
  // Workshop
  { stage: "workshop", department: "Workshop",   title: "Fabrication Start",        sort_order: 10 },
  { stage: "workshop", department: "Workshop",   title: "Fit-up & Welding",         sort_order: 20 },
  { stage: "workshop", department: "Workshop",   title: "Painting",                 sort_order: 30 },
  { stage: "workshop", department: "QC",         title: "Workshop Inspection",      sort_order: 40 },
  // Shipment
  { stage: "shipment", department: "Logistics",  title: "Pre-dispatch Inspection",  sort_order: 10 },
  { stage: "shipment", department: "Logistics",  title: "Packing",                  sort_order: 20 },
  { stage: "shipment", department: "Logistics",  title: "Shipment Dispatched",      sort_order: 30 },
  { stage: "shipment", department: "Site",       title: "Site Receipt",             sort_order: 40 },
  // Commissioning
  { stage: "commissioning", department: "Mechanical",     title: "Mechanical Erection",          sort_order: 10 },
  { stage: "commissioning", department: "Electrical",     title: "Electrical Panel Installation", sort_order: 20 },
  { stage: "commissioning", department: "PLC Automation", title: "PLC / SCADA Configuration",     sort_order: 30 },
  { stage: "commissioning", department: "Instrumentation",title: "Loop Check",                    sort_order: 40 },
  { stage: "commissioning", department: "Commissioning",  title: "Pre-commissioning",             sort_order: 50 },
  { stage: "commissioning", department: "Commissioning",  title: "Wet Commissioning",             sort_order: 60 },
  { stage: "commissioning", department: "Commissioning",  title: "Performance Run",               sort_order: 70 },
  { stage: "commissioning", department: "Project",        title: "Customer Handover",             sort_order: 80 },
];

function rowToMilestone(r: any) {
  return {
    id: r.id,
    project: r.project,
    stage: r.stage,
    department: r.department || "",
    title: r.title,
    description: r.description || "",
    status: r.status,
    planned_date: r.planned_date ? new Date(r.planned_date).toISOString().slice(0, 10) : null,
    actual_date:  r.actual_date  ? new Date(r.actual_date).toISOString().slice(0, 10)  : null,
    owner: r.owner || "",
    created_by: r.created_by || "",
    responsible_person: r.responsible_person || "",
    challenges: r.challenges || "",
    sort_order: r.sort_order,
    created_at: r.created_at?.toISOString?.() || r.created_at,
    updated_at: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

// List all milestones for a project (optionally seed defaults if none exist).
router.get("/meeting-discussions", async (req, res) => {
  try {
    const project = String(req.query.project || "").trim();
    if (!project) return res.status(400).json({ error: "project query param is required" });
    const seed = String(req.query.seed || "") === "1";

    let r = await pool.query(
      `SELECT * FROM pm_meeting_milestones
        WHERE project = $1
        ORDER BY
          CASE stage
            WHEN 'kickoff' THEN 1 WHEN 'design' THEN 2 WHEN 'purchase' THEN 3
            WHEN 'workshop' THEN 4 WHEN 'shipment' THEN 5 WHEN 'commissioning' THEN 6
            ELSE 7 END,
          sort_order, id`,
      [project],
    );

    // First-time open: drop in the default skeleton so the user has something to edit.
    if (r.rows.length === 0 && seed) {
      const ph: string[] = [];
      const vals: any[] = [];
      SEED_MILESTONES.forEach((m, i) => {
        const o = i * 5;
        ph.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`);
        vals.push(project, m.stage, m.department, m.title, m.sort_order);
      });
      await pool.query(
        `INSERT INTO pm_meeting_milestones
           (project, stage, department, title, sort_order)
         VALUES ${ph.join(", ")}`,
        vals,
      );
      r = await pool.query(
        `SELECT * FROM pm_meeting_milestones
          WHERE project = $1
          ORDER BY
            CASE stage
              WHEN 'kickoff' THEN 1 WHEN 'design' THEN 2 WHEN 'purchase' THEN 3
              WHEN 'workshop' THEN 4 WHEN 'shipment' THEN 5 WHEN 'commissioning' THEN 6
              ELSE 7 END,
            sort_order, id`,
        [project],
      );
    }

    const notes = await pool.query(
      `SELECT id, project, meeting_date, title, body, created_at
         FROM pm_meeting_notes
        WHERE project = $1
        ORDER BY meeting_date DESC, id DESC`,
      [project],
    );

    res.json({
      milestones: r.rows.map(rowToMilestone),
      notes: notes.rows.map((n: any) => ({
        id: n.id,
        project: n.project,
        meeting_date: n.meeting_date ? new Date(n.meeting_date).toISOString().slice(0, 10) : null,
        title: n.title || "",
        body: n.body || "",
        created_at: n.created_at?.toISOString?.() || n.created_at,
      })),
    });
  } catch (e: any) {
    console.error("meeting-discussions list error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Cross-project insights: all milestones (optionally project-filtered) with
// delay/challenge stats so a dedicated dashboard can slice by project, stage,
// owner, etc. without making one request per project.
router.get("/meeting-discussions/insights", async (req, res) => {
  try {
    const project = String(req.query.project || "").trim();
    const params: any[] = [];
    let where = "";
    if (project) {
      params.push(project);
      where = `WHERE project = $${params.length}`;
    }
    const r = await pool.query(
      `SELECT * FROM pm_meeting_milestones
        ${where}
        ORDER BY project,
          CASE stage
            WHEN 'kickoff' THEN 1 WHEN 'design' THEN 2 WHEN 'purchase' THEN 3
            WHEN 'workshop' THEN 4 WHEN 'shipment' THEN 5 WHEN 'commissioning' THEN 6
            ELSE 7 END,
          sort_order, id`,
      params,
    );
    const milestones = r.rows.map(rowToMilestone);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let delayed = 0, blocked = 0, challenges = 0, completed = 0, inProgress = 0, pending = 0;
    const projectsSet = new Set<string>();
    for (const m of milestones) {
      projectsSet.add(m.project);
      const planned = m.planned_date ? new Date(m.planned_date) : null;
      const actual  = m.actual_date  ? new Date(m.actual_date)  : null;
      const isDelayed =
        m.status === "delayed" ||
        (planned && !actual && planned < today && m.status !== "completed") ||
        (planned && actual && actual > planned);
      if (isDelayed) delayed++;
      if (m.status === "blocked") blocked++;
      if (m.status === "completed") completed++;
      if (m.status === "in_progress") inProgress++;
      if (m.status === "pending") pending++;
      if ((m.challenges || "").trim().length > 0) challenges++;
    }

    res.json({
      milestones,
      stats: {
        total: milestones.length,
        projects: projectsSet.size,
        delayed,
        blocked,
        challenges,
        completed,
        in_progress: inProgress,
        pending,
      },
    });
  } catch (e: any) {
    console.error("meeting-discussions insights error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// AI-powered status summary report for a single project.
// Analyses milestones (status, planned vs actual dates, owners, challenges) and
// returns an executive narrative with health verdict, highlights, risks, and
// recommended next actions for the upcoming meeting.
router.post("/meeting-discussions/ai-summary", async (req, res) => {
  try {
    const project = String(req.body?.project || "").trim();
    if (!project) return res.status(400).json({ error: "project is required" });

    const r = await pool.query(
      `SELECT * FROM pm_meeting_milestones
        WHERE project = $1
        ORDER BY
          CASE stage
            WHEN 'kickoff' THEN 1 WHEN 'design' THEN 2 WHEN 'purchase' THEN 3
            WHEN 'workshop' THEN 4 WHEN 'shipment' THEN 5 WHEN 'commissioning' THEN 6
            ELSE 7 END,
          sort_order, id`,
      [project],
    );
    const milestones = r.rows.map(rowToMilestone);

    if (milestones.length === 0) {
      return res.json({
        project,
        summary: "No milestones have been recorded for this project yet. Add milestones in each stage (Kickoff, Design, Purchase, Workshop, Shipment, Commissioning) to generate an AI status report.",
        health: "no_data",
        stats: { total: 0, completed: 0, in_progress: 0, delayed: 0, pending: 0 },
        generated_at: new Date().toISOString(),
      });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const stats = { total: 0, completed: 0, in_progress: 0, delayed: 0, pending: 0, with_challenges: 0 };
    const delayedItems: any[] = [];
    const challengeItems: any[] = [];
    const upcoming: any[] = [];
    for (const m of milestones) {
      stats.total++;
      const planned = m.planned_date ? new Date(m.planned_date) : null;
      const actual  = m.actual_date  ? new Date(m.actual_date)  : null;
      const isDelayed =
        m.status === "delayed" ||
        (planned && !actual && planned < today && m.status !== "completed") ||
        (planned && actual && actual > planned);
      if (m.status === "completed") stats.completed++;
      if (m.status === "in_progress") stats.in_progress++;
      if (m.status === "pending") stats.pending++;
      if (isDelayed) { stats.delayed++; if (m.status !== "completed") delayedItems.push({ ...m, days_overdue: planned ? Math.floor((today.getTime() - planned.getTime()) / 86400000) : 0 }); }
      if ((m.challenges || "").trim()) { stats.with_challenges++; challengeItems.push(m); }
      if (planned && !actual && planned >= today && m.status !== "completed") {
        const days = Math.floor((planned.getTime() - today.getTime()) / 86400000);
        if (days <= 14) upcoming.push({ ...m, days_until: days });
      }
    }

    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    let healthLabel: "complete" | "on_track" | "at_risk" | "critical";
    const delayRatio = stats.delayed / Math.max(1, stats.total);
    if (stats.completed === stats.total) healthLabel = "complete";
    else if (delayRatio >= 0.25) healthLabel = "critical";
    else if (delayRatio > 0) healthLabel = "at_risk";
    else healthLabel = "on_track";

    // Build the prompt context (compact JSON to keep tokens down)
    const stageGroups: Record<string, any[]> = {};
    for (const m of milestones) {
      (stageGroups[m.stage] = stageGroups[m.stage] || []).push({
        title: m.title,
        dept: m.department,
        status: m.status,
        planned: m.planned_date,
        actual: m.actual_date,
        owner: m.owner,
        responsible: m.responsible_person,
        challenges: m.challenges || undefined,
      });
    }

    const prompt = [
      `You are a senior project manager preparing a status briefing for an internal review meeting.`,
      `Project: "${project}". Today: ${today.toISOString().slice(0, 10)}.`,
      `Overall completion: ${pct}% (${stats.completed}/${stats.total} milestones).`,
      `Status counts — completed:${stats.completed}, in_progress:${stats.in_progress}, delayed:${stats.delayed}, pending:${stats.pending}.`,
      `Health classification: ${healthLabel.toUpperCase()}.`,
      ``,
      `Milestones grouped by stage (JSON):`,
      JSON.stringify(stageGroups, null, 2),
      ``,
      `Delayed items needing attention:`,
      delayedItems.length === 0 ? "(none)" : JSON.stringify(delayedItems.map((m) => ({ stage: m.stage, dept: m.department, title: m.title, planned: m.planned_date, days_overdue: m.days_overdue, owner: m.owner, responsible: m.responsible_person, status: m.status })), null, 2),
      ``,
      `Open challenges/blockers (free text from team):`,
      challengeItems.length === 0 ? "(none)" : JSON.stringify(challengeItems.map((m) => ({ stage: m.stage, title: m.title, owner: m.owner, note: m.challenges })), null, 2),
      ``,
      `Upcoming milestones (next 14 days):`,
      upcoming.length === 0 ? "(none)" : JSON.stringify(upcoming.map((m) => ({ stage: m.stage, title: m.title, planned: m.planned_date, days_until: m.days_until, owner: m.owner, responsible: m.responsible_person })), null, 2),
      ``,
      `Write a tight executive briefing in plain English that an MD/customer can scan in 60 seconds. Use these markdown sections (no other top-level headings):`,
      `## Verdict`,
      `One short paragraph stating overall health, % complete, and what stage the project is in.`,
      `## Highlights`,
      `Bullet list (3-5 items) of recent wins and on-track stages. Be specific — name milestones.`,
      `## Risks & Delays`,
      `Bullet list of every delayed/blocked item with: stage · title · days late · owner · 1-line root cause if visible from challenges. Sort worst first.`,
      `## Upcoming (next 2 weeks)`,
      `Bullet list of upcoming planned dates with owner and days until.`,
      `## Recommended Actions`,
      `Numbered list of 3-6 concrete next steps the meeting should commit to (assign owners + dates where obvious from data).`,
      ``,
      `Be specific and quantitative. Do NOT invent dates, names, or facts not present in the data.`,
    ].join("\n");

    let summary: string;
    try {
      const ai = getOpenAI();
      const resp = await ai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a senior project manager who writes terse, executive-grade status briefings. Always ground every claim in the supplied data." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });
      summary = resp.choices?.[0]?.message?.content?.trim() || "AI returned an empty response.";
    } catch (e: any) {
      console.error("ai-summary openai error:", e?.message || e);
      // Deterministic fallback so the page still produces a useful briefing
      // when the OpenAI key is missing or the API call fails.
      const lines: string[] = [];
      lines.push(`## Verdict`);
      lines.push(`Project **${project}** is **${healthLabel.replace("_", " ")}** at **${pct}%** complete (${stats.completed}/${stats.total} milestones).`);
      lines.push("");
      lines.push(`## Highlights`);
      if (stats.completed === 0) lines.push(`- No milestones completed yet.`);
      else lines.push(`- ${stats.completed} milestone${stats.completed === 1 ? "" : "s"} completed across ${Object.keys(stageGroups).length} stages.`);
      if (stats.in_progress > 0) lines.push(`- ${stats.in_progress} milestone${stats.in_progress === 1 ? "" : "s"} actively in progress.`);
      lines.push("");
      lines.push(`## Risks & Delays`);
      if (delayedItems.length === 0) lines.push(`- No delays reported.`);
      else {
        for (const d of delayedItems.slice(0, 10)) {
          lines.push(`- **${d.stage} · ${d.title}** — ${d.days_overdue}d late, owner: ${d.owner || "unassigned"}${d.challenges ? `. Note: ${d.challenges}` : ""}`);
        }
      }
      lines.push("");
      lines.push(`## Upcoming (next 2 weeks)`);
      if (upcoming.length === 0) lines.push(`- No milestones scheduled in the next 14 days.`);
      else for (const u of upcoming.slice(0, 10)) lines.push(`- ${u.stage} · ${u.title} — due ${u.planned_date} (${u.days_until}d), owner: ${u.owner || "unassigned"}`);
      lines.push("");
      lines.push(`## Recommended Actions`);
      let n = 1;
      if (delayedItems.length > 0) lines.push(`${n++}. Review the ${delayedItems.length} delayed item${delayedItems.length === 1 ? "" : "s"} and confirm new commit dates.`);
      if (upcoming.length > 0) lines.push(`${n++}. Confirm readiness for ${upcoming.length} milestone${upcoming.length === 1 ? "" : "s"} due in the next 2 weeks.`);
      if (n === 1) lines.push(`1. Maintain current pace and review again at the next meeting cycle.`);
      lines.push("");
      lines.push(`*(AI fallback summary — set AI_INTEGRATIONS_OPENAI_API_KEY to enable richer analysis.)*`);
      summary = lines.join("\n");
    }

    res.json({
      project,
      summary,
      health: healthLabel,
      pct_complete: pct,
      stats,
      delayed_count: delayedItems.length,
      upcoming_count: upcoming.length,
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("meeting-discussions ai-summary error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Auto-discussion points pulled from ERPNext Purchase Orders for the project.
// For each PO we surface: PO number, supplier, status, PO date (transaction_date),
// expected delivery (schedule_date), received %, billed %, and a derived
// follow-up reason (overdue, partial, awaiting receipt, etc.) so the meeting
// page can show "what to discuss next" automatically without manual entry.
// Shared: enrich raw ERPNext POs with computed stage / days_overdue / discussion.
function enrichPurchaseOrders(pos: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return pos.map((po) => {
    const received = Number(po.per_received) || 0;
    const billed = Number(po.per_billed) || 0;
    const schedule = po.schedule_date ? new Date(po.schedule_date) : null;
    const isOverdue = !!schedule && schedule < today && received < 100;
    const daysOverdue = schedule
      ? Math.max(0, Math.floor((today.getTime() - schedule.getTime()) / 86400000))
      : 0;
    let stage: "ordered" | "in_transit" | "received" | "overdue" | "partial";
    let discussion: string;
    if (received >= 100) {
      stage = "received";
      discussion = `Materials fully received from ${po.supplier_name || po.supplier}. Confirm QC and store entry.`;
    } else if (isOverdue) {
      stage = "overdue";
      discussion = `Vendor follow-up needed — ${po.supplier_name || po.supplier} is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past the scheduled delivery (${po.schedule_date}).`;
    } else if (received > 0) {
      stage = "partial";
      discussion = `Partial receipt (${received.toFixed(0)}%) from ${po.supplier_name || po.supplier}. Track remaining items.`;
    } else if (schedule) {
      stage = "in_transit";
      discussion = `Awaiting delivery from ${po.supplier_name || po.supplier} by ${po.schedule_date}.`;
    } else {
      stage = "ordered";
      discussion = `PO released to ${po.supplier_name || po.supplier} on ${po.transaction_date}. Confirm acknowledgement.`;
    }
    return {
      name: po.name,
      supplier: po.supplier,
      supplier_name: po.supplier_name,
      status: po.status,
      po_date: po.transaction_date,
      schedule_date: po.schedule_date,
      per_received: received,
      per_billed: billed,
      grand_total: po.grand_total,
      currency: po.currency,
      project: po.project,
      days_overdue: isOverdue ? daysOverdue : 0,
      stage,
      discussion,
    };
  });
}

// Compact panel: only pending + long-delay items, capped for meeting focus.
router.get("/meeting-discussions/purchase-orders", async (req, res) => {
  try {
    const project = String(req.query.project || "").trim();
    if (!project) return res.status(400).json({ error: "project query param is required" });
    if (!isErpNextConfigured()) return res.json({ purchase_orders: [] });

    const pos = await fetchErpNextPurchaseOrders({ project });
    const out = enrichPurchaseOrders(pos);

    const followUps = out
      .filter((po) => po.stage === "overdue" && po.days_overdue >= 3)
      .sort((a, b) => b.days_overdue - a.days_overdue)
      .slice(0, 50);

    res.json({
      purchase_orders: followUps,
      total_pos: out.length,
      pending_followups: out.filter((p) => p.stage === "overdue" && p.days_overdue >= 3).length,
    });
  } catch (e: any) {
    console.error("meeting-discussions purchase-orders error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Detailed view: all POs (optionally project-scoped) with computed fields and
// stats, so the frontend can apply its own filters/sorts/pagination.
router.get("/meeting-discussions/purchase-orders/detail", async (req, res) => {
  try {
    if (!isErpNextConfigured()) return res.json({ purchase_orders: [], stats: {} });
    const project = String(req.query.project || "").trim() || undefined;
    const pos = await fetchErpNextPurchaseOrders({ project });
    const out = enrichPurchaseOrders(pos);

    const stats = {
      total: out.length,
      overdue: out.filter((p) => p.stage === "overdue").length,
      partial: out.filter((p) => p.stage === "partial").length,
      in_transit: out.filter((p) => p.stage === "in_transit").length,
      ordered: out.filter((p) => p.stage === "ordered").length,
      received: out.filter((p) => p.stage === "received").length,
      critical_overdue: out.filter((p) => p.stage === "overdue" && p.days_overdue >= 30).length,
      open_value: out
        .filter((p) => p.stage !== "received")
        .reduce((s, p) => s + (Number(p.grand_total) || 0) * (1 - (Number(p.per_received) || 0) / 100), 0),
    };

    res.json({ purchase_orders: out, stats });
  } catch (e: any) {
    console.error("meeting-discussions purchase-orders detail error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Create a milestone manually.
router.get("/meeting-discussions/milestone-departments", async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT ON (LOWER(department)) department
       FROM pm_meeting_milestones
       WHERE department IS NOT NULL AND department <> ''
       ORDER BY LOWER(department) ASC, department ASC`
    );
    res.json(r.rows.map((row: any) => row.department as string));
  } catch (e: any) {
    console.error("meeting-discussions milestone-departments error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

router.post("/meeting-discussions/milestone", async (req, res) => {
  try {
    const b = req.body || {};
    const project = String(b.project || "").trim();
    const stage = String(b.stage || "").trim();
    const title = String(b.title || "").trim();
    if (!project || !stage || !title) {
      return res.status(400).json({ error: "project, stage and title are required" });
    }
    if (!ALLOWED_STAGES.has(stage)) {
      return res.status(400).json({ error: `Invalid stage. Allowed: ${[...ALLOWED_STAGES].join(", ")}` });
    }
    const status = ALLOWED_STATUSES.has(String(b.status || "")) ? String(b.status) : "pending";

    const r = await pool.query(
      `INSERT INTO pm_meeting_milestones
         (project, stage, department, title, description, status, planned_date,
          actual_date, owner, created_by, responsible_person, challenges, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13, 999))
       RETURNING *`,
      [
        project,
        stage,
        String(b.department || "").trim(),
        title,
        String(b.description || ""),
        status,
        b.planned_date || null,
        b.actual_date || null,
        String(b.owner || "").trim(),
        String(b.created_by || "").trim(),
        String(b.responsible_person || "").trim(),
        String(b.challenges || ""),
        Number.isFinite(b.sort_order) ? b.sort_order : 999,
      ],
    );
    res.status(201).json(rowToMilestone(r.rows[0]));
  } catch (e: any) {
    console.error("meeting-discussions create error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Update one milestone (any subset of fields).
router.patch("/meeting-discussions/milestone/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const b = req.body || {};

    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };

    if (b.stage !== undefined) {
      const stage = String(b.stage);
      if (!ALLOWED_STAGES.has(stage)) {
        return res.status(400).json({ error: "invalid stage" });
      }
      push("stage", stage);
    }
    if (b.department !== undefined)  push("department",  String(b.department || ""));
    if (b.title !== undefined)       push("title",       String(b.title || ""));
    if (b.description !== undefined) push("description", String(b.description || ""));
    if (b.status !== undefined) {
      const status = String(b.status);
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ error: "invalid status" });
      }
      push("status", status);
    }
    if (b.planned_date !== undefined) push("planned_date", b.planned_date || null);
    if (b.actual_date !== undefined)  push("actual_date",  b.actual_date  || null);
    if (b.owner !== undefined)              push("owner",              String(b.owner || ""));
    if (b.created_by !== undefined)         push("created_by",         String(b.created_by || ""));
    if (b.responsible_person !== undefined) push("responsible_person", String(b.responsible_person || ""));
    if (b.challenges !== undefined)         push("challenges",         String(b.challenges || ""));
    if (b.sort_order !== undefined && Number.isFinite(b.sort_order)) {
      push("sort_order", b.sort_order);
    }

    if (sets.length === 0) return res.status(400).json({ error: "no fields to update" });
    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const r = await pool.query(
      `UPDATE pm_meeting_milestones SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals,
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(rowToMilestone(r.rows[0]));
  } catch (e: any) {
    console.error("meeting-discussions update error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

router.delete("/meeting-discussions/milestone/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const r = await pool.query(
      `DELETE FROM pm_meeting_milestones WHERE id = $1 RETURNING id`,
      [id],
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (e: any) {
    console.error("meeting-discussions delete error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Free-form discussion notes (one row per meeting).
router.post("/meeting-discussions/note", async (req, res) => {
  try {
    const b = req.body || {};
    const project = String(b.project || "").trim();
    const body = String(b.body || "").trim();
    if (!project) return res.status(400).json({ error: "project is required" });
    if (!body && !b.title) return res.status(400).json({ error: "title or body is required" });

    const r = await pool.query(
      `INSERT INTO pm_meeting_notes (project, meeting_date, title, body)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4)
       RETURNING id, project, meeting_date, title, body, created_at`,
      [project, b.meeting_date || null, String(b.title || ""), body],
    );
    const n = r.rows[0];
    res.status(201).json({
      id: n.id,
      project: n.project,
      meeting_date: n.meeting_date ? new Date(n.meeting_date).toISOString().slice(0, 10) : null,
      title: n.title || "",
      body: n.body || "",
      created_at: n.created_at?.toISOString?.() || n.created_at,
    });
  } catch (e: any) {
    console.error("meeting-discussions note create error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// GET /erpnext-employees-mention?q=foo — searchable employees for @-mention/assign
router.get("/erpnext-employees-mention", async (req, res) => {
  try {
    const { q = "" } = req.query as Record<string, string>;
    if (!isErpNextConfigured()) return res.json([]);
    const all = await fetchErpNextEmployees({ status: "Active" });
    const query = (q || "").toLowerCase().trim();
    const filtered = (query
      ? all.filter((e) =>
          (e.employee_name || "").toLowerCase().includes(query) ||
          (e.name || "").toLowerCase().includes(query) ||
          (e.user_id || "").toLowerCase().includes(query),
        )
      : all
    ).slice(0, 30);
    res.json(filtered.map((e) => ({
      id: e.name,                  // ERPNext Employee doc name (e.g. WTT0123)
      name: e.employee_name || e.name,
      designation: e.designation || "",
      department: e.department || "",
      user_id: e.user_id || null,  // login email
      avatar: e.image || null,
    })));
  } catch (e: any) {
    console.error("erpnext-employees-mention error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// POST /meeting-discussions/task-allocation — create real ERPNext Task Allocation
router.post("/meeting-discussions/task-allocation", async (req, res) => {
  try {
    if (!isErpNextConfigured()) {
      return res.status(503).json({ error: "ERPNext is not configured" });
    }
    const b = req.body || {};
    const employee = String(b.employee || "").trim();
    const task_name = String(b.task_name || b.title || "").trim();
    const description = String(b.description || b.body || "").trim();
    const date = String(b.date || new Date().toISOString().slice(0, 10));
    const expected_end_date = b.expected_end_date ? String(b.expected_end_date) : date;
    const expected_hours = Number(b.expected_hours) || 1;

    if (!employee) return res.status(400).json({ error: "employee is required" });
    if (!task_name) return res.status(400).json({ error: "task_name is required" });

    const result = await createErpNextTaskAllocation({
      employee,
      date,
      tasks: [{ task_name, description, expected_hours, expected_end_date }],
    });
    res.status(201).json({
      ok: true,
      name: result.name,
      url: `https://erp.wttint.com/app/task-allocation/${encodeURIComponent(result.name)}`,
      employee,
      task_name,
      expected_end_date,
      expected_hours,
    });
  } catch (e: any) {
    console.error("meeting-discussions task-allocation error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

router.delete("/meeting-discussions/note/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const r = await pool.query(
      `DELETE FROM pm_meeting_notes WHERE id = $1 RETURNING id`,
      [id],
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (e: any) {
    console.error("meeting-discussions note delete error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ─── Material Requests ────────────────────────────────────────────────────────

router.get("/material-requests", async (req, res) => {
  try {
    const { status, type, project } = req.query as {
      status?: string;
      type?: string;
      project?: string;
    };
    const records = await fetchErpNextMaterialRequests({
      status,
      type,
      project,
    });
    res.json(records);
  } catch (e) {
    console.error("Material Request fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/material-requests/:name", async (req, res) => {
  try {
    const record = await fetchErpNextMaterialRequest(req.params.name);
    res.json(record);
  } catch (e) {
    console.error("Material Request detail fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/material-requests", async (req, res) => {
  try {
    const record = await createErpNextMaterialRequest(req.body);
    res.status(201).json(record);
  } catch (e) {
    console.error("Material Request create error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/material-request-items", async (_req, res) => {
  try {
    const items = await fetchErpNextMaterialRequestItems();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/warehouses", async (_req, res) => {
  try {
    const warehouses = await fetchErpNextWarehouses();
    res.json(warehouses);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/companies", async (_req, res) => {
  try {
    const companies = await fetchErpNextCompanies();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Departments ─────────────────────────────────────────────────────────────

router.get("/departments", async (_req, res) => {
  try {
    const fields = JSON.stringify(["name", "department_name", "parent_department", "is_group", "disabled"]);
    const filters = JSON.stringify([["Department", "disabled", "=", 0]]);
    const params = new URLSearchParams({ fields, filters, limit_page_length: "500", order_by: "department_name asc" });
    const url = `${ERP_URL}/api/resource/Department?${params}`;
    const r = await fetch(url, { headers: { Authorization: ERP_AUTH(), Accept: "application/json" } });
    if (!r.ok) return res.json([]);
    const data = await r.json();
    res.json(data.data || []);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── User Management ─────────────────────────────────────────────────────────

router.get("/erpnext-users", async (req, res) => {
  try {
    const skipFilter = req.query.all === "true";
    const users = await fetchErpNextUsers({ skipFilter });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/erpnext-users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await fetchErpNextUser(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});


router.put("/erpnext-users/:email/enabled", async (req, res) => {
  try {
    const { email } = req.params;
    const { enabled } = req.body as { enabled: boolean };
    const r = await fetch(`${ERP_URL}/api/resource/User/${encodeURIComponent(email)}`, {
      method: "PUT",
      headers: { Authorization: ERP_AUTH(), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
    });
    if (!r.ok) throw new Error(await r.text());
    res.json({ ok: true, enabled: enabled ? 1 : 0 });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Role Templates ──────────────────────────────────────────────────────────

router.get("/role-templates", async (_req, res) => {
  try {
    const rows = await db.select().from(roleTemplatesTable).orderBy(roleTemplatesTable.name);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/role-templates", async (req, res) => {
  try {
    const { name, description, color, moduleRoles } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db
      .insert(roleTemplatesTable)
      .values({
        name,
        description: description ?? "",
        color: color ?? "violet",
        moduleRoles: JSON.stringify(moduleRoles ?? {}),
        updatedAt: new Date(),
      })
      .returning();
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/role-templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, color, moduleRoles } = req.body;
    const [row] = await db
      .update(roleTemplatesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(moduleRoles !== undefined && { moduleRoles: JSON.stringify(moduleRoles) }),
        updatedAt: new Date(),
      })
      .where(eq(roleTemplatesTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/role-templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(roleTemplatesTable).where(eq(roleTemplatesTable.id, id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── User Permissions ─────────────────────────────────────────────────────────

router.get("/user-permissions", async (_req, res) => {
  try {
    const rows = await db.select().from(userPermissionsTable);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/user-permissions/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const rows = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, email));
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/user-permissions/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { fullName, hasAccess, modules, moduleRoles, roleType, allowedProjects, allowedDrawingDepts, twoFaEnabled, theme, navbarStyle, hodDept } = req.body;
    const derivedModules = moduleRoles
      ? Object.entries(moduleRoles as Record<string, string>)
          .filter(([, role]) => role !== "none")
          .map(([key]) => key)
      : (modules ?? []);
    const [row] = await db
      .insert(userPermissionsTable)
      .values({
        email,
        fullName: fullName ?? null,
        hasAccess: hasAccess ?? true,
        modules: JSON.stringify(derivedModules),
        moduleRoles: JSON.stringify(moduleRoles ?? {}),
        roleType: roleType ?? null,
        allowedProjects: JSON.stringify(allowedProjects ?? []),
        allowedDrawingDepts: JSON.stringify(allowedDrawingDepts ?? []),
        twoFaEnabled: twoFaEnabled ?? false,
        theme: theme ?? "system",
        navbarStyle: navbarStyle ?? "full",
        hodDept: hodDept ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPermissionsTable.email,
        set: {
          fullName: fullName ?? null,
          hasAccess: hasAccess ?? true,
          modules: JSON.stringify(derivedModules),
          moduleRoles: JSON.stringify(moduleRoles ?? {}),
          roleType: roleType ?? null,
          allowedProjects: JSON.stringify(allowedProjects ?? []),
          allowedDrawingDepts: JSON.stringify(allowedDrawingDepts ?? []),
          twoFaEnabled: twoFaEnabled ?? false,
          theme: theme ?? "system",
          navbarStyle: navbarStyle ?? "full",
          hodDept: hodDept ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Purchase Orders ─────────────────────────────────────────────────────────

router.get("/purchase-orders", async (req, res) => {
  try {
    const { status, supplier, project } = req.query as {
      status?: string;
      supplier?: string;
      project?: string;
    };
    const records = await fetchErpNextPurchaseOrders({ status, supplier, project });
    res.json(records);
  } catch (e) {
    console.error("Purchase Order fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/purchase-orders/:name", async (req, res) => {
  try {
    const record = await fetchErpNextPurchaseOrder(req.params.name);
    res.json(record);
  } catch (e) {
    console.error("Purchase Order detail fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/suppliers", async (_req, res) => {
  try {
    const suppliers = await fetchErpNextSuppliers();
    res.json(suppliers);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Project Drawings (DB-backed) ────────────────────────────────────────────

router.get("/project-drawings", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: projectDrawingsTable.id,
        drawingNo: projectDrawingsTable.drawingNo,
        title: projectDrawingsTable.title,
        project: projectDrawingsTable.project,
        department: projectDrawingsTable.department,
        drawingType: projectDrawingsTable.drawingType,
        systemName: projectDrawingsTable.systemName,
        uploadedAt: projectDrawingsTable.uploadedAt,
        status: projectDrawingsTable.status,
        revisionNo: projectDrawingsTable.revisionNo,
        revisionLabel: projectDrawingsTable.revisionLabel,
        fileName: projectDrawingsTable.fileName,
        note: projectDrawingsTable.note,
        uploadedBy: projectDrawingsTable.uploadedBy,
        history: projectDrawingsTable.history,
        viewLog: projectDrawingsTable.viewLog,
        checkedBy: projectDrawingsTable.checkedBy,
        approvedBy: projectDrawingsTable.approvedBy,
        erpFileUrl: projectDrawingsTable.erpFileUrl,
        aiAnalysis: projectDrawingsTable.aiAnalysis,
        createdAt: projectDrawingsTable.createdAt,
        updatedAt: projectDrawingsTable.updatedAt,
      })
      .from(projectDrawingsTable)
      .orderBy(projectDrawingsTable.createdAt);
    res.json(rows.map(r => ({
      ...r,
      fileData: "",
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/project-drawings/:id/file", async (req, res) => {
  try {
    const [row] = await db
      .select({ fileData: projectDrawingsTable.fileData })
      .from(projectDrawingsTable)
      .where(eq(projectDrawingsTable.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ fileData: row.fileData });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/project-drawings", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db
      .insert(projectDrawingsTable)
      .values({
        id: body.id,
        drawingNo: body.drawingNo,
        title: body.title ?? "",
        project: body.project ?? "",
        department: body.department ?? "",
        drawingType: body.drawingType ?? "",
        systemName: body.systemName ?? "",
        uploadedAt: body.uploadedAt,
        status: body.status ?? "draft",
        revisionNo: body.revisionNo ?? 0,
        revisionLabel: body.revisionLabel ?? "",
        fileData: body.fileData ?? "",
        fileName: body.fileName ?? "",
        note: body.note ?? "",
        uploadedBy: body.uploadedBy ?? "",
        history: body.history ?? [],
        viewLog: body.viewLog ?? [],
        checkedBy: body.checkedBy ?? null,
        approvedBy: body.approvedBy ?? null,
        erpFileUrl: body.erpFileUrl ?? null,
      })
      .returning();
    res.status(201).json({ ...row, fileData: "", createdAt: row.createdAt?.toISOString?.() ?? row.createdAt, updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/project-drawings/:id", async (req, res) => {
  try {
    const body = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.drawingNo !== undefined) updateData.drawingNo = body.drawingNo;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.project !== undefined) updateData.project = body.project;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.drawingType !== undefined) updateData.drawingType = body.drawingType;
    if (body.systemName !== undefined) updateData.systemName = body.systemName;
    if (body.uploadedAt !== undefined) updateData.uploadedAt = body.uploadedAt;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.revisionNo !== undefined) updateData.revisionNo = body.revisionNo;
    if (body.revisionLabel !== undefined) updateData.revisionLabel = body.revisionLabel;
    if (body.fileData !== undefined && body.fileData !== "") updateData.fileData = body.fileData;
    if (body.fileName !== undefined) updateData.fileName = body.fileName;
    if (body.note !== undefined) updateData.note = body.note;
    if (body.uploadedBy !== undefined) updateData.uploadedBy = body.uploadedBy;
    if (body.history !== undefined) updateData.history = body.history;
    if (body.viewLog !== undefined) updateData.viewLog = body.viewLog;
    if (body.checkedBy !== undefined) updateData.checkedBy = body.checkedBy;
    if (body.approvedBy !== undefined) updateData.approvedBy = body.approvedBy;
    if (body.erpFileUrl !== undefined) updateData.erpFileUrl = body.erpFileUrl;
    if (body.aiAnalysis !== undefined) updateData.aiAnalysis = body.aiAnalysis;
    const [row] = await db
      .update(projectDrawingsTable)
      .set(updateData)
      .where(eq(projectDrawingsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, fileData: "", createdAt: row.createdAt?.toISOString?.() ?? row.createdAt, updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/project-drawings/:id", async (req, res) => {
  try {
    const body = req.body;
    const patchData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.drawingNo !== undefined) patchData.drawingNo = body.drawingNo;
    if (body.title !== undefined) patchData.title = body.title;
    if (body.project !== undefined) patchData.project = body.project;
    if (body.department !== undefined) patchData.department = body.department;
    if (body.drawingType !== undefined) patchData.drawingType = body.drawingType;
    if (body.systemName !== undefined) patchData.systemName = body.systemName;
    if (body.status !== undefined) patchData.status = body.status;
    if (body.revisionNo !== undefined) patchData.revisionNo = body.revisionNo;
    if (body.revisionLabel !== undefined) patchData.revisionLabel = body.revisionLabel;
    if (body.fileData !== undefined && body.fileData !== "") patchData.fileData = body.fileData;
    if (body.fileName !== undefined) patchData.fileName = body.fileName;
    if (body.note !== undefined) patchData.note = body.note;
    if (body.checkedBy !== undefined) patchData.checkedBy = body.checkedBy;
    if (body.approvedBy !== undefined) patchData.approvedBy = body.approvedBy;
    if (body.erpFileUrl !== undefined) patchData.erpFileUrl = body.erpFileUrl;
    if (body.aiAnalysis !== undefined) patchData.aiAnalysis = body.aiAnalysis;
    if (body.history !== undefined) patchData.history = body.history;
    if (body.viewLog !== undefined) patchData.viewLog = body.viewLog;
    const [row] = await db
      .update(projectDrawingsTable)
      .set(patchData)
      .where(eq(projectDrawingsTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, fileData: "", createdAt: row.createdAt?.toISOString?.() ?? row.createdAt, updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/project-drawings/:id", async (req, res) => {
  try {
    await db
      .delete(projectDrawingsTable)
      .where(eq(projectDrawingsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/project-drawings/:id/send-approval
// Manually send drawing approval notification (link only, no file)
router.post("/project-drawings/:id/send-approval", async (req, res) => {
  try {
    const { channels = ["email", "whatsapp"], appUrl, extraRecipients = [] } = req.body as {
      channels?: string[];
      appUrl?: string;
      extraRecipients?: Array<{ email?: string; phone?: string; notifyEmail?: boolean; notifyWhatsapp?: boolean }>;
    };

    const [drawing] = await db
      .select()
      .from(projectDrawingsTable)
      .where(eq(projectDrawingsTable.id, req.params.id));

    if (!drawing) return res.status(404).json({ error: "Drawing not found" });

    const approvedBy = (drawing.approvedBy as any)?.name || "Admin";
    const drawingNo = drawing.drawingNo || "";
    const title = drawing.title || "";
    const project = drawing.project || "";
    const approvedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const viewLink = appUrl
      ? `${appUrl.replace(/\/$/, "")}/pm-app/project-drawings`
      : "https://flowmatrix.wttint.com/pm-app/project-drawings";

    const recipients = await getApprovalRecipients();
    if (!recipients.length) return res.json({ success: true, sent: 0, message: "No recipients configured" });

    const subject = `Drawing Approved: ${drawingNo}${title ? " — " + title : ""}`;

    const emailHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
  <div style="background:#1e3a5f;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="margin:0;font-size:18px;">Drawing Approved ✓</h2>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px;">WTT International — FlowMatriX</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:130px;">Drawing No.</td><td style="padding:8px 0;font-weight:700;color:#111827;">${drawingNo}</td></tr>
      ${title ? `<tr><td style="padding:8px 0;color:#6b7280;">Title</td><td style="padding:8px 0;color:#111827;">${title}</td></tr>` : ""}
      ${project ? `<tr><td style="padding:8px 0;color:#6b7280;">Project</td><td style="padding:8px 0;color:#111827;">${project}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#6b7280;">Approved By</td><td style="padding:8px 0;color:#111827;">${approvedBy}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Date &amp; Time</td><td style="padding:8px 0;color:#111827;">${approvedAt} IST</td></tr>
    </table>
    <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#166534;">This drawing has received Final Approval and is now a <strong>Final Copy</strong>.</p>
    </div>
    <div style="margin-top:20px;text-align:center;">
      <a href="${viewLink}" style="display:inline-block;padding:12px 28px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View in FlowMatriX →</a>
    </div>
    <p style="margin-top:12px;font-size:11px;color:#9ca3af;text-align:center;">Please do not reply to this email. Log in to FlowMatriX to view the drawing.</p>
  </div>
</div>`;

    const waMsg = `✅ *Drawing Approved — WTT International*\n\n📋 *Drawing No.:* ${drawingNo}${title ? "\n📌 *Title:* " + title : ""}${project ? "\n🏗️ *Project:* " + project : ""}\n👤 *Approved By:* ${approvedBy}\n🕒 *Time:* ${approvedAt} IST\n\nThis drawing is now a *Final Copy*.\n\n🔗 View in FlowMatriX:\n${viewLink}`;

    let sent = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      if (channels.includes("email") && r.notify_email && r.company_email) {
        try {
          await sendEmailMsg(r.company_email, subject, emailHtml);
          sent++;
        } catch (e: any) {
          errors.push(`Email to ${r.company_email}: ${e.message}`);
        }
      }
      if (channels.includes("whatsapp") && r.notify_whatsapp && r.official_mobile) {
        const phone = r.official_mobile.replace(/\D/g, "");
        const intl = phone.startsWith("91") ? phone : `91${phone}`;
        try {
          await sendWhatsAppMsg(`+${intl}`, waMsg);
          sent++;
        } catch (e: any) {
          errors.push(`WhatsApp to ${r.official_mobile}: ${e.message}`);
        }
      }
    }

    // Extra recipients (e.g. admin "also notify me")
    for (const extra of extraRecipients) {
      if (extra.notifyEmail !== false && extra.email) {
        try {
          await sendEmailMsg(extra.email, subject, emailHtml);
          sent++;
        } catch (e: any) {
          errors.push(`Email to ${extra.email}: ${e.message}`);
        }
      }
      if (extra.notifyWhatsapp !== false && extra.phone) {
        const phone = extra.phone.replace(/\D/g, "");
        if (phone) {
          const intl = phone.startsWith("91") ? phone : `91${phone}`;
          try {
            await sendWhatsAppMsg(`+${intl}`, waMsg);
            sent++;
          } catch (e: any) {
            errors.push(`WhatsApp to ${extra.phone}: ${e.message}`);
          }
        }
      }
    }

    res.json({ success: true, sent, errors });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── FM Tasks CRUD ─────────────────────────────────────────────────────────────

// All known assignable users (system_activity + user_permissions)
router.get("/fm-tasks/assignees", async (_req, res) => {
  try {
    const [actRows, permRows] = await Promise.all([
      db.select({
        email: systemActivityTable.email,
        fullName: systemActivityTable.fullName,
        designation: systemActivityTable.designation,
        department: systemActivityTable.department,
      }).from(systemActivityTable),
      db.select({ email: userPermissionsTable.email, fullName: userPermissionsTable.fullName })
        .from(userPermissionsTable),
    ]);

    const map = new Map<string, { name: string; email: string; designation?: string; department?: string }>();
    for (const r of permRows) {
      if (r.email) map.set(r.email.toLowerCase(), { name: r.fullName || r.email, email: r.email });
    }
    for (const r of actRows) {
      if (r.email) {
        const key = r.email.toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: r.fullName || existing?.name || r.email,
          email: r.email,
          designation: r.designation || undefined,
          department: r.department || undefined,
        });
      }
    }
    res.json([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/fm-tasks", async (_req, res) => {
  try {
    const rows = await db.select().from(fmTasksTable).orderBy(desc(fmTasksTable.createdAt));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/fm-tasks", async (req, res) => {
  try {
    const { title, description, projectId, status, priority, assigneeEmail, assigneeName, createdBy, dueDate, startDate, tags, isSelfAssigned, notes } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const [row] = await db.insert(fmTasksTable).values({
      title, description: description ?? null, projectId: projectId ?? null,
      status: status ?? "todo", priority: priority ?? "medium",
      assigneeEmail: assigneeEmail ?? null, assigneeName: assigneeName ?? null,
      createdBy: createdBy ?? "unknown",
      dueDate: dueDate ?? null, startDate: startDate ?? null,
      tags: tags ?? null, isSelfAssigned: isSelfAssigned ?? false,
      notes: notes ?? null,
    }).returning();

    // Send notification to assignee (don't await — fire and forget)
    if (assigneeEmail && assigneeEmail !== createdBy) {
      const assignedTo = assigneeName || assigneeEmail;
      const byWhom = createdBy || "Someone";
      const dueLine = dueDate ? ` Due: ${dueDate}.` : "";
      sendNotification({
        userEmail: assigneeEmail,
        title: "New Task Assigned",
        message: `"${title}" has been assigned to you by ${byWhom}.${dueLine}`,
        type: "info",
        eventType: "task_assigned",
        data: { taskId: row.id, title, priority: priority ?? "medium", dueDate: dueDate ?? null },
      }).catch(() => {});
    }

    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/fm-tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, projectId, status, priority, assigneeEmail, assigneeName, dueDate, startDate, tags, isSelfAssigned, notes, updatedBy } = req.body;

    // Fetch existing task to detect assignee change
    const [existing] = await db.select().from(fmTasksTable).where(eq(fmTasksTable.id, id)).limit(1);

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (projectId !== undefined) update.projectId = projectId;
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    if (assigneeEmail !== undefined) update.assigneeEmail = assigneeEmail;
    if (assigneeName !== undefined) update.assigneeName = assigneeName;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (startDate !== undefined) update.startDate = startDate;
    if (tags !== undefined) update.tags = tags;
    if (isSelfAssigned !== undefined) update.isSelfAssigned = isSelfAssigned;
    if (notes !== undefined) update.notes = notes;
    const [row] = await db.update(fmTasksTable).set(update).where(eq(fmTasksTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "not found" });

    // Notify if assignee changed (new assignee is different from before)
    const newEmail = assigneeEmail ?? existing?.assigneeEmail;
    const prevEmail = existing?.assigneeEmail;
    if (newEmail && newEmail !== prevEmail && newEmail !== (updatedBy || existing?.createdBy)) {
      const taskTitle = title ?? existing?.title ?? "Task";
      const byWhom = updatedBy || existing?.createdBy || "Someone";
      const newDue = dueDate ?? existing?.dueDate;
      const dueLine = newDue ? ` Due: ${newDue}.` : "";
      sendNotification({
        userEmail: newEmail,
        title: "Task Assigned to You",
        message: `"${taskTitle}" has been assigned to you by ${byWhom}.${dueLine}`,
        type: "info",
        eventType: "task_assigned",
        data: { taskId: id, title: taskTitle, priority: priority ?? existing?.priority ?? "medium", dueDate: newDue ?? null },
      }).catch(() => {});
    }

    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/fm-tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(fmTasksTable).where(eq(fmTasksTable.id, id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── System Activity (Python Agent Heartbeat) ──────────────────────────────────

// In-memory cache: deviceUsername → enriched employee data (TTL 1 hour)
const erpUserCache = new Map<string, { data: Record<string, any>; ts: number }>();
const ERP_CACHE_TTL = 3600_000;

async function resolveErpEmployee(deviceUsername: string): Promise<{
  email: string; fullName: string; department: string; designation: string;
  erpEmployeeId: string; erpImage: string;
}> {
  const cached = erpUserCache.get(deviceUsername.toLowerCase());
  if (cached && Date.now() - cached.ts < ERP_CACHE_TTL) return cached.data as any;

  const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
  const API_KEY = process.env.ERPNEXT_API_KEY || "";
  const API_SECRET = process.env.ERPNEXT_API_SECRET || "";
  const hdr = { Accept: "application/json", Authorization: `token ${API_KEY}:${API_SECRET}` };

  let email = "";
  let fullName = deviceUsername;

  // Step 1: find User by username field
  try {
    const uFields = `["email","full_name","username","user_image"]`;
    const ur = await fetch(
      `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(`[["username","=","${deviceUsername}"]]`)}&fields=${encodeURIComponent(uFields)}&limit=1`,
      { headers: hdr }
    );
    if (ur.ok) {
      const list = ((await ur.json()) as any)?.data || [];
      if (list.length > 0) { email = list[0].email || ""; fullName = list[0].full_name || deviceUsername; }
    }
  } catch {}

  // Step 2: find Employee by user_id = email or employee name = username
  let designation = ""; let department = ""; let erpEmployeeId = ""; let erpImage = "";
  try {
    const eFields = `["name","employee_name","designation","department","status","image","user_id"]`;
    let empData: Record<string, any> | null = null;

    // Try by user_id
    if (email) {
      const er = await fetch(
        `${ERP_URL}/api/resource/Employee?filters=${encodeURIComponent(`[["user_id","=","${email}"]]`)}&fields=${encodeURIComponent(eFields)}&limit=1`,
        { headers: hdr }
      );
      if (er.ok) { const list = ((await er.json()) as any)?.data || []; if (list.length > 0) empData = list[0]; }
    }

    // Try by employee name (e.g. WTT1194)
    if (!empData) {
      const er2 = await fetch(
        `${ERP_URL}/api/resource/Employee/${encodeURIComponent(deviceUsername.toUpperCase())}?fields=${encodeURIComponent(eFields)}`,
        { headers: hdr }
      );
      if (er2.ok) { const d = ((await er2.json()) as any)?.data; if (d?.name) empData = d; }
    }

    if (empData) {
      designation = empData.designation || "";
      department = empData.department || "";
      erpEmployeeId = empData.name || "";
      if (empData.image) {
        const img = String(empData.image);
        erpImage = img.startsWith("http") ? img : `${ERP_URL}${img}`;
      }
      if (!fullName && empData.employee_name) fullName = empData.employee_name;
    }
  } catch {}

  const result = { email, fullName, department, designation, erpEmployeeId, erpImage };
  erpUserCache.set(deviceUsername.toLowerCase(), { data: result, ts: Date.now() });
  return result;
}

router.post("/activity/heartbeat", async (req, res) => {
  try {
    const { deviceUsername, email: legacyEmail, fullName: legacyFullName, department: legacyDept,
            activeApp, windowTitle, isActive, idleSeconds, deviceName } = req.body;

    // Require at least deviceUsername or legacy email
    const identifier = deviceUsername || legacyEmail;
    if (!identifier) return res.status(400).json({ error: "deviceUsername required" });

    // Resolve ERPNext employee details (auto or from legacy fields)
    let resolvedEmail = legacyEmail || "";
    let resolvedFullName = legacyFullName || "";
    let resolvedDept = legacyDept || "";
    let resolvedDesignation = "";
    let resolvedEmpId = "";
    let resolvedImage = "";

    if (deviceUsername) {
      try {
        const emp = await resolveErpEmployee(deviceUsername);
        resolvedEmail = emp.email || legacyEmail || "";
        resolvedFullName = emp.fullName || legacyFullName || deviceUsername;
        resolvedDept = emp.department || legacyDept || "";
        resolvedDesignation = emp.designation || "";
        resolvedEmpId = emp.erpEmployeeId || "";
        resolvedImage = emp.erpImage || "";
      } catch {}
    }

    // Fetch existing row to detect app/status changes for logging
    const existingRows = await db
      .select({ activeApp: systemActivityTable.activeApp, isActive: systemActivityTable.isActive })
      .from(systemActivityTable)
      .where(eq(systemActivityTable.deviceUsername, identifier))
      .limit(1);
    const existing = existingRows[0];

    const newApp = activeApp ?? "";
    const newIsActive = isActive !== false;
    const appChanged = !existing || existing.activeApp !== newApp;
    const statusChanged = !existing || existing.isActive !== newIsActive;

    // Fetch the existing ERP link — if already matched, never overwrite it
    const existingErpRows = await db
      .select({
        erpEmployeeId: systemActivityTable.erpEmployeeId,
        erpImage: systemActivityTable.erpImage,
        fullName: systemActivityTable.fullName,
        department: systemActivityTable.department,
        designation: systemActivityTable.designation,
      })
      .from(systemActivityTable)
      .where(eq(systemActivityTable.deviceUsername, identifier))
      .limit(1);
    const existingErp = existingErpRows[0];
    const alreadyLinked = !!(existingErp?.erpEmployeeId);

    // Debug log for troubleshooting ERP link persistence
    if (identifier.toUpperCase() === "IT" || alreadyLinked) {
      console.log(`[heartbeat] ${identifier} | alreadyLinked=${alreadyLinked} | existingErpId="${existingErp?.erpEmployeeId ?? ""}" | resolvedEmpId="${resolvedEmpId}"`);
    }

    // If already linked, keep the existing ERP data; otherwise use auto-resolved data
    const finalErpId    = alreadyLinked ? existingErp!.erpEmployeeId  : resolvedEmpId;
    const finalErpImage = alreadyLinked ? existingErp!.erpImage        : resolvedImage;
    const finalFullName = alreadyLinked ? existingErp!.fullName        : (resolvedFullName || deviceUsername);
    const finalDept     = alreadyLinked ? existingErp!.department      : resolvedDept;
    const finalDesig    = alreadyLinked ? existingErp!.designation     : resolvedDesignation;

    await db
      .insert(systemActivityTable)
      .values({
        deviceUsername: identifier,
        email: resolvedEmail,
        fullName: finalFullName,
        department: finalDept,
        designation: finalDesig,
        erpEmployeeId: finalErpId,
        erpImage: finalErpImage,
        activeApp: newApp,
        windowTitle: (windowTitle ?? "").substring(0, 300),
        isActive: newIsActive,
        idleSeconds: idleSeconds ?? 0,
        deviceName: deviceName ?? "",
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: systemActivityTable.deviceUsername,
        set: {
          email: resolvedEmail,
          // Use SQL CASE to atomically preserve ERP fields if already linked,
          // avoiding a race condition where a concurrent erp-override could be overwritten
          // by a stale alreadyLinked flag read earlier in this request.
          fullName: sql`CASE WHEN system_activity.erp_employee_id != '' THEN system_activity.full_name ELSE ${finalFullName} END`,
          department: sql`CASE WHEN system_activity.erp_employee_id != '' THEN system_activity.department ELSE ${finalDept} END`,
          designation: sql`CASE WHEN system_activity.erp_employee_id != '' THEN system_activity.designation ELSE ${finalDesig} END`,
          erpEmployeeId: sql`CASE WHEN system_activity.erp_employee_id != '' THEN system_activity.erp_employee_id ELSE ${finalErpId} END`,
          erpImage: sql`CASE WHEN system_activity.erp_employee_id != '' THEN system_activity.erp_image ELSE ${finalErpImage} END`,
          activeApp: newApp,
          windowTitle: (windowTitle ?? "").substring(0, 300),
          isActive: newIsActive,
          idleSeconds: idleSeconds ?? 0,
          deviceName: deviceName ?? "",
          lastSeen: new Date(),
        },
      });

    // Log to activity_log when app or idle/active status changes
    if (appChanged || statusChanged) {
      await pool.query(
        `INSERT INTO activity_log (device_username, active_app, window_title, is_active, idle_seconds)
         VALUES ($1, $2, $3, $4, $5)`,
        [identifier, newApp, (windowTitle ?? "").substring(0, 300), newIsActive, idleSeconds ?? 0]
      );
      // Trim old logs — keep last 200 per device
      await pool.query(
        `DELETE FROM activity_log WHERE device_username = $1 AND id NOT IN (
           SELECT id FROM activity_log WHERE device_username = $1 ORDER BY logged_at DESC LIMIT 200
         )`,
        [identifier]
      );
    }

    res.json({ ok: true, resolvedName: resolvedFullName, resolvedDept, resolvedDesignation });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/activity/live", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(systemActivityTable)
      .orderBy(desc(systemActivityTable.lastSeen));

    const timesResult = await pool.query(
      `SELECT device_username,
              MIN(logged_at) AS system_login,
              MAX(logged_at) AS system_logout
       FROM activity_log
       WHERE logged_at::date = $1::date
       GROUP BY device_username`,
      [date]
    );
    // activity_log.logged_at is TIMESTAMP WITHOUT TIME ZONE storing IST values.
    // The pg driver reads these as UTC Date objects, so getUTC* methods return the actual IST time.
    function pgLocalTsToHHmm(d: Date | string | null): string | null {
      if (d == null) return null;
      if (typeof d === "string") {
        // e.g. "2024-04-07 10:31:00" or "10:31:00"
        const parts = d.includes(" ") ? d.split(" ")[1] : d;
        return parts?.slice(0, 5) ?? null;
      }
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    const timesMap: Record<string, { login: string | null; logout: string | null }> = {};
    for (const r of timesResult.rows) {
      timesMap[r.device_username] = {
        login:  pgLocalTsToHHmm(r.system_login),
        logout: pgLocalTsToHHmm(r.system_logout),
      };
    }

    res.json(rows.map(r => ({
      ...r,
      lastSeen: r.lastSeen?.toISOString?.() ?? r.lastSeen,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      systemLoginToday:  timesMap[r.deviceUsername]?.login  ?? null,
      systemLogoutToday: timesMap[r.deviceUsername]?.logout ?? null,
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/activity/checkins-today", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const checkins = await fetchErpNextCheckins({ from_date: date, to_date: date });
    console.log(`[checkins-today] date=${date} records=${checkins.length} sample=`, JSON.stringify(checkins.slice(0, 3)));
    // Extract HH:mm from ERPNext time strings (stored as IST, e.g. "2024-04-07 10:31:00")
    function erpTimeToHHmm(t: string | null | undefined): string | null {
      if (!t) return null;
      const timePart = t.includes(" ") ? t.split(" ")[1] : t;
      return timePart?.slice(0, 5) ?? null;
    }
    // Records arrive oldest-first (time asc) — first punch (any log type) = morning check-in
    const map: Record<string, { checkIn?: string; checkOut?: string }> = {};
    for (const c of checkins) {
      const emp = c.employee || "";
      if (!map[emp]) map[emp] = {};
      // First punch of the day is the check-in regardless of log_type
      if (!map[emp].checkIn) {
        map[emp].checkIn = erpTimeToHHmm(c.time) ?? undefined;
      }
    }
    res.json(map);
  } catch (e) {
    console.log("[checkins-today] error:", e);
    res.json({});
  }
});

// Activity history for a specific device
router.get("/activity/:deviceUsername/history", async (req, res) => {
  try {
    const { deviceUsername } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT id, active_app, window_title, is_active, idle_seconds, logged_at
       FROM activity_log
       WHERE device_username = $1 AND logged_at::date = $2::date
       ORDER BY logged_at DESC
       LIMIT 200`,
      [deviceUsername, date]
    );
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      activeApp: r.active_app,
      windowTitle: r.window_title,
      isActive: r.is_active,
      idleSeconds: r.idle_seconds,
      loggedAt: r.logged_at,
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Manually override the ERPNext username for a device (when auto-detection fails)
router.patch("/activity/:deviceUsername/erp-override", async (req, res) => {
  try {
    const { deviceUsername } = req.params;
    const { erpUsername } = req.body;
    if (!erpUsername) return res.status(400).json({ error: "erpUsername required" });

    // Clear the cache so we re-resolve with the new username
    erpUserCache.delete(deviceUsername.toLowerCase());
    erpUserCache.delete(erpUsername.toLowerCase());

    // Resolve using the provided ERPNext username
    const emp = await resolveErpEmployee(erpUsername);

    // Always store a non-empty erpEmployeeId so the heartbeat's alreadyLinked check
    // stays true even if ERP is unreachable at the moment of saving.
    // Fall back to the user-provided username so the lock is never erased.
    const effectiveErpId = emp.erpEmployeeId || erpUsername;

    // Update the record
    await db
      .update(systemActivityTable)
      .set({
        email: emp.email || "",
        fullName: emp.fullName || erpUsername,
        department: emp.department || "",
        designation: emp.designation || "",
        erpEmployeeId: effectiveErpId,
        erpImage: emp.erpImage || "",
      })
      .where(eq(systemActivityTable.deviceUsername, deviceUsername));

    console.log(`[erp-override] Locked ${deviceUsername} → ${effectiveErpId} (resolved: ${emp.erpEmployeeId || "none"})`);

    res.json({
      ok: true,
      resolvedName: emp.fullName,
      resolvedDept: emp.department,
      resolvedDesignation: emp.designation,
      erpEmployeeId: effectiveErpId,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Employee cost info — fetches latest salary slip from ERPNext
router.get("/activity/:deviceUsername/cost-info", async (req, res) => {
  try {
    const { deviceUsername } = req.params;

    // Get the ERP employee ID from the live activity record
    const rows = await db
      .select({ erpEmployeeId: systemActivityTable.erpEmployeeId, fullName: systemActivityTable.fullName })
      .from(systemActivityTable)
      .where(eq(systemActivityTable.deviceUsername, deviceUsername))
      .limit(1);

    const erpId = rows[0]?.erpEmployeeId;
    if (!erpId) return res.json({ available: false, reason: "No ERP employee linked" });

    const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
    const API_KEY = process.env.ERPNEXT_API_KEY || "";
    const API_SECRET = process.env.ERPNEXT_API_SECRET || "";
    const hdr: Record<string, string> = { Accept: "application/json", Authorization: `token ${API_KEY}:${API_SECRET}` };

    // Fetch latest submitted salary slip for this employee
    const params = new URLSearchParams({
      filters: JSON.stringify([["employee", "=", erpId], ["docstatus", "=", 1]]),
      fields: JSON.stringify(["gross_pay", "net_pay", "total_deduction", "posting_date", "start_date", "end_date", "employee", "employee_name"]),
      limit_page_length: "1",
      order_by: "posting_date desc",
    });

    let monthlySalary: number | null = null;
    let monthlyNet: number | null = null;
    let slipDate: string | null = null;
    let salarySource: string = "salary_slip";

    try {
      const r = await fetch(`${ERP_URL}/api/resource/Salary%20Slip?${params}`, { headers: hdr });
      const data = (await r.json()) as any;
      console.log(`[cost-info] Salary Slip query for ${erpId}: status=${r.status}, count=${data?.data?.length ?? "?"}`);
      if (r.ok) {
        const slip = data?.data?.[0];
        if (slip) {
          monthlySalary = Number(slip.gross_pay) || null;
          monthlyNet = Number(slip.net_pay) || null;
          slipDate = slip.posting_date || null;
        }
      } else {
        console.log(`[cost-info] Salary Slip error:`, JSON.stringify(data).slice(0, 300));
      }
    } catch (e) { console.log("[cost-info] Salary Slip fetch error:", e); }

    // Fallback: try Salary Structure Assignment if no salary slip found
    if (!monthlySalary) {
      try {
        // SSAs can be docstatus=0 (saved) or 1 (submitted) — try without docstatus filter
        const saParams = new URLSearchParams({
          filters: JSON.stringify([["employee", "=", erpId]]),
          fields: JSON.stringify(["base", "from_date", "salary_structure", "docstatus"]),
          limit_page_length: "1",
          order_by: "from_date desc",
        });
        const saR = await fetch(`${ERP_URL}/api/resource/Salary%20Structure%20Assignment?${saParams}`, { headers: hdr });
        const saData = (await saR.json()) as any;
        console.log(`[cost-info] SSA query for ${erpId}: status=${saR.status}, count=${saData?.data?.length ?? "?"}, record=`, JSON.stringify(saData?.data?.[0]));
        if (saR.ok) {
          const sa = saData?.data?.[0];
          if (sa) {
            // SSA may return the name only (no base in list view) — fetch the full document
            if (!sa.base && sa.name) {
              try {
                const fullR = await fetch(`${ERP_URL}/api/resource/Salary%20Structure%20Assignment/${encodeURIComponent(sa.name)}`, { headers: hdr });
                const fullData = (await fullR.json()) as any;
                const fullDoc = fullData?.data;
                console.log(`[cost-info] SSA full doc for ${sa.name}:`, JSON.stringify(fullDoc?.base), fullDoc?.from_date);
                if (fullDoc?.base) {
                  monthlySalary = Number(fullDoc.base) || null;
                  slipDate = fullDoc.from_date || null;
                  salarySource = "salary_structure_assignment";
                }
              } catch {}
            } else if (sa.base) {
              monthlySalary = Number(sa.base) || null;
              slipDate = sa.from_date || null;
              salarySource = "salary_structure_assignment";
            }
          }
        }
      } catch (e) { console.log("[cost-info] SSA fetch error:", e); }
    }

    // Working days per month = 26, hours per day = 8
    const hourlyRate = monthlySalary ? Math.round((monthlySalary / (26 * 8)) * 100) / 100 : null;
    const dailyRate = monthlySalary ? Math.round((monthlySalary / 26) * 100) / 100 : null;
    const minuteRate = hourlyRate ? Math.round((hourlyRate / 60) * 100) / 100 : null;

    // Count active seconds from activity_log for the requested date
    const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN is_active THEN 30 ELSE 0 END), 0) AS active_secs,
              COALESCE(SUM(idle_seconds), 0) AS total_idle
       FROM activity_log
       WHERE device_username = $1 AND logged_at::date = $2::date`,
      [deviceUsername, dateParam]
    );
    const activeSecsToday: number = Number(todayResult.rows[0]?.active_secs) || 0;
    const idleSecsToday: number = Number(todayResult.rows[0]?.total_idle) || 0;
    const activeHoursToday = Math.round((activeSecsToday / 3600) * 100) / 100;
    const workingCostToday = hourlyRate ? Math.round(hourlyRate * activeHoursToday * 100) / 100 : null;
    const idleCostToday = hourlyRate ? Math.round(hourlyRate * (idleSecsToday / 3600) * 100) / 100 : null;

    const idleHoursToday = Math.round((idleSecsToday / 3600) * 100) / 100;

    res.json({
      available: true,
      erpEmployeeId: erpId,
      monthlySalary,
      monthlyNet,
      hourlyRate,
      dailyRate,
      minuteRate,
      slipDate,
      salarySource,
      activeHoursToday,
      idleHoursToday,
      workingCostToday,
      idleCostToday,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/activity/:deviceUsername", async (req, res) => {
  try {
    await db.delete(systemActivityTable).where(eq(systemActivityTable.deviceUsername, req.params.deviceUsername));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Public: Employee Agent Dashboard data (no auth required) ─────────────────
// Called by the browser page opened by the Python desktop agent.
// ?username=WTT1194  (Windows login username)
router.get("/emp-agent/data", async (req, res) => {
  try {
    const username = (req.query.username as string || "").trim();
    if (!username) return res.status(400).json({ error: "username param required" });

    // 1. Fetch live activity row for this device user
    const actRows = await db
      .select()
      .from(systemActivityTable)
      .where(eq(systemActivityTable.deviceUsername, username))
      .limit(1);
    const act = actRows[0] || null;

    const emailForLookup = act?.email || username;
    const nameForLookup  = act?.fullName || username;

    // 2. Fetch ERP profile (reuse internal endpoint via local HTTP)
    const port = process.env.PORT || 8080;
    let profile: Record<string, unknown> | null = null;
    try {
      const pr = await fetch(`http://localhost:${port}/api/auth/profile?email=${encodeURIComponent(emailForLookup)}`);
      if (pr.ok) profile = await pr.json();
    } catch {}

    // 3. Fetch FM tasks assigned to this employee
    const allTasks = await db.select().from(fmTasksTable).orderBy(desc(fmTasksTable.createdAt));
    const email  = emailForLookup.toLowerCase();
    const fName  = nameForLookup.toLowerCase().split(" ")[0];
    const myTasks = allTasks.filter(t =>
      (t.assigneeEmail && t.assigneeEmail.toLowerCase() === email) ||
      (t.assigneeName && (
        t.assigneeName.toLowerCase().includes(fName) ||
        fName.includes(t.assigneeName.toLowerCase().split(" ")[0])
      ))
    );

    // 4. Fetch notifications from in_app_notifications
    const notifRows = await db
      .select()
      .from(inAppNotificationsTable)
      .where(eq(inAppNotificationsTable.userEmail, email))
      .orderBy(desc(inAppNotificationsTable.createdAt))
      .limit(20);

    res.json({
      activity: act ? {
        ...act,
        lastSeen: act.lastSeen?.toISOString?.() ?? act.lastSeen,
        createdAt: act.createdAt?.toISOString?.() ?? act.createdAt,
      } : null,
      profile,
      tasks: myTasks,
      notifications: notifRows.map((n: any) => ({
        id: n.id, title: n.title, message: n.message, type: n.type,
        read: n.read, createdAt: n.createdAt?.toISOString?.() ?? n.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
