import { Layout } from "@/components/Layout";
import {
  Receipt, RefreshCw, Loader2, Search, ChevronDown, ExternalLink, Plus, X, Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface ExpenseClaim {
  name: string;
  employee: string;
  employee_name: string;
  posting_date: string;
  company: string | null;
  approval_status: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  remark: string | null;
  modified: string;
}

interface Employee {
  name: string;
  employee_name: string;
  status: string;
  company: string | null;
}

interface UserScope {
  scope: "all" | "department" | "self";
  employee: Employee | null;
  departments: string[];
  employee_ids: string[];
  roles: string[];
}

interface ExpenseItem {
  expense_date: string;
  expense_type: string;
  description: string;
  amount: number;
}

interface ClaimType {
  name: string;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "approved")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Approved</span>;
  if (s === "draft")     return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-300 text-gray-700">Draft</span>;
  if (s === "rejected")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-400 text-white">Rejected</span>;
  if (s === "cancelled") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400 text-white">Cancelled</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">{status}</span>;
}

function emptyItem(): ExpenseItem {
  return { expense_date: todayStr(), expense_type: "", description: "", amount: 0 };
}

function ClaimModal({ employee, onClose, onSaved }: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [posting_date, setPostingDate] = useState(todayStr());
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/hrms/claim-types`)
      .then(r => r.json())
      .then(data => { setClaimTypes(Array.isArray(data) ? data : []); })
      .catch(() => {});
  }, []);

  const setItem = (i: number, k: keyof ExpenseItem, v: any) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!employee) { setError("No employee linked to your account"); return; }
    for (const it of items) {
      if (!it.expense_type) { setError("Please select expense type for all items"); return; }
      if (!it.amount || Number(it.amount) <= 0) { setError("Please enter a valid amount for all items"); return; }
    }
    setSaving(true); setError("");
    try {
      const body = {
        employee: employee.name,
        posting_date,
        company: employee.company || undefined,
        remark: remark || undefined,
        expenses: items.map(it => ({
          expense_date: it.expense_date,
          expense_type: it.expense_type,
          description: it.description || undefined,
          amount: Number(it.amount),
        })),
      };
      const r = await fetch(`${BASE}/api/hrms/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || err.message || "Failed to submit");
      }
      toast({ title: "Claim submitted successfully" });
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300";
  const label = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" style={{ animation: "modalIn 0.2s ease" }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">New Expense Claim</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {employee && (
            <div>
              <span className={label}>Employee</span>
              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 font-medium">
                {employee.employee_name} <span className="text-gray-400 text-xs font-mono">({employee.name})</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={label}>Posting Date *</span>
              <input type="date" value={posting_date} onChange={e => setPostingDate(e.target.value)} className={inp} />
            </div>
            <div>
              <span className={label}>Remark</span>
              <input value={remark} onChange={e => setRemark(e.target.value)}
                placeholder="Optional remark…" className={inp} />
            </div>
          </div>

          {/* Expense items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={label} style={{ marginBottom: 0 }}>Expense Items *</span>
              <button onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Item {i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block mb-1">Date</span>
                      <input type="date" value={it.expense_date}
                        onChange={e => setItem(i, "expense_date", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block mb-1">Type *</span>
                      <div className="relative">
                        <select value={it.expense_type} onChange={e => setItem(i, "expense_type", e.target.value)}
                          className="w-full appearance-none px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 pr-6">
                          <option value="">Select type…</option>
                          {claimTypes.map(ct => <option key={ct.name} value={ct.name}>{ct.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block mb-1">Description</span>
                      <input value={it.description} onChange={e => setItem(i, "description", e.target.value)}
                        placeholder="Optional…"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block mb-1">Amount (₹) *</span>
                      <input type="number" min="0" step="0.01" value={it.amount || ""}
                        onChange={e => setItem(i, "amount", e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
              <span className="text-xs font-semibold text-violet-700">Total Claim Amount</span>
              <span className="text-sm font-bold text-violet-700">{fmtCurrency(total)}</span>
            </div>
          )}

          {error && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimRequest() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
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
        setUserScope(sc ?? { scope: "all" as const, employee: null, departments: [], employee_ids: [], roles: [] });
        setScopeLoading(false);
      })
      .catch(() => setScopeLoading(false));
  }, [user?.email]);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("approval_status", statusFilter);
      if (userScope.scope === "self" && userScope.employee) {
        params.set("employee", userScope.employee.name);
      }
      const r = await fetch(`${BASE}/api/hrms/claims?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setClaims(await r.json());
    } catch (e) {
      toast({ title: "Failed to load claims", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, statusFilter, userScope]);

  useEffect(() => {
    if (!scopeLoading) loadClaims();
  }, [scopeLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopedClaims = userScope.scope === "all"
    ? claims
    : userScope.scope === "department" && userScope.employee_ids.length > 0
    ? claims.filter(c => userScope.employee_ids.includes(c.employee))
    : claims;

  const filtered = scopedClaims.filter(c =>
    (!search       || c.employee_name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || c.approval_status.toLowerCase() === statusFilter.toLowerCase())
  );

  const totalClaimed    = scopedClaims.reduce((s, c) => s + (c.total_claimed_amount || 0), 0);
  const totalSanctioned = scopedClaims.reduce((s, c) => s + (c.total_sanctioned_amount || 0), 0);

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Receipt className="w-4 h-4 text-violet-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Claim Requests</h1>
            <span className="text-xs text-gray-400 ml-1">Expense Claim — ERPNext</span>
          </div>
          <a href={`${ERP_URL}/app/expense-claim`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={() => setShowModal(true)} disabled={scopeLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Claim
          </button>
          <button onClick={loadClaims} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total Claims",     value: scopedClaims.length,    color: "bg-blue-500",   fmt: false },
            { label: "Total Claimed",    value: totalClaimed,           color: "bg-violet-500", fmt: true  },
            { label: "Total Sanctioned", value: totalSanctioned,        color: "bg-emerald-500",fmt: true  },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.fmt ? fmtCurrency(s.value as number) : s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
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
            <div className="text-center py-20 text-sm text-gray-400">No claim requests found</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">ID</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Claimed</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Sanctioned</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Remark</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.name}
                      className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2.5"><span className="text-[10px] font-mono text-gray-500">{c.name}</span></td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{c.employee_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{c.employee}</p>
                      </td>
                      <td className="px-3 py-2.5"><span className="text-xs text-gray-600">{fmtDate(c.posting_date)}</span></td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-semibold text-violet-600">{fmtCurrency(c.total_claimed_amount || 0)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-semibold text-emerald-600">{fmtCurrency(c.total_sanctioned_amount || 0)}</span>
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={c.approval_status} /></td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px] block">{c.remark || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <a href={`${ERP_URL}/app/expense-claim/${c.name}`} target="_blank" rel="noopener noreferrer"
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
        <ClaimModal
          employee={userScope.employee}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadClaims(); }}
        />
      )}
    </Layout>
  );
}
