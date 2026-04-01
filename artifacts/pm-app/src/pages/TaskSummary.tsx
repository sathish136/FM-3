import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, Users, CheckCircle2, Clock, TrendingUp,
  AlertTriangle, UserX, RefreshCw, Download, X,
  BarChart3, ListChecks, Activity, CalendarDays, Zap, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ViewMode = "department" | "employee" | "idle-dept" | "idle-emp";

interface DashboardStats {
  total_employees: number;
  total_tasks: number;
  total_pending: number;
  total_completed: number;
  completion_rate: number;
  efficiency_rate?: number;
  overall_efficiency_rate?: number;
}
interface DeptRow {
  department: string; total_employees: number; total_present_days: number;
  total_tasks: number; pending: number; partially_pending: number;
  completed: number; completion_rate: number; efficiency_rate: number; rank: number | null;
}
interface EmpRow {
  employee: string; employee_name: string; department: string; designation: string;
  present_days: number; total_tasks: number; pending: number; partially_pending: number;
  completed: number; completion_rate: number; efficiency_rate: number; rank: number;
}
interface IdleDeptRow {
  department: string; total_present_employees: number; total_present_days: number;
  employees_without_tasks: number; percentage_without_tasks: number; idle_rate: number;
}
interface IdleEmpRow {
  employee: string; employee_name: string; department: string; designation: string;
  present_days: number; task_count: number; status: string; last_active?: string; rank: number;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function fmtD(d: Date) { return d.toISOString().split("T")[0]; }
function today() { return fmtD(new Date()); }
function addDays(date: string, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return fmtD(d); }
function mStart(date?: string) { const d = date ? new Date(date) : new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function mEnd(date?: string) { const d = date ? new Date(date) : new Date(); return fmtD(new Date(d.getFullYear(), d.getMonth()+1, 0)); }

// ── Rate helpers ──────────────────────────────────────────────────────────────
function rateClr(r: number) { return r >= 80 ? "#22c55e" : r >= 50 ? "#f59e0b" : "#ef4444"; }
function rateBadge(r: number) {
  if (r >= 80) return { txt: "Excellent", cls: "bg-green-500/15 text-green-400 border-green-500/25" };
  if (r >= 50) return { txt: "Good",      cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
  return               { txt: "Needs Work", cls: "bg-red-500/15 text-red-400 border-red-500/25" };
}
function idleBadge(r: number) {
  if (r > 30) return { txt: "High Idle",   cls: "bg-red-500/15 text-red-400 border-red-500/25" };
  if (r > 10) return { txt: "Medium Idle", cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
  return              { txt: "Low Idle",   cls: "bg-green-500/15 text-green-400 border-green-500/25" };
}
function initials(n: string) { return (n||"?").trim().split(/\s+/).map(p=>p[0]).join("").toUpperCase().slice(0,2); }

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, gradient, chips }: {
  label: string; value: string | number; icon: any; gradient: string;
  chips?: { label: string; val: string | number }[];
}) {
  return (
    <div className="relative flex flex-col gap-2 rounded-2xl p-4 border border-border bg-card overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.06] pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} opacity-80`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="relative text-3xl font-black text-foreground tracking-tight">{value}</div>
      {chips && chips.length > 0 && (
        <div className="relative flex flex-wrap gap-1">
          {chips.map(c => (
            <div key={c.label} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border border-border">
              <span className="text-[9px] text-muted-foreground">{c.label}</span>
              <span className="text-[10px] font-bold text-foreground">{c.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Radial Progress ───────────────────────────────────────────────────────────
function RadialProgress({ rate, sub, size = 52 }: { rate: number; sub?: string; size?: number }) {
  const color = rateClr(rate);
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(rate / 100, 1) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={6} className="stroke-muted/40" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-black leading-none" style={{ color }}>{rate}%</span>
        </div>
      </div>
      {sub && <span className="text-[9px] text-muted-foreground whitespace-nowrap">{sub}</span>}
    </div>
  );
}

// ── Bar Progress ──────────────────────────────────────────────────────────────
function BarProgress({ rate }: { rate: number }) {
  const color = rateClr(rate);
  return (
    <div className="flex items-center gap-2 w-full min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(rate,100)}%`, backgroundColor: color, transition: "width .4s" }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
            : rank === 2 ? "bg-zinc-400/20 text-zinc-400 border-zinc-400/30"
            : rank === 3 ? "bg-orange-400/20 text-orange-400 border-orange-400/30"
            :              "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-black", cls)}>
      #{rank}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ rate }: { rate: number }) {
  const { txt, cls } = rateBadge(rate);
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold", cls)}>{txt}</span>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, rate }: { name: string; rate: number }) {
  const c = rateClr(rate);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${c}cc, ${c}66)` }}>
      {initials(name)}
    </div>
  );
}

// ── Table Shell ───────────────────────────────────────────────────────────────
function DataTable({ cols, children, empty }: { cols: { label: string; center?: boolean }[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={cn(
                "sticky top-0 z-10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/60 border-b border-border whitespace-nowrap",
                c.center ? "text-center" : "text-left"
              )}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <BarChart3 className="w-10 h-10 opacity-20" />
          <p className="text-sm">No data found for this period</p>
        </div>
      )}
    </div>
  );
}
function TR({ children, i }: { children: React.ReactNode; i: number }) {
  return <tr className={cn("border-b border-border/50 transition-colors hover:bg-primary/5", i % 2 === 1 && "bg-muted/10")}>{children}</tr>;
}
function TD({ children, center, nowrap }: { children: React.ReactNode; center?: boolean; nowrap?: boolean }) {
  return <td className={cn("px-4 py-3 align-middle", center && "text-center", nowrap && "whitespace-nowrap")}>{children}</td>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { key: "today",      label: "Today" },
  { key: "yesterday",  label: "Yesterday" },
  { key: "this_week",  label: "This Week" },
  { key: "last_week",  label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_7",     label: "Last 7D" },
  { key: "last_30",    label: "Last 30D" },
];

const VIEW_TABS: { key: ViewMode; label: string; icon: any }[] = [
  { key: "department", label: "Department",  icon: Building2 },
  { key: "employee",   label: "Employee",    icon: Users },
  { key: "idle-dept",  label: "Idle Depts",  icon: AlertTriangle },
  { key: "idle-emp",   label: "Idle Emps",   icon: UserX },
];

const VIEW_LABELS: Record<ViewMode, string> = {
  department: "Department Performance",
  employee:   "Employee Performance",
  "idle-dept": "Departments with Idle Employees",
  "idle-emp":  "Employees with No Tasks",
};

export default function TaskSummary() {
  const t = today();
  const [from, setFrom] = useState(addDays(t, -6));
  const [to, setTo]     = useState(t);
  const [activeQuick, setActiveQuick] = useState("last_7");
  const [view, setView] = useState<ViewMode>("department");
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [rows, setRows]     = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRows, setLoadingRows]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const endpoints: Record<ViewMode, string> = {
    department:  "departments",
    employee:    "employees",
    "idle-dept": "idle-departments",
    "idle-emp":  "idle-employees",
  };

  const fetchStats = useCallback(async (f: string, t: string) => {
    setLoadingStats(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/task-summary/stats?from_date=${f}&to_date=${t}`);
      if (r.ok) setStats(await r.json());
    } catch { /* silent */ } finally { setLoadingStats(false); }
  }, []);

  const fetchRows = useCallback(async (f: string, t: string, v: ViewMode) => {
    setLoadingRows(true); setError(null);
    try {
      const r = await fetch(`${BASE}/api/hrms/task-summary/${endpoints[v]}?from_date=${f}&to_date=${t}`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const json = await r.json();
      setRows(Array.isArray(json) ? json.filter((x: any) => !x.is_total) : []);
    } catch (e) { setError(String(e)); setRows([]); }
    finally { setLoadingRows(false); }
  }, []);

  const applyFilter = useCallback((f: string, t: string, v: ViewMode) => {
    fetchStats(f, t); fetchRows(f, t, v);
  }, [fetchStats, fetchRows]);

  useEffect(() => { applyFilter(from, to, view); }, []);

  function pickQuick(key: string) {
    const td = today();
    const map: Record<string, [string, string]> = {
      today:      [td, td],
      yesterday:  [addDays(td,-1), addDays(td,-1)],
      this_week:  [addDays(td, -((new Date().getDay()+6)%7)), td],
      last_week:  [addDays(td, -((new Date().getDay()+6)%7)-7), addDays(td, -((new Date().getDay()+6)%7)-1)],
      this_month: [mStart(), mEnd()],
      last_month: [mStart(addDays(mStart(),-1)), mEnd(addDays(mStart(),-1))],
      last_7:     [addDays(td,-6), td],
      last_30:    [addDays(td,-29), td],
    };
    const [f, t] = map[key] || [from, to];
    setFrom(f); setTo(t); setActiveQuick(key);
    applyFilter(f, t, view);
  }

  function changeView(v: ViewMode) {
    setView(v); fetchRows(from, to, v);
  }

  function clearAll() {
    const f = addDays(today(),-6), t = today();
    setFrom(f); setTo(t); setActiveQuick("last_7"); setView("department");
    applyFilter(f, t, "department");
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h]??"")||"").join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `task-${view}-${from}-${to}.csv`; a.click();
  }

  const summary = useMemo(() => {
    if (!rows.length) return null;
    if (view === "department") {
      const d = rows as DeptRow[];
      return { depts: d.length, emps: d.reduce((s,r)=>s+(r.total_employees||0),0), tasks: d.reduce((s,r)=>s+(r.total_tasks||0),0) };
    }
    if (view === "employee") {
      const d = rows as EmpRow[];
      return { depts: new Set(d.map(r=>r.department)).size, emps: d.length, tasks: d.reduce((s,r)=>s+(r.total_tasks||0),0) };
    }
    if (view === "idle-dept") {
      const d = rows as IdleDeptRow[];
      return { depts: d.length, emps: d.reduce((s,r)=>s+(r.employees_without_tasks||0),0), tasks: 0 };
    }
    const d = rows as IdleEmpRow[];
    return { depts: new Set(d.map(r=>r.department)).size, emps: d.length, tasks: 0 };
  }, [rows, view]);

  const eff = stats?.overall_efficiency_rate ?? stats?.efficiency_rate ?? 0;

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-screen bg-background text-foreground overflow-auto">

        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
              <ListChecks className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black tracking-tight text-foreground">Task Summary</h1>
              <p className="text-[11px] text-muted-foreground">Employee task performance & productivity</p>
            </div>
          </div>
          <button onClick={() => applyFilter(from, to, view)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-all">
            <RefreshCw className={cn("w-3.5 h-3.5", (loadingStats||loadingRows) && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-5 space-y-4">

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard
                label="Completion Rate"
                value={loadingStats ? "…" : `${stats?.completion_rate ?? 0}%`}
                icon={CheckCircle2}
                gradient="from-green-500 to-emerald-600"
              />
              <KpiCard
                label="Employees Active"
                value={loadingStats ? "…" : (stats?.total_employees ?? 0)}
                icon={Users}
                gradient="from-blue-500 to-indigo-600"
              />
              <KpiCard
                label="Pending Tasks"
                value={loadingStats ? "…" : (stats?.total_pending ?? 0)}
                icon={Clock}
                gradient="from-amber-500 to-orange-600"
                chips={[
                  { label: "Completed", val: stats?.total_completed ?? 0 },
                  { label: "Total", val: stats?.total_tasks ?? 0 },
                ]}
              />
              <KpiCard
                label="Efficiency Rate"
                value={loadingStats ? "…" : `${eff}%`}
                icon={TrendingUp}
                gradient="from-violet-500 to-purple-600"
              />
            </div>

            {/* ── Filter Card ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">

              {/* Top strip: date + quick filters */}
              <div className="flex flex-wrap items-end gap-4 px-5 pt-4 pb-3 border-b border-border/60">

                {/* Date range */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <CalendarDays className="w-3 h-3" /> Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={from} onChange={e => { setFrom(e.target.value); setActiveQuick(""); }}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground tabular-nums focus:outline-none focus:border-primary/60 transition-colors" />
                    <span className="text-muted-foreground text-xs">→</span>
                    <input type="date" value={to} onChange={e => { setTo(e.target.value); setActiveQuick(""); }}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground tabular-nums focus:outline-none focus:border-primary/60 transition-colors" />
                    <button onClick={() => applyFilter(from, to, view)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity">
                      <Zap className="w-3 h-3" /> Apply
                    </button>
                  </div>
                </div>

                {/* Quick filters */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick</label>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_FILTERS.map(q => (
                      <button key={q.key} onClick={() => pickQuick(q.key)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                          activeQuick === q.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom strip: view tabs + actions */}
              <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">View</span>

                {/* Segmented control */}
                <div className="flex rounded-xl border border-border bg-muted/40 p-0.5 gap-0.5">
                  {VIEW_TABS.map(tab => (
                    <button key={tab.key} onClick={() => changeView(tab.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                        view === tab.key
                          ? "bg-card text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}>
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <button onClick={clearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/5 text-[11px] font-semibold transition-all">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
                <button onClick={exportCSV} disabled={!rows.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-green-400 hover:border-green-400/40 hover:bg-green-400/5 text-[11px] font-semibold transition-all disabled:opacity-40">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* ── Results Panel ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">

              {/* Results header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">{VIEW_LABELS[view]}</h2>
                </div>
                {summary && (
                  <div className="flex items-center gap-3">
                    {[
                      { icon: Building2, val: summary.depts, label: "Depts" },
                      { icon: Users,     val: summary.emps,  label: "Emps" },
                      { icon: ListChecks,val: summary.tasks, label: "Tasks" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted border border-border">
                        <s.icon className="w-3 h-3 text-primary" />
                        <span className="text-[11px] font-bold text-foreground">{s.val}</span>
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Table area */}
              {loadingRows ? (
                <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                  <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                  <span className="text-sm">Loading data…</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center py-14 gap-3 text-destructive">
                  <AlertTriangle className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                  <button onClick={() => applyFilter(from, to, view)}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg">Retry</button>
                </div>
              ) : view === "department" ? (
                <DeptTable rows={rows as DeptRow[]} />
              ) : view === "employee" ? (
                <EmpTable rows={rows as EmpRow[]} />
              ) : view === "idle-dept" ? (
                <IdleDeptTable rows={rows as IdleDeptRow[]} />
              ) : (
                <IdleEmpTable rows={rows as IdleEmpRow[]} />
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Department Table
// ─────────────────────────────────────────────────────────────────────────────
function DeptTable({ rows }: { rows: DeptRow[] }) {
  const cols = [
    { label: "Department" }, { label: "Employees", center: true },
    { label: "Tasks", center: true }, { label: "Completion", center: true },
    { label: "Pending", center: true }, { label: "Completed", center: true },
    { label: "Efficiency", center: true }, { label: "Status" }, { label: "Rank", center: true },
  ];
  return (
    <DataTable cols={cols} empty={!rows.length}>
      {rows.map((row, i) => {
        const pend = (row.pending||0) + (row.partially_pending||0);
        return (
          <TR key={row.department} i={i}>
            <TD>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="font-semibold text-foreground text-[12px]">{row.department}</span>
              </div>
            </TD>
            <TD center nowrap>
              <span className="font-bold text-foreground">{row.total_employees}</span>
            </TD>
            <TD center>
              <span className="font-bold text-foreground">{row.total_tasks}</span>
            </TD>
            <TD center>
              <RadialProgress rate={row.completion_rate} sub={`${row.completed}/${row.total_tasks}`} />
            </TD>
            <TD center>
              <span className={cn("font-bold text-sm", pend > 0 ? "text-amber-400" : "text-muted-foreground")}>{pend}</span>
            </TD>
            <TD center>
              <span className="font-bold text-sm text-green-400">{row.completed}</span>
            </TD>
            <TD center>
              <RadialProgress rate={row.efficiency_rate} sub={`${row.total_tasks}/${row.total_present_days}d`} />
            </TD>
            <TD>
              <StatusBadge rate={row.completion_rate} />
            </TD>
            <TD center>
              {row.rank ? <RankBadge rank={row.rank} /> : <span className="text-muted-foreground">—</span>}
            </TD>
          </TR>
        );
      })}
    </DataTable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee Table
// ─────────────────────────────────────────────────────────────────────────────
function EmpTable({ rows }: { rows: EmpRow[] }) {
  const cols = [
    { label: "Employee" }, { label: "Department" }, { label: "Designation" },
    { label: "Days", center: true }, { label: "Tasks", center: true },
    { label: "Completion" }, { label: "Efficiency" },
    { label: "Status" }, { label: "Rank", center: true },
  ];
  return (
    <DataTable cols={cols} empty={!rows.length}>
      {rows.map((row, i) => (
        <TR key={row.employee} i={i}>
          <TD nowrap>
            <div className="flex items-center gap-2.5">
              <Avatar name={row.employee_name} rate={row.completion_rate} />
              <div>
                <div className="font-semibold text-foreground text-[12px] leading-tight">{row.employee_name}</div>
                <div className="text-[10px] text-muted-foreground">{row.employee}</div>
              </div>
            </div>
          </TD>
          <TD><span className="text-muted-foreground text-[11px]">{row.department}</span></TD>
          <TD><span className="text-muted-foreground text-[11px]">{row.designation || "—"}</span></TD>
          <TD center><span className="font-bold text-foreground">{row.present_days}</span></TD>
          <TD center>
            <div className="flex items-center justify-center gap-0.5">
              <span className="font-bold text-green-400">{row.completed}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-bold text-foreground">{row.total_tasks}</span>
            </div>
          </TD>
          <TD><BarProgress rate={row.completion_rate} /></TD>
          <TD><BarProgress rate={row.efficiency_rate} /></TD>
          <TD><StatusBadge rate={row.completion_rate} /></TD>
          <TD center><RankBadge rank={row.rank} /></TD>
        </TR>
      ))}
    </DataTable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Idle Department Table
// ─────────────────────────────────────────────────────────────────────────────
function IdleDeptTable({ rows }: { rows: IdleDeptRow[] }) {
  const cols = [
    { label: "Department" }, { label: "Total Emps", center: true },
    { label: "Idle Emps", center: true }, { label: "Idle %" },
    { label: "Present Days", center: true }, { label: "Idle Rate", center: true }, { label: "Status" },
  ];
  if (!rows.length) return (
    <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
      <Award className="w-10 h-10 opacity-20" />
      <p className="text-sm">No departments with idle employees — great job!</p>
    </div>
  );
  return (
    <DataTable cols={cols}>
      {rows.map((row, i) => {
        const pct = row.percentage_without_tasks || 0;
        const { txt, cls } = idleBadge(pct);
        const barClr = pct > 30 ? "#ef4444" : pct > 10 ? "#f59e0b" : "#22c55e";
        return (
          <TR key={row.department} i={i}>
            <TD>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="font-semibold text-foreground text-[12px]">{row.department}</span>
              </div>
            </TD>
            <TD center><span className="font-bold text-foreground">{row.total_present_employees}</span></TD>
            <TD center><span className="font-bold text-red-400">{row.employees_without_tasks}</span></TD>
            <TD>
              <div className="flex items-center gap-2 min-w-[90px]">
                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct,100)}%`, backgroundColor: barClr }} />
                </div>
                <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: barClr }}>{pct}%</span>
              </div>
            </TD>
            <TD center><span className="font-bold text-foreground">{row.total_present_days}</span></TD>
            <TD center>
              <RadialProgress rate={row.idle_rate} />
            </TD>
            <TD>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold", cls)}>{txt}</span>
            </TD>
          </TR>
        );
      })}
    </DataTable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Idle Employee Table
// ─────────────────────────────────────────────────────────────────────────────
function IdleEmpTable({ rows }: { rows: IdleEmpRow[] }) {
  const cols = [
    { label: "Employee" }, { label: "Department" }, { label: "Designation" },
    { label: "Present Days", center: true }, { label: "Tasks", center: true }, { label: "Status" },
  ];
  if (!rows.length) return (
    <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
      <Award className="w-10 h-10 opacity-20" />
      <p className="text-sm">No idle employees found — everyone is active!</p>
    </div>
  );
  return (
    <DataTable cols={cols}>
      {rows.map((row, i) => (
        <TR key={`${row.employee}-${i}`} i={i}>
          <TD nowrap>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400 shrink-0">
                {initials(row.employee_name)}
              </div>
              <div>
                <div className="font-semibold text-foreground text-[12px] leading-tight">{row.employee_name}</div>
                <div className="text-[10px] text-muted-foreground">{row.employee}</div>
              </div>
            </div>
          </TD>
          <TD><span className="text-muted-foreground text-[11px]">{row.department}</span></TD>
          <TD><span className="text-muted-foreground text-[11px]">{row.designation || "—"}</span></TD>
          <TD center><span className="font-bold text-foreground">{row.present_days}</span></TD>
          <TD center><span className="font-bold text-red-400">{row.task_count}</span></TD>
          <TD>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-red-500/15 text-red-400 border-red-500/25">
              <UserX className="w-3 h-3" /> {row.status || "No Tasks"}
            </span>
          </TD>
        </TR>
      ))}
    </DataTable>
  );
}
