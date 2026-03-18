import { Layout } from "@/components/Layout";
import {
  Box, FolderOpen, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, Cpu,
  Eye, EyeOff, RotateCcw, Maximize2, Grid3X3,
  Axis3D, ChevronDown, FilterX,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { loadStepFile, type MeshData, type TreeNode } from "@/lib/stepLoader";
import type { ViewMode, BgColor, ViewerRef } from "@/components/StepViewer3D";
import MeshesPanel from "@/components/MeshesPanel";

const StepViewer3D = lazy(() => import("@/components/StepViewer3D"));

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Design3DRecord {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  system_name: string;
  attach: string | null;
  modified: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function proxyUrl(attach: string) {
  return `${BASE}/api/file-proxy?url=${encodeURIComponent(attach)}`;
}

function fileName(attach: string) {
  return attach.split("/").pop() || attach;
}

type LoadStatus = "idle" | "loading" | "loaded" | "error";

function ToolBtn({
  active, title, onClick, children,
}: {
  active?: boolean; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-md text-xs transition-colors border
        ${active
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-transparent border-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10"
        }`}
    >
      {children}
    </button>
  );
}

function ModelViewer({
  record,
  filtered,
  currentIndex,
  onClose,
  onNavigate,
}: {
  record: Design3DRecord;
  filtered: Design3DRecord[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [hiddenMeshes, setHiddenMeshes] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [bgColor, setBgColor] = useState<BgColor>("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  const viewerRef = useRef<ViewerRef>(null);

  const loadFromUrl = useCallback(async (attachUrl: string) => {
    setStatus("loading");
    setProgress("Fetching file from server…");
    setMeshes([]);
    setTreeRoot(null);
    setHiddenMeshes(new Set());
    setError("");
    try {
      const res = await fetch(proxyUrl(attachUrl));
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setProgress("Reading file…");
      const buffer = await res.arrayBuffer();
      const result = await loadStepFile(buffer, msg => setProgress(msg));
      setMeshes(result.meshes);
      setTreeRoot(result.root);
      setStatus("loaded");
    } catch (e: any) {
      setError(e.message || "Failed to load model");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (record.attach) {
      loadFromUrl(record.attach);
    } else {
      setStatus("idle");
    }
  }, [record.name, record.attach]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < filtered.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, filtered.length, onClose, onNavigate]);

  const toggleMesh = useCallback((indices: number[], hidden: boolean) => {
    setHiddenMeshes(prev => {
      const next = new Set(prev);
      if (hidden) {
        indices.forEach(i => next.add(i));
      } else {
        indices.forEach(i => next.delete(i));
      }
      return next;
    });
  }, []);

  const BG_OPTIONS: { key: BgColor; label: string; cls: string }[] = [
    { key: "dark", label: "Dark", cls: "bg-gray-800" },
    { key: "navy", label: "Navy", cls: "bg-blue-950" },
    { key: "white", label: "White", cls: "bg-white" },
    { key: "light", label: "Light", cls: "bg-gray-200" },
  ];

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: "shaded", label: "Shaded" },
    { key: "wireframe", label: "Wire" },
    { key: "flat", label: "Flat" },
    { key: "edges", label: "Edges" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" /> Close
        </button>

        <div className="h-5 w-px bg-gray-700" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{record.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {record.project_name || record.project}
            {record.revision ? ` · Rev ${record.revision}` : ""}
            {record.system_name ? ` · ${record.system_name}` : ""}
            {record.attach ? ` · ${fileName(record.attach)}` : ""}
          </p>
        </div>

        {/* Record navigator */}
        {filtered.length > 1 && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <span className="text-xs text-gray-600 mr-1">Record</span>
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-16 text-center">{currentIndex + 1} / {filtered.length}</span>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === filtered.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-3 gap-1 flex-shrink-0">
          <ToolBtn title="Fit to view" onClick={() => viewerRef.current?.fitToView()}>
            <RotateCcw className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn title="Isometric view" onClick={() => viewerRef.current?.setCamera("iso")}>
            <Maximize2 className="w-4 h-4" />
          </ToolBtn>
          <div className="w-6 h-px bg-gray-700 my-1" />
          <ToolBtn title="Toggle grid" active={showGrid} onClick={() => setShowGrid(s => !s)}>
            <Grid3X3 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn title="Toggle axes" active={showAxes} onClick={() => setShowAxes(s => !s)}>
            <Axis3D className="w-4 h-4" />
          </ToolBtn>
          <div className="w-6 h-px bg-gray-700 my-1" />
          {VIEW_MODES.map(m => (
            <ToolBtn key={m.key} title={m.label} active={viewMode === m.key} onClick={() => setViewMode(m.key)}>
              <span className="text-[9px] font-bold uppercase">{m.label.slice(0, 2)}</span>
            </ToolBtn>
          ))}
          <div className="w-6 h-px bg-gray-700 my-1" />
          {BG_OPTIONS.map(b => (
            <button
              key={b.key}
              title={`Background: ${b.label}`}
              onClick={() => setBgColor(b.key)}
              className={`w-6 h-6 rounded-full border-2 transition-colors ${b.cls} ${bgColor === b.key ? "border-blue-400" : "border-transparent hover:border-gray-500"}`}
            />
          ))}
        </div>

        {/* 3D viewport */}
        <div className="flex-1 relative overflow-hidden">
          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Box className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No file attached to this record</p>
            </div>
          )}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-900">
              <Cpu className="w-10 h-10 animate-pulse text-blue-500" />
              <p className="text-sm font-medium text-white">Loading 3D Model</p>
              <p className="text-xs text-gray-500 max-w-xs text-center">{progress}</p>
              <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-blue-500 animate-pulse rounded-full w-2/3" />
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-900">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-300 font-medium">Failed to load model</p>
              <p className="text-xs text-gray-500 max-w-xs text-center">{error}</p>
              {record.attach && (
                <button
                  onClick={() => loadFromUrl(record.attach!)}
                  className="mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {status === "loaded" && (
            <Suspense fallback={null}>
              <StepViewer3D
                ref={viewerRef}
                meshes={meshes}
                hiddenMeshes={hiddenMeshes}
                viewMode={viewMode}
                bgColor={bgColor}
                showGrid={showGrid}
                showAxes={showAxes}
                measureMode={false}
                onMeasureResult={() => {}}
              />
            </Suspense>
          )}
        </div>

        {/* Right panel — parts tree */}
        {status === "loaded" && treeRoot && (
          <div className="w-56 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">Parts</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setHiddenMeshes(new Set())}
                  title="Show all"
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setHiddenMeshes(new Set(meshes.map((_, i) => i)))}
                  title="Hide all"
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <MeshesPanel
                root={treeRoot}
                totalMeshes={meshes.length}
                hiddenMeshes={hiddenMeshes}
                onToggleMesh={toggleMesh}
                onFitToPart={(indices) => viewerRef.current?.fitToPart?.(indices)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  accentColor = "purple",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFiltered = value !== "";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          isFiltered
            ? "bg-purple-50 border-purple-300 text-purple-700"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <span className="truncate max-w-[140px]">{value || label}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] max-h-64 overflow-auto py-1">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === "" ? "text-purple-700 bg-purple-50 font-medium" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            All {label}s
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                value === opt ? "text-purple-700 bg-purple-50 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Design3D() {
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [records, setRecords] = useState<Design3DRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/design-3d`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projects = Array.from(
    new Set(records.map(r => r.project_name || r.project).filter(Boolean))
  ).sort();

  const systems = Array.from(
    new Set(records.map(r => r.system_name).filter(Boolean))
  ).sort();

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || (
      r.name.toLowerCase().includes(q) ||
      (r.tag || "").toLowerCase().includes(q) ||
      (r.project_name || "").toLowerCase().includes(q) ||
      (r.system_name || "").toLowerCase().includes(q) ||
      (r.revision || "").toLowerCase().includes(q)
    );
    const matchProject = !selectedProject || (r.project_name || r.project) === selectedProject;
    const matchSystem = !selectedSystem || r.system_name === selectedSystem;
    return matchSearch && matchProject && matchSystem;
  });

  const hasFilters = search || selectedProject || selectedSystem;

  const clearFilters = () => {
    setSearch("");
    setSelectedProject("");
    setSelectedSystem("");
  };

  const openViewer = useCallback((idx: number) => setViewerIndex(idx), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  return (
    <>
      {viewerIndex !== null && filtered[viewerIndex] && (
        <ModelViewer
          record={filtered[viewerIndex]}
          filtered={filtered}
          currentIndex={viewerIndex}
          onClose={closeViewer}
          onNavigate={setViewerIndex}
        />
      )}

      <Layout>
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Box className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Design 3D</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  3D STEP models from ERPNext — click any record to open the interactive viewer.
                </p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              label="Project"
              value={selectedProject}
              options={projects}
              onChange={v => { setSelectedProject(v); setViewerIndex(null); }}
            />
            <FilterDropdown
              label="System"
              value={selectedSystem}
              options={systems}
              onChange={v => { setSelectedSystem(v); setViewerIndex(null); }}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="ml-auto text-sm text-gray-400">
              {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, tag, revision…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Table header */}
            <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_110px_110px_90px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Design No. / Tag</span>
              <span>Project</span>
              <span>System</span>
              <span>Revision</span>
              <span>Modified</span>
              <span className="text-right">File</span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Fetching 3D designs from ERPNext…</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button onClick={load} className="text-sm text-purple-600 underline">Retry</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((r, idx) => (
                  <div
                    key={r.name}
                    onClick={() => openViewer(idx)}
                    className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_110px_110px_90px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                        <Box className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                          {r.name}
                        </p>
                        {r.tag && (
                          <p className="text-xs text-gray-400 truncate">{r.tag}</p>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 font-medium truncate">{r.project_name || r.project || "—"}</p>
                      {r.project && r.project !== r.project_name && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{r.project}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{r.system_name || "—"}</p>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                      {r.revision || "—"}
                    </span>
                    <span className="text-xs text-gray-400">{r.modified ? formatDate(r.modified) : "—"}</span>
                    <div className="flex justify-end">
                      {r.attach ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200">
                          View 3D
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && !loading && (
                  <div className="py-12 text-center text-gray-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No 3D designs found</p>
                    <p className="text-xs mt-1 text-gray-300">3D designs are managed in ERPNext</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
