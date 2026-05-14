import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Plus, Search, RefreshCw, Trash2, Save, X,
  Loader2, Calendar, TrendingUp, Zap, Droplets, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Site { code: string; name: string; }
interface PerfReport {
  id: number; site_name: string; project_number?: string; report_date: string; period_type: string;
  inflow_m3?: string; outflow_m3?: string; recovery_pct?: string; plant_availability_pct?: string;
  energy_kwh?: string; specific_energy?: string; chemical_cost?: string;
  operational_hours?: string; downtime_hours?: string; downtime_reason?: string;
  remarks?: string; created_by?: string; created_at: string;
}

const PERIOD_TYPES = ["daily", "weekly", "monthly", "quarterly"];
const EMPTY_FORM = {
  site_name: "", project_number: "", report_date: new Date().toISOString().slice(0, 10),
  period_type: "daily", inflow_m3: "", outflow_m3: "", recovery_pct: "",
  plant_availability_pct: "", energy_kwh: "", specific_energy: "", chemical_cost: "",
  operational_hours: "", downtime_hours: "", downtime_reason: "", remarks: "",
};

function StatCard({ icon: Icon, label, value, unit, color }: { icon: any; label: string; value: string | number; unit?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", color)}>
          <Icon size={14} className="text-white" />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span></p>
    </div>
  );
}

export default function OmSitePerformance() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [records, setRecords] = useState<PerfReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PerfReport | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const sf = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === "inflow_m3" || k === "outflow_m3") {
        const inf = parseFloat(k === "inflow_m3" ? v : next.inflow_m3);
        const out = parseFloat(k === "outflow_m3" ? v : next.outflow_m3);
        if (!isNaN(inf) && !isNaN(out) && inf > 0) next.recovery_pct = ((out / inf) * 100).toFixed(1);
      }
      return next;
    });
  };

  const fetchSites = useCallback(async () => {
    try { const r = await fetch(`${BASE}/api/om/sites`); const d = await r.json(); setSites(d.data || []); } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSite) params.set("site", filterSite);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo)   params.set("to", filterTo);
      const r = await fetch(`${BASE}/api/om/site-performance?${params}`);
      const d = await r.json();
      setRecords(d.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [filterSite, filterFrom, filterTo]);

  useEffect(() => { fetchSites(); }, [fetchSites]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() { setEditing(null); setForm({ ...EMPTY_FORM }); setError(""); setShowForm(true); }

  function openEdit(r: PerfReport) {
    setEditing(r);
    setForm({
      site_name: r.site_name, project_number: r.project_number || "",
      report_date: r.report_date?.slice(0, 10) || "", period_type: r.period_type,
      inflow_m3: r.inflow_m3?.toString() || "", outflow_m3: r.outflow_m3?.toString() || "",
      recovery_pct: r.recovery_pct?.toString() || "", plant_availability_pct: r.plant_availability_pct?.toString() || "",
      energy_kwh: r.energy_kwh?.toString() || "", specific_energy: r.specific_energy?.toString() || "",
      chemical_cost: r.chemical_cost?.toString() || "", operational_hours: r.operational_hours?.toString() || "",
      downtime_hours: r.downtime_hours?.toString() || "", downtime_reason: r.downtime_reason || "", remarks: r.remarks || "",
    });
    setError(""); setShowForm(true);
  }

  async function handleSave() {
    if (!form.site_name || !form.report_date) { setError("Site and date are required."); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, created_by: user?.email };
      const url = editing ? `${BASE}/api/om/site-performance/${editing.id}` : `${BASE}/api/om/site-performance`;
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      await fetchRecords(); setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this report?")) return;
    await fetch(`${BASE}/api/om/site-performance/${id}`, { method: "DELETE" });
    fetchRecords();
  }

  const filtered = records.filter(r =>
    !search || r.site_name.toLowerCase().includes(search.toLowerCase())
  );

  const avgRecovery = filtered.length ? (filtered.reduce((s, r) => s + parseFloat(r.recovery_pct || "0"), 0) / filtered.length).toFixed(1) : "—";
  const avgAvail = filtered.length ? (filtered.reduce((s, r) => s + parseFloat(r.plant_availability_pct || "0"), 0) / filtered.length).toFixed(1) : "—";
  const totalEnergy = filtered.reduce((s, r) => s + parseFloat(r.energy_kwh || "0"), 0);

  const periodColor: Record<string, string> = {
    daily: "bg-blue-50 text-blue-700", weekly: "bg-violet-50 text-violet-700",
    monthly: "bg-emerald-50 text-emerald-700", quarterly: "bg-amber-50 text-amber-700",
  };

  function F({ label, value, unit }: { label: string; unit?: string; value: string; }) {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
        <div className="flex">
          <input type="number" min="0" step="0.01" value={value} onChange={e => sf(label.toLowerCase().replace(/[^a-z]/g, "_"), e.target.value)}
            className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          {unit && <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BarChart3 size={18} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Site Performance Reports</h1>
                <p className="text-xs text-gray-500">Operational KPIs per site and period</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchRecords} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">
                <Plus size={15} /> Add Report
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search site…"
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-gray-400" />
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
            {(filterSite || filterFrom || filterTo) && (
              <button onClick={() => { setFilterSite(""); setFilterFrom(""); setFilterTo(""); }}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"><X size={12} /> Clear</button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={BarChart3} label="Total Reports" value={filtered.length} color="bg-indigo-500" />
          <StatCard icon={Droplets} label="Avg Recovery" value={avgRecovery} unit="%" color="bg-blue-500" />
          <StatCard icon={TrendingUp} label="Avg Availability" value={avgAvail} unit="%" color="bg-emerald-500" />
          <StatCard icon={Zap} label="Total Energy" value={totalEnergy.toLocaleString()} unit="kWh" color="bg-amber-500" />
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-40"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <BarChart3 size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No performance reports found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Date","Site","Period","Inflow","Outflow","Recovery","Availability","Energy","Sp. Energy","Chem Cost","Op. Hrs","Downtime",""].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const rec = r.recovery_pct ? parseFloat(r.recovery_pct) : null;
                    const avail = r.plant_availability_pct ? parseFloat(r.plant_availability_pct) : null;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        onClick={() => openEdit(r)}>
                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{r.report_date?.slice(0, 10)}</td>
                        <td className="px-3 py-3 font-medium text-gray-900 max-w-[140px] truncate text-xs">{r.site_name}</td>
                        <td className="px-3 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", periodColor[r.period_type] || "bg-gray-100 text-gray-600")}>
                            {r.period_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.inflow_m3 ? `${r.inflow_m3} m³` : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.outflow_m3 ? `${r.outflow_m3} m³` : "—"}</td>
                        <td className="px-3 py-3">
                          {rec !== null ? (
                            <span className={cn("font-mono font-semibold text-xs", rec >= 75 ? "text-green-600" : rec >= 50 ? "text-amber-600" : "text-red-600")}>
                              {rec.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {avail !== null ? (
                            <span className={cn("font-mono font-semibold text-xs", avail >= 90 ? "text-green-600" : avail >= 70 ? "text-amber-600" : "text-red-600")}>
                              {avail.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.energy_kwh ? `${r.energy_kwh} kWh` : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.specific_energy ? `${r.specific_energy} kWh/m³` : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.chemical_cost ? `₹${parseFloat(r.chemical_cost).toLocaleString("en-IN")}` : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-700">{r.operational_hours || "—"}</td>
                        <td className="px-3 py-3">
                          {r.downtime_hours ? (
                            <span className={cn("font-mono text-xs font-medium", parseFloat(r.downtime_hours) > 0 ? "text-amber-600" : "text-gray-400")}>
                              {r.downtime_hours}h
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                            className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">{editing ? "Edit Performance Report" : "New Performance Report"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Site *</label>
                  <select value={form.site_name} onChange={e => sf("site_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                    <option value="">— Select Site —</option>
                    {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Report Date *</label>
                  <input type="date" value={form.report_date} onChange={e => sf("report_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Period Type</label>
                  <select value={form.period_type} onChange={e => sf("period_type", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                    {PERIOD_TYPES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">Flow & Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Inflow</label>
                    <div className="flex"><input type="number" min="0" step="0.01" value={form.inflow_m3} onChange={e => sf("inflow_m3", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">m³</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Outflow</label>
                    <div className="flex"><input type="number" min="0" step="0.01" value={form.outflow_m3} onChange={e => sf("outflow_m3", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">m³</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Recovery %</label>
                    <div className="flex"><input type="number" min="0" max="100" step="0.1" value={form.recovery_pct} onChange={e => sf("recovery_pct", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">%</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Plant Availability</label>
                    <div className="flex"><input type="number" min="0" max="100" step="0.1" value={form.plant_availability_pct} onChange={e => sf("plant_availability_pct", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">%</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">Energy & Cost</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Energy Consumed</label>
                    <div className="flex"><input type="number" min="0" step="0.01" value={form.energy_kwh} onChange={e => sf("energy_kwh", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">kWh</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Specific Energy</label>
                    <div className="flex"><input type="number" min="0" step="0.001" value={form.specific_energy} onChange={e => sf("specific_energy", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">kWh/m³</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Chemical Cost (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.chemical_cost} onChange={e => sf("chemical_cost", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">Operations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Operational Hours</label>
                    <div className="flex"><input type="number" min="0" max="24" step="0.1" value={form.operational_hours} onChange={e => sf("operational_hours", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">hrs</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Downtime Hours</label>
                    <div className="flex"><input type="number" min="0" max="24" step="0.1" value={form.downtime_hours} onChange={e => sf("downtime_hours", e.target.value)} className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">hrs</span></div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Downtime Reason</label>
                    <input value={form.downtime_reason} onChange={e => sf("downtime_reason", e.target.value)} placeholder="e.g. Membrane cleaning, Power failure"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Remarks</label>
                    <textarea value={form.remarks} onChange={e => sf("remarks", e.target.value)} rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                <Save size={14} /> {saving ? "Saving…" : "Save Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
