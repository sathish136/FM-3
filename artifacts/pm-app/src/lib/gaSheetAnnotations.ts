/** WTT-style sheet annotations — connection notes, border grid. */

import type { BomRow } from "./drawingSheetLayout";

export interface ConnectionNote {
  lines: string[];
  nx: number;
  ny: number;
  leaderNx: number;
  leaderNy: number;
}

/** Default connection callouts like WTT reference sheet. */
export function buildDefaultConnectionNotes(
  drawingNumber: string,
  _title: string,
): ConnectionNote[] {
  const linked =
    drawingNumber.replace(/-01$/, "-02") !== drawingNumber
      ? drawingNumber.replace(/-01$/, "-02")
      : `${drawingNumber}-02`;

  return [
    {
      lines: ["CONNECTED TO:", "PUMP LINE", "MODEL NO: GB40PP"],
      nx: 0.14,
      ny: 0.22,
      leaderNx: 0.42,
      leaderNy: 0.38,
    },
    {
      lines: ["CONNECTED TO:", linked],
      nx: 0.78,
      ny: 0.82,
      leaderNx: 0.58,
      leaderNy: 0.68,
    },
  ];
}

export function drawConnectionNotesOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  notes: ConnectionNote[],
) {
  const fontSize = Math.max(12, Math.round(w / 88));
  const pad = fontSize * 0.45;
  const lineH = fontSize + 3;

  for (const note of notes) {
    const bx = note.nx * w;
    const by = note.ny * h;
    const tx = note.leaderNx * w;
    const ty = note.leaderNy * h;

    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const maxW = Math.max(...note.lines.map(l => ctx.measureText(l).width));
    const boxW = maxW + pad * 2;
    const boxH = note.lines.length * lineH + pad * 2;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.3;
    ctx.fillRect(bx - boxW / 2, by - boxH / 2, boxW, boxH);
    ctx.strokeRect(bx - boxW / 2, by - boxH / 2, boxW, boxH);

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    note.lines.forEach((line, i) => {
      ctx.fillText(line, bx, by - boxH / 2 + pad + fontSize + i * lineH);
    });
    ctx.textAlign = "left";

    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    ctx.beginPath();
    ctx.moveTo(bx + ux * (boxW / 2 + 3), by + uy * (boxH / 2 + 3));
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
}

/** Border grid A–D × 1–4 (WTT reference). */
export function drawBorderGridPdf(
  pdf: {
    setDrawColor: (r: number, g: number, b: number) => void;
    setLineWidth: (w: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
    setFontSize: (s: number) => void;
    setFont: (f: string, s: string) => void;
    text: (t: string, x: number, y: number, o?: { align?: string }) => void;
  },
  pageW: number,
  pageH: number,
  innerL: number,
  innerT: number,
  innerR: number,
  innerB: number,
) {
  const cols = ["A", "B", "C", "D"];
  const rows = 4;
  const iw = innerR - innerL;
  const ih = innerB - innerT;
  const colW = iw / cols.length;
  const rowH = ih / rows;

  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.15);
  for (let c = 1; c < cols.length; c++) {
    const x = innerL + c * colW;
    pdf.line(x, innerT, x, innerB);
  }
  for (let r = 1; r < rows; r++) {
    const y = innerT + r * rowH;
    pdf.line(innerL, y, innerR, y);
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  cols.forEach((label, i) => {
    pdf.text(label, innerL + (i + 0.5) * colW, innerT - 2, { align: "center" });
  });
  for (let r = 0; r < rows; r++) {
    pdf.text(String(r + 1), innerL - 2.5, innerT + (r + 0.55) * rowH, { align: "right" });
  }
}

export type { BomRow };
