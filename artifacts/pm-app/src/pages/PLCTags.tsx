import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Tag, ChevronDown, Edit2, Download, Send } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TagType = "AI" | "AO" | "DI" | "DO" | "INT" | "REAL" | "BOOL" | "STRING" | "TIMER" | "COUNTER" | "DINT" | "WORD";
const TAG_TYPES: TagType[] = ["AI", "AO", "DI", "DO", "BOOL", "INT", "DINT", "WORD", "REAL", "STRING", "TIMER", "COUNTER"];

const TYPE_COLORS: Record<string, string> = {
  AI: "bg-blue-50 text-blue-700 border-blue-100",
  AO: "bg-indigo-50 text-indigo-700 border-indigo-100",
  DI: "bg-emerald-50 text-emerald-700 border-emerald-100",
  DO: "bg-red-50 text-red-700 border-red-100",
  BOOL: "bg-amber-50 text-amber-700 border-amber-100",
  INT: "bg-purple-50 text-purple-700 border-purple-100",
  DINT: "bg-violet-50 text-violet-700 border-violet-100",
  WORD: "bg-cyan-50 text-cyan-700 border-cyan-100",
  REAL: "bg-teal-50 text-teal-700 border-teal-100",
  STRING: "bg-rose-50 text-rose-700 border-rose-100",
  TIMER: "bg-orange-50 text-orange-700 border-orange-100",
  COUNTER: "bg-lime-50 text-lime-700 border-lime-100",
};

interface PLCTag {
  id?: number; tag_name?: string; tag_type?: TagType; address?: string; data_type?: string;
  description?: string; project_number?: string; project_name?: string;
  eu_min?: number | string; eu_max?: number | string; unit?: string;
  hh_limit?: number | string; h_limit?: number | string; l_limit?: number | string;
  ll_limit?: number | string; status?: "Active" | "Inactive"; notes?: string;
  created_by?: string; created_at?: string;
}

const EMPTY: PLCTag = { tag_type: "AI", status: "Active" };

function StatCard({ label, value, color, badge }: { label: string; value: number; color: string; badge?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {badge && <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full w-fit border", TYPE_COLORS[badge] ?? "bg-slate-50 text-slate-500 border-slate-100")}>{badge}</span>}
    </div>
  );
}

export default function PLCTags() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PLCTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PLCTag>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (typeFilter !== "All") params.set("tag_type", typeFilter);
      const r = await fetch(`${BASE}/api/plc/tags?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerOpen(true); };
  const openEdit = (item: PLCTag) => { setEditing(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); };

  const save = async () => {
    if (!editing.tag_name?.trim()) { toast({ title: "Tag name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/tags/${editing.id}` : `${BASE}/api/plc/tags`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing.id ? "Tag updated" : "Tag created" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/tags/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof PLCTag, val: any) => setEditing(p => ({ ...p, [k]: val }));
  const numField = (k: keyof PLCTag, val: string) => setEditing(p => ({ ...p, [k]: val === "" ? undefined : val }));

  const exportCSV = () => {
    const headers = ["Tag Name","Tag Type","Address","Data Type","Description","Project","EU Min","EU Max","Unit","HH","H","L","LL","Status"];
    const rows = items.map(t => [
      t.tag_name, t.tag_type, t.address, t.data_type, t.description,
      t.project_name, t.eu_min, t.eu_max, t.unit,
      t.hh_limit, t.h_limit, t.l_limit, t.ll_limit, t.status
    ].map(v => `"${v ?? ""}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "plc-tags.csv"; a.click();
  };

  const total = items.length;
  const aiCount = items.filter(t => t.tag_type === "AI").length;
  const aoCount = items.filter(t => t.tag_type === "AO").length;
  const diCount = items.filter(t => t.tag_type === "DI").length;
  const doCount = items.filter(t => t.tag_type === "DO").length;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">PLC Tags</h1>
                <p className="text-xs text-slate-500 mt-0.5">Complete tag database with addresses, EU ranges & alarm limits</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> New Tag
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary Cards */}
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Total Tags" value={total} color="text-slate-800" />
            <StatCard label="Analog In" value={aiCount} color="text-blue-700" badge="AI" />
            <StatCard label="Analog Out" value={aoCount} color="text-indigo-700" badge="AO" />
            <StatCard label="Digital In" value={diCount} color="text-emerald-700" badge="DI" />
            <StatCard label="Digital Out" value={doCount} color="text-red-700" badge="DO" />
          </div>

          {/* Filters */}
          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tag name, address, description…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="All">All Types</option>
                {TAG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="All">All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No tags found</p>
                <p className="text-sm mt-1">Click "New Tag" to start building your tag database</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">EU Range</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Alarms HH/H/L/LL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                        <td className="px-4 py-2.5">
                          <div className="font-bold font-mono text-indigo-700">{item.tag_name}</div>
                          {item.data_type && <div className="text-xs font-mono text-slate-400 mt-0.5">{item.data_type}</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("px-2 py-1 rounded-md text-xs font-bold border", TYPE_COLORS[item.tag_type ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100")}>
                            {item.tag_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{item.address || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs max-w-44 truncate">{item.description || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-600">
                          {(item.eu_min != null || item.eu_max != null)
                            ? <>{item.eu_min ?? "—"} – {item.eu_max ?? "—"}<br /><span className="text-slate-400">{item.unit}</span></>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono">
                          {(item.hh_limit != null || item.h_limit != null || item.l_limit != null || item.ll_limit != null)
                            ? <div className="flex gap-1.5">
                                <span className="text-red-600">{item.hh_limit ?? "—"}</span>
                                <span className="text-orange-500">{item.h_limit ?? "—"}</span>
                                <span className="text-blue-500">{item.l_limit ?? "—"}</span>
                                <span className="text-indigo-600">{item.ll_limit ?? "—"}</span>
                              </div>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 max-w-28 truncate">{item.project_name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                            item.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200")}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", item.status === "Active" ? "bg-emerald-500" : "bg-slate-400")} />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                              className="p-1.5 rounded-lg hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                  <span>{items.length} tag{items.length !== 1 ? "s" : ""} — AI: {aiCount} · AO: {aoCount} · DI: {diCount} · DO: {doCount}</span>
                  <button onClick={exportCSV} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 font-medium transition-colors">
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
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-indigo-600 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Tag" : "New PLC Tag"}</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">PLC/SCADA Tag Configuration</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Tag Identity<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tag Name <span className="text-red-500">*</span></label>
                      <input value={editing.tag_name ?? ""} onChange={e => field("tag_name", e.target.value)}
                        placeholder="FIT_101 / MBR_FEED_FLOW" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tag Type</label>
                      <select value={editing.tag_type ?? "AI"} onChange={e => field("tag_type", e.target.value as TagType)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                        {TAG_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Data Type</label>
                      <input value={editing.data_type ?? ""} onChange={e => field("data_type", e.target.value)}
                        placeholder="REAL / INT / BOOL" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                      <input value={editing.address ?? ""} onChange={e => field("address", e.target.value)}
                        placeholder="MW100 / DB1.DBW0 / %IW0.0" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                      <input value={editing.description ?? ""} onChange={e => field("description", e.target.value)}
                        placeholder="MBR Feed Flow Rate" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Active"} onChange={e => field("status", e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="Project name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Engineering Units<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">EU Min</label>
                      <input type="number" step="any" value={editing.eu_min ?? ""} onChange={e => numField("eu_min", e.target.value)}
                        placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">EU Max</label>
                      <input type="number" step="any" value={editing.eu_max ?? ""} onChange={e => numField("eu_max", e.target.value)}
                        placeholder="100" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                      <input value={editing.unit ?? ""} onChange={e => field("unit", e.target.value)}
                        placeholder="m³/h / bar" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Alarm Limits<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {([["hh_limit","HH","text-red-600"], ["h_limit","H","text-orange-500"], ["l_limit","L","text-blue-500"], ["ll_limit","LL","text-indigo-600"]] as const).map(([k, lbl, cl]) => (
                      <div key={k}>
                        <label className={cn("block text-xs font-bold mb-1", cl)}>{lbl}</label>
                        <input type="number" step="any" value={(editing as any)[k] ?? ""} onChange={e => numField(k as any, e.target.value)}
                          placeholder="—" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-center font-mono" />
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Notes<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={2}
                    placeholder="Additional notes…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Create"} Tag
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Tag?</h3>
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
