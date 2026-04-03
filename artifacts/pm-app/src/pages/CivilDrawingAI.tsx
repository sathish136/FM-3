import { Layout } from "@/components/Layout";
import { useState, useRef } from "react";
import {
  Plus, Trash2, Download, RefreshCw, ChevronDown, ChevronUp,
  Building2, Layers, ArrowRight, Info, Sparkles, FileText, Settings,
  CheckCircle2, AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ETP_PROCESS_OPTIONS = [
  { id: "inlet_chamber",      label: "Inlet Chamber / Manhole",       acColor: "#00FFFF" },
  { id: "bar_screen",         label: "Bar Screen & Grit Chamber",      acColor: "#FFFFFF" },
  { id: "equalization",       label: "Equalization Tank",              acColor: "#00FFFF" },
  { id: "primary_clarifier",  label: "Primary Clarifier / PST",        acColor: "#00FFFF" },
  { id: "flash_mixer",        label: "Flash Mixer & Flocculator",      acColor: "#FF8C00" },
  { id: "coagulation",        label: "Coagulation / Chemical Dosing",  acColor: "#FF8C00" },
  { id: "aeration",           label: "Aeration Tank (Biological)",     acColor: "#00FF7F" },
  { id: "mbr",                label: "MBR (Membrane Bio-Reactor)",     acColor: "#00FF7F" },
  { id: "sbr",                label: "Sequential Batch Reactor (SBR)", acColor: "#00FF7F" },
  { id: "secondary_clarifier",label: "Secondary Clarifier / SST",      acColor: "#00BFFF" },
  { id: "sand_filter",        label: "Pressure Sand Filter",           acColor: "#FFD700" },
  { id: "acf",                label: "Activated Carbon Filter",        acColor: "#FFD700" },
  { id: "chlorination",       label: "Chlorination Contact Tank",      acColor: "#ADFF2F" },
  { id: "treated_storage",    label: "Treated Water Storage / UGT",    acColor: "#ADFF2F" },
  { id: "sludge_thickener",   label: "Sludge Thickener",               acColor: "#FFA500" },
  { id: "sludge_holding",     label: "Sludge Holding Tank",            acColor: "#FFA500" },
  { id: "filter_press",       label: "Filter Press / Dewatering",      acColor: "#FF6347" },
  { id: "pump_station",       label: "Pump Station / MCC Room",        acColor: "#DA70D6" },
  { id: "chemical_room",      label: "Chemical Storage Room",          acColor: "#FF4500" },
  { id: "blower_room",        label: "Blower / Compressor Room",       acColor: "#B0C4DE" },
];

// AutoCAD layer colors mapped by semantic color name
const AC_COLOR: Record<string, string> = {
  blue:   "#00BFFF",
  teal:   "#00FF7F",
  green:  "#ADFF2F",
  amber:  "#FFD700",
  orange: "#FFA500",
  red:    "#FF6347",
  purple: "#DA70D6",
  gray:   "#B0C4DE",
};

interface ETPComponent {
  id: string; label: string; sublabel?: string;
  x: number; y: number; w: number; h: number;
  type: string; color: string;
}
interface FlowArrow { from: string; to: string; label?: string; }
interface ETPLayout {
  components: ETPComponent[];
  flowArrows: FlowArrow[];
  inlet?: { x: number; y: number; side: string };
  outlet?: { x: number; y: number; side: string };
  summary: string; capacity: string; designNotes: string[];
}
interface GeneratedDrawing {
  id: string;
  params: { projectName: string; siteLength: number; siteWidth: number; tankHeight: number; processSteps: string[]; inletFlow: string; additionalNotes: string; };
  layout: ETPLayout;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────
// AutoCAD-style SVG renderer
// ─────────────────────────────────────────────────────────
function AutoCADDrawing({ layout, siteLength, siteWidth, projectName, tankHeight, inletFlow }: {
  layout: ETPLayout; siteLength: number; siteWidth: number;
  projectName: string; tankHeight: number; inletFlow?: string;
}) {
  const BG = "#0D1117";
  const GRID_COLOR = "#1A2332";
  const BORDER_COLOR = "#FFFFFF";
  const DIM_COLOR = "#AAAAAA";
  const FLOW_COLOR = "#00BFFF";
  const SITE_COLOR = "#FF4500";

  const PAD_L = 70;   // left (for dimension)
  const PAD_T = 30;   // top
  const PAD_R = 30;   // right
  const TITLE_H = 100;
  const DRAW_W = 1060;
  const DRAW_H = 640;
  const SVG_W = PAD_L + DRAW_W + PAD_R;
  const SVG_H = PAD_T + DRAW_H + TITLE_H;

  const PLAN_X = PAD_L;
  const PLAN_Y = PAD_T;
  const PLAN_W = DRAW_W;
  const PLAN_H = DRAW_H;

  const sl = Math.max(siteLength, 1);
  const sw = Math.max(siteWidth, 1);
  const scaleX = PLAN_W / sl;
  const scaleY = PLAN_H / sw;

  const px = (m: number) => PLAN_X + m * scaleX;
  const py = (m: number) => PLAN_Y + m * scaleY;
  const pw = (m: number) => m * scaleX;
  const ph = (m: number) => m * scaleY;

  const getCenter = (c: ETPComponent) => ({ cx: px(c.x + c.w / 2), cy: py(c.y + c.h / 2) });

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // Grid spacing: every 5m or 10m depending on site size
  const gridSpacing = sl <= 30 ? 5 : sl <= 80 ? 10 : 20;
  const gridXLines: number[] = [];
  const gridYLines: number[] = [];
  for (let x = 0; x <= sl; x += gridSpacing) gridXLines.push(x);
  for (let y = 0; y <= sw; y += gridSpacing) gridYLines.push(y);

  // Scale bar
  const scaleBarMeters = gridSpacing;
  const scaleBarPx = pw(scaleBarMeters);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ fontFamily: "'Courier New', monospace", background: BG }}>
      <defs>
        <marker id="arrowFlow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,1 L0,7 L7,4 z" fill={FLOW_COLOR} />
        </marker>
        <marker id="arrowDim" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L5,3 z" fill={DIM_COLOR} />
        </marker>
        <marker id="arrowDimR" markerWidth="6" markerHeight="6" refX="2" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L5,3 z" fill={DIM_COLOR} />
        </marker>
      </defs>

      {/* Overall background */}
      <rect width={SVG_W} height={SVG_H} fill={BG} />

      {/* ── PLAN AREA ── */}
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="#050810" />

      {/* Grid lines */}
      {gridXLines.map(x => (
        <line key={`gx${x}`} x1={px(x)} y1={PLAN_Y} x2={px(x)} y2={PLAN_Y + PLAN_H} stroke={GRID_COLOR} strokeWidth="0.5" />
      ))}
      {gridYLines.map(y => (
        <line key={`gy${y}`} x1={PLAN_X} y1={py(y)} x2={PLAN_X + PLAN_W} y2={py(y)} stroke={GRID_COLOR} strokeWidth="0.5" />
      ))}
      {/* Grid labels (X axis - top) */}
      {gridXLines.map(x => (
        <text key={`glx${x}`} x={px(x)} y={PLAN_Y - 6} fill={DIM_COLOR} fontSize="8" textAnchor="middle">{x}</text>
      ))}
      {/* Grid labels (Y axis - left) */}
      {gridYLines.map(y => (
        <text key={`gly${y}`} x={PLAN_X - 8} y={py(y) + 3} fill={DIM_COLOR} fontSize="8" textAnchor="end">{y}</text>
      ))}

      {/* Site boundary */}
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="none" stroke={SITE_COLOR} strokeWidth="1.5" strokeDasharray="12,6" />
      <text x={PLAN_X + 6} y={PLAN_Y + 13} fill={SITE_COLOR} fontSize="8" fontWeight="bold" letterSpacing="1">SITE BOUNDARY</text>

      {/* ── FLOW ARROWS (drawn under components) ── */}
      {layout.flowArrows?.map((arrow, i) => {
        const fromC = layout.components?.find(c => c.id === arrow.from);
        const toC = layout.components?.find(c => c.id === arrow.to);
        if (!fromC || !toC) return null;
        const f = getCenter(fromC);
        const t = getCenter(toC);
        const mx = (f.cx + t.cx) / 2;
        const my = (f.cy + t.cy) / 2;
        return (
          <g key={i}>
            <line x1={f.cx} y1={f.cy} x2={t.cx} y2={t.cy}
              stroke={FLOW_COLOR} strokeWidth="1.2" strokeDasharray="6,4"
              markerEnd="url(#arrowFlow)" opacity="0.8" />
            {arrow.label && (
              <text x={mx} y={my - 5} fill={FLOW_COLOR} fontSize="7" textAnchor="middle" opacity="0.9">{arrow.label}</text>
            )}
          </g>
        );
      })}

      {/* ── COMPONENTS ── */}
      {layout.components?.map((comp) => {
        const col = AC_COLOR[comp.color] ?? "#00BFFF";
        const cx = px(comp.x);
        const cy = py(comp.y);
        const cw = pw(comp.w);
        const ch = ph(comp.h);
        const midX = cx + cw / 2;
        const midY = cy + ch / 2;
        const textFits = cw > 50 && ch > 20;
        // Label word-wrap (split at space)
        const words = comp.label.split(" ");
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
        return (
          <g key={comp.id}>
            {/* Filled with very subtle color so you can see the boundary */}
            <rect x={cx} y={cy} width={cw} height={ch}
              fill={col + "18"} stroke={col} strokeWidth="1.5" />
            {/* Diagonal hatch lines (classic AutoCAD fill) */}
            {cw > 20 && ch > 20 && (
              <line x1={cx} y1={cy + ch * 0.4} x2={cx + cw * 0.4} y2={cy}
                stroke={col} strokeWidth="0.4" opacity="0.25" />
            )}
            {/* Labels */}
            {textFits ? (
              <>
                <text x={midX} y={midY - (comp.sublabel ? 8 : 4)} fill={col}
                  fontSize="8.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                  {line1}
                </text>
                {line2 && (
                  <text x={midX} y={midY + (comp.sublabel ? 2 : 8)} fill={col}
                    fontSize="8.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    {line2}
                  </text>
                )}
                {comp.sublabel && (
                  <text x={midX} y={midY + 16} fill={col} fontSize="7" textAnchor="middle" opacity="0.75">
                    {comp.sublabel}
                  </text>
                )}
              </>
            ) : (
              <text x={midX} y={midY + 4} fill={col} fontSize="7" textAnchor="middle">{comp.label.slice(0, 8)}</text>
            )}
            {/* Dimension tag bottom-right */}
            <text x={cx + cw - 2} y={cy + ch - 2} fill={col} fontSize="6" textAnchor="end" opacity="0.65">
              {comp.w.toFixed(1)}×{comp.h.toFixed(1)}m
            </text>
          </g>
        );
      })}

      {/* ── DIMENSION LINES ── */}
      {/* Horizontal (width of site) — below plan */}
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H + 20} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 20}
        stroke={DIM_COLOR} strokeWidth="0.8" markerStart="url(#arrowDimR)" markerEnd="url(#arrowDim)" />
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H + 28} stroke={DIM_COLOR} strokeWidth="0.8" />
      <line x1={PLAN_X + PLAN_W} y1={PLAN_Y + PLAN_H} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 28} stroke={DIM_COLOR} strokeWidth="0.8" />
      <text x={PLAN_X + PLAN_W / 2} y={PLAN_Y + PLAN_H + 38}
        fill={DIM_COLOR} fontSize="10" textAnchor="middle" fontWeight="bold">
        {siteLength}.000 m
      </text>
      {/* Vertical (height of site) — left of plan */}
      <line x1={PLAN_X - 20} y1={PLAN_Y} x2={PLAN_X - 20} y2={PLAN_Y + PLAN_H}
        stroke={DIM_COLOR} strokeWidth="0.8" markerStart="url(#arrowDimR)" markerEnd="url(#arrowDim)" />
      <line x1={PLAN_X - 28} y1={PLAN_Y} x2={PLAN_X} y2={PLAN_Y} stroke={DIM_COLOR} strokeWidth="0.8" />
      <line x1={PLAN_X - 28} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H} stroke={DIM_COLOR} strokeWidth="0.8" />
      <text x={PLAN_X - 44} y={PLAN_Y + PLAN_H / 2}
        fill={DIM_COLOR} fontSize="10" textAnchor="middle" fontWeight="bold"
        transform={`rotate(-90,${PLAN_X - 44},${PLAN_Y + PLAN_H / 2})`}>
        {siteWidth}.000 m
      </text>

      {/* ── NORTH ARROW (top-right corner of plan) ── */}
      <g transform={`translate(${PLAN_X + PLAN_W - 36}, ${PLAN_Y + 40})`}>
        <circle cx="0" cy="0" r="18" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
        <path d="M0,-16 L5,0 L0,-4 L-5,0 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M0,16 L5,0 L0,4 L-5,0 Z" fill="#555" opacity="0.9" />
        <text x="0" y="-20" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
      </g>

      {/* ── SCALE BAR (bottom-left of plan) ── */}
      <g transform={`translate(${PLAN_X + 10}, ${PLAN_Y + PLAN_H - 20})`}>
        <rect width={scaleBarPx} height="6" fill={DIM_COLOR} opacity="0.4" />
        <rect width={scaleBarPx / 2} height="6" fill={DIM_COLOR} opacity="0.8" />
        <line x1="0" y1="0" x2="0" y2="10" stroke={DIM_COLOR} strokeWidth="0.8" />
        <line x1={scaleBarPx} y1="0" x2={scaleBarPx} y2="10" stroke={DIM_COLOR} strokeWidth="0.8" />
        <text x="0" y="17" fill={DIM_COLOR} fontSize="7" textAnchor="start">0</text>
        <text x={scaleBarPx} y="17" fill={DIM_COLOR} fontSize="7" textAnchor="end">{scaleBarMeters}m</text>
        <text x={scaleBarPx / 2} y="17" fill={DIM_COLOR} fontSize="7" textAnchor="middle">SCALE: NTS</text>
      </g>

      {/* ── TITLE BLOCK ── */}
      {/* Outer border */}
      <rect x={PAD_L} y={PAD_T + PLAN_H + 50} width={DRAW_W} height={TITLE_H - 10}
        fill="#050810" stroke={BORDER_COLOR} strokeWidth="1" />
      {/* Vertical dividers */}
      <line x1={PAD_L + 420} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 420} y2={PAD_T + PLAN_H + 50 + TITLE_H - 10}
        stroke={BORDER_COLOR} strokeWidth="0.8" />
      <line x1={PAD_L + 700} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 700} y2={PAD_T + PLAN_H + 50 + TITLE_H - 10}
        stroke={BORDER_COLOR} strokeWidth="0.8" />
      <line x1={PAD_L + 840} y1={PAD_T + PLAN_H + 50} x2={PAD_L + 840} y2={PAD_T + PLAN_H + 50 + TITLE_H - 10}
        stroke={BORDER_COLOR} strokeWidth="0.8" />
      {/* Horizontal dividers */}
      <line x1={PAD_L + 420} y1={PAD_T + PLAN_H + 50 + (TITLE_H - 10) / 2} x2={PAD_L + DRAW_W} y2={PAD_T + PLAN_H + 50 + (TITLE_H - 10) / 2}
        stroke={BORDER_COLOR} strokeWidth="0.8" />

      {/* Left block — project title */}
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 68} fill="#AAAAAA" fontSize="7.5" letterSpacing="1">PROJECT NAME</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 84} fill="#00FFFF" fontSize="13" fontWeight="bold">{projectName || "ETP PROJECT"}</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 98} fill="#FFFFFF" fontSize="8.5">ETP LAYOUT PLAN — PLAN VIEW</text>
      <text x={PAD_L + 10} y={PAD_T + PLAN_H + 114} fill="#AAAAAA" fontSize="7.5">Flow: {inletFlow || "—"} &nbsp;|&nbsp; Tank Ht: {tankHeight}m &nbsp;|&nbsp; Site: {siteLength}m × {siteWidth}m</text>
      {/* Middle-left block */}
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">DRAWING TITLE</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="9" fontWeight="bold">SITE LAYOUT — PLAN VIEW</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">PREPARED BY</text>
      <text x={PAD_L + 430} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="8.5">FlowMatriX AI Civil</text>
      {/* Middle-right block */}
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">SCALE</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="9">NTS</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">DWG NO.</text>
      <text x={PAD_L + 710} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="8.5">CV-ETP-001</text>
      {/* Right block */}
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 65} fill="#AAAAAA" fontSize="7">DATE</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 82} fill="#FFFFFF" fontSize="8.5">{dateStr}</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 110} fill="#AAAAAA" fontSize="7">REVISION</text>
      <text x={PAD_L + 850} y={PAD_T + PLAN_H + 125} fill="#FFFFFF" fontSize="9" fontWeight="bold">REV - A</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// History + Storage
// ─────────────────────────────────────────────────────────
const HISTORY_KEY = "civil_drawing_history";
function loadHistory(): GeneratedDrawing[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: GeneratedDrawing[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10))); } catch {}
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function CivilDrawingAI() {
  const [projectName, setProjectName] = useState("");
  const [siteLength, setSiteLength] = useState("");
  const [siteWidth, setSiteWidth] = useState("");
  const [tankHeight, setTankHeight] = useState("3.5");
  const [inletFlow, setInletFlow] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedSteps, setSelectedSteps] = useState<string[]>([
    "inlet_chamber", "bar_screen", "equalization", "aeration",
    "secondary_clarifier", "chlorination", "treated_storage", "pump_station",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedDrawing | null>(null);
  const [history, setHistory] = useState<GeneratedDrawing[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  const toggleStep = (id: string) =>
    setSelectedSteps(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const reorderSteps = (id: string, dir: "up" | "down") => {
    const idx = selectedSteps.indexOf(id);
    if (idx < 0) return;
    const next = [...selectedSteps];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSelectedSteps(next);
  };

  const handleGenerate = async () => {
    if (!siteLength || !siteWidth) { setError("Please enter site dimensions."); return; }
    if (selectedSteps.length < 2) { setError("Please select at least 2 process steps."); return; }
    setError(null);
    setLoading(true);
    const processStepLabels = selectedSteps.map(id => ETP_PROCESS_OPTIONS.find(o => o.id === id)?.label ?? id);
    try {
      const res = await fetch(`${BASE}/api/civil-drawing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName || "ETP Project",
          siteLength: parseFloat(siteLength),
          siteWidth: parseFloat(siteWidth),
          tankHeight: parseFloat(tankHeight) || 3.5,
          processSteps: processStepLabels,
          inletFlow,
          additionalNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      const generated: GeneratedDrawing = {
        id: Date.now().toString(),
        params: data.params,
        layout: data.layout,
        generatedAt: new Date().toISOString(),
      };
      setResult(generated);
      const newHistory = [generated, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadSVG = () => {
    if (!svgRef.current || !result) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.params.projectName || "ETP"}_civil_drawing.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item: GeneratedDrawing) => {
    setResult(item);
    setHistoryOpen(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-gray-950 border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Civil Drawing AI</h1>
              <p className="text-[10px] text-gray-400">AI-powered ETP layout generator · AutoCAD style output</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs"
              >
                <FileText className="w-3.5 h-3.5" /> History ({history.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT PANEL ── */}
          <div className="w-[360px] flex-shrink-0 bg-gray-950 border-r border-gray-800 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Project Info */}
              <section>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Project Info
                </h2>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Project Name</label>
                    <input value={projectName} onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. WTT — ETP Phase 1"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Design Flow Rate</label>
                    <input value={inletFlow} onChange={e => setInletFlow(e.target.value)}
                      placeholder="e.g. 200 KLD / 8.3 m³/hr"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </section>

              {/* Site Dimensions */}
              <section>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Site Dimensions
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Length (m) *", val: siteLength, set: setSiteLength, ph: "40" },
                    { label: "Width (m) *",  val: siteWidth,  set: setSiteWidth,  ph: "25" },
                    { label: "Tank Ht (m)",  val: tankHeight, set: setTankHeight, ph: "3.5" },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[10px] text-gray-400 mb-0.5">{f.label}</label>
                      <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                        placeholder={f.ph}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
                {siteLength && siteWidth && (
                  <p className="text-[10px] text-emerald-400 mt-1">
                    Area: {(parseFloat(siteLength) * parseFloat(siteWidth)).toFixed(0)} m²
                  </p>
                )}
              </section>

              {/* Process Steps */}
              <section>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" /> ETP Process Stages *
                </h2>
                <p className="text-[9px] text-gray-500 mb-2">Select stages and reorder by process sequence</p>

                {/* Selected */}
                {selectedSteps.length > 0 && (
                  <div className="space-y-0.5 mb-2">
                    {selectedSteps.map((id, idx) => {
                      const opt = ETP_PROCESS_OPTIONS.find(o => o.id === id);
                      if (!opt) return null;
                      return (
                        <div key={id} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1">
                          <span className="text-[9px] font-bold text-emerald-400 w-4 text-center">{idx + 1}</span>
                          <span className="text-[10px] text-gray-200 flex-1 truncate">{opt.label}</span>
                          <div className="flex flex-col">
                            <button onClick={() => reorderSteps(id, "up")} disabled={idx === 0} className="text-gray-500 disabled:opacity-20 hover:text-gray-300"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => reorderSteps(id, "down")} disabled={idx === selectedSteps.length - 1} className="text-gray-500 disabled:opacity-20 hover:text-gray-300"><ChevronDown className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => toggleStep(id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Available */}
                <div className="space-y-0.5 max-h-40 overflow-y-auto border border-gray-800 rounded-lg p-1.5 bg-gray-900">
                  {ETP_PROCESS_OPTIONS.filter(o => !selectedSteps.includes(o.id)).map(opt => (
                    <button key={opt.id} onClick={() => toggleStep(opt.id)}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 text-[10px] text-gray-500 hover:text-gray-200 transition-colors">
                      <Plus className="w-3 h-3 text-emerald-500" /> {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Additional Notes */}
              <section>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Settings className="w-3 h-3" /> Additional Requirements
                </h2>
                <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Inlet from north, road on east, ZLD target, underground storage..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none" />
              </section>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-[11px] text-red-300">{error}</p>
                </div>
              )}

              <button onClick={handleGenerate} disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate ETP Drawing</>}
              </button>
              {loading && <p className="text-[10px] text-gray-500 text-center">AI is designing your ETP layout — ~15 seconds</p>}
            </div>
          </div>

          {/* ── RIGHT PANEL — Drawing Output ── */}
          <div className="flex-1 overflow-auto bg-gray-900 p-3">
            {result ? (
              <div className="space-y-3">
                {/* Toolbar */}
                <div className="flex items-center justify-between bg-gray-800 rounded-xl border border-gray-700 px-4 py-2">
                  <div>
                    <p className="text-sm font-bold text-white">{result.params.projectName}</p>
                    <p className="text-[10px] text-gray-400">
                      {result.layout.components?.length ?? 0} components · {result.params.siteLength}m × {result.params.siteWidth}m
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 rounded border border-gray-700 hover:bg-gray-700 text-gray-400"><ZoomOut className="w-3.5 h-3.5" /></button>
                    <span className="text-[10px] text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded border border-gray-700 hover:bg-gray-700 text-gray-400"><ZoomIn className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setZoom(1)} className="p-1.5 rounded border border-gray-700 hover:bg-gray-700 text-gray-400"><RotateCcw className="w-3.5 h-3.5" /></button>
                    <button onClick={downloadSVG}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold">
                      <Download className="w-3.5 h-3.5" /> Download SVG
                    </button>
                    <button onClick={() => setResult(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" /> New
                    </button>
                  </div>
                </div>

                {/* Drawing */}
                <div className="bg-gray-950 rounded-xl border border-gray-700 overflow-auto" ref={svgRef}>
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.15s", display: "inline-block", minWidth: "100%" }}>
                    <AutoCADDrawing
                      layout={result.layout}
                      siteLength={result.params.siteLength}
                      siteWidth={result.params.siteWidth}
                      projectName={result.params.projectName}
                      tankHeight={result.params.tankHeight}
                      inletFlow={result.params.inletFlow}
                    />
                  </div>
                </div>

                {/* Summary + Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> AI Summary
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{result.layout.summary}</p>
                    {result.layout.capacity && (
                      <p className="mt-2 text-xs text-emerald-300 font-semibold bg-emerald-900/30 rounded px-2 py-1 border border-emerald-800/50">{result.layout.capacity}</p>
                    )}
                  </div>
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" /> Design Notes
                    </h3>
                    <ul className="space-y-1.5">
                      {result.layout.designNotes?.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="w-4 h-4 rounded-full bg-blue-900 text-blue-300 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Component Schedule */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-700">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Component Schedule</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-900">
                        <tr>
                          {["Component", "L (m)", "W (m)", "H (m)", "Area (m²)", "Capacity / Note"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.layout.components?.map((comp, i) => {
                          const col = AC_COLOR[comp.color] ?? "#00BFFF";
                          return (
                            <tr key={comp.id} className={i % 2 === 0 ? "bg-gray-800" : "bg-gray-850"}>
                              <td className="px-3 py-1.5 font-semibold" style={{ color: col }}>{comp.label}</td>
                              <td className="px-3 py-1.5 text-gray-300">{comp.w.toFixed(1)}</td>
                              <td className="px-3 py-1.5 text-gray-300">{comp.h.toFixed(1)}</td>
                              <td className="px-3 py-1.5 text-gray-300">{result.params.tankHeight.toFixed(1)}</td>
                              <td className="px-3 py-1.5 text-gray-300">{(comp.w * comp.h).toFixed(1)}</td>
                              <td className="px-3 py-1.5 text-gray-500 italic">{comp.sublabel || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-base font-bold text-gray-300 mb-2">AI ETP Drawing Generator</h2>
                <p className="text-xs text-gray-500 max-w-sm">
                  Enter site dimensions, tank height, and select ETP process stages. AI will generate an AutoCAD-style civil layout drawing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── HISTORY MODAL ── */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setHistoryOpen(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400" /> Generated History</h2>
                <button onClick={() => setHistoryOpen(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80vh - 56px)" }}>
                {history.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-600 rounded-xl p-3 transition-colors"
                    onClick={() => loadFromHistory(h)}
                  >
                    <p className="text-sm font-bold text-white">{h.params.projectName}</p>
                    <p className="text-[10px] text-gray-400">{h.params.siteLength}m × {h.params.siteWidth}m · {h.layout.components?.length ?? 0} components</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{new Date(h.generatedAt).toLocaleString()}</p>
                  </button>
                ))}
                {history.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-8">No history yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
