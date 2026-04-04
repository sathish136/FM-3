import { useState, useEffect, useRef } from "react";
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
  ChevronRight, RefreshCw, Loader2, Flag, MessageSquare,
  List, Columns, Tag, Send, ChevronDown, AlignLeft,
  CalendarRange, Timer, MoreHorizontal, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COLUMNS: { id: TaskStatus; title: string; color: string; bg: string; border: string; dot: string; badge: string }[] = [
  { id: TaskStatus.todo,        title: "To Do",       color: "text-gray-600",    bg: "bg-gray-50",    border: "border-t-gray-400",    dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-700" },
  { id: TaskStatus.in_progress, title: "In Progress", color: "text-blue-700",    bg: "bg-blue-50/40", border: "border-t-blue-500",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  { id: TaskStatus.review,      title: "Review",      color: "text-amber-700",   bg: "bg-amber-50/40",border: "border-t-amber-500",   dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" },
  { id: TaskStatus.done,        title: "Done",        color: "text-emerald-700", bg: "bg-emerald-50/40",border:"border-t-emerald-500",dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ReactNode; cls: string }[] = [
  { value: TaskStatus.todo,        label: "To Do",       icon: <Clock className="w-3.5 h-3.5" />,        cls: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  { value: TaskStatus.in_progress, label: "In Progress", icon: <BarChart2 className="w-3.5 h-3.5" />,    cls: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { value: TaskStatus.review,      label: "Review",      icon: <AlignLeft className="w-3.5 h-3.5" />,    cls: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { value: TaskStatus.done,        label: "Done",        icon: <CheckCheck className="w-3.5 h-3.5" />,   cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
];

const PRIORITY_STYLES: Record<string, { badge: string; dot: string; label: string; rowBadge: string }> = {
  high:   { badge: "bg-red-50 text-red-700 border border-red-200",    dot: "bg-red-500",    label: "High",   rowBadge: "bg-red-100 text-red-700" },
  medium: { badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500", label: "Medium", rowBadge: "bg-amber-100 text-amber-700" },
  low:    { badge: "bg-gray-50 text-gray-600 border border-gray-200",  dot: "bg-gray-400",   label: "Low",    rowBadge: "bg-gray-100 text-gray-600" },
};

function avatarColor(str: string) {
  const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return d; }
}

function formatRelTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return Math.floor(hrs / 24) + "d ago";
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
  defaultValues, projects, defaultProjectId, onSubmit, onCancel, submitting, submitLabel,
}: {
  defaultValues?: Partial<Task>;
  projects: Project[];
  defaultProjectId?: number | null;
  onSubmit: (data: {
    title: string; description: string; status: TaskStatus; priority: TaskPriority;
    assignee: string | null; dueDate: string | null; startDate: string | null;
    projectId: number | null; tags: string | null; estimatedHours: string | null;
  }) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [erpUsers, setErpUsers] = useState<{ email: string; full_name: string }[]>([]);
  const [userSearch, setUserSearch] = useState((defaultValues as any)?.assignee || "");
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
      startDate: (fd.get("startDate") as string) || null,
      projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
      tags: (fd.get("tags") as string) || null,
      estimatedHours: (fd.get("estimatedHours") as string) || null,
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
          <select name="projectId" defaultValue={(defaultValues as any)?.projectId ?? defaultProjectId ?? ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estimated Hours</label>
          <input name="estimatedHours" type="number" min="0" step="0.5" defaultValue={(defaultValues as any)?.estimatedHours || ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 4" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date</label>
          <input name="startDate" type="date" defaultValue={(defaultValues as any)?.startDate?.substring(0, 10) || ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Due Date</label>
          <input name="dueDate" type="date" defaultValue={defaultValues?.dueDate?.substring(0, 10) || ""}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tags (comma-separated)</label>
        <input name="tags" defaultValue={(defaultValues as any)?.tags || ""}
          className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="e.g. design, urgent, client" />
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

// ── Task Detail Panel ─────────────────────────────────────────────────────────
interface Comment { id: number; taskId: number; author: string; message: string; createdAt: string; }

function TaskDetailPanel({
  task, projects, onClose, onEdit, onDelete, onStatusChange, currentUser,
}: {
  task: Task; projects: Project[]; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
  currentUser: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const proj = projects.find(p => p.id === (task as any).projectId);
  const pStyle = PRIORITY_STYLES[(task.priority as string) ?? "low"];
  const statusCol = COLUMNS.find(c => c.id === task.status);
  const overdueDue = isOverdue(task.dueDate) && task.status !== TaskStatus.done;
  const taskAny = task as any;

  function loadComments() {
    setCommentsLoading(true);
    fetch(`${BASE}/api/task-comments?taskId=${task.id}`)
      .then(r => r.json())
      .then(d => { setComments(Array.isArray(d) ? d : []); setCommentsLoading(false); })
      .catch(() => setCommentsLoading(false));
  }

  useEffect(() => { loadComments(); }, [task.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function submitComment() {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`${BASE}/api/task-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, author: currentUser, message: newComment.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [...prev, c]);
        setNewComment("");
      }
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteComment(id: number) {
    await fetch(`${BASE}/api/task-comments/${id}`, { method: "DELETE" });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  const tags: string[] = taskAny.tags ? taskAny.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-card shadow-2xl border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full flex items-center gap-1", pStyle.badge)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", pStyle.dot)} />
                {pStyle.label}
              </span>
              {/* Status quick-change */}
              <div className="relative">
                <button
                  onClick={() => setStatusDropOpen(v => !v)}
                  className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors", statusCol?.badge)}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusCol?.dot)} />
                  {statusCol?.title}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {statusDropOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => { onStatusChange(opt.value); setStatusDropOpen(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors text-left", opt.cls, task.status === opt.value && "opacity-60 pointer-events-none")}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-sm font-bold text-foreground leading-snug">{task.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {proj && (
              <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary truncate">{proj.name}</span>
              </div>
            )}
            {task.assignee && (
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0", avatarColor(task.assignee))}>
                  {task.assignee.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground">Assignee</p>
                  <p className="text-xs font-semibold text-foreground truncate">{task.assignee}</p>
                </div>
              </div>
            )}
            {taskAny.startDate && (
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[9px] text-muted-foreground">Start Date</p>
                  <p className="text-xs font-semibold text-foreground">{formatDate(taskAny.startDate)}</p>
                </div>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className={cn("w-4 h-4 shrink-0", overdueDue ? "text-red-500" : "text-muted-foreground")} />
                <div>
                  <p className="text-[9px] text-muted-foreground">Due Date</p>
                  <p className={cn("text-xs font-semibold", overdueDue ? "text-red-600" : "text-foreground")}>
                    {formatDate(task.dueDate)} {overdueDue && <span className="text-[9px]">(overdue)</span>}
                  </p>
                </div>
              </div>
            )}
            {taskAny.estimatedHours && (
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[9px] text-muted-foreground">Estimated</p>
                  <p className="text-xs font-semibold text-foreground">{taskAny.estimatedHours}h</p>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                    <Tag className="w-2.5 h-2.5" />{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Comments {comments.length > 0 && `(${comments.length})`}
              </p>
            </div>

            {commentsLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No comments yet. Be the first to comment.
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5 group">
                    <div className={cn("w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5", avatarColor(c.author))}>
                      {c.author.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{c.author.split("@")[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{formatRelTime(c.createdAt)}</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <p className="text-xs text-foreground/80 flex-1 leading-relaxed">{c.message}</p>
                        {c.author === currentUser && (
                          <button onClick={() => deleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-all shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="Add a comment… (Enter to send)"
              rows={2}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              onClick={submitComment}
              disabled={postingComment || !newComment.trim()}
              className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
            >
              {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Kanban() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUser = user?.email || "user@example.com";

  const { data: projects = [], isLoading: projectsLoading } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null | "all">("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  const displayTasks = tasks.filter(t => {
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || (t as any).assignee?.toLowerCase().includes(q));
    }
    return true;
  });

  const selectedProject = typeof selectedProjectId === "number"
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const total    = displayTasks.length;
  const done     = displayTasks.filter(t => t.status === TaskStatus.done).length;
  const inProg   = displayTasks.filter(t => t.status === TaskStatus.in_progress).length;
  const overdue  = displayTasks.filter(t => isOverdue(t.dueDate) && t.status !== TaskStatus.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  type FormData = {
    title: string; description: string; status: TaskStatus; priority: TaskPriority;
    assignee: string | null; dueDate: string | null; startDate: string | null;
    projectId: number | null; tags: string | null; estimatedHours: string | null;
  };

  function handleCreate(data: FormData) {
    createTask.mutate({ data: data as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setCreateOpen(false);
      }
    });
  }

  function handleEdit(data: FormData) {
    if (!editingTask) return;
    updateTask.mutate({ id: editingTask.id, data: data as any }, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setEditingTask(null);
        if (selectedTask?.id === editingTask.id) setSelectedTask(updated as Task);
      }
    });
  }

  function handleStatusChange(id: number, status: TaskStatus) {
    updateTask.mutate({ id, data: { status } as any }, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        if (selectedTask?.id === id) setSelectedTask(updated as Task);
      }
    });
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    if (!draggingId) return;
    handleStatusChange(draggingId, status);
    setDraggingId(null);
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(taskParams) });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        if (selectedTask?.id === id) setSelectedTask(null);
      }
    });
  }

  return (
    <Layout>
      <div className="h-full flex overflow-hidden">

        {/* ── Left: Project Sidebar ─────────────────────────────────────── */}
        <div className="w-60 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
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

        {/* ── Right: Board ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Board header */}
          <div className="bg-card border-b border-border px-5 py-3 flex items-center gap-3 shrink-0 flex-wrap">
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
            <div className="hidden md:flex items-center gap-2 w-28 shrink-0">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground w-8 shrink-0">{progress}%</span>
            </div>

            {/* Stats chips */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3" /> {inProg}
              </span>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> {done}
              </span>
              {overdue > 0 && (
                <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                  <AlertCircle className="w-3 h-3" /> {overdue}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative shrink-0 w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Priority filter */}
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | "all")}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground shrink-0">
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
              <button onClick={() => setViewMode("kanban")}
                className={cn("p-1.5 transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("list")}
                className={cn("p-1.5 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={() => refetch()} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? "animate-spin" : ""}`} />
            </button>

            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm shrink-0">
              <Plus className="w-3.5 h-3.5" /> New Task
            </button>
          </div>

          {/* ── Kanban View ─────────────────────────────────────────────── */}
          {viewMode === "kanban" && (
            <div className="flex-1 flex gap-4 overflow-x-auto p-4 min-h-0">
              {COLUMNS.map(col => {
                const colTasks = displayTasks.filter(t => t.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={cn(
                      "flex-1 min-w-[240px] max-w-[300px] flex flex-col rounded-xl border border-t-2 border-border shadow-sm overflow-hidden",
                      col.border, col.bg
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, col.id)}
                  >
                    {/* Column header */}
                    <div className="px-3 py-2.5 flex items-center justify-between bg-white/60 backdrop-blur-sm border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                        <h3 className={cn("text-xs font-bold", col.color)}>{col.title}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", col.badge)}>
                          {colTasks.length}
                        </span>
                        <button
                          onClick={() => { setCreateOpen(true); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                          title="Add task"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
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
                        const pStyle = PRIORITY_STYLES[(task.priority as string) ?? "low"];
                        const proj = projects.find(p => p.id === (task as any).projectId);
                        const overdueDue = isOverdue(task.dueDate) && task.status !== TaskStatus.done;
                        const taskAny = task as any;
                        const tags: string[] = taskAny.tags ? taskAny.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                        const commentCount = 0;
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
                            onClick={() => setSelectedTask(task)}
                            className="bg-white border border-border rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                          >
                            {/* Top row: priority + actions */}
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn("text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded", pStyle.badge)}>
                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", pStyle.dot)} />
                                {pStyle.label}
                              </span>
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                <button onClick={e => { e.stopPropagation(); setEditingTask(task); }}
                                  className="p-1 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="text-xs font-semibold text-foreground leading-snug mb-1.5">{task.title}</h4>
                            {task.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{task.description}</p>
                            )}

                            {/* Tags */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{tag}</span>
                                ))}
                                {tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{tags.length - 2}</span>}
                              </div>
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
                                <div className="flex items-center gap-1">
                                  <div className={cn("w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center", avatarColor(task.assignee))}>
                                    {task.assignee.substring(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">{task.assignee.split(" ")[0]}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground/40">
                                  <User className="w-3 h-3" />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {task.dueDate && (
                                  <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold", overdueDue ? "text-red-600" : "text-muted-foreground")}>
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(task.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── List View ─────────────────────────────────────────────── */}
          {viewMode === "list" && (
            <div className="flex-1 overflow-auto p-4">
              {tasksLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : displayTasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks found</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 bg-muted/50 border-b border-border">
                    {["Task", "Project", "Priority", "Status", "Assignee", "Due Date"].map(h => (
                      <div key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</div>
                    ))}
                  </div>
                  {/* Rows */}
                  {displayTasks.map(task => {
                    const pStyle = PRIORITY_STYLES[(task.priority as string) ?? "low"];
                    const statusCol = COLUMNS.find(c => c.id === task.status);
                    const proj = projects.find(p => p.id === (task as any).projectId);
                    const overdueDue = isOverdue(task.dueDate) && task.status !== TaskStatus.done;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        {/* Task title */}
                        <div className="px-4 py-3 flex items-start gap-2 min-w-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{task.description}</p>
                            )}
                          </div>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 shrink-0 ml-2">
                            <button onClick={e => { e.stopPropagation(); setEditingTask(task); }}
                              className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                              className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Project */}
                        <div className="px-4 py-3 flex items-center">
                          {proj ? (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">{proj.name}</span>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                        {/* Priority */}
                        <div className="px-4 py-3 flex items-center">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", pStyle.rowBadge)}>
                            {pStyle.label}
                          </span>
                        </div>
                        {/* Status */}
                        <div className="px-4 py-3 flex items-center">
                          <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", statusCol?.badge)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCol?.dot)} />
                            {statusCol?.title}
                          </span>
                        </div>
                        {/* Assignee */}
                        <div className="px-4 py-3 flex items-center">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center shrink-0", avatarColor(task.assignee))}>
                                {task.assignee.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-[10px] text-foreground truncate max-w-[80px]">{task.assignee.split("@")[0]}</span>
                            </div>
                          ) : <span className="text-[10px] text-muted-foreground">Unassigned</span>}
                        </div>
                        {/* Due date */}
                        <div className="px-4 py-3 flex items-center">
                          {task.dueDate ? (
                            <span className={cn("flex items-center gap-1 text-[10px] font-semibold", overdueDue ? "text-red-600" : "text-muted-foreground")}>
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Task Detail Panel ─────────────────────────────────────────── */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            projects={projects}
            currentUser={currentUser}
            onClose={() => setSelectedTask(null)}
            onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); }}
            onDelete={() => handleDelete(selectedTask.id)}
            onStatusChange={(status) => handleStatusChange(selectedTask.id, status)}
          />
        )}

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
