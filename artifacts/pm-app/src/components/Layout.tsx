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
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: Briefcase },
  { path: '/tasks', label: 'Kanban Board', icon: KanbanSquare },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/team', label: 'Team', icon: UserCircle },
  { path: '/viewer-options', label: '3D Viewer', icon: Box },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card z-20 relative">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white">
            <Briefcase className="w-5 h-5" />
          </div>
          Nexus
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted-foreground hover:text-white">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-10 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:transform-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="hidden md:flex items-center gap-3 p-6 text-primary font-display font-bold text-2xl border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Briefcase className="w-5 h-5" />
          </div>
          Nexus.
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group relative",
                  isActive 
                    ? "text-white bg-white/10 shadow-inner" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active" 
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" 
                  />
                )}
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
              JS
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">John Smith</p>
              <p className="text-xs text-muted-foreground truncate">Admin Workspace</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top bar */}
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 hidden md:flex">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full bg-black/20 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
            </button>
            <Link href="/" className="btn-primary py-1.5 text-sm">
              <Box className="w-4 h-4 inline-block mr-2" />
              Open Viewer
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
