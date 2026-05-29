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
      <div
        ref={navRef}
        className="flex gap-0.5 overflow-x-auto scrollbar-none py-0.5"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        {PLC_NAV.map((item) => {
          const active = location === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <span
                data-active={active}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg whitespace-nowrap cursor-pointer transition-all border-b-2 -mb-px",
                  active
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <Icon size={12} />
                {item.label}
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
  id: number;
  public_key: string;
  listen_port: number;
  server_ip: string;
  network_cidr: string;
  endpoint: string | null;
  dns: string;
  interface: string;
  agent_api_key: string | null;
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
  stale?: boolean;
  neverReported?: boolean;
  lastReportedAt?: string;
}

interface UsageSnapshot {
  ts: number;
  key: string;
  rx: number;
  tx: number;
}

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
  const map: Record<string, string> = {
    linux: "Linux", teltonika: "Teltonika", windows: "Windows", android: "Android", macos: "macOS",
  };
  return map[type] ?? type;
}

function deviceIcon(type: string): string {
  const map: Record<string, string> = {
    linux: "🐧", teltonika: "📡", windows: "🪟", android: "📱", macos: "🍎",
  };
  return map[type] ?? "🖥️";
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyBtn({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:text-blue-600 text-slate-400 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check size={size} className="text-emerald-500" /> : <Copy size={size} />}
    </button>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconClass, borderClass }: {
  label: string; value: string | number; sub?: string;
  icon: typeof Shield; iconClass: string; borderClass: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm", borderClass)}>
      <div className={cn("p-2.5 rounded-xl shrink-0", iconClass)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Server Setup Card ────────────────────────────────────────────────────────
function ServerSetupCard({
  server,
  onSaved,
  onRegenKey,
}: {
  server: VpnServer | null;
  onSaved: () => void;
  onRegenKey: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(!server);
  const [saving, setSaving] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
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

  const regenKey = async () => {
    if (!confirm("Regenerate the agent API key? The server agent will need to be reconfigured with the new key.")) return;
    setRegenLoading(true);
    try {
      const res = await apiFetch("/vpn/server/regenerate-api-key", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "API key regenerated", description: "Update the key in your server agent." });
      onRegenKey();
    } catch {
      toast({ title: "Error", description: "Could not regenerate key", variant: "destructive" });
    } finally {
      setRegenLoading(false);
    }
  };

  const agentScriptUrl = "/pm-app/api/vpn/server/agent-script";
  const maskedKey = server?.agent_api_key
    ? (keyVisible ? server.agent_api_key : server.agent_api_key.slice(0, 10) + "••••••••••••••••••••••••••••••••••••••")
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
            <Server size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Remote WireGuard Server</p>
            <p className="text-xs text-slate-500">
              {server
                ? `${server.endpoint ?? "<endpoint not set>"} · Port ${server.listen_port} · Net ${server.server_ip}/24`
                : "Not configured — click to set up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {server && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Configured
            </span>
          )}
          <ChevronDown size={15} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/30">

          {/* Public key display */}
          {server && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-20 shrink-0">Public Key</span>
              <code className="text-xs text-emerald-400 font-mono flex-1 truncate">{server.public_key}</code>
              <CopyBtn text={server.public_key} />
            </div>
          )}

          {/* Endpoint & port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Server Public Endpoint <span className="font-normal text-slate-400">(IP or hostname of your VPS)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 203.0.113.50 or vpn.yourcompany.com"
                value={form.endpoint}
                onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">WireGuard Port</label>
              <input
                type="number"
                value={form.listen_port}
                onChange={(e) => setForm((f) => ({ ...f, listen_port: parseInt(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
              />
            </div>
          </div>

          <div className="sm:w-1/3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">DNS Server</label>
            <input
              type="text"
              value={form.dns}
              onChange={(e) => setForm((f) => ({ ...f, dns: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? "Saving…" : server ? "Update Config" : "Initialize Server"}
            </button>
            {server && (
              <a
                href="/pm-app/api/vpn/server/full-config"
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white text-slate-600 flex items-center gap-1.5 transition-colors"
                download
              >
                <Download size={13} /> wg0.conf
              </a>
            )}
          </div>

          {/* ── Agent API Key section ── */}
          {server && (
            <div className="mt-2 space-y-3">
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Key size={12} className="text-violet-500" /> Server Agent API Key
                  <span className="text-[10px] font-normal text-slate-400">— used by the Python agent running on your WireGuard server</span>
                </p>
                <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2.5 border border-slate-700">
                  <Radio size={12} className="text-violet-400 shrink-0" />
                  <code className="text-xs text-violet-300 font-mono flex-1 truncate">
                    {maskedKey ?? <span className="text-slate-500 italic">Generating…</span>}
                  </code>
                  <button
                    onClick={() => setKeyVisible(v => !v)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors shrink-0"
                  >
                    {keyVisible ? "hide" : "show"}
                  </button>
                  {server.agent_api_key && <CopyBtn text={server.agent_api_key} size={12} />}
                  <button
                    onClick={regenKey}
                    disabled={regenLoading}
                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                    title="Regenerate key"
                  >
                    <RotateCcw size={12} className={regenLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Agent script download */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-violet-800 flex items-center gap-1.5">
                      <Terminal size={12} /> FlowMatrix WireGuard Server Agent
                    </p>
                    <p className="text-[11px] text-violet-600 mt-0.5">
                      A Python script you run on your remote WireGuard server (VPS/cloud). It pushes live peer status to FlowMatrix every 30 seconds and auto-applies new peer configs.
                    </p>
                  </div>
                  <a
                    href={agentScriptUrl}
                    download
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <Download size={12} /> Download Agent
                  </a>
                </div>
                <div className="bg-violet-900/10 rounded-lg p-2.5 space-y-1">
                  <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider">Quick Start on your WireGuard server:</p>
                  <code className="text-[11px] text-violet-800 block">sudo python3 flowmatrix_wg_agent.py</code>
                  <p className="text-[10px] text-violet-600">Or install as a systemd service — instructions are inside the downloaded script.</p>
                </div>
              </div>
            </div>
          )}

          {!server && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-2">
              <p className="font-bold flex items-center gap-1.5"><AlertCircle size={12} /> How it works</p>
              <ol className="space-y-1.5 list-none">
                <li className="flex gap-2"><span className="font-bold text-blue-600 shrink-0">1.</span> Enter your VPS/cloud server's public IP and click <strong>Initialize</strong>. Keys are generated here.</li>
                <li className="flex gap-2"><span className="font-bold text-blue-600 shrink-0">2.</span> Download <code className="bg-blue-100 px-1 rounded">wg0.conf</code> → copy to your server at <code className="bg-blue-100 px-1 rounded">/etc/wireguard/wg0.conf</code></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600 shrink-0">3.</span> On your server: <code className="bg-blue-100 px-1 rounded">sudo wg-quick up wg0</code></li>
                <li className="flex gap-2"><span className="font-bold text-blue-600 shrink-0">4.</span> Download & run the <strong>Server Agent</strong> — it keeps FlowMatrix in sync with live peer status automatically.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Peer Modal ───────────────────────────────────────────────────────────
function AddPeerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", device_type: "linux", lan_ranges: "", persistent_keepalive: 25, notes: "",
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
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Plus size={15} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Add VPN Peer</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Peer Name *</label>
            <input
              autoFocus type="text" placeholder="e.g. Site A Modem, Office Laptop"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Device Type</label>
            <select
              value={form.device_type} onChange={(e) => setForm((f) => ({ ...f, device_type: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="linux">🐧 Linux (Raspberry Pi, Ubuntu…)</option>
              <option value="teltonika">📡 Teltonika Router</option>
              <option value="windows">🪟 Windows PC</option>
              <option value="android">📱 Android Phone</option>
              <option value="macos">🍎 macOS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">LAN Ranges <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text" placeholder="e.g. 192.168.1.0/24, 10.0.1.0/24"
              value={form.lan_ranges} onChange={(e) => setForm((f) => ({ ...f, lan_ranges: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-[11px] text-slate-400 mt-1">Subnets behind this peer that should be routed through the tunnel</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text" placeholder="Optional description"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={save} disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? "Generating keys…" : "Add Peer"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Peer Card ────────────────────────────────────────────────────────────────
function PeerCard({ peer, live, onDelete }: { peer: VpnPeer; live: LivePeer | undefined; onDelete: (id: number) => void }) {
  const online = isOnline(live);
  const dlUrl = (t: "wg-config" | "python-client") => `/pm-app/api/vpn/peers/${peer.id}/${t}`;

  return (
    <div className={cn(
      "bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md",
      online ? "border-emerald-200" : "border-slate-200"
    )}>
      {/* Status bar */}
      <div className={cn("h-1", online ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-slate-200")} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-sm",
            online ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-100"
          )}>
            {deviceIcon(peer.device_type)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{peer.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-500">{deviceLabel(peer.device_type)}</span>
              <span className="text-slate-300">·</span>
              <code className="text-[11px] text-blue-600 font-mono font-semibold">{peer.peer_ip}</code>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
            online
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            {online ? "● ONLINE" : "○ OFFLINE"}
          </span>
          <button onClick={() => onDelete(peer.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors ml-1" title="Remove peer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Live stats */}
      {live && (
        <div className="mx-4 mb-3 grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
          <div className="px-2 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-0.5">
              <Clock size={9} /> Handshake
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{fmtHandshake(live.lastHandshake)}</p>
          </div>
          <div className="px-2 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-0.5">
              <ArrowDown size={9} className="text-emerald-500" /> Received
            </p>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">{fmtBytes(live.rxBytes)}</p>
          </div>
          <div className="px-2 py-2 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-center gap-0.5">
              <ArrowUp size={9} className="text-blue-500" /> Sent
            </p>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">{fmtBytes(live.txBytes)}</p>
          </div>
        </div>
      )}

      {/* Detail rows */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">Pub Key</span>
          <code className="text-[10px] text-slate-600 font-mono flex-1 truncate">{peer.public_key}</code>
          <CopyBtn text={peer.public_key} size={11} />
        </div>
        {peer.lan_ranges && (
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0 pt-0.5">LAN</span>
            <code className="text-[10px] text-slate-600 font-mono">{peer.lan_ranges}</code>
          </div>
        )}
        {live?.endpoint && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">Endpoint</span>
            <code className="text-[10px] text-slate-600 font-mono flex-1 truncate">{live.endpoint}</code>
          </div>
        )}
        {peer.notes && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0 pt-0.5">Notes</span>
            <span className="text-[11px] text-slate-500">{peer.notes}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">Added</span>
          <span className="text-[11px] text-slate-500">{fmtDate(peer.created_at)}</span>
        </div>
      </div>

      {/* Downloads */}
      <div className="px-4 pb-4 flex gap-2">
        <a
          href={dlUrl("wg-config")} download
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg py-2 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <Download size={12} /> WG Config
        </a>
        {(peer.device_type === "linux" || peer.device_type === "teltonika") && (
          <a
            href={dlUrl("python-client")} download
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-blue-200 rounded-lg py-2 hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <Terminal size={12} /> Python Script
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Usage History Table ──────────────────────────────────────────────────────
function UsageHistorySection({ peers, status }: { peers: VpnPeer[]; status: VpnStatus }) {
  const historyRef = useRef<UsageSnapshot[]>([]);
  const [snapshots, setSnapshots] = useState<UsageSnapshot[]>([]);

  useEffect(() => {
    const now = Date.now();
    const newSnaps: UsageSnapshot[] = [];
    Object.entries(status.peers).forEach(([key, live]) => {
      if (live.rxBytes > 0 || live.txBytes > 0) {
        const existing = historyRef.current.find(s => s.key === key);
        if (!existing || Math.abs(existing.rx - live.rxBytes) > 0 || Math.abs(existing.tx - live.txBytes) > 0) {
          newSnaps.push({ ts: now, key, rx: live.rxBytes, tx: live.txBytes });
        }
      }
    });
    if (newSnaps.length > 0) {
      const merged = [
        ...historyRef.current.filter(s => !newSnaps.some(n => n.key === s.key)),
        ...newSnaps,
      ];
      historyRef.current = merged;
      setSnapshots([...merged]);
    }
  }, [status]);

  const peersWithData = peers.filter(p => {
    const live = status.peers[p.public_key];
    return live && (live.rxBytes > 0 || live.txBytes > 0);
  });

  if (peersWithData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <BarChart3 size={15} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Usage History</h3>
            <p className="text-xs text-slate-400">Bandwidth transferred per peer this session</p>
          </div>
        </div>
        <div className="py-10 text-center text-slate-400">
          <BarChart3 size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">No usage data yet</p>
          <p className="text-xs mt-1 text-slate-400">Data appears once peers connect and transfer traffic</p>
        </div>
      </div>
    );
  }

  const totalRx = peersWithData.reduce((s, p) => s + (status.peers[p.public_key]?.rxBytes ?? 0), 0);
  const totalTx = peersWithData.reduce((s, p) => s + (status.peers[p.public_key]?.txBytes ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <BarChart3 size={15} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Usage History</h3>
            <p className="text-xs text-slate-400">Cumulative bandwidth per peer since last WireGuard restart</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <ArrowDown size={11} /> {fmtBytes(totalRx)} total received
          </span>
          <span className="flex items-center gap-1 font-semibold text-blue-700">
            <ArrowUp size={11} /> {fmtBytes(totalTx)} total sent
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peer</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">VPN IP</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Handshake</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">↓ Received</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">↑ Sent</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endpoint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {peersWithData.map((peer) => {
              const live = status.peers[peer.public_key];
              const online = isOnline(live);
              const total = (live?.rxBytes ?? 0) + (live?.txBytes ?? 0);
              const maxTotal = peersWithData.reduce((m, p) => {
                const l = status.peers[p.public_key];
                return Math.max(m, (l?.rxBytes ?? 0) + (l?.txBytes ?? 0));
              }, 1);
              const pct = Math.round((total / maxTotal) * 100);
              return (
                <tr key={peer.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{deviceIcon(peer.device_type)}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{peer.name}</p>
                        {peer.notes && <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{peer.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{deviceLabel(peer.device_type)}</td>
                  <td className="px-4 py-3">
                    <code className="text-blue-600 font-mono font-semibold">{peer.peer_ip}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      online ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      {online ? "● Online" : "○ Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtHandshake(live?.lastHandshake ?? 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-emerald-700">{fmtBytes(live?.rxBytes ?? 0)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-blue-700">{fmtBytes(live?.txBytes ?? 0)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-semibold text-slate-700 w-14 text-right">{fmtBytes(total)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {live?.endpoint
                      ? <code className="text-[10px] text-slate-500 font-mono">{live.endpoint}</code>
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={5} className="px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{fmtBytes(totalRx)}</td>
              <td className="px-4 py-2.5 text-right font-bold text-blue-700">{fmtBytes(totalTx)}</td>
              <td className="px-4 py-2.5 text-right font-bold text-slate-700">{fmtBytes(totalRx + totalTx)}</td>
              <td className="px-4 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">
          ⓘ  Usage counters reset each time WireGuard is restarted on the server. Values reflect data since last restart.
        </p>
      </div>
    </div>
  );
}

// ─── Quick Setup Guide ────────────────────────────────────────────────────────
function SetupGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Terminal size={15} className="text-slate-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Full Setup Guide</span>
        </div>
        <ChevronDown size={15} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5">
          {/* Architecture overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
            <p className="font-bold text-slate-800 mb-1.5">Architecture Overview</p>
            <p className="text-slate-500 mb-2">
              FlowMatrix acts as the <strong>control plane</strong>. Your WireGuard server is a separate VPS/cloud host.
              A small Python agent runs on the WireGuard server and keeps both sides in sync.
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">FlowMatrix</span>
              <span className="text-slate-400">stores keys, generates configs, shows dashboard</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded">Server Agent</span>
              <span className="text-slate-400">pushes live status ↔ pulls new peer configs every 30s</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">WireGuard VPS</span>
              <span className="text-slate-400">routes all peer traffic</span>
            </div>
          </div>

          <ol className="space-y-4 text-xs text-slate-600">
            {[
              {
                n: 1,
                color: "bg-blue-600",
                title: "Set up your WireGuard VPS",
                body: <>
                  Get a Linux VPS (e.g. Ubuntu 22.04) with a public IP. Install WireGuard:
                  {" "}<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">apt install wireguard-tools</code>.
                  Enter the server's public IP in the <strong>Remote WireGuard Server</strong> card above, click <strong>Initialize</strong>,
                  then download <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">wg0.conf</code> and copy it to
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono"> /etc/wireguard/wg0.conf</code> on your VPS.
                  Run: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">sudo wg-quick up wg0</code>
                </>
              },
              {
                n: 2,
                color: "bg-violet-600",
                title: "Deploy the Server Agent on your VPS",
                body: <>
                  Click <strong>Download Agent</strong> in the server card (the purple section).
                  Copy <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">flowmatrix_wg_agent.py</code> to your VPS and run:
                  {" "}<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">sudo python3 flowmatrix_wg_agent.py</code>.
                  It will push live peer status to FlowMatrix every 30s and automatically apply any new peer configs you add here.
                  Install as a systemd service for persistent operation (instructions inside the script).
                </>
              },
              {
                n: 3,
                color: "bg-emerald-600",
                title: "Add peers (remote sites / devices)",
                body: <>
                  Click <strong>+ Add Peer</strong> for each device — site modem, Raspberry Pi, laptop, etc.
                  Enter the device's LAN subnet (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">192.168.1.0/24</code>) so traffic to those IPs routes through the tunnel.
                  The agent on your VPS will pick up new peers automatically within 30 seconds.
                </>
              },
              {
                n: 4,
                color: "bg-amber-500",
                title: "Connect peer devices",
                body: <>
                  <strong>Linux / Raspberry Pi:</strong> Download the <strong>Python Script</strong> for the peer and run
                  {" "}<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">sudo python3 flowmatrix_vpn.py up</code>.
                  {" "}<strong>Teltonika modems:</strong> Download the <strong>WG Config</strong> and import it in the modem's web UI under
                  {" "}<em>Services → VPN → WireGuard</em>. Activate the interface and it connects automatically.
                </>
              },
            ].map(step => (
              <li key={step.n} className="flex gap-3">
                <span className={`w-5 h-5 rounded-full ${step.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>{step.n}</span>
                <div><span className="font-semibold text-slate-800">{step.title}: </span>{step.body}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
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
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

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

  const onlinePeers = peers.filter((p) => isOnline(status.peers[p.public_key]));
  const offlinePeers = peers.filter((p) => !isOnline(status.peers[p.public_key]));
  const totalRx = Object.values(status.peers).reduce((s, l) => s + l.rxBytes, 0);
  const totalTx = Object.values(status.peers).reduce((s, l) => s + l.txBytes, 0);

  const filtered = peers.filter((p) => {
    if (filter === "online") return isOnline(status.peers[p.public_key]);
    if (filter === "offline") return !isOnline(status.peers[p.public_key]);
    return true;
  });

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* PLC Sub-nav */}
        <PlcSubNav />

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 shadow shadow-blue-200">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">VPN Manager</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  WireGuard tunnels · manage remote site connections
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {status.neverReported ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full">
                  <Radio size={11} /> Agent not yet connected
                </span>
              ) : status.stale ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full">
                  <AlertCircle size={11} /> Status stale · {onlinePeers.length}/{peers.length} last seen online
                </span>
              ) : status.available ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live · {onlinePeers.length}/{peers.length} online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  WireGuard offline
                </span>
              )}
              {status.lastReportedAt && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> {new Date(status.lastReportedAt).toLocaleTimeString()}
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={14} /> Add Peer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="max-w-6xl mx-auto px-5 py-5 space-y-5">

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Total Peers" value={peers.length}
                  icon={Settings} iconClass="bg-slate-600" borderClass="border-slate-200"
                  sub={`${peers.length} configured`}
                />
                <StatCard
                  label="Online Now" value={onlinePeers.length}
                  icon={Wifi} iconClass="bg-emerald-500" borderClass="border-emerald-200"
                  sub={`${offlinePeers.length} offline`}
                />
                <StatCard
                  label="Total Received" value={fmtBytes(totalRx)}
                  icon={ArrowDown} iconClass="bg-violet-500" borderClass="border-violet-100"
                  sub="since last WG restart"
                />
                <StatCard
                  label="Total Sent" value={fmtBytes(totalTx)}
                  icon={ArrowUp} iconClass="bg-blue-500" borderClass="border-blue-100"
                  sub="since last WG restart"
                />
              </div>

              {/* Server card */}
              <ServerSetupCard server={server} onSaved={fetchAll} onRegenKey={fetchAll} />

              {/* Peers section */}
              {server && (
                <>
                  {peers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                        <Globe size={24} className="text-blue-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No peers yet</p>
                      <p className="text-xs text-slate-400 mt-1 mb-5">Add a peer for each site modem, device or laptop that needs VPN access</p>
                      <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <Plus size={14} /> Add First Peer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Filter bar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-slate-700 mr-1">
                          VPN Peers
                          <span className="ml-1.5 text-xs font-normal text-slate-400">{peers.length} total</span>
                        </h2>
                        {(["all", "online", "offline"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                              "px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors capitalize",
                              filter === f
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200"
                            )}
                          >
                            {f === "all" ? `All (${peers.length})` : f === "online" ? `Online (${onlinePeers.length})` : `Offline (${offlinePeers.length})`}
                          </button>
                        ))}
                        {(status.neverReported || status.stale || !status.available) && (
                          <p className="ml-auto text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {status.neverReported
                              ? "Server agent not connected — peer status unavailable"
                              : status.stale
                              ? "Agent offline — showing last known status"
                              : "Status not available"}
                          </p>
                        )}
                      </div>

                      {/* Peer grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((p) => (
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

                  {/* Usage history */}
                  <UsageHistorySection peers={peers} status={status} />
                </>
              )}

              {/* Setup guide */}
              {server && <SetupGuide />}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddPeerModal onClose={() => setShowAdd(false)} onSaved={fetchAll} />
      )}
    </Layout>
  );
}
