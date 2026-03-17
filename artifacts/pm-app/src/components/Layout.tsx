import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch,
  Briefcase, FolderOpen, Users, Settings, ChevronDown,
  ChevronRight, LogOut, ChevronLeft, ChevronRight as ChevronRightIcon, Menu,
  MonitorPlay,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
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
  { path: "/presentation", label: "Presentation", icon: MonitorPlay },
  { path: "/tasks", label: "P&ID Process", icon: GitBranch },
  { path: "/projects", label: "Projects", icon: Briefcase },
  { path: "/gallery", label: "Files", icon: FolderOpen },
  { path: "/team", label: "Team", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/drawings"]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
                  <Link href={item.path} className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
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

      <div className="p-3 border-t border-white/10">
        <Link href="/profile" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Administrator</p>
            <p className="text-slate-400 text-[10px] truncate">admin@wtt.com</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        </Link>
      </div>
    </div>
  );

  const MiniSidebar = () => (
    <div className="flex flex-col h-full items-center">
      <div className="py-4 border-b border-white/10 w-full flex justify-center">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/20">
          <Box className="w-4 h-4 text-white" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-1 w-full flex flex-col items-center">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={`mini-${item.path}-${item.label}`} className="w-full flex justify-center relative group/tooltip">
              {!hasChildren ? (
                <Link href={item.path}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isActive
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                </Link>
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                    isActive
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => toggleExpand(item.path)}
                >
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="pb-3 border-t border-white/10 pt-3 w-full flex justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          AD
        </div>
      </div>

      <div className="pb-3 w-full flex justify-center">
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-4 h-4" />
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
        "hidden md:flex flex-col flex-shrink-0 transition-all duration-300",
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold text-gray-800">administrator</span>
            </span>
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors" title="Logout">
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
