import { Layout } from "@/components/Layout";
import {
  PenLine, FolderOpen, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  RotateCcw, PanelRight, FileText, Tag, Layers, Building2,
  Calendar, Info,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

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

// ── PDF Fullscreen Viewer ─────────────────────────────────────────────────────
function PdfViewer({
  src, record, onClose,
}: { src: string; record: Design2DRecord; onClose: () => void }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [showPanel, setShowPanel] = useState(true);
  const [pdfErr, setPdfErr] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && numPages && page < numPages) setPage(p => p + 1);
      if (e.key === "ArrowLeft" && page > 1) setPage(p => p - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, page, numPages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{record.name}</p>
          <p className="text-xs text-gray-400 truncate">{record.project_name || record.project}</p>
        </div>
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(1.2)}
            className="px-2 text-xs text-gray-300 w-12 text-center">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale(s => Math.min(4, parseFloat((s + 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => setScale(1.2)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <RotateCcw className="w-3 h-3" /> Fit
        </button>
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-24 text-center tabular-nums">{page} / {numPages}</span>
            <button onClick={() => setPage(p => Math.min(numPages!, p + 1))} disabled={page >= numPages}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <button onClick={() => setShowPanel(s => !s)}
          className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6">
          {pdfErr ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this file.</p>
            </div>
          ) : (
            <Document
              file={src}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPage(1); }}
              onLoadError={() => setPdfErr(true)}
              loading={<div className="flex items-center gap-2 text-gray-400 mt-20"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>}
            >
              <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer={false} className="shadow-2xl" />
            </Document>
          )}
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-60 bg-gray-950 border-l border-gray-800 p-4 space-y-4 flex-shrink-0 overflow-auto">
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
  const isViewable = ["pdf", "png", "jpg", "jpeg", "gif", "svg"].includes(ext);

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
    if (["pdf", "png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
      setViewer(r);
    }
  }, []);

  const isPdf = viewer?.attach ? fileExt(viewer.attach) === "pdf" : false;
  const isImage = viewer?.attach
    ? ["png", "jpg", "jpeg", "gif", "svg"].includes(fileExt(viewer.attach))
    : false;

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

      {/* Image fullscreen viewer */}
      {viewer && isImage && (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <button onClick={() => setViewer(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
              <X className="w-4 h-4" /> Close
            </button>
            <div className="h-5 w-px bg-gray-700" />
            <p className="text-sm font-semibold text-white truncate flex-1">{viewer.name}</p>
            <p className="text-xs text-gray-400">{viewer.project_name || viewer.project}</p>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <img
              src={proxyUrl(viewer.attach!)}
              alt={viewer.name}
              className="max-w-full max-h-full object-contain shadow-2xl rounded"
            />
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
