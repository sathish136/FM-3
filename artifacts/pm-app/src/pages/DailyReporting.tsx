import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  ClipboardList, X, RefreshCw, Calendar, User, Building2, Clock,
  CheckCircle2, AlertCircle, Filter, ChevronLeft, ChevronRight, Eye,
  Loader2, Minus, Info, Plus, Send, MessageCircle, FileText, Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

// ─── Allowed employees (display name → used for matching) ────────────────────
const ALLOWED_EMPLOYEES = [
  "GOKUL R",
  "GOKUL S",
  "RAGHUL RAJ D",
  "RAJA A",
  "SATHISHKUMAR G",
  "SHOBANA P",
  "SIVAKUMAR P",
  "SIVAKUMAR M",
  "VIGNESH S",
];

const EMPLOYEE_DESIGNATIONS: Record<string, string> = {
  "GOKUL R":       "Senior Software Developer",
  "GOKUL S":       "Graduate Engineer Trainee - R&D",
  "RAGHUL RAJ D":  "Assistant Manager - Marketing",
  "RAJA A":        "AGM Proposal",
  "SATHISHKUMAR G":"Assistant Manager - IT & ERP",
  "SHOBANA P":     "",
  "SIVAKUMAR P":   "General Manager - Admin",
  "SIVAKUMAR M":   "GET - R&D",
  "VIGNESH S":     "Assistant Manager - O&M cum Commissioning",
};

function isAllowedEmployee(name: string) {
  const n = (name || "").toUpperCase().trim();
  return ALLOWED_EMPLOYEES.some(a => n.includes(a) || a.includes(n));
}

type ReportSummary = {
  name: string;
  employee: string;
  employee_name: string;
  department: string;
  date: string;
  status: string;
  modified: string;
};

type ReportDetail = ReportSummary & { [key: string]: any };

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
function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ReportDetailModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<"idle" | "sent" | "error">("idle");
  const [waError, setWaError] = useState("");

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

  async function handleWhatsApp() {
    if (!report) return;
    setWaSending(true); setWaStatus("idle"); setWaError("");
    try {
      const r = await fetch(`${API_BASE}/daily-reporting/${encodeURIComponent(name)}/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setWaStatus("sent");
      } else {
        setWaStatus("error");
        setWaError(data.error || "Failed to send");
      }
    } catch (e: any) {
      setWaStatus("error");
      setWaError(e.message || "Network error");
    } finally {
      setWaSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Daily Report</p>
            <p className="text-sm font-black text-gray-900 leading-tight truncate">{name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
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
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusBadge(report.status))}>
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
              {scalarFields.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scalarFields.map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-700 break-words">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {childTables.map(([key, rows]) => (
                <div key={key}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{key.replace(/_/g, " ")}</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {(rows as any[]).map((row, ri) => {
                      const rowFields = Object.entries(row).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== "" && v !== 0 && !["name","parent","parenttype","parentfield","doctype","idx"].includes(k));
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
          <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0 flex-wrap">
            <p className="text-[10px] text-gray-400">Created: <span className="font-medium">{fmtDateTime(report.creation)}</span></p>
            <p className="text-[10px] text-gray-400">Modified: <span className="font-medium">{fmtDateTime(report.modified)}</span></p>
            <div className="ml-auto flex items-center gap-2">
              {waStatus === "sent" && (
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sent to WhatsApp!
                </span>
              )}
              {waStatus === "error" && (
                <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> {waError || "Send failed"}
                </span>
              )}
              <button
                onClick={handleWhatsApp}
                disabled={waSending || waStatus === "sent"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-sm"
              >
                {waSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                {waSending ? "Sending…" : waStatus === "sent" ? "Sent ✓" : "Send to WhatsApp"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Report Modal ─────────────────────────────────────────────────────────
type Activity = { activity: string; project: string; hours: string; remarks: string };

function NewReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [employee, setEmployee] = useState(ALLOWED_EMPLOYEES[0]);
  const [date, setDate] = useState(todayISO());
  const [activities, setActivities] = useState<Activity[]>([{ activity: "", project: "", hours: "", remarks: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function addRow() { setActivities(a => [...a, { activity: "", project: "", hours: "", remarks: "" }]); }
  function removeRow(i: number) { setActivities(a => a.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof Activity, value: string) {
    setActivities(a => a.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function handleSubmit() {
    if (!employee || !date) { setError("Employee and date are required."); return; }
    setSubmitting(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/daily-reporting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_name: employee, date, activities }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to create report");
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">New Daily Report</p>
            <p className="text-sm font-black text-gray-900">Create Report</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Employee *</label>
              <select
                value={employee} onChange={e => setEmployee(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-orange-400 bg-white"
              >
                {ALLOWED_EMPLOYEES.map(emp => (
                  <option key={emp} value={emp}>{emp}{EMPLOYEE_DESIGNATIONS[emp] ? ` — ${EMPLOYEE_DESIGNATIONS[emp]}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Date *</label>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* Activities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Activities / Tasks</label>
              <button onClick={addRow} className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-700">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {activities.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-xl p-3">
                  <div className="col-span-4">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Activity</p>
                    <input
                      value={row.activity} onChange={e => updateRow(i, "activity", e.target.value)}
                      placeholder="What did you do?"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Project</p>
                    <input
                      value={row.project} onChange={e => updateRow(i, "project", e.target.value)}
                      placeholder="Project name"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Hours</p>
                    <input
                      type="number" min="0" step="0.5" value={row.hours} onChange={e => updateRow(i, "hours", e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Remarks</p>
                    <input
                      value={row.remarks} onChange={e => updateRow(i, "remarks", e.target.value)}
                      placeholder="Notes"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white"
                    />
                  </div>
                  <div className="col-span-1 flex items-end pb-1 justify-center">
                    {activities.length > 1 && (
                      <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {submitting ? "Saving…" : "Save Report"}
          </button>
        </div>
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
  const [showNewModal, setShowNewModal] = useState(false);

  const today = todayISO();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 30;

  const load = useCallback(async (p = 0) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: String(LIMIT), page: String(p) });
      if (statusFilter) params.set("status", statusFilter);

      const r = await fetch(`${API_BASE}/daily-reporting?${params}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      const data = await r.json();
      const rows: ReportSummary[] = data.reports || [];
      setHasMore(!!data.hasMore);
      setReports(rows);
      setPage(p);
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => { load(0); }, [load]);

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
              <p className="text-xs text-gray-400">{reports.length} report{reports.length !== 1 ? "s" : ""} · {ALLOWED_EMPLOYEES.length} employees</p>
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
            <button onClick={() => load(0)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Report
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">To Date</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400 bg-white">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
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
              <p className="text-xs text-gray-300">Try adjusting the date range or create a new report</p>
              <button onClick={() => setShowNewModal(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Report
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Employee</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Department</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Modified</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={r.name} className={cn("border-b border-gray-50 last:border-0 hover:bg-orange-50/40 transition-colors cursor-pointer", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}
                        onClick={() => setSelectedReport(r.name)}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center shrink-0">
                              <span className="text-white text-[9px] font-black">{(r.employee_name || r.employee || "?")[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 leading-tight">{r.employee_name || r.employee}</p>
                              {EMPLOYEE_DESIGNATIONS[r.employee_name?.toUpperCase().trim()] && (
                                <p className="text-[9px] text-gray-400">{EMPLOYEE_DESIGNATIONS[r.employee_name.toUpperCase().trim()]}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{deptShort(r.department) || "—"}</td>
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
                        <td className="px-4 py-2.5 text-gray-400 text-[10px]">{fmtDateTime(r.modified)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={e => { e.stopPropagation(); setSelectedReport(r.name); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-[10px] font-semibold transition-colors">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">Page {page + 1} · {reports.length} record{reports.length !== 1 ? "s" : ""}</p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 0} onClick={() => load(page - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-gray-500 px-2">Page {page + 1}</span>
                  <button disabled={!hasMore} onClick={() => load(page + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedReport && <ReportDetailModal name={selectedReport} onClose={() => setSelectedReport(null)} />}
      {showNewModal && <NewReportModal onClose={() => setShowNewModal(false)} onCreated={() => load(0)} />}
    </Layout>
  );
}
