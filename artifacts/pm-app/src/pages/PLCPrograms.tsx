import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Code2, ChevronDown,
  Upload, Download, File, FolderOpen, GitBranch, Info,
  CheckCircle2, Clock, AlertCircle, FileCode, User, Calendar,
  ArrowUpRight, RotateCcw
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "In Progress" | "Completed" | "Released";
const STATUSES: Status[] = ["Draft", "In Progress", "Completed", "Released"];

const STATUS_CFG: Record<Status, { label: string; bg: string; text: string; border: string; dot: string; icon: any }> = {
  "Draft":       { label: "Draft",       bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-300",   dot: "bg-slate-400",   icon: AlertCircle },
  "In Progress": { label: "In Progress", bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-300",   dot: "bg-amber-500",   icon: Clock },
  "Completed":   { label: "Completed",   bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-300",    dot: "bg-blue-500",    icon: CheckCircle2 },
  "Released":    { label: "Released",    bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500", icon: CheckCircle2 },
};

interface Revision {
  rev: string;
  description: string;
  by: string;
  at: string;
}

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
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  revisions?: Revision[];
}

interface ProgramFile {
  id: number;
  program_id: number;
  filename: string;
  original_name: string;
  size: number;
  uploaded_by?: string;
  uploaded_at: string;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nextRevCode(revisions: Revision[]) {
  return `R${String(revisions.length).padStart(2, "0")}`;
}

const EMPTY: PLCProgram = { version: "1.0", status: "Draft" };

type DrawerTab = "backup" | "info" | "revisions";

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CFG[status as Status] ?? STATUS_CFG["Draft"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("backup");
  const [editing, setEditing] = useState<PLCProgram>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [revNote, setRevNote] = useState("");

  const [files, setFiles] = useState<ProgramFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("search", search.trim());
      if (statusFilter !== "All") p.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/programs?${p}`);
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

  const openNew = () => {
    setEditing({ ...EMPTY, created_by: user?.email });
    setDrawerTab("info");
    setFiles([]);
    setRevNote("");
    setDrawerOpen(true);
  };

  const openEdit = (item: PLCProgram) => {
    setEditing(item);
    setDrawerTab("backup");
    setFiles([]);
    setRevNote("");
    setDrawerOpen(true);
    if (item.id) loadFiles(item.id);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditing(EMPTY); setFiles([]); setRevNote(""); };

  const save = async () => {
    if (!editing.program_name?.trim()) { toast({ title: "Program name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const revisions = editing.revisions ?? [];
      const isNew = !editing.id;
      const method = isNew ? "POST" : "PATCH";
      const url = isNew ? `${BASE}/api/plc/programs` : `${BASE}/api/plc/programs/${editing.id}`;
      const body = {
        ...editing,
        updated_by: user?.email,
        rev_code: isNew ? undefined : nextRevCode(revisions),
        rev_description: revNote.trim() || undefined,
      };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      if (isNew) {
        const created = await r.json();
        setEditing(prev => ({ ...prev, id: created.id, revisions: created.revisions }));
        setDrawerTab("backup");
        toast({ title: "Program created — upload your backup files now" });
      } else {
        toast({ title: "Program updated" });
        await load();
        const refreshed = await fetch(`${BASE}/api/plc/programs/${editing.id}`);
        if (refreshed.ok) setEditing(await refreshed.json());
      }
      setRevNote("");
      load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/programs/${id}`, { method: "DELETE" });
      toast({ title: "Program deleted" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const uploadFile = async (file: File) => {
    if (!editing.id) { toast({ title: "Save the program first before uploading files", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (user?.email) fd.append("uploaded_by", user.email);
      const r = await fetch(`${BASE}/api/plc/programs/${editing.id}/files`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "Backup uploaded successfully" });
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

  const field = (k: keyof PLCProgram, v: any) => setEditing(p => ({ ...p, [k]: v }));

  const total = items.length;
  const byStatus = (s: Status) => items.filter(i => i.status === s).length;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow shadow-blue-200">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">PLC Programs</h1>
              <p className="text-xs text-slate-400 mt-0.5">Program registry · backup management · revision tracking</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Stats ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: total, color: "text-slate-800", bg: "bg-white" },
              { label: "Released", value: byStatus("Released"), color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "In Progress", value: byStatus("In Progress"), color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Draft", value: byStatus("Draft"), color: "text-slate-500", bg: "bg-slate-50" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border border-slate-200 p-4 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={cn("text-2xl font-black", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* ── Filters ───────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by program name, project…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
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

          {/* ── Table ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-24">
              <FileCode className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No PLC programs found</p>
              <p className="text-sm text-slate-400 mt-1">Click "New Program" to create the first entry</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Program</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Version</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">By</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => {
                    const revs: Revision[] = Array.isArray(item.revisions) ? item.revisions : [];
                    return (
                      <tr key={item.id}
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                        onClick={() => openEdit(item)}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.program_name || "—"}</div>
                          {item.program_no && <div className="text-xs text-slate-400 font-mono mt-0.5">{item.program_no}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          <div>{item.project_name || <span className="text-slate-300">—</span>}</div>
                          {item.project_number && <div className="text-slate-400 font-mono">{item.project_number}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-semibold">
                            v{item.version || "—"}
                          </span>
                          {revs.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{revs[revs.length - 1].rev}</div>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(item.updated_at || item.created_at)}</td>
                        <td className="px-4 py-3">
                          {(item.updated_by || item.created_by) ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-blue-600">
                                  {(item.updated_by || item.created_by || "?")[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 truncate max-w-24">
                                {(item.updated_by || item.created_by || "").split("@")[0]}
                              </span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                {items.length} program{items.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Drawer Header */}
            <div className="bg-slate-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">PLC Program</span>
                  </div>
                  <h2 className="text-white font-bold text-lg leading-tight truncate">
                    {editing.program_name || (editing.id ? "Program Details" : "New Program")}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {editing.program_no && (
                      <span className="text-xs font-mono bg-white/10 text-blue-200 px-2 py-0.5 rounded">{editing.program_no}</span>
                    )}
                    {editing.version && (
                      <span className="text-xs font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded">v{editing.version}</span>
                    )}
                    {editing.status && <StatusBadge status={editing.status} />}
                  </div>
                  {editing.updated_at && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">
                        Updated {fmtDateTime(editing.updated_at)}
                        {editing.updated_by && ` · ${editing.updated_by.split("@")[0]}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editing.id && (
                    <button onClick={() => setDeleteId(editing.id!)}
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
              {([
                { id: "backup" as DrawerTab, label: "Backup Files", icon: Upload, count: files.length },
                { id: "info" as DrawerTab, label: "Program Info", icon: Info, count: null },
                { id: "revisions" as DrawerTab, label: "Revisions", icon: GitBranch, count: (editing.revisions ?? []).length },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setDrawerTab(tab.id)}
                  className={cn("flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2",
                    drawerTab === tab.id
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700")}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={cn("ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      drawerTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600")}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── BACKUP FILES TAB ─────────────────────────────────── */}
              {drawerTab === "backup" && (
                <div className="p-6 space-y-4">
                  {!editing.id ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      <Upload className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">Save the program first</p>
                      <p className="text-xs text-slate-400 mt-1">Go to Program Info tab, fill details and save</p>
                    </div>
                  ) : (
                    <>
                      <input ref={fileInputRef} type="file" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="w-full group flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50">
                        {uploading
                          ? <Loader2 className="w-7 h-7 animate-spin" />
                          : <Upload className="w-7 h-7 group-hover:scale-110 transition-transform" />
                        }
                        <div className="text-center">
                          <p className="font-semibold text-sm">{uploading ? "Uploading…" : "Upload Program Backup"}</p>
                          <p className="text-xs text-blue-400 mt-0.5">Click or drag · .zap · .ap15 · .s7l · any format · max 50 MB</p>
                        </div>
                      </button>

                      {filesLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
                      ) : files.length === 0 ? (
                        <div className="text-center py-8">
                          <FolderOpen className="w-9 h-9 mx-auto mb-2 text-slate-200" />
                          <p className="text-sm text-slate-400">No backup files uploaded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{files.length} file{files.length !== 1 ? "s" : ""}</p>
                          {files.map(f => (
                            <div key={f.id} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                                <File className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 text-sm truncate">{f.original_name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-400">{fmtSize(f.size)}</span>
                                  <span className="text-slate-300 text-xs">·</span>
                                  <span className="text-xs text-slate-400">{fmtDate(f.uploaded_at)}</span>
                                  {f.uploaded_by && <>
                                    <span className="text-slate-300 text-xs">·</span>
                                    <span className="text-xs text-slate-400">{f.uploaded_by.split("@")[0]}</span>
                                  </>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <a href={`${BASE}/api/plc/files/${f.id}/download`} target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="Download">
                                  <Download className="w-4 h-4" />
                                </a>
                                <button onClick={() => deleteFile(f.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── PROGRAM INFO TAB ─────────────────────────────────── */}
              {drawerTab === "info" && (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Program No.</label>
                      <input value={editing.program_no ?? ""} onChange={e => field("program_no", e.target.value)}
                        placeholder="PLC-001"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Version</label>
                      <input value={editing.version ?? "1.0"} onChange={e => field("version", e.target.value)}
                        placeholder="1.0"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Program Name <span className="text-red-500">*</span>
                    </label>
                    <input value={editing.program_name ?? ""} onChange={e => field("program_name", e.target.value)}
                      placeholder="Main Control Program"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      {STATUSES.map(s => {
                        const cfg = STATUS_CFG[s];
                        const active = editing.status === s;
                        return (
                          <button key={s} onClick={() => field("status", s)}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                              active ? cn("bg-white shadow-sm", cfg.text) : "text-slate-400 hover:text-slate-600")}>
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", active ? cfg.dot : "bg-slate-300")} />
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Number</label>
                      <input value={editing.project_number ?? ""} onChange={e => field("project_number", e.target.value)}
                        placeholder="WTT-2025-001"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Name</label>
                      <input value={editing.project_name ?? ""} onChange={e => field("project_name", e.target.value)}
                        placeholder="CETP Plant"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea value={editing.notes ?? ""} onChange={e => field("notes", e.target.value)} rows={2}
                      placeholder="Additional notes…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors resize-none" />
                  </div>

                  {/* Revision Note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        {editing.id
                          ? `Revision Note — ${nextRevCode(editing.revisions ?? [])}`
                          : "Revision Note — R00 (Initial)"}
                      </span>
                    </div>
                    <input value={revNote} onChange={e => setRevNote(e.target.value)}
                      placeholder={editing.id ? "Describe what changed in this update…" : "Describe this initial version…"}
                      className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white" />
                    <p className="text-[11px] text-amber-600">This note will be added to the revision history log.</p>
                  </div>
                </div>
              )}

              {/* ── REVISIONS TAB ────────────────────────────────────── */}
              {drawerTab === "revisions" && (
                <div className="p-6">
                  {((editing.revisions ?? []).length === 0) ? (
                    <div className="text-center py-12">
                      <RotateCcw className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-400">No revision history yet</p>
                      <p className="text-xs text-slate-400 mt-1">Revisions are logged each time the program is saved</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {(editing.revisions ?? []).length} revision{(editing.revisions ?? []).length !== 1 ? "s" : ""}
                      </p>
                      {[...(editing.revisions ?? [])].reverse().map((rev, i, arr) => (
                        <div key={i} className="relative pl-8 pb-6 last:pb-0">
                          {i < arr.length - 1 && (
                            <div className="absolute left-3 top-5 bottom-0 w-px bg-slate-200" />
                          )}
                          <div className={cn(
                            "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            i === 0 ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                          )}>
                            <GitBranch className={cn("w-3 h-3", i === 0 ? "text-white" : "text-slate-400")} />
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className={cn(
                                "inline-block font-mono text-xs font-bold px-2 py-0.5 rounded",
                                i === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                              )}>
                                {rev.rev}
                              </span>
                              <span className="text-[10px] text-slate-400">{fmtDateTime(rev.at)}</span>
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{rev.description || "—"}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-2.5 h-2.5 text-slate-500" />
                              </div>
                              <span className="text-xs text-slate-500">{rev.by || "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <button onClick={closeDrawer}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Close
              </button>
              {drawerTab === "info" && (
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-semibold shadow-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  {editing.id ? "Save Changes" : "Create & Upload Backup"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-center mb-1">Delete Program?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">All backup files and revision history will also be deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
              <button onClick={() => del(deleteId)} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
