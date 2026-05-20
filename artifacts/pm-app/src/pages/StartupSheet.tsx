import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Droplets, Gauge, FlaskConical,
  Send, RefreshCw, ChevronDown, Calendar, User,
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
  capacity_m3_per_day: "",
  feed_flow_lph: "",
  permeate_flow_lph: "",
  reject_flow_lph: "",
  feed_pressure_bar: "",
  op_pressure_bar: "",
  feed_tds_ppm: "",
  permeate_tds_ppm: "",
  feed_ph: "",
  permeate_ph: "",
  antiscalant_dose_ppm: "",
  chlorine_dose_ppm: "",
  chemical_notes: "",
  remarks: "",
  operator: "",
};
type FormState = typeof EMPTY;

const PLANT_TYPES = ["RO", "MBR", "STP", "ETP", "UF", "Other"];

const PLANT_COLOR: Record<string, string> = {
  RO:    "bg-blue-50 text-blue-700 border-blue-200",
  MBR:   "bg-teal-50 text-teal-700 border-teal-200",
  STP:   "bg-amber-50 text-amber-700 border-amber-200",
  ETP:   "bg-rose-50 text-rose-700 border-rose-200",
  UF:    "bg-violet-50 text-violet-700 border-violet-200",
  Other: "bg-slate-100 text-slate-600 border-slate-200",
};

type DrawerTab = "site" | "flow" | "quality" | "chemical";

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={cn("w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 bg-white", className)} />
  );
}

function NumInput({ value, onChange, label, unit }: { value: string; onChange: (v: string) => void; label: string; unit?: string }) {
  return (
    <div>
      <FieldLabel>{label}{unit && <span className="text-slate-400 font-normal ml-1">({unit})</span>}</FieldLabel>
      <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 bg-white" />
    </div>
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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("site");
  const [editing, setEditing] = useState<StartupRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    setDrawerTab("site");
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
    setDrawerTab("site");
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
      toast({ title: "Deleted" }); setDeleteId(null); closeDrawer(); load();
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

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.site_name.toLowerCase().includes(q) || (r.operator ?? "").toLowerCase().includes(q)) &&
      (typeFilter === "All" || r.plant_type === typeFilter);
  });

  const TABS: { id: DrawerTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "site",     label: "Site Info",      icon: Droplets },
    { id: "flow",     label: "Flow & Pressure", icon: Gauge },
    { id: "quality",  label: "Water Quality",   icon: FlaskConical },
    { id: "chemical", label: "Chemicals",       icon: FlaskConical },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600 shadow shadow-cyan-200">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Startup Sheet</h1>
              <p className="text-xs text-slate-400 mt-0.5">Plant startup parameters · flow · pressure · chemical doses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncERP} disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync ERP"}
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Record
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Records", value: records.length, color: "text-slate-800", bg: "bg-white" },
              { label: "RO Plants", value: records.filter(r => r.plant_type === "RO").length, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "MBR Plants", value: records.filter(r => r.plant_type === "MBR").length, color: "text-teal-600", bg: "bg-teal-50" },
              { label: "STP / ETP", value: records.filter(r => r.plant_type === "STP" || r.plant_type === "ETP").length, color: "text-amber-600", bg: "bg-amber-50" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border border-slate-200 p-4 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={cn("text-2xl font-black", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by site name or operator…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                <option value="All">All Plant Types</option>
                {PLANT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-cyan-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-24">
              <Droplets className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No startup records found</p>
              <p className="text-sm text-slate-400 mt-1">Click "New Record" to add your first startup sheet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Site</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Capacity (m³/d)</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feed Flow (LPH)</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perm. Flow</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feed TDS</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perm. TDS</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feed pH</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operator</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-cyan-50/50 transition-colors group cursor-pointer" onClick={() => openEdit(r)}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.site_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.startup_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold border", PLANT_COLOR[r.plant_type] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                          {r.plant_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.capacity_m3_per_day ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{r.feed_flow_lph ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{r.permeate_flow_lph ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{r.feed_tds_ppm ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{r.permeate_tds_ppm ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{r.feed_ph ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.operator ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3">
                        <button onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Dark Header */}
            <div className="bg-slate-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-cyan-400 text-xs font-semibold uppercase tracking-widest">Startup Sheet</span>
                  </div>
                  <h2 className="text-white font-bold text-lg leading-tight truncate">
                    {form.site_name || (editing ? "Edit Record" : "New Startup Record")}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {form.plant_type && (
                      <span className="text-xs font-bold bg-white/10 text-cyan-200 px-2 py-0.5 rounded">{form.plant_type}</span>
                    )}
                    {form.startup_date && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />{form.startup_date}
                      </span>
                    )}
                    {form.operator && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <User className="w-3 h-3" />{form.operator}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editing && (
                    <button onClick={() => setDeleteId(editing.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setDrawerTab(tab.id)}
                  className={cn("flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2",
                    drawerTab === tab.id
                      ? "border-cyan-600 text-cyan-700 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700")}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {drawerTab === "site" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <FieldLabel>Site Name <span className="text-red-500">*</span></FieldLabel>
                      <TextInput value={form.site_name} onChange={v => setF("site_name", v)} placeholder="e.g. Rajkot STP Phase 2" />
                    </div>
                    <div>
                      <FieldLabel>Startup Date</FieldLabel>
                      <TextInput type="date" value={form.startup_date} onChange={v => setF("startup_date", v)} />
                    </div>
                    <div>
                      <FieldLabel>Plant Type</FieldLabel>
                      <select value={form.plant_type} onChange={e => setF("plant_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                        {PLANT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Operator / Engineer</FieldLabel>
                      <TextInput value={form.operator} onChange={v => setF("operator", v)} placeholder="Name" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Remarks</FieldLabel>
                      <textarea value={form.remarks} onChange={e => setF("remarks", e.target.value)} rows={3}
                        placeholder="Any observations or issues during startup…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "flow" && (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <NumInput value={form.capacity_m3_per_day} onChange={v => setF("capacity_m3_per_day", v)} label="Capacity" unit="m³/day" />
                    <NumInput value={form.feed_flow_lph} onChange={v => setF("feed_flow_lph", v)} label="Feed Flow" unit="LPH" />
                    <NumInput value={form.permeate_flow_lph} onChange={v => setF("permeate_flow_lph", v)} label="Permeate Flow" unit="LPH" />
                    <NumInput value={form.reject_flow_lph} onChange={v => setF("reject_flow_lph", v)} label="Reject Flow" unit="LPH" />
                    <NumInput value={form.feed_pressure_bar} onChange={v => setF("feed_pressure_bar", v)} label="Feed Pressure" unit="bar" />
                    <NumInput value={form.op_pressure_bar} onChange={v => setF("op_pressure_bar", v)} label="Op. Pressure" unit="bar" />
                  </div>
                </div>
              )}

              {drawerTab === "quality" && (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <NumInput value={form.feed_tds_ppm} onChange={v => setF("feed_tds_ppm", v)} label="Feed TDS" unit="ppm" />
                    <NumInput value={form.permeate_tds_ppm} onChange={v => setF("permeate_tds_ppm", v)} label="Permeate TDS" unit="ppm" />
                    <NumInput value={form.feed_ph} onChange={v => setF("feed_ph", v)} label="Feed pH" />
                    <NumInput value={form.permeate_ph} onChange={v => setF("permeate_ph", v)} label="Permeate pH" />
                  </div>
                </div>
              )}

              {drawerTab === "chemical" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <NumInput value={form.antiscalant_dose_ppm} onChange={v => setF("antiscalant_dose_ppm", v)} label="Antiscalant" unit="ppm" />
                    <NumInput value={form.chlorine_dose_ppm} onChange={v => setF("chlorine_dose_ppm", v)} label="Chlorine Dose" unit="ppm" />
                  </div>
                  <div>
                    <FieldLabel>Chemical Notes</FieldLabel>
                    <textarea value={form.chemical_notes} onChange={e => setF("chemical_notes", e.target.value)} rows={5}
                      placeholder="Dosing schedule, chemical names, concentrations…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50 flex-shrink-0">
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

      {/* Delete Confirm */}
      {deleteId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
    </Layout>
  );
}
