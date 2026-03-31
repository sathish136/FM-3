import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Briefcase, Mic, Phone, AlertCircle, AlertTriangle,
  TrendingUp, UserPlus, UserMinus, ChevronLeft, ChevronRight,
  X, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEPT_COLORS = [
  "#6366f1","#3b82f6","#0ea5e9","#14b8a6","#10b981",
  "#84cc16","#f59e0b","#f97316","#ef4444","#ec4899","#8b5cf6","#a78bfa",
];

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface AnalyticsData {
  employees: {
    total: number; active: number; absentToday: number; absentYesterday: number; presentToday: number;
    joiners: { year: number; month: number }; attrition: { year: number; month: number };
    deptHeadcount: { dept: string; count: number }[];
  };
  recruitment: {
    openings: number; shortlisted: number; hired: number; processing: number; rejected: number; notInterested: number;
    interviews: { year: number; month: number; today: number; yesterday: number };
    followups: { year: number; month: number; today: number; yesterday: number };
  };
  attendance: {
    absentToday: { name: string; employee: string; department: string; date: string }[];
    absentYesterday: { name: string; employee: string; department: string; date: string }[];
    absentMonth: { name: string; employee: string; department: string; date: string }[];
  };
  grievances: {
    year: number; month: number; prevMonth: number;
    list: { name: string; dept: string; date: string; type: string; status: string }[];
  };
  incidents: { year: number; month: number; prevMonth: number; total: number };
  monthlyTrend: { month: string; joiners: number; attrition: number; interviews: number; followups: number }[];
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, chips, split, onClick,
}: {
  label: string; value?: string | number; icon: any; color: string;
  chips?: { label: string; val: string | number }[];
  split?: { left: { label: string; val: string | number; color: string }; right: { label: string; val: string | number; color: string } };
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl p-4 border border-border bg-card overflow-hidden transition-all duration-200",
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""
      )}
    >
      <div className={`absolute inset-0 opacity-[0.04] bg-gradient-to-br ${color} pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} opacity-80`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      {value !== undefined && (
        <div className="relative text-3xl font-black text-foreground tracking-tight">{value}</div>
      )}
      {split && (
        <div className="relative flex items-center gap-3">
          <div className="flex-1 text-center">
            <div className="text-[10px] text-muted-foreground font-semibold">{split.left.label}</div>
            <div className={`text-2xl font-black ${split.left.color}`}>{split.left.val}</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex-1 text-center">
            <div className="text-[10px] text-muted-foreground font-semibold">{split.right.label}</div>
            <div className={`text-2xl font-black ${split.right.color}`}>{split.right.val}</div>
          </div>
        </div>
      )}
      {chips && chips.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5">
          {chips.map(c => (
            <div key={c.label} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border border-border">
              <span className="text-[10px] text-muted-foreground">{c.label}</span>
              <span className="text-[11px] font-bold text-foreground">{c.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Drawer ───────────────────────────────────────────────────────────
function Drawer({ open, onClose, title, badge, children }: {
  open: boolean; onClose: () => void; title: string; badge?: number | string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0 bg-card">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{title}</span>
            {badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{badge}</span>
            )}
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-background">{children}</div>
      </div>
    </div>
  );
}

// ── Small chart card ────────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs font-semibold text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}

// ── Analytics Table ─────────────────────────────────────────────────────────
function AnalyticsTable({ columns, rows, emptyMsg = "No data" }: {
  columns: string[]; rows: (string | number | React.ReactNode)[][]; emptyMsg?: string;
}) {
  const [filters, setFilters] = useState<string[]>(columns.map(() => ""));
  const filtered = useMemo(() => {
    return rows.filter(row =>
      filters.every((f, i) => !f || String(row[i] ?? "").toLowerCase().includes(f.toLowerCase()))
    );
  }, [rows, filters]);

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map(c => (
              <th key={c} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-card border-b border-border whitespace-nowrap">{c}</th>
            ))}
          </tr>
          <tr className="bg-card">
            {columns.map((_, i) => (
              <td key={i} className="px-2 py-1.5 border-b border-border">
                <input
                  placeholder="Filter…"
                  value={filters[i]}
                  onChange={e => setFilters(f => f.map((v, j) => j === i ? e.target.value : v))}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground text-xs">{emptyMsg}</td></tr>
          ) : filtered.map((row, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-muted/50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 text-foreground whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
type AbsentTab = "today" | "yesterday" | "month";
type DrawerView = "headcount" | "absent" | "interviews" | "followups" | "grievance" | "incident" | null;

export default function HrAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [absentTab, setAbsentTab] = useState<AbsentTab>("today");
  const [absentStatusFilter, setAbsentStatusFilter] = useState<"all" | "approved" | "unapproved" | "uninformed">("all");
  const [drawerView, setDrawerView] = useState<DrawerView>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BASE}/api/hrms/analytics`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const calDays = useMemo(() => {
    const firstDay = new Date(calMonth.y, calMonth.m, 1).getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    return { offset, daysInMonth };
  }, [calMonth]);

  const today = new Date();

  // Calendar events derived from absent list
  const calEvents = useMemo((): Record<number, { absent?: number; interview?: number; followup?: number }> => {
    const ev: Record<number, { absent?: number; interview?: number; followup?: number }> = {};
    if (!data) return ev;
    data.attendance.absentMonth.forEach(a => {
      const d = new Date(a.date);
      if (d.getFullYear() === calMonth.y && d.getMonth() === calMonth.m) {
        const day = d.getDate();
        ev[day] = { ...ev[day], absent: (ev[day]?.absent ?? 0) + 1 };
      }
    });
    return ev;
  }, [data, calMonth]);

  const absentList = useMemo(() => {
    if (!data) return [];
    const map: Record<AbsentTab, typeof data.attendance.absentToday> = {
      today: data.attendance.absentToday,
      yesterday: data.attendance.absentYesterday,
      month: data.attendance.absentMonth,
    };
    return map[absentTab] ?? [];
  }, [data, absentTab]);

  // Skeleton / error
  if (loading && !data) {
    return (
      <Layout>
        <div className="flex flex-col h-full min-h-screen bg-background text-foreground overflow-auto">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h1 className="text-lg font-black text-foreground tracking-tight">HR Analytics</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Loading data from ERPNext…</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">Fetching HR data…</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col h-full min-h-screen bg-background text-foreground overflow-auto">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
            <h1 className="text-lg font-black text-foreground tracking-tight">HR Analytics</h1>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-destructive">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm">{error}</span>
              <button onClick={load} className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg">Retry</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const d = data!;

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-screen bg-background text-foreground overflow-auto">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">HR Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Human Resource Department — Live Data</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-auto">

          {/* ── KPI Row ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KpiCard
              label="Total Employees"
              value={d.employees.total}
              icon={Users}
              color="from-indigo-500 to-blue-500"
              chips={[
                { label: "Present", val: d.employees.presentToday },
                { label: "Absent", val: d.employees.absentToday },
              ]}
              onClick={() => setDrawerView("headcount")}
            />
            <KpiCard
              label="Openings"
              value={d.recruitment.openings}
              icon={Briefcase}
              color="from-violet-500 to-purple-500"
            />
            <KpiCard
              label="Interviews"
              icon={Mic}
              color="from-sky-500 to-cyan-500"
              chips={[
                { label: "Year", val: d.recruitment.interviews.year },
                { label: "Month", val: d.recruitment.interviews.month },
                { label: "Today", val: d.recruitment.interviews.today },
                { label: "Yest", val: d.recruitment.interviews.yesterday },
              ]}
              onClick={() => setDrawerView("interviews")}
            />
            <KpiCard
              label="Followups"
              icon={Phone}
              color="from-teal-500 to-emerald-500"
              chips={[
                { label: "Year", val: d.recruitment.followups.year },
                { label: "Month", val: d.recruitment.followups.month },
                { label: "Today", val: d.recruitment.followups.today },
                { label: "Yest", val: d.recruitment.followups.yesterday },
              ]}
              onClick={() => setDrawerView("followups")}
            />
            <KpiCard
              label="Grievance"
              icon={AlertCircle}
              color="from-amber-500 to-orange-500"
              chips={[
                { label: "Year", val: d.grievances.year },
                { label: "Month", val: d.grievances.month },
                { label: "Prev", val: d.grievances.prevMonth },
              ]}
              onClick={() => setDrawerView("grievance")}
            />
            <KpiCard
              label="Incident"
              icon={AlertTriangle}
              color="from-rose-500 to-red-500"
              chips={[
                { label: "Year", val: d.incidents.year },
                { label: "Month", val: d.incidents.month },
                { label: "Prev", val: d.incidents.prevMonth },
              ]}
              onClick={() => setDrawerView("incident")}
            />
            <KpiCard
              label="Headcount Move"
              icon={TrendingUp}
              color="from-green-500 to-lime-500"
              split={{
                left:  { label: "Joiners",    val: d.employees.joiners.year,    color: "text-green-500" },
                right: { label: "Attrition",  val: d.employees.attrition.year,  color: "text-rose-500" },
              }}
            />
          </div>

          {/* ── Main content row ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Calendar */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-foreground">
                  {MONTHS[calMonth.m]} {calMonth.y}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCalMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCalMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
                  <div key={d} className="text-[9px] font-bold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: calDays.offset }, (_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: calDays.daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isToday = calMonth.y === today.getFullYear() && calMonth.m === today.getMonth() && day === today.getDate();
                  const ev = calEvents[day];
                  return (
                    <div key={day}
                      className={cn(
                        "relative flex flex-col items-center py-1 rounded-lg text-[11px] font-semibold transition-colors",
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      )}>
                      {day}
                      {ev && (
                        <div className="flex gap-0.5 mt-0.5">
                          {ev.absent && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                          {ev.interview && <span className="w-1 h-1 rounded-full bg-sky-500" />}
                          {ev.followup && <span className="w-1 h-1 rounded-full bg-teal-500" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Absent</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Interview</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Followup</div>
              </div>
            </div>

            {/* Absent List */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-foreground">Absent List</div>
                <button onClick={() => setDrawerView("absent")}
                  className="text-[10px] text-primary font-semibold hover:underline">View All</button>
              </div>
              <div className="flex gap-1 mb-3 flex-wrap">
                {(["today","yesterday","month"] as AbsentTab[]).map(t => (
                  <button key={t} onClick={() => setAbsentTab(t)}
                    className={cn("px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors border",
                      absentTab === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80")}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto space-y-1.5 min-h-0">
                {absentList.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">No absences</div>
                ) : absentList.slice(0, 8).map((emp, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/60 hover:bg-muted transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{emp.name}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.department}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {fmtDate(emp.date)}
                    </div>
                  </div>
                ))}
                {absentList.length > 8 && (
                  <div className="text-center text-[10px] text-muted-foreground py-1">+{absentList.length - 8} more</div>
                )}
              </div>
            </div>

            {/* Recruitment Status + Mini Chart */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="text-sm font-bold text-foreground mb-3">Recruitment Status</div>
                <div className="space-y-2">
                  {[
                    { label: "Shortlisted", val: d.recruitment.shortlisted, color: "bg-blue-500" },
                    { label: "Hired",        val: d.recruitment.hired,       color: "bg-green-500" },
                    { label: "Processing",   val: d.recruitment.processing,  color: "bg-amber-500" },
                    { label: "Rejected",     val: d.recruitment.rejected,    color: "bg-rose-500" },
                    { label: "Not Interested", val: d.recruitment.notInterested, color: "bg-slate-400" },
                  ].map(item => {
                    const total = d.recruitment.shortlisted + d.recruitment.hired + d.recruitment.processing + d.recruitment.rejected + d.recruitment.notInterested || 1;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="text-[11px] text-muted-foreground w-24 shrink-0">{item.label}</div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${(item.val / total) * 100}%` }} />
                        </div>
                        <div className="text-[11px] font-bold text-foreground w-6 text-right">{item.val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ChartCard title="Joiners vs Attrition (This Year)">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={d.monthlyTrend.filter(m => m.joiners > 0 || m.attrition > 0)} barSize={6}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                    <Bar dataKey="joiners" fill="#22c55e" radius={[2, 2, 0, 0]} name="Joiners" />
                    <Bar dataKey="attrition" fill="#ef4444" radius={[2, 2, 0, 0]} name="Attrition" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </div>

        {/* ── Drawers ───────────────────────────────────────── */}

        {/* Headcount Drawer */}
        <Drawer open={drawerView === "headcount"} onClose={() => setDrawerView(null)} title="Headcount Analysis" badge={d.employees.total}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Employees", val: d.employees.total, color: "text-foreground" },
                { label: "Active", val: d.employees.active, color: "text-green-500" },
                { label: "Absent Today", val: d.employees.absentToday, color: "text-rose-500" },
                { label: "Joiners This Year", val: d.employees.joiners.year, color: "text-blue-500" },
                { label: "Joiners This Month", val: d.employees.joiners.month, color: "text-sky-500" },
                { label: "Attrition This Year", val: d.employees.attrition.year, color: "text-amber-500" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <ChartCard title="Department Headcount">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.employees.deptHeadcount.slice(0, 12)} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 10 }} className="text-muted-foreground" width={80} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Employees">
                    {d.employees.deptHeadcount.slice(0, 12).map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </Drawer>

        {/* Absent Drawer */}
        <Drawer open={drawerView === "absent"} onClose={() => setDrawerView(null)} title="Absent Details" badge={absentList.length}>
          <div className="p-6 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(["today","yesterday","month"] as AbsentTab[]).map(t => (
                <button key={t} onClick={() => setAbsentTab(t)}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors border",
                    absentTab === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80")}>
                  {t}
                </button>
              ))}
            </div>
            <AnalyticsTable
              columns={["Employee", "Department", "Date"]}
              rows={absentList.map(r => [r.name, r.department, fmtDate(r.date)])}
              emptyMsg="No absences found"
            />
          </div>
        </Drawer>

        {/* Interviews Drawer */}
        <Drawer open={drawerView === "interviews"} onClose={() => setDrawerView(null)} title="Interview Analytics" badge={d.recruitment.interviews.year}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "This Year",      val: d.recruitment.interviews.year,      color: "text-foreground" },
                { label: "This Month",     val: d.recruitment.interviews.month,     color: "text-blue-500" },
                { label: "Today",          val: d.recruitment.interviews.today,     color: "text-green-500" },
                { label: "Yesterday",      val: d.recruitment.interviews.yesterday, color: "text-amber-500" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <ChartCard title="Monthly Interview Trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={d.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Line type="monotone" dataKey="interviews" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Interviews" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </Drawer>

        {/* Followups Drawer */}
        <Drawer open={drawerView === "followups"} onClose={() => setDrawerView(null)} title="Followup Analytics" badge={d.recruitment.followups.year}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "This Year",      val: d.recruitment.followups.year,      color: "text-foreground" },
                { label: "This Month",     val: d.recruitment.followups.month,     color: "text-teal-500" },
                { label: "Today",          val: d.recruitment.followups.today,     color: "text-green-500" },
                { label: "Yesterday",      val: d.recruitment.followups.yesterday, color: "text-amber-500" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <ChartCard title="Monthly Followup Trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={d.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Line type="monotone" dataKey="followups" stroke="#14b8a6" strokeWidth={2} dot={false} name="Followups" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </Drawer>

        {/* Grievance Drawer */}
        <Drawer open={drawerView === "grievance"} onClose={() => setDrawerView(null)} title="Grievance Analysis" badge={d.grievances.year}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "This Year",   val: d.grievances.year,      color: "text-foreground" },
                { label: "This Month",  val: d.grievances.month,     color: "text-amber-500" },
                { label: "Prev Month",  val: d.grievances.prevMonth, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <AnalyticsTable
              columns={["Employee", "Department", "Type", "Date", "Status"]}
              rows={d.grievances.list.map(r => [r.name, r.dept, r.type, fmtDate(r.date), r.status])}
              emptyMsg="No grievances found"
            />
          </div>
        </Drawer>

        {/* Incident Drawer */}
        <Drawer open={drawerView === "incident"} onClose={() => setDrawerView(null)} title="Incident Analysis" badge={d.incidents.year}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "This Year",   val: d.incidents.year,      color: "text-foreground" },
                { label: "This Month",  val: d.incidents.month,     color: "text-rose-500" },
                { label: "Prev Month",  val: d.incidents.prevMonth, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Detailed incident list available on the HR Incidents page.</p>
            </div>
          </div>
        </Drawer>

      </div>
    </Layout>
  );
}
