import type { MeshData, TreeNode } from "./stepLoader";
import type { BomRow } from "./drawingSheetLayout";

export type OrthoView = "front" | "top" | "right" | "iso";

export interface PartBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  length: number;
  width: number;
  height: number;
}

export interface PartDrawingInfo {
  meshIndex: number;
  name: string;
  partNo: string;
  bounds: PartBounds;
}

const PIPE_COLOR = "#1d4ed8";
const FITTING_COLOR = "#334155";
const DIM_COLOR = "#b91c1c";
const PART_COLORS = [
  PIPE_COLOR, FITTING_COLOR, "#047857", "#7c3aed", "#be123c", "#0e7490", "#4d7c0f", "#c2410c",
];

function isPipeLike(bounds: PartBounds): boolean {
  const a = [bounds.length, bounds.width, bounds.height].sort((x, y) => y - x);
  return a[0] > 3 * a[1];
}

function partLineColor(mesh: MeshData, bounds: PartBounds, index: number): string {
  const n = (mesh.name || "").toLowerCase();
  if (n.includes("pipe") || n.includes("tube")) return PIPE_COLOR;
  if (n.includes("elbow") || n.includes("tee") || n.includes("valve") || n.includes("flange")) {
    return FITTING_COLOR;
  }
  if (isPipeLike(bounds)) return PIPE_COLOR;
  return PART_COLORS[index % PART_COLORS.length];
}

function computeBounds(mesh: MeshData): PartBounds {
  const p = mesh.positions;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, length: 0, width: 0, height: 0 };
  }
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    length: maxX - minX,
    width: maxY - minY,
    height: maxZ - minZ,
  };
}

function partNoFromName(name: string, index: number): string {
  const clean = name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  if (clean.length >= 3) return clean.slice(0, 24);
  return `P-${String(index + 1).padStart(3, "0")}`;
}

export function collectParts(meshes: MeshData[], root: TreeNode | null): PartDrawingInfo[] {
  const out: PartDrawingInfo[] = [];
  const visit = (node: TreeNode) => {
    for (const idx of node.meshIndices) {
      if (meshes[idx]) {
        const name = meshes[idx].name || node.name || `Part ${idx + 1}`;
        out.push({
          meshIndex: idx,
          name,
          partNo: partNoFromName(name, idx),
          bounds: computeBounds(meshes[idx]),
        });
      }
    }
    node.children.forEach(visit);
  };
  if (root) visit(root);
  else meshes.forEach((m, i) => {
    const name = m.name || `Part ${i + 1}`;
    out.push({ meshIndex: i, name, partNo: partNoFromName(name, i), bounds: computeBounds(m) });
  });
  return out.filter(p => p.bounds.length > 0.001 || p.bounds.width > 0.001 || p.bounds.height > 0.001);
}

function inferWttBomFields(name: string, bounds: PartBounds) {
  const n = name.toUpperCase();
  const dn = name.match(/DN\s*(\d+)/i);
  const size = dn ? `DN${dn[1]}` : "DN15";

  let description = "PART";
  if (n.includes("ELBOW")) description = "ELBOW";
  else if (n.includes("PIPE") || n.includes("TUBE")) description = "PIPE";
  else if (n.includes("TEE")) description = "TEE";
  else if (n.includes("MTA")) description = "MTA";
  else if (n.includes("NRV") || n.includes("CHECK")) description = "NRV";
  else if (n.includes("BACK PRESSURE") || n.includes("BPCV")) description = "BACK PRESSURE VALVE";
  else if (n.includes("VALVE")) description = "VALVE";
  else if (n.includes("CLAMP") || n.includes("CLIP")) description = "CLAMP";
  else if (n.includes("FLANGE")) description = "FLANGE";
  else if (n.includes("REDUC")) description = "REDUCER";

  const moc = n.includes("SS") || n.includes("316") ? "SS316" : n.includes("PP") ? "PP" : "PVC-U";
  const std = n.includes("WTT") ? "WTT" : "ASME";
  const pn = n.includes("PN16") ? "PN16" : "PN10";

  const longDim = Math.max(bounds.length, bounds.width, bounds.height);
  const totalLength =
    description === "PIPE" ? `${(Math.round(longDim * 10) / 10).toFixed(1)} mm` : "—";

  let type = "—";
  if (description === "ELBOW") type = n.includes("LONG") ? "90 DEGREE LONG RADIUS" : "90 DEGREE SHORT RADIUS";
  else if (description === "PIPE") type = "PLAIN END";
  else if (description === "TEE") type = "EQUAL TEE 90 DEGREE";
  else if (description === "MTA") type = "BSP MALE THREADED X FEMALE SOCKET";
  else if (description === "NRV") type = "BALL CHECK NRV";
  else if (description === "BACK PRESSURE VALVE") type = "FEMALE UNION CONTROLLER";
  else if (description === "CLAMP") {
    type = n.includes("U-CLIP") || n.includes("UCLIP") ? "U-CLIP" : n.includes("PIPE") ? "PIPE TYPE" : "U-CLIP";
    if (moc === "SS316") type = "PIPE TYPE";
  } else if (name.length <= 32) {
    type = name;
  }

  return { description, size, moc, std, pn, type, totalLength };
}

function bomGroupKey(wtt: ReturnType<typeof inferWttBomFields>): string {
  return [wtt.description, wtt.size, wtt.moc, wtt.std, wtt.pn].join("|");
}

/** WTT-style aggregated BOM (elbows ×4, pipe total length, etc.). */
export function partsToBomRows(parts: PartDrawingInfo[]): BomRow[] {
  const raw = parts.map(p => {
    const wtt = inferWttBomFields(p.name, p.bounds);
    return {
      sr: 0,
      partNo: p.partNo,
      description: wtt.description,
      size: wtt.size,
      moc: wtt.moc,
      std: wtt.std,
      pn: wtt.pn,
      type: wtt.type,
      qty: 1,
      totalLength: wtt.totalLength,
      length: Math.round(p.bounds.length * 10) / 10,
      width: Math.round(p.bounds.width * 10) / 10,
      height: Math.round(p.bounds.height * 10) / 10,
      material: wtt.moc,
      remarks: "",
      _pipeMm: wtt.description === "PIPE" ? Math.max(p.bounds.length, p.bounds.width, p.bounds.height) : 0,
    };
  });

  const groups = new Map<string, (typeof raw)[0] & { count: number; pipeMm: number }>();
  for (const row of raw) {
    const key = bomGroupKey(row);
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      g.pipeMm += row._pipeMm;
      g.length = Math.max(g.length, row.length);
      g.width = Math.max(g.width, row.width);
      g.height = Math.max(g.height, row.height);
    } else {
      groups.set(key, { ...row, count: 1, pipeMm: row._pipeMm });
    }
  }

  let sr = 1;
  return Array.from(groups.values()).map(g => {
    const isPipe = g.description === "PIPE";
    const totalMm = isPipe ? g.pipeMm : 0;
    return {
      sr: sr++,
      partNo: g.partNo,
      description: g.description,
      size: g.size,
      moc: g.moc,
      std: g.std,
      pn: g.pn,
      type: g.type,
      qty: isPipe ? 0 : g.count,
      totalLength: isPipe ? `${(Math.round(totalMm * 10) / 10).toFixed(1)} mm` : "—",
      length: g.length,
      width: g.width,
      height: g.height,
      material: g.moc,
      remarks: "",
    };
  });
}

export interface BalloonLabel {
  item: number;
  qty?: number;
}

/** Map each part mesh to BOM item / qty for isometric balloons. */
export function firstPartForBomRow(parts: PartDrawingInfo[], row: BomRow): PartDrawingInfo | undefined {
  return parts.find(p => {
    const wtt = inferWttBomFields(p.name, p.bounds);
    return (
      wtt.description === row.description &&
      wtt.size === row.size &&
      wtt.moc === row.moc &&
      wtt.std === row.std &&
      wtt.pn === row.pn
    );
  });
}

export function partBalloonLabels(parts: PartDrawingInfo[], bomRows: BomRow[]): BalloonLabel[] {
  return parts.map(p => {
    const wtt = inferWttBomFields(p.name, p.bounds);
    const row = bomRows.find(
      r =>
        r.description === wtt.description &&
        r.size === wtt.size &&
        r.moc === wtt.moc &&
        r.std === wtt.std &&
        r.pn === wtt.pn,
    );
    if (!row) return { item: 1, qty: 1 };
    if (row.description === "PIPE") return { item: row.sr };
    return { item: row.sr, qty: row.qty || 1 };
  });
}

function projectPoint(x: number, y: number, z: number, view: OrthoView): [number, number] {
  switch (view) {
    case "front":
      return [x, y];
    case "top":
      return [x, z];
    case "right":
      return [z, y];
    case "iso": {
      const isoX = (x - z) * 0.8660254;
      const isoY = -y + (x + z) * 0.5;
      return [isoX, isoY];
    }
  }
}

export function formatMm(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)} m`;
  if (v >= 10) return `${v.toFixed(1)}`;
  return v.toFixed(2);
}

/** Dimension text on drawing (mm, no unit suffix for whole numbers). */
export function formatDimLabel(v: number): string {
  const mm = Math.abs(v);
  if (mm >= 100) return String(Math.round(mm));
  if (mm >= 10) return mm.toFixed(1);
  return mm.toFixed(2);
}

export function boundsSummary(b: PartBounds): string {
  return `${formatMm(b.length)} × ${formatMm(b.width)} × ${formatMm(b.height)} mm`;
}

export function parseDrawingTitle(fileName: string): { number: string; title: string } {
  const base = fileName.replace(/\.(step|stp)$/i, "").trim();
  const m = base.match(/^([\w-]+)\s+(.+)$/);
  if (m) return { number: m[1], title: m[2] };
  return { number: base, title: "Assembly drawing" };
}

type ScreenPt = { x: number; y: number };
type ToScreen = (u: number, v: number) => ScreenPt;

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  tip: ScreenPt,
  from: ScreenPt,
  size: number,
) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(ang - 0.35), tip.y - size * Math.sin(ang - 0.35));
  ctx.lineTo(tip.x - size * Math.cos(ang + 0.35), tip.y - size * Math.sin(ang + 0.35));
  ctx.closePath();
  ctx.fill();
}

function drawHorizDimension(
  ctx: CanvasRenderingContext2D,
  toScreen: ToScreen,
  u1: number,
  u2: number,
  vBase: number,
  offsetPx: number,
  label: string,
) {
  const p1 = toScreen(u1, vBase);
  const p2 = toScreen(u2, vBase);
  const y = Math.max(p1.y, p2.y) + offsetPx;
  ctx.strokeStyle = DIM_COLOR;
  ctx.fillStyle = DIM_COLOR;
  ctx.lineWidth = 0.6;
  const ext = 4;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p1.x, y + ext);
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x, y + ext);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p1.x, y);
  ctx.lineTo(p2.x, y);
  ctx.stroke();
  const sz = 3.5;
  drawArrowHead(ctx, { x: p1.x, y }, { x: p2.x, y }, sz);
  drawArrowHead(ctx, { x: p2.x, y }, { x: p1.x, y }, sz);
  ctx.font = "bold 10px Arial, sans-serif";
  ctx.fillText(label, (p1.x + p2.x) / 2 - ctx.measureText(label).width / 2, y - 4);
}

function drawVertDimension(
  ctx: CanvasRenderingContext2D,
  toScreen: ToScreen,
  uBase: number,
  v1: number,
  v2: number,
  offsetPx: number,
  label: string,
) {
  const p1 = toScreen(uBase, v1);
  const p2 = toScreen(uBase, v2);
  const x = Math.min(p1.x, p2.x) - offsetPx;
  ctx.strokeStyle = DIM_COLOR;
  ctx.fillStyle = DIM_COLOR;
  ctx.lineWidth = 0.6;
  const ext = 4;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(x - ext, p1.y);
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(x - ext, p2.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, p1.y);
  ctx.lineTo(x, p2.y);
  ctx.stroke();
  const sz = 3.5;
  drawArrowHead(ctx, { x, y: p1.y }, { x, y: p2.y }, sz);
  drawArrowHead(ctx, { x, y: p2.y }, { x, y: p1.y }, sz);
  ctx.save();
  ctx.translate(x - 6, (p1.y + p2.y) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 10px Arial, sans-serif";
  ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
  ctx.restore();
}

function drawCenterlineDims(
  ctx: CanvasRenderingContext2D,
  toScreen: ToScreen,
  minU: number,
  maxU: number,
  minV: number,
  maxV: number,
) {
  const midU = (minU + maxU) / 2;
  const midV = (minV + maxV) / 2;
  const halfU = (maxU - minU) / 2;
  const halfV = (maxV - minV) / 2;
  if (halfU > 1) {
    drawHorizDimension(ctx, toScreen, midU, maxU, maxV, 22, formatDimLabel(halfU));
    drawHorizDimension(ctx, toScreen, minU, midU, maxV, 36, formatDimLabel(halfU));
  }
  if (halfV > 1) {
    drawVertDimension(ctx, toScreen, minU, midV, maxV, 22, formatDimLabel(halfV));
    drawVertDimension(ctx, toScreen, minU, minV, midV, 36, formatDimLabel(halfV));
  }
}

function drawAssemblyDimensions(
  ctx: CanvasRenderingContext2D,
  toScreen: ToScreen,
  minU: number,
  maxU: number,
  minV: number,
  maxV: number,
) {
  const du = maxU - minU;
  const dv = maxV - minV;
  drawHorizDimension(ctx, toScreen, minU, maxU, minV, 14, formatDimLabel(du));
  drawVertDimension(ctx, toScreen, minU, minV, maxV, 14, formatDimLabel(dv));
  drawCenterlineDims(ctx, toScreen, minU, maxU, minV, maxV);
}

interface ProjectOpts {
  lineColor?: string;
  bgColor?: string;
  showDims?: boolean;
  viewLabel?: string;
  fillAlpha?: number;
}

function renderMeshesToCanvas(
  meshes: { mesh: MeshData; color?: string; bounds?: PartBounds; index?: number }[],
  view: OrthoView,
  canvasW: number,
  canvasH: number,
  opts?: ProjectOpts,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  const bg = opts?.bgColor ?? "#ffffff";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  const allPts: [number, number][][] = [];

  for (const { mesh } of meshes) {
    const pts2d: [number, number][] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const [u, v] = projectPoint(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2], view);
      pts2d.push([u, v]);
      if (u < minU) minU = u;
      if (v < minV) minV = v;
      if (u > maxU) maxU = u;
      if (v > maxV) maxV = v;
    }
    allPts.push(pts2d);
  }

  if (!isFinite(minU)) return canvas;

  const dimPad = opts?.showDims ? 52 : 20;
  const du = maxU - minU || 1;
  const dv = maxV - minV || 1;
  const scale = Math.min((canvasW - dimPad * 2) / du, (canvasH - dimPad * 2) / dv);
  const ox = dimPad + (canvasW - dimPad * 2 - du * scale) / 2;
  const oy = dimPad + (canvasH - dimPad * 2 - dv * scale) / 2;

  const toScreen: ToScreen = (u, v) => ({
    x: ox + (u - minU) * scale,
    y: canvasH - (oy + (v - minV) * scale),
  });

  const fillAlpha = opts?.fillAlpha ?? 0.22;

  meshes.forEach(({ mesh, color, bounds, index }, mi) => {
    const pts2d = allPts[mi];
    const fillCol = color || (bounds && index != null ? partLineColor(mesh, bounds, index) : "#1e293b");
    const line = fillCol;
    const idx = mesh.indices;

    if (fillAlpha > 0 && idx.length >= 3) {
      ctx.fillStyle = fillCol;
      ctx.globalAlpha = fillAlpha;
      for (let i = 0; i < idx.length; i += 3) {
        const a = pts2d[idx[i]];
        const b = pts2d[idx[i + 1]];
        const c = pts2d[idx[i + 2]];
        const p1 = toScreen(a[0], a[1]);
        const p2 = toScreen(b[0], b[1]);
        const p3 = toScreen(c[0], c[1]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = line;
    ctx.lineWidth = 0.75;
    const drawn = new Set<string>();

    const drawEdge = (i1: number, i2: number) => {
      const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
      if (drawn.has(key)) return;
      drawn.add(key);
      const a = pts2d[i1];
      const b = pts2d[i2];
      const p1 = toScreen(a[0], a[1]);
      const p2 = toScreen(b[0], b[1]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    for (let i = 0; i < idx.length; i += 3) {
      drawEdge(idx[i], idx[i + 1]);
      drawEdge(idx[i + 1], idx[i + 2]);
      drawEdge(idx[i + 2], idx[i]);
    }
  });

  if (opts?.showDims) {
    drawAssemblyDimensions(ctx, toScreen, minU, maxU, minV, maxV);
  }

  if (opts?.viewLabel) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillText(opts.viewLabel, 10, 16);
  }

  return canvas;
}

/** Assembly plan view (top) with overall + centerline dimensions — WTT-style. */
export function renderAssemblyPlanView(
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  canvasW: number,
  canvasH: number,
): HTMLCanvasElement {
  const items = meshes.map((mesh, i) => {
    const part = parts.find(p => p.meshIndex === i);
    const bounds = part?.bounds ?? computeBounds(mesh);
    return { mesh, bounds, index: i, color: partLineColor(mesh, bounds, i) };
  });
  return renderMeshesToCanvas(items, "top", canvasW, canvasH, {
    viewLabel: "PLAN VIEW (TOP)",
    showDims: true,
    fillAlpha: 0.28,
    bgColor: "#ffffff",
  });
}

/** Assembly elevation (front) with dimensions. */
export function renderAssemblyElevationView(
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  canvasW: number,
  canvasH: number,
): HTMLCanvasElement {
  const items = meshes.map((mesh, i) => {
    const part = parts.find(p => p.meshIndex === i);
    const bounds = part?.bounds ?? computeBounds(mesh);
    return { mesh, bounds, index: i, color: partLineColor(mesh, bounds, i) };
  });
  return renderMeshesToCanvas(items, "front", canvasW, canvasH, {
    viewLabel: "ELEVATION VIEW (FRONT)",
    showDims: true,
    fillAlpha: 0.28,
    bgColor: "#ffffff",
  });
}

export function renderPartOrthoView(
  mesh: MeshData,
  view: OrthoView,
  canvasW: number,
  canvasH: number,
  opts?: { lineColor?: string; bgColor?: string },
): HTMLCanvasElement {
  const labels: Record<OrthoView, string> = {
    front: "FRONT VIEW", top: "TOP VIEW", right: "RIGHT VIEW", iso: "ISOMETRIC VIEW",
  };
  return renderMeshesToCanvas(
    [{ mesh, color: opts?.lineColor }],
    view,
    canvasW,
    canvasH,
    { ...opts, showDims: true, viewLabel: labels[view], fillAlpha: 0.25 },
  );
}

const ISO_COLORS = ["#1e40af", "#047857", "#b45309", "#7c3aed", "#be123c", "#0e7490", "#4d7c0f", "#c2410c"];

export function renderAssemblyIsoView(
  meshes: MeshData[],
  canvasW: number,
  canvasH: number,
): HTMLCanvasElement {
  const items = meshes.map((mesh, i) => ({
    mesh,
    color: ISO_COLORS[i % ISO_COLORS.length],
  }));
  return renderMeshesToCanvas(items, "iso", canvasW, canvasH, {
    viewLabel: "ISOMETRIC — GENERAL ARRANGEMENT",
    bgColor: "#fafafa",
    fillAlpha: 0.2,
  });
}

export function assemblyBounds(parts: PartDrawingInfo[]): number {
  let max = 0;
  for (const p of parts) {
    max = Math.max(max, p.bounds.length, p.bounds.width, p.bounds.height);
  }
  return max;
}
