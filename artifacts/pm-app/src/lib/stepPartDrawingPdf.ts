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

function drawSheetBorder(pdf: jsPDF, pageW: number, pageH: number) {
  const m = SHEET.margin;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(SHEET.borderWidth);
  pdf.rect(m, m, pageW - m * 2, pageH - m * 2);

  pdf.setLineWidth(0.25);
  const len = 6;
  [[m, m], [pageW - m, m], [m, pageH - m], [pageW - m, pageH - m]].forEach(([cx, cy], i) => {
    const dx = i % 2 === 0 ? len : -len;
    const dy = i < 2 ? len : -len;
    pdf.line(cx, cy, cx + dx, cy);
    pdf.line(cx, cy, cx, cy + dy);
  });
}

function drawQuadrantFrames(pdf: jsPDF, r: ReturnType<typeof getGaSheetRegions>) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.35);
  for (const region of [r.front, r.plan, r.bom, r.iso]) {
    pdf.rect(region.x, region.y, region.w, region.h);
  }
  pdf.setLineWidth(0.2);
  pdf.line(r.front.x + r.front.w + 1.5, r.innerT, r.front.x + r.front.w + 1.5, r.innerB);
}

function drawWttTitleBlock(pdf: jsPDF, meta: SheetMeta, x: number, y: number) {
  const w = TITLE_BLOCK.width;
  const h = TITLE_BLOCK.height;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, h, "F");
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.35);
  pdf.rect(x, y, w, h);

  pdf.line(x, y + 14, x + w, y + 14);
  pdf.line(x, y + 28, x + w, y + 28);
  pdf.line(x, y + 40, x + w, y + 40);
  pdf.line(x + 56, y, x + 56, y + h);
  pdf.line(x + 84, y + 28, x + 84, y + h);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("WTT INTERNATIONAL PVT LTD", x + 2, y + 6);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(5.8);
  pdf.text("NOTE: ALL DIMENSIONS ARE IN mm", x + 2, y + 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.text("DWG NO", x + 2, y + 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  const dn = meta.drawingNumber.length > 32 ? `${meta.drawingNumber.slice(0, 29)}…` : meta.drawingNumber;
  pdf.text(dn, x + 2, y + 25);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.text("TITLE", x + 2, y + 33);
  pdf.setFontSize(5.8);
  const tit = meta.title.length > 38 ? `${meta.title.slice(0, 35)}…` : meta.title;
  pdf.text(tit, x + 2, y + 38);

  pdf.setFontSize(5);
  pdf.text("DRAWN BY", x + 58, y + 6);
  pdf.text(meta.drawnBy, x + 58, y + 10);
  pdf.text("CHECKED BY", x + 58, y + 18);
  pdf.text(meta.checkedBy, x + 58, y + 22);
  pdf.text("APPROVED BY", x + 58, y + 30);
  pdf.text(meta.approvedBy, x + 58, y + 34);

  pdf.text("SCALE", x + 86, y + 32);
  pdf.setFont("helvetica", "bold");
  pdf.text(meta.scale, x + 86, y + 36);
  pdf.setFont("helvetica", "normal");
  pdf.text("REV", x + 86, y + 6);
  pdf.text(meta.revision, x + 98, y + 6);
  pdf.text("DATE", x + 86, y + 18);
  pdf.text(meta.date, x + 86, y + 22);
  pdf.text("SHEET", x + 58, y + 46);
  pdf.setFont("helvetica", "bold");
  pdf.text(meta.sheet, x + 72, y + 46);
}

function drawBomTable(pdf: jsPDF, rows: BomRow[], x: number, y: number, w: number, maxH: number) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.35);

  pdf.setFillColor(230, 230, 230);
  pdf.rect(x, y, w, BOM_PANEL.headerH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(BOM_PANEL.headerFontSize + 0.5);
  pdf.text("BILL OF MATERIALS", x + w / 2, y + 5.5, { align: "center" });
  y += BOM_PANEL.headerH;
  pdf.line(x, y, x + w, y);

  pdf.setFontSize(BOM_PANEL.fontSize);
  let cx = x;
  for (const col of WTT_BOM_COLUMNS) {
    pdf.text(col.label, cx + 0.5, y + 4.2);
    cx += col.w;
  }
  y += BOM_PANEL.rowH;
  pdf.line(x, y, x + w, y);

  pdf.setFont("helvetica", "normal");
  const maxRows = Math.floor((maxH - BOM_PANEL.headerH - BOM_PANEL.rowH) / BOM_PANEL.rowH);
  const slice = rows.slice(0, maxRows);

  for (const row of slice) {
    cx = x;
    const qtyCell = row.description === "PIPE" ? "" : String(row.qty || "");
    const cells = [
      String(row.sr), row.description, row.size, row.moc, row.std, row.pn, row.type,
      qtyCell, row.totalLength,
    ];
    WTT_BOM_COLUMNS.forEach((col, i) => {
      let txt = cells[i] ?? "";
      if (pdf.getTextWidth(txt) > col.w - 1.5) {
        txt = txt.slice(0, Math.max(2, Math.floor(col.w / 1.4)));
      }
      pdf.text(txt, cx + 0.5, y + 4);
      cx += col.w;
    });
    y += BOM_PANEL.rowH;
    pdf.line(x, y, x + w, y);
  }
}

function drawViewPanel(
  pdf: jsPDF,
  png: string,
  region: SheetRegion,
  label: string,
  pad = 2,
) {
  pdf.addImage(png, "PNG", region.x + pad, region.y + pad, region.w - pad * 2, region.h - pad * 2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, region.x + 3, region.y + 5);
}

/** One A3 page — WTT fabrication GA (matches reference sheet layout). */
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
  drawQuadrantFrames(pdf, r);

  drawBomTable(pdf, bomRows, r.bom.x, r.bom.y, r.bom.w, r.bom.h);

  const viewOpts = { ...HD_MEASURED_VIEW, showBanner: false };
  const frontPng = renderAssemblyMeasured3dView(meshes, parts, "front", viewOpts);
  drawViewPanel(pdf, frontPng, r.front, "FRONT VIEW");

  const planPng = renderAssemblyMeasured3dView(meshes, parts, "top", viewOpts);
  drawViewPanel(pdf, planPng, r.plan, "PLAN VIEW");

  const balloons = partBalloonLabels(parts, bomRows);
  const isoPng = renderAssemblyGaIso(meshes, parts, {
    ...HD_GA_ISO,
    showBalloons: parts.length > 0 && parts.length <= 30,
    balloonLabels: balloons,
    drawingNumber: meta.drawingNumber,
    drawingTitle: meta.title,
  });
  drawViewPanel(pdf, isoPng, r.iso, "ISOMETRIC VIEW");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.text(`SCALE ${meta.scale}`, r.plan.x + 3, r.plan.y + r.plan.h - 4);

  drawWttTitleBlock(pdf, meta, r.titleX, r.titleY);
}

/** Exactly one landscape A3 page — no extra sheets. */
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

  pdf.setProperties({
    title: `${number} — ${title}`,
    subject: "WTT Fabrication GA",
  });

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

export type { PartDrawingInfo };
