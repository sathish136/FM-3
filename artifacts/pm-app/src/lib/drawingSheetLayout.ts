/** A3 landscape fabrication sheet layout (mm) — WTT-style single-page GA. */

export const SHEET = {
  pageW: 420,
  pageH: 297,
  margin: 12,
  borderWidth: 0.5,
} as const;

export const TITLE_BLOCK = {
  width: 118,
  height: 56,
} as const;

export const BOM_PANEL = {
  width: 152,
  headerH: 9,
  rowH: 6,
  fontSize: 5.6,
  headerFontSize: 6,
} as const;

/** WTT reference BOM — matches fabrication drawing table headers. */
export const WTT_BOM_COLUMNS = [
  { key: "sr", label: "Item Number", w: 11 },
  { key: "description", label: "DESCRIPTION", w: 26 },
  { key: "size", label: "SIZE", w: 10 },
  { key: "moc", label: "MOC", w: 12 },
  { key: "std", label: "STD", w: 10 },
  { key: "pn", label: "PN-CLS-SCH", w: 13 },
  { key: "type", label: "TYPE", w: 24 },
  { key: "qty", label: "Quantity", w: 11 },
  { key: "totalLength", label: "Total Length", w: 16 },
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
  front: SheetRegion;
  plan: SheetRegion;
  bom: SheetRegion;
  iso: SheetRegion;
  titleX: number;
  titleY: number;
  innerL: number;
  innerT: number;
  innerR: number;
  innerB: number;
}

/**
 * Single A3 sheet — left: FRONT + PLAN; right: BOM + ISOMETRIC;
 * title block sits in the bottom-right corner (over isometric), like WTT reference.
 */
export function getGaSheetRegions(pageW: number, pageH: number): GaSheetRegions {
  const m = SHEET.margin;
  const innerL = m;
  const innerT = m;
  const innerR = pageW - m;
  const innerB = pageH - m;
  const innerW = innerR - innerL;
  const innerH = innerB - innerT;

  const rightW = BOM_PANEL.width;
  const leftW = innerW - rightW - 3;
  const gap = 2;
  const halfH = (innerH - gap) / 2;
  const rightX = innerL + leftW + 3;
  const bomH = Math.min(132, halfH + 8);

  return {
    leftW,
    rightW,
    front: { x: innerL, y: innerT, w: leftW, h: halfH },
    plan: { x: innerL, y: innerT + halfH + gap, w: leftW, h: halfH },
    bom: { x: rightX, y: innerT, w: rightW, h: bomH },
    iso: { x: rightX, y: innerT + bomH + gap, w: rightW, h: innerH - bomH - gap },
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
    x: innerL,
    y: innerT,
    w: drawR - innerL,
    h: innerB - innerT,
    innerL,
    innerT,
    innerR,
    innerB,
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
  for (const n of nice) {
    if (ratio <= n) { pick = n; break; }
  }
  return `1:${pick}`;
}

export function formatSheetDate(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
