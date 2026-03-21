import { useListProjects, useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  FolderOpen, Loader2, CheckCircle2, RefreshCw,
  LayoutGrid, FileText, ShoppingCart,
  Users, MessageSquare, Briefcase, ArrowRight, Sparkles,
  Clock, PauseCircle, Search, ChevronUp, ChevronDown,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const STATUS_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; dot: string; barColor: string }> = {
  active:    { label: "Active",     textColor: "text-blue-700",   badgeBg: "bg-blue-50 border-blue-200",    dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",   textColor: "text-amber-700",  badgeBg: "bg-amber-50 border-amber-200",  dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",    textColor: "text-orange-700", badgeBg: "bg-orange-50 border-orange-200", dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed",  textColor: "text-green-700",  badgeBg: "bg-green-50 border-green-200",  dot: "#22c55e", barColor: "#22c55e" },
};

const QUICK_ACTIONS = [
  { label: "Project Board", icon: LayoutGrid,  path: "/project-board",   color: "#6366f1", desc: "Kanban tasks" },
  { label: "Projects",      icon: Briefcase,   path: "/projects",         color: "#3b82f6", desc: "All projects" },
  { label: "Meetings",      icon: FileText,    path: "/meeting-minutes",  color: "#14b8a6", desc: "Minutes & notes" },
  { label: "Material Req.", icon: ShoppingCart, path: "/material-request", color: "#f59e0b", desc: "Procurement" },
  { label: "FlowTalk",      icon: MessageSquare, path: "/chat",           color: "#a855f7", desc: "Team chat" },
  { label: "User Mgmt.",    icon: Users,       path: "/user-management",  color: "#ef4444", desc: "Access control" },
];

type SortKey = "name" | "progress" | "status";

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading, refetch } = useListProjects();
  const { data: _summary, isLoading: summaryLoading } = useGetAnalyticsSummary();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const isLoading = projectsLoading || summaryLoading;

  const total     = projects?.length ?? 0;
  const active    = projects?.filter(p => p.status === "active").length ?? 0;
  const planning  = projects?.filter(p => p.status === "planning").length ?? 0;
  const onHold    = projects?.filter(p => p.status === "on_hold").length ?? 0;
  const completed = projects?.filter(p => p.status === "completed").length ?? 0;

  const filtered = (projects ?? [])
    .filter(p => filterStatus === "all" || p.status === filterStatus)
    .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = (a.name ?? "").localeCompare(b.name ?? "");
      else if (sortKey === "progress") cmp = (a.progress ?? 0) - (b.progress ?? 0);
      else if (sortKey === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const statCards = [
    { label: "Total",     value: total,     icon: FolderOpen,   accent: "#3b82f6" },
    { label: "Active",    value: active,    icon: Loader2,       accent: "#f97316" },
    { label: "Planning",  value: planning,  icon: Clock,         accent: "#f59e0b" },
    { label: "On Hold",   value: onHold,    icon: PauseCircle,   accent: "#a855f7" },
    { label: "Completed", value: completed, icon: CheckCircle2,  accent: "#22c55e" },
  ];

  const statusDistribution = [
    { key: "active",    label: "Active",    value: active,    color: "#3b82f6" },
    { key: "planning",  label: "Planning",  value: planning,  color: "#f59e0b" },
    { key: "on_hold",   label: "On Hold",   value: onHold,    color: "#a855f7" },
    { key: "completed", label: "Completed", value: completed, color: "#22c55e" },
  ];

  return (
    <Layout>
      <div className="p-5 space-y-4 h-full">

        {/* Welcome Banner */}
        <div className="rounded-2xl relative flex items-center justify-between px-6 py-4 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${theme.accent}18, ${theme.accent}06)`, border: `1px solid ${theme.accent}28` }}>
          <div className="absolute right-0 top-0 bottom-0 w-64 opacity-5 pointer-events-none"
            style={{ background: `radial-gradient(circle at right, ${theme.accent}, transparent)` }} />
          <div className="relative">
            <h1 className="text-xl font-bold text-gray-900 fm-text-main leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs text-gray-500 fm-text-sub mt-0.5">
              WTT International · FlowMatriX · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-white fm-bg-card border border-gray-200 fm-border rounded-lg text-sm text-gray-600 fm-text-sub hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div key={card.label}
              className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all cursor-default">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 fm-text-sub">{card.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.accent + "18" }}>
                  <card.icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
                </div>
              </div>
              {isLoading
                ? <div className="h-7 w-10 bg-gray-100 animate-pulse rounded" />
                : <p className="text-2xl font-bold fm-text-main" style={{ color: card.accent }}>{card.value}</p>
              }
            </div>
          ))}
        </div>

        {/* Main content: left = projects table, right = sidebar */}
        <div className="flex gap-4 min-h-0">

          {/* ── Projects Table ── */}
          <div className="flex-1 bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm flex flex-col overflow-hidden min-w-0">
            {/* Table header */}
            <div className="px-4 py-3 border-b border-gray-100 fm-border flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-gray-800 fm-text-main">All Projects</h2>
                <p className="text-xs text-gray-400 fm-text-muted">{filtered.length} of {total} shown</p>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects…"
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 fm-border rounded-lg bg-gray-50 fm-bg-input text-gray-700 fm-text-main focus:outline-none focus:ring-1 w-44"
                  style={{ '--tw-ring-color': theme.accent } as React.CSSProperties}
                />
              </div>
              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-200 fm-border rounded-lg px-2.5 py-1.5 bg-gray-50 fm-bg-input text-gray-700 fm-text-main focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              <Link href="/projects"
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ color: theme.accent, background: theme.accent + "12" }}>
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 fm-bg-page border-b border-gray-100 fm-border">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-500 fm-text-sub w-8">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700"
                      onClick={() => toggleSort("name")}>
                      Project Name <SortIcon k="name" />
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700 w-32"
                      onClick={() => toggleSort("progress")}>
                      Progress <SortIcon k="progress" />
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700 w-24"
                      onClick={() => toggleSort("status")}>
                      Status <SortIcon k="status" />
                    </th>
                    <th className="px-3 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 fm-border">
                        <td className="px-4 py-3"><div className="h-3 w-4 bg-gray-100 animate-pulse rounded" /></td>
                        <td className="px-3 py-3"><div className="h-3 w-48 bg-gray-100 animate-pulse rounded" /></td>
                        <td className="px-3 py-3"><div className="h-2 w-full bg-gray-100 animate-pulse rounded-full" /></td>
                        <td className="px-3 py-3"><div className="h-5 w-16 bg-gray-100 animate-pulse rounded-full mx-auto" /></td>
                        <td />
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-400 fm-text-muted">
                        No projects match your filter
                      </td>
                    </tr>
                  ) : (
                    filtered.map((project, idx) => {
                      const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
                      const pct = Math.min(100, Math.max(0, project.progress ?? 0));
                      return (
                        <tr key={project.id}
                          className="border-b border-gray-50 fm-border hover:bg-gray-50 fm-bg-hover transition-colors group">
                          <td className="px-4 py-2.5 text-gray-400 fm-text-muted font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-gray-800 fm-text-main">{project.name}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
                              </div>
                              <span className="text-gray-500 fm-text-sub font-semibold w-7 text-right tabular-nums">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.badgeBg} ${cfg.textColor}`}>
                              <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <Link href="/project-board"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-all">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">

            {/* Status Distribution */}
            <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 fm-text-sub mb-3 uppercase tracking-wide">Status Breakdown</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />)}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {statusDistribution.map(({ key, label, value, color }) => (
                    <button key={key}
                      onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                      className="w-full flex items-center gap-2.5 group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-600 fm-text-sub flex-1 text-left group-hover:text-gray-900 transition-colors">{label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: total ? `${(value / total) * 100}%` : "0%", backgroundColor: color }} />
                        </div>
                        <span className="text-xs font-bold fm-text-main w-4 text-right tabular-nums">{value}</span>
                      </div>
                    </button>
                  ))}
                  {filterStatus !== "all" && (
                    <button onClick={() => setFilterStatus("all")}
                      className="text-[10px] w-full text-center mt-1 hover:underline"
                      style={{ color: theme.accent }}>
                      Show all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 fm-text-sub mb-3 uppercase tracking-wide">Quick Actions</h3>
              <div className="space-y-1.5">
                {QUICK_ACTIONS.map(({ label, icon: Icon, path, color, desc }) => (
                  <Link key={path} href={path}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 fm-bg-hover transition-colors group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: color + "18" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 fm-text-main leading-tight">{label}</p>
                      <p className="text-[10px] text-gray-400 fm-text-muted leading-tight">{desc}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Assistant */}
            <div className="rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">AI Assistant</p>
                    <p className="text-[10px] text-indigo-300 leading-tight">Context-aware help</p>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-200/70 mb-3">Ask about projects, HR, procurement, drawings, and more.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Project status?", "Pending POs?"].map(q => (
                    <span key={q} className="text-[10px] px-2 py-0.5 rounded-lg border border-indigo-400/30 text-indigo-300 bg-indigo-500/10">
                      {q}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-400/60 mt-3 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Use <strong className="text-indigo-300">Ask AI</strong> in the sidebar
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
