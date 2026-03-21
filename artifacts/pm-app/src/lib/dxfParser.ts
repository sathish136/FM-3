import { Part } from "./nestingAlgorithm";

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getBBoxFromPoints(points: { x: number; y: number }[]): BoundingBox | null {
  if (points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function entityToBBox(entity: any): BoundingBox | null {
  switch (entity.type) {
    case "LINE":
      return getBBoxFromPoints([
        { x: entity.startPoint?.x ?? 0, y: entity.startPoint?.y ?? 0 },
        { x: entity.endPoint?.x ?? 0, y: entity.endPoint?.y ?? 0 },
      ]);
    case "LWPOLYLINE":
    case "POLYLINE": {
      const pts = (entity.vertices ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 }));
      return getBBoxFromPoints(pts);
    }
    case "CIRCLE": {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }
    case "ARC": {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }
    case "ELLIPSE": {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const a = Math.sqrt(
        Math.pow(entity.majorAxisEndPoint?.x ?? 0, 2) +
        Math.pow(entity.majorAxisEndPoint?.y ?? 0, 2)
      );
      const b = a * (entity.axisRatio ?? 1);
      return { minX: cx - a, minY: cy - b, maxX: cx + a, maxY: cy + b };
    }
    case "SPLINE": {
      const pts = (entity.controlPoints ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 }));
      return getBBoxFromPoints(pts);
    }
    case "INSERT": {
      const x = entity.position?.x ?? 0;
      const y = entity.position?.y ?? 0;
      return { minX: x, minY: y, maxX: x, maxY: y };
    }
    default:
      return null;
  }
}

function mergeBBoxes(bboxes: BoundingBox[]): BoundingBox | null {
  if (bboxes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bboxes) {
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

export async function parseDxfFile(file: File): Promise<Part[]> {
  const text = await file.text();
  const DxfParser = (await import("dxf-parser")).default;
  const parser = new DxfParser();

  let dxf: any;
  try {
    dxf = parser.parseSync(text);
  } catch (e) {
    throw new Error("Failed to parse DXF file. Please ensure it is a valid DXF format.");
  }

  const entities: any[] = dxf?.entities ?? [];
  if (entities.length === 0) {
    throw new Error("No drawing entities found in this DXF file.");
  }

  const layerGroups = new Map<string, any[]>();
  for (const entity of entities) {
    const layer = entity.layer ?? "0";
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(entity);
  }

  const parts: Part[] = [];

  if (layerGroups.size > 1) {
    let idx = 0;
    for (const [layer, ents] of layerGroups.entries()) {
      const bboxes = ents.map(entityToBBox).filter((b): b is BoundingBox => b !== null);
      const merged = mergeBBoxes(bboxes);
      if (!merged) continue;
      const w = Math.round((merged.maxX - merged.minX) * 10) / 10;
      const h = Math.round((merged.maxY - merged.minY) * 10) / 10;
      if (w <= 0 || h <= 0) continue;
      parts.push({
        id: `dxf-layer-${idx++}`,
        name: `Part (Layer: ${layer})`,
        width: w,
        height: h,
        quantity: 1,
        sourceFile: file.name,
      });
    }
  }

  if (parts.length === 0) {
    const bboxes = entities.map(entityToBBox).filter((b): b is BoundingBox => b !== null);
    const merged = mergeBBoxes(bboxes);
    if (merged) {
      const w = Math.round((merged.maxX - merged.minX) * 10) / 10;
      const h = Math.round((merged.maxY - merged.minY) * 10) / 10;
      if (w > 0 && h > 0) {
        parts.push({
          id: `dxf-whole-0`,
          name: `Part from ${file.name}`,
          width: w,
          height: h,
          quantity: 1,
          sourceFile: file.name,
        });
      }
    }
  }

  if (parts.length === 0) {
    throw new Error("Could not extract valid part dimensions from the DXF file.");
  }

  return parts;
}

export async function parseSvgFile(file: File): Promise<Part[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("Invalid SVG file.");

  const parts: Part[] = [];
  const children = Array.from(svg.querySelectorAll("rect, circle, ellipse, path, polygon, polyline, line, g"));

  let idx = 0;
  for (const el of children) {
    const tag = el.tagName.toLowerCase();
    let w = 0, h = 0;

    if (tag === "rect") {
      w = parseFloat(el.getAttribute("width") ?? "0");
      h = parseFloat(el.getAttribute("height") ?? "0");
    } else if (tag === "circle") {
      const r = parseFloat(el.getAttribute("r") ?? "0");
      w = h = r * 2;
    } else if (tag === "ellipse") {
      w = parseFloat(el.getAttribute("rx") ?? "0") * 2;
      h = parseFloat(el.getAttribute("ry") ?? "0") * 2;
    } else if (["path", "polygon", "polyline", "line", "g"].includes(tag)) {
      try {
        const svgEl = el as SVGGraphicsElement;
        const bbox = svgEl.getBBox?.();
        if (bbox) { w = bbox.width; h = bbox.height; }
      } catch { }
    }

    const wR = Math.round(w * 10) / 10;
    const hR = Math.round(h * 10) / 10;
    if (wR > 0 && hR > 0) {
      const id = el.getAttribute("id") ?? el.getAttribute("inkscape:label") ?? `shape-${idx}`;
      parts.push({ id: `svg-${idx++}`, name: id, width: wR, height: hR, quantity: 1, sourceFile: file.name });
    }
  }

  if (parts.length === 0) {
    const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) ?? [];
    const w = vb[2] ?? parseFloat(svg.getAttribute("width") ?? "0");
    const h = vb[3] ?? parseFloat(svg.getAttribute("height") ?? "0");
    if (w > 0 && h > 0) {
      parts.push({ id: "svg-whole-0", name: `Part from ${file.name}`, width: w, height: h, quantity: 1, sourceFile: file.name });
    }
  }

  if (parts.length === 0) throw new Error("Could not extract shapes from the SVG file.");
  return parts;
}
