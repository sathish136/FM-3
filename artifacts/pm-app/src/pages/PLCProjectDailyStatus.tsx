import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Save, RefreshCw, Loader2, Edit2, X,
  CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Calendar, User, MapPin, Building2, Activity,
  ChevronDown, ChevronUp, TrendingUp, BarChart2,
  Zap, ClipboardList, Flag, Target, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "Active" | "On Hold" | "Completed" | "Delayed";
type Priority = "High" | "Medium" | "Low";

const STATUS_CFG: Record<ProjectStatus, { bg: string; text: string; border: string; dot: string }> = {
  "Active":    { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500" },
  "On Hold":   { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-300",   dot: "bg-amber-500" },
  "Delayed":   { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     dot: "bg-red-500" },
  "Completed": { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-300",    dot: "bg-blue-500" },
};

const PRIORITY_CFG: Record<Priority, { bg: string; text: string }> = {
  "High":   { bg: "bg-red-100",    text: "text-red-700" },
  "Medium": { bg: "bg-amber-100",  text: "text-amber-700" },
  "Low":    { bg: "bg-slate-100",  text: "text-slate-600" },
};

interface Project {
  id: number;
  project_no?: string;
  project_name: string;
  client?: string;
  site?: string;
  engineer?: string;
  status: ProjectStatus;
  priority: Priority;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  overall_progress: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DailyEntry {
  id?: number;
  project_id: number;
  status_date: string;
  today_progress?: string;
  tasks_done: string[];
  tasks_pending: string[];
  blockers?: string;
  progress_pct?: number;
  expected_completion?: string;
  updated_by?: string;
  updated_at?: string;
}

interface DailyRow {
  project: Project;
  entry: DailyEntry | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(s?: string): number | null {
  if (!s) return null;
  const diff = new Date(s).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function ProgressBar({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : pct >= 25 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className={cn("w-full bg-slate-200 rounded-full overflow-hidden", h)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ─── Blank forms ─────────────────────────────────────────────────────────────

const BLANK_PROJECT: Omit<Project, "id" | "created_at" | "updated_at"> = {
  project_no: "", project_name: "", client: "", site: "", engineer: "",
  status: "Active", priority: "Medium", start_date: "", expected_end_date: "",
  overall_progress: 0, description: "",
};

function blankEntry(projectId: number, date: string): DailyEntry {
  return { project_id: projectId, status_date: date, today_progress: "", tasks_done: [], tasks_pending: [], blockers: "", progress_pct: undefined, expected_completion: "" };
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "dashboard" | "daily" | "projects";

export default function PLCProjectDailyStatus() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Dashboard / Daily
  const [viewDate, setViewDate] = useState(today());
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Daily edit state: keyed by project_id
  const [edits, setEdits] = useState<Record<number, DailyEntry>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  // task input per project
  const [taskInputDone, setTaskInputDone] = useState<Record<number, string>>({});
  const [taskInputPending, setTaskInputPending] = useState<Record<number, string>>({});

  // ── Projects tab
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...BLANK_PROJECT });
  const [formSaving, setFormSaving] = useState(false);

  // ─── Load projects ────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${BASE}/api/plc/projects`);
    if (r.ok) setProjects(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ─── Load daily rows ─────────────────────────────────────────────────────

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    const r = await fetch(`${BASE}/api/plc/project-daily-status?date=${viewDate}`);
    if (r.ok) {
      const d = await r.json();
      const rows: DailyRow[] = d.data || [];
      setDailyRows(rows);
      const init: Record<number, DailyEntry> = {};
      for (const row of rows) {
        init[row.project.id] = row.entry
          ? { ...row.entry, tasks_done: row.entry.tasks_done || [], tasks_pending: row.entry.tasks_pending || [] }
          : blankEntry(row.project.id, viewDate);
      }
      setEdits(init);
    }
    setDailyLoading(false);
  }, [viewDate]);

  useEffect(() => {
    if (tab === "daily" || tab === "dashboard") loadDaily();
  }, [tab, viewDate, loadDaily]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function setField<K extends keyof DailyEntry>(pid: number, key: K, val: DailyEntry[K]) {
    setEdits(p => ({ ...p, [pid]: { ...(p[pid] || blankEntry(pid, viewDate)), [key]: val } }));
  }

  function addTask(pid: number, type: "tasks_done" | "tasks_pending") {
    const input = type === "tasks_done" ? taskInputDone[pid] : taskInputPending[pid];
    if (!input?.trim()) return;
    const current = edits[pid]?.[type] || [];
    setField(pid, type, [...current, input.trim()]);
    if (type === "tasks_done") setTaskInputDone(p => ({ ...p, [pid]: "" }));
    else setTaskInputPending(p => ({ ...p, [pid]: "" }));
  }

  function removeTask(pid: number, type: "tasks_done" | "tasks_pending", idx: number) {
    const current = edits[pid]?.[type] || [];
    setField(pid, type, current.filter((_, i) => i !== idx));
  }

  async function saveEntry(pid: number) {
    const entry = edits[pid];
    if (!entry) return;
    setSaving(p => ({ ...p, [pid]: true }));
    try {
      const r = await fetch(`${BASE}/api/plc/project-daily-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, updated_by: user?.email || "unknown" }),
      });
      if (!r.ok) throw new Error(await r.text());
      await loadProjects();
      toast({ title: "Status saved", description: `Daily update saved for ${fmtDate(viewDate)}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(p => ({ ...p, [pid]: false }));
    }
  }

  // ─── Project form ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingProject(null);
    setForm({ ...BLANK_PROJECT });
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setForm({
      project_no: p.project_no || "", project_name: p.project_name,
      client: p.client || "", site: p.site || "", engineer: p.engineer || "",
      status: p.status, priority: p.priority,
      start_date: p.start_date || "", expected_end_date: p.expected_end_date || "",
      overall_progress: p.overall_progress, description: p.description || "",
    });
    setShowForm(true);
  }

  async function saveProject() {
    if (!form.project_name.trim()) {
      toast({ title: "Project name required", variant: "destructive" }); return;
    }
    setFormSaving(true);
    try {
      const body = {
        ...form,
        start_date: form.start_date || null,
        expected_end_date: form.expected_end_date || null,
        created_by: user?.email,
      };
      const url = editingProject
        ? `${BASE}/api/plc/projects/${editingProject.id}`
        : `${BASE}/api/plc/projects`;
      const r = await fetch(url, {
        method: editingProject ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      await loadProjects();
      setShowForm(false);
      toast({ title: editingProject ? "Project updated" : "Project created" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project and all its daily status entries?")) return;
    await fetch(`${BASE}/api/plc/projects/${id}`, { method: "DELETE" });
    await loadProjects();
    toast({ title: "Project deleted" });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const activeProjects = projects.filter(p => p.status !== "Completed");
  const completedProjects = projects.filter(p => p.status === "Completed");

  return (
    <Layout title="PLC & Automation — Project Daily Status">
      <div className="p-4 md:p-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Project Daily Status
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">PLC &amp; Automation — track project progress, tasks, and blockers</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              {activeProjects.length} Active
            </span>
            {projects.filter(p => p.status === "Delayed").length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                {projects.filter(p => p.status === "Delayed").length} Delayed
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              {completedProjects.length} Completed
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {([
            { key: "dashboard", label: "Dashboard",    icon: BarChart2 },
            { key: "daily",     label: "Daily Update", icon: ClipboardList },
            { key: "projects",  label: "Projects",     icon: Target },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors",
                tab === key
                  ? "border-amber-500 text-amber-700 bg-amber-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Dashboard ─────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-5">

            {/* Date picker + reload */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">As of Date</label>
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <button onClick={loadDaily} disabled={dailyLoading}
                className="mt-5 flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors">
                {dailyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>

            {loading || dailyLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : dailyRows.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No active projects found.</p>
                <p className="text-xs mt-1">Add projects in the <strong>Projects</strong> tab first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dailyRows.map(({ project: p, entry: e }) => {
                  const dl = daysLeft(p.expected_end_date);
                  const pct = e?.progress_pct ?? p.overall_progress;
                  const sc = STATUS_CFG[p.status];
                  const pc = PRIORITY_CFG[p.priority];
                  const isExpanded = expandedId === p.id;

                  return (
                    <div key={p.id} className={cn(
                      "bg-white border rounded-xl shadow-sm overflow-hidden",
                      p.status === "Delayed" ? "border-red-300" : "border-slate-200",
                    )}>
                      {/* Card header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.project_no && (
                              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.project_no}</span>
                            )}
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
                              <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", sc.dot)} />
                              {p.status}
                            </span>
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", pc.bg, pc.text)}>
                              {p.priority}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-1 leading-tight">{p.project_name}</h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            {p.client && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.client}</span>}
                            {p.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.site}</span>}
                            {p.engineer && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.engineer}</span>}
                          </div>
                        </div>
                        {/* Completion countdown */}
                        {dl !== null && p.status !== "Completed" && (
                          <div className={cn(
                            "text-center px-2.5 py-1.5 rounded-lg shrink-0",
                            dl < 0 ? "bg-red-100 text-red-700" : dl <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600",
                          )}>
                            <p className="text-lg font-black leading-none">{Math.abs(dl)}</p>
                            <p className="text-[10px] font-medium">{dl < 0 ? "days over" : "days left"}</p>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="px-4 py-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
                          <span className={cn(
                            "text-sm font-bold",
                            pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-sky-600" : pct >= 25 ? "text-amber-600" : "text-red-600",
                          )}>{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} />

                        {/* Date span */}
                        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                          <span>{p.start_date ? fmtDate(p.start_date) : "—"}</span>
                          <span>Due: {p.expected_end_date ? fmtDate(p.expected_end_date) : "—"}</span>
                        </div>
                      </div>

                      {/* Today's update */}
                      {e && (
                        <>
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                            {e.today_progress && (
                              <p className="text-xs text-slate-700 mb-2">
                                <span className="font-semibold text-slate-500">Today's Progress:</span> {e.today_progress}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              {/* Tasks done */}
                              {(e.tasks_done?.length ?? 0) > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Done Today</p>
                                  <ul className="space-y-0.5">
                                    {(e.tasks_done || []).slice(0, isExpanded ? 999 : 3).map((t, i) => (
                                      <li key={i} className="flex items-start gap-1 text-xs text-slate-600">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                        {t}
                                      </li>
                                    ))}
                                    {!isExpanded && (e.tasks_done?.length ?? 0) > 3 && (
                                      <li className="text-xs text-slate-400 italic">+{(e.tasks_done?.length ?? 0) - 3} more…</li>
                                    )}
                                  </ul>
                                </div>
                              )}

                              {/* Pending tasks */}
                              {(e.tasks_pending?.length ?? 0) > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Pending</p>
                                  <ul className="space-y-0.5">
                                    {(e.tasks_pending || []).slice(0, isExpanded ? 999 : 3).map((t, i) => (
                                      <li key={i} className="flex items-start gap-1 text-xs text-slate-600">
                                        <Clock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                        {t}
                                      </li>
                                    ))}
                                    {!isExpanded && (e.tasks_pending?.length ?? 0) > 3 && (
                                      <li className="text-xs text-slate-400 italic">+{(e.tasks_pending?.length ?? 0) - 3} more…</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Blocker */}
                            {e.blockers && (
                              <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-800">{e.blockers}</p>
                              </div>
                            )}

                            {/* Expected completion from entry */}
                            {e.expected_completion && (
                              <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Expected completion: <strong>{fmtDate(e.expected_completion)}</strong>
                              </p>
                            )}
                          </div>

                          {/* Expand toggle */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="w-full text-xs text-slate-400 hover:text-slate-600 py-1.5 flex items-center justify-center gap-1 border-t border-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isExpanded ? "Collapse" : "Show all"}
                          </button>
                        </>
                      )}

                      {!e && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
                          <p className="text-xs text-slate-400 italic">No update submitted for {fmtDate(viewDate)}</p>
                          <button
                            onClick={() => { setTab("daily"); setViewDate(viewDate); }}
                            className="mt-1.5 text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 mx-auto"
                          >
                            Add daily update <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Daily Update ─────────────────────────────────────────────── */}
        {tab === "daily" && (
          <div className="space-y-4">
            {/* Date picker */}
            <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Update Date</label>
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <div className="mt-4 text-sm text-slate-500">
                Filling daily status for <strong>{fmtDate(viewDate)}</strong> — {dailyRows.length} active project{dailyRows.length !== 1 ? "s" : ""}
              </div>
              <button onClick={loadDaily} disabled={dailyLoading}
                className="mt-4 ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-amber-400 transition-colors">
                {dailyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>

            {dailyLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : dailyRows.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active projects. Add them in the Projects tab.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyRows.map(({ project: p, entry }) => {
                  const edit = edits[p.id] || blankEntry(p.id, viewDate);
                  const sc = STATUS_CFG[p.status];
                  const isSaving = saving[p.id];

                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      {/* Project header */}
                      <div className={cn(
                        "px-4 py-3 border-b border-slate-100 flex items-center gap-3",
                        p.status === "Delayed" ? "bg-red-50" : "bg-slate-50",
                      )}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.project_no && (
                              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.project_no}</span>
                            )}
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", sc.bg, sc.text, sc.border)}>{p.status}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-0.5">{p.project_name}</h3>
                          {(p.client || p.site || p.engineer) && (
                            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-slate-500">
                              {p.client && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.client}</span>}
                              {p.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.site}</span>}
                              {p.engineer && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.engineer}</span>}
                            </div>
                          )}
                        </div>
                        {entry && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full shrink-0">Updated</span>
                        )}
                      </div>

                      {/* Form body */}
                      <div className="p-4 space-y-4">

                        {/* Row 1: progress text + progress % */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Today's Progress Summary *</label>
                            <textarea
                              value={edit.today_progress || ""}
                              onChange={e => setField(p.id, "today_progress", e.target.value)}
                              rows={2}
                              placeholder="What was achieved today on this project?"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                              Overall % Complete <span className="font-normal text-slate-400">(updates project)</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={0} max={100}
                                value={edit.progress_pct ?? p.overall_progress}
                                onChange={e => setField(p.id, "progress_pct", Number(e.target.value))}
                                className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                              <span className="text-sm text-slate-500 font-medium">%</span>
                            </div>
                            <ProgressBar pct={edit.progress_pct ?? p.overall_progress} size="sm" />
                          </div>
                        </div>

                        {/* Row 2: tasks done + tasks pending */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Tasks done */}
                          <div>
                            <label className="text-xs font-semibold text-emerald-600 mb-1.5 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Tasks Completed Today
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                value={taskInputDone[p.id] || ""}
                                onChange={e => setTaskInputDone(pr => ({ ...pr, [p.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(p.id, "tasks_done"); } }}
                                placeholder="Type task and press Enter…"
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                              />
                              <button onClick={() => addTask(p.id, "tasks_done")}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                              {(edit.tasks_done || []).map((task, i) => (
                                <div key={i} className="flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-700 flex-1">{task}</span>
                                  <button onClick={() => removeTask(p.id, "tasks_done", i)} className="text-slate-300 hover:text-red-400 shrink-0">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {(edit.tasks_done || []).length === 0 && (
                                <p className="text-xs text-slate-400 italic px-2">No completed tasks yet</p>
                              )}
                            </div>
                          </div>

                          {/* Pending tasks */}
                          <div>
                            <label className="text-xs font-semibold text-amber-600 mb-1.5 block flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pending / Carry-forward Tasks
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                value={taskInputPending[p.id] || ""}
                                onChange={e => setTaskInputPending(pr => ({ ...pr, [p.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(p.id, "tasks_pending"); } }}
                                placeholder="Type pending task and press Enter…"
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                              <button onClick={() => addTask(p.id, "tasks_pending")}
                                className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                              {(edit.tasks_pending || []).map((task, i) => (
                                <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-700 flex-1">{task}</span>
                                  <button onClick={() => removeTask(p.id, "tasks_pending", i)} className="text-slate-300 hover:text-red-400 shrink-0">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {(edit.tasks_pending || []).length === 0 && (
                                <p className="text-xs text-slate-400 italic px-2">No pending tasks</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row 3: blockers + expected completion */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-red-600 mb-1.5 block flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Blockers / Issues
                            </label>
                            <textarea
                              value={edit.blockers || ""}
                              onChange={e => setField(p.id, "blockers", e.target.value)}
                              rows={2}
                              placeholder="Any blockers, dependencies, or issues today?"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 outline-none resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" /> Expected Completion Date
                            </label>
                            <input
                              type="date"
                              value={edit.expected_completion || p.expected_end_date || ""}
                              onChange={e => setField(p.id, "expected_completion", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                            />
                            {p.expected_end_date && (
                              <p className="text-xs text-slate-400 mt-1">
                                Original deadline: {fmtDate(p.expected_end_date)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => saveEntry(p.id)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60 shadow-sm"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Update
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Projects ─────────────────────────────────────────────────── */}
        {tab === "projects" && (
          <div className="space-y-5">

            {/* Add project button */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>

            {/* Project form modal */}
            {showForm && (
              <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    {editingProject ? "Edit Project" : "New Project"}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Project No.</label>
                    <input value={form.project_no} onChange={e => setForm(p => ({ ...p, project_no: e.target.value }))}
                      placeholder="e.g. WTT-AUTO-001"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Project Name *</label>
                    <input value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))}
                      placeholder="e.g. MBR Plant SCADA Upgrade"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Client</label>
                    <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
                      placeholder="Client name"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Site / Location</label>
                    <input value={form.site} onChange={e => setForm(p => ({ ...p, site: e.target.value }))}
                      placeholder="Site name"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Engineer</label>
                    <input value={form.engineer} onChange={e => setForm(p => ({ ...p, engineer: e.target.value }))}
                      placeholder="Assigned engineer"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ProjectStatus }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none">
                      {(["Active", "On Hold", "Delayed", "Completed"] as ProjectStatus[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Priority</label>
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none">
                      {(["High", "Medium", "Low"] as Priority[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Expected End Date</label>
                    <input type="date" value={form.expected_end_date} onChange={e => setForm(p => ({ ...p, expected_end_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Current Progress %</label>
                    <input type="number" min={0} max={100} value={form.overall_progress}
                      onChange={e => setForm(p => ({ ...p, overall_progress: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={2} placeholder="Project scope and objectives…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none" />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveProject} disabled={formSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60">
                    {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingProject ? "Update Project" : "Create Project"}
                  </button>
                </div>
              </div>
            )}

            {/* Project list */}
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No projects yet.</p>
                <p className="text-xs mt-1">Click "New Project" to get started.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {(["Active", "Delayed", "On Hold", "Completed"] as ProjectStatus[]).map(status => {
                  const group = projects.filter(p => p.status === status);
                  if (!group.length) return null;
                  const sc = STATUS_CFG[status];
                  return (
                    <div key={status}>
                      <div className={cn("px-4 py-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2", sc.bg, sc.text)}>
                        <span className={cn("w-2 h-2 rounded-full", sc.dot)} />
                        {status} ({group.length})
                      </div>
                      {group.map(p => {
                        const dl = daysLeft(p.expected_end_date);
                        return (
                          <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {p.project_no && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.project_no}</span>}
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", PRIORITY_CFG[p.priority].bg, PRIORITY_CFG[p.priority].text)}>
                                  {p.priority}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-800 text-sm mt-0.5">{p.project_name}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-0.5">
                                {p.client && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.client}</span>}
                                {p.site && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.site}</span>}
                                {p.engineer && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.engineer}</span>}
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="w-28 hidden sm:block">
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-slate-500">Progress</span>
                                <span className="font-bold text-slate-700">{p.overall_progress}%</span>
                              </div>
                              <ProgressBar pct={p.overall_progress} size="sm" />
                            </div>

                            {/* Dates */}
                            <div className="text-right hidden md:block">
                              {p.expected_end_date && (
                                <p className={cn(
                                  "text-xs font-semibold",
                                  dl !== null && dl < 0 ? "text-red-600" : dl !== null && dl <= 7 ? "text-amber-600" : "text-slate-600",
                                )}>
                                  {dl !== null && dl < 0 ? `${Math.abs(dl)}d overdue` : dl !== null ? `${dl}d left` : ""}
                                </p>
                              )}
                              <p className="text-xs text-slate-400">{fmtDate(p.expected_end_date)}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteProject(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
