export type CelebrationKind = "birthday" | "anniversary";

export type WishThemeId =
  | "birthday-confetti"
  | "birthday-bloom"
  | "birthday-sunset"
  | "anniversary-navy"
  | "anniversary-emerald"
  | "anniversary-royal";

export interface CelebrationEmployee {
  name: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
  date_of_birth: string | null;
  image: string | null;
}

export interface RenderWishOptions {
  kind: CelebrationKind;
  theme: WishThemeId;
  employee: CelebrationEmployee;
  yearsOfService?: number;
  customMessage?: string;
  photoDataUri?: string;
}

interface ThemeStyle {
  gradA: string;
  gradB: string;
  gradC: string;
  accent: string;
  accentLight: string;
  text: string;
  subtext: string;
  badge: string;
  decor: string;
}

const THEMES: Record<WishThemeId, ThemeStyle> = {
  "birthday-confetti": {
    gradA: "#ff6b9d",
    gradB: "#c44569",
    gradC: "#f8b500",
    accent: "#fff",
    accentLight: "#ffe4ec",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.9)",
    badge: "#ff4081",
    decor: "confetti",
  },
  "birthday-bloom": {
    gradA: "#a855f7",
    gradB: "#ec4899",
    gradC: "#f472b6",
    accent: "#fff",
    accentLight: "#fae8ff",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.92)",
    badge: "#9333ea",
    decor: "bloom",
  },
  "birthday-sunset": {
    gradA: "#f97316",
    gradB: "#ef4444",
    gradC: "#fbbf24",
    accent: "#fff",
    accentLight: "#ffedd5",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.9)",
    badge: "#ea580c",
    decor: "sunset",
  },
  "anniversary-navy": {
    gradA: "#1e3a5f",
    gradB: "#0f2744",
    gradC: "#2563eb",
    accent: "#fbbf24",
    accentLight: "#dbeafe",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.85)",
    badge: "#fbbf24",
    decor: "stars",
  },
  "anniversary-emerald": {
    gradA: "#047857",
    gradB: "#064e3b",
    gradC: "#10b981",
    accent: "#fde68a",
    accentLight: "#d1fae5",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.88)",
    badge: "#fbbf24",
    decor: "laurel",
  },
  "anniversary-royal": {
    gradA: "#4c1d95",
    gradB: "#312e81",
    gradC: "#7c3aed",
    accent: "#fcd34d",
    accentLight: "#ede9fe",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.9)",
    badge: "#fcd34d",
    decor: "crown",
  },
};

const W = 1080;
const H = 1350;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanDept(dept: string | null): string {
  return (dept || "").replace(/ - WTT.*$/i, "").trim();
}

function defaultMessage(kind: CelebrationKind, name: string, years?: number): string {
  const first = name.split(" ")[0] || name;
  if (kind === "birthday") {
    return `Happy Birthday, ${first}!\nWishing you joy and success.`;
  }
  const y = years ?? 1;
  const label = y === 1 ? "1 year" : `${y} years`;
  return `Congratulations on ${label} with WTT!\nThank you for your dedication.`;
}

function decorSvg(style: ThemeStyle["decor"], accent: string): string {
  const parts: string[] = [];
  if (style === "confetti") {
    const colors = ["#fff", "#fde047", "#f472b6", "#60a5fa", "#34d399"];
    for (let i = 0; i < 28; i++) {
      const x = 40 + (i * 37) % (W - 80);
      const y = 30 + (i * 53) % 280;
      const rot = (i * 47) % 360;
      const c = colors[i % colors.length];
      if (i % 3 === 0) {
        parts.push(`<rect x="${x}" y="${y}" width="14" height="6" fill="${c}" opacity="0.85" transform="rotate(${rot} ${x} ${y})"/>`);
      } else {
        parts.push(`<circle cx="${x}" cy="${y}" r="${4 + (i % 4)}" fill="${c}" opacity="0.75"/>`);
      }
    }
  } else if (style === "bloom") {
    for (let i = 0; i < 8; i++) {
      const cx = 120 + i * 110;
      const cy = 80 + (i % 3) * 40;
      parts.push(`<circle cx="${cx}" cy="${cy}" r="28" fill="${accent}" opacity="0.12"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="12" fill="${accent}" opacity="0.2"/>`);
    }
  } else if (style === "sunset") {
    parts.push(`<ellipse cx="${W / 2}" cy="180" rx="220" ry="80" fill="${accent}" opacity="0.15"/>`);
    parts.push(`<ellipse cx="${W / 2}" cy="200" rx="160" ry="50" fill="${accent}" opacity="0.25"/>`);
  } else if (style === "stars") {
    for (let i = 0; i < 20; i++) {
      const x = 60 + (i * 51) % (W - 120);
      const y = 40 + (i * 67) % 200;
      parts.push(`<polygon points="${x},${y - 6} ${x + 2},${y - 1} ${x + 7},${y} ${x + 2},${y + 1} ${x},${y + 6} ${x - 2},${y + 1} ${x - 7},${y} ${x - 2},${y - 1}" fill="${accent}" opacity="0.5"/>`);
    }
  } else if (style === "laurel") {
    parts.push(`<path d="M 80 200 Q 40 320 80 440" stroke="${accent}" stroke-width="3" fill="none" opacity="0.35"/>`);
    parts.push(`<path d="M ${W - 80} 200 Q ${W - 40} 320 ${W - 80} 440" stroke="${accent}" stroke-width="3" fill="none" opacity="0.35"/>`);
  } else if (style === "crown") {
    parts.push(`<path d="M ${W / 2 - 50} 120 L ${W / 2 - 30} 80 L ${W / 2 - 10} 110 L ${W / 2} 70 L ${W / 2 + 10} 110 L ${W / 2 + 30} 80 L ${W / 2 + 50} 120 Z" fill="${accent}" opacity="0.35"/>`);
  }
  return parts.join("\n");
}

function photoBlock(photoDataUri: string | undefined, initials: string, accent: string): string {
  const cx = W / 2;
  const cy = 520;
  const r = 200;
  const ring = `
    <circle cx="${cx}" cy="${cy}" r="${r + 18}" fill="none" stroke="${accent}" stroke-width="8" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="rgba(255,255,255,0.15)"/>
  `;
  if (photoDataUri) {
    const safe = photoDataUri.replace(/"/g, "&quot;");
    return `
      ${ring}
      <defs>
        <clipPath id="photoClip">
          <circle cx="${cx}" cy="${cy}" r="${r}"/>
        </clipPath>
      </defs>
      <image href="${safe}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
    `;
  }
  return `
    ${ring}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.2)"/>
    <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="700" fill="${accent}">${escapeXml(initials)}</text>
  `;
}

function wrapMessageLines(msg: string, maxChars = 32): string[] {
  const lines: string[] = [];
  for (const paragraph of msg.split("\n")) {
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const w of words) {
      if (!line) line = w;
      else if ((line + " " + w).length <= maxChars) line += " " + w;
      else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
  }
  return lines.slice(0, 4);
}

export function getThemesForKind(kind: CelebrationKind): WishThemeId[] {
  if (kind === "birthday") {
    return ["birthday-confetti", "birthday-bloom", "birthday-sunset"];
  }
  return ["anniversary-navy", "anniversary-emerald", "anniversary-royal"];
}

export function renderCelebrationWishSvg(opts: RenderWishOptions): string {
  const theme = THEMES[opts.theme] ?? THEMES["birthday-confetti"];
  const kind = opts.kind;
  const name = opts.employee.employee_name;
  const dept = cleanDept(opts.employee.department);
  const designation = (opts.employee.designation || "").trim();
  const msg = opts.customMessage?.trim() || defaultMessage(kind, name, opts.yearsOfService);
  const lines = wrapMessageLines(msg);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const headline =
    kind === "birthday" ? "Happy Birthday!" : "Work Anniversary";
  const subHead =
    kind === "birthday"
      ? "Celebrating you today"
      : opts.yearsOfService
        ? `${opts.yearsOfService} ${opts.yearsOfService === 1 ? "Year" : "Years"} of Excellence`
        : "Milestone Celebration";

  const nameY = kind === "anniversary" && opts.yearsOfService ? 900 : 820;
  const msgY = nameY + (designation ? 110 : 80);
  const msgLines = lines
    .map(
      (ln, i) =>
        `<text x="${W / 2}" y="${msgY + i * 44}" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${theme.subtext}">${escapeXml(ln)}</text>`,
    )
    .join("\n");

  const yearsBadge =
    kind === "anniversary" && opts.yearsOfService
      ? `
    <rect x="${W / 2 - 90}" y="748" width="180" height="56" rx="28" fill="${theme.badge}"/>
    <text x="${W / 2}" y="786" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1e293b">${opts.yearsOfService} ${opts.yearsOfService === 1 ? "YEAR" : "YEARS"}</text>
  `
      : "";

  const deptY = designation ? nameY + 45 : nameY + 38;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.gradA}"/>
      <stop offset="50%" stop-color="${theme.gradB}"/>
      <stop offset="100%" stop-color="${theme.gradC}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${decorSvg(theme.decor, theme.accent)}
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="700" fill="${theme.text}">${escapeXml(headline)}</text>
  <text x="${W / 2}" y="175" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${theme.subtext}">${escapeXml(subHead)}</text>
  ${photoBlock(opts.photoDataUri, initials, theme.accent)}
  ${yearsBadge}
  <text x="${W / 2}" y="${nameY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="${theme.text}" filter="url(#shadow)">${escapeXml(name)}</text>
  ${designation ? `<text x="${W / 2}" y="${nameY + 38}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${theme.subtext}">${escapeXml(designation)}</text>` : ""}
  ${dept ? `<text x="${W / 2}" y="${deptY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="${theme.subtext}" opacity="0.9">${escapeXml(dept)}</text>` : ""}
  ${msgLines}
  <text x="${W / 2}" y="${H - 70}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${theme.subtext}" opacity="0.85">WTT · Human Resources</text>
</svg>`;
}

/** Parse ERP date (YYYY-MM-DD or ISO). */
export function parseErpDate(val: string | null): Date | null {
  if (!val) return null;
  const d = new Date(val.length <= 10 ? `${val}T12:00:00` : val);
  return isNaN(d.getTime()) ? null : d;
}

export function yearsOfService(joinDate: string | null, asOf = new Date()): number | null {
  const d = parseErpDate(joinDate);
  if (!d) return null;
  let years = asOf.getFullYear() - d.getFullYear();
  const m = asOf.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) years--;
  return Math.max(0, years);
}

export function matchesMonthDay(dateStr: string | null, month: number, day?: number): boolean {
  const d = parseErpDate(dateStr);
  if (!d) return false;
  if (d.getMonth() + 1 !== month) return false;
  if (day !== undefined && d.getDate() !== day) return false;
  return true;
}
