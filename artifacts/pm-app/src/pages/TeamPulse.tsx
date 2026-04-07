import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, RefreshCw, Search, Monitor, Users,
  Wifi, WifiOff, Clock, Loader2, Shield,
  ArrowLeft, ChevronRight, Coffee, BarChart2,
  History, ClipboardList, Briefcase, Calendar,
  Building2, Download,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

// ── Types ──────────────────────────────────────────────────────────────────────
interface SystemActivity {
  id: number;
  deviceUsername: string;
  email: string;
  fullName: string;
  department: string;
  designation: string;
  erpEmployeeId: string;
  erpImage: string | null;
  activeApp: string;
  windowTitle: string;
  isActive: boolean;
  idleSeconds: number;
  deviceName: string;
  lastSeen: string;
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
  tags?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.slice(0, 5);
  try {
    const d = new Date(t);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return "—"; }
}

function timeSince(iso: string) {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
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

const COLUMNS = [
  { id: "todo",        label: "To Do",       dot: "bg-gray-400"  },
  { id: "in_progress", label: "In Progress", dot: "bg-blue-500"  },
  { id: "review",      label: "Review",      dot: "bg-amber-500" },
  { id: "done",        label: "Done",        dot: "bg-green-500" },
];

function priorityColor(p: string) {
  return p === "high" ? "text-red-600 bg-red-50 border-red-200" :
    p === "medium" ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-gray-500 bg-gray-100 border-gray-200";
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
  "acrobat","pdf","reader","foxit","notepad","wordpad",
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

function calcProductivityScore(history: ActivityLog[], row: SystemActivity): number {
  if (history.length === 0) {
    if (activityStatus(row) === "active") return 70;
    if (activityStatus(row) === "idle") return 20;
    return 0;
  }
  let score = 0;
  let total = 0;
  for (const e of history) {
    const cls = classifyApp(e.activeApp);
    const idlePenalty = Math.min(e.idleSeconds / 300, 1);
    const pts = cls === "productive" ? 1 : cls === "unproductive" ? 0 : 0.5;
    const weight = 1 - idlePenalty * 0.7;
    score += pts * weight;
    total += 1;
  }
  return total === 0 ? 50 : Math.round((score / total) * 100);
}

function extractProjectRefs(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  const m1 = text.match(/\b[A-Z]{2,6}-[A-Z]{2,6}-\d{3,6}\b/g);
  if (m1) matches.push(...m1);
  const m2 = text.match(/\b\d{4}-[A-Z]{2,4}-\d{3,4}\b/g);
  if (m2) matches.push(...m2);
  const m3 = text.match(/\bPROJ-\d{3,5}\b/gi);
  if (m3) matches.push(...m3.map(s => s.toUpperCase()));
  const m4 = text.match(/\b[A-Z]{2,6}-\d{3,6}\b/g);
  if (m4) matches.push(...m4);
  return [...new Set(matches)];
}

// ── Employee Detail Panel ──────────────────────────────────────────────────────
function EmployeeDetailPanel({ row, tasks, onClose, erpCheckin, date }: {
  row: SystemActivity;
  tasks: FmTask[];
  onClose: () => void;
  erpCheckin?: { checkIn?: string; checkOut?: string };
  date: string;
}) {
  const status = activityStatus(row);
  const displayName = row.fullName || row.deviceUsername || row.email.split("@")[0];
  const photoUrl = row.erpImage ? `${BASE}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}` : null;

  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [costInfo, setCostInfo] = useState<{
    available: boolean; monthlySalary?: number | null; monthlyNet?: number | null;
    hourlyRate?: number | null; dailyRate?: number | null; slipDate?: string | null;
    salarySource?: string; activeHoursToday?: number; idleHoursToday?: number;
    workingCostToday?: number | null; idleCostToday?: number | null;
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
    fetch(`${BASE}/api/activity/${encodeURIComponent(row.deviceUsername)}/history?date=${date}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [row.deviceUsername, date]);

  useEffect(() => {
    if (!row.deviceUsername) return;
    fetch(`${BASE}/api/activity/${encodeURIComponent(row.deviceUsername)}/cost-info?date=${date}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setCostInfo(d))
      .catch(() => {});
  }, [row.deviceUsername, date]);

  useEffect(() => {
    if (!row.erpEmployeeId) return;
    fetch(`${BASE}/api/activity/checkins-today?date=${date}`)
      .then(r => r.ok ? r.json() : {})
      .then((map: Record<string, { checkIn?: string; checkOut?: string }>) => {
        setErpCheckinDirect(map[row.erpEmployeeId] ?? null);
      })
      .catch(() => {});
  }, [row.erpEmployeeId, date]);

  useEffect(() => {
    fetch(`${BASE}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setErpProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function findProjectInText(text: string): { id: number; name: string; erpnextName: string } | null {
    if (!text || erpProjects.length === 0) return null;
    const textUpper = text.toUpperCase();
    const refs = extractProjectRefs(textUpper);
    for (const ref of refs) {
      const found = erpProjects.find(p =>
        p.erpnextName?.toUpperCase() === ref ||
        p.erpnextName?.toUpperCase().includes(ref) ||
        p.name?.toUpperCase().includes(ref)
      );
      if (found) return found;
    }
    return erpProjects.find(p => {
      const code = p.erpnextName?.toUpperCase();
      return code && code.length >= 4 && textUpper.includes(code);
    }) ?? null;
  }

  const tasksByStatus = {
    todo: assignedTasks.filter(t => t.status === "todo"),
    in_progress: assignedTasks.filter(t => t.status === "in_progress"),
    review: assignedTasks.filter(t => t.status === "review"),
    done: assignedTasks.filter(t => t.status === "done"),
  };

  const productivityScore = calcProductivityScore(history, row);
  const currentAppClass = classifyApp(row.activeApp);
  const scoreColor = productivityScore >= 70 ? "#10b981" : productivityScore >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = productivityScore >= 70 ? "Productive" : productivityScore >= 40 ? "Moderate" : "Unproductive";
  const scoreBg = productivityScore >= 70 ? "from-green-500 to-emerald-600" : productivityScore >= 40 ? "from-amber-400 to-orange-500" : "from-red-500 to-rose-600";

  const totalHistory = history.length || 1;
  const productiveCount = history.filter(e => classifyApp(e.activeApp) === "productive").length;
  const unproductiveCount = history.filter(e => classifyApp(e.activeApp) === "unproductive").length;
  const productivePct = Math.round((productiveCount / totalHistory) * 100);
  const unproductivePct = Math.round((unproductiveCount / totalHistory) * 100);
  const idleEntries = history.filter(e => e.idleSeconds > 60).length;
  const idlePct = Math.round((idleEntries / totalHistory) * 100);

  const appUsage = Object.entries(
    history.reduce((acc, e) => {
      const key = e.activeApp || "Unknown";
      if (!acc[key]) acc[key] = { count: 0, idleTotal: 0, cls: classifyApp(e.activeApp) };
      acc[key].count++;
      acc[key].idleTotal += e.idleSeconds;
      return acc;
    }, {} as Record<string, { count: number; idleTotal: number; cls: "productive" | "unproductive" | "neutral" }>)
  ).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const historyWithProject = history.map(e => {
    const text = (e.windowTitle || "") + " " + (e.activeApp || "");
    const project = findProjectInText(text);
    const refs = extractProjectRefs(text.toUpperCase());
    return { ...e, matchedProject: project, projectRefs: refs };
  });

  const projectWorkEntries = historyWithProject.filter(e => e.matchedProject);
  const nonProjectEntries = historyWithProject.filter(e => !e.matchedProject);
  const projectWorkPct = history.length > 0 ? Math.round((projectWorkEntries.length / history.length) * 100) : 0;

  const projectWorkByProject = Object.entries(
    projectWorkEntries.reduce((acc, e) => {
      const key = e.matchedProject!.erpnextName;
      if (!acc[key]) acc[key] = { project: e.matchedProject!, count: 0 };
      acc[key].count++;
      return acc;
    }, {} as Record<string, { project: { id: number; name: string; erpnextName: string }; count: number }>)
  ).sort((a, b) => b[1].count - a[1].count);

  const currentProject = findProjectInText((row.windowTitle || "") + " " + (row.activeApp || ""));
  const currentRefs = extractProjectRefs(((row.windowTitle || "") + " " + (row.activeApp || "")).toUpperCase());

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

        {/* LEFT: Profile + score */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
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

          {/* Attendance */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Attendance · {date}</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <span className="text-[11px] text-emerald-700 font-semibold">Check-In</span>
                <span className="text-sm font-black text-emerald-700">
                  {erpCheckinDirect?.checkIn ? formatTime(erpCheckinDirect.checkIn) : erpCheckin?.checkIn ? formatTime(erpCheckin.checkIn) : <span className="text-emerald-300 font-normal text-xs">Not recorded</span>}
                </span>
              </div>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <span className="text-[11px] text-blue-700 font-semibold">System Logged</span>
                <span className="text-sm font-black text-blue-700">{row.systemLoginToday ? formatTime(row.systemLoginToday) : <span className="text-blue-300 font-normal text-xs">—</span>}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-[11px] text-gray-600 font-semibold">Last Active</span>
                <span className="text-sm font-black text-gray-700">{formatTime(row.systemLogoutToday || row.lastSeen)}</span>
              </div>
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
          </div>

          {/* Session breakdown bars */}
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

          {/* Working cost */}
          {costInfo && costInfo.available && costInfo.hourlyRate && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Working Cost</div>
              <div className="space-y-2">
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                  <div className="text-[10px] text-violet-400 mb-0.5">Monthly Salary (Gross)</div>
                  <div className="text-base font-black text-violet-700">₹{costInfo.monthlySalary?.toLocaleString("en-IN")}</div>
                  {costInfo.monthlyNet && <div className="text-[10px] text-violet-400">Net ₹{costInfo.monthlyNet?.toLocaleString("en-IN")}</div>}
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
                  <div className="text-lg font-black text-green-700">₹{costInfo.workingCostToday?.toLocaleString("en-IN") ?? "0"}</div>
                  <div className="text-[10px] text-green-500">{costInfo.activeHoursToday?.toFixed(2)}h active today</div>
                </div>
                {costInfo.idleCostToday && costInfo.idleCostToday > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <div className="text-[10px] text-amber-600 font-semibold mb-0.5">Idle Cost (Lost)</div>
                    <div className="text-sm font-bold text-amber-700">₹{costInfo.idleCostToday.toFixed(0)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Device info */}
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

        {/* CENTER: Activity */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-5 space-y-4">

            {/* Current activity card */}
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

            {/* Project Work Analysis */}
            {!historyLoading && history.length > 0 && erpProjects.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-bold text-gray-800">Project Work Analysis</span>
                  <span className="ml-auto text-xs text-gray-400">from last {history.length} events</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex rounded-xl overflow-hidden h-7 mb-3 border border-gray-100">
                    <div className="bg-violet-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${projectWorkPct}%`, minWidth: projectWorkPct > 0 ? "2rem" : 0 }}>
                      {projectWorkPct > 5 ? `${projectWorkPct}%` : ""}
                    </div>
                    <div className="bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium flex-1">
                      {100 - projectWorkPct > 5 ? `${100 - projectWorkPct}% Non-Project` : ""}
                    </div>
                  </div>
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
                                <div className="h-full rounded-full bg-violet-400 transition-all duration-500" style={{ width: `${pPct}%` }} />
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
                </div>
              </div>
            )}

            {/* App Usage Breakdown */}
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
                              info.cls === "unproductive" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"
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
                  {historyWithProject.map((log, i) => {
                    const cls = classifyApp(log.activeApp);
                    return (
                      <div key={log.id} className={`flex items-start gap-3 px-5 py-2.5 ${i === 0 ? "bg-blue-50/30" : log.matchedProject ? "bg-violet-50/40 hover:bg-violet-50" : "hover:bg-gray-50"} transition-colors`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cls === "productive" ? "bg-green-500" : cls === "unproductive" ? "bg-red-400" : log.isActive ? "bg-blue-400" : "bg-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{log.activeApp || "—"}</div>
                          {log.windowTitle && log.windowTitle !== log.activeApp && (
                            <div className="text-[10px] text-gray-400 truncate">{log.windowTitle}</div>
                          )}
                          {log.matchedProject && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                                <Briefcase className="w-2.5 h-2.5" />
                                {log.matchedProject.erpnextName} — {log.matchedProject.name}
                              </span>
                            </div>
                          )}
                          {!log.matchedProject && log.projectRefs.length > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                Ref: {log.projectRefs[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            cls === "productive" ? "bg-green-50 text-green-600" :
                            cls === "unproductive" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"}`}>
                            {cls === "productive" ? "✓" : cls === "unproductive" ? "✗" : "~"}
                          </span>
                          {log.idleSeconds > 60 && (
                            <span className="text-[10px] text-amber-500 font-medium">⏸ {formatDuration(log.idleSeconds)}</span>
                          )}
                          <div className="text-[10px] text-gray-400 w-14 text-right">{timeSince(log.loggedAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT: Tasks */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-800">Assigned Tasks</span>
            <span className="ml-auto px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-500">{assignedTasks.length}</span>
          </div>

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
            </div>
          )}

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

// ── Employee Card ──────────────────────────────────────────────────────────────
function EmployeeCard({
  row, erpCheckin, onClick,
}: {
  row: SystemActivity;
  erpCheckin?: { checkIn?: string; checkOut?: string };
  onClick: () => void;
}) {
  const status = activityStatus(row);
  const photo = row.erpImage ? `${BASE}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}` : null;

  const statusConfig = {
    active:  { dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200", label: "Active",  ring: "ring-green-400/40" },
    idle:    { dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Idle",    ring: "ring-amber-400/40" },
    offline: { dot: "bg-gray-300",   badge: "bg-gray-100 text-gray-500 border-gray-200",    label: "Offline", ring: "ring-gray-300/40" },
  }[status];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all ring-1 ${statusConfig.ring} cursor-pointer hover:scale-[1.01]`}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {photo ? (
              <img src={photo} alt={row.fullName} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {initials(row.fullName || row.email)}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusConfig.dot}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{row.fullName || row.deviceUsername}</div>
            {row.designation && <div className="text-[11px] text-blue-600 font-medium truncate">{row.designation}</div>}
            <div className="text-[10px] text-gray-400 truncate">{row.department || "—"}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          {status !== "offline" && (
            <span className="text-[10px] text-gray-400">{timeSince(row.lastSeen)}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
        {status !== "offline" ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Monitor className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate font-medium">{row.activeApp || "—"}</span>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic flex items-center gap-1.5">
            <WifiOff className="w-3 h-3" /> No recent activity
          </div>
        )}
        {row.windowTitle && row.windowTitle !== row.activeApp && status !== "offline" && (
          <div className="text-[10px] text-gray-400 truncate ml-4 mt-0.5" title={row.windowTitle}>
            {row.windowTitle}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-gray-100 text-center">
        <div className="py-2 px-1">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Check-In</div>
          <div className="text-[11px] font-bold text-emerald-600">{formatTime(erpCheckin?.checkIn)}</div>
        </div>
        <div className="py-2 px-1 border-l border-r border-gray-100">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sys Login</div>
          <div className="text-[11px] font-bold text-blue-600">{formatTime(row.systemLoginToday)}</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Last Active</div>
          <div className="text-[11px] font-bold text-gray-500">{formatTime(row.systemLogoutToday || row.lastSeen)}</div>
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
        <div className="text-[10px] text-gray-400 truncate">{row.deviceName || row.deviceUsername}</div>
        <span className="text-[10px] text-violet-500 font-semibold">View Details →</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TeamPulse() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<SystemActivity[]>([]);
  const [tasks, setTasks] = useState<FmTask[]>([]);
  const [erpCheckinMap, setErpCheckinMap] = useState<Record<string, { checkIn?: string; checkOut?: string }>>({});
  const [hodDept, setHodDept] = useState<string | null>(null);
  const [hasModuleAccess, setHasModuleAccess] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "idle" | "offline">("all");
  const [selectedEmployee, setSelectedEmployee] = useState<SystemActivity | null>(null);
  const [monitorDate, setMonitorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());

  // Load permissions
  useEffect(() => {
    if (!user?.email) return;
    if (isAdmin) { setPermLoading(false); return; }
    fetch(`${BASE}/api/user-permissions/${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setHodDept(data.hodDept ?? null);
        try {
          const roles: Record<string, string> = data.moduleRoles ? JSON.parse(data.moduleRoles) : {};
          setHasModuleAccess(roles["team-pulse"] === "read" || roles["team-pulse"] === "write");
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [user?.email, isAdmin]);

  const canAccess = isAdmin || hodDept != null && hodDept !== "" || hasModuleAccess;

  const loadActivity = useCallback(() => {
    setActLoading(true);
    fetch(`${BASE}/api/activity/live?date=${monitorDate}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setActivity(Array.isArray(data) ? data : []);
        setLastRefresh(new Date());
      })
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [monitorDate]);

  const loadCheckins = useCallback(() => {
    fetch(`${BASE}/api/activity/checkins-today?date=${monitorDate}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setErpCheckinMap(typeof data === "object" && data !== null ? data : {}))
      .catch(() => {});
  }, [monitorDate]);

  const loadTasks = useCallback(() => {
    fetch(`${BASE}/api/fm-tasks`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (permLoading || !canAccess) return;
    loadActivity();
    loadCheckins();
    loadTasks();
    intervalRef.current = setInterval(() => { loadActivity(); loadCheckins(); }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [permLoading, canAccess, loadActivity, loadCheckins, loadTasks]);

  // HOD dept filter
  const deptFiltered = activity.filter(a => {
    if (isAdmin || hasModuleAccess) return true;
    if (!hodDept) return false;
    return (a.department || "").toLowerCase() === hodDept.toLowerCase();
  });

  const filtered = deptFiltered.filter(a => {
    const name = (a.fullName || a.deviceUsername || a.email).toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !(a.department || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && activityStatus(a) !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    const order: Record<string, number> = { active: 0, idle: 1, offline: 2 };
    return order[activityStatus(a)] - order[activityStatus(b)];
  });

  const activeCount  = deptFiltered.filter(a => activityStatus(a) === "active").length;
  const idleCount    = deptFiltered.filter(a => activityStatus(a) === "idle").length;
  const offlineCount = deptFiltered.filter(a => activityStatus(a) === "offline").length;

  const downloadAgent = () => {
    const a = document.createElement("a");
    a.href = `${BASE}/tools/flowmatrix_activity_agent.py`;
    a.download = "flowmatrix_activity_agent.py";
    a.click();
  };

  // ── Employee detail overlay ────────────────────────────────────────────────
  if (selectedEmployee) {
    return (
      <EmployeeDetailPanel
        row={selectedEmployee}
        tasks={tasks}
        onClose={() => setSelectedEmployee(null)}
        erpCheckin={selectedEmployee.erpEmployeeId ? erpCheckinMap[selectedEmployee.erpEmployeeId] : undefined}
        date={monitorDate}
      />
    );
  }

  if (permLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
          <Shield className="w-12 h-12 text-gray-300" />
          <div>
            <h2 className="text-lg font-bold text-gray-700">Access Not Configured</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              You need to be assigned as a Head of Department or granted Team Pulse access in User Management.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Team Pulse</h1>
                <p className="text-xs text-gray-500">
                  {hodDept && !isAdmin && !hasModuleAccess
                    ? `${hodDept} Department · Real-time monitoring`
                    : "All Departments · Real-time monitoring"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={monitorDate}
                onChange={e => setMonitorDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-700"
              />
              <button onClick={downloadAgent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" /> Agent
              </button>
              <button
                onClick={() => { loadActivity(); loadCheckins(); }}
                disabled={actLoading}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Stats + filters */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {[
              { label: "Active",  count: activeCount,        color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
              { label: "Idle",    count: idleCount,          color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
              { label: "Offline", count: offlineCount,       color: "bg-gray-50 text-gray-500 border-gray-200",    dot: "bg-gray-300" },
              { label: "Total",   count: deptFiltered.length, color: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${s.color}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-lg font-black leading-none">{s.count}</span>
                <span className="font-medium opacity-70">{s.label}</span>
              </div>
            ))}

            {hodDept && !isAdmin && !hasModuleAccess && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" /> {hodDept} · My Department
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-0.5">
                {(["all", "active", "idle", "offline"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${statusFilter === s
                      ? s === "active" ? "bg-green-500 text-white" : s === "idle" ? "bg-amber-400 text-white" : s === "offline" ? "bg-gray-400 text-white" : "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 w-44 bg-gray-50 focus:bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          {actLoading && activity.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <Users className="w-10 h-10 text-gray-300" />
              <div>
                <p className="text-sm font-semibold text-gray-500">No employees found</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {search || statusFilter !== "all" ? "Try adjusting your filters" : "No activity data yet"}
                </p>
              </div>
              {(search || statusFilter !== "all") && (
                <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                  className="text-xs text-violet-600 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400">{filtered.length} employee{filtered.length !== 1 ? "s" : ""} · click any card for detailed view</span>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                  Auto-refreshes every 30s · last {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(row => (
                  <EmployeeCard
                    key={row.deviceUsername || row.email}
                    row={row}
                    erpCheckin={row.erpEmployeeId ? erpCheckinMap[row.erpEmployeeId] : undefined}
                    onClick={() => setSelectedEmployee(row)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
