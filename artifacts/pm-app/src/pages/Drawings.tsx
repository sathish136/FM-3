import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import {
  Cog, Zap, Building2, FolderOpen, FileText,
  Search, RefreshCw, Loader2, X, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Highlighter, PanelRight, Eye, Info, Layers,
  Clock, RotateCcw,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPES = {
  mechanical: {
    label: "Design Mechanical",
    icon: Cog,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    accentCls: "bg-blue-600",
    department: "Mechanical",
    description: "Mechanical engineering drawings, P&ID diagrams, equipment layouts and process designs.",
  },
  electrical: {
    label: "Design Electrical",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    accentCls: "bg-amber-500",
    department: "Electrical",
    description: "Electrical single line diagrams, panel layouts, cable schedules and control schematics.",
  },
  civil: {
    label: "Design Civil",
    icon: Building2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accentCls: "bg-emerald-600",
    department: "Civil",
    description: "Civil and structural drawings, foundation plans, site layouts and architectural designs.",
  },
};

interface Drawing {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  attach: string | null;
  modified: string;
}

interface ViewEntry {
  time: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatViewTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function formatViewFull(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function proxyUrl(attach: string) {
  return `${BASE}/api/file-proxy?url=${encodeURIComponent(attach)}`;
}

type PanelTab = "info" | "views" | "pages";

function PdfViewer({ src, drawing }: { src: string; drawing: Drawing }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [views, setViews] = useState<ViewEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = `doc-views-${drawing.name}`;
    const existing: ViewEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    const newView: ViewEntry = { time: new Date().toISOString() };
    const updated = [newView, ...existing].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(updated));
    setViews(updated);
  }, [drawing.name]);

  function zoomIn() { setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1)))); }
  function zoomOut() { setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1)))); }
  function resetZoom() { setScale(1.2); }

  const tabs: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "views", label: "Views", icon: Eye },
    { key: "pages", label: "Pages", icon: Layers },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 text-xs text-gray-300 hover:text-white tabular-nums w-12 text-center"
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={resetZoom}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Reset zoom"
        >
          <RotateCcw className="w-3 h-3" /> Fit
        </button>

        <div className="h-4 w-px bg-gray-700" />

        {/* Highlight toggle */}
        <button
          onClick={() => setHighlightMode(h => !h)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            highlightMode
              ? "bg-yellow-400 text-gray-900"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Toggle highlight mode"
        >
          <Highlighter className="w-3.5 h-3.5" />
          Highlight
        </button>

        <div className="flex-1" />

        {/* Page navigation */}
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-24 text-center tabular-nums">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))}
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-gray-700" />

        {/* Panel toggle */}
        <button
          onClick={() => setShowPanel(s => !s)}
          className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
          title="Toggle info panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF scroll area */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6 ${highlightMode ? "select-text" : "select-none"}`}
          style={highlightMode ? { cursor: "text" } : {}}
        >
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this PDF.</p>
            </div>
          ) : (
            <Document
              file={src}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
              onLoadError={() => setPdfError(true)}
              loading={
                <div className="flex items-center gap-2 text-gray-400 mt-20">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading PDF…</span>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                className="shadow-2xl"
              />
            </Document>
          )}
        </div>

        {/* Right panel */}
        {showPanel && (
          <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                    activeTab === key
                      ? "text-white border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-auto">
              {/* INFO */}
              {activeTab === "info" && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Drawing No.</p>
                    <p className="text-sm text-white font-semibold leading-snug">{drawing.name}</p>
                  </div>
                  {drawing.project_name && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Project</p>
                      <p className="text-sm text-gray-200">{drawing.project_name}</p>
                      {drawing.project && drawing.project !== drawing.project_name && (
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{drawing.project}</p>
                      )}
                    </div>
                  )}
                  {drawing.department && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Department</p>
                      <p className="text-sm text-gray-200">{drawing.department}</p>
                    </div>
                  )}
                  {drawing.revision && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Revision</p>
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs font-semibold">
                        {drawing.revision}
                      </span>
                    </div>
                  )}
                  {drawing.tag && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Tag</p>
                      <p className="text-sm text-gray-200">{drawing.tag}</p>
                    </div>
                  )}
                  {drawing.modified && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Modified</p>
                      <p className="text-sm text-gray-200">{formatDate(drawing.modified)}</p>
                    </div>
                  )}
                  {numPages !== null && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Total Pages</p>
                      <p className="text-sm text-gray-200">{numPages}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Quick Actions</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setHighlightMode(h => !h)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          highlightMode ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        }`}
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                        {highlightMode ? "Highlight mode ON" : "Enable highlight"}
                      </button>
                      <button
                        onClick={() => setActiveTab("views")}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        View history ({views.length})
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEWS */}
              {activeTab === "views" && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest">View History</p>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{views.length}</span>
                  </div>
                  {views.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-6">No views recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {views.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            Y
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-200 font-medium">You</p>
                            <p className="text-[10px] text-gray-500 truncate" title={formatViewFull(v.time)}>
                              {formatViewTime(v.time)}
                            </p>
                          </div>
                          {i === 0 && (
                            <span className="text-[9px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Latest
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PAGES */}
              {activeTab === "pages" && (
                <div className="p-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-1">
                    {numPages ? `${numPages} pages` : "Loading…"}
                  </p>
                  {numPages && (
                    <Document
                      file={src}
                      loading={null}
                      onLoadError={() => {}}
                    >
                      <div className="space-y-1.5">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                          <button
                            key={pg}
                            onClick={() => setPageNumber(pg)}
                            className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${
                              pg === pageNumber
                                ? "border-blue-500"
                                : "border-transparent hover:border-gray-700"
                            }`}
                          >
                            <div className="bg-white overflow-hidden flex items-center justify-center">
                              <Page
                                pageNumber={pg}
                                width={220}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </div>
                            <div className={`py-1 px-2 flex items-center justify-between ${pg === pageNumber ? "bg-blue-900" : "bg-gray-800"}`}>
                              <span className={`text-[10px] font-medium ${pg === pageNumber ? "text-blue-200" : "text-gray-400"}`}>
                                Page {pg}
                              </span>
                              {pg === pageNumber && (
                                <span className="text-[9px] text-blue-300">Current</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </Document>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileViewer({
  drawing,
  filtered,
  currentIndex,
  onClose,
  onNavigate,
}: {
  drawing: Drawing;
  filtered: Drawing[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const src = drawing.attach ? proxyUrl(drawing.attach) : null;
  const isPdf = drawing.attach?.toLowerCase().includes(".pdf") || false;
  const isImage = drawing.attach
    ? /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(drawing.attach)
    : false;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < filtered.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, filtered.length, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" /> Close
        </button>

        <div className="h-5 w-px bg-gray-700" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{drawing.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {drawing.project_name || drawing.project}
            {drawing.revision ? ` · Rev ${drawing.revision}` : ""}
            {drawing.tag ? ` · ${drawing.tag}` : ""}
          </p>
        </div>

        {/* Drawing navigator */}
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <span className="text-xs text-gray-600 mr-1">Drawing</span>
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center">
              {currentIndex + 1} / {filtered.length}
            </span>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === filtered.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Viewer area */}
      <div className="flex-1 overflow-hidden">
        {!src ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No file attached to this drawing</p>
          </div>
        ) : isImage ? (
          <div className="h-full flex items-center justify-center p-6 overflow-auto bg-gray-900">
            <img
              src={src}
              alt={drawing.name}
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
          </div>
        ) : isPdf ? (
          <PdfViewer key={src} src={src} drawing={drawing} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
            <FileText className="w-12 h-12 opacity-30" />
            <p className="text-sm">Cannot preview this file type.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Drawings() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const type = location.endsWith("electrical")
    ? "electrical"
    : location.endsWith("civil")
    ? "civil"
    : "mechanical";

  const cfg = TYPES[type];
  const Icon = cfg.icon;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE}/api/drawings?department=${encodeURIComponent(cfg.department)}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDrawings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load drawings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setViewerIndex(null);
    load();
  }, [type]);

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.tag || "").toLowerCase().includes(q) ||
      (d.project_name || "").toLowerCase().includes(q) ||
      (d.revision || "").toLowerCase().includes(q)
    );
  });

  const openViewer = useCallback((idx: number) => setViewerIndex(idx), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  return (
    <>
      {viewerIndex !== null && filtered[viewerIndex] && (
        <FileViewer
          drawing={filtered[viewerIndex]}
          filtered={filtered}
          currentIndex={viewerIndex}
          onClose={closeViewer}
          onNavigate={setViewerIndex}
        />
      )}

      <Layout>
        <div className="p-6 space-y-5 max-w-6xl">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{cfg.label}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{cfg.description}</p>
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

          {/* Table card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search drawings..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <span className="text-sm text-gray-400 ml-auto">
                {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_130px_110px_90px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Drawing / Tag</span>
              <span>Project</span>
              <span>Revision</span>
              <span>Modified</span>
              <span className="text-right">File</span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Fetching drawings from ERPNext…</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button onClick={load} className="text-sm text-blue-600 underline">Retry</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((d, idx) => (
                  <div
                    key={d.name}
                    onClick={() => openViewer(idx)}
                    className="grid grid-cols-[2fr_1fr_130px_110px_90px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center flex-shrink-0`}>
                        <FileText className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">{d.name}</p>
                        {d.tag && (
                          <p className="text-xs text-gray-400 truncate">{d.tag}</p>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 font-medium truncate">{d.project_name || d.project || "—"}</p>
                      {d.project && d.project !== d.project_name && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{d.project}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                      {d.revision || "—"}
                    </span>
                    <span className="text-xs text-gray-400">{d.modified ? formatDate(d.modified) : "—"}</span>
                    <div className="flex justify-end">
                      {d.attach ? (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                          View
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && !loading && (
                  <div className="py-12 text-center text-gray-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No {cfg.department} drawings found</p>
                    <p className="text-xs mt-1 text-gray-300">Drawings are managed in ERPNext</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
