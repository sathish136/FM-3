import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import {
  fetchErpNextAttendance,
  fetchErpNextCheckins,
  createErpNextCheckin,
} from "../lib/erpnext";

export const mobileRouter = Router();

const AGENT_PWD_SALT = process.env.AGENT_PWD_SALT || "wtt-flowmatrix-agent-salt-2026";
const ERP_URL = process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_URL || "https://erp.wttint.com";
const API_KEY = process.env.ERPNEXT_API_KEY || "";
const API_SECRET = process.env.ERPNEXT_API_SECRET || "";

// ── DB setup ──────────────────────────────────────────────────────────────────
db.execute(sql`
  ALTER TABLE erp_agents ADD COLUMN IF NOT EXISTS mobile_token TEXT;

  CREATE TABLE IF NOT EXISTS mobile_plant_enquiries (
    id          TEXT PRIMARY KEY,
    agent_erp_name TEXT NOT NULL,
    form_data   JSONB NOT NULL,
    status      TEXT NOT NULL DEFAULT 'synced',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_hrms_users (
    id                SERIAL PRIMARY KEY,
    erp_employee_id   TEXT NOT NULL UNIQUE,
    employee_name     TEXT NOT NULL DEFAULT '',
    department        TEXT NOT NULL DEFAULT '',
    designation       TEXT NOT NULL DEFAULT '',
    login_id          TEXT NOT NULL UNIQUE,
    password_hash     TEXT,
    mobile_token      TEXT,
    employee_image_url TEXT,
    erp_session       TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE mobile_hrms_users ADD COLUMN IF NOT EXISTS employee_image_url TEXT;
  ALTER TABLE mobile_hrms_users ADD COLUMN IF NOT EXISTS erp_session TEXT;

  CREATE TABLE IF NOT EXISTS mobile_attendance_logs (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    log_type        TEXT NOT NULL,
    erp_checkin_ref TEXT,
    photo_base64    TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    location_name   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_leave_applications (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    leave_type      TEXT NOT NULL,
    from_date       TEXT NOT NULL,
    to_date         TEXT NOT NULL,
    half_day        BOOLEAN NOT NULL DEFAULT false,
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'Pending',
    erp_ref         TEXT,
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_expense_claims (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    expense_type    TEXT NOT NULL,
    claim_date      TEXT NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'Pending',
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_onduty_requests (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    from_date       TEXT NOT NULL,
    to_date         TEXT NOT NULL,
    purpose         TEXT NOT NULL,
    location        TEXT,
    status          TEXT NOT NULL DEFAULT 'Pending',
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_ticket_requests (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    travel_mode     TEXT NOT NULL DEFAULT 'Flight',
    travel_date     TEXT NOT NULL,
    from_location   TEXT NOT NULL,
    to_location     TEXT NOT NULL,
    purpose         TEXT,
    status          TEXT NOT NULL DEFAULT 'Pending',
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_site_tickets (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    site_name       TEXT NOT NULL,
    issue_type      TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'Medium',
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Open',
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_grievances (
    id              SERIAL PRIMARY KEY,
    erp_employee_id TEXT NOT NULL,
    category        TEXT NOT NULL,
    description     TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'Medium',
    is_anonymous    BOOLEAN NOT NULL DEFAULT false,
    status          TEXT NOT NULL DEFAULT 'Open',
    summary         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_announcements (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info',
    priority    INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_by  TEXT,
    valid_until TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mobile_work_sessions (
    id                 SERIAL PRIMARY KEY,
    erp_employee_id    TEXT NOT NULL,
    employee_name      TEXT NOT NULL DEFAULT '',
    work_date          TEXT NOT NULL,
    check_in_time      TIMESTAMP,
    check_out_time     TIMESTAMP,
    duration_minutes   INTEGER,
    check_in_location  TEXT,
    check_out_location TEXT,
    check_in_lat       DOUBLE PRECISION,
    check_in_lng       DOUBLE PRECISION,
    check_out_lat      DOUBLE PRECISION,
    check_out_lng      DOUBLE PRECISION,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
  );

  ALTER TABLE mobile_hrms_users ADD COLUMN IF NOT EXISTS date_of_joining TEXT;
  ALTER TABLE mobile_hrms_users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;

  CREATE TABLE IF NOT EXISTS mobile_employee_locations (
    erp_employee_id TEXT PRIMARY KEY,
    employee_name   TEXT NOT NULL DEFAULT '',
    department      TEXT,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    location_name   TEXT,
    accuracy        DOUBLE PRECISION,
    is_checked_in   BOOLEAN NOT NULL DEFAULT false,
    last_seen       TIMESTAMP NOT NULL DEFAULT NOW()
  );
`).catch(console.error);

// ── Helper: fetch employee profile image URL from ERPNext ─────────────────────
async function fetchEmployeeImageUrl(erpEmployeeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${ERP_URL}/api/resource/Employee/${encodeURIComponent(erpEmployeeId)}?fields=["image"]`,
      { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const img = data.data?.image;
    if (!img) return null;
    return img.startsWith("http") ? img : `${ERP_URL}${img}`;
  } catch { return null; }
}

// ── Shared auth helpers ───────────────────────────────────────────────────────
async function agentAuth(req: any, res: any, next: any) {
  const token = (req.headers["x-agent-token"] as string) || "";
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const rows = await db.execute(sql`
      SELECT erp_name, agent_name, agent_login_id
      FROM erp_agents WHERE mobile_token = ${token}
    `);
    if (!rows.rows.length) return res.status(401).json({ error: "Invalid or expired token" });
    req.agent = rows.rows[0];
    next();
  } catch {
    res.status(500).json({ error: "Auth error" });
  }
}

async function hrmsAuth(req: any, res: any, next: any) {
  const token = (req.headers["x-agent-token"] as string) || "";
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const rows = await db.execute(sql`
      SELECT id, erp_employee_id, employee_name, department, designation, login_id, erp_session
      FROM mobile_hrms_users WHERE mobile_token = ${token}
    `);
    if (!rows.rows.length) return res.status(401).json({ error: "Invalid or expired token" });
    req.hrmsUser = rows.rows[0];
    next();
  } catch {
    res.status(500).json({ error: "Auth error" });
  }
}

// Extract cookie string + CSRF token from Set-Cookie response headers
function extractErpSession(headers: Headers): string | null {
  // Frappe sends multiple Set-Cookie headers; node-fetch merges them with ", "
  const raw = headers.get("set-cookie") || "";
  if (!raw) return null;
  // Split on comma only when followed by a cookie name (not a date like "Mon, 01 Jan")
  const parts = raw.split(/,\s*(?=[a-zA-Z_]+=)/);
  const cookieMap: Record<string, string> = {};
  for (const part of parts) {
    const seg = part.split(";")[0].trim();
    const eqIdx = seg.indexOf("=");
    if (eqIdx > 0) {
      const k = seg.slice(0, eqIdx).trim();
      const v = seg.slice(eqIdx + 1).trim();
      cookieMap[k] = v;
    }
  }
  const sid = cookieMap["sid"];
  if (!sid || sid === "Guest") return null;
  // Build cookie string including csrf_token so POST requests can use it
  const pieces = [`sid=${sid}`];
  if (cookieMap["user_id"])    pieces.push(`user_id=${cookieMap["user_id"]}`);
  if (cookieMap["csrf_token"]) pieces.push(`csrf_token=${cookieMap["csrf_token"]}`);
  // Encode CSRF separately for use in X-Frappe-CSRF-Token header
  (pieces as any)._csrf = cookieMap["csrf_token"] ?? "";
  return pieces.join("; ");
}

function getCsrfFromSession(session: string | null | undefined): string {
  if (!session) return "";
  const m = session.match(/csrf_token=([^;]+)/);
  return m ? m[1] : "";
}

// ── POST /api/mobile/login ────────────────────────────────────────────────────
// Checks CRM agents first, then HRMS employees
mobileRouter.post("/mobile/login", async (req, res) => {
  const { login_id, password } = req.body as { login_id: string; password: string };
  if (!login_id?.trim() || !password) {
    return res.status(400).json({ error: "login_id and password are required" });
  }
  const hash = createHash("sha256").update(password + AGENT_PWD_SALT).digest("hex");

  // 1. Try CRM agent
  try {
    const rows = await db.execute(sql`
      SELECT erp_name, agent_name, agent_login_id, agent_password_hash, lead_ids
      FROM erp_agents
      WHERE LOWER(agent_login_id) = LOWER(${login_id.trim()})
        AND agent_password_hash IS NOT NULL
    `);
    if (rows.rows.length) {
      const agent = rows.rows[0] as any;
      if (agent.agent_password_hash !== hash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = randomBytes(32).toString("hex");
      await db.execute(sql`UPDATE erp_agents SET mobile_token = ${token} WHERE erp_name = ${agent.erp_name}`);
      let leadIds: string[] = [];
      try { leadIds = JSON.parse(agent.lead_ids || "[]"); } catch {}
      return res.json({
        token,
        role: "crm_agent",
        erp_name: String(agent.erp_name),
        agent_name: String(agent.agent_name || agent.erp_name),
        agent_login_id: String(agent.agent_login_id),
        lead_ids: leadIds,
      });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }

  // 2. Try HRMS employee
  try {
    const rows = await db.execute(sql`
      SELECT id, erp_employee_id, employee_name, department, designation, login_id, password_hash
      FROM mobile_hrms_users
      WHERE LOWER(login_id) = LOWER(${login_id.trim()})
        AND password_hash IS NOT NULL
    `);
    if (rows.rows.length) {
      const emp = rows.rows[0] as any;
      if (emp.password_hash !== hash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = randomBytes(32).toString("hex");
      await db.execute(sql`UPDATE mobile_hrms_users SET mobile_token = ${token} WHERE id = ${emp.id}`);
      const imageUrl = await fetchEmployeeImageUrl(String(emp.erp_employee_id));
      return res.json({
        token,
        role: "hrms_employee",
        erp_employee_id: String(emp.erp_employee_id),
        employee_name: String(emp.employee_name),
        department: String(emp.department),
        designation: String(emp.designation),
        login_id: String(emp.login_id),
        employee_image_url: imageUrl,
        lead_ids: [],
      });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }

  // 3. Try ERPNext direct login (employees using their ERP email or username/employee-code)
  try {
    const erpLogin = await fetch(`${ERP_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ usr: login_id.trim(), pwd: password }),
    });
    if (erpLogin.ok) {
      // Resolve the actual email: if login_id has no @, look up User by username field
      let userEmail = login_id.trim();
      if (!userEmail.includes("@")) {
        const userRes = await fetch(
          `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(JSON.stringify([["username","=",userEmail]]))}&fields=${encodeURIComponent(JSON.stringify(["name","username"]))}`,
          { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          const erpUser = (userData.data || [])[0] as any;
          if (erpUser?.name) userEmail = erpUser.name; // name is the email in ERPNext
        }
      }

      // Get employee linked to this ERPNext user email
      const empRes = await fetch(
        `${ERP_URL}/api/resource/Employee?filters=${encodeURIComponent(JSON.stringify([["user_id","=",userEmail]]))}&fields=${encodeURIComponent(JSON.stringify(["name","employee_name","department","designation"]))}`,
        { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } }
      );
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      const erpEmp = (empData.data || [])[0] as any;

      if (erpEmp) {
        // Check if registered in mobile_hrms_users
        const hrmsRows = await db.execute(sql`
          SELECT id, erp_employee_id, employee_name, department, designation, login_id
          FROM mobile_hrms_users WHERE erp_employee_id = ${erpEmp.name}
        `);
        const erpSession = extractErpSession(erpLogin.headers);
        if (hrmsRows.rows.length) {
          const emp = hrmsRows.rows[0] as any;
          const token = randomBytes(32).toString("hex");
          await db.execute(sql`
            UPDATE mobile_hrms_users
            SET mobile_token = ${token}, erp_session = ${erpSession}, updated_at = NOW()
            WHERE id = ${emp.id}`);
          const imageUrl2 = await fetchEmployeeImageUrl(String(emp.erp_employee_id));
          return res.json({
            token,
            role: "hrms_employee",
            erp_employee_id: String(emp.erp_employee_id),
            employee_name: String(emp.employee_name || erpEmp.employee_name),
            department: String(emp.department || erpEmp.department || ""),
            designation: String(emp.designation || erpEmp.designation || ""),
            login_id: String(emp.login_id),
            employee_image_url: imageUrl2,
            lead_ids: [],
          });
        }
        // Not registered as HRMS user — auto-register and log in
        const token = randomBytes(32).toString("hex");
        const loginIdClean = login_id.trim().split("@")[0];
        const imageUrl3 = await fetchEmployeeImageUrl(String(erpEmp.name));
        await db.execute(sql`
          INSERT INTO mobile_hrms_users
            (erp_employee_id, employee_name, department, designation, login_id, mobile_token, employee_image_url, erp_session)
          VALUES
            (${erpEmp.name}, ${erpEmp.employee_name || ""}, ${erpEmp.department || ""},
             ${erpEmp.designation || ""}, ${loginIdClean}, ${token}, ${imageUrl3}, ${erpSession})
          ON CONFLICT (erp_employee_id) DO UPDATE SET
            mobile_token = ${token}, employee_image_url = ${imageUrl3},
            erp_session  = ${erpSession}, updated_at = NOW()
        `);
        return res.json({
          token,
          role: "hrms_employee",
          erp_employee_id: String(erpEmp.name),
          employee_name: String(erpEmp.employee_name || ""),
          department: String(erpEmp.department || ""),
          designation: String(erpEmp.designation || ""),
          login_id: loginIdClean,
          employee_image_url: imageUrl3,
          lead_ids: [],
        });
      }
    }
  } catch {
    // ERPNext auth attempt failed — fall through to final 401
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

// ── Admin: manage HRMS users ──────────────────────────────────────────────────
mobileRouter.get("/mobile/hrms-users", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, erp_employee_id, employee_name, department, designation, login_id,
             (password_hash IS NOT NULL) AS has_password
      FROM mobile_hrms_users ORDER BY employee_name
    `);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms-users", async (req, res) => {
  const { erp_employee_id, employee_name, department, designation, login_id, password } = req.body as any;
  if (!erp_employee_id || !login_id || !password) {
    return res.status(400).json({ error: "erp_employee_id, login_id and password are required" });
  }
  const hash = createHash("sha256").update(password + AGENT_PWD_SALT).digest("hex");
  try {
    await db.execute(sql`
      INSERT INTO mobile_hrms_users (erp_employee_id, employee_name, department, designation, login_id, password_hash)
      VALUES (${erp_employee_id}, ${employee_name || ''}, ${department || ''}, ${designation || ''}, ${login_id}, ${hash})
      ON CONFLICT (erp_employee_id) DO UPDATE SET
        employee_name = EXCLUDED.employee_name,
        department    = EXCLUDED.department,
        designation   = EXCLUDED.designation,
        login_id      = EXCLUDED.login_id,
        password_hash = EXCLUDED.password_hash,
        updated_at    = NOW()
    `);
    res.json({ ok: true });
  } catch (e: any) {
    if (String(e).includes("unique")) return res.status(409).json({ error: "Login ID already taken" });
    res.status(500).json({ error: String(e) });
  }
});

mobileRouter.delete("/mobile/hrms-users/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM mobile_hrms_users WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── CRM agent routes ─────────────────────────────────────────────────────────

// GET /api/mobile/leads
mobileRouter.get("/mobile/leads", agentAuth, async (req: any, res) => {
  try {
    const agentRow = await db.execute(sql`
      SELECT lead_ids FROM erp_agents WHERE erp_name = ${req.agent.erp_name}
    `);
    let leadIds: string[] = [];
    try { leadIds = JSON.parse((agentRow.rows[0] as any)?.lead_ids || "[]"); } catch {}
    if (!leadIds.length) return res.json({ data: [] });

    const filters = JSON.stringify([["name", "in", leadIds]]);
    const fields = JSON.stringify([
      "name", "company_name", "lead_name", "country",
      "state", "city", "lead_status", "mobile_no", "email_id",
      "source", "industry", "modified",
    ]);
    const url = `${ERP_URL}/api/resource/Lead?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit=200`;
    const r = await fetch(url, { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } });
    if (!r.ok) return res.json({ data: [] });
    const d = await r.json();
    res.json({ data: d.data || [] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/mobile/lead/:name
mobileRouter.get("/mobile/lead/:name", agentAuth, async (req: any, res) => {
  try {
    const r = await fetch(`${ERP_URL}/api/resource/Lead/${encodeURIComponent(req.params.name)}`, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!r.ok) return res.status(404).json({ error: "Lead not found" });
    const d = await r.json();
    res.json(d.data || {});
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/mobile/lead/:name/followups
mobileRouter.get("/mobile/lead/:name/followups", agentAuth, async (req: any, res) => {
  try {
    const filters = JSON.stringify([["lead", "=", req.params.name]]);
    const fields = JSON.stringify(["name", "date", "description", "follow_up_type", "next_follow_up", "creation"]);
    const r = await fetch(
      `${ERP_URL}/api/resource/Lead Follow Up?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&order_by=date desc&limit=50`,
      { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } }
    );
    if (!r.ok) return res.json({ data: [] });
    const d = await r.json();
    res.json({ data: d.data || [] });
  } catch {
    res.json({ data: [] });
  }
});

// POST /api/mobile/plant-enquiry
mobileRouter.post("/mobile/plant-enquiry", agentAuth, async (req: any, res) => {
  const { id, form_data } = req.body;
  if (!id || !form_data) return res.status(400).json({ error: "id and form_data required" });
  try {
    await db.execute(sql`
      INSERT INTO mobile_plant_enquiries (id, agent_erp_name, form_data, status, updated_at)
      VALUES (${id}, ${req.agent.erp_name}, ${JSON.stringify(form_data)}, 'synced', NOW())
      ON CONFLICT (id) DO UPDATE SET
        form_data  = EXCLUDED.form_data,
        status     = 'synced',
        updated_at = NOW()
    `);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/mobile/plant-enquiries
mobileRouter.get("/mobile/plant-enquiries", agentAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, form_data, status, created_at
      FROM mobile_plant_enquiries
      WHERE agent_erp_name = ${req.agent.erp_name}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ data: rows.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── HRMS employee routes ──────────────────────────────────────────────────────

// GET /api/mobile/hrms/me
mobileRouter.get("/mobile/hrms/me", hrmsAuth, async (req: any, res) => {
  res.json(req.hrmsUser);
});

// GET /api/mobile/hrms/profile — DOJ, DOB and full profile from ERPNext
mobileRouter.get("/mobile/hrms/profile", hrmsAuth, async (req: any, res) => {
  try {
    const empId = req.hrmsUser.erp_employee_id;
    const fields = JSON.stringify([
      "name", "employee_name", "date_of_joining", "date_of_birth",
      "department", "designation", "cell_number", "image",
    ]);
    const r = await fetch(
      `${ERP_URL}/api/resource/Employee/${encodeURIComponent(empId)}?fields=${encodeURIComponent(fields)}`,
      { headers: erpAuthHeaders(req.hrmsUser.erp_session) }
    );
    if (r.ok) {
      const d = await r.json();
      const emp = d.data || {};
      // cache DOJ/DOB in local DB
      if (emp.date_of_joining || emp.date_of_birth) {
        await db.execute(sql`
          UPDATE mobile_hrms_users
          SET date_of_joining = ${emp.date_of_joining ?? null},
              date_of_birth   = ${emp.date_of_birth ?? null}
          WHERE erp_employee_id = ${empId}
        `).catch(() => {});
      }
      return res.json(emp);
    }
    // Fallback: return from local DB cache
    const rows = await db.execute(sql`
      SELECT erp_employee_id AS name, employee_name, department, designation,
             date_of_joining, date_of_birth
      FROM mobile_hrms_users WHERE erp_employee_id = ${empId}
    `);
    res.json(rows.rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/mobile/hrms/attendance  — last 30 days
mobileRouter.get("/mobile/hrms/attendance", hrmsAuth, async (req: any, res) => {
  try {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const from_date = from.toISOString().split("T")[0];
    const to_date = new Date().toISOString().split("T")[0];
    const records = await fetchErpNextAttendance({
      employee: req.hrmsUser.erp_employee_id,
      from_date,
      to_date,
      limit: 60,
    });
    res.json({ data: records });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/mobile/hrms/checkins  — today
mobileRouter.get("/mobile/hrms/checkins", hrmsAuth, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const checkins = await fetchErpNextCheckins({
      employee: req.hrmsUser.erp_employee_id,
      from_date: today,
      to_date: today,
    });
    res.json({ data: checkins });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/mobile/hrms/checkin
mobileRouter.post("/mobile/hrms/checkin", hrmsAuth, async (req: any, res) => {
  const { log_type, photo_base64, latitude, longitude, location_name } =
    req.body as {
      log_type: "IN" | "OUT";
      photo_base64?: string;
      latitude?: number;
      longitude?: number;
      location_name?: string;
    };
  if (!log_type || !["IN", "OUT"].includes(log_type)) {
    return res.status(400).json({ error: "log_type must be IN or OUT" });
  }
  try {
    const time = new Date().toISOString().replace("T", " ").split(".")[0];
    const result = await createErpNextCheckin({
      employee: req.hrmsUser.erp_employee_id,
      time,
      log_type,
      device_id: "FlowMatriX Mobile",
    });
    // Store photo + GPS log
    await db.execute(sql`
      INSERT INTO mobile_attendance_logs
        (erp_employee_id, log_type, erp_checkin_ref, photo_base64, latitude, longitude, location_name)
      VALUES
        (${req.hrmsUser.erp_employee_id}, ${log_type}, ${result?.name ?? null},
         ${photo_base64 ?? null}, ${latitude ?? null}, ${longitude ?? null}, ${location_name ?? null})
    `);
    // Track work sessions (IN opens, OUT closes + calculates duration)
    try {
      const today = new Date().toISOString().split("T")[0];
      const empName = req.hrmsUser.employee_name ?? "";
      if (log_type === "IN") {
        await db.execute(sql`
          INSERT INTO mobile_work_sessions
            (erp_employee_id, employee_name, work_date, check_in_time, check_in_location, check_in_lat, check_in_lng)
          VALUES
            (${req.hrmsUser.erp_employee_id}, ${empName}, ${today},
             NOW(), ${location_name ?? null}, ${latitude ?? null}, ${longitude ?? null})
        `);
      } else {
        const sess = await db.execute(sql`
          SELECT id, check_in_time FROM mobile_work_sessions
          WHERE erp_employee_id = ${req.hrmsUser.erp_employee_id}
            AND work_date = ${today}
            AND check_out_time IS NULL
          ORDER BY check_in_time DESC LIMIT 1
        `);
        if (sess.rows.length) {
          const s = sess.rows[0] as any;
          const mins = Math.round((Date.now() - new Date(s.check_in_time).getTime()) / 60000);
          await db.execute(sql`
            UPDATE mobile_work_sessions
            SET check_out_time     = NOW(),
                duration_minutes   = ${mins},
                check_out_location = ${location_name ?? null},
                check_out_lat      = ${latitude ?? null},
                check_out_lng      = ${longitude ?? null}
            WHERE id = ${s.id}
          `);
        }
      }
    } catch {}
    // Upsert live location when coordinates provided
    if (latitude != null && longitude != null) {
      try {
        await db.execute(sql`
          INSERT INTO mobile_employee_locations
            (erp_employee_id, employee_name, department, latitude, longitude, location_name, is_checked_in, last_seen)
          VALUES
            (${req.hrmsUser.erp_employee_id}, ${req.hrmsUser.employee_name ?? ''},
             ${req.hrmsUser.department ?? null},
             ${latitude}, ${longitude}, ${location_name ?? null},
             ${log_type === 'IN'}, NOW())
          ON CONFLICT (erp_employee_id) DO UPDATE SET
            latitude      = EXCLUDED.latitude,
            longitude     = EXCLUDED.longitude,
            location_name = EXCLUDED.location_name,
            employee_name = EXCLUDED.employee_name,
            department    = EXCLUDED.department,
            is_checked_in = EXCLUDED.is_checked_in,
            last_seen     = NOW()
        `);
      } catch {}
    }
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Live location ping (mobile → server) ─────────────────────────────────────
mobileRouter.post("/mobile/hrms/location", hrmsAuth, async (req: any, res) => {
  const { latitude, longitude, location_name, accuracy } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: "latitude and longitude required" });
  }
  try {
    // Determine if currently checked in
    const today = new Date().toISOString().split("T")[0];
    const sess = await db.execute(sql`
      SELECT 1 FROM mobile_work_sessions
      WHERE erp_employee_id = ${req.hrmsUser.erp_employee_id}
        AND work_date = ${today}
        AND check_out_time IS NULL LIMIT 1
    `);
    const isCheckedIn = sess.rows.length > 0;
    await db.execute(sql`
      INSERT INTO mobile_employee_locations
        (erp_employee_id, employee_name, department, latitude, longitude, location_name, accuracy, is_checked_in, last_seen)
      VALUES
        (${req.hrmsUser.erp_employee_id}, ${req.hrmsUser.employee_name ?? ''},
         ${req.hrmsUser.department ?? null},
         ${latitude}, ${longitude}, ${location_name ?? null}, ${accuracy ?? null},
         ${isCheckedIn}, NOW())
      ON CONFLICT (erp_employee_id) DO UPDATE SET
        latitude      = EXCLUDED.latitude,
        longitude     = EXCLUDED.longitude,
        location_name = EXCLUDED.location_name,
        employee_name = EXCLUDED.employee_name,
        department    = EXCLUDED.department,
        accuracy      = EXCLUDED.accuracy,
        is_checked_in = EXCLUDED.is_checked_in,
        last_seen     = NOW()
    `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── HRMS Dashboard ─────────────────────────────────────────────────────────
mobileRouter.get("/mobile/hrms/dashboard", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 8) + "01";

    // today's checkins
    let todayCheckins: any[] = [];
    try {
      todayCheckins = await fetchErpNextCheckins({ employee: emp, from_date: today, to_date: today });
    } catch {}

    // month checkins for present count
    let monthCheckins: any[] = [];
    try {
      monthCheckins = await fetchErpNextCheckins({ employee: emp, from_date: monthStart, to_date: today, limit: 200 });
    } catch {}

    const presentDays = new Set(monthCheckins.filter(c => c.log_type === "IN").map(c => c.time.split(" ")[0])).size;
    const daysElapsed = new Date().getDate();
    const monthAbsent = Math.max(0, daysElapsed - presentDays);

    // pending requests count — use employee's ERP session if available
    const sessionForEmp = (req as any).hrmsUser?.erp_session ?? null;
    async function countErpPending(doctype: string): Promise<number> {
      try {
        const filters = JSON.stringify([["employee", "=", emp], ["status", "in", ["Open", "Pending", "Draft"]]]);
        const params  = new URLSearchParams({ filters, fields: JSON.stringify(["name"]), limit_page_length: "500" });
        const hdrs: Record<string, string> = sessionForEmp
          ? { Cookie: sessionForEmp }
          : { Authorization: `token ${API_KEY}:${API_SECRET}` };
        const r = await fetch(`${ERP_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`, { headers: hdrs });
        if (r.ok) { const j = await r.json(); return (j.data ?? []).length; }
      } catch {}
      return 0;
    }

    const [pendingLeaves, pendingClaims, pendingOnduty] = await Promise.all([
      countErpPending("Leave Request"),
      countErpPending("Claim Request"),
      countErpPending("On Duty Request"),
    ]);

    const lastIn = todayCheckins.filter(c => c.log_type === "IN").pop();

    res.json({
      today_checked_in:  todayCheckins.some(c => c.log_type === "IN"),
      last_checkin_time: lastIn?.time ?? null,
      month_present:     presentDays,
      month_absent:      monthAbsent,
      pending_leaves:    pendingLeaves,
      pending_claims:    pendingClaims,
      pending_onduty:    pendingOnduty,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── ERPNext helpers for HRMS modules ──────────────────────────────────────────
function erpAuthHeaders(session?: string | null, isPost = false): Record<string, string> {
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (session) {
    base["Cookie"] = session;
    if (isPost) {
      const csrf = getCsrfFromSession(session);
      if (csrf) base["X-Frappe-CSRF-Token"] = csrf;
    }
    return base;
  }
  base["Authorization"] = `token ${API_KEY}:${API_SECRET}`;
  return base;
}

async function erpPost(doctype: string, data: Record<string, any>, session?: string | null): Promise<any> {
  const headers = erpAuthHeaders(session, true);
  const res = await fetch(
    `${ERP_URL}/api/resource/${encodeURIComponent(doctype)}`,
    { method: "POST", headers, body: JSON.stringify(data) }
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`ERPNext ${doctype} error (${res.status}): ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

async function erpList(doctype: string, employee: string, fields: string[], session?: string | null): Promise<any[]> {
  const filters = JSON.stringify([["employee", "=", employee]]);
  const params  = new URLSearchParams({
    filters,
    fields:            JSON.stringify(fields),
    limit_page_length: "50",
    order_by:          "creation desc",
  });
  const headers: Record<string, string> = session
    ? { Cookie: session }
    : { Authorization: `token ${API_KEY}:${API_SECRET}` };
  const res = await fetch(
    `${ERP_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function toIso(s: any): string {
  if (!s) return new Date().toISOString();
  try { return new Date(s).toISOString(); } catch { return String(s); }
}

// ── Leave Request (ERPNext: "Leave Request") ──────────────────────────────────
mobileRouter.get("/mobile/hrms/leaves", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("Leave Request", emp, ["name", "leave_type", "from_date", "to_date", "half_day", "reason", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          summary:    `${r.leave_type}: ${r.from_date} to ${r.to_date}`,
          created_at: toIso(r.creation),
        })),
      });
    }
  } catch {}
  // fallback: local DB
  try {
    const local = await db.execute(sql`
      SELECT id, leave_type, from_date, to_date, half_day, reason, status, created_at,
             CONCAT(leave_type, ': ', from_date, ' to ', to_date) AS summary
      FROM mobile_leave_applications WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/leave", hrmsAuth, async (req: any, res) => {
  const { leave_type, from_date, to_date, half_day, reason } = req.body;
  if (!leave_type || !from_date || !to_date)
    return res.status(400).json({ error: "leave_type, from_date, to_date required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("Leave Request", {
      employee:   emp,
      leave_type,
      from_date,
      to_date,
      half_day:   half_day ? 1 : 0,
      reason:     reason ?? "",
      status:     "Open",
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  // always persist locally as cache
  try {
    await db.execute(sql`
      INSERT INTO mobile_leave_applications (erp_employee_id, leave_type, from_date, to_date, half_day, reason, erp_ref)
      VALUES (${emp}, ${leave_type}, ${from_date}, ${to_date}, ${!!half_day}, ${reason ?? null}, ${erpRef})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── Claim Request (ERPNext: "Claim Request") ──────────────────────────────────
mobileRouter.get("/mobile/hrms/claims", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("Claim Request", emp, ["name", "claim_type", "claim_date", "amount", "description", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          expense_type: r.claim_type,
          summary:     `${r.claim_type} - ₹${r.amount}`,
          created_at:  toIso(r.creation),
        })),
      });
    }
  } catch {}
  try {
    const local = await db.execute(sql`
      SELECT id, expense_type, claim_date, amount, description, status, created_at,
             CONCAT(expense_type, ' - ₹', amount) AS summary
      FROM mobile_expense_claims WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/claim", hrmsAuth, async (req: any, res) => {
  const { expense_type, claim_date, amount, description } = req.body;
  if (!expense_type || !claim_date || amount == null)
    return res.status(400).json({ error: "expense_type, claim_date, amount required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("Claim Request", {
      employee:    emp,
      claim_type:  expense_type,
      claim_date,
      amount:      Number(amount),
      description: description ?? "",
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  try {
    await db.execute(sql`
      INSERT INTO mobile_expense_claims (erp_employee_id, expense_type, claim_date, amount, description)
      VALUES (${emp}, ${expense_type}, ${claim_date}, ${Number(amount)}, ${description ?? null})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── On Duty Request (ERPNext: "On Duty Request") ──────────────────────────────
mobileRouter.get("/mobile/hrms/onduty", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("On Duty Request", emp, ["name", "from_date", "to_date", "reason", "out_of_office_place", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          purpose:    r.reason ?? r.out_of_office_place,
          location:   r.out_of_office_place,
          summary:    r.reason ?? "On Duty",
          created_at: toIso(r.creation),
        })),
      });
    }
  } catch {}
  try {
    const local = await db.execute(sql`
      SELECT id, from_date, to_date, purpose, location, status, created_at, purpose AS summary
      FROM mobile_onduty_requests WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/onduty", hrmsAuth, async (req: any, res) => {
  const { from_date, to_date, purpose, location } = req.body;
  if (!from_date || !to_date || !purpose)
    return res.status(400).json({ error: "from_date, to_date, purpose required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("On Duty Request", {
      employee:             emp,
      from_date,
      to_date,
      reason:               purpose,
      out_of_office_place:  location ?? "",
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  try {
    await db.execute(sql`
      INSERT INTO mobile_onduty_requests (erp_employee_id, from_date, to_date, purpose, location)
      VALUES (${emp}, ${from_date}, ${to_date}, ${purpose}, ${location ?? null})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── Ticket Booking Details (ERPNext: "Ticket Booking Details") ─────────────────
mobileRouter.get("/mobile/hrms/tickets", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("Ticket Booking Details", emp, ["name", "mode_of_travel", "travel_date", "from_location", "to_location", "purpose", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          travel_mode: r.mode_of_travel,
          summary:    `${r.from_location ?? "?"} → ${r.to_location ?? "?"} (${r.mode_of_travel ?? "?"})`,
          created_at: toIso(r.creation),
        })),
      });
    }
  } catch {}
  try {
    const local = await db.execute(sql`
      SELECT id, travel_mode, travel_date, from_location, to_location, purpose, status, created_at,
             CONCAT(from_location, ' → ', to_location, ' (', travel_mode, ')') AS summary
      FROM mobile_ticket_requests WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/ticket", hrmsAuth, async (req: any, res) => {
  const { travel_mode, travel_date, from_location, to_location, purpose } = req.body;
  if (!travel_date || !from_location || !to_location)
    return res.status(400).json({ error: "travel_date, from_location, to_location required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("Ticket Booking Details", {
      employee:       emp,
      mode_of_travel: travel_mode ?? "Flight",
      travel_date,
      from_location,
      to_location,
      purpose:        purpose ?? "",
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  try {
    await db.execute(sql`
      INSERT INTO mobile_ticket_requests (erp_employee_id, travel_mode, travel_date, from_location, to_location, purpose)
      VALUES (${emp}, ${travel_mode ?? "Flight"}, ${travel_date}, ${from_location}, ${to_location}, ${purpose ?? null})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── Site Ticket (ERPNext: "Site Ticket") ──────────────────────────────────────
mobileRouter.get("/mobile/hrms/site-tickets", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("Site Ticket", emp, ["name", "site", "issue_type", "priority", "description", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          site_name:  r.site,
          summary:   `[${r.priority}] ${r.site} - ${r.issue_type}`,
          created_at: toIso(r.creation),
        })),
      });
    }
  } catch {}
  try {
    const local = await db.execute(sql`
      SELECT id, site_name, issue_type, priority, description, status, created_at,
             CONCAT('[', priority, '] ', site_name, ' - ', issue_type) AS summary
      FROM mobile_site_tickets WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/site-ticket", hrmsAuth, async (req: any, res) => {
  const { site_name, issue_type, priority, description } = req.body;
  if (!site_name || !description)
    return res.status(400).json({ error: "site_name and description required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("Site Ticket", {
      employee:   emp,
      site:       site_name,
      issue_type: issue_type ?? "Other",
      priority:   priority ?? "Medium",
      description,
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  try {
    await db.execute(sql`
      INSERT INTO mobile_site_tickets (erp_employee_id, site_name, issue_type, priority, description)
      VALUES (${emp}, ${site_name}, ${issue_type ?? "Other"}, ${priority ?? "Medium"}, ${description})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── Profile Image Proxy (base64) ──────────────────────────────────────────────
mobileRouter.get("/mobile/hrms/profile-image-b64", hrmsAuth, async (req: any, res) => {
  try {
    const imageUrl = await fetchEmployeeImageUrl(req.hrmsUser.erp_employee_id);
    if (!imageUrl) return res.status(404).json({ error: "No profile image" });
    const imgRes = await fetch(imageUrl, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!imgRes.ok) return res.status(404).json({ error: "Image not accessible" });
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({ base64, content_type: contentType });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Grievances (ERPNext: "Grievance") ────────────────────────────────────────
mobileRouter.get("/mobile/hrms/grievances", hrmsAuth, async (req: any, res) => {
  const emp = req.hrmsUser.erp_employee_id;
  try {
    const rows = await erpList("Grievance", emp, ["name", "grievance_type", "description", "priority", "status", "creation"], req.hrmsUser.erp_session);
    if (rows.length > 0) {
      return res.json({
        data: rows.map(r => ({
          ...r,
          category:   r.grievance_type,
          summary:   `[${r.priority ?? "Medium"}] ${r.grievance_type}`,
          created_at: toIso(r.creation),
        })),
      });
    }
  } catch {}
  try {
    const local = await db.execute(sql`
      SELECT id, category, description, priority, is_anonymous, status, created_at,
             CONCAT('[', priority, '] ', category) AS summary
      FROM mobile_grievances WHERE erp_employee_id = ${emp} ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: local.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

mobileRouter.post("/mobile/hrms/grievance", hrmsAuth, async (req: any, res) => {
  const { category, description, priority, is_anonymous } = req.body;
  if (!category || !description)
    return res.status(400).json({ error: "category and description required" });
  const emp = req.hrmsUser.erp_employee_id;
  let erpRef: string | null = null;
  let erpErr: string | null = null;
  try {
    const r = await erpPost("Grievance", {
      employee:       emp,
      grievance_type: category,
      description,
      priority:       priority ?? "Medium",
      }, req.hrmsUser.erp_session);
    erpRef = r?.data?.name ?? r?.message?.name ?? null;
  } catch (e) { erpErr = String(e); }
  try {
    await db.execute(sql`
      INSERT INTO mobile_grievances (erp_employee_id, category, description, priority, is_anonymous)
      VALUES (${emp}, ${category}, ${description}, ${priority ?? "Medium"}, ${!!is_anonymous})`);
  } catch {}
  if (erpErr && !erpRef) return res.status(500).json({ error: erpErr });
  res.json({ ok: true, erp_ref: erpRef });
});

// ── Announcements (mobile read + pm-app write) ────────────────────────────────
mobileRouter.get("/mobile/hrms/announcements", hrmsAuth, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, title, body, type, priority, created_at
      FROM mobile_announcements
      WHERE active = true
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY priority DESC, created_at DESC
      LIMIT 20
    `);
    res.json({ data: rows.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/hrms/announcement — admin creates announcement via pm-app
mobileRouter.post("/hrms/announcement", async (req, res) => {
  const { title, body, type = "info", priority = 0, valid_until, created_by } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title and body required" });
  try {
    await db.execute(sql`
      INSERT INTO mobile_announcements (title, body, type, priority, valid_until, created_by)
      VALUES (${title}, ${body}, ${type}, ${Number(priority)}, ${valid_until ?? null}, ${created_by ?? null})
    `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// DELETE /api/hrms/announcement/:id — admin removes announcement
mobileRouter.delete("/hrms/announcement/:id", async (req, res) => {
  try {
    await db.execute(sql`
      UPDATE mobile_announcements SET active = false WHERE id = ${Number(req.params.id)}
    `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/hrms/announcements — pm-app admin view
mobileRouter.get("/hrms/announcements", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM mobile_announcements ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ data: rows.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── All HRMS employees list (for sidebar) ────────────────────────────────────
mobileRouter.get("/hrms/hrms-users", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT erp_employee_id, employee_name, department, designation
      FROM mobile_hrms_users
      ORDER BY employee_name ASC
    `);
    res.json({ data: rows.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Employee full-day data (sessions + attendance logs + location) ─────────────
mobileRouter.get("/hrms/employee-day", async (req, res) => {
  try {
    const { employee, date } = req.query as any;
    if (!employee) return res.status(400).json({ error: "employee required" });
    const day = date || new Date().toISOString().split("T")[0];

    const [sessRows, logRows, locRows] = await Promise.all([
      db.execute(sql`
        SELECT ws.id, ws.erp_employee_id, ws.work_date,
               ws.check_in_time, ws.check_out_time, ws.duration_minutes,
               ws.check_in_location, ws.check_out_location,
               ws.check_in_lat, ws.check_in_lng, ws.check_out_lat, ws.check_out_lng,
               COALESCE(mu.employee_name, ws.employee_name) AS employee_name,
               mu.department, mu.designation
        FROM mobile_work_sessions ws
        LEFT JOIN mobile_hrms_users mu ON mu.erp_employee_id = ws.erp_employee_id
        WHERE ws.erp_employee_id = ${employee} AND ws.work_date = ${day}
        ORDER BY ws.check_in_time ASC
      `),
      db.execute(sql`
        SELECT id, log_type, latitude, longitude, location_name, created_at
        FROM mobile_attendance_logs
        WHERE erp_employee_id = ${employee}
          AND DATE(created_at) = ${day}::date
        ORDER BY created_at ASC
      `),
      db.execute(sql`
        SELECT latitude, longitude, location_name, is_checked_in, last_seen, accuracy
        FROM mobile_employee_locations
        WHERE erp_employee_id = ${employee}
      `),
    ]);

    res.json({
      sessions:  sessRows.rows,
      logs:      logRows.rows,
      location:  locRows.rows[0] ?? null,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Live employee locations — pm-app map ──────────────────────────────────────
mobileRouter.get("/hrms/employee-locations", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        el.erp_employee_id, el.employee_name, el.department,
        el.latitude, el.longitude, el.location_name,
        el.accuracy, el.is_checked_in, el.last_seen,
        mu.designation
      FROM mobile_employee_locations el
      LEFT JOIN mobile_hrms_users mu ON mu.erp_employee_id = el.erp_employee_id
      WHERE el.last_seen > NOW() - INTERVAL '24 hours'
      ORDER BY el.last_seen DESC
    `);
    res.json({ data: rows.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Work Sessions — pm-app monitoring dashboard ───────────────────────────────
mobileRouter.get("/hrms/work-sessions", async (req, res) => {
  try {
    const { date_from, date_to, employee } = req.query as any;
    const from = date_from || new Date().toISOString().split("T")[0];
    const to   = date_to   || new Date().toISOString().split("T")[0];
    let rows;
    if (employee) {
      rows = await db.execute(sql`
        SELECT ws.id, ws.erp_employee_id, ws.work_date,
               ws.check_in_time, ws.check_out_time, ws.duration_minutes,
               ws.check_in_location, ws.check_out_location,
               ws.check_in_lat, ws.check_in_lng, ws.check_out_lat, ws.check_out_lng,
               COALESCE(mu.employee_name, ws.employee_name) AS employee_name,
               mu.department, mu.designation
        FROM mobile_work_sessions ws
        LEFT JOIN mobile_hrms_users mu ON mu.erp_employee_id = ws.erp_employee_id
        WHERE ws.work_date BETWEEN ${from} AND ${to}
          AND ws.erp_employee_id = ${employee}
        ORDER BY ws.work_date DESC, ws.check_in_time DESC
        LIMIT 500
      `);
    } else {
      rows = await db.execute(sql`
        SELECT ws.id, ws.erp_employee_id, ws.work_date,
               ws.check_in_time, ws.check_out_time, ws.duration_minutes,
               ws.check_in_location, ws.check_out_location,
               ws.check_in_lat, ws.check_in_lng, ws.check_out_lat, ws.check_out_lng,
               COALESCE(mu.employee_name, ws.employee_name) AS employee_name,
               mu.department, mu.designation
        FROM mobile_work_sessions ws
        LEFT JOIN mobile_hrms_users mu ON mu.erp_employee_id = ws.erp_employee_id
        WHERE ws.work_date BETWEEN ${from} AND ${to}
        ORDER BY ws.work_date DESC, ws.check_in_time DESC
        LIMIT 500
      `);
    }
    res.json({ data: rows.rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

