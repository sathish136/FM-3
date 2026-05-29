import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Monitor, Plus, Trash2, RefreshCw, Wifi, WifiOff, Copy, Check, Eye, Key, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Machine {
  id: number;
  name: string;
  site: string;
  description?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  created_by?: string;
}

function formatRelative(ts?: string): string {
  if (!ts) return "Never";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TokenModal({ token, name, onClose }: { token: string; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Key className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Machine Token Generated</h2>
            <p className="text-xs text-slate-500">For: <span className="font-medium">{name}</span></p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Copy this token now — it won't be shown again. Use it when starting the agent on the IPC machine.
          </p>
        </div>

        <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-4 font-mono text-sm text-emerald-400 break-all mb-4 select-all">
          {token}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Run on the IPC Windows machine:</p>
          <code className="text-xs text-slate-700 dark:text-slate-300 break-all">
            python agent.py --server wss://your-domain.com --token {token}
          </code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copy}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              copied
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Token"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMachineModal({ onClose, onAdded }: { onClose: () => void; onAdded: (machine: Machine, token: string) => void }) {
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !site.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/remote-access/machines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), site: site.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onAdded(data, data.token);
    } catch (e: any) {
      toast({ title: "Failed to register machine", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-5">Register IPC Machine</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Machine Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. IPC-Site-01"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Site / Location *</label>
            <input
              value={site}
              onChange={e => setSite(e.target.value)}
              placeholder="e.g. Chennai WWTP"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Machine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RemoteAccess() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingToken, setPendingToken] = useState<{ token: string; name: string } | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/remote-access/machines`);
      if (res.ok) setMachines(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const deleteMachine = async (id: number, name: string) => {
    if (!confirm(`Remove machine "${name}"? This will end all active sessions.`)) return;
    try {
      await fetch(`${BASE}/api/remote-access/machines/${id}`, { method: "DELETE" });
      setMachines(prev => prev.filter(m => m.id !== id));
      toast({ title: "Machine removed" });
    } catch {
      toast({ title: "Failed to remove machine", variant: "destructive" });
    }
  };

  const regenerateToken = async (id: number, name: string) => {
    if (!confirm(`Regenerate token for "${name}"? The current agent will disconnect and need the new token.`)) return;
    try {
      const res = await fetch(`${BASE}/api/remote-access/machines/${id}/regenerate-token`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPendingToken({ token: data.token, name });
    } catch {
      toast({ title: "Failed to regenerate token", variant: "destructive" });
    }
  };

  const onlineMachines = machines.filter(m => m.is_online);
  const offlineMachines = machines.filter(m => !m.is_online);

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-indigo-500" />
              Remote Access
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Remotely view and control IPC Windows machines on site
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Register Machine
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Machines</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{machines.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Online Now</p>
            <p className="text-2xl font-bold text-emerald-600">{onlineMachines.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Offline</p>
            <p className="text-2xl font-bold text-slate-400">{offlineMachines.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <Monitor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-400">No machines registered yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Register an IPC machine to get started</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all"
            >
              Register First Machine
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {machines.map(machine => (
              <div
                key={machine.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  machine.is_online ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-800"
                )}>
                  <Monitor className={cn("w-5 h-5", machine.is_online ? "text-emerald-600" : "text-slate-400")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{machine.name}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      machine.is_online
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {machine.is_online ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                      {machine.is_online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span>{machine.site}</span>
                    {machine.description && <span>· {machine.description}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {machine.is_online ? "Connected" : formatRelative(machine.last_seen)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => regenerateToken(machine.id, machine.name)}
                    title="Regenerate token"
                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMachine(machine.id, machine.name)}
                    title="Remove machine"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <a
                    href={machine.is_online ? `${BASE}/remote-access/${machine.id}` : undefined}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      machine.is_online
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Connect
                    {machine.is_online && <ChevronRight className="w-3.5 h-3.5" />}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup guide */}
        <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm">Setup Guide</h3>
          <ol className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li className="flex gap-2"><span className="font-bold text-indigo-500 shrink-0">1.</span> Click "Register Machine" above and give the IPC machine a name and site label.</li>
            <li className="flex gap-2"><span className="font-bold text-indigo-500 shrink-0">2.</span> Copy the generated token — it's only shown once.</li>
            <li className="flex gap-2"><span className="font-bold text-indigo-500 shrink-0">3.</span> On the IPC Windows machine, install Python 3 and run: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">pip install websockets mss pillow pyautogui</code></li>
            <li className="flex gap-2"><span className="font-bold text-indigo-500 shrink-0">4.</span> Download <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">agent.py</code> from <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">clients/remote-agent/</code> and run it with the token.</li>
            <li className="flex gap-2"><span className="font-bold text-indigo-500 shrink-0">5.</span> The machine will appear as "Online" and you can click "Connect" to view and control it.</li>
          </ol>
        </div>
      </div>

      {showAdd && (
        <AddMachineModal
          onClose={() => setShowAdd(false)}
          onAdded={(machine, token) => {
            setMachines(prev => [machine, ...prev]);
            setShowAdd(false);
            setPendingToken({ token, name: machine.name });
          }}
        />
      )}

      {pendingToken && (
        <TokenModal
          token={pendingToken.token}
          name={pendingToken.name}
          onClose={() => setPendingToken(null)}
        />
      )}
    </Layout>
  );
}
