import { Layout } from "@/components/Layout";
import { useState, useEffect, useRef, useCallback, Fragment, type ElementType } from "react";
import {
  GanttChartSquare, ShoppingCart, AlertTriangle, ChevronDown,
  RefreshCw, CalendarDays, CheckCircle2,
  AlertCircle, Circle, TrendingUp, Package, Truck,
  User, ChevronRight, BarChart3, Target, IndianRupee,
  Activity, Layers, ArrowUp, ArrowDown,
  Info, Building2, Star, Users, CreditCard, Clock, Hourglass,
  BadgeCheck, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

type Project = { name: string; project_name: string };

type ProjectDetail = {
  name: string;
  project_name: string;
  status: string;
  priority: string;
  percent_complete: number;
  expected_start_date: string | null;
  expected_end_date: string | null;
  estimated_costing: number;
  actual_expense: number;
  actual_time: number;
  department: string | null;
  notes: string | null;
  creation: string;
  modified: string;
};

type Task = {
  name: string;
  subject: string;
  project: string;
  status: string;
  priority: string;
  exp_start_date: string | null;
  exp_end_date: string | null;
  completed_on: string | null;
  progress: number;
  description: string | null;
  assigned_to: string | null;
};

type MR = {
  name: string;
  title: string | null;
  material_request_type: string;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  requested_by: string | null;
  project: string | null;
};

type POItem = {
  parent: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  received_qty: number;
};

type PO = {
  name: string;
  project: string | null;
  supplier: string;
  supplier_name: string;
  transaction_date: string;
  schedule_date: string | null;
  status: string;
  grand_total: number;
  currency: string;
  owner: string;
  per_received: number;
  per_billed: number;
  items: POItem[];
};

type TaskAllocationEntry = {
  task_name: string;
  description: string | null;
  expected_hours: number;
  hours_completed: number;
  expected_end_date: string | null;
  status: string;
};

type TaskAllocation = {
  name: string;
  employee: string;
  employee_name: string;
  date: string;
  tasks: TaskAllocationEntry[];
};

type TimelineData = {
  tasks: Task[];
  materialRequests: MR[];
  purchaseOrders: PO[];
  taskAllocations: TaskAllocation[];
};

const PHASE_KEYWORDS: { label: string; color: string; bg: string; border: string; bar: string; keywords: string[] }[] = [
  {
    label: "Process Design",
    color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", bar: "bg-violet-500",
    keywords: ["process", "design", "p&id", "pid", "flow", "schematic", "basic engineering", "detail"],
  },
  {
    label: "Engineering",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", bar: "bg-blue-500",
    keywords: ["drawing", "mechanical", "electrical", "civil", "structural", "layout", "engineering", "instrument", "2d", "3d"],
  },
  {
    label: "Procurement",
    color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500",
    keywords: ["purchase", "procure", "mr", "material", "order", "supplier", "vendor", "rfq", "quotation", "po", "buy", "indent"],
  },
  {
    label: "Manufacturing",
    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", bar: "bg-orange-500",
    keywords: ["fabricat", "manufactur", "weld", "assem", "production", "shop"],
  },
  {
    label: "Site / Installation",
    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500",
    keywords: ["site", "install", "erect", "civil work", "foundation", "piping", "cable", "wiring"],
  },
  {
    label: "Commissioning",
    color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", bar: "bg-rose-500",
    keywords: ["commission", "test", "startup", "start-up", "handover", "trial", "fat", "sat", "punch"],
  },
];

const OTHER_PHASE = { label: "Other", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", bar: "bg-gray-400", keywords: [] };

function classifyTask(subject: string): (typeof PHASE_KEYWORDS)[0] {
  const s = subject.toLowerCase();
  for (const phase of PHASE_KEYWORDS) {
    if (phase.keywords.some(k => s.includes(k))) return phase;
  }
  return OTHER_PHASE;
}

function parseDate(d: string | null): Date | null {
  if (!d) return null;
  const p = new Date(d);
  return isNaN(p.getTime()) ? null : p;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const p = parseDate(d);
  if (!p) return d;
  return p.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: number, _currency = "INR") {
  if (!n) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function ProgressRing({ pct, size = 56, stroke = 5, color = "#3b82f6" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cfg =
    s.includes("complet") ? "bg-green-100 text-green-700 border-green-200" :
    s.includes("cancel") ? "bg-red-100 text-red-700 border-red-200" :
    s.includes("overdue") ? "bg-red-100 text-red-700 border-red-200" :
    s.includes("open") || s.includes("working") || s.includes("on going") || s.includes("to receive") ? "bg-blue-100 text-blue-700 border-blue-200" :
    s.includes("pending") || s.includes("draft") ? "bg-amber-100 text-amber-700 border-amber-200" :
    "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", cfg)}>
      {status}
    </span>
  );
}

function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-7 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewView({
  data,
  projectDetail,
  selectedProject,
  taskAllocations,
}: {
  data: TimelineData;
  projectDetail: ProjectDetail | null;
  selectedProject: string;
  taskAllocations: TaskAllocation[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { tasks, materialRequests: mrs, purchaseOrders: pos } = data;

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const overdueTasks = tasks.filter(t => {
    const end = parseDate(t.exp_end_date);
    return end && end < today && t.status !== "Completed" && t.status !== "Cancelled";
  }).length;
  const openTasks = tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled").length;
  const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / totalTasks) : 0;

  // PO financials
  const totalPOValue = pos.reduce((s, p) => s + (p.grand_total || 0), 0);
  const receivedValue = pos.reduce((s, p) => s + (p.grand_total || 0) * (p.per_received / 100), 0);
  const billedValue = pos.reduce((s, p) => s + (p.grand_total || 0) * (p.per_billed / 100), 0);
  const pendingPOs = pos.filter(p => p.per_received < 100 && p.status !== "Cancelled").length;
  const latePOs = pos.filter(p => {
    const d = parseDate(p.schedule_date);
    return d && d < today && p.per_received < 100 && p.status !== "Cancelled";
  }).length;
  const lateMRs = mrs.filter(m => {
    const d = parseDate(m.schedule_date);
    return d && d < today && m.status !== "Stopped" && !m.status.toLowerCase().includes("complete");
  }).length;

  // Schedule health
  const projPct = projectDetail?.percent_complete ?? avgProgress;
  const expectedEnd = parseDate(projectDetail?.expected_end_date || null);
  const expectedStart = parseDate(projectDetail?.expected_start_date || null);
  const totalProjectDays = expectedStart && expectedEnd ? daysBetween(expectedStart, expectedEnd) : null;
  const elapsedDays = expectedStart ? daysBetween(expectedStart, today) : null;
  const remainingDays = expectedEnd ? daysBetween(today, expectedEnd) : null;
  const timeElapsedPct = totalProjectDays && elapsedDays ? Math.min(100, Math.max(0, (elapsedDays / totalProjectDays) * 100)) : null;
  const scheduleVariance = timeElapsedPct !== null ? projPct - timeElapsedPct : null;

  // Phase breakdown
  const phaseStats: Map<string, { phase: typeof OTHER_PHASE; total: number; completed: number; overdue: number; avgProg: number }> = new Map();
  for (const t of tasks) {
    const phase = classifyTask(t.subject);
    if (!phaseStats.has(phase.label)) phaseStats.set(phase.label, { phase, total: 0, completed: 0, overdue: 0, avgProg: 0 });
    const s = phaseStats.get(phase.label)!;
    s.total++;
    if (t.status === "Completed") s.completed++;
    const end = parseDate(t.exp_end_date);
    if (end && end < today && t.status !== "Completed" && t.status !== "Cancelled") s.overdue++;
    s.avgProg += t.progress || 0;
  }
  for (const [, s] of phaseStats) {
    s.avgProg = s.total > 0 ? Math.round(s.avgProg / s.total) : 0;
  }

  // Pre-compute delay data outside IIFE so it can be used in summary banner
  const personDelays = new Map<string, { name: string; tasks: Task[]; hoursLost: number }>();
  for (const t of tasks) {
    const end = parseDate(t.exp_end_date);
    if (end && end < today && t.status !== "Completed" && t.status !== "Cancelled") {
      const who = t.assigned_to ? t.assigned_to.split("@")[0] : "Unassigned";
      if (!personDelays.has(who)) personDelays.set(who, { name: who, tasks: [], hoursLost: 0 });
      personDelays.get(who)!.tasks.push(t);
    }
  }
  const supplierDelays = new Map<string, { name: string; pos: PO[]; maxDays: number; pendingValue: number }>();
  for (const po of pos) {
    const del = parseDate(po.schedule_date);
    if (del && del < today && po.per_received < 100 && po.status !== "Cancelled") {
      const key = po.supplier;
      if (!supplierDelays.has(key)) supplierDelays.set(key, { name: po.supplier_name || po.supplier, pos: [], maxDays: 0, pendingValue: 0 });
      const s = supplierDelays.get(key)!;
      s.pos.push(po);
      s.maxDays = Math.max(s.maxDays, daysBetween(del, today));
      s.pendingValue += po.grand_total * (1 - po.per_received / 100);
    }
  }
  const unattendedMRs = mrs.filter(m => m.status === "Open" || m.status === "Pending" || m.status === "Draft");
  const unpaidPOs = pos.filter(p => p.per_billed < 100 && p.status !== "Cancelled");
  const totalUnpaid = unpaidPOs.reduce((s, p) => s + p.grand_total * (1 - p.per_billed / 100), 0);
  const totalDelayedPOValue = Array.from(supplierDelays.values()).reduce((s, x) => s + x.pendingValue, 0);
  const maxSupplierDelay = supplierDelays.size > 0 ? Math.max(...Array.from(supplierDelays.values()).map(s => s.maxDays)) : 0;

  // Build action plan items
  type Action = { priority: "critical" | "high" | "medium"; icon: ElementType; title: string; detail: string; tag: string };
  const actions: Action[] = [];
  const criticalTasks = tasks.filter(t => {
    const end = parseDate(t.exp_end_date);
    return end && daysBetween(end, today) > 14 && t.status !== "Completed" && t.status !== "Cancelled";
  }).sort((a, b) => {
    const da = parseDate(a.exp_end_date)!; const db = parseDate(b.exp_end_date)!;
    return da.getTime() - db.getTime();
  });
  if (criticalTasks.length > 0) {
    const worst = criticalTasks[0];
    const d = daysBetween(parseDate(worst.exp_end_date)!, today);
    actions.push({ priority: "critical", icon: AlertTriangle, title: `${criticalTasks.length} task${criticalTasks.length > 1 ? "s" : ""} critically overdue (14+ days)`, detail: `Longest: "${worst.subject}" · +${d}d · ${worst.assigned_to ? worst.assigned_to.split("@")[0] : "Unassigned"}`, tag: "Tasks" });
  }
  const sortedSuppliers = Array.from(supplierDelays.values()).sort((a, b) => b.maxDays - a.maxDays);
  for (const s of sortedSuppliers.slice(0, 3)) {
    actions.push({ priority: s.maxDays > 30 ? "critical" : "high", icon: Truck, title: `${s.name} — ${s.pos.length} PO${s.pos.length > 1 ? "s" : ""} not delivered`, detail: `Max +${s.maxDays}d late · ${fmtMoney(s.pendingValue)} pending delivery`, tag: "Supplier" });
  }
  if (sortedSuppliers.length > 3) {
    actions.push({ priority: "high", icon: Truck, title: `+${sortedSuppliers.length - 3} more suppliers with late deliveries`, detail: `Total ${sortedSuppliers.length} suppliers causing delivery delays`, tag: "Supplier" });
  }
  const moderateTasks = tasks.filter(t => {
    const end = parseDate(t.exp_end_date);
    return end && daysBetween(end, today) > 0 && daysBetween(end, today) <= 14 && t.status !== "Completed" && t.status !== "Cancelled";
  });
  if (moderateTasks.length > 0) {
    actions.push({ priority: "high", icon: AlertCircle, title: `${moderateTasks.length} task${moderateTasks.length > 1 ? "s" : ""} overdue by 1–14 days`, detail: `Assigned to: ${[...new Set(moderateTasks.filter(t => t.assigned_to).map(t => t.assigned_to!.split("@")[0]))].slice(0, 3).join(", ") || "Various"}`, tag: "Tasks" });
  }
  if (unattendedMRs.length > 0) {
    const overdueCount = unattendedMRs.filter(m => { const d = parseDate(m.schedule_date); return d && d < today; }).length;
    actions.push({ priority: "high", icon: Package, title: `${unattendedMRs.length} material request${unattendedMRs.length > 1 ? "s" : ""} with no PO raised`, detail: overdueCount > 0 ? `${overdueCount} already past required date — procurement action needed` : `Pending procurement action`, tag: "Procurement" });
  }
  if (totalUnpaid > 0) {
    actions.push({ priority: "medium", icon: CreditCard, title: `${fmtMoney(totalUnpaid)} payment pending to ${unpaidPOs.length} supplier${unpaidPOs.length > 1 ? "s" : ""}`, detail: `${unpaidPOs.length} PO${unpaidPOs.length > 1 ? "s" : ""} have incomplete billing — follow up with accounts`, tag: "Finance" });
  }

  const priorityColor: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-400" };
  const priorityBg: Record<string, string> = { critical: "bg-red-50 border-red-200", high: "bg-orange-50 border-orange-200", medium: "bg-amber-50 border-amber-100" };

  // Derived health score for banner
  const healthScore = (() => {
    if (overdueTasks > 10 || supplierDelays.size > 50) return { label: "Critical", color: "text-red-300", dot: "bg-red-400" };
    if (overdueTasks > 0 || supplierDelays.size > 10) return { label: "At Risk", color: "text-yellow-300", dot: "bg-yellow-400" };
    return { label: "On Track", color: "text-emerald-300", dot: "bg-emerald-400" };
  })();

  return (
    <div className="p-4 space-y-4">

      {/* ── Project Health Banner ── */}
      {projectDetail && (
        <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl overflow-hidden shadow-lg text-white">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative p-5">
            <div className="flex flex-wrap items-start gap-5">
              {/* Progress ring + name */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                  <ProgressRing pct={projPct} size={80} stroke={7} color="#34d399" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold leading-none">{projPct.toFixed(0)}%</span>
                    <span className="text-[9px] text-blue-200 mt-0.5">done</span>
                  </div>
                </div>
                <div>
                  <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-0.5">Project Overview</p>
                  <p className="text-xl font-extrabold leading-tight">{projectDetail.project_name}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={projectDetail.status} />
                    <span className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className={cn("w-1.5 h-1.5 rounded-full inline-block", healthScore.dot)} />
                      <span className={healthScore.color}>{healthScore.label}</span>
                    </span>
                    {projectDetail.department && (
                      <span className="text-blue-300 text-[11px] flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{projectDetail.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Date stats */}
              <div className="ml-auto flex items-center gap-6 flex-wrap">
                {projectDetail.expected_start_date && (
                  <div className="text-center">
                    <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wide">Start</p>
                    <p className="text-sm font-bold mt-0.5">{fmtDate(projectDetail.expected_start_date)}</p>
                  </div>
                )}
                {projectDetail.expected_end_date && (
                  <div className="text-center">
                    <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wide">Deadline</p>
                    <p className={cn("text-sm font-bold mt-0.5", remainingDays !== null && remainingDays < 30 && remainingDays >= 0 ? "text-yellow-300" : remainingDays !== null && remainingDays < 0 ? "text-red-300" : "")}>
                      {fmtDate(projectDetail.expected_end_date)}
                    </p>
                  </div>
                )}
                {remainingDays !== null && (
                  <div className={cn("text-center px-3 py-2 rounded-xl border", remainingDays < 0 ? "bg-red-500/20 border-red-400/40" : remainingDays < 30 ? "bg-yellow-500/20 border-yellow-400/40" : "bg-emerald-500/20 border-emerald-400/40")}>
                    <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-wide">
                      {remainingDays < 0 ? "Overdue by" : "Time Left"}
                    </p>
                    <p className={cn("text-lg font-extrabold mt-0.5", remainingDays < 0 ? "text-red-300" : remainingDays < 30 ? "text-yellow-300" : "text-emerald-300")}>
                      {Math.abs(remainingDays)}d
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline bar */}
            {timeElapsedPct !== null && (
              <div className="mt-5">
                <div className="flex justify-between text-[10px] text-blue-300 mb-1.5 font-medium">
                  <span>Project Start</span>
                  <span>Today · {timeElapsedPct.toFixed(0)}% of timeline elapsed</span>
                  <span>Deadline</span>
                </div>
                <div className="relative h-4 bg-blue-900/60 rounded-full overflow-hidden border border-blue-500/30">
                  <div className="absolute left-0 top-0 h-full bg-white/10 rounded-full" style={{ width: `${timeElapsedPct}%` }} />
                  <div className="absolute left-0 top-0 h-full bg-emerald-400 rounded-full opacity-90" style={{ width: `${Math.min(projPct, 100)}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10" style={{ left: `${timeElapsedPct}%` }} title="Today" />
                </div>
                <div className="flex justify-between text-[11px] mt-1.5 font-semibold">
                  <span className="text-emerald-300">Work done: {projPct.toFixed(0)}%</span>
                  {scheduleVariance !== null && (
                    <span className={cn("flex items-center gap-1", scheduleVariance >= 0 ? "text-emerald-300" : "text-red-300")}>
                      {scheduleVariance >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(scheduleVariance).toFixed(0)}% {scheduleVariance >= 0 ? "ahead of" : "behind"} schedule
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Tasks */}
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-blue-500" />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tasks</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{totalTasks}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{completedTasks} done · {openTasks} open</p>
          </div>
        </div>
        {/* Avg Progress */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-600">{avgProgress}%</p>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        </div>
        {/* Overdue */}
        <div className={cn("rounded-xl border shadow-sm overflow-hidden", overdueTasks > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100")}>
          <div className={cn("h-1", overdueTasks > 0 ? "bg-red-500" : "bg-gray-300")} />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", overdueTasks > 0 ? "bg-red-100" : "bg-gray-100")}>
                <AlertTriangle className={cn("w-3.5 h-3.5", overdueTasks > 0 ? "text-red-600" : "text-gray-400")} />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Overdue</span>
            </div>
            <p className={cn("text-2xl font-extrabold", overdueTasks > 0 ? "text-red-600" : "text-gray-400")}>{overdueTasks}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{overdueTasks > 0 ? "Needs attention" : "All on schedule"}</p>
          </div>
        </div>
        {/* Purchase Orders */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">POs</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{pos.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{pendingPOs} pending · <span className={latePOs > 0 ? "text-red-500 font-semibold" : ""}>{latePOs} late</span></p>
          </div>
        </div>
        {/* Material Requests */}
        <div className={cn("rounded-xl border shadow-sm overflow-hidden", lateMRs > 0 ? "bg-violet-50 border-violet-200" : "bg-white border-violet-100")}>
          <div className={cn("h-1", lateMRs > 0 ? "bg-violet-600" : "bg-violet-400")} />
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">MRs</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{mrs.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5"><span className={lateMRs > 0 ? "text-red-500 font-semibold" : ""}>{lateMRs} late</span> · {unattendedMRs.length} pending</p>
          </div>
        </div>
      </div>

      {/* ── Overall Delay Summary ── */}
      {(personDelays.size > 0 || supplierDelays.size > 0 || latePOs > 0 || lateMRs > 0) && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white uppercase tracking-wide">Overall Delay Summary</span>
            <span className="ml-auto text-xs font-semibold text-red-200">
              {(personDelays.size > 0 ? 1 : 0) + (supplierDelays.size > 0 ? 1 : 0) + (latePOs > 0 ? 1 : 0) + (lateMRs > 0 ? 1 : 0)} delay categories active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-red-100">
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-700">{personDelays.size}</p>
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mt-0.5">People Delayed</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{Array.from(personDelays.values()).reduce((s, p) => s + p.tasks.length, 0)} overdue tasks</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{supplierDelays.size}</p>
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mt-0.5">Suppliers Delayed</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {supplierDelays.size > 0 ? `Max +${maxSupplierDelay}d late` : "On track"}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{latePOs}</p>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mt-0.5">Late POs</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {totalDelayedPOValue > 0 ? `${fmtMoney(totalDelayedPOValue)} pending` : "No pending value"}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-2xl font-bold text-rose-700">{lateMRs}</p>
              <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide mt-0.5">Late MRs</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{unattendedMRs.length} unattended</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Who Is Causing Delays? + Action Plan (side by side, equal height) ── */}
      {(personDelays.size > 0 || supplierDelays.size > 0 || actions.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 items-stretch">

          {/* Left: Who Is Causing Delays — mini summary */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2 shrink-0">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-700">Who Is Causing Delays?</span>
              <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                {personDelays.size + supplierDelays.size}
              </span>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {/* People summary card */}
              <div className={cn("rounded-xl border p-4 flex items-center gap-4", personDelays.size > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", personDelays.size > 0 ? "bg-red-100" : "bg-gray-100")}>
                  <Users className={cn("w-6 h-6", personDelays.size > 0 ? "text-red-600" : "text-gray-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-2xl font-bold", personDelays.size > 0 ? "text-red-700" : "text-gray-400")}>{personDelays.size}</p>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", personDelays.size > 0 ? "text-red-600" : "text-gray-400")}>People Causing Delays</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {personDelays.size > 0
                      ? `${Array.from(personDelays.values()).reduce((s, p) => s + p.tasks.length, 0)} overdue tasks · max +${Math.max(...Array.from(personDelays.values()).map(p => Math.max(...p.tasks.map(t => { const e = parseDate(t.exp_end_date); return e ? daysBetween(e, today) : 0; }))))}d late`
                      : "No people delays"}
                  </p>
                </div>
                {personDelays.size > 0 && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-red-400 font-medium">Top offender</p>
                    <p className="text-xs font-bold text-red-700 truncate max-w-[90px]">
                      {Array.from(personDelays.values()).sort((a, b) => b.tasks.length - a.tasks.length)[0]?.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Suppliers summary card */}
              <div className={cn("rounded-xl border p-4 flex items-center gap-4", supplierDelays.size > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200")}>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", supplierDelays.size > 0 ? "bg-orange-100" : "bg-gray-100")}>
                  <Truck className={cn("w-6 h-6", supplierDelays.size > 0 ? "text-orange-600" : "text-gray-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-2xl font-bold", supplierDelays.size > 0 ? "text-orange-700" : "text-gray-400")}>{supplierDelays.size}</p>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", supplierDelays.size > 0 ? "text-orange-600" : "text-gray-400")}>Suppliers Causing Delays</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {supplierDelays.size > 0
                      ? `Max +${maxSupplierDelay}d late · ${fmtMoney(totalDelayedPOValue)} pending`
                      : "No supplier delays"}
                  </p>
                </div>
                {supplierDelays.size > 0 && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-orange-400 font-medium">Worst delay</p>
                    <p className="text-xs font-bold text-orange-700 truncate max-w-[90px]">
                      {sortedSuppliers[0]?.name}
                    </p>
                  </div>
                )}
              </div>

              {personDelays.size === 0 && supplierDelays.size === 0 && (
                <div className="flex flex-col items-center py-6 text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                  <p className="text-xs font-medium text-gray-500">No active delays detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action Plan */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2 shrink-0">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-gray-700">Action Plan</span>
              <span className="text-xs text-gray-400 ml-1">— priority items</span>
              <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{actions.length}</span>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto min-h-0">
              {actions.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                  <p className="text-xs font-medium text-gray-500">All clear — no action items</p>
                </div>
              ) : actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <div key={i} className={cn("flex items-start gap-3 px-4 py-3 border-l-4", action.priority === "critical" ? "border-l-red-500 bg-red-50/40" : action.priority === "high" ? "border-l-orange-400 bg-orange-50/30" : "border-l-amber-400 bg-amber-50/20")}>
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", priorityBg[action.priority])}>
                      <Icon className={cn("w-3.5 h-3.5", action.priority === "critical" ? "text-red-600" : action.priority === "high" ? "text-orange-500" : "text-amber-600")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-xs font-semibold", action.priority === "critical" ? "text-red-800" : action.priority === "high" ? "text-orange-800" : "text-amber-800")}>{action.title}</p>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white uppercase tracking-wide shrink-0", priorityColor[action.priority])}>
                          {action.priority}
                        </span>
                        <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full">{action.tag}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{action.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── Financial & Procurement ── */}
      {pos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total PO Value */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="h-1 bg-blue-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-gray-700">Total PO Value</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{fmtMoney(totalPOValue)}</p>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Received</span>
                    <span className="font-semibold text-emerald-600">{fmtMoney(receivedValue)} <span className="text-gray-400 font-normal">({totalPOValue > 0 ? ((receivedValue/totalPOValue)*100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalPOValue > 0 ? (receivedValue/totalPOValue)*100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Billed</span>
                    <span className="font-semibold text-blue-600">{fmtMoney(billedValue)} <span className="text-gray-400 font-normal">({totalPOValue > 0 ? ((billedValue/totalPOValue)*100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalPOValue > 0 ? (billedValue/totalPOValue)*100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Status */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="h-1 bg-emerald-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-gray-700">Delivery Status</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Fully Received", count: pos.filter(p => p.per_received >= 100).length, barColor: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
                  { label: "Partial Receipt", count: pos.filter(p => p.per_received > 0 && p.per_received < 100).length, barColor: "bg-blue-500", textColor: "text-blue-700", bg: "bg-blue-50" },
                  { label: "Not Received", count: pos.filter(p => p.per_received === 0 && p.status !== "Cancelled").length, barColor: "bg-amber-500", textColor: "text-amber-700", bg: "bg-amber-50" },
                  { label: "Delivery Late", count: latePOs, barColor: "bg-red-500", textColor: "text-red-700", bg: "bg-red-50" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", row.barColor)} />
                    <span className="text-xs text-gray-600 flex-1">{row.label}</span>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", row.textColor, row.bg)}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Material Requests */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="h-1 bg-violet-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <span className="text-sm font-bold text-gray-700">Material Requests</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 mb-3">{mrs.length}</p>
              <div className="space-y-2">
                {[
                  { label: "Purchase", count: mrs.filter(m => m.material_request_type === "Purchase").length, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
                  { label: "Transfer", count: mrs.filter(m => m.material_request_type === "Material Transfer").length, color: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
                  { label: "Manufacture", count: mrs.filter(m => m.material_request_type === "Manufacture").length, color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
                  { label: "Late/Overdue", count: lateMRs, color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", row.color)} />
                    <span className="text-xs text-gray-600 flex-1">{row.label}</span>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", row.text, row.bg)}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget vs Actual ── */}
      {projectDetail && (projectDetail.estimated_costing > 0 || projectDetail.actual_expense > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="h-1 bg-indigo-500" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-sm font-bold text-gray-700">Budget vs Actual</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Estimated</p>
                <p className="text-lg font-extrabold text-gray-900 mt-0.5">{fmtMoney(projectDetail.estimated_costing)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Actual Spent</p>
                <p className={cn("text-lg font-extrabold mt-0.5", projectDetail.actual_expense > projectDetail.estimated_costing && projectDetail.estimated_costing > 0 ? "text-red-600" : "text-emerald-600")}>
                  {fmtMoney(projectDetail.actual_expense)}
                </p>
              </div>
              {projectDetail.actual_time > 0 && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Time Logged</p>
                  <p className="text-lg font-extrabold text-blue-600 mt-0.5">{projectDetail.actual_time.toFixed(1)}h</p>
                </div>
              )}
              {projectDetail.estimated_costing > 0 && projectDetail.actual_expense > 0 && (
                <div className={cn("rounded-xl p-3", (projectDetail.actual_expense / projectDetail.estimated_costing * 100) > 90 ? "bg-red-50" : "bg-emerald-50")}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Budget Used</p>
                  <p className={cn("text-lg font-extrabold mt-0.5", (projectDetail.actual_expense / projectDetail.estimated_costing * 100) > 90 ? "text-red-600" : "text-emerald-600")}>
                    {(projectDetail.actual_expense / projectDetail.estimated_costing * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
            {projectDetail.estimated_costing > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-medium">
                  <span>Budget utilization</span>
                  <span>{(Math.min(projectDetail.actual_expense / projectDetail.estimated_costing, 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", projectDetail.actual_expense > projectDetail.estimated_costing ? "bg-red-500" : "bg-indigo-500")}
                    style={{ width: `${Math.min((projectDetail.actual_expense / projectDetail.estimated_costing) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Phase-by-Phase Breakdown ── */}
      {phaseStats.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-gray-700">Phase-by-Phase Breakdown</span>
              <span className="ml-auto text-xs text-gray-400">{phaseStats.size} phases</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from(phaseStats.values()).map(({ phase, total, completed, overdue, avgProg }) => (
                <div key={phase.label} className={cn("rounded-xl border p-3", overdue > 0 ? "bg-red-50 border-red-100" : avgProg === 100 ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100")}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", phase.bar)} />
                      <span className={cn("text-xs font-bold", phase.color)}>{phase.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {overdue > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">+{overdue} late</span>}
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", avgProg === 100 ? "text-emerald-700 bg-emerald-100" : "text-gray-600 bg-gray-200")}>{completed}/{total}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                      <div className={cn("h-full rounded-full", phase.bar)} style={{ width: `${avgProg}%` }} />
                    </div>
                    <span className="text-xs font-extrabold text-gray-700 w-9 text-right">{avgProg}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {projectDetail?.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-700">Project Notes</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">{projectDetail.notes}</p>
        </div>
      )}

      {!selectedProject && (
        <div className="flex flex-col items-center py-10 text-gray-400">
          <Target className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-medium text-gray-500">Select a project to see detailed overview</p>
          <p className="text-xs mt-1">Use the project dropdown above</p>
        </div>
      )}
    </div>
  );
}

// ─── People & Workers Tab ─────────────────────────────────────────────────────

function PeopleView({ tasks, taskAllocations }: { tasks: Task[]; taskAllocations: TaskAllocation[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build per-person task map from allocations
  type PersonStats = {
    employee: string;
    employee_name: string;
    allocatedTasks: { task_name: string; expected_hours: number; hours_completed: number; status: string; expected_end_date: string | null }[];
    totalHoursExpected: number;
    totalHoursCompleted: number;
    lastWorked: string;
    overdueTaskCount: number;
    completedCount: number;
  };

  const personMap = new Map<string, PersonStats>();

  for (const alloc of taskAllocations) {
    if (!alloc.employee) continue;
    if (!personMap.has(alloc.employee)) {
      personMap.set(alloc.employee, {
        employee: alloc.employee,
        employee_name: alloc.employee_name || alloc.employee,
        allocatedTasks: [],
        totalHoursExpected: 0,
        totalHoursCompleted: 0,
        lastWorked: alloc.date,
        overdueTaskCount: 0,
        completedCount: 0,
      });
    }
    const p = personMap.get(alloc.employee)!;
    if (alloc.date > p.lastWorked) p.lastWorked = alloc.date;
    for (const t of alloc.tasks) {
      p.allocatedTasks.push(t);
      p.totalHoursExpected += t.expected_hours || 0;
      p.totalHoursCompleted += t.hours_completed || 0;
      if (t.status === "Completed") p.completedCount++;
      const end = parseDate(t.expected_end_date);
      if (end && end < today && t.status !== "Completed") p.overdueTaskCount++;
    }
  }

  // Also build from task _assign field for people not in allocations
  for (const t of tasks) {
    if (!t.assigned_to) continue;
    const key = t.assigned_to;
    if (!personMap.has(key)) {
      personMap.set(key, {
        employee: key,
        employee_name: key.split("@")[0],
        allocatedTasks: [],
        totalHoursExpected: 0,
        totalHoursCompleted: 0,
        lastWorked: "",
        overdueTaskCount: 0,
        completedCount: 0,
      });
    }
    const end = parseDate(t.exp_end_date);
    const p = personMap.get(key)!;
    if (end && end < today && t.status !== "Completed" && t.status !== "Cancelled") {
      p.overdueTaskCount++;
    }
  }

  const people = Array.from(personMap.values()).sort((a, b) => b.totalHoursCompleted - a.totalHoursCompleted);

  // Task assignments from task data (for tasks assigned view)
  const assignedTasks = tasks.filter(t => t.assigned_to);
  const assigneeGroups = new Map<string, Task[]>();
  for (const t of assignedTasks) {
    const k = t.assigned_to!;
    if (!assigneeGroups.has(k)) assigneeGroups.set(k, []);
    assigneeGroups.get(k)!.push(t);
  }

  const delayedByPerson = new Map<string, { name: string; tasks: Task[]; mrs: number }>();
  for (const t of tasks) {
    const end = parseDate(t.exp_end_date);
    if (end && end < today && t.status !== "Completed" && t.status !== "Cancelled") {
      const who = t.assigned_to ? t.assigned_to.split("@")[0] : "Unassigned";
      if (!delayedByPerson.has(who)) delayedByPerson.set(who, { name: who, tasks: [], mrs: 0 });
      delayedByPerson.get(who)!.tasks.push(t);
    }
  }

  if (people.length === 0 && assigneeGroups.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium text-gray-600">No task allocation data found</p>
        <p className="text-sm mt-1">Create Task Allocations in ERPNext to see worker details here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Workers Tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{people.length || assigneeGroups.size}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Hours Logged</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {people.reduce((s, p) => s + p.totalHoursCompleted, 0).toFixed(0)}h
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Tasks Assigned</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{assignedTasks.length}</p>
        </div>
        <div className={cn("border rounded-xl p-3 shadow-sm", delayedByPerson.size > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200")}>
          <p className={cn("text-[10px] font-semibold uppercase tracking-wide", delayedByPerson.size > 0 ? "text-red-600" : "text-gray-500")}>
            People with Delays
          </p>
          <p className={cn("text-2xl font-bold mt-1", delayedByPerson.size > 0 ? "text-red-700" : "text-gray-400")}>
            {delayedByPerson.size}
          </p>
        </div>
      </div>

      {/* Delay Responsibility — Who is Causing Delays */}
      {delayedByPerson.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-red-100 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-red-800">Who Is Causing Delays?</h3>
          </div>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(delayedByPerson.entries())
              .sort((a, b) => b[1].tasks.length - a[1].tasks.length)
              .map(([person, info]) => {
                const maxDelay = Math.max(...info.tasks.map(t => {
                  const end = parseDate(t.exp_end_date);
                  return end ? daysBetween(end, today) : 0;
                }));
                return (
                  <div key={person} className="bg-white border border-red-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center text-sm font-bold text-red-700 shrink-0 uppercase">
                      {person.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate">{person}</p>
                      <p className="text-xs text-red-600 font-semibold mt-0.5">
                        {info.tasks.length} overdue task{info.tasks.length > 1 ? "s" : ""} · max +{maxDelay}d late
                      </p>
                      <div className="mt-2 space-y-1">
                        {info.tasks.slice(0, 3).map(t => {
                          const end = parseDate(t.exp_end_date)!;
                          const d = daysBetween(end, today);
                          return (
                            <div key={t.name} className="flex items-center justify-between text-[10px]">
                              <span className="text-gray-600 truncate mr-2">{t.subject}</span>
                              <span className={cn("font-bold shrink-0", d > 30 ? "text-red-700" : d > 14 ? "text-red-500" : "text-orange-500")}>
                                +{d}d
                              </span>
                            </div>
                          );
                        })}
                        {info.tasks.length > 3 && (
                          <p className="text-[10px] text-red-400">+{info.tasks.length - 3} more overdue tasks</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Task Allocation Worker Cards (from Task Allocation doctype) */}
      {people.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-700">Task Allocation — Worker Details</h3>
            <span className="ml-auto text-xs text-gray-400">From ERPNext Task Allocation</span>
          </div>
          <div className="divide-y divide-gray-100">
            {people.map(p => {
              const efficiencyPct = p.totalHoursExpected > 0
                ? Math.min(200, Math.round((p.totalHoursCompleted / p.totalHoursExpected) * 100))
                : 0;
              const totalAlloc = p.allocatedTasks.length;
              return (
                <div key={p.employee} className="p-4 flex flex-wrap gap-4 items-start">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0 uppercase">
                      {p.employee_name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{p.employee_name}</p>
                      <p className="text-[10px] text-gray-400">{p.employee.includes("@") ? p.employee : `ID: ${p.employee}`}</p>
                      {p.lastWorked && (
                        <p className="text-[10px] text-gray-400">Last: {fmtDate(p.lastWorked)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 flex-wrap flex-1">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{totalAlloc}</p>
                      <p className="text-[10px] text-gray-500">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{p.completedCount}</p>
                      <p className="text-[10px] text-gray-500">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">{p.totalHoursCompleted.toFixed(0)}h</p>
                      <p className="text-[10px] text-gray-500">Hours Logged</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-700">{p.totalHoursExpected.toFixed(0)}h</p>
                      <p className="text-[10px] text-gray-500">Hours Planned</p>
                    </div>
                    {p.overdueTaskCount > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{p.overdueTaskCount}</p>
                        <p className="text-[10px] text-red-400">Overdue</p>
                      </div>
                    )}
                  </div>
                  {p.totalHoursExpected > 0 && (
                    <div className="w-full mt-1">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Progress ({efficiencyPct}%)</span>
                        <span>{p.totalHoursCompleted.toFixed(1)}h / {p.totalHoursExpected.toFixed(1)}h</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", efficiencyPct >= 100 ? "bg-emerald-500" : efficiencyPct >= 50 ? "bg-blue-500" : "bg-amber-500")}
                          style={{ width: `${Math.min(100, efficiencyPct)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Assignments from ERPNext Tasks (fallback when no task allocations) */}
      {people.length === 0 && assigneeGroups.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-700">Task Assignments (from ERPNext Tasks)</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from(assigneeGroups.entries())
              .sort((a, b) => b[1].length - a[1].length)
              .map(([assignee, userTasks]) => {
                const completed = userTasks.filter(t => t.status === "Completed").length;
                const overdue = userTasks.filter(t => {
                  const end = parseDate(t.exp_end_date);
                  return end && end < today && t.status !== "Completed" && t.status !== "Cancelled";
                }).length;
                const avgProg = userTasks.length > 0 ? Math.round(userTasks.reduce((s, t) => s + t.progress, 0) / userTasks.length) : 0;
                const displayName = assignee.includes("@") ? assignee.split("@")[0] : assignee;
                return (
                  <div key={assignee} className="p-4 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-3 min-w-[160px]">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0 uppercase">
                        {displayName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{displayName}</p>
                        {assignee.includes("@") && <p className="text-[10px] text-gray-400">{assignee}</p>}
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{userTasks.length}</p>
                        <p className="text-[10px] text-gray-500">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{completed}</p>
                        <p className="text-[10px] text-gray-500">Done</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{avgProg}%</p>
                        <p className="text-[10px] text-gray-500">Avg Progress</p>
                      </div>
                      {overdue > 0 && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-600">{overdue}</p>
                          <p className="text-[10px] text-red-500">Overdue</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProg}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gantt Chart ──────────────────────────────────────────────────────────────

function GanttView({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PHASE_KEYWORDS.map(p => p.label).concat(["Other"])));

  const togglePhase = (label: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const scheduledTasks = tasks.filter(t => t.exp_start_date && t.exp_end_date);
  const unscheduled = tasks.filter(t => !t.exp_start_date || !t.exp_end_date);

  const allDates = scheduledTasks.flatMap(t => [
    parseDate(t.exp_start_date)!, parseDate(t.exp_end_date)!
  ]).filter(Boolean);

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CalendarDays className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium text-gray-600">No scheduled tasks found</p>
        <p className="text-sm mt-1">Tasks with start & end dates will appear here.</p>
        {unscheduled.length > 0 && (
          <p className="text-sm mt-2 text-amber-600">{unscheduled.length} tasks have no dates — set dates in ERPNext.</p>
        )}
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  minDate.setDate(1);
  maxDate.setMonth(maxDate.getMonth() + 1, 1);

  const totalDays = daysBetween(minDate, maxDate) || 1;
  const todayPct = Math.max(0, Math.min(100, (daysBetween(minDate, today) / totalDays) * 100));

  // Month headers
  const months: { label: string; left: number; width: number }[] = [];
  const cur = new Date(minDate);
  while (cur < maxDate) {
    const start = Math.max(0, (daysBetween(minDate, cur) / totalDays) * 100);
    const next = new Date(cur);
    next.setMonth(next.getMonth() + 1);
    const end = Math.min(100, (daysBetween(minDate, next) / totalDays) * 100);
    months.push({
      label: cur.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      left: start,
      width: end - start,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  // Week lines (for finer grid)
  const weeks: number[] = [];
  const wCur = new Date(minDate);
  // Advance to first Monday
  while (wCur.getDay() !== 1) wCur.setDate(wCur.getDate() + 1);
  while (wCur < maxDate) {
    weeks.push((daysBetween(minDate, wCur) / totalDays) * 100);
    wCur.setDate(wCur.getDate() + 7);
  }

  const phaseGroups: Map<string, { phase: typeof OTHER_PHASE; tasks: Task[] }> = new Map();
  for (const t of scheduledTasks) {
    const phase = classifyTask(t.subject);
    if (!phaseGroups.has(phase.label)) phaseGroups.set(phase.label, { phase, tasks: [] });
    phaseGroups.get(phase.label)!.tasks.push(t);
  }

  const LABEL_W = 240;
  const MIN_CHART_W = 900;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: MIN_CHART_W + LABEL_W }}>
        {/* Month headers */}
        <div className="flex sticky top-0 z-10 bg-white border-b-2 border-gray-200 shadow-sm">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 shrink-0">
            Task / Phase
          </div>
          <div className="relative flex-1" style={{ minWidth: MIN_CHART_W }}>
            <div className="flex h-8 bg-gray-50">
              {months.map(m => (
                <div key={m.label} className="absolute h-full border-l border-gray-300 flex items-center px-1"
                  style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                  <span className="text-[10px] font-bold text-gray-600 truncate">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase groups */}
        {Array.from(phaseGroups.values()).map(({ phase, tasks: pTasks }) => {
          const isExpanded = expandedPhases.has(phase.label);
          const phaseCompleted = pTasks.filter(t => t.status === "Completed").length;
          const phaseOverdue = pTasks.filter(t => {
            const end = parseDate(t.exp_end_date);
            return end && end < today && t.status !== "Completed" && t.status !== "Cancelled";
          }).length;
          const phaseAvgProg = pTasks.length > 0 ? Math.round(pTasks.reduce((s, t) => s + t.progress, 0) / pTasks.length) : 0;

          // Phase bar: earliest start to latest end
          const pDates = pTasks.flatMap(t => [parseDate(t.exp_start_date)!, parseDate(t.exp_end_date)!]).filter(Boolean);
          const pMin = pDates.length ? new Date(Math.min(...pDates.map(d => d.getTime()))) : null;
          const pMax = pDates.length ? new Date(Math.max(...pDates.map(d => d.getTime()))) : null;
          const pLeft = pMin ? (daysBetween(minDate, pMin) / totalDays) * 100 : null;
          const pWidth = pMin && pMax ? Math.max(0.5, (daysBetween(pMin, pMax) / totalDays) * 100) : null;

          return (
            <div key={phase.label}>
              {/* Phase header row */}
              <div
                className={cn("flex items-center cursor-pointer border-b", phase.bg, `border-${phase.border}`)}
                onClick={() => togglePhase(phase.label)}
              >
                <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="border-r border-gray-200 px-3 py-2 shrink-0 flex items-center gap-2">
                  <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", phase.color, !isExpanded && "-rotate-90")} />
                  <span className={cn("text-xs font-bold uppercase tracking-wide", phase.color)}>{phase.label}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{pTasks.length}t</span>
                </div>
                <div className="relative flex-1 flex items-center py-2" style={{ minWidth: MIN_CHART_W, height: 36 }}>
                  {/* Week gridlines */}
                  {weeks.map((w, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${w}%` }} />
                  ))}
                  {/* Month gridlines */}
                  {months.map(m => (
                    <div key={m.label} className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: `${m.left}%` }} />
                  ))}
                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${todayPct}%` }} />
                  )}
                  {/* Phase summary bar */}
                  {pLeft !== null && pWidth !== null && (
                    <div className="absolute h-3 rounded-sm opacity-30"
                      style={{ left: `${pLeft}%`, width: `${pWidth}%` }}
                    >
                      <div className={cn("h-full rounded-sm", phase.bar)} style={{ width: `${phaseAvgProg}%` }} />
                      <div className="absolute inset-0 border rounded-sm border-gray-400 opacity-50" />
                    </div>
                  )}
                  {/* Phase stats */}
                  <div className="absolute right-2 flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-600 font-semibold">{phaseCompleted}/{pTasks.length}</span>
                    {phaseOverdue > 0 && <span className="text-red-500 font-bold">{phaseOverdue} late</span>}
                    <span className={cn("font-bold", phase.color)}>{phaseAvgProg}% done</span>
                  </div>
                </div>
              </div>

              {/* Task rows */}
              {isExpanded && pTasks.map(task => {
                const start = parseDate(task.exp_start_date)!;
                const end = parseDate(task.exp_end_date)!;
                const leftPct = (daysBetween(minDate, start) / totalDays) * 100;
                const widthPct = Math.max(0.5, (daysBetween(start, end) / totalDays) * 100);
                const isOverdue = end < today && task.status !== "Completed" && task.status !== "Cancelled";
                const isCompleted = task.status === "Completed" || task.status === "Cancelled";
                const isCritical = task.priority?.toLowerCase() === "high" || task.priority?.toLowerCase() === "urgent";
                const daysLate = isOverdue ? daysBetween(end, today) : 0;
                const durationDays = daysBetween(start, end);

                const barColor = isCompleted
                  ? "bg-emerald-500"
                  : isOverdue
                  ? "bg-red-500"
                  : isCritical
                  ? "bg-violet-500"
                  : phase.bar;

                return (
                  <div key={task.name} className="flex border-b border-gray-100 hover:bg-blue-50/40 group transition-colors">
                    <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                      className="border-r border-gray-200 px-3 py-2 shrink-0 flex flex-col justify-center">
                      <div className="flex items-start gap-1.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : isOverdue ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        ) : isCritical ? (
                          <Star className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{task.subject}</span>
                      </div>
                      <div className="ml-5 flex flex-wrap items-center gap-1.5 mt-0.5">
                        {task.assigned_to && (
                          <div className="flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{task.assigned_to.split("@")[0]}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400">{durationDays}d</span>
                        {isCritical && !isCompleted && (
                          <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1 rounded">HIGH</span>
                        )}
                      </div>
                    </div>

                    <div className="relative flex-1 flex items-center py-2" style={{ minWidth: MIN_CHART_W }}>
                      {/* Week gridlines */}
                      {weeks.map((w, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-50" style={{ left: `${w}%` }} />
                      ))}
                      {/* Month gridlines */}
                      {months.map(m => (
                        <div key={m.label} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${m.left}%` }} />
                      ))}
                      {/* Today line */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 opacity-70" style={{ left: `${todayPct}%` }} />
                      )}

                      {/* Task bar */}
                      <div
                        className={cn("absolute h-6 rounded flex items-center overflow-hidden shadow-sm", barColor)}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${task.subject}\n${fmtDate(task.exp_start_date)} → ${fmtDate(task.exp_end_date)}\nDuration: ${durationDays} days\nProgress: ${task.progress}%\nStatus: ${task.status}\nAssigned: ${task.assigned_to || "—"}`}
                      >
                        {/* Progress fill */}
                        <div className="absolute left-0 top-0 h-full bg-white/30 rounded" style={{ width: `${task.progress}%` }} />
                        {/* Progress divider */}
                        {task.progress > 0 && task.progress < 100 && (
                          <div className="absolute top-0 bottom-0 w-0.5 bg-white/70" style={{ left: `${task.progress}%` }} />
                        )}
                        <span className="relative text-[9px] text-white font-bold px-1.5 truncate drop-shadow">
                          {widthPct > 4 ? `${task.progress}%` : ""}
                        </span>
                      </div>

                      {/* Delay badge */}
                      {isOverdue && (
                        <div
                          className="absolute text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded shadow-sm"
                          style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
                        >
                          +{daysLate}d
                        </div>
                      )}

                      {/* Date labels (on hover via group) */}
                      <div
                        className="absolute opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-gray-400 whitespace-nowrap pointer-events-none"
                        style={{ left: `${leftPct}%`, top: "calc(100% - 4px)" }}
                      >
                        {fmtDate(task.exp_start_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500 sticky bottom-0">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Overdue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-violet-500 inline-block" /> High Priority</span>
          <span className="flex items-center gap-1.5"><span className="w-0.5 h-4 bg-red-400 inline-block" /> Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-white/30 border border-gray-300 inline-block" /> Progress fill</span>
          <span className="text-xs text-gray-400 ml-auto">Hover task for dates</span>
        </div>

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <div className="border-t border-dashed border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              {unscheduled.length} Unscheduled Tasks — set start/end dates in ERPNext
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map(t => (
                <span key={t.name} className="text-[10px] px-2 py-0.5 bg-white border border-amber-200 rounded-full text-amber-700">
                  {t.subject}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Purchase Tracker ─────────────────────────────────────────────────────────

function PurchaseView({ mrs, pos }: { mrs: MR[]; pos: PO[] }) {
  const today = new Date();
  const [activeSection, setActiveSection] = useState<"all" | "suppliers" | "unattended" | "unpaid">("all");

  const totalPOValue = pos.reduce((s, p) => s + (p.grand_total || 0), 0);
  const receivedValue = pos.reduce((s, p) => s + (p.grand_total || 0) * (p.per_received / 100), 0);
  const pendingValue = totalPOValue - receivedValue;
  const latePOs = pos.filter(p => {
    const d = parseDate(p.schedule_date);
    return d && d < today && p.per_received < 100 && p.status !== "Cancelled";
  });
  const lateMRs = mrs.filter(m => {
    const d = parseDate(m.schedule_date);
    return d && d < today && m.status !== "Stopped" && !m.status.toLowerCase().includes("complete");
  });

  if (mrs.length === 0 && pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Package className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium text-gray-600">No purchase data found for this project</p>
      </div>
    );
  }

  // Supplier analysis
  type SupplierStats = {
    supplier: string;
    supplier_name: string;
    pos: PO[];
    latePOs: PO[];
    totalValue: number;
    receivedValue: number;
    pendingValue: number;
    unpaidValue: number;
    maxDaysLate: number;
    allOnTime: boolean;
  };
  const supplierMap = new Map<string, SupplierStats>();
  for (const po of pos) {
    const key = po.supplier;
    if (!supplierMap.has(key)) {
      supplierMap.set(key, { supplier: key, supplier_name: po.supplier_name || key, pos: [], latePOs: [], totalValue: 0, receivedValue: 0, pendingValue: 0, unpaidValue: 0, maxDaysLate: 0, allOnTime: true });
    }
    const s = supplierMap.get(key)!;
    s.pos.push(po);
    s.totalValue += po.grand_total || 0;
    s.receivedValue += (po.grand_total || 0) * (po.per_received / 100);
    s.pendingValue += (po.grand_total || 0) * (1 - po.per_received / 100);
    s.unpaidValue += (po.grand_total || 0) * (1 - po.per_billed / 100);
    const del = parseDate(po.schedule_date);
    if (del && del < today && po.per_received < 100 && po.status !== "Cancelled") {
      const d = daysBetween(del, today);
      s.latePOs.push(po);
      s.maxDaysLate = Math.max(s.maxDaysLate, d);
      s.allOnTime = false;
    }
  }
  const lateSuppliers = Array.from(supplierMap.values()).filter(s => s.latePOs.length > 0).sort((a, b) => b.maxDaysLate - a.maxDaysLate);
  const onTimeSuppliers = Array.from(supplierMap.values()).filter(s => s.allOnTime && s.pos.some(p => p.per_received >= 100));

  // Unattended MRs: Open status and schedule_date is overdue or no PO raised
  const unattendedMRs = mrs.filter(m =>
    (m.status === "Open" || m.status === "Pending" || m.status === "Draft") &&
    m.status !== "Stopped"
  ).sort((a, b) => {
    const da = parseDate(a.schedule_date);
    const db = parseDate(b.schedule_date);
    if (da && db) return da.getTime() - db.getTime();
    return 0;
  });

  // Unpaid POs: per_billed < 100 and not cancelled
  const unpaidPOs = pos.filter(p => p.per_billed < 100 && p.status !== "Cancelled").sort((a, b) => {
    return (b.grand_total * (1 - b.per_billed / 100)) - (a.grand_total * (1 - a.per_billed / 100));
  });
  const totalUnpaidValue = unpaidPOs.reduce((s, p) => s + (p.grand_total * (1 - p.per_billed / 100)), 0);

  const SECTIONS = [
    { id: "all", label: "All POs & MRs", icon: Package },
    { id: "suppliers", label: `Suppliers (${supplierMap.size})`, icon: Truck, badge: lateSuppliers.length > 0 ? lateSuppliers.length : null, badgeColor: "bg-red-500" },
    { id: "unattended", label: `Unattended MRs (${unattendedMRs.length})`, icon: Hourglass, badge: unattendedMRs.length > 0 ? unattendedMRs.length : null, badgeColor: "bg-amber-500" },
    { id: "unpaid", label: `Unpaid POs (${unpaidPOs.length})`, icon: CreditCard, badge: unpaidPOs.length > 0 ? unpaidPOs.length : null, badgeColor: "bg-orange-500" },
  ] as const;

  return (
    <div className="p-4 space-y-5">
      {/* Financial Summary Cards */}
      {pos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total PO Value</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmtMoney(totalPOValue)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{pos.length} orders · {supplierMap.size} suppliers</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Received</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(receivedValue)}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{totalPOValue > 0 ? ((receivedValue / totalPOValue) * 100).toFixed(0) : 0}% of total</p>
          </div>
          <div className={cn("border rounded-xl p-3 shadow-sm", latePOs.length > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", latePOs.length > 0 ? "text-red-600" : "text-amber-600")}>Late Deliveries</p>
            <p className={cn("text-xl font-bold mt-1", latePOs.length > 0 ? "text-red-700" : "text-amber-700")}>{latePOs.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{lateSuppliers.length} supplier{lateSuppliers.length !== 1 ? "s" : ""} delaying</p>
          </div>
          <div className={cn("border rounded-xl p-3 shadow-sm", unpaidPOs.length > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200")}>
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", unpaidPOs.length > 0 ? "text-orange-600" : "text-gray-500")}>Payment Pending</p>
            <p className={cn("text-xl font-bold mt-1", unpaidPOs.length > 0 ? "text-orange-700" : "text-gray-400")}>{fmtMoney(totalUnpaidValue)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{unpaidPOs.length} PO{unpaidPOs.length !== 1 ? "s" : ""} unbilled</p>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              activeSection === s.id
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            )}>
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
            {s.badge && (
              <span className={cn("text-white text-[9px] font-bold px-1 py-0.5 rounded-full ml-0.5", s.badgeColor)}>
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Supplier Report ── */}
      {activeSection === "suppliers" && (
        <div className="space-y-4">
          {/* Late Suppliers */}
          {lateSuppliers.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-800">Suppliers Causing Delay ({lateSuppliers.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {lateSuppliers.map(s => (
                  <div key={s.supplier} className="p-4 flex flex-wrap gap-4 items-start">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-9 h-9 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center text-xs font-bold text-red-700 shrink-0 uppercase">
                        {s.supplier_name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{s.supplier_name}</p>
                        <p className="text-[10px] text-gray-400">{s.supplier}</p>
                        <p className="text-xs text-red-600 font-semibold mt-0.5">
                          {s.latePOs.length} PO{s.latePOs.length > 1 ? "s" : ""} late · max +{s.maxDaysLate}d
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap text-center">
                      <div>
                        <p className="text-base font-bold text-gray-900">{fmtMoney(s.totalValue)}</p>
                        <p className="text-[10px] text-gray-500">Total Value</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-amber-600">{fmtMoney(s.pendingValue)}</p>
                        <p className="text-[10px] text-gray-500">Pending Delivery</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-orange-600">{fmtMoney(s.unpaidValue)}</p>
                        <p className="text-[10px] text-gray-500">Payment Pending</p>
                      </div>
                    </div>
                    <div className="w-full mt-2 space-y-2">
                      {s.latePOs.map(po => {
                        const del = parseDate(po.schedule_date);
                        const d = del ? daysBetween(del, today) : 0;
                        // Sort items by amount desc, show major items (top by value)
                        const majorItems = (po.items || [])
                          .slice()
                          .sort((a, b) => b.amount - a.amount)
                          .slice(0, 6);
                        return (
                          <div key={po.name} className="bg-white border border-red-100 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 px-3 py-2 bg-red-50 flex-wrap">
                              <span className="font-mono text-blue-600 font-medium text-xs">{po.name}</span>
                              <span className="text-gray-500 text-xs">{fmtDate(po.schedule_date)}</span>
                              <span className="font-semibold text-gray-800 text-xs">{fmtMoney(po.grand_total)}</span>
                              <span className="font-bold text-red-600 text-xs ml-auto">+{d}d late</span>
                              <span className="text-gray-500 text-xs">{po.per_received.toFixed(0)}% rcvd</span>
                            </div>
                            {majorItems.length > 0 && (
                              <div className="px-3 py-2 flex flex-wrap gap-1.5">
                                {majorItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-[10px] max-w-[260px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    <span className="font-medium text-gray-700 truncate" title={item.item_name}>{item.item_name}</span>
                                    <span className="text-gray-400 shrink-0 ml-1">{item.qty} {item.uom}</span>
                                    <span className="text-gray-500 font-semibold shrink-0 ml-1">{fmtMoney(item.amount)}</span>
                                    {item.received_qty > 0 && item.received_qty < item.qty && (
                                      <span className="text-amber-600 shrink-0 ml-1">{item.received_qty}/{item.qty} rcvd</span>
                                    )}
                                    {item.received_qty === 0 && (
                                      <span className="text-red-500 shrink-0 ml-1 font-bold">0 rcvd</span>
                                    )}
                                  </div>
                                ))}
                                {(po.items || []).length > 6 && (
                                  <span className="text-[10px] text-gray-400 self-center">+{po.items.length - 6} more items</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On-Time Suppliers */}
          {onTimeSuppliers.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-800">On-Time Suppliers ({onTimeSuppliers.length})</h3>
              </div>
              <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {onTimeSuppliers.map(s => (
                  <div key={s.supplier} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 uppercase">
                      {s.supplier_name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.supplier_name}</p>
                      <p className="text-[10px] text-emerald-600">{s.pos.length} PO{s.pos.length > 1 ? "s" : ""} · {fmtMoney(s.totalValue)}</p>
                      <p className="text-[10px] text-emerald-500">{s.pos.filter(p => p.per_received >= 100).length} fully delivered ✓</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All suppliers table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">All Suppliers — Full Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Supplier</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-600">POs</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Total Value</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Received</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Pending Delivery</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Payment Pending</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(supplierMap.values()).sort((a, b) => b.maxDaysLate - a.maxDaysLate).map((s, i) => (
                    <tr key={s.supplier} className={cn("border-b border-gray-100 hover:bg-gray-50", i % 2 === 0 ? "" : "bg-gray-50/40", s.latePOs.length > 0 && "bg-red-50/60")}>
                      <td className="px-3 py-2 font-medium text-gray-800">{s.supplier_name}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{s.pos.length}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtMoney(s.totalValue)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.totalValue > 0 ? (s.receivedValue / s.totalValue * 100) : 0}%` }} />
                          </div>
                          <span className="text-gray-600">{s.totalValue > 0 ? (s.receivedValue / s.totalValue * 100).toFixed(0) : 0}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-amber-700">{fmtMoney(s.pendingValue)}</td>
                      <td className="px-3 py-2 text-right text-orange-700">{fmtMoney(s.unpaidValue)}</td>
                      <td className="px-3 py-2 text-center">
                        {s.latePOs.length > 0 ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                            {s.latePOs.length} LATE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ ON TIME
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Unattended MRs ── */}
      {activeSection === "unattended" && (
        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Unattended Material Requests ({unattendedMRs.length})</h3>
            <span className="ml-auto text-[10px] text-amber-600">Open / Pending — no PO raised yet</span>
          </div>
          {unattendedMRs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">All material requests have been attended to!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">MR No.</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Title</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Raised On</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Required By</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Raised By</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {unattendedMRs.map((mr, i) => {
                    const reqDate = parseDate(mr.schedule_date);
                    const isOverdue = reqDate && reqDate < today;
                    const daysOverdue = isOverdue && reqDate ? daysBetween(reqDate, today) : 0;
                    return (
                      <tr key={mr.name} className={cn("border-b border-gray-100 hover:bg-gray-50", isOverdue ? "bg-amber-50" : "", i % 2 === 0 ? "" : "bg-gray-50/40")}>
                        <td className="px-3 py-2 font-mono text-blue-600 font-medium whitespace-nowrap">{mr.name}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{mr.title || "—"}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{mr.material_request_type}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(mr.transaction_date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={cn(isOverdue ? "text-red-600 font-bold" : "text-gray-600")}>
                            {fmtDate(mr.schedule_date)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400 shrink-0" />
                            {mr.requested_by ? mr.requested_by.split("@")[0] : (mr as any).owner ? (mr as any).owner.split("@")[0] : "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={mr.status} /></td>
                        <td className="px-3 py-2">
                          {isOverdue ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1 whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3" />+{daysOverdue}d
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Pending POs ── */}
      {activeSection === "unpaid" && (
        <div className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-orange-800">Payment Pending POs ({unpaidPOs.length})</h3>
            <span className="ml-auto text-xs font-bold text-orange-700">{fmtMoney(totalUnpaidValue)} total unpaid</span>
          </div>
          {unpaidPOs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">All purchase orders are fully billed!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">PO No.</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Supplier</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">PO Date</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">PO Value</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Received</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Billed</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount Due</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidPOs.map((po, i) => {
                    const amountDue = po.grand_total * (1 - po.per_billed / 100);
                    return (
                      <tr key={po.name} className={cn("border-b border-gray-100 hover:bg-gray-50", i % 2 === 0 ? "" : "bg-gray-50/40")}>
                        <td className="px-3 py-2 font-mono text-blue-600 font-medium whitespace-nowrap">{po.name}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate" title={po.supplier_name}>{po.supplier_name || po.supplier}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(po.transaction_date)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(po.grand_total)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${po.per_received}%` }} />
                            </div>
                            <span className="text-gray-600">{po.per_received.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.per_billed}%` }} />
                            </div>
                            <span className="text-gray-600">{po.per_billed.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-orange-700 whitespace-nowrap">{fmtMoney(amountDue)}</td>
                        <td className="px-3 py-2"><StatusBadge status={po.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50 border-t-2 border-orange-200 font-semibold">
                    <td colSpan={6} className="px-3 py-2 text-xs text-gray-600">Total Payment Due ({unpaidPOs.length} POs)</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-orange-800">{fmtMoney(totalUnpaidValue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── All MRs & POs (default view) ── */}
      {activeSection === "all" && <>

      {/* MR Section */}
      {mrs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Material Requests ({mrs.length})</h3>
            {lateMRs.length > 0 && (
              <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                {lateMRs.length} overdue
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">MR No.</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Title</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Raised On</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Required By</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Requested By</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Delay</th>
                </tr>
              </thead>
              <tbody>
                {mrs.map((mr, i) => {
                  const reqDate = parseDate(mr.schedule_date);
                  const isLate = reqDate && reqDate < today && mr.status !== "Stopped" && !mr.status.toLowerCase().includes("complete");
                  const daysLate = isLate && reqDate ? daysBetween(reqDate, today) : 0;
                  return (
                    <tr key={mr.name} className={cn("border-b border-gray-100 hover:bg-gray-50", isLate && "bg-red-50 hover:bg-red-100")}>
                      <td className="px-3 py-2 font-mono text-blue-600 font-medium whitespace-nowrap">{mr.name}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={mr.title || ""}>{mr.title || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{mr.material_request_type}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(mr.transaction_date)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={cn(isLate ? "text-red-600 font-bold" : "text-gray-600")}>
                          {fmtDate(mr.schedule_date)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 shrink-0" />
                          {mr.requested_by ? mr.requested_by.split("@")[0] : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={mr.status} /></td>
                      <td className="px-3 py-2">
                        {isLate ? (
                          <span className="text-red-600 font-bold flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle className="w-3 h-3" />+{daysLate}d
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10px] whitespace-nowrap">✓ On time</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO Section */}
      {pos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-200">
            <Truck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-800">Purchase Orders ({pos.length})</h3>
            {latePOs.length > 0 && (
              <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                {latePOs.length} late delivery
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">PO No.</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Supplier</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">PO Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Expected Delivery</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Value</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Received</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Billed</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Delay</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po, i) => {
                  const delivDate = parseDate(po.schedule_date);
                  const isLate = delivDate && delivDate < today && po.per_received < 100 && po.status !== "Cancelled";
                  const daysLate = isLate && delivDate ? daysBetween(delivDate, today) : 0;
                  const majorItems = (po.items || []).slice().sort((a, b) => b.amount - a.amount).slice(0, 4);
                  return (
                    <Fragment key={po.name}>
                    <tr className={cn("border-b border-gray-100 hover:bg-gray-50", isLate && "bg-red-50 hover:bg-red-100")}>
                      <td className="px-3 py-2 font-mono text-blue-600 font-medium whitespace-nowrap">{po.name}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate" title={po.supplier_name}>
                        {po.supplier_name || po.supplier}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(po.transaction_date)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={cn(isLate ? "text-red-600 font-bold" : "text-gray-600")}>
                          {fmtDate(po.schedule_date)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 font-semibold whitespace-nowrap">{fmtMoney(po.grand_total, po.currency)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 min-w-[90px]">
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${po.per_received}%` }} />
                          </div>
                          <span className="text-gray-700 font-medium">{po.per_received.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 min-w-[90px]">
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.per_billed}%` }} />
                          </div>
                          <span className="text-gray-700 font-medium">{po.per_billed.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={po.status} /></td>
                      <td className="px-3 py-2">
                        {isLate ? (
                          <span className="text-red-600 font-bold flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle className="w-3 h-3" />+{daysLate}d
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10px] whitespace-nowrap">✓ On time</span>
                        )}
                      </td>
                    </tr>
                    {majorItems.length > 0 && (
                      <tr className={cn("border-b border-gray-100", isLate ? "bg-red-50/40" : "bg-gray-50/60")}>
                        <td colSpan={9} className="px-4 py-1.5">
                          <div className="flex flex-wrap gap-1">
                            {majorItems.map((item, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-600">
                                <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                                <span className="font-medium" title={item.item_name}>{item.item_name}</span>
                                <span className="text-gray-400">·</span>
                                <span>{item.qty} {item.uom}</span>
                                <span className="text-gray-400">·</span>
                                <span className="font-semibold text-gray-700">{fmtMoney(item.amount)}</span>
                              </span>
                            ))}
                            {(po.items || []).length > 4 && (
                              <span className="text-[10px] text-gray-400 self-center">+{po.items.length - 4} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-xs text-gray-600">Total ({pos.length} POs)</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-900 font-bold">{fmtMoney(totalPOValue)}</td>
                  <td className="px-3 py-2 text-xs text-emerald-700 font-bold">
                    {totalPOValue > 0 ? ((receivedValue / totalPOValue) * 100).toFixed(0) : 0}% avg
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}

// ─── Delay Analysis ───────────────────────────────────────────────────────────

function DelayView({ tasks, mrs, pos }: { tasks: Task[]; mrs: MR[]; pos: PO[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type DelayItem = {
    id: string;
    type: "Task" | "MR" | "PO";
    name: string;
    dueDate: Date;
    daysLate: number;
    responsible: string;
    status: string;
    phase: string;
    value?: number;
  };

  const delays: DelayItem[] = [];

  for (const t of tasks) {
    const end = parseDate(t.exp_end_date);
    if (end && end < today && t.status !== "Completed" && t.status !== "Cancelled") {
      delays.push({
        id: t.name,
        type: "Task",
        name: t.subject,
        dueDate: end,
        daysLate: daysBetween(end, today),
        responsible: t.assigned_to ? t.assigned_to.split("@")[0] : "Unassigned",
        status: t.status,
        phase: classifyTask(t.subject).label,
      });
    }
  }

  for (const mr of mrs) {
    const req = parseDate(mr.schedule_date);
    if (req && req < today && mr.status !== "Stopped" && !mr.status.toLowerCase().includes("complete")) {
      delays.push({
        id: mr.name,
        type: "MR",
        name: `${mr.name}${mr.title ? ` — ${mr.title}` : ""}`,
        dueDate: req,
        daysLate: daysBetween(req, today),
        responsible: mr.requested_by ? mr.requested_by.split("@")[0] : "Procurement",
        status: mr.status,
        phase: "Procurement",
      });
    }
  }

  for (const po of pos) {
    const del = parseDate(po.schedule_date);
    if (del && del < today && po.per_received < 100 && po.status !== "Cancelled") {
      delays.push({
        id: po.name,
        type: "PO",
        name: `${po.name} — ${po.supplier_name || po.supplier}`,
        dueDate: del,
        daysLate: daysBetween(del, today),
        responsible: po.supplier_name || po.supplier,
        status: po.status,
        phase: "Procurement",
        value: po.grand_total * (1 - po.per_received / 100),
      });
    }
  }

  delays.sort((a, b) => b.daysLate - a.daysLate);

  const responsibleSummary = new Map<string, { count: number; maxDelay: number; types: Set<string>; totalValue: number }>();
  for (const d of delays) {
    const e = responsibleSummary.get(d.responsible) || { count: 0, maxDelay: 0, types: new Set(), totalValue: 0 };
    e.count++;
    e.maxDelay = Math.max(e.maxDelay, d.daysLate);
    e.types.add(d.type);
    e.totalValue += d.value || 0;
    responsibleSummary.set(d.responsible, e);
  }

  if (delays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
        <p className="font-medium text-gray-700 text-lg">All on track!</p>
        <p className="text-sm mt-1">No delays detected for the selected project.</p>
      </div>
    );
  }

  const typeColor = (type: string) =>
    type === "Task" ? "bg-violet-100 text-violet-700 border-violet-200" :
    type === "MR" ? "bg-amber-100 text-amber-700 border-amber-200" :
    "bg-blue-100 text-blue-700 border-blue-200";

  const severityColor = (days: number) =>
    days > 30 ? "text-red-700 bg-red-100" : days > 14 ? "text-red-500 bg-red-50" : "text-orange-500 bg-orange-50";

  const totalPendingValue = delays.filter(d => d.type === "PO").reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="p-4 space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{delays.length}</p>
          <p className="text-xs text-red-500 font-medium mt-0.5">Total Delays</p>
          <p className="text-[10px] text-red-400 mt-1">
            {delays.filter(d => d.daysLate > 30).length} critical (&gt;30d)
          </p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 shadow-sm">
          <p className="text-2xl font-bold text-violet-600">{delays.filter(d => d.type === "Task").length}</p>
          <p className="text-xs text-violet-500 font-medium mt-0.5">Task Delays</p>
          <p className="text-[10px] text-violet-400 mt-1">
            max +{delays.filter(d => d.type === "Task").reduce((m, d) => Math.max(m, d.daysLate), 0)}d
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{delays.filter(d => d.type === "MR").length}</p>
          <p className="text-xs text-amber-500 font-medium mt-0.5">MR Delays</p>
          <p className="text-[10px] text-amber-400 mt-1">Procurement pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{delays.filter(d => d.type === "PO").length}</p>
          <p className="text-xs text-blue-500 font-medium mt-0.5">PO Delays</p>
          {totalPendingValue > 0 && (
            <p className="text-[10px] text-blue-400 mt-1">{fmtMoney(totalPendingValue)} at risk</p>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      {delays.filter(d => d.daysLate > 30).length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-700">Critical Delays (&gt;30 days)</span>
          </div>
          <div className="space-y-1">
            {delays.filter(d => d.daysLate > 30).slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", typeColor(d.type))}>{d.type}</span>
                  <span className="text-red-800 font-medium truncate">{d.name}</span>
                </div>
                <span className="text-red-700 font-bold shrink-0 ml-2">+{d.daysLate}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsibility Summary */}
      {responsibleSummary.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Accountability Summary
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from(responsibleSummary.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .map(([person, info]) => (
                <div key={person} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0 uppercase">
                    {person.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{person}</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {info.count} delayed · max +{info.maxDelay}d
                    </p>
                    {info.totalValue > 0 && (
                      <p className="text-[10px] text-orange-600 font-medium">{fmtMoney(info.totalValue)} at risk</p>
                    )}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Array.from(info.types).map(t => (
                        <span key={t} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", typeColor(t))}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Full delay table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            All Delayed Items — sorted by severity
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Type</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Item</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Phase</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Due Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Days Late</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Responsible</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Value at Risk</th>
              </tr>
            </thead>
            <tbody>
              {delays.map((d, i) => (
                <tr key={d.id} className={cn("border-b border-gray-100 hover:bg-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", typeColor(d.type))}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate" title={d.name}>{d.name}</td>
                  <td className="px-3 py-2 text-gray-600">{d.phase}</td>
                  <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{fmtDate(d.dueDate.toISOString().split("T")[0])}</td>
                  <td className="px-3 py-2">
                    <span className={cn("font-bold text-[11px] px-1.5 py-0.5 rounded", severityColor(d.daysLate))}>
                      +{d.daysLate}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate max-w-[100px]">{d.responsible}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium whitespace-nowrap">
                    {d.value ? fmtMoney(d.value) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Project Selector ─────────────────────────────────────────────────────────

function ProjectDropdown({
  projects,
  selected,
  onChange,
}: {
  projects: Project[];
  selected: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = projects.filter(
    p => p.project_name.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase())
  );
  const selProject = projects.find(p => p.name === selected);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-400 transition-colors shadow-sm min-w-[200px] max-w-[320px]"
      >
        <GanttChartSquare className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="flex-1 text-left truncate font-medium">
          {selProject ? selProject.project_name : "All Projects"}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-[380px] overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search project..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors",
                !selected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              )}
              onClick={() => { onChange(""); setOpen(false); setQ(""); }}
            >
              All Projects
            </button>
            {filtered.map(p => (
              <button
                key={p.name}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-t border-gray-50",
                  selected === p.name ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                )}
                onClick={() => { onChange(p.name); setOpen(false); setQ(""); }}
              >
                <div className="font-medium truncate">{p.project_name}</div>
                <div className="text-[10px] text-gray-400">{p.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "gantt", label: "Gantt Chart", icon: GanttChartSquare },
  { id: "purchase", label: "Purchase Tracker", icon: ShoppingCart },
  { id: "delays", label: "Delay Analysis", icon: AlertTriangle },
  { id: "people", label: "People", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProjectTimeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [data, setData] = useState<TimelineData>({ tasks: [], materialRequests: [], purchaseOrders: [] });
  const [taskAllocations, setTaskAllocations] = useState<TaskAllocation[]>([]);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetch(`${API}/timeline/projects`)
      .then(r => r.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  const load = useCallback(async (proj: string, force = false) => {
    setLoading(true);
    setProjectDetail(null);
    try {
      const qs = new URLSearchParams();
      if (proj) qs.set("project", proj);
      if (force) qs.set("refresh", "1");

      const [r, detailRes] = await Promise.all([
        fetch(`${API}/timeline?${qs}`),
        proj ? fetch(`${API}/timeline/project-detail?project=${encodeURIComponent(proj)}`) : Promise.resolve(null),
      ]);

      const d = await r.json();
      setData(d);
      setTaskAllocations(d.taskAllocations || []);

      if (detailRes) {
        const detail = await detailRes.json();
        setProjectDetail(detail);
      }

      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selectedProject); }, [selectedProject, load]);

  const today = new Date();
  const lateTaskCount = data.tasks.filter(t => {
    const end = parseDate(t.exp_end_date);
    return end && end < today && t.status !== "Completed" && t.status !== "Cancelled";
  }).length;
  const latePOCount = data.purchaseOrders.filter(po => {
    const d = parseDate(po.schedule_date);
    return d && d < today && po.per_received < 100 && po.status !== "Cancelled";
  }).length;
  const lateMRCount = data.materialRequests.filter(mr => {
    const d = parseDate(mr.schedule_date);
    return d && d < today && mr.status !== "Stopped" && !mr.status.toLowerCase().includes("complete");
  }).length;
  const totalDelays = lateTaskCount + latePOCount + lateMRCount;
  const completedTasks = data.tasks.filter(t => t.status === "Completed").length;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 pb-0 border-b border-gray-100">
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <GanttChartSquare className="w-5 h-5 text-blue-600" />
                Project Timeline
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Full lifecycle — Design → Engineering → Procurement → Commissioning
                {lastRefresh && (
                  <span className="ml-2 text-gray-400">
                    · Updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ProjectDropdown projects={projects} selected={selectedProject} onChange={v => { setSelectedProject(v); setTab("overview"); }} />
              <button
                onClick={() => load(selectedProject, true)}
                disabled={loading}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                title="Refresh from ERPNext"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="flex gap-4 mb-3 flex-wrap items-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold">{data.tasks.length}</span> Tasks
              {completedTasks > 0 && <span className="text-emerald-600">({completedTasks} done)</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold">{data.materialRequests.length}</span> MRs
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">{data.purchaseOrders.length}</span> POs
            </div>
            {projectDetail && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                <Activity className="w-3 h-3" />
                {projectDetail.percent_complete.toFixed(0)}% complete
              </div>
            )}
            {totalDelays > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {totalDelays} Delay{totalDelays > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5">
            {TABS.map(t => {
              const Icon = t.icon;
              const peopleDelayCount = taskAllocations.length > 0
                ? new Set(data.tasks.filter(tk => { const e = parseDate(tk.exp_end_date); return e && e < today && tk.status !== "Completed" && tk.status !== "Cancelled" && tk.assigned_to; }).map(tk => tk.assigned_to)).size
                : 0;
              const badge = t.id === "delays" && totalDelays > 0 ? totalDelays
                : t.id === "people" && peopleDelayCount > 0 ? peopleDelayCount
                : null;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                    tab === t.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {badge && (
                    <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Loading timeline from ERPNext...</span>
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <OverviewView data={data} projectDetail={projectDetail} selectedProject={selectedProject} taskAllocations={taskAllocations} />
              )}
              {tab === "gantt" && <GanttView tasks={data.tasks} />}
              {tab === "purchase" && <PurchaseView mrs={data.materialRequests} pos={data.purchaseOrders} />}
              {tab === "delays" && <DelayView tasks={data.tasks} mrs={data.materialRequests} pos={data.purchaseOrders} />}
              {tab === "people" && <PeopleView tasks={data.tasks} taskAllocations={taskAllocations} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
