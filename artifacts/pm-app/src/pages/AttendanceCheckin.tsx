import { Layout } from "@/components/Layout";
import {
  Clock, LogIn, LogOut, RefreshCw, Loader2, Search, ChevronDown, Calendar, ExternalLink,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface Checkin {
  name: string;
  employee: string;
  employee_name: string;
  time: string;
  log_type: string;
  device_id: string | null;
  shift: string | null;
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

function fmtDateTime(dt: string) {
  try {
    return new Date(dt).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceCheckin() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

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

  const loadCheckins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate)   params.set("to_date", toDate);
      if (userScope.scope === "self" && userScope.employee) {
        params.set("employee", userScope.employee.name);
      }
      const r = await fetch(`${BASE}/api/hrms/checkins?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setCheckins(await r.json());
    } catch (e) {
      toast({ title: "Failed to load check-ins", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, fromDate, toDate, userScope]);

  useEffect(() => {
    if (!scopeLoading) loadCheckins();
  }, [scopeLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopedCheckins = userScope.scope === "all"
    ? checkins
    : userScope.scope === "department" && userScope.employee_ids.length > 0
    ? checkins.filter(c => userScope.employee_ids.includes(c.employee))
    : checkins; // "self" already filtered at API level

  const filtered = scopedCheckins.filter(c =>
    (!search     || c.employee_name.toLowerCase().includes(search.toLowerCase()) || c.employee.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || c.log_type === typeFilter)
  );

  const inCount  = scopedCheckins.filter(c => c.log_type === "IN").length;
  const outCount = scopedCheckins.filter(c => c.log_type === "OUT").length;

  const scopeBadge = userScope.scope === "all"
    ? { label: "All Employees", color: "bg-blue-50 border-blue-100 text-blue-700" }
    : userScope.scope === "department"
    ? { label: `Dept: ${userScope.departments.join(", ")}`, color: "bg-emerald-50 border-emerald-100 text-emerald-700" }
    : { label: userScope.employee?.employee_name ?? "Self", color: "bg-violet-50 border-violet-100 text-violet-700" };

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Attendance</h1>
            <span className="text-xs text-gray-400 ml-1">Employee Check-in Records — ERPNext</span>
          </div>
          {!scopeLoading && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${scopeBadge.color}`}>
              <span className="w-2 h-2 rounded-full bg-current opacity-60 shrink-0" />
              {scopeBadge.label}
            </div>
          )}
          <a href={`${ERP_URL}/app/employee-checkin`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={loadCheckins} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total Records", value: checkins.length, color: "bg-blue-500" },
            { label: "Check-In",      value: inCount,         color: "bg-emerald-500" },
            { label: "Check-Out",     value: outCount,        color: "bg-rose-400" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters bar */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 flex-wrap shrink-0">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <span>–</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={loadCheckins} disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              Apply
            </button>
          </div>
          <div className="relative">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">All Types</option>
              <option value="IN">Check In</option>
              <option value="OUT">Check Out</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-sm text-gray-400">No check-in records found</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date & Time</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Shift</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.name}
                      className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                      <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{c.employee_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{c.employee}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-700">{fmtDateTime(c.time)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.log_type === "IN"
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white"><LogIn className="w-3 h-3" />In</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-400 text-white"><LogOut className="w-3 h-3" />Out</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-500">{c.shift || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <a href={`${ERP_URL}/app/employee-checkin/${c.name}`} target="_blank" rel="noopener noreferrer"
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
