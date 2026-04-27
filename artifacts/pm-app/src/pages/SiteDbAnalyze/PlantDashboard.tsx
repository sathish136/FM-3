import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity, Droplets, Gauge, AlertTriangle, CheckCircle2,
  Layers, Clock, Loader2, TrendingUp, TrendingDown, FileText,
  Beaker, Waves, Factory, ShieldAlert, Lightbulb, ArrowRight,
  Calendar, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, BarChart, Bar, ReferenceLine, AreaChart, Area,
} from "recharts";
import { PlantSchema, SkidConfig } from "./plantSchemas";

// ──────────────────────────────────────────────────────────────────────
const SKID_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444", "#84cc16"];

const num = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
};
const fmt = (v: any, d = 2): string => {
  const n = num(v);
  if (n == null) return "—";
  if (Math.abs(n) >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtInt = (v: any) => { const n = num(v); return n == null ? "—" : Math.round(n).toLocaleString(); };
const fmtPct = (v: any, d = 1) => { const n = num(v); return n == null ? "—" : `${n.toFixed(d)}%`; };
const fmtDateTime = (s: string) => {
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtDate = (s: string) => {
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// linear regression slope (units per index step)
function slope(values: (number | null)[]): number | null {
  const pts = values.map((y, i) => ({ x: i, y })).filter(p => p.y != null) as { x: number; y: number }[];
  const n = pts.length;
  if (n < 3) return null;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  return (n * sxy - sx * sy) / den;
}

function avg(values: (number | null)[]): number | null {
  const xs = values.filter(v => v != null) as number[];
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
function maxOf(values: (number | null)[]): number | null {
  const xs = values.filter(v => v != null) as number[];
  return xs.length ? Math.max(...xs) : null;
}
function minOf(values: (number | null)[]): number | null {
  const xs = values.filter(v => v != null) as number[];
  return xs.length ? Math.min(...xs) : null;
}
function stdev(values: (number | null)[]): number | null {
  const xs = values.filter(v => v != null) as number[];
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}
function countWhere(values: (number | null)[], pred: (n: number) => boolean): number {
  return values.filter(v => v != null && pred(v as number)).length;
}

// ──────────────────────────────────────────────────────────────────────
type SeriesRow = { bucket: string; [k: string]: any };

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

type Period = "24h" | "7d" | "30d";
const PERIOD_HOURS: Record<Period, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const PERIOD_LABEL: Record<Period, string> = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" };
const PERIOD_BUCKET_OPS: Record<Period, string> = { "24h": "15m", "7d": "1h", "30d": "6h" };

export default function PlantDashboard({
  base, db, dbLabel, schema, table, timeCol, plant,
}: PlantDashboardProps) {
  const [period, setPeriod] = useState<Period>("7d");
  const [opsRows, setOpsRows] = useState<SeriesRow[]>([]);
  const [dailyRows, setDailyRows] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const periodRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - PERIOD_HOURS[period] * 3600 * 1000);
    return { from, to };
  }, [period]);

  const opsTags = useMemo(() => {
    const set = new Set<string>();
    plant.skids.forEach(s => {
      [s.flow, s.tmp, s.pressure, s.level].forEach(t => t && set.add(t));
    });
    [plant.feed.flow, plant.feed.level, plant.feed.ph, plant.bio.do, plant.overall.rpm]
      .forEach(t => t && set.add(t));
    return [...set];
  }, [plant]);

  const dailyTags = useMemo(() => {
    const set = new Set<string>();
    plant.skids.forEach(s => {
      [s.totalizerDay, s.bwTotalizerDay].forEach(t => t && set.add(t));
    });
    [plant.feed.totalizerDay, plant.overall.dayNet].forEach(t => t && set.add(t));
    return [...set];
  }, [plant]);

  const fetchSeries = useCallback(async (tags: string[], bucket: string, agg: string) => {
    if (!tags.length) return [];
    const r = await fetch(`${base}/api/site-db/analytics/series`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        db, schema, table, timeCol, tags, bucket, agg,
        from: periodRange.from.toISOString(), to: periodRange.to.toISOString(),
      }),
    });
    if (!r.ok) throw new Error(`series ${r.status}`);
    const j = await r.json();
    return Array.isArray(j.rows) ? j.rows : [];
  }, [base, db, schema, table, timeCol, periodRange]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [ops, daily] = await Promise.all([
          fetchSeries(opsTags, PERIOD_BUCKET_OPS[period], "avg"),
          fetchSeries(dailyTags, "1d", "max"), // totalizers reset daily, max per day
        ]);
        if (cancel) return;
        setOpsRows(ops);
        setDailyRows(daily);
      } catch (e: any) {
        if (!cancel) setErr(e.message || "Failed to load report data");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [period, opsTags, dailyTags, fetchSeries]);

  // ── derive insights ────────────────────────────────────────────────
  const insights = useMemo(() => buildInsights(plant, opsRows, dailyRows, period), [plant, opsRows, dailyRows, period]);

  return (
    <div className="bg-slate-50 min-h-full">
      {/* ── Slim report toolbar ────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">{PERIOD_LABEL[period]}</span>
            <span className="text-slate-300">·</span>
            <span>{dbLabel} / {table}</span>
            <span className="text-slate-300">·</span>
            <span>Generated {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(["24h", "7d", "30d"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >{p.toUpperCase()}</button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700"
            ><Download className="w-3.5 h-3.5" />Export</button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <div className="text-sm text-slate-500">Building observation report…</div>
          </div>
        )}
        {err && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
            <strong>Couldn't load report data:</strong> {err}
          </div>
        )}

        {!loading && !err && (
          <>
            <ExecutiveSummary insights={insights} period={period} />
            <ProductionSection insights={insights} dailyRows={dailyRows} plant={plant} />
            <MembraneHealthSection insights={insights} opsRows={opsRows} plant={plant} />
            <SkidBalancingSection insights={insights} plant={plant} />
            <FeedQualitySection insights={insights} opsRows={opsRows} plant={plant} />
            <AnomaliesSection insights={insights} />
            <DetailedMetricsTable insights={insights} plant={plant} />
            <Recommendations insights={insights} />
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Insights builder
// ──────────────────────────────────────────────────────────────────────
type SkidInsight = {
  skid: SkidConfig;
  flow: { avg: number | null; min: number | null; max: number | null; std: number | null };
  tmp: { avg: number | null; max: number | null; min: number | null; foulingRate: number | null; hoursWarn: number; hoursCrit: number };
  pressure: { avg: number | null; max: number | null };
  level: { avg: number | null; min: number | null; max: number | null; hoursOOS: number };
  productionTotal: number | null;
  bwTotal: number | null;
  bwRatio: number | null; // BW / production
  share: number | null; // % of plant flow
  status: "ok" | "warn" | "critical";
};

type Insights = {
  period: Period;
  hours: number;
  hoursOfData: number;
  bucketSec: number;
  skids: SkidInsight[];
  production: {
    total: number | null;
    avgPerDay: number | null;
    bestDay: { date: string; value: number } | null;
    worstDay: { date: string; value: number } | null;
    trendPctPerDay: number | null;
  };
  feed: {
    avgFlow: number | null;
    totalIn: number | null;
    avgPh: number | null;
    phOOSHours: number;
    avgDO: number | null;
    doLowHours: number;
    flowCV: number | null;
  };
  recovery: number | null;
  bw: { total: number | null; ratio: number | null };
  anomalies: AnomalyEvent[];
  skidTotalsAvgFlow: number;
};

type AnomalyEvent = {
  time: string;
  scope: string;
  metric: string;
  value: number;
  threshold: string;
  severity: "warn" | "critical";
};

function buildInsights(plant: PlantSchema, opsRows: SeriesRow[], dailyRows: SeriesRow[], period: Period): Insights {
  const hours = PERIOD_HOURS[period];
  const bucketSec = period === "24h" ? 15 * 60 : period === "7d" ? 3600 : 6 * 3600;
  const hoursPerBucket = bucketSec / 3600;

  const colSeries = (col?: string): (number | null)[] =>
    col ? opsRows.map(r => num(r[col])) : [];

  const dailyColSeries = (col?: string): { date: string; v: number | null }[] =>
    col ? dailyRows.map(r => ({ date: r.bucket, v: num(r[col]) })) : [];

  // ─ Skids
  const skidInsights: SkidInsight[] = plant.skids.map(s => {
    const flowS = colSeries(s.flow);
    const tmpS = colSeries(s.tmp);
    const presS = colSeries(s.pressure);
    const lvlS = colSeries(s.level);
    const dailyTot = dailyColSeries(s.totalizerDay).map(d => d.v);
    const dailyBw = dailyColSeries(s.bwTotalizerDay).map(d => d.v);

    const tmpAvg = avg(tmpS);
    const tmpMax = maxOf(tmpS);
    const tmpMin = minOf(tmpS);
    const tmpHoursWarn = countWhere(tmpS, v => v > 0.30 && v <= 0.45) * hoursPerBucket;
    const tmpHoursCrit = countWhere(tmpS, v => v > 0.45) * hoursPerBucket;
    // fouling rate: slope of TMP per bucket → convert to per day
    const tmpSlopePerBucket = slope(tmpS);
    const foulingRate = tmpSlopePerBucket != null ? tmpSlopePerBucket * (24 / hoursPerBucket) : null;

    const lvlOOS = countWhere(lvlS, v => v > 95 || v < 5) * hoursPerBucket;

    const prodTotal = dailyTot.filter(v => v != null).reduce((a, b) => a + (b as number), 0) || null;
    const bwTotal = dailyBw.filter(v => v != null).reduce((a, b) => a + (b as number), 0) || null;
    const bwRatio = prodTotal && bwTotal ? bwTotal / prodTotal : null;

    let status: "ok" | "warn" | "critical" = "ok";
    if (tmpHoursCrit > 0 || lvlOOS > 0) status = "critical";
    else if (tmpHoursWarn > 0) status = "warn";

    return {
      skid: s,
      flow: { avg: avg(flowS), min: minOf(flowS), max: maxOf(flowS), std: stdev(flowS) },
      tmp: { avg: tmpAvg, max: tmpMax, min: tmpMin, foulingRate, hoursWarn: tmpHoursWarn, hoursCrit: tmpHoursCrit },
      pressure: { avg: avg(presS), max: maxOf(presS) },
      level: { avg: avg(lvlS), min: minOf(lvlS), max: maxOf(lvlS), hoursOOS: lvlOOS },
      productionTotal: prodTotal,
      bwTotal,
      bwRatio,
      share: null, // filled below
      status,
    };
  });

  const totalAvgFlow = skidInsights.reduce((a, s) => a + (s.flow.avg ?? 0), 0);
  skidInsights.forEach(s => {
    if (totalAvgFlow > 0 && s.flow.avg != null) s.share = (s.flow.avg / totalAvgFlow) * 100;
  });

  // ─ Production aggregate
  const productionTotal = skidInsights.reduce((a, s) => a + (s.productionTotal ?? 0), 0) || null;
  const dailyTotals = dailyRows.map(r => {
    const value = plant.skids.reduce((a, s) => a + (s.totalizerDay ? num(r[s.totalizerDay]) ?? 0 : 0), 0);
    return { date: r.bucket as string, value };
  });
  const dailyValues = dailyTotals.map(d => d.value).filter(v => v > 0);
  const avgPerDay = dailyValues.length ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : null;
  const bestDay = dailyTotals.filter(d => d.value > 0).sort((a, b) => b.value - a.value)[0] || null;
  const worstDay = dailyTotals.filter(d => d.value > 0).sort((a, b) => a.value - b.value)[0] || null;
  const prodSlope = slope(dailyTotals.map(d => d.value || null));
  const trendPctPerDay = prodSlope != null && avgPerDay && avgPerDay > 0 ? (prodSlope / avgPerDay) * 100 : null;

  // ─ Feed
  const feedFlowS = colSeries(plant.feed.flow);
  const phS = colSeries(plant.feed.ph);
  const doS = colSeries(plant.bio.do);
  const feedTotal = (() => {
    if (!plant.feed.totalizerDay) return null;
    const xs = dailyRows.map(r => num(r[plant.feed.totalizerDay!])).filter(v => v != null) as number[];
    return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
  })();

  const phMean = avg(phS);
  const phOOSHours = countWhere(phS, v => v < 6.5 || v > 8.5) * hoursPerBucket;
  const doMean = avg(doS);
  const doLowHours = countWhere(doS, v => v < 1.5) * hoursPerBucket;
  const feedFlowMean = avg(feedFlowS);
  const feedFlowStd = stdev(feedFlowS);
  const flowCV = feedFlowMean && feedFlowMean > 0 && feedFlowStd != null ? (feedFlowStd / feedFlowMean) * 100 : null;

  const recovery = productionTotal && feedTotal && feedTotal > 0 ? (productionTotal / feedTotal) * 100 : null;
  const bwTotal = skidInsights.reduce((a, s) => a + (s.bwTotal ?? 0), 0) || null;
  const bwRatio = productionTotal && bwTotal ? bwTotal / productionTotal : null;

  // ─ Anomalies (scan ops series)
  const anomalies: AnomalyEvent[] = [];
  opsRows.forEach(r => {
    const t = r.bucket as string;
    plant.skids.forEach(s => {
      const tmp = num(r[s.tmp || ""]);
      if (tmp != null && tmp > 0.45) anomalies.push({ time: t, scope: s.name, metric: "TMP", value: tmp, threshold: "> 0.45 bar", severity: "critical" });
      else if (tmp != null && tmp > 0.30) anomalies.push({ time: t, scope: s.name, metric: "TMP", value: tmp, threshold: "> 0.30 bar", severity: "warn" });
      const lvl = num(r[s.level || ""]);
      if (lvl != null && (lvl > 95 || lvl < 5)) anomalies.push({ time: t, scope: s.name, metric: "Level", value: lvl, threshold: lvl > 95 ? "> 95%" : "< 5%", severity: "critical" });
    });
    const ph = num(r[plant.feed.ph || ""]);
    if (ph != null && (ph < 6.5 || ph > 8.5)) anomalies.push({ time: t, scope: "Feed", metric: "pH", value: ph, threshold: ph < 6.5 ? "< 6.5" : "> 8.5", severity: "warn" });
    const dox = num(r[plant.bio.do || ""]);
    if (dox != null && dox < 1.5) anomalies.push({ time: t, scope: "Bioreactor", metric: "DO", value: dox, threshold: "< 1.5 mg/L", severity: "warn" });
  });
  // sort latest first, cap
  anomalies.sort((a, b) => +new Date(b.time) - +new Date(a.time));

  return {
    period,
    hours,
    hoursOfData: opsRows.length * hoursPerBucket,
    bucketSec,
    skids: skidInsights,
    production: { total: productionTotal, avgPerDay, bestDay, worstDay, trendPctPerDay },
    feed: { avgFlow: feedFlowMean, totalIn: feedTotal, avgPh: phMean, phOOSHours, avgDO: doMean, doLowHours, flowCV },
    recovery,
    bw: { total: bwTotal, ratio: bwRatio },
    anomalies: anomalies.slice(0, 100),
    skidTotalsAvgFlow: totalAvgFlow,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Sections
// ──────────────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, subtitle, children, accent = "indigo" }: any) {
  const accents: Record<string, { bg: string; fg: string }> = {
    indigo: { bg: "bg-indigo-50", fg: "text-indigo-600" },
    emerald: { bg: "bg-emerald-50", fg: "text-emerald-600" },
    amber: { bg: "bg-amber-50", fg: "text-amber-600" },
    rose: { bg: "bg-rose-50", fg: "text-rose-600" },
    sky: { bg: "bg-sky-50", fg: "text-sky-600" },
    slate: { bg: "bg-slate-100", fg: "text-slate-700" },
  };
  const a = accents[accent] || accents.indigo;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${a.fg}`} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function StatBox({ label, value, unit, sub, tone = "default" }: { label: string; value: string; unit?: string; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const tones: Record<string, string> = {
    default: "text-slate-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-rose-700",
  };
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tones[tone]}`}>
        {value} {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Executive summary ──────────────────────────────────────────────────
function ExecutiveSummary({ insights, period }: { insights: Insights; period: Period }) {
  const lines: { tone: "good" | "warn" | "bad" | "info"; text: string }[] = [];

  if (insights.production.avgPerDay != null) {
    const trendStr = insights.production.trendPctPerDay != null
      ? ` with a ${insights.production.trendPctPerDay > 0 ? "rising" : "declining"} trend of ${Math.abs(insights.production.trendPctPerDay).toFixed(1)}% per day`
      : "";
    const tone = insights.production.trendPctPerDay != null && insights.production.trendPctPerDay < -2 ? "warn" : "info";
    lines.push({
      tone,
      text: `Plant produced ${fmtInt(insights.production.total)} m³ over ${PERIOD_LABEL[period].toLowerCase()}, averaging ${fmtInt(insights.production.avgPerDay)} m³/day${trendStr}.`,
    });
  }
  if (insights.recovery != null) {
    const tone = insights.recovery >= 90 ? "good" : insights.recovery >= 75 ? "info" : "warn";
    lines.push({ tone, text: `Overall recovery (production ÷ feed) measured at ${insights.recovery.toFixed(1)}%${insights.recovery < 75 ? " — below typical MBR target of 90%+" : ""}.` });
  }
  const critSkids = insights.skids.filter(s => s.tmp.hoursCrit > 0);
  if (critSkids.length) {
    lines.push({
      tone: "bad",
      text: `${critSkids.map(s => s.skid.name).join(", ")} exceeded TMP > 0.45 bar for ${fmt(critSkids.reduce((a, s) => a + s.tmp.hoursCrit, 0), 1)} hours — recommend fouling investigation and CIP planning.`,
    });
  }
  const warnSkids = insights.skids.filter(s => s.tmp.hoursCrit === 0 && s.tmp.hoursWarn > 1);
  if (warnSkids.length) {
    lines.push({
      tone: "warn",
      text: `${warnSkids.map(s => s.skid.name).join(", ")} operated with elevated TMP (>0.30 bar) for ${fmt(warnSkids.reduce((a, s) => a + s.tmp.hoursWarn, 0), 1)} hours — increase backwash frequency.`,
    });
  }
  const fastFouling = insights.skids.filter(s => s.tmp.foulingRate != null && s.tmp.foulingRate > 0.02);
  if (fastFouling.length) {
    lines.push({
      tone: "warn",
      text: `Fouling rate is rising on ${fastFouling.map(s => `${s.skid.name} (+${(s.tmp.foulingRate! * 1000).toFixed(0)} mbar/day)`).join(", ")}.`,
    });
  }
  const flowShares = insights.skids.filter(s => s.share != null).map(s => s.share!);
  if (flowShares.length >= 2) {
    const max = Math.max(...flowShares), min = Math.min(...flowShares);
    if (max - min > 15) {
      const heavy = insights.skids.find(s => s.share === max)!;
      const light = insights.skids.find(s => s.share === min)!;
      lines.push({
        tone: "warn",
        text: `Load imbalance detected — ${heavy.skid.name} carries ${heavy.share!.toFixed(0)}% of plant flow vs ${light.skid.name} at ${light.share!.toFixed(0)}%.`,
      });
    } else {
      lines.push({ tone: "good", text: `Skid loading is balanced (max-min ${(max - min).toFixed(1)}% across ${insights.skids.length} skids).` });
    }
  }
  if (insights.feed.phOOSHours > 0) {
    lines.push({
      tone: insights.feed.phOOSHours > 4 ? "warn" : "info",
      text: `Feed pH was outside 6.5–8.5 for ${fmt(insights.feed.phOOSHours, 1)} hours — verify dosing.`,
    });
  }
  if (insights.feed.doLowHours > 0) {
    lines.push({
      tone: insights.feed.doLowHours > 4 ? "warn" : "info",
      text: `Bioreactor DO dropped below 1.5 mg/L for ${fmt(insights.feed.doLowHours, 1)} hours — check aeration.`,
    });
  }
  if (!lines.length) {
    lines.push({ tone: "good", text: "All measured parameters were within normal operating bands across the reporting window." });
  }

  const tones: Record<string, string> = {
    good: "border-l-emerald-500 bg-emerald-50/40 text-emerald-900",
    warn: "border-l-amber-500 bg-amber-50/40 text-amber-900",
    bad: "border-l-rose-500 bg-rose-50/40 text-rose-900",
    info: "border-l-indigo-500 bg-indigo-50/40 text-indigo-900",
  };
  const icons: Record<string, any> = { good: CheckCircle2, warn: AlertTriangle, bad: ShieldAlert, info: Activity };

  return (
    <SectionCard icon={FileText} title="Executive Summary" subtitle="Auto-generated key findings for this period" accent="indigo">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lines.map((l, i) => {
          const Icon = icons[l.tone];
          return (
            <div key={i} className={`flex gap-3 px-4 py-3 rounded-lg border-l-4 ${tones[l.tone]}`}>
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm leading-relaxed">{l.text}</div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Production analysis ─────────────────────────────────────────────────
function ProductionSection({ insights, dailyRows, plant }: { insights: Insights; dailyRows: SeriesRow[]; plant: PlantSchema }) {
  const chartData = dailyRows.map(r => {
    const out: any = { date: fmtDate(r.bucket as string) };
    plant.skids.forEach(s => {
      if (s.totalizerDay) out[s.name] = num(r[s.totalizerDay]);
    });
    if (plant.feed.totalizerDay) out["Feed"] = num(r[plant.feed.totalizerDay]);
    return out;
  });

  return (
    <SectionCard icon={Activity} title="Production & Recovery Analysis" subtitle="Daily totalizer values and recovery efficiency" accent="emerald">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatBox label="Total Production" value={fmtInt(insights.production.total)} unit="m³" sub={`${PERIOD_LABEL[insights.period]}`} />
        <StatBox label="Daily Average" value={fmtInt(insights.production.avgPerDay)} unit="m³/day" />
        <StatBox
          label="Recovery"
          value={fmtPct(insights.recovery)}
          tone={insights.recovery == null ? "default" : insights.recovery >= 90 ? "good" : insights.recovery >= 75 ? "default" : "warn"}
          sub={insights.feed.totalIn ? `Feed in: ${fmtInt(insights.feed.totalIn)} m³` : "feed totalizer not detected"}
        />
        <StatBox
          label="Trend"
          value={insights.production.trendPctPerDay == null ? "—" : `${insights.production.trendPctPerDay > 0 ? "+" : ""}${insights.production.trendPctPerDay.toFixed(1)}%`}
          unit="/day"
          tone={insights.production.trendPctPerDay == null ? "default" : insights.production.trendPctPerDay >= 0 ? "good" : insights.production.trendPctPerDay > -2 ? "default" : "warn"}
        />
      </div>

      {chartData.length > 0 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {plant.skids.map((s, i) => (
                <Bar key={s.id} dataKey={s.name} stackId="prod" fill={SKID_COLORS[i % SKID_COLORS.length]} radius={i === plant.skids.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-slate-400">No daily production data in this period</div>
      )}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {insights.production.bestDay && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800">
            <TrendingUp className="w-4 h-4" />
            <span><strong>Best day:</strong> {fmtDate(insights.production.bestDay.date)} — {fmtInt(insights.production.bestDay.value)} m³</span>
          </div>
        )}
        {insights.production.worstDay && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 text-rose-800">
            <TrendingDown className="w-4 h-4" />
            <span><strong>Lowest day:</strong> {fmtDate(insights.production.worstDay.date)} — {fmtInt(insights.production.worstDay.value)} m³</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Membrane health ─────────────────────────────────────────────────────
function MembraneHealthSection({ insights, opsRows, plant }: { insights: Insights; opsRows: SeriesRow[]; plant: PlantSchema }) {
  const chartData = opsRows.map(r => {
    const o: any = { time: fmtDateTime(r.bucket as string) };
    plant.skids.forEach(s => { if (s.tmp) o[s.name] = num(r[s.tmp]); });
    return o;
  });

  return (
    <SectionCard icon={Gauge} title="Membrane Health & TMP Analysis" subtitle="Trans-membrane pressure trends, fouling rate, and threshold breaches" accent="rose">
      {chartData.length > 0 && (
        <div className="h-64 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, "auto"]} label={{ value: "bar", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748b" } }} />
              <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0.30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Warn", position: "right", fill: "#f59e0b", fontSize: 10 }} />
              <ReferenceLine y={0.45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Critical", position: "right", fill: "#ef4444", fontSize: 10 }} />
              {plant.skids.map((s, i) => (
                <Line key={s.id} type="monotone" dataKey={s.name} stroke={SKID_COLORS[i % SKID_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.skids.map((si, i) => {
          const tone: "good" | "warn" | "bad" = si.status === "critical" ? "bad" : si.status === "warn" ? "warn" : "good";
          const fr = si.tmp.foulingRate;
          const frMbar = fr != null ? fr * 1000 : null;
          return (
            <div key={si.skid.id} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between" style={{ background: `${SKID_COLORS[i % SKID_COLORS.length]}10` }}>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: SKID_COLORS[i % SKID_COLORS.length] }} />
                  {si.skid.name}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  tone === "bad" ? "bg-rose-100 text-rose-700" : tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                }`}>{si.status}</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Avg TMP</div>
                  <div className="text-base font-bold text-slate-900">{fmt(si.tmp.avg, 3)} <span className="text-[10px] text-slate-400">bar</span></div>
                </div>
                <div>
                  <div className="text-slate-500">Peak TMP</div>
                  <div className="text-base font-bold text-slate-900">{fmt(si.tmp.max, 3)} <span className="text-[10px] text-slate-400">bar</span></div>
                </div>
                <div>
                  <div className="text-slate-500">Fouling Rate</div>
                  <div className={`text-base font-bold ${frMbar != null && frMbar > 20 ? "text-rose-700" : frMbar != null && frMbar > 10 ? "text-amber-700" : "text-slate-900"}`}>
                    {frMbar != null ? `${frMbar > 0 ? "+" : ""}${frMbar.toFixed(0)}` : "—"} <span className="text-[10px] text-slate-400">mbar/d</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">BW Ratio</div>
                  <div className="text-base font-bold text-slate-900">{si.bwRatio != null ? `${(si.bwRatio * 100).toFixed(1)}%` : "—"}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-amber-700">Warn hours: <strong>{fmt(si.tmp.hoursWarn, 1)}</strong></span>
                    <span className="text-rose-700">Critical hours: <strong>{fmt(si.tmp.hoursCrit, 1)}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Skid balancing ──────────────────────────────────────────────────────
function SkidBalancingSection({ insights, plant }: { insights: Insights; plant: PlantSchema }) {
  return (
    <SectionCard icon={Layers} title="Skid Load Balancing" subtitle="Average flow per skid and contribution to total plant flow" accent="sky">
      <div className="space-y-3">
        {insights.skids.map((si, i) => (
          <div key={si.skid.id}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: SKID_COLORS[i % SKID_COLORS.length] }} />
                {si.skid.name}
              </span>
              <span className="text-slate-500">
                <span className="font-bold text-slate-900">{fmt(si.flow.avg, 2)}</span> m³/h avg ·
                <span className="ml-1.5">peak {fmt(si.flow.max, 2)}</span> ·
                {si.share != null && <span className="ml-1.5 font-bold text-slate-900">{si.share.toFixed(1)}% share</span>}
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${si.share ?? 0}%`, background: SKID_COLORS[i % SKID_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
        <StatBox label="Plant Avg Flow" value={fmt(insights.skidTotalsAvgFlow, 2)} unit="m³/h" />
        <StatBox label="Backwash Total" value={fmtInt(insights.bw.total)} unit="m³" />
        <StatBox label="BW / Production" value={insights.bw.ratio != null ? `${(insights.bw.ratio * 100).toFixed(1)}%` : "—"}
          tone={insights.bw.ratio == null ? "default" : insights.bw.ratio < 0.05 ? "good" : insights.bw.ratio < 0.10 ? "default" : "warn"} />
        <StatBox label="Skids Active" value={`${insights.skids.filter(s => s.flow.avg && s.flow.avg > 0).length}/${plant.skids.length}`} />
      </div>
    </SectionCard>
  );
}

// ── Feed quality ────────────────────────────────────────────────────────
function FeedQualitySection({ insights, opsRows, plant }: { insights: Insights; opsRows: SeriesRow[]; plant: PlantSchema }) {
  const chartData = opsRows.map(r => ({
    time: fmtDateTime(r.bucket as string),
    pH: plant.feed.ph ? num(r[plant.feed.ph]) : null,
    DO: plant.bio.do ? num(r[plant.bio.do]) : null,
    Feed: plant.feed.flow ? num(r[plant.feed.flow]) : null,
  }));

  const hasFeedData = plant.feed.flow || plant.feed.ph || plant.bio.do;
  if (!hasFeedData) return null;

  return (
    <SectionCard icon={Beaker} title="Feed & Bioreactor Quality" subtitle="pH, dissolved oxygen, and feed flow stability" accent="amber">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatBox label="Avg Feed Flow" value={fmt(insights.feed.avgFlow, 2)} unit="m³/h" sub={insights.feed.flowCV != null ? `CV ${insights.feed.flowCV.toFixed(1)}%` : undefined} />
        <StatBox label="Avg pH" value={fmt(insights.feed.avgPh, 2)}
          tone={insights.feed.avgPh == null ? "default" : insights.feed.avgPh >= 6.5 && insights.feed.avgPh <= 8.5 ? "good" : "warn"}
          sub={insights.feed.phOOSHours > 0 ? `${fmt(insights.feed.phOOSHours, 1)} h out-of-spec` : "in spec"} />
        <StatBox label="Avg DO" value={fmt(insights.feed.avgDO, 2)} unit="mg/L"
          tone={insights.feed.avgDO == null ? "default" : insights.feed.avgDO >= 2 ? "good" : insights.feed.avgDO >= 1.5 ? "default" : "warn"}
          sub={insights.feed.doLowHours > 0 ? `${fmt(insights.feed.doLowHours, 1)} h below 1.5` : undefined} />
        <StatBox label="Feed Volume" value={fmtInt(insights.feed.totalIn)} unit="m³" />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plant.feed.ph && (
            <div className="h-48">
              <div className="text-xs font-bold text-slate-700 mb-1">pH (target 6.5–8.5)</div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[5.5, 9.5]} />
                  <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={6.5} stroke="#f59e0b" strokeDasharray="3 3" />
                  <ReferenceLine y={8.5} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="pH" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {plant.bio.do && (
            <div className="h-48">
              <div className="text-xs font-bold text-slate-700 mb-1">Dissolved Oxygen (mg/L)</div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="DO" stroke="#10b981" fill="#d1fae5" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Anomalies ──────────────────────────────────────────────────────────
function AnomaliesSection({ insights }: { insights: Insights }) {
  const events = insights.anomalies;
  return (
    <SectionCard icon={AlertTriangle} title="Operating Anomalies & Threshold Breaches" subtitle={`${events.length} event${events.length === 1 ? "" : "s"} flagged in the period`} accent="amber">
      {events.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          No anomalies detected — all monitored parameters within normal operating bands.
        </div>
      ) : (
        <div className="overflow-auto -mx-2 max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-2 py-2 font-bold">Severity</th>
                <th className="px-2 py-2 font-bold">Time</th>
                <th className="px-2 py-2 font-bold">Scope</th>
                <th className="px-2 py-2 font-bold">Metric</th>
                <th className="px-2 py-2 font-bold">Reading</th>
                <th className="px-2 py-2 font-bold">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 50).map((e, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      e.severity === "critical" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {e.severity === "critical" ? <ShieldAlert className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{fmtDateTime(e.time)}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">{e.scope}</td>
                  <td className="px-2 py-2 text-slate-700">{e.metric}</td>
                  <td className="px-2 py-2 font-bold text-slate-900">{fmt(e.value, 3)}</td>
                  <td className="px-2 py-2 text-slate-500">{e.threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length > 50 && (
            <div className="text-center text-xs text-slate-400 py-2">+ {events.length - 50} more events</div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Detailed metrics table ─────────────────────────────────────────────
function DetailedMetricsTable({ insights }: { insights: Insights; plant: PlantSchema }) {
  return (
    <SectionCard icon={Layers} title="Per-Skid Statistical Summary" subtitle="Aggregate readings for the reporting period" accent="slate">
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="px-3 py-2 font-bold">Skid</th>
              <th className="px-3 py-2 font-bold text-right">Flow Avg</th>
              <th className="px-3 py-2 font-bold text-right">Flow Peak</th>
              <th className="px-3 py-2 font-bold text-right">Flow CV</th>
              <th className="px-3 py-2 font-bold text-right">TMP Avg</th>
              <th className="px-3 py-2 font-bold text-right">TMP Peak</th>
              <th className="px-3 py-2 font-bold text-right">Pressure Avg</th>
              <th className="px-3 py-2 font-bold text-right">Level Avg</th>
              <th className="px-3 py-2 font-bold text-right">Production</th>
              <th className="px-3 py-2 font-bold text-right">Backwash</th>
            </tr>
          </thead>
          <tbody>
            {insights.skids.map((si, i) => {
              const cv = si.flow.avg && si.flow.std != null && si.flow.avg > 0 ? (si.flow.std / si.flow.avg) * 100 : null;
              return (
                <tr key={si.skid.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: SKID_COLORS[i % SKID_COLORS.length] }} />
                    {si.skid.name}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(si.flow.avg, 2)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(si.flow.max, 2)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{cv != null ? `${cv.toFixed(1)}%` : "—"}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${si.tmp.avg != null && si.tmp.avg > 0.30 ? "text-amber-700" : "text-slate-700"}`}>{fmt(si.tmp.avg, 3)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${si.tmp.max != null && si.tmp.max > 0.45 ? "text-rose-700" : si.tmp.max != null && si.tmp.max > 0.30 ? "text-amber-700" : "text-slate-700"}`}>{fmt(si.tmp.max, 3)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(si.pressure.avg, 2)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(si.level.avg, 1)}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">{fmtInt(si.productionTotal)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtInt(si.bwTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Recommendations ────────────────────────────────────────────────────
function Recommendations({ insights }: { insights: Insights }) {
  const recs: { tone: "warn" | "bad" | "info"; title: string; body: string }[] = [];

  insights.skids.forEach(si => {
    if (si.tmp.hoursCrit > 0) {
      recs.push({
        tone: "bad",
        title: `${si.skid.name}: Schedule a CIP cycle`,
        body: `TMP exceeded 0.45 bar for ${fmt(si.tmp.hoursCrit, 1)} hours. Plan a Clean-In-Place to recover permeability and avoid permanent fouling.`,
      });
    } else if (si.tmp.foulingRate != null && si.tmp.foulingRate * 1000 > 20) {
      recs.push({
        tone: "warn",
        title: `${si.skid.name}: Increase backwash frequency`,
        body: `Fouling rate is ${(si.tmp.foulingRate * 1000).toFixed(0)} mbar/day — increase BW frequency or duration before TMP crosses critical.`,
      });
    }
    if (si.bwRatio != null && si.bwRatio > 0.10) {
      recs.push({
        tone: "warn",
        title: `${si.skid.name}: Backwash consumption high`,
        body: `Backwash uses ${(si.bwRatio * 100).toFixed(1)}% of permeate — review BW timing and air-scour effectiveness.`,
      });
    }
  });

  const flowShares = insights.skids.filter(s => s.share != null).map(s => s.share!);
  if (flowShares.length >= 2 && Math.max(...flowShares) - Math.min(...flowShares) > 15) {
    const heavy = insights.skids.find(s => s.share === Math.max(...flowShares))!;
    const light = insights.skids.find(s => s.share === Math.min(...flowShares))!;
    recs.push({
      tone: "warn",
      title: "Rebalance skid loading",
      body: `${heavy.skid.name} is doing ${heavy.share!.toFixed(0)}% of flow vs ${light.skid.name} at ${light.share!.toFixed(0)}%. Adjust valve setpoints or check for blockages on the lighter skid.`,
    });
  }

  if (insights.recovery != null && insights.recovery < 75) {
    recs.push({
      tone: "warn",
      title: "Investigate low recovery",
      body: `Recovery of ${insights.recovery.toFixed(1)}% is below typical MBR target of 90%+. Verify feed totalizer accuracy and check for reject/leak losses.`,
    });
  }
  if (insights.feed.phOOSHours > 4) {
    recs.push({
      tone: "warn",
      title: "Check pH dosing system",
      body: `Feed pH was outside 6.5–8.5 for ${fmt(insights.feed.phOOSHours, 1)} hours. Inspect dosing pumps and chemical inventory.`,
    });
  }
  if (insights.feed.doLowHours > 4) {
    recs.push({
      tone: "warn",
      title: "Verify aeration system",
      body: `DO dropped below 1.5 mg/L for ${fmt(insights.feed.doLowHours, 1)} hours — risk of poor biological treatment. Check blowers and diffusers.`,
    });
  }

  if (!recs.length) {
    recs.push({ tone: "info", title: "All systems nominal", body: "No corrective action recommended for this reporting period. Continue routine monitoring." });
  }

  const tones: Record<string, string> = {
    bad: "border-rose-200 bg-rose-50/40",
    warn: "border-amber-200 bg-amber-50/40",
    info: "border-emerald-200 bg-emerald-50/40",
  };
  const ti: Record<string, string> = { bad: "text-rose-700", warn: "text-amber-700", info: "text-emerald-700" };

  return (
    <SectionCard icon={Lightbulb} title="Recommendations" subtitle="Suggested operator actions based on this period's data" accent="amber">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.map((r, i) => (
          <div key={i} className={`p-4 rounded-xl border ${tones[r.tone]}`}>
            <div className="flex items-start gap-2.5">
              <ArrowRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ti[r.tone]}`} />
              <div>
                <div className={`text-sm font-bold ${ti[r.tone]}`}>{r.title}</div>
                <div className="text-xs text-slate-700 mt-1 leading-relaxed">{r.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
