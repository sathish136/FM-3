import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, resolve as pathResolve, basename } from "path";
import nodemailer from "nodemailer";
import PizZip from "pizzip";

const router = Router();

const PROPOSAL_ROOT = pathResolve(
  process.env.PROPOSAL_WIZARD_DIR ||
    join(process.cwd(), "..", "..", "Proposal", "BANGLADESH PROPOSALS"),
);

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

/**
 * For XLSX files (ZIP-based): use PizZip to replace "COMPANY NAME" in all
 * XML text files inside the archive. Supports any length replacement.
 */
function processXlsx(filePath: string, customerName: string): Buffer {
  const raw = readFileSync(filePath);
  const zip = new PizZip(raw);

  const textExtensions = [".xml", ".rels"];
  Object.keys(zip.files).forEach((name) => {
    if (!textExtensions.some((ext) => name.toLowerCase().endsWith(ext))) return;
    const file = zip.file(name);
    if (!file || file.dir) return;
    try {
      const content = file.asText();
      if (!content.includes("COMPANY NAME")) return;
      const updated = content.replace(/COMPANY NAME/gi, customerName.toUpperCase().trim());
      zip.file(name, updated);
    } catch {
      // skip binary files inside the zip
    }
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * For old binary .doc (OLE2/CFB) files: the text is stored as raw ASCII bytes
 * inside the compound file. We do a byte-level find-and-replace maintaining the
 * EXACT same byte length so the OLE2 sector structure and piece-table offsets
 * stay intact. Replacement is padded with spaces if shorter, or truncated if longer.
 * "COMPANY NAME" is 12 ASCII characters — so the effective display limit is 12 chars.
 */
function processDoc(filePath: string, customerName: string): Buffer {
  const buf = readFileSync(filePath);
  const PLACEHOLDER = "COMPANY NAME"; // 12 chars
  const search = Buffer.from(PLACEHOLDER, "ascii");
  const len = search.length; // 12

  // Pad or truncate to exactly 12 ASCII chars (maintains byte count = safe)
  let replacement = customerName.toUpperCase().trim();
  if (replacement.length < len) {
    replacement = replacement.padEnd(len, " ");
  } else {
    replacement = replacement.slice(0, len);
  }
  const replBuf = Buffer.from(replacement, "ascii");

  const result = Buffer.from(buf);
  let pos = 0;
  while ((pos = result.indexOf(search, pos)) !== -1) {
    replBuf.copy(result, pos);
    pos += len;
  }
  return result;
}

/**
 * Build a modified copy of any supported file with COMPANY NAME replaced.
 */
function buildModifiedFile(filePath: string, customerName: string): Buffer {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".docx")) {
    return processXlsx(filePath, customerName);
  }
  if (lower.endsWith(".doc")) {
    return processDoc(filePath, customerName);
  }
  // Fallback: serve as-is
  return readFileSync(filePath);
}

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

// GET /api/proposal-wizard/download?flowRate=...&filename=...&customerName=...
router.get("/proposal-wizard/download", (req, res) => {
  const { flowRate, filename, customerName } = req.query as Record<string, string>;
  if (!flowRate || !filename) return res.status(400).json({ error: "flowRate and filename required" });

  const dir = safeJoin(PROPOSAL_ROOT, flowRate);
  if (!dir) return res.status(400).json({ error: "Invalid path" });

  const filePath = safeJoin(dir, filename);
  if (!filePath || !existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const customer = (customerName || "CUSTOMER").toUpperCase().trim();
  const renamedFilename = basename(filePath).replace(/COMPANY NAME/gi, customer);

  try {
    const modifiedBuf = buildModifiedFile(filePath, customer);
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
  const { flowRate, customerName, toEmail, toName, notes } = req.body as {
    flowRate: string;
    customerName: string;
    toEmail: string;
    toName?: string;
    notes?: string;
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

  const attachments = files.map((f) => {
    const filePath = join(dir, f);
    const content = buildModifiedFile(filePath, customer);
    return {
      filename: f.replace(/COMPANY NAME/gi, customer),
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
    subject: `Proposal Documents – ${customerName} – ${kld}`,
    html: `
      <p>Dear ${toName || customerName},</p>
      <p>Please find attached the proposal documents for your reference:</p>
      <ul>
        ${files.map((f) => `<li>${f.replace(/COMPANY NAME/gi, customer)}</li>`).join("")}
      </ul>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      <p>Regards,<br/>WTT International Private Limited</p>
    `,
    attachments,
  });

  res.json({ success: true, message: `Email sent to ${toEmail}` });
});

export default router;
