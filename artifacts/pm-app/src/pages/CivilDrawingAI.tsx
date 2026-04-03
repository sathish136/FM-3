import { Layout } from "@/components/Layout";
import { useState, useRef } from "react";
import {
  Cpu, Plus, Trash2, Download, RefreshCw, ChevronDown, ChevronUp,
  Building2, Layers, ArrowRight, Info, Sparkles, FileText, Settings,
  CheckCircle2, AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ETP_PROCESS_OPTIONS = [
  { id: "inlet_chamber", label: "Inlet Chamber / Manhole", color: "blue" },
  { id: "bar_screen", label: "Bar Screen & Grit Chamber", color: "gray" },
  { id: "equalization", label: "Equalization Tank", color: "blue" },
  { id: "primary_clarifier", label: "Primary Clarifier / PST", color: "blue" },
  { id: "flash_mixer", label: "Flash Mixer & Flocculator", color: "orange" },
  { id: "coagulation", label: "Coagulation / Chemical Dosing", color: "orange" },
  { id: "aeration", label: "Aeration Tank (Biological)", color: "teal" },
  { id: "mbr", label: "MBR (Membrane Bio-Reactor)", color: "teal" },
  { id: "sbt", label: "Sequential Batch Reactor (SBR)", color: "teal" },
  { id: "secondary_clarifier", label: "Secondary Clarifier / SST", color: "blue" },
  { id: "sand_filter", label: "Pressure Sand Filter", color: "amber" },
  { id: "acf", label: "Activated Carbon Filter", color: "gray" },
  { id: "chlorination", label: "Chlorination Contact Tank", color: "green" },
  { id: "treated_storage", label: "Treated Water Storage / UGT", color: "green" },
  { id: "sludge_thickener", label: "Sludge Thickener", color: "amber" },
  { id: "sludge_holding", label: "Sludge Holding Tank", color: "amber" },
  { id: "filter_press", label: "Filter Press / Dewatering", color: "orange" },
  { id: "pump_station", label: "Pump Station / MCC Room", color: "gray" },
  { id: "chemical_room", label: "Chemical Storage Room", color: "orange" },
  { id: "blower_room", label: "Blower / Compressor Room", color: "gray" },
];

const COLOR_MAP: Record<string, { fill: string; stroke: string; text: string; light: string }> = {
  blue:   { fill: "#EFF6FF", stroke: "#3B82F6", text: "#1D4ED8", light: "#DBEAFE" },
  teal:   { fill: "#F0FDFA", stroke: "#14B8A6", text: "#0F766E", light: "#CCFBF1" },
  green:  { fill: "#F0FDF4", stroke: "#22C55E", text: "#15803D", light: "#DCFCE7" },
  amber:  { fill: "#FFFBEB", stroke: "#F59E0B", text: "#B45309", light: "#FEF3C7" },
  orange: { fill: "#FFF7ED", stroke: "#F97316", text: "#C2410C", light: "#FFEDD5" },
  red:    { fill: "#FEF2F2", stroke: "#EF4444", text: "#B91C1C", light: "#FEE2E2" },
  purple: { fill: "#FAF5FF", stroke: "#A855F7", text: "#7E22CE", light: "#F3E8FF" },
  gray:   { fill: "#F9FAFB", stroke: "#6B7280", text: "#374151", light: "#F3F4F6" },
};

interface ETPComponent {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  color: string;
}

interface FlowArrow {
  from: string;
  to: string;
  label?: string;
}

interface ETPLayout {
  components: ETPComponent[];
  flowArrows: FlowArrow[];
  inlet?: { x: number; y: number; side: string };
  outlet?: { x: number; y: number; side: string };
  summary: string;
  capacity: string;
  designNotes: string[];
}

interface GeneratedDrawing {
  id: string;
  params: {
    projectName: string;
    siteLength: number;
    siteWidth: number;
    tankHeight: number;
    processSteps: string[];
    inletFlow: string;
    additionalNotes: string;
  };
  layout: ETPLayout;
  generatedAt: string;
}

function ETPDrawingSVG({
  layout,
  siteLength,
  siteWidth,
  projectName,
  tankHeight,
}: {
  layout: ETPLayout;
  siteLength: number;
  siteWidth: number;
  projectName: string;
  tankHeight: number;
}) {
  const PADDING = 40;
  const TITLE_H = 60;
  const LEGEND_H = 40;
  const SVG_W = 900;
  const SVG_H = 600 + TITLE_H + LEGEND_H;

  const scaleX = (900 - PADDING * 2) / siteLength;
  const scaleY = (500 - PADDING * 2) / siteWidth;

  const toSvgX = (m: number) => PADDING + m * scaleX;
  const toSvgY = (m: number) => TITLE_H + PADDING + m * scaleY;
  const toSvgW = (m: number) => m * scaleX;
  const toSvgH = (m: number) => m * scaleY;

  const getCenter = (comp: ETPComponent) => ({
    cx: toSvgX(comp.x + comp.w / 2),
    cy: toSvgY(comp.y + comp.h / 2),
  });

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto"
      style={{ fontFamily: "monospace" }}
    >
      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="1" />

      {/* Title block */}
      <rect width={SVG_W} height={TITLE_H} fill="#1E3A5F" />
      <text x="20" y="22" fill="white" fontSize="11" fontWeight="bold" letterSpacing="2">ETP LAYOUT DRAWING — AI GENERATED</text>
      <text x="20" y="40" fill="#93C5FD" fontSize="14" fontWeight="bold">{projectName || "ETP Project"}</text>
      <text x="20" y="55" fill="#CBD5E1" fontSize="9">Site: {siteLength}m × {siteWidth}m &nbsp;|&nbsp; Tank Height: {tankHeight}m &nbsp;|&nbsp; Date: {dateStr}</text>
      <text x={SVG_W - 120} y="28" fill="#93C5FD" fontSize="9" textAnchor="middle">SCALE: NTS</text>
      <text x={SVG_W - 120} y="44" fill="#CBD5E1" fontSize="9" textAnchor="middle">REV: A</text>
      <text x={SVG_W - 120} y="58" fill="#CBD5E1" fontSize="9" textAnchor="middle">FlowMatriX AI</text>

      {/* Site boundary */}
      <rect
        x={PADDING} y={TITLE_H + PADDING}
        width={toSvgW(siteLength)} height={toSvgH(siteWidth)}
        fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="8,4"
      />
      {/* Site boundary label */}
      <text x={PADDING + 4} y={TITLE_H + PADDING + 12} fill="#6B7280" fontSize="8">SITE BOUNDARY</text>
      {/* Dimension arrows */}
      <line x1={PADDING} y1={TITLE_H + PADDING + toSvgH(siteWidth) + 14} x2={PADDING + toSvgW(siteLength)} y2={TITLE_H + PADDING + toSvgH(siteWidth) + 14} stroke="#374151" strokeWidth="1" markerEnd="url(#arrowBlack)" markerStart="url(#arrowBlackStart)" />
      <text x={PADDING + toSvgW(siteLength) / 2} y={TITLE_H + PADDING + toSvgH(siteWidth) + 24} fill="#374151" fontSize="9" textAnchor="middle">{siteLength}m</text>
      <line x1={PADDING - 14} y1={TITLE_H + PADDING} x2={PADDING - 14} y2={TITLE_H + PADDING + toSvgH(siteWidth)} stroke="#374151" strokeWidth="1" markerEnd="url(#arrowBlack)" markerStart="url(#arrowBlackStart)" />
      <text x={PADDING - 20} y={TITLE_H + PADDING + toSvgH(siteWidth) / 2} fill="#374151" fontSize="9" textAnchor="middle" transform={`rotate(-90,${PADDING - 20},${TITLE_H + PADDING + toSvgH(siteWidth) / 2})`}>{siteWidth}m</text>

      {/* Arrow markers */}
      <defs>
        <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#3B82F6" />
        </marker>
        <marker id="arrowBlack" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#374151" />
        </marker>
        <marker id="arrowBlackStart" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L6,3 z" fill="#374151" />
        </marker>
      </defs>

      {/* Flow arrows */}
      {layout.flowArrows?.map((arrow, i) => {
        const fromComp = layout.components?.find(c => c.id === arrow.from);
        const toComp = layout.components?.find(c => c.id === arrow.to);
        if (!fromComp || !toComp) return null;
        const from = getCenter(fromComp);
        const to = getCenter(toComp);
        const mx = (from.cx + to.cx) / 2;
        const my = (from.cy + to.cy) / 2;
        return (
          <g key={i}>
            <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#arrowBlue)" strokeDasharray="4,3" opacity="0.7" />
            {arrow.label && (
              <text x={mx} y={my - 4} fill="#2563EB" fontSize="7" textAnchor="middle" fontStyle="italic">{arrow.label}</text>
            )}
          </g>
        );
      })}

      {/* Components */}
      {layout.components?.map((comp) => {
        const colors = COLOR_MAP[comp.color] ?? COLOR_MAP.blue;
        const cx = toSvgX(comp.x);
        const cy = toSvgY(comp.y);
        const cw = toSvgW(comp.w);
        const ch = toSvgH(comp.h);
        const centerX = cx + cw / 2;
        const centerY = cy + ch / 2;
        return (
          <g key={comp.id}>
            <rect x={cx} y={cy} width={cw} height={ch} fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" rx="2" />
            {/* Label */}
            <text x={centerX} y={centerY - (comp.sublabel ? 6 : 0)} fill={colors.text} fontSize="8.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
              {comp.label.length > 18 ? comp.label.substring(0, 17) + "…" : comp.label}
            </text>
            {comp.sublabel && (
              <text x={centerX} y={centerY + 10} fill={colors.text} fontSize="7" textAnchor="middle" opacity="0.85">
                {comp.sublabel.length > 20 ? comp.sublabel.substring(0, 19) + "…" : comp.sublabel}
              </text>
            )}
            {/* Dimension tag */}
            <text x={cx + 2} y={cy + ch - 2} fill={colors.stroke} fontSize="6" opacity="0.7">{comp.w.toFixed(1)}×{comp.h.toFixed(1)}m</text>
          </g>
        );
      })}

      {/* Legend strip */}
      <rect x={0} y={SVG_H - LEGEND_H} width={SVG_W} height={LEGEND_H} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
      <text x={12} y={SVG_H - LEGEND_H + 14} fill="#64748B" fontSize="8" fontWeight="bold">LEGEND:</text>
      {Object.entries(COLOR_MAP).slice(0, 6).map(([name, c], i) => (
        <g key={name} transform={`translate(${70 + i * 130}, ${SVG_H - LEGEND_H + 6})`}>
          <rect width="12" height="12" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" rx="1" />
          <text x="16" y="10" fill={c.text} fontSize="8" fontWeight="500">{name.charAt(0).toUpperCase() + name.slice(1)}</text>
        </g>
      ))}
      <text x={SVG_W - 160} y={SVG_H - LEGEND_H + 14} fill="#94A3B8" fontSize="7.5">Generated by FlowMatriX AI Civil Module</text>
    </svg>
  );
}

const HISTORY_KEY = "civil_drawing_history";
function loadHistory(): GeneratedDrawing[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: GeneratedDrawing[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10))); } catch {}
}

export default function CivilDrawingAI() {
  const [projectName, setProjectName] = useState("");
  const [siteLength, setSiteLength] = useState("");
  const [siteWidth, setSiteWidth] = useState("");
  const [tankHeight, setTankHeight] = useState("3.5");
  const [inletFlow, setInletFlow] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedSteps, setSelectedSteps] = useState<string[]>([
    "inlet_chamber", "bar_screen", "equalization", "aeration", "secondary_clarifier", "chlorination", "treated_storage", "pump_station",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedDrawing | null>(null);
  const [history, setHistory] = useState<GeneratedDrawing[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  const toggleStep = (id: string) => {
    setSelectedSteps(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

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

    const processStepLabels = selectedSteps.map(
      id => ETP_PROCESS_OPTIONS.find(o => o.id === id)?.label ?? id
    );

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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Civil Drawing AI</h1>
                <p className="text-xs text-gray-500">ETP Layout Generator — AI-powered civil drawing from site parameters</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  History ({history.length})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-73px)]">
          {/* Left Panel — Inputs */}
          <div className="w-full lg:w-[380px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Project Info */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Project Info
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Project Name</label>
                    <input
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. WTT - ETP Phase 1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Design Flow Rate</label>
                    <input
                      value={inletFlow}
                      onChange={e => setInletFlow(e.target.value)}
                      placeholder="e.g. 200 KLD / 8.3 m³/hr"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Site Dimensions */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Site Dimensions
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Length (m) *</label>
                    <input
                      type="number"
                      value={siteLength}
                      onChange={e => setSiteLength(e.target.value)}
                      placeholder="e.g. 40"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Width (m) *</label>
                    <input
                      type="number"
                      value={siteWidth}
                      onChange={e => setSiteWidth(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tank Ht (m)</label>
                    <input
                      type="number"
                      value={tankHeight}
                      onChange={e => setTankHeight(e.target.value)}
                      placeholder="3.5"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                {siteLength && siteWidth && (
                  <p className="text-[10px] text-emerald-600 mt-1.5 font-medium">
                    Total site area: {(parseFloat(siteLength) * parseFloat(siteWidth)).toFixed(0)} m²
                  </p>
                )}
              </div>

              {/* Process Steps */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" /> ETP Process Stages *
                </h2>
                <p className="text-[10px] text-gray-400 mb-2">Check to include. Drag arrows to reorder.</p>

                {/* Selected order */}
                {selectedSteps.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {selectedSteps.map((id, idx) => {
                      const opt = ETP_PROCESS_OPTIONS.find(o => o.id === id);
                      if (!opt) return null;
                      return (
                        <div key={id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                          <span className="text-[10px] font-bold text-emerald-600 w-5 text-center">{idx + 1}</span>
                          <span className="text-xs text-emerald-800 flex-1 truncate">{opt.label}</span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => reorderSteps(id, "up")} disabled={idx === 0} className="text-emerald-500 disabled:opacity-30 hover:text-emerald-700">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => reorderSteps(id, "down")} disabled={idx === selectedSteps.length - 1} className="text-emerald-500 disabled:opacity-30 hover:text-emerald-700">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <button onClick={() => toggleStep(id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Available options */}
                <div className="space-y-0.5 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                  {ETP_PROCESS_OPTIONS.filter(o => !selectedSteps.includes(o.id)).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleStep(opt.id)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {opt.label}
                    </button>
                  ))}
                  {ETP_PROCESS_OPTIONS.filter(o => !selectedSteps.includes(o.id)).length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-2">All stages selected</p>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Additional Requirements
                </h2>
                <textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. Inlet from north side, road on east, underground storage preferred, ZLD target..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Layout…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate ETP Drawing</>
                )}
              </button>
              {loading && (
                <p className="text-[11px] text-gray-400 text-center">AI is designing your ETP layout — this takes 10–20 seconds</p>
              )}
            </div>
          </div>

          {/* Right Panel — Drawing Output */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
            {showHistory && history.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-700">Generated Drawing History</h2>
                  <button onClick={() => setShowHistory(false)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
                </div>
                {history.map(h => (
                  <div
                    key={h.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-emerald-400 transition-colors"
                    onClick={() => { setResult(h); setShowHistory(false); }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{h.params.projectName}</p>
                        <p className="text-xs text-gray-500">{h.params.siteLength}m × {h.params.siteWidth}m · {h.layout.components?.length} components</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.generatedAt).toLocaleString()}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">View</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Drawing toolbar */}
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{result.params.projectName}</p>
                    <p className="text-xs text-gray-500">{result.layout.components?.length} components · {result.params.siteLength}m × {result.params.siteWidth}m</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><RotateCcw className="w-4 h-4" /></button>
                    <button
                      onClick={downloadSVG}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download SVG
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> New
                    </button>
                  </div>
                </div>

                {/* SVG Drawing */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                  <div
                    ref={svgRef}
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.15s" }}
                  >
                    <ETPDrawingSVG
                      layout={result.layout}
                      siteLength={result.params.siteLength}
                      siteWidth={result.params.siteWidth}
                      projectName={result.params.projectName}
                      tankHeight={result.params.tankHeight}
                    />
                  </div>
                </div>

                {/* AI Summary & Design Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Layout Summary
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.layout.summary}</p>
                    {result.layout.capacity && (
                      <p className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded px-2 py-1">{result.layout.capacity}</p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Design Notes
                    </h3>
                    <ul className="space-y-1.5">
                      {result.layout.designNotes?.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Component table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Component Schedule</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-500 font-semibold">Component</th>
                          <th className="px-3 py-2 text-right text-gray-500 font-semibold">L (m)</th>
                          <th className="px-3 py-2 text-right text-gray-500 font-semibold">W (m)</th>
                          <th className="px-3 py-2 text-right text-gray-500 font-semibold">H (m)</th>
                          <th className="px-3 py-2 text-right text-gray-500 font-semibold">Area (m²)</th>
                          <th className="px-4 py-2 text-left text-gray-500 font-semibold">Capacity / Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.layout.components?.map((comp, i) => {
                          const colors = COLOR_MAP[comp.color] ?? COLOR_MAP.blue;
                          return (
                            <tr key={comp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-2 font-semibold" style={{ color: colors.text }}>{comp.label}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{comp.w.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{comp.h.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{result.params.tankHeight.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{(comp.w * comp.h).toFixed(1)}</td>
                              <td className="px-4 py-2 text-gray-500 italic">{comp.sublabel || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
                  <Building2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-700 mb-2">AI ETP Drawing Generator</h2>
                <p className="text-sm text-gray-400 max-w-sm">
                  Enter your site dimensions, tank height, and select the ETP process stages on the left. AI will generate a scaled civil layout drawing automatically.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-500">
                  {[
                    { icon: "📐", label: "Scaled to site dimensions" },
                    { icon: "🔄", label: "Logical process flow" },
                    { icon: "📄", label: "Downloadable SVG" },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col items-center gap-1.5 bg-white rounded-xl border border-gray-200 p-3">
                      <span className="text-xl">{f.icon}</span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
