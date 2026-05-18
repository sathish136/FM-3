import { Layout } from "@/components/Layout";
import { ShadedMeshImage } from "@/components/ShadedMeshImage";
import { FabricationSheetPreview } from "@/components/FabricationSheetPreview";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Upload, FileBox, Loader2, Download, Ruler, Layers,
  Box, Sparkles, Grid3X3,
} from "lucide-react";
import { loadStepFile, prewarmWorker, type MeshData, type TreeNode } from "@/lib/stepLoader";
import {
  collectParts,
  boundsSummary,
  parseDrawingTitle,
  type PartDrawingInfo,
} from "@/lib/stepPartDrawing";
import { downloadStepPartDrawingPdf } from "@/lib/stepPartDrawingPdf";
import { HD_PART, partColorCss } from "@/lib/stepMeshRenderer";

type Status = "idle" | "loading" | "ready" | "error";

export default function StepPartDrawings() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [parts, setParts] = useState<PartDrawingInfo[]>([]);
  const [selected, setSelected] = useState<PartDrawingInfo | null>(null);
  const [viewTab, setViewTab] = useState<"assembly" | "detail">("assembly");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const selectedIndices = useMemo(
    () => (selected ? [selected.meshIndex] : undefined),
    [selected],
  );

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/40">
        <header className="bg-card/95 backdrop-blur border-b border-border px-6 py-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-xl font-bold tracking-tight">STEP → GA Drawings</h1>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  HD colored 3D
                </span>
                <span className="text-border">·</span>
                <span>One A3 sheet · Front · Plan · BOM · Iso</span>
              </p>
            </div>
            {status === "ready" && (
              <button
                type="button"
                onClick={() => downloadStepPartDrawingPdf(fileName, meshes, root)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold shadow-md"
              >
                <Download className="w-4 h-4" />
                Download single-sheet PDF
              </button>
            )}
          </div>
        </header>

        {status === "idle" && (
          <div
            className={`flex-1 flex flex-col items-center justify-center p-10 m-8 border-2 border-dashed rounded-3xl transition-all ${
              isDragging
                ? "border-sky-500 bg-sky-500/5 scale-[1.01]"
                : "border-border bg-card/50"
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-5">
              <FileBox className="w-10 h-10 text-sky-600" />
            </div>
            <p className="text-lg font-semibold">Drop STEP / STP assembly</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6 text-center max-w-lg">
              Generates a WTT-style fabrication GA sheet: front and plan views with mm dimensions,
              BOM table, and colored isometric with item balloons — exported as PDF.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".step,.stp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>
        )}

        {status === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-rose-600 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/30 px-4 py-3 border border-rose-200 dark:border-rose-900">
              {error}
            </p>
          </div>
        )}

        {status === "ready" && meta && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="w-[300px] shrink-0 border-r border-border flex flex-col bg-card/80 backdrop-blur">
              <div className="p-4 border-b border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drawing</p>
                <p className="font-semibold text-sm leading-snug">{meta.number}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{meta.title}</p>
                <div className="flex gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <Layers className="w-3 h-3" />
                    {parts.length} parts
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                    <Grid3X3 className="w-3 h-3" />
                    {parts.length} items
                  </span>
                </div>
              </div>
              <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Parts
              </p>
              <div className="overflow-y-auto flex-1 px-2 pb-3 space-y-2">
                {parts.map(p => (
                  <button
                    key={p.meshIndex}
                    type="button"
                    onClick={() => { setSelected(p); setViewTab("detail"); }}
                    className={`w-full text-left rounded-xl border overflow-hidden transition-all ${
                      selected?.meshIndex === p.meshIndex
                        ? "border-sky-500 ring-2 ring-sky-500/20 shadow-md"
                        : "border-border hover:border-sky-300/60 hover:shadow-sm"
                    }`}
                  >
                    <div className="h-24 bg-slate-100 relative">
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
                        className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white shadow"
                        style={{ background: partColorCss(p.meshIndex) }}
                      />
                    </div>
                    <div className="p-2.5 bg-card">
                      <p className="font-semibold text-xs truncate">{p.partNo}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{boundsSummary(p.bounds)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
              <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewTab("assembly")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewTab === "assembly"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Fabrication sheet
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("detail")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewTab === "detail"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Part 3D views
                </button>
              </div>

              <div className="p-5 flex-1">
                {viewTab === "assembly" ? (
                  <div className="max-w-[1200px] mx-auto space-y-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Preview matches the downloaded PDF — one A3 page, sheet 1 of 1.
                    </p>
                    <FabricationSheetPreview
                      meshes={meshes}
                      parts={parts}
                      drawingNumber={meta.number}
                      drawingTitle={meta.title}
                      onSelectPart={p => { setSelected(p); setViewTab("detail"); }}
                    />
                  </div>
                ) : selected ? (
                  <div className="max-w-6xl mx-auto space-y-5">
                    <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
                      <h2 className="text-lg font-bold">{selected.partNo}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{selected.name}</p>
                      <p className="text-xs text-muted-foreground mt-2">{boundsSummary(selected.bounds)}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(
                        [
                          { view: "iso" as const, label: "Isometric" },
                          { view: "front" as const, label: "Front" },
                          { view: "top" as const, label: "Top" },
                        ] as const
                      ).map(({ view, label }) => (
                        <div
                          key={view}
                          className="rounded-2xl border-2 border-slate-700 bg-white shadow-lg overflow-hidden"
                        >
                          <div className="bg-slate-700 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider text-center">
                            {label} — colored 3D
                          </div>
                          <ShadedMeshImage
                            meshes={meshes}
                            meshIndices={selectedIndices}
                            view={view}
                            width={HD_PART.width}
                            height={HD_PART.height}
                            pixelRatio={2}
                            className="aspect-[4/3]"
                            label={label}
                            alt={`${selected.partNo} ${label}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-16">
                    Select a part from the list or BOM.
                  </p>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </Layout>
  );
}
