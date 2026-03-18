import { Layout } from "@/components/Layout";
import {
  GitBranch, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  Download, RotateCcw, FileText, LayoutList, Eye,
  FolderOpen, ArrowLeft,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

function proxyUrl(f: string) { return `${BASE}/api/file-proxy?url=${encodeURIComponent(f)}`; }
function fileName(f: string) { return f.split("/").pop() || f; }

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

type BgPreset = "dark" | "navy" | "light" | "white";
type ViewMode = "normal" | "invert";
type DisplayMode = "list" | "viewer";

const BG_CLASSES: Record<BgPreset, string> = {
  dark: "bg-gray-950",
  navy: "bg-[#1a1a2e]",
  light: "bg-[#dde3ee]",
  white: "bg-white",
};

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

export default function PID() {
  const [records, setRecords] = useState<PIDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PIDRecord | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");

  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotate, setRotate] = useState(0);
  const [bgPreset, setBgPreset] = useState<BgPreset>("white");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [pdfError, setPdfError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const openViewer = (r: PIDRecord) => {
    setSelected(r);
    setPage(1);
    setNumPages(null);
    setPdfError(false);
    setScale(1.2);
    setRotate(0);
    setDisplayMode("viewer");
  };

  const pdfSrc = selected?.attach ? proxyUrl(selected.attach) : null;

  // ── List view (full-page table) ────────────────────────────────────────────
  if (displayMode === "list") {
    return (
      <Layout>
        <div className="min-h-full bg-gray-50 p-6">
          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">P&amp;ID Process</h1>
                <p className="text-xs text-gray-400">Piping &amp; Instrumentation Diagrams from ERPNext</p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
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

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table header */}
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
                {filtered.map(r => (
                  <div
                    key={r.name}
                    className="grid grid-cols-[2fr_2fr_120px_120px_100px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                          {r.name}
                        </p>
                      </div>
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
                    <div className="flex justify-end gap-2">
                      {r.attach ? (
                        <button
                          onClick={() => openViewer(r)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && !loading && (
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
    );
  }

  // ── Viewer mode ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex h-full overflow-hidden bg-[#0f0f1a]">

        {/* Left list panel */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/10 bg-[#13132b]">
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setDisplayMode("list")}
                className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Back to list"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-white font-semibold text-sm">P&amp;ID Process</span>
              <span className="ml-auto text-xs text-gray-500">{filtered.length}</span>
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search P&ID…"
                className="w-full pl-8 pr-8 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={fetchRecords} className="text-xs text-indigo-400 hover:underline">Retry</button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-500 text-xs">
                <FileText className="w-5 h-5" />
                {search ? "No results" : "No P&ID records"}
              </div>
            )}
            {!loading && !error && filtered.map(r => {
              const isActive = selected?.name === r.name;
              return (
                <button
                  key={r.name}
                  onClick={() => openViewer(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                    isActive
                      ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                      : "bg-white/3 border-transparent text-gray-300 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{r.name}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{r.project_name || r.project}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {r.revision && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                            {r.revision}
                          </span>
                        )}
                        {r.project && (
                          <span className="text-[10px] text-gray-500">{r.project}</span>
                        )}
                      </div>
                    </div>
                    {r.attach && <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Viewer area */}
        <div className="flex-1 flex overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
              <GitBranch className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a P&amp;ID record to view</p>
            </div>
          ) : (
            <>
              {/* Toolbar sidebar */}
              <aside className="w-12 bg-[#16162a] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 flex-shrink-0 overflow-y-auto">
                <TbSection label="View" />
                <ToolBtn title="Normal view" active={viewMode === "normal"} onClick={() => setViewMode("normal")}>
                  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor"><circle cx="10" cy="10" r="7" /></svg>
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
                <TbDivider />
                <TbSection label="Zoom" />
                <ToolBtn title="Zoom in" onClick={() => setScale(s => +(Math.min(4, s + 0.15).toFixed(2)))}>
                  <ZoomIn className="w-4 h-4" />
                </ToolBtn>
                <div className="text-[9px] text-gray-400 tabular-nums text-center leading-tight py-0.5 select-none">
                  {Math.round(scale * 100)}%
                </div>
                <ToolBtn title="Fit to window" onClick={() => setScale(1.2)}>
                  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="3" y="3" width="14" height="14" rx="1" />
                    <polyline points="7,3 3,3 3,7" />
                    <polyline points="13,3 17,3 17,7" />
                    <polyline points="3,13 3,17 7,17" />
                    <polyline points="17,13 17,17 13,17" />
                  </svg>
                </ToolBtn>
                <ToolBtn title="Zoom out" onClick={() => setScale(s => +(Math.max(0.2, s - 0.15).toFixed(2)))}>
                  <ZoomOut className="w-4 h-4" />
                </ToolBtn>
                <TbDivider />
                <TbSection label="Rotate" />
                <ToolBtn title="Rotate CCW" onClick={() => setRotate(r => (r - 90 + 360) % 360)}>
                  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4.5 10a5.5 5.5 0 1 0 1.2-3.4" />
                    <polyline points="2,4 4.5,6.5 7,4" />
                  </svg>
                </ToolBtn>
                <ToolBtn title="Rotate CW" onClick={() => setRotate(r => (r + 90) % 360)}>
                  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15.5 10a5.5 5.5 0 1 1-1.2-3.4" />
                    <polyline points="18,4 15.5,6.5 13,4" />
                  </svg>
                </ToolBtn>
                {rotate !== 0 && (
                  <ToolBtn title="Reset rotation" onClick={() => setRotate(0)}>
                    <RotateCcw className="w-4 h-4" />
                  </ToolBtn>
                )}
                {numPages != null && numPages > 1 && (
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
                <TbDivider />
                <ToolBtn title="Back to list" onClick={() => setDisplayMode("list")}>
                  <LayoutList className="w-4 h-4" />
                </ToolBtn>
              </aside>

              {/* Main viewer */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-10 bg-[#0f0f1a] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
                  <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium truncate">{selected.name}</span>
                    {selected.revision && (
                      <span className="ml-2 text-xs text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                        {selected.revision}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-gray-500 truncate hidden sm:inline">
                      {selected.project_name || selected.project}
                    </span>
                  </div>
                  {selected.attach && (
                    <a
                      href={proxyUrl(selected.attach)}
                      download={fileName(selected.attach)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  )}
                </div>

                <div
                  ref={containerRef}
                  className={`flex-1 overflow-auto flex justify-center pt-4 pb-8 ${BG_CLASSES[bgPreset]}`}
                >
                  {!selected.attach ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
                      <FileText className="w-8 h-8 opacity-30" />
                      <p>No attachment on this record</p>
                    </div>
                  ) : pdfError ? (
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                      <p className="text-sm">Could not load PDF</p>
                      <a
                        href={proxyUrl(selected.attach)}
                        download={fileName(selected.attach)}
                        className="flex items-center gap-1.5 text-sm text-indigo-400 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        Download file instead
                      </a>
                    </div>
                  ) : (
                    <div
                      style={{
                        filter: viewMode === "invert" ? "invert(1) hue-rotate(180deg)" : undefined,
                        transform: rotate ? `rotate(${rotate}deg)` : undefined,
                        transition: "transform 0.2s",
                      }}
                    >
                      <Document
                        file={pdfSrc!}
                        onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPdfError(false); }}
                        onLoadError={() => setPdfError(true)}
                        loading={
                          <div className="flex items-center gap-2 text-gray-400 mt-20">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading PDF…</span>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={page}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                        />
                      </Document>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
