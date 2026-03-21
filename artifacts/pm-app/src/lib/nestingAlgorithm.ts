export interface Part {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  color?: string;
  sourceFile?: string;
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
}

const PART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#059669", "#d97706",
];

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectFits(
  fw: number, fh: number, pw: number, ph: number
): { fits: boolean; rotated: boolean } {
  if (pw <= fw && ph <= fh) return { fits: true, rotated: false };
  if (ph <= fw && pw <= fh) return { fits: true, rotated: true };
  return { fits: false, rotated: false };
}

function splitFreeRect(
  rect: FreeRect, placedX: number, placedY: number, pw: number, ph: number
): FreeRect[] {
  const result: FreeRect[] = [];
  const rightW = rect.x + rect.width - (placedX + pw);
  if (rightW > 0) {
    result.push({ x: placedX + pw, y: rect.y, width: rightW, height: rect.height });
  }
  const topH = rect.y + rect.height - (placedY + ph);
  if (topH > 0) {
    result.push({ x: rect.x, y: placedY + ph, width: rect.width, height: topH });
  }
  return result;
}

function removeDominatedRects(rects: FreeRect[]): FreeRect[] {
  return rects.filter((a, i) =>
    !rects.some((b, j) =>
      i !== j &&
      b.x <= a.x && b.y <= a.y &&
      b.x + b.width >= a.x + a.width &&
      b.y + b.height >= a.y + a.height
    )
  );
}

function nestOnSheet(
  sheetW: number,
  sheetH: number,
  instances: { partId: string; name: string; width: number; height: number; color: string; instanceIndex: number }[],
  sheetIndex: number,
  padding: number = 2
): { placed: PlacedPart[]; unplaced: typeof instances } {
  const placed: PlacedPart[] = [];
  const unplaced: typeof instances = [];

  let freeRects: FreeRect[] = [{ x: padding, y: padding, width: sheetW - padding * 2, height: sheetH - padding * 2 }];

  for (const inst of instances) {
    const pw = inst.width + padding;
    const ph = inst.height + padding;

    let bestScore = Infinity;
    let bestRect: FreeRect | null = null;
    let bestRotated = false;

    for (const rect of freeRects) {
      const fit = rectFits(rect.width, rect.height, pw, ph);
      if (!fit.fits) continue;
      const w = fit.rotated ? ph : pw;
      const h = fit.rotated ? pw : ph;
      const score = Math.min(rect.width - w, rect.height - h);
      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
        bestRotated = fit.rotated;
      }
    }

    if (!bestRect) {
      unplaced.push(inst);
      continue;
    }

    const actualW = bestRotated ? inst.height : inst.width;
    const actualH = bestRotated ? inst.width : inst.height;

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

    const pw2 = actualW + padding;
    const ph2 = actualH + padding;
    const newRects = splitFreeRect(bestRect, bestRect.x, bestRect.y, pw2, ph2);
    freeRects = freeRects.filter(r => r !== bestRect);
    freeRects.push(...newRects);
    freeRects = removeDominatedRects(freeRects);
  }

  return { placed, unplaced };
}

export function runNesting(
  parts: Part[],
  sheetWidth: number,
  sheetHeight: number,
  allowRotation: boolean = true,
  padding: number = 2
): NestingResult {
  const sortedParts: Part[] = [...parts].sort(
    (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)
  );

  const allInstances: { partId: string; name: string; width: number; height: number; color: string; instanceIndex: number }[] = [];

  sortedParts.forEach((part, pi) => {
    const color = part.color ?? PART_COLORS[pi % PART_COLORS.length];
    for (let q = 0; q < part.quantity; q++) {
      allInstances.push({
        partId: part.id,
        name: part.name,
        width: part.width,
        height: part.height,
        color,
        instanceIndex: q,
      });
    }
  });

  const sheets: Sheet[] = [];
  const allPlaced: PlacedPart[] = [];
  let remaining = [...allInstances];

  let sheetIndex = 0;
  const MAX_SHEETS = 50;

  while (remaining.length > 0 && sheetIndex < MAX_SHEETS) {
    const { placed, unplaced } = nestOnSheet(sheetWidth, sheetHeight, remaining, sheetIndex, padding);

    if (placed.length === 0) break;

    const usedArea = placed.reduce((sum, p) => sum + p.width * p.height, 0);
    const sheetArea = sheetWidth * sheetHeight;

    sheets.push({
      width: sheetWidth,
      height: sheetHeight,
      index: sheetIndex,
      placedParts: placed,
      usedArea,
      utilization: (usedArea / sheetArea) * 100,
    });

    allPlaced.push(...placed);
    remaining = unplaced;
    sheetIndex++;
  }

  const totalSheetArea = sheets.length * sheetWidth * sheetHeight;
  const totalUsedArea = allPlaced.reduce((sum, p) => sum + p.width * p.height, 0);
  const totalParts = allInstances.length;

  const unplacedParts: { part: Part; remaining: number }[] = [];
  if (remaining.length > 0) {
    const countMap = new Map<string, number>();
    for (const inst of remaining) {
      countMap.set(inst.partId, (countMap.get(inst.partId) ?? 0) + 1);
    }
    for (const [partId, count] of countMap.entries()) {
      const part = parts.find(p => p.id === partId);
      if (part) unplacedParts.push({ part, remaining: count });
    }
  }

  return {
    sheets,
    placedParts: allPlaced,
    totalParts,
    placedCount: allPlaced.length,
    totalSheetArea,
    totalUsedArea,
    utilizationPercent: totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0,
    wastePercent: totalSheetArea > 0 ? ((totalSheetArea - totalUsedArea) / totalSheetArea) * 100 : 0,
    unplacedParts,
  };
}
