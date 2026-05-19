/**
 * FabricationSheetBuilder — A3 landscape engineering drawing.
 * Layout matches WTT drawing standard (see reference PDF):
 *   Left column  (40%): Front Elevation (top 57%) + Plan View (bottom 43%)
 *   Right column (60%): Large Isometric GA view (title block inset bottom-right)
 *   Bottom strip (22%): Bill of Materials + Title Block
 * Zone labels: 1-6 horizontal, A-D vertical (on all four edges).
 *
 * Uses live DOM rendering (MeasuredOrthoPreview + ShadedMeshImage) so views
 * are never blank — no giant offscreen WebGL canvas needed.
 */
import { useState, useRef } from "react";
import type { MeshData } from "@/lib/stepLoader";
import type { PartDrawingInfo } from "@/lib/stepPartDrawing";
import { partsToBomRows, firstPartForBomRow } from "@/lib/stepPartDrawing";
import { WTT_BOM_COLUMNS } from "@/lib/drawingSheetLayout";
import { MeasuredOrthoPreview } from "@/components/MeasuredOrthoPreview";
import { ShadedMeshImage } from "@/components/ShadedMeshImage";
import { HD_GA_ISO } from "@/lib/stepMeshRenderer";
import { generateStepPartDrawingPdf } from "@/lib/stepPartDrawingPdf";
import { Download, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  meshes: MeshData[];
  parts: PartDrawingInfo[];
  drawingNumber: string;
  drawingTitle: string;
  onSelectPart?: (p: PartDrawingInfo) => void;
}

// ─── View label bar ───────────────────────────────────────────────────────────
function ViewLabel({ text }: { text: string }) {
  return (
    <div
      className="shrink-0 px-2 flex items-center"
      style={{
        background: "#1a1a2e",
        color: "#fff",
        fontSize: "6.5px",
        fontWeight: 900,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        height: "14px",
      }}
    >
      {text}
    </div>
  );
}

// ─── BOM table ────────────────────────────────────────────────────────────────
function BomTable({
  parts,
  onSelectPart,
}: {
  parts: PartDrawingInfo[];
  onSelectPart?: (p: PartDrawingInfo) => void;
}) {
  const rows = partsToBomRows(parts);
  return (
    <div className="w-full h-full overflow-hidden bg-white">
      <table className="w-full border-collapse" style={{ fontSize: "5.5px", lineHeight: 1.15 }}>
        <thead>
          <tr style={{ background: "#e2e2e2" }}>
            {WTT_BOM_COLUMNS.map((c) => (
              <th
                key={c.key}
                className="border border-neutral-400 px-0.5 py-px text-left font-black whitespace-nowrap"
                style={{ fontSize: "5.5px" }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={row.sr}
              className={`cursor-pointer hover:bg-sky-50 transition-colors ${
                ri % 2 ? "bg-neutral-50" : "bg-white"
              }`}
              onClick={() => {
                const p = firstPartForBomRow(parts, row);
                if (p) onSelectPart?.(p);
              }}
            >
              <td className="border border-neutral-200 px-0.5 text-center font-bold">{row.sr}</td>
              <td className="border border-neutral-200 px-0.5">{row.description}</td>
              <td className="border border-neutral-200 px-0.5 whitespace-nowrap">{row.size}</td>
              <td className="border border-neutral-200 px-0.5">{row.moc}</td>
              <td className="border border-neutral-200 px-0.5">{row.std}</td>
              <td className="border border-neutral-200 px-0.5">{row.pn}</td>
              <td
                className="border border-neutral-200 px-0.5 max-w-[50px] truncate"
                title={row.type}
              >
                {row.type}
              </td>
              <td className="border border-neutral-200 px-0.5 text-center">
                {row.description === "PIPE" ? "" : row.qty}
              </td>
              <td className="border border-neutral-200 px-0.5 text-right">{row.totalLength}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Title block ──────────────────────────────────────────────────────────────
function TitleBlock({
  drawingNumber,
  drawingTitle,
}: {
  drawingNumber: string;
  drawingTitle: string;
}) {
  const today = new Date();
  const d = `${String(today.getDate()).padStart(2, "0")}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${today.getFullYear()}`;

  return (
    <div
      className="h-full bg-white border border-black flex flex-col overflow-hidden"
      style={{ fontFamily: "monospace" }}
    >
      {/* Company name */}
      <div
        className="shrink-0 border-b border-black px-1 py-0.5 bg-neutral-100 text-center"
        style={{ fontSize: "6.5px", fontWeight: 900 }}
      >
        WTT INTERNATIONAL PVT LTD
      </div>

      {/* DWG No + Title | Signoff */}
      <div className="flex flex-1 min-h-0 border-b border-black">
        <div className="flex-1 flex flex-col border-r border-black px-1 py-0.5 min-w-0">
          <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            DWG No.
          </div>
          <div className="font-black truncate" style={{ fontSize: "6px" }}>
            {drawingNumber}
          </div>
          <div className="border-t border-neutral-300 mt-0.5 pt-0.5">
            <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase" }}>Title</div>
            <div className="truncate" style={{ fontSize: "5.5px", fontWeight: 700 }}>
              {drawingTitle}
            </div>
          </div>
          <div className="border-t border-neutral-300 mt-0.5 pt-0.5">
            <div style={{ fontSize: "4px", color: "#666", fontStyle: "italic" }}>
              NOTE: ALL DIMENSIONS IN mm
            </div>
          </div>
        </div>

        {/* Signoff column */}
        <div className="flex flex-col shrink-0" style={{ width: "38%" }}>
          {[
            ["Drawn by", "AUTO"],
            ["Checked", "—"],
            ["Approved", "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex border-b border-black last:border-b-0 flex-1">
              <div
                className="border-r border-black px-0.5 flex-1"
                style={{ fontSize: "4px", color: "#888", textTransform: "uppercase", paddingTop: "1px" }}
              >
                {l}
              </div>
              <div className="flex-1 px-0.5" style={{ fontSize: "5px", fontWeight: 700, paddingTop: "1px" }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: scale / rev / date / sheet */}
      <div className="flex shrink-0">
        {[
          ["Scale", "1:50"],
          ["Rev", "01"],
          ["Date", d],
          ["Sheet", "1/1"],
        ].map(([l, v]) => (
          <div key={l} className="flex-1 border-r border-black last:border-r-0 px-0.5 py-0.5">
            <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: "5.5px", fontWeight: 900 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zone label grid (border tick marks and numbers/letters) ─────────────────
function ZoneLabels() {
  const colNums = [1, 2, 3, 4, 5, 6];
  const rowLetters = ["A", "B", "C", "D"];

  return (
    <>
      {/* Top numbers */}
      {colNums.map((n, i) => (
        <div
          key={`t${n}`}
          className="absolute pointer-events-none select-none font-bold text-center"
          style={{
            top: "1%",
            left: `${8 + (84 / 6) * i + 84 / 12}%`,
            fontSize: "7px",
            color: "#999",
            transform: "translateX(-50%)",
            lineHeight: 1,
          }}
        >
          {n}
        </div>
      ))}
      {/* Bottom numbers */}
      {colNums.map((n, i) => (
        <div
          key={`b${n}`}
          className="absolute pointer-events-none select-none font-bold text-center"
          style={{
            bottom: "1%",
            left: `${8 + (84 / 6) * i + 84 / 12}%`,
            fontSize: "7px",
            color: "#999",
            transform: "translateX(-50%)",
            lineHeight: 1,
          }}
        >
          {n}
        </div>
      ))}
      {/* Left letters */}
      {rowLetters.map((l, i) => (
        <div
          key={`l${l}`}
          className="absolute pointer-events-none select-none font-bold"
          style={{
            left: "1%",
            top: `${8 + (84 / 4) * i + 84 / 8}%`,
            fontSize: "7px",
            color: "#999",
            lineHeight: 1,
          }}
        >
          {l}
        </div>
      ))}
      {/* Right letters */}
      {rowLetters.map((l, i) => (
        <div
          key={`r${l}`}
          className="absolute pointer-events-none select-none font-bold"
          style={{
            right: "1%",
            top: `${8 + (84 / 4) * i + 84 / 8}%`,
            fontSize: "7px",
            color: "#999",
            lineHeight: 1,
          }}
        >
          {l}
        </div>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FabricationSheetBuilder({
  meshes,
  parts,
  drawingNumber,
  drawingTitle,
  onSelectPart,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const exportPdf = async () => {
    if (!meshes.length) return;
    setExporting(true);
    try {
      const pdf = generateStepPartDrawingPdf(
        `${drawingNumber}.step`,
        meshes,
        null,
      );
      pdf.save(`${drawingNumber}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-muted/40 border-b border-border px-3 py-1.5 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="font-semibold">Front Elevation</span>
          <span className="text-border">·</span>
          <span className="font-semibold">Plan View</span>
          <span className="text-border">·</span>
          <span className="font-semibold">Isometric</span>
          <span className="text-border">·</span>
          <span className="font-semibold">BOM</span>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting || !meshes.length}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow disabled:opacity-50 transition-opacity"
        >
          {exporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          Export PDF
        </button>
      </div>

      {/* ── Sheet area — scrollable background ── */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-300/60 dark:bg-slate-800/60 p-3 flex items-start justify-center">

        {/* A3 sheet (420:297) — fills container maintaining aspect ratio */}
        <div
          ref={sheetRef}
          className="bg-white shadow-2xl relative"
          style={{
            aspectRatio: "420 / 297",
            maxHeight: "100%",
            maxWidth: "calc(100% - 12px)",
            width: "auto",
            border: "2px solid #444",
            fontFamily: "monospace",
          }}
        >
          {/* Outer thin frame */}
          <div className="absolute pointer-events-none z-10"
               style={{ inset: "2%", border: "1.5px solid #000" }} />

          {/* Zone labels on all 4 edges */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <ZoneLabels />
          </div>

          {/* ── Content — inset inside the border ── */}
          <div
            className="absolute flex flex-col"
            style={{ inset: "3%", paddingLeft: "2.5%", paddingTop: "1.5%", paddingRight: "1.5%", paddingBottom: "1%" }}
          >

            {/* ══ MAIN AREA (78% height) ══════════════════════════════════════ */}
            <div className="flex gap-0 border border-black" style={{ flex: "78" }}>

              {/* ── LEFT COLUMN (40%) — Front + Plan stacked ── */}
              <div className="flex flex-col border-r border-black min-h-0" style={{ flex: "40" }}>

                {/* Front Elevation — 57% of left column */}
                <div className="flex flex-col border-b border-black min-h-0" style={{ flex: "57" }}>
                  <ViewLabel text="FRONT VIEW — ALL DIMENSIONS IN mm" />
                  <div className="flex-1 min-h-0 bg-white overflow-hidden">
                    <MeasuredOrthoPreview
                      meshes={meshes}
                      parts={parts}
                      variant="front"
                      className="h-full"
                    />
                  </div>
                </div>

                {/* Plan View — 43% of left column */}
                <div className="flex flex-col min-h-0" style={{ flex: "43" }}>
                  <ViewLabel text="PLAN VIEW (TOP) — ALL DIMENSIONS IN mm" />
                  <div className="flex-1 min-h-0 bg-white overflow-hidden">
                    <MeasuredOrthoPreview
                      meshes={meshes}
                      parts={parts}
                      variant="plan"
                      className="h-full"
                    />
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN (60%) — Large Isometric GA view ── */}
              <div className="flex flex-col min-h-0 relative" style={{ flex: "60" }}>
                <ViewLabel text="ISOMETRIC VIEW" />
                <div className="flex-1 min-h-0 relative bg-white overflow-hidden">
                  <ShadedMeshImage
                    meshes={meshes}
                    parts={parts}
                    gaIso
                    drawingNumber={drawingNumber}
                    drawingTitle={drawingTitle}
                    width={HD_GA_ISO.width}
                    height={HD_GA_ISO.height}
                    pixelRatio={1}
                    className="h-full w-full"
                    alt="Isometric GA view"
                  />
                </div>
              </div>
            </div>

            {/* ══ BOTTOM STRIP (22% height) — BOM + Title Block ══════════════ */}
            <div className="flex shrink-0 border border-t-0 border-black" style={{ flex: "22" }}>

              {/* BOM table */}
              <div className="flex flex-col min-h-0 border-r border-black overflow-hidden" style={{ flex: "3" }}>
                <div
                  className="shrink-0 px-1 flex items-center border-b border-neutral-300"
                  style={{
                    background: "#d4d4d4",
                    fontSize: "6px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    height: "12px",
                  }}
                >
                  BILL OF MATERIALS — NOTE: ALL DIMENSIONS IN mm
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <BomTable parts={parts} onSelectPart={onSelectPart} />
                </div>
              </div>

              {/* Title block */}
              <div className="shrink-0 min-h-0" style={{ width: "26%" }}>
                <TitleBlock drawingNumber={drawingNumber} drawingTitle={drawingTitle} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Re-export legacy constants so other files don't break ────────────────────
export type { Props as FabricationSheetBuilderProps };
export const CANVAS_W = 1188;
export const CANVAS_H = 840;
export const PX_TO_MM = 420 / 1188;
export type PanelId = "front" | "plan" | "iso" | "bom";
export interface PanelRect { x: number; y: number; w: number; h: number; }
