import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Upload, Download, ChevronDown,
  Edit2, FileBox, DollarSign, Package, BarChart3, ShoppingBag,
  RefreshCw, FolderOpen, CheckCircle2, AlertCircle, Info
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MATERIAL_CATEGORIES = [
  "Steel / Structural",
  "Stainless Steel",
  "Pipes & Fittings",
  "Electrical",
  "Instrumentation",
  "Pumps & Motors",
  "Valves",
  "Civil / Concrete",
  "Fabrication",
  "Consumables",
  "Hardware & Fasteners",
  "Membrane / Filter",
  "Chemical",
  "General",
  "Other",
];

const CAT_COLORS: Record<string, string> = {
  "Steel / Structural":   "bg-slate-100 text-slate-700 border-slate-200",
  "Stainless Steel":      "bg-blue-50 text-blue-700 border-blue-100",
  "Pipes & Fittings":     "bg-cyan-50 text-cyan-700 border-cyan-100",
  "Electrical":           "bg-amber-50 text-amber-700 border-amber-100",
  "Instrumentation":      "bg-purple-50 text-purple-700 border-purple-100",
  "Pumps & Motors":       "bg-rose-50 text-rose-700 border-rose-100",
  "Valves":               "bg-orange-50 text-orange-700 border-orange-100",
  "Civil / Concrete":     "bg-lime-50 text-lime-700 border-lime-100",
  "Fabrication":          "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Consumables":          "bg-teal-50 text-teal-700 border-teal-100",
  "Hardware & Fasteners": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Membrane / Filter":    "bg-sky-50 text-sky-700 border-sky-100",
  "Chemical":             "bg-green-50 text-green-700 border-green-100",
  "General":              "bg-slate-50 text-slate-600 border-slate-100",
  "Other":                "bg-gray-100 text-gray-600 border-gray-200",
};

interface Session {
  id: number; name: string; description?: string; erp_project?: string;
  step_file_name?: string; step_file_path?: string;
  item_count: number; total_cost: number; created_at: string; created_by?: string;
}
interface Item {
  id: number; session_id: number; part_name: string; material_category: string;
  description?: string; quantity: number; unit_price: number; total_price: number;
  erp_po_no?: string; erp_item_code?: string; supplier?: string; uom?: string;
  source?: string; notes?: string; created_at: string;
}
interface ErpPO { name: string; supplier: string; status: string; grand_total: number; transaction_date: string; project?: string; }
interface ErpPOItem { item_code: string; item_name: string; description?: string; qty: number; rate: number; amount: number; uom?: string; supplier?: string; po_name: string; }

const EMPTY_ITEM: Partial<Item> = { material_category: "General", quantity: 1, unit_price: 0, uom: "Nos", source: "manual" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}
function fmtCur(n: number) {
  return "₹ " + fmt(n);
}

export default function CostWorking() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessLoading, setSessLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessSearch, setSessSearch] = useState("");
  const [sessDrawer, setSessDrawer] = useState(false);
  const [editSess, setEditSess] = useState<Partial<Session>>({});
  const [savingSess, setSavingSess] = useState(false);

  // Items
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemDrawer, setItemDrawer] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Item>>(EMPTY_ITEM);
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // ERP PO Import
  const [importModal, setImportModal] = useState(false);
  const [erpPOs, setErpPOs] = useState<ErpPO[]>([]);
  const [erpPOLoading, setErpPOLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [poItems, setPOItems] = useState<ErpPOItem[]>([]);
  const [poItemsLoading, setPOItemsLoading] = useState(false);
  const [selectedPOItems, setSelectedPOItems] = useState<Set<number>>(new Set());
  const [poSearchFilter, setPOSearchFilter] = useState("");
  const [importingItems, setImportingItems] = useState(false);

  // STEP Upload
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ERP Projects
  const [erpProjects, setErpProjects] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => { loadSessions(); loadErpProjects(); }, []);
  useEffect(() => { if (activeSession) loadItems(activeSession.id); }, [activeSession]);

  async function loadSessions() {
    setSessLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/sessions`);
      const d = await r.json();
      setSessions(Array.isArray(d) ? d : []);
    } finally { setSessLoading(false); }
  }

  async function loadItems(sid: number) {
    setItemsLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/sessions/${sid}/items`);
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } finally { setItemsLoading(false); }
  }

  async function loadErpProjects() {
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/projects`);
      const d = await r.json();
      setErpProjects(d.projects ?? []);
    } catch {}
  }

  async function saveSession() {
    if (!editSess.name?.trim()) return toast({ title: "Name required", variant: "destructive" });
    setSavingSess(true);
    try {
      const method = editSess.id ? "PUT" : "POST";
      const url = editSess.id
        ? `${BASE}/api/cost-working/sessions/${editSess.id}`
        : `${BASE}/api/cost-working/sessions`;
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editSess, created_by: user?.fullName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      await loadSessions();
      if (!editSess.id) setActiveSession({ ...d, item_count: 0, total_cost: 0 });
      setSessDrawer(false);
      toast({ title: editSess.id ? "Session updated" : "Session created" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSavingSess(false); }
  }

  async function deleteSession(id: number) {
    if (!confirm("Delete this cost working session and all its items?")) return;
    try {
      await fetch(`${BASE}/api/cost-working/sessions/${id}`, { method: "DELETE" });
      await loadSessions();
      if (activeSession?.id === id) setActiveSession(null);
      toast({ title: "Session deleted" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  }

  async function saveItem() {
    if (!activeSession) return;
    if (!editItem.part_name?.trim()) return toast({ title: "Part name required", variant: "destructive" });
    setSavingItem(true);
    try {
      const method = editItem.id ? "PUT" : "POST";
      const url = editItem.id
        ? `${BASE}/api/cost-working/items/${editItem.id}`
        : `${BASE}/api/cost-working/sessions/${activeSession.id}/items`;
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editItem),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      await loadItems(activeSession.id);
      await loadSessions();
      setItemDrawer(false);
      toast({ title: editItem.id ? "Item updated" : "Item added" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSavingItem(false); }
  }

  async function deleteItem(id: number) {
    if (!activeSession) return;
    try {
      await fetch(`${BASE}/api/cost-working/items/${id}`, { method: "DELETE" });
      await loadItems(activeSession.id);
      await loadSessions();
      setDeleteItemId(null);
      toast({ title: "Item deleted" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  }

  async function uploadStep(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeSession || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("step_file", file);
      const r = await fetch(`${BASE}/api/cost-working/sessions/${activeSession.id}/upload-step`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      setActiveSession(d);
      await loadSessions();
      toast({ title: "STEP file uploaded" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function openImport() {
    setImportModal(true);
    setSelectedPO("");
    setPOItems([]);
    setSelectedPOItems(new Set());
    setErpPOLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/purchase-orders?project=${encodeURIComponent(activeSession?.erp_project ?? "")}`);
      const d = await r.json();
      setErpPOs(d.purchase_orders ?? []);
    } finally { setErpPOLoading(false); }
  }

  async function loadPOItems(poName: string) {
    setSelectedPO(poName);
    setSelectedPOItems(new Set());
    if (!poName) { setPOItems([]); return; }
    setPOItemsLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/po-items/${encodeURIComponent(poName)}`);
      const d = await r.json();
      setPOItems(d.items ?? []);
    } finally { setPOItemsLoading(false); }
  }

  async function importSelectedItems() {
    if (!activeSession || selectedPOItems.size === 0) return;
    setImportingItems(true);
    try {
      const toImport = poItems.filter((_, i) => selectedPOItems.has(i));
      for (const it of toImport) {
        await fetch(`${BASE}/api/cost-working/sessions/${activeSession.id}/items`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part_name: it.item_name || it.item_code,
            material_category: "General",
            description: it.description,
            quantity: it.qty,
            unit_price: it.rate,
            erp_po_no: it.po_name,
            erp_item_code: it.item_code,
            supplier: it.supplier,
            uom: it.uom,
            source: "erp_po",
          }),
        });
      }
      await loadItems(activeSession.id);
      await loadSessions();
      setImportModal(false);
      toast({ title: `${toImport.length} item(s) imported from ERP` });
    } finally { setImportingItems(false); }
  }

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(sessSearch.toLowerCase()) ||
    (s.erp_project ?? "").toLowerCase().includes(sessSearch.toLowerCase())
  );

  // Cost summary by category
  const catSummary = items.reduce((acc, it) => {
    const cat = it.material_category || "General";
    acc[cat] = (acc[cat] || 0) + Number(it.total_price);
    return acc;
  }, {} as Record<string, number>);
  const totalCost = items.reduce((s, it) => s + Number(it.total_price), 0);
  const sortedCats = Object.entries(catSummary).sort((a, b) => b[1] - a[1]);

  const filteredPOs = erpPOs.filter(po =>
    po.name.toLowerCase().includes(poSearchFilter.toLowerCase()) ||
    po.supplier.toLowerCase().includes(poSearchFilter.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex h-full overflow-hidden bg-slate-50">

        {/* ── Left Panel: Session List ────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Cost Working</h2>
              <p className="text-xs text-slate-400 mt-0.5">3D Part Cost Analysis</p>
            </div>
            <button onClick={() => { setEditSess({}); setSessDrawer(true); }}
              className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={sessSearch} onChange={e => setSessSearch(e.target.value)}
                placeholder="Search sessions…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <FileBox className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No sessions yet. Create one to start.
              </div>
            ) : filteredSessions.map(s => (
              <div key={s.id}
                onClick={() => setActiveSession(s)}
                className={cn("p-3 border-b border-slate-50 cursor-pointer hover:bg-indigo-50/50 transition-colors group",
                  activeSession?.id === s.id && "bg-indigo-50 border-l-2 border-l-indigo-500")}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                    {s.erp_project && <p className="text-[10px] text-indigo-500 truncate mt-0.5">{s.erp_project}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">{s.item_count} parts</span>
                      <span className="text-[10px] font-medium text-emerald-600">{fmtCur(Number(s.total_cost))}</span>
                    </div>
                    {s.step_file_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <FileBox className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] text-violet-500 truncate">{s.step_file_name}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Session Detail ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FolderOpen className="w-14 h-14 mb-3 opacity-20" />
              <p className="text-sm font-medium">Select or create a session</p>
              <p className="text-xs mt-1 opacity-70">Upload a STEP file, then build your cost breakdown</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold text-slate-800">{activeSession.name}</h1>
                    <button onClick={() => { setEditSess({ ...activeSession }); setSessDrawer(true); }}
                      className="text-slate-400 hover:text-indigo-500 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {activeSession.erp_project && <span className="text-xs text-indigo-500">{activeSession.erp_project}</span>}
                    {activeSession.description && <span className="text-xs text-slate-400">{activeSession.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openImport}
                    className="flex items-center gap-1.5 text-xs border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                    <ShoppingBag className="w-3.5 h-3.5" /> Import from ERP PO
                  </button>
                  <button onClick={() => { setEditItem({ ...EMPTY_ITEM }); setItemDrawer(true); }}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Part
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* STEP File & Summary Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* STEP Upload */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                      <FileBox className="w-3.5 h-3.5 text-violet-500" /> 3D STEP Drawing
                    </p>
                    {activeSession.step_file_name ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-lg border border-violet-100">
                          <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="text-xs text-violet-700 truncate flex-1">{activeSession.step_file_name}</span>
                        </div>
                        <div className="flex gap-2">
                          <a href={`${BASE}/api/cost-working/sessions/${activeSession.id}/step-download`}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-violet-600 border border-violet-200 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                            <Download className="w-3 h-3" /> Download
                          </a>
                          <button onClick={() => fileRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-500 border border-slate-200 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                            <RefreshCw className="w-3 h-3" /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" /> : (
                          <>
                            <Upload className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-400">Upload .STEP / .STP file</p>
                            <p className="text-[10px] text-slate-300 mt-0.5">Up to 200 MB</p>
                          </>
                        )}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept=".step,.stp,.STEP,.STP" className="hidden" onChange={uploadStep} />
                  </div>

                  {/* Total Cost */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Total Cost
                    </p>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600 mt-2">{fmtCur(totalCost)}</p>
                      <p className="text-xs text-slate-400 mt-1">{items.length} parts across {sortedCats.length} categories</p>
                    </div>
                  </div>

                  {/* Category Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> By Category
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {sortedCats.length === 0 ? (
                        <p className="text-xs text-slate-300">No items yet</p>
                      ) : sortedCats.map(([cat, val]) => (
                        <div key={cat} className="flex items-center justify-between gap-2">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[120px]", CAT_COLORS[cat] ?? CAT_COLORS["General"])}>
                            {cat}
                          </span>
                          <span className="text-[10px] font-medium text-slate-700 whitespace-nowrap">{fmtCur(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category breakdown bar */}
                {totalCost > 0 && sortedCats.length > 1 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-3">Cost Distribution</p>
                    <div className="flex rounded-full overflow-hidden h-4 w-full">
                      {sortedCats.map(([cat, val], i) => {
                        const pct = (val / totalCost) * 100;
                        const colors = ["bg-indigo-400","bg-emerald-400","bg-amber-400","bg-rose-400","bg-cyan-400","bg-violet-400","bg-orange-400","bg-teal-400","bg-pink-400","bg-lime-400"];
                        return <div key={cat} className={cn("h-full transition-all", colors[i % colors.length])} style={{ width: `${pct}%` }} title={`${cat}: ${pct.toFixed(1)}%`} />;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {sortedCats.map(([cat, val], i) => {
                        const colors = ["text-indigo-500","text-emerald-500","text-amber-500","text-rose-500","text-cyan-500","text-violet-500","text-orange-500","text-teal-500","text-pink-500","text-lime-500"];
                        return (
                          <div key={cat} className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", ["bg-indigo-400","bg-emerald-400","bg-amber-400","bg-rose-400","bg-cyan-400","bg-violet-400","bg-orange-400","bg-teal-400","bg-pink-400","bg-lime-400"][i % 10])} />
                            <span className="text-[10px] text-slate-500">{cat} ({((val/totalCost)*100).toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" /> Parts / Cost Items
                      <span className="ml-1 text-slate-400 font-normal">({items.length})</span>
                    </p>
                  </div>
                  {itemsLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                  ) : items.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No items yet. Add parts manually or import from ERP Purchase Orders.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                            <th className="text-left px-4 py-2.5 font-medium">Part Name</th>
                            <th className="text-left px-3 py-2.5 font-medium">Category</th>
                            <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Supplier</th>
                            <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">ERP PO</th>
                            <th className="text-right px-3 py-2.5 font-medium">Qty</th>
                            <th className="text-right px-3 py-2.5 font-medium">Unit Price</th>
                            <th className="text-right px-3 py-2.5 font-medium">Total</th>
                            <th className="px-3 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(it => (
                            <tr key={it.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5">
                                <p className="font-medium text-slate-800 truncate max-w-[180px]">{it.part_name}</p>
                                {it.description && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{it.description}</p>}
                                {it.source === "erp_po" && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1 rounded mt-0.5">
                                    ERP
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", CAT_COLORS[it.material_category] ?? CAT_COLORS["General"])}>
                                  {it.material_category}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 hidden md:table-cell text-slate-500">{it.supplier || "—"}</td>
                              <td className="px-3 py-2.5 hidden lg:table-cell">
                                {it.erp_po_no ? <span className="text-indigo-500 font-mono text-[10px]">{it.erp_po_no}</span> : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-600">{fmt(Number(it.quantity))} <span className="text-slate-400">{it.uom}</span></td>
                              <td className="px-3 py-2.5 text-right text-slate-600">{fmtCur(Number(it.unit_price))}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmtCur(Number(it.total_price))}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={() => { setEditItem({ ...it }); setItemDrawer(true); }}
                                    className="text-slate-400 hover:text-indigo-500 p-1 rounded hover:bg-indigo-50 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {deleteItemId === it.id ? (
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => deleteItem(it.id)} className="text-red-500 text-[10px] px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100">Confirm</button>
                                      <button onClick={() => setDeleteItemId(null)} className="text-slate-400 text-[10px] px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100">Cancel</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteItemId(it.id)}
                                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-200 bg-slate-50">
                            <td colSpan={6} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">Grand Total</td>
                            <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-600">{fmtCur(totalCost)}</td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Session Drawer ────────────────────────────────────────────────── */}
      {sessDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">{editSess.id ? "Edit Session" : "New Cost Working Session"}</h3>
              <button onClick={() => setSessDrawer(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Session Name *</label>
                <input value={editSess.name ?? ""} onChange={e => setEditSess(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. MBR Tank Assembly – Rev 2"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <textarea value={editSess.description ?? ""} onChange={e => setEditSess(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Optional notes about this cost analysis"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ERP Project</label>
                <select value={editSess.erp_project ?? ""} onChange={e => setEditSess(p => ({ ...p, erp_project: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">— Select ERP Project —</option>
                  {erpProjects.map(p => (
                    <option key={p.code} value={p.code}>{p.code} – {p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setSessDrawer(false)} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveSession} disabled={savingSess}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                {savingSess && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editSess.id ? "Save Changes" : "Create Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Drawer ───────────────────────────────────────────────────── */}
      {itemDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">{editItem.id ? "Edit Part" : "Add Part / Cost Item"}</h3>
              <button onClick={() => setItemDrawer(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Part Name *</label>
                <input value={editItem.part_name ?? ""} onChange={e => setEditItem(p => ({ ...p, part_name: e.target.value }))}
                  placeholder="e.g. MS Plate 10mm, SS Pipe 2inch"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Material Category</label>
                <select value={editItem.material_category ?? "General"} onChange={e => setEditItem(p => ({ ...p, material_category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Supplier</label>
                <input value={editItem.supplier ?? ""} onChange={e => setEditItem(p => ({ ...p, supplier: e.target.value }))}
                  placeholder="Supplier name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Quantity</label>
                <input type="number" min={0} step="any" value={editItem.quantity ?? 1} onChange={e => setEditItem(p => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">UOM</label>
                <input value={editItem.uom ?? "Nos"} onChange={e => setEditItem(p => ({ ...p, uom: e.target.value }))}
                  placeholder="Nos / Kg / m / Set"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Unit Price (₹)</label>
                <input type="number" min={0} step="any" value={editItem.unit_price ?? 0} onChange={e => setEditItem(p => ({ ...p, unit_price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="flex items-end pb-1">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 w-full">
                  <p className="text-[10px] text-emerald-600 font-medium">Total</p>
                  <p className="text-sm font-bold text-emerald-700">{fmtCur((Number(editItem.quantity) || 0) * (Number(editItem.unit_price) || 0))}</p>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                <input value={editItem.description ?? ""} onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional part description"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ERP PO No.</label>
                <input value={editItem.erp_po_no ?? ""} onChange={e => setEditItem(p => ({ ...p, erp_po_no: e.target.value }))}
                  placeholder="PUR-0001"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ERP Item Code</label>
                <input value={editItem.erp_item_code ?? ""} onChange={e => setEditItem(p => ({ ...p, erp_item_code: e.target.value }))}
                  placeholder="ITEM-001"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
                <textarea value={editItem.notes ?? ""} onChange={e => setEditItem(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Internal notes"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setItemDrawer(false)} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveItem} disabled={savingItem}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                {savingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editItem.id ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ERP PO Import Modal ───────────────────────────────────────────── */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Import from ERP Purchase Orders</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a PO, pick items, and import their prices</p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 border-b border-slate-100 shrink-0">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input value={poSearchFilter} onChange={e => setPOSearchFilter(e.target.value)}
                  placeholder="Filter POs by name or supplier…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              {erpPOLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading purchase orders…</div>
              ) : (
                <select value={selectedPO} onChange={e => loadPOItems(e.target.value)}
                  size={1}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="">— Select Purchase Order —</option>
                  {filteredPOs.map(po => (
                    <option key={po.name} value={po.name}>
                      {po.name} | {po.supplier} | ₹{fmt(po.grand_total)} | {po.transaction_date}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {poItemsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
              ) : !selectedPO ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Select a Purchase Order to view its items
                </div>
              ) : poItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No items found in this PO</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{poItems.length} items in this PO</p>
                    <button onClick={() => setSelectedPOItems(selectedPOItems.size === poItems.length ? new Set() : new Set(poItems.map((_, i) => i)))}
                      className="text-xs text-indigo-500 hover:underline">
                      {selectedPOItems.size === poItems.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {poItems.map((it, i) => (
                      <label key={i}
                        className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                          selectedPOItems.has(i) ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100 hover:bg-white")}>
                        <input type="checkbox" checked={selectedPOItems.has(i)}
                          onChange={() => {
                            const n = new Set(selectedPOItems);
                            n.has(i) ? n.delete(i) : n.add(i);
                            setSelectedPOItems(n);
                          }}
                          className="mt-0.5 accent-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{it.item_name || it.item_code}</p>
                          <p className="text-[10px] text-slate-400 truncate">{it.item_code}{it.description ? ` — ${it.description}` : ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-slate-700">{fmtCur(it.rate)}</p>
                          <p className="text-[10px] text-slate-400">Qty: {it.qty} {it.uom}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-400">{selectedPOItems.size} item(s) selected</span>
              <div className="flex gap-2">
                <button onClick={() => setImportModal(false)} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={importSelectedItems} disabled={selectedPOItems.size === 0 || importingItems}
                  className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                  {importingItems && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Import {selectedPOItems.size > 0 ? `(${selectedPOItems.size})` : ""} Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
