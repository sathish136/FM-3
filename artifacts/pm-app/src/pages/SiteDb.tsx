import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  Database, Table2, Search, RefreshCw, Play, Download, X,
  ChevronRight, ChevronDown, Code2, Loader2,
  AlertTriangle, ArrowUpDown, ChevronUp,
  Pencil, Check, Filter, EyeOff, Eye, PanelLeftClose, PanelLeftOpen,
  Hash, ChevronLeft, ChevronsLeft, ChevronsRight,
  BarChart2, LineChart, ScatterChart, AreaChart as AreaIcon, Sparkles,
  CheckSquare, Square, ZoomIn, ZoomOut, Maximize2, Minimize2, Image,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useDbLabels } from "@/lib/dbLabels";
import {
  ResponsiveContainer, LineChart as RLineChart, BarChart as RBarChart,
  AreaChart as RAreaChart, ScatterChart as RScatterChart,
  Line, Bar, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, Brush,
} from "recharts";

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
type Tab = "data" | "query" | "viz";
type ChartType = "line" | "area" | "bar" | "scatter";

const CHART_COLORS = [
  "#2563eb","#16a34a","#dc2626","#d97706","#7c3aed","#0891b2",
  "#db2777","#65a30d","#ea580c","#4f46e5","#059669","#b91c1c",
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
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDateStr(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const dd  = String(d.getUTCDate()).padStart(2, "0");
  const mon = MONTHS[d.getUTCMonth()];
  const yyyy = d.getUTCFullYear();
  const hh  = String(d.getUTCHours()).padStart(2, "0");
  const mm  = String(d.getUTCMinutes()).padStart(2, "0");
  const ss  = String(d.getUTCSeconds()).padStart(2, "0");
  return `${dd}-${mon}-${yyyy} ${hh}:${mm}:${ss}`;
}
function fmtCell(v: any): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) {
    const d = v as Date;
    const dd  = String(d.getUTCDate()).padStart(2, "0");
    const mon = MONTHS[d.getUTCMonth()];
    return `${dd}-${mon}-${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
  }
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  const dt = fmtDateStr(s);
  if (dt) return dt;
  return s.length > 200 ? s.slice(0, 200) + "…" : s;
}

function isDateCol(c: string) {
  return /date|time|timestamp|created|updated|modified/i.test(c);
}

function isNumericVal(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return true;
  if (typeof v === "string") return /^\s*-?\d+(\.\d+)?\s*$/.test(v);
  return false;
}

function MSSQLIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="6.5" rx="8.5" ry="3" fill="#CC2222" />
      <path d="M3.5 6.5v11C3.5 19.43 7.47 21 12 21s8.5-1.57 8.5-3.5v-11" fill="#991B1B" />
      <ellipse cx="12" cy="6.5" rx="8.5" ry="3" fill="#EF4444" />
      <ellipse cx="12" cy="6.5" rx="5" ry="1.5" fill="#FCA5A5" opacity="0.5" />
      <path d="M3.5 11.5c0 1.93 3.97 3.5 8.5 3.5s8.5-1.57 8.5-3.5" stroke="#EF4444" strokeWidth="0.7" opacity="0.6" />
      <path d="M3.5 16c0 1.93 3.97 3.5 8.5 3.5S20.5 17.93 20.5 16" stroke="#EF4444" strokeWidth="0.7" opacity="0.4" />
    </svg>
  );
}

export default function SiteDb() {
  // ── Server / databases
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Db[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const { setLabel: setDbLabel, display: displayDb } = useDbLabels();
  const [editingDb, setEditingDb] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [includeSystem, setIncludeSystem] = useState(false);
  const [dbSearch, setDbSearch] = useState("");

  // ── Tables
  const [tables, setTables] = useState<Tbl[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string } | null>(null);

  // ── Sidebar collapse state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [dbPanelOpen, setDbPanelOpen] = useState(true);
  const [tablePanelOpen, setTablePanelOpen] = useState(true);

  // ── Tab state
  const [tab, setTab] = useState<Tab>("data");

  // ── Data tab
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [dataCols, setDataCols] = useState<string[]>([]);
  const [dataTotal, setDataTotal] = useState(0);
  const [dataPage, setDataPage] = useState(1);
  const [tableDateCol, setTableDateCol]   = useState<string>("");
  const [tableDateFrom, setTableDateFrom] = useState<string>("");
  const [tableDateTo, setTableDateTo]     = useState<string>("");
  const [dataLimit, setDataLimit] = useState(50);
  const [dataSearch, setDataSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loadingData, setLoadingData] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // ── Query tab
  const [queryText, setQueryText] = useState("SELECT TOP 100 * FROM sys.tables");
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryCols, setQueryCols] = useState<string[]>([]);
  const [queryErr, setQueryErr] = useState<string | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryMs, setQueryMs] = useState<number | null>(null);

  // ── Visualization tab
  const [vizChartType, setVizChartType] = useState<ChartType>("line");
  const [vizXCol, setVizXCol] = useState<string>("");
  const [vizYCols, setVizYCols] = useState<Set<string>>(new Set());
  const [vizRows, setVizRows] = useState<any[]>([]);
  const [vizCols, setVizCols] = useState<string[]>([]);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizErr, setVizErr] = useState<string | null>(null);
  const [vizGenerated, setVizGenerated] = useState(false);
  const [vizLimit, setVizLimit] = useState(500);
  const [vizDateCol, setVizDateCol] = useState<string>("");
  const [vizDateFrom, setVizDateFrom] = useState<string>("");
  const [vizDateTo, setVizDateTo] = useState<string>("");
  const [vizFullscreen, setVizFullscreen] = useState(false);
  const [vizBrushStart, setVizBrushStart] = useState<number | undefined>(undefined);
  const [vizBrushEnd, setVizBrushEnd]     = useState<number | undefined>(undefined);
  const chartContainerRef = useRef<HTMLDivElement>(null);

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

  // ─── On table change → load data with default sort by first date col DESC
  useEffect(() => {
    if (!selectedDb || !selectedTable) return;
    setDataPage(1);
    setDataSearch("");
    setColFilters({});
    // will be resolved after cols load — trigger with empty sort first then pick date col
    setSortKey("");
    setSortDir("desc");
    loadDataInitial();
  }, [selectedTable]);

  async function loadDataInitial() {
    if (!selectedDb || !selectedTable) return;
    setLoadingData(true); setDataErr(null);
    try {
      const params = new URLSearchParams({
        db: selectedDb,
        schema: selectedTable.schema,
        table: selectedTable.name,
        page: "1",
        limit: String(dataLimit),
      });
      const r = await fetch(`${BASE}/api/site-db/data?${params}`);
      const j = await r.json();
      if (j.error) { setDataErr(j.error); setDataRows([]); }
      else {
        const rawCols: string[] = j.columns || [];
        const dtCols = rawCols.filter(isDateCol);
        const restCols = rawCols.filter(c => !isDateCol(c));
        const orderedCols = [...dtCols, ...restCols];
        setDataCols(orderedCols);
        setDataTotal(j.total || 0);

        // auto-sort by first date column DESC
        const firstDateCol = dtCols[0] || "";
        if (firstDateCol) {
          setSortKey(firstDateCol);
          setSortDir("desc");
          // reload with sort applied
          const params2 = new URLSearchParams({
            db: selectedDb,
            schema: selectedTable.schema,
            table: selectedTable.name,
            page: "1",
            limit: String(dataLimit),
            sort: firstDateCol,
            dir: "desc",
          });
          const r2 = await fetch(`${BASE}/api/site-db/data?${params2}`);
          const j2 = await r2.json();
          if (!j2.error) {
            setDataRows(j2.rows || []);
            setDataTotal(j2.total || 0);
          } else {
            setDataRows(j.rows || []);
          }
        } else {
          setDataRows(j.rows || []);
        }
      }
    } catch (e: any) {
      setDataErr(e.message); setDataRows([]);
    } finally { setLoadingData(false); }
  }

  // ─── Reload data when page/limit/sort change
  useEffect(() => {
    if (!selectedDb || !selectedTable) return;
    loadData(dataPage, dataSearch, sortKey, sortDir);
  }, [dataPage, dataLimit, sortKey, sortDir]);

  async function loadData(page: number, search: string, sort: string, dir: string,
    dateCol?: string, dateFrom?: string, dateTo?: string) {
    if (!selectedDb || !selectedTable) return;
    setLoadingData(true); setDataErr(null);
    const effDateCol  = dateCol  !== undefined ? dateCol  : tableDateCol;
    const effDateFrom = dateFrom !== undefined ? dateFrom : tableDateFrom;
    const effDateTo   = dateTo   !== undefined ? dateTo   : tableDateTo;
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
      if (effDateCol) {
        params.set("dateCol", effDateCol);
        if (effDateFrom) params.set("dateFrom", effDateFrom);
        if (effDateTo)   params.set("dateTo",   effDateTo);
      }
      const r = await fetch(`${BASE}/api/site-db/data?${params}`);
      const j = await r.json();
      if (j.error) { setDataErr(j.error); setDataRows([]); }
      else {
        setDataRows(j.rows || []);
        const rawCols: string[] = j.columns || [];
        const dtCols = rawCols.filter(isDateCol);
        const restCols = rawCols.filter(c => !isDateCol(c));
        setDataCols([...dtCols, ...restCols]);
        setDataTotal(j.total || 0);
      }
    } catch (e: any) {
      setDataErr(e.message); setDataRows([]);
    } finally { setLoadingData(false); }
  }

  // ── Chart export as PNG (SVG → Canvas → PNG)
  const exportChartAsImage = useCallback(async () => {
    const container = chartContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // retina quality
      canvas.width  = svg.clientWidth  * scale;
      canvas.height = svg.clientHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${selectedTable?.name ?? "chart"}_viz.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, [selectedTable]);

  // ── Zoom helpers (operate on brush indices)
  const zoomIn = useCallback(() => {
    const total = vizRows.length;
    if (total < 2) return;
    const s = vizBrushStart ?? 0;
    const e = vizBrushEnd   ?? total - 1;
    const range = e - s;
    const shrink = Math.max(1, Math.floor(range * 0.25));
    setVizBrushStart(Math.min(s + shrink, e - 1));
    setVizBrushEnd(Math.max(e - shrink, s + 1));
  }, [vizRows.length, vizBrushStart, vizBrushEnd]);

  const zoomOut = useCallback(() => {
    const total = vizRows.length;
    if (total < 2) return;
    const s = vizBrushStart ?? 0;
    const e = vizBrushEnd   ?? total - 1;
    const range = e - s;
    const grow = Math.max(1, Math.floor(range * 0.5));
    setVizBrushStart(Math.max(0, s - grow));
    setVizBrushEnd(Math.min(total - 1, e + grow));
  }, [vizRows.length, vizBrushStart, vizBrushEnd]);

  const zoomFit = useCallback(() => {
    setVizBrushStart(undefined);
    setVizBrushEnd(undefined);
  }, []);

  // ── ESC closes fullscreen
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setVizFullscreen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Shared chart renderer (used in both normal and fullscreen views)
  function renderChart() {
    const hasBrush = vizChartData.length > 50;
    const brushProps = hasBrush ? {
      dataKey: "_x" as const,
      height: 22,
      stroke: "#94a3b8",
      travellerWidth: 6,
      ...(vizBrushStart !== undefined ? { startIndex: vizBrushStart } : {}),
      ...(vizBrushEnd   !== undefined ? { endIndex:   vizBrushEnd   } : {}),
      onChange: (range: any) => {
        if (range && range.startIndex !== undefined) {
          setVizBrushStart(range.startIndex);
          setVizBrushEnd(range.endIndex);
        }
      },
    } : null;

    if (vizChartType === "bar") return (
      <RBarChart data={vizChartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="_x" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {Array.from(vizYCols).map((col, i) => (
          <Bar key={col} dataKey={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
        {brushProps && <Brush {...brushProps} />}
      </RBarChart>
    );

    if (vizChartType === "area") return (
      <RAreaChart data={vizChartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
        <defs>
          {Array.from(vizYCols).map((col, i) => (
            <linearGradient key={col} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="_x" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {Array.from(vizYCols).map((col, i) => (
          <Area key={col} type="monotone" dataKey={col} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} fill={`url(#grad_${i})`} dot={false} />
        ))}
        {brushProps && <Brush {...brushProps} />}
      </RAreaChart>
    );

    if (vizChartType === "scatter") return (
      <RScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="_x" name={vizXCol} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {Array.from(vizYCols).map((col, i) => (
          <Scatter key={col} name={col} data={vizChartData} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </RScatterChart>
    );

    // default: line
    return (
      <RLineChart data={vizChartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="_x" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {Array.from(vizYCols).map((col, i) => (
          <Line key={col} type="monotone" dataKey={col} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
        {brushProps && <Brush {...brushProps} />}
      </RLineChart>
    );
  }

  async function generateViz() {
    if (!selectedDb || !selectedTable || !vizXCol || vizYCols.size === 0) return;
    setVizLoading(true); setVizErr(null); setVizGenerated(false);
    setVizBrushStart(undefined); setVizBrushEnd(undefined);
    try {
      const params = new URLSearchParams({
        db: selectedDb,
        schema: selectedTable.schema,
        table: selectedTable.name,
        page: "1",
        limit: String(vizLimit),
        sort: vizXCol,
        dir: "asc",
      });
      if (vizDateCol) {
        params.set("dateCol", vizDateCol);
        if (vizDateFrom) params.set("dateFrom", vizDateFrom);
        if (vizDateTo)   params.set("dateTo",   vizDateTo);
      }
      const r = await fetch(`${BASE}/api/site-db/data?${params}`);
      const j = await r.json();
      if (j.error) { setVizErr(j.error); setVizRows([]); }
      else {
        setVizRows(j.rows || []);
        setVizCols(j.columns || []);
        setVizGenerated(true);
      }
    } catch (e: any) { setVizErr(e.message); }
    finally { setVizLoading(false); }
  }

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
    () => databases.filter(d => {
      const q = dbSearch.toLowerCase();
      return d.name.toLowerCase().includes(q) || displayDb(d.name).toLowerCase().includes(q);
    }),
    [databases, dbSearch, displayDb],
  );

  function commitDbLabel() {
    if (editingDb != null) {
      setDbLabel(editingDb, editingValue);
      setEditingDb(null);
      setEditingValue("");
    }
  }
  const filteredTables = useMemo(
    () => tables.filter(t =>
      `${t.schema}.${t.name}`.toLowerCase().includes(tableSearch.toLowerCase()),
    ),
    [tables, tableSearch],
  );

  const totalPages = Math.max(1, Math.ceil(dataTotal / dataLimit));

  // reset hidden cols + viz + table date filter when table changes
  useEffect(() => {
    setHiddenCols(new Set()); setShowColPicker(false);
    setVizGenerated(false); setVizRows([]); setVizYCols(new Set()); setVizXCol(""); setVizErr(null);
    setVizDateCol(""); setVizDateFrom(""); setVizDateTo("");
    setTableDateCol(""); setTableDateFrom(""); setTableDateTo("");
  }, [selectedTable]);

  // auto-select first date/time column when columns load (for both viz and table filter)
  useEffect(() => {
    if (!dataCols.length) return;
    const firstDateCol = dataCols.find(isDateCol);
    if (firstDateCol) {
      const today = new Date();
      const toStr = today.toISOString().slice(0, 10);
      const from7 = new Date(today); from7.setDate(from7.getDate() - 7);
      const fromStr = from7.toISOString().slice(0, 10);
      // viz tab
      setVizXCol(firstDateCol);
      setVizDateCol(firstDateCol);
      setVizDateFrom(fromStr);
      setVizDateTo(toStr);
      // data tab
      setTableDateCol(firstDateCol);
      setTableDateFrom(fromStr);
      setTableDateTo(toStr);
    }
  }, [dataCols]);

  // close col picker on outside click
  useEffect(() => {
    if (!showColPicker) return;
    function handler(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColPicker]);

  const visibleCols = useMemo(() => dataCols.filter(c => !hiddenCols.has(c)), [dataCols, hiddenCols]);

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v.trim() !== "");
    if (!activeFilters.length) return dataRows;
    return dataRows.filter(row =>
      activeFilters.every(([col, val]) =>
        fmtCell(row[col]).toLowerCase().includes(val.toLowerCase()),
      ),
    );
  }, [dataRows, colFilters]);

  const startRow = (dataPage - 1) * dataLimit + 1;

  // ── Viz helpers
  const vizNumericCols = useMemo(() => dataCols.filter(c => {
    if (isDateCol(c)) return false;
    const samples = dataRows.slice(0, 20).map(r => r[c]);
    return samples.some(v => v !== null && v !== undefined && isNumericVal(v));
  }), [dataCols, dataRows]);

  const vizAllCols = useMemo(() => dataCols, [dataCols]);

  const vizChartData = useMemo(() => {
    if (!vizGenerated || !vizRows.length || !vizXCol) return [];
    return vizRows.map(row => {
      const pt: any = { _x: fmtCell(row[vizXCol]) };
      vizYCols.forEach(col => { pt[col] = row[col] !== null && row[col] !== undefined ? Number(row[col]) : null; });
      return pt;
    });
  }, [vizRows, vizXCol, vizYCols, vizGenerated]);

  function handleSortClick(col: string) {
    if (sortKey === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(col);
      setSortDir(isDateCol(col) ? "desc" : "asc");
    }
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">

        {/* ─── Sidebar toggle button (always visible) ─── */}
        <button
          onClick={() => setSidebarVisible(v => !v)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-5 h-12 bg-white border border-slate-200 border-l-0 rounded-r-lg shadow-sm hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-all"
          style={{ left: sidebarVisible ? "320px" : "0px" }}
          title={sidebarVisible ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarVisible
            ? <ChevronLeft className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* ─── Left sidebar ─── */}
        {sidebarVisible && (
          <aside className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">

            {/* Server header */}
            <div className="px-4 py-3 border-b border-blue-900 bg-blue-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center shrink-0">
                  <MSSQLIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white">SQL Server</div>
                  <div className="text-[10px] text-blue-300 truncate" title={serverInfo?.host}>
                    {serverInfo?.host || "Connecting…"}
                  </div>
                  {serverInfo?.info?.edition && (
                    <div className="text-[9px] text-blue-400 truncate mt-0.5">{serverInfo.info.edition}</div>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${serverErr ? "bg-rose-400" : "bg-emerald-400"}`} />
              </div>
              {serverErr && (
                <div className="mt-2 text-[10px] bg-rose-900/40 border border-rose-400/30 text-rose-200 rounded px-2 py-1 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="break-words">{serverErr}</span>
                </div>
              )}
            </div>

            {/* ── Databases panel ── */}
            <div className="border-b border-slate-200">
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
                onClick={() => setDbPanelOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Databases
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold">
                    {filteredDbs.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    onClick={e => { e.stopPropagation(); loadDatabases(); }}
                    className="p-1 hover:bg-slate-200 rounded cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3 h-3 text-slate-400 ${loadingDbs ? "animate-spin" : ""}`} />
                  </span>
                  {dbPanelOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </button>

              {dbPanelOpen && (
                <div className="px-3 pb-3">
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={dbSearch}
                      onChange={e => setDbSearch(e.target.value)}
                      placeholder="Search databases…"
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSystem}
                      onChange={e => setIncludeSystem(e.target.checked)}
                      className="w-3 h-3 accent-indigo-600"
                    />
                    Show system DBs
                  </label>
                  <div className="max-h-44 overflow-y-auto space-y-0.5 -mx-1 px-1">
                    {filteredDbs.map(db => {
                      const isEditing = editingDb === db.name;
                      const label = displayDb(db.name);
                      const hasLabel = label !== db.name;
                      const isSel = selectedDb === db.name;
                      return (
                        <div
                          key={db.name}
                          className={`group w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
                            isSel
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isEditing ? (
                            <>
                              <Database className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") commitDbLabel();
                                  if (e.key === "Escape") { setEditingDb(null); setEditingValue(""); }
                                }}
                                onBlur={commitDbLabel}
                                placeholder={db.name}
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                              />
                              <button
                                onMouseDown={e => { e.preventDefault(); commitDbLabel(); }}
                                className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded"
                                title="Save"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelectedDb(db.name)}
                                className="flex items-center gap-2 min-w-0 flex-1"
                              >
                                <Database className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-indigo-200" : "text-indigo-500"}`} />
                                <span className="truncate text-left font-medium">{label}</span>
                                {hasLabel && (
                                  <span className={`text-[9px] truncate ${isSel ? "text-indigo-300" : "text-slate-400"}`}>
                                    ({db.name})
                                  </span>
                                )}
                              </button>
                              <span className={`text-[10px] shrink-0 ${isSel ? "text-indigo-200" : "text-slate-400"}`}>
                                {fmtBytes(db.sizeMB)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDb(db.name);
                                  setEditingValue(label === db.name ? "" : label);
                                }}
                                className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isSel ? "hover:bg-indigo-500 text-indigo-200" : "hover:bg-slate-200 text-slate-400 hover:text-indigo-600"}`}
                                title="Rename label"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {!filteredDbs.length && !loadingDbs && (
                      <div className="text-[11px] text-slate-400 py-4 text-center">No databases found</div>
                    )}
                    {loadingDbs && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Tables panel ── */}
            <div className="flex-1 flex flex-col min-h-0">
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-200"
                onClick={() => setTablePanelOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <Table2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Tables</span>
                  {selectedDb && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold">
                      {filteredTables.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    onClick={e => { e.stopPropagation(); loadTables(); }}
                    className="p-1 hover:bg-slate-200 rounded cursor-pointer"
                    title="Refresh tables"
                  >
                    <RefreshCw className={`w-3 h-3 text-slate-400 ${loadingTables ? "animate-spin" : ""}`} />
                  </span>
                  {tablePanelOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </button>

              {tablePanelOpen && (
                <div className="flex-1 flex flex-col min-h-0 p-3">
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      placeholder="Search tables…"
                      disabled={!selectedDb}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
                    {!selectedDb ? (
                      <div className="text-[11px] text-slate-400 py-8 text-center flex flex-col items-center gap-2">
                        <Database className="w-6 h-6 text-slate-300" />
                        Select a database
                      </div>
                    ) : loadingTables ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      </div>
                    ) : filteredTables.length === 0 ? (
                      <div className="text-[11px] text-slate-400 py-6 text-center">No tables found</div>
                    ) : (
                      filteredTables.map(t => {
                        const isSel = selectedTable?.schema === t.schema && selectedTable?.name === t.name;
                        return (
                          <button
                            key={`${t.schema}.${t.name}`}
                            onClick={() => setSelectedTable({ schema: t.schema, name: t.name })}
                            className={`w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
                              isSel
                                ? "bg-blue-700 text-white shadow-sm"
                                : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Table2 className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-blue-200" : "text-blue-600"}`} />
                              <span className="truncate font-medium">
                                {t.schema !== "dbo" && (
                                  <span className={isSel ? "text-blue-300" : "text-slate-400"}>{t.schema}.</span>
                                )}
                                {t.name}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between text-[10px] pl-5 ${isSel ? "text-blue-200" : "text-slate-400"}`}>
                              <span>{fmtNum(t.rowCount)} rows</span>
                              <span>{fmtBytes(t.sizeMB)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ─── Main content ─── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── Top bar ── */}
          <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              {!sidebarVisible && (
                <button
                  onClick={() => setSidebarVisible(true)}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-indigo-600 mr-1"
                  title="Show sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <MSSQLIcon className="w-3.5 h-3.5" />
                <span className="text-slate-500">{serverInfo?.host || "SQL Server"}</span>
              </div>
              {selectedDb && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <div className="flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm truncate max-w-[120px]">
                      {displayDb(selectedDb)}
                    </span>
                    {displayDb(selectedDb) !== selectedDb && (
                      <span className="text-[10px] text-slate-400">({selectedDb})</span>
                    )}
                  </div>
                </>
              )}
              {selectedTable && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <div className="flex items-center gap-1">
                    <Table2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm truncate max-w-[180px]">
                      {selectedTable.schema}.{selectedTable.name}
                    </span>
                  </div>
                  {dataTotal > 0 && (
                    <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold shrink-0">
                      {fmtNum(dataTotal)} rows
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1 shrink-0">
              {([
                { id: "data" as Tab, label: "Data", icon: Table2 },
                { id: "viz" as Tab, label: "Visualize", icon: BarChart2 },
                { id: "query" as Tab, label: "Query", icon: Code2 },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (t.id === "viz") setSidebarVisible(false);
                    else setSidebarVisible(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tab === t.id
                      ? "bg-blue-700 text-white shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-hidden bg-slate-50">
            {!selectedDb ? (
              <EmptyState
                icon={<Database className="w-12 h-12 text-slate-300" />}
                title="No database selected"
                hint="Choose a database from the sidebar to begin exploring."
              />
            ) : tab === "data" ? (
              !selectedTable ? (
                <EmptyState
                  icon={<Table2 className="w-12 h-12 text-slate-300" />}
                  title="No table selected"
                  hint="Pick a table from the sidebar to view its rows."
                />
              ) : (
                <div className="h-full flex flex-col">

                  {/* ── Toolbar ── */}
                  <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-2 flex-wrap shrink-0">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={dataSearch}
                        onChange={e => setDataSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { setDataPage(1); loadData(1, dataSearch, sortKey, sortDir); } }}
                        placeholder="Search… (Enter)"
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-slate-50"
                      />
                    </div>

                    {/* ── Date filter ── */}
                    {dataCols.some(isDateCol) && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                        {/* Date column selector */}
                        <select
                          value={tableDateCol}
                          onChange={e => {
                            const col = e.target.value;
                            setTableDateCol(col);
                            if (!col) { setTableDateFrom(""); setTableDateTo(""); }
                          }}
                          className="text-xs border-0 bg-transparent text-blue-700 font-medium focus:outline-none cursor-pointer max-w-[120px]"
                        >
                          <option value="">No date filter</option>
                          {dataCols.filter(isDateCol).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {tableDateCol && (
                          <>
                            <span className="text-blue-300 text-xs">|</span>
                            <input
                              type="date"
                              value={tableDateFrom}
                              onChange={e => setTableDateFrom(e.target.value)}
                              className="text-xs border-0 bg-transparent text-blue-700 focus:outline-none cursor-pointer w-[108px]"
                            />
                            <span className="text-blue-400 text-xs font-medium">→</span>
                            <input
                              type="date"
                              value={tableDateTo}
                              onChange={e => setTableDateTo(e.target.value)}
                              className="text-xs border-0 bg-transparent text-blue-700 focus:outline-none cursor-pointer w-[108px]"
                            />
                            <button
                              onClick={() => { setDataPage(1); loadData(1, dataSearch, sortKey, sortDir, tableDateCol, tableDateFrom, tableDateTo); }}
                              className="ml-1 px-2 py-0.5 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-semibold rounded-md transition-colors"
                            >Apply</button>
                            {(tableDateFrom || tableDateTo) && (
                              <button
                                onClick={() => { setTableDateFrom(""); setTableDateTo(""); setDataPage(1); loadData(1, dataSearch, sortKey, sortDir, tableDateCol, "", ""); }}
                                className="text-blue-400 hover:text-blue-700 text-[10px] underline"
                              >Clear</button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Row limit */}
                    <select
                      value={dataLimit}
                      onChange={e => { setDataLimit(parseInt(e.target.value)); setDataPage(1); }}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                    >
                      {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n} rows</option>)}
                    </select>

                    {/* Filter count indicator */}
                    {filteredRows.length < dataRows.length && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">
                        {filteredRows.length} of {dataRows.length} shown
                      </span>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                      {/* Columns picker */}
                      <div className="relative" ref={colPickerRef}>
                        <button
                          onClick={() => setShowColPicker(v => !v)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors border ${
                            hiddenCols.size > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                          title="Show/hide columns"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          {hiddenCols.size > 0 ? `${hiddenCols.size} hidden` : "Columns"}
                        </button>
                        {showColPicker && (
                          <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl w-56 overflow-hidden">
                            <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">Visible columns</span>
                              <button
                                onClick={() => setHiddenCols(new Set())}
                                className="text-[10px] text-indigo-600 hover:underline font-medium"
                              >
                                Show all
                              </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto py-1">
                              {dataCols.map(c => (
                                <label key={c} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!hiddenCols.has(c)}
                                    onChange={() => setHiddenCols(prev => {
                                      const next = new Set(prev);
                                      next.has(c) ? next.delete(c) : next.add(c);
                                      return next;
                                    })}
                                    className="accent-indigo-600 w-3.5 h-3.5"
                                  />
                                  <span className={`text-xs truncate ${isDateCol(c) ? "text-indigo-700 font-medium" : "text-slate-700"}`}>{c}</span>
                                  {isDateCol(c) && <span className="text-[9px] bg-indigo-100 text-indigo-500 rounded px-1 shrink-0">date</span>}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Filter toggle */}
                      <button
                        onClick={() => { setShowFilters(v => !v); if (showFilters) setColFilters({}); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors border ${
                          showFilters || Object.values(colFilters).some(v => v)
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {Object.values(colFilters).filter(v => v).length > 0
                          ? `${Object.values(colFilters).filter(v => v).length} filter${Object.values(colFilters).filter(v => v).length > 1 ? "s" : ""}`
                          : "Filter"}
                      </button>

                      {/* Export */}
                      <button
                        onClick={() => exportRows(dataRows, `${selectedTable.schema}_${selectedTable.name}_p${dataPage}`)}
                        disabled={!dataRows.length}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium disabled:opacity-40 border border-emerald-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>

                      {/* Refresh */}
                      <button
                        onClick={() => loadData(dataPage, dataSearch, sortKey, sortDir)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors"
                        title="Refresh data"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingData ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* ── Data table ── */}
                  <div className="flex-1 overflow-auto">
                    {dataErr ? (
                      <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <code className="break-all text-xs">{dataErr}</code>
                      </div>
                    ) : loadingData && !dataRows.length ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-sm">Loading data…</span>
                      </div>
                    ) : (
                      <table className="text-xs w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-800 text-white">
                            {/* Row number header */}
                            <th className="px-3 py-2.5 text-left font-medium text-slate-400 border-r border-slate-700 w-10 select-none">
                              <Hash className="w-3 h-3" />
                            </th>
                            {visibleCols.map(c => (
                              <th
                                key={c}
                                onClick={() => handleSortClick(c)}
                                className={`px-3 py-2.5 text-left font-semibold border-r border-slate-700 last:border-r-0 cursor-pointer hover:bg-slate-700 select-none whitespace-nowrap group transition-colors ${
                                  sortKey === c ? "bg-indigo-700" : ""
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {isDateCol(c) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  )}
                                  <span className="truncate max-w-[150px]" title={c}>{c}</span>
                                  {sortKey === c
                                    ? (sortDir === "asc"
                                        ? <ChevronUp className="w-3 h-3 text-blue-300 shrink-0" />
                                        : <ChevronDown className="w-3 h-3 text-blue-300 shrink-0" />)
                                    : <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-60 shrink-0" />}
                                </div>
                              </th>
                            ))}
                          </tr>
                          {showFilters && (
                            <tr className="bg-indigo-900/90">
                              <th className="px-1.5 py-1 border-r border-indigo-700" />
                              {visibleCols.map(c => (
                                <th key={c} className="px-1.5 py-1 border-r border-indigo-700 last:border-r-0">
                                  <input
                                    value={colFilters[c] || ""}
                                    onChange={e => setColFilters(prev => ({ ...prev, [c]: e.target.value }))}
                                    placeholder="filter…"
                                    className="w-full min-w-[60px] px-1.5 py-0.5 text-[10px] font-normal border border-indigo-400/50 rounded bg-white/10 focus:outline-none focus:border-indigo-300 placeholder-indigo-300/50 text-white"
                                  />
                                </th>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRows.map((row, i) => {
                            const rowNum = startRow + i;
                            return (
                              <tr
                                key={i}
                                className={`group hover:bg-indigo-50/60 transition-colors ${
                                  i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                }`}
                              >
                                {/* Row number */}
                                <td className="px-3 py-2 text-slate-400 text-[10px] font-mono border-r border-slate-100 select-none text-right w-10 shrink-0">
                                  {rowNum}
                                </td>
                                {visibleCols.map(c => {
                                  const raw = row[c];
                                  const formatted = fmtCell(raw);
                                  const isNull = raw === null || raw === undefined;
                                  const isDate = isDateCol(c) && !isNull && formatted !== "—";
                                  const isNum = !isDate && isNumericVal(raw);
                                  return (
                                    <td
                                      key={c}
                                      className={`px-3 py-2 border-r border-slate-100 last:border-r-0 align-middle whitespace-nowrap max-w-[300px] truncate ${
                                        isNull
                                          ? "text-slate-300 italic"
                                          : isDate
                                          ? "text-indigo-700 font-medium"
                                          : isNum
                                          ? "text-right text-slate-700 font-mono tabular-nums"
                                          : "text-slate-700"
                                      }`}
                                      title={formatted}
                                    >
                                      {formatted}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                          {!filteredRows.length && (
                            <tr>
                              <td colSpan={(dataCols.length || 0) + 1} className="px-3 py-12 text-center text-slate-400 text-sm">
                                {dataRows.length ? "No rows match the current filters" : "No rows in this table"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* ── Pagination ── */}
                  <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>
                        {fmtNum(startRow)}–{fmtNum(Math.min(startRow + dataLimit - 1, dataTotal))} of{" "}
                        <span className="font-semibold text-slate-700">{fmtNum(dataTotal)}</span> rows
                      </span>
                      {sortKey && (
                        <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                          {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                          {sortKey}
                        </span>
                      )}
                      {loadingData && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDataPage(1)}
                        disabled={dataPage === 1}
                        className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                        title="First page"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setDataPage(p => Math.max(1, p - 1))}
                        disabled={dataPage === 1}
                        className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      <div className="flex items-center gap-1.5 px-2 text-xs text-slate-600">
                        <span>Page</span>
                        <input
                          type="number"
                          value={dataPage}
                          onChange={e => setDataPage(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-12 px-1.5 py-1 border border-slate-200 rounded-lg text-center focus:outline-none focus:border-indigo-400 text-xs font-semibold"
                        />
                        <span className="text-slate-400">of {fmtNum(totalPages)}</span>
                      </div>

                      <button
                        onClick={() => setDataPage(p => Math.min(totalPages, p + 1))}
                        disabled={dataPage >= totalPages}
                        className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setDataPage(totalPages)}
                        disabled={dataPage >= totalPages}
                        className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                        title="Last page"
                      >
                        <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : tab === "query" ? (
              <div className="p-5 h-full flex flex-col gap-4 overflow-hidden">
                {/* Query editor */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-200">SQL Editor</span>
                      <span className="text-[10px] text-slate-400 bg-slate-700 rounded px-1.5 py-0.5">SELECT only</span>
                      <span className="text-[10px] text-indigo-400">· {selectedDb}</span>
                    </div>
                    <button
                      onClick={runQuery}
                      disabled={queryRunning || !queryText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
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
                    rows={7}
                    className="w-full px-4 py-3 text-xs font-mono text-slate-800 focus:outline-none resize-y bg-slate-900 text-slate-100"
                    placeholder="SELECT * FROM ..."
                  />
                  <div className="px-4 py-2 border-t border-slate-700 bg-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Ctrl/Cmd + Enter to run</span>
                    {queryMs != null && (
                      <span className="text-emerald-400 font-medium">
                        {queryMs} ms · {queryRows.length} rows returned
                      </span>
                    )}
                  </div>
                </div>

                {/* Query results */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                  <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      Results
                      {queryRows.length > 0 && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                          {queryRows.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => exportRows(queryRows, `query_result_${Date.now()}`)}
                      disabled={!queryRows.length}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium disabled:opacity-40 border border-emerald-200 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Export
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {queryErr ? (
                      <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <code className="break-all text-xs">{queryErr}</code>
                      </div>
                    ) : queryRows.length ? (
                      <table className="text-xs w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-800 text-white">
                            <th className="px-3 py-2.5 text-left font-medium text-slate-400 border-r border-slate-700 w-10 select-none">
                              <Hash className="w-3 h-3" />
                            </th>
                            {queryCols.map(c => (
                              <th key={c} className="px-3 py-2.5 text-left font-semibold border-r border-slate-700 last:border-r-0 whitespace-nowrap">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryRows.map((row, i) => (
                            <tr key={i} className={`hover:bg-indigo-50/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                              <td className="px-3 py-2 text-slate-400 text-[10px] font-mono border-r border-slate-100 text-right select-none w-10">
                                {i + 1}
                              </td>
                              {queryCols.map(c => (
                                <td
                                  key={c}
                                  className="px-3 py-2 border-r border-slate-100 last:border-r-0 text-slate-700 align-middle whitespace-nowrap max-w-[300px] truncate"
                                  title={fmtCell(row[c])}
                                >
                                  {fmtCell(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Code2 className="w-8 h-8 text-slate-300" />
                        <span className="text-sm">Run a query to see results</span>
                        <span className="text-xs text-slate-300">Ctrl/Cmd + Enter</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : tab === "viz" ? (
              !selectedTable ? (
                <EmptyState
                  icon={<BarChart2 className="w-12 h-12 text-slate-300" />}
                  title="No table selected"
                  hint="Pick a table from the sidebar to visualize its data."
                />
              ) : (
                <div className="h-full flex overflow-hidden">
                  {/* ── Left config panel ── */}
                  <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-300" />
                        <span className="text-xs font-bold text-white">Chart Configuration</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                      {/* Chart type */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Chart Type</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            { id: "line" as ChartType, label: "Line", icon: LineChart },
                            { id: "area" as ChartType, label: "Area", icon: AreaIcon },
                            { id: "bar" as ChartType, label: "Bar", icon: BarChart2 },
                            { id: "scatter" as ChartType, label: "Scatter", icon: ScatterChart },
                          ]).map(ct => (
                            <button
                              key={ct.id}
                              onClick={() => setVizChartType(ct.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                vizChartType === ct.id
                                  ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                              }`}
                            >
                              <ct.icon className="w-3.5 h-3.5" />
                              {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* X-Axis */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">X-Axis (Label)</label>
                        <select
                          value={vizXCol}
                          onChange={e => setVizXCol(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-blue-400"
                        >
                          <option value="">— Select column —</option>
                          {vizAllCols.map(c => (
                            <option key={c} value={c}>{c}{isDateCol(c) ? " 📅" : ""}</option>
                          ))}
                        </select>
                      </div>

                      {/* Y-Axis columns */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Y-Axis Columns</label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setVizYCols(new Set(vizNumericCols))}
                              className="text-[10px] text-blue-600 hover:underline"
                            >All</button>
                            <span className="text-slate-300">·</span>
                            <button
                              onClick={() => setVizYCols(new Set())}
                              className="text-[10px] text-slate-500 hover:underline"
                            >None</button>
                          </div>
                        </div>
                        {vizNumericCols.length === 0 ? (
                          <div className="text-xs text-slate-400 py-2">No numeric columns detected. Load data first on the Data tab.</div>
                        ) : (
                          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                            {vizNumericCols.map((c, i) => {
                              const checked = vizYCols.has(c);
                              return (
                                <button
                                  key={c}
                                  onClick={() => setVizYCols(prev => {
                                    const n = new Set(prev);
                                    n.has(c) ? n.delete(c) : n.add(c);
                                    return n;
                                  })}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors border-b border-slate-100 last:border-b-0 ${
                                    checked ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded shrink-0 border-2"
                                    style={{
                                      backgroundColor: checked ? CHART_COLORS[i % CHART_COLORS.length] : "transparent",
                                      borderColor: CHART_COLORS[i % CHART_COLORS.length],
                                    }}
                                  />
                                  <span className="truncate font-medium">{c}</span>
                                  {checked && <Check className="w-3 h-3 ml-auto shrink-0 text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {vizYCols.size > 0 && (
                          <div className="mt-1.5 text-[10px] text-blue-600 font-medium">{vizYCols.size} column{vizYCols.size > 1 ? "s" : ""} selected</div>
                        )}
                      </div>

                      {/* Date Filter */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Date Filter</label>
                        <div className="space-y-2">
                          <select
                            value={vizDateCol}
                            onChange={e => {
                              const col = e.target.value;
                              setVizDateCol(col);
                              if (col) {
                                const today = new Date();
                                const toStr = today.toISOString().slice(0, 10);
                                const from7 = new Date(today); from7.setDate(from7.getDate() - 7);
                                const fromStr = from7.toISOString().slice(0, 10);
                                setVizDateFrom(fromStr); setVizDateTo(toStr);
                              } else { setVizDateFrom(""); setVizDateTo(""); }
                            }}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-blue-400"
                          >
                            <option value="">— No date filter —</option>
                            {dataCols.filter(isDateCol).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          {vizDateCol && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">From</label>
                                <input
                                  type="date"
                                  value={vizDateFrom}
                                  onChange={e => setVizDateFrom(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">To</label>
                                <input
                                  type="date"
                                  value={vizDateTo}
                                  onChange={e => setVizDateTo(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                                />
                              </div>
                            </div>
                          )}
                          {vizDateCol && (vizDateFrom || vizDateTo) && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-blue-600 font-medium">
                                {vizDateFrom && vizDateTo
                                  ? `${vizDateFrom} → ${vizDateTo}`
                                  : vizDateFrom ? `From ${vizDateFrom}` : `Until ${vizDateTo}`}
                              </span>
                              <button
                                onClick={() => { setVizDateFrom(""); setVizDateTo(""); }}
                                className="text-[10px] text-rose-500 hover:underline"
                              >Clear</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data points limit */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Data Points</label>
                        <select
                          value={vizLimit}
                          onChange={e => setVizLimit(parseInt(e.target.value))}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-blue-400"
                        >
                          {[100, 250, 500, 1000, 2000, 5000].map(n => (
                            <option key={n} value={n}>{n.toLocaleString()} rows</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Generate button */}
                    <div className="p-4 border-t border-slate-200">
                      <button
                        onClick={generateViz}
                        disabled={vizLoading || !vizXCol || vizYCols.size === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {vizLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                          : <><Sparkles className="w-4 h-4" /> Generate Chart</>}
                      </button>
                      {(!vizXCol || vizYCols.size === 0) && (
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">
                          Select X-axis and at least one Y column
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Chart display area ── */}
                  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Chart header */}
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">
                          {vizGenerated
                            ? `${selectedDb} · ${selectedTable?.schema}.${selectedTable?.name}`
                            : "Chart Display"}
                        </div>
                        {vizGenerated && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {vizChartData.length.toLocaleString()} data points · {vizChartType} chart · X: {vizXCol}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vizGenerated && vizChartData.length > 0 && (
                          <>
                            {/* Zoom controls */}
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                              <button
                                onClick={zoomIn}
                                title="Zoom In"
                                className="flex items-center px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"
                              ><ZoomIn className="w-3.5 h-3.5" /></button>
                              <button
                                onClick={zoomOut}
                                title="Zoom Out"
                                className="flex items-center px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"
                              ><ZoomOut className="w-3.5 h-3.5" /></button>
                              <button
                                onClick={zoomFit}
                                title="Fit All"
                                className="flex items-center px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors text-[10px] font-medium"
                              >Fit</button>
                            </div>
                            {/* Export as PNG */}
                            <button
                              onClick={exportChartAsImage}
                              title="Export chart as PNG"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 transition-colors"
                            ><Image className="w-3.5 h-3.5" /> PNG</button>
                            {/* Export data CSV */}
                            <button
                              onClick={() => exportRows(vizRows, `${selectedTable?.name}_viz`)}
                              title="Export data as CSV/XLSX"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200 transition-colors"
                            ><Download className="w-3.5 h-3.5" /> Data</button>
                          </>
                        )}
                        {/* Fullscreen toggle */}
                        <button
                          onClick={() => setVizFullscreen(v => !v)}
                          title={vizFullscreen ? "Exit fullscreen" : "Fullscreen"}
                          className="flex items-center px-2 py-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                        >
                          {vizFullscreen
                            ? <Minimize2 className="w-3.5 h-3.5" />
                            : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Chart body */}
                    <div className="flex-1 p-5 overflow-auto">
                      {vizErr ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <code className="break-all">{vizErr}</code>
                        </div>
                      ) : vizLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                          <span className="text-sm">Loading chart data…</span>
                        </div>
                      ) : !vizGenerated ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                          <div className="p-5 bg-slate-100 rounded-2xl">
                            <BarChart2 className="w-12 h-12 text-slate-300" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-600">Configure & Generate a Chart</div>
                            <div className="text-xs text-slate-400 mt-1">Select X-axis, Y columns, then click Generate</div>
                          </div>
                        </div>
                      ) : vizChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data to display</div>
                      ) : (
                        <>
                          {/* Fullscreen overlay */}
                          {vizFullscreen && (
                            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{selectedDb} · {selectedTable?.schema}.{selectedTable?.name}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{vizChartData.length.toLocaleString()} data points · {vizChartType} chart · X: {vizXCol}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                    <button onClick={zoomIn} title="Zoom In" className="flex items-center px-2.5 py-2 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"><ZoomIn className="w-4 h-4" /></button>
                                    <button onClick={zoomOut} title="Zoom Out" className="flex items-center px-2.5 py-2 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"><ZoomOut className="w-4 h-4" /></button>
                                    <button onClick={zoomFit} title="Fit All" className="flex items-center px-3 py-2 hover:bg-slate-100 text-slate-600 transition-colors text-xs font-medium">Fit</button>
                                  </div>
                                  <button onClick={exportChartAsImage} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 transition-colors"><Image className="w-3.5 h-3.5" /> PNG</button>
                                  <button onClick={() => exportRows(vizRows, `${selectedTable?.name}_viz`)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200 transition-colors"><Download className="w-3.5 h-3.5" /> Data</button>
                                  <button onClick={() => setVizFullscreen(false)} className="flex items-center px-2.5 py-2 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"><Minimize2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <div className="flex-1 p-6" ref={chartContainerRef}>
                                <ResponsiveContainer width="100%" height="100%">
                                  {renderChart()}
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                          {/* Normal view */}
                          <div className="h-full min-h-[400px]" ref={chartContainerRef}>
                            <ResponsiveContainer width="100%" height="100%">
                              {renderChart()}
                            </ResponsiveContainer>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </main>
      </div>
    </Layout>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
      <div className="p-4 bg-slate-100 rounded-2xl">{icon}</div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{hint}</p>
    </div>
  );
}
