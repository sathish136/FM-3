import { Layout } from "@/components/Layout";
import {
  Clock, LogIn, LogOut, RefreshCw, Loader2, Search, ChevronDown, Calendar, ExternalLink, CheckCircle2,
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

function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function AttendanceCheckin() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [logType, setLogType] = useState<"IN" | "OUT">("IN");
  const [checkTime, setCheckTime] = useState(nowLocal().slice(0, 16));

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
        if (resolved.scope === "self" && resolved.employee) {
          setSelectedEmployee(resolved.employee.name);
        }
        setScopeLoading(false);
      })
      .catch(() => setScopeLoading(false));
  }, [user?.email]);

  useEffect(() => {
    if (scopeLoading) return;
    if (userScope.scope !== "self") {
      fetch(`${BASE}/api/hrms/employees`)
        .then(r => r.ok ? r.json() : [])
        .then((data: Employee[]) => setEmployees(data.filter(e => e.status === "Active")))
        .catch(() => {});
    }
  }, [scopeLoading, userScope.scope]);

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

  const handleSubmit = async () => {
    const empId = userScope.scope === "self" && userScope.employee
      ? userScope.employee.name
      : selectedEmployee;
    if (!empId) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }
    const timeStr = checkTime.includes("T")
      ? checkTime.replace("T", " ") + ":00"
      : checkTime.length === 16
      ? checkTime + ":00"
      : checkTime;
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: empId, time: timeStr, log_type: logType }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: `Check-${logType === "IN" ? "in" : "out"} recorded successfully` });
      setCheckTime(nowLocal().slice(0, 16));
      loadCheckins();
    } catch (e) {
      toast({ title: "Failed to record check-in", description: String(e), variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const filtered = checkins.filter(c =>
    (!search     || c.employee_name.toLowerCase().includes(search.toLowerCase()) || c.employee.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || c.log_type === typeFilter)
  );

  const inCount  = checkins.filter(c => c.log_type === "IN").length;
  const outCount = checkins.filter(c => c.log_type === "OUT").length;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Attendance Check-in</h1>
            <span className="text-xs text-gray-400 ml-1">Employee Checkin — ERPNext</span>
          </div>
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

        <div className="flex-1 overflow-hidden flex min-h-0 gap-0">

          {/* Left: Check-in form */}
          <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col p-5 gap-4 overflow-y-auto">
            <div>
              <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Record Check-in / Check-out
              </p>

              {/* Employee selector (admin/dept manager) */}
              {userScope.scope !== "self" && (
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Employee</label>
                  {scopeLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Loading…</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                        className="w-full appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                        <option value="">Select Employee</option>
                        {employees.map(e => (
                          <option key={e.name} value={e.name}>{e.employee_name} ({e.name})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* Self employee display */}
              {userScope.scope === "self" && userScope.employee && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest">Employee</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{userScope.employee.employee_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{userScope.employee.name}</p>
                </div>
              )}

              {/* Log Type */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Type</label>
                <div className="flex gap-1">
                  {(["IN", "OUT"] as const).map(t => (
                    <button key={t} onClick={() => setLogType(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        logType === t
                          ? t === "IN"
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}>
                      {t === "IN" ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                      Check {t === "IN" ? "In" : "Out"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="mb-4">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={checkTime}
                  onChange={e => setCheckTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  logType === "IN"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-rose-500 hover:bg-rose-600 text-white"
                } disabled:opacity-50`}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : logType === "IN" ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                {submitting ? "Recording…" : `Record Check-${logType === "IN" ? "In" : "Out"}`}
              </button>
            </div>
          </div>

          {/* Right: Checkin list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

            <div className="flex-1 overflow-y-auto px-6 pb-6">
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
        </div>
      </div>
    </Layout>
  );
}
