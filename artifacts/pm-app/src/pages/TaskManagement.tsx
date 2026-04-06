import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, RefreshCw, Monitor, CheckSquare, Clock, User, Calendar,
  MoreVertical, Edit2, Trash2, Tag, Briefcase, Wifi, WifiOff,
  Activity, Download, X, ChevronDown, Search, Filter,
  AlertCircle, CheckCircle2, Timer, CircleDot, Coffee, Zap,
  Building2, MapPin, Phone, BadgeCheck, Users, Link2, Check, Loader2,
  BarChart2, FileText, ChevronRight, History, ClipboardList,
  LayoutGrid, List, ArrowLeft, SlidersHorizontal,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────
interface FmTask {
  id: number;
  title: string;
  description?: string | null;
  projectId?: number | null;
  status: string;
  priority: string;
  assigneeEmail?: string | null;
  assigneeName?: string | null;
  createdBy: string;
  dueDate?: string | null;
  startDate?: string | null;
  tags?: string | null;
  notes?: string | null;
  isSelfAssigned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Project { id: number; name: string; }

interface EmployeeProfile {
  email: string;
  full_name: string;
  username: string | null;
  employee_number: string | null;
  designation: string | null;
  department: string | null;
  company: string | null;
  branch: string | null;
  date_of_joining: string | null;
  employment_type: string | null;
  gender: string | null;
  employee_status: string | null;
  reports_to: string | null;
  grade: string | null;
  photo: string | null;
}

interface SystemActivity {
  id: number;
  deviceUsername: string;
  email: string;
  fullName: string;
  department: string;
  designation: string;
  erpEmployeeId: string;
  erpImage: string;
  activeApp: string;
  windowTitle: string;
  isActive: boolean;
  idleSeconds: number;
  deviceName: string;
  lastSeen: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  activeApp: string;
  windowTitle: string;
  isActive: boolean;
  idleSeconds: number;
  loggedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: "todo",        label: "To Do",       color: "#6b7280", bg: "bg-gray-50",   border: "border-gray-200",  dot: "bg-gray-400"  },
  { id: "in_progress", label: "In Progress", color: "#3b82f6", bg: "bg-blue-50",   border: "border-blue-200",  dot: "bg-blue-500"  },
  { id: "review",      label: "Review",      color: "#f59e0b", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500" },
  { id: "done",        label: "Done",        color: "#10b981", bg: "bg-green-50",  border: "border-green-200", dot: "bg-green-500" },
];

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "text-gray-500 bg-gray-100"  },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-50" },
  { value: "high",   label: "High",   color: "text-red-600 bg-red-50"     },
];

const priorityColor = (p: string) =>
  p === "high" ? "text-red-600 bg-red-50 border-red-200" :
  p === "medium" ? "text-amber-600 bg-amber-50 border-amber-200" :
  "text-gray-500 bg-gray-100 border-gray-200";

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeSince(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function activityStatus(row: SystemActivity): "active" | "idle" | "offline" {
  const secsAgo = (Date.now() - new Date(row.lastSeen).getTime()) / 1000;
  if (secsAgo > 300) return "offline";
  if (!row.isActive || row.idleSeconds > 300) return "idle";
  return "active";
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  idle: "bg-amber-400",
  offline: "bg-gray-300",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  idle: "Idle",
  offline: "Offline",
};

// ── Task Modal ─────────────────────────────────────────────────────────────────
function TaskModal({
  task, projects, users, defaultStatus, onClose, onSave,
}: {
  task?: FmTask | null;
  projects: Project[];
  users: string[];
  defaultStatus?: string;
  onClose: () => void;
  onSave: (data: Partial<FmTask>) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? defaultStatus ?? "todo");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [assignee, setAssignee] = useState(task?.assigneeName ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [projectId, setProjectId] = useState<number | null>(task?.projectId ?? null);
  const [tags, setTags] = useState(task?.tags ?? "");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Add details…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Project</label>
              <select value={projectId ?? ""} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assignee</label>
            <input value={assignee} onChange={e => setAssignee(e.target.value)}
              list="assignee-list" placeholder="Name or email…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <datalist id="assignee-list">{users.map(u => <option key={u} value={u} />)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. design, urgent, backend"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => {
            if (!title.trim()) return;
            onSave({ title: title.trim(), description: description || null, status, priority, assigneeName: assignee || null, dueDate: dueDate || null, projectId, tags: tags || null });
          }} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            {task ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Detail Panel ──────────────────────────────────────────────────────
function EmployeeDetailPanel({ row, tasks, onClose }: {
  row: SystemActivity;
  tasks: FmTask[];
  onClose: () => void;
}) {
  const BASE_PROXY = import.meta.env.BASE_URL.replace(/\/$/, "");
  const status = activityStatus(row);
  const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
  const photoUrl = row.erpImage
    ? `${BASE_PROXY}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}`
    : null;

  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const assignedTasks = tasks.filter(t =>
    (t.assigneeName && displayName && t.assigneeName.toLowerCase().includes(displayName.split(" ")[0].toLowerCase())) ||
    (t.assigneeEmail && row.email && t.assigneeEmail.toLowerCase() === row.email.toLowerCase())
  );

  useEffect(() => {
    if (!row.deviceUsername) { setHistoryLoading(false); return; }
    fetch(`${BASE_PROXY}/api/activity/${encodeURIComponent(row.deviceUsername)}/history`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [row.deviceUsername]);

  const tasksByStatus = {
    todo: assignedTasks.filter(t => t.status === "todo"),
    in_progress: assignedTasks.filter(t => t.status === "in_progress"),
    review: assignedTasks.filter(t => t.status === "review"),
    done: assignedTasks.filter(t => t.status === "done"),
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className={`flex-shrink-0 border-b ${status === "active" ? "bg-gradient-to-r from-green-600 to-emerald-600 border-green-700" : status === "idle" ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-600" : "bg-gradient-to-r from-gray-600 to-gray-700 border-gray-700"}`}>
        <div className="px-6 py-3 flex items-center gap-4">
          <button onClick={onClose} className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Team Pulse
          </button>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full bg-white ${status === "active" ? "animate-pulse" : "opacity-60"}`} />
            <span className="text-white text-sm font-semibold">{STATUS_LABEL[status]}</span>
          </div>
          {status === "idle" && row.idleSeconds > 0 && (
            <span className="text-white/80 text-xs flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5" /> Idle for {formatDuration(row.idleSeconds)}
            </span>
          )}
          {status === "offline" && (
            <span className="text-white/70 text-xs">Last seen {timeSince(row.lastSeen)}</span>
          )}
          <div className="ml-auto text-white/60 text-xs">{timeSince(row.lastSeen)}</div>
        </div>
      </div>

      {/* Main layout: left profile + right content */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Employee profile sidebar */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Avatar + name */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="relative inline-block mb-4">
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="w-24 h-24 rounded-2xl object-cover border-4 border-gray-100 shadow-lg mx-auto" />
              ) : (
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg mx-auto ${status === "active" ? "bg-gradient-to-br from-green-400 to-emerald-600" : status === "idle" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-gray-300 to-gray-500"}`}>
                  {initials(displayName)}
                </div>
              )}
              <span className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />
            </div>
            <h2 className="text-base font-bold text-gray-900">{displayName}</h2>
            {row.designation && <div className="text-sm text-blue-600 font-medium mt-0.5">{row.designation}</div>}
            {row.department && <div className="text-xs text-gray-500 mt-0.5">{row.department}</div>}
            {row.erpEmployeeId && (
              <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-full text-[11px] font-mono text-gray-500">{row.erpEmployeeId}</div>
            )}
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-3 flex-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Employee Details</div>
            {row.email && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-gray-400 mb-0.5">Email</div>
                <div className="text-xs font-medium text-gray-700 break-all">{row.email}</div>
              </div>
            )}
            {row.deviceUsername && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-gray-400 mb-0.5">Device User</div>
                <div className="text-xs font-mono font-medium text-gray-700">{row.deviceUsername}</div>
              </div>
            )}
            {row.deviceName && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] text-gray-400 mb-0.5">Device Name</div>
                <div className="text-xs font-medium text-gray-700">{row.deviceName}</div>
              </div>
            )}

            {/* Task summary mini-stats */}
            <div className="pt-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Task Summary</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "In Progress", count: tasksByStatus.in_progress.length, color: "text-blue-600 bg-blue-50" },
                  { label: "To Do", count: tasksByStatus.todo.length, color: "text-gray-600 bg-gray-100" },
                  { label: "In Review", count: tasksByStatus.review.length, color: "text-amber-600 bg-amber-50" },
                  { label: "Done", count: tasksByStatus.done.length, color: "text-green-600 bg-green-50" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-3 py-2.5 ${s.color}`}>
                    <div className="text-xl font-bold">{s.count}</div>
                    <div className="text-[10px] font-medium opacity-80">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Activity + tasks */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">

            {/* Current Activity Banner */}
            <div className={`rounded-2xl border p-5 ${status === "active" ? "bg-green-50 border-green-200" : status === "idle" ? "bg-amber-50 border-amber-200" : "bg-gray-100 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className={`w-4 h-4 ${status === "active" ? "text-green-600" : status === "idle" ? "text-amber-600" : "text-gray-400"}`} />
                <span className="text-sm font-bold text-gray-800">Current Activity</span>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> Updated {timeSince(row.lastSeen)}
                </div>
              </div>
              {status !== "offline" && row.activeApp ? (
                <div>
                  <div className="text-xl font-bold text-gray-900 mb-1">{row.activeApp}</div>
                  {row.windowTitle && row.windowTitle !== row.activeApp && (
                    <div className="text-sm text-gray-500" title={row.windowTitle}>{row.windowTitle}</div>
                  )}
                  {status === "idle" && row.idleSeconds > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-xs font-semibold">
                      <Coffee className="w-3.5 h-3.5" /> Idle for {formatDuration(row.idleSeconds)} — no keyboard/mouse activity
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm">No activity detected — device is offline</div>
              )}
            </div>

            {/* Activity History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-800">Activity Timeline</h3>
                <span className="ml-auto text-xs text-gray-400">Last 50 events</span>
              </div>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-400 italic">No activity history recorded yet</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {history.map((log, i) => (
                      <div key={log.id} className={`flex items-center gap-4 px-5 py-3 ${i === 0 ? "bg-blue-50/40" : "hover:bg-gray-50"} transition-colors`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.isActive ? "bg-green-500" : "bg-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{log.activeApp || "—"}</div>
                          {log.windowTitle && log.windowTitle !== log.activeApp && (
                            <div className="text-xs text-gray-400 truncate">{log.windowTitle}</div>
                          )}
                        </div>
                        {log.idleSeconds > 0 && (
                          <span className="text-[11px] text-amber-500 font-medium flex-shrink-0">Idle {formatDuration(log.idleSeconds)}</span>
                        )}
                        <div className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{timeSince(log.loggedAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-800">Assigned Tasks</h3>
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-500">{assignedTasks.length}</span>
              </div>
              {assignedTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-400 italic">No tasks assigned to this employee</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["in_progress", "todo", "review", "done"] as const).map(s => {
                    const col = COLUMNS.find(c => c.id === s)!;
                    const sTasks = tasksByStatus[s];
                    if (sTasks.length === 0) return null;
                    return (
                      <div key={s} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className={`px-4 py-2.5 border-b text-xs font-bold flex items-center gap-2 ${s === "in_progress" ? "bg-blue-50 border-blue-100 text-blue-700" : s === "done" ? "bg-green-50 border-green-100 text-green-700" : s === "review" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-gray-50 border-gray-100 text-gray-600"}`}>
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          {col.label}
                          <span className="ml-auto opacity-60">{sTasks.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {sTasks.map(t => (
                            <div key={t.id} className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{t.title}</div>
                              {t.description && <div className="text-xs text-gray-400 line-clamp-1 mb-1.5">{t.description}</div>}
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${priorityColor(t.priority)}`}>{t.priority}</span>
                                {t.dueDate && (
                                  <span className={`text-[10px] flex items-center gap-0.5 ${new Date(t.dueDate) < new Date() && t.status !== "done" ? "text-red-500" : "text-gray-400"}`}>
                                    <Calendar className="w-3 h-3" /> {t.dueDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary Report ─────────────────────────────────────────────────────────────
function SummaryReport({ activity, tasks, onClose }: {
  activity: SystemActivity[];
  tasks: FmTask[];
  onClose: () => void;
}) {
  const BASE_PROXY = import.meta.env.BASE_URL.replace(/\/$/, "");

  const rows = activity.map(row => {
    const status = activityStatus(row);
    const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
    const assignedTasks = tasks.filter(t =>
      (t.assigneeName && displayName && t.assigneeName.toLowerCase().includes(displayName.split(" ")[0].toLowerCase())) ||
      (t.assigneeEmail && row.email && t.assigneeEmail.toLowerCase() === row.email.toLowerCase())
    );
    return {
      ...row,
      status,
      displayName,
      totalTasks: assignedTasks.length,
      inProgress: assignedTasks.filter(t => t.status === "in_progress").length,
      done: assignedTasks.filter(t => t.status === "done").length,
      todo: assignedTasks.filter(t => t.status === "todo").length,
      photoUrl: row.erpImage ? `${BASE_PROXY}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}` : null,
    };
  }).sort((a, b) => {
    const order = { active: 0, idle: 1, offline: 2 };
    return order[a.status] - order[b.status];
  });

  const exportCsv = () => {
    const header = ["Name", "Department", "Designation", "Status", "Current App", "Window Title", "Idle Time", "Last Seen", "Tasks Total", "In Progress", "Done", "Todo"];
    const csvRows = rows.map(r => [
      r.displayName, r.department, r.designation, r.status,
      r.activeApp, r.windowTitle, r.idleSeconds > 0 ? formatDuration(r.idleSeconds) : "-",
      timeSince(r.lastSeen), r.totalTasks, r.inProgress, r.done, r.todo,
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_summary_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-500" /> Activity Summary Report
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Live snapshot — {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            {rows.filter(r => r.status === "active").length} Active
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            {rows.filter(r => r.status === "idle").length} Idle
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            {rows.filter(r => r.status === "offline").length} Offline
          </div>
          <div className="ml-auto text-xs text-gray-400">{rows.length} employees total</div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-52">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">What They're Doing</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Idle</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Tasks</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600">In Progress</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-green-600">Done</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.deviceUsername || r.email} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        {r.photoUrl ? (
                          <img src={r.photoUrl} alt={r.displayName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${r.status === "active" ? "bg-gradient-to-br from-green-400 to-emerald-600" : r.status === "idle" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
                            {initials(r.displayName)}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_DOT[r.status]}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-xs">{r.displayName}</div>
                        <div className="text-[10px] text-gray-400 truncate">{r.department || r.designation || r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status === "active" ? "bg-green-100 text-green-700" : r.status === "idle" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    {r.status !== "offline" && r.activeApp ? (
                      <div>
                        <div className="text-xs font-medium text-gray-800 truncate">{r.activeApp}</div>
                        {r.windowTitle && r.windowTitle !== r.activeApp && (
                          <div className="text-[10px] text-gray-400 truncate" title={r.windowTitle}>{r.windowTitle}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No activity</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.idleSeconds > 0 ? (
                      <span className="text-xs text-amber-600 font-medium">{formatDuration(r.idleSeconds)}</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-semibold text-gray-700">{r.totalTasks}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.inProgress > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{r.inProgress}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.done > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">{r.done}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-gray-400">{timeSince(r.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Activity Card ──────────────────────────────────────────────────────────────
const BASE_PROXY = import.meta.env.BASE_URL.replace(/\/$/, "");

function ActivityCard({ row, onRefresh, onClick }: { row: SystemActivity; onRefresh: () => void; onClick: () => void }) {
  const status = activityStatus(row);
  const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
  const photoUrl = row.erpImage
    ? `${BASE_PROXY}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}`
    : null;

  const isUnmatched = !row.erpEmployeeId;

  const [editing, setEditing] = useState(false);
  const [erpInput, setErpInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSaveOverride = async () => {
    if (!erpInput.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const r = await fetch(
        `${BASE_PROXY}/api/activity/${encodeURIComponent(row.deviceUsername)}/erp-override`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erpUsername: erpInput.trim() }) }
      );
      const data = await r.json();
      if (!r.ok) { setSaveError(data.error || "Failed"); return; }
      setEditing(false);
      setErpInput("");
      onRefresh();
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${status === "active" ? "border-green-200 hover:border-green-300" : status === "idle" ? "border-amber-200 hover:border-amber-300" : "border-gray-200 opacity-70 hover:opacity-100"}`}
      onClick={onClick}
    >
      {/* Employee header */}
      <div className={`px-4 pt-4 pb-3 ${status === "active" ? "bg-green-50/40" : status === "idle" ? "bg-amber-50/40" : "bg-gray-50/40"}`}>
        <div className="flex items-start gap-3">
          {/* Photo or initials */}
          <div className="flex-shrink-0 relative">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border-2 border-white shadow-sm ${status === "active" ? "bg-gradient-to-br from-green-400 to-emerald-600" : status === "idle" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
                {initials(displayName)}
              </div>
            )}
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 truncate">{displayName}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${status === "active" ? "bg-green-100 text-green-700" : status === "idle" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            {row.designation && (
              <div className="text-[11px] text-blue-600 font-medium truncate mt-0.5">{row.designation}</div>
            )}
            {row.department && (
              <div className="text-[11px] text-gray-500 truncate">{row.department}</div>
            )}
            {/* Idle / Active time pill */}
            {status === "idle" && row.idleSeconds > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200">
                <Coffee className="w-3 h-3 text-amber-600" />
                <span className="text-[11px] font-semibold text-amber-700">Idle {formatDuration(row.idleSeconds)}</span>
              </div>
            )}
            {status === "active" && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                <span className="text-[11px] font-semibold text-green-700">Active now</span>
              </div>
            )}
            {status === "offline" && (
              <div className="mt-1 text-[10px] text-gray-400">
                Last seen {timeSince(row.lastSeen)}
              </div>
            )}
            {row.erpEmployeeId ? (
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {row.erpEmployeeId}</div>
            ) : (
              <div className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not matched to ERPNext
              </div>
            )}
          </div>

          {/* Link / Edit button */}
          <button
            onClick={e => { e.stopPropagation(); setEditing(v => !v); setSaveError(""); setErpInput(""); }}
            title={isUnmatched ? "Link to ERPNext employee" : "Change ERPNext link"}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isUnmatched ? "bg-amber-50 text-amber-500 hover:bg-amber-100" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}>
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inline override form */}
        {editing && (
          <div className="mt-3 p-3 bg-white border border-blue-200 rounded-xl space-y-2" onClick={e => e.stopPropagation()}>
            <div className="text-[11px] font-semibold text-gray-600">Enter ERPNext username or employee ID</div>
            <div className="text-[10px] text-gray-400">e.g. WTT1194 or john.doe</div>
            <div className="flex gap-1.5">
              <input
                value={erpInput}
                onChange={e => setErpInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveOverride()}
                placeholder="e.g. WTT1194"
                autoFocus
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveOverride}
                disabled={saving || !erpInput.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {saving ? "" : "Link"}
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {saveError && <div className="text-[10px] text-red-500">{saveError}</div>}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="px-4 py-3 space-y-1.5">
        {status !== "offline" ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Monitor className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium truncate">{row.activeApp || "—"}</span>
            </div>
            {row.windowTitle && row.windowTitle !== row.activeApp && (
              <div className="text-[11px] text-gray-400 truncate ml-4" title={row.windowTitle}>{row.windowTitle}</div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-400 italic">No recent activity</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-1 border-t border-gray-100 flex items-center justify-between">
        <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={row.deviceName}>{row.deviceName || row.deviceUsername}</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-400">{timeSince(row.lastSeen)}</div>
          <span className="text-[10px] text-blue-400 font-medium flex items-center gap-0.5">
            Details <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TaskManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"tasks" | "monitor">("tasks");

  // Employee profile
  const [empProfile, setEmpProfile] = useState<EmployeeProfile | null>(null);
  const [empLoading, setEmpLoading] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<FmTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; task?: FmTask | null; defaultStatus?: string }>({ open: false });

  // Activity state
  const [activity, setActivity] = useState<SystemActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<SystemActivity | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [monitorView, setMonitorView] = useState<"grid" | "list">("grid");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorStatus, setMonitorStatus] = useState("all");
  const [monitorDept, setMonitorDept] = useState("all");

  // Load tasks
  const loadTasks = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/api/fm-tasks`).then(r => r.ok ? r.json() : []),
      fetch(`${BASE}/api/projects`).then(r => r.ok ? r.json() : []),
    ]).then(([t, p]) => {
      setTasks(Array.isArray(t) ? t : []);
      setProjects(Array.isArray(p) ? p : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Load activity
  const loadActivity = useCallback(() => {
    fetch(`${BASE}/api/activity/live`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setActivity(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Fetch logged user's employee profile
  useEffect(() => {
    if (!user?.email) return;
    setEmpLoading(true);
    fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setEmpProfile({
            email: data.email,
            full_name: data.full_name,
            username: data.username || user.username || null,
            employee_number: data.employee_number || null,
            designation: data.designation || null,
            department: data.department || null,
            company: data.company || null,
            branch: data.branch || null,
            date_of_joining: data.date_of_joining || null,
            employment_type: data.employment_type || null,
            gender: data.gender || null,
            employee_status: data.employee_status || null,
            reports_to: data.reports_to || null,
            grade: data.grade || null,
            photo: data.photo ? `${BASE}/api/auth/photo?url=${encodeURIComponent(data.photo)}` : (user.photo || null),
          });
        }
      })
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, [user?.email]);

  useEffect(() => {
    if (tab === "monitor") {
      setActivityLoading(true);
      fetch(`${BASE}/api/activity/live`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setActivity(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setActivityLoading(false));
      activityIntervalRef.current = setInterval(loadActivity, 30000);
    }
    return () => {
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    };
  }, [tab, loadActivity]);

  // Task CRUD
  const createTask = async (data: Partial<FmTask>) => {
    const body = { ...data, createdBy: user?.email ?? "unknown", status: data.status ?? "todo" };
    const r = await fetch(`${BASE}/api/fm-tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { loadTasks(); setModal({ open: false }); }
  };

  const updateTask = async (id: number, data: Partial<FmTask>) => {
    const r = await fetch(`${BASE}/api/fm-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { loadTasks(); setModal({ open: false }); }
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    const r = await fetch(`${BASE}/api/fm-tasks/${id}`, { method: "DELETE" });
    if (r.ok) loadTasks();
  };

  const moveTask = async (id: number, newStatus: string) => {
    await fetch(`${BASE}/api/fm-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  // Filters
  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.assigneeName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterProject !== "all" && String(t.projectId ?? "") !== filterProject) return false;
    return true;
  });

  const userNames = [...new Set(tasks.filter(t => t.assigneeName).map(t => t.assigneeName!))];

  // Stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  // Activity stats
  const activeCount = activity.filter(a => activityStatus(a) === "active").length;
  const idleCount = activity.filter(a => activityStatus(a) === "idle").length;
  const offlineCount = activity.filter(a => activityStatus(a) === "offline").length;

  // Monitor filters
  const monitorDepts = [...new Set(activity.map(a => a.department).filter(Boolean))].sort();
  const filteredActivity = activity
    .filter(a => {
      const name = (a.fullName || a.deviceUsername || a.email).toLowerCase();
      if (monitorSearch && !name.includes(monitorSearch.toLowerCase()) && !(a.department || "").toLowerCase().includes(monitorSearch.toLowerCase())) return false;
      if (monitorStatus !== "all" && activityStatus(a) !== monitorStatus) return false;
      if (monitorDept !== "all" && a.department !== monitorDept) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { active: 0, idle: 1, offline: 2 };
      return order[activityStatus(a)] - order[activityStatus(b)];
    });

  const downloadAgent = () => {
    const agentUrl = `${BASE}/tools/flowmatrix_activity_agent.py`;
    const a = document.createElement("a");
    a.href = agentUrl;
    a.download = "flowmatrix_activity_agent.py";
    a.click();
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Task Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage tasks and monitor team activity in real time</p>
            </div>
            <div className="flex items-center gap-2">
              {tab === "tasks" && (
                <button onClick={() => setModal({ open: true })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> New Task
                </button>
              )}
              {tab === "monitor" && (
                <>
                  <button onClick={() => setShowSummary(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                    <BarChart2 className="w-4 h-4" /> Summary Report
                  </button>
                  <button onClick={downloadAgent}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                    <Download className="w-4 h-4" /> Download Agent
                  </button>
                </>
              )}
              <button onClick={tab === "tasks" ? loadTasks : loadActivity}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs + Stats */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setTab("tasks")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "tasks" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <CheckSquare className="w-3.5 h-3.5" /> Tasks
              </button>
              <button onClick={() => setTab("monitor")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "monitor" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Activity className="w-3.5 h-3.5" /> Team Pulse
                {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center font-bold">{activeCount}</span>}
              </button>
            </div>

            {tab === "tasks" && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-400" />{stats.todo} To Do</div>
                <div className="flex items-center gap-1.5 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500" />{stats.inProgress} In Progress</div>
                <div className="flex items-center gap-1.5 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />{stats.done} Done</div>
                <div className="text-gray-400">{stats.total} total</div>
              </div>
            )}

            {tab === "monitor" && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />{activeCount} Active</div>
                <div className="flex items-center gap-1.5 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400" />{idleCount} Idle</div>
                <div className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300" />{offlineCount} Offline</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TASKS TAB ── */}
        {tab === "tasks" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logged User Profile Card */}
            {empLoading ? (
              <div className="mx-6 mt-4 mb-2 h-20 bg-white border border-gray-200 rounded-2xl animate-pulse flex-shrink-0" />
            ) : empProfile && (
              <div className="mx-6 mt-4 mb-2 bg-white border border-blue-100 rounded-2xl shadow-sm px-5 py-4 flex items-start gap-4 flex-shrink-0">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {empProfile.photo ? (
                    <img src={empProfile.photo} alt={empProfile.full_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {initials(empProfile.full_name)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h2 className="text-base font-bold text-gray-900 truncate">{empProfile.full_name}</h2>
                    {empProfile.employee_status && (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${empProfile.employee_status === "Active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                        {empProfile.employee_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 mb-2">
                    {empProfile.username && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-blue-500" />
                        <span className="font-medium text-blue-700">{empProfile.username}</span>
                      </span>
                    )}
                    {empProfile.employee_number && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <span className="font-semibold text-gray-600">ID:</span> {empProfile.employee_number}
                      </span>
                    )}
                    {empProfile.designation && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-gray-400" />
                        {empProfile.designation}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                    {empProfile.department && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        {empProfile.department}
                      </span>
                    )}
                    {empProfile.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {empProfile.company}
                      </span>
                    )}
                    {empProfile.branch && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {empProfile.branch}
                      </span>
                    )}
                    {empProfile.date_of_joining && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        Joined {empProfile.date_of_joining}
                      </span>
                    )}
                    {empProfile.employment_type && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-medium border border-indigo-100">
                        {empProfile.employment_type}
                      </span>
                    )}
                    {empProfile.grade && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-medium border border-amber-100">
                        Grade: {empProfile.grade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Priorities</option>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-4 px-6 py-5 min-w-max h-full">
                {COLUMNS.map(col => {
                  const colTasks = filtered.filter(t => t.status === col.id);
                  return (
                    <div key={col.id} className={`flex flex-col w-72 flex-shrink-0 rounded-2xl border ${col.border} ${col.bg}`}>
                      {/* Column header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                          <span className="text-sm font-semibold text-gray-800">{col.label}</span>
                          <span className="ml-1 px-1.5 py-0.5 bg-white border border-gray-200 text-xs font-semibold text-gray-500 rounded-full">{colTasks.length}</span>
                        </div>
                        <button onClick={() => setModal({ open: true, defaultStatus: col.id })}
                          className="p-1 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                              <CheckSquare className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400">No tasks here</p>
                          </div>
                        ) : colTasks.map(task => {
                          const proj = projects.find(p => p.id === task.projectId);
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                          return (
                            <div key={task.id}
                              className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                              onClick={() => setModal({ open: true, task })}>
                              <div className="flex items-start justify-between gap-1 mb-2">
                                <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{task.title}</p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setModal({ open: true, task })}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => deleteTask(task.id)}
                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{task.description}</p>
                              )}

                              <div className="flex items-center flex-wrap gap-1.5 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                {proj && (
                                  <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[10px] text-blue-600 rounded-full font-medium truncate max-w-[100px]" title={proj.name}>
                                    {proj.name}
                                  </span>
                                )}
                                {task.tags && task.tags.split(",").slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-[10px] text-gray-500 rounded-full">{tag.trim()}</span>
                                ))}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {task.assigneeName && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white" title={task.assigneeName}>
                                      {initials(task.assigneeName)}
                                    </div>
                                  )}
                                </div>
                                {task.dueDate && (
                                  <div className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                                    <Calendar className="w-3 h-3" />
                                    {task.dueDate}
                                  </div>
                                )}
                              </div>

                              {/* Move to */}
                              <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1" onClick={e => e.stopPropagation()}>
                                {COLUMNS.filter(c => c.id !== col.id).map(c => (
                                  <button key={c.id} onClick={() => moveTask(task.id, c.id)}
                                    className="flex-1 text-center text-[9px] py-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 truncate transition-colors">
                                    → {c.label}
                                  </button>
                                ))}
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
          </div>
        )}

        {/* ── TEAM PULSE TAB ── */}
        {tab === "monitor" && (
          <div className="flex-1 flex flex-col min-h-0">
            {activityLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activity.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="max-w-lg text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Monitor className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No agents connected</h3>
                  <p className="text-sm text-gray-500 mb-6">Install and run the FlowMatriX Activity Agent on each PC to see live activity here. The agent sends heartbeats every 30 seconds.</p>
                  <div className="bg-gray-900 rounded-xl p-4 text-left text-sm mb-4">
                    <p className="text-green-400 font-mono text-xs mb-2"># Install and run the agent</p>
                    <p className="text-gray-300 font-mono text-xs">pip install requests pygetwindow psutil</p>
                    <p className="text-gray-300 font-mono text-xs mt-1">python flowmatrix_activity_agent.py</p>
                  </div>
                  <button onClick={downloadAgent}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    <Download className="w-4 h-4" /> Download Agent Script
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Filter bar */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
                  {/* Status pills */}
                  <div className="flex items-center gap-1">
                    {[
                      { key: "all", label: `All (${activity.length})` },
                      { key: "active", label: `Active (${activeCount})` },
                      { key: "idle", label: `Idle (${idleCount})` },
                      { key: "offline", label: `Offline (${offlineCount})` },
                    ].map(s => (
                      <button key={s.key} onClick={() => setMonitorStatus(s.key)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${monitorStatus === s.key
                          ? s.key === "active" ? "bg-green-500 text-white" : s.key === "idle" ? "bg-amber-400 text-white" : s.key === "offline" ? "bg-gray-400 text-white" : "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-gray-200" />

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={monitorSearch} onChange={e => setMonitorSearch(e.target.value)}
                      placeholder="Search name or dept…"
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
                  </div>

                  {/* Department filter */}
                  {monitorDepts.length > 0 && (
                    <select value={monitorDept} onChange={e => setMonitorDept(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Departments</option>
                      {monitorDepts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">{filteredActivity.length} shown · refreshes 30s</span>
                    {/* View toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                      <button onClick={() => setMonitorView("grid")}
                        className={`p-1.5 rounded-md transition-all ${monitorView === "grid" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button onClick={() => setMonitorView("list")}
                        className={`p-1.5 rounded-md transition-all ${monitorView === "list" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                  {filteredActivity.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="text-center">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No employees match your filters</p>
                        <button onClick={() => { setMonitorSearch(""); setMonitorStatus("all"); setMonitorDept("all"); }}
                          className="mt-2 text-xs text-blue-500 hover:underline">Clear filters</button>
                      </div>
                    </div>
                  ) : monitorView === "grid" ? (
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredActivity.map(row => (
                          <ActivityCard
                            key={row.deviceUsername || row.email}
                            row={row}
                            onRefresh={loadActivity}
                            onClick={() => setSelectedEmployee(row)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* LIST VIEW */
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-56">Employee</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Current App</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Window / Document</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Idle</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredActivity.map(row => {
                          const st = activityStatus(row);
                          const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
                          const BASE_PROXY2 = import.meta.env.BASE_URL.replace(/\/$/, "");
                          const photoUrl2 = row.erpImage ? `${BASE_PROXY2}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}` : null;
                          return (
                            <tr key={row.deviceUsername || row.email}
                              className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                              onClick={() => setSelectedEmployee(row)}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-shrink-0">
                                    {photoUrl2 ? (
                                      <img src={photoUrl2} alt={displayName} className="w-9 h-9 rounded-xl object-cover" />
                                    ) : (
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white ${st === "active" ? "bg-gradient-to-br from-green-400 to-emerald-600" : st === "idle" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
                                        {initials(displayName)}
                                      </div>
                                    )}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[st]}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-700 transition-colors">{displayName}</div>
                                    {row.designation && <div className="text-[11px] text-gray-400 truncate">{row.designation}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st === "active" ? "bg-green-100 text-green-700" : st === "idle" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABEL[st]}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{row.activeApp || <span className="text-gray-300 italic">—</span>}</div>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <div className="text-xs text-gray-500 truncate" title={row.windowTitle}>{row.windowTitle && row.windowTitle !== row.activeApp ? row.windowTitle : <span className="text-gray-300">—</span>}</div>
                              </td>
                              <td className="px-4 py-3">
                                {row.idleSeconds > 0 ? (
                                  <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                    <Coffee className="w-3 h-3" /> {formatDuration(row.idleSeconds)}
                                  </span>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-gray-500 truncate max-w-[120px] block">{row.department || "—"}</span>
                              </td>
                              <td className="px-5 py-3 text-right text-xs text-gray-400">{timeSince(row.lastSeen)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {modal.open && (
        <TaskModal
          task={modal.task}
          projects={projects}
          users={userNames}
          defaultStatus={modal.defaultStatus}
          onClose={() => setModal({ open: false })}
          onSave={data => modal.task ? updateTask(modal.task.id, data) : createTask(data)}
        />
      )}

      {/* Employee Detail Panel */}
      {selectedEmployee && (
        <EmployeeDetailPanel
          row={selectedEmployee}
          tasks={tasks}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* Summary Report Modal */}
      {showSummary && (
        <SummaryReport
          activity={activity}
          tasks={tasks}
          onClose={() => setShowSummary(false)}
        />
      )}
    </Layout>
  );
}
