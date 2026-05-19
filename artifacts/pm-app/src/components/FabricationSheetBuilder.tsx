/**
 * FabricationSheetBuilder — drag-and-drop A3 layout builder.
 * Each panel (Front View, Plan View, Isometric, BOM) can be freely dragged
 * and resized on the canvas.  "Capture PDF" renders the current layout to PDF.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import type { MeshData } from "@/lib/stepLoader";
import type { PartDrawingInfo } from "@/lib/stepPartDrawing";
import { partsToBomRows, firstPartForBomRow, partBalloonLabels } from "@/lib/stepPartDrawing";
import { renderAssemblyMeasured3dView, HD_MEASURED_VIEW } from "@/lib/stepMeasured3dView";
import { renderAssemblyGaIso, HD_GA_ISO } from "@/lib/stepMeshRenderer";
import { WTT_BOM_COLUMNS } from "@/lib/drawingSheetLayout";
import { generateCustomLayoutPdf } from "@/lib/stepPartDrawingPdf";
import {
  GripHorizontal, Eye, EyeOff, RotateCcw, Download, Loader2,
  Layers, Table2, Box, Maximize2, Move,
} from "lucide-react";

// ─── Canvas constants (A3 landscape ratio) ───────────────────────────────────
export const CANVAS_W = 1188;
export const CANVAS_H = 840;
export const PX_TO_MM = 420 / CANVAS_W;   // ~0.354 mm per canvas pixel
const MARGIN_PX = 24;                       // sheet margin in pixels

// ─── Types ────────────────────────────────────────────────────────────────────
export type PanelId = "front" | "plan" | "iso" | "bom";

export interface PanelRect { x: number; y: number; w: number; h: number; }

const DEFAULT_PANELS: Record<PanelId, PanelRect> = {
  front: { x: MARGIN_PX,       y: MARGIN_PX,               w: 700, h: 444 },
  plan:  { x: MARGIN_PX,       y: MARGIN_PX + 444 + 6,     w: 700, h: 326 },
  iso:   { x: MARGIN_PX + 706, y: MARGIN_PX + 300 + 6,     w: 432, h: 464 },
  bom:   { x: MARGIN_PX + 706, y: MARGIN_PX,               w: 432, h: 294 },
};

const PANEL_META: Record<PanelId, { label: string; icon: React.ReactNode; color: string }> = {
  front: { label: "FRONT VIEW",      icon: <Box className="w-3 h-3" />,    color: "#1a1a2e" },
  plan:  { label: "PLAN VIEW (TOP)", icon: <Layers className="w-3 h-3" />, color: "#1a2e1a" },
  iso:   { label: "ISOMETRIC VIEW",  icon: <Move className="w-3 h-3" />,   color: "#1e1a2e" },
  bom:   { label: "BILL OF MATERIALS", icon: <Table2 className="w-3 h-3" />, color: "#2e1a1a" },
};

const MIN_W = 120;
const MIN_H = 80;

// ─── Rendered images cache ────────────────────────────────────────────────────
interface RenderedImages { front: string; plan: string; iso: string; }

// ─── Drag/resize state held in a ref (not state — avoids re-render storm) ────
interface DragState {
  type: "move" | "resize";
  panelId: PanelId;
  startMouseX: number;
  startMouseY: number;
  startPanelX: number;
  startPanelY: number;
  startW: number;
  startH: number;
}

// ─── BOM HTML table for display ──────────────────────────────────────────────
function BomTable({ parts, onSelectPart }: {
  parts: PartDrawingInfo[];
  onSelectPart?: (p: PartDrawingInfo) => void;
}) {
  const rows = partsToBomRows(parts);
  return (
    <div className="h-full overflow-auto bg-white text-[6.5px]">
      <table className="w-full border-collapse" style={{ minWidth: "100%" }}>
        <thead>
          <tr className="bg-neutral-200">
            {WTT_BOM_COLUMNS.map(c => (
              <th key={c.key} className="border border-neutral-400 px-0.5 py-0.5 text-left font-black whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.sr}
              className={`cursor-pointer hover:bg-sky-50 ${ri % 2 ? "bg-neutral-50" : ""}`}
              onClick={() => { const p = firstPartForBomRow(parts, row); if (p) onSelectPart?.(p); }}>
              <td className="border border-neutral-200 px-0.5 text-center font-bold">{row.sr}</td>
              <td className="border border-neutral-200 px-0.5">{row.description}</td>
              <td className="border border-neutral-200 px-0.5">{row.size}</td>
              <td className="border border-neutral-200 px-0.5">{row.moc}</td>
              <td className="border border-neutral-200 px-0.5">{row.std}</td>
              <td className="border border-neutral-200 px-0.5">{row.pn}</td>
              <td className="border border-neutral-200 px-0.5 max-w-[60px] truncate" title={row.type}>{row.type}</td>
              <td className="border border-neutral-200 px-0.5 text-center">{row.description === "PIPE" ? "" : row.qty}</td>
              <td className="border border-neutral-200 px-0.5 text-right">{row.totalLength}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Title block (always rendered at fixed position, not draggable) ──────────
function TitleBlock({ drawingNumber, drawingTitle }: { drawingNumber: string; drawingTitle: string }) {
  const today = new Date();
  const d = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
  return (
    <div className="absolute bg-white border-t border-l border-black font-mono"
         style={{ right: MARGIN_PX, bottom: MARGIN_PX, width: 300, fontSize: 6, lineHeight: 1.3 }}>
      <div className="border-b border-black px-1 py-0.5 bg-neutral-100">
        <span className="font-black" style={{ fontSize: 8 }}>WTT INTERNATIONAL PVT LTD</span>
      </div>
      <div className="flex">
        <div className="flex-1 border-r border-black min-w-0">
          <div className="border-b border-black px-1 py-0.5">
            <div className="text-neutral-400 uppercase tracking-wide" style={{fontSize:5}}>DWG No.</div>
            <div className="font-black truncate" style={{fontSize:7}}>{drawingNumber}</div>
          </div>
          <div className="px-1 py-0.5">
            <div className="text-neutral-400 uppercase tracking-wide" style={{fontSize:5}}>Title</div>
            <div className="font-semibold truncate">{drawingTitle}</div>
          </div>
        </div>
        <div className="flex flex-col" style={{minWidth:80}}>
          {[["Drawn by","AUTO / STEP"],["Checked","—"],["Approved","—"]].map(([l,v]) => (
            <div key={l} className="flex border-b border-black last:border-b-0">
              <div className="border-r border-black px-1 py-0.5 text-neutral-400 flex-1 uppercase" style={{fontSize:4}}>{l}</div>
              <div className="px-1 py-0.5 flex-1 font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-black flex">
        {[["SCALE","NTS"],["REV","01"],["DATE",d],["SHEET","1 OF 1"]].map(([l,v]) => (
          <div key={l} className="flex-1 border-r border-black last:border-r-0 px-1 py-0.5">
            <div className="text-neutral-400 uppercase" style={{fontSize:4}}>{l}</div>
            <div className="font-black" style={{fontSize:6}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
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
  const [panels, setPanels] = useState<Record<PanelId, PanelRect>>(DEFAULT_PANELS);
  const [visible, setVisible] = useState<Record<PanelId, boolean>>({ front: true, plan: true, iso: true, bom: true });
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [images, setImages] = useState<RenderedImages | null>(null);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  // ── Pre-render all view images when assembly loads ──
  useEffect(() => {
    if (!meshes.length || !parts.length) return;
    setRendering(true);
    // Defer to next frame so UI can update first
    setTimeout(() => {
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
    }, 50);
  }, [meshes, parts, drawingNumber, drawingTitle]);

  // ── Pointer events for drag/resize ──────────────────────────────────────────
  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const { type, panelId, startMouseX, startMouseY, startPanelX, startPanelY, startW, startH } = drag.current;
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;

    setPanels(prev => {
      const p = { ...prev[panelId] };
      if (type === "move") {
        p.x = Math.max(0, Math.min(CANVAS_W - p.w, startPanelX + dx));
        p.y = Math.max(0, Math.min(CANVAS_H - p.h, startPanelY + dy));
      } else {
        p.w = Math.max(MIN_W, startW + dx);
        p.h = Math.max(MIN_H, startH + dy);
      }
      return { ...prev, [panelId]: p };
    });
  }, []);

  const onCanvasPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const startMove = useCallback((e: React.PointerEvent, panelId: PanelId) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePanel(panelId);
    const p = panels[panelId];
    drag.current = {
      type: "move",
      panelId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startPanelX: p.x, startPanelY: p.y,
      startW: p.w, startH: p.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [panels]);

  const startResize = useCallback((e: React.PointerEvent, panelId: PanelId) => {
    e.preventDefault();
    e.stopPropagation();
    const p = panels[panelId];
    drag.current = {
      type: "resize",
      panelId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startPanelX: p.x, startPanelY: p.y,
      startW: p.w, startH: p.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [panels]);

  // ── Reset layout ─────────────────────────────────────────────────────────────
  const resetLayout = () => {
    setPanels(DEFAULT_PANELS);
    setVisible({ front: true, plan: true, iso: true, bom: true });
  };

  // ── PDF export ────────────────────────────────────────────────────────────────
  const captureAsPdf = async () => {
    if (!images) return;
    setExporting(true);
    try {
      await generateCustomLayoutPdf({
        drawingNumber,
        drawingTitle,
        panels: Object.fromEntries(
          (Object.entries(panels) as [PanelId, PanelRect][]).map(([id, r]) => [
            id,
            {
              x: r.x * PX_TO_MM,
              y: r.y * PX_TO_MM,
              w: r.w * PX_TO_MM,
              h: r.h * PX_TO_MM,
              visible: visible[id as PanelId],
            },
          ])
        ) as Record<PanelId, { x: number; y: number; w: number; h: number; visible: boolean }>,
        images,
        parts,
      });
    } finally {
      setExporting(false);
    }
  };

  // ── Panel content renderer ────────────────────────────────────────────────────
  function renderPanelContent(id: PanelId) {
    if (id === "bom") {
      return <BomTable parts={parts} onSelectPart={onSelectPart} />;
    }
    const src = images ? (id === "front" ? images.front : id === "plan" ? images.plan : images.iso) : null;
    if (!src) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      );
    }
    return <img src={src} className="w-full h-full object-contain bg-white" draggable={false} alt={id} />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 bg-muted/40 border-b border-border px-3 py-1.5 flex items-center gap-2 flex-wrap">
        {/* Panel visibility toggles */}
        <div className="flex items-center gap-1">
          {(Object.entries(PANEL_META) as [PanelId, (typeof PANEL_META)[PanelId]][]).map(([id, m]) => (
            <button key={id} type="button"
              onClick={() => setVisible(v => ({ ...v, [id]: !v[id] }))}
              title={`${visible[id] ? "Hide" : "Show"} ${m.label}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                visible[id]
                  ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
                  : "border-border bg-muted text-muted-foreground"
              }`}>
              {visible[id] ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
              {m.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <button type="button" onClick={resetLayout}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-border bg-background hover:border-sky-400 hover:text-sky-600 transition-colors">
          <RotateCcw className="w-2.5 h-2.5" />Reset Layout
        </button>

        <div className="flex-1" />

        {rendering && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />Rendering views…
          </span>
        )}

        <span className="text-[10px] text-muted-foreground">Drag panel headers · Drag corners to resize</span>

        <button type="button" onClick={captureAsPdf} disabled={exporting || !images}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow disabled:opacity-50 transition-opacity">
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          Capture PDF
        </button>
      </div>

      {/* ── Sheet canvas ── */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-400/50 dark:bg-slate-900/70 p-6">
        {/* A3 sheet */}
        <div
          ref={canvasRef}
          className="relative bg-white shadow-2xl border border-black mx-auto select-none"
          style={{ width: CANVAS_W, height: CANVAS_H, flexShrink: 0 }}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerLeave={onCanvasPointerUp}
        >
          {/* Sheet inner border */}
          <div className="absolute pointer-events-none border-2 border-black"
            style={{ inset: MARGIN_PX - 2 }} />

          {/* Sheet zone labels */}
          {["A","B","C","D"].map((l, i) => (
            <div key={l} className="absolute text-[8px] font-bold text-neutral-300 pointer-events-none"
              style={{ top: 6, left: MARGIN_PX + (CANVAS_W - MARGIN_PX*2) * i / 4 + (CANVAS_W - MARGIN_PX*2) / 8, transform: "translateX(-50%)" }}>
              {l}
            </div>
          ))}
          {[1,2,3,4].map((n, i) => (
            <div key={n} className="absolute text-[8px] font-bold text-neutral-300 pointer-events-none"
              style={{ left: 6, top: MARGIN_PX + (CANVAS_H - MARGIN_PX*2) * i / 4 + (CANVAS_H - MARGIN_PX*2) / 8 - 5 }}>
              {n}
            </div>
          ))}

          {/* Draggable panels */}
          {(Object.entries(panels) as [PanelId, PanelRect][]).map(([id, rect]) => {
            if (!visible[id]) return null;
            const meta = PANEL_META[id];
            const isActive = activePanel === id;
            return (
              <div
                key={id}
                className={`absolute flex flex-col border overflow-hidden transition-shadow ${
                  isActive ? "shadow-xl border-sky-500 z-20" : "border-neutral-400 z-10 shadow-md"
                }`}
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                onPointerDown={() => setActivePanel(id)}
              >
                {/* Panel header — drag handle */}
                <div
                  className="shrink-0 flex items-center gap-1.5 px-2 py-1 cursor-move select-none"
                  style={{ background: meta.color, color: "#fff" }}
                  onPointerDown={e => startMove(e, id)}
                >
                  <GripHorizontal className="w-3 h-3 opacity-60" />
                  <span className="text-[9px] font-black uppercase tracking-widest flex-1">{meta.label}</span>
                  <button
                    type="button"
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => setVisible(v => ({ ...v, [id]: false }))}
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderPanelContent(id)}
                </div>

                {/* Resize handle — bottom-right corner */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-30"
                  style={{ background: "rgba(0,0,0,0.18)", borderTopLeftRadius: 4 }}
                  onPointerDown={e => startResize(e, id)}
                >
                  <div className="absolute bottom-0.5 right-0.5 w-2 h-2 grid grid-cols-2 gap-px">
                    {[0,1,2,3].map(i => <div key={i} className="bg-white/70 rounded-[1px]" />)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Title block — always at bottom-right, not draggable */}
          <TitleBlock drawingNumber={drawingNumber} drawingTitle={drawingTitle} />
        </div>
      </div>
    </div>
  );
}
