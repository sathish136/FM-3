import { Layout } from "@/components/Layout";
import { Panel, OPEN_LEAD_COLS } from "@/pages/SalesDashboard";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, RefreshCw, Sparkles, UserCheck, MapPin, Phone, Mail, Building2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DirUser = { id: string; name: string; avatar: string | null };

const COLOR_PALETTE = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-500 to-blue-600",
  "from-lime-500 to-green-600",
  "from-yellow-500 to-amber-600",
];
function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < (s ?? "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length]!;
}
function initialsFor(name: string): string {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function Leads() {
  const { user } = useAuth();
  const isAgent = user?.isAgent === true;

  const leadsUrl = useMemo(() => {
    const base = `${BASE}/api/sales-dashboard/open_leads`;
    if (isAgent && user?.email) {
      return `${base}?agent_email=${encodeURIComponent(user.email)}`;
    }
    return base;
  }, [isAgent, user?.email]);

  const { data, isFetching, refetch } = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "open_leads", isAgent ? user?.email : "all"],
    queryFn: async () => {
      const r = await fetch(leadsUrl);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    staleTime: 60_000,
  });
  const total = data?.total_count ?? 0;

  const { data: users } = useQuery<DirUser[]>({
    queryKey: ["users", "mention", "all", 1000],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/users/mention?q=&limit=1000`);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  const userMap = useMemo(() => {
    const m = new Map<string, DirUser>();
    (users ?? []).forEach((u) => m.set(String(u.id ?? "").toLowerCase(), u));
    return m;
  }, [users]);

  const cols = useMemo(() => {
    const next = [...OPEN_LEAD_COLS];
    if (!next.some((c) => c.key === "lead_owner")) {
      next.splice(1, 0, { key: "lead_owner", label: "Owner" });
    }
    return next;
  }, []);

  const renderCell = (col: string, row: any) => {
    if (col === "lead_owner") {
      const email = String(row.lead_owner ?? "").trim();
      if (!email) return <span className="text-slate-300">—</span>;
      const u = userMap.get(email.toLowerCase());
      const display = u?.name || email;
      const initials = initialsFor(display);
      return (
        <div className="flex items-center gap-2 min-w-0">
          {u?.avatar ? (
            <img
              src={u.avatar}
              alt={display}
              title={display}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = "none";
                img.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <span
            className={cn(
              "w-7 h-7 rounded-full bg-gradient-to-br text-white text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-white shadow-sm shrink-0",
              colorFor(email),
              u?.avatar && "hidden",
            )}
            title={display}
          >
            {initials}
          </span>
          <span className="truncate text-[12.5px] text-slate-700" title={display}>{display}</span>
        </div>
      );
    }
    return undefined;
  };

  return (
    <Layout>
      <div className="p-5 space-y-4 w-full bg-gradient-to-b from-slate-50 to-white min-h-full">
        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            isAgent
              ? "bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40"
              : "bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40"
          )} />
          <div className="relative flex items-center justify-between flex-wrap gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-1",
                isAgent
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20 ring-violet-400/20"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 ring-emerald-400/20"
              )}>
                {isAgent ? <UserCheck className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
                    {isAgent ? "My Assigned Leads" : "Open Leads"}
                  </h1>
                  {isAgent ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wide">
                      <UserCheck className="w-2.5 h-2.5" /> Agent View
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                      <Sparkles className="w-2.5 h-2.5" /> Live
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {isAgent
                    ? `Showing leads assigned to ${user?.full_name ?? user?.email ?? "you"} — click any row to drill in.`
                    : "All currently open sales leads from ERP — click any row to drill in."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 bg-white/70 backdrop-blur border px-3.5 py-2 rounded-xl shadow-sm",
                isAgent ? "border-violet-200" : "border-emerald-200"
              )}>
                <TrendingUp className={cn("w-4 h-4", isAgent ? "text-violet-600" : "text-emerald-600")} />
                <span className={cn("text-[12px] font-semibold", isAgent ? "text-violet-700" : "text-emerald-700")}>
                  {isAgent ? "Assigned" : "Total Leads"}
                </span>
                <span className={cn("text-base font-extrabold tabular-nums", isAgent ? "text-violet-900" : "text-emerald-900")}>
                  {isFetching && !data ? "…" : total.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 text-[12px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors font-semibold shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Leads Table ── */}
        {isAgent ? (
          <AgentLeadsTable leads={data?.data ?? []} loading={isFetching && !data} />
        ) : (
          <Panel
            k="open_leads"
            cols={cols}
            renderCell={renderCell}
            height={typeof window !== "undefined" ? window.innerHeight - 200 : 720}
            enableLocationFilter
            enableDetailsView
            size="comfortable"
          />
        )}
      </div>
    </Layout>
  );
}

// ── Agent-only leads table (only their assigned leads) ───────────────────────
const STATUS_COLORS: Record<string, string> = {
  Open:        "bg-blue-50 text-blue-700 border-blue-200",
  Converted:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Opportunity: "bg-violet-50 text-violet-700 border-violet-200",
  Quotation:   "bg-amber-50 text-amber-700 border-amber-200",
  Closed:      "bg-gray-100 text-gray-500 border-gray-200",
  Replied:     "bg-teal-50 text-teal-700 border-teal-200",
  "Lost Quotation":  "bg-red-50 text-red-700 border-red-200",
  "Do Not Contact":  "bg-rose-50 text-rose-700 border-rose-200",
};

function AgentLeadsTable({ leads, loading }: { leads: any[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const filtered = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (l.company_name + l.name + l.country + l.contact_person + l.city + l.lead_status)
      .toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center h-48">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading your leads…</span>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center h-48 gap-3">
        <AlertCircle className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">No leads assigned yet</p>
        <p className="text-xs text-slate-400">Contact your admin to get leads assigned to you.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Users className="w-3.5 h-3.5" />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company, country, contact…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">{filtered.length} of {leads.length} leads</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lead ID</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Location</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Follow-up</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, idx) => (
              <tr
                key={lead.name}
                onClick={() => navigate(`/sales-dashboard/lead/${encodeURIComponent(lead.name)}`)}
                className="border-b border-slate-50 hover:bg-violet-50/40 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-3.5">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-[11px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">
                    {lead.name}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[13px] font-semibold text-slate-800 truncate max-w-[200px]" title={lead.company_name}>
                      {lead.company_name || "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {(lead.city || lead.state || lead.country) ? (
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        {(lead.city || lead.state) && (
                          <p className="text-[12px] text-slate-700 font-medium">{lead.city || lead.state}</p>
                        )}
                        {lead.country && (
                          <p className="text-[11px] text-slate-400">{lead.country}</p>
                        )}
                      </div>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3.5">
                  {lead.contact_person ? (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[12px] text-slate-600 truncate max-w-[140px]">{lead.contact_person}</span>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3.5">
                  {lead.contact_no_1 ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[12px] text-slate-600">{lead.contact_no_1}</span>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[12px] text-slate-500">{lead.next_follow_up || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  {lead.lead_status ? (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      STATUS_COLORS[lead.lead_status] ?? "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                      {lead.lead_status}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="pr-4">
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
