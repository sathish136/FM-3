import * as THREE from "three";
import type { MeshData } from "./stepLoader";
import type { BalloonLabel, PartBounds, PartDrawingInfo } from "./stepPartDrawing";
import { buildDefaultConnectionNotes, drawConnectionNotesOnCanvas } from "./gaSheetAnnotations";

export type ShadedCameraView = "iso" | "front" | "top" | "right";

/** WTT GA isometric palette — pipes blue, fittings silver, valves dark. */
const GA_PIPE = 0x2563eb;
const GA_FITTING = 0xb8c4ce;
const GA_VALVE = 0x1f2937;
const GA_CLAMP = 0x6b7280;

export const PART_PALETTE = [
  0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x06b6d4, 0x84cc16, 0xf97316,
];

function isPipeLike(bounds: PartBounds): boolean {
  const a = [bounds.length, bounds.width, bounds.height].sort((x, y) => y - x);
  return a[0] > 3 * a[1];
}

export function getGaPartColor3d(mesh: MeshData, bounds: PartBounds, index: number): THREE.Color {
  const n = (mesh.name || "").toLowerCase();
  if (n.includes("pipe") || n.includes("tube") || isPipeLike(bounds)) return new THREE.Color(GA_PIPE);
  if (n.includes("valve") || n.includes("nrv") || n.includes("check") || n.includes("pressure")) {
    return new THREE.Color(GA_VALVE);
  }
  if (n.includes("clamp") || n.includes("clip") || n.includes("u-clip")) return new THREE.Color(GA_CLAMP);
  if (n.includes("elbow") || n.includes("tee") || n.includes("mta") || n.includes("flange") || n.includes("reduc")) {
    return new THREE.Color(GA_FITTING);
  }
  return new THREE.Color(PART_PALETTE[index % PART_PALETTE.length]);
}

export function partColorForIndex(index: number): THREE.Color {
  return new THREE.Color(PART_PALETTE[index % PART_PALETTE.length]);
}

export function partColorCss(index: number): string {
  return `#${partColorForIndex(index).getHexString()}`;
}

function makePhongMat(col: THREE.Color): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: col,
    specular: new THREE.Color(0x555555),
    shininess: 85,
    side: THREE.DoubleSide,
  });
}

function meshCentroid(md: MeshData): THREE.Vector3 {
  const p = md.positions;
  if (!p.length) return new THREE.Vector3();
  let x = 0, y = 0, z = 0;
  const n = p.length / 3;
  for (let i = 0; i < p.length; i += 3) {
    x += p[i];
    y += p[i + 1];
    z += p[i + 2];
  }
  return new THREE.Vector3(x / n, y / n, z / n);
}

function addMeshToGroup(
  root: THREE.Group,
  md: MeshData,
  paletteIndex: number,
  gaStyle: boolean,
  bounds?: PartBounds,
) {
  if (!md.positions.length) return;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(md.positions, 3));
  if (md.normals.length) {
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(md.normals, 3));
  } else {
    geo.computeVertexNormals();
  }
  if (md.indices.length) geo.setIndex(md.indices);

  const fallback =
    gaStyle && bounds
      ? getGaPartColor3d(md, bounds, paletteIndex)
      : md.color != null
        ? new THREE.Color(md.color[0], md.color[1], md.color[2])
        : partColorForIndex(paletteIndex);

  const partGrp = new THREE.Group();
  partGrp.name = md.name;
  partGrp.userData.meshIndex = paletteIndex;

  const hasFaceColors = !gaStyle && Array.isArray(md.brepFaces) && md.brepFaces.length > 0;
  let mesh: THREE.Mesh;

  if (hasFaceColors) {
    const materials: THREE.Material[] = [makePhongMat(fallback)];
    for (const face of md.brepFaces!) {
      const fc =
        face.color != null
          ? new THREE.Color(face.color[0], face.color[1], face.color[2])
          : fallback.clone();
      materials.push(makePhongMat(fc));
    }
    const triangleCount = md.indices.length / 3;
    let triangleIndex = 0;
    let faceIdx = 0;
    while (triangleIndex < triangleCount) {
      const firstIndex = triangleIndex;
      let lastIndex: number;
      let matIndex: number;
      if (faceIdx >= md.brepFaces!.length) {
        lastIndex = triangleCount;
        matIndex = 0;
      } else if (triangleIndex < md.brepFaces![faceIdx].first) {
        lastIndex = md.brepFaces![faceIdx].first;
        matIndex = 0;
      } else {
        lastIndex = md.brepFaces![faceIdx].last + 1;
        matIndex = faceIdx + 1;
        faceIdx++;
      }
      geo.addGroup(firstIndex * 3, (lastIndex - firstIndex) * 3, matIndex);
      triangleIndex = lastIndex;
    }
    mesh = new THREE.Mesh(geo, materials);
  } else {
    mesh = new THREE.Mesh(geo, makePhongMat(fallback));
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  partGrp.add(mesh);

  if (gaStyle) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 18),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.22 }),
    );
    partGrp.add(edges);
  }

  root.add(partGrp);
}

function buildMeshGroup(
  meshes: MeshData[],
  indices?: number[],
  gaStyle = false,
  parts?: PartDrawingInfo[],
): THREE.Group {
  const root = new THREE.Group();
  const list = indices ?? meshes.map((_, i) => i);
  list.forEach(i => {
    const md = meshes[i];
    if (!md) return;
    const part = parts?.find(p => p.meshIndex === i);
    const bounds = part?.bounds;
    addMeshToGroup(root, md, i, gaStyle, bounds);
  });

  const bbox = new THREE.Box3().setFromObject(root);
  if (!bbox.isEmpty()) {
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    root.position.sub(center);
  }
  return root;
}

export function buildMeshGroupForGa(meshes: MeshData[], parts: PartDrawingInfo[]): THREE.Group {
  return buildMeshGroup(meshes, undefined, true, parts);
}

export function disposeSceneObjects(scene: THREE.Scene): void {
  disposeScene(scene);
}

export function projectPointToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; visible: boolean } {
  return projectToScreen(point, camera, w, h);
}

function setCameraForView(camera: THREE.PerspectiveCamera, view: ShadedCameraView, radius: number) {
  const d = radius * 2.15;
  const pos: Record<ShadedCameraView, [number, number, number]> = {
    front: [0, 0, d],
    top: [0, d, 0.001],
    right: [d, 0, 0],
    iso: [d * 0.92, d * 0.58, d * 0.88],
  };
  const p = pos[view];
  camera.position.set(p[0], p[1], p[2]);
  camera.lookAt(0, 0, 0);
}

function fitCameraToObject(camera: THREE.PerspectiveCamera, object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return 10;
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) * 0.52;
  camera.near = radius * 0.008;
  camera.far = radius * 80;
  camera.updateProjectionMatrix();
  return radius;
}

function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; visible: boolean } {
  const v = point.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * w,
    y: (-v.y * 0.5 + 0.5) * h,
    visible: v.z > -1 && v.z < 1,
  };
}

function drawBalloons(
  ctx: CanvasRenderingContext2D,
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  labels: BalloonLabel[],
  camera: THREE.PerspectiveCamera,
  w: number,
  h: number,
) {
  const maxLabels = Math.min(parts.length, 24);
  const scale = Math.max(1, w / 1400);
  const r = Math.round(18 * scale);
  const fontTop = `bold ${Math.round(13 * scale)}px Arial, sans-serif`;
  const fontBot = `bold ${Math.round(11 * scale)}px Arial, sans-serif`;

  parts.slice(0, maxLabels).forEach((part, i) => {
    const md = meshes[part.meshIndex];
    if (!md) return;
    const label = labels[i] ?? { item: i + 1, qty: 1 };
    const centroid = meshCentroid(md);
    const sp = projectToScreen(centroid, camera, w, h);
    if (!sp.visible) return;

    const angle = (i / maxLabels) * Math.PI * 2 - Math.PI / 4;
    const dist = (40 + (i % 4) * 10) * scale;
    const bx = sp.x + Math.cos(angle) * dist;
    const by = sp.y + Math.sin(angle) * dist;

    ctx.strokeStyle = "#111";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    const dx = sp.x - bx;
    const dy = sp.y - by;
    const len = Math.hypot(dx, dy) || 1;
    ctx.lineTo(bx + (dx / len) * (len - r - 2), by + (dy / len) * (len - r - 2));
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx - r, by);
    ctx.lineTo(bx + r, by);
    ctx.stroke();

    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.font = fontTop;
    if (label.qty == null) {
      ctx.fillText(String(label.item), bx, by + 4 * scale);
    } else {
      ctx.fillText(String(label.item), bx, by - 4 * scale);
      ctx.font = fontBot;
      ctx.fillText(String(label.qty), bx, by + 12 * scale);
    }
  });
  ctx.textAlign = "left";
}

export interface ShadedRenderOptions {
  width: number;
  height: number;
  pixelRatio?: number;
  view?: ShadedCameraView;
  meshIndices?: number[];
  background?: number | string;
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach(x => x.dispose());
      else m.dispose();
    }
  });
}

function createGaScene(meshes: MeshData[], parts: PartDrawingInfo[], meshIndices?: number[]) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const model = buildMeshGroup(meshes, meshIndices, true, parts);
  scene.add(model);

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(14, 22, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5d4f0, 0.65);
  fill.position.set(-16, 10, -12);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.4);
  rim.position.set(4, -14, 10);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 0.5));

  return { scene, model };
}

/** WTT-style GA isometric: colored 3D, edge lines, BOM balloons, connection notes. */
export function renderAssemblyGaIso(
  meshes: MeshData[],
  parts: PartDrawingInfo[],
  options: {
    width: number;
    height: number;
    pixelRatio?: number;
    showBalloons?: boolean;
    balloonLabels?: BalloonLabel[];
    drawingNumber?: string;
    drawingTitle?: string;
  },
): string {
  const { width, height, pixelRatio = 2, showBalloons = true, balloonLabels } = options;
  const w = Math.round(width * pixelRatio);
  const h = Math.round(height * pixelRatio);

  const { scene, model } = createGaScene(meshes, parts);
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 100000);
  const radius = fitCameraToObject(camera, model);
  setCameraForView(camera, "iso", radius);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.render(scene, camera);

  const composite = document.createElement("canvas");
  composite.width = w;
  composite.height = h;
  const ctx = composite.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);

  if (showBalloons && parts.length > 0) {
    const labels =
      balloonLabels ??
      parts.map((_, i) => ({ item: i + 1, qty: 1 as number }));
    drawBalloons(ctx, meshes, parts, labels, camera, w, h);
  }

  if (options.drawingNumber && options.drawingTitle) {
    drawConnectionNotesOnCanvas(
      ctx,
      w,
      h,
      buildDefaultConnectionNotes(options.drawingNumber, options.drawingTitle),
    );
  }

  const dataUrl = composite.toDataURL("image/png", 1.0);
  renderer.dispose();
  disposeScene(scene);
  return dataUrl;
}

/** Offscreen WebGL render — shaded PNG (part previews / detail views). */
export function renderMeshesShaded(meshes: MeshData[], options: ShadedRenderOptions): string {
  const {
    width,
    height,
    pixelRatio = 2,
    view = "iso",
    meshIndices,
    background = 0xffffff,
  } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const model = buildMeshGroup(meshes, meshIndices, false);
  scene.add(model);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(12, 24, 14);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8c9e8, 0.55);
  fill.position.set(-14, 8, -10);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.45));

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.01, 100000);
  const radius = fitCameraToObject(camera, model);
  setCameraForView(camera, view, radius);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png", 1.0);
  renderer.dispose();
  disposeScene(scene);
  return dataUrl;
}

export const HD_ASSEMBLY = { width: 1920, height: 1440, pixelRatio: 2 };
export const HD_PART = { width: 800, height: 600, pixelRatio: 2 };
export const HD_PART_DETAIL = { width: 960, height: 720, pixelRatio: 2 };
export const HD_GA_ISO = { width: 2000, height: 1500, pixelRatio: 2 };
