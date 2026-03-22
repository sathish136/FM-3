import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, Settings2, X, Clock, Activity, Home } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "");

// ─── Types (mirroring the backend) ─────────────────────────────────────────
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

// ─── Value box component ────────────────────────────────────────────────────
function ValueBox({ tagId, decimals = 2, values }: { tagId: string; decimals?: number; values: Record<string, TagValueResult> | null }) {
  const tv = values?.[tagId];
  if (!tv || tv.value === null) {
    return (
      <div className="inline-flex items-center justify-center min-w-[72px] h-5 px-1.5 bg-[#1a1a2e] border border-[#2a2a4a] rounded text-[10px] text-[#4a5a6a] font-mono">
        ---
      </div>
    );
  }

  const bgClass =
    tv.status === "alarm"  ? "bg-red-600 border-red-500 text-white" :
    tv.status === "good"   ? "bg-[#00a651] border-[#00c864] text-white" :
    tv.status === "offline"? "bg-[#1a1a2e] border-[#2a2a4a] text-[#4a5a6a]" :
                             "bg-[#003a7a] border-[#0050a0] text-white";

  const display = tv.value.toFixed(decimals);

  return (
    <div className={cn(
      "inline-flex items-center justify-center min-w-[72px] h-5 px-1.5 rounded border text-[10px] font-mono font-bold tabular-nums transition-colors",
      bgClass
    )}>
      {display}
    </div>
  );
}

// ─── Single tag row ─────────────────────────────────────────────────────────
function TagRow({ tag, values }: { tag: TagDef; values: Record<string, TagValueResult> | null }) {
  return (
    <div className="flex items-center justify-between gap-2 py-[3px]">
      <span className="text-[11px] text-[#c0cce0] leading-tight truncate">{tag.label}{tag.unit ? ` (${tag.unit})` : ""}</span>
      <ValueBox tagId={tag.id} decimals={tag.decimals} values={values} />
    </div>
  );
}

// ─── Section within a site ──────────────────────────────────────────────────
function SiteSection({ section, values }: { section: SectionDef; values: Record<string, TagValueResult> | null }) {
  return (
    <div className="mb-2">
      {section.title && (
        <div className="text-[10px] font-bold text-[#4a9eda] uppercase tracking-widest mb-1 border-b border-[#1a2a40] pb-0.5">
          {section.title}
        </div>
      )}
      {section.columns && section.columns > 1 ? (
        <div className={cn("grid gap-x-3", section.columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {section.tags.map(tag => (
            <TagRow key={tag.id} tag={tag} values={values} />
          ))}
        </div>
      ) : (
        <div>
          {section.tags.map(tag => (
            <TagRow key={tag.id} tag={tag} values={values} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Site panel card ────────────────────────────────────────────────────────
function SitePanel({ site, values, isActive, onClick }: {
  site: SiteDef;
  values: Record<string, TagValueResult> | null;
  isActive: boolean;
  onClick: () => void;
}) {
  const allTagIds = site.sections.flatMap(s => s.tags.map(t => t.id));
  const hasAlarm = allTagIds.some(id => values?.[id]?.status === "alarm");

  return (
    <div
      className={cn(
        "rounded border transition-all cursor-pointer",
        isActive ? "border-[#0080ff] shadow-[0_0_8px_#0060cc66]" : "border-[#1a3050] hover:border-[#2a4060]",
        hasAlarm ? "border-red-500" : ""
      )}
      onClick={onClick}
    >
      <div className={cn(
        "px-2 py-1 rounded-t text-[11px] font-extrabold tracking-wider uppercase flex items-center justify-between",
        hasAlarm ? "bg-red-700 text-white" : "bg-[#003570] text-[#90c8f8]"
      )}>
        <span>{site.name}</span>
        {hasAlarm && <span className="text-[9px] font-bold bg-red-600 px-1 rounded animate-pulse">ALARM</span>}
      </div>
      <div className="p-2 bg-[#0a1628]">
        {site.sections.map((sec, i) => (
          <SiteSection key={i} section={sec} values={values} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function SiteData() {
  const [sites, setSites] = useState<SiteDef[]>([]);
  const [values, setValues] = useState<Record<string, TagValueResult> | null>(null);
  const [isSimulated, setIsSimulated] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeSite, setActiveSite] = useState<string | null>(null);
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
    } catch (e) {
      setError("Failed to load site config. Is the API server running?");
    }
  }, [API_BASE]);

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
    } catch (e) {
      setConnected(false);
      setError("Cannot reach API server.");
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchValues();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchValues, refreshInterval * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchValues, refreshInterval]);

  const activeSiteData = activeSite ? sites.find(s => s.id === activeSite) ?? null : null;

  return (
    <Layout>
      <div className="min-h-screen bg-[#060e1e] flex flex-col">

        {/* ── Top header bar ── */}
        <div className="bg-[#0a1628] border-b border-[#1a3050] px-4 py-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#4a9eda]" />
            <span className="text-white font-extrabold text-sm tracking-wider uppercase">WTT International — Live Site Data</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Status pill */}
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
              connected
                ? isSimulated
                  ? "bg-amber-900/40 border-amber-600/50 text-amber-300"
                  : "bg-emerald-900/40 border-emerald-600/50 text-emerald-300"
                : "bg-red-900/40 border-red-600/50 text-red-300"
            )}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {!connected ? "Disconnected" : isSimulated ? "Simulated Data" : "Live ADS Data"}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-[#4a6a8a]">
                <Clock className="w-3 h-3" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            {/* Manual refresh */}
            <button onClick={fetchValues} className="p-1.5 rounded bg-[#1a2a40] hover:bg-[#2a3a50] text-[#4a9eda] transition-colors" title="Refresh now">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Settings */}
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded bg-[#1a2a40] hover:bg-[#2a3a50] text-[#4a9eda] transition-colors" title="Settings">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-red-900/60 border-b border-red-700 px-4 py-2 text-[11px] text-red-200 flex items-center gap-2">
            <WifiOff className="w-3 h-3" />
            {error}
            <span className="text-red-400 ml-1">Check that the API server is running and the /api/site-data endpoint is registered.</span>
          </div>
        )}

        {/* ── Simulated data notice ── */}
        {connected && isSimulated && (
          <div className="bg-amber-900/30 border-b border-amber-800/40 px-4 py-1.5 text-[11px] text-amber-300 flex items-center gap-2">
            <span className="font-bold">DEMO MODE</span> — Showing simulated data. Connect your Beckhoff ADS bridge to see live values.
            <a href="#ads-setup" className="underline ml-1 text-amber-200">How to connect →</a>
          </div>
        )}

        {/* ── All sites grid ── */}
        <div className="flex-1 overflow-auto p-3">
          {sites.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#2a4a6a] text-sm animate-pulse">Loading site configuration…</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {sites.map(site => (
                <SitePanel
                  key={site.id}
                  site={site}
                  values={values}
                  isActive={activeSite === site.id}
                  onClick={() => setActiveSite(prev => prev === site.id ? null : site.id)}
                />
              ))}
            </div>
          )}

          {/* ── ADS setup guide ── */}
          <div id="ads-setup" className="mt-6 bg-[#0a1628] border border-[#1a3050] rounded-xl p-5 max-w-3xl">
            <h3 className="text-[#4a9eda] font-bold text-sm mb-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Connecting Beckhoff ADS — Setup Guide
            </h3>
            <div className="space-y-3 text-[11px] text-[#8aaccb]">
              <p><span className="text-[#90c8f8] font-semibold">Option 1 — Local Bridge (Recommended):</span> Run a small Node.js script on the machine with TwinCAT installed that reads ADS tags and POSTs them to this app's API.</p>
              <div className="bg-[#060e1e] border border-[#1a2a40] rounded p-3 font-mono text-[10px] text-[#6aacda] whitespace-pre-wrap overflow-x-auto">
{`// bridge.js — run on your TwinCAT machine
const ADS = require('ads-client');
const client = new ADS.Client({ targetAmsNetId: 'YOUR.PLC.AMS.NET.ID' });

setInterval(async () => {
  const tags = {};
  // Read each tag from PLC
  tags['k13_mr_feed'] = await client.readValue('GVL.Kanchan1_3.MainRO.FeedFlow');
  // ... add all your tags ...
  
  // Push to this app
  await fetch('https://your-replit-app.replit.app/pm-app/api/site-data/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags })
  });
}, 2000);`}
              </div>
              <p><span className="text-[#90c8f8] font-semibold">Option 2 — Direct (if PLC is internet-accessible):</span> Set <code className="bg-[#0d1f30] px-1 rounded text-[#4ad0f8]">BECKHOFF_AMS_NET_ID</code> environment variable and contact the development team to enable direct ADS connection mode.</p>
              <p className="text-[#4a6a8a]">
                All tag IDs and their ADS variable paths can be fetched from <code className="bg-[#0d1f30] px-1 rounded text-[#4ad0f8]">/api/site-data/ads-tags</code> to help you build the bridge script.
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom site navigation (matching the image) ── */}
        <div className="bg-[#001530] border-t border-[#1a3050] px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveSite(null)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors",
              activeSite === null ? "bg-[#0060cc] text-white" : "bg-[#0a1628] text-[#6a9abf] hover:bg-[#1a2a40] hover:text-[#8abcdf]"
            )}
          >
            <Home className="w-3 h-3" />
            ALL
          </button>
          {sites.map(site => {
            const allTagIds = site.sections.flatMap(s => s.tags.map(t => t.id));
            const hasAlarm = allTagIds.some(id => values?.[id]?.status === "alarm");
            return (
              <button
                key={site.id}
                onClick={() => {
                  setActiveSite(prev => prev === site.id ? null : site.id);
                  const el = document.getElementById(`site-${site.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors",
                  activeSite === site.id
                    ? hasAlarm ? "bg-red-600 text-white" : "bg-[#0060cc] text-white"
                    : hasAlarm
                      ? "bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800/50"
                      : "bg-[#0a1628] text-[#6a9abf] hover:bg-[#1a2a40] hover:text-[#8abcdf]"
                )}
              >
                {site.name}
              </button>
            );
          })}
        </div>

        {/* ── Focused site detail overlay (when a site tab is clicked) ── */}
        {activeSiteData && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setActiveSite(null)}>
            <div
              className="bg-[#0a1628] border border-[#1a3050] rounded-xl max-w-xl w-full max-h-[85vh] overflow-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3050] bg-[#003570] rounded-t-xl">
                <span className="text-[#90c8f8] font-extrabold tracking-widest uppercase text-sm">{activeSiteData.name}</span>
                <button onClick={() => setActiveSite(null)} className="text-[#4a9eda] hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {activeSiteData.sections.map((sec, i) => (
                  <div key={i}>
                    {sec.title && (
                      <div className="text-[11px] font-bold text-[#4a9eda] uppercase tracking-widest mb-2 border-b border-[#1a2a40] pb-1">
                        {sec.title}
                      </div>
                    )}
                    <div className="space-y-1">
                      {sec.tags.map(tag => {
                        const tv = values?.[tag.id];
                        return (
                          <div key={tag.id} className="flex items-center justify-between py-1 border-b border-[#0f1e30]">
                            <div>
                              <span className="text-[12px] text-[#c0cce0]">{tag.label}{tag.unit ? ` (${tag.unit})` : ""}</span>
                              <span className="block text-[9px] text-[#2a4a6a] font-mono">{tag.adsTag}</span>
                            </div>
                            <div className="text-right">
                              <ValueBox tagId={tag.id} decimals={tag.decimals} values={values} />
                              {tv && (
                                <div className="text-[9px] text-[#2a4a6a] mt-0.5">
                                  {tv.source} · {tv.timestamp ? new Date(tv.timestamp).toLocaleTimeString() : "—"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Settings modal ── */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-[#0a1628] border border-[#1a3050] rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3050]">
                <span className="text-white font-bold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4 text-[#4a9eda]" />Display Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-[#4a9eda] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[11px] text-[#8aaccb] block mb-2">Refresh Interval</label>
                  <div className="flex gap-2">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setRefreshInterval(s)}
                        className={cn(
                          "flex-1 py-1.5 rounded text-[11px] font-bold border transition-colors",
                          refreshInterval === s
                            ? "bg-[#0060cc] border-[#0080ff] text-white"
                            : "bg-[#0d1f30] border-[#1a3050] text-[#6a9abf] hover:border-[#2a4060]"
                        )}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-[#4a6a8a] border border-[#1a2a40] rounded p-3 bg-[#060e1e]">
                  <p className="font-semibold text-[#6a9abf] mb-1">ADS Bridge API Key</p>
                  <p>POST to <code className="text-[#4ad0f8] text-[10px]">/api/site-data/push</code> with:</p>
                  <pre className="text-[9px] mt-1 text-[#4a9eda] overflow-x-auto">{"{ tags: { tagId: value } }"}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
