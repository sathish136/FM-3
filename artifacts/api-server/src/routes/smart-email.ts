import { Router } from "express";
import nodemailer from "nodemailer";
import pg from "pg";
import OpenAI from "openai";

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

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_inbox (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
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

async function classifyWithAI(subject: string, fromAddr: string, bodySnippet: string) {
  const isInternal = checkInternal(fromAddr);
  const domain = extractDomain(fromAddr);

  const projects = await pool.query("SELECT name, keywords FROM smart_email_projects");
  const suppliers = await pool.query("SELECT name, domain, keywords FROM smart_email_suppliers");

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
    gmailUser: row.gmail_user,
    gmailAppPassword: row.gmail_app_password?.replace(/\s/g, ""),
    emailAddress: row.email_address || row.gmail_user,
  };
}

async function sendEmail(account: { gmailUser: string; gmailAppPassword: string; emailAddress: string }, to: string, subject: string, html: string) {
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
  });
}

const classifyQueue = new Set<string>();

async function classifyEmailRecord(uid: string) {
  if (classifyQueue.has(uid)) return;
  classifyQueue.add(uid);
  try {
    const res = await pool.query("SELECT * FROM smart_email_inbox WHERE uid=$1", [uid]);
    const email = res.rows[0];
    if (!email || email.classified) return;

    const bodySnippet = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");
    const classification = await classifyWithAI(email.subject || "", email.from_addr || "", bodySnippet);

    await pool.query(
      `UPDATE smart_email_inbox SET
        email_type=$1, category=$2, project_name=$3, supplier_name=$4,
        priority=$5, is_internal=$6, classified=true
       WHERE uid=$7`,
      [classification.email_type, classification.category, classification.project_name,
       classification.supplier_name, classification.priority, classification.is_internal, uid]
    );

    if (classification.email_type === "important" && classification.priority === "high") {
      triggerAutoReply(uid).catch(() => {});
    }
  } finally {
    classifyQueue.delete(uid);
  }
}

async function triggerAutoReply(uid: string) {
  const res = await pool.query("SELECT * FROM smart_email_inbox WHERE uid=$1", [uid]);
  const email = res.rows[0];
  if (!email) return;

  const existingDraft = await pool.query("SELECT id FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [uid]);
  if (existingDraft.rows.length > 0) return;

  const bodyText = email.body_text || (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You are the assistant to the Managing Director of WTT International, a water treatment technology company. Write a brief, professional acknowledgment reply. Keep it under 4 sentences. Do not make specific commitments. Just acknowledge receipt and say the MD will respond shortly.`,
      },
      {
        role: "user",
        content: `Email from: ${email.from_addr}\nSubject: ${email.subject}\nBody: ${bodyText.slice(0, 800)}`,
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
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /smart-email/messages
router.get("/smart-email/messages", async (req, res) => {
  const { filter, value, search } = req.query as Record<string, string>;
  try {
    let where = "WHERE 1=1";
    const vals: any[] = [];

    let fromClause = `FROM smart_email_inbox e
       LEFT JOIN (SELECT email_uid FROM smart_email_drafts WHERE sent=false) d ON d.email_uid = e.uid`;

    if (filter === "important")    { where += " AND email_type='important'"; }
    else if (filter === "promotion")  { where += " AND email_type='promotion'"; }
    else if (filter === "information") { where += " AND email_type='information'"; }
    else if (filter === "internal")   { where += " AND is_internal=true"; }
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

    if (search) {
      vals.push(`%${search}%`);
      where += ` AND (subject ILIKE $${vals.length} OR from_addr ILIKE $${vals.length})`;
    }

    const result = await pool.query(
      `SELECT e.uid, e.subject, e.from_addr, e.to_addr, e.cc_addr, e.email_date, e.seen, e.has_attachment,
              e.email_type, e.category, e.project_name, e.supplier_name, e.is_internal, e.priority,
              e.auto_replied, e.classified,
              LEFT(e.body_text, 200) AS snippet,
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
router.get("/smart-email/stats", async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NOT seen) AS unread,
        COUNT(*) FILTER (WHERE email_type='important') AS important,
        COUNT(*) FILTER (WHERE email_type='information') AS information,
        COUNT(*) FILTER (WHERE email_type='promotion') AS promotion,
        COUNT(*) FILTER (WHERE category='project') AS projects,
        COUNT(*) FILTER (WHERE category='supplier') AS suppliers,
        COUNT(*) FILTER (WHERE is_internal=true) AS internal,
        COUNT(*) FILTER (WHERE priority='high' AND NOT auto_replied) AS needs_reply,
        COUNT(*) FILTER (WHERE auto_replied=true) AS auto_replied_count,
        COUNT(*) AS total,
        (SELECT COUNT(*) FROM smart_email_drafts WHERE sent=false) AS drafts_count
      FROM smart_email_inbox
    `);
    const projects = await pool.query(
      `SELECT project_name, COUNT(*) as count FROM smart_email_inbox WHERE category='project' AND project_name IS NOT NULL GROUP BY project_name ORDER BY count DESC`
    );
    const suppliers = await pool.query(
      `SELECT supplier_name, COUNT(*) as count FROM smart_email_inbox WHERE category='supplier' AND supplier_name IS NOT NULL GROUP BY supplier_name ORDER BY count DESC LIMIT 20`
    );
    res.json({
      stats: r.rows[0],
      projects: projects.rows,
      suppliers: suppliers.rows,
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
  try {
    const cached = await pool.query(`
      SELECT e.uid::text as uid, e.subject, e.from_addr, e.to_addr, e.cc_addr,
             e.email_date, e.body_text, e.body_html, e.seen, e.has_attachment
      FROM email_cache e
      WHERE e.folder_path = 'INBOX'
      ORDER BY e.email_date DESC NULLS LAST
      LIMIT 200
    `);

    let ingested = 0;
    for (const row of cached.rows) {
      await pool.query(
        `INSERT INTO smart_email_inbox
          (uid, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html, seen, has_attachment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (uid) DO UPDATE SET
           seen=$9, body_text=COALESCE(EXCLUDED.body_text, smart_email_inbox.body_text),
           body_html=COALESCE(EXCLUDED.body_html, smart_email_inbox.body_html)`,
        [row.uid, row.subject, row.from_addr, row.to_addr, row.cc_addr,
         row.email_date, row.body_text, row.body_html, row.seen, row.has_attachment]
      );
      ingested++;
    }

    const unclassified = await pool.query(
      "SELECT uid FROM smart_email_inbox WHERE NOT classified ORDER BY email_date DESC LIMIT 30"
    );
    for (const r of unclassified.rows) {
      classifyEmailRecord(r.uid).catch(() => {});
    }

    res.json({ ok: true, ingested, classifying: unclassified.rows.length });
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

// POST /smart-email/classify-batch — classify all unclassified
router.post("/smart-email/classify-batch", async (_req, res) => {
  try {
    const rows = await pool.query(
      "SELECT uid FROM smart_email_inbox WHERE NOT classified ORDER BY email_date DESC LIMIT 50"
    );
    for (const r of rows.rows) {
      classifyEmailRecord(r.uid).catch(() => {});
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
router.post("/smart-email/send", async (req, res) => {
  const { to, subject, html, userEmail, replyToUid } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "to and subject required" });
  try {
    const account = await getAccount(userEmail);
    await sendEmail(account, to, subject, html || "");
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
  try {
    await triggerAutoReply(req.params.uid);
    const draft = await pool.query("SELECT * FROM smart_email_drafts WHERE email_uid=$1 AND sent=false", [req.params.uid]);
    res.json({ ok: true, draft: draft.rows[0] || null });
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
  const { edited_text } = req.body;
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

    const account = await getAccount();
    await sendEmail(account, draft.to_addr, draft.subject, htmlBody);

    await pool.query("UPDATE smart_email_drafts SET sent=true, sent_at=NOW() WHERE email_uid=$1 AND sent=false", [req.params.uid]);
    await pool.query("UPDATE smart_email_inbox SET auto_replied=true, auto_reply_sent_at=NOW() WHERE uid=$1", [req.params.uid]);

    res.json({ ok: true, sent_to: draft.to_addr });
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

// DELETE /smart-email/:uid
router.delete("/smart-email/:uid", async (req, res) => {
  try {
    await pool.query("DELETE FROM smart_email_inbox WHERE uid=$1", [req.params.uid]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
