import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve as pathResolve, basename, extname } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
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
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const attachmentRows = filenames.map((f, i) => {
    const isPdf = f.toLowerCase().endsWith(".pdf");
    const isXls = f.toLowerCase().endsWith(".xlsx") || f.toLowerCase().endsWith(".xls");
    const icon = isPdf
      ? `<span style="display:inline-block;background:#e53e3e;color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;letter-spacing:.5px;margin-right:10px;vertical-align:middle">PDF</span>`
      : isXls
      ? `<span style="display:inline-block;background:#276749;color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;letter-spacing:.5px;margin-right:10px;vertical-align:middle">XLS</span>`
      : `<span style="display:inline-block;background:#2b6cb0;color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;letter-spacing:.5px;margin-right:10px;vertical-align:middle">DOC</span>`;
    const label = f.replace(/\.[^/.]+$/, "");
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8edf2;font-size:13px;color:#2d3748;vertical-align:middle">
          <span style="display:inline-block;width:22px;height:22px;background:#ebf4ff;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#2b6cb0;margin-right:10px;vertical-align:middle">${i + 1}</span>
          ${icon}
          <span style="vertical-align:middle">${label}</span>
        </td>
      </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:30px 0">
  <tr><td align="center">
  <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.09)">

    <!-- Header banner -->
    <tr>
      <td style="background:linear-gradient(135deg,#1a365d 0%,#2b6cb0 100%);padding:32px 36px 28px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px">WTT INTERNATIONAL</div>
              <div style="font-size:11px;color:#bee3f8;margin-top:4px;letter-spacing:.5px">WATER TREATMENT TECHNOLOGIES</div>
            </td>
            <td align="right" style="vertical-align:top">
              <div style="background:rgba(255,255,255,0.15);border-radius:6px;padding:6px 14px;display:inline-block">
                <div style="font-size:10px;color:#bee3f8;letter-spacing:.5px">PROPOSAL NO.</div>
                <div style="font-size:15px;font-weight:700;color:#ffffff;margin-top:2px">${wttNumber}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Date bar -->
    <tr>
      <td style="background:#ebf8ff;padding:10px 36px;border-bottom:1px solid #bee3f8">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#2c5282;font-weight:600">Proposal Documents</td>
            <td align="right" style="font-size:12px;color:#4a5568">Date: ${dateStr}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 36px 24px">
        <p style="margin:0 0 6px;font-size:15px;color:#2d3748">Dear Sir / Madam,</p>
        <p style="margin:0 0 20px;font-size:13px;color:#718096">Greetings from <strong style="color:#2b6cb0">WTT International</strong>!</p>

        <p style="margin:0 0 20px;font-size:14px;color:#4a5568;line-height:1.75">
          With reference to the discussions your good selves had with our team, we are pleased to attach herewith the proposal documents for the supply of a
          <strong style="color:#1a365d">Sewage Treatment Plant</strong> of capacity
          <span style="background:#ebf8ff;color:#2b6cb0;font-weight:700;padding:2px 8px;border-radius:4px">${flowKld} M³/Day</span>
          with Foundational limit during Phase-1, Progressive limit during Phase-2, and ZLD-based Treatment scheme during Phase-3, for
          <strong style="color:#1a365d">M/s. ${customerName}</strong>.
        </p>

        <!-- Attachments box -->
        <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
          <div style="background:#edf2f7;padding:10px 14px;border-bottom:1px solid #e2e8f0">
            <span style="font-size:12px;font-weight:700;color:#4a5568;letter-spacing:.5px;text-transform:uppercase">Enclosed Documents</span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${attachmentRows}
          </table>
        </div>

        <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.75">
          We trust that the above documents meet your requirements. Please feel free to reach out for any clarifications or further information. We look forward to the opportunity of working with you.
        </p>

        <p style="margin:0;font-size:14px;color:#4a5568">Warm Regards,</p>
      </td>
    </tr>

    <!-- Signature -->
    <tr>
      <td style="padding:0 36px 32px">
        <table cellpadding="0" cellspacing="0" style="border-left:4px solid #2b6cb0;padding-left:16px">
          <tr><td style="font-size:16px;font-weight:700;color:#1a365d;padding-bottom:3px">Raja A</td></tr>
          <tr><td style="font-size:12px;color:#2b6cb0;font-weight:600;padding-bottom:6px">AGM – Proposals &amp; Business Development</td></tr>
          <tr><td style="font-size:12px;color:#718096;padding-bottom:2px">&#128222; +91 78450 09909</td></tr>
          <tr><td style="font-size:12px;color:#718096;padding-bottom:2px">&#9993; raja.a@wttint.com</td></tr>
          <tr><td style="font-size:12px;color:#718096">&#127760; www.wttindia.com</td></tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#1a365d;padding:16px 36px">
        <p style="margin:0;font-size:11px;color:#90cdf4;text-align:center">
          WTT International Pvt. Ltd. &nbsp;|&nbsp; Water Treatment Technologies &nbsp;|&nbsp; This email and attachments are confidential.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
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
  city = "",
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
      // Replace date placeholder "01-Jan-26" (9-char dash format)
      if (content.includes("01-Jan-26")) {
        content = content.replace(/01-Jan-26/g, todayShort());
        changed = true;
      }
      // Replace date placeholder "1-Jan-26" (no leading zero)
      if (content.includes("1-Jan-26")) {
        content = content.replace(/1-Jan-26/g, todayShort());
        changed = true;
      }
      // Replace CITY placeholder
      if (city && content.includes("CITY")) {
        content = content.replace(/\bCITY\b/g, city.toUpperCase().trim());
        changed = true;
      }
      // Strip ALL highlight and background-shading formatting from DOCX runs
      if (name.endsWith(".xml")) {
        const before = content;
        content = content
          .replace(/<w:highlight[^>]*>/gi, "")
          .replace(/<\/w:highlight>/gi, "")
          .replace(/<w:shd[^>]*>/gi, "")
          .replace(/<\/w:shd>/gi, "");
        if (content !== before) changed = true;
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
 * - CITY: variable-length splice; FIB ccpText updated to reflect char delta
 * - Yellow highlight (sprmCHighlight=0x2A0C, value=0x07): cleared to 0x00
 *
 * OLE2 layout assumptions (validated against template files):
 *   - FIB (Word 97) starts at raw offset 512 (first sector of WordDocument stream)
 *   - ccpText is at FIB+76 (raw offset 588), csw=14, cslw offset derives to 64+12=76
 *   - Text block starts at fcMin=2048; "\rCITY," address pattern at raw ~2592
 */
function processDoc(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city = "",
): Buffer {
  const buf = readFileSync(filePath);
  let result = Buffer.from(buf);

  function replaceAllInPlace(search: string, replacement: string): void {
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
  replaceAllInPlace("COMPANY NAME", cnReplacement);

  // Replace WTT-BAN-0001 (12 chars) with new number (WTT-BAN-XXXX, always 12 chars)
  replaceAllInPlace("WTT-BAN-0001", wttNumber);

  // Replace date "01-Jan-26" (9 chars) → today in DD-Mon-YY format (9 chars)
  replaceAllInPlace("01-Jan-26", todayShort());

  // Replace date "01.Jan.2026" (11 chars) → today in DD.Mon.YYYY format (11 chars)
  replaceAllInPlace("01.Jan.2026", todayLong());

  // Replace CITY placeholder — search for "\rCITY," to avoid matching "CAPACITY"
  if (city) {
    const cityUpper = city.toUpperCase().trim();
    const searchPat = Buffer.from("\x0dCITY,", "binary"); // CR + CITY + comma = 6 bytes
    const replPat   = Buffer.from("\x0d" + cityUpper + ",", "binary");
    const cityPos   = result.indexOf(searchPat);
    if (cityPos !== -1) {
      const delta = replPat.length - searchPat.length;
      if (delta === 0) {
        replPat.copy(result, cityPos);
      } else {
        // Splice: rebuild buffer with variable-length city name
        result = Buffer.concat([
          result.subarray(0, cityPos),
          replPat,
          result.subarray(cityPos + searchPat.length),
        ]);
        // Update ccpText in the Word 97 FIB so the character count stays correct.
        // FIB starts at raw offset 512 (sector 0); ccpText is at FIB+76 = raw 588.
        // (csw=14 → FibRgW97 ends at FIB+61; cslw at FIB+62; FibRgLw97 at FIB+64;
        //  ccpText is the 4th long in FibRgLw97 = FIB+64+3*4 = FIB+76.)
        const CCPTEXT_RAW = 588;
        const ccpText = result.readInt32LE(CCPTEXT_RAW);
        result.writeInt32LE(ccpText + delta, CCPTEXT_RAW);
      }
    }
  }

  // Remove yellow highlighting: sprmCHighlight opcode 0x2A0C stored as [0x0C, 0x2A],
  // followed by value byte 0x07 (yellow). Replace with 0x00 (no highlight).
  {
    const hlSearch = Buffer.from([0x0c, 0x2a, 0x07]);
    const hlReplace = Buffer.from([0x0c, 0x2a, 0x00]);
    let pos = 0;
    while ((pos = result.indexOf(hlSearch, pos)) !== -1) {
      hlReplace.copy(result, pos);
      pos += 3;
    }
  }

  return result;
}

/** Build a modified copy of any supported file with all replacements applied. */
function buildModifiedFile(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city = "",
): Buffer {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".docx")) {
    return processXlsx(filePath, customerName, wttNumber, city);
  }
  if (lower.endsWith(".doc")) {
    return processDoc(filePath, customerName, wttNumber, city);
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
 * Convert a buffer (docx/xlsx) to PDF using LibreOffice headless.
 * Returns the PDF buffer, or the original buffer if conversion fails.
 */
function convertToPdf(content: Buffer, originalFilename: string): { buf: Buffer; filename: string } {
  const ext = extname(originalFilename).toLowerCase();
  if (ext !== ".docx" && ext !== ".doc") {
    return { buf: content, filename: originalFilename };
  }
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpIn = join(tmpdir(), `wtt_${uid}${ext}`);
  const pdfName = basename(tmpIn, ext) + ".pdf";
  const tmpOut = join(tmpdir(), pdfName);
  const loProfile = join(tmpdir(), `lo_profile_${uid}`);
  try {
    writeFileSync(tmpIn, content);
    execSync(
      `libreoffice --headless "-env:UserInstallation=file://${loProfile}" --convert-to pdf --outdir "${tmpdir()}" "${tmpIn}"`,
      { timeout: 90_000, stdio: "pipe" },
    );
    const pdfBuf = readFileSync(tmpOut);
    console.log(`[proposal-wizard] Converted ${originalFilename} → PDF (${pdfBuf.length} bytes)`);
    return {
      buf: pdfBuf,
      filename: originalFilename.replace(/\.(docx?|xlsx)$/i, ".pdf"),
    };
  } catch (err) {
    console.error("[proposal-wizard] PDF conversion failed, sending original:", (err as any)?.message ?? err);
    return { buf: content, filename: originalFilename };
  } finally {
    try { unlinkSync(tmpIn); } catch {}
    try { unlinkSync(tmpOut); } catch {}
    try { execSync(`rm -rf "${loProfile}"`, { stdio: "pipe" }); } catch {}
  }
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
    const raw = buildModifiedFile(filePath, customer, wttNumber, city || "");
    const renamedOrig = buildFilename(f, customer, wttNumber);
    const { buf, filename } = convertToPdf(raw, renamedOrig);
    return {
      filename,
      content: buf,
      contentType: filename.endsWith(".pdf") ? "application/pdf" : mimeFor(f),
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
      const raw = buildModifiedFile(filePath, customer, wttNumber, city || "");
      const renamedOrig = buildFilename(f, customer, wttNumber);
      const { buf, filename } = convertToPdf(raw, renamedOrig);
      return {
        filename,
        content: buf,
        contentType: filename.endsWith(".pdf") ? "application/pdf" : mimeFor(f),
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
