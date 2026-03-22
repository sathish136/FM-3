import { Layout } from "@/components/Layout";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  GanttChartSquare, ShoppingCart, AlertTriangle, ChevronDown,
  RefreshCw, CalendarDays, ArrowRight, Clock, CheckCircle2,
  XCircle, AlertCircle, Circle, TrendingUp, Package, Truck,
  User, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

type Project = { name: string; project_name: string };

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
};

type TimelineData = { tasks: Task[]; materialRequests: MR[]; purchaseOrders: PO[] };

const PHASE_KEYWORDS: { label: string; color: string; bg: string; border: string; keywords: string[] }[] = [
  {
    label: "Process Design",
    color: "text-violet-700", bg: "bg-violet-100", border: "border-violet-300",
    keywords: ["process", "design", "p&id", "pid", "flow", "schematic", "basic engineering", "detail"],
  },
  {
    label: "Engineering",
    color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-300",
    keywords: ["drawing", "mechanical", "electrical", "civil", "structural", "layout", "engineering", "instrument", "2d", "3d"],
  },
  {
    label: "Procurement",
    color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300",
    keywords: ["purchase", "procure", "mr", "material", "order", "supplier", "vendor", "rfq", "quotation", "po", "buy", "indent"],
  },
  {
    label: "Manufacturing / Fabrication",
    color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300",
    keywords: ["fabricat", "manufactur", "weld", "assem", "production", "shop"],
  },
  {
    label: "Site / Installation",
    color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300",
    keywords: ["site", "install", "erect", "civil work", "foundation", "piping", "cable", "wiring"],
  },
  {
    label: "Commissioning",
    color: "text-rose-700", bg: "bg-rose-100", border: "border-rose-300",
    keywords: ["commission", "test", "startup", "start-up", "handover", "trial", "fat", "sat", "punch"],
  },
];

function classifyTask(subject: string): (typeof PHASE_KEYWORDS)[0] {
  const s = subject.toLowerCase();
  for (const phase of PHASE_KEYWORDS) {
    if (phase.keywords.some(k => s.includes(k))) return phase;
  }
  return { label: "Other", color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-300", keywords: [] };
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

function fmtMoney(n: number, currency = "INR") {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
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

// ─── Gantt Chart ──────────────────────────────────────────────────────────────

function GanttView({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const phaseGroups: Map<string, { phase: (typeof PHASE_KEYWORDS)[0]; tasks: Task[] }> = new Map();
  for (const t of scheduledTasks) {
    const phase = classifyTask(t.subject);
    if (!phaseGroups.has(phase.label)) phaseGroups.set(phase.label, { phase, tasks: [] });
    phaseGroups.get(phase.label)!.tasks.push(t);
  }

  const LABEL_W = 220;
  const MIN_CHART_W = 800;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: MIN_CHART_W + LABEL_W }}>
        {/* Month headers */}
        <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 shrink-0">
            Task
          </div>
          <div className="relative flex-1" style={{ minWidth: MIN_CHART_W }}>
            <div className="flex h-8 bg-gray-50">
              {months.map(m => (
                <div
                  key={m.label}
                  className="absolute h-full border-l border-gray-200 flex items-center px-1"
                  style={{ left: `${m.left}%`, width: `${m.width}%` }}
                >
                  <span className="text-[10px] font-semibold text-gray-500 truncate">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase groups */}
        {Array.from(phaseGroups.values()).map(({ phase, tasks: pTasks }) => (
          <div key={phase.label}>
            {/* Phase header */}
            <div className={cn("flex items-center gap-2 px-3 py-1.5 border-b", phase.bg, phase.border)}>
              <div style={{ width: LABEL_W - 12, minWidth: LABEL_W - 12 }} className="shrink-0">
                <span className={cn("text-xs font-bold uppercase tracking-wide", phase.color)}>{phase.label}</span>
              </div>
              <span className={cn("text-[10px] font-medium ml-auto", phase.color)}>{pTasks.length} tasks</span>
            </div>

            {/* Task rows */}
            {pTasks.map(task => {
              const start = parseDate(task.exp_start_date)!;
              const end = parseDate(task.exp_end_date)!;
              const leftPct = (daysBetween(minDate, start) / totalDays) * 100;
              const widthPct = Math.max(0.5, (daysBetween(start, end) / totalDays) * 100);
              const isOverdue = end < today && task.status !== "Completed" && task.status !== "Cancelled";
              const isCompleted = task.status === "Completed" || task.status === "Cancelled";
              const isCritical = task.priority?.toLowerCase() === "high" || task.priority?.toLowerCase() === "urgent";

              const barColor = isCompleted
                ? "bg-emerald-500"
                : isOverdue
                ? "bg-red-500"
                : isCritical
                ? "bg-violet-500"
                : "bg-blue-500";

              return (
                <div key={task.name} className="flex border-b border-gray-100 hover:bg-gray-50 group">
                  <div
                    style={{ width: LABEL_W, minWidth: LABEL_W }}
                    className="border-r border-gray-200 px-3 py-2 shrink-0 flex flex-col justify-center"
                  >
                    <div className="flex items-start gap-1.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : isOverdue ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{task.subject}</span>
                    </div>
                    {task.assigned_to && (
                      <div className="flex items-center gap-1 mt-0.5 ml-5">
                        <User className="w-2.5 h-2.5 text-gray-400" />
                        <span className="text-[10px] text-gray-400 truncate">{task.assigned_to.split("@")[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative flex-1 flex items-center py-2" style={{ minWidth: MIN_CHART_W }}>
                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}

                    {/* Month gridlines */}
                    {months.map(m => (
                      <div
                        key={m.label}
                        className="absolute top-0 bottom-0 w-px bg-gray-100"
                        style={{ left: `${m.left}%` }}
                      />
                    ))}

                    {/* Task bar */}
                    <div
                      className={cn("absolute h-6 rounded flex items-center overflow-hidden", barColor)}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${task.subject}\n${fmtDate(task.exp_start_date)} → ${fmtDate(task.exp_end_date)}\nProgress: ${task.progress}%\nStatus: ${task.status}`}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute left-0 top-0 h-full bg-white/25 rounded"
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="relative text-[9px] text-white font-bold px-1.5 truncate">
                        {widthPct > 5 ? `${task.progress}%` : ""}
                      </span>
                    </div>

                    {/* Delay badge */}
                    {isOverdue && (
                      <div
                        className="absolute text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 rounded"
                        style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
                      >
                        +{daysBetween(end, today)}d late
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Today legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Overdue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500 inline-block" /> High Priority</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> In Progress</span>
          <span className="flex items-center gap-1.5"><span className="w-px h-4 bg-red-400 inline-block" /> Today</span>
        </div>

        {/* Unscheduled */}
        {unscheduled.length > 0 && (
          <div className="border-t border-dashed border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              {unscheduled.length} Unscheduled Tasks (no start/end date)
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

  const poByMr = new Map<string, PO[]>();
  for (const po of pos) {
    const key = po.name.split("-MR-")[1] || po.name;
    if (!poByMr.has(key)) poByMr.set(key, []);
    poByMr.get(key)!.push(po);
  }

  if (mrs.length === 0 && pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Package className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium text-gray-600">No purchase data found for this project</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* MR Section */}
      {mrs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 px-4 pt-4 pb-2 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            Material Requests ({mrs.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-amber-50 border-b border-amber-200">
                <th className="text-left px-3 py-2 font-semibold text-amber-700">MR No.</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Title</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Type</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Raised On</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Required By</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Requested By</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-amber-700">Delay</th>
              </tr>
            </thead>
            <tbody>
              {mrs.map((mr, i) => {
                const reqDate = parseDate(mr.schedule_date);
                const isLate = reqDate && reqDate < today && mr.status !== "Stopped" && !mr.status.toLowerCase().includes("complete");
                const daysLate = isLate && reqDate ? daysBetween(reqDate, today) : 0;
                return (
                  <tr key={mr.name} className={cn("border-b border-gray-100", i % 2 === 0 ? "bg-white" : "bg-gray-50", isLate && "bg-red-50")}>
                    <td className="px-3 py-2 font-mono text-blue-600 font-medium">{mr.name}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{mr.title || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{mr.material_request_type}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(mr.transaction_date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn(isLate ? "text-red-600 font-semibold" : "text-gray-600")}>
                        {fmtDate(mr.schedule_date)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        {mr.requested_by ? mr.requested_by.split("@")[0] : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={mr.status} /></td>
                    <td className="px-3 py-2">
                      {isLate ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />+{daysLate}d
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[10px]">On time</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Section */}
      {pos.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 px-4 pt-2 pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            Purchase Orders ({pos.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-200">
                <th className="text-left px-3 py-2 font-semibold text-blue-700">PO No.</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Supplier</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">PO Date</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Expected Delivery</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Value</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Received %</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Billed %</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-blue-700">Delay</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po, i) => {
                const delivDate = parseDate(po.schedule_date);
                const isLate = delivDate && delivDate < today && po.per_received < 100 && po.status !== "Cancelled";
                const daysLate = isLate && delivDate ? daysBetween(delivDate, today) : 0;
                return (
                  <tr key={po.name} className={cn("border-b border-gray-100", i % 2 === 0 ? "bg-white" : "bg-gray-50", isLate && "bg-red-50")}>
                    <td className="px-3 py-2 font-mono text-blue-600 font-medium">{po.name}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={po.supplier_name}>
                      {po.supplier_name || po.supplier}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(po.transaction_date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn(isLate ? "text-red-600 font-semibold" : "text-gray-600")}>
                        {fmtDate(po.schedule_date)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">{fmtMoney(po.grand_total, po.currency)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${po.per_received}%` }} />
                        </div>
                        <span className="text-gray-600">{po.per_received.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.per_billed}%` }} />
                        </div>
                        <span className="text-gray-600">{po.per_billed.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={po.status} /></td>
                    <td className="px-3 py-2">
                      {isLate ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />+{daysLate}d
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[10px]">On time</span>
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
      });
    }
  }

  delays.sort((a, b) => b.daysLate - a.daysLate);

  const responsibleSummary = new Map<string, { count: number; maxDelay: number; types: Set<string> }>();
  for (const d of delays) {
    const e = responsibleSummary.get(d.responsible) || { count: 0, maxDelay: 0, types: new Set() };
    e.count++;
    e.maxDelay = Math.max(e.maxDelay, d.daysLate);
    e.types.add(d.type);
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

  return (
    <div className="p-4 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-2xl font-bold text-red-600">{delays.length}</p>
          <p className="text-xs text-red-500 font-medium mt-0.5">Total Delays</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-2xl font-bold text-amber-600">{delays.filter(d => d.type === "Task").length}</p>
          <p className="text-xs text-amber-500 font-medium mt-0.5">Task Delays</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-2xl font-bold text-orange-600">{delays.filter(d => d.type === "MR").length}</p>
          <p className="text-xs text-orange-500 font-medium mt-0.5">MR Delays</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-2xl font-bold text-blue-600">{delays.filter(d => d.type === "PO").length}</p>
          <p className="text-xs text-blue-500 font-medium mt-0.5">PO Delays</p>
        </div>
      </div>

      {/* Responsibility Summary */}
      {responsibleSummary.size > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Who Is Causing Delays?
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from(responsibleSummary.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .map(([person, info]) => (
                <div key={person} className="bg-white border border-red-200 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                    {person.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{person}</p>
                    <p className="text-xs text-red-500">
                      {info.count} delayed item{info.count > 1 ? "s" : ""} · max +{info.maxDelay}d
                    </p>
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

      {/* Delay list */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          All Delayed Items (sorted by severity)
        </h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
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
              </tr>
            </thead>
            <tbody>
              {delays.map((d, i) => (
                <tr key={d.id} className={cn("border-b border-gray-100", i % 2 === 0 ? "bg-white" : "bg-gray-50")}>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", typeColor(d.type))}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate" title={d.name}>{d.name}</td>
                  <td className="px-3 py-2 text-gray-600">{d.phase}</td>
                  <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{fmtDate(d.dueDate.toISOString().split("T")[0])}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "font-bold",
                      d.daysLate > 30 ? "text-red-700" : d.daysLate > 14 ? "text-red-500" : "text-orange-500"
                    )}>
                      +{d.daysLate}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      {d.responsible}
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
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
  { id: "gantt", label: "Gantt Chart", icon: GanttChartSquare },
  { id: "purchase", label: "Purchase Tracker", icon: ShoppingCart },
  { id: "delays", label: "Delay Analysis", icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProjectTimeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [data, setData] = useState<TimelineData>({ tasks: [], materialRequests: [], purchaseOrders: [] });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("gantt");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetch(`${API}/timeline/projects`)
      .then(r => r.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  const load = useCallback(async (proj: string, force = false) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (proj) qs.set("project", proj);
      if (force) qs.set("refresh", "1");
      const r = await fetch(`${API}/timeline?${qs}`);
      const d = await r.json();
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selectedProject); }, [selectedProject, load]);

  const selProject = projects.find(p => p.name === selectedProject);

  // Derived counts
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
                Full project lifecycle — Design → Purchase → Commissioning
                {lastRefresh && (
                  <span className="ml-2 text-gray-400">
                    · Updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ProjectDropdown projects={projects} selected={selectedProject} onChange={setSelectedProject} />
              <button
                onClick={() => load(selectedProject, true)}
                disabled={loading}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="flex gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold">{data.tasks.length}</span> Tasks
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold">{data.materialRequests.length}</span> MRs
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">{data.purchaseOrders.length}</span> POs
            </div>
            {totalDelays > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {totalDelays} Delay{totalDelays > 1 ? "s" : ""}
              </div>
            )}
            {selProject && (
              <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                <ChevronRight className="w-3 h-3" />
                {selProject.project_name}
              </div>
            )}
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5">
            {TABS.map(t => {
              const Icon = t.icon;
              const badge = t.id === "delays" && totalDelays > 0 ? totalDelays : null;
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
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading timeline data...</span>
            </div>
          ) : (
            <>
              {tab === "gantt" && <GanttView tasks={data.tasks} />}
              {tab === "purchase" && <PurchaseView mrs={data.materialRequests} pos={data.purchaseOrders} />}
              {tab === "delays" && <DelayView tasks={data.tasks} mrs={data.materialRequests} pos={data.purchaseOrders} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
