import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Monitor, Clock, Wifi, WifiOff, Coffee, Zap, CheckCircle2,
  AlertCircle, Calendar, Briefcase, User, Building2, MapPin,
  Badge, Activity, RefreshCw, Bell, ChevronRight, Tag,
  CircleDot, Play, Check, RotateCcw, Star, TrendingUp,
  Phone, Mail, Award, FileText, LogOut,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────
interface EmpProfile {
  email: string; full_name: string; username: string | null;
  employee_number: string | null; designation: string | null;
  department: string | null; company: string | null; branch: string | null;
  date_of_joining: string | null; employment_type: string | null;
  gender: string | null; employee_status: string | null;
  reports_to: string | null; grade: string | null; photo: string | null;
}
interface FmTask {
  id: number; title: string; description?: string | null;
  status: string; priority: string;
  assigneeEmail?: string | null; assigneeName?: string | null;
  createdBy: string; dueDate?: string | null; tags?: string | null;
  createdAt: string; updatedAt: string;
  projectId?: number | null;
}
interface ActivityRow {
  deviceUsername: string; fullName: string; department: string;
  designation: string; erpEmployeeId: string; erpImage: string;
  activeApp: string; windowTitle: string;
  isActive: boolean; idleSeconds: number; deviceName: string; lastSeen: string;
}
interface Notification {
  id: number; title: string; message: string; type: string;
  read: boolean; createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function timeSince(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function fmtIdle(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function isOverdue(due: string | null | undefined, status: string) {
  return !!due && due < new Date().toISOString().split("T")[0] && status !== "done";
}

const STATUS_CFG: Record<string, { label: string; icon: React.ReactNode; ring: string; badge: string }> = {
  todo:        { label: "To Do",        icon: <CircleDot className="w-3.5 h-3.5" />,    ring: "border-l-[#4B5563]",  badge: "bg-[#1F2937] text-[#9CA3AF]" },
  in_progress: { label: "In Progress",  icon: <Play className="w-3.5 h-3.5" />,         ring: "border-l-[#2492FF]",  badge: "bg-[#1A3A6E] text-[#2492FF]" },
  review:      { label: "In Review",    icon: <RotateCcw className="w-3.5 h-3.5" />,   ring: "border-l-[#F59E0B]",  badge: "bg-[#451A03] text-[#F59E0B]" },
  done:        { label: "Done",         icon: <Check className="w-3.5 h-3.5" />,        ring: "border-l-[#10B981]",  badge: "bg-[#064E3B] text-[#10B981]" },
};
const PRIORITY_CFG: Record<string, { dot: string; label: string; pill: string }> = {
  high:   { dot: "bg-[#EF4444]", label: "High",   pill: "bg-[#450A0A] text-[#EF4444]" },
  medium: { dot: "bg-[#F59E0B]", label: "Medium", pill: "bg-[#451A03] text-[#F59E0B]" },
  low:    { dot: "bg-[#10B981]", label: "Low",    pill: "bg-[#064E3B] text-[#10B981]" },
};
const GROUP_ORDER = ["in_progress", "todo", "review", "done"];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: number; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-[#1A1836] rounded-2xl p-5 border border-[#2A2850] flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-white leading-none">{value}</div>
        <div className="text-xs font-semibold text-[#9491B4] mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-[#5B5880] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task }: { task: FmTask }) {
  const sc = STATUS_CFG[task.status] || STATUS_CFG.todo;
  const pc = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className={`bg-[#1A1836] rounded-xl border border-[#2A2850] border-l-4 ${sc.ring} overflow-hidden hover:border-[#3D3A6E] transition-all`}>
      <div className="p-4">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-bold text-white leading-snug flex-1">{task.title}</h4>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 ${sc.badge}`}>
            {sc.icon} {sc.label}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-[#9491B4] leading-relaxed mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority */}
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${pc.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} /> {pc.label}
          </span>

          {/* Tags */}
          {task.tags && task.tags.split(",").filter(t => t.trim()).slice(0, 2).map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2D1B69] text-[#A78BFA] text-[10px] font-medium">
              <Tag className="w-2.5 h-2.5" /> {tag.trim()}
            </span>
          ))}

          {/* Due date */}
          {task.dueDate && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ml-auto ${overdue ? "bg-[#450A0A] text-[#EF4444]" : "bg-[#12102A] text-[#5B5880]"}`}>
              {overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
              {overdue ? "Overdue · " : ""}{task.dueDate}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-[#2A2850] flex items-center justify-between">
          <span className="text-[10px] text-[#5B5880]">by {task.createdBy.split("@")[0]}</span>
          <span className="text-[10px] text-[#5B5880]">{timeSince(task.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmpAgent() {
  const { user, logout } = useAuth();
  const [profile,    setProfile]    = useState<EmpProfile | null>(null);
  const [tasks,      setTasks]      = useState<FmTask[]>([]);
  const [activity,   setActivity]   = useState<ActivityRow | null>(null);
  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    if (!user?.email) return;
    try {
      const [profRes, tasksRes, actRes, notifRes] = await Promise.all([
        fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(user.email)}`),
        fetch(`${BASE}/api/fm-tasks`),
        fetch(`${BASE}/api/activity/live`),
        fetch(`${BASE}/api/notifications?email=${encodeURIComponent(user.email)}`),
      ]);

      if (profRes.ok) {
        const p = await profRes.json();
        setProfile({
          ...p,
          photo: p.photo ? `${BASE}/api/auth/photo?url=${encodeURIComponent(p.photo)}` : null,
        });
      }
      if (tasksRes.ok) {
        const all: FmTask[] = await tasksRes.json();
        const name = user.name?.toLowerCase() || "";
        const email = user.email.toLowerCase();
        setTasks(all.filter(t =>
          (t.assigneeEmail?.toLowerCase() === email) ||
          (t.assigneeName && name && (
            t.assigneeName.toLowerCase().includes(name.split(" ")[0]) ||
            name.includes(t.assigneeName.toLowerCase().split(" ")[0])
          ))
        ));
      }
      if (actRes.ok) {
        const liveList: ActivityRow[] = await actRes.json();
        const me = liveList.find(a =>
          a.email?.toLowerCase() === user.email.toLowerCase() ||
          a.fullName?.toLowerCase().includes((user.name || "").toLowerCase().split(" ")[0])
        );
        setActivity(me || null);
      }
      if (notifRes.ok) setNotifs(await notifRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Derived stats
  const total     = tasks.length;
  const inProg    = tasks.filter(t => t.status === "in_progress").length;
  const done      = tasks.filter(t => t.status === "done").length;
  const overdueCt = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  const unread    = notifs.filter(n => !n.read).length;

  // Activity status
  const actSecsAgo = activity ? (Date.now() - new Date(activity.lastSeen).getTime()) / 1000 : Infinity;
  const isOnline   = actSecsAgo < 300;
  const isIdle     = isOnline && (!activity?.isActive || (activity?.idleSeconds || 0) > 300);
  const isActive   = isOnline && !isIdle;

  const statusColor = isActive ? "bg-[#10B981]" : isIdle ? "bg-[#F59E0B]" : "bg-[#4B5563]";
  const statusLabel = isActive ? "Active" : isIdle ? "Idle" : "Offline";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0B1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#2492FF] border-t-transparent animate-spin" />
          <p className="text-[#9491B4] text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0B1A] flex flex-col font-sans">

      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 bg-[#12102A] border-b border-[#2A2850] px-6 py-0 flex items-center justify-between" style={{ height: 56 }}>
        <div className="flex items-center gap-3">
          <span className="text-[#2492FF] text-xl font-black">⚡</span>
          <span className="text-white font-bold text-base tracking-tight">FlowMatriX</span>
          <span className="text-[#2A2850]">|</span>
          <span className="text-[#9491B4] text-sm">Employee Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${statusColor}`} />
            <span className="text-xs text-[#9491B4] font-medium">{statusLabel}</span>
          </div>
          {/* Refresh */}
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1836] hover:bg-[#2A2850] text-[#9491B4] text-xs font-medium transition-colors border border-[#2A2850]">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          {/* Notifications */}
          <div className="relative">
            <Bell className="w-4 h-4 text-[#9491B4]" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF3C00] text-white text-[9px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
          {/* Time */}
          <span className="text-xs text-[#5B5880]">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          {/* Logout */}
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1836] hover:bg-[#2A2850] text-[#9491B4] hover:text-white text-xs font-medium transition-colors border border-[#2A2850]">
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <aside className="w-[300px] flex-shrink-0 bg-[#12102A] border-r border-[#2A2850] overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* ── Employee Profile ── */}
            <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] overflow-hidden">
              {/* Hero gradient */}
              <div className="h-20 bg-gradient-to-br from-[#2492FF]/30 via-[#7C3AED]/20 to-[#1A1836]" />

              <div className="px-5 pb-5">
                {/* Avatar */}
                <div className="-mt-10 mb-3">
                  {profile?.photo ? (
                    <img src={profile.photo} alt={profile.full_name}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-[#1A1836] shadow-xl" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2492FF] to-[#7C3AED] flex items-center justify-center text-white text-2xl font-black border-4 border-[#1A1836] shadow-xl">
                      {initials(profile?.full_name || user?.name || "?")}
                    </div>
                  )}
                </div>

                {/* Name + status */}
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-base font-black text-white leading-tight">
                    {profile?.full_name || user?.name || user?.email}
                  </h2>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" /> {statusLabel}
                  </span>
                </div>

                {profile?.designation && (
                  <p className="text-[#2492FF] text-xs font-bold mb-0.5">{profile.designation}</p>
                )}
                {profile?.department && (
                  <p className="text-[#9491B4] text-xs">{profile.department}</p>
                )}

                {/* Employee ID badge */}
                {profile?.employee_number && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12102A] border border-[#2A2850]">
                    <Badge className="w-3 h-3 text-[#2492FF]" />
                    <span className="text-xs font-mono text-[#9491B4]">{profile.employee_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Employee Details ── */}
            <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] p-5">
              <h3 className="text-[10px] font-bold text-[#5B5880] uppercase tracking-widest mb-4">Employee Details</h3>
              <div className="space-y-3">
                {[
                  { icon: <Mail className="w-3.5 h-3.5" />,     label: "Email",         val: user?.email },
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: "Company",       val: profile?.company },
                  { icon: <MapPin className="w-3.5 h-3.5" />,    label: "Branch",        val: profile?.branch },
                  { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Joined",        val: profile?.date_of_joining },
                  { icon: <Briefcase className="w-3.5 h-3.5" />, label: "Employment",    val: profile?.employment_type },
                  { icon: <User className="w-3.5 h-3.5" />,      label: "Gender",        val: profile?.gender },
                  { icon: <Star className="w-3.5 h-3.5" />,      label: "Grade",         val: profile?.grade },
                  { icon: <Award className="w-3.5 h-3.5" />,     label: "Reports To",    val: profile?.reports_to },
                  { icon: <Activity className="w-3.5 h-3.5" />,  label: "Status",        val: profile?.employee_status },
                ].filter(r => r.val).map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="text-[#5B5880] flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#5B5880] font-bold uppercase tracking-wider">{row.label}</div>
                      <div className="text-xs text-[#F1F0FF] font-medium truncate">{row.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Live Activity ── */}
            <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] p-5">
              <h3 className="text-[10px] font-bold text-[#5B5880] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColor} ${isActive ? "animate-pulse" : ""}`} />
                Live Activity
              </h3>

              {activity && isOnline ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#12102A] rounded-xl">
                    <Monitor className="w-4 h-4 text-[#2492FF] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#5B5880] font-bold uppercase tracking-wider">Current App</div>
                      <div className="text-xs text-white font-bold">{activity.activeApp || "—"}</div>
                      {activity.windowTitle && activity.windowTitle !== activity.activeApp && (
                        <div className="text-[10px] text-[#9491B4] truncate mt-0.5" title={activity.windowTitle}>{activity.windowTitle}</div>
                      )}
                    </div>
                  </div>
                  {isIdle && activity.idleSeconds > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-[#451A03]/40 rounded-xl border border-[#F59E0B]/20">
                      <Coffee className="w-4 h-4 text-[#F59E0B]" />
                      <div>
                        <div className="text-[9px] text-[#F59E0B] font-bold uppercase tracking-wider">Idle Time</div>
                        <div className="text-xs text-[#F59E0B] font-bold">{fmtIdle(activity.idleSeconds)}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-[#12102A] rounded-xl">
                    <Monitor className="w-4 h-4 text-[#5B5880]" />
                    <div>
                      <div className="text-[9px] text-[#5B5880] font-bold uppercase tracking-wider">Device</div>
                      <div className="text-[10px] text-[#9491B4] font-mono">{activity.deviceName}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#5B5880] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Last seen {timeSince(activity.lastSeen)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <WifiOff className="w-8 h-8 text-[#2A2850]" />
                  <p className="text-xs text-[#5B5880] text-center">Agent not running<br />
                    <span className="text-[10px]">Download & run the agent script</span>
                  </p>
                </div>
              )}
            </div>

            {/* ── Recent Notifications ── */}
            {notifs.length > 0 && (
              <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] p-5">
                <h3 className="text-[10px] font-bold text-[#5B5880] uppercase tracking-widest mb-4 flex items-center justify-between">
                  Notifications
                  {unread > 0 && <span className="px-1.5 py-0.5 rounded-full bg-[#FF3C00] text-white text-[9px] font-bold">{unread}</span>}
                </h3>
                <div className="space-y-2">
                  {notifs.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-3 rounded-xl border transition-colors ${n.read ? "bg-[#12102A] border-transparent" : "bg-[#1E1C3A] border-[#2A2850]"}`}>
                      <div className={`text-[10px] font-bold mb-0.5 ${n.type === "success" ? "text-[#10B981]" : n.type === "warning" ? "text-[#F59E0B]" : n.type === "error" ? "text-[#EF4444]" : "text-[#2492FF]"}`}>
                        {n.title}
                      </div>
                      <div className="text-[10px] text-[#9491B4] leading-snug">{n.message}</div>
                      <div className="text-[9px] text-[#5B5880] mt-1">{timeSince(n.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* ── Welcome banner ── */}
            <div className="bg-gradient-to-r from-[#2492FF]/10 via-[#7C3AED]/10 to-transparent rounded-2xl border border-[#2492FF]/20 px-6 py-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-white">
                  Welcome back, {(profile?.full_name || user?.name || "Employee")?.split(" ")[0]} 👋
                </h1>
                <p className="text-sm text-[#9491B4] mt-0.5">
                  Here's your work overview for today — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex-shrink-0">
                {isActive ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#064E3B] border border-[#10B981]/30">
                    <Zap className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs font-bold text-[#10B981]">You're Active</span>
                  </div>
                ) : isIdle ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#451A03] border border-[#F59E0B]/30">
                    <Coffee className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-xs font-bold text-[#F59E0B]">Idle · {fmtIdle(activity?.idleSeconds || 0)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1836] border border-[#2A2850]">
                    <WifiOff className="w-4 h-4 text-[#5B5880]" />
                    <span className="text-xs font-bold text-[#5B5880]">Agent Offline</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Tasks" value={total} sub="All assigned"
                icon={<FileText className="w-5 h-5 text-[#2492FF]" />} color="bg-[#1A3A6E]" />
              <StatCard label="In Progress" value={inProg} sub="Working on"
                icon={<Play className="w-5 h-5 text-[#F59E0B]" />} color="bg-[#451A03]" />
              <StatCard label="Completed" value={done} sub={total > 0 ? `${Math.round((done/total)*100)}% completion` : ""}
                icon={<CheckCircle2 className="w-5 h-5 text-[#10B981]" />} color="bg-[#064E3B]" />
              <StatCard label="Overdue" value={overdueCt} sub="Needs attention"
                icon={<AlertCircle className="w-5 h-5 text-[#EF4444]" />} color="bg-[#450A0A]" />
            </div>

            {/* ── Progress bar ── */}
            {total > 0 && (
              <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] px-6 py-4 flex items-center gap-5">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#2492FF]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#9491B4]">Overall Completion</span>
                    <span className="text-sm font-black text-white">{Math.round((done / total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-[#12102A] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#2492FF] to-[#10B981] rounded-full transition-all"
                      style={{ width: `${Math.round((done / total) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                  {[
                    { label: "To Do", val: tasks.filter(t => t.status === "todo").length, color: "text-[#9491B4]" },
                    { label: "In Progress", val: inProg, color: "text-[#F59E0B]" },
                    { label: "Review", val: tasks.filter(t => t.status === "review").length, color: "text-[#7C3AED]" },
                    { label: "Done", val: done, color: "text-[#10B981]" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={`font-black text-base leading-none ${s.color}`}>{s.val}</div>
                      <div className="text-[#5B5880] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tasks ── */}
            {total === 0 ? (
              <div className="bg-[#1A1836] rounded-2xl border border-[#2A2850] py-16 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-[#2A2850] mb-4" />
                <p className="text-[#9491B4] font-semibold">No tasks assigned to you yet</p>
                <p className="text-[#5B5880] text-sm mt-1">Your manager will assign tasks and you'll see them here</p>
              </div>
            ) : (
              GROUP_ORDER.map(status => {
                const group = tasks.filter(t => t.status === status);
                if (!group.length) return null;
                const sc = STATUS_CFG[status];
                return (
                  <div key={status}>
                    {/* Group header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold ${sc.badge}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className="text-[#5B5880] text-xs">{group.length} task{group.length !== 1 ? "s" : ""}</span>
                      <div className="flex-1 h-px bg-[#2A2850]" />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {group.map(task => <TaskCard key={task.id} task={task} />)}
                    </div>
                  </div>
                );
              })
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
