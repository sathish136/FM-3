import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Globe, MapPin, Newspaper, Users, TrendingUp, BarChart3,
  Filter, RefreshCw, Search, Building2,
  Megaphone, Target, Wifi, Map, X, Download, Info,
  ArrowUpRight, ArrowDownRight, ChevronRight, Layers
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

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Open:              { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500" },
  Converted:         { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200",dot: "bg-emerald-500" },
  Opportunity:       { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  Quotation:         { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500" },
  Closed:            { bg: "bg-gray-100",  text: "text-gray-600",   border: "border-gray-200",   dot: "bg-gray-400" },
  Lead:              { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",    dot: "bg-sky-500" },
  Replied:           { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   dot: "bg-teal-500" },
  "Lost Quotation":  { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500" },
  "Do Not Contact":  { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   dot: "bg-rose-500" },
};

const KPI_CONFIG = [
  { label: "Total",    key: "total",            color: "from-indigo-500 to-violet-600",  icon: "📊" },
  { label: "Open",     key: "Open",             color: "from-blue-400 to-blue-600",      icon: "🔵" },
  { label: "Converted",key: "Converted",        color: "from-emerald-400 to-emerald-600",icon: "✅" },
  { label: "Opportunity",key: "Opportunity",    color: "from-violet-400 to-violet-600",  icon: "💡" },
  { label: "Quotation",key: "Quotation",        color: "from-amber-400 to-amber-600",    icon: "📋" },
  { label: "Lead",     key: "Lead",             color: "from-sky-400 to-sky-600",        icon: "🎯" },
  { label: "Replied",  key: "Replied",          color: "from-teal-400 to-teal-600",      icon: "↩️" },
  { label: "Closed",   key: "Closed",           color: "from-slate-400 to-slate-600",    icon: "🔒" },
  { label: "Lost",     key: "Lost Quotation",   color: "from-red-400 to-red-600",        icon: "❌" },
];

// ── Lead count color scale (for world map) ──────────────────────────────────

function getMapColor(total: number): string {
  if (!total || total === 0) return "#e2e8f0";
  if (total > 100) return "#1d4ed8";
  if (total > 50)  return "#3b82f6";
  if (total > 10)  return "#93c5fd";
  return "#bfdbfe";
}

// ── KPI Cards Row ─────────────────────────────────────────────────────────────

function KPIRow({ stats, isLoading }: { stats: Record<string, number>; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
      {KPI_CONFIG.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center hover:shadow-md transition-shadow"
        >
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : (stats[kpi.key] ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{kpi.label}</p>
        </div>
      ))}
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
    .sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0))
    .slice(0, 15);

  return (
    <div className="flex flex-col gap-5">
      <KPIRow stats={globalStats} isLoading={isLoading} />

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative" style={{ minHeight: 440 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800">Global Lead Distribution</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-blue-800" />&gt;100</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-blue-500" />50–100</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-blue-300" />10–50</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-blue-200" />&lt;10</span>
              <button onClick={() => refetch()} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors font-medium">
                <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-gray-300 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading lead data...
            </div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [10, 15] }}
              style={{ width: "100%", height: 390 }}
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
                          stroke="#cbd5e1"
                          strokeWidth={0.4}
                          style={{
                            default: { outline: "none", cursor: total > 0 ? "pointer" : "default" },
                            hover: { fill: total > 0 ? "#6366f1" : "#cbd5e1", outline: "none" },
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
          {tooltip && (
            <div
              className="fixed z-50 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none shadow-lg"
              style={{ left: tooltip.x + 12, top: tooltip.y - 24 }}
            >
              {tooltip.name}
            </div>
          )}
        </div>

        {/* Right side panels */}
        <div className="flex flex-col gap-3 w-64">
          {selectedCountry && selectedData ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-800">{selectedCountry}</h3>
                </div>
                <button onClick={() => setSelectedCountry(null)} className="text-gray-300 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(selectedData).map(([k, v]) => {
                  const style = STATUS_STYLES[k];
                  return (
                    <div key={k} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        {style && <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />}
                        <span className={k === "total" ? "font-semibold text-gray-700" : "text-gray-500"}>{k}</span>
                      </div>
                      <span className={cn("font-bold", k === "total" ? "text-gray-900 text-sm" : "text-gray-700")}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4 flex-shrink-0 flex flex-col items-center justify-center h-36 gap-2">
              <Globe className="w-6 h-6 text-indigo-300" />
              <p className="text-indigo-400 text-xs text-center leading-relaxed">Click a colored country<br/>to see lead breakdown</p>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex-1 overflow-auto">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Top Countries
            </h3>
            <div className="space-y-1">
              {topCountries.map(([country, stats], idx) => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all",
                    selectedCountry === country
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-bold w-4", selectedCountry === country ? "text-indigo-200" : "text-gray-300")}>{idx + 1}</span>
                    <span className="truncate font-medium">{country}</span>
                  </div>
                  <span className={cn("font-bold ml-2", selectedCountry === country ? "text-white" : "text-gray-900")}>{stats.total}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Lead Sources
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, cnt]) => (
            <div key={src} className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-xl p-3 text-center hover:shadow-sm transition-shadow">
              <p className="text-xl font-bold text-gray-900">{cnt}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{src}</p>
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
    .sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0));

  const maxSrc = Math.max(...Object.values(sourceStats), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lead Overview</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete breakdown of leads by country and source</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium bg-indigo-50 px-3 py-1.5 rounded-lg">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} /> Refresh
        </button>
      </div>

      <KPIRow stats={globalStats} isLoading={isLoading} />

      {/* Country Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" /> Country Breakdown
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              className="bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-48"
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {["Country", "Total", "Open", "Converted", "Opportunity", "Quotation", "Lead", "Closed", "Lost", "DNC"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-300">Loading...</td></tr>
              ) : filteredCountries.map(([country, stats], i) => (
                <tr
                  key={country}
                  className={cn(
                    "border-b border-gray-50 hover:bg-indigo-50/50 cursor-pointer transition-colors",
                    selectedCountry === country ? "bg-indigo-50" : i % 2 !== 0 ? "bg-gray-50/30" : "bg-white"
                  )}
                  onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                >
                  <td className="px-3 py-2.5 font-semibold text-gray-700 flex items-center gap-1.5">
                    <ChevronRight className={cn("w-3 h-3 text-indigo-400 transition-transform", selectedCountry === country && "rotate-90")} />
                    {country}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-900">{stats.total ?? 0}</td>
                  <td className="px-3 py-2.5 text-blue-600 font-medium">{stats.Open ?? 0}</td>
                  <td className="px-3 py-2.5 text-emerald-600 font-medium">{stats.Converted ?? 0}</td>
                  <td className="px-3 py-2.5 text-violet-600 font-medium">{stats.Opportunity ?? 0}</td>
                  <td className="px-3 py-2.5 text-amber-600 font-medium">{stats.Quotation ?? 0}</td>
                  <td className="px-3 py-2.5 text-sky-600 font-medium">{stats.Lead ?? 0}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-medium">{stats.Closed ?? 0}</td>
                  <td className="px-3 py-2.5 text-red-500 font-medium">{stats["Lost Quotation"] ?? 0}</td>
                  <td className="px-3 py-2.5 text-rose-500 font-medium">{stats["Do Not Contact"] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Lead Sources
        </h3>
        <div className="space-y-3">
          {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, cnt]) => {
            const pct = (cnt / maxSrc) * 100;
            return (
              <div key={src} className="flex items-center gap-3">
                <span className="text-gray-500 text-xs w-44 shrink-0 truncate font-medium">{src}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-800 text-xs font-bold w-10 text-right">{cnt}</span>
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
    const rows = filteredStates.map(([state, s]) => ({
      State: state, Total: s.total, Open: s.Open,
      Converted: s.Converted, Opportunity: s.Opportunity, Quotation: s.Quotation,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "India Leads");
    XLSX.writeFile(wb, "India_State_Leads.xlsx");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">India State-wise Lead Distribution</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {leads.length.toLocaleString()} total leads from India across {Object.keys(stateStats).length} states/cities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              className="bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-48"
              placeholder="Search state..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm hover:bg-emerald-100 transition-colors font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "State / City", "Leads", "Distribution", "Open", "Converted", "Opportunity", "Quotation"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-400 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-300" />
                    <span>Loading India lead data...</span>
                  </div>
                </td></tr>
              ) : filteredStates.map(([state, s], i) => (
                <tr key={state} className={cn("border-b border-gray-50 hover:bg-indigo-50/40 transition-colors", i % 2 !== 0 ? "bg-gray-50/30" : "")}>
                  <td className="px-4 py-3 text-gray-300 text-xs font-semibold w-10">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{state}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 text-base">{s.total}</td>
                  <td className="px-4 py-3 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-500"
                          style={{ width: `${Math.max(3, (s.total / maxTotal) * 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs w-12 text-right shrink-0">
                        {((s.total / Math.max(leads.length, 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{s.Open}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{s.Converted}</td>
                  <td className="px-4 py-3 text-violet-600 font-semibold">{s.Opportunity}</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">{s.Quotation}</td>
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
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-lead-details", country, status, industryType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (status) params.set("status", status);
      if (industryType) params.set("industry_type", industryType);
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

  const selectClass = "bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select value={country} onChange={e => setCountry(e.target.value)} className={selectClass}>
            <option value="">All Countries</option>
            {COUNTRIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
            <option value="">All Statuses</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={industryType} onChange={e => setIndustryType(e.target.value)} className={selectClass}>
            <option value="">All Industries</option>
            <option value="Textile">Textile</option>
            <option value="Non Textile">Non Textile</option>
          </select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Search company, email, mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
          <button onClick={exportLeads} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm hover:bg-emerald-100 transition-colors font-medium">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            <span className="text-indigo-600 font-bold">{filtered.length.toLocaleString()}</span> leads found
          </span>
          {filtered.length > 500 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              Showing top 500 — use filters to narrow down
            </span>
          )}
        </div>
        <div className="overflow-auto max-h-[550px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "Company", "Contact", "Email", "Mobile", "Status", "Source", "Industry", "City", "Country", "Date"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="text-center py-16 text-gray-300">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-300" />
                    <span>Loading leads...</span>
                  </div>
                </td></tr>
              ) : filtered.slice(0, 500).map((lead, i) => {
                const st = STATUS_STYLES[lead.status];
                return (
                  <tr key={i} className={cn("border-b border-gray-50 hover:bg-indigo-50/30 transition-colors", i % 2 !== 0 ? "bg-gray-50/30" : "")}>
                    <td className="px-3 py-2.5 text-gray-300 font-semibold">{i + 1}</td>
                    <td className="px-3 py-2.5 text-gray-800 font-semibold max-w-32 truncate">{lead.company_name || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{lead.lead_name || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-36 truncate">{lead.email_id || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lead.mobile_no || "—"}</td>
                    <td className="px-3 py-2.5">
                      {st ? (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", st.bg, st.text, st.border)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                          {lead.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">{lead.status || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lead.source || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lead.industry || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lead.city || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{lead.country || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{lead.creation ? String(lead.creation).split(" ")[0] : "—"}</td>
                  </tr>
                );
              })}
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
  const articles: any[] = data?.news ?? data?.articles ?? [];

  const selectClass = "bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-teal-500" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Industry News</h2>
            <p className="text-xs text-gray-400">AI-powered industry news and market insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMode("country")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "country" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              Country
            </button>
            <button onClick={() => setMode("state")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "state" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              India State
            </button>
          </div>
          {mode === "country" ? (
            <select value={country} onChange={e => setCountry(e.target.value)} className={selectClass}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <select value={state} onChange={e => setState(e.target.value)} className={selectClass}>
              {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl px-3 py-2 text-sm hover:bg-indigo-100 transition-colors font-medium">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Fetching..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
            <Wifi className="w-6 h-6 text-teal-400 animate-pulse" />
          </div>
          <p className="font-medium">Fetching industry news with AI...</p>
          <p className="text-sm text-gray-300">This may take a few seconds</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-300">
          <Newspaper className="w-10 h-10" />
          <p className="font-medium text-gray-500">No articles loaded yet</p>
          <p className="text-sm">Click Refresh to generate AI-powered news</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a: any, i: number) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-indigo-100 transition-all group">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">{a.title}</p>
              </div>
              {a.summary && (
                <p className="text-gray-500 text-xs mb-4 line-clamp-3 leading-relaxed">{a.summary}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">{a.source || a.date || "—"}</span>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
                    Read <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
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

  const selectClass = "bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-rose-500" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Competitor Analysis</h2>
            <p className="text-xs text-gray-400">AI-generated competitive intelligence by market</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMode("country")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "country" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              Country
            </button>
            <button onClick={() => setMode("state")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "state" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              India State
            </button>
          </div>
          {mode === "country" ? (
            <select value={country} onChange={e => setCountry(e.target.value)} className={selectClass}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <select value={state} onChange={e => setState(e.target.value)} className={selectClass}>
              {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-3 py-2 text-sm hover:bg-rose-100 transition-colors font-medium">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Analyzing..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <Target className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <p className="font-medium">Generating competitor analysis with AI...</p>
          <p className="text-sm text-gray-300">Analyzing market intelligence data</p>
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-300">
          <Building2 className="w-10 h-10" />
          <p className="font-medium text-gray-500">No analysis generated yet</p>
          <p className="text-sm">Click Refresh to generate AI competitor analysis</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {competitors.map((c: any, i: number) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-rose-100 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 text-base">{c.name}</p>
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-0.5 font-medium">
                      {c.website} <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {c.market_share && (
                  <span className="bg-violet-50 text-violet-700 border border-violet-200 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ml-2">
                    {c.market_share}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {c.recent_activities && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Recent Activities
                    </p>
                    <p className="text-xs text-blue-800 leading-relaxed">{c.recent_activities}</p>
                  </div>
                )}
                {c.technology_focus && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Technology Focus
                    </p>
                    <p className="text-xs text-emerald-800 leading-relaxed">{c.technology_focus}</p>
                  </div>
                )}
                {c.ad_platforms && (
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Ad Platforms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(c.ad_platforms) ? c.ad_platforms : [c.ad_platforms]).map((p: string) => (
                        <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-medium border border-gray-200">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; activeColor: string; dotColor: string }[] = [
  { id: "world-map",   label: "World Map",          icon: Globe,      activeColor: "bg-sky-600",    dotColor: "bg-sky-400" },
  { id: "overview",    label: "Lead Overview",       icon: Users,      activeColor: "bg-indigo-600", dotColor: "bg-indigo-400" },
  { id: "india-map",   label: "India States",        icon: Map,        activeColor: "bg-orange-500", dotColor: "bg-orange-400" },
  { id: "lead-details",label: "Lead Details",        icon: Filter,     activeColor: "bg-violet-600", dotColor: "bg-violet-400" },
  { id: "news",        label: "Industry News",       icon: Newspaper,  activeColor: "bg-teal-600",   dotColor: "bg-teal-400" },
  { id: "competitors", label: "Competitor Analysis", icon: Building2,  activeColor: "bg-rose-600",   dotColor: "bg-rose-400" },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<Tab>("world-map");
  const activeTabConfig = TABS.find(t => t.id === activeTab)!;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Megaphone className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Marketing</h1>
              <p className="text-xs text-gray-400">Lead intelligence · World map · India states · AI news & competitor analysis</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit flex-wrap shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? `${tab.activeColor} text-white shadow-md`
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <tab.icon className="w-4 h-4" style={{ width: 15, height: 15 }} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "world-map"    && <WorldMapTab />}
          {activeTab === "overview"     && <OverviewTab />}
          {activeTab === "india-map"    && <IndiaMapTab />}
          {activeTab === "lead-details" && <LeadDetailsTab />}
          {activeTab === "news"         && <NewsTab />}
          {activeTab === "competitors"  && <CompetitorTab />}
        </div>
      </div>
    </Layout>
  );
}
