import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Globe, MapPin, Newspaper, Users, TrendingUp, BarChart3,
  Filter, RefreshCw, Search, ChevronDown, Building2,
  Megaphone, Target, Wifi, Map, X, Download, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "world-map" | "overview" | "india-map" | "lead-details" | "news" | "competitors";

// ── Constants ──────────────────────────────────────────────────────────────

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
];

const COUNTRIES = [
  "Global", "India", "USA", "UAE", "Saudi Arabia", "Qatar", "Kuwait",
  "Germany", "UK", "France", "Singapore", "Malaysia", "Australia",
  "Bangladesh", "Sri Lanka", "Nepal", "Indonesia", "Thailand",
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Converted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Opportunity: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Quotation: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Closed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  Lead: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  Replied: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Lost Quotation": "bg-red-500/20 text-red-300 border-red-500/30",
  "Do Not Contact": "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

// ── Lead count color scale ───────────────────────────────────────────────────

function getMapColor(total: number): string {
  if (!total || total === 0) return "#1e293b";
  if (total > 100) return "#166534";
  if (total > 50) return "#16a34a";
  if (total > 10) return "#84cc16";
  return "#f59e0b";
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={cn("rounded-lg p-3 border text-center", color)}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

// ── World Map Tab ─────────────────────────────────────────────────────────────

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function WorldMapTab() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-leads"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/leads");
      return r.json();
    },
  });

  const countryStats: Record<string, Record<string, number>> = data?.country_stats ?? {};
  const globalStats: Record<string, number> = data?.global_stats ?? {};
  const sourceStats: Record<string, number> = data?.source_stats ?? {};

  const selectedData = selectedCountry ? countryStats[selectedCountry] : null;

  const topCountries = Object.entries(countryStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15);

  return (
    <div className="flex flex-col gap-4">
      {/* Global KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          { label: "Total", value: globalStats.total },
          { label: "Open", value: globalStats.Open },
          { label: "Converted", value: globalStats.Converted },
          { label: "Opportunity", value: globalStats.Opportunity },
          { label: "Quotation", value: globalStats.Quotation },
          { label: "Lead", value: globalStats.Lead },
          { label: "Replied", value: globalStats.Replied },
          { label: "Closed", value: globalStats.Closed },
          { label: "Lost", value: globalStats["Lost Quotation"] },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{isLoading ? "—" : (s.value ?? 0)}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden relative" style={{ minHeight: 420 }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Global Lead Distribution</span>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#166534" }}></span>&gt;100</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#16a34a" }}></span>50-100</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#84cc16" }}></span>10-50</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#f59e0b" }}></span>&lt;10</span>
              <button onClick={() => refetch()} className="flex items-center gap-1 text-white/50 hover:text-white transition-colors">
                <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/30 text-sm">Loading lead data...</div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [10, 15] }}
              style={{ width: "100%", height: 380 }}
            >
              <ZoomableGroup>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = geo.properties.name;
                      const stats = countryStats[name];
                      const total = stats?.total ?? 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getMapColor(total)}
                          stroke="#0f172a"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none", cursor: total > 0 ? "pointer" : "default" },
                            hover: { fill: total > 0 ? "#38bdf8" : "#2d3748", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                          onClick={() => total > 0 && setSelectedCountry(selectedCountry === name ? null : name)}
                          onMouseEnter={(e) => total > 0 && setTooltip({ name: `${name}: ${total} leads`, x: (e as any).clientX, y: (e as any).clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}
          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 bg-[#0f172a] border border-white/20 text-white text-xs px-2 py-1 rounded-lg pointer-events-none"
              style={{ left: tooltip.x + 12, top: tooltip.y - 24 }}
            >
              {tooltip.name}
            </div>
          )}
        </div>

        {/* Right side panels */}
        <div className="flex flex-col gap-3 w-64">
          {/* Country details panel */}
          {selectedCountry && selectedData ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{selectedCountry}</h3>
                <button onClick={() => setSelectedCountry(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1.5">
                {Object.entries(selectedData).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-white/50">{k}</span>
                    <span className={cn("font-semibold", k === "total" ? "text-white" : "text-white/80")}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-shrink-0 flex items-center justify-center h-36">
              <p className="text-white/20 text-xs text-center">Click a colored country<br/>to see lead breakdown</p>
            </div>
          )}

          {/* Top countries */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-1 overflow-auto">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Top Countries</h3>
            <div className="space-y-1">
              {topCountries.map(([country, stats]) => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors",
                    selectedCountry === country ? "bg-sky-600/30 text-sky-300" : "text-white/60 hover:bg-white/5"
                  )}
                >
                  <span className="truncate">{country}</span>
                  <span className="font-semibold ml-2 text-white">{stats.total}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Lead Sources</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, cnt]) => (
            <div key={src} className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-white">{cnt}</p>
              <p className="text-xs text-white/40 truncate">{src}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lead Overview Tab ─────────────────────────────────────────────────────────

function OverviewTab() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-leads"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/leads");
      return r.json();
    },
  });

  const globalStats = data?.global_stats ?? {};
  const countryStats: Record<string, Record<string, number>> = data?.country_stats ?? {};
  const sourceStats: Record<string, number> = data?.source_stats ?? {};

  const filteredCountries = Object.entries(countryStats)
    .filter(([c]) => c.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Lead Overview</h2>
        <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          { label: "Total", value: globalStats.total },
          { label: "Open", value: globalStats.Open },
          { label: "Converted", value: globalStats.Converted },
          { label: "Opportunity", value: globalStats.Opportunity },
          { label: "Quotation", value: globalStats.Quotation },
          { label: "Lead", value: globalStats.Lead },
          { label: "Replied", value: globalStats.Replied },
          { label: "Closed", value: globalStats.Closed },
          { label: "Lost", value: globalStats["Lost Quotation"] },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{isLoading ? "—" : (s.value ?? 0)}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Country Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm">Country Breakdown</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input
              className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50 w-44"
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#12122a]">
              <tr>
                {["Country", "Total", "Open", "Converted", "Opportunity", "Quotation", "Lead", "Closed", "Lost", "Do Not Contact"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/40 font-semibold uppercase tracking-wider whitespace-nowrap border-b border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-8 text-white/30">Loading...</td></tr>
              ) : filteredCountries.map(([country, stats], i) => (
                <tr
                  key={country}
                  className={cn("border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors", selectedCountry === country ? "bg-indigo-600/10" : i % 2 !== 0 ? "bg-white/[0.02]" : "")}
                  onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                >
                  <td className="px-3 py-2 font-medium text-white/80">{country}</td>
                  <td className="px-3 py-2 font-bold text-white">{stats.total}</td>
                  <td className="px-3 py-2 text-blue-300">{stats.Open ?? 0}</td>
                  <td className="px-3 py-2 text-emerald-300">{stats.Converted ?? 0}</td>
                  <td className="px-3 py-2 text-violet-300">{stats.Opportunity ?? 0}</td>
                  <td className="px-3 py-2 text-amber-300">{stats.Quotation ?? 0}</td>
                  <td className="px-3 py-2 text-sky-300">{stats.Lead ?? 0}</td>
                  <td className="px-3 py-2 text-slate-300">{stats.Closed ?? 0}</td>
                  <td className="px-3 py-2 text-red-300">{stats["Lost Quotation"] ?? 0}</td>
                  <td className="px-3 py-2 text-rose-300">{stats["Do Not Contact"] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Lead Sources</h3>
        <div className="space-y-2">
          {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, cnt]) => {
            const max = Math.max(...Object.values(sourceStats));
            const pct = max > 0 ? (cnt / max) * 100 : 0;
            return (
              <div key={src} className="flex items-center gap-3">
                <span className="text-white/50 text-xs w-40 shrink-0 truncate">{src}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-white text-xs font-semibold w-10 text-right">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── India Map Tab ─────────────────────────────────────────────────────────────

function IndiaMapTab() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["india-leads"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/lead-details?country=India");
      return r.json();
    },
    staleTime: 60_000,
  });

  const leads: any[] = data?.leads ?? [];

  const stateStats = useMemo(() => {
    const stats: Record<string, { total: number; Open: number; Converted: number; Opportunity: number; Quotation: number }> = {};
    for (const lead of leads) {
      const state = lead.state || lead.city || "Unknown";
      if (!stats[state]) stats[state] = { total: 0, Open: 0, Converted: 0, Opportunity: 0, Quotation: 0 };
      stats[state].total++;
      const s = lead.status as string;
      if (s === "Open") stats[state].Open++;
      else if (s === "Converted") stats[state].Converted++;
      else if (s === "Opportunity") stats[state].Opportunity++;
      else if (s === "Quotation") stats[state].Quotation++;
    }
    return stats;
  }, [leads]);

  const filteredStates = Object.entries(stateStats)
    .filter(([s]) => s.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1].total - a[1].total);

  const maxTotal = filteredStates[0]?.[1]?.total ?? 1;

  function exportData() {
    const rows = filteredStates.map(([state, s]) => ({ State: state, Total: s.total, Open: s.Open, Converted: s.Converted, Opportunity: s.Opportunity, Quotation: s.Quotation }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "India Leads");
    XLSX.writeFile(wb, "India_State_Leads.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">India State-wise Lead Distribution</h2>
          <p className="text-white/40 text-sm">{leads.length.toLocaleString()} total leads from India across {Object.keys(stateStats).length} states/cities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input
              className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/20 outline-none w-44"
              placeholder="Search state..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-1.5 text-sm hover:bg-emerald-600/40 transition-colors"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#12122a]">
              <tr>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">State / City</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">Leads</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10 w-64">Distribution</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">Open</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">Converted</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">Opportunity</th>
                <th className="px-4 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wider border-b border-white/10">Quotation</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">Loading India lead data...</td></tr>
              ) : filteredStates.map(([state, s], i) => (
                <tr key={state} className={cn("border-b border-white/5 hover:bg-white/5 transition-colors", i % 2 !== 0 ? "bg-white/[0.02]" : "")}>
                  <td className="px-4 py-3 font-medium text-white/80">{state}</td>
                  <td className="px-4 py-3 font-bold text-white">{s.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/5 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{ width: `${Math.max(4, (s.total / maxTotal) * 100)}%` }}
                        />
                      </div>
                      <span className="text-white/30 text-xs w-10 text-right">{((s.total / leads.length) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-blue-300">{s.Open}</td>
                  <td className="px-4 py-3 text-emerald-300">{s.Converted}</td>
                  <td className="px-4 py-3 text-violet-300">{s.Opportunity}</td>
                  <td className="px-4 py-3 text-amber-300">{s.Quotation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Lead Details Tab ──────────────────────────────────────────────────────────

function LeadDetailsTab() {
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-lead-details", country, status, industryType, source],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (status) params.set("status", status);
      if (industryType) params.set("industry_type", industryType);
      if (source) params.set("source", source);
      const r = await fetch(`/api/marketing/lead-details?${params}`);
      return r.json();
    },
  });

  const leads: any[] = data?.leads ?? [];
  const filtered = leads.filter(l =>
    !search || [l.company_name, l.lead_name, l.email_id, l.mobile_no, l.source, l.city].some(v =>
      String(v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  function exportLeads() {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "Lead_Details.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={country} onChange={e => setCountry(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-indigo-500/50">
          <option value="">All Countries</option>
          {COUNTRIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-indigo-500/50">
          <option value="">All Statuses</option>
          {["Open", "Converted", "Opportunity", "Quotation", "Lead", "Replied", "Closed", "Lost Quotation", "Do Not Contact"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={industryType} onChange={e => setIndustryType(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-indigo-500/50">
          <option value="">All Industries</option>
          <option value="Textile">Textile</option>
          <option value="Non Textile">Non Textile</option>
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50"
            placeholder="Search company, email, mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
        <button onClick={exportLeads} className="flex items-center gap-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 text-sm hover:bg-emerald-600/40 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
          <span className="text-sm text-white/60">{filtered.length.toLocaleString()} leads</span>
        </div>
        <div className="overflow-auto max-h-[550px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#12122a]">
              <tr>
                {["Company", "Contact", "Email", "Mobile", "Status", "Source", "Industry", "City", "Country", "Date"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/40 font-semibold uppercase tracking-wider whitespace-nowrap border-b border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-12 text-white/30">Loading leads...</td></tr>
              ) : filtered.slice(0, 500).map((lead, i) => (
                <tr key={i} className={cn("border-b border-white/5 hover:bg-white/5 transition-colors", i % 2 !== 0 ? "bg-white/[0.02]" : "")}>
                  <td className="px-3 py-2 text-white/80 font-medium max-w-32 truncate">{lead.company_name || "—"}</td>
                  <td className="px-3 py-2 text-white/60 whitespace-nowrap">{lead.lead_name || "—"}</td>
                  <td className="px-3 py-2 text-white/50 max-w-36 truncate">{lead.email_id || "—"}</td>
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">{lead.mobile_no || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={cn("px-1.5 py-0.5 rounded border text-xs", STATUS_COLORS[lead.status] ?? "text-white/40")}>{lead.status || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">{lead.source || "—"}</td>
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">{lead.industry || "—"}</td>
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">{lead.city || "—"}</td>
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">{lead.country || "—"}</td>
                  <td className="px-3 py-2 text-white/40 whitespace-nowrap">{lead.creation ? String(lead.creation).split(" ")[0] : "—"}</td>
                </tr>
              ))}
              {filtered.length > 500 && (
                <tr><td colSpan={10} className="text-center py-4 text-white/30 text-xs">Showing 500 of {filtered.length} leads — use filters to narrow down</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── News Tab ──────────────────────────────────────────────────────────────────

function NewsTab() {
  const [mode, setMode] = useState<"country" | "state">("country");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Gujarat");

  const countryNews = useQuery({
    queryKey: ["marketing-news", country],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/news?country=${encodeURIComponent(country)}`);
      return r.json();
    },
    enabled: mode === "country",
  });

  const stateNews = useQuery({
    queryKey: ["marketing-state-news", state],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/state-news?state=${encodeURIComponent(state)}`);
      return r.json();
    },
    enabled: mode === "state",
  });

  const { data, isLoading, refetch } = mode === "country" ? countryNews : stateNews;
  const articles: any[] = data?.articles ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Industry News</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <button onClick={() => setMode("country")} className={cn("px-3 py-1 rounded-md text-sm transition-all", mode === "country" ? "bg-indigo-600 text-white" : "text-white/50")}>Country</button>
            <button onClick={() => setMode("state")} className={cn("px-3 py-1 rounded-md text-sm transition-all", mode === "state" ? "bg-indigo-600 text-white" : "text-white/50")}>India State</button>
          </div>
          {mode === "country" ? (
            <select value={country} onChange={e => setCountry(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <select value={state} onChange={e => setState(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none">
              {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-white/40">
          <Wifi className="w-5 h-5 animate-pulse" />
          <span>Fetching industry news with AI...</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
              <p className="font-semibold text-white text-sm mb-2 line-clamp-2">{a.title}</p>
              <p className="text-white/50 text-xs mb-3 line-clamp-3">{a.summary}</p>
              <div className="flex items-center justify-between text-xs text-white/30">
                <span>{a.source || a.date}</span>
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">Read more →</a>}
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <div className="col-span-3 text-center py-12 text-white/30">No articles loaded. Click refresh to generate.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Competitor Analysis Tab ───────────────────────────────────────────────────

function CompetitorTab() {
  const [mode, setMode] = useState<"country" | "state">("country");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Gujarat");

  const countryQ = useQuery({
    queryKey: ["marketing-competitors", country],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/competitor-analysis?country=${encodeURIComponent(country)}`);
      return r.json();
    },
    enabled: mode === "country",
  });

  const stateQ = useQuery({
    queryKey: ["marketing-state-competitors", state],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/state-competitor-analysis?state=${encodeURIComponent(state)}`);
      return r.json();
    },
    enabled: mode === "state",
  });

  const { data, isLoading, refetch } = mode === "country" ? countryQ : stateQ;
  const competitors: any[] = data?.competitors ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Competitor Analysis</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <button onClick={() => setMode("country")} className={cn("px-3 py-1 rounded-md text-sm transition-all", mode === "country" ? "bg-indigo-600 text-white" : "text-white/50")}>Country</button>
            <button onClick={() => setMode("state")} className={cn("px-3 py-1 rounded-md text-sm transition-all", mode === "state" ? "bg-indigo-600 text-white" : "text-white/50")}>India State</button>
          </div>
          {mode === "country" ? (
            <select value={country} onChange={e => setCountry(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <select value={state} onChange={e => setState(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none">
              {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-white/40">
          <Target className="w-5 h-5 animate-pulse" />
          <span>Generating competitor analysis with AI...</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {competitors.map((c, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{c.name}</p>
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">{c.website}</a>}
                </div>
                {c.market_share && (
                  <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs px-2 py-0.5 rounded-full">{c.market_share}</span>
                )}
              </div>
              {c.recent_activities && (
                <div className="mb-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Recent Activities</p>
                  <p className="text-xs text-white/60">{c.recent_activities}</p>
                </div>
              )}
              {c.technology_focus && (
                <div className="mb-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Technology Focus</p>
                  <p className="text-xs text-white/60">{c.technology_focus}</p>
                </div>
              )}
              {c.ad_platforms && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(Array.isArray(c.ad_platforms) ? c.ad_platforms : [c.ad_platforms]).map((p: string) => (
                    <span key={p} className="bg-white/5 border border-white/10 text-white/50 text-xs px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {competitors.length === 0 && (
            <div className="col-span-2 text-center py-12 text-white/30">Click refresh to generate competitor analysis.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "world-map", label: "World Map", icon: Globe, color: "text-sky-400" },
  { id: "overview", label: "Lead Overview", icon: Users, color: "text-indigo-400" },
  { id: "india-map", label: "India States", icon: Map, color: "text-orange-400" },
  { id: "lead-details", label: "Lead Details", icon: Filter, color: "text-violet-400" },
  { id: "news", label: "Industry News", icon: Newspaper, color: "text-teal-400" },
  { id: "competitors", label: "Competitor Analysis", icon: Building2, color: "text-rose-400" },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<Tab>("world-map");

  return (
    <Layout>
      <div className="min-h-screen bg-[#0f0f1a] p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Marketing</h1>
          </div>
          <p className="text-white/40 text-sm ml-11">Lead intelligence, world map, India states, industry news & competitor analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-white/50 hover:text-white"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : tab.color)} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "world-map" && <WorldMapTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "india-map" && <IndiaMapTab />}
        {activeTab === "lead-details" && <LeadDetailsTab />}
        {activeTab === "news" && <NewsTab />}
        {activeTab === "competitors" && <CompetitorTab />}
      </div>
    </Layout>
  );
}
