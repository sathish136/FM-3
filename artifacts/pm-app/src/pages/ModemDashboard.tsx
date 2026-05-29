import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  Wifi, WifiOff, Signal, Plus, Trash2, RefreshCw, Copy, Check,
  ChevronDown, ChevronUp, Eye, EyeOff, Router, Info, MapPin,
} from "lucide-react";

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
  // Signal
  signal_rssi: number | null;
  signal_rsrp: number | null;
  signal_rsrq: number | null;
  signal_sinr: number | null;
  // Connection
  operator: string | null;
  operator_state: string | null;
  conn_state: string | null;
  conn_stage: string | null;
  network_type: string | null;
  wan_ip: string | null;
  uptime: number | null;
  sim_state: string | null;
  fw_version: string | null;
  // Data transmission
  data_rx: number | null;
  data_tx: number | null;
  band: string | null;
  carrier_agg: string | null;
  bandwidth: string | null;
  apn: string | null;
  mtu: number | null;
  // Cell info
  cell_id: string | null;
  tac: string | null;
  pcid: string | null;
  earfcn: string | null;
  mcc: string | null;
  mnc: string | null;
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

function RssiBadge({ rssi }: { rssi: number | null }) {
  if (rssi === null)
    return <span className="text-slate-400 text-xs font-medium">—</span>;
  let quality: string;
  let pillClass: string;
  if (rssi >= -65) {
    quality = "Excellent";
    pillClass = "bg-emerald-500 text-white";
  } else if (rssi >= -75) {
    quality = "Good";
    pillClass = "bg-emerald-400 text-white";
  } else if (rssi >= -85) {
    quality = "Fair";
    pillClass = "bg-yellow-400 text-white";
  } else {
    quality = "Poor";
    pillClass = "bg-red-500 text-white";
  }
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pillClass}`}>
        {rssi}
      </span>
      <span className="text-xs text-slate-500">{quality}</span>
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
    <button
      onClick={copy}
      className="p-1 hover:text-blue-600 transition-colors text-slate-400"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? "text-blue-600 font-medium" : "text-emerald-600"}>{value}</span>
    </div>
  );
}

function SetupGuide({ modem, heartbeatUrl }: { modem: ModemDevice; heartbeatUrl: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"gsm" | "custom">("gsm");

  const tokenUrl = `${heartbeatUrl}/${modem.token}`;

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
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Info size={12} className="text-blue-500" /> Teltonika RUT200 Setup Guide
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 py-3 bg-white text-xs text-slate-500 space-y-3 border-t border-slate-200">
          <p className="text-slate-700 font-medium">Services → Data to Server → Add</p>

          <div className="flex gap-1">
            <button
              onClick={() => setTab("gsm")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${tab === "gsm" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"}`}
            >
              GSM / JSON (Recommended)
            </button>
            <button
              onClick={() => setTab("custom")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${tab === "custom" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"}`}
            >
              Custom Format
            </button>
          </div>

          {tab === "gsm" && (
            <div className="space-y-2">
              <p className="text-slate-700 font-medium text-[11px] uppercase tracking-wide">Step 1 — Data Configuration</p>
              <div className="bg-slate-50 rounded p-2 space-y-1">
                <Row label="Name" value="gsm_data" />
                <Row label="Type" value="GSM" highlight />
                <Row label="Format type" value="JSON" highlight />
                <Row label="Values" value="All values included" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Add a second entry for data usage: Type = <span className="text-emerald-600 font-medium">Mobile usage</span>, Format = JSON, same server.
              </p>

              <p className="text-slate-700 font-medium text-[11px] uppercase tracking-wide mt-2">Step 2 — Collection (HTTP Server)</p>
              <div className="bg-slate-50 rounded p-2 space-y-1">
                <Row label="Server type" value="HTTP" />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">URL</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <code className="text-emerald-600 text-[10px] font-mono break-all leading-tight">{tokenUrl}</code>
                    <CopyButton text={tokenUrl} />
                  </div>
                </div>
                <Row label="HTTP method" value="POST" />
                <Row label="Interval" value="30 s" />
              </div>
              <p className="text-slate-500 text-[11px]">
                Token is in the URL — no custom body needed. FlowMatrix reads GSM fields automatically.
              </p>
            </div>
          )}

          {tab === "custom" && (
            <div className="space-y-2">
              <p className="text-slate-700 font-medium text-[11px] uppercase tracking-wide">Step 1 — Data Configuration</p>
              <div className="bg-slate-50 rounded p-2 space-y-1">
                <Row label="Name" value="flowmatrix_data" />
                <Row label="Type" value="Base" highlight />
                <Row label="Format type" value="Custom" highlight />
              </div>

              <p className="text-slate-700 font-medium text-[11px] uppercase tracking-wide mt-2">Step 2 — Custom body</p>
              <div className="bg-slate-50 rounded p-2 font-mono text-emerald-600 text-[10px] relative border border-slate-200">
                <div className="absolute top-1 right-1"><CopyButton text={customJson} /></div>
                <pre className="whitespace-pre-wrap">{customJson}</pre>
              </div>
              <p className="text-slate-500 text-[11px]">
                %s = RSSI · %o = Operator · %i = WAN IP · %u = Uptime · %S = SIM state · %f = Firmware
              </p>

              <p className="text-slate-700 font-medium text-[11px] uppercase tracking-wide mt-2">Step 3 — Collection</p>
              <div className="bg-slate-50 rounded p-2 space-y-1">
                <Row label="Server type" value="HTTP" />
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">URL</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <code className="text-emerald-600 text-[10px] font-mono break-all">{heartbeatUrl}</code>
                    <CopyButton text={heartbeatUrl} />
                  </div>
                </div>
                <Row label="HTTP method" value="POST" />
                <Row label="Content-Type" value="application/json" />
              </div>
            </div>
          )}

          <p className="text-emerald-600 font-medium text-[11px] pt-1">
            Enable the entry — modem shows Online within 30 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0 w-24">{label}</span>
      <span className={`text-xs text-slate-800 font-medium text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ModemCard({
  modem,
  configs,
  heartbeatUrl,
  onDelete,
}: {
  modem: ModemDevice;
  configs: DeviceConfig[];
  heartbeatUrl: string;
  onDelete: (id: number) => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const site = configs.find((c) => c.id === modem.device_config_id);

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden shadow-sm ${
        modem.is_online ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-start justify-between gap-2 px-4 py-3 border-b ${
          modem.is_online
            ? "bg-emerald-50 border-emerald-100"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              modem.is_online ? "bg-emerald-100" : "bg-slate-100"
            }`}
          >
            <Router
              size={15}
              className={modem.is_online ? "text-emerald-600" : "text-slate-400"}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm truncate">{modem.name}</h3>
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  modem.is_online
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {modem.is_online ? (
                  <><Wifi size={8} /> Online</>
                ) : (
                  <><WifiOff size={8} /> Offline</>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {modem.make} {modem.model}
            </p>
            {site && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={10} className="text-blue-400 shrink-0" />
                <span className="text-[11px] text-blue-600 font-medium truncate">{site.site_name}</span>
                {site.client_name && (
                  <span className="text-[11px] text-slate-400 truncate">· {site.client_name}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onDelete(modem.id)}
            title="Delete modem"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* All Details */}
      <div className="px-4 py-3 space-y-4">

        {/* Connection */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Connection</p>
          <DetailRow label="Operator" value={modem.operator || "—"} />
          <DetailRow label="Operator State" value={modem.operator_state || "—"} />
          <DetailRow
            label="Data Conn. State"
            value={
              modem.conn_state ? (
                <span className={
                  modem.conn_state.toLowerCase().includes("connect")
                    ? "text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"
                    : "text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                }>
                  {modem.conn_state}
                </span>
              ) : "—"
            }
          />
          <DetailRow label="Connection Stage" value={modem.conn_stage || "—"} />
          <DetailRow label="Network Type" value={modem.network_type || "—"} />
          <DetailRow label="IP Address" value={modem.wan_ip || "—"} mono />
          <DetailRow label="Uptime" value={formatUptime(modem.uptime)} />
        </div>

        {/* Data Transmission */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Data Transmission</p>
          <DetailRow label="Carrier Aggregation" value={modem.carrier_agg || "—"} />
          <DetailRow label="Bandwidth" value={modem.bandwidth || "—"} />
          <DetailRow label="Connected Band" value={modem.band || "—"} />
          <DetailRow
            label="RSSI (dBm)"
            value={<RssiBadge rssi={modem.signal_rssi} />}
          />
          <DetailRow label="APN" value={modem.apn || "—"} mono />
          <DetailRow label="MTU" value={modem.mtu !== null ? String(modem.mtu) : "—"} />
          <DetailRow label="Data Received" value={formatBytes(modem.data_rx)} mono />
          <DetailRow label="Data Sent" value={formatBytes(modem.data_tx)} mono />
        </div>

        {/* Cell Info */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cell Info</p>
          <DetailRow label="Cell ID" value={modem.cell_id || "—"} mono />
          <DetailRow label="TAC" value={modem.tac || "—"} mono />
          <DetailRow label="Physical Cell ID" value={modem.pcid || "—"} mono />
          <DetailRow label="EARFCN" value={modem.earfcn || "—"} mono />
          <DetailRow label="Mobile Country Code" value={modem.mcc || "—"} mono />
          <DetailRow label="Mobile Network Code" value={modem.mnc || "—"} mono />
        </div>

        {/* Auth Token */}
        <div className="mt-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Auth Token</span>
            <button
              onClick={() => setShowToken((v) => !v)}
              className="hover:text-slate-600 transition-colors"
            >
              {showToken ? <EyeOff size={10} /> : <Eye size={10} />}
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <code className="text-[11px] text-blue-600 flex-1 truncate font-mono">
              {showToken ? modem.token : modem.token.slice(0, 8) + "••••••••••••••••••••"}
            </code>
            <CopyButton text={modem.token} />
          </div>
        </div>

        <SetupGuide modem={modem} heartbeatUrl={heartbeatUrl} />
      </div>
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

  const inputCls =
    "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 placeholder:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Router size={15} className="text-blue-600" />
          </div>
          <h2 className="font-semibold text-slate-800 text-sm">Register Modem</h2>
        </div>
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Modem Name *</label>
            <input
              className={inputCls}
              placeholder="e.g. Site A — RUT200"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Make</label>
              <input
                className={inputCls}
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Model</label>
              <input
                className={inputCls}
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Site (Device Config)</label>
            <select
              className={inputCls}
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
              <label className="text-xs text-slate-500 font-medium mb-1 block">IMEI</label>
              <input
                className={inputCls}
                placeholder="15-digit IMEI"
                value={form.imei}
                onChange={(e) => set("imei", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">SIM No.</label>
              <input
                className={inputCls}
                placeholder="SIM number"
                value={form.sim_no}
                onChange={(e) => set("sim_no", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Carrier / ISP</label>
            <input
              className={inputCls}
              placeholder="e.g. Airtel, Jio, BSNL"
              value={form.carrier}
              onChange={(e) => set("carrier", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Optional notes"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: form.name,
                device_config_id: form.device_config_id
                  ? parseInt(form.device_config_id)
                  : undefined,
                make: form.make || "Teltonika",
                model: form.model || "RUT200",
                imei: form.imei || undefined,
                sim_no: form.sim_no || undefined,
                carrier: form.carrier || undefined,
                description: form.description || undefined,
              })
            }
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium shadow-sm"
          >
            Register Modem
          </button>
        </div>
      </div>
    </div>
  );
}

const REFRESH_INTERVAL = 10; // seconds

export default function ModemDashboard() {
  const [modems, setModems] = useState<ModemDevice[]>([]);
  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const heartbeatUrl = `${window.location.origin}${appBase}/api/modems/heartbeat`;

  const resetCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1));
    }, 1000);
  }, []);

  const fetchModems = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const r = await apiFetch("/modems/devices");
      if (r.ok) setModems(await r.json());
    } catch (e: any) {
      console.error("fetchModems:", e?.message || e);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
      resetCountdown();
    }
  }, [resetCountdown]);

  const fetchConfigs = useCallback(async () => {
    try {
      const r = await apiFetch("/plc/device-configs");
      if (r.ok) {
        const body = await r.json();
        setConfigs(Array.isArray(body) ? body : (body.data ?? []));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchModems();
    fetchConfigs();
    const id = setInterval(() => fetchModems(), REFRESH_INTERVAL * 1000);
    return () => {
      clearInterval(id);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchModems, fetchConfigs]);

  const handleRegister = async (data: Record<string, unknown>) => {
    try {
      const r = await apiFetch("/modems/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (r.ok) {
        setShowRegister(false);
        fetchModems();
        toast({ title: "Modem registered successfully" });
      } else {
        const body = await r.json().catch(() => ({}));
        toast({ title: "Registration failed", description: body.error || r.statusText, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this modem?")) return;
    try {
      await apiFetch(`/modems/devices/${id}`, { method: "DELETE" });
      fetchModems();
      toast({ title: "Modem deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
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
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow shadow-blue-200">
              <Router className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Modem Management</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Self-hosted RMS for Teltonika modems · {modems.length} device{modems.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Register Modem
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Signal size={18} className="text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{modems.length}</p>
                <p className="text-xs text-slate-400">Total Modems</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Wifi size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{onlineCount}</p>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-slate-100 rounded-lg">
                <WifiOff size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-500">{offlineCount}</p>
                <p className="text-xs text-slate-400">Offline</p>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "online", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200"
                }`}
              >
                {f === "all"
                  ? `All (${modems.length})`
                  : f === "online"
                  ? `Online (${onlineCount})`
                  : `Offline (${offlineCount})`}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-400 tabular-nums">
                Refreshes in <span className="font-semibold text-slate-600">{countdown}s</span>
              </span>
              <button
                onClick={() => fetchModems(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-lg transition-colors disabled:opacity-60"
                title="Refresh now"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading modems…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Router size={40} className="mb-3 opacity-30" />
              <p className="font-medium text-slate-500">
                {modems.length === 0 ? "No modems registered yet" : "No modems match filter"}
              </p>
              {modems.length === 0 && (
                <p className="text-sm mt-1 text-center max-w-xs text-slate-400">
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
