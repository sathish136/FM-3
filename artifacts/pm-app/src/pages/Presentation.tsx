import { Layout } from "@/components/Layout";
import {
  MonitorPlay, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, FolderOpen, AlertCircle,
  FileText, ZoomIn, ZoomOut, RotateCcw, PanelRight,
  Eye, Info, Layers, ChevronDown, FilterX, Clock,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
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
  attach: string | null;
  modified: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function formatViewTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

function proxyUrl(attach: string) {
  return `${BASE}/api/file-proxy?url=${encodeURIComponent(attach)}`;
}

function fileExt(attach: string) {
  return (attach.split(".").pop() || "").toLowerCase();
}

function fileName(attach: string) {
  return attach.split("/").pop() || attach;
}

type PanelTab = "info" | "views" | "pages";

function PdfViewer({ src, pres }: { src: string; pres: Presentation }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [views, setViews] = useState<{ time: string }[]>([]);

  useEffect(() => {
    const key = `pres-views-${pres.name}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [{ time: new Date().toISOString() }, ...existing].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(updated));
    setViews(updated);
  }, [pres.name]);

  const tabs: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "views", label: "Views", icon: Eye },
    { key: "pages", label: "Pages", icon: Layers },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(1.2)} className="px-2 text-xs text-gray-300 hover:text-white tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => setScale(1.2)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <RotateCcw className="w-3 h-3" /> Fit
        </button>
        <div className="flex-1" />
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-24 text-center tabular-nums">{pageNumber} / {numPages}</span>
            <button onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))} disabled={pageNumber >= numPages} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="h-4 w-px bg-gray-700" />
        <button onClick={() => setShowPanel(s => !s)} className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`} title="Info panel">
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* PDF area */}
        <div className="flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6">
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this file.</p>
            </div>
          ) : (
            <Document
              file={src}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
              onLoadError={() => setPdfError(true)}
              loading={<div className="flex items-center gap-2 text-gray-400 mt-20"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading presentation…</span></div>}
            >
              <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} className="shadow-2xl" />
            </Document>
          )}
        </div>

        {/* Right panel */}
        {showPanel && (
          <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
            <div className="flex border-b border-gray-800">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${activeTab === key ? "text-white border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto">
              {activeTab === "info" && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Presentation</p>
                    <p className="text-sm text-white font-semibold leading-snug">{pres.presentation_name || pres.name}</p>
                  </div>
                  {pres.project_name && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Project</p>
                      <p className="text-sm text-gray-200">{pres.project_name}</p>
                      {pres.project && pres.project !== pres.project_name && (
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{pres.project}</p>
                      )}
                    </div>
                  )}
                  {pres.attach && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">File</p>
                      <p className="text-xs text-gray-400 break-all">{fileName(pres.attach)}</p>
                    </div>
                  )}
                  {pres.modified && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Last Modified</p>
                      <p className="text-sm text-gray-200">{formatDate(pres.modified)}</p>
                    </div>
                  )}
                  {numPages !== null && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Total Slides</p>
                      <p className="text-sm text-gray-200">{numPages}</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "views" && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest">View History</p>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{views.length}</span>
                  </div>
                  {views.map((v, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">Y</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-200 font-medium">You</p>
                        <p className="text-[10px] text-gray-500">{formatViewTime(v.time)}</p>
                      </div>
                      {i === 0 && <span className="text-[9px] bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Latest</span>}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "pages" && numPages && (
                <div className="p-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-1">{numPages} slides</p>
                  <Document file={src} loading={null} onLoadError={() => {}}>
                    <div className="space-y-1.5">
                      {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                        <button key={pg} onClick={() => setPageNumber(pg)}
                          className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${pg === pageNumber ? "border-indigo-500" : "border-transparent hover:border-gray-700"}`}
                        >
                          <div className="bg-white overflow-hidden flex items-center justify-center">
                            <Page pageNumber={pg} width={220} renderTextLayer={false} renderAnnotationLayer={false} />
                          </div>
                          <div className={`py-1 px-2 flex items-center justify-between ${pg === pageNumber ? "bg-indigo-900" : "bg-gray-800"}`}>
                            <span className={`text-[10px] font-medium ${pg === pageNumber ? "text-indigo-200" : "text-gray-400"}`}>Slide {pg}</span>
                            {pg === pageNumber && <span className="text-[9px] text-indigo-300">Current</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Document>
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
  pres, filtered, currentIndex, onClose, onNavigate,
}: {
  pres: Presentation; filtered: Presentation[]; currentIndex: number;
  onClose: () => void; onNavigate: (idx: number) => void;
}) {
  const src = pres.attach ? proxyUrl(pres.attach) : null;
  const ext = pres.attach ? fileExt(pres.attach) : "";
  const isPdf = ext === "pdf";

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
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{pres.presentation_name || pres.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {pres.project_name || pres.project}{pres.attach ? ` · ${fileName(pres.attach)}` : ""}
          </p>
        </div>
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <span className="text-xs text-gray-600 mr-1">Presentation</span>
            <button onClick={() => onNavigate(currentIndex - 1)} disabled={currentIndex === 0} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center">{currentIndex + 1} / {filtered.length}</span>
            <button onClick={() => onNavigate(currentIndex + 1)} disabled={currentIndex === filtered.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {!src ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No file attached</p>
          </div>
        ) : isPdf ? (
          <PdfViewer key={src} src={src} pres={pres} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
            <FileText className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium text-gray-300">{fileName(pres.attach!)}</p>
            <p className="text-xs text-gray-500">Preview not available for .{ext} files</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${value ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
        <span className="truncate max-w-[160px]">{value || label}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px] max-h-64 overflow-auto py-1">
          <button onClick={() => { onChange(""); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${!value ? "text-indigo-700 bg-indigo-50 font-medium" : "text-gray-500 hover:bg-gray-50"}`}>All {label}s</button>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt ? "text-indigo-700 bg-indigo-50 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PresentationPage() {
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [records, setRecords] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/presentations`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load presentations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projects = Array.from(new Set(records.map(r => r.project_name || r.project).filter(Boolean))).sort();

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || (r.presentation_name || "").toLowerCase().includes(q) || (r.project_name || "").toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    const matchProject = !selectedProject || (r.project_name || r.project) === selectedProject;
    return matchSearch && matchProject;
  });

  const hasFilters = !!(search || selectedProject);
  const openViewer = useCallback((idx: number) => setViewerIndex(idx), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  return (
    <>
      {viewerIndex !== null && filtered[viewerIndex] && (
        <FileViewer pres={filtered[viewerIndex]} filtered={filtered} currentIndex={viewerIndex} onClose={closeViewer} onNavigate={setViewerIndex} />
      )}

      <Layout>
        <div className="p-6 space-y-5 max-w-6xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <MonitorPlay className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
                <p className="text-sm text-gray-500 mt-0.5">Marketing presentations from ERPNext — click a card to open the viewer.</p>
              </div>
            </div>
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown label="Project" value={selectedProject} options={projects} onChange={v => { setSelectedProject(v); setViewerIndex(null); }} />
            {hasFilters && (
              <button onClick={() => { setSearch(""); setSelectedProject(""); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                <FilterX className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="ml-auto text-sm text-gray-400">
              {loading ? "Loading…" : `${filtered.length} presentation${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Fetching presentations from ERPNext…</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={load} className="text-sm text-indigo-600 underline">Retry</button>
            </div>
          ) : (
            <>
              {records.length > 0 && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search presentations…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No presentations found</p>
                  <p className="text-xs mt-1 text-gray-300">Presentations are managed in ERPNext</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((r, idx) => {
                    const ext = r.attach ? fileExt(r.attach) : "";
                    return (
                      <div key={r.name} onClick={() => openViewer(idx)} className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <MonitorPlay className="w-6 h-6 text-indigo-500" />
                          </div>
                          {ext && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200">{ext}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug mb-1 line-clamp-2">
                          {r.presentation_name || r.name}
                        </p>
                        {(r.project_name || r.project) && (
                          <p className="text-xs text-gray-500 mb-3 truncate">{r.project_name || r.project}</p>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {r.modified ? formatDate(r.modified) : "—"}
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${r.attach ? "text-indigo-600 bg-indigo-50 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600" : "text-gray-300"}`}>
                            {r.attach ? "Open" : "No file"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
