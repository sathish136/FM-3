import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Box, PenTool, GitBranch, Wrench,
  Briefcase, FolderOpen, Users, Settings, ChevronDown,
  ChevronRight, LogOut, RefreshCw, X, Menu,
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
  {
    path: "/viewer-options", label: "3D Viewer", icon: Box,
    children: [{ path: "/", label: "3D Design Files" }],
  },
  { path: "/presentation", label: "Drawings", icon: PenTool },
  { path: "/tasks", label: "P&ID Process", icon: GitBranch },
  { path: "/gallery", label: "Spare Parts", icon: Wrench },
  { path: "/projects", label: "Projects", icon: Briefcase },
  { path: "/gallery", label: "Files", icon: FolderOpen },
  { path: "/team", label: "Team", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/viewer-options"]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const currentPage = navItems.find(i => i.path === location || i.children?.some(c => c.path === location));
  const pageTitle = currentPage?.label ?? "Dashboard";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-blue-500/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">WTT-Project</p>
            <p className="text-blue-200 text-[10px] leading-tight">Management System</p>
          </div>
        </div>
        <button
          onClick={() => { setSidebarOpen(false); setMobileSidebarOpen(false); }}
          className="p-1 rounded text-blue-200 hover:text-white hover:bg-white/10 transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const isExpanded = expandedItems.includes(item.path);
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={`${item.path}-${item.label}`}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-all group text-sm",
                  isActive
                    ? "bg-white/20 text-white font-semibold border-l-4 border-white"
                    : "text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent"
                )}
                onClick={() => {
                  if (hasChildren) toggleExpand(item.path);
                }}
              >
                {!hasChildren ? (
                  <Link href={item.path} className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-blue-300" />
                      : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-blue-300" />}
                  </>
                )}
              </div>

              {/* Children */}
              {hasChildren && isExpanded && item.children!.map((child) => (
                <Link
                  key={child.path + child.label}
                  href={child.path}
                  className={cn(
                    "flex items-center gap-2 pl-10 pr-4 py-2 text-sm transition-all",
                    location === child.path
                      ? "text-white bg-white/15 font-medium"
                      : "text-blue-200 hover:text-white hover:bg-white/10"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                  {child.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-blue-500/40">
        <Link href="/profile" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Administrator</p>
            <p className="text-blue-200 text-[10px] truncate">admin@wtt.com</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-blue-300 shrink-0" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {(sidebarOpen || mobileSidebarOpen) && (
        <aside className={cn(
          "fixed md:static inset-y-0 left-0 z-30 w-56 flex-shrink-0 flex flex-col",
          "bg-[#1a56db]",
          !mobileSidebarOpen && "hidden md:flex"
        )}>
          <SidebarContent />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
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

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
