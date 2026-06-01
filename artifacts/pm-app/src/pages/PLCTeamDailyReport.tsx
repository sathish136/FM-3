import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, X, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Users, BarChart2, Settings2, ChevronDown, ChevronUp, Save, RefreshCw,
  CalendarDays, UserCheck, TrendingUp, Shield, ShieldAlert, Loader2,
  Edit2, Check, Info, AlertCircle, Download,
  Phone, Cpu, Network, GitBranch, Activity, Wifi, MonitorPlay, Ticket, FileText, Target
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = "IT" | "Automation";

const ROLES: Record<Team, string[]> = {
  IT: ["System Admin Trainee", "Junior System Admin"],
  Automation: ["GET PLC", "Junior PLC", "Senior Engineer - Automation"],
};

const ALL_ROLES = [...ROLES.IT, ...ROLES.Automation];

const TASK_STATUSES = ["Completed", "In Progress", "Delayed", "Not Started"] as const;
type TaskStatus = typeof TASK_STATUSES[number];

const STATUS_CFG: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  "Completed":   { label: "Completed",   bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  "In Progress": { label: "In Progress", bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500" },
  "Delayed":     { label: "Delayed",     bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  "Not Started": { label: "Not Started", bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
};

interface Member {
  id: number;
  name: string;
  role: string;
  team: string;
  email?: string;
  is_active: boolean;
}

interface RoutineTask {
  id: number;
  role: string;
  team: string;
  task_name: string;
  description?: string;
  estimated_minutes: number;
  sort_order: number;
}

interface ReportItem {
  id?: number;
  routine_task_id?: number;
  task_name: string;
  description?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  status: TaskStatus;
  is_compliant?: boolean;
  delay_reason?: string;
  non_compliance_days?: number;
  due_date?: string;
  completed_date?: string;
}

interface DailyReport {
  id?: number;
  member_id: number;
  member_name?: string;
  member_role?: string;
  member_team?: string;
  report_date: string;
  submitted_by?: string;
  submitted_at?: string;
  notes?: string;
  items?: ReportItem[];
}

interface ComplianceStat {
  member_id: number;
  member_name: string;
  role: string;
  team: string;
  days_reported: number;
  total_tasks: number;
  compliant_tasks: number;
  non_compliant_tasks: number;
  total_nc_days: number;
  max_nc_days: number;
  compliance_pct: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMinutes(min?: number | null) {
  if (!min && min !== 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function computeCompliance(status: TaskStatus): boolean {
  return status === "Completed";
}

// ─── PLC Sub-nav ─────────────────────────────────────────────────────────────

const PLC_NAV = [
  { path: "/plc-automation/device-config",          label: "Device Config",     icon: Cpu },
  { path: "/plc-automation/site-calls",             label: "Support Calls",     icon: Phone },
  { path: "/plc-automation/service-reports",        label: "Service Reports",   icon: ClipboardList },
  { path: "/plc-automation/panel-inspection",       label: "Panel Inspection",  icon: ClipboardList },
  { path: "/plc-automation/support-tickets",        label: "Tickets",           icon: Ticket },
  { path: "/plc-automation/network-architecture",   label: "Network Arch",      icon: Network },
  { path: "/plc-automation/modification-log",       label: "Mod Log",           icon: GitBranch },
  { path: "/plc-automation/field-devices",          label: "Field Devices",     icon: Activity },
  { path: "/plc-automation/modems",                 label: "Modems",            icon: Wifi },
  { path: "/plc-automation/vpn-manager",            label: "VPN Manager",       icon: Shield },
  { path: "/plc-automation/team-daily-report",      label: "Team Report",       icon: BarChart2 },
];

function PlcSubNav() {
  const [loc] = useLocation();
  return (
    <div className="flex gap-1 flex-wrap mb-5">
      {PLC_NAV.map(({ path, label, icon: Icon }) => {
        const active = loc === path || loc.startsWith(path + "/");
        return (
          <Link key={path} href={path}>
            <button className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              active
                ? "bg-sky-600 text-white shadow"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700",
            )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "submit" | "daily" | "compliance" | "setup";

export default function PLCTeamDailyReport() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("submit");
  const [members, setMembers] = useState<Member[]>([]);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Submit tab state
  const [selMemberId, setSelMemberId] = useState<number | "">("");
  const [reportDate, setReportDate] = useState(today());
  const [reportNotes, setReportNotes] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingReport, setExistingReport] = useState<DailyReport | null>(null);

  // ── Daily view state
  const [viewDate, setViewDate] = useState(today());
  const [digestData, setDigestData] = useState<{ member: Member; report: DailyReport | null }[]>([]);
  const [digestLoading, setDigestLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState<number | null>(null);

  // ── Compliance state
  const [compStats, setCompStats] = useState<ComplianceStat[]>([]);
  const [compStart, setCompStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [compEnd, setCompEnd] = useState(today());
  const [compTeam, setCompTeam] = useState<"" | Team>("");
  const [compLoading, setCompLoading] = useState(false);

  // ── Setup state
  const [setupTab, setSetupTab] = useState<"members" | "tasks">("members");
  const [newMember, setNewMember] = useState({ name: "", role: "", team: "IT" as Team, email: "" });
  const [newTask, setNewTask] = useState({ role: "", team: "IT" as Team, task_name: "", description: "", estimated_minutes: 60 });
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // ─── Load base data ───────────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    const r = await fetch(`${BASE}/api/it-auto/members`);
    if (r.ok) setMembers(await r.json());
  }, []);

  const loadRoutineTasks = useCallback(async () => {
    const r = await fetch(`${BASE}/api/it-auto/routine-tasks`);
    if (r.ok) setRoutineTasks(await r.json());
  }, []);

  useEffect(() => { loadMembers(); loadRoutineTasks(); }, [loadMembers, loadRoutineTasks]);

  // ─── When member or date changes, load existing report ───────────────────

  useEffect(() => {
    if (!selMemberId || !reportDate) { setItems([]); setExistingReport(null); return; }
    (async () => {
      const r = await fetch(`${BASE}/api/it-auto/reports?member_id=${selMemberId}&date=${reportDate}`);
      if (r.ok) {
        const data: DailyReport[] = await r.json();
        if (data.length > 0) {
          setExistingReport(data[0]);
          setItems((data[0].items || []).map(i => ({ ...i })));
          setReportNotes(data[0].notes || "");
        } else {
          setExistingReport(null);
          // Load predefined tasks for this member's role
          const member = members.find(m => m.id === selMemberId);
          if (member) {
            const tasks = routineTasks.filter(t => t.role === member.role && t.team === member.team);
            setItems(tasks.map(t => ({
              routine_task_id: t.id,
              task_name: t.task_name,
              description: t.description,
              estimated_minutes: t.estimated_minutes,
              actual_minutes: undefined,
              status: "Not Started" as TaskStatus,
              is_compliant: false,
              delay_reason: "",
            })));
          } else {
            setItems([]);
          }
          setReportNotes("");
        }
      }
    })();
  }, [selMemberId, reportDate, members, routineTasks]);

  // ─── Digest (daily view) ─────────────────────────────────────────────────

  useEffect(() => {
    if (tab !== "daily") return;
    setDigestLoading(true);
    fetch(`${BASE}/api/it-auto/digest?date=${viewDate}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setDigestData(d.data || []))
      .finally(() => setDigestLoading(false));
  }, [tab, viewDate]);

  // ─── Compliance ───────────────────────────────────────────────────────────

  const loadCompliance = useCallback(async () => {
    setCompLoading(true);
    const params = new URLSearchParams({ start_date: compStart, end_date: compEnd });
    if (compTeam) params.set("team", compTeam);
    const r = await fetch(`${BASE}/api/it-auto/compliance?${params}`);
    if (r.ok) setCompStats(await r.json());
    setCompLoading(false);
  }, [compStart, compEnd, compTeam]);

  useEffect(() => { if (tab === "compliance") loadCompliance(); }, [tab, loadCompliance]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function addItem() {
    setItems(prev => [...prev, {
      task_name: "", description: "", estimated_minutes: 60,
      actual_minutes: undefined, status: "Not Started", is_compliant: false, delay_reason: "",
    }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ReportItem, value: any) {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      // Auto-compute compliance
      if (field === "status") {
        item.is_compliant = computeCompliance(value as TaskStatus);
        if (item.is_compliant) { item.delay_reason = ""; item.completed_date = item.completed_date || reportDate; }
      }
      next[idx] = item;
      return next;
    });
  }

  async function handleSubmit() {
    if (!selMemberId) { toast({ title: "Select a team member", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one task", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = {
        member_id: selMemberId,
        report_date: reportDate,
        submitted_by: user?.email || "unknown",
        notes: reportNotes,
        items: items.map(it => ({
          ...it,
          completed_date: it.status === "Completed" ? (it.completed_date || reportDate) : it.completed_date,
        })),
      };
      const r = await fetch(`${BASE}/api/it-auto/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      const saved = await r.json();
      setExistingReport(saved);
      toast({ title: "Report saved", description: `Daily report for ${fmtDate(reportDate)} submitted.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReport() {
    if (!existingReport?.id) return;
    if (!confirm("Delete this report?")) return;
    await fetch(`${BASE}/api/it-auto/reports/${existingReport.id}`, { method: "DELETE" });
    setExistingReport(null);
    setItems([]);
    setReportNotes("");
    toast({ title: "Report deleted" });
  }

  // ─── Setup handlers ───────────────────────────────────────────────────────

  async function addMember() {
    if (!newMember.name || !newMember.role) { toast({ title: "Name and role required", variant: "destructive" }); return; }
    const r = await fetch(`${BASE}/api/it-auto/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    if (r.ok) {
      setNewMember({ name: "", role: "", team: "IT", email: "" });
      await loadMembers();
      toast({ title: "Member added" });
    }
  }

  async function deleteMember(id: number) {
    if (!confirm("Delete member and all their reports?")) return;
    await fetch(`${BASE}/api/it-auto/members/${id}`, { method: "DELETE" });
    await loadMembers();
    toast({ title: "Member removed" });
  }

  async function toggleMemberActive(m: Member) {
    await fetch(`${BASE}/api/it-auto/members/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !m.is_active }),
    });
    await loadMembers();
  }

  async function addRoutineTask() {
    if (!newTask.role || !newTask.task_name) { toast({ title: "Role and task name required", variant: "destructive" }); return; }
    const r = await fetch(`${BASE}/api/it-auto/routine-tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    if (r.ok) {
      setNewTask({ role: "", team: "IT", task_name: "", description: "", estimated_minutes: 60 });
      await loadRoutineTasks();
      toast({ title: "Routine task added" });
    }
  }

  async function deleteRoutineTask(id: number) {
    await fetch(`${BASE}/api/it-auto/routine-tasks/${id}`, { method: "DELETE" });
    await loadRoutineTasks();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const selMember = members.find(m => m.id === selMemberId);

  const ncBadge = (days: number) => {
    if (days === 0) return null;
    const color = days >= 5 ? "bg-red-100 text-red-700" : days >= 3 ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700";
    return <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", color)}>{days}d NC</span>;
  };

  // compliance color
  const compColor = (pct: number | null) => {
    if (pct === null) return "text-slate-400";
    if (pct >= 90) return "text-emerald-600";
    if (pct >= 70) return "text-amber-600";
    return "text-red-600";
  };
  const compBar = (pct: number | null) => {
    const p = pct ?? 0;
    const bg = p >= 90 ? "bg-emerald-500" : p >= 70 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${p}%` }} />
      </div>
    );
  };

  return (
    <Layout title="IT & Automation — Team Daily Report">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PlcSubNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-sky-600" />
              Team Daily Report
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">IT &amp; Automation — track daily work, compliance, and delays</p>
          </div>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">IT Team</span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">Automation Team</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {([
            { key: "submit",     label: "Submit Report",    icon: ClipboardList },
            { key: "daily",      label: "Daily Summary",    icon: CalendarDays },
            { key: "compliance", label: "Compliance",       icon: Shield },
            { key: "setup",      label: "Team Setup",       icon: Settings2 },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors",
                tab === key
                  ? "border-sky-600 text-sky-700 bg-sky-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Submit ───────────────────────────────────────────────────── */}
        {tab === "submit" && (
          <div className="space-y-5">
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Team Member</label>
                <select
                  value={selMemberId}
                  onChange={e => setSelMemberId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                >
                  <option value="">— Select member —</option>
                  {["IT", "Automation"].map(team => (
                    <optgroup key={team} label={`${team} Team`}>
                      {members.filter(m => m.team === team && m.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Report Date</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                {existingReport && (
                  <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Report exists — editing
                  </span>
                )}
              </div>
            </div>

            {selMember && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 font-bold text-sm">
                  {selMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{selMember.name}</p>
                  <p className="text-xs text-slate-500">{selMember.role} · {selMember.team} Team</p>
                </div>
                <div className="ml-auto text-xs text-slate-500">{fmtDate(reportDate)}</div>
              </div>
            )}

            {/* Task table */}
            {selMemberId !== "" && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-sky-600" />
                    Work Tasks ({items.length})
                  </h2>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No tasks yet. Click "Add Task" or predefined tasks will load when a member is selected.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <div key={idx} className={cn(
                        "p-4 transition-colors",
                        item.is_compliant === false && item.status !== "Not Started" ? "bg-red-50/30" : "",
                        item.is_compliant === true ? "bg-emerald-50/20" : "",
                      )}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          {/* Task name */}
                          <div className="md:col-span-3">
                            <label className="text-xs text-slate-400 mb-1 block">Task Name</label>
                            <input
                              value={item.task_name}
                              onChange={e => updateItem(idx, "task_name", e.target.value)}
                              placeholder="Task description..."
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                          </div>

                          {/* Est time */}
                          <div className="md:col-span-1">
                            <label className="text-xs text-slate-400 mb-1 block">Est (min)</label>
                            <input
                              type="number"
                              min={0}
                              value={item.estimated_minutes ?? ""}
                              onChange={e => updateItem(idx, "estimated_minutes", Number(e.target.value))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                              placeholder="60"
                            />
                          </div>

                          {/* Actual time */}
                          <div className="md:col-span-1">
                            <label className="text-xs text-slate-400 mb-1 block">Actual (min)</label>
                            <input
                              type="number"
                              min={0}
                              value={item.actual_minutes ?? ""}
                              onChange={e => updateItem(idx, "actual_minutes", e.target.value === "" ? undefined : Number(e.target.value))}
                              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                              placeholder="—"
                            />
                          </div>

                          {/* Status */}
                          <div className="md:col-span-2">
                            <label className="text-xs text-slate-400 mb-1 block">Status</label>
                            <select
                              value={item.status}
                              onChange={e => updateItem(idx, "status", e.target.value as TaskStatus)}
                              className={cn(
                                "w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none font-medium",
                                STATUS_CFG[item.status]?.bg,
                                STATUS_CFG[item.status]?.text,
                                "border-slate-200",
                              )}
                            >
                              {TASK_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          {/* Compliance badge */}
                          <div className="md:col-span-1 flex flex-col items-center justify-center mt-4">
                            {item.is_compliant === true ? (
                              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : item.status === "Not Started" ? (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">—</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                <ShieldAlert className="w-3 h-3" /> NC
                              </span>
                            )}
                          </div>

                          {/* Delay reason */}
                          <div className="md:col-span-3">
                            <label className="text-xs text-slate-400 mb-1 block">
                              {item.status === "Delayed" || item.status === "Not Started" ? "Delay / Reason *" : "Notes"}
                            </label>
                            <input
                              value={item.delay_reason || ""}
                              onChange={e => updateItem(idx, "delay_reason", e.target.value)}
                              placeholder={item.status === "Delayed" || item.status === "Not Started" ? "Reason for delay..." : "Optional notes..."}
                              className={cn(
                                "w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none",
                                (item.status === "Delayed" || item.status === "Not Started") && !item.delay_reason
                                  ? "border-red-300 bg-red-50"
                                  : "border-slate-200",
                              )}
                            />
                          </div>

                          {/* Remove */}
                          <div className="md:col-span-1 flex items-center justify-end mt-4">
                            <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Extra row: estimated vs actual timing feedback */}
                        {item.estimated_minutes && item.actual_minutes && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  item.actual_minutes <= item.estimated_minutes ? "bg-emerald-500" : "bg-amber-500",
                                )}
                                style={{ width: `${Math.min(100, (item.actual_minutes / item.estimated_minutes) * 100)}%` }}
                              />
                            </div>
                            <span className={cn("text-xs font-medium", item.actual_minutes > item.estimated_minutes ? "text-amber-600" : "text-emerald-600")}>
                              {fmtMinutes(item.actual_minutes)} / {fmtMinutes(item.estimated_minutes)}
                              {item.actual_minutes > item.estimated_minutes ? " (over)" : " (on time)"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes & submit */}
                {items.length > 0 && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Overall Notes / Summary</label>
                    <textarea
                      value={reportNotes}
                      onChange={e => setReportNotes(e.target.value)}
                      rows={2}
                      placeholder="Any overall comments for today..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                    />

                    {/* Summary stats */}
                    <div className="flex flex-wrap gap-3 mt-3 mb-4">
                      {[
                        { label: "Total", count: items.length, color: "text-slate-700 bg-slate-100" },
                        { label: "Completed", count: items.filter(i => i.status === "Completed").length, color: "text-emerald-700 bg-emerald-100" },
                        { label: "In Progress", count: items.filter(i => i.status === "In Progress").length, color: "text-blue-700 bg-blue-100" },
                        { label: "Delayed", count: items.filter(i => i.status === "Delayed").length, color: "text-amber-700 bg-amber-100" },
                        { label: "Not Started", count: items.filter(i => i.status === "Not Started").length, color: "text-slate-600 bg-slate-100" },
                        { label: "Non-Compliant", count: items.filter(i => i.is_compliant === false && i.status !== "Not Started").length, color: "text-red-700 bg-red-100" },
                      ].map(s => (
                        <span key={s.label} className={cn("px-3 py-1 rounded-full text-xs font-semibold", s.color)}>
                          {s.label}: {s.count}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {existingReport ? "Update Report" : "Submit Report"}
                      </button>
                      {existingReport && (
                        <button
                          onClick={handleDeleteReport}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Daily Summary ────────────────────────────────────────────── */}
        {tab === "daily" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">View Date</label>
                <input
                  type="date"
                  value={viewDate}
                  onChange={e => setViewDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="mt-4 sm:mt-0">
                <p className="text-sm text-slate-500">
                  Showing all team members for <strong>{fmtDate(viewDate)}</strong>
                </p>
              </div>
            </div>

            {digestLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>
            ) : (
              <div className="space-y-3">
                {["IT", "Automation"].map(team => {
                  const teamData = digestData.filter(d => d.member.team === team);
                  if (!teamData.length) return null;
                  return (
                    <div key={team} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className={cn(
                        "px-4 py-2.5 font-semibold text-sm flex items-center gap-2",
                        team === "IT" ? "bg-blue-600 text-white" : "bg-purple-600 text-white",
                      )}>
                        <Users className="w-4 h-4" />
                        {team} Team — {teamData.filter(d => d.report).length}/{teamData.length} submitted
                      </div>

                      <div className="divide-y divide-slate-100">
                        {teamData.map(({ member, report }) => {
                          const items = report?.items || [];
                          const compliant = items.filter(i => i.is_compliant).length;
                          const total = items.length;
                          const pct = total > 0 ? Math.round(100 * compliant / total) : null;
                          const isExpanded = expandedReport === member.id;

                          return (
                            <div key={member.id}>
                              <button
                                onClick={() => setExpandedReport(isExpanded ? null : member.id)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 text-sm truncate">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.role}</p>
                                  </div>
                                  {report ? (
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="text-right">
                                        <p className={cn("text-sm font-bold", compColor(pct))}>{pct !== null ? `${pct}%` : "—"}</p>
                                        <p className="text-xs text-slate-400">{compliant}/{total} tasks</p>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        {items.some(i => i.non_compliance_days && i.non_compliance_days > 0) && (
                                          <span className="text-xs bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                                            {Math.max(...items.map(i => i.non_compliance_days || 0))}d NC
                                          </span>
                                        )}
                                        <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">Submitted</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-1 rounded shrink-0">No Report</span>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                </div>
                              </button>

                              {isExpanded && report && (
                                <div className="px-4 pb-4 bg-slate-50/50">
                                  {report.notes && (
                                    <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                                      <span className="font-semibold">Notes:</span> {report.notes}
                                    </div>
                                  )}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100">
                                          <th className="text-left px-3 py-2 font-semibold text-slate-600 rounded-l">Task</th>
                                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Est</th>
                                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Actual</th>
                                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Compliance</th>
                                          <th className="text-center px-3 py-2 font-semibold text-slate-600">NC Days</th>
                                          <th className="text-left px-3 py-2 font-semibold text-slate-600 rounded-r">Delay Reason</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {items.map((item, i) => (
                                          <tr key={i} className={cn(
                                            "hover:bg-white/80",
                                            item.is_compliant === false && item.status !== "Not Started" ? "bg-red-50/40" : "",
                                          )}>
                                            <td className="px-3 py-2 font-medium text-slate-800">{item.task_name}</td>
                                            <td className="px-3 py-2 text-center text-slate-500">{fmtMinutes(item.estimated_minutes)}</td>
                                            <td className={cn(
                                              "px-3 py-2 text-center font-medium",
                                              item.actual_minutes && item.estimated_minutes && item.actual_minutes > item.estimated_minutes
                                                ? "text-amber-600" : "text-slate-700",
                                            )}>
                                              {fmtMinutes(item.actual_minutes)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                                STATUS_CFG[item.status as TaskStatus]?.bg,
                                                STATUS_CFG[item.status as TaskStatus]?.text,
                                              )}>
                                                {item.status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {item.is_compliant === true
                                                ? <span className="text-emerald-600 font-bold">✓ Compliant</span>
                                                : item.status === "Not Started"
                                                  ? <span className="text-slate-400">—</span>
                                                  : <span className="text-red-600 font-bold">✗ Non-Compliant</span>
                                              }
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {ncBadge(item.non_compliance_days || 0) || <span className="text-slate-400">0</span>}
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 italic">{item.delay_reason || "—"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {isExpanded && !report && (
                                <div className="px-4 pb-4 bg-slate-50/50">
                                  <p className="text-xs text-slate-400 italic py-3 text-center">No report submitted for this date.</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Compliance ───────────────────────────────────────────────── */}
        {tab === "compliance" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm items-end">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">From</label>
                <input type="date" value={compStart} onChange={e => setCompStart(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">To</label>
                <input type="date" value={compEnd} onChange={e => setCompEnd(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Team</label>
                <select value={compTeam} onChange={e => setCompTeam(e.target.value as any)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none">
                  <option value="">All Teams</option>
                  <option value="IT">IT</option>
                  <option value="Automation">Automation</option>
                </select>
              </div>
              <button onClick={loadCompliance}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Summary cards */}
            {!compLoading && compStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Overall Compliance",
                    value: `${Math.round(compStats.reduce((a, s) => a + (s.compliance_pct ?? 0), 0) / compStats.filter(s => s.compliance_pct !== null).length || 0)}%`,
                    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
                    icon: Shield,
                  },
                  {
                    label: "Total NC Days",
                    value: compStats.reduce((a, s) => a + (s.total_nc_days || 0), 0),
                    color: "bg-red-50 border-red-200 text-red-700",
                    icon: ShieldAlert,
                  },
                  {
                    label: "Non-Compliant Tasks",
                    value: compStats.reduce((a, s) => a + (s.non_compliant_tasks || 0), 0),
                    color: "bg-amber-50 border-amber-200 text-amber-700",
                    icon: AlertTriangle,
                  },
                  {
                    label: "Max NC Days (single)",
                    value: Math.max(...compStats.map(s => s.max_nc_days || 0)),
                    color: "bg-orange-50 border-orange-200 text-orange-700",
                    icon: Clock,
                  },
                ].map(card => (
                  <div key={card.label} className={cn("border rounded-xl p-4 flex items-start gap-3", card.color)}>
                    <card.icon className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium opacity-70">{card.label}</p>
                      <p className="text-xl font-bold">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {compLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  <h2 className="font-semibold text-slate-700 text-sm">Per-member Compliance Report</h2>
                  <span className="text-xs text-slate-400 ml-auto">{fmtDate(compStart)} — {fmtDate(compEnd)}</span>
                </div>

                {compStats.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">No data for selected range.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Member</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Team / Role</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Days Reported</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Total Tasks</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Compliant</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Non-Compliant</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">NC Days</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 w-40">Compliance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {compStats.map(s => (
                          <tr key={s.member_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                  {s.member_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-800">{s.member_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-semibold mr-1.5",
                                s.team === "IT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700",
                              )}>{s.team}</span>
                              <span className="text-slate-500 text-xs">{s.role}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 font-medium">{s.days_reported}</td>
                            <td className="px-4 py-3 text-center text-slate-700">{s.total_tasks}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-emerald-700 font-semibold">{s.compliant_tasks}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.non_compliant_tasks > 0
                                ? <span className="text-red-700 font-bold">{s.non_compliant_tasks}</span>
                                : <span className="text-slate-400">0</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.total_nc_days > 0
                                ? <span className={cn(
                                  "font-bold px-2 py-0.5 rounded text-xs",
                                  s.total_nc_days >= 10 ? "bg-red-100 text-red-700" : s.total_nc_days >= 5 ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700",
                                )}>
                                  {s.total_nc_days}d
                                </span>
                                : <span className="text-slate-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between mb-0.5">
                                  <span className={cn("text-sm font-bold", compColor(s.compliance_pct))}>
                                    {s.compliance_pct !== null ? `${s.compliance_pct}%` : "—"}
                                  </span>
                                </div>
                                {compBar(s.compliance_pct)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Setup ────────────────────────────────────────────────────── */}
        {tab === "setup" && (
          <div className="space-y-5">
            <div className="flex gap-2 border-b border-slate-200 pb-0">
              {(["members", "tasks"] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setSetupTab(st)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors",
                    setupTab === st
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  )}
                >
                  {st === "members" ? "Team Members" : "Routine Tasks"}
                </button>
              ))}
            </div>

            {/* Members */}
            {setupTab === "members" && (
              <div className="space-y-4">
                {/* Add form */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4 text-sky-600" /> Add Member</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full name *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none sm:col-span-1" />
                    <select value={newMember.team} onChange={e => setNewMember(p => ({ ...p, team: e.target.value as Team, role: "" }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                      <option value="IT">IT</option>
                      <option value="Automation">Automation</option>
                    </select>
                    <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                      <option value="">— Role —</option>
                      {ROLES[newMember.team].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                      placeholder="Email (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
                    <button onClick={addMember}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Members list */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-700 text-sm">All Members ({members.length})</h3>
                  </div>
                  {members.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm">No members added yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {["IT", "Automation"].map(team => {
                        const tm = members.filter(m => m.team === team);
                        if (!tm.length) return null;
                        return (
                          <div key={team}>
                            <div className={cn(
                              "px-4 py-1.5 text-xs font-bold uppercase tracking-wider",
                              team === "IT" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700",
                            )}>
                              {team} Team
                            </div>
                            {tm.map(m => (
                              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("font-medium text-sm", !m.is_active && "text-slate-400 line-through")}>{m.name}</p>
                                  <p className="text-xs text-slate-500">{m.role}{m.email ? ` · ${m.email}` : ""}</p>
                                </div>
                                <button onClick={() => toggleMemberActive(m)}
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded font-medium transition-colors",
                                    m.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                  )}>
                                  {m.is_active ? "Active" : "Inactive"}
                                </button>
                                <button onClick={() => deleteMember(m.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Routine Tasks */}
            {setupTab === "tasks" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4 text-sky-600" /> Add Routine Task</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <select value={newTask.team} onChange={e => setNewTask(p => ({ ...p, team: e.target.value as Team, role: "" }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                      <option value="IT">IT</option>
                      <option value="Automation">Automation</option>
                    </select>
                    <select value={newTask.role} onChange={e => setNewTask(p => ({ ...p, role: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                      <option value="">— Role —</option>
                      {ROLES[newTask.team].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input value={newTask.task_name} onChange={e => setNewTask(p => ({ ...p, task_name: e.target.value }))}
                      placeholder="Task name *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none sm:col-span-2" />
                    <div className="flex items-center gap-2">
                      <input type="number" min={15} value={newTask.estimated_minutes} onChange={e => setNewTask(p => ({ ...p, estimated_minutes: Number(e.target.value) }))}
                        className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                    <button onClick={addRoutineTask}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-700 text-sm">Predefined Routine Tasks ({routineTasks.length})</h3>
                  </div>
                  {routineTasks.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm">No routine tasks defined yet. Add some above to auto-populate daily reports.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {["IT", "Automation"].map(team =>
                        ROLES[team as Team].map(role => {
                          const rt = routineTasks.filter(t => t.team === team && t.role === role);
                          if (!rt.length) return null;
                          return (
                            <div key={`${team}-${role}`}>
                              <div className="px-4 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                                {team} — {role}
                              </div>
                              {rt.map(t => (
                                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800">{t.task_name}</p>
                                    {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                                  </div>
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {fmtMinutes(t.estimated_minutes)}
                                  </span>
                                  <button onClick={() => deleteRoutineTask(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
