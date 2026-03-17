import { Layout } from "@/components/Layout";
import {
  Box, Search, Droplets, ChevronDown, FilterX, Upload, X, ArrowLeft, ExternalLink,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { loadStepFile, type MeshData, type TreeNode } from "@/lib/stepLoader";
import type { ViewMode, BgColor, ViewerRef } from "@/components/StepViewer3D";
import MeshesPanel from "@/components/MeshesPanel";
import * as THREE from "three";

const StepViewer3D = lazy(() => import("@/components/StepViewer3D"));

const ETP_SYSTEMS = [
  { id: "all",         label: "All Systems" },
  { id: "etp",         label: "ETP System" },
  { id: "stp",         label: "STP System" },
  { id: "wtp",         label: "WTP / RO System" },
  { id: "cooling",     label: "Cooling Tower" },
  { id: "fire",        label: "Fire Fighting" },
  { id: "hvac",        label: "HVAC" },
  { id: "air",         label: "Compressed Air" },
  { id: "chemical",    label: "Chemical Dosing" },
  { id: "instruments", label: "Instruments" },
  { id: "electrical",  label: "Electrical" },
  { id: "utility",     label: "Utility" },
];

type ModelEntry = {
  id: string;
  projectId: number;
  projectName: string;
  erpnextName: string;
  system: string;
  label: string;
};

type Status = "idle" | "loading" | "loaded" | "error";

function buildModelEntries(projects: any[]): ModelEntry[] {
  const entries: ModelEntry[] = [];
  ETP_SYSTEMS.filter(s => s.id !== "all").forEach(sys => {
    projects.forEach(p => {
      entries.push({
        id: `${p.id}-${sys.id}`,
        projectId: p.id,
        projectName: p.name,
        erpnextName: (p as any).erpnextName || "",
        system: sys.id,
        label: sys.label,
      });
    });
  });
  return entries;
}

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
          ? "bg-transparent border-transparent text-red-400 hover:bg-red-500/20 hover:border-red-500/40"
          : "bg-transparent border-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() { return <div className="w-full h-px bg-white/10 my-1" />; }
function Section({ label }: { label: string }) {
  return <div className="text-[9px] text-gray-500 uppercase tracking-widest px-1 mt-2 mb-0.5 select-none">{label}</div>;
}

function ModelViewer({ entry, onClose }: { entry: ModelEntry; onClose: () => void }) {
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
      const result = await loadStepFile(buffer, msg => setProgress(msg));
      setMeshes(result.meshes);
      setTreeRoot(result.root);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setStatus("error");
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

  const handleFitToPart = useCallback((indices: number[]) => viewerRef.current?.fitToPart(indices), []);

  const clearMeasure = useCallback(() => {
    viewerRef.current?.clearMeasure();
    setMeasureResult(null);
  }, []);

  const handleMeasureResult = useCallback((
    dist: number | null, p1: THREE.Vector3 | null, p2: THREE.Vector3 | null
  ) => {
    if (dist !== null && p1 && p2) setMeasureResult({ dist, p1, p2 });
    else setMeasureResult(null);
  }, []);

  const isDark = bgColor === "dark" || bgColor === "navy";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Modal header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-blue-700 font-mono">{entry.erpnextName}</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{entry.projectName}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-semibold flex-shrink-0">
            {entry.label}
          </span>
        </div>
        {status === "loaded" && (
          <button
            onClick={() => { setStatus("idle"); setMeshes([]); setTreeRoot(null); setFileName(""); setMeasureResult(null); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Load different file
          </button>
        )}
        <button onClick={onClose} className={`${status === "loaded" ? "" : "ml-auto"} p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors`}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {status === "idle" || status === "error" ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-6 w-full max-w-lg px-6">
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all
                  ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"}`}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">Upload STEP File</p>
                  <p className="text-sm text-gray-500 mt-1">
                    for <span className="font-semibold font-mono text-blue-700">{entry.erpnextName}</span> · {entry.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Drag & drop or click to browse · .STEP / .STP</p>
                </div>
                <button
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4" /> Browse File
                </button>
                <input ref={fileInputRef} type="file" accept=".step,.stp" className="hidden" onChange={handleFileChange} />
              </div>
              {status === "error" && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : status === "loading" ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
            <div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-12 w-12" />
            <p className="text-sm text-gray-600 font-medium">{progress}</p>
            <p className="text-xs text-gray-400">{fileName}</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Left toolbar */}
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
              <ToolBtn title="Front"  onClick={() => viewerRef.current?.setCamera("front")}>F</ToolBtn>
              <ToolBtn title="Top"    onClick={() => viewerRef.current?.setCamera("top")}>T</ToolBtn>
              <ToolBtn title="Right"  onClick={() => viewerRef.current?.setCamera("right")}>R</ToolBtn>
              <ToolBtn title="Fit to view" onClick={() => viewerRef.current?.fitToView()}>
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <polyline points="2,6 2,2 6,2" /><polyline points="14,2 18,2 18,6" />
                  <polyline points="18,14 18,18 14,18" /><polyline points="6,18 2,18 2,14" />
                </svg>
              </ToolBtn>

              <Divider />
              <Section label="BG" />
              {(["dark","navy","light","white"] as BgColor[]).map(c => (
                <ToolBtn key={c} title={c} active={bgColor === c} onClick={() => setBgColor(c)}>
                  <div className={`w-4 h-4 rounded-full border ${
                    c === "dark"  ? "bg-[#0f0f1a] border-gray-600" :
                    c === "navy"  ? "bg-[#1a1a2e] border-blue-800" :
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
                  <line x1="3" y1="17" x2="17" y2="3" />
                  <line x1="3" y1="17" x2="6" y2="14" /><line x1="17" y1="3" x2="14" y2="6" />
                  <circle cx="3" cy="17" r="1.5" fill="currentColor" /><circle cx="17" cy="3" r="1.5" fill="currentColor" />
                </svg>
              </ToolBtn>
            </div>

            {/* 3D viewport */}
            <main className={`flex-1 relative overflow-hidden ${isDark ? "bg-[#0f0f1a]" : "bg-[#dde3ee]"}`}>
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-10 w-10" />
                </div>
              }>
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

              {/* File badge */}
              <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 pointer-events-none ${isDark ? "bg-black/50 text-gray-300" : "bg-white/80 text-gray-600"}`}>
                <Box className="w-3.5 h-3.5" /> {fileName}
              </div>

              {/* Measure result */}
              {measureResult && (
                <div className="absolute top-3 right-3 bg-yellow-500/90 text-black rounded-xl px-4 py-3 text-sm shadow-lg flex items-center gap-3">
                  <div>
                    <div className="text-[10px] text-yellow-900 uppercase tracking-widest mb-0.5">Distance</div>
                    <div className="text-xl font-bold">{measureResult.dist.toFixed(4)} <span className="text-sm font-normal">units</span></div>
                  </div>
                  <button onClick={clearMeasure} className="ml-2 text-yellow-900 hover:text-black font-bold">✕</button>
                </div>
              )}

              {/* Controls hint */}
              <div className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 text-[10px] pointer-events-none ${isDark ? "bg-black/40 text-gray-400" : "bg-black/20 text-gray-600"}`}>
                🖱 Left: Rotate · Right: Pan · Scroll: Zoom
              </div>
            </main>

            {/* Right panel */}
            <MeshesPanel
              root={treeRoot}
              totalMeshes={meshes.length}
              hiddenMeshes={hiddenMeshes}
              onToggleMesh={handleToggleMesh}
              onFitToPart={handleFitToPart}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MechanicalViewer() {
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [projectOpen, setProjectOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<ModelEntry | null>(null);

  const { data: projects = [], isLoading } = useListProjects();

  const modelEntries = useMemo(() => buildModelEntries(projects), [projects]);

  const filteredEntries = useMemo(() => {
    return modelEntries.filter(e => {
      const matchProject = selectedProject === "all" || String(e.projectId) === selectedProject;
      const matchSystem  = selectedSystem  === "all" || e.system === selectedSystem;
      return matchProject && matchSystem;
    });
  }, [modelEntries, selectedProject, selectedSystem]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      ((p as any).erpnextName || "").toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const selectedProjectLabel = selectedProject === "all"
    ? "All Projects"
    : (projects.find((p: any) => String(p.id) === selectedProject) as any)?.name ?? "All Projects";

  const selectedSystemLabel = ETP_SYSTEMS.find(s => s.id === selectedSystem)?.label ?? "All Systems";
  const hasFilters = selectedProject !== "all" || selectedSystem !== "all";

  function clearFilters() {
    setSelectedProject("all");
    setSelectedSystem("all");
    setProjectSearch("");
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Box className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mechanical 3D View</h1>
            <p className="text-sm text-gray-500">Filter by project and system to view 3D models</p>
          </div>
          <button
            onClick={() => setOpenEntry({ id: "manual", projectId: 0, projectName: "", erpnextName: "Manual Upload", system: "manual", label: "Manual Upload" })}
            title="Upload STEP file"
            className="ml-auto flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Project dropdown */}
          <div className="relative">
            <button
              onClick={() => setProjectOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:shadow-sm transition-all min-w-[180px] justify-between"
            >
              <span className="truncate max-w-[160px]">{selectedProjectLabel}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
            {projectOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedProject("all"); setProjectOpen(false); setProjectSearch(""); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${selectedProject === "all" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                  >
                    All Projects
                  </button>
                  {isLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>
                  ) : (
                    filteredProjects.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(String(p.id)); setProjectOpen(false); setProjectSearch(""); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${String(p.id) === selectedProject ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                      >
                        <span className="block text-[10px] font-mono text-blue-600">{(p as any).erpnextName || ""}</span>
                        <span>{p.name}</span>
                      </button>
                    ))
                  )}
                  {!isLoading && filteredProjects.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">No projects found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* System dropdown */}
          <div className="relative">
            <select
              value={selectedSystem}
              onChange={e => setSelectedSystem(e.target.value)}
              className="appearance-none flex items-center gap-2 px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              {ETP_SYSTEMS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 border border-dashed border-gray-300 hover:border-red-300 rounded-lg transition-all"
            >
              <FilterX className="w-4 h-4" /> Clear filters
            </button>
          )}

          <span className="ml-auto text-sm text-gray-400">
            {filteredEntries.length} model{filteredEntries.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedProject !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Box className="w-3 h-3" /> {selectedProjectLabel}
              </span>
            )}
            {selectedSystem !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-semibold">
                <Droplets className="w-3 h-3" /> {selectedSystemLabel}
              </span>
            )}
          </div>
        )}

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Box className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No models match your filters</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the project or system selection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-blue-700 font-mono mb-0.5 truncate">
                      {entry.erpnextName || "—"}
                    </span>
                    <span className="block text-sm font-semibold text-gray-800 truncate">
                      {entry.projectName}
                    </span>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-semibold">
                    {entry.label}
                  </span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Open 3D Model
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close project dropdown on outside click */}
      {projectOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProjectOpen(false)} />
      )}

      {/* Full-screen viewer modal */}
      {openEntry && (
        <ModelViewer entry={openEntry} onClose={() => setOpenEntry(null)} />
      )}
    </Layout>
  );
}
