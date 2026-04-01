import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch,
  Briefcase, FileText,
  LogOut, ChevronDown, ChevronRight as ChevronRightIcon, Menu, MoreHorizontal,
  MonitorPlay, Table2, PenLine, Settings, Zap, ShoppingCart, ShoppingBag, UserCircle, Users, LayoutGrid, Mail, MailOpen, GanttChartSquare, MessageSquare, Sun, Moon, Layers, FolderOpen, Sparkles, X, Activity, Bot, Megaphone, Warehouse, Target, BarChart3, AlertTriangle, Clock, Calendar, Receipt, UserPlus, Grid3x3, PanelLeftClose, Search, Bell, CheckCheck, Trash2, TrendingUp, ListChecks, ClipboardList, Truck,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { AISearch } from "@/components/AISearch";
import { GlobalSearch } from "@/components/GlobalSearch";
import { WaterDropAnimation } from "@/components/WaterAnimation";
import { useTheme, THEME_PRESETS } from "@/hooks/useTheme";
import { useNavStyle } from "@/hooks/useNavStyle";

interface InAppNotification {
  id: number;
  userEmail: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

function NotificationBell({ email }: { email: string | undefined }) {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!email) return;
    try {
      const res = await fetch(`${BASE}/api/notifications?email=${encodeURIComponent(email)}`);
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, [email, BASE]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!email) return;
    await fetch(`${BASE}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: number) => {
    if (!email) return;
    await fetch(`${BASE}/api/notifications/${id}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markRead = async (id: number) => {
    if (!email) return;
    await fetch(`${BASE}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "success": return "text-green-500 bg-green-50";
      case "warning": return "text-amber-500 bg-amber-50";
      case "error": return "text-red-500 bg-red-50";
      default: return "text-blue-500 bg-blue-50";
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn("flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors", !n.read && "bg-blue-50/50 dark:bg-blue-900/10")}
                >
                  <span className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs", typeColor(n.type))}>
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", n.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100")}>{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserAvatar({ user, size = "sm" }: { user: AuthUser | null; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "lg" ? "w-10 h-10" : size === "md" ? "w-9 h-9" : "w-7 h-7";
  const text = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-[10px]";
  const initials = user?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "??";

  if (user?.photo && !imgError) {
    return (
      <img src={user.photo} alt={user.full_name}
        className={cn(dim, "rounded-full object-cover ring-2 ring-white/20 shrink-0")}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={cn(dim, "rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-bold shrink-0 shadow-lg", text)}>
      {initials}
    </div>
  );
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
  color?: string;
  bgColor?: string;
  children?: { path: string; label: string }[];
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Work",
    items: [
      { path: "/calendar", label: "Calendar", icon: Calendar, color: "text-blue-400", bgColor: "bg-blue-500/15" },
    ],
  },
  {
    label: "Main",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-sky-400", bgColor: "bg-sky-500/15" },
    ],
  },
  {
    label: "Projects",
    items: [
      { path: "/projects",          label: "Projects",          icon: Briefcase,        color: "text-blue-400",   bgColor: "bg-blue-500/15" },
      { path: "/project-board",     label: "Project Board",     icon: LayoutGrid,       color: "text-indigo-400", bgColor: "bg-indigo-500/15" },
      { path: "/project-timeline",  label: "Timeline",          icon: GanttChartSquare, color: "text-cyan-400",   bgColor: "bg-cyan-500/15" },
      { path: "/meeting-minutes",   label: "Meeting Minutes",   icon: FileText,         color: "text-teal-400",   bgColor: "bg-teal-500/15" },
      { path: "/project-drawings",  label: "Project Drawings",  icon: FolderOpen,       color: "text-sky-400",    bgColor: "bg-sky-500/15" },
      { path: "/presentation",      label: "Presentation",      icon: MonitorPlay,      color: "text-orange-400", bgColor: "bg-orange-500/15" },
    ],
  },
  {
    label: "Design & Engineering",
    items: [
      {
        path: "/drawings", label: "Drawings", icon: PenTool, color: "text-amber-400", bgColor: "bg-amber-500/15",
        children: [
          { path: "/drawings/mechanical", label: "Mechanical" },
          { path: "/drawings/electrical", label: "Electrical" },
          { path: "/drawings/civil",      label: "Civil" },
        ],
      },
      { path: "/design-2d", label: "Design 2D",    icon: PenLine,   color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
      { path: "/design-3d", label: "Design 3D",    icon: Box,       color: "text-violet-400",  bgColor: "bg-violet-500/15" },
      { path: "/pid",       label: "P&ID Process", icon: GitBranch, color: "text-rose-400",    bgColor: "bg-rose-500/15" },
      { path: "/nesting",   label: "Nesting",      icon: Layers,    color: "text-indigo-400",  bgColor: "bg-indigo-500/15" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { path: "/material-request",   label: "Material Request",   icon: ShoppingCart, color: "text-amber-400",  bgColor: "bg-amber-500/15" },
      { path: "/purchase-order",     label: "Purchase Order",     icon: ShoppingBag,  color: "text-orange-400", bgColor: "bg-orange-500/15" },
      { path: "/purchase-dashboard",   label: "Purchase Dashboard",   icon: BarChart3,    color: "text-blue-400",   bgColor: "bg-blue-500/15" },
      { path: "/stores-dashboard",     label: "Stores Dashboard",     icon: Warehouse,    color: "text-teal-400",   bgColor: "bg-teal-500/15" },
      { path: "/logistics-dashboard",    label: "Logistics Dashboard",      icon: Truck,     color: "text-cyan-400",    bgColor: "bg-cyan-500/15" },
      { path: "/process-proposal",      label: "Process & Proposal",       icon: Layers,    color: "text-indigo-400",  bgColor: "bg-indigo-500/15" },
    ],
  },
  {
    label: "Communication",
    items: [
      { path: "/email",       label: "Email",            icon: Mail,          color: "text-sky-400",    bgColor: "bg-sky-500/15" },
      { path: "/smart-inbox", label: "Smart Inbox (AI)", icon: Bot,           color: "text-orange-400", bgColor: "bg-orange-500/15" },
      { path: "/chat",        label: "FlowTalk",         icon: MessageSquare, color: "text-violet-400", bgColor: "bg-violet-500/15" },
      { path: "/sheets",      label: "Sheets",           icon: Table2,        color: "text-lime-400",   bgColor: "bg-lime-500/15" },
    ],
  },
  {
    label: "Marketing & CRM",
    items: [
      { path: "/marketing", label: "Marketing", icon: Megaphone, color: "text-violet-400", bgColor: "bg-violet-500/15" },
      { path: "/leads",     label: "Leads",     icon: Target,    color: "text-rose-400",   bgColor: "bg-rose-500/15" },
      { path: "/campaigns", label: "Campaigns", icon: BarChart3, color: "text-pink-400",   bgColor: "bg-pink-500/15" },
    ],
  },
  {
    label: "HR",
    items: [
      { path: "/hrms",               label: "HRMS",           icon: UserCircle,    color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
      { path: "/hrms/checkin",       label: "Attendance",     icon: Clock,         color: "text-teal-400",    bgColor: "bg-teal-500/15" },
      { path: "/hrms/leave-request", label: "Leave Request",  icon: Calendar,      color: "text-amber-400",   bgColor: "bg-amber-500/15" },
      { path: "/hrms/claims",        label: "Claims",         icon: Receipt,       color: "text-violet-400",  bgColor: "bg-violet-500/15" },
      { path: "/hrms/recruitment",   label: "Recruitment",    icon: UserPlus,      color: "text-blue-400",    bgColor: "bg-blue-500/15" },
      { path: "/hrms/incidents",     label: "HR Incidents",   icon: AlertTriangle, color: "text-rose-400",    bgColor: "bg-rose-500/15" },
      { path: "/hrms/analytics",    label: "HR Analytics",   icon: BarChart3,     color: "text-indigo-400",  bgColor: "bg-indigo-500/15" },
      { path: "/hrms/performance",       label: "Performance",     icon: TrendingUp,    color: "text-cyan-400",    bgColor: "bg-cyan-500/15" },
      { path: "/hrms/team-performance",  label: "Team Dashboard",  icon: Activity,      color: "text-pink-400",    bgColor: "bg-pink-500/15" },
      { path: "/hrms/task-summary",      label: "Task Summary",    icon: ListChecks,    color: "text-lime-400",    bgColor: "bg-lime-500/15" },
      { path: "/hrms/daily-reporting",   label: "Daily Reporting", icon: ClipboardList, color: "text-orange-400",  bgColor: "bg-orange-500/15" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { path: "/site-data", label: "Site Data", icon: Activity, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
      { path: "/cctv", label: "CCTV", icon: MonitorPlay, color: "text-sky-400", bgColor: "bg-sky-500/15" },
    ],
  },
  {
    label: "Executive",
    items: [
      { path: "/mis-report", label: "MD Dashboard", icon: BarChart3, color: "text-violet-400", bgColor: "bg-violet-500/15" },
    ],
  },
  {
    label: "Admin",
    items: [
      { path: "/payment-tracker", label: "Bill & Recharge", icon: Receipt,  color: "text-indigo-400", bgColor: "bg-indigo-500/15" },
      { path: "/user-management", label: "User Management", icon: Users,    color: "text-red-400",    bgColor: "bg-red-500/15" },
      { path: "/settings",        label: "Settings",        icon: Settings, color: "text-slate-400",  bgColor: "bg-slate-500/15" },
      { path: "/email-settings",  label: "Email Settings",  icon: MailOpen, color: "text-sky-400",    bgColor: "bg-sky-500/15" },
    ],
  },
];

const allNavItems: NavItem[] = navGroups.flatMap(g => g.items);

const mobileBottomNav = [
  { path: "/", label: "Home", icon: LayoutDashboard, color: "text-sky-400" },
  { path: "/project-board", label: "Board", icon: LayoutGrid, color: "text-indigo-400" },
  { path: "/chat", label: "FlowTalk", icon: MessageSquare, color: "text-violet-400" },
  { path: "/hrms", label: "HRMS", icon: UserCircle, color: "text-emerald-400" },
];

function AppLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { theme } = useTheme();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const allItems = navGroups.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));
  const searchResults = search.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(100,116,139,0.35)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-[680px] max-h-[82vh] flex flex-col rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden border border-slate-200"
        style={{ background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f0f4ff 100%)" }}
      >
        {/* Glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px bg-gradient-to-r from-transparent via-indigo-300/80 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/80 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 border border-indigo-200">
            <Grid3x3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search apps…"
              autoFocus
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-7">
          {searchResults ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-5 gap-3">
                {searchResults.map((item) => <AppItem key={item.path} item={item} location={location} theme={theme} onClose={onClose} />)}
              </div>
            </div>
          ) : (
            navGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{group.label}</p>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {group.items.map((item) => <AppItem key={item.path} item={item} location={location} theme={theme} onClose={onClose} />)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200/80 flex items-center justify-between bg-white/60">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">FlowMatriX</span>
          <span className="text-[10px] text-slate-400">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}

function AppItem({ item, location, theme, onClose }: { item: any; location: string; theme: any; onClose: () => void }) {
  const isActive = location === item.path || item.children?.some((c: any) => c.path === location);
  const Icon = item.icon;
  // Convert dark-mode tints (bg-xxx-500/15, text-xxx-400) → solid light-mode versions
  const lightBg    = (item.bgColor ?? "bg-slate-100").replace(/bg-(\w+)-\d+\/\d+/, "bg-$1-100");
  const lightColor = (item.color  ?? "text-slate-500").replace(/text-(\w+)-\d+/,   "text-$1-600");
  return (
    <Link href={item.path} onClick={onClose}>
      <div className={cn(
        "group flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl cursor-pointer transition-all duration-150 text-center relative overflow-hidden",
        isActive
          ? "bg-white shadow-md ring-2 ring-indigo-100"
          : "hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200"
      )}>
        {isActive && (
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 20%, ${theme.accent}, transparent 75%)` }} />
        )}
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-sm",
          lightBg,
          isActive ? "scale-105" : "group-hover:scale-105"
        )}>
          <Icon className={cn("w-6 h-6 transition-transform duration-150 group-hover:scale-110", lightColor)} />
        </div>
        <span className={cn(
          "text-[11px] font-semibold leading-tight w-full transition-colors line-clamp-2",
          isActive ? "text-slate-800" : "text-slate-500 group-hover:text-slate-700"
        )}>
          {item.label}
        </span>
        {isActive && (
          <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: theme.accent }} />
        )}
      </div>
    </Link>
  );
}

function FullSidebar({ location, expandedItems, toggleExpand, expandedGroups, toggleGroup, setCollapsed, setMobileSidebarOpen, aiTrigger, setAiTrigger, logout, theme, user }: any) {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0f172a] to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-950/30 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <WaterDropAnimation size="sm" />
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none flex items-baseline gap-0">
              <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FlowMatri</span>
              <span style={{ color: "#22d3ee", textShadow: "0 0 12px rgba(34,211,238,0.7)", fontSize: "1.35em", lineHeight: 1 }}>X</span>
            </span>
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-slate-600 mt-0.5">Project Management</span>
          </div>
        </Link>
        <button
          onClick={() => { setCollapsed(true); setMobileSidebarOpen(false); }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all group"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      <nav className="relative flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {navGroups.map((group, gi) => {
          const isGroupExpanded = expandedGroups.includes(group.label);
          const groupHasActive = group.items.some(
            item => item.path === location || item.children?.some((c: any) => c.path === location)
          );

          return (
            <div key={gi}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 select-none",
                  groupHasActive
                    ? "text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <span className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.08em]",
                  groupHasActive ? "text-white/90" : "text-slate-300"
                )}>
                  {group.label === "Main" ? "Home" : group.label}
                </span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                  groupHasActive ? "text-white/50" : "text-slate-400",
                  isGroupExpanded ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              {isGroupExpanded && (
                <div className="mt-0.5 mb-2 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.path;
                    const isChildActive = item.children?.some((c: any) => c.path === location);
                    const isExpanded = expandedItems.includes(item.path);
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const iconColor = item.color ?? "text-slate-400";

                    return (
                      <div key={`${item.path}-${item.label}`}>
                        <div
                          className={cn(
                            "group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 text-sm relative",
                            (isActive || isChildActive) ? "bg-white/10 text-white shadow-sm" : "text-slate-200 hover:bg-white/[0.07] hover:text-white"
                          )}
                          onClick={() => { if (hasChildren) toggleExpand(item.path); }}
                        >
                          {(isActive || isChildActive) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ backgroundColor: theme.accent }} />
                          )}
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all", (isActive || isChildActive) ? "bg-white/10" : "bg-white/[0.04] group-hover:bg-white/[0.08]")}>
                            {!hasChildren ? (
                              <Link href={item.path}>
                                <Icon className={cn("w-3.5 h-3.5 transition-colors", (isActive || isChildActive) ? iconColor : "text-slate-300 group-hover:text-white")} style={{ width: 14, height: 14 }} />
                              </Link>
                            ) : (
                              <Icon className={cn("w-3.5 h-3.5 transition-colors", (isActive || isChildActive) ? iconColor : "text-slate-300 group-hover:text-white")} style={{ width: 14, height: 14 }} />
                            )}
                          </div>
                          {!hasChildren ? (
                            <Link href={item.path} className="flex-1 truncate font-medium text-[14px]">{item.label}</Link>
                          ) : (
                            <span className="flex-1 truncate font-medium text-[14px]">{item.label}</span>
                          )}
                          {hasChildren && (
                            <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")} />
                          )}
                        </div>

                        {hasChildren && isExpanded && (
                          <div className="mt-0.5 ml-3 pl-7 border-l border-white/[0.07] space-y-0.5 mb-1">
                            {item.children!.map((child: any) => (
                              <Link
                                key={child.path + child.label}
                                href={child.path}
                                className={cn("flex items-center gap-2 py-1.5 px-2 text-[13px] rounded-lg transition-all", location === child.path ? "font-semibold bg-white/10" : "text-slate-200 hover:text-white hover:bg-white/[0.05]")}
                                style={location === child.path ? { color: theme.accent } : {}}
                              >
                                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: location === child.path ? theme.accent : "#94a3b8" }} />
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.07] p-3 space-y-1">
        <button
          onClick={() => setAiTrigger((t: number) => t + 1)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-1"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          Ask AI
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-medium"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <Zap className="w-2.5 h-2.5 text-indigo-500/50" />
          <p className="text-[9px] text-slate-700 tracking-widest uppercase font-semibold">FlowMatrix</p>
        </div>
      </div>
    </div>
  );
}

function MiniSidebar({ location, expandedItems, toggleExpand, setCollapsed, aiTrigger, setAiTrigger, logout, theme, user, darkMode, toggleDarkMode, setShowThemePicker }: any) {
  return (
    <div className="flex flex-col h-full items-center relative overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0f172a] to-slate-950 pointer-events-none" />
      <div className="relative w-full flex justify-center py-3.5 border-b border-white/[0.07]">
        <span className="text-xs font-black tracking-tight flex items-baseline">
          <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>F</span>
          <span style={{ color: "#22d3ee", textShadow: "0 0 8px rgba(34,211,238,0.8)" }}>M</span>
        </span>
      </div>
      <nav className="relative flex flex-col items-center gap-0.5 w-full px-2 flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-none">
        {allNavItems.map((item) => {
          const isActive = location === item.path || item.children?.some((c: any) => c.path === location);
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const iconColor = item.color ?? "text-slate-400";
          return (
            <div key={`mini-${item.path}-${item.label}`} className="w-full relative group/tooltip">
              {!hasChildren ? (
                <Link href={item.path}>
                  <div className={cn("w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative", isActive ? "bg-white/10 shadow-sm" : "text-slate-500 hover:bg-white/[0.07] hover:text-white")}>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ backgroundColor: theme.accent }} />}
                    <Icon className={isActive ? iconColor : "text-slate-500"} style={{ width: 17, height: 17 }} />
                  </div>
                </Link>
              ) : (
                <div className={cn("w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative", isActive ? "bg-white/10 shadow-sm" : "text-slate-500 hover:bg-white/[0.07] hover:text-white")} onClick={() => toggleExpand(item.path)}>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ backgroundColor: theme.accent }} />}
                  <Icon className={isActive ? iconColor : "text-slate-500"} style={{ width: 17, height: 17 }} />
                </div>
              )}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity delay-75">
                <div className="bg-slate-800 border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="relative flex flex-col items-center gap-2 pt-2 pb-3 border-t border-white/[0.07] w-full px-2 shrink-0">
        <button onClick={() => setAiTrigger((t: number) => t + 1)} className="w-full h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.2))", border: "1px solid rgba(99,102,241,0.35)" }} title="Ask AI">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </button>
        <Link href="/profile" className="block hover:ring-2 hover:ring-indigo-500/40 rounded-full transition-all cursor-pointer">
          <UserAvatar user={user} size="md" />
        </Link>
        <button onClick={toggleDarkMode} className="w-full h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all" title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}>
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => { setCollapsed(false); setShowThemePicker(true); }} className="w-full h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white/10 hover:text-white transition-all" title="Theme color">
          <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.accent }} />
        </button>
        <button onClick={() => setCollapsed(false)} className="w-full h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white/10 hover:text-white transition-all" title="Expand sidebar">
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const COLLAPSED_KEY = "fm_sidebar_collapsed";

const EXPANDED_GROUPS_KEY = "fm_sidebar_expanded_groups";

function getActiveGroupLabel(loc: string): string | null {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === loc || item.children?.some((c: any) => c.path === loc)) {
        return group.label;
      }
    }
  }
  return null;
}

export function Layout({ children, hideChrome }: { children: React.ReactNode; hideChrome?: boolean }) {
  const [location] = useLocation();
  const { navStyle } = useNavStyle();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/drawings"]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const active = getActiveGroupLabel(location);
    return active ? [active] : ["Main"];
  });
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch { return false; }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [aiTrigger, setAiTrigger] = useState(0);
  const { user, logout } = useAuth();
  const { theme, themeIndex, setTheme, darkMode, toggleDarkMode } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try { localStorage.setItem(COLLAPSED_KEY, String(value)); } catch {}
  };

  // Sync with DB-applied sidebar preference (dispatched by applyUserSettingsFromDb)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      setCollapsedState(detail.collapsed);
    };
    window.addEventListener("fm_sidebar_change", handler);
    return () => window.removeEventListener("fm_sidebar_change", handler);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setLauncherOpen(false);
    const activeGroup = getActiveGroupLabel(location);
    if (activeGroup) {
      setExpandedGroups(prev => {
        if (prev.includes(activeGroup)) return prev;
        const next = [...prev, activeGroup];
        try { localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [location]);

  useEffect(() => {
    if (navStyle === "sidebar" && (location === "/email" || location === "/smart-inbox")) {
      setCollapsed(true);
    }
  }, [location, navStyle]);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label];
      try { localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const currentPage = allNavItems.find(i => i.path === location || i.children?.some(c => c.path === location));
  const pageTitle = currentPage?.label ?? "Dashboard";
  const CurrentIcon = currentPage?.icon;

  const sidebarProps = { location, expandedItems, toggleExpand, expandedGroups, toggleGroup, setCollapsed, setMobileSidebarOpen, aiTrigger, setAiTrigger, logout, theme, user, darkMode, toggleDarkMode, setShowThemePicker };

  if (hideChrome) {
    return <div className="min-h-screen bg-slate-100">{children}</div>;
  }

  const isSidebar = navStyle === "sidebar";

  return (
    <div className={cn("min-h-screen bg-[#f1f5f9] fm-bg-main overflow-hidden h-screen", isSidebar ? "flex flex-row" : "flex flex-col")}>
      {/* App Launcher overlay (launcher mode) */}
      {!isSidebar && <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />}

      {/* Sidebar mode */}
      {isSidebar && (
        <>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          )}
          <aside className={cn("hidden md:flex flex-col flex-shrink-0 transition-all duration-300 h-screen sticky top-0 overflow-x-hidden", collapsed ? "w-[60px]" : "w-[220px]")}>
            {collapsed
              ? <MiniSidebar {...sidebarProps} />
              : <FullSidebar {...sidebarProps} />}
          </aside>
          {mobileSidebarOpen && (
            <aside className="fixed inset-y-0 left-0 z-30 w-[260px] flex flex-col md:hidden shadow-2xl">
              <FullSidebar {...sidebarProps} />
            </aside>
          )}
        </>
      )}

      {/* Main area */}
      <div className={cn("flex flex-col overflow-hidden", isSidebar ? "flex-1 h-screen min-w-0" : "flex-1 h-screen")}>
        {/* Header */}
        <header className="h-14 bg-white fm-bg-header border-b border-gray-100 fm-border flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {/* Sidebar mode: mobile toggle / desktop collapse trigger */}
            {isSidebar ? (
              <button
                className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              /* Launcher mode: waffle button */
              <button
                onClick={() => setLauncherOpen(v => !v)}
                className={cn("relative p-2 rounded-xl transition-all duration-200", launcherOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800")}
                title="App Launcher"
              >
                <Grid3x3 className="w-5 h-5" />
                {launcherOpen && <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-400" />}
              </button>
            )}

            {/* Brand (only in launcher mode or mobile) */}
            {!isSidebar && (
              <Link href="/" className="flex items-center gap-2 select-none cursor-pointer">
                <WaterDropAnimation size="sm" />
                <span className="text-base font-black tracking-tight hidden sm:flex items-baseline">
                  <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FlowMatri</span>
                  <span style={{ color: "#22d3ee", textShadow: "0 0 12px rgba(34,211,238,0.7)", fontSize: "1.2em", lineHeight: 1 }}>X</span>
                </span>
              </Link>
            )}

            {/* Page breadcrumb */}
            {isSidebar ? (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
                <span className="font-medium text-gray-300">FlowMatriX</span>
                <ChevronRightIcon className="w-3 h-3 text-gray-300" />
                <span className="font-semibold text-gray-700 fm-text-main">{pageTitle}</span>
              </div>
            ) : (
              CurrentIcon && (
                <>
                  <div className="w-px h-5 bg-gray-200 hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-1.5">
                    <CurrentIcon className={cn("w-3.5 h-3.5", currentPage?.color ?? "text-slate-400")} />
                    <span className="text-sm font-semibold text-gray-700 fm-text-main">{pageTitle}</span>
                  </div>
                </>
              )
            )}
            <span className="sm:hidden text-sm font-semibold text-gray-800">{pageTitle}</span>
          </div>

          {/* Center */}
          <div className="flex flex-1 items-center justify-center gap-2 px-4">
            <div className="hidden md:flex flex-1 max-w-sm">
              <GlobalSearch />
            </div>
            <AISearch currentPath={location} forceOpen={aiTrigger} hideTriggerOnMobile />
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" onClick={() => setAiTrigger(t => t + 1)} title="Ask AI">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </button>
            <NotificationBell email={user?.email} />
            <button onClick={toggleDarkMode} className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all" title={darkMode ? "Light mode" : "Dark mode"}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-px h-5 bg-gray-100 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <UserAvatar user={user} size="sm" />
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.full_name ?? "User"}</p>
                <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[100px]">{user?.email ?? ""}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="pb-16 md:pb-0">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white fm-bg-header border-t border-gray-100 fm-border flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {mobileBottomNav.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className={cn("relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[52px]", isActive ? "text-indigo-600" : "text-gray-400")}>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: theme.accent }} />}
                <Icon className="w-5 h-5" style={isActive ? { color: theme.accent } : {}} />
                <span className="text-[10px] font-medium" style={isActive ? { color: theme.accent } : {}}>{item.label}</span>
              </Link>
            );
          })}
          {isSidebar ? (
            <button className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-400 min-h-[52px]" onClick={() => setMobileSidebarOpen(true)}>
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          ) : (
            <button className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors", launcherOpen ? "text-indigo-600" : "text-gray-400")} onClick={() => setLauncherOpen(v => !v)}>
              <Grid3x3 className="w-5 h-5" style={launcherOpen ? { color: theme.accent } : {}} />
              <span className="text-[10px] font-medium" style={launcherOpen ? { color: theme.accent } : {}}>Apps</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
