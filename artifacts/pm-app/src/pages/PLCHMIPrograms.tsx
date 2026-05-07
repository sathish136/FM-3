import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Monitor, ChevronDown, Edit2, Send, Layout as LayoutIcon } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "In Progress" | "Completed" | "Released";
const STATUSES: Status[] = ["Draft", "In Progress", "Completed", "Released"];

const STATUS_META: Record<Status, { color: string; bg: string; border: string; dot: string }> = {
  "Draft":       { color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200",  dot: "bg-slate-400"   },
  "In Progress": { color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",  dot: "bg-amber-500"   },
  "Completed":   { color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",   dot: "bg-blue-500"    },
  "Released":    { color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",dot: "bg-emerald-500" },
};

interface HMIProgram {
  id?: number; program_no?: string; project_number?: string; project_name?: string;
  hmi_make?: string; hmi_model?: string; software?: string; screen_count?: number;
  version?: string; status?: Status; description?: string; notes?: string;
  created_by?: string; created_at?: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY: HMIProgram = { version: "1.0", status: "Draft", screen_count: 0 };

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

export default function PLCHMIPrograms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<HMIProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<HMIProgram>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/hmi-programs?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerOpen(true); };
  const openEdit = (item: HMIProgram) => { setEditing(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); };

  const save = async () => {
    if (!editing.hmi_make?.trim() && !editing.program_no?.trim()) {
      toast({ title: "HMI Make or Program No. required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/hmi-programs/${editing.id}` : `${BASE}/api/plc/hmi-programs`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing.id ? "HMI Program updated" : "HMI Program created" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/hmi-programs/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof HMIProgram, val: any) => setEditing(p => ({ ...p, [k]: val }));

  const total = items.length;
  const released = items.filter(i => i.status === "Released").length;
  const inProgress = items.filter(i => i.status === "In Progress").length;
  const totalScreens = items.reduce((sum, i) => sum + (i.screen_count ?? 0), 0);

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600 shadow-sm shadow-violet-200">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">HMI Programs</h1>
                <p className="text-xs text-slate-500 mt-0.5">Screen program registry, software & version tracking</p>
              </div>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New HMI Program
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Programs" value={total} sub="all projects" color="text-slate-800" />
            <StatCard label="Released" value={released} sub="in production" color="text-emerald-600" />
            <StatCard label="In Progress" value={inProgress} sub="active development" color="text-amber-600" />
            <StatCard label="Total Screens" value={totalScreens} sub="across all HMIs" color="text-violet-600" />
          </div>

          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HMI make, model, software, project…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <LayoutIcon className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No HMI programs found</p>
                <p className="text-sm mt-1">Click "New HMI Program" to add your first entry</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">HMI Make / Model</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Software</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Screens</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const sm = STATUS_META[item.status as Status] ?? STATUS_META["Draft"];
                      return (
                        <tr key={item.id} className="hover:bg-violet-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.hmi_make || item.program_no || "—"}</div>
                            {item.program_no && item.hmi_make && <div className="text-xs font-mono text-slate-400 mt-0.5">{item.program_no}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.hmi_make || item.hmi_model
                              ? <>{item.hmi_make}{item.hmi_model ? <span className="text-slate-400"> {item.hmi_model}</span> : ""}</>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.software
                              ? <span className="px-2 py-1 rounded-md bg-violet-50 border border-violet-100 text-violet-700 font-medium">{item.software}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {item.screen_count != null && item.screen_count > 0
                              ? <span className="font-bold text-violet-700">{item.screen_count}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.project_name || <span className="text-slate-300">—</span>}
                            {item.project_number && <div className="text-slate-400 font-mono">{item.project_number}</div>}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-xs">v{item.version || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", sm.bg, sm.color, sm.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />{item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(item.created_at)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                className="p-1.5 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors">
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
                  {items.length} program{items.length !== 1 ? "s" : ""} found
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-violet-700 to-violet-600 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit HMI Program" : "New HMI Program"}</h2>
                  <p className="text-violet-200 text-xs mt-0.5">HMI Screen Program Documentation</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Program Identity<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Program No.</label>
                      <input value={editing.program_no ?? ""} onChange={e => field("program_no", e.target.value)}
                        placeholder="HMI-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                      <input value={editing.version ?? "1.0"} onChange={e => field("version", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as Status)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 bg-white">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Screen Count</label>
                      <input type="number" value={editing.screen_count ?? 0} onChange={e => field("screen_count", Number(e.target.value))}
                        min={0} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Project<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Number</label>
                      <input value={editing.project_number ?? ""} onChange={e => field("project_number", e.target.value)}
                        placeholder="WTT-2025-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="CETP Plant" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />HMI Hardware & Software<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">HMI Make <span className="text-red-500">*</span></label>
                      <input value={editing.hmi_make ?? ""} onChange={e => field("hmi_make", e.target.value)}
                        placeholder="Siemens / Weintek / Delta" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">HMI Model</label>
                      <input value={editing.hmi_model ?? ""} onChange={e => field("hmi_model", e.target.value)}
                        placeholder="KTP700 / MT8072iE" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Software Used</label>
                      <input value={editing.software ?? ""} onChange={e => field("software", e.target.value)}
                        placeholder="TIA Portal / EBpro / DOPSoft" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Description & Notes<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                      <textarea value={editing.description ?? ""} onChange={e => field("description", e.target.value)} rows={3}
                        placeholder="Describe the HMI program and its screens…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                      <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={2}
                        placeholder="Revision history, special remarks…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none" />
                    </div>
                  </div>
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Create"} HMI Program
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete HMI Program?</h3>
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
