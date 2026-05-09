import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, ChevronDown, Edit2, Send,
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Mail, Printer,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type OverallResult = "Pending" | "Pass" | "Fail" | "Conditional Pass";
type InspStatus = "Draft" | "Submitted" | "Approved";
type CheckResult = "" | "Yes" | "No" | "NA";
type IssueSeverity = "Critical" | "Major" | "Minor";
type IssueStatus = "Open" | "Closed";

const PANEL_TYPES = ["MCC", "PLC Panel", "Distribution Board", "Control Panel", "Junction Box", "VFD Panel", "Power Panel", "Other"];
const OVERALL_RESULTS: OverallResult[] = ["Pending", "Pass", "Fail", "Conditional Pass"];
const INSP_STATUSES: InspStatus[] = ["Draft", "Submitted", "Approved"];

const RESULT_META: Record<OverallResult, { color: string; bg: string; border: string; dot: string }> = {
  "Pending":          { color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200", dot: "bg-slate-400"  },
  "Pass":             { color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500"},
  "Fail":             { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
  "Conditional Pass": { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
};

interface ChecklistItem { section: string; item: string; result: CheckResult; remarks: string; }
interface IssueItem { description: string; severity: IssueSeverity; status: IssueStatus; remarks: string; }

interface Inspection {
  id?: number;
  inspection_no?: string;
  project_number?: string;
  project_name?: string;
  panel_name?: string;
  panel_type?: string;
  panel_serial_no?: string;
  inspection_date?: string;
  inspector_name?: string;
  customer_name?: string;
  checklist?: ChecklistItem[];
  issues?: IssueItem[];
  overall_result?: OverallResult;
  remarks?: string;
  email_to?: string;
  status?: InspStatus;
  created_by?: string;
  created_at?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { section: "Mechanical & Physical", item: "Panel dimensions match approved drawings", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "Panel finish (painting / powder coating) quality acceptable", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "Cable glands properly fitted and sealed", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "Door hinges, locks and handles functional", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "Nameplate / identification label fitted", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "Earthing bus bar installed and connected", result: "", remarks: "" },
  { section: "Mechanical & Physical", item: "DIN rails properly mounted and secured", result: "", remarks: "" },
  { section: "Component Verification", item: "All components installed as per approved BOM", result: "", remarks: "" },
  { section: "Component Verification", item: "MCB / MCCB ratings match drawing specifications", result: "", remarks: "" },
  { section: "Component Verification", item: "Contactor and relay ratings verified", result: "", remarks: "" },
  { section: "Component Verification", item: "PLC / controller modules properly seated", result: "", remarks: "" },
  { section: "Component Verification", item: "I/O modules installed and correctly identified", result: "", remarks: "" },
  { section: "Component Verification", item: "Terminal blocks properly labelled", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "Ferrule / conductor numbers match approved drawings", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "Wire markers and labels fitted on all conductors", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "Control wiring neat and properly dressed", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "Power wiring neat and properly dressed", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "All terminations tight and secure", result: "", remarks: "" },
  { section: "Wiring & Termination", item: "Earth / ground connections complete and verified", result: "", remarks: "" },
  { section: "Functional Testing", item: "Insulation resistance test completed and acceptable", result: "", remarks: "" },
  { section: "Functional Testing", item: "Control supply voltage verified at panel", result: "", remarks: "" },
  { section: "Functional Testing", item: "Power supply voltage verified at panel", result: "", remarks: "" },
  { section: "Functional Testing", item: "I/O function test completed successfully", result: "", remarks: "" },
  { section: "Functional Testing", item: "Communication links tested (if applicable)", result: "", remarks: "" },
  { section: "Functional Testing", item: "Alarm and indicator lamps tested", result: "", remarks: "" },
];

const EMPTY_INSPECTION: Inspection = {
  overall_result: "Pending",
  status: "Draft",
  checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
  issues: [],
};

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

const CHECK_RESULT_BTNS: { val: CheckResult; label: string; active: string; inactive: string }[] = [
  { val: "Yes", label: "Yes", active: "bg-emerald-600 text-white border-emerald-600", inactive: "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600" },
  { val: "No",  label: "No",  active: "bg-red-600 text-white border-red-600",        inactive: "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"      },
  { val: "NA",  label: "N/A", active: "bg-slate-500 text-white border-slate-500",    inactive: "border-slate-200 text-slate-400 hover:border-slate-400"                       },
];

export default function PLCPanelInspection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection>(EMPTY_INSPECTION);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (resultFilter !== "All") params.set("result", resultFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/panel-inspections?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, resultFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing({ ...EMPTY_INSPECTION, created_by: user?.email, checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })), issues: [] });
    setActiveSection("Mechanical & Physical");
    setDrawerOpen(true);
  };

  const openEdit = async (item: Inspection) => {
    try {
      const r = await fetch(`${BASE}/api/plc/panel-inspections/${item.id}`);
      const full = await r.json();
      setEditing({
        ...full,
        checklist: Array.isArray(full.checklist) && full.checklist.length > 0 ? full.checklist : DEFAULT_CHECKLIST.map(c => ({ ...c })),
        issues: Array.isArray(full.issues) ? full.issues : [],
      });
      setActiveSection("Mechanical & Physical");
      setDrawerOpen(true);
    } catch { toast({ title: "Could not load inspection", variant: "destructive" }); }
  };

  const closeDrawer = () => { setDrawerOpen(false); };

  const save = async () => {
    if (!editing.panel_name?.trim() && !editing.project_name?.trim()) {
      toast({ title: "Panel Name or Project Name required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/panel-inspections/${editing.id}` : `${BASE}/api/plc/panel-inspections`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      if (!editing.id) {
        const created = await r.json();
        setEditing(prev => ({ ...prev, id: created.id }));
      }
      toast({ title: editing.id ? "Inspection updated" : "Inspection created" });
      load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/panel-inspections/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const sendEmail = async () => {
    if (!editing.id) { await save(); }
    if (!editing.email_to?.trim()) { toast({ title: "Enter recipient email first", variant: "destructive" }); return; }
    setSendingEmail(true);
    try {
      const r = await fetch(`${BASE}/api/plc/panel-inspections/${editing.id}/send-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_to: editing.email_to }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast({ title: `Report sent to ${d.sent_to}` });
    } catch (e: any) { toast({ title: "Email failed", description: e.message, variant: "destructive" }); }
    finally { setSendingEmail(false); }
  };

  const field = (k: keyof Inspection, val: any) => setEditing(p => ({ ...p, [k]: val }));

  const updateChecklist = (idx: number, key: keyof ChecklistItem, val: string) => {
    const cl = [...(editing.checklist ?? [])];
    cl[idx] = { ...cl[idx], [key]: val };
    setEditing(p => ({ ...p, checklist: cl }));
  };

  const addIssue = () => {
    const issues = [...(editing.issues ?? []), { description: "", severity: "Minor" as IssueSeverity, status: "Open" as IssueStatus, remarks: "" }];
    setEditing(p => ({ ...p, issues }));
  };

  const updateIssue = (idx: number, key: keyof IssueItem, val: string) => {
    const issues = [...(editing.issues ?? [])];
    issues[idx] = { ...issues[idx], [key]: val } as IssueItem;
    setEditing(p => ({ ...p, issues }));
  };

  const removeIssue = (idx: number) => {
    const issues = (editing.issues ?? []).filter((_, i) => i !== idx);
    setEditing(p => ({ ...p, issues }));
  };

  const total = items.length;
  const pass = items.filter(i => i.overall_result === "Pass").length;
  const fail = items.filter(i => i.overall_result === "Fail").length;
  const conditional = items.filter(i => i.overall_result === "Conditional Pass").length;

  const sections = [...new Set(DEFAULT_CHECKLIST.map(c => c.section))];
  const checklist = editing.checklist ?? [];

  const sectionStats = (sec: string) => {
    const items = checklist.filter(c => c.section === sec);
    const done = items.filter(c => c.result !== "").length;
    const no = items.filter(c => c.result === "No").length;
    return { total: items.length, done, no };
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-600 shadow-sm shadow-orange-200">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Panel Inspection — Pre-Dispatch</h1>
                <p className="text-xs text-slate-500 mt-0.5">Quality checklist, issue tracking & dispatch clearance report</p>
              </div>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Inspection
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Inspections" value={total} sub="all panels" color="text-slate-800" />
            <StatCard label="Pass" value={pass} sub="cleared for dispatch" color="text-emerald-600" />
            <StatCard label="Fail" value={fail} sub="rework required" color="text-red-600" />
            <StatCard label="Conditional" value={conditional} sub="minor issues" color="text-amber-600" />
          </div>

          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project, panel name, inspection no…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
            </div>
            <div className="relative">
              <select value={resultFilter} onChange={e => setResultFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30">
                <option value="All">All Results</option>
                {OVERALL_RESULTS.map(r => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30">
                <option value="All">All Statuses</option>
                {INSP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No inspections found</p>
                <p className="text-sm mt-1">Click "New Inspection" to create your first pre-dispatch checklist</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspection</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Panel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspector</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const rm = RESULT_META[item.overall_result as OverallResult] ?? RESULT_META["Pending"];
                      return (
                        <tr key={item.id} className="hover:bg-orange-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.inspection_no || `PID-${String(item.id).padStart(4, "0")}`}</div>
                            {item.panel_type && <div className="text-xs text-slate-400 mt-0.5">{item.panel_type}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-medium">{item.panel_name || <span className="text-slate-300">—</span>}</div>
                            {item.panel_serial_no && <div className="text-xs text-slate-400 font-mono">{item.panel_serial_no}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.project_name || <span className="text-slate-300">—</span>}
                            {item.project_number && <div className="text-slate-400 font-mono">{item.project_number}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{item.inspector_name || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.inspection_date ? fmtDate(item.inspection_date) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", rm.bg, rm.color, rm.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", rm.dot)} />
                              {item.overall_result || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full",
                              item.status === "Approved" ? "bg-emerald-50 text-emerald-700" :
                              item.status === "Submitted" ? "bg-blue-50 text-blue-700" :
                              "bg-slate-100 text-slate-600")}>{item.status || "Draft"}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                  {items.length} inspection{items.length !== 1 ? "s" : ""} found
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-700 to-orange-600 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Inspection" : "New Panel Inspection"}</h2>
                  <p className="text-orange-200 text-xs mt-0.5">Pre-Dispatch Quality Checklist</p>
                </div>
                <div className="flex items-center gap-2">
                  {editing.id && (
                    <button onClick={() => setDeleteId(editing.id!)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Inspection Details<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection No.</label>
                      <input value={editing.inspection_no ?? ""} onChange={e => field("inspection_no", e.target.value)}
                        placeholder="PI-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection Date</label>
                      <input type="date" value={editing.inspection_date ?? ""} onChange={e => field("inspection_date", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Number</label>
                      <input value={editing.project_number ?? ""} onChange={e => field("project_number", e.target.value)}
                        placeholder="WTT-2025-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="CETP Plant" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Client</label>
                      <input value={editing.customer_name ?? ""} onChange={e => field("customer_name", e.target.value)}
                        placeholder="ABC Industries" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspector Name</label>
                      <input value={editing.inspector_name ?? ""} onChange={e => field("inspector_name", e.target.value)}
                        placeholder="Engineer Name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Panel Details<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Panel Name / Tag <span className="text-red-500">*</span></label>
                      <input value={editing.panel_name ?? ""} onChange={e => field("panel_name", e.target.value)}
                        placeholder="Panel Tag or Name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Panel Type</label>
                      <select value={editing.panel_type ?? ""} onChange={e => field("panel_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        <option value="">Select type…</option>
                        {PANEL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Serial No.</label>
                      <input value={editing.panel_serial_no ?? ""} onChange={e => field("panel_serial_no", e.target.value)}
                        placeholder="SN-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Doc / Drawing Ref.</label>
                      <input placeholder="Drawing No." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Inspection Checklist<span className="flex-1 h-px bg-slate-100" />
                  </h3>

                  <div className="flex gap-2 flex-wrap mb-4">
                    {sections.map(sec => {
                      const st = sectionStats(sec);
                      return (
                        <button key={sec} onClick={() => setActiveSection(sec === activeSection ? null : sec)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5",
                            activeSection === sec
                              ? "bg-orange-600 text-white border-orange-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-orange-300")}>
                          {sec.split(" ")[0]}
                          <span className={cn("text-xs font-bold", st.no > 0 ? "text-red-300" : "opacity-60")}>
                            {st.done}/{st.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {sections.filter(s => !activeSection || s === activeSection).map(section => (
                    <div key={section} className="mb-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">{section}</div>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        {checklist.filter(c => c.section === section).map((item, sectionIdx) => {
                          const globalIdx = checklist.findIndex(c => c === item);
                          return (
                            <div key={sectionIdx} className={cn("flex flex-col gap-2 p-3 border-b border-slate-100 last:border-0",
                              item.result === "No" ? "bg-red-50/50" : item.result === "Yes" ? "bg-emerald-50/30" : "bg-white")}>
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="text-sm text-slate-700 leading-snug">{item.item}</div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  {CHECK_RESULT_BTNS.map(btn => (
                                    <button key={btn.val}
                                      onClick={() => updateChecklist(globalIdx, "result", item.result === btn.val ? "" : btn.val)}
                                      className={cn("px-2.5 py-1 rounded-md text-xs font-bold border transition-colors",
                                        item.result === btn.val ? btn.active : btn.inactive)}>
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {(item.result === "No" || item.remarks) && (
                                <input value={item.remarks} onChange={e => updateChecklist(globalIdx, "remarks", e.target.value)}
                                  placeholder="Add remark or observation…"
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="flex-1 h-px bg-slate-100" />Issues / Findings<span className="flex-1 h-px bg-slate-100" />
                    </h3>
                    <button onClick={addIssue}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Issue
                    </button>
                  </div>

                  {(editing.issues ?? []).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                      <p className="text-sm text-slate-500 font-medium">No issues recorded</p>
                      <p className="text-xs">Click "Add Issue" if any findings are observed</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(editing.issues ?? []).map((issue, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1">
                              <input value={issue.description} onChange={e => updateIssue(idx, "description", e.target.value)}
                                placeholder="Issue description…"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                            </div>
                            <button onClick={() => removeIssue(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Severity</label>
                              <select value={issue.severity} onChange={e => updateIssue(idx, "severity", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                                {(["Critical", "Major", "Minor"] as IssueSeverity[]).map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Status</label>
                              <select value={issue.status} onChange={e => updateIssue(idx, "status", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                                {(["Open", "Closed"] as IssueStatus[]).map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Remarks</label>
                              <input value={issue.remarks} onChange={e => updateIssue(idx, "remarks", e.target.value)}
                                placeholder="Remarks"
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Final Result & Clearance<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Overall Result</label>
                      <div className="flex gap-2 flex-wrap">
                        {OVERALL_RESULTS.map(r => {
                          const active = editing.overall_result === r;
                          const colors: Record<string, string> = {
                            "Pass": active ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            "Fail": active ? "bg-red-600 text-white border-red-600" : "border-red-200 text-red-700 hover:bg-red-50",
                            "Conditional Pass": active ? "bg-amber-500 text-white border-amber-500" : "border-amber-200 text-amber-700 hover:bg-amber-50",
                            "Pending": active ? "bg-slate-600 text-white border-slate-600" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                          };
                          return (
                            <button key={r} onClick={() => field("overall_result", r)}
                              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors", colors[r])}>
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Record Status</label>
                      <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as InspStatus)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        {INSP_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks / Notes</label>
                    <textarea value={editing.remarks ?? ""} onChange={e => field("remarks", e.target.value)} rows={3}
                      placeholder="Any additional notes, conditions, or recommendations…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Send Report<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={editing.email_to ?? ""} onChange={e => field("email_to", e.target.value)}
                        placeholder="customer@email.com" type="email"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <button onClick={sendEmail} disabled={sendingEmail || !editing.email_to?.trim()}
                      className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-semibold transition-colors">
                      {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      Send PDF
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Report will be saved and emailed as a PDF attachment</p>
                </section>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50 flex-shrink-0">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Create"} Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Inspection?</h3>
              <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={() => del(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
