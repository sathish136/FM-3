import { jsPDF } from "jspdf";

export const CARD_WIDTH_MM = 53.963;
export const CARD_HEIGHT_MM = 84.088;
/** Fixed gap between cards, pairs, and rows on PDF sheets. */
export const GAP_MM = 1;
export const PAIR_GAP_MM = GAP_MM;
/** Front + gap + back. */
export const PAIR_WIDTH_MM = 2 * CARD_WIDTH_MM + GAP_MM;
/** Minimal edge margin for PDF (maximize cards per page). */
export const PDF_MARGIN_MM = 1;
/** Single cards per A4 for browser print (fronts sheet / backs sheet). */
export const CARDS_PER_SHEET = 9;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;

export interface PairSlot {
  front: GridSlot;
  back: GridSlot;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 8;
const MARGIN_Y = 8;

export interface GridSlot {
  x: number;
  y: number;
}

/** 3×3 card positions on A4 (matches print CSS). */
export function computeA4GridSlots(): GridSlot[] {
  const usableW = PAGE_W - 2 * MARGIN_X;
  const gapX = (usableW - GRID_COLS * CARD_WIDTH_MM) / (GRID_COLS - 1);
  const usableH = PAGE_H - 2 * MARGIN_Y;
  const gapY = (usableH - GRID_ROWS * CARD_HEIGHT_MM) / (GRID_ROWS - 1);
  const slots: GridSlot[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      slots.push({
        x: MARGIN_X + c * (CARD_WIDTH_MM + gapX),
        y: MARGIN_Y + r * (CARD_HEIGHT_MM + gapY),
      });
    }
  }
  return slots;
}

/** Max front|back pairs that fit on A4 with fixed {@link GAP_MM} spacing. */
export function computeA4PairGridSlots(
  orientation: "portrait" | "landscape" = "portrait",
): PairSlot[] {
  const pageW = orientation === "portrait" ? PAGE_W : PAGE_H;
  const pageH = orientation === "portrait" ? PAGE_H : PAGE_W;
  const usableW = pageW - 2 * PDF_MARGIN_MM;
  const usableH = pageH - 2 * PDF_MARGIN_MM;

  const pairsPerRow = Math.max(
    1,
    Math.floor((usableW + GAP_MM) / (PAIR_WIDTH_MM + GAP_MM)),
  );
  const pairRows = Math.max(
    1,
    Math.floor((usableH + GAP_MM) / (CARD_HEIGHT_MM + GAP_MM)),
  );

  const blockW = pairsPerRow * PAIR_WIDTH_MM + (pairsPerRow - 1) * GAP_MM;
  const offsetX = (pageW - blockW) / 2;

  const slots: PairSlot[] = [];
  for (let r = 0; r < pairRows; r++) {
    for (let c = 0; c < pairsPerRow; c++) {
      const x = offsetX + c * (PAIR_WIDTH_MM + GAP_MM);
      const y = PDF_MARGIN_MM + r * (CARD_HEIGHT_MM + GAP_MM);
      slots.push({
        front: { x, y },
        back: { x: x + CARD_WIDTH_MM + GAP_MM, y },
      });
    }
  }
  return slots;
}

/** PDF export uses landscape A4 to fit more front|back pairs per sheet. */
export const PDF_ORIENTATION = "landscape" as const;

export function getPairsPerSheet(): number {
  return computeA4PairGridSlots(PDF_ORIENTATION).length;
}

const XLINK_NS = "http://www.w3.org/1999/xlink";

/** Inline http(s) image refs so blob→canvas rasterization does not fail on external URLs. */
async function inlineSvgExternalImages(svg: string): Promise<string> {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svg;

  doc.querySelectorAll("foreignObject").forEach(el => el.remove());

  const images = [...doc.querySelectorAll("image")];
  await Promise.all(
    images.map(async img => {
      const href =
        img.getAttribute("href") ||
        img.getAttributeNS(XLINK_NS, "href") ||
        "";
      if (!href || href.startsWith("data:")) return;
      try {
        const sameOrigin = href.startsWith(window.location.origin);
        const res = await fetch(href, {
          credentials: sameOrigin ? "include" : "omit",
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        img.setAttribute("href", dataUrl);
        img.setAttributeNS(XLINK_NS, "href", dataUrl);
      } catch {
        /* keep original href */
      }
    }),
  );

  const root = doc.documentElement;
  return root ? new XMLSerializer().serializeToString(root) : svg;
}

async function svgToDataUrl(svg: string): Promise<string> {
  const inlined = await inlineSvgExternalImages(svg);
  return new Promise((resolve, reject) => {
    const blob = new Blob([inlined], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 4;
      const w = Math.round((CARD_WIDTH_MM / 25.4) * 96 * scale);
      const h = Math.round((CARD_HEIGHT_MM / 25.4) * 96 * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not available"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG"));
    };
    img.src = url;
  });
}

const CUT_LEN = 3;
const CUT_OFF = 1.5;

/** One outer L-shaped crop mark (same arm length on both sides). */
function drawOuterL(
  pdf: jsPDF,
  cx: number,
  cy: number,
  hEnd: number,
  vEnd: number,
) {
  pdf.line(cx, cy, hEnd, cy);
  pdf.line(cx, cy, cx, vEnd);
}

/** Crop marks on the four outer corners of a front|back pair only (no center marks). */
function drawPairCutMarks(
  pdf: jsPDF,
  front: GridSlot,
  back: GridSlot,
  w: number,
  h: number,
) {
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.2);
  const fx = front.x;
  const fy = front.y;
  const bx = back.x + w;
  const by = back.y;
  const bottom = fy + h;

  drawOuterL(pdf, fx - CUT_OFF, fy - CUT_OFF, fx + CUT_LEN, fy + CUT_LEN);
  drawOuterL(pdf, fx - CUT_OFF, bottom + CUT_OFF, fx + CUT_LEN, bottom - CUT_LEN);
  drawOuterL(pdf, bx + CUT_OFF, by - CUT_OFF, bx - CUT_LEN, by + CUT_LEN);
  drawOuterL(pdf, bx + CUT_OFF, bottom + CUT_OFF, bx - CUT_LEN, bottom - CUT_LEN);
}

export async function generateIdCardPdf(
  items: { name: string }[],
  fetchSvg: (name: string, side: "front" | "back") => Promise<string>,
  options: { cutMarks?: boolean },
): Promise<void> {
  const pairSlots = computeA4PairGridSlots(PDF_ORIENTATION);
  const pairsPerSheet = pairSlots.length;
  const pdf = new jsPDF({ orientation: PDF_ORIENTATION, unit: "mm", format: "a4" });
  const cutMarks = options.cutMarks !== false;

  if (items.length === 0) return;

  for (let i = 0; i < items.length; i++) {
    const slotIdx = i % pairsPerSheet;
    if (slotIdx === 0 && i > 0) pdf.addPage();

    const { front, back } = pairSlots[slotIdx];
    const [frontSvg, backSvg] = await Promise.all([
      fetchSvg(items[i].name, "front"),
      fetchSvg(items[i].name, "back"),
    ]);
    const [frontUrl, backUrl] = await Promise.all([
      svgToDataUrl(frontSvg),
      svgToDataUrl(backSvg),
    ]);

    pdf.addImage(frontUrl, "JPEG", front.x, front.y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    pdf.addImage(backUrl, "JPEG", back.x, back.y, CARD_WIDTH_MM, CARD_HEIGHT_MM);

    if (cutMarks) {
      drawPairCutMarks(pdf, front, back, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    }
  }

  pdf.save(`id-cards-${new Date().toISOString().slice(0, 10)}.pdf`);
}
