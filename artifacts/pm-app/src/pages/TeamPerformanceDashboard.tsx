import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, RefreshCw, LayoutGrid, List, Clock, TrendingUp,
  Briefcase, ChevronDown, ChevronUp, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type Employee = {
  employee_name: string;
  employee_id: string;
  employee_email: string;
  department: string;
  designation: string;
  erp_status: string;
  image: string | null;
  week_hours: number;
  week_idle: number;
  working_days: number;
  unique_tasks: number;
  today_hours: number;
  today_tasks: string;
  last_active: string | null;
  current_task: string;
  current_project: string;
  current_priority: string;
  alloc_status: string;
  utilization: number;
  avg_hrs_day: number;
};

type Summary = {
  total: number;
  active_today: number;
  with_tasks: number;
  total_week_hrs: number;
  avg_utilization: number;
};

type DashData = {
  employees: Employee[];
  departments: string[];
  summary: Summary;
  week: { from: string; to: string };
};

const AVATAR_COLORS = [
  ["#6366f1","#e0e7ff"], ["#0ea5e9","#e0f2fe"], ["#10b981","#d1fae5"],
  ["#f59e0b","#fef3c7"], ["#ec4899","#fce7f3"], ["#8b5cf6","#ede9fe"],
  ["#14b8a6","#ccfbf1"], ["#f97316","#ffedd5"], ["#06b6d4","#cffafe"],
  ["#84cc16","#ecfccb"],
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function utilColor(u: number) {
  if (u >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "Excellent" };
  if (u >= 60) return { bar: "bg-blue-500", text: "text-blue-600", label: "Good" };
  if (u >= 40) return { bar: "bg-amber-400", text: "text-amber-600", label: "Average" };
  if (u > 0)   return { bar: "bg-red-400",  text: "text-red-500",  label: "Low" };
  return { bar: "bg-gray-200", text: "text-gray-400", label: "No Data" };
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function Avatar({ name, image, size = "md" }: { name: string; image?: string | null; size?: "sm" | "md" | "lg" }) {
  const [bg, fg] = avatarColor(name);
  const sizeClass = size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (image) {
    const src = image.startsWith("http") ? image : `https://erp.wttint.com${image}`;
    return <img src={src} alt={name} className={cn("rounded-full object-cover shrink-0", sizeClass)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0", sizeClass)} style={{ background: bg, color: fg }}>
      {initials(name)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmployeeCard({ emp }: { emp: Employee }) {
  const [bg] = avatarColor(emp.employee_name);
  const uc = utilColor(emp.utilization);
  const isActiveToday = emp.today_hours > 0;
  const hasTask = emp.alloc_status === "in-progress";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: bg }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={emp.employee_name} image={emp.image} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{emp.employee_name}</h3>
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                isActiveToday ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isActiveToday ? "bg-emerald-500" : "bg-gray-300")} />
                {isActiveToday ? "Active" : "Idle"}
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{emp.designation || emp.department || "—"}</p>
            {emp.department && (
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mt-1">
                {emp.department}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Week Hrs", value: emp.week_hours.toFixed(1) },
            { label: "Tasks", value: emp.unique_tasks },
            { label: "Avg/Day", value: `${emp.avg_hrs_day}h` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
              <p className="text-sm font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium">Utilization</span>
            <span className={cn("text-[10px] font-bold", uc.text)}>{emp.utilization}% · {uc.label}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", uc.bar)} style={{ width: `${emp.utilization}%` }} />
          </div>
        </div>

        {(emp.current_task || emp.today_tasks) && (
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400 font-medium mb-1">
              {hasTask ? "Assigned Task" : "Recent Task"}
            </p>
            <div className="flex items-start gap-1.5">
              {hasTask && (
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                  emp.current_priority === "critical" ? "bg-red-500" :
                  emp.current_priority === "high" ? "bg-orange-400" :
                  emp.current_priority === "medium" ? "bg-blue-400" : "bg-gray-300"
                )} />
              )}
              <p className="text-xs text-gray-700 font-medium line-clamp-1">
                {emp.current_task || emp.today_tasks}
              </p>
            </div>
            {emp.current_project && (
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{emp.current_project}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey = "employee_name" | "department" | "week_hours" | "utilization" | "unique_tasks" | "avg_hrs_day" | "today_hours";

function TableView({ employees }: { employees: Employee[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("week_hours");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...employees].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => { if (sortKey === k) setSortAsc(a => !a); else { setSortKey(k); setSortAsc(false); } }}
      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
    >
      {label}
      {sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <Minus className="w-3 h-3 opacity-30" />}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-gray-400 font-semibold w-8">#</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold min-w-[180px]">
                <SortBtn k="employee_name" label="Employee" />
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold min-w-[120px]">
                <SortBtn k="department" label="Department" />
              </th>
              <th className="text-center px-3 py-3 text-gray-400 font-semibold">
                <SortBtn k="today_hours" label="Today" />
              </th>
              <th className="text-center px-3 py-3 text-gray-400 font-semibold">
                <SortBtn k="week_hours" label="Week Hrs" />
              </th>
              <th className="text-center px-3 py-3 text-gray-400 font-semibold">
                <SortBtn k="unique_tasks" label="Tasks" />
              </th>
              <th className="text-center px-3 py-3 text-gray-400 font-semibold">
                <SortBtn k="avg_hrs_day" label="Avg/Day" />
              </th>
              <th className="px-3 py-3 text-gray-400 font-semibold min-w-[140px]">
                <SortBtn k="utilization" label="Utilization" />
              </th>
              <th className="text-left px-3 py-3 text-gray-400 font-semibold min-w-[140px]">Current Task</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                  No employee data for the selected period
                </td>
              </tr>
            ) : sorted.map((emp, i) => {
              const uc = utilColor(emp.utilization);
              return (
                <tr key={emp.employee_name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.employee_name} image={emp.image} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{emp.employee_name}</p>
                        <p className="text-gray-400 truncate">{emp.designation || emp.employee_email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {emp.department
                      ? <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium text-[10px]">{emp.department}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {emp.today_hours > 0 ? (
                      <span className="font-semibold text-emerald-600">{emp.today_hours.toFixed(1)}h</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-700">{emp.week_hours.toFixed(1)}h</td>
                  <td className="px-3 py-3 text-center text-gray-600">{emp.unique_tasks || "—"}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{emp.avg_hrs_day > 0 ? `${emp.avg_hrs_day}h` : "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", uc.bar)} style={{ width: `${emp.utilization}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-bold min-w-[30px] text-right", uc.text)}>
                        {emp.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {emp.current_task ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          emp.alloc_status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
                        )} />
                        <span className="text-gray-600 truncate max-w-[120px]">{emp.current_task}</span>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartView({ employees }: { employees: Employee[] }) {
  const data = employees
    .filter(e => e.week_hours > 0)
    .slice(0, 15)
    .map(e => ({
      name: e.employee_name.split(" ").map((w, i) => i === 0 ? w : w[0] + ".").join(" "),
      hours: e.week_hours,
      fill: avatarColor(e.employee_name)[0],
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Hours Logged This Week</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -15 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12 }}
            cursor={{ fill: "#f9fafb" }}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TeamPerformanceDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dept) p.set("department", dept);
      const r = await fetch(`${API_BASE}/performance/team-dashboard?${p}`);
      if (r.ok) { setData(await r.json()); setLastRefresh(new Date()); }
    } finally { setLoading(false); }
  }, [dept]);

  useEffect(() => { load(); }, [load]);

  const departments = data?.departments || [];
  const employees = data?.employees || [];
  const summary = data?.summary;

  const refreshLabel = lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/50 px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Performance</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {data?.week ? `${fmtDate(data.week.from)} – ${fmtDate(data.week.to)}` : "This week"} ·
              Updated {refreshLabel}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium shadow-sm transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Dept filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {["", ...departments].map((d) => (
            <button
              key={d || "__all"}
              onClick={() => setDept(d)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border",
                dept === d
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {d || "All Departments"}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Users}     label="Total Employees"   value={summary.total}           color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard icon={Clock}     label="Active Today"      value={summary.active_today}     color="text-emerald-600" bg="bg-emerald-50" sub={`${employees.length > 0 ? Math.round(summary.active_today / employees.length * 100) : 0}% present`} />
            <StatCard icon={Briefcase} label="Week Hours"        value={`${summary.total_week_hrs}h`} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={TrendingUp} label="Avg Utilization"  value={`${summary.avg_utilization}%`} color="text-amber-600" bg="bg-amber-50" />
          </div>
        )}

        {/* View toggle + chart */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-fit">
            {([["cards", LayoutGrid, "Cards"], ["table", List, "Table"]] as const).map(([k, Icon, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  view === k ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {employees.length > 0 && (
            <p className="text-xs text-gray-400">{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-gray-400">Loading team data…</p>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No employee data found</p>
            <p className="text-xs text-gray-400 mt-1">
              Employees appear here once they are active in ERPNext or have logged timesheets
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ChartView employees={employees} />
            {view === "cards" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map((emp) => <EmployeeCard key={emp.employee_name} emp={emp} />)}
              </div>
            ) : (
              <TableView employees={employees} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
