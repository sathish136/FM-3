import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  Wifi, WifiOff, Signal, Plus, Trash2, RefreshCw, Copy, Check,
  ChevronDown, ChevronUp, Eye, EyeOff, Router, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ModemDevice {
  id: number;
  name: string;
  device_config_id: number | null;
  make: string;
  model: string;
  imei: string | null;
  sim_no: string | null;
  carrier: string | null;
  description: string | null;
  token: string;
  is_online: boolean;
  last_seen: string | null;
  signal_rssi: number | null;
  signal_rsrp: number | null;
  operator: string | null;
  wan_ip: string | null;
  uptime: number | null;
  sim_state: string | null;
  fw_version: string | null;
  data_rx: number | null;
  data_tx: number | null;
  created_at: string;
}

interface DeviceConfig {
  id: number;
  site_name: string;
  client_name: string | null;
}

function formatUptime(seconds: number | null): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function formatLastSeen(ts: string | null): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function SignalBars({ rssi }: { rssi: number | null }) {
  if (rssi === null) return <div className="text-slate-500 text-xs">—</div>;
  let bars = 0;
  if (rssi >= -65) bars = 4;
  else if (rssi >= -75) bars = 3;
  else if (rssi >= -85) bars = 2;
  else bars = 1;
  const color =
    bars === 4 ? "bg-emerald-400" :
    bars === 3 ? "bg-yellow-400" :
    bars === 2 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-sm ${b <= bars ? color : "bg-slate-600"}`}
          style={{ height: `${b * 4}px` }}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{rssi} dBm</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 hover:text-sky-400 transition-colors text-slate-400">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function SetupGuide({ modem, heartbeatUrl }: { modem: ModemDevice; heartbeatUrl: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"gsm" | "custom">("gsm");

  const tokenUrl = `${heartbeatUrl}?token=${modem.token}`;

  const customJson = `{
  "token": "${modem.token}",
  "rssi": "%s",
  "operator": "%o",
  "wan_ip": "%i",
  "uptime": "%u",
  "sim_state": "%S",
  "fw_version": "%f"
}`;

  return (
    <div className="mt-3 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
      >
        <span className="flex items-center gap-1.5"><Info size={12} /> Teltonika RUT200 Setup Guide</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 py-3 bg-slate-900 text-xs text-slate-400 space-y-3">
          <p className="text-slate-300 font-medium">Services → Data to Server → Add</p>

          {/* Method tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setTab("gsm")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${tab === "gsm" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:text-slate-200"}`}
            >
              GSM / JSON (Recommended)
            </button>
            <button
              onClick={() => setTab("custom")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${tab === "custom" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:text-slate-200"}`}
            >
              Custom Format
            </button>
          </div>

          {tab === "gsm" && (
            <div className="space-y-2">
              {/* Step 1 — Data configuration */}
              <p className="text-slate-300 font-medium text-[11px] uppercase tracking-wide">Step 1 — Data Configuration</p>
              <div className="bg-slate-800 rounded p-2 space-y-1">
                <Row label="Name" value="gsm_data" />
                <Row label="Type" value="GSM" highlight />
                <Row label="Format type" value="JSON" highlight />
                <Row label="Values" value="All values included" />
              </div>
              <p className="text-slate-400 text-[11px]">
                Add a second entry for data usage: Type = <span className="text-emerald-400">Mobile usage</span>, Format = JSON, same server.
              </p>

              {/* Step 2 — Collection / Server */}
              <p className="text-slate-300 font-medium text-[11px] uppercase tracking-wide mt-2">Step 2 — Collection (HTTP Server)</p>
              <div className="bg-slate-800 rounded p-2 space-y-1">
                <Row label="Server type" value="HTTP" />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">URL</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <code className="text-emerald-400 text-[10px] font-mono break-all leading-tight">{tokenUrl}</code>
                    <CopyButton text={tokenUrl} />
                  </div>
                </div>
                <Row label="HTTP method" value="POST" />
                <Row label="Interval" value="30 s" />
              </div>
              <p className="text-slate-400 text-[11px]">
                Token is in the URL — no custom body needed. FlowMatrix reads GSM fields automatically.
              </p>
            </div>
          )}

          {tab === "custom" && (
            <div className="space-y-2">
              <p className="text-slate-300 font-medium text-[11px] uppercase tracking-wide">Step 1 — Data Configuration</p>
              <div className="bg-slate-800 rounded p-2 space-y-1">
                <Row label="Name" value="flowmatrix_data" />
                <Row label="Type" value="Base" highlight />
                <Row label="Format type" value="Custom" highlight />
              </div>

              <p className="text-slate-300 font-medium text-[11px] uppercase tracking-wide mt-2">Step 2 — Custom body</p>
              <div className="bg-slate-800 rounded p-2 font-mono text-emerald-300 text-[10px] relative">
                <div className="absolute top-1 right-1"><CopyButton text={customJson} /></div>
                <pre className="whitespace-pre-wrap">{customJson}</pre>
              </div>
              <p className="text-slate-400 text-[11px]">
                %s = RSSI · %o = Operator · %i = WAN IP · %u = Uptime · %S = SIM state · %f = Firmware
              </p>

              <p className="text-slate-300 font-medium text-[11px] uppercase tracking-wide mt-2">Step 3 — Collection</p>
              <div className="bg-slate-800 rounded p-2 space-y-1">
                <Row label="Server type" value="HTTP" />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">URL</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <code className="text-emerald-400 text-[10px] font-mono break-all">{heartbeatUrl}</code>
                    <CopyButton text={heartbeatUrl} />
                  </div>
                </div>
                <Row label="HTTP method" value="POST" />
                <Row label="Content-Type" value="application/json" />
              </div>
            </div>
          )}

          <p className="text-emerald-400 text-[11px] pt-1">
            Enable the entry — modem shows Online within 30 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? "text-sky-300 font-medium" : "text-emerald-400"}>{value}</span>
    </div>
  );
}

function ModemCard({
  modem,
  configs,
  heartbeatUrl,
  onDelete,
  onRegenToken,
}: {
  modem: ModemDevice;
  configs: DeviceConfig[];
  heartbeatUrl: string;
  onDelete: (id: number) => void;
  onRegenToken: (id: number) => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const site = configs.find((c) => c.id === modem.device_config_id);

  return (
    <div
      className={`rounded-xl border p-4 ${
        modem.is_online
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-slate-700 bg-slate-800/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-lg ${modem.is_online ? "bg-emerald-500/15" : "bg-slate-700/50"}`}>
            <Router size={16} className={modem.is_online ? "text-emerald-400" : "text-slate-500"} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-100 text-sm truncate">{modem.name}</h3>
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  modem.is_online
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {modem.is_online ? (
                  <><Wifi size={8} /> Online</>
                ) : (
                  <><WifiOff size={8} /> Offline</>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {modem.make} {modem.model}
              {site ? ` · ${site.site_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onRegenToken(modem.id)}
            title="Regenerate token"
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => onDelete(modem.id)}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-slate-500">Signal</span>
          <div className="mt-0.5"><SignalBars rssi={modem.signal_rssi} /></div>
        </div>
        <div>
          <span className="text-slate-500">Operator</span>
          <p className="text-slate-200 mt-0.5">{modem.operator || "—"}</p>
        </div>
        <div>
          <span className="text-slate-500">WAN IP</span>
          <p className="text-slate-200 font-mono mt-0.5 text-[11px]">{modem.wan_ip || "—"}</p>
        </div>
        <div>
          <span className="text-slate-500">Uptime</span>
          <p className="text-slate-200 mt-0.5">{formatUptime(modem.uptime)}</p>
        </div>
        <div>
          <span className="text-slate-500">Last Seen</span>
          <p className="text-slate-200 mt-0.5">{formatLastSeen(modem.last_seen)}</p>
        </div>
        <div>
          <span className="text-slate-500">SIM State</span>
          <p
            className={`mt-0.5 capitalize ${
              modem.sim_state === "active" ? "text-emerald-400" : "text-slate-200"
            }`}
          >
            {modem.sim_state || "—"}
          </p>
        </div>
        {(modem.data_rx || modem.data_tx) ? (
          <div className="col-span-2">
            <span className="text-slate-500">Data Usage</span>
            <p className="text-slate-200 mt-0.5">
              ↓ {formatBytes(modem.data_rx)} · ↑ {formatBytes(modem.data_tx)}
            </p>
          </div>
        ) : null}
        {modem.fw_version && (
          <div className="col-span-2">
            <span className="text-slate-500">Firmware</span>
            <p className="text-slate-200 font-mono text-[11px] mt-0.5">{modem.fw_version}</p>
          </div>
        )}
        {modem.imei && (
          <div className="col-span-2">
            <span className="text-slate-500">IMEI</span>
            <p className="text-slate-200 font-mono text-[11px] mt-0.5">{modem.imei}</p>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
          <span>Auth Token</span>
          <button onClick={() => setShowToken((v) => !v)} className="hover:text-slate-300">
            {showToken ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 rounded px-2 py-1">
          <code className="text-[11px] text-sky-300 flex-1 truncate">
            {showToken ? modem.token : modem.token.slice(0, 8) + "••••••••••••••••••••"}
          </code>
          <CopyButton text={modem.token} />
        </div>
      </div>

      <SetupGuide modem={modem} heartbeatUrl={heartbeatUrl} />
    </div>
  );
}

function RegisterModal({
  onClose,
  onSave,
  configs,
}: {
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  configs: DeviceConfig[];
}) {
  const [form, setForm] = useState({
    name: "",
    device_config_id: "",
    make: "Teltonika",
    model: "RUT200",
    imei: "",
    sim_no: "",
    carrier: "",
    description: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <Router size={16} className="text-sky-400" />
          <h2 className="font-semibold text-slate-100 text-sm">Register Modem</h2>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Modem Name *</label>
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="e.g. Site A — RUT200"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Make</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Model</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Site (Device Config)</label>
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              value={form.device_config_id}
              onChange={(e) => set("device_config_id", e.target.value)}
            >
              <option value="">— No site linked —</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.site_name}{c.client_name ? ` (${c.client_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">IMEI</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="15-digit IMEI"
                value={form.imei}
                onChange={(e) => set("imei", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">SIM No.</label>
              <input
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="SIM number"
                value={form.sim_no}
                onChange={(e) => set("sim_no", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Carrier / ISP</label>
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="e.g. Airtel, Jio, BSNL"
              value={form.carrier}
              onChange={(e) => set("carrier", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
              rows={2}
              placeholder="Optional notes"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: form.name,
                device_config_id: form.device_config_id ? parseInt(form.device_config_id) : undefined,
                make: form.make || "Teltonika",
                model: form.model || "RUT200",
                imei: form.imei || undefined,
                sim_no: form.sim_no || undefined,
                carrier: form.carrier || undefined,
                description: form.description || undefined,
              })
            }
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Register Modem
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModemDashboard() {
  const [modems, setModems] = useState<ModemDevice[]>([]);
  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  const heartbeatUrl = `${window.location.origin}${BASE}/api/modems/heartbeat`;

  const fetchModems = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/modems/devices`);
      if (r.ok) setModems(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    const r = await fetch(`${BASE}/api/plc/device-configs`);
    if (r.ok) {
      const body = await r.json();
      setConfigs(Array.isArray(body) ? body : (body.data ?? []));
    }
  }, []);

  useEffect(() => {
    fetchModems();
    fetchConfigs();
    const id = setInterval(fetchModems, 30_000);
    return () => clearInterval(id);
  }, [fetchModems, fetchConfigs]);

  const handleRegister = async (data: Record<string, unknown>) => {
    const r = await fetch(`${BASE}/api/modems/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      setShowRegister(false);
      fetchModems();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this modem?")) return;
    await fetch(`${BASE}/api/modems/devices/${id}`, { method: "DELETE" });
    fetchModems();
  };

  const handleRegenToken = async (id: number) => {
    if (!confirm("Regenerate token? Update the modem config with the new token afterwards.")) return;
    await fetch(`${BASE}/api/modems/devices/${id}/regenerate-token`, { method: "POST" });
    fetchModems();
  };

  const filtered = modems.filter((m) => {
    if (filter === "online") return m.is_online;
    if (filter === "offline") return !m.is_online;
    return true;
  });

  const onlineCount = modems.filter((m) => m.is_online).length;
  const offlineCount = modems.length - onlineCount;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Router size={20} className="text-sky-400" />
                <h1 className="text-xl font-bold text-slate-100">Modem Management</h1>
              </div>
              <p className="text-sm text-slate-400">
                Self-hosted RMS for Teltonika modems · {modems.length} device{modems.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowRegister(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={15} />
              Register Modem
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
              <div className="p-2 bg-slate-700/60 rounded-lg">
                <Signal size={18} className="text-slate-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{modems.length}</p>
                <p className="text-xs text-slate-400">Total Modems</p>
              </div>
            </div>
            <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/30 p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/15 rounded-lg">
                <Wifi size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{onlineCount}</p>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
              <div className="p-2 bg-slate-700/60 rounded-lg">
                <WifiOff size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-400">{offlineCount}</p>
                <p className="text-xs text-slate-400">Offline</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {(["all", "online", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                  filter === f
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {f === "all"
                  ? `All (${modems.length})`
                  : f === "online"
                  ? `Online (${onlineCount})`
                  : `Offline (${offlineCount})`}
              </button>
            ))}
            <button
              onClick={fetchModems}
              className="ml-auto p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading modems…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Router size={40} className="mb-3 opacity-30" />
              <p className="font-medium text-slate-400">
                {modems.length === 0 ? "No modems registered yet" : "No modems match filter"}
              </p>
              {modems.length === 0 && (
                <p className="text-sm mt-1 text-center max-w-xs">
                  Register a Teltonika modem and follow the setup guide to connect it to FlowMatrix.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((m) => (
                <ModemCard
                  key={m.id}
                  modem={m}
                  configs={configs}
                  heartbeatUrl={heartbeatUrl}
                  onDelete={handleDelete}
                  onRegenToken={handleRegenToken}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSave={handleRegister}
          configs={configs}
        />
      )}
    </Layout>
  );
}
