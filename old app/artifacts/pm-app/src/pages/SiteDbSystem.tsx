import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useDbLabels } from "@/lib/dbLabels";
import {
  Database, RefreshCw, Loader2, AlertTriangle, Search,
  ChevronDown, ChevronRight, BarChart3, Table2, Clock,
  Activity, Layers, Filter, ArrowRight, Wifi, WifiOff,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types match the /system-overview endpoint ────────────────────────
type Classification = {
  type: string;
  label: string;
  unitLabel: string;
  unitCount: number;
  hasFeed: boolean;
  hasOverallRecovery: boolean;
  hasRunHours: boolean;
  hasBackwash: boolean;
  signals: string[];
  badgeColor: string;
};

type SysTable = {
  schema: string;
  table: string;
  rowCount: number;
  columnCount: number;
  numericCount: number;
  timeCol: string | null;
  lastUpdate: string | null;
  ageMin: number | null;
  classification: Classification;
};

type SysPlant = {
  db: string;
  tableCount: number;
  totalRows: number;
  primaryType: string;
  primaryLabel: string;
  primaryBadgeColor: string;
  tables: SysTable[];
  error?: string;
};

type SysOverview = {
  generatedAt: string;
  cached?: boolean;
  ageSec?: number;
  totals: {
    databases: number;
    tables: number;
    rows: number;
    byType: { type: string; label: string; badgeColor: string; dbs: number; tables: number }[];
  };
  plants: SysPlant[];
};

// ─── Tailwind-friendly color map (full classes so JIT keeps them) ─────
const BADGE: Record<string, { bg: string; text: string; border: string; dot: string; ring: string }> = {
  violet:   { bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-200",   dot: "bg-violet-500",   ring: "ring-violet-100" },
  sky:      { bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-200",      dot: "bg-sky-500",      ring: "ring-sky-100" },
  rose:     { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200",     dot: "bg-rose-500",     ring: "ring-rose-100" },
  cyan:     { bg: "bg-cyan-50",     text: "text-cyan-700",     border: "border-cyan-200",     dot: "bg-cyan-500",     ring: "ring-cyan-100" },
  emerald:  { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200",  dot: "bg-emerald-500",  ring: "ring-emerald-100" },
  amber:    { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    dot: "bg-amber-500",    ring: "ring-amber-100" },
  indigo:   { bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200",   dot: "bg-indigo-500",   ring: "ring-indigo-100" },
  lime:     { bg: "bg-lime-50",     text: "text-lime-700",     border: "border-lime-200",     dot: "bg-lime-500",     ring: "ring-lime-100" },
  orange:   { bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200",   dot: "bg-orange-500",   ring: "ring-orange-100" },
  red:      { bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",      dot: "bg-red-500",      ring: "ring-red-100" },
  teal:     { bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200",     dot: "bg-teal-500",     ring: "ring-teal-100" },
  fuchsia:  { bg: "bg-fuchsia-50",  text: "text-fuchsia-700",  border: "border-fuchsia-200", dot: "bg-fuchsia-500",  ring: "ring-fuchsia-100" },
  slate:    { bg: "bg-slate-50",    text: "text-slate-700",    border: "border-slate-200",    dot: "bg-slate-400",    ring: "ring-slate-100" },
};
const c = (k: string) => BADGE[k] || BADGE.slate;

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtAge(min: number | null): { text: string; tone: "ok" | "warn" | "crit" | "unknown" } {
  if (min == null) return { text: "no reading", tone: "unknown" };
  if (min < 1) return { text: "live now", tone: "ok" };
  if (min < 60) return { text: `${min} min ago`, tone: "ok" };
  const h = min / 60;
  if (h < 6) return { text: `${h.toFixed(1)} h ago`, tone: "warn" };
  if (h < 48) return { text: `${h.toFixed(0)} h ago`, tone: "crit" };
  const d = h / 24;
  return { text: `${d.toFixed(0)} d ago`, tone: "crit" };
}

const AGE_TONE: Record<string, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  crit: "text-rose-600",
  unknown: "text-slate-400",
};

export default function SiteDbSystem() {
  const [data, setData] = useState<SysOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
  const { display: displayDb } = useDbLabels();

  async function load(force = false) {
    try {
      if (force) setRefreshing(true); else setLoading(true);
      setError(null);
      const r = await fetch(`/api/site-db/analytics/system-overview${force ? "?refresh=1" : ""}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      // Auto-expand the first 3 plants on first load so the page isn't empty
      if (!data && j.plants?.length) {
        setExpandedDbs(new Set(j.plants.slice(0, 3).map((p: SysPlant) => p.db)));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(false); /* eslint-disable-next-line */ }, []);

  const filteredPlants = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.plants
      .filter(p => !typeFilter || p.primaryType === typeFilter)
      .filter(p => {
        if (!q) return true;
        const label = displayDb(p.db).toLowerCase();
        if (label.includes(q) || p.db.toLowerCase().includes(q)) return true;
        return p.tables.some(t => t.table.toLowerCase().includes(q));
      });
  }, [data, search, typeFilter, displayDb]);

  function toggleDb(db: string) {
    setExpandedDbs(prev => {
      const next = new Set(prev);
      if (next.has(db)) next.delete(db); else next.add(db);
      return next;
    });
  }

  function openDashboard(plant: SysPlant, t: SysTable) {
    sessionStorage.setItem("siteDbAnalyze:db", plant.db);
    sessionStorage.setItem("siteDbAnalyze:schema", t.schema);
    sessionStorage.setItem("siteDbAnalyze:table", t.table);
    window.location.href = `${BASE}/site-db/analyze`;
  }

  return (
    <Layout title="System Overview" description="Every database, every plant table, classified by type">
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" /> System Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Auto-classified plant inventory across every database. Click any table to open its full operations dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`${BASE}/site-db/analyze`}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" /> All-Sites Health
            </Link>
            <Link
              href={`${BASE}/site-db`}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Table2 className="w-4 h-4" /> SQL Viewer
            </Link>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Errors / loading ─────────────────────────────────────── */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load system overview</div>
              <div className="text-xs text-rose-700">{error}</div>
            </div>
          </div>
        )}
        {loading && !data && (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <div className="text-sm">Scanning every database — this can take ~60s on first load…</div>
          </div>
        )}

        {data && (
          <>
            {/* ── Hero / totals strip ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Stat icon={<Database className="w-4 h-4" />} label="Databases" value={data.totals.databases} />
              <Stat icon={<Table2 className="w-4 h-4" />} label="Plant Tables" value={data.totals.tables} />
              <Stat icon={<Activity className="w-4 h-4" />} label="Total Rows" value={fmtNum(data.totals.rows)} />
              <Stat
                icon={<Clock className="w-4 h-4" />}
                label={data.cached ? `Cached ${data.ageSec ?? 0}s ago` : "Just now"}
                value={new Date(data.generatedAt).toLocaleTimeString()}
              />
            </div>

            {/* ── Plant-type chips (filter) ───────────────────────── */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1 inline-flex items-center gap-1">
                <Filter className="w-3 h-3" /> Plant types:
              </span>
              <button
                onClick={() => setTypeFilter("")}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition ${
                  !typeFilter ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >All ({data.totals.databases})</button>
              {data.totals.byType.map(b => {
                const cs = c(b.badgeColor);
                const active = typeFilter === b.type;
                return (
                  <button
                    key={b.type}
                    onClick={() => setTypeFilter(active ? "" : b.type)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition inline-flex items-center gap-1.5 ${
                      active
                        ? `${cs.bg} ${cs.text} ${cs.border} ring-2 ${cs.ring}`
                        : `bg-white ${cs.text} ${cs.border} hover:${cs.bg}`
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                    {b.label} <span className="opacity-70">({b.dbs})</span>
                  </button>
                );
              })}
            </div>

            {/* ── Search ──────────────────────────────────────────── */}
            <div className="mb-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by database, label or table name…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* ── Plant cards ─────────────────────────────────────── */}
            {filteredPlants.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                No databases match these filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlants.map(p => {
                  const cs = c(p.primaryBadgeColor);
                  const expanded = expandedDbs.has(p.db);
                  const label = displayDb(p.db);
                  const hasLabel = label !== p.db;
                  return (
                    <div key={p.db} className={`rounded-xl border ${cs.border} bg-white overflow-hidden`}>
                      {/* Header row */}
                      <button
                        onClick={() => toggleDb(p.db)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${cs.bg} hover:brightness-95 transition`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${cs.dot}`} />
                          {expanded
                            ? <ChevronDown className="w-4 h-4 text-slate-500" />
                            : <ChevronRight className="w-4 h-4 text-slate-500" />}
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 truncate">
                              {label}
                              {hasLabel && (
                                <span className="ml-2 text-[10px] font-normal text-slate-500">({p.db})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded ${cs.bg} ${cs.text} font-semibold`}>
                                {p.primaryLabel}
                              </span>
                              <span>{p.tableCount} table{p.tableCount === 1 ? "" : "s"}</span>
                              <span>·</span>
                              <span>{fmtNum(p.totalRows)} rows</span>
                              {p.error && (
                                <>
                                  <span>·</span>
                                  <span className="text-rose-600 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> error
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded table list */}
                      {expanded && (
                        <div className="border-t border-slate-100">
                          {p.error && (
                            <div className="px-4 py-3 text-xs text-rose-700 bg-rose-50">
                              {p.error}
                            </div>
                          )}
                          {p.tables.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-slate-400">
                              No time-series tables detected (need a date column + numeric tags + ≥100 rows).
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {p.tables.map(t => {
                                const tcs = c(t.classification.badgeColor);
                                const age = fmtAge(t.ageMin);
                                return (
                                  <div key={t.schema + "." + t.table}
                                       className="px-4 py-3 grid grid-cols-12 gap-3 items-center hover:bg-slate-50 transition">
                                    {/* Type badge */}
                                    <div className="col-span-12 md:col-span-3 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tcs.bg} ${tcs.text} ${tcs.border}`}>
                                          {t.classification.label}
                                        </span>
                                        {t.classification.unitCount > 0 && (
                                          <span className="text-[10px] font-semibold text-slate-500 inline-flex items-center gap-1">
                                            <Layers className="w-3 h-3" />
                                            {t.classification.unitCount} {t.classification.unitLabel.toLowerCase()}{t.classification.unitCount === 1 ? "" : "s"}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Table name */}
                                    <div className="col-span-12 md:col-span-3 min-w-0">
                                      <div className="font-mono text-xs font-bold text-slate-800 truncate">
                                        {t.table}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {t.schema} · {fmtNum(t.rowCount)} rows · {t.numericCount}/{t.columnCount} numeric
                                      </div>
                                    </div>

                                    {/* Capability chips */}
                                    <div className="col-span-12 md:col-span-3 flex flex-wrap gap-1">
                                      {t.classification.hasFeed && <Cap label="Feed" />}
                                      {t.classification.hasOverallRecovery && <Cap label="Recovery" />}
                                      {t.classification.hasBackwash && <Cap label="Backwash" />}
                                      {t.classification.hasRunHours && <Cap label="Run-hrs" />}
                                    </div>

                                    {/* Last update */}
                                    <div className={`col-span-6 md:col-span-2 text-[11px] flex items-center gap-1.5 ${AGE_TONE[age.tone]}`}>
                                      {age.tone === "crit" || age.tone === "unknown"
                                        ? <WifiOff className="w-3.5 h-3.5" />
                                        : <Wifi className="w-3.5 h-3.5" />}
                                      {age.text}
                                    </div>

                                    {/* Open dashboard */}
                                    <div className="col-span-6 md:col-span-1 flex justify-end">
                                      <button
                                        onClick={() => openDashboard(p, t)}
                                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                                        title="Open deep operations dashboard"
                                      >
                                        Open <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</div>
        <div className="text-lg font-bold text-slate-900 leading-tight">{typeof value === "number" ? fmtNum(value) : value}</div>
      </div>
    </div>
  );
}

function Cap({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
      {label}
    </span>
  );
}
