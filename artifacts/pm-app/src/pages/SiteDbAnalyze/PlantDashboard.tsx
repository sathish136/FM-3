import { useState, useEffect, useMemo } from "react";
import {
  Activity, Droplets, Gauge, Wind, Zap, TrendingUp, AlertTriangle,
  CheckCircle2, Beaker, Plus, X, Layers, Clock, BarChart3, Loader2,
  ChevronRight, Target, Waves, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, AreaChart, Area, ReferenceLine,
} from "recharts";
import {
  PlantSchema, SkidConfig, MetricKind, metricLabel, metricUnit, metricStatus,
} from "./plantSchemas";

// ──────────────────────────────────────────────────────────────────────
const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#84cc16", "#f97316", "#0ea5e9",
];

function fmt(v: any, decimals = 2): string {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(v: any): string {
  const n = Number(v);
  return isFinite(n) ? n.toLocaleString() : "—";
}

function metricIcon(m: MetricKind) {
  switch (m) {
    case "flow": return Wind;
    case "tmp": return Gauge;
    case "pressure": return Gauge;
    case "level": return Droplets;
    case "totalizer": return Layers;
    case "runHours": return Clock;
  }
}

function statusBg(s: "ok" | "warn" | "critical"): string {
  if (s === "critical") return "bg-rose-500";
  if (s === "warn") return "bg-amber-500";
  return "bg-emerald-500";
}
function statusText(s: "ok" | "warn" | "critical"): string {
  if (s === "critical") return "text-rose-700";
  if (s === "warn") return "text-amber-700";
  return "text-emerald-700";
}
function statusBorder(s: "ok" | "warn" | "critical"): string {
  if (s === "critical") return "border-rose-300";
  if (s === "warn") return "border-amber-300";
  return "border-emerald-200";
}
function statusBgSoft(s: "ok" | "warn" | "critical"): string {
  if (s === "critical") return "bg-rose-50";
  if (s === "warn") return "bg-amber-50";
  return "bg-emerald-50";
}

// ──────────────────────────────────────────────────────────────────────
type LatestRow = Record<string, any>;
type SeriesRow = { time: string;[k: string]: any };

export type PlantDashboardProps = {
  base: string;
  db: string;
  dbLabel: string;
  schema: string;
  table: string;
  timeCol: string;
  plant: PlantSchema;
  fromDate: Date;
  toDate: Date;
  bucket: string;
  agg: "avg" | "min" | "max" | "sum";
};

export default function PlantDashboard({
  base, db, dbLabel, schema, table, timeCol, plant, fromDate, toDate, bucket, agg,
}: PlantDashboardProps) {
  const [latest, setLatest] = useState<LatestRow | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [latestErr, setLatestErr] = useState<string | null>(null);

  const [marked, setMarked] = useState<string[]>([]);
  const [trendSeries, setTrendSeries] = useState<SeriesRow[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [sparkSeries, setSparkSeries] = useState<SeriesRow[]>([]);
  const [loadingSpark, setLoadingSpark] = useState(false);

  // ── load latest row (top of table) for live KPI panel
  const loadLatest = async () => {
    setLoadingLatest(true); setLatestErr(null);
    try {
      const sqlText = `SELECT TOP 1 * FROM [${schema}].[${table}] ORDER BY [${timeCol}] DESC`;
      const r = await fetch(`${base}/api/site-db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db, sql: sqlText, limit: 1 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setLatest(j.rows?.[0] || null);
    } catch (e: any) {
      setLatestErr(e.message || "Failed to load latest reading");
    } finally {
      setLoadingLatest(false);
    }
  };

  // ── load mini sparklines (last 24h, hourly avg) for every skid Flow + TMP
  const loadSparks = async () => {
    const tags: string[] = [];
    plant.skids.forEach((s) => {
      if (s.flow) tags.push(s.flow);
      if (s.tmp) tags.push(s.tmp);
    });
    if (!tags.length) return;
    setLoadingSpark(true);
    try {
      const r = await fetch(`${base}/api/site-db/analytics/series`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema, table, timeCol, tags,
          from: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          to: new Date().toISOString(),
          bucket: "1h", agg: "avg",
        }),
      });
      if (r.ok) {
        const j = await r.json();
        setSparkSeries(j.rows || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingSpark(false);
    }
  };

  // ── load comparison-chart series for marked tags
  const loadTrend = async () => {
    if (marked.length === 0) { setTrendSeries([]); return; }
    setLoadingSeries(true);
    try {
      const r = await fetch(`${base}/api/site-db/analytics/series`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db, schema, table, timeCol, tags: marked,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          bucket, agg,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setTrendSeries(j.rows || []);
    } catch {
      setTrendSeries([]);
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => { loadLatest(); loadSparks(); }, [db, schema, table, timeCol]);
  useEffect(() => { loadTrend(); }, [marked.join(","), fromDate.getTime(), toDate.getTime(), bucket, agg]);

  // ── derive latest values per metric per skid
  const latestVal = (col?: string): number | null => {
    if (!col || !latest) return null;
    const v = latest[col];
    if (v == null || v === "") return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  };

  // ── sparkline data per tag
  const sparkOf = (tag?: string) => {
    if (!tag) return [];
    return sparkSeries
      .map((r) => ({ t: r.time, v: r[tag] != null ? Number(r[tag]) : null }))
      .filter((p) => p.v != null);
  };

  // ── plant-level KPIs
  const totalToday = useMemo(() => {
    let sum = 0;
    plant.skids.forEach((s) => {
      const v = latestVal(s.totalizerDay);
      if (v != null) sum += v;
    });
    if (sum > 0) return sum;
    const ov = latestVal(plant.overall.dayNet);
    return ov ?? null;
  }, [plant, latest]);

  const totalBwToday = useMemo(() => {
    let sum = 0;
    let any = false;
    plant.skids.forEach((s) => {
      const v = latestVal(s.bwTotalizerDay);
      if (v != null) { sum += v; any = true; }
    });
    return any ? sum : null;
  }, [plant, latest]);

  const feedToday = latestVal(plant.feed.totalizerDay);

  const recoveryToday = useMemo(() => {
    if (totalToday == null || feedToday == null || feedToday <= 0) return null;
    return (totalToday / feedToday) * 100;
  }, [totalToday, feedToday]);

  const skidStatuses = useMemo(() => {
    return plant.skids.map((s) => {
      const tmp = latestVal(s.tmp);
      const flow = latestVal(s.flow);
      const level = latestVal(s.level);
      const press = latestVal(s.pressure);
      const statuses: ("ok" | "warn" | "critical")[] = [];
      if (tmp != null) statuses.push(metricStatus("tmp", tmp));
      if (flow != null) statuses.push(metricStatus("flow", flow));
      if (level != null) statuses.push(metricStatus("level", level));
      if (press != null) statuses.push(metricStatus("pressure", press));
      const worst: "ok" | "warn" | "critical" =
        statuses.includes("critical") ? "critical" :
        statuses.includes("warn") ? "warn" : "ok";
      return worst;
    });
  }, [plant, latest]);

  const okCount = skidStatuses.filter((s) => s === "ok").length;
  const warnCount = skidStatuses.filter((s) => s === "warn").length;
  const critCount = skidStatuses.filter((s) => s === "critical").length;

  const toggleMark = (tag?: string) => {
    if (!tag) return;
    setMarked((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5">
      {/* ── Plant hero strip ── */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-600 via-indigo-700 to-violet-700 text-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-cyan-200 text-[11px] uppercase tracking-wider font-semibold">
              <Activity className="w-3.5 h-3.5" /> Live · {plant.typeLabel}
            </div>
            <h1 className="text-2xl font-bold mt-1">{dbLabel}</h1>
            <p className="text-cyan-100 text-sm mt-1">
              {plant.skids.length} skid{plant.skids.length === 1 ? "" : "s"}
              {plant.bio.do && " · bioreactor monitored"}
              {plant.feed.flow && " · feed flow tracked"}
            </p>
          </div>
          <button
            onClick={() => { loadLatest(); loadSparks(); }}
            disabled={loadingLatest}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingLatest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <KpiTile
            label="Today's Production"
            value={totalToday != null ? `${fmt(totalToday, 1)} m³` : "—"}
            sub={feedToday != null ? `feed: ${fmt(feedToday, 1)} m³` : undefined}
            tone="emerald"
          />
          <KpiTile
            label="Recovery"
            value={recoveryToday != null ? `${fmt(recoveryToday, 1)} %` : "—"}
            sub={recoveryToday != null && recoveryToday >= 75 ? "healthy" : recoveryToday != null ? "below target" : undefined}
            tone={recoveryToday == null ? "neutral" : recoveryToday >= 75 ? "emerald" : recoveryToday >= 60 ? "amber" : "rose"}
          />
          <KpiTile
            label="Backwash Today"
            value={totalBwToday != null ? `${fmt(totalBwToday, 1)} m³` : "—"}
            sub={totalToday && totalBwToday != null ? `${fmt((totalBwToday / totalToday) * 100, 1)} % of prod` : undefined}
            tone="cyan"
          />
          <KpiTile
            label="Skid Health"
            value={`${okCount}/${plant.skids.length} OK`}
            sub={
              critCount > 0 ? `${critCount} critical · ${warnCount} warn`
              : warnCount > 0 ? `${warnCount} warn`
              : "all healthy"
            }
            tone={critCount > 0 ? "rose" : warnCount > 0 ? "amber" : "emerald"}
          />
        </div>
      </div>

      {/* ── Latest err ── */}
      {latestErr && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Couldn't load latest reading: {latestErr}
        </div>
      )}

      {/* ── Skid grid ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Skids</h2>
          <span className="text-xs text-slate-400">tap any tile to add it to the comparison chart</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plant.skids.map((s, i) => (
            <SkidCard
              key={s.id}
              skid={s}
              index={i}
              latestVal={latestVal}
              spark={sparkOf}
              marked={marked}
              onToggleMark={toggleMark}
              status={skidStatuses[i]}
            />
          ))}
        </div>
      </div>

      {/* ── Feed / Bio panel ── */}
      {(plant.feed.flow || plant.feed.level || plant.feed.ph || plant.bio.do) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Waves className="w-4 h-4 text-cyan-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Feed &amp; Bioreactor</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plant.feed.flow && (
              <CommonTile label="Feed Flow" tag={plant.feed.flow} value={latestVal(plant.feed.flow)} unit="m³/h" icon={Wind} marked={marked.includes(plant.feed.flow)} onToggle={() => toggleMark(plant.feed.flow)} />
            )}
            {plant.feed.level && (
              <CommonTile label="Feed Level" tag={plant.feed.level} value={latestVal(plant.feed.level)} unit="%" icon={Droplets} marked={marked.includes(plant.feed.level)} onToggle={() => toggleMark(plant.feed.level)} />
            )}
            {plant.feed.ph && (
              <CommonTile label="pH" tag={plant.feed.ph} value={latestVal(plant.feed.ph)} unit="pH" icon={Beaker} marked={marked.includes(plant.feed.ph)} onToggle={() => toggleMark(plant.feed.ph)} />
            )}
            {plant.bio.do && (
              <CommonTile label="Bio DO" tag={plant.bio.do} value={latestVal(plant.bio.do)} unit="mg/L" icon={Wind} marked={marked.includes(plant.bio.do)} onToggle={() => toggleMark(plant.bio.do)} />
            )}
            {plant.feed.totalizerDay && (
              <CommonTile label="Feed Today" tag={plant.feed.totalizerDay} value={latestVal(plant.feed.totalizerDay)} unit="m³" icon={Layers} marked={marked.includes(plant.feed.totalizerDay)} onToggle={() => toggleMark(plant.feed.totalizerDay!)} />
            )}
            {plant.overall.dayNet && (
              <CommonTile label="Net Production Today" tag={plant.overall.dayNet} value={latestVal(plant.overall.dayNet)} unit="m³" icon={Target} marked={marked.includes(plant.overall.dayNet)} onToggle={() => toggleMark(plant.overall.dayNet!)} />
            )}
            {plant.overall.rpm && (
              <CommonTile label="Pump RPM" tag={plant.overall.rpm} value={latestVal(plant.overall.rpm)} unit="" icon={Zap} marked={marked.includes(plant.overall.rpm)} onToggle={() => toggleMark(plant.overall.rpm!)} />
            )}
          </div>
        </div>
      )}

      {/* ── Comparison chart ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Comparison Chart
            </h2>
            <span className="text-xs text-slate-500">
              {marked.length === 0 ? "Mark any tile above to plot it" : `${marked.length} tag${marked.length === 1 ? "" : "s"} plotted`}
            </span>
          </div>
          {marked.length > 0 && (
            <button
              onClick={() => setMarked([])}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
            >
              Clear all
            </button>
          )}
        </div>

        {/* selected chips */}
        {marked.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-slate-100">
            {marked.map((t, i) => (
              <button
                key={t}
                onClick={() => toggleMark(t)}
                className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md text-[11px] font-medium border"
                style={{
                  borderColor: COLORS[i % COLORS.length] + "60",
                  color: COLORS[i % COLORS.length],
                  background: COLORS[i % COLORS.length] + "12",
                }}
              >
                {t}
                <X className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {marked.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-sm">
            <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
            Select metrics from the skid cards above to compare them on a single chart
          </div>
        ) : loadingSeries ? (
          <div className="h-72 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading time series…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={trendSeries} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => new Date(v).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <RTooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                labelFormatter={(v) => new Date(v).toLocaleString()}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {marked.map((tag, i) => (
                <Line
                  key={tag}
                  type="monotone"
                  dataKey={tag}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function KpiTile({
  label, value, sub, tone,
}: { label: string; value: string; sub?: string; tone: "emerald" | "amber" | "rose" | "cyan" | "neutral" }) {
  const toneClass = {
    emerald: "bg-emerald-500/30 border-emerald-300/40 text-emerald-50",
    amber: "bg-amber-500/30 border-amber-300/40 text-amber-50",
    rose: "bg-rose-500/30 border-rose-300/40 text-rose-50",
    cyan: "bg-cyan-500/30 border-cyan-300/40 text-cyan-50",
    neutral: "bg-white/10 border-white/20 text-white/90",
  }[tone];
  return (
    <div className={`rounded-xl p-3 border backdrop-blur ${toneClass}`}>
      <div className="text-[10px] uppercase font-bold opacity-90">{label}</div>
      <div className="text-2xl font-extrabold mt-0.5 text-white leading-tight">{value}</div>
      {sub && <div className="text-[10px] mt-0.5 opacity-80">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function SkidCard({
  skid, index, latestVal, spark, marked, onToggleMark, status,
}: {
  skid: SkidConfig;
  index: number;
  latestVal: (col?: string) => number | null;
  spark: (tag?: string) => { t: string; v: number | null }[];
  marked: string[];
  onToggleMark: (tag?: string) => void;
  status: "ok" | "warn" | "critical";
}) {
  const flowVal = latestVal(skid.flow);
  const tmpVal = latestVal(skid.tmp);
  const pressVal = latestVal(skid.pressure);
  const lvlVal = latestVal(skid.level);
  const dayVal = latestVal(skid.totalizerDay);
  const bwVal = latestVal(skid.bwTotalizerDay);
  const runHrs = latestVal(skid.runHours);

  const flowSpark = spark(skid.flow);
  const tmpSpark = spark(skid.tmp);

  const accent = COLORS[index % COLORS.length];

  return (
    <div className={`bg-white rounded-2xl border-2 ${statusBorder(status)} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition`}>
      {/* header */}
      <div className={`px-4 py-3 ${statusBgSoft(status)} border-b ${statusBorder(status)} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: accent }}
          >
            {skid.index}
          </span>
          <div>
            <div className="font-bold text-slate-800 text-sm">{skid.name}</div>
            {runHrs != null && (
              <div className="text-[10px] text-slate-500">Run: {fmt(runHrs, 0)} hrs</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusBg(status)} ${status === "critical" ? "animate-pulse" : ""}`} />
          <span className={`text-[10px] font-bold uppercase ${statusText(status)}`}>{status}</span>
        </div>
      </div>

      {/* metric tiles */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <MetricTile
          metric="flow" label="Flow" tag={skid.flow} value={flowVal}
          spark={flowSpark}
          marked={skid.flow ? marked.includes(skid.flow) : false}
          onToggle={() => onToggleMark(skid.flow)}
          color={accent}
        />
        <MetricTile
          metric="tmp" label="TMP" tag={skid.tmp} value={tmpVal}
          spark={tmpSpark}
          marked={skid.tmp ? marked.includes(skid.tmp) : false}
          onToggle={() => onToggleMark(skid.tmp)}
          color="#ef4444"
        />
        <MetricTile
          metric="pressure" label="Pressure" tag={skid.pressure} value={pressVal}
          marked={skid.pressure ? marked.includes(skid.pressure) : false}
          onToggle={() => onToggleMark(skid.pressure)}
          color="#f59e0b"
        />
        <MetricTile
          metric="level" label="Level" tag={skid.level} value={lvlVal}
          marked={skid.level ? marked.includes(skid.level) : false}
          onToggle={() => onToggleMark(skid.level)}
          color="#06b6d4"
        />
      </div>

      {/* footer: production today + backwash */}
      {(dayVal != null || bwVal != null) && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {dayVal != null && (
            <button
              onClick={() => onToggleMark(skid.totalizerDay)}
              className={`text-left rounded-lg p-2 border transition ${
                skid.totalizerDay && marked.includes(skid.totalizerDay)
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-[10px] uppercase text-slate-500 font-bold">Today</div>
              <div className="text-sm font-bold text-emerald-700">{fmt(dayVal, 1)} m³</div>
            </button>
          )}
          {bwVal != null && (
            <button
              onClick={() => onToggleMark(skid.bwTotalizerDay)}
              className={`text-left rounded-lg p-2 border transition ${
                skid.bwTotalizerDay && marked.includes(skid.bwTotalizerDay)
                  ? "bg-cyan-50 border-cyan-300"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-[10px] uppercase text-slate-500 font-bold">Backwash</div>
              <div className="text-sm font-bold text-cyan-700">{fmt(bwVal, 1)} m³</div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function MetricTile({
  metric, label, tag, value, spark, marked, onToggle, color,
}: {
  metric: MetricKind;
  label: string;
  tag?: string;
  value: number | null;
  spark?: { t: string; v: number | null }[];
  marked: boolean;
  onToggle: () => void;
  color: string;
}) {
  const Icon = metricIcon(metric);
  const status = value != null ? metricStatus(metric, value) : "ok";
  const unit = metricUnit(metric);

  if (!tag) {
    return (
      <div className="rounded-lg p-2 bg-slate-50 border border-dashed border-slate-200 opacity-60">
        <div className="flex items-center gap-1 text-[10px] uppercase text-slate-400 font-bold">
          <Icon className="w-3 h-3" /> {label}
        </div>
        <div className="text-xs text-slate-400 mt-1">not configured</div>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`text-left rounded-lg p-2 border transition relative overflow-hidden group ${
        marked
          ? "border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/30"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
      title={tag}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-bold">
          <Icon className="w-3 h-3" style={{ color }} /> {label}
        </div>
        <div className="flex items-center gap-1">
          {value != null && status !== "ok" && (
            <AlertTriangle className={`w-2.5 h-2.5 ${status === "critical" ? "text-rose-500" : "text-amber-500"}`} />
          )}
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
            marked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 group-hover:border-indigo-400 bg-white"
          }`}>
            {marked ? <X className="w-2.5 h-2.5 text-white" /> : <Plus className="w-2.5 h-2.5 text-slate-400" />}
          </div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-extrabold leading-none ${value == null ? "text-slate-300" : statusText(status)}`}>
          {value != null ? fmt(value, metric === "tmp" ? 3 : 2) : "—"}
        </span>
        <span className="text-[10px] text-slate-400">{unit}</span>
      </div>
      {spark && spark.length > 1 && (
        <div className="-mx-2 -mb-2 mt-1 h-8 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={1.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
function CommonTile({
  label, tag, value, unit, icon: Icon, marked, onToggle,
}: {
  label: string;
  tag: string;
  value: number | null;
  unit: string;
  icon: any;
  marked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`bg-white rounded-xl border p-3 text-left transition relative ${
        marked ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"
      }`}
      title={tag}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-bold">
          <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
        </div>
        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
          marked ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
        }`}>
          {marked ? <X className="w-2.5 h-2.5 text-white" /> : <Plus className="w-2.5 h-2.5 text-slate-400" />}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-extrabold ${value == null ? "text-slate-300" : "text-slate-800"}`}>
          {value != null ? fmt(value, 2) : "—"}
        </span>
        <span className="text-[10px] text-slate-400">{unit}</span>
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">{tag}</div>
    </button>
  );
}
