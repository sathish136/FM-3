import { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Database, Table2, Search, RefreshCw, Play, Download, X,
  ChevronRight, ChevronDown, BarChart3, Code2, ListTree, Loader2,
  AlertTriangle, HardDrive, Server, ArrowUpDown, ChevronUp, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import * as XLSX from "xlsx";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Db = {
  name: string;
  id: number;
  state: string;
  collation: string;
  owner: string;
  sizeMB: number;
  createdAt: string;
};
type Tbl = {
  schema: string;
  name: string;
  rowCount: number;
  sizeMB: number;
  createdAt: string;
  modifiedAt: string;
};
type Col = {
  name: string;
  dataType: string;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  nullable: string;
  default: string | null;
  position: number;
  isPk: number;
};

type Tab = "data" | "schema" | "query" | "analytics";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#a855f7", "#d946ef", "#fb7185",
];

function fmtNum(n: any): string {
  const v = Number(n);
  if (!isFinite(v)) return String(n ?? "");
  return v.toLocaleString();
}
function fmtBytes(mb: any): string {
  const v = Number(mb || 0);
  if (v >= 1024) return (v / 1024).toFixed(2) + " GB";
  return v.toFixed(2) + " MB";
}
function fmtCell(v: any): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 19);
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 200 ? s.slice(0, 200) + "…" : s;
}

export default function SiteDb() {
  // ── Server / databases
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Db[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [includeSystem, setIncludeSystem] = useState(false);
  const [dbSearch, setDbSearch] = useState("");

  // ── Tables
  const [tables, setTables] = useState<Tbl[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string } | null>(null);

  // ── Tab state
  const [tab, setTab] = useState<Tab>("data");

  // ── Data tab
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [dataCols, setDataCols] = useState<string[]>([]);
  const [dataTotal, setDataTotal] = useState(0);
  const [dataPage, setDataPage] = useState(1);
  const [dataLimit, setDataLimit] = useState(50);
  const [dataSearch, setDataSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loadingData, setLoadingData] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);

  // ── Schema tab
  const [columns, setColumns] = useState<Col[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);

  // ── Query tab
  const [queryText, setQueryText] = useState("SELECT TOP 100 * FROM sys.tables");
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryCols, setQueryCols] = useState<string[]>([]);
  const [queryErr, setQueryErr] = useState<string | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryMs, setQueryMs] = useState<number | null>(null);

  // ── Analytics tab
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ─── Load server health + databases on mount
  useEffect(() => { loadHealth(); loadDatabases(); }, []);
  useEffect(() => { loadDatabases(); }, [includeSystem]);

  async function loadHealth() {
    setServerErr(null);
    try {
      const r = await fetch(`${BASE}/api/site-db/health`);
      const j = await r.json();
      if (j.ok) setServerInfo(j); else setServerErr(j.error || "Connection failed");
    } catch (e: any) { setServerErr(e.message); }
  }
  async function loadDatabases() {
    setLoadingDbs(true);
    try {
      const r = await fetch(`${BASE}/api/site-db/databases?includeSystem=${includeSystem}`);
      const j = await r.json();
      if (Array.isArray(j.databases)) setDatabases(j.databases);
    } catch {} finally { setLoadingDbs(false); }
  }

  // ─── Load tables when DB changes
  useEffect(() => {
    setSelectedTable(null);
    setTables([]);
    if (!selectedDb) return;
    loadTables();
    if (tab === "analytics") loadStats();
  }, [selectedDb]);

  async function loadTables() {
    if (!selectedDb) return;
    setLoadingTables(true);
    try {
      const r = await fetch(`${BASE}/api/site-db/tables?db=${encodeURIComponent(selectedDb)}`);
      const j = await r.json();
      if (Array.isArray(j.tables)) setTables(j.tables);
    } catch {} finally { setLoadingTables(false); }
  }

  // ─── On table change → load data + columns
  useEffect(() => {
    if (!selectedDb || !selectedTable) return;
    setDataPage(1); setSortKey(""); setDataSearch("");
    loadData(1, "", "", "asc");
    loadColumns();
  }, [selectedTable]);

  // ─── Reload data when page/limit/search/sort change
  useEffect(() => {
    if (!selectedDb || !selectedTable) return;
    loadData(dataPage, dataSearch, sortKey, sortDir);
  }, [dataPage, dataLimit, sortKey, sortDir]);

  async function loadData(page: number, search: string, sort: string, dir: string) {
    if (!selectedDb || !selectedTable) return;
    setLoadingData(true); setDataErr(null);
    try {
      const params = new URLSearchParams({
        db: selectedDb,
        schema: selectedTable.schema,
        table: selectedTable.name,
        page: String(page),
        limit: String(dataLimit),
      });
      if (search) params.set("search", search);
      if (sort) { params.set("sort", sort); params.set("dir", dir); }
      const r = await fetch(`${BASE}/api/site-db/data?${params}`);
      const j = await r.json();
      if (j.error) { setDataErr(j.error); setDataRows([]); }
      else {
        setDataRows(j.rows || []);
        setDataCols(j.columns || []);
        setDataTotal(j.total || 0);
      }
    } catch (e: any) {
      setDataErr(e.message); setDataRows([]);
    } finally { setLoadingData(false); }
  }

  async function loadColumns() {
    if (!selectedDb || !selectedTable) return;
    setLoadingCols(true);
    try {
      const params = new URLSearchParams({
        db: selectedDb,
        schema: selectedTable.schema,
        table: selectedTable.name,
      });
      const r = await fetch(`${BASE}/api/site-db/columns?${params}`);
      const j = await r.json();
      if (Array.isArray(j.columns)) setColumns(j.columns);
    } catch {} finally { setLoadingCols(false); }
  }

  async function loadStats() {
    if (!selectedDb) return;
    setLoadingStats(true);
    try {
      const r = await fetch(`${BASE}/api/site-db/stats?db=${encodeURIComponent(selectedDb)}`);
      const j = await r.json();
      setStats(j);
    } catch {} finally { setLoadingStats(false); }
  }

  useEffect(() => {
    if (tab === "analytics" && selectedDb && !stats) loadStats();
  }, [tab, selectedDb]);

  async function runQuery() {
    if (!selectedDb || !queryText.trim()) return;
    setQueryRunning(true); setQueryErr(null); setQueryMs(null);
    const t0 = performance.now();
    try {
      const r = await fetch(`${BASE}/api/site-db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db: selectedDb, sql: queryText, limit: 1000 }),
      });
      const j = await r.json();
      setQueryMs(Math.round(performance.now() - t0));
      if (j.error) { setQueryErr(j.error); setQueryRows([]); setQueryCols([]); }
      else { setQueryRows(j.rows || []); setQueryCols(j.columns || []); }
    } catch (e: any) { setQueryErr(e.message); }
    finally { setQueryRunning(false); }
  }

  function exportRows(rows: any[], filename: string) {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  const filteredDbs = useMemo(
    () => databases.filter(d => d.name.toLowerCase().includes(dbSearch.toLowerCase())),
    [databases, dbSearch],
  );
  const filteredTables = useMemo(
    () => tables.filter(t =>
      `${t.schema}.${t.name}`.toLowerCase().includes(tableSearch.toLowerCase()),
    ),
    [tables, tableSearch],
  );

  const totalPages = Math.max(1, Math.ceil(dataTotal / dataLimit));

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-slate-50">
        {/* ─── Left sidebar: databases & tables ─── */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
          {/* Server header */}
          <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Server className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700">SQL Server</div>
                <div className="text-[10px] text-slate-500 truncate" title={serverInfo?.host}>
                  {serverInfo?.host || "—"}
                </div>
              </div>
            </div>
            {serverErr && (
              <div className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 rounded px-2 py-1 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="break-words">{serverErr}</span>
              </div>
            )}
            {serverInfo?.info?.edition && (
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {serverInfo.info.edition}
              </div>
            )}
          </div>

          {/* Databases section */}
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Databases ({filteredDbs.length})
              </div>
              <button onClick={loadDatabases} className="p-1 hover:bg-slate-100 rounded">
                <RefreshCw className={`w-3 h-3 text-slate-500 ${loadingDbs ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSystem}
                onChange={e => setIncludeSystem(e.target.checked)}
                className="w-3 h-3"
              />
              Show system DBs
            </label>
            <div className="max-h-48 overflow-y-auto -mx-3 px-3 space-y-0.5">
              {filteredDbs.map(db => (
                <button
                  key={db.name}
                  onClick={() => setSelectedDb(db.name)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                    selectedDb === db.name
                      ? "bg-indigo-100 text-indigo-700 font-semibold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                    <span className="truncate">{db.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {fmtBytes(db.sizeMB)}
                  </span>
                </button>
              ))}
              {!filteredDbs.length && !loadingDbs && (
                <div className="text-[11px] text-slate-400 py-3 text-center">No databases</div>
              )}
            </div>
          </div>

          {/* Tables section */}
          <div className="flex-1 flex flex-col min-h-0 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tables {selectedDb && `(${filteredTables.length})`}
              </div>
              <button
                onClick={loadTables}
                disabled={!selectedDb}
                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
              >
                <RefreshCw className={`w-3 h-3 text-slate-500 ${loadingTables ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                placeholder="Search tables…"
                disabled={!selectedDb}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 disabled:bg-slate-50"
              />
            </div>
            <div className="flex-1 overflow-y-auto -mx-3 px-3 space-y-0.5">
              {!selectedDb && (
                <div className="text-[11px] text-slate-400 py-6 text-center">
                  Select a database
                </div>
              )}
              {filteredTables.map(t => {
                const isSel = selectedTable?.schema === t.schema && selectedTable?.name === t.name;
                return (
                  <button
                    key={`${t.schema}.${t.name}`}
                    onClick={() => setSelectedTable({ schema: t.schema, name: t.name })}
                    className={`w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                      isSel
                        ? "bg-violet-100 text-violet-700"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Table2 className="w-3.5 h-3.5 shrink-0 text-violet-500" />
                      <span className="truncate font-medium">
                        {t.schema !== "dbo" && <span className="text-slate-400">{t.schema}.</span>}
                        {t.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pl-5">
                      <span>{fmtNum(t.rowCount)} rows</span>
                      <span>{fmtBytes(t.sizeMB)}</span>
                    </div>
                  </button>
                );
              })}
              {selectedDb && !loadingTables && !filteredTables.length && (
                <div className="text-[11px] text-slate-400 py-3 text-center">No tables</div>
              )}
            </div>
          </div>
        </aside>

        {/* ─── Main content ─── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header / breadcrumb */}
          <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-800">{selectedDb || "No database"}</span>
              {selectedTable && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <Table2 className="w-4 h-4 text-violet-500" />
                  <span className="font-semibold text-slate-800">
                    {selectedTable.schema}.{selectedTable.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {([
                { id: "data" as Tab, label: "Data", icon: Table2 },
                { id: "schema" as Tab, label: "Schema", icon: ListTree },
                { id: "query" as Tab, label: "Query", icon: Code2 },
                { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden bg-slate-50">
            {!selectedDb ? (
              <EmptyState
                icon={<Database className="w-10 h-10 text-slate-300" />}
                title="No database selected"
                hint="Choose a database from the sidebar to begin exploring."
              />
            ) : tab === "data" ? (
              !selectedTable ? (
                <EmptyState
                  icon={<Table2 className="w-10 h-10 text-slate-300" />}
                  title="No table selected"
                  hint="Pick a table from the sidebar to view its rows."
                />
              ) : (
                <div className="h-full flex flex-col">
                  {/* toolbar */}
                  <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={dataSearch}
                        onChange={e => setDataSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { setDataPage(1); loadData(1, dataSearch, sortKey, sortDir); } }}
                        placeholder="Search text columns… (Enter)"
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <select
                      value={dataLimit}
                      onChange={e => { setDataLimit(parseInt(e.target.value)); setDataPage(1); }}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                    >
                      {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n} rows</option>)}
                    </select>
                    <div className="text-xs text-slate-500">
                      {fmtNum(dataTotal)} total
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => exportRows(dataRows, `${selectedTable.schema}_${selectedTable.name}_p${dataPage}`)}
                        disabled={!dataRows.length}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md font-medium disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
                      <button
                        onClick={() => loadData(dataPage, dataSearch, sortKey, sortDir)}
                        className="p-1.5 hover:bg-slate-100 rounded-md"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loadingData ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* table */}
                  <div className="flex-1 overflow-auto">
                    {dataErr ? (
                      <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <code className="break-all">{dataErr}</code>
                      </div>
                    ) : loadingData && !dataRows.length ? (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                      </div>
                    ) : (
                      <table className="text-xs w-full border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10">
                          <tr>
                            {dataCols.map(c => (
                              <th
                                key={c}
                                onClick={() => {
                                  if (sortKey === c) setSortDir(sortDir === "asc" ? "desc" : "asc");
                                  else { setSortKey(c); setSortDir("asc"); }
                                }}
                                className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-300 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                              >
                                <div className="flex items-center gap-1">
                                  {c}
                                  {sortKey === c
                                    ? (sortDir === "asc"
                                        ? <ChevronUp className="w-3 h-3" />
                                        : <ChevronDown className="w-3 h-3" />)
                                    : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataRows.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-50/40">
                              {dataCols.map(c => (
                                <td
                                  key={c}
                                  className="px-3 py-1.5 border-b border-slate-100 text-slate-700 align-top whitespace-nowrap max-w-[400px] truncate"
                                  title={fmtCell(row[c])}
                                >
                                  {fmtCell(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {!dataRows.length && (
                            <tr>
                              <td colSpan={dataCols.length || 1} className="px-3 py-8 text-center text-slate-400">
                                No rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* pagination */}
                  <div className="px-6 py-2 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div className="text-slate-500">
                      Page {dataPage} of {totalPages} · {fmtNum(dataTotal)} rows
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDataPage(1)} disabled={dataPage === 1} className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50">First</button>
                      <button onClick={() => setDataPage(p => Math.max(1, p - 1))} disabled={dataPage === 1} className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50">Prev</button>
                      <input
                        type="number"
                        value={dataPage}
                        onChange={e => setDataPage(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-14 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                      <button onClick={() => setDataPage(p => Math.min(totalPages, p + 1))} disabled={dataPage >= totalPages} className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50">Next</button>
                      <button onClick={() => setDataPage(totalPages)} disabled={dataPage >= totalPages} className="px-2 py-1 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50">Last</button>
                    </div>
                  </div>
                </div>
              )
            ) : tab === "schema" ? (
              !selectedTable ? (
                <EmptyState
                  icon={<ListTree className="w-10 h-10 text-slate-300" />}
                  title="No table selected"
                  hint="Pick a table to view its schema."
                />
              ) : (
                <div className="p-6 overflow-auto h-full">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-800">
                        {selectedTable.schema}.{selectedTable.name}
                      </div>
                      <div className="text-xs text-slate-500">{columns.length} columns</div>
                    </div>
                    {loadingCols ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Loading…
                      </div>
                    ) : (
                      <table className="text-xs w-full">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">#</th>
                            <th className="px-3 py-2 text-left font-semibold">Column</th>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                            <th className="px-3 py-2 text-left font-semibold">Length / Precision</th>
                            <th className="px-3 py-2 text-left font-semibold">Nullable</th>
                            <th className="px-3 py-2 text-left font-semibold">Default</th>
                            <th className="px-3 py-2 text-left font-semibold">PK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map(c => (
                            <tr key={c.name} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-500">{c.position}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                              <td className="px-3 py-2"><code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{c.dataType}</code></td>
                              <td className="px-3 py-2 text-slate-600">
                                {c.maxLength ? c.maxLength : (c.precision != null ? `${c.precision}${c.scale != null ? `,${c.scale}` : ""}` : "—")}
                              </td>
                              <td className="px-3 py-2">
                                {c.nullable === "YES"
                                  ? <span className="text-amber-600">Yes</span>
                                  : <span className="text-slate-400">No</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{c.default || "—"}</td>
                              <td className="px-3 py-2">
                                {c.isPk
                                  ? <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">PK</span>
                                  : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )
            ) : tab === "query" ? (
              <div className="p-6 h-full flex flex-col gap-3 overflow-hidden">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">
                      SQL Query · <span className="text-slate-500 font-normal">SELECT only · DB: {selectedDb}</span>
                    </div>
                    <button
                      onClick={runQuery}
                      disabled={queryRunning || !queryText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md disabled:opacity-50"
                    >
                      {queryRunning
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3" />}
                      Run
                    </button>
                  </div>
                  <textarea
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runQuery(); }}
                    spellCheck={false}
                    rows={6}
                    className="w-full px-4 py-3 text-xs font-mono text-slate-800 focus:outline-none resize-y"
                    placeholder="SELECT * FROM ..."
                  />
                  <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Ctrl/Cmd + Enter to run</span>
                    {queryMs != null && <span>Took {queryMs} ms · {queryRows.length} rows</span>}
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                  <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-700">Results</div>
                    <button
                      onClick={() => exportRows(queryRows, `query_result_${Date.now()}`)}
                      disabled={!queryRows.length}
                      className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md font-medium disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" /> Export
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {queryErr ? (
                      <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <code className="break-all">{queryErr}</code>
                      </div>
                    ) : queryRows.length ? (
                      <table className="text-xs w-full border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10">
                          <tr>
                            {queryCols.map(c => (
                              <th key={c} className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-300 whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryRows.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-50/40">
                              {queryCols.map(c => (
                                <td key={c} className="px-3 py-1.5 border-b border-slate-100 text-slate-700 align-top whitespace-nowrap max-w-[400px] truncate" title={fmtCell(row[c])}>
                                  {fmtCell(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        Run a query to see results
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // ─── Analytics tab
              <div className="p-6 overflow-auto h-full">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading stats…
                  </div>
                ) : !stats ? (
                  <EmptyState
                    icon={<BarChart3 className="w-10 h-10 text-slate-300" />}
                    title="No analytics yet"
                    hint="Select a database to view aggregated statistics."
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <StatCard icon={<Table2 className="w-5 h-5" />} label="Tables" value={fmtNum(stats.totals?.tables)} color="indigo" />
                      <StatCard icon={<FileText className="w-5 h-5" />} label="Total Rows" value={fmtNum(stats.totals?.rows)} color="violet" />
                      <StatCard icon={<HardDrive className="w-5 h-5" />} label="Total Size" value={fmtBytes(stats.totals?.sizeMB)} color="emerald" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title="Top 15 Tables by Row Count">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={(stats.topByRows || []).map((x: any) => ({ name: x.name, rows: Number(x.rowCount) }))} layout="vertical" margin={{ left: 80 }}>
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                            <RTooltip formatter={(v: any) => fmtNum(v)} />
                            <Bar dataKey="rows">
                              {(stats.topByRows || []).map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      <ChartCard title="Top 15 Tables by Size (MB)">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={(stats.topBySize || []).map((x: any) => ({ name: x.name, mb: Number(x.sizeMB) }))} layout="vertical" margin={{ left: 80 }}>
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                            <RTooltip formatter={(v: any) => `${v} MB`} />
                            <Bar dataKey="mb">
                              {(stats.topBySize || []).map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>

                    <ChartCard title="Storage Distribution (Top 10)">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={(stats.topBySize || []).slice(0, 10).map((x: any) => ({ name: x.name, value: Number(x.sizeMB) }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(e: any) => e.name}
                          >
                            {(stats.topBySize || []).slice(0, 10).map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <RTooltip formatter={(v: any) => `${v} MB`} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}

// ─── helper components ───
function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      {icon}
      <h3 className="mt-4 text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{hint}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
