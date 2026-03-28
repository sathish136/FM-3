import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, Settings2, X, Clock, Activity } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────
interface TagDef {
  id: string;
  label: string;
  unit?: string;
  adsTag: string;
  decimals?: number;
}
interface SectionDef {
  title?: string;
  columns?: number;
  tags: TagDef[];
}
interface SiteDef {
  id: string;
  name: string;
  sections: SectionDef[];
}
interface TagValueResult {
  value: number | null;
  timestamp: number;
  source: string;
  status: "normal" | "good" | "alarm" | "offline";
}
interface ValuesResponse {
  values: Record<string, TagValueResult>;
  isSimulated: boolean;
  updatedAt: number;
}

// ─── System column definitions ───────────────────────────────────────────────
const SYSTEMS = [
  { key: "biological", label: "Biological"  },
  { key: "cts_mbr",   label: "CTS MBR"     },
  { key: "mbr",       label: "MBR"          },
  { key: "ro",        label: "RO"           },
  { key: "reject_ro", label: "Reject RO"    },
] as const;
type SystemKey = typeof SYSTEMS[number]["key"];

function classifySection(sec: SectionDef): SystemKey {
  const title = (sec.title ?? "").toUpperCase().trim();
  if (title.includes("REJECT"))                                       return "reject_ro";
  if (title.includes("CTS"))                                          return "cts_mbr";
  if (title === "MBR" || title.includes("MBR SKID"))                 return "mbr";
  if (title.includes("MAIN RO") || (title.includes("RO") && !title.includes("REJECT"))) return "ro";
  const combined = [
    ...sec.tags.map(t => t.label.toLowerCase()),
    ...sec.tags.map(t => t.id),
  ].join(" ");
  if (
    combined.includes("bio") || combined.includes("blower") ||
    combined.includes("nt flow") || combined.includes("ntflow") ||
    combined.includes("srs") || combined.includes("do")
  ) return "biological";
  if (combined.includes("mbr") || combined.includes("tmp")) return "mbr";
  if (combined.includes("feed") || combined.includes("recov") || combined.includes("setph") || combined.includes("liveph")) return "ro";
  return "biological";
}

function siteSystemMap(site: SiteDef): Record<SystemKey, TagDef[]> {
  const map: Record<SystemKey, TagDef[]> = { biological: [], cts_mbr: [], mbr: [], ro: [], reject_ro: [] };
  for (const sec of site.sections) {
    map[classifySection(sec)].push(...sec.tags);
  }
  return map;
}

// ─── Inline tag value chip ───────────────────────────────────────────────────
function ValueChip({ tagId, decimals = 2, values }: {
  tagId: string;
  decimals?: number;
  values: Record<string, TagValueResult> | null;
}) {
  const tv = values?.[tagId];
  if (!tv || tv.value === null) {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-400 border border-gray-200 min-w-[48px]">
        ---
      </span>
    );
  }
  const cls =
    tv.status === "alarm"   ? "bg-red-100 text-red-700 border-red-300" :
    tv.status === "good"    ? "bg-green-100 text-green-700 border-green-300" :
    tv.status === "offline" ? "bg-gray-100 text-gray-400 border-gray-200" :
                              "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={cn("inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border min-w-[48px]", cls)}>
      {tv.value.toFixed(decimals)}
    </span>
  );
}

// ─── System cell — shows all tags inline, no accordion ───────────────────────
function SystemCell({ tags, values }: {
  tags: TagDef[];
  values: Record<string, TagValueResult> | null;
}) {
  if (tags.length === 0) {
    return <span className="text-gray-300 text-[11px]">—</span>;
  }

  const hasAlarm = tags.some(t => values?.[t.id]?.status === "alarm");

  return (
    <div className={cn(
      "space-y-1 rounded-lg p-2",
      hasAlarm ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50"
    )}>
      {tags.map(tag => (
        <div key={tag.id} className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] text-slate-600 leading-tight truncate flex-1">
            {tag.label}
            {tag.unit ? <span className="text-slate-400 ml-0.5">({tag.unit})</span> : null}
          </span>
          <ValueChip tagId={tag.id} decimals={tag.decimals} values={values} />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SiteData() {
  const [sites, setSites] = useState<SiteDef[]>([]);
  const [values, setValues] = useState<Record<string, TagValueResult> | null>(null);
  const [isSimulated, setIsSimulated] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/site-data/config`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json() as { sites: SiteDef[] };
      setSites(data.sites);
    } catch {
      setError("Failed to load site config. Is the API server running?");
    }
  }, []);

  const fetchValues = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/site-data/values`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json() as ValuesResponse;
      setValues(data.values);
      setIsSimulated(data.isSimulated);
      setConnected(true);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setConnected(false);
      setError("Cannot reach API server.");
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  useEffect(() => {
    fetchValues();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchValues, refreshInterval * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchValues, refreshInterval]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* ── Top header ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-gray-800 font-extrabold text-sm tracking-wider uppercase">
              WTT International — Live Site Data
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Status pill */}
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
              connected
                ? isSimulated
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-green-50 border-green-300 text-green-700"
                : "bg-red-50 border-red-300 text-red-700"
            )}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {!connected ? "Disconnected" : isSimulated ? "Simulated Data" : "Live ADS Data"}
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Clock className="w-3 h-3" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            <button
              onClick={fetchValues}
              className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-blue-600 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-blue-600 transition-colors"
              title="Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-[11px] text-red-600 flex items-center gap-2">
            <WifiOff className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* ── Simulated data notice ── */}
        {connected && isSimulated && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-[11px] text-amber-700 flex items-center gap-2">
            <span className="font-bold">DEMO MODE</span> — Showing simulated data. Connect your Beckhoff ADS bridge to see live values.
          </div>
        )}

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto p-3">
          {sites.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 text-sm animate-pulse">Loading site configuration…</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap border-r border-blue-600 sticky left-0 bg-blue-700 z-10 min-w-[150px]">
                      Site Name
                    </th>
                    {SYSTEMS.map((sys, i) => (
                      <th
                        key={sys.key}
                        className={cn(
                          "px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-center whitespace-nowrap",
                          i < SYSTEMS.length - 1 ? "border-r border-blue-600" : ""
                        )}
                      >
                        {sys.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site, rowIdx) => {
                    const sysMap = siteSystemMap(site);
                    const allTagIds = site.sections.flatMap(s => s.tags.map(t => t.id));
                    const hasAlarm = allTagIds.some(id => values?.[id]?.status === "alarm");

                    return (
                      <tr
                        key={site.id}
                        className={cn(
                          "border-b border-gray-100 align-top",
                          hasAlarm ? "bg-red-50" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        )}
                      >
                        {/* Site name */}
                        <td className={cn(
                          "px-4 py-3 border-r border-gray-100 sticky left-0 z-10",
                          hasAlarm ? "bg-red-50" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        )}>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[12px] font-bold uppercase tracking-wide whitespace-nowrap",
                              hasAlarm ? "text-red-600" : "text-blue-800"
                            )}>
                              {site.name}
                            </span>
                            {hasAlarm && (
                              <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                                ALARM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* System columns */}
                        {SYSTEMS.map((sys, i) => (
                          <td
                            key={sys.key}
                            className={cn(
                              "px-3 py-2.5",
                              i < SYSTEMS.length - 1 ? "border-r border-gray-100" : ""
                            )}
                          >
                            <SystemCell tags={sysMap[sys.key]} values={values} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Settings modal ── */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-gray-800 font-bold text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  Display Settings
                </span>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[11px] text-gray-500 block mb-2 font-semibold uppercase tracking-wider">Refresh Interval</label>
                  <div className="flex gap-2">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setRefreshInterval(s)}
                        className={cn(
                          "flex-1 py-1.5 rounded text-[11px] font-bold border transition-colors",
                          refreshInterval === s
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                        )}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <p className="font-semibold text-gray-600 mb-1">ADS Bridge Push Endpoint</p>
                  <p>POST to <code className="text-blue-600 bg-blue-50 px-1 rounded text-[10px]">/api/site-data/push</code></p>
                  <pre className="text-[9px] mt-1 text-blue-500 overflow-x-auto">{"{ tags: { tagId: value } }"}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
