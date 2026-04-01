import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  Users, Clock, TrendingUp, Award, Download, Plus, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Timer, Briefcase, Building2, Calendar, Edit3, X, Save, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type TimesheetEntry = {
  id: number;
  employee_name: string;
  employee_email: string;
  department: string;
  task_title: string;
  project: string;
  date: string;
  hours: number;
  description: string;
  status: "pending" | "approved" | "rejected";
};

type Allocation = {
  id: number;
  task_title: string;
  project: string;
  employee_name: string;
  employee_email: string;
  department: string;
  estimated_hours: number;
  deadline: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "assigned" | "in-progress" | "completed";
  notes: string;
};

type DeptStat = {
  department: string;
  employee_count: number;
  total_hours: number;
  avg_hours_per_entry: number;
  total_entries: number;
  approved_entries: number;
};

type EmpStat = {
  employee_name: string;
  employee_email: string;
  department: string;
  total_hours: number;
  total_entries: number;
  unique_tasks: number;
  unique_projects: number;
  avg_hours_per_day: number;
  last_activity: string;
};

const TABS = ["Overview", "Timesheet", "Task Allocation", "Agent Setup"] as const;
type Tab = typeof TABS[number];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  approved: "text-green-600 bg-green-50 border-green-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  assigned: "text-blue-600 bg-blue-50 border-blue-200",
  "in-progress": "text-orange-600 bg-orange-50 border-orange-200",
  completed: "text-green-600 bg-green-50 border-green-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500 bg-gray-50",
  medium: "text-blue-600 bg-blue-50",
  high: "text-orange-600 bg-orange-50",
  critical: "text-red-600 bg-red-50",
};

const DEPT_CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Timesheet Tab ────────────────────────────────────────────────────────────

function getWeekDays(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function TimesheetTab() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [deptFilter, setDeptFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: "", employee_email: "", department: "", task_title: "", project: "", date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
  const [saving, setSaving] = useState(false);

  const weekDays = getWeekDays(weekOffset);
  const from = weekDays[0], to = weekDays[6];

  const load = useCallback(async () => {
    const params = new URLSearchParams({ from, to });
    if (deptFilter) params.set("department", deptFilter);
    const r = await fetch(`${API_BASE}/performance/timesheets?${params}`);
    if (r.ok) setEntries(await r.json());
  }, [from, to, deptFilter]);

  useEffect(() => { load(); }, [load]);

  const employees = [...new Set(entries.map((e) => e.employee_name))].sort();
  const departments = [...new Set(entries.map((e) => e.department).filter(Boolean))].sort();

  const cellKey = (emp: string, date: string) => `${emp}||${date}`;
  const cellMap: Record<string, TimesheetEntry[]> = {};
  for (const e of entries) {
    const k = cellKey(e.employee_name, e.date);
    if (!cellMap[k]) cellMap[k] = [];
    cellMap[k].push(e);
  }

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  };

  const submit = async () => {
    if (!form.employee_name || !form.task_title || !form.hours || !form.date) return;
    setSaving(true);
    await fetch(`${API_BASE}/performance/timesheets`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hours: parseFloat(form.hours) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ employee_name: "", employee_email: "", department: "", task_title: "", project: "", date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
    load();
  };

  const del = async (id: number) => {
    await fetch(`${API_BASE}/performance/timesheets/${id}`, { method: "DELETE" });
    load();
  };

  const approve = async (id: number, status: string) => {
    await fetch(`${API_BASE}/performance/timesheets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const weekLabel = `${formatDate(from)} – ${formatDate(to)} ${new Date(to + "T00:00:00").getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{weekLabel}</span>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600 hover:underline">Today</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Log Hours
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-800">Log Timesheet Entry</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-blue-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              { key: "employee_name", label: "Employee Name *", type: "text" },
              { key: "employee_email", label: "Email", type: "email" },
              { key: "department", label: "Department", type: "text" },
              { key: "task_title", label: "Task Title *", type: "text" },
              { key: "project", label: "Project", type: "text" },
              { key: "date", label: "Date *", type: "date" },
              { key: "hours", label: "Hours Worked *", type: "number" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  step={type === "number" ? "0.5" : undefined}
                  min={type === "number" ? "0" : undefined}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No timesheet entries this week</p>
          <p className="text-xs text-gray-400 mt-1">Click "Log Hours" to add the first entry</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[150px]">Employee</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 min-w-[100px]">Dept</th>
                  {weekDays.map((d, i) => (
                    <th key={d} className={cn("text-center px-2 py-2.5 font-semibold min-w-[70px]",
                      d === new Date().toISOString().slice(0, 10) ? "text-blue-600 bg-blue-50" : "text-gray-600"
                    )}>
                      <div>{dayLabels[i]}</div>
                      <div className="font-normal text-gray-400">{formatDate(d)}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const empEntries = entries.filter((e) => e.employee_name === emp);
                  const dept = empEntries[0]?.department || "";
                  const weekTotal = empEntries.reduce((s, e) => s + Number(e.hours), 0);
                  return (
                    <tr key={emp} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5 sticky left-0 bg-white">
                        <div className="font-semibold text-gray-800">{emp}</div>
                        <div className="text-gray-400">{empEntries[0]?.employee_email || ""}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{dept}</td>
                      {weekDays.map((d) => {
                        const cell = cellMap[cellKey(emp, d)] || [];
                        const hrs = cell.reduce((s, e) => s + Number(e.hours), 0);
                        const isToday = d === new Date().toISOString().slice(0, 10);
                        return (
                          <td key={d} className={cn("text-center px-2 py-2 align-middle", isToday && "bg-blue-50/40")}>
                            {hrs > 0 ? (
                              <div className="group relative inline-block">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold cursor-pointer",
                                  hrs >= 8 ? "bg-green-100 text-green-700" :
                                  hrs >= 4 ? "bg-blue-100 text-blue-700" :
                                  "bg-amber-100 text-amber-700"
                                )}>
                                  {hrs}h
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-lg min-w-[180px]">
                                  {cell.map((e) => (
                                    <div key={e.id} className="flex items-center justify-between gap-2 py-0.5">
                                      <span>{e.task_title} ({e.hours}h)</span>
                                      <div className="flex gap-1">
                                        <button onClick={() => approve(e.id, e.status === "approved" ? "pending" : "approved")} className="text-green-400 hover:text-green-300">✓</button>
                                        <button onClick={() => del(e.id)} className="text-red-400 hover:text-red-300">×</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          weekTotal >= 40 ? "bg-green-100 text-green-700" :
                          weekTotal >= 20 ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {weekTotal}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task Allocation Tab ──────────────────────────────────────────────────────

function AllocationTab() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ task_title: "", project: "", employee_name: "", employee_email: "", department: "", estimated_hours: "", deadline: "", priority: "medium", notes: "" });
  const [filterStatus, setFilterStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const r = await fetch(`${API_BASE}/performance/allocations?${params}`);
    if (r.ok) setAllocations(await r.json());
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.task_title || !form.employee_name) return;
    setSaving(true);
    await fetch(`${API_BASE}/performance/allocations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, estimated_hours: parseFloat(form.estimated_hours) || 0 }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ task_title: "", project: "", employee_name: "", employee_email: "", department: "", estimated_hours: "", deadline: "", priority: "medium", notes: "" });
    load();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`${API_BASE}/performance/allocations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const del = async (id: number) => {
    await fetch(`${API_BASE}/performance/allocations/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Allocate Task
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-800">Allocate Task to Employee</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-blue-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              { key: "task_title", label: "Task Title *", type: "text" },
              { key: "project", label: "Project", type: "text" },
              { key: "employee_name", label: "Employee Name *", type: "text" },
              { key: "employee_email", label: "Employee Email", type: "email" },
              { key: "department", label: "Department", type: "text" },
              { key: "estimated_hours", label: "Estimated Hours", type: "number" },
              { key: "deadline", label: "Deadline", type: "date" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  step={type === "number" ? "0.5" : undefined}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["low", "medium", "high", "critical"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Allocate"}
            </button>
          </div>
        </div>
      )}

      {allocations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No task allocations yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Allocate Task" to assign tasks to employees</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Task", "Employee", "Dept", "Project", "Est. Hours", "Deadline", "Priority", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-gray-800">{a.task_title}</div>
                    {a.notes && <div className="text-gray-400 truncate max-w-[140px]">{a.notes}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-700">{a.employee_name}</div>
                    <div className="text-gray-400">{a.employee_email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{a.department || "—"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{a.project || "—"}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-gray-700">{a.estimated_hours || "—"}h</td>
                  <td className="px-3 py-2.5 text-gray-500">{a.deadline || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase", PRIORITY_COLORS[a.priority])}>
                      {a.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium focus:outline-none", STATUS_COLORS[a.status])}
                    >
                      <option value="assigned">Assigned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => del(a.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [depts, setDepts] = useState<DeptStat[]>([]);
  const [emps, setEmps] = useState<EmpStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/performance/department-stats`)
      .then((r) => r.json())
      .then((d) => { setDepts(d.departments || []); setEmps(d.employees || []); })
      .finally(() => setLoading(false));
  }, []);

  const totalHours = depts.reduce((s, d) => s + Number(d.total_hours), 0);
  const totalEmployees = depts.reduce((s, d) => s + Number(d.employee_count), 0);
  const topPerformer = emps[0];

  const deptChartData = depts.map((d) => ({
    name: d.department.length > 12 ? d.department.slice(0, 10) + ".." : d.department,
    hours: Number(d.total_hours),
    employees: Number(d.employee_count),
  }));

  const statusData = [
    { name: "Logged Hours", value: Math.round(totalHours) },
    { name: "Employees", value: totalEmployees },
    { name: "Departments", value: depts.length },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!depts.length) return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-500">No performance data yet</p>
      <p className="text-xs text-gray-400 mt-1">Add timesheet entries to see department performance</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Total Hours Logged" value={`${totalHours.toFixed(0)}h`} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Users} label="Active Employees" value={totalEmployees} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Building2} label="Departments" value={depts.length} color="bg-violet-100 text-violet-600" />
        <StatCard icon={Award} label="Top Performer" value={topPerformer?.employee_name || "—"} sub={topPerformer ? `${Number(topPerformer.total_hours).toFixed(0)}h logged` : ""} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Department-wise Hours</h3>
          {deptChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {deptChartData.map((_, i) => (
                    <Cell key={i} fill={DEPT_CHART_COLORS[i % DEPT_CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-gray-400 py-8 text-center">No department data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Performers</h3>
          <div className="space-y-2">
            {emps.slice(0, 8).map((e, i) => (
              <div key={e.employee_name} className="flex items-center gap-2.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  i === 0 ? "bg-amber-100 text-amber-700" :
                  i === 1 ? "bg-gray-200 text-gray-700" :
                  i === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-gray-100 text-gray-500"
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-800 truncate">{e.employee_name}</span>
                    <span className="text-xs font-bold text-gray-700 shrink-0 ml-2">{Number(e.total_hours).toFixed(0)}h</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, (Number(e.total_hours) / (Number(emps[0]?.total_hours) || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{e.department}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{e.unique_tasks} tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Department Summary</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Department", "Employees", "Total Hours", "Avg / Entry", "Entries", "Approved"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.department} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">{d.department}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.employee_count}</td>
                <td className="px-4 py-2.5 font-bold text-blue-600">{Number(d.total_hours).toFixed(0)}h</td>
                <td className="px-4 py-2.5 text-gray-600">{Number(d.avg_hours_per_entry).toFixed(1)}h</td>
                <td className="px-4 py-2.5 text-gray-600">{d.total_entries}</td>
                <td className="px-4 py-2.5">
                  <span className="text-green-600 font-medium">{d.approved_entries}</span>
                  <span className="text-gray-400"> / {d.total_entries}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Agent Setup Tab ──────────────────────────────────────────────────────────

function AgentTab() {
  const downloadUrl = `${API_BASE}/performance/agent-script`;
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">FlowTask Agent</h3>
            <p className="text-blue-200 text-xs">Python-based desktop activity tracker</p>
          </div>
        </div>
        <p className="text-sm text-blue-100 leading-relaxed">
          Install this lightweight Python script on employee computers. It runs in the background,
          tracks active application usage and idle time, and automatically logs timesheet entries
          to the platform every 5 minutes.
        </p>
        <a
          href={downloadUrl}
          download="flowtask_agent.py"
          className="mt-4 inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download flowtask_agent.py
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Requirements</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          {[
            "Python 3.7 or higher installed on the employee's computer",
            "Network access to the FlowMatriX server",
            "For Windows: no additional packages needed (uses built-in ctypes)",
            "For Linux: install xdotool (sudo apt install xdotool) and xprintidle",
            "For macOS: osascript is built-in (no extras needed)",
          ].map((r) => (
            <li key={r} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Usage</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Basic usage:</p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto font-mono">
{`python flowtask_agent.py \\
  --email john@company.com \\
  --name "John Smith" \\
  --dept "Engineering"`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">With task & project:</p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto font-mono">
{`python flowtask_agent.py \\
  --email john@company.com \\
  --name "John Smith" \\
  --dept "Engineering" \\
  --task "P&ID Design Review" \\
  --project "WTP Phase 2" \\
  --interval 300`}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">How it works</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Monitor, label: "Tracks Active Window", desc: "Records which application is in focus every 5 seconds" },
            { icon: Timer, label: "Detects Idle Time", desc: "Skips logging when no keyboard/mouse activity for 2 minutes" },
            { icon: Clock, label: "Reports Every 5 Min", desc: "Sends accumulated work time to the platform automatically" },
            { icon: AlertCircle, label: "Privacy Safe", desc: "Only tracks application names and time — no screenshots or keystrokes" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
              <Icon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeePerformance() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="px-4 md:px-6 py-5 max-w-7xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Employee Performance</h1>
          </div>
          <p className="text-xs text-gray-500 ml-10">Track timesheets, allocate tasks, and monitor department-wise performance</p>
        </div>

        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-5 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                tab === t
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab />}
        {tab === "Timesheet" && <TimesheetTab />}
        {tab === "Task Allocation" && <AllocationTab />}
        {tab === "Agent Setup" && <AgentTab />}
      </div>
    </div>
  );
}
