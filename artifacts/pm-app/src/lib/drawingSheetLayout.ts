/** A3 landscape fabrication sheet layout (mm) — WTT-style single-page GA. */

export const SHEET = {
  pageW: 420,
  pageH: 297,
  margin: 12,
  borderWidth: 0.6,
} as const;

export const TITLE_BLOCK = {
  width: 130,
  height: 58,
} as const;

export const BOM_PANEL = {
  width: 150,
  headerH: 9,
  rowH: 6.2,
  fontSize: 5.5,
  headerFontSize: 6,
} as const;

/** WTT reference BOM — matches fabrication drawing table headers. */
export const WTT_BOM_COLUMNS = [
  { key: "sr",          label: "Item No.",   w: 12  },
  { key: "description", label: "Description",w: 28  },
  { key: "size",        label: "Size",       w: 11  },
  { key: "moc",        label: "MOC",        w: 13  },
  { key: "std",         label: "STD",        w: 10  },
  { key: "pn",          label: "PN / SCH",   w: 14  },
  { key: "type",        label: "Type",       w: 26  },
  { key: "qty",         label: "Qty",        w: 10  },
  { key: "totalLength", label: "Length",     w: 16  },
] as const;

/** @deprecated Use WTT_BOM_COLUMNS */
export const BOM_COLUMNS = WTT_BOM_COLUMNS;

export interface BomRow {
  sr: number;
  partNo: string;
  description: string;
  size: string;
  moc: string;
  std: string;
  pn: string;
  type: string;
  qty: number;
  totalLength: string;
  length: number;
  width: number;
  height: number;
  material: string;
  remarks: string;
}

export interface SheetMeta {
  drawingNumber: string;
  title: string;
  revision: string;
  scale: string;
  sheet: string;
  date: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  project: string;
}

export interface SheetRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GaSheetRegions {
  leftW: number;
  rightW: number;
  /** Front elevation — top-left */
  front: SheetRegion;
  /** Plan view (top view) — bottom-left */
  plan: SheetRegion;
  /** BOM table — top-right */
  bom: SheetRegion;
  /** Isometric view — bottom-right */
  iso: SheetRegion;
  /** Title block position */
  titleX: number;
  titleY: number;
  innerL: number;
  innerT: number;
  innerR: number;
  innerB: number;
}

/**
 * A3 landscape — WTT 4-panel layout:
 *   Top-left    (62% wide × 57% tall): FRONT ELEVATION with dimensions
 *   Bottom-left (62% wide × 43% tall): PLAN VIEW with dimensions
 *   Top-right   (38% wide × 42% tall): BOM TABLE
 *   Bottom-right(38% wide × 58% tall): ISOMETRIC 3D + Title block
 */
export function getGaSheetRegions(pageW: number, pageH: number): GaSheetRegions {
  const m = SHEET.margin;
  const innerL = m + 6;   // extra margin for zone labels
  const innerT = m + 4;
  const innerR = pageW - m;
  const innerB = pageH - m;
  const innerW = innerR - innerL;
  const innerH = innerB - innerT;

  const rightW = BOM_PANEL.width;
  const divGap = 3;
  const leftW = innerW - rightW - divGap;
  const rightX = innerL + leftW + divGap;

  // Left column: front 57% / plan 43%
  const frontH = Math.round(innerH * 0.57);
  const planH = innerH - frontH - divGap;

  // Right column: BOM 40% / ISO 60%
  const bomH = Math.round(innerH * 0.40);
  const isoH = innerH - bomH - divGap;

  return {
    leftW,
    rightW,
    front: { x: innerL, y: innerT,               w: leftW, h: frontH },
    plan:  { x: innerL, y: innerT + frontH + divGap, w: leftW, h: planH  },
    bom:   { x: rightX, y: innerT,               w: rightW, h: bomH  },
    iso:   { x: rightX, y: innerT + bomH + divGap,  w: rightW, h: isoH  },
    titleX: innerR - TITLE_BLOCK.width,
    titleY: innerB - TITLE_BLOCK.height,
    innerL,
    innerT,
    innerR,
    innerB,
  };
}

export function getDrawingArea(pageW: number, pageH: number, bomWidth: number) {
  const innerL = SHEET.margin;
  const innerT = SHEET.margin;
  const innerR = pageW - SHEET.margin;
  const innerB = pageH - SHEET.margin;
  const drawR = innerR - bomWidth - 4;
  return {
    x: innerL, y: innerT,
    w: drawR - innerL,
    h: innerB - innerT,
    innerL, innerT, innerR, innerB,
    bomX: drawR + 2,
    bomY: innerT,
    bomW: bomWidth,
    bomH: innerB - innerT,
    titleX: innerR - TITLE_BLOCK.width,
    titleY: innerB - TITLE_BLOCK.height,
  };
}

export function computeScaleLabel(modelSizeMm: number, drawAreaMm: number): string {
  if (modelSizeMm <= 0 || drawAreaMm <= 0) return "NTS";
  const ratio = modelSizeMm / (drawAreaMm * 0.85);
  if (ratio <= 0) return "NTS";
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  let pick = nice[nice.length - 1];
  for (const n of nice) { if (ratio <= n) { pick = n; break; } }
  return `1:${pick}`;
}

export function formatSheetDate(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
