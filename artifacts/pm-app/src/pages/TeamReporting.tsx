import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  ClipboardList, RefreshCw, Calendar, User, Building2, Clock,
  CheckCircle2, X, Loader2, Minus, Shield, ChevronLeft, ChevronRight,
  Eye, Filter, Search, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = BASE + "/api";

const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

type DateMode = "today" | "yesterday" | "week" | "month" | "custom";

type ReportSummary = {
  name: string;
  employee: string;
  employee_name: string;
  department: string;
  date: string;
  status: string;
  modified: string;
  creation: string;
};

type ReportDetail = ReportSummary & { [key: string]: any };

function fmtDate(d: string) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtDateTime(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return d; }
}
function deptShort(dept: string) {
  return (dept || "").replace(/ - WTT$/i, "").replace(/ - wtt$/i, "");
}
function todayISO() { return new Date().toISOString().split("T")[0]; }

function statusBadge(status: string) {
  switch ((status || "").toLowerCase()) {
    case "submitted": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "draft":     return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancelled": return "bg-red-100 text-red-600 border-red-200";
    default:          return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
function statusIcon(status: string) {
  switch ((status || "").toLowerCase()) {
    case "submitted": return <CheckCircle2 className="w-3 h-3" />;
    case "draft":     return <Clock className="w-3 h-3" />;
    case "cancelled": return <X className="w-3 h-3" />;
    default:          return <Minus className="w-3 h-3" />;
  }
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function ReportDetailModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError(""); setReport(null);
    fetch(`${API_BASE}/daily-reporting/${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(d => setReport(d.report))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const SKIP = new Set(["doctype","idx","docstatus","__islocal","__unsaved","owner","__last_sync_on","name","employee","employee_name","department","date","status","modified","modified_by","creation","amended_from"]);
  const childTables = report ? Object.entries(report).filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0) : [];
  const scalarFields = report ? Object.entries(report).filter(([k, v]) => !SKIP.has(k) && !Array.isArray(v) && v !== null && v !== "" && v !== 0) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Daily Report</p>
            <p className="text-sm font-black text-gray-900 leading-tight truncate">{name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {report && (
          <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-b border-gray-50 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-gray-700">{report.employee_name || report.employee}</span>
            </div>
            {report.department && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-gray-500">{deptShort(report.department)}</span>
              </div>
            )}
            {report.date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-gray-500">{fmtDate(report.date)}</span>
              </div>
            )}
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusBadge(report.status))}>
              {statusIcon(report.status)} {report.status}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs text-gray-400">Loading report…</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {report && !loading && (
            <>
              {scalarFields.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {scalarFields.map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
                          {k.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-gray-800 font-medium">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {childTables.map(([key, rows]) => (
                <div key={key}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {key.replace(/_/g, " ")} ({(rows as any[]).length})
                  </p>
                  <div className="space-y-2">
                    {(rows as any[]).map((row, i) => {
                      const rowEntries = Object.entries(row).filter(([k]) => !["name","doctype","idx","docstatus","parent","parentfield","parenttype"].includes(k) && row[k] !== null && row[k] !== "");
                      return (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {rowEntries.map(([k, v]) => (
                              <div key={k} className="flex flex-col">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{k.replace(/_/g, " ")}</span>
                                <span className="text-xs text-gray-700 font-medium">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-gray-400 pt-2">
                Last modified: {fmtDateTime(report.modified)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Card ────────────────────────────────────────────────────────────────
function StatsCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border px-4 py-3 min-w-[80px]", color)}>
      <span className="text-2xl font-black leading-none">{value}</span>
      <span className="text-[10px] font-semibold opacity-70 mt-0.5">{label}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamReporting() {
  const { user } = useAuth();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const [hodDept, setHodDept] = useState<string | null>(null);
  const [hasModuleAccess, setHasModuleAccess] = useState(false);
  const [permLoading, setPermLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());
  const LIMIT = 50;

  const today = todayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // Load permissions
  useEffect(() => {
    if (!user?.email) return;
    if (isAdmin) { setPermLoading(false); return; }
    fetch(`${API_BASE}/user-permissions/${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setHodDept(data.hodDept ?? null);
        try {
          const roles: Record<string, string> = data.moduleRoles ? JSON.parse(data.moduleRoles) : {};
          setHasModuleAccess(roles["team-reporting"] === "read" || roles["team-reporting"] === "write");
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [user?.email, isAdmin]);

  // Sync date range with mode
  useEffect(() => {
    if (dateMode === "today")     { setFromDate(today); setToDate(today); }
    else if (dateMode === "yesterday") { setFromDate(yesterday); setToDate(yesterday); }
    else if (dateMode === "week")  { setFromDate(weekAgo); setToDate(today); }
    else if (dateMode === "month") { setFromDate(monthAgo); setToDate(today); }
  }, [dateMode]);

  const canAccess = isAdmin || (hodDept != null && hodDept !== "") || hasModuleAccess;

  const load = useCallback(async (p = 0) => {
    if (!canAccess) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        limit: String(LIMIT),
        page: String(p),
      });
      if (statusFilter) params.set("status", statusFilter);
      // If HOD, filter by their department
      if (!isAdmin && hodDept && hodDept !== "") {
        params.set("department", hodDept);
      }
      const r = await fetch(`${API_BASE}/daily-reporting?${params}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      const data = await r.json();
      setHasMore(!!data.hasMore);
      setTotal(data.total ?? 0);
      setReports(data.reports || []);
      setPage(p);
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, canAccess, isAdmin, hodDept]);

  useEffect(() => {
    if (!permLoading) load(0);
  }, [permLoading, load]);

  // Client-side search + filter
  const filtered = reports.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!((r.employee_name || r.employee || "").toLowerCase().includes(q) ||
            (r.department || "").toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Stats
  const submitted = filtered.filter(r => r.status?.toLowerCase() === "submitted").length;
  const draft = filtered.filter(r => r.status?.toLowerCase() === "draft").length;
  const cancelled = filtered.filter(r => r.status?.toLowerCase() === "cancelled").length;

  // Unique employees who submitted
  const uniqueEmployees = new Set(filtered.map(r => r.employee || r.employee_name)).size;
  const uniqueDepts = new Set(filtered.map(r => deptShort(r.department)).filter(Boolean)).size;

  if (permLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
          <Shield className="w-12 h-12 text-gray-300" />
          <div>
            <h2 className="text-lg font-bold text-gray-700">Access Restricted</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              You need to be assigned as a Head of Department or granted Team Reporting access in User Management.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const dateModeLabel: Record<DateMode, string> = {
    today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month", custom: "Custom"
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-sm shadow-indigo-200">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900 leading-tight">Team Reporting</h1>
                <p className="text-xs text-gray-400">
                  {hodDept && !isAdmin
                    ? `${deptShort(hodDept)} · Daily Reports`
                    : "All Departments · Daily Reports"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page)}
                disabled={loading}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <StatsCard label="Total" value={filtered.length} color="bg-blue-50 text-blue-700 border-blue-200" />
            <StatsCard label="Submitted" value={submitted} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            <StatsCard label="Draft" value={draft} color="bg-amber-50 text-amber-700 border-amber-200" />
            <StatsCard label="Employees" value={uniqueEmployees} color="bg-violet-50 text-violet-700 border-violet-200" />
            {isAdmin && <StatsCard label="Depts" value={uniqueDepts} color="bg-pink-50 text-pink-700 border-pink-200" />}
            {hodDept && !isAdmin && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold ml-auto">
                <Building2 className="w-3.5 h-3.5" /> {deptShort(hodDept)}
              </span>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date mode tabs */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["today", "yesterday", "week", "month", "custom"] as DateMode[]).map(m => (
                <button key={m} onClick={() => setDateMode(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize",
                    dateMode === m ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {dateModeLabel[m]}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white text-gray-600">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search employee, dept…"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 w-48 bg-white"
              />
            </div>

            <div className="flex-1" />

            {/* Date range (shown always for reference) */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {fromDate === toDate ? fmtDate(fromDate) : `${fmtDate(fromDate)} – ${fmtDate(toDate)}`}
            </div>
          </div>

          {/* Custom range inputs */}
          {dateMode === "custom" && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              <label className="text-[10px] font-bold text-gray-400 uppercase">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              <button onClick={() => load(0)}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                Apply
              </button>
            </div>
          )}
        </div>

        {/* ── Report List ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
          )}

          {!loading && error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <ClipboardList className="w-12 h-12 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No reports found</p>
              <p className="text-xs text-gray-300">
                {hodDept ? `No daily reports for ${deptShort(hodDept)} in this period` : "No daily reports match the selected filters"}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="p-6 space-y-3">
              {/* Group by date */}
              {(() => {
                const grouped: Record<string, ReportSummary[]> = {};
                filtered.forEach(r => {
                  const d = r.date || r.creation?.split(" ")[0] || "Unknown";
                  if (!grouped[d]) grouped[d] = [];
                  grouped[d].push(r);
                });
                return Object.entries(grouped)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, rows]) => (
                    <div key={date}>
                      {/* Date group header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-gray-500">{fmtDate(date)}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[10px] text-gray-400">{rows.length} report{rows.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Report cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {rows.map(r => {
                          const status = (r.status || "").toLowerCase();
                          return (
                            <button
                              key={r.name}
                              onClick={() => setSelectedReport(r.name)}
                              className={cn(
                                "text-left bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer",
                                status === "submitted" ? "border-emerald-100" :
                                status === "draft" ? "border-amber-100" :
                                status === "cancelled" ? "border-red-100" : "border-gray-100"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4 text-indigo-500" />
                                </div>
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusBadge(r.status))}>
                                  {statusIcon(r.status)} {r.status || "—"}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5 line-clamp-1">
                                {r.employee_name || r.employee || "—"}
                              </p>
                              {r.department && (
                                <p className="text-[11px] text-indigo-500 font-medium mb-2 line-clamp-1">
                                  {deptShort(r.department)}
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Clock className="w-3 h-3" />
                                {r.modified ? fmtDateTime(r.modified) : fmtDate(r.date)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
              })()}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Showing {filtered.length} of {total} reports
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => load(page - 1)}
                    disabled={page === 0 || loading}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-gray-500">Page {page + 1}</span>
                  <button
                    onClick={() => load(page + 1)}
                    disabled={!hasMore || loading}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedReport && (
        <ReportDetailModal name={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </Layout>
  );
}
