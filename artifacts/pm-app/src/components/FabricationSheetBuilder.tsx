/**
 * FabricationSheetBuilder — Fixed A3 engineering drawing that fills the window.
 * Layout matches WTT drawing standard: Front Elevation (top-left), Plan View
 * (bottom-left), Isometric 3D (right), BOM + Title Block (bottom strip).
 */
import { useState, useEffect, useMemo } from "react";
import type { MeshData } from "@/lib/stepLoader";
import type { PartDrawingInfo } from "@/lib/stepPartDrawing";
import { partsToBomRows, firstPartForBomRow, partBalloonLabels } from "@/lib/stepPartDrawing";
import { renderAssemblyMeasured3dView, HD_MEASURED_VIEW } from "@/lib/stepMeasured3dView";
import { renderAssemblyGaIso, HD_GA_ISO } from "@/lib/stepMeshRenderer";
import { WTT_BOM_COLUMNS } from "@/lib/drawingSheetLayout";
import { generateCustomLayoutPdf } from "@/lib/stepPartDrawingPdf";
import { Download, Loader2, Table2, Box, Layers, Move } from "lucide-react";

// ─── PDF layout constants (A3 landscape, all in mm) ──────────────────────────
// These match the visual proportions so WYSIWYG == PDF

const PDF = {
  pageW: 420, pageH: 297,
  margin: 12,
  innerL: 18, innerT: 16,           // inner area origin (after zone-label margin)
  innerR: 408, innerB: 285,          // inner area end
  get innerW() { return this.innerR - this.innerL; },  // 390
  get innerH() { return this.innerB - this.innerT; },  // 269
  get leftColW() { return Math.round(this.innerW * 0.40); },  // 156
  get rightColW() { return this.innerW - this.leftColW - 2; },// 232
  bottomStripH: 60,
  get mainH() { return this.innerH - this.bottomStripH; },    // 209
  get frontH() { return Math.round(this.mainH * 0.57); },     // 119
  get planH() { return this.mainH - this.frontH - 2; },       // 88
  titleW: 130, titleH: 58,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface RenderedImages { front: string; plan: string; iso: string; }

// ─── BOM table (HTML) ─────────────────────────────────────────────────────────
function BomTable({ parts, onSelectPart }: { parts: PartDrawingInfo[]; onSelectPart?: (p: PartDrawingInfo) => void }) {
  const rows = partsToBomRows(parts);
  return (
    <div className="w-full h-full overflow-auto bg-white">
      <table className="w-full border-collapse" style={{ fontSize: "6.5px", lineHeight: 1.2 }}>
        <thead>
          <tr style={{ background: "#e8e8e8" }}>
            {WTT_BOM_COLUMNS.map(c => (
              <th key={c.key} className="border border-neutral-400 px-0.5 py-0.5 text-left font-black whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.sr}
              className={`cursor-pointer hover:bg-sky-50 transition-colors ${ri % 2 ? "bg-neutral-50" : "bg-white"}`}
              onClick={() => { const p = firstPartForBomRow(parts, row); if (p) onSelectPart?.(p); }}>
              <td className="border border-neutral-200 px-0.5 text-center font-bold">{row.sr}</td>
              <td className="border border-neutral-200 px-0.5">{row.description}</td>
              <td className="border border-neutral-200 px-0.5 whitespace-nowrap">{row.size}</td>
              <td className="border border-neutral-200 px-0.5">{row.moc}</td>
              <td className="border border-neutral-200 px-0.5">{row.std}</td>
              <td className="border border-neutral-200 px-0.5">{row.pn}</td>
              <td className="border border-neutral-200 px-0.5 max-w-[50px] truncate" title={row.type}>{row.type}</td>
              <td className="border border-neutral-200 px-0.5 text-center">{row.description === "PIPE" ? "" : row.qty}</td>
              <td className="border border-neutral-200 px-0.5 text-right">{row.totalLength}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Panel header bar ─────────────────────────────────────────────────────────
function PanelHeader({ label, bg = "#1a1a2e" }: { label: string; bg?: string }) {
  return (
    <div className="shrink-0 px-2 py-0.5 flex items-center"
         style={{ background: bg, color: "#fff", fontSize: "7px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      {label}
    </div>
  );
}

// ─── Image panel ──────────────────────────────────────────────────────────────
function ViewPanel({ src, label, bg }: { src: string | null; label: string; bg?: string }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden h-full border border-neutral-300 bg-white">
      <PanelHeader label={label} bg={bg} />
      <div className="flex-1 min-h-0 bg-white overflow-hidden flex items-center justify-center">
        {src
          ? <img src={src} className="w-full h-full object-contain" draggable={false} alt={label} />
          : <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />}
      </div>
    </div>
  );
}

// ─── Title block ──────────────────────────────────────────────────────────────
function TitleBlock({ drawingNumber, drawingTitle }: { drawingNumber: string; drawingTitle: string }) {
  const today = new Date();
  const d = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
  return (
    <div className="h-full bg-white border border-black flex flex-col overflow-hidden" style={{ fontFamily: "monospace" }}>
      {/* Company name */}
      <div className="border-b border-black px-1 py-0.5 bg-neutral-100 shrink-0 text-center" style={{ fontSize: "7px", fontWeight: 900 }}>
        WTT INTERNATIONAL PVT LTD
      </div>
      {/* DWG No + Title */}
      <div className="flex flex-1 min-h-0 border-b border-black">
        <div className="flex-1 flex flex-col border-r border-black px-1 py-0.5 min-w-0">
          <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>DWG No.</div>
          <div className="font-black truncate" style={{ fontSize: "6px" }}>{drawingNumber}</div>
          <div className="border-t border-neutral-300 mt-0.5 pt-0.5">
            <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase" }}>Title</div>
            <div className="truncate" style={{ fontSize: "5.5px", fontWeight: 700 }}>{drawingTitle}</div>
          </div>
        </div>
        {/* Signoff column */}
        <div className="flex flex-col shrink-0" style={{ width: "40%" }}>
          {[["Drawn","AUTO"],["Checked","—"],["Approved","—"]].map(([l, v]) => (
            <div key={l} className="flex border-b border-black last:border-b-0 flex-1">
              <div className="border-r border-black px-0.5 flex-1" style={{ fontSize: "4px", color: "#888", textTransform: "uppercase", paddingTop: "1px" }}>{l}</div>
              <div className="flex-1 px-0.5" style={{ fontSize: "5px", fontWeight: 700, paddingTop: "1px" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Footer: scale / rev / date / sheet */}
      <div className="flex shrink-0">
        {[["Scale","NTS"],["Rev","01"],["Date",d],["Sheet","1/1"]].map(([l, v]) => (
          <div key={l} className="flex-1 border-r border-black last:border-r-0 px-0.5 py-0.5">
            <div style={{ fontSize: "4px", color: "#888", textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: "5.5px", fontWeight: 900 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zone label row / column helpers ─────────────────────────────────────────
function ZoneLabels() {
  return (
    <>
      {/* Column numbers: 1–6 along the top */}
      {[1,2,3,4,5,6].map((n, i) => (
        <div key={`col${n}`} className="absolute top-0 text-center pointer-events-none select-none font-bold"
             style={{ left: `${8 + (84/6) * i + 84/12}%`, fontSize: "6px", color: "#aaa", transform: "translateX(-50%)" }}>
          {n}
        </div>
      ))}
      {/* Row letters: A–D along the left */}
      {["A","B","C","D"].map((l, i) => (
        <div key={`row${l}`} className="absolute left-0 pointer-events-none select-none font-bold"
             style={{ top: `${8 + (84/4) * i + 84/8}%`, fontSize: "6px", color: "#aaa", lineHeight: 1 }}>
          {l}
        </div>
      ))}
      {/* Column numbers along the bottom */}
      {[1,2,3,4,5,6].map((n, i) => (
        <div key={`colB${n}`} className="absolute bottom-0 text-center pointer-events-none select-none font-bold"
             style={{ left: `${8 + (84/6) * i + 84/12}%`, fontSize: "6px", color: "#aaa", transform: "translateX(-50%)" }}>
          {n}
        </div>
      ))}
      {/* Row letters along the right */}
      {["A","B","C","D"].map((l, i) => (
        <div key={`rowR${l}`} className="absolute right-0 pointer-events-none select-none font-bold"
             style={{ top: `${8 + (84/4) * i + 84/8}%`, fontSize: "6px", color: "#aaa", lineHeight: 1 }}>
          {l}
        </div>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  meshes: MeshData[];
  parts: PartDrawingInfo[];
  drawingNumber: string;
  drawingTitle: string;
  onSelectPart?: (p: PartDrawingInfo) => void;
}

export function FabricationSheetBuilder({ meshes, parts, drawingNumber, drawingTitle, onSelectPart }: Props) {
  const [images, setImages] = useState<RenderedImages | null>(null);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pre-render all views once
  useEffect(() => {
    if (!meshes.length || !parts.length) return;
    setRendering(true);
    const timer = setTimeout(() => {
      try {
        const balloons = partBalloonLabels(parts, partsToBomRows(parts));
        const front = renderAssemblyMeasured3dView(meshes, parts, "front", HD_MEASURED_VIEW);
        const plan  = renderAssemblyMeasured3dView(meshes, parts, "top",   HD_MEASURED_VIEW);
        const iso   = renderAssemblyGaIso(meshes, parts, {
          ...HD_GA_ISO,
          showBalloons: parts.length > 0 && parts.length <= 30,
          balloonLabels: balloons,
          drawingNumber,
          drawingTitle,
        });
        setImages({ front, plan, iso });
      } finally {
        setRendering(false);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [meshes, parts, drawingNumber, drawingTitle]);

  // ── PDF panels in mm (fixed A3 positions) ──────────────────────────────────
  const pdfPanels = useMemo(() => ({
    front: { x: PDF.innerL, y: PDF.innerT,                      w: PDF.leftColW, h: PDF.frontH,     visible: true },
    plan:  { x: PDF.innerL, y: PDF.innerT + PDF.frontH + 2,     w: PDF.leftColW, h: PDF.planH,      visible: true },
    iso:   { x: PDF.innerL + PDF.leftColW + 2, y: PDF.innerT,   w: PDF.rightColW, h: PDF.mainH,     visible: true },
    bom:   { x: PDF.innerL, y: PDF.innerT + PDF.mainH + 4,      w: PDF.innerW - PDF.titleW - 4, h: PDF.bottomStripH, visible: true },
  }), []);

  const captureAsPdf = async () => {
    if (!images) return;
    setExporting(true);
    try {
      await generateCustomLayoutPdf({ drawingNumber, drawingTitle, panels: pdfPanels, images, parts });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-muted/40 border-b border-border px-3 py-1.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Box className="w-3 h-3 text-[#1a1a2e]" /><span className="font-semibold">Front Elevation</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Layers className="w-3 h-3 text-[#1a2e1a]" /><span className="font-semibold">Plan View</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Move className="w-3 h-3 text-[#1e1a2e]" /><span className="font-semibold">Isometric</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Table2 className="w-3 h-3 text-[#2e1a1a]" /><span className="font-semibold">BOM</span>
          </div>
        </div>

        <div className="flex-1" />

        {rendering && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />Rendering views…
          </span>
        )}

        <button type="button" onClick={captureAsPdf} disabled={exporting || !images}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow disabled:opacity-50 transition-opacity">
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          Export PDF
        </button>
      </div>

      {/* ── Sheet area ── */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-300/60 dark:bg-slate-800/60 p-3 flex items-start justify-center">

        {/* A3 sheet — fills available space maintaining 420:297 aspect ratio */}
        <div className="bg-white shadow-2xl relative flex flex-col"
             style={{
               aspectRatio: "420 / 297",
               maxHeight: "100%",
               maxWidth: "calc(100% - 12px)",
               width: "auto",
               border: "1px solid #555",
             }}>

          {/* Inner border (engineering drawing style) */}
          <div className="absolute inset-[2.5%] border border-black border-[1.5px] pointer-events-none z-10" />

          {/* Zone labels */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <ZoneLabels />
          </div>

          {/* Content grid — fills the sheet inside the inner border */}
          <div className="absolute flex flex-col"
               style={{ inset: "2.5%", paddingLeft: "2%", paddingTop: "1.5%", paddingRight: "1%", paddingBottom: "1%" }}>

            {/* ── Top main area (flex: 1) ── */}
            <div className="flex-1 min-h-0 flex gap-[0.5%]">

              {/* Left column: Front + Plan stacked */}
              <div className="flex flex-col gap-[0.8%] min-h-0" style={{ flex: "4" }}>
                {/* Front Elevation — 57% of left col height */}
                <div style={{ flex: "57" }} className="min-h-0">
                  <ViewPanel src={images?.front ?? null} label="FRONT VIEW — ALL DIMENSIONS IN mm" bg="#1a1a2e" />
                </div>
                {/* Plan View — 43% */}
                <div style={{ flex: "43" }} className="min-h-0">
                  <ViewPanel src={images?.plan ?? null} label="PLAN VIEW (TOP) — ALL DIMENSIONS IN mm" bg="#1a2e1a" />
                </div>
              </div>

              {/* Right column: ISO view */}
              <div className="min-h-0" style={{ flex: "6" }}>
                <ViewPanel src={images?.iso ?? null} label="ISOMETRIC VIEW" bg="#1e1a2e" />
              </div>
            </div>

            {/* ── Bottom strip: BOM + Title Block ── */}
            <div className="flex gap-[0.5%] shrink-0" style={{ height: "22%" }}>

              {/* BOM table */}
              <div className="flex flex-col min-h-0 border border-neutral-300 overflow-hidden" style={{ flex: "3" }}>
                <PanelHeader label="BILL OF MATERIALS  —  NOTE: ALL DIMENSIONS IN mm" bg="#2e1a1a" />
                <div className="flex-1 min-h-0 overflow-auto bg-white">
                  <BomTable parts={parts} onSelectPart={onSelectPart} />
                </div>
              </div>

              {/* Title block */}
              <div className="shrink-0 min-h-0" style={{ width: "24%" }}>
                <TitleBlock drawingNumber={drawingNumber} drawingTitle={drawingTitle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep exports for backward compat
export type { Props as FabricationSheetBuilderProps };
export const CANVAS_W = 1188;
export const CANVAS_H = 840;
export const PX_TO_MM = 420 / 1188;
export type PanelId = "front" | "plan" | "iso" | "bom";
export interface PanelRect { x: number; y: number; w: number; h: number; }
