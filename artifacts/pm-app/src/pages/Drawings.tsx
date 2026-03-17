import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import {
  Cog, Zap, Building2, FolderOpen, FileText,
  Search, RefreshCw, Loader2, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function proxyUrl(attach: string) {
  return `${BASE}/api/file-proxy?url=${encodeURIComponent(attach)}`;
}

function PdfViewer({ src }: { src: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {pdfError ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
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
              renderTextLayer={true}
              renderAnnotationLayer={false}
              className="shadow-2xl"
            />
          </Document>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4" /> Close
        </button>

        <div className="h-5 w-px bg-gray-700" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{drawing.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {drawing.project_name || drawing.project}
            {drawing.revision ? ` · ${drawing.revision}` : ""}
            {drawing.tag ? ` · ${drawing.tag}` : ""}
          </p>
        </div>

        {/* Navigator */}
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
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
          <div className="h-full flex items-center justify-center p-6 overflow-auto">
            <img
              src={src}
              alt={drawing.name}
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
            />
          </div>
        ) : isPdf ? (
          <PdfViewer key={src} src={src} />
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
