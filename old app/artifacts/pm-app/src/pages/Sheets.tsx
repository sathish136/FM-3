import { Layout } from "@/components/Layout";
import {
  Plus, Trash2, FileSpreadsheet, Download,
  ChevronDown, Loader2, Pencil, Check, X, Upload, Share2, Mail, ArrowLeft,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, Fragment, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import * as XLSX from "xlsx";
import HyperFormula from "hyperformula";

const BASE = "/api";

type CellKey = string;
type CellData = Record<CellKey, string>;
type CellFormat = { bold?: boolean; textColor?: string; bgColor?: string };
type CellFormats = Record<CellKey, CellFormat>;

interface Tab {
  id: string;
  name: string;
  cells: CellData;
  formats: CellFormats;
  rows: number;
  cols: number;
}

interface SpreadsheetData {
  tabs: Tab[];
  activeTab: string;
}

interface Spreadsheet {
  id: number;
  name: string;
  projectId: number | null;
  data: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;
const COL_W = 100;
const ROW_H = 24;
const ROW_HDR = 40;
const COL_HDR = 24;

function colLetter(n: number): string {
  let s = "";
  n = n + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function parseData(raw: string): SpreadsheetData {
  try {
    const d = JSON.parse(raw);
    if (d?.tabs?.length) {
      return {
        ...d,
        tabs: d.tabs.map((t: Tab) => ({
          ...t,
          cells: t.cells ?? {},
          formats: t.formats ?? {},
          rows: t.rows ?? DEFAULT_ROWS,
          cols: t.cols ?? DEFAULT_COLS,
        })),
      };
    }
  } catch {}
  return {
    tabs: [{ id: "tab_1", name: "Sheet 1", cells: {}, formats: {}, rows: DEFAULT_ROWS, cols: DEFAULT_COLS }],
    activeTab: "tab_1",
  };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function selectionRange(selStart: { r: number; c: number } | null, selEnd: { r: number; c: number } | null) {
  if (!selStart) return null;
  const end = selEnd ?? selStart;
  return {
    rMin: Math.min(selStart.r, end.r),
    rMax: Math.max(selStart.r, end.r),
    cMin: Math.min(selStart.c, end.c),
    cMax: Math.max(selStart.c, end.c),
  };
}

function isCellInRange(r: number, c: number, range: ReturnType<typeof selectionRange>) {
  if (!range) return false;
  return r >= range.rMin && r <= range.rMax && c >= range.cMin && c <= range.cMax;
}

function useFormulaEngine(cells: CellData, rows: number, cols: number) {
  return useMemo(() => {
    const grid: (string | number | boolean | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: (string | number | boolean | null)[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(cells[cellKey(r, c)] ?? null);
      }
      grid.push(row);
    }
    try {
      const hf = HyperFormula.buildFromArray(grid, { licenseKey: "gpl-v3" });
      return {
        getCellDisplayValue: (r: number, c: number): string => {
          const raw = cells[cellKey(r, c)];
          if (!raw) return "";
          if (raw.startsWith("=")) {
            const val = hf.getCellValue({ row: r, col: c, sheet: 0 });
            if (val instanceof Error) return `#ERR`;
            if (val === null || val === undefined) return "";
            return String(val);
          }
          return raw;
        },
      };
    } catch {
      return { getCellDisplayValue: (r: number, c: number) => cells[cellKey(r, c)] ?? "" };
    }
  }, [cells, rows, cols]);
}

function exportExcel(tabs: Tab[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const tab of tabs) {
    const data: (string | number | null)[][] = [];
    for (let r = 0; r < tab.rows; r++) {
      const row: (string | number | null)[] = [];
      let hasVal = false;
      for (let c = 0; c < tab.cols; c++) {
        const v = tab.cells[cellKey(r, c)] ?? null;
        row.push(v === "" ? null : v);
        if (v) hasVal = true;
      }
      if (hasVal || data.length > 0) data.push(row);
    }
    while (data.length > 0 && data[data.length - 1].every(v => !v)) data.pop();
    const ws = XLSX.utils.aoa_to_sheet(data.length ? data : [[]]);
    XLSX.utils.book_append_sheet(wb, ws, tab.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function importFile(file: File, onImport: (tabs: Tab[]) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: "array", cellFormula: true });
    const tabs: Tab[] = wb.SheetNames.map((name, idx) => {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, defval: null });
      const cells: CellData = {};
      let maxRow = 0, maxCol = 0;
      aoa.forEach((row, ri) => {
        (row as (string | number | boolean | null)[]).forEach((val, ci) => {
          if (val !== null && val !== undefined && val !== "") {
            const wsCell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })];
            cells[cellKey(ri, ci)] = wsCell?.f ? `=${wsCell.f}` : String(val);
            maxRow = Math.max(maxRow, ri + 1);
            maxCol = Math.max(maxCol, ci + 1);
          }
        });
      });
      return {
        id: `tab_import_${idx}_${Date.now()}`,
        name,
        cells,
        formats: {},
        rows: Math.max(maxRow + 10, DEFAULT_ROWS),
        cols: Math.max(maxCol + 5, DEFAULT_COLS),
      };
    });
    if (tabs.length > 0) onImport(tabs);
  };
  reader.readAsArrayBuffer(file);
}

// ─── Formatting Toolbar ─────────────────────────────────────────────────────
const TEXT_COLORS = ["#000000", "#dc2626", "#16a34a", "#2563eb", "#9333ea", "#ea580c", "#0891b2", "#ffffff"];
const BG_COLORS = ["transparent", "#fef08a", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fed7aa", "#fecaca", "#f1f5f9"];

function FormattingToolbar({
  selRange,
  formats,
  onFormat,
}: {
  selRange: ReturnType<typeof selectionRange>;
  formats: CellFormats;
  onFormat: (update: Partial<CellFormat>) => void;
}) {
  const [showTextColors, setShowTextColors] = useState(false);
  const [showBgColors, setShowBgColors] = useState(false);

  const activeFormat: CellFormat = useMemo(() => {
    if (!selRange) return {};
    const key = cellKey(selRange.rMin, selRange.cMin);
    return formats[key] ?? {};
  }, [selRange, formats]);

  return (
    <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-200 bg-white shrink-0">
      {/* Bold */}
      <button
        title="Bold (Ctrl+B)"
        onClick={() => onFormat({ bold: !activeFormat.bold })}
        className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors
          ${activeFormat.bold ? "bg-blue-100 text-blue-700 border border-blue-300" : "hover:bg-gray-100 text-gray-600 border border-transparent"}`}>
        B
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Text color */}
      <div className="relative">
        <button
          title="Text color"
          onClick={() => { setShowTextColors(p => !p); setShowBgColors(false); }}
          className="flex flex-col items-center gap-0 w-7 h-7 justify-center rounded hover:bg-gray-100 border border-transparent transition-colors">
          <span className="text-xs font-bold leading-none" style={{ color: activeFormat.textColor ?? "#000" }}>A</span>
          <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: activeFormat.textColor ?? "#000" }} />
        </button>
        {showTextColors && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-28">
            {TEXT_COLORS.map(c => (
              <button key={c} title={c}
                onClick={() => { onFormat({ textColor: c }); setShowTextColors(false); }}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c === "#ffffff" ? "#f9f9f9" : c, outline: activeFormat.textColor === c ? "2px solid #3b82f6" : undefined }} />
            ))}
          </div>
        )}
      </div>

      {/* Background color */}
      <div className="relative">
        <button
          title="Background color"
          onClick={() => { setShowBgColors(p => !p); setShowTextColors(false); }}
          className="flex flex-col items-center gap-0 w-7 h-7 justify-center rounded hover:bg-gray-100 border border-transparent transition-colors">
          <span className="text-xs font-bold leading-none text-gray-700">H</span>
          <div className="w-4 h-1 rounded-sm mt-0.5 border border-gray-300" style={{ backgroundColor: activeFormat.bgColor === "transparent" || !activeFormat.bgColor ? "#fff" : activeFormat.bgColor }} />
        </button>
        {showBgColors && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-28">
            {BG_COLORS.map(c => (
              <button key={c} title={c === "transparent" ? "None" : c}
                onClick={() => { onFormat({ bgColor: c }); setShowBgColors(false); }}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c === "transparent" ? "#fff" : c, backgroundImage: c === "transparent" ? "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)" : undefined, backgroundSize: c === "transparent" ? "8px 8px" : undefined, backgroundPosition: c === "transparent" ? "0 0,4px 4px" : undefined, outline: activeFormat.bgColor === c ? "2px solid #3b82f6" : undefined }} />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Selection info */}
      {selRange && (
        <span className="text-xs text-gray-400 font-mono px-1">
          {selRange.rMax - selRange.rMin + 1}R × {selRange.cMax - selRange.cMin + 1}C
        </span>
      )}

    </div>
  );
}

// ─── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({ name, onClose }: { name: string; onClose: () => void }) {
  const url = window.location.href;
  const text = `Check out this spreadsheet: ${name}\n${url}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Spreadsheet: ${name}`)}&body=${encodeURIComponent(text)}`;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Share Spreadsheet</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-xs text-gray-500 mb-3 truncate">{name}</p>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          <span className="text-xs text-gray-500 flex-1 truncate">{url}</span>
          <button onClick={copyLink} className="text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <a href={mailUrl}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Mail className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Share via Email</p>
              <p className="text-xs text-gray-400">Opens your email client</p>
            </div>
          </a>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            <div>
              <p className="text-sm font-medium text-gray-800">Share via WhatsApp</p>
              <p className="text-xs text-gray-400">Opens WhatsApp Web</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Spreadsheet Grid ───────────────────────────────────────────────────────
function SpreadsheetGrid({ tab, onChange, onFormatChange }: {
  tab: Tab;
  onChange: (cells: CellData) => void;
  onFormatChange: (formats: CellFormats) => void;
}) {
  const [selStart, setSelStart] = useState<{ r: number; c: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { cells, formats, rows, cols } = tab;

  const { getCellDisplayValue } = useFormulaEngine(cells, rows, cols);

  const range = selectionRange(selStart, selEnd);
  const anchor = selStart;

  const getRawVal = (r: number, c: number) => cells[cellKey(r, c)] ?? "";
  const getFmt = (r: number, c: number): CellFormat => formats[cellKey(r, c)] ?? {};

  const commitEdit = useCallback((r: number, c: number, val: string) => {
    const key = cellKey(r, c);
    const updated = { ...cells };
    if (val === "") delete updated[key];
    else updated[key] = val;
    onChange(updated);
    setEditing(false);
  }, [cells, onChange]);

  const startEdit = (r: number, c: number, initial?: string) => {
    setSelStart({ r, c });
    setSelEnd(null);
    setEditing(true);
    setEditVal(initial !== undefined ? initial : getRawVal(r, c));
    setTimeout(() => {
      inputRef.current?.focus();
      if (initial === undefined) inputRef.current?.select();
    }, 0);
  };

  const applyFormat = useCallback((update: Partial<CellFormat>) => {
    if (!range) return;
    const updated = { ...formats };
    for (let r = range.rMin; r <= range.rMax; r++) {
      for (let c = range.cMin; c <= range.cMax; c++) {
        const key = cellKey(r, c);
        updated[key] = { ...(updated[key] ?? {}), ...update };
        if (!updated[key].bold && !updated[key].textColor && !updated[key].bgColor) delete updated[key];
      }
    }
    onFormatChange(updated);
  }, [range, formats, onFormatChange]);

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (editing && anchor) commitEdit(anchor.r, anchor.c, editVal);
    if (e.shiftKey && selStart) {
      setSelEnd({ r, c });
      return;
    }
    setSelStart({ r, c });
    setSelEnd(null);
    setEditing(false);
    setIsDragging(true);
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (isDragging) setSelEnd({ r, c });
  };

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!anchor) return;
    const { r, c } = anchor;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        const curFmt = formats[cellKey(r, c)] ?? {};
        applyFormat({ bold: !curFmt.bold });
        return;
      }
    }

    if (editing) {
      if (e.key === "Enter") { e.preventDefault(); commitEdit(r, c, editVal); setSelStart({ r: Math.min(r + 1, rows - 1), c }); setSelEnd(null); }
      else if (e.key === "Tab") { e.preventDefault(); commitEdit(r, c, editVal); setSelStart({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, cols - 1) }); setSelEnd(null); }
      else if (e.key === "Escape") { setEditing(false); setEditVal(getRawVal(r, c)); }
      return;
    }

    if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(r, c); }
    else if (e.key === "Delete" || e.key === "Backspace") { commitEdit(r, c, ""); }
    else if (e.key === "ArrowUp") { e.preventDefault(); const nr = Math.max(r - 1, 0); if (e.shiftKey) { setSelEnd({ r: nr, c: selEnd?.c ?? c }); } else { setSelStart({ r: nr, c }); setSelEnd(null); } }
    else if (e.key === "ArrowDown") { e.preventDefault(); const nr = Math.min(r + 1, rows - 1); if (e.shiftKey) { setSelEnd({ r: nr, c: selEnd?.c ?? c }); } else { setSelStart({ r: nr, c }); setSelEnd(null); } }
    else if (e.key === "ArrowLeft") { e.preventDefault(); const nc = Math.max(c - 1, 0); if (e.shiftKey) { setSelEnd({ r: selEnd?.r ?? r, c: nc }); } else { setSelStart({ r, c: nc }); setSelEnd(null); } }
    else if (e.key === "ArrowRight") { e.preventDefault(); const nc = Math.min(c + 1, cols - 1); if (e.shiftKey) { setSelEnd({ r: selEnd?.r ?? r, c: nc }); } else { setSelStart({ r, c: nc }); setSelEnd(null); } }
    else if (e.key === "Tab") { e.preventDefault(); setSelStart({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, cols - 1) }); setSelEnd(null); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { startEdit(r, c, e.key); }
  };

  const formulaBarVal = anchor ? (editing ? editVal : getRawVal(anchor.r, anchor.c)) : "";

  const rangeLabel = anchor
    ? range && (range.rMax > range.rMin || range.cMax > range.cMin)
      ? `${colLetter(range.cMin)}${range.rMin + 1}:${colLetter(range.cMax)}${range.rMax + 1}`
      : `${colLetter(anchor.c)}${anchor.r + 1}`
    : "";

  return (
    <>
      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="w-24 text-center text-xs font-mono bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
          {rangeLabel}
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <span className="text-gray-400 text-sm font-bold select-none">fx</span>
        <input
          className="flex-1 text-sm font-mono bg-white border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          value={formulaBarVal}
          onChange={e => { if (anchor) { if (!editing) setEditing(true); setEditVal(e.target.value); } }}
          onFocus={() => { if (anchor && !editing) { setEditing(true); setEditVal(getRawVal(anchor.r, anchor.c)); } }}
          onBlur={() => { if (editing && anchor) commitEdit(anchor.r, anchor.c, editVal); }}
          onKeyDown={e => {
            if (!anchor) return;
            if (e.key === "Enter") { e.preventDefault(); commitEdit(anchor.r, anchor.c, editVal); }
            else if (e.key === "Escape") { setEditing(false); setEditVal(getRawVal(anchor.r, anchor.c)); }
          }}
          placeholder="Select a cell or type a formula (e.g. =SUM(A1:A10))"
        />
      </div>

      <FormattingToolbar selRange={range} formats={formats} onFormat={applyFormat} />

      {/* Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto outline-none select-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div style={{ display: "grid", gridTemplateColumns: `${ROW_HDR}px repeat(${cols}, ${COL_W}px)`, width: ROW_HDR + cols * COL_W }}>
          <div style={{ height: COL_HDR }} className="sticky top-0 left-0 z-20 bg-gray-100 border-b border-r border-gray-300" />
          {Array.from({ length: cols }, (_, ci) => (
            <div key={ci} style={{ height: COL_HDR }}
              className={`sticky top-0 z-10 flex items-center justify-center text-xs font-semibold border-b border-r border-gray-200 select-none
                ${range && ci >= range.cMin && ci <= range.cMax ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {colLetter(ci)}
            </div>
          ))}

          {Array.from({ length: rows }, (_, ri) => (
            <Fragment key={ri}>
              <div style={{ height: ROW_H }}
                className={`sticky left-0 z-10 flex items-center justify-center text-xs font-medium border-b border-r border-gray-200 select-none
                  ${range && ri >= range.rMin && ri <= range.rMax ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                {ri + 1}
              </div>
              {Array.from({ length: cols }, (_, ci) => {
                const isAnchor = anchor?.r === ri && anchor?.c === ci;
                const isEditing = isAnchor && editing;
                const inSel = isCellInRange(ri, ci, range);
                const rawVal = getRawVal(ri, ci);
                const displayVal = getCellDisplayValue(ri, ci);
                const fmt = getFmt(ri, ci);
                const isNumeric = displayVal !== "" && !isNaN(Number(displayVal));

                return (
                  <div
                    key={`${ri}-${ci}`}
                    style={{
                      height: ROW_H,
                      backgroundColor: fmt.bgColor && fmt.bgColor !== "transparent" ? fmt.bgColor : undefined,
                    }}
                    className={`relative border-b border-r border-gray-200 text-sm overflow-hidden
                      ${isAnchor ? "ring-2 ring-inset ring-blue-500 z-10" : ""}
                      ${inSel && !isAnchor ? "bg-blue-50" : (!fmt.bgColor || fmt.bgColor === "transparent") ? "bg-white hover:bg-blue-50/20" : ""}`}
                    onMouseDown={(e) => handleCellMouseDown(ri, ci, e)}
                    onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                    onDoubleClick={() => startEdit(ri, ci)}
                    tabIndex={-1}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="absolute inset-0 w-full h-full px-1.5 text-sm font-mono outline-none bg-white z-20"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => commitEdit(ri, ci, editVal)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitEdit(ri, ci, editVal); setSelStart({ r: Math.min(ri + 1, rows - 1), c: ci }); setSelEnd(null); }
                          else if (e.key === "Tab") { e.preventDefault(); commitEdit(ri, ci, editVal); setSelStart({ r: ri, c: e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, cols - 1) }); setSelEnd(null); }
                          else if (e.key === "Escape") { setEditing(false); setEditVal(rawVal); }
                        }}
                      />
                    ) : (
                      <span
                        style={{ color: fmt.textColor, fontWeight: fmt.bold ? "bold" : undefined }}
                        className={`px-1.5 truncate block leading-[24px] ${isNumeric ? "text-right" : "text-left"}`}>
                        {displayVal}
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Tab Bar ────────────────────────────────────────────────────────────────
function TabBar({ tabs, activeId, onSelect, onAdd, onRename, onDelete }: {
  tabs: Tab[]; activeId: string;
  onSelect: (id: string) => void; onAdd: () => void;
  onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const startRename = (tab: Tab) => { setRenamingId(tab.id); setRenameVal(tab.name); };
  const commitRename = () => { if (renamingId && renameVal.trim()) onRename(renamingId, renameVal.trim()); setRenamingId(null); };
  return (
    <div className="flex items-center gap-px border-t border-gray-200 bg-gray-50 px-2 py-1 overflow-x-auto shrink-0">
      {tabs.map(tab => (
        <div key={tab.id}
          className={`group flex items-center gap-1 px-3 py-1 rounded-t text-xs font-medium cursor-pointer select-none border border-b-0 transition-colors
            ${tab.id === activeId ? "bg-white border-gray-300 text-gray-800 shadow-sm" : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"}`}
          onClick={() => onSelect(tab.id)} onDoubleClick={() => startRename(tab)}>
          {renamingId === tab.id ? (
            <input className="w-20 text-xs outline-none bg-transparent border-b border-blue-400"
              value={renameVal} autoFocus onChange={e => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
              onClick={e => e.stopPropagation()} />
          ) : <span>{tab.name}</span>}
          {tabs.length > 1 && (
            <button className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-opacity"
              onClick={e => { e.stopPropagation(); onDelete(tab.id); }} title="Delete sheet">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button onClick={onAdd} className="ml-1 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" title="Add sheet">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Sheets() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const spreadsheetId = params.id ? Number(params.id) : null;

  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
  const [spData, setSpData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renamingSp, setRenamingSp] = useState(false);
  const [spNameVal, setSpNameVal] = useState("");
  const [showShare, setShowShare] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!spreadsheetId) { navigate("/sheets"); return; }
    (async () => {
      setLoading(true);
      try {
        const sp: Spreadsheet = await apiFetch(`/spreadsheets/${spreadsheetId}`).then(r => r.json());
        setSpreadsheet(sp);
        setSpData(parseData(sp.data));
      } catch { navigate("/sheets"); }
      setLoading(false);
    })();
  }, [spreadsheetId]);

  const saveDataFn = useCallback(async (data: SpreadsheetData) => {
    if (!spreadsheetId) return;
    setSaving(true); setSaved(false);
    try {
      await apiFetch(`/spreadsheets/${spreadsheetId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.stringify(data) }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }, [spreadsheetId]);

  const scheduleSave = useCallback((data: SpreadsheetData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDataFn(data), 1500);
  }, [saveDataFn]);

  const updateTab = (updater: (t: Tab) => Tab) => {
    if (!spData) return;
    const updated: SpreadsheetData = { ...spData, tabs: spData.tabs.map(t => t.id === spData.activeTab ? updater(t) : t) };
    setSpData(updated); scheduleSave(updated);
  };

  const activeTab = spData?.tabs.find(t => t.id === spData.activeTab);

  const handleCellChange = (cells: CellData) => updateTab(t => ({ ...t, cells }));
  const handleFormatChange = (formats: CellFormats) => updateTab(t => ({ ...t, formats }));
  const handleTabSelect = (id: string) => { if (spData) setSpData({ ...spData, activeTab: id }); };
  const handleTabAdd = () => {
    if (!spData) return;
    const newId = `tab_${Date.now()}`;
    const updated: SpreadsheetData = { ...spData, tabs: [...spData.tabs, { id: newId, name: `Sheet ${spData.tabs.length + 1}`, cells: {}, formats: {}, rows: DEFAULT_ROWS, cols: DEFAULT_COLS }], activeTab: newId };
    setSpData(updated); scheduleSave(updated);
  };
  const handleTabRename = (id: string, name: string) => {
    if (!spData) return;
    const updated = { ...spData, tabs: spData.tabs.map(t => t.id === id ? { ...t, name } : t) };
    setSpData(updated); scheduleSave(updated);
  };
  const handleTabDelete = (id: string) => {
    if (!spData || spData.tabs.length <= 1) return;
    const remaining = spData.tabs.filter(t => t.id !== id);
    const updated = { tabs: remaining, activeTab: spData.activeTab === id ? remaining[0].id : spData.activeTab };
    setSpData(updated); scheduleSave(updated);
  };
  const renameSpreadsheet = async () => {
    if (!spreadsheetId || !spNameVal.trim()) { setRenamingSp(false); return; }
    await apiFetch(`/spreadsheets/${spreadsheetId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: spNameVal.trim() }) });
    setSpreadsheet(prev => prev ? { ...prev, name: spNameVal.trim() } : prev);
    setRenamingSp(false);
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spData) return;
    importFile(file, (importedTabs) => { const updated: SpreadsheetData = { tabs: importedTabs, activeTab: importedTabs[0].id }; setSpData(updated); scheduleSave(updated); });
    e.target.value = "";
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div></Layout>;
  }

  return (
    <Layout>
      {showShare && spreadsheet && (
        <ShareModal name={spreadsheet.name} onClose={() => setShowShare(false)} />
      )}
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0 flex-wrap">
          {/* Back button */}
          <button onClick={() => navigate("/sheets")}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors" title="Back to Sheets">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-200" />
          <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />

          {/* Spreadsheet name */}
          {renamingSp ? (
            <div className="flex items-center gap-1">
              <input className="text-sm font-semibold border border-blue-400 rounded px-2 py-0.5 outline-none" value={spNameVal} autoFocus onChange={e => setSpNameVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") renameSpreadsheet(); if (e.key === "Escape") setRenamingSp(false); }} />
              <button onClick={renameSpreadsheet} className="p-1 hover:bg-green-50 text-green-600 rounded"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setRenamingSp(false)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <span className="text-sm font-semibold text-gray-800 truncate max-w-56">{spreadsheet?.name ?? "Spreadsheet"}</span>
              <button onClick={() => { setRenamingSp(true); setSpNameVal(spreadsheet?.name ?? ""); }} className="p-1 hover:bg-gray-100 text-gray-400 rounded"><Pencil className="w-3 h-3" /></button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
            {saved && !saving && <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <Upload className="w-3.5 h-3.5" />Import
            </button>
            {spData && (
              <button onClick={() => exportExcel(spData.tabs, spreadsheet?.name ?? "spreadsheet")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <Download className="w-3.5 h-3.5" />Download
              </button>
            )}
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <Share2 className="w-3.5 h-3.5" />Share
            </button>
          </div>
        </div>

        {!spData || !activeTab ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <SpreadsheetGrid tab={activeTab} onChange={handleCellChange} onFormatChange={handleFormatChange} />
            <TabBar tabs={spData.tabs} activeId={spData.activeTab} onSelect={handleTabSelect} onAdd={handleTabAdd} onRename={handleTabRename} onDelete={handleTabDelete} />
          </div>
        )}
      </div>
    </Layout>
  );
}
