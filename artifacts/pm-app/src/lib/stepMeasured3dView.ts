import * as THREE from "three";
import type { MeshData } from "./stepLoader";
import type { PartDrawingInfo } from "./stepPartDrawing";
import { formatDimLabel } from "./stepPartDrawing";
import {
  buildMeshGroupForGa,
  disposeSceneObjects,
  projectPointToScreen,
} from "./stepMeshRenderer";

export type Measured3dView = "front" | "top" | "right";

const DIM_STROKE = "#000000";
const DIM_TEXT = "#000000";

type Pt = { x: number; y: number };

interface DimStyle {
  fontPx: number;
  lineW: number;
  arrow: number;
  ext: number;
  pad: number;
  segStep: number;
  labelPad: number;
}

function dimStyleForCanvas(w: number, h: number): DimStyle {
  const ref = Math.min(w, h);
  const s = Math.max(1.5, ref / 950);
  return {
    fontPx: Math.round(24 * s),
    lineW: Math.max(2, 2.4 * s),
    arrow: Math.max(9, 11 * s),
    ext: Math.max(12, 14 * s),
    pad: Math.max(56, 64 * s),
    segStep: Math.max(34, 40 * s),
    labelPad: Math.max(10, 12 * s),
  };
}

let activeStyle: DimStyle = dimStyleForCanvas(1200, 900);

function drawDimText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rotated = false) {
  const st = activeStyle;
  ctx.font = `bold ${st.fontPx}px Arial, Helvetica, sans-serif`;
  const tw = ctx.measureText(text).width;
  const th = st.fontPx + 4;
  ctx.save();
  if (rotated) ctx.translate(x, y);
  else ctx.translate(x - tw / 2, y);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(rotated ? -th / 2 - 2 : -3, rotated ? -tw / 2 - 3 : -th + 2, rotated ? th + 4 : tw + 6, rotated ? tw + 6 : th + 2);
  ctx.fillStyle = DIM_TEXT;
  if (rotated) {
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, -tw / 2, st.fontPx * 0.35);
  } else {
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, tip: Pt, from: Pt, size: number) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(ang - 0.38), tip.y - size * Math.sin(ang - 0.38));
  ctx.lineTo(tip.x - size * Math.cos(ang + 0.38), tip.y - size * Math.sin(ang + 0.38));
  ctx.closePath();
  ctx.fill();
}

function drawScreenHorizDim(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
  label: string,
  place: "below" | "above" = "below",
) {
  const st = activeStyle;
  const yBase = place === "below" ? Math.max(y1, y2) + offset : Math.min(y1, y2) - offset;
  ctx.strokeStyle = DIM_STROKE;
  ctx.fillStyle = DIM_STROKE;
  ctx.lineWidth = st.lineW;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, yBase + (place === "below" ? st.ext : -st.ext));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2, yBase + (place === "below" ? st.ext : -st.ext));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, yBase);
  ctx.lineTo(x2, yBase);
  ctx.stroke();
  drawArrow(ctx, { x: x1, y: yBase }, { x: x2, y: yBase }, st.arrow);
  drawArrow(ctx, { x: x2, y: yBase }, { x: x1, y: yBase }, st.arrow);
  drawDimText(ctx, label, (x1 + x2) / 2, yBase + (place === "below" ? -st.labelPad : st.labelPad + st.fontPx * 0.3));
}

function drawScreenVertDim(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
  label: string,
  side: "left" | "right" = "left",
) {
  const st = activeStyle;
  const xBase = side === "left" ? Math.min(x1, x2) - offset : Math.max(x1, x2) + offset;
  ctx.strokeStyle = DIM_STROKE;
  ctx.fillStyle = DIM_STROKE;
  ctx.lineWidth = st.lineW;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(xBase + (side === "left" ? -st.ext : st.ext), y1);
  ctx.moveTo(x2, y2);
  ctx.lineTo(xBase + (side === "left" ? -st.ext : st.ext), y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xBase, y1);
  ctx.lineTo(xBase, y2);
  ctx.stroke();
  drawArrow(ctx, { x: xBase, y: y1 }, { x: xBase, y: y2 }, st.arrow);
  drawArrow(ctx, { x: xBase, y: y2 }, { x: xBase, y: y1 }, st.arrow);
  drawDimText(ctx, label, xBase + (side === "left" ? -st.labelPad : st.labelPad), (y1 + y2) / 2, true);
}

function collectWorldVertices(model: THREE.Object3D): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  model.updateMatrixWorld(true);
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const pos = child.geometry.getAttribute("position");
    if (!pos) return;
    const m = child.matrixWorld;
    for (let i = 0; i < pos.count; i++) {
      pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m));
    }
  });
  return pts;
}

function segmentBoundaries(values: number[], maxSegs: number, minRelGap: number): number[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 0.5) return [min, max];

  const sorted = values.slice().sort((a, b) => a - b);
  const gaps: { idx: number; gap: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    gaps.push({ idx: i, gap: sorted[i + 1] - sorted[i] });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  const cuts = new Set<number>([0, sorted.length - 1]);
  const span = max - min;
  for (const g of gaps) {
    if (cuts.size >= maxSegs) break;
    if (g.gap < span * minRelGap) break;
    cuts.add(g.idx);
    cuts.add(g.idx + 1);
  }
  const raw = [...cuts].map(i => sorted[i]).sort((a, b) => a - b);
  const merged: number[] = [];
  for (const v of raw) {
    if (!merged.length || v - merged[merged.length - 1] > span * 0.025) merged.push(v);
  }
  if (merged[0] > min + span * 0.01) merged.unshift(min);
  if (merged[merged.length - 1] < max - span * 0.01) merged.push(max);
  return merged;
}

function bboxScreenExtents(
  box: THREE.Box3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of corners) {
    const s = projectPointToScreen(c, camera, w, h);
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }
  return { minX, maxX, minY, maxY };
}

function projectWorldY(
  y: number,
  box: THREE.Box3,
  camera: THREE.Camera,
  w: number,
  h: number,
  anchorX: number,
): Pt {
  const p = projectPointToScreen(new THREE.Vector3(anchorX, y, box.min.z), camera, w, h);
  return { x: p.x, y: p.y };
}

function projectWorldSideY(
  y: number,
  box: THREE.Box3,
  camera: THREE.Camera,
  w: number,
  h: number,
  anchorZ: number,
): Pt {
  const p = projectPointToScreen(new THREE.Vector3(box.min.x, y, anchorZ), camera, w, h);
  return { x: p.x, y: p.y };
}

function projectWorldTopX(
  x: number,
  box: THREE.Box3,
  camera: THREE.Camera,
  w: number,
  h: number,
  anchorZ: number,
): Pt {
  const cy = (box.min.y + box.max.y) / 2;
  const p = projectPointToScreen(new THREE.Vector3(x, cy, anchorZ), camera, w, h);
  return { x: p.x, y: p.y };
}

function projectWorldTopZ(
  z: number,
  box: THREE.Box3,
  camera: THREE.Camera,
  w: number,
  h: number,
  anchorX: number,
): Pt {
  const cy = (box.min.y + box.max.y) / 2;
  const p = projectPointToScreen(new THREE.Vector3(anchorX, cy, z), camera, w, h);
  return { x: p.x, y: p.y };
}

function drawMeasuredDimensions(
  ctx: CanvasRenderingContext2D,
  model: THREE.Object3D,
  box: THREE.Box3,
  camera: THREE.Camera,
  view: Measured3dView,
  w: number,
  h: number,
) {
  const st = activeStyle;
  const ext = bboxScreenExtents(box, camera, w, h);
  const verts = collectWorldVertices(model);

  if (view === "front") {
    const { minY, maxY, minX, maxX } = box;
    const midX = (minX + maxX) / 2;

    drawScreenHorizDim(ctx, ext.minX, ext.maxY, ext.maxX, ext.maxY, st.pad, formatDimLabel(maxX - minX));
    drawScreenVertDim(ctx, ext.minX, ext.maxY, ext.minX, ext.minY, st.pad, formatDimLabel(maxY - minY));

    const halfW = (maxX - minX) / 2;
    if (halfW > 1) {
      const pMid = projectPointToScreen(new THREE.Vector3(midX, maxY, box.min.z), camera, w, h);
      const pR = projectPointToScreen(new THREE.Vector3(maxX, maxY, box.min.z), camera, w, h);
      drawScreenHorizDim(ctx, pMid.x, pMid.y, pR.x, pR.y, st.pad + st.segStep, formatDimLabel(halfW), "below");
    }

    const yBreaks = segmentBoundaries(verts.map(v => v.y), 4, 0.05);
    for (let i = 0; i < yBreaks.length - 1; i++) {
      const seg = yBreaks[i + 1] - yBreaks[i];
      if (seg < (maxY - minY) * 0.025) continue;
      const p1 = projectWorldY(yBreaks[i], box, camera, w, h, minX);
      const p2 = projectWorldY(yBreaks[i + 1], box, camera, w, h, minX);
      drawScreenVertDim(ctx, p1.x, p1.y, p2.x, p2.y, st.pad + st.segStep + i * st.segStep, formatDimLabel(seg));
    }
  } else if (view === "top") {
    const { minX, maxX, minZ, maxZ } = box;
    const midZ = (minZ + maxZ) / 2;
    const anchorX = box.min.x;

    drawScreenHorizDim(ctx, ext.minX, ext.maxY, ext.maxX, ext.maxY, st.pad, formatDimLabel(maxX - minX));
    drawScreenVertDim(ctx, ext.minX, ext.maxY, ext.minX, ext.minY, st.pad, formatDimLabel(maxZ - minZ));

    const halfX = (maxX - minX) / 2;
    if (halfX > 1) {
      const pMid = projectWorldTopX((minX + maxX) / 2, box, camera, w, h, minZ);
      const pR = projectWorldTopX(maxX, box, camera, w, h, minZ);
      drawScreenHorizDim(ctx, pMid.x, pMid.y, pR.x, pR.y, st.pad + st.segStep, formatDimLabel(halfX), "below");
    }

    const zBreaks = segmentBoundaries(verts.map(v => v.z), 4, 0.05);
    for (let i = 0; i < zBreaks.length - 1; i++) {
      const seg = zBreaks[i + 1] - zBreaks[i];
      if (seg < (maxZ - minZ) * 0.025) continue;
      const p1 = projectWorldTopZ(zBreaks[i], box, camera, w, h, anchorX);
      const p2 = projectWorldTopZ(zBreaks[i + 1], box, camera, w, h, anchorX);
      drawScreenVertDim(ctx, p1.x, p1.y, p2.x, p2.y, st.pad + st.segStep + i * st.segStep, formatDimLabel(seg));
    }

    const xBreaks = segmentBoundaries(verts.map(v => v.x), 4, 0.05);
    for (let i = 0; i < xBreaks.length - 1; i++) {
      const seg = xBreaks[i + 1] - xBreaks[i];
      if (seg < (maxX - minX) * 0.025) continue;
      const p1 = projectWorldTopX(xBreaks[i], box, camera, w, h, midZ);
      const p2 = projectWorldTopX(xBreaks[i + 1], box, camera, w, h, midZ);
      drawScreenHorizDim(
        ctx, p1.x, p1.y, p2.x, p2.y,
        st.pad + st.segStep + i * st.segStep,
        formatDimLabel(seg),
        "above",
      );
    }
  } else {
    const { minY, maxY, minZ, maxZ } = box;
    const midZ = (minZ + maxZ) / 2;
    const anchorX = box.min.x;

    drawScreenHorizDim(ctx, ext.minX, ext.maxY, ext.maxX, ext.maxY, st.pad, formatDimLabel(maxZ - minZ));
    drawScreenVertDim(ctx, ext.minX, ext.maxY, ext.minX, ext.minY, st.pad, formatDimLabel(maxY - minY));

    const halfZ = (maxZ - minZ) / 2;
    if (halfZ > 1) {
      const pMid = projectPointToScreen(new THREE.Vector3(anchorX, box.min.y, midZ), camera, w, h);
      const pR = projectPointToScreen(new THREE.Vector3(anchorX, box.min.y, maxZ), camera, w, h);
      drawScreenHorizDim(ctx, pMid.x, pMid.y, pR.x, pR.y, st.pad + st.segStep, formatDimLabel(halfZ), "below");
    }

    const yBreaks = segmentBoundaries(verts.map(v => v.y), 4, 0.05);
    for (let i = 0; i < yBreaks.length - 1; i++) {
      const seg = yBreaks[i + 1] - yBreaks[i];
      if (seg < (maxY - minY) * 0.025) continue;
      const p1 = projectWorldSideY(yBreaks[i], box, camera, w, h, minZ);
      const p2 = projectWorldSideY(yBreaks[i + 1], box, camera, w, h, minZ);
      drawScreenVertDim(ctx, p1.x, p1.y, p2.x, p2.y, st.pad + st.segStep + i * st.segStep, formatDimLabel(seg));
    }
  }
}

function setupOrthoCamera(
  model: THREE.Object3D,
  view: Measured3dView,
  width: number,
  height: number,
): THREE.OrthographicCamera {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const aspect = width / height;
  const margin = 1.38;
  const frustumH = maxDim * margin;
  const frustumW = frustumH * aspect;
  const camera = new THREE.OrthographicCamera(
    -frustumW / 2,
    frustumW / 2,
    frustumH / 2,
    -frustumH / 2,
    maxDim * 0.001,
    maxDim * 50,
  );
  const dist = maxDim * 3;
  if (view === "front") {
    camera.position.set(center.x, center.y, center.z + dist);
    camera.up.set(0, 1, 0);
  } else if (view === "top") {
    camera.position.set(center.x, center.y + dist, center.z);
    camera.up.set(0, 0, -1);
  } else {
    camera.position.set(center.x + dist, center.y, center.z);
    camera.up.set(0, 1, 0);
  }
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  return camera;
}

export interface Measured3dRenderOptions {
  width: number;
  height: number;
  pixelRatio?: number;
  /** When false, omit the banner (PDF adds view labels). */
  showBanner?: boolean;
}

export function renderAssemblyMeasured3dView(
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  view: Measured3dView,
  options: Measured3dRenderOptions,
): string {
  const { width, height, pixelRatio = 2, showBanner = true } = options;
  const w = Math.round(width * pixelRatio);
  const h = Math.round(height * pixelRatio);
  activeStyle = dimStyleForCanvas(w, h);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const model = buildMeshGroupForGa(meshes, parts);
  scene.add(model);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  if (view === "front") key.position.set(0, 12, 18);
  else if (view === "top") key.position.set(12, 18, 8);
  else key.position.set(18, 12, 0);
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xd0dff0, 0.62));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.48));

  const camera = setupOrthoCamera(model, view, width, height);
  const box = new THREE.Box3().setFromObject(model);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.render(scene, camera);

  const composite = document.createElement("canvas");
  composite.width = w;
  composite.height = h;
  const ctx = composite.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);

  if (showBanner) {
    const label =
      view === "front"
        ? "FRONT VIEW — ALL DIMENSIONS IN mm"
        : view === "top"
          ? "PLAN VIEW — ALL DIMENSIONS IN mm"
          : "SIDE VIEW — ALL DIMENSIONS IN mm";
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(activeStyle.fontPx * 0.75)}px Arial, sans-serif`;
    ctx.fillText(label, activeStyle.pad * 0.4, activeStyle.fontPx * 0.9);
  }

  drawMeasuredDimensions(ctx, model, box, camera, view, w, h);

  const dataUrl = composite.toDataURL("image/png", 1.0);
  renderer.dispose();
  disposeSceneObjects(scene);
  return dataUrl;
}

export const HD_MEASURED_VIEW = { width: 2200, height: 1650, pixelRatio: 2 };
