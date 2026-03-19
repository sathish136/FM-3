import { Router } from "express";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

const router = Router();

function getGmailConfig() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment secrets.");
  return { user, pass };
}

function createTransporter() {
  const { user, pass } = getGmailConfig();
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

async function withImap<T>(mailbox: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const { user, pass } = getGmailConfig();
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  await client.connect();
  try {
    await client.mailboxOpen(mailbox);
    return await fn(client);
  } finally {
    await client.logout();
  }
}

function parseAddresses(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((a: any) => a.name ? `${a.name} <${a.address}>` : a.address).join(", ");
  if (raw.value) return parseAddresses(raw.value);
  return String(raw);
}

function extractBody(parsed: any): string {
  if (!parsed) return "";
  if (parsed.text) return parsed.text;
  if (parsed.html) return parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (parsed.childNodes) {
    for (const child of parsed.childNodes) {
      const body = extractBody(child);
      if (body) return body;
    }
  }
  return "";
}

async function fetchMessages(mailbox: string, limit = 30) {
  return withImap(mailbox, async (client) => {
    const status = await client.status(mailbox, { messages: true });
    const total = status.messages ?? 0;
    if (total === 0) return [];

    const from = Math.max(1, total - limit + 1);
    const range = `${from}:${total}`;
    const messages: any[] = [];

    for await (const msg of client.fetch(range, {
      envelope: true,
      bodyStructure: true,
      flags: true,
      internalDate: true,
      size: true,
    })) {
      const env = msg.envelope;
      messages.unshift({
        uid: msg.uid,
        seq: msg.seq,
        subject: env.subject || "(no subject)",
        from: parseAddresses(env.from),
        to: parseAddresses(env.to),
        cc: parseAddresses(env.cc),
        date: (env.date || msg.internalDate)?.toISOString() ?? null,
        seen: msg.flags?.has("\\Seen") ?? false,
        size: msg.size,
        hasAttachment: false,
      });
    }
    return messages;
  });
}

// GET /api/email/inbox
router.get("/email/inbox", async (req, res) => {
  try {
    const messages = await fetchMessages("INBOX", 30);
    res.json(messages);
  } catch (err: any) {
    console.error("IMAP inbox error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/sent
router.get("/email/sent", async (req, res) => {
  try {
    const messages = await fetchMessages("[Gmail]/Sent Mail", 30);
    res.json(messages);
  } catch (err: any) {
    console.error("IMAP sent error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/:uid/body?mailbox=INBOX
router.get("/email/:uid/body", async (req, res) => {
  const uid = parseInt(req.params.uid);
  const mailbox = (req.query.mailbox as string) || "INBOX";
  try {
    const result = await withImap(mailbox, async (client) => {
      let html = "";
      let text = "";
      for await (const msg of client.fetch({ uid }, { bodyParts: ["TEXT", "1", "1.1", "1.2", "2"] }, { uid: true })) {
        for (const [, content] of msg.bodyParts ?? []) {
          const str = content.toString();
          if (str.trim().startsWith("<") || str.includes("<html")) html = str;
          else if (!text) text = str;
        }
      }
      return { html: html || null, text: text || null };
    });
    res.json(result);
  } catch (err: any) {
    console.error("IMAP body error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send
router.post("/email/send", async (req, res) => {
  const { to, cc, subject, body, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `FlowMatriX <${getGmailConfig().user}>`,
      to,
      cc: cc || undefined,
      subject,
      text: body || "",
      html: html || undefined,
    });
    res.json({ messageId: info.messageId, accepted: info.accepted });
  } catch (err: any) {
    console.error("SMTP send error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/check — verify credentials
router.get("/email/check", async (req, res) => {
  try {
    getGmailConfig();
    res.json({ configured: true });
  } catch {
    res.json({ configured: false });
  }
});

export default router;
