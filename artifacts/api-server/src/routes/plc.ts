import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
const ERP_AUTH = () => `token ${process.env.ERPNEXT_API_KEY || ""}:${process.env.ERPNEXT_API_SECRET || ""}`;

const router = Router();

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_site_calls (
        id                      SERIAL PRIMARY KEY,
        call_no                 TEXT,
        call_type               TEXT NOT NULL DEFAULT 'Online Support',
        project_number          TEXT,
        project_name            TEXT,
        site_coordinator_name   TEXT,
        site_coordinator_phone  TEXT,
        call_received_at        TEXT,
        departed_at             TEXT,
        arrived_site_at         TEXT,
        work_started_at         TEXT,
        work_completed_at       TEXT,
        departed_site_at        TEXT,
        arrived_back_at         TEXT,
        attended_by             JSONB NOT NULL DEFAULT '[]',
        issue_details           TEXT,
        spares_changed          JSONB NOT NULL DEFAULT '[]',
        electrical_issue        BOOLEAN NOT NULL DEFAULT FALSE,
        electrical_issue_desc   TEXT,
        electrical_team         JSONB NOT NULL DEFAULT '[]',
        status                  TEXT NOT NULL DEFAULT 'Open',
        root_cause              TEXT,
        action_taken            TEXT,
        remarks                 TEXT,
        created_by              TEXT,
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS call_type TEXT NOT NULL DEFAULT 'Online Support'`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS site_coordinator_name TEXT`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS site_coordinator_phone TEXT`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS customer_email TEXT`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_service_reports (
        id                      SERIAL PRIMARY KEY,
        report_no               TEXT,
        project_number          TEXT,
        project_name            TEXT,
        site_coordinator_name   TEXT,
        site_coordinator_phone  TEXT,
        customer_email          TEXT,
        call_received_at        TEXT,
        departed_at             TEXT,
        arrived_site_at         TEXT,
        work_started_at         TEXT,
        work_completed_at       TEXT,
        departed_site_at        TEXT,
        arrived_back_at         TEXT,
        attended_by             JSONB NOT NULL DEFAULT '[]',
        service_details         TEXT,
        issue_details           TEXT,
        spares_changed          JSONB NOT NULL DEFAULT '[]',
        plc_checklist           JSONB NOT NULL DEFAULT '[]',
        customer_remarks        TEXT,
        engineer_suggestions    TEXT,
        electrical_issue        BOOLEAN NOT NULL DEFAULT FALSE,
        electrical_issue_desc   TEXT,
        electrical_team         JSONB NOT NULL DEFAULT '[]',
        status                  TEXT NOT NULL DEFAULT 'Open',
        root_cause              TEXT,
        action_taken            TEXT,
        created_by              TEXT,
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_service_reports ADD COLUMN IF NOT EXISTS customer_email TEXT`);
    console.log("PLC site calls & service reports tables ready");
  } catch (e) {
    console.error("PLC table init error:", e);
  }
})();

// ─── Site Calls (Online Support) ─────────────────────────────────────────────

router.get("/plc/site-calls", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";

    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE status = ${status}
          AND (project_name ILIKE ${"%" + search + "%"}
            OR project_number ILIKE ${"%" + search + "%"}
            OR call_no ILIKE ${"%" + search + "%"}
            OR issue_details ILIKE ${"%" + search + "%"})
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasSearch) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE project_name ILIKE ${"%" + search + "%"}
           OR project_number ILIKE ${"%" + search + "%"}
           OR call_no ILIKE ${"%" + search + "%"}
           OR issue_details ILIKE ${"%" + search + "%"}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasStatus) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE status = ${status}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        ORDER BY created_at DESC LIMIT 200
      `);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/plc/site-calls/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM plc_site_calls WHERE id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/plc/site-calls", async (req, res) => {
  try {
    const {
      call_no, call_type, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, work_started_at, work_completed_at,
      attended_by, issue_details, spares_changed,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, remarks, created_by,
    } = req.body;

    const result = await db.execute(sql`
      INSERT INTO plc_site_calls
        (call_no, call_type, project_number, project_name,
         site_coordinator_name, site_coordinator_phone, customer_email,
         call_received_at, work_started_at, work_completed_at,
         attended_by, issue_details, spares_changed,
         electrical_issue, electrical_issue_desc, electrical_team,
         status, root_cause, action_taken, remarks, created_by)
      VALUES
        (${call_no ?? null}, ${call_type ?? "Online Support"},
         ${project_number ?? null}, ${project_name ?? null},
         ${site_coordinator_name ?? null}, ${site_coordinator_phone ?? null}, ${customer_email ?? null},
         ${call_received_at ?? null}, ${work_started_at ?? null}, ${work_completed_at ?? null},
         ${JSON.stringify(attended_by ?? [])}::jsonb,
         ${issue_details ?? null},
         ${JSON.stringify(spares_changed ?? [])}::jsonb,
         ${electrical_issue ?? false},
         ${electrical_issue_desc ?? null},
         ${JSON.stringify(electrical_team ?? [])}::jsonb,
         ${status ?? "Open"},
         ${root_cause ?? null}, ${action_taken ?? null},
         ${remarks ?? null}, ${created_by ?? null})
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/plc/site-calls/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      call_no, call_type, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, work_started_at, work_completed_at,
      attended_by, issue_details, spares_changed,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, remarks,
    } = req.body;

    await db.execute(sql`
      UPDATE plc_site_calls SET
        call_no                 = COALESCE(${call_no ?? null}, call_no),
        call_type               = COALESCE(${call_type ?? null}, call_type),
        project_number          = COALESCE(${project_number ?? null}, project_number),
        project_name            = COALESCE(${project_name ?? null}, project_name),
        site_coordinator_name   = ${site_coordinator_name ?? null},
        site_coordinator_phone  = ${site_coordinator_phone ?? null},
        customer_email          = ${customer_email ?? null},
        call_received_at        = COALESCE(${call_received_at ?? null}, call_received_at),
        work_started_at         = COALESCE(${work_started_at ?? null}, work_started_at),
        work_completed_at       = COALESCE(${work_completed_at ?? null}, work_completed_at),
        attended_by             = COALESCE(${attended_by != null ? JSON.stringify(attended_by) : null}::jsonb, attended_by),
        issue_details           = COALESCE(${issue_details ?? null}, issue_details),
        spares_changed          = COALESCE(${spares_changed != null ? JSON.stringify(spares_changed) : null}::jsonb, spares_changed),
        electrical_issue        = COALESCE(${electrical_issue ?? null}, electrical_issue),
        electrical_issue_desc   = COALESCE(${electrical_issue_desc ?? null}, electrical_issue_desc),
        electrical_team         = COALESCE(${electrical_team != null ? JSON.stringify(electrical_team) : null}::jsonb, electrical_team),
        status                  = COALESCE(${status ?? null}, status),
        root_cause              = COALESCE(${root_cause ?? null}, root_cause),
        action_taken            = COALESCE(${action_taken ?? null}, action_taken),
        remarks                 = COALESCE(${remarks ?? null}, remarks),
        updated_at              = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/plc/site-calls/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_site_calls WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/plc/site-calls/:id/send-email
router.post("/plc/site-calls/:id/send-email", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_site_calls WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    const call = rows[0];
    if (!call) return res.status(404).json({ error: "Not found" });

    const toEmail = req.body.to || call.customer_email;
    if (!toEmail) return res.status(400).json({ error: "No customer email address provided." });

    const smtpUser = process.env.GMAIL_USER || "noreply@wttint.com";
    const smtpPass = process.env.GMAIL_APP_PASSWORD || "";
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", port: 587, secure: false, requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const callNo = call.call_no || `OSC-${String(call.id).padStart(4, "0")}`;
    const fmtDT = (s?: string) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    const attended = Array.isArray(call.attended_by) ? call.attended_by.map((e: any) => e.name).join(", ") : "";

    const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#1e3a5f;padding:28px 32px;display:flex;align-items:center;gap:16px;">
    <div>
      <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px;">WTT INTERNATIONAL</div>
      <div style="color:#93c5fd;font-size:11px;margin-top:2px;">Water Loving Technology</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div style="color:#93c5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Online Support Call Report</div>
      <div style="color:#fff;font-size:15px;font-weight:bold;margin-top:2px;">${callNo}</div>
    </div>
  </div>
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:140px;">Project</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${call.project_name || "—"}${call.project_number ? ` (${call.project_number})` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Status</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${call.status || "Open"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Attended By</td><td style="padding:6px 0;font-size:13px;">${attended || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Call Received</td><td style="padding:6px 0;font-size:13px;">${fmtDT(call.call_received_at)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Work Started</td><td style="padding:6px 0;font-size:13px;">${fmtDT(call.work_started_at)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Work Completed</td><td style="padding:6px 0;font-size:13px;">${fmtDT(call.work_completed_at)}</td></tr>
    </table>
    <div style="background:#f8fafc;border-left:4px solid #1e3a5f;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Customer Complaint</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${call.issue_details || "—"}</div>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Solution — Action Taken</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${call.action_taken || "—"}</div>
    </div>
    ${call.root_cause ? `<div style="background:#fefce8;border-left:4px solid #ca8a04;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Root Cause</div><div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${call.root_cause}</div></div>` : ""}
    ${call.remarks ? `<div style="background:#fdf4ff;border-left:4px solid #9333ea;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Remarks</div><div style="font-size:13px;color:#1e293b;">${call.remarks}</div></div>` : ""}
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <div style="color:#94a3b8;font-size:11px;">WTT International · PLC &amp; Automation · noreply@wttint.com</div>
    <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>
</body></html>`;

    await transporter.sendMail({
      from: `"WTT International" <${smtpUser}>`,
      to: toEmail,
      subject: `Online Support Call Report — ${callNo} | ${call.project_name || ""}`,
      html,
    });
    res.json({ ok: true, sent_to: toEmail });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ─── Service Reports ─────────────────────────────────────────────────────────

router.get("/plc/service-reports", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";

    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE status = ${status}
          AND (project_name ILIKE ${"%" + search + "%"}
            OR project_number ILIKE ${"%" + search + "%"}
            OR report_no ILIKE ${"%" + search + "%"}
            OR service_details ILIKE ${"%" + search + "%"})
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasSearch) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE project_name ILIKE ${"%" + search + "%"}
           OR project_number ILIKE ${"%" + search + "%"}
           OR report_no ILIKE ${"%" + search + "%"}
           OR service_details ILIKE ${"%" + search + "%"}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasStatus) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE status = ${status}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        ORDER BY created_at DESC LIMIT 200
      `);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/plc/service-reports/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM plc_service_reports WHERE id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/plc/service-reports", async (req, res) => {
  try {
    const {
      report_no, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, departed_at, arrived_site_at,
      work_started_at, work_completed_at, departed_site_at, arrived_back_at,
      attended_by, service_details, issue_details, spares_changed,
      plc_checklist, customer_remarks, engineer_suggestions,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, created_by,
    } = req.body;

    const result = await db.execute(sql`
      INSERT INTO plc_service_reports
        (report_no, project_number, project_name,
         site_coordinator_name, site_coordinator_phone, customer_email,
         call_received_at, departed_at, arrived_site_at,
         work_started_at, work_completed_at, departed_site_at, arrived_back_at,
         attended_by, service_details, issue_details, spares_changed,
         plc_checklist, customer_remarks, engineer_suggestions,
         electrical_issue, electrical_issue_desc, electrical_team,
         status, root_cause, action_taken, created_by)
      VALUES
        (${report_no ?? null},
         ${project_number ?? null}, ${project_name ?? null},
         ${site_coordinator_name ?? null}, ${site_coordinator_phone ?? null}, ${customer_email ?? null},
         ${call_received_at ?? null}, ${departed_at ?? null}, ${arrived_site_at ?? null},
         ${work_started_at ?? null}, ${work_completed_at ?? null},
         ${departed_site_at ?? null}, ${arrived_back_at ?? null},
         ${JSON.stringify(attended_by ?? [])}::jsonb,
         ${service_details ?? null}, ${issue_details ?? null},
         ${JSON.stringify(spares_changed ?? [])}::jsonb,
         ${JSON.stringify(plc_checklist ?? [])}::jsonb,
         ${customer_remarks ?? null}, ${engineer_suggestions ?? null},
         ${electrical_issue ?? false},
         ${electrical_issue_desc ?? null},
         ${JSON.stringify(electrical_team ?? [])}::jsonb,
         ${status ?? "Open"},
         ${root_cause ?? null}, ${action_taken ?? null},
         ${created_by ?? null})
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/plc/service-reports/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      report_no, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, departed_at, arrived_site_at,
      work_started_at, work_completed_at, departed_site_at, arrived_back_at,
      attended_by, service_details, issue_details, spares_changed,
      plc_checklist, customer_remarks, engineer_suggestions,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken,
    } = req.body;

    await db.execute(sql`
      UPDATE plc_service_reports SET
        report_no               = COALESCE(${report_no ?? null}, report_no),
        project_number          = COALESCE(${project_number ?? null}, project_number),
        project_name            = COALESCE(${project_name ?? null}, project_name),
        site_coordinator_name   = ${site_coordinator_name ?? null},
        site_coordinator_phone  = ${site_coordinator_phone ?? null},
        customer_email          = ${customer_email ?? null},
        call_received_at        = COALESCE(${call_received_at ?? null}, call_received_at),
        departed_at             = COALESCE(${departed_at ?? null}, departed_at),
        arrived_site_at         = COALESCE(${arrived_site_at ?? null}, arrived_site_at),
        work_started_at         = COALESCE(${work_started_at ?? null}, work_started_at),
        work_completed_at       = COALESCE(${work_completed_at ?? null}, work_completed_at),
        departed_site_at        = COALESCE(${departed_site_at ?? null}, departed_site_at),
        arrived_back_at         = COALESCE(${arrived_back_at ?? null}, arrived_back_at),
        attended_by             = COALESCE(${attended_by != null ? JSON.stringify(attended_by) : null}::jsonb, attended_by),
        service_details         = COALESCE(${service_details ?? null}, service_details),
        issue_details           = COALESCE(${issue_details ?? null}, issue_details),
        spares_changed          = COALESCE(${spares_changed != null ? JSON.stringify(spares_changed) : null}::jsonb, spares_changed),
        plc_checklist           = COALESCE(${plc_checklist != null ? JSON.stringify(plc_checklist) : null}::jsonb, plc_checklist),
        customer_remarks        = COALESCE(${customer_remarks ?? null}, customer_remarks),
        engineer_suggestions    = COALESCE(${engineer_suggestions ?? null}, engineer_suggestions),
        electrical_issue        = COALESCE(${electrical_issue ?? null}, electrical_issue),
        electrical_issue_desc   = COALESCE(${electrical_issue_desc ?? null}, electrical_issue_desc),
        electrical_team         = COALESCE(${electrical_team != null ? JSON.stringify(electrical_team) : null}::jsonb, electrical_team),
        status                  = COALESCE(${status ?? null}, status),
        root_cause              = COALESCE(${root_cause ?? null}, root_cause),
        action_taken            = COALESCE(${action_taken ?? null}, action_taken),
        updated_at              = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/plc/service-reports/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_service_reports WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/plc/service-reports/:id/send-email
router.post("/plc/service-reports/:id/send-email", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_service_reports WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    const report = rows[0];
    if (!report) return res.status(404).json({ error: "Not found" });

    const toEmail = req.body.to || report.customer_email;
    if (!toEmail) return res.status(400).json({ error: "No customer email address provided." });

    const smtpUser = process.env.GMAIL_USER || "noreply@wttint.com";
    const smtpPass = process.env.GMAIL_APP_PASSWORD || "";
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", port: 587, secure: false, requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const reportNo = report.report_no || `SR-${String(report.id).padStart(4, "0")}`;
    const fmtDT = (s?: string) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    const attended = Array.isArray(report.attended_by) ? report.attended_by.map((e: any) => e.name).join(", ") : "";
    const checklist = Array.isArray(report.plc_checklist) ? report.plc_checklist : [];
    const checkedCount = checklist.filter((c: any) => c.checked).length;

    const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#1e3a5f;padding:28px 32px;">
    <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px;">WTT INTERNATIONAL</div>
    <div style="color:#93c5fd;font-size:11px;margin-top:2px;">Water Loving Technology</div>
    <div style="margin-top:12px;color:#93c5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Site Service Report — <span style="color:#fff;font-weight:bold;">${reportNo}</span></div>
  </div>
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:140px;">Project</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${report.project_name || "—"}${report.project_number ? ` (${report.project_number})` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Site Coordinator</td><td style="padding:6px 0;font-size:13px;">${report.site_coordinator_name || "—"}${report.site_coordinator_phone ? ` · ${report.site_coordinator_phone}` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Status</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${report.status || "Open"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Attended By</td><td style="padding:6px 0;font-size:13px;">${attended || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Visit Date</td><td style="padding:6px 0;font-size:13px;">${fmtDT(report.call_received_at)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Work Completed</td><td style="padding:6px 0;font-size:13px;">${fmtDT(report.work_completed_at)}</td></tr>
    </table>
    <div style="background:#f8fafc;border-left:4px solid #1e3a5f;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Customer Complaint</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.issue_details || "—"}</div>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Solution — Work Done</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.service_details || "—"}</div>
    </div>
    ${report.action_taken ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Action Taken</div><div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.action_taken}</div></div>` : ""}
    ${checklist.length > 0 ? `<div style="background:#f8fafc;border-radius:8px;padding:14px 18px;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">PLC Checklist — ${checkedCount}/${checklist.length} points verified</div>${checklist.map((item: any) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:${item.checked ? "#16a34a" : "#94a3b8"};">${item.checked ? "✅" : "⬜"} ${item.label}${item.note ? ` <span style="color:#94a3b8;font-size:11px;">— ${item.note}</span>` : ""}</div>`).join("")}</div>` : ""}
    ${report.engineer_suggestions ? `<div style="background:#fdf4ff;border-left:4px solid #9333ea;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Engineer Suggestions</div><div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.engineer_suggestions}</div></div>` : ""}
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <div style="color:#94a3b8;font-size:11px;">WTT International · PLC &amp; Automation · noreply@wttint.com</div>
    <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>
</body></html>`;

    await transporter.sendMail({
      from: `"WTT International" <${smtpUser}>`,
      to: toEmail,
      subject: `Site Service Report — ${reportNo} | ${report.project_name || ""}`,
      html,
    });
    res.json({ ok: true, sent_to: toEmail });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ─── ERP Employees ────────────────────────────────────────────────────────────

router.get("/plc/erp-employees", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ employees: [] });
  try {
    const fields = encodeURIComponent('["name","employee_name","designation","department"]');
    const nameFilter = encodeURIComponent(`[["employee_name","like","%${q}%"],["status","=","Active"]]`);
    const r = await fetch(
      `${ERP_URL}/api/resource/Employee?filters=${nameFilter}&fields=${fields}&limit=20`,
      { headers: { Authorization: ERP_AUTH(), Accept: "application/json" } }
    );
    if (!r.ok) return res.json({ employees: [] });
    const d: any = await r.json();
    const list: any[] = d.data || [];
    res.json({
      employees: list.map(e => ({
        id: e.name,
        name: e.employee_name,
        designation: e.designation || "",
        label: `${e.employee_name}${e.designation ? " — " + e.designation : ""}`,
      })),
    });
  } catch (e: any) {
    res.status(502).json({ error: e.message, employees: [] });
  }
});

export default router;
