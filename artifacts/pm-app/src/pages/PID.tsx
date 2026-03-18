import { Layout } from "@/components/Layout";
import {
  GitBranch, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  Download, RotateCcw, FileText, Eye, FolderOpen,
  PanelRight, Info, Layers, Clock,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PIDRecord {
  name: string;
  project: string;
  project_name: string;
  revision: string;
  attach: string | null;
  modified: string;
}

interface ViewEntry { time: string; }

type PanelTab = "info" | "views" | "pages";

function proxyUrl(f: string) { return `${BASE}/api/file-proxy?url=${encodeURIComponent(f)}`; }
function fileName(f: string) { return f.split("/").pop() || f; }

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function formatViewTime(iso: string) {
  const d = new Date(iso);
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return formatDate(iso);
}

function formatViewFull(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ── Full-screen PDF viewer ───────────────────────────────────────────────────
function PdfViewer({ src, record }: { src: string; record: PIDRecord }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pdfError, setPdfError] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [views, setViews] = useState<ViewEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = `pid-views-${record.name}`;
    const existing: ViewEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [{ time: new Date().toISOString() }, ...existing].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(updated));
    setViews(updated);
  }, [record.name]);

  const tabs: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "views", label: "Views", icon: Eye },
    { key: "pages", label: "Pages", icon: Layers },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(1.2)}
            className="px-2 text-xs text-gray-300 hover:text-white tabular-nums w-12 text-center" title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale(s => Math.min(4, parseFloat((s + 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => setScale(1.2)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <RotateCcw className="w-3 h-3" /> Fit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex-1" />
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-20 text-center tabular-nums">{page} / {numPages}</span>
            <button onClick={() => setPage(p => Math.min(numPages!, p + 1))} disabled={page >= numPages}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="h-4 w-px bg-gray-700" />
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
        <div ref={scrollRef} className="flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6">
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this PDF.</p>
            </div>
          ) : (
            <Document
              file={src}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage(1); }}
              onLoadError={() => setPdfError(true)}
              loading={
                <div className="flex items-center gap-2 text-gray-400 mt-20">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading PDF…</span>
                </div>
              }
            >
              <Page pageNumber={page} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} className="shadow-2xl" />
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
                    activeTab === key ? "text-white border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-auto">

              {/* INFO tab */}
              {activeTab === "info" && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">P&amp;ID No.</p>
                    <p className="text-sm text-white font-semibold leading-snug">{record.name}</p>
                  </div>
                  {(record.project_name || record.project) && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Project</p>
                      <p className="text-sm text-gray-200">{record.project_name || record.project}</p>
                      {record.project && record.project !== record.project_name && (
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{record.project}</p>
                      )}
                    </div>
                  )}
                  {record.revision && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Revision</p>
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs font-semibold">
                        {record.revision}
                      </span>
                    </div>
                  )}
                  {record.modified && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Modified</p>
                      <p className="text-sm text-gray-200">{formatDate(record.modified)}</p>
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

              {/* VIEWS tab */}
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
                        <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                            Y
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-200 font-medium">You</p>
                            <p className="text-[10px] text-gray-500 truncate" title={formatViewFull(v.time)}>
                              {formatViewTime(v.time)}
                            </p>
                          </div>
                          {i === 0 && (
                            <span className="text-[9px] bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Latest
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PAGES tab */}
              {activeTab === "pages" && (
                <div className="p-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-1">
                    {numPages ? `${numPages} page${numPages !== 1 ? "s" : ""}` : "Loading…"}
                  </p>
                  {numPages && (
                    <Document file={src} loading={null} onLoadError={() => {}}>
                      <div className="space-y-1.5">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                          <button
                            key={pg}
                            onClick={() => setPage(pg)}
                            className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${
                              pg === page ? "border-indigo-500" : "border-transparent hover:border-gray-700"
                            }`}
                          >
                            <div className="bg-white overflow-hidden flex items-center justify-center">
                              <Page pageNumber={pg} width={220} renderTextLayer={false} renderAnnotationLayer={false} />
                            </div>
                            <div className={`py-1 px-2 flex items-center justify-between ${pg === page ? "bg-indigo-900" : "bg-gray-800"}`}>
                              <span className={`text-[10px] font-medium ${pg === page ? "text-indigo-200" : "text-gray-400"}`}>
                                Page {pg}
                              </span>
                              {pg === page && <span className="text-[9px] text-indigo-300">Current</span>}
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

// ── Full-screen viewer overlay ───────────────────────────────────────────────
function FileViewer({
  record, filtered, currentIndex, onClose, onNavigate,
}: {
  record: PIDRecord;
  filtered: PIDRecord[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const src = record.attach ? proxyUrl(record.attach) : null;

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{record.name}</p>
            <p className="text-xs text-gray-400 truncate">
              {record.project_name || record.project}
              {record.revision ? ` · ${record.revision}` : ""}
            </p>
          </div>
        </div>
        {record.attach && (
          <a
            href={proxyUrl(record.attach)}
            download={fileName(record.attach)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
        )}
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <span className="text-xs text-gray-600 mr-1">P&amp;ID</span>
            <button onClick={() => onNavigate(currentIndex - 1)} disabled={currentIndex === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center tabular-nums">
              {currentIndex + 1} / {filtered.length}
            </span>
            <button onClick={() => onNavigate(currentIndex + 1)} disabled={currentIndex === filtered.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {!src ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No file attached to this record</p>
          </div>
        ) : (
          <PdfViewer key={src} src={src} record={record} />
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PID() {
  const [records, setRecords] = useState<PIDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/pid`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.project || "").toLowerCase().includes(q) ||
      (r.project_name || "").toLowerCase().includes(q) ||
      (r.revision || "").toLowerCase().includes(q)
    );
  });

  const openViewer = useCallback((idx: number) => setViewerIndex(idx), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  return (
    <>
      {viewerIndex !== null && filtered[viewerIndex] && (
        <FileViewer
          record={filtered[viewerIndex]}
          filtered={filtered}
          currentIndex={viewerIndex}
          onClose={closeViewer}
          onNavigate={setViewerIndex}
        />
      )}

      <Layout>
        <div className="min-h-full bg-gray-50 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">P&amp;ID Process</h1>
                <p className="text-xs text-gray-400">Piping &amp; Instrumentation Diagrams from ERPNext</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, project, revision…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <span className="ml-auto text-sm text-gray-400">
              {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_2fr_120px_120px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>P&amp;ID No.</span>
              <span>Project</span>
              <span>Revision</span>
              <span>Modified</span>
              <span className="text-right">Action</span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Fetching P&amp;ID records from ERPNext…</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button onClick={fetchRecords} className="text-sm text-indigo-600 underline">Retry</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((r, idx) => (
                  <div
                    key={r.name}
                    className="grid grid-cols-[2fr_2fr_120px_120px_100px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                        {r.name}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 font-medium truncate">{r.project_name || r.project || "—"}</p>
                      {r.project && r.project !== r.project_name && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{r.project}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                      {r.revision || "—"}
                    </span>
                    <span className="text-xs text-gray-400">{r.modified ? formatDate(r.modified) : "—"}</span>
                    <div className="flex justify-end">
                      {r.attach ? (
                        <button
                          onClick={() => openViewer(idx)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="py-14 text-center text-gray-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No P&amp;ID records found</p>
                    <p className="text-xs mt-1 text-gray-300">Records are managed in ERPNext</p>
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
