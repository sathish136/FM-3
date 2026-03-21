export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  color?: string;
  sourceFile?: string;
  allowRotation?: boolean;
  grainDirection?: "none" | "horizontal" | "vertical";
}

export interface PlacedPart {
  partId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  color: string;
  sheetIndex: number;
  instanceIndex: number;
}

export interface Sheet {
  width: number;
  height: number;
  index: number;
  placedParts: PlacedPart[];
  utilization: number;
  usedArea: number;
}

export interface NestingResult {
  sheets: Sheet[];
  placedParts: PlacedPart[];
  totalParts: number;
  placedCount: number;
  totalSheetArea: number;
  totalUsedArea: number;
  utilizationPercent: number;
  wastePercent: number;
  unplacedParts: { part: Part; remaining: number }[];
  strategy: string;
  timeMs: number;
}

export const PART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#059669", "#d97706",
  "#7c3aed", "#db2777", "#0891b2", "#65a30d", "#b45309",
];

interface Rect { x: number; y: number; w: number; h: number; }

type SortKey = "area" | "perimeter" | "maxSide" | "width" | "height";
type ScoreMode = "bssf" | "blsf" | "baf";

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function splitRect(free: Rect, placed: Rect): Rect[] {
  const result: Rect[] = [];
  if (placed.x > free.x)
    result.push({ x: free.x, y: free.y, w: placed.x - free.x, h: free.h });
  if (placed.x + placed.w < free.x + free.w)
    result.push({ x: placed.x + placed.w, y: free.y, w: free.x + free.w - (placed.x + placed.w), h: free.h });
  if (placed.y > free.y)
    result.push({ x: free.x, y: free.y, w: free.w, h: placed.y - free.y });
  if (placed.y + placed.h < free.y + free.h)
    result.push({ x: free.x, y: placed.y + placed.h, w: free.w, h: free.y + free.h - (placed.y + placed.h) });
  return result;
}

function pruneFreeRects(freeRects: Rect[]): Rect[] {
  return freeRects.filter((a, i) =>
    !freeRects.some((b, j) => i !== j && b.x <= a.x && b.y <= a.y &&
      b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h)
  );
}

interface Instance {
  partId: string;
  name: string;
  width: number;
  height: number;
  color: string;
  instanceIndex: number;
  allowRotation: boolean;
  grainDirection: "none" | "horizontal" | "vertical";
}

function scoreRect(free: Rect, pw: number, ph: number, mode: ScoreMode): number {
  const leftoverX = free.w - pw;
  const leftoverY = free.h - ph;
  if (mode === "bssf") return Math.min(leftoverX, leftoverY);
  if (mode === "blsf") return Math.max(leftoverX, leftoverY);
  return free.w * free.h - pw * ph;
}

function nestOnSheet(
  sheetW: number, sheetH: number,
  instances: Instance[],
  sheetIndex: number,
  kerf: number,
  scoreMode: ScoreMode
): { placed: PlacedPart[]; unplaced: Instance[] } {
  const placed: PlacedPart[] = [];
  const unplaced: Instance[] = [];
  let freeRects: Rect[] = [{ x: 0, y: 0, w: sheetW, h: sheetH }];

  for (const inst of instances) {
    const pw = inst.width + kerf;
    const ph = inst.height + kerf;

    let bestScore = Infinity;
    let bestRect: Rect | null = null;
    let bestRotated = false;

    for (const rect of freeRects) {
      const canNormal = pw <= rect.w && ph <= rect.h;
      const canRotated = inst.allowRotation &&
        inst.grainDirection === "none" &&
        ph <= rect.w && pw <= rect.h;

      if (canNormal) {
        const score = scoreRect(rect, pw, ph, scoreMode);
        if (score < bestScore) { bestScore = score; bestRect = rect; bestRotated = false; }
      }
      if (canRotated) {
        const score = scoreRect(rect, ph, pw, scoreMode);
        if (score < bestScore) { bestScore = score; bestRect = rect; bestRotated = true; }
      }
    }

    if (!bestRect) { unplaced.push(inst); continue; }

    const actualW = bestRotated ? inst.height : inst.width;
    const actualH = bestRotated ? inst.width : inst.height;
    const usedW = actualW + kerf;
    const usedH = actualH + kerf;

    const placedRect: Rect = { x: bestRect.x, y: bestRect.y, w: usedW, h: usedH };

    placed.push({
      partId: inst.partId,
      name: inst.name,
      x: bestRect.x,
      y: bestRect.y,
      width: actualW,
      height: actualH,
      rotated: bestRotated,
      color: inst.color,
      sheetIndex,
      instanceIndex: inst.instanceIndex,
    });

    const newFree: Rect[] = [];
    for (const fr of freeRects) {
      if (intersects(fr, placedRect)) {
        newFree.push(...splitRect(fr, placedRect));
      } else {
        newFree.push(fr);
      }
    }
    freeRects = pruneFreeRects(newFree);
  }

  return { placed, unplaced };
}

function sortInstances(instances: Instance[], key: SortKey): Instance[] {
  return [...instances].sort((a, b) => {
    if (key === "area") return b.width * b.height - a.width * a.height;
    if (key === "perimeter") return (b.width + b.height) - (a.width + a.height);
    if (key === "maxSide") return Math.max(b.width, b.height) - Math.max(a.width, a.height);
    if (key === "width") return b.width - a.width;
    return b.height - a.height;
  });
}

function runStrategy(
  parts: Part[], sheetW: number, sheetH: number,
  kerf: number, sortKey: SortKey, scoreMode: ScoreMode
): { sheets: Sheet[]; allPlaced: PlacedPart[]; unplacedInstances: Instance[] } {
  const allInstances: Instance[] = [];
  parts.forEach((part, pi) => {
    const color = part.color ?? PART_COLORS[pi % PART_COLORS.length];
    for (let q = 0; q < part.quantity; q++) {
      allInstances.push({
        partId: part.id,
        name: part.name,
        width: part.width,
        height: part.height,
        color,
        instanceIndex: q,
        allowRotation: part.allowRotation !== false,
        grainDirection: part.grainDirection ?? "none",
      });
    }
  });

  const sorted = sortInstances(allInstances, sortKey);
  const sheets: Sheet[] = [];
  const allPlaced: PlacedPart[] = [];
  let remaining = [...sorted];
  let sheetIndex = 0;

  while (remaining.length > 0 && sheetIndex < 100) {
    const { placed, unplaced } = nestOnSheet(sheetW, sheetH, remaining, sheetIndex, kerf, scoreMode);
    if (placed.length === 0) break;

    const usedArea = placed.reduce((s, p) => s + p.width * p.height, 0);
    sheets.push({
      width: sheetW, height: sheetH, index: sheetIndex,
      placedParts: placed,
      usedArea,
      utilization: (usedArea / (sheetW * sheetH)) * 100,
    });
    allPlaced.push(...placed);
    remaining = unplaced;
    sheetIndex++;
  }

  return { sheets, allPlaced, unplacedInstances: remaining };
}

export function runNesting(
  parts: Part[],
  sheetWidth: number,
  sheetHeight: number,
  allowRotation: boolean = true,
  kerf: number = 2
): NestingResult {
  const t0 = Date.now();

  const preparedParts = parts.map(p => ({
    ...p,
    allowRotation: allowRotation && p.allowRotation !== false,
  }));

  const strategies: Array<[SortKey, ScoreMode, string]> = [
    ["area", "bssf", "Area ↓ + BSSF"],
    ["area", "blsf", "Area ↓ + BLSF"],
    ["perimeter", "bssf", "Perimeter ↓ + BSSF"],
    ["maxSide", "bssf", "MaxSide ↓ + BSSF"],
    ["area", "baf", "Area ↓ + BAF"],
    ["perimeter", "blsf", "Perimeter ↓ + BLSF"],
  ];

  let bestResult: { sheets: Sheet[]; allPlaced: PlacedPart[]; unplacedInstances: Instance[]; label: string } | null = null;

  for (const [sortKey, scoreMode, label] of strategies) {
    const res = runStrategy(preparedParts, sheetWidth, sheetHeight, kerf, sortKey, scoreMode);
    if (
      !bestResult ||
      res.sheets.length < bestResult.sheets.length ||
      (res.sheets.length === bestResult.sheets.length &&
        res.allPlaced.reduce((s, p) => s + p.width * p.height, 0) >
        bestResult.allPlaced.reduce((s, p) => s + p.width * p.height, 0))
    ) {
      bestResult = { ...res, label };
    }
  }

  const { sheets, allPlaced, unplacedInstances, label } = bestResult!;

  const allInstances: Instance[] = [];
  preparedParts.forEach((part, pi) => {
    const color = part.color ?? PART_COLORS[pi % PART_COLORS.length];
    for (let q = 0; q < part.quantity; q++) {
      allInstances.push({
        partId: part.id, name: part.name,
        width: part.width, height: part.height,
        color, instanceIndex: q,
        allowRotation: part.allowRotation !== false,
        grainDirection: part.grainDirection ?? "none",
      });
    }
  });

  const totalSheetArea = sheets.length * sheetWidth * sheetHeight;
  const totalUsedArea = allPlaced.reduce((s, p) => s + p.width * p.height, 0);
  const totalParts = allInstances.length;

  const unplacedParts: { part: Part; remaining: number }[] = [];
  if (unplacedInstances.length > 0) {
    const countMap = new Map<string, number>();
    for (const inst of unplacedInstances) {
      countMap.set(inst.partId, (countMap.get(inst.partId) ?? 0) + 1);
    }
    for (const [partId, count] of countMap.entries()) {
      const part = parts.find(p => p.id === partId);
      if (part) unplacedParts.push({ part, remaining: count });
    }
  }

  return {
    sheets, placedParts: allPlaced,
    totalParts, placedCount: allPlaced.length,
    totalSheetArea, totalUsedArea,
    utilizationPercent: totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0,
    wastePercent: totalSheetArea > 0 ? ((totalSheetArea - totalUsedArea) / totalSheetArea) * 100 : 0,
    unplacedParts,
    strategy: label,
    timeMs: Date.now() - t0,
  };
}
