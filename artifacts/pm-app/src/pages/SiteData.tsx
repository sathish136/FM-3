import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, Settings2, X, Clock, Activity } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "");

interface TagDef { id: string; label: string; unit?: string; adsTag: string; decimals?: number; }
interface SectionDef { title?: string; columns?: number; tags: TagDef[]; }
interface SiteDef { id: string; name: string; sections: SectionDef[]; }
interface TagValueResult { value: number | null; timestamp: number; source: string; status: "normal" | "good" | "alarm" | "offline"; }
interface ValuesResponse { values: Record<string, TagValueResult>; isSimulated: boolean; updatedAt: number; }

const SYSTEMS = [
  { key: "biological", label: "Biological" },
  { key: "cts_mbr",   label: "CTS MBR"    },
  { key: "mbr",       label: "MBR"         },
  { key: "ro",        label: "RO"          },
  { key: "reject_ro", label: "Reject RO"   },
] as const;
type SystemKey = typeof SYSTEMS[number]["key"];

function classifySection(sec: SectionDef): SystemKey {
  const title = (sec.title ?? "").toUpperCase().trim();
  if (title.includes("REJECT"))  return "reject_ro";
  if (title.includes("CTS"))     return "cts_mbr";
  if (title === "MBR" || title.includes("MBR SKID")) return "mbr";
  if (title.includes("MAIN RO") || (title.includes("RO") && !title.includes("REJECT"))) return "ro";
  const combined = [...sec.tags.map(t => t.label.toLowerCase()), ...sec.tags.map(t => t.id)].join(" ");
  if (combined.includes("bio") || combined.includes("blower") || combined.includes("ntflow") || combined.includes("nt flow") || combined.includes("srs")) return "biological";
  if (combined.includes("mbr") || combined.includes("tmp")) return "mbr";
  if (combined.includes("feed") || combined.includes("recov") || combined.includes("setph") || combined.includes("liveph")) return "ro";
  return "biological";
}

function siteSystemMap(site: SiteDef): Record<SystemKey, TagDef[]> {
  const map: Record<SystemKey, TagDef[]> = { biological: [], cts_mbr: [], mbr: [], ro: [], reject_ro: [] };
  for (const sec of site.sections) map[classifySection(sec)].push(...sec.tags);
  return map;
}

function ValueChip({ tagId, decimals = 2, values }: { tagId: string; decimals?: number; values: Record<string, TagValueResult> | null }) {
  const tv = values?.[tagId];
  if (!tv || tv.value === null)
    return <span className="inline-block text-right w-[46px] text-[10px] font-mono text-gray-300">---</span>;
  const cls =
    tv.status === "alarm"   ? "text-red-600 bg-red-50 border-red-200" :
    tv.status === "good"    ? "text-green-700 bg-green-50 border-green-200" :
    tv.status === "offline" ? "text-gray-400 bg-gray-50 border-gray-200" :
                              "text-blue-700 bg-blue-50 border-blue-200";
  return (
    <span className={cn("inline-block text-right w-[46px] text-[10px] font-mono font-bold border rounded px-1", cls)}>
      {tv.value.toFixed(decimals)}
    </span>
  );
}

function SystemCell({ tags, values }: { tags: TagDef[]; values: Record<string, TagValueResult> | null }) {
  if (tags.length === 0) return <span className="text-gray-200 text-[10px]">—</span>;
  return (
    <div className="space-y-px">
      {tags.map(tag => (
        <div key={tag.id} className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-gray-600 leading-[1.3] truncate flex-1 max-w-[130px]">
            {tag.label}{tag.unit ? <span className="text-gray-400"> ({tag.unit})</span> : null}
          </span>
          <ValueChip tagId={tag.id} decimals={tag.decimals} values={values} />
        </div>
      ))}
    </div>
  );
}

export default function SiteData() {
  const [sites, setSites]               = useState<SiteDef[]>([]);
  const [values, setValues]             = useState<Record<string, TagValueResult> | null>(null);
  const [isSimulated, setIsSimulated]   = useState(true);
  const [connected, setConnected]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2);
  const [error, setError]               = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/site-data/config`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json() as { sites: SiteDef[] };
      setSites(data.sites);
    } catch { setError("Failed to load site config."); }
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
    } catch { setConnected(false); setError("Cannot reach API server."); }
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
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
          <Activity className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-gray-800 font-extrabold text-xs tracking-widest uppercase">WTT International — Live Site Data</span>
          <div className="ml-auto flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              connected ? isSimulated ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-green-50 border-green-300 text-green-700" : "bg-red-50 border-red-300 text-red-700"
            )}>
              {connected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {!connected ? "Disconnected" : isSimulated ? "Simulated" : "Live"}
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Clock className="w-2.5 h-2.5" />{lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button onClick={fetchValues} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-blue-600 transition-colors" title="Refresh">
              <RefreshCw className="w-3 h-3" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-blue-600 transition-colors" title="Settings">
              <Settings2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Notices ── */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-3 py-1 text-[10px] text-red-600 flex items-center gap-1.5 flex-shrink-0">
            <WifiOff className="w-3 h-3" />{error}
          </div>
        )}
        {connected && isSimulated && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1 text-[10px] text-amber-700 flex-shrink-0">
            <span className="font-bold">DEMO MODE</span> — Simulated data. Connect Beckhoff ADS bridge for live values.
          </div>
        )}

        {/* ── Table (fills remaining height, scrolls only inside) ── */}
        <div className="flex-1 overflow-auto min-h-0 p-2">
          {sites.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-xs animate-pulse">Loading site configuration…</span>
            </div>
          ) : (
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 table-fixed text-[11px]">
              <colgroup>
                <col style={{ width: "13%" }} />
                <col style={{ width: "17.4%" }} />
                <col style={{ width: "17.4%" }} />
                <col style={{ width: "17.4%" }} />
                <col style={{ width: "17.4%" }} />
                <col style={{ width: "17.4%" }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-700">
                  <th className="px-2 py-1.5 text-[10px] font-extrabold text-white uppercase tracking-wider text-left border-r border-blue-600">Site</th>
                  {SYSTEMS.map((sys, i) => (
                    <th key={sys.key} className={cn("px-2 py-1.5 text-[10px] font-extrabold text-white uppercase tracking-wider text-center", i < SYSTEMS.length - 1 ? "border-r border-blue-600" : "")}>
                      {sys.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((site, ri) => {
                  const sysMap = siteSystemMap(site);
                  const allIds = site.sections.flatMap(s => s.tags.map(t => t.id));
                  const hasAlarm = allIds.some(id => values?.[id]?.status === "alarm");
                  return (
                    <tr key={site.id} className={cn("align-top", hasAlarm ? "bg-red-50" : ri % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                      <td className={cn("px-2 py-1.5 border-r border-gray-100 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap", hasAlarm ? "text-red-600" : "text-blue-800")}>
                        {site.name}
                        {hasAlarm && <span className="ml-1 text-[8px] bg-red-500 text-white px-1 py-px rounded animate-pulse">!</span>}
                      </td>
                      {SYSTEMS.map((sys, i) => (
                        <td key={sys.key} className={cn("px-2 py-1.5", i < SYSTEMS.length - 1 ? "border-r border-gray-100" : "")}>
                          <SystemCell tags={sysMap[sys.key]} values={values} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Settings modal ── */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-gray-800 font-bold text-xs flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-blue-600" />Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Refresh Interval</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 5, 10].map(s => (
                      <button key={s} onClick={() => setRefreshInterval(s)}
                        className={cn("flex-1 py-1 rounded text-[10px] font-bold border transition-colors",
                          refreshInterval === s ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300")}>
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
