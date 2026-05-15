import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Code2, ChevronDown,
  Upload, Download, File, FolderOpen, GitBranch, Info,
  CheckCircle2, Clock, AlertCircle, FileCode, User, Calendar,
  ArrowRight, RotateCcw, Hash, Tag, Layers, Activity,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Draft" | "In Progress" | "Completed" | "Released";
const STATUSES: Status[] = ["Draft", "In Progress", "Completed", "Released"];

const STATUS_CFG: Record<Status, { dot: string; badge: string }> = {
  "Draft":       { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600 border-gray-200" },
  "In Progress": { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "Completed":   { dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "Released":    { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function nextRevCode(revisions: Revision[]) {
  return `R${String(revisions.length).padStart(2, "0")}`;
}

const EMPTY: PLCProgram = { version: "1.0", status: "Draft" };
type DrawerTab = "backup" | "info" | "revisions";

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CFG[status as Status] ?? STATUS_CFG["Draft"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", cfg.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status || "Draft"}
    </span>
  );
}

function InputField({ icon: Icon, label, required, children }: { icon: any; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        {children}
      </div>
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
    } catch { toast({ title: "Failed to load programs", variant: "destructive" }); }
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
    if (!editing.program_name?.trim()) {
      toast({ title: "Program name is required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const revisions = editing.revisions ?? [];
      const isNew = !editing.id;
      const r = await fetch(
        isNew ? `${BASE}/api/plc/programs` : `${BASE}/api/plc/programs/${editing.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editing,
            updated_by: user?.email,
            rev_code: isNew ? undefined : nextRevCode(revisions),
            rev_description: revNote.trim() || undefined,
          }),
        }
      );
      if (!r.ok) throw new Error(await r.text());
      if (isNew) {
        const created = await r.json();
        setEditing(prev => ({ ...prev, id: created.id, revisions: created.revisions }));
        setDrawerTab("backup");
        toast({ title: "Program created — upload backup files now" });
      } else {
        toast({ title: "Program updated" });
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
    if (!editing.id) { toast({ title: "Save the program first", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (user?.email) fd.append("uploaded_by", user.email);
      const r = await fetch(`${BASE}/api/plc/programs/${editing.id}/files`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "File uploaded" });
      loadFiles(editing.id);
    } catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const deleteFile = async (fileId: number) => {
    try {
      await fetch(`${BASE}/api/plc/files/${fileId}`, { method: "DELETE" });
      toast({ title: "File removed" });
      if (editing.id) loadFiles(editing.id);
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const f = (k: keyof PLCProgram, v: any) => setEditing(p => ({ ...p, [k]: v }));

  const byStatus = (s: Status) => items.filter(i => i.status === s).length;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">PLC Programs</h1>
              <p className="text-xs text-gray-400">Program registry · backup files · revision tracking</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: items.length, cls: "text-gray-900" },
              { label: "Released", value: byStatus("Released"), cls: "text-emerald-600" },
              { label: "In Progress", value: byStatus("In Progress"), cls: "text-amber-600" },
              { label: "Draft", value: byStatus("Draft"), cls: "text-gray-400" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className={cn("text-2xl font-bold mt-0.5", s.cls)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search programs…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl text-center py-20">
              <FileCode className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-400">No programs yet</p>
              <p className="text-sm text-gray-300 mt-1">Click "New Program" to get started</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Program</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Project</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Version</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const revs: Revision[] = Array.isArray(item.revisions) ? item.revisions : [];
                    return (
                      <tr key={item.id} onClick={() => openEdit(item)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-800">{item.program_name || "—"}</p>
                          {item.program_no && <p className="text-xs text-gray-400 font-mono">{item.program_no}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          <p>{item.project_name || "—"}</p>
                          {item.project_number && <p className="text-xs text-gray-400 font-mono">{item.project_number}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-lg font-semibold">v{item.version}</span>
                          {revs.length > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{revs[revs.length - 1].rev}</p>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-gray-500">{fmtDate(item.updated_at || item.created_at)}</p>
                          {(item.updated_by || item.created_by) && (
                            <p className="text-xs text-gray-400">{(item.updated_by || item.created_by || "").split("@")[0]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400">
                {items.length} program{items.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-lg bg-white flex flex-col shadow-2xl">

            {/* Drawer Header — clean white */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-600 flex-shrink-0">
                    <Code2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">PLC Program</p>
                    <h2 className="font-bold text-gray-900 truncate">
                      {editing.program_name || (editing.id ? "Program Details" : "New Program")}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {editing.version && (
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">v{editing.version}</span>
                      )}
                      {editing.status && <StatusBadge status={editing.status} />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editing.id && (
                    <button onClick={() => setDeleteId(editing.id!)}
                      className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {editing.updated_at && (
                <p className="text-xs text-gray-400 mt-2 pl-11">
                  Last updated {fmtDateTime(editing.updated_at)}
                  {editing.updated_by && ` · ${editing.updated_by.split("@")[0]}`}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {([
                { id: "backup" as DrawerTab, label: "Backup Files", icon: Upload, count: files.length },
                { id: "info" as DrawerTab, label: "Program Info", icon: Info },
                { id: "revisions" as DrawerTab, label: "Revisions", icon: GitBranch, count: (editing.revisions ?? []).length },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setDrawerTab(tab.id)}
                  className={cn("flex items-center gap-1.5 py-3 pr-4 text-sm font-semibold border-b-2 transition-colors mr-2",
                    drawerTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-400 hover:text-gray-600")}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {"count" in tab && tab.count != null && tab.count > 0 && (
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      drawerTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500")}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {/* BACKUP FILES */}
              {drawerTab === "backup" && (
                <div className="p-6 space-y-4">
                  {!editing.id ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-400">Save the program first</p>
                      <p className="text-xs text-gray-300 mt-1">Switch to Program Info, fill details and save</p>
                    </div>
                  ) : (
                    <>
                      <input ref={fileInputRef} type="file" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 group">
                        {uploading
                          ? <Loader2 className="w-6 h-6 animate-spin" />
                          : <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        <div className="text-center">
                          <p className="text-sm font-semibold">{uploading ? "Uploading…" : "Upload Program Backup"}</p>
                          <p className="text-xs text-indigo-400 mt-0.5">.zap · .ap15 · .s7l · any format · max 50 MB</p>
                        </div>
                      </button>

                      {filesLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                      ) : files.length === 0 ? (
                        <div className="text-center py-6">
                          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                          <p className="text-sm text-gray-400">No backup files yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {files.map(f => (
                            <div key={f.id} className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
                              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <File className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{f.original_name}</p>
                                <p className="text-xs text-gray-400">
                                  {fmtSize(f.size)} · {fmtDate(f.uploaded_at)}
                                  {f.uploaded_by && ` · ${f.uploaded_by.split("@")[0]}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <a href={`${BASE}/api/plc/files/${f.id}/download`} target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                                  <Download className="w-4 h-4" />
                                </a>
                                <button onClick={() => deleteFile(f.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
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

              {/* PROGRAM INFO */}
              {drawerTab === "info" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={Hash} label="Program No.">
                      <input value={editing.program_no ?? ""} onChange={e => f("program_no", e.target.value)}
                        placeholder="PLC-001"
                        className="w-full pl-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
                    </InputField>
                    <InputField icon={Layers} label="Version">
                      <input value={editing.version ?? "1.0"} onChange={e => f("version", e.target.value)}
                        placeholder="1.0"
                        className="w-full pl-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
                    </InputField>
                  </div>

                  <InputField icon={FileCode} label="Program Name" required>
                    <input value={editing.program_name ?? ""} onChange={e => f("program_name", e.target.value)}
                      placeholder="Main Control Program"
                      className="w-full pl-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
                  </InputField>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUSES.map(s => {
                        const cfg = STATUS_CFG[s];
                        const active = editing.status === s;
                        return (
                          <button key={s} onClick={() => f("status", s)}
                            className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                              active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 text-gray-400 hover:border-gray-300 bg-white")}>
                            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", active ? cfg.dot : "bg-gray-300")} />
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={Tag} label="Project Number">
                      <input value={editing.project_number ?? ""} onChange={e => f("project_number", e.target.value)}
                        placeholder="WTT-2025-001"
                        className="w-full pl-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
                    </InputField>
                    <InputField icon={Activity} label="Project Name">
                      <input value={editing.project_name ?? ""} onChange={e => f("project_name", e.target.value)}
                        placeholder="CETP Plant"
                        className="w-full pl-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400" />
                    </InputField>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
                    <textarea value={editing.notes ?? ""} onChange={e => f("notes", e.target.value)} rows={3}
                      placeholder="Any additional notes about this program…"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 resize-none" />
                  </div>

                  {/* Revision Note */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {editing.id
                        ? `Revision Note — ${nextRevCode(editing.revisions ?? [])}`
                        : "Revision Note — R00 (Initial)"}
                    </p>
                    <input value={revNote} onChange={e => setRevNote(e.target.value)}
                      placeholder={editing.id ? "Describe what changed in this update…" : "Describe this initial version…"}
                      className="w-full px-3 py-2.5 text-sm border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                    <p className="text-[11px] text-indigo-400 mt-1.5">This note will appear in the revision history.</p>
                  </div>
                </div>
              )}

              {/* REVISIONS */}
              {drawerTab === "revisions" && (
                <div className="p-6">
                  {(editing.revisions ?? []).length === 0 ? (
                    <div className="text-center py-12">
                      <RotateCcw className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                      <p className="text-sm font-semibold text-gray-400">No revision history yet</p>
                      <p className="text-xs text-gray-300 mt-1">Revisions are logged each time you save</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        {(editing.revisions ?? []).length} revisions
                      </p>
                      {[...(editing.revisions ?? [])].reverse().map((rev, i, arr) => (
                        <div key={i} className="relative pl-8 pb-5 last:pb-0">
                          {i < arr.length - 1 && (
                            <div className="absolute left-3 top-5 bottom-0 w-px bg-gray-100" />
                          )}
                          <div className={cn(
                            "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            i === 0 ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                          )}>
                            <GitBranch className={cn("w-3 h-3", i === 0 ? "text-white" : "text-gray-400")} />
                          </div>
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={cn("font-mono text-xs font-bold px-2 py-0.5 rounded-lg",
                                i === 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500")}>
                                {rev.rev}
                              </span>
                              <span className="text-[10px] text-gray-400">{fmtDateTime(rev.at)}</span>
                            </div>
                            <p className="text-sm text-gray-700">{rev.description || "—"}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">{rev.by || "—"}</span>
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
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
              <button onClick={closeDrawer}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-white transition-colors">
                Close
              </button>
              {drawerTab === "info" && (
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-60 font-semibold transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {editing.id ? "Save Changes" : "Create Program"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full mx-4 border border-gray-100 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Delete this program?</h3>
            <p className="text-sm text-gray-400 mb-5">All backup files and revision history will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-600">Cancel</button>
              <button onClick={() => del(deleteId)}
                className="flex-1 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
