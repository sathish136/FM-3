import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Users, RefreshCw, LayoutGrid, List, Clock, TrendingUp, Briefcase,
  ChevronDown, ChevronUp, Minus, ExternalLink, CheckCircle2, AlertCircle,
  ListChecks, Search, X, ChevronRight, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "wouter";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";
const HRMS_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "");

const SKIP_DESIGNATIONS = ["operator", "md - wtt", "managing director"];
const SKIP_DEPT_EXACT  = ["md - wtt", "operator"];
const SKIP_DEPT_KEYWORDS = ["workshop"];

function isExcluded(emp: { designation?: string; department?: string }) {
  const des  = (emp.designation || "").toLowerCase().trim();
  const dept = (emp.department  || "").toLowerCase().trim();
  if (SKIP_DESIGNATIONS.some(s => des === s || des.includes(s))) return true;
  if (SKIP_DEPT_EXACT.some(s => dept === s)) return true;
  if (SKIP_DEPT_KEYWORDS.some(k => dept.includes(k))) return true;
  return false;
}
function isDeptExcluded(dept: string) {
  const d = dept.toLowerCase().trim();
  if (SKIP_DEPT_EXACT.some(s => d === s)) return true;
  if (SKIP_DEPT_KEYWORDS.some(k => d.includes(k))) return true;
  return false;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Employee = {
  employee_name: string; employee_id: string; employee_email: string;
  department: string; designation: string; erp_status: string; image: string | null;
  week_hours: number; week_idle: number; working_days: number; unique_tasks: number;
  today_hours: number; today_tasks: string; last_active: string | null;
  current_task: string; current_project: string; current_priority: string;
  current_activity_type: string; current_activity_time: string;
  alloc_status: string; utilization: number; avg_hrs_day: number;
};
type Summary = { total: number; active_today: number; with_tasks: number; total_week_hrs: number; avg_utilization: number };
type DashData = { employees: Employee[]; departments: string[]; summary: Summary; week: { from: string; to: string } };
type TaskPerf = {
  employee: string; employee_name: string; department: string;
  total_tasks: number; pending: number; partially_pending: number;
  completed: number; completion_rate: number; efficiency_rate: number; rank: number;
};
type EmployeeWithTask = Employee & {
  task_total?: number; task_pending?: number; task_completed?: number;
  task_completion_rate?: number; task_efficiency_rate?: number; task_rank?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#6366f1","#e0e7ff"],["#0ea5e9","#e0f2fe"],["#10b981","#d1fae5"],
  ["#f59e0b","#fef3c7"],["#ec4899","#fce7f3"],["#8b5cf6","#ede9fe"],
  ["#14b8a6","#ccfbf1"],["#f97316","#ffedd5"],["#06b6d4","#cffafe"],["#84cc16","#ecfccb"],
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
  if (u >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "Excellent", hex: "#10b981" };
  if (u >= 60) return { bar: "bg-blue-500",    text: "text-blue-600",    label: "Good",      hex: "#3b82f6" };
  if (u >= 40) return { bar: "bg-amber-400",   text: "text-amber-600",   label: "Average",   hex: "#f59e0b" };
  if (u > 0)   return { bar: "bg-red-400",     text: "text-red-500",     label: "Low",       hex: "#ef4444" };
  return               { bar: "bg-gray-200",   text: "text-gray-400",    label: "No Data",   hex: "#d1d5db" };
}
function taskColor(r: number) {
  if (r >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", hex: "#10b981" };
  if (r >= 50) return { bar: "bg-amber-400",   text: "text-amber-600",   hex: "#f59e0b" };
  return               { bar: "bg-red-400",    text: "text-red-500",     hex: "#ef4444" };
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function fmtDateISO(d: Date) { return d.toISOString().split("T")[0]; }

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = "md" }: { name: string; image?: string | null; size?: "xs" | "sm" | "md" }) {
  const [bg, fg] = avatarColor(name);
  const sz = size === "xs" ? "w-7 h-7 text-[9px]" : size === "sm" ? "w-8 h-8 text-[10px]" : "w-9 h-9 text-xs";
  if (image) {
    const src = image.startsWith("http") ? image : `https://erp.wttint.com${image}`;
    return <img src={src} alt={name} className={cn("rounded-full object-cover shrink-0", sz)} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0", sz)} style={{ background: bg, color: fg }}>
      {initials(name)}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none">{label}</p>
        <p className="text-lg font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 leading-none">{sub}</p>}
      </div>
    </div>
  );
}

// ── Compact Employee Card ─────────────────────────────────────────────────────
function EmployeeCard({ emp }: { emp: EmployeeWithTask }) {
  const [accentHex] = avatarColor(emp.employee_name);
  const uc = utilColor(emp.utilization);
  const isActive = emp.today_hours > 0;
  const hasTask = emp.alloc_status === "in-progress";
  const hasTaskData = (emp.task_total ?? 0) > 0;
  const cr = emp.task_completion_rate ?? 0;
  const tc = taskColor(cr);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden flex flex-col">
      {/* Color accent top bar */}
      <div className="h-[3px] w-full shrink-0" style={{ background: accentHex }} />

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Row 1: Avatar + Name + Status */}
        <div className="flex items-center gap-2.5">
          <Avatar name={emp.employee_name} image={emp.image} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[12px] font-bold text-gray-900 truncate leading-tight">{emp.employee_name}</p>
              <span className={cn(
                "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-300")} />
                {isActive ? "Active" : "Idle"}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">{emp.designation || "—"}</p>
          </div>
        </div>

        {/* Row 2: Dept badge */}
        {emp.department && (
          <div className="flex">
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-100">
              <Building2 className="w-2.5 h-2.5" /> {emp.department.replace(" - WTT", "")}
            </span>
          </div>
        )}

        {/* Row 3: Stats grid */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "Wk Hrs",  value: `${emp.week_hours.toFixed(1)}h` },
            { label: "Tasks",   value: emp.unique_tasks || "—" },
            { label: "Avg/Day", value: emp.avg_hrs_day > 0 ? `${emp.avg_hrs_day}h` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] text-gray-400 font-medium leading-none">{label}</p>
              <p className="text-[11px] font-black text-gray-800 leading-snug">{value}</p>
            </div>
          ))}
        </div>

        {/* Row 4: Utilization bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-gray-400 font-medium">Utilization</span>
            <span className={cn("text-[9px] font-bold", uc.text)}>{emp.utilization}% · {uc.label}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", uc.bar)} style={{ width: `${emp.utilization}%` }} />
          </div>
        </div>

        {/* Row 5: Task Performance (if available) */}
        {hasTaskData && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-2.5 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                <ListChecks className="w-2.5 h-2.5" /> Tasks
              </span>
              {emp.task_rank != null && (
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-100 rounded px-1.5 py-0.5">#{emp.task_rank}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-gray-700">{emp.task_total}</span>
                <span className="text-[9px] text-gray-400">total</span>
              </div>
              <span className="text-gray-200">·</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600">{emp.task_completed}</span>
              </div>
              <span className="text-gray-200">·</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-amber-500">{emp.task_pending}</span>
                <span className="text-[9px] text-gray-400">pending</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white rounded-full overflow-hidden border border-indigo-100">
                <div className={cn("h-full rounded-full", tc.bar)} style={{ width: `${cr}%` }} />
              </div>
              <span className={cn("text-[9px] font-black", tc.text)}>{cr}%</span>
            </div>
          </div>
        )}

        {/* Row 6: Current task / Activity */}
        {(emp.current_task || emp.today_tasks) && (() => {
          const fromActivity = !!emp.current_activity_time;
          const timeLabel = emp.current_activity_time
            ? new Date(emp.current_activity_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
            : null;
          return (
            <div className={cn(
              "rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5",
              fromActivity ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
            )}>
              <div className="flex items-center gap-1.5">
                {fromActivity
                  ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                  : <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5 shrink-0",
                      emp.current_priority === "critical" ? "bg-red-500" :
                      emp.current_priority === "high"     ? "bg-orange-400" :
                      emp.current_priority === "medium"   ? "bg-blue-400" : "bg-gray-300"
                    )} />
                }
                <p className={cn("text-[10px] font-medium line-clamp-1 leading-tight flex-1",
                  fromActivity ? "text-blue-700" : "text-gray-600"
                )}>
                  {emp.current_task || emp.today_tasks}
                </p>
              </div>
              {fromActivity && (
                <div className="flex items-center gap-2 pl-3">
                  {emp.current_activity_type && (
                    <span className="text-[9px] font-semibold text-blue-400">{emp.current_activity_type}</span>
                  )}
                  {timeLabel && (
                    <span className="text-[9px] text-blue-300 ml-auto">till {timeLabel}</span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
type SortKey = "employee_name" | "department" | "week_hours" | "utilization" | "avg_hrs_day" | "today_hours" | "task_completion_rate" | "task_total";

function TableView({ employees }: { employees: EmployeeWithTask[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("week_hours");
  const [sortAsc, setSortAsc] = useState(false);
  const sorted = [...employees].sort((a, b) => {
    const av = (a as any)[sortKey] ?? 0, bv = (b as any)[sortKey] ?? 0;
    if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });
  const Th = ({ k, label, center }: { k: SortKey; label: string; center?: boolean }) => (
    <th className={cn("px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap", center && "text-center")}>
      <button onClick={() => { if (sortKey === k) setSortAsc(x => !x); else { setSortKey(k); setSortAsc(false); } }}
        className="flex items-center gap-1 hover:text-gray-700 transition-colors mx-auto">
        {label}
        {sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <Minus className="w-3 h-3 opacity-25" />}
      </button>
    </th>
  );
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-2.5 w-8 text-gray-300 font-semibold text-[10px]">#</th>
              <Th k="employee_name" label="Employee" />
              <Th k="department"    label="Dept" />
              <Th k="today_hours"   label="Today"    center />
              <Th k="week_hours"    label="Wk Hrs"   center />
              <Th k="avg_hrs_day"   label="Avg/Day"  center />
              <Th k="utilization"   label="Utilization" />
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-50/60 whitespace-nowrap">Tasks</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-indigo-50/60">Done</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-indigo-50/60">Pending</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-50/60 whitespace-nowrap min-w-[110px]">
                <button onClick={() => { if (sortKey === "task_completion_rate") setSortAsc(x => !x); else { setSortKey("task_completion_rate"); setSortAsc(false); } }}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                  Completion {sortKey === "task_completion_rate" ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <Minus className="w-3 h-3 opacity-25" />}
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-blue-400 min-w-[160px]">Current Activity</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={12} className="py-16 text-center text-gray-400 text-xs">No employee data</td></tr>
            ) : sorted.map((emp, i) => {
              const uc = utilColor(emp.utilization);
              const cr = emp.task_completion_rate ?? 0;
              const tc = taskColor(cr);
              const has = (emp.task_total ?? 0) > 0;
              return (
                <tr key={emp.employee_name + i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-gray-300 text-[10px] font-semibold">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.employee_name} image={emp.image} size="xs" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-[11px] truncate">{emp.employee_name}</p>
                        <p className="text-[9px] text-gray-400 truncate">{emp.designation || emp.employee_email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {emp.department
                      ? <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-semibold text-[9px]">{emp.department.replace(" - WTT","")}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {emp.today_hours > 0 ? <span className="font-bold text-emerald-600 text-[11px]">{emp.today_hours.toFixed(1)}h</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-700 text-[11px]">{emp.week_hours.toFixed(1)}h</td>
                  <td className="px-3 py-2.5 text-center text-gray-500 text-[11px]">{emp.avg_hrs_day > 0 ? `${emp.avg_hrs_day}h` : "—"}</td>
                  <td className="px-3 py-2.5 min-w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", uc.bar)} style={{ width: `${emp.utilization}%` }} />
                      </div>
                      <span className={cn("text-[9px] font-bold w-7 text-right", uc.text)}>{emp.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center bg-indigo-50/20">
                    {has ? <span className="font-bold text-gray-700 text-[11px]">{emp.task_total}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center bg-indigo-50/20">
                    {has ? <span className="font-bold text-emerald-600 text-[11px]">{emp.task_completed}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center bg-indigo-50/20">
                    {has ? <span className={cn("font-bold text-[11px]", (emp.task_pending ?? 0) > 0 ? "text-amber-500" : "text-gray-400")}>{emp.task_pending ?? 0}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 bg-indigo-50/20 min-w-[110px]">
                    {has ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", tc.bar)} style={{ width: `${cr}%` }} />
                        </div>
                        <span className={cn("text-[9px] font-bold w-7 text-right", tc.text)}>{cr}%</span>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 min-w-[160px]">
                    {emp.current_task ? (
                      <div className={cn(
                        "rounded-md px-2 py-1.5 flex flex-col gap-0.5",
                        emp.current_activity_time ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
                      )}>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                            emp.current_activity_time ? "bg-blue-500 animate-pulse" :
                            emp.alloc_status === "in-progress" ? "bg-blue-400" : "bg-gray-300")} />
                          <span className={cn("text-[10px] font-medium leading-tight",
                            emp.current_activity_time ? "text-blue-700" : "text-gray-600"
                          )}>{emp.current_task}</span>
                        </div>
                        {emp.current_activity_time && (
                          <div className="flex items-center gap-1.5 pl-3">
                            {emp.current_activity_type && (
                              <span className="text-[9px] font-semibold text-blue-400">{emp.current_activity_type}</span>
                            )}
                            <span className="text-[9px] text-blue-300 ml-auto">
                              till {new Date(emp.current_activity_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : <span className="text-gray-300 text-[10px]">—</span>}
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

// ── Chart View ────────────────────────────────────────────────────────────────
function ChartView({ employees }: { employees: EmployeeWithTask[] }) {
  const data = employees
    .filter(e => e.week_hours > 0)
    .slice(0, 15)
    .map(e => ({
      name: e.employee_name.split(" ").map((w, i) => i === 0 ? w : w[0] + ".").join(" "),
      hours: e.week_hours,
      fill: avatarColor(e.employee_name)[0],
    }));
  if (!data.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-xs font-semibold text-gray-600 mb-3">Hours Logged This Week (Top 15)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ left: -20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #f3f4f6", fontSize: 11 }} cursor={{ fill: "#f9fafb" }} />
          <Bar dataKey="hours" radius={[5,5,0,0]} maxBarSize={32}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Dept Dropdown ─────────────────────────────────────────────────────────────
function DeptDropdown({ departments, value, onChange }: { departments: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const label = value ? value.replace(" - WTT", "") : "All Departments";
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 text-xs font-semibold text-gray-700 shadow-sm transition-colors min-w-[160px] justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          {label}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[220px]">
          <div className="py-1 max-h-72 overflow-y-auto">
            {["", ...departments].map(d => (
              <button
                key={d || "__all"}
                onClick={() => { onChange(d); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2",
                  value === d
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {value === d && <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />}
                <span className={value === d ? "" : "ml-4"}>{d ? d.replace(" - WTT", "") : "All Departments"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamPerformanceDashboard() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialDept = params.get("dept") || "";
  const initialEmployee = params.get("employee") || "";

  const [data, setData] = useState<DashData | null>(null);
  const [taskPerfMap, setTaskPerfMap] = useState<Record<string, TaskPerf>>({});
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState(initialDept);
  const [empFilter, setEmpFilter] = useState(initialEmployee);
  const [view, setView] = useState<"cards" | "table">(initialEmployee ? "table" : "cards");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadTaskPerf = useCallback(async (from: string, to: string) => {
    try {
      const r = await fetch(`${HRMS_BASE}/api/hrms/task-summary/employees?from_date=${from}&to_date=${to}`);
      if (!r.ok) return;
      const arr: TaskPerf[] = (await r.json()).filter((x: any) => !x.is_total);
      const map: Record<string, TaskPerf> = {};
      arr.forEach(tp => {
        if (isExcluded({ designation: (tp as any).designation, department: tp.department })) return;
        map[tp.employee_name?.toLowerCase().trim()] = tp;
        if (tp.employee) map[tp.employee?.toLowerCase().trim()] = tp;
      });
      setTaskPerfMap(map);
    } catch { /* non-blocking */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/performance/team-dashboard`);
      if (r.ok) {
        const d: DashData = await r.json();
        setData(d);
        setLastRefresh(new Date());
        loadTaskPerf(d.week?.from || fmtDateISO(new Date()), d.week?.to || fmtDateISO(new Date()));
      }
    } finally { setLoading(false); }
  }, [loadTaskPerf]);

  useEffect(() => { load(); }, [load]);

  const departments = (() => {
    const s = new Set<string>((data?.departments || []).filter(d => !isDeptExcluded(d)));
    Object.values(taskPerfMap).forEach(tp => { if (tp.department && !isDeptExcluded(tp.department)) s.add(tp.department); });
    return [...s].sort();
  })();

  const mergedEmployees: EmployeeWithTask[] = (() => {
    const seen = new Set<string>();
    const result: EmployeeWithTask[] = [];
    (data?.employees || []).forEach(emp => {
      if (isExcluded(emp)) return;
      const key = emp.employee_name?.toLowerCase().trim();
      const idKey = emp.employee_id?.toLowerCase().trim();
      const tp = taskPerfMap[key] || (idKey ? taskPerfMap[idKey] : undefined);
      seen.add(key);
      result.push({ ...emp, ...(tp ? {
        task_total: tp.total_tasks,
        task_pending: (tp.pending || 0) + (tp.partially_pending || 0),
        task_completed: tp.completed,
        task_completion_rate: tp.completion_rate,
        task_efficiency_rate: tp.efficiency_rate,
        task_rank: tp.rank,
      } : {}) });
    });
    Object.values(taskPerfMap).forEach(tp => {
      const key = tp.employee_name?.toLowerCase().trim();
      if (!key || seen.has(key) || isDeptExcluded(tp.department || "")) return;
      seen.add(key);
      result.push({
        employee_name: tp.employee_name, employee_id: tp.employee, employee_email: "",
        department: tp.department || "", designation: (tp as any).designation || "",
        erp_status: "Active", image: null, week_hours: 0, week_idle: 0,
        working_days: (tp as any).present_days || 0, unique_tasks: tp.total_tasks,
        today_hours: 0, today_tasks: "", last_active: null,
        current_task: "", current_project: "", current_priority: "",
        current_activity_type: "", current_activity_time: "",
        alloc_status: "", utilization: 0, avg_hrs_day: 0,
        task_total: tp.total_tasks,
        task_pending: (tp.pending || 0) + (tp.partially_pending || 0),
        task_completed: tp.completed, task_completion_rate: tp.completion_rate,
        task_efficiency_rate: tp.efficiency_rate, task_rank: tp.rank,
      });
    });
    return result;
  })();

  const deptFiltered = dept
    ? mergedEmployees.filter(e => e.department?.toLowerCase() === dept.toLowerCase())
    : mergedEmployees;

  const employees = empFilter
    ? deptFiltered.filter(e =>
        e.employee_name.toLowerCase().includes(empFilter.toLowerCase()) ||
        (e.employee_id || "").toLowerCase().includes(empFilter.toLowerCase())
      )
    : deptFiltered;

  const summary = data?.summary;
  const taskEmps = employees.filter(e => (e.task_total ?? 0) > 0);
  const avgCompletion = taskEmps.length
    ? Math.round(taskEmps.reduce((s, e) => s + (e.task_completion_rate ?? 0), 0) / taskEmps.length)
    : 0;
  const totalDone    = taskEmps.reduce((s, e) => s + (e.task_completed ?? 0), 0);
  const totalPending = taskEmps.reduce((s, e) => s + (e.task_pending ?? 0), 0);

  const refreshLabel = lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const hasFilters = dept || empFilter;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/60 px-4 sm:px-6 py-5 max-w-screen-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">Team Performance</h1>
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
              <span>{data?.week ? `${fmtDate(data.week.from)} – ${fmtDate(data.week.to)}` : "This week"}</span>
              <span className="text-gray-300">·</span>
              <span>Updated {refreshLabel}</span>
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold shadow-sm transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        {/* ── From Task Summary Banner ── */}
        {(initialDept || initialEmployee) && (
          <div className="flex items-center gap-2 flex-wrap mb-3 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200">
            <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-[11px] text-indigo-600 font-semibold">
              From Task Summary
              {initialDept && <> — <strong>{initialDept.replace(" - WTT","")}</strong></>}
              {initialEmployee && <> — <strong>{initialEmployee}</strong></>}
            </span>
            <button
              onClick={() => { setDept(""); setEmpFilter(""); setView("cards"); window.history.replaceState({}, "", window.location.pathname); }}
              className="ml-auto text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}

        {/* ── Professional Filter Bar ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">

            {/* Dept dropdown */}
            <DeptDropdown departments={departments} value={dept} onChange={setDept} />

            {/* Employee search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={empFilter}
                onChange={e => setEmpFilter(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-gray-700 placeholder-gray-400 transition-colors"
              />
              {empFilter && (
                <button onClick={() => setEmpFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {dept && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {dept.replace(" - WTT", "")}
                    <button onClick={() => setDept("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {empFilter && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold">
                    "{empFilter}"
                    <button onClick={() => setEmpFilter("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                <button onClick={() => { setDept(""); setEmpFilter(""); }}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-semibold ml-1 transition-colors">
                  Clear all
                </button>
              </div>
            )}

            <div className="flex-1" />

            {/* Result count */}
            <span className="text-[11px] font-semibold text-gray-400">
              {employees.length} <span className="font-normal">employee{employees.length !== 1 ? "s" : ""}</span>
            </span>

            {/* View toggle */}
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              {([["cards", LayoutGrid, "Cards"], ["table", List, "Table"]] as const).map(([k, Icon, label]) => (
                <button key={k} onClick={() => setView(k)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                    view === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Summary ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            <StatCard icon={Users}        label="Employees"       value={employees.length}          color="text-indigo-600"  bg="bg-indigo-50" />
            <StatCard icon={Clock}        label="Active Today"    value={summary.active_today}       color="text-emerald-600" bg="bg-emerald-50" sub={`of ${employees.length} shown`} />
            <StatCard icon={Briefcase}    label="Week Hours"      value={`${summary.total_week_hrs}h`} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={TrendingUp}   label="Avg Utilization" value={`${summary.avg_utilization}%`} color="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={CheckCircle2} label="Task Completion" value={`${avgCompletion}%`}        color="text-emerald-600" bg="bg-emerald-50" sub={`${totalDone} done`} />
            <StatCard icon={AlertCircle}  label="Tasks Pending"   value={totalPending}               color="text-rose-500"    bg="bg-rose-50" sub="from task summary" />
          </div>
        )}

        {/* ── Content ── */}
        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-gray-400">Loading team data…</p>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
            <Users className="w-9 h-9 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-500">No employees found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting the department or search filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            <ChartView employees={employees} />
            {view === "cards" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {employees.map(emp => <EmployeeCard key={emp.employee_name + emp.employee_id} emp={emp} />)}
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
