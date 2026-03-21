import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { runNesting, Part, NestingResult, PlacedPart, PART_COLORS } from "@/lib/nestingAlgorithm";
import { parseDxfFile, parseSvgFile, analyzeDwgFile, DwgAnalysis, SuggestedPart } from "@/lib/dxfParser";
import {
  Upload, Plus, Trash2, Play, Download, ChevronLeft, ChevronRight,
  RotateCw, AlertTriangle, CheckCircle, Layers, Package,
  FileText, Settings2, ZoomIn, ZoomOut, Maximize2, X, FileX,
  Grid, Ruler, PanelLeft, PanelRight,
  RefreshCw, Copy, ArrowRight, Search, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DwgPartEntry extends SuggestedPart {
  selected: boolean;
  color?: string;
}

function DwgAnalysisDialog({ analysis, onConfirm, onCancel, nextColor }: {
  analysis: DwgAnalysis;
  onConfirm: (parts: DwgPartEntry[]) => void;
  onCancel: () => void;
  nextColor: (i: number) => string;
}) {
  const [parts, setParts] = useState<DwgPartEntry[]>(() =>
    analysis.suggestedParts.map((p, i) => ({ ...p, selected: true, color: nextColor(i) }))
  );
  const [activeTab, setActiveTab] = useState<"parts" | "analysis">("parts");
  const [material, setMaterial] = useState(analysis.materialType);
  const [thickness, setThickness] = useState(analysis.thickness);

  const update = (i: number, c: Partial<DwgPartEntry>) =>
    setParts(l => l.map((e, j) => j === i ? { ...e, ...c } : e));

  const addRow = () => setParts(l => [...l, {
    name: `Part ${l.length + 1}`, width: 100, height: 100, quantity: 1,
    source: "Manual", confidence: "low", selected: true, color: nextColor(l.length),
  }]);

  const selectedCount = parts.filter(p => p.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="nm-bg-card border nm-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b nm-border flex-shrink-0">
          <div>
            <h2 className="nm-text-main font-bold text-base flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> DWG Drawing Analysis
            </h2>
            <p className="nm-text-muted text-xs mt-0.5 font-mono">{analysis.fileName} · {analysis.versionName} · {(analysis.fileSize / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={onCancel} className="nm-text-muted hover:nm-text-main p-1"><X size={18} /></button>
        </div>

        {/* Detected info bar */}
        <div className="px-5 py-3 nm-bg-page border-b nm-border flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Drawing No.", value: analysis.drawingNumber || "—", highlight: !!analysis.drawingNumber },
              { label: "Title", value: analysis.drawingTitle || "—", highlight: !!analysis.drawingTitle },
              { label: "Material", value: material || "—", editable: true, onChange: setMaterial },
              { label: "Thickness", value: thickness || "—", editable: true, onChange: setThickness },
            ].map(({ label, value, highlight, editable, onChange }) => (
              <div key={label} className={cn("rounded-lg px-3 py-2 border", highlight || editable ? "nm-bg-card nm-border" : "nm-bg-page nm-border")}>
                <div className="text-xs nm-text-muted mb-0.5">{label}</div>
                {editable ? (
                  <input value={value} onChange={e => onChange?.(e.target.value)}
                    className="bg-transparent nm-text-main text-xs font-medium w-full focus:outline-none" />
                ) : (
                  <div className={cn("text-xs font-medium truncate", highlight ? "text-indigo-500 dark:text-indigo-400" : "nm-text-sub")}>{value}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {(["parts", "analysis"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize",
                activeTab === t ? "bg-indigo-600 text-white" : "nm-bg-page nm-border border nm-text-sub nm-bg-hover"
              )}>
              {t === "parts" ? `Parts to Import (${selectedCount})` : "Drawing Analysis"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {activeTab === "parts" && (
            <div className="space-y-2">
              {analysis.detectedDimensions.length > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Search size={12} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Detected {analysis.detectedDimensions.length} dimension(s) in drawing: </span>
                    {analysis.detectedDimensions.slice(0, 6).map(d => (
                      <span key={d.raw} className="inline-block px-1.5 py-0.5 bg-amber-500/20 rounded font-mono mr-1 mb-0.5">{d.width}×{d.height}</span>
                    ))}
                    {analysis.detectedDimensions.length > 6 && <span>+{analysis.detectedDimensions.length - 6} more</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[auto_1fr_80px_80px_60px_auto] gap-x-2 gap-y-0.5 text-xs nm-text-muted px-1 mb-1">
                <span></span><span>Part Name</span><span>Width (mm)</span><span>Height (mm)</span><span>Qty</span><span></span>
              </div>

              {parts.map((p, i) => (
                <div key={i} className={cn(
                  "grid grid-cols-[auto_1fr_80px_80px_60px_auto] gap-x-2 items-center rounded-lg px-2 py-2 border transition",
                  p.selected ? "nm-bg-page nm-border" : "nm-bg-page border-transparent opacity-40"
                )}>
                  <input type="checkbox" checked={p.selected} onChange={e => update(i, { selected: e.target.checked })}
                    className="rounded w-3.5 h-3.5 cursor-pointer accent-indigo-500" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <input type="color" value={p.color ?? "#6366f1"} onChange={e => update(i, { color: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0" style={{ WebkitAppearance: "none" }} />
                    <input value={p.name} onChange={e => update(i, { name: e.target.value })}
                      className="flex-1 bg-transparent nm-text-main text-xs font-medium focus:outline-none min-w-0" />
                    <span className={cn("text-xs px-1 py-0.5 rounded flex-shrink-0", {
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400": p.confidence === "high",
                      "bg-amber-500/15 text-amber-600 dark:text-amber-400": p.confidence === "medium",
                      "bg-slate-500/15 nm-text-muted": p.confidence === "low",
                    })}>{p.confidence}</span>
                  </div>
                  <input type="number" value={p.width} min={1} onChange={e => update(i, { width: Number(e.target.value) })}
                    className="nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                  <input type="number" value={p.height} min={1} onChange={e => update(i, { height: Number(e.target.value) })}
                    className="nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                  <input type="number" value={p.quantity} min={1} onChange={e => update(i, { quantity: Math.max(1, Number(e.target.value)) })}
                    className="nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                  <button onClick={() => setParts(l => l.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-500 p-0.5 flex-shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}

              <button onClick={addRow}
                className="w-full flex items-center justify-center gap-1.5 py-2 nm-bg-page border border-dashed nm-border nm-text-sub nm-bg-hover rounded-lg text-xs transition mt-1">
                <Plus size={12} /> Add part manually
              </button>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <FileX size={12} className="mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Tip:</span> DWG binary geometry cannot be auto-extracted in the browser.
                  For best results, <span className="font-semibold">export from AutoCAD as DXF</span> (File → Save As → AutoCAD DXF) — parts will be extracted automatically.
                </div>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="space-y-3 text-xs">
              {analysis.detectedDimensions.length > 0 && (
                <div>
                  <div className="nm-text-muted font-semibold uppercase tracking-wider mb-1.5">Detected Dimensions ({analysis.detectedDimensions.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detectedDimensions.map((d, i) => (
                      <button key={i} onClick={() => {
                        // Add as a new part row
                        setParts(l => [...l, { name: `Part ${l.length + 1}`, width: d.width, height: d.height, quantity: 1, source: d.raw, confidence: "medium", selected: true, color: nextColor(l.length) }]);
                        setActiveTab("parts");
                      }}
                        className="px-2 py-1 nm-bg-page border nm-border rounded-lg nm-text-main nm-bg-hover flex items-center gap-1">
                        <span className="font-mono">{d.width}×{d.height}</span>
                        <span className="nm-text-muted text-xs">mm</span>
                        <Plus size={9} className="text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {analysis.layerNames.length > 0 && (
                <div>
                  <div className="nm-text-muted font-semibold uppercase tracking-wider mb-1.5">Layer Names ({analysis.layerNames.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.layerNames.map(l => (
                      <span key={l} className="px-1.5 py-0.5 nm-bg-page border nm-border rounded text-xs nm-text-sub font-mono">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.textStrings.length > 0 && (
                <div>
                  <div className="nm-text-muted font-semibold uppercase tracking-wider mb-1.5">Extracted Text Strings</div>
                  <div className="nm-bg-page border nm-border rounded-lg p-2 max-h-40 overflow-y-auto">
                    {analysis.textStrings.map((s, i) => (
                      <div key={i} className="text-xs nm-text-sub font-mono py-0.5 border-b nm-border last:border-0 truncate">{s}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t nm-border flex-shrink-0">
          <span className="text-xs nm-text-muted">{selectedCount} part{selectedCount !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 nm-text-sub hover:nm-text-main text-sm">Cancel</button>
            <button
              onClick={() => onConfirm(parts.filter(p => p.selected))}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
              Import {selectedCount} Part{selectedCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SHEET_PRESETS = [
  { label: "A4 (210×297)", width: 210, height: 297 },
  { label: "A3 (297×420)", width: 297, height: 420 },
  { label: "A2 (420×594)", width: 420, height: 594 },
  { label: "A1 (594×841)", width: 594, height: 841 },
  { label: "A0 (841×1189)", width: 841, height: 1189 },
  { label: "4×8 ft (1220×2440)", width: 1220, height: 2440 },
  { label: "5×10 ft (1524×3048)", width: 1524, height: 3048 },
  { label: "4×4 ft (1220×1220)", width: 1220, height: 1220 },
  { label: "Custom", width: 0, height: 0 },
];

let partCounter = 0;
function newPart(): Part {
  partCounter++;
  return {
    id: `p-${partCounter}-${Date.now()}`,
    name: `Part ${partCounter}`,
    width: 100,
    height: 80,
    quantity: 1,
    color: PART_COLORS[(partCounter - 1) % PART_COLORS.length],
    allowRotation: true,
    grainDirection: "none",
  };
}

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

interface CanvasProps {
  sheet: { width: number; height: number; placedParts: PlacedPart[] };
  selectedPartId: string | null;
  onSelect: (id: string | null) => void;
  showGrid: boolean;
  showRulers: boolean;
}

function SheetCanvas({ sheet, selectedPartId, onSelect, showGrid, showRulers }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPart, setHoveredPart] = useState<PlacedPart | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isDark = useIsDark();
  const RULER = showRulers ? 24 : 0;

  const fitScale = useCallback(() => {
    if (!containerRef.current) return 1;
    const { clientWidth, clientHeight } = containerRef.current;
    const usable = { w: clientWidth - RULER - 48, h: clientHeight - RULER - 48 };
    return Math.min(usable.w / sheet.width, usable.h / sheet.height, 4);
  }, [sheet.width, sheet.height, RULER]);

  const resetView = useCallback(() => {
    setZoom(fitScale());
    setPan({ x: 0, y: 0 });
  }, [fitScale]);

  useEffect(() => { resetView(); }, [resetView, sheet]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    const colors = {
      bg: isDark ? "#0f1117" : "#f1f5f9",
      ruler: isDark ? "#1e2030" : "#e2e8f0",
      rulerText: isDark ? "#64748b" : "#94a3b8",
      rulerTick: isDark ? "#334155" : "#cbd5e1",
      sheetBg: "#ffffff",
      sheetBorder: isDark ? "#475569" : "#94a3b8",
      grid: isDark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.1)",
      gridMajor: isDark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.18)",
      labelBg: "rgba(255,255,255,0.92)",
      labelText: "#1e293b",
    };

    const ox = RULER + (cw - RULER - sheet.width * zoom) / 2 + pan.x;
    const oy = RULER + (ch - RULER - sheet.height * zoom) / 2 + pan.y;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cw, ch);

    if (showRulers) {
      ctx.fillStyle = colors.ruler;
      ctx.fillRect(0, 0, RULER, ch);
      ctx.fillRect(0, 0, cw, RULER);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, RULER, RULER);

      ctx.fillStyle = colors.rulerText;
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";

      const step = zoom >= 2 ? 10 : zoom >= 1 ? 25 : zoom >= 0.5 ? 50 : 100;
      for (let mm = 0; mm <= sheet.width; mm += step) {
        const rx = ox + mm * zoom;
        if (rx < RULER || rx > cw) continue;
        ctx.strokeStyle = colors.rulerTick;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(rx, RULER - 5); ctx.lineTo(rx, RULER); ctx.stroke();
        if (mm % (step * 2) === 0) ctx.fillText(String(mm), rx, RULER - 7);
      }
      ctx.textAlign = "center";
      for (let mm = 0; mm <= sheet.height; mm += step) {
        const ry = oy + mm * zoom;
        if (ry < RULER || ry > ch) continue;
        ctx.strokeStyle = colors.rulerTick;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(RULER - 5, ry); ctx.lineTo(RULER, ry); ctx.stroke();
        if (mm % (step * 2) === 0) {
          ctx.save();
          ctx.translate(RULER - 7, ry);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(mm), 0, 0);
          ctx.restore();
        }
      }
      ctx.strokeStyle = colors.rulerTick;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, RULER, ch);
      ctx.strokeRect(0, 0, cw, RULER);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(RULER, RULER, cw - RULER, ch - RULER);
    ctx.clip();

    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    ctx.fillStyle = colors.sheetBg;
    ctx.fillRect(ox, oy, sheet.width * zoom, sheet.height * zoom);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    ctx.strokeStyle = colors.sheetBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, sheet.width * zoom, sheet.height * zoom);

    if (showGrid && zoom > 0.3) {
      const gridStep = zoom >= 2 ? 10 : zoom >= 1 ? 25 : 50;
      ctx.lineWidth = 0.5;
      for (let mm = 0; mm <= sheet.width; mm += gridStep) {
        const x = ox + mm * zoom;
        ctx.strokeStyle = mm % (gridStep * 5) === 0 ? colors.gridMajor : colors.grid;
        ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + sheet.height * zoom); ctx.stroke();
      }
      for (let mm = 0; mm <= sheet.height; mm += gridStep) {
        const y = oy + mm * zoom;
        ctx.strokeStyle = mm % (gridStep * 5) === 0 ? colors.gridMajor : colors.grid;
        ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + sheet.width * zoom, y); ctx.stroke();
      }
    }

    for (const part of sheet.placedParts) {
      const px = ox + part.x * zoom;
      const py = oy + part.y * zoom;
      const pw = part.width * zoom;
      const ph = part.height * zoom;
      const isSelected = selectedPartId === part.partId;
      const isHovered = hoveredPart?.partId === part.partId && hoveredPart?.instanceIndex === part.instanceIndex;

      const alpha = isSelected ? "dd" : isHovered ? "cc" : "aa";
      ctx.fillStyle = part.color + alpha;
      ctx.fillRect(px, py, pw, ph);

      if (isSelected) {
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(px, py, pw, ph);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = isHovered ? part.color : part.color + "99";
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.strokeRect(px, py, pw, ph);
      }

      if (part.rotated && pw > 14 && ph > 14) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `${Math.min(11, pw * 0.35)}px sans-serif`;
        ctx.fillText("↺", px + 3, py + 11);
      }

      if (pw > 32 && ph > 18) {
        const fs = Math.max(9, Math.min(12, pw / 6, ph / 3));
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = part.name.length > 12 ? part.name.slice(0, 11) + "…" : part.name;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(label, px + pw / 2, py + ph / 2 - (ph > 32 ? 6 : 0));
        if (ph > 32) {
          ctx.font = `${Math.max(8, fs - 2)}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillText(`${part.width}×${part.height}mm`, px + pw / 2, py + ph / 2 + 7);
        }
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }

    if (mousePos && showRulers) {
      const mmX = (mousePos.x - ox) / zoom;
      const mmY = (mousePos.y - oy) / zoom;
      if (mmX >= 0 && mmX <= sheet.width && mmY >= 0 && mmY <= sheet.height) {
        ctx.strokeStyle = "rgba(99,102,241,0.4)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(mousePos.x, oy); ctx.lineTo(mousePos.x, oy + sheet.height * zoom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, mousePos.y); ctx.lineTo(ox + sheet.width * zoom, mousePos.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.fillStyle = colors.rulerText;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${sheet.width} mm`, ox + sheet.width * zoom / 2, oy + sheet.height * zoom + 16);
    ctx.save();
    ctx.translate(ox - 14, oy + sheet.height * zoom / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${sheet.height} mm`, 0, 0);
    ctx.restore();

    ctx.restore();
  }, [sheet, zoom, pan, selectedPartId, hoveredPart, isDark, showGrid, showRulers, mousePos, RULER]);

  const getPartAtPos = (cx: number, cy: number): PlacedPart | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const cw = canvasRef.current.offsetWidth;
    const ch = canvasRef.current.offsetHeight;
    const ox = RULER + (cw - RULER - sheet.width * zoom) / 2 + pan.x;
    const oy = RULER + (ch - RULER - sheet.height * zoom) / 2 + pan.y;
    const mx = (cx - rect.left - ox) / zoom;
    const my = (cy - rect.top - oy) / zoom;
    for (let i = sheet.placedParts.length - 1; i >= 0; i--) {
      const p = sheet.placedParts[i];
      if (mx >= p.x && mx <= p.x + p.width && my >= p.y && my <= p.y + p.height) return p;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey || e.ctrlKey) {
      e.preventDefault();
      setIsDragging(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (isDragging) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      setHoveredPart(getPartAtPos(e.clientX, e.clientY));
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => { setIsDragging(false); setHoveredPart(null); setMousePos(null); };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.05, Math.min(20, z * factor)));
  };
  const handleClick = (e: React.MouseEvent) => {
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) return;
    const found = getPartAtPos(e.clientX, e.clientY);
    onSelect(found ? found.partId : null);
  };
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: isDark ? "#0f1117" : "#f1f5f9" }}>
      <canvas
        ref={canvasRef}
        className={cn("w-full h-full", isDragging ? "cursor-grabbing" : hoveredPart ? "cursor-pointer" : "cursor-crosshair")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button onClick={() => setZoom(z => Math.min(20, z * 1.2))} title="Zoom In"
          className="p-1.5 nm-bg-card nm-bg-hover rounded nm-text-main border nm-border shadow-sm"><ZoomIn size={13} /></button>
        <button onClick={() => setZoom(z => Math.max(0.05, z / 1.2))} title="Zoom Out"
          className="p-1.5 nm-bg-card nm-bg-hover rounded nm-text-main border nm-border shadow-sm"><ZoomOut size={13} /></button>
        <button onClick={resetView} title="Fit to screen"
          className="p-1.5 nm-bg-card nm-bg-hover rounded nm-text-main border nm-border shadow-sm"><Maximize2 size={13} /></button>
      </div>
      {hoveredPart && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 nm-bg-card border nm-border rounded-lg shadow-lg text-xs nm-text-main pointer-events-none whitespace-nowrap">
          <span className="font-semibold">{hoveredPart.name}</span>
          <span className="nm-text-sub ml-2">{hoveredPart.width}×{hoveredPart.height} mm</span>
          {hoveredPart.rotated && <span className="ml-2 text-indigo-500">↺ rotated</span>}
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-xs nm-text-muted">
        Scroll=zoom · Right-drag=pan · Click=select
      </div>
    </div>
  );
}

function SheetThumbnail({ sheet, active, onClick, partColors }: {
  sheet: { index: number; utilization: number; placedParts: PlacedPart[]; width: number; height: number };
  active: boolean;
  onClick: () => void;
  partColors: Record<string, string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = useIsDark();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const pad = 4;
    const scale = Math.min((W - pad * 2) / sheet.width, (H - pad * 2) / sheet.height);
    const ox = pad + ((W - pad * 2) - sheet.width * scale) / 2;
    const oy = pad + ((H - pad * 2) - sheet.height * scale) / 2;
    ctx.fillStyle = isDark ? "#1e2030" : "#e2e8f0";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.fillRect(ox, oy, sheet.width * scale, sheet.height * scale);
    ctx.strokeStyle = isDark ? "#475569" : "#94a3b8";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ox, oy, sheet.width * scale, sheet.height * scale);
    for (const p of sheet.placedParts) {
      ctx.fillStyle = (p.color ?? partColors[p.partId] ?? "#6366f1") + "cc";
      ctx.fillRect(ox + p.x * scale, oy + p.y * scale, p.width * scale, p.height * scale);
    }
  }, [sheet, isDark, partColors]);

  const eff = sheet.utilization;
  const effColor = eff >= 75 ? "#10b981" : eff >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg border transition",
        active ? "border-indigo-500 bg-indigo-500/10" : "nm-border nm-bg-card nm-bg-hover"
      )}
      style={{ width: 72 }}
    >
      <canvas ref={canvasRef} width={60} height={44} className="rounded" />
      <div className="text-center w-full">
        <div className="text-xs font-medium nm-text-main">#{sheet.index + 1}</div>
        <div className="w-full h-1 nm-bg-input rounded-full overflow-hidden mt-0.5">
          <div className="h-full rounded-full transition-all" style={{ width: `${eff}%`, backgroundColor: effColor }} />
        </div>
        <div className="text-xs nm-text-muted">{eff.toFixed(0)}%</div>
      </div>
    </button>
  );
}

export default function Nesting() {
  const [parts, setParts] = useState<Part[]>([newPart()]);
  const [sheetPreset, setSheetPreset] = useState(0);
  const [sheetW, setSheetW] = useState(SHEET_PRESETS[0].width);
  const [sheetH, setSheetH] = useState(SHEET_PRESETS[0].height);
  const [kerf, setKerf] = useState(2);
  const [allowRotation, setAllowRotation] = useState(true);
  const [result, setResult] = useState<NestingResult | null>(null);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dwgDialog, setDwgDialog] = useState<DwgAnalysis | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetChange = (idx: number) => {
    setSheetPreset(idx);
    if (SHEET_PRESETS[idx].width > 0) {
      setSheetW(SHEET_PRESETS[idx].width);
      setSheetH(SHEET_PRESETS[idx].height);
    }
  };

  const addPart = () => setParts(p => [...p, newPart()]);
  const removePart = (id: string) => setParts(p => p.filter(x => x.id !== id));
  const updatePart = (id: string, changes: Partial<Part>) =>
    setParts(p => p.map(x => x.id === id ? { ...x, ...changes } : x));
  const duplicatePart = (part: Part) => {
    partCounter++;
    setParts(p => [...p, { ...part, id: `p-${partCounter}-${Date.now()}`, name: part.name + " (copy)" }]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const newParts: Part[] = [];

    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "dxf") {
          const parsed = await parseDxfFile(file);
          parsed.forEach((p, i) => { p.color = PART_COLORS[(parts.length + newParts.length + i) % PART_COLORS.length]; });
          newParts.push(...parsed);
        } else if (ext === "svg") {
          const parsed = await parseSvgFile(file);
          parsed.forEach((p, i) => { p.color = PART_COLORS[(parts.length + newParts.length + i) % PART_COLORS.length]; });
          newParts.push(...parsed);
        } else if (ext === "dwg") {
          const analysis = await analyzeDwgFile(file);
          if (newParts.length > 0) setParts(p => [...p, ...newParts]);
          setDwgDialog(analysis);
          return; // open dialog for DWG
        } else {
          setError(`Unsupported: ${ext?.toUpperCase()}. Supported: DWG, DXF, SVG`);
        }
      } catch (e: any) { setError(e.message ?? "Failed to parse file."); }
    }

    if (newParts.length > 0) setParts(p => [...p, ...newParts]);
  };

  const runNest = async () => {
    const validParts = parts.filter(p => p.width > 0 && p.height > 0 && p.quantity > 0);
    if (validParts.length === 0) { setError("Add at least one valid part."); return; }
    if (sheetW <= 0 || sheetH <= 0) { setError("Invalid sheet dimensions."); return; }
    setRunning(true); setError(null); setRunProgress(0);
    for (let i = 0; i <= 85; i += 15) { setRunProgress(i); await new Promise(r => setTimeout(r, 40)); }
    const res = runNesting(validParts, sheetW, sheetH, allowRotation, kerf);
    setRunProgress(100);
    await new Promise(r => setTimeout(r, 200));
    setResult(res); setCurrentSheet(0); setSelectedPartId(null);
    setRunning(false); setRunProgress(0);
    setRightOpen(true);
  };

  const exportReport = () => {
    if (!result) return;
    const lines = [
      "═══════════════════════════════════",
      "         NESTING REPORT",
      "═══════════════════════════════════",
      `Generated:    ${new Date().toLocaleString()}`,
      `Strategy:     ${result.strategy}`,
      `Time:         ${result.timeMs}ms`,
      "",
      "SHEET CONFIGURATION",
      "───────────────────",
      `Sheet Size:   ${sheetW} × ${sheetH} mm`,
      `Kerf/Gap:     ${kerf} mm`,
      `Allow Rotation: ${allowRotation ? "Yes" : "No"}`,
      "",
      "RESULTS",
      "───────────────────",
      `Sheets Used:  ${result.sheets.length}`,
      `Parts Total:  ${result.totalParts}`,
      `Parts Placed: ${result.placedCount}`,
      `Utilization:  ${result.utilizationPercent.toFixed(2)}%`,
      `Waste:        ${result.wastePercent.toFixed(2)}%`,
      `Sheet Area:   ${result.totalSheetArea.toLocaleString()} mm²`,
      `Used Area:    ${result.totalUsedArea.toLocaleString()} mm²`,
      "",
      "PARTS LIST",
      "───────────────────",
      ...parts.map(p => `  ${p.name.padEnd(20)} ${String(p.width).padStart(6)}×${String(p.height).padEnd(6)} mm  ×${p.quantity} pcs`),
    ];
    if (result.unplacedParts.length > 0) {
      lines.push("", "UNPLACED PARTS", "───────────────────");
      result.unplacedParts.forEach(u => lines.push(`  ${u.part.name}: ${u.remaining} pcs too large`));
    }
    lines.push("", "SHEET BREAKDOWN", "───────────────────");
    result.sheets.forEach(s => {
      lines.push(`  Sheet ${s.index + 1}: ${s.placedParts.length} parts, ${s.utilization.toFixed(1)}% util, ${(s.usedArea / 100).toFixed(0)} cm²`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nesting-report.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSvg = (sheetIdx: number) => {
    if (!result?.sheets[sheetIdx]) return;
    const s = result.sheets[sheetIdx];
    const lines = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">`,
      `<rect width="${s.width}" height="${s.height}" fill="white" stroke="#94a3b8" stroke-width="1"/>`,
      ...s.placedParts.map(p => [
        `<rect x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" width="${p.width}" height="${p.height}" fill="${p.color}88" stroke="${p.color}" stroke-width="0.8">`,
        `<title>${p.name} (${p.width}×${p.height}mm${p.rotated ? ", rotated" : ""})</title></rect>`,
        `<text x="${(p.x + p.width / 2).toFixed(1)}" y="${(p.y + p.height / 2).toFixed(1)}" font-size="6" text-anchor="middle" dominant-baseline="middle" fill="white" font-weight="bold">${p.name}</text>`,
      ].join("")),
      `<text x="${s.width / 2}" y="${s.height - 3}" font-size="5" text-anchor="middle" fill="#64748b">Sheet ${sheetIdx + 1} — ${s.utilization.toFixed(1)}% utilization — ${s.width}×${s.height}mm</text>`,
      `</svg>`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `nesting-sheet-${sheetIdx + 1}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedPart = selectedPartId ? parts.find(p => p.id === selectedPartId) : null;
  const sheetData = result?.sheets[currentSheet];
  const partColors = Object.fromEntries(parts.map(p => [p.id, p.color ?? PART_COLORS[0]]));
  const totalPcs = parts.reduce((s, p) => s + p.quantity, 0);
  const totalArea = parts.reduce((s, p) => s + p.width * p.height * p.quantity, 0);

  const effColor = result
    ? result.utilizationPercent >= 75 ? "text-emerald-500" : result.utilizationPercent >= 50 ? "text-amber-500" : "text-red-500"
    : "nm-text-muted";

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0 nm-bg-page">
        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b nm-border flex-shrink-0 nm-bg-card">
          <button onClick={() => setLeftOpen(v => !v)} className="p-1.5 nm-text-muted hover:nm-text-main rounded">
            <PanelLeft size={16} />
          </button>
          <Layers size={18} className="text-indigo-500 flex-shrink-0" />
          <div>
            <h1 className="text-sm font-bold nm-text-main leading-none">Nesting Module</h1>
            <p className="text-xs nm-text-muted leading-none mt-0.5">2D sheet material optimization</p>
          </div>
          <div className="h-5 w-px nm-border mx-1" />
          {result && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <div><span className="nm-text-muted">Sheets: </span><span className="nm-text-main font-semibold">{result.sheets.length}</span></div>
                <div><span className="nm-text-muted">Parts: </span><span className="nm-text-main font-semibold">{result.placedCount}/{result.totalParts}</span></div>
                <div><span className="nm-text-muted">Utilization: </span><span className={cn("font-bold", effColor)}>{result.utilizationPercent.toFixed(1)}%</span></div>
                <div><span className="nm-text-muted">Strategy: </span><span className="nm-text-main">{result.strategy}</span></div>
                <div><span className="nm-text-muted">Time: </span><span className="nm-text-main">{result.timeMs}ms</span></div>
              </div>
              <div className="h-5 w-px nm-border mx-1" />
            </>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => setShowRulers(v => !v)}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition",
                showRulers ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400" : "nm-bg-card nm-border nm-text-sub nm-bg-hover"
              )}>
              <Ruler size={12} /> Rulers
            </button>
            <button onClick={() => setShowGrid(v => !v)}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition",
                showGrid ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400" : "nm-bg-card nm-border nm-text-sub nm-bg-hover"
              )}>
              <Grid size={12} /> Grid
            </button>
            {result && (
              <>
                <button onClick={() => exportSvg(currentSheet)}
                  className="flex items-center gap-1 px-2.5 py-1.5 nm-bg-card border nm-border nm-bg-hover nm-text-main text-xs rounded-lg">
                  <Download size={12} /> SVG
                </button>
                <button onClick={exportReport}
                  className="flex items-center gap-1 px-2.5 py-1.5 nm-bg-card border nm-border nm-bg-hover nm-text-main text-xs rounded-lg">
                  <FileText size={12} /> Report
                </button>
              </>
            )}
            <button
              onClick={runNest}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition"
            >
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? "Optimizing…" : "Run Nesting"}
            </button>
            <button onClick={() => setRightOpen(v => !v)} className="p-1.5 nm-text-muted hover:nm-text-main rounded">
              <PanelRight size={16} />
            </button>
          </div>
        </div>

        {running && (
          <div className="h-1 bg-indigo-100 dark:bg-indigo-950 flex-shrink-0">
            <div className="h-full bg-indigo-500 transition-all duration-200 rounded-r" style={{ width: `${runProgress}%` }} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-sm flex-shrink-0">
            <AlertTriangle size={14} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left panel ── */}
          {leftOpen && (
            <div className="w-72 flex-shrink-0 flex flex-col border-r nm-border nm-bg-card overflow-y-auto">
              {/* Sheet config */}
              <div className="p-3 border-b nm-border">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Settings2 size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold nm-text-main uppercase tracking-wider">Sheet Configuration</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs nm-text-sub mb-1 block">Preset</label>
                    <select value={sheetPreset} onChange={e => handlePresetChange(Number(e.target.value))}
                      className="w-full nm-bg-input border nm-border rounded-lg px-2.5 py-1.5 nm-text-main text-xs">
                      {SHEET_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs nm-text-sub mb-1 block">Width (mm)</label>
                      <input type="number" value={sheetW} min={1}
                        onChange={e => { setSheetW(Number(e.target.value)); setSheetPreset(SHEET_PRESETS.length - 1); }}
                        className="w-full nm-bg-input border nm-border rounded-lg px-2.5 py-1.5 nm-text-main text-xs" />
                    </div>
                    <div>
                      <label className="text-xs nm-text-sub mb-1 block">Height (mm)</label>
                      <input type="number" value={sheetH} min={1}
                        onChange={e => { setSheetH(Number(e.target.value)); setSheetPreset(SHEET_PRESETS.length - 1); }}
                        className="w-full nm-bg-input border nm-border rounded-lg px-2.5 py-1.5 nm-text-main text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs nm-text-sub mb-1 block">Kerf/Gap (mm)</label>
                      <input type="number" value={kerf} min={0} max={50} step={0.5}
                        onChange={e => setKerf(Number(e.target.value))}
                        className="w-full nm-bg-input border nm-border rounded-lg px-2.5 py-1.5 nm-text-main text-xs" />
                    </div>
                    <div>
                      <label className="text-xs nm-text-sub mb-1 block">Allow Rotation</label>
                      <button
                        onClick={() => setAllowRotation(v => !v)}
                        className={cn(
                          "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs transition",
                          allowRotation ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                            : "nm-bg-input nm-border nm-text-sub"
                        )}>
                        <RotateCw size={11} /> {allowRotation ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </div>
                  <div className="nm-bg-page rounded-lg p-2 text-xs nm-text-sub grid grid-cols-2 gap-1">
                    <span>Sheet area:</span>
                    <span className="nm-text-main font-medium text-right">{(sheetW * sheetH / 100).toFixed(0)} cm²</span>
                    <span>Parts area:</span>
                    <span className="nm-text-main font-medium text-right">{(totalArea / 100).toFixed(0)} cm²</span>
                  </div>
                </div>
              </div>

              {/* File import */}
              <div className="p-3 border-b nm-border">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition",
                    isDragOver ? "border-indigo-400 bg-indigo-500/10" : "nm-border hover:border-indigo-400/60 nm-bg-hover"
                  )}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="mx-auto nm-text-muted mb-1.5" />
                  <p className="nm-text-sub text-xs">Drop DXF, SVG, DWG here</p>
                  <p className="nm-text-muted text-xs mt-0.5">or click to browse</p>
                  <input ref={fileInputRef} type="file" multiple accept=".dxf,.svg,.dwg" className="hidden"
                    onChange={e => handleFiles(e.target.files)} />
                </div>
              </div>

              {/* Parts list */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b nm-border">
                  <div className="flex items-center gap-1.5">
                    <Package size={13} className="text-amber-400" />
                    <span className="text-xs font-semibold nm-text-main uppercase tracking-wider">Parts</span>
                    <span className="text-xs nm-text-muted">({parts.length} types · {totalPcs} pcs)</span>
                  </div>
                  <button onClick={addPart}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition">
                    <Plus size={11} /> Add
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {parts.length === 0 && (
                    <div className="p-4 text-center nm-text-muted text-xs">No parts added yet</div>
                  )}
                  {parts.map((part, idx) => (
                    <div key={part.id} className={cn(
                      "border-b nm-border p-2.5 transition",
                      selectedPartId === part.id ? "bg-indigo-500/10" : "hover:nm-bg-page"
                    )}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="color"
                          value={part.color ?? PART_COLORS[idx % PART_COLORS.length]}
                          onChange={e => updatePart(part.id, { color: e.target.value })}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                          style={{ WebkitAppearance: "none" }}
                        />
                        <input
                          value={part.name}
                          onChange={e => updatePart(part.id, { name: e.target.value })}
                          className="flex-1 bg-transparent nm-text-main text-xs font-medium focus:outline-none min-w-0"
                        />
                        <button onClick={() => duplicatePart(part)} className="nm-text-muted hover:nm-text-main p-0.5"><Copy size={11} /></button>
                        <button onClick={() => removePart(part.id)} className="text-red-400 hover:text-red-500 p-0.5"><Trash2 size={11} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-xs nm-text-muted block mb-0.5">W (mm)</label>
                          <input type="number" value={part.width} min={1}
                            onChange={e => updatePart(part.id, { width: Number(e.target.value) })}
                            className="w-full nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                        </div>
                        <div>
                          <label className="text-xs nm-text-muted block mb-0.5">H (mm)</label>
                          <input type="number" value={part.height} min={1}
                            onChange={e => updatePart(part.id, { height: Number(e.target.value) })}
                            className="w-full nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                        </div>
                        <div>
                          <label className="text-xs nm-text-muted block mb-0.5">Qty</label>
                          <input type="number" value={part.quantity} min={1}
                            onChange={e => updatePart(part.id, { quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-full nm-bg-input border nm-border rounded px-2 py-1 nm-text-main text-xs" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => updatePart(part.id, { allowRotation: !part.allowRotation })}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition flex-1 justify-center",
                            part.allowRotation !== false
                              ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                              : "nm-bg-input nm-border nm-text-muted"
                          )}>
                          <RotateCw size={9} /> {part.allowRotation !== false ? "Rot ✓" : "No rot"}
                        </button>
                        <div className="text-xs nm-text-muted">
                          {(part.width * part.height / 100).toFixed(0)} cm²
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Center canvas ── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {/* Sheet nav bar */}
            {result && (
              <div className="flex items-center gap-2 px-3 py-2 border-b nm-border nm-bg-card flex-shrink-0">
                <button disabled={currentSheet === 0} onClick={() => setCurrentSheet(s => s - 1)}
                  className="p-1 nm-bg-page border nm-border rounded nm-text-main disabled:opacity-30 nm-bg-hover">
                  <ChevronLeft size={14} />
                </button>
                <div className="flex gap-1.5 overflow-x-auto flex-1">
                  {result.sheets.map((s, i) => (
                    <SheetThumbnail key={i} sheet={s} active={i === currentSheet}
                      onClick={() => setCurrentSheet(i)} partColors={partColors} />
                  ))}
                </div>
                <button disabled={currentSheet === result.sheets.length - 1} onClick={() => setCurrentSheet(s => s + 1)}
                  className="p-1 nm-bg-page border nm-border rounded nm-text-main disabled:opacity-30 nm-bg-hover">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 p-3">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center nm-text-muted select-none">
                  <div className="w-32 h-32 rounded-2xl nm-bg-card border nm-border flex items-center justify-center mb-4">
                    <Layers size={52} className="opacity-20" />
                  </div>
                  <p className="text-base font-medium nm-text-sub">No nesting result yet</p>
                  <p className="text-sm mt-1">Configure parts and click <strong>Run Nesting</strong></p>
                  <div className="flex flex-col items-start gap-2 mt-6 text-xs nm-text-muted bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 max-w-xs">
                    <div className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400" /> Add parts in the left panel</div>
                    <div className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400" /> Set sheet size &amp; kerf gap</div>
                    <div className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400" /> Click Run Nesting to optimize</div>
                    <div className="flex items-center gap-2"><ArrowRight size={12} className="text-indigo-400" /> Export SVG or text report</div>
                  </div>
                </div>
              ) : sheetData ? (
                <SheetCanvas
                  sheet={sheetData}
                  selectedPartId={selectedPartId}
                  onSelect={setSelectedPartId}
                  showGrid={showGrid}
                  showRulers={showRulers}
                />
              ) : null}
            </div>
          </div>

          {/* ── Right panel ── */}
          {rightOpen && result && (
            <div className="w-60 flex-shrink-0 flex flex-col border-l nm-border nm-bg-card overflow-y-auto">
              {/* Utilization */}
              <div className="p-3 border-b nm-border">
                <div className="text-xs font-semibold nm-text-main uppercase tracking-wider mb-2">Efficiency</div>
                <div className="space-y-2">
                  {[
                    { label: "Utilization", value: result.utilizationPercent, suffix: "%", invert: false },
                    { label: "Waste", value: result.wastePercent, suffix: "%", invert: true },
                  ].map(({ label, value, suffix, invert }) => {
                    const good = invert ? value <= 25 : value >= 75;
                    const mid = invert ? value <= 50 : value >= 50;
                    const color = good ? "#10b981" : mid ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="nm-text-sub">{label}</span>
                          <span className="font-bold nm-text-main">{value.toFixed(1)}{suffix}</span>
                        </div>
                        <div className="h-2 nm-bg-input rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {[
                    { label: "Sheets", value: String(result.sheets.length) },
                    { label: "Placed", value: `${result.placedCount}/${result.totalParts}` },
                    { label: "Sheet area", value: `${(result.totalSheetArea / 100).toFixed(0)} cm²` },
                    { label: "Used area", value: `${(result.totalUsedArea / 100).toFixed(0)} cm²` },
                  ].map(({ label, value }) => (
                    <div key={label} className="nm-bg-page rounded-lg p-2 text-center">
                      <div className="text-xs nm-text-muted">{label}</div>
                      <div className="text-sm font-bold nm-text-main">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {result.unplacedParts.length > 0 && (
                <div className="p-3 border-b nm-border">
                  <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-0.5">Unplaced parts:</div>
                      {result.unplacedParts.map(u => (
                        <div key={u.part.id}>{u.part.name} ×{u.remaining}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {result.unplacedParts.length === 0 && (
                <div className="px-3 py-2 border-b nm-border">
                  <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={13} /> All {result.totalParts} parts placed
                  </div>
                </div>
              )}

              {/* Selected part info */}
              {selectedPart && sheetData && (
                <div className="p-3 border-b nm-border">
                  <div className="text-xs font-semibold nm-text-main uppercase tracking-wider mb-2">Selected Part</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: selectedPart.color }} />
                    <span className="nm-text-main font-medium text-sm truncate">{selectedPart.name}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {[
                      ["Size", `${selectedPart.width}×${selectedPart.height} mm`],
                      ["Area", `${(selectedPart.width * selectedPart.height / 100).toFixed(1)} cm²`],
                      ["Quantity", `${selectedPart.quantity} pcs`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between nm-text-sub">
                        <span>{k}:</span><span className="nm-text-main">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current sheet parts */}
              {sheetData && (
                <div className="p-3 border-b nm-border flex-1">
                  <div className="text-xs font-semibold nm-text-main uppercase tracking-wider mb-2">
                    Sheet {currentSheet + 1} — {sheetData.placedParts.length} parts
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {sheetData.placedParts.map((p, i) => (
                      <button key={i}
                        onClick={() => setSelectedPartId(p.partId === selectedPartId ? null : p.partId)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition",
                          p.partId === selectedPartId ? "bg-indigo-500/20 nm-text-main" : "hover:nm-bg-page nm-text-sub"
                        )}>
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs truncate flex-1">{p.name}</span>
                        {p.rotated && <RotateCw size={9} className="nm-text-muted flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="p-3">
                <div className="text-xs font-semibold nm-text-main uppercase tracking-wider mb-2">Legend</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {parts.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs nm-text-sub truncate flex-1">{p.name}</span>
                      <span className="text-xs nm-text-muted">×{p.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className="p-3 border-t nm-border mt-auto">
                <div className="text-xs font-semibold nm-text-main uppercase tracking-wider mb-2">Export</div>
                <div className="space-y-1.5">
                  <button onClick={() => exportSvg(currentSheet)}
                    className="w-full flex items-center gap-2 px-3 py-2 nm-bg-page border nm-border nm-bg-hover nm-text-main text-xs rounded-lg">
                    <Download size={12} /> Export Sheet {currentSheet + 1} SVG
                  </button>
                  <button onClick={exportReport}
                    className="w-full flex items-center gap-2 px-3 py-2 nm-bg-page border nm-border nm-bg-hover nm-text-main text-xs rounded-lg">
                    <FileText size={12} /> Export Full Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {dwgDialog && (
        <DwgAnalysisDialog
          analysis={dwgDialog}
          nextColor={i => PART_COLORS[(parts.length + i) % PART_COLORS.length]}
          onConfirm={entries => {
            const newParts: Part[] = entries.map((e, i) => ({
              id: `dwg-${Date.now()}-${i}`,
              name: e.name,
              width: e.width,
              height: e.height,
              quantity: e.quantity,
              color: e.color ?? PART_COLORS[(parts.length + i) % PART_COLORS.length],
              allowRotation: true,
              grainDirection: "none" as const,
              sourceFile: dwgDialog.fileName,
            }));
            setParts(p => [...p, ...newParts]);
            setDwgDialog(null);
          }}
          onCancel={() => setDwgDialog(null)}
        />
      )}
    </Layout>
  );
}
