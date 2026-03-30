import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, Briefcase, Users, Target,
  ShoppingBag, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Calendar, Printer,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  ClipboardList, Receipt, CreditCard, UserCheck,
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

export default function MisReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/admin/mis-report`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to load MIS data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f0f4f8] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shrink-0 print:border-0">
          <div className="flex items-center gap-4 px-6 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">MD Dashboard — MIS Report</h1>
                <p className="text-[10px] text-gray-400">Management Information Summary · {monthName}</p>
              </div>
            </div>
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

              {/* ── Projects ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-4 mb-3">
                  <SectionTitle title="Active Projects" icon={Briefcase} color="text-blue-500" count={data.projects.list.length} />
                  <div className="ml-auto flex gap-3 text-[10px] text-gray-500">
                    <span>Estimated: <strong className="text-gray-700">{fmtCr(data.projects.total_estimated_value)}</strong></span>
                    <span>Spend: <strong className="text-gray-700">{fmtCr(data.projects.total_actual_expense)}</strong></span>
                    <span>Avg Progress: <strong className="text-gray-700">{data.projects.avg_progress}%</strong></span>
                  </div>
                </div>
                <Tbl
                  headers={["Project", "Customer", "Type", "Progress", "Estimated", "Spend", "Due Date", "Status"]}
                  rows={data.projects.list.map((p: any) => [
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

              {/* ── Sales Orders + Quotations ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <SectionTitle title="Sales Orders" icon={Target} color="text-violet-500" count={data.sales.orders.list.length} />
                    <div className="flex gap-3 text-[10px] text-gray-500 ml-4 shrink-0">
                      <span>Total: <strong className="text-gray-700">{fmtCr(data.sales.orders.total_value)}</strong></span>
                    </div>
                  </div>
                  <Tbl
                    headers={["ID", "Customer", "Amount", "Delivered", "Billed", "Delivery", "Status"]}
                    rows={data.sales.orders.list.map((s: any) => [
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
                  <SectionTitle title="Open Quotations" icon={FileText} color="text-indigo-500" count={data.sales.quotations.list.length} />
                  <Tbl
                    headers={["ID", "Party", "Amount", "Date", "Valid Till", "Status"]}
                    rows={data.sales.quotations.list.map((q: any) => [
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

              {/* ── Receivables + Payables ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <SectionTitle title="Receivables — Outstanding Invoices" icon={Receipt} color="text-sky-500" />
                  </div>
                  <div className="flex gap-4 mb-3 text-[10px] text-gray-500">
                    <span>Total: <strong className="text-sky-700">{fmtCr(data.sales.receivables.total_receivable)}</strong></span>
                    <span>Overdue: <strong className="text-red-600">{fmtCr(data.sales.receivables.overdue_receivable)}</strong> ({data.sales.receivables.overdue_invoices} inv)</span>
                  </div>
                  <Tbl
                    headers={["Invoice", "Customer", "Total", "Outstanding", "Posted", "Due", "Age"]}
                    rows={data.sales.receivables.all_outstanding.map((i: any) => [
                      <span className="font-mono text-[10px] text-gray-500">{i.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[100px] truncate block">{i.customer}</span>,
                      <span>{fmtCr(i.amount)}</span>,
                      <span className={`font-bold ${i.overdue ? "text-red-600" : "text-sky-700"}`}>{fmtCr(i.outstanding)}</span>,
                      <span>{fmtShort(i.posted)}</span>,
                      <span className={i.overdue ? "text-red-600 font-bold" : ""}>{fmtDate(i.due)}</span>,
                      i.overdue
                        ? <Badge label={`${Math.floor((new Date().getTime() - new Date(i.due).getTime()) / 86400000)}d`} variant="red" />
                        : <Badge label="Current" variant="green" />,
                    ])}
                  />
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionTitle title="Payables — Outstanding Invoices" icon={CreditCard} color="text-orange-500" />
                  <div className="flex gap-4 mb-3 text-[10px] text-gray-500">
                    <span>Total: <strong className="text-orange-700">{fmtCr(data.payables.total_payable)}</strong></span>
                    <span>Overdue: <strong className="text-red-600">{data.payables.overdue_invoices} invoices</strong></span>
                  </div>
                  <Tbl
                    headers={["Invoice", "Supplier", "Total", "Outstanding", "Posted", "Due", "Age"]}
                    rows={data.payables.all_outstanding.map((i: any) => [
                      <span className="font-mono text-[10px] text-gray-500">{i.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[100px] truncate block">{i.supplier}</span>,
                      <span>{fmtCr(i.amount)}</span>,
                      <span className={`font-bold ${i.overdue ? "text-red-600" : "text-orange-700"}`}>{fmtCr(i.outstanding)}</span>,
                      <span>{fmtShort(i.posted)}</span>,
                      <span className={i.overdue ? "text-red-600 font-bold" : ""}>{fmtDate(i.due)}</span>,
                      i.overdue
                        ? <Badge label={`${Math.floor((new Date().getTime() - new Date(i.due).getTime()) / 86400000)}d`} variant="red" />
                        : <Badge label="Current" variant="green" />,
                    ])}
                  />
                </div>
              </div>

              {/* ── Purchase Orders ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-4 mb-3">
                  <SectionTitle title="Purchase Orders" icon={ShoppingBag} color="text-amber-500" count={data.procurement.purchase_orders.list.length} />
                  <div className="ml-auto flex gap-3 text-[10px] text-gray-500">
                    <span>Total Value: <strong className="text-gray-700">{fmtCr(data.procurement.purchase_orders.total_value)}</strong></span>
                    <span>Pending: <strong className="text-amber-700">{data.procurement.purchase_orders.pending} POs · {fmtCr(data.procurement.purchase_orders.pending_value)}</strong></span>
                  </div>
                </div>
                <Tbl
                  headers={["PO", "Supplier", "Amount", "Received", "Billed", "Project", "Order Date", "Due Date", "Status"]}
                  rows={data.procurement.purchase_orders.list.map((p: any) => [
                    <span className="font-mono text-[10px] text-gray-500">{p.id}</span>,
                    <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.supplier}</span>,
                    <span className="font-bold">{fmtCr(p.amount)}</span>,
                    pbar(p.received_pct, "bg-emerald-400"),
                    pbar(p.billed_pct, "bg-blue-400"),
                    <span className="text-gray-500 max-w-[80px] truncate block">{p.project || "—"}</span>,
                    <span>{fmtShort(p.date)}</span>,
                    <span className={p.due && new Date(p.due) < new Date() && !["Completed", "Closed"].includes(p.status) ? "text-red-600 font-bold" : ""}>{fmtDate(p.due)}</span>,
                    <Badge label={p.status} variant={statusVariant(p.status)} />,
                  ])}
                />
              </div>

              {/* ── Material Requests ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <SectionTitle title="Material Requests" icon={ClipboardList} color="text-rose-500" count={data.procurement.material_requests.list.length} />
                <Tbl
                  headers={["MR", "Type", "Project", "Requested By", "Date", "Required By", "Status"]}
                  rows={data.procurement.material_requests.list.map((m: any) => [
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

              {/* ── HR ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Department Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionTitle title="Department Headcount" icon={UserCheck} color="text-emerald-500" />
                  <div className="space-y-2">
                    {data.hr.department_breakdown.map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-44 truncate">{d.dept}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.round((d.count / data.hr.total_employees) * 100)}%` }}
                          />
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

                {/* Leave Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-4 mb-3">
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
