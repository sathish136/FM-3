import { useState, useEffect, useCallback } from "react";
import {
  useListTasks,
  useListProjects,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  TaskStatus,
  TaskPriority,
  Task,
  Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Plus, Trash2, Edit2, User, FolderKanban, Search, X,
  Calendar, AlertCircle, CheckCircle2, Clock, BarChart2,
  ChevronRight, RefreshCw, Loader2, Filter, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COLUMNS: { id: TaskStatus; title: string; color: string; bg: string; border: string; dot: string; badge: string }[] = [
  { id: TaskStatus.todo,        title: "To Do",       color: "text-gray-600",    bg: "bg-gray-50",    border: "border-t-gray-400",    dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-700" },
  { id: TaskStatus.in_progress, title: "In Progress", color: "text-blue-700",    bg: "bg-blue-50/40", border: "border-t-blue-500",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  { id: TaskStatus.review,      title: "Review",      color: "text-amber-700",   bg: "bg-amber-50/40",border: "border-t-amber-500",   dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" },
  { id: TaskStatus.done,        title: "Done",        color: "text-emerald-700", bg: "bg-emerald-50/40",border:"border-t-emerald-500",dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
];

const PRIORITY_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  high:   { badge: "bg-red-50 text-red-700 border border-red-200",    dot: "bg-red-500",    label: "High" },
  medium: { badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500", label: "Medium" },
  low:    { badge: "bg-gray-50 text-gray-600 border border-gray-200",  dot: "bg-gray-400",   label: "Low" },
};

function avatarColor(str: string) {
  const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function formatDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch { return d; }
}

function isOverdue(d?: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Task Form ─────────────────────────────────────────────────────────────────
function TaskForm({
  defaultValues,
  projects,
  defaultProjectId,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  defaultValues?: Partial<Task>;
  projects: Project[];
  defaultProjectId?: number | null;
  onSubmit: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee: string | null;
    dueDate: string | null;
    projectId: number | null;
  }) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [erpUsers, setErpUsers] = useState<{ email: string; full_name: string }[]>([]);
  const [userSearch, setUserSearch] = useState(defaultValues?.assignee || "");
  const [userDropOpen, setUserDropOpen] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/erpnext-users`)
      .then(r => r.json())
      .then(d => setErpUsers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const filteredUsers = erpUsers.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 8);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      status: fd.get("status") as TaskStatus,
      priority: fd.get("priority") as TaskPriority,
      assignee: userSearch || null,
      dueDate: (fd.get("dueDate") as string) || null,
      projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Task Title *</label>
        <input name="title" required defaultValue={defaultValues?.title}
          className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="e.g. Review P&ID drawings" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
        <textarea name="description" rows={3} defaultValue={defaultValues?.description || ""}
          className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Task details…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? TaskStatus.todo}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value={TaskStatus.todo}>To Do</option>
            <option value={TaskStatus.in_progress}>In Progress</option>
            <option value={TaskStatus.review}>Review</option>
            <option value={TaskStatus.done}>Done</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Priority</label>
          <select name="priority" defaultValue={defaultValues?.priority ?? TaskPriority.medium}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value={TaskPriority.low}>Low</option>
            <option value={TaskPriority.medium}>Medium</option>
            <option value={TaskPriority.high}>High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Project</label>
          <select name="projectId" defaultValue={defaultValues?.projectId ?? defaultProjectId ?? ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Due Date</label>
          <input name="dueDate" type="date" defaultValue={defaultValues?.dueDate?.substring(0, 10) || ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Assignee</label>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={userSearch}
            onChange={e => { setUserSearch(e.target.value); setUserDropOpen(true); }}
            onFocus={() => setUserDropOpen(true)}
            onBlur={() => setTimeout(() => setUserDropOpen(false), 150)}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        {userDropOpen && filteredUsers.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {filteredUsers.map(u => (
              <button key={u.email} type="button"
                onMouseDown={() => { setUserSearch(u.full_name); setUserDropOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors">
                <div className={`w-6 h-6 rounded-full ${avatarColor(u.email)} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}>
                  {(u.full_name || u.email).substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{u.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Kanban() {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null | "all">("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");

  const taskParams = selectedProjectId !== "all" && selectedProjectId !== null
    ? { projectId: selectedProjectId }
    : undefined;

  const { data: tasks = [], isLoading: tasksLoading, refetch } = useListTasks(taskParams);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const displayTasks = tasks.filter(t =>
    priorityFilter === "all" || t.priority === priorityFilter
  );

  const selectedProject = typeof selectedProjectId === "number"
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Stats
  const total     = displayTasks.length;
  const done      = displayTasks.filter(t => t.status === TaskStatus.done).length;
  const inProg    = displayTasks.filter(t => t.status === TaskStatus.in_progress).length;
  const overdue   = displayTasks.filter(t => isOverdue(t.dueDate) && t.status !== TaskStatus.done).length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

  function handleCreate(data: Parameters<typeof TaskForm>[0]["onSubmit"] extends (d: infer D) => void ? D : never) {
    createTask.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setCreateOpen(false);
      }
    });
  }

  function handleEdit(data: Parameters<typeof TaskForm>[0]["onSubmit"] extends (d: infer D) => void ? D : never) {
    if (!editingTask) return;
    updateTask.mutate({ id: editingTask.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setEditingTask(null);
      }
    });
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    if (!draggingId) return;
    updateTask.mutate({ id: draggingId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    });
    setDraggingId(null);
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    });
  }

  const projectTaskCount = (pid: number) => tasks.filter(t => t.projectId === pid).length;

  return (
    <Layout>
      <div className="h-full flex overflow-hidden">

        {/* ── Left: Project Sidebar ─────────────────────────────────────── */}
        <div className="w-64 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Projects</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                placeholder="Filter projects…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* All tasks */}
            <button
              onClick={() => setSelectedProjectId("all")}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${selectedProjectId === "all" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold flex-1">All Tasks</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedProjectId === "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {tasks.length}
              </span>
            </button>

            <div className="px-4 pt-3 pb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Projects</p>
            </div>

            {projectsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filteredProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No projects</p>
            ) : filteredProjects.map(p => {
              const isSelected = selectedProjectId === p.id;
              const statusColors: Record<string, string> = {
                active: "bg-emerald-500", planning: "bg-amber-500", completed: "bg-gray-400"
              };
              return (
                <button key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[p.status ?? "planning"] ?? "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{p.name}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{p.status}</p>
                  </div>
                  <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${isSelected ? "rotate-90 text-primary" : "text-muted-foreground/30"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Kanban Board ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Board header */}
          <div className="bg-card border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">
                {selectedProject ? selectedProject.name : "All Tasks"}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {total} task{total !== 1 ? "s" : ""} · {progress}% complete
                {overdue > 0 && <span className="text-red-500 ml-2">· {overdue} overdue</span>}
              </p>
            </div>

            {/* Progress bar */}
            <div className="hidden md:flex items-center gap-2 w-32">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground w-8 shrink-0">{progress}%</span>
            </div>

            {/* Stats chips */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold shrink-0">
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3" /> {inProg} active
              </span>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> {done} done
              </span>
              {overdue > 0 && (
                <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                  <AlertCircle className="w-3 h-3" /> {overdue} overdue
                </span>
              )}
            </div>

            {/* Priority filter */}
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | "all")}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
              <option value="all">All priorities</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>

            <button onClick={() => refetch()} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? "animate-spin" : ""}`} />
            </button>

            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New Task
            </button>
          </div>

          {/* Kanban columns */}
          <div className="flex-1 flex gap-4 overflow-x-auto p-4 min-h-0">
            {COLUMNS.map(col => {
              const colTasks = displayTasks.filter(t => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex-1 min-w-[260px] max-w-[320px] flex flex-col rounded-xl border border-t-2 border-border shadow-sm overflow-hidden",
                    col.border, col.bg
                  )}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, col.id)}
                >
                  {/* Column header */}
                  <div className="px-4 py-3 flex items-center justify-between bg-white/60 backdrop-blur-sm border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                      <h3 className={cn("text-xs font-bold", col.color)}>{col.title}</h3>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", col.badge)}>
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {tasksLoading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />
                      ))
                    ) : colTasks.length === 0 ? (
                      <div className="h-16 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center text-[11px] text-muted-foreground">
                        Drop tasks here
                      </div>
                    ) : colTasks.map(task => {
                      const pStyle = PRIORITY_STYLES[task.priority ?? "low"];
                      const proj = projects.find(p => p.id === task.projectId);
                      const overdueDue = isOverdue(task.dueDate) && task.status !== TaskStatus.done;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={e => {
                            setDraggingId(task.id);
                            setTimeout(() => e.currentTarget.classList.add("opacity-40"), 0);
                          }}
                          onDragEnd={e => {
                            setDraggingId(null);
                            e.currentTarget.classList.remove("opacity-40");
                          }}
                          className="bg-white border border-border rounded-xl shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                        >
                          {/* Top row: priority + actions */}
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded", pStyle.badge)}>
                              <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", pStyle.dot)} />
                              {pStyle.label}
                            </span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                              <button onClick={() => setEditingTask(task)}
                                className="p-1 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDelete(task.id)}
                                className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-semibold text-foreground leading-snug mb-1.5">{task.title}</h4>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                          )}

                          {/* Project badge (in "All" view) */}
                          {selectedProjectId === "all" && proj && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold mb-1.5">
                              <FolderKanban className="w-2.5 h-2.5" />
                              {proj.name}
                            </span>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center", avatarColor(task.assignee))}>
                                  {task.assignee.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assignee.split(" ")[0]}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground/40">
                                <User className="w-3 h-3" />
                                <span className="text-[10px]">Unassigned</span>
                              </div>
                            )}
                            {task.dueDate && (
                              <span className={cn("flex items-center gap-1 text-[10px] font-semibold", overdueDue ? "text-red-600" : "text-muted-foreground")}>
                                <Calendar className="w-3 h-3" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Modal */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Task">
          <TaskForm
            projects={projects}
            defaultProjectId={typeof selectedProjectId === "number" ? selectedProjectId : null}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitting={createTask.isPending}
            submitLabel="Create Task"
          />
        </Modal>

        {/* Edit Modal */}
        <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
          {editingTask && (
            <TaskForm
              defaultValues={editingTask}
              projects={projects}
              onSubmit={handleEdit}
              onCancel={() => setEditingTask(null)}
              submitting={updateTask.isPending}
              submitLabel="Save Changes"
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
}
