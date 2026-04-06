import { Router } from "express";
import nodemailer from "nodemailer";
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
} from "@workspace/db/schema";
import { eq, sql, desc, gt } from "drizzle-orm";

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
  fetchErpNextPurchaseOrders,
  fetchErpNextPurchaseOrder,
  fetchErpNextSuppliers,
  fetchErpNextTasks,
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
    let all = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
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

router.get("/design-3d", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const records = await fetchErpNextDesign3D(department);
    res.json(records);
  } catch (e) {
    console.error("Design 3D fetch error:", e);
    res.status(500).json({ error: String(e) });
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

// ─── User Management ─────────────────────────────────────────────────────────

router.get("/erpnext-users", async (_req, res) => {
  try {
    const users = await fetchErpNextUsers();
    res.json(users);
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
    const { fullName, hasAccess, modules, moduleRoles, roleType, allowedProjects, allowedDrawingDepts, twoFaEnabled, theme, navbarStyle } = req.body;
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
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/fm-tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, projectId, status, priority, assigneeEmail, assigneeName, dueDate, startDate, tags, isSelfAssigned, notes } = req.body;
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

    await db
      .insert(systemActivityTable)
      .values({
        deviceUsername: identifier,
        email: resolvedEmail,
        fullName: resolvedFullName,
        department: resolvedDept,
        designation: resolvedDesignation,
        erpEmployeeId: resolvedEmpId,
        erpImage: resolvedImage,
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
          fullName: resolvedFullName,
          department: resolvedDept,
          designation: resolvedDesignation,
          erpEmployeeId: resolvedEmpId,
          erpImage: resolvedImage,
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

router.get("/activity/live", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(systemActivityTable)
      .orderBy(desc(systemActivityTable.lastSeen));
    res.json(rows.map(r => ({
      ...r,
      lastSeen: r.lastSeen?.toISOString?.() ?? r.lastSeen,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Activity history for a specific device
router.get("/activity/:deviceUsername/history", async (req, res) => {
  try {
    const { deviceUsername } = req.params;
    const result = await pool.query(
      `SELECT id, active_app, window_title, is_active, idle_seconds, logged_at
       FROM activity_log
       WHERE device_username = $1
       ORDER BY logged_at DESC
       LIMIT 50`,
      [deviceUsername]
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

    // Update the record
    await db
      .update(systemActivityTable)
      .set({
        email: emp.email || "",
        fullName: emp.fullName || erpUsername,
        department: emp.department || "",
        designation: emp.designation || "",
        erpEmployeeId: emp.erpEmployeeId || "",
        erpImage: emp.erpImage || "",
      })
      .where(eq(systemActivityTable.deviceUsername, deviceUsername));

    res.json({
      ok: true,
      resolvedName: emp.fullName,
      resolvedDept: emp.department,
      resolvedDesignation: emp.designation,
      erpEmployeeId: emp.erpEmployeeId,
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

export default router;
