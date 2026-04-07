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
  CheckSquare, UserCheck, Wrench, HeartHandshake,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; dot: string; barColor: string }> = {
  active:    { label: "Active",    textColor: "text-blue-700",   badgeBg: "bg-blue-50 border-blue-200",     dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",  textColor: "text-amber-700",  badgeBg: "bg-amber-50 border-amber-200",   dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",   textColor: "text-orange-700", badgeBg: "bg-orange-50 border-orange-200", dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed", textColor: "text-green-700",  badgeBg: "bg-green-50 border-green-200",   dot: "#22c55e", barColor: "#22c55e" },
};

const QUICK_ACCESS: { label: string; icon: React.ElementType; path: string; color: string; module: string }[] = [
  { label: "Activity Sheet",       icon: ClipboardList,  path: "/hrms",                color: "#3b82f6", module: "hrms" },
  { label: "Say It Do It",         icon: CheckSquare,    path: "/tasks",               color: "#10b981", module: "tasks" },
  { label: "Leave Request",        icon: CalendarDays,   path: "/hrms/leave-request",  color: "#f59e0b", module: "hrms-leave-request" },
  { label: "On Duty Request",      icon: UserCheck,      path: "/hrms/checkin",        color: "#06b6d4", module: "hrms-checkin" },
  { label: "Incident",             icon: ShieldAlert,    path: "/hrms/incidents",      color: "#ef4444", module: "hrms-incidents" },
  { label: "Grievance",            icon: MessageCircle,  path: "/hrms",                color: "#a855f7", module: "hrms" },
  { label: "IT Support",           icon: Headphones,     path: "/hrms",                color: "#6366f1", module: "hrms" },
  { label: "Vacancies",            icon: Building2,      path: "/hrms/recruitment",    color: "#78716c", module: "hrms-recruitment" },
  { label: "Technical Criteria",   icon: Wrench,         path: "/hrms/performance",    color: "#0ea5e9", module: "hrms-performance" },
  { label: "Behavioural Criteria", icon: HeartHandshake, path: "/hrms/performance",    color: "#ec4899", module: "hrms-performance" },
  { label: "Task Allocation",      icon: GitPullRequest, path: "/task-management",     color: "#22c55e", module: "task-management" },
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-12 text-right" style={{ color }}>
        {score != null ? score : "--"}/{max}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cfg =
    s === "completed" ? "bg-green-50 text-green-700 border-green-200" :
    s === "in progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
    "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg}`}>
      {status || "Pending"}
    </span>
  );
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

  // Module permissions (same logic as Layout sidebar)
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
    setEmpLoading(true);
    setEmpError(null);
    fetch(`${BASE_URL}/api/employee-dashboard`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setEmpError(data.error); setEmpLoading(false); return; }
        setEmpData(data);
        setEmpLoading(false);
      })
      .catch(e => { setEmpError(e.message); setEmpLoading(false); });
  }, []);

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
  const firstName = user?.full_name ?? "there";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const recentProjects = [...projects].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 4);

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

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-background">
        <div className="p-4 md:p-6 space-y-4">

          {/* ── Hero Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-border"
              style={{ background: `linear-gradient(135deg, ${theme.accent}12 0%, ${theme.accent}05 60%, transparent 100%)` }}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-[0.04]"
                  style={{ background: `radial-gradient(circle, ${theme.accent}, transparent)` }} />
              </div>
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 md:p-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">FlowMatriX · WTT International India</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                    {greeting}, {firstName}!
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
                  {empData?.today_first_checkin && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      ✓ Checked in at {formatTime(empData.today_first_checkin)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-black text-foreground tabular-nums">{timeStr}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{now.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                  </div>
                  <button onClick={refetchAll} disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shadow-sm disabled:opacity-60">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="rounded-2xl overflow-hidden border border-primary/20 flex flex-col"
              style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}>
              <div className="p-5 flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">AI Assistant</p>
                    <p className="text-[10px] text-indigo-300">Context-aware · Always ready</p>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-200/70 mb-3">Ask about projects, HR, procurement, drawings, and more.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Project status?", "Pending tasks?", "Leave balance?", "Team today?"].map(q => (
                    <span key={q} className="text-[10px] px-2 py-0.5 rounded-lg border border-indigo-400/30 text-indigo-300 bg-indigo-500/10">{q}</span>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 transition-colors"
                  onClick={() => (document.querySelector("[data-ai-trigger]") as HTMLElement)?.click()}>
                  <Sparkles className="w-3.5 h-3.5" /> Ask AI
                </button>
              </div>
            </div>
          </div>

          {/* ── Employee Performance Overview ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Performance Score card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Performance Overview</h3>
              </div>

              {/* Overall */}
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider">Overall Points</p>
                    <p className="text-3xl font-black text-purple-700 dark:text-purple-300 tabular-nums">
                      {empLoading ? <span className="text-lg text-muted-foreground">…</span> : overallPoints}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-purple-400">/60</p>
                </div>
                <div className="mt-2 h-2 bg-purple-100 dark:bg-purple-900/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, (overallPoints / 60) * 100)}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <ScoreBar label="Task" score={empData?.task_points} max={25} color="#3b82f6" />
                <ScoreBar label="Incident" score={empData?.incident_points} max={5} color="#22c55e" />
                <ScoreBar label="Technical" score={empData?.technical_points} max={10} color="#f59e0b" />
                <ScoreBar label="Behavioral" score={empData?.behavioral_points} max={10} color="#a855f7" />
                <ScoreBar label="Reporting" score={empData?.reporting_points} max={10} color="#06b6d4" />
              </div>
            </div>

            {/* Attendance + Task Pending + Incidents */}
            <div className="flex flex-col gap-3">

              {/* Attendance */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Attendance</h3>
                  <span className="ml-auto text-[10px] text-muted-foreground">This Month</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Present",  value: empData?.present_days_this_month, color: "#22c55e", icon: "✅" },
                    { label: "Half Day", value: empData?.half_day_count,           color: "#f59e0b", icon: "🌓" },
                    { label: "Absent",   value: empData?.absent_days_this_month,   color: "#ef4444", icon: "🔴" },
                    { label: "Late",     value: empData?.checkin,                  color: "#f97316", icon: "⏰" },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="text-center p-2 rounded-xl bg-muted/50">
                      <p className="text-base">{icon}</p>
                      <p className="text-lg font-black tabular-nums" style={{ color }}>
                        {empLoading ? "…" : value ?? "--"}
                      </p>
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Pending */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Task Pending</h3>
                  </div>
                  <Link href="/tasks" className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-4xl font-black text-blue-600 tabular-nums">
                  {empLoading ? "…" : empData?.pending_work_updates ?? "--"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Click to view all pending →</p>
              </div>

              {/* Incidents */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Incidents</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-lg font-black text-green-700 dark:text-green-300 tabular-nums">
                        {empLoading ? "…" : empData?.positive_incidents ?? "--"}
                      </p>
                      <p className="text-[9px] font-semibold text-green-600 uppercase">Positive</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-lg font-black text-red-700 dark:text-red-300 tabular-nums">
                        {empLoading ? "…" : empData?.negative_incidents ?? "--"}
                      </p>
                      <p className="text-[9px] font-semibold text-red-600 uppercase">Negative</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow & Reminders */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Workflow & Reminders</h3>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Pending Approval", value: pendingApprovalTotal, icon: FileCheck2, color: "#6366f1" },
                  { label: "On Duty",          value: empData?.on_duty_request_count, icon: UserCheck, color: "#10b981" },
                  { label: "Technical",        value: empData?.technical_criteria_count, icon: Cpu, color: "#f59e0b" },
                  { label: "Behavioural Criteria", value: empData?.behavioural_criteria_count, icon: HeartHandshake, color: "#a855f7" },
                  { label: "OT Request",       value: empData?.ot_request_count, icon: Timer, color: "#f97316" },
                  { label: "OT Prior Info",    value: empData?.ot_prior_info_count, icon: Activity, color: "#06b6d4" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-xs text-foreground flex-1">{label}</span>
                    <span className="text-sm font-black tabular-nums" style={{ color }}>
                      {empLoading ? "…" : value ?? "--"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Important Reminders ── */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">Important Reminders</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Reminder</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {empLoading ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Loading reminders…</td></tr>
                  ) : !empData?.reminders?.length ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No reminders</td></tr>
                  ) : empData.reminders.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-foreground">{r.reminder}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reminder_date}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Recent Tasks + Projects Overview side by side ── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Recent Tasks */}
            <div className="xl:col-span-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" style={{ color: theme.accent }} />
                  <h3 className="text-sm font-bold text-foreground">Recent Tasks</h3>
                </div>
                <Link href="/tasks" className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ color: theme.accent, background: theme.accent + "12" }}>
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Task</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">From</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">To</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {empLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-3 bg-muted animate-pulse rounded w-20" /></td>
                          ))}
                        </tr>
                      ))
                    ) : !empData?.work_updates?.length ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No recent tasks</td></tr>
                    ) : empData.work_updates.slice(0, 6).map((t, i) => {
                      const from = formatDateTime(t.from_time);
                      const to   = formatDateTime(t.to_time);
                      return (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{t.employee || "—"}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{t.type_of_work || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{from.date} {from.time}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{to.date} {to.time}</td>
                          <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Projects Overview — compact */}
            <div className="xl:col-span-2 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Projects Overview</h3>
                <Link href="/projects" className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
                  style={{ color: theme.accent, background: theme.accent + "12" }}>
                  All <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Compact stats */}
              <div className="grid grid-cols-3 gap-0 border-b border-border">
                {[
                  { label: "Active",    value: active,    color: "#3b82f6" },
                  { label: "Planning",  value: planning,  color: "#f59e0b" },
                  { label: "On Hold",   value: onHold,    color: "#f97316" },
                  { label: "Done",      value: completed, color: "#22c55e" },
                  { label: "Total",     value: total,     color: "#6366f1" },
                  { label: "Avg %",     value: `${avgProgress}%`, color: "#06b6d4" },
                ].map(c => (
                  <div key={c.label} className="text-center py-2.5 border-b border-r border-border/50 last:border-r-0">
                    <p className="text-base font-black tabular-nums" style={{ color: c.color }}>
                      {projectsLoading ? "…" : c.value}
                    </p>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Project list */}
              <div className="flex-1 overflow-auto divide-y divide-border/50">
                {projectsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="h-2.5 w-24 bg-muted animate-pulse rounded flex-1" />
                      <div className="h-1.5 w-16 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))
                ) : recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Briefcase className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">No projects</p>
                  </div>
                ) : recentProjects.map(project => {
                  const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
                  const pct = Math.min(100, Math.max(0, project.progress ?? 0));
                  return (
                    <div key={project.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <p className="text-xs font-medium text-foreground flex-1 truncate">{project.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0 w-24">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-6 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Quick Access ── */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4" style={{ color: theme.accent }} />
              <h3 className="text-sm font-bold text-foreground">Quick Access</h3>
            </div>
            {visibleQuickAccess.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No quick access items available for your account.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
                {visibleQuickAccess.map(({ label, icon: Icon, path, color }) => (
                  <Link key={path + label} href={path}>
                    <div className="group flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/60 transition-all cursor-pointer text-center">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color + "18" }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <p className="text-[10px] font-semibold text-foreground/80 group-hover:text-foreground leading-tight">{label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
