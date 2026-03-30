import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, Briefcase, Users, Target,
  ShoppingBag, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Calendar, Printer,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  ClipboardList, Receipt, CreditCard, UserCheck, Filter, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmtCr(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function ageDays(due: string | null | undefined): number {
  if (!due) return 0;
  return Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
}
function ageBucket(overdue: boolean, days: number): { label: string; color: string; bg: string; border: string } {
  if (!overdue) return { label: "Current", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (days <= 30) return { label: "1–30 d", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
  if (days <= 60) return { label: "31–60 d", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
  if (days <= 90) return { label: "61–90 d", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
  return { label: "90+ d", color: "text-red-800", bg: "bg-red-100", border: "border-red-300" };
}

function pbar(val: number, color: string) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{val}%</span>
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" | "gray" | "violet" | "sky" }) {
  const cls: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
    sky: "bg-sky-100 text-sky-700 border-sky-200",
  };
  return <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cls[variant]}`}>{label}</span>;
}

function statusVariant(status: string): "green" | "amber" | "red" | "blue" | "gray" | "violet" | "sky" {
  const s = (status || "").toLowerCase();
  if (["completed", "approved", "paid", "closed", "received"].some(x => s.includes(x))) return "green";
  if (["overdue", "rejected", "cancelled", "expired"].some(x => s.includes(x))) return "red";
  if (["draft", "open", "pending"].some(x => s.includes(x))) return "amber";
  if (["to deliver", "to bill", "to receive", "submitted", "partially"].some(x => s.includes(x))) return "blue";
  if (["on going"].some(x => s.includes(x))) return "sky";
  return "gray";
}

function StatCard({ label, value, sub, icon: Icon, color, bg, trend, trendLabel, alert }: any) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-200"} shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {trendLabel && (
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full
            ${trend === "up" ? "bg-emerald-100 text-emerald-700" : trend === "down" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <p className={`text-xl font-black mt-2 ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ title, icon: Icon, color, count }: { title: string; icon: React.ElementType; color: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{title}</h2>
      {count !== undefined && (
        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function Tbl({ headers, rows, emptyMsg = "No records" }: { headers: string[]; rows: React.ReactNode[][]; emptyMsg?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-max">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="pb-1.5 pr-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-4 text-center text-xs text-gray-400">{emptyMsg}</td></tr>
          ) : rows.map((cells, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
              {cells.map((cell, j) => (
                <td key={j} className="py-1.5 pr-4 text-xs text-gray-700 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Aging bucket summary bar ── */
function AgingSummary({ items, amountKey = "outstanding", colorScheme }: { items: any[]; amountKey?: string; colorScheme: "sky" | "orange" }) {
  const buckets = [
    { key: "current", label: "Current", filter: (i: any) => !i.overdue, bg: "bg-emerald-500" },
    { key: "1-30", label: "1–30 days", filter: (i: any) => i.overdue && ageDays(i.due) <= 30, bg: "bg-amber-400" },
    { key: "31-60", label: "31–60 days", filter: (i: any) => i.overdue && ageDays(i.due) > 30 && ageDays(i.due) <= 60, bg: "bg-orange-500" },
    { key: "61-90", label: "61–90 days", filter: (i: any) => i.overdue && ageDays(i.due) > 60 && ageDays(i.due) <= 90, bg: "bg-red-500" },
    { key: "90+", label: "90+ days", filter: (i: any) => i.overdue && ageDays(i.due) > 90, bg: "bg-red-800" },
  ];
  const total = items.reduce((a, i) => a + (i[amountKey] || 0), 0);
  return (
    <div className="mb-4">
      {/* stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-2">
        {buckets.map(b => {
          const v = items.filter(b.filter).reduce((a, i) => a + (i[amountKey] || 0), 0);
          const pct = total > 0 ? (v / total) * 100 : 0;
          return pct > 0 ? <div key={b.key} className={`${b.bg} transition-all`} style={{ width: `${pct}%` }} title={`${b.label}: ${fmtCr(v)}`} /> : null;
        })}
      </div>
      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {buckets.map(b => {
          const grp = items.filter(b.filter);
          const v = grp.reduce((a, i) => a + (i[amountKey] || 0), 0);
          if (!grp.length) return null;
          return (
            <div key={b.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${b.bg}`} />
              <span className="text-[10px] text-gray-500">{b.label}</span>
              <span className="text-[10px] font-bold text-gray-700">{fmtCr(v)}</span>
              <span className="text-[9px] text-gray-400">({grp.length})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Grouped party cards (receivables / payables) ── */
function PartyCards({ items, partyKey, amountKey = "outstanding", colorScheme }: {
  items: any[]; partyKey: string; amountKey?: string; colorScheme: "sky" | "orange";
}) {
  const grouped = useMemo(() => {
    const map: Record<string, { party: string; outstanding: number; invoices: any[]; worstDays: number }> = {};
    for (const i of items) {
      const p = i[partyKey] || "Unknown";
      if (!map[p]) map[p] = { party: p, outstanding: 0, invoices: [], worstDays: 0 };
      map[p].outstanding += i[amountKey] || 0;
      map[p].invoices.push(i);
      if (i.overdue) map[p].worstDays = Math.max(map[p].worstDays, ageDays(i.due));
    }
    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [items, partyKey, amountKey]);

  const accent = colorScheme === "sky" ? "text-sky-700" : "text-orange-700";

  if (!grouped.length) return <p className="text-xs text-gray-400 py-4 text-center">No outstanding invoices</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {grouped.map((g, idx) => {
        const hasOverdue = g.invoices.some(i => i.overdue);
        const bucket = ageBucket(hasOverdue, g.worstDays);
        const overdueCount = g.invoices.filter(i => i.overdue).length;
        const overdueAmt = g.invoices.filter(i => i.overdue).reduce((a, i) => a + (i[amountKey] || 0), 0);
        return (
          <div key={idx} className={`rounded-xl border ${hasOverdue ? bucket.border : "border-gray-200"} bg-white p-4 shadow-sm`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{g.party}</p>
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${bucket.border} ${bucket.bg} ${bucket.color}`}>
                {bucket.label}
              </span>
            </div>
            <p className={`text-lg font-black ${hasOverdue ? bucket.color : accent}`}>{fmtCr(g.outstanding)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{g.invoices.length} invoice{g.invoices.length !== 1 ? "s" : ""}</p>
            {hasOverdue && overdueCount > 0 && (
              <p className="text-[9px] text-red-600 font-semibold mt-1">
                {fmtCr(overdueAmt)} overdue · {overdueCount} inv
              </p>
            )}
            {/* mini aging bar per party */}
            <div className="mt-2 flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100">
              {[
                { f: (i: any) => !i.overdue, bg: "bg-emerald-400" },
                { f: (i: any) => i.overdue && ageDays(i.due) <= 30, bg: "bg-amber-400" },
                { f: (i: any) => i.overdue && ageDays(i.due) > 30 && ageDays(i.due) <= 60, bg: "bg-orange-500" },
                { f: (i: any) => i.overdue && ageDays(i.due) > 60 && ageDays(i.due) <= 90, bg: "bg-red-500" },
                { f: (i: any) => i.overdue && ageDays(i.due) > 90, bg: "bg-red-800" },
              ].map((b, bi) => {
                const v = g.invoices.filter(b.f).reduce((a, i) => a + (i[amountKey] || 0), 0);
                const pct = g.outstanding > 0 ? (v / g.outstanding) * 100 : 0;
                return pct > 0 ? <div key={bi} className={b.bg} style={{ width: `${pct}%` }} /> : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MisReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/admin/mis-report`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      json.projects = json.projects ?? {};
      json.projects.list = json.projects.list ?? [];
      json.procurement = json.procurement ?? {};
      json.procurement.purchase_orders = json.procurement.purchase_orders ?? {};
      json.procurement.purchase_orders.list = json.procurement.purchase_orders.list ?? [];
      json.procurement.material_requests = json.procurement.material_requests ?? {};
      json.procurement.material_requests.list = json.procurement.material_requests.list ?? [];
      json.sales = json.sales ?? {};
      json.sales.orders = json.sales.orders ?? {};
      json.sales.orders.list = json.sales.orders.list ?? [];
      json.sales.quotations = json.sales.quotations ?? {};
      json.sales.quotations.list = json.sales.quotations.list ?? [];
      json.sales.receivables = json.sales.receivables ?? {};
      json.sales.receivables.all_outstanding = json.sales.receivables.all_outstanding ?? [];
      json.sales.receivables.overdue_list = json.sales.receivables.overdue_list ?? [];
      json.payables = json.payables ?? {};
      json.payables.all_outstanding = json.payables.all_outstanding ?? [];
      json.payables.overdue_list = json.payables.overdue_list ?? [];
      json.hr = json.hr ?? {};
      json.hr.department_breakdown = json.hr.department_breakdown ?? [];
      json.hr.leave_applications = json.hr.leave_applications ?? [];
      setData(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to load MIS data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Project filter ── */
  const projectNames = useMemo<string[]>(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.projects.list.forEach((p: any) => p.id && set.add(p.id));
    data.procurement.purchase_orders.list.forEach((p: any) => p.project && set.add(p.project));
    data.procurement.material_requests.list.forEach((m: any) => m.project && set.add(m.project));
    data.sales.orders.list.forEach((s: any) => s.project && set.add(s.project));
    data.sales.receivables.all_outstanding.forEach((i: any) => i.project && set.add(i.project));
    data.payables.all_outstanding.forEach((i: any) => i.project && set.add(i.project));
    return Array.from(set).sort();
  }, [data]);

  const fp = projectFilter === "__all__" ? null : projectFilter;

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    return fp ? data.projects.list.filter((p: any) => p.id === fp) : data.projects.list;
  }, [data, fp]);

  const filteredSOs = useMemo(() => {
    if (!data) return [];
    return fp ? data.sales.orders.list.filter((s: any) => s.project === fp) : data.sales.orders.list;
  }, [data, fp]);

  const filteredPOs = useMemo(() => {
    if (!data) return [];
    return fp ? data.procurement.purchase_orders.list.filter((p: any) => p.project === fp) : data.procurement.purchase_orders.list;
  }, [data, fp]);

  const filteredMRs = useMemo(() => {
    if (!data) return [];
    return fp ? data.procurement.material_requests.list.filter((m: any) => m.project === fp) : data.procurement.material_requests.list;
  }, [data, fp]);

  const filteredReceivables = useMemo(() => {
    if (!data) return [];
    return fp ? data.sales.receivables.all_outstanding.filter((i: any) => i.project === fp) : data.sales.receivables.all_outstanding;
  }, [data, fp]);

  const filteredPayables = useMemo(() => {
    if (!data) return [];
    return fp ? data.payables.all_outstanding.filter((i: any) => i.project === fp) : data.payables.all_outstanding;
  }, [data, fp]);

  const filteredQuotations = useMemo(() => {
    if (!data) return [];
    return data.sales.quotations.list;
  }, [data]);

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f0f4f8] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">MD Dashboard — MIS Report</h1>
                <p className="text-[10px] text-gray-400">Management Information Summary · {monthName}</p>
              </div>
            </div>

            {/* Project filter */}
            {data && projectNames.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[220px]">
                  <option value="__all__">All Projects</option>
                  {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {fp && (
                  <button onClick={() => setProjectFilter("__all__")}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={() => window.print()}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors hidden sm:block print:hidden" title="Print">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors print:hidden">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error} — ERP connection issue or module not enabled.
            </div>
          )}
          {loading && !data && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Fetching live data from ERP…</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* ── KPI Strip ── */}
              {!fp && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <StatCard label="Active Projects" value={data.projects.active}
                    sub={`${data.projects.completed} completed`}
                    icon={Briefcase} color="text-blue-600" bg="bg-blue-50"
                    alert={data.projects.overdue > 0}
                    trendLabel={data.projects.overdue > 0 ? `${data.projects.overdue} overdue` : undefined}
                    trend="down" />
                  <StatCard label="Total Employees" value={data.hr.total_employees}
                    sub={`${data.hr.on_leave_today} on leave · ${data.hr.pending_leave_approvals} pending`}
                    icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
                  <StatCard label="Active Sales Orders" value={data.sales.orders.active}
                    sub={`${fmtCr(data.sales.orders.this_month_value)} this month`}
                    icon={Target} color="text-violet-600" bg="bg-violet-50"
                    trendLabel={`${data.sales.orders.this_month} this mo`} trend="up" />
                  <StatCard label="Receivable" value={fmtCr(data.sales.receivables.total_receivable)}
                    sub={`${data.sales.receivables.outstanding_invoices} invoices`}
                    icon={TrendingUp} color="text-sky-600" bg="bg-sky-50"
                    alert={data.sales.receivables.overdue_receivable > 0}
                    trendLabel={data.sales.receivables.overdue_invoices > 0 ? `${data.sales.receivables.overdue_invoices} overdue` : undefined}
                    trend="down" />
                  <StatCard label="Payable" value={fmtCr(data.payables.total_payable)}
                    sub={`${data.payables.outstanding_invoices} invoices`}
                    icon={TrendingDown} color="text-orange-600" bg="bg-orange-50"
                    alert={data.payables.overdue_invoices > 0}
                    trendLabel={data.payables.overdue_invoices > 0 ? `${data.payables.overdue_invoices} overdue` : undefined}
                    trend="down" />
                  <StatCard label="Pending POs" value={data.procurement.purchase_orders.pending}
                    sub={fmtCr(data.procurement.purchase_orders.pending_value)}
                    icon={ShoppingBag} color="text-amber-600" bg="bg-amber-50" />
                  <StatCard label="Pending MRs" value={data.procurement.material_requests.pending}
                    sub={`${data.procurement.material_requests.this_month} this month`}
                    icon={ClipboardList} color="text-rose-600" bg="bg-rose-50" />
                  <StatCard label="Open Quotations" value={data.sales.quotations.open}
                    sub={fmtCr(data.sales.quotations.total_value)}
                    icon={FileText} color="text-indigo-600" bg="bg-indigo-50" />
                </div>
              )}

              {/* ── Projects ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-4 mb-3">
                  <SectionTitle title="Active Projects" icon={Briefcase} color="text-blue-500" count={filteredProjects.length} />
                  {!fp && (
                    <div className="ml-auto flex gap-3 text-[10px] text-gray-500">
                      <span>Estimated: <strong className="text-gray-700">{fmtCr(data.projects.total_estimated_value)}</strong></span>
                      <span>Spend: <strong className="text-gray-700">{fmtCr(data.projects.total_actual_expense)}</strong></span>
                      <span>Avg Progress: <strong className="text-gray-700">{data.projects.avg_progress}%</strong></span>
                    </div>
                  )}
                </div>
                <Tbl
                  headers={["Project", "Customer", "Type", "Progress", "Estimated", "Spend", "Due Date", "Status"]}
                  rows={filteredProjects.map((p: any) => [
                    <span className="font-semibold text-gray-800">{p.name}</span>,
                    <span className="text-gray-500">{p.customer || "—"}</span>,
                    <span className="text-gray-500">{p.type || "—"}</span>,
                    pbar(p.progress, p.progress >= 80 ? "bg-emerald-500" : p.progress >= 50 ? "bg-blue-500" : "bg-amber-500"),
                    <span>{fmtCr(p.estimated)}</span>,
                    <span>{fmtCr(p.expense)}</span>,
                    <span className={p.overdue ? "text-red-600 font-bold" : ""}>{fmtDate(p.due)}</span>,
                    <Badge label={p.overdue ? "OVERDUE" : p.status} variant={p.overdue ? "red" : statusVariant(p.status)} />,
                  ])}
                />
              </div>

              {/* ── Receivables ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-1">
                  <SectionTitle title="Receivables — Outstanding" icon={Receipt} color="text-sky-500"
                    count={filteredReceivables.length} />
                  <span className="text-xs font-black text-sky-700 ml-auto">
                    {fmtCr(filteredReceivables.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}
                  </span>
                </div>
                <AgingSummary items={filteredReceivables} colorScheme="sky" />
                <PartyCards items={filteredReceivables} partyKey="customer" colorScheme="sky" />
              </div>

              {/* ── Payables ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-1">
                  <SectionTitle title="Payables — Outstanding" icon={CreditCard} color="text-orange-500"
                    count={filteredPayables.length} />
                  <span className="text-xs font-black text-orange-700 ml-auto">
                    {fmtCr(filteredPayables.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}
                  </span>
                </div>
                <AgingSummary items={filteredPayables} colorScheme="orange" />
                <PartyCards items={filteredPayables} partyKey="supplier" colorScheme="orange" />
              </div>

              {/* ── Sales Orders + Quotations ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <SectionTitle title="Sales Orders" icon={Target} color="text-violet-500" count={filteredSOs.length} />
                    <span className="text-[10px] text-gray-500 ml-4 shrink-0">
                      Total: <strong className="text-gray-700">{fmtCr(filteredSOs.reduce((a: number, s: any) => a + (s.amount || 0), 0))}</strong>
                    </span>
                  </div>
                  <Tbl
                    headers={["ID", "Customer", "Amount", "Delivered", "Billed", "Delivery", "Status"]}
                    rows={filteredSOs.map((s: any) => [
                      <span className="font-mono text-[10px] text-gray-500">{s.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{s.customer}</span>,
                      <span className="font-bold">{fmtCr(s.amount)}</span>,
                      pbar(s.delivered_pct, "bg-emerald-400"),
                      pbar(s.billed_pct, "bg-blue-400"),
                      <span>{fmtShort(s.delivery)}</span>,
                      <Badge label={s.status} variant={statusVariant(s.status)} />,
                    ])}
                  />
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionTitle title="Open Quotations" icon={FileText} color="text-indigo-500" count={filteredQuotations.length} />
                  <Tbl
                    headers={["ID", "Party", "Amount", "Date", "Valid Till", "Status"]}
                    rows={filteredQuotations.map((q: any) => [
                      <span className="font-mono text-[10px] text-gray-500">{q.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{q.party || "—"}</span>,
                      <span className="font-bold">{fmtCr(q.amount)}</span>,
                      <span>{fmtShort(q.date)}</span>,
                      <span className={q.valid_till && new Date(q.valid_till) < new Date() ? "text-red-600 font-bold" : ""}>{fmtDate(q.valid_till)}</span>,
                      <Badge label={q.status} variant={statusVariant(q.status)} />,
                    ])}
                  />
                </div>
              </div>

              {/* ── Purchase Orders ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-4 mb-3">
                  <SectionTitle title="Purchase Orders" icon={ShoppingBag} color="text-amber-500" count={filteredPOs.length} />
                  <div className="ml-auto flex gap-3 text-[10px] text-gray-500">
                    <span>Total: <strong className="text-gray-700">{fmtCr(filteredPOs.reduce((a: number, p: any) => a + (p.amount || 0), 0))}</strong></span>
                    <span>Pending: <strong className="text-amber-700">{filteredPOs.filter((p: any) => ["Draft","To Receive and Bill","To Bill","To Receive"].includes(p.status)).length}</strong></span>
                  </div>
                </div>
                <Tbl
                  headers={["PO", "Supplier", "Amount", "Received", "Billed", "Project", "Order Date", "Due Date", "Status"]}
                  rows={filteredPOs.map((p: any) => [
                    <span className="font-mono text-[10px] text-gray-500">{p.id}</span>,
                    <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.supplier}</span>,
                    <span className="font-bold">{fmtCr(p.amount)}</span>,
                    pbar(p.received_pct, "bg-emerald-400"),
                    pbar(p.billed_pct, "bg-blue-400"),
                    <span className="text-gray-500 max-w-[80px] truncate block">{p.project || "—"}</span>,
                    <span>{fmtShort(p.date)}</span>,
                    <span className={p.due && new Date(p.due) < new Date() && !["Completed","Closed"].includes(p.status) ? "text-red-600 font-bold" : ""}>{fmtDate(p.due)}</span>,
                    <Badge label={p.status} variant={statusVariant(p.status)} />,
                  ])}
                />
              </div>

              {/* ── Material Requests ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <SectionTitle title="Material Requests" icon={ClipboardList} color="text-rose-500" count={filteredMRs.length} />
                <Tbl
                  headers={["MR", "Type", "Project", "Requested By", "Date", "Required By", "Status"]}
                  rows={filteredMRs.map((m: any) => [
                    <span className="font-mono text-[10px] text-gray-500">{m.id}</span>,
                    <span className="text-gray-600">{m.type || "—"}</span>,
                    <span className="text-gray-500 max-w-[100px] truncate block">{m.project || "—"}</span>,
                    <span className="text-gray-600">{m.requested_by || "—"}</span>,
                    <span>{fmtShort(m.date)}</span>,
                    <span className={m.due && new Date(m.due) < new Date() && m.status !== "Ordered" ? "text-red-600 font-bold" : ""}>{fmtDate(m.due)}</span>,
                    <Badge label={m.status} variant={statusVariant(m.status)} />,
                  ])}
                />
              </div>

              {/* ── HR (only shown without project filter) ── */}
              {!fp && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <SectionTitle title="Department Headcount" icon={UserCheck} color="text-emerald-500" />
                    <div className="space-y-2">
                      {data.hr.department_breakdown.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-44 truncate">{d.dept}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${Math.round((d.count / data.hr.total_employees) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[10px] text-gray-500">
                      <span>Total Active Employees</span>
                      <strong className="text-gray-800">{data.hr.total_employees}</strong>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-4 mb-1">
                      <SectionTitle title="Leave Applications" icon={Calendar} color="text-sky-500" count={data.hr.leave_applications.length} />
                    </div>
                    <div className="flex gap-4 mb-3 text-[10px] text-gray-500">
                      <span>On Leave Today: <strong className="text-amber-600">{data.hr.on_leave_today}</strong></span>
                      <span>Pending Approval: <strong className="text-sky-600">{data.hr.pending_leave_approvals}</strong></span>
                    </div>
                    <Tbl
                      headers={["Employee", "Leave Type", "From", "To", "Days", "Status"]}
                      rows={data.hr.leave_applications.map((l: any) => [
                        <span className="font-semibold text-gray-800">{l.employee}</span>,
                        <span className="text-gray-500">{l.type}</span>,
                        <span>{fmtShort(l.from)}</span>,
                        <span>{fmtShort(l.to)}</span>,
                        <span className="font-bold text-gray-700">{l.days}</span>,
                        <Badge label={l.status} variant={l.status === "Approved" ? "green" : l.status === "Open" ? "amber" : l.status === "Rejected" ? "red" : "gray"} />,
                      ])}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
