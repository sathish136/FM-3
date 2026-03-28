import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch,
  Briefcase, FileText,
  LogOut,
  MonitorPlay, Table2, PenLine, Settings, Zap, ShoppingCart, ShoppingBag, UserCircle, Users, LayoutGrid, Mail, MailOpen, GanttChartSquare, MessageSquare, Sun, Moon, Layers, FolderOpen, Sparkles, X, Activity, Bot, Megaphone, Warehouse, Target, BarChart3, AlertTriangle, Clock, Calendar, Receipt, UserPlus, Grid3x3, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { AISearch } from "@/components/AISearch";
import { GlobalSearch } from "@/components/GlobalSearch";
import { WaterDropAnimation } from "@/components/WaterAnimation";
import { useTheme, THEME_PRESETS } from "@/hooks/useTheme";

function UserAvatar({ user, size = "sm" }: { user: AuthUser | null; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "lg" ? "w-10 h-10" : size === "md" ? "w-9 h-9" : "w-7 h-7";
  const text = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-[10px]";
  const initials = user?.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "??";

  if (user?.photo && !imgError) {
    return (
      <img
        src={user.photo}
        alt={user.full_name}
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
      { path: "/project-drawings",  label: "Drawings",          icon: FolderOpen,       color: "text-sky-400",    bgColor: "bg-sky-500/15" },
      { path: "/presentation",      label: "Presentation",      icon: MonitorPlay,      color: "text-orange-400", bgColor: "bg-orange-500/15" },
    ],
  },
  {
    label: "Design & Engineering",
    items: [
      { path: "/drawings/mechanical", label: "Mechanical",   icon: PenTool,   color: "text-amber-400",   bgColor: "bg-amber-500/15" },
      { path: "/drawings/electrical", label: "Electrical",   icon: Zap,       color: "text-yellow-400",  bgColor: "bg-yellow-500/15" },
      { path: "/drawings/civil",      label: "Civil",        icon: Layers,    color: "text-indigo-400",  bgColor: "bg-indigo-500/15" },
      { path: "/design-2d",           label: "Design 2D",    icon: PenLine,   color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
      { path: "/design-3d",           label: "Design 3D",    icon: Box,       color: "text-violet-400",  bgColor: "bg-violet-500/15" },
      { path: "/pid",                 label: "P&ID Process", icon: GitBranch, color: "text-rose-400",    bgColor: "bg-rose-500/15" },
      { path: "/nesting",             label: "Nesting",      icon: Layers,    color: "text-indigo-400",  bgColor: "bg-indigo-500/15" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { path: "/material-request",   label: "Material Request",   icon: ShoppingCart, color: "text-amber-400",  bgColor: "bg-amber-500/15" },
      { path: "/purchase-order",     label: "Purchase Order",     icon: ShoppingBag,  color: "text-orange-400", bgColor: "bg-orange-500/15" },
      { path: "/purchase-dashboard", label: "Purchase Dashboard", icon: BarChart3,    color: "text-blue-400",   bgColor: "bg-blue-500/15" },
      { path: "/stores-dashboard",   label: "Stores",             icon: Warehouse,    color: "text-teal-400",   bgColor: "bg-teal-500/15" },
    ],
  },
  {
    label: "Communication",
    items: [
      { path: "/email",       label: "Email",           icon: Mail,          color: "text-sky-400",    bgColor: "bg-sky-500/15" },
      { path: "/smart-inbox", label: "Smart Inbox (AI)", icon: Bot,          color: "text-orange-400", bgColor: "bg-orange-500/15" },
      { path: "/chat",        label: "FlowTalk",        icon: MessageSquare, color: "text-violet-400", bgColor: "bg-violet-500/15" },
      { path: "/sheets",      label: "Sheets",          icon: Table2,        color: "text-lime-400",   bgColor: "bg-lime-500/15" },
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
    ],
  },
  {
    label: "Monitoring",
    items: [
      { path: "/site-data", label: "Site Data", icon: Activity, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
    ],
  },
  {
    label: "Admin",
    items: [
      { path: "/payment-tracker", label: "Payment Tracker", icon: Receipt,  color: "text-indigo-400", bgColor: "bg-indigo-500/15" },
      { path: "/user-management", label: "User Management", icon: Users,    color: "text-red-400",    bgColor: "bg-red-500/15" },
      { path: "/settings",        label: "Settings",        icon: Settings, color: "text-slate-400",  bgColor: "bg-slate-500/15" },
      { path: "/email-settings",  label: "Email Settings",  icon: MailOpen, color: "text-sky-400",    bgColor: "bg-sky-500/15" },
    ],
  },
];

const allNavItems: NavItem[] = navGroups.flatMap(g => g.items);

function AppLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location, navigate] = useLocation();
  const { theme } = useTheme();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-start"
      style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative h-full w-full max-w-[520px] flex flex-col shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #111827 60%, #0a0f1e 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))", border: "1px solid rgba(99,102,241,0.4)" }}>
              <Grid3x3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">App Launcher</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">FlowMatriX</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2.5 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {group.items.map((item) => {
                  const isActive = location === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={onClose}
                    >
                      <div className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all duration-150 text-center group",
                        isActive
                          ? "bg-white/10 ring-1 ring-white/20"
                          : "hover:bg-white/[0.07]"
                      )}>
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                          item.bgColor ?? "bg-white/10",
                          isActive ? "scale-105 shadow-lg" : "group-hover:scale-105"
                        )}>
                          <Icon className={cn("w-5 h-5", item.color ?? "text-slate-400")} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium leading-tight w-full",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                        )}>
                          {item.label}
                        </span>
                        {isActive && (
                          <span className="w-1 h-1 rounded-full -mt-1" style={{ backgroundColor: theme.accent }} />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Layout({ children, hideChrome }: { children: React.ReactNode; hideChrome?: boolean }) {
  const [location] = useLocation();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [aiTrigger, setAiTrigger] = useState(0);
  const { user, logout } = useAuth();
  const { theme, themeIndex, setTheme, darkMode, toggleDarkMode } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    setLauncherOpen(false);
  }, [location]);

  const currentPage = allNavItems.find(i => i.path === location);
  const pageTitle = currentPage?.label ?? "Dashboard";
  const CurrentIcon = currentPage?.icon;

  if (hideChrome) {
    return <div className="min-h-screen bg-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] fm-bg-main flex flex-col overflow-hidden h-screen">
      {/* App Launcher Overlay */}
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />

      {/* Header */}
      <header className="h-14 bg-white fm-bg-header border-b border-gray-100 fm-border flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        {/* Left: Launcher + Brand + Page */}
        <div className="flex items-center gap-3">
          {/* App Launcher Button */}
          <button
            onClick={() => setLauncherOpen(v => !v)}
            className={cn(
              "relative p-2 rounded-xl transition-all duration-200 group",
              launcherOpen
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            )}
            title="App Launcher"
          >
            <Grid3x3 className="w-5 h-5" />
            {launcherOpen && (
              <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-400" />
            )}
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2 select-none">
            <WaterDropAnimation size="sm" />
            <span className="text-base font-black tracking-tight hidden sm:flex items-baseline">
              <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FlowMatri</span><span style={{ color: "#22d3ee", textShadow: "0 0 12px rgba(34,211,238,0.7)", fontSize: "1.2em", lineHeight: 1 }}>X</span>
            </span>
          </div>

          {/* Divider + Page */}
          {CurrentIcon && (
            <>
              <div className="w-px h-5 bg-gray-200 fm-border hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1.5">
                <CurrentIcon className={cn("w-3.5 h-3.5", currentPage?.color ?? "text-slate-400")} />
                <span className="text-sm font-semibold text-gray-700 fm-text-main">{pageTitle}</span>
              </div>
            </>
          )}
          {/* Mobile page title */}
          <span className="sm:hidden text-sm font-semibold text-gray-800 fm-text-main">{pageTitle}</span>
        </div>

        {/* Center: Search + AI */}
        <div className="flex flex-1 items-center justify-center gap-2 px-4">
          <div className="hidden md:flex flex-1 max-w-sm">
            <GlobalSearch />
          </div>
          <AISearch currentPath={location} forceOpen={aiTrigger} hideTriggerOnMobile />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile AI */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setAiTrigger(t => t + 1)}
            title="Ask AI"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Theme color dot */}
          <button
            onClick={() => setShowThemePicker(v => !v)}
            className="hidden sm:flex p-2 rounded-xl hover:bg-gray-100 transition-all"
            title="Theme color"
          >
            <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.accent }} />
          </button>

          {/* Theme picker popover */}
          {showThemePicker && (
            <div className="absolute top-14 right-4 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 p-4 w-64">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Theme Color</p>
              <div className="grid grid-cols-5 gap-2">
                {THEME_PRESETS.map((p, idx) => (
                  <button
                    key={p.accent}
                    onClick={() => { setTheme(idx); setShowThemePicker(false); }}
                    className="w-9 h-9 rounded-xl border-2 transition-all hover:scale-110"
                    style={{ backgroundColor: p.accent, borderColor: themeIndex === idx ? p.accent : "transparent" }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="w-px h-5 bg-gray-100 hidden sm:block" />

          {/* User info */}
          <div className="hidden sm:flex items-center gap-2">
            <UserAvatar user={user} size="sm" />
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.full_name ?? "User"}</p>
              <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[100px]">{user?.email ?? ""}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white fm-bg-header border-t border-gray-100 fm-border flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[
          { path: "/", label: "Home", icon: LayoutDashboard, color: "text-sky-400" },
          { path: "/project-board", label: "Board", icon: LayoutGrid, color: "text-indigo-400" },
          { path: "/chat", label: "FlowTalk", icon: MessageSquare, color: "text-violet-400" },
          { path: "/hrms", label: "HRMS", icon: UserCircle, color: "text-emerald-400" },
        ].map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[52px]",
                isActive ? "text-indigo-600" : "text-gray-400"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: theme.accent }} />
              )}
              <Icon className="w-5 h-5" style={isActive ? { color: theme.accent } : {}} />
              <span className="text-[10px] font-medium" style={isActive ? { color: theme.accent } : {}}>{item.label}</span>
            </Link>
          );
        })}
        {/* Apps launcher button */}
        <button
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors",
            launcherOpen ? "text-indigo-600" : "text-gray-400"
          )}
          onClick={() => setLauncherOpen(v => !v)}
        >
          <Grid3x3 className="w-5 h-5" style={launcherOpen ? { color: theme.accent } : {}} />
          <span className="text-[10px] font-medium" style={launcherOpen ? { color: theme.accent } : {}}>Apps</span>
        </button>
      </nav>
    </div>
  );
}
