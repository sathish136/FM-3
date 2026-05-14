import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu, Plus, Search, RefreshCw, Trash2, Save, ArrowLeft,
  Eye, EyeOff, FolderOpen, Wifi, Shield, Router, Settings2,
  Monitor, Network, ChevronRight, Server, AlertCircle,
  ChevronDown, Loader2, Download, Upload, FileText, X,
  Phone, MapPin, User, Key, Link, Terminal, LayoutGrid,
  Archive, Calendar, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project { code: string; name: string; label: string; status?: string; }
interface ConfigFile {
  id: number; config_id: number; file_category: string;
  filename: string; original_name: string; size: number;
  uploaded_by?: string; uploaded_at: string;
}
interface DeviceConfig {
  id: number;
  project_number?: string; project_name?: string;
  site_location?: string; contact_name?: string; contact_phone?: string;
  cpu_make?: string; cpu_model?: string; cpu_type?: string;
  plc_ip?: string; plc_make?: string; plc_model?: string; plc_type?: string;
  plc_version?: string; plc_serial_no?: string; plc_rack?: string; plc_slot?: string;
  comm_protocol?: string; io_count?: string; expansion_modules?: string;
  programming_software?: string; software_version?: string; license_key?: string;
  vpn_ip?: string; vpn_username?: string; vpn_password?: string;
  anydesk_id?: string; anydesk_password?: string;
  teamviewer_id?: string; teamviewer_password?: string;
  rdp_ip?: string; rdp_username?: string; rdp_password?: string;
  ssh_ip?: string; ssh_username?: string; ssh_password?: string;
  modem_ip?: string; modem_username?: string; modem_password?: string;
  modem_make?: string; modem_model?: string; modem_sim_no?: string; carrier?: string;
  wifi_ssid?: string; wifi_password?: string; wifi_ip?: string;
  wifi_router_make?: string; wifi_security?: string; ip_subnet?: string; ip_gateway?: string;
  scada_software?: string; scada_version?: string;
  hmi_make?: string; hmi_model?: string; hmi_ip?: string;
  last_backup_date?: string; backup_schedule?: string; config_notes?: string;
  created_by?: string; created_at?: string; updated_at?: string;
}
type FormState = Omit<DeviceConfig, "id" | "created_at" | "updated_at">;
const EMPTY: FormState = {
  project_number: "", project_name: "", site_location: "", contact_name: "", contact_phone: "",
  cpu_make: "", cpu_model: "", cpu_type: "",
  plc_ip: "", plc_make: "", plc_model: "", plc_type: "", plc_version: "",
  plc_serial_no: "", plc_rack: "", plc_slot: "",
  comm_protocol: "", io_count: "", expansion_modules: "",
  programming_software: "", software_version: "", license_key: "",
  vpn_ip: "", vpn_username: "", vpn_password: "",
  anydesk_id: "", anydesk_password: "",
  teamviewer_id: "", teamviewer_password: "",
  rdp_ip: "", rdp_username: "", rdp_password: "",
  ssh_ip: "", ssh_username: "", ssh_password: "",
  modem_ip: "", modem_username: "", modem_password: "",
  modem_make: "", modem_model: "", modem_sim_no: "", carrier: "",
  wifi_ssid: "", wifi_password: "", wifi_ip: "",
  wifi_router_make: "", wifi_security: "", ip_subnet: "", ip_gateway: "",
  scada_software: "", scada_version: "",
  hmi_make: "", hmi_model: "", hmi_ip: "",
  last_backup_date: "", backup_schedule: "", config_notes: "",
};

const CPU_TYPES = ["Compact", "Modular", "Rack", "DIN Rail", "Panel-Mount", "Other"];
const PLC_TYPES = [
  "Siemens S7-1200", "Siemens S7-1500", "Siemens S7-300", "Siemens S7-400",
  "Allen Bradley CompactLogix", "Allen Bradley ControlLogix", "Allen Bradley MicroLogix",
  "Mitsubishi FX", "Mitsubishi Q Series", "Schneider Modicon M221", "Schneider Modicon M241",
  "ABB AC500", "Delta DVP", "Omron CP", "Omron CJ", "GE Fanuc", "Other",
];
const PROTOCOLS = ["Profinet", "Profibus DP", "Ethernet/IP", "Modbus TCP", "Modbus RTU", "DeviceNet", "CANopen", "OPC-UA", "BACnet", "Other"];
const WIFI_SECURITY = ["WPA2-Personal", "WPA3-Personal", "WPA2-Enterprise", "WPA/WPA2", "WEP", "Open"];
const CARRIERS = ["Airtel", "Jio", "BSNL", "Vi (Vodafone-Idea)", "MTNL", "Other"];
const PROG_SOFTWARE = ["TIA Portal", "GX Works 2", "GX Works 3", "Studio 5000", "RSLogix 5000", "RSLogix 500", "EcoStruxure", "Sysmac Studio", "CX-Programmer", "Other"];
const BACKUP_SCHEDULE = ["Daily", "Weekly", "Monthly", "After each change", "Manual"];
const FILE_CATEGORIES = [
  { id: "modem_backup",   label: "Modem Backup Config", color: "text-amber-600" },
  { id: "plc_backup",     label: "PLC Program Backup",  color: "text-blue-600"  },
  { id: "hmi_backup",     label: "HMI Program Backup",  color: "text-indigo-600"},
  { id: "network_diagram",label: "Network Diagram",      color: "text-green-600" },
  { id: "config_doc",     label: "Config Document",      color: "text-purple-600"},
  { id: "general",        label: "General Attachment",   color: "text-gray-600"  },
];

type Tab = "project" | "plc" | "network" | "remote" | "modem" | "wifi" | "config" | "files";
const TABS: { id: Tab; label: string; icon: typeof Cpu; badge?: (f: FormState) => boolean }[] = [
  { id: "project", label: "Project",       icon: FolderOpen },
  { id: "plc",     label: "PLC Details",   icon: Cpu        },
  { id: "network", label: "Network",       icon: Network    },
  { id: "remote",  label: "Remote Access", icon: Shield     },
  { id: "modem",   label: "Modem",         icon: Router     },
  { id: "wifi",    label: "WiFi",          icon: Wifi       },
  { id: "config",  label: "Config",        icon: Settings2  },
  { id: "files",   label: "Files",         icon: Paperclip  },
];

// ── ERP Project Picker ────────────────────────────────────────────────────────
function ErpProjectPicker({ value, onChange }: { value: string; onChange: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erpFailed, setErpFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/workshop/erp-projects`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); if (!(d.projects ?? []).length) setErpFailed(true); })
      .catch(() => setErpFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = q.trim() ? projects.filter(p => p.label.toLowerCase().includes(q.toLowerCase())) : projects;
  const pick = (p: Project) => { picked.current = true; onChange(p); setQ(p.label); setOpen(false); };
  const commitFreeText = () => {
    if (picked.current) { picked.current = false; return; }
    if (q.trim()) {
      const parts = q.trim().split(" - ");
      const code = parts.length > 1 ? parts[0].trim() : "";
      const name = parts.length > 1 ? parts.slice(1).join(" - ").trim() : q.trim();
      onChange({ code, name, label: q.trim() });
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        <input
          className="flex-1 px-3 py-2 text-sm bg-white outline-none text-gray-800"
          placeholder={erpFailed ? "Type: WTT-001 - Project Name…" : "Search ERP project…"}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange({ code: "", name: e.target.value, label: e.target.value }); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(commitFreeText, 150)}
          onKeyDown={e => e.key === "Enter" && commitFreeText()}
        />
        <button type="button" onClick={() => setOpen(v => !v)} className="px-3 text-gray-400 hover:text-gray-600">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
          {filtered.map(p => (
            <button key={p.code} type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
              onMouseDown={() => { picked.current = true; }} onClick={() => pick(p)}>
              <span className="font-mono text-xs text-blue-700 font-bold shrink-0">{p.code}</span>
              <span className="text-gray-800 truncate">{p.name}</span>
              {p.status === "Completed" && <span className="ml-auto text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">Done</span>}
            </button>
          ))}
        </div>
      )}
      {erpFailed && !open && <p className="text-[10px] text-amber-600 mt-1">ERP unavailable — type project details manually</p>}
    </div>
  );
}

// ── Form Field Primitives ─────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", placeholder = "",
  span2 = false, options, password, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; span2?: boolean;
  options?: string[]; password?: boolean; textarea?: boolean;
}) {
  const [show, setShow] = useState(false);
  const base = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";
  return (
    <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={base}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={cn(base, "resize-none")} />
      ) : (
        <div className="relative">
          <input
            type={password && !show ? "password" : type}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(base, password && "pr-9")}
          />
          {password && (
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: typeof Cpu; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <Icon size={15} className="text-blue-600" />
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// ── File Upload Panel ─────────────────────────────────────────────────────────
function FilesTab({ configId, userName }: { configId: number | null; userName: string }) {
  const [files, setFiles] = useState<ConfigFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("modem_backup");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!configId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/plc/device-configs/${configId}/files`);
      const d = await r.json();
      setFiles(d.data || []);
    } finally { setLoading(false); }
  }, [configId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!configId || !e.target.files?.[0]) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", e.target.files[0]);
    fd.append("file_category", category);
    fd.append("uploaded_by", userName);
    try {
      const r = await fetch(`${BASE}/api/plc/device-configs/${configId}/files`, { method: "POST", body: fd });
      if (r.ok) { await fetchFiles(); if (fileRef.current) fileRef.current.value = ""; }
    } finally { setUploading(false); }
  }

  async function handleDelete(fileId: number) {
    if (!configId || !confirm("Remove this file?")) return;
    await fetch(`${BASE}/api/plc/device-configs/${configId}/files/${fileId}`, { method: "DELETE" });
    fetchFiles();
  }

  function catInfo(catId: string) {
    return FILE_CATEGORIES.find(c => c.id === catId) || { label: catId, color: "text-gray-600" };
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (!configId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Archive size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Save the config first to upload files</p>
      </div>
    );
  }

  return (
    <div>
      {/* Upload area */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
          <Upload size={15} /> Upload File
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">File Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FILE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Select File</label>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" onChange={handleUpload} disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer disabled:opacity-50" />
              {uploading && <Loader2 size={18} className="animate-spin text-blue-600 self-center" />}
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-600">Max file size: 100 MB · Any file type accepted</p>
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <FileText size={36} className="mb-2 opacity-40" />
          <p className="text-sm">No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {FILE_CATEGORIES.map(cat => {
            const catFiles = files.filter(f => f.file_category === cat.id);
            if (!catFiles.length) return null;
            return (
              <div key={cat.id}>
                <p className={cn("text-xs font-bold uppercase tracking-wide mb-2", cat.color)}>{cat.label}</p>
                {catFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-2 hover:border-blue-300 transition-colors">
                    <FileText size={16} className="text-gray-400 flex-none" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {fmtSize(f.size)} · {f.uploaded_by || "Unknown"} · {new Date(f.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={`${BASE}/api/plc/device-configs/${configId}/files/${f.id}/download`}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Download">
                      <Download size={15} />
                    </a>
                    <button onClick={() => handleDelete(f.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PLCDeviceConfig() {
  const { user } = useAuth();
  const userName = (user as any)?.fullName || (user as any)?.email || "";

  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DeviceConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [activeTab, setActiveTab] = useState<Tab>("project");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const r = await fetch(`${BASE}/api/plc/device-configs${q}`);
      setConfigs((await r.json()).data || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  function openNew() {
    setForm({ ...EMPTY, created_by: userName });
    setSelected(null);
    setIsNew(true);
    setActiveTab("project");
    setError("");
  }

  function openEdit(c: DeviceConfig) {
    const f = { ...EMPTY };
    (Object.keys(EMPTY) as (keyof FormState)[]).forEach(k => { (f as any)[k] = (c as any)[k] ?? ""; });
    setForm(f);
    setSelected(c);
    setIsNew(false);
    setActiveTab("project");
    setError("");
  }

  function closeDetail() { setSelected(null); setIsNew(false); setError(""); }

  const sf = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const body: any = { ...form };
      Object.keys(body).forEach(k => { if (body[k] === "") body[k] = null; });
      const url = isNew ? `${BASE}/api/plc/device-configs` : `${BASE}/api/plc/device-configs/${selected!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      const saved = await r.json();
      if (isNew) { setIsNew(false); setSelected(saved); }
      else { setSelected(saved); }
      await fetchConfigs();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this device config? This cannot be undone.")) return;
    await fetch(`${BASE}/api/plc/device-configs/${id}`, { method: "DELETE" });
    await fetchConfigs();
    closeDetail();
  }

  const inDetail = isNew || selected !== null;
  const configId = selected?.id ?? null;

  const tabIdx = TABS.findIndex(t => t.id === activeTab);

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex-none bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {inDetail && (
                <button onClick={closeDetail}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Cpu size={17} className="text-blue-700" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">PLC Device Config</h1>
                <p className="text-xs text-gray-500">
                  {inDetail
                    ? (isNew ? "New Config" : `${selected?.project_name || selected?.project_number || `#${selected?.id}`}`)
                    : `${configs.length} record${configs.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!inDetail && (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && fetchConfigs()}
                      placeholder="Search project, make…"
                      className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
                  </div>
                  <button onClick={fetchConfigs}
                    className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    <Plus size={14} /> New Config
                  </button>
                </>
              )}
              {inDetail && (
                <>
                  {!isNew && selected && (
                    <button onClick={() => handleDelete(selected.id)} disabled={saving}
                      className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save size={14} /> {saving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} className="flex-none" /> {error}
          </div>
        )}

        {/* ── List view ───────────────────────────────────────────────────── */}
        {!inDetail && (
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-gray-400">
                <Loader2 size={22} className="animate-spin mr-2" /> Loading…
              </div>
            ) : configs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <Cpu size={40} className="mb-3 opacity-30" />
                <p className="text-sm text-gray-500">No device configs yet</p>
                <button onClick={openNew}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  <Plus size={14} /> Create First Config
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {configs.map(c => (
                  <button key={c.id} onClick={() => openEdit(c)}
                    className="text-left bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Cpu size={17} className="text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {c.project_name || "Unnamed Project"}
                          </p>
                          {c.project_number && <p className="text-xs text-blue-600 font-mono">{c.project_number}</p>}
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-colors mt-1" />
                    </div>
                    {c.site_location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <MapPin size={11} className="text-gray-400 flex-none" /> {c.site_location}
                      </div>
                    )}
                    {(c.plc_make || c.plc_model) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                        <Server size={11} className="text-gray-400 flex-none" />
                        {[c.plc_make, c.plc_model].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {c.plc_ip && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                        <Network size={11} className="text-gray-400 flex-none" />
                        <span className="font-mono">{c.plc_ip}</span>
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {c.vpn_ip      && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium">VPN</span>}
                      {c.anydesk_id  && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">AnyDesk</span>}
                      {c.modem_ip    && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">Modem</span>}
                      {c.wifi_ssid   && <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[10px] font-medium">WiFi</span>}
                      {c.scada_software && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-medium">SCADA</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-100 pt-2">
                      Updated {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Detail / Edit view ──────────────────────────────────────────── */}
        {inDetail && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Horizontal tab bar */}
            <div className="flex-none bg-white border-b border-gray-200 px-6">
              <div className="flex gap-0 overflow-x-auto">
                {TABS.map((t, i) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                        active
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                      )}>
                      <Icon size={14} />
                      {t.label}
                      {t.id === "files" && !isNew && configId && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">↑</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl">

              {/* PROJECT ─────────────────────────────────────────────────── */}
              {activeTab === "project" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={FolderOpen} title="Project Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">ERP Project</label>
                        <ErpProjectPicker
                          value={form.project_number ? `${form.project_number} - ${form.project_name}` : form.project_name || ""}
                          onChange={p => setForm(f => ({ ...f, project_number: p.code, project_name: p.name }))}
                        />
                      </div>
                      <Field label="Project Number" value={form.project_number || ""} onChange={v => sf("project_number", v)} placeholder="e.g. WTT-2024-001" />
                      <Field label="Project Name" value={form.project_name || ""} onChange={v => sf("project_name", v)} placeholder="e.g. Vadodara MBR Plant" />
                      <Field label="Site Location" value={form.site_location || ""} onChange={v => sf("site_location", v)} placeholder="City / State" span2 />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={User} title="Site Contact" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Contact Person" value={form.contact_name || ""} onChange={v => sf("contact_name", v)} placeholder="Name" />
                      <Field label="Contact Phone" value={form.contact_phone || ""} onChange={v => sf("contact_phone", v)} placeholder="+91 9XXXXXXXXX" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Cpu} title="CPU Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="CPU Make" value={form.cpu_make || ""} onChange={v => sf("cpu_make", v)} placeholder="e.g. Siemens" />
                      <Field label="CPU Model" value={form.cpu_model || ""} onChange={v => sf("cpu_model", v)} placeholder="e.g. S7-1214C DC/DC/DC" />
                      <Field label="CPU Type" value={form.cpu_type || ""} onChange={v => sf("cpu_type", v)} options={CPU_TYPES} />
                    </div>
                  </div>
                </div>
              )}

              {/* PLC ─────────────────────────────────────────────────────── */}
              {activeTab === "plc" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Cpu} title="PLC Identification" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="PLC Make" value={form.plc_make || ""} onChange={v => sf("plc_make", v)} placeholder="e.g. Siemens" />
                      <Field label="PLC Model" value={form.plc_model || ""} onChange={v => sf("plc_model", v)} placeholder="e.g. S7-1500" />
                      <Field label="PLC Type / Series" value={form.plc_type || ""} onChange={v => sf("plc_type", v)} options={PLC_TYPES} />
                      <Field label="Firmware Version" value={form.plc_version || ""} onChange={v => sf("plc_version", v)} placeholder="e.g. V2.9.2" />
                      <Field label="Serial Number" value={form.plc_serial_no || ""} onChange={v => sf("plc_serial_no", v)} placeholder="e.g. S C-E2A01234" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={LayoutGrid} title="Rack / Addressing" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Rack No." value={form.plc_rack || ""} onChange={v => sf("plc_rack", v)} placeholder="e.g. 0" />
                      <Field label="Slot No." value={form.plc_slot || ""} onChange={v => sf("plc_slot", v)} placeholder="e.g. 1" />
                      <Field label="I/O Count (DI/DO/AI/AO)" value={form.io_count || ""} onChange={v => sf("io_count", v)} placeholder="e.g. DI:16, DO:8, AI:4" />
                      <Field label="Expansion Modules" value={form.expansion_modules || ""} onChange={v => sf("expansion_modules", v)} placeholder="e.g. SM 1231 x2, SM 1232 x1" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Settings2} title="Programming Software" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Programming Software" value={form.programming_software || ""} onChange={v => sf("programming_software", v)} options={PROG_SOFTWARE} />
                      <Field label="Software Version" value={form.software_version || ""} onChange={v => sf("software_version", v)} placeholder="e.g. V18 Update 3" />
                      <Field label="License Key / ID" value={form.license_key || ""} onChange={v => sf("license_key", v)} placeholder="License key or dongle ID" password />
                    </div>
                  </div>
                </div>
              )}

              {/* NETWORK ─────────────────────────────────────────────────── */}
              {activeTab === "network" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Network} title="IP Addressing" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="PLC IP Address" value={form.plc_ip || ""} onChange={v => sf("plc_ip", v)} placeholder="e.g. 192.168.0.1" />
                      <Field label="Subnet Mask" value={form.ip_subnet || ""} onChange={v => sf("ip_subnet", v)} placeholder="e.g. 255.255.255.0" />
                      <Field label="Default Gateway" value={form.ip_gateway || ""} onChange={v => sf("ip_gateway", v)} placeholder="e.g. 192.168.0.254" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Link} title="Communication Protocol" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Primary Protocol" value={form.comm_protocol || ""} onChange={v => sf("comm_protocol", v)} options={PROTOCOLS} />
                    </div>
                  </div>
                </div>
              )}

              {/* REMOTE ACCESS ───────────────────────────────────────────── */}
              {activeTab === "remote" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Shield} title="VPN" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="VPN IP Address" value={form.vpn_ip || ""} onChange={v => sf("vpn_ip", v)} placeholder="e.g. 10.8.0.5" />
                      <Field label="VPN Username" value={form.vpn_username || ""} onChange={v => sf("vpn_username", v)} placeholder="Username" />
                      <Field label="VPN Password" value={form.vpn_password || ""} onChange={v => sf("vpn_password", v)} placeholder="Password" password />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Monitor} title="AnyDesk" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="AnyDesk ID" value={form.anydesk_id || ""} onChange={v => sf("anydesk_id", v)} placeholder="e.g. 123 456 789" />
                      <Field label="AnyDesk Password" value={form.anydesk_password || ""} onChange={v => sf("anydesk_password", v)} placeholder="Password" password />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Monitor} title="TeamViewer" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="TeamViewer ID" value={form.teamviewer_id || ""} onChange={v => sf("teamviewer_id", v)} placeholder="e.g. 987 654 321" />
                      <Field label="TeamViewer Password" value={form.teamviewer_password || ""} onChange={v => sf("teamviewer_password", v)} placeholder="Password" password />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Monitor} title="Remote Desktop (RDP)" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="RDP IP / Hostname" value={form.rdp_ip || ""} onChange={v => sf("rdp_ip", v)} placeholder="e.g. 192.168.0.10" />
                      <Field label="RDP Username" value={form.rdp_username || ""} onChange={v => sf("rdp_username", v)} placeholder="Username" />
                      <Field label="RDP Password" value={form.rdp_password || ""} onChange={v => sf("rdp_password", v)} placeholder="Password" password />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Terminal} title="SSH" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="SSH IP / Host" value={form.ssh_ip || ""} onChange={v => sf("ssh_ip", v)} placeholder="e.g. 192.168.0.5" />
                      <Field label="SSH Username" value={form.ssh_username || ""} onChange={v => sf("ssh_username", v)} placeholder="Username" />
                      <Field label="SSH Password / Key" value={form.ssh_password || ""} onChange={v => sf("ssh_password", v)} placeholder="Password" password />
                    </div>
                  </div>
                </div>
              )}

              {/* MODEM ───────────────────────────────────────────────────── */}
              {activeTab === "modem" && (
                <div>
                  <SectionHead icon={Router} title="Modem / SIM Details" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Modem Make" value={form.modem_make || ""} onChange={v => sf("modem_make", v)} placeholder="e.g. Huawei" />
                    <Field label="Modem Model" value={form.modem_model || ""} onChange={v => sf("modem_model", v)} placeholder="e.g. E3372h" />
                    <Field label="Modem IP Address" value={form.modem_ip || ""} onChange={v => sf("modem_ip", v)} placeholder="e.g. 192.168.8.1" />
                    <Field label="Modem Username" value={form.modem_username || ""} onChange={v => sf("modem_username", v)} placeholder="admin" />
                    <Field label="Modem Password" value={form.modem_password || ""} onChange={v => sf("modem_password", v)} placeholder="Password" password />
                    <Field label="SIM Number" value={form.modem_sim_no || ""} onChange={v => sf("modem_sim_no", v)} placeholder="SIM card number" />
                    <Field label="Carrier / Operator" value={form.carrier || ""} onChange={v => sf("carrier", v)} options={CARRIERS} />
                  </div>
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                      <Archive size={13} /> Modem Backup Config
                    </p>
                    <p className="text-xs text-amber-700">
                      To upload the modem backup configuration file, go to the <strong>Files</strong> tab and select <strong>Modem Backup Config</strong> as the category.
                      {isNew && " (Save the config first to enable file uploads.)"}
                    </p>
                    {!isNew && configId && (
                      <button onClick={() => setActiveTab("files")}
                        className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors">
                        <Upload size={12} /> Go to Files → Upload Backup
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* WIFI ────────────────────────────────────────────────────── */}
              {activeTab === "wifi" && (
                <div>
                  <SectionHead icon={Wifi} title="WiFi / Router Details" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Router Make" value={form.wifi_router_make || ""} onChange={v => sf("wifi_router_make", v)} placeholder="e.g. TP-Link, D-Link" />
                    <Field label="Router / Gateway IP" value={form.wifi_ip || ""} onChange={v => sf("wifi_ip", v)} placeholder="e.g. 192.168.1.1" />
                    <Field label="WiFi SSID" value={form.wifi_ssid || ""} onChange={v => sf("wifi_ssid", v)} placeholder="Network name" />
                    <Field label="WiFi Password" value={form.wifi_password || ""} onChange={v => sf("wifi_password", v)} placeholder="Password" password />
                    <Field label="Security Type" value={form.wifi_security || ""} onChange={v => sf("wifi_security", v)} options={WIFI_SECURITY} />
                  </div>
                </div>
              )}

              {/* CONFIG ──────────────────────────────────────────────────── */}
              {activeTab === "config" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={Monitor} title="SCADA Software" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="SCADA Software" value={form.scada_software || ""} onChange={v => sf("scada_software", v)} placeholder="e.g. WinCC, Ignition, Citect" />
                      <Field label="SCADA Version" value={form.scada_version || ""} onChange={v => sf("scada_version", v)} placeholder="e.g. V7.5 SP2" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Monitor} title="HMI Details" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="HMI Make" value={form.hmi_make || ""} onChange={v => sf("hmi_make", v)} placeholder="e.g. Siemens, Delta" />
                      <Field label="HMI Model" value={form.hmi_model || ""} onChange={v => sf("hmi_model", v)} placeholder="e.g. KTP700 Basic" />
                      <Field label="HMI IP Address" value={form.hmi_ip || ""} onChange={v => sf("hmi_ip", v)} placeholder="e.g. 192.168.0.2" />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={Calendar} title="Backup & Maintenance" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Last Backup Date" value={form.last_backup_date || ""} onChange={v => sf("last_backup_date", v)} type="date" />
                      <Field label="Backup Schedule" value={form.backup_schedule || ""} onChange={v => sf("backup_schedule", v)} options={BACKUP_SCHEDULE} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2 flex items-center gap-2">
                      <FileText size={13} /> Configuration Notes
                    </label>
                    <Field label="" value={form.config_notes || ""} onChange={v => sf("config_notes", v)}
                      placeholder="Any additional notes: IP scheme, software keys, special config, known issues, etc."
                      textarea />
                  </div>
                </div>
              )}

              {/* FILES ───────────────────────────────────────────────────── */}
              {activeTab === "files" && (
                <FilesTab configId={configId} userName={userName} />
              )}

              {/* Prev / Next / Save footer */}
              {activeTab !== "files" && (
                <div className="flex justify-between mt-10 pt-5 border-t border-gray-200">
                  <button
                    onClick={() => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); }}
                    disabled={tabIdx === 0}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                    ← Previous
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save size={14} /> {saving ? "Saving…" : "Save Config"}
                  </button>
                  <button
                    onClick={() => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); }}
                    disabled={tabIdx === TABS.length - 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
