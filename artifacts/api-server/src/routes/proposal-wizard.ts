import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, resolve as pathResolve, basename } from "path";
import nodemailer from "nodemailer";
import PizZip from "pizzip";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const PROPOSAL_ROOT = pathResolve(
  process.env.PROPOSAL_WIZARD_DIR ||
    join(process.cwd(), "..", "..", "Proposal", "BANGLADESH PROPOSALS"),
);

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
 * Row id=1 is the single counter row (seeded on first request).
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
 * For XLSX files (ZIP-based): replace COMPANY NAME and WTT-BAN-0001 in all
 * XML entries inside the archive. Supports any-length company name.
 */
function processXlsx(filePath: string, customerName: string, wttNumber: string): Buffer {
  const raw = readFileSync(filePath);
  const zip = new PizZip(raw);

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
      if (changed) zip.file(name, content);
    } catch {
      // skip binary-only entries
    }
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * For old binary .doc (OLE2/CFB) files:
 * - COMPANY NAME (12 chars): pad/truncate to exact 12 bytes — maintains OLE2 sector integrity
 * - WTT-BAN-0001 (13 chars): always 13 chars (WTT-BAN-XXXX) — perfect same-length swap
 */
function processDoc(filePath: string, customerName: string, wttNumber: string): Buffer {
  const buf = readFileSync(filePath);
  const result = Buffer.from(buf);

  // Replace COMPANY NAME (12-char fixed placeholder)
  const cnSearch = Buffer.from("COMPANY NAME", "ascii");
  let cnReplacement = customerName.toUpperCase().trim();
  if (cnReplacement.length < 12) cnReplacement = cnReplacement.padEnd(12, " ");
  else cnReplacement = cnReplacement.slice(0, 12);
  const cnBuf = Buffer.from(cnReplacement, "ascii");
  let pos = 0;
  while ((pos = result.indexOf(cnSearch, pos)) !== -1) {
    cnBuf.copy(result, pos);
    pos += 12;
  }

  // Replace WTT-BAN-0001 (13 chars) with new number (always 13 chars — safe)
  const wttSearch = Buffer.from("WTT-BAN-0001", "ascii");
  const wttBuf = Buffer.from(wttNumber, "ascii"); // e.g. WTT-BAN-0002, always 12? No — WTT-BAN-XXXX = 12 chars
  // WTT-BAN-0001 = 12 chars, WTT-BAN-XXXX = 12 chars → exact match ✓
  pos = 0;
  while ((pos = result.indexOf(wttSearch, pos)) !== -1) {
    wttBuf.copy(result, pos);
    pos += wttSearch.length;
  }

  return result;
}

/** Build a modified copy of any supported file with replacements applied. */
function buildModifiedFile(filePath: string, customerName: string, wttNumber: string): Buffer {
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

// GET /api/proposal-wizard/counter — peek at the current counter without incrementing
router.get("/proposal-wizard/counter", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT counter FROM proposal_wizard_counter WHERE id = 1`);
    const counter = Number((rows as any).rows?.[0]?.counter ?? (rows as any)[0]?.counter ?? 1);
    res.json({ counter, next: formatWttNumber(counter + 1) });
  } catch (err) {
    res.status(500).json({ error: "Could not read counter" });
  }
});

// POST /api/proposal-wizard/assign-number — increment counter once, return the new WTT number
// Call this ONCE per proposal session; then pass the returned wttNumber to all file downloads.
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
// Pass wttNumber (from /assign-number) to reuse it without incrementing the counter.
// If wttNumber is omitted, a new counter value is assigned (fallback for standalone use).
router.get("/proposal-wizard/download", async (req, res) => {
  const { flowRate, filename, customerName, wttNumber: wttParam } = req.query as Record<string, string>;
  if (!flowRate || !filename) return res.status(400).json({ error: "flowRate and filename required" });

  const dir = safeJoin(PROPOSAL_ROOT, flowRate);
  if (!dir) return res.status(400).json({ error: "Invalid path" });

  const filePath = safeJoin(dir, filename);
  if (!filePath || !existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const customer = (customerName || "CUSTOMER").toUpperCase().trim();

  try {
    // Use pre-assigned number if provided; otherwise mint a new one
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

// POST /api/proposal-wizard/send-email
router.post("/proposal-wizard/send-email", async (req, res) => {
  const { flowRate, customerName, toEmail, toName, notes, wttNumber: wttParam } = req.body as {
    flowRate: string;
    customerName: string;
    toEmail: string;
    toName?: string;
    notes?: string;
    wttNumber?: string;
  };

  if (!flowRate || !customerName || !toEmail) {
    return res.status(400).json({ error: "flowRate, customerName and toEmail required" });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return res.status(503).json({ error: "Email not configured on server" });
  }

  const dir = safeJoin(PROPOSAL_ROOT, flowRate);
  if (!dir) return res.status(400).json({ error: "Invalid flow rate" });

  const files = getFilesInFolder(flowRate);
  if (files.length === 0) return res.status(404).json({ error: "No files found for flow rate" });

  const customer = customerName.toUpperCase().trim();

  // Use pre-assigned number if provided; otherwise mint a new one
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
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const kld = flowRate.replace(/[^0-9A-Za-z\s]/g, "").trim();

  await transporter.sendMail({
    from: `WTT International <${gmailUser}>`,
    to: toEmail,
    subject: `Proposal Documents – ${customerName} – ${kld} – ${wttNumber}`,
    html: `
      <p>Dear ${toName || customerName},</p>
      <p>Please find attached the proposal documents for your reference:</p>
      <ul>
        ${files.map((f) => `<li>${buildFilename(f, customer, wttNumber)}</li>`).join("")}
      </ul>
      <p><strong>Reference:</strong> ${wttNumber}</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      <p>Regards,<br/>WTT International Private Limited</p>
    `,
    attachments,
  });

  res.json({ success: true, message: `Email sent to ${toEmail}`, wttNumber });
});

export default router;
