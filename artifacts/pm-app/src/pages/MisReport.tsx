import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, TrendingUp, TrendingDown, Briefcase, Users, ShoppingCart,
  ShoppingBag, FileText, AlertTriangle, CheckCircle, Clock, DollarSign,
  BarChart3, Target, Calendar, ArrowUpRight, ArrowDownRight, Minus,
  Building2, ChevronDown, ChevronRight, Printer, Download,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmtCr(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  alert?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, color, bg, trend, trendLabel, alert }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? "border-red-200 shadow-red-50" : "border-gray-200"} shadow-sm p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trendLabel && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${trend === "up" ? "bg-emerald-100 text-emerald-700" : trend === "down" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-black ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color }: { title: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pctVal = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pctVal}%` }} />
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" | "gray" }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  }[variant];
  return <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cls}`}>{label}</span>;
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
        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 shrink-0">
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
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors hidden sm:block" title="Print">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Active Projects" value={data.projects.active}
                  sub={`${data.projects.completed} completed · ${data.projects.overdue} overdue`}
                  icon={Briefcase} color="text-blue-600" bg="bg-blue-50"
                  alert={data.projects.overdue > 0}
                  trendLabel={data.projects.overdue > 0 ? `${data.projects.overdue} overdue` : undefined}
                  trend={data.projects.overdue > 0 ? "down" : "neutral"} />

                <StatCard label="Total Employees" value={data.hr.total_employees}
                  sub={`${data.hr.on_leave_today} on leave today · ${data.hr.pending_leave_approvals} pending approvals`}
                  icon={Users} color="text-emerald-600" bg="bg-emerald-50" />

                <StatCard label="Sales Orders" value={data.sales.orders.active}
                  sub={`This month: ${fmtCr(data.sales.orders.this_month_value)}`}
                  icon={Target} color="text-violet-600" bg="bg-violet-50"
                  trendLabel={`${data.sales.orders.this_month} this month`} trend="up" />

                <StatCard label="Receivable" value={fmtCr(data.sales.receivables.total_receivable)}
                  sub={`${data.sales.receivables.outstanding_invoices} invoices · ${fmtCr(data.sales.receivables.overdue_receivable)} overdue`}
                  icon={TrendingUp} color="text-sky-600" bg="bg-sky-50"
                  alert={data.sales.receivables.overdue_receivable > 0} />

                <StatCard label="Payable" value={fmtCr(data.payables.total_payable)}
                  sub={`${data.payables.outstanding_invoices} invoices · ${data.payables.overdue_invoices} overdue`}
                  icon={TrendingDown} color="text-orange-600" bg="bg-orange-50"
                  alert={data.payables.overdue_invoices > 0} />

                <StatCard label="Pending POs" value={data.procurement.purchase_orders.pending}
                  sub={`Value: ${fmtCr(data.procurement.purchase_orders.pending_value)}`}
                  icon={ShoppingBag} color="text-amber-600" bg="bg-amber-50" />
              </div>

              {/* ── Projects + Sales ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Projects */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionHeader title="Projects Overview" icon={Briefcase} color="text-blue-500" />
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center bg-blue-50 rounded-xl p-3">
                      <p className="text-lg font-black text-blue-700">{data.projects.active}</p>
                      <p className="text-[10px] text-blue-500 font-semibold">Active</p>
                    </div>
                    <div className="text-center bg-emerald-50 rounded-xl p-3">
                      <p className="text-lg font-black text-emerald-700">{data.projects.completed}</p>
                      <p className="text-[10px] text-emerald-500 font-semibold">Completed</p>
                    </div>
                    <div className={`text-center rounded-xl p-3 ${data.projects.overdue > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                      <p className={`text-lg font-black ${data.projects.overdue > 0 ? "text-red-700" : "text-gray-400"}`}>{data.projects.overdue}</p>
                      <p className={`text-[10px] font-semibold ${data.projects.overdue > 0 ? "text-red-500" : "text-gray-400"}`}>Overdue</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-gray-500">Avg Progress (Active)</span>
                    <span className="text-xs font-bold text-gray-700">{data.projects.avg_progress}%</span>
                  </div>
                  <ProgressBar value={data.projects.avg_progress} max={100} color="bg-blue-500" />

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Total Estimated</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">{fmtCr(data.projects.total_estimated_value)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Actual Spend</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">{fmtCr(data.projects.total_actual_expense)}</p>
                    </div>
                  </div>

                  {data.projects.recent.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Active Projects</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.projects.recent.map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <ProgressBar value={p.progress} max={100} color={p.progress >= 80 ? "bg-emerald-500" : p.progress >= 50 ? "bg-blue-500" : "bg-amber-500"} />
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 shrink-0 w-8 text-right">{p.progress}%</span>
                            {p.due && new Date(p.due) < new Date() ? (
                              <Badge label="OVERDUE" variant="red" />
                            ) : p.due ? (
                              <span className="text-[9px] text-gray-400 whitespace-nowrap">{fmtDate(p.due)}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionHeader title="Sales & Revenue" icon={Target} color="text-violet-500" />
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-violet-50 rounded-xl p-3">
                      <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide">Total SO Value</p>
                      <p className="text-lg font-black text-violet-700 mt-0.5">{fmtCr(data.sales.orders.total_value)}</p>
                      <p className="text-[10px] text-violet-400">{data.sales.orders.total} orders</p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3">
                      <p className="text-[10px] text-sky-500 font-semibold uppercase tracking-wide">This Month</p>
                      <p className="text-lg font-black text-sky-700 mt-0.5">{fmtCr(data.sales.orders.this_month_value)}</p>
                      <p className="text-[10px] text-sky-400">{data.sales.orders.this_month} orders</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-gray-700">Open Quotations</p>
                        <p className="text-[10px] text-gray-400">{data.sales.quotations.open} quotations</p>
                      </div>
                      <p className="text-sm font-black text-gray-800">{fmtCr(data.sales.quotations.total_value)}</p>
                    </div>

                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${data.sales.receivables.overdue_receivable > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                      <div>
                        <p className="text-xs font-bold text-gray-700">Total Receivable</p>
                        <p className={`text-[10px] ${data.sales.receivables.overdue_receivable > 0 ? "text-red-500" : "text-gray-400"}`}>
                          {fmtCr(data.sales.receivables.overdue_receivable)} overdue · {data.sales.receivables.outstanding_invoices} invoices
                        </p>
                      </div>
                      <p className="text-sm font-black text-emerald-700">{fmtCr(data.sales.receivables.total_receivable)}</p>
                    </div>

                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${data.payables.overdue_invoices > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
                      <div>
                        <p className="text-xs font-bold text-gray-700">Total Payable</p>
                        <p className={`text-[10px] ${data.payables.overdue_invoices > 0 ? "text-orange-500" : "text-gray-400"}`}>
                          {data.payables.overdue_invoices} overdue · {data.payables.outstanding_invoices} invoices
                        </p>
                      </div>
                      <p className="text-sm font-black text-orange-600">{fmtCr(data.payables.total_payable)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Procurement + HR ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Procurement */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionHeader title="Procurement" icon={ShoppingBag} color="text-amber-500" />
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide">Purchase Orders</p>
                      <p className="text-2xl font-black text-amber-700 mt-0.5">{data.procurement.purchase_orders.total}</p>
                      <p className="text-[10px] text-amber-400">{data.procurement.purchase_orders.pending} pending</p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3">
                      <p className="text-[10px] text-sky-500 font-semibold uppercase tracking-wide">Material Requests</p>
                      <p className="text-2xl font-black text-sky-700 mt-0.5">{data.procurement.material_requests.total}</p>
                      <p className="text-[10px] text-sky-400">{data.procurement.material_requests.pending} pending</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs text-gray-600">PO Total Value</span>
                      <span className="text-xs font-bold text-gray-800">{fmtCr(data.procurement.purchase_orders.total_value)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs text-gray-600">Pending PO Value</span>
                      <span className="text-xs font-bold text-amber-700">{fmtCr(data.procurement.purchase_orders.pending_value)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-xs text-gray-600">POs This Month</span>
                      <span className="text-xs font-bold text-gray-800">{data.procurement.purchase_orders.this_month}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-gray-600">MRs This Month</span>
                      <span className="text-xs font-bold text-gray-800">{data.procurement.material_requests.this_month}</span>
                    </div>
                  </div>
                </div>

                {/* HR */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionHeader title="Human Resources" icon={Users} color="text-emerald-500" />
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-700">{data.hr.total_employees}</p>
                      <p className="text-[10px] text-emerald-500 font-semibold">Total Staff</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${data.hr.on_leave_today > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                      <p className={`text-2xl font-black ${data.hr.on_leave_today > 0 ? "text-amber-700" : "text-gray-400"}`}>{data.hr.on_leave_today}</p>
                      <p className={`text-[10px] font-semibold ${data.hr.on_leave_today > 0 ? "text-amber-500" : "text-gray-400"}`}>On Leave Today</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${data.hr.pending_leave_approvals > 0 ? "bg-sky-50" : "bg-gray-50"}`}>
                      <p className={`text-2xl font-black ${data.hr.pending_leave_approvals > 0 ? "text-sky-700" : "text-gray-400"}`}>{data.hr.pending_leave_approvals}</p>
                      <p className={`text-[10px] font-semibold ${data.hr.pending_leave_approvals > 0 ? "text-sky-500" : "text-gray-400"}`}>Pending Leaves</p>
                    </div>
                  </div>

                  {/* Department breakdown */}
                  {data.hr.department_breakdown.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Department Headcount</p>
                      <div className="space-y-2">
                        {data.hr.department_breakdown.slice(0, 7).map((d: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-32 truncate flex-1">{d.dept}</span>
                            <div className="w-24">
                              <ProgressBar value={d.count} max={data.hr.total_employees} color="bg-emerald-400" />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700 w-6 text-right">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Leave Summary ── */}
              {data.hr.recent_leaves.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <SectionHeader title="Recent Leave Applications" icon={Calendar} color="text-sky-500" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Leave Type</th>
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">From</th>
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">To</th>
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Days</th>
                          <th className="pb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hr.recent_leaves.map((l: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 text-xs font-semibold text-gray-700">{l.employee}</td>
                            <td className="py-2 text-xs text-gray-500">{l.type}</td>
                            <td className="py-2 text-xs text-gray-500">{fmtDate(l.from)}</td>
                            <td className="py-2 text-xs text-gray-500">{fmtDate(l.to)}</td>
                            <td className="py-2 text-xs font-bold text-gray-700">{l.days}</td>
                            <td className="py-2">
                              <Badge
                                label={l.status}
                                variant={l.status === "Approved" ? "green" : l.status === "Open" ? "amber" : l.status === "Rejected" ? "red" : "gray"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="text-center text-[10px] text-gray-400 pb-2">
                Report generated at {data.generated_at ? new Date(data.generated_at).toLocaleString("en-IN") : "—"} · Data sourced from ERPNext (erp.wttint.com)
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
