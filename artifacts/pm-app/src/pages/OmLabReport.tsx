import { useState, useEffect, useCallback } from "react";
import {
  TestTubes, Plus, Search, RefreshCw, Trash2, Save, X,
  Loader2, Calendar, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Site { code: string; name: string; }
interface LabReport {
  id: number; site_name: string; project_number?: string; report_date: string;
  sample_point?: string; sample_type: string;
  ph?: string; turbidity?: string; tds?: string; hardness?: string; alkalinity?: string;
  chlorine_free?: string; chlorine_total?: string; bod?: string; cod?: string; tss?: string;
  toc?: string; conductivity?: string; salinity?: string;
  lab_technician?: string; remarks?: string; created_by?: string; created_at: string;
}

const SAMPLE_TYPES = ["raw", "treated", "product", "reject", "feed"];
const EMPTY_FORM = {
  site_name: "", project_number: "", report_date: new Date().toISOString().slice(0, 10),
  sample_point: "", sample_type: "treated",
  ph: "", turbidity: "", tds: "", hardness: "", alkalinity: "",
  chlorine_free: "", chlorine_total: "", bod: "", cod: "", tss: "",
  toc: "", conductivity: "", salinity: "",
  lab_technician: "", remarks: "",
};

function Param({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <div className="flex">
        <input type="number" min="0" step="0.001" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <span className="px-2 border border-gray-300 rounded-r-lg bg-gray-50 text-xs text-gray-500 flex items-center">{unit}</span>
      </div>
    </div>
  );
}

function BadgeRow({ label, value, good, bad }: { label: string; value?: string; good?: [number, number]; bad?: [number, number] }) {
  if (!value) return null;
  const num = parseFloat(value);
  let status: "ok" | "warn" | "neutral" = "neutral";
  if (good && !isNaN(num)) status = (num >= good[0] && num <= good[1]) ? "ok" : "warn";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-full",
        status === "ok" ? "bg-green-50 text-green-700" :
        status === "warn" ? "bg-amber-50 text-amber-700" : "text-gray-800")}>
        {parseFloat(value).toLocaleString()}
      </span>
    </div>
  );
}

export default function OmLabReport() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [records, setRecords] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LabReport | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

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
      const r = await fetch(`${BASE}/api/om/lab-reports?${params}`);
      const d = await r.json();
      setRecords(d.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [filterSite, filterFrom, filterTo]);

  useEffect(() => { fetchSites(); }, [fetchSites]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openNew() {
    setEditing(null); setForm({ ...EMPTY_FORM }); setError(""); setShowForm(true);
  }

  function openEdit(r: LabReport) {
    setEditing(r);
    setForm({
      site_name: r.site_name, project_number: r.project_number || "",
      report_date: r.report_date?.slice(0, 10) || "",
      sample_point: r.sample_point || "", sample_type: r.sample_type,
      ph: r.ph?.toString() || "", turbidity: r.turbidity?.toString() || "",
      tds: r.tds?.toString() || "", hardness: r.hardness?.toString() || "",
      alkalinity: r.alkalinity?.toString() || "", chlorine_free: r.chlorine_free?.toString() || "",
      chlorine_total: r.chlorine_total?.toString() || "", bod: r.bod?.toString() || "",
      cod: r.cod?.toString() || "", tss: r.tss?.toString() || "",
      toc: r.toc?.toString() || "", conductivity: r.conductivity?.toString() || "",
      salinity: r.salinity?.toString() || "",
      lab_technician: r.lab_technician || "", remarks: r.remarks || "",
    });
    setError(""); setShowForm(true);
  }

  async function handleSave() {
    if (!form.site_name || !form.report_date) {
      setError("Site and date are required."); return;
    }
    setSaving(true); setError("");
    try {
      const body = { ...form, created_by: user?.email };
      const url = editing ? `${BASE}/api/om/lab-reports/${editing.id}` : `${BASE}/api/om/lab-reports`;
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      await fetchRecords();
      setShowForm(false);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lab report?")) return;
    await fetch(`${BASE}/api/om/lab-reports/${id}`, { method: "DELETE" });
    fetchRecords();
  }

  const filtered = records.filter(r =>
    !search || r.site_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.sample_point || "").toLowerCase().includes(search.toLowerCase())
  );

  const sampleTypeColor: Record<string, string> = {
    raw: "bg-gray-100 text-gray-700", treated: "bg-blue-50 text-blue-700",
    product: "bg-green-50 text-green-700", reject: "bg-red-50 text-red-600", feed: "bg-amber-50 text-amber-700",
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <TestTubes size={18} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Lab Reports</h1>
                <p className="text-xs text-gray-500">Water quality test results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchRecords} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                <Plus size={15} /> Add Report
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search site / sample point…"
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-gray-400" />
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            {(filterSite || filterFrom || filterTo) && (
              <button onClick={() => { setFilterSite(""); setFilterFrom(""); setFilterTo(""); }}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-40"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white rounded-xl border border-gray-200">
              <TestTubes size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No lab reports found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => {
                const isOpen = expanded.has(r.id);
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{r.site_name}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", sampleTypeColor[r.sample_type] || "bg-gray-100 text-gray-600")}>
                            {r.sample_type}
                          </span>
                          {r.sample_point && <span className="text-xs text-gray-500">@ {r.sample_point}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">{r.report_date?.slice(0, 10)}</span>
                          {r.lab_technician && <span className="text-xs text-gray-400">by {r.lab_technician}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.ph && <div className="text-center"><p className="text-[10px] text-gray-400">pH</p><p className="text-sm font-bold text-gray-800">{r.ph}</p></div>}
                        {r.tds && <div className="text-center"><p className="text-[10px] text-gray-400">TDS</p><p className="text-sm font-bold text-gray-800">{r.tds}</p></div>}
                        {r.turbidity && <div className="text-center"><p className="text-[10px] text-gray-400">Turbidity</p><p className="text-sm font-bold text-gray-800">{r.turbidity}</p></div>}
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); openEdit(r); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors text-xs">Edit</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-1">
                          <BadgeRow label="pH" value={r.ph} good={[6.5, 8.5]} />
                          <BadgeRow label="Turbidity (NTU)" value={r.turbidity} good={[0, 5]} />
                          <BadgeRow label="TDS (mg/L)" value={r.tds} good={[0, 500]} />
                          <BadgeRow label="Hardness (mg/L)" value={r.hardness} good={[0, 300]} />
                          <BadgeRow label="Alkalinity (mg/L)" value={r.alkalinity} />
                          <BadgeRow label="Free Cl₂ (mg/L)" value={r.chlorine_free} good={[0.2, 1]} />
                          <BadgeRow label="Total Cl₂ (mg/L)" value={r.chlorine_total} />
                          <BadgeRow label="BOD (mg/L)" value={r.bod} good={[0, 30]} />
                          <BadgeRow label="COD (mg/L)" value={r.cod} good={[0, 250]} />
                          <BadgeRow label="TSS (mg/L)" value={r.tss} good={[0, 30]} />
                          <BadgeRow label="TOC (mg/L)" value={r.toc} />
                          <BadgeRow label="Conductivity (µS/cm)" value={r.conductivity} />
                          <BadgeRow label="Salinity (ppt)" value={r.salinity} />
                        </div>
                        {r.remarks && <p className="text-xs text-gray-500 mt-3 italic">Remarks: {r.remarks}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">{editing ? "Edit Lab Report" : "New Lab Report"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Site *</label>
                  <select value={form.site_name} onChange={e => sf("site_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">— Select Site —</option>
                    {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Report Date *</label>
                  <input type="date" value={form.report_date} onChange={e => sf("report_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sample Type</label>
                  <select value={form.sample_type} onChange={e => sf("sample_type", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    {SAMPLE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sample Point</label>
                  <input value={form.sample_point} onChange={e => sf("sample_point", e.target.value)} placeholder="e.g. MBR Outlet, RO Permeate"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Lab Technician</label>
                  <input value={form.lab_technician} onChange={e => sf("lab_technician", e.target.value)} placeholder="Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">Water Quality Parameters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Param label="pH" unit="—" value={form.ph} onChange={v => sf("ph", v)} />
                  <Param label="Turbidity" unit="NTU" value={form.turbidity} onChange={v => sf("turbidity", v)} />
                  <Param label="TDS" unit="mg/L" value={form.tds} onChange={v => sf("tds", v)} />
                  <Param label="Total Hardness" unit="mg/L" value={form.hardness} onChange={v => sf("hardness", v)} />
                  <Param label="Alkalinity" unit="mg/L" value={form.alkalinity} onChange={v => sf("alkalinity", v)} />
                  <Param label="Free Chlorine" unit="mg/L" value={form.chlorine_free} onChange={v => sf("chlorine_free", v)} />
                  <Param label="Total Chlorine" unit="mg/L" value={form.chlorine_total} onChange={v => sf("chlorine_total", v)} />
                  <Param label="BOD" unit="mg/L" value={form.bod} onChange={v => sf("bod", v)} />
                  <Param label="COD" unit="mg/L" value={form.cod} onChange={v => sf("cod", v)} />
                  <Param label="TSS" unit="mg/L" value={form.tss} onChange={v => sf("tss", v)} />
                  <Param label="TOC" unit="mg/L" value={form.toc} onChange={v => sf("toc", v)} />
                  <Param label="Conductivity" unit="µS/cm" value={form.conductivity} onChange={v => sf("conductivity", v)} />
                  <Param label="Salinity" unit="ppt" value={form.salinity} onChange={v => sf("salinity", v)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={e => sf("remarks", e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                <Save size={14} /> {saving ? "Saving…" : "Save Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
