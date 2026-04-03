import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Clock, Activity, Droplets,
  Gauge, ThermometerSun, FlaskConical, BarChart3, Timer,
  AlertTriangle, CheckCircle2, ChevronDown, Wifi, WifiOff,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "");

interface RoData {
  ro_1st_reco: number; ro_1st_stg_dp: number; ro_1st_stg_fm: number;
  ro_1st_stg_in: number; ro_1st_stg_out: number;
  ro_2nd_reco: number; ro_2nd_stg_dp: number; ro_2nd_stg_fm: number;
  ro_2nd_stg_in: number; ro_2nd_stg_out: number;
  ro_3rd_reco: number; ro_3rd_stg_dp: number; ro_3rd_stg_fm: number;
  ro_3rd_stg_in: number; ro_3rd_stg_out: number;
  ro_4th_reco: number; ro_4th_stg_dp: number; ro_4th_stg_fm: number;
  ro_4th_stg_in: number; ro_4th_stg_out: number;
  ro_feed: number; ro_feed_lt: number; ro_feed_ph: number;
  ro_feed_tot_fm: number; ro_reco: number; ro_running_time: string;
  ro_stg1_tot_fm: number; ro_stg2_tot_fm: number;
  ro_stg3_tot_fm: number; ro_stg4_tot_fm: number;
  timestamp: string;
}
interface ApiResponse {
  data: RoData;
  last_update: string;
  status: string;
  timing: { api_response_time_ms: number; data_age_seconds: number; plc_read_time_ms: number };
}

function statusColor(v: number, good: [number, number], warn: [number, number]) {
  if (v >= good[0] && v <= good[1]) return "text-emerald-600";
  if (v >= warn[0] && v <= warn[1]) return "text-amber-500";
  return "text-red-500";
}
function statusBg(v: number, good: [number, number], warn: [number, number]) {
  if (v >= good[0] && v <= good[1]) return "bg-emerald-50 border-emerald-200";
  if (v >= warn[0] && v <= warn[1]) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function Metric({ label, value, unit, icon: Icon, good, warn, large }: {
  label: string; value: number | string; unit?: string;
  icon?: React.ElementType; good?: [number, number]; warn?: [number, number]; large?: boolean;
}) {
  const numVal = typeof value === "number" ? value : null;
  const colorClass = (numVal !== null && good && warn) ? statusColor(numVal, good, warn) : "text-gray-800";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none">{label}</span>
      <div className="flex items-baseline gap-1">
        {Icon && <Icon className={`w-3 h-3 ${colorClass} shrink-0`} />}
        <span className={`font-black tabular-nums leading-none ${large ? "text-2xl" : "text-base"} ${colorClass}`}>
          {typeof value === "number" ? value.toFixed(value >= 1000 ? 0 : 1) : value}
        </span>
        {unit && <span className="text-[10px] text-gray-400 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function RecoveryBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const col = pct >= 75 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${col}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StageCard({ stage, stageNum, data }: {
  stage: string; stageNum: number;
  data: { reco: number; dp: number; fm: number; stg_in: number; stg_out: number; tot_fm: number };
}) {
  const gradients = [
    "from-blue-600 to-blue-700",
    "from-indigo-600 to-indigo-700",
    "from-violet-600 to-violet-700",
    "from-purple-600 to-purple-700",
  ];
  const ringColors = ["ring-blue-200", "ring-indigo-200", "ring-violet-200", "ring-purple-200"];
  const recoColor = data.reco >= 75 ? "text-emerald-400" : data.reco >= 55 ? "text-amber-400" : "text-red-400";
  const dpColor = data.dp <= 1.5 ? "text-emerald-400" : data.dp <= 3 ? "text-amber-400" : "text-red-400";

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ring-1 ${ringColors[stageNum - 1]}`}>
      {/* Stage header */}
      <div className={`bg-gradient-to-br ${gradients[stageNum - 1]} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Stage {stageNum}</p>
            <p className="text-sm font-black text-white">{stage}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black tabular-nums ${recoColor}`}>{data.reco.toFixed(1)}<span className="text-xs font-bold text-white/50 ml-0.5">%</span></p>
            <p className="text-[9px] text-white/60 font-semibold uppercase">Recovery</p>
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${recoColor.replace("text-", "bg-")}`}
            style={{ width: `${Math.min(100, data.reco)}%`, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-3 space-y-2.5">
        {/* DP + FM */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-2 border ${data.dp <= 1.5 ? "bg-emerald-50 border-emerald-100" : data.dp <= 3 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Diff. Pressure</p>
            <p className={`text-base font-black tabular-nums ${dpColor}`}>{data.dp.toFixed(1)}</p>
            <p className="text-[9px] text-gray-400">bar</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Flow Rate</p>
            <p className="text-base font-black tabular-nums text-blue-700">{data.fm.toFixed(1)}</p>
            <p className="text-[9px] text-gray-400">m³/h</p>
          </div>
        </div>

        {/* Conductivity */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Conductivity</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">In</p>
              <p className="text-sm font-black tabular-nums text-gray-700">{data.stg_in.toFixed(1)}</p>
              <p className="text-[9px] text-gray-400">mS/cm</p>
            </div>
            <div className="flex-1 mx-2 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-gray-300" />
                <ChevronDown className="w-2.5 h-2.5 text-gray-400 rotate-[-90deg] shrink-0" />
                <div className="flex-1 h-px bg-gray-300" />
              </div>
              <span className="text-[8px] text-gray-300 uppercase tracking-wide">reject</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Out</p>
              <p className="text-sm font-black tabular-nums text-gray-700">{data.stg_out.toFixed(1)}</p>
              <p className="text-[9px] text-gray-400">mS/cm</p>
            </div>
          </div>
        </div>

        {/* Total flow */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Cumulative Flow</span>
          <span className="text-xs font-black text-gray-700 tabular-nums">{data.tot_fm.toLocaleString("en-IN", { maximumFractionDigits: 0 })} m³</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, icon: Icon, color, bg }: {
  label: string; value: string | number; unit?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${bg}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-gray-900 tabular-nums leading-none">
            {typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : value}
          </span>
          {unit && <span className="text-xs text-gray-400 font-medium">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export default function SiteData() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/kanchan/ro-stream`);
    esRef.current = es;
    setStreaming(false);

    es.addEventListener("data", (e: MessageEvent) => {
      try {
        const json: ApiResponse = JSON.parse(e.data);
        setApiData(json);
        setError(null);
        setLastFetched(new Date());
        setLoading(false);
        setStreaming(true);
      } catch {
        setError("Parse error");
      }
    });

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        setError(parsed.error || "Stream error");
      } catch {
        // connection-level error – SSE will auto-reconnect
        setError("Connection lost — reconnecting…");
        setStreaming(false);
      }
    });

    es.onerror = () => {
      setStreaming(false);
      setError("Connection lost — reconnecting…");
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const d = apiData?.data;
  const ageSeconds = apiData?.timing?.data_age_seconds ?? 9999;

  // Connection status is based on whether we can reach our proxy, not the PLC age
  // data_age_seconds reflects PLC-to-API lag; we show it as info only
  const isConnected = !!apiData && !error;
  const isLive = isConnected && ageSeconds < 300;
  const isStale = isConnected && ageSeconds >= 300;

  const statusLabel = !isConnected ? "Offline" : isStale ? "Stale PLC" : "Live";
  const statusDot = !isConnected ? "bg-red-500" : isStale ? "bg-amber-400" : "bg-emerald-500";
  const statusText = !isConnected ? "text-red-600" : isStale ? "text-amber-600" : "text-emerald-600";
  const statusBorder = !isConnected ? "border-red-200 bg-red-50" : isStale ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";

  const stages = d ? [
    { stage: "1st Pass", stageNum: 1, data: { reco: d.ro_1st_reco, dp: d.ro_1st_stg_dp, fm: d.ro_1st_stg_fm, stg_in: d.ro_1st_stg_in, stg_out: d.ro_1st_stg_out, tot_fm: d.ro_stg1_tot_fm } },
    { stage: "2nd Pass", stageNum: 2, data: { reco: d.ro_2nd_reco, dp: d.ro_2nd_stg_dp, fm: d.ro_2nd_stg_fm, stg_in: d.ro_2nd_stg_in, stg_out: d.ro_2nd_stg_out, tot_fm: d.ro_stg2_tot_fm } },
    { stage: "3rd Pass", stageNum: 3, data: { reco: d.ro_3rd_reco, dp: d.ro_3rd_stg_dp, fm: d.ro_3rd_stg_fm, stg_in: d.ro_3rd_stg_in, stg_out: d.ro_3rd_stg_out, tot_fm: d.ro_stg3_tot_fm } },
    { stage: "4th Pass", stageNum: 4, data: { reco: d.ro_4th_reco, dp: d.ro_4th_stg_dp, fm: d.ro_4th_stg_fm, stg_in: d.ro_4th_stg_in, stg_out: d.ro_4th_stg_out, tot_fm: d.ro_stg4_tot_fm } },
  ] : [];

  const phColor = d ? (d.ro_feed_ph >= 6.5 && d.ro_feed_ph <= 8.5 ? "text-emerald-600" : d.ro_feed_ph >= 6.0 && d.ro_feed_ph <= 9.0 ? "text-amber-500" : "text-red-500") : "text-gray-400";
  const phBg = d ? (d.ro_feed_ph >= 6.5 && d.ro_feed_ph <= 8.5 ? "bg-emerald-50 border-emerald-200" : d.ro_feed_ph >= 6.0 && d.ro_feed_ph <= 9.0 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200") : "bg-gray-50 border-gray-200";
  const overallRecoColor = d ? (d.ro_reco >= 90 ? "text-emerald-600" : d.ro_reco >= 75 ? "text-amber-500" : "text-red-500") : "text-gray-400";

  return (
    <Layout>
      <div className="h-full bg-gray-50 flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest">WTT International</span>
              <span className="text-gray-300 text-sm">•</span>
              <span className="text-sm font-bold text-blue-700">Kanchan Plant</span>
              <span className="text-gray-300 text-sm">•</span>
              <span className="text-sm font-semibold text-gray-500">RO System</span>
            </div>
            {lastFetched && (
              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-px">
                <Clock className="w-2.5 h-2.5" />
                PLC: {apiData?.last_update} &nbsp;|&nbsp; Fetched: {lastFetched.toLocaleTimeString()}
                {apiData && <>&nbsp;|&nbsp; Data age: {ageSeconds}s</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusBorder}`}>
              <div className={`w-2 h-2 rounded-full ${statusDot} ${streaming ? "animate-pulse" : ""}`} />
              <span className={statusText}>{statusLabel}</span>
            </div>
            {/* Live stream indicator */}
            {streaming ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200">
                <Wifi className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
                <WifiOff className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400">CONNECTING</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Error bar ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-2 flex items-center gap-2 text-xs text-red-600 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Connection error: {error} — reconnecting automatically.</span>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {loading && !apiData ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Connecting to PLC…</p>
            </div>
          ) : d ? (<>

            {/* ── KPI row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`rounded-2xl border p-4 flex items-center gap-3 bg-white`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overallRecoColor.replace("text-", "bg-").replace("-600", "-600").replace("-500", "-500")} bg-opacity-10`}>
                  <Activity className={`w-5 h-5 ${overallRecoColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Overall Recovery</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black tabular-nums ${overallRecoColor}`}>{d.ro_reco.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <RecoveryBar value={d.ro_reco} />
                </div>
              </div>
              <KpiCard label="Running Time" value={d.ro_running_time} icon={Timer}
                color="bg-blue-600" bg="bg-white border-gray-100" />
              <KpiCard label="Feed Flow Rate" value={d.ro_feed} unit="m³/h" icon={Gauge}
                color="bg-indigo-600" bg="bg-white border-gray-100" />
              <KpiCard label="Total Feed Volume" value={d.ro_feed_tot_fm.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unit="m³" icon={BarChart3}
                color="bg-violet-600" bg="bg-white border-gray-100" />
            </div>

            {/* ── Stage cards ───────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded-full bg-blue-600" />
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">RO Stages</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] text-gray-400 font-semibold">4-Pass System</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {stages.map(s => <StageCard key={s.stageNum} {...s} />)}
              </div>
            </div>

            {/* ── Feed Conditions ───────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded-full bg-teal-600" />
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Feed Conditions</h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* pH */}
                <div className={`rounded-2xl border p-4 ${phBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className={`w-4 h-4 ${phColor}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feed pH</span>
                  </div>
                  <p className={`text-3xl font-black tabular-nums ${phColor}`}>{d.ro_feed_ph.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {d.ro_feed_ph >= 6.5 && d.ro_feed_ph <= 8.5 ? "✓ Normal range" :
                     d.ro_feed_ph < 6.5 ? "⚠ Below range" : "⚠ Above range"}
                  </p>
                </div>

                {/* Level */}
                <div className={`rounded-2xl border p-4 ${d.ro_feed_lt >= 2 ? "bg-emerald-50 border-emerald-200" : d.ro_feed_lt >= 1 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ThermometerSun className={`w-4 h-4 ${d.ro_feed_lt >= 2 ? "text-emerald-600" : d.ro_feed_lt >= 1 ? "text-amber-500" : "text-red-500"}`} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feed Level</span>
                  </div>
                  <p className={`text-3xl font-black tabular-nums ${d.ro_feed_lt >= 2 ? "text-emerald-600" : d.ro_feed_lt >= 1 ? "text-amber-500" : "text-red-500"}`}>
                    {d.ro_feed_lt.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">metres</p>
                </div>

                {/* Feed Flow */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Feed Flow</span>
                  </div>
                  <p className="text-3xl font-black tabular-nums text-blue-700">{d.ro_feed.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">m³ / hour</p>
                </div>

                {/* Total volume */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Feed</span>
                  </div>
                  <p className="text-3xl font-black tabular-nums text-indigo-700">
                    {(d.ro_feed_tot_fm / 1000).toFixed(1)}<span className="text-base font-bold text-indigo-400 ml-1">k</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">m³ cumulative</p>
                </div>
              </div>
            </div>

            {/* ── Summary health row ────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">System Health Summary</h3>
                <span className="ml-auto text-[10px] text-gray-400">{d.timestamp}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                {stages.map(s => (
                  <div key={s.stageNum} className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Stage {s.stageNum}</p>
                    <div className="flex justify-center gap-1">
                      {/* Recovery indicator */}
                      <div className={`w-2 h-2 rounded-full ${s.data.reco >= 75 ? "bg-emerald-500" : s.data.reco >= 55 ? "bg-amber-400" : "bg-red-500"}`} title={`Recovery ${s.data.reco}%`} />
                      {/* DP indicator */}
                      <div className={`w-2 h-2 rounded-full ${s.data.dp <= 1.5 ? "bg-emerald-500" : s.data.dp <= 3 ? "bg-amber-400" : "bg-red-500"}`} title={`DP ${s.data.dp} bar`} />
                    </div>
                    <p className="text-[9px] text-gray-300">Reco · DP</p>
                  </div>
                ))}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Feed pH</p>
                  <div className="flex justify-center">
                    <div className={`w-2 h-2 rounded-full ${phColor.replace("text-", "bg-")}`} />
                  </div>
                  <p className="text-[9px] text-gray-300">{d.ro_feed_ph.toFixed(1)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Overall</p>
                  <div className="flex justify-center">
                    <div className={`w-2 h-2 rounded-full ${overallRecoColor.replace("text-", "bg-")}`} />
                  </div>
                  <p className="text-[9px] text-gray-300">{d.ro_reco.toFixed(1)}%</p>
                </div>
              </div>
            </div>

          </>) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <WifiOff className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-400 font-medium">No data received yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
