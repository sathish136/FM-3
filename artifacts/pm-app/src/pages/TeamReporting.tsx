import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  ClipboardList, RefreshCw, Calendar, User, Building2, Clock,
  CheckCircle2, XCircle, X, Loader2, Shield, Search,
  AlertTriangle, ChevronRight, FileText, Layers, Hash,
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

type ReportDetail = ReportSummary & {
  [key: string]: any;
};

type ActivityRow = {
  activity?: string;
  project?: string;
  no_of_hours?: number;
  hours?: number;
  remarks?: string;
  description?: string;
  [key: string]: any;
};

type EmpRecord = {
  id: string;
  name: string;
  designation: string;
  department: string;
};

function todayISO() { return new Date().toISOString().split("T")[0]; }

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

function initials(name: string) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  submitted: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Submitted" },
  draft:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400",   label: "Draft"     },
  cancelled: { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200",     dot: "bg-red-400",     label: "Cancelled" },
};
function getStatus(s: string) {
  return STATUS_CONFIG[(s || "").toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-300", label: s || "—" };
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ name, onClose }: { name: string; onClose: () => void }) {
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

  const SKIP = new Set(["doctype","idx","docstatus","__islocal","__unsaved","owner","__last_sync_on",
    "name","employee","employee_name","department","date","status","modified","modified_by",
    "creation","amended_from","creation_date","month","year"]);

  const scalarFields = report
    ? Object.entries(report).filter(([k, v]) => !SKIP.has(k) && !Array.isArray(v) && v !== null && v !== "" && v !== 0 && v !== false)
    : [];

  // Dynamically find all child table arrays in the report — only non-empty arrays
  const childTables: [string, ActivityRow[]][] = report
    ? (Object.entries(report).filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0) as [string, ActivityRow[]][])
    : [];

  // Best activity table: prefer one that has activity/project/hours fields, then fall back to first non-empty
  const activityTable = childTables.find(([, rows]) =>
    rows.some(r => r.activity !== undefined || r.no_of_hours !== undefined || r.project !== undefined)
  ) ?? childTables[0] ?? null;

  const activities: ActivityRow[] = activityTable ? activityTable[1] : [];
  const totalHours = activities.reduce((s, a) => s + (Number(a.no_of_hours) || Number(a.hours) || 0), 0);

  // Resolve report date — ERPNext may store it in `date`, or derive from name/creation_date
  const reportDate = report?.date || report?.creation_date || null;
  const st = report ? getStatus(report.status) : null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white shrink-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Daily Report</p>
          <p className="text-xs font-bold text-gray-800 truncate">{name}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        )}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {report && !loading && (
          <>
            {/* Employee + meta */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-3">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {initials(report.employee_name || report.employee)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{report.employee_name || report.employee}</p>
                  <p className="text-xs text-indigo-500 font-medium">{deptShort(report.department) || "—"}</p>
                  {report.employee && report.employee_name && (
                    <p className="text-[10px] text-gray-400 font-mono">{report.employee}</p>
                  )}
                </div>
                {st && (
                  <div className={cn("ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border", st.bg, st.text, st.border)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                    {st.label}
                  </div>
                )}
              </div>

              {/* Date + modified */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Report Date</p>
                    <p className="text-xs font-bold text-gray-800">{fmtDate(reportDate)}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Last Modified</p>
                    <p className="text-xs font-bold text-gray-800">{fmtDateTime(report.modified)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Extra scalar fields */}
            {scalarFields.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Additional Info</p>
                <div className="grid grid-cols-1 gap-2">
                  {scalarFields.map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-700">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities Table */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Activities / Tasks
                </p>
                {totalHours > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    {totalHours.toFixed(1)}h total
                  </span>
                )}
              </div>

              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center bg-gray-50 rounded-2xl border border-gray-100">
                  <ClipboardList className="w-8 h-8 text-gray-200" />
                  <p className="text-xs text-gray-400">No activities logged</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((row, i) => {
                    const SKIP_ROW = new Set(["name","doctype","idx","docstatus","parent","parentfield","parenttype","owner","modified","modified_by","creation"]);
                    const hrs = Number(row.no_of_hours) || Number(row.hours) || 0;
                    const actText = row.activity || row.description || row.activity_type || "";
                    const projText = row.project || row.project_name || "";
                    const remarkText = row.remarks || row.remark || row.notes || "";
                    // All other fields not already shown
                    const extraFields = Object.entries(row).filter(([k, v]) =>
                      !SKIP_ROW.has(k) &&
                      k !== "activity" && k !== "description" && k !== "activity_type" &&
                      k !== "project" && k !== "project_name" &&
                      k !== "no_of_hours" && k !== "hours" &&
                      k !== "remarks" && k !== "remark" && k !== "notes" &&
                      v !== null && v !== "" && v !== 0 && v !== false
                    );
                    return (
                      <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-xs font-bold text-gray-900 leading-tight">
                              {actText || <span className="text-gray-400 italic font-normal">No activity description</span>}
                            </p>
                          </div>
                          {hrs > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                              <Clock className="w-2.5 h-2.5" /> {hrs}h
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {projText && (
                            <span className="flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-semibold">
                              <Hash className="w-2.5 h-2.5" /> {projText}
                            </span>
                          )}
                          {remarkText && (
                            <span className="text-[10px] text-gray-500 italic">"{remarkText}"</span>
                          )}
                        </div>
                        {extraFields.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {extraFields.map(([k, v]) => (
                              <div key={k} className="text-[10px] text-gray-500">
                                <span className="font-semibold text-gray-400">{k.replace(/_/g, " ")}: </span>
                                {String(v)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type ViewTab = "reported" | "not-reported";

export default function TeamReporting() {
  const { user } = useAuth();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const [hodDept, setHodDept] = useState<string | null>(null);
  const [hasModuleAccess, setHasModuleAccess] = useState(false);
  const [permLoading, setPermLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<ViewTab>("reported");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [total, setTotal] = useState(0);

  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());

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

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: "200", page: "0" });
      if (statusFilter) params.set("status", statusFilter);
      if (!isAdmin && hodDept && hodDept !== "") params.set("department", hodDept);
      const r = await fetch(`${API_BASE}/daily-reporting?${params}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      const data = await r.json();
      setTotal(data.total ?? 0);
      setReports(data.reports || []);
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter, canAccess, isAdmin, hodDept]);

  // Load employees for "not reported" — only for single-day view
  useEffect(() => {
    if (!canAccess || fromDate !== toDate) return;
    setEmpLoading(true);
    const dept = (!isAdmin && hodDept && hodDept !== "") ? hodDept : "";
    fetch(`${API_BASE}/employees?limit=300${dept ? `&department=${encodeURIComponent(dept)}` : ""}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: EmpRecord[]) => {
        let emps = Array.isArray(data) ? data : [];
        if (dept) emps = emps.filter(e => (e.department || "").toLowerCase().includes(dept.toLowerCase()));
        setAllEmployees(emps);
      })
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, [canAccess, fromDate, toDate, isAdmin, hodDept]);

  useEffect(() => { if (!permLoading) load(); }, [permLoading, load]);

  // "Not reported" calculation
  const reportedNames = new Set(
    reports.map(r => (r.employee_name || r.employee || "").toUpperCase().trim())
  );
  const reportedIds = new Set(
    reports.map(r => (r.employee || "").toUpperCase().trim())
  );
  const notReported = allEmployees.filter(e => {
    const n = e.name.toUpperCase().trim();
    const id = e.id.toUpperCase().trim();
    return !reportedNames.has(n) && !reportedIds.has(id);
  });

  // Client-side filter
  const filtered = reports.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      return (r.employee_name || r.employee || "").toLowerCase().includes(q) ||
             (r.department || "").toLowerCase().includes(q) ||
             r.name.toLowerCase().includes(q);
    }
    return true;
  });

  const notReportedFiltered = notReported.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.designation || "").toLowerCase().includes(search.toLowerCase())
  );

  const submitted = reports.filter(r => r.status?.toLowerCase() === "submitted").length;
  const draft = reports.filter(r => r.status?.toLowerCase() === "draft").length;

  const isSingleDay = fromDate === toDate;

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
      <div className="flex h-full overflow-hidden bg-gray-50">

        {/* ── Left Panel: List ── */}
        <div className={cn("flex flex-col border-r border-gray-200 bg-white transition-all duration-200", selectedReport ? "w-[420px] shrink-0" : "flex-1")}>

          {/* Header */}
          <div className="border-b border-gray-100 px-5 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-sm">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-black text-gray-900 leading-tight">Team Reporting</h1>
                <p className="text-[11px] text-gray-400">
                  {hodDept && !isAdmin ? `${deptShort(hodDept)}` : "All Departments"} · Daily Reports
                </p>
              </div>
              <button onClick={load} disabled={loading}
                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Total", value: reports.length, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
                { label: "Submitted", value: submitted, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
                { label: "Draft", value: draft, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
                { label: "Not Filed", value: isSingleDay ? notReported.length : 0, color: "text-red-600", bg: "bg-red-50 border-red-100" },
              ].map(s => (
                <div key={s.label} className={cn("flex flex-col items-center justify-center rounded-xl border py-2 px-1", s.bg)}>
                  <span className={cn("text-xl font-black leading-none", s.color)}>{s.value}</span>
                  <span className={cn("text-[9px] font-semibold mt-0.5 opacity-70", s.color)}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Date mode tabs */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5 mb-3">
              {(["today","yesterday","week","month","custom"] as DateMode[]).map(m => (
                <button key={m} onClick={() => setDateMode(m)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
                    dateMode === m ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {dateModeLabel[m]}
                </button>
              ))}
            </div>

            {dateMode === "custom" && (
              <div className="flex items-center gap-2 mb-3">
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
                <span className="text-gray-400 text-xs">–</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
                <button onClick={load} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">Go</button>
              </div>
            )}

            {/* Status + search row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white text-gray-600">
                <option value="">All</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Tabs — only for single-day */}
            {isSingleDay && (
              <div className="flex items-center gap-1 mt-3">
                {([
                  { id: "reported" as ViewTab, label: `Reported (${filtered.length})` },
                  { id: "not-reported" as ViewTab, label: `Not Reported (${notReportedFiltered.length})`, alert: notReportedFiltered.length > 0 },
                ]).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
                      activeTab === tab.id
                        ? tab.id === "not-reported" && tab.alert
                          ? "bg-red-500 text-white"
                          : "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}>
                    {tab.id === "not-reported" && tab.alert && <AlertTriangle className="w-3 h-3" />}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            )}
            {!loading && error && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Reported list */}
            {!loading && !error && (activeTab === "reported" || !isSingleDay) && (
              <>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <ClipboardList className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-gray-400 font-medium">No reports found</p>
                    <p className="text-xs text-gray-300">
                      {hodDept ? `No reports from ${deptShort(hodDept)} in this period` : "No reports match the selected filters"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filtered.map(r => {
                      const st = getStatus(r.status);
                      const isSelected = selectedReport === r.name;
                      return (
                        <button key={r.name} onClick={() => setSelectedReport(isSelected ? null : r.name)}
                          className={cn(
                            "w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-2",
                            isSelected ? "bg-indigo-50 border-indigo-500" : "border-transparent"
                          )}>
                          {/* Avatar */}
                          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm",
                            r.status?.toLowerCase() === "submitted" ? "bg-gradient-to-br from-emerald-400 to-green-500" :
                            r.status?.toLowerCase() === "draft" ? "bg-gradient-to-br from-amber-400 to-orange-400" :
                            "bg-gradient-to-br from-indigo-400 to-blue-500")}>
                            {initials(r.employee_name || r.employee)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-bold text-gray-900 truncate">{r.employee_name || r.employee || "—"}</p>
                              <span className={cn("shrink-0 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", st.bg, st.text, st.border)}>
                                <span className={cn("w-1 h-1 rounded-full", st.dot)} />
                                {st.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-indigo-500 font-medium truncate">{deptShort(r.department) || "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {r.date ? fmtDate(r.date) : "—"}
                              </span>
                              <span className="text-[10px] text-gray-300">·</span>
                              <span className="text-[10px] text-gray-400">{r.modified ? fmtDateTime(r.modified) : "—"}</span>
                            </div>
                          </div>

                          <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 transition-transform text-gray-300", isSelected && "rotate-90 text-indigo-500")} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Not reported list */}
            {!loading && !error && activeTab === "not-reported" && isSingleDay && (
              <>
                {empLoading && (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
                {!empLoading && notReportedFiltered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-300" />
                    <p className="text-sm font-bold text-emerald-600">All members reported!</p>
                    <p className="text-xs text-gray-400">Everyone has submitted a daily report for this date.</p>
                  </div>
                )}
                {!empLoading && notReportedFiltered.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {notReportedFiltered.map(e => (
                      <div key={e.id} className="px-4 py-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                          {initials(e.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{e.name}</p>
                          <p className="text-[11px] text-indigo-400 font-medium truncate">{deptShort(e.department) || "—"}</p>
                          {e.designation && <p className="text-[10px] text-gray-400 truncate">{e.designation}</p>}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" /> Not Filed
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Panel: Detail ── */}
        {selectedReport && (
          <div className="flex-1 overflow-hidden">
            <DetailPanel name={selectedReport} onClose={() => setSelectedReport(null)} />
          </div>
        )}

        {/* Empty detail state */}
        {!selectedReport && (
          <div className="flex-1 hidden lg:flex flex-col items-center justify-center gap-3 text-center bg-gray-50/50 border-l border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400">Select a report to view details</p>
              <p className="text-xs text-gray-300 mt-1">Click any report from the list to see activities and details</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
