import { Router } from "express";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import pg from "pg";
import { simpleParser } from "mailparser";
import OpenAI from "openai";

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

const { Pool } = pg;

const emailPool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

// ─── DB setup ────────────────────────────────────────────────────────────────
async function initTables() {
  await emailPool.query(`
    CREATE TABLE IF NOT EXISTS email_cache (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      uid INTEGER NOT NULL,
      subject TEXT,
      from_addr TEXT,
      to_addr TEXT,
      cc_addr TEXT,
      email_date TIMESTAMPTZ,
      seen BOOLEAN NOT NULL DEFAULT false,
      starred BOOLEAN NOT NULL DEFAULT false,
      size INTEGER DEFAULT 0,
      has_attachment BOOLEAN NOT NULL DEFAULT false,
      body_html TEXT,
      body_text TEXT,
      body_fetched BOOLEAN NOT NULL DEFAULT false,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(account_id, folder_path, uid)
    )
  `);
  await emailPool.query(`
    CREATE TABLE IF NOT EXISTS email_folders_cache (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      name TEXT,
      flags TEXT,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(account_id, path)
    )
  `);
  await emailPool.query(`
    CREATE INDEX IF NOT EXISTS idx_email_cache_account_folder ON email_cache(account_id, folder_path)
  `);
  console.log("email cache tables ready");
}
initTables().catch(e => console.error("email cache table init error:", e.message));

// ─── Account lookup ───────────────────────────────────────────────────────────
type Account = { id: number; gmailUser: string; gmailAppPassword: string; emailAddress: string };

async function getAccount(userEmail?: string): Promise<Account> {
  let row: any = null;
  if (userEmail) {
    const res = await emailPool.query(
      "SELECT id, gmail_user, gmail_app_password, email_address FROM email_accounts WHERE assigned_to = $1 LIMIT 1",
      [userEmail]
    );
    row = res.rows[0] ?? null;
  }
  if (!row) {
    const res = await emailPool.query(
      "SELECT id, gmail_user, gmail_app_password, email_address FROM email_accounts WHERE is_default = true LIMIT 1"
    );
    row = res.rows[0] ?? null;
  }
  if (!row) {
    const envUser = process.env.GMAIL_USER;
    const envPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    if (!envUser || !envPass) throw new Error("No email account configured. Please add one in Email Settings.");
    return { id: 0, gmailUser: envUser, gmailAppPassword: envPass, emailAddress: envUser };
  }
  return {
    id: row.id,
    gmailUser: row.gmail_user,
    gmailAppPassword: row.gmail_app_password?.replace(/\s/g, ""),
    emailAddress: row.email_address || row.gmail_user,
  };
}

// ─── IMAP helpers ─────────────────────────────────────────────────────────────
function makeImapClient(user: string, pass: string) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

async function withImap<T>(user: string, pass: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = makeImapClient(user, pass);
  // Attach error listener immediately to prevent unhandled 'error' event crashing the process
  let connectionError: Error | null = null;
  client.on("error", (err: Error) => {
    connectionError = err;
  });
  try {
    await client.connect();
    if (connectionError) throw connectionError;
    return await fn(client);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("ETIMEOUT") || msg.includes("timeout") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      throw new Error("Cannot connect to Gmail IMAP — check your internet connection and that IMAP is enabled in Gmail settings.");
    }
    if (msg.includes("Command failed") || msg.includes("Invalid credentials") || msg.includes("AUTHENTICATIONFAILED") || msg.includes("Authentication") || msg.includes("[AUTH]")) {
      throw new Error("Gmail authentication failed — please check your Gmail App Password in Email Settings.");
    }
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }
}

function parseAddresses(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((a: any) => a.name ? `${a.name} <${a.address}>` : a.address).join(", ");
  if (raw.value) return parseAddresses(raw.value);
  return String(raw);
}

function detectAttachments(bodyStructure: any): boolean {
  if (!bodyStructure) return false;
  if (bodyStructure.disposition?.toLowerCase() === "attachment") return true;
  if (bodyStructure.type?.toLowerCase() === "application") return true;
  if (bodyStructure.childNodes) return bodyStructure.childNodes.some((c: any) => detectAttachments(c));
  return false;
}

// ─── Sync IMAP folder → DB ────────────────────────────────────────────────────
const syncInProgress = new Set<string>();

async function syncFolder(account: Account, folderPath: string): Promise<void> {
  const key = `${account.id}:${folderPath}`;
  if (syncInProgress.has(key)) return;
  syncInProgress.add(key);
  try {
    await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      const status = await client.status(folderPath, { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) return;

      const from = Math.max(1, total - 99);
      const range = `${from}:${total}`;

      // Fetch headers for all recent messages
      const rows: any[] = [];
      for await (const msg of client.fetch(range, {
        envelope: true,
        bodyStructure: true,
        flags: true,
        internalDate: true,
        size: true,
      })) {
        const env = msg.envelope;
        rows.push({
          uid: msg.uid,
          subject: env.subject || "(no subject)",
          from_addr: parseAddresses(env.from),
          to_addr: parseAddresses(env.to),
          cc_addr: parseAddresses(env.cc),
          email_date: env.date || msg.internalDate || null,
          seen: msg.flags?.has("\\Seen") ?? false,
          starred: msg.flags?.has("\\Flagged") ?? false,
          size: msg.size ?? 0,
          has_attachment: detectAttachments(msg.bodyStructure),
        });
      }

      // Find which UIDs are new (not yet in DB with body)
      const existingRes = await emailPool.query(
        `SELECT uid FROM email_cache WHERE account_id=$1 AND folder_path=$2 AND body_fetched=true`,
        [account.id, folderPath]
      );
      const existingWithBody = new Set(existingRes.rows.map((r: any) => r.uid));
      const newUids = rows.filter(r => !existingWithBody.has(r.uid)).map(r => r.uid);

      // Upsert headers first
      for (const r of rows) {
        await emailPool.query(
          `INSERT INTO email_cache
            (account_id, folder_path, uid, subject, from_addr, to_addr, cc_addr, email_date, seen, starred, size, has_attachment, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
           ON CONFLICT (account_id, folder_path, uid) DO UPDATE SET
             subject=$4, from_addr=$5, to_addr=$6, cc_addr=$7, email_date=$8,
             seen=$9, starred=$10, size=$11, has_attachment=$12, synced_at=NOW()`,
          [account.id, folderPath, r.uid, r.subject, r.from_addr, r.to_addr, r.cc_addr,
           r.email_date, r.seen, r.starred, r.size, r.has_attachment]
        );
      }

      // Fetch and store bodies for new emails (up to 50 at a time)
      const uidsToFetch = newUids.slice(0, 50);
      for (const uid of uidsToFetch) {
        try {
          const dl = await client.download(uid, undefined, { uid: true });
          if (!dl) continue;
          const chunks: Buffer[] = [];
          for await (const chunk of dl.content) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const raw = Buffer.concat(chunks);
          const parsed = await simpleParser(raw);
          await emailPool.query(
            `UPDATE email_cache SET body_html=$1, body_text=$2, body_fetched=true
             WHERE account_id=$3 AND folder_path=$4 AND uid=$5`,
            [parsed.html || null, parsed.text || null, account.id, folderPath, uid]
          );
        } catch {
          // Body fetch failed for this email — skip, headers still saved
        }
      }
    });
  } finally {
    syncInProgress.delete(key);
  }
}

async function syncFolders(account: Account): Promise<void> {
  const key = `folders:${account.id}`;
  if (syncInProgress.has(key)) return;
  syncInProgress.add(key);
  try {
    const list = await withImap(account.gmailUser, account.gmailAppPassword, async (client) => client.list());
    for (const f of list as any[]) {
      await emailPool.query(
        `INSERT INTO email_folders_cache (account_id, path, name, flags, synced_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (account_id, path) DO UPDATE SET name=$3, flags=$4, synced_at=NOW()`,
        [account.id, f.path, f.name, JSON.stringify(Array.from(f.flags || []))]
      );
    }
  } finally {
    syncInProgress.delete(key);
  }
}

// ─── DB read helpers ──────────────────────────────────────────────────────────
async function getEmailsFromDb(accountId: number, folderPath: string) {
  const res = await emailPool.query(
    `SELECT uid, subject, from_addr, to_addr, cc_addr, email_date, seen, starred, size, has_attachment
     FROM email_cache
     WHERE account_id=$1 AND folder_path=$2
     ORDER BY email_date DESC NULLS LAST, uid DESC
     LIMIT 100`,
    [accountId, folderPath]
  );
  return res.rows.map(r => ({
    uid: r.uid,
    seq: 0,
    subject: r.subject,
    from: r.from_addr,
    to: r.to_addr,
    cc: r.cc_addr || "",
    date: r.email_date ? new Date(r.email_date).toISOString() : null,
    seen: r.seen,
    starred: r.starred,
    size: r.size,
    hasAttachment: r.has_attachment,
  }));
}

async function getFoldersFromDb(accountId: number) {
  const res = await emailPool.query(
    `SELECT path, name, flags FROM email_folders_cache WHERE account_id=$1 ORDER BY path`,
    [accountId]
  );
  return res.rows.map(r => ({
    path: r.path,
    name: r.name,
    flags: JSON.parse(r.flags || "[]"),
  }));
}

async function dbHasEmails(accountId: number, folderPath: string): Promise<boolean> {
  const res = await emailPool.query(
    "SELECT 1 FROM email_cache WHERE account_id=$1 AND folder_path=$2 LIMIT 1",
    [accountId, folderPath]
  );
  return res.rows.length > 0;
}

async function dbHasFolders(accountId: number): Promise<boolean> {
  const res = await emailPool.query(
    "SELECT 1 FROM email_folders_cache WHERE account_id=$1 LIMIT 1",
    [accountId]
  );
  return res.rows.length > 0;
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = Router();

// GET /api/email/folders
router.get("/email/folders", async (req, res) => {
  try {
    const account = await getAccount(req.query.user as string | undefined);
    const cached = await dbHasFolders(account.id);

    if (cached) {
      const folders = await getFoldersFromDb(account.id);
      res.json(folders);
      // Background refresh
      syncFolders(account).catch(e => console.error("bg folder sync:", e.message));
    } else {
      // First time — foreground sync
      await syncFolders(account);
      const folders = await getFoldersFromDb(account.id);
      res.json(folders);
    }
  } catch (err: any) {
    console.error("folders error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/messages?mailbox=PATH&user=EMAIL
router.get("/email/messages", async (req, res) => {
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);
    const cached = await dbHasEmails(account.id, folderPath);

    if (cached) {
      const emails = await getEmailsFromDb(account.id, folderPath);
      res.json(emails);
      // Background refresh
      syncFolder(account, folderPath).catch(e => console.error("bg email sync:", e.message));
    } else {
      // First time — foreground sync
      await syncFolder(account, folderPath);
      const emails = await getEmailsFromDb(account.id, folderPath);
      res.json(emails);
    }
  } catch (err: any) {
    console.error("messages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/sync?mailbox=PATH&user=EMAIL — manual force sync
router.get("/email/sync", async (req, res) => {
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);
    await syncFolder(account, folderPath);
    const emails = await getEmailsFromDb(account.id, folderPath);
    res.json(emails);
  } catch (err: any) {
    console.error("sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/:uid/body?mailbox=PATH&user=EMAIL
router.get("/email/:uid/body", async (req, res) => {
  const uid = parseInt(req.params.uid);
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);

    // Check DB cache first
    const cached = await emailPool.query(
      "SELECT body_html, body_text, body_fetched FROM email_cache WHERE account_id=$1 AND folder_path=$2 AND uid=$3",
      [account.id, folderPath, uid]
    );
    if (cached.rows[0]?.body_fetched) {
      return res.json({ html: cached.rows[0].body_html, text: cached.rows[0].body_text });
    }

    // Fetch from IMAP using download + mailparser
    const result = await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      const dl = await client.download(uid, undefined, { uid: true });
      if (!dl) return { html: null, text: null };
      const chunks: Buffer[] = [];
      for await (const chunk of dl.content) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks);
      const parsed = await simpleParser(raw);
      return {
        html: parsed.html || null,
        text: parsed.text || null,
        subject: parsed.subject || null,
      };
    });

    // Cache the body
    await emailPool.query(
      `UPDATE email_cache SET body_html=$1, body_text=$2, body_fetched=true
       WHERE account_id=$3 AND folder_path=$4 AND uid=$5`,
      [result.html, result.text, account.id, folderPath, uid]
    );

    res.json({ html: result.html, text: result.text });
  } catch (err: any) {
    console.error("body error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/:uid/ai-summary — AI summarize email body
router.post("/email/:uid/ai-summary", async (req, res) => {
  const { bodyText, bodyHtml, subject } = req.body;
  const text = bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  if (!text) return res.status(400).json({ error: "No body content provided" });
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: "You are an email assistant. Summarize the email concisely in 2-3 sentences. Focus on key points, action items, and important details." },
        { role: "user", content: `Subject: ${subject || "No subject"}\n\n${text.slice(0, 3000)}` },
      ],
    });
    res.json({ summary: completion.choices[0]?.message?.content || "" });
  } catch (err: any) {
    console.error("ai-summary error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/:uid/ai-reply — AI generate reply suggestions
router.post("/email/:uid/ai-reply", async (req, res) => {
  const { bodyText, bodyHtml, subject, from } = req.body;
  const text = bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  if (!text) return res.status(400).json({ error: "No body content provided" });
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: 'Generate 3 short, professional reply options for this email. Return a JSON object with a "replies" key containing an array of 3 strings. Each reply should be concise (1-3 sentences) and differ in tone (formal, friendly, brief).' },
        { role: "user", content: `From: ${from}\nSubject: ${subject || "No subject"}\n\n${text.slice(0, 2000)}` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content || '{"replies":[]}';
    const parsed = JSON.parse(raw);
    const replies = parsed.replies || parsed.options || parsed.suggestions || Object.values(parsed)[0] || [];
    res.json({ replies: Array.isArray(replies) ? replies.slice(0, 3) : [] });
  } catch (err: any) {
    console.error("ai-reply error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/email/:uid/flags?mailbox=PATH&user=EMAIL
router.patch("/email/:uid/flags", async (req, res) => {
  const uid = parseInt(req.params.uid);
  const folderPath = (req.query.mailbox as string) || "INBOX";
  const { seen, starred } = req.body as { seen?: boolean; starred?: boolean };
  try {
    const account = await getAccount(req.query.user as string | undefined);

    // Update IMAP
    await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      if (seen !== undefined) {
        if (seen) await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
        else await client.messageFlagsRemove({ uid }, ["\\Seen"], { uid: true });
      }
      if (starred !== undefined) {
        if (starred) await client.messageFlagsAdd({ uid }, ["\\Flagged"], { uid: true });
        else await client.messageFlagsRemove({ uid }, ["\\Flagged"], { uid: true });
      }
    });

    // Update DB
    const sets: string[] = [];
    const vals: any[] = [];
    if (seen !== undefined) { sets.push(`seen=$${sets.length + 1}`); vals.push(seen); }
    if (starred !== undefined) { sets.push(`starred=$${sets.length + 1}`); vals.push(starred); }
    if (sets.length > 0) {
      vals.push(account.id, folderPath, uid);
      await emailPool.query(
        `UPDATE email_cache SET ${sets.join(",")} WHERE account_id=$${vals.length - 2} AND folder_path=$${vals.length - 1} AND uid=$${vals.length}`,
        vals
      );
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("flags error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/email/:uid?mailbox=PATH&user=EMAIL
router.delete("/email/:uid", async (req, res) => {
  const uid = parseInt(req.params.uid);
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);

    // Move to trash in IMAP
    await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      await client.messageMove({ uid }, "[Gmail]/Trash", { uid: true });
    });

    // Remove from DB cache (or move to trash folder in cache)
    await emailPool.query(
      "DELETE FROM email_cache WHERE account_id=$1 AND folder_path=$2 AND uid=$3",
      [account.id, folderPath, uid]
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error("delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/:uid/archive — move to All Mail (archive)
router.post("/email/:uid/archive", async (req, res) => {
  const uid = parseInt(req.params.uid);
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);
    await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      await client.messageMove({ uid }, "[Gmail]/All Mail", { uid: true });
    });
    await emailPool.query(
      "DELETE FROM email_cache WHERE account_id=$1 AND folder_path=$2 AND uid=$3",
      [account.id, folderPath, uid]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error("archive error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/ai-compose — AI improve draft
router.post("/email/ai-compose", async (req, res) => {
  const { subject, body, to } = req.body;
  if (!body && !subject) return res.status(400).json({ error: "No content provided" });
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 700,
      messages: [
        { role: "system", content: "You are a professional email writing assistant. Improve the user's email draft to be clearer, more professional, and polished. Preserve the intent and key information. Return only the improved email body text, no subject or extra commentary." },
        { role: "user", content: `To: ${to||""}\nSubject: ${subject||""}\n\nDraft:\n${body||""}` },
      ],
    });
    res.json({ draft: completion.choices[0]?.message?.content || body });
  } catch (err: any) {
    console.error("ai-compose error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send
router.post("/email/send", async (req, res) => {
  const { to, cc, bcc, subject, body, html, user: reqUser } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });
  try {
    const account = await getAccount(reqUser);
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: account.gmailUser, pass: account.gmailAppPassword },
    });
    const info = await transporter.sendMail({
      from: `FlowMatriX <${account.emailAddress}>`,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: body || "",
      html: html || undefined,
    });
    res.json({ messageId: info.messageId, accepted: info.accepted });
  } catch (err: any) {
    console.error("send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/check
router.get("/email/check", async (req, res) => {
  try {
    await getAccount(req.query.user as string | undefined);
    res.json({ configured: true });
  } catch {
    res.json({ configured: false });
  }
});

// GET /api/email/sync-status?mailbox=PATH&user=EMAIL
router.get("/email/sync-status", async (req, res) => {
  const folderPath = (req.query.mailbox as string) || "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);
    const key = `${account.id}:${folderPath}`;
    const syncing = syncInProgress.has(key);
    const last = await emailPool.query(
      "SELECT MAX(synced_at) as last FROM email_cache WHERE account_id=$1 AND folder_path=$2",
      [account.id, folderPath]
    );
    res.json({ syncing, lastSynced: last.rows[0]?.last ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy compatibility routes
router.get("/email/inbox", async (req, res) => {
  req.query.mailbox = "INBOX";
  const folderPath = "INBOX";
  try {
    const account = await getAccount(req.query.user as string | undefined);
    const cached = await dbHasEmails(account.id, folderPath);
    if (cached) {
      res.json(await getEmailsFromDb(account.id, folderPath));
      syncFolder(account, folderPath).catch(() => {});
    } else {
      await syncFolder(account, folderPath);
      res.json(await getEmailsFromDb(account.id, folderPath));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
