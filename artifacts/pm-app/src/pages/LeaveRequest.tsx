import { Layout } from "@/components/Layout";
import {
  Calendar, RefreshCw, Loader2, Search, ChevronDown, ExternalLink, Plus, X,
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
  employee_ids: string[];
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

function LeaveModal({ employee, onClose, onSaved }: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    leave_type: "",
    from_date: todayStr(),
    to_date: todayStr(),
    half_day: false,
    half_day_date: todayStr(),
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/hrms/leave-types`)
      .then(r => r.json())
      .then(data => { setLeaveTypes(Array.isArray(data) ? data : []); })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.leave_type) { setError("Please select a leave type"); return; }
    if (!form.from_date || !form.to_date) { setError("Please select dates"); return; }
    if (!employee) { setError("No employee linked to your account"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        employee: employee.name,
        leave_type: form.leave_type,
        from_date: form.from_date,
        to_date: form.to_date,
        half_day: form.half_day ? 1 : 0,
        half_day_date: form.half_day ? form.half_day_date : undefined,
        description: form.description || undefined,
      };
      const r = await fetch(`${BASE}/api/hrms/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || err.message || "Failed to submit");
      }
      toast({ title: "Leave request submitted successfully" });
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300";
  const label = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: "modalIn 0.2s ease" }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:none}}`}</style>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900">New Leave Request</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {employee && (
            <div>
              <span className={label}>Employee</span>
              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 font-medium">
                {employee.employee_name} <span className="text-gray-400 text-xs font-mono">({employee.name})</span>
              </div>
            </div>
          )}

          <div>
            <span className={label}>Leave Type *</span>
            <div className="relative">
              <select value={form.leave_type} onChange={e => set("leave_type", e.target.value)}
                className={`${inp} appearance-none pr-8`}>
                <option value="">Select leave type…</option>
                {leaveTypes.map(lt => <option key={lt} value={lt}>{lt}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={label}>From Date *</span>
              <input type="date" value={form.from_date} onChange={e => set("from_date", e.target.value)} className={inp} />
            </div>
            <div>
              <span className={label}>To Date *</span>
              <input type="date" value={form.to_date} onChange={e => set("to_date", e.target.value)} className={inp} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.half_day}
                onChange={e => set("half_day", e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500" />
              <span className="text-sm text-gray-700">Half Day</span>
            </label>
            {form.half_day && (
              <input type="date" value={form.half_day_date}
                onChange={e => set("half_day_date", e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
            )}
          </div>

          <div>
            <span className={label}>Reason</span>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Reason for leave…"
              rows={3}
              className={`${inp} resize-none`} />
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequest() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState<LeaveApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [userScope, setUserScope] = useState<UserScope>({ scope: "all", employee: null, departments: [], employee_ids: [], roles: [] });
  const [scopeLoading, setScopeLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    setScopeLoading(true);
    fetch(`${BASE}/api/hrms/user-scope?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then((sc: UserScope | null) => {
        const resolved = sc ?? { scope: "all" as const, employee: null, departments: [], employee_ids: [], roles: [] };
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

  const scopedLeaves = userScope.scope === "all"
    ? leaves
    : userScope.scope === "department" && userScope.employee_ids.length > 0
    ? leaves.filter(l => userScope.employee_ids.includes(l.employee))
    : leaves;

  const filtered = scopedLeaves.filter(l =>
    (!search       || l.employee_name.toLowerCase().includes(search.toLowerCase()) || l.leave_type.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || l.status.toLowerCase() === statusFilter.toLowerCase())
  );

  const approvedCount = scopedLeaves.filter(l => l.status === "Approved").length;
  const openCount     = scopedLeaves.filter(l => l.status === "Open").length;

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
          <a href={`${ERP_URL}/app/leave-application`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={() => setShowModal(true)} disabled={scopeLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
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
            { label: "Total",    value: scopedLeaves.length,  color: "bg-blue-500" },
            { label: "Open",     value: openCount,            color: "bg-amber-400" },
            { label: "Approved", value: approvedCount,        color: "bg-emerald-500" },
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
                        <a href={`${ERP_URL}/app/leave-request/${l.name}`} target="_blank" rel="noopener noreferrer"
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

      </div>

      {showModal && (
        <LeaveModal
          employee={userScope.employee}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadLeaves(); }}
        />
      )}
    </Layout>
  );
}
