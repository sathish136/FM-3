import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  Plus, FileSpreadsheet, Upload, Search, MoreVertical,
  Trash2, Pencil, Check, X, Loader2, Clock, Grid3x3,
  List, Download,
} from "lucide-react";
import * as XLSX from "xlsx";

const BASE = "/api";

interface Spreadsheet {
  id: number;
  name: string;
  projectId: number | null;
  data: string;
  createdAt: string;
  updatedAt: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const TEMPLATES = [
  {
    id: "blank",
    name: "Blank",
    preview: null,
    description: "Start fresh",
  },
  {
    id: "budget",
    name: "Monthly Budget",
    description: "Track income and expenses",
    cells: {
      "0:0": "Category", "0:1": "Budget", "0:2": "Actual", "0:3": "Difference",
      "1:0": "Housing", "1:1": "1500", "1:2": "1450", "1:3": "=B2-C2",
      "2:0": "Food", "2:1": "500", "2:2": "520", "2:3": "=B3-C3",
      "3:0": "Transport", "3:1": "300", "3:2": "280", "3:3": "=B4-C4",
      "4:0": "Utilities", "4:1": "200", "4:2": "190", "4:3": "=B5-C5",
      "5:0": "Total", "5:1": "=SUM(B2:B5)", "5:2": "=SUM(C2:C5)", "5:3": "=B6-C6",
    },
    formats: {
      "0:0": { bold: true, bgColor: "#bbf7d0" }, "0:1": { bold: true, bgColor: "#bbf7d0" },
      "0:2": { bold: true, bgColor: "#bbf7d0" }, "0:3": { bold: true, bgColor: "#bbf7d0" },
      "5:0": { bold: true }, "5:1": { bold: true }, "5:2": { bold: true }, "5:3": { bold: true },
    },
    color: "#bbf7d0",
    preview: [["Category","Budget","Actual","Diff"],["Housing","1500","1450","50"],["Food","500","520","-20"],["Total","=SUM","=SUM","=B-C"]],
  },
  {
    id: "todo",
    name: "To-Do List",
    description: "Track tasks and priorities",
    cells: {
      "0:0": "Task", "0:1": "Priority", "0:2": "Status", "0:3": "Due Date",
      "1:0": "Design mockups", "1:1": "High", "1:2": "Done", "1:3": "2024-03-01",
      "2:0": "Review code", "2:1": "Medium", "2:2": "In Progress", "2:3": "2024-03-05",
      "3:0": "Write tests", "3:1": "Low", "3:2": "Todo", "3:3": "2024-03-10",
    },
    formats: {
      "0:0": { bold: true, bgColor: "#bfdbfe" }, "0:1": { bold: true, bgColor: "#bfdbfe" },
      "0:2": { bold: true, bgColor: "#bfdbfe" }, "0:3": { bold: true, bgColor: "#bfdbfe" },
      "1:2": { textColor: "#16a34a" }, "2:2": { textColor: "#ea580c" }, "3:2": { textColor: "#6b7280" },
    },
    color: "#bfdbfe",
    preview: [["Task","Priority","Status","Due"],["Design..","High","Done","Mar 1"],["Review..","Med","In Prog","Mar 5"],["Tests","Low","Todo","Mar 10"]],
  },
  {
    id: "project",
    name: "Project Tracker",
    description: "Manage project milestones",
    cells: {
      "0:0": "Milestone", "0:1": "Owner", "0:2": "Start", "0:3": "End", "0:4": "Progress",
      "1:0": "Planning", "1:1": "Alice", "1:2": "Jan 1", "1:3": "Jan 15", "1:4": "100%",
      "2:0": "Development", "2:1": "Bob", "2:2": "Jan 16", "2:3": "Feb 28", "2:4": "60%",
      "3:0": "Testing", "3:1": "Carol", "3:2": "Mar 1", "3:3": "Mar 15", "3:4": "0%",
    },
    formats: {
      "0:0": { bold: true, bgColor: "#e9d5ff" }, "0:1": { bold: true, bgColor: "#e9d5ff" },
      "0:2": { bold: true, bgColor: "#e9d5ff" }, "0:3": { bold: true, bgColor: "#e9d5ff" }, "0:4": { bold: true, bgColor: "#e9d5ff" },
    },
    color: "#e9d5ff",
    preview: [["Milestone","Owner","Start","End"],["Planning","Alice","Jan 1","Jan 15"],["Development","Bob","Jan 16","Feb 28"],["Testing","Carol","Mar 1","Mar 15"]],
  },
];

function MiniPreview({ rows }: { rows: string[][] }) {
  return (
    <div className="w-full h-full overflow-hidden p-2">
      <div className="h-full flex flex-col gap-px">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-px flex-1 min-h-0">
            {row.map((cell, ci) => (
              <div key={ci}
                className={`flex-1 min-w-0 rounded-sm text-[5px] leading-none flex items-center px-0.5 truncate
                  ${ri === 0 ? "bg-gray-200 font-bold text-gray-700" : "bg-white text-gray-500 border border-gray-100"}`}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpreadsheetCard({ sp, onOpen, onDelete, onRename, onDownload }: {
  sp: Spreadsheet;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(sp.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  const commitRename = () => {
    if (renameVal.trim()) onRename(renameVal.trim());
    setRenaming(false);
  };

  const parsedData = (() => {
    try { return JSON.parse(sp.data); } catch { return null; }
  })();

  const previewRows: string[][] = [];
  if (parsedData?.tabs?.[0]?.cells) {
    const cells = parsedData.tabs[0].cells;
    for (let r = 0; r < 5; r++) {
      const row: string[] = [];
      for (let c = 0; c < 5; c++) {
        row.push(cells[`${r}:${c}`] ?? "");
      }
      if (row.some(v => v)) previewRows.push(row.map(v => v.startsWith("=") ? "#" : v));
    }
  }

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
      {/* Thumbnail */}
      <div className="h-36 bg-gray-50 border-b border-gray-200 relative" onClick={onOpen}>
        {previewRows.length > 0 ? (
          <MiniPreview rows={previewRows} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileSpreadsheet className="w-12 h-12 text-gray-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-transparent group-hover:bg-blue-500/5 transition-colors" />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={onOpen}>
          {renaming ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                className="text-sm font-medium border border-blue-400 rounded px-1.5 py-0.5 outline-none w-full"
                value={renameVal} autoFocus
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
                onBlur={commitRename}
              />
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-800 truncate">{sp.name}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />{timeAgo(sp.updatedAt || sp.createdAt)}
          </p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenu(p => !p); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <button onClick={() => { onOpen(); setMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5" />Open
              </button>
              <button onClick={() => { setRenaming(true); setMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />Rename
              </button>
              <button onClick={() => { onDownload(); setMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-3.5 h-3.5" />Download Excel
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpreadsheetRow({ sp, onOpen, onDelete, onRename, onDownload }: {
  sp: Spreadsheet;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(sp.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  const commitRename = () => {
    if (renameVal.trim()) onRename(renameVal.trim());
    setRenaming(false);
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 transition-all">
      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0" onClick={onOpen}>
        <FileSpreadsheet className="w-5 h-5 text-green-600" />
      </div>
      <div className="flex-1 min-w-0" onClick={onOpen}>
        {renaming ? (
          <input
            className="text-sm font-medium border border-blue-400 rounded px-2 py-0.5 outline-none w-64"
            value={renameVal} autoFocus
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
            onBlur={commitRename}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-medium text-gray-800 truncate">{sp.name}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(sp.updatedAt || sp.createdAt)}</p>
      </div>
      <div className="hidden group-hover:flex items-center gap-1 shrink-0" ref={menuRef}>
        <button onClick={() => setRenaming(true)} className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDownload} className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function SheetsHome() {
  const [, navigate] = useLocation();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list: Spreadsheet[] = await apiFetch("/spreadsheets").then(r => r.json());
        setSpreadsheets(list);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const createFromTemplate = async (templateId: string) => {
    setCreating(templateId);
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    const defaultTab = {
      id: "tab_1",
      name: "Sheet 1",
      cells: (tmpl as any)?.cells ?? {},
      formats: (tmpl as any)?.formats ?? {},
      rows: 100,
      cols: 26,
    };
    const data = JSON.stringify({ tabs: [defaultTab], activeTab: "tab_1" });
    try {
      const sp: Spreadsheet = await apiFetch("/spreadsheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tmpl?.name === "Blank" ? "Untitled Spreadsheet" : (tmpl?.name ?? "Untitled Spreadsheet") }),
      }).then(r => r.json());
      if (tmpl && tmpl.id !== "blank") {
        await apiFetch(`/spreadsheets/${sp.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      }
      navigate(`/sheets/${sp.id}`);
    } catch {}
    setCreating(null);
  };

  const deleteSpreadsheet = async (id: number) => {
    if (!confirm("Delete this spreadsheet?")) return;
    await apiFetch(`/spreadsheets/${id}`, { method: "DELETE" });
    setSpreadsheets(prev => prev.filter(s => s.id !== id));
  };

  const renameSpreadsheet = async (id: number, name: string) => {
    await apiFetch(`/spreadsheets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSpreadsheets(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const downloadSpreadsheet = (sp: Spreadsheet) => {
    try {
      const parsed = JSON.parse(sp.data);
      const wb = XLSX.utils.book_new();
      for (const tab of parsed.tabs ?? []) {
        const data: (string | number | null)[][] = [];
        for (let r = 0; r < (tab.rows ?? 100); r++) {
          const row: (string | number | null)[] = [];
          let hasVal = false;
          for (let c = 0; c < (tab.cols ?? 26); c++) {
            const v = tab.cells?.[`${r}:${c}`] ?? null;
            row.push(v === "" ? null : v);
            if (v) hasVal = true;
          }
          if (hasVal || data.length > 0) data.push(row);
        }
        while (data.length > 0 && data[data.length - 1].every(v => !v)) data.pop();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data.length ? data : [[]]), tab.name?.slice(0, 31) ?? "Sheet1");
      }
      XLSX.writeFile(wb, `${sp.name}.xlsx`);
    } catch {}
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellFormula: true });
      const tabs = wb.SheetNames.map((name, idx) => {
        const ws = wb.Sheets[name];
        const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, defval: null });
        const cells: Record<string, string> = {};
        aoa.forEach((row, ri) => {
          (row as (string | number | boolean | null)[]).forEach((val, ci) => {
            if (val !== null && val !== undefined && val !== "") {
              const wsCell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })];
              cells[`${ri}:${ci}`] = wsCell?.f ? `=${wsCell.f}` : String(val);
            }
          });
        });
        return { id: `tab_${idx}`, name, cells, formats: {}, rows: 100, cols: 26 };
      });
      setCreating("import");
      try {
        const sp: Spreadsheet = await apiFetch("/spreadsheets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name.replace(/\.[^/.]+$/, "") }),
        }).then(r => r.json());
        await apiFetch(`/spreadsheets/${sp.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: JSON.stringify({ tabs, activeTab: tabs[0]?.id ?? "tab_0" }) }),
        });
        navigate(`/sheets/${sp.id}`);
      } catch {}
      setCreating(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const filtered = spreadsheets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  return (
    <Layout>
      <div className="min-h-full bg-gray-50">
        {/* Header bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-800">Sheets</span>
            </div>
            {/* Search */}
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="Search spreadsheets…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <button onClick={() => importRef.current?.click()} disabled={!!creating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50">
              <Upload className="w-4 h-4" />Import
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Templates */}
          <div className="mb-10">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Start a new spreadsheet</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {TEMPLATES.map(tmpl => (
                <button key={tmpl.id}
                  onClick={() => createFromTemplate(tmpl.id)}
                  disabled={!!creating}
                  className="shrink-0 group flex flex-col items-start gap-2 w-36 disabled:opacity-50">
                  <div className={`w-36 h-24 rounded-xl border-2 overflow-hidden transition-all
                    ${creating === tmpl.id ? "border-green-400" : "border-gray-200 group-hover:border-green-400 group-hover:shadow-md"}`}
                    style={{ backgroundColor: (tmpl as any).color ?? "#f9fafb" }}>
                    {creating === tmpl.id ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                      </div>
                    ) : tmpl.id === "blank" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus className="w-8 h-8 text-gray-300" />
                      </div>
                    ) : (
                      <div className="w-full h-full p-1.5">
                        <MiniPreview rows={(tmpl as any).preview} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 group-hover:text-green-700">{tmpl.name}</p>
                    <p className="text-[10px] text-gray-400">{tmpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent spreadsheets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500">
                {search ? `Results for "${search}"` : "Recent spreadsheets"}
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:bg-gray-100"}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{search ? "No spreadsheets match your search" : "No spreadsheets yet — create one above"}</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sorted.map(sp => (
                  <SpreadsheetCard key={sp.id} sp={sp}
                    onOpen={() => navigate(`/sheets/${sp.id}`)}
                    onDelete={() => deleteSpreadsheet(sp.id)}
                    onRename={name => renameSpreadsheet(sp.id, name)}
                    onDownload={() => downloadSpreadsheet(sp)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {sorted.map(sp => (
                  <SpreadsheetRow key={sp.id} sp={sp}
                    onOpen={() => navigate(`/sheets/${sp.id}`)}
                    onDelete={() => deleteSpreadsheet(sp.id)}
                    onRename={name => renameSpreadsheet(sp.id, name)}
                    onDownload={() => downloadSpreadsheet(sp)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
