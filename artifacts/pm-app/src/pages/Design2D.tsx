import { Layout } from "@/components/Layout";
import {
  PenLine, FolderOpen, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  PanelRight, FileText, Layers, Building2,
  Calendar, Info, Download, Eye, EyeOff, Maximize2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { DxfViewer as DxfViewerLib, type LayerInfo } from "dxf-viewer";

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
type ViewMode = "normal" | "invert";

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

// ── Left Sidebar (shared by PDF and Image viewer) ────────────────────────────
interface ViewerSidebarProps {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  bgPreset: BgPreset;
  setBgPreset: (v: BgPreset) => void;
  scale?: number;
  setScale?: (fn: (s: number) => number) => void;
  rotate?: number;
  setRotate?: (fn: (r: number) => number) => void;
  showPanel?: boolean;
  setShowPanel?: (fn: (v: boolean) => boolean) => void;
  numPages?: number | null;
  page?: number;
  setPage?: (fn: (p: number) => number) => void;
}

function ViewerSidebar({
  viewMode, setViewMode,
  bgPreset, setBgPreset,
  scale, setScale,
  rotate, setRotate,
  showPanel, setShowPanel,
  numPages, page, setPage,
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
      <TbSection label="BG" />

      <ToolBtn title="Dark background" active={bgPreset === "dark"} onClick={() => setBgPreset("dark")}>
        <div className="w-5 h-5 rounded-full bg-[#0f0f1a] border border-white/30" />
      </ToolBtn>
      <ToolBtn title="Navy background" active={bgPreset === "navy"} onClick={() => setBgPreset("navy")}>
        <div className="w-5 h-5 rounded-full bg-[#1a1a2e] border border-white/30" />
      </ToolBtn>
      <ToolBtn title="Light background" active={bgPreset === "light"} onClick={() => setBgPreset("light")}>
        <div className="w-5 h-5 rounded-full bg-[#dde3ee] border border-black/20" />
      </ToolBtn>
      <ToolBtn title="White background" active={bgPreset === "white"} onClick={() => setBgPreset("white")}>
        <div className="w-5 h-5 rounded-full bg-white border border-black/20" />
      </ToolBtn>

      {setScale && (
        <>
          <TbDivider />
          <TbSection label="Zoom" />

          <ToolBtn title="Zoom in" onClick={() => setScale(s => Math.min(4, parseFloat((s + 0.2).toFixed(1))))}>
            <ZoomIn className="w-4 h-4" />
          </ToolBtn>

          <ToolBtn title="Fit (reset zoom)" onClick={() => setScale(() => 1.2)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="3" width="14" height="14" rx="1" />
              <polyline points="7,3 3,3 3,7" />
              <polyline points="13,3 17,3 17,7" />
              <polyline points="3,13 3,17 7,17" />
              <polyline points="17,13 17,17 13,17" />
            </svg>
          </ToolBtn>

          <ToolBtn title="Zoom out" onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}>
            <ZoomOut className="w-4 h-4" />
          </ToolBtn>
        </>
      )}

      {setRotate && (
        <>
          <TbDivider />
          <TbSection label="Rotate" />

          <ToolBtn title="Rotate counter-clockwise" onClick={() => setRotate(r => (r - 90 + 360) % 360)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4.5 10a5.5 5.5 0 1 0 1.2-3.4" />
              <polyline points="2,4 4.5,6.5 7,4" />
            </svg>
          </ToolBtn>

          <ToolBtn title="Rotate clockwise" onClick={() => setRotate(r => (r + 90) % 360)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.5 10a5.5 5.5 0 1 1-1.2-3.4" />
              <polyline points="18,4 15.5,6.5 13,4" />
            </svg>
          </ToolBtn>
        </>
      )}

      {numPages != null && setPage && page != null && (
        <>
          <TbDivider />
          <TbSection label="Pages" />

          <ToolBtn title="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </ToolBtn>

          <div className="text-[9px] text-gray-400 tabular-nums text-center leading-tight py-0.5 select-none">
            {page}<br /><span className="text-gray-600">/{numPages}</span>
          </div>

          <ToolBtn title="Next page" onClick={() => setPage(p => Math.min(numPages!, p + 1))}>
            <ChevronRight className="w-4 h-4" />
          </ToolBtn>
        </>
      )}

      {setShowPanel && showPanel != null && (
        <>
          <TbDivider />
          <TbSection label="Info" />

          <ToolBtn title="Toggle info panel" active={showPanel} onClick={() => setShowPanel(v => !v)}>
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
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [bgPreset, setBgPreset] = useState<BgPreset>("dark");
  const [blackWhite, setBlackWhite] = useState(false);

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
      progressCbk: (phase, processed, total) => {
        if (total > 0) setProgress(Math.round((processed / total) * 100));
      },
    }).then(() => {
      const ls = [...viewer.GetLayers()];
      setLayers(ls);
      setLoadState("ready");
    }).catch(() => {
      setLoadState("error");
    });

    return () => { viewer.Destroy(); viewerRef.current = null; };
  }, [src]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

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
    const cam = v.GetCamera();
    const size = Math.max(cam.right - cam.left, cam.top - cam.bottom);
    v.FitView(-size, size, -size, size, 0.05);
  };

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
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}</p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge === "DWG" ? "bg-orange-900/40 text-orange-300 border-orange-700/30" : "bg-blue-900/40 text-blue-300 border-blue-700/30"}`}>{badge}</span>
        <a
          href={downloadSrc || src}
          download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title={`Download ${badge} file`}
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        <aside className="w-12 bg-[#16162a] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 flex-shrink-0 overflow-y-auto">
          <TbSection label="View" />

          <ToolBtn title="Normal colors" active={!blackWhite} onClick={() => setBlackWhite(false)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor"><circle cx="10" cy="10" r="7" /></svg>
          </ToolBtn>
          <ToolBtn title="Black & White" active={blackWhite} onClick={() => setBlackWhite(true)}>
            <svg viewBox="0 0 20 20" className="w-5 h-5">
              <path fill="currentColor" d="M10 3a7 7 0 1 1 0 14V3z" />
              <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M10 3a7 7 0 1 0 0 14" />
            </svg>
          </ToolBtn>

          <TbDivider />
          <TbSection label="BG" />
          <ToolBtn title="Dark background" active={bgPreset === "dark"} onClick={() => setBgPreset("dark")}>
            <div className="w-5 h-5 rounded-full bg-[#0f0f1a] border border-white/30" />
          </ToolBtn>
          <ToolBtn title="Navy background" active={bgPreset === "navy"} onClick={() => setBgPreset("navy")}>
            <div className="w-5 h-5 rounded-full bg-[#1a1a2e] border border-white/30" />
          </ToolBtn>
          <ToolBtn title="Light background" active={bgPreset === "light"} onClick={() => setBgPreset("light")}>
            <div className="w-5 h-5 rounded-full bg-[#dde3ee] border border-black/20" />
          </ToolBtn>
          <ToolBtn title="White background" active={bgPreset === "white"} onClick={() => setBgPreset("white")}>
            <div className="w-5 h-5 rounded-full bg-white border border-black/20" />
          </ToolBtn>

          <TbDivider />
          <TbSection label="Fit" />
          <ToolBtn title="Fit to view" onClick={fitView}>
            <Maximize2 className="w-4 h-4" />
          </ToolBtn>

          <TbDivider />
          <TbSection label="Info" />
          <ToolBtn title="Toggle info panel" active={showPanel} onClick={() => setShowPanel(v => !v)}>
            <PanelRight className="w-4 h-4" />
          </ToolBtn>
        </aside>

        {/* DXF canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ background: DXF_BG_COLORS[bgPreset] }}>
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ filter: blackWhite ? "invert(1) hue-rotate(180deg)" : undefined }}
          />
          {loadState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Parsing DXF file… {progress > 0 ? `${progress}%` : ""}</p>
            </div>
          )}
          {loadState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Unable to render this DXF file.</p>
              <a href={src} download className="text-xs text-blue-400 underline flex items-center gap-1">
                <Download className="w-3 h-3" /> Download instead
              </a>
            </div>
          )}
        </div>

        {/* Info + layers panel */}
        {showPanel && (
          <div className="w-64 bg-[#16162a] border-l border-white/10 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-4 space-y-3 overflow-auto flex-1">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Record Info</span>
              </div>
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

// ── DWG Viewer (ShareCAD online embed + download fallback) ────────────────────
function DwgFileViewer({
  src, record, onClose,
}: { src: string; record: Design2DRecord; onClose: () => void }) {
  const [showPanel, setShowPanel] = useState(true);
  const [embedErr, setEmbedErr] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const publicFileUrl = window.location.origin + src;
  const shareCadUrl = `https://sharecad.org/cadframe/load?url=${encodeURIComponent(publicFileUrl)}`;

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
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}</p>
        </div>
        <span className="text-[10px] font-mono bg-orange-900/40 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded">DWG</span>
        <a href={src} download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Download DWG file">
          <Download className="w-4 h-4" />
        </a>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-12 bg-[#16162a] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 flex-shrink-0">
          <TbSection label="Info" />
          <ToolBtn title="Toggle info panel" active={showPanel} onClick={() => setShowPanel(v => !v)}>
            <PanelRight className="w-4 h-4" />
          </ToolBtn>
        </aside>

        {/* Viewer */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {!embedErr ? (
            <iframe
              src={shareCadUrl}
              className="w-full h-full border-0"
              title={record.name}
              allow="fullscreen"
              onError={() => setEmbedErr(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="max-w-md mx-auto text-center p-8">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700 mb-2">Unable to load viewer</h3>
                <a href={src} download
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Download DWG file
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-60 bg-[#16162a] border-l border-white/10 p-4 space-y-4 flex-shrink-0 overflow-auto">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Record Info</span>
            </div>
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && numPages && page < numPages) setPage(p => p + 1);
      if (e.key === "ArrowLeft" && page > 1) setPage(p => p - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, page, numPages]);

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
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}</p>
        </div>
        {/* Zoom indicator in header */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg px-2 py-1">
          <span className="text-xs text-gray-400 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
        </div>
        {/* Page indicator in header */}
        {numPages && (
          <span className="text-xs text-gray-400 tabular-nums">{page} / {numPages}</span>
        )}
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
        />

        {/* Document area */}
        <div className={`flex-1 overflow-auto flex items-start justify-center p-6 transition-colors ${bgClass}`}>
          {pdfErr ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this file.</p>
            </div>
          ) : (
            <div style={{ filter: viewMode === "invert" ? "invert(1) hue-rotate(180deg)" : undefined }}>
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
            </div>
          )}
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-60 bg-[#16162a] border-l border-white/10 p-4 space-y-4 flex-shrink-0 overflow-auto">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Record Info</span>
            </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Design2DPage() {
  const [records, setRecords] = useState<Design2DRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [viewer, setViewer] = useState<Design2DRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (deptFilter) params.set("department", deptFilter);
      const res = await fetch(`${BASE}/api/design-2d?${params}`);
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

  useEffect(() => { load(); }, [deptFilter]);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.project_name || "").toLowerCase().includes(q) ||
      (r.project || "").toLowerCase().includes(q) ||
      (r.department || "").toLowerCase().includes(q) ||
      (r.system_name || "").toLowerCase().includes(q) ||
      (r.tag || "").toLowerCase().includes(q)
    );
  });

  const departments = [...new Set(records.map(r => r.department).filter(Boolean))].sort();

  const openViewer = useCallback((r: Design2DRecord) => {
    if (!r.attach) return;
    const ext = fileExt(r.attach);
    if (["pdf", "png", "jpg", "jpeg", "gif", "svg", "dxf", "dwg"].includes(ext)) {
      setViewer(r);
    }
  }, []);

  const isPdf = viewer?.attach ? fileExt(viewer.attach) === "pdf" : false;
  const isImage = viewer?.attach
    ? ["png", "jpg", "jpeg", "gif", "svg"].includes(fileExt(viewer.attach))
    : false;
  const isDxf = viewer?.attach ? fileExt(viewer.attach) === "dxf" : false;
  const isDwg = viewer?.attach ? fileExt(viewer.attach) === "dwg" : false;

  // Image viewer state
  const [imgViewMode, setImgViewMode] = useState<ViewMode>("normal");
  const [imgBgPreset, setImgBgPreset] = useState<BgPreset>("dark");
  const [imgRotate, setImgRotate] = useState(0);

  const resetImageState = () => {
    setImgViewMode("normal");
    setImgBgPreset("dark");
    setImgRotate(0);
  };

  return (
    <>
      {/* PDF Fullscreen viewer */}
      {viewer && isPdf && (
        <PdfViewer
          src={proxyUrl(viewer.attach!)}
          record={viewer}
          onClose={() => setViewer(null)}
        />
      )}

      {/* DXF Fullscreen viewer */}
      {viewer && isDxf && (
        <DxfFileViewer
          src={proxyUrl(viewer.attach!)}
          record={viewer}
          onClose={() => setViewer(null)}
        />
      )}

      {/* DWG Fullscreen viewer */}
      {viewer && isDwg && (
        <DwgFileViewer
          src={proxyUrl(viewer.attach!)}
          record={viewer}
          onClose={() => setViewer(null)}
        />
      )}

      {/* Image fullscreen viewer */}
      {viewer && isImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#16162a] border-b border-white/10 flex-shrink-0">
            <button onClick={() => { setViewer(null); resetImageState(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" /> Close
            </button>
            <div className="h-5 w-px bg-white/10" />
            <p className="text-sm font-semibold text-white truncate flex-1">{viewer.name}</p>
            <p className="text-xs text-gray-400">{viewer.project_name || viewer.project}</p>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Toolbar */}
            <ViewerSidebar
              viewMode={imgViewMode} setViewMode={setImgViewMode}
              bgPreset={imgBgPreset} setBgPreset={setImgBgPreset}
              rotate={imgRotate} setRotate={setImgRotate}
            />

            {/* Image area */}
            <div className={`flex-1 overflow-auto flex items-center justify-center p-6 transition-colors ${BG_CLASSES[imgBgPreset]}`}>
              <img
                src={proxyUrl(viewer.attach!)}
                alt={viewer.name}
                style={{
                  transform: `rotate(${imgRotate}deg)`,
                  filter: imgViewMode === "invert" ? "invert(1) hue-rotate(180deg)" : undefined,
                  transition: "transform 0.25s ease",
                }}
                className="max-w-full max-h-full object-contain shadow-2xl rounded"
              />
            </div>
          </div>
        </div>
      )}

      <Layout>
        <div className="p-6 space-y-6 max-w-7xl">

          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                <PenLine className="w-6 h-6 text-blue-600" />
                Design 2D
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">2D engineering drawings and design documents</p>
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, project, department…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-40"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Stats bar */}
          {!loading && !error && records.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span><strong className="text-gray-900">{filtered.length}</strong> of {records.length} records</span>
              {deptFilter && (
                <button onClick={() => setDeptFilter("")}
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Fetching Design 2D records…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={load} className="text-sm text-blue-600 underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search || deptFilter ? "No records match your search" : "No Design 2D records found"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(r => (
                <RecordCard key={r.name} record={r} onClick={() => openViewer(r)} />
              ))}
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
