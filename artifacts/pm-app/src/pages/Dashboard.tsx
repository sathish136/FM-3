import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2, RefreshCw, Briefcase, ArrowRight,
  Sparkles, CalendarDays, ClipboardList, Bell,
  Timer, FileCheck2, Cpu,
  MessageCircle, Headphones, LayoutGrid, Building2,
  CheckSquare, UserCheck, Wrench, HeartHandshake, Activity,
  GitPullRequest,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  active:    { label: "Active",    dot: "#334155" },
  planning:  { label: "Planning",  dot: "#64748b" },
  on_hold:   { label: "On Hold",   dot: "#94a3b8" },
  completed: { label: "Completed", dot: "#1e293b" },
};

const QUICK_ACCESS: { label: string; icon: React.ElementType; path: string; module: string }[] = [
  { label: "Activity Sheet",       icon: ClipboardList,  path: "/hrms",                module: "hrms" },
  { label: "Say It Do It",         icon: CheckSquare,    path: "/tasks",               module: "tasks" },
  { label: "Leave Request",        icon: CalendarDays,   path: "/hrms/leave-request",  module: "hrms-leave-request" },
  { label: "On Duty Request",      icon: UserCheck,      path: "/hrms/checkin",        module: "hrms-checkin" },
  { label: "Incident",             icon: Bell,           path: "/hrms/incidents",      module: "hrms-incidents" },
  { label: "Grievance",            icon: MessageCircle,  path: "/hrms",                module: "hrms" },
  { label: "IT Support",           icon: Headphones,     path: "/hrms",                module: "hrms" },
  { label: "Vacancies",            icon: Building2,      path: "/hrms/recruitment",    module: "hrms-recruitment" },
  { label: "Technical Criteria",   icon: Wrench,         path: "/hrms/performance",    module: "hrms-performance" },
  { label: "Behavioural Criteria", icon: HeartHandshake, path: "/hrms/performance",    module: "hrms-performance" },
  { label: "Task Allocation",      icon: GitPullRequest, path: "/task-management",     module: "task-management" },
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
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cfg =
    s === "completed"   ? { bg: "#f8fafc", color: "#1e293b", border: "#e2e8f0" } :
    s === "in progress" ? { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" } :
                          { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {status || "Pending"}
    </span>
  );
}

function InitialAvatar({ name }: { name?: string }) {
  const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[11px] font-bold shrink-0">
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
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

  const pendingApprovalTotal =
    (empData?.ot_request_count ?? 0) + (empData?.ot_prior_info_count ?? 0) +
    (empData?.on_duty_request_count ?? 0) + (empData?.technical_criteria_count ?? 0) +
    (empData?.behavioural_criteria_count ?? 0);

  const isLoading = projectsLoading || empLoading;

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">

          {/* ── HEADER ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">{dateStr}</p>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">{greeting}, {firstName}</h1>
                {empData?.today_first_checkin
                  ? <p className="text-sm text-slate-500 mt-1">Checked in at {formatTime(empData.today_first_checkin)}</p>
                  : <p className="text-sm text-slate-400 mt-1">WTT International India · FlowMatriX</p>}
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-800 tabular-nums">{timeStr}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{now.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                </div>
                <button onClick={refetchAll} disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all disabled:opacity-50 border border-slate-200">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 border-t border-slate-100">
              {[
                { label: "Active Projects",  value: projectsLoading ? "…" : active,             sub: `of ${total} total` },
                { label: "Average Progress", value: projectsLoading ? "…" : `${avgProgress}%`,  sub: "across all projects" },
                { label: "Pending Tasks",    value: empLoading ? "…" : (empData?.pending_work_updates ?? "--"), sub: "require attention" },
              ].map((kpi, i) => (
                <div key={i} className={`px-6 py-4 ${i < 2 ? "border-r border-slate-100" : ""}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-800 tabular-nums mt-0.5">{kpi.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAIN CONTENT GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-5">

              {/* Pending Tasks */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pending Tasks</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">Require Attention</p>
                  </div>
                  <Link href="/tasks"
                    className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex items-end gap-3">
                  <p className="text-6xl font-bold text-slate-800 tabular-nums leading-none">
                    {empLoading ? <span className="text-3xl text-slate-300">…</span> : empData?.pending_work_updates ?? "0"}
                  </p>
                  <div className="pb-1">
                    <p className="text-slate-600 text-sm font-medium">tasks pending</p>
                    <p className="text-slate-400 text-[11px]">as of today</p>
                  </div>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Sparkles className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">AI Assistant</p>
                    <p className="text-[10px] text-slate-400">Context-aware · Always ready</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {["Project status?", "Pending tasks?", "Leave balance?", "Team today?"].map(q => (
                    <span key={q} className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 bg-slate-50">{q}</span>
                  ))}
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
                  onClick={() => (document.querySelector("[data-ai-trigger]") as HTMLElement)?.click()}>
                  <Sparkles className="w-3.5 h-3.5" /> Ask AI
                </button>
              </div>
            </div>

            {/* ── CENTER COLUMN: Pending Approvals ── */}
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Bell className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">Pending Approvals</p>
                    <p className="text-[10px] text-slate-400">Workflow items awaiting your action</p>
                  </div>
                  <div className="text-xl font-bold text-slate-800 tabular-nums">
                    {empLoading ? "…" : pendingApprovalTotal}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "On Duty",         value: empData?.on_duty_request_count,      icon: UserCheck      },
                    { label: "Technical",        value: empData?.technical_criteria_count,   icon: Cpu            },
                    { label: "Behavioural",      value: empData?.behavioural_criteria_count, icon: HeartHandshake },
                    { label: "OT Request",       value: empData?.ot_request_count,           icon: Timer          },
                    { label: "OT Prior Info",    value: empData?.ot_prior_info_count,        icon: Activity       },
                    { label: "All Pending",      value: pendingApprovalTotal,                icon: FileCheck2     },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 flex items-center gap-3 hover:border-slate-200 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-500 truncate">{label}</p>
                        <p className="text-xl font-bold text-slate-800 tabular-nums leading-tight">
                          {empLoading ? "…" : value ?? "0"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Projects ── */}
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Briefcase className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Projects</p>
                      <p className="text-[10px] text-slate-400">{total} total</p>
                    </div>
                  </div>
                  <Link href="/projects" className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-0 border-b border-slate-100">
                  {[
                    { label: "Active",    value: active    },
                    { label: "Planning",  value: planning  },
                    { label: "On Hold",   value: onHold    },
                    { label: "Completed", value: completed },
                  ].map((s, i) => (
                    <div key={s.label} className={`py-4 text-center ${i % 2 === 0 ? "border-r border-slate-100" : ""} ${i < 2 ? "border-b border-slate-100" : ""}`}>
                      <p className="text-2xl font-bold text-slate-800 tabular-nums">{projectsLoading ? "…" : s.value}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3.5">
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    <span>Average Progress</span>
                    <span className="text-slate-600 font-semibold">{avgProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-slate-600"
                      style={{ width: `${avgProgress}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
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
                      <div key={project.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0 bg-slate-300" />
                        <p className="text-sm font-medium text-slate-700 flex-1 truncate">{project.name}</p>
                        <div className="flex items-center gap-2 shrink-0 w-28">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-slate-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-semibold tabular-nums text-slate-500">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── RECENT WORK UPDATES ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-800">Recent Work Updates</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Latest activity from your team</p>
              </div>
              <Link href="/tasks" className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {empLoading ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-4 space-y-2">
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
                  return (
                    <div key={i} className="rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all p-4 bg-white cursor-default">
                      <div className="flex items-start gap-3 mb-3">
                        <InitialAvatar name={t.employee} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{t.employee || "—"}</p>
                          <p className="text-[10px] text-slate-400">{from.date} {from.time} → {to.date} {to.time}</p>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-[13px] font-medium text-slate-600 leading-snug line-clamp-2">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Quick Access</p>
                  <p className="text-[10px] text-slate-400">Jump to frequently used modules</p>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
                {visibleQuickAccess.map(({ label, icon: Icon, path }) => (
                  <Link key={path + label} href={path}>
                    <div className="group flex flex-col items-center gap-2 py-3.5 px-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer text-center border border-transparent hover:border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 group-hover:text-slate-700 leading-tight">{label}</p>
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
