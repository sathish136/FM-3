import { jsPDF } from "jspdf";
import type { MeshData, TreeNode } from "./stepLoader";
import {
  SHEET,
  TITLE_BLOCK,
  BOM_PANEL,
  WTT_BOM_COLUMNS,
  getGaSheetRegions,
  computeScaleLabel,
  formatSheetDate,
  type SheetMeta,
  type BomRow,
  type SheetRegion,
} from "./drawingSheetLayout";
import { drawBorderGridPdf } from "./gaSheetAnnotations";
import {
  collectParts,
  assemblyBounds,
  parseDrawingTitle,
  partsToBomRows,
  partBalloonLabels,
  type PartDrawingInfo,
} from "./stepPartDrawing";
import { renderAssemblyMeasured3dView, HD_MEASURED_VIEW } from "./stepMeasured3dView";
import { renderAssemblyGaIso, HD_GA_ISO } from "./stepMeshRenderer";

// ─── Sheet border ────────────────────────────────────────────────────────────

function drawSheetBorder(pdf: jsPDF, pageW: number, pageH: number) {
  const m = SHEET.margin;
  // Outer thin frame
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(m * 0.5, m * 0.5, pageW - m, pageH - m);
  // Inner thick border
  pdf.setLineWidth(SHEET.borderWidth);
  pdf.rect(m, m, pageW - m * 2, pageH - m * 2);

  // Corner cross marks
  pdf.setLineWidth(0.2);
  const len = 5;
  [[m, m], [pageW - m, m], [m, pageH - m], [pageW - m, pageH - m]].forEach(([cx, cy], i) => {
    const dx = i % 2 === 0 ? len : -len;
    const dy = i < 2 ? len : -len;
    pdf.line(cx, cy, cx + dx, cy);
    pdf.line(cx, cy, cx, cy + dy);
  });
}

// ─── Panel outlines ───────────────────────────────────────────────────────────

function drawPanelFrames(pdf: jsPDF, r: ReturnType<typeof getGaSheetRegions>) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(r.front.x, r.front.y, r.front.w, r.front.h);
  pdf.rect(r.plan.x,  r.plan.y,  r.plan.w,  r.plan.h);
  pdf.rect(r.bom.x,   r.bom.y,   r.bom.w,   r.bom.h);
  pdf.rect(r.iso.x,   r.iso.y,   r.iso.w,   r.iso.h);
}

function panelLabel(pdf: jsPDF, region: SheetRegion, label: string) {
  const lh = 5.5;
  pdf.setFillColor(26, 26, 46);
  pdf.rect(region.x, region.y, region.w, lh, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(label, region.x + 2, region.y + 3.8);
  pdf.setTextColor(0, 0, 0);
}

// ─── WTT Title block ─────────────────────────────────────────────────────────

function drawWttTitleBlock(pdf: jsPDF, meta: SheetMeta, x: number, y: number) {
  const w = TITLE_BLOCK.width;
  const h = TITLE_BLOCK.height;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, h, "F");
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, w, h);

  // ── Company name row (height 10) ──────────────────────────────
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 10, "F");
  pdf.setLineWidth(0.3);
  pdf.line(x, y + 10, x + w, y + 10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("WTT INTERNATIONAL PVT LTD", x + w / 2, y + 6.5, { align: "center" });

  // Horizontal dividers
  pdf.setLineWidth(0.25);
  pdf.line(x, y + 22, x + w, y + 22);   // DWG NO / TITLE divider
  pdf.line(x, y + 34, x + w, y + 34);   // title / footer divider
  pdf.line(x, y + 44, x + w, y + 44);   // signoff / footer divider

  // Vertical divider: left fields (80mm) | right signoff (50mm)
  const vSplit = x + 80;
  pdf.line(vSplit, y + 10, vSplit, y + 44);

  // DWG NO
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.5);
  pdf.text("DWG NO.", x + 1.5, y + 13.5);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  const dn = meta.drawingNumber.length > 34 ? `${meta.drawingNumber.slice(0, 31)}…` : meta.drawingNumber;
  pdf.text(dn, x + 1.5, y + 19.5);

  // TITLE
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.5);
  pdf.text("TITLE", x + 1.5, y + 25);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6);
  const tit = meta.title.length > 40 ? `${meta.title.slice(0, 37)}…` : meta.title;
  pdf.text(tit, x + 1.5, y + 31);

  // NOTE
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(4.8);
  pdf.text("NOTE: ALL DIMENSIONS IN mm", x + 1.5, y + 40);

  // Signoff columns (right of vSplit)
  const rows = [
    { label: "DRAWN BY",  val: meta.drawnBy,   y: y + 10 },
    { label: "CHECKED",   val: meta.checkedBy,  y: y + 22 },
    { label: "APPROVED",  val: meta.approvedBy, y: y + 34 },
  ];
  const colW2 = (x + w - vSplit) / 2;
  rows.forEach(row => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4);
    pdf.text(row.label, vSplit + 1.5, row.y + 3.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5);
    pdf.text(row.val, vSplit + 1.5, row.y + 8.5);
    pdf.setLineWidth(0.15);
    pdf.line(vSplit, row.y + 12, x + w, row.y + 12);
  });

  // Footer: SCALE | REV | DATE | SHEET
  const footY = y + 44;
  const footH = h - 44;
  const footItems = [
    { label: "SCALE", val: meta.scale },
    { label: "REV",   val: meta.revision },
    { label: "DATE",  val: meta.date },
    { label: "SHEET", val: meta.sheet },
  ];
  const footW = w / footItems.length;
  footItems.forEach((item, i) => {
    const fx = x + i * footW;
    if (i > 0) pdf.line(fx, footY, fx, footY + footH);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4);
    pdf.text(item.label, fx + 1.5, footY + 3.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text(item.val, fx + 1.5, footY + 9);
  });
}

// ─── BOM table ────────────────────────────────────────────────────────────────

function drawBomTable(pdf: jsPDF, rows: BomRow[], x: number, y: number, w: number, maxH: number) {
  const hdrH = BOM_PANEL.headerH;
  const rowH = BOM_PANEL.rowH;

  // Panel title
  pdf.setFillColor(210, 210, 210);
  pdf.rect(x, y, w, hdrH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text("BILL OF MATERIALS", x + w / 2, y + 6, { align: "center" });
  y += hdrH;
  pdf.setLineWidth(0.3);
  pdf.line(x, y, x + w, y);

  // Column headers
  pdf.setFillColor(235, 235, 235);
  pdf.rect(x, y, w, rowH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(BOM_PANEL.fontSize - 0.2);
  let cx = x;
  const totalW = WTT_BOM_COLUMNS.reduce((s, c) => s + c.w, 0);
  const scale = w / totalW;
  for (const col of WTT_BOM_COLUMNS) {
    const cw = col.w * scale;
    pdf.text(col.label, cx + 0.8, y + 4.3);
    cx += cw;
    if (cx < x + w - 0.1) { pdf.setLineWidth(0.15); pdf.line(cx, y, cx, y + maxH - hdrH); }
  }
  y += rowH;
  pdf.setLineWidth(0.25);
  pdf.line(x, y, x + w, y);

  // Rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BOM_PANEL.fontSize);
  const maxRows = Math.floor((maxH - hdrH - rowH) / rowH);
  rows.slice(0, maxRows).forEach((row, ri) => {
    if (ri % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(x, y, w, rowH, "F");
    }
    cx = x;
    const cells = [
      String(row.sr),
      row.description,
      row.size,
      row.moc,
      row.std,
      row.pn,
      row.type,
      row.description === "PIPE" ? "" : String(row.qty || ""),
      row.totalLength,
    ];
    WTT_BOM_COLUMNS.forEach((col, i) => {
      const cw = col.w * scale;
      let txt = cells[i] ?? "";
      const maxPx = cw - 1.5;
      while (txt.length > 2 && pdf.getTextWidth(txt) > maxPx) {
        txt = txt.slice(0, -1);
      }
      pdf.text(txt, cx + 0.8, y + 4);
      cx += cw;
    });
    y += rowH;
    pdf.setLineWidth(0.1);
    pdf.line(x, y, x + w, y);
  });
}

// ─── Image panel ─────────────────────────────────────────────────────────────

function drawImagePanel(pdf: jsPDF, png: string, region: SheetRegion, label: string) {
  const lh = 5.5;
  panelLabel(pdf, region, label);
  const pad = 2;
  pdf.addImage(
    png, "PNG",
    region.x + pad,
    region.y + lh + pad,
    region.w - pad * 2,
    region.h - lh - pad * 2,
  );
}

// ─── Full sheet ───────────────────────────────────────────────────────────────

function drawFabricationGaSheet(
  pdf: jsPDF,
  meta: SheetMeta,
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  bomRows: BomRow[],
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const r = getGaSheetRegions(pageW, pageH);

  drawSheetBorder(pdf, pageW, pageH);
  drawBorderGridPdf(pdf, pageW, pageH, r.innerL, r.innerT, r.innerR, r.innerB);
  drawPanelFrames(pdf, r);

  // ── Front elevation (top-left) ───────────────────────────────
  const viewOpts = { ...HD_MEASURED_VIEW, showBanner: false };
  const frontPng = renderAssemblyMeasured3dView(meshes, parts, "front", viewOpts);
  drawImagePanel(pdf, frontPng, r.front, "FRONT VIEW — ALL DIMENSIONS IN mm");

  // ── Plan view / Top view (bottom-left) ──────────────────────
  const planPng = renderAssemblyMeasured3dView(meshes, parts, "top", viewOpts);
  drawImagePanel(pdf, planPng, r.plan, "PLAN VIEW (TOP) — ALL DIMENSIONS IN mm");

  // ── BOM table (top-right) ────────────────────────────────────
  drawBomTable(pdf, bomRows, r.bom.x, r.bom.y, r.bom.w, r.bom.h);

  // ── Isometric 3D (bottom-right) ──────────────────────────────
  const balloons = partBalloonLabels(parts, bomRows);
  const isoPng = renderAssemblyGaIso(meshes, parts, {
    ...HD_GA_ISO,
    showBalloons: parts.length > 0 && parts.length <= 30,
    balloonLabels: balloons,
    drawingNumber: meta.drawingNumber,
    drawingTitle: meta.title,
  });
  drawImagePanel(pdf, isoPng, r.iso, "ISOMETRIC VIEW");

  // ── Title block (bottom-right, over isometric panel) ─────────
  drawWttTitleBlock(pdf, meta, r.titleX, r.titleY);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateStepPartDrawingPdf(
  fileName: string,
  meshes: MeshData[],
  root: TreeNode | null,
): jsPDF {
  const { number, title } = parseDrawingTitle(fileName);
  const parts = collectParts(meshes, root);
  const bomRows = partsToBomRows(parts);
  const modelSize = assemblyBounds(parts);

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageW = pdf.internal.pageSize.getWidth();
  const r = getGaSheetRegions(pageW, SHEET.pageH);
  const scale = computeScaleLabel(modelSize, Math.min(r.front.w, r.front.h));

  pdf.setProperties({ title: `${number} — ${title}`, subject: "WTT Fabrication GA" });

  if (parts.length === 0) {
    pdf.setFontSize(14);
    pdf.text("No parts found in STEP file", 20, 30);
    return pdf;
  }

  const meta: SheetMeta = {
    drawingNumber: number,
    title,
    revision: "01",
    scale,
    sheet: "1 OF 1",
    date: formatSheetDate(),
    drawnBy: "AUTO / STEP",
    checkedBy: "—",
    approvedBy: "—",
    project: "WTT",
  };

  drawFabricationGaSheet(pdf, meta, meshes, parts, bomRows);
  return pdf;
}

export function downloadStepPartDrawingPdf(
  fileName: string,
  meshes: MeshData[],
  root: TreeNode | null,
): void {
  const pdf = generateStepPartDrawingPdf(fileName, meshes, root);
  const { number } = parseDrawingTitle(fileName);
  pdf.save(`${number}.pdf`);
}

// ─── Custom layout PDF (drag-and-drop builder export) ────────────────────────

export interface CustomPanelLayout {
  x: number; y: number; w: number; h: number; visible: boolean;
}

export interface CustomLayoutPdfConfig {
  drawingNumber: string;
  drawingTitle: string;
  /** Panel positions in mm (converted from canvas pixels by caller) */
  panels: Record<"front" | "plan" | "iso" | "bom", CustomPanelLayout>;
  /** Pre-rendered PNG data URLs from the builder's image cache */
  images: { front: string; plan: string; iso: string };
  parts: PartDrawingInfo[];
}

export async function generateCustomLayoutPdf(cfg: CustomLayoutPdfConfig): Promise<void> {
  const { drawingNumber, drawingTitle, panels, images, parts } = cfg;
  const bomRows = partsToBomRows(parts);

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.setProperties({ title: `${drawingNumber} — ${drawingTitle}`, subject: "WTT Fabrication GA" });

  drawSheetBorder(pdf, pageW, pageH);

  // Zone grid (light guide lines)
  const m = SHEET.margin;
  drawBorderGridPdf(pdf, pageW, pageH, m + 6, m + 4, pageW - m, pageH - m);

  const LH = 5.5; // panel label bar height mm
  const PAD = 2;

  // Helper to draw a panel outline + dark label bar
  function drawPanel(r: CustomPanelLayout, label: string) {
    if (!r.visible) return;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.rect(r.x, r.y, r.w, r.h);
    pdf.setFillColor(26, 26, 46);
    pdf.rect(r.x, r.y, r.w, LH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(label, r.x + 2, r.y + 3.8);
    pdf.setTextColor(0, 0, 0);
  }

  // Front view
  if (panels.front.visible) {
    drawPanel(panels.front, "FRONT VIEW — ALL DIMENSIONS IN mm");
    pdf.addImage(images.front, "PNG",
      panels.front.x + PAD, panels.front.y + LH + PAD,
      panels.front.w - PAD * 2, panels.front.h - LH - PAD * 2);
  }

  // Plan view
  if (panels.plan.visible) {
    drawPanel(panels.plan, "PLAN VIEW (TOP) — ALL DIMENSIONS IN mm");
    pdf.addImage(images.plan, "PNG",
      panels.plan.x + PAD, panels.plan.y + LH + PAD,
      panels.plan.w - PAD * 2, panels.plan.h - LH - PAD * 2);
  }

  // Isometric view
  if (panels.iso.visible) {
    drawPanel(panels.iso, "ISOMETRIC VIEW");
    pdf.addImage(images.iso, "PNG",
      panels.iso.x + PAD, panels.iso.y + LH + PAD,
      panels.iso.w - PAD * 2, panels.iso.h - LH - PAD * 2);
  }

  // BOM table
  if (panels.bom.visible) {
    drawBomTable(pdf, bomRows, panels.bom.x, panels.bom.y, panels.bom.w, panels.bom.h);
  }

  // Title block — always bottom-right
  const meta: SheetMeta = {
    drawingNumber,
    title: drawingTitle,
    revision: "01",
    scale: "NTS",
    sheet: "1 OF 1",
    date: formatSheetDate(),
    drawnBy: "AUTO / STEP",
    checkedBy: "—",
    approvedBy: "—",
    project: "WTT",
  };
  drawWttTitleBlock(pdf, meta, pageW - SHEET.margin - TITLE_BLOCK.width, pageH - SHEET.margin - TITLE_BLOCK.height);

  pdf.save(`${drawingNumber}.pdf`);
}

export type { PartDrawingInfo };
