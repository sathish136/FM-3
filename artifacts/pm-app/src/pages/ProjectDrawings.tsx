import { Layout } from "@/components/Layout";
import {
  Upload, FileText, Eye, History, CheckCircle2, Clock, AlertCircle,
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Highlighter, PanelRight, Info, Layers, Plus, Trash2,
  RefreshCw, Download, FolderOpen, Shield, Edit3, ArrowUpCircle,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DrawingStatus = "draft" | "revision" | "final";

interface RevisionEntry {
  revisionLabel: string;
  uploadedAt: string;
  status: DrawingStatus;
  fileData: string;
  fileName: string;
  note: string;
}

interface ProjectDrawing {
  id: string;
  drawingNo: string;
  title: string;
  project: string;
  uploadedAt: string;
  status: DrawingStatus;
  revisionNo: number;
  revisionLabel: string;
  fileData: string;
  fileName: string;
  note: string;
  history: RevisionEntry[];
}

const STATUS_CONFIG: Record<DrawingStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  textColor: string;
  watermarkText: string;
  watermarkColor: string;
}> = {
  draft: {
    label: "Draft",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    textColor: "text-amber-700",
    watermarkText: "DRAFT",
    watermarkColor: "rgba(217,119,6,0.18)",
  },
  revision: {
    label: "Under Revision",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    textColor: "text-blue-700",
    watermarkText: "REVISION",
    watermarkColor: "rgba(37,99,235,0.15)",
  },
  final: {
    label: "Final Copy",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    textColor: "text-emerald-700",
    watermarkText: "FINAL COPY",
    watermarkColor: "rgba(5,150,105,0.15)",
  },
};

const STORAGE_KEY = "project-drawings-v1";

function loadDrawings(): ProjectDrawing[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDrawings(drawings: ProjectDrawing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function revisionLabel(status: DrawingStatus, revNo: number): string {
  if (status === "draft") return "Draft";
  if (status === "final") return "Final Copy";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Rev ${letters[Math.min(revNo - 1, 25)]}`;
}

function StatusBadge({ status, label }: { status: DrawingStatus; label?: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor}`}>
      {status === "draft" && <Clock className="w-3 h-3" />}
      {status === "revision" && <RefreshCw className="w-3 h-3" />}
      {status === "final" && <CheckCircle2 className="w-3 h-3" />}
      {label || cfg.label}
    </span>
  );
}

function PdfWatermark({ status, revisionLbl }: { status: DrawingStatus; revisionLbl: string }) {
  const cfg = STATUS_CONFIG[status];
  const text = status === "revision"
    ? `${cfg.watermarkText} — ${revisionLbl}`
    : cfg.watermarkText;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ zIndex: 10 }}
    >
      <div
        style={{
          transform: "rotate(-45deg)",
          whiteSpace: "nowrap",
          fontSize: "clamp(28px, 6vw, 64px)",
          fontWeight: 900,
          letterSpacing: "0.15em",
          color: cfg.watermarkColor,
          userSelect: "none",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
          opacity: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
}

type PanelTab = "info" | "history" | "pages";

function PdfViewer({
  drawing,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  total,
  currentIdx,
}: {
  drawing: ProjectDrawing;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  total: number;
  currentIdx: number;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");

  const cfg = STATUS_CONFIG[drawing.status];

  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
    setPdfError(false);
  }, [drawing.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const tabs: { key: PanelTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: Info },
    { key: "history", label: "History", icon: History },
    { key: "pages", label: "Pages", icon: Layers },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-gray-700" />

        {/* Status banner */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor} flex-shrink-0`}>
          {drawing.status === "draft" && <Clock className="w-3.5 h-3.5" />}
          {drawing.status === "revision" && <RefreshCw className="w-3.5 h-3.5" />}
          {drawing.status === "final" && <CheckCircle2 className="w-3.5 h-3.5" />}
          {drawing.revisionLabel}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {drawing.drawingNo} — {drawing.title}
          </p>
          <p className="text-xs text-gray-400 truncate">{drawing.project}</p>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center tabular-nums">
              {currentIdx + 1} / {total}
            </span>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* PDF Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(1.2)}
            className="px-2 text-xs text-gray-300 hover:text-white tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => setScale(1.2)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <RotateCcw className="w-3 h-3" /> Fit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <button
          onClick={() => setHighlightMode(h => !h)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${highlightMode ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
          <Highlighter className="w-3.5 h-3.5" /> Highlight
        </button>
        <div className="flex-1" />
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-20 text-center tabular-nums">{pageNumber} / {numPages}</span>
            <button onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))} disabled={pageNumber >= numPages}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="h-4 w-px bg-gray-700" />
        <button onClick={() => setShowPanel(s => !s)}
          className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF area */}
        <div className={`flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6 relative ${highlightMode ? "select-text cursor-text" : "select-none"}`}>
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this PDF.</p>
            </div>
          ) : (
            <div className="relative">
              <Document
                file={drawing.fileData}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                onLoadError={() => setPdfError(true)}
                loading={
                  <div className="flex items-center gap-2 text-gray-400 mt-20">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading PDF…</span>
                  </div>
                }
              >
                <div className="relative">
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    className="shadow-2xl"
                  />
                  <PdfWatermark status={drawing.status} revisionLbl={drawing.revisionLabel} />
                </div>
              </Document>
            </div>
          )}
        </div>

        {/* Right panel */}
        {showPanel && (
          <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
            <div className="flex border-b border-gray-800">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${activeTab === key ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {activeTab === "info" && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Drawing No.</p>
                    <p className="text-sm text-white font-semibold leading-snug">{drawing.drawingNo}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Title</p>
                    <p className="text-sm text-gray-200">{drawing.title}</p>
                  </div>
                  {drawing.project && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Project</p>
                      <p className="text-sm text-gray-200">{drawing.project}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Status</p>
                    <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Uploaded</p>
                    <p className="text-sm text-gray-200">{formatDate(drawing.uploadedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">File</p>
                    <p className="text-xs text-gray-400 break-all">{drawing.fileName}</p>
                  </div>
                  {numPages !== null && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Total Pages</p>
                      <p className="text-sm text-gray-200">{numPages}</p>
                    </div>
                  )}
                  {drawing.note && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Note</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{drawing.note}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="p-3 space-y-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">Revision History</p>
                  {[
                    {
                      revisionLabel: drawing.revisionLabel,
                      uploadedAt: drawing.uploadedAt,
                      status: drawing.status,
                      note: drawing.note,
                      fileName: drawing.fileName,
                      current: true,
                    },
                    ...drawing.history.map(h => ({ ...h, current: false })).reverse(),
                  ].map((entry, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border ${entry.current ? "border-blue-700 bg-blue-950" : "border-gray-800 bg-gray-900"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={entry.status as DrawingStatus} label={entry.revisionLabel} />
                        {entry.current && <span className="text-[9px] text-blue-400 font-semibold">CURRENT</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{formatDateTime(entry.uploadedAt)}</p>
                      {entry.note && <p className="text-[10px] text-gray-400 mt-1 italic">{entry.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "pages" && (
                <div className="p-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-1">
                    {numPages ? `${numPages} pages` : "Loading…"}
                  </p>
                  {numPages && (
                    <Document file={drawing.fileData} loading={null} onLoadError={() => {}}>
                      <div className="space-y-1.5">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                          <button key={pg} onClick={() => setPageNumber(pg)}
                            className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${pg === pageNumber ? "border-blue-500" : "border-transparent hover:border-gray-700"}`}>
                            <div className="bg-white overflow-hidden flex items-center justify-center relative">
                              <Page pageNumber={pg} width={220} renderTextLayer={false} renderAnnotationLayer={false} />
                              <PdfWatermark status={drawing.status} revisionLbl={drawing.revisionLabel} />
                            </div>
                            <div className={`py-1 px-2 flex items-center justify-between ${pg === pageNumber ? "bg-blue-900" : "bg-gray-800"}`}>
                              <span className={`text-[10px] font-medium ${pg === pageNumber ? "text-blue-200" : "text-gray-400"}`}>
                                Page {pg}
                              </span>
                              {pg === pageNumber && <span className="text-[9px] text-blue-300">Current</span>}
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

interface UploadModalProps {
  onClose: () => void;
  onSubmit: (data: {
    drawingNo: string;
    title: string;
    project: string;
    fileData: string;
    fileName: string;
    note: string;
  }) => void;
}

function UploadModal({ onClose, onSubmit }: UploadModalProps) {
  const [drawingNo, setDrawingNo] = useState("");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!drawingNo || !title || !file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      onSubmit({ drawingNo, title, project, fileData, fileName: file.name, note });
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload Drawing</h2>
              <p className="text-xs text-gray-500">New drawing — status will be set to Draft</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Drawing No. *</label>
              <input
                value={drawingNo}
                onChange={e => setDrawingNo(e.target.value)}
                placeholder="e.g. MEC-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
              <input
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Project name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Drawing title / description"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : file ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-500">({(file.size / 1024).toFixed(0)} KB)</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Drop PDF here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF files only</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">This drawing will be saved as <strong>Draft</strong>. You can promote it to Revision or Final Copy later.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!drawingNo || !title || !file || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Drawing
          </button>
        </div>
      </div>
    </div>
  );
}

interface RevisionModalProps {
  drawing: ProjectDrawing;
  onClose: () => void;
  onSubmit: (data: { fileData: string; fileName: string; note: string }) => void;
}

function RevisionModal({ drawing, onClose, onSubmit }: RevisionModalProps) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const nextRevNo = drawing.status === "draft" ? 1 : drawing.revisionNo + 1;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nextLabel = `Rev ${letters[Math.min(nextRevNo - 1, 25)]}`;

  const handleFile = useCallback((f: File) => {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      setFile(f);
    }
  }, []);

  const handleSubmit = () => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      onSubmit({ fileData, fileName: file.name, note });
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload Revision</h2>
              <p className="text-xs text-gray-500">Status will change to <strong>{nextLabel}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            <p className="font-medium text-gray-800">{drawing.drawingNo} — {drawing.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">Current: <StatusBadge status={drawing.status} label={drawing.revisionLabel} /></p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Revision Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What changed in this revision…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-gray-600">Drop revised PDF or click to browse</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
            Upload {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FinalModalProps {
  drawing: ProjectDrawing;
  onClose: () => void;
  onConfirm: () => void;
}

function FinalModal({ drawing, onClose, onConfirm }: FinalModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Mark as Final Copy?</h2>
          <p className="text-sm text-gray-500 text-center mb-1">
            <strong>{drawing.drawingNo}</strong> — {drawing.title}
          </p>
          <p className="text-xs text-gray-400 text-center mb-6">
            This will mark the drawing as <strong>Final Copy</strong> and apply a FINAL COPY watermark when viewed.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirm Final
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ModalState =
  | { type: "none" }
  | { type: "upload" }
  | { type: "revision"; drawing: ProjectDrawing }
  | { type: "final"; drawing: ProjectDrawing }
  | { type: "delete"; drawing: ProjectDrawing };

export default function ProjectDrawings() {
  const [drawings, setDrawings] = useState<ProjectDrawing[]>(loadDrawings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DrawingStatus | "all">("all");
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const persist = (updated: ProjectDrawing[]) => {
    setDrawings(updated);
    saveDrawings(updated);
  };

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.drawingNo.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.project.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleUpload = (data: { drawingNo: string; title: string; project: string; fileData: string; fileName: string; note: string }) => {
    const newDrawing: ProjectDrawing = {
      id: crypto.randomUUID(),
      drawingNo: data.drawingNo,
      title: data.title,
      project: data.project,
      uploadedAt: new Date().toISOString(),
      status: "draft",
      revisionNo: 0,
      revisionLabel: "Draft",
      fileData: data.fileData,
      fileName: data.fileName,
      note: data.note,
      history: [],
    };
    persist([newDrawing, ...drawings]);
    setModal({ type: "none" });
  };

  const handleRevision = (drawing: ProjectDrawing, data: { fileData: string; fileName: string; note: string }) => {
    const historyEntry: RevisionEntry = {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: drawing.fileData,
      fileName: drawing.fileName,
      note: drawing.note,
    };
    const newRevNo = drawing.status === "draft" ? 1 : drawing.revisionNo + 1;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const newLabel = `Rev ${letters[Math.min(newRevNo - 1, 25)]}`;
    const updated: ProjectDrawing = {
      ...drawing,
      status: "revision",
      revisionNo: newRevNo,
      revisionLabel: newLabel,
      fileData: data.fileData,
      fileName: data.fileName,
      uploadedAt: new Date().toISOString(),
      note: data.note,
      history: [...drawing.history, historyEntry],
    };
    persist(drawings.map(d => d.id === drawing.id ? updated : d));
    setModal({ type: "none" });
  };

  const handleFinal = (drawing: ProjectDrawing) => {
    const historyEntry: RevisionEntry = {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: drawing.fileData,
      fileName: drawing.fileName,
      note: drawing.note,
    };
    const updated: ProjectDrawing = {
      ...drawing,
      status: "final",
      revisionLabel: "Final Copy",
      uploadedAt: new Date().toISOString(),
      history: [...drawing.history, historyEntry],
    };
    persist(drawings.map(d => d.id === drawing.id ? updated : d));
    setModal({ type: "none" });
  };

  const handleDelete = (drawing: ProjectDrawing) => {
    persist(drawings.filter(d => d.id !== drawing.id));
    setModal({ type: "none" });
  };

  const counts = {
    all: drawings.length,
    draft: drawings.filter(d => d.status === "draft").length,
    revision: drawings.filter(d => d.status === "revision").length,
    final: drawings.filter(d => d.status === "final").length,
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Project Drawings</h1>
              </div>
              <p className="text-sm text-gray-500">Mechanical Department — manage and track all project drawing files</p>
            </div>
            <button
              onClick={() => setModal({ type: "upload" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Upload Drawing
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {([
              { key: "all", label: "All" },
              { key: "draft", label: "Draft" },
              { key: "revision", label: "Revision" },
              { key: "final", label: "Final Copy" },
            ] as { key: DrawingStatus | "all"; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${statusFilter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {counts[key]}
                </span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search drawings…"
                className="text-sm outline-none text-gray-700 w-48 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drawing list */}
        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-600 mb-1">No drawings found</p>
                <p className="text-sm text-gray-400">
                  {drawings.length === 0
                    ? "Upload your first drawing to get started"
                    : "Try adjusting your search or filter"}
                </p>
              </div>
              {drawings.length === 0 && (
                <button
                  onClick={() => setModal({ type: "upload" })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Upload First Drawing
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2fr_3fr_2fr_1.5fr_1.5fr_auto] gap-4 px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <span>Drawing No.</span>
                <span>Title / Project</span>
                <span>Status</span>
                <span>Revisions</span>
                <span>Date</span>
                <span />
              </div>

              {filtered.map((drawing, idx) => {
                const globalIdx = drawings.findIndex(d => d.id === drawing.id);
                return (
                  <div
                    key={drawing.id}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <div className="grid md:grid-cols-[2fr_3fr_2fr_1.5fr_1.5fr_auto] gap-4 items-center">
                      {/* Drawing No */}
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {drawing.drawingNo}
                      </div>

                      {/* Title + project */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{drawing.title}</p>
                        {drawing.project && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{drawing.project}</p>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
                      </div>

                      {/* Revision count */}
                      <div className="text-xs text-gray-500">
                        {drawing.history.length === 0
                          ? "—"
                          : `${drawing.history.length} revision${drawing.history.length !== 1 ? "s" : ""}`}
                      </div>

                      {/* Date */}
                      <div className="text-xs text-gray-500">
                        {formatDate(drawing.uploadedAt)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const filteredIdx = filtered.findIndex(d => d.id === drawing.id);
                            setViewerIdx(filteredIdx);
                          }}
                          title="View PDF"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {drawing.status !== "final" && (
                          <button
                            onClick={() => setModal({ type: "revision", drawing })}
                            title="Upload Revision"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {drawing.status !== "final" && (
                          <button
                            onClick={() => setModal({ type: "final", drawing })}
                            title="Mark as Final Copy"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setModal({ type: "delete", drawing })}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile: action row */}
                    <div className="flex items-center gap-2 mt-3 md:hidden">
                      <button
                        onClick={() => {
                          const filteredIdx = filtered.findIndex(d => d.id === drawing.id);
                          setViewerIdx(filteredIdx);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {drawing.status !== "final" && (
                        <button
                          onClick={() => setModal({ type: "revision", drawing })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Revise
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={() => setModal({ type: "final", drawing })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Final
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      {viewerIdx !== null && filtered[viewerIdx] && (
        <PdfViewer
          drawing={filtered[viewerIdx]}
          onClose={() => setViewerIdx(null)}
          onPrev={() => setViewerIdx(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setViewerIdx(i => Math.min(filtered.length - 1, (i ?? 0) + 1))}
          hasPrev={viewerIdx > 0}
          hasNext={viewerIdx < filtered.length - 1}
          total={filtered.length}
          currentIdx={viewerIdx}
        />
      )}

      {/* Modals */}
      {modal.type === "upload" && (
        <UploadModal onClose={() => setModal({ type: "none" })} onSubmit={handleUpload} />
      )}
      {modal.type === "revision" && (
        <RevisionModal
          drawing={modal.drawing}
          onClose={() => setModal({ type: "none" })}
          onSubmit={data => handleRevision(modal.drawing, data)}
        />
      )}
      {modal.type === "final" && (
        <FinalModal
          drawing={modal.drawing}
          onClose={() => setModal({ type: "none" })}
          onConfirm={() => handleFinal(modal.drawing)}
        />
      )}
      {modal.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Drawing?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{modal.drawing.drawingNo}</strong> and all its revision history will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(modal.drawing)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
