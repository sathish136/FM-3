import { Layout } from "@/components/Layout";
import {
  PenLine, FolderOpen, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  PanelRight, FileText, Layers, Building2,
  Calendar, Info, Download, Eye, EyeOff, Maximize2,
  ChevronDown, FilterX, Printer, Ruler, RotateCcw, Crosshair,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { DxfViewer as DxfViewerLib, type LayerInfo } from "dxf-viewer";
import { AcApDocManager, AcEdOpenMode } from "@mlightcad/cad-simple-viewer";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Design2DRecord {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  system_name: string;
  attach: string | null;
  modified: string;
}

function fileExt(f: string) { return (f.split(".").pop() || "").toLowerCase(); }
function fileName(f: string) { return f.split("/").pop() || f; }
function proxyUrl(f: string) { return `${BASE}/api/file-proxy?url=${encodeURIComponent(f)}`; }

type MeasurePt = { x: number; y: number };

function formatDist(px: number, pxPerMeter: number | null): string {
  if (pxPerMeter && pxPerMeter > 0) {
    const m = px / pxPerMeter;
    if (m < 0.001) return `${(m * 1000000).toFixed(1)} µm`;
    if (m < 1)     return `${(m * 1000).toFixed(1)} mm`;
    return `${m.toFixed(3)} m`;
  }
  return `${px.toFixed(1)} px`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function deptColor(dept: string) {
  const d = dept.toLowerCase();
  if (d.includes("civil")) return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (d.includes("electric")) return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  if (d.includes("mechanic")) return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
  return { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" };
}

// ── Toolbar primitives (matches 3D viewer style) ──────────────────────────────
type BgPreset = "dark" | "navy" | "light" | "white";
type ViewMode = "normal" | "invert" | "gray" | "contrast";

function viewFilter(mode: ViewMode): string | undefined {
  if (mode === "invert")   return "invert(1) hue-rotate(180deg)";
  if (mode === "gray")     return "grayscale(1)";
  if (mode === "contrast") return "contrast(2) brightness(1.05)";
  return undefined;
}

interface ToolBtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}
function ToolBtn({ active, title, onClick, children }: ToolBtnProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-md text-xs transition-colors border
        ${active
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-transparent border-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10"
        }`}
    >
      {children}
    </button>
  );
}

function TbDivider() {
  return <div className="w-full h-px bg-white/10 my-1" />;
}

function TbSection({ label }: { label: string }) {
  return <div className="text-[9px] text-gray-500 uppercase tracking-widest px-1 mt-2 mb-0.5 select-none w-full text-center">{label}</div>;
}

const BG_CLASSES: Record<BgPreset, string> = {
  dark: "bg-gray-950",
  navy: "bg-[#1a1a2e]",
  light: "bg-[#dde3ee]",
  white: "bg-white",
};

function WttWatermark({ bg = "dark" }: { bg?: BgPreset }) {
  const isLight = bg === "light" || bg === "white";
  return (
    <div className="absolute top-10 right-10 pointer-events-none select-none flex flex-col items-end gap-0.5" style={{ zIndex: 5 }}>
      <span style={{
        fontSize: "20px",
        fontFamily: "'Trebuchet MS', 'Century Gothic', 'Gill Sans', Arial, sans-serif",
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontStyle: "normal",
        lineHeight: 1.1,
        opacity: 0.3,
        color: isLight ? "#374151" : "#ffffff",
      }}>
        WTT INTERNATIONAL
      </span>
      <span style={{
        fontSize: "10px",
        fontFamily: "'Trebuchet MS', 'Century Gothic', 'Gill Sans', Arial, sans-serif",
        fontWeight: 400,
        letterSpacing: "0.12em",
        fontStyle: "italic",
        textTransform: "uppercase",
        opacity: 0.22,
        color: isLight ? "#374151" : "#ffffff",
      }}>
        Water Loving Technology
      </span>
    </div>
  );
}

// ── Left Sidebar (shared by PDF and Image viewer) ────────────────────────────
interface ViewerSidebarProps {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  bgPreset: BgPreset;
  setBgPreset: (v: BgPreset) => void;
  scale?: number;
  setScale?: React.Dispatch<React.SetStateAction<number>>;
  rotate?: number;
  setRotate?: React.Dispatch<React.SetStateAction<number>>;
  numPages?: number | null;
  page?: number;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
  measureMode?: boolean;
  onToggleMeasure?: () => void;
  onClearMeasure?: () => void;
  onCalibrate?: () => void;
  onResetScale?: () => void;
  pxPerMeter?: number | null;
  hasTwoPoints?: boolean;
  onPrint?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  showPanel?: boolean;
  setShowPanel?: (v: boolean) => void;
  downloadSrc?: string;
  recordName?: string;
}

function ViewerSidebar({
  viewMode, setViewMode,
  scale, setScale,
  rotate, setRotate,
  numPages, page, setPage,
  measureMode, onToggleMeasure, onClearMeasure,
  onCalibrate, onResetScale, pxPerMeter, hasTwoPoints,
  onPrint, onFitView, onZoomIn, onZoomOut,
  showPanel, setShowPanel,
}: ViewerSidebarProps) {
  return (
    <aside className="w-12 bg-[#16162a] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 flex-shrink-0 overflow-y-auto">

      <TbSection label="View" />

      <ToolBtn title="Normal view" active={viewMode === "normal"} onClick={() => setViewMode("normal")}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <circle cx="10" cy="10" r="7" />
        </svg>
      </ToolBtn>

      <ToolBtn title="Invert colors" active={viewMode === "invert"} onClick={() => setViewMode("invert")}>
        <svg viewBox="0 0 20 20" className="w-5 h-5">
          <path fill="currentColor" d="M10 3a7 7 0 1 1 0 14V3z" />
          <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M10 3a7 7 0 1 0 0 14" />
        </svg>
      </ToolBtn>

      <TbDivider />
      <TbSection label="Filter" />

      <ToolBtn title="Grayscale — convert to black & white" active={viewMode === "gray"} onClick={() => setViewMode(viewMode === "gray" ? "normal" : "gray")}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" />
          <line x1="10" y1="3" x2="10" y2="17" />
        </svg>
      </ToolBtn>

      <ToolBtn title="High contrast — boost contrast for faded drawings" active={viewMode === "contrast"} onClick={() => setViewMode(viewMode === "contrast" ? "normal" : "contrast")}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
          <path d="M10 3 A7 7 0 0 1 10 17 Z" fill="currentColor" />
        </svg>
      </ToolBtn>

      {(setScale || onFitView || onZoomIn || onZoomOut) && (
        <>
          <TbDivider />
          <TbSection label="Zoom" />

          {(setScale || onZoomIn) && (
            <ToolBtn title="Zoom in (+)" onClick={() => {
              if (onZoomIn) onZoomIn();
              else if (setScale) setScale(s => +(Math.min(4, s + 0.15).toFixed(2)));
            }}>
              <ZoomIn className="w-4 h-4" />
            </ToolBtn>
          )}

          {scale != null && (
            <div className="text-[9px] text-gray-400 tabular-nums text-center leading-tight py-0.5 select-none">
              {Math.round(scale * 100)}%
            </div>
          )}

          {(onFitView || setScale) && (
            <ToolBtn
              title="Fit to window (reset zoom)"
              onClick={() => { if (onFitView) onFitView(); else if (setScale) setScale(1.2); }}
            >
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="14" height="14" rx="1" />
                <polyline points="7,3 3,3 3,7" />
                <polyline points="13,3 17,3 17,7" />
                <polyline points="3,13 3,17 7,17" />
                <polyline points="17,13 17,17 13,17" />
              </svg>
            </ToolBtn>
          )}

          {(setScale || onZoomOut) && (
            <ToolBtn title="Zoom out (-)" onClick={() => {
              if (onZoomOut) onZoomOut();
              else if (setScale) setScale(s => +(Math.max(0.2, s - 0.15).toFixed(2)));
            }}>
              <ZoomOut className="w-4 h-4" />
            </ToolBtn>
          )}
        </>
      )}

      {setRotate && (
        <>
          <TbDivider />
          <TbSection label="Rotate" />

          <ToolBtn title="Rotate 90° counter-clockwise" onClick={() => setRotate!(r => (r - 90 + 360) % 360)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4.5 10a5.5 5.5 0 1 0 1.2-3.4" />
              <polyline points="2,4 4.5,6.5 7,4" />
            </svg>
          </ToolBtn>

          <ToolBtn title="Rotate 90° clockwise" onClick={() => setRotate!(r => (r + 90) % 360)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.5 10a5.5 5.5 0 1 1-1.2-3.4" />
              <polyline points="18,4 15.5,6.5 13,4" />
            </svg>
          </ToolBtn>

          {rotate != null && rotate !== 0 && (
            <ToolBtn title="Reset rotation" onClick={() => setRotate!(0)}>
              <RotateCcw className="w-4 h-4" />
            </ToolBtn>
          )}
        </>
      )}

      {numPages != null && setPage && page != null && (
        <>
          <TbDivider />
          <TbSection label="Pages" />

          <ToolBtn title="Previous page (←)" onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </ToolBtn>

          <div className="text-[9px] text-gray-400 tabular-nums text-center leading-tight py-0.5 select-none">
            {page}<br /><span className="text-gray-600">/{numPages}</span>
          </div>

          <ToolBtn title="Next page (→)" onClick={() => setPage(p => Math.min(numPages!, p + 1))}>
            <ChevronRight className="w-4 h-4" />
          </ToolBtn>
        </>
      )}

      {onToggleMeasure && (
        <>
          <TbDivider />
          <TbSection label="Measure" />
          <ToolBtn title="Measure distance — click two points on the drawing" active={measureMode} onClick={onToggleMeasure}>
            <Ruler className="w-4 h-4" />
          </ToolBtn>
          {measureMode && onClearMeasure && (
            <ToolBtn title="Clear measurement" onClick={onClearMeasure}>
              <X className="w-4 h-4" />
            </ToolBtn>
          )}
          {onCalibrate && (
            <ToolBtn
              title={hasTwoPoints ? "Set scale — enter the real distance for the two clicked points" : "Calibrate scale: first click two points on a known distance"}
              active={!!pxPerMeter}
              onClick={hasTwoPoints ? onCalibrate : undefined as any}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="10" x2="18" y2="10" />
                <line x1="2" y1="7" x2="2" y2="13" />
                <line x1="18" y1="7" x2="18" y2="13" />
                <line x1="10" y1="8" x2="10" y2="12" />
              </svg>
            </ToolBtn>
          )}
          {pxPerMeter && onResetScale && (
            <ToolBtn title="Reset scale (back to pixels)" onClick={onResetScale}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4.5 10a5.5 5.5 0 1 0 1.2-3.4" />
                <polyline points="2,4 4.5,6.5 7,4" />
                <line x1="8" y1="10" x2="12" y2="10" strokeWidth="2" />
              </svg>
            </ToolBtn>
          )}
          {pxPerMeter && (
            <div className="text-[8px] text-yellow-400 tabular-nums text-center leading-tight py-0.5 select-none px-0.5">
              m
            </div>
          )}
        </>
      )}

      {onPrint && (
        <>
          <TbDivider />
          <TbSection label="Print" />
          <ToolBtn title="Print drawing" onClick={onPrint}>
            <Printer className="w-4 h-4" />
          </ToolBtn>
        </>
      )}

      {setShowPanel && (
        <>
          <TbDivider />
          <TbSection label="Panel" />
          <ToolBtn
            title={showPanel ? "Hide info panel" : "Show info panel"}
            active={showPanel}
            onClick={() => setShowPanel(!showPanel)}
          >
            <PanelRight className="w-4 h-4" />
          </ToolBtn>
        </>
      )}
    </aside>
  );
}

// ── DXF Fullscreen Viewer ─────────────────────────────────────────────────────
const DXF_BG_COLORS: Record<BgPreset, string> = {
  dark: "#0d0d12",
  navy: "#0f0f1d",
  light: "#dde3ee",
  white: "#ffffff",
};

function DxfFileViewer({
  src, record, onClose, badge = "DXF", downloadSrc,
}: { src: string; record: Design2DRecord; onClose: () => void; badge?: string; downloadSrc?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<typeof DxfViewerLib> | null>(null);
  const initialBoundsRef = useRef<{ left: number; right: number; top: number; bottom: number } | null>(null);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [bgPreset, setBgPreset] = useState<BgPreset>("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<MeasurePt[]>([]);
  const [mousePos, setMousePos] = useState<MeasurePt | null>(null);
  const [pxPerMeter, setPxPerMeter] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new DxfViewerLib(containerRef.current, {
      autoResize: true,
      clearAlpha: 0,
      canvasAlpha: true,
      antialias: true,
    });
    viewerRef.current = viewer;

    const workerFactory = () => new Worker(
      new URL("dxf-viewer/src/DxfWorker.js", import.meta.url),
      { type: "module" }
    );

    viewer.Load({
      url: src,
      fonts: null,
      workerFactory,
      progressCbk: (_phase, processed, total) => {
        if (total > 0) setProgress(Math.round((processed / total) * 100));
      },
    }).then(() => {
      const ls = [...viewer.GetLayers()];
      setLayers(ls);
      initialBoundsRef.current = viewer.GetCamera();
      setLoadState("ready");
    }).catch(() => {
      setLoadState("error");
    });

    return () => { viewer.Destroy(); viewerRef.current = null; };
  }, [src]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (measureMode) { setMeasureMode(false); setMeasurePts([]); }
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, measureMode]);

  const toggleLayer = (name: string) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); viewerRef.current?.ShowLayer(name, true); }
      else { next.add(name); viewerRef.current?.ShowLayer(name, false); }
      return next;
    });
  };

  const fitView = () => {
    const v = viewerRef.current;
    if (!v) return;
    const b = initialBoundsRef.current;
    if (b) {
      v.FitView(b.left, b.right, b.bottom, b.top, 0.05);
    }
  };

  const dispatchWheel = useCallback((delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector("canvas") ?? container;
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true, cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      deltaY: delta, deltaMode: 0,
    }));
  }, []);

  const zoomIn  = useCallback(() => dispatchWheel(-250), [dispatchWheel]);
  const zoomOut = useCallback(() => dispatchWheel(250),  [dispatchWheel]);

  const handleMeasureClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMeasurePts(prev => {
      if (prev.length === 0) return [pt];
      if (prev.length === 1) return [prev[0], pt];
      return [pt];
    });
  }, [measureMode]);

  const handleMeasureMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [measureMode]);

  const clearMeasure = useCallback(() => { setMeasurePts([]); setMousePos(null); }, []);

  const measureDist = measurePts.length === 2
    ? Math.sqrt((measurePts[1].x - measurePts[0].x) ** 2 + (measurePts[1].y - measurePts[0].y) ** 2)
    : null;

  const calibrate = useCallback(() => {
    if (!measureDist) return;
    const input = window.prompt("Enter the real distance between the two clicked points (in meters):", "1");
    if (!input) return;
    const meters = parseFloat(input);
    if (!isNaN(meters) && meters > 0) setPxPerMeter(measureDist / meters);
  }, [measureDist]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#16162a] border-b border-white/10 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{record.name}</p>
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}{record.revision ? ` · Rev ${record.revision}` : ""}</p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge === "DWG" ? "bg-orange-900/40 text-orange-300 border-orange-700/30" : "bg-blue-900/40 text-blue-300 border-blue-700/30"}`}>{badge}</span>

        {measureDist !== null && (
          <div className="flex items-center gap-2 bg-yellow-500/90 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Ruler className="w-3.5 h-3.5" />
            {formatDist(measureDist, pxPerMeter)}
            <button onClick={clearMeasure} className="ml-1 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {measureMode && measurePts.length < 2 && (
          <div className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-xs">
            <Crosshair className="w-3.5 h-3.5" />
            {measurePts.length === 0 ? "Click first point" : "Click second point"}
          </div>
        )}

        <button onClick={() => setShowPanel(p => !p)}
          title={showPanel ? "Hide reference panel" : "Show drawing reference"}
          className={`p-1.5 rounded-lg transition-colors ${showPanel ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
          <Info className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar — shared ViewerSidebar */}
        <ViewerSidebar
          viewMode={viewMode} setViewMode={setViewMode}
          bgPreset={bgPreset} setBgPreset={setBgPreset}
          showPanel={showPanel} setShowPanel={setShowPanel}
          onFitView={fitView}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          measureMode={measureMode}
          onToggleMeasure={() => { setMeasureMode(m => !m); clearMeasure(); }}
          onClearMeasure={clearMeasure}
          onCalibrate={calibrate}
          onResetScale={() => setPxPerMeter(null)}
          pxPerMeter={pxPerMeter}
          hasTwoPoints={measurePts.length === 2}
        />

        {/* DXF canvas + measurement overlay */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: DXF_BG_COLORS[bgPreset] }}
          onClick={handleMeasureClick}
          onMouseMove={handleMeasureMove}
          onMouseLeave={() => setMousePos(null)}
        >
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{
              filter: viewFilter(viewMode),
              pointerEvents: measureMode ? "none" : undefined,
            }}
          />
          <WttWatermark bg={bgPreset} />
          {loadState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Parsing {badge} file… {progress > 0 ? `${progress}%` : ""}</p>
            </div>
          )}
          {loadState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Unable to render this {badge} file.</p>
            </div>
          )}

          {/* Measurement SVG overlay */}
          {measureMode && (
            <svg className="absolute inset-0 w-full h-full" style={{ cursor: "crosshair", pointerEvents: "none" }}>
              {measurePts[0] && (
                <>
                  <circle cx={measurePts[0].x} cy={measurePts[0].y} r="6" fill="#3b82f6" fillOpacity="0.9" />
                  <circle cx={measurePts[0].x} cy={measurePts[0].y} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5" />
                </>
              )}
              {measurePts.length === 1 && mousePos && (
                <line x1={measurePts[0].x} y1={measurePts[0].y} x2={mousePos.x} y2={mousePos.y}
                  stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" strokeOpacity="0.7" />
              )}
              {measurePts[1] && (() => {
                const dx = measurePts[1].x - measurePts[0].x;
                const dy = measurePts[1].y - measurePts[0].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) return null;
                const nx = -dy / len * 8, ny = dx / len * 8;
                const mx = (measurePts[0].x + measurePts[1].x) / 2;
                const my = (measurePts[0].y + measurePts[1].y) / 2;
                return (
                  <>
                    <line x1={measurePts[0].x} y1={measurePts[0].y} x2={measurePts[1].x} y2={measurePts[1].y}
                      stroke="#eab308" strokeWidth="2" strokeDasharray="6 3" />
                    <circle cx={measurePts[0].x} cy={measurePts[0].y} r="5" fill="#eab308" />
                    <circle cx={measurePts[1].x} cy={measurePts[1].y} r="5" fill="#eab308" />
                    <line x1={measurePts[0].x - nx} y1={measurePts[0].y - ny} x2={measurePts[0].x + nx} y2={measurePts[0].y + ny} stroke="#eab308" strokeWidth="2" />
                    <line x1={measurePts[1].x - nx} y1={measurePts[1].y - ny} x2={measurePts[1].x + nx} y2={measurePts[1].y + ny} stroke="#eab308" strokeWidth="2" />
                    <rect x={mx - 36} y={my - 12} width="72" height="20" rx="4" fill="#eab308" fillOpacity="0.95" />
                    <text x={mx} y={my + 3} textAnchor="middle" fill="#1a1100" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      {formatDist(measureDist!, pxPerMeter)}
                    </text>
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {/* Info + layers panel */}
        {showPanel && (
          <div className="w-64 bg-[#16162a] border-l border-white/10 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Drawing Reference</span>
              </div>
              <button onClick={() => setShowPanel(false)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Hide panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-3 overflow-auto flex-1">
              {[
                { label: "ID", value: record.name },
                { label: "Project", value: record.project },
                { label: "Project Name", value: record.project_name },
                { label: "Department", value: record.department },
                { label: "Revision", value: record.revision },
                { label: "Tag", value: record.tag },
                { label: "System Name", value: record.system_name },
                { label: "Modified", value: formatDate(record.modified) },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm text-gray-200 break-words">{value}</p>
                </div>
              ) : null)}
              {measureDist !== null && (
                <div className="mt-2 pt-3 border-t border-white/10">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Measurement</p>
                  <p className="text-sm text-yellow-400 font-mono font-semibold">{formatDist(measureDist, pxPerMeter)}</p>
                </div>
              )}
            </div>

            {layers.length > 0 && (
              <div className="border-t border-white/10 p-3 flex flex-col gap-1 overflow-auto max-h-56 flex-shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Layers ({layers.length})</span>
                </div>
                {layers.map(layer => {
                  const hex = "#" + layer.color.toString(16).padStart(6, "0");
                  const isHidden = hiddenLayers.has(layer.name);
                  return (
                    <button
                      key={layer.name}
                      onClick={() => toggleLayer(layer.name)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors
                        ${isHidden ? "opacity-40 hover:opacity-70" : "hover:bg-white/5"}`}
                      title={isHidden ? "Show layer" : "Hide layer"}
                    >
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: hex }} />
                      <span className="truncate flex-1 text-gray-300">{layer.displayName || layer.name}</span>
                      {isHidden ? <EyeOff className="w-3 h-3 text-gray-600 flex-shrink-0" /> : <Eye className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DWG Viewer (mlightcad WebAssembly-powered, supports DWG & DXF natively) ───
const DWG_BG_CSS: Record<BgPreset, string> = {
  dark:  "#0d0d12",
  navy:  "#0f0f1d",
  light: "#dde3ee",
  white: "#ffffff",
};

function DwgFileViewer({
  src, record, onClose,
}: { src: string; record: Design2DRecord; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<AcApDocManager | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [showPanel, setShowPanel] = useState(true);
  const [bgPreset, setBgPreset] = useState<BgPreset>("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<MeasurePt[]>([]);
  const [mousePos, setMousePos] = useState<MeasurePt | null>(null);
  const [pxPerMeter, setPxPerMeter] = useState<number | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (measureMode) { setMeasureMode(false); setMeasurePts([]); }
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, measureMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const dwgWorkerUrl  = `${window.location.origin}${base}/cad-workers/libredwg-parser-worker.js`;
    const mtextWorkerUrl = `${window.location.origin}${base}/cad-workers/mtext-renderer-worker.js`;

    const manager = AcApDocManager.createInstance({
      container: containerRef.current,
      autoResize: true,
      webworkerFileUrls: {
        dxfParser:   dwgWorkerUrl,
        dwgParser:   dwgWorkerUrl,
        mtextRender: mtextWorkerUrl,
      },
    });

    if (!manager) { setLoadState("error"); setErrMsg("Failed to create viewer"); return; }
    managerRef.current = manager;

    const fileName = record.attach?.split("/").pop() || "drawing.dwg";

    fetch(src)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(buf => manager.openDocument(fileName, buf, { mode: AcEdOpenMode.Read }))
      .then(ok => {
        if (destroyed) return;
        if (ok) setLoadState("ready");
        else { setLoadState("error"); setErrMsg("File could not be opened"); }
      })
      .catch(e => {
        if (destroyed) return;
        setErrMsg(e?.message || String(e));
        setLoadState("error");
      });

    return () => {
      destroyed = true;
      try { manager.destroy(); } catch {}
      managerRef.current = null;
    };
  }, [src]);

  const fitView = () => managerRef.current?.sendStringToExecute("zoom e");

  const dispatchWheel = useCallback((delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector("canvas") ?? container;
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true, cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      deltaY: delta, deltaMode: 0,
    }));
  }, []);

  const zoomIn  = useCallback(() => dispatchWheel(-250), [dispatchWheel]);
  const zoomOut = useCallback(() => dispatchWheel(250),  [dispatchWheel]);

  const handleMeasureClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMeasurePts(prev => {
      if (prev.length === 0) return [pt];
      if (prev.length === 1) return [prev[0], pt];
      return [pt];
    });
  }, [measureMode]);

  const handleMeasureMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [measureMode]);

  const clearMeasure = useCallback(() => { setMeasurePts([]); setMousePos(null); }, []);

  const measureDist = measurePts.length === 2
    ? Math.sqrt((measurePts[1].x - measurePts[0].x) ** 2 + (measurePts[1].y - measurePts[0].y) ** 2)
    : null;

  const calibrate = useCallback(() => {
    if (!measureDist) return;
    const input = window.prompt("Enter the real distance between the two clicked points (in meters):", "1");
    if (!input) return;
    const meters = parseFloat(input);
    if (!isNaN(meters) && meters > 0) setPxPerMeter(measureDist / meters);
  }, [measureDist]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#16162a] border-b border-white/10 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{record.name}</p>
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}{record.revision ? ` · Rev ${record.revision}` : ""}</p>
        </div>
        <span className="text-[10px] font-mono bg-orange-900/40 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded">DWG</span>

        {measureDist !== null && (
          <div className="flex items-center gap-2 bg-yellow-500/90 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Ruler className="w-3.5 h-3.5" />
            {formatDist(measureDist, pxPerMeter)}
            <button onClick={clearMeasure} className="ml-1 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {measureMode && measurePts.length < 2 && (
          <div className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-xs">
            <Crosshair className="w-3.5 h-3.5" />
            {measurePts.length === 0 ? "Click first point" : "Click second point"}
          </div>
        )}

        <button onClick={() => setShowPanel(p => !p)}
          title={showPanel ? "Hide reference panel" : "Show drawing reference"}
          className={`p-1.5 rounded-lg transition-colors ${showPanel ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
          <Info className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar — shared ViewerSidebar */}
        <ViewerSidebar
          viewMode={viewMode} setViewMode={setViewMode}
          bgPreset={bgPreset} setBgPreset={setBgPreset}
          showPanel={showPanel} setShowPanel={setShowPanel}
          onFitView={fitView}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          measureMode={measureMode}
          onToggleMeasure={() => { setMeasureMode(m => !m); clearMeasure(); }}
          onClearMeasure={clearMeasure}
          onCalibrate={calibrate}
          onResetScale={() => setPxPerMeter(null)}
          pxPerMeter={pxPerMeter}
          hasTwoPoints={measurePts.length === 2}
        />

        {/* Canvas + measurement overlay */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: DWG_BG_CSS[bgPreset] }}
          onClick={handleMeasureClick}
          onMouseMove={handleMeasureMove}
          onMouseLeave={() => setMousePos(null)}
        >
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{
              filter: viewFilter(viewMode),
              pointerEvents: measureMode ? "none" : undefined,
            }}
          />
          <WttWatermark bg={bgPreset} />
          {loadState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Loading DWG file…</p>
            </div>
          )}
          {loadState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="w-10 h-10 text-red-400 opacity-60" />
              <p className="text-sm text-gray-400">Failed to load drawing</p>
              {errMsg && <p className="text-xs text-gray-600 font-mono max-w-sm text-center break-all">{errMsg}</p>}
              <p className="text-xs text-gray-600">Please contact your administrator.</p>
            </div>
          )}

          {/* Measurement SVG overlay */}
          {measureMode && (
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ cursor: "crosshair", pointerEvents: "none" }}
            >
              {measurePts[0] && (
                <>
                  <circle cx={measurePts[0].x} cy={measurePts[0].y} r="6" fill="#3b82f6" fillOpacity="0.9" />
                  <circle cx={measurePts[0].x} cy={measurePts[0].y} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5" />
                </>
              )}
              {measurePts.length === 1 && mousePos && (
                <line x1={measurePts[0].x} y1={measurePts[0].y} x2={mousePos.x} y2={mousePos.y}
                  stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" strokeOpacity="0.7" />
              )}
              {measurePts[1] && (() => {
                const dx = measurePts[1].x - measurePts[0].x;
                const dy = measurePts[1].y - measurePts[0].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) return null;
                const nx = -dy / len * 8, ny = dx / len * 8;
                const mx = (measurePts[0].x + measurePts[1].x) / 2;
                const my = (measurePts[0].y + measurePts[1].y) / 2;
                return (
                  <>
                    <line x1={measurePts[0].x} y1={measurePts[0].y} x2={measurePts[1].x} y2={measurePts[1].y}
                      stroke="#eab308" strokeWidth="2" strokeDasharray="6 3" />
                    <circle cx={measurePts[0].x} cy={measurePts[0].y} r="5" fill="#eab308" />
                    <circle cx={measurePts[1].x} cy={measurePts[1].y} r="5" fill="#eab308" />
                    <line x1={measurePts[0].x - nx} y1={measurePts[0].y - ny} x2={measurePts[0].x + nx} y2={measurePts[0].y + ny} stroke="#eab308" strokeWidth="2" />
                    <line x1={measurePts[1].x - nx} y1={measurePts[1].y - ny} x2={measurePts[1].x + nx} y2={measurePts[1].y + ny} stroke="#eab308" strokeWidth="2" />
                    <rect x={mx - 36} y={my - 12} width="72" height="20" rx="4" fill="#eab308" fillOpacity="0.95" />
                    <text x={mx} y={my + 3} textAnchor="middle" fill="#1a1100" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      {formatDist(measureDist!, pxPerMeter)}
                    </text>
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-60 bg-[#16162a] border-l border-white/10 flex-shrink-0 overflow-auto flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Drawing Reference</span>
              </div>
              <button onClick={() => setShowPanel(false)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Hide panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-3 flex-1">
              {[
                { label: "ID",           value: record.name },
                { label: "Project",      value: record.project },
                { label: "Project Name", value: record.project_name },
                { label: "Department",   value: record.department },
                { label: "Revision",     value: record.revision },
                { label: "Tag",          value: record.tag },
                { label: "System Name",  value: record.system_name },
                { label: "Modified",     value: formatDate(record.modified) },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm text-gray-200 break-words">{value}</p>
                </div>
              ) : null)}
              {measureDist !== null && (
                <div className="mt-2 pt-3 border-t border-white/10">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Measurement</p>
                  <p className="text-sm text-yellow-400 font-mono font-semibold">{formatDist(measureDist, pxPerMeter)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PDF Fullscreen Viewer ─────────────────────────────────────────────────────
function PdfViewer({
  src, record, onClose,
}: { src: string; record: Design2DRecord; onClose: () => void }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotate, setRotate] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [pdfErr, setPdfErr] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [bgPreset, setBgPreset] = useState<BgPreset>("dark");

  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<MeasurePt[]>([]);
  const [mousePos, setMousePos] = useState<MeasurePt | null>(null);
  const [pxPerMeter, setPxPerMeter] = useState<number | null>(null);
  const measureOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (measureMode) { setMeasureMode(false); setMeasurePts([]); } else onClose(); }
      if (e.key === "ArrowRight" && numPages && page < numPages) setPage(p => p + 1);
      if (e.key === "ArrowLeft" && page > 1) setPage(p => p - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, page, numPages, measureMode]);

  const handleMeasureClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMeasurePts(prev => {
      if (prev.length === 0) return [pt];
      if (prev.length === 1) return [prev[0], pt];
      return [pt];
    });
  }, [measureMode]);

  const handleMeasureMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [measureMode]);

  const clearMeasure = useCallback(() => {
    setMeasurePts([]);
    setMousePos(null);
  }, []);

  const measureDist = measurePts.length === 2
    ? Math.sqrt((measurePts[1].x - measurePts[0].x) ** 2 + (measurePts[1].y - measurePts[0].y) ** 2)
    : null;

  const calibrate = useCallback(() => {
    if (!measureDist) return;
    const input = window.prompt("Enter the real distance between the two clicked points (in meters):", "1");
    if (!input) return;
    const meters = parseFloat(input);
    if (!isNaN(meters) && meters > 0) setPxPerMeter(measureDist / meters);
  }, [measureDist]);

  const handlePrint = useCallback(() => {
    const win = window.open(src, "_blank");
    if (win) { win.onload = () => win.print(); }
  }, [src]);

  const bgClass = BG_CLASSES[bgPreset];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#16162a] border-b border-white/10 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{record.name}</p>
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}{record.revision ? ` · Rev ${record.revision}` : ""}</p>
        </div>

        {measureDist !== null && (
          <div className="flex items-center gap-2 bg-yellow-500/90 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Ruler className="w-3.5 h-3.5" />
            {formatDist(measureDist, pxPerMeter)}
            <span className="text-gray-700 font-normal">@ {Math.round(scale * 100)}%</span>
            <button onClick={clearMeasure} className="ml-1 hover:text-gray-900 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {measureMode && measurePts.length < 2 && (
          <div className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-xs">
            <Crosshair className="w-3.5 h-3.5" />
            {measurePts.length === 0 ? "Click first point" : "Click second point"}
          </div>
        )}

        <span className="text-xs text-gray-500 tabular-nums bg-white/5 px-2 py-1 rounded">{Math.round(scale * 100)}%</span>
        {numPages && (
          <span className="text-xs text-gray-400 tabular-nums">{page} / {numPages}</span>
        )}
        <button onClick={handlePrint}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Print drawing">
          <Printer className="w-4 h-4" />
        </button>
        <button onClick={() => setShowPanel(p => !p)}
          title={showPanel ? "Hide reference panel" : "Show drawing reference"}
          className={`p-1.5 rounded-lg transition-colors ${showPanel ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <ViewerSidebar
          viewMode={viewMode} setViewMode={setViewMode}
          bgPreset={bgPreset} setBgPreset={setBgPreset}
          scale={scale} setScale={setScale}
          rotate={rotate} setRotate={setRotate}
          showPanel={showPanel} setShowPanel={setShowPanel}
          numPages={numPages} page={page} setPage={setPage}
          measureMode={measureMode}
          onToggleMeasure={() => { setMeasureMode(m => !m); clearMeasure(); }}
          onClearMeasure={clearMeasure}
          onCalibrate={calibrate}
          onResetScale={() => setPxPerMeter(null)}
          pxPerMeter={pxPerMeter}
          hasTwoPoints={measurePts.length === 2}
          onPrint={handlePrint}
        />

        {/* Document area */}
        <div className={`flex-1 overflow-auto flex items-start justify-center p-6 transition-colors relative ${bgClass}`}>
          <WttWatermark bg={bgPreset} />
          {pdfErr ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this file.</p>
            </div>
          ) : (
            <div className="relative" style={{ filter: viewFilter(viewMode) }}>
              <Document
                file={src}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPage(1); }}
                onLoadError={() => setPdfErr(true)}
                loading={<div className="flex items-center gap-2 text-gray-400 mt-20"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>}
              >
                <Page
                  pageNumber={page}
                  scale={scale}
                  rotate={rotate}
                  renderTextLayer
                  renderAnnotationLayer={false}
                  className="shadow-2xl"
                />
              </Document>

              {/* Measurement overlay */}
              {measureMode && (
                <div
                  ref={measureOverlayRef}
                  className="absolute inset-0"
                  style={{ cursor: "crosshair", zIndex: 10 }}
                  onClick={handleMeasureClick}
                  onMouseMove={handleMeasureMove}
                  onMouseLeave={() => setMousePos(null)}
                >
                  <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                    {/* Point 1 */}
                    {measurePts[0] && (
                      <>
                        <circle cx={measurePts[0].x} cy={measurePts[0].y} r="6" fill="#3b82f6" fillOpacity="0.9" />
                        <circle cx={measurePts[0].x} cy={measurePts[0].y} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5" />
                      </>
                    )}
                    {/* Live line from pt1 to mouse */}
                    {measurePts.length === 1 && mousePos && (
                      <line x1={measurePts[0].x} y1={measurePts[0].y} x2={mousePos.x} y2={mousePos.y}
                        stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" strokeOpacity="0.7" />
                    )}
                    {/* Point 2 + final line */}
                    {measurePts[1] && (
                      <>
                        <line x1={measurePts[0].x} y1={measurePts[0].y} x2={measurePts[1].x} y2={measurePts[1].y}
                          stroke="#eab308" strokeWidth="2" strokeDasharray="6 3" />
                        <circle cx={measurePts[0].x} cy={measurePts[0].y} r="5" fill="#eab308" />
                        <circle cx={measurePts[1].x} cy={measurePts[1].y} r="5" fill="#eab308" />
                        {/* Tick marks */}
                        {(() => {
                          const dx = measurePts[1].x - measurePts[0].x;
                          const dy = measurePts[1].y - measurePts[0].y;
                          const len = Math.sqrt(dx * dx + dy * dy);
                          if (len === 0) return null;
                          const nx = -dy / len * 8, ny = dx / len * 8;
                          return (
                            <>
                              <line x1={measurePts[0].x - nx} y1={measurePts[0].y - ny} x2={measurePts[0].x + nx} y2={measurePts[0].y + ny} stroke="#eab308" strokeWidth="2" />
                              <line x1={measurePts[1].x - nx} y1={measurePts[1].y - ny} x2={measurePts[1].x + nx} y2={measurePts[1].y + ny} stroke="#eab308" strokeWidth="2" />
                            </>
                          );
                        })()}
                        {/* Distance label on line */}
                        {(() => {
                          const mx = (measurePts[0].x + measurePts[1].x) / 2;
                          const my = (measurePts[0].y + measurePts[1].y) / 2;
                          return (
                            <>
                              <rect x={mx - 36} y={my - 12} width="72" height="20" rx="4" fill="#eab308" fillOpacity="0.95" />
                              <text x={mx} y={my + 3} textAnchor="middle" fill="#1a1100" fontSize="11" fontWeight="bold" fontFamily="monospace">
                                {formatDist(measureDist!, pxPerMeter)}
                              </text>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-60 bg-[#16162a] border-l border-white/10 flex-shrink-0 overflow-auto flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Drawing Reference</span>
              </div>
              <button onClick={() => setShowPanel(v => !v)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Hide panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-3 flex-1">
              {[
                { label: "ID", value: record.name },
                { label: "Project", value: record.project },
                { label: "Project Name", value: record.project_name },
                { label: "Department", value: record.department },
                { label: "Revision", value: record.revision },
                { label: "Tag", value: record.tag },
                { label: "System Name", value: record.system_name },
                { label: "Modified", value: formatDate(record.modified) },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm text-gray-200 break-words">{value}</p>
                </div>
              ) : null)}
              {numPages && (
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Pages</p>
                  <p className="text-sm text-gray-200">{numPages}</p>
                </div>
              )}
              {measureDist !== null && (
                <div className="mt-2 pt-3 border-t border-white/10">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Measurement</p>
                  <p className="text-sm text-yellow-400 font-mono font-semibold">{formatDist(measureDist, pxPerMeter)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">At {Math.round(scale * 100)}% zoom</p>
                </div>
              )}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-1.5">
                <button onClick={handlePrint}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print drawing
                </button>
                <a href={src} download={record.name}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Record Card ───────────────────────────────────────────────────────────────
function RecordCard({
  record, onClick,
}: { record: Design2DRecord; onClick: () => void }) {
  const col = deptColor(record.department || "");
  const ext = record.attach ? fileExt(record.attach) : "";
  const isViewable = ["pdf", "png", "jpg", "jpeg", "gif", "svg", "dxf", "dwg"].includes(ext);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      {/* Top: record ID + dept badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
            {record.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
            {record.project_name || record.project}
          </p>
        </div>
        {record.department && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${col.bg} ${col.text}`}>
            {record.department.replace("Design - ", "").replace(" - WTT", "")}
          </span>
        )}
      </div>

      {/* File preview area */}
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-3 flex items-center justify-center relative">
        {record.attach && (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "svg") ? (
          <img
            src={proxyUrl(record.attach)}
            alt={record.name}
            className="w-full h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : record.attach && ext === "pdf" ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Document
              file={proxyUrl(record.attach)}
              loading={<Loader2 className="w-5 h-5 animate-spin text-gray-300" />}
              onLoadError={() => {}}
            >
              <Page pageNumber={1} height={140} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
        ) : record.attach && (ext === "dxf" || ext === "dwg") ? (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${ext === "dwg" ? "bg-orange-50 border border-orange-200" : "bg-blue-50 border border-blue-200"}`}>
              <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
                <rect x="6" y="4" width="36" height="40" rx="4" fill={ext === "dwg" ? "#fed7aa" : "#bfdbfe"} opacity=".6" />
                <text x="24" y="30" textAnchor="middle" fill={ext === "dwg" ? "#c2410c" : "#1d4ed8"} fontSize="11" fontWeight="700" fontFamily="monospace">{ext.toUpperCase()}</text>
              </svg>
            </div>
            <span className={`text-xs font-semibold ${ext === "dwg" ? "text-orange-500" : "text-blue-500"}`}>{ext.toUpperCase()} Drawing</span>
          </div>
        ) : record.attach ? (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <FileText className="w-10 h-10" />
            <span className="text-xs font-mono uppercase">{ext || "file"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-200">
            <PenLine className="w-10 h-10" />
            <span className="text-xs text-gray-300">No attachment</span>
          </div>
        )}
        {isViewable && (
          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-blue-700 bg-white/90 px-3 py-1 rounded-full shadow">
              Open Viewer
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1">
        {record.revision && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Layers className="w-3 h-3 flex-shrink-0" />
            <span>{record.revision}</span>
          </div>
        )}
        {record.system_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{record.system_name}</span>
          </div>
        )}
        {record.attach && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{fileName(record.attach)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{formatDate(record.modified)}</span>
        </div>
      </div>
    </button>
  );
}

// ── FilterDropdown (matches Design 3D style) ──────────────────────────────────
function FilterDropdown({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFiltered = value !== "";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          isFiltered
            ? "bg-blue-50 border-blue-300 text-blue-700"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <span className="truncate max-w-[140px]">{value || label}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] max-h-64 overflow-auto py-1">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === "" ? "text-blue-700 bg-blue-50 font-medium" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            All {label}s
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                value === opt ? "text-blue-700 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Design2DPage() {
  const [records, setRecords] = useState<Design2DRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [viewer, setViewer] = useState<Design2DRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/design-2d`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projects = Array.from(
    new Set(records.map(r => r.project_name || r.project).filter(Boolean))
  ).sort();

  const departments = Array.from(
    new Set(records.map(r => r.department).filter(Boolean))
  ).sort();

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || (
      r.name.toLowerCase().includes(q) ||
      (r.tag || "").toLowerCase().includes(q) ||
      (r.project_name || "").toLowerCase().includes(q) ||
      (r.system_name || "").toLowerCase().includes(q) ||
      (r.revision || "").toLowerCase().includes(q)
    );
    const matchProject = !selectedProject || (r.project_name || r.project) === selectedProject;
    const matchDept = !selectedDept || r.department === selectedDept;
    return matchSearch && matchProject && matchDept;
  });

  const hasFilters = search || selectedProject || selectedDept;
  const clearFilters = () => { setSearch(""); setSelectedProject(""); setSelectedDept(""); };

  const openViewer = useCallback((r: Design2DRecord) => {
    if (!r.attach) return;
    const ext = fileExt(r.attach);
    if (["pdf", "png", "jpg", "jpeg", "gif", "svg", "dxf", "dwg"].includes(ext)) {
      setViewer(r);
    }
  }, []);

  const isPdf   = viewer?.attach ? fileExt(viewer.attach) === "pdf" : false;
  const isImage = viewer?.attach ? ["png","jpg","jpeg","gif","svg"].includes(fileExt(viewer.attach)) : false;
  const isDxf   = viewer?.attach ? fileExt(viewer.attach) === "dxf" : false;
  const isDwg   = viewer?.attach ? fileExt(viewer.attach) === "dwg" : false;

  const [imgViewMode,  setImgViewMode]  = useState<ViewMode>("normal");
  const [imgBgPreset,  setImgBgPreset]  = useState<BgPreset>("dark");
  const [imgRotate,    setImgRotate]    = useState(0);
  const [imgShowPanel, setImgShowPanel] = useState(true);
  const resetImageState = () => { setImgViewMode("normal"); setImgBgPreset("dark"); setImgRotate(0); setImgShowPanel(true); };

  return (
    <>
      {viewer && isPdf && (
        <PdfViewer src={proxyUrl(viewer.attach!)} record={viewer} onClose={() => setViewer(null)} />
      )}
      {viewer && isDxf && (
        <DxfFileViewer src={proxyUrl(viewer.attach!)} record={viewer} onClose={() => setViewer(null)} />
      )}
      {viewer && isDwg && (
        <DwgFileViewer src={proxyUrl(viewer.attach!)} record={viewer} onClose={() => setViewer(null)} />
      )}
      {viewer && isImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#16162a] border-b border-white/10 flex-shrink-0">
            <button onClick={() => { setViewer(null); resetImageState(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" /> Close
            </button>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{viewer.name}</p>
              <p className="text-xs text-gray-400 truncate">{viewer.project_name || viewer.project}</p>
            </div>
            <a href={proxyUrl(viewer.attach!)} download={viewer.name}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Download image">
              <Download className="w-4 h-4" />
            </a>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <ViewerSidebar
              viewMode={imgViewMode} setViewMode={setImgViewMode}
              bgPreset={imgBgPreset} setBgPreset={setImgBgPreset}
              rotate={imgRotate} setRotate={setImgRotate}
              showPanel={imgShowPanel} setShowPanel={setImgShowPanel}
              downloadSrc={proxyUrl(viewer.attach!)}
              recordName={viewer.name}
            />
            <div className={`flex-1 overflow-auto flex items-center justify-center p-6 transition-colors relative ${BG_CLASSES[imgBgPreset]}`}>
              <WttWatermark bg={imgBgPreset} />
              <img
                src={proxyUrl(viewer.attach!)}
                alt={viewer.name}
                style={{
                  transform: `rotate(${imgRotate}deg)`,
                  filter: viewFilter(imgViewMode),
                  transition: "transform 0.25s ease",
                }}
                className="max-w-full max-h-full object-contain shadow-2xl rounded"
              />
            </div>
            {imgShowPanel && (
              <div className="w-60 bg-[#16162a] border-l border-white/10 flex-shrink-0 overflow-auto flex flex-col">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Record Info</span>
                  </div>
                  <button onClick={() => setImgShowPanel(false)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Hide panel">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  {[
                    { label: "ID", value: viewer.name },
                    { label: "Project", value: viewer.project_name || viewer.project },
                    { label: "Department", value: viewer.department },
                    { label: "Revision", value: viewer.revision },
                    { label: "Tag", value: viewer.tag },
                    { label: "System Name", value: viewer.system_name },
                    { label: "Modified", value: formatDate(viewer.modified) },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-sm text-gray-200 break-words">{value}</p>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!viewer && <Layout>
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                <PenLine className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Design 2D</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  2D engineering drawings from ERPNext — click any record to open the viewer.
                </p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              label="Project"
              value={selectedProject}
              options={projects}
              onChange={v => { setSelectedProject(v); setViewer(null); }}
            />
            <FilterDropdown
              label="Department"
              value={selectedDept}
              options={departments}
              onChange={v => { setSelectedDept(v); setViewer(null); }}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="ml-auto text-sm text-gray-400">
              {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, tag, revision…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Table header */}
            <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_110px_110px_90px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Design No. / Tag</span>
              <span>Project</span>
              <span>Department</span>
              <span>Revision</span>
              <span>Modified</span>
              <span className="text-right">File</span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Fetching 2D designs from ERPNext…</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button onClick={load} className="text-sm text-blue-600 underline">Retry</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(r => {
                  const ext = r.attach ? fileExt(r.attach) : "";
                  const isViewable = ["pdf","png","jpg","jpeg","gif","svg","dxf","dwg"].includes(ext);
                  return (
                    <div
                      key={r.name}
                      onClick={() => openViewer(r)}
                      className={`min-w-[640px] grid grid-cols-[2fr_1fr_1fr_110px_110px_90px] gap-4 px-5 py-3.5 items-center transition-colors group ${
                        isViewable ? "hover:bg-gray-50 cursor-pointer" : "opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          <PenLine className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                            {r.name}
                          </p>
                          {r.tag && <p className="text-xs text-gray-400 truncate">{r.tag}</p>}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 font-medium truncate">{r.project_name || r.project || "—"}</p>
                        {r.project && r.project !== r.project_name && (
                          <p className="text-[10px] text-gray-400 font-mono truncate">{r.project}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{r.department || "—"}</p>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                        {r.revision || "—"}
                      </span>
                      <span className="text-xs text-gray-400">{r.modified ? formatDate(r.modified) : "—"}</span>
                      <div className="flex justify-end">
                        {isViewable ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                            View 2D
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <div className="py-12 text-center text-gray-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No 2D designs found</p>
                    <p className="text-xs mt-1 text-gray-300">2D designs are managed in ERPNext</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </Layout>}
    </>
  );
}
