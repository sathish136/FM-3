import { Layout } from "@/components/Layout";
import {
  Upload, FileText, Eye, History, CheckCircle2, Clock,
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Highlighter, PanelRight, Info, Layers, Plus, Trash2,
  RefreshCw, FolderOpen, Shield, ArrowUpCircle, Building2,
  Filter, ChevronDown, Briefcase, UserCheck, ThumbsUp,
  AlertCircle, Users,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "@/hooks/useAuth";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DrawingStatus = "draft" | "revision" | "final";

interface ViewLogEntry {
  by: string;
  at: string;
}

interface ApprovalEntry {
  name: string;
  at: string;
}

interface RevisionEntry {
  revisionLabel: string;
  uploadedAt: string;
  status: DrawingStatus;
  fileData: string;
  fileName: string;
  note: string;
  revisedBy: string;
  erpFileUrl?: string;
}

interface ProjectDrawing {
  id: string;
  drawingNo: string;
  title: string;
  project: string;
  department: string;
  systemName: string;
  uploadedAt: string;
  status: DrawingStatus;
  revisionNo: number;
  revisionLabel: string;
  fileData: string;
  fileName: string;
  note: string;
  uploadedBy: string;
  history: RevisionEntry[];
  viewLog: ViewLogEntry[];
  checkedBy: ApprovalEntry | null;
  approvedBy: ApprovalEntry | null;
  erpFileUrl: string | null;
}

const STATUS_CONFIG: Record<DrawingStatus, {
  label: string;
  bg: string;
  border: string;
  textColor: string;
  watermarkText: string;
  watermarkColor: string;
}> = {
  draft: {
    label: "Draft",
    bg: "bg-amber-50",
    border: "border-amber-300",
    textColor: "text-amber-700",
    watermarkText: "DRAFT",
    watermarkColor: "rgba(217,119,6,0.18)",
  },
  revision: {
    label: "Under Revision",
    bg: "bg-blue-50",
    border: "border-blue-300",
    textColor: "text-blue-700",
    watermarkText: "REVISION",
    watermarkColor: "rgba(37,99,235,0.15)",
  },
  final: {
    label: "Final Copy",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    textColor: "text-emerald-700",
    watermarkText: "FINAL COPY",
    watermarkColor: "rgba(5,150,105,0.15)",
  },
};

const DEPARTMENTS = [
  "Mechanical",
  "Electrical",
  "Civil",
  "Instrumentation",
  "Process",
  "Project",
  "Quality",
  "HSE",
];

const SYSTEMS = [
  "RO",
  "MBR",
  "BIOLOGICAL",
  "CLARIFIER",
  "COOLING TOWER",
  "SCREENER",
  "ICS",
  "RO-90",
  "MBR System",
  "ETP System",
  "STP System",
  "WTP / RO System",
  "AHU / HVAC System",
  "Fire Fighting System",
  "Thermic Fluid System",
  "Process System",
  "Electrical System",
  "Instrumentation System",
  "Piping System",
  "Structural System",
  "Utility System",
  "Chemical Dosing System",
  "Cooling Tower System",
  "Compressed Air System",
  "Other",
];

const STORAGE_KEY = "project-drawings-v3";

const fileDataCache = new Map<string, string>();

function stripFileData(d: ProjectDrawing): ProjectDrawing {
  return {
    ...d,
    fileData: "",
    history: d.history.map(h => ({ ...h, fileData: "" })),
  };
}

function loadDrawings(): ProjectDrawing[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDrawings(drawings: ProjectDrawing[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings.map(stripFileData)));
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings.slice(-20).map(stripFileData)));
    } catch { /* ignore */ }
  }
}

function getFileData(drawing: ProjectDrawing): string {
  return fileDataCache.get(drawing.id) || drawing.fileData || "";
}

async function uploadToErpNext(fileData: string, fileName: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/drawings/upload-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData, fileName }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.fileUrl || null;
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function revisionLetter(revNo: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.min(revNo - 1, 25)];
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
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden" style={{ zIndex: 10 }}>
      <div style={{
        transform: "rotate(-45deg)",
        whiteSpace: "nowrap",
        fontSize: "clamp(28px,6vw,64px)",
        fontWeight: 900,
        letterSpacing: "0.15em",
        color: cfg.watermarkColor,
        userSelect: "none",
        textTransform: "uppercase",
        fontFamily: "Arial, sans-serif",
      }}>
        {text}
      </div>
    </div>
  );
}

type PanelTab = "info" | "history" | "pages";

function PdfViewer({
  drawing, onClose, onPrev, onNext, hasPrev, hasNext, total, currentIdx,
  onCheck, onApprove, currentUserName,
}: {
  drawing: ProjectDrawing;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  total: number;
  currentIdx: number;
  onCheck: () => void;
  onApprove: () => void;
  currentUserName: string;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [showCheckConfirm, setShowCheckConfirm] = useState(false);
  const cfg = STATUS_CONFIG[drawing.status];

  const allRevisionNotes: Array<{ label: string; note: string; by: string; at: string }> = [
    ...drawing.history.map(h => ({
      label: h.revisionLabel,
      note: h.note,
      by: h.revisedBy,
      at: h.uploadedAt,
    })),
    {
      label: drawing.revisionLabel,
      note: drawing.note,
      by: drawing.uploadedBy,
      at: drawing.uploadedAt,
    },
  ];

  useEffect(() => {
    setPageNumber(1); setNumPages(null); setPdfError(false);
    setShowCheckConfirm(false);
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
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0">
          <X className="w-4 h-4" /> Close
        </button>
        <div className="h-5 w-px bg-gray-700" />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor} flex-shrink-0`}>
          {drawing.status === "draft" && <Clock className="w-3.5 h-3.5" />}
          {drawing.status === "revision" && <RefreshCw className="w-3.5 h-3.5" />}
          {drawing.status === "final" && <CheckCircle2 className="w-3.5 h-3.5" />}
          {drawing.revisionLabel}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {drawing.drawingNo}{drawing.title ? ` — ${drawing.title}` : ""}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {[drawing.project, drawing.systemName, drawing.department].filter(Boolean).join(" · ")}
          </p>
        </div>
        {total > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onPrev} disabled={!hasPrev}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center tabular-nums">{currentIdx + 1} / {total}</span>
            <button onClick={onNext} disabled={!hasNext}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* PDF Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => setScale(1.2)}
            className="px-2 text-xs text-gray-300 tabular-nums w-12 text-center">{Math.round(scale * 100)}%</button>
          <button onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={() => setScale(1.2)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <RotateCcw className="w-3 h-3" /> Fit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <button onClick={() => setHighlightMode(h => !h)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${highlightMode ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
          <Highlighter className="w-3.5 h-3.5" /> Highlight
        </button>
        <div className="flex-1" />
        {numPages && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-gray-400 w-20 text-center tabular-nums">{pageNumber} / {numPages}</span>
            <button onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))} disabled={pageNumber >= numPages}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        <div className="h-4 w-px bg-gray-700" />
        <button onClick={() => setShowPanel(s => !s)}
          className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
          <PanelRight className="w-4 h-4" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6 relative ${highlightMode ? "select-text cursor-text" : "select-none"}`}>
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this PDF.</p>
              {drawing.erpFileUrl && (
                <p className="text-xs text-emerald-400 text-center max-w-xs">
                  File saved on ERPNext: <span className="break-all">{drawing.erpFileUrl}</span>
                </p>
              )}
            </div>
          ) : !getFileData(drawing) ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium text-gray-300">PDF not cached in this session</p>
              <p className="text-xs text-gray-500 text-center max-w-xs">The drawing file is stored in ERPNext. Re-upload or re-open from a fresh upload to view the PDF.</p>
              {drawing.erpFileUrl && (
                <p className="text-xs text-emerald-400 text-center max-w-xs mt-1">
                  ERPNext path: <span className="break-all">{drawing.erpFileUrl}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <Document file={getFileData(drawing)}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                onLoadError={() => setPdfError(true)}
                loading={
                  <div className="flex items-center gap-2 text-gray-400 mt-20">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading PDF…</span>
                  </div>
                }>
                <div className="relative">
                  <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={false} className="shadow-2xl" />
                  <PdfWatermark status={drawing.status} revisionLbl={drawing.revisionLabel} />
                </div>
              </Document>
            </div>
          )}
        </div>

        {showPanel && (
          <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
            <div className="flex border-b border-gray-800">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${activeTab === key ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto">
              {activeTab === "info" && (
                <div className="p-4 space-y-4">
                  {/* Basic info */}
                  {[
                    { label: "Drawing No.", value: drawing.drawingNo },
                    { label: "Title", value: drawing.title },
                    { label: "Project", value: drawing.project },
                    { label: "System", value: drawing.systemName },
                    { label: "Department", value: drawing.department },
                    { label: "File", value: drawing.fileName },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className={`text-sm text-gray-200 ${label === "Drawing No." ? "font-semibold" : ""} ${label === "File" ? "text-xs text-gray-400 break-all" : ""}`}>{value}</p>
                    </div>
                  ) : null)}
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Status</p>
                    <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
                  </div>
                  {numPages !== null && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Total Pages</p>
                      <p className="text-sm text-gray-200">{numPages}</p>
                    </div>
                  )}
                  {drawing.note && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Note</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{drawing.note}</p>
                    </div>
                  )}
                  {drawing.erpFileUrl && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">ERPNext File</p>
                      <p className="text-[10px] text-emerald-400 break-all">{drawing.erpFileUrl}</p>
                    </div>
                  )}

                  {/* All Revision Notes */}
                  {allRevisionNotes.some(r => r.note) && (
                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-[9px] text-amber-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" /> All Revision Notes
                      </p>
                      <div className="space-y-2 max-h-40 overflow-auto pr-0.5">
                        {[...allRevisionNotes].reverse().map((r, i) => r.note ? (
                          <div key={i} className="rounded-lg bg-gray-900 border border-amber-900/50 p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">{r.label}</span>
                              <span className="text-[9px] text-gray-600">{formatDateTime(r.at)}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">{r.by && <span className="text-gray-500">{r.by}: </span>}{r.note}</p>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-800 pt-3 space-y-3">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Workflow Tracking</p>

                    {/* Created by */}
                    <div className="rounded-lg bg-gray-900 border border-gray-800 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Upload className="w-3 h-3 text-blue-400" />
                        <p className="text-[9px] text-blue-400 uppercase tracking-widest font-semibold">Created By</p>
                      </div>
                      <p className="text-xs text-gray-200 font-medium">{drawing.uploadedBy || "—"}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatDateTime(drawing.history[0]?.uploadedAt || drawing.uploadedAt)}</p>
                    </div>

                    {/* Viewed by */}
                    <div className="rounded-lg bg-gray-900 border border-gray-800 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Eye className="w-3 h-3 text-violet-400" />
                        <p className="text-[9px] text-violet-400 uppercase tracking-widest font-semibold">Viewed By</p>
                        <span className="ml-auto text-[9px] text-gray-600">{drawing.viewLog?.length || 0} view{(drawing.viewLog?.length || 0) !== 1 ? "s" : ""}</span>
                      </div>
                      {(drawing.viewLog?.length || 0) === 0 ? (
                        <p className="text-[10px] text-gray-600 italic">No views recorded</p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-auto">
                          {[...(drawing.viewLog || [])].reverse().slice(0, 8).map((v, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-300">{v.by}</span>
                              <span className="text-[9px] text-gray-600">{formatDateTime(v.at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Checked by */}
                    <div className={`rounded-lg border p-2.5 ${drawing.checkedBy ? "bg-emerald-950 border-emerald-800" : showCheckConfirm ? "bg-emerald-950 border-emerald-700" : "bg-gray-900 border-gray-800"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">Checked By</p>
                      </div>
                      {drawing.checkedBy ? (
                        <>
                          <p className="text-xs text-gray-200 font-medium">{drawing.checkedBy.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatDateTime(drawing.checkedBy.at)}</p>
                        </>
                      ) : showCheckConfirm ? (
                        <div className="space-y-2">
                          <p className="text-[9px] text-emerald-300 font-semibold">Review all revision notes before confirming:</p>
                          <div className="space-y-1.5 max-h-36 overflow-auto">
                            {allRevisionNotes.length === 0 || allRevisionNotes.every(r => !r.note) ? (
                              <p className="text-[10px] text-gray-500 italic">No revision notes recorded</p>
                            ) : (
                              [...allRevisionNotes].reverse().map((r, i) => (
                                <div key={i} className="rounded bg-gray-900 border border-emerald-900/40 p-1.5">
                                  <span className="text-[9px] font-bold text-amber-400">{r.label}</span>
                                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{r.note || <em className="text-gray-600">No note</em>}</p>
                                  <p className="text-[9px] text-gray-600 mt-0.5">{r.by} · {formatDateTime(r.at)}</p>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={() => { onCheck(); setShowCheckConfirm(false); }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-xs font-semibold transition-colors"
                            >
                              <UserCheck className="w-3 h-3" /> Confirm Check
                            </button>
                            <button
                              onClick={() => setShowCheckConfirm(false)}
                              className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCheckConfirm(true)}
                          className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold transition-colors"
                        >
                          <UserCheck className="w-3 h-3" /> Mark as Checked
                        </button>
                      )}
                    </div>

                    {/* Approved by */}
                    <div className={`rounded-lg border p-2.5 ${drawing.approvedBy ? "bg-blue-950 border-blue-800" : "bg-gray-900 border-gray-800"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <ThumbsUp className="w-3 h-3 text-blue-400" />
                        <p className="text-[9px] text-blue-400 uppercase tracking-widest font-semibold">Approved By</p>
                      </div>
                      {drawing.approvedBy ? (
                        <>
                          <p className="text-xs text-gray-200 font-medium">{drawing.approvedBy.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatDateTime(drawing.approvedBy.at)}</p>
                        </>
                      ) : (
                        <button
                          onClick={onApprove}
                          disabled={!drawing.checkedBy}
                          className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-blue-100 text-xs font-semibold transition-colors"
                          title={!drawing.checkedBy ? "Drawing must be checked before approving" : ""}
                        >
                          <ThumbsUp className="w-3 h-3" /> Mark as Approved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="p-3 space-y-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">Revision History ({drawing.history.length + 1} versions)</p>
                  {[
                    {
                      revisionLabel: drawing.revisionLabel,
                      uploadedAt: drawing.uploadedAt,
                      status: drawing.status,
                      note: drawing.note,
                      revisedBy: drawing.uploadedBy,
                      erpFileUrl: drawing.erpFileUrl,
                      current: true,
                    },
                    ...drawing.history.map(h => ({ ...h, current: false })).reverse(),
                  ].map((entry, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border ${entry.current ? "border-blue-700 bg-blue-950" : "border-gray-800 bg-gray-900"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <StatusBadge status={entry.status as DrawingStatus} label={entry.revisionLabel} />
                        {entry.current && <span className="text-[9px] text-blue-400 font-semibold">CURRENT</span>}
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="w-2.5 h-2.5 text-gray-600" />
                        <span className="text-[10px] text-gray-400">{(entry as any).revisedBy || "—"}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{formatDateTime(entry.uploadedAt)}</p>
                      {entry.note ? (
                        <div className="mt-2 rounded bg-gray-800 border border-gray-700 px-2 py-1.5">
                          <p className="text-[9px] text-amber-500 uppercase tracking-widest mb-0.5 font-semibold">What was revised</p>
                          <p className="text-[10px] text-gray-300 leading-relaxed">{entry.note}</p>
                        </div>
                      ) : null}
                      {(entry as any).erpFileUrl && (
                        <p className="text-[9px] text-emerald-500 mt-1 break-all">ERP: {(entry as any).erpFileUrl}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "pages" && (
                <div className="p-2">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-1">
                    {numPages ? `${numPages} pages` : "Loading…"}
                  </p>
                  {numPages && getFileData(drawing) && (
                    <Document file={getFileData(drawing)} loading={null} onLoadError={() => {}}>
                      <div className="space-y-1.5">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                          <button key={pg} onClick={() => setPageNumber(pg)}
                            className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${pg === pageNumber ? "border-blue-500" : "border-transparent hover:border-gray-700"}`}>
                            <div className="bg-white overflow-hidden flex items-center justify-center relative">
                              <Page pageNumber={pg} width={220} renderTextLayer={false} renderAnnotationLayer={false} />
                              <PdfWatermark status={drawing.status} revisionLbl={drawing.revisionLabel} />
                            </div>
                            <div className={`py-1 px-2 flex items-center justify-between ${pg === pageNumber ? "bg-blue-900" : "bg-gray-800"}`}>
                              <span className={`text-[10px] font-medium ${pg === pageNumber ? "text-blue-200" : "text-gray-400"}`}>Page {pg}</span>
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

interface FileEntry {
  file: File;
  drawingNo: string;
  title: string;
  systemName: string;
}

interface ErpProject {
  id: number;
  name: string;
  erpnextName?: string;
}

interface UploadModalProps {
  userDept: string;
  userName: string;
  onClose: () => void;
  onSubmit: (drawings: Array<{
    drawingNo: string; title: string; project: string; department: string;
    systemName: string; fileData: string; fileName: string; note: string; uploadedBy: string;
  }>) => void;
}

function UploadModal({ userDept, userName, onClose, onSubmit }: UploadModalProps) {
  const [project, setProject] = useState("");
  const [department, setDepartment] = useState(userDept || "Mechanical");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erpProjects, setErpProjects] = useState<ErpProject[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectDrop, setShowProjectDrop] = useState(false);
  const [sameSystem, setSameSystem] = useState(true);
  const [globalSystem, setGlobalSystem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BASE}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ErpProject[]) => setErpProjects(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setShowProjectDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProjects = erpProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.erpnextName || "").toLowerCase().includes(projectSearch.toLowerCase())
  );

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles(prev => {
      const existing = new Set(prev.map(e => e.file.name));
      const newEntries: FileEntry[] = pdfs
        .filter(f => !existing.has(f.name))
        .map(f => ({
          file: f,
          drawingNo: f.name.replace(/\.pdf$/i, ""),
          title: "",
          systemName: "",
        }));
      return [...prev, ...newEntries];
    });
  }, []);

  const updateEntry = (idx: number, field: keyof Omit<FileEntry, "file">, value: string) => {
    setFiles(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEntry = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !project) return;
    if (!note.trim()) { setNoteError(true); return; }
    setNoteError(false);
    setLoading(true);
    const results: Array<{
      drawingNo: string; title: string; project: string; department: string;
      systemName: string; fileData: string; fileName: string; note: string; uploadedBy: string;
    }> = [];

    for (const entry of files) {
      const fileData = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(entry.file);
      });
      results.push({
        drawingNo: entry.drawingNo || entry.file.name.replace(/\.pdf$/i, ""),
        title: entry.title,
        project,
        department,
        systemName: sameSystem ? globalSystem : (entry.systemName || ""),
        fileData,
        fileName: entry.file.name,
        note,
        uploadedBy: userName,
      });
    }

    onSubmit(results);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload Drawings</h2>
              <p className="text-xs text-gray-500">All new uploads start as <strong>Draft</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* Project — ERP dropdown */}
            <div ref={projectRef} className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Project * {erpProjects.length > 0 && <span className="text-gray-400 font-normal">({erpProjects.length} from ERP)</span>}
              </label>
              <div
                onClick={() => setShowProjectDrop(v => !v)}
                className={`w-full border rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${project ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"} focus:outline-none`}
              >
                {project ? (
                <span className="text-gray-900 flex items-center gap-2">
                  {erpProjects.find(p => p.name === project)?.erpnextName && (
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">
                      {erpProjects.find(p => p.name === project)?.erpnextName}
                    </span>
                  )}
                  <span className="truncate">{project}</span>
                </span>
              ) : (
                <span className="text-gray-400">Select project…</span>
              )}
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
              {showProjectDrop && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      placeholder="Search projects…"
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {filteredProjects.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">
                        {erpProjects.length === 0 ? "Loading projects…" : "No projects found"}
                      </p>
                    ) : (
                      filteredProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setProject(p.name); setShowProjectDrop(false); setProjectSearch(""); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${project === p.name ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                        >
                          <Briefcase className="w-3.5 h-3.5 flex-shrink-0 opacity-50 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              {p.erpnextName && (
                                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded flex-shrink-0">
                                  {p.erpnextName}
                                </span>
                              )}
                              <span className="truncate text-xs">{p.name}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* System Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">System Name *</label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameSystem}
                  onChange={e => setSameSystem(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                <span className="text-xs text-gray-500">Same system for all drawings</span>
              </label>
            </div>
            {sameSystem ? (
              <select
                value={globalSystem}
                onChange={e => setGlobalSystem(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${globalSystem ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
              >
                <option value="">Select system…</option>
                {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic">Select system per drawing below</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Drawing Description / Note <span className="text-red-500">*</span>
            </label>
            <textarea value={note} onChange={e => { setNote(e.target.value); if (noteError && e.target.value.trim()) setNoteError(false); }}
              placeholder="Describe this drawing — what it covers, key details, initial version notes…" rows={2}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${noteError ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"}`} />
            {noteError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500">A description note is required for every drawing upload.</p>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
              onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />
            <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
            <p className="text-sm text-gray-600 font-medium">Drop multiple PDFs here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PDF files only · Multiple selection supported</p>
          </div>

          {/* Per-file fields */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </p>
                <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
              </div>
              {files.map((entry, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">{entry.file.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">({(entry.file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button onClick={() => removeEntry(idx)} className="p-1 rounded text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Drawing No.</label>
                      <input value={entry.drawingNo}
                        onChange={e => updateEntry(idx, "drawingNo", e.target.value)}
                        placeholder="MEC-001"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Title</label>
                      <input value={entry.title}
                        onChange={e => updateEntry(idx, "title", e.target.value)}
                        placeholder="Drawing title"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  {!sameSystem && (
                    <div className="mt-2">
                      <label className="block text-[10px] text-gray-500 mb-0.5">System Name *</label>
                      <select
                        value={entry.systemName}
                        onChange={e => updateEntry(idx, "systemName", e.target.value)}
                        className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${entry.systemName ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                      >
                        <option value="">Select system…</option>
                        {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">All drawings will be saved as <strong>Draft</strong>. You can promote them to Revision or Final Copy later.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-500">
            {files.length === 0 ? "No files selected" : `${files.length} PDF${files.length !== 1 ? "s" : ""} ready to upload`}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || !project || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload {files.length > 0 ? `${files.length} ` : ""}Drawing{files.length !== 1 ? "s" : ""}
            </button>
          </div>
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
  const [noteError, setNoteError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const nextRevNo = drawing.status === "draft" ? 1 : drawing.revisionNo + 1;
  const nextLabel = `Rev ${revisionLetter(nextRevNo)}`;

  const handleFile = useCallback((f: File) => {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) setFile(f);
  }, []);

  const handleSubmit = () => {
    if (!file) return;
    if (!note.trim()) { setNoteError(true); return; }
    setNoteError(false);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      onSubmit({ fileData: e.target?.result as string, fileName: file.name, note: note.trim() });
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            <p className="font-medium text-gray-800">{drawing.drawingNo}{drawing.title ? ` — ${drawing.title}` : ""}</p>
            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
              Current: <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
            </p>
          </div>

          {/* Mandatory revision description */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              What was revised? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); if (noteError && e.target.value.trim()) setNoteError(false); }}
              placeholder="Describe exactly what was changed, corrected or updated in this revision…"
              rows={4}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${noteError ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"}`}
            />
            {noteError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500">This field is mandatory. Please describe what was revised.</p>
              </div>
            )}
          </div>

          {/* Previous revisions for reference */}
          {drawing.history.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-2">Previous revision notes</p>
              <div className="space-y-2 max-h-28 overflow-auto">
                {[...drawing.history].reverse().map((h, i) => (
                  <div key={i} className="border-l-2 border-amber-300 pl-2">
                    <p className="text-[10px] font-semibold text-amber-800">{h.revisionLabel}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">{h.note || <em>No note</em>}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <p className="text-sm text-gray-600 font-medium">Drop revised PDF or click to browse <span className="text-red-500">*</span></p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!file || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
            Upload {nextLabel}
          </button>
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

function SelectFilter({
  value, onChange, options, placeholder, icon: Icon,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative flex items-center">
      <Icon className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function ProjectDrawings() {
  const { user } = useAuth();
  const [drawings, setDrawings] = useState<ProjectDrawing[]>(loadDrawings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DrawingStatus | "all">("all");
  const [deptFilter, setDeptFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [userProfile, setUserProfile] = useState<{ department: string | null; designation: string | null }>({ department: null, designation: null });
  const [erpProjectList, setErpProjectList] = useState<ErpProject[]>([]);

  useEffect(() => {
    fetch(`${BASE}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ErpProject[]) => setErpProjectList(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUserProfile({ department: data.department || null, designation: data.designation || null });
        }
      })
      .catch(() => {});
  }, [user?.email]);

  const persist = (updated: ProjectDrawing[]) => {
    setDrawings(updated);
    saveDrawings(updated);
  };

  const allDepts = Array.from(new Set(drawings.map(d => d.department).filter(Boolean))).sort();
  const allProjects = Array.from(new Set(drawings.map(d => d.project).filter(Boolean))).sort();

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.drawingNo.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.project.toLowerCase().includes(q) ||
      d.systemName.toLowerCase().includes(q) ||
      d.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchDept = !deptFilter || d.department === deptFilter;
    const matchProject = !projectFilter || d.project === projectFilter;
    return matchSearch && matchStatus && matchDept && matchProject;
  });

  const handleUpload = async (items: Array<{
    drawingNo: string; title: string; project: string; department: string;
    systemName: string; fileData: string; fileName: string; note: string; uploadedBy: string;
  }>) => {
    const newDrawings: ProjectDrawing[] = await Promise.all(items.map(async data => {
      const id = crypto.randomUUID();
      const erpFileUrl = await uploadToErpNext(data.fileData, data.fileName);
      if (data.fileData) fileDataCache.set(id, data.fileData);
      return {
        id,
        drawingNo: data.drawingNo,
        title: data.title,
        project: data.project,
        department: data.department,
        systemName: data.systemName || "",
        uploadedAt: new Date().toISOString(),
        status: "draft" as DrawingStatus,
        revisionNo: 0,
        revisionLabel: "Draft",
        fileData: "",
        fileName: data.fileName,
        note: data.note,
        uploadedBy: data.uploadedBy,
        history: [],
        viewLog: [],
        checkedBy: null,
        approvedBy: null,
        erpFileUrl,
      };
    }));
    persist([...newDrawings, ...drawings]);
    setModal({ type: "none" });
  };

  const handleRevision = async (drawing: ProjectDrawing, data: { fileData: string; fileName: string; note: string }) => {
    const historyEntry: RevisionEntry = {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: "",
      fileName: drawing.fileName,
      note: drawing.note,
      revisedBy: drawing.uploadedBy,
      erpFileUrl: drawing.erpFileUrl || undefined,
    };
    const newRevNo = drawing.status === "draft" ? 1 : drawing.revisionNo + 1;
    const erpFileUrl = await uploadToErpNext(data.fileData, data.fileName);
    if (data.fileData) fileDataCache.set(drawing.id, data.fileData);
    const updated: ProjectDrawing = {
      ...drawing,
      status: "revision",
      revisionNo: newRevNo,
      revisionLabel: `Rev ${revisionLetter(newRevNo)}`,
      fileData: "",
      fileName: data.fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.full_name || drawing.uploadedBy,
      note: data.note,
      history: [...drawing.history, historyEntry],
      checkedBy: null,
      approvedBy: null,
      erpFileUrl,
    };
    persist(drawings.map(d => d.id === drawing.id ? updated : d));
    setModal({ type: "none" });
  };

  const handleFinal = (drawing: ProjectDrawing) => {
    const historyEntry: RevisionEntry = {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: "",
      fileName: drawing.fileName,
      note: drawing.note,
      revisedBy: drawing.uploadedBy,
      erpFileUrl: drawing.erpFileUrl || undefined,
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

  const handleCheck = (drawing: ProjectDrawing) => {
    const updated: ProjectDrawing = {
      ...drawing,
      checkedBy: { name: user?.full_name || "Unknown", at: new Date().toISOString() },
    };
    persist(drawings.map(d => d.id === drawing.id ? updated : d));
  };

  const handleApprove = (drawing: ProjectDrawing) => {
    const updated: ProjectDrawing = {
      ...drawing,
      approvedBy: { name: user?.full_name || "Unknown", at: new Date().toISOString() },
    };
    persist(drawings.map(d => d.id === drawing.id ? updated : d));
  };

  const handleLogView = useCallback((drawingId: string) => {
    if (!user?.full_name) return;
    setDrawings(prev => {
      const updated = prev.map(d => {
        if (d.id !== drawingId) return d;
        const recentLog = d.viewLog?.[d.viewLog.length - 1];
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        if (recentLog && recentLog.by === user.full_name && recentLog.at > fiveMinAgo) return d;
        return {
          ...d,
          viewLog: [...(d.viewLog || []), { by: user.full_name, at: new Date().toISOString() }],
        };
      });
      saveDrawings(updated);
      return updated;
    });
  }, [user?.full_name]);

  useEffect(() => {
    if (viewerIdx !== null && filtered[viewerIdx]) {
      handleLogView(filtered[viewerIdx].id);
    }
  }, [viewerIdx]);

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
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Project Drawings</h1>
              </div>
              <p className="text-sm text-gray-500">Drawing management — upload, track revisions, and mark finals</p>

              {/* ERP User Info */}
              {user && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-blue-800">{user.full_name}</span>
                  </div>
                  {userProfile.department && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-medium text-indigo-800">{userProfile.department}</span>
                    </div>
                  )}
                  {userProfile.designation && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-xs text-gray-600">{userProfile.designation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setModal({ type: "upload" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Upload Drawing
            </button>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status tabs */}
            {([
              { key: "all", label: "All" },
              { key: "draft", label: "Draft" },
              { key: "revision", label: "Revision" },
              { key: "final", label: "Final Copy" },
            ] as { key: DrawingStatus | "all"; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${statusFilter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"}`}>
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {counts[key]}
                </span>
              </button>
            ))}

            <div className="h-5 w-px bg-gray-300 mx-1" />

            {/* Dept filter */}
            <SelectFilter
              value={deptFilter}
              onChange={setDeptFilter}
              options={allDepts.length ? allDepts : DEPARTMENTS}
              placeholder="All Departments"
              icon={Building2}
            />

            {/* Project filter */}
            <SelectFilter
              value={projectFilter}
              onChange={setProjectFilter}
              options={allProjects}
              placeholder="All Projects"
              icon={Filter}
            />

            {/* Search */}
            <div className="ml-auto flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search drawings…"
                className="text-sm outline-none text-gray-700 w-40 placeholder-gray-400" />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
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
                  {drawings.length === 0 ? "Upload your first drawing to get started" : "Try adjusting your search or filters"}
                </p>
              </div>
              {drawings.length === 0 && (
                <button onClick={() => setModal({ type: "upload" })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4" /> Upload First Drawing
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-2.5">
              <div className="hidden md:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-3 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                <span>Drawing No.</span>
                <span>Title</span>
                <span>Project</span>
                <span>System</span>
                <span>Department</span>
                <span>Status</span>
                <span>Revisions</span>
                <span>Date</span>
                <span />
              </div>

              {filtered.map((drawing) => (
                <div key={drawing.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <div className="hidden md:grid grid-cols-[1.5fr_2fr_2fr_1.5fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-3 items-center">
                    <div className="font-mono text-sm font-semibold text-gray-900 truncate" title={drawing.drawingNo}>
                      {drawing.drawingNo}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{drawing.title || <span className="text-gray-400 italic">—</span>}</p>
                    </div>
                    <div className="text-xs text-gray-600 truncate" title={drawing.project}>{drawing.project || "—"}</div>
                    <div className="text-xs text-blue-700 font-medium truncate" title={drawing.systemName}>{drawing.systemName || <span className="text-gray-400 font-normal">—</span>}</div>
                    <div className="text-xs text-gray-600 truncate" title={drawing.department}>{drawing.department || "—"}</div>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
                      <div className="flex items-center gap-1">
                        {drawing.checkedBy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-2.5 h-2.5" /> Checked
                          </span>
                        )}
                        {drawing.approvedBy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ThumbsUp className="w-2.5 h-2.5" /> Approved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {drawing.history.length === 0 ? "—" : `${drawing.history.length} rev${drawing.history.length !== 1 ? "s" : ""}`}
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(drawing.uploadedAt)}</div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        const idx = filtered.findIndex(d => d.id === drawing.id);
                        setViewerIdx(idx);
                      }} title="View PDF"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {drawing.status !== "final" && (
                        <button onClick={() => setModal({ type: "revision", drawing })} title="Upload Revision"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button onClick={() => setModal({ type: "final", drawing })} title="Mark as Final Copy"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setModal({ type: "delete", drawing })} title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-gray-900">{drawing.drawingNo}</p>
                        {drawing.title && <p className="text-sm text-gray-700 mt-0.5">{drawing.title}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={drawing.status} label={drawing.revisionLabel} />
                          {drawing.department && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{drawing.department}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(drawing.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => { const idx = filtered.findIndex(d => d.id === drawing.id); setViewerIdx(idx); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {drawing.status !== "final" && (
                        <button onClick={() => setModal({ type: "revision", drawing })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors">
                          <RefreshCw className="w-3.5 h-3.5" /> Revise
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button onClick={() => setModal({ type: "final", drawing })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Final
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
          onCheck={() => handleCheck(filtered[viewerIdx])}
          onApprove={() => handleApprove(filtered[viewerIdx])}
          currentUserName={user?.full_name || ""}
        />
      )}

      {/* Modals */}
      {modal.type === "upload" && (
        <UploadModal
          userDept={userProfile.department || "Mechanical"}
          userName={user?.full_name || ""}
          onClose={() => setModal({ type: "none" })}
          onSubmit={handleUpload}
        />
      )}
      {modal.type === "revision" && (
        <RevisionModal
          drawing={modal.drawing}
          onClose={() => setModal({ type: "none" })}
          onSubmit={data => handleRevision(modal.drawing, data)}
        />
      )}
      {modal.type === "final" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Mark as Final Copy?</h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <strong>{modal.drawing.drawingNo}</strong>
              {modal.drawing.title ? ` — ${modal.drawing.title}` : ""}
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will apply a <strong>FINAL COPY</strong> watermark when the PDF is viewed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleFinal(modal.drawing)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Confirm Final
              </button>
            </div>
          </div>
        </div>
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
              <button onClick={() => { persist(drawings.filter(d => d.id !== modal.drawing.id)); setModal({ type: "none" }); }}
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
