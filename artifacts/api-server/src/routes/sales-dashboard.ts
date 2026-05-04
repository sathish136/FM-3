import { Router } from "express";
import https from "https";
import path from "path";
import nodemailer from "nodemailer";
import { erpFetch, erpPost } from "../lib/erp";

const router = Router();

type Row = Record<string, any>;
const ok = (total_count: number, data: Row[]) => ({ total_count, data });

async function callErp(path: string, params: Record<string, string> = {}) {
  try {
    const r = await erpFetch(path, params);
    return r?.message ?? {};
  } catch (e: any) {
    console.error(`[sales-dashboard] ${path} -> ${e?.message ?? e}`);
    return {};
  }
}

// ── File proxy + OTP-gated download ─────────────────────────────────────
const ERP_HOST = "erp.wttint.com";
const ERP_API_KEY = process.env["ERPNEXT_API_KEY"] || "";
const ERP_API_SECRET = process.env["ERPNEXT_API_SECRET"] || "";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
};

function normaliseFilePath(raw: string): string | null {
  if (!raw) return null;
  let p = String(raw).trim();
  // Allow either `/files/...`, `/private/files/...`, or full ERP url
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (u.hostname !== ERP_HOST) return null;
      p = u.pathname;
    } catch { return null; }
  }
  if (!p.startsWith("/")) p = "/" + p;
  if (!p.startsWith("/files/") && !p.startsWith("/private/files/")) return null;
  // Block path traversal
  if (p.includes("..")) return null;
  return p;
}

function streamErpFile(
  filePath: string,
  res: import("express").Response,
  disposition: "inline" | "attachment",
  filename?: string,
) {
  // ERPNext file paths can contain spaces, unicode, `#`, `&`, etc.
  // Encode each segment but preserve the `/` separators so https.request
  // receives a valid request-target.
  const encodedPath = filePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const options = {
    hostname: ERP_HOST,
    path: encodedPath,
    method: "GET",
    headers: {
      Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
    },
    rejectUnauthorized: false,
    timeout: 60_000,
  };
  const req = https.request(options, (upstream) => {
    if ((upstream.statusCode ?? 500) >= 400) {
      res.status(upstream.statusCode ?? 502).json({
        error: "Failed to fetch file from ERP",
        status: upstream.statusCode,
      });
      upstream.resume();
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ctype =
      upstream.headers["content-type"] ?? MIME[ext] ?? "application/octet-stream";
    const safeName = (filename || path.basename(filePath)).replace(/[\r\n"]/g, "");
    res.setHeader("Content-Type", String(ctype));
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeName}"`,
    );
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"] as string);
    }
    upstream.pipe(res);
  });
  req.on("error", (e) => {
    console.error("[file proxy]", e);
    if (!res.headersSent) res.status(502).json({ error: "ERP unreachable" });
    else res.end();
  });
  req.on("timeout", () => { req.destroy(); });
  req.end();
}

// ── In-memory OTP store for downloads ────────────────────────────────────
interface DownloadOtp { otp: string; expires: number; }
const downloadOtps = new Map<string, DownloadOtp>();
const OTP_TTL_MS = 5 * 60 * 1000;

function otpKey(email: string, filePath: string) {
  return `${email.toLowerCase()}|${filePath}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const masked =
    local.length <= 2
      ? local[0] + "*"
      : local[0] + "*".repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${masked}@${domain}`;
}

async function sendDownloadOtpEmail(to: string, otp: string, filename: string) {
  const gmailUser = process.env["GMAIL_USER"] || "noreply@wttint.com";
  const gmailPass = process.env["GMAIL_APP_PASSWORD"] || "ejjjsfufipqmvpuh";
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });
  await transporter.sendMail({
    from: `"FlowMatriX" <${gmailUser}>`,
    to,
    subject: "Your FlowMatriX File Download Code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <h2 style="color:#0a2463;margin:0 0 8px;">FlowMatri<span style="color:#0ea5e9">X</span></h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Secure File Download</p>
        <p style="color:#1e293b;font-size:15px;">A download has been requested for:</p>
        <p style="color:#0a2463;font-size:14px;font-weight:600;background:#fff;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;word-break:break-all;">${filename}</p>
        <p style="color:#1e293b;font-size:15px;">Use this one-time code to confirm the download:</p>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#0a2463;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">This code expires in <strong>5 minutes</strong>. If you did not request a download, you can safely ignore this message.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} WTT INTERNATIONAL INDIA</p>
      </div>
    `,
  });
}

// 1. TODAY'S FOLLOWUP
router.get("/sales-dashboard/today_followup", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_leads_today");
  const rows: Row[] = [];
  for (const lead of msg.data ?? []) {
    for (const f of lead.followups ?? []) {
      rows.push({
        lead_id: lead.lead_id ?? "",
        lead_name: lead.lead_name ?? "",
        date: f.date ?? "",
        mode_of_comm: f.mode_of_communication ?? "",
        employee_name: f.employee_name ?? "",
        represent_name: f.client_side_representative ?? "",
        conversation: f.conversation ?? "",
        next_followup: (lead.next_follow_up ?? "").toString().slice(0, 10),
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 2. YESTERDAY'S FOLLOWUP
router.get("/sales-dashboard/yest_followup", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_leads_yesterday");
  const rows: Row[] = [];
  for (const lead of msg.data ?? []) {
    for (const f of lead.followups ?? []) {
      rows.push({
        lead_id: lead.lead_id ?? "",
        lead_name: lead.lead_name ?? "",
        date: f.date ?? "",
        mode_of_comm: f.mode_of_communication ?? "",
        employee_name: f.employee_name ?? "",
        represent_name: f.client_side_representative ?? "",
        conversation: f.conversation ?? "",
        next_followup: (lead.next_follow_up ?? "").toString().slice(0, 10),
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

function mapLeadRow(r: Row): Row {
  return {
    date: (r.creation_date ?? "").toString().slice(0, 10),
    company_name: r.company_name ?? "",
    email_id: r.email_id ?? r.email ?? r.e_mail_id ?? "",
    contact_no_1:
      r.contact_no_1 ?? r.contact_1 ?? r.mobile_number ?? r.phone ?? "",
    contact_no_2: r.contact_no_2 ?? r.contact_2 ?? r.mobile_no ?? "",
    capacity: r.capacity ?? "",
    requirement: r.requirements ?? r.requirement ?? "",
    next_followup: (r.next_follow_up ?? "").toString().slice(0, 10),
    country: r.country ?? r.country_name ?? "",
    state: r.state ?? r.state_name ?? "",
    city: r.city ?? "",
    address: r.address ?? r.address_line_1 ?? r.full_address ?? "",
    remarks: r.remarks ?? r.notes ?? r.description ?? "",
    lead_owner: r.lead_owner ?? r.owner ?? "",
    lead_status: r.lead_status ?? r.status ?? "",
    source: r.source ?? r.lead_source ?? "",
    industry: r.industry ?? "",
    designation: r.designation ?? "",
    contact_person: r.contact_person ?? r.poc ?? r.lead_name ?? "",
    website: r.website ?? "",
  };
}

const leadEndpoints: [string, string][] = [
  ["red_hot", "wtt_module.customization.custom.rfq.get_red_hot_leads"],
  ["hot_lead", "wtt_module.customization.custom.rfq.get_hot_leads"],
  ["warm_lead", "wtt_module.customization.custom.rfq.get_warm_leads"],
  ["cold_lead", "wtt_module.customization.custom.rfq.get_cold_leads"],
];

for (const [key, path] of leadEndpoints) {
  router.get(`/sales-dashboard/${key}`, async (_req, res) => {
    const msg = await callErp(path);
    const rows = (msg.data ?? []).map(mapLeadRow);
    res.json(ok(msg.total_count ?? 0, rows));
  });
}

// 7. TOTAL AGENTS
router.get("/sales-dashboard/total_agents", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_agent_details");
  const rows: Row[] = [];
  for (const agent of msg.data ?? []) {
    const region = agent.region ?? "";
    const company_name = agent.company_name ?? agent.agent_name ?? "";
    for (const c of agent.contacts ?? []) {
      rows.push({
        agent_name: c.poc ?? "",
        company_name,
        region,
        email_id: c.email_1 ?? c.email_2 ?? "",
        contact_1: c.contact_1 ?? "",
        contact_2: c.contact_2 ?? "",
        contact_3: c.contact_3 ?? "",
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 8. CALL LOGS
router.get("/sales-dashboard/call_logs", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_marketing_call_logs");
  const rows: Row[] = [];
  for (const item of msg.data ?? []) {
    for (const log of item.call_logs ?? []) {
      rows.push({
        phone: log.phone_number ?? item.parent_id ?? "",
        call_date: log.call_date ?? "",
        call_type: log.call_type ?? "",
        summary: log.summary ?? log.call_type ?? "",
        person_name:
          log.person_name ?? log.contact_person ?? item.person_name ?? "",
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 9. CUSTOMER DETAILS
router.get("/sales-dashboard/customer_details", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.customer_details");
  const rows: Row[] = [];
  for (const r of msg.data ?? []) {
    const attachments: Row[] = r.attachments ?? [];
    rows.push({
      proposal_req_no: r.name ?? "",
      customer_name: r.company_name ?? "",
      email: r.e_mail_id ?? "",
      phone: r.mobile_number ?? "",
      attachment_count: attachments.length,
      attachment_files: attachments.map((a) => ({
        name: a.file_name ?? "",
        url: a.file_url ?? "",
      })),
      capacity: r.plant_capacity_m3day ?? "",
    });
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 10. OPEN LEADS
router.get("/sales-dashboard/open_leads", async (req, res) => {
  const agentEmail = String(req.query.agent_email ?? "").trim().toLowerCase();
  const msg = await callErp("wtt_module.customization.custom.rfq.get_open_leads");
  let rows = (msg.data ?? []).map((lead: Row) => ({
    name: lead.name ?? "",
    company_name: lead.company_name ?? "",
    email_id: lead.email_id ?? "",
    contact_no_1: lead.contact_no_1 ?? "",
    contact_no_2: lead.contact_no_2 ?? "",
    capacity: lead.capacity ?? "",
    requirement: lead.requirement ?? "",
    next_follow_up: (lead.next_follow_up ?? "").toString().slice(0, 10),
    country: lead.country ?? lead.country_name ?? "",
    state: lead.state ?? lead.state_name ?? "",
    city: lead.city ?? "",
    address: lead.address ?? lead.address_line_1 ?? lead.full_address ?? "",
    remarks: lead.remarks ?? lead.notes ?? lead.description ?? "",
    lead_owner: lead.lead_owner ?? lead.owner ?? "",
    lead_status: lead.lead_status ?? lead.status ?? "",
    source: lead.source ?? lead.lead_source ?? "",
    industry: lead.industry ?? "",
    designation: lead.designation ?? "",
    contact_person: lead.contact_person ?? lead.poc ?? lead.lead_name ?? "",
    website: lead.website ?? "",
  }));

  // If an agent_email is provided, filter to only their assigned leads
  if (agentEmail) {
    try {
      const { sql } = await import("drizzle-orm");
      const { db } = await import("@workspace/db");
      let assignedIds: string[] = [];

      // Check erp_agents table first (new agent system — erp_name based)
      const erpAgentRows = await db.execute(
        sql`SELECT lead_ids FROM erp_agents WHERE LOWER(erp_name) = ${agentEmail} OR LOWER(agent_login_id) = ${agentEmail}`
      );
      if (erpAgentRows.rows.length > 0) {
        try { assignedIds = JSON.parse(String(erpAgentRows.rows[0].lead_ids ?? "[]")); } catch { assignedIds = []; }
      } else {
        // Fallback: legacy agent_lead_assignments table
        const legacyRows = await db.execute(
          sql`SELECT lead_ids FROM agent_lead_assignments WHERE agent_email = ${agentEmail}`
        );
        if (legacyRows.rows.length > 0) {
          try { assignedIds = JSON.parse(String(legacyRows.rows[0].lead_ids ?? "[]")); } catch { assignedIds = []; }
        }
      }

      const idSet = new Set(assignedIds.map((id: string) => id.toLowerCase()));
      rows = rows.filter((r) => idSet.has(String(r.name ?? "").toLowerCase()));
    } catch (e) {
      console.error("Agent lead filter error:", e);
    }
  }

  res.json(ok(rows.length, rows));
});

// ── PER-LEAD DETAIL ENDPOINTS ─────────────────────────────────────────
// 11. FOLLOW-UPS BY LEAD
router.get("/sales-dashboard/followups_by_lead", async (req, res) => {
  const lead_name = String(req.query.lead_name ?? "").trim();
  if (!lead_name) { res.json({ total_count: 0, employee_wise_count: [], data: [] }); return; }
  const msg = await callErp(
    "wtt_module.customization.custom.rfq.get_followups_by_lead",
    { lead_name },
  );
  res.json({
    total_count: msg.total_count ?? 0,
    employee_wise_count: msg.employee_wise_count ?? [],
    data: msg.data ?? [],
  });
});

// 12. PROPOSALS BY LEAD
router.get("/sales-dashboard/proposals_by_lead", async (req, res) => {
  const lead_name = String(req.query.lead_name ?? "").trim();
  const empty = { lead_id: lead_name, proposal_sent_date: null as string | null, proposal_count: 0, proposals: [] };
  if (!lead_name) { res.json(empty); return; }
  const msg = await callErp(
    "wtt_module.customization.custom.rfq.get_proposals_by_lead",
    { lead_name },
  );
  if (!msg || Object.keys(msg).length === 0) { res.json(empty); return; }
  res.json({
    lead_id: msg.lead_id ?? lead_name,
    proposal_sent_date: msg.proposal_sent_date ?? "",
    proposal_count: msg.proposal_count ?? 0,
    proposals: msg.proposals ?? [],
  });
});

// 13. PROPOSAL REQUESTS BY LEAD
router.get("/sales-dashboard/proposal_requests_by_lead", async (req, res) => {
  const lead_name = String(req.query.lead_name ?? "").trim();
  if (!lead_name) { res.json({ total_count: 0, data: [] }); return; }
  const msg = await callErp(
    "wtt_module.customization.custom.rfq.get_proposal_requests_by_lead",
    { lead_name },
  );
  res.json({ total_count: msg.total_count ?? 0, data: msg.data ?? [] });
});

// 14. STARTUP SHEETS BY LEAD (chained)
router.get("/sales-dashboard/startup_sheets_by_lead", async (req, res) => {
  const lead_name = String(req.query.lead_name ?? "").trim();
  if (!lead_name) { res.json({ total_count: 0, data: [] }); return; }
  const propMsg = await callErp(
    "wtt_module.customization.custom.rfq.get_proposal_requests_by_lead",
    { lead_name },
  );
  const proposals: Row[] = propMsg.data ?? [];
  const all: Row[] = [];
  for (const p of proposals) {
    const proposal_id = p.name;
    if (!proposal_id) continue;
    const sMsg = await callErp(
      "wtt_module.customization.custom.rfq.get_startup_sheets_by_proposal",
      { proposal_request: String(proposal_id) },
    );
    for (const sheet of sMsg.data ?? []) {
      sheet.proposal_request_id = proposal_id;
      all.push(sheet);
    }
  }
  res.json({ total_count: all.length, data: all });
});

// 15. COST WORKING TOOLS BY LEAD (chained)
router.get("/sales-dashboard/cost_working_tools_by_lead", async (req, res) => {
  const lead_name = String(req.query.lead_name ?? "").trim();
  if (!lead_name) { res.json({ total_count: 0, data: [] }); return; }
  const propMsg = await callErp(
    "wtt_module.customization.custom.rfq.get_proposal_requests_by_lead",
    { lead_name },
  );
  const proposals: Row[] = propMsg.data ?? [];
  const all: Row[] = [];
  for (const p of proposals) {
    const proposal_id = p.name;
    if (!proposal_id) continue;
    const sMsg = await callErp(
      "wtt_module.customization.custom.rfq.get_startup_sheets_by_proposal",
      { proposal_request: String(proposal_id) },
    );
    for (const sheet of sMsg.data ?? []) {
      const startup_sheet_id = sheet.name;
      if (!startup_sheet_id) continue;
      const cMsg = await callErp(
        "wtt_module.customization.custom.rfq.get_cost_working_tool",
        { project_startup_sheet: String(startup_sheet_id) },
      );
      for (const tool of cMsg.data ?? []) {
        tool.startup_sheet_id = startup_sheet_id;
        tool.proposal_request_id = proposal_id;
        all.push(tool);
      }
    }
  }
  res.json({ total_count: all.length, data: all });
});

// 16. LEAD REMARKS / DETAIL
router.get("/sales-dashboard/lead_remarks", async (req, res) => {
  const reference_name = String(req.query.reference_name ?? "").trim();
  if (!reference_name) { res.json({ total_count: 0, data: [] }); return; }
  const msg = await callErp(
    "wtt_module.customization.custom.rfq.get_lead",
    { reference_name },
  );
  let data: any =
    Array.isArray(msg) ? msg :
    (msg?.data ?? msg?.remarks ?? msg);
  if (!Array.isArray(data)) data = data ? [data] : [];
  res.json({ total_count: data.length, data });
});

// 16a. CREATE LEAD (insert a new ERPNext Lead doctype)
router.post("/sales-dashboard/create_lead", async (req, res) => {
  const body = (req.body ?? {}) as {
    company_name?: string;
    contact_person?: string;
    email_id?: string;
    mobile_no?: string;
    designation?: string;
    industry?: string;
    capacity?: string;
    requirement?: string;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
    source?: string;
    remarks?: string;
  };
  const company_name = String(body.company_name ?? "").trim();
  const contact_person = String(body.contact_person ?? "").trim();
  if (!company_name && !contact_person) {
    res.status(400).json({ success: false, message: "company_name or contact_person required" });
    return;
  }
  try {
    // ERPNext is strict: unknown link values (Source, Industry, Designation, etc.)
    // and unsupported fields will reject the whole insert. To make this robust
    // against arbitrary Plant Enquiry data, we only put known-safe scalar fields
    // on the doc itself, and append the rest as a notes block.
    const extras: string[] = [];
    const addExtra = (label: string, value?: string) => {
      const v = String(value ?? "").trim();
      if (v) extras.push(`${label}: ${v}`);
    };
    addExtra("Source", body.source);
    addExtra("Industry", body.industry);
    addExtra("Designation", body.designation);
    addExtra("Capacity", body.capacity);
    addExtra("Requirement", body.requirement);
    addExtra("Address", body.address);
    if (body.remarks && body.remarks.trim()) {
      extras.push("");
      extras.push(body.remarks.trim());
    }
    const remarksText = extras.join("\n").trim();

    const doc: Record<string, any> = {
      doctype: "Lead",
      company_name: company_name || contact_person,
      lead_name: contact_person || company_name,
      email_id: body.email_id ?? "",
      mobile_no: body.mobile_no ?? "",
      country: body.country ?? "",
      state: body.state ?? "",
      city: body.city ?? "",
      status: "Open",
      ...(remarksText ? { remarks: remarksText } : {}),
    };
    const result = await erpPost("frappe.client.insert", { doc });
    const payload = result?.message ?? result;

    // ERPNext returns 200 OK with an `exception` field when the doc fails
    // validation (e.g. LinkValidationError). Surface that as a real error.
    if (payload && typeof payload === "object" && "exception" in payload) {
      console.error("[create_lead] ERP exception:", payload.exception);
      res.status(400).json({
        success: false,
        message: String(payload.exception ?? "ERP rejected the lead"),
      });
      return;
    }

    res.json({ success: true, lead: payload });
  } catch (err: any) {
    console.error("[create_lead]", err?.message ?? err);
    res.status(500).json({ success: false, message: err?.message || "Failed to create lead" });
  }
});

// 16b. SAVE LEAD REMARKS (append a new remark line)
router.post("/sales-dashboard/save_lead_remarks", async (req, res) => {
  const body = (req.body ?? {}) as { lead_name?: string; remark?: string; author?: string };
  const lead_name = String(body.lead_name ?? "").trim();
  const remark = String(body.remark ?? "").trim();
  const author = String(body.author ?? "").trim();
  if (!lead_name || !remark) {
    res.status(400).json({ success: false, message: "lead_name and remark are required" });
    return;
  }
  try {
    const existing = await erpFetch("frappe.client.get_value", {
      doctype: "Lead",
      filters: JSON.stringify({ name: lead_name }),
      fieldname: "remarks",
    });
    const prev = String(existing?.message?.remarks ?? "").trim();
    const stamp = new Date().toLocaleString("en-GB", { hour12: false });
    const line = `[${stamp}${author ? ` · ${author}` : ""}] ${remark}`;
    const merged = prev ? `${prev}\n${line}` : line;
    const result = await erpPost("frappe.client.set_value", {
      doctype: "Lead",
      name: lead_name,
      fieldname: "remarks",
      value: merged,
    });
    res.json({ success: true, remarks: merged, raw: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to save remarks" });
  }
});

// 17. CALL CONVERSATION BY CONTACT
router.get("/sales-dashboard/call_conversation", async (req, res) => {
  const contact = String(req.query.contact ?? "").trim();
  if (!contact) { res.json({ total_count: 0, data: [] }); return; }
  const msg = await callErp(
    "wtt_module.wtt_module.doctype.marketing_call_logs.marketing_call_logs.get_call_logs",
    { contact },
  );
  const logs = msg?.logs ?? [];
  res.json({ total_count: logs.length, data: logs });
});

// 18. FILE VIEW (proxy, inline)
router.get("/sales-dashboard/file_view", (req, res) => {
  const raw = String(req.query["path"] ?? "");
  const filePath = normaliseFilePath(raw);
  if (!filePath) { res.status(400).json({ error: "Invalid file path" }); return; }
  const filename = String(req.query["name"] ?? "").trim() || undefined;
  streamErpFile(filePath, res, "inline", filename);
});

// 19. FILE DOWNLOAD — request OTP (sent to email)
router.post("/sales-dashboard/file_otp_request", async (req, res) => {
  const body = (req.body ?? {}) as { email?: string; path?: string; name?: string };
  const email = String(body.email ?? "").trim();
  const filePath = normaliseFilePath(String(body.path ?? ""));
  if (!email || !email.includes("@")) {
    res.status(400).json({ success: false, message: "Valid email required" });
    return;
  }
  if (!filePath) {
    res.status(400).json({ success: false, message: "Invalid file path" });
    return;
  }
  const filename = String(body.name ?? "").trim() || path.basename(filePath);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  downloadOtps.set(otpKey(email, filePath), { otp, expires: Date.now() + OTP_TTL_MS });
  try {
    await sendDownloadOtpEmail(email, otp, filename);
    res.json({ success: true, masked_email: maskEmail(email), expires_in: 300 });
  } catch (e: any) {
    console.error("[file_otp_request] send error:", e?.message ?? e);
    res.status(502).json({ success: false, message: "Could not send code email" });
  }
});

// 20. FILE DOWNLOAD — verify OTP and stream file as attachment
router.get("/sales-dashboard/file_download", (req, res) => {
  const email = String(req.query["email"] ?? "").trim();
  const otp = String(req.query["otp"] ?? "").trim();
  const filePath = normaliseFilePath(String(req.query["path"] ?? ""));
  if (!email || !otp || !filePath) {
    res.status(400).json({ error: "email, otp and path are required" });
    return;
  }
  const k = otpKey(email, filePath);
  const entry = downloadOtps.get(k);
  if (!entry) { res.status(401).json({ error: "No code requested" }); return; }
  if (Date.now() > entry.expires) {
    downloadOtps.delete(k);
    res.status(401).json({ error: "Code expired" });
    return;
  }
  if (entry.otp !== otp) { res.status(401).json({ error: "Invalid code" }); return; }
  // Single-use
  downloadOtps.delete(k);
  const filename = String(req.query["name"] ?? "").trim() || undefined;
  streamErpFile(filePath, res, "attachment", filename);
});

export default router;
