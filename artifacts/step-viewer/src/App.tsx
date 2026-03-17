import { useState, useCallback, useRef } from "react";
import { lazy, Suspense } from "react";
import { loadStepFile, type MeshData } from "@/lib/stepLoader";

const StepViewer3D = lazy(() => import("@/components/StepViewer3D"));

type Status = "idle" | "loading" | "loaded" | "error";

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
  );
}

export default function App() {
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const buffer = await file.arrayBuffer();
      const result = await loadStepFile(buffer, (msg) => setProgress(msg));
      setMeshes(result);
      setStatus("loaded");
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred while processing file.");
      setStatus("error");
      setProgress("");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const resetViewer = () => {
    setMeshes([]);
    setStatus("idle");
    setError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#16162a] border-b border-[#2a2a4a] shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">3D</div>
          <div>
            <h1 className="text-base font-semibold text-white leading-none">STEP File Viewer</h1>
            <p className="text-xs text-gray-400 mt-0.5">Web-based 3D CAD viewer</p>
          </div>
        </div>

        {status === "loaded" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 truncate max-w-[200px]">{fileName}</span>

            <button
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                wireframe
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#2a2a4a] border-[#3a3a6a] text-gray-300 hover:border-blue-500/50"
              }`}
              onClick={() => setWireframe((v) => !v)}
            >
              Wireframe
            </button>

            <button
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                showEdges
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#2a2a4a] border-[#3a3a6a] text-gray-300 hover:border-blue-500/50"
              }`}
              onClick={() => setShowEdges((v) => !v)}
            >
              Edges
            </button>

            <button
              onClick={resetViewer}
              className="px-3 py-1.5 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] border border-[#3a3a6a] rounded-md transition-colors text-gray-300"
            >
              Open New File
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
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
                <span className="text-blue-400 font-medium">.STP</span> files from Solid Edge and other CAD software
              </p>
              <div className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors">
                Browse Files
              </div>
              <p className="text-xs text-gray-500 mt-4">Files are processed locally — nothing is uploaded to any server</p>
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

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Spinner />
            <div className="text-center">
              <p className="text-white font-medium">{progress || "Processing..."}</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment for large files</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

        {status === "loaded" && (
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}>
            <StepViewer3D meshes={meshes} wireframe={wireframe} showEdges={showEdges} />
          </Suspense>
        )}

        {status === "loaded" && (
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-400 space-y-1 pointer-events-none">
            <div>Left drag: Rotate</div>
            <div>Right drag / Scroll: Zoom</div>
            <div>Middle drag: Pan</div>
          </div>
        )}

        {status === "loaded" && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300">
            <span className="text-gray-400">Parts: </span>{meshes.length}
          </div>
        )}
      </main>
    </div>
  );
}
