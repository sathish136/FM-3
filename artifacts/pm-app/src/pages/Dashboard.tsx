import { useListProjects, useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  FolderOpen, Loader2, CheckCircle2, RefreshCw, Box,
  ExternalLink, LayoutGrid, FileText, ShoppingCart,
  Users, MessageSquare, Briefcase, ArrowRight, TrendingUp,
  Clock, AlertCircle, Sparkles,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: "On Going",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   dot: "bg-blue-500" },
  planning:  { label: "Planning",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-500" },
  on_hold:   { label: "On Hold",    color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  completed: { label: "Completed",  color: "text-green-700",  bg: "bg-green-50 border-green-200",  dot: "bg-green-500" },
};

const QUICK_ACTIONS = [
  { label: "Project Board", icon: LayoutGrid,     path: "/project-board",    color: "bg-indigo-500", desc: "View kanban tasks" },
  { label: "Projects",      icon: Briefcase,       path: "/projects",         color: "bg-blue-500",   desc: "All projects" },
  { label: "Meeting Notes", icon: FileText,        path: "/meeting-minutes",  color: "bg-teal-500",   desc: "Minutes & actions" },
  { label: "Material Req.", icon: ShoppingCart,    path: "/material-request", color: "bg-amber-500",  desc: "Procurement" },
  { label: "Team Chat",     icon: MessageSquare,   path: "/chat",             color: "bg-violet-500", desc: "FlowTalk" },
  { label: "User Mgmt.",    icon: Users,           path: "/user-management",  color: "bg-rose-500",   desc: "Manage access" },
];

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading, refetch } = useListProjects();
  const { data: summary, isLoading: summaryLoading } = useGetAnalyticsSummary();
  const { user } = useAuth();
  const { theme } = useTheme();

  const isLoading = projectsLoading || summaryLoading;

  const totalProjects = projects?.length ?? 0;
  const ongoing    = projects?.filter(p => p.status === "active").length ?? 0;
  const planning   = projects?.filter(p => p.status === "planning").length ?? 0;
  const completed  = projects?.filter(p => p.status === "completed").length ?? 0;

  const activeProjects = projects?.filter(p => p.status === "active" || p.status === "planning") ?? [];
  const recentProjects = [...activeProjects].slice(0, 8);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const statCards = [
    { label: "Total Projects", value: totalProjects, icon: FolderOpen,   color: "text-blue-500",  bg: "bg-blue-50",   ring: "ring-blue-200" },
    { label: "Ongoing",        value: ongoing,       icon: Loader2,       color: "text-orange-500", bg: "bg-orange-50", ring: "ring-orange-200" },
    { label: "Planning",       value: planning,      icon: Clock,         color: "text-amber-500",  bg: "bg-amber-50",  ring: "ring-amber-200" },
    { label: "Completed",      value: completed,     icon: CheckCircle2,  color: "text-green-500",  bg: "bg-green-50",  ring: "ring-green-200" },
  ];

  return (
    <Layout>
      <div className="p-5 space-y-5 max-w-6xl mx-auto">

        {/* Welcome Banner */}
        <div className="rounded-2xl overflow-hidden relative flex items-center justify-between px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`, border: `1px solid ${theme.accent}30` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), transparent)" }} />
          <div className="relative">
            <h1 className="text-xl font-bold text-gray-900 fm-text-main">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 fm-text-sub mt-0.5">
              WTT International — FlowMatriX Project Management · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white fm-bg-card border border-gray-200 fm-border rounded-lg text-sm text-gray-600 fm-text-sub hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
              <div>
                <p className="text-xs text-gray-500 fm-text-sub mb-1">{card.label}</p>
                {isLoading
                  ? <div className="h-8 w-12 bg-gray-100 animate-pulse rounded" />
                  : <p className="text-3xl font-bold text-gray-900 fm-text-main">{card.value}</p>
                }
              </div>
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center ring-1 ${card.ring}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 fm-text-sub mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Quick Actions
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path, color, desc }) => (
              <Link key={path} href={path}
                className="group flex flex-col items-center gap-2 p-3 bg-white fm-bg-card rounded-xl border border-gray-200 fm-border hover:shadow-md hover:border-gray-300 transition-all text-center cursor-pointer">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 fm-text-main leading-tight">{label}</span>
                <span className="text-[10px] text-gray-400 fm-text-muted leading-tight">{desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Current Projects */}
        <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 fm-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 fm-text-main">Current Projects</h2>
              <p className="text-xs text-gray-400 fm-text-muted mt-0.5">{activeProjects.length} active & planning projects</p>
            </div>
            <Link href="/projects"
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: theme.accent }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-100 fm-divide">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                  <div className="h-4 bg-gray-100 rounded w-48" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full" />
                  <div className="h-5 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 fm-text-muted">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active projects found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 fm-divide">
              {recentProjects.map((project) => {
                const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
                const pct = Math.min(100, Math.max(0, project.progress ?? 0));
                return (
                  <div key={project.id} className="px-5 py-3.5 hover:bg-gray-50 fm-bg-hover transition-colors flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-sm font-medium text-gray-800 fm-text-main truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct >= 75 ? "#22c55e" : pct >= 40 ? theme.accent : "#f59e0b" }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 fm-text-sub w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <Link href={`/project-board`}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 fm-bg-hover text-gray-400 hover:text-gray-600 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          {!isLoading && projects && projects.length > 8 && (
            <div className="px-5 py-3 border-t border-gray-100 fm-border">
              <Link href="/projects" className="text-sm font-medium hover:underline" style={{ color: theme.accent }}>
                View all {projects.length} projects →
              </Link>
            </div>
          )}
        </div>

        {/* Bottom row: AI assistant + 3D Viewer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Assistant Card */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderColor: "rgba(99,102,241,0.3)" }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AI Assistant</p>
                  <p className="text-xs text-indigo-300">Context-aware help for any module</p>
                </div>
              </div>
              <p className="text-xs text-indigo-200/70 mb-4">
                Ask about projects, HR data, procurement status, drawing details, and more. Voice input supported.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Project status?", "Who's on leave?", "Pending POs?"].map(q => (
                  <span key={q} className="text-[11px] px-2.5 py-1 rounded-lg border border-indigo-400/30 text-indigo-300 bg-indigo-500/10">
                    {q}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-5 pb-4">
              <p className="text-[11px] text-indigo-400/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Click <strong className="text-indigo-300">Ask AI</strong> in the sidebar or search bar above
              </p>
            </div>
          </div>

          {/* 3D Viewer */}
          <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 fm-text-main">3D Model Viewer</p>
                  <p className="text-xs text-gray-500 fm-text-sub">Upload and visualize STEP files</p>
                </div>
              </div>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Viewer
              </a>
            </div>
            <div className="mx-5 mb-5 rounded-lg border border-gray-200 fm-border overflow-hidden bg-[#0f0f1a] h-28 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Box className="w-8 h-8 mx-auto mb-1.5 opacity-20" />
                <p className="text-xs opacity-50">Load a STEP file to view in 3D</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
