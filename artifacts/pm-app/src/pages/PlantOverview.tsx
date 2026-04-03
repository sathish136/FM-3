import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Activity, Wifi, WifiOff, Radio, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TagDef {
  id: string;
  label: string;
  unit?: string;
  decimals?: number;
  alarmLow?: number;
  alarmHigh?: number;
  goodLow?: number;
  goodHigh?: number;
}

interface SectionDef {
  title?: string;
  tags: TagDef[];
}

interface SiteDef {
  id: string;
  name: string;
  sections: SectionDef[];
}

interface TagValue {
  value: number | null;
  timestamp: number;
  source: string;
  status: "normal" | "good" | "alarm" | "offline";
}

type ValuesMap = Record<string, TagValue>;

const SECTION_COLORS: Record<string, string> = {
  "Biological": "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  "CTS":        "text-sky-400    border-sky-500/40    bg-sky-500/10",
  "MBR":        "text-violet-400 border-violet-500/40 bg-violet-500/10",
  "RO":         "text-blue-400   border-blue-500/40   bg-blue-500/10",
  "Reject RO":  "text-orange-400 border-orange-500/40 bg-orange-500/10",
  "UF":         "text-cyan-400   border-cyan-500/40   bg-cyan-500/10",
  "Main RO":    "text-blue-400   border-blue-500/40   bg-blue-500/10",
};

const DEFAULT_SECTION_COLOR = "text-slate-400 border-slate-500/40 bg-slate-500/10";

function sectionColor(title?: string) {
  if (!title) return DEFAULT_SECTION_COLOR;
  return SECTION_COLORS[title] ?? DEFAULT_SECTION_COLOR;
}

function StatusDot({ status }: { status: TagValue["status"] }) {
  if (status === "good")    return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />;
  if (status === "alarm")   return <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />;
  if (status === "offline") return <span className="inline-block w-2 h-2 rounded-full bg-slate-600 shrink-0" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
}

function siteOverallStatus(site: SiteDef, values: ValuesMap): "good" | "alarm" | "normal" | "offline" {
  let hasValue = false;
  let hasAlarm = false;
  for (const sec of site.sections) {
    for (const tag of sec.tags) {
      const v = values[tag.id];
      if (!v || v.status === "offline") continue;
      hasValue = true;
      if (v.status === "alarm") hasAlarm = true;
    }
  }
  if (!hasValue) return "offline";
  if (hasAlarm) return "alarm";
  return "good";
}

function SiteCard({
  site,
  values,
  flash,
}: {
  site: SiteDef;
  values: ValuesMap;
  flash: boolean;
}) {
  const overall = siteOverallStatus(site, values);

  return (
    <div
      className={[
        "rounded-xl border transition-colors duration-300",
        overall === "alarm"   ? "border-red-500/50 bg-[#1a0f0f]" :
        overall === "offline" ? "border-slate-700/60 bg-[#131320]" :
                                "border-slate-700/60 bg-[#131320]",
        flash ? "ring-1 ring-cyan-500/30" : "",
      ].join(" ")}
    >
      {/* Site Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2 min-w-0">
          {overall === "alarm" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          ) : overall === "offline" ? (
            <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-semibold text-white tracking-wide truncate">{site.name}</span>
        </div>
        <span
          className={[
            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
            overall === "alarm"   ? "text-red-400    border-red-500/40    bg-red-500/15" :
            overall === "offline" ? "text-slate-500  border-slate-600/40  bg-slate-800" :
                                    "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
          ].join(" ")}
        >
          {overall === "alarm" ? "ALARM" : overall === "offline" ? "OFFLINE" : "OK"}
        </span>
      </div>

      {/* Sections */}
      <div className="p-3 flex flex-col gap-2">
        {site.sections.map((sec, si) => {
          const colorCls = sectionColor(sec.title);
          return (
            <div key={si} className={`rounded-lg border px-3 py-2 ${colorCls}`}>
              {sec.title && (
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80">
                  {sec.title}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {sec.tags.slice(0, 6).map((tag) => {
                  const v = values[tag.id];
                  const val = v?.value;
                  const displayVal = val !== null && val !== undefined
                    ? val.toFixed(tag.decimals ?? 1)
                    : "—";
                  return (
                    <div key={tag.id} className="flex items-center gap-1.5 min-w-0">
                      <StatusDot status={v?.status ?? "offline"} />
                      <span className="text-[10px] text-slate-400 truncate shrink-0 max-w-[60px]">{tag.label}:</span>
                      <span className={[
                        "text-[11px] font-mono font-semibold",
                        v?.status === "alarm"   ? "text-red-300" :
                        v?.status === "good"    ? "text-emerald-300" :
                        v?.status === "offline" ? "text-slate-600" :
                                                  "text-slate-200",
                      ].join(" ")}>
                        {displayVal}
                        {tag.unit && val !== null && val !== undefined ? (
                          <span className="text-[9px] text-slate-500 ml-0.5">{tag.unit}</span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlantOverview() {
  const [sites, setSites] = useState<SiteDef[]>([]);
  const [values, setValues] = useState<ValuesMap>({});
  const [connected, setConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);
  const [pushCount, setPushCount] = useState(0);
  const [secAgo, setSecAgo] = useState(0);
  const [flash, setFlash] = useState(false);
  const lastPushAt = useRef<number>(Date.now());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/site-data/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.sites) setSites(data.sites); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${BASE}/api/site-data/stream`);
    esRef.current = es;

    es.addEventListener("values", (e) => {
      try {
        const data = JSON.parse(e.data);
        setValues(data.values ?? {});
        setIsSimulated(data.isSimulated ?? true);
        setPushCount(c => c + 1);
        lastPushAt.current = Date.now();
        setSecAgo(0);
        setFlash(true);
        setTimeout(() => setFlash(false), 400);
      } catch {}
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => { es.close(); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecAgo(Math.round((Date.now() - lastPushAt.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, []);

  const overallAlarms = sites.filter(s => siteOverallStatus(s, values) === "alarm").length;
  const overallOffline = sites.filter(s => siteOverallStatus(s, values) === "offline").length;
  const overallGood = sites.filter(s => siteOverallStatus(s, values) === "good").length;

  const overviewSiteOrder = [
    "kanchan_1_3", "rsa", "sona_etp", "sona1_reject", "sona2_reject",
    "sachin", "bhilwara", "lb_tex", "laxmi_vishal",
  ];

  const orderedSites = [
    ...overviewSiteOrder.map(id => sites.find(s => s.id === id)).filter(Boolean) as SiteDef[],
    ...sites.filter(s => !overviewSiteOrder.includes(s.id)),
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="border-b border-slate-800 px-6 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h1 className="text-lg font-bold text-white tracking-wide">Plant Overview</h1>
                {isSimulated && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 uppercase tracking-widest">
                    Simulated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All sites live · #{pushCount} frames · last push {secAgo}s ago
              </p>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                {connected ? (
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                ) : (
                  <WifiOff className="w-4 h-4 text-slate-500" />
                )}
                <span className={connected ? "text-cyan-400 font-semibold" : "text-slate-500"}>
                  {connected ? "LIVE" : "Connecting…"}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-emerald-400 font-semibold">{overallGood} OK</span>
              {overallAlarms > 0 && (
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {overallAlarms} Alarm
                </span>
              )}
              {overallOffline > 0 && (
                <span className="text-slate-500">{overallOffline} Offline</span>
              )}
            </div>
          </div>

          {/* Health bar */}
          {sites.length > 0 && (
            <div className="mt-3 flex gap-1 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(overallGood / sites.length) * 100}%` }}
              />
              {overallAlarms > 0 && (
                <div
                  className="bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${(overallAlarms / sites.length) * 100}%` }}
                />
              )}
              <div className="flex-1 bg-slate-700 rounded-full" />
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {orderedSites.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Loading site configuration…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orderedSites.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  values={values}
                  flash={flash}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
