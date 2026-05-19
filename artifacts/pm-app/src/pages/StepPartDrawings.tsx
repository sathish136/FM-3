import { Layout } from "@/components/Layout";
import { ShadedMeshImage } from "@/components/ShadedMeshImage";
import { FabricationSheetBuilder } from "@/components/FabricationSheetBuilder";
import StepViewer3D, { type ViewerRef, type ViewMode, type BgColor } from "@/components/StepViewer3D";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Upload, FileBox, Loader2, Download, Ruler, Layers,
  Box, Sparkles, Grid3X3, Maximize2, LayoutGrid,
  Move3d, ScanLine, Crosshair, ArrowUpDown, Eye,
  ChevronRight, ChevronLeft, Package, Info, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { loadStepFile, type MeshData, type TreeNode } from "@/lib/stepLoader";
import {
  collectParts, boundsSummary, parseDrawingTitle,
  type PartDrawingInfo, inferWttBomRow,
} from "@/lib/stepPartDrawing";
import { downloadStepPartDrawingPdf } from "@/lib/stepPartDrawingPdf";
import { HD_PART, HD_GA_ISO, partColorCss } from "@/lib/stepMeshRenderer";

type Status = "idle" | "loading" | "ready" | "error";
type MainTab = "assembly" | "detail" | "explorer";

// ─── A4 Portrait Part Drawing Sheet ──────────────────────────────────────────
function PartDrawingSheet({
  meshes,
  part,
  drawingNumber,
}: {
  meshes: MeshData[];
  part: PartDrawingInfo;
  drawingNumber: string;
}) {
  const bom = useMemo(() => inferWttBomRow(part.name, part.bounds), [part]);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const indices = useMemo(() => [part.meshIndex], [part.meshIndex]);

  const VIEWS: { key: "front" | "top" | "right" | "iso"; label: string; dark?: boolean }[] = [
    { key: "front", label: "FRONT VIEW" },
    { key: "right", label: "SIDE VIEW" },
    { key: "top",   label: "PLAN VIEW (TOP)" },
    { key: "iso",   label: "ISOMETRIC", dark: true },
  ];

  const BOM_FIELDS = [
    ["Description", bom.description],
    ["Size",        bom.size],
    ["Material",    bom.moc],
    ["Standard",    bom.std],
    ["Pressure",    bom.pn],
    ["Type",        bom.type],
  ];

  return (
    <div
      className="bg-white shadow-2xl relative flex flex-col"
      style={{
        aspectRatio: "210 / 297",
        height: "100%",
        width: "auto",
        maxWidth: "100%",
        border: "2.5px solid #222",
        fontFamily: "'Courier New', Courier, monospace",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* ── inner border frame ── */}
      <div className="absolute pointer-events-none z-10"
        style={{ inset: "1.8%", border: "1px solid #111" }} />

      {/* ── sheet content ── */}
      <div className="absolute flex flex-col" style={{ inset: "3%", overflow: "hidden" }}>

        {/* ①  PART HEADER BAR  — 9% */}
        <div className="shrink-0 border border-black flex items-stretch" style={{ flex: "0 0 9%", minHeight: 0 }}>
          {/* Company */}
          <div className="flex flex-col items-center justify-center border-r border-black shrink-0"
            style={{ width: "27%", background: "#1e2a45", padding: "3px 4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#fff", letterSpacing: "0.03em", textAlign: "center", lineHeight: 1.2 }}>
              WTT INTERNATIONAL PVT LTD
            </span>
          </div>
          {/* Part name */}
          <div className="flex flex-col justify-center border-r border-black flex-1 min-w-0" style={{ padding: "3px 8px" }}>
            <span style={{ fontSize: "8px", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>Part Name</span>
            <span className="font-black truncate" style={{ fontSize: "14px", lineHeight: 1.1, marginTop: "2px" }}>{part.name}</span>
          </div>
          {/* Part No */}
          <div className="flex flex-col justify-center border-r border-black shrink-0" style={{ width: "17%", padding: "3px 6px" }}>
            <span style={{ fontSize: "8px", color: "#888", textTransform: "uppercase" }}>Part No.</span>
            <span className="font-black" style={{ fontSize: "13px", lineHeight: 1.1, marginTop: "2px" }}>{part.partNo}</span>
          </div>
          {/* Assembly */}
          <div className="flex flex-col justify-center shrink-0" style={{ width: "18%", padding: "3px 6px" }}>
            <span style={{ fontSize: "8px", color: "#888", textTransform: "uppercase" }}>Assembly</span>
            <span className="font-semibold truncate" style={{ fontSize: "11px", lineHeight: 1.1, marginTop: "2px" }}>{drawingNumber}</span>
          </div>
        </div>

        {/* ②  2×2 ORTHOGRAPHIC VIEWS  — flex: 56 */}
        <div
          className="shrink-0 border border-t-0 border-black overflow-hidden"
          style={{
            flex: "56",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {VIEWS.map((v, i) => (
            <div
              key={v.key}
              className="flex flex-col overflow-hidden"
              style={{
                borderRight:  i % 2 === 0 ? "1px solid #000" : "none",
                borderBottom: i < 2       ? "1px solid #000" : "none",
              }}
            >
              <div
                className="shrink-0 flex items-center justify-center gap-2"
                style={{
                  background: v.dark ? "#1e2a45" : "#2d2d2d",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  height: "18px",
                  flexShrink: 0,
                }}
              >
                {v.label}
                {v.key !== "iso" && (
                  <span style={{ fontSize: "7px", color: "#bbb", fontWeight: 400, letterSpacing: "0.06em" }}>ALL DIM IN mm</span>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden bg-white">
                <ShadedMeshImage
                  meshes={meshes}
                  meshIndices={indices}
                  view={v.key}
                  width={HD_PART.width}
                  height={HD_PART.height}
                  pixelRatio={2}
                  className="h-full w-full"
                  alt={v.label}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ③  PROPERTIES / BOM ROW  — flex: 22 */}
        <div
          className="shrink-0 border border-t-0 border-black flex overflow-hidden"
          style={{ flex: "22", minHeight: 0 }}
        >
          {/* Dimensions */}
          <div className="flex flex-col border-r border-black overflow-hidden shrink-0" style={{ width: "24%" }}>
            <div className="shrink-0 flex items-center border-b border-neutral-400"
              style={{ background: "#d4d4d4", height: "16px", paddingLeft: "6px" }}>
              <span style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#333" }}>DIMENSIONS (mm)</span>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col justify-around" style={{ padding: "4px 8px" }}>
              {[
                { l: "LENGTH", v: part.bounds.length },
                { l: "WIDTH",  v: part.bounds.width  },
                { l: "HEIGHT", v: part.bounds.height },
              ].map(({ l, v }) => (
                <div key={l} className="flex items-center justify-between">
                  <span style={{ fontSize: "8px", color: "#666", textTransform: "uppercase", fontWeight: 700 }}>{l}</span>
                  <span style={{ fontSize: "13px", fontWeight: 900, fontFamily: "monospace" }}>
                    {isFinite(v) && !isNaN(v) ? v.toFixed(1) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BOM & Spec */}
          <div className="flex flex-col flex-1 border-r border-black overflow-hidden min-w-0">
            <div className="shrink-0 flex items-center border-b border-neutral-400"
              style={{ background: "#d4d4d4", height: "16px", paddingLeft: "6px" }}>
              <span style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#333" }}>MATERIAL & SPECIFICATION</span>
            </div>
            <div className="flex-1 overflow-hidden" style={{ padding: "4px 8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px", alignContent: "start" }}>
                {BOM_FIELDS.map(([l, v]) => (
                  <div key={l} className="flex flex-col overflow-hidden">
                    <span style={{ fontSize: "7px", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</span>
                    <span className="font-bold truncate" style={{ fontSize: "11px", lineHeight: 1.2 }}>{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col overflow-hidden shrink-0" style={{ width: "23%" }}>
            <div className="shrink-0 flex items-center border-b border-neutral-400"
              style={{ background: "#d4d4d4", height: "16px", paddingLeft: "6px" }}>
              <span style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#333" }}>NOTES</span>
            </div>
            <div className="flex-1 overflow-hidden" style={{ padding: "5px 8px" }}>
              {[
                "1. ALL DIMENSIONS IN mm",
                "2. UNLESS OTHERWISE NOTED",
                "3. TOLERANCES: ±0.1 mm",
                "4. THIRD ANGLE PROJECTION",
              ].map((note, i) => (
                <div key={i} style={{ fontSize: "8px", color: "#555", lineHeight: 1.7 }}>{note}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ④  TITLE BLOCK  — flex: 13 */}
        <div
          className="shrink-0 border border-t-0 border-black flex overflow-hidden"
          style={{ flex: "13", minHeight: 0 }}
        >
          {/* Company + Signoff */}
          <div className="flex flex-col border-r border-black overflow-hidden shrink-0" style={{ width: "32%" }}>
            <div className="shrink-0 flex items-center justify-center border-b border-black"
              style={{ background: "#1e2a45", flex: "0 0 40%", minHeight: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#fff", letterSpacing: "0.04em", textAlign: "center" }}>
                WTT INTERNATIONAL PVT LTD
              </span>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {[["Drawn", "AUTO"], ["Checked", "—"], ["Approved", "—"]].map(([l, v]) => (
                <div key={l} className="flex-1 border-r border-black last:border-r-0 flex flex-col justify-center" style={{ padding: "2px 4px" }}>
                  <div style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: "10px", fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Title & drawing no */}
          <div className="flex-1 flex flex-col border-r border-black overflow-hidden min-w-0">
            <div className="flex-1 flex flex-col justify-center border-b border-black min-h-0" style={{ padding: "2px 8px" }}>
              <span style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>Part Name / Title</span>
              <span className="font-black truncate" style={{ fontSize: "14px", lineHeight: 1.1 }}>{part.name}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center min-h-0" style={{ padding: "2px 8px" }}>
              <span style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>Assembly Drawing</span>
              <span className="font-semibold truncate" style={{ fontSize: "11px", lineHeight: 1.1 }}>{drawingNumber}</span>
            </div>
          </div>

          {/* Part No + meta */}
          <div className="flex flex-col overflow-hidden shrink-0" style={{ width: "22%" }}>
            <div className="flex-1 flex flex-col justify-center border-b border-black min-h-0" style={{ padding: "2px 6px" }}>
              <span style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>Part No.</span>
              <span className="font-black" style={{ fontSize: "13px", lineHeight: 1.1 }}>{part.partNo}</span>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {[["Scale", "1:1"], ["Rev", "A"], ["Date", dateStr]].map(([l, v]) => (
                <div key={l} className="flex-1 border-r border-black last:border-r-0 flex flex-col justify-center" style={{ padding: "2px 4px" }}>
                  <div style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: v.length > 5 ? "8px" : "10px", fontWeight: 900 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StepPartDrawings() {
  const [status,   setStatus]   = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error,    setError]    = useState("");
  const [fileName, setFileName] = useState("");
  const [meshes,   setMeshes]   = useState<MeshData[]>([]);
  const [root,     setRoot]     = useState<TreeNode | null>(null);
  const [parts,    setParts]    = useState<PartDrawingInfo[]>([]);
  const [selected, setSelected] = useState<PartDrawingInfo | null>(null);
  const [viewTab,     setViewTab]     = useState<MainTab>("assembly");
  const [isDragging,  setIsDragging]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode,     setViewMode]     = useState<ViewMode>("shaded");
  const [showGrid,     setShowGrid]     = useState(false);
  const [showAxes,     setShowAxes]     = useState(false);
  const [bgColor]                       = useState<BgColor>("white");
  const [measureMode,  setMeasureMode]  = useState(false);
  const [measureResult, setMeasureResult] = useState<string | null>(null);
  const [explorerSelectedIdx, setExplorerSelectedIdx] = useState<number | null>(null);

  const detailViewerRef   = useRef<ViewerRef>(null);
  const explorerViewerRef = useRef<ViewerRef>(null);

  useEffect(() => {
    if (viewTab === "detail" && selected) {
      const timer = setTimeout(() => {
        detailViewerRef.current?.fitToPart?.([selected.meshIndex]);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [selected, viewTab]);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "step" && ext !== "stp") { setError("Please upload a .STEP or .STP file."); setStatus("error"); return; }
    setFileName(file.name); setStatus("loading"); setError(""); setProgress("Parsing STEP file…");
    setMeshes([]); setRoot(null); setParts([]); setSelected(null); setViewTab("assembly");
    try {
      const buffer = await file.arrayBuffer();
      const result = await loadStepFile(buffer, msg => setProgress(msg));
      setMeshes(result.meshes); setRoot(result.root);
      const list = collectParts(result.meshes, result.root);
      setParts(list); setSelected(list[0] ?? null); setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load STEP file"); setStatus("error");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  }, [processFile]);

  const meta = fileName ? parseDrawingTitle(fileName) : null;

  const detailHiddenMeshes = useMemo(() => {
    if (!selected) return new Set<number>();
    const s = new Set<number>();
    meshes.forEach((_, i) => { if (i !== selected.meshIndex) s.add(i); });
    return s;
  }, [selected, meshes]);

  const explorerPart = useMemo(() =>
    explorerSelectedIdx !== null ? parts.find(p => p.meshIndex === explorerSelectedIdx) ?? null : null,
    [explorerSelectedIdx, parts]);

  const explorerBom = useMemo(() =>
    explorerPart ? inferWttBomRow(explorerPart.name, explorerPart.bounds) : null,
    [explorerPart]);

  const selectPart = (p: PartDrawingInfo) => {
    setSelected(p); setViewTab("detail"); setMeasureMode(false); setMeasureResult(null);
  };

  const TABS: { id: MainTab; icon: React.ReactNode; label: string }[] = [
    { id: "assembly", icon: <Box className="w-3.5 h-3.5" />,   label: "GA Sheet" },
    { id: "detail",   icon: <Ruler className="w-3.5 h-3.5" />, label: "Part Drawing (A4)" },
    { id: "explorer", icon: <Move3d className="w-3.5 h-3.5" />, label: "3D Explorer" },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950">

        {/* ── HEADER ── */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
              <Ruler className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">STEP Part Drawings</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">
                GA Sheet (A3) · Part Drawing (A4 Portrait) · 3D Explorer · PDF Export
              </p>
            </div>
            {status === "ready" && meta && (
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{meta.number}</span>
                <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-lg font-semibold">
                  <Layers className="w-3 h-3" /> {parts.length} parts
                </span>
                <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg font-semibold">
                  <Grid3X3 className="w-3 h-3" /> {meshes.length} meshes
                </span>
              </div>
            )}
            {fileName && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg truncate max-w-[160px] shrink-0 font-mono">{fileName}</span>
            )}
            {status === "ready" && (
              <button type="button"
                onClick={() => downloadStepPartDrawingPdf(fileName, meshes, root)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow-sm shrink-0 hover:opacity-90 transition-opacity">
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            )}
            {status !== "idle" && status !== "loading" && (
              <button type="button"
                onClick={() => { setStatus("idle"); setMeshes([]); setRoot(null); setParts([]); setSelected(null); setFileName(""); }}
                className="text-[11px] text-slate-400 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
                ✕ Clear
              </button>
            )}
          </div>
        </header>

        {/* ── IDLE ── */}
        {status === "idle" && (
          <div
            className={`flex-1 flex flex-col items-center justify-center m-6 border-2 border-dashed rounded-3xl transition-all cursor-pointer
              ${isDragging ? "border-sky-500 bg-sky-500/5 scale-[1.01]" : "border-slate-300 bg-white hover:border-sky-400/70 hover:bg-sky-50/30 dark:bg-slate-900 dark:border-slate-700"}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 flex items-center justify-center mb-5 shadow-inner">
              <FileBox className="w-10 h-10 text-sky-600" />
            </div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">Drop a STEP / STP file here</p>
            <p className="text-xs text-slate-500 mt-2 mb-6 text-center max-w-md leading-relaxed">
              Generates a WTT-style GA fabrication sheet (A3 landscape) with dimensioned views,
              individual A4 part drawings with orthographic projections, and a Bill of Materials.
            </p>
            <div className="flex items-center gap-8 text-[11px] text-slate-500 mb-6">
              {[
                { icon: <Box       className="w-4 h-4 text-sky-500"     />, label: "GA Sheet (A3)"     },
                { icon: <Ruler     className="w-4 h-4 text-indigo-500"  />, label: "Part Drawing (A4)" },
                { icon: <Sparkles  className="w-4 h-4 text-amber-500"   />, label: "3D Explorer"       },
                { icon: <Download  className="w-4 h-4 text-emerald-500" />, label: "PDF Export"        },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">{icon}<span className="font-medium">{label}</span></div>
              ))}
            </div>
            <button type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:opacity-90 transition-opacity">
              <Upload className="w-4 h-4" /> Choose File
            </button>
            <input ref={fileInputRef} type="file" accept=".step,.stp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </div>
        )}

        {status === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 flex items-center justify-center shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Processing STEP file…</p>
              <p className="text-xs text-slate-500 mt-1">{progress}</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-rose-600 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/30 px-6 py-3 border border-rose-200 dark:border-rose-900">{error}</p>
          </div>
        )}

        {/* ── READY ── */}
        {status === "ready" && meta && (
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── SIDEBAR ── */}
            <aside
              className="shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200"
              style={{ width: sidebarOpen ? "230px" : "40px" }}
            >
              {/* Collapse toggle */}
              <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60">
                {sidebarOpen && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Box className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{meta.number}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(v => !v)}
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 ${!sidebarOpen ? "mx-auto" : "ml-auto"}`}
                >
                  {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              </div>

              {sidebarOpen && (
                <>
              {/* Assembly summary */}
              <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60">
                <p className="font-black text-[11px] text-slate-900 dark:text-white leading-snug truncate" title={meta.number}>{meta.number}</p>
                {meta.title && <p className="text-[9px] text-slate-500 truncate mt-0.5">{meta.title}</p>}
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold">
                    <Layers className="w-2 h-2" /> {parts.length} parts
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <Grid3X3 className="w-2 h-2" /> {meshes.length} meshes
                  </span>
                </div>
              </div>

              {/* Parts list header */}
              <div className="shrink-0 px-3 pt-2 pb-1 flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-400" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parts</p>
                <span className="ml-auto text-[8px] text-slate-400">{parts.length}</span>
              </div>

              {/* Scrollable parts */}
              <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 space-y-1">
                {parts.map(p => {
                  const isActive = selected?.meshIndex === p.meshIndex;
                  return (
                    <button
                      key={p.meshIndex}
                      type="button"
                      onClick={() => selectPart(p)}
                      className={`w-full text-left rounded-xl border overflow-hidden transition-all flex gap-2 p-2 items-start
                        ${isActive
                          ? "border-sky-400 bg-sky-50 dark:bg-sky-950/40 ring-1 ring-sky-400/30 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 bg-white dark:bg-slate-800/40"
                        }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0 relative">
                        <ShadedMeshImage
                          meshes={meshes}
                          meshIndices={[p.meshIndex]}
                          view="iso"
                          width={HD_PART.width}
                          height={HD_PART.height}
                          pixelRatio={1}
                          className="h-full w-full"
                          alt={p.partNo}
                        />
                        <span
                          className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white shadow-sm"
                          style={{ background: partColorCss(p.meshIndex) }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={`font-bold text-[10px] truncate leading-none ${isActive ? "text-sky-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100"}`}>{p.partNo}</p>
                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{p.name}</p>
                        <p className="text-[8px] text-slate-400 truncate mt-0.5 font-mono">{boundsSummary(p.bounds)}</p>
                      </div>

                      {isActive && <ChevronRight className="w-3 h-3 text-sky-500 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
                </>
              )}
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 overflow-hidden min-w-0 flex flex-col">

              {/* Tab bar */}
              <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex gap-1 items-center">
                {TABS.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setViewTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${viewTab === tab.id
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
                <div className="flex-1" />

                {/* View controls (not on assembly tab) */}
                {viewTab !== "assembly" && (
                  <div className="flex items-center gap-1">
                    {(["shaded", "wireframe", "flat"] as ViewMode[]).map(m => (
                      <button key={m} type="button" onClick={() => setViewMode(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all
                          ${viewMode === m ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button type="button" onClick={() => setShowGrid(v => !v)} title="Grid"
                      className={`p-1.5 rounded-lg transition-colors ${showGrid ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setShowAxes(v => !v)} title="Axes"
                      className={`p-1.5 rounded-lg transition-colors ${showAxes ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    {viewTab === "detail" && (
                      <button type="button"
                        onClick={() => { setMeasureMode(v => !v); setMeasureResult(null); detailViewerRef.current?.clearMeasure(); }}
                        title="Measure"
                        className={`p-1.5 rounded-lg transition-colors ${measureMode ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                        <ScanLine className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ════ TAB: FABRICATION GA SHEET (A3) ════ */}
              {viewTab === "assembly" && (
                <FabricationSheetBuilder
                  meshes={meshes}
                  parts={parts}
                  drawingNumber={meta.number}
                  drawingTitle={meta.title}
                  onSelectPart={p => selectPart(p)}
                />
              )}

              {/* ════ TAB: PART DRAWING (A4 PORTRAIT) ════ */}
              {viewTab === "detail" && (
                <div className="flex-1 min-h-0 overflow-hidden flex">
                  {!selected ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Ruler className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-semibold">Select a part from the list to view its drawing</p>
                    </div>
                  ) : (
                    <>
                      {/* ── A4 Portrait Drawing Sheet ── */}
                      <div className="flex-1 min-h-0 bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-4" style={{ minWidth: 0 }}>
                        <PartDrawingSheet
                          meshes={meshes}
                          part={selected}
                          drawingNumber={meta.number}
                        />
                      </div>

                      {/* ── Right: Interactive 3D Viewer ── */}
                      <div
                        className="shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                        style={{ width: "280px" }}
                      >
                        {/* 3D viewer header */}
                        <div className="shrink-0 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Move3d className="w-3.5 h-3.5 text-sky-600" />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">3D View</span>
                          </div>
                          {measureResult && (
                            <span className="text-[9px] font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-1.5 py-0.5 rounded">
                              📏 {measureResult}
                            </span>
                          )}
                        </div>

                        {/* Camera controls */}
                        <div className="shrink-0 px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-1 flex-wrap">
                          {(["front", "top", "right", "iso"] as const).map(v => (
                            <button key={v} type="button" onClick={() => detailViewerRef.current?.setCamera(v)}
                              className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-sky-400 hover:text-sky-600 transition-colors">
                              {v.toUpperCase()}
                            </button>
                          ))}
                          <button type="button" onClick={() => detailViewerRef.current?.fitToView()}
                            className="ml-auto px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center gap-0.5">
                            <Maximize2 className="w-2.5 h-2.5" /> Fit
                          </button>
                        </div>

                        {/* 3D canvas */}
                        <div className="flex-1 min-h-0 relative overflow-hidden">
                          <StepViewer3D
                            ref={detailViewerRef}
                            meshes={meshes}
                            viewMode={viewMode}
                            showGrid={showGrid}
                            showAxes={showAxes}
                            bgColor={bgColor}
                            hiddenMeshes={detailHiddenMeshes}
                            measureMode={measureMode}
                            onMeasureResult={dist => {
                              if (dist !== null) setMeasureResult(`${dist.toFixed(2)} mm`);
                              else setMeasureResult(null);
                            }}
                          />
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                            <span className="text-[8px] text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                              Drag · Scroll zoom · Right-drag pan
                            </span>
                          </div>
                        </div>

                        {/* Part info strip */}
                        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-sm"
                              style={{ background: partColorCss(selected.meshIndex) }}
                            />
                            <p className="font-bold text-[11px] text-slate-800 dark:text-slate-100 truncate">{selected.name}</p>
                          </div>
                          <p className="text-[9px] font-mono text-slate-500 ml-4">{selected.partNo}</p>
                          <div className="ml-4 space-y-0.5">
                            {[
                              { l: "L", v: selected.bounds.length },
                              { l: "W", v: selected.bounds.width  },
                              { l: "H", v: selected.bounds.height },
                            ].map(({ l, v }) => (
                              <div key={l} className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">{l}</span>
                                <span className="text-[10px] font-bold font-mono text-slate-700 dark:text-slate-300">
                                  {isFinite(v) && !isNaN(v) ? `${v.toFixed(1)} mm` : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ════ TAB: 3D EXPLORER ════ */}
              {viewTab === "explorer" && (
                <div className="flex-1 min-h-0 overflow-hidden flex">

                  {/* 3D viewer */}
                  <div className="flex-1 min-w-0 flex flex-col min-h-0">
                    <div className="shrink-0 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide mr-1">Camera</span>
                      {(["front", "top", "right", "iso"] as const).map(v => (
                        <button key={v} type="button" onClick={() => explorerViewerRef.current?.setCamera(v)}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-600 transition-colors">
                          {v.toUpperCase()}
                        </button>
                      ))}
                      <button type="button" onClick={() => explorerViewerRef.current?.fitToView()}
                        className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center gap-0.5">
                        <Maximize2 className="w-2.5 h-2.5" /> Fit
                      </button>
                      {explorerSelectedIdx !== null && (
                        <>
                          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                          <button type="button" onClick={() => explorerViewerRef.current?.fitToPart?.([explorerSelectedIdx])}
                            className="px-2.5 py-0.5 rounded-md text-[9px] font-semibold bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 transition-colors flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5" /> Focus
                          </button>
                          <button type="button" onClick={() => { if (explorerPart) selectPart(explorerPart); }}
                            className="px-2.5 py-0.5 rounded-md text-[9px] font-semibold bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-0.5">
                            <ArrowUpDown className="w-2.5 h-2.5" /> Part Drawing
                          </button>
                          <button type="button" onClick={() => setExplorerSelectedIdx(null)}
                            className="text-slate-400 hover:text-slate-700 text-[10px] px-1">✕</button>
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 relative overflow-hidden">
                      <StepViewer3D
                        ref={explorerViewerRef}
                        meshes={meshes}
                        viewMode={viewMode}
                        showGrid={showGrid}
                        showAxes={showAxes}
                        bgColor={bgColor}
                        hiddenMeshes={new Set<number>()}
                        measureMode={false}
                        onMeasureResult={() => {}}
                        onPartClick={idx => setExplorerSelectedIdx(idx)}
                      />
                      {explorerSelectedIdx === null && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 bg-white/85 dark:bg-slate-900/85 px-4 py-2 rounded-xl pointer-events-none shadow-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          Click any part to inspect
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inspector panel */}
                  <div className="w-[260px] shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Part Inspector</p>
                    </div>

                    {explorerPart ? (
                      <div className="flex-1 overflow-y-auto min-h-0">
                        {/* ISO thumbnail */}
                        <div className="h-36 bg-slate-100 dark:bg-slate-800 relative shrink-0">
                          <ShadedMeshImage
                            meshes={meshes}
                            meshIndices={[explorerPart.meshIndex]}
                            view="iso"
                            width={HD_PART.width}
                            height={HD_PART.height}
                            pixelRatio={2}
                            className="h-full w-full"
                            alt={explorerPart.partNo}
                          />
                          <span
                            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow"
                            style={{ background: partColorCss(explorerPart.meshIndex) }}
                          />
                        </div>

                        <div className="p-3 space-y-3">
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{explorerPart.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{explorerPart.partNo}</p>
                          </div>

                          {/* Dimensions */}
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Dimensions</p>
                            {[
                              { l: "Length", v: explorerPart.bounds.length },
                              { l: "Width",  v: explorerPart.bounds.width  },
                              { l: "Height", v: explorerPart.bounds.height },
                            ].map(({ l, v }) => (
                              <div key={l} className="flex justify-between items-center py-0.5">
                                <span className="text-[10px] text-slate-500">{l}</span>
                                <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
                                  {isFinite(v) && !isNaN(v) ? `${v.toFixed(1)} mm` : "—"}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* BOM */}
                          {explorerBom && (
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">BOM Details</p>
                              {[
                                ["Description", explorerBom.description],
                                ["Size",        explorerBom.size],
                                ["Material",    explorerBom.moc],
                                ["Standard",    explorerBom.std],
                                ["Pressure",    explorerBom.pn],
                                ["Type",        explorerBom.type],
                                ["Length",      explorerBom.totalLength],
                              ].map(([l, v]) => (
                                <div key={l} className="flex justify-between text-[10px] gap-2 py-0.5">
                                  <span className="text-slate-400 shrink-0">{l}</span>
                                  <span className="font-semibold text-right truncate text-slate-700 dark:text-slate-300" title={v}>{v}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Ortho mini 2×2 */}
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ortho Views</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(["front", "top", "right", "iso"] as const).map(v => (
                                <div key={v} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                                  <div className="bg-slate-700 dark:bg-slate-900 px-1 py-0.5 text-[7px] font-bold text-white text-center uppercase">{v}</div>
                                  <ShadedMeshImage
                                    meshes={meshes}
                                    meshIndices={[explorerPart.meshIndex]}
                                    view={v}
                                    width={200}
                                    height={150}
                                    pixelRatio={1}
                                    className="aspect-[4/3] w-full"
                                    alt={v}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <button type="button" onClick={() => selectPart(explorerPart)}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity">
                            <Ruler className="w-3.5 h-3.5" /> Open Part Drawing (A4)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 min-h-0">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Package className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">No part selected</p>
                          <p className="text-[10px] text-slate-400 mt-1">Click any part in the 3D view to inspect it</p>
                        </div>
                        <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-left space-y-1.5">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assembly</p>
                          {[["Parts", parts.length], ["Meshes", meshes.length], ["Drawing", meta.number]].map(([l, v]) => (
                            <div key={String(l)} className="flex justify-between text-[10px]">
                              <span className="text-slate-400">{l}</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={String(v)}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </main>
          </div>
        )}

      </div>
    </Layout>
  );
}
