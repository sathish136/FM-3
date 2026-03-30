import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, Briefcase, Users, Target, ShoppingBag, FileText,
  AlertTriangle, TrendingUp, TrendingDown, Calendar, Printer,
  BarChart3, ClipboardList, Receipt, CreditCard, UserCheck,
  Truck, Wallet, Filter, X, IndianRupee, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmtCr(v: number | undefined | null) {
  const n = Number(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function ageDays(due?: string | null) {
  if (!due) return 0;
  return Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
}

function Badge({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" | "gray" | "sky" }) {
  const cls: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700", blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-600", sky: "bg-sky-100 text-sky-700",
  };
  return <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cls[variant]}`}>{label}</span>;
}
function sv(s: string): "green" | "amber" | "red" | "blue" | "gray" | "sky" {
  const t = (s || "").toLowerCase();
  if (["completed", "approved", "paid", "closed", "received"].some(x => t.includes(x))) return "green";
  if (["overdue", "rejected", "cancelled", "expired"].some(x => t.includes(x))) return "red";
  if (["draft", "open", "pending"].some(x => t.includes(x))) return "amber";
  if (["to deliver", "to bill", "to receive", "submitted", "partially"].some(x => t.includes(x))) return "blue";
  if (["on going"].some(x => t.includes(x))) return "sky";
  return "gray";
}
function Pbar({ val, color }: { val: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[30px]">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
      <span className="text-[9px] font-bold text-gray-400 w-6 text-right">{val}%</span>
    </div>
  );
}

/* ── Compact scrollable table ── */
function MiniTable({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="text-[10px] text-gray-400 text-center py-3">No records</p>;
  return (
    <div className="overflow-auto max-h-52">
      <table className="w-full text-left min-w-max">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-100">
            {cols.map((c, i) => <th key={i} className="pb-1 pr-3 text-[8px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/70">
              {cells.map((cell, j) => <td key={j} className="py-1 pr-3 text-[11px] text-gray-700 whitespace-nowrap">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Single stat box ── */
function Stat({ label, value, sub, color = "text-gray-900", alert = false, small = false }: any) {
  return (
    <div className={`rounded-xl px-3 py-2 ${alert ? "bg-red-50" : "bg-gray-50"}`}>
      <p className={`font-black leading-tight ${small ? "text-lg" : "text-2xl"} ${alert ? "text-red-700" : color}`}>{value}</p>
      <p className="text-[9px] font-bold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[8px] text-gray-400">{sub}</p>}
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ title, icon: Icon, iconColor, count, right, children, span = 1 }: {
  title: string; icon: React.ElementType; iconColor: string;
  count?: number; right?: React.ReactNode; children: React.ReactNode; span?: number;
}) {
  const spanCls = span === 2 ? "lg:col-span-2" : span === 3 ? "lg:col-span-3" : "";
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${spanCls}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
        <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">{title}</span>
        {count !== undefined && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>}
        <div className="flex-1" />
        {right}
      </div>
      <div className="p-4 flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/* ── Aging bar ── */
function AgingBar({ items, ak = "outstanding" }: { items: any[]; ak?: string }) {
  const total = items.reduce((a, i) => a + (i[ak] || 0), 0);
  const B = [
    { f: (i: any) => !i.overdue, bar: "bg-emerald-500", label: "Current" },
    { f: (i: any) => i.overdue && ageDays(i.due) <= 30, bar: "bg-amber-400", label: "1–30d" },
    { f: (i: any) => i.overdue && ageDays(i.due) > 30 && ageDays(i.due) <= 60, bar: "bg-orange-500", label: "31–60d" },
    { f: (i: any) => i.overdue && ageDays(i.due) > 60 && ageDays(i.due) <= 90, bar: "bg-red-500", label: "61–90d" },
    { f: (i: any) => i.overdue && ageDays(i.due) > 90, bar: "bg-red-900", label: "90+d" },
  ];
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-1.5">
        {B.map((b, bi) => {
          const v = items.filter(b.f).reduce((a, i) => a + (i[ak] || 0), 0);
          const pct = total > 0 ? (v / total) * 100 : 0;
          return pct > 0 ? <div key={bi} className={b.bar} style={{ width: `${pct}%` }} title={`${b.label}: ${fmtCr(v)}`} /> : null;
        })}
        {total === 0 && <div className="bg-gray-200 w-full" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {B.map((b, bi) => {
          const grp = items.filter(b.f);
          const v = grp.reduce((a, i) => a + (i[ak] || 0), 0);
          if (!grp.length) return null;
          return (
            <span key={bi} className="flex items-center gap-1 text-[9px]">
              <span className={`w-1.5 h-1.5 rounded-sm ${b.bar}`} />
              <span className="text-gray-500">{b.label}</span>
              <span className="font-bold text-gray-700">{fmtCr(v)}</span>
              <span className="text-gray-400">({grp.length})</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Party rows (compact) ── */
function PartyRows({ items, pk, ak = "outstanding", colorText }: { items: any[]; pk: string; ak?: string; colorText: string }) {
  const grouped = useMemo(() => {
    const m: Record<string, { party: string; amt: number; count: number; overdue: number }> = {};
    for (const i of items) {
      const p = i[pk] || "Unknown";
      if (!m[p]) m[p] = { party: p, amt: 0, count: 0, overdue: 0 };
      m[p].amt += i[ak] || 0;
      m[p].count++;
      if (i.overdue) m[p].overdue += i[ak] || 0;
    }
    return Object.values(m).sort((a, b) => b.amt - a.amt);
  }, [items, pk, ak]);
  return (
    <div className="overflow-auto max-h-44 space-y-1">
      {grouped.map((g, i) => (
        <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-50">
          <span className="flex-1 text-[11px] font-semibold text-gray-700 truncate">{g.party}</span>
          {g.overdue > 0 && <span className="text-[9px] font-bold text-red-600 shrink-0">{fmtCr(g.overdue)} OD</span>}
          <span className={`text-xs font-black ${colorText} shrink-0`}>{fmtCr(g.amt)}</span>
          <span className="text-[9px] text-gray-400 shrink-0">{g.count}inv</span>
        </div>
      ))}
    </div>
  );
}

const TABS = ["Overview", "Projects", "Sales & Finance", "Procurement", "HR"] as const;
type Tab = typeof TABS[number];

export default function MisReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [projectFilter, setProjectFilter] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/admin/mis-report`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      j.projects = j.projects ?? {}; j.projects.list = j.projects.list ?? []; j.projects.active = j.projects.active ?? 0; j.projects.completed = j.projects.completed ?? 0; j.projects.overdue = j.projects.overdue ?? 0; j.projects.avg_progress = j.projects.avg_progress ?? 0; j.projects.total_estimated_value = j.projects.total_estimated_value ?? 0; j.projects.total_actual_expense = j.projects.total_actual_expense ?? 0;
      j.procurement = j.procurement ?? {}; j.procurement.purchase_orders = j.procurement.purchase_orders ?? {}; j.procurement.purchase_orders.list = j.procurement.purchase_orders.list ?? []; j.procurement.purchase_orders.pending = j.procurement.purchase_orders.pending ?? 0; j.procurement.purchase_orders.total_value = j.procurement.purchase_orders.total_value ?? 0; j.procurement.purchase_orders.pending_value = j.procurement.purchase_orders.pending_value ?? 0; j.procurement.purchase_orders.this_month = j.procurement.purchase_orders.this_month ?? 0;
      j.procurement.material_requests = j.procurement.material_requests ?? {}; j.procurement.material_requests.list = j.procurement.material_requests.list ?? []; j.procurement.material_requests.pending = j.procurement.material_requests.pending ?? 0; j.procurement.material_requests.this_month = j.procurement.material_requests.this_month ?? 0;
      j.procurement.delivery_notes = j.procurement.delivery_notes ?? {}; j.procurement.delivery_notes.list = j.procurement.delivery_notes.list ?? []; j.procurement.delivery_notes.pending = j.procurement.delivery_notes.pending ?? 0; j.procurement.delivery_notes.this_month = j.procurement.delivery_notes.this_month ?? 0; j.procurement.delivery_notes.total_value = j.procurement.delivery_notes.total_value ?? 0;
      j.sales = j.sales ?? {}; j.sales.orders = j.sales.orders ?? {}; j.sales.orders.list = j.sales.orders.list ?? []; j.sales.orders.active = j.sales.orders.active ?? 0; j.sales.orders.this_month = j.sales.orders.this_month ?? 0; j.sales.orders.this_month_value = j.sales.orders.this_month_value ?? 0; j.sales.orders.total_value = j.sales.orders.total_value ?? 0;
      j.sales.quotations = j.sales.quotations ?? {}; j.sales.quotations.list = j.sales.quotations.list ?? []; j.sales.quotations.open = j.sales.quotations.open ?? 0; j.sales.quotations.total_value = j.sales.quotations.total_value ?? 0;
      j.sales.receivables = j.sales.receivables ?? {}; j.sales.receivables.all_outstanding = j.sales.receivables.all_outstanding ?? []; j.sales.receivables.total_receivable = j.sales.receivables.total_receivable ?? 0; j.sales.receivables.overdue_invoices = j.sales.receivables.overdue_invoices ?? 0; j.sales.receivables.overdue_receivable = j.sales.receivables.overdue_receivable ?? 0; j.sales.receivables.outstanding_invoices = j.sales.receivables.outstanding_invoices ?? 0;
      j.payables = j.payables ?? {}; j.payables.all_outstanding = j.payables.all_outstanding ?? []; j.payables.total_payable = j.payables.total_payable ?? 0; j.payables.overdue_invoices = j.payables.overdue_invoices ?? 0; j.payables.outstanding_invoices = j.payables.outstanding_invoices ?? 0;
      j.hr = j.hr ?? {}; j.hr.department_breakdown = j.hr.department_breakdown ?? []; j.hr.leave_applications = j.hr.leave_applications ?? []; j.hr.total_employees = j.hr.total_employees ?? 0; j.hr.on_leave_today = j.hr.on_leave_today ?? 0; j.hr.pending_leave_approvals = j.hr.pending_leave_approvals ?? 0;
      j.hr.expense_claims = j.hr.expense_claims ?? {}; j.hr.expense_claims.list = j.hr.expense_claims.list ?? []; j.hr.expense_claims.pending = j.hr.expense_claims.pending ?? 0; j.hr.expense_claims.approved = j.hr.expense_claims.approved ?? 0; j.hr.expense_claims.total_pending_amount = j.hr.expense_claims.total_pending_amount ?? 0; j.hr.expense_claims.total_approved_amount = j.hr.expense_claims.total_approved_amount ?? 0;
      j.payments = j.payments ?? {}; j.payments.list = j.payments.list ?? []; j.payments.total_received = j.payments.total_received ?? 0; j.payments.total_paid = j.payments.total_paid ?? 0; j.payments.this_month = j.payments.this_month ?? 0;
      j.period = j.period ?? {}; j.period.month_start = j.period.month_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      setData(j); setLastUpdated(new Date());
    } catch (e: any) { setError(e.message || "Failed to load"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fp = projectFilter === "__all__" ? null : projectFilter;

  const projectNames = useMemo<string[]>(() => {
    if (!data) return [];
    const s = new Set<string>();
    data.projects.list.forEach((p: any) => p.id && s.add(p.id));
    data.procurement.purchase_orders.list.forEach((p: any) => p.project && s.add(p.project));
    data.procurement.material_requests.list.forEach((m: any) => m.project && s.add(m.project));
    data.sales.orders.list.forEach((s2: any) => s2.project && s.add(s2.project));
    data.sales.receivables.all_outstanding.forEach((i: any) => i.project && s.add(i.project));
    data.payables.all_outstanding.forEach((i: any) => i.project && s.add(i.project));
    return Array.from(s).sort();
  }, [data]);

  const filt = (arr: any[], key = "project") => fp ? arr.filter(x => x[key] === fp) : arr;
  const filtP   = useMemo(() => fp ? (data?.projects.list ?? []).filter((p: any) => p.id === fp) : (data?.projects.list ?? []), [data, fp]);
  const filtSO  = useMemo(() => filt(data?.sales.orders.list ?? []), [data, fp]);
  const filtPO  = useMemo(() => filt(data?.procurement.purchase_orders.list ?? []), [data, fp]);
  const filtMR  = useMemo(() => filt(data?.procurement.material_requests.list ?? []), [data, fp]);
  const filtDN  = useMemo(() => filt(data?.procurement.delivery_notes.list ?? []), [data, fp]);
  const filtRec = useMemo(() => filt(data?.sales.receivables.all_outstanding ?? []), [data, fp]);
  const filtPay = useMemo(() => filt(data?.payables.all_outstanding ?? []), [data, fp]);
  const filtPmt = useMemo(() => filt(data?.payments.list ?? []), [data, fp]);

  const monthName = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  /* ── KPI row (always visible) ── */
  const kpis = data ? [
    { icon: Briefcase, color: "text-blue-600", bg: "bg-blue-100", label: "Active Projects", value: data.projects.active, sub: `${data.projects.overdue} overdue`, alert: data.projects.overdue > 0 },
    { icon: Users, color: "text-emerald-600", bg: "bg-emerald-100", label: "Employees", value: data.hr.total_employees, sub: `${data.hr.on_leave_today} on leave` },
    { icon: Target, color: "text-violet-600", bg: "bg-violet-100", label: "Active SOs", value: data.sales.orders.active, sub: fmtCr(data.sales.orders.this_month_value) + " this mo" },
    { icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-100", label: "Receivable", value: fmtCr(data.sales.receivables.total_receivable), sub: `${data.sales.receivables.overdue_invoices} overdue`, alert: data.sales.receivables.overdue_invoices > 0 },
    { icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-100", label: "Payable", value: fmtCr(data.payables.total_payable), sub: `${data.payables.overdue_invoices} overdue`, alert: data.payables.overdue_invoices > 0 },
    { icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-100", label: "Pending POs", value: data.procurement.purchase_orders.pending, sub: fmtCr(data.procurement.purchase_orders.pending_value) },
    { icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-100", label: "Pending MRs", value: data.procurement.material_requests.pending, sub: `${data.procurement.material_requests.this_month} this mo` },
    { icon: Wallet, color: "text-green-600", bg: "bg-green-100", label: "Collected", value: fmtCr(filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0)), sub: `${filtPmt.filter((p: any) => p.type === "Receive").length} entries` },
  ] : [];

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f0f4f8] overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 px-5 py-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h1 className="text-xs font-bold text-gray-900">MD Dashboard — MIS Report</h1>
                <p className="text-[9px] text-gray-400">{monthName}</p>
              </div>
            </div>
            {data && projectNames.length > 0 && (
              <div className="flex items-center gap-1.5 ml-3">
                <Filter className="w-3 h-3 text-gray-400" />
                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 max-w-[200px]">
                  <option value="__all__">All Projects</option>
                  {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {fp && <button onClick={() => setProjectFilter("__all__")} className="p-0.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-3 h-3" /></button>}
              </div>
            )}
            <div className="flex-1" />
            {lastUpdated && <span className="text-[9px] text-gray-400 hidden sm:block">Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => window.print()} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hidden sm:block"><Printer className="w-3.5 h-3.5" /></button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {loading && !data && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><RefreshCw className="w-7 h-7 animate-spin text-indigo-400 mx-auto mb-2" /><p className="text-xs text-gray-500">Loading ERP data…</p></div>
          </div>
        )}

        {data && (
          <>
            {/* ── KPI strip ── */}
            <div className="shrink-0 px-5 pt-3">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                {kpis.map((k, i) => (
                  <div key={i} className={`bg-white rounded-xl border ${k.alert ? "border-red-200 bg-red-50" : "border-gray-200"} p-3 flex items-center gap-2.5`}>
                    <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                      <k.icon className={`w-4 h-4 ${k.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-black leading-tight ${k.alert ? "text-red-600" : "text-gray-900"}`}>{k.value}</p>
                      <p className="text-[9px] font-bold text-gray-500 leading-tight truncate">{k.label}</p>
                      {k.sub && <p className={`text-[8px] leading-tight ${k.alert ? "text-red-500" : "text-gray-400"}`}>{k.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="shrink-0 px-5 pt-3">
              <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto px-5 py-3">

              {/* ══ OVERVIEW ══ */}
              {tab === "Overview" && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Projects summary */}
                  <Card title="Projects" icon={Briefcase} iconColor="text-blue-500"
                    right={<button onClick={() => setTab("Projects")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Active" value={data.projects.active} color="text-blue-700" />
                      <Stat label="Completed" value={data.projects.completed} color="text-emerald-700" />
                      <Stat label="Overdue" value={data.projects.overdue} alert={data.projects.overdue > 0} />
                      <Stat label="Avg Progress" value={`${data.projects.avg_progress}%`} color="text-indigo-700" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">Estimated</span><span className="font-bold text-gray-700">{fmtCr(data.projects.total_estimated_value)}</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">Actual Spend</span><span className="font-bold text-gray-700">{fmtCr(data.projects.total_actual_expense)}</span></div>
                    </div>
                  </Card>

                  {/* Receivables summary */}
                  <Card title="Receivables" icon={Receipt} iconColor="text-sky-500"
                    right={<button onClick={() => setTab("Sales & Finance")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Outstanding" value={fmtCr(filtRec.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} color="text-sky-700" small />
                      <Stat label="Overdue" value={fmtCr(filtRec.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} alert={filtRec.some((i: any) => i.overdue)} small />
                      <Stat label="Invoices" value={filtRec.length} />
                      <Stat label="Overdue Inv." value={filtRec.filter((i: any) => i.overdue).length} alert={filtRec.some((i: any) => i.overdue)} />
                    </div>
                    <AgingBar items={filtRec} />
                  </Card>

                  {/* Payables summary */}
                  <Card title="Payables" icon={CreditCard} iconColor="text-orange-500"
                    right={<button onClick={() => setTab("Sales & Finance")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Outstanding" value={fmtCr(filtPay.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} color="text-orange-700" small />
                      <Stat label="Overdue" value={fmtCr(filtPay.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} alert={filtPay.some((i: any) => i.overdue)} small />
                      <Stat label="Invoices" value={filtPay.length} />
                      <Stat label="Overdue Inv." value={filtPay.filter((i: any) => i.overdue).length} alert={filtPay.some((i: any) => i.overdue)} />
                    </div>
                    <AgingBar items={filtPay} />
                  </Card>

                  {/* Sales summary */}
                  <Card title="Sales Orders" icon={Target} iconColor="text-violet-500"
                    right={<button onClick={() => setTab("Sales & Finance")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Stat label="Active" value={filtSO.filter((s: any) => ["To Deliver and Bill", "To Bill", "To Deliver", "Submitted"].includes(s.status)).length} color="text-violet-700" />
                      <Stat label="This Month" value={filtSO.filter((s: any) => s.date >= data.period.month_start).length} />
                      <Stat label="Total Value" value={fmtCr(filtSO.reduce((a: number, s: any) => a + (s.amount || 0), 0))} color="text-gray-700" small />
                      <Stat label="Quotations" value={data.sales.quotations.open} sub={fmtCr(data.sales.quotations.total_value)} />
                    </div>
                  </Card>

                  {/* PO summary */}
                  <Card title="Purchase Orders" icon={ShoppingBag} iconColor="text-amber-500"
                    right={<button onClick={() => setTab("Procurement")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Stat label="Total POs" value={filtPO.length} />
                      <Stat label="Pending" value={filtPO.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status)).length} alert={filtPO.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status)).length > 0} />
                      <Stat label="Pending Value" value={fmtCr(filtPO.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status)).reduce((a: number, p: any) => a + (p.amount || 0), 0))} small color="text-amber-700" />
                      <Stat label="This Month" value={filtPO.filter((p: any) => p.date >= data.period.month_start).length} />
                    </div>
                  </Card>

                  {/* MR + DN summary */}
                  <Card title="Procurement" icon={ClipboardList} iconColor="text-rose-500"
                    right={<button onClick={() => setTab("Procurement")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="MRs Total" value={filtMR.length} />
                      <Stat label="MRs Pending" value={filtMR.filter((m: any) => ["Draft", "Submitted", "Partially Ordered"].includes(m.status)).length} alert />
                      <Stat label="Deliveries" value={filtDN.length} />
                      <Stat label="DN Pending Bill" value={filtDN.filter((d: any) => d.status === "To Bill" || d.status === "Draft").length} alert={filtDN.filter((d: any) => d.status === "To Bill").length > 0} />
                    </div>
                  </Card>

                  {/* Payments summary */}
                  <Card title="Payments" icon={Wallet} iconColor="text-green-600"
                    right={<button onClick={() => setTab("Sales & Finance")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="Received" value={fmtCr(filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-emerald-700" small />
                      <Stat label="Paid Out" value={fmtCr(filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-orange-700" small />
                      <Stat label="Total Entries" value={filtPmt.length} />
                      <Stat label="This Month" value={filtPmt.filter((p: any) => p.date >= data.period.month_start).length} />
                    </div>
                  </Card>

                  {/* HR summary */}
                  <Card title="Human Resources" icon={Users} iconColor="text-emerald-500"
                    right={<button onClick={() => setTab("HR")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3" /></button>}>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Stat label="Total Staff" value={data.hr.total_employees} color="text-emerald-700" />
                      <Stat label="On Leave Today" value={data.hr.on_leave_today} alert={data.hr.on_leave_today > 0} />
                      <Stat label="Pending Leaves" value={data.hr.pending_leave_approvals} alert={data.hr.pending_leave_approvals > 0} />
                      <Stat label="Pending Claims" value={data.hr.expense_claims.pending} alert={data.hr.expense_claims.pending > 0} sub={fmtCr(data.hr.expense_claims.total_pending_amount)} />
                    </div>
                  </Card>
                </div>
              )}

              {/* ══ PROJECTS ══ */}
              {tab === "Projects" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Summary card */}
                  <Card title="Summary" icon={Briefcase} iconColor="text-blue-500">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Active" value={data.projects.active} color="text-blue-700" />
                      <Stat label="Completed" value={data.projects.completed} color="text-emerald-700" />
                      <Stat label="Overdue" value={data.projects.overdue} alert={data.projects.overdue > 0} />
                      <Stat label="Avg Progress" value={`${data.projects.avg_progress}%`} color="text-indigo-700" />
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">Estimated Value</span><span className="font-bold text-gray-700">{fmtCr(data.projects.total_estimated_value)}</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">Actual Spend</span><span className="font-bold text-gray-700">{fmtCr(data.projects.total_actual_expense)}</span></div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Variance</span>
                        <span className={`font-bold ${data.projects.total_actual_expense > data.projects.total_estimated_value ? "text-red-600" : "text-emerald-600"}`}>
                          {fmtCr(Math.abs(data.projects.total_actual_expense - data.projects.total_estimated_value))}
                          {data.projects.total_actual_expense > data.projects.total_estimated_value ? " over" : " under"}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Project list */}
                  <Card title="Active Projects" icon={Briefcase} iconColor="text-blue-400" count={filtP.length} span={2}>
                    <MiniTable
                      cols={["Project", "Customer", "Progress", "Estimated", "Spend", "Due", "Status"]}
                      rows={filtP.map((p: any) => [
                        <span className="font-semibold text-gray-800 max-w-[160px] truncate block">{p.name}</span>,
                        <span className="text-gray-500 max-w-[100px] truncate block">{p.customer || "—"}</span>,
                        <Pbar val={p.progress} color={p.progress >= 80 ? "bg-emerald-500" : p.progress >= 50 ? "bg-blue-500" : "bg-amber-500"} />,
                        <span>{fmtCr(p.estimated)}</span>,
                        <span>{fmtCr(p.expense)}</span>,
                        <span className={p.overdue ? "text-red-600 font-bold" : ""}>{fmtShort(p.due)}</span>,
                        <Badge label={p.overdue ? "OVERDUE" : p.status} variant={p.overdue ? "red" : sv(p.status)} />,
                      ])} />
                  </Card>
                </div>
              )}

              {/* ══ SALES & FINANCE ══ */}
              {tab === "Sales & Finance" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {/* Receivables */}
                  <Card title="Receivables" icon={Receipt} iconColor="text-sky-500" count={filtRec.length}
                    right={<span className="text-xs font-black text-sky-700">{fmtCr(filtRec.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}</span>}>
                    <AgingBar items={filtRec} />
                    <div className="mt-3">
                      <PartyRows items={filtRec} pk="customer" colorText="text-sky-700" />
                    </div>
                  </Card>

                  {/* Payables */}
                  <Card title="Payables" icon={CreditCard} iconColor="text-orange-500" count={filtPay.length}
                    right={<span className="text-xs font-black text-orange-700">{fmtCr(filtPay.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}</span>}>
                    <AgingBar items={filtPay} />
                    <div className="mt-3">
                      <PartyRows items={filtPay} pk="supplier" colorText="text-orange-700" />
                    </div>
                  </Card>

                  {/* Payments */}
                  <Card title="Payment Entries" icon={Wallet} iconColor="text-green-600" count={filtPmt.length}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Total Received" value={fmtCr(filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-emerald-700" small />
                      <Stat label="Total Paid" value={fmtCr(filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-orange-700" small />
                    </div>
                    <MiniTable
                      cols={["Type", "Party", "Amount", "Mode", "Date"]}
                      rows={filtPmt.slice(0, 30).map((p: any) => [
                        <Badge label={p.type} variant={p.type === "Receive" ? "green" : p.type === "Pay" ? "red" : "blue"} />,
                        <span className="max-w-[100px] truncate block font-semibold text-gray-700">{p.party || "—"}</span>,
                        <span className={`font-bold ${p.type === "Receive" ? "text-emerald-700" : "text-orange-700"}`}>{fmtCr(p.amount)}</span>,
                        <span className="text-gray-500">{p.mode || "—"}</span>,
                        <span>{fmtShort(p.date)}</span>,
                      ])} />
                  </Card>

                  {/* Sales Orders */}
                  <Card title="Sales Orders" icon={Target} iconColor="text-violet-500" count={filtSO.length}
                    right={<span className="text-xs font-black text-violet-700">{fmtCr(filtSO.reduce((a: number, s: any) => a + (s.amount || 0), 0))}</span>}
                    span={2}>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Stat label="Active" value={filtSO.filter((s: any) => ["To Deliver and Bill", "To Bill", "To Deliver", "Submitted"].includes(s.status)).length} color="text-violet-700" />
                      <Stat label="This Month" value={filtSO.filter((s: any) => s.date >= data.period.month_start).length} sub={fmtCr(filtSO.filter((s: any) => s.date >= data.period.month_start).reduce((a: number, s: any) => a + (s.amount || 0), 0))} />
                      <Stat label="Fully Delivered" value={filtSO.filter((s: any) => s.delivered_pct === 100).length} color="text-emerald-700" />
                    </div>
                    <MiniTable
                      cols={["ID", "Customer", "Amount", "Delivered", "Billed", "Delivery", "Status"]}
                      rows={filtSO.slice(0, 30).map((s: any) => [
                        <span className="font-mono text-[9px] text-gray-500">{s.id}</span>,
                        <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{s.customer}</span>,
                        <span className="font-bold">{fmtCr(s.amount)}</span>,
                        <Pbar val={s.delivered_pct} color="bg-emerald-400" />,
                        <Pbar val={s.billed_pct} color="bg-blue-400" />,
                        <span>{fmtShort(s.delivery)}</span>,
                        <Badge label={s.status} variant={sv(s.status)} />,
                      ])} />
                  </Card>

                  {/* Quotations */}
                  <Card title="Open Quotations" icon={FileText} iconColor="text-indigo-500" count={data.sales.quotations.list.length}
                    right={<span className="text-xs font-black text-indigo-700">{fmtCr(data.sales.quotations.total_value)}</span>}>
                    <MiniTable
                      cols={["Party", "Amount", "Valid Till", "Status"]}
                      rows={data.sales.quotations.list.map((q: any) => [
                        <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{q.party || "—"}</span>,
                        <span className="font-bold">{fmtCr(q.amount)}</span>,
                        <span className={q.valid_till && new Date(q.valid_till) < new Date() ? "text-red-600 font-bold" : ""}>{fmtShort(q.valid_till)}</span>,
                        <Badge label={q.status} variant={sv(q.status)} />,
                      ])} />
                  </Card>
                </div>
              )}

              {/* ══ PROCUREMENT ══ */}
              {tab === "Procurement" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {/* PO summary */}
                  <Card title="PO Summary" icon={ShoppingBag} iconColor="text-amber-500">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Total POs" value={filtPO.length} />
                      <Stat label="Pending" value={filtPO.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status)).length} alert />
                      <Stat label="Pending Value" value={fmtCr(filtPO.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status)).reduce((a: number, p: any) => a + (p.amount || 0), 0))} small color="text-amber-700" />
                      <Stat label="Received" value={filtPO.filter((p: any) => p.received_pct === 100).length} color="text-emerald-700" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">Total Value</span><span className="font-bold text-gray-700">{fmtCr(filtPO.reduce((a: number, p: any) => a + (p.amount || 0), 0))}</span></div>
                      <div className="flex justify-between text-[10px]"><span className="text-gray-500">This Month</span><span className="font-bold text-gray-700">{filtPO.filter((p: any) => p.date >= data.period.month_start).length} POs</span></div>
                    </div>
                  </Card>

                  {/* PO list */}
                  <Card title="Purchase Orders" icon={ShoppingBag} iconColor="text-amber-400" count={filtPO.length} span={2}>
                    <MiniTable
                      cols={["PO", "Supplier", "Amount", "Received", "Billed", "Project", "Due", "Status"]}
                      rows={filtPO.slice(0, 40).map((p: any) => [
                        <span className="font-mono text-[9px] text-gray-500">{p.id}</span>,
                        <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.supplier}</span>,
                        <span className="font-bold">{fmtCr(p.amount)}</span>,
                        <Pbar val={p.received_pct} color="bg-emerald-400" />,
                        <Pbar val={p.billed_pct} color="bg-blue-400" />,
                        <span className="text-gray-500 max-w-[70px] truncate block">{p.project || "—"}</span>,
                        <span className={p.due && new Date(p.due) < new Date() && !["Completed", "Closed"].includes(p.status) ? "text-red-600 font-bold" : ""}>{fmtShort(p.due)}</span>,
                        <Badge label={p.status} variant={sv(p.status)} />,
                      ])} />
                  </Card>

                  {/* MRs */}
                  <Card title="Material Requests" icon={ClipboardList} iconColor="text-rose-500" count={filtMR.length}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Pending" value={filtMR.filter((m: any) => ["Draft", "Submitted", "Partially Ordered"].includes(m.status)).length} alert />
                      <Stat label="Ordered" value={filtMR.filter((m: any) => m.status === "Ordered").length} color="text-emerald-700" />
                    </div>
                    <MiniTable
                      cols={["MR", "Type", "Project", "Required By", "Status"]}
                      rows={filtMR.slice(0, 25).map((m: any) => [
                        <span className="font-mono text-[9px] text-gray-500">{m.id}</span>,
                        <span className="text-gray-600">{m.type || "—"}</span>,
                        <span className="text-gray-500 max-w-[80px] truncate block">{m.project || "—"}</span>,
                        <span className={m.due && new Date(m.due) < new Date() && m.status !== "Ordered" ? "text-red-600 font-bold" : ""}>{fmtShort(m.due)}</span>,
                        <Badge label={m.status} variant={sv(m.status)} />,
                      ])} />
                  </Card>

                  {/* Delivery Notes */}
                  <Card title="Delivery Notes" icon={Truck} iconColor="text-teal-500" count={filtDN.length}
                    right={<span className="text-xs font-black text-teal-700">{fmtCr(filtDN.reduce((a: number, d: any) => a + (d.amount || 0), 0))}</span>}
                    span={2}>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Stat label="Pending Billing" value={filtDN.filter((d: any) => d.status === "To Bill" || d.status === "Draft").length} alert />
                      <Stat label="This Month" value={filtDN.filter((d: any) => d.date >= data.period.month_start).length} />
                      <Stat label="Total Value" value={fmtCr(filtDN.reduce((a: number, d: any) => a + (d.amount || 0), 0))} small color="text-teal-700" />
                    </div>
                    <MiniTable
                      cols={["DN", "Customer", "Amount", "Project", "Date", "LR No", "Status"]}
                      rows={filtDN.slice(0, 25).map((d: any) => [
                        <span className="font-mono text-[9px] text-gray-500">{d.id}</span>,
                        <span className="font-semibold text-gray-800 max-w-[110px] truncate block">{d.customer}</span>,
                        <span className="font-bold">{fmtCr(d.amount)}</span>,
                        <span className="text-gray-500 max-w-[80px] truncate block">{d.project || "—"}</span>,
                        <span>{fmtShort(d.date)}</span>,
                        <span className="text-gray-500">{d.lr_no || "—"}</span>,
                        <Badge label={d.status} variant={sv(d.status)} />,
                      ])} />
                  </Card>
                </div>
              )}

              {/* ══ HR ══ */}
              {tab === "HR" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {/* HR summary */}
                  <Card title="HR Summary" icon={Users} iconColor="text-emerald-500">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Total Staff" value={data.hr.total_employees} color="text-emerald-700" />
                      <Stat label="On Leave Today" value={data.hr.on_leave_today} alert={data.hr.on_leave_today > 0} />
                      <Stat label="Pending Leaves" value={data.hr.pending_leave_approvals} alert={data.hr.pending_leave_approvals > 0} />
                      <Stat label="Departments" value={data.hr.department_breakdown.length} />
                    </div>
                    <div className="space-y-1.5">
                      {data.hr.department_breakdown.slice(0, 6).map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 w-32 truncate">{d.dept}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round((d.count / data.hr.total_employees) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 w-5 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* All departments */}
                  <Card title="Department Headcount" icon={UserCheck} iconColor="text-emerald-400"
                    right={<span className="text-[10px] font-bold text-gray-500">{data.hr.total_employees} total</span>}>
                    <div className="overflow-auto max-h-52 space-y-1.5">
                      {data.hr.department_breakdown.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 w-40 truncate">{d.dept}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round((d.count / data.hr.total_employees) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Leave applications */}
                  <Card title="Leave Applications" icon={Calendar} iconColor="text-sky-500" count={data.hr.leave_applications.length}>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Stat label="On Leave Today" value={data.hr.on_leave_today} alert={data.hr.on_leave_today > 0} />
                      <Stat label="Pending" value={data.hr.pending_leave_approvals} alert={data.hr.pending_leave_approvals > 0} />
                      <Stat label="Total" value={data.hr.leave_applications.length} />
                    </div>
                    <MiniTable
                      cols={["Employee", "Type", "From", "To", "Days", "Status"]}
                      rows={data.hr.leave_applications.map((l: any) => [
                        <span className="font-semibold text-gray-800">{l.employee}</span>,
                        <span className="text-gray-500">{l.type}</span>,
                        <span>{fmtShort(l.from)}</span>,
                        <span>{fmtShort(l.to)}</span>,
                        <span className="font-bold">{l.days}</span>,
                        <Badge label={l.status} variant={l.status === "Approved" ? "green" : l.status === "Open" ? "amber" : l.status === "Rejected" ? "red" : "gray"} />,
                      ])} />
                  </Card>

                  {/* Expense Claims */}
                  <Card title="Expense Claims" icon={IndianRupee} iconColor="text-purple-500" count={data.hr.expense_claims.list.length} span={2}>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <Stat label="Pending" value={data.hr.expense_claims.pending} alert={data.hr.expense_claims.pending > 0}
                        sub={fmtCr(data.hr.expense_claims.total_pending_amount)} />
                      <Stat label="Approved" value={data.hr.expense_claims.approved} color="text-emerald-700"
                        sub={fmtCr(data.hr.expense_claims.total_approved_amount)} />
                    </div>
                    <MiniTable
                      cols={["Employee", "Dept", "Date", "Claimed", "Sanctioned", "Status"]}
                      rows={data.hr.expense_claims.list.map((e: any) => [
                        <span className="font-semibold text-gray-800">{e.employee}</span>,
                        <span className="text-gray-500 max-w-[80px] truncate block">{e.department || "—"}</span>,
                        <span>{fmtShort(e.date)}</span>,
                        <span className="font-bold">{fmtCr(e.claimed)}</span>,
                        <span className="font-bold text-emerald-700">{e.sanctioned ? fmtCr(e.sanctioned) : "—"}</span>,
                        <Badge label={e.status} variant={e.status === "Approved" ? "green" : e.status === "Draft" || e.status === "Submitted" ? "amber" : "red"} />,
                      ])} />
                  </Card>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
