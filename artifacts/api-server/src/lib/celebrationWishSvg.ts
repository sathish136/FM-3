export type CelebrationKind = "birthday" | "anniversary";

export type WishThemeId =
  | "birthday-confetti"
  | "birthday-bloom"
  | "birthday-sunset"
  | "birthday-galaxy"
  | "birthday-tropical"
  | "birthday-rose-gold"
  | "birthday-ocean"
  | "birthday-midnight"
  | "anniversary-navy"
  | "anniversary-emerald"
  | "anniversary-royal"
  | "anniversary-crimson"
  | "anniversary-sapphire"
  | "anniversary-bronze"
  | "anniversary-midnight";

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
  gradD?: string;
  accent: string;
  accentLight: string;
  text: string;
  subtext: string;
  badge: string;
  badgeText: string;
  decor: string;
  nameFont?: string;
  overlay?: string;
}

export const THEME_META: Record<WishThemeId, { label: string; colors: [string, string] }> = {
  "birthday-confetti":  { label: "Confetti Party",   colors: ["#ff6b9d", "#f8b500"] },
  "birthday-bloom":     { label: "Floral Bloom",      colors: ["#a855f7", "#ec4899"] },
  "birthday-sunset":    { label: "Sunset Glow",       colors: ["#f97316", "#fbbf24"] },
  "birthday-galaxy":    { label: "Galaxy Night",      colors: ["#1a1040", "#7c3aed"] },
  "birthday-tropical":  { label: "Tropical Fiesta",   colors: ["#059669", "#34d399"] },
  "birthday-rose-gold": { label: "Rose Gold Glam",    colors: ["#e8a0bf", "#c9733a"] },
  "birthday-ocean":     { label: "Ocean Breeze",      colors: ["#0891b2", "#06b6d4"] },
  "birthday-midnight":  { label: "Midnight Spark",    colors: ["#0f172a", "#6366f1"] },
  "anniversary-navy":   { label: "Navy Classic",      colors: ["#1e3a5f", "#fbbf24"] },
  "anniversary-emerald":{ label: "Emerald Milestone", colors: ["#047857", "#fde68a"] },
  "anniversary-royal":  { label: "Royal Gold",        colors: ["#4c1d95", "#fcd34d"] },
  "anniversary-crimson":{ label: "Crimson Prestige",  colors: ["#7f1d1d", "#fbbf24"] },
  "anniversary-sapphire":{ label: "Sapphire Elite",   colors: ["#1e3a8a", "#93c5fd"] },
  "anniversary-bronze": { label: "Bronze Legacy",     colors: ["#78350f", "#fde68a"] },
  "anniversary-midnight":{ label: "Midnight Honor",   colors: ["#0f172a", "#e2e8f0"] },
};

const THEMES: Record<WishThemeId, ThemeStyle> = {
  "birthday-confetti": {
    gradA: "#ff6b9d", gradB: "#c44569", gradC: "#f8b500",
    accent: "#fff", accentLight: "#ffe4ec",
    text: "#ffffff", subtext: "rgba(255,255,255,0.92)",
    badge: "#ff4081", badgeText: "#fff", decor: "confetti",
  },
  "birthday-bloom": {
    gradA: "#a855f7", gradB: "#ec4899", gradC: "#f472b6",
    accent: "#fff", accentLight: "#fae8ff",
    text: "#ffffff", subtext: "rgba(255,255,255,0.92)",
    badge: "#9333ea", badgeText: "#fff", decor: "bloom",
  },
  "birthday-sunset": {
    gradA: "#f97316", gradB: "#ef4444", gradC: "#fbbf24",
    accent: "#fff", accentLight: "#ffedd5",
    text: "#ffffff", subtext: "rgba(255,255,255,0.92)",
    badge: "#ea580c", badgeText: "#fff", decor: "sunset",
  },
  "birthday-galaxy": {
    gradA: "#0f0726", gradB: "#1a1040", gradC: "#2d1b69",
    gradD: "#4c1d95",
    accent: "#c084fc", accentLight: "#ede9fe",
    text: "#ffffff", subtext: "rgba(220,200,255,0.92)",
    badge: "#7c3aed", badgeText: "#fff", decor: "galaxy",
    nameFont: "Playfair Display",
  },
  "birthday-tropical": {
    gradA: "#065f46", gradB: "#047857", gradC: "#10b981",
    accent: "#fde047", accentLight: "#d1fae5",
    text: "#ffffff", subtext: "rgba(255,255,255,0.92)",
    badge: "#d97706", badgeText: "#fff", decor: "tropical",
  },
  "birthday-rose-gold": {
    gradA: "#c97b5a", gradB: "#e8a4bf", gradC: "#fce4ec",
    gradD: "#f4b8d0",
    accent: "#fcd34d", accentLight: "#fdf2f8",
    text: "#4a1942", subtext: "rgba(74,25,66,0.85)",
    badge: "#be185d", badgeText: "#fff", decor: "sparkles",
    overlay: "rgba(255,255,255,0.08)",
  },
  "birthday-ocean": {
    gradA: "#0c4a6e", gradB: "#0891b2", gradC: "#22d3ee",
    accent: "#fff", accentLight: "#e0f2fe",
    text: "#ffffff", subtext: "rgba(255,255,255,0.92)",
    badge: "#0ea5e9", badgeText: "#fff", decor: "waves",
  },
  "birthday-midnight": {
    gradA: "#020617", gradB: "#0f172a", gradC: "#1e1b4b",
    accent: "#818cf8", accentLight: "#e0e7ff",
    text: "#ffffff", subtext: "rgba(200,200,255,0.9)",
    badge: "#4f46e5", badgeText: "#fff", decor: "midnight",
    nameFont: "Playfair Display",
  },
  "anniversary-navy": {
    gradA: "#1e3a5f", gradB: "#0f2744", gradC: "#2563eb",
    accent: "#fbbf24", accentLight: "#dbeafe",
    text: "#ffffff", subtext: "rgba(255,255,255,0.87)",
    badge: "#fbbf24", badgeText: "#1e3a5f", decor: "stars",
  },
  "anniversary-emerald": {
    gradA: "#047857", gradB: "#064e3b", gradC: "#10b981",
    accent: "#fde68a", accentLight: "#d1fae5",
    text: "#ffffff", subtext: "rgba(255,255,255,0.88)",
    badge: "#fbbf24", badgeText: "#064e3b", decor: "laurel",
  },
  "anniversary-royal": {
    gradA: "#4c1d95", gradB: "#312e81", gradC: "#7c3aed",
    accent: "#fcd34d", accentLight: "#ede9fe",
    text: "#ffffff", subtext: "rgba(255,255,255,0.9)",
    badge: "#fcd34d", badgeText: "#312e81", decor: "crown",
    nameFont: "Playfair Display",
  },
  "anniversary-crimson": {
    gradA: "#450a0a", gradB: "#7f1d1d", gradC: "#b91c1c",
    accent: "#fbbf24", accentLight: "#fee2e2",
    text: "#ffffff", subtext: "rgba(255,220,200,0.92)",
    badge: "#fbbf24", badgeText: "#450a0a", decor: "crimson",
    nameFont: "Playfair Display",
  },
  "anniversary-sapphire": {
    gradA: "#1e3a8a", gradB: "#1d4ed8", gradC: "#3b82f6",
    accent: "#bfdbfe", accentLight: "#dbeafe",
    text: "#ffffff", subtext: "rgba(220,235,255,0.92)",
    badge: "#93c5fd", badgeText: "#1e3a8a", decor: "sapphire",
    nameFont: "Playfair Display",
  },
  "anniversary-bronze": {
    gradA: "#431407", gradB: "#78350f", gradC: "#b45309",
    accent: "#fde68a", accentLight: "#fef3c7",
    text: "#ffffff", subtext: "rgba(255,230,180,0.92)",
    badge: "#fde68a", badgeText: "#431407", decor: "bronze",
    nameFont: "Playfair Display",
  },
  "anniversary-midnight": {
    gradA: "#020617", gradB: "#0f172a", gradC: "#1e293b",
    accent: "#e2e8f0", accentLight: "#f1f5f9",
    text: "#ffffff", subtext: "rgba(226,232,240,0.9)",
    badge: "#94a3b8", badgeText: "#0f172a", decor: "silvernight",
    nameFont: "Playfair Display",
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
    return `Happy Birthday, ${first}!\nWishing you a day filled with joy,\nlaughter, and wonderful surprises.`;
  }
  const y = years ?? 1;
  const label = y === 1 ? "1 incredible year" : `${y} incredible years`;
  return `Congratulations on ${label} with WTT!\nYour dedication and passion\ninspire us all every day.`;
}

function decorSvg(style: ThemeStyle["decor"], accent: string, theme: ThemeStyle): string {
  const parts: string[] = [];

  if (style === "confetti") {
    const colors = ["#fff", "#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#a78bfa"];
    for (let i = 0; i < 36; i++) {
      const x = 30 + (i * 29) % (W - 60);
      const y = 20 + (i * 53) % 320;
      const rot = (i * 47) % 360;
      const c = colors[i % colors.length];
      if (i % 4 === 0) {
        parts.push(`<rect x="${x}" y="${y}" width="16" height="7" rx="2" fill="${c}" opacity="0.85" transform="rotate(${rot} ${x} ${y})"/>`);
      } else if (i % 4 === 1) {
        parts.push(`<circle cx="${x}" cy="${y}" r="${3 + (i % 5)}" fill="${c}" opacity="0.8"/>`);
      } else {
        parts.push(`<polygon points="${x},${y - 8} ${x + 7},${y + 5} ${x - 7},${y + 5}" fill="${c}" opacity="0.75" transform="rotate(${rot} ${x} ${y})"/>`);
      }
    }
    // Bottom confetti strip
    for (let i = 0; i < 20; i++) {
      const x = 20 + (i * 53) % (W - 40);
      const y = H - 150 + (i * 31) % 80;
      const c = colors[i % colors.length];
      parts.push(`<circle cx="${x}" cy="${y}" r="${3 + (i % 4)}" fill="${c}" opacity="0.6"/>`);
    }
  } else if (style === "bloom") {
    for (let i = 0; i < 10; i++) {
      const cx = 80 + i * 95;
      const cy = 60 + (i % 4) * 45;
      parts.push(`<circle cx="${cx}" cy="${cy}" r="32" fill="${accent}" opacity="0.1"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="14" fill="${accent}" opacity="0.18"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="${accent}" opacity="0.3"/>`);
    }
    // Petal shapes
    for (let i = 0; i < 6; i++) {
      const cx = 150 + i * 150;
      const cy = H - 200 + (i % 2) * 40;
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="28" ry="14" fill="${accent}" opacity="0.12" transform="rotate(${i * 30} ${cx} ${cy})"/>`);
    }
  } else if (style === "sunset") {
    parts.push(`<ellipse cx="${W / 2}" cy="160" rx="280" ry="100" fill="${accent}" opacity="0.12"/>`);
    parts.push(`<ellipse cx="${W / 2}" cy="185" rx="200" ry="65" fill="${accent}" opacity="0.2"/>`);
    parts.push(`<ellipse cx="${W / 2}" cy="200" rx="130" ry="40" fill="${accent}" opacity="0.3"/>`);
    // Sun rays
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const x1 = W / 2 + Math.cos(angle) * 150;
      const y1 = 200 + Math.sin(angle) * 150;
      const x2 = W / 2 + Math.cos(angle) * 240;
      const y2 = 200 + Math.sin(angle) * 240;
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${accent}" stroke-width="2" opacity="0.15"/>`);
    }
  } else if (style === "galaxy") {
    // Stars of various sizes
    for (let i = 0; i < 50; i++) {
      const x = (i * 211) % W;
      const y = (i * 137) % H;
      const r = 0.8 + (i % 4) * 0.6;
      const op = 0.3 + (i % 5) * 0.12;
      parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${op.toFixed(2)}"/>`);
    }
    // Nebula glow clouds
    parts.push(`<radialGradient id="neb1" cx="30%" cy="20%" r="40%"><stop offset="0%" stop-color="#c084fc" stop-opacity="0.25"/><stop offset="100%" stop-color="transparent" stop-opacity="0"/></radialGradient>`);
    parts.push(`<radialGradient id="neb2" cx="70%" cy="70%" r="35%"><stop offset="0%" stop-color="#818cf8" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent" stop-opacity="0"/></radialGradient>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#neb1)"/>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#neb2)"/>`);
    // Shooting star
    parts.push(`<line x1="100" y1="80" x2="280" y2="120" stroke="#fff" stroke-width="1.5" opacity="0.5"/>`);
    parts.push(`<circle cx="100" cy="80" r="2.5" fill="#fff" opacity="0.8"/>`);
  } else if (style === "tropical") {
    // Palm leaf shapes
    const leafColor = "#fde047";
    parts.push(`<path d="M 0 300 Q 80 200 180 280 Q 80 310 0 300 Z" fill="${leafColor}" opacity="0.15"/>`);
    parts.push(`<path d="M ${W} 250 Q ${W - 80} 150 ${W - 200} 230 Q ${W - 80} 270 ${W} 250 Z" fill="${leafColor}" opacity="0.15"/>`);
    parts.push(`<path d="M 0 ${H - 200} Q 120 ${H - 300} 200 ${H - 180} Q 100 ${H - 160} 0 ${H - 200} Z" fill="${leafColor}" opacity="0.12"/>`);
    parts.push(`<path d="M ${W} ${H - 250} Q ${W - 120} ${H - 350} ${W - 220} ${H - 220} Q ${W - 100} ${H - 200} ${W} ${H - 250} Z" fill="${leafColor}" opacity="0.12"/>`);
    // Dots pattern
    for (let i = 0; i < 15; i++) {
      const x = 60 + (i * 73) % (W - 120);
      const y = 80 + (i * 59) % 200;
      parts.push(`<circle cx="${x}" cy="${y}" r="4" fill="${leafColor}" opacity="0.25"/>`);
    }
  } else if (style === "sparkles") {
    // Sparkle star shapes
    for (let i = 0; i < 18; i++) {
      const x = 50 + (i * 60) % (W - 100);
      const y = 30 + (i * 71) % 280;
      const size = 6 + (i % 4) * 3;
      parts.push(`<path d="M ${x} ${y - size} L ${x + 1.5} ${y - 2} L ${x + size} ${y} L ${x + 1.5} ${y + 2} L ${x} ${y + size} L ${x - 1.5} ${y + 2} L ${x - size} ${y} L ${x - 1.5} ${y - 2} Z" fill="${accent}" opacity="${0.3 + (i % 3) * 0.1}"/>`);
    }
    // Shimmer lines
    parts.push(`<line x1="0" y1="400" x2="${W}" y2="380" stroke="${accent}" stroke-width="1" opacity="0.1"/>`);
    parts.push(`<line x1="0" y1="430" x2="${W}" y2="410" stroke="${accent}" stroke-width="0.5" opacity="0.07"/>`);
  } else if (style === "waves") {
    // Ocean waves
    parts.push(`<path d="M 0 120 Q 180 60 360 120 Q 540 180 720 120 Q 900 60 1080 120 L 1080 0 L 0 0 Z" fill="#fff" opacity="0.06"/>`);
    parts.push(`<path d="M 0 ${H - 100} Q 270 ${H - 160} 540 ${H - 100} Q 810 ${H - 40} 1080 ${H - 100} L 1080 ${H} L 0 ${H} Z" fill="#fff" opacity="0.08"/>`);
    // Bubbles
    for (let i = 0; i < 20; i++) {
      const x = 40 + (i * 53) % (W - 80);
      const y = 50 + (i * 71) % 250;
      parts.push(`<circle cx="${x}" cy="${y}" r="${3 + (i % 5)}" fill="#fff" opacity="${0.08 + (i % 4) * 0.04}" stroke="#fff" stroke-width="1" stroke-opacity="0.2"/>`);
    }
  } else if (style === "midnight") {
    // Neon glow circles
    parts.push(`<circle cx="${W / 2}" cy="200" r="180" fill="none" stroke="#818cf8" stroke-width="1" opacity="0.15"/>`);
    parts.push(`<circle cx="${W / 2}" cy="200" r="230" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.1"/>`);
    // Stars
    for (let i = 0; i < 40; i++) {
      const x = (i * 271) % W;
      const y = (i * 193) % H;
      parts.push(`<circle cx="${x}" cy="${y}" r="${0.6 + (i % 3) * 0.6}" fill="#a5b4fc" opacity="${0.2 + (i % 5) * 0.1}"/>`);
    }
    // Neon accent lines
    parts.push(`<line x1="0" y1="H/2" x2="${W}" y2="${H / 2}" stroke="#818cf8" stroke-width="0.5" opacity="0.07"/>`);
  } else if (style === "stars") {
    for (let i = 0; i < 25; i++) {
      const x = 50 + (i * 43) % (W - 100);
      const y = 30 + (i * 59) % 220;
      const s = 5 + (i % 4) * 3;
      parts.push(`<polygon points="${x},${y - s} ${x + 1.8},${y - 1.8} ${x + s},${y} ${x + 1.8},${y + 1.8} ${x},${y + s} ${x - 1.8},${y + 1.8} ${x - s},${y} ${x - 1.8},${y - 1.8}" fill="${accent}" opacity="${0.35 + (i % 4) * 0.1}"/>`);
    }
  } else if (style === "laurel") {
    // Enhanced laurel branches
    const lc = accent;
    parts.push(`<path d="M 60 180 Q 20 300 60 420 Q 30 380 40 300 Z" fill="${lc}" opacity="0.2"/>`);
    parts.push(`<path d="M 60 180 Q 100 280 80 400" stroke="${lc}" stroke-width="3" fill="none" opacity="0.3"/>`);
    for (let i = 0; i < 6; i++) {
      const y = 210 + i * 36;
      parts.push(`<ellipse cx="${55 + i * 3}" cy="${y}" rx="22" ry="10" fill="${lc}" opacity="0.2" transform="rotate(-30 ${55 + i * 3} ${y})"/>`);
    }
    parts.push(`<path d="M ${W - 60} 180 Q ${W - 20} 300 ${W - 60} 420 Q ${W - 30} 380 ${W - 40} 300 Z" fill="${lc}" opacity="0.2"/>`);
    parts.push(`<path d="M ${W - 60} 180 Q ${W - 100} 280 ${W - 80} 400" stroke="${lc}" stroke-width="3" fill="none" opacity="0.3"/>`);
    for (let i = 0; i < 6; i++) {
      const y = 210 + i * 36;
      parts.push(`<ellipse cx="${W - 55 - i * 3}" cy="${y}" rx="22" ry="10" fill="${lc}" opacity="0.2" transform="rotate(30 ${W - 55 - i * 3} ${y})"/>`);
    }
  } else if (style === "crown") {
    parts.push(`<path d="M ${W / 2 - 60} 130 L ${W / 2 - 36} 82 L ${W / 2 - 12} 118 L ${W / 2} 68 L ${W / 2 + 12} 118 L ${W / 2 + 36} 82 L ${W / 2 + 60} 130 Z" fill="${accent}" opacity="0.35"/>`);
    parts.push(`<circle cx="${W / 2 - 60}" cy="130" r="7" fill="${accent}" opacity="0.5"/>`);
    parts.push(`<circle cx="${W / 2}" cy="68" r="9" fill="${accent}" opacity="0.5"/>`);
    parts.push(`<circle cx="${W / 2 + 60}" cy="130" r="7" fill="${accent}" opacity="0.5"/>`);
    // Stars around crown
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const cx = W / 2 + Math.cos(angle) * 180;
      const cy = 200 + Math.sin(angle) * 80;
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="${accent}" opacity="0.4"/>`);
    }
  } else if (style === "crimson") {
    // Ornamental borders
    parts.push(`<path d="M 40 40 L ${W - 40} 40 L ${W - 40} ${H - 40} L 40 ${H - 40} Z" fill="none" stroke="${accent}" stroke-width="2" opacity="0.2"/>`);
    parts.push(`<path d="M 60 60 L ${W - 60} 60 L ${W - 60} ${H - 60} L 60 ${H - 60} Z" fill="none" stroke="${accent}" stroke-width="1" opacity="0.12"/>`);
    // Corner ornaments
    const corners = [[80, 80], [W - 80, 80], [80, H - 80], [W - 80, H - 80]];
    for (const [cx, cy] of corners) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="8" fill="${accent}" opacity="0.3"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${accent}" opacity="0.5"/>`);
    }
    // Horizontal accent lines
    parts.push(`<line x1="80" y1="110" x2="${W - 80}" y2="110" stroke="${accent}" stroke-width="1" opacity="0.15"/>`);
    parts.push(`<line x1="80" y1="${H - 110}" x2="${W - 80}" y2="${H - 110}" stroke="${accent}" stroke-width="1" opacity="0.15"/>`);
  } else if (style === "sapphire") {
    // Diamond grid pattern
    for (let i = 0; i < 12; i++) {
      const x = (i * 90) % W;
      const y = (i * 70) % 250;
      parts.push(`<rect x="${x}" y="${y}" width="20" height="20" fill="${accent}" opacity="0.06" transform="rotate(45 ${x + 10} ${y + 10})"/>`);
    }
    // Concentric circles top
    parts.push(`<circle cx="${W / 2}" cy="0" r="300" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.1"/>`);
    parts.push(`<circle cx="${W / 2}" cy="0" r="380" fill="none" stroke="${accent}" stroke-width="1" opacity="0.07"/>`);
    parts.push(`<circle cx="${W / 2}" cy="0" r="450" fill="none" stroke="${accent}" stroke-width="0.5" opacity="0.05"/>`);
  } else if (style === "bronze") {
    // Geometric diamond pattern
    parts.push(`<path d="M ${W / 2} 50 L ${W / 2 + 40} 100 L ${W / 2} 150 L ${W / 2 - 40} 100 Z" fill="${accent}" opacity="0.2"/>`);
    // Horizontal ruled lines
    for (let i = 0; i < 5; i++) {
      const y = 80 + i * 30;
      parts.push(`<line x1="80" y1="${y}" x2="${W / 2 - 80}" y2="${y}" stroke="${accent}" stroke-width="1" opacity="0.15"/>`);
      parts.push(`<line x1="${W / 2 + 80}" y1="${y}" x2="${W - 80}" y2="${y}" stroke="${accent}" stroke-width="1" opacity="0.15"/>`);
    }
    // Corner flourish
    parts.push(`<path d="M 60 60 Q 80 40 100 60" stroke="${accent}" stroke-width="2" fill="none" opacity="0.3"/>`);
    parts.push(`<path d="M ${W - 60} 60 Q ${W - 80} 40 ${W - 100} 60" stroke="${accent}" stroke-width="2" fill="none" opacity="0.3"/>`);
  } else if (style === "silvernight") {
    // Subtle grid lines
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 160;
      parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${accent}" stroke-width="0.5" opacity="0.05"/>`);
    }
    for (let i = 0; i < 9; i++) {
      const y = 100 + i * 150;
      parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${accent}" stroke-width="0.5" opacity="0.05"/>`);
    }
    // Silver sparkles
    for (let i = 0; i < 20; i++) {
      const x = (i * 53) % W;
      const y = (i * 71) % H;
      parts.push(`<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.6}" fill="${accent}" opacity="${0.15 + (i % 4) * 0.08}"/>`);
    }
    // Border frame
    parts.push(`<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.12"/>`);
  }

  return parts.join("\n");
}

function photoBlock(photoDataUri: string | undefined, initials: string, accent: string, badgeText: string): string {
  const cx = W / 2;
  const cy = 520;
  const r = 190;
  const ring = `
    <circle cx="${cx}" cy="${cy}" r="${r + 22}" fill="none" stroke="${accent}" stroke-width="6" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="rgba(255,255,255,0.12)"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.4" stroke-dasharray="12 6"/>
  `;
  if (photoDataUri) {
    const safe = photoDataUri.replace(/"/g, "&quot;");
    return `
      ${ring}
      <defs>
        <clipPath id="photoClip">
          <circle cx="${cx}" cy="${cy}" r="${r}"/>
        </clipPath>
        <filter id="photoShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.15)" filter="url(#photoShadow)"/>
      <image href="${safe}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
    `;
  }
  return `
    ${ring}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.18)"/>
    <text x="${cx}" y="${cy + 32}" text-anchor="middle"
      font-family="'Playfair Display', Georgia, serif"
      font-size="108" font-weight="700" fill="${accent}"
      filter="url(#shadow)">${escapeXml(initials)}</text>
  `;
}

function wrapMessageLines(msg: string, maxChars = 34): string[] {
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
    return [
      "birthday-confetti",
      "birthday-bloom",
      "birthday-sunset",
      "birthday-galaxy",
      "birthday-tropical",
      "birthday-rose-gold",
      "birthday-ocean",
      "birthday-midnight",
    ];
  }
  return [
    "anniversary-navy",
    "anniversary-emerald",
    "anniversary-royal",
    "anniversary-crimson",
    "anniversary-sapphire",
    "anniversary-bronze",
    "anniversary-midnight",
  ];
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
      ? "Celebrating you today ✨"
      : opts.yearsOfService
        ? `${opts.yearsOfService} ${opts.yearsOfService === 1 ? "Year" : "Years"} of Excellence`
        : "Milestone Celebration";

  const nameFont = theme.nameFont
    ? `'${theme.nameFont}', Georgia, 'Times New Roman', serif`
    : "'Inter', 'Segoe UI', Arial, sans-serif";
  const bodyFont = "'Inter', 'Segoe UI', Arial, sans-serif";
  const accentFont = "Georgia, 'Palatino Linotype', serif";

  const nameY = kind === "anniversary" && opts.yearsOfService ? 910 : 830;
  // Stack: name @ nameY, designation @ nameY+52, dept @ nameY+90 (if both present)
  const desigY  = nameY + 52;
  const deptY   = designation ? nameY + 90 : nameY + 48;
  const msgY    = (designation && dept ? nameY + 136 : designation || dept ? nameY + 100 : nameY + 72);

  const msgLines = lines
    .map(
      (ln, i) =>
        `<text x="${W / 2}" y="${msgY + i * 48}" text-anchor="middle"
          font-family="${escapeXml(accentFont)}" font-size="34" letter-spacing="0.3"
          fill="${theme.subtext}">${escapeXml(ln)}</text>`,
    )
    .join("\n");

  const yearsBadge =
    kind === "anniversary" && opts.yearsOfService
      ? `
    <rect x="${W / 2 - 100}" y="750" width="200" height="60" rx="30"
      fill="${theme.badge}" filter="url(#shadow)"/>
    <text x="${W / 2}" y="791" text-anchor="middle"
      font-family="${escapeXml(bodyFont)}" font-size="28" font-weight="700"
      fill="${theme.badgeText}" letter-spacing="2">${opts.yearsOfService} ${opts.yearsOfService === 1 ? "YEAR" : "YEARS"}</text>
  `
      : "";

  const gradD = theme.gradD || theme.gradA;

  // Gradient overlay strip behind name area
  const nameAreaY = nameY - 70;
  const nameAreaH = (lines.length * 48) + (designation ? 120 : 88) + 60;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&amp;family=Inter:wght@400;500;600;700&amp;display=swap');
    </style>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.gradA}"/>
      <stop offset="35%" stop-color="${theme.gradB}"/>
      <stop offset="70%" stop-color="${theme.gradC}"/>
      <stop offset="100%" stop-color="${gradD}"/>
    </linearGradient>
    <linearGradient id="nameOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="40%" stop-color="rgba(0,0,0,0.18)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.28)" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${decorSvg(theme.decor, theme.accent, theme)}
  <rect x="0" y="${nameAreaY}" width="${W}" height="${nameAreaH}" fill="url(#nameOverlay)"/>

  <text x="${W / 2}" y="112" text-anchor="middle"
    font-family="${escapeXml(nameFont)}" font-size="58" font-weight="700"
    fill="${theme.text}" filter="url(#shadow)"
    letter-spacing="-0.5">${escapeXml(headline)}</text>
  <text x="${W / 2}" y="168" text-anchor="middle"
    font-family="${escapeXml(bodyFont)}" font-size="26" font-weight="500"
    fill="${theme.subtext}" letter-spacing="1">${escapeXml(subHead)}</text>

  ${photoBlock(opts.photoDataUri, initials, theme.accent, theme.badgeText)}

  ${yearsBadge}

  <text x="${W / 2}" y="${nameY}" text-anchor="middle"
    font-family="${escapeXml(nameFont)}" font-size="54" font-weight="700"
    fill="${theme.text}" filter="url(#shadow)"
    letter-spacing="-0.3">${escapeXml(name)}</text>
  ${designation
    ? `<text x="${W / 2}" y="${desigY}" text-anchor="middle"
        font-family="${escapeXml(bodyFont)}" font-size="26" font-weight="500"
        fill="${theme.subtext}" letter-spacing="0.5">${escapeXml(designation)}</text>`
    : ""}
  ${dept
    ? `<text x="${W / 2}" y="${deptY}" text-anchor="middle"
        font-family="${escapeXml(bodyFont)}" font-size="22" font-weight="400"
        fill="${theme.subtext}" opacity="0.8" letter-spacing="0.3">${escapeXml(dept)}</text>`
    : ""}
  ${msgLines}

  <line x1="160" y1="${H - 105}" x2="${W - 160}" y2="${H - 105}"
    stroke="${theme.accent}" stroke-width="1" opacity="0.3"/>
  <text x="${W / 2}" y="${H - 72}" text-anchor="middle"
    font-family="${escapeXml(bodyFont)}" font-size="20" font-weight="500"
    fill="${theme.subtext}" letter-spacing="3" opacity="0.8">WTT  ·  HUMAN RESOURCES</text>
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
