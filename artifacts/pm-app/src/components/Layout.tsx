import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  Megaphone,
  Users,
  UserCircle,
  Box,
  Bell,
  Search,
  Menu,
  X,
  Presentation,
  Images,
  Settings,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navSections = [
  {
    label: "Main",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/presentation", label: "Presentation", icon: Presentation },
      { path: "/projects", label: "Projects", icon: Briefcase },
    ],
  },
  {
    label: "Tools",
    items: [
      { path: "/tasks", label: "Kanban Board", icon: KanbanSquare },
      { path: "/viewer-options", label: "3D Viewer", icon: Box },
      { path: "/gallery", label: "Gallery", icon: Images },
    ],
  },
  {
    label: "Marketing",
    items: [
      { path: "/campaigns", label: "Campaigns", icon: Megaphone },
      { path: "/leads", label: "Leads", icon: Users },
      { path: "/team", label: "Team", icon: UserCircle },
    ],
  },
  {
    label: "Account",
    items: [
      { path: "/settings", label: "Settings", icon: Settings },
      { path: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];

const allItems = navSections.flatMap(s => s.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card z-20 relative shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-sm">
            <Briefcase className="w-4 h-4" />
          </div>
          Nexus
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-10 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out md:transform-none shadow-sm",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-sm">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Nexus<span className="text-primary">.</span></span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1.5">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-full"
                        />
                      )}
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Link href="/profile" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              JS
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">John Smith</p>
              <p className="text-xs text-muted-foreground truncate">Admin · Product</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 hidden md:flex shadow-sm">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
            </button>
            <Link href="/viewer-options">
              <button className="btn-primary py-1.5 text-xs">
                <Box className="w-3.5 h-3.5" />
                Open 3D Viewer
              </button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 custom-scrollbar bg-background">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
