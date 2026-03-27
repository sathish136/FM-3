import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Globe, MapPin, Newspaper, Users, TrendingUp, BarChart3,
  Filter, ExternalLink, RefreshCw, Search, ChevronDown, Building2,
  Megaphone, Target, Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "lead-details" | "news" | "competitors";

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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: Overview (Lead stats from ERP)
// ─────────────────────────────────────────────
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
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Global Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Leads" value={globalStats.total ?? 0} icon={Users} color="bg-sky-500/20 text-sky-400" />
            <StatCard label="Open" value={globalStats.Open ?? 0} icon={Target} color="bg-blue-500/20 text-blue-400" />
            <StatCard label="Converted" value={globalStats.Converted ?? 0} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-400" />
            <StatCard label="Opportunity" value={globalStats.Opportunity ?? 0} icon={Megaphone} color="bg-violet-500/20 text-violet-400" />
            <StatCard label="Quotation" value={globalStats.Quotation ?? 0} icon={BarChart3} color="bg-amber-500/20 text-amber-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Country Table */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-medium text-white">Country Breakdown</span>
                <div className="ml-auto relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none w-36"
                  />
                </div>
              </div>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-2 text-white/50">Country</th>
                      <th className="text-center px-2 py-2 text-white/50">Total</th>
                      <th className="text-center px-2 py-2 text-white/50">Open</th>
                      <th className="text-center px-2 py-2 text-white/50">Converted</th>
                      <th className="text-center px-2 py-2 text-white/50">Quotation</th>
                      <th className="text-center px-2 py-2 text-white/50">Opportunity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountries.map(([country, stats]) => (
                      <tr
                        key={country}
                        onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                        className={cn(
                          "border-b border-white/5 cursor-pointer transition-colors",
                          selectedCountry === country ? "bg-indigo-500/10" : "hover:bg-white/5"
                        )}
                      >
                        <td className="px-4 py-2 text-white font-medium">{country}</td>
                        <td className="text-center px-2 py-2 text-sky-300 font-semibold">{stats.total}</td>
                        <td className="text-center px-2 py-2 text-blue-300">{stats.Open ?? 0}</td>
                        <td className="text-center px-2 py-2 text-emerald-300">{stats.Converted ?? 0}</td>
                        <td className="text-center px-2 py-2 text-amber-300">{stats.Quotation ?? 0}</td>
                        <td className="text-center px-2 py-2 text-violet-300">{stats.Opportunity ?? 0}</td>
                      </tr>
                    ))}
                    {filteredCountries.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-white/30">No data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Lead Sources</span>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(sourceStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([src, count]) => {
                    const total = globalStats.total || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={src}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/70 truncate max-w-[140px]">{src || "—"}</span>
                          <span className="text-white font-medium ml-2">{count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full">
                          <div
                            className="h-1.5 bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(sourceStats).length === 0 && (
                  <p className="text-white/30 text-xs text-center py-4">No source data</p>
                )}
              </div>
            </div>
          </div>

          {/* Status summary row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {Object.entries(globalStats)
              .filter(([k]) => k !== "total")
              .map(([status, count]) => (
                <div
                  key={status}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-center",
                    STATUS_COLORS[status] ?? "bg-white/5 text-white/60 border-white/10"
                  )}
                >
                  <p className="text-base font-bold">{count as number}</p>
                  <p className="text-[10px] leading-tight mt-0.5 opacity-80">{status}</p>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: Lead Details (filterable table)
// ─────────────────────────────────────────────
function LeadDetailsTab() {
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [applied, setApplied] = useState(false);
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  if (industryType) params.set("industry_type", industryType);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["marketing-lead-details", country, status, source, industryType],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/lead-details?${params.toString()}`);
      return r.json();
    },
    enabled: applied,
  });

  const leads: any[] = (data?.leads ?? []).filter((l: any) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      (l.lead_name || "").toLowerCase().includes(s) ||
      (l.company_name || "").toLowerCase().includes(s) ||
      (l.country || "").toLowerCase().includes(s) ||
      (l.email_id || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Filter Leads</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="">All Countries</option>
              {COUNTRIES.filter(c => c !== "Global").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="">All Statuses</option>
              {["Open", "Lead", "Replied", "Opportunity", "Quotation", "Converted", "Closed", "Lost Quotation", "Do Not Contact"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Industry</label>
            <select
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="">All Industries</option>
              <option value="Textile">Textile</option>
              <option value="Non Textile">Non Textile</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Source</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Website"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => { setApplied(true); refetch(); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {applied && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search leads..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none"
              />
            </div>
            <span className="text-xs text-white/40">{leads.length} results</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0f0f1a]">
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-white/50">Name</th>
                      <th className="text-left px-4 py-3 text-white/50">Company</th>
                      <th className="text-left px-4 py-3 text-white/50">Country</th>
                      <th className="text-left px-4 py-3 text-white/50">Status</th>
                      <th className="text-left px-4 py-3 text-white/50">Source</th>
                      <th className="text-left px-4 py-3 text-white/50">Industry</th>
                      <th className="text-left px-4 py-3 text-white/50">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 text-white font-medium">{lead.lead_name || "—"}</td>
                        <td className="px-4 py-2.5 text-white/70">{lead.company_name || "—"}</td>
                        <td className="px-4 py-2.5 text-white/70">{lead.country || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full border text-[10px] font-medium",
                            STATUS_COLORS[lead.status] ?? "bg-white/5 text-white/50 border-white/10"
                          )}>
                            {lead.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-white/70">{lead.source || "—"}</td>
                        <td className="px-4 py-2.5 text-white/70">{lead.industry || "—"}</td>
                        <td className="px-4 py-2.5 text-white/50">{lead.email_id || "—"}</td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-white/30">No leads found for selected filters</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!applied && (
        <div className="flex flex-col items-center justify-center h-40 text-white/30">
          <Users className="w-8 h-8 mb-2" />
          <p className="text-sm">Select filters and click Apply to view leads</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: Industry News
// ─────────────────────────────────────────────
function NewsTab() {
  const [mode, setMode] = useState<"country" | "state">("country");
  const [country, setCountry] = useState("Global");
  const [state, setState] = useState("Tamil Nadu");
  const [fetched, setFetched] = useState(false);

  const queryKey = mode === "country"
    ? ["marketing-news-country", country]
    : ["marketing-news-state", state];

  const fetchUrl = mode === "country"
    ? `/api/marketing/news?country=${encodeURIComponent(country)}`
    : `/api/marketing/state-news?state=${encodeURIComponent(state)}`;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await fetch(fetchUrl);
      return r.json();
    },
    enabled: fetched,
  });

  const articles: any[] = data?.news ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-medium text-white">Water Treatment Industry News</span>
          <span className="text-xs text-white/40 ml-1">— AI Generated</span>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("country")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === "country" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
            )}
          >
            By Country
          </button>
          <button
            onClick={() => setMode("state")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === "state" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
            )}
          >
            By Indian State
          </button>
        </div>
        <div className="flex gap-3 items-end">
          {mode === "country" ? (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none min-w-[160px]"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Indian State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none min-w-[200px]"
              >
                {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={() => { setFetched(true); refetch(); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Newspaper className="w-3.5 h-3.5" />}
            Fetch News
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-white/40">Generating AI news articles...</p>
        </div>
      )}

      {!isLoading && fetched && (
        <div className="space-y-3">
          {articles.map((a: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-white font-medium leading-snug">{a.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-white/40">{a.source}</span>
                    <span className="text-xs text-white/30">·</span>
                    <span className="text-xs text-white/40">{a.date}</span>
                  </div>
                </div>
                {a.link && a.link !== "#" && (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <div className="text-center py-10 text-white/30">
              <Newspaper className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No articles generated. Try again.</p>
            </div>
          )}
        </div>
      )}

      {!fetched && (
        <div className="flex flex-col items-center justify-center h-40 text-white/30">
          <Newspaper className="w-8 h-8 mb-2" />
          <p className="text-sm">Select a location and click Fetch News</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: Competitor Analysis
// ─────────────────────────────────────────────
function CompetitorTab() {
  const [mode, setMode] = useState<"country" | "state">("country");
  const [country, setCountry] = useState("Global");
  const [state, setState] = useState("Tamil Nadu");
  const [fetched, setFetched] = useState(false);

  const queryKey = mode === "country"
    ? ["marketing-competitors-country", country]
    : ["marketing-competitors-state", state];

  const fetchUrl = mode === "country"
    ? `/api/marketing/competitor-analysis?country=${encodeURIComponent(country)}`
    : `/api/marketing/state-competitor-analysis?state=${encodeURIComponent(state)}`;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await fetch(fetchUrl);
      return r.json();
    },
    enabled: fetched,
  });

  const competitors: any[] = data?.competitors ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">Competitor Analysis</span>
          <span className="text-xs text-white/40 ml-1">— AI Generated</span>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("country")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === "country" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
            )}
          >
            By Country
          </button>
          <button
            onClick={() => setMode("state")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === "state" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"
            )}
          >
            By Indian State
          </button>
        </div>
        <div className="flex gap-3 items-end">
          {mode === "country" ? (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none min-w-[160px]"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Indian State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none min-w-[200px]"
              >
                {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={() => { setFetched(true); refetch(); }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
            Analyze
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-xs text-white/40">Generating competitor analysis...</p>
        </div>
      )}

      {!isLoading && fetched && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {competitors.map((c: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-violet-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {c.ad_platform}
                  </span>
                </div>
                {c.website && (
                  <a href={c.website} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Activities</p>
                  <p className="text-xs text-white/70">{c.activities}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Technology</p>
                  <p className="text-xs text-white/70">{c.technology}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">Campaign</p>
                  <p className="text-xs text-white/70">{c.campaign}</p>
                </div>
              </div>
            </div>
          ))}
          {competitors.length === 0 && (
            <div className="col-span-2 text-center py-10 text-white/30">
              <Building2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No competitors found. Try again.</p>
            </div>
          )}
        </div>
      )}

      {!fetched && (
        <div className="flex flex-col items-center justify-center h-40 text-white/30">
          <Building2 className="w-8 h-8 mb-2" />
          <p className="text-sm">Select a location and click Analyze</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Marketing Page
// ─────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "overview", label: "Lead Overview", icon: Users, color: "text-sky-400" },
  { id: "lead-details", label: "Lead Details", icon: Filter, color: "text-indigo-400" },
  { id: "news", label: "Industry News", icon: Newspaper, color: "text-teal-400" },
  { id: "competitors", label: "Competitor Analysis", icon: Building2, color: "text-violet-400" },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
          <p className="text-white/40 text-sm ml-11">Lead intelligence, industry news & competitor analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "lead-details" && <LeadDetailsTab />}
        {activeTab === "news" && <NewsTab />}
        {activeTab === "competitors" && <CompetitorTab />}
      </div>
    </Layout>
  );
}
