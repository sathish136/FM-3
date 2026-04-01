import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, Users, CheckCircle2, Clock, TrendingUp, AlertTriangle,
  UserX, RefreshCw, Download, X, ChevronDown, Filter, Zap,
  Award, Activity, BarChart3,
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
  department: string;
  total_employees: number;
  total_present_days: number;
  total_tasks: number;
  pending: number;
  partially_pending: number;
  completed: number;
  completion_rate: number;
  efficiency_rate: number;
  rank: number | null;
  is_total?: boolean;
}

interface EmpRow {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  present_days: number;
  total_tasks: number;
  pending: number;
  partially_pending: number;
  completed: number;
  completion_rate: number;
  efficiency_rate: number;
  rank: number;
}

interface IdleDeptRow {
  department: string;
  total_present_employees: number;
  total_present_days: number;
  employees_without_tasks: number;
  percentage_without_tasks: number;
  idle_rate: number;
}

interface IdleEmpRow {
  employee: string;
  employee_name: string;
  department: string;
  designation: string;
  present_days: number;
  task_count: number;
  status: string;
  last_active?: string;
  rank: number;
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getToday() { return fmtDate(new Date()); }
function addDays(date: string, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return fmtDate(d);
}
function monthStart(date?: string) {
  const d = date ? new Date(date) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function monthEnd(date?: string) {
  const d = date ? new Date(date) : new Date();
  return fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function rateColor(rate: number) {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#f59e0b";
  return "#ef4444";
}

function rateLabel(rate: number) {
  if (rate >= 80) return { label: "Excellent", cls: "bg-green-500/15 text-green-400 border-green-500/30" };
  if (rate >= 50) return { label: "Good", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "Needs Work", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
}

function initials(name: string) {
  return (name || "?").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function CircleProgress({ rate, size = 44 }: { rate: number; size?: number }) {
  const color = rateColor(rate);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-muted/40" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <span className="text-[10px] font-bold" style={{ color, marginTop: -size + 6 + size / 2 - 7, position: "relative" }}>
      </span>
      <div className="absolute" style={{ marginTop: -(size / 2) - 7 }}>
      </div>
    </div>
  );
}

function RadialCell({ rate, sub }: { rate: number; sub: string }) {
  const color = rateColor(rate);
  const size = 48;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(rate / 100, 1) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-muted/30" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-black" style={{ color }}>{rate}%</span>
        </div>
      </div>
      <span className="text-[9px] text-muted-foreground whitespace-nowrap">{sub}</span>
    </div>
  );
}

function BarCell({ rate }: { rate: number }) {
  const color = rateColor(rate);
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{rate}%</span>
    </div>
  );
}

function StatusBadge({ rate }: { rate: number }) {
  const { label, cls } = rateLabel(rate);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold", cls)}>
      {label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = { 1: "bg-amber-400 text-amber-900", 2: "bg-zinc-300 text-zinc-800", 3: "bg-orange-400 text-orange-900" };
  const cls = colors[rank] ?? "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black", cls)}>#{rank}</span>;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="relative flex items-center gap-4 rounded-2xl p-4 border border-border bg-card overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.05] pointer-events-none`} />
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color} shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Empty / Loading ──────────────────────────────────────────────────────────
function EmptyState({ msg }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <BarChart3 className="w-12 h-12 opacity-20" />
      <p className="text-sm">{msg || "No data found for the selected period"}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm">Loading data…</span>
    </div>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────
function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[700px]">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="sticky top-0 z-10 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/60 border-b border-border whitespace-nowrap first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <EmptyState />}
    </div>
  );
}

function TR({ children, idx }: { children: React.ReactNode; idx: number }) {
  return (
    <tr className={cn("border-b border-border/60 transition-colors hover:bg-muted/30", idx % 2 === 1 && "bg-muted/10")}>
      {children}
    </tr>
  );
}

function TD({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td className={cn("px-4 py-3 align-middle", center && "text-center")}>{children}</td>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaskSummary() {
  const today = getToday();
  const [fromDate, setFromDate] = useState(addDays(today, -6));
  const [toDate, setToDate] = useState(today);
  const [view, setView] = useState<ViewMode>("department");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (from: string, to: string) => {
    setStatsLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/task-summary/stats?from_date=${from}&to_date=${to}`);
      if (r.ok) setStats(await r.json());
    } catch { /* silent */ } finally { setStatsLoading(false); }
  }, []);

  const loadData = useCallback(async (from: string, to: string, v: ViewMode) => {
    setLoading(true); setError(null);
    const endpoints: Record<ViewMode, string> = {
      department: "departments",
      employee: "employees",
      "idle-dept": "idle-departments",
      "idle-emp": "idle-employees",
    };
    try {
      const r = await fetch(`${BASE}/api/hrms/task-summary/${endpoints[v]}?from_date=${from}&to_date=${to}`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const json = await r.json();
      setData(Array.isArray(json) ? json.filter((row: any) => !row.is_total) : []);
    } catch (e) {
      setError(String(e)); setData([]);
    } finally { setLoading(false); }
  }, []);

  const apply = useCallback((from: string, to: string, v: ViewMode) => {
    loadStats(from, to);
    loadData(from, to, v);
  }, [loadStats, loadData]);

  useEffect(() => { apply(fromDate, toDate, view); }, []);

  const quickFilter = (key: string) => {
    const t = getToday();
    const ranges: Record<string, [string, string]> = {
      today: [t, t],
      yesterday: [addDays(t, -1), addDays(t, -1)],
      this_week: [addDays(t, -((new Date().getDay() + 6) % 7)), t],
      last_week: [addDays(t, -((new Date().getDay() + 6) % 7) - 7), addDays(t, -((new Date().getDay() + 6) % 7) - 1)],
      this_month: [monthStart(), monthEnd()],
      last_month: [monthStart(addDays(monthStart(), -1)), monthEnd(addDays(monthStart(), -1))],
      last_7: [addDays(t, -6), t],
      last_30: [addDays(t, -29), t],
    };
    const [from, to] = ranges[key] || [fromDate, toDate];
    setFromDate(from); setToDate(to);
    apply(from, to, view);
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    loadData(fromDate, toDate, v);
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = [headers.join(","), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `task-summary-${view}-${fromDate}-${toDate}.csv`; a.click();
  };

  const viewTabs: { key: ViewMode; label: string; icon: any; color: string }[] = [
    { key: "department", label: "Department",  icon: Building2,    color: "text-blue-400" },
    { key: "employee",   label: "Employee",    icon: Users,        color: "text-indigo-400" },
    { key: "idle-dept",  label: "Idle Depts",  icon: AlertTriangle, color: "text-amber-400" },
    { key: "idle-emp",   label: "Idle Emps",   icon: UserX,        color: "text-red-400" },
  ];

  const quickBtns = [
    { key: "today",      label: "Today" },
    { key: "yesterday",  label: "Yesterday" },
    { key: "this_week",  label: "This Week" },
    { key: "last_week",  label: "Last Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "last_7",     label: "Last 7 Days" },
    { key: "last_30",    label: "Last 30 Days" },
  ];

  const viewTitle: Record<ViewMode, string> = {
    department: "Department Performance",
    employee: "Employee Performance",
    "idle-dept": "Departments with Idle Employees",
    "idle-emp": "Employees with No Tasks",
  };

  const summary = useMemo(() => {
    if (!data.length) return null;
    if (view === "department") {
      const depts = data.length;
      const emps = data.reduce((s, r: DeptRow) => s + (r.total_employees || 0), 0);
      const tasks = data.reduce((s, r: DeptRow) => s + (r.total_tasks || 0), 0);
      return [
        { icon: Building2, val: depts, label: "Departments" },
        { icon: Users, val: emps, label: "Employees" },
        { icon: Activity, val: tasks, label: "Tasks" },
      ];
    }
    if (view === "employee") {
      const depts = new Set(data.map((r: EmpRow) => r.department)).size;
      const tasks = data.reduce((s, r: EmpRow) => s + (r.total_tasks || 0), 0);
      return [
        { icon: Building2, val: depts, label: "Departments" },
        { icon: Users, val: data.length, label: "Employees" },
        { icon: Activity, val: tasks, label: "Tasks" },
      ];
    }
    if (view === "idle-dept") {
      const idle = data.reduce((s, r: IdleDeptRow) => s + (r.employees_without_tasks || 0), 0);
      return [
        { icon: Building2, val: data.length, label: "Departments" },
        { icon: UserX, val: idle, label: "Idle Employees" },
        { icon: Activity, val: 0, label: "Tasks" },
      ];
    }
    const depts = new Set(data.map((r: IdleEmpRow) => r.department)).size;
    return [
      { icon: Building2, val: depts, label: "Departments" },
      { icon: UserX, val: data.length, label: "Idle Employees" },
      { icon: Activity, val: 0, label: "Tasks" },
    ];
  }, [data, view]);

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-screen bg-background text-foreground overflow-auto">

        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground">Task Summary Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Employee task performance & productivity analytics</p>
          </div>
          <button onClick={() => apply(fromDate, toDate, view)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all text-xs font-semibold">
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || statsLoading) && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-auto">

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Completion Rate"
              value={statsLoading ? "…" : `${stats?.completion_rate ?? 0}%`}
              icon={CheckCircle2}
              color="from-green-500 to-emerald-500"
            />
            <StatCard
              label="Employees"
              value={statsLoading ? "…" : (stats?.total_employees ?? 0)}
              icon={Users}
              color="from-blue-500 to-indigo-500"
            />
            <StatCard
              label="Pending Tasks"
              value={statsLoading ? "…" : (stats?.total_pending ?? 0)}
              icon={Clock}
              color="from-amber-500 to-orange-500"
            />
            <StatCard
              label="Efficiency"
              value={statsLoading ? "…" : `${stats?.overall_efficiency_rate ?? stats?.efficiency_rate ?? 0}%`}
              icon={TrendingUp}
              color="from-violet-500 to-purple-500"
            />
          </div>

          {/* ── Filter Panel ── */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">

            {/* Date Range */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5"><Filter className="w-3 h-3" /> Date Range</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 tabular-nums" />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 tabular-nums" />
                  <button onClick={() => apply(fromDate, toDate, view)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Apply
                  </button>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Quick Filters</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickBtns.map(b => (
                    <button key={b.key} onClick={() => quickFilter(b.key)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground text-[11px] font-semibold transition-colors">
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Tabs + Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">View</p>
              {viewTabs.map(t => (
                <button key={t.key} onClick={() => changeView(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
                    view === t.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => { setFromDate(addDays(today, -6)); setToDate(today); setView("department"); apply(addDays(today, -6), today, "department"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-rose-500/10 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/20 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-green-500/10 text-green-400 text-[11px] font-semibold hover:bg-green-500/20 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">

            {/* Results Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">{viewTitle[view]}</h2>
              {summary && (
                <div className="flex items-center gap-4">
                  {summary.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <s.icon className="w-3.5 h-3.5 text-primary" />
                      <span className="font-bold text-foreground">{s.val}</span> {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-1">
              {loading ? <Spinner /> : error ? (
                <div className="flex flex-col items-center py-16 gap-3 text-destructive">
                  <AlertTriangle className="w-8 h-8" />
                  <p className="text-sm">{error}</p>
                  <button onClick={() => apply(fromDate, toDate, view)}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg">Retry</button>
                </div>
              ) : view === "department" ? (
                <DeptTable data={data as DeptRow[]} />
              ) : view === "employee" ? (
                <EmpTable data={data as EmpRow[]} />
              ) : view === "idle-dept" ? (
                <IdleDeptTable data={data as IdleDeptRow[]} />
              ) : (
                <IdleEmpTable data={data as IdleEmpRow[]} />
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

// ── Department Table ──────────────────────────────────────────────────────────
function DeptTable({ data }: { data: DeptRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <Table headers={["Department", "Employees", "Tasks", "Completion", "Pending", "Completed", "Efficiency", "Status", "Rank"]}>
      {data.map((row, i) => {
        const pending = (row.pending || 0) + (row.partially_pending || 0);
        return (
          <TR key={row.department} idx={i}>
            <TD>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="font-semibold text-foreground">{row.department}</span>
              </div>
            </TD>
            <TD center><span className="font-bold text-foreground">{row.total_employees}</span></TD>
            <TD center><span className="font-bold text-foreground">{row.total_tasks}</span></TD>
            <TD>
              <RadialCell rate={row.completion_rate} sub={`${row.completed}/${row.total_tasks}`} />
            </TD>
            <TD center>
              <span className={cn("font-bold", pending > 0 ? "text-amber-400" : "text-muted-foreground")}>{pending}</span>
            </TD>
            <TD center>
              <span className="font-bold text-green-400">{row.completed}</span>
            </TD>
            <TD>
              <RadialCell rate={row.efficiency_rate} sub={`${row.total_tasks}/${row.total_present_days}d`} />
            </TD>
            <TD><StatusBadge rate={row.completion_rate} /></TD>
            <TD center>{row.rank ? <RankBadge rank={row.rank} /> : "—"}</TD>
          </TR>
        );
      })}
    </Table>
  );
}

// ── Employee Table ────────────────────────────────────────────────────────────
function EmpTable({ data }: { data: EmpRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <Table headers={["Employee", "Department", "Designation", "Days", "Tasks", "Completion", "Efficiency", "Status", "Rank"]}>
      {data.map((row, i) => (
        <TR key={row.employee} idx={i}>
          <TD>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${rateColor(row.completion_rate)}, ${rateColor(row.completion_rate)}88)` }}>
                {initials(row.employee_name)}
              </div>
              <div>
                <div className="font-semibold text-foreground leading-tight">{row.employee_name}</div>
                <div className="text-[10px] text-muted-foreground">{row.employee}</div>
              </div>
            </div>
          </TD>
          <TD><span className="text-muted-foreground">{row.department}</span></TD>
          <TD><span className="text-muted-foreground">{row.designation || "—"}</span></TD>
          <TD center><span className="font-bold text-foreground">{row.present_days}</span></TD>
          <TD center>
            <span className="font-bold text-foreground">{row.completed}</span>
            <span className="text-muted-foreground">/{row.total_tasks}</span>
          </TD>
          <TD><BarCell rate={row.completion_rate} /></TD>
          <TD><BarCell rate={row.efficiency_rate} /></TD>
          <TD><StatusBadge rate={row.completion_rate} /></TD>
          <TD center><RankBadge rank={row.rank} /></TD>
        </TR>
      ))}
    </Table>
  );
}

// ── Idle Department Table ─────────────────────────────────────────────────────
function IdleDeptTable({ data }: { data: IdleDeptRow[] }) {
  if (!data.length) return <EmptyState msg="No departments with idle employees found" />;
  return (
    <Table headers={["Department", "Total Employees", "Idle Employees", "Idle %", "Present Days", "Idle Rate", "Status"]}>
      {data.map((row, i) => {
        const idlePct = row.percentage_without_tasks || 0;
        return (
          <TR key={row.department} idx={i}>
            <TD>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="font-semibold text-foreground">{row.department}</span>
              </div>
            </TD>
            <TD center><span className="font-bold text-foreground">{row.total_present_employees}</span></TD>
            <TD center><span className="font-bold text-red-400">{row.employees_without_tasks}</span></TD>
            <TD><BarCell rate={idlePct} /></TD>
            <TD center><span className="font-bold text-foreground">{row.total_present_days}</span></TD>
            <TD>
              <RadialCell rate={row.idle_rate} sub="idle rate" />
            </TD>
            <TD>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                idlePct > 30 ? "bg-red-500/15 text-red-400 border-red-500/30" :
                idlePct > 10 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                "bg-green-500/15 text-green-400 border-green-500/30"
              )}>
                {idlePct > 30 ? "High Idle" : idlePct > 10 ? "Medium Idle" : "Low Idle"}
              </span>
            </TD>
          </TR>
        );
      })}
    </Table>
  );
}

// ── Idle Employee Table ───────────────────────────────────────────────────────
function IdleEmpTable({ data }: { data: IdleEmpRow[] }) {
  if (!data.length) return <EmptyState msg="No idle employees found" />;
  return (
    <Table headers={["Employee", "Department", "Designation", "Present Days", "Tasks", "Status"]}>
      {data.map((row, i) => (
        <TR key={row.employee} idx={i}>
          <TD>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-[11px] font-black text-red-400 shrink-0">
                {initials(row.employee_name)}
              </div>
              <div>
                <div className="font-semibold text-foreground leading-tight">{row.employee_name}</div>
                <div className="text-[10px] text-muted-foreground">{row.employee}</div>
              </div>
            </div>
          </TD>
          <TD><span className="text-muted-foreground">{row.department}</span></TD>
          <TD><span className="text-muted-foreground">{row.designation || "—"}</span></TD>
          <TD center><span className="font-bold text-foreground">{row.present_days}</span></TD>
          <TD center><span className="font-bold text-red-400">{row.task_count}</span></TD>
          <TD>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-red-500/15 text-red-400 border-red-500/30">
              <UserX className="w-3 h-3" /> {row.status || "No Tasks"}
            </span>
          </TD>
        </TR>
      ))}
    </Table>
  );
}
