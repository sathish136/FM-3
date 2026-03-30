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

const TABS = ["Overview", "Accounts", "Projects", "Sales & Finance", "Procurement", "HR"] as const;
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
      j.hr.salary = j.hr.salary ?? {}; j.hr.salary.list = j.hr.salary.list ?? []; j.hr.salary.gross_this_month = j.hr.salary.gross_this_month ?? 0; j.hr.salary.net_this_month = j.hr.salary.net_this_month ?? 0; j.hr.salary.deduction_this_month = j.hr.salary.deduction_this_month ?? 0; j.hr.salary.gross_ytd = j.hr.salary.gross_ytd ?? 0; j.hr.salary.net_ytd = j.hr.salary.net_ytd ?? 0; j.hr.salary.monthly_trend = j.hr.salary.monthly_trend ?? []; j.hr.salary.dept_cost = j.hr.salary.dept_cost ?? []; j.hr.salary.slips_this_month = j.hr.salary.slips_this_month ?? 0;
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
              {tab === "Overview" && (() => {
                const totalRec = filtRec.reduce((a: number, i: any) => a + (i.outstanding || 0), 0);
                const totalPay = filtPay.reduce((a: number, i: any) => a + (i.outstanding || 0), 0);
                const netPos = totalRec - totalPay;
                const collected = filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0);
                const paidOut  = filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0);
                const overdueRecAmt = filtRec.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0);
                const overduePayAmt = filtPay.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0);
                const pendingPOList = filtPO.filter((p: any) => ["To Receive and Bill","To Bill","To Receive","Draft"].includes(p.status));
                const pendingMRList = filtMR.filter((m: any) => ["Draft","Submitted","Partially Ordered"].includes(m.status));
                const pendingDNList = filtDN.filter((d: any) => d.status === "To Bill" || d.status === "Draft");
                const activeSO = filtSO.filter((s: any) => ["To Deliver and Bill","To Bill","To Deliver","Submitted"].includes(s.status));

                // Group receivables by customer (top 6)
                const recByParty: Record<string, number> = {};
                filtRec.forEach((i: any) => { recByParty[i.customer] = (recByParty[i.customer]||0) + (i.outstanding||0); });
                const topRec = Object.entries(recByParty).sort((a,b)=>b[1]-a[1]).slice(0,6);

                // Group payables by supplier (top 6)
                const payByParty: Record<string, number> = {};
                filtPay.forEach((i: any) => { payByParty[i.supplier] = (payByParty[i.supplier]||0) + (i.outstanding||0); });
                const topPay = Object.entries(payByParty).sort((a,b)=>b[1]-a[1]).slice(0,6);

                // Alerts
                const alerts: {label:string;value:string;tab:Tab;color:string}[] = [];
                if(filtRec.filter((i:any)=>i.overdue).length>0) alerts.push({label:`${filtRec.filter((i:any)=>i.overdue).length} overdue sales invoices`,value:fmtCr(overdueRecAmt),tab:"Accounts",color:"text-red-600"});
                if(filtPay.filter((i:any)=>i.overdue).length>0) alerts.push({label:`${filtPay.filter((i:any)=>i.overdue).length} overdue purchase invoices`,value:fmtCr(overduePayAmt),tab:"Accounts",color:"text-orange-600"});
                if(data.hr.expense_claims.pending>0) alerts.push({label:`${data.hr.expense_claims.pending} expense claims awaiting approval`,value:fmtCr(data.hr.expense_claims.total_pending_amount),tab:"HR",color:"text-purple-600"});
                if(data.hr.pending_leave_approvals>0) alerts.push({label:`${data.hr.pending_leave_approvals} leave applications pending`,value:"",tab:"HR",color:"text-sky-600"});
                if(pendingMRList.length>0) alerts.push({label:`${pendingMRList.length} material requests pending`,value:"",tab:"Procurement",color:"text-rose-600"});
                if(pendingDNList.length>0) alerts.push({label:`${pendingDNList.length} delivery notes not yet billed`,value:"",tab:"Procurement",color:"text-teal-600"});

                return (
                  <div className="space-y-3">
                    {/* ── Row 1: Financial headline ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        {label:"Total Receivable",sub:`${filtRec.filter((i:any)=>i.overdue).length} overdue invoices`,value:fmtCr(totalRec),sub2:`Overdue: ${fmtCr(overdueRecAmt)}`,color:"from-sky-500 to-cyan-400",alert:filtRec.some((i:any)=>i.overdue)},
                        {label:"Total Payable",sub:`${filtPay.filter((i:any)=>i.overdue).length} overdue invoices`,value:fmtCr(totalPay),sub2:`Overdue: ${fmtCr(overduePayAmt)}`,color:"from-orange-500 to-amber-400",alert:filtPay.some((i:any)=>i.overdue)},
                        {label:"Net Position",sub:"Receivable − Payable",value:fmtCr(Math.abs(netPos)),sub2:netPos>=0?"Favourable (you are owed more)":"Unfavourable (you owe more)",color:netPos>=0?"from-emerald-500 to-green-400":"from-red-500 to-orange-400",alert:netPos<0},
                        {label:"Cash Collected",sub:`Paid out: ${fmtCr(paidOut)}`,value:fmtCr(collected),sub2:`Net cash: ${fmtCr(collected-paidOut)}`,color:"from-violet-500 to-indigo-400",alert:false},
                      ].map((h,i)=>(
                        <div key={i} className={`rounded-2xl bg-gradient-to-br ${h.color} p-4 text-white shadow-md`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{h.label}</p>
                          <p className="text-2xl font-black leading-tight">{h.value}</p>
                          <p className="text-[10px] opacity-75 mt-0.5">{h.sub}</p>
                          <p className="text-[10px] font-semibold mt-1 opacity-90">{h.sub2}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Row 2: Action alerts + Sales + Projects ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {/* Alerts */}
                      <Card title="Action Required" icon={AlertTriangle} iconColor="text-red-500"
                        count={alerts.length}
                        right={alerts.length===0?<Badge label="All Clear" variant="green"/>:<Badge label="Needs Attention" variant="red"/>}>
                        {alerts.length===0
                          ? <p className="text-xs text-emerald-600 font-semibold py-2 text-center">✓ Nothing pending action</p>
                          : <div className="space-y-1.5">
                              {alerts.map((a,i)=>(
                                <button key={i} onClick={()=>setTab(a.tab)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors">
                                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" style={{color:"currentColor"}} />
                                  <span className={`flex-1 text-[11px] font-semibold ${a.color}`}>{a.label}</span>
                                  {a.value&&<span className={`text-[10px] font-black ${a.color} shrink-0`}>{a.value}</span>}
                                  <ChevronRight className="w-3 h-3 text-gray-300 shrink-0"/>
                                </button>
                              ))}
                            </div>
                        }
                      </Card>

                      {/* Sales & Revenue */}
                      <Card title="Sales & Revenue" icon={Target} iconColor="text-violet-500"
                        right={<button onClick={()=>setTab("Sales & Finance")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <Stat label="Active Sales Orders" value={activeSO.length} color="text-violet-700"/>
                          <Stat label="SO Value (Active)" value={fmtCr(activeSO.reduce((a:number,s:any)=>a+(s.amount||0),0))} color="text-violet-700" small/>
                          <Stat label="New SOs This Month" value={filtSO.filter((s:any)=>s.date>=data.period.month_start).length}/>
                          <Stat label="Open Quotations" value={data.sales.quotations.open} sub={fmtCr(data.sales.quotations.total_value)}/>
                          <Stat label="Fully Delivered" value={filtSO.filter((s:any)=>s.delivered_pct===100).length} color="text-emerald-700"/>
                          <Stat label="DNs Pending Bill" value={pendingDNList.length} alert={pendingDNList.length>0}/>
                        </div>
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Total SO Value</span><span className="font-bold">{fmtCr(filtSO.reduce((a:number,s:any)=>a+(s.amount||0),0))}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Quotation Pipeline</span><span className="font-bold text-indigo-600">{fmtCr(data.sales.quotations.total_value)}</span></div>
                        </div>
                      </Card>

                      {/* Projects */}
                      <Card title="Project Health" icon={Briefcase} iconColor="text-blue-500"
                        right={<button onClick={()=>setTab("Projects")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <Stat label="Active" value={data.projects.active} color="text-blue-700"/>
                          <Stat label="Completed" value={data.projects.completed} color="text-emerald-700"/>
                          <Stat label="Overdue" value={data.projects.overdue} alert={data.projects.overdue>0}/>
                        </div>
                        <div className="space-y-2 mb-2">
                          {filtP.slice(0,4).map((p:any,i:number)=>(
                            <div key={i} className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.overdue?"bg-red-500":p.progress>=80?"bg-emerald-500":"bg-blue-400"}`}/>
                              <span className="text-[10px] text-gray-700 w-28 truncate font-semibold">{p.name}</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${p.overdue?"bg-red-400":p.progress>=80?"bg-emerald-400":"bg-blue-400"}`} style={{width:`${p.progress}%`}}/>
                              </div>
                              <span className="text-[9px] font-bold text-gray-500 w-7 text-right">{p.progress}%</span>
                            </div>
                          ))}
                          {filtP.length>4&&<p className="text-[9px] text-gray-400">+{filtP.length-4} more projects</p>}
                        </div>
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Estimated</span><span className="font-bold">{fmtCr(data.projects.total_estimated_value)}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Actual Spend</span><span className="font-bold">{fmtCr(data.projects.total_actual_expense)}</span></div>
                        </div>
                      </Card>
                    </div>

                    {/* ── Row 3: Top Receivables + Top Payables + Procurement + HR ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                      {/* Top Receivables */}
                      <Card title="Top Receivables" icon={TrendingUp} iconColor="text-sky-500"
                        right={<button onClick={()=>setTab("Accounts")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">All<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="mb-2">
                          <AgingBar items={filtRec}/>
                        </div>
                        <div className="space-y-1 mt-2">
                          {topRec.map(([party,amt],i)=>{
                            const hasOD = filtRec.some((x:any)=>x.customer===party&&x.overdue);
                            return (
                              <div key={i} className="flex items-center gap-2 py-0.5 border-b border-gray-50">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasOD?"bg-red-400":"bg-sky-300"}`}/>
                                <span className="flex-1 text-[11px] font-semibold text-gray-700 truncate">{party}</span>
                                <span className={`text-[11px] font-black shrink-0 ${hasOD?"text-red-600":"text-sky-700"}`}>{fmtCr(amt)}</span>
                              </div>
                            );
                          })}
                          {topRec.length===0&&<p className="text-[10px] text-gray-400 text-center py-2">No outstanding</p>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px]">
                          <span className="text-gray-500">Total Outstanding</span>
                          <span className="font-black text-sky-700">{fmtCr(totalRec)}</span>
                        </div>
                      </Card>

                      {/* Top Payables */}
                      <Card title="Top Payables" icon={TrendingDown} iconColor="text-orange-500"
                        right={<button onClick={()=>setTab("Accounts")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">All<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="mb-2">
                          <AgingBar items={filtPay}/>
                        </div>
                        <div className="space-y-1 mt-2">
                          {topPay.map(([party,amt],i)=>{
                            const hasOD = filtPay.some((x:any)=>x.supplier===party&&x.overdue);
                            return (
                              <div key={i} className="flex items-center gap-2 py-0.5 border-b border-gray-50">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasOD?"bg-red-400":"bg-orange-300"}`}/>
                                <span className="flex-1 text-[11px] font-semibold text-gray-700 truncate">{party}</span>
                                <span className={`text-[11px] font-black shrink-0 ${hasOD?"text-red-600":"text-orange-700"}`}>{fmtCr(amt)}</span>
                              </div>
                            );
                          })}
                          {topPay.length===0&&<p className="text-[10px] text-gray-400 text-center py-2">No outstanding</p>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px]">
                          <span className="text-gray-500">Total Payable</span>
                          <span className="font-black text-orange-700">{fmtCr(totalPay)}</span>
                        </div>
                      </Card>

                      {/* Procurement */}
                      <Card title="Procurement" icon={ShoppingBag} iconColor="text-amber-500"
                        right={<button onClick={()=>setTab("Procurement")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="space-y-2">
                          {[
                            {label:"Purchase Orders",total:filtPO.length,pending:pendingPOList.length,value:fmtCr(pendingPOList.reduce((a:number,p:any)=>a+(p.amount||0),0)),color:"bg-amber-400"},
                            {label:"Material Requests",total:filtMR.length,pending:pendingMRList.length,value:"",color:"bg-rose-400"},
                            {label:"Delivery Notes",total:filtDN.length,pending:pendingDNList.length,value:"",color:"bg-teal-400"},
                          ].map((r,i)=>(
                            <div key={i} className="rounded-lg bg-gray-50 p-2.5">
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-700">{r.label}</span>
                                <span className="text-[9px] text-gray-500">{r.total} total</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${r.color} rounded-full`} style={{width:`${r.total>0?Math.round((r.pending/r.total)*100):0}%`}}/>
                                </div>
                                <span className={`text-[10px] font-black ${r.pending>0?"text-amber-700":"text-emerald-600"}`}>{r.pending} pending</span>
                              </div>
                              {r.value&&<p className="text-[9px] text-gray-500 mt-0.5">Value: {r.value}</p>}
                            </div>
                          ))}
                        </div>
                      </Card>

                      {/* HR & People */}
                      <Card title="People & HR" icon={Users} iconColor="text-emerald-500"
                        right={<button onClick={()=>setTab("HR")} className="text-[9px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">Details<ChevronRight className="w-3 h-3"/></button>}>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <Stat label="Total Staff" value={data.hr.total_employees} color="text-emerald-700"/>
                          <Stat label="On Leave Today" value={data.hr.on_leave_today} alert={data.hr.on_leave_today>0}/>
                          <Stat label="Pending Leaves" value={data.hr.pending_leave_approvals} alert={data.hr.pending_leave_approvals>0}/>
                          <Stat label="Expense Claims" value={data.hr.expense_claims.pending} alert={data.hr.expense_claims.pending>0} sub="pending approval"/>
                        </div>
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Salary This Month</span><span className="font-bold text-purple-700">{fmtCr(data.hr.salary.gross_this_month)}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Net Pay This Month</span><span className="font-bold">{fmtCr(data.hr.salary.net_this_month)}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Expense Pending</span><span className="font-bold text-rose-600">{fmtCr(data.hr.expense_claims.total_pending_amount)}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-gray-500">Salary YTD</span><span className="font-bold">{fmtCr(data.hr.salary.gross_ytd)}</span></div>
                        </div>
                        {/* Dept mini chart */}
                        {data.hr.department_breakdown.length>0&&(
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                            {data.hr.department_breakdown.slice(0,3).map((d:any,i:number)=>(
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-500 w-24 truncate">{d.dept}</span>
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full" style={{width:`${Math.round((d.count/data.hr.total_employees)*100)}%`}}/>
                                </div>
                                <span className="text-[9px] font-bold text-gray-600">{d.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                );
              })()}

              {/* ══ ACCOUNTS ══ */}
              {tab === "Accounts" && (
                <div className="space-y-3">
                  {/* Row 1: Our Side Pending (Receivables) + Accounts Side Pending (Payables) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* OUR SIDE PENDING — Sales Invoice Outstanding */}
                    <Card title="Our Side Pending — Sales Invoice Outstanding" icon={TrendingUp} iconColor="text-sky-500"
                      count={filtRec.length}
                      right={<span className="text-sm font-black text-sky-700">{fmtCr(filtRec.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}</span>}>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Stat label="Total Receivable" value={fmtCr(filtRec.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} color="text-sky-700" small />
                        <Stat label="Overdue Amount" value={fmtCr(filtRec.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} alert={filtRec.some((i: any) => i.overdue)} small />
                        <Stat label="Overdue Invoices" value={filtRec.filter((i: any) => i.overdue).length} alert={filtRec.some((i: any) => i.overdue)} />
                      </div>
                      <AgingBar items={filtRec} />
                      <div className="mt-3">
                        <MiniTable
                          cols={["Customer", "Invoice", "Invoice Amt", "Outstanding", "Due Date", "Age"]}
                          rows={filtRec.map((i: any) => [
                            <span className="font-semibold text-gray-800 max-w-[130px] truncate block">{i.customer}</span>,
                            <span className="font-mono text-[9px] text-gray-400">{i.id}</span>,
                            <span>{fmtCr(i.amount)}</span>,
                            <span className={`font-bold ${i.overdue ? "text-red-600" : "text-sky-700"}`}>{fmtCr(i.outstanding)}</span>,
                            <span className={i.overdue ? "text-red-600 font-bold" : ""}>{fmtDate(i.due)}</span>,
                            i.overdue
                              ? <Badge label={`${ageDays(i.due)}d overdue`} variant="red" />
                              : <Badge label="Current" variant="green" />,
                          ])} />
                      </div>
                    </Card>

                    {/* ACCOUNTS SIDE PENDING — Purchase Invoice Outstanding */}
                    <Card title="Accounts Side Pending — Purchase Invoice Outstanding" icon={TrendingDown} iconColor="text-orange-500"
                      count={filtPay.length}
                      right={<span className="text-sm font-black text-orange-700">{fmtCr(filtPay.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))}</span>}>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Stat label="Total Payable" value={fmtCr(filtPay.reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} color="text-orange-700" small />
                        <Stat label="Overdue Amount" value={fmtCr(filtPay.filter((i: any) => i.overdue).reduce((a: number, i: any) => a + (i.outstanding || 0), 0))} alert={filtPay.some((i: any) => i.overdue)} small />
                        <Stat label="Overdue Invoices" value={filtPay.filter((i: any) => i.overdue).length} alert={filtPay.some((i: any) => i.overdue)} />
                      </div>
                      <AgingBar items={filtPay} />
                      <div className="mt-3">
                        <MiniTable
                          cols={["Supplier", "Invoice", "Invoice Amt", "Outstanding", "Due Date", "Age"]}
                          rows={filtPay.map((i: any) => [
                            <span className="font-semibold text-gray-800 max-w-[130px] truncate block">{i.supplier}</span>,
                            <span className="font-mono text-[9px] text-gray-400">{i.id}</span>,
                            <span>{fmtCr(i.amount)}</span>,
                            <span className={`font-bold ${i.overdue ? "text-red-600" : "text-orange-700"}`}>{fmtCr(i.outstanding)}</span>,
                            <span className={i.overdue ? "text-red-600 font-bold" : ""}>{fmtDate(i.due)}</span>,
                            i.overdue
                              ? <Badge label={`${ageDays(i.due)}d overdue`} variant="red" />
                              : <Badge label="Current" variant="green" />,
                          ])} />
                      </div>
                    </Card>
                  </div>

                  {/* Row 2: Sales Invoice Payments + PO Pending */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* SALES INVOICE PAYMENTS — Money Collected */}
                    <Card title="Sales Invoice Payments — Money Collected" icon={Wallet} iconColor="text-emerald-600"
                      count={filtPmt.filter((p: any) => p.type === "Receive").length}
                      right={<span className="text-sm font-black text-emerald-700">{fmtCr(filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0))}</span>}>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Stat label="Total Collected" value={fmtCr(filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-emerald-700" small />
                        <Stat label="Total Paid Out" value={fmtCr(filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-orange-700" small />
                        <Stat label="Net Cash Flow" value={fmtCr(
                          filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0)
                          - filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0)
                        )} color={
                          filtPmt.filter((p: any) => p.type === "Receive").reduce((a: number, p: any) => a + (p.amount || 0), 0)
                          >= filtPmt.filter((p: any) => p.type === "Pay").reduce((a: number, p: any) => a + (p.amount || 0), 0)
                          ? "text-emerald-700" : "text-red-600"
                        } small />
                      </div>
                      <MiniTable
                        cols={["Type", "Party", "Amount", "Mode", "Ref No", "Date"]}
                        rows={filtPmt.slice(0, 30).map((p: any) => [
                          <Badge label={p.type} variant={p.type === "Receive" ? "green" : p.type === "Pay" ? "red" : "blue"} />,
                          <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.party || "—"}</span>,
                          <span className={`font-bold ${p.type === "Receive" ? "text-emerald-700" : "text-orange-700"}`}>{fmtCr(p.amount)}</span>,
                          <span className="text-gray-500">{p.mode || "—"}</span>,
                          <span className="text-gray-400 font-mono text-[9px]">{p.ref || "—"}</span>,
                          <span>{fmtShort(p.date)}</span>,
                        ])} />
                    </Card>

                    {/* PO PENDING */}
                    <Card title="PO Pending — Goods / Services Not Yet Received" icon={ShoppingBag} iconColor="text-amber-500"
                      count={filtPO.filter((p: any) => ["To Receive and Bill", "To Bill", "To Receive", "Draft"].includes(p.status)).length}
                      right={<span className="text-sm font-black text-amber-700">{fmtCr(filtPO.filter((p: any) => ["To Receive and Bill", "To Bill", "To Receive", "Draft"].includes(p.status)).reduce((a: number, p: any) => a + (p.amount || 0), 0))}</span>}>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Stat label="Pending POs" value={filtPO.filter((p: any) => ["To Receive and Bill", "To Bill", "To Receive", "Draft"].includes(p.status)).length} alert />
                        <Stat label="Pending Value" value={fmtCr(filtPO.filter((p: any) => ["To Receive and Bill", "To Bill", "To Receive", "Draft"].includes(p.status)).reduce((a: number, p: any) => a + (p.amount || 0), 0))} color="text-amber-700" small />
                        <Stat label="Overdue POs" value={filtPO.filter((p: any) => p.due && new Date(p.due) < new Date() && !["Completed","Closed"].includes(p.status)).length} alert={filtPO.some((p: any) => p.due && new Date(p.due) < new Date() && !["Completed","Closed"].includes(p.status))} />
                      </div>
                      <MiniTable
                        cols={["PO", "Supplier", "Amount", "Received%", "Due Date", "Status"]}
                        rows={filtPO.filter((p: any) => ["To Receive and Bill", "To Bill", "To Receive", "Draft"].includes(p.status)).map((p: any) => [
                          <span className="font-mono text-[9px] text-gray-400">{p.id}</span>,
                          <span className="font-semibold text-gray-800 max-w-[130px] truncate block">{p.supplier}</span>,
                          <span className="font-bold text-amber-700">{fmtCr(p.amount)}</span>,
                          <Pbar val={p.received_pct} color="bg-emerald-400" />,
                          <span className={p.due && new Date(p.due) < new Date() ? "text-red-600 font-bold" : ""}>{fmtDate(p.due)}</span>,
                          <Badge label={p.status} variant={sv(p.status)} />,
                        ])} />
                    </Card>
                  </div>

                  {/* Row 3: Employee Cost */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Salary summary */}
                    <Card title="Employee Cost — Salary This Month" icon={Users} iconColor="text-purple-500">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <Stat label="Gross This Month" value={fmtCr(data.hr.salary.gross_this_month)} color="text-purple-700" small />
                        <Stat label="Net This Month" value={fmtCr(data.hr.salary.net_this_month)} color="text-indigo-700" small />
                        <Stat label="Total Deductions" value={fmtCr(data.hr.salary.deduction_this_month)} color="text-gray-700" small />
                        <Stat label="Slips Processed" value={data.hr.salary.slips_this_month} />
                      </div>
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-[10px] font-semibold"><span className="text-gray-500">Gross YTD</span><span className="text-purple-700">{fmtCr(data.hr.salary.gross_ytd)}</span></div>
                        <div className="flex justify-between text-[10px] font-semibold"><span className="text-gray-500">Net YTD</span><span className="text-indigo-700">{fmtCr(data.hr.salary.net_ytd)}</span></div>
                        <div className="flex justify-between text-[10px] font-semibold"><span className="text-gray-500">Expense Claims Pending</span><span className="text-red-600">{fmtCr(data.hr.expense_claims.total_pending_amount)}</span></div>
                      </div>
                      {/* Mini payroll trend bar */}
                      {data.hr.salary.monthly_trend.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">6-Month Payroll Trend</p>
                          <div className="flex items-end gap-1 h-12">
                            {(() => {
                              const max = Math.max(...data.hr.salary.monthly_trend.map((m: any) => m.gross), 1);
                              return data.hr.salary.monthly_trend.map((m: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className="w-full bg-purple-200 rounded-sm" style={{ height: `${Math.round((m.gross / max) * 40)}px` }} title={`${m.month}: ${fmtCr(m.gross)}`} />
                                  <span className="text-[7px] text-gray-400">{m.month.slice(5)}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Dept cost breakdown */}
                    <Card title="Salary Cost by Department" icon={UserCheck} iconColor="text-purple-400">
                      {data.hr.salary.dept_cost.length === 0
                        ? <p className="text-[10px] text-gray-400 text-center py-4">No salary data yet</p>
                        : (
                          <div className="overflow-auto max-h-52 space-y-1.5">
                            {data.hr.salary.dept_cost.map((d: any, i: number) => {
                              const total = data.hr.salary.dept_cost.reduce((a: number, x: any) => a + x.gross, 0);
                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-600 w-36 truncate">{d.dept}</span>
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.round((d.gross / Math.max(total, 1)) * 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-700 w-16 text-right">{fmtCr(d.gross)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </Card>

                    {/* Expense Claims pending */}
                    <Card title="Expense Claims Pending" icon={IndianRupee} iconColor="text-rose-500"
                      count={data.hr.expense_claims.pending}
                      right={data.hr.expense_claims.pending > 0 ? <Badge label="Action Needed" variant="red" /> : undefined}>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <Stat label="Pending" value={data.hr.expense_claims.pending} alert={data.hr.expense_claims.pending > 0}
                          sub={fmtCr(data.hr.expense_claims.total_pending_amount)} />
                        <Stat label="Approved" value={data.hr.expense_claims.approved} color="text-emerald-700"
                          sub={fmtCr(data.hr.expense_claims.total_approved_amount)} />
                      </div>
                      <MiniTable
                        cols={["Employee", "Claimed", "Status", "Date"]}
                        rows={data.hr.expense_claims.list.filter((e: any) => e.status === "Draft" || e.status === "Submitted").map((e: any) => [
                          <span className="font-semibold text-gray-800 max-w-[100px] truncate block">{e.employee}</span>,
                          <span className="font-bold text-rose-600">{fmtCr(e.claimed)}</span>,
                          <Badge label={e.status} variant={e.status === "Approved" ? "green" : "amber"} />,
                          <span>{fmtShort(e.date)}</span>,
                        ])} />
                    </Card>
                  </div>
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
