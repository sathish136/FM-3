import { existsSync, readFileSync } from "fs";
import { resolve as pathResolve } from "path";

/** Single card (half of the 107.927mm-wide print sheet). */
export const ID_CARD_VIEWBOX = {
  front: "0 0 5397 8411",
  back: "5397 0 5396 8411",
} as const;

export type IdCardSide = keyof typeof ID_CARD_VIEWBOX;

export interface IdCardEmployee {
  name: string;
  employee_name: string;
  department: string | null;
  date_of_joining: string | null;
  date_of_birth: string | null;
  image: string | null;
  cell_number: string | null;
  blood_group: string | null;
  emergency_phone: string | null;
  permanent_address: string | null;
}

export interface IdCardEmbeddedAssets {
  photoDataUri?: string;
  signatureDataUri?: string;
  qrDataUri?: string;
}

/** Photo slot aligned to clipPath #id0 / orange ring (CorelDRAW export). */
const PHOTO_X = 1306;
/** Slightly above template default — keeps hair/forehead inside the circle crop. */
const PHOTO_Y = 2680;
const PHOTO_W = 2892;
const PHOTO_H = 2980;
/** Top-aligned slice: portrait photos no longer lose the top of the head. */
const PHOTO_PRESERVE = "xMidYMin slice";

const ID_CARD_PHONE = "04214414444";

/** Centered label Y (from template matrix transforms). */
const NAME_Y = 6394;
const DEPT_Y = 6860;
const CARD_CENTER_X = 2755;

const TEMPLATE_PATHS = [
  pathResolve(process.cwd(), "..", "..", "ID", "orignal.svg"),
  pathResolve(process.cwd(), "ID", "orignal.svg"),
  pathResolve(process.cwd(), "..", "..", "..", "ID", "orignal.svg"),
];

const GM_SIGN_PATHS = [
  pathResolve(process.cwd(), "..", "..", "ID", "gm_sign.png"),
  pathResolve(process.cwd(), "ID", "gm_sign.png"),
  pathResolve(process.cwd(), "..", "..", "..", "ID", "gm_sign.png"),
];

let cachedTemplate: string | null = null;
let cachedGmSignDataUri: string | null = null;

export function getIdCardTemplatePath(): string | null {
  for (const p of TEMPLATE_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadGmSignDataUri(): string | undefined {
  if (cachedGmSignDataUri) return cachedGmSignDataUri;
  for (const p of GM_SIGN_PATHS) {
    if (existsSync(p)) {
      cachedGmSignDataUri = `data:image/png;base64,${readFileSync(p).toString("base64")}`;
      return cachedGmSignDataUri;
    }
  }
  return undefined;
}

export function loadIdCardTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  const p = getIdCardTemplatePath();
  if (!p) throw new Error("ID card template orignal.svg not found");
  cachedTemplate = readFileSync(p, "utf8");
  return cachedTemplate;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(val: string | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function cleanDept(dept: string | null): string {
  return (dept || "").replace(/ - WTT.*$/i, "").trim().toUpperCase();
}

function setTemplateImage(svg: string, imgId: 1 | 2 | 3, href: string): string {
  if (!href) return svg;
  const safe = href.replace(/"/g, "&quot;");
  const id = `templete_ImgID${imgId}`;
  const patterns = [
    `templete_Images\\${id}.png`,
    `templete_Images/${id}.png`,
  ];
  let out = svg;
  for (const pat of patterns) {
    out = out.replace(
      new RegExp(`xlink:href="${escapeRegex(pat)}"`, "g"),
      `xlink:href="${safe}" href="${safe}"`,
    );
  }
  return out;
}

function applyPhotoCover(svg: string, href: string): string {
  if (!href) return svg;
  const safe = href.replace(/"/g, "&quot;");
  const block = `<g style="clip-path:url(#id0)">
   <image x="${PHOTO_X}" y="${PHOTO_Y}" width="${PHOTO_W}" height="${PHOTO_H}" preserveAspectRatio="${PHOTO_PRESERVE}" xlink:href="${safe}" href="${safe}"/>
  </g>`;
  return svg.replace(
    /<g style="clip-path:url\(#id0\)">\s*<image[^>]*\/>\s*<\/g>/,
    block,
  );
}

/** Horizontal center of the back card in full-template coordinates. */
const BACK_CENTER_X = 8095;
const PHONE_Y = 7944;

function applyContactPhone(svg: string): string {
  const phoneLine = `PH:${ID_CARD_PHONE}`;
  const centered = `<g>
   <text x="${BACK_CENTER_X}" y="${PHONE_Y}" text-anchor="middle" class="fil12 fnt9">${escapeXml(phoneLine)}</text>
  </g>`;
  return svg
    .replace(/\+91-421-2241120-224 7707/g, ID_CARD_PHONE)
    .replace(
      /<g transform="matrix\(1\.0072 0 0 1 1479\.23 3738\.43\)">\s*<text[^>]*class="fil14 fnt9">PH:<\/text>\s*<\/g>\s*<g transform="matrix\(1\.0072 0 0 1 1479\.23 3738\.43\)">\s*<text[^>]*class="fil12 fnt9">[^<]*<\/text>\s*<\/g>/,
      centered,
    );
}

function applySignatureImage(svg: string, href: string): string {
  if (!href) return svg;
  const safe = href.replace(/"/g, "&quot;");
  const block = `<g style="clip-path:url(#id2)">
   <image x="7708" y="4866" width="2511" height="948" preserveAspectRatio="xMidYMid meet" xlink:href="${safe}" href="${safe}"/>
  </g>`;
  return svg.replace(
    /<g style="clip-path:url\(#id2\)">\s*<image[^>]*\/>\s*<\/g>/,
    block,
  );
}

function centerNameAndDept(svg: string, name: string, dept: string): string {
  const nameBlock = `<g>
   <text x="${CARD_CENTER_X}" y="${NAME_Y}" text-anchor="middle" class="fil4 fnt10">${escapeXml(name)}</text>
  </g>`;
  const deptBlock = `<g>
   <text x="${CARD_CENTER_X}" y="${DEPT_Y}" text-anchor="middle" class="fil90 fnt11">${escapeXml(dept)}</text>
  </g>`;
  let out = svg.replace(
    /<g transform="matrix\(1\.0158 0 0 1 -3399\.45 2188\.03\)">\s*<text[^>]*>[^<]*<\/text>\s*<\/g>/,
    nameBlock,
  );
  out = out.replace(
    /<g transform="matrix\(1\.0158 0 0 1 -3229\.5 2653\.5\)">\s*<text[^>]*>[^<]*<\/text>\s*<\/g>/,
    deptBlock,
  );
  return out;
}

/** Insert field value immediately after the matching colon group (same Y as template). */
function injectValueAfterColon(svg: string, colonTransform: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return svg;

  const esc = escapeRegex(colonTransform);
  const re = new RegExp(
    `(<g transform="${esc}">\\s*<text[^>]*>:\\s*</text>\\s*</g>)`,
  );
  const parts = colonTransform.match(/matrix\(([\d.]+) 0 0 1 ([\d.]+) ([-\d.]+)\)/);
  if (!parts) return svg;

  const sx = parts[1];
  const tx = parseFloat(parts[2]) + 200;
  const ty = parts[3];
  const valueG = `\n  <g transform="matrix(${sx} 0 0 1 ${tx} ${ty})">
   <text x="5396" y="4206" class="fil10 fnt6">${escapeXml(trimmed)}</text>
  </g>`;

  return svg.replace(re, `$1${valueG}`);
}

function addressSvgText(addr: string): string {
  const maxChars = 38;
  const lines: string[] = [];
  for (const word of addr.split(/\s+/)) {
    const last = lines[lines.length - 1];
    const candidate = last ? `${last} ${word}` : word;
    if (last && candidate.length > maxChars) lines.push(word);
    else if (last) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  const maxLines = 5;
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const last = clipped[maxLines - 1];
    clipped[maxLines - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : `${last}…`;
  }
  const x = 6010;
  const startY = 3280;
  const lineHeight = 297;
  const tspans = clipped
    .map(
      (line, i) =>
        `    <tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("\n");
  return `  <text x="${x}" y="${startY}" style="font-family:Roboto,sans-serif;font-size:220px;fill:#373435;">
${tspans}
  </text>`;
}

function injectBackFields(svg: string, emp: IdCardEmployee): string {
  let out = svg;

  out = injectValueAfterColon(out, "matrix(1.0097 0 0 1 3326.64 -3533.39)", emp.name);
  out = injectValueAfterColon(out, "matrix(1.0097 0 0 1 3326.64 -3152.05)", formatDate(emp.date_of_joining));
  out = injectValueAfterColon(out, "matrix(1.0097 0 0 1 3329.92 -2800.6)", formatDate(emp.date_of_birth));
  out = injectValueAfterColon(out, "matrix(1.0097 0 0 1 3325 -2439.37)", emp.cell_number || "");
  out = injectValueAfterColon(out, "matrix(1.0097 0 0 1 3323.01 -2099.62)", emp.emergency_phone || "");
  out = injectValueAfterColon(out, "matrix(1.0583 0 0 1 3060.84 -1699.17)", emp.blood_group || "");

  out = out.replace(
    /<g transform="matrix\(1 0 0 1 3286\.3 -2097\.63\)">\s*<text[^>]*>\s*<\/text>\s*<\/g>\s*/,
    "",
  );

  const addr = (emp.permanent_address || "").trim();
  if (addr) {
    out = out.replace(
      /<polygon class="fil6 str2" points="5966,4598 10310,4598 10310,3121 5966,3121 "\/>/,
      `$&\n${addressSvgText(addr)}`,
    );
  }

  return out;
}

/**
 * Fills the CorelDRAW template in memory. The file on disk is never modified.
 */
export function renderIdCardSvg(
  emp: IdCardEmployee,
  side: IdCardSide,
  assetBaseUrl: string,
  assets: IdCardEmbeddedAssets = {},
): string {
  let svg = loadIdCardTemplate();

  const base = assetBaseUrl.replace(/\/$/, "");
  const photoHref =
    assets.photoDataUri ||
    (emp.image ? `${base}/api/hrms/image-proxy?path=${encodeURIComponent(emp.image)}` : "");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(emp.name)}&bgcolor=ffffff&color=012867`;
  const qrHref = assets.qrDataUri || qrUrl;
  const signatureHref = assets.signatureDataUri || loadGmSignDataUri() || "";

  if (photoHref) {
    svg = applyPhotoCover(svg, photoHref);
  }
  svg = setTemplateImage(svg, 2, qrHref);
  if (signatureHref) {
    svg = applySignatureImage(svg, signatureHref);
  } else {
    svg = setTemplateImage(svg, 3, "");
  }

  svg = centerNameAndDept(
    svg,
    emp.employee_name.toUpperCase(),
    cleanDept(emp.department),
  );

  svg = injectBackFields(svg, emp);
  svg = applyContactPhone(svg);

  const viewBox = ID_CARD_VIEWBOX[side];
  svg = svg.replace(/viewBox="0 0 10793 8411"/, `viewBox="${viewBox}"`);
  svg = svg.replace(
    /width="107\.927mm" height="84\.112mm"/,
    `width="53.963mm" height="84.112mm"`,
  );

  return svg;
}
