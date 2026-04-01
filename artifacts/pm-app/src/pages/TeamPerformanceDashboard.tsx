import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, RefreshCw, Building2,
  Activity, ChevronDown, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type EmpData = {
  employee_name: string;
  employee_email: string;
  department: string;
  today_hours: number;
  today_idle: number;
  today_tasks: number;
  today_task_names: string;
  week_hours: number;
  week_idle: number;
  working_days: number;
  unique_tasks: number;
  current_task: string;
  current_project: string;
  current_priority: string;
  alloc_status: string;
  utilization: number;
  live_status: string;
};

type Summary = {
  total_employees: number;
  running: number;
  idle: number;
  active: number;
  avg_utilization: number;
  total_logged_hrs: number;
  total_idle_hrs: number;
};

type DashboardData = {
  employees: EmpData[];
  departments: string[];
  summary: Summary;
};

const PERF_LABEL = (util: number) => {
  if (util >= 90) return { label: "Excellent", color: "text-green-600" };
  if (util >= 75) return { label: "Good", color: "text-blue-600" };
  if (util >= 50) return { label: "Average", color: "text-amber-600" };
  return { label: "Below Avg", color: "text-red-500" };
};

const STATUS_STYLE: Record<string, string> = {
  Running: "bg-green-100 text-green-700 border-green-200",
  Idle: "bg-amber-50 text-amber-600 border-amber-200",
  Active: "bg-blue-100 text-blue-700 border-blue-200",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

function pad2(n: number) { return String(Math.floor(n)).padStart(2, "0"); }

function formatHHMMSS(hours: number) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function UtilBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-green-500" : value >= 75 ? "bg-blue-500" : value >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-xs font-bold min-w-[35px] text-right",
        value >= 90 ? "text-green-600" : value >= 75 ? "text-blue-600" : value >= 50 ? "text-amber-600" : "text-red-500"
      )}>{value}%</span>
    </div>
  );
}

function EmployeeCard({ emp }: { emp: EmpData }) {
  const [elapsed, setElapsed] = useState(emp.today_hours * 3600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(emp.today_hours * 3600);
    if (emp.alloc_status === "in-progress") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [emp.today_hours, emp.alloc_status]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = Math.floor(elapsed % 60);
  const timerStr = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

  const isRunning = emp.alloc_status === "in-progress";
  const statusLabel = isRunning ? "Running" : emp.today_hours > 0 ? "Active" : "Idle";

  return (
    <div className={cn(
      "bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow",
      isRunning ? "border-green-200" : emp.today_hours > 0 ? "border-blue-100" : "border-gray-100"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{emp.employee_name}</p>
          <p className="text-xs text-gray-400 truncate">{emp.employee_email || emp.department || "—"}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", STATUS_STYLE[statusLabel] || STATUS_STYLE.Idle)}>
          {statusLabel}
        </span>
      </div>

      <div className={cn(
        "text-3xl font-mono font-bold text-center tracking-widest py-1",
        isRunning ? "text-green-600" : "text-gray-700"
      )}>
        {timerStr}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Logged Hrs", value: emp.today_hours.toFixed(2), sub: null },
          { label: "Tasks", value: emp.unique_tasks || emp.today_tasks || 0, sub: null },
          { label: "Utilization", value: `${emp.utilization}%`, sub: null },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5">
            <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            <p className={cn("text-sm font-bold",
              label === "Utilization"
                ? emp.utilization >= 75 ? "text-green-600" : emp.utilization >= 50 ? "text-blue-600" : "text-red-500"
                : "text-gray-800"
            )}>{value}</p>
          </div>
        ))}
      </div>

      <div className={cn(
        "w-full h-1 rounded-full",
        emp.utilization >= 75 ? "bg-gradient-to-r from-green-400 to-green-500" :
        emp.utilization >= 50 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
        "bg-gradient-to-r from-red-300 to-red-400"
      )} />

      {(emp.current_task || emp.today_task_names) && (
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 font-medium mb-0.5">Current Task</p>
          <div className="flex items-start gap-1.5">
            {emp.current_priority && (
              <span className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", PRIORITY_DOT[emp.current_priority] || "bg-gray-400")} />
            )}
            <p className="text-xs font-semibold text-gray-700 line-clamp-2">
              {emp.current_task || emp.today_task_names}
            </p>
          </div>
          {emp.current_project && (
            <p className="text-[10px] text-gray-400 mt-0.5">{emp.current_project} · {emp.department}</p>
          )}
        </div>
      )}

      <button className="text-xs text-blue-600 hover:underline text-right font-medium">
        View Timesheet →
      </button>
    </div>
  );
}

function LiveStatusView({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const statCards = [
    { label: "Total", value: data.summary.total_employees, color: "text-blue-600", bar: "bg-blue-500" },
    { label: "Running", value: data.summary.running, color: "text-green-600", bar: "bg-green-500" },
    { label: "Active", value: data.summary.active, color: "text-amber-500", bar: "bg-amber-400" },
    { label: "Idle", value: data.summary.idle, color: "text-red-500", bar: "bg-red-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <div className={cn("w-full h-1 rounded-full mb-3", s.bar)} />
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Today's Employee Activity</h3>
        <span className="text-xs text-gray-400">
          Last updated: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {data.employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No employee activity data found</p>
          <p className="text-xs text-gray-400 mt-1">Activity data appears once employees log timesheets or are assigned tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.employees.map((emp) => (
            <EmployeeCard key={emp.employee_name} emp={emp} />
          ))}
        </div>
      )}
    </div>
  );
}

function PerformanceReportView({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const chartData = data.employees.map((e) => ({
    name: e.employee_name.split(" ")[0] + (e.employee_name.split(" ")[1] ? " " + e.employee_name.split(" ")[1][0] + "." : ""),
    "Logged Hours": e.week_hours,
    "Idle Hours": e.week_idle,
  }));

  const summaryStats = [
    { label: "Total Employees", value: data.summary.total_employees, color: "text-gray-800" },
    { label: "Avg Utilization", value: `${data.summary.avg_utilization}%`, color: "text-green-600" },
    { label: "Total Logged Hrs", value: data.summary.total_logged_hrs, color: "text-blue-600" },
    { label: "Total Idle Hrs", value: data.summary.total_idle_hrs, color: "text-red-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Logged vs Idle Hours (This Week)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                labelStyle={{ fontWeight: 600, color: "#111827" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Logged Hours" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Idle Hours" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 w-6">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[160px]">Employee</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Working Days</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Total Logged Hrs</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Billable Hrs</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Total Idle Hrs</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Overtime Hrs</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Avg Utilization %</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Avg Hrs/Day</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No performance data found for the selected period
                  </td>
                </tr>
              ) : (
                data.employees.map((emp, idx) => {
                  const perf = PERF_LABEL(emp.utilization);
                  const avgHrsDay = emp.working_days > 0 ? (emp.week_hours / emp.working_days).toFixed(2) : "0.00";
                  const overtime = Math.max(emp.week_hours - emp.working_days * 8, 0);
                  return (
                    <tr key={emp.employee_name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{emp.employee_name}</div>
                        <div className="text-gray-400 text-[10px]">{emp.department || emp.employee_email}</div>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-700 font-medium">{emp.working_days}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-medium">{emp.week_hours.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-medium">{emp.week_hours.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-500">{emp.week_idle.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center text-gray-700 font-medium">{overtime.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <UtilBar value={emp.utilization} />
                      </td>
                      <td className="px-3 py-3 text-center text-gray-700 font-medium">{avgHrsDay}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn("font-semibold", perf.color)}>{perf.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TeamPerformanceDashboard() {
  const [view, setView] = useState<"live" | "report">("live");
  const [department, setDepartment] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [deptOpen, setDeptOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department) params.set("department", department);
      const r = await fetch(`${API_BASE}/performance/team-dashboard?${params}`);
      if (r.ok) {
        setData(await r.json());
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view !== "live") return;
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [view, load]);

  const departments = data?.departments || [];

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employee Team Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor live activity, task allocation & team performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setDeptOpen((o) => !o)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium shadow-sm"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                {department || "All Departments"}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {deptOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                  <button
                    onClick={() => { setDepartment(""); setDeptOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors", !department && "font-semibold text-blue-600")}
                  >
                    All Departments
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDepartment(d); setDeptOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors", department === d && "font-semibold text-blue-600")}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh Now
            </button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm mb-6 w-fit">
          {[
            { key: "live", label: "Live Status", icon: Activity },
            { key: "report", label: "Performance Report", icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key as "live" | "report")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                view === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {view === "live" ? (
          <LiveStatusView data={data} loading={loading} />
        ) : (
          <PerformanceReportView data={data} loading={loading} />
        )}
      </div>

      {deptOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setDeptOpen(false)} />
      )}
    </div>
    </Layout>
  );
}
