import { useState, useEffect, useCallback } from "react";
import {
  GitBranch, Plus, Search, RefreshCw, Trash2, Save, ArrowLeft,
  AlertCircle, Loader2, ChevronDown, Download, X,
  User, Calendar, FolderOpen, Cpu, FileText, Shield,
  CheckCircle2, Clock, Wrench, Zap, RefreshCw as RefreshIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────
type Status = "Draft" | "Pending Approval" | "Approved" | "Rejected";
const STATUSES: Status[] = ["Draft", "Pending Approval", "Approved", "Rejected"];

const MOD_TYPES = [
  "Bug Fix", "Enhancement", "New Feature",
  "Parameter Change", "Safety Update",
  "Hardware Change", "Configuration Change", "Other",
];

const DEVICE_TYPES = ["PLC", "HMI", "PLC + HMI", "SCADA", "Drive", "Other"];

interface ModLog {
  id: number;
  mod_no?: string;
  project_number?: string;
  project_name?: string;
  device_type?: string;
  device_make?: string;
  device_model?: string;
  program_ref?: string;
  modification_date?: string;
  modified_by?: string;
  modification_type?: string;
  description?: string;
  reason?: string;
  changes_before?: string;
  changes_after?: string;
  impact_assessment?: string;
  testing_done?: string;
  approved_by?: string;
  approval_date?: string;
  status?: Status;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

type FormState = Omit<ModLog, "id" | "created_at" | "updated_at">;
const EMPTY: FormState = {
  mod_no: "", project_number: "", project_name: "",
  device_type: "PLC", device_make: "", device_model: "",
  program_ref: "", modification_date: "", modified_by: "",
  modification_type: "Bug Fix", description: "", reason: "",
  changes_before: "", changes_after: "", impact_assessment: "",
  testing_done: "", approved_by: "", approval_date: "",
  status: "Draft", remarks: "", created_by: "",
};

type Tab = "overview" | "modification" | "changes" | "approval";
const TABS: { id: Tab; label: string; icon: typeof GitBranch }[] = [
  { id: "overview",     label: "Overview",      icon: FolderOpen  },
  { id: "modification", label: "Modification",  icon: Wrench      },
  { id: "changes",      label: "Before & After",icon: RefreshIcon },
  { id: "approval",     label: "Approval",      icon: Shield      },
];

const STATUS_CFG: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
  "Draft":            { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-300",   dot: "bg-slate-400"  },
  "Pending Approval": { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-300",   dot: "bg-amber-500"  },
  "Approved":         { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500"},
  "Rejected":         { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"    },
};

const TYPE_CFG: Record<string, { bg: string; text: string }> = {
  "Bug Fix":              { bg: "bg-red-100",     text: "text-red-700"     },
  "Enhancement":          { bg: "bg-blue-100",    text: "text-blue-700"    },
  "New Feature":          { bg: "bg-emerald-100", text: "text-emerald-700" },
  "Parameter Change":     { bg: "bg-amber-100",   text: "text-amber-700"   },
  "Safety Update":        { bg: "bg-violet-100",  text: "text-violet-700"  },
  "Hardware Change":      { bg: "bg-sky-100",     text: "text-sky-700"     },
  "Configuration Change": { bg: "bg-indigo-100",  text: "text-indigo-700"  },
  "Other":                { bg: "bg-gray-100",    text: "text-gray-700"    },
};

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CFG[status as Status] ?? STATUS_CFG["Draft"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const cfg = TYPE_CFG[type || "Other"] ?? TYPE_CFG["Other"];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", cfg.bg, cfg.text)}>
      {type || "Other"}
    </span>
  );
}

// ── Form Field Primitives ──────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", placeholder = "",
  span2 = false, options, textarea, rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; span2?: boolean;
  options?: string[]; textarea?: boolean; rows?: number;
}) {
  const base = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";
  return (
    <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={base}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={cn(base, "resize-none")} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: typeof GitBranch; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <Icon size={15} className="text-blue-600" />
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PLCModificationLog() {
  const { user } = useAuth();
  const userName = (user as any)?.fullName || (user as any)?.email || "";

  const [items, setItems] = useState<ModLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<ModLog | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, thisMonth: 0 });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/modification-logs?${params}`);
      setItems(await r.json());
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/plc/modification-logs/stats`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchItems(); fetchStats(); }, [fetchItems, fetchStats]);

  function openNew() {
    setForm({ ...EMPTY, created_by: userName });
    setSelected(null);
    setIsNew(true);
    setActiveTab("overview");
    setError("");
  }

  function openEdit(item: ModLog) {
    const f = { ...EMPTY };
    (Object.keys(EMPTY) as (keyof FormState)[]).forEach(k => { (f as any)[k] = (item as any)[k] ?? ""; });
    setForm(f);
    setSelected(item);
    setIsNew(false);
    setActiveTab("overview");
    setError("");
  }

  function closeDetail() { setSelected(null); setIsNew(false); setError(""); }

  const sf = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.project_name?.trim() && !form.project_number?.trim()) {
      setError("Project name or number is required."); return;
    }
    if (!form.description?.trim()) {
      setError("Description is required."); return;
    }
    setSaving(true); setError("");
    try {
      const body: any = { ...form };
      Object.keys(body).forEach(k => { if (body[k] === "") body[k] = null; });
      const url = isNew
        ? `${BASE}/api/plc/modification-logs`
        : `${BASE}/api/plc/modification-logs/${selected!.id}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      await fetchItems();
      fetchStats();
      if (isNew) {
        closeDetail();
      } else {
        const updated = await fetch(`${BASE}/api/plc/modification-logs/${selected!.id}`);
        if (updated.ok) setSelected(await updated.json());
      }
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this modification log entry? This cannot be undone.")) return;
    await fetch(`${BASE}/api/plc/modification-logs/${id}`, { method: "DELETE" });
    await fetchItems();
    fetchStats();
    closeDetail();
  }

  async function downloadPdf(id: number, modNo?: string) {
    setPdfLoading(true);
    try {
      const r = await fetch(`${BASE}/api/plc/modification-logs/${id}/pdf`, { method: "POST" });
      if (!r.ok) throw new Error("PDF generation failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${modNo || `MCL-${id}`}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(String(e)); }
    finally { setPdfLoading(false); }
  }

  const inDetail = isNew || selected !== null;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex-none bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {inDetail && (
                <button onClick={closeDetail}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <GitBranch size={16} className="text-blue-700" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Programming Modification Log</h1>
                <p className="text-xs text-gray-500">
                  {inDetail
                    ? (isNew ? "New Entry" : `${selected?.mod_no || `#${selected?.id}`} — ${selected?.project_name || "—"}`)
                    : `${items.length} record${items.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!inDetail && (
                <>
                  {/* Status filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All Statuses</option>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && fetchItems()}
                      placeholder="Search project, mod no, engineer…"
                      className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                    />
                  </div>
                  <button
                    onClick={fetchItems}
                    className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    <Plus size={14} /> New Entry
                  </button>
                </>
              )}
              {inDetail && (
                <>
                  {!isNew && selected && (
                    <>
                      <button
                        onClick={() => downloadPdf(selected.id, selected.mod_no)}
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save size={14} /> {saving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} className="flex-none" /> {error}
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
          </div>
        )}

        {/* ── List View ─────────────────────────────────────────────────────── */}
        {!inDetail && (
          <div className="flex-1 overflow-y-auto p-6">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Entries",    value: stats.total,     icon: FileText,     color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
                { label: "Pending Approval", value: stats.pending,   icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
                { label: "Approved",         value: stats.approved,  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
                { label: "This Month",       value: stats.thisMonth, icon: Calendar,     color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200" },
              ].map(s => (
                <div key={s.label} className={cn("bg-white border rounded-xl p-4 flex items-center gap-3", s.border)}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                    <s.icon size={18} className={s.color} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-40 text-gray-400">
                <Loader2 size={22} className="animate-spin mr-2" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <GitBranch size={40} className="mb-3 opacity-30" />
                <p className="text-sm text-gray-500">No modification logs yet</p>
                <p className="text-xs text-gray-400 mt-1">Document every program change for management review and future reference</p>
                <button onClick={openNew}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  <Plus size={14} /> Create First Entry
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Mod No", "Project", "Device", "Type", "Modified By", "Date", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr
                        key={item.id}
                        onClick={() => openEdit(item)}
                        className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-blue-600 font-bold">{item.mod_no || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {item.project_name || "Unnamed"}
                          </p>
                          {item.project_number && (
                            <p className="text-xs text-blue-600 font-mono">{item.project_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{item.device_type || "—"}</p>
                          {(item.device_make || item.device_model) && (
                            <p className="text-xs text-gray-400 truncate max-w-[120px]">
                              {[item.device_make, item.device_model].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={item.modification_type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-gray-400" />
                            <span className="text-gray-700 truncate max-w-[110px]">{item.modified_by || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {fmtDate(item.modification_date || item.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Detail / Edit View ────────────────────────────────────────────── */}
        {inDetail && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Horizontal tab bar */}
            <div className="flex-none bg-white border-b border-gray-200 px-6">
              <div className="flex gap-0 overflow-x-auto">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                        active
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                      )}>
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl">

              {/* OVERVIEW ─────────────────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={FolderOpen} title="Project Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Project Number" value={form.project_number || ""} onChange={v => sf("project_number", v)} placeholder="e.g. WTT-2024-001" />
                      <Field label="Project Name" value={form.project_name || ""} onChange={v => sf("project_name", v)} placeholder="e.g. Vadodara MBR Plant" />
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={Cpu} title="Device Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Device Type" value={form.device_type || "PLC"} onChange={v => sf("device_type", v)} options={DEVICE_TYPES} />
                      <Field label="Device Make" value={form.device_make || ""} onChange={v => sf("device_make", v)} placeholder="e.g. Siemens, Beckhoff" />
                      <Field label="Device Model" value={form.device_model || ""} onChange={v => sf("device_model", v)} placeholder="e.g. S7-1200, CX2020" />
                      <Field label="Program Reference" value={form.program_ref || ""} onChange={v => sf("program_ref", v)} placeholder="PLC/HMI program no." />
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={User} title="Change Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Modification Type" value={form.modification_type || "Bug Fix"} onChange={v => sf("modification_type", v)} options={MOD_TYPES} />
                      <Field label="Status" value={form.status || "Draft"} onChange={v => sf("status", v as Status)} options={STATUSES} />
                      <Field label="Modification Date" value={form.modification_date || ""} onChange={v => sf("modification_date", v)} type="date" />
                      <Field label="Modified By" value={form.modified_by || ""} onChange={v => sf("modified_by", v)} placeholder="Engineer name" />
                    </div>
                  </div>
                </div>
              )}

              {/* MODIFICATION ────────────────────────────────────────────── */}
              {activeTab === "modification" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Wrench} title="What Was Changed" />
                    <div className="grid grid-cols-1 gap-y-4">
                      <Field
                        label="Description of Modification"
                        value={form.description || ""}
                        onChange={v => sf("description", v)}
                        textarea rows={5}
                        placeholder="Briefly describe what was changed in the program logic, parameters, or configuration…"
                      />
                      <Field
                        label="Reason / Justification"
                        value={form.reason || ""}
                        onChange={v => sf("reason", v)}
                        textarea rows={4}
                        placeholder="Why was this modification necessary? (e.g. customer request, fault condition, process optimisation…)"
                      />
                      <Field
                        label="Remarks / Additional Notes"
                        value={form.remarks || ""}
                        onChange={v => sf("remarks", v)}
                        textarea rows={3}
                        placeholder="Any other relevant information…"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BEFORE & AFTER ──────────────────────────────────────────── */}
              {activeTab === "changes" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={RefreshIcon} title="Program State Before & After" />
                    <p className="text-xs text-gray-500 mb-4 -mt-2">
                      Document the exact before and after state so management and future engineers can understand exactly what was modified.
                    </p>
                    <div className="grid grid-cols-1 gap-y-4">
                      <Field
                        label="State Before Modification"
                        value={form.changes_before || ""}
                        onChange={v => sf("changes_before", v)}
                        textarea rows={5}
                        placeholder="Describe the program logic, setpoints, or configuration BEFORE this change…"
                      />
                      <Field
                        label="State After Modification"
                        value={form.changes_after || ""}
                        onChange={v => sf("changes_after", v)}
                        textarea rows={5}
                        placeholder="Describe the program logic, setpoints, or configuration AFTER this change…"
                      />
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={Shield} title="Impact & Testing" />
                    <div className="grid grid-cols-1 gap-y-4">
                      <Field
                        label="Impact Assessment"
                        value={form.impact_assessment || ""}
                        onChange={v => sf("impact_assessment", v)}
                        textarea rows={4}
                        placeholder="What is the potential impact of this change on plant operation, safety, or performance?"
                      />
                      <Field
                        label="Testing Done"
                        value={form.testing_done || ""}
                        onChange={v => sf("testing_done", v)}
                        textarea rows={4}
                        placeholder="Describe testing carried out after the modification (simulation, live test, FAT, SAT, operator sign-off…)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* APPROVAL ────────────────────────────────────────────────── */}
              {activeTab === "approval" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Shield} title="Management Approval" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Approved By" value={form.approved_by || ""} onChange={v => sf("approved_by", v)} placeholder="Manager / Lead name" />
                      <Field label="Approval Date" value={form.approval_date || ""} onChange={v => sf("approval_date", v)} type="date" />
                      <Field label="Approval Status" value={form.status || "Draft"} onChange={v => sf("status", v as Status)} options={STATUSES} />
                    </div>
                  </div>

                  {/* Read-only summary */}
                  {(selected || form.project_name) && (
                    <div>
                      <SectionHead icon={FileText} title="Modification Summary" />
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          {[
                            ["Mod No",        form.mod_no || selected?.mod_no || "Auto-assigned"],
                            ["Project",       form.project_name || "—"],
                            ["Project No.",   form.project_number || "—"],
                            ["Device",        `${form.device_type || "—"} — ${[form.device_make, form.device_model].filter(Boolean).join(" ") || "—"}`],
                            ["Type",          form.modification_type || "—"],
                            ["Modified By",   form.modified_by || "—"],
                            ["Date",          fmtDate(form.modification_date)],
                          ].map(([label, val]) => (
                            <div key={label} className="flex flex-col">
                              <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                              <span className="text-gray-800 mt-0.5">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
