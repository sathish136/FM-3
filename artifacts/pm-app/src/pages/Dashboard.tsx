import { useListProjects, useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  FolderOpen, Loader2, CheckCircle2, RefreshCw,
  LayoutGrid, FileText, ShoppingCart,
  Users, MessageSquare, Briefcase, ArrowRight, Sparkles,
  Clock, PauseCircle, Search, ChevronUp, ChevronDown, UserCircle,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const STATUS_CONFIG: Record<string, { label: string; textColor: string; badgeBg: string; dot: string; barColor: string }> = {
  active:    { label: "Active",     textColor: "text-blue-700",   badgeBg: "bg-blue-50 border-blue-200",    dot: "#3b82f6", barColor: "#3b82f6" },
  planning:  { label: "Planning",   textColor: "text-amber-700",  badgeBg: "bg-amber-50 border-amber-200",  dot: "#f59e0b", barColor: "#f59e0b" },
  on_hold:   { label: "On Hold",    textColor: "text-orange-700", badgeBg: "bg-orange-50 border-orange-200", dot: "#f97316", barColor: "#f97316" },
  completed: { label: "Completed",  textColor: "text-green-700",  badgeBg: "bg-green-50 border-green-200",  dot: "#22c55e", barColor: "#22c55e" },
};

const QUICK_ACTIONS = [
  { label: "Project Board",   icon: LayoutGrid,    path: "/project-board",      color: "#6366f1", desc: "Kanban tasks" },
  { label: "Projects",        icon: Briefcase,     path: "/projects",           color: "#3b82f6", desc: "All projects" },
  { label: "Meetings",        icon: FileText,      path: "/meeting-minutes",    color: "#14b8a6", desc: "Minutes & notes" },
  { label: "Material Req.",   icon: ShoppingCart,  path: "/material-request",   color: "#f59e0b", desc: "Procurement" },
  { label: "FlowTalk",        icon: MessageSquare, path: "/chat",               color: "#a855f7", desc: "Team chat" },
  { label: "Smart Inbox",     icon: Sparkles,      path: "/smart-inbox",        color: "#f97316", desc: "AI email inbox" },
  { label: "HRMS",            icon: UserCircle,    path: "/hrms",               color: "#22c55e", desc: "HR & employees" },
  { label: "User Mgmt.",      icon: Users,         path: "/user-management",    color: "#ef4444", desc: "Access control" },
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
      <div className="p-3 md:p-5 space-y-3 md:space-y-4 h-full">

        {/* Welcome Banner */}
        <div className="rounded-2xl relative flex items-center justify-between px-4 md:px-6 py-3 md:py-4 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${theme.accent}18, ${theme.accent}06)`, border: `1px solid ${theme.accent}28` }}>
          <div className="absolute right-0 top-0 bottom-0 w-64 opacity-5 pointer-events-none"
            style={{ background: `radial-gradient(circle at right, ${theme.accent}, transparent)` }} />
          <div className="relative">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 fm-text-main leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 fm-text-sub mt-0.5 hidden sm:block">
              WTT International · FlowMatriX · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-[10px] text-gray-500 fm-text-sub mt-0.5 sm:hidden">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="relative flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 bg-white fm-bg-card border border-gray-200 fm-border rounded-lg text-xs md:text-sm text-gray-600 fm-text-sub hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
          {statCards.map((card) => (
            <div key={card.label}
              className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border p-3 md:p-4 flex flex-col gap-1.5 md:gap-2 shadow-sm hover:shadow-md transition-all cursor-default">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-gray-500 fm-text-sub">{card.label}</p>
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.accent + "18" }}>
                  <card.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: card.accent }} />
                </div>
              </div>
              {isLoading
                ? <div className="h-6 w-8 bg-gray-100 animate-pulse rounded" />
                : <p className="text-xl md:text-2xl font-bold fm-text-main" style={{ color: card.accent }}>{card.value}</p>
              }
            </div>
          ))}
        </div>

        {/* Main content: projects table + sidebar (stacked on mobile, side-by-side on large screens) */}
        <div className="flex flex-col xl:flex-row gap-3 md:gap-4 min-h-0">

          {/* ── Projects Table ── */}
          <div className="flex-1 bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm flex flex-col overflow-hidden min-w-0">
            {/* Table header */}
            <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-gray-100 fm-border space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-800 fm-text-main">All Projects</h2>
                  <p className="text-[10px] md:text-xs text-gray-400 fm-text-muted">{filtered.length} of {total} shown</p>
                </div>
                <Link href="/projects"
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                  style={{ color: theme.accent, background: theme.accent + "12" }}>
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Search + filter row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search projects…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 fm-border rounded-lg bg-gray-50 fm-bg-input text-gray-700 fm-text-main focus:outline-none focus:ring-1 w-full"
                    style={{ '--tw-ring-color': theme.accent } as React.CSSProperties}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="text-xs border border-gray-200 fm-border rounded-lg px-2 py-1.5 bg-gray-50 fm-bg-input text-gray-700 fm-text-main focus:outline-none shrink-0"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Done</option>
                </select>
              </div>
            </div>

            {/* Table with horizontal scroll on mobile */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50 fm-bg-page border-b border-gray-100 fm-border">
                    <th className="px-3 md:px-4 py-2.5 text-left font-semibold text-gray-500 fm-text-sub w-8">#</th>
                    <th className="px-2 md:px-3 py-2.5 text-left font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700"
                      onClick={() => toggleSort("name")}>
                      Project Name <SortIcon k="name" />
                    </th>
                    <th className="px-2 md:px-3 py-2.5 text-center font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700 w-28 md:w-32"
                      onClick={() => toggleSort("progress")}>
                      Progress <SortIcon k="progress" />
                    </th>
                    <th className="px-2 md:px-3 py-2.5 text-center font-semibold text-gray-500 fm-text-sub cursor-pointer select-none hover:text-gray-700 w-20 md:w-24"
                      onClick={() => toggleSort("status")}>
                      Status <SortIcon k="status" />
                    </th>
                    <th className="px-2 md:px-3 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 fm-border">
                        <td className="px-3 md:px-4 py-3"><div className="h-3 w-4 bg-gray-100 animate-pulse rounded" /></td>
                        <td className="px-2 md:px-3 py-3"><div className="h-3 w-36 md:w-48 bg-gray-100 animate-pulse rounded" /></td>
                        <td className="px-2 md:px-3 py-3"><div className="h-2 w-full bg-gray-100 animate-pulse rounded-full" /></td>
                        <td className="px-2 md:px-3 py-3"><div className="h-5 w-14 bg-gray-100 animate-pulse rounded-full mx-auto" /></td>
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
                          <td className="px-3 md:px-4 py-2.5 text-gray-400 fm-text-muted font-mono">{idx + 1}</td>
                          <td className="px-2 md:px-3 py-2.5">
                            <span className="font-medium text-gray-800 fm-text-main">{project.name}</span>
                          </td>
                          <td className="px-2 md:px-3 py-2.5">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} />
                              </div>
                              <span className="text-gray-500 fm-text-sub font-semibold w-7 text-right tabular-nums">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-semibold border ${cfg.badgeBg} ${cfg.textColor}`}>
                              <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
                              <span className="hidden sm:inline">{cfg.label}</span>
                              <span className="sm:hidden">{cfg.label.slice(0, 4)}</span>
                            </span>
                          </td>
                          <td className="px-1.5 md:px-2 py-2.5">
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
          <div className="flex flex-col gap-3 md:gap-4 xl:w-64 xl:flex-shrink-0">

            {/* Quick Actions — horizontal scroll on mobile */}
            <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm p-3 md:p-4">
              <h3 className="text-xs font-semibold text-gray-700 fm-text-sub mb-2.5 uppercase tracking-wide">Quick Actions</h3>
              {/* Mobile: 2-col grid; desktop: list */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-1 gap-1.5">
                {QUICK_ACTIONS.map(({ label, icon: Icon, path, color, desc }) => (
                  <Link key={path} href={path}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 fm-bg-hover transition-colors group border border-gray-100 fm-border xl:border-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: color + "18" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 fm-text-main leading-tight truncate">{label}</p>
                      <p className="text-[10px] text-gray-400 fm-text-muted leading-tight hidden xl:block">{desc}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors hidden xl:block" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white fm-bg-card rounded-xl border border-gray-200 fm-border shadow-sm p-3 md:p-4">
              <h3 className="text-xs font-semibold text-gray-700 fm-text-sub mb-2.5 uppercase tracking-wide">Status Breakdown</h3>
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
                        <div className="w-12 md:w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

            {/* AI Assistant */}
            <div className="rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <div className="p-3 md:p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">AI Assistant</p>
                    <p className="text-[10px] text-indigo-300 leading-tight">Context-aware help</p>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-200/70 mb-3 hidden xl:block">Ask about projects, HR, procurement, drawings, and more.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Project status?", "Pending POs?"].map(q => (
                    <span key={q} className="text-[10px] px-2 py-0.5 rounded-lg border border-indigo-400/30 text-indigo-300 bg-indigo-500/10">
                      {q}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-400/60 mt-3 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Tap <strong className="text-indigo-300">AI</strong> in the header to ask
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
