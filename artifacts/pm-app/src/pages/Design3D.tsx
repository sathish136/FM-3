import { Layout } from "@/components/Layout";
import {
  Box, FolderOpen, Search, RefreshCw, Loader2, X,
  ChevronLeft, ChevronRight, AlertCircle, Cpu,
  Eye, EyeOff, ChevronDown, FilterX,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { loadStepFile, prewarmWorker, type MeshData, type TreeNode } from "@/lib/stepLoader";
import { getCached, setCached } from "@/lib/stepCache";
import type { ViewMode, BgColor, ViewerRef } from "@/components/StepViewer3D";
import MeshesPanel from "@/components/MeshesPanel";
import * as THREE from "three";

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

function stepFileUrl(attach: string, modified: string) {
  return `${BASE}/api/step-file?url=${encodeURIComponent(attach)}&modified=${encodeURIComponent(modified)}`;
}

function proxyUrl(attach: string) {
  return `${BASE}/api/file-proxy?url=${encodeURIComponent(attach)}`;
}

function fileName(attach: string) {
  return attach.split("/").pop() || attach;
}

type LoadStatus = "idle" | "loading" | "loaded" | "error";

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

const CUBE_SIZE = 92;
const HALF = CUBE_SIZE / 2;

type CameraView = "front" | "back" | "top" | "bottom" | "left" | "right" | "iso";

interface CubeFace {
  view: CameraView;
  label: string;
  transform: string;
  bg: string;
  hiBg: string;
  borderColor: string;
  gridColor: string;
}

const CUBE_FACES: CubeFace[] = [
  {
    view: "front",  label: "FRONT",
    transform: `translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#1e40af 0%,#1d4ed8 60%,#2563eb 100%)",
    hiBg: "linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%)",
    borderColor: "rgba(96,165,250,0.6)",  gridColor: "rgba(148,187,255,0.12)",
  },
  {
    view: "back",   label: "BACK",
    transform: `rotateY(180deg) translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#0f766e 0%,#115e59 100%)",
    hiBg: "linear-gradient(135deg,#34d399 0%,#10b981 100%)",
    borderColor: "rgba(52,211,153,0.5)",  gridColor: "rgba(110,231,183,0.1)",
  },
  {
    view: "right",  label: "RIGHT",
    transform: `rotateY(90deg) translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#166534 0%,#14532d 100%)",
    hiBg: "linear-gradient(135deg,#4ade80 0%,#22c55e 100%)",
    borderColor: "rgba(74,222,128,0.5)",  gridColor: "rgba(134,239,172,0.1)",
  },
  {
    view: "left",   label: "LEFT",
    transform: `rotateY(-90deg) translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#4c1d95 0%,#3b0764 100%)",
    hiBg: "linear-gradient(135deg,#c084fc 0%,#a855f7 100%)",
    borderColor: "rgba(192,132,252,0.5)", gridColor: "rgba(216,180,254,0.1)",
  },
  {
    view: "top",    label: "TOP",
    transform: `rotateX(-90deg) translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#991b1b 0%,#7f1d1d 100%)",
    hiBg: "linear-gradient(135deg,#fca5a5 0%,#ef4444 100%)",
    borderColor: "rgba(252,165,165,0.55)", gridColor: "rgba(254,202,202,0.12)",
  },
  {
    view: "bottom", label: "BTM",
    transform: `rotateX(90deg) translateZ(${HALF}px)`,
    bg: "linear-gradient(135deg,#92400e 0%,#78350f 100%)",
    hiBg: "linear-gradient(135deg,#fdba74 0%,#f97316 100%)",
    borderColor: "rgba(253,186,116,0.5)", gridColor: "rgba(254,215,170,0.1)",
  },
];

function ViewCube({
  cameraQuat,
  onFaceClick,
}: {
  cameraQuat: THREE.Quaternion | null;
  onFaceClick: (view: CameraView) => void;
}) {
  const [hovered, setHovered] = useState<CameraView | null>(null);

  const matrixStr = (() => {
    if (!cameraQuat) return "rotateX(-20deg) rotateY(-30deg)";
    const m = new THREE.Matrix4().makeRotationFromQuaternion(cameraQuat.clone().conjugate());
    const e = m.elements;
    return `matrix3d(${e[0].toFixed(5)},${e[1].toFixed(5)},${e[2].toFixed(5)},0,${e[4].toFixed(5)},${e[5].toFixed(5)},${e[6].toFixed(5)},0,${e[8].toFixed(5)},${e[9].toFixed(5)},${e[10].toFixed(5)},0,0,0,0,1)`;
  })();

  return (
    <div className="absolute bottom-14 right-3 select-none pointer-events-auto" style={{ zIndex: 10 }}>
      {/* Glass card wrapper */}
      <div style={{
        padding: "10px",
        background: "rgba(5,5,15,0.55)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>
        {/* Perspective container */}
        <div style={{ perspective: "560px", perspectiveOrigin: "50% 50%" }}>
          {/* Spinning cube */}
          <div
            style={{
              width: `${CUBE_SIZE}px`,
              height: `${CUBE_SIZE}px`,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: matrixStr,
              filter: "drop-shadow(0 0 10px rgba(96,165,250,0.25))",
            }}
          >
            {CUBE_FACES.map(face => {
              const isHov = hovered === face.view;
              return (
                <div
                  key={face.view}
                  title={face.label}
                  onMouseEnter={() => setHovered(face.view)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onFaceClick(face.view)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: face.transform,
                    background: isHov ? face.hiBg : face.bg,
                    border: `2px solid ${isHov ? face.borderColor : "rgba(255,255,255,0.18)"}`,
                    cursor: "pointer",
                    backfaceVisibility: "hidden",
                    transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                    boxShadow: isHov
                      ? `inset 0 0 24px rgba(255,255,255,0.25), inset 0 0 6px rgba(255,255,255,0.1)`
                      : "inset 0 0 12px rgba(0,0,0,0.3)",
                    overflow: "hidden",
                  }}
                >
                  {/* Grid lines overlay */}
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    backgroundImage: `linear-gradient(${face.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${face.gridColor} 1px, transparent 1px)`,
                    backgroundSize: "33.3% 33.3%",
                  }} />
                  {/* Specular highlight top-left corner */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, width: "45%", height: "45%",
                    background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.18) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }} />
                  {/* Label */}
                  <span style={{
                    position: "relative",
                    color: "white",
                    fontSize: "8.5px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)",
                    fontFamily: "monospace",
                  }}>
                    {face.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* View buttons row */}
        <div className="flex gap-1 mt-2.5">
          {(["F","T","R"] as const).map((lbl, i) => {
            const views: CameraView[] = ["front","top","right"];
            return (
              <button
                key={lbl}
                title={["Front","Top","Right"][i]}
                onClick={() => onFaceClick(views[i])}
                className="flex-1 py-0.5 rounded text-[9px] font-bold text-gray-400 bg-white/8 border border-white/15 hover:bg-blue-500/60 hover:text-white hover:border-blue-400/50 transition-colors"
              >
                {lbl}
              </button>
            );
          })}
          <button
            title="Isometric"
            onClick={() => onFaceClick("iso")}
            className="flex-1 py-0.5 rounded text-[9px] font-bold text-blue-300 bg-blue-500/15 border border-blue-400/30 hover:bg-blue-500/60 hover:text-white hover:border-blue-400/60 transition-colors"
          >
            ISO
          </button>
        </div>
      </div>
    </div>
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
  const [dlProgress, setDlProgress] = useState<{
    pct: number;
    receivedMB: number;
    totalMB: number | null;
    speedMBs: number;
    remainingSecs: number | null;
    stage: string;
  } | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("shaded");
  const [bgColor, setBgColor] = useState<BgColor>("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureResult, setMeasureResult] = useState<{
    dist: number; p1: THREE.Vector3; p2: THREE.Vector3;
  } | null>(null);
  const [cameraQuat, setCameraQuat] = useState<THREE.Quaternion | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedPart, setSelectedPart] = useState<{ index: number; name: string } | null>(null);

  const viewerRef = useRef<ViewerRef>(null);

  const [fromDiskCache, setFromDiskCache] = useState<boolean | null>(null);

  // Streams a fetch response and reports download progress in real-time
  const streamWithProgress = useCallback(async (
    res: Response,
    stage: string,
  ): Promise<ArrayBuffer> => {
    const contentLength = res.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : null;
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      const elapsed = Math.max((Date.now() - startTime) / 1000, 0.1);
      const speedMBs = received / elapsed / (1024 * 1024);
      const receivedMB = received / (1024 * 1024);
      const totalMB = total ? total / (1024 * 1024) : null;
      const pct = total ? Math.round((received / total) * 100) : -1;
      const remainingSecs = total && speedMBs > 0
        ? (total - received) / (speedMBs * 1024 * 1024)
        : null;

      setDlProgress({ pct, receivedMB, totalMB, speedMBs, remainingSecs, stage });
    }

    // Reassemble into a single ArrayBuffer
    const full = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { full.set(chunk, offset); offset += chunk.length; }
    return full.buffer;
  }, []);

  const loadFromUrl = useCallback(async (attachUrl: string, modified: string) => {
    setStatus("loading");
    setProgress("Checking local cache…");
    setDlProgress(null);
    setMeshes([]);
    setTreeRoot(null);
    setHiddenMeshes(new Set());
    setError("");
    setMeasureResult(null);
    setFromDiskCache(null);

    // IndexedDB key includes the modified timestamp → auto-invalidated when ERP file changes
    const idbKey = `${attachUrl}::${modified}`;

    try {
      // 1. Check browser IndexedDB cache first (instant)
      const cached = await getCached(idbKey);
      if (cached) {
        setProgress("Loading from browser cache…");
        setMeshes(cached.meshes);
        setTreeRoot(cached.root);
        setFromDiskCache(true);
        setStatus("loaded");
        return;
      }

      // 2. Try server-side pre-parsed mesh (works for any file size — server does the heavy OCCT work)
      setProgress("Requesting server conversion…");
      const meshUrl = `${BASE}/api/step-mesh?url=${encodeURIComponent(attachUrl)}&modified=${encodeURIComponent(modified)}`;
      const meshRes = await fetch(meshUrl);

      if (meshRes.ok) {
        setProgress("Downloading pre-parsed geometry…");
        const jsonBuf = await streamWithProgress(meshRes, "Downloading geometry…");
        const json = JSON.parse(new TextDecoder().decode(jsonBuf)) as { meshes: MeshData[]; root: TreeNode };
        if (json.meshes && json.root) {
          setFromDiskCache(meshRes.headers.get("X-Mesh-Cache") === "HIT");
          setDlProgress(null);
          setMeshes(json.meshes);
          setTreeRoot(json.root);
          setStatus("loaded");
          setCached(idbKey, json.meshes, json.root);
          return;
        }
      }

      // 3. Fall back to browser-side OCCT parsing (for smaller files / server errors)
      setProgress("Fetching STEP file…");
      const res = await fetch(stepFileUrl(attachUrl, modified));
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const diskHit = res.headers.get("X-Step-Cache") === "HIT";
      setFromDiskCache(diskHit);
      const buffer = await streamWithProgress(res, "Downloading STEP file…");
      setDlProgress(null);
      setProgress("Parsing geometry…");
      let parseStart = Date.now();
      const result = await loadStepFile(buffer, msg => {
        setProgress(msg);
        // Parse "Processed X of Y parts…" → show real ETA for extraction phase
        const m = msg.match(/Processed\s+(\d+)\s+of\s+(\d+)/);
        if (m) {
          const done = parseInt(m[1], 10);
          const total = parseInt(m[2], 10);
          const pct = Math.round((done / total) * 100);
          const elapsed = Math.max((Date.now() - parseStart) / 1000, 0.1);
          const rate = done / elapsed;
          const remainingSecs = rate > 0 ? (total - done) / rate : null;
          setDlProgress({
            pct,
            receivedMB: done,
            totalMB: total,
            speedMBs: 0,
            remainingSecs,
            stage: `Extracting parts (${done} / ${total})`,
          });
        } else if (msg.includes("Parsing STEP")) {
          parseStart = Date.now();
          setDlProgress({ pct: -1, receivedMB: 0, totalMB: null, speedMBs: 0, remainingSecs: null, stage: msg });
        }
      });
      setMeshes(result.meshes);
      setTreeRoot(result.root);
      setStatus("loaded");
      setCached(idbKey, result.meshes, result.root);
    } catch (e: any) {
      setError(e.message || "Failed to load model");
      setStatus("error");
    }
  }, [streamWithProgress]);

  useEffect(() => {
    if (record.attach) {
      loadFromUrl(record.attach, record.modified || "");
    } else {
      setStatus("idle");
    }
  }, [record.name, record.attach, record.modified]);

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
      if (hidden) indices.forEach(i => next.add(i));
      else indices.forEach(i => next.delete(i));
      return next;
    });
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{record.name}</p>
            {status === "loaded" && fromDiskCache !== null && (
              <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                fromDiskCache
                  ? "bg-green-900/50 text-green-300 border-green-700/50"
                  : "bg-blue-900/50 text-blue-300 border-blue-700/50"
              }`}>
                {fromDiskCache ? "⚡ Cached" : "⬇ Downloaded & cached"}
              </span>
            )}
          </div>
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
        <div className="w-12 flex flex-col items-center py-2 gap-1 flex-shrink-0 overflow-y-auto bg-[#0f0f1a] border-r border-white/10">
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
          <Section label="360°" />
          <ToolBtn
            title={autoRotate ? "Stop rotation" : "Auto-rotate 360°"}
            active={autoRotate}
            onClick={() => setAutoRotate(v => !v)}
          >
            <svg viewBox="0 0 20 20"
              className={`w-4 h-4 ${autoRotate ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M10 3a7 7 0 1 1-4.95 2.05" strokeLinecap="round"/>
              <polyline points="5,1 5,5 9,5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ToolBtn>
        </div>

        {/* 3D viewport */}
        <div className={`flex-1 relative overflow-hidden ${isDark ? "bg-[#0f0f1a]" : "bg-[#dde3ee]"}`}>
          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Box className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No file attached to this record</p>
            </div>
          )}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4 bg-gray-900 px-6">
              <Cpu className="w-10 h-10 animate-pulse text-blue-500" />
              <p className="text-sm font-semibold text-white">Loading 3D Model</p>

              {dlProgress ? (
                <div className="flex flex-col items-center gap-2 w-64">
                  <p className="text-xs text-blue-300 font-medium">{dlProgress.stage}</p>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    {dlProgress.pct >= 0 ? (
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-150"
                        style={{ width: `${dlProgress.pct}%` }}
                      />
                    ) : (
                      <div className="h-full bg-blue-500 rounded-full animate-pulse w-1/2" />
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex justify-between w-full text-[11px] text-gray-400">
                    {dlProgress.speedMBs > 0 ? (
                      <>
                        <span>
                          {dlProgress.receivedMB.toFixed(1)} MB
                          {dlProgress.totalMB ? ` / ${dlProgress.totalMB.toFixed(1)} MB` : ""}
                        </span>
                        <span>{dlProgress.pct >= 0 ? `${dlProgress.pct}%` : ""}</span>
                        <span>{dlProgress.speedMBs.toFixed(1)} MB/s</span>
                      </>
                    ) : dlProgress.totalMB ? (
                      <>
                        <span>{dlProgress.receivedMB} / {dlProgress.totalMB} parts</span>
                        <span>{dlProgress.pct >= 0 ? `${dlProgress.pct}%` : ""}</span>
                        <span />
                      </>
                    ) : null}
                  </div>

                  {/* ETA */}
                  {dlProgress.remainingSecs !== null && dlProgress.remainingSecs > 1 && (
                    <p className="text-[11px] text-gray-500">
                      ~{dlProgress.remainingSecs < 60
                        ? `${Math.ceil(dlProgress.remainingSecs)}s remaining`
                        : `${Math.ceil(dlProgress.remainingSecs / 60)}m remaining`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-64">
                  <p className="text-xs text-gray-500 text-center">{progress}</p>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse rounded-full w-1/2" />
                  </div>
                </div>
              )}
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-900">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-300 font-medium">Failed to load model</p>
              <p className="text-xs text-gray-500 max-w-xs text-center">{error}</p>
              {record.attach && (
                <button
                  onClick={() => loadFromUrl(record.attach!, record.modified || "")}
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
                measureMode={measureMode}
                onMeasureResult={handleMeasureResult}
                onCameraChange={setCameraQuat}
                autoRotate={autoRotate}
                autoRotateSpeed={1.8}
                onPartClick={(idx, name) => {
                  if (idx !== null && name !== null) setSelectedPart({ index: idx, name });
                  else setSelectedPart(null);
                }}
              />
            </Suspense>
          )}

          {status === "loaded" && (
            <ViewCube
              cameraQuat={cameraQuat}
              onFaceClick={(view) => viewerRef.current?.setCamera(view)}
            />
          )}

          {/* File / record badge */}
          {status === "loaded" && (
            <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 pointer-events-none ${isDark ? "bg-black/50 text-gray-300" : "bg-white/80 text-gray-600"}`}>
              <Box className="w-3.5 h-3.5" />
              {record.name}
            </div>
          )}

          {/* Selected part indicator */}
          {status === "loaded" && selectedPart && (
            <div className="absolute top-12 left-3 flex items-center gap-2 pointer-events-none">
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
                {selectedPart.name || `Part ${selectedPart.index + 1}`}
              </div>
            </div>
          )}

          {/* Watermark */}
          <div className="absolute top-10 right-10 pointer-events-none select-none flex flex-col items-end gap-0.5">
            <span
              className={`opacity-30 ${isDark ? "text-white" : "text-gray-700"}`}
              style={{
                fontSize: "20px",
                fontFamily: "'Trebuchet MS', 'Century Gothic', 'Gill Sans', Arial, sans-serif",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontStyle: "normal",
                lineHeight: 1.1,
              }}
            >
              WTT INTERNATIONAL
            </span>
            <span
              className={`opacity-25 ${isDark ? "text-white" : "text-gray-700"}`}
              style={{
                fontSize: "10px",
                fontFamily: "'Trebuchet MS', 'Century Gothic', 'Gill Sans', Arial, sans-serif",
                fontWeight: 400,
                letterSpacing: "0.12em",
                fontStyle: "italic",
                textTransform: "uppercase",
              }}
            >
              Water Loving Technology
            </span>
          </div>

          {/* Measure result overlay */}
          {measureResult && (
            <div className="absolute top-3 right-3 bg-yellow-500/90 text-black rounded-xl px-4 py-3 text-sm shadow-lg flex items-center gap-3">
              <div>
                <div className="text-[10px] text-yellow-900 uppercase tracking-widest mb-0.5">Distance</div>
                <div className="text-xl font-bold">{(measureResult.dist / 1000).toFixed(4)} <span className="text-sm font-normal">m</span></div>
                <div className="text-[10px] text-yellow-800 mt-0.5">{measureResult.dist.toFixed(2)} mm</div>
              </div>
              <button onClick={clearMeasure} className="ml-2 text-yellow-900 hover:text-black transition-colors font-bold">✕</button>
            </div>
          )}

          {/* Controls hint */}
          {status === "loaded" && (
            <div className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 text-[10px] pointer-events-none ${isDark ? "bg-black/40 text-gray-400" : "bg-black/20 text-gray-600"}`}>
              🖱 Left: Rotate · Right: Pan · Scroll: Zoom
            </div>
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

  useEffect(() => {
    load();
    // Pre-warm the OCCT worker in the background so it's ready when user opens a model
    prewarmWorker();
  }, []);

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
