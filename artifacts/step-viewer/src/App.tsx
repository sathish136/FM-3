import { useState, useCallback, useRef } from "react";
import { lazy, Suspense } from "react";
import * as THREE from "three";
import { loadStepFile, type MeshData, type TreeNode } from "@/lib/stepLoader";
import type { ViewMode, BgColor, ViewerRef } from "@/components/StepViewer3D";
import MeshesPanel from "@/components/MeshesPanel";

const StepViewer3D = lazy(() => import("@/components/StepViewer3D"));

type Status = "idle" | "loading" | "loaded" | "error";

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-blue-500 border-t-transparent ${sm ? "h-5 w-5" : "h-10 w-10"}`}
    />
  );
}

function UploadIcon() {
  return (
    <svg className="w-16 h-16 mb-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

interface ToolBtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}
function ToolBtn({ active, title, onClick, children, danger }: ToolBtnProps) {
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

function Divider() {
  return <div className="w-full h-px bg-white/10 my-1" />;
}

function Section({ label }: { label: string }) {
  return <div className="text-[9px] text-gray-500 uppercase tracking-widest px-1 mt-2 mb-0.5 select-none">{label}</div>;
}

export default function App() {
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

  // View options
  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [bgColor, setBgColor] = useState<BgColor>("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<{
    dist: number;
    p1: THREE.Vector3;
    p2: THREE.Vector3;
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
  }, [processFile]);

  const resetViewer = () => {
    setMeshes([]);
    setTreeRoot(null);
    setHiddenMeshes(new Set());
    setStatus("idle");
    setError("");
    setFileName("");
    setMeasureMode(false);
    setMeasureResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggleMesh = useCallback((indices: number[], hide: boolean) => {
    setHiddenMeshes((prev) => {
      const next = new Set(prev);
      if (hide) {
        indices.forEach((i) => next.add(i));
      } else {
        indices.forEach((i) => next.delete(i));
      }
      return next;
    });
  }, []);

  const handleFitToPart = useCallback((indices: number[]) => {
    viewerRef.current?.fitToPart(indices);
  }, []);

  const handleMeasureResult = useCallback(
    (dist: number | null, p1: THREE.Vector3 | null, p2: THREE.Vector3 | null) => {
      if (dist === null) {
        setMeasureResult(null);
      } else {
        setMeasureResult({ dist, p1: p1!, p2: p2! });
        setMeasureMode(false);
      }
    },
    []
  );

  const clearMeasure = () => {
    viewerRef.current?.clearMeasure();
    setMeasureResult(null);
    setMeasureMode(false);
  };

  const isDark = bgColor === "dark" || bgColor === "navy";

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a] text-white overflow-hidden">
      {/* ─── Top Header ─── */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#16162a] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">3D</div>
          <span className="text-sm font-semibold">STEP File Viewer</span>
          {fileName && (
            <span className="text-xs text-gray-400 ml-2 truncate max-w-[240px]">— {fileName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "loaded" && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
              >
                Open File
              </button>
              <button
                onClick={resetViewer}
                className="px-3 py-1.5 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] border border-white/10 rounded text-gray-300 transition-colors"
              >
                Clear
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp,.STEP,.STP"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Toolbar ─── */}
        {status === "loaded" && (
          <aside className="w-12 bg-[#16162a] border-r border-white/10 flex flex-col items-center py-2 gap-0.5 flex-shrink-0 overflow-y-auto">

            <Section label="View" />

            <ToolBtn title="Shaded" active={viewMode === "shaded"} onClick={() => setViewMode("shaded")}>
              {/* Solid sphere icon */}
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                <circle cx="10" cy="10" r="7" />
              </svg>
            </ToolBtn>

            <ToolBtn title="Wireframe" active={viewMode === "wireframe"} onClick={() => setViewMode("wireframe")}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="7" />
                <ellipse cx="10" cy="10" rx="7" ry="3.5" />
                <line x1="10" y1="3" x2="10" y2="17" />
              </svg>
            </ToolBtn>

            <ToolBtn title="Flat Shading" active={viewMode === "flat"} onClick={() => setViewMode("flat")}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                <polygon points="10,3 17,15 3,15" />
              </svg>
            </ToolBtn>

            <ToolBtn title="Edges Only" active={viewMode === "edges"} onClick={() => setViewMode("edges")}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="4" width="12" height="12" />
                <line x1="4" y1="4" x2="10" y2="2" />
                <line x1="16" y1="4" x2="10" y2="2" />
                <line x1="16" y1="16" x2="18" y2="10" />
                <line x1="16" y1="4" x2="18" y2="10" />
              </svg>
            </ToolBtn>

            <Divider />
            <Section label="Scene" />

            <ToolBtn title="Toggle Grid" active={showGrid} onClick={() => setShowGrid(v => !v)}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="10" y1="3" x2="10" y2="17" />
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="14" x2="17" y2="14" />
                <line x1="6" y1="3" x2="6" y2="17" />
                <line x1="14" y1="3" x2="14" y2="17" />
              </svg>
            </ToolBtn>

            <ToolBtn title="Toggle Axes" active={showAxes} onClick={() => setShowAxes(v => !v)}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="4" y1="16" x2="16" y2="16" stroke="#f55" />
                <line x1="4" y1="16" x2="4" y2="4" stroke="#5f5" />
                <line x1="4" y1="16" x2="12" y2="9" stroke="#55f" />
              </svg>
            </ToolBtn>

            <Divider />
            <Section label="BG" />

            <ToolBtn title="Dark background" active={bgColor === "dark"} onClick={() => setBgColor("dark")}>
              <div className="w-5 h-5 rounded-full bg-[#0f0f1a] border border-white/30" />
            </ToolBtn>
            <ToolBtn title="Navy background" active={bgColor === "navy"} onClick={() => setBgColor("navy")}>
              <div className="w-5 h-5 rounded-full bg-[#1a1a2e] border border-white/30" />
            </ToolBtn>
            <ToolBtn title="Light background" active={bgColor === "light"} onClick={() => setBgColor("light")}>
              <div className="w-5 h-5 rounded-full bg-[#dde3ee] border border-black/20" />
            </ToolBtn>
            <ToolBtn title="White background" active={bgColor === "white"} onClick={() => setBgColor("white")}>
              <div className="w-5 h-5 rounded-full bg-white border border-black/20" />
            </ToolBtn>

            <Divider />
            <Section label="Camera" />

            <ToolBtn title="Isometric view" onClick={() => viewerRef.current?.setCamera("iso")}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.3">
                <polygon points="10,3 17,7 17,13 10,17 3,13 3,7" />
                <line x1="10" y1="3" x2="10" y2="17" />
                <line x1="3" y1="7" x2="17" y2="13" />
                <line x1="17" y1="7" x2="3" y2="13" />
              </svg>
            </ToolBtn>
            <ToolBtn title="Front view" onClick={() => viewerRef.current?.setCamera("front")}>
              <span className="text-[9px] font-bold">FR</span>
            </ToolBtn>
            <ToolBtn title="Top view" onClick={() => viewerRef.current?.setCamera("top")}>
              <span className="text-[9px] font-bold">TP</span>
            </ToolBtn>
            <ToolBtn title="Right view" onClick={() => viewerRef.current?.setCamera("right")}>
              <span className="text-[9px] font-bold">RT</span>
            </ToolBtn>
            <ToolBtn title="Left view" onClick={() => viewerRef.current?.setCamera("left")}>
              <span className="text-[9px] font-bold">LT</span>
            </ToolBtn>
            <ToolBtn title="Back view" onClick={() => viewerRef.current?.setCamera("back")}>
              <span className="text-[9px] font-bold">BK</span>
            </ToolBtn>
            <ToolBtn title="Bottom view" onClick={() => viewerRef.current?.setCamera("bottom")}>
              <span className="text-[9px] font-bold">BT</span>
            </ToolBtn>
            <ToolBtn title="Fit to view" onClick={() => viewerRef.current?.fitToView()}>
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="14" height="14" rx="1" />
                <polyline points="7,3 3,3 3,7" />
                <polyline points="13,3 17,3 17,7" />
                <polyline points="3,13 3,17 7,17" />
                <polyline points="17,13 17,17 13,17" />
              </svg>
            </ToolBtn>

            <Divider />
            <Section label="Tools" />

            <ToolBtn
              title="Measure distance (click 2 points)"
              active={measureMode}
              onClick={() => {
                if (measureMode) {
                  clearMeasure();
                } else {
                  setMeasureMode(true);
                  setMeasureResult(null);
                  viewerRef.current?.clearMeasure();
                }
              }}
            >
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                <line x1="3" y1="17" x2="17" y2="3" />
                <line x1="3" y1="17" x2="3" y2="14" />
                <line x1="3" y1="17" x2="6" y2="17" />
                <line x1="17" y1="3" x2="14" y2="3" />
                <line x1="17" y1="3" x2="17" y2="6" />
                <line x1="7" y1="13" x2="10" y2="10" strokeDasharray="2,2" />
              </svg>
            </ToolBtn>
          </aside>
        )}

        {/* ─── Main Viewport ─── */}
        <main className="flex-1 relative overflow-hidden">
          {/* Upload Screen */}
          {status === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div
                className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 flex flex-col items-center text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-blue-400 bg-blue-500/10 scale-105"
                    : "border-[#2a2a4a] hover:border-blue-500/50 hover:bg-blue-500/5"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                <h2 className="text-xl font-semibold text-white mb-2">Drop your STEP file here</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Supports <span className="text-blue-400 font-medium">.STEP</span> and{" "}
                  <span className="text-blue-400 font-medium">.STP</span> files from Solid Edge and other CAD tools
                </p>
                <div className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors">
                  Browse Files
                </div>
                <p className="text-xs text-gray-500 mt-4">Processed locally — nothing is uploaded to a server</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".step,.stp,.STEP,.STP"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Loading */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Spinner />
              <div className="text-center">
                <p className="text-white font-medium">{progress || "Processing..."}</p>
                <p className="text-sm text-gray-400 mt-1">This may take a moment for large files</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-center max-w-md">
                <p className="text-white font-medium text-lg mb-2">Failed to load file</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
              <button
                onClick={resetViewer}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* 3D Viewport */}
          {status === "loaded" && (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}>
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
          )}

          {/* Measure banner */}
          {status === "loaded" && measureMode && !measureResult && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
              📏 Click first point on model...
            </div>
          )}

          {/* Measure result panel */}
          {status === "loaded" && measureResult && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1e1e3a]/95 border border-yellow-500/50 rounded-xl px-5 py-3 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Distance</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {measureResult.dist.toFixed(4)}
                    <span className="text-sm text-gray-400 ml-1">units</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    P1: ({measureResult.p1.x.toFixed(2)}, {measureResult.p1.y.toFixed(2)}, {measureResult.p1.z.toFixed(2)})
                    {"  "}→{"  "}
                    P2: ({measureResult.p2.x.toFixed(2)}, {measureResult.p2.y.toFixed(2)}, {measureResult.p2.z.toFixed(2)})
                  </div>
                </div>
                <button
                  onClick={clearMeasure}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                  title="Clear measurement"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Controls hint */}
          {status === "loaded" && (
            <div
              className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 text-[10px] space-y-0.5 pointer-events-none ${
                isDark ? "bg-black/40 text-gray-400" : "bg-black/20 text-gray-600"
              }`}
            >
              <div>🖱 Left: Rotate · Right: Pan · Scroll: Zoom</div>
            </div>
          )}

        </main>

        {/* ─── Right Meshes Panel ─── */}
        {status === "loaded" && (
          <MeshesPanel
            root={treeRoot}
            totalMeshes={meshes.length}
            hiddenMeshes={hiddenMeshes}
            onToggleMesh={handleToggleMesh}
            onFitToPart={handleFitToPart}
          />
        )}
      </div>
    </div>
  );
}
