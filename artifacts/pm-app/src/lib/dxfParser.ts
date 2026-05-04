import { Part } from "./nestingAlgorithm";

export interface DwgAnalysis {
  fileName: string;
  version: string;
  versionName: string;
  fileSize: number;
  drawingTitle: string;
  materialType: string;
  thickness: string;
  drawingNumber: string;
  layerNames: string[];
  blockNames: string[];
  textStrings: string[];
  detectedDimensions: DetectedDimension[];
  suggestedParts: SuggestedPart[];
}

export interface DetectedDimension {
  raw: string;
  width: number;
  height: number;
  context: string;
}

export interface SuggestedPart {
  name: string;
  width: number;
  height: number;
  quantity: number;
  source: string;
  confidence: "high" | "medium" | "low";
}

/** Legacy alias so the DWG dialog still compiles */
export interface DwgFileInfo {
  fileName: string;
  version: string;
  versionName: string;
}

const DWG_VERSIONS: Record<string, string> = {
  "AC1.0": "AutoCAD R1.0",
  "AC1.2": "AutoCAD R1.2",
  "AC1.4": "AutoCAD R1.4",
  "AC1.50": "AutoCAD R2.0",
  "AC2.10": "AutoCAD R2.10",
  "AC1002": "AutoCAD R2.5",
  "AC1003": "AutoCAD R2.6",
  "AC1004": "AutoCAD R9",
  "AC1006": "AutoCAD R10",
  "AC1009": "AutoCAD R11/R12",
  "AC1012": "AutoCAD R13",
  "AC1014": "AutoCAD R14",
  "AC1015": "AutoCAD 2000–2002",
  "AC1018": "AutoCAD 2004–2006",
  "AC1021": "AutoCAD 2007–2009",
  "AC1024": "AutoCAD 2010–2012",
  "AC1027": "AutoCAD 2013–2017",
  "AC1032": "AutoCAD 2018–2023",
};

/** Extract printable ASCII strings ≥ minLen from binary data */
function extractStrings(bytes: Uint8Array, minLen = 3): string[] {
  const results: string[] = [];
  let current = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 32 && c <= 126) {
      current += String.fromCharCode(c);
    } else {
      if (current.length >= minLen) results.push(current.trim());
      current = "";
    }
  }
  if (current.length >= minLen) results.push(current.trim());
  return results;
}

/** Try to find UTF-16LE strings (common in newer DWG) */
function extractUtf16Strings(bytes: Uint8Array, minLen = 3): string[] {
  const results: string[] = [];
  let current = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const lo = bytes[i], hi = bytes[i + 1];
    if (lo >= 32 && lo <= 126 && hi === 0) {
      current += String.fromCharCode(lo);
    } else {
      if (current.length >= minLen) results.push(current.trim());
      current = "";
    }
  }
  if (current.length >= minLen) results.push(current.trim());
  return results;
}

/** Parse WxH, W*H, W×H patterns */
function parseDimensionString(s: string): { width: number; height: number } | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const a = parseFloat(m[1]), b = parseFloat(m[2]);
      if (a > 0 && b > 0 && a < 100000 && b < 100000) return { width: a, height: b };
    }
  }
  return null;
}

/** Extract a standalone number if it looks like a dimension */
function parseSingleDimension(s: string): number | null {
  const m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (v > 0 && v < 100000) return v;
  return null;
}

/** Heuristic: does a string look like a layer name? */
function looksLikeLayer(s: string): boolean {
  return /^[A-Za-z0-9_\-\.]{2,32}$/.test(s) && !/^\d+$/.test(s);
}

/** Try to extract material/thickness from a string */
function extractMaterialInfo(strings: string[]): { material: string; thickness: string; drawingNumber: string; title: string } {
  let material = "", thickness = "", drawingNumber = "", title = "";

  for (const s of strings) {
    // Drawing number pattern like WTT-0528
    if (!drawingNumber && /^[A-Z]{2,6}-\d{3,6}$/.test(s)) drawingNumber = s;
    // Material names
    if (!material && /\b(MS|SS|GI|ALUMINIUM|ALUMINUM|STEEL|PLATE|SHEET|HR|CR|GALV)\b/i.test(s)) {
      material = s.substring(0, 40);
    }
    // Thickness like "8 MM", "8MM", "THK-8", "THICK-8"
    if (!thickness) {
      const tm = s.match(/(\d+(?:\.\d+)?)\s*MM/i) || s.match(/THICK\s*[-:]?\s*(\d+(?:\.\d+)?)/i) || s.match(/THK\s*[-:]?\s*(\d+(?:\.\d+)?)/i);
      if (tm) thickness = tm[1] + " mm";
    }
    // Title: "Nesting" keyword
    if (!title && /nesting/i.test(s) && s.length > 5 && s.length < 80) title = s;
  }
  return { material, thickness, drawingNumber, title };
}

/** Main DWG analysis function */
export async function analyzeDwgFile(file: File): Promise<DwgAnalysis> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const header = String.fromCharCode(...Array.from(bytes.slice(0, 6)));
  if (!header.startsWith("AC")) throw new Error("Not a valid DWG file.");
  const versionName = DWG_VERSIONS[header] ?? `DWG (${header})`;

  const asciiStrings = extractStrings(bytes, 3);
  const utf16Strings = extractUtf16Strings(bytes, 3);
  const allStrings = [...new Set([...asciiStrings, ...utf16Strings])].filter(s => s.length >= 3 && s.length <= 120);

  // Filter noise strings
  const usefulStrings = allStrings.filter(s => {
    if (/^[0-9a-f]{6,}$/i.test(s)) return false; // hex junk
    if (/^[=\-_+*/.]{3,}$/.test(s)) return false; // separator lines
    return true;
  });

  // Extract layer-like names (appear in the string table section)
  const layerNames = usefulStrings
    .filter(s => looksLikeLayer(s) && !/^(AcDb|AcCm|AcGe|dict|ACAD|null|TRUE|FALSE|SOLID|VERTEX|SEQEND|MODEL|PAPER)/.test(s))
    .slice(0, 30);

  // Extract block-like names
  const blockNames = usefulStrings
    .filter(s => /^\*?[A-Z][A-Z0-9_\-]{1,20}$/i.test(s) && !/^(Layer|Block|Table|Group|Ltype|Style|View|UCS|VPORT|DIMSTYLE)$/i.test(s))
    .slice(0, 20);

  const { material, thickness, drawingNumber, title } = extractMaterialInfo(usefulStrings);

  // Find dimension patterns
  const detectedDimensions: DetectedDimension[] = [];
  const dimMap = new Map<string, DetectedDimension>();

  for (const s of usefulStrings) {
    const dim = parseDimensionString(s);
    if (dim && dim.width >= 10 && dim.height >= 10) {
      const key = `${dim.width}x${dim.height}`;
      if (!dimMap.has(key)) {
        dimMap.set(key, {
          raw: s,
          width: Math.round(dim.width * 10) / 10,
          height: Math.round(dim.height * 10) / 10,
          context: s,
        });
      }
    }
  }
  detectedDimensions.push(...dimMap.values());
  detectedDimensions.sort((a, b) => b.width * b.height - a.width * a.height);

  // Build suggested parts from layer names + dimension hints
  const suggestedParts: SuggestedPart[] = [];

  if (detectedDimensions.length > 0) {
    // Use detected dimensions to create part suggestions
    // Filter out sheet-sized dimensions (very large)
    const partDims = detectedDimensions.filter(d => d.width < 5000 && d.height < 5000);
    const sheetDims = detectedDimensions.filter(d => d.width >= 500 || d.height >= 500);

    for (let i = 0; i < Math.min(partDims.length, 10); i++) {
      const d = partDims[i];
      suggestedParts.push({
        name: `Part ${i + 1}`,
        width: d.width,
        height: d.height,
        quantity: 1,
        source: `Detected: ${d.raw}`,
        confidence: i === 0 ? "high" : "medium",
      });
    }

    // If only sheet-sized dims found, suggest one as a part
    if (suggestedParts.length === 0 && sheetDims.length > 0) {
      const d = sheetDims[0];
      suggestedParts.push({
        name: drawingNumber || file.name.replace(/\.dwg$/i, ""),
        width: d.width,
        height: d.height,
        quantity: 1,
        source: `Detected: ${d.raw}`,
        confidence: "low",
      });
    }
  }

  // If still no suggestions, use layer names as part name stubs
  if (suggestedParts.length === 0 && layerNames.length > 0) {
    const partLayers = layerNames.filter(l => !/^(0|Defpoints|TITLE|BORDER|DIM|TEXT|HATCH|CENTER|HIDDEN)$/i.test(l));
    for (let i = 0; i < Math.min(partLayers.length, 5); i++) {
      suggestedParts.push({
        name: partLayers[i],
        width: 100,
        height: 100,
        quantity: 1,
        source: `Layer: ${partLayers[i]}`,
        confidence: "low",
      });
    }
  }

  // Fallback: at least one entry with file name
  if (suggestedParts.length === 0) {
    suggestedParts.push({
      name: drawingNumber || file.name.replace(/\.dwg$/i, ""),
      width: 100,
      height: 100,
      quantity: 1,
      source: "Manual entry required",
      confidence: "low",
    });
  }

  return {
    fileName: file.name,
    version: header,
    versionName,
    fileSize: buffer.byteLength,
    drawingTitle: title,
    materialType: material,
    thickness,
    drawingNumber,
    layerNames,
    blockNames,
    textStrings: usefulStrings.slice(0, 60),
    detectedDimensions,
    suggestedParts,
  };
}

/** Legacy wrapper */
export async function readDwgFileInfo(file: File): Promise<DwgFileInfo> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = String.fromCharCode(...Array.from(bytes.slice(0, 6)));
  if (!header.startsWith("AC")) throw new Error("Not a valid DWG file.");
  return { fileName: file.name, version: header, versionName: DWG_VERSIONS[header] ?? `DWG (${header})` };
}

interface BoundingBox { minX: number; minY: number; maxX: number; maxY: number; }

function getBBoxFromPoints(points: { x: number; y: number }[]): BoundingBox | null {
  if (!points.length) return null;
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
    case "LINE": return getBBoxFromPoints([
      { x: entity.startPoint?.x ?? 0, y: entity.startPoint?.y ?? 0 },
      { x: entity.endPoint?.x ?? 0, y: entity.endPoint?.y ?? 0 },
    ]);
    case "LWPOLYLINE":
    case "POLYLINE": return getBBoxFromPoints((entity.vertices ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 })));
    case "CIRCLE": { const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0, r = entity.radius ?? 0;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r }; }
    case "ARC": { const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0, r = entity.radius ?? 0;
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r }; }
    case "ELLIPSE": { const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0;
      const a = Math.sqrt(Math.pow(entity.majorAxisEndPoint?.x ?? 0, 2) + Math.pow(entity.majorAxisEndPoint?.y ?? 0, 2));
      const b = a * (entity.axisRatio ?? 1);
      return { minX: cx - a, minY: cy - b, maxX: cx + a, maxY: cy + b }; }
    case "SPLINE": return getBBoxFromPoints((entity.controlPoints ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 })));
    default: return null;
  }
}

function mergeBBoxes(bboxes: BoundingBox[]): BoundingBox | null {
  if (!bboxes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bboxes) {
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

/** Extract all outline points from a DXF entity (polylines, lines, arcs approximated) */
function entityToPoints(entity: any): { x: number; y: number }[] {
  switch (entity.type) {
    case "LWPOLYLINE":
    case "POLYLINE":
      return (entity.vertices ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 }));
    case "LINE":
      return [
        { x: entity.startPoint?.x ?? 0, y: entity.startPoint?.y ?? 0 },
        { x: entity.endPoint?.x ?? 0, y: entity.endPoint?.y ?? 0 },
      ];
    case "CIRCLE": {
      const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0, r = entity.radius ?? 0;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return pts;
    }
    case "ARC": {
      const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0, r = entity.radius ?? 0;
      const startA = ((entity.startAngle ?? 0) * Math.PI) / 180;
      const endA = ((entity.endAngle ?? 360) * Math.PI) / 180;
      const pts: { x: number; y: number }[] = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const a = startA + (endA - startA) * (i / steps);
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return pts;
    }
    case "SPLINE":
      return (entity.controlPoints ?? []).map((v: any) => ({ x: v.x ?? 0, y: v.y ?? 0 }));
    case "ELLIPSE": {
      const cx = entity.center?.x ?? 0, cy = entity.center?.y ?? 0;
      const ax = entity.majorAxisEndPoint?.x ?? 1, ay = entity.majorAxisEndPoint?.y ?? 0;
      const ratio = entity.axisRatio ?? 1;
      const a = Math.sqrt(ax * ax + ay * ay);
      const b = a * ratio;
      const angle = Math.atan2(ay, ax);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 32; i++) {
        const t = (i / 32) * Math.PI * 2;
        pts.push({
          x: cx + Math.cos(t) * a * Math.cos(angle) - Math.sin(t) * b * Math.sin(angle),
          y: cy + Math.cos(t) * a * Math.sin(angle) + Math.sin(t) * b * Math.cos(angle),
        });
      }
      return pts;
    }
    default:
      return [];
  }
}

/** Build a normalized geometry polygon from entities, relative to their bounding box */
function entitiesToGeometry(ents: any[]): { geometry: { x: number; y: number }[] | undefined; bbox: BoundingBox | null } {
  const bboxes = ents.map(entityToBBox).filter((b): b is BoundingBox => b !== null);
  const merged = mergeBBoxes(bboxes);
  if (!merged) return { geometry: undefined, bbox: null };

  const allPoints: { x: number; y: number }[] = [];
  for (const ent of ents) {
    const pts = entityToPoints(ent);
    for (const pt of pts) allPoints.push(pt);
  }

  if (allPoints.length < 3) return { geometry: undefined, bbox: merged };

  const normalized = allPoints.map(pt => ({
    x: Math.round((pt.x - merged.minX) * 100) / 100,
    y: Math.round((pt.y - merged.minY) * 100) / 100,
  }));

  return { geometry: normalized, bbox: merged };
}

export async function parseDxfFile(file: File): Promise<Part[]> {
  const text = await file.text();
  const DxfParser = (await import("dxf-parser")).default;
  const parser = new DxfParser();

  let dxf: any;
  try { dxf = parser.parseSync(text); } catch {
    throw new Error("Failed to parse DXF file. Ensure it is a valid ASCII DXF.");
  }

  const entities: any[] = dxf?.entities ?? [];
  if (!entities.length) throw new Error("No drawing entities found.");

  const layerGroups = new Map<string, any[]>();
  for (const entity of entities) {
    const layer = entity.layer ?? "0";
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(entity);
  }

  const parts: Part[] = [];

  // Group by blocks if defined
  const blocks: any = dxf?.blocks ?? {};
  let blockIdx = 0;
  for (const [blockName, block] of Object.entries<any>(blocks)) {
    if (blockName.startsWith("*")) continue;
    const ents: any[] = block?.entities ?? [];
    const { geometry, bbox } = entitiesToGeometry(ents);
    if (!bbox) continue;
    const w = Math.round((bbox.maxX - bbox.minX) * 10) / 10;
    const h = Math.round((bbox.maxY - bbox.minY) * 10) / 10;
    if (w >= 1 && h >= 1) {
      parts.push({ id: `dxf-block-${blockIdx++}`, name: blockName, width: w, height: h, quantity: 1, sourceFile: file.name, geometry });
    }
  }

  if (parts.length > 0) return parts;

  if (layerGroups.size > 1) {
    let idx = 0;
    for (const [layer, ents] of layerGroups.entries()) {
      if (/^(0|Defpoints|DIM|TEXT|TITLE|BORDER|HATCH)$/i.test(layer)) continue;
      const { geometry, bbox } = entitiesToGeometry(ents);
      if (!bbox) continue;
      const w = Math.round((bbox.maxX - bbox.minX) * 10) / 10;
      const h = Math.round((bbox.maxY - bbox.minY) * 10) / 10;
      if (w >= 1 && h >= 1) {
        parts.push({ id: `dxf-layer-${idx++}`, name: `${layer}`, width: w, height: h, quantity: 1, sourceFile: file.name, geometry });
      }
    }
  }

  if (parts.length === 0) {
    const { geometry, bbox } = entitiesToGeometry(entities);
    if (bbox) {
      const w = Math.round((bbox.maxX - bbox.minX) * 10) / 10;
      const h = Math.round((bbox.maxY - bbox.minY) * 10) / 10;
      if (w >= 1 && h >= 1)
        parts.push({ id: `dxf-whole-0`, name: file.name.replace(/\.dxf$/i, ""), width: w, height: h, quantity: 1, sourceFile: file.name, geometry });
    }
  }

  if (!parts.length) throw new Error("Could not extract part dimensions from DXF.");
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
    if (tag === "rect") { w = parseFloat(el.getAttribute("width") ?? "0"); h = parseFloat(el.getAttribute("height") ?? "0"); }
    else if (tag === "circle") { const r = parseFloat(el.getAttribute("r") ?? "0"); w = h = r * 2; }
    else if (tag === "ellipse") { w = parseFloat(el.getAttribute("rx") ?? "0") * 2; h = parseFloat(el.getAttribute("ry") ?? "0") * 2; }
    else {
      try { const bbox = (el as SVGGraphicsElement).getBBox?.(); if (bbox) { w = bbox.width; h = bbox.height; } } catch {}
    }
    const wR = Math.round(w * 10) / 10, hR = Math.round(h * 10) / 10;
    if (wR > 0 && hR > 0) {
      const id = el.getAttribute("id") ?? el.getAttribute("inkscape:label") ?? `shape-${idx}`;
      parts.push({ id: `svg-${idx++}`, name: id, width: wR, height: hR, quantity: 1, sourceFile: file.name });
    }
  }

  if (!parts.length) {
    const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) ?? [];
    const w = vb[2] ?? parseFloat(svg.getAttribute("width") ?? "0");
    const h = vb[3] ?? parseFloat(svg.getAttribute("height") ?? "0");
    if (w > 0 && h > 0) parts.push({ id: "svg-whole-0", name: file.name.replace(/\.svg$/i, ""), width: w, height: h, quantity: 1, sourceFile: file.name });
  }

  if (!parts.length) throw new Error("Could not extract shapes from SVG.");
  return parts;
}
