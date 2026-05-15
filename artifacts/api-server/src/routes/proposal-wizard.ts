import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, resolve as pathResolve, basename } from "path";
import nodemailer from "nodemailer";
import PizZip from "pizzip";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const PROPOSAL_ROOT = pathResolve(
  process.env.PROPOSAL_WIZARD_DIR ||
    join(process.cwd(), "..", "..", "Proposal", "BANGLADESH PROPOSALS"),
);

// ── date helpers ───────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
  // e.g. "15-May-26"  (9 chars, same as placeholder "01-Jan-26")
}

function todayLong(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`;
  // e.g. "15.May.2026"  (11 chars, same as placeholder "01.Jan.2026")
}

// ── helpers ────────────────────────────────────────────────────────────────

function safeJoin(base: string, ...parts: string[]): string | null {
  const full = pathResolve(join(base, ...parts));
  if (!full.startsWith(base)) return null;
  return full;
}

function getFlowRateFolders(): string[] {
  try {
    return readdirSync(PROPOSAL_ROOT)
      .filter((name) => {
        const p = join(PROPOSAL_ROOT, name);
        return statSync(p).isDirectory();
      })
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
  } catch {
    return [];
  }
}

function getFilesInFolder(folder: string): string[] {
  const dir = safeJoin(PROPOSAL_ROOT, folder);
  if (!dir) return [];
  try {
    return readdirSync(dir).filter((f) => {
      const p = join(dir, f);
      return statSync(p).isFile();
    });
  } catch {
    return [];
  }
}

function fileTypeLabel(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("technical spec")) return "Technical Spec";
  if (lower.includes("opex")) return "OPEX";
  if (lower.includes("proposal")) return "Proposal (T&C)";
  return "Document";
}

function mimeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/** Format counter as WTT-BAN-XXXX (zero-padded to 4 digits) */
function formatWttNumber(n: number): string {
  return `WTT-BAN-${String(n).padStart(4, "0")}`;
}

/**
 * Atomically increment the counter and return the NEW value.
 */
async function nextCounter(customer: string, flowRate: string): Promise<number> {
  const rows = await db.execute(sql`
    UPDATE proposal_wizard_counter
    SET counter = counter + 1,
        last_used_at = NOW(),
        last_customer = ${customer},
        last_flow_rate = ${flowRate}
    WHERE id = 1
    RETURNING counter
  `);
  const value = (rows as any).rows?.[0]?.counter ?? (rows as any)[0]?.counter;
  return Number(value);
}

/**
 * Extract KLD number from folder name, e.g. "300KLD - STP" → "300"
 */
function kldFromFolder(folder: string): string {
  const m = folder.match(/(\d+)\s*KLD/i);
  return m ? m[1] : folder;
}

// ── Mail Content template ──────────────────────────────────────────────────

function buildEmailHtml(
  customerName: string,
  flowKld: string,
  wttNumber: string,
  filenames: string[],
): string {
  const attachmentList = filenames
    .map((f, i) => {
      const nameWithoutExt = f.replace(/\.[^/.]+$/, "");
      return `<p style="margin:2px 0">${i + 1}. ${nameWithoutExt}</p>`;
    })
    .join("\n");

  return `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:700px;line-height:1.6">
  <p style="margin:4px 0">Dear Sir,</p>
  <p style="margin:12px 0">&nbsp;</p>
  <p style="margin:4px 0">Greetings from WTT INTERNATIONAL!!!</p>
  <p style="margin:12px 0">&nbsp;</p>
  <p style="margin:4px 0">With reference to the discussions your good selves had with our Team, we are attaching herewith the following document for the supply of Sewage Treatment Plant of capacity <strong>${flowKld} M3/Day</strong> with Foundational limit during Phase-1, Progressive limit during Phase-2 and ZLD based Treatment scheme during Phase-3 for M/s. <strong>${customerName}</strong>.</p>
  <p style="margin:12px 0">&nbsp;</p>
  ${attachmentList}
  <p style="margin:12px 0">&nbsp;</p>
  <p style="margin:4px 0">Kindly revert back for any other clarifications.</p>
  <p style="margin:12px 0">&nbsp;</p>
  <p style="margin:4px 0">Thanks &amp; Regards</p>
  <p style="margin:12px 0">&nbsp;</p>
  <p style="margin:4px 0"><strong>RAJA A</strong></p>
  <p style="margin:4px 0">AGM – PROPOSAL</p>
  <p style="margin:4px 0">7845009909</p>
  <p style="margin:4px 0">raja.a@wttint.com</p>
</div>
  `;
}

// ── document processing ────────────────────────────────────────────────────

/**
 * For XLSX files (ZIP-based): replace COMPANY NAME, WTT-BAN-0001, and date
 * strings in all XML entries. Supports any-length company name.
 */
function processXlsx(
  filePath: string,
  customerName: string,
  wttNumber: string,
): Buffer {
  const raw = readFileSync(filePath);
  const zip = new PizZip(raw);
  const dateL = todayLong(); // 11 chars e.g. "15.May.2026"

  Object.keys(zip.files).forEach((name) => {
    if (!name.toLowerCase().endsWith(".xml") && !name.toLowerCase().endsWith(".rels")) return;
    const file = zip.file(name);
    if (!file || file.dir) return;
    try {
      let content = file.asText();
      let changed = false;
      if (content.includes("COMPANY NAME")) {
        content = content.replace(/COMPANY NAME/gi, customerName.toUpperCase().trim());
        changed = true;
      }
      if (content.includes("WTT-BAN-0001")) {
        content = content.replace(/WTT-BAN-0001/g, wttNumber);
        changed = true;
      }
      // Replace date placeholder "01.Jan.2026" with today (same 11-char length)
      if (content.includes("01.Jan.2026")) {
        content = content.replace(/01\.Jan\.2026/g, dateL);
        changed = true;
      }
      if (changed) zip.file(name, content);
    } catch {
      // skip binary-only entries
    }
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * For old binary .doc (OLE2/CFB) files:
 * - COMPANY NAME (12 chars): pad/truncate to exact 12 bytes
 * - WTT-BAN-0001 (12 chars): always 12 chars (WTT-BAN-XXXX) — perfect same-length
 * - Date "01-Jan-26" (9 chars): replaced with today DD-Mon-YY (9 chars)
 * - Date "01.Jan.2026" (11 chars): replaced with today DD.Mon.YYYY (11 chars)
 */
function processDoc(
  filePath: string,
  customerName: string,
  wttNumber: string,
): Buffer {
  const buf = readFileSync(filePath);
  const result = Buffer.from(buf);

  function replaceAll(search: string, replacement: string): void {
    const searchBuf = Buffer.from(search, "ascii");
    const replBuf = Buffer.from(replacement, "ascii");
    let pos = 0;
    while ((pos = result.indexOf(searchBuf, pos)) !== -1) {
      replBuf.copy(result, pos);
      pos += searchBuf.length;
    }
  }

  // Replace COMPANY NAME (12-char fixed placeholder)
  let cnReplacement = customerName.toUpperCase().trim();
  if (cnReplacement.length < 12) cnReplacement = cnReplacement.padEnd(12, " ");
  else cnReplacement = cnReplacement.slice(0, 12);
  replaceAll("COMPANY NAME", cnReplacement);

  // Replace WTT-BAN-0001 (12 chars) with new number (WTT-BAN-XXXX, always 12 chars)
  replaceAll("WTT-BAN-0001", wttNumber);

  // Replace date "01-Jan-26" (9 chars) → today in DD-Mon-YY format (9 chars)
  replaceAll("01-Jan-26", todayShort());

  // Replace date "01.Jan.2026" (11 chars) → today in DD.Mon.YYYY format (11 chars)
  replaceAll("01.Jan.2026", todayLong());

  return result;
}

/** Build a modified copy of any supported file with all replacements applied. */
function buildModifiedFile(
  filePath: string,
  customerName: string,
  wttNumber: string,
): Buffer {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".docx")) {
    return processXlsx(filePath, customerName, wttNumber);
  }
  if (lower.endsWith(".doc")) {
    return processDoc(filePath, customerName, wttNumber);
  }
  return readFileSync(filePath);
}

/** Replace placeholders in a filename string. */
function buildFilename(original: string, customerName: string, wttNumber: string): string {
  return original
    .replace(/COMPANY NAME/gi, customerName.toUpperCase().trim())
    .replace(/WTT-BAN-0001/g, wttNumber);
}

/**
 * Record the sent proposal in the proposal_requests table so it appears
 * in the /proposals tracking dashboard.
 */
async function recordProposalRequest(params: {
  wttNumber: string;
  customerName: string;
  contactPerson: string;
  email: string;
  phone: string;
  flowRate: string;
  country: string;
  city: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO proposal_requests
         (proposal_no, company_name, city, country, contact_person, email, phone, system_option, flow_rate, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,'sent',$9)
       ON CONFLICT (proposal_no) DO NOTHING`,
      [
        params.wttNumber,
        params.customerName,
        params.city || "Bangladesh",
        params.country || "Bangladesh",
        params.contactPerson || params.customerName,
        params.email,
        params.phone || "",
        kldFromFolder(params.flowRate),
        `Bangladesh Wizard — ${params.wttNumber}`,
      ],
    );
  } catch (err) {
    // Non-fatal — log but don't fail the email send
    console.error("[proposal-wizard] recordProposalRequest error:", err);
  }
}

// ── routes ─────────────────────────────────────────────────────────────────

// GET /api/proposal-wizard/flow-rates
router.get("/proposal-wizard/flow-rates", (_req, res) => {
  const folders = getFlowRateFolders();
  res.json({ flowRates: folders });
});

// GET /api/proposal-wizard/files?flowRate=400KLD - STP
router.get("/proposal-wizard/files", (req, res) => {
  const flowRate = req.query.flowRate as string;
  if (!flowRate) return res.status(400).json({ error: "flowRate required" });
  const files = getFilesInFolder(flowRate);
  const result = files.map((f) => ({
    filename: f,
    label: fileTypeLabel(f),
    ext: f.split(".").pop()?.toUpperCase() || "",
  }));
  res.json({ files: result });
});

// GET /api/proposal-wizard/counter — peek without incrementing
router.get("/proposal-wizard/counter", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT counter FROM proposal_wizard_counter WHERE id = 1`);
    const counter = Number((rows as any).rows?.[0]?.counter ?? (rows as any)[0]?.counter ?? 1);
    res.json({ counter, next: formatWttNumber(counter + 1) });
  } catch {
    res.status(500).json({ error: "Could not read counter" });
  }
});

// POST /api/proposal-wizard/assign-number — increment once, return the new WTT number
router.post("/proposal-wizard/assign-number", async (req, res) => {
  const { customerName = "", flowRate = "" } = req.body as Record<string, string>;
  try {
    const counter = await nextCounter(customerName, flowRate);
    res.json({ wttNumber: formatWttNumber(counter), counter });
  } catch (err) {
    console.error("assign-number error:", err);
    res.status(500).json({ error: "Could not assign proposal number" });
  }
});

// GET /api/proposal-wizard/download?flowRate=...&filename=...&customerName=...&wttNumber=WTT-BAN-0001
router.get("/proposal-wizard/download", async (req, res) => {
  const { flowRate, filename, customerName, wttNumber: wttParam } = req.query as Record<string, string>;
  if (!flowRate || !filename) return res.status(400).json({ error: "flowRate and filename required" });

  const dir = safeJoin(PROPOSAL_ROOT, flowRate);
  if (!dir) return res.status(400).json({ error: "Invalid path" });

  const filePath = safeJoin(dir, filename);
  if (!filePath || !existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const customer = (customerName || "CUSTOMER").toUpperCase().trim();

  try {
    const wttNumber = wttParam && /^WTT-BAN-\d{4}$/.test(wttParam)
      ? wttParam
      : formatWttNumber(await nextCounter(customer, flowRate));

    const modifiedBuf = buildModifiedFile(filePath, customer, wttNumber);
    const renamedFilename = buildFilename(basename(filePath), customer, wttNumber);

    res.setHeader("Content-Type", mimeFor(filename));
    res.setHeader("Content-Disposition", `attachment; filename="${renamedFilename}"`);
    res.setHeader("Content-Length", modifiedBuf.length);
    res.end(modifiedBuf);
  } catch (err) {
    console.error("Error processing file for download:", err);
    res.status(500).json({ error: "Failed to process file" });
  }
});

// POST /api/proposal-wizard/send-email  (internal staff tool — accepts wttNumber param)
router.post("/proposal-wizard/send-email", async (req, res) => { try {
  const { flowRate, customerName, toEmail, toName, notes, wttNumber: wttParam, phone, city, country } = req.body as {
    flowRate: string;
    customerName: string;
    toEmail: string;
    toName?: string;
    notes?: string;
    wttNumber?: string;
    phone?: string;
    city?: string;
    country?: string;
  };

  if (!flowRate || !customerName || !toEmail) {
    return res.status(400).json({ error: "flowRate, customerName and toEmail required" });
  }

  const smtpUser = process.env.PROPOSAL_SMTP_USER;
  const smtpPass = process.env.PROPOSAL_SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    return res.status(503).json({ error: "Proposal email not configured on server" });
  }

  const dir = safeJoin(PROPOSAL_ROOT, flowRate);
  if (!dir) return res.status(400).json({ error: "Invalid flow rate" });

  const files = getFilesInFolder(flowRate);
  if (files.length === 0) return res.status(404).json({ error: "No files found for flow rate" });

  const customer = customerName.toUpperCase().trim();
  const wttNumber = wttParam && /^WTT-BAN-\d{4}$/.test(wttParam)
    ? wttParam
    : formatWttNumber(await nextCounter(customer, flowRate));

  const attachments = files.map((f) => {
    const filePath = join(dir, f);
    const content = buildModifiedFile(filePath, customer, wttNumber);
    return {
      filename: buildFilename(f, customer, wttNumber),
      content,
      contentType: mimeFor(f),
    };
  });

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const kld = kldFromFolder(flowRate);
  const emailHtml = buildEmailHtml(customer, kld, wttNumber, attachments.map((a) => a.filename));

  await transporter.sendMail({
    from: `WTT International <${smtpUser}>`,
    to: toEmail,
    subject: `Proposal Documents – ${customerName} – ${kld} KLD – ${wttNumber}`,
    html: emailHtml,
    attachments,
  });

  // Record in proposal_requests for tracking
  await recordProposalRequest({
    wttNumber,
    customerName: customer,
    contactPerson: toName || customer,
    email: toEmail,
    phone: phone || "",
    flowRate,
    country: country || "Bangladesh",
    city: city || "Bangladesh",
  });

  res.json({ success: true, message: `Email sent to ${toEmail}`, wttNumber });
  } catch (err: any) {
    console.error("send-email error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("534") || msg.includes("WebLoginRequired") || msg.includes("Invalid login")) {
      return res.status(503).json({ error: "Email delivery failed: Gmail credentials need to be refreshed. Please contact admin." });
    }
    res.status(500).json({ error: msg || "Failed to send email" });
  }
});

// POST /api/proposal-wizard/send-public  (public-facing wizard — no auth needed)
router.post("/proposal-wizard/send-public", async (req, res) => {
  try {
    const {
      flowRate, customerName, toEmail, contactPerson, phone, city, country, notes,
    } = req.body as {
      flowRate: string;
      customerName: string;
      toEmail: string;
      contactPerson?: string;
      phone?: string;
      city?: string;
      country?: string;
      notes?: string;
    };

    if (!flowRate || !customerName || !toEmail) {
      return res.status(400).json({ error: "flowRate, customerName and toEmail required" });
    }

    const smtpUser = process.env.PROPOSAL_SMTP_USER;
    const smtpPass = process.env.PROPOSAL_SMTP_PASSWORD;
    if (!smtpUser || !smtpPass) {
      return res.status(503).json({ error: "Proposal email not configured. Please contact WTT directly." });
    }

    const dir = safeJoin(PROPOSAL_ROOT, flowRate);
    if (!dir) return res.status(400).json({ error: "Invalid flow rate" });

    const files = getFilesInFolder(flowRate);
    if (files.length === 0) return res.status(404).json({ error: "No files found for selected flow rate" });

    const customer = customerName.toUpperCase().trim();
    const counter = await nextCounter(customer, flowRate);
    const wttNumber = formatWttNumber(counter);
    const kld = kldFromFolder(flowRate);

    const attachments = files.map((f) => {
      const filePath = join(dir, f);
      const content = buildModifiedFile(filePath, customer, wttNumber);
      return {
        filename: buildFilename(f, customer, wttNumber),
        content,
        contentType: mimeFor(f),
      };
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const emailHtml = buildEmailHtml(customer, kld, wttNumber, attachments.map((a) => a.filename));

    await transporter.sendMail({
      from: `WTT International <${smtpUser}>`,
      to: toEmail,
      subject: `Proposal – ${customerName} – ${kld} KLD STP – ${wttNumber}`,
      html: emailHtml,
      attachments,
    });

    // Record for tracking in /proposals dashboard
    await recordProposalRequest({
      wttNumber,
      customerName: customer,
      contactPerson: contactPerson || customer,
      email: toEmail,
      phone: phone || "",
      flowRate,
      country: country || "Bangladesh",
      city: city || "Bangladesh",
    });

    res.json({ success: true, wttNumber, message: `Proposal sent to ${toEmail}` });
  } catch (err: any) {
    console.error("send-public error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("534") || msg.includes("WebLoginRequired") || msg.includes("Invalid login")) {
      return res.status(503).json({ error: "Email delivery failed: Gmail credentials need to be refreshed. Please contact WTT." });
    }
    res.status(500).json({ error: msg || "Failed to send proposal" });
  }
});

export default router;
