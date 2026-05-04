import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Globe, MapPin, Newspaper, Users, TrendingUp, BarChart3,
  Filter, RefreshCw, Search, Building2,
  Megaphone, Target, Wifi, Map, X, Download, Info,
  ArrowUpRight, ArrowDownRight, ChevronRight, Layers, Calendar, FileText,
  UserCheck, Mail, Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import * as XLSX from "xlsx";
import { IndiaMap } from "@/components/IndiaMap";
import { FollowupCalendar } from "@/components/FollowupCalendar";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "world-map" | "overview" | "india-map" | "lead-details" | "news" | "competitors" | "followup" | "proposal-request" | "agent-details";

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
  { label: "Total",    key: "total",            color: "from-indigo-500 to-violet-600" },
  { label: "Open",     key: "Open",             color: "from-blue-400 to-blue-600" },
  { label: "Converted",key: "Converted",        color: "from-emerald-400 to-emerald-600" },
  { label: "Opportunity",key: "Opportunity",    color: "from-violet-400 to-violet-600" },
  { label: "Quotation",key: "Quotation",        color: "from-amber-400 to-amber-600" },
  { label: "Lead",     key: "Lead",             color: "from-sky-400 to-sky-600" },
  { label: "Replied",  key: "Replied",          color: "from-teal-400 to-teal-600" },
  { label: "Closed",   key: "Closed",           color: "from-slate-400 to-slate-600" },
  { label: "Lost",     key: "Lost Quotation",   color: "from-red-400 to-red-600" },
];

// ── Country centroids [longitude, latitude] ──────────────────────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "India":           [78.96, 20.59],
  "Saudi Arabia":    [45.08, 23.89],
  "United Arab Emirates": [53.85, 23.42],
  "UAE":             [53.85, 23.42],
  "Qatar":           [51.18, 25.35],
  "Kuwait":          [47.48, 29.31],
  "Bahrain":         [50.55, 26.07],
  "Oman":            [57.55, 21.51],
  "Jordan":          [36.24, 31.25],
  "Iran":            [53.69, 32.43],
  "Israel":          [34.85, 31.05],
  "Egypt":           [30.80, 26.82],
  "Libya":           [17.23, 26.34],
  "Tunisia":         [9.54, 33.89],
  "Algeria":         [1.66, 28.03],
  "Morocco":         [-7.09, 31.79],
  "Sudan":           [30.22, 12.86],
  "Kenya":           [37.91, 0.02],
  "Uganda":          [32.29, 1.37],
  "Ethiopia":        [40.49, 9.15],
  "Ghana":           [-1.02, 7.95],
  "Nigeria":         [8.68, 9.08],
  "South Africa":    [25.08, -29.00],
  "Zambia":          [27.85, -13.13],
  "Bangladesh":      [90.36, 23.68],
  "Sri Lanka":       [80.77, 7.87],
  "Nepal":           [84.12, 28.39],
  "Pakistan":        [69.35, 30.38],
  "Afghanistan":     [67.71, 33.94],
  "Indonesia":       [113.92, -0.79],
  "Malaysia":        [109.70, 4.21],
  "Singapore":       [103.82, 1.35],
  "Thailand":        [100.99, 15.87],
  "Vietnam":         [108.28, 14.06],
  "Philippines":     [121.77, 12.88],
  "Myanmar":         [95.96, 19.15],
  "Cambodia":        [104.99, 12.57],
  "China":           [104.20, 35.86],
  "Japan":           [138.25, 36.20],
  "South Korea":     [127.77, 35.91],
  "Taiwan":          [120.96, 23.70],
  "Kyrgyzstan":      [74.55, 41.21],
  "Uzbekistan":      [63.14, 41.38],
  "Kazakhstan":      [66.92, 48.02],
  "Turkey":          [35.24, 38.96],
  "Ukraine":         [31.17, 48.38],
  "Russia":          [105.32, 61.52],
  "Estonia":         [25.01, 58.60],
  "Poland":          [19.15, 51.92],
  "Slovakia":        [19.70, 48.67],
  "Bulgaria":        [25.49, 42.73],
  "Germany":         [10.45, 51.17],
  "United Kingdom":  [-3.44, 55.38],
  "UK":              [-3.44, 55.38],
  "France":          [2.21, 46.23],
  "Spain":           [-3.75, 40.46],
  "Portugal":        [-8.22, 39.40],
  "Italy":           [12.57, 41.87],
  "Belgium":         [4.47, 50.50],
  "Australia":       [133.78, -25.27],
  "United States":   [-95.71, 37.09],
  "USA":             [-95.71, 37.09],
  "Canada":          [-96.80, 60.00],
  "Mexico":          [-102.55, 23.63],
  "Colombia":        [-74.30, 4.57],
  "Ecuador":         [-77.00, -1.83],
  "Brazil":          [-51.92, -14.24],
  "Honduras":        [-86.62, 15.20],
  "El Salvador":     [-88.90, 13.79],
  "Guatemala":       [-90.23, 15.78],
};

// ── Color functions ───────────────────────────────────────────────────────────

function getMapColor(total: number): string {
  if (!total || total === 0) return "#e2e8f0";
  if (total >= 500) return "#1e40af";
  if (total >= 100) return "#2563eb";
  if (total >= 20)  return "#60a5fa";
  if (total >= 5)   return "#93c5fd";
  return "#bfdbfe";
}

function getBubbleSize(total: number): number {
  if (total >= 2000) return 22;
  if (total >= 500)  return 18;
  if (total >= 100)  return 15;
  if (total >= 20)   return 12;
  return 9;
}

// ── Inline News + Competitor Panel ────────────────────────────────────────────

function InlineCountryAnalysis({ country, isState = false }: { country: string; isState?: boolean }) {
  const newsQ = useQuery({
    queryKey: isState ? ["state-news-inline", country] : ["news-inline", country],
    queryFn: async () => {
      const ep = isState
        ? `/api/marketing/state-news?state=${encodeURIComponent(country)}`
        : `/api/marketing/news?country=${encodeURIComponent(country)}`;
      const r = await fetch(ep);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const compQ = useQuery({
    queryKey: isState ? ["state-comp-inline", country] : ["comp-inline", country],
    queryFn: async () => {
      const ep = isState
        ? `/api/marketing/state-competitor-analysis?state=${encodeURIComponent(country)}`
        : `/api/marketing/competitor-analysis?country=${encodeURIComponent(country)}`;
      const r = await fetch(ep);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const articles: any[] = newsQ.data?.news ?? newsQ.data?.articles ?? [];
  const competitors: any[] = compQ.data?.competitors ?? [];
  const title = country;

  function getDomain(url: string): string {
    try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", ""); }
    catch { return ""; }
  }

  return (
    <div className="grid md:grid-cols-2 gap-3 mt-3">
      {/* News panel */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-teal-50/60">
          <div className="flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold text-teal-800 text-xs uppercase tracking-wide">{title} — Industry News</span>
          </div>
          {newsQ.isLoading && <RefreshCw className="w-3 h-3 text-teal-400 animate-spin" />}
        </div>
        <div className="overflow-auto divide-y divide-gray-50" style={{ maxHeight: 280 }}>
          {newsQ.isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-300 text-xs">
              <Wifi className="w-4 h-4 animate-pulse text-teal-300" /> Fetching news...
            </div>
          ) : articles.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-300 text-xs gap-2">
              <Newspaper className="w-4 h-4" /> No articles available
            </div>
          ) : articles.map((a: any, i: number) => {
            const imgSrc = a.image || a.imageUrl || a.thumbnail || a.urlToImage || null;
            const sourceDomain = getDomain(a.url || a.sourceUrl || "");
            return (
              <div key={i} className="flex gap-3 px-3 py-2.5 hover:bg-teal-50/30 transition-colors group">
                {imgSrc ? (
                  <img src={imgSrc} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-lg shrink-0 bg-gradient-to-br from-teal-100 to-teal-200 border border-teal-100 flex items-center justify-center overflow-hidden">
                    {sourceDomain ? (
                      <img src={`https://logo.clearbit.com/${sourceDomain}`} alt="" className="w-8 h-8 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <Newspaper className="w-5 h-5 text-teal-400" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-[11px] leading-snug mb-1.5 group-hover:text-teal-700 transition-colors line-clamp-2">{a.title}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center bg-teal-50 text-teal-600 border border-teal-100 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide truncate max-w-[65%]">{a.source}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{a.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competitor panel */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-rose-50/60">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-bold text-rose-800 text-xs uppercase tracking-wide">{title} — Competitor Analysis</span>
          </div>
          {compQ.isLoading && <RefreshCw className="w-3 h-3 text-rose-400 animate-spin" />}
        </div>
        <div className="overflow-auto" style={{ maxHeight: 280 }}>
          {compQ.isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-300 text-xs">
              <Target className="w-4 h-4 animate-pulse text-rose-300" /> Analyzing competitors...
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-300 text-xs gap-2">
              <Building2 className="w-4 h-4" /> No competitor data
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-rose-50/40 border-b border-rose-100">
                <tr>
                  {["", "Competitor", "Activities", "Technology", "Campaign", "Website"].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-rose-400 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.map((c: any, i: number) => {
                  const domain = getDomain(c.website || "");
                  const techItems = (c.technology || "").split(/[,;•\n]+/).map((t: string) => t.trim()).filter(Boolean);
                  return (
                    <tr key={i} className={cn("border-b border-gray-50 hover:bg-rose-50/20 transition-colors align-top", i % 2 !== 0 ? "bg-gray-50/30" : "")}>
                      <td className="px-2 py-2">
                        {domain ? (
                          <img src={`https://logo.clearbit.com/${domain}`} alt="" className="w-6 h-6 rounded object-contain border border-gray-100"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-[9px]">{(c.name || "?")[0]}</div>
                        )}
                      </td>
                      <td className="px-2 py-2 font-bold text-gray-800 whitespace-nowrap text-[11px]">{c.name}</td>
                      <td className="px-2 py-2 text-gray-500 max-w-28 text-[10px] leading-relaxed">{c.activities}</td>
                      <td className="px-2 py-2 max-w-32">
                        {techItems.length > 0 ? (
                          <ul className="space-y-0.5">
                            {techItems.slice(0, 4).map((t: string, j: number) => (
                              <li key={j} className="flex items-start gap-1 text-[10px] text-blue-700">
                                <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        ) : <span className="text-gray-300 text-[10px]">—</span>}
                      </td>
                      <td className="px-2 py-2 text-gray-500 max-w-28 text-[10px] leading-relaxed">{c.campaign}</td>
                      <td className="px-2 py-2">
                        {c.website && c.website !== "#" ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 text-[10px]">
                            Visit <ArrowUpRight className="w-2.5 h-2.5" />
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── World Map Tab ─────────────────────────────────────────────────────────────

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country name normalization (world-atlas names → our ERP names)
const GEO_NAME_MAP: Record<string, string> = {
  "United States of America": "India", // won't match
  "United Kingdom": "United Kingdom",
  "United Arab Emirates": "UAE",
};

function WorldMapTab() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<"All" | "Textile" | "Non Textile">("All");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-leads"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/leads");
      return r.json();
    },
  });

  const { data: detailsData } = useQuery({
    queryKey: ["marketing-lead-details", "", "", industryFilter === "All" ? "" : industryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (industryFilter !== "All") params.set("industry_type", industryFilter);
      const r = await fetch(`/api/marketing/lead-details?${params}`);
      return r.json();
    },
  });

  const countryStats: Record<string, Record<string, number>> = data?.country_stats ?? {};
  const globalStats: Record<string, number> = data?.global_stats ?? {};
  const sourceStats: Record<string, number> = data?.source_stats ?? {};
  const leadStatusStats: Record<string, number> = data?.lead_status_stats ?? {};

  const selectedData = selectedCountry ? (countryStats[selectedCountry] ?? null) : null;
  const allLeads: any[] = detailsData?.leads ?? [];

  // Find top country for color scale
  const maxCountryLeads = Math.max(...Object.values(countryStats).map(s => s.total ?? 0), 1);

  // Markers: countries with leads that have known coords
  const markers = useMemo(() => {
    return Object.entries(countryStats)
      .filter(([name, s]) => (s.total ?? 0) > 0 && COUNTRY_COORDS[name])
      .map(([name, s]) => ({ name, total: s.total ?? 0, coords: COUNTRY_COORDS[name]! }))
      .sort((a, b) => b.total - a.total);
  }, [countryStats]);

  function handleGeoClick(name: string) {
    const total = countryStats[name]?.total ?? 0;
    if (total > 0) setSelectedCountry(selectedCountry === name ? null : name);
  }

  function exportLeads() {
    const ws = XLSX.utils.json_to_sheet(allLeads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Leads");
    XLSX.writeFile(wb, "All_Leads.xlsx");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main layout */}
      <div className="flex gap-3 items-start">
        {/* LEFT — Sources + Lead Status */}
        <div className="w-44 shrink-0 flex flex-col gap-2.5">
          {/* Lead Sources */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/70">
              <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">Lead Sources</p>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 200 }}>
              {Object.entries(sourceStats)
                .sort((a, b) => b[1] - a[1])
                .map(([src, cnt]) => (
                  <div key={src} className="flex items-center justify-between px-3 py-[5px] border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
                    <span className="text-[11px] text-gray-600 truncate font-medium leading-tight">{src === "null" || !src ? "null" : src}</span>
                    <span className="text-[11px] font-bold text-gray-800 ml-2 shrink-0 tabular-nums">{cnt}</span>
                  </div>
                ))}
            </div>
          </div>
          {/* Lead Status */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/70">
              <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">Lead Status</p>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 200 }}>
              {Object.entries(leadStatusStats)
                .sort((a, b) => b[1] - a[1])
                .map(([st, cnt]) => {
                  const style = STATUS_STYLES[st];
                  return (
                    <div key={st} className="flex items-center justify-between px-3 py-[5px] border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {style && <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />}
                        <span className={cn("text-[11px] truncate font-semibold leading-tight", style ? style.text : "text-gray-600")}>{st}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 ml-2 shrink-0 tabular-nums">{cnt}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* CENTER — Map */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white flex-wrap">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-bold text-gray-800 shrink-0">Global Lead Distribution</span>
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 ml-1">
              {(["All", "Textile", "Non Textile"] as const).map(f => (
                <button key={f} onClick={() => setIndustryFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                    industryFilter === f
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                  )}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => refetch()} className="ml-auto flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors font-semibold shrink-0">
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
            </button>
          </div>
          <div className="relative" style={{ height: 420 }}>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <div className="flex items-center gap-3.5 text-[10px] text-gray-500">
                {[
                  { color: "#1e40af", label: "500+" },
                  { color: "#2563eb", label: "100-500" },
                  { color: "#60a5fa", label: "20-100" },
                  { color: "#bfdbfe", label: "1-20" },
                  { color: "#e2e8f0", label: "None" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ background: color }} />
                    <span className="font-medium">{label}</span>
                  </span>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center text-gray-300 text-sm gap-2" style={{ height: 420 }}>
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" /> Loading map...
              </div>
            ) : (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 140, center: [10, 8] }}
                style={{ width: "100%", height: 420 }}
              >
                <ZoomableGroup>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name = geo.properties.name;
                        const erpName = name;
                        const stats = countryStats[erpName];
                        const total = stats?.total ?? 0;
                        const isSelected = selectedCountry === erpName;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isSelected ? "#6366f1" : getMapColor(total)}
                            stroke="#ffffff"
                            strokeWidth={0.4}
                            style={{
                              default: { outline: "none", cursor: total > 0 ? "pointer" : "default" },
                              hover: { fill: total > 0 ? "#818cf8" : "#d1d5db", outline: "none", transition: "fill 0.15s" },
                              pressed: { outline: "none" },
                            }}
                            onClick={() => handleGeoClick(erpName)}
                            onMouseEnter={(e) => total > 0 && setTooltip({ name: `${erpName}: ${total} leads`, x: (e as any).clientX, y: (e as any).clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        );
                      })
                    }
                  </Geographies>
                  {/* Bubble markers with country labels */}
                  {markers.map(({ name, total, coords }) => {
                    const r = getBubbleSize(total);
                    const isSelected = selectedCountry === name;
                    // Shorten long names
                    const shortName = name.length > 12 ? name.split(" ")[0] : name;
                    return (
                      <Marker key={name} coordinates={coords}>
                        {/* Bubble */}
                        <circle
                          r={r}
                          fill={isSelected ? "#3730a3" : "#2563eb"}
                          stroke="none"
                          style={{
                            cursor: "pointer",
                            filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.28))",
                          }}
                          onClick={() => setSelectedCountry(selectedCountry === name ? null : name)}
                          onMouseEnter={(e) => setTooltip({ name: `${name}: ${total} leads`, x: (e as any).clientX, y: (e as any).clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                        {/* Count */}
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: total >= 1000 ? r * 0.6 : r * 0.76,
                            fontWeight: "700",
                            fill: "white",
                            pointerEvents: "none",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                        </text>
                        {/* Country name */}
                        <text
                          textAnchor="middle"
                          y={r + 7}
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 6,
                            fontWeight: "600",
                            fill: "#1e3a8a",
                            pointerEvents: "none",
                          }}
                        >
                          {shortName}
                        </text>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>
            )}
          </div>

          {tooltip && (
            <div
              className="fixed z-50 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none shadow-xl font-medium"
              style={{ left: tooltip.x + 14, top: tooltip.y - 28 }}
            >
              {tooltip.name}
            </div>
          )}
        </div>

        {/* RIGHT — Filter stats + Top Markets */}
        <div className="w-48 shrink-0 flex flex-col gap-2.5">
          {/* Stats panel */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-indigo-600">
              <p className="text-[10px] font-extrabold text-white uppercase tracking-widest">
                {selectedCountry ? selectedCountry : "Filtered"}
              </p>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 220 }}>
              {(() => {
                const rows: [string, number][] = selectedData
                  ? Object.entries(selectedData).map(([k, v]) => [k === "total" ? "Total Leads" : k, v as number])
                  : [
                      ["Total Leads", globalStats.total],
                      ["Converted", globalStats.Converted],
                      ["Quotation", globalStats.Quotation],
                      ["Lead", globalStats.Lead],
                      ["Open", globalStats.Open],
                      ["Opportunity", globalStats.Opportunity],
                      ["Replied", globalStats.Replied],
                      ["Closed", globalStats.Closed],
                      ["Lost Quotation", globalStats["Lost Quotation"]],
                      ["Do Not Contact", globalStats["Do Not Contact"]],
                    ];
                return rows.map(([label, val]) => {
                  const isTotal = label === "Total Leads";
                  const st = STATUS_STYLES[label];
                  return (
                    <div key={label} className={cn(
                      "flex justify-between items-center px-3 py-[5px] border-b border-gray-50",
                      isTotal ? "bg-blue-50/50" : "hover:bg-gray-50/60"
                    )}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!isTotal && st && <span className={cn("w-2 h-2 rounded-full shrink-0", st.dot)} />}
                        <span className={cn(
                          "text-[11px] leading-tight truncate",
                          isTotal ? "text-gray-800 font-bold" : st ? cn("font-semibold", st.text) : "text-gray-500 font-medium"
                        )}>{label}</span>
                      </div>
                      <span className={cn(
                        "font-bold tabular-nums shrink-0 ml-1",
                        isTotal ? "text-blue-600 text-[15px]" : "text-[11px] text-gray-800"
                      )}>{isLoading ? "—" : (val ?? 0)}</span>
                    </div>
                  );
                });
              })()}
            </div>
            {selectedCountry && (
              <button
                onClick={() => setSelectedCountry(null)}
                className="w-full text-[11px] text-gray-400 hover:text-red-500 py-1.5 flex items-center justify-center gap-1 border-t border-gray-100 hover:bg-red-50 transition-colors font-semibold"
              >
                <X className="w-3 h-3" /> Clear selection
              </button>
            )}
          </div>
          {/* Top Markets */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/70">
              <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">Top Markets</p>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 180 }}>
              {Object.entries(countryStats)
                .sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0))
                .slice(0, 10)
                .map(([c, s], i) => (
                  <button key={c} onClick={() => setSelectedCountry(selectedCountry === c ? null : c)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-[5px] transition-all border-b border-gray-50",
                      selectedCountry === c ? "bg-indigo-600 text-white" : "hover:bg-indigo-50/40 text-gray-700"
                    )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold w-3.5 shrink-0 tabular-nums",
                        selectedCountry === c ? "text-indigo-200" : "text-gray-300"
                      )}>{i + 1}</span>
                      <span className="truncate font-semibold text-[11px]">{c}</span>
                    </div>
                    <span className={cn("font-bold tabular-nums text-[11px] ml-1 shrink-0", selectedCountry === c ? "text-white" : "text-gray-800")}>{s.total}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inline news + competitor when country selected */}
      {selectedCountry && (
        <InlineCountryAnalysis country={selectedCountry} />
      )}

      {/* All Leads Data */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50 cursor-pointer"
          onClick={() => setShowTable(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-gray-800 text-sm">All Leads Data</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{allLeads.length} leads</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); exportLeads(); }}
              className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5 text-xs hover:bg-emerald-100 transition-colors font-semibold">
              <Download className="w-3 h-3" /> Export CSV
            </button>
            <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", showTable && "rotate-90")} />
          </div>
        </div>
        {showTable && (
          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  {["#", "Company", "Contact", "Email", "Mobile", "Status", "Source", "Country", "Date"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeads.slice(0, 500).map((l: any, i: number) => {
                  const st = STATUS_STYLES[l.status];
                  return (
                    <tr key={i} className={cn("border-b border-gray-50 hover:bg-indigo-50/20", i % 2 !== 0 ? "bg-gray-50/20" : "")}>
                      <td className="px-3 py-2 text-gray-300 font-semibold">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 max-w-32 truncate">{l.company_name || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{l.lead_name || "—"}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-36 truncate">{l.email_id || "—"}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.mobile_no || "—"}</td>
                      <td className="px-3 py-2">
                        {st ? (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold", st.bg, st.text, st.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{l.status}
                          </span>
                        ) : <span className="text-gray-400">{l.status || "—"}</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{l.source || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{l.country || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{l.creation ? String(l.creation).split(" ")[0] : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
        <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-semibold bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {KPI_CONFIG.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : (globalStats[kpi.key] ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

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
                <tr key={country} className={cn(
                  "border-b border-gray-50 hover:bg-indigo-50/50 cursor-pointer transition-colors",
                  selectedCountry === country ? "bg-indigo-50" : i % 2 !== 0 ? "bg-gray-50/30" : "bg-white"
                )} onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}>
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

      {/* Inline analysis on country click */}
      {selectedCountry && <InlineCountryAnalysis country={selectedCountry} />}

      {/* Source Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Lead Sources
        </h3>
        <div className="space-y-3">
          {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([src, cnt]) => (
            <div key={src} className="flex items-center gap-3">
              <span className="text-gray-500 text-xs w-44 shrink-0 truncate font-medium">{src}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${(cnt / maxSrc) * 100}%` }} />
              </div>
              <span className="text-gray-800 text-xs font-bold w-10 text-right">{cnt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── India Map Tab ─────────────────────────────────────────────────────────────

function IndiaMapTab() {
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

  const globalStats: Record<string, number> = useMemo(() => {
    const s: Record<string, number> = { total: leads.length };
    for (const lead of leads) {
      const st = lead.status || "Unknown";
      s[st] = (s[st] || 0) + 1;
    }
    return s;
  }, [leads]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">India State-wise Lead Distribution</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Interactive map · click any state to explore leads + industry news + competitor analysis
          </p>
        </div>
      </div>
      <IndiaMap
        stateStats={stateStats}
        leads={leads}
        isLoading={isLoading}
        globalStats={globalStats}
      />
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
          <button onClick={exportLeads} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm hover:bg-emerald-100 transition-colors font-semibold">
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
                          <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{lead.status}
                        </span>
                      ) : <span className="text-gray-400">{lead.status || "—"}</span>}
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
            <p className="text-xs text-gray-400">AI-powered water treatment industry news</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMode("country")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "country" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500")}>Country</button>
            <button onClick={() => setMode("state")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "state" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500")}>India State</button>
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
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl px-3 py-2 text-sm hover:bg-indigo-100 transition-colors font-semibold">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Fetching..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Wifi className="w-8 h-8 text-teal-300 animate-pulse" />
          <p className="font-medium">Fetching industry news with AI...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
          <Newspaper className="w-10 h-10" />
          <p className="font-medium text-gray-500">Click Refresh to generate AI-powered news</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a: any, i: number) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-teal-100 transition-all group">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-3 group-hover:text-indigo-700 transition-colors">{a.title}</p>
              </div>
              <div className="flex items-center justify-between text-xs mt-auto">
                <span className="text-gray-300 font-medium">{a.source}</span>
                <span className="text-gray-300">{a.date}</span>
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
            <button onClick={() => setMode("country")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "country" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500")}>Country</button>
            <button onClick={() => setMode("state")} className={cn("px-4 py-1.5 rounded-lg text-sm transition-all font-medium", mode === "state" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500")}>India State</button>
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
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-3 py-2 text-sm hover:bg-rose-100 transition-colors font-semibold">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Analyzing..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Target className="w-8 h-8 text-rose-300 animate-pulse" />
          <p className="font-medium">Generating competitor analysis with AI...</p>
        </div>
      ) : competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
          <Building2 className="w-10 h-10" />
          <p className="font-medium text-gray-500">Click Refresh to generate AI competitor analysis</p>
        </div>
      ) : (
        /* Table view like reference */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  {["Competitor", "Activities", "Technology", "Campaign", "Website", "Platform"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.map((c: any, i: number) => (
                  <tr key={i} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", i % 2 !== 0 ? "bg-gray-50/40" : "")}>
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap min-w-32">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-52 leading-relaxed">{c.activities}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-52 leading-relaxed">{c.technology}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-52 leading-relaxed">{c.campaign}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.website && c.website !== "#" ? (
                        <a href={c.website} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-xs">
                          Visit <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{c.ad_platform || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proposal Request Tab ──────────────────────────────────────────────────────

const PROPOSAL_STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Approved":                             { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Pending":                              { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400" },
  "Rejected":                             { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500" },
  "Draft":                                { bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
  "Clarifications required from Marketing team": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
};

const PROPOSAL_STATUS_ORDER = [
  "Clarifications required from Marketing team",
  "Proposal sent to Marketing team",
  "Elevated to Process team",
  "Elevated to Proposal team",
  "Proposal Sent to Customer",
  "Unknown",
  "Awaiting for Chemin offer",
  "Proposal sent",
  "Cost Working Completed",
];

function ProposalRequestTab() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["proposal-request-tab"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/proposal-request");
      return r.json();
    },
    staleTime: 60_000,
  });

  const proposals: any[] = Array.isArray(data?.message) ? data.message : Array.isArray(data) ? data : [];

  const typeOptions = useMemo(() => Array.from(new Set(proposals.map((p: any) => p.type_of_proposal).filter(Boolean))).sort() as string[], [proposals]);

  // Build status cards: ordered known statuses first, then any extras from data
  const statusCards = useMemo(() => {
    const counts: Record<string, number> = {};
    proposals.forEach((p: any) => {
      const s = p.proposal_status || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    const ordered = PROPOSAL_STATUS_ORDER.filter(s => counts[s] !== undefined).map(s => ({ label: s, count: counts[s] }));
    const extra = Object.keys(counts).filter(s => !PROPOSAL_STATUS_ORDER.includes(s)).map(s => ({ label: s, count: counts[s] }));
    return [...ordered, ...extra];
  }, [proposals]);

  const filtered = useMemo(() => proposals
    .filter((p: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [p.company_name, p.name, p.customer_requirement, p.type_of_proposal, p.proposal_status].some(v =>
        String(v ?? "").toLowerCase().includes(q)
      );
      const matchStatus = !filterStatus || (p.proposal_status || "Unknown") === filterStatus;
      const matchType   = !filterType   || p.type_of_proposal === filterType;
      return matchSearch && matchStatus && matchType;
    })
    .sort((a: any, b: any) => {
      const da = a.raised_date || a.date || "";
      const db = b.raised_date || b.date || "";
      return sortDir === "desc" ? db.localeCompare(da) : da.localeCompare(db);
    }), [proposals, search, filterStatus, filterType, sortDir]);

  function exportData() {
    const rows = filtered.map((p: any) => ({
      Name: p.name || "",
      "Raised Date": p.raised_date || "",
      "Company Name": p.company_name || "",
      "Type of Proposal": p.type_of_proposal || "",
      "Plant Capacity (m³/day)": p.plant_capacity_m3day || "",
      "Customer Requirement": p.customer_requirement || "",
      "Proposal Status": p.proposal_status || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proposal Requests");
    XLSX.writeFile(wb, "Proposal_Requests.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Proposal Requests</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {proposals.length} total proposals · click a card to filter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors font-semibold shadow-sm">
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportData}
            className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 border border-emerald-700 rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors font-semibold shadow-sm">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Clickable Status Cards */}
      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm animate-pulse w-44 h-8" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {statusCards.map(card => {
            const isActive = filterStatus === card.label;
            return (
              <button
                key={card.label}
                onClick={() => setFilterStatus(isActive ? "" : card.label)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all whitespace-nowrap",
                  isActive
                    ? "bg-indigo-600 border-indigo-700 text-white shadow-indigo-100"
                    : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50"
                )}
              >
                <span className={cn("text-sm font-black tabular-nums", isActive ? "text-white" : "text-gray-900")}>{card.count}</span>
                {card.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
            <input
              className="bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all w-52"
              placeholder="Search company, requirement..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className={cn("appearance-none bg-white border rounded-lg pl-7 pr-6 py-1.5 text-xs outline-none focus:border-indigo-400 transition-all cursor-pointer max-w-44",
                filterType ? "border-indigo-400 text-indigo-700 font-semibold" : "border-gray-200 text-gray-600")}>
              <option value="">All Types</option>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(filterStatus || filterType || search) && (
            <button onClick={() => { setFilterStatus(""); setFilterType(""); setSearch(""); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition-colors">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          {filterStatus && (
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1 font-semibold max-w-52 truncate">
              {filterStatus}
            </span>
          )}
          <div className="flex-1" />
          <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors font-semibold">
            {sortDir === "desc" ? "Newest first" : "Oldest first"}
          </button>
          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">{filtered.length} entries</span>
        </div>

        <div className="overflow-auto" style={{ maxHeight: 520 }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "Name", "Raised Date", "Company", "Type", "Capacity (m³/d)", "Requirement", "Status"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                    <span className="text-xs">Loading proposals...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <span className="text-xs text-gray-400">No proposals found</span>
                </td></tr>
              ) : filtered.map((p: any, i: number) => {
                const st = PROPOSAL_STATUS_STYLES[p.proposal_status];
                return (
                  <tr key={i} className={cn("border-b border-gray-50 transition-colors hover:bg-indigo-50/30", i % 2 !== 0 ? "bg-gray-50/20" : "")}>
                    <td className="px-3 py-2.5 text-gray-300 font-semibold text-[11px]">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-indigo-600 text-[11px] whitespace-nowrap">{p.name || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px] whitespace-nowrap tabular-nums">{p.raised_date || p.date || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 text-[11px] max-w-44 truncate">{p.company_name || "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">
                      {p.type_of_proposal ? (
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-semibold">{p.type_of_proposal}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-[11px] whitespace-nowrap font-medium tabular-nums">{p.plant_capacity_m3day || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px] max-w-48 truncate">{p.customer_requirement || "—"}</td>
                    <td className="px-3 py-2.5">
                      {p.proposal_status ? (
                        st ? (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap", st.bg, st.text, st.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.dot)} />
                            {p.proposal_status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-gray-50 text-gray-600 border-gray-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
                            {p.proposal_status}
                          </span>
                        )
                      ) : <span className="text-gray-300">—</span>}
                    </td>
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

// ── Agent Details Tab ─────────────────────────────────────────────────────────

function AgentDetailsTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["marketing-agent-details"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/agent-details");
      return r.json();
    },
  });

  const agents: any[] = data?.agents ?? [];

  // Discover columns dynamically. Prefer a curated set if present, otherwise show every field.
  const PREFERRED_KEYS = [
    "agent_name", "name", "first_name", "last_name", "designation", "department",
    "email", "email_id", "mobile_no", "phone", "country", "state", "city", "status",
  ];
  const allKeys = useMemo(() => {
    const set = new Set<string>();
    agents.forEach(a => Object.keys(a || {}).forEach(k => set.add(k)));
    return Array.from(set);
  }, [agents]);
  const HIDDEN = new Set(["owner", "creation", "modified", "modified_by", "docstatus", "idx", "_assign", "_comments", "_user_tags", "_liked_by", "doctype", "parent", "parentfield", "parenttype"]);
  const visibleKeys = useMemo(() => {
    if (!agents.length) return [];
    const present = PREFERRED_KEYS.filter(k => allKeys.includes(k));
    if (present.length >= 4) return present;
    return allKeys.filter(k => !HIDDEN.has(k)).slice(0, 12);
  }, [allKeys, agents.length]);

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(a || {}).some(v => String(v ?? "").toLowerCase().includes(q));
  });

  function exportAgents() {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agents");
    XLSX.writeFile(wb, "Agent_Details.xlsx");
  }

  const labelOf = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Search agent name, email, mobile, location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 hover:text-cyan-600 hover:border-cyan-200 transition-all"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || isFetching) && "animate-spin")} />
          </button>
          <button
            onClick={exportAgents}
            disabled={!filtered.length}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm hover:bg-emerald-100 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <a
            href="https://erp.wttint.com/app/agent-details"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-600 transition-colors"
            title="Open in ERP"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> View in ERP
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            <span className="text-cyan-600 font-bold">{filtered.length.toLocaleString()}</span>{" "}
            agent{filtered.length !== 1 ? "s" : ""}
          </span>
          {filtered.length > 500 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              Showing top 500 — refine your search
            </span>
          )}
        </div>

        <div className="overflow-auto max-h-[600px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
              <span className="text-sm">Loading agents…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">No agent details found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? "Try a different search term." : "Create agents in the ERP to see them here."}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">#</th>
                  {visibleKeys.map(k => (
                    <th key={k} className="px-3 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                      {labelOf(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((a, i) => (
                  <tr key={a.name || i} className={cn("border-b border-gray-50 hover:bg-cyan-50/30 transition-colors", i % 2 !== 0 ? "bg-gray-50/30" : "")}>
                    <td className="px-3 py-2.5 text-gray-300 font-semibold">{i + 1}</td>
                    {visibleKeys.map(k => {
                      const v = a?.[k];
                      const str = v === null || v === undefined || v === "" ? "—" : String(v);
                      const isEmail = /email/i.test(k) && str !== "—";
                      const isPhone = /(mobile|phone)/i.test(k) && str !== "—";
                      return (
                        <td key={k} className="px-3 py-2.5 text-gray-700 whitespace-nowrap max-w-xs truncate" title={str}>
                          {isEmail ? (
                            <a href={`mailto:${str}`} className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
                              <Mail className="w-3 h-3" /> {str}
                            </a>
                          ) : isPhone ? (
                            <a href={`tel:${str}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                              <Phone className="w-3 h-3" /> {str}
                            </a>
                          ) : (
                            str
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; activeColor: string }[] = [
  { id: "world-map",        label: "World Map",          icon: Globe,      activeColor: "bg-sky-600" },
  { id: "overview",         label: "Lead Overview",       icon: Users,      activeColor: "bg-indigo-600" },
  { id: "india-map",        label: "India States",        icon: Map,        activeColor: "bg-orange-500" },
  { id: "lead-details",     label: "Lead Details",        icon: Filter,     activeColor: "bg-violet-600" },
  { id: "news",             label: "Industry News",       icon: Newspaper,  activeColor: "bg-teal-600" },
  { id: "competitors",      label: "Competitors",         icon: Building2,  activeColor: "bg-rose-600" },
  { id: "followup",         label: "Followup Calendar",   icon: Calendar,   activeColor: "bg-purple-600" },
  { id: "proposal-request", label: "Proposal Requests",  icon: FileText,   activeColor: "bg-emerald-600" },
  { id: "agent-details",    label: "Agent Details",       icon: UserCheck,  activeColor: "bg-cyan-600" },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<Tab>("world-map");

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Megaphone className="text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Marketing Department</h1>
            <p className="text-xs text-gray-400">Lead intelligence · World map · India states · AI news & competitors · Followup calendar</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit flex-wrap shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? `${tab.activeColor} text-white shadow-md`
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <tab.icon style={{ width: 15, height: 15 }} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "world-map"        && <WorldMapTab />}
          {activeTab === "overview"         && <OverviewTab />}
          {activeTab === "india-map"        && <IndiaMapTab />}
          {activeTab === "lead-details"     && <LeadDetailsTab />}
          {activeTab === "news"             && <NewsTab />}
          {activeTab === "competitors"      && <CompetitorTab />}
          {activeTab === "followup"         && <FollowupCalendar />}
          {activeTab === "proposal-request" && <ProposalRequestTab />}
          {activeTab === "agent-details"    && <AgentDetailsTab />}
        </div>
      </div>
    </Layout>
  );
}
