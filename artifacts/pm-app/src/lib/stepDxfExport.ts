/**
 * DXF R12 export for WTT fabrication GA sheet (opens in AutoCAD / BricsCAD).
 * True DWG is proprietary; DXF is the standard interchange format.
 */
import type { MeshData, TreeNode } from "./stepLoader";
import { collectParts, parseDrawingTitle, partsToBomRows } from "./stepPartDrawing";
import {
  SHEET,
  TITLE_BLOCK,
  BOM_PANEL,
  WTT_BOM_COLUMNS,
  getGaSheetRegions,
  formatSheetDate,
  type SheetMeta,
  type BomRow,
} from "./drawingSheetLayout";

type DxfEntity = string;

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\P");
}

function dxfHeader(): string {
  return [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1009",
    "9", "$INSUNITS", "70", "4",
    "0", "ENDSEC",
  ].join("\n") + "\n";
}

function dxfTables(layers: string[]): string {
  const lines: string[] = ["0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", String(layers.length)];
  for (const layer of layers) {
    lines.push("0", "LAYER", "2", layer, "70", "0", "62", "7", "6", "CONTINUOUS");
  }
  lines.push("0", "ENDTAB", "0", "ENDSEC");
  return lines.join("\n") + "\n";
}

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer: string): DxfEntity {
  return ["0", "LINE", "8", layer, "10", String(x1), "20", String(y1), "11", String(x2), "21", String(y2)].join("\n");
}

function dxfText(x: number, y: number, h: number, text: string, layer: string): DxfEntity {
  return ["0", "TEXT", "8", layer, "10", String(x), "20", String(y), "40", String(h), "1", esc(text)].join("\n");
}

function dxfRect(x: number, y: number, w: number, h: number, layer: string): DxfEntity[] {
  return [
    dxfLine(x, y, x + w, y, layer),
    dxfLine(x + w, y, x + w, y + h, layer),
    dxfLine(x + w, y + h, x, y + h, layer),
    dxfLine(x, y + h, x, y, layer),
  ];
}

/** Flip Y for DXF (Y-up) from sheet coords (Y-down from top). */
function flipY(y: number, pageH: number): number {
  return pageH - y;
}

function drawSheetBorderDxf(entities: DxfEntity[], pageW: number, pageH: number) {
  const m = SHEET.margin;
  entities.push(...dxfRect(m, flipY(m + (pageH - 2 * m), pageH), pageW - 2 * m, pageH - 2 * m, "BORDER"));
}

function drawGridDxf(entities: DxfEntity[], pageW: number, pageH: number) {
  const m = SHEET.margin;
  const titleH = TITLE_BLOCK.height;
  const innerL = m;
  const innerT = m;
  const innerR = pageW - m;
  const innerB = pageH - m - titleH;
  const cols = 8;
  const rows = 6;
  const iw = innerR - innerL;
  const ih = innerB - innerT;
  for (let c = 1; c < cols; c++) {
    const x = innerL + (c * iw) / cols;
    entities.push(dxfLine(x, flipY(innerT, pageH), x, flipY(innerB, pageH), "GRID"));
  }
  for (let r = 1; r < rows; r++) {
    const y = innerT + (r * ih) / rows;
    entities.push(dxfLine(innerL, flipY(y, pageH), innerR, flipY(y, pageH), "GRID"));
  }
}

function drawBomDxf(entities: DxfEntity[], rows: BomRow[], x: number, y: number, w: number, pageH: number) {
  let cy = y + 8;
  entities.push(dxfText(x + 2, flipY(cy, pageH), 3, "BILL OF MATERIALS", "BOM"));
  cy += 6;
  let cx = x;
  for (const col of WTT_BOM_COLUMNS) {
    entities.push(dxfText(cx, flipY(cy, pageH), 2, col.label, "BOM"));
    cx += col.w;
  }
  cy += 5;
  for (const row of rows.slice(0, 20)) {
    cx = x;
    const cells = [
      String(row.sr), row.description, row.size, row.moc, row.std, row.pn, row.type,
      String(row.qty), row.totalLength,
    ];
    WTT_BOM_COLUMNS.forEach((col, i) => {
      entities.push(dxfText(cx, flipY(cy, pageH), 2, (cells[i] ?? "").slice(0, 12), "BOM"));
      cx += col.w;
    });
    cy += 5;
  }
}

function drawTitleBlockDxf(entities: DxfEntity[], meta: SheetMeta, x: number, y: number, pageH: number) {
  const w = TITLE_BLOCK.width;
  const h = TITLE_BLOCK.height;
  const fy = flipY(y, pageH);
  entities.push(...dxfRect(x, fy - h, w, h, "TITLE"));
  entities.push(dxfText(x + 2, fy - 6, 2.5, "WTT INTERNATIONAL PVT LTD", "TITLE"));
  entities.push(dxfText(x + 2, fy - 14, 2, "NOTE: ALL DIMENSIONS ARE IN mm", "TITLE"));
  entities.push(dxfText(x + 2, fy - 22, 2, `DRAWING NO: ${meta.drawingNumber}`, "TITLE"));
  entities.push(dxfText(x + 2, fy - 30, 2, `TITLE: ${meta.title}`, "TITLE"));
  entities.push(dxfText(x + 2, fy - 38, 1.8, `SCALE ${meta.scale}  REV ${meta.revision}  DATE ${meta.date}`, "TITLE"));
  entities.push(dxfText(x + 2, fy - 46, 1.8, `DRAWN: ${meta.drawnBy}  SHEET ${meta.sheet}`, "TITLE"));
}

export function generateFabricationDxf(
  fileName: string,
  meshes: MeshData[],
  root: TreeNode | null,
): string {
  const { number, title } = parseDrawingTitle(fileName);
  const parts = collectParts(meshes, root);
  const bomRows = partsToBomRows(parts);
  const pageW = SHEET.pageW;
  const pageH = SHEET.pageH;
  const r = getGaSheetRegions(pageW, pageH);

  const meta: SheetMeta = {
    drawingNumber: number,
    title,
    revision: "00",
    scale: "NTS",
    sheet: "1 / 1",
    date: formatSheetDate(),
    drawnBy: "AUTO/STEP",
    checkedBy: "—",
    approvedBy: "—",
    project: "WTT",
  };

  const entities: DxfEntity[] = [];
  drawSheetBorderDxf(entities, pageW, pageH);
  drawGridDxf(entities, pageW, pageH);
  drawBomDxf(entities, bomRows, r.bom.x, r.bom.y, r.bom.w, pageH);
  drawTitleBlockDxf(entities, meta, r.titleX, r.titleY, pageH);

  entities.push(dxfText(r.front.x + 2, flipY(r.front.y + 6, pageH), 2.5, "FRONT VIEW", "TEXT"));
  entities.push(dxfText(r.plan.x + 2, flipY(r.plan.y + 6, pageH), 2.5, "PLAN VIEW", "TEXT"));
  entities.push(dxfText(r.iso.x + 2, flipY(r.iso.y + 6, pageH), 2.5, "ISOMETRIC VIEW", "TEXT"));
  entities.push(...dxfRect(r.front.x, flipY(r.front.y + r.front.h, pageH), r.front.w, r.front.h, "BORDER"));
  entities.push(...dxfRect(r.plan.x, flipY(r.plan.y + r.plan.h, pageH), r.plan.w, r.plan.h, "BORDER"));
  entities.push(...dxfRect(r.iso.x, flipY(r.iso.y + r.iso.h, pageH), r.iso.w, r.iso.h, "BORDER"));

  entities.push(
    dxfText(r.iso.x + 4, flipY(r.iso.y + 20, pageH), 2, "CONNECTED TO: PUMP LINE", "TEXT"),
    dxfText(r.iso.x + 4, flipY(r.iso.y + r.iso.h - 12, pageH), 2, `CONNECTED TO: ${number}`, "TEXT"),
  );

  const body = [
    dxfHeader(),
    dxfTables(["0", "BORDER", "GRID", "BOM", "TITLE", "TEXT", "DIMS"]),
    "0", "SECTION", "2", "ENTITIES",
    ...entities,
    "0", "ENDSEC",
    "0", "EOF",
  ].join("\n");

  return body;
}

export function downloadFabricationDxf(
  fileName: string,
  meshes: MeshData[],
  root: TreeNode | null,
): void {
  const dxf = generateFabricationDxf(fileName, meshes, root);
  const { number } = parseDrawingTitle(fileName);
  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number}-GA-FAB.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

