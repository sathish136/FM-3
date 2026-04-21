import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  ClipboardList, X, RefreshCw, Calendar, User, Building2, Clock,
  CheckCircle2, AlertCircle, Filter, ChevronLeft, ChevronRight, Eye,
  Loader2, Minus, Info, Plus, Send, MessageCircle, FileText, Printer,
  Settings, Users, Bell, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

// ─── Under MD Reporting employees ────────────────────────────────────────────
const MD_REPORTING_EMPLOYEES: { id: string; name: string }[] = [
  { id: "WTT1199", name: "GOKUL R"        },
  { id: "WTT1606", name: "GOKUL S"        },
  { id: "WTT1278", name: "RAGHUL RAJ D"   },
  { id: "WTT947",  name: "RAJA A"         },
  { id: "WTT1194", name: "SATHISHKUMAR G" },
  { id: "WTT1619", name: "SHOBANA P"      },
  { id: "WTT1211", name: "SIVAKUMAR P"    },
  { id: "WTT1603", name: "SIVAKUMAR M"    },
  { id: "WTT1502", name: "VIGNESH S"      },
];

const ALLOWED_EMPLOYEES = MD_REPORTING_EMPLOYEES.map(e => e.name);

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

const MD_EMP_IDS = new Set(MD_REPORTING_EMPLOYEES.map(e => e.id.toUpperCase()));
const MD_EMP_NAMES = new Set(MD_REPORTING_EMPLOYEES.map(e => e.name.toUpperCase()));

function isAllowedEmployee(name: string) {
  const n = (name || "").toUpperCase().trim();
  return ALLOWED_EMPLOYEES.some(a => n.includes(a) || a.includes(n));
}

function isMdEmployee(employeeId: string, employeeName: string) {
  const id = (employeeId || "").toUpperCase().trim();
  const name = (employeeName || "").toUpperCase().trim();
  if (MD_EMP_IDS.has(id)) return true;
  return MD_EMP_NAMES.has(name) || ALLOWED_EMPLOYEES.some(a => name.includes(a) || a.includes(name));
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

        {/* Meta */}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
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
                          <p className="text-[9px] font-bold text-indigo-400 mb-2">#{ri + 1}</p>
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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">New Daily Report</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Employee *</label>
              <select
                value={employee} onChange={e => setEmployee(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-400 bg-white"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Activities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Activities / Tasks</label>
              <button onClick={addRow} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
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
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Project</p>
                    <input
                      value={row.project} onChange={e => updateRow(i, "project", e.target.value)}
                      placeholder="Project name"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Hours</p>
                    <input
                      type="number" min="0" step="0.5" value={row.hours} onChange={e => updateRow(i, "hours", e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-gray-400 font-semibold mb-1">Remarks</p>
                    <input
                      value={row.remarks} onChange={e => updateRow(i, "remarks", e.target.value)}
                      placeholder="Notes"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
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
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {submitting ? "Saving…" : "Save Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
type DRSettings = { whatsappTo: string; sendTime: string; autoSend: boolean };
const DEFAULT_SETTINGS: DRSettings = { whatsappTo: "919698109426", sendTime: "20:00", autoSend: false };
function loadSettings(): DRSettings {
  try { const s = localStorage.getItem("dr_settings"); if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) }; } catch {}
  return { ...DEFAULT_SETTINGS };
}
function saveSettings(s: DRSettings) { localStorage.setItem("dr_settings", JSON.stringify(s)); }

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<DRSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  function save() { saveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Daily Reporting</p>
            <p className="text-sm font-black text-gray-900">Settings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">WhatsApp Number</label>
            <input
              value={form.whatsappTo}
              onChange={e => setForm(f => ({ ...f, whatsappTo: e.target.value }))}
              placeholder="919698109426"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
            />
            <p className="text-[10px] text-gray-400 mt-1">Include country code, no + or spaces (e.g. 919876543210)</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Auto-send Time</label>
            <input
              type="time"
              value={form.sendTime}
              onChange={e => setForm(f => ({ ...f, sendTime: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-700">Auto-send Daily Summary</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Automatically send combined report at the set time (page must be open)</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, autoSend: !f.autoSend }))}
              className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3",
                form.autoSend ? "bg-indigo-600" : "bg-gray-300")}
            >
              <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                form.autoSend ? "left-5" : "left-0.5")} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={save}
            className={cn("flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold transition-colors shadow-sm",
              saved ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700")}
          >
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</> : <><Settings className="w-3.5 h-3.5" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Today's Coverage Panel ───────────────────────────────────────────────────
function TodayCoverage({
  reports, sending, summaryStatus, summaryError, onSend, loading,
}: {
  reports: ReportSummary[];
  sending: boolean;
  summaryStatus: "idle" | "sent" | "error";
  summaryError: string;
  onSend: () => void;
  loading: boolean;
}) {
  const reportedMap = new Map<string, ReportSummary>();
  for (const r of reports) {
    const nameKey = (r.employee_name || r.employee || "").toUpperCase().trim();
    const idKey = (r.employee || "").toUpperCase().trim();
    for (const emp of MD_REPORTING_EMPLOYEES) {
      if (idKey === emp.id.toUpperCase() || nameKey.includes(emp.name.toUpperCase()) || emp.name.toUpperCase().includes(nameKey)) {
        if (!reportedMap.has(emp.id)) reportedMap.set(emp.id, r);
      }
    }
  }
  const reportedCount = reportedMap.size;
  const notReported = MD_REPORTING_EMPLOYEES.filter(e => !reportedMap.has(e.id));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-indigo-500" />
          <div>
            <p className="text-xs font-black text-gray-800">Today's Coverage</p>
            <p className="text-[10px] text-gray-400">
              {loading ? "Loading…" : `${reportedCount} of ${MD_REPORTING_EMPLOYEES.length} reported`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summaryStatus === "sent" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sent!
            </span>
          )}
          {summaryStatus === "error" && (
            <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {summaryError || "Failed"}
            </span>
          )}
          <button
            onClick={onSend}
            disabled={sending || summaryStatus === "sent"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-colors shadow-sm"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : "Send to WhatsApp"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide w-8">#</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Employee</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">ID</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Designation</th>
              <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Modified</th>
            </tr>
          </thead>
          <tbody>
            {MD_REPORTING_EMPLOYEES.map((emp, i) => {
              const report = reportedMap.get(emp.id);
              const status = report?.status;
              const isSubmitted = status === "Submitted";
              const isDraft = status === "Draft";
              return (
                <tr key={emp.id}
                  className={cn("border-b border-gray-50 last:border-0 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                    report ? "hover:bg-indigo-50/30 cursor-pointer" : ""
                  )}>
                  <td className="px-4 py-2.5 text-gray-300 text-[10px] font-bold">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                        isSubmitted ? "bg-emerald-500 text-white" :
                        isDraft     ? "bg-amber-400 text-white"   :
                                      "bg-gray-200 text-gray-400"
                      )}>
                        {emp.name[0]}
                      </div>
                      <p className="font-bold text-gray-800">{emp.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-indigo-500 font-semibold text-[11px]">{emp.id}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-[11px]">{EMPLOYEE_DESIGNATIONS[emp.name.toUpperCase().trim()] || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                      isSubmitted ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      isDraft     ? "bg-amber-100 text-amber-700 border-amber-200"       :
                                    "bg-red-50 text-red-500 border-red-200"
                    )}>
                      {isSubmitted ? <><CheckCircle2 className="w-3 h-3" /> Submitted</> :
                       isDraft     ? <><Clock className="w-3 h-3" /> Draft</>             :
                                     <><X className="w-3 h-3" /> Not Reported</>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-[10px]">
                    {report?.modified ? fmtDateTime(report.modified) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type DateMode = "today" | "yesterday" | "week" | "custom";

export default function DailyReporting() {
  const [allReports, setAllReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const today = todayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");
  const [mdFilter, setMdFilter] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [sendingSummary, setSendingSummary] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "sent" | "error">("idle");
  const [summaryError, setSummaryError] = useState("");

  const LIMIT = 30;

  const reports = mdFilter
    ? allReports.filter(r => isMdEmployee(r.employee, r.employee_name))
    : allReports;

  useEffect(() => {
    if (dateMode === "today")     { setFromDate(today);     setToDate(today); }
    else if (dateMode === "yesterday") { setFromDate(yesterday); setToDate(yesterday); }
    else if (dateMode === "week") { setFromDate(weekAgo);   setToDate(today); }
  }, [dateMode]);

  const load = useCallback(async (p = 0) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: String(LIMIT), page: String(p) });
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`${API_BASE}/daily-reporting?${params}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      const data = await r.json();
      setHasMore(!!data.hasMore);
      setAllReports(data.reports || []);
      setPage(p);
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => { load(0); }, [load]);

  // Auto-send logic (checks every 30s, sends once per day)
  useEffect(() => {
    const interval = setInterval(() => {
      const settings = loadSettings();
      if (!settings.autoSend) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm === settings.sendTime) {
        const todayStr = now.toISOString().split("T")[0];
        const lastSent = localStorage.getItem("dr_last_auto_send");
        if (lastSent !== todayStr) {
          localStorage.setItem("dr_last_auto_send", todayStr);
          handleSendSummary();
        }
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleSendSummary() {
    setSendingSummary(true); setSummaryStatus("idle"); setSummaryError("");
    try {
      const settings = loadSettings();
      const r = await fetch(`${API_BASE}/daily-reporting/send-combined`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, to: settings.whatsappTo }),
      });
      const data = await r.json();
      if (r.ok && data.success) { setSummaryStatus("sent"); }
      else { setSummaryStatus("error"); setSummaryError(data.error || "Failed to send"); }
    } catch (e: any) {
      setSummaryStatus("error"); setSummaryError(e.message || "Network error");
    } finally {
      setSendingSummary(false);
    }
  }

  const dateModeLabel: Record<DateMode, string> = {
    today: "Today", yesterday: "Yesterday", week: "This Week", custom: "Custom Range"
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">Daily Reporting</h1>
              <p className="text-xs text-gray-400">
                {reports.length} report{reports.length !== 1 ? "s" : ""} · {dateModeLabel[dateMode]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => load(0)}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New Report
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
          {/* Row 1: date mode tabs + MD filter + status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date tabs */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["today","yesterday","week","custom"] as DateMode[]).map(m => (
                <button key={m} onClick={() => setDateMode(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize",
                    dateMode === m ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {m === "today" ? "Today" : m === "yesterday" ? "Yesterday" : m === "week" ? "This Week" : "Custom"}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            {/* MD Reporting filter */}
            <button onClick={() => setMdFilter(f => !f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                mdFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}>
              <Users className="w-3.5 h-3.5" />
              Under MD Reporting
              {mdFilter && <X className="w-3 h-3 opacity-80" onClick={e => { e.stopPropagation(); setMdFilter(false); }} />}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white text-gray-600">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Row 2: Custom date range (only when custom) */}
          {dateMode === "custom" && (
            <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
          )}
        </div>

        {/* ── Today's Coverage (only when Today + MD filter) ── */}
        {dateMode === "today" && mdFilter && (
          <TodayCoverage
            reports={reports}
            sending={sendingSummary}
            summaryStatus={summaryStatus}
            summaryError={summaryError}
            onSend={handleSendSummary}
            loading={loading}
          />
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs text-gray-400">Loading daily reports…</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ClipboardList className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-bold text-gray-400">No daily reports found</p>
              <p className="text-xs text-gray-300">Try adjusting the date range or create a new report</p>
              <button onClick={() => setShowNewModal(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
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
                      <tr key={r.name}
                        className={cn("border-b border-gray-50 last:border-0 hover:bg-indigo-50/40 transition-colors cursor-pointer", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}
                        onClick={() => setSelectedReport(r.name)}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-400 flex items-center justify-center shrink-0">
                              <span className="text-white text-[9px] font-black">{(r.employee_name || r.employee || "?")[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 leading-tight">{r.employee_name || r.employee}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {r.employee && <span className="text-[9px] font-semibold text-indigo-500">{r.employee}</span>}
                                {EMPLOYEE_DESIGNATIONS[(r.employee_name || "").toUpperCase().trim()] && (
                                  <span className="text-[9px] text-gray-400">{EMPLOYEE_DESIGNATIONS[(r.employee_name || "").toUpperCase().trim()]}</span>
                                )}
                              </div>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-semibold transition-colors">
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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </Layout>
  );
}
