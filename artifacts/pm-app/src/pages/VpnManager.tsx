import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Plus, Trash2, Download, RefreshCw, Copy, Check,
  Server, Wifi, WifiOff, Terminal, AlertCircle, CheckCircle2,
  Settings, Phone, Cpu, ClipboardList, Network, GitBranch,
  Activity, Ticket, MonitorPlay, Target, ArrowDown, ArrowUp,
  BarChart3, ChevronDown, Clock, Globe, Key, RotateCcw, Radio,
  ChevronRight, Zap, Crosshair, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── PLC Sub-nav ─────────────────────────────────────────────────────────────
const PLC_NAV = [
  { path: "/plc-automation/device-config",        label: "Device Config",      icon: Cpu },
  { path: "/plc-automation/site-calls",            label: "Support Calls",      icon: Phone },
  { path: "/plc-automation/service-reports",       label: "Service Reports",    icon: ClipboardList },
  { path: "/plc-automation/panel-inspection",      label: "Panel Inspection",   icon: ClipboardList },
  { path: "/plc-automation/support-tickets",       label: "Tickets",            icon: Ticket },
  { path: "/plc-automation/network-architecture",  label: "Network Arch",       icon: Network },
  { path: "/plc-automation/modification-log",      label: "Mod Log",            icon: GitBranch },
  { path: "/plc-automation/field-devices",         label: "Field Devices",      icon: Activity },
  { path: "/plc-automation/modems",                label: "Modems",             icon: MonitorPlay },
  { path: "/plc-automation/vpn-manager",           label: "VPN Manager",        icon: Shield },
];

function PlcSubNav() {
  const [location] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [location]);
  return (
    <div className="bg-white border-b border-slate-200 px-4">
      <div ref={navRef} className="flex gap-0.5 overflow-x-auto scrollbar-none py-0.5"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {PLC_NAV.map((item) => {
          const active = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <span data-active={active} className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg whitespace-nowrap cursor-pointer transition-all border-b-2 -mb-px",
                active ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}>
                <Icon size={12} />{item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface VpnServer {
  id: number; public_key: string; listen_port: number; server_ip: string;
  network_cidr: string; endpoint: string | null; dns: string; interface: string;
  agent_api_key: string | null; updated_at: string;
}
interface VpnPeer {
  id: number; name: string; device_type: string; public_key: string;
  peer_ip: string; lan_ranges: string; persistent_keepalive: number;
  notes: string | null; is_active: boolean; created_at: string;
}
interface LivePeer {
  publicKey: string; endpoint: string | null; lastHandshake: number; rxBytes: number; txBytes: number;
  latencyMs?: number | null;
}
interface PingResult {
  ok: boolean; ip: string; minMs: number | null; avgMs: number | null; maxMs: number | null;
  loss: number; received: number; sent: number; output: string;
}
interface VpnStatus {
  available: boolean; peers: Record<string, LivePeer>;
  stale?: boolean; neverReported?: boolean; lastReportedAt?: string;
}
interface UsageSnapshot { ts: number; key: string; rx: number; tx: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtBytes(b: number): string {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(2)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}
function fmtHandshake(ts: number): string {
  if (!ts) return "Never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "Just now";
  if (diff < 180) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function isOnline(live: LivePeer | undefined): boolean {
  return !!(live && live.lastHandshake > 0 && Date.now() / 1000 - live.lastHandshake < 180);
}
function deviceLabel(type: string): string {
  const map: Record<string, string> = { linux: "Linux", teltonika: "Teltonika", windows: "Windows", android: "Android", macos: "macOS" };
  return map[type] ?? type;
}
function deviceIcon(type: string): string {
  const map: Record<string, string> = { linux: "🐧", teltonika: "📡", windows: "🪟", android: "📱", macos: "🍎" };
  return map[type] ?? "🖥️";
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyBtn({ text, size = 12 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-0.5 hover:text-blue-600 text-gray-400 transition-colors shrink-0" title="Copy">
      {copied ? <Check size={size} className="text-green-500" /> : <Copy size={size} />}
    </button>
  );
}

// ─── Add Peer Modal ───────────────────────────────────────────────────────────
function AddPeerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", device_type: "linux", lan_ranges: "", persistent_keepalive: 25, notes: "" });
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/vpn/peers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      toast({ title: "Peer added", description: `${form.name} is ready to connect` });
      onSaved(); onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-gray-300 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Plus size={14} className="text-blue-600" /> Add VPN Peer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {[
            { label: "Peer Name *", el: <input autoFocus type="text" placeholder="e.g. Site A Modem" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white" /> },
            { label: "Device Type", el: <select value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))} className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white">
              <option value="linux">🐧 Linux</option><option value="teltonika">📡 Teltonika</option>
              <option value="windows">🪟 Windows</option><option value="android">📱 Android</option><option value="macos">🍎 macOS</option>
            </select> },
            { label: "LAN Ranges (optional)", note: "Subnets behind this peer", el: <input type="text" placeholder="192.168.1.0/24, 10.0.1.0/24" value={form.lan_ranges} onChange={e => setForm(f => ({ ...f, lan_ranges: e.target.value }))} className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500" /> },
            { label: "Notes (optional)", el: <input type="text" placeholder="Optional description" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500" /> },
          ].map(({ label, el, note }) => (
            <div key={label}>
              <label className="block text-xs text-gray-600 mb-1">{label}{note && <span className="text-gray-400 ml-1">— {note}</span>}</label>
              {el}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Generating keys…" : "Add Peer"}
          </button>
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Server Config Modal ──────────────────────────────────────────────────────
function ServerConfigModal({ server, onClose, onSaved }: { server: VpnServer | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ endpoint: server?.endpoint ?? "", listen_port: server?.listen_port ?? 51820, dns: server?.dns ?? "1.1.1.1" });
  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/vpn/server/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      toast({ title: server ? "Server updated" : "VPN server initialized!" });
      onSaved(); onClose();
    } catch { toast({ title: "Error", description: "Could not save server config", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded border border-gray-300 shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Server size={14} className="text-blue-600" /> {server ? "Edit Server Config" : "Initialize WireGuard Server"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {server && (
            <div className="bg-gray-900 px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase w-20 shrink-0">Public Key</span>
              <code className="text-[11px] text-green-400 font-mono flex-1 truncate">{server.public_key}</code>
              <CopyBtn text={server.public_key} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Server Public Endpoint <span className="text-gray-400">(IP or hostname of your VPS)</span></label>
              <input type="text" placeholder="203.0.113.50 or vpn.yourcompany.com" value={form.endpoint}
                onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Port</label>
              <input type="number" value={form.listen_port} onChange={e => setForm(f => ({ ...f, listen_port: parseInt(e.target.value) }))}
                className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white" />
            </div>
          </div>
          <div className="w-1/3">
            <label className="block text-xs text-gray-600 mb-1">DNS</label>
            <input type="text" value={form.dns} onChange={e => setForm(f => ({ ...f, dns: e.target.value }))}
              className="w-full text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white" />
          </div>
          {!server && (
            <div className="bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-800 space-y-1">
              <p className="font-semibold">FlowMatrix manages your WireGuard server remotely:</p>
              <p>After initializing, download <code className="bg-blue-100 px-1">wg0.conf</code> and deploy it to your VPS, then run the Server Agent to keep status in sync automatically.</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={save} disabled={saving} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : server ? "Update Config" : "Initialize Server"}
          </button>
          {server && <a href="/pm-app/api/vpn/server/full-config" download className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"><Download size={11} /> wg0.conf</a>}
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">Cancel</button>
        </div>
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
  const [showConfig, setShowConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [expandedPeer, setExpandedPeer] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [pingIp, setPingIp] = useState("");
  const [pingCount, setPingCount] = useState(4);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const historyRef = useRef<UsageSnapshot[]>([]);
  const [snapshots, setSnapshots] = useState<UsageSnapshot[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [srvRes, peersRes, statusRes] = await Promise.all([
        apiFetch("/vpn/server"), apiFetch("/vpn/peers"), apiFetch("/vpn/status"),
      ]);
      if (srvRes.ok) setServer(await srvRes.json());
      if (peersRes.ok) setPeers(await peersRes.json());
      if (statusRes.ok) {
        const st: VpnStatus = await statusRes.json();
        setStatus(st);
        // Track usage snapshots
        const now = Date.now();
        const newSnaps: UsageSnapshot[] = [];
        Object.entries(st.peers ?? {}).forEach(([key, live]) => {
          if (live.rxBytes > 0 || live.txBytes > 0) {
            const existing = historyRef.current.find(s => s.key === key);
            if (!existing || existing.rx !== live.rxBytes || existing.tx !== live.txBytes) {
              newSnaps.push({ ts: now, key, rx: live.rxBytes, tx: live.txBytes });
            }
          }
        });
        if (newSnaps.length > 0) {
          const merged = [...historyRef.current.filter(s => !newSnaps.some(n => n.key === s.key)), ...newSnaps];
          historyRef.current = merged;
          setSnapshots([...merged]);
        }
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 15_000); return () => clearInterval(t); }, [fetchAll]);

  const refresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  const handleDelete = async (id: number) => {
    const peer = peers.find(p => p.id === id);
    if (!confirm(`Remove peer "${peer?.name}"?`)) return;
    const res = await apiFetch(`/vpn/peers/${id}`, { method: "DELETE" });
    if (res.ok) { setPeers(p => p.filter(x => x.id !== id)); toast({ title: "Peer removed" }); }
  };

  const regenKey = async () => {
    if (!confirm("Regenerate the agent API key? The server agent will need updating.")) return;
    setRegenLoading(true);
    try {
      const res = await apiFetch("/vpn/server/regenerate-api-key", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "API key regenerated" });
      fetchAll();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setRegenLoading(false); }
  };

  const runPing = async () => {
    if (!pingIp.trim()) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await apiFetch("/vpn/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: pingIp.trim(), count: pingCount }),
      });
      const data = await res.json();
      setPingResult(data);
    } catch { toast({ title: "Ping failed", variant: "destructive" }); }
    finally { setPinging(false); }
  };

  const onlinePeers = peers.filter(p => isOnline(status.peers[p.public_key]));
  const offlinePeers = peers.filter(p => !isOnline(status.peers[p.public_key]));
  const totalRx = Object.values(status.peers).reduce((s, l) => s + l.rxBytes, 0);
  const totalTx = Object.values(status.peers).reduce((s, l) => s + l.txBytes, 0);

  const agentOk = status.available && !status.stale && !status.neverReported;
  const agentStale = status.stale;
  const agentNever = status.neverReported;

  const maskedKey = server?.agent_api_key
    ? (keyVisible ? server.agent_api_key : server.agent_api_key.slice(0, 12) + "••••••••••••••••••••••••••••")
    : null;

  if (loading) return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f0f2f5]">
        <PlcSubNav />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading VPN Manager…
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f0f2f5]">
        <PlcSubNav />

        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-300 px-3 py-2 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Shield size={14} className="text-blue-600" /> VPN Manager
              {server && <span className="text-[11px] font-normal text-gray-500 ml-1">
                {server.endpoint ?? "endpoint not set"} · {server.interface} · {server.server_ip}/24
              </span>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Agent status badge */}
            {agentOk && (
              <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Agent live
                {status.lastReportedAt && <span className="text-gray-400 ml-1">{new Date(status.lastReportedAt).toLocaleTimeString()}</span>}
              </span>
            )}
            {agentStale && (
              <span className="flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5">
                <AlertCircle size={10} /> Agent stale
                {status.lastReportedAt && <span className="text-gray-400 ml-1">{new Date(status.lastReportedAt).toLocaleTimeString()}</span>}
              </span>
            )}
            {agentNever && (
              <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
                <Radio size={10} /> Agent not connected
              </span>
            )}
            {!server && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5">
                Not configured
              </span>
            )}
            <button onClick={refresh} className="p-1.5 hover:bg-gray-100 text-gray-500 transition-colors" title="Refresh">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
            {server && (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                <Plus size={12} /> Add Peer
              </button>
            )}
            <button onClick={() => setShowConfig(true)} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
              <Settings size={12} /> {server ? "Server Config" : "Initialize"}
            </button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── TOP GRID ── */}
          <div className="grid grid-cols-12 gap-0 border-b border-gray-200">

            {/* PANEL 1: VPN Server */}
            <div className="col-span-3 bg-white border-r border-gray-200 p-3">
              <p className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><Server size={11} className="text-blue-600" /> WireGuard Server</p>
              {server ? (
                <div className="space-y-2">
                  {/* Status grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400">Interface</p>
                      <p className="text-sm font-bold text-gray-800">{server.interface}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Listen Port</p>
                      <p className="text-sm font-bold text-gray-800">{server.listen_port}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Server IP</p>
                      <p className="text-sm font-bold text-blue-600">{server.server_ip}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">DNS</p>
                      <p className="text-sm font-bold text-gray-800">{server.dns}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[10px] text-gray-400">Endpoint</p>
                    <p className="text-xs font-semibold text-gray-700">{server.endpoint ?? <span className="text-amber-600 italic">Not set</span>}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">Server Public Key</p>
                    <div className="flex items-center gap-1">
                      <code className="text-[10px] text-gray-500 font-mono truncate flex-1">{server.public_key.slice(0, 24)}…</code>
                      <CopyBtn text={server.public_key} />
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex gap-2">
                    <a href="/pm-app/api/vpn/server/full-config" download className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
                      <Download size={10} /> wg0.conf
                    </a>
                    <button onClick={() => setShowConfig(true)} className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
                      <Settings size={10} /> Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">VPN server not configured.</p>
                  <button onClick={() => setShowConfig(true)} className="text-xs text-blue-600 hover:underline">Initialize now →</button>
                </div>
              )}
            </div>

            {/* PANEL 2: Peer Connections */}
            <div className="col-span-4 bg-white border-r border-gray-200 p-3">
              <p className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><Wifi size={11} className="text-blue-600" /> Peer Connections</p>
              {/* Stat row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Total Peers", val: peers.length, color: "text-gray-800" },
                  { label: "Online", val: onlinePeers.length, color: "text-green-600" },
                  { label: "Offline", val: offlinePeers.length, color: "text-gray-500" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="border border-gray-200 bg-gray-50 p-2 text-center">
                    <p className={cn("text-2xl font-bold leading-none", color)}>{val}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {/* Peer list */}
              {peers.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-3">
                  No peers yet.{" "}
                  {server && <button onClick={() => setShowAdd(true)} className="text-blue-600 hover:underline">Add first peer</button>}
                </p>
              ) : (
                <div className="space-y-0 border border-gray-200 divide-y divide-gray-100">
                  {peers.map(peer => {
                    const live = status.peers[peer.public_key];
                    const online = isOnline(live);
                    const exp = expandedPeer === peer.id;
                    return (
                      <div key={peer.id}>
                        <button
                          onClick={() => setExpandedPeer(exp ? null : peer.id)}
                          className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", online ? "bg-green-500" : "bg-gray-300")} />
                            <span className="text-xs font-medium text-gray-800 truncate">{deviceIcon(peer.device_type)} {peer.name}</span>
                            <code className="text-[10px] text-blue-600 font-mono">{peer.peer_ip}</code>
                            {live?.latencyMs != null && (
                              <span className={cn("text-[9px] font-semibold px-1 py-0.5 leading-none",
                                live.latencyMs < 30 ? "bg-green-100 text-green-700" : live.latencyMs < 100 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                              )}>{live.latencyMs.toFixed(1)}ms</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {live && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={9} />{fmtHandshake(live.lastHandshake)}</span>}
                            <span className={cn("text-[10px] font-bold", online ? "text-green-600" : "text-gray-400")}>{online ? "UP" : "DOWN"}</span>
                            <ChevronRight size={11} className={cn("text-gray-300 transition-transform", exp && "rotate-90")} />
                          </div>
                        </button>
                        {exp && (
                          <div className="px-2 py-2 bg-gray-50 border-t border-gray-100 space-y-1.5 text-[11px]">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center bg-white border border-gray-200 py-1">
                                <p className="text-[10px] text-gray-400">↓ Received</p>
                                <p className="font-semibold text-green-600">{fmtBytes(live?.rxBytes ?? 0)}</p>
                              </div>
                              <div className="text-center bg-white border border-gray-200 py-1">
                                <p className="text-[10px] text-gray-400">↑ Sent</p>
                                <p className="font-semibold text-blue-600">{fmtBytes(live?.txBytes ?? 0)}</p>
                              </div>
                              <div className="text-center bg-white border border-gray-200 py-1">
                                <p className="text-[10px] text-gray-400">Latency</p>
                                <p className={cn("font-semibold", live?.latencyMs != null ? (live.latencyMs < 30 ? "text-green-600" : live.latencyMs < 100 ? "text-yellow-600" : "text-red-600") : "text-gray-300")}>
                                  {live?.latencyMs != null ? `${live.latencyMs.toFixed(1)}ms` : "—"}
                                </p>
                              </div>
                              <div className="text-center bg-white border border-gray-200 py-1">
                                <p className="text-[10px] text-gray-400">Keepalive</p>
                                <p className="font-semibold text-gray-700">{peer.persistent_keepalive}s</p>
                              </div>
                            </div>
                            {live && live.lastHandshake > 0 && (
                              <p className="text-gray-500 flex items-center gap-1"><Clock size={9} /> Last connected: <span className="text-gray-700 font-medium">{fmtHandshake(live.lastHandshake)}</span>
                                <span className="text-gray-400 text-[9px]">({new Date(live.lastHandshake * 1000).toLocaleString()})</span>
                              </p>
                            )}
                            {peer.lan_ranges && <p className="text-gray-500">LAN: <code className="font-mono text-gray-700">{peer.lan_ranges}</code></p>}
                            {live?.endpoint && <p className="text-gray-500">Endpoint: <code className="font-mono text-gray-700">{live.endpoint}</code></p>}
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => { setPingIp(peer.peer_ip); setPingResult(null); }} className="text-purple-600 hover:underline flex items-center gap-0.5"><Crosshair size={10} /> Ping</button>
                              <a href={`/pm-app/api/vpn/peers/${peer.id}/wg-config`} download className="text-blue-600 hover:underline flex items-center gap-0.5"><Download size={10} /> WG Config</a>
                              {(peer.device_type === "linux" || peer.device_type === "teltonika") &&
                                <a href={`/pm-app/api/vpn/peers/${peer.id}/python-client`} download className="text-blue-600 hover:underline flex items-center gap-0.5"><Terminal size={10} /> Python Script</a>}
                              <button onClick={() => handleDelete(peer.id)} className="text-red-500 hover:underline flex items-center gap-0.5 ml-auto"><Trash2 size={10} /> Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL 3: Bandwidth */}
            <div className="col-span-2 bg-white border-r border-gray-200 p-3">
              <p className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><BarChart3 size={11} className="text-blue-600" /> Bandwidth</p>
              <div className="space-y-3">
                <div className="border border-gray-200 bg-gray-50 p-2">
                  <p className="text-[10px] text-green-600 flex items-center gap-0.5 mb-0.5"><ArrowDown size={10} /> Total Received</p>
                  <p className="text-xl font-bold text-gray-800 leading-none">{fmtBytes(totalRx)}</p>
                </div>
                <div className="border border-gray-200 bg-gray-50 p-2">
                  <p className="text-[10px] text-blue-600 flex items-center gap-0.5 mb-0.5"><ArrowUp size={10} /> Total Sent</p>
                  <p className="text-xl font-bold text-gray-800 leading-none">{fmtBytes(totalTx)}</p>
                </div>
                <div className="border border-gray-200 bg-gray-50 p-2">
                  <p className="text-[10px] text-gray-400 mb-0.5">Total Transfer</p>
                  <p className="text-xl font-bold text-gray-800 leading-none">{fmtBytes(totalRx + totalTx)}</p>
                </div>
              </div>
              {!status.available && (
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-0.5">
                  <AlertCircle size={10} /> Counters reset on WG restart
                </p>
              )}
            </div>

            {/* PANEL 4: Server Agent */}
            <div className="col-span-3 bg-white p-3">
              <p className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1"><Radio size={11} className="text-purple-600" /> Server Agent</p>
              {server ? (
                <div className="space-y-2.5">
                  {/* Agent status */}
                  <div className="border border-gray-200 bg-gray-50 p-2">
                    <p className="text-[10px] text-gray-400 mb-1">Status</p>
                    {agentOk && <p className="text-xs font-semibold text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active — reporting live</p>}
                    {agentStale && <p className="text-xs font-semibold text-orange-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Stale — agent may be offline</p>}
                    {agentNever && <p className="text-xs font-semibold text-amber-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Not yet connected</p>}
                    {!agentOk && !agentStale && !agentNever && <p className="text-xs text-gray-400">Unknown</p>}
                    {status.lastReportedAt && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Last: {new Date(status.lastReportedAt).toLocaleTimeString()}</p>
                    )}
                  </div>

                  {/* API Key */}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-0.5"><Key size={9} /> Agent API Key</p>
                    <div className="bg-gray-900 px-2 py-1.5 flex items-center gap-1">
                      <code className="text-[10px] text-purple-300 font-mono flex-1 truncate">{maskedKey ?? "—"}</code>
                      <button onClick={() => setKeyVisible(v => !v)} className="text-[9px] text-gray-400 hover:text-gray-200 border border-gray-700 px-1 py-0.5 shrink-0">{keyVisible ? "hide" : "show"}</button>
                      {server.agent_api_key && <CopyBtn text={server.agent_api_key} size={10} />}
                      <button onClick={regenKey} disabled={regenLoading} className="text-gray-500 hover:text-amber-400 shrink-0" title="Regenerate">
                        <RotateCcw size={10} className={regenLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Download */}
                  <a href="/pm-app/api/vpn/server/agent-script" download
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">
                    <Download size={11} /> Download Server Agent Script
                  </a>
                  <div className="bg-gray-50 border border-gray-200 p-2 text-[10px] text-gray-500 space-y-0.5">
                    <p className="font-semibold text-gray-600">Quick start on your VPS:</p>
                    <code className="block text-gray-700">sudo python3 flowmatrix_wg_agent.py</code>
                    <p>Reports every 30s · auto-applies new peers</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Initialize the server first to get an agent API key.</p>
              )}
            </div>
          </div>

          {/* ── USAGE TABLE ── */}
          {peers.length > 0 && (
            <div className="bg-white border-b border-gray-200">
              <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1"><BarChart3 size={11} className="text-blue-600" /> Peer Usage Summary</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  {(agentNever || agentStale || !status.available) && (
                    <span className="text-amber-600 flex items-center gap-0.5">
                      <AlertCircle size={10} /> {agentNever ? "Agent not connected — no live data" : agentStale ? "Agent offline — last known data" : "Status unavailable"}
                    </span>
                  )}
                  <span className="text-green-600 font-semibold">↓ {fmtBytes(totalRx)}</span>
                  <span className="text-blue-600 font-semibold">↑ {fmtBytes(totalTx)}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Peer", "Type", "VPN IP", "Status", "Last Connected", "Latency", "↓ Received", "↑ Sent", "Total", "Endpoint"].map(h => (
                        <th key={h} className={cn("px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap", h.startsWith("↓") || h.startsWith("↑") || h === "Total" || h === "Latency" ? "text-right" : "text-left")}>{h}</th>
                      ))}
                      <th className="px-3 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {peers.map(peer => {
                      const live = status.peers[peer.public_key];
                      const online = isOnline(live);
                      const total = (live?.rxBytes ?? 0) + (live?.txBytes ?? 0);
                      const maxTotal = peers.reduce((m, p) => { const l = status.peers[p.public_key]; return Math.max(m, (l?.rxBytes ?? 0) + (l?.txBytes ?? 0)); }, 1);
                      const pct = Math.round((total / maxTotal) * 100);
                      return (
                        <tr key={peer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span>{deviceIcon(peer.device_type)}</span>
                              <div>
                                <p className="font-semibold text-gray-800">{peer.name}</p>
                                {peer.notes && <p className="text-[9px] text-gray-400 truncate max-w-[100px]">{peer.notes}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{deviceLabel(peer.device_type)}</td>
                          <td className="px-3 py-2"><code className="font-mono text-blue-600 font-semibold">{peer.peer_ip}</code></td>
                          <td className="px-3 py-2">
                            <span className={cn("flex items-center gap-1 font-bold", online ? "text-green-600" : "text-gray-400")}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-green-500" : "bg-gray-300")} />
                              {online ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-700">{fmtHandshake(live?.lastHandshake ?? 0)}</div>
                            {live?.lastHandshake ? <div className="text-[9px] text-gray-400">{new Date(live.lastHandshake * 1000).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</div> : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {live?.latencyMs != null ? (
                              <span className={cn("font-semibold", live.latencyMs < 30 ? "text-green-600" : live.latencyMs < 100 ? "text-yellow-600" : "text-red-600")}>
                                {live.latencyMs.toFixed(1)} ms
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-green-600">{fmtBytes(live?.rxBytes ?? 0)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">{fmtBytes(live?.txBytes ?? 0)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-12 h-1.5 bg-gray-200 overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-semibold text-gray-700 w-12 text-right">{fmtBytes(total)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {live?.endpoint ? <code className="text-[10px] text-gray-500 font-mono">{live.endpoint}</code> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <a href={`/pm-app/api/vpn/peers/${peer.id}/wg-config`} download className="text-blue-600 hover:underline text-[10px]">WG</a>
                              {(peer.device_type === "linux" || peer.device_type === "teltonika") &&
                                <a href={`/pm-app/api/vpn/peers/${peer.id}/python-client`} download className="text-blue-600 hover:underline text-[10px]">PY</a>}
                              <button onClick={() => handleDelete(peer.id)} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                      <td colSpan={6} className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wide">Totals</td>
                      <td className="px-3 py-1.5 text-right text-green-600">{fmtBytes(totalRx)}</td>
                      <td className="px-3 py-1.5 text-right text-blue-600">{fmtBytes(totalTx)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{fmtBytes(totalRx + totalTx)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── NETWORK TOOLS ── */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2">
              <Crosshair size={11} className="text-purple-600" />
              <p className="text-[11px] font-bold text-gray-700">Network Tools</p>
              <span className="text-[10px] text-gray-400">— ping latency from FlowMatrix server</span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {/* IP input */}
                <input
                  type="text" placeholder="IP or hostname (e.g. 15.15.60.2 or 8.8.8.8)"
                  value={pingIp} onChange={e => setPingIp(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && runPing()}
                  className="flex-1 min-w-[200px] text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-purple-500 font-mono"
                />
                {/* Count selector */}
                <select value={pingCount} onChange={e => setPingCount(Number(e.target.value))}
                  className="text-xs border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-purple-500 bg-white w-20">
                  {[4, 6, 8, 10].map(c => <option key={c} value={c}>{c} packets</option>)}
                </select>
                <button onClick={runPing} disabled={pinging || !pingIp.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  {pinging ? <><RefreshCw size={11} className="animate-spin" /> Pinging…</> : <><Zap size={11} /> Ping</>}
                </button>
                {/* Quick-select peer IPs */}
                {peers.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-gray-400">Quick:</span>
                    {peers.map(p => (
                      <button key={p.id} onClick={() => { setPingIp(p.peer_ip); setPingResult(null); }}
                        className={cn("text-[10px] font-mono px-1.5 py-0.5 border transition-colors",
                          pingIp === p.peer_ip
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-blue-600 border-gray-300 hover:border-purple-400"
                        )}>
                        {p.peer_ip}
                      </button>
                    ))}
                    <button onClick={() => { setPingIp("8.8.8.8"); setPingResult(null); }}
                      className={cn("text-[10px] font-mono px-1.5 py-0.5 border transition-colors",
                        pingIp === "8.8.8.8" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-300 hover:border-purple-400"
                      )}>8.8.8.8</button>
                    <button onClick={() => { setPingIp("1.1.1.1"); setPingResult(null); }}
                      className={cn("text-[10px] font-mono px-1.5 py-0.5 border transition-colors",
                        pingIp === "1.1.1.1" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-300 hover:border-purple-400"
                      )}>1.1.1.1</button>
                  </div>
                )}
              </div>

              {/* Ping results */}
              {pingResult && (
                <div className={cn("border p-3 space-y-2", pingResult.ok && pingResult.loss < 100 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-gray-700 font-mono">{pingResult.ip}</span>
                    {/* Loss badge */}
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5",
                      pingResult.loss === 0 ? "bg-green-200 text-green-800" : pingResult.loss < 50 ? "bg-yellow-200 text-yellow-800" : "bg-red-200 text-red-800"
                    )}>{pingResult.loss}% loss</span>
                    <span className="text-[10px] text-gray-500">{pingResult.received}/{pingResult.sent} received</span>
                  </div>
                  {pingResult.avgMs !== null ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Min RTT", val: pingResult.minMs, color: "text-green-700" },
                        { label: "Avg RTT", val: pingResult.avgMs, color: pingResult.avgMs! < 30 ? "text-green-700" : pingResult.avgMs! < 100 ? "text-yellow-700" : "text-red-700" },
                        { label: "Max RTT", val: pingResult.maxMs, color: "text-gray-700" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="bg-white border border-gray-200 p-2 text-center">
                          <p className="text-[9px] text-gray-400 uppercase">{label}</p>
                          <p className={cn("text-lg font-bold leading-none", color)}>{val?.toFixed(1)}</p>
                          <p className="text-[9px] text-gray-400">ms</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><WifiOff size={12} /> Host unreachable — 100% packet loss</p>
                  )}
                  {/* Latency quality gauge */}
                  {pingResult.avgMs !== null && (
                    <div>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                        <span>Excellent</span><span>Good</span><span>Acceptable</span><span>Poor</span>
                      </div>
                      <div className="w-full h-1.5 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 relative">
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-gray-700 rounded-full shadow"
                          style={{ left: `${Math.min(100, (pingResult.avgMs / 200) * 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                        <span>0ms</span><span>50ms</span><span>100ms</span><span>200ms+</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!pingResult && !pinging && (
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Gauge size={10} /> Runs from the FlowMatrix server. Peer VPN IPs (15.15.60.x) are reachable only if FlowMatrix is also on the tunnel. Public IPs (8.8.8.8) work from any setup.
                </p>
              )}
            </div>
          </div>

          {/* ── SETUP GUIDE ── */}
          <div className="bg-white border-b border-gray-200">
            <button onClick={() => setShowGuide(v => !v)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
              <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1"><Terminal size={11} className="text-blue-600" /> Setup Guide — Remote WireGuard Server via Agent</p>
              <ChevronDown size={12} className={cn("text-gray-400 transition-transform", showGuide && "rotate-180")} />
            </button>
            {showGuide && (
              <div className="border-t border-gray-100 px-3 py-3">
                {/* Architecture row */}
                <div className="bg-gray-50 border border-gray-200 px-3 py-2 mb-3 flex items-center gap-2 text-[11px] flex-wrap">
                  <span className="font-bold text-gray-700">Architecture:</span>
                  <span className="bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5">FlowMatrix</span>
                  <span className="text-gray-400">→ stores keys + config</span>
                  <ChevronRight size={10} className="text-gray-300" />
                  <span className="bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5">Server Agent</span>
                  <span className="text-gray-400">→ pushes status every 30s + applies new peers</span>
                  <ChevronRight size={10} className="text-gray-300" />
                  <span className="bg-green-100 text-green-700 font-semibold px-1.5 py-0.5">WireGuard VPS</span>
                  <span className="text-gray-400">→ routes all tunnel traffic</span>
                </div>
                <ol className="grid grid-cols-2 gap-3 text-[11px] text-gray-600">
                  {[
                    { n: 1, color: "bg-blue-600", title: "Set up your WireGuard VPS", body: "Get a Linux VPS with a public IP. Install wireguard-tools. Enter the IP in Server Config → Initialize → download wg0.conf → place at /etc/wireguard/wg0.conf → sudo wg-quick up wg0" },
                    { n: 2, color: "bg-purple-600", title: "Deploy the Server Agent on your VPS", body: "Click Download Server Agent Script (above right). Copy to your VPS and run: sudo python3 flowmatrix_wg_agent.py  — or install as a systemd service (instructions inside the script)." },
                    { n: 3, color: "bg-green-600", title: "Add peers for each remote device", body: "Click + Add Peer for each site modem, Raspberry Pi, laptop, etc. Enter the LAN subnet if needed. The agent picks up new peers within 30 seconds and applies them automatically." },
                    { n: 4, color: "bg-amber-500", title: "Connect peer devices", body: "Linux/Pi: download the Python Script and run: sudo python3 flowmatrix_vpn.py up  — Teltonika: download WG Config and import via Services → VPN → WireGuard in the modem web UI." },
                  ].map(step => (
                    <li key={step.n} className="flex gap-2.5">
                      <span className={cn("w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5", step.color)}>{step.n}</span>
                      <div><span className="font-semibold text-gray-800">{step.title}: </span>{step.body}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

        </div>
      </div>

      {showAdd && <AddPeerModal onClose={() => setShowAdd(false)} onSaved={fetchAll} />}
      {showConfig && <ServerConfigModal server={server} onClose={() => setShowConfig(false)} onSaved={fetchAll} />}
    </Layout>
  );
}
