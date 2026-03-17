import { Layout } from "@/components/Layout";
import {
  Plus, Trash2, FileSpreadsheet, Download,
  ChevronDown, Loader2, Pencil, Check, X, Upload,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, Fragment, useMemo } from "react";
import * as XLSX from "xlsx";
import HyperFormula from "hyperformula";

const BASE = "/api";

type CellKey = string;
type CellData = Record<CellKey, string>;

interface Tab {
  id: string;
  name: string;
  cells: CellData;
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
          rows: t.rows ?? DEFAULT_ROWS,
          cols: t.cols ?? DEFAULT_COLS,
        })),
      };
    }
  } catch {}
  return { tabs: [{ id: "tab_1", name: "Sheet 1", cells: {}, rows: DEFAULT_ROWS, cols: DEFAULT_COLS }], activeTab: "tab_1" };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function buildSheet2D(cells: CellData, rows: number, cols: number): (string | number | boolean | null)[][] {
  const grid: (string | number | boolean | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (string | number | boolean | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const val = cells[cellKey(r, c)] ?? null;
      if (val === null || val === "") {
        row.push(null);
      } else {
        row.push(val);
      }
    }
    grid.push(row);
  }
  return grid;
}

function useFormulaEngine(cells: CellData, rows: number, cols: number) {
  return useMemo(() => {
    const sheet = buildSheet2D(cells, rows, cols);
    try {
      const hf = HyperFormula.buildFromArray(sheet, { licenseKey: "gpl-v3" });
      const getCellDisplayValue = (r: number, c: number): string => {
        const raw = cells[cellKey(r, c)];
        if (!raw) return "";
        if (raw.startsWith("=")) {
          const val = hf.getCellValue({ row: r, col: c, sheet: 0 });
          if (val instanceof Error) return `#ERR`;
          if (val === null || val === undefined) return "";
          return String(val);
        }
        return raw;
      };
      return { getCellDisplayValue };
    } catch {
      return {
        getCellDisplayValue: (r: number, c: number) => cells[cellKey(r, c)] ?? "",
      };
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

function importFile(
  file: File,
  onImport: (tabs: Tab[]) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: "array", cellFormula: true, cellText: true });
    const tabs: Tab[] = wb.SheetNames.map((name, idx) => {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, defval: null });
      const cells: CellData = {};
      let maxRow = 0;
      let maxCol = 0;
      aoa.forEach((row, ri) => {
        (row as (string | number | boolean | null)[]).forEach((val, ci) => {
          if (val !== null && val !== undefined && val !== "") {
            const cellAddr = XLSX.utils.encode_cell({ r: ri, c: ci });
            const wsCell = ws[cellAddr];
            let cellVal: string;
            if (wsCell?.f) {
              cellVal = `=${wsCell.f}`;
            } else {
              cellVal = String(val);
            }
            cells[cellKey(ri, ci)] = cellVal;
            maxRow = Math.max(maxRow, ri + 1);
            maxCol = Math.max(maxCol, ci + 1);
          }
        });
      });
      return {
        id: `tab_import_${idx}_${Date.now()}`,
        name,
        cells,
        rows: Math.max(maxRow + 10, DEFAULT_ROWS),
        cols: Math.max(maxCol + 5, DEFAULT_COLS),
      };
    });
    if (tabs.length > 0) onImport(tabs);
  };
  reader.readAsArrayBuffer(file);
}

// ─── Spreadsheet Grid ───────────────────────────────────────────────────────
function SpreadsheetGrid({ tab, onChange }: { tab: Tab; onChange: (cells: CellData) => void }) {
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cells = tab.cells;
  const rows = tab.rows;
  const cols = tab.cols;

  const { getCellDisplayValue } = useFormulaEngine(cells, rows, cols);

  const getRawVal = (r: number, c: number) => cells[cellKey(r, c)] ?? "";

  const commitEdit = useCallback((r: number, c: number, val: string) => {
    const key = cellKey(r, c);
    const updated = { ...cells };
    if (val === "") {
      delete updated[key];
    } else {
      updated[key] = val;
    }
    onChange(updated);
    setEditing(false);
  }, [cells, onChange]);

  const startEdit = (r: number, c: number, initial?: string) => {
    setSelected({ r, c });
    setEditing(true);
    setEditVal(initial !== undefined ? initial : getRawVal(r, c));
    setTimeout(() => {
      inputRef.current?.focus();
      if (initial === undefined) inputRef.current?.select();
    }, 0);
  };

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (editing && selected) {
      commitEdit(selected.r, selected.c, editVal);
    }
    setSelected({ r, c });
    setEditing(false);
    e.currentTarget.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const { r, c } = selected;

    if (editing) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit(r, c, editVal);
        setSelected({ r: Math.min(r + 1, rows - 1), c });
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit(r, c, editVal);
        setSelected({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, cols - 1) });
      } else if (e.key === "Escape") {
        setEditing(false);
        setEditVal(getRawVal(r, c));
      }
      return;
    }

    if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(r, c); }
    else if (e.key === "Delete" || e.key === "Backspace") { commitEdit(r, c, ""); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected({ r: Math.max(r - 1, 0), c }); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelected({ r: Math.min(r + 1, rows - 1), c }); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setSelected({ r, c: Math.max(c - 1, 0) }); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setSelected({ r, c: Math.min(c + 1, cols - 1) }); }
    else if (e.key === "Tab") { e.preventDefault(); setSelected({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, cols - 1) }); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { startEdit(r, c, e.key); }
  };

  const formulaBarVal = selected
    ? (editing ? editVal : getRawVal(selected.r, selected.c))
    : "";

  const COL_W = 100;
  const ROW_H = 24;
  const ROW_HDR = 40;
  const COL_HDR = 24;

  return (
    <div className="flex flex-col h-full">
      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <div className="w-16 text-center text-xs font-mono bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
          {selected ? `${colLetter(selected.c)}${selected.r + 1}` : ""}
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <span className="text-gray-400 text-sm font-bold select-none">fx</span>
        <input
          className="flex-1 text-sm font-mono bg-white border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          value={formulaBarVal}
          onChange={e => {
            if (selected) {
              if (!editing) {
                setEditing(true);
              }
              setEditVal(e.target.value);
            }
          }}
          onFocus={() => { if (selected && !editing) { setEditing(true); setEditVal(getRawVal(selected.r, selected.c)); } }}
          onBlur={() => { if (editing && selected) commitEdit(selected.r, selected.c, editVal); }}
          onKeyDown={e => {
            if (!selected) return;
            if (e.key === "Enter") { e.preventDefault(); commitEdit(selected.r, selected.c, editVal); }
            else if (e.key === "Escape") { setEditing(false); setEditVal(getRawVal(selected.r, selected.c)); }
          }}
          placeholder="Select a cell or type a formula (e.g. =SUM(A1:A10))"
        />
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div style={{ display: "grid", gridTemplateColumns: `${ROW_HDR}px repeat(${cols}, ${COL_W}px)`, width: ROW_HDR + cols * COL_W }}>
          {/* Corner */}
          <div style={{ height: COL_HDR }} className="sticky top-0 left-0 z-20 bg-gray-100 border-b border-r border-gray-300" />
          {/* Column headers */}
          {Array.from({ length: cols }, (_, ci) => (
            <div key={ci} style={{ height: COL_HDR }}
              className={`sticky top-0 z-10 flex items-center justify-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 select-none
                ${selected?.c === ci ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
              {colLetter(ci)}
            </div>
          ))}

          {/* Rows */}
          {Array.from({ length: rows }, (_, ri) => (
            <Fragment key={ri}>
              <div style={{ height: ROW_H }}
                className={`sticky left-0 z-10 flex items-center justify-center text-xs font-medium text-gray-400 border-b border-r border-gray-200 select-none
                  ${selected?.r === ri ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
                {ri + 1}
              </div>
              {Array.from({ length: cols }, (_, ci) => {
                const isSel = selected?.r === ri && selected?.c === ci;
                const isEditing = isSel && editing;
                const rawVal = getRawVal(ri, ci);
                const displayVal = getCellDisplayValue(ri, ci);
                const isFormula = rawVal.startsWith("=");
                const isError = displayVal === "#ERR";
                return (
                  <div
                    key={`${ri}-${ci}`}
                    style={{ height: ROW_H }}
                    className={`relative border-b border-r border-gray-200 text-sm overflow-hidden bg-white
                      ${isSel ? "ring-2 ring-inset ring-blue-500 z-10" : "hover:bg-blue-50/20"}`}
                    onMouseDown={(e) => handleCellMouseDown(ri, ci, e)}
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
                          if (e.key === "Enter") { e.preventDefault(); commitEdit(ri, ci, editVal); setSelected({ r: Math.min(ri + 1, rows - 1), c: ci }); }
                          else if (e.key === "Tab") { e.preventDefault(); commitEdit(ri, ci, editVal); setSelected({ r: ri, c: e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, cols - 1) }); }
                          else if (e.key === "Escape") { setEditing(false); setEditVal(rawVal); }
                        }}
                      />
                    ) : (
                      <span className={`px-1.5 truncate block leading-[24px]
                        ${isError ? "text-red-500 font-mono text-xs" : ""}
                        ${isFormula && !isError ? "text-gray-800" : "text-gray-800"}
                        ${typeof displayVal === "string" && !isNaN(Number(displayVal)) && displayVal !== "" ? "text-right" : "text-left"}`}>
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
    </div>
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
  const commitRename = () => {
    if (renamingId && renameVal.trim()) onRename(renamingId, renameVal.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex items-center gap-px border-t border-gray-200 bg-gray-50 px-2 py-1 overflow-x-auto">
      {tabs.map(tab => (
        <div key={tab.id}
          className={`group flex items-center gap-1 px-3 py-1 rounded-t text-xs font-medium cursor-pointer select-none border border-b-0 transition-colors
            ${tab.id === activeId ? "bg-white border-gray-300 text-gray-800 shadow-sm" : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"}`}
          onClick={() => onSelect(tab.id)}
          onDoubleClick={() => startRename(tab)}>
          {renamingId === tab.id ? (
            <input
              className="w-20 text-xs outline-none bg-transparent border-b border-blue-400"
              value={renameVal} autoFocus
              onChange={e => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
              onClick={e => e.stopPropagation()}
            />
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

// ─── Main Sheets Page ────────────────────────────────────────────────────────
export default function Sheets() {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [spData, setSpData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renamingSp, setRenamingSp] = useState(false);
  const [spNameVal, setSpNameVal] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list: Spreadsheet[] = await apiFetch("/spreadsheets").then(r => r.json());
      setSpreadsheets(list);
      if (list.length > 0) { setActiveId(list[0].id); setSpData(parseData(list[0].data)); }
      setLoading(false);
    })();
  }, []);

  const loadSpreadsheet = async (id: number) => {
    const sp: Spreadsheet = await apiFetch(`/spreadsheets/${id}`).then(r => r.json());
    setActiveId(sp.id); setSpData(parseData(sp.data));
  };

  const saveData = useCallback(async (data: SpreadsheetData) => {
    if (!activeId) return;
    setSaving(true); setSaved(false);
    try {
      await apiFetch(`/spreadsheets/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.stringify(data) }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }, [activeId]);

  const scheduleSave = useCallback((data: SpreadsheetData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveData(data), 1500);
  }, [saveData]);

  const activeSpreadsheet = spreadsheets.find(s => s.id === activeId);
  const activeTab = spData?.tabs.find(t => t.id === spData.activeTab);

  const handleCellChange = (cells: CellData) => {
    if (!spData || !activeTab) return;
    const updated: SpreadsheetData = { ...spData, tabs: spData.tabs.map(t => t.id === spData.activeTab ? { ...t, cells } : t) };
    setSpData(updated); scheduleSave(updated);
  };

  const handleTabSelect = (id: string) => {
    if (!spData) return;
    setSpData({ ...spData, activeTab: id });
  };

  const handleTabAdd = () => {
    if (!spData) return;
    const newId = `tab_${Date.now()}`;
    const updated: SpreadsheetData = {
      ...spData,
      tabs: [...spData.tabs, { id: newId, name: `Sheet ${spData.tabs.length + 1}`, cells: {}, rows: DEFAULT_ROWS, cols: DEFAULT_COLS }],
      activeTab: newId,
    };
    setSpData(updated); scheduleSave(updated);
  };

  const handleTabRename = (id: string, name: string) => {
    if (!spData) return;
    const updated: SpreadsheetData = { ...spData, tabs: spData.tabs.map(t => t.id === id ? { ...t, name } : t) };
    setSpData(updated); scheduleSave(updated);
  };

  const handleTabDelete = (id: string) => {
    if (!spData || spData.tabs.length <= 1) return;
    const remaining = spData.tabs.filter(t => t.id !== id);
    const updated: SpreadsheetData = { tabs: remaining, activeTab: spData.activeTab === id ? remaining[0].id : spData.activeTab };
    setSpData(updated); scheduleSave(updated);
  };

  const createSpreadsheet = async () => {
    setCreating(true);
    const sp: Spreadsheet = await apiFetch("/spreadsheets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Spreadsheet" }),
    }).then(r => r.json());
    setSpreadsheets(prev => [...prev, sp]);
    setActiveId(sp.id); setSpData(parseData(sp.data)); setCreating(false);
  };

  const deleteSpreadsheet = async (id: number) => {
    if (!confirm("Delete this spreadsheet?")) return;
    await apiFetch(`/spreadsheets/${id}`, { method: "DELETE" });
    const remaining = spreadsheets.filter(s => s.id !== id);
    setSpreadsheets(remaining);
    if (activeId === id) {
      if (remaining.length > 0) { setActiveId(remaining[0].id); setSpData(parseData(remaining[0].data)); }
      else { setActiveId(null); setSpData(null); }
    }
  };

  const renameSpreadsheet = async () => {
    if (!activeId || !spNameVal.trim()) { setRenamingSp(false); return; }
    await apiFetch(`/spreadsheets/${activeId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: spNameVal.trim() }),
    });
    setSpreadsheets(prev => prev.map(s => s.id === activeId ? { ...s, name: spNameVal.trim() } : s));
    setRenamingSp(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spData) return;
    importFile(file, (importedTabs) => {
      const updated: SpreadsheetData = {
        tabs: importedTabs,
        activeTab: importedTabs[0].id,
      };
      setSpData(updated);
      scheduleSave(updated);
    });
    e.target.value = "";
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0 flex-wrap">
          <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />

          {/* Spreadsheet name */}
          <div className="flex items-center gap-1.5 min-w-0">
            {renamingSp ? (
              <div className="flex items-center gap-1">
                <input
                  className="text-sm font-semibold border border-blue-400 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-200"
                  value={spNameVal} autoFocus
                  onChange={e => setSpNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") renameSpreadsheet(); if (e.key === "Escape") setRenamingSp(false); }}
                />
                <button onClick={renameSpreadsheet} className="p-1 hover:bg-green-50 text-green-600 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRenamingSp(false)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-semibold text-gray-800 truncate max-w-48">{activeSpreadsheet?.name ?? "No spreadsheet"}</span>
                {activeSpreadsheet && (
                  <button onClick={() => { setRenamingSp(true); setSpNameVal(activeSpreadsheet.name); }}
                    className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Files dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
              Files <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 hidden group-hover:block">
              {spreadsheets.map(sp => (
                <button key={sp.id} onClick={() => loadSpreadsheet(sp.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors
                    ${sp.id === activeId ? "text-blue-600 font-medium" : "text-gray-700"}`}>
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sp.name}</span>
                  {sp.id === activeId && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>
              ))}
              {spreadsheets.length > 0 && <div className="border-t border-gray-100 my-1" />}
              {spreadsheets.map(sp => (
                <button key={`del-${sp.id}`} onClick={() => deleteSpreadsheet(sp.id)}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />Delete "{sp.name}"
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
            {saved && !saving && <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}

            {/* Import */}
            {activeId && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImport}
                />
                <button
                  onClick={() => importRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                  <Upload className="w-3.5 h-3.5" />Import
                </button>
              </>
            )}

            {/* Download Excel */}
            {activeId && spData && (
              <button
                onClick={() => exportExcel(spData.tabs, activeSpreadsheet?.name ?? "spreadsheet")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <Download className="w-3.5 h-3.5" />Download Excel
              </button>
            )}

            <button onClick={createSpreadsheet} disabled={creating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              New Spreadsheet
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!activeId || !spData ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <FileSpreadsheet className="w-12 h-12 opacity-30" />
            <p className="text-sm">No spreadsheets yet</p>
            <button onClick={createSpreadsheet} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create your first spreadsheet
            </button>
          </div>
        ) : activeTab ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <SpreadsheetGrid tab={activeTab} onChange={handleCellChange} />
            <TabBar
              tabs={spData.tabs}
              activeId={spData.activeTab}
              onSelect={handleTabSelect}
              onAdd={handleTabAdd}
              onRename={handleTabRename}
              onDelete={handleTabDelete}
            />
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
