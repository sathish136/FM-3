import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Plus, Trash2, Download, RefreshCw, Copy, Check,
  Server, Wifi, WifiOff, ChevronDown, ChevronUp, Terminal,
  AlertCircle, CheckCircle2, Settings,
} from "lucide-react";

interface VpnServer {
  id: number;
  public_key: string;
  listen_port: number;
  server_ip: string;
  network_cidr: string;
  endpoint: string | null;
  dns: string;
  interface: string;
  updated_at: string;
}

interface VpnPeer {
  id: number;
  name: string;
  device_type: string;
  public_key: string;
  peer_ip: string;
  lan_ranges: string;
  persistent_keepalive: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface LivePeer {
  publicKey: string;
  endpoint: string | null;
  lastHandshake: number;
  rxBytes: number;
  txBytes: number;
}

interface VpnStatus {
  available: boolean;
  peers: Record<string, LivePeer>;
}

function formatBytes(b: number): string {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatHandshake(ts: number): string {
  if (!ts) return "Never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 180) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 hover:text-blue-600 text-slate-400 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Server Setup Card ────────────────────────────────────────────────────────
function ServerSetupCard({
  server,
  onSaved,
}: {
  server: VpnServer | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(!server);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    endpoint: server?.endpoint ?? "",
    listen_port: server?.listen_port ?? 51820,
    dns: server?.dns ?? "1.1.1.1",
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/vpn/server/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: server ? "Server updated" : "VPN server initialized!" });
      onSaved();
      setOpen(false);
    } catch {
      toast({ title: "Error", description: "Could not save server config", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Server size={18} className="text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">WireGuard Server</p>
            <p className="text-xs text-slate-500">
              {server
                ? `${server.interface} · port ${server.listen_port} · ${server.server_ip}`
                : "Not configured — click to set up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {server && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Configured
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {server && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-500 w-24 shrink-0">Public Key</span>
              <code className="text-xs text-blue-700 font-mono flex-1 truncate">{server.public_key}</code>
              <CopyButton text={server.public_key} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Server Public Endpoint (hostname or IP)
              </label>
              <input
                type="text"
                placeholder="e.g. vpn.yourcompany.com or 203.0.113.1"
                value={form.endpoint}
                onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Listen Port</label>
              <input
                type="number"
                value={form.listen_port}
                onChange={(e) => setForm((f) => ({ ...f, listen_port: parseInt(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="sm:w-1/3">
            <label className="block text-xs font-medium text-slate-600 mb-1">DNS Server</label>
            <input
              type="text"
              value={form.dns}
              onChange={(e) => setForm((f) => ({ ...f, dns: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : server ? "Update Config" : "Initialize Server"}
            </button>
            {server && (
              <a
                href="/pm-app/api/vpn/server/full-config"
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 transition-colors"
                download
              >
                <Download size={13} /> Download wg0.conf
              </a>
            )}
          </div>

          {!server && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1"><AlertCircle size={12} /> Server setup instructions</p>
              <p>1. Enter your server's public IP/hostname above and click <strong>Initialize</strong>.</p>
              <p>2. Download <code>wg0.conf</code> and place it at <code>/etc/wireguard/wg0.conf</code> on your Linux server.</p>
              <p>3. Run: <code>sudo wg-quick up wg0</code> (install wireguard-tools first if needed).</p>
              <p>4. Optionally: <code>sudo systemctl enable wg-quick@wg0</code> to start on boot.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Peer Modal ───────────────────────────────────────────────────────────
function AddPeerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    device_type: "linux",
    lan_ranges: "",
    persistent_keepalive: 25,
    notes: "",
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/vpn/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Peer added", description: `${form.name} is ready to connect` });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Add VPN Peer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Peer Name *</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Site A Modem, Office Laptop"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Device Type</label>
            <select
              value={form.device_type}
              onChange={(e) => setForm((f) => ({ ...f, device_type: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="linux">Linux (Raspberry Pi, Ubuntu, etc.)</option>
              <option value="teltonika">Teltonika Router</option>
              <option value="windows">Windows PC</option>
              <option value="android">Android Phone</option>
              <option value="macos">macOS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              LAN Ranges (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.0/24, 10.0.1.0/24"
              value={form.lan_ranges}
              onChange={(e) => setForm((f) => ({ ...f, lan_ranges: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Subnets behind this peer that should be routed through the VPN (e.g. the modem's LAN)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input
              type="text"
              placeholder="Optional description"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Generating keys…" : "Add Peer"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Peer Card ────────────────────────────────────────────────────────────────
function deviceLabel(type: string): string {
  const map: Record<string, string> = {
    linux: "Linux",
    teltonika: "Teltonika",
    windows: "Windows",
    android: "Android",
    macos: "macOS",
  };
  return map[type] ?? type;
}

function PeerCard({
  peer,
  live,
  onDelete,
}: {
  peer: VpnPeer;
  live: LivePeer | undefined;
  onDelete: (id: number) => void;
}) {
  const isOnline = live && live.lastHandshake > 0 && (Date.now() / 1000 - live.lastHandshake) < 180;

  const downloadUrl = (type: "wg-config" | "python-client") =>
    `/pm-app/api/vpn/peers/${peer.id}/${type}`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isOnline ? "border-emerald-200" : "border-slate-200"}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-start justify-between gap-2 ${isOnline ? "bg-emerald-50/60" : "bg-slate-50/60"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOnline ? "bg-emerald-100" : "bg-slate-100"}`}>
            {isOnline
              ? <Wifi size={16} className="text-emerald-600" />
              : <WifiOff size={16} className="text-slate-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{peer.name}</p>
            <p className="text-xs text-slate-500">{deviceLabel(peer.device_type)} · {peer.peer_ip}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            onClick={() => onDelete(peer.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Remove peer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Live stats */}
      {live && (
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Last Seen</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{formatHandshake(live.lastHandshake)}</p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">↓ Received</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{formatBytes(live.rxBytes)}</p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">↑ Sent</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{formatBytes(live.txBytes)}</p>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-20 shrink-0">Public Key</span>
          <code className="text-[11px] text-blue-700 font-mono flex-1 truncate">{peer.public_key}</code>
          <CopyButton text={peer.public_key} />
        </div>
        {peer.lan_ranges && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">LAN Routes</span>
            <code className="text-[11px] text-slate-600 font-mono">{peer.lan_ranges}</code>
          </div>
        )}
        {live?.endpoint && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-20 shrink-0">Endpoint</span>
            <code className="text-[11px] text-slate-600 font-mono">{live.endpoint}</code>
          </div>
        )}
        {peer.notes && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">Notes</span>
            <span className="text-xs text-slate-600">{peer.notes}</span>
          </div>
        )}
      </div>

      {/* Downloads */}
      <div className="px-4 pb-3 flex gap-2">
        <a
          href={downloadUrl("wg-config")}
          download
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-slate-200 rounded-lg py-2 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <Download size={12} /> WireGuard Config
        </a>
        {(peer.device_type === "linux" || peer.device_type === "teltonika") && (
          <a
            href={downloadUrl("python-client")}
            download
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-blue-200 rounded-lg py-2 hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <Terminal size={12} /> Python Script
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VpnManager() {
  const { toast } = useToast();
  const [server, setServer] = useState<VpnServer | null>(null);
  const [peers, setPeers] = useState<VpnPeer[]>([]);
  const [status, setStatus] = useState<VpnStatus>({ available: false, peers: {} });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [srvRes, peersRes, statusRes] = await Promise.all([
        apiFetch("/vpn/server"),
        apiFetch("/vpn/peers"),
        apiFetch("/vpn/status"),
      ]);
      if (srvRes.ok) setServer(await srvRes.json());
      if (peersRes.ok) setPeers(await peersRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 15_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    const peer = peers.find((p) => p.id === id);
    if (!confirm(`Remove peer "${peer?.name}"?`)) return;
    const res = await apiFetch(`/vpn/peers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPeers((p) => p.filter((x) => x.id !== id));
      toast({ title: "Peer removed" });
    }
  };

  const onlinePeers = peers.filter((p) => {
    const live = status.peers[p.public_key];
    return live && live.lastHandshake > 0 && (Date.now() / 1000 - live.lastHandshake) < 180;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-[#f4f6fb]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Shield size={20} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">VPN Manager</h1>
                <p className="text-xs text-slate-500">WireGuard server · manage remote device tunnels</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status badge */}
              {status.available ? (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  WireGuard active · {onlinePeers.length}/{peers.length} online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  WireGuard not running on server
                </span>
              )}

              <button
                onClick={refresh}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>

              {server && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} /> Add Peer
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading…</div>
          ) : (
            <>
              {/* Server card */}
              <ServerSetupCard server={server} onSaved={fetchAll} />

              {/* No peers yet */}
              {server && peers.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Settings size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No peers yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Add a peer for each device or modem that needs VPN access
                  </p>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} /> Add First Peer
                  </button>
                </div>
              )}

              {/* Peers grid */}
              {peers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-700">
                      VPN Peers
                      <span className="ml-2 text-xs font-normal text-slate-400">{peers.length} total</span>
                    </h2>
                    {!status.available && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Live status unavailable — wg not running on server
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {peers.map((p) => (
                      <PeerCard
                        key={p.id}
                        peer={p}
                        live={status.peers[p.public_key]}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Setup guide */}
              {server && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Terminal size={15} className="text-slate-400" /> Quick Setup Guide
                  </h3>
                  <ol className="space-y-2 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <span>On your <strong>Linux server</strong>: install WireGuard (<code>apt install wireguard-tools</code>), download <strong>wg0.conf</strong> from above and place at <code>/etc/wireguard/wg0.conf</code>, then run <code>sudo wg-quick up wg0</code>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <span>Click <strong>Add Peer</strong> for each remote device (modem, Raspberry Pi, etc.). Enter the device's local LAN range so traffic to those IPs routes through the VPN.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                      <span><strong>On each remote device</strong>: download the <strong>Python Script</strong> and run <code>sudo python3 flowmatrix_vpn.py up</code>. It installs WireGuard, writes the config, and brings the tunnel up automatically.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                      <span><strong>Teltonika modems</strong>: download the <strong>WireGuard Config</strong> and import it in the modem's web UI under <em>Services → VPN → WireGuard</em>.</span>
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <AddPeerModal
          onClose={() => setShowAdd(false)}
          onSaved={fetchAll}
        />
      )}
    </Layout>
  );
}
