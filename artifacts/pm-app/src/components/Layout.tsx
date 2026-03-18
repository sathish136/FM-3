import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch,
  Briefcase, Users, ChevronDown, FileText,
  ChevronRight, LogOut, ChevronLeft, ChevronRight as ChevronRightIcon, Menu,
  MonitorPlay, Table2, PenLine,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, type AuthUser } from "@/hooks/useAuth";

function UserAvatar({ user, size = "sm" }: { user: AuthUser | null; size?: "sm" | "md" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "md" ? "w-9 h-9" : "w-8 h-8";
  const text = size === "md" ? "text-sm" : "text-xs";
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
    <div className={cn(dim, "rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0", text)}>
      {initials}
    </div>
  );
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
  children?: { path: string; label: string }[];
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/viewer-options/mechanical", label: "3D Viewer", icon: Box },
  {
    path: "/drawings", label: "Drawings", icon: PenTool,
    children: [
      { path: "/drawings/mechanical", label: "Design Mechanical" },
      { path: "/drawings/electrical", label: "Design Electrical" },
      { path: "/drawings/civil",      label: "Design Civil" },
    ],
  },
  { path: "/design-2d", label: "Design 2D", icon: PenLine },
  { path: "/design-3d", label: "Design 3D", icon: Box },
  { path: "/presentation", label: "Presentation", icon: MonitorPlay },
  { path: "/pid", label: "P&ID Process", icon: GitBranch },
  { path: "/projects", label: "Projects", icon: Briefcase },
  { path: "/meeting-minutes", label: "Meeting Minutes", icon: FileText },
  { path: "/sheets", label: "Sheets", icon: Table2 },
  { path: "/team", label: "Team", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/drawings"]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleExpand = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const currentPage = navItems.find(i => i.path === location || i.children?.some(c => c.path === location));
  const pageTitle = currentPage?.label ?? "Dashboard";

  const FullSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">WTT-Project</p>
            <p className="text-slate-400 text-[10px] leading-tight">Management System</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const isExpanded = expandedItems.includes(item.path);
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={`${item.path}-${item.label}`}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm",
                  isActive
                    ? "bg-white/15 text-white font-semibold ring-1 ring-white/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
                onClick={() => { if (hasChildren) toggleExpand(item.path); }}
              >
                {!hasChildren ? (
                  item.external ? (
                    <a href={item.path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link href={item.path} className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                ) : (
                  <>
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      : <ChevronRightIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />}
                  </>
                )}
              </div>

              {hasChildren && isExpanded && item.children!.map((child) => (
                <Link
                  key={child.path + child.label}
                  href={child.path}
                  className={cn(
                    "flex items-center gap-2 pl-10 pr-3 py-2 text-sm rounded-lg transition-all mx-0",
                    location === child.path
                      ? "text-white bg-white/10 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-white/8"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                  {child.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link href="/profile" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
          <UserAvatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name ?? "User"}</p>
            <p className="text-slate-400 text-[10px] truncate">{user?.email ?? ""}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  const MiniSidebar = () => (
    <div className="flex flex-col h-full items-center py-3 gap-1">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20 mb-2 shrink-0">
        <Box className="w-4 h-4 text-white" />
      </div>

      {/* Nav icons — no scroll, all items fit */}
      <nav className="flex flex-col items-center gap-0.5 w-full px-2 flex-1">
        {navItems.map((item) => {
          const isActive = location === item.path || item.children?.some(c => c.path === location);
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={`mini-${item.path}-${item.label}`} className="w-full relative group/tooltip">
              {!hasChildren ? (
                item.external ? (
                  <a href={item.path} target="_blank" rel="noopener noreferrer">
                    <div className="w-full h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:bg-white/10 hover:text-white">
                      <Icon style={{ width: 18, height: 18 }} />
                    </div>
                  </a>
                ) : (
                <Link href={item.path}>
                  <div className={cn(
                    "w-full h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                    isActive
                      ? "bg-white/20 text-white ring-1 ring-white/25 shadow-sm"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}>
                    <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  </div>
                </Link>
                )
              ) : (
                <div
                  className={cn(
                    "w-full h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                    isActive
                      ? "bg-white/20 text-white ring-1 ring-white/25 shadow-sm"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => toggleExpand(item.path)}
                >
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity delay-75">
                <div className="bg-[#1e293b] border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1e293b]" />
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: avatar + expand */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10 w-full px-2 shrink-0">
        <Link href="/profile" className="block hover:ring-2 hover:ring-white/30 rounded-full transition-all cursor-pointer">
          <UserAvatar user={user} size="md" />
        </Link>
        <button
          onClick={() => setCollapsed(false)}
          className="w-full h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row overflow-hidden">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={cn(
        "flex flex-col flex-shrink-0 transition-all duration-300",
        "bg-[#0f172a]",
        collapsed ? "w-[64px]" : "w-56"
      )}>
        {collapsed ? <MiniSidebar /> : <FullSidebar />}
      </aside>

      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-30 w-56 flex flex-col bg-[#0f172a] md:hidden">
          <FullSidebar />
        </aside>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800">WTT Project Management</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <UserAvatar user={user} size="sm" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.full_name ?? "User"}</p>
                <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[140px]">{user?.email ?? ""}</p>
              </div>
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
