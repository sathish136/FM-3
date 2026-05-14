import { useState, useEffect, useCallback } from "react";
import {
  FlaskConical, Plus, Search, RefreshCw, Trash2, Save, X,
  ChevronDown, Loader2, Calendar, Filter, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Site { code: string; name: string; }
interface ChemRecord {
  id: number; site_name: string; project_number?: string; date: string;
  chemical_name: string; chemical_type?: string; unit: string;
  quantity_used: string; cost_per_unit?: string; total_cost?: string;
  operator_name?: string; remarks?: string; created_by?: string; created_at: string;
}

const UNITS = ["kg", "L", "g", "mL", "bags", "drums", "pcs", "m³"];
const CHEM_TYPES = ["Coagulant", "Flocculant", "Disinfectant", "Antiscalant", "pH Adjuster", "Biocide", "Cleaning Chemical", "Other"];
const EMPTY_FORM = {
  site_name: "", project_number: "", date: new Date().toISOString().slice(0, 10),
  chemical_name: "", chemical_type: "", unit: "kg",
  quantity_used: "", cost_per_unit: "", total_cost: "",
  operator_name: "", remarks: "",
};

export default function OmChemicalConsumption() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [records, setRecords] = useState<ChemRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChemRecord | null>(null);
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
      if (k === "quantity_used" || k === "cost_per_unit") {
        const qty = parseFloat(k === "quantity_used" ? v : next.quantity_used);
        const cpu = parseFloat(k === "cost_per_unit" ? v : next.cost_per_unit);
        if (!isNaN(qty) && !isNaN(cpu)) next.total_cost = (qty * cpu).toFixed(2);
      }
      return next;
    });
  };

  const fetchSites = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/om/sites`);
      const d = await r.json();
      setSites(d.data || []);
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSite) params.set("site", filterSite);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo)   params.set("to", filterTo);
      const r = await fetch(`${BASE}/api/om/chemical-consumption?${params}`);
      const d = await r.json();
      setRecords(d.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [filterSite, filterFrom, filterTo]);

  useEffect(() => { fetchSites(); }, [fetchSites]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  }

  function openEdit(r: ChemRecord) {
    setEditing(r);
    setForm({
      site_name: r.site_name, project_number: r.project_number || "",
      date: r.date?.slice(0, 10) || "", chemical_name: r.chemical_name,
      chemical_type: r.chemical_type || "", unit: r.unit,
      quantity_used: r.quantity_used?.toString() || "", cost_per_unit: r.cost_per_unit?.toString() || "",
      total_cost: r.total_cost?.toString() || "", operator_name: r.operator_name || "", remarks: r.remarks || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.site_name || !form.date || !form.chemical_name || !form.quantity_used) {
      setError("Site, date, chemical name and quantity are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const body = { ...form, created_by: user?.email };
      const url = editing ? `${BASE}/api/om/chemical-consumption/${editing.id}` : `${BASE}/api/om/chemical-consumption`;
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      await fetchRecords();
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this record?")) return;
    await fetch(`${BASE}/api/om/chemical-consumption/${id}`, { method: "DELETE" });
    fetchRecords();
  }

  const filtered = records.filter(r =>
    !search || r.chemical_name.toLowerCase().includes(search.toLowerCase()) ||
    r.site_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalQty = filtered.reduce((s, r) => s + parseFloat(r.quantity_used || "0"), 0);
  const totalCost = filtered.reduce((s, r) => s + parseFloat(r.total_cost || "0"), 0);

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FlaskConical size={18} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Chemical Consumption</h1>
                <p className="text-xs text-gray-500">Track chemical usage across sites</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchRecords} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">
                <Plus size={15} /> Add Entry
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chemical / site…"
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-gray-400" />
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            {(filterSite || filterFrom || filterTo) && (
              <button onClick={() => { setFilterSite(""); setFilterFrom(""); setFilterTo(""); }}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-6 py-4 grid grid-cols-3 gap-4">
          {[
            { label: "Total Records", value: filtered.length, color: "blue", suffix: "" },
            { label: "Total Quantity", value: totalQty.toFixed(2), color: "emerald", suffix: " units" },
            { label: "Total Cost", value: `₹${totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "amber", suffix: "" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs text-gray-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}<span className="text-sm font-normal text-gray-400">{c.suffix}</span></p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-40"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <FlaskConical size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No records found. Add your first entry.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Date","Site","Chemical","Type","Qty","Unit","Cost/Unit","Total Cost","Operator",""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openEdit(r)}>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{r.site_name}</td>
                      <td className="px-4 py-3 text-gray-800">{r.chemical_name}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{r.chemical_type || "—"}</span></td>
                      <td className="px-4 py-3 font-mono text-gray-800">{parseFloat(r.quantity_used || "0").toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.unit}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">{r.cost_per_unit ? `₹${r.cost_per_unit}` : "—"}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">{r.total_cost ? `₹${parseFloat(r.total_cost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.operator_name || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                          className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">{editing ? "Edit Entry" : "Add Chemical Consumption"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Site *</label>
                  <select value={form.site_name} onChange={e => sf("site_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    <option value="">— Select Site —</option>
                    {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => sf("date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Operator Name</label>
                  <input value={form.operator_name} onChange={e => sf("operator_name", e.target.value)} placeholder="Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Chemical Name *</label>
                  <input value={form.chemical_name} onChange={e => sf("chemical_name", e.target.value)} placeholder="e.g. Alum, Chlorine"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Chemical Type</label>
                  <select value={form.chemical_type} onChange={e => sf("chemical_type", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    <option value="">— Select —</option>
                    {CHEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Quantity Used *</label>
                  <input type="number" min="0" step="0.001" value={form.quantity_used} onChange={e => sf("quantity_used", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Unit</label>
                  <select value={form.unit} onChange={e => sf("unit", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Cost per Unit (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => sf("cost_per_unit", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Total Cost (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.total_cost} onChange={e => sf("total_cost", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Remarks</label>
                  <textarea value={form.remarks} onChange={e => sf("remarks", e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
