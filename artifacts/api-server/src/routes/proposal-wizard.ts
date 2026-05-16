import { Router } from "express";
import { readdirSync, statSync, readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync, copyFileSync } from "fs";
import { join, resolve as pathResolve, basename, extname } from "path";
import { execSync } from "child_process";
import { tmpdir, homedir } from "os";
import nodemailer from "nodemailer";
import PizZip from "pizzip";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

// ── Font + Logo install (runs once at module load) ──────────────────────────

/**
 * Build a LibreOffice base profile at /tmp/lo_base_profile with:
 *  - Font substitution table mapping Microsoft font names → metric-compatible
 *    free alternatives (Liberation, Carlito, Caladea).
 *
 * Each conversion job copies this profile to a fresh temp dir so that
 * concurrent conversions never collide on the same LO lock file.
 */
function buildLoBaseProfile(fontsDir?: string): void {
  const baseProfile = "/tmp/lo_base_profile";
  const userDir = join(baseProfile, "user");
  const loFontsDir = join(userDir, "fonts");
  mkdirSync(userDir, { recursive: true });
  mkdirSync(loFontsDir, { recursive: true });

  // Copy downloaded metric-compatible fonts directly into the LO profile so
  // LibreOffice finds them without depending on the system fontconfig cache.
  if (fontsDir) {
    try {
      const ttfs = readdirSync(fontsDir).filter(n => n.toLowerCase().endsWith(".ttf"));
      for (const ttf of ttfs) {
        const dest = join(loFontsDir, ttf);
        if (!existsSync(dest)) {
          try { copyFileSync(join(fontsDir, ttf), dest); } catch {}
        }
      }
    } catch {}
  }

  // All document fonts → Roboto (proposal brand standard)
  const substitutions: [string, string][] = [
    ["Times New Roman",  "Roboto"],
    ["Arial",            "Roboto"],
    ["Arial Narrow",     "Roboto"],
    ["Courier New",      "Roboto"],
    ["Calibri",          "Roboto"],
    ["Calibri Light",    "Roboto"],
    ["Cambria",          "Roboto"],
    ["Cambria Math",     "Roboto"],
    ["Consolas",         "Roboto"],
    ["Segoe UI",         "Roboto"],
    ["Tahoma",           "Roboto"],
    ["Verdana",          "Roboto"],
    ["Georgia",          "Roboto"],
    ["Trebuchet MS",     "Roboto"],
    ["Impact",           "Roboto"],
    ["Comic Sans MS",    "Roboto"],
    ["Palatino Linotype","Roboto"],
    ["Book Antiqua",     "Roboto"],
    ["Garamond",         "Roboto"],
    ["Century Gothic",   "Roboto"],
    ["Microsoft Sans Serif", "Roboto"],
    ["DejaVu Sans",      "Roboto"],
    ["DejaVu Serif",     "Roboto"],
    ["Liberation Sans",  "Roboto"],
    ["Liberation Serif", "Roboto"],
    ["Carlito",          "Roboto"],
    ["Caladea",          "Roboto"],
  ];

  // ── CORRECT LibreOffice XCU format for font substitution ────────────────
  // Font substitution is a "set" node in OOR — each entry must be a <node>
  // (not a <prop>) under /org.openoffice.VCL/Settings/FontSubstitutions.
  // Using <prop> directly inside a set causes "bad set node" warnings and
  // the entire substitution table is silently ignored, making LO fall back
  // to DejaVu fonts which have very different metrics (36 pages → 39 pages).
  const subsNodes = substitutions
    .map(([from, to]) =>
      `      <node oor:name="${from}" oor:op="fuse">\n` +
      `        <prop oor:name="ReplaceFont"><value>${to}</value></prop>\n` +
      `        <prop oor:name="Always"><value>true</value></prop>\n` +
      `      </node>`,
    )
    .join("\n");

  const xcu =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<oor:items xmlns:oor="http://openoffice.org/2001/registry"\n` +
    `           xmlns:xs="http://www.w3.org/2001/XMLSchema"\n` +
    `           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n` +
    `  <item oor:path="/org.openoffice.VCL/Settings">\n` +
    `    <node oor:name="FontSubstitutions" oor:op="fuse">\n` +
    subsNodes + `\n` +
    `    </node>\n` +
    `  </item>\n` +
    `</oor:items>\n`;

  writeFileSync(join(userDir, "registrymodifications.xcu"), xcu, "utf8");
}

/** Check if a file is a valid TrueType font (magic bytes 0x00 0x01 0x00 0x00 or "OTTO") */
function isValidTtf(filePath: string): boolean {
  try {
    const buf = readFileSync(filePath);
    if (buf.length < 50_000) return false; // Real TTFs are at least 50 KB
    const magic = buf.readUInt32BE(0);
    return magic === 0x00010000 || magic === 0x4F54544F; // TrueType or OpenType
  } catch { return false; }
}

/**
 * Find the truetype directory for a Nix store font package.
 *
 * Does ONE fast `ls /nix/store/ | grep <pkgHint>` (top-level listing only,
 * no deep recursion) then checks the known font sub-paths in each match.
 * Returns the first directory that actually contains .ttf files.
 *
 * This replaces the old per-file glob approach (`ls /nix/store/*pkg*\/file`)
 * which had to expand the entire /nix/store listing for every font file —
 * timing out and leaving most fonts uninstalled.
 */
function findNixFontDir(pkgHint: string): string | null {
  try {
    const pkgList = execSync(
      `ls /nix/store/ 2>/dev/null | grep -m 15 "${pkgHint}"`,
      { stdio: "pipe", timeout: 12_000 },
    ).toString().trim();
    if (!pkgList) return null;

    for (const pkgDir of pkgList.split("\n").filter(Boolean)) {
      for (const sub of ["share/fonts/truetype", "share/fonts", "share/fonts/opentype"]) {
        const dir = `/nix/store/${pkgDir}/${sub}`;
        try {
          const files = readdirSync(dir);
          if (files.some(f => f.toLowerCase().endsWith(".ttf"))) return dir;
        } catch { /* not found, try next */ }
      }
    }
    return null;
  } catch { return null; }
}

// Defer font installation so it never blocks server startup / port binding.
setImmediate(function installAssetsOnce() {
  try {
    const fontsDir = join(homedir(), ".fonts");
    mkdirSync(fontsDir, { recursive: true });

    // Roboto — standard font for all proposal PDFs
    const ROBOTO_SOURCES = [
      "/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF",
      "/usr/share/fonts/truetype/roboto",
    ];
    let installed = 0;
    for (const srcDir of ROBOTO_SOURCES) {
      try {
        for (const filename of readdirSync(srcDir)) {
          if (!filename.toLowerCase().includes("roboto") || !filename.toLowerCase().endsWith(".ttf")) continue;
          const dest = join(fontsDir, filename);
          if (isValidTtf(dest)) continue;
          const src = join(srcDir, filename);
          if (!isValidTtf(src)) continue;
          try { copyFileSync(src, dest); installed++; } catch {}
        }
      } catch { /* dir not present */ }
    }

    // Nix / Replit fallback
    const nixRoboto = findNixFontDir("roboto");
    if (nixRoboto) {
      try {
        for (const filename of readdirSync(nixRoboto)) {
          if (!filename.toLowerCase().includes("roboto") || !filename.toLowerCase().endsWith(".ttf")) continue;
          const dest = join(fontsDir, filename);
          if (isValidTtf(dest)) continue;
          const src = join(nixRoboto, filename);
          if (!isValidTtf(src)) continue;
          try { copyFileSync(src, dest); installed++; } catch {}
        }
      } catch {}
    }

    if (installed > 0) {
      console.log(`[proposal-wizard] Installed ${installed} Roboto font files.`);
    }

    // Rebuild fontconfig cache so LibreOffice (which uses fontconfig) finds our fonts
    try { execSync(`fc-cache -f "${fontsDir}"`, { stdio: "pipe", timeout: 15_000 }); } catch {}

    // Rebuild the LO base profile with the updated fonts dir
    buildLoBaseProfile(fontsDir);
    console.log("[proposal-wizard] LibreOffice base profile ready.");

  } catch (e) {
    console.warn("[proposal-wizard] Asset install error:", e);
  }
});

// ── Logo base64 ─────────────────────────────────────────────────────────────
let LOGO_B64 = "";
try {
  const logoPath = join(process.cwd(), "..", "..", "artifacts", "pm-app", "public", "wtt-logo.png");
  LOGO_B64 = readFileSync(logoPath).toString("base64");
} catch {
  // fallback: try relative to CWD
  try {
    LOGO_B64 = readFileSync(join(process.cwd(), "../../artifacts/pm-app/public/wtt-logo.png")).toString("base64");
  } catch {}
}

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

/** Only proposal templates (.doc / .docx / .xlsx) — never other files from the folder. */
function getProposalTemplateFiles(folder: string): string[] {
  return getFilesInFolder(folder).filter((f) => /\.(docx?|xlsx)$/i.test(f));
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
  const logoImg = LOGO_B64
    ? `<img src="data:image/png;base64,${LOGO_B64}" alt="WTT International" style="display:block;height:80px;width:auto;margin:0 auto 8px auto">`
    : `<div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;text-align:center">WTT INTERNATIONAL</div>`;

  // Sort: PDFs first, then XLS/XLSX, then other
  const sortedFilenames = [...filenames].sort((a, b) => {
    const rank = (f: string) => {
      if (f.toLowerCase().endsWith(".pdf")) return 0;
      if (f.toLowerCase().endsWith(".xlsx") || f.toLowerCase().endsWith(".xls")) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });

  const attachmentRows = sortedFilenames.map((f, i) => {
    const isPdf = f.toLowerCase().endsWith(".pdf");
    const isXls = f.toLowerCase().endsWith(".xlsx") || f.toLowerCase().endsWith(".xls");
    const typeTag = isPdf ? "PDF" : isXls ? "XLS" : "DOC";
    const tagBg = isPdf ? "#c53030" : isXls ? "#276749" : "#2b6cb0";
    const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    const label = f.replace(/\.[^/.]+$/, "");
    return `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #e8edf2;font-size:13px;color:#2d3748;vertical-align:middle;font-family:'Roboto',Arial,sans-serif;background:${rowBg}">
          <table cellpadding="0" cellspacing="0" style="width:100%">
            <tr>
              <td style="width:28px;vertical-align:middle">
                <span style="display:inline-block;width:22px;height:22px;background:#ebf4ff;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#2b6cb0">${i + 1}</span>
              </td>
              <td style="width:46px;vertical-align:middle;padding-left:6px">
                <span style="display:inline-block;background:${tagBg};color:#fff;font-size:9px;font-weight:700;padding:3px 6px;border-radius:4px;letter-spacing:.8px">${typeTag}</span>
              </td>
              <td style="vertical-align:middle;padding-left:8px;font-size:12.5px;color:#2d3748;line-height:1.4">${label}</td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Roboto',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:30px 0">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.09)">

    <!-- Header: logo centered + dark band -->
    <tr>
      <td style="background:#1a365d;padding:0">
        <!-- White logo band -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="background:#ffffff;padding:18px 36px 14px">
              ${logoImg}
              <div style="font-size:10px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-family:'Roboto',Arial,sans-serif">Water Loving Technology</div>
            </td>
          </tr>
          <!-- Blue accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#1a365d 0%,#2b6cb0 100%);padding:10px 36px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#ffffff;font-family:'Roboto',Arial,sans-serif;letter-spacing:.5px">Proposal Documents</td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:5px;padding:4px 12px;display:inline-block">
                      <div style="font-size:9px;color:#bee3f8;letter-spacing:1px;font-family:'Roboto',Arial,sans-serif">PROPOSAL NO.</div>
                      <div style="font-size:14px;font-weight:700;color:#ffffff;font-family:'Roboto',Arial,sans-serif">${wttNumber}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Date bar -->
          <tr>
            <td style="background:#ebf8ff;padding:8px 36px;border-bottom:1px solid #bee3f8">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#2c5282;font-weight:500;font-family:'Roboto',Arial,sans-serif">WTT International Private Limited</td>
                  <td align="right" style="font-size:12px;color:#4a5568;font-family:'Roboto',Arial,sans-serif">Date: ${dateStr}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:28px 36px 20px;font-family:'Roboto',Arial,sans-serif">
        <p style="margin:0 0 6px;font-size:15px;color:#2d3748;font-family:'Roboto',Arial,sans-serif">Dear Sir / Madam,</p>
        <p style="margin:0 0 18px;font-size:13px;color:#718096;font-family:'Roboto',Arial,sans-serif">Greetings from <strong style="color:#2b6cb0">WTT International</strong>!</p>

        <p style="margin:0 0 18px;font-size:14px;color:#4a5568;line-height:1.8;font-family:'Roboto',Arial,sans-serif">
          With reference to the discussions your good selves had with our team, we are pleased to attach herewith the proposal documents for the supply of a
          <strong style="color:#1a365d">Sewage Treatment Plant</strong> of capacity
          <span style="background:#ebf8ff;color:#2b6cb0;font-weight:700;padding:2px 8px;border-radius:4px">${flowKld} M³/Day</span>
          with Foundational limit during Phase-1, Progressive limit during Phase-2, and ZLD-based Treatment scheme during Phase-3, for
          <strong style="color:#1a365d">M/s. ${customerName}</strong>.
        </p>

        <!-- Attachments box -->
        <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:22px">
          <div style="background:#edf2f7;padding:9px 14px;border-bottom:1px solid #e2e8f0">
            <span style="font-size:11px;font-weight:700;color:#4a5568;letter-spacing:.8px;text-transform:uppercase;font-family:'Roboto',Arial,sans-serif">Enclosed Documents</span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${attachmentRows}
          </table>
        </div>

        <p style="margin:0 0 22px;font-size:14px;color:#4a5568;line-height:1.8;font-family:'Roboto',Arial,sans-serif">
          We trust that the above documents meet your requirements. Please feel free to reach out for any clarifications or further information. We look forward to the opportunity of working with you.
        </p>

        <p style="margin:0;font-size:14px;color:#4a5568;font-family:'Roboto',Arial,sans-serif">Warm Regards,</p>
      </td>
    </tr>

    <!-- Signature -->
    <tr>
      <td style="padding:0 36px 30px;font-family:'Roboto',Arial,sans-serif">
        <table cellpadding="0" cellspacing="0" style="border-left:4px solid #2b6cb0;padding-left:16px">
          <tr><td style="font-size:16px;font-weight:700;color:#1a365d;padding-bottom:2px;font-family:'Roboto',Arial,sans-serif">Raja A</td></tr>
          <tr><td style="font-size:12px;color:#2b6cb0;font-weight:500;padding-bottom:6px;font-family:'Roboto',Arial,sans-serif">AGM – Proposals &amp; Business Development</td></tr>
          <tr><td style="font-size:12px;color:#718096;padding-bottom:2px;font-family:'Roboto',Arial,sans-serif">&#128222; +91 78450 09909</td></tr>
          <tr><td style="font-size:12px;color:#718096;padding-bottom:2px;font-family:'Roboto',Arial,sans-serif">&#9993; raja.a@wttint.com</td></tr>
          <tr><td style="font-size:12px;color:#718096;font-family:'Roboto',Arial,sans-serif">&#127760; www.wttindia.com</td></tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#1a365d;padding:14px 36px">
        <p style="margin:0;font-size:11px;color:#90cdf4;text-align:center;font-family:'Roboto',Arial,sans-serif;letter-spacing:.3px">
          WTT International Pvt. Ltd. &nbsp;|&nbsp; Water Loving Technology &nbsp;|&nbsp; This email and its attachments are confidential.
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
/** Excel date serial for a JS Date (days since Dec 30 1899, Excel's epoch). */
function excelSerial(d = new Date()): number {
  return Math.floor((d.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000);
}

// Template date serial = Jan 1, 2026 = 46023 (hardcoded in both OPEX & Technical Spec).
const TEMPLATE_DATE_SERIAL = 46023;

function processXlsx(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city = "",
): Buffer {
  const raw = readFileSync(filePath);
  const zip = new PizZip(raw);
  const dateL = todayLong(); // 11 chars e.g. "15.May.2026"
  const todaySerial = String(excelSerial());

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
      // Replace Excel date serial 46023 (Jan 1 2026 — the template placeholder)
      // with today's serial so date-formatted cells display today's date.
      const serialPattern = new RegExp(`<v>${TEMPLATE_DATE_SERIAL}</v>`, "g");
      if (serialPattern.test(content)) {
        content = content.replace(
          new RegExp(`<v>${TEMPLATE_DATE_SERIAL}</v>`, "g"),
          `<v>${todaySerial}</v>`,
        );
        changed = true;
      }
      // Replace CITY placeholder
      if (city && content.includes("CITY")) {
        content = content.replace(/\bCITY\b/g, city.toUpperCase().trim());
        changed = true;
      }
      // Strip highlight/shading in xlsx xml
      if (name.endsWith(".xml")) {
        const before = content;
        content = content
          .replace(/<w:highlight[^>]*>/gi, "")
          .replace(/<\/w:highlight>/gi, "")
          .replace(/<w:shd[^>]*>/gi, "")
          .replace(/<\/w:shd>/gi, "");
        if (content !== before) changed = true;
      }
      const roboto = applyRobotoToXml(content);
      if (roboto !== content) { content = roboto; changed = true; }
      if (changed) zip.file(name, content);
    } catch {
      // skip binary-only entries
    }
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * For old binary .doc (OLE2/CFB) files:
 * - COMPANY NAME (12 chars): pad/truncate to exact 12 bytes (same-length only)
 * - WTT-BAN-0001 (12 chars): always 12 chars (WTT-BAN-XXXX)
 * - Date "01-Jan-26" (9 chars) / "01.Jan.2026" (11 chars): same-length date swap
 * - CITY (4 chars in address block): pad/truncate to 4 bytes at "\rCITY,"
 * - Yellow highlight (sprmCHighlight): cleared to 0x00
 * - No buffer resizing — file stays valid for LibreOffice direct .doc → PDF
 *
 * OLE2 layout assumptions (validated against template files):
 *   - FIB (Word 97) starts at raw offset 512 (first sector of WordDocument stream)
 *   - ccpText is at FIB+76 (raw offset 588), csw=14, cslw offset derives to 64+12=76
 *   - Text block starts at fcMin=2048; "\rCITY," address pattern at raw ~2592
 */
/** Pad/truncate to exact byte length so OLE2 .doc structure is not resized (required for LO PDF export). */
function padAscii(value: string, length: number): string {
  const raw = Buffer.from(value.toUpperCase().trim(), "ascii");
  if (raw.length >= length) return raw.subarray(0, length).toString("ascii");
  return raw.toString("ascii") + " ".repeat(length - raw.length);
}

function processDoc(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city = "",
): Buffer {
  const buf = readFileSync(filePath);
  let result = Buffer.from(buf);

  function replaceAllInPlace(search: string, replacement: string): void {
    if (search.length !== replacement.length) {
      throw new Error(`processDoc: length mismatch "${search}" (${search.length}) vs "${replacement}" (${replacement.length})`);
    }
    const searchBuf = Buffer.from(search, "ascii");
    const replBuf = Buffer.from(replacement, "ascii");
    let pos = 0;
    while ((pos = result.indexOf(searchBuf, pos)) !== -1) {
      replBuf.copy(result, pos);
      pos += searchBuf.length;
    }
  }

  // Same-length only — keeps Word 97 binary valid for LibreOffice .doc → PDF
  replaceAllInPlace("COMPANY NAME", padAscii(customerName, 12));
  replaceAllInPlace("WTT-BAN-0001", wttNumber);
  replaceAllInPlace("01-Jan-26", todayShort());
  replaceAllInPlace("01.Jan.2026", todayLong());

  // Address line uses exactly 4-char "CITY" between CR and comma
  if (city) {
    const searchPat = Buffer.from("\x0dCITY,", "binary");
    const replPat = Buffer.from("\x0d" + padAscii(city, 4) + ",", "binary");
    const cityPos = result.indexOf(searchPat);
    if (cityPos !== -1) replPat.copy(result, cityPos);
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

const PROPOSAL_FONT = "Roboto";
/** Bullet/symbol fonts — keep original so list markers render */
const PRESERVE_FONT_NAMES = new Set(["Symbol", "Wingdings", "Webdings"]);

function shouldPreserveFont(fontAttrs: string): boolean {
  return [...PRESERVE_FONT_NAMES].some((f) => fontAttrs.includes(`"${f}"`));
}

/** Force Roboto on every w:rFonts run (Word body, headers, styles, tables). */
function applyRobotoToXml(content: string): string {
  let out = content;

  out = out.replace(/<w:rFonts[^/]*\/>/g, (tag) => {
    if (shouldPreserveFont(tag)) return tag;
    return `<w:rFonts w:ascii="${PROPOSAL_FONT}" w:hAnsi="${PROPOSAL_FONT}" w:cs="${PROPOSAL_FONT}" w:eastAsia="${PROPOSAL_FONT}"/>`;
  });

  // Spreadsheet + theme fonts
  out = out.replace(/<a:latin typeface="[^"]*"/g, `<a:latin typeface="${PROPOSAL_FONT}"`);
  out = out.replace(/<a:ea typeface="[^"]*"/g, `<a:ea typeface="${PROPOSAL_FONT}"`);
  out = out.replace(/<a:cs typeface="[^"]*"/g, `<a:cs typeface="${PROPOSAL_FONT}"`);
  out = out.replace(/<name val="(?!Roboto)[^"]+"/g, `<name val="${PROPOSAL_FONT}"`);

  return out;
}

/** Center header/body logo images (LO .doc→.docx often shifts anchored images left). */
function applyLogoCentering(content: string, xmlPath: string): string {
  const isHeader = /word\/header\d*\.xml$/i.test(xmlPath);
  if (!isHeader && !content.includes("<w:drawing>")) return content;

  // Paragraphs with inline logo — center alignment
  let out = content.replace(/(<w:p[ >][\s\S]*?<\/w:p>)/g, (para) => {
    if (!para.includes("<w:drawing>")) return para;
    const isLogoPara = para.includes("wp:inline") || /name="Image/i.test(para);
    if (!isLogoPara && isHeader) return para;
    if (/<w:jc\s/.test(para)) {
      return para.replace(/<w:jc\s[^/]*\/>/g, '<w:jc w:val="center"/>');
    }
    if (para.includes("<w:pPr>")) {
      return para.replace("<w:pPr>", '<w:pPr><w:jc w:val="center"/>');
    }
    return para.replace(/(<w:p(?:\s[^>]*)?>)/, "$1<w:pPr><w:jc w:val=\"center\"/></w:pPr>");
  });

  // Foreground anchored shapes (banner/logo) — page-centered, skip watermark (behindDoc="1")
  out = out.replace(/<wp:anchor\b[^>]*>[\s\S]*?<\/wp:anchor>/g, (anchor) => {
    if (/behindDoc="1"/.test(anchor)) return anchor;
    if (!/wp:positionH/.test(anchor)) return anchor;
    return anchor.replace(
      /<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/,
      '<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>',
    );
  });

  return out;
}

/** Apply placeholder substitutions, Roboto, and layout fixes to a docx zip. */
function patchDocxZip(
  zip: PizZip,
  customerName: string,
  wttNumber: string,
  city: string,
): void {
  const dateL = todayLong();
  const dateS = todayShort();
  const cnUpper = customerName.toUpperCase().trim();
  const cityUpper = city ? city.toUpperCase().trim() : "";

  Object.keys(zip.files).forEach((name) => {
    if (!name.toLowerCase().endsWith(".xml") && !name.toLowerCase().endsWith(".rels")) return;
    const file = zip.file(name);
    if (!file || (file as any).dir) return;
    let content = file.asText();
    let changed = false;

    if (content.includes("COMPANY NAME")) { content = content.replace(/COMPANY NAME/g, cnUpper); changed = true; }
    if (content.includes("WTT-BAN-0001")) { content = content.replace(/WTT-BAN-0001/g, wttNumber); changed = true; }
    if (content.includes("01.Jan.2026")) { content = content.replace(/01\.Jan\.2026/g, dateL); changed = true; }
    if (content.includes("01-Jan-26")) { content = content.replace(/01-Jan-26/g, dateS); changed = true; }
    if (content.includes("1-Jan-26")) { content = content.replace(/1-Jan-26/g, dateS); changed = true; }
    if (cityUpper && content.includes("CITY")) { content = content.replace(/\bCITY\b/g, cityUpper); changed = true; }
    if (content.includes('w:val="yellow"')) {
      content = content.replace(/<w:highlight w:val="yellow"\/>/g, "");
      changed = true;
    }

    const roboto = applyRobotoToXml(content);
    if (roboto !== content) { content = roboto; changed = true; }

    const centered = applyLogoCentering(content, name);
    if (centered !== content) { content = centered; changed = true; }

    if (changed) zip.file(name, content);
  });
}

function applyRobotoToDocx(docxBuf: Buffer): Buffer {
  const zip = new PizZip(docxBuf);
  let anyChanged = false;
  Object.keys(zip.files).forEach((name) => {
    if (!name.toLowerCase().endsWith(".xml")) return;
    const file = zip.file(name);
    if (!file || (file as any).dir) return;
    const content = file.asText();
    const patched = applyRobotoToXml(content);
    if (patched !== content) { zip.file(name, patched); anyChanged = true; }
  });
  if (!anyChanged) return docxBuf;
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
}

/** XLSX is a ZIP archive (PK header). */
function isXlsxBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function pdfFilenameFrom(originalFilename: string): string {
  return originalFilename.replace(/\.(docx?|xlsx|xls)$/i, ".pdf");
}

/**
 * Convert a buffer (doc/docx/xlsx) to PDF using LibreOffice headless.
 * Never returns Word/Excel — throws if PDF conversion fails.
 */
function convertToPdf(content: Buffer, originalFilename: string): { buf: Buffer; filename: string } {
  const ext = extname(originalFilename).toLowerCase();
  if (ext !== ".doc" && ext !== ".docx" && ext !== ".xlsx") {
    throw new Error(`Cannot convert to PDF: unsupported type ${ext}`);
  }
  const pdfFilename = pdfFilenameFrom(originalFilename);
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpIn = join(tmpdir(), `wtt_${uid}${ext}`);
  const pdfName = basename(tmpIn, ext) + ".pdf";
  const tmpOut = join(tmpdir(), pdfName);
  const loProfile = join(tmpdir(), `lo_profile_${uid}`);
  const baseProfile = "/tmp/lo_base_profile";
  try {
    execSync(`cp -r "${baseProfile}" "${loProfile}"`, { stdio: "pipe" });
  } catch { /* base profile may not exist — proceed without it */ }
  try {
    const patched =
      ext === ".docx" ? applyRobotoToDocx(content)
      : ext === ".xlsx" ? applyRobotoToDocx(content)
      : content;
    writeFileSync(tmpIn, patched);
    // Calc component required for .xlsx → PDF (writer-only installs cannot load spreadsheets)
    const pdfFilter = ext === ".xlsx" ? "pdf:calc_pdf_Export" : "pdf";
    execSync(
      `libreoffice --headless "-env:UserInstallation=file://${loProfile}" --convert-to "${pdfFilter}" --outdir "${tmpdir()}" "${tmpIn}"`,
      { timeout: 90_000, stdio: "pipe" },
    );
    if (!existsSync(tmpOut)) {
      const hint = ext === ".xlsx"
        ? " Install LibreOffice Calc: apt-get install -y libreoffice-calc-nogui"
        : "";
      throw new Error(`LibreOffice did not produce a PDF file.${hint}`);
    }
    const pdfBuf = readFileSync(tmpOut);
    if (!isPdfBuffer(pdfBuf)) {
      throw new Error("Conversion output is not a valid PDF");
    }
    console.log(`[proposal-wizard] Converted ${originalFilename} → ${pdfFilename} (${pdfBuf.length} bytes)`);
    return { buf: pdfBuf, filename: pdfFilename };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error("[proposal-wizard] PDF conversion failed:", msg);
    throw new Error(`PDF conversion failed for ${basename(originalFilename)}: ${msg}`);
  } finally {
    try { unlinkSync(tmpIn); } catch {}
    try { unlinkSync(tmpOut); } catch {}
    try { execSync(`rm -rf "${loProfile}"`, { stdio: "pipe" }); } catch {}
  }
}

/**
 * Legacy .doc → PDF: .doc → .docx (LO) → Roboto + substitutions + logo centering → PDF.
 * Always uses the docx pipeline so fonts and header logo match the brand template.
 */
function docToPdf(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city: string,
  renamedFilename: string,
): { buf: Buffer; filename: string } {
  const { buf: docxBuf } = docToDocx(filePath, customerName, wttNumber, city, renamedFilename);
  return convertToPdf(docxBuf, renamedFilename.replace(/\.doc$/i, ".docx"));
}

/**
 * Build one email attachment:
 * - Word (.doc / .docx) → PDF only
 * - Excel (.xlsx) → stays .xlsx (substitutions applied, not converted)
 */
function buildProposalAttachment(
  filePath: string,
  originalFilename: string,
  customerName: string,
  wttNumber: string,
  city: string,
): { filename: string; content: Buffer; contentType: string } {
  const renamedOrig = buildFilename(originalFilename, customerName, wttNumber);
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".xlsx")) {
    const buf = buildModifiedFile(filePath, customerName, wttNumber, city);
    if (!isXlsxBuffer(buf)) {
      throw new Error(`Attachment is not a valid Excel file: ${renamedOrig}`);
    }
    return {
      filename: renamedOrig,
      content: buf,
      contentType: mimeFor(renamedOrig),
    };
  }

  if (lower.endsWith(".doc")) {
    const pdf = docToPdf(filePath, customerName, wttNumber, city, renamedOrig);
    const filename = pdfFilenameFrom(pdf.filename);
    if (!isPdfBuffer(pdf.buf)) throw new Error(`Attachment is not PDF: ${filename}`);
    return { filename, content: pdf.buf, contentType: "application/pdf" };
  }

  if (lower.endsWith(".docx")) {
    const modifiedBuf = buildModifiedFile(filePath, customerName, wttNumber, city);
    const pdf = convertToPdf(modifiedBuf, renamedOrig);
    const filename = pdfFilenameFrom(pdf.filename);
    if (!isPdfBuffer(pdf.buf)) throw new Error(`Attachment is not PDF: ${filename}`);
    return { filename, content: pdf.buf, contentType: "application/pdf" };
  }

  throw new Error(`Unsupported template file: ${originalFilename}`);
}

/** Nodemailer attachments — PDF for Word, native .xlsx for Excel. */
function toNodemailerAttachments(
  items: { filename: string; content: Buffer; contentType: string }[],
): { filename: string; content: Buffer; contentType: string; contentDisposition: "attachment" }[] {
  return items.map((item) => {
    const lower = item.filename.toLowerCase();
    if (lower.endsWith(".pdf")) {
      if (!isPdfBuffer(item.content)) {
        throw new Error(`Refusing to attach invalid PDF: ${item.filename}`);
      }
      console.log(`[proposal-wizard] Email attachment: ${item.filename} (${item.content.length} bytes, PDF)`);
      return {
        filename: item.filename,
        content: item.content,
        contentType: "application/pdf",
        contentDisposition: "attachment" as const,
      };
    }
    if (lower.endsWith(".xlsx")) {
      if (!isXlsxBuffer(item.content)) {
        throw new Error(`Refusing to attach invalid Excel: ${item.filename}`);
      }
      console.log(`[proposal-wizard] Email attachment: ${item.filename} (${item.content.length} bytes, XLSX)`);
      return {
        filename: item.filename,
        content: item.content,
        contentType: mimeFor(item.filename),
        contentDisposition: "attachment" as const,
      };
    }
    throw new Error(`Refusing to attach unsupported file type: ${item.filename}`);
  });
}

/**
 * Convert a .doc file to a clean .docx by:
 *   Stage 1 — LibreOffice converts .doc → .docx (avoids binary corruption)
 *   Stage 2 — XML text replacements (company name, WTT number, date, city)
 * Returns the modified .docx buffer (no PDF step).
 */
function docToDocx(
  filePath: string,
  customerName: string,
  wttNumber: string,
  city: string,
  renamedFilename: string,
): { buf: Buffer; filename: string } {
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const baseProfile = "/tmp/lo_base_profile";
  const loProfile1 = join(tmpdir(), `lo_p1_${uid}`);
  const tmpOrig = join(tmpdir(), `wtt_${uid}_orig.doc`);
  const tmpDocx = join(tmpdir(), `wtt_${uid}_orig.docx`);
  const tmpMod  = join(tmpdir(), `wtt_${uid}_mod.docx`);

  try {
    // Stage 1: .doc → .docx via LibreOffice
    try { execSync(`cp -r "${baseProfile}" "${loProfile1}"`, { stdio: "pipe" }); } catch {}
    writeFileSync(tmpOrig, readFileSync(filePath));
    execSync(
      `libreoffice --headless "-env:UserInstallation=file://${loProfile1}" --convert-to docx --outdir "${tmpdir()}" "${tmpOrig}"`,
      { timeout: 90_000, stdio: "pipe" },
    );

    const zip = new PizZip(readFileSync(tmpDocx));
    patchDocxZip(zip, customerName, wttNumber, city);
    const docxBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    writeFileSync(tmpMod, docxBuf);

    const outFilename = renamedFilename.replace(/\.doc$/i, ".docx");
    console.log(`[proposal-wizard] docToDocx: ${basename(filePath)} → ${outFilename} (${docxBuf.length} bytes)`);
    return { buf: docxBuf, filename: outFilename };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error("[proposal-wizard] docToDocx failed:", msg);
    throw new Error(`Could not prepare document for PDF: ${basename(filePath)} (${msg})`);
  } finally {
    for (const f of [tmpOrig, tmpDocx, tmpMod]) { try { unlinkSync(f); } catch {} }
    try { execSync(`rm -rf "${loProfile1}"`, { stdio: "pipe" }); } catch {}
  }
}

interface ProposalSendJob {
  flowRate: string;
  customerName: string;
  toEmail: string;
  contactPerson: string;
  phone: string;
  city: string;
  country: string;
  notes?: string;
  wttNumber: string;
}

/** Build PDFs and send proposal email (slow — run in background). */
async function sendProposalEmailJob(job: ProposalSendJob): Promise<void> {
  const smtpUser = process.env.PROPOSAL_SMTP_USER;
  const smtpPass = process.env.PROPOSAL_SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) throw new Error("Proposal email not configured on server");

  const dir = safeJoin(PROPOSAL_ROOT, job.flowRate);
  if (!dir) throw new Error("Invalid flow rate");

  const files = getProposalTemplateFiles(job.flowRate);
  if (files.length === 0) throw new Error("No files found for selected flow rate");

  const customer = job.customerName.toUpperCase().trim();
  const kld = kldFromFolder(job.flowRate);

  console.log(`[proposal-wizard] Background send started: ${job.wttNumber} → ${job.toEmail}`);
  const built = files.map((f) =>
    buildProposalAttachment(join(dir, f), f, customer, job.wttNumber, job.city || ""),
  );
  const attachments = toNodemailerAttachments(built);

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const emailHtml = buildEmailHtml(customer, kld, job.wttNumber, attachments.map((a) => a.filename));

  await transporter.sendMail({
    from: `WTT INTERNATIONAL <${smtpUser}>`,
    to: job.toEmail,
    subject: `Proposal – ${job.customerName} – ${kld} KLD STP – ${job.wttNumber}`,
    html: emailHtml,
    attachments,
  });

  await updateProposalRequestStatus(job.wttNumber, "sent");
  console.log(`[proposal-wizard] Background send complete: ${job.wttNumber}`);
}

function queueProposalEmailJob(job: ProposalSendJob): void {
  setImmediate(() => {
    void sendProposalEmailJob(job).catch(async (err) => {
      const msg = (err as Error)?.message ?? String(err);
      console.error(`[proposal-wizard] Background send failed (${job.wttNumber}):`, msg);
      try {
        await updateProposalRequestStatus(job.wttNumber, "failed", msg.slice(0, 500));
      } catch (dbErr) {
        console.error("[proposal-wizard] Could not update failed status:", dbErr);
      }
    });
  });
}

async function updateProposalRequestStatus(
  wttNumber: string,
  status: string,
  errorNote?: string,
): Promise<void> {
  if (errorNote) {
    await pool.query(
      `UPDATE proposal_requests SET status = $1, notes = $2, updated_at = NOW() WHERE proposal_no = $3`,
      [status, errorNote, wttNumber],
    );
  } else {
    await pool.query(
      `UPDATE proposal_requests SET status = $1, updated_at = NOW() WHERE proposal_no = $2`,
      [status, wttNumber],
    );
  }
}

/**
 * Record the proposal in proposal_requests (dashboard tracking).
 */
async function recordProposalRequest(
  params: {
    wttNumber: string;
    customerName: string;
    contactPerson: string;
    email: string;
    phone: string;
    flowRate: string;
    country: string;
    city: string;
    notes?: string;
  },
  status: "pending" | "sent" | "failed" = "sent",
): Promise<void> {
  try {
    const noteText = params.notes?.trim() || `Bangladesh Wizard — ${params.wttNumber}`;
    await pool.query(
      `INSERT INTO proposal_requests
         (proposal_no, company_name, city, country, contact_person, email, phone, system_option, flow_rate, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10)
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
        status,
        noteText,
      ],
    );
  } catch (err) {
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

  const files = getProposalTemplateFiles(flowRate);
  if (files.length === 0) return res.status(404).json({ error: "No files found for flow rate" });

  const customer = customerName.toUpperCase().trim();
  const wttNumber = wttParam && /^WTT-BAN-\d{4}$/.test(wttParam)
    ? wttParam
    : formatWttNumber(await nextCounter(customer, flowRate));

  const kld = kldFromFolder(flowRate);

  const built = files.map((f) =>
    buildProposalAttachment(join(dir, f), f, customer, wttNumber, city || ""),
  );
  const attachments = toNodemailerAttachments(built);

  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const emailHtml = buildEmailHtml(customer, kld, wttNumber, attachments.map((a) => a.filename));

  await transporter.sendMail({
    from: `WTT INTERNATIONAL <${smtpUser}>`,
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
// Returns proposal number immediately; PDF conversion + email run in background.
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

    if (!process.env.PROPOSAL_SMTP_USER || !process.env.PROPOSAL_SMTP_PASSWORD) {
      return res.status(503).json({ error: "Proposal email not configured. Please contact WTT directly." });
    }

    const dir = safeJoin(PROPOSAL_ROOT, flowRate);
    if (!dir) return res.status(400).json({ error: "Invalid flow rate" });

    const files = getProposalTemplateFiles(flowRate);
    if (files.length === 0) return res.status(404).json({ error: "No files found for selected flow rate" });

    const customer = customerName.toUpperCase().trim();
    const counter = await nextCounter(customer, flowRate);
    const wttNumber = formatWttNumber(counter);

    await recordProposalRequest({
      wttNumber,
      customerName: customer,
      contactPerson: contactPerson || customerName,
      email: toEmail,
      phone: phone || "",
      flowRate,
      country: country || "Bangladesh",
      city: city || "Bangladesh",
      notes: notes?.trim(),
    }, "pending");

    queueProposalEmailJob({
      flowRate,
      customerName,
      toEmail,
      contactPerson: contactPerson || customerName,
      phone: phone || "",
      city: city || "",
      country: country || "Bangladesh",
      notes: notes?.trim(),
      wttNumber,
    });

    res.json({
      success: true,
      wttNumber,
      message: "Your request has been received. Proposal documents will be emailed to you shortly.",
    });
  } catch (err: any) {
    console.error("send-public error:", err);
    res.status(500).json({ error: err?.message || "Failed to submit proposal request" });
  }
});

// POST /api/proposal-wizard/requests/:id/resend — resend email for existing record
router.post("/proposal-wizard/requests/:id/resend", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const r = await pool.query("SELECT * FROM proposal_requests WHERE id = $1", [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "proposal not found" });
    const p = r.rows[0];

    const smtpUser = process.env.PROPOSAL_SMTP_USER;
    const smtpPass = process.env.PROPOSAL_SMTP_PASSWORD;
    if (!smtpUser || !smtpPass) {
      return res.status(503).json({ error: "Email not configured. Contact admin." });
    }

    // Find the folder matching this flow_rate
    const folders = getFlowRateFolders();
    const flowRateFolder = folders.find((f) => {
      const kld = kldFromFolder(f);
      return kld === String(p.flow_rate);
    }) || folders.find((f) => f.toLowerCase().includes(String(p.flow_rate).toLowerCase()));

    if (!flowRateFolder) {
      return res.status(404).json({ error: `No template files found for flow rate ${p.flow_rate} KLD` });
    }

    const dir = safeJoin(PROPOSAL_ROOT, flowRateFolder);
    if (!dir) return res.status(400).json({ error: "Invalid flow rate folder" });

    const files = getProposalTemplateFiles(flowRateFolder);
    if (files.length === 0) return res.status(404).json({ error: "No files found for selected flow rate" });

    const customer = String(p.company_name).toUpperCase().trim();
    const wttNumber = String(p.proposal_no);
    const kld = kldFromFolder(flowRateFolder);
    const city = String(p.city || "Bangladesh");

    const built = files.map((f) =>
      buildProposalAttachment(join(dir, f), f, customer, wttNumber, city),
    );
    const attachments = toNodemailerAttachments(built);

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const emailHtml = buildEmailHtml(customer, kld, wttNumber, attachments.map((a) => a.filename));

    await transporter.sendMail({
      from: `WTT INTERNATIONAL <${smtpUser}>`,
      to: String(p.email),
      subject: `Proposal – ${p.company_name} – ${kld} KLD STP – ${wttNumber}`,
      html: emailHtml,
      attachments,
    });

    // Update status to sent
    await pool.query("UPDATE proposal_requests SET status = 'sent', updated_at = NOW() WHERE id = $1", [id]);

    res.json({ success: true, message: `Proposal resent to ${p.email}`, wttNumber });
  } catch (err: any) {
    console.error("resend error:", err);
    res.status(500).json({ error: err?.message || "Failed to resend proposal" });
  }
});

export default router;
