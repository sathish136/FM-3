import { Layout } from "@/components/Layout";
import {
  Box, ChevronRight, Search, ArrowLeft,
  Droplets, Waves, Wind, Flame, Thermometer,
  Gauge, FlaskConical, Cpu, Zap, Settings2,
  Upload, FolderOpen,
} from "lucide-react";
import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { loadStepFile, type MeshData, type TreeNode } from "@/lib/stepLoader";
import type { ViewMode, BgColor, ViewerRef } from "@/components/StepViewer3D";
import MeshesPanel from "@/components/MeshesPanel";
import * as THREE from "three";

const StepViewer3D = lazy(() => import("@/components/StepViewer3D"));

const SYSTEMS = [
  { id: "etp",       label: "ETP System",        icon: Droplets,    color: "text-cyan-600",    bg: "bg-cyan-50",    border: "border-cyan-200" },
  { id: "stp",       label: "STP System",        icon: Waves,       color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
  { id: "wtp",       label: "WTP / RO System",   icon: Droplets,    color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200" },
  { id: "cooling",   label: "Cooling Tower",     icon: Wind,        color: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200" },
  { id: "fire",      label: "Fire Fighting",     icon: Flame,       color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200" },
  { id: "hvac",      label: "HVAC",              icon: Thermometer, color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200" },
  { id: "air",       label: "Compressed Air",    icon: Gauge,       color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200" },
  { id: "chemical",  label: "Chemical Dosing",   icon: FlaskConical,color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "instruments",label: "Instruments",      icon: Cpu,         color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200" },
  { id: "electrical",label: "Electrical",        icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "utility",   label: "Utility",           icon: Settings2,   color: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200" },
];

type Project = { id: number; name: string; erpnextName: string };
type System  = typeof SYSTEMS[number];
type Status  = "idle" | "loading" | "loaded" | "error";

function ToolBtn({
  active, title, onClick, children, danger,
}: {
  active?: boolean; title: string; onClick: () => void; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-md text-xs transition-colors border
        ${active
          ? "bg-blue-600 border-blue-500 text-white"
          : danger
          ? "bg-red-500/10 border-red-400/30 text-red-400 hover:bg-red-500/25 hover:border-red-400/60"
          : "bg-white/10 border-white/15 text-gray-200 hover:bg-white/20 hover:text-white hover:border-white/30"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() { return <div className="w-full h-px bg-white/10 my-1" />; }
function Section({ label }: { label: string }) {
  return <div className="text-[9px] text-gray-400 uppercase tracking-widest px-1 mt-2 mb-0.5 select-none">{label}</div>;
}

function ManualUploadViewer() {
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [hiddenMeshes, setHiddenMeshes] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<ViewerRef>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [bgColor, setBgColor] = useState<BgColor>("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<{
    dist: number; p1: THREE.Vector3; p2: THREE.Vector3;
  } | null>(null);

  const processFile = useCallback(async (file: File) => {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext !== "step" && ext !== "stp") {
      setError("Please upload a .STEP or .STP file.");
      setStatus("error");
      return;
    }
    setFileName(name);
    setStatus("loading");
    setError("");
    setProgress("Reading file...");
    setMeshes([]);
    setTreeRoot(null);
    setHiddenMeshes(new Set());
    try {
      const buffer = await file.arrayBuffer();
      const result = await loadStepFile(buffer, (msg) => setProgress(msg));
      setMeshes(result.meshes);
      setTreeRoot(result.root);
      setStatus("loaded");
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setStatus("error");
      setProgress("");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  const handleToggleMesh = useCallback((indices: number[], currentlyVisible: boolean) => {
    setHiddenMeshes(prev => {
      const next = new Set(prev);
      indices.forEach(i => currentlyVisible ? next.add(i) : next.delete(i));
      return next;
    });
  }, []);

  const handleFitToPart = useCallback((indices: number[]) => {
    viewerRef.current?.fitToPart(indices);
  }, []);

  const clearMeasure = useCallback(() => {
    viewerRef.current?.clearMeasure();
    setMeasureResult(null);
  }, []);

  const handleMeasureResult = useCallback((
    dist: number | null,
    p1: THREE.Vector3 | null,
    p2: THREE.Vector3 | null,
  ) => {
    if (dist !== null && p1 && p2) setMeasureResult({ dist, p1, p2 });
    else setMeasureResult(null);
  }, []);

  const isDark = bgColor === "dark" || bgColor === "navy";

  if (status === "idle" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-6">
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
            ${isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
            }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">Upload STEP File</p>
            <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">Supports .STEP and .STP files</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <FolderOpen className="w-4 h-4" /> Browse File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {status === "error" && (
          <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4">
        <div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-12 w-12" />
        <p className="text-sm text-gray-500">{progress}</p>
        <p className="text-xs text-gray-400">{fileName}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[500px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* ─── Left Toolbar ─── */}
      <div className={`w-12 flex flex-col items-center py-3 gap-1 flex-shrink-0 ${isDark ? "bg-[#0f0f1a] border-r border-white/10" : "bg-white border-r border-gray-200"}`}>
        <Section label="View" />
        <ToolBtn title="Shaded" active={viewMode === "shaded"} onClick={() => setViewMode("shaded")}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><circle cx="10" cy="10" r="7" /></svg>
        </ToolBtn>
        <ToolBtn title="Wireframe" active={viewMode === "wireframe"} onClick={() => setViewMode("wireframe")}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7" /></svg>
        </ToolBtn>
        <ToolBtn title="Flat" active={viewMode === "flat"} onClick={() => setViewMode("flat")}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><rect x="3" y="3" width="14" height="14" rx="2" /></svg>
        </ToolBtn>
        <ToolBtn title="Edges" active={viewMode === "edges"} onClick={() => setViewMode("edges")}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2" /></svg>
        </ToolBtn>

        <Divider />
        <Section label="Cam" />
        <ToolBtn title="Isometric" onClick={() => viewerRef.current?.setCamera("iso")}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M10 3L3 7v6l7 4 7-4V7L10 3z" /><line x1="10" y1="3" x2="10" y2="17" /><line x1="3" y1="7" x2="17" y2="7" />
          </svg>
        </ToolBtn>
        <ToolBtn title="Front" onClick={() => viewerRef.current?.setCamera("front")}>F</ToolBtn>
        <ToolBtn title="Top" onClick={() => viewerRef.current?.setCamera("top")}>T</ToolBtn>
        <ToolBtn title="Right" onClick={() => viewerRef.current?.setCamera("right")}>R</ToolBtn>
        <ToolBtn title="Fit to view" onClick={() => viewerRef.current?.fitToView()}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
            <polyline points="2,6 2,2 6,2" /><polyline points="14,2 18,2 18,6" /><polyline points="18,14 18,18 14,18" /><polyline points="6,18 2,18 2,14" />
          </svg>
        </ToolBtn>

        <Divider />
        <Section label="BG" />
        {(["dark","navy","light","white"] as BgColor[]).map(c => (
          <ToolBtn key={c} title={c} active={bgColor === c} onClick={() => setBgColor(c)}>
            <div className={`w-4 h-4 rounded-full border ${
              c === "dark" ? "bg-[#0f0f1a] border-gray-600" :
              c === "navy" ? "bg-[#1a1a2e] border-blue-800" :
              c === "light" ? "bg-[#dde3ee] border-gray-400" :
              "bg-white border-gray-400"
            }`} />
          </ToolBtn>
        ))}

        <Divider />
        <Section label="Opts" />
        <ToolBtn title="Grid" active={showGrid} onClick={() => setShowGrid(v => !v)}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
            <line x1="0" y1="7" x2="20" y2="7" /><line x1="0" y1="13" x2="20" y2="13" />
            <line x1="7" y1="0" x2="7" y2="20" /><line x1="13" y1="0" x2="13" y2="20" />
          </svg>
        </ToolBtn>
        <ToolBtn title="Axes" active={showAxes} onClick={() => setShowAxes(v => !v)}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="16" x2="16" y2="4" stroke="blue" />
            <line x1="4" y1="16" x2="16" y2="16" stroke="red" />
            <line x1="4" y1="16" x2="4" y2="4" stroke="green" />
          </svg>
        </ToolBtn>
        <ToolBtn title="Measure" active={measureMode} onClick={() => { setMeasureMode(v => !v); if (measureMode) clearMeasure(); }}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
            <line x1="3" y1="17" x2="17" y2="3" /><line x1="3" y1="17" x2="6" y2="14" /><line x1="17" y1="3" x2="14" y2="6" />
            <circle cx="3" cy="17" r="1.5" fill="currentColor" /><circle cx="17" cy="3" r="1.5" fill="currentColor" />
          </svg>
        </ToolBtn>

        <Divider />
        <ToolBtn
          title="Load new file"
          danger
          onClick={() => { setStatus("idle"); setMeshes([]); setTreeRoot(null); setFileName(""); setMeasureResult(null); }}
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><polyline points="12,3 12,8 17,8" />
            <line x1="8" y1="13" x2="12" y2="9" /><line x1="12" y1="13" x2="8" y2="9" />
          </svg>
        </ToolBtn>
      </div>

      {/* ─── 3D Viewport ─── */}
      <main className={`flex-1 relative overflow-hidden ${isDark ? "bg-[#0f0f1a]" : "bg-[#dde3ee]"}`}>
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-10 w-10" /></div>}>
          <StepViewer3D
            ref={viewerRef}
            meshes={meshes}
            viewMode={viewMode}
            showGrid={showGrid}
            showAxes={showAxes}
            bgColor={bgColor}
            hiddenMeshes={hiddenMeshes}
            measureMode={measureMode}
            onMeasureResult={handleMeasureResult}
          />
        </Suspense>

        {/* File name badge */}
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 pointer-events-none ${isDark ? "bg-black/50 text-gray-300" : "bg-white/80 text-gray-600"}`}>
          <Box className="w-3.5 h-3.5" />
          {fileName}
        </div>

        {/* Measure result */}
        {measureResult && (
          <div className="absolute top-3 right-3 bg-yellow-500/90 text-black rounded-xl px-4 py-3 text-sm shadow-lg flex items-center gap-3">
            <div>
              <div className="text-[10px] text-yellow-900 uppercase tracking-widest mb-0.5">Distance</div>
              <div className="text-xl font-bold">{measureResult.dist.toFixed(4)} <span className="text-sm font-normal">units</span></div>
            </div>
            <button onClick={clearMeasure} className="ml-2 text-yellow-900 hover:text-black transition-colors font-bold">✕</button>
          </div>
        )}

        {/* Controls hint */}
        <div className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 text-[10px] space-y-0.5 pointer-events-none ${isDark ? "bg-black/40 text-gray-400" : "bg-black/20 text-gray-600"}`}>
          <div>🖱 Left: Rotate · Right: Pan · Scroll: Zoom</div>
        </div>
      </main>

      {/* ─── Right Meshes Panel ─── */}
      <MeshesPanel
        root={treeRoot}
        totalMeshes={meshes.length}
        hiddenMeshes={hiddenMeshes}
        onToggleMesh={handleToggleMesh}
        onFitToPart={handleFitToPart}
      />
    </div>
  );
}

function ProjectList({ onSelect }: { onSelect: (p: Project) => void }) {
  const [search, setSearch] = useState("");
  const { data: projects = [], isLoading } = useListProjects();

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).erpnextName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect({ id: p.id, name: p.name, erpnextName: (p as any).erpnextName || "" })}
              className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <Box className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold text-blue-700 font-mono mb-0.5">
                  {(p as any).erpnextName || "—"}
                </span>
                <span className="block text-sm font-medium text-gray-800 truncate">{p.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No projects found</p>
      )}
    </div>
  );
}

function SystemList({
  project, onBack, onSelect,
}: {
  project: Project; onBack: () => void; onSelect: (s: System) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Projects
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-sm font-semibold text-gray-700 font-mono">{project.erpnextName}</span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">Select a system to view its 3D models</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SYSTEMS.map(sys => {
          const Icon = sys.icon;
          return (
            <button
              key={sys.id}
              onClick={() => onSelect(sys)}
              className={`group flex flex-col items-center gap-3 p-5 bg-white border ${sys.border} rounded-xl hover:shadow-md transition-all text-center`}
            >
              <div className={`w-11 h-11 rounded-xl ${sys.bg} ${sys.border} border flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${sys.color}`} />
              </div>
              <span className="text-sm font-semibold text-gray-800 leading-tight">{sys.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModelView({
  project, system, onBackToProject, onBackToProjects,
}: {
  project: Project; system: System; onBackToProject: () => void; onBackToProjects: () => void;
}) {
  const [viewerMeshes, setViewerMeshes] = useState<MeshData[]>([]);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [hiddenMeshes, setHiddenMeshes] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<ViewerRef>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [bgColor, setBgColor] = useState<BgColor>("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<{ dist: number; p1: THREE.Vector3; p2: THREE.Vector3 } | null>(null);

  const processFile = useCallback(async (file: File) => {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext !== "step" && ext !== "stp") {
      setError("Please upload a .STEP or .STP file.");
      setStatus("error");
      return;
    }
    setFileName(name);
    setStatus("loading");
    setError("");
    setProgress("Reading file...");
    setViewerMeshes([]);
    setTreeRoot(null);
    setHiddenMeshes(new Set());
    try {
      const buffer = await file.arrayBuffer();
      const result = await loadStepFile(buffer, (msg) => setProgress(msg));
      setViewerMeshes(result.meshes);
      setTreeRoot(result.root);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setStatus("error");
    }
  }, []);

  const handleToggleMesh = useCallback((indices: number[], currentlyVisible: boolean) => {
    setHiddenMeshes(prev => {
      const next = new Set(prev);
      indices.forEach(i => currentlyVisible ? next.add(i) : next.delete(i));
      return next;
    });
  }, []);

  const handleFitToPart = useCallback((indices: number[]) => viewerRef.current?.fitToPart(indices), []);
  const clearMeasure = useCallback(() => { viewerRef.current?.clearMeasure(); setMeasureResult(null); }, []);
  const handleMeasureResult = useCallback((dist: number | null, p1: THREE.Vector3 | null, p2: THREE.Vector3 | null) => {
    if (dist !== null && p1 && p2) setMeasureResult({ dist, p1, p2 });
    else setMeasureResult(null);
  }, []);

  const Icon = system.icon;
  const isDark = bgColor === "dark" || bgColor === "navy";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBackToProjects} className="text-gray-400 hover:text-gray-700 transition-colors">All Projects</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <button onClick={onBackToProject} className="text-gray-500 hover:text-gray-800 font-mono font-semibold transition-colors">{project.erpnextName}</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-gray-800 font-semibold">{system.label}</span>
      </div>

      {/* Viewer or Upload */}
      {status === "idle" || status === "error" ? (
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed min-h-[480px] flex flex-col items-center justify-center gap-5 cursor-pointer transition-all
            ${isDragging ? "border-blue-400 bg-blue-50" : `border-dashed ${system.border} ${system.bg} hover:border-blue-400`}`}
        >
          <div className={`w-16 h-16 rounded-2xl bg-white border ${system.border} flex items-center justify-center shadow-sm`}>
            <Icon className={`w-8 h-8 ${system.color}`} />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">{system.label}</p>
            <p className="text-sm text-gray-500 mt-1">
              {project.erpnextName} — {project.name}
            </p>
            <p className="text-xs text-gray-400 mt-3">Drag & drop a .STEP or .STP file here, or click to browse</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 shadow text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <Upload className="w-4 h-4" /> Upload STEP File
          </button>
          <input ref={fileInputRef} type="file" accept=".step,.stp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
          {status === "error" && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : status === "loading" ? (
        <div className="rounded-2xl border min-h-[480px] flex flex-col items-center justify-center gap-4 bg-gray-50">
          <div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-12 w-12" />
          <p className="text-sm text-gray-500">{progress}</p>
          <p className="text-xs text-gray-400">{fileName}</p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-180px)] min-h-[480px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {/* Toolbar */}
          <div className={`w-12 flex flex-col items-center py-3 gap-1 flex-shrink-0 ${isDark ? "bg-[#0f0f1a] border-r border-white/10" : "bg-white border-r border-gray-200"}`}>
            <Section label="View" />
            <ToolBtn title="Shaded" active={viewMode === "shaded"} onClick={() => setViewMode("shaded")}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><circle cx="10" cy="10" r="7" /></svg>
            </ToolBtn>
            <ToolBtn title="Wireframe" active={viewMode === "wireframe"} onClick={() => setViewMode("wireframe")}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7" /></svg>
            </ToolBtn>
            <ToolBtn title="Flat" active={viewMode === "flat"} onClick={() => setViewMode("flat")}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><rect x="3" y="3" width="14" height="14" rx="2" /></svg>
            </ToolBtn>
            <ToolBtn title="Edges" active={viewMode === "edges"} onClick={() => setViewMode("edges")}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2" /></svg>
            </ToolBtn>

            <Divider />
            <Section label="Cam" />
            <ToolBtn title="Isometric" onClick={() => viewerRef.current?.setCamera("iso")}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M10 3L3 7v6l7 4 7-4V7L10 3z" /><line x1="10" y1="3" x2="10" y2="17" /><line x1="3" y1="7" x2="17" y2="7" />
              </svg>
            </ToolBtn>
            <ToolBtn title="Front" onClick={() => viewerRef.current?.setCamera("front")}>F</ToolBtn>
            <ToolBtn title="Top" onClick={() => viewerRef.current?.setCamera("top")}>T</ToolBtn>
            <ToolBtn title="Right" onClick={() => viewerRef.current?.setCamera("right")}>R</ToolBtn>
            <ToolBtn title="Fit to view" onClick={() => viewerRef.current?.fitToView()}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
                <polyline points="2,6 2,2 6,2" /><polyline points="14,2 18,2 18,6" /><polyline points="18,14 18,18 14,18" /><polyline points="6,18 2,18 2,14" />
              </svg>
            </ToolBtn>

            <Divider />
            <Section label="BG" />
            {(["dark","navy","light","white"] as BgColor[]).map(c => (
              <ToolBtn key={c} title={c} active={bgColor === c} onClick={() => setBgColor(c)}>
                <div className={`w-4 h-4 rounded-full border ${c === "dark" ? "bg-[#0f0f1a] border-gray-600" : c === "navy" ? "bg-[#1a1a2e] border-blue-800" : c === "light" ? "bg-[#dde3ee] border-gray-400" : "bg-white border-gray-400"}`} />
              </ToolBtn>
            ))}

            <Divider />
            <Section label="Opts" />
            <ToolBtn title="Grid" active={showGrid} onClick={() => setShowGrid(v => !v)}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
                <line x1="0" y1="7" x2="20" y2="7" /><line x1="0" y1="13" x2="20" y2="13" />
                <line x1="7" y1="0" x2="7" y2="20" /><line x1="13" y1="0" x2="13" y2="20" />
              </svg>
            </ToolBtn>
            <ToolBtn title="Axes" active={showAxes} onClick={() => setShowAxes(v => !v)}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="4" y1="16" x2="16" y2="4" stroke="blue" />
                <line x1="4" y1="16" x2="16" y2="16" stroke="red" />
                <line x1="4" y1="16" x2="4" y2="4" stroke="green" />
              </svg>
            </ToolBtn>
            <ToolBtn title="Measure" active={measureMode} onClick={() => { setMeasureMode(v => !v); if (measureMode) clearMeasure(); }}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
                <line x1="3" y1="17" x2="17" y2="3" /><line x1="3" y1="17" x2="6" y2="14" /><line x1="17" y1="3" x2="14" y2="6" />
                <circle cx="3" cy="17" r="1.5" fill="currentColor" /><circle cx="17" cy="3" r="1.5" fill="currentColor" />
              </svg>
            </ToolBtn>

            <Divider />
            <ToolBtn title="Load new file" danger onClick={() => { setStatus("idle"); setViewerMeshes([]); setTreeRoot(null); setFileName(""); setMeasureResult(null); }}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><polyline points="12,3 12,8 17,8" />
                <line x1="8" y1="13" x2="12" y2="9" /><line x1="12" y1="13" x2="8" y2="9" />
              </svg>
            </ToolBtn>
          </div>

          {/* Viewport */}
          <main className={`flex-1 relative overflow-hidden ${isDark ? "bg-[#0f0f1a]" : "bg-[#dde3ee]"}`}>
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-10 w-10" /></div>}>
              <StepViewer3D
                ref={viewerRef}
                meshes={viewerMeshes}
                viewMode={viewMode}
                showGrid={showGrid}
                showAxes={showAxes}
                bgColor={bgColor}
                hiddenMeshes={hiddenMeshes}
                measureMode={measureMode}
                onMeasureResult={handleMeasureResult}
              />
            </Suspense>

            <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 pointer-events-none ${isDark ? "bg-black/50 text-gray-300" : "bg-white/80 text-gray-600"}`}>
              <Icon className={`w-3.5 h-3.5 ${system.color}`} /> {fileName || system.label}
            </div>

            {measureResult && (
              <div className="absolute top-3 right-3 bg-yellow-500/90 text-black rounded-xl px-4 py-3 text-sm shadow-lg flex items-center gap-3">
                <div>
                  <div className="text-[10px] text-yellow-900 uppercase tracking-widest mb-0.5">Distance</div>
                  <div className="text-xl font-bold">{measureResult.dist.toFixed(4)} <span className="text-sm font-normal">units</span></div>
                </div>
                <button onClick={clearMeasure} className="ml-2 text-yellow-900 hover:text-black font-bold">✕</button>
              </div>
            )}

            <div className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 text-[10px] space-y-0.5 pointer-events-none ${isDark ? "bg-black/40 text-gray-400" : "bg-black/20 text-gray-600"}`}>
              <div>🖱 Left: Rotate · Right: Pan · Scroll: Zoom</div>
            </div>
          </main>

          <MeshesPanel
            root={treeRoot}
            totalMeshes={viewerMeshes.length}
            hiddenMeshes={hiddenMeshes}
            onToggleMesh={handleToggleMesh}
            onFitToPart={handleFitToPart}
          />
        </div>
      )}
    </div>
  );
}

export default function ViewerOptions() {
  const [activeTab, setActiveTab] = useState<"browse" | "upload">("browse");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);

  return (
    <Layout>
      <div className="p-6 max-w-6xl space-y-5">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Box className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">3D Viewer</h1>
            <p className="text-sm text-gray-500">Browse project models or upload your own STEP file</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "browse" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FolderOpen className="w-4 h-4" /> Browse by Project
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "upload" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload className="w-4 h-4" /> Manual Upload
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "upload" ? (
          <ManualUploadViewer />
        ) : (
          <>
            {!selectedProject && (
              <ProjectList onSelect={p => { setSelectedProject(p); setSelectedSystem(null); }} />
            )}
            {selectedProject && !selectedSystem && (
              <SystemList
                project={selectedProject}
                onBack={() => setSelectedProject(null)}
                onSelect={setSelectedSystem}
              />
            )}
            {selectedProject && selectedSystem && (
              <ModelView
                project={selectedProject}
                system={selectedSystem}
                onBackToProject={() => setSelectedSystem(null)}
                onBackToProjects={() => { setSelectedProject(null); setSelectedSystem(null); }}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
