import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Activity, Wifi, WifiOff, Radio, AlertTriangle, CheckCircle2 } from "lucide-react";

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

// System types and their display config
const SYSTEM_ORDER = [
  "Biological",
  "CTS",
  "MBR",
  "Main RO",
  "RO",
  "Reject RO",
  "UF",
  "DEC",
  "SF",
  "NF",
];

const SYSTEM_STYLE: Record<string, { bg: string; border: string; header: string; badge: string; dot: string }> = {
  "Biological": {
    bg: "bg-emerald-950/40",
    border: "border-emerald-700/40",
    header: "bg-emerald-900/50 text-emerald-300",
    badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
    dot: "bg-emerald-400",
  },
  "CTS": {
    bg: "bg-sky-950/40",
    border: "border-sky-700/40",
    header: "bg-sky-900/50 text-sky-300",
    badge: "bg-sky-500/20 border-sky-500/40 text-sky-400",
    dot: "bg-sky-400",
  },
  "MBR": {
    bg: "bg-violet-950/40",
    border: "border-violet-700/40",
    header: "bg-violet-900/50 text-violet-300",
    badge: "bg-violet-500/20 border-violet-500/40 text-violet-400",
    dot: "bg-violet-400",
  },
  "RO": {
    bg: "bg-blue-950/40",
    border: "border-blue-700/40",
    header: "bg-blue-900/50 text-blue-300",
    badge: "bg-blue-500/20 border-blue-500/40 text-blue-400",
    dot: "bg-blue-400",
  },
  "Main RO": {
    bg: "bg-blue-950/40",
    border: "border-blue-700/40",
    header: "bg-blue-900/50 text-blue-300",
    badge: "bg-blue-500/20 border-blue-500/40 text-blue-400",
    dot: "bg-blue-400",
  },
  "Reject RO": {
    bg: "bg-orange-950/40",
    border: "border-orange-700/40",
    header: "bg-orange-900/50 text-orange-300",
    badge: "bg-orange-500/20 border-orange-500/40 text-orange-400",
    dot: "bg-orange-400",
  },
  "UF": {
    bg: "bg-cyan-950/40",
    border: "border-cyan-700/40",
    header: "bg-cyan-900/50 text-cyan-300",
    badge: "bg-cyan-500/20 border-cyan-500/40 text-cyan-400",
    dot: "bg-cyan-400",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-slate-900/40",
  border: "border-slate-700/40",
  header: "bg-slate-800/50 text-slate-300",
  badge: "bg-slate-500/20 border-slate-500/40 text-slate-400",
  dot: "bg-slate-400",
};

function getStyle(system: string) {
  return SYSTEM_STYLE[system] ?? DEFAULT_STYLE;
}

function tagStatus(tag: TagDef, v: TagValue | undefined): TagValue["status"] {
  return v?.status ?? "offline";
}

function StatusDot({ status }: { status: TagValue["status"] }) {
  if (status === "good")    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />;
  if (status === "alarm")   return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />;
  if (status === "offline") return <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />;
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />;
}

// Collect all unique system names in order
function getSystemNames(sites: SiteDef[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  // First add in preferred order
  for (const sys of SYSTEM_ORDER) {
    for (const site of sites) {
      for (const sec of site.sections) {
        if ((sec.title ?? "") === sys && !seen.has(sys)) {
          seen.add(sys);
          result.push(sys);
        }
      }
    }
  }
  // Then add any remaining
  for (const site of sites) {
    for (const sec of site.sections) {
      const t = sec.title ?? "(General)";
      if (!seen.has(t)) {
        seen.add(t);
        result.push(t);
      }
    }
  }
  return result;
}

// For a given system name, return [{site, section}] pairs
function getSitesBySystem(systemName: string, sites: SiteDef[]): { site: SiteDef; section: SectionDef }[] {
  const result: { site: SiteDef; section: SectionDef }[] = [];
  for (const site of sites) {
    for (const sec of site.sections) {
      if ((sec.title ?? "(General)") === systemName) {
        result.push({ site, section: sec });
      }
    }
  }
  return result;
}

function SiteColumn({
  site,
  section,
  values,
}: {
  site: SiteDef;
  section: SectionDef;
  values: ValuesMap;
}) {
  const hasAlarm = section.tags.some(t => values[t.id]?.status === "alarm");
  const hasData = section.tags.some(t => values[t.id] && values[t.id].status !== "offline");

  return (
    <div
      className={[
        "min-w-[140px] max-w-[180px] flex-1 rounded-lg border",
        hasAlarm ? "border-red-500/50 bg-red-950/20" : "border-slate-700/40 bg-slate-800/30",
      ].join(" ")}
    >
      {/* Site name */}
      <div className={[
        "px-2 py-1.5 border-b text-[10px] font-bold tracking-wider truncate flex items-center gap-1.5",
        hasAlarm ? "border-red-700/40 text-red-300" : "border-slate-700/40 text-slate-300",
      ].join(" ")}>
        {hasAlarm ? (
          <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
        ) : hasData ? (
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0 inline-block" />
        )}
        <span className="truncate">{site.name}</span>
      </div>

      {/* Tags */}
      <div className="p-2 flex flex-col gap-1">
        {section.tags.map(tag => {
          const v = values[tag.id];
          const val = v?.value;
          const status = tagStatus(tag, v);
          const displayVal = val !== null && val !== undefined
            ? val.toFixed(tag.decimals ?? 1)
            : "—";
          return (
            <div key={tag.id} className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0 shrink">
                <StatusDot status={status} />
                <span className="text-[9px] text-slate-500 truncate">{tag.label}</span>
              </div>
              <span className={[
                "text-[10px] font-mono font-bold shrink-0",
                status === "alarm"   ? "text-red-300" :
                status === "good"    ? "text-emerald-300" :
                status === "offline" ? "text-slate-600" :
                                       "text-slate-200",
              ].join(" ")}>
                {displayVal}
                {tag.unit && val !== null && val !== undefined
                  ? <span className="text-[8px] text-slate-500 ml-0.5">{tag.unit}</span>
                  : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemRow({
  systemName,
  entries,
  values,
}: {
  systemName: string;
  entries: { site: SiteDef; section: SectionDef }[];
  values: ValuesMap;
}) {
  const style = getStyle(systemName);
  const alarmCount = entries.filter(({ section }) =>
    section.tags.some(t => values[t.id]?.status === "alarm")
  ).length;

  return (
    <div className={`rounded-xl border ${style.border} overflow-hidden`}>
      {/* System header */}
      <div className={`flex items-center gap-2 px-4 py-2 ${style.header}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <span className="text-xs font-black uppercase tracking-widest">{systemName}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${style.badge}`}>
          {entries.length} site{entries.length !== 1 ? "s" : ""}
        </span>
        {alarmCount > 0 && (
          <span className="ml-auto text-[9px] font-bold text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            {alarmCount} alarm
          </span>
        )}
      </div>

      {/* Site columns */}
      <div className={`flex gap-2 p-2 overflow-x-auto ${style.bg}`}>
        {entries.map(({ site, section }) => (
          <SiteColumn
            key={`${site.id}-${section.title}`}
            site={site}
            section={section}
            values={values}
          />
        ))}
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

  useEffect(() => {
    fetch(`${BASE}/api/site-data/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.sites) setSites(data.sites); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${BASE}/api/site-data/stream`);

    es.addEventListener("values", (e) => {
      try {
        const data = JSON.parse(e.data);
        setValues(data.values ?? {});
        setIsSimulated(data.isSimulated ?? true);
        setPushCount(c => c + 1);
        lastPushAt.current = Date.now();
        setSecAgo(0);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
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

  const systemNames = getSystemNames(sites);
  const totalAlarms = sites.reduce((acc, site) =>
    acc + site.sections.reduce((a, sec) =>
      a + sec.tags.filter(t => values[t.id]?.status === "alarm").length, 0), 0);

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="border-b border-slate-800 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-black text-white tracking-wide">System Overview</span>
              {isSimulated && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 uppercase tracking-widest">
                  Simulated
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              {connected ? (
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className={connected ? "text-cyan-400 font-semibold" : "text-slate-500"}>
                {connected ? "LIVE" : "Connecting…"}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">#{pushCount}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{secAgo}s ago</span>
              {totalAlarms > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {totalAlarms} alarms
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Systems */}
        <div className={`flex-1 overflow-y-auto p-3 flex flex-col gap-3 transition-colors duration-200 ${flash ? "bg-cyan-950/10" : ""}`}>
          {sites.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Loading site configuration…
            </div>
          ) : (
            systemNames.map(sysName => {
              const entries = getSitesBySystem(sysName, sites);
              if (entries.length === 0) return null;
              return (
                <SystemRow
                  key={sysName}
                  systemName={sysName}
                  entries={entries}
                  values={values}
                />
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
