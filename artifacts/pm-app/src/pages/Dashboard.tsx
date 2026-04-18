import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2, RefreshCw, Briefcase, ArrowRight,
  Sparkles, BarChart3,
  CalendarDays, ClipboardList, ThumbsUp, ThumbsDown, Bell, ShieldAlert,
  Timer, FileCheck2, Cpu,
  MessageCircle, Headphones, LayoutGrid, Building2,
  CheckSquare, UserCheck, Wrench, HeartHandshake, Activity,
  GitPullRequest, TrendingUp,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_CONFIG: Record<string, { label: string; dot: string; barColor: string }> = {
  active:    { label: "Active",    dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",  dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",   dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed", dot: "#22c55e", barColor: "#22c55e" },
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cfg =
    s === "completed"   ? { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" } :
    s === "in progress" ? { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" } :
                          { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {status || "Pending"}
    </span>
  );
}

function DonutGauge({ pct, size = 96, stroke = 9, color = "#a855f7" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

function ScoreRow({ label, score, max, color, gradient }: { label: string; score?: number; max: number; color: string; gradient: string }) {
  const pct = score != null ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
        <span className="text-[11px] font-black tabular-nums" style={{ color }}>
          {score != null ? score : "--"}<span className="font-medium text-slate-300 text-[10px]">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: gradient }} />
      </div>
    </div>
  );
}

function InitialAvatar({ name }: { name?: string }) {
  const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const colors = ["#6366f1","#8b5cf6","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
  const hue = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
      style={{ background: `linear-gradient(135deg, ${hue}, ${hue}aa)` }}>
      {initials}
    </div>
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
    const qs = new URLSearchParams({ email: user.email }).toString();
    fetch(`${BASE_URL}/api/employee-dashboard?${qs}`)
      .then(r => r.json())
      .then(data => { setEmpData(data.error ? null : data); setEmpLoading(false); })
      .catch(() => setEmpLoading(false));
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
    (empData?.task_points ?? 0) + (empData?.incident_points ?? 0) +
    (empData?.technical_points ?? 0) + (empData?.behavioral_points ?? 0) +
    (empData?.reporting_points ?? 0)
  );
  const pendingApprovalTotal =
    (empData?.ot_request_count ?? 0) + (empData?.ot_prior_info_count ?? 0) +
    (empData?.on_duty_request_count ?? 0) + (empData?.technical_criteria_count ?? 0) +
    (empData?.behavioural_criteria_count ?? 0);

  const isLoading = projectsLoading || empLoading;
  const scorePct = Math.min(100, (overallPoints / 60) * 100);
  const positiveInc = empData?.positive_incidents ?? 0;
  const negativeInc = empData?.negative_incidents ?? 0;
  const totalInc = positiveInc + negativeInc || 1;

  return (
    <Layout>
      <div className="h-full overflow-y-auto" style={{ background: "#f1f5f9" }}>
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">

          {/* ── HERO ── */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0a2463 0%, #1a56db 55%, #1e40af 100%)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #60a5fa, transparent)", transform: "translate(30%, -30%)" }} />
            </div>
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-7">
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">{dateStr}</p>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{greeting}, {firstName}! 👋</h1>
                {empData?.today_first_checkin
                  ? <p className="text-emerald-300 text-sm mt-1.5 font-medium">✓ Checked in at {formatTime(empData.today_first_checkin)}</p>
                  : <p className="text-blue-300/70 text-sm mt-1.5">WTT International India · FlowMatriX</p>}
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                <div className="text-right">
                  <p className="text-4xl font-black text-white tabular-nums tracking-tight">{timeStr}</p>
                  <p className="text-blue-300 text-[11px] uppercase tracking-widest mt-0.5">{now.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                </div>
                <button onClick={refetchAll} disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
            </div>
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

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-5">

              {/* PERFORMANCE — Donut gauge + score bars */}
              <div className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)" }}>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Performance Score</p>
                      <p className="text-white text-lg font-black mt-0.5">Current Period</p>
                    </div>
                    <div className="relative flex items-center justify-center">
                      <DonutGauge pct={scorePct} size={80} stroke={8} color="#a78bfa" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {empLoading
                          ? <div className="w-8 h-5 bg-white/10 animate-pulse rounded" />
                          : <>
                              <p className="text-xl font-black text-white tabular-nums leading-none">{overallPoints}</p>
                              <p className="text-[9px] text-indigo-300 font-semibold">/60</p>
                            </>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { label: "Task",       score: empData?.task_points,       max: 25, color: "#60a5fa", gradient: "linear-gradient(90deg,#3b82f6,#60a5fa)" },
                      { label: "Incident",   score: empData?.incident_points,   max: 5,  color: "#34d399", gradient: "linear-gradient(90deg,#10b981,#34d399)" },
                      { label: "Technical",  score: empData?.technical_points,  max: 10, color: "#fbbf24", gradient: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
                      { label: "Behavioral", score: empData?.behavioral_points, max: 10, color: "#c084fc", gradient: "linear-gradient(90deg,#a855f7,#c084fc)" },
                      { label: "Reporting",  score: empData?.reporting_points,  max: 10, color: "#22d3ee", gradient: "linear-gradient(90deg,#06b6d4,#22d3ee)" },
                    ].map(s => (
                      <div key={s.label} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-indigo-200">{s.label}</span>
                          <span className="text-[11px] font-black tabular-nums" style={{ color: s.color }}>
                            {empLoading ? "…" : (s.score ?? "--")}<span className="text-indigo-400 font-normal">/{s.max}</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${s.score != null ? Math.min(100,(s.score/s.max)*100) : 0}%`, background: s.gradient }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendance strip inside performance card */}
                <div className="grid grid-cols-4 border-t border-white/10 mt-1">
                  {[
                    { label: "Present",  value: empData?.present_days_this_month, color: "#34d399" },
                    { label: "Half Day", value: empData?.half_day_count,           color: "#fbbf24" },
                    { label: "Absent",   value: empData?.absent_days_this_month,   color: "#f87171" },
                    { label: "Late",     value: empData?.checkin,                  color: "#fb923c" },
                  ].map((a, i) => (
                    <div key={a.label} className={`py-3 text-center ${i < 3 ? "border-r border-white/10" : ""}`}>
                      <p className="text-lg font-black tabular-nums" style={{ color: a.color }}>
                        {empLoading ? "…" : a.value ?? "0"}
                      </p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-indigo-300/60">{a.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* INCIDENTS — Bold split card */}
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0f172a" }}>
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-bold text-white">Incidents</p>
                  <span className="ml-auto text-[10px] text-slate-500 font-semibold">
                    {empLoading ? "" : `${positiveInc + negativeInc} total`}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  {/* Positive */}
                  <div className="relative overflow-hidden px-5 py-6 flex flex-col items-center"
                    style={{ background: "linear-gradient(135deg, #052e16, #14532d)" }}>
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: "radial-gradient(circle at 30% 30%, #22c55e, transparent)" }} />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-3 mx-auto">
                        <ThumbsUp className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-5xl font-black text-emerald-300 tabular-nums text-center leading-none">
                        {empLoading ? <span className="text-2xl text-emerald-600">…</span> : positiveInc}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-500 text-center mt-1.5 uppercase tracking-widest">Positive</p>
                      {!empLoading && (
                        <div className="mt-3 h-1 bg-emerald-900/50 rounded-full overflow-hidden w-16 mx-auto">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(positiveInc / totalInc) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Negative */}
                  <div className="relative overflow-hidden px-5 py-6 flex flex-col items-center"
                    style={{ background: "linear-gradient(135deg, #450a0a, #7f1d1d)" }}>
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: "radial-gradient(circle at 70% 30%, #ef4444, transparent)" }} />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center mb-3 mx-auto">
                        <ThumbsDown className="w-6 h-6 text-red-400" />
                      </div>
                      <p className="text-5xl font-black text-red-300 tabular-nums text-center leading-none">
                        {empLoading ? <span className="text-2xl text-red-800">…</span> : negativeInc}
                      </p>
                      <p className="text-[11px] font-bold text-red-500 text-center mt-1.5 uppercase tracking-widest">Negative</p>
                      {!empLoading && (
                        <div className="mt-3 h-1 bg-red-900/50 rounded-full overflow-hidden w-16 mx-auto">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${(negativeInc / totalInc) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CENTER COLUMN ── */}
            <div className="space-y-5">

              {/* Pending Tasks */}
              <div className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "linear-gradient(135deg, #0c4a6e, #0369a1, #0284c7)" }}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-sky-300 text-[10px] font-bold uppercase tracking-widest">Pending Tasks</p>
                      <p className="text-white text-lg font-black mt-0.5">Require Attention</p>
                    </div>
                    <Link href="/tasks"
                      className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-7xl font-black text-white tabular-nums leading-none">
                      {empLoading ? <span className="text-4xl text-sky-400/50">…</span> : empData?.pending_work_updates ?? "0"}
                    </p>
                    <div className="pb-1.5">
                      <p className="text-sky-200 text-sm font-semibold">tasks pending</p>
                      <p className="text-sky-400/60 text-[11px]">as of today</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PENDING APPROVALS — Colorful grid badges */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ background: "linear-gradient(90deg, #78350f, #92400e, #b45309)" }}>
                  <Bell className="w-4 h-4 text-amber-200" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Pending Approvals</p>
                    <p className="text-[10px] text-amber-300/70">Workflow items awaiting your action</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                    <span className="text-lg font-black text-white tabular-nums">
                      {empLoading ? "…" : pendingApprovalTotal}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "On Duty",              value: empData?.on_duty_request_count,      icon: UserCheck,      color: "#10b981", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#bbf7d0", text: "#065f46" },
                    { label: "Technical",            value: empData?.technical_criteria_count,   icon: Cpu,            color: "#f59e0b", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fde68a", text: "#78350f" },
                    { label: "Behavioural",          value: empData?.behavioural_criteria_count, icon: HeartHandshake, color: "#a855f7", bg: "linear-gradient(135deg,#faf5ff,#ede9fe)", border: "#ddd6fe", text: "#581c87" },
                    { label: "OT Request",           value: empData?.ot_request_count,           icon: Timer,          color: "#f97316", bg: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "#fed7aa", text: "#7c2d12" },
                    { label: "OT Prior Info",        value: empData?.ot_prior_info_count,        icon: Activity,       color: "#06b6d4", bg: "linear-gradient(135deg,#ecfeff,#cffafe)", border: "#a5f3fc", text: "#164e63" },
                    { label: "All Pending",          value: pendingApprovalTotal,                icon: FileCheck2,     color: "#6366f1", bg: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "#c7d2fe", text: "#312e81" },
                  ].map(({ label, value, icon: Icon, color, bg, border, text }) => (
                    <div key={label} className="rounded-xl p-3.5 border flex items-center gap-3"
                      style={{ background: bg, borderColor: border }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: color + "22", border: `1px solid ${color}44` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: text }}>{label}</p>
                        <p className="text-xl font-black tabular-nums leading-tight" style={{ color }}>
                          {empLoading ? "…" : value ?? "0"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Assistant */}
              <div className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a8a 100%)" }}>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/25 flex items-center justify-center border border-indigo-400/30">
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">AI Assistant</p>
                      <p className="text-[10px] text-indigo-300/80">Context-aware · Always ready</p>
                    </div>
                  </div>
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

            {/* ── RIGHT COLUMN: Projects ── */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Projects</p>
                      <p className="text-[10px] text-slate-400">{total} total</p>
                    </div>
                  </div>
                  <Link href="/projects" className="text-[11px] font-semibold text-sky-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
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
                      <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{projectsLoading ? "…" : s.value}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    <span>Average Progress</span>
                    <span className="text-sky-600">{avgProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${avgProgress}%`, background: "linear-gradient(90deg,#38bdf8,#3b82f6)" }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-sm font-bold text-slate-800">Top Projects</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sorted by progress</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {projectsLoading ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <Skeleton className="flex-1 h-3" />
                      <Skeleton className="w-20 h-2" />
                    </div>
                  )) : recentProjects.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm">No projects found</div>
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

          {/* ── RECENT WORK UPDATES — Timeline cards ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div>
                <p className="text-base font-black text-slate-800">Recent Work Updates</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Latest activity from your team</p>
              </div>
              <Link href="/tasks" className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: theme.accent, background: theme.accent + "12" }}>
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {empLoading ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-3/4" />
                  </div>
                ))}
              </div>
            ) : !empData?.work_updates?.length ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm font-medium">No recent work updates</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {empData.work_updates.slice(0, 6).map((t, i) => {
                  const from = formatDateTime(t.from_time);
                  const to   = formatDateTime(t.to_time);
                  const s = (t.status || "").toLowerCase();
                  const statusColor = s === "completed" ? "#22c55e" : s === "in progress" ? "#3b82f6" : "#f59e0b";
                  const statusBg    = s === "completed" ? "#f0fdf4" : s === "in progress" ? "#eff6ff" : "#fffbeb";
                  return (
                    <div key={i} className="group rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all p-4 bg-white cursor-default">
                      <div className="flex items-start gap-3 mb-3">
                        <InitialAvatar name={t.employee} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{t.employee || "—"}</p>
                          <p className="text-[10px] text-slate-400">{from.date} {from.time} → {to.date} {to.time}</p>
                        </div>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border"
                          style={{ color: statusColor, backgroundColor: statusBg, borderColor: statusColor + "44" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                          {t.status || "Pending"}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-slate-700 leading-snug line-clamp-2">
                        {t.type_of_work || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
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
