import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch,
  Briefcase, ChevronDown, FileText,
  ChevronRight, LogOut, ChevronLeft, ChevronRight as ChevronRightIcon, Menu,
  MonitorPlay, Table2, PenLine, Settings, Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { AISearch } from "@/components/AISearch";
import { WaterDropAnimation } from "@/components/WaterAnimation";

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
  children?: { path: string; label: string }[];
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-sky-400" },
    ],
  },
  {
    label: "Design & Engineering",
    items: [
      {
        path: "/drawings", label: "Drawings", icon: PenTool, color: "text-amber-400",
        children: [
          { path: "/drawings/mechanical", label: "Design Mechanical" },
          { path: "/drawings/electrical", label: "Design Electrical" },
          { path: "/drawings/civil", label: "Design Civil" },
        ],
      },
      { path: "/design-2d", label: "Design 2D", icon: PenLine, color: "text-emerald-400" },
      { path: "/design-3d", label: "Design 3D", icon: Box, color: "text-violet-400" },
      { path: "/pid", label: "P&ID Process", icon: GitBranch, color: "text-rose-400" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { path: "/presentation", label: "Presentation", icon: MonitorPlay, color: "text-orange-400" },
      { path: "/projects", label: "Projects", icon: Briefcase, color: "text-blue-400" },
      { path: "/meeting-minutes", label: "Meeting Minutes", icon: FileText, color: "text-teal-400" },
      { path: "/sheets", label: "Sheets", icon: Table2, color: "text-lime-400" },
    ],
  },
];

const allNavItems: NavItem[] = navGroups.flatMap(g => g.items);

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

  const currentPage = allNavItems.find(i => i.path === location || i.children?.some(c => c.path === location));
  const pageTitle = currentPage?.label ?? "Dashboard";

  const FullSidebar = () => (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0f172a] to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-950/30 to-transparent pointer-events-none" />

      {/* Logo / Brand */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <WaterDropAnimation size="sm" />
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none flex items-baseline gap-0">
              <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FlowMatri</span><span style={{ color: "#22d3ee", textShadow: "0 0 12px rgba(34,211,238,0.7)", fontSize: "1.35em", lineHeight: 1 }}>x</span>
            </span>
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-slate-600 mt-0.5">Project Management</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location === item.path;
                const isChildActive = item.children?.some(c => c.path === location);
                const isExpanded = expandedItems.includes(item.path);
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const iconColor = item.color ?? "text-slate-400";

                return (
                  <div key={`${item.path}-${item.label}`}>
                    <div
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 text-sm relative",
                        (isActive || isChildActive)
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                      )}
                      onClick={() => { if (hasChildren) toggleExpand(item.path); }}
                    >
                      {/* Active indicator bar */}
                      {(isActive || isChildActive) && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />
                      )}

                      {/* Icon container */}
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                        (isActive || isChildActive)
                          ? "bg-white/10"
                          : "bg-white/[0.04] group-hover:bg-white/[0.08]"
                      )}>
                        {!hasChildren ? (
                          item.external ? (
                            <a href={item.path} target="_blank" rel="noopener noreferrer">
                              <Icon className={cn("w-3.5 h-3.5", (isActive || isChildActive) ? iconColor : "text-slate-500 group-hover:" + iconColor.replace("text-", "text-"))} style={{ width: 14, height: 14 }} />
                            </a>
                          ) : (
                            <Link href={item.path}>
                              <Icon className={cn("w-3.5 h-3.5 transition-colors", (isActive || isChildActive) ? iconColor : "text-slate-500 group-hover:text-slate-300")} style={{ width: 14, height: 14 }} />
                            </Link>
                          )
                        ) : (
                          <Icon className={cn("w-3.5 h-3.5 transition-colors", (isActive || isChildActive) ? iconColor : "text-slate-500 group-hover:text-slate-300")} style={{ width: 14, height: 14 }} />
                        )}
                      </div>

                      {/* Label */}
                      {!hasChildren ? (
                        item.external ? (
                          <a href={item.path} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-[13px]">
                            {item.label}
                          </a>
                        ) : (
                          <Link href={item.path} className="flex-1 truncate font-medium text-[13px]">
                            {item.label}
                          </Link>
                        )
                      ) : (
                        <span className="flex-1 truncate font-medium text-[13px]">{item.label}</span>
                      )}

                      {hasChildren && (
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 shrink-0 text-slate-600 transition-transform duration-200",
                          isExpanded && "rotate-0",
                          !isExpanded && "-rotate-90"
                        )} />
                      )}
                    </div>

                    {/* Children */}
                    {hasChildren && isExpanded && (
                      <div className="mt-0.5 ml-3 pl-7 border-l border-white/[0.07] space-y-0.5 mb-1">
                        {item.children!.map((child) => (
                          <Link
                            key={child.path + child.label}
                            href={child.path}
                            className={cn(
                              "flex items-center gap-2 py-1.5 px-2 text-[12px] rounded-lg transition-all",
                              location === child.path
                                ? "text-indigo-300 font-semibold bg-indigo-500/10"
                                : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
                            )}
                          >
                            <span className={cn(
                              "w-1 h-1 rounded-full shrink-0",
                              location === child.path ? "bg-indigo-400" : "bg-slate-600"
                            )} />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative border-t border-white/[0.07] p-3 space-y-2">
        {/* User card */}
        <Link href="/profile" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.07] transition-all cursor-pointer group">
          <UserAvatar user={user} size="md" />
          <Settings className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-auto" />
        </Link>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-medium"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>

        {/* Branding */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Zap className="w-2.5 h-2.5 text-indigo-500/50" />
          <p className="text-[9px] text-slate-700 tracking-widest uppercase font-semibold">FlowMatrix</p>
        </div>
      </div>
    </div>
  );

  const MiniSidebar = () => (
    <div className="flex flex-col h-full items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0f172a] to-slate-950 pointer-events-none" />

      {/* Logo */}
      <div className="relative w-full flex justify-center py-3.5 border-b border-white/[0.07]">
        <span className="text-xs font-black tracking-tight flex items-baseline">
          <span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>F</span><span style={{ color: "#22d3ee", textShadow: "0 0 8px rgba(34,211,238,0.8)" }}>M</span>
        </span>
      </div>

      {/* Nav icons */}
      <nav className="relative flex flex-col items-center gap-0.5 w-full px-2 flex-1 py-3 overflow-y-auto">
        {allNavItems.map((item) => {
          const isActive = location === item.path || item.children?.some(c => c.path === location);
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const iconColor = item.color ?? "text-slate-400";

          return (
            <div key={`mini-${item.path}-${item.label}`} className="w-full relative group/tooltip">
              {!hasChildren ? (
                item.external ? (
                  <a href={item.path} target="_blank" rel="noopener noreferrer">
                    <div className="w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer text-slate-500 hover:bg-white/10 hover:text-white">
                      <Icon style={{ width: 17, height: 17 }} />
                    </div>
                  </a>
                ) : (
                  <Link href={item.path}>
                    <div className={cn(
                      "w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative",
                      isActive
                        ? "bg-white/10 shadow-sm"
                        : "text-slate-500 hover:bg-white/[0.07] hover:text-white"
                    )}>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />}
                      <Icon className={isActive ? iconColor : "text-slate-500"} style={{ width: 17, height: 17 }} />
                    </div>
                  </Link>
                )
              ) : (
                <div
                  className={cn(
                    "w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative",
                    isActive
                      ? "bg-white/10 shadow-sm"
                      : "text-slate-500 hover:bg-white/[0.07] hover:text-white"
                  )}
                  onClick={() => toggleExpand(item.path)}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />}
                  <Icon className={isActive ? iconColor : "text-slate-500"} style={{ width: 17, height: 17 }} />
                </div>
              )}
              {/* Tooltip */}
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

      {/* Footer: avatar + expand */}
      <div className="relative flex flex-col items-center gap-2 pt-2 pb-3 border-t border-white/[0.07] w-full px-2 shrink-0">
        <Link href="/profile" className="block hover:ring-2 hover:ring-indigo-500/40 rounded-full transition-all cursor-pointer">
          <UserAvatar user={user} size="md" />
        </Link>
        <button
          onClick={() => setCollapsed(false)}
          className="w-full h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white/10 hover:text-white transition-all"
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
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={cn(
        "hidden md:flex flex-col flex-shrink-0 transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        {collapsed ? <MiniSidebar /> : <FullSidebar />}
      </aside>

      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-30 w-[220px] flex flex-col md:hidden shadow-2xl">
          <FullSidebar />
        </aside>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
              <span className="font-medium text-gray-300">FlowMatriX</span>
              <ChevronRightIcon className="w-3 h-3 text-gray-300" />
              <span className="font-semibold text-gray-700">{pageTitle}</span>
            </div>
          </div>
          <div className="flex-1 flex justify-center px-4">
            <AISearch />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size="sm" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.full_name ?? "User"}</p>
                <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[140px]">{user?.email ?? ""}</p>
              </div>
            </div>
            <div className="w-px h-5 bg-gray-100" />
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
