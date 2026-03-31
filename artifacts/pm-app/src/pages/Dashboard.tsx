import { useListProjects, useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import {
  FolderOpen, CheckCircle2, RefreshCw,
  LayoutGrid, FileText, ShoppingCart, Users, MessageSquare,
  Briefcase, ArrowRight, Sparkles, Clock, PauseCircle,
  UserCircle, BarChart3, Zap, Bot, Target, Megaphone,
  Receipt, Wifi, Activity, GanttChartSquare, Mail, Warehouse,
  ShoppingBag, PenLine, AlertTriangle, TrendingUp, Star, MonitorPlay, CalendarDays,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const STATUS_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; dot: string; barColor: string }> = {
  active:    { label: "Active",     textColor: "text-blue-700",   badgeBg: "bg-blue-50 border-blue-200",     dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",   textColor: "text-amber-700",  badgeBg: "bg-amber-50 border-amber-200",   dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",    textColor: "text-orange-700", badgeBg: "bg-orange-50 border-orange-200", dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed",  textColor: "text-green-700",  badgeBg: "bg-green-50 border-green-200",   dot: "#22c55e", barColor: "#22c55e" },
};

const QUICK_LAUNCH = [
  { label: "Project Board", icon: LayoutGrid,        path: "/project-board",    color: "#6366f1", desc: "Kanban" },
  { label: "Projects",      icon: Briefcase,          path: "/projects",         color: "#3b82f6", desc: "All projects" },
  { label: "Meetings",      icon: FileText,            path: "/meeting-minutes",  color: "#14b8a6", desc: "Minutes" },
  { label: "Material Req.", icon: ShoppingCart,        path: "/material-request", color: "#f59e0b", desc: "Procurement" },
  { label: "FlowTalk",      icon: MessageSquare,       path: "/chat",             color: "#a855f7", desc: "Team chat" },
  { label: "Smart Inbox",   icon: Bot,                 path: "/smart-inbox",      color: "#f97316", desc: "AI Email" },
  { label: "HRMS",          icon: UserCircle,          path: "/hrms",             color: "#22c55e", desc: "HR & Staff" },
  { label: "Leads",         icon: Target,              path: "/leads",            color: "#ec4899", desc: "CRM" },
  { label: "Campaigns",     icon: Megaphone,           path: "/campaigns",        color: "#8b5cf6", desc: "Marketing" },
  { label: "Purchase",      icon: ShoppingBag,         path: "/purchase-order",   color: "#f59e0b", desc: "Orders" },
  { label: "Timeline",      icon: GanttChartSquare,    path: "/project-timeline", color: "#06b6d4", desc: "Gantt" },
  { label: "Bills",         icon: Receipt,             path: "/payment-tracker",  color: "#6366f1", desc: "Recharge" },
  { label: "Email",         icon: Mail,                path: "/email",            color: "#0ea5e9", desc: "Inbox" },
  { label: "Site Data",     icon: Activity,            path: "/site-data",        color: "#10b981", desc: "Monitoring" },
  { label: "Stores",        icon: Warehouse,           path: "/stores-dashboard", color: "#78716c", desc: "Inventory" },
  { label: "Design 2D",     icon: PenLine,             path: "/design-2d",        color: "#10b981", desc: "CAD" },
  { label: "CCTV",          icon: MonitorPlay,         path: "/cctv",             color: "#0ea5e9", desc: "Live View" },
  { label: "Calendar",      icon: CalendarDays,         path: "/calendar",         color: "#3b82f6", desc: "Meetings" },
];

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

function MiniSparkbar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {values.map((v, i) => (
        <div key={i} className="w-1 rounded-t-[1px] transition-all" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: i === values.length - 1 ? 1 : 0.35 + (i / values.length) * 0.65 }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading, refetch } = useListProjects();
  const { data: _summary, isLoading: summaryLoading } = useGetAnalyticsSummary();
  const { user } = useAuth();
  const { theme } = useTheme();
  const now = useNow();
  const isLoading = projectsLoading || summaryLoading;

  const total     = projects?.length ?? 0;
  const active    = projects?.filter(p => p.status === "active").length ?? 0;
  const planning  = projects?.filter(p => p.status === "planning").length ?? 0;
  const onHold    = projects?.filter(p => p.status === "on_hold").length ?? 0;
  const completed = projects?.filter(p => p.status === "completed").length ?? 0;
  const avgProgress = total ? Math.round((projects ?? []).reduce((a, p) => a + (p.progress ?? 0), 0) / total) : 0;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.full_name ?? "there";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const recentProjects = [...(projects ?? [])].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 5);
  const urgentProjects = (projects ?? []).filter(p => p.status === "on_hold" || p.status === "planning").slice(0, 3);

  const progressDistribution = [
    { label: "0–25%",   count: (projects ?? []).filter(p => (p.progress ?? 0) < 25).length,             color: "#f97316" },
    { label: "25–50%",  count: (projects ?? []).filter(p => (p.progress ?? 0) >= 25 && (p.progress ?? 0) < 50).length, color: "#f59e0b" },
    { label: "50–75%",  count: (projects ?? []).filter(p => (p.progress ?? 0) >= 50 && (p.progress ?? 0) < 75).length, color: "#3b82f6" },
    { label: "75–100%", count: (projects ?? []).filter(p => (p.progress ?? 0) >= 75).length,              color: "#22c55e" },
  ];

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-background">
        <div className="p-4 md:p-6 space-y-4 max-w-screen-2xl mx-auto">

          {/* ── Hero Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Welcome + time card */}
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-border"
              style={{ background: `linear-gradient(135deg, ${theme.accent}12 0%, ${theme.accent}05 60%, transparent 100%)` }}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-[0.04]"
                  style={{ background: `radial-gradient(circle, ${theme.accent}, transparent)` }} />
                <div className="absolute -left-8 -bottom-8 w-48 h-48 rounded-full opacity-[0.03]"
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
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-black text-foreground tabular-nums">{timeStr}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{now.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                  </div>
                  <button onClick={() => refetch()} disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors shadow-sm disabled:opacity-60">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Assistant card */}
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
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["Project status?", "Pending POs?", "Due invoices?", "Team today?"].map(q => (
                    <span key={q} className="text-[10px] px-2 py-0.5 rounded-lg border border-indigo-400/30 text-indigo-300 bg-indigo-500/10 cursor-default">{q}</span>
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

          {/* ── Stats Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total Projects",   value: total,     icon: FolderOpen,   color: "#3b82f6",  sparkValues: [2,3,4,3,5,4,total] },
              { label: "Active",           value: active,    icon: TrendingUp,   color: "#f97316",  sparkValues: [1,2,2,3,2,3,active] },
              { label: "Planning",         value: planning,  icon: Clock,        color: "#f59e0b",  sparkValues: [1,1,2,1,2,1,planning] },
              { label: "On Hold",          value: onHold,    icon: PauseCircle,  color: "#a855f7",  sparkValues: [0,1,1,0,1,0,onHold] },
              { label: "Completed",        value: completed, icon: CheckCircle2, color: "#22c55e",  sparkValues: [0,1,1,2,2,2,completed] },
              { label: "Avg Progress",     value: `${avgProgress}%`, icon: BarChart3, color: "#6366f1", sparkValues: [20,30,40,50,60,70,avgProgress] },
            ].map(card => (
              <div key={card.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + "15" }}>
                    <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                  </div>
                  <MiniSparkbar values={card.sparkValues} color={card.color} />
                </div>
                {isLoading
                  ? <div className="h-7 w-10 bg-muted animate-pulse rounded mb-1" />
                  : <p className="text-2xl font-black" style={{ color: card.color }}>{card.value}</p>
                }
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
              </div>
            ))}
          </div>

          {/* ── Main content grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Project list */}
            <div className="xl:col-span-2 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">Projects Overview</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Top projects by progress</p>
                </div>
                <Link href="/projects"
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{ color: theme.accent, background: theme.accent + "12" }}>
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="divide-y divide-border/50">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4">
                        <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                        <div className="flex-1 h-2 bg-muted animate-pulse rounded-full" />
                        <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Briefcase className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No projects yet</p>
                    <Link href="/projects" className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ color: theme.accent, background: theme.accent + "12" }}>
                      Add your first project
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {recentProjects.map((project, idx) => {
                      const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
                      const pct = Math.min(100, Math.max(0, project.progress ?? 0));
                      return (
                        <div key={project.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/10 transition-colors group">
                          <span className="text-[10px] text-muted-foreground font-mono w-4 shrink-0">{idx + 1}</span>
                          <p className="text-sm font-semibold text-foreground flex-1 truncate">{project.name}</p>
                          <div className="flex items-center gap-2 w-36 shrink-0">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground w-7 text-right tabular-nums">{pct}%</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${cfg.badgeBg} ${cfg.textColor}`}>
                            <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
                            {cfg.label}
                          </span>
                          <Link href="/project-board" className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">

              {/* Progress distribution */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <h3 className="text-xs font-bold text-card-foreground uppercase tracking-wide mb-3">Progress Distribution</h3>
                {isLoading ? (
                  <div className="space-y-2.5">{[1,2,3,4].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <div className="space-y-2.5">
                    {progressDistribution.map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-14 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: total ? `${(count / total) * 100}%` : "0%", backgroundColor: color }} />
                        </div>
                        <span className="text-[11px] font-bold text-foreground w-4 text-right tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attention needed */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <h3 className="text-xs font-bold text-card-foreground uppercase tracking-wide">Needs Attention</h3>
                </div>
                {urgentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
                    <p className="text-xs text-muted-foreground">All clear!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {urgentProjects.map(p => {
                      const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.planning;
                      return (
                        <div key={p.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${cfg.badgeBg}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-semibold truncate ${cfg.textColor}`}>{p.name}</p>
                            <p className={`text-[10px] opacity-70 ${cfg.textColor}`}>{cfg.label}</p>
                          </div>
                          <Link href="/projects"><ArrowRight className={`w-3 h-3 ${cfg.textColor} opacity-60`} /></Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Launch Grid ─────────────────────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-card-foreground">Quick Launch</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">All FlowMatriX modules</p>
              </div>
              <Zap className="w-4 h-4 text-primary/40" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-8 gap-2">
              {QUICK_LAUNCH.map(({ label, icon: Icon, path, color, desc }) => (
                <Link key={path} href={path}>
                  <div className="group flex flex-col items-center gap-2 py-3 px-2 rounded-2xl hover:bg-muted/60 transition-all cursor-pointer text-center">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: color + "18" }}>
                      <Icon className="w-5 h-5 transition-colors" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors leading-tight">{label}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5 hidden sm:block">{desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
