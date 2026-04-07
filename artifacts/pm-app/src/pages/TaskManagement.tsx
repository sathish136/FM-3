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
  systemLoginToday?: string | null;
  systemLogoutToday?: string | null;
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

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
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

interface AssigneeOption { name: string; email: string; designation?: string; department?: string; }

// ── Task Modal ─────────────────────────────────────────────────────────────────
function TaskModal({
  task, projects, defaultStatus, onClose, onSave,
}: {
  task?: FmTask | null;
  projects: Project[];
  defaultStatus?: string;
  onClose: () => void;
  onSave: (data: Partial<FmTask>) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? defaultStatus ?? "todo");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [assigneeEmail, setAssigneeEmail] = useState(task?.assigneeEmail ?? "");
  const [assigneeName, setAssigneeName] = useState(task?.assigneeName ?? "");
  const [assigneeSearch, setAssigneeSearch] = useState(task?.assigneeName ?? task?.assigneeEmail ?? "");
  const [showAssigneeList, setShowAssigneeList] = useState(false);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [projectId, setProjectId] = useState<number | null>(task?.projectId ?? null);
  const [tags, setTags] = useState(task?.tags ?? "");

  const BASE_PROXY = import.meta.env.BASE_URL.replace(/\/$/, "");
  useEffect(() => {
    fetch(`${BASE_PROXY}/api/fm-tasks/assignees`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAssignees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const filtered = assignees.filter(a =>
    !assigneeSearch || a.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    (a.department || "").toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const selectAssignee = (a: AssigneeOption) => {
    setAssigneeEmail(a.email);
    setAssigneeName(a.name);
    setAssigneeSearch(a.name);
    setShowAssigneeList(false);
  };

  const clearAssignee = () => {
    setAssigneeEmail(""); setAssigneeName(""); setAssigneeSearch(""); setShowAssigneeList(false);
  };

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

          {/* Assignee picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assignee</label>
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                {assigneeEmail ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {initials(assigneeName || assigneeEmail)}
                  </div>
                ) : (
                  <User className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <input
                  value={assigneeSearch}
                  onChange={e => { setAssigneeSearch(e.target.value); setShowAssigneeList(true); if (!e.target.value) clearAssignee(); }}
                  onFocus={() => setShowAssigneeList(true)}
                  placeholder="Search employee name or email…"
                  className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                />
                {assigneeEmail && (
                  <button onClick={clearAssignee} className="flex-shrink-0 text-gray-300 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {assigneeEmail && (
                <div className="mt-1 text-[11px] text-green-600 font-medium flex items-center gap-1 px-1">
                  <CheckCircle2 className="w-3 h-3" /> {assigneeEmail} — will receive a notification
                </div>
              )}
              {showAssigneeList && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                  {filtered.slice(0, 10).map(a => (
                    <button key={a.email} onMouseDown={() => selectAssignee(a)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {initials(a.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{a.name}</div>
                        <div className="text-xs text-gray-400 truncate">{a.email}{a.designation ? ` · ${a.designation}` : ""}</div>
                      </div>
                      {a.department && <span className="text-[10px] text-gray-400 flex-shrink-0">{a.department}</span>}
                    </button>
                  ))}
                  {assignees.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center italic">No employees found in system yet</div>
                  )}
                </div>
              )}
              {showAssigneeList && (
                <div className="fixed inset-0 z-40" onClick={() => setShowAssigneeList(false)} />
              )}
            </div>
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
            onSave({
              title: title.trim(), description: description || null, status, priority,
              assigneeName: assigneeName || assigneeSearch || null,
              assigneeEmail: assigneeEmail || null,
              dueDate: dueDate || null, projectId, tags: tags || null,
            });
          }} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            {task ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Productivity helpers ────────────────────────────────────────────────────────
const PRODUCTIVE_APPS = [
  "autocad","solidworks","catia","inventor","fusion","freecad","sketchup","revit",
  "word","excel","powerpoint","outlook","onenote","access","publisher","visio",
  "teams","zoom","meet","webex","slack","skype",
  "erpnext","sap","tally","quickbooks","odoo","frappe",
  "code","vscode","pycharm","intellij","eclipse","android studio","xcode","netbeans","sublime","atom","vim","notepad++",
  "photoshop","illustrator","premiere","after effects","lightroom","indesign","figma","sketch","affinity","blender",
  "terminal","cmd","powershell","bash","git","postman","filezilla","putty","winscp",
  "chrome","firefox","edge","safari","brave",
  "acrobat","pdf","reader","foxit",
  "autocorrect","notepad","wordpad",
];
const UNPRODUCTIVE_APPS = [
  "youtube","netflix","prime","hotstar","disney","hbo","hulu","twitch","spotify",
  "facebook","instagram","twitter","x.com","tiktok","snapchat","reddit","pinterest","telegram","whatsapp",
  "steam","epic games","battlenet","valorant","minecraft","gta","fortnite","pubg","roblox",
  "vlc","wmplayer","media player","winamp","itunes","groove music",
  "solitaire","minesweeper","chess","candy crush","game",
];

function classifyApp(app: string): "productive" | "unproductive" | "neutral" {
  if (!app) return "neutral";
  const lower = app.toLowerCase();
  if (UNPRODUCTIVE_APPS.some(u => lower.includes(u))) return "unproductive";
  if (PRODUCTIVE_APPS.some(p => lower.includes(p))) return "productive";
  return "neutral";
}

function calcProductivityScore(history: ActivityLog[], currentRow: SystemActivity): number {
  const entries = history.length > 0 ? history : [];
  if (entries.length === 0) {
    if (activityStatus(currentRow) === "active") return 70;
    if (activityStatus(currentRow) === "idle") return 20;
    return 0;
  }
  let score = 0;
  let total = 0;
  for (const e of entries) {
    const cls = classifyApp(e.activeApp);
    const idlePenalty = Math.min(e.idleSeconds / 300, 1);
    const pts = cls === "productive" ? 1 : cls === "unproductive" ? 0 : 0.5;
    const weight = 1 - idlePenalty * 0.7;
    score += pts * weight;
    total += 1;
  }
  return total === 0 ? 50 : Math.round((score / total) * 100);
}

// ── Employee Detail Panel ──────────────────────────────────────────────────────
function EmployeeDetailPanel({ row, tasks, onClose, erpCheckin, date }: {
  row: SystemActivity;
  tasks: FmTask[];
  onClose: () => void;
  erpCheckin?: { checkIn?: string; checkOut?: string };
  date: string;
}) {
  const BASE_PROXY = import.meta.env.BASE_URL.replace(/\/$/, "");
  const status = activityStatus(row);
  const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
  const photoUrl = row.erpImage
    ? `${BASE_PROXY}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}`
    : null;

  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [costInfo, setCostInfo] = useState<{
    available: boolean; monthlySalary?: number|null; monthlyNet?: number|null;
    hourlyRate?: number|null; dailyRate?: number|null; slipDate?: string|null;
    salarySource?: string; activeHoursToday?: number; idleHoursToday?: number;
    workingCostToday?: number|null; idleCostToday?: number|null;
  } | null>(null);
  const [erpCheckinDirect, setErpCheckinDirect] = useState<{ checkIn?: string; checkOut?: string } | null>(null);
  const [erpProjects, setErpProjects] = useState<Array<{ id: number; name: string; erpnextName: string }>>([]);

  const assignedTasks = tasks.filter(t =>
    (t.assigneeName && displayName && t.assigneeName.toLowerCase().includes(displayName.split(" ")[0].toLowerCase())) ||
    (t.assigneeEmail && row.email && t.assigneeEmail.toLowerCase() === row.email.toLowerCase())
  );

  useEffect(() => {
    if (!row.deviceUsername) { setHistoryLoading(false); return; }
    setHistoryLoading(true);
    fetch(`${BASE_PROXY}/api/activity/${encodeURIComponent(row.deviceUsername)}/history?date=${date}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [row.deviceUsername, date]);

  useEffect(() => {
    if (!row.deviceUsername) return;
    fetch(`${BASE_PROXY}/api/activity/${encodeURIComponent(row.deviceUsername)}/cost-info?date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setCostInfo(d))
      .catch(() => {});
  }, [row.deviceUsername, date]);

  useEffect(() => {
    if (!row.erpEmployeeId) return;
    fetch(`${BASE_PROXY}/api/activity/checkins-today?date=${date}`)
      .then(r => r.ok ? r.json() : {})
      .then((map: Record<string, { checkIn?: string; checkOut?: string }>) => {
        setErpCheckinDirect(map[row.erpEmployeeId] ?? null);
      })
      .catch(() => {});
  }, [row.erpEmployeeId, date]);

  useEffect(() => {
    fetch(`${BASE_PROXY}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setErpProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Extract project numbers from a string (e.g. "WTT-PROJ-001", "PRJ-0023", "2425-XX-001")
  function extractProjectRefs(text: string): string[] {
    if (!text) return [];
    const matches: string[] = [];
    // ERPNext project name pattern (e.g. WTT-PROJ-0001)
    const m1 = text.match(/\b[A-Z]{2,6}-[A-Z]{2,6}-\d{3,5}\b/g);
    if (m1) matches.push(...m1);
    // Year-based pattern like 2425-ME-001
    const m2 = text.match(/\b\d{4}-[A-Z]{2,4}-\d{3,4}\b/g);
    if (m2) matches.push(...m2);
    // Generic project code fallback
    const m3 = text.match(/\bPROJ-\d{3,5}\b/gi);
    if (m3) matches.push(...m3.map(s => s.toUpperCase()));
    return [...new Set(matches)];
  }

  function matchProject(refs: string[]): { id: number; name: string; erpnextName: string } | null {
    for (const ref of refs) {
      const found = erpProjects.find(p =>
        p.erpnextName?.toLowerCase() === ref.toLowerCase() ||
        p.name?.toLowerCase().includes(ref.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }

  const tasksByStatus = {
    todo: assignedTasks.filter(t => t.status === "todo"),
    in_progress: assignedTasks.filter(t => t.status === "in_progress"),
    review: assignedTasks.filter(t => t.status === "review"),
    done: assignedTasks.filter(t => t.status === "done"),
  };

  const productivityScore = calcProductivityScore(history, row);
  const currentAppClass = classifyApp(row.activeApp);

  // Project matching per history entry
  const historyWithProject = history.map(e => {
    const refs = extractProjectRefs((e.windowTitle || "") + " " + (e.activeApp || ""));
    const project = matchProject(refs);
    return { ...e, matchedProject: project, projectRefs: refs };
  });

  const projectWorkEntries = historyWithProject.filter(e => e.matchedProject);
  const nonProjectEntries = historyWithProject.filter(e => !e.matchedProject);
  const projectWorkPct = history.length > 0 ? Math.round((projectWorkEntries.length / history.length) * 100) : 0;

  // Group project work by project
  const projectWorkByProject = Object.entries(
    projectWorkEntries.reduce((acc, e) => {
      const key = e.matchedProject!.erpnextName;
      if (!acc[key]) acc[key] = { project: e.matchedProject!, count: 0 };
      acc[key].count++;
      return acc;
    }, {} as Record<string, { project: { id: number; name: string; erpnextName: string }; count: number }>)
  ).sort((a, b) => b[1].count - a[1].count);

  // Current window's project match
  const currentRefs = extractProjectRefs((row.windowTitle || "") + " " + (row.activeApp || ""));
  const currentProject = matchProject(currentRefs);

  // App usage breakdown from history
  const appUsage = Object.entries(
    history.reduce((acc, e) => {
      const key = e.activeApp || "Unknown";
      if (!acc[key]) acc[key] = { count: 0, idleTotal: 0, cls: classifyApp(e.activeApp) };
      acc[key].count++;
      acc[key].idleTotal += e.idleSeconds;
      return acc;
    }, {} as Record<string, { count: number; idleTotal: number; cls: "productive"|"unproductive"|"neutral" }>)
  ).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const productiveCount = history.filter(e => classifyApp(e.activeApp) === "productive").length;
  const unproductiveCount = history.filter(e => classifyApp(e.activeApp) === "unproductive").length;
  const totalHistory = history.length || 1;
  const productivePct = Math.round((productiveCount / totalHistory) * 100);
  const unproductivePct = Math.round((unproductiveCount / totalHistory) * 100);
  const idleEntries = history.filter(e => e.idleSeconds > 60).length;
  const idlePct = Math.round((idleEntries / totalHistory) * 100);

  const scoreColor = productivityScore >= 70 ? "#10b981" : productivityScore >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = productivityScore >= 70 ? "Productive" : productivityScore >= 40 ? "Moderate" : "Unproductive";
  const scoreBg = productivityScore >= 70 ? "from-green-500 to-emerald-600" : productivityScore >= 40 ? "from-amber-400 to-orange-500" : "from-red-500 to-rose-600";

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden">
      {/* Top nav bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Team Pulse
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-sm font-semibold text-gray-900">{displayName}</span>
        <span className={`ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status === "active" ? "bg-green-100 text-green-700" : status === "idle" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>
          {STATUS_LABEL[status]}
        </span>
        {status === "idle" && row.idleSeconds > 0 && (
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5" /> Idle {formatDuration(row.idleSeconds)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg font-semibold border border-blue-100">{date}</span>
          <Clock className="w-3.5 h-3.5" /> Updated {timeSince(row.lastSeen)}
        </div>
      </div>

      {/* Main 3-col layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT sidebar: Profile + score */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          {/* Profile */}
          <div className="px-5 pt-6 pb-5 text-center border-b border-gray-100">
            <div className="relative inline-block mb-3">
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="w-20 h-20 rounded-2xl object-cover border-4 border-gray-100 shadow-md" />
              ) : (
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md bg-gradient-to-br ${scoreBg}`}>
                  {initials(displayName)}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow ${STATUS_DOT[status]}`} />
            </div>
            <div className="font-bold text-gray-900 text-sm">{displayName}</div>
            {row.designation && <div className="text-xs text-blue-600 font-medium mt-0.5">{row.designation}</div>}
            {row.department && <div className="text-[11px] text-gray-400 mt-0.5">{row.department}</div>}
            {row.erpEmployeeId && <div className="mt-1.5 text-[10px] font-mono text-gray-400">{row.erpEmployeeId}</div>}
          </div>

          {/* Attendance & System Times */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Attendance · {date}</div>
            <div className="space-y-2.5">
              {/* Check-In */}
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <span className="text-[11px] text-emerald-700 font-semibold">Check-In</span>
                <span className="text-sm font-black text-emerald-700">
                  {erpCheckinDirect?.checkIn ? formatTime(erpCheckinDirect.checkIn) : erpCheckin?.checkIn ? formatTime(erpCheckin.checkIn) : <span className="text-emerald-300 font-normal text-xs">Not recorded</span>}
                </span>
              </div>
              {/* System Logged */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <span className="text-[11px] text-blue-700 font-semibold">System Logged</span>
                <span className="text-sm font-black text-blue-700">{row.systemLoginToday ? formatTime(row.systemLoginToday) : <span className="text-blue-300 font-normal text-xs">—</span>}</span>
              </div>
              {/* Last Active */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-[11px] text-gray-600 font-semibold">Last Active</span>
                <span className="text-sm font-black text-gray-700">{formatTime(row.systemLogoutToday || row.lastSeen)}</span>
              </div>
              {/* Active / Idle hours */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-center">
                  <div className="text-[10px] text-green-500 font-semibold uppercase tracking-wide mb-0.5">Active</div>
                  <div className="text-base font-black text-green-700">
                    {costInfo?.activeHoursToday != null ? `${costInfo.activeHoursToday.toFixed(1)}h` : <span className="text-gray-300 text-xs font-normal">—</span>}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
                  <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide mb-0.5">Idle</div>
                  <div className="text-base font-black text-amber-700">
                    {costInfo?.idleHoursToday != null ? `${costInfo.idleHoursToday.toFixed(1)}h` : <span className="text-gray-300 text-xs font-normal">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Productivity score ring */}
          <div className="px-5 py-5 border-b border-gray-100 text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Productivity Score</div>
            <div className="relative inline-flex items-center justify-center">
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={scoreColor} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - productivityScore / 100)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: scoreColor }}>{productivityScore}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">/ 100</span>
              </div>
            </div>
            <div className={`mt-2 text-sm font-bold ${productivityScore >= 70 ? "text-green-600" : productivityScore >= 40 ? "text-amber-600" : "text-red-500"}`}>
              {scoreLabel}
            </div>
            {!historyLoading && history.length === 0 && (
              <div className="text-[10px] text-gray-400 mt-1">Based on current status</div>
            )}
          </div>

          {/* Breakdown bars */}
          {!historyLoading && history.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100 space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Session Breakdown</div>
              {[
                { label: "Productive", pct: productivePct, color: "bg-green-500", textColor: "text-green-600" },
                { label: "Unproductive", pct: unproductivePct, color: "bg-red-400", textColor: "text-red-500" },
                { label: "Neutral / Other", pct: Math.max(0, 100 - productivePct - unproductivePct), color: "bg-gray-300", textColor: "text-gray-400" },
                { label: "Idle Periods", pct: idlePct, color: "bg-amber-400", textColor: "text-amber-600" },
              ].map(b => (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-600">{b.label}</span>
                    <span className={`text-[11px] font-bold ${b.textColor}`}>{b.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.color} transition-all duration-500`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Working Cost */}
          {costInfo && costInfo.available && costInfo.hourlyRate && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Working Cost</div>
              <div className="space-y-2">
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-violet-400 mb-0.5">Monthly Salary (Gross)</div>
                  <div className="text-base font-black text-violet-700">₹{costInfo.monthlySalary?.toLocaleString("en-IN")}</div>
                  {costInfo.monthlyNet && (
                    <div className="text-[10px] text-violet-400">Net ₹{costInfo.monthlyNet?.toLocaleString("en-IN")}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="text-[10px] text-gray-400 mb-0.5">Per Day</div>
                    <div className="text-sm font-bold text-gray-700">₹{costInfo.dailyRate?.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="text-[10px] text-gray-400 mb-0.5">Per Hour</div>
                    <div className="text-sm font-bold text-gray-700">₹{costInfo.hourlyRate?.toFixed(0)}</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-green-600 font-semibold mb-0.5">Today's Working Cost</div>
                  <div className="text-lg font-black text-green-700">
                    ₹{costInfo.workingCostToday?.toLocaleString("en-IN") ?? "0"}
                  </div>
                  <div className="text-[10px] text-green-500">{costInfo.activeHoursToday?.toFixed(2)}h active today</div>
                </div>
                {costInfo.idleCostToday && costInfo.idleCostToday > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <div className="text-[10px] text-amber-600 font-semibold mb-0.5">Idle Cost (Lost)</div>
                    <div className="text-sm font-bold text-amber-700">₹{costInfo.idleCostToday.toFixed(0)}</div>
                  </div>
                )}
                {costInfo.slipDate && (
                  <div className="text-[10px] text-gray-400 text-center">
                    {costInfo.salarySource === "salary_structure_assignment" ? "From structure: " : "Salary slip: "}
                    {costInfo.slipDate}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee info */}
          <div className="px-5 py-4 space-y-2 flex-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Device Info</div>
            {row.email && (
              <div>
                <div className="text-[10px] text-gray-400">Email</div>
                <div className="text-xs font-medium text-gray-700 break-all">{row.email}</div>
              </div>
            )}
            {row.deviceUsername && (
              <div>
                <div className="text-[10px] text-gray-400">Device User</div>
                <div className="text-xs font-mono text-gray-700">{row.deviceUsername}</div>
              </div>
            )}
            {row.deviceName && (
              <div>
                <div className="text-[10px] text-gray-400">Device Name</div>
                <div className="text-xs text-gray-700">{row.deviceName}</div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Current activity + timeline */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-5 space-y-4">

            {/* Current activity hero card */}
            <div className={`rounded-2xl overflow-hidden shadow-sm border ${
              status === "active" && currentAppClass === "productive" ? "border-green-200" :
              status === "active" && currentAppClass === "unproductive" ? "border-red-200" :
              status === "idle" ? "border-amber-200" : "border-gray-200"
            }`}>
              <div className={`px-5 py-2 text-xs font-bold flex items-center gap-2 ${
                status === "active" && currentAppClass === "productive" ? "bg-green-500 text-white" :
                status === "active" && currentAppClass === "unproductive" ? "bg-red-500 text-white" :
                status === "idle" ? "bg-amber-400 text-white" : "bg-gray-400 text-white"
              }`}>
                <Monitor className="w-3.5 h-3.5" />
                {status === "offline" ? "Offline" :
                 status === "idle" ? "Idle — No Input Detected" :
                 currentAppClass === "productive" ? "Productive Activity" :
                 currentAppClass === "unproductive" ? "Unproductive Activity" : "Active — Neutral App"}
              </div>
              <div className="bg-white px-5 py-4">
                {status !== "offline" && row.activeApp ? (
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg shadow-sm ${
                      currentAppClass === "productive" ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                      currentAppClass === "unproductive" ? "bg-gradient-to-br from-red-400 to-rose-600" :
                      "bg-gradient-to-br from-blue-400 to-indigo-500"}`}>
                      {(row.activeApp[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold text-gray-900">{row.activeApp}</div>
                      {row.windowTitle && row.windowTitle !== row.activeApp && (
                        <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{row.windowTitle}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          currentAppClass === "productive" ? "bg-green-100 text-green-700 border border-green-200" :
                          currentAppClass === "unproductive" ? "bg-red-100 text-red-700 border border-red-200" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}>
                          {currentAppClass === "productive" ? "✓ Productive" : currentAppClass === "unproductive" ? "✗ Unproductive" : "~ Neutral"}
                        </span>
                        {currentProject && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {currentProject.erpnextName} — {currentProject.name}
                          </span>
                        )}
                        {!currentProject && currentRefs.length > 0 && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Ref: {currentRefs[0]}
                          </span>
                        )}
                        {status === "idle" && row.idleSeconds > 0 && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Coffee className="w-3 h-3" /> Idle {formatDuration(row.idleSeconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 italic py-2">Device is offline — last seen {timeSince(row.lastSeen)}</div>
                )}
              </div>
            </div>

            {/* Project Work vs Non-Project Work */}
            {!historyLoading && history.length > 0 && erpProjects.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-bold text-gray-800">Project Work Analysis</span>
                  <span className="ml-auto text-xs text-gray-400">from last {history.length} events</span>
                </div>
                <div className="px-5 py-4">
                  {/* Bar */}
                  <div className="flex rounded-xl overflow-hidden h-7 mb-3 border border-gray-100">
                    <div className="bg-violet-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${projectWorkPct}%`, minWidth: projectWorkPct > 0 ? "2rem" : 0 }}>
                      {projectWorkPct > 5 ? `${projectWorkPct}%` : ""}
                    </div>
                    <div className="bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium flex-1">
                      {100 - projectWorkPct > 5 ? `${100 - projectWorkPct}% Non-Project` : ""}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-violet-700">
                      <span className="w-3 h-3 rounded bg-violet-500 inline-block" />
                      Project Work: {projectWorkPct}% ({projectWorkEntries.length} events)
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
                      Non-Project: {100 - projectWorkPct}% ({nonProjectEntries.length} events)
                    </span>
                  </div>
                  {/* Per-project breakdown */}
                  {projectWorkByProject.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Project Breakdown</div>
                      {projectWorkByProject.map(([key, { project, count }]) => {
                        const pPct = Math.round((count / history.length) * 100);
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-800 truncate">{project.erpnextName}</span>
                                <span className="text-[10px] text-gray-500 truncate">— {project.name}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-violet-400 transition-all duration-500"
                                  style={{ width: `${pPct}%` }} />
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-bold text-violet-600">{pPct}%</div>
                              <div className="text-[10px] text-gray-400">{count} events</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {projectWorkByProject.length === 0 && (
                    <div className="text-center py-2 text-sm text-gray-400 italic">
                      No project numbers detected in window titles yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* App usage breakdown */}
            {!historyLoading && appUsage.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-800">App Usage Breakdown</span>
                  <span className="ml-auto text-xs text-gray-400">from last {history.length} events</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {appUsage.map(([app, info]) => {
                    const pct = Math.round((info.count / totalHistory) * 100);
                    return (
                      <div key={app} className="px-5 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${info.cls === "productive" ? "bg-green-500" : info.cls === "unproductive" ? "bg-red-400" : "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800 truncate">{app}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                              info.cls === "productive" ? "bg-green-50 text-green-600" :
                              info.cls === "unproductive" ? "bg-red-50 text-red-500" :
                              "bg-gray-100 text-gray-400"
                            }`}>
                              {info.cls === "productive" ? "Productive" : info.cls === "unproductive" ? "Unproductive" : "Neutral"}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${info.cls === "productive" ? "bg-green-400" : info.cls === "unproductive" ? "bg-red-400" : "bg-gray-300"}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-bold text-gray-700">{pct}%</div>
                          <div className="text-[10px] text-gray-400">{info.count} events</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-800">Activity Timeline</span>
                <span className="ml-auto text-xs text-gray-400">Last 50 events</span>
              </div>
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 italic">No activity history yet</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {history.map((log, i) => {
                    const cls = classifyApp(log.activeApp);
                    return (
                      <div key={log.id} className={`flex items-center gap-3 px-5 py-2.5 ${i === 0 ? "bg-blue-50/30" : "hover:bg-gray-50"} transition-colors`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls === "productive" ? "bg-green-500" : cls === "unproductive" ? "bg-red-400" : log.isActive ? "bg-blue-400" : "bg-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{log.activeApp || "—"}</div>
                          {log.windowTitle && log.windowTitle !== log.activeApp && (
                            <div className="text-[10px] text-gray-400 truncate">{log.windowTitle}</div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          cls === "productive" ? "bg-green-50 text-green-600" :
                          cls === "unproductive" ? "bg-red-50 text-red-500" :
                          "bg-gray-100 text-gray-400"}`}>
                          {cls === "productive" ? "✓" : cls === "unproductive" ? "✗" : "~"}
                        </span>
                        {log.idleSeconds > 60 && (
                          <span className="text-[10px] text-amber-500 font-medium flex-shrink-0">⏸ {formatDuration(log.idleSeconds)}</span>
                        )}
                        <div className="text-[10px] text-gray-400 flex-shrink-0 w-14 text-right">{timeSince(log.loggedAt)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT sidebar: Tasks */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-800">Assigned Tasks</span>
            <span className="ml-auto px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-500">{assignedTasks.length}</span>
          </div>

          {/* Task stats */}
          <div className="px-4 py-3 grid grid-cols-2 gap-2 border-b border-gray-100 flex-shrink-0">
            {[
              { label: "In Progress", count: tasksByStatus.in_progress.length, color: "text-blue-600 bg-blue-50 border-blue-100" },
              { label: "To Do", count: tasksByStatus.todo.length, color: "text-gray-600 bg-gray-100 border-gray-200" },
              { label: "Review", count: tasksByStatus.review.length, color: "text-amber-600 bg-amber-50 border-amber-100" },
              { label: "Done", count: tasksByStatus.done.length, color: "text-green-600 bg-green-50 border-green-100" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border px-3 py-2 ${s.color}`}>
                <div className="text-lg font-black">{s.count}</div>
                <div className="text-[10px] font-semibold opacity-75">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Task completion bar */}
          {assignedTasks.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Completion</span>
                <span className="text-[11px] font-bold text-green-600">
                  {Math.round((tasksByStatus.done.length / assignedTasks.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(tasksByStatus.done.length / assignedTasks.length) * 100}%` }} />
                <div className="h-full bg-blue-400 transition-all" style={{ width: `${(tasksByStatus.in_progress.length / assignedTasks.length) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${(tasksByStatus.review.length / assignedTasks.length) * 100}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Review</span>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {assignedTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400 italic">No tasks assigned</div>
            ) : (
              (["in_progress", "todo", "review", "done"] as const).map(s => {
                const col = COLUMNS.find(c => c.id === s)!;
                const sTasks = tasksByStatus[s];
                if (sTasks.length === 0) return null;
                return (
                  <div key={s}>
                    <div className={`text-[10px] font-bold mb-1.5 flex items-center gap-1.5 ${s === "in_progress" ? "text-blue-600" : s === "done" ? "text-green-600" : s === "review" ? "text-amber-600" : "text-gray-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      {col.label.toUpperCase()} ({sTasks.length})
                    </div>
                    {sTasks.map(t => {
                      const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";
                      return (
                        <div key={t.id} className={`rounded-xl border px-3 py-2.5 mb-1.5 ${s === "in_progress" ? "border-blue-100 bg-blue-50/50" : s === "done" ? "border-green-100 bg-green-50/50" : "border-gray-100 bg-gray-50"}`}>
                          <div className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{t.title}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${priorityColor(t.priority)}`}>{t.priority}</span>
                            {t.dueDate && (
                              <span className={`text-[10px] flex items-center gap-0.5 font-medium ${overdue ? "text-red-500" : "text-gray-400"}`}>
                                <Calendar className="w-2.5 h-2.5" /> {t.dueDate}
                                {overdue && " ⚠"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
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

function ActivityCard({ row, onRefresh, onClick, erpCheckin }: {
  row: SystemActivity;
  onRefresh: () => void;
  onClick: () => void;
  erpCheckin?: { checkIn?: string; checkOut?: string };
}) {
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`${BASE_PROXY}/api/activity/${encodeURIComponent(row.deviceUsername)}`, { method: "DELETE" });
      onRefresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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

      {/* Timing row */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Check-In</div>
          <div className="text-[11px] font-bold text-emerald-600">{formatTime(erpCheckin?.checkIn)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">System Logged</div>
          <div className="text-[11px] font-bold text-blue-600">{formatTime(row.systemLoginToday)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Last Active</div>
          <div className="text-[11px] font-bold text-gray-500">
            {formatTime(row.systemLogoutToday || row.lastSeen)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-1 flex items-center justify-between">
        <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={row.deviceName}>{row.deviceName || row.deviceUsername}</div>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-red-500 font-semibold">Remove?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded transition-colors disabled:opacity-50">
                {deleting ? "…" : "Yes"}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded transition-colors">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              title="Remove this device from Team Pulse"
              className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] text-blue-400 font-medium flex items-center gap-0.5">
            Details <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── List Activity Row ──────────────────────────────────────────────────────────
function ListActivityRow({ row, st, displayName, photoUrl2, erpCheckin, onSelect, onRefresh }: {
  row: SystemActivity;
  st: string;
  displayName: string;
  photoUrl2: string | null;
  erpCheckin?: { checkIn?: string; checkOut?: string };
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const BASE_PROXY2 = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await fetch(`${BASE_PROXY2}/api/activity/${encodeURIComponent(row.deviceUsername)}`, { method: "DELETE" });
      onRefresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <tr className="hover:bg-blue-50/30 cursor-pointer transition-colors group" onClick={onSelect}>
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
        {erpCheckin?.checkIn
          ? <span className="text-xs font-semibold text-emerald-600">{formatTime(erpCheckin.checkIn)}</span>
          : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-semibold text-blue-600">{formatTime(row.systemLoginToday)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-semibold text-gray-600">{formatTime(row.systemLogoutToday || row.lastSeen)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{row.activeApp || <span className="text-gray-300 italic">—</span>}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500 truncate max-w-[120px] block">{row.department || "—"}</span>
      </td>
      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
        {confirmDelete ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-[10px] text-red-500 font-semibold">Remove?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded transition-colors disabled:opacity-50">
              {deleting ? "…" : "Yes"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded transition-colors">
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Remove this device from Team Pulse"
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
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
  const [monitorDate, setMonitorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [erpCheckinMap, setErpCheckinMap] = useState<Record<string, { checkIn?: string; checkOut?: string }>>({});

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
    fetch(`${BASE}/api/activity/live?date=${monitorDate}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setActivity(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [monitorDate]);

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
      fetch(`${BASE}/api/activity/live?date=${monitorDate}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setActivity(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setActivityLoading(false));
      activityIntervalRef.current = setInterval(loadActivity, 30000);
    }
    return () => {
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    };
  }, [tab, monitorDate, loadActivity]);

  useEffect(() => {
    if (tab !== "monitor") return;
    fetch(`${BASE}/api/activity/checkins-today?date=${monitorDate}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setErpCheckinMap(typeof data === "object" && data !== null ? data : {}))
      .catch(() => {});
  }, [tab, monitorDate]);

  // Task CRUD
  const createTask = async (data: Partial<FmTask>) => {
    const body = { ...data, createdBy: user?.email ?? "unknown", status: data.status ?? "todo" };
    const r = await fetch(`${BASE}/api/fm-tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { loadTasks(); setModal({ open: false }); }
  };

  const updateTask = async (id: number, data: Partial<FmTask>) => {
    const r = await fetch(`${BASE}/api/fm-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, updatedBy: user?.email }) });
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
          <div className="flex flex-col flex-1 min-h-0 bg-gray-50">

            {/* Top toolbar: profile + stats + filters */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 space-y-3">

              {/* Profile strip */}
              {empLoading ? (
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ) : empProfile && (
                <div className="flex items-center gap-3">
                  {empProfile.photo ? (
                    <img src={empProfile.photo} alt={empProfile.full_name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-blue-200 flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials(empProfile.full_name)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-gray-900 text-sm">{empProfile.full_name}</span>
                    {empProfile.designation && <span className="text-xs text-blue-600 font-medium">{empProfile.designation}</span>}
                    {empProfile.department && <span className="text-xs text-gray-400">· {empProfile.department}</span>}
                    {empProfile.employee_number && <span className="text-[11px] font-mono text-gray-400">· {empProfile.employee_number}</span>}
                    {empProfile.employee_status && (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${empProfile.employee_status === "Active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                        {empProfile.employee_status}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3">
                {[
                  { label: "Total", count: stats.total, color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
                  { label: "To Do", count: stats.todo, color: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400" },
                  { label: "In Progress", count: stats.inProgress, color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
                  { label: "In Review", count: tasks.filter(t => t.status === "review").length, color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
                  { label: "Done", count: stats.done, color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${s.color}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-lg font-black leading-none">{s.count}</span>
                    <span className="font-medium opacity-70">{s.label}</span>
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {/* Completion bar */}
                  {stats.total > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Completion</span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((stats.done / stats.total) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-green-600">{Math.round((stats.done / stats.total) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search tasks or assignee…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Priorities</option>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Projects</option>
                  {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
                {(search || filterPriority !== "all" || filterProject !== "all") && (
                  <button onClick={() => { setSearch(""); setFilterPriority("all"); setFilterProject("all"); }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
                <div className="text-xs text-gray-400 ml-auto">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Kanban board */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-5 px-6 py-5 min-w-max h-full items-start">
                {COLUMNS.map(col => {
                  const colTasks = filtered.filter(t => t.status === col.id);
                  const colHeaderColors: Record<string, string> = {
                    todo: "bg-gray-500",
                    in_progress: "bg-blue-600",
                    review: "bg-amber-500",
                    done: "bg-green-500",
                  };
                  const colIconColors: Record<string, string> = {
                    todo: "text-gray-500",
                    in_progress: "text-blue-600",
                    review: "text-amber-500",
                    done: "text-green-500",
                  };
                  return (
                    <div key={col.id} className="flex flex-col w-80 flex-shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
                      style={{ maxHeight: "calc(100vh - 260px)" }}>
                      {/* Column header */}
                      <div className={`h-1 ${colHeaderColors[col.id]}`} />
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                          <span className="text-sm font-bold text-gray-800">{col.label}</span>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            col.id === "in_progress" ? "bg-blue-100 text-blue-700" :
                            col.id === "done" ? "bg-green-100 text-green-700" :
                            col.id === "review" ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>{colTasks.length}</span>
                        </div>
                        <button onClick={() => setModal({ open: true, defaultStatus: col.id })}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${colIconColors[col.id]} hover:bg-gray-100`}>
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {loading ? (
                          <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
                          </div>
                        ) : colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                              col.id === "in_progress" ? "bg-blue-50" : col.id === "done" ? "bg-green-50" :
                              col.id === "review" ? "bg-amber-50" : "bg-gray-100"}`}>
                              <CheckSquare className={`w-5 h-5 ${colIconColors[col.id]} opacity-50`} />
                            </div>
                            <p className="text-xs text-gray-400 font-medium">No tasks here</p>
                            <button onClick={() => setModal({ open: true, defaultStatus: col.id })}
                              className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-medium">+ Add one</button>
                          </div>
                        ) : colTasks.map(task => {
                          const proj = projects.find(p => p.id === task.projectId);
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                          const priorityBorder: Record<string, string> = {
                            high: "border-l-red-500",
                            medium: "border-l-amber-400",
                            low: "border-l-green-400",
                          };
                          const priorityDot: Record<string, string> = {
                            high: "bg-red-500",
                            medium: "bg-amber-400",
                            low: "bg-green-400",
                          };
                          return (
                            <div key={task.id}
                              className={`bg-white rounded-xl border border-gray-200 border-l-4 ${priorityBorder[task.priority] || "border-l-gray-300"} p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}
                              onClick={() => setModal({ open: true, task })}>

                              {/* Title row */}
                              <div className="flex items-start gap-1.5 mb-2">
                                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">{task.title}</p>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => setModal({ open: true, task })}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => deleteTask(task.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Description */}
                              {task.description && (
                                <p className="text-[11px] text-gray-400 line-clamp-2 mb-2.5 leading-relaxed">{task.description}</p>
                              )}

                              {/* Tags & Project */}
                              {(proj || (task.tags && task.tags.trim())) && (
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                  {proj && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 rounded-full font-medium max-w-[140px] truncate" title={proj.name}>
                                      <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span className="truncate">{proj.name}</span>
                                    </span>
                                  )}
                                  {task.tags && task.tags.split(",").slice(0, 2).map(tag => tag.trim() && (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-[10px] text-gray-500 rounded-full border border-gray-200">{tag.trim()}</span>
                                  ))}
                                </div>
                              )}

                              {/* Bottom row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {/* Priority dot + label */}
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority] || "bg-gray-300"}`} />
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{task.priority}</span>
                                </div>
                                {task.assigneeName && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shadow-sm" title={task.assigneeName}>
                                      {initials(task.assigneeName)}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium max-w-[80px] truncate">{task.assigneeName.split(" ")[0]}</span>
                                  </div>
                                )}
                              </div>

                              {/* Due date + move buttons */}
                              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                {task.dueDate ? (
                                  <div className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                                    <Calendar className="w-3 h-3" />
                                    {task.dueDate}
                                    {isOverdue && <span className="text-red-400">⚠</span>}
                                  </div>
                                ) : <span />}
                                <div className="flex gap-1">
                                  {COLUMNS.filter(c => c.id !== col.id).map(c => (
                                    <button key={c.id} onClick={() => moveTask(task.id, c.id)}
                                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                                        c.id === "done" ? "border-green-200 text-green-600 hover:bg-green-50" :
                                        c.id === "in_progress" ? "border-blue-200 text-blue-600 hover:bg-blue-50" :
                                        c.id === "review" ? "border-amber-200 text-amber-600 hover:bg-amber-50" :
                                        "border-gray-200 text-gray-500 hover:bg-gray-100"
                                      }`}>
                                      → {c.label}
                                    </button>
                                  ))}
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
                    {/* Date picker */}
                    <input
                      type="date"
                      value={monitorDate}
                      onChange={e => setMonitorDate(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    />
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
                            erpCheckin={row.erpEmployeeId ? erpCheckinMap[row.erpEmployeeId] : undefined}
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
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Check-In</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">System Logged</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Last Active</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Current App</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredActivity.map(row => {
                          const st = activityStatus(row);
                          const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
                          const BASE_PROXY2 = import.meta.env.BASE_URL.replace(/\/$/, "");
                          const photoUrl2 = row.erpImage ? `${BASE_PROXY2}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}` : null;
                          return (
                            <ListActivityRow
                              key={row.deviceUsername || row.email}
                              row={row}
                              st={st}
                              displayName={displayName}
                              photoUrl2={photoUrl2}
                              erpCheckin={row.erpEmployeeId ? erpCheckinMap[row.erpEmployeeId] : undefined}
                              onSelect={() => setSelectedEmployee(row)}
                              onRefresh={loadActivity}
                            />
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
          erpCheckin={selectedEmployee.erpEmployeeId ? erpCheckinMap[selectedEmployee.erpEmployeeId] : undefined}
          date={monitorDate}
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
