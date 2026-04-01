import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  ClipboardList, Search, X, RefreshCw, ChevronDown, ChevronUp,
  Calendar, User, Building2, Clock, CheckCircle2, FileText,
  AlertCircle, Filter, ChevronLeft, ChevronRight, Eye,
  Loader2, Minus, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type ReportSummary = {
  name: string;
  employee: string;
  employee_name: string;
  department: string;
  date: string;
  status: string;
  modified: string;
};

type ReportDetail = ReportSummary & {
  [key: string]: any;
};

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

// ─── Detail Modal ─────────────────────────────────────────────────────────────
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

  const SKIP_FIELDS = new Set([
    "doctype", "idx", "docstatus", "__islocal", "__unsaved", "owner", "__last_sync_on",
    "name", "employee", "employee_name", "department", "date", "status", "modified",
    "modified_by", "creation", "amended_from",
  ]);

  const childTables = report
    ? Object.entries(report).filter(([, v]) => Array.isArray(v) && v.length > 0)
    : [];

  const scalarFields = report
    ? Object.entries(report).filter(([k, v]) => !SKIP_FIELDS.has(k) && !Array.isArray(v) && v !== null && v !== "" && v !== 0)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Daily Report</p>
            <p className="text-sm font-black text-gray-900 leading-tight truncate">{name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta */}
        {report && (
          <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-b border-gray-50 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-gray-700">{report.employee_name || report.employee}</span>
            </div>
            {report.department && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-gray-500">{deptShort(report.department)}</span>
              </div>
            )}
            {report.date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-gray-500">{fmtDate(report.date)}</span>
              </div>
            )}
            <span className={cn("ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusBadge(report.status))}>
              {statusIcon(report.status)} {report.status}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-xs text-gray-400">Loading report…</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {report && !loading && (
            <>
              {/* Scalar fields */}
              {scalarFields.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scalarFields.map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                          {k.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-700 break-words">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Child tables */}
              {childTables.map(([key, rows]) => (
                <div key={key}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    {key.replace(/_/g, " ")}
                  </p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {(rows as any[]).map((row, ri) => {
                      const rowFields = Object.entries(row).filter(
                        ([k, v]) => !SKIP_FIELDS.has(k) && v !== null && v !== "" && v !== 0 && k !== "name" && k !== "parent" && k !== "parenttype" && k !== "parentfield" && k !== "doctype" && k !== "idx"
                      );
                      if (!rowFields.length) return null;
                      return (
                        <div key={ri} className={cn("px-4 py-3 border-b border-gray-50 last:border-0", ri % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                          <p className="text-[9px] font-bold text-orange-400 mb-2">#{ri + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                            {rowFields.map(([k, v]) => (
                              <div key={k}>
                                <span className="text-[9px] font-semibold text-gray-400 uppercase">{k.replace(/_/g, " ")}: </span>
                                <span className="text-[11px] text-gray-700">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {scalarFields.length === 0 && childTables.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Info className="w-6 h-6 text-gray-300" />
                  <p className="text-sm text-gray-400">No additional details available</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <p className="text-[10px] text-gray-400">
              Created: <span className="font-medium">{fmtDateTime(report.creation)}</span>
            </p>
            <p className="text-[10px] text-gray-400 ml-auto">
              Modified: <span className="font-medium">{fmtDateTime(report.modified)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DailyReporting() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [empSearch, setEmpSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 30;

  const load = useCallback(async (p = 0) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        limit: String(LIMIT + 1),
        page: String(p),
      });
      if (empSearch.trim()) params.set("employee", empSearch.trim());
      if (deptSearch.trim()) params.set("department", deptSearch.trim());
      if (statusFilter) params.set("status", statusFilter);

      const r = await fetch(`${API_BASE}/daily-reporting?${params}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      const data = await r.json();
      const rows: ReportSummary[] = data.reports || [];
      setHasMore(rows.length > LIMIT);
      setReports(rows.slice(0, LIMIT));
      setPage(p);
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, empSearch, deptSearch, statusFilter]);

  useEffect(() => { load(0); }, [load]);

  const departments = Array.from(new Set(reports.map(r => deptShort(r.department)).filter(Boolean))).sort();

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-200">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">Daily Reporting</h1>
              <p className="text-xs text-gray-400">{reports.length} report{reports.length !== 1 ? "s" : ""} found</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                showFilters ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            <button
              onClick={() => load(0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">From Date</label>
                <input
                  type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">To Date</label>
                <input
                  type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Employee</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                  <input
                    type="text" placeholder="Search employee…" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    className="w-full pl-7 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            {departments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 self-center mr-1">Department:</span>
                <button
                  onClick={() => setDeptSearch("")}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors font-semibold",
                    !deptSearch ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200")}
                >All</button>
                {departments.map(d => (
                  <button key={d}
                    onClick={() => setDeptSearch(deptSearch === d ? "" : d)}
                    className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors font-semibold",
                      deptSearch === d ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200")}
                  >{d}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-xs text-gray-400">Loading daily reports…</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ClipboardList className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-bold text-gray-400">No daily reports found</p>
              <p className="text-xs text-gray-300">Try adjusting the date range or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Report ID</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Employee</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Department</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Modified</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr
                        key={r.name}
                        className={cn(
                          "border-b border-gray-50 last:border-0 hover:bg-orange-50/40 transition-colors cursor-pointer",
                          i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        )}
                        onClick={() => setSelectedReport(r.name)}
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-orange-600 text-[10px] bg-orange-50 px-1.5 py-0.5 rounded">{r.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center shrink-0">
                              <span className="text-white text-[8px] font-black">{(r.employee_name || r.employee || "?")[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 leading-tight">{r.employee_name || r.employee}</p>
                              {r.employee && r.employee_name && (
                                <p className="text-[9px] text-gray-400">{r.employee}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-600">{deptShort(r.department) || "—"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            {fmtDate(r.date)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", statusBadge(r.status))}>
                            {statusIcon(r.status)} {r.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-[10px]">
                          {fmtDateTime(r.modified)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedReport(r.name); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-[10px] font-semibold transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  Page {page + 1} · {reports.length} record{reports.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => load(page - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-gray-500 px-2">Page {page + 1}</span>
                  <button
                    disabled={!hasMore}
                    onClick={() => load(page + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal name={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </Layout>
  );
}
