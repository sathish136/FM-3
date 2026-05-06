import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, GitBranch, ChevronDown, Circle, Clock, CircleCheck } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "Active" | "Inactive";
const STATUSES: Status[] = ["Draft", "Active", "Inactive"];
const MODES = ["Auto", "Manual", "Cascade", "Ratio", "Feed-Forward"];
const CONTROLLER_TYPES = ["P", "PI", "PD", "PID", "On-Off", "Fuzzy", "Adaptive"];

const STATUS_META: Record<Status, { color: string; bg: string; icon: typeof Circle }> = {
  "Draft":    { color: "text-slate-600",  bg: "bg-slate-100",  icon: Circle      },
  "Active":   { color: "text-green-700",  bg: "bg-green-100",  icon: CircleCheck },
  "Inactive": { color: "text-amber-700",  bg: "bg-amber-100",  icon: Clock       },
};

interface PIDLoop {
  id?: number;
  loop_no?: string;
  project_number?: string;
  project_name?: string;
  loop_tag?: string;
  loop_name?: string;
  process_variable?: string;
  set_point?: string;
  unit?: string;
  kp?: number | string;
  ki?: number | string;
  kd?: number | string;
  mode?: string;
  controller_type?: string;
  output_min?: number | string;
  output_max?: number | string;
  alarm_hh?: number | string;
  alarm_h?: number | string;
  alarm_l?: number | string;
  alarm_ll?: number | string;
  notes?: string;
  status?: Status;
  created_by?: string;
  created_at?: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY: PIDLoop = { mode: "Auto", controller_type: "PID", status: "Draft" };

export default function PLCPIDDesign() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PIDLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PIDLoop>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/pid-loops?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerOpen(true); };
  const openEdit = (item: PIDLoop) => { setEditing(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); };

  const save = async () => {
    if (!editing.loop_tag?.trim()) { toast({ title: "Loop tag required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/pid-loops/${editing.id}` : `${BASE}/api/plc/pid-loops`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing.id ? "PID loop updated" : "PID loop created" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/pid-loops/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof PIDLoop, val: any) => setEditing(p => ({ ...p, [k]: val }));
  const numField = (k: keyof PIDLoop, val: string) => setEditing(p => ({ ...p, [k]: val === "" ? undefined : val }));

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-600/10"><GitBranch className="w-5 h-5 text-orange-600" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">PID Design</h1>
              <p className="text-xs text-slate-500">Configure PID control loops with tuning parameters</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
            <Plus className="w-4 h-4" /> New PID Loop
          </button>
        </div>

        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by loop tag, name, project…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No PID loops found</p>
              <p className="text-sm mt-1">Create your first PID loop to get started</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map(item => {
                const sm = STATUS_META[item.status as Status] ?? STATUS_META["Draft"];
                const Icon = sm.icon;
                return (
                  <div key={item.id} onClick={() => openEdit(item)}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-orange-300 cursor-pointer transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 shrink-0"><GitBranch className="w-5 h-5 text-orange-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.loop_no && <span className="text-xs font-mono text-slate-400">{item.loop_no}</span>}
                          <span className="font-mono font-bold text-orange-700">{item.loop_tag}</span>
                          {item.loop_name && <span className="font-medium text-slate-700">{item.loop_name}</span>}
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", sm.bg, sm.color)}>
                            <Icon className="w-3 h-3" />{item.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.project_name && <span>{item.project_name}</span>}
                          {item.process_variable && <span>PV: {item.process_variable}{item.unit ? ` (${item.unit})` : ""}</span>}
                          {item.set_point && <span>SP: {item.set_point}{item.unit ? ` ${item.unit}` : ""}</span>}
                          <span>{item.controller_type ?? "PID"} · {item.mode ?? "Auto"}</span>
                          {(item.kp != null || item.ki != null || item.kd != null) && (
                            <span className="font-mono text-orange-600">
                              Kp={item.kp ?? "—"} Ki={item.ki ?? "—"} Kd={item.kd ?? "—"}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-orange-700 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit PID Loop" : "New PID Loop"}</h2>
                  <p className="text-orange-200 text-xs mt-0.5">PID Control Loop Configuration</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-orange-600 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Loop Identity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Loop No.</label>
                      <input value={editing.loop_no ?? ""} onChange={e => field("loop_no", e.target.value)}
                        placeholder="PID-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Loop Tag <span className="text-red-500">*</span></label>
                      <input value={editing.loop_tag ?? ""} onChange={e => field("loop_tag", e.target.value)}
                        placeholder="FIC-101" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Loop Name</label>
                      <input value={editing.loop_name ?? ""} onChange={e => field("loop_name", e.target.value)}
                        placeholder="Feed Flow Controller" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as Status)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="Project name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Process Variable</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Process Variable (PV)</label>
                      <input value={editing.process_variable ?? ""} onChange={e => field("process_variable", e.target.value)}
                        placeholder="Flow Rate / Level / Temperature" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                      <input value={editing.unit ?? ""} onChange={e => field("unit", e.target.value)}
                        placeholder="m³/h / % / °C" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Set Point</label>
                      <input value={editing.set_point ?? ""} onChange={e => field("set_point", e.target.value)}
                        placeholder="100" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Controller Type</label>
                      <select value={editing.controller_type ?? "PID"} onChange={e => field("controller_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        {CONTROLLER_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                      <select value={editing.mode ?? "Auto"} onChange={e => field("mode", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        {MODES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">PID Tuning Parameters</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(["kp", "ki", "kd"] as const).map(k => (
                      <div key={k}>
                        <label className="block text-xs font-medium text-slate-600 mb-1 uppercase">{k}</label>
                        <input type="number" step="any" value={editing[k] ?? ""} onChange={e => numField(k, e.target.value)}
                          placeholder="0.0" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Output Min (%)</label>
                      <input type="number" step="any" value={editing.output_min ?? ""} onChange={e => numField("output_min", e.target.value)}
                        placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Output Max (%)</label>
                      <input type="number" step="any" value={editing.output_max ?? ""} onChange={e => numField("output_max", e.target.value)}
                        placeholder="100" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Alarm Limits</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {([["alarm_hh","HH (High-High)"], ["alarm_h","H (High)"], ["alarm_l","L (Low)"], ["alarm_ll","LL (Low-Low)"]] as const).map(([k, lbl]) => (
                      <div key={k}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{lbl}</label>
                        <input type="number" step="any" value={(editing as any)[k] ?? ""} onChange={e => numField(k as any, e.target.value)}
                          placeholder="—" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Notes</h3>
                  <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={3}
                    placeholder="Tuning notes, process descriptions, special remarks…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" />
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-5 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing.id ? "Update" : "Create"} PID Loop
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-bold text-slate-800 mb-2">Delete PID Loop?</h3>
              <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={() => del(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
