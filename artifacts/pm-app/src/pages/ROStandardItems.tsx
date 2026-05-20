import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Package, Download,
  Send, RefreshCw, ChevronDown, Tag, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ROItem {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  make: string | null;
  model: string | null;
  specifications: string | null;
  unit: string;
  standard_qty: number | null;
  unit_rate: number | null;
  remarks: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  "Membrane", "Pressure Vessel", "High Pressure Pump", "Cartridge Filter",
  "Multimedia Filter", "Activated Carbon Filter", "Antiscalant Dosing",
  "Chemical Dosing", "Instrumentation", "Control Panel",
  "Piping & Valves", "RO Frame & Skid", "UV System", "Softener", "Other",
];

const EMPTY = {
  item_code: "", item_name: "", category: "Membrane",
  make: "", model: "", specifications: "",
  unit: "No.", standard_qty: "", unit_rate: "", remarks: "",
};
type FormState = typeof EMPTY;

const CAT_COLOR: Record<string, string> = {
  "Membrane":           "bg-blue-50 text-blue-700 border-blue-200",
  "Pressure Vessel":    "bg-indigo-50 text-indigo-700 border-indigo-200",
  "High Pressure Pump": "bg-rose-50 text-rose-700 border-rose-200",
  "Cartridge Filter":   "bg-amber-50 text-amber-700 border-amber-200",
  "Multimedia Filter":  "bg-teal-50 text-teal-700 border-teal-200",
  "Control Panel":      "bg-violet-50 text-violet-700 border-violet-200",
  "Instrumentation":    "bg-cyan-50 text-cyan-700 border-cyan-200",
  "UV System":          "bg-yellow-50 text-yellow-700 border-yellow-200",
};

type DrawerTab = "details" | "pricing";

function inr(v: number | null | undefined) {
  if (v == null) return "—";
  return "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>;
}

export default function ROStandardItems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ROItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");
  const [editing, setEditing] = useState<ROItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ro-standard-items`);
      setItems(await r.json());
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setDrawerTab("details");
    setDrawerOpen(true);
  }

  function openEdit(item: ROItem) {
    setEditing(item);
    setForm({
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category,
      make: item.make ?? "",
      model: item.model ?? "",
      specifications: item.specifications ?? "",
      unit: item.unit,
      standard_qty: item.standard_qty != null ? String(item.standard_qty) : "",
      unit_rate: item.unit_rate != null ? String(item.unit_rate) : "",
      remarks: item.remarks ?? "",
    });
    setDrawerTab("details");
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setEditing(null); setForm(EMPTY); }

  async function save() {
    if (!form.item_code.trim() || !form.item_name.trim()) {
      toast({ title: "Item code and name required", variant: "destructive" }); return;
    }
    setSaving(true);
    const body = {
      item_code: form.item_code,
      item_name: form.item_name,
      category: form.category,
      make: form.make || null,
      model: form.model || null,
      specifications: form.specifications || null,
      unit: form.unit,
      standard_qty: form.standard_qty !== "" ? Number(form.standard_qty) : null,
      unit_rate: form.unit_rate !== "" ? Number(form.unit_rate) : null,
      remarks: form.remarks || null,
    };
    try {
      const url = editing ? `${BASE}/api/ro-standard-items/${editing.id}` : `${BASE}/api/ro-standard-items`;
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error ?? "Save failed"); }
      toast({ title: editing ? "Item updated" : "Item added" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: e.message ?? "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function del(id: number) {
    try {
      await fetch(`${BASE}/api/ro-standard-items/${id}`, { method: "DELETE" });
      toast({ title: "Item removed" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  async function syncERP() {
    setSyncing(true);
    try {
      const r = await fetch(`${BASE}/api/ro-standard-items/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Sync failed");
      toast({ title: `Synced ${d.synced ?? 0} items from ERP` });
      load();
    } catch (e: any) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    finally { setSyncing(false); }
  }

  function exportCSV() {
    const header = ["Item Code", "Name", "Category", "Make", "Model", "Specifications", "Unit", "Std Qty", "Unit Rate", "Remarks"];
    const rows = filtered.map(i => [
      i.item_code, i.item_name, i.category, i.make ?? "", i.model ?? "",
      i.specifications ?? "", i.unit, i.standard_qty ?? "", i.unit_rate ?? "", i.remarks ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ro-standard-items.csv"; a.click();
  }

  function setF<K extends keyof FormState>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.item_name.toLowerCase().includes(q) || i.item_code.toLowerCase().includes(q) || (i.make ?? "").toLowerCase().includes(q)) &&
      (catFilter === "All" || i.category === catFilter);
  });

  const cats = Array.from(new Set(items.map(i => i.category)));

  const TABS: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
    { id: "details", label: "Item Details", icon: Info },
    { id: "pricing", label: "Pricing & Qty",  icon: Tag },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 shadow shadow-indigo-200">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">RO Standard Items</h1>
              <p className="text-xs text-slate-400 mt-0.5">Standard components & parts catalogue for RO systems</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={syncERP} disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync ERP"}
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Items",  value: items.length,                                              color: "text-slate-800", bg: "bg-white" },
              { label: "Categories",   value: cats.length,                                               color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Membranes",    value: items.filter(i => i.category === "Membrane").length,       color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "Instruments",  value: items.filter(i => i.category === "Instrumentation").length, color: "text-cyan-600",  bg: "bg-cyan-50" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border border-slate-200 p-4 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={cn("text-2xl font-black", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search item name, code, make…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
            </div>
            <div className="relative">
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-24">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No items found</p>
              <p className="text-sm text-slate-400 mt-1">Click "Add Item" to build your parts catalogue</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item Code</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Make / Model</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Specifications</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Std Qty</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unit Rate</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-indigo-50/50 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{item.item_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.item_name}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold border", CAT_COLOR[item.category] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{[item.make, item.model].filter(Boolean).join(" / ") || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{item.specifications ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-slate-600">{item.standard_qty ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{inr(item.unit_rate)}</td>
                      <td className="px-3 py-3">
                        <button onClick={e => { e.stopPropagation(); setDeleteId(item.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
                <button onClick={exportCSV} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 font-medium">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Dark Header */}
            <div className="bg-slate-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">RO Standard Item</span>
                  </div>
                  <h2 className="text-white font-bold text-lg leading-tight truncate">
                    {form.item_name || (editing ? "Edit Item" : "New Item")}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {form.item_code && (
                      <span className="text-xs font-mono bg-white/10 text-indigo-200 px-2 py-0.5 rounded">{form.item_code}</span>
                    )}
                    {form.category && (
                      <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded">{form.category}</span>
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
                      ? "border-indigo-600 text-indigo-700 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700")}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {drawerTab === "details" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Item Code <span className="text-red-500">*</span></FieldLabel>
                      <input value={form.item_code} onChange={e => setF("item_code", e.target.value)}
                        placeholder="e.g. MEM-4040-BW30"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <select value={form.category} onChange={e => setF("category", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Item Name <span className="text-red-500">*</span></FieldLabel>
                      <input value={form.item_name} onChange={e => setF("item_name", e.target.value)}
                        placeholder="e.g. RO Membrane 4040 BW30-400"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Make / Brand</FieldLabel>
                      <input value={form.make} onChange={e => setF("make", e.target.value)}
                        placeholder="e.g. Filmtec, Hydranautics"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Model</FieldLabel>
                      <input value={form.model} onChange={e => setF("model", e.target.value)}
                        placeholder="e.g. BW30-400"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Specifications</FieldLabel>
                      <textarea value={form.specifications} onChange={e => setF("specifications", e.target.value)} rows={3}
                        placeholder="e.g. 4 inch x 40 inch, 400 GPD, 99.5% rejection, 300 psi max"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none bg-white" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Remarks</FieldLabel>
                      <textarea value={form.remarks} onChange={e => setF("remarks", e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "pricing" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Unit</FieldLabel>
                      <select value={form.unit} onChange={e => setF("unit", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                        {["No.", "Set", "Meter", "Kg", "Litre", "Lot"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Standard Qty</FieldLabel>
                      <input type="number" step="any" value={form.standard_qty} onChange={e => setF("standard_qty", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Unit Rate (₹)</FieldLabel>
                      <input type="number" step="any" value={form.unit_rate} onChange={e => setF("unit_rate", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white" />
                    </div>
                  </div>

                  {(form.standard_qty !== "" || form.unit_rate !== "") && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Standard Value</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Rate per {form.unit || "unit"}</span>
                        <span className="font-semibold text-slate-800">{inr(form.unit_rate !== "" ? Number(form.unit_rate) : null)}</span>
                      </div>
                      {form.standard_qty !== "" && form.unit_rate !== "" && (
                        <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
                          <span className="text-indigo-700">Standard Total ({form.standard_qty} {form.unit})</span>
                          <span className="text-indigo-700">{inr(Number(form.standard_qty) * Number(form.unit_rate))}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50 flex-shrink-0">
              <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {editing ? "Update" : "Add"} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1">Remove Item?</h3>
            <p className="text-sm text-slate-500 mb-5">This will deactivate the item from the catalogue.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => del(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Remove</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
