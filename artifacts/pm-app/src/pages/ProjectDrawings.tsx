import { Layout } from "@/components/Layout";
import {
  Upload,
  FileText,
  Eye,
  History,
  CheckCircle2,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Highlighter,
  PanelRight,
  Info,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  FolderOpen,
  Shield,
  ArrowUpCircle,
  Building2,
  Filter,
  ChevronDown,
  Briefcase,
  UserCheck,
  AlertTriangle,
  ThumbsUp,
  AlertCircle,
  Users,
  Send,
  Mail,
  MessageSquare,
  Loader2,
  Sparkles,
  Tag,
  Lightbulb,
  ListChecks,
  ScanSearch,
  Pen,
  Type,
  Circle,
  Square,
  Eraser,
  Undo2,
  MousePointer2,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, CSSProperties, ElementType } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "@/hooks/useAuth";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function renderPdfFirstPageToBase64(fileData: string): Promise<string> {
  const dataUrl = fileData.startsWith("data:") ? fileData : `data:application/pdf;base64,${fileData}`;
  const base64 = dataUrl.split(",")[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx as any, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Browser-compatible UUID generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ──────────────────────────────────────────────
// Annotation types
// ──────────────────────────────────────────────
type AnnotationTool = "select" | "highlight" | "pen" | "text" | "circle" | "rect" | "eraser";

interface BaseAnnotation { id: string; page: number; color: string; }
interface PenAnnotation extends BaseAnnotation { type: "pen"; points: number[]; }
interface HighlightAnnotation extends BaseAnnotation { type: "highlight"; x: number; y: number; w: number; h: number; }
interface TextAnnotation extends BaseAnnotation { type: "text"; x: number; y: number; text: string; }
interface CircleAnnotation extends BaseAnnotation { type: "circle"; cx: number; cy: number; rx: number; ry: number; }
interface RectAnnotation extends BaseAnnotation { type: "rect"; x: number; y: number; w: number; h: number; }
type Annotation = PenAnnotation | HighlightAnnotation | TextAnnotation | CircleAnnotation | RectAnnotation;

const ANNOT_COLORS = ["#FBBF24", "#3B82F6", "#EF4444", "#22C55E", "#A855F7", "#000000"];

function hitTest(a: Annotation, px: number, py: number): boolean {
  const pad = 12;
  if (a.type === "highlight" || a.type === "rect") {
    const x = a.w < 0 ? a.x + a.w : a.x;
    const y = a.h < 0 ? a.y + a.h : a.y;
    return px >= x - pad && px <= x + Math.abs(a.w) + pad && py >= y - pad && py <= y + Math.abs(a.h) + pad;
  }
  if (a.type === "circle") {
    const dx = (px - a.cx) / Math.max(1, a.rx + pad);
    const dy = (py - a.cy) / Math.max(1, a.ry + pad);
    return dx * dx + dy * dy <= 1.2;
  }
  if (a.type === "text") {
    return Math.abs(px - a.x) < 80 && Math.abs(py - a.y) < 20;
  }
  if (a.type === "pen") {
    for (let i = 0; i < a.points.length - 2; i += 2) {
      const ax = a.points[i], ay = a.points[i + 1];
      const bx = a.points[i + 2], by = a.points[i + 3];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const nx = ax + t * dx - px, ny = ay + t * dy - py;
      if (nx * nx + ny * ny < (pad + 6) * (pad + 6)) return true;
    }
  }
  return false;
}

function AnnotationLayer({
  width,
  height,
  activeTool,
  color,
  annotations,
  onAdd,
  onRemove,
}: {
  width: number;
  height: number;
  activeTool: AnnotationTool;
  color: string;
  annotations: Annotation[];
  onAdd: (a: Annotation) => void;
  onRemove: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const startPt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [textInput, setTextInput] = useState<{ svgX: number; svgY: number; value: string } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (textInput) setTimeout(() => textInputRef.current?.focus(), 30);
  }, [textInput]);

  const getSVGPt = (e: ReactMouseEvent): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  };

  const commitText = (value: string) => {
    if (!textInput) return;
    if (value.trim()) {
      onAdd({ id: generateUUID(), page: 0, type: "text", color, x: textInput.svgX, y: textInput.svgY, text: value.trim() });
    }
    setTextInput(null);
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    if (activeTool === "select") return;
    if (textInput) { commitText(textInput.value); return; }

    const pt = getSVGPt(e);

    if (activeTool === "eraser") {
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTest(annotations[i], pt.x, pt.y)) {
          onRemove(annotations[i].id);
          return;
        }
      }
      return;
    }

    if (activeTool === "text") {
      setTextInput({ svgX: pt.x, svgY: pt.y, value: "" });
      return;
    }

    drawing.current = true;
    startPt.current = pt;
    if (activeTool === "pen") {
      setDraft({ id: generateUUID(), page: 0, type: "pen", color, points: [pt.x, pt.y] });
    } else if (activeTool === "highlight") {
      setDraft({ id: generateUUID(), page: 0, type: "highlight", color: "#FBBF24", x: pt.x, y: pt.y, w: 0, h: 0 });
    } else if (activeTool === "circle") {
      setDraft({ id: generateUUID(), page: 0, type: "circle", color, cx: pt.x, cy: pt.y, rx: 0, ry: 0 });
    } else if (activeTool === "rect") {
      setDraft({ id: generateUUID(), page: 0, type: "rect", color, x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (activeTool === "eraser") {
      const pt = getSVGPt(e);
      const hit = [...annotations].reverse().find(a => hitTest(a, pt.x, pt.y));
      setHoveredId(hit?.id ?? null);
      return;
    }
    if (!drawing.current || !draft) return;
    const pt = getSVGPt(e);
    if (draft.type === "pen") {
      setDraft(d => d && d.type === "pen" ? { ...d, points: [...d.points, pt.x, pt.y] } : d);
    } else if (draft.type === "highlight") {
      setDraft(d => d && d.type === "highlight" ? { ...d, w: pt.x - startPt.current.x, h: pt.y - startPt.current.y } : d);
    } else if (draft.type === "circle") {
      const rx = Math.abs(pt.x - startPt.current.x);
      const ry = Math.abs(pt.y - startPt.current.y);
      setDraft(d => d && d.type === "circle" ? { ...d, cx: startPt.current.x, cy: startPt.current.y, rx, ry } : d);
    } else if (draft.type === "rect") {
      setDraft(d => d && d.type === "rect" ? { ...d, w: pt.x - startPt.current.x, h: pt.y - startPt.current.y } : d);
    }
  };

  const onMouseUp = () => {
    if (!drawing.current || !draft) return;
    drawing.current = false;
    const minSize = 4;
    if (draft.type === "pen" && draft.points.length >= 4) onAdd(draft);
    else if (draft.type === "highlight" && (Math.abs((draft as HighlightAnnotation).w) > minSize || Math.abs((draft as HighlightAnnotation).h) > minSize)) onAdd(draft);
    else if (draft.type === "circle" && ((draft as CircleAnnotation).rx > minSize || (draft as CircleAnnotation).ry > minSize)) onAdd(draft);
    else if (draft.type === "rect" && (Math.abs((draft as RectAnnotation).w) > minSize || Math.abs((draft as RectAnnotation).h) > minSize)) onAdd(draft);
    setDraft(null);
  };

  const renderAnnotation = (a: Annotation, idx: number, isDraft = false) => {
    const key = isDraft ? "draft" : a.id ?? idx;
    const strokeW = 2.5;
    const isHovered = !isDraft && hoveredId === a.id && activeTool === "eraser";
    const eraserStyle = isHovered ? { opacity: 0.4, filter: "url(#eraser-hover)" } : {};
    if (a.type === "pen") {
      if (a.points.length < 4) return null;
      const d = `M ${a.points[0]} ${a.points[1]} ` + a.points.slice(2).reduce((acc, v, i) =>
        i % 2 === 0 ? acc + `L ${v} ` : acc + `${v} `, "");
      return <path key={key} d={d} stroke={a.color} strokeWidth={strokeW} fill="none" strokeLinecap="round" strokeLinejoin="round" style={eraserStyle} />;
    }
    if (a.type === "highlight") {
      const x = a.w < 0 ? a.x + a.w : a.x;
      const y = a.h < 0 ? a.y + a.h : a.y;
      return <rect key={key} x={x} y={y} width={Math.abs(a.w)} height={Math.abs(a.h)} fill={a.color} fillOpacity={isHovered ? 0.1 : 0.35} stroke={a.color} strokeWidth={1} strokeDasharray={isHovered ? "4 2" : undefined} />;
    }
    if (a.type === "text") {
      return (
        <text key={key} x={a.x} y={a.y} fill={a.color} fontSize={14} fontFamily="sans-serif" fontWeight="700" style={{ userSelect: "none", ...eraserStyle }}>{a.text}</text>
      );
    }
    if (a.type === "circle") {
      return <ellipse key={key} cx={a.cx} cy={a.cy} rx={Math.max(1, a.rx)} ry={Math.max(1, a.ry)} stroke={a.color} strokeWidth={strokeW} fill="none" style={eraserStyle} />;
    }
    if (a.type === "rect") {
      const x = a.w < 0 ? a.x + a.w : a.x;
      const y = a.h < 0 ? a.y + a.h : a.y;
      return <rect key={key} x={x} y={y} width={Math.abs(a.w)} height={Math.abs(a.h)} stroke={a.color} strokeWidth={strokeW} fill="none" style={eraserStyle} />;
    }
    return null;
  };

  const cursorMap: Record<AnnotationTool, string> = {
    select: "default",
    highlight: "crosshair",
    pen: "crosshair",
    text: "text",
    circle: "crosshair",
    rect: "crosshair",
    eraser: "cell",
  };

  if (width === 0 || height === 0) return null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        cursor: textInput ? "text" : cursorMap[activeTool],
        pointerEvents: activeTool === "select" ? "none" : "all",
        zIndex: 10,
        touchAction: "none",
        overflow: "visible",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { onMouseUp(); setHoveredId(null); }}
    >
      <defs>
        <filter id="eraser-hover">
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      {annotations.map((a, i) => renderAnnotation(a, i))}
      {draft && renderAnnotation(draft, -1, true)}

      {/* Inline text input */}
      {textInput && (
        <foreignObject
          x={textInput.svgX}
          y={textInput.svgY - 28}
          width={220}
          height={38}
          style={{ overflow: "visible" }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput.value}
              placeholder="Type your note…"
              onChange={(e) => setTextInput(t => t ? { ...t, value: e.target.value } : t)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { commitText(textInput.value); }
                if (e.key === "Escape") { setTextInput(null); }
                e.stopPropagation();
              }}
              onBlur={() => commitText(textInput.value)}
              style={{
                width: 200,
                padding: "4px 8px",
                fontSize: 13,
                fontFamily: "sans-serif",
                fontWeight: 600,
                color: color,
                background: "rgba(10,10,20,0.85)",
                border: `2px solid ${color}`,
                borderRadius: 5,
                outline: "none",
                boxShadow: `0 0 0 3px ${color}33`,
              }}
            />
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

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

interface AiAnalysisResult {
  detectedType: string;
  suggestedDepartment: string;
  summary: string;
  keyElements: string[];
  observations: string[];
  recommendations: string[];
  report: string;
  actionPlan: string[];
  isElectrical: boolean;
}

interface ProjectDrawing {
  id: string;
  drawingNo: string;
  title: string;
  project: string;
  department: string;
  drawingType: string;
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
  aiAnalysis: AiAnalysisResult | null;
}

const STATUS_CONFIG: Record<
  DrawingStatus,
  {
    label: string;
    bg: string;
    border: string;
    textColor: string;
    watermarkText: string;
    watermarkColor: string;
  }
> = {
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

const DRAWING_TYPES: { type: string; dept: string }[] = [
  { type: "P&ID (Piping & Instrumentation Diagram)", dept: "Instrumentation" },
  { type: "PFD (Process Flow Diagram)", dept: "Process" },
  { type: "GA (General Arrangement)", dept: "Mechanical" },
  { type: "Electrical SLD (Single Line Diagram)", dept: "Electrical" },
  { type: "Electrical Layout Drawing", dept: "Electrical" },
  { type: "Civil / Structural Drawing", dept: "Civil" },
  { type: "Isometric Drawing", dept: "Mechanical" },
  { type: "Layout / Plot Plan", dept: "Civil" },
  { type: "Instrument Loop / Control Diagram", dept: "Instrumentation" },
  { type: "Mechanical Drawing", dept: "Mechanical" },
  { type: "Fire Fighting Drawing", dept: "HSE" },
  { type: "HVAC Drawing", dept: "Mechanical" },
  { type: "Process Drawing", dept: "Process" },
  { type: "Project Drawing", dept: "Project" },
  { type: "Quality / Inspection Drawing", dept: "Quality" },
  { type: "Other", dept: "" },
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
const FILE_KEY = (id: string) => `drawing-file-${id}`;

function saveFileData(id: string, data: string) {
  try { localStorage.setItem(FILE_KEY(id), data); } catch { /* ignore quota */ }
}

function loadFileData(id: string): string {
  try { return localStorage.getItem(FILE_KEY(id)) || ""; } catch { return ""; }
}

function deleteFileData(id: string) {
  try { localStorage.removeItem(FILE_KEY(id)); } catch { /* ignore */ }
}

function stripFileData(d: ProjectDrawing): ProjectDrawing {
  return {
    ...d,
    fileData: "",
    history: d.history.map((h) => ({ ...h, fileData: "" })),
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(drawings.map(stripFileData)),
    );
  } catch {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(drawings.slice(-20).map(stripFileData)),
      );
    } catch {
      /* ignore */
    }
  }
}

function getFileData(drawing: ProjectDrawing, cache?: Record<string, string>): string {
  return (cache && cache[drawing.id]) || drawing.fileData || "";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function revisionLetter(revNo: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.min(revNo - 1, 25)];
}

function StatusBadge({
  status,
  label,
}: {
  status: DrawingStatus;
  label?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor}`}
    >
      {status === "draft" && <Clock className="w-3 h-3" />}
      {status === "revision" && <RefreshCw className="w-3 h-3" />}
      {status === "final" && <CheckCircle2 className="w-3 h-3" />}
      {label || cfg.label}
    </span>
  );
}

function PdfWatermark({
  status,
  revisionLbl,
}: {
  status: DrawingStatus;
  revisionLbl: string;
}) {
  const statusText =
    status === "revision"
      ? `${STATUS_CONFIG[status].watermarkText} — ${revisionLbl}`
      : STATUS_CONFIG[status].watermarkText;

  const statusColor: Record<DrawingStatus, string> = {
    draft:    "rgba(217,119,6,0.38)",
    revision: "rgba(37,99,235,0.38)",
    final:    "rgba(5,150,105,0.38)",
  };

  const font = "'Trebuchet MS', 'Century Gothic', 'Gill Sans', Arial, sans-serif";
  const color = statusColor[status];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: "72px",
          fontFamily: font,
          fontWeight: 900,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color,
          transform: "rotate(-45deg)",
          whiteSpace: "nowrap",
        }}
      >
        {statusText}
      </span>
    </div>
  );
}

type PanelTab = "info" | "history" | "pages" | "ai";

function PdfViewer({
  drawing,
  fileData,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  total,
  currentIdx,
  onCheck,
  onApprove,
  currentUserName,
}: {
  drawing: ProjectDrawing;
  fileData: string;
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
  const [annotTool, setAnnotTool] = useState<AnnotationTool>("select");
  const [annotColor, setAnnotColor] = useState("#3B82F6");
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("info");
  const [showCheckConfirm, setShowCheckConfirm] = useState(false);
  const cfg = STATUS_CONFIG[drawing.status];
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef(false);
  const isTransitioningRef = useRef(false);

  const [aiAnalysis, setAiAnalysis] = useState<{
    detectedType: string;
    suggestedDepartment: string;
    summary: string;
    keyElements: string[];
    observations: string[];
    recommendations: string[];
    report: string;
    actionPlan: string[];
    isElectrical: boolean;
  } | null>((drawing.aiAnalysis as any) ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoAnalyzedRef = useRef(false);

  const allRevisionNotes: Array<{
    label: string;
    note: string;
    by: string;
    at: string;
  }> = [
    ...drawing.history.map((h) => ({
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

  // Show revision summary as the last virtual page when drawing has any notes/history
  const hasSummaryPage = drawing.history.length > 0 || !!drawing.note;
  const totalPages = numPages ? numPages + (hasSummaryPage ? 1 : 0) : null;
  const isOnSummaryPage = hasSummaryPage && totalPages !== null && pageNumber === totalPages;

  // Navigate to a page and reset scroll to top
  const goToPage = useCallback((n: number) => {
    if (!totalPages) return;
    scrollToBottomRef.current = false;
    isTransitioningRef.current = true;
    setPageNumber(Math.max(1, Math.min(totalPages, n)));
    setTimeout(() => { isTransitioningRef.current = false; }, 800);
  }, [totalPages]);

  // Navigate to a page and scroll to bottom (going back)
  const goToPageBottom = useCallback((n: number) => {
    if (!totalPages) return;
    scrollToBottomRef.current = true;
    isTransitioningRef.current = true;
    setPageNumber(Math.max(1, Math.min(totalPages, n)));
    setTimeout(() => { isTransitioningRef.current = false; }, 800);
  }, [totalPages]);

  // Use refs for wheel handler to always have latest values without re-adding listener
  const pageNumberRef = useRef(pageNumber);
  const totalPagesRef = useRef(totalPages);
  const goToPageRef = useRef(goToPage);
  const goToPageBottomRef = useRef(goToPageBottom);
  useEffect(() => { pageNumberRef.current = pageNumber; }, [pageNumber]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);
  useEffect(() => { goToPageRef.current = goToPage; }, [goToPage]);
  useEffect(() => { goToPageBottomRef.current = goToPageBottom; }, [goToPageBottom]);

  // After pageNumber changes, scroll to top or bottom once the new page renders
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    if (scrollToBottomRef.current) {
      // Poll until the content is fully rendered (scrollHeight grows)
      let attempts = 0;
      const tryScroll = () => {
        if (el.scrollHeight > el.clientHeight + 10) {
          el.scrollTop = el.scrollHeight;
          scrollToBottomRef.current = false;
        } else if (attempts < 20) {
          attempts++;
          requestAnimationFrame(tryScroll);
        }
      };
      requestAnimationFrame(tryScroll);
    } else {
      el.scrollTop = 0;
    }
  }, [pageNumber]);

  // Add non-passive wheel listener so preventDefault() actually works
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (isTransitioningRef.current) {
        e.preventDefault();
        return;
      }
      const tp = totalPagesRef.current;
      const pn = pageNumberRef.current;
      if (!tp) return;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      const atTop = el.scrollTop <= 8;
      if (e.deltaY > 0 && atBottom && pn < tp) {
        e.preventDefault();
        goToPageRef.current(pn + 1);
      } else if (e.deltaY < 0 && atTop && pn > 1) {
        e.preventDefault();
        goToPageBottomRef.current(pn - 1);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // mount once — refs stay current

  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
    setPdfError(false);
    setShowCheckConfirm(false);
    setAiAnalysis((drawing.aiAnalysis as any) ?? null);
    setAiError(null);
    try {
      const stored = localStorage.getItem(`wtt_annot_${drawing.id}`);
      setAnnotations(stored ? JSON.parse(stored) : {});
    } catch {
      setAnnotations({});
    }
    setAnnotTool("select");
    setPageDims({ width: 0, height: 0 });
    scrollToBottomRef.current = false;
    isTransitioningRef.current = false;
    autoAnalyzedRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [drawing.id]);

  // Auto-save annotations to localStorage whenever they change
  useEffect(() => {
    if (!drawing.id) return;
    try {
      localStorage.setItem(`wtt_annot_${drawing.id}`, JSON.stringify(annotations));
    } catch {}
  }, [annotations, drawing.id]);

  const handleAnalyze = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setActiveTab("ai");
    try {
      const canvas = scrollRef.current?.querySelector("canvas");
      if (!canvas) throw new Error("No rendered page available. Please wait for the drawing to load.");
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
      const resp = await fetch(`${BASE}/api/drawings/analyze-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          drawingNo: drawing.drawingNo,
          title: drawing.title,
          department: drawing.department,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const data = await resp.json();
      setAiAnalysis(data);
      // Save to DB so report is available next time without re-analyzing
      fetch(`${BASE}/api/project-drawings/${drawing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiAnalysis: data }),
      }).catch(() => {});
    } catch (e: any) {
      setAiError(e.message || "Analysis failed");
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, drawing.id, drawing.drawingNo, drawing.title, drawing.department]);

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
    { key: "ai", label: "AI", icon: Sparkles },
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
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor} flex-shrink-0`}
        >
          {drawing.status === "draft" && <Clock className="w-3.5 h-3.5" />}
          {drawing.status === "revision" && (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {drawing.status === "final" && (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {drawing.revisionLabel}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {drawing.drawingNo}
            {drawing.title ? ` — ${drawing.title}` : ""}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {[drawing.project, drawing.systemName, drawing.department]
              .filter(Boolean)
              .join(" · ")}
          </p>
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-0.5">
          <button
            onClick={() => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale(1.2)}
            className="px-2 text-xs text-gray-300 tabular-nums w-12 text-center"
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={() => setScale((s) => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setScale(1.2)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Fit to window"
        >
          <RotateCcw className="w-3 h-3" /> Fit
        </button>

        <div className="h-4 w-px bg-gray-700" />

        {/* Annotation Tools */}
        {(
          [
            { tool: "select" as AnnotationTool, Icon: MousePointer2, label: "Select" },
            { tool: "highlight" as AnnotationTool, Icon: Highlighter, label: "Highlight" },
            { tool: "pen" as AnnotationTool, Icon: Pen, label: "Draw" },
            { tool: "text" as AnnotationTool, Icon: Type, label: "Write" },
            { tool: "circle" as AnnotationTool, Icon: Circle, label: "Circle" },
            { tool: "rect" as AnnotationTool, Icon: Square, label: "Rectangle" },
            { tool: "eraser" as AnnotationTool, Icon: Eraser, label: "Eraser" },
          ] as { tool: AnnotationTool; Icon: React.ElementType; label: string }[]
        ).map(({ tool, Icon, label }) => (
          <button
            key={tool}
            onClick={() => setAnnotTool(tool)}
            title={label}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              annotTool === tool
                ? tool === "highlight"
                  ? "bg-yellow-400 text-gray-900"
                  : tool === "eraser"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        {/* Color palette — hidden when eraser active */}
        {annotTool !== "eraser" && (
          <div className="flex items-center gap-1 ml-1">
            {ANNOT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setAnnotColor(c)}
                title={c}
                style={{ background: c }}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${annotColor === c ? "border-white scale-125" : "border-transparent"}`}
              />
            ))}
          </div>
        )}

        {/* Undo */}
        <button
          onClick={() =>
            setAnnotations((prev) => {
              const pg = pageNumber;
              const cur = prev[pg] ?? [];
              if (!cur.length) return prev;
              return { ...prev, [pg]: cur.slice(0, -1) };
            })
          }
          title="Undo last annotation"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        {/* Clear ALL marks on this page */}
        <button
          onClick={() => setAnnotations((prev) => ({ ...prev, [pageNumber]: [] }))}
          title="Clear all marks on this page"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear All</span>
        </button>

        <div className="h-4 w-px bg-gray-700" />

        <button
          onClick={handleAnalyze}
          disabled={aiLoading}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${aiLoading ? "text-purple-400 bg-purple-900/30 cursor-wait" : "text-purple-300 hover:text-white hover:bg-purple-700/50"}`}
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{aiLoading ? "Analyzing…" : "AI Analyze"}</span>
        </button>

        <div className="flex-1" />

        {totalPages && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-24 text-center tabular-nums">
              {pageNumber} / {totalPages}
              {isOnSummaryPage && <span className="text-blue-400 ml-1">★</span>}
            </span>
            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= (totalPages ?? 1)}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="h-4 w-px bg-gray-700" />
        <button
          onClick={() => setShowPanel((s) => !s)}
          className={`p-1.5 rounded transition-colors ${showPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-auto bg-gray-900 flex items-start justify-center p-6 relative ${annotTool === "select" ? "select-text" : "select-none"}`}
        >
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">Unable to render this PDF.</p>
              <p className="text-xs text-gray-500 text-center max-w-xs">The file may be corrupted. Try re-uploading the drawing.</p>
            </div>
          ) : !fileData ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 pt-20">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium text-gray-300">
                PDF not available
              </p>
              <p className="text-xs text-gray-500 text-center max-w-xs">
                No drawing file found. Please re-upload the PDF to view it here.
              </p>
            </div>
          ) : (
            <>
              {/* PDF Document — always mounted to preserve numPages */}
              <div style={{ display: isOnSummaryPage ? "none" : "block" }} className="relative">
                <Document
                  file={fileData}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setPageNumber(1);
                  }}
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
                      pageNumber={Math.min(pageNumber, numPages ?? 1)}
                      scale={scale}
                      renderTextLayer={annotTool === "select" || annotTool === "highlight"}
                      renderAnnotationLayer={false}
                      className="shadow-2xl"
                      onRenderSuccess={(page) => {
                        setPageDims({ width: page.width, height: page.height });
                      }}
                    />
                    <PdfWatermark
                      status={drawing.status}
                      revisionLbl={drawing.revisionLabel}
                    />
                    <AnnotationLayer
                      width={pageDims.width}
                      height={pageDims.height}
                      activeTool={annotTool}
                      color={annotColor}
                      annotations={(annotations[pageNumber] ?? []).filter(a => a.page === pageNumber)}
                      onAdd={(a) => {
                        setAnnotations((prev) => ({
                          ...prev,
                          [pageNumber]: [...(prev[pageNumber] ?? []), { ...a, page: pageNumber }],
                        }));
                      }}
                      onRemove={(id) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [pageNumber]: (prev[pageNumber] ?? []).filter(a => a.id !== id),
                        }))
                      }
                    />
                  </div>
                </Document>
              </div>

              {/* Revision Summary Page — shown as the last virtual page */}
              {isOnSummaryPage && (
                <div className="bg-white shadow-2xl" style={{ width: `${794 * scale}px`, minHeight: `${1123 * scale}px`, padding: `${40 * scale}px`, boxSizing: "border-box", fontSize: `${scale}em` }}>
                  <div style={{ borderBottom: "3px solid #1e3a5f", paddingBottom: "16px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>
                      {drawing.drawingNo}{drawing.title ? ` — ${drawing.title}` : ""}
                    </p>
                    <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1e3a5f", margin: 0 }}>
                      Revision Summary
                    </h2>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Project: {drawing.project} &nbsp;|&nbsp; Department: {drawing.department}
                    </p>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, width: "14%" }}>Revision</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, width: "16%" }}>Date</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, width: "20%" }}>Revised By</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>What Was Revised</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRevisionNotes.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e3a5f" }}>{r.label || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#374151" }}>
                            {r.at ? new Date(r.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#374151" }}>{r.by || "—"}</td>
                          <td style={{ padding: "10px 14px", color: r.note ? "#111827" : "#9ca3af", fontStyle: r.note ? "normal" : "italic" }}>
                            {r.note || "No note provided"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: "32px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#9ca3af" }}>WTT International — Auto-generated Revision Summary</span>
                    <span style={{ fontSize: "10px", color: "#9ca3af" }}>Page {totalPages} of {totalPages}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showPanel && (
          <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col flex-shrink-0">
            <div className="flex border-b border-gray-800">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${activeTab === key ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
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
                    { label: "Drawing Type", value: drawing.drawingType },
                    { label: "System", value: drawing.systemName },
                    { label: "Department", value: drawing.department },
                    { label: "File", value: drawing.fileName },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label}>
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">
                          {label}
                        </p>
                        <p
                          className={`text-sm text-gray-200 ${label === "Drawing No." ? "font-semibold" : ""} ${label === "File" ? "text-xs text-gray-400 break-all" : ""}`}
                        >
                          {value}
                        </p>
                      </div>
                    ) : null,
                  )}
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">
                      Status
                    </p>
                    <StatusBadge
                      status={drawing.status}
                      label={drawing.revisionLabel}
                    />
                  </div>
                  {numPages !== null && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">
                        Total Pages
                      </p>
                      <p className="text-sm text-gray-200">{numPages}</p>
                    </div>
                  )}
                  {drawing.note && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">
                        Note
                      </p>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {drawing.note}
                      </p>
                    </div>
                  )}
                  {drawing.erpFileUrl && (
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">
                        ERPNext File
                      </p>
                      <p className="text-[10px] text-emerald-400 break-all">
                        {drawing.erpFileUrl}
                      </p>
                    </div>
                  )}

                  {/* All Revision Notes */}
                  {allRevisionNotes.some((r) => r.note) && (
                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-[9px] text-amber-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" /> All Revision Notes
                      </p>
                      <div className="space-y-2 max-h-40 overflow-auto pr-0.5">
                        {[...allRevisionNotes].reverse().map((r, i) =>
                          r.note ? (
                            <div
                              key={i}
                              className="rounded-lg bg-gray-900 border border-amber-900/50 p-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                                  {r.label}
                                </span>
                                <span className="text-[9px] text-gray-600">
                                  {formatDateTime(r.at)}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-relaxed">
                                {r.by && (
                                  <span className="text-gray-500">
                                    {r.by}:{" "}
                                  </span>
                                )}
                                {r.note}
                              </p>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-800 pt-3 space-y-3">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">
                      Workflow Tracking
                    </p>

                    {/* Created by */}
                    <div className="rounded-lg bg-gray-900 border border-gray-800 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Upload className="w-3 h-3 text-blue-400" />
                        <p className="text-[9px] text-blue-400 uppercase tracking-widest font-semibold">
                          Created By
                        </p>
                      </div>
                      <p className="text-xs text-gray-200 font-medium">
                        {drawing.uploadedBy || "—"}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {formatDateTime(
                          drawing.history[0]?.uploadedAt || drawing.uploadedAt,
                        )}
                      </p>
                    </div>

                    {/* Viewed by */}
                    <div className="rounded-lg bg-gray-900 border border-gray-800 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Eye className="w-3 h-3 text-violet-400" />
                        <p className="text-[9px] text-violet-400 uppercase tracking-widest font-semibold">
                          Viewed By
                        </p>
                        <span className="ml-auto text-[9px] text-gray-600">
                          {drawing.viewLog?.length || 0} view
                          {(drawing.viewLog?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {(drawing.viewLog?.length || 0) === 0 ? (
                        <p className="text-[10px] text-gray-600 italic">
                          No views recorded
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-auto">
                          {[...(drawing.viewLog || [])]
                            .reverse()
                            .slice(0, 8)
                            .map((v, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between"
                              >
                                <span className="text-[10px] text-gray-300">
                                  {v.by}
                                </span>
                                <span className="text-[9px] text-gray-600">
                                  {formatDateTime(v.at)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Checked by */}
                    <div
                      className={`rounded-lg border p-2.5 ${drawing.checkedBy ? "bg-emerald-950 border-emerald-800" : showCheckConfirm ? "bg-emerald-950 border-emerald-700" : "bg-gray-900 border-gray-800"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">
                          Checked By
                        </p>
                      </div>
                      {drawing.checkedBy ? (
                        <>
                          <p className="text-xs text-gray-200 font-medium">
                            {drawing.checkedBy.name}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {formatDateTime(drawing.checkedBy.at)}
                          </p>
                        </>
                      ) : showCheckConfirm ? (
                        <div className="space-y-2">
                          <p className="text-[9px] text-emerald-300 font-semibold">
                            Review all revision notes before confirming:
                          </p>
                          <div className="space-y-1.5 max-h-36 overflow-auto">
                            {allRevisionNotes.length === 0 ||
                            allRevisionNotes.every((r) => !r.note) ? (
                              <p className="text-[10px] text-gray-500 italic">
                                No revision notes recorded
                              </p>
                            ) : (
                              [...allRevisionNotes].reverse().map((r, i) => (
                                <div
                                  key={i}
                                  className="rounded bg-gray-900 border border-emerald-900/40 p-1.5"
                                >
                                  <span className="text-[9px] font-bold text-amber-400">
                                    {r.label}
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                    {r.note || (
                                      <em className="text-gray-600">No note</em>
                                    )}
                                  </p>
                                  <p className="text-[9px] text-gray-600 mt-0.5">
                                    {r.by} · {formatDateTime(r.at)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={() => {
                                onCheck();
                                setShowCheckConfirm(false);
                              }}
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
                    <div
                      className={`rounded-lg border p-2.5 ${drawing.approvedBy ? "bg-blue-950 border-blue-800" : "bg-gray-900 border-gray-800"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ThumbsUp className="w-3 h-3 text-blue-400" />
                        <p className="text-[9px] text-blue-400 uppercase tracking-widest font-semibold">
                          Approved By
                        </p>
                      </div>
                      {drawing.approvedBy ? (
                        <>
                          <p className="text-xs text-gray-200 font-medium">
                            {drawing.approvedBy.name}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {formatDateTime(drawing.approvedBy.at)}
                          </p>
                          {/* Re-approve option for final drawings */}
                          {drawing.status === "final" && (
                            <button
                              onClick={onApprove}
                              className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-900 hover:bg-blue-700 border border-blue-700 text-blue-200 text-[10px] font-semibold transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3" /> Re-Approve
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={onApprove}
                          disabled={!drawing.checkedBy}
                          className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-blue-100 text-xs font-semibold transition-colors"
                          title={
                            !drawing.checkedBy
                              ? "Drawing must be checked before approving"
                              : ""
                          }
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
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">
                    Revision History ({drawing.history.length + 1} versions)
                  </p>
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
                    ...drawing.history
                      .map((h) => ({ ...h, current: false }))
                      .reverse(),
                  ].map((entry, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-2.5 border ${entry.current ? "border-blue-700 bg-blue-950" : "border-gray-800 bg-gray-900"}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <StatusBadge
                          status={entry.status as DrawingStatus}
                          label={entry.revisionLabel}
                        />
                        {entry.current && (
                          <span className="text-[9px] text-blue-400 font-semibold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="w-2.5 h-2.5 text-gray-600" />
                        <span className="text-[10px] text-gray-400">
                          {(entry as any).revisedBy || "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {formatDateTime(entry.uploadedAt)}
                      </p>
                      {entry.note ? (
                        <div className="mt-2 rounded bg-gray-800 border border-gray-700 px-2 py-1.5">
                          <p className="text-[9px] text-amber-500 uppercase tracking-widest mb-0.5 font-semibold">
                            What was revised
                          </p>
                          <p className="text-[10px] text-gray-300 leading-relaxed">
                            {entry.note}
                          </p>
                        </div>
                      ) : null}
                      {(entry as any).erpFileUrl && (
                        <p className="text-[9px] text-emerald-500 mt-1 break-all">
                          ERP: {(entry as any).erpFileUrl}
                        </p>
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
                  {numPages && fileData && (
                    <Document
                      file={fileData}
                      loading={null}
                      onLoadError={() => {}}
                    >
                      <div className="space-y-1.5">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(
                          (pg) => (
                            <button
                              key={pg}
                              onClick={() => goToPage(pg)}
                              className={`w-full rounded-lg overflow-hidden border-2 transition-colors text-left ${pg === pageNumber ? "border-blue-500" : "border-transparent hover:border-gray-700"}`}
                            >
                              <div className="bg-white overflow-hidden flex items-center justify-center relative">
                                <Page
                                  pageNumber={pg}
                                  width={220}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                                <PdfWatermark
                                  status={drawing.status}
                                  revisionLbl={drawing.revisionLabel}
                                />
                              </div>
                              <div
                                className={`py-1 px-2 flex items-center justify-between ${pg === pageNumber ? "bg-blue-900" : "bg-gray-800"}`}
                              >
                                <span
                                  className={`text-[10px] font-medium ${pg === pageNumber ? "text-blue-200" : "text-gray-400"}`}
                                >
                                  Page {pg}
                                </span>
                                {pg === pageNumber && (
                                  <span className="text-[9px] text-blue-300">
                                    Current
                                  </span>
                                )}
                              </div>
                            </button>
                          ),
                        )}
                      </div>
                    </Document>
                  )}
                </div>
              )}

              {activeTab === "ai" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-semibold text-purple-300">AI Drawing Analysis</p>
                  </div>
                  {!aiAnalysis && !aiLoading && !aiError && (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <ScanSearch className="w-10 h-10 text-gray-700" />
                      <p className="text-xs text-gray-500 leading-relaxed max-w-[180px]">
                        Click <strong className="text-purple-400">AI Analyze</strong> in the toolbar to analyze the current page
                      </p>
                      <button
                        onClick={handleAnalyze}
                        disabled={aiLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-700/40 text-purple-300 hover:bg-purple-700/70 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Analyze Now
                      </button>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                      <p className="text-xs text-gray-500">Analyzing drawing with AI…</p>
                    </div>
                  )}
                  {aiError && (
                    <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3">
                      <p className="text-xs text-red-400">{aiError}</p>
                      <button
                        onClick={handleAnalyze}
                        className="mt-2 text-[11px] text-red-300 hover:text-white underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {aiAnalysis && !aiLoading && (
                    <div className="space-y-4">
                      {/* Detected type & department */}
                      <div className="rounded-lg bg-purple-900/20 border border-purple-700/40 p-3 space-y-2">
                        <div>
                          <p className="text-[9px] text-purple-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Tag className="w-3 h-3" /> Detected Type</p>
                          <p className="text-xs text-gray-100 font-medium">{aiAnalysis.detectedType || "—"}</p>
                        </div>
                        {aiAnalysis.suggestedDepartment && (
                          <div>
                            <p className="text-[9px] text-purple-400 uppercase tracking-widest mb-0.5">Suggested Department</p>
                            <p className="text-xs text-gray-200">{aiAnalysis.suggestedDepartment}</p>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      {aiAnalysis.summary && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Summary</p>
                          <p className="text-xs text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                        </div>
                      )}

                      {/* Key elements */}
                      {aiAnalysis.keyElements.length > 0 && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><ListChecks className="w-3 h-3" /> Key Elements</p>
                          <div className="space-y-1">
                            {aiAnalysis.keyElements.map((el, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                <p className="text-[11px] text-gray-400 leading-relaxed">{el}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observations */}
                      {aiAnalysis.observations.length > 0 && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Eye className="w-3 h-3" /> Observations</p>
                          <div className="space-y-1">
                            {aiAnalysis.observations.map((obs, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <p className="text-[11px] text-gray-400 leading-relaxed">{obs}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {aiAnalysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Recommendations</p>
                          <div className="space-y-1">
                            {aiAnalysis.recommendations.map((rec, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <p className="text-[11px] text-gray-400 leading-relaxed">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Engineering Report */}
                      {aiAnalysis.report && (
                        <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-3">
                          <p className="text-[9px] text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Engineering Report
                          </p>
                          <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-line">{aiAnalysis.report}</p>
                        </div>
                      )}

                      {/* Action Plan */}
                      {aiAnalysis.actionPlan && aiAnalysis.actionPlan.length > 0 && (
                        <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-3">
                          <p className="text-[9px] text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <ListChecks className="w-3 h-3" /> Action Plan
                          </p>
                          <div className="space-y-1.5">
                            {aiAnalysis.actionPlan.map((item, i) => {
                              const isHigh = item.startsWith("[HIGH]");
                              const isMed = item.startsWith("[MEDIUM]");
                              const dotColor = isHigh ? "bg-red-400" : isMed ? "bg-amber-400" : "bg-blue-400";
                              return (
                                <div key={i} className="flex items-start gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                                  <p className="text-[11px] text-gray-300 leading-relaxed">{item}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Electrical badge */}
                      {aiAnalysis.isElectrical && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-900/30 border border-yellow-700/40">
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <p className="text-[10px] text-yellow-300 font-medium">Full electrical engineering analysis applied</p>
                        </div>
                      )}

                      <button
                        onClick={handleAnalyze}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] text-purple-400 hover:text-white border border-purple-700/40 hover:bg-purple-700/30 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-analyze
                      </button>
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

interface FileEntry {
  file: File;
  drawingNo: string;
  title: string;
  systemName: string;
  customSystemName?: string;
}

interface ErpProject {
  id: number;
  name: string;
  erpnextName?: string;
}

interface UploadModalProps {
  userDept: string;
  userName: string;
  isLoading?: boolean;
  uploadStep?: "uploading" | "analyzing" | null;
  uploadProgress?: { current: number; total: number } | null;
  onClose: () => void;
  onSubmit: (
    drawings: Array<{
      drawingNo: string;
      title: string;
      project: string;
      department: string;
      drawingType: string;
      systemName: string;
      fileData: string;
      fileName: string;
      note: string;
      uploadedBy: string;
    }>,
  ) => void;
}

function UploadModal({
  userDept,
  userName,
  isLoading = false,
  uploadStep = null,
  uploadProgress = null,
  onClose,
  onSubmit,
}: UploadModalProps) {
  const [project, setProject] = useState("");
  // Ensure the initial department is always one of the standard department values.
  // ERPNext profile departments (e.g. "Design - Mechanical - WTT") don't match the
  // standard list, so we find the first standard dept that appears in the profile dept
  // string, or fall back to "Mechanical".
  const resolvedDept = (() => {
    if (!userDept) return "Mechanical";
    const exact = DEPARTMENTS.find(d => d === userDept);
    if (exact) return exact;
    const partial = DEPARTMENTS.find(d => userDept.toLowerCase().includes(d.toLowerCase()));
    return partial || "Mechanical";
  })();
  const [department, setDepartment] = useState(resolvedDept);
  const [drawingType, setDrawingType] = useState("");
  const [customDrawingTypeInput, setCustomDrawingTypeInput] = useState("");
  const [customSystemInput, setCustomSystemInput] = useState("");
  const [savedCustomDrawingTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wtt_custom_drawing_types") || "[]"); } catch { return []; }
  });
  const [savedCustomSystems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wtt_custom_systems") || "[]"); } catch { return []; }
  });
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
  const projectDropRef = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const email = (() => { try { const s = localStorage.getItem("wtt_auth_user"); return s ? JSON.parse(s).email || "" : ""; } catch { return ""; } })();
    fetch(`${BASE}/api/projects${email ? `?email=${encodeURIComponent(email)}` : ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ErpProject[]) => setErpProjects(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const inTrigger = projectRef.current?.contains(e.target as Node);
      const inDrop = projectDropRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDrop) setShowProjectDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProjects = erpProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.erpnextName || "").toLowerCase().includes(projectSearch.toLowerCase()),
  );

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      const newEntries: FileEntry[] = pdfs
        .filter((f) => !existing.has(f.name))
        .map((f) => ({
          file: f,
          drawingNo: f.name.replace(/\.pdf$/i, ""),
          title: "",
          systemName: "",
        }));
      return [...prev, ...newEntries];
    });
  }, []);

  const updateEntry = (
    idx: number,
    field: keyof Omit<FileEntry, "file">,
    value: string,
  ) => {
    setFiles((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  };

  const removeEntry = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !project) return;
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    setNoteError(false);
    setLoading(true);

    // Resolve effective drawing type (handle "Other" custom input)
    const effectiveDrawingType = drawingType === "Other" && customDrawingTypeInput.trim()
      ? customDrawingTypeInput.trim()
      : drawingType;

    // Resolve effective system name helper
    const resolveSystem = (entry: FileEntry) => {
      const base = sameSystem ? globalSystem : (entry.systemName || "");
      if (base === "Others") {
        return sameSystem ? customSystemInput.trim() : (entry.customSystemName || "").trim();
      }
      return base;
    };

    // Persist custom drawing type to localStorage
    if (drawingType === "Other" && customDrawingTypeInput.trim()) {
      try {
        const existing: string[] = JSON.parse(localStorage.getItem("wtt_custom_drawing_types") || "[]");
        const updated = Array.from(new Set([...existing, customDrawingTypeInput.trim()]));
        localStorage.setItem("wtt_custom_drawing_types", JSON.stringify(updated));
      } catch {}
    }

    // Persist custom system name to localStorage (global)
    if (globalSystem === "Others" && customSystemInput.trim()) {
      try {
        const existing: string[] = JSON.parse(localStorage.getItem("wtt_custom_systems") || "[]");
        const updated = Array.from(new Set([...existing, customSystemInput.trim()]));
        localStorage.setItem("wtt_custom_systems", JSON.stringify(updated));
      } catch {}
    }
    // Persist per-file custom systems to localStorage
    for (const entry of files) {
      if (entry.systemName === "Others" && entry.customSystemName?.trim()) {
        try {
          const existing: string[] = JSON.parse(localStorage.getItem("wtt_custom_systems") || "[]");
          const updated = Array.from(new Set([...existing, entry.customSystemName.trim()]));
          localStorage.setItem("wtt_custom_systems", JSON.stringify(updated));
        } catch {}
      }
    }

    const results: Array<{
      drawingNo: string;
      title: string;
      project: string;
      department: string;
      systemName: string;
      fileData: string;
      fileName: string;
      note: string;
      uploadedBy: string;
    }> = [];

    for (const entry of files) {
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(entry.file);
      });
      results.push({
        drawingNo: entry.drawingNo || entry.file.name.replace(/\.pdf$/i, ""),
        title: entry.title,
        project,
        department,
        drawingType: effectiveDrawingType,
        systemName: resolveSystem(entry),
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
              <h2 className="text-base font-semibold text-gray-900">
                Upload Drawings
              </h2>
              <p className="text-xs text-gray-500">
                All new uploads start as <strong>Draft</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* Project — ERP dropdown */}
            <div ref={projectRef} className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Project *{" "}
                {erpProjects.length > 0 && (
                  <span className="text-gray-400 font-normal">
                    ({erpProjects.length} from ERP)
                  </span>
                )}
              </label>
              <div
                onClick={() => {
                  if (!showProjectDrop && projectRef.current) {
                    const rect = projectRef.current.getBoundingClientRect();
                    setDropStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
                  }
                  setShowProjectDrop((v) => !v);
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${project ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"} focus:outline-none`}
              >
                {project ? (
                  <span className="text-gray-900 flex items-center gap-2">
                    {erpProjects.find((p) => p.name === project)
                      ?.erpnextName && (
                      <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">
                        {
                          erpProjects.find((p) => p.name === project)
                            ?.erpnextName
                        }
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
                <div ref={projectDropRef} style={dropStyle} className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects…"
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {filteredProjects.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">
                        No projects found
                      </p>
                    ) : (
                      filteredProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setProject(p.name);
                            setShowProjectDrop(false);
                            setProjectSearch("");
                          }}
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
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drawing Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              Drawing Type
              <span className="text-gray-400 font-normal ml-1">(auto-fills department)</span>
            </label>
            <select
              value={drawingType}
              onChange={(e) => {
                const selected = e.target.value;
                setDrawingType(selected);
                if (selected !== "Other") setCustomDrawingTypeInput("");
                const match = DRAWING_TYPES.find((dt) => dt.type === selected);
                if (match && match.dept) setDepartment(match.dept);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select drawing type…</option>
              {savedCustomDrawingTypes.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
              {DRAWING_TYPES.filter(dt => dt.type !== "Other").map((dt) => (
                <option key={dt.type} value={dt.type}>{dt.type}</option>
              ))}
              <option value="Other">Other…</option>
            </select>
            {drawingType === "Other" && (
              <input
                type="text"
                value={customDrawingTypeInput}
                onChange={(e) => setCustomDrawingTypeInput(e.target.value)}
                placeholder="Enter custom drawing type…"
                autoFocus
                className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 placeholder-blue-300"
              />
            )}
          </div>

          {/* System Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">
                System Name *
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameSystem}
                  onChange={(e) => setSameSystem(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                <span className="text-xs text-gray-500">
                  Same system for all drawings
                </span>
              </label>
            </div>
            {sameSystem ? (
              <>
                <select
                  value={globalSystem}
                  onChange={(e) => {
                    setGlobalSystem(e.target.value);
                    if (e.target.value !== "Others") setCustomSystemInput("");
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${globalSystem ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                >
                  <option value="">Select system…</option>
                  {savedCustomSystems.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Others">Others…</option>
                </select>
                {globalSystem === "Others" && (
                  <input
                    type="text"
                    value={customSystemInput}
                    onChange={(e) => setCustomSystemInput(e.target.value)}
                    placeholder="Enter custom system name…"
                    autoFocus
                    className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 placeholder-blue-300"
                  />
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Select system per drawing below
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Drawing Description / Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError && e.target.value.trim()) setNoteError(false);
              }}
              placeholder="Describe this drawing — what it covers, key details, initial version notes…"
              rows={2}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${noteError ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"}`}
            />
            {noteError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500">
                  A description note is required for every drawing upload.
                </p>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
              }}
            />
            <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
            <p className="text-sm text-gray-600 font-medium">
              Drop multiple PDFs here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF files only · Multiple selection supported
            </p>
          </div>

          {/* Per-file fields */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
              {files.map((entry, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl p-3 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {entry.file.name}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        ({(entry.file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeEntry(idx)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        Drawing No.
                      </label>
                      <input
                        value={entry.drawingNo}
                        onChange={(e) =>
                          updateEntry(idx, "drawingNo", e.target.value)
                        }
                        placeholder="MEC-001"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        Title
                      </label>
                      <input
                        value={entry.title}
                        onChange={(e) =>
                          updateEntry(idx, "title", e.target.value)
                        }
                        placeholder="Drawing title"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  {!sameSystem && (
                    <div className="mt-2">
                      <label className="block text-[10px] text-gray-500 mb-0.5">
                        System Name *
                      </label>
                      <select
                        value={entry.systemName}
                        onChange={(e) => {
                          updateEntry(idx, "systemName", e.target.value);
                          if (e.target.value !== "Others") updateEntry(idx, "customSystemName", "");
                        }}
                        className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${entry.systemName ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                      >
                        <option value="">Select system…</option>
                        {savedCustomSystems.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        {SYSTEMS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="Others">Others…</option>
                      </select>
                      {entry.systemName === "Others" && (
                        <input
                          type="text"
                          value={entry.customSystemName || ""}
                          onChange={(e) => updateEntry(idx, "customSystemName", e.target.value)}
                          placeholder="Enter custom system name…"
                          autoFocus
                          className="mt-1.5 w-full border border-blue-400 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50 placeholder-blue-300"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              All drawings will be saved as <strong>Draft</strong>. You can
              promote them to Revision or Final Copy later.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-800">
                  {uploadProgress
                    ? `Uploading drawing ${uploadProgress.current} of ${uploadProgress.total}…`
                    : "Saving to database…"}
                </p>
                <p className="text-xs text-blue-500 mt-0.5">AI analysis runs in background after upload.</p>
              </div>
              {uploadProgress && (
                <span className="text-xs font-bold text-blue-700 flex-shrink-0">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              )}
            </div>
            {uploadProgress && uploadProgress.total > 0 && (
              <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-500">
            {files.length === 0
              ? "No files selected"
              : `${files.length} PDF${files.length !== 1 ? "s" : ""} ready to upload`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || !project || loading || isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {(loading || isLoading) ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isLoading ? "Saving Drawing…" : `Upload ${files.length > 0 ? `${files.length} ` : ""}Drawing${files.length !== 1 ? "s" : ""}`}
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
  onSubmit: (data: {
    fileData: string;
    fileName: string;
    note: string;
  }) => void;
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
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      setFile(f);
  }, []);

  const handleSubmit = () => {
    if (!file) return;
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    setNoteError(false);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onSubmit({
        fileData: e.target?.result as string,
        fileName: file.name,
        note: note.trim(),
      });
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
              <h2 className="text-base font-semibold text-gray-900">
                Upload Revision
              </h2>
              <p className="text-xs text-gray-500">
                Status will change to <strong>{nextLabel}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            <p className="font-medium text-gray-800">
              {drawing.drawingNo}
              {drawing.title ? ` — ${drawing.title}` : ""}
            </p>
            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
              Current:{" "}
              <StatusBadge
                status={drawing.status}
                label={drawing.revisionLabel}
              />
            </p>
          </div>

          {/* Mandatory revision description */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              What was revised? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError && e.target.value.trim()) setNoteError(false);
              }}
              placeholder="Describe exactly what was changed, corrected or updated in this revision…"
              rows={4}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${noteError ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"}`}
            />
            {noteError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500">
                  This field is mandatory. Please describe what was revised.
                </p>
              </div>
            )}
          </div>

          {/* Previous revisions for reference */}
          {drawing.history.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-2">
                Previous revision notes
              </p>
              <div className="space-y-2 max-h-28 overflow-auto">
                {[...drawing.history].reverse().map((h, i) => (
                  <div key={i} className="border-l-2 border-amber-300 pl-2">
                    <p className="text-[10px] font-semibold text-amber-800">
                      {h.revisionLabel}
                    </p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {h.note || <em>No note</em>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-gray-600 font-medium">
                  Drop revised PDF or click to browse{" "}
                  <span className="text-red-500">*</span>
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
            Upload {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApprovalRecipient {
  id: number;
  employee_id: string;
  name: string;
  company_email: string;
  official_mobile: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
}

function SendApprovalModal({
  drawing,
  onClose,
  base,
  adminUser,
}: {
  drawing: ProjectDrawing;
  onClose: () => void;
  base: string;
  adminUser?: { email?: string; full_name?: string; mobile_no?: string } | null;
}) {
  const [recipients, setRecipients] = useState<ApprovalRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [channels, setChannels] = useState({ email: true, whatsapp: true });
  const [notifyMe, setNotifyMe] = useState(false);
  const [notifyMeEmail, setNotifyMeEmail] = useState(true);
  const [notifyMeWA, setNotifyMeWA] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${base}/api/drawing-approval-recipients`)
      .then(r => r.ok ? r.json() : [])
      .then(setRecipients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [base]);

  const handleSend = async () => {
    const activeChannels = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
    const hasRecipients = recipients.length > 0;
    const hasSelf = notifyMe && adminUser?.email;
    if (!activeChannels.length && !hasSelf) { setError("Select at least one channel"); return; }
    if (!hasRecipients && !hasSelf) { setError("No recipients to send to"); return; }
    setSending(true);
    setError("");
    try {
      const appUrl = window.location.origin;
      const selfExtra = hasSelf ? [{
        email: adminUser!.email,
        phone: adminUser!.mobile_no || "",
        notifyEmail: notifyMeEmail,
        notifyWhatsapp: notifyMeWA,
      }] : [];
      const res = await fetch(`${base}/api/project-drawings/${drawing.id}/send-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: activeChannels, appUrl, extraRecipients: selfExtra }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Send Approval Notification</h2>
              <p className="text-xs text-gray-500">Only the FlowMatriX link will be shared</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Drawing info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-800">Final Approved Drawing</p>
            </div>
            <p className="text-sm font-mono font-bold text-gray-900">{drawing.drawingNo}</p>
            {drawing.title && <p className="text-xs text-gray-600 mt-0.5">{drawing.title}</p>}
            {drawing.project && <p className="text-xs text-gray-500 mt-0.5">Project: {drawing.project}</p>}
          </div>

          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-900">Notification Sent!</p>
              <p className="text-xs text-gray-500 mt-1">Recipients have been notified with the FlowMatriX link.</p>
              <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Close</button>
            </div>
          ) : (
            <>
              {/* Recipients */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Recipients</p>
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading recipients…
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No recipients configured. Go to Settings → Drawing Recipients to add one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">{(r.name || r.employee_id).charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{r.name || r.employee_id}</p>
                          <p className="text-[10px] text-gray-500 truncate">{r.company_email}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {r.notify_email && r.company_email && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] border border-blue-200">
                              <Mail className="w-2.5 h-2.5" /> Email
                            </span>
                          )}
                          {r.notify_whatsapp && r.official_mobile && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] border border-green-200">
                              <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Also notify me */}
              {adminUser?.email && (
                <div className={`rounded-xl border-2 transition-all ${notifyMe ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                  <button
                    onClick={() => setNotifyMe(p => !p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notifyMe ? "bg-blue-600" : "bg-gray-300"}`}>
                      <span className="text-xs font-bold text-white">{(adminUser.full_name || adminUser.email || "A").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">Also notify me (Admin)</p>
                      <p className="text-[10px] text-gray-500 truncate">{adminUser.email}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${notifyMe ? "border-blue-600 bg-blue-600" : "border-gray-400"}`}>
                      {notifyMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                  {notifyMe && (
                    <div className="flex gap-2 px-4 pb-3">
                      <button
                        onClick={() => setNotifyMeEmail(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${notifyMeEmail ? "border-blue-400 bg-white text-blue-700" : "border-gray-300 text-gray-400"}`}
                      >
                        <Mail className="w-3 h-3" /> Email {notifyMeEmail ? "✓" : "—"}
                      </button>
                      <button
                        onClick={() => setNotifyMeWA(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${notifyMeWA ? "border-green-400 bg-white text-green-700" : "border-gray-300 text-gray-400"}`}
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp {notifyMeWA ? "✓" : "—"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Channels */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Send recipients via</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setChannels(c => ({ ...c, email: !c.email }))}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${channels.email ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    <Mail className="w-4 h-4" /> Email
                    {channels.email && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                  <button
                    onClick={() => setChannels(c => ({ ...c, whatsapp: !c.whatsapp }))}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${channels.whatsapp ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                    {channels.whatsapp && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || (recipients.length === 0 && !notifyMe)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending…" : "Send Now"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DrawingDetailPage ────────────────────────────────────────────────────────

type DetailTab = "ai" | "suggestions" | "view" | "revisions";

function DrawingDetailPage({
  drawing,
  fileData,
  onBack,
  onCheck,
  onApprove,
  onRevisionUpload,
  onMarkFinal,
  onDelete,
  onAnalysisSaved,
  currentUserName,
}: {
  drawing: ProjectDrawing;
  fileData: string;
  onBack: () => void;
  onCheck: () => void;
  onApprove: () => void;
  onRevisionUpload: () => void;
  onMarkFinal: () => void;
  onDelete: () => void;
  onAnalysisSaved?: (id: string, analysis: AiAnalysisResult) => void;
  currentUserName: string;
}) {
  const cfg = STATUS_CONFIG[drawing.status];

  // PDF viewer state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [scale, setScale] = useState(1.0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Revision file viewing — null = current drawing
  const [viewRevIdx, setViewRevIdx] = useState<number | null>(null);
  const [revFileData, setRevFileData] = useState<Record<number, string>>({});
  const [revFileLoading, setRevFileLoading] = useState<number | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<DetailTab>("ai");

  // AI analysis — initialize from saved DB report if available
  const [aiAnalysis, setAiAnalysis] = useState<{
    detectedType: string;
    suggestedDepartment: string;
    summary: string;
    keyElements: string[];
    observations: string[];
    recommendations: string[];
    report: string;
    actionPlan: string[];
    isElectrical: boolean;
    generatedAt?: string;
  } | null>((drawing.aiAnalysis as any) ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoAnalyzedRef = useRef(false);

  // Reset on drawing change — use saved report if available
  useEffect(() => {
    setPageNumber(1);
    setNumPages(null);
    setPdfError(false);
    setAiAnalysis((drawing.aiAnalysis as any) ?? null);
    setAiError(null);
    setViewRevIdx(null);
    autoAnalyzedRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [drawing.id]);

  const handleAnalyze = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setActiveTab("ai");
    try {
      const canvas = scrollRef.current?.querySelector("canvas");
      if (!canvas) throw new Error("No rendered page available. Wait for the drawing to load.");
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
      const resp = await fetch(`${BASE}/api/drawings/analyze-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          drawingNo: drawing.drawingNo,
          title: drawing.title,
          department: drawing.department,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const data = await resp.json();
      const dataWithTimestamp = { ...data, generatedAt: new Date().toISOString() };
      setAiAnalysis(dataWithTimestamp);
      // Save to DB with timestamp so report is available next time without re-analyzing
      fetch(`${BASE}/api/project-drawings/${drawing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiAnalysis: dataWithTimestamp }),
      }).catch(() => {});
      // Update parent state so reopening the drawing doesn't re-trigger auto-analyze
      onAnalysisSaved?.(drawing.id, dataWithTimestamp as AiAnalysisResult);
    } catch (e: any) {
      setAiError(e.message || "Analysis failed");
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, drawing.id, drawing.drawingNo, drawing.title, drawing.department]);

  // Auto-generate report when detail view opens — only if no saved report exists
  useEffect(() => {
    if (autoAnalyzedRef.current) return;
    if (drawing.aiAnalysis || aiAnalysis || aiLoading) return;
    let timer: ReturnType<typeof setInterval>;
    const tryAnalyze = () => {
      const canvas = scrollRef.current?.querySelector("canvas");
      if (canvas) {
        clearInterval(timer); // stop polling immediately — only analyze once
        autoAnalyzedRef.current = true;
        handleAnalyze();
      }
    };
    timer = setInterval(tryAnalyze, 800);
    const timeout = setTimeout(() => clearInterval(timer), 20000);
    return () => { clearInterval(timer); clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.id]);

  // Load revision file
  const loadRevFile = async (revIdx: number) => {
    if (revFileData[revIdx] !== undefined) {
      setViewRevIdx(revIdx);
      return;
    }
    setRevFileLoading(revIdx);
    try {
      // Try local storage first
      const key = `drawing-file-rev-${drawing.id}-${revIdx}`;
      const local = localStorage.getItem(key);
      if (local) {
        setRevFileData(prev => ({ ...prev, [revIdx]: local }));
        setViewRevIdx(revIdx);
        setRevFileLoading(null);
        return;
      }
      // Fallback: try history entry fileData
      const hist = drawing.history[revIdx];
      if (hist?.fileData) {
        setRevFileData(prev => ({ ...prev, [revIdx]: hist.fileData }));
        setViewRevIdx(revIdx);
      } else {
        setRevFileData(prev => ({ ...prev, [revIdx]: "" }));
        setViewRevIdx(revIdx);
      }
    } catch {
      setRevFileData(prev => ({ ...prev, [revIdx]: "" }));
      setViewRevIdx(revIdx);
    } finally {
      setRevFileLoading(null);
    }
  };

  const activeFileData = viewRevIdx !== null
    ? (revFileData[viewRevIdx] || "")
    : fileData;
  const activeRevEntry = viewRevIdx !== null ? drawing.history[viewRevIdx] : null;
  const activeStatus: DrawingStatus = activeRevEntry?.status || drawing.status;
  const activeRevLabel = activeRevEntry?.revisionLabel || drawing.revisionLabel;
  const activeCfg = STATUS_CONFIG[activeStatus];

  // All revisions (old history + current as "current")
  const allRevisions = [
    ...drawing.history.map((h, i) => ({ ...h, idx: i, isCurrent: false })),
    {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: fileData,
      fileName: drawing.fileName,
      note: drawing.note,
      revisedBy: drawing.uploadedBy,
      idx: -1,
      isCurrent: true,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Drawings
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-sm font-bold text-gray-900 truncate">{drawing.drawingNo}</p>
            {drawing.title && <p className="text-sm text-gray-500 truncate">— {drawing.title}</p>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.textColor}`}>
              {drawing.status === "draft" && <Clock className="w-3 h-3" />}
              {drawing.status === "revision" && <RefreshCw className="w-3 h-3" />}
              {drawing.status === "final" && <CheckCircle2 className="w-3 h-3" />}
              {drawing.revisionLabel}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {[drawing.department, drawing.systemName, drawing.project].filter(Boolean).join(" · ")}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {!drawing.checkedBy && drawing.status !== "final" && (
            <button onClick={onCheck} title="Mark as Checked"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
              <UserCheck className="w-3.5 h-3.5" /> Check
            </button>
          )}
          {drawing.checkedBy && !drawing.approvedBy && drawing.status !== "final" && (
            <button onClick={onApprove} title="Approve"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {drawing.status !== "final" && (
            <button onClick={onRevisionUpload} title="Upload Revision"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Revise
            </button>
          )}
          {drawing.status !== "final" && (
            <button onClick={onMarkFinal} title="Mark as Final"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
            </button>
          )}
          <button onClick={handleAnalyze} disabled={aiLoading} title="AI Analyze"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${aiLoading ? "text-purple-500 bg-purple-50 border-purple-200 cursor-wait" : "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"}`}>
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiLoading ? "Analyzing…" : "AI Analyze"}
          </button>
          <button onClick={onDelete} title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden PDF renderer for AI canvas capture (off-screen) */}
      {fileData && (
        <div
          ref={scrollRef}
          style={{ position: "absolute", left: -9999, top: -9999, opacity: 0, pointerEvents: "none", width: 800 }}
          aria-hidden="true"
        >
          <Document file={fileData} onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPageNumber(1); }} onLoadError={() => setPdfError(true)}>
            <Page pageNumber={1} scale={1} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
      )}

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
        {([
          { key: "ai" as DetailTab, label: "AI Analysis", icon: Sparkles },
          { key: "suggestions" as DetailTab, label: "Suggestions", icon: Lightbulb },
          { key: "view" as DetailTab, label: "View Drawing", icon: FileText },
          { key: "revisions" as DetailTab, label: `Revisions (${allRevisions.length})`, icon: History },
        ] as { key: DetailTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === key
                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

          {/* ══ AI ANALYSIS TAB ══════════════════════════════════════════════ */}
          {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">AI Drawing Analysis</h2>
                {aiAnalysis?.isElectrical && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                    ⚡ Full Electrical Analysis
                  </span>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={aiLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  aiLoading
                    ? "bg-purple-100 text-purple-500 cursor-wait"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {aiLoading ? "Analyzing…" : aiAnalysis ? "Re-analyze" : "Run Analysis"}
              </button>
            </div>

            {/* Loading state */}
            {aiLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Analyzing drawing with AI…</p>
                  <p className="text-xs text-gray-400 mt-1">Reviewing elements, standards compliance, and generating engineering report</p>
                </div>
              </div>
            )}

            {/* Error state — only show if there's no existing report to display */}
            {aiError && !aiLoading && !aiAnalysis && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Analysis failed</p>
                  <p className="text-xs text-red-500 mt-0.5">{aiError}</p>
                  <button onClick={handleAnalyze} className="mt-2 text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              </div>
            )}

            {/* Idle state */}
            {!aiAnalysis && !aiLoading && !aiError && (
              <div className="bg-white rounded-2xl border border-dashed border-purple-300 p-10 flex flex-col items-center gap-3 text-center">
                <ScanSearch className="w-12 h-12 text-purple-200" />
                <p className="text-sm text-gray-500">Preparing AI analysis…</p>
                <p className="text-xs text-gray-400">Analysis will start automatically once the drawing renders</p>
              </div>
            )}

            {/* Analysis results */}
            {aiAnalysis && !aiLoading && (
              <div className="space-y-4">
                {/* Detected type banner */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Detected Drawing Type</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{aiAnalysis.detectedType || "—"}</p>
                    {aiAnalysis.suggestedDepartment && (
                      <p className="text-xs text-purple-600 font-medium">{aiAnalysis.suggestedDepartment} Department</p>
                    )}
                    {aiAnalysis.generatedAt && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Report generated: {new Date(aiAnalysis.generatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {aiAnalysis.summary && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.summary}</p>
                  </div>
                )}

                {/* Key Elements */}
                {aiAnalysis.keyElements.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <ListChecks className="w-3 h-3" /> Key Elements Identified
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.keyElements.map((el, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">{el}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations + Recommendations side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiAnalysis.observations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-amber-200 p-5">
                      <p className="text-[10px] text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Technical Observations
                      </p>
                      <div className="space-y-2">
                        {aiAnalysis.observations.map((obs, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600 leading-relaxed">{obs}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiAnalysis.recommendations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5">
                      <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Recommendations
                      </p>
                      <div className="space-y-2">
                        {aiAnalysis.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Engineering Report */}
                {aiAnalysis.report && (
                  <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Engineering Report</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{aiAnalysis.report}</p>
                  </div>
                )}

                {/* Action Plan */}
                {aiAnalysis.actionPlan && aiAnalysis.actionPlan.length > 0 && (
                  <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="w-4 h-4 text-orange-600" />
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">Action Plan</p>
                    </div>
                    <div className="space-y-2.5">
                      {aiAnalysis.actionPlan.map((item, i) => {
                        const isHigh = item.startsWith("[HIGH]");
                        const isMed = item.startsWith("[MEDIUM]");
                        const bg = isHigh ? "bg-red-100 border-red-200" : isMed ? "bg-amber-100 border-amber-200" : "bg-gray-100 border-gray-200";
                        const dot = isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-blue-400";
                        const text = isHigh ? "text-red-800" : isMed ? "text-amber-800" : "text-gray-700";
                        return (
                          <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${bg}`}>
                            <span className={`w-2 h-2 rounded-full ${dot} mt-1.5 flex-shrink-0`} />
                            <p className={`text-xs ${text} leading-relaxed`}>{item}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )} {/* end AI Analysis tab */}

          {/* ══ SUGGESTIONS TAB ══════════════════════════════════════════════ */}
          {activeTab === "suggestions" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">AI Suggestions & Action Plan</h2>
            </div>

            {!aiAnalysis && !aiLoading && (
              <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-10 flex flex-col items-center gap-3 text-center">
                <Lightbulb className="w-12 h-12 text-amber-200" />
                <p className="text-sm text-gray-500">No suggestions yet</p>
                <p className="text-xs text-gray-400">Run AI Analysis first to generate suggestions</p>
                <button onClick={() => { setActiveTab("ai"); handleAnalyze(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" /> Run AI Analysis
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-sm text-gray-500">Generating suggestions…</p>
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <div className="space-y-5">
                {/* Recommendations */}
                {aiAnalysis.recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl border border-emerald-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                      {aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                {aiAnalysis.actionPlan && aiAnalysis.actionPlan.length > 0 && (
                  <div className="bg-white rounded-2xl border border-orange-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks className="w-4 h-4 text-orange-600" />
                      <h3 className="text-xs font-bold text-orange-700 uppercase tracking-widest">Prioritized Action Plan</h3>
                    </div>
                    <div className="space-y-3">
                      {aiAnalysis.actionPlan.map((item, i) => {
                        const isHigh = item.startsWith("[HIGH]");
                        const isMed = item.startsWith("[MEDIUM]");
                        const cardBg = isHigh ? "bg-red-50 border-red-200" : isMed ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200";
                        const badgeBg = isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-blue-400";
                        const badgeLabel = isHigh ? "HIGH" : isMed ? "MEDIUM" : "LOW";
                        const textColor = isHigh ? "text-red-800" : isMed ? "text-amber-800" : "text-gray-700";
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cardBg}`}>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 ${badgeBg}`}>{badgeLabel}</span>
                            <p className={`text-sm ${textColor} leading-relaxed`}>{item.replace(/^\[(HIGH|MEDIUM|LOW)\]\s*/, "")}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detected Type info */}
                <div className="bg-white rounded-2xl border border-purple-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-widest">Drawing Classification</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Detected Type</span>
                      <span className="text-xs font-semibold text-gray-800">{aiAnalysis.detectedType || "—"}</span>
                    </div>
                    {aiAnalysis.suggestedDepartment && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Suggested Department</span>
                        <span className="text-xs font-semibold text-purple-700">{aiAnalysis.suggestedDepartment}</span>
                      </div>
                    )}
                    {aiAnalysis.isElectrical && (
                      <div className="flex items-center gap-1.5 mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-700 font-medium">Full electrical standards analysis was applied</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drawing Details */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-gray-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Drawing Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Drawing No.", value: drawing.drawingNo },
                      { label: "Title", value: drawing.title || "—" },
                      { label: "Project", value: drawing.project || "—" },
                      { label: "Department", value: drawing.department || "—" },
                      { label: "Drawing Type", value: drawing.drawingType || "—" },
                      { label: "System", value: drawing.systemName || "—" },
                      { label: "Uploaded By", value: drawing.uploadedBy || "—" },
                      { label: "Date", value: formatDate(drawing.uploadedAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                        <p className="text-xs font-semibold text-gray-800 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`rounded-lg p-3 border ${drawing.checkedBy ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Checked</p>
                      <p className={`text-xs font-semibold ${drawing.checkedBy ? "text-emerald-700" : "text-gray-400 italic"}`}>
                        {drawing.checkedBy ? drawing.checkedBy.name : "Pending"}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 border ${drawing.approvedBy ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Approved</p>
                      <p className={`text-xs font-semibold ${drawing.approvedBy ? "text-blue-700" : "text-gray-400 italic"}`}>
                        {drawing.approvedBy ? drawing.approvedBy.name : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )} {/* end Suggestions tab */}

          {/* ══ VIEW DRAWING TAB ═════════════════════════════════════════════ */}
          {activeTab === "view" && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* PDF toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <button onClick={() => setScale(s => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))))}
                className="p-1.5 rounded text-gray-500 hover:bg-gray-200 transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
              <button onClick={() => setScale(1.0)} className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded tabular-nums w-14 text-center hover:bg-gray-50">
                {Math.round(scale * 100)}%
              </button>
              <button onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}
                className="p-1.5 rounded text-gray-500 hover:bg-gray-200 transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
              <button onClick={() => setScale(1.0)} title="Reset zoom"
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"><RotateCcw className="w-3 h-3" /></button>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              {numPages && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-xs text-gray-600 tabular-nums px-1">Page {pageNumber} / {numPages}</span>
                  <button onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))} disabled={pageNumber >= (numPages ?? 1)}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {viewRevIdx !== null && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                    Viewing: {drawing.history[viewRevIdx]?.revisionLabel || `Rev ${viewRevIdx + 1}`}
                  </span>
                  <button onClick={() => setViewRevIdx(null)} className="text-[10px] text-blue-600 hover:text-blue-800 underline">View Current</button>
                </div>
              )}
            </div>
            {/* PDF content */}
            <div ref={null} className="overflow-auto flex flex-col items-center py-8 px-4 gap-4 bg-gray-100 min-h-[600px]">
              {!activeFileData ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
                  <FileText className="w-16 h-16 text-gray-200" />
                  <p className="text-sm">{viewRevIdx !== null ? "No file available for this revision" : "No PDF file attached to this drawing"}</p>
                </div>
              ) : (
                <Document
                  file={activeFileData}
                  onLoadSuccess={({ numPages: n }) => { setNumPages(n); }}
                  onLoadError={() => setPdfError(true)}
                  loading={<div className="flex items-center gap-2 text-gray-400 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Loading PDF…</div>}
                >
                  {pdfError ? (
                    <div className="text-red-500 text-sm py-8">Failed to load PDF</div>
                  ) : (
                    <div className="relative shadow-2xl rounded-lg overflow-hidden">
                      <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
                      <PdfWatermark status={activeStatus} revisionLbl={activeRevLabel} />
                    </div>
                  )}
                </Document>
              )}
            </div>
          </div>
          )} {/* end View Drawing tab */}

          {/* ══ REVISIONS TAB ════════════════════════════════════════════════ */}
          {activeTab === "revisions" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <History className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Revision History</h2>
              </div>
              <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {allRevisions.length} version{allRevisions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-4">
              {allRevisions.map((rev, i) => {
                const revCfg = STATUS_CONFIG[rev.status as DrawingStatus] || STATUS_CONFIG.draft;
                return (
                  <div key={rev.isCurrent ? "current" : rev.idx}
                    className={`bg-white rounded-2xl border p-5 transition-all ${rev.isCurrent ? "border-blue-300 shadow-sm ring-1 ring-blue-100" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                          rev.isCurrent ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          {rev.isCurrent ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${revCfg.bg} ${revCfg.border} ${revCfg.textColor}`}>
                              {rev.revisionLabel}
                            </span>
                            {rev.isCurrent && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                CURRENT VERSION
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Date</p>
                              <p className="text-xs text-gray-700 font-medium">{formatDateTime(rev.uploadedAt)}</p>
                            </div>
                            {rev.revisedBy && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">By</p>
                                <p className="text-xs text-gray-700 font-medium">{rev.revisedBy}</p>
                              </div>
                            )}
                            {rev.fileName && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">File</p>
                                <p className="text-xs text-gray-600 truncate">{rev.fileName}</p>
                              </div>
                            )}
                          </div>
                          {rev.note && (
                            <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Change Notes</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{rev.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* View this revision in the View Drawing tab */}
                      <button
                        onClick={() => {
                          if (rev.isCurrent) { setViewRevIdx(null); } else { loadRevFile(rev.idx); }
                          setActiveTab("view");
                        }}
                        disabled={revFileLoading === rev.idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors flex-shrink-0"
                      >
                        {revFileLoading === rev.idx
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Eye className="w-3.5 h-3.5" />}
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )} {/* end Revisions tab */}

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
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative flex items-center">
      <Icon className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function ProjectDrawings() {
  const { user } = useAuth();
  const [drawings, setDrawings] = useState<ProjectDrawing[]>([]);
  const [drawingsLoading, setDrawingsLoading] = useState(true);
  const [fileDataCache, setFileDataCache] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DrawingStatus | "all">(
    "all",
  );
  const [deptFilter, setDeptFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [detailDrawingId, setDetailDrawingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [uploadAnalyzing, setUploadAnalyzing] = useState(false);
  const [uploadStep, setUploadStep] = useState<"uploading" | "analyzing" | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendModal, setSendModal] = useState<ProjectDrawing | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const showValidationError = (msg: string) => {
    setValidationMsg(msg);
    setTimeout(() => setValidationMsg(null), 4000);
  };
  const [userProfile, setUserProfile] = useState<{
    department: string | null;
    designation: string | null;
  }>({ department: null, designation: null });
  const [erpProjectList, setErpProjectList] = useState<ErpProject[]>([]);
  const [allowedDrawingDepts, setAllowedDrawingDepts] = useState<string[]>([]);
  // null = not yet loaded, false = no restriction configured, true = restriction active
  const [drawingDeptsConfigured, setDrawingDeptsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const email = (() => { try { const s = localStorage.getItem("wtt_auth_user"); return s ? JSON.parse(s).email || "" : ""; } catch { return ""; } })();
    fetch(`${BASE}/api/projects${email ? `?email=${encodeURIComponent(email)}` : ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ErpProject[]) => setErpProjectList(data))
      .catch(() => {});
    if (email) {
      fetch(`${BASE}/api/user-permissions/${encodeURIComponent(email)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((perm) => {
          if (!perm) {
            // No permissions record — unrestricted access
            setDrawingDeptsConfigured(false);
            return;
          }
          // Permissions record exists — respect the drawing departments setting
          setDrawingDeptsConfigured(true);
          try {
            const depts = JSON.parse(perm.allowedDrawingDepts || "[]");
            if (Array.isArray(depts)) setAllowedDrawingDepts(depts);
          } catch {}
        })
        .catch(() => { setDrawingDeptsConfigured(false); });
    } else {
      setDrawingDeptsConfigured(false);
    }
  }, []);

  useEffect(() => {
    setDrawingsLoading(true);
    fetch(`${BASE}/api/project-drawings`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ProjectDrawing[]) => {
        setDrawings(data);
        // Migrate any drawings from localStorage into DB then clear local storage
        const localData = (() => { try { return JSON.parse(localStorage.getItem("project-drawings-v3") || "[]"); } catch { return []; } })();
        if (Array.isArray(localData) && localData.length > 0) {
          const remoteIds = new Set(data.map((d: ProjectDrawing) => d.id));
          const toMigrate = localData.filter((d: ProjectDrawing) => !remoteIds.has(d.id));
          if (toMigrate.length > 0) {
            Promise.all(toMigrate.map((d: ProjectDrawing) => {
              const fileData = (() => { try { return localStorage.getItem(`drawing-file-${d.id}`) || d.fileData || ""; } catch { return d.fileData || ""; } })();
              return fetch(`${BASE}/api/project-drawings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...d, fileData }),
              }).then(r => r.ok ? r.json() : null);
            })).then((migrated) => {
              const migratedValid = migrated.filter(Boolean) as ProjectDrawing[];
              if (migratedValid.length > 0) {
                setDrawings((prev) => [...prev, ...migratedValid]);
              }
              localStorage.removeItem("project-drawings-v3");
            }).catch(() => {});
          } else {
            localStorage.removeItem("project-drawings-v3");
          }
        }
      })
      .catch(() => {})
      .finally(() => setDrawingsLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(user.email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUserProfile({
            department: data.department || null,
            designation: data.designation || null,
          });
        }
      })
      .catch(() => {});
  }, [user?.email]);

  const apiSaveDrawing = async (drawing: ProjectDrawing, fileData?: string) => {
    try {
      await fetch(`${BASE}/api/project-drawings/${drawing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...drawing, fileData: fileData ?? "" }),
      });
    } catch {}
  };

  const persist = (updated: ProjectDrawing[]) => {
    setDrawings(updated);
    saveDrawings(updated);
  };

  // Helper: check if a drawing's department matches an allowed dept (exact OR partial,
  // to handle ERPNext dept strings like "Design - Mechanical - WTT" matching "Mechanical")
  const deptAllowed = (drawingDept: string) =>
    allowedDrawingDepts.some(
      (a) => a === drawingDept || drawingDept.toLowerCase().includes(a.toLowerCase())
    );

  // Helper: returns true if this drawing's dept is accessible to the current user
  const isDeptAccessible = (drawingDept: string) => {
    // Still loading permissions — allow through (will re-filter when loaded)
    if (drawingDeptsConfigured === null) return true;
    // No restrictions configured for this user — full access
    if (drawingDeptsConfigured === false) return true;
    // Restrictions configured: empty list means NO departments allowed
    if (allowedDrawingDepts.length === 0) return false;
    return deptAllowed(drawingDept);
  };

  // Only show departments the user is allowed to see (if restriction is set)
  const allDepts = Array.from(
    new Set(drawings.map((d) => d.department).filter(Boolean)),
  ).sort().filter(dept => isDeptAccessible(dept));

  const allProjects = Array.from(
    new Set(
      drawings
        .filter((d) => isDeptAccessible(d.department))
        .map((d) => d.project)
        .filter(Boolean),
    ),
  ).sort();

  const filtered = drawings.filter((d) => {
    // Enforce drawing department permissions
    if (!isDeptAccessible(d.department)) return false;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
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

  const handleUpload = async (
    items: Array<{
      drawingNo: string;
      title: string;
      project: string;
      department: string;
      drawingType: string;
      systemName: string;
      fileData: string;
      fileName: string;
      note: string;
      uploadedBy: string;
    }>,
  ) => {
    setUploadAnalyzing(true);
    setUploadStep("uploading");
    setUploadProgress({ current: 0, total: items.length });
    const saved: ProjectDrawing[] = [];
    for (let i = 0; i < items.length; i++) {
      const data = items[i];
      setUploadProgress({ current: i + 1, total: items.length });
      const id = generateUUID();
      const newDrawing: ProjectDrawing = {
        id,
        drawingNo: data.drawingNo,
        title: data.title,
        project: data.project,
        department: data.department,
        drawingType: data.drawingType || "",
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
        erpFileUrl: null,
        aiAnalysis: null,
      };
      try {
        const res = await fetch(`${BASE}/api/project-drawings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newDrawing, fileData: data.fileData ?? "" }),
        });
        if (res.ok) {
          if (data.fileData) setFileDataCache(prev => ({ ...prev, [id]: data.fileData }));
          saved.push(newDrawing);
          // Run AI analysis in background — does not block modal close
          if (data.fileData) {
            const fileDataCopy = data.fileData;
            const drawingId = id;
            (async () => {
              try {
                const imageBase64 = await renderPdfFirstPageToBase64(fileDataCopy);
                const aiRes = await fetch(`${BASE}/api/drawings/analyze-page`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    imageBase64,
                    drawingNo: data.drawingNo,
                    title: data.title,
                    department: data.department,
                  }),
                });
                if (aiRes.ok) {
                  const aiData = await aiRes.json();
                  await fetch(`${BASE}/api/project-drawings/${drawingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aiAnalysis: aiData }),
                  });
                  // Update drawing in local state with the completed analysis
                  setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, aiAnalysis: aiData } : d));
                }
              } catch (err) {
                console.warn("Background AI analysis failed:", err);
              }
            })();
          }
        }
      } catch (err) {
        console.error("Drawing upload failed:", err);
      }
    }
    setUploadAnalyzing(false);
    setUploadStep(null);
    setUploadProgress(null);
    if (saved.length > 0) {
      setDrawings((prev) => [...saved, ...prev]);
    }
    setModal({ type: "none" });
  };

  const handleRevision = async (
    drawing: ProjectDrawing,
    data: { fileData: string; fileName: string; note: string },
  ) => {
    const historyEntry: RevisionEntry = {
      revisionLabel: drawing.revisionLabel,
      uploadedAt: drawing.uploadedAt,
      status: drawing.status,
      fileData: "",
      fileName: drawing.fileName,
      note: drawing.note,
      revisedBy: drawing.uploadedBy,
    };
    const newRevNo = drawing.status === "draft" ? 1 : drawing.revisionNo + 1;
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
      erpFileUrl: null,
    };
    if (data.fileData) setFileDataCache(prev => ({ ...prev, [drawing.id]: data.fileData }));
    await apiSaveDrawing(updated, data.fileData);
    setDrawings((prev) => prev.map((d) => (d.id === drawing.id ? updated : d)));
    setModal({ type: "none" });
  };

  const handleFinal = async (drawing: ProjectDrawing) => {
    if (!drawing.approvedBy) {
      showValidationError("Drawing must be approved before it can be marked as Final Copy.");
      return;
    }
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
    await apiSaveDrawing(updated);
    setDrawings((prev) => prev.map((d) => (d.id === drawing.id ? updated : d)));
    setModal({ type: "none" });
  };

  const handleCheck = async (drawing: ProjectDrawing) => {
    const updated: ProjectDrawing = {
      ...drawing,
      checkedBy: {
        name: user?.full_name || "Unknown",
        at: new Date().toISOString(),
      },
    };
    await apiSaveDrawing(updated);
    setDrawings((prev) => prev.map((d) => (d.id === drawing.id ? updated : d)));
  };

  const handleApprove = async (drawing: ProjectDrawing) => {
    // For final drawings, allow re-approval without the check requirement
    if (!drawing.checkedBy && drawing.status !== "final") {
      showValidationError("Drawing must be checked (FST validated) before it can be approved.");
      return;
    }
    const updated: ProjectDrawing = {
      ...drawing,
      approvedBy: {
        name: user?.full_name || "Unknown",
        at: new Date().toISOString(),
      },
    };
    await apiSaveDrawing(updated);
    setDrawings((prev) => prev.map((d) => (d.id === drawing.id ? updated : d)));
  };

  const handleLogView = useCallback(
    (drawingId: string) => {
      if (!user?.full_name) return;
      setDrawings((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== drawingId) return d;
          const recentLog = d.viewLog?.[d.viewLog.length - 1];
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          if (
            recentLog &&
            recentLog.by === user.full_name &&
            recentLog.at > fiveMinAgo
          )
            return d;
          const updatedDrawing = {
            ...d,
            viewLog: [
              ...(d.viewLog || []),
              { by: user.full_name, at: new Date().toISOString() },
            ],
          };
          fetch(`${BASE}/api/project-drawings/${drawingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ viewLog: updatedDrawing.viewLog }),
          }).catch(() => {});
          return updatedDrawing;
        });
        return updated;
      });
    },
    [user?.full_name],
  );

  useEffect(() => {
    if (viewerIdx !== null && filtered[viewerIdx]) {
      handleLogView(filtered[viewerIdx].id);
      const drawing = filtered[viewerIdx];
      if (!fileDataCache[drawing.id]) {
        fetch(`${BASE}/api/project-drawings/${drawing.id}/file`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.fileData) {
              setFileDataCache(prev => ({ ...prev, [drawing.id]: data.fileData }));
            }
          })
          .catch(() => {});
      }
    }
  }, [viewerIdx]);

  // Load file data when opening detail page
  useEffect(() => {
    if (!detailDrawingId) return;
    handleLogView(detailDrawingId);
    if (!fileDataCache[detailDrawingId]) {
      fetch(`${BASE}/api/project-drawings/${detailDrawingId}/file`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.fileData) {
            setFileDataCache(prev => ({ ...prev, [detailDrawingId]: data.fileData }));
          }
        })
        .catch(() => {});
    }
  }, [detailDrawingId]);

  const detailDrawing = detailDrawingId ? drawings.find(d => d.id === detailDrawingId) ?? null : null;

  // Base set respecting department permissions (for accurate counts)
  const permittedDrawings = drawings.filter((d) => isDeptAccessible(d.department));

  const counts = {
    all: permittedDrawings.length,
    draft: permittedDrawings.filter((d) => d.status === "draft").length,
    revision: permittedDrawings.filter((d) => d.status === "revision").length,
    final: permittedDrawings.filter((d) => d.status === "final").length,
  };

  return (
    <Layout>
      {detailDrawing ? (
        <DrawingDetailPage
          drawing={detailDrawing}
          fileData={fileDataCache[detailDrawing.id] || ""}
          onBack={() => setDetailDrawingId(null)}
          onCheck={() => handleCheck(detailDrawing)}
          onApprove={() => handleApprove(detailDrawing)}
          onRevisionUpload={() => setModal({ type: "revision", drawing: detailDrawing })}
          onMarkFinal={() => setModal({ type: "final", drawing: detailDrawing })}
          onDelete={() => { setDetailDrawingId(null); setModal({ type: "delete", drawing: detailDrawing }); }}
          onAnalysisSaved={(id, analysis) => {
            setDrawings(prev => prev.map(d => d.id === id ? { ...d, aiAnalysis: analysis } : d));
          }}
          currentUserName={user?.full_name || ""}
        />
      ) : (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Project Drawings
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                Drawing management — upload, track revisions, and mark finals
              </p>

              {/* ERP User Info */}
              {user && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-blue-800">
                      {user.full_name}
                    </span>
                  </div>
                  {userProfile.department && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-medium text-indigo-800">
                        {userProfile.department}
                      </span>
                    </div>
                  )}
                  {userProfile.designation && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-xs text-gray-600">
                        {userProfile.designation}
                      </span>
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
            {(
              [
                { key: "all", label: "All" },
                { key: "draft", label: "Draft" },
                { key: "revision", label: "Revision" },
                { key: "final", label: "Final Copy" },
              ] as { key: DrawingStatus | "all"; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  statusFilter === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}
                >
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
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drawings…"
                className="text-sm outline-none text-gray-700 w-40 placeholder-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drawing list */}
        <div className="flex-1 overflow-auto p-6">
          {drawingsLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center animate-pulse">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Loading drawings…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-600 mb-1">
                  No drawings found
                </p>
                <p className="text-sm text-gray-400">
                  {drawings.length === 0
                    ? "Upload your first drawing to get started"
                    : "Try adjusting your search or filters"}
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
            <div className="grid gap-2.5">
              <div className="hidden md:grid grid-cols-[32px_2.5fr_2fr_1.5fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-3 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                <span>S.No</span>
                <span>Drawing No. / Title</span>
                <span>Project</span>
                <span>System</span>
                <span>Department</span>
                <span>Status</span>
                <span>Revisions</span>
                <span>Date</span>
                <span />
              </div>

              {filtered.map((drawing, idx) => (
                <div
                  key={drawing.id}
                  onClick={() => setDetailDrawingId(drawing.id)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="hidden md:grid grid-cols-[32px_2.5fr_2fr_1.5fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-3 items-center">
                    <div className="text-xs font-semibold text-gray-400 tabular-nums">{idx + 1}</div>
                    <div className="min-w-0" title={drawing.title || drawing.drawingNo}>
                      <p className="font-mono text-sm font-semibold text-gray-900 truncate">{drawing.drawingNo}</p>
                      {drawing.title && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{drawing.title}</p>
                      )}
                    </div>
                    <div
                      className="text-xs text-gray-600 truncate"
                      title={drawing.project}
                    >
                      {drawing.project || "—"}
                    </div>
                    <div
                      className="text-xs text-blue-700 font-medium truncate"
                      title={drawing.systemName}
                    >
                      {drawing.systemName || (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </div>
                    <div
                      className="text-xs text-gray-600 truncate"
                      title={drawing.department}
                    >
                      {drawing.department || "—"}
                    </div>
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        status={drawing.status}
                        label={drawing.revisionLabel}
                      />
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
                      {drawing.history.length === 0
                        ? "—"
                        : `${drawing.history.length} rev${drawing.history.length !== 1 ? "s" : ""}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(drawing.uploadedAt)}
                    </div>
                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); const idx = filtered.findIndex(d => d.id === drawing.id); setViewerIdx(idx); }}
                        title="View PDF"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(drawing.status === "final" || drawing.approvedBy) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSendModal(drawing); }}
                          title="Send Approval Notification"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal({ type: "revision", drawing }); }}
                          title="Upload Revision"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal({ type: "final", drawing }); }}
                          title="Mark as Final Copy"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal({ type: "delete", drawing }); }}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {drawing.drawingNo}
                        </p>
                        {drawing.title && (
                          <p className="text-sm text-gray-700 mt-0.5">
                            {drawing.title}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge
                            status={drawing.status}
                            label={drawing.revisionLabel}
                          />
                          {drawing.department && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {drawing.department}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(drawing.uploadedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => {
                          const idx = filtered.findIndex(
                            (d) => d.id === drawing.id,
                          );
                          setViewerIdx(idx);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {(drawing.status === "final" || drawing.approvedBy) && (
                        <button
                          onClick={() => setSendModal(drawing)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                      )}
                      {drawing.status !== "final" && (
                        <button
                          onClick={() =>
                            setModal({ type: "revision", drawing })
                          }
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* PDF Viewer (legacy eye-icon path) */}
      {viewerIdx !== null && filtered[viewerIdx] && (
        <PdfViewer
          drawing={filtered[viewerIdx]}
          fileData={fileDataCache[filtered[viewerIdx].id] || ""}
          onClose={() => setViewerIdx(null)}
          onPrev={() => setViewerIdx((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() =>
            setViewerIdx((i) => Math.min(filtered.length - 1, (i ?? 0) + 1))
          }
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
          isLoading={uploadAnalyzing}
          uploadStep={uploadStep}
          uploadProgress={uploadProgress}
          onClose={() => { if (!uploadAnalyzing) setModal({ type: "none" }); }}
          onSubmit={handleUpload}
        />
      )}
      {modal.type === "revision" && (
        <RevisionModal
          drawing={modal.drawing}
          onClose={() => setModal({ type: "none" })}
          onSubmit={(data) => handleRevision(modal.drawing, data)}
        />
      )}
      {modal.type === "final" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Mark as Final Copy?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <strong>{modal.drawing.drawingNo}</strong>
              {modal.drawing.title ? ` — ${modal.drawing.title}` : ""}
            </p>
            <p className="text-xs text-gray-400 text-center mb-4">
              This will apply a <strong>FINAL COPY</strong> watermark when the
              PDF is viewed.
            </p>
            {/* Validation: must be approved first */}
            {!modal.drawing.approvedBy && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Cannot finalize — Approval required</p>
                  <p className="text-xs text-amber-600 mt-0.5">This drawing has not been approved yet. Mark it as <strong>Checked</strong> and then <strong>Approved</strong> before finalizing.</p>
                </div>
              </div>
            )}
            {modal.drawing.approvedBy && !modal.drawing.checkedBy && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Note: Not checked (FST)</p>
                  <p className="text-xs text-amber-600 mt-0.5">This drawing was approved without a check mark. Proceeding is allowed but not recommended.</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFinal(modal.drawing)}
                disabled={!modal.drawing.approvedBy}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Final
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Validation toast */}
      {validationMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          {validationMsg}
        </div>
      )}

      {sendModal && (
        <SendApprovalModal
          drawing={sendModal}
          onClose={() => setSendModal(null)}
          base={BASE}
          adminUser={user}
        />
      )}

      {modal.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Drawing?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{modal.drawing.drawingNo}</strong> and all its revision
              history will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: "none" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = modal.drawing.id;
                  try {
                    await fetch(`${BASE}/api/project-drawings/${id}`, { method: "DELETE" });
                  } catch {}
                  setFileDataCache(prev => { const n = { ...prev }; delete n[id]; return n; });
                  setDrawings((prev) => prev.filter((d) => d.id !== id));
                  setModal({ type: "none" });
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
