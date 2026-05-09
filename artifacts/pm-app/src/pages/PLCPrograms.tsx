import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Loader2, Trash2, X, Code2, ChevronDown, Edit2, FileCode, Send, Upload, Download, File, FolderOpen } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "In Progress" | "Completed" | "Released";
const STATUSES: Status[] = ["Draft", "In Progress", "Completed", "Released"];
const LANGUAGES = ["Ladder Diagram", "Function Block Diagram", "Structured Text", "Sequential Function Chart", "Instruction List"];

const STATUS_META: Record<Status, { color: string; bg: string; border: string; dot: string }> = {
  "Draft":       { color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200", dot: "bg-slate-400"  },
  "In Progress": { color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200", dot: "bg-amber-500"  },
  "Completed":   { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",  dot: "bg-blue-500"   },
  "Released":    { color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500"},
};

const LANG_SHORT: Record<string, string> = {
  "Ladder Diagram": "LD", "Function Block Diagram": "FBD",
  "Structured Text": "ST", "Sequential Function Chart": "SFC", "Instruction List": "IL",
};

interface PLCProgram {
  id?: number; program_no?: string; project_number?: string; project_name?: string;
  controller_make?: string; controller_model?: string; program_name?: string;
  language?: string; version?: string; status?: Status; description?: string;
  notes?: string; created_by?: string; created_at?: string;
}

interface ProgramFile {
  id: number; program_id: number; program_type: string;
  filename: string; original_name: string; size: number;
  uploaded_by?: string; uploaded_at: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EMPTY: PLCProgram = { language: "Ladder Diagram", version: "1.0", status: "Draft" };

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

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
  const [drawerTab, setDrawerTab] = useState<"details" | "files">("details");

  const [files, setFiles] = useState<ProgramFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadFiles = useCallback(async (id: number) => {
    setFilesLoading(true);
    try {
      const r = await fetch(`${BASE}/api/plc/programs/${id}/files`);
      const d = await r.json();
      setFiles(d.data ?? []);
    } catch { toast({ title: "Could not load files", variant: "destructive" }); }
    finally { setFilesLoading(false); }
  }, []);

  const openNew = () => { setEditing({ ...EMPTY, created_by: user?.email }); setDrawerTab("details"); setFiles([]); setDrawerOpen(true); };
  const openEdit = (item: PLCProgram) => {
    setEditing(item); setDrawerTab("details"); setFiles([]);
    setDrawerOpen(true);
    if (item.id) loadFiles(item.id);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); setFiles([]); };

  const save = async () => {
    if (!editing.program_name?.trim()) { toast({ title: "Program name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/programs/${editing.id}` : `${BASE}/api/plc/programs`;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(await r.text());
      if (!editing.id) {
        const created = await r.json();
        setEditing(prev => ({ ...prev, id: created.id }));
        toast({ title: "Program created — you can now upload backup files" });
      } else {
        toast({ title: "Program updated" });
      }
      load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/programs/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const uploadFile = async (file: File) => {
    if (!editing.id) { toast({ title: "Save program first before uploading files", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (user?.email) fd.append("uploaded_by", user.email);
      const r = await fetch(`${BASE}/api/plc/programs/${editing.id}/files`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "File uploaded successfully" });
      loadFiles(editing.id);
    } catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const deleteFile = async (fileId: number) => {
    try {
      await fetch(`${BASE}/api/plc/files/${fileId}`, { method: "DELETE" });
      toast({ title: "File deleted" });
      if (editing.id) loadFiles(editing.id);
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const field = (k: keyof PLCProgram, val: any) => setEditing(p => ({ ...p, [k]: val }));

  const total = items.length;
  const released = items.filter(i => i.status === "Released").length;
  const inProgress = items.filter(i => i.status === "In Progress").length;
  const draft = items.filter(i => i.status === "Draft").length;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 shadow-sm shadow-blue-200">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">PLC Programs</h1>
                <p className="text-xs text-slate-500 mt-0.5">Program documentation, version control, backup & status tracking</p>
              </div>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Program
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Programs" value={total} sub="all projects" color="text-slate-800" />
            <StatCard label="Released" value={released} sub="in production" color="text-emerald-600" />
            <StatCard label="In Progress" value={inProgress} sub="active development" color="text-amber-600" />
            <StatCard label="Draft" value={draft} sub="not started" color="text-slate-500" />
          </div>

          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programs, controller, project…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <FileCode className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No PLC programs found</p>
                <p className="text-sm mt-1">Click "New Program" to add your first entry</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Controller</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const sm = STATUS_META[item.status as Status] ?? STATUS_META["Draft"];
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.program_name || "—"}</div>
                            {item.program_no && <div className="text-xs font-mono text-slate-400 mt-0.5">{item.program_no}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.controller_make || item.controller_model
                              ? <span>{item.controller_make}{item.controller_model ? ` ${item.controller_model}` : ""}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold font-mono">
                              {LANG_SHORT[item.language ?? ""] ?? item.language ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.project_name || <span className="text-slate-300">—</span>}
                            {item.project_number && <div className="text-slate-400 font-mono">{item.project_number}</div>}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-xs">v{item.version || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", sm.bg, sm.color, sm.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(item.created_at)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
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
                  {items.length} program{items.length !== 1 ? "s" : ""} found
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-600 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Program" : "New PLC Program"}</h2>
                  <p className="text-blue-200 text-xs mt-0.5">PLC Program Documentation</p>
                </div>
                <div className="flex items-center gap-2">
                  {editing.id && (
                    <button onClick={() => setDeleteId(editing.id!)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {editing.id && (
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {(["details", "files"] as const).map(tab => (
                    <button key={tab} onClick={() => setDrawerTab(tab)}
                      className={cn("flex-1 py-3 text-sm font-semibold transition-colors capitalize flex items-center justify-center gap-2",
                        drawerTab === tab
                          ? "border-b-2 border-blue-600 text-blue-700 bg-white"
                          : "text-slate-500 hover:text-slate-700")}>
                      {tab === "files" ? <FolderOpen className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                      {tab === "files" ? `Backup Files${files.length > 0 ? ` (${files.length})` : ""}` : "Program Details"}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {drawerTab === "details" ? (
                  <div className="p-6 space-y-5">
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="flex-1 h-px bg-slate-100" />Program Identity<span className="flex-1 h-px bg-slate-100" />
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Program No.</label>
                          <input value={editing.program_no ?? ""} onChange={e => field("program_no", e.target.value)}
                            placeholder="PLC-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                          <input value={editing.version ?? "1.0"} onChange={e => field("version", e.target.value)}
                            placeholder="1.0" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Program Name <span className="text-red-500">*</span></label>
                          <input value={editing.program_name ?? ""} onChange={e => field("program_name", e.target.value)}
                            placeholder="Main Control Program" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
                          <select value={editing.language ?? "Ladder Diagram"} onChange={e => field("language", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                          <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as Status)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="flex-1 h-px bg-slate-100" />Project<span className="flex-1 h-px bg-slate-100" />
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Project Number</label>
                          <input value={editing.project_number ?? ""} onChange={e => field("project_number", e.target.value)}
                            placeholder="WTT-2025-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                          <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                            placeholder="CETP Plant" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="flex-1 h-px bg-slate-100" />Controller Details<span className="flex-1 h-px bg-slate-100" />
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Make</label>
                          <input value={editing.controller_make ?? ""} onChange={e => field("controller_make", e.target.value)}
                            placeholder="Siemens / Allen Bradley" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
                          <input value={editing.controller_model ?? ""} onChange={e => field("controller_model", e.target.value)}
                            placeholder="S7-1500 / ControlLogix" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
                        </div>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="flex-1 h-px bg-slate-100" />Description & Notes<span className="flex-1 h-px bg-slate-100" />
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                          <textarea value={editing.description ?? ""} onChange={e => field("description", e.target.value)} rows={3}
                            placeholder="Describe what this program controls…"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                          <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={2}
                            placeholder="Revision history, special remarks…"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="mb-4">
                      <input ref={fileInputRef} type="file" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !editing.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "Uploading…" : "Upload Backup File"}
                      </button>
                      <p className="text-xs text-slate-400 text-center mt-1.5">Supports any file type · Max 50 MB per file</p>
                    </div>

                    {filesLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
                    ) : files.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-slate-500 text-sm">No backup files yet</p>
                        <p className="text-xs mt-1">Upload .zap, .ap15, .s7l or any backup file above</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg group">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                              <File className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-800 text-sm truncate">{f.original_name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{fmtSize(f.size)} · {fmtDate(f.uploaded_at)} {f.uploaded_by ? `· ${f.uploaded_by}` : ""}</div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a href={`${BASE}/api/plc/files/${f.id}/download`} target="_blank" rel="noreferrer"
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => deleteFile(f.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Create"} Program
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Program?</h3>
              <p className="text-sm text-slate-500 mb-5">This will also delete all associated backup files. This action cannot be undone.</p>
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
