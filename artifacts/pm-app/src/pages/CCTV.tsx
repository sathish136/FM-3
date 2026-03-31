import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, Settings2, RefreshCw, Maximize2, Minimize2, WifiOff, Wifi,
  Grid2x2, LayoutGrid, Save, Eye, EyeOff, X, CheckCircle, AlertCircle,
  ChevronLeft, Monitor, Loader2, LayoutDashboard
} from "lucide-react";
import { Link } from "wouter";

const API = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "") + "/api-server/api";

interface CctvConfig {
  ip: string;
  port: number;
  username: string;
  password: string;
  channelCount: number;
  channelNames: string[];
  protocol: "http" | "https";
}

type Layout = "1" | "2x2" | "3x3" | "2+4";

function CameraFeed({
  channel, label, refreshMs, apiBase, isActive, onClick, isFullscreen
}: {
  channel: number;
  label: string;
  refreshMs: number;
  apiBase: string;
  isActive: boolean;
  onClick: () => void;
  isFullscreen: boolean;
}) {
  const [src, setSrc] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchFrame = useCallback(() => {
    const url = `${apiBase}/cctv/snapshot?channel=${channel}&t=${Date.now()}`;
    const img = new Image();
    img.onload = () => {
      if (!mountedRef.current) return;
      setSrc(url);
      setStatus("ok");
      setLastUpdated(new Date());
    };
    img.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
    };
    img.src = url;
  }, [channel, apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    fetchFrame();
    timerRef.current = setInterval(fetchFrame, refreshMs);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchFrame, refreshMs]);

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div
      onClick={onClick}
      className={`relative bg-black rounded-lg overflow-hidden cursor-pointer group transition-all duration-200
        ${isActive && !isFullscreen ? "ring-2 ring-sky-400" : "ring-1 ring-white/10 hover:ring-white/30"}`}
      style={{ aspectRatio: "16/9" }}
    >
      {/* Video frame */}
      {src && status === "ok" ? (
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          {status === "loading" && <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />}
          {status === "error" && (
            <>
              <WifiOff className="w-7 h-7 text-red-400" />
              <p className="text-xs text-red-300 font-medium">No Signal</p>
            </>
          )}
        </div>
      )}

      {/* Top-left: channel label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-md px-2 py-0.5 backdrop-blur-sm">
        <span className={`w-1.5 h-1.5 rounded-full ${status === "ok" ? "bg-emerald-400 animate-pulse" : status === "error" ? "bg-red-400" : "bg-amber-400"}`} />
        <span className="text-[10px] text-white font-semibold tracking-wide">{label || `CH${channel}`}</span>
      </div>

      {/* Bottom-right: timestamp */}
      {timeStr && (
        <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5 backdrop-blur-sm">
          <span className="text-[9px] text-white/80 font-mono">{timeStr}</span>
        </div>
      )}

      {/* Channel number badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5 backdrop-blur-sm">
        <span className="text-[9px] text-white/60 font-mono">CAM {channel}</span>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
    </div>
  );
}

export default function CCTV() {
  const [config, setConfig] = useState<CctvConfig>({
    ip: "", port: 80, username: "admin", password: "",
    channelCount: 4, channelNames: [], protocol: "http",
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState<CctvConfig & { passwordInput: string }>({
    ip: "", port: 80, username: "admin", password: "", passwordInput: "",
    channelCount: 4, channelNames: [], protocol: "http",
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [layout, setLayout] = useState<Layout>("2x2");
  const [activeChannel, setActiveChannel] = useState(1);
  const [refreshMs, setRefreshMs] = useState(3000);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetch(`${API}/cctv/config`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setConfig(d.config);
          setHasPassword(d.hasPassword);
          setIsConfigured(!!d.config.ip);
          if (!d.config.ip) setShowSettings(true);
        }
      })
      .catch(() => setShowSettings(true));
  }, []);

  const openSettings = () => {
    setForm({ ...config, passwordInput: "", password: "" });
    setTestResult(null);
    setShowSettings(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    const payload = {
      ...form,
      password: form.passwordInput || "***",
    };
    await fetch(`${API}/cctv/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const r = await fetch(`${API}/cctv/config`).then(x => x.json());
    if (r.ok) {
      setConfig(r.config);
      setHasPassword(r.hasPassword);
      setIsConfigured(!!r.config.ip);
    }
    setSaving(false);
    setShowSettings(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    // Save first, then test
    await fetch(`${API}/cctv/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, password: form.passwordInput || "***" }),
    });
    const r = await fetch(`${API}/cctv/test`).then(x => x.json());
    setTestResult({ ok: r.ok, msg: r.ok ? "Connected successfully!" : (r.error || "Connection failed") });
    setTesting(false);
  };

  const channels = Array.from({ length: config.channelCount }, (_, i) => i + 1);
  const channelName = (ch: number) => config.channelNames[ch - 1] || `Camera ${ch}`;

  // Grid layout logic
  const gridConfig: Record<Layout, { cols: string; chans: number[] }> = {
    "1":   { cols: "grid-cols-1",    chans: [activeChannel] },
    "2x2": { cols: "grid-cols-2",    chans: channels.slice(0, 4) },
    "3x3": { cols: "grid-cols-3",    chans: channels.slice(0, 9) },
    "2+4": { cols: "grid-cols-3",    chans: channels.slice(0, 6) },
  };
  const gc = gridConfig[layout] || gridConfig["2x2"];
  const visibleChannels = gc.chans.filter(c => c <= config.channelCount);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <Link href="/">
          <a className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs">
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </a>
        </Link>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-2 flex-1">
          <Camera className="w-5 h-5 text-sky-400" />
          <span className="text-white font-bold text-sm tracking-wide">CCTV — Live View</span>
          {isConfigured && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">
              <Wifi className="w-2.5 h-2.5" /> {config.ip}:{config.port}
            </span>
          )}
          {!isConfigured && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" /> NVR Not Configured
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh interval */}
          <select
            value={refreshMs}
            onChange={e => setRefreshMs(Number(e.target.value))}
            className="bg-gray-800 border border-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none"
          >
            <option value={1000}>1s refresh</option>
            <option value={2000}>2s refresh</option>
            <option value={3000}>3s refresh</option>
            <option value={5000}>5s refresh</option>
            <option value={10000}>10s refresh</option>
            <option value={30000}>30s refresh</option>
          </select>

          {/* Layout buttons */}
          <div className="flex items-center bg-gray-800 rounded overflow-hidden border border-white/10">
            {([
              { id: "1",   icon: Maximize2,   title: "Single Camera" },
              { id: "2x2", icon: Grid2x2,     title: "2×2 Grid" },
              { id: "2+4", icon: LayoutGrid,  title: "6-Camera" },
              { id: "3x3", icon: Monitor,     title: "3×3 Grid" },
            ] as const).map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setLayout(id)}
                title={title}
                className={`p-1.5 transition-colors ${layout === id ? "bg-sky-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Camera Grid */}
        <div className="flex-1 p-3 overflow-auto">
          {!isConfigured ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <Camera className="w-16 h-16 text-gray-700" />
              <div>
                <p className="text-white font-bold text-lg">Configure your Dahua NVR</p>
                <p className="text-gray-500 text-sm mt-1">Enter your NVR's IP address and credentials to start viewing cameras</p>
              </div>
              <button
                onClick={openSettings}
                className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Open Settings
              </button>
            </div>
          ) : (
            <div className={`grid ${gc.cols} gap-2`}>
              {visibleChannels.map(ch => (
                <CameraFeed
                  key={`${ch}-${refreshMs}`}
                  channel={ch}
                  label={channelName(ch)}
                  refreshMs={refreshMs}
                  apiBase={API}
                  isActive={activeChannel === ch}
                  onClick={() => { setActiveChannel(ch); if (layout !== "1") {} }}
                  isFullscreen={layout === "1"}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Side panel: channel list ── */}
        {isConfigured && layout !== "1" && (
          <div className="w-44 bg-gray-900 border-l border-white/10 flex flex-col p-2 gap-1 overflow-y-auto shrink-0">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 px-1">Channels</p>
            {channels.map(ch => (
              <button
                key={ch}
                onClick={() => { setActiveChannel(ch); setLayout("1"); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-xs
                  ${activeChannel === ch ? "bg-sky-600/20 text-sky-300 font-semibold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeChannel === ch ? "bg-sky-400" : "bg-gray-600"}`} />
                <span className="truncate">{channelName(ch)}</span>
                <span className="ml-auto text-[9px] text-gray-600 font-mono">CH{ch}</span>
              </button>
            ))}
            <div className="mt-auto pt-3 border-t border-white/10">
              <p className="text-[9px] text-gray-600 text-center">Click a channel<br/>for full view</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-400" />
                <span className="text-white font-bold text-sm">NVR Settings</span>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Connection */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Connection</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-400 mb-1 block">NVR IP Address</label>
                    <input
                      type="text"
                      value={form.ip}
                      onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                      placeholder="192.168.1.100"
                      className="w-full bg-gray-800 border border-white/10 text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Port</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                      className="w-full bg-gray-800 border border-white/10 text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-gray-400 mb-1 block">Protocol</label>
                  <div className="flex gap-2">
                    {(["http", "https"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, protocol: p }))}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
                          ${form.protocol === p ? "bg-sky-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-white/10"}`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Credentials</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Username</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="admin"
                      className="w-full bg-gray-800 border border-white/10 text-white text-xs rounded px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">
                      Password {hasPassword && !form.passwordInput && <span className="text-emerald-400">(saved)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.passwordInput}
                        onChange={e => setForm(f => ({ ...f, passwordInput: e.target.value }))}
                        placeholder={hasPassword ? "Leave blank to keep saved" : "Enter password"}
                        className="w-full bg-gray-800 border border-white/10 text-white text-xs rounded px-3 py-2 pr-8 focus:outline-none focus:border-sky-500"
                      />
                      <button onClick={() => setShowPass(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Channels */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Cameras</p>
                <div className="mb-3">
                  <label className="text-[10px] text-gray-400 mb-1 block">Number of Channels</label>
                  <select
                    value={form.channelCount}
                    onChange={e => setForm(f => ({ ...f, channelCount: Number(e.target.value) }))}
                    className="bg-gray-800 border border-white/10 text-white text-xs rounded px-3 py-2 focus:outline-none"
                  >
                    {[1, 2, 4, 8, 16, 32].map(n => (
                      <option key={n} value={n}>{n} Channels</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {Array.from({ length: form.channelCount }, (_, i) => i + 1).map(ch => (
                    <div key={ch}>
                      <label className="text-[9px] text-gray-500 mb-0.5 block">CH{ch} Label</label>
                      <input
                        type="text"
                        value={form.channelNames[ch - 1] || ""}
                        onChange={e => {
                          const names = [...(form.channelNames || [])];
                          names[ch - 1] = e.target.value;
                          setForm(f => ({ ...f, channelNames: names }));
                        }}
                        placeholder={`Camera ${ch}`}
                        className="w-full bg-gray-800 border border-white/10 text-white text-[11px] rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {testResult.msg}
                </div>
              )}

              <div className="text-[10px] text-gray-600 bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-500">Note:</strong> Your NVR must be reachable from this server's network. The snapshot feed uses Dahua's HTTP CGI API (<code className="text-gray-400">/cgi-bin/snapshot.cgi</code>). Ensure HTTP access is enabled on your NVR's web interface.
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-white/10">
              <button
                onClick={testConnection}
                disabled={testing || !form.ip}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                Test Connection
              </button>
              <div className="flex-1" />
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xs px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
