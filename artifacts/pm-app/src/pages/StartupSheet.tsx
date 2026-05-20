import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Droplets, Gauge, FlaskConical,
  Edit2, Send, RefreshCw, ChevronDown,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StartupRecord {
  id: number;
  site_name: string;
  startup_date: string;
  plant_type: string;
  capacity_m3_per_day: number | null;
  feed_flow_lph: number | null;
  permeate_flow_lph: number | null;
  reject_flow_lph: number | null;
  feed_pressure_bar: number | null;
  op_pressure_bar: number | null;
  feed_tds_ppm: number | null;
  permeate_tds_ppm: number | null;
  feed_ph: number | null;
  permeate_ph: number | null;
  antiscalant_dose_ppm: number | null;
  chlorine_dose_ppm: number | null;
  chemical_notes: string | null;
  remarks: string | null;
  operator: string | null;
  created_at: string;
}

const EMPTY = {
  site_name: "",
  startup_date: new Date().toISOString().slice(0, 10),
  plant_type: "RO",
  capacity_m3_per_day: "" as string,
  feed_flow_lph: "" as string,
  permeate_flow_lph: "" as string,
  reject_flow_lph: "" as string,
  feed_pressure_bar: "" as string,
  op_pressure_bar: "" as string,
  feed_tds_ppm: "" as string,
  permeate_tds_ppm: "" as string,
  feed_ph: "" as string,
  permeate_ph: "" as string,
  antiscalant_dose_ppm: "" as string,
  chlorine_dose_ppm: "" as string,
  chemical_notes: "",
  remarks: "",
  operator: "",
};
type FormState = typeof EMPTY;

const PLANT_TYPES = ["RO", "MBR", "STP", "ETP", "UF", "Other"];

const PLANT_COLOR: Record<string, string> = {
  RO: "bg-blue-50 text-blue-700 border-blue-100",
  MBR: "bg-teal-50 text-teal-700 border-teal-100",
  STP: "bg-amber-50 text-amber-700 border-amber-100",
  ETP: "bg-rose-50 text-rose-700 border-rose-100",
  UF: "bg-violet-50 text-violet-700 border-violet-100",
  Other: "bg-slate-100 text-slate-600 border-slate-200",
};

type Tab = "site" | "flow" | "quality" | "chemical";

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" />
      <span className="flex-1 h-px bg-slate-100" />
      {label}
      <span className="flex-1 h-px bg-slate-100" />
    </h3>
  );
}

export default function StartupSheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<StartupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StartupRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("site");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/startup-sheets`);
      setRecords(await r.json());
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, operator: user?.name ?? "" });
    setTab("site");
    setDrawerOpen(true);
  }

  function openEdit(r: StartupRecord) {
    setEditing(r);
    setForm({
      site_name: r.site_name,
      startup_date: r.startup_date?.slice(0, 10) ?? "",
      plant_type: r.plant_type,
      capacity_m3_per_day: r.capacity_m3_per_day != null ? String(r.capacity_m3_per_day) : "",
      feed_flow_lph: r.feed_flow_lph != null ? String(r.feed_flow_lph) : "",
      permeate_flow_lph: r.permeate_flow_lph != null ? String(r.permeate_flow_lph) : "",
      reject_flow_lph: r.reject_flow_lph != null ? String(r.reject_flow_lph) : "",
      feed_pressure_bar: r.feed_pressure_bar != null ? String(r.feed_pressure_bar) : "",
      op_pressure_bar: r.op_pressure_bar != null ? String(r.op_pressure_bar) : "",
      feed_tds_ppm: r.feed_tds_ppm != null ? String(r.feed_tds_ppm) : "",
      permeate_tds_ppm: r.permeate_tds_ppm != null ? String(r.permeate_tds_ppm) : "",
      feed_ph: r.feed_ph != null ? String(r.feed_ph) : "",
      permeate_ph: r.permeate_ph != null ? String(r.permeate_ph) : "",
      antiscalant_dose_ppm: r.antiscalant_dose_ppm != null ? String(r.antiscalant_dose_ppm) : "",
      chlorine_dose_ppm: r.chlorine_dose_ppm != null ? String(r.chlorine_dose_ppm) : "",
      chemical_notes: r.chemical_notes ?? "",
      remarks: r.remarks ?? "",
      operator: r.operator ?? "",
    });
    setTab("site");
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setEditing(null); setForm(EMPTY); }

  async function save() {
    if (!form.site_name.trim()) { toast({ title: "Site name required", variant: "destructive" }); return; }
    setSaving(true);
    const body = {
      site_name: form.site_name,
      startup_date: form.startup_date || null,
      plant_type: form.plant_type,
      capacity_m3_per_day: form.capacity_m3_per_day !== "" ? Number(form.capacity_m3_per_day) : null,
      feed_flow_lph: form.feed_flow_lph !== "" ? Number(form.feed_flow_lph) : null,
      permeate_flow_lph: form.permeate_flow_lph !== "" ? Number(form.permeate_flow_lph) : null,
      reject_flow_lph: form.reject_flow_lph !== "" ? Number(form.reject_flow_lph) : null,
      feed_pressure_bar: form.feed_pressure_bar !== "" ? Number(form.feed_pressure_bar) : null,
      op_pressure_bar: form.op_pressure_bar !== "" ? Number(form.op_pressure_bar) : null,
      feed_tds_ppm: form.feed_tds_ppm !== "" ? Number(form.feed_tds_ppm) : null,
      permeate_tds_ppm: form.permeate_tds_ppm !== "" ? Number(form.permeate_tds_ppm) : null,
      feed_ph: form.feed_ph !== "" ? Number(form.feed_ph) : null,
      permeate_ph: form.permeate_ph !== "" ? Number(form.permeate_ph) : null,
      antiscalant_dose_ppm: form.antiscalant_dose_ppm !== "" ? Number(form.antiscalant_dose_ppm) : null,
      chlorine_dose_ppm: form.chlorine_dose_ppm !== "" ? Number(form.chlorine_dose_ppm) : null,
      chemical_notes: form.chemical_notes || null,
      remarks: form.remarks || null,
      operator: form.operator || null,
    };
    try {
      const url = editing ? `${BASE}/api/startup-sheets/${editing.id}` : `${BASE}/api/startup-sheets`;
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing ? "Record updated" : "Record saved" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function del(id: number) {
    try {
      await fetch(`${BASE}/api/startup-sheets/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  async function syncERP() {
    setSyncing(true);
    try {
      const r = await fetch(`${BASE}/api/startup-sheets/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Sync failed");
      toast({ title: `Synced ${d.synced ?? 0} records from ERP` });
      load();
    } catch (e: any) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    finally { setSyncing(false); }
  }

  function setF(k: keyof FormState, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function NumInput({ k, label, unit }: { k: keyof FormState; label: string; unit?: string }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label}{unit && <span className="text-slate-400 font-normal ml-1">({unit})</span>}
        </label>
        <input
          type="number" step="any"
          value={form[k] as string}
          onChange={e => setF(k, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300"
        />
      </div>
    );
  }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.site_name.toLowerCase().includes(q) || (r.operator ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "All" || r.plant_type === typeFilter;
    return matchSearch && matchType;
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "site", label: "Site Info", icon: Droplets },
    { id: "flow", label: "Flow & Pressure", icon: Gauge },
    { id: "quality", label: "Water Quality", icon: FlaskConical },
    { id: "chemical", label: "Chemicals", icon: FlaskConical },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-600 shadow-sm shadow-cyan-200">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Startup Sheet</h1>
                <p className="text-xs text-slate-500 mt-0.5">Plant startup parameters — flow, pressure & chemical doses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={syncERP} disabled={syncing}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                {syncing ? "Syncing…" : "Sync from ERP"}
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> New Record
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-3 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search site name or operator…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300" />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                <option value="All">All Types</option>
                {PLANT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <Droplets className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No startup records found</p>
                <p className="text-sm mt-1">Click "New Record" to add your first startup sheet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity (m³/d)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Feed Flow (LPH)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Perm. Flow (LPH)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Feed TDS (ppm)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Perm. TDS (ppm)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Feed pH</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-cyan-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(r)}>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{r.site_name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{r.startup_date?.slice(0, 10) ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold border", PLANT_COLOR[r.plant_type] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                            {r.plant_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.capacity_m3_per_day ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.feed_flow_lph ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.permeate_flow_lph ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.feed_tds_ppm ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.permeate_tds_ppm ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-sm">{r.feed_ph ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{r.operator ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); openEdit(r); }}
                              className="p-1.5 rounded-lg hover:bg-cyan-100 text-slate-400 hover:text-cyan-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-cyan-700 to-cyan-600 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing ? "Edit Startup Record" : "New Startup Record"}</h2>
                  <p className="text-cyan-200 text-xs mt-0.5">Plant startup parameters log</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn("flex-1 py-2.5 text-xs font-semibold flex flex-col items-center gap-0.5 border-b-2 transition-colors",
                      tab === t.id ? "border-cyan-600 text-cyan-700 bg-white" : "border-transparent text-slate-400 hover:text-slate-600")}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {tab === "site" && (
                  <div className="space-y-4">
                    <SectionLabel icon={Droplets} label="Site Info" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Site Name <span className="text-red-500">*</span></label>
                        <input value={form.site_name} onChange={e => setF("site_name", e.target.value)}
                          placeholder="e.g. Rajkot STP Phase 2"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Startup Date</label>
                        <input type="date" value={form.startup_date} onChange={e => setF("startup_date", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Plant Type</label>
                        <select value={form.plant_type} onChange={e => setF("plant_type", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                          {PLANT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Operator / Engineer</label>
                        <input value={form.operator} onChange={e => setF("operator", e.target.value)}
                          placeholder="Name"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                      <textarea value={form.remarks} onChange={e => setF("remarks", e.target.value)} rows={3}
                        placeholder="Any observations or issues during startup…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none" />
                    </div>
                  </div>
                )}

                {tab === "flow" && (
                  <div className="space-y-4">
                    <SectionLabel icon={Gauge} label="Flow & Pressure Parameters" />
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput k="capacity_m3_per_day" label="Capacity" unit="m³/day" />
                      <NumInput k="feed_flow_lph" label="Feed Flow" unit="LPH" />
                      <NumInput k="permeate_flow_lph" label="Permeate Flow" unit="LPH" />
                      <NumInput k="reject_flow_lph" label="Reject Flow" unit="LPH" />
                      <NumInput k="feed_pressure_bar" label="Feed Pressure" unit="bar" />
                      <NumInput k="op_pressure_bar" label="Op. Pressure" unit="bar" />
                    </div>
                  </div>
                )}

                {tab === "quality" && (
                  <div className="space-y-4">
                    <SectionLabel icon={FlaskConical} label="Water Quality" />
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput k="feed_tds_ppm" label="Feed TDS" unit="ppm" />
                      <NumInput k="permeate_tds_ppm" label="Permeate TDS" unit="ppm" />
                      <NumInput k="feed_ph" label="Feed pH" />
                      <NumInput k="permeate_ph" label="Permeate pH" />
                    </div>
                  </div>
                )}

                {tab === "chemical" && (
                  <div className="space-y-4">
                    <SectionLabel icon={FlaskConical} label="Chemical Doses" />
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput k="antiscalant_dose_ppm" label="Antiscalant" unit="ppm" />
                      <NumInput k="chlorine_dose_ppm" label="Chlorine Dose" unit="ppm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Chemical Notes</label>
                      <textarea value={form.chemical_notes} onChange={e => setF("chemical_notes", e.target.value)} rows={4}
                        placeholder="Dosing schedule, chemical names…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing ? "Update" : "Save"} Record
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Startup Record?</h3>
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
