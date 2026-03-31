import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Briefcase, Mic, Phone, AlertCircle, AlertTriangle,
  TrendingUp, UserPlus, UserMinus, ChevronLeft, ChevronRight,
  Maximize2, X, RefreshCw, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEPT_COLORS = [
  "#6366f1","#3b82f6","#0ea5e9","#14b8a6","#10b981",
  "#84cc16","#f59e0b","#f97316","#ef4444","#ec4899","#8b5cf6","#a78bfa",
];

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, chips, split, onClick,
}: {
  label: string; value?: string | number; icon: any; color: string;
  chips?: { label: string; val: string | number }[];
  split?: { left: { label: string; val: string | number; color: string }; right: { label: string; val: string | number; color: string } };
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl p-4 border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm overflow-hidden transition-all duration-200",
        onClick ? "cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.15] hover:shadow-lg" : ""
      )}
    >
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${color} pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} bg-opacity-20`}>
          <Icon className="w-4 h-4 text-white/70" />
        </div>
      </div>
      {value !== undefined && (
        <div className="relative text-3xl font-black text-white tracking-tight">{value}</div>
      )}
      {split && (
        <div className="relative flex items-center gap-3">
          <div className="flex-1 text-center">
            <div className="text-[10px] text-slate-500 font-semibold">{split.left.label}</div>
            <div className={`text-2xl font-black ${split.left.color}`}>{split.left.val}</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex-1 text-center">
            <div className="text-[10px] text-slate-500 font-semibold">{split.right.label}</div>
            <div className={`text-2xl font-black ${split.right.color}`}>{split.right.val}</div>
          </div>
        </div>
      )}
      {chips && chips.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5">
          {chips.map(c => (
            <div key={c.label} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/[0.06]">
              <span className="text-[10px] text-slate-500">{c.label}</span>
              <span className="text-[11px] font-bold text-slate-200">{c.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Drawer ───────────────────────────────────────────────────────────
function Drawer({ open, onClose, title, badge, children }: {
  open: boolean; onClose: () => void; title: string; badge?: number | string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="relative flex flex-col w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden border border-white/[0.1]"
        style={{ background: "linear-gradient(180deg,#0f172a 0%,#0d1526 100%)" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07] shrink-0">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.07]">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{title}</span>
            {badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">{badge}</span>
            )}
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.07]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Small chart card ────────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
      <div className="text-xs font-semibold text-slate-400 mb-3">{title}</div>
      {children}
    </div>
  );
}

// ── Analytics Table ─────────────────────────────────────────────────────────
function AnalyticsTable({ columns, rows, emptyMsg = "No data" }: {
  columns: string[]; rows: (string | number | React.ReactNode)[][]; emptyMsg?: string;
}) {
  const [filters, setFilters] = useState<string[]>(columns.map(() => ""));
  const filtered = useMemo(() => {
    return rows.filter(row =>
      filters.every((f, i) => !f || String(row[i] ?? "").toLowerCase().includes(f.toLowerCase()))
    );
  }, [rows, filters]);

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map(c => (
              <th key={c} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-[#0a1020] border-b border-white/[0.07] whitespace-nowrap">{c}</th>
            ))}
          </tr>
          <tr className="bg-[#0a1020]">
            {columns.map((_, i) => (
              <td key={i} className="px-2 py-1.5 border-b border-white/[0.05]">
                <input
                  placeholder="Filter…"
                  value={filters[i]}
                  onChange={e => setFilters(f => f.map((v, j) => j === i ? e.target.value : v))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-slate-600 text-xs">{emptyMsg}</td></tr>
          ) : filtered.map((row, ri) => (
            <tr key={ri} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mock data generators ────────────────────────────────────────────────────
const DEPARTMENTS = ["Engineering","HR","Finance","Operations","Marketing","Sales","IT","Admin","Projects","Design"];
const NAMES = ["Arjun Kumar","Priya Sharma","Ravi Patel","Anita Singh","Mohammed Ali","Lakshmi Nair","Suresh Babu","Deepa Krishnan","Vijay Menon","Sunita Rao","Kiran Gupta","Pooja Iyer"];

function mockAbsentList(tab: string) {
  const today = new Date();
  const count = tab === "today" ? 4 : tab === "yesterday" ? 3 : 12;
  return Array.from({ length: count }, (_, i) => ({
    name: NAMES[i % NAMES.length],
    dept: DEPARTMENTS[i % DEPARTMENTS.length],
    date: fmtDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (tab === "yesterday" ? 1 : 0)).toISOString()),
    leaveType: ["Sick Leave","Casual Leave","Earned Leave","LOP"][i % 4],
    status: ["Approved","Unapproved","Uninformed"][i % 3],
    reason: ["Medical appointment","Personal work","Family function","Not informed","Emergency"][i % 5],
  }));
}

function mockMonthlyData() {
  return MONTHS.map(m => ({
    month: m,
    joiners: Math.floor(Math.random() * 8) + 1,
    attrition: Math.floor(Math.random() * 4),
    interviews: Math.floor(Math.random() * 20) + 5,
    followups: Math.floor(Math.random() * 30) + 10,
  }));
}

function mockDeptData() {
  return DEPARTMENTS.slice(0, 7).map(d => ({ dept: d, count: Math.floor(Math.random() * 15) + 2 }));
}

// ── Main Page ───────────────────────────────────────────────────────────────
type AbsentTab = "today" | "yesterday" | "month" | "range";
type DrawerView = "headcount" | "absent" | "interviews" | "followups" | "grievance" | "incident" | null;

export default function HrAnalytics() {
  const [loading, setLoading] = useState(false);
  const [absentTab, setAbsentTab] = useState<AbsentTab>("today");
  const [absentStatusFilter, setAbsentStatusFilter] = useState<"all" | "approved" | "unapproved" | "uninformed">("all");
  const [drawerView, setDrawerView] = useState<DrawerView>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [monthlyData] = useState(mockMonthlyData);
  const [deptData] = useState(mockDeptData);

  // KPI values (would come from API)
  const kpi = {
    totalEmployees: 148, present: 132, absent: 16,
    openings: 7,
    interviews: { year: 214, month: 18, today: 3, yesterday: 5 },
    followups: { year: 892, month: 74, today: 12, yesterday: 9 },
    grievance: { year: 23, month: 4, prevMonth: 6 },
    incident: { year: 41, month: 7, prevMonth: 5 },
    joiners: { year: 34, month: 3 },
    attrition: { year: 12, month: 1 },
    recruitment: { shortlisted: 28, hired: 11, processing: 9, rejected: 14, notInterested: 6 },
  };

  const absentList = useMemo(() => {
    const list = mockAbsentList(absentTab);
    if (absentStatusFilter === "all") return list;
    return list.filter(r => r.status.toLowerCase() === absentStatusFilter.toLowerCase());
  }, [absentTab, absentStatusFilter]);

  // Calendar logic
  const calDays = useMemo(() => {
    const firstDay = new Date(calMonth.y, calMonth.m, 1).getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon start
    return { offset, daysInMonth };
  }, [calMonth]);

  const today = new Date();

  // Mock calendar events
  const calEvents: Record<number, { followup?: number; interview?: number; task?: number }> = {
    3: { followup: 2 }, 7: { interview: 1 }, 10: { followup: 3, interview: 1 },
    14: { task: 2 }, 17: { followup: 1 }, 21: { interview: 2, followup: 1 },
    24: { task: 1, followup: 2 }, 28: { interview: 1 },
  };

  const joinersData = useMemo(() => DEPARTMENTS.slice(0, 6).map((d, i) => ({
    dept: d.slice(0, 6), count: Math.floor(Math.random() * 8) + 1
  })), []);
  const attritionData = useMemo(() => DEPARTMENTS.slice(0, 5).map((d, i) => ({
    dept: d.slice(0, 6), count: Math.floor(Math.random() * 4) + 1
  })), []);

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-screen bg-[#0a1020] text-white overflow-auto">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">HR Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Human Resource Department — Overview</p>
          </div>
          <button
            onClick={() => setLoading(l => !l)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-auto">

          {/* ── KPI Row ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KpiCard
              label="Total Employees"
              value={kpi.totalEmployees}
              icon={Users}
              color="from-indigo-500 to-blue-500"
              chips={[
                { label: "Present", val: kpi.present },
                { label: "Absent", val: kpi.absent },
              ]}
            />
            <KpiCard
              label="Openings"
              value={kpi.openings}
              icon={Briefcase}
              color="from-violet-500 to-purple-500"
              onClick={() => setDrawerView(null)}
            />
            <KpiCard
              label="Interviews (Year)"
              value={kpi.interviews.year}
              icon={Mic}
              color="from-cyan-500 to-teal-500"
              chips={[
                { label: "Month", val: kpi.interviews.month },
                { label: "Today", val: kpi.interviews.today },
                { label: "Yest.", val: kpi.interviews.yesterday },
              ]}
              onClick={() => setDrawerView("interviews")}
            />
            <KpiCard
              label="Followups (Year)"
              value={kpi.followups.year}
              icon={Phone}
              color="from-blue-500 to-indigo-500"
              chips={[
                { label: "Month", val: kpi.followups.month },
                { label: "Today", val: kpi.followups.today },
                { label: "Yest.", val: kpi.followups.yesterday },
              ]}
              onClick={() => setDrawerView("followups")}
            />
            <KpiCard
              label="Grievance (Year)"
              value={kpi.grievance.year}
              icon={AlertCircle}
              color="from-amber-500 to-orange-500"
              chips={[
                { label: "This Month", val: kpi.grievance.month },
                { label: "Prev Month", val: kpi.grievance.prevMonth },
              ]}
              onClick={() => setDrawerView("grievance")}
            />
            <KpiCard
              label="Incident (Year)"
              value={kpi.incident.year}
              icon={AlertTriangle}
              color="from-rose-500 to-red-500"
              chips={[
                { label: "This Month", val: kpi.incident.month },
                { label: "Prev Month", val: kpi.incident.prevMonth },
              ]}
              onClick={() => setDrawerView("incident")}
            />
            <KpiCard
              label="Headcount Movement"
              icon={TrendingUp}
              color="from-emerald-500 to-teal-500"
              split={{
                left: { label: "Joiners", val: kpi.joiners.year, color: "text-emerald-400" },
                right: { label: "Attrition", val: kpi.attrition.year, color: "text-rose-400" },
              }}
              onClick={() => setDrawerView("headcount")}
            />
          </div>

          {/* ── Main Grid ───────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">

            {/* Calendar */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Task & Followup & Interview Calendar</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" />Followup</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" />Interview</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" />Task</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCalMonth(m => m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 })}
                      className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-slate-300 px-2 min-w-[100px] text-center">
                      {MONTHS[calMonth.m]} {calMonth.y}
                    </span>
                    <button onClick={() => setCalMonth(m => m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 })}
                      className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCalMonth({ y: today.getFullYear(), m: today.getMonth() })}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold hover:bg-indigo-500/30 transition-all ml-1">
                      Today
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 py-1.5">{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calDays.offset }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: calDays.daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = calMonth.y === today.getFullYear() && calMonth.m === today.getMonth() && day === today.getDate();
                    const events = calEvents[day];
                    return (
                      <div key={day}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl border transition-all cursor-pointer text-xs hover:bg-white/[0.07]",
                          isToday
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold"
                            : "border-transparent text-slate-400 hover:border-white/[0.07]"
                        )}>
                        <span className="text-[11px]">{day}</span>
                        {events && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                            {events.followup && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                            {events.interview && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                            {events.task && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panels */}
            <div className="flex flex-col gap-5">

              {/* Absent List */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-rose-400" />
                    <span className="text-sm font-bold text-white">Absent List</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDrawerView("absent")}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-white/[0.07]">
                  {(["today","yesterday","month","range"] as AbsentTab[]).map(t => (
                    <button key={t} onClick={() => setAbsentTab(t)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all",
                        absentTab === t
                          ? "text-white bg-white/[0.07] border-b-2 border-indigo-500"
                          : "text-slate-600 hover:text-slate-300"
                      )}>
                      {t === "today" ? "Today" : t === "yesterday" ? "Yest." : t === "month" ? "Month" : "Range"}
                    </button>
                  ))}
                </div>
                {/* Status filter */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
                  {(["all","approved","unapproved","uninformed"] as const).map(s => (
                    <button key={s} onClick={() => setAbsentStatusFilter(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all",
                        absentStatusFilter === s
                          ? s === "approved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : s === "unapproved" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : s === "uninformed" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-white/[0.1] text-slate-200 border border-white/[0.1]"
                          : "text-slate-600 hover:text-slate-400"
                      )}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Table */}
                <div className="overflow-auto flex-1 max-h-56">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {["Employee","Leave Type","Status"].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-[#0a1020] sticky top-0 border-b border-white/[0.05]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {absentList.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-6 text-slate-600">No records</td></tr>
                      ) : absentList.map((r, i) => (
                        <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-slate-200 text-[11px]">{r.name}</div>
                            <div className="text-[10px] text-slate-600">{r.dept}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 text-[11px]">{r.leaveType}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              r.status === "Approved" ? "bg-emerald-500/20 text-emerald-400"
                                : r.status === "Unapproved" ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            )}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recruitment Status */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
                  <span className="w-1 h-4 rounded-full bg-violet-400" />
                  <span className="text-sm font-bold text-white">Recruitment Status</span>
                </div>
                <div className="grid grid-cols-5 gap-0 divide-x divide-white/[0.07]">
                  {[
                    { label: "Shortlisted", val: kpi.recruitment.shortlisted, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                    { label: "Hired", val: kpi.recruitment.hired, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Processing", val: kpi.recruitment.processing, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Rejected", val: kpi.recruitment.rejected, color: "text-rose-400", bg: "bg-rose-500/10" },
                    { label: "Not Int.", val: kpi.recruitment.notInterested, color: "text-slate-400", bg: "bg-slate-500/10" },
                  ].map(c => (
                    <div key={c.label}
                      className={cn("flex flex-col items-center justify-center py-4 cursor-pointer transition-all hover:bg-white/[0.04]", c.bg)}>
                      <span className={cn("text-2xl font-black", c.color)}>{c.val}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5 text-center">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly trend mini chart */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                <div className="text-xs font-semibold text-slate-400 mb-3">Joiners vs Attrition (Monthly)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={monthlyData} barSize={6} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#cbd5e1" }}
                    />
                    <Bar dataKey="joiners" fill="#10b981" radius={[2,2,0,0]} name="Joiners" />
                    <Bar dataKey="attrition" fill="#ef4444" radius={[2,2,0,0]} name="Attrition" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Headcount Movement Drawer ─────────────────────── */}
      <Drawer open={drawerView === "headcount"} onClose={() => setDrawerView(null)}
        title="Headcount Movement — Full Analysis" badge={kpi.joiners.year + kpi.attrition.year}>
        <div className="grid grid-cols-2 gap-5 p-6 h-full">
          {/* Joiners */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">JOINERS ANALYSIS</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">TOTAL (YEAR)</div>
                <div className="text-3xl font-black text-emerald-400">{kpi.joiners.year}</div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">THIS MONTH</div>
                <div className="text-3xl font-black text-emerald-400">{kpi.joiners.month}</div>
              </div>
            </div>
            <ChartCard title="Department Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={joinersData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Monthly Trend">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="joiners" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden flex-1">
              <div className="px-4 py-2.5 border-b border-white/[0.05]">
                <span className="text-xs font-bold text-slate-400">Joiners Details</span>
              </div>
              <AnalyticsTable
                columns={["Employee Name","Department","Role","Joining Date"]}
                rows={Array.from({ length: kpi.joiners.year }, (_, i) => [
                  NAMES[i % NAMES.length], DEPARTMENTS[i % DEPARTMENTS.length],
                  ["Engineer","Manager","Analyst","Executive","Technician"][i % 5],
                  fmtDate(new Date(2025, Math.floor(i / 3), (i % 28) + 1).toISOString()),
                ])}
              />
            </div>
          </div>
          {/* Attrition */}
          <div className="flex flex-col gap-4 border-l border-white/[0.07] pl-5">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <UserMinus className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-bold text-rose-400">ATTRITION ANALYSIS</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">TOTAL (YEAR)</div>
                <div className="text-3xl font-black text-rose-400">{kpi.attrition.year}</div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">THIS MONTH</div>
                <div className="text-3xl font-black text-rose-400">{kpi.attrition.month}</div>
              </div>
            </div>
            <ChartCard title="Department Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={attritionData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Monthly Trend">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="attrition" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden flex-1">
              <div className="px-4 py-2.5 border-b border-white/[0.05]">
                <span className="text-xs font-bold text-slate-400">Attrition Details</span>
              </div>
              <AnalyticsTable
                columns={["Employee Name","Department","Role","Relieving Date"]}
                rows={Array.from({ length: kpi.attrition.year }, (_, i) => [
                  NAMES[i % NAMES.length], DEPARTMENTS[i % DEPARTMENTS.length],
                  ["Engineer","Manager","Analyst","Executive","Technician"][i % 5],
                  fmtDate(new Date(2025, Math.floor(i / 2), (i % 28) + 1).toISOString()),
                ])}
              />
            </div>
          </div>
        </div>
      </Drawer>

      {/* ── Absent Detail Drawer ─────────────────────────── */}
      <Drawer open={drawerView === "absent"} onClose={() => setDrawerView(null)}
        title="Absent List — Full Analysis" badge={absentList.length}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[
                    { name: "Approved", value: 8 }, { name: "Unapproved", value: 5 }, { name: "Uninformed", value: 3 },
                  ]} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {["#10b981","#f59e0b","#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Leave Type Breakdown">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[
                    { name: "Sick", value: 6 }, { name: "Casual", value: 4 }, { name: "Earned", value: 3 }, { name: "LOP", value: 3 },
                  ]} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {DEPT_COLORS.slice(0, 4).map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Department-wise Analysis">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={deptData.slice(0, 6)} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="dept" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Daily Trend">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={Array.from({ length: 14 }, (_, i) => ({ day: `D${i + 1}`, absent: Math.floor(Math.random() * 8) + 2 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="absent" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Employee Details</span></div>
              <AnalyticsTable
                columns={["Employee Name","Department","Date","Leave Type","Status","Reason"]}
                rows={mockAbsentList("month").map(r => [
                  r.name, r.dept, r.date, r.leaveType,
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    r.status === "Approved" ? "bg-emerald-500/20 text-emerald-400"
                      : r.status === "Unapproved" ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400")}>{r.status}</span>,
                  r.reason,
                ])}
              />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Department Summary</span></div>
              <AnalyticsTable
                columns={["Department","Count","%"]}
                rows={deptData.map(d => [d.dept, d.count, `${Math.round(d.count / deptData.reduce((s, x) => s + x.count, 0) * 100)}%`])}
              />
            </div>
          </div>
        </div>
      </Drawer>

      {/* ── Interviews Drawer ────────────────────────────── */}
      <Drawer open={drawerView === "interviews"} onClose={() => setDrawerView(null)}
        title="Interview Details — Full Analysis" badge={kpi.interviews.year}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <ChartCard title="Department Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" outerRadius={60} dataKey="count" nameKey="dept">
                    {deptData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Experience Level">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "Fresher", value: 45 },{ name: "1-3 yr", value: 90 },{ name: "3-5 yr", value: 52 },{ name: "5+ yr", value: 27 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#6366f1","#3b82f6","#0ea5e9","#14b8a6"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Qualification">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "B.E/B.Tech", value: 98 },{ name: "Diploma", value: 62 },{ name: "ITI", value: 31 },{ name: "Other", value: 23 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#8b5cf6","#a78bfa","#c084fc","#e879f9"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Daily Interview Trend">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="interviews" fill="#0ea5e9" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Interview Details</span></div>
            <AnalyticsTable
              columns={["Date","Candidate Name","Department","Experience","Qualification","Next Follow Up"]}
              rows={Array.from({ length: 30 }, (_, i) => [
                fmtDate(new Date(2025, i % 12, (i % 28) + 1).toISOString()),
                `Candidate ${i + 1}`, DEPARTMENTS[i % DEPARTMENTS.length],
                [`Fresher`, `1-2 yr`, `3-5 yr`, `5+ yr`][i % 4],
                [`B.E/B.Tech`, `Diploma`, `ITI`, `MBA`][i % 4],
                fmtDate(new Date(2025, (i + 1) % 12, (i % 20) + 1).toISOString()),
              ])}
            />
          </div>
        </div>
      </Drawer>

      {/* ── Followups Drawer ─────────────────────────────── */}
      <Drawer open={drawerView === "followups"} onClose={() => setDrawerView(null)}
        title="Followup Details — Full Analysis" badge={kpi.followups.year}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <ChartCard title="Department Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" outerRadius={60} dataKey="count" nameKey="dept">
                    {deptData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Daily Trend">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="followups" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Qualification Breakdown">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "B.E/B.Tech", value: 280 },{ name: "Diploma", value: 340 },{ name: "ITI", value: 180 },{ name: "Other", value: 92 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#6366f1","#3b82f6","#0ea5e9","#14b8a6"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Location Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "Chennai", value: 320 },{ name: "Coimbatore", value: 250 },{ name: "Bangalore", value: 180 },{ name: "Other", value: 142 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#f59e0b","#f97316","#ef4444","#ec4899"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Followup Details</span></div>
            <AnalyticsTable
              columns={["Date","Time","Candidate Name","Qualification","Department","Location","Contact","Next Followup"]}
              rows={Array.from({ length: 40 }, (_, i) => [
                fmtDate(new Date(2025, i % 12, (i % 28) + 1).toISOString()),
                `${9 + (i % 9)}:${String(i % 60).padStart(2,"0")} AM`,
                `Candidate ${i + 1}`,
                [`B.E/B.Tech`, `Diploma`, `ITI`, `MBA`][i % 4],
                DEPARTMENTS[i % DEPARTMENTS.length],
                ["Chennai","Coimbatore","Bangalore","Madurai"][i % 4],
                `+91 9${String(100000000 + i * 7).slice(1)}`,
                fmtDate(new Date(2025, (i + 1) % 12, (i % 20) + 1).toISOString()),
              ])}
            />
          </div>
        </div>
      </Drawer>

      {/* ── Grievance Drawer ─────────────────────────────── */}
      <Drawer open={drawerView === "grievance"} onClose={() => setDrawerView(null)}
        title="Grievance Details — Full Analysis" badge={kpi.grievance.year}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "Resolved", value: 14 },{ name: "Pending", value: 6 },{ name: "Open", value: 3 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#10b981","#f59e0b","#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Monthly Trend">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData.map(m => ({ month: m.month, count: Math.floor(Math.random() * 5) + 1 }))} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Resolution Time (days)">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[{ range:"0-3d", count:6 },{ range:"4-7d", count:8 },{ range:"8-15d", count:5 },{ range:"15d+", count:4 }]} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Grievance Details</span></div>
              <AnalyticsTable
                columns={["Date","Raised By","Description","Status"]}
                rows={Array.from({ length: kpi.grievance.year }, (_, i) => [
                  fmtDate(new Date(2025, i % 12, (i % 28) + 1).toISOString()),
                  NAMES[i % NAMES.length],
                  ["Salary delay","Overtime dispute","Leave not approved","Workplace issue","Policy concern"][i % 5],
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    i % 3 === 0 ? "bg-emerald-500/20 text-emerald-400" : i % 3 === 1 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")}>
                    {["Resolved","Pending","Open"][i % 3]}
                  </span>,
                ])}
              />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Status Summary</span></div>
              <AnalyticsTable
                columns={["Status","Count","%"]}
                rows={[["Resolved",14,"61%"],["Pending",6,"26%"],["Open",3,"13%"]]}
              />
            </div>
          </div>
        </div>
      </Drawer>

      {/* ── Incident Drawer ──────────────────────────────── */}
      <Drawer open={drawerView === "incident"} onClose={() => setDrawerView(null)}
        title="Incident Details — Full Analysis" badge={kpi.incident.year}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <ChartCard title="Type Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{ name: "Positive", value: 26 },{ name: "Negative", value: 15 }]}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {["#10b981","#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Monthly Trend">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthlyData.map(m => ({ month: m.month, count: Math.floor(Math.random() * 6) + 1 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Points Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[{ range:"1-5", count:12 },{ range:"6-10", count:18 },{ range:"11-20", count:7 },{ range:"20+", count:4 }]} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Dept Positive/Negative">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={DEPARTMENTS.slice(0, 5).map(d => ({
                  dept: d.slice(0, 5), positive: Math.floor(Math.random() * 6) + 1, negative: Math.floor(Math.random() * 4),
                }))} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="dept" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="positive" fill="#10b981" radius={[2,2,0,0]} name="Positive" />
                  <Bar dataKey="negative" fill="#ef4444" radius={[2,2,0,0]} name="Negative" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Incident Details</span></div>
              <AnalyticsTable
                columns={["Date","Subject","Department","Type","Points","Raised By","Raised To"]}
                rows={Array.from({ length: kpi.incident.year }, (_, i) => [
                  fmtDate(new Date(2025, i % 12, (i % 28) + 1).toISOString()),
                  ["Performance","Attendance","Safety","Quality","Teamwork"][i % 5],
                  DEPARTMENTS[i % DEPARTMENTS.length],
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", i % 2 === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                    {i % 2 === 0 ? "Positive" : "Negative"}
                  </span>,
                  (Math.floor(Math.random() * 20) + 1).toString(),
                  NAMES[i % NAMES.length], NAMES[(i + 3) % NAMES.length],
                ])}
              />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]"><span className="text-xs font-bold text-slate-400">Employee Points Summary</span></div>
              <AnalyticsTable
                columns={["Employee","Positive","Negative","Total"]}
                rows={NAMES.slice(0, 10).map((n, i) => {
                  const pos = Math.floor(Math.random() * 30) + 5;
                  const neg = Math.floor(Math.random() * 15);
                  return [n, pos, neg, pos - neg];
                })}
              />
            </div>
          </div>
        </div>
      </Drawer>
    </Layout>
  );
}
