import { Router } from "express";
import nodemailer from "nodemailer";
import pg from "pg";
import OpenAI from "openai";
import multer from "multer";

const router = Router();
const { Pool } = pg;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

const pool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

const INTERNAL_DOMAINS = ["wttindia.com", "wttint.com"];

const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
const ERP_KEY = process.env.ERPNEXT_API_KEY || "";
const ERP_SECRET = process.env.ERPNEXT_API_SECRET || "";
const erpHeaders = () => ({ Accept: "application/json", Authorization: `token ${ERP_KEY}:${ERP_SECRET}` });

// Cache: email -> department
const deptCache = new Map<string, string>();

function inferDeptFromEmail(email: string): string | null {
  const username = email.split("@")[0].toLowerCase().replace(/[-_]\d+$/, "");
  const map: Record<string, string> = {
    hr: "HR",
    career: "HR",
    accounts: "Accounts",
    account: "Accounts",
    finance: "Accounts",
    purchase: "Purchase",
    purchases: "Purchase",
    projects: "Projects",
    project: "Projects",
    design: "Design",
    it: "It - WTT",
    erp: "It - WTT",
    erp1: "It - WTT",
    noreply: "System",
    "no-reply": "System",
    admin: "Administration",
    ps: "PS - WTT",
    sales: "Sales",
    marketing: "Marketing",
    quality: "Quality",
    qa: "Quality",
    production: "Production",
    logistics: "Logistics",
    legal: "Legal",
    operations: "Operations",
    om: "Operations",
    support: "Support",
  };
  return map[username] ?? null;
}

async function lookupDepartment(emailAddr: string): Promise<string | null> {
  const raw = emailAddr.match(/<(.+?)>/) ? emailAddr.match(/<(.+?)>/)![1] : emailAddr.trim();
  if (deptCache.has(raw)) return deptCache.get(raw)!;
  try {
    const fields = encodeURIComponent('["department"]');
    // try user_id first
    const f1 = encodeURIComponent(`[["user_id","=","${raw}"]]`);
    const r1 = await fetch(`${ERP_URL}/api/resource/Employee?filters=${f1}&fields=${fields}&limit=1`, { headers: erpHeaders() });
    if (r1.ok) {
      const d1: any = await r1.json();
      const dept = d1?.data?.[0]?.department || null;
      if (dept) { deptCache.set(raw, dept); return dept; }
    }
    // try company_email
    const f2 = encodeURIComponent(`[["company_email","=","${raw}"]]`);
    const r2 = await fetch(`${ERP_URL}/api/resource/Employee?filters=${f2}&fields=${fields}&limit=1`, { headers: erpHeaders() });
    if (r2.ok) {
      const d2: any = await r2.json();
      const dept = d2?.data?.[0]?.department || null;
      if (dept) { deptCache.set(raw, dept); return dept; }
    }
  } catch { /* ignore */ }
  // fallback: infer from email prefix
  const inferred = inferDeptFromEmail(raw);
  if (inferred) deptCache.set(raw, inferred);
  return inferred;
}

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_inbox (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      account_id INTEGER,
      subject TEXT,
      from_addr TEXT,
      to_addr TEXT,
      cc_addr TEXT,
      email_date TIMESTAMPTZ,
      body_text TEXT,
      body_html TEXT,
      seen BOOLEAN NOT NULL DEFAULT false,
      has_attachment BOOLEAN NOT NULL DEFAULT false,
      email_type TEXT NOT NULL DEFAULT 'information',
      category TEXT NOT NULL DEFAULT 'other',
      project_name TEXT,
      supplier_name TEXT,
      is_internal BOOLEAN NOT NULL DEFAULT false,
      priority TEXT NOT NULL DEFAULT 'medium',
      auto_replied BOOLEAN NOT NULL DEFAULT false,
      auto_reply_sent_at TIMESTAMPTZ,
      classified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Migrations
  await pool.query(`ALTER TABLE smart_email_inbox ADD COLUMN IF NOT EXISTS account_id INTEGER`);
  await pool.query(`ALTER TABLE smart_email_inbox ADD COLUMN IF NOT EXISTS department TEXT`);
  await pool.query(`ALTER TABLE smart_email_inbox ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE smart_email_inbox ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE smart_email_inbox ADD COLUMN IF NOT EXISTS has_draft BOOLEAN NOT NULL DEFAULT false`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      keywords TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      keywords TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_drafts (
      id SERIAL PRIMARY KEY,
      email_uid TEXT NOT NULL UNIQUE,
      draft_text TEXT NOT NULL,
      draft_html TEXT,
      to_addr TEXT,
      subject TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent BOOLEAN NOT NULL DEFAULT false,
      sent_at TIMESTAMPTZ
    )
  `);

  const existingProjects = await pool.query("SELECT COUNT(*) FROM smart_email_projects");
  if (existingProjects.rows[0].count === "0") {
    await pool.query(`
      INSERT INTO smart_email_projects (name, keywords) VALUES
      ('KANCHAN MLD', '["kanchan","kanchan 1.3","kanchan 3","kanchan mld"]'),
      ('RSL Project', '["rsl","rajasthan spinning","rsl project"]'),
      ('SONA Project', '["sona","sona etp","sona reject"]'),
      ('BHILWARA', '["bhilwara","bhilwara project"]'),
      ('MOMIN', '["momin","momin project"]'),
      ('BRINE', '["brine","brine treatment","brine project"]'),
      ('LB TEX', '["lb tex","lb textile","lbtex"]'),
      ('SACHIN', '["sachin","sachin project"]'),
      ('SWARAJ', '["swaraj","swaraj project"]')
      ON CONFLICT (name) DO NOTHING
    `);
  }

  console.log("smart email tables ready");
}
initTables().catch(e => console.error("smart email init:", e.message));

function extractDomain(email: string): string {
  const match = email.match(/@([^>\s,]+)/);
  return match ? match[1].toLowerCase().trim() : "";
}

function checkInternal(fromAddr: string): boolean {
  const domain = extractDomain(fromAddr);
  return INTERNAL_DOMAINS.some(d => domain === d || domain.endsWith("." + d));
}

async function tryKeywordClassify(
  subject: string, fromAddr: string, bodySnippet: string,
  projects: any[], suppliers: any[]
): Promise<{ category: string; project_name: string | null; supplier_name: string | null } | null> {
  const senderDomain = extractDomain(fromAddr);
  const haystack = `${subject} ${bodySnippet}`.toLowerCase();

  // 1. Supplier: domain-based match (fastest)
  for (const s of suppliers) {
    if (s.domain && senderDomain && senderDomain === s.domain.toLowerCase()) {
      return { category: "supplier", project_name: null, supplier_name: s.name };
    }
  }

  // 2. Project: keyword scan — project code pattern (WTT-XXXX) or known keywords
  const PROJECT_STOPWORDS = new Set(["sales","other","intern","office","factory","project","inventory","home"]);
  for (const p of projects) {
    let kws: string[] = [];
    try { kws = JSON.parse(p.keywords || "[]"); } catch { kws = []; }
    for (const kw of kws) {
      const k = kw.toLowerCase().trim();
      if (k.length < 5) continue;
      if (PROJECT_STOPWORDS.has(k)) continue;
      // Exact substring match — require word boundary
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(haystack)) {
        return { category: "project", project_name: p.name, supplier_name: null };
      }
    }
  }

  // 3. Supplier: keyword match in subject/body (require long, specific keywords)
  for (const s of suppliers) {
    // Skip suppliers with very generic names (< 6 chars)
    if ((s.name || "").length < 6) continue;
    let kws: string[] = [];
    try { kws = JSON.parse(s.keywords || "[]"); } catch { kws = []; }
    for (const kw of kws) {
      const k = kw.toLowerCase().trim();
      // Require at least 8 chars to avoid generic word matches
      if (k.length < 8) continue;
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(haystack)) {
        return { category: "supplier", project_name: null, supplier_name: s.name };
      }
    }
  }

  return null;
}

async function classifyWithAI(subject: string, fromAddr: string, bodySnippet: string) {
  const isInternal = checkInternal(fromAddr);
  const domain = extractDomain(fromAddr);

  const projects = await pool.query("SELECT name, keywords FROM smart_email_projects");
  const suppliers = await pool.query("SELECT name, domain, keywords FROM smart_email_suppliers");

  // Fast keyword/domain-based classification (skip AI if matched)
  if (!isInternal) {
    const kwMatch = await tryKeywordClassify(subject, fromAddr, bodySnippet, projects.rows, suppliers.rows);
    if (kwMatch && (kwMatch.category === "project" || kwMatch.category === "supplier")) {
      return {
        email_type: "information",
        category: kwMatch.category,
        project_name: kwMatch.project_name,
        supplier_name: kwMatch.supplier_name,
        priority: "medium",
        is_internal: false,
      };
    }
  }

  const projectList = projects.rows.map(p => `${p.name}: ${p.keywords}`).join("\n");
  const supplierList = suppliers.rows.map(s => `${s.name} (domain: ${s.domain || "unknown"}): ${s.keywords}`).join("\n") || "none yet";

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an email classifier for WTT International, a water treatment technology company. Classify emails accurately. Return JSON only.`,
        },
        {
          role: "user",
          content: `Classify this email:
From: ${fromAddr} (domain: ${domain})
Subject: ${subject}
Body snippet: ${bodySnippet.slice(0, 1200)}

Known projects:
${projectList}

Known suppliers/vendors:
${supplierList}

Internal company domains: ${INTERNAL_DOMAINS.join(", ")}
Is sender from internal domain: ${isInternal}

Return this JSON:
{
  "email_type": "important" | "information" | "promotion",
  "category": "project" | "supplier" | "internal" | "other",
  "project_name": "exact project name or null",
  "supplier_name": "supplier/vendor name or null",
  "priority": "high" | "medium" | "low",
  "confidence": 0-100
}

Rules:
- email_type "important": needs MD action - quotes, purchase orders, complaints, payments, contracts, urgent requests, RFQ, deadlines
- email_type "promotion": newsletters, marketing, advertisements, bulk promotions, no-reply senders
- email_type "information": reports, updates, FYI, notifications, meeting notes
- category "project": related to a specific project in the list
- category "supplier": from a vendor, supplier, or external business partner
- category "internal": sender domain is wttindia.com or wttint.com
- priority "high": requires response within 24h, financial, contracts, urgent
- priority "medium": normal business emails
- priority "low": newsletters, FYI, CC'd emails`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return {
      email_type: (["important", "information", "promotion"].includes(parsed.email_type) ? parsed.email_type : "information") as string,
      category: (isInternal ? "internal" : (["project", "supplier", "internal", "other"].includes(parsed.category) ? parsed.category : "other")) as string,
      project_name: parsed.project_name || null,
      supplier_name: parsed.supplier_name || null,
      priority: (["high", "medium", "low"].includes(parsed.priority) ? parsed.priority : "medium") as string,
      is_internal: isInternal,
    };
  } catch (err: any) {
    console.error("AI classify error:", err.message);
    return {
      email_type: "information",
      category: isInternal ? "internal" : "other",
      project_name: null,
      supplier_name: null,
      priority: "medium",
      is_internal: isInternal,
    };
  }
}

async function getAccount(userEmail?: string) {
  let row: any = null;
  if (userEmail) {
    const res = await pool.query(
      "SELECT id, gmail_user, gmail_app_password, email_address FROM email_accounts WHERE assigned_to = $1 LIMIT 1",
      [userEmail]
    );
    row = res.rows[0] ?? null;
  }
  if (!row) {
    const res = await pool.query(
      "SELECT id, gmail_user, gmail_app_password, email_address FROM email_accounts WHERE is_default = true LIMIT 1"
    );
    row = res.rows[0] ?? null;
  }
  if (!row) {
    const envUser = process.env.GMAIL_USER;
    const envPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    if (!envUser || !envPass) throw new Error("No email account configured.");
    return { gmailUser: envUser, gmailAppPassword: envPass, emailAddress: envUser };
  }
  return {
    id: row.id as number,
    gmailUser: row.gmail_user,
    gmailAppPassword: row.gmail_app_password?.replace(/\s/g, ""),
    emailAddress: row.email_address || row.gmail_user,
  };
}

async function sendEmail(
  account: { gmailUser: string; gmailAppPassword: string; emailAddress: string },
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer; contentType: string }[]
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: account.gmailUser, pass: account.gmailAppPassword },
  });
  await transporter.sendMail({
    from: `WTT International <${account.emailAddress}>`,
    to,
    subject,
    html,
    attachments: attachments || [],
  });
}

const smartUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const classifyQueue = new Set<string>();

async function classifyEmailRecord(uid: string, autoReply = true, userEmail?: string) {
  if (classifyQueue.has(uid)) return;
  classifyQueue.add(uid);
  try {
    const res = await pool.query("SELECT * FROM smart_email_inbox WHERE uid=$1", [uid]);
    const email = res.rows[0];
    if (!email || email.classified) return;

    const bodySnippet = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");
    const classification = await classifyWithAI(email.subject || "", email.from_addr || "", bodySnippet);

    const snippetText = bodySnippet.replace(/\s+/g, " ").trim().slice(0, 200);

    let department: string | null = null;
    if (classification.is_internal && email.from_addr) {
      department = await lookupDepartment(email.from_addr).catch(() => null);
    }

    await pool.query(
      `UPDATE smart_email_inbox SET
        email_type=$1, category=$2, project_name=$3, supplier_name=$4,
        priority=$5, is_internal=$6, classified=true,
        body_text=COALESCE(NULLIF(body_text,''), $8),
        department=$9
       WHERE uid=$7`,
      [classification.email_type, classification.category, classification.project_name,
       classification.supplier_name, classification.priority, classification.is_internal, uid,
       snippetText, department]
    );

    // Auto-reply draft: only for emails addressed directly TO the user,
    // not internal emails, not promotions
    if (autoReply && !classification.is_internal && classification.email_type !== "promotion") {
      const toAddr = (email.to_addr || "").toLowerCase();
      const isDirectlyAddressed = userEmail
        ? toAddr.includes(userEmail.toLowerCase())
        : true; // fallback: generate if we don't know the user's email
      if (isDirectlyAddressed) {
        triggerAutoReply(uid, userEmail).catch(() => {});
      }
    }
  } finally {
    classifyQueue.delete(uid);
  }
}

async function triggerAutoReply(uid: string, userEmail?: string, force = false) {
  const res = await pool.query("SELECT * FROM smart_email_inbox WHERE uid=$1", [uid]);
  const email = res.rows[0];
  if (!email) return;

  // Skip internal emails — no need to reply to colleagues automatically
  if (email.is_internal) return;

  // Only generate draft for emails addressed directly TO the user
  if (userEmail) {
    const toAddr = (email.to_addr || "").toLowerCase();
    if (!toAddr.includes(userEmail.toLowerCase())) return;
  }

  if (!force) {
    const existingDraft = await pool.query("SELECT id FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [uid]);
    if (existingDraft.rows.length > 0) return;
  } else {
    // Delete any existing unsent draft before regenerating
    await pool.query("DELETE FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [uid]);
  }

  const bodyText = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are drafting a reply on behalf of the Managing Director of WTT International, a water treatment technology company. 
Write a concise, professional reply that directly addresses the content and key points of the email. 
- If it's a request, acknowledge it specifically and indicate it will be reviewed.
- If it's a quotation or order, confirm receipt and say it will be processed.
- If it's an inquiry, acknowledge the specific question and say a detailed response will follow.
- Keep it to 3-5 sentences. Do not make firm commitments or share pricing/confidential details.
- Sound like a senior executive, not a template.`,
      },
      {
        role: "user",
        content: `Email from: ${email.from_addr}\nSubject: ${email.subject}\nBody:\n${bodyText.slice(0, 1200)}`,
      },
    ],
  });

  const replyText = completion.choices[0]?.message?.content || "Thank you for your email. The Managing Director has received your message and will respond at the earliest opportunity.";

  const htmlReply = `
    <p>${replyText.replace(/\n/g, "<br/>")}</p>
    <br/>
    <p style="color:#666;font-size:12px;">---<br/>
    <strong>WTT International</strong><br/>
    Water Loving Technology<br/>
    </p>
  `;

  await pool.query(
    `INSERT INTO smart_email_drafts (email_uid, draft_text, draft_html, to_addr, subject)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email_uid) DO UPDATE SET draft_text=$2, draft_html=$3, sent=false`,
    [uid, replyText, htmlReply, email.from_addr, `Re: ${email.subject}`]
  );

  // Mark email as having a pending draft
  await pool.query("UPDATE smart_email_inbox SET has_draft=true WHERE uid=$1", [uid]);
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /smart-email/messages
router.get("/smart-email/messages", async (req, res) => {
  const { filter, value, search, user_email } = req.query as Record<string, string>;
  try {
    // Resolve account_id for filtering
    let accountId: number | null = null;
    if (user_email) {
      const acct = await getAccount(user_email).catch(() => null);
      accountId = acct?.id || null;
    }

    let where = "WHERE 1=1";
    const vals: any[] = [];

    // Filter by the user's assigned email account (if known)
    if (accountId) {
      vals.push(accountId);
      where += ` AND (e.account_id = $${vals.length} OR e.account_id IS NULL)`;
    }

    let fromClause = `FROM smart_email_inbox e
       LEFT JOIN (SELECT email_uid FROM smart_email_drafts WHERE sent=false) d ON d.email_uid = e.uid`;

    if (filter === "trash") {
      where += " AND e.is_deleted=true";
    } else {
      // All non-trash views exclude deleted emails
      where += " AND e.is_deleted=false";
      if (filter === "important")    { where += " AND email_type='important'"; }
      else if (filter === "promotion")  { where += " AND email_type='promotion'"; }
      else if (filter === "information") { where += " AND email_type='information'"; }
      else if (filter === "internal")   { where += " AND is_internal=true"; }
      else if (filter === "dept") {
        where += " AND is_internal=true";
        if (value) { vals.push(value); where += ` AND department=$${vals.length}`; }
      }
      else if (filter === "project")    {
        where += " AND category='project'";
        if (value) { vals.push(value); where += ` AND project_name=$${vals.length}`; }
      }
      else if (filter === "supplier") {
        where += " AND category='supplier'";
        if (value) { vals.push(value); where += ` AND supplier_name=$${vals.length}`; }
      }
      else if (filter === "unread")     { where += " AND seen=false"; }
      else if (filter === "high")       { where += " AND priority='high'"; }
      else if (filter === "drafts")     { where += " AND d.email_uid IS NOT NULL AND e.auto_replied=false"; }
    }

    if (search) {
      vals.push(`%${search}%`);
      where += ` AND (subject ILIKE $${vals.length} OR from_addr ILIKE $${vals.length})`;
    }

    const result = await pool.query(
      `SELECT e.uid, e.subject, e.from_addr, e.to_addr, e.cc_addr, e.email_date, e.seen, e.has_attachment,
              e.email_type, e.category, e.project_name, e.supplier_name, e.is_internal, e.priority,
              e.auto_replied, e.classified, e.department,
              LEFT(COALESCE(
                NULLIF(e.body_text, ''),
                regexp_replace(e.body_html, '<[^>]+>', ' ', 'g')
              ), 200) AS snippet,
              (d.email_uid IS NOT NULL) AS has_draft
       ${fromClause}
       ${where}
       ORDER BY
         CASE e.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         e.email_date DESC NULLS LAST
       LIMIT 200`,
      vals
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("smart-email messages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /smart-email/stats
router.get("/smart-email/stats", async (req, res) => {
  const { user_email } = req.query as Record<string, string>;
  try {
    let accountId: number | null = null;
    if (user_email) {
      const acct = await getAccount(user_email).catch(() => null);
      accountId = acct?.id || null;
    }

    const acctFilter = accountId ? `AND (account_id=$1 OR account_id IS NULL)` : "";
    const acctVals = accountId ? [accountId] : [];

    const acctNotDeletedFilter = acctFilter ? `${acctFilter} AND NOT is_deleted` : `AND NOT is_deleted`;
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NOT seen AND NOT is_deleted ${acctFilter}) AS unread,
        COUNT(*) FILTER (WHERE email_type='important' AND NOT is_deleted ${acctFilter}) AS important,
        COUNT(*) FILTER (WHERE email_type='information' AND NOT is_deleted ${acctFilter}) AS information,
        COUNT(*) FILTER (WHERE email_type='promotion' AND NOT is_deleted ${acctFilter}) AS promotion,
        COUNT(*) FILTER (WHERE category='project' AND NOT is_deleted ${acctFilter}) AS projects,
        COUNT(*) FILTER (WHERE category='supplier' AND NOT is_deleted ${acctFilter}) AS suppliers,
        COUNT(*) FILTER (WHERE is_internal=true AND NOT is_deleted ${acctFilter}) AS internal,
        COUNT(*) FILTER (WHERE priority='high' AND NOT auto_replied AND NOT is_deleted ${acctFilter}) AS needs_reply,
        COUNT(*) FILTER (WHERE auto_replied=true AND NOT is_deleted ${acctFilter}) AS auto_replied_count,
        COUNT(*) FILTER (WHERE NOT is_deleted ${acctFilter}) AS total,
        COUNT(*) FILTER (WHERE is_deleted=true ${acctFilter}) AS trash_count,
        (SELECT COUNT(*) FROM smart_email_drafts WHERE sent=false) AS drafts_count
      FROM smart_email_inbox
    `, acctVals);
    const projects = await pool.query(
      `SELECT project_name, COUNT(*) as count FROM smart_email_inbox WHERE category='project' AND project_name IS NOT NULL AND NOT is_deleted ${acctFilter} GROUP BY project_name ORDER BY count DESC`,
      acctVals
    );
    const suppliers = await pool.query(
      `SELECT supplier_name, COUNT(*) as count FROM smart_email_inbox WHERE category='supplier' AND supplier_name IS NOT NULL AND NOT is_deleted ${acctFilter} GROUP BY supplier_name ORDER BY count DESC LIMIT 20`,
      acctVals
    );
    const departments = await pool.query(
      `SELECT department, COUNT(*) as count FROM smart_email_inbox WHERE is_internal=true AND department IS NOT NULL AND NOT is_deleted ${acctFilter} GROUP BY department ORDER BY count DESC`,
      acctVals
    );
    res.json({
      stats: r.rows[0],
      projects: projects.rows,
      suppliers: suppliers.rows,
      departments: departments.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /smart-email/body/:uid
router.get("/smart-email/body/:uid", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT body_html, body_text, subject, from_addr FROM smart_email_inbox WHERE uid=$1",
      [req.params.uid]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/ingest — add emails from the existing email_cache
router.post("/smart-email/ingest", async (req, res) => {
  const autoReply = req.body?.auto_reply !== false;
  const userEmail = req.body?.user_email as string | undefined;
  try {
    const account = await getAccount(userEmail).catch(() => null);
    const accountFilter = account && account.id
      ? `AND e.account_id = ${account.id}`
      : "";

    const cached = await pool.query(`
      SELECT e.uid::text as uid, e.subject, e.from_addr, e.to_addr, e.cc_addr,
             e.email_date, e.body_text, e.body_html, e.seen, e.has_attachment
      FROM email_cache e
      WHERE e.folder_path = 'INBOX'
      ${accountFilter}
      ORDER BY e.email_date DESC NULLS LAST
      LIMIT 200
    `);

    const accountId = account?.id || null;

    let ingested = 0;
    for (const row of cached.rows) {
      await pool.query(
        `INSERT INTO smart_email_inbox
          (uid, account_id, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html, seen, has_attachment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (uid) DO UPDATE SET
           account_id=COALESCE(EXCLUDED.account_id, smart_email_inbox.account_id),
           seen=$10,
           body_text=COALESCE(NULLIF(EXCLUDED.body_text,''), smart_email_inbox.body_text),
           body_html=COALESCE(NULLIF(EXCLUDED.body_html,''), smart_email_inbox.body_html)`,
        [row.uid, accountId, row.subject, row.from_addr, row.to_addr, row.cc_addr,
         row.email_date, row.body_text, row.body_html, row.seen, row.has_attachment]
      );
      ingested++;
    }

    const unclassified = await pool.query(
      `SELECT uid FROM smart_email_inbox WHERE NOT classified${accountId ? ` AND (account_id=$1 OR account_id IS NULL)` : ""} ORDER BY email_date DESC LIMIT 30`,
      accountId ? [accountId] : []
    );
    for (const r of unclassified.rows) {
      classifyEmailRecord(r.uid, autoReply, userEmail).catch(() => {});
    }

    res.json({ ok: true, ingested, classifying: unclassified.rows.length });

    // Auto-sync ERP data after ingesting new emails (non-blocking)
    syncErpData().catch(() => {});
  } catch (err: any) {
    console.error("ingest error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/add — add a single email (e.g. from external push)
router.post("/smart-email/add", async (req, res) => {
  const { uid, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html } = req.body;
  if (!uid || !from_addr) return res.status(400).json({ error: "uid and from_addr required" });
  try {
    await pool.query(
      `INSERT INTO smart_email_inbox (uid, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (uid) DO NOTHING`,
      [uid, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html]
    );
    classifyEmailRecord(String(uid)).catch(() => {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/classify/:uid — manual reclassify
router.post("/smart-email/classify/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    await pool.query("UPDATE smart_email_inbox SET classified=false WHERE uid=$1", [uid]);
    await classifyEmailRecord(uid);
    const r = await pool.query(
      "SELECT email_type, category, project_name, supplier_name, priority, is_internal FROM smart_email_inbox WHERE uid=$1",
      [uid]
    );
    res.json({ ok: true, classification: r.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/draft-batch — generate AI draft replies for all eligible emails without a draft
router.post("/smart-email/draft-batch", async (req, res) => {
  const userEmail = req.body?.user_email as string | undefined;
  try {
    // Target: classified, non-internal, non-promotional emails that don't yet have a draft and haven't been auto-replied
    const rows = await pool.query(
      `SELECT uid FROM smart_email_inbox
       WHERE is_deleted = false
         AND is_internal = false
         AND COALESCE(email_type, '') != 'promotion'
         AND has_draft = false
         AND auto_replied = false
       ORDER BY email_date DESC
       LIMIT 50`
    );
    let queued = 0;
    for (const r of rows.rows) {
      triggerAutoReply(r.uid, userEmail, false).catch(() => {});
      queued++;
    }
    res.json({ ok: true, queued });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/classify-batch — classify all unclassified
router.post("/smart-email/classify-batch", async (req, res) => {
  const autoReply = req.body?.auto_reply !== false;
  try {
    const rows = await pool.query(
      "SELECT uid FROM smart_email_inbox WHERE NOT classified ORDER BY email_date DESC LIMIT 50"
    );
    for (const r of rows.rows) {
      classifyEmailRecord(r.uid, autoReply).catch(() => {});
    }
    res.json({ ok: true, queued: rows.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/seen/:uid
router.post("/smart-email/seen/:uid", async (req, res) => {
  try {
    await pool.query("UPDATE smart_email_inbox SET seen=true WHERE uid=$1", [req.params.uid]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/ai-reply — generate smart reply options
router.post("/smart-email/ai-reply", async (req, res) => {
  const { uid, tone } = req.body;
  try {
    const r = await pool.query(
      "SELECT subject, from_addr, body_text, body_html, email_type, category, project_name, supplier_name FROM smart_email_inbox WHERE uid=$1",
      [uid]
    );
    const email = r.rows[0];
    if (!email) return res.status(404).json({ error: "Email not found" });

    const bodyText = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");
    const context = email.project_name ? `This is regarding project: ${email.project_name}.` :
      email.supplier_name ? `This is from supplier: ${email.supplier_name}.` : "";

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the MD's email assistant at WTT International (water treatment technology company). Generate smart reply options for the MD. ${context} Return JSON with "replies" array of 3 objects each with "tone" and "text" fields.`,
        },
        {
          role: "user",
          content: `From: ${email.from_addr}
Subject: ${email.subject}
Email type: ${email.email_type}
Category: ${email.category}
Body: ${bodyText.slice(0, 1500)}

Generate 3 reply options:
1. Brief & Direct (2-3 sentences, gets to the point)
2. Professional & Detailed (4-6 sentences, formal)  
3. Friendly & Positive (3-4 sentences, warm tone)

Each reply should be actionable and appropriate for the MD of a water treatment company.`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"replies":[]}');
    res.json({ replies: parsed.replies || [] });
  } catch (err: any) {
    console.error("ai-reply error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/ai-summary/:uid
router.post("/smart-email/ai-summary/:uid", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT subject, from_addr, body_text, body_html, email_type, category, project_name, priority FROM smart_email_inbox WHERE uid=$1",
      [req.params.uid]
    );
    const email = r.rows[0];
    if (!email) return res.status(404).json({ error: "Email not found" });

    const bodyText = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a concise email summarizer for a busy Managing Director. Summarize in 2-3 sentences. Highlight key action items, deadlines, and important numbers. Be direct and clear.",
        },
        {
          role: "user",
          content: `Subject: ${email.subject}\nFrom: ${email.from_addr}\nType: ${email.email_type} / ${email.category}\n\n${bodyText.slice(0, 2000)}`,
        },
      ],
    });
    res.json({ summary: completion.choices[0]?.message?.content || "" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/send
router.post("/smart-email/send", smartUpload.array("attachments"), async (req, res) => {
  const { to, subject, html, userEmail, replyToUid } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "to and subject required" });
  try {
    const account = await getAccount(userEmail);
    const files = (req.files as Express.Multer.File[]) || [];
    const attachments = files.map(f => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));
    await sendEmail(account, to, subject, html || "", attachments);
    if (replyToUid) {
      await pool.query("UPDATE smart_email_inbox SET seen=true WHERE uid=$1", [replyToUid]);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/auto-reply/:uid — generate draft (does NOT send)
router.post("/smart-email/auto-reply/:uid", async (req, res) => {
  const force = req.body?.force === true;
  try {
    await triggerAutoReply(req.params.uid, req.body?.user_email, force);
    const draft = await pool.query("SELECT * FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [req.params.uid]);
    res.json({ ok: true, draft: draft.rows[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /smart-email/draft/:uid — discard (delete) the unsent draft
router.delete("/smart-email/draft/:uid", async (req, res) => {
  try {
    await pool.query("DELETE FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [req.params.uid]);
    await pool.query("UPDATE smart_email_inbox SET has_draft=false WHERE uid=$1", [req.params.uid]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /smart-email/draft/:uid — get unsent draft for an email
router.get("/smart-email/draft/:uid", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM smart_email_drafts WHERE email_uid=$1 AND sent=false ORDER BY created_at DESC LIMIT 1", [req.params.uid]);
    res.json(r.rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/send-draft/:uid — MD approves and sends the draft
router.post("/smart-email/send-draft/:uid", async (req, res) => {
  const { edited_text, user_email } = req.body;
  try {
    const draftRes = await pool.query("SELECT * FROM smart_email_drafts WHERE email_uid=$1 AND sent=false ORDER BY created_at DESC LIMIT 1", [req.params.uid]);
    const draft = draftRes.rows[0];
    if (!draft) return res.status(404).json({ error: "No pending draft found" });

    const finalText = edited_text || draft.draft_text;
    const htmlBody = `
      <p>${finalText.replace(/\n/g, "<br/>")}</p>
      <br/>
      <p style="color:#666;font-size:12px;">---<br/>
      <strong>WTT International</strong><br/>
      Water Loving Technology<br/>
      </p>
    `;

    const account = await getAccount(user_email);
    await sendEmail(account, draft.to_addr, draft.subject, htmlBody);

    await pool.query("UPDATE smart_email_drafts SET sent=true, sent_at=NOW() WHERE email_uid=$1 AND sent=false", [req.params.uid]);
    await pool.query("UPDATE smart_email_inbox SET auto_replied=true, auto_reply_sent_at=NOW() WHERE uid=$1", [req.params.uid]);

    res.json({ ok: true, sent_to: draft.to_addr, sent_from: account.emailAddress });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /smart-email/projects — list configured projects
router.get("/smart-email/projects", async (_req, res) => {
  try {
    const r = await pool.query("SELECT * FROM smart_email_projects ORDER BY name");
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/projects — add a project
router.post("/smart-email/projects", async (req, res) => {
  const { name, keywords } = req.body;
  try {
    const r = await pool.query(
      "INSERT INTO smart_email_projects (name, keywords) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET keywords=$2 RETURNING *",
      [name, JSON.stringify(keywords || [])]
    );
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /smart-email/suppliers
router.get("/smart-email/suppliers", async (_req, res) => {
  try {
    const r = await pool.query("SELECT * FROM smart_email_suppliers ORDER BY name");
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/suppliers
router.post("/smart-email/suppliers", async (req, res) => {
  const { name, domain, keywords } = req.body;
  try {
    const r = await pool.query(
      "INSERT INTO smart_email_suppliers (name, domain, keywords) VALUES ($1,$2,$3) RETURNING *",
      [name, domain || null, JSON.stringify(keywords || [])]
    );
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /smart-email/:uid — soft delete (move to trash)
router.delete("/smart-email/:uid", async (req, res) => {
  try {
    await pool.query(
      "UPDATE smart_email_inbox SET is_deleted=true, deleted_at=NOW() WHERE uid=$1",
      [req.params.uid]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/delete-batch — soft delete multiple emails
router.post("/smart-email/delete-batch", async (req, res) => {
  const { uids } = req.body as { uids: string[] };
  if (!Array.isArray(uids) || uids.length === 0) return res.json({ ok: true, count: 0 });
  try {
    const r = await pool.query(
      `UPDATE smart_email_inbox SET is_deleted=true, deleted_at=NOW() WHERE uid = ANY($1)`,
      [uids]
    );
    res.json({ ok: true, count: r.rowCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /smart-email/restore-batch — restore (un-delete) multiple emails
router.post("/smart-email/restore-batch", async (req, res) => {
  const { uids } = req.body as { uids: string[] };
  if (!Array.isArray(uids) || uids.length === 0) return res.json({ ok: true, count: 0 });
  try {
    const r = await pool.query(
      `UPDATE smart_email_inbox SET is_deleted=false, deleted_at=NULL WHERE uid = ANY($1)`,
      [uids]
    );
    res.json({ ok: true, count: r.rowCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /smart-email/purge-batch — permanently delete from trash
router.post("/smart-email/purge-batch", async (req, res) => {
  const { uids } = req.body as { uids: string[] };
  if (!Array.isArray(uids) || uids.length === 0) return res.json({ ok: true, count: 0 });
  try {
    const r = await pool.query(
      `DELETE FROM smart_email_inbox WHERE uid = ANY($1) AND is_deleted=true`,
      [uids]
    );
    res.json({ ok: true, count: r.rowCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auto ERP sync (runs on startup + after ingest) ──────────────────────────
let erpSyncRunning = false;

async function syncErpData(): Promise<void> {
  if (erpSyncRunning) return;
  erpSyncRunning = true;
  try {
    const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
    const ERP_KEY = process.env.ERPNEXT_API_KEY || "";
    const ERP_SECRET = process.env.ERPNEXT_API_SECRET || "";
    if (!ERP_KEY || !ERP_SECRET) return;
    const auth = `token ${ERP_KEY}:${ERP_SECRET}`;

    // 1. Sync ERPNext Projects
    let projOffset = 0;
    while (true) {
      const r = await fetch(
        `${ERP_URL}/api/resource/Project?fields=["name","project_name","status"]&limit=500&limit_start=${projOffset}`,
        { headers: { Authorization: auth } }
      );
      const data: any = await r.json();
      const rows: any[] = data?.data || [];
      if (rows.length === 0) break;
      for (const p of rows) {
        const code = (p.name || "").trim();
        const fullName = (p.project_name || p.name || "").trim();
        if (!fullName) continue;
        const keywords: string[] = [];
        if (code && code !== fullName) keywords.push(code.toLowerCase());
        keywords.push(fullName.toLowerCase());
        const words = fullName.split(/[\s\-\/]+/).filter((w: string) => w.length > 3);
        if (words.length >= 2) keywords.push(words.join(" ").toLowerCase());
        await pool.query(
          `INSERT INTO smart_email_projects (name, keywords) VALUES ($1,$2)
           ON CONFLICT (name) DO UPDATE SET keywords=$2`,
          [fullName, JSON.stringify([...new Set(keywords)])]
        );
      }
      if (rows.length < 500) break;
      projOffset += 500;
    }

    // 2. Sync ERPNext Suppliers
    let suppOffset = 0;
    while (true) {
      const r = await fetch(
        `${ERP_URL}/api/resource/Supplier?fields=["name","supplier_name","email_id"]&limit=500&limit_start=${suppOffset}`,
        { headers: { Authorization: auth } }
      );
      const data: any = await r.json();
      const rows: any[] = data?.data || [];
      if (rows.length === 0) break;
      for (const s of rows) {
        const name = (s.supplier_name || s.name || "").trim();
        if (!name || name.length < 2) continue;
        let domain: string | null = null;
        if (s.email_id && s.email_id.includes("@")) {
          domain = s.email_id.split("@")[1].toLowerCase().trim();
        }
        const keywords: string[] = [name.toLowerCase()];
        const words = name.split(/[\s\-\/&]+/).filter((w: string) => w.length > 2);
        if (words.length >= 2) keywords.push(words.slice(0, 3).join(" ").toLowerCase());
        await pool.query(
          `INSERT INTO smart_email_suppliers (name, domain, keywords) VALUES ($1,$2,$3)
           ON CONFLICT (name) DO UPDATE SET domain=COALESCE($2, smart_email_suppliers.domain), keywords=$3`,
          [name, domain, JSON.stringify([...new Set(keywords)])]
        );
      }
      if (rows.length < 500) break;
      suppOffset += 500;
    }

    // 3. Sync Employee Departments
    const empResp = await fetch(
      `${ERP_URL}/api/resource/Employee?fields=["name","company_email","user_id","department"]&limit=500`,
      { headers: { Authorization: auth } }
    );
    const empData: any = await empResp.json();
    const employees: any[] = empData?.data || [];
    const emailDeptMap = new Map<string, string>();
    for (const emp of employees) {
      const dept = (emp.department || "").trim();
      if (!dept) continue;
      if (emp.user_id) emailDeptMap.set(emp.user_id.toLowerCase().trim(), dept);
      if (emp.company_email) emailDeptMap.set(emp.company_email.toLowerCase().trim(), dept);
    }
    // Pass 1: assign departments from ERPNext employee map
    const internals = await pool.query(
      "SELECT uid, from_addr FROM smart_email_inbox WHERE is_internal=true AND (department IS NULL OR department='')"
    );
    for (const row of internals.rows) {
      const match = row.from_addr?.match(/<(.+?)>/) || row.from_addr?.match(/^([^\s]+)$/);
      const email = (match ? match[1] : row.from_addr || "").toLowerCase().trim();
      const dept = emailDeptMap.get(email) || null;
      if (dept) {
        await pool.query("UPDATE smart_email_inbox SET department=$1 WHERE uid=$2", [dept, row.uid]);
      }
    }

    // Pass 2: infer department from email prefix for any still-unassigned internal emails
    const stillUnassigned = await pool.query(
      "SELECT uid, from_addr FROM smart_email_inbox WHERE is_internal=true AND (department IS NULL OR department='')"
    );
    for (const row of stillUnassigned.rows) {
      const match = row.from_addr?.match(/<(.+?)>/) || row.from_addr?.match(/^([^\s]+)$/);
      const email = (match ? match[1] : row.from_addr || "").toLowerCase().trim();
      const inferred = inferDeptFromEmail(email);
      if (inferred) {
        await pool.query("UPDATE smart_email_inbox SET department=$1 WHERE uid=$2", [inferred, row.uid]);
      }
    }

    // 4. Keyword re-classify all non-internal emails
    await pool.query(
      `UPDATE smart_email_inbox SET category='other', project_name=NULL, supplier_name=NULL
       WHERE is_internal=false AND category IN ('project','supplier')`
    );
    const allProjects = await pool.query("SELECT name, keywords FROM smart_email_projects");
    const allSuppliers = await pool.query("SELECT name, domain, keywords FROM smart_email_suppliers");
    const emailRows = await pool.query(
      "SELECT uid, from_addr, subject, body_text, body_html FROM smart_email_inbox WHERE is_internal=false"
    );
    for (const em of emailRows.rows) {
      const bodySnippet = em.body_text || (em.body_html ? em.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");
      const kwMatch = await tryKeywordClassify(
        em.subject || "", em.from_addr || "", bodySnippet,
        allProjects.rows, allSuppliers.rows
      );
      if (kwMatch) {
        await pool.query(
          `UPDATE smart_email_inbox SET category=$1, project_name=$2, supplier_name=$3, classified=true WHERE uid=$4`,
          [kwMatch.category, kwMatch.project_name, kwMatch.supplier_name, em.uid]
        );
      }
    }
    console.log("ERP sync complete");
  } catch (err: any) {
    console.error("ERP auto-sync error:", err.message);
  } finally {
    erpSyncRunning = false;
  }
}

// Trigger ERP sync on startup (non-blocking, after 5s delay)
setTimeout(() => syncErpData().catch(() => {}), 5000);

export default router;
