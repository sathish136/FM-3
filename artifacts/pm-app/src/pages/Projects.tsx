import { useState, useEffect, useMemo } from "react";
import {
  useListProjects,
  getListProjectsQueryKey,
  Project
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import {
  RefreshCw, Search, Circle, CheckCircle2, Clock,
  AlertCircle, Calendar, TrendingUp, List, LayoutGrid,
  ChevronDown, ChevronUp, Plus, X, FolderPlus, Loader2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FilterTab = "ongoing" | "completed" | "all";
type SortKey = "name" | "progress" | "dueDate" | "priority";
type SortDir = "asc" | "desc";

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", status: "planning", priority: "medium", dueDate: "", progress: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Project name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, any> = { name: form.name.trim(), status: form.status, priority: form.priority, progress: 0 };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.dueDate) body.dueDate = form.dueDate;
      const r = await fetch(`${BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      onCreated();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">Projects</p>
              <h2 className="text-white text-sm font-bold leading-tight">New Project</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Project Name <span className="text-red-400 normal-case">*</span></label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. Office Renovation, Product Launch…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the project…"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          {/* Due Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-all">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

const getPriorityStyle = (p: string) => {
  switch (p) {
    case "high":   return "bg-red-50 text-red-700 border border-red-200";
    case "medium": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "low":    return "bg-gray-50 text-gray-500 border border-gray-200";
    default:       return "bg-gray-50 text-gray-400 border border-gray-200";
  }
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronDown className="w-3.5 h-3.5 text-gray-300" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
}

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: allProjects = [], isLoading, isFetching } = useListProjects();

  const [tab, setTab] = useState<FilterTab>("ongoing");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showNewProject, setShowNewProject] = useState(false);

  const ongoing   = allProjects.filter(p => p.status === "active" || p.status === "planning");
  const completed = allProjects.filter(p => p.status === "completed");

  const tabProjects: Project[] = useMemo(() => {
    const base = tab === "ongoing" ? ongoing : tab === "completed" ? completed : allProjects;
    const q = search.trim().toLowerCase();
    const filtered = q ? base.filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)) : base;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")     cmp = a.name.localeCompare(b.name);
      if (sortKey === "progress") cmp = a.progress - b.progress;
      if (sortKey === "dueDate")  cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      if (sortKey === "priority") cmp = (priorityOrder[a.priority ?? ""] ?? 99) - (priorityOrder[b.priority ?? ""] ?? 99);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allProjects, tab, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const tabs: { key: FilterTab; label: string; count: number; icon: React.ElementType; color: string }[] = [
    { key: "ongoing",   label: "Ongoing",    count: ongoing.length,   icon: Circle,       color: "text-blue-600" },
    { key: "completed", label: "Completed",  count: completed.length, icon: CheckCircle2, color: "text-emerald-600" },
    { key: "all",       label: "All Projects", count: allProjects.length, icon: List,     color: "text-gray-600" },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-4 max-w-7xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoading ? "Loading projects..." : `${ongoing.length} ongoing projects from ERPNext`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })}
              title="Sync from ERPNext"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm ${isFetching ? "text-blue-500" : ""}`}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {showNewProject && (
          <NewProjectModal
            onClose={() => setShowNewProject(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })}
          />
        )}

        {/* ── Stats + Tabs bar ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-gray-900">{allProjects.length}</p>
              <p className="text-xs text-gray-500">Total Projects</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{ongoing.length}</p>
              <p className="text-xs text-gray-500">Ongoing</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    active
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : t.color}`} />
                  {t.label} ({t.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search + View toggle ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5 ml-auto">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-400">{tabProjects.length} project{tabProjects.length !== 1 ? "s" : ""}</p>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-5 py-4 border-b border-gray-100 animate-pulse flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : tabProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No projects found</p>
            {search && <p className="text-xs mt-1">Try a different search term</p>}
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[110px_2fr_1fr_1fr_1fr_120px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[700px]">
              <span>Project No.</span>
              <button className="flex items-center gap-1 text-left hover:text-gray-700" onClick={() => toggleSort("name")}>
                Project Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <span>Status</span>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("priority")}>
                Priority <SortIcon col="priority" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("dueDate")}>
                Due Date <SortIcon col="dueDate" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("progress")}>
                Progress <SortIcon col="progress" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 min-w-[700px]">
              {tabProjects.map((project, idx) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[110px_2fr_1fr_1fr_1fr_120px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="inline-block text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono tracking-wide truncate max-w-full">
                      {(project as any).erpnextName || "—"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{project.description}</p>
                    )}
                  </div>

                  <div>
                    {project.status === "active" || project.status === "planning" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                        <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" /> Ongoing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                      </span>
                    )}
                  </div>

                  <div>
                    {project.priority ? (
                      <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${getPriorityStyle(project.priority)}`}>
                        {project.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(project.dueDate)}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${project.progress >= 100 ? "bg-emerald-500" : project.progress > 50 ? "bg-blue-500" : "bg-blue-400"}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tabProjects.map(project => (
              <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-2">
                  {project.status === "active" || project.status === "planning" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                      <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" /> Ongoing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                    </span>
                  )}
                  {project.priority && (
                    <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full ${getPriorityStyle(project.priority)}`}>
                      {project.priority}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{project.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-1 mb-3">{project.description || "No description"}</p>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-semibold text-gray-700">{project.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${project.progress >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(project.dueDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
