import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, X, ChevronRight } from "lucide-react";
import {
  LayoutDashboard, Box, PenTool, GitBranch, Briefcase, FileText,
  MonitorPlay, Table2, PenLine, Settings, ShoppingCart, UserCircle,
  LayoutGrid, Mail, MailOpen, GanttChartSquare, MessageSquare,
  Layers, FolderOpen, Activity, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchEntry {
  path: string;
  label: string;
  icon: React.ElementType;
  group: string;
  keywords?: string;
}

const ALL_PAGES: SearchEntry[] = [
  { path: "/",                     label: "Dashboard",         icon: LayoutDashboard,   group: "Main",                keywords: "home overview kpi" },
  { path: "/projects",             label: "Projects",          icon: Briefcase,          group: "Project Management",  keywords: "project list" },
  { path: "/project-board",        label: "Project Board",     icon: LayoutGrid,         group: "Project Management",  keywords: "kanban board tasks" },
  { path: "/project-timeline",     label: "Project Timeline",  icon: GanttChartSquare,   group: "Project Management",  keywords: "gantt timeline schedule" },
  { path: "/meeting-minutes",      label: "Meeting Minutes",   icon: FileText,           group: "Project Management",  keywords: "meeting notes actions" },
  { path: "/material-request",     label: "Material Request",  icon: ShoppingCart,       group: "Project Management",  keywords: "procurement purchase" },
  { path: "/presentation",         label: "Presentation",      icon: MonitorPlay,        group: "Project Management",  keywords: "slides pptx deck" },
  { path: "/drawings/mechanical",  label: "Design Mechanical", icon: PenTool,            group: "Design & Engineering",keywords: "mechanical drawing cad" },
  { path: "/drawings/electrical",  label: "Design Electrical", icon: PenTool,            group: "Design & Engineering",keywords: "electrical drawing" },
  { path: "/drawings/civil",       label: "Design Civil",      icon: PenTool,            group: "Design & Engineering",keywords: "civil drawing" },
  { path: "/design-2d",            label: "Design 2D",         icon: PenLine,            group: "Design & Engineering",keywords: "2d cad dwg" },
  { path: "/design-3d",            label: "Design 3D",         icon: Box,                group: "Design & Engineering",keywords: "3d step model viewer" },
  { path: "/pid",                  label: "P&ID Process",      icon: GitBranch,          group: "Design & Engineering",keywords: "pid piping instrumentation" },
  { path: "/nesting",              label: "Nesting",           icon: Layers,             group: "Design & Engineering",keywords: "nesting layout" },
  { path: "/project-drawings",     label: "Project Drawings",  icon: FolderOpen,         group: "Design & Engineering",keywords: "drawings folder files" },
  { path: "/email",                label: "Email",             icon: Mail,               group: "Communication",       keywords: "email inbox mail" },
  { path: "/smart-inbox",          label: "Smart Inbox (AI)",  icon: Bot,                group: "Communication",       keywords: "smart inbox ai email" },
  { path: "/chat",                 label: "FlowTalk",          icon: MessageSquare,      group: "Communication",       keywords: "chat messages flowtalk" },
  { path: "/sheets",               label: "Sheets",            icon: Table2,             group: "Communication",       keywords: "spreadsheet excel sheet" },
  { path: "/site-data",            label: "Site Data",         icon: Activity,           group: "Monitoring",          keywords: "site data live ads beckhoff" },
  { path: "/hrms",                 label: "HRMS",              icon: UserCircle,         group: "HR",                  keywords: "hr employee attendance leave" },
  { path: "/settings",             label: "Settings",          icon: Settings,           group: "Admin",               keywords: "settings config" },
  { path: "/email-settings",       label: "Email Settings",    icon: MailOpen,           group: "Admin",               keywords: "email settings gmail" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? ALL_PAGES.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        (p.keywords || "").toLowerCase().includes(q)
      )
    : ALL_PAGES;

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [q]);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  // Scroll active result into view
  useEffect(() => {
    const el = dropdownRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && results[cursor]) { go(results[cursor].path); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  }, [navigate]);

  // Group results
  const grouped = results.reduce<Record<string, (SearchEntry & { idx: number })[]>>((acc, page) => {
    const flatIdx = results.indexOf(page);
    if (!acc[page.group]) acc[page.group] = [];
    acc[page.group].push({ ...page, idx: flatIdx });
    return acc;
  }, {});

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-xs font-medium min-w-[160px] max-w-xs w-full"
        title="Search pages (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">Search FlowMatriX…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-400 font-mono shrink-0">⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10 flex flex-col" style={{ maxHeight: "75vh" }}>
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, modules…"
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 ml-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-400 font-mono">Esc</kbd>
              </button>
            </div>

            {/* Results */}
            <div ref={dropdownRef} className="overflow-y-auto flex-1 py-1">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No pages match "<span className="text-gray-600">{query}</span>"</p>
                </div>
              ) : (
                Object.entries(grouped).map(([group, pages]) => (
                  <div key={group}>
                    <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
                      {group}
                    </p>
                    {pages.map(page => {
                      const Icon = page.icon;
                      const isActive = cursor === page.idx;
                      return (
                        <button
                          key={page.path}
                          data-idx={page.idx}
                          onClick={() => go(page.path)}
                          onMouseEnter={() => setCursor(page.idx)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            isActive ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-gray-500")} />
                          </div>
                          <span className="flex-1 text-sm font-medium">{page.label}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-400">
              <span><kbd className="bg-white border border-gray-200 rounded px-1 font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="bg-white border border-gray-200 rounded px-1 font-mono">↵</kbd> open</span>
              <span><kbd className="bg-white border border-gray-200 rounded px-1 font-mono">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
