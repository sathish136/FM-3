import { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Database, Table2, ChevronRight, RefreshCw, Calendar, Loader2,
  AlertTriangle, Download, FileText, Activity, BarChart3, Layers,
  TrendingUp, Sparkles, Filter, X, Check, Clock, Gauge, Droplets,
  Wind, Zap, Beaker, Search, ChevronDown, FileDown, Printer, Pencil,
  CheckCircle2, XCircle, ShieldAlert, Wifi, WifiOff, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ScatterChart, Scatter,
  ReferenceLine,
} from "recharts";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useDbLabels } from "@/lib/dbLabels";
import PlantDashboard from "./SiteDbAnalyze/PlantDashboard";
import { detectPlantSchema } from "./SiteDbAnalyze/plantSchemas";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Db = { name: string; sizeMB: number };
type Tbl = { schema: string; name: string; rowCount: number; sizeMB: number };
type Profile = {
  timeCol: string | null;
  timeColType: string | null;
  tags: { name: string; type: string }[];
  groups: Record<string, string[]>;
  dateRange: { min: string; max: string } | null;
  totalRows: number;
  intervalSec: number | null;
  allColumns: { name: string; dataType: string }[];
};
type Stats = Record<string, {
  count: number; nulls: number; zeros: number;
  min: number; max: number; avg: number; std: number;
  first: any; last: any;
  p25?: number; p50?: number; p75?: number; p95?: number; p99?: number;
}>;

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#0ea5e9",
  "#a855f7", "#14b8a6", "#eab308", "#fb7185", "#22c55e",
];

const PRESETS: { label: string; ms: number | "all" }[] = [
  { label: "Last 1h", ms: 3600 * 1000 },
  { label: "Last 6h", ms: 6 * 3600 * 1000 },
  { label: "Last 24h", ms: 24 * 3600 * 1000 },
  { label: "Last 7d", ms: 7 * 24 * 3600 * 1000 },
  { label: "Last 30d", ms: 30 * 24 * 3600 * 1000 },
  { label: "Last 90d", ms: 90 * 24 * 3600 * 1000 },
  { label: "All time", ms: "all" },
];

const BUCKETS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "1d", value: "1d" },
];

// ─── helpers ───
function fmtNum(n: any, decimals = 2): string {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1e6) return v.toExponential(2);
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtInt(n: any): string {
  const v = Number(n);
  return isFinite(v) ? v.toLocaleString() : "—";
}
function fmtTime(t: any): string {
  if (!t) return "—";
  const d = new Date(t);
  return isNaN(d.getTime()) ? String(t) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function fmtDateOnly(t: any): string {
  if (!t) return "—";
  const d = new Date(t);
  return isNaN(d.getTime()) ? String(t) : d.toLocaleDateString("en-IN");
}
function tagIcon(name: string) {
  const n = name.toLowerCase();
  if (/(flow|fm)/.test(n)) return Wind;
  if (/(press|pt|dp|psi)/.test(n)) return Gauge;
  if (/(level|lvl|lt)/.test(n)) return Droplets;
  if (/(ph|tds|cond|orp)/.test(n)) return Beaker;
  if (/(energy|kwh|freq|amp|volt|kw)/.test(n)) return Zap;
  if (/(temp|tt)/.test(n)) return Activity;
  return TrendingUp;
}
function autoUnit(name: string): string {
  const n = name.toLowerCase();
  if (/freq/.test(n)) return "Hz";
  if (/(flow|fm)/.test(n)) return "m³/h";
  if (/(press|pt|dp)/.test(n)) return "bar";
  if (/(level|lvl|lt)/.test(n)) return "%";
  if (/ph/.test(n)) return "pH";
  if (/tds/.test(n)) return "ppm";
  if (/cond/.test(n)) return "µS/cm";
  if (/temp/.test(n)) return "°C";
  if (/energy/.test(n)) return "kWh";
  if (/totalizer/.test(n)) return "m³";
  if (/reco/.test(n)) return "%";
  if (/reject/.test(n)) return "%";
  return "";
}

function generateInsights(tag: string, s: Stats[string]): string[] {
  const insights: string[] = [];
  const unit = autoUnit(tag);
  const u = unit ? ` ${unit}` : "";
  if (!s) return insights;
  if (s.count === 0) {
    insights.push(`No data points recorded in this range.`);
    return insights;
  }
  const range = s.max - s.min;
  const cv = s.std / Math.abs(s.avg || 1);
  insights.push(`${fmtInt(s.count)} samples · range ${fmtNum(s.min)} → ${fmtNum(s.max)}${u} (Δ ${fmtNum(range)}${u}).`);
  insights.push(`Mean ${fmtNum(s.avg)}${u}, median ${fmtNum(s.p50)}${u}, std-dev ${fmtNum(s.std)}${u}.`);
  if (s.p95 != null && s.p99 != null) {
    insights.push(`95th percentile ${fmtNum(s.p95)}${u}, 99th ${fmtNum(s.p99)}${u} — useful as upper alarm thresholds.`);
  }
  if (s.zeros > s.count * 0.3) {
    insights.push(`⚠️ ${fmtNum(100 * s.zeros / s.count, 1)}% of readings are zero — sensor offline or process idle?`);
  } else if (s.zeros > s.count * 0.05) {
    insights.push(`${fmtNum(100 * s.zeros / s.count, 1)}% zero readings — possible idle periods.`);
  }
  if (s.nulls > 0) {
    insights.push(`${fmtNum(100 * s.nulls / (s.count + s.nulls), 1)}% missing values (${fmtInt(s.nulls)} nulls).`);
  }
  if (cv > 0.5) {
    insights.push(`High variability (CV = ${fmtNum(cv, 2)}). Process is unstable or covers multiple operating regimes.`);
  } else if (cv < 0.05 && s.avg !== 0) {
    insights.push(`Very stable readings (CV = ${fmtNum(cv, 2)}) — process is well-controlled.`);
  }
  if (s.last != null && s.avg !== 0) {
    const dev = (Number(s.last) - s.avg) / (s.std || 1);
    if (Math.abs(dev) > 2) {
      insights.push(`Latest value ${fmtNum(s.last)}${u} is ${dev > 0 ? "above" : "below"} mean by ${fmtNum(Math.abs(dev), 1)}σ — investigate.`);
    }
  }
  // Domain-specific
  const n = tag.toLowerCase();
  if (/reco/.test(n)) {
    if (s.avg < 50) insights.push(`Recovery averaging ${fmtNum(s.avg, 1)}% — below typical RO target of 65–80%.`);
    else if (s.avg > 85) insights.push(`Recovery averaging ${fmtNum(s.avg, 1)}% — high; check for membrane fouling risk.`);
  }
  if (/dp/.test(n) && s.avg > 2.5) {
    insights.push(`Differential pressure averaging ${fmtNum(s.avg, 2)} bar — elevated; clean / inspect membranes.`);
  }
  if (n === "tds" && s.avg > 500) {
    insights.push(`Permeate TDS averaging ${fmtNum(s.avg, 0)} ppm — above typical RO permeate target (<100 ppm).`);
  }
  if (/ph/.test(n) && (s.avg < 6 || s.avg > 9)) {
    insights.push(`pH averaging ${fmtNum(s.avg, 2)} — outside neutral 6–9 band; verify dosing.`);
  }
  return insights;
}

export default function SiteDbAnalytics() {
  // ── selection
  const [databases, setDatabases] = useState<Db[]>([]);
  const [db, setDb] = useState<string>("");
  const { setLabel: setDbLabelFn, display: displayDb } = useDbLabels();
  const [editingDbLabel, setEditingDbLabel] = useState(false);
  const [dbLabelInput, setDbLabelInput] = useState("");
  const [tables, setTables] = useState<Tbl[]>([]);
  const [tbl, setTbl] = useState<{ schema: string; name: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ── time range
  const [presetIdx, setPresetIdx] = useState(2); // 24h
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [bucket, setBucket] = useState<string>("1h");
  const [agg, setAgg] = useState<"avg" | "min" | "max" | "sum">("avg");

  // ── tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // ── view mode
  const [viewMode, setViewMode] = useState<"plant" | "advanced">("plant");

  // ── analytics data
  const [series, setSeries] = useState<any[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [distTag, setDistTag] = useState<string>("");
  const [dist, setDist] = useState<any>(null);
  const [heatTag, setHeatTag] = useState<string>("");
  const [heat, setHeat] = useState<any>(null);
  const [corr, setCorr] = useState<any>(null);
  const [loadingCorr, setLoadingCorr] = useState(false);
  const [anomTag, setAnomTag] = useState<string>("");
  const [anomSigma, setAnomSigma] = useState(3);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loadingAnom, setLoadingAnom] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  const pendingTblRef = useRef<{ schema: string; name: string } | null>(null);

  // ─── load DBs + restore from sessionStorage hint
  useEffect(() => {
    loadDatabases();
    try {
      const d = sessionStorage.getItem("siteDbAnalyze:db");
      const s = sessionStorage.getItem("siteDbAnalyze:schema");
      const t = sessionStorage.getItem("siteDbAnalyze:table");
      if (d) setDb(d);
      if (d && s && t) pendingTblRef.current = { schema: s, name: t };
      sessionStorage.removeItem("siteDbAnalyze:db");
      sessionStorage.removeItem("siteDbAnalyze:schema");
      sessionStorage.removeItem("siteDbAnalyze:table");
    } catch {}
  }, []);
  async function loadDatabases() {
    try {
      const r = await fetch(`${BASE}/api/site-db/databases`);
      const j = await r.json();
      if (Array.isArray(j.databases)) setDatabases(j.databases);
    } catch {}
  }

  // ─── load tables when DB changes
  useEffect(() => {
    setTbl(null); setProfile(null); setSelectedTags([]);
    setSeries([]); setStats({}); setDist(null); setHeat(null); setCorr(null); setAnomalies([]);
    if (!db) { setTables([]); return; }
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/site-db/tables?db=${encodeURIComponent(db)}`);
        const j = await r.json();
        if (Array.isArray(j.tables)) setTables(j.tables);
        const pending = pendingTblRef.current;
        if (pending) {
          pendingTblRef.current = null;
          setTbl(pending);
        }
      } catch {}
    })();
  }, [db]);

  // ─── load profile when table changes
  useEffect(() => {
    if (!db || !tbl) return;
    setLoadingProfile(true); setErr(null); setProfile(null); setSelectedTags([]);
    setSeries([]); setStats({}); setDist(null); setHeat(null); setCorr(null); setAnomalies([]);
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/site-db/analytics/profile?db=${encodeURIComponent(db)}&schema=${encodeURIComponent(tbl.schema)}&table=${encodeURIComponent(tbl.name)}`);
        const j = await r.json();
        if (j.error) { setErr(j.error); return; }
        setProfile(j);
        // Auto-select first 4 tags
        const initTags = (j.tags || []).slice(0, 4).map((t: any) => t.name);
        setSelectedTags(initTags);
        if (initTags[0]) { setDistTag(initTags[0]); setHeatTag(initTags[0]); setAnomTag(initTags[0]); }
        // Auto bucket based on date span
        if (j.dateRange?.min && j.dateRange?.max) {
          const span = (new Date(j.dateRange.max).getTime() - new Date(j.dateRange.min).getTime()) / 1000;
          if (span > 90 * 86400) setBucket("1d");
          else if (span > 30 * 86400) setBucket("6h");
          else if (span > 7 * 86400) setBucket("1h");
          else setBucket("15m");
        }
      } catch (e: any) { setErr(e.message); }
      finally { setLoadingProfile(false); }
    })();
  }, [db, tbl?.schema, tbl?.name]);

  // ─── compute date range from preset OR custom
  const { fromDate, toDate } = useMemo(() => {
    if (from && to) return { fromDate: new Date(from), toDate: new Date(to) };
    const p = PRESETS[presetIdx];
    if (!p) return { fromDate: new Date(Date.now() - 86400 * 1000), toDate: new Date() };
    if (p.ms === "all") {
      if (profile?.dateRange) return { fromDate: new Date(profile.dateRange.min), toDate: new Date(profile.dateRange.max) };
      return { fromDate: new Date(0), toDate: new Date() };
    }
    if (profile?.dateRange?.max) {
      const end = new Date(profile.dateRange.max);
      return { fromDate: new Date(end.getTime() - p.ms), toDate: end };
    }
    return { fromDate: new Date(Date.now() - p.ms), toDate: new Date() };
  }, [presetIdx, from, to, profile]);

  // ─── load series + stats when selection changes
  useEffect(() => {
    if (!db || !tbl || !profile?.timeCol || !selectedTags.length) return;
    loadSeries();
    loadStats();
  }, [db, tbl, profile?.timeCol, selectedTags.join(","), bucket, agg, presetIdx, from, to]);

  async function loadSeries() {
    if (!profile?.timeCol) return;
    setLoadingSeries(true);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/series`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile.timeCol, tags: selectedTags,
          from: fromDate.toISOString(), to: toDate.toISOString(),
          bucket, agg,
        }),
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); setSeries([]); }
      else setSeries(j.rows || []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoadingSeries(false); }
  }
  async function loadStats() {
    setLoadingStats(true);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/stats`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile?.timeCol, tags: selectedTags,
          from: fromDate.toISOString(), to: toDate.toISOString(),
        }),
      });
      const j = await r.json();
      if (j.stats) setStats(j.stats);
    } catch {} finally { setLoadingStats(false); }
  }
  async function loadDistribution() {
    if (!distTag) return;
    setDist(null);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/distribution`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile?.timeCol, tag: distTag,
          from: fromDate.toISOString(), to: toDate.toISOString(),
          bins: 30,
        }),
      });
      setDist(await r.json());
    } catch {}
  }
  async function loadHeatmap() {
    if (!heatTag || !profile?.timeCol) return;
    setHeat(null);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/heatmap`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile.timeCol, tag: heatTag,
          from: fromDate.toISOString(), to: toDate.toISOString(),
        }),
      });
      setHeat(await r.json());
    } catch {}
  }
  async function loadCorrelation() {
    if (selectedTags.length < 2) { setCorr(null); return; }
    setLoadingCorr(true); setCorr(null);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/correlation`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile?.timeCol, tags: selectedTags,
          from: fromDate.toISOString(), to: toDate.toISOString(),
        }),
      });
      setCorr(await r.json());
    } catch {} finally { setLoadingCorr(false); }
  }
  async function loadAnomalies() {
    if (!anomTag || !profile?.timeCol) return;
    setLoadingAnom(true); setAnomalies([]);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/anomalies`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema: tbl?.schema, table: tbl?.name,
          timeCol: profile.timeCol, tag: anomTag,
          from: fromDate.toISOString(), to: toDate.toISOString(),
          sigma: anomSigma,
        }),
      });
      const j = await r.json();
      setAnomalies(j.anomalies || []);
    } catch {} finally { setLoadingAnom(false); }
  }

  useEffect(() => { loadDistribution(); }, [distTag, fromDate.getTime(), toDate.getTime()]);
  useEffect(() => { loadHeatmap(); }, [heatTag, fromDate.getTime(), toDate.getTime()]);
  useEffect(() => { loadCorrelation(); }, [selectedTags.join(","), fromDate.getTime(), toDate.getTime()]);
  useEffect(() => { loadAnomalies(); }, [anomTag, anomSigma, fromDate.getTime(), toDate.getTime()]);

  // ─── plant schema (auto-detected from tag names)
  const plantSchema = useMemo(() => {
    if (!profile) return null;
    return detectPlantSchema(profile.tags.map(t => t.name));
  }, [profile]);

  // when a new table is loaded, default to plant view if we recognized any skids
  useEffect(() => {
    if (plantSchema && plantSchema.skids.length > 0) {
      setViewMode("plant");
    } else if (plantSchema) {
      setViewMode("advanced");
    }
  }, [plantSchema?.skids.length, db, tbl?.name]);

  // ─── filter & group tags
  const groupedTags = useMemo(() => {
    if (!profile) return [];
    const search = tagSearch.toLowerCase();
    const groups = profile.groups || {};
    const result: { group: string; items: string[] }[] = [];
    for (const [g, items] of Object.entries(groups)) {
      const filtered = items.filter(n => n.toLowerCase().includes(search));
      if (filtered.length) result.push({ group: g, items: filtered });
    }
    result.sort((a, b) => a.group.localeCompare(b.group));
    return result;
  }, [profile, tagSearch]);

  function toggleTag(t: string) {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function selectGroup(items: string[]) {
    setSelectedTags(prev => Array.from(new Set([...prev, ...items])));
  }
  function deselectGroup(items: string[]) {
    setSelectedTags(prev => prev.filter(x => !items.includes(x)));
  }

  // ─── export
  function exportExcel() {
    if (!series.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(series), "Time Series");
    if (Object.keys(stats).length) {
      const statRows = Object.entries(stats).map(([tag, s]) => ({
        tag, unit: autoUnit(tag),
        count: s.count, nulls: s.nulls, zeros: s.zeros,
        min: s.min, p25: s.p25, p50: s.p50, p75: s.p75, p95: s.p95, p99: s.p99,
        max: s.max, avg: s.avg, std: s.std,
        first: s.first, last: s.last,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statRows), "Statistics");
    }
    if (anomalies.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anomalies), `Anomalies ${anomTag}`);
    }
    XLSX.writeFile(wb, `${db}_${tbl?.name}_analysis.xlsx`);
  }

  function exportPdf() {
    if (!profile || !tbl) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;
    let y = margin;

    const writeLine = (text: string, opts: { size?: number; bold?: boolean; color?: number[] } = {}) => {
      const { size = 10, bold = false, color = [30, 41, 59] } = opts;
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, pageW - 2 * margin);
      for (const ln of lines) {
        if (y > 800) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y);
        y += size + 4;
      }
    };

    writeLine("Water Treatment Analytics Report", { size: 18, bold: true, color: [49, 46, 129] });
    writeLine(`${db} · ${tbl.schema}.${tbl.name}`, { size: 11, color: [100, 116, 139] });
    writeLine(`Period: ${fmtTime(fromDate)} → ${fmtTime(toDate)} · Bucket: ${bucket} · Agg: ${agg}`, { size: 9, color: [100, 116, 139] });
    writeLine(`Generated: ${new Date().toLocaleString()}`, { size: 8, color: [100, 116, 139] });
    y += 8;

    writeLine("Dataset Overview", { size: 13, bold: true, color: [49, 46, 129] });
    writeLine(`Total rows in table: ${fmtInt(profile.totalRows)}`);
    if (profile.dateRange) writeLine(`Full date range: ${fmtTime(profile.dateRange.min)} → ${fmtTime(profile.dateRange.max)}`);
    if (profile.intervalSec != null) writeLine(`Avg sample interval: ~${profile.intervalSec}s`);
    writeLine(`Tags analyzed: ${selectedTags.length}`);
    y += 8;

    for (const tag of selectedTags) {
      const s = stats[tag];
      if (!s) continue;
      if (y > 700) { doc.addPage(); y = margin; }
      writeLine(`▸ ${tag}`, { size: 12, bold: true, color: [99, 102, 241] });
      const u = autoUnit(tag);
      writeLine(
        `count: ${fmtInt(s.count)}  ·  min: ${fmtNum(s.min)}${u}  ·  max: ${fmtNum(s.max)}${u}  ·  avg: ${fmtNum(s.avg)}${u}  ·  std: ${fmtNum(s.std)}${u}`,
        { size: 9 },
      );
      if (s.p50 != null) {
        writeLine(`p25: ${fmtNum(s.p25)}  ·  median: ${fmtNum(s.p50)}  ·  p75: ${fmtNum(s.p75)}  ·  p95: ${fmtNum(s.p95)}  ·  p99: ${fmtNum(s.p99)}`, { size: 9 });
      }
      writeLine(`first: ${fmtNum(s.first)}${u}  ·  latest: ${fmtNum(s.last)}${u}  ·  nulls: ${fmtInt(s.nulls)}  ·  zeros: ${fmtInt(s.zeros)}`, { size: 9 });
      const insights = generateInsights(tag, s);
      for (const ins of insights) writeLine(`• ${ins}`, { size: 9, color: [71, 85, 105] });
      y += 6;
    }

    if (anomalies.length) {
      if (y > 720) { doc.addPage(); y = margin; }
      writeLine(`Anomalies in ${anomTag} (|z| ≥ ${anomSigma})`, { size: 12, bold: true, color: [220, 38, 38] });
      anomalies.slice(0, 25).forEach(a => {
        writeLine(`${fmtTime(a.time)}  →  ${fmtNum(a.value)}  (z = ${fmtNum(a.zscore, 2)})`, { size: 8 });
      });
    }

    doc.save(`${db}_${tbl.name}_analytics_${Date.now()}.pdf`);
  }

  // ─── render ───
  const dbOptions: ComboOption[] = useMemo(
    () => databases.map(d => {
      const label = displayDb(d.name);
      return {
        value: d.name,
        label: label === d.name ? d.name : label,
        sub: label === d.name ? `${d.sizeMB} MB` : `${d.name} · ${d.sizeMB} MB`,
      };
    }),
    [databases, displayDb],
  );

  const tableOptions: ComboOption[] = useMemo(
    () => tables.map(t => ({
      value: `${t.schema}.${t.name}`,
      label: t.name,
      sub: `${t.schema} · ${fmtInt(t.rowCount)} rows · ${t.sizeMB} MB`,
    })),
    [tables],
  );

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
        {/* ── Top header ── */}
        <header className="bg-white border-b border-slate-200">
          <div className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 leading-tight">Water Plant Analytics</div>
                <div className="text-[11px] text-slate-500">SCADA time-series intelligence</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                disabled={!series.length}
                className="flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold disabled:opacity-40 border border-emerald-200"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={exportPdf}
                disabled={!profile || !selectedTags.length}
                className="flex items-center gap-1.5 px-3 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold disabled:opacity-40 border border-rose-200"
              >
                <FileDown className="w-3.5 h-3.5" /> PDF Report
              </button>
            </div>
          </div>

          {/* Breadcrumb / pickers row */}
          <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setTbl(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                !tbl
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> All Sites
            </button>

            <a
              href={`${BASE}/site-db/system`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Browse every database with its detected plant type"
            >
              <Layers className="w-3.5 h-3.5" /> System
            </a>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Database combobox */}
            <Combobox
              icon={<Database className="w-4 h-4 text-indigo-500" />}
              placeholder="Select plant database…"
              value={db}
              options={dbOptions}
              onChange={(v) => setDb(v)}
              widthClass="min-w-[240px]"
              emptyHint="No databases available"
            />

            {/* Rename label action */}
            {db && !editingDbLabel && (
              <button
                onClick={() => {
                  setEditingDbLabel(true);
                  const cur = displayDb(db);
                  setDbLabelInput(cur === db ? "" : cur);
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
                title="Rename / give friendly label"
              >
                <Pencil className="w-3 h-3" />
                Rename
              </button>
            )}
            {editingDbLabel && db && (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={dbLabelInput}
                  onChange={e => setDbLabelInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { setDbLabelFn(db, dbLabelInput); setEditingDbLabel(false); }
                    if (e.key === "Escape") setEditingDbLabel(false);
                  }}
                  placeholder={`Friendly name for "${db}"`}
                  className="px-2 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500 w-56"
                />
                <button
                  onClick={() => { setDbLabelFn(db, dbLabelInput); setEditingDbLabel(false); }}
                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingDbLabel(false)}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Table combobox (only when db chosen) */}
            {db && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <Combobox
                  icon={<Table2 className="w-4 h-4 text-violet-500" />}
                  placeholder={tables.length ? "Choose a table…" : "Loading tables…"}
                  value={tbl ? `${tbl.schema}.${tbl.name}` : ""}
                  options={tableOptions}
                  onChange={(v) => {
                    const found = tables.find(t => `${t.schema}.${t.name}` === v);
                    if (found) setTbl({ schema: found.schema, name: found.name });
                  }}
                  widthClass="min-w-[240px]"
                  emptyHint={tables.length ? "No tables match" : "No tables in this database"}
                  disabled={!tables.length}
                />
              </>
            )}

            {profile && tbl && (
              <span className="ml-auto text-[11px] text-slate-500 flex items-center gap-1">
                {fmtInt(profile.totalRows)} rows · {profile.tags.length} tags · time col:{" "}
                <code className="text-indigo-600">{profile.timeCol || "—"}</code>
              </span>
            )}
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Body */}
          <div className="flex-1 overflow-auto" ref={reportRef}>
            {!tbl ? (
              <SitesOverview
                displayDb={displayDb}
                onSelect={(selDb, selSchema, selTable) => {
                  setDb(selDb);
                  setTbl({ schema: selSchema, name: selTable });
                }}
              />
            ) : loadingProfile ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Profiling table…
              </div>
            ) : err ? (
              <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <code className="break-all">{err}</code>
              </div>
            ) : profile && !profile.timeCol ? (
              <EmptyState
                icon={<AlertTriangle className="w-12 h-12 text-amber-400" />}
                title="No time column detected"
                hint="This table has no datetime column, so time-series analysis isn't possible. Use the standard DB Viewer instead to inspect rows."
              />
            ) : profile ? (
              <>
                {/* ── View tabs (only show plant tab if recognized) ── */}
                {plantSchema && (
                  <div className="px-5 pt-4 flex items-center gap-1 border-b border-slate-200 bg-white">
                    {plantSchema.skids.length > 0 && (
                      <button
                        onClick={() => setViewMode("plant")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition flex items-center gap-1.5 ${
                          viewMode === "plant"
                            ? "border-indigo-600 text-indigo-700"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Observation Report
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          viewMode === "plant" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {plantSchema.typeLabel}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => setViewMode("advanced")}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition flex items-center gap-1.5 ${
                        viewMode === "advanced"
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Advanced Analytics
                    </button>
                  </div>
                )}

                {viewMode === "plant" && plantSchema && plantSchema.skids.length > 0 ? (
                  <PlantDashboard
                    base={BASE}
                    db={db}
                    dbLabel={displayDb(db)}
                    schema={tbl!.schema}
                    table={tbl!.name}
                    timeCol={profile.timeCol!}
                    plant={plantSchema}
                    fromDate={fromDate}
                    toDate={toDate}
                    bucket={bucket}
                    agg={agg}
                  />
                ) : (
              <div className="p-5 space-y-5">
                {/* ── Time + bucket controls ── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase text-slate-500">Time Range</span>
                    {PRESETS.map((p, i) => (
                      <button
                        key={p.label}
                        onClick={() => { setPresetIdx(i); setFrom(""); setTo(""); }}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          presetIdx === i && !from && !to
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <label className="flex items-center gap-1 text-slate-600">
                      From:
                      <input
                        type="datetime-local"
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-slate-600">
                      To:
                      <input
                        type="datetime-local"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
                      />
                    </label>
                    <span className="text-slate-400">|</span>
                    <label className="flex items-center gap-1 text-slate-600">
                      Bucket:
                      <select value={bucket} onChange={e => setBucket(e.target.value)} className="border border-slate-200 rounded-md px-1.5 py-1">
                        {BUCKETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-slate-600">
                      Aggregate:
                      <select value={agg} onChange={e => setAgg(e.target.value as any)} className="border border-slate-200 rounded-md px-1.5 py-1">
                        <option value="avg">avg</option>
                        <option value="min">min</option>
                        <option value="max">max</option>
                        <option value="sum">sum</option>
                      </select>
                    </label>
                    <span className="ml-auto text-[10px] text-slate-500">
                      Range: {fmtTime(fromDate)} → {fmtTime(toDate)}
                    </span>
                  </div>
                </div>

                {/* ── Tag picker + selection summary ── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-violet-500" />
                      <span className="text-xs font-bold uppercase text-slate-500">Process Tags</span>
                      <span className="text-xs text-slate-500">({selectedTags.length} selected of {profile.tags.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={tagSearch}
                          onChange={e => setTagSearch(e.target.value)}
                          placeholder="Search tags…"
                          className="pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <button
                        onClick={() => setSelectedTags([])}
                        className="text-[10px] text-slate-500 hover:text-slate-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Selected chips */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-slate-100">
                      {selectedTags.map((t, i) => {
                        const Icon = tagIcon(t);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleTag(t)}
                            className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md text-[11px] font-medium border"
                            style={{ borderColor: COLORS[i % COLORS.length] + "40", color: COLORS[i % COLORS.length], background: COLORS[i % COLORS.length] + "10" }}
                          >
                            <Icon className="w-3 h-3" />
                            {t}
                            <X className="w-3 h-3 opacity-60" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Grouped tag list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                    {groupedTags.map(({ group, items }) => {
                      const allSel = items.every(i => selectedTags.includes(i));
                      const collapsed = collapsedGroups[group];
                      return (
                        <div key={group} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-100">
                            <button
                              onClick={() => setCollapsedGroups(p => ({ ...p, [group]: !collapsed }))}
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-700"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                              {group} ({items.length})
                            </button>
                            <button
                              onClick={() => allSel ? deselectGroup(items) : selectGroup(items)}
                              className="text-[10px] text-indigo-600 hover:underline"
                            >
                              {allSel ? "Clear" : "All"}
                            </button>
                          </div>
                          {!collapsed && (
                            <div className="p-1 space-y-0.5">
                              {items.map(t => {
                                const sel = selectedTags.includes(t);
                                const Icon = tagIcon(t);
                                return (
                                  <button
                                    key={t}
                                    onClick={() => toggleTag(t)}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left transition-colors ${
                                      sel ? "bg-violet-100 text-violet-700 font-medium" : "hover:bg-white text-slate-600"
                                    }`}
                                  >
                                    <Icon className="w-3 h-3 shrink-0" />
                                    <span className="truncate flex-1">{t}</span>
                                    {sel && <Check className="w-3 h-3" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── KPI summary cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard icon={<Activity className="w-5 h-5" />} label="Tags Selected" value={String(selectedTags.length)} color="indigo" />
                  <KpiCard icon={<Clock className="w-5 h-5" />} label="Date Range" value={`${Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)} days`} color="violet" />
                  <KpiCard icon={<Layers className="w-5 h-5" />} label="Sample Interval" value={profile.intervalSec ? `~${profile.intervalSec}s` : "—"} color="emerald" />
                  <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Buckets" value={String(series.length)} color="amber" />
                </div>

                {/* ── Time-series chart ── */}
                <ChartCard title="Time-Series Trend" subtitle={`${agg.toUpperCase()} per ${bucket}`} loading={loadingSeries}>
                  {series.length ? (
                    <ResponsiveContainer width="100%" height={360}>
                      <LineChart data={series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="bucket"
                          tick={{ fontSize: 10 }}
                          tickFormatter={t => {
                            const d = new Date(t);
                            return bucket === "1d" ? d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                              : d.toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RTooltip
                          labelFormatter={t => fmtTime(t)}
                          formatter={(v: any) => fmtNum(v)}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {selectedTags.map((t, i) => (
                          <Line
                            key={t}
                            type="monotone"
                            dataKey={t}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={1.6}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart text="Select tags to plot trends" />
                  )}
                </ChartCard>

                {/* ── Statistics table ── */}
                <ChartCard title="Statistical Summary" subtitle="Per-tag descriptive stats with percentiles" loading={loadingStats}>
                  {selectedTags.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold">Tag</th>
                            <th className="px-2 py-1.5 text-right font-semibold">N</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Min</th>
                            <th className="px-2 py-1.5 text-right font-semibold">P25</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Median</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Avg</th>
                            <th className="px-2 py-1.5 text-right font-semibold">P75</th>
                            <th className="px-2 py-1.5 text-right font-semibold">P95</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Max</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Std</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Latest</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Nulls</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Zeros</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTags.map((t, i) => {
                            const s = stats[t];
                            const Icon = tagIcon(t);
                            return (
                              <tr key={t} className="border-t border-slate-100 hover:bg-indigo-50/30">
                                <td className="px-2 py-1.5 font-medium text-slate-800">
                                  <span className="flex items-center gap-1">
                                    <Icon className="w-3 h-3" style={{ color: COLORS[i % COLORS.length] }} />
                                    {t}
                                    <span className="text-[10px] text-slate-400">{autoUnit(t)}</span>
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right text-slate-600">{s ? fmtInt(s.count) : "…"}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s ? fmtNum(s.min) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s?.p25 != null ? fmtNum(s.p25) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s?.p50 != null ? fmtNum(s.p50) : ""}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-indigo-700">{s ? fmtNum(s.avg) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s?.p75 != null ? fmtNum(s.p75) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s?.p95 != null ? fmtNum(s.p95) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s ? fmtNum(s.max) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700">{s ? fmtNum(s.std) : ""}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-violet-700">{s ? fmtNum(s.last) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-amber-600">{s ? fmtInt(s.nulls) : ""}</td>
                                <td className="px-2 py-1.5 text-right text-rose-600">{s ? fmtInt(s.zeros) : ""}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : <EmptyChart text="Select tags to compute statistics" />}
                </ChartCard>

                {/* ── Auto-narrative insights ── */}
                {selectedTags.length > 0 && Object.keys(stats).length > 0 && (
                  <ChartCard title="AI Insights" subtitle="Auto-generated observations per tag">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {selectedTags.map((t, i) => {
                        const s = stats[t];
                        const insights = s ? generateInsights(t, s) : [];
                        const Icon = tagIcon(t);
                        return (
                          <div
                            key={t}
                            className="rounded-lg p-3 border"
                            style={{ borderColor: COLORS[i % COLORS.length] + "40", background: COLORS[i % COLORS.length] + "08" }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4" style={{ color: COLORS[i % COLORS.length] }} />
                              <span className="font-bold text-sm text-slate-800">{t}</span>
                              <span className="text-[10px] text-slate-400">{autoUnit(t)}</span>
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-700">
                              {insights.map((ins, j) => (
                                <li key={j} className="leading-snug">{ins}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>
                )}

                {/* ── Distribution histogram ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Distribution" subtitle="Histogram of values">
                    <div className="mb-2">
                      <select
                        value={distTag}
                        onChange={e => setDistTag(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1"
                      >
                        {selectedTags.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {dist?.bins?.length ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={dist.bins}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip formatter={(v: any) => fmtInt(v)} contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart text="No distribution data" />}
                  </ChartCard>

                  <ChartCard title="Hour-of-Day Heatmap" subtitle="Avg value by weekday × hour">
                    <div className="mb-2">
                      <select
                        value={heatTag}
                        onChange={e => setHeatTag(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1"
                      >
                        {selectedTags.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <Heatmap heat={heat} />
                  </ChartCard>
                </div>

                {/* ── Correlation matrix ── */}
                {selectedTags.length >= 2 && (
                  <ChartCard title="Correlation Matrix" subtitle="Pearson correlation across selected tags (sampled)" loading={loadingCorr}>
                    {corr?.matrix ? <CorrMatrix corr={corr} /> : <EmptyChart text="Select 2+ tags" />}
                  </ChartCard>
                )}

                {/* ── Anomalies ── */}
                <ChartCard
                  title="Anomaly Detection"
                  subtitle={`Points exceeding ${anomSigma}σ from the mean`}
                  loading={loadingAnom}
                >
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      Tag:
                      <select value={anomTag} onChange={e => setAnomTag(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1">
                        {selectedTags.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      Sigma:
                      <input
                        type="number"
                        value={anomSigma}
                        min={1}
                        max={6}
                        step={0.5}
                        onChange={e => setAnomSigma(Number(e.target.value))}
                        className="w-16 border border-slate-200 rounded-md px-2 py-1"
                      />
                    </label>
                    <span className="text-xs text-slate-500">{anomalies.length} anomalies found</span>
                  </div>
                  {anomalies.length ? (
                    <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-md">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-semibold">Time</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Value</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Mean</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Std</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Z-score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anomalies.map((a, i) => (
                            <tr key={i} className="border-t border-slate-100 hover:bg-rose-50/40">
                              <td className="px-3 py-1 text-slate-700">{fmtTime(a.time)}</td>
                              <td className="px-3 py-1 text-right font-semibold text-rose-700">{fmtNum(a.value)}</td>
                              <td className="px-3 py-1 text-right text-slate-600">{fmtNum(a.mean)}</td>
                              <td className="px-3 py-1 text-right text-slate-600">{fmtNum(a.std)}</td>
                              <td className="px-3 py-1 text-right font-semibold text-amber-700">{fmtNum(a.zscore, 2)}σ</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <EmptyChart text={`No points beyond ${anomSigma}σ`} />}
                </ChartCard>
              </div>
                )}
              </>
            ) : null}
          </div>
        </main>
      </div>
    </Layout>
  );
}

// ─── helper components ───
type ComboOption = { value: string; label: string; sub?: string };

function Combobox({
  value, options, onChange, placeholder, icon, widthClass = "min-w-[220px]",
  emptyHint = "No options", disabled = false,
}: {
  value: string;
  options: ComboOption[];
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  widthClass?: string;
  emptyHint?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <div ref={wrapRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : open
              ? "bg-white border-indigo-400 ring-2 ring-indigo-100 text-slate-800"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm"
        }`}
      >
        {icon}
        <span className={`flex-1 text-left truncate ${selected ? "" : "text-slate-400 font-normal"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">{emptyHint}</div>
            ) : filtered.map(o => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-indigo-50 transition ${
                    isSel ? "bg-indigo-50" : ""
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-indigo-600" : "text-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate font-semibold ${isSel ? "text-indigo-700" : "text-slate-800"}`}>
                      {o.label}
                    </div>
                    {o.sub && (
                      <div className="truncate text-[10px] text-slate-500">{o.sub}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      {icon}
      <h3 className="mt-4 text-lg font-bold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{hint}</p>
    </div>
  );
}

// ─── All Sites Live Health Dashboard ────────────────────────────
type OverviewKpi = { tag: string; label: string; unit: string; value: number | null; status: "ok" | "warn" | "critical" };
type OverviewTable = {
  schema: string; table: string; rowCount: number; timeCol: string | null;
  lastUpdate: string | null; ageMin: number | null;
  status: "ok" | "warn" | "critical"; alerts: string[]; kpis: OverviewKpi[];
};
type OverviewPlant = { db: string; status: "ok" | "warn" | "critical"; tables: OverviewTable[]; error?: string };
type OverviewData = {
  generatedAt: string;
  totals: { ok: number; warn: number; critical: number };
  plants: OverviewPlant[];
  cached?: boolean;
  ageSec?: number;
};

function fmtAge(min: number | null): string {
  if (min == null) return "no data";
  if (min < 1) return "live now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  const d = Math.round(min / 1440);
  return `${d}d ago`;
}

function fmtKpi(v: number | null): string {
  if (v == null || isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function statusClasses(s: "ok" | "warn" | "critical") {
  if (s === "critical") return { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700 border-rose-200", ring: "ring-rose-300" };
  if (s === "warn")     return { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200", ring: "ring-amber-300" };
  return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", ring: "ring-emerald-200" };
}

function SitesOverview({
  onSelect, displayDb,
}: {
  onSelect: (db: string, schema: string, table: string) => void;
  displayDb: (n: string) => string;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "ok">("all");
  const [search, setSearch] = useState("");

  const load = async (force = false) => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${BASE}/api/site-db/analytics/overview${force ? "?refresh=1" : ""}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
    } catch (e: any) {
      setErr(e.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(false); }, []);

  const filteredPlants = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.plants.filter(p => {
      if (filter !== "all" && p.status !== filter) return false;
      if (q) {
        const label = displayDb(p.db).toLowerCase();
        if (!label.includes(q) && !p.db.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, filter, search, displayDb]);

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-10">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <div className="mt-3 text-sm font-medium">Scanning all plants for live readings…</div>
        <div className="mt-1 text-xs text-slate-400">First load can take ~1 min while we ping every site. Subsequent loads are instant (cached 3 min).</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Overview failed</div>
          <code className="break-all">{err}</code>
          <button onClick={() => load(true)} className="mt-2 px-3 py-1 rounded bg-white border border-rose-300 text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const t = data.totals;

  return (
    <div className="p-5 space-y-4">
      {/* ── Top hero strip ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl text-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs uppercase tracking-wider font-semibold">
              <Activity className="w-3.5 h-3.5" /> Live Plant Health
            </div>
            <h1 className="text-2xl font-bold mt-1">All Sites Dashboard</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Live status across {data.plants.length} plants — KPIs from the most recent SCADA reading per process table.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-indigo-200">
              {data.cached
                ? `cached · ${data.ageSec ?? 0}s ago`
                : `updated ${new Date(data.generatedAt).toLocaleTimeString()}`}
            </span>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* totals tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur">
            <div className="text-[10px] uppercase text-indigo-100 font-bold">Plants</div>
            <div className="text-2xl font-extrabold mt-0.5">{data.plants.length}</div>
          </div>
          <div className="bg-emerald-500/30 border border-emerald-300/40 rounded-xl p-3 backdrop-blur">
            <div className="text-[10px] uppercase text-emerald-50 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Healthy</div>
            <div className="text-2xl font-extrabold mt-0.5">{t.ok}</div>
          </div>
          <div className="bg-amber-500/30 border border-amber-300/40 rounded-xl p-3 backdrop-blur">
            <div className="text-[10px] uppercase text-amber-50 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Warnings</div>
            <div className="text-2xl font-extrabold mt-0.5">{t.warn}</div>
          </div>
          <div className="bg-rose-500/30 border border-rose-300/40 rounded-xl p-3 backdrop-blur">
            <div className="text-[10px] uppercase text-rose-50 font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Critical</div>
            <div className="text-2xl font-extrabold mt-0.5">{t.critical}</div>
          </div>
        </div>
      </div>

      {/* ── Filter / search bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(["all", "critical", "warn", "ok"] as const).map(f => {
            const active = filter === f;
            const lbl = f === "all" ? "All" : f === "critical" ? "Critical" : f === "warn" ? "Warnings" : "Healthy";
            const count = f === "all" ? data.plants.length : data.plants.filter(p => p.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  active
                    ? f === "critical" ? "bg-rose-600 text-white border-rose-600"
                    : f === "warn"     ? "bg-amber-500 text-white border-amber-500"
                    : f === "ok"       ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {lbl} <span className={active ? "opacity-80" : "text-slate-400"}>({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plant…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* ── Plant cards grid ── */}
      {filteredPlants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
          No plants match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredPlants.map(p => <PlantCard key={p.db} plant={p} displayDb={displayDb} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

function PlantCard({
  plant, displayDb, onSelect,
}: {
  plant: OverviewPlant;
  displayDb: (n: string) => string;
  onSelect: (db: string, schema: string, table: string) => void;
}) {
  const sc = statusClasses(plant.status);
  const label = displayDb(plant.db);
  const hasLabel = label !== plant.db;
  const totalAlerts = plant.tables.reduce((s, t) => s + t.alerts.length, 0);

  return (
    <div className={`bg-white rounded-xl border-2 ${sc.border} overflow-hidden flex flex-col`}>
      {/* header */}
      <div className={`px-4 py-3 ${sc.bg} border-b ${sc.border} flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${plant.status === "critical" ? "animate-pulse" : ""}`} />
            <h3 className="font-bold text-slate-800 truncate">{label}</h3>
            {hasLabel && <span className="text-[10px] text-slate-400 font-mono">({plant.db})</span>}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {plant.tables.length} process table{plant.tables.length === 1 ? "" : "s"}
            {totalAlerts > 0 && <> · <span className={sc.text + " font-semibold"}>{totalAlerts} alert{totalAlerts === 1 ? "" : "s"}</span></>}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sc.chip}`}>
          {plant.status}
        </span>
      </div>

      {/* body */}
      <div className="divide-y divide-slate-100">
        {plant.tables.length === 0 ? (
          <div className="p-4 text-xs text-slate-500 italic">
            {plant.error
              ? <>Connection error: <code className="text-rose-600">{plant.error}</code></>
              : "No time-series tables detected for this plant."}
          </div>
        ) : (
          plant.tables.map(tab => {
            const tsc = statusClasses(tab.status);
            return (
              <div key={tab.schema + "." + tab.table} className="p-3 hover:bg-slate-50 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tsc.dot}`} />
                      <span className="text-sm font-semibold text-slate-800 truncate font-mono">{tab.table}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                      {tab.ageMin == null || tab.ageMin > 360
                        ? <WifiOff className="w-3 h-3 text-rose-500" />
                        : <Wifi className="w-3 h-3 text-emerald-500" />}
                      <span className={tab.status === "critical" ? "text-rose-600 font-semibold" : tab.status === "warn" ? "text-amber-600 font-semibold" : ""}>
                        {fmtAge(tab.ageMin)}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{tab.rowCount.toLocaleString()} rows</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelect(plant.db, tab.schema, tab.table)}
                    className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0"
                  >
                    Analyze <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* KPI chips */}
                {tab.kpis.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tab.kpis.map((k, i) => {
                      const kc = statusClasses(k.status);
                      return (
                        <span
                          key={i}
                          title={`${k.tag}${k.unit ? " (" + k.unit + ")" : ""}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${kc.chip}`}
                        >
                          <span className="opacity-70">{k.label}</span>
                          <span className="font-bold">{fmtKpi(k.value)}{k.unit && <span className="opacity-60 ml-0.5">{k.unit}</span>}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Alerts */}
                {tab.alerts.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {tab.alerts.slice(0, 3).map((a, i) => (
                      <li key={i} className={`text-[10px] flex items-start gap-1 ${tab.status === "critical" ? "text-rose-700" : "text-amber-700"}`}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                    {tab.alerts.length > 3 && (
                      <li className="text-[10px] text-slate-400 italic">+{tab.alerts.length - 3} more…</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* footer "open plant" */}
      {plant.tables.length > 0 && (
        <button
          onClick={() => {
            const first = plant.tables[0];
            onSelect(plant.db, first.schema, first.table);
          }}
          className={`w-full px-4 py-2 text-xs font-semibold ${sc.text} ${sc.bg} hover:brightness-95 border-t ${sc.border} flex items-center justify-center gap-1`}
        >
          Open plant details <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-40 flex items-center justify-center text-slate-400 text-xs">{text}</div>;
}
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
        <div className="text-lg font-bold text-slate-800 truncate">{value}</div>
      </div>
    </div>
  );
}
function ChartCard({ title, subtitle, loading, children }: { title: string; subtitle?: string; loading?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
      </div>
      {children}
    </div>
  );
}

function Heatmap({ heat }: { heat: any }) {
  if (!heat?.cells?.length) return <EmptyChart text="No heatmap data" />;
  const cells: { dow: number; hr: number; avg: number; cnt: number }[] = heat.cells;
  const grid: (typeof cells[0] | null)[][] = Array.from({ length: 7 }, () => Array(24).fill(null));
  let mn = Infinity, mx = -Infinity;
  for (const c of cells) {
    if (c.dow >= 1 && c.dow <= 7) grid[c.dow - 1][c.hr] = c;
    const v = Number(c.avg);
    if (isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; }
  }
  const range = mx - mn || 1;
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-x-auto">
      <table className="text-[9px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-10"></th>
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="w-7 py-1 text-slate-500 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dows.map((d, i) => (
            <tr key={d}>
              <td className="text-slate-600 font-semibold pr-2">{d}</td>
              {Array.from({ length: 24 }, (_, h) => {
                const c = grid[i][h];
                if (!c) return <td key={h} className="w-7 h-7 border border-slate-100 bg-slate-50"></td>;
                const ratio = (Number(c.avg) - mn) / range;
                const r = Math.round(99 + ratio * (236 - 99));
                const g = Math.round(102 + ratio * (72 - 102));
                const b = Math.round(241 + ratio * (153 - 241));
                return (
                  <td
                    key={h}
                    title={`${d} ${h}:00 → avg ${fmtNum(c.avg)} (n=${c.cnt})`}
                    className="w-7 h-7 border border-white text-center"
                    style={{ background: `rgb(${r},${g},${b})`, color: ratio > 0.5 ? "white" : "#1e293b" }}
                  >
                    <span className="text-[8px]">{fmtNum(c.avg, 0)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
        <span>{fmtNum(mn)}</span>
        <div className="h-2 w-32 rounded" style={{ background: "linear-gradient(to right, #6366f1, #ec4899)" }}></div>
        <span>{fmtNum(mx)}</span>
      </div>
    </div>
  );
}

function CorrMatrix({ corr }: { corr: any }) {
  const tags: string[] = corr.tags;
  const matrix: number[][] = corr.matrix;
  function color(v: number) {
    const intensity = Math.abs(v);
    if (v >= 0) {
      const r = Math.round(255 - intensity * 156);
      const g = Math.round(255 - intensity * 153);
      const b = Math.round(255 - intensity * 14);
      return `rgb(${r},${g},${b})`;
    } else {
      const r = Math.round(255 - intensity * 14);
      const g = Math.round(255 - intensity * 153);
      const b = Math.round(255 - intensity * 156);
      return `rgb(${r},${g},${b})`;
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="text-[9px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th></th>
            {tags.map(t => (
              <th key={t} className="px-1 py-1 text-slate-500 font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}>
                {t.length > 14 ? t.slice(0, 14) + "…" : t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tags.map((t, i) => (
            <tr key={t}>
              <td className="text-slate-600 font-semibold pr-2 text-right">{t.length > 18 ? t.slice(0, 18) + "…" : t}</td>
              {matrix[i].map((v, j) => (
                <td
                  key={j}
                  title={`${tags[i]} × ${tags[j]} = ${v.toFixed(3)}`}
                  className="w-12 h-7 border border-white text-center text-slate-800 font-mono"
                  style={{ background: color(v) }}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
        <span>−1</span>
        <div className="h-2 w-32 rounded" style={{ background: "linear-gradient(to right, #f1629c, #fff, #f1aa62)" }}></div>
        <span>+1</span>
        <span className="ml-3">{corr.samples} samples</span>
      </div>
    </div>
  );
}
