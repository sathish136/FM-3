import { Layout } from "@/components/Layout";
import {
  GitBranch, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, ZoomIn, ZoomOut,
  Download, RotateCcw, FileText, Eye, FolderOpen,
  PanelRight, Info, Layers, Clock, Sparkles, ListChecks,
  CheckCircle2, XCircle, Copy, Table2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────
interface PIDRecord {
  name: string;
  project: string;
  project_name: string;
  revision: string;
  attach: string | null;
  modified: string;
}

interface BOMItem {
  tag: string;
  type: string;
  description: string;
  quantity: number;
  specifications: string;
}

interface AnalysisResult {
  summary: string;
  items: BOMItem[];
  analyzedPage: number;
  timestamp: string;
}

interface ViewEntry { time: string; }

type PanelTab = "info" | "views" | "pages" | "ai";

// ── Helpers ──────────────────────────────────────────────────────────────────
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

const BOM_TYPE_COLORS: Record<string, string> = {
  "Pump": "bg-blue-900/60 text-blue-300 border-blue-800",
  "Valve": "bg-green-900/60 text-green-300 border-green-800",
  "Control Valve": "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  "Safety Valve": "bg-red-900/60 text-red-300 border-red-800",
  "Check Valve": "bg-teal-900/60 text-teal-300 border-teal-800",
  "Gate Valve": "bg-cyan-900/60 text-cyan-300 border-cyan-800",
  "Ball Valve": "bg-sky-900/60 text-sky-300 border-sky-800",
  "Vessel": "bg-purple-900/60 text-purple-300 border-purple-800",
  "Tank": "bg-violet-900/60 text-violet-300 border-violet-800",
  "Heat Exchanger": "bg-orange-900/60 text-orange-300 border-orange-800",
  "Instrument": "bg-yellow-900/60 text-yellow-300 border-yellow-800",
  "Sensor": "bg-amber-900/60 text-amber-300 border-amber-800",
  "Compressor": "bg-pink-900/60 text-pink-300 border-pink-800",
  "Filter": "bg-indigo-900/60 text-indigo-300 border-indigo-800",
  "Pipe": "bg-gray-700/60 text-gray-300 border-gray-600",
};

function typeBadge(type: string) {
  const cls = BOM_TYPE_COLORS[type] ?? "bg-gray-700/60 text-gray-300 border-gray-600";
  return `inline-block border text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${cls}`;
}

function exportBomCsv(items: BOMItem[], pidName: string) {
  const header = "Tag,Type,Description,Quantity,Specifications\n";
  const rows = items.map(i => [
    `"${i.tag || ""}"`,
    `"${i.type || ""}"`,
    `"${(i.description || "").replace(/"/g, '""')}"`,
    i.quantity,
    `"${(i.specifications || "").replace(/"/g, '""')}"`,
  ].join(",")).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BOM_${pidName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Full-screen PDF viewer ────────────────────────────────────────────────────
function PdfViewer({
  src, record, autoAnalyze = false,
}: {
  src: string;
  record: PIDRecord;
  autoAnalyze?: boolean;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pdfError, setPdfError] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>(autoAnalyze ? "ai" : "info");
  const [views, setViews] = useState<ViewEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [copiedBom, setCopiedBom] = useState(false);
  const autoAnalyzeFiredRef = useRef(false);

  useEffect(() => {
    const key = `pid-views-${record.name}`;
    const existing: ViewEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [{ time: new Date().toISOString() }, ...existing].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(updated));
    setViews(updated);

    const savedAnalysis = localStorage.getItem(`pid-analysis-${record.name}`);
    if (savedAnalysis) {
      try { setAnalysisResult(JSON.parse(savedAnalysis)); } catch {}
    }
  }, [record.name]);

  // Auto-trigger analysis when PDF has loaded and autoAnalyze is requested
  useEffect(() => {
    if (!autoAnalyze || autoAnalyzeFiredRef.current || numPages === null) return;
    autoAnalyzeFiredRef.current = true;
    // Small delay so the canvas has time to render after PDF load
    const t = setTimeout(() => { analyzeCurrentPage(); }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, autoAnalyze]);

  const analyzeCurrentPage = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setActiveTab("ai");

    try {
      const canvas = document.querySelector(".react-pdf__Page__canvas") as HTMLCanvasElement | null;
      if (!canvas) throw new Error("Could not capture the current page. Make sure a PDF is visible.");

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);

      const res = await fetch(`${BASE}/api/pid/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          pidName: record.name,
          projectName: record.project_name || record.project,
          revision: record.revision,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const result: AnalysisResult = {
        summary: data.summary ?? "",
        items: data.items ?? [],
        analyzedPage: page,
        timestamp: new Date().toISOString(),
      };

      setAnalysisResult(result);
      localStorage.setItem(`pid-analysis-${record.name}`, JSON.stringify(result));
    } catch (e: any) {
      setAnalysisError(e?.message ?? String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const copyBomJson = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(JSON.stringify(analysisResult.items, null, 2));
    setCopiedBom(true);
    setTimeout(() => setCopiedBom(false), 2000);
  };

  const tabs: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "views", label: "Views", icon: Eye },
    { key: "pages", label: "Pages", icon: Layers },
    { key: "ai", label: "AI", icon: Sparkles },
  ];

  const bomSummaryByType = analysisResult
    ? analysisResult.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + (item.quantity || 1);
        return acc;
      }, {})
    : {};

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

        {/* AI Analyze button */}
        <button
          onClick={analyzeCurrentPage}
          disabled={analyzing || pdfError}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            analyzing
              ? "bg-indigo-700 text-white opacity-70 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900"
          }`}
          title="Analyze this P&ID with AI and generate a BOM"
        >
          {analyzing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Analyze P&amp;ID</>
          )}
        </button>

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
        <div className="flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6">
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
          <div className="w-72 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
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
                  <div className="pt-2 border-t border-gray-800 space-y-1">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Quick Actions</p>
                    <button
                      onClick={analyzeCurrentPage}
                      disabled={analyzing}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-indigo-300 bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-800/50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {analyzing ? "Analyzing…" : analysisResult ? "Re-analyze P&ID" : "Analyze P&ID + Generate BOM"}
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
                              <Page pageNumber={pg} width={240} renderTextLayer={false} renderAnnotationLayer={false} />
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

              {/* AI tab */}
              {activeTab === "ai" && (
                <div className="flex flex-col h-full">
                  {/* State: idle / no result */}
                  {!analyzing && !analysisResult && !analysisError && (
                    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">AI P&amp;ID Analysis</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Scan this P&amp;ID with AI to identify all equipment, instruments, and valves — then auto-generate a Bill of Materials.
                        </p>
                      </div>
                      <button
                        onClick={analyzeCurrentPage}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/50"
                      >
                        <Sparkles className="w-4 h-4" /> Analyze P&amp;ID
                      </button>
                      <p className="text-[10px] text-gray-600">Analyzes the currently visible page</p>
                    </div>
                  )}

                  {/* State: analyzing */}
                  {analyzing && (
                    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Analyzing P&amp;ID…</p>
                        <p className="text-xs text-gray-400">AI is scanning page {page} for components</p>
                      </div>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State: error */}
                  {analysisError && !analyzing && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800/50">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-300 mb-0.5">Analysis failed</p>
                          <p className="text-[10px] text-red-400 leading-relaxed">{analysisError}</p>
                        </div>
                      </div>
                      <button
                        onClick={analyzeCurrentPage}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                      </button>
                    </div>
                  )}

                  {/* State: result */}
                  {analysisResult && !analyzing && (
                    <div className="flex flex-col flex-1 min-h-0">
                      {/* Result header */}
                      <div className="p-3 border-b border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs font-semibold text-white">
                              {analysisResult.items.length} items found
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-500">
                            Page {analysisResult.analyzedPage} · {formatViewTime(analysisResult.timestamp)}
                          </span>
                        </div>
                        {analysisResult.summary && (
                          <p className="text-[10px] text-gray-400 leading-relaxed">{analysisResult.summary}</p>
                        )}
                        {/* Type breakdown chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {Object.entries(bomSummaryByType).slice(0, 8).map(([type, count]) => (
                            <span key={type} className={typeBadge(type)}>
                              {type} ×{count}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 p-2 border-b border-gray-800">
                        <button
                          onClick={() => exportBomCsv(analysisResult.items, record.name)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
                        >
                          <Table2 className="w-3 h-3" /> Export CSV
                        </button>
                        <button
                          onClick={copyBomJson}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 transition-colors"
                        >
                          {copiedBom ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copiedBom ? "Copied!" : "Copy JSON"}
                        </button>
                        <button
                          onClick={analyzeCurrentPage}
                          title="Re-analyze"
                          className="px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      {/* BOM items list */}
                      <div className="flex-1 overflow-auto">
                        <div className="divide-y divide-gray-800/50">
                          {analysisResult.items.map((item, i) => (
                            <div key={i} className="px-3 py-2.5 hover:bg-gray-900/50 transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {item.tag && (
                                    <span className="text-xs font-bold text-white font-mono flex-shrink-0 bg-gray-800 px-1.5 py-0.5 rounded">
                                      {item.tag}
                                    </span>
                                  )}
                                  {item.quantity > 1 && (
                                    <span className="text-[9px] text-indigo-300 bg-indigo-900/50 px-1 py-0.5 rounded font-semibold flex-shrink-0">
                                      ×{item.quantity}
                                    </span>
                                  )}
                                </div>
                                <span className={typeBadge(item.type)}>{item.type}</span>
                              </div>
                              <p className="text-[10px] text-gray-300 leading-snug">{item.description}</p>
                              {item.specifications && (
                                <p className="text-[9px] text-gray-600 mt-1 font-mono">{item.specifications}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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

// ── Full-screen viewer overlay ────────────────────────────────────────────────
function FileViewer({
  record, filtered, currentIndex, onClose, onNavigate, autoAnalyze = false,
}: {
  record: PIDRecord;
  filtered: PIDRecord[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  autoAnalyze?: boolean;
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
          <PdfViewer key={src} src={src} record={record} autoAnalyze={autoAnalyze} />
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PID() {
  const [records, setRecords] = useState<PIDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerAutoAnalyze, setViewerAutoAnalyze] = useState(false);

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

  const openViewer = useCallback((idx: number) => {
    setViewerAutoAnalyze(false);
    setViewerIndex(idx);
  }, []);

  const openViewerForAnalyze = useCallback((idx: number) => {
    setViewerAutoAnalyze(true);
    setViewerIndex(idx);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
    setViewerAutoAnalyze(false);
  }, []);

  return (
    <>
      {viewerIndex !== null && filtered[viewerIndex] && (
        <FileViewer
          record={filtered[viewerIndex]}
          filtered={filtered}
          currentIndex={viewerIndex}
          onClose={closeViewer}
          onNavigate={setViewerIndex}
          autoAnalyze={viewerAutoAnalyze}
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
                <p className="text-xs text-gray-400">Piping &amp; Instrumentation Diagrams · AI Analysis &amp; BOM Generation</p>
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            {/* Table header — wider action column to fit 3 buttons */}
            <div className="min-w-[680px] grid grid-cols-[2fr_2fr_100px_110px_minmax(220px,1fr)] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>P&amp;ID No.</span>
              <span>Project</span>
              <span>Revision</span>
              <span>Modified</span>
              <span className="text-right">Actions</span>
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
                {filtered.map((r, idx) => {
                  const hasBom = !!localStorage.getItem(`pid-analysis-${r.name}`);
                  return (
                    <div
                      key={r.name}
                      className="min-w-[680px] grid grid-cols-[2fr_2fr_100px_110px_minmax(220px,1fr)] gap-3 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0 relative">
                          <GitBranch className="w-4 h-4 text-indigo-600" />
                          {hasBom && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" title="BOM generated" />
                          )}
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

                      {/* Actions column */}
                      <div className="flex justify-end items-center gap-1.5 flex-wrap">
                        {r.attach ? (
                          <>
                            {/* View button */}
                            <button
                              onClick={() => openViewer(idx)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>

                            {/* Analyze button */}
                            <button
                              onClick={() => openViewerForAnalyze(idx)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
                              title="Open and auto-analyze this P&ID with AI"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {hasBom ? "Re-analyze" : "Analyze"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">No file</span>
                        )}

                        {/* BOM ready indicator */}
                        {hasBom && (
                          <button
                            onClick={() => openViewer(idx)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                            title="BOM already generated — click to view"
                          >
                            <ListChecks className="w-3.5 h-3.5" /> BOM
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

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

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-indigo-400" />
              View — opens the diagram
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-violet-400" />
              Analyze — opens diagram and auto-runs AI analysis
            </div>
            <div className="flex items-center gap-1.5">
              <ListChecks className="w-3 h-3 text-green-400" />
              BOM — analysis already done, click to view results
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
