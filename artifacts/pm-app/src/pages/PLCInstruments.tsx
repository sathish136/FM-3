import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Gauge, ChevronDown, Edit2, Send, AlertTriangle, CheckCircle2, Circle, MapPin } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Active" | "Inactive" | "Faulty" | "Spare";
const STATUSES: Status[] = ["Active", "Inactive", "Faulty", "Spare"];
const INSTRUMENT_TYPES = ["Flow", "Level", "Pressure", "Temperature", "Conductivity", "pH", "ORP", "Turbidity", "DO", "Chlorine", "Voltage", "Current", "Speed", "Vibration", "Other"];
const SIGNAL_TYPES = ["4-20 mA", "0-10 V", "0-5 V", "Pulse", "Digital (NO)", "Digital (NC)", "Modbus RTU", "Modbus TCP", "HART", "Profibus", "Wireless"];

const STATUS_META: Record<Status, { color: string; bg: string; border: string; dot: string }> = {
  "Active":   { color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
  "Inactive": { color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200",   dot: "bg-slate-400"   },
  "Faulty":   { color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     dot: "bg-red-500"     },
  "Spare":    { color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500"   },
};

const TYPE_COLORS: Record<string, string> = {
  Flow: "bg-blue-50 text-blue-700 border-blue-100",
  Level: "bg-cyan-50 text-cyan-700 border-cyan-100",
  Pressure: "bg-orange-50 text-orange-700 border-orange-100",
  Temperature: "bg-red-50 text-red-700 border-red-100",
  Conductivity: "bg-purple-50 text-purple-700 border-purple-100",
  pH: "bg-green-50 text-green-700 border-green-100",
  ORP: "bg-teal-50 text-teal-700 border-teal-100",
  Turbidity: "bg-amber-50 text-amber-700 border-amber-100",
  DO: "bg-sky-50 text-sky-700 border-sky-100",
  Chlorine: "bg-lime-50 text-lime-700 border-lime-100",
};

interface Instrument {
  id?: number; tag_no?: string; project_number?: string; project_name?: string;
  instrument_type?: string; make?: string; model?: string; range_min?: string;
  range_max?: string; unit?: string; signal_type?: string; process_connection?: string;
  installation_location?: string; calibration_date?: string; next_calibration?: string;
  status?: Status; notes?: string; created_by?: string; created_at?: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY: Instrument = { status: "Active", instrument_type: "Flow" };

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

export default function PLCInstruments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
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
      if (typeFilter !== "All") params.set("type", typeFilter);
      const r = await fetch(`${BASE}/api/plc/instruments?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

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

  const total = items.length;
  const active = items.filter(i => i.status === "Active").length;
  const faulty = items.filter(i => i.status === "Faulty").length;
  const calibDue = items.filter(i => i.next_calibration && new Date(i.next_calibration) < new Date()).length;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 shadow-sm shadow-teal-200">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Instrument Details</h1>
                <p className="text-xs text-slate-500 mt-0.5">Instrument registry with calibration due-date tracking</p>
              </div>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Instrument
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Instruments" value={total} sub="in registry" color="text-slate-800" />
            <StatCard label="Active" value={active} sub="in service" color="text-emerald-600" />
            <StatCard label="Faulty" value={faulty} sub="need attention" color="text-red-600" />
            <StatCard label="Calibration Due" value={calibDue} sub="overdue" color={calibDue > 0 ? "text-red-600" : "text-slate-400"} />
          </div>

          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by tag, make, model, location…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30">
                <option value="All">All Types</option>
                {INSTRUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30">
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <Gauge className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No instruments found</p>
                <p className="text-sm mt-1">Click "Add Instrument" to start your registry</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag No.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Make / Model</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Range</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Signal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Calibration</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const sm = STATUS_META[item.status as Status] ?? STATUS_META["Active"];
                      const tc = TYPE_COLORS[item.instrument_type ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100";
                      const isCalibDue = item.next_calibration && new Date(item.next_calibration) < new Date();
                      return (
                        <tr key={item.id} className={cn("hover:bg-teal-50/40 transition-colors group cursor-pointer", isCalibDue ? "bg-red-50/20" : "")} onClick={() => openEdit(item)}>
                          <td className="px-4 py-3">
                            <div className="font-bold font-mono text-teal-800 text-sm">{item.tag_no}</div>
                            {item.project_name && <div className="text-xs text-slate-400 mt-0.5">{item.project_name}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {item.instrument_type
                              ? <span className={cn("px-2 py-1 rounded-md text-xs font-semibold border", tc)}>{item.instrument_type}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs">
                            {item.make || item.model
                              ? <><div className="font-medium">{item.make}</div>{item.model && <div className="text-slate-400">{item.model}</div>}</>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-600">
                            {item.range_min != null || item.range_max != null
                              ? <>{item.range_min ?? "—"} – {item.range_max ?? "—"}<br /><span className="text-slate-400">{item.unit}</span></>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{item.signal_type || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {item.installation_location
                              ? <span className="flex items-start gap-1"><MapPin className="w-3 h-3 text-teal-500 mt-0.5 shrink-0" />{item.installation_location}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {item.next_calibration
                              ? <div className={cn("font-medium", isCalibDue ? "text-red-600" : "text-slate-600")}>
                                  {isCalibDue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                  {fmtDate(item.next_calibration)}
                                </div>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", sm.bg, sm.color, sm.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />{item.status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                className="p-1.5 rounded-lg hover:bg-teal-100 text-slate-400 hover:text-teal-600 transition-colors">
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
                  {items.length} instrument{items.length !== 1 ? "s" : ""} found
                  {calibDue > 0 && <span className="ml-3 text-red-500 font-medium">{calibDue} calibration{calibDue > 1 ? "s" : ""} overdue</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-600 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Instrument" : "Add Instrument"}</h2>
                  <p className="text-teal-100 text-xs mt-0.5">Instrument Details & Calibration</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Instrument Identity<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tag No. <span className="text-red-500">*</span></label>
                      <input value={editing.tag_no ?? ""} onChange={e => field("tag_no", e.target.value)}
                        placeholder="FIT-101" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Instrument Type</label>
                      <select value={editing.instrument_type ?? "Flow"} onChange={e => field("instrument_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        {INSTRUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Active"} onChange={e => field("status", e.target.value as Status)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Signal Type</label>
                      <select value={editing.signal_type ?? ""} onChange={e => field("signal_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white">
                        <option value="">Select…</option>
                        {SIGNAL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Make & Model<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Make</label>
                      <input value={editing.make ?? ""} onChange={e => field("make", e.target.value)}
                        placeholder="Endress+Hauser / ABB" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
                      <input value={editing.model ?? ""} onChange={e => field("model", e.target.value)}
                        placeholder="Promag 50 / EB350" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Range & Process<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Range Min</label>
                      <input value={editing.range_min ?? ""} onChange={e => field("range_min", e.target.value)}
                        placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Range Max</label>
                      <input value={editing.range_max ?? ""} onChange={e => field("range_max", e.target.value)}
                        placeholder="100" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                      <input value={editing.unit ?? ""} onChange={e => field("unit", e.target.value)}
                        placeholder="m³/h / bar / °C" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Process Connection</label>
                      <input value={editing.process_connection ?? ""} onChange={e => field("process_connection", e.target.value)}
                        placeholder='1" Flanged / ½" NPT / Wafer' className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="Project name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Installation Location</label>
                      <input value={editing.installation_location ?? ""} onChange={e => field("installation_location", e.target.value)}
                        placeholder="RO Feed Line, Panel Room, MBR Tank…" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Calibration<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Last Calibration</label>
                      <input type="date" value={editing.calibration_date ?? ""} onChange={e => field("calibration_date", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Next Calibration</label>
                      <input type="date" value={editing.next_calibration ?? ""} onChange={e => field("next_calibration", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Notes<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={3}
                    placeholder="Installation notes, calibration history, special remarks…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none" />
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Add"} Instrument
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Instrument?</h3>
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
