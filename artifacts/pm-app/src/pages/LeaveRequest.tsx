import { Layout } from "@/components/Layout";
import {
  Calendar, RefreshCw, Loader2, Search, ChevronDown, ExternalLink, Plus,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface LeaveApp {
  name: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
  description: string | null;
}

interface Employee {
  name: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  status: string;
  user_id: string | null;
}

interface UserScope {
  scope: "all" | "department" | "self";
  employee: Employee | null;
  departments: string[];
  roles: string[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "approved")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Approved</span>;
  if (s === "open")      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-white">Open</span>;
  if (s === "rejected")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-400 text-white">Rejected</span>;
  if (s === "cancelled") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400 text-white">Cancelled</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">{status}</span>;
}

export default function LeaveRequest() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState<LeaveApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [userScope, setUserScope] = useState<UserScope>({ scope: "all", employee: null, departments: [], roles: [] });
  const [scopeLoading, setScopeLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    setScopeLoading(true);
    fetch(`${BASE}/api/hrms/user-scope?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then((sc: UserScope | null) => {
        const resolved = sc ?? { scope: "all" as const, employee: null, departments: [], roles: [] };
        setUserScope(resolved);
        setScopeLoading(false);
      })
      .catch(() => setScopeLoading(false));
  }, [user?.email]);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (userScope.scope === "self" && userScope.employee) {
        params.set("employee", userScope.employee.name);
      }
      const r = await fetch(`${BASE}/api/hrms/leave-applications?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setLeaves(await r.json());
    } catch (e) {
      toast({ title: "Failed to load leave applications", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, statusFilter, userScope]);

  useEffect(() => {
    if (!scopeLoading) loadLeaves();
  }, [scopeLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = leaves.filter(l =>
    (!search       || l.employee_name.toLowerCase().includes(search.toLowerCase()) || l.leave_type.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || l.status.toLowerCase() === statusFilter.toLowerCase())
  );

  const approvedCount = leaves.filter(l => l.status === "Approved").length;
  const openCount     = leaves.filter(l => l.status === "Open").length;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Leave Requests</h1>
            <span className="text-xs text-gray-400 ml-1">Leave Application — ERPNext</span>
          </div>
          <a href={`${ERP_URL}/app/leave-request`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Request
          </button>
          <button onClick={loadLeaves} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total",    value: leaves.length,  color: "bg-blue-500" },
            { label: "Open",     value: openCount,      color: "bg-amber-400" },
            { label: "Approved", value: approvedCount,  color: "bg-emerald-500" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, leave type…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-sm text-gray-400">No leave applications found</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Leave Type</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">From</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">To</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Days</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Reason</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <tr key={l.name}
                      className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{l.employee_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{l.employee}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-indigo-600">{l.leave_type}</span>
                      </td>
                      <td className="px-3 py-2.5"><span className="text-xs text-gray-600">{fmtDate(l.from_date)}</span></td>
                      <td className="px-3 py-2.5"><span className="text-xs text-gray-600">{fmtDate(l.to_date)}</span></td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600">{l.total_leave_days}d</span>
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={l.status} /></td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px] block">{l.description || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <a href={`${ERP_URL}/app/leave-application/${l.name}`} target="_blank" rel="noopener noreferrer"
                          className="text-gray-300 hover:text-indigo-500 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* New Leave Request Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-gray-800">New Leave Request</span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Employee */}
                {userScope.scope !== "self" ? (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Employee *</label>
                    <div className="relative">
                      <select value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                        className="w-full appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300">
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.name} value={e.name}>{e.employee_name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-widest">Employee</p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">{userScope.employee?.employee_name}</p>
                  </div>
                )}

                {/* Leave Type */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Leave Type *</label>
                  <div className="relative">
                    <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                      className="w-full appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300">
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">From Date *</label>
                    <input type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">To Date *</label>
                    <input type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                </div>

                {/* Half Day */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.half_day} onChange={e => setForm(f => ({ ...f, half_day: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-300" />
                  <span className="text-xs text-gray-600">Half Day</span>
                </label>

                {/* Reason */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Reason</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Reason for leave…"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
