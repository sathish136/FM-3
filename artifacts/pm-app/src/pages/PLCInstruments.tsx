import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Gauge, ChevronDown, Circle, CircleCheck, AlertTriangle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Active" | "Inactive" | "Faulty" | "Spare";
const STATUSES: Status[] = ["Active", "Inactive", "Faulty", "Spare"];
const INSTRUMENT_TYPES = ["Flow", "Level", "Pressure", "Temperature", "Conductivity", "pH", "ORP", "Turbidity", "DO", "Chlorine", "Voltage", "Current", "Speed", "Vibration", "Other"];
const SIGNAL_TYPES = ["4-20 mA", "0-10 V", "0-5 V", "Pulse", "Digital (NO)", "Digital (NC)", "Modbus RTU", "Modbus TCP", "HART", "Profibus", "Wireless"];

const STATUS_META: Record<Status, { color: string; bg: string; icon: typeof Circle }> = {
  "Active":   { color: "text-green-700",  bg: "bg-green-100",  icon: CircleCheck   },
  "Inactive": { color: "text-slate-600",  bg: "bg-slate-100",  icon: Circle        },
  "Faulty":   { color: "text-red-700",    bg: "bg-red-100",    icon: AlertTriangle },
  "Spare":    { color: "text-amber-700",  bg: "bg-amber-100",  icon: Circle        },
};

interface Instrument {
  id?: number;
  tag_no?: string;
  project_number?: string;
  project_name?: string;
  instrument_type?: string;
  make?: string;
  model?: string;
  range_min?: string;
  range_max?: string;
  unit?: string;
  signal_type?: string;
  process_connection?: string;
  installation_location?: string;
  calibration_date?: string;
  next_calibration?: string;
  status?: Status;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY: Instrument = { status: "Active", instrument_type: "Flow" };

export default function PLCInstruments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Instrument>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/instruments?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerOpen(true); };
  const openEdit = (item: Instrument) => { setEditing(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); };

  const save = async () => {
    if (!editing.tag_no?.trim()) { toast({ title: "Tag number required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/instruments/${editing.id}` : `${BASE}/api/plc/instruments`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing.id ? "Instrument updated" : "Instrument added" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/instruments/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof Instrument, val: any) => setEditing(p => ({ ...p, [k]: val }));

  const typeColor: Record<string, string> = {
    Flow: "bg-blue-100 text-blue-700", Level: "bg-cyan-100 text-cyan-700",
    Pressure: "bg-orange-100 text-orange-700", Temperature: "bg-red-100 text-red-700",
    Conductivity: "bg-purple-100 text-purple-700", pH: "bg-green-100 text-green-700",
    ORP: "bg-teal-100 text-teal-700", Turbidity: "bg-amber-100 text-amber-700",
    DO: "bg-sky-100 text-sky-700",
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-600/10"><Gauge className="w-5 h-5 text-teal-600" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Instrument Details</h1>
              <p className="text-xs text-slate-500">Instrument registry with calibration tracking</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Instrument
          </button>
        </div>

        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by tag, type, make, project…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No instruments found</p>
              <p className="text-sm mt-1">Add your first instrument to the registry</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map(item => {
                const sm = STATUS_META[item.status as Status] ?? STATUS_META["Active"];
                const Icon = sm.icon;
                const tc = typeColor[item.instrument_type ?? ""] ?? "bg-slate-100 text-slate-600";
                const isCalibDue = item.next_calibration && new Date(item.next_calibration) < new Date();
                return (
                  <div key={item.id} onClick={() => openEdit(item)}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-teal-300 cursor-pointer transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 shrink-0"><Gauge className="w-5 h-5 text-teal-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-teal-800">{item.tag_no}</span>
                          {item.instrument_type && <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tc)}>{item.instrument_type}</span>}
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", sm.bg, sm.color)}>
                            <Icon className="w-3 h-3" />{item.status}
                          </span>
                          {isCalibDue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Calibration Due</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {(item.make || item.model) && <span>{[item.make, item.model].filter(Boolean).join(" ")}</span>}
                          {(item.range_min != null || item.range_max != null) && <span>Range: {item.range_min ?? "—"}–{item.range_max ?? "—"} {item.unit}</span>}
                          {item.signal_type && <span>{item.signal_type}</span>}
                          {item.installation_location && <span>📍 {item.installation_location}</span>}
                          {item.project_name && <span>{item.project_name}</span>}
                          {item.next_calibration && <span>Next Cal: {fmtDate(item.next_calibration)}</span>}
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
              <div className="px-6 py-4 bg-teal-700 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Instrument" : "Add Instrument"}</h2>
                  <p className="text-teal-200 text-xs mt-0.5">Instrument Details & Calibration</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-teal-600 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Instrument Identity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tag No. <span className="text-red-500">*</span></label>
                      <input value={editing.tag_no ?? ""} onChange={e => field("tag_no", e.target.value)}
                        placeholder="FIT-101" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Instrument Type</label>
                      <select value={editing.instrument_type ?? "Flow"} onChange={e => field("instrument_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        {INSTRUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Active"} onChange={e => field("status", e.target.value as Status)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Signal Type</label>
                      <select value={editing.signal_type ?? ""} onChange={e => field("signal_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        <option value="">Select…</option>
                        {SIGNAL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Make & Model</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Make</label>
                      <input value={editing.make ?? ""} onChange={e => field("make", e.target.value)}
                        placeholder="Endress+Hauser / ABB" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                      <input value={editing.model ?? ""} onChange={e => field("model", e.target.value)}
                        placeholder="Promag 50 / EB350" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Range & Process</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Range Min</label>
                      <input value={editing.range_min ?? ""} onChange={e => field("range_min", e.target.value)}
                        placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Range Max</label>
                      <input value={editing.range_max ?? ""} onChange={e => field("range_max", e.target.value)}
                        placeholder="100" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                      <input value={editing.unit ?? ""} onChange={e => field("unit", e.target.value)}
                        placeholder="m³/h / bar / °C" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Process Connection</label>
                      <input value={editing.process_connection ?? ""} onChange={e => field("process_connection", e.target.value)}
                        placeholder='1" Flanged / ½" NPT / Wafer' className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="Project name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Installation Location</label>
                      <input value={editing.installation_location ?? ""} onChange={e => field("installation_location", e.target.value)}
                        placeholder="RO Feed Line, Panel Room, MBR Tank…" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Calibration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Last Calibration</label>
                      <input type="date" value={editing.calibration_date ?? ""} onChange={e => field("calibration_date", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Next Calibration</label>
                      <input type="date" value={editing.next_calibration ?? ""} onChange={e => field("next_calibration", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Notes</h3>
                  <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={3}
                    placeholder="Installation notes, calibration history, special remarks…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing.id ? "Update" : "Add"} Instrument
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-bold text-slate-800 mb-2">Delete Instrument?</h3>
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
