import { Layout } from "@/components/Layout";
import { ShadedMeshImage } from "@/components/ShadedMeshImage";
import { FabricationSheetPreview } from "@/components/FabricationSheetPreview";
import StepViewer3D, { type ViewerRef, type ViewMode, type BgColor } from "@/components/StepViewer3D";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Upload, FileBox, Loader2, Download, Ruler, Layers,
  Box, Sparkles, Grid3X3, RotateCcw, Eye, EyeOff,
  ChevronRight, Maximize2, LayoutGrid, Cpu,
  Move3d, ScanLine, AlignLeft, Info, Tag,
  Crosshair, ArrowUpDown,
} from "lucide-react";
import { loadStepFile, prewarmWorker, type MeshData, type TreeNode } from "@/lib/stepLoader";
import {
  collectParts,
  boundsSummary,
  parseDrawingTitle,
  type PartDrawingInfo,
  inferWttBomRow,
} from "@/lib/stepPartDrawing";
import { downloadStepPartDrawingPdf } from "@/lib/stepPartDrawingPdf";
import { HD_PART } from "@/lib/stepMeshRenderer";
import { partColorCss } from "@/lib/stepMeshRenderer";

type Status = "idle" | "loading" | "ready" | "error";
type MainTab = "assembly" | "detail" | "explorer";

function DimBadge({ label, value, unit = "mm" }: { label: string; value: number; unit?: string }) {
  const display = isFinite(value) && !isNaN(value) ? `${value.toFixed(1)} ${unit}` : "—";
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 min-w-[72px]">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-foreground mt-0.5">{display}</span>
    </div>
  );
}

function ViewBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
        active
          ? "bg-sky-600 text-white shadow-sm"
          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );
}

export default function StepPartDrawings() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [parts, setParts] = useState<PartDrawingInfo[]>([]);
  const [selected, setSelected] = useState<PartDrawingInfo | null>(null);
  const [viewTab, setViewTab] = useState<MainTab>("assembly");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3D viewer state (shared between detail + explorer tabs)
  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [showGrid, setShowGrid] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [bgColor] = useState<BgColor>("white");
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<string | null>(null);

  // Explorer tab: clicked part from 3D click
  const [explorerSelectedIdx, setExplorerSelectedIdx] = useState<number | null>(null);

  const detailViewerRef = useRef<ViewerRef>(null);
  const explorerViewerRef = useRef<ViewerRef>(null);

  useEffect(() => { prewarmWorker(); }, []);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "step" && ext !== "stp") {
      setError("Please upload a .STEP or .STP file.");
      setStatus("error");
      return;
    }
    setFileName(file.name);
    setStatus("loading");
    setError("");
    setProgress("Parsing STEP…");
    setMeshes([]);
    setRoot(null);
    setParts([]);
    setSelected(null);
    setViewTab("assembly");
    try {
      const buffer = await file.arrayBuffer();
      const result = await loadStepFile(buffer, msg => setProgress(msg));
      setMeshes(result.meshes);
      setRoot(result.root);
      const list = collectParts(result.meshes, result.root);
      setParts(list);
      setSelected(list[0] ?? null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load STEP");
      setStatus("error");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile],
  );

  const meta = fileName ? parseDrawingTitle(fileName) : null;

  // For detail view: hide all meshes except selected
  const detailHiddenMeshes = useMemo(() => {
    if (!selected) return new Set<number>();
    const s = new Set<number>();
    meshes.forEach((_, i) => { if (i !== selected.meshIndex) s.add(i); });
    return s;
  }, [selected, meshes]);

  // For explorer tab
  const explorerPart = useMemo(() =>
    explorerSelectedIdx !== null ? parts.find(p => p.meshIndex === explorerSelectedIdx) ?? null : null,
    [explorerSelectedIdx, parts],
  );
  const explorerBom = useMemo(() =>
    explorerPart ? inferWttBomRow(explorerPart.name, explorerPart.bounds) : null,
    [explorerPart],
  );

  // BOM row for selected part
  const selectedBom = useMemo(() =>
    selected ? inferWttBomRow(selected.name, selected.bounds) : null,
    [selected],
  );

  const selectedIndices = useMemo(
    () => (selected ? [selected.meshIndex] : undefined),
    [selected],
  );

  const selectPart = (p: PartDrawingInfo) => {
    setSelected(p);
    setViewTab("detail");
    setMeasureMode(false);
    setMeasureResult(null);
  };

  const ORTHO_VIEWS = [
    { view: "front" as const, label: "FRONT VIEW" },
    { view: "top" as const, label: "PLAN VIEW" },
    { view: "right" as const, label: "SIDE VIEW" },
    { view: "iso" as const, label: "ISOMETRIC" },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/40">
        {/* ── Header ── */}
        <header className="bg-card/95 backdrop-blur border-b border-border px-5 py-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-sky-500/25">
              <Ruler className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <h1 className="text-base font-bold tracking-tight">STEP Part Drawings</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Assembly GA · Part Detail · 3D Explorer · PDF Export
              </p>
            </div>
            {fileName && (
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg truncate max-w-[200px]">
                {fileName}
              </span>
            )}
            {status === "ready" && (
              <button
                type="button"
                onClick={() => downloadStepPartDrawingPdf(fileName, meshes, root)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
            )}
            {status !== "idle" && status !== "loading" && (
              <button
                type="button"
                onClick={() => { setStatus("idle"); setMeshes([]); setRoot(null); setParts([]); setSelected(null); setFileName(""); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </header>

        {/* ── States ── */}
        {status === "idle" && (
          <div
            className={`flex-1 flex flex-col items-center justify-center p-10 m-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${
              isDragging
                ? "border-sky-500 bg-sky-500/5 scale-[1.01]"
                : "border-border bg-card/50 hover:border-sky-400/60 hover:bg-sky-50/30 dark:hover:bg-sky-950/10"
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 flex items-center justify-center mb-5 shadow-inner">
              <FileBox className="w-10 h-10 text-sky-600" />
            </div>
            <p className="text-lg font-bold">Drop a STEP / STP file here</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6 text-center max-w-md">
              Generates a WTT-style GA fabrication sheet with Front + Plan views, dimensioned
              drawings, Bill of Materials, and colored isometric — exportable as PDF.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground mb-6">
              {[
                { icon: <Box className="w-4 h-4 text-sky-500" />, label: "Fabrication Sheet" },
                { icon: <Ruler className="w-4 h-4 text-indigo-500" />, label: "Part Detail" },
                { icon: <Sparkles className="w-4 h-4 text-amber-500" />, label: "3D Explorer" },
                { icon: <Download className="w-4 h-4 text-emerald-500" />, label: "PDF Export" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  {icon}
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow"
            >
              <Upload className="w-4 h-4" />
              Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".step,.stp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
          </div>
        )}

        {status === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-rose-600 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/30 px-5 py-3 border border-rose-200 dark:border-rose-900">
              {error}
            </p>
          </div>
        )}

        {status === "ready" && meta && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ── LEFT SIDEBAR: Parts list ── */}
            <aside className="w-[220px] shrink-0 border-r border-border flex flex-col bg-card/80 backdrop-blur overflow-hidden">
              <div className="p-3 border-b border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Assembly</p>
                <p className="font-bold text-xs leading-snug truncate" title={meta.number}>{meta.number}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{meta.title}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium">
                    <Layers className="w-2.5 h-2.5" />{parts.length} parts
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium">
                    <Grid3X3 className="w-2.5 h-2.5" />{meshes.length} meshes
                  </span>
                </div>
              </div>

              <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Parts
              </p>
              <div className="overflow-y-auto flex-1 px-1.5 pb-2 space-y-1">
                {parts.map(p => (
                  <button
                    key={p.meshIndex}
                    type="button"
                    onClick={() => selectPart(p)}
                    className={`w-full text-left rounded-lg border overflow-hidden transition-all flex items-center gap-2 pr-2 ${
                      selected?.meshIndex === p.meshIndex
                        ? "border-sky-500 ring-1 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30"
                        : "border-border hover:border-sky-300/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 shrink-0 relative">
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
                        className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white/80 shadow-sm"
                        style={{ background: partColorCss(p.meshIndex) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-semibold text-[10px] truncate">{p.partNo}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{boundsSummary(p.bounds)}</p>
                    </div>
                    {selected?.meshIndex === p.meshIndex && (
                      <ChevronRight className="w-3 h-3 text-sky-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
              {/* Tab bar */}
              <div className="shrink-0 bg-background/90 backdrop-blur border-b border-border px-4 py-2 flex gap-1.5 items-center">
                {([
                  { id: "assembly", icon: <Box className="w-3.5 h-3.5" />, label: "Fabrication Sheet" },
                  { id: "detail",   icon: <Ruler className="w-3.5 h-3.5" />, label: "Part Detail" },
                  { id: "explorer", icon: <Move3d className="w-3.5 h-3.5" />, label: "3D Explorer" },
                ] as { id: MainTab; icon: React.ReactNode; label: string }[]).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewTab === tab.id
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
                <div className="flex-1" />
                {viewTab !== "assembly" && (
                  <div className="flex items-center gap-1">
                    {(["shaded", "wireframe", "flat"] as ViewMode[]).map(m => (
                      <ViewBtn key={m} label={m[0].toUpperCase() + m.slice(1)} active={viewMode === m} onClick={() => setViewMode(m)} />
                    ))}
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                      type="button"
                      onClick={() => setShowGrid(v => !v)}
                      title="Toggle grid"
                      className={`p-1.5 rounded-lg text-[10px] transition-colors ${showGrid ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAxes(v => !v)}
                      title="Toggle axes"
                      className={`p-1.5 rounded-lg transition-colors ${showAxes ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    {viewTab === "detail" && (
                      <button
                        type="button"
                        onClick={() => { setMeasureMode(v => !v); setMeasureResult(null); detailViewerRef.current?.clearMeasure(); }}
                        title="Measure"
                        className={`p-1.5 rounded-lg transition-colors ${measureMode ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ═══════════ TAB: FABRICATION SHEET ═══════════ */}
              {viewTab === "assembly" && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="max-w-[1200px] mx-auto space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Preview matches the downloaded PDF — one A3 page, sheet 1 of 1.
                    </p>
                    <FabricationSheetPreview
                      meshes={meshes}
                      parts={parts}
                      drawingNumber={meta.number}
                      drawingTitle={meta.title}
                      onSelectPart={p => selectPart(p)}
                    />
                  </div>
                </div>
              )}

              {/* ═══════════ TAB: PART DETAIL ═══════════ */}
              {viewTab === "detail" && (
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {!selected ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Select a part from the list.
                    </div>
                  ) : (
                    <>
                      {/* Part info bar */}
                      <div className="shrink-0 border-b border-border bg-card/70 px-4 py-2.5 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ background: partColorCss(selected.meshIndex) }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{selected.name}</p>
                            <p className="text-[10px] text-muted-foreground">{selected.partNo}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <DimBadge label="Length" value={selected.bounds.length} />
                          <DimBadge label="Width"  value={selected.bounds.width} />
                          <DimBadge label="Height" value={selected.bounds.height} />
                        </div>
                        {selectedBom && (
                          <div className="flex gap-2 flex-wrap ml-2">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                              <Tag className="w-2.5 h-2.5" />{selectedBom.description}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {selectedBom.size}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                              {selectedBom.moc}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                              {selectedBom.std} · {selectedBom.pn}
                            </span>
                          </div>
                        )}
                        {measureResult && (
                          <span className="ml-auto text-xs font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                            📏 {measureResult}
                          </span>
                        )}
                      </div>

                      {/* Main detail layout */}
                      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr] gap-0 overflow-hidden">
                        {/* Left: Interactive 3D viewer */}
                        <div className="border-r border-border flex flex-col min-h-0 overflow-hidden">
                          {/* Camera preset bar */}
                          <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mr-1">Camera</span>
                            {(["front", "top", "right", "iso"] as const).map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => detailViewerRef.current?.setCamera(v)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background border border-border hover:border-sky-400 hover:text-sky-600 transition-colors"
                              >
                                {v.toUpperCase()}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => detailViewerRef.current?.fitToView()}
                              className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background border border-border hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center gap-1"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />Fit
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 relative">
                            <StepViewer3D
                              ref={detailViewerRef}
                              meshes={meshes}
                              viewMode={viewMode}
                              showGrid={showGrid}
                              showAxes={showAxes}
                              bgColor={bgColor}
                              hiddenMeshes={detailHiddenMeshes}
                              measureMode={measureMode}
                              onMeasureResult={(dist) => {
                                if (dist !== null) setMeasureResult(`${dist.toFixed(2)} mm`);
                                else setMeasureResult(null);
                              }}
                            />
                            {/* Overlay hint */}
                            <div className="absolute bottom-2 left-2 text-[9px] text-slate-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded-md pointer-events-none">
                              Left drag · Scroll zoom · Right drag pan
                            </div>
                          </div>
                        </div>

                        {/* Right: 2×2 orthographic views */}
                        <div className="grid grid-rows-2 grid-cols-2 min-h-0 overflow-hidden">
                          {ORTHO_VIEWS.map(({ view, label }) => (
                            <div key={view} className="border-b border-r border-border last:border-r-0 flex flex-col min-h-0 overflow-hidden">
                              <div className="shrink-0 bg-slate-800 dark:bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider text-center">
                                {label}
                              </div>
                              <div className="flex-1 min-h-0 bg-white dark:bg-slate-50">
                                <ShadedMeshImage
                                  meshes={meshes}
                                  meshIndices={selectedIndices}
                                  view={view}
                                  width={HD_PART.width}
                                  height={HD_PART.height}
                                  pixelRatio={2}
                                  className="h-full w-full"
                                  alt={`${selected.partNo} ${label}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom: Properties + BOM row */}
                      {selectedBom && (
                        <div className="shrink-0 border-t border-border bg-card/60 px-4 py-2">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />Part Properties
                          </p>
                          <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-x-6 gap-y-1 text-xs">
                            {[
                              { label: "Description", value: selectedBom.description },
                              { label: "Size", value: selectedBom.size },
                              { label: "Material", value: selectedBom.moc },
                              { label: "Standard", value: selectedBom.std },
                              { label: "Pressure", value: selectedBom.pn },
                              { label: "Type", value: selectedBom.type },
                              { label: "Length", value: selectedBom.totalLength },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
                                <span className="font-semibold text-foreground">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ═══════════ TAB: 3D EXPLORER ═══════════ */}
              {viewTab === "explorer" && (
                <div className="flex-1 min-h-0 overflow-hidden flex">
                  {/* Main 3D viewer */}
                  <div className="flex-1 min-w-0 flex flex-col min-h-0 relative">
                    <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mr-1">Camera</span>
                      {(["front", "top", "right", "iso"] as const).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => explorerViewerRef.current?.setCamera(v)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background border border-border hover:border-sky-400 hover:text-sky-600 transition-colors"
                        >
                          {v.toUpperCase()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => explorerViewerRef.current?.fitToView()}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background border border-border hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center gap-1"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />Fit
                      </button>
                      {explorerSelectedIdx !== null && (
                        <>
                          <div className="w-px h-4 bg-border mx-1" />
                          <button
                            type="button"
                            onClick={() => explorerViewerRef.current?.fitToPart([explorerSelectedIdx])}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-100 border border-sky-300 text-sky-700 hover:bg-sky-200 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-2.5 h-2.5" />Focus part
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (explorerPart) selectPart(explorerPart); }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 border border-indigo-300 text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          >
                            <ArrowUpDown className="w-2.5 h-2.5" />Detail view
                          </button>
                        </>
                      )}
                      {explorerSelectedIdx !== null && (
                        <button
                          type="button"
                          onClick={() => setExplorerSelectedIdx(null)}
                          className="text-muted-foreground hover:text-foreground text-[10px] ml-1"
                        >
                          ✕ Deselect
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 relative">
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
                        onPartClick={(idx) => setExplorerSelectedIdx(idx)}
                      />
                      {explorerSelectedIdx === null && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 bg-white/85 dark:bg-slate-900/85 px-3 py-1.5 rounded-xl pointer-events-none shadow-sm border border-border">
                          Click any part to inspect it
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right panel: Part inspector */}
                  <div className="w-[260px] shrink-0 border-l border-border flex flex-col bg-card/80 overflow-hidden">
                    <div className="p-3 border-b border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Part Inspector</p>
                    </div>

                    {explorerPart ? (
                      <div className="flex-1 overflow-y-auto">
                        {/* 3D thumbnail */}
                        <div className="h-36 bg-slate-100 dark:bg-slate-800 relative">
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
                            <p className="font-bold text-sm">{explorerPart.name}</p>
                            <p className="text-xs text-muted-foreground">{explorerPart.partNo}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <DimBadge label="L" value={explorerPart.bounds.length} />
                            <DimBadge label="W" value={explorerPart.bounds.width} />
                            <DimBadge label="H" value={explorerPart.bounds.height} />
                          </div>

                          {explorerBom && (
                            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">BOM Details</p>
                              {[
                                ["Description", explorerBom.description],
                                ["Size", explorerBom.size],
                                ["Material", explorerBom.moc],
                                ["Standard", explorerBom.std],
                                ["Pressure", explorerBom.pn],
                                ["Type", explorerBom.type],
                                ["Length", explorerBom.totalLength],
                              ].map(([l, v]) => (
                                <div key={l} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{l}</span>
                                  <span className="font-semibold text-right truncate max-w-[130px]" title={v}>{v}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Ortho views mini-grid */}
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Orthographic Views</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(["front", "top", "right", "iso"] as const).map(v => (
                                <div key={v} className="rounded-lg border border-border overflow-hidden bg-white">
                                  <div className="bg-slate-700 px-1 py-0.5 text-[7px] font-bold text-white text-center uppercase">
                                    {v}
                                  </div>
                                  <ShadedMeshImage
                                    meshes={meshes}
                                    meshIndices={[explorerPart.meshIndex]}
                                    view={v}
                                    width={240}
                                    height={180}
                                    pixelRatio={1}
                                    className="aspect-[4/3]"
                                    alt={`${explorerPart.partNo} ${v}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => selectPart(explorerPart)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-sm hover:bg-sky-700 transition-colors"
                          >
                            <Ruler className="w-3.5 h-3.5" />
                            Open Part Detail
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Cpu className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">No part selected</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">Click any part in the 3D view to inspect it</p>
                        </div>
                        <div className="w-full rounded-xl bg-muted/50 p-3 text-left">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Assembly Summary</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Parts</span>
                            <span className="font-semibold">{parts.length}</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Meshes</span>
                            <span className="font-semibold">{meshes.length}</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Drawing</span>
                            <span className="font-semibold truncate max-w-[130px]" title={meta.number}>{meta.number}</span>
                          </div>
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
