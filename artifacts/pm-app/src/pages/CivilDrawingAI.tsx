import { Layout } from "@/components/Layout";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, X, FileImage, Sparkles, ChevronDown, ChevronUp,
  Plus, Trash2, Download, RefreshCw, Building2, ArrowRight,
  CheckCircle2, AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw,
  FileText, Settings, Layers, Ruler, Hash, AreaChart, Maximize2,
  ClipboardList, Search, History, ChevronRight, Eye,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type Mode = "analyze" | "generate";

interface Measurement {
  item: string;
  type: "area" | "length" | "count" | "volume" | "dimension";
  value: number;
  unit: string;
  notes?: string;
}
interface AnalysisResult {
  measurements: Measurement[];
  summary: string;
  keyFindings: string[];
  drawingType: string;
  scale: string;
  disclaimer?: string;
}
interface AnalysisRecord {
  id: string;
  projectName: string;
  instruction: string;
  imageDataUrl: string;
  result: AnalysisResult;
  createdAt: string;
}

const ETP_PROCESS_OPTIONS = [
  { id: "inlet_chamber",       label: "Inlet Chamber / Manhole" },
  { id: "bar_screen",          label: "Bar Screen & Grit Chamber" },
  { id: "equalization",        label: "Equalization Tank" },
  { id: "primary_clarifier",   label: "Primary Clarifier / PST" },
  { id: "flash_mixer",         label: "Flash Mixer & Flocculator" },
  { id: "coagulation",         label: "Coagulation / Chemical Dosing" },
  { id: "aeration",            label: "Aeration Tank (Biological)" },
  { id: "mbr",                 label: "MBR (Membrane Bio-Reactor)" },
  { id: "sbr",                 label: "Sequential Batch Reactor (SBR)" },
  { id: "secondary_clarifier", label: "Secondary Clarifier / SST" },
  { id: "sand_filter",         label: "Pressure Sand Filter" },
  { id: "acf",                 label: "Activated Carbon Filter" },
  { id: "chlorination",        label: "Chlorination Contact Tank" },
  { id: "treated_storage",     label: "Treated Water Storage / UGT" },
  { id: "sludge_thickener",    label: "Sludge Thickener" },
  { id: "sludge_holding",      label: "Sludge Holding Tank" },
  { id: "filter_press",        label: "Filter Press / Dewatering" },
  { id: "pump_station",        label: "Pump Station / MCC Room" },
  { id: "chemical_room",       label: "Chemical Storage Room" },
  { id: "blower_room",         label: "Blower / Compressor Room" },
];

const AC_COLOR: Record<string, string> = {
  blue: "#00BFFF", teal: "#00FF7F", green: "#ADFF2F",
  amber: "#FFD700", orange: "#FFA500", red: "#FF6347",
  purple: "#DA70D6", gray: "#B0C4DE",
};

interface ETPComponent { id: string; label: string; sublabel?: string; x: number; y: number; w: number; h: number; type: string; color: string; }
interface FlowArrow { from: string; to: string; label?: string; }
interface ETPLayout { components: ETPComponent[]; flowArrows: FlowArrow[]; inlet?: any; outlet?: any; summary: string; capacity: string; designNotes: string[]; }
interface ETPRecord { id: string; params: { projectName: string; siteLength: number; siteWidth: number; tankHeight: number; inletFlow: string; processSteps: string[]; additionalNotes: string; }; layout: ETPLayout; generatedAt: string; }

// ─────────────────────────────────────────────────────────
// AutoCAD SVG renderer (ETP mode)
// ─────────────────────────────────────────────────────────
function AutoCADDrawing({ layout, siteLength, siteWidth, projectName, tankHeight, inletFlow }: {
  layout: ETPLayout; siteLength: number; siteWidth: number;
  projectName: string; tankHeight: number; inletFlow?: string;
}) {
  const BG = "#0D1117"; const DIM_COLOR = "#AAAAAA"; const FLOW_COLOR = "#00BFFF"; const SITE_COLOR = "#FF4500";
  const PAD_L = 70; const PAD_T = 30; const PAD_R = 30; const TITLE_H = 100;
  const DRAW_W = 1060; const DRAW_H = 640;
  const SVG_W = PAD_L + DRAW_W + PAD_R; const SVG_H = PAD_T + DRAW_H + TITLE_H;
  const PLAN_X = PAD_L; const PLAN_Y = PAD_T; const PLAN_W = DRAW_W; const PLAN_H = DRAW_H;
  const sl = Math.max(siteLength, 1); const sw = Math.max(siteWidth, 1);
  const scaleX = PLAN_W / sl; const scaleY = PLAN_H / sw;
  const px = (m: number) => PLAN_X + m * scaleX; const py = (m: number) => PLAN_Y + m * scaleY;
  const pw = (m: number) => m * scaleX; const ph = (m: number) => m * scaleY;
  const getCenter = (c: ETPComponent) => ({ cx: px(c.x + c.w / 2), cy: py(c.y + c.h / 2) });
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const gridSpacing = sl <= 30 ? 5 : sl <= 80 ? 10 : 20;
  const gridX: number[] = []; const gridY: number[] = [];
  for (let x = 0; x <= sl; x += gridSpacing) gridX.push(x);
  for (let y = 0; y <= sw; y += gridSpacing) gridY.push(y);
  const sbPx = pw(gridSpacing);
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ fontFamily: "'Courier New', monospace", background: BG }}>
      <defs>
        <marker id="af" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,1 L0,7 L7,4 z" fill={FLOW_COLOR} /></marker>
        <marker id="ad" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L5,3 z" fill={DIM_COLOR} /></marker>
        <marker id="adr" markerWidth="6" markerHeight="6" refX="2" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L5,3 z" fill={DIM_COLOR} /></marker>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill={BG} />
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="#050810" />
      {gridX.map(x => <line key={`gx${x}`} x1={px(x)} y1={PLAN_Y} x2={px(x)} y2={PLAN_Y + PLAN_H} stroke="#1A2332" strokeWidth="0.5" />)}
      {gridY.map(y => <line key={`gy${y}`} x1={PLAN_X} y1={py(y)} x2={PLAN_X + PLAN_W} y2={py(y)} stroke="#1A2332" strokeWidth="0.5" />)}
      {gridX.map(x => <text key={`glx${x}`} x={px(x)} y={PLAN_Y - 6} fill={DIM_COLOR} fontSize="8" textAnchor="middle">{x}</text>)}
      {gridY.map(y => <text key={`gly${y}`} x={PLAN_X - 8} y={py(y) + 3} fill={DIM_COLOR} fontSize="8" textAnchor="end">{y}</text>)}
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="none" stroke={SITE_COLOR} strokeWidth="1.5" strokeDasharray="12,6" />
      <text x={PLAN_X + 6} y={PLAN_Y + 13} fill={SITE_COLOR} fontSize="8" fontWeight="bold" letterSpacing="1">SITE BOUNDARY</text>
      {layout.flowArrows?.map((arrow, i) => {
        const fc = layout.components?.find(c => c.id === arrow.from);
        const tc = layout.components?.find(c => c.id === arrow.to);
        if (!fc || !tc) return null;
        const f = getCenter(fc); const t = getCenter(tc);
        return <g key={i}><line x1={f.cx} y1={f.cy} x2={t.cx} y2={t.cy} stroke={FLOW_COLOR} strokeWidth="1.2" strokeDasharray="6,4" markerEnd="url(#af)" opacity="0.8" />{arrow.label && <text x={(f.cx + t.cx) / 2} y={(f.cy + t.cy) / 2 - 5} fill={FLOW_COLOR} fontSize="7" textAnchor="middle" opacity="0.9">{arrow.label}</text>}</g>;
      })}
      {layout.components?.map((comp) => {
        const col = AC_COLOR[comp.color] ?? "#00BFFF";
        const cx = px(comp.x); const cy = py(comp.y); const cw = pw(comp.w); const ch = ph(comp.h);
        const midX = cx + cw / 2; const midY = cy + ch / 2;
        const textFits = cw > 50 && ch > 20;
        const words = comp.label.split(" ");
        const l1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const l2 = words.slice(Math.ceil(words.length / 2)).join(" ");
        return (
          <g key={comp.id}>
            <rect x={cx} y={cy} width={cw} height={ch} fill={col + "18"} stroke={col} strokeWidth="1.5" />
            {cw > 20 && ch > 20 && <line x1={cx} y1={cy + ch * 0.4} x2={cx + cw * 0.4} y2={cy} stroke={col} strokeWidth="0.4" opacity="0.25" />}
            {textFits ? (<><text x={midX} y={midY - (comp.sublabel ? 8 : 4)} fill={col} fontSize="8.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{l1}</text>{l2 && <text x={midX} y={midY + (comp.sublabel ? 2 : 8)} fill={col} fontSize="8.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{l2}</text>}{comp.sublabel && <text x={midX} y={midY + 16} fill={col} fontSize="7" textAnchor="middle" opacity="0.75">{comp.sublabel}</text>}</>) : (<text x={midX} y={midY + 4} fill={col} fontSize="7" textAnchor="middle">{comp.label.slice(0, 8)}</text>)}
            <text x={cx + cw - 2} y={cy + ch - 2} fill={col} fontSize="6" textAnchor="end" opacity="0.65">{comp.w.toFixed(1)}×{comp.h.toFixed(1)}m</text>
          </g>
        );
      })}
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H + 20} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 20} stroke={DIM_COLOR} strokeWidth="0.8" markerStart="url(#adr)" markerEnd="url(#ad)" />
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H + 28} stroke={DIM_COLOR} strokeWidth="0.8" />
      <line x1={PLAN_X + PLAN_W} y1={PLAN_Y + PLAN_H} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 28} stroke={DIM_COLOR} strokeWidth="0.8" />
      <text x={PLAN_X + PLAN_W / 2} y={PLAN_Y + PLAN_H + 38} fill={DIM_COLOR} fontSize="10" textAnchor="middle" fontWeight="bold">{siteLength}.000 m</text>
      <line x1={PLAN_X - 20} y1={PLAN_Y} x2={PLAN_X - 20} y2={PLAN_Y + PLAN_H} stroke={DIM_COLOR} strokeWidth="0.8" markerStart="url(#adr)" markerEnd="url(#ad)" />
      <line x1={PLAN_X - 28} y1={PLAN_Y} x2={PLAN_X} y2={PLAN_Y} stroke={DIM_COLOR} strokeWidth="0.8" />
      <line x1={PLAN_X - 28} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H} stroke={DIM_COLOR} strokeWidth="0.8" />
      <text x={PLAN_X - 44} y={PLAN_Y + PLAN_H / 2} fill={DIM_COLOR} fontSize="10" textAnchor="middle" fontWeight="bold" transform={`rotate(-90,${PLAN_X - 44},${PLAN_Y + PLAN_H / 2})`}>{siteWidth}.000 m</text>
      <g transform={`translate(${PLAN_X + PLAN_W - 36}, ${PLAN_Y + 40})`}>
        <circle cx="0" cy="0" r="18" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
        <path d="M0,-16 L5,0 L0,-4 L-5,0 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M0,16 L5,0 L0,4 L-5,0 Z" fill="#555" opacity="0.9" />
        <text x="0" y="-20" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
      </g>
      <g transform={`translate(${PLAN_X + 10}, ${PLAN_Y + PLAN_H - 20})`}>
        <rect width={sbPx} height="6" fill={DIM_COLOR} opacity="0.4" />
        <rect width={sbPx / 2} height="6" fill={DIM_COLOR} opacity="0.8" />
        <line x1="0" y1="0" x2="0" y2="10" stroke={DIM_COLOR} strokeWidth="0.8" />
        <line x1={sbPx} y1="0" x2={sbPx} y2="10" stroke={DIM_COLOR} strokeWidth="0.8" />
        <text x="0" y="17" fill={DIM_COLOR} fontSize="7" textAnchor="start">0</text>
        <text x={sbPx} y="17" fill={DIM_COLOR} fontSize="7" textAnchor="end">{gridSpacing}m</text>
        <text x={sbPx / 2} y="17" fill={DIM_COLOR} fontSize="7" textAnchor="middle">SCALE: NTS</text>
      </g>
      <rect x={PAD_L} y={PAD_T + PLAN_H + 50} width={DRAW_W} height={TITLE_H - 10} fill="#050810" stroke="#FFFFFF" strokeWidth="1" />
      <line x1={PAD_L + 420} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 420} y2={PAD_T + PLAN_H + 140} stroke="#FFFFFF" strokeWidth="0.8" />
      <line x1={PAD_L + 700} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 700} y2={PAD_T + PLAN_H + 140} stroke="#FFFFFF" strokeWidth="0.8" />
      <line x1={PAD_L + 840} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 840} y2={PAD_T + PLAN_H + 140} stroke="#FFFFFF" strokeWidth="0.8" />
      <line x1={PAD_L + 420} y1={PAD_T + PLAN_H + 95} x2={PAD_L + DRAW_W} y2={PAD_T + PLAN_H + 95} stroke="#FFFFFF" strokeWidth="0.8" />
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 68} fill="#AAAAAA" fontSize="7.5" letterSpacing="1">PROJECT NAME</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 84} fill="#00FFFF" fontSize="13" fontWeight="bold">{projectName || "ETP PROJECT"}</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 98} fill="#FFFFFF" fontSize="8.5">ETP LAYOUT PLAN — PLAN VIEW</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 114} fill="#AAAAAA" fontSize="7.5">Flow: {inletFlow || "—"} | Tank Ht: {tankHeight}m | Site: {siteLength}m × {siteWidth}m</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">DRAWING TITLE</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="9" fontWeight="bold">SITE LAYOUT — PLAN VIEW</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">PREPARED BY</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="8.5">FlowMatriX AI Civil</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">SCALE</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="9">NTS</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">DWG NO.</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="8.5">CV-ETP-001</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">DATE</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="8.5">{dateStr}</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">REVISION</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="9" fontWeight="bold">REV - A</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Quick action presets
// ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Measure tank areas",       icon: AreaChart,    prompt: "Identify and measure the area of all tanks, chambers and reservoirs visible in this drawing. Include dimensions if shown." },
  { label: "Count all elements",       icon: Hash,         prompt: "Count all distinct structural and mechanical elements in this drawing — tanks, pipes, pumps, valves, manholes, columns, etc." },
  { label: "Extract pipe lengths",     icon: Ruler,        prompt: "Identify all pipe runs and measure their lengths. List each pipe by size/type if indicated." },
  { label: "Bill of Materials",        icon: ClipboardList, prompt: "Generate a complete bill of materials (BOM) from this drawing — list all items, quantities, sizes and materials visible." },
  { label: "Check drawing details",    icon: Search,       prompt: "Review this drawing for completeness — check if title block, scale, dimensions, north arrow, revision and material notes are present." },
  { label: "Earthwork volumes",        icon: Maximize2,    prompt: "Identify all excavation, backfill and earthwork areas. Estimate volumes if levels or depth information is provided." },
];

// ─────────────────────────────────────────────────────────
// Local storage helpers
// ─────────────────────────────────────────────────────────
const ANA_KEY = "civil_analysis_history";
const GEN_KEY = "civil_drawing_history";
const loadAna = (): AnalysisRecord[] => { try { return JSON.parse(localStorage.getItem(ANA_KEY) || "[]"); } catch { return []; } };
const saveAna = (h: AnalysisRecord[]) => { try { localStorage.setItem(ANA_KEY, JSON.stringify(h.slice(0, 10))); } catch {} };
const loadGen = (): ETPRecord[] => { try { return JSON.parse(localStorage.getItem(GEN_KEY) || "[]"); } catch { return []; } };
const saveGen = (h: ETPRecord[]) => { try { localStorage.setItem(GEN_KEY, JSON.stringify(h.slice(0, 10))); } catch {} };

const TYPE_ICON: Record<string, any> = { area: AreaChart, length: Ruler, count: Hash, volume: Maximize2, dimension: Ruler };
const TYPE_COLOR: Record<string, string> = { area: "text-blue-600 bg-blue-50 border-blue-200", length: "text-emerald-600 bg-emerald-50 border-emerald-200", count: "text-purple-600 bg-purple-50 border-purple-200", volume: "text-amber-600 bg-amber-50 border-amber-200", dimension: "text-rose-600 bg-rose-50 border-rose-200" };

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function CivilDrawingAI() {
  const [mode, setMode] = useState<Mode>("analyze");

  // ── Analyze state ──
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName]       = useState("");
  const [imageMime, setImageMime]       = useState("image/jpeg");
  const [instruction, setInstruction]   = useState("");
  const [projectName, setProjectName]   = useState("");
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [anaHistory, setAnaHistory]     = useState<AnalysisRecord[]>(loadAna);
  const [showAnaHistory, setShowAnaHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  // ── Generate state ──
  const [genProjectName, setGenProjectName] = useState("");
  const [siteLength, setSiteLength]   = useState("");
  const [siteWidth, setSiteWidth]     = useState("");
  const [tankHeight, setTankHeight]   = useState("3.5");
  const [inletFlow, setInletFlow]     = useState("");
  const [addNotes, setAddNotes]       = useState("");
  const [selectedSteps, setSelectedSteps] = useState<string[]>(["inlet_chamber", "bar_screen", "equalization", "aeration", "secondary_clarifier", "chlorination", "treated_storage", "pump_station"]);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState<string | null>(null);
  const [genResult, setGenResult]     = useState<ETPRecord | null>(null);
  const [genHistory, setGenHistory]   = useState<ETPRecord[]>(loadGen);
  const [showGenHistory, setShowGenHistory] = useState(false);
  const [zoom, setZoom]               = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  // ── Drag & drop ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setAnalyzeError("Please upload a JPG, PNG or WebP image."); return; }
    setAnalyzeError(null);
    setImageName(file.name);
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = e => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Analyze ──
  const handleAnalyze = async () => {
    if (!imageDataUrl) { setAnalyzeError("Please upload a drawing first."); return; }
    if (!instruction.trim()) { setAnalyzeError("Please enter an instruction."); return; }
    setAnalyzeError(null);
    setAnalyzing(true);
    try {
      const base64 = imageDataUrl.split(",")[1];
      const res = await fetch(`${BASE}/api/civil-drawing/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageMime, instruction, projectName }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Analysis failed"); }
      const data = await res.json();
      setAnalysisResult(data.analysis);
      const record: AnalysisRecord = { id: Date.now().toString(), projectName, instruction, imageDataUrl, result: data.analysis, createdAt: new Date().toISOString() };
      const newH = [record, ...anaHistory];
      setAnaHistory(newH);
      saveAna(newH);
    } catch (e: any) {
      setAnalyzeError(e.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Generate ──
  const toggleStep = (id: string) => setSelectedSteps(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const reorderStep = (id: string, dir: "up" | "down") => {
    const idx = selectedSteps.indexOf(id); if (idx < 0) return;
    const n = [...selectedSteps]; const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= n.length) return;
    [n[idx], n[swap]] = [n[swap], n[idx]];
    setSelectedSteps(n);
  };

  const handleGenerate = async () => {
    if (!siteLength || !siteWidth) { setGenError("Enter site dimensions."); return; }
    if (selectedSteps.length < 2) { setGenError("Select at least 2 process steps."); return; }
    setGenError(null); setGenerating(true);
    const labels = selectedSteps.map(id => ETP_PROCESS_OPTIONS.find(o => o.id === id)?.label ?? id);
    try {
      const res = await fetch(`${BASE}/api/civil-drawing/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: genProjectName || "ETP Project", siteLength: parseFloat(siteLength), siteWidth: parseFloat(siteWidth), tankHeight: parseFloat(tankHeight) || 3.5, processSteps: labels, inletFlow, additionalNotes: addNotes }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Generation failed"); }
      const data = await res.json();
      const rec: ETPRecord = { id: Date.now().toString(), params: data.params, layout: data.layout, generatedAt: new Date().toISOString() };
      setGenResult(rec);
      const newH = [rec, ...genHistory]; setGenHistory(newH); saveGen(newH);
    } catch (e: any) {
      setGenError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const downloadSVG = () => {
    if (!svgRef.current || !genResult) return;
    const svgEl = svgRef.current.querySelector("svg"); if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${genResult.params.projectName || "ETP"}_civil.svg`; a.click();
  };

  // ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* ── TOP HEADER ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Civil Drawing AI</h1>
              <p className="text-[10px] text-gray-400">AI-powered takeoffs, measurements & ETP layout generation</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMode("analyze")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "analyze" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Search className="w-3.5 h-3.5" /> Analyze Drawing
            </button>
            <button
              onClick={() => setMode("generate")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "generate" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Building2 className="w-3.5 h-3.5" /> Generate ETP Layout
            </button>
          </div>
          <div className="w-40" />
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {mode === "analyze" ? (
          /* ── ANALYZE MODE ── */
          <div className="flex flex-1 overflow-hidden">

            {/* Left — Drawing Preview */}
            <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
              {/* Upload toolbar */}
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Drawing
                </button>
                {imageDataUrl && (
                  <div className="flex items-center gap-2">
                    <FileImage className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate max-w-[200px]">{imageName}</span>
                    <button onClick={() => { setImageDataUrl(null); setImageName(""); setAnalysisResult(null); }} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {anaHistory.length > 0 && (
                  <button onClick={() => setShowAnaHistory(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                    <History className="w-3.5 h-3.5" /> History ({anaHistory.length})
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* Drawing area */}
              <div
                ref={dropRef}
                className="flex-1 overflow-auto flex items-center justify-center p-6"
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
              >
                {imageDataUrl ? (
                  <div className="relative max-w-full max-h-full">
                    <img src={imageDataUrl} alt="Drawing" className="max-w-full max-h-[calc(100vh-220px)] object-contain rounded-xl shadow-xl border border-gray-200" />
                    {analysisResult && (
                      <div className="absolute top-3 right-3 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
                        <p className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Analysis Complete</p>
                        <p className="text-[9px] text-gray-500">{analysisResult.measurements?.length ?? 0} items found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl p-12 max-w-md transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-4">
                      <FileImage className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Upload your engineering drawing</h3>
                    <p className="text-xs text-gray-400 mb-3">Drag & drop or click to upload · JPG, PNG, WebP</p>
                    <p className="text-[10px] text-gray-400">Works with plan views, sections, elevations, P&IDs, site layouts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — AI Panel */}
            <div className="w-[380px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Project name */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project (optional)</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. WTT — STP Phase 2"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {/* Instruction */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Instruction *</label>
                  <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
                    placeholder="e.g. Measure all tank areas and return quantities…"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {/* Quick actions */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(qa => {
                      const Icon = qa.icon;
                      return (
                        <button key={qa.label} onClick={() => setInstruction(qa.prompt)}
                          className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group">
                          <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-[11px] font-medium text-gray-600 group-hover:text-blue-700 leading-tight">{qa.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {analyzeError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">{analyzeError}</p>
                  </div>
                )}

                <button onClick={handleAnalyze} disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
                  {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> Analyze Drawing</>}
                </button>
                {analyzing && <p className="text-[10px] text-gray-400 text-center">AI is reading your drawing — typically 10–20 seconds</p>}

                {/* Results */}
                {analysisResult && (
                  <div className="space-y-4 pt-1 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Summary</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Type: {analysisResult.drawingType}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Scale: {analysisResult.scale}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Measurements ({analysisResult.measurements?.length ?? 0})</p>
                      <div className="space-y-1.5">
                        {analysisResult.measurements?.map((m, i) => {
                          const cls = TYPE_COLOR[m.type] ?? "text-gray-600 bg-gray-50 border-gray-200";
                          const Icon = TYPE_ICON[m.type] ?? Ruler;
                          return (
                            <div key={i} className={`flex items-center gap-3 border rounded-xl px-3 py-2 ${cls}`}>
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{m.item}</p>
                                {m.notes && <p className="text-[9px] opacity-70 truncate">{m.notes}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold">{typeof m.value === "number" ? m.value.toFixed(m.type === "count" ? 0 : 2) : m.value}</p>
                                <p className="text-[9px] opacity-70">{m.unit}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {analysisResult.keyFindings?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Key Findings</p>
                        <ul className="space-y-1">
                          {analysisResult.keyFindings.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.disclaimer && (
                      <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{analysisResult.disclaimer}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ── GENERATE ETP MODE ── */
          <div className="flex flex-1 overflow-hidden">
            {/* Left Form */}
            <div className="w-[340px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project Name</label>
                  <input value={genProjectName} onChange={e => setGenProjectName(e.target.value)}
                    placeholder="e.g. WTT — ETP Phase 1"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Design Flow Rate</label>
                  <input value={inletFlow} onChange={e => setInletFlow(e.target.value)}
                    placeholder="e.g. 200 KLD / 8.3 m³/hr"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Site Dimensions *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: "Length (m)", v: siteLength, s: setSiteLength, ph: "40" }, { label: "Width (m)", v: siteWidth, s: setSiteWidth, ph: "25" }, { label: "Tank Ht (m)", v: tankHeight, s: setTankHeight, ph: "3.5" }].map(f => (
                      <div key={f.label}>
                        <p className="text-[9px] text-gray-400 mb-0.5">{f.label}</p>
                        <input type="number" value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.ph}
                          className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                  {siteLength && siteWidth && <p className="text-[10px] text-blue-600 mt-1">Total area: {(parseFloat(siteLength) * parseFloat(siteWidth)).toFixed(0)} m²</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ETP Process Stages *</label>
                  <p className="text-[9px] text-gray-400 mb-2">Select and reorder by process sequence</p>
                  {selectedSteps.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {selectedSteps.map((id, i) => {
                        const opt = ETP_PROCESS_OPTIONS.find(o => o.id === id); if (!opt) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
                            <span className="text-[9px] font-bold text-blue-600 w-4 text-center">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 flex-1 truncate">{opt.label}</span>
                            <div className="flex flex-col">
                              <button onClick={() => reorderStep(id, "up")} disabled={i === 0} className="text-gray-300 disabled:opacity-20 hover:text-gray-500"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => reorderStep(id, "down")} disabled={i === selectedSteps.length - 1} className="text-gray-300 disabled:opacity-20 hover:text-gray-500"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => toggleStep(id)} className="text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-0.5 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-1.5 bg-gray-50">
                    {ETP_PROCESS_OPTIONS.filter(o => !selectedSteps.includes(o.id)).map(opt => (
                      <button key={opt.id} onClick={() => toggleStep(opt.id)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-[11px] text-gray-400 hover:text-gray-700 transition-colors">
                        <Plus className="w-3 h-3 text-blue-400" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Additional Requirements</label>
                  <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)}
                    placeholder="Inlet from north, underground storage, ZLD target…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {genError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">{genError}</p>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate ETP Drawing</>}
                </button>
                {generating && <p className="text-[10px] text-gray-400 text-center">AI is designing layout — ~15 seconds</p>}

                {genHistory.length > 0 && (
                  <button onClick={() => setShowGenHistory(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50">
                    <History className="w-3.5 h-3.5" /> View History ({genHistory.length})
                  </button>
                )}
              </div>
            </div>

            {/* Right — Drawing Output */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {genResult ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{genResult.params.projectName}</p>
                      <p className="text-xs text-gray-400">{genResult.layout.components?.length ?? 0} components · {genResult.params.siteLength}m × {genResult.params.siteWidth}m</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomIn className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button onClick={downloadSVG} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Download className="w-3.5 h-3.5" /> Download SVG</button>
                      <button onClick={() => setGenResult(null)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-lg"><RefreshCw className="w-3.5 h-3.5" /> New</button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-auto shadow-sm" ref={svgRef}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "inline-block", minWidth: "100%" }}>
                      <AutoCADDrawing layout={genResult.layout} siteLength={genResult.params.siteLength} siteWidth={genResult.params.siteWidth} projectName={genResult.params.projectName} tankHeight={genResult.params.tankHeight} inletFlow={genResult.params.inletFlow} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-blue-500" /> AI Summary</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{genResult.layout.summary}</p>
                      {genResult.layout.capacity && <p className="mt-2 text-xs text-blue-700 font-semibold bg-blue-50 rounded-lg px-2 py-1 border border-blue-100">{genResult.layout.capacity}</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Design Notes</h3>
                      <ul className="space-y-1.5">
                        {genResult.layout.designNotes?.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>{note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Component Schedule</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>{["Component", "L (m)", "W (m)", "H (m)", "Area (m²)", "Notes"].map(h => <th key={h} className="px-4 py-2 text-left text-gray-400 font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {genResult.layout.components?.map((comp, i) => (
                            <tr key={comp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-2 font-semibold text-gray-800">{comp.label}</td>
                              <td className="px-4 py-2 text-gray-600">{comp.w.toFixed(1)}</td>
                              <td className="px-4 py-2 text-gray-600">{comp.h.toFixed(1)}</td>
                              <td className="px-4 py-2 text-gray-600">{genResult.params.tankHeight.toFixed(1)}</td>
                              <td className="px-4 py-2 text-gray-600">{(comp.w * comp.h).toFixed(1)}</td>
                              <td className="px-4 py-2 text-gray-400 italic">{comp.sublabel || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-20 h-20 rounded-3xl bg-white border-2 border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                    <Building2 className="w-10 h-10 text-blue-400" />
                  </div>
                  <h2 className="text-base font-bold text-gray-700 mb-2">ETP Layout Generator</h2>
                  <p className="text-xs text-gray-400 max-w-sm">Enter site dimensions, design flow and ETP process stages. AI will generate an AutoCAD-style civil layout drawing with a component schedule.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYSIS HISTORY MODAL ── */}
        {showAnaHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAnaHistory(false)}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-500" /> Analysis History</h2>
                <button onClick={() => setShowAnaHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80vh - 60px)" }}>
                {anaHistory.map(h => (
                  <button key={h.id} type="button"
                    className="w-full text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 transition-colors"
                    onClick={() => { setImageDataUrl(h.imageDataUrl); setImageName("(from history)"); setInstruction(h.instruction); setProjectName(h.projectName); setAnalysisResult(h.result); setShowAnaHistory(false); setMode("analyze"); }}>
                    <p className="text-sm font-bold text-gray-800">{h.projectName || "Untitled"}</p>
                    <p className="text-[10px] text-gray-500 truncate">{h.instruction}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(h.createdAt).toLocaleString()} · {h.result.measurements?.length ?? 0} measurements</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GENERATE HISTORY MODAL ── */}
        {showGenHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGenHistory(false)}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-500" /> Generated Drawings</h2>
                <button onClick={() => setShowGenHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80vh - 60px)" }}>
                {genHistory.map(h => (
                  <button key={h.id} type="button"
                    className="w-full text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 transition-colors"
                    onClick={() => { setGenResult(h); setShowGenHistory(false); }}>
                    <p className="text-sm font-bold text-gray-800">{h.params.projectName}</p>
                    <p className="text-[10px] text-gray-500">{h.params.siteLength}m × {h.params.siteWidth}m · {h.layout.components?.length ?? 0} components</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(h.generatedAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
