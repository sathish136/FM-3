import { Layout } from "@/components/Layout";
import {
  Receipt, RefreshCw, Loader2, Search, ChevronDown, ExternalLink, Plus,
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

export default function ClaimRequest() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    : claims; // "self" already filtered at API level

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
          <a href={`${ERP_URL}/app/claim-request`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <a href={`${ERP_URL}/app/claim-request`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Claim
          </a>
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
    </Layout>
  );
}
