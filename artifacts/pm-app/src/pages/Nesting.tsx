import { useState, useRef, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { runNesting, Part, NestingResult, PlacedPart } from "@/lib/nestingAlgorithm";
import { parseDxfFile, parseSvgFile, readDwgFileInfo, DwgFileInfo } from "@/lib/dxfParser";
import {
  Upload, Plus, Trash2, Play, Download, ChevronLeft, ChevronRight,
  RotateCw, Info, AlertTriangle, CheckCircle, Layers, Package,
  FileText, Settings2, ZoomIn, ZoomOut, Maximize2, X, FileX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DwgDialogEntry {
  info: DwgFileInfo;
  name: string;
  width: number;
  height: number;
  quantity: number;
}

function DwgImportDialog({
  entries,
  onConfirm,
  onCancel,
}: {
  entries: DwgDialogEntry[];
  onConfirm: (entries: DwgDialogEntry[]) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState<DwgDialogEntry[]>(entries);

  const update = (idx: number, changes: Partial<DwgDialogEntry>) =>
    setLocal(l => l.map((e, i) => (i === idx ? { ...e, ...changes } : e)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <FileX size={16} className="text-amber-400" /> DWG File Import
            </h2>
            <p className="text-white/50 text-xs mt-0.5">
              DWG binary geometry cannot be auto-extracted in the browser. Enter part dimensions below.
            </p>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {local.map((entry, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded font-mono">
                  {entry.info.versionName}
                </div>
                <span className="text-white/50 text-xs truncate">{entry.info.fileName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="text-xs text-white/50 mb-1 block">Part Name</label>
                  <input
                    value={entry.name}
                    onChange={e => update(idx, { name: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Width (mm)</label>
                  <input
                    type="number" value={entry.width} min={1}
                    onChange={e => update(idx, { width: Number(e.target.value) })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Height (mm)</label>
                  <input
                    type="number" value={entry.height} min={1}
                    onChange={e => update(idx, { height: Number(e.target.value) })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Quantity</label>
                  <input
                    type="number" value={entry.quantity} min={1}
                    onChange={e => update(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-300/70 bg-amber-500/10 rounded-lg px-3 py-2">
                <Info size={11} />
                Open in AutoCAD/LibreCAD → check part dimensions → enter above.
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button onClick={onCancel} className="px-4 py-2 text-white/60 hover:text-white text-sm">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(local)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium"
          >
            Add {local.length} Part{local.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

const SHEET_PRESETS = [
  { label: "A4 (210×297 mm)", width: 210, height: 297 },
  { label: "A3 (297×420 mm)", width: 297, height: 420 },
  { label: "A2 (420×594 mm)", width: 420, height: 594 },
  { label: "A1 (594×841 mm)", width: 594, height: 841 },
  { label: "A0 (841×1189 mm)", width: 841, height: 1189 },
  { label: '4×8 ft Sheet (1220×2440 mm)', width: 1220, height: 2440 },
  { label: '5×10 ft Sheet (1524×3048 mm)', width: 1524, height: 3048 },
  { label: "Custom", width: 0, height: 0 },
];

const PART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#059669", "#d97706",
];

let partCounter = 0;

function newPart(): Part {
  partCounter++;
  return {
    id: `manual-${partCounter}-${Date.now()}`,
    name: `Part ${partCounter}`,
    width: 100,
    height: 80,
    quantity: 1,
    color: PART_COLORS[(partCounter - 1) % PART_COLORS.length],
  };
}

interface SheetCanvasProps {
  sheet: { width: number; height: number; placedParts: PlacedPart[] };
  selectedPartId: string | null;
  onSelect: (id: string | null) => void;
}

function SheetCanvas({ sheet, selectedPartId, onSelect }: SheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const fitScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 40) / sheet.width;
    const scaleY = (clientHeight - 40) / sheet.height;
    return Math.min(scaleX, scaleY);
  }, [sheet.width, sheet.height]);

  useEffect(() => {
    const scale = fitScale() ?? 1;
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  }, [fitScale, sheet]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, cw, ch);

    const offsetX = (cw - sheet.width * zoom) / 2 + pan.x;
    const offsetY = (ch - sheet.height * zoom) / 2 + pan.y;

    ctx.fillStyle = "#1e1e2e";
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offsetX, offsetY, sheet.width * zoom, sheet.height * zoom);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, sheet.width * zoom, sheet.height * zoom);

    for (const part of sheet.placedParts) {
      const px = offsetX + part.x * zoom;
      const py = offsetY + part.y * zoom;
      const pw = part.width * zoom;
      const ph = part.height * zoom;

      const isSelected = selectedPartId === part.partId;

      ctx.fillStyle = part.color + "cc";
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = isSelected ? "#ffffff" : part.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(px, py, pw, ph);

      if (part.rotated) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.max(8, Math.min(10, pw / 4))}px sans-serif`;
        ctx.fillText("↺", px + 2, py + 12);
      }

      if (pw > 30 && ph > 16) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `bold ${Math.max(8, Math.min(11, pw / 5))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = part.name.length > 10 ? part.name.slice(0, 9) + "…" : part.name;
        ctx.fillText(label, px + pw / 2, py + ph / 2);
        if (ph > 28) {
          ctx.font = `${Math.max(7, Math.min(9, pw / 6))}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(`${part.width}×${part.height}`, px + pw / 2, py + ph / 2 + 12);
        }
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${sheet.width} mm`, offsetX + sheet.width * zoom / 2 - 20, offsetY + sheet.height * zoom + 14);
    ctx.save();
    ctx.translate(offsetX - 14, offsetY + sheet.height * zoom / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${sheet.height} mm`, -18, 0);
    ctx.restore();
  }, [sheet, zoom, pan, selectedPartId, fitScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) {
      setIsDragging(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(10, z - e.deltaY * 0.001)));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cw = canvasRef.current.offsetWidth;
    const ch = canvasRef.current.offsetHeight;
    const offsetX = (cw - sheet.width * zoom) / 2 + pan.x;
    const offsetY = (ch - sheet.height * zoom) / 2 + pan.y;
    const mx = (e.clientX - rect.left - offsetX) / zoom;
    const my = (e.clientY - rect.top - offsetY) / zoom;

    let found: PlacedPart | null = null;
    for (let i = sheet.placedParts.length - 1; i >= 0; i--) {
      const p = sheet.placedParts[i];
      if (mx >= p.x && mx <= p.x + p.width && my >= p.y && my <= p.y + p.height) {
        found = p;
        break;
      }
    }
    onSelect(found ? found.partId : null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#1e1e2e] rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={() => setZoom(z => Math.min(10, z * 1.2))}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"
        ><ZoomIn size={14} /></button>
        <button
          onClick={() => setZoom(z => Math.max(0.05, z / 1.2))}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"
        ><ZoomOut size={14} /></button>
        <button
          onClick={() => { setZoom(fitScale() ?? 1); setPan({ x: 0, y: 0 }); }}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white"
        ><Maximize2 size={14} /></button>
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-white/40">
        Scroll to zoom · Alt+drag to pan · Click part to select
      </div>
    </div>
  );
}

export default function Nesting() {
  const [parts, setParts] = useState<Part[]>([newPart()]);
  const [sheetPreset, setSheetPreset] = useState(0);
  const [sheetW, setSheetW] = useState(SHEET_PRESETS[0].width);
  const [sheetH, setSheetH] = useState(SHEET_PRESETS[0].height);
  const [padding, setPadding] = useState(2);
  const [allowRotation] = useState(true);
  const [result, setResult] = useState<NestingResult | null>(null);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "results">("config");
  const [dwgDialog, setDwgDialog] = useState<DwgDialogEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetChange = (idx: number) => {
    setSheetPreset(idx);
    if (SHEET_PRESETS[idx].width > 0) {
      setSheetW(SHEET_PRESETS[idx].width);
      setSheetH(SHEET_PRESETS[idx].height);
    }
  };

  const addPart = () => setParts(p => [...p, newPart()]);

  const removePart = (id: string) => setParts(p => p.filter(x => x.id !== id));

  const updatePart = (id: string, changes: Partial<Part>) =>
    setParts(p => p.map(x => x.id === id ? { ...x, ...changes } : x));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const newParts: Part[] = [];
    const dwgEntries: DwgDialogEntry[] = [];

    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "dxf") {
          const parsed = await parseDxfFile(file);
          parsed.forEach((p, i) => {
            p.color = PART_COLORS[(parts.length + newParts.length + i) % PART_COLORS.length];
          });
          newParts.push(...parsed);
        } else if (ext === "svg") {
          const parsed = await parseSvgFile(file);
          parsed.forEach((p, i) => {
            p.color = PART_COLORS[(parts.length + newParts.length + i) % PART_COLORS.length];
          });
          newParts.push(...parsed);
        } else if (ext === "dwg") {
          const info = await readDwgFileInfo(file);
          const baseName = file.name.replace(/\.dwg$/i, "");
          dwgEntries.push({ info, name: baseName, width: 100, height: 100, quantity: 1 });
        } else {
          setError(`Unsupported format: ${ext?.toUpperCase()}. Supported: DWG, DXF, SVG`);
        }
      } catch (e: any) {
        setError(e.message ?? "Failed to parse file.");
      }
    }

    if (newParts.length > 0) {
      setParts(p => [...p, ...newParts]);
      setActiveTab("config");
    }

    if (dwgEntries.length > 0) {
      setDwgDialog(dwgEntries);
    }
  };

  const confirmDwgImport = (entries: DwgDialogEntry[]) => {
    const newParts: Part[] = entries.map((e, i) => ({
      id: `dwg-${Date.now()}-${i}`,
      name: e.name,
      width: e.width,
      height: e.height,
      quantity: e.quantity,
      color: PART_COLORS[(parts.length + i) % PART_COLORS.length],
      sourceFile: e.info.fileName,
    }));
    setParts(p => [...p, ...newParts]);
    setDwgDialog(null);
    setActiveTab("config");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const runNest = async () => {
    const validParts = parts.filter(p => p.width > 0 && p.height > 0 && p.quantity > 0);
    if (validParts.length === 0) { setError("Add at least one valid part."); return; }
    if (sheetW <= 0 || sheetH <= 0) { setError("Invalid sheet dimensions."); return; }
    setRunning(true);
    setError(null);
    await new Promise(r => setTimeout(r, 20));
    const res = runNesting(validParts, sheetW, sheetH, allowRotation, padding);
    setResult(res);
    setCurrentSheet(0);
    setSelectedPartId(null);
    setActiveTab("results");
    setRunning(false);
  };

  const exportReport = () => {
    if (!result) return;
    const lines: string[] = [
      "NESTING REPORT",
      "==============",
      `Generated: ${new Date().toLocaleString()}`,
      `Sheet Size: ${sheetW} × ${sheetH} mm`,
      `Sheets Used: ${result.sheets.length}`,
      `Total Parts: ${result.totalParts}`,
      `Placed Parts: ${result.placedCount}`,
      `Material Utilization: ${result.utilizationPercent.toFixed(1)}%`,
      `Material Waste: ${result.wastePercent.toFixed(1)}%`,
      `Total Sheet Area: ${result.totalSheetArea.toLocaleString()} mm²`,
      `Used Area: ${result.totalUsedArea.toLocaleString()} mm²`,
      "",
      "PARTS LIST",
      "----------",
    ];
    parts.forEach(p => {
      lines.push(`${p.name}: ${p.width}×${p.height} mm × ${p.quantity} pcs`);
    });
    if (result.unplacedParts.length > 0) {
      lines.push("", "UNPLACED PARTS", "--------------");
      result.unplacedParts.forEach(u => {
        lines.push(`${u.part.name}: ${u.remaining} pcs could not be placed`);
      });
    }
    lines.push("", "SHEET BREAKDOWN", "---------------");
    result.sheets.forEach(s => {
      lines.push(`Sheet ${s.index + 1}: ${s.placedParts.length} parts, ${s.utilization.toFixed(1)}% utilization`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nesting-report.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSvg = () => {
    if (!result || !result.sheets[currentSheet]) return;
    const s = result.sheets[currentSheet];
    const svgLines = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">`,
      `<rect width="${s.width}" height="${s.height}" fill="white" stroke="#ccc" stroke-width="1"/>`,
      ...s.placedParts.map(p =>
        `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="${p.color}88" stroke="${p.color}" stroke-width="0.5">` +
        `<title>${p.name} (${p.width}×${p.height} mm${p.rotated ? ", rotated" : ""})</title></rect>` +
        `<text x="${p.x + p.width / 2}" y="${p.y + p.height / 2}" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="white" font-weight="bold">${p.name}</text>`
      ),
      `</svg>`,
    ];
    const blob = new Blob([svgLines.join("\n")], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nesting-sheet-${currentSheet + 1}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedPart = selectedPartId ? parts.find(p => p.id === selectedPartId) : null;
  const sheetData = result?.sheets[currentSheet];

  const statCard = (label: string, value: string, sub?: string, color?: string) => (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className={cn("text-xl font-bold", color ?? "text-white")}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0 p-4 gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers size={22} className="text-indigo-400" /> Nesting Module
            </h1>
            <p className="text-white/50 text-sm mt-0.5">Optimize material usage by nesting flat parts on sheets</p>
          </div>
          <div className="flex gap-2">
            {result && (
              <>
                <button onClick={exportSvg} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition">
                  <Download size={14} /> SVG
                </button>
                <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition">
                  <FileText size={14} /> Report
                </button>
              </>
            )}
            <button
              onClick={runNest}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition"
            >
              {running ? <RotateCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? "Running…" : "Run Nesting"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm flex-shrink-0">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-2 flex-shrink-0">
          {(["config", "results"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize",
                activeTab === tab ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              {tab === "config" ? "Configuration & Parts" : "Nesting Results"}
              {tab === "results" && result && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">{result.sheets.length} sheets</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "config" && (
            <div className="h-full overflow-y-auto pr-1 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Settings2 size={15} className="text-indigo-400" /> Sheet Configuration
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-xs text-white/50 mb-1 block">Preset</label>
                    <select
                      value={sheetPreset}
                      onChange={e => handlePresetChange(Number(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      {SHEET_PRESETS.map((p, i) => (
                        <option key={i} value={i} className="bg-[#1e1e2e]">{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Width (mm)</label>
                    <input
                      type="number" value={sheetW} min={1}
                      onChange={e => { setSheetW(Number(e.target.value)); setSheetPreset(SHEET_PRESETS.length - 1); }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Height (mm)</label>
                    <input
                      type="number" value={sheetH} min={1}
                      onChange={e => { setSheetH(Number(e.target.value)); setSheetPreset(SHEET_PRESETS.length - 1); }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Spacing / Padding (mm)</label>
                    <input
                      type="number" value={padding} min={0} max={50}
                      onChange={e => setPadding(Number(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer",
                  isDragOver ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 hover:border-white/40"
                )}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={28} className="mx-auto text-white/40 mb-2" />
                <p className="text-white/60 text-sm">Drop DWG, DXF, or SVG files here, or click to browse</p>
                <p className="text-white/30 text-xs mt-1">DXF/SVG: parts auto-extracted · DWG: enter dimensions in dialog</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".dxf,.svg,.dwg"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Package size={15} className="text-amber-400" /> Parts List
                    <span className="text-white/40 font-normal text-xs">({parts.length} parts, {parts.reduce((s, p) => s + p.quantity, 0)} pcs total)</span>
                  </h2>
                  <button
                    onClick={addPart}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition"
                  >
                    <Plus size={12} /> Add Part
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs text-white/40 px-2">
                    <span>Name</span><span>Width (mm)</span><span>Height (mm)</span><span>Qty</span><span></span>
                  </div>
                  {parts.map((part) => (
                    <div key={part.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center bg-white/5 rounded-lg px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: part.color ?? "#6366f1" }}
                        />
                        <input
                          value={part.name}
                          onChange={e => updatePart(part.id, { name: e.target.value })}
                          className="bg-transparent text-white text-sm w-full focus:outline-none"
                        />
                        {part.sourceFile && (
                          <span className="text-xs text-white/30 truncate max-w-[80px]" title={part.sourceFile}>{part.sourceFile}</span>
                        )}
                      </div>
                      <input
                        type="number" value={part.width} min={1}
                        onChange={e => updatePart(part.id, { width: Number(e.target.value) })}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-full"
                      />
                      <input
                        type="number" value={part.height} min={1}
                        onChange={e => updatePart(part.id, { height: Number(e.target.value) })}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-full"
                      />
                      <input
                        type="number" value={part.quantity} min={1}
                        onChange={e => updatePart(part.id, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm w-full"
                      />
                      <button onClick={() => removePart(part.id)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="h-full flex flex-col gap-3 min-h-0">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                  <Layers size={48} className="mb-3 opacity-30" />
                  <p className="text-lg">No results yet</p>
                  <p className="text-sm mt-1">Configure parts and click "Run Nesting"</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 flex-shrink-0">
                    {statCard("Sheets Used", String(result.sheets.length), "sheets of material")}
                    {statCard("Parts Placed", `${result.placedCount}/${result.totalParts}`, "instances placed")}
                    {statCard("Utilization", `${result.utilizationPercent.toFixed(1)}%`, "material used",
                      result.utilizationPercent >= 75 ? "text-emerald-400" : result.utilizationPercent >= 50 ? "text-amber-400" : "text-red-400")}
                    {statCard("Waste", `${result.wastePercent.toFixed(1)}%`, "material wasted",
                      result.wastePercent <= 25 ? "text-emerald-400" : result.wastePercent <= 50 ? "text-amber-400" : "text-red-400")}
                    {statCard("Total Area", `${(result.totalSheetArea / 1000).toFixed(1)} cm²`, `${result.totalSheetArea.toLocaleString()} mm²`)}
                    {statCard("Used Area", `${(result.totalUsedArea / 1000).toFixed(1)} cm²`, `${result.totalUsedArea.toLocaleString()} mm²`)}
                  </div>

                  {result.unplacedParts.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 text-sm flex-shrink-0">
                      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Some parts could not be placed: </span>
                        {result.unplacedParts.map(u => `${u.part.name} (${u.remaining} pcs)`).join(", ")}.
                        Parts may be too large for the sheet.
                      </div>
                    </div>
                  )}

                  {result.unplacedParts.length === 0 && result.placedCount === result.totalParts && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm flex-shrink-0">
                      <CheckCircle size={15} /> All {result.totalParts} parts successfully placed across {result.sheets.length} sheet{result.sheets.length !== 1 ? "s" : ""}.
                    </div>
                  )}

                  <div className="flex-1 min-h-0 flex gap-3">
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={currentSheet === 0}
                            onClick={() => setCurrentSheet(s => s - 1)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded"
                          ><ChevronLeft size={14} /></button>
                          <span className="text-white text-sm">
                            Sheet {currentSheet + 1} of {result.sheets.length}
                          </span>
                          <button
                            disabled={currentSheet === result.sheets.length - 1}
                            onClick={() => setCurrentSheet(s => s + 1)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded"
                          ><ChevronRight size={14} /></button>
                        </div>
                        <div className="text-xs text-white/50">
                          {sheetData?.placedParts.length} parts · {sheetData?.utilization.toFixed(1)}% utilization
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        {sheetData && (
                          <SheetCanvas
                            sheet={sheetData}
                            selectedPartId={selectedPartId}
                            onSelect={setSelectedPartId}
                          />
                        )}
                      </div>
                    </div>

                    <div className="w-56 flex flex-col gap-2 flex-shrink-0 overflow-y-auto">
                      {selectedPart && (
                        <div className="bg-indigo-500/20 border border-indigo-500/40 rounded-xl p-3 flex-shrink-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: selectedPart.color }} />
                            <span className="text-white font-semibold text-sm">{selectedPart.name}</span>
                          </div>
                          <div className="space-y-1 text-xs text-white/60">
                            <div className="flex justify-between"><span>Size:</span><span className="text-white">{selectedPart.width}×{selectedPart.height} mm</span></div>
                            <div className="flex justify-between"><span>Area:</span><span className="text-white">{(selectedPart.width * selectedPart.height).toLocaleString()} mm²</span></div>
                            <div className="flex justify-between"><span>Qty:</span><span className="text-white">{selectedPart.quantity} pcs</span></div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-shrink-0">
                        <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">Sheet {currentSheet + 1} Parts</h3>
                        <div className="space-y-1">
                          {sheetData?.placedParts.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedPartId(p.partId === selectedPartId ? null : p.partId)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition",
                                p.partId === selectedPartId ? "bg-indigo-500/30 text-white" : "hover:bg-white/10 text-white/70"
                              )}
                            >
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-xs truncate flex-1">{p.name}</span>
                              {p.rotated && <RotateCw size={10} className="text-white/40" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">All Sheets</h3>
                        <div className="space-y-1.5">
                          {result.sheets.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentSheet(i)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition",
                                i === currentSheet ? "bg-indigo-500/30 text-white" : "hover:bg-white/10 text-white/60"
                              )}
                            >
                              <span>Sheet {i + 1}</span>
                              <div className="flex items-center gap-2">
                                <span>{s.placedParts.length} pcs</span>
                                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.utilization}%`,
                                      backgroundColor: s.utilization >= 75 ? "#10b981" : s.utilization >= 50 ? "#f59e0b" : "#ef4444",
                                    }}
                                  />
                                </div>
                                <span>{s.utilization.toFixed(0)}%</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide flex items-center gap-1">
                          <Info size={11} /> Legend
                        </h3>
                        <div className="space-y-1">
                          {parts.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-xs text-white/60 truncate">{p.name}</span>
                              <span className="text-xs text-white/30 ml-auto">×{p.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {dwgDialog && (
        <DwgImportDialog
          entries={dwgDialog}
          onConfirm={confirmDwgImport}
          onCancel={() => setDwgDialog(null)}
        />
      )}
    </Layout>
  );
}
