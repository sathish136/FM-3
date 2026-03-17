import { Layout } from "@/components/Layout";
import {
  Layers, Eye, Share2, Download, ChevronLeft, ChevronRight,
  Plus, Loader2, FolderOpen, AlertCircle, Play, RefreshCw,
  FileText, ZoomIn, ZoomOut, PanelRight, Info, RotateCcw, X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Presentation {
  name: string;
  project: string;
  project_name: string;
  presentation_name: string;
  file_upload: string | null;
  modified: string;
  num_slides?: number;
  views?: number;
}

const SLIDE_COLORS = [
  { from: "#1a56db", to: "#1648c0" },
  { from: "#6d28d9", to: "#4c1d95" },
  { from: "#047857", to: "#065f46" },
  { from: "#b45309", to: "#92400e" },
  { from: "#7c3aed", to: "#5b21b6" },
  { from: "#0e7490", to: "#0c4a6e" },
];

const THUMB_COLORS = [
  "#1a56db",
  "#7c3aed",
  "#2d9b6f",
  "#c08a3a",
  "#6d28d9",
  "#0e7490",
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function fileExt(f: string) { return (f.split(".").pop() || "").toLowerCase(); }
function fileName(f: string) { return f.split("/").pop() || f; }
function proxyUrl(f: string) { return `${BASE}/api/file-proxy?url=${encodeURIComponent(f)}`; }

// Stable mock values derived from index
function mockSlides(idx: number) { return [4, 8, 12, 6][idx % 4]; }
function mockViews(idx: number) { return [24, 67, 142, 89][idx % 4]; }

// ── Full-screen PDF viewer ────────────────────────────────────────────────────
function PdfViewer({ src, pres, onClose }: { src: string; pres: Presentation; onClose: () => void }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [showPanel, setShowPanel] = useState(true);
  const [pdfErr, setPdfErr] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{pres.presentation_name || pres.name}</p>
          <p className="text-xs text-gray-400 truncate">{pres.project_name || pres.project}</p>
        </div>
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => setScale(1.2)} className="px-2 text-xs text-gray-300 w-12 text-center">{Math.round(scale * 100)}%</button>
          <button onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={() => setScale(1.2)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><RotateCcw className="w-3 h-3" /> Fit</button>
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-gray-400 w-24 text-center tabular-nums">{page} / {numPages}</span>
            <button onClick={() => setPage(p => Math.min(numPages!, p + 1))} disabled={page >= numPages} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        <button onClick={() => setShowPanel(s => !s)} className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}><PanelRight className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6">
          {pdfErr ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" /><p className="text-sm">Unable to render this file.</p>
            </div>
          ) : (
            <Document file={src}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPage(1); }}
              onLoadError={() => setPdfErr(true)}
              loading={<div className="flex items-center gap-2 text-gray-400 mt-20"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>}
            >
              <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer={false} className="shadow-2xl" />
            </Document>
          )}
        </div>
        {showPanel && (
          <div className="w-56 bg-gray-950 border-l border-gray-800 p-4 space-y-4 flex-shrink-0 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Info</span>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Presentation</p>
              <p className="text-sm text-white font-semibold leading-snug">{pres.presentation_name || pres.name}</p>
            </div>
            {pres.project_name && <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Project</p>
              <p className="text-sm text-gray-200">{pres.project_name}</p>
            </div>}
            {numPages && <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Slides</p>
              <p className="text-sm text-gray-200">{numPages}</p>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slide preview card ────────────────────────────────────────────────────────
function SlidePreviewCard({ pres, colorIdx }: { pres: Presentation; colorIdx: number }) {
  const color = SLIDE_COLORS[colorIdx % SLIDE_COLORS.length];
  const ext = pres.file_upload ? fileExt(pres.file_upload) : "";
  const isPdf = ext === "pdf";
  const src = pres.file_upload ? proxyUrl(pres.file_upload) : null;

  if (isPdf && src) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-inner">
        <Document file={src} loading={<Loader2 className="w-6 h-6 animate-spin text-gray-400" />} onLoadError={() => {}}>
          <Page pageNumber={1} height={320} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center p-8 text-white shadow-inner"
      style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
        <Layers className="w-6 h-6 text-white" />
      </div>
      <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-widest">
        {pres.project_name || pres.project || "Marketing & Project Performance"}
      </p>
      <h2 className="text-2xl font-bold text-center mb-2 leading-tight">
        {pres.presentation_name || pres.name}
      </h2>
      <p className="text-white/55 text-sm text-center mt-1 max-w-xs">
        {pres.file_upload
          ? fileName(pres.file_upload)
          : "Revenue targets, campaign results, and project milestones"}
      </p>
    </div>
  );
}

// ── Deck list item ────────────────────────────────────────────────────────────
function DeckListItem({
  pres, index, active, onClick,
}: { pres: Presentation; index: number; active: boolean; onClick: () => void }) {
  const slides = pres.num_slides ?? mockSlides(index);
  const views = pres.views ?? mockViews(index);
  const date = pres.modified ? formatDate(pres.modified) : "—";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
        active ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-blue-100" : "bg-gray-100"}`}>
          <Layers className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-500"}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-snug truncate ${active ? "text-blue-700" : "text-gray-800"}`}>
            {pres.presentation_name || pres.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {slides} slides · {date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 ml-2">
        <Eye className="w-3 h-3" />
        <span>{views}</span>
      </div>
    </button>
  );
}

// ── Thumbnail strip ───────────────────────────────────────────────────────────
function DeckThumb({ index, active, onClick }: { index: number; active: boolean; onClick: () => void }) {
  const bg = THUMB_COLORS[index % THUMB_COLORS.length];
  return (
    <button
      onClick={onClick}
      className={`rounded-lg overflow-hidden aspect-video flex items-center justify-center transition-all ${
        active ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-60 hover:opacity-90"
      }`}
      style={{ background: bg }}
    >
      <span className="text-white font-bold text-sm">{index + 1}</span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PresentationPage() {
  const [records, setRecords] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/presentations`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const list = Array.isArray(data) ? data : [];
      setRecords(list);
      setActiveIdx(0);
    } catch (e: any) {
      setError(e.message || "Failed to load presentations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = records[activeIdx] ?? null;
  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const handlePresent = () => {
    if (!active?.file_upload) return;
    const ext = fileExt(active.file_upload);
    if (ext === "pdf") {
      openViewer();
    } else {
      window.open(proxyUrl(active.file_upload), "_blank");
    }
  };

  return (
    <>
      {viewerOpen && active?.file_upload && (
        <PdfViewer src={proxyUrl(active.file_upload)} pres={active} onClose={closeViewer} />
      )}

      <Layout>
        <div className="p-6 space-y-6 max-w-7xl">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage slide decks</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-colors">
                <Plus className="w-4 h-4" /> New Deck
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Fetching presentations…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={load} className="text-sm text-blue-600 underline">Retry</button>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No presentations found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── Left panel ── */}
              <div className="lg:col-span-7 space-y-4">

                {/* Main deck card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  {/* Deck header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 truncate flex-1 min-w-0">
                      {active?.presentation_name || active?.name}
                    </h2>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={handlePresent}
                        disabled={!active?.file_upload}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Present
                      </button>
                      <button className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                      {active?.file_upload && (
                        <a
                          href={proxyUrl(active.file_upload)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Slide preview */}
                  {active && <SlidePreviewCard pres={active} colorIdx={activeIdx} />}

                  {/* Nav: arrows + dots */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                      disabled={activeIdx === 0}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {records.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIdx(i)}
                          className={`rounded-full transition-all ${
                            i === activeIdx ? "w-5 h-2 bg-blue-600" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveIdx(i => Math.min(records.length - 1, i + 1))}
                      disabled={activeIdx === records.length - 1}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* All slides thumbnails */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All Slides</p>
                  <div className="grid grid-cols-4 gap-2">
                    {records.map((_, i) => (
                      <DeckThumb key={i} index={i} active={i === activeIdx} onClick={() => setActiveIdx(i)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right panel: All Decks ── */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm h-full">
                  <h3 className="font-semibold text-gray-900 mb-4">All Decks</h3>
                  <div className="space-y-1">
                    {records.map((r, i) => (
                      <DeckListItem
                        key={r.name}
                        pres={r}
                        index={i}
                        active={i === activeIdx}
                        onClick={() => setActiveIdx(i)}
                      />
                    ))}
                  </div>
                  <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> New Presentation
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
