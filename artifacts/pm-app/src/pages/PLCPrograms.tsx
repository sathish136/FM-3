import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Cpu, ChevronDown, Circle, Clock, CircleCheck, Code2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "In Progress" | "Completed" | "Released";
const STATUSES: Status[] = ["Draft", "In Progress", "Completed", "Released"];
const LANGUAGES = ["Ladder Diagram", "Function Block Diagram", "Structured Text", "Sequential Function Chart", "Instruction List"];

const STATUS_META: Record<Status, { color: string; bg: string; icon: typeof Circle }> = {
  "Draft":       { color: "text-slate-600",  bg: "bg-slate-100",  icon: Circle      },
  "In Progress": { color: "text-amber-700",  bg: "bg-amber-100",  icon: Clock       },
  "Completed":   { color: "text-blue-700",   bg: "bg-blue-100",   icon: CircleCheck },
  "Released":    { color: "text-green-700",  bg: "bg-green-100",  icon: CircleCheck },
};

interface PLCProgram {
  id?: number;
  program_no?: string;
  project_number?: string;
  project_name?: string;
  controller_make?: string;
  controller_model?: string;
  program_name?: string;
  language?: string;
  version?: string;
  status?: Status;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY: PLCProgram = { language: "Ladder Diagram", version: "1.0", status: "Draft" };

export default function PLCPrograms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PLCProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PLCProgram>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/programs?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerOpen(true); };
  const openEdit = (item: PLCProgram) => { setEditing(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); };

  const save = async () => {
    if (!editing.program_name?.trim()) { toast({ title: "Program name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/programs/${editing.id}` : `${BASE}/api/plc/programs`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing.id ? "Program updated" : "Program created" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/programs/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof PLCProgram, val: any) => setEditing(p => ({ ...p, [k]: val }));

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/10"><Code2 className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">PLC Programs</h1>
              <p className="text-xs text-slate-500">Manage PLC program documentation & versions</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No PLC programs found</p>
              <p className="text-sm mt-1">Create your first program to get started</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map(item => {
                const sm = STATUS_META[item.status as Status] ?? STATUS_META["Draft"];
                const Icon = sm.icon;
                return (
                  <div key={item.id} onClick={() => openEdit(item)}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0"><Code2 className="w-5 h-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.program_no && <span className="text-xs font-mono text-slate-400">{item.program_no}</span>}
                          <span className="font-semibold text-slate-800 truncate">{item.program_name || "Unnamed Program"}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", sm.bg, sm.color)}>
                            <Icon className="w-3 h-3" />{item.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.project_name && <span>{item.project_name}{item.project_number ? ` (${item.project_number})` : ""}</span>}
                          {item.controller_make && <span>Controller: {item.controller_make}{item.controller_model ? ` ${item.controller_model}` : ""}</span>}
                          <span>Language: {item.language}</span>
                          <span>v{item.version}</span>
                          <span>{fmtDate(item.created_at)}</span>
                        </div>
                        {item.description && <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">{item.description}</p>}
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

        {/* Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-blue-700 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit PLC Program" : "New PLC Program"}</h2>
                  <p className="text-blue-200 text-xs mt-0.5">PLC Program Documentation</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-blue-600 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Basic Info */}
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Program Identity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Program No.</label>
                      <input value={editing.program_no ?? ""} onChange={e => field("program_no", e.target.value)}
                        placeholder="PLC-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Version</label>
                      <input value={editing.version ?? "1.0"} onChange={e => field("version", e.target.value)}
                        placeholder="1.0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Program Name <span className="text-red-500">*</span></label>
                      <input value={editing.program_name ?? ""} onChange={e => field("program_name", e.target.value)}
                        placeholder="Main Control Program" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
                      <select value={editing.language ?? "Ladder Diagram"} onChange={e => field("language", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                        {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as Status)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Project */}
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Project</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project Number</label>
                      <input value={editing.project_number ?? ""} onChange={e => field("project_number", e.target.value)}
                        placeholder="WTT-2025-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project Name</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="CETP Plant" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                  </div>
                </section>

                {/* Controller */}
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Controller Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Controller Make</label>
                      <input value={editing.controller_make ?? ""} onChange={e => field("controller_make", e.target.value)}
                        placeholder="Siemens / Allen Bradley" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Controller Model</label>
                      <input value={editing.controller_model ?? ""} onChange={e => field("controller_model", e.target.value)}
                        placeholder="S7-1500 / ControlLogix" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                  </div>
                </section>

                {/* Description / Notes */}
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Description & Notes</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <textarea value={editing.description ?? ""} onChange={e => field("description", e.target.value)} rows={3}
                        placeholder="Describe what this program controls…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                      <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={2}
                        placeholder="Additional notes, revision history…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                  </div>
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing.id ? "Update" : "Create"} Program
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-bold text-slate-800 mb-2">Delete Program?</h3>
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
