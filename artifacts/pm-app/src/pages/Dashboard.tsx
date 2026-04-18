import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FolderOpen, CheckCircle2, RefreshCw, Briefcase, ArrowRight,
  Sparkles, Clock, PauseCircle, UserCircle, BarChart3, Star,
  TrendingUp, AlertTriangle, Activity, Target, CalendarDays,
  ClipboardList, ThumbsUp, ThumbsDown, Bell, ShieldAlert,
  Timer, Users, FileCheck2, GitPullRequest, Cpu, HardHat,
  MessageCircle, Headphones, LayoutGrid, ChevronRight, Building2,
  CheckSquare, UserCheck, Wrench, HeartHandshake, ArrowUpRight,
  Zap, TrendingDown, Circle,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; dot: string; barColor: string }> = {
  active:    { label: "Active",    textColor: "text-blue-700",   badgeBg: "bg-blue-50 border-blue-200",     dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",  textColor: "text-amber-700",  badgeBg: "bg-amber-50 border-amber-200",   dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",   textColor: "text-orange-700", badgeBg: "bg-orange-50 border-orange-200", dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed", textColor: "text-green-700",  badgeBg: "bg-green-50 border-green-200",   dot: "#22c55e", barColor: "#22c55e" },
};

const QUICK_ACCESS: { label: string; icon: React.ElementType; path: string; color: string; bg: string; module: string }[] = [
  { label: "Activity Sheet",       icon: ClipboardList,  path: "/hrms",                color: "#3b82f6", bg: "#eff6ff", module: "hrms" },
  { label: "Say It Do It",         icon: CheckSquare,    path: "/tasks",               color: "#10b981", bg: "#f0fdf4", module: "tasks" },
  { label: "Leave Request",        icon: CalendarDays,   path: "/hrms/leave-request",  color: "#f59e0b", bg: "#fffbeb", module: "hrms-leave-request" },
  { label: "On Duty Request",      icon: UserCheck,      path: "/hrms/checkin",        color: "#06b6d4", bg: "#ecfeff", module: "hrms-checkin" },
  { label: "Incident",             icon: ShieldAlert,    path: "/hrms/incidents",      color: "#ef4444", bg: "#fef2f2", module: "hrms-incidents" },
  { label: "Grievance",            icon: MessageCircle,  path: "/hrms",                color: "#a855f7", bg: "#faf5ff", module: "hrms" },
  { label: "IT Support",           icon: Headphones,     path: "/hrms",                color: "#6366f1", bg: "#eef2ff", module: "hrms" },
  { label: "Vacancies",            icon: Building2,      path: "/hrms/recruitment",    color: "#78716c", bg: "#fafaf9", module: "hrms-recruitment" },
  { label: "Technical Criteria",   icon: Wrench,         path: "/hrms/performance",    color: "#0ea5e9", bg: "#f0f9ff", module: "hrms-performance" },
  { label: "Behavioural Criteria", icon: HeartHandshake, path: "/hrms/performance",    color: "#ec4899", bg: "#fdf2f8", module: "hrms-performance" },
  { label: "Task Allocation",      icon: GitPullRequest, path: "/task-management",     color: "#22c55e", bg: "#f0fdf4", module: "task-management" },
];

interface EmpDashData {
  user?: string;
  total_present_days?: number;
  today_first_checkin?: string;
  pending_work_updates?: number;
  present_days_this_month?: number;
  half_day_count?: number;
  absent_days_this_month?: number;
  checkin?: number;
  reminders?: { reminder: string; reminder_date: string; status: string }[];
  ot_request_count?: number;
  ot_prior_info_count?: number;
  on_duty_request_count?: number;
  technical_criteria_count?: number;
  behavioural_criteria_count?: number;
  positive_incidents?: number;
  negative_incidents?: number;
  work_updates?: { employee?: string; type_of_work?: string; from_time?: string; to_time?: string; status?: string }[];
  task_points?: number;
  incident_points?: number;
  technical_points?: number;
  behavioral_points?: number;
  reporting_points?: number;
  overall_points?: number;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

function formatTime(timeString?: string) {
  if (!timeString) return "--";
  try {
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  } catch { return timeString; }
}

function formatDateTime(isoStr?: string) {
  if (!isoStr) return { date: "--", time: "--" };
  try {
    const d = new Date(isoStr);
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch { return { date: "--", time: "--" }; }
}

function ScoreBar({ label, score, max, color }: { label: string; score?: number; max: number; color: string }) {
  const pct = score != null ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-10 text-right" style={{ color }}>
        {score != null ? score : "--"}<span className="font-normal text-slate-400">/{max}</span>
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cfg =
    s === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s === "in progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg}`}>
      {status || "Pending"}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const now = useNow();

  const [projects, setProjects] = useState<{ id: string; name: string; status: string; progress?: number }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [empData, setEmpData] = useState<EmpDashData | null>(null);
  const [empLoading, setEmpLoading] = useState(true);
  const [empError, setEmpError] = useState<string | null>(null);

  const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
  const [moduleRoles, setModuleRoles] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!user || isAdmin) { setModuleRoles(null); return; }
    fetch(`${BASE_URL}/api/user-permissions/${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setModuleRoles({}); return; }
        if (data.moduleRoles) {
          try {
            const parsed = JSON.parse(data.moduleRoles) as Record<string, string>;
            if (Object.keys(parsed).length > 0) { setModuleRoles(parsed); return; }
          } catch {}
        }
        if (data.modules) {
          try {
            const mods = JSON.parse(data.modules) as string[];
            const roles: Record<string, string> = {};
            mods.forEach(m => { roles[m] = "write"; });
            setModuleRoles(roles); return;
          } catch {}
        }
        setModuleRoles({});
      })
      .catch(() => setModuleRoles(null));
  }, [user?.email, isAdmin]);

  const visibleQuickAccess = useMemo(() => {
    if (isAdmin || moduleRoles === null) return QUICK_ACCESS;
    return QUICK_ACCESS.filter(item => {
      const role = moduleRoles[item.module];
      return role === "read" || role === "write";
    });
  }, [isAdmin, moduleRoles]);

  const fetchProjects = useCallback(() => {
    if (!user?.email) return;
    setProjectsLoading(true);
    fetch(`${BASE_URL}/api/projects${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setProjects(data); setProjectsLoading(false); })
      .catch(() => setProjectsLoading(false));
  }, [user?.email]);

  const fetchEmpData = useCallback(() => {
    if (!user?.email) return;
    setEmpLoading(true);
    setEmpError(null);
    const qs = new URLSearchParams({ email: user.email }).toString();
    fetch(`${BASE_URL}/api/employee-dashboard?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setEmpError(data.error); setEmpLoading(false); return; }
        setEmpData(data);
        setEmpLoading(false);
      })
      .catch(e => { setEmpError(e.message); setEmpLoading(false); });
  }, [user?.email]);

  useEffect(() => { fetchProjects(); fetchEmpData(); }, [fetchProjects, fetchEmpData]);

  const refetchAll = () => { fetchProjects(); fetchEmpData(); };

  const total     = projects.length;
  const active    = projects.filter(p => p.status === "active").length;
  const planning  = projects.filter(p => p.status === "planning").length;
  const onHold    = projects.filter(p => p.status === "on_hold").length;
  const completed = projects.filter(p => p.status === "completed").length;
  const avgProgress = total ? Math.round(projects.reduce((a, p) => a + (p.progress ?? 0), 0) / total) : 0;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const recentProjects = [...projects].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 5);

  const overallPoints = empData?.overall_points ?? (
    (empData?.task_points ?? 0) +
    (empData?.incident_points ?? 0) +
    (empData?.technical_points ?? 0) +
    (empData?.behavioral_points ?? 0) +
    (empData?.reporting_points ?? 0)
  );

  const pendingApprovalTotal =
    (empData?.ot_request_count ?? 0) +
    (empData?.ot_prior_info_count ?? 0) +
    (empData?.on_duty_request_count ?? 0) +
    (empData?.technical_criteria_count ?? 0) +
    (empData?.behavioural_criteria_count ?? 0);

  const isLoading = projectsLoading || empLoading;

  const scorePct = Math.min(100, (overallPoints / 60) * 100);

  return (
    <Layout>
      <div className="h-full overflow-y-auto" style={{ background: "#f8fafc" }}>
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">

          {/* ── HERO ── */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0a2463 0%, #1a56db 55%, #1e40af 100%)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #60a5fa, transparent)", transform: "translate(30%, -30%)" }} />
              <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-5"
                style={{ background: "radial-gradient(circle, #a5f3fc, transparent)", transform: "translateY(40%)" }} />
            </div>
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-7">
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">{dateStr}</p>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  {greeting}, {firstName}! 👋
                </h1>
                {empData?.today_first_checkin ? (
                  <p className="text-emerald-300 text-sm mt-1.5 font-medium">
                    ✓ Checked in at {formatTime(empData.today_first_checkin)}
                  </p>
                ) : (
                  <p className="text-blue-300/70 text-sm mt-1.5">WTT International India · FlowMatriX</p>
                )}
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                <div className="text-right">
                  <p className="text-4xl font-black text-white tabular-nums tracking-tight">{timeStr}</p>
                  <p className="text-blue-300 text-[11px] uppercase tracking-widest mt-0.5">{now.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                </div>
                <button onClick={refetchAll} disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all disabled:opacity-50 backdrop-blur-sm">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Hero KPI Strip */}
            <div className="relative grid grid-cols-2 sm:grid-cols-4 border-t border-white/10">
              {[
                { label: "Active Projects", value: projectsLoading ? "…" : active, sub: `of ${total} total`, color: "#60a5fa" },
                { label: "Avg Progress", value: projectsLoading ? "…" : `${avgProgress}%`, sub: "across all projects", color: "#34d399" },
                { label: "Pending Tasks", value: empLoading ? "…" : (empData?.pending_work_updates ?? "--"), sub: "require attention", color: "#fbbf24" },
                { label: "Performance", value: empLoading ? "…" : `${overallPoints}/60`, sub: "overall score", color: "#c084fc" },
              ].map((kpi, i) => (
                <div key={i} className={`px-5 py-4 ${i < 3 ? "border-r border-white/10" : ""}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: kpi.color + "cc" }}>{kpi.label}</p>
                  <p className="text-2xl font-black text-white tabular-nums mt-0.5">{kpi.value}</p>
                  <p className="text-[11px] text-blue-300/60 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAIN CONTENT GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* LEFT: Performance + Attendance */}
            <div className="space-y-4">

              {/* Performance Score */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Performance</p>
                      <p className="text-[10px] text-slate-400">Current period score</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {empLoading ? <Skeleton className="w-12 h-7" /> : (
                      <>
                        <p className="text-2xl font-black text-purple-600 tabular-nums leading-none">{overallPoints}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">/ 60 pts</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4">
                  {/* Score ring visual */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      <span>Overall Progress</span>
                      <span className="text-purple-600">{Math.round(scorePct)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${scorePct}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }} />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <ScoreBar label="Task"       score={empData?.task_points}       max={25} color="#3b82f6" />
                    <ScoreBar label="Incident"   score={empData?.incident_points}   max={5}  color="#22c55e" />
                    <ScoreBar label="Technical"  score={empData?.technical_points}  max={10} color="#f59e0b" />
                    <ScoreBar label="Behavioral" score={empData?.behavioral_points} max={10} color="#a855f7" />
                    <ScoreBar label="Reporting"  score={empData?.reporting_points}  max={10} color="#06b6d4" />
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Attendance</p>
                      <p className="text-[10px] text-slate-400">This month</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Present",  value: empData?.present_days_this_month, color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
                    { label: "Half Day", value: empData?.half_day_count,           color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                    { label: "Absent",   value: empData?.absent_days_this_month,   color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
                    { label: "Late",     value: empData?.checkin,                  color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className="rounded-xl p-3 border text-center" style={{ backgroundColor: bg, borderColor: border }}>
                      <p className="text-2xl font-black tabular-nums" style={{ color }}>
                        {empLoading ? "…" : value ?? "0"}
                      </p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: color + "aa" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incidents */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Incidents</p>
                    <p className="text-[10px] text-slate-400">Positive vs Negative</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100 text-center">
                    <ThumbsUp className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-emerald-600 tabular-nums">
                      {empLoading ? "…" : empData?.positive_incidents ?? "0"}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">Positive</p>
                  </div>
                  <div className="rounded-xl p-4 bg-red-50 border border-red-100 text-center">
                    <ThumbsDown className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-red-500 tabular-nums">
                      {empLoading ? "…" : empData?.negative_incidents ?? "0"}
                    </p>
                    <p className="text-[10px] font-semibold text-red-400 mt-0.5">Negative</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER: Tasks + AI */}
            <div className="space-y-4">

              {/* Pending Tasks highlight */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Pending Tasks</p>
                        <p className="text-[10px] text-slate-400">Require your attention</p>
                      </div>
                    </div>
                  </div>
                  <Link href="/tasks" className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <p className="text-6xl font-black text-blue-600 tabular-nums leading-none">
                    {empLoading ? <span className="text-3xl text-slate-300">…</span> : empData?.pending_work_updates ?? "--"}
                  </p>
                  <div className="pb-1">
                    <p className="text-sm text-slate-500 font-medium">tasks pending</p>
                    <p className="text-[11px] text-slate-400">as of today</p>
                  </div>
                </div>
              </div>

              {/* Workflow & Approvals */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Pending Approvals</p>
                    <p className="text-[10px] text-slate-400">Workflow items awaiting action</p>
                  </div>
                  <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {empLoading ? "…" : pendingApprovalTotal}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { label: "On Duty",              value: empData?.on_duty_request_count,     icon: UserCheck,      color: "#10b981" },
                    { label: "Technical Criteria",   value: empData?.technical_criteria_count,  icon: Cpu,            color: "#f59e0b" },
                    { label: "Behavioural Criteria", value: empData?.behavioural_criteria_count,icon: HeartHandshake, color: "#a855f7" },
                    { label: "OT Request",           value: empData?.ot_request_count,          icon: Timer,          color: "#f97316" },
                    { label: "OT Prior Info",        value: empData?.ot_prior_info_count,       icon: Activity,       color: "#06b6d4" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="text-sm text-slate-600 flex-1">{label}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: (value ?? 0) > 0 ? color : "#94a3b8" }}>
                        {empLoading ? "…" : value ?? "0"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Assistant */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a8a 100%)" }}>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/25 flex items-center justify-center border border-indigo-400/30">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">AI Assistant</p>
                      <p className="text-[10px] text-indigo-300/80">Context-aware · Always ready</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-300/70 mb-3 leading-relaxed">Ask about projects, HR, procurement, drawings, and more.</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Project status?", "Pending tasks?", "Leave balance?", "Team today?"].map(q => (
                      <span key={q} className="text-[10px] px-2.5 py-1 rounded-lg border border-indigo-400/25 text-indigo-300 bg-indigo-500/10">{q}</span>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 transition-colors"
                    onClick={() => (document.querySelector("[data-ai-trigger]") as HTMLElement)?.click()}>
                    <Sparkles className="w-3.5 h-3.5" /> Ask AI
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Projects */}
            <div className="space-y-4">

              {/* Project Status Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Projects</p>
                      <p className="text-[10px] text-slate-400">{total} total across all statuses</p>
                    </div>
                  </div>
                  <Link href="/projects" className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-0 border-b border-slate-50">
                  {[
                    { label: "Active",    value: active,    color: "#3b82f6", bg: "#eff6ff" },
                    { label: "Planning",  value: planning,  color: "#f59e0b", bg: "#fffbeb" },
                    { label: "On Hold",   value: onHold,    color: "#f97316", bg: "#fff7ed" },
                    { label: "Completed", value: completed, color: "#22c55e", bg: "#f0fdf4" },
                  ].map((s, i) => (
                    <div key={s.label} className={`py-4 text-center ${i % 2 === 0 ? "border-r border-slate-50" : ""} ${i < 2 ? "border-b border-slate-50" : ""}`}>
                      <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>
                        {projectsLoading ? "…" : s.value}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Avg progress bar */}
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    <span>Average Progress</span>
                    <span className="text-sky-600">{avgProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${avgProgress}%`, background: "linear-gradient(90deg, #38bdf8, #3b82f6)" }} />
                  </div>
                </div>
              </div>

              {/* Recent Projects list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-sm font-bold text-slate-800">Top Projects</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sorted by progress</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {projectsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <Skeleton className="w-32 h-3.5 flex-1" />
                        <Skeleton className="w-20 h-2" />
                        <Skeleton className="w-8 h-3" />
                      </div>
                    ))
                  ) : recentProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Briefcase className="w-8 h-8 text-slate-200" />
                      <p className="text-xs text-slate-400">No projects found</p>
                    </div>
                  ) : recentProjects.map(project => {
                    const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
                    const pct = Math.min(100, Math.max(0, project.progress ?? 0));
                    return (
                      <div key={project.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                        <p className="text-sm font-medium text-slate-700 flex-1 truncate">{project.name}</p>
                        <div className="flex items-center gap-2 shrink-0 w-28">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: cfg.barColor }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── RECENT TASKS TABLE ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: theme.accent + "18" }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Recent Work Updates</p>
                  <p className="text-[10px] text-slate-400">Latest activity from your team</p>
                </div>
              </div>
              <Link href="/tasks" className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: theme.accent, background: theme.accent + "12" }}>
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-5 py-3.5">
                            <Skeleton className={`h-3.5 ${j === 1 ? "w-40" : "w-24"}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !empData?.work_updates?.length ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No recent tasks found</td></tr>
                  ) : empData.work_updates.slice(0, 6).map((t, i) => {
                    const from = formatDateTime(t.from_time);
                    const to   = formatDateTime(t.to_time);
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5 text-sm text-slate-500">{t.employee || "—"}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{t.type_of_work || "—"}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap font-mono">{from.date} {from.time}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap font-mono">{to.date} {to.time}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── QUICK ACCESS ── */}
          {visibleQuickAccess.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: theme.accent + "18" }}>
                  <LayoutGrid className="w-4 h-4" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Quick Access</p>
                  <p className="text-[10px] text-slate-400">Jump to frequently used modules</p>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
                {visibleQuickAccess.map(({ label, icon: Icon, path, color, bg }) => (
                  <Link key={path + label} href={path}>
                    <div className="group flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-center border border-transparent hover:border-slate-100">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm border border-white"
                        style={{ backgroundColor: bg }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-700 leading-tight">{label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
