import { Layout } from "@/components/Layout";
import {
  Users, Search, RefreshCw, Loader2, Calendar,
  UserCheck, Briefcase, Phone,
  Building2, ChevronDown, ExternalLink, Mail,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  name: string; employee_name: string; department: string | null;
  designation: string | null; status: string; date_of_joining: string | null;
  user_id: string | null; image: string | null; gender: string | null;
  cell_number: string | null; company: string | null;
}
interface LeaveApp {
  name: string; employee: string; employee_name: string;
  leave_type: string; from_date: string; to_date: string;
  total_leave_days: number; status: string; description: string | null;
}
interface Attendance {
  name: string; employee: string; employee_name: string;
  attendance_date: string; status: string; department: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS = [
  "bg-violet-500","bg-indigo-500","bg-blue-500","bg-cyan-500",
  "bg-teal-500","bg-emerald-500","bg-amber-500","bg-orange-500","bg-rose-500","bg-pink-500",
];
function avatarColor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtShortDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
  catch { return d; }
}

function EmpAvatar({ emp, size = "md" }: { emp: Employee; size?: "sm" | "md" | "lg" }) {
  const [err, setErr] = useState(false);
  const dim = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-sm";
  const src = emp.image
    ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(emp.image)}`
    : null;
  if (src && !err) {
    return (
      <img src={src} alt={emp.employee_name} onError={() => setErr(true)}
        className={`${dim} rounded-full object-cover shrink-0`} />
    );
  }
  return (
    <div className={`${dim} ${avatarColor(emp.name)} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials(emp.employee_name)}
    </div>
  );
}

function EmpInitAvatar({ name, id, size = "sm" }: { name: string; id: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-[10px]";
  return (
    <div className={`${dim} ${avatarColor(id)} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials(name)}
    </div>
  );
}

function StatusPill({ status, type }: { status: string; type: "employee" | "leave" | "attendance" }) {
  const s = (status || "").toLowerCase();
  if (type === "employee") {
    if (s === "active") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white"><span className="w-1.5 h-1.5 rounded-full bg-white/60" />Active</span>;
    if (s === "left")   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400 text-white"><span className="w-1.5 h-1.5 rounded-full bg-white/60" />Left</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">{status}</span>;
  }
  if (type === "leave") {
    if (s === "approved")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Approved</span>;
    if (s === "open")      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-white">Open</span>;
    if (s === "rejected")  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-400 text-white">Rejected</span>;
    if (s === "cancelled") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400 text-white">Cancelled</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">{status}</span>;
  }
  if (type === "attendance") {
    if (s === "present")        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Present</span>;
    if (s === "absent")         return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-400 text-white">Absent</span>;
    if (s === "on leave")       return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-white">On Leave</span>;
    if (s === "half day")       return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-400 text-white">Half Day</span>;
    if (s === "work from home") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500 text-white">WFH</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">{status}</span>;
  }
  return null;
}

type Tab = "employees" | "leave" | "attendance";

// ── Main page ─────────────────────────────────────────────────────────────────
interface UserScope {
  scope: "all" | "department" | "self";
  employee: Employee | null;
  departments: string[];
  roles: string[];
}

export default function HRMS() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [tab, setTab]               = useState<Tab>("employees");
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [leaves, setLeaves]         = useState<LeaveApp[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading]       = useState(false);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [viewEmp, setViewEmp]       = useState<Employee | null>(null);
  const [userScope, setUserScope]   = useState<UserScope>({ scope: "all", employee: null, departments: [], roles: [] });

  // On mount: resolve user scope from the API, then load initial data
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

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/employees`);
      if (!r.ok) throw new Error(await r.text());
      setEmployees(await r.json());
    } catch (e) {
      toast({ title: "Failed to load employees", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/leave-applications`);
      if (!r.ok) throw new Error(await r.text());
      setLeaves(await r.json());
    } catch (e) {
      toast({ title: "Failed to load leave applications", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/attendance`);
      if (!r.ok) throw new Error(await r.text());
      setAttendance(await r.json());
    } catch (e) {
      toast({ title: "Failed to load attendance", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  // Load data when scope is resolved and tab changes
  useEffect(() => {
    if (scopeLoading) return;
    setSearch(""); setDeptFilter("");
    setStatusFilter(tab === "employees" ? "Active" : "");
    setViewEmp(null);
    if (tab === "employees") loadEmployees();
    else if (tab === "leave") loadLeaves();
    else loadAttendance();
  }, [tab, scopeLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply permission scope to narrow the displayed data
  const scopedEmps = useMemo(() => {
    if (userScope.scope === "all") return employees;
    if (userScope.scope === "department") {
      const deptSet = new Set(userScope.departments);
      return employees.filter(e => e.department && deptSet.has(e.department));
    }
    return userScope.employee ? [userScope.employee] : [];
  }, [employees, userScope]);

  const scopedEmpIds = useMemo(() => new Set(scopedEmps.map(e => e.name)), [scopedEmps]);

  const scopedLeaves = useMemo(() =>
    userScope.scope === "all" ? leaves : leaves.filter(l => scopedEmpIds.has(l.employee)),
    [leaves, userScope.scope, scopedEmpIds]);

  const scopedAtt = useMemo(() =>
    userScope.scope === "all" ? attendance : attendance.filter(a => scopedEmpIds.has(a.employee)),
    [attendance, userScope.scope, scopedEmpIds]);

  const depts = useMemo(() =>
    [...new Set(scopedEmps.map(e => e.department).filter(Boolean) as string[])].sort(),
    [scopedEmps]);

  const activeCount  = scopedEmps.filter(e => e.status === "Active").length;
  const onLeaveCount = scopedLeaves.filter(l => l.status === "Approved").length;

  const filteredEmps = scopedEmps.filter(e =>
    (!search       || e.employee_name.toLowerCase().includes(search.toLowerCase()) || e.name.toLowerCase().includes(search.toLowerCase()) || (e.designation || "").toLowerCase().includes(search.toLowerCase())) &&
    (!deptFilter   || e.department === deptFilter) &&
    (!statusFilter || e.status === statusFilter)
  );

  const filteredLeaves = scopedLeaves.filter(l =>
    (!search       || l.employee_name.toLowerCase().includes(search.toLowerCase()) || l.leave_type.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || l.status === statusFilter)
  );

  const filteredAtt = scopedAtt.filter(a =>
    (!search       || a.employee_name.toLowerCase().includes(search.toLowerCase()) || a.employee.toLowerCase().includes(search.toLowerCase())) &&
    (!deptFilter   || a.department === deptFilter) &&
    (!statusFilter || a.status.toLowerCase() === statusFilter.toLowerCase())
  );

  const TABS: { key: Tab; label: string; count: number; icon: React.ElementType }[] = [
    { key: "employees",  label: "Employees",          count: scopedEmps.length,   icon: Users },
    { key: "leave",      label: "Leave Applications",  count: scopedLeaves.length, icon: Calendar },
    { key: "attendance", label: "Attendance",           count: scopedAtt.length,   icon: UserCheck },
  ];

  const handleRefresh = () => {
    if (tab === "employees") loadEmployees();
    else if (tab === "leave") loadLeaves();
    else loadAttendance();
  };

  // Scope badge info
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
            <Users className="w-4 h-4 text-emerald-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">HRMS</h1>
            <span className="text-xs text-gray-400 ml-1">Human Resource Management — ERPNext</span>
          </div>
          {!scopeLoading && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${scopeBadge.color}`}>
              <span className="w-2 h-2 rounded-full bg-current opacity-60 shrink-0" />
              {scopeBadge.label}
            </div>
          )}
          <a href={`${ERP_URL}/app/employee`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={handleRefresh} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stat pills */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total Employees",    value: scopedEmps.length,  color: "bg-blue-500" },
            { label: "Active",             value: activeCount,        color: "bg-emerald-500" },
            { label: "Approved Leaves",    value: onLeaveCount,       color: "bg-amber-400" },
            { label: "Attendance Records", value: attendance.length,  color: "bg-violet-500" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs + filters */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search — only show when there is more than one record to search */}
          {(tab !== "employees" || filteredEmps.length > 1) && (
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab === "employees" ? "Search name, ID, designation…" : tab === "leave" ? "Search employee, leave type…" : "Search employee…"}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {/* Dept filter */}
          {(tab === "employees" || tab === "attendance") && depts.length > 1 && (
            <div className="relative">
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Status filter */}
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">All Status</option>
              {tab === "employees"  && <><option value="Active">Active</option><option value="Left">Left</option></>}
              {tab === "leave"      && <><option value="Open">Open</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Cancelled">Cancelled</option></>}
              {tab === "attendance" && <><option value="Present">Present</option><option value="Absent">Absent</option><option value="On Leave">On Leave</option><option value="Half Day">Half Day</option><option value="Work From Home">Work From Home</option></>}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ── Employees (List View) ── */}
          {tab === "employees" && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className={`flex-1 overflow-y-auto px-6 pb-6 pt-2 ${viewEmp ? "hidden md:block" : ""}`}>
                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
                ) : filteredEmps.length === 0 ? (
                  <div className="text-center py-20 text-sm text-gray-400">No employees found</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Designation</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Department</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Company</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Joined</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                          <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmps.map((emp, i) => (
                          <tr
                            key={emp.name}
                            onClick={() => setViewEmp(viewEmp?.name === emp.name ? null : emp)}
                            className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                              viewEmp?.name === emp.name
                                ? "bg-indigo-50 border-l-2 border-l-indigo-400"
                                : i % 2 === 1 ? "bg-gray-50/20" : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <EmpAvatar emp={emp} size="sm" />
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 leading-tight">{emp.employee_name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono leading-tight">{emp.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs font-medium text-indigo-600">{emp.designation || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                {emp.department && <Building2 className="w-3 h-3 text-gray-300 shrink-0" />}
                                <span className="text-xs text-gray-600">{emp.department || "—"}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-gray-500">{emp.company || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-gray-500">{fmtDate(emp.date_of_joining)}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusPill status={emp.status} type="employee" />
                            </td>
                            <td className="px-3 py-2.5">
                              <a href={`${ERP_URL}/app/employee/${emp.name}`} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-gray-300 hover:text-indigo-500 transition-colors" title="Open in ERPNext">
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

              {/* Detail side panel */}
              {viewEmp && (
                <div className="w-72 shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-700">Employee Details</span>
                    <button onClick={() => setViewEmp(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                  </div>
                  <div className="px-5 py-5 flex flex-col items-center text-center border-b border-gray-50">
                    <EmpAvatar emp={viewEmp} size="lg" />
                    <p className="mt-3 text-sm font-bold text-gray-900">{viewEmp.employee_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{viewEmp.name}</p>
                    {viewEmp.designation && <p className="text-xs text-indigo-600 font-semibold mt-1">{viewEmp.designation}</p>}
                    <div className="mt-2"><StatusPill status={viewEmp.status} type="employee" /></div>
                  </div>
                  <div className="px-4 py-4 space-y-3.5">
                    {[
                      { icon: Building2, label: "Department",      value: viewEmp.department },
                      { icon: Briefcase, label: "Company",         value: viewEmp.company },
                      { icon: Calendar,  label: "Date of Joining", value: fmtDate(viewEmp.date_of_joining) },
                      { icon: Phone,     label: "Phone",           value: viewEmp.cell_number },
                      { icon: Users,     label: "Gender",          value: viewEmp.gender },
                    ].map(row => row.value && row.value !== "—" && (
                      <div key={row.label} className="flex items-start gap-2.5">
                        <row.icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{row.label}</p>
                          <p className="text-xs text-gray-700 font-medium">{row.value}</p>
                        </div>
                      </div>
                    ))}
                    {viewEmp.user_id && (
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">System User</p>
                          <p className="text-xs text-gray-700 font-medium truncate">{viewEmp.user_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-4 mt-auto">
                    <a href={`${ERP_URL}/app/employee/${viewEmp.name}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100">
                      <ExternalLink className="w-3.5 h-3.5" /> Open in ERPNext
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Leave Applications ── */}
          {tab === "leave" && (
            <div className="flex-1 overflow-auto px-6 pb-6 pt-2">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : filteredLeaves.length === 0 ? (
                <div className="text-center py-20 text-sm text-gray-400">No leave applications found</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Leave Type</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">From</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">To</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Days</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves.map((l, i) => (
                        <tr key={l.name} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <EmpInitAvatar name={l.employee_name} id={l.employee} />
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{l.employee_name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{l.employee}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><span className="text-xs font-medium text-gray-700">{l.leave_type}</span></td>
                          <td className="px-3 py-3"><span className="text-xs text-gray-600">{fmtShortDate(l.from_date)}</span></td>
                          <td className="px-3 py-3"><span className="text-xs text-gray-600">{fmtShortDate(l.to_date)}</span></td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">{l.total_leave_days}</span>
                          </td>
                          <td className="px-3 py-3"><StatusPill status={l.status} type="leave" /></td>
                          <td className="px-3 py-3">
                            <a href={`${ERP_URL}/app/leave-request/${l.name}`} target="_blank" rel="noopener noreferrer"
                              className="text-gray-300 hover:text-indigo-500 transition-colors" title="Open in ERPNext">
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
          )}

          {/* ── Attendance ── */}
          {tab === "attendance" && (
            <div className="flex-1 overflow-auto px-6 pb-6 pt-2">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : filteredAtt.length === 0 ? (
                <div className="text-center py-20 text-sm text-gray-400">No attendance records found</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Department</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAtt.map((a, i) => (
                        <tr key={a.name} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <EmpInitAvatar name={a.employee_name} id={a.employee} />
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{a.employee_name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{a.employee}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><span className="text-xs text-gray-600">{fmtDate(a.attendance_date)}</span></td>
                          <td className="px-3 py-3"><span className="text-xs text-gray-500">{a.department || "—"}</span></td>
                          <td className="px-3 py-3"><StatusPill status={a.status} type="attendance" /></td>
                          <td className="px-3 py-3">
                            <a href={`${ERP_URL}/app/attendance/${a.name}`} target="_blank" rel="noopener noreferrer"
                              className="text-gray-300 hover:text-indigo-500 transition-colors" title="Open in ERPNext">
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
          )}

        </div>
      </div>
    </Layout>
  );
}
