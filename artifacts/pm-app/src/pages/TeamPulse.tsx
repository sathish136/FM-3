import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, RefreshCw, Search, Monitor, Users,
  Wifi, WifiOff, Clock, Loader2, Shield,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE_PX = BASE;

interface SystemActivity {
  id: number;
  deviceUsername: string;
  email: string;
  fullName: string;
  department: string;
  designation: string;
  erpEmployeeId: string;
  erpImage: string | null;
  activeApp: string;
  windowTitle: string;
  isActive: boolean;
  idleSeconds: number;
  deviceName: string;
  lastSeen: string;
  systemLoginToday?: string | null;
  systemLogoutToday?: string | null;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.slice(0, 5);
  try {
    const d = new Date(t);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return "—"; }
}

function timeSince(iso: string) {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function activityStatus(row: SystemActivity): "active" | "idle" | "offline" {
  const secsAgo = (Date.now() - new Date(row.lastSeen).getTime()) / 1000;
  if (secsAgo > 300) return "offline";
  if (!row.isActive || row.idleSeconds > 60) return "idle";
  return "active";
}

const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

function EmployeeCard({
  row, erpCheckin,
}: {
  row: SystemActivity;
  erpCheckin?: { checkIn?: string; checkOut?: string };
}) {
  const status = activityStatus(row);
  const photo = row.erpImage
    ? `${BASE_PX}/api/auth/photo?url=${encodeURIComponent(row.erpImage)}`
    : null;

  const statusConfig = {
    active:  { dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200", label: "Active",  ring: "ring-green-400/40" },
    idle:    { dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Idle",    ring: "ring-amber-400/40" },
    offline: { dot: "bg-gray-300",   badge: "bg-gray-100 text-gray-500 border-gray-200",    label: "Offline", ring: "ring-gray-300/40" },
  }[status];

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all ring-1 ${statusConfig.ring}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {photo ? (
              <img src={photo} alt={row.fullName}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {initials(row.fullName || row.email)}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusConfig.dot}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{row.fullName || row.deviceUsername}</div>
            {row.designation && <div className="text-[11px] text-blue-600 font-medium truncate">{row.designation}</div>}
            <div className="text-[10px] text-gray-400 truncate">{row.department || "—"}</div>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          {status !== "offline" && (
            <span className="text-[10px] text-gray-400">{timeSince(row.lastSeen)}</span>
          )}
        </div>
      </div>

      {/* Active App */}
      <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
        {status !== "offline" ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Monitor className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate font-medium">{row.activeApp || "—"}</span>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic flex items-center gap-1.5">
            <WifiOff className="w-3 h-3" /> No recent activity
          </div>
        )}
        {row.windowTitle && row.windowTitle !== row.activeApp && status !== "offline" && (
          <div className="text-[10px] text-gray-400 truncate ml-4 mt-0.5" title={row.windowTitle}>
            {row.windowTitle}
          </div>
        )}
      </div>

      {/* Timing */}
      <div className="grid grid-cols-3 border-t border-gray-100 text-center">
        <div className="py-2 px-1">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Check-In</div>
          <div className="text-[11px] font-bold text-emerald-600">{formatTime(erpCheckin?.checkIn)}</div>
        </div>
        <div className="py-2 px-1 border-l border-r border-gray-100">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sys Login</div>
          <div className="text-[11px] font-bold text-blue-600">{formatTime(row.systemLoginToday)}</div>
        </div>
        <div className="py-2 px-1">
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Last Active</div>
          <div className="text-[11px] font-bold text-gray-500">{formatTime(row.systemLogoutToday || row.lastSeen)}</div>
        </div>
      </div>

      {/* Device */}
      <div className="px-4 py-2 bg-gray-50/60 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 truncate">{row.deviceName || row.deviceUsername}</div>
      </div>
    </div>
  );
}

export default function TeamPulse() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<SystemActivity[]>([]);
  const [erpCheckinMap, setErpCheckinMap] = useState<Record<string, { checkIn?: string; checkOut?: string }>>({});
  const [hodDept, setHodDept] = useState<string | null>(null);
  const [permLoading, setPermLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "idle" | "offline">("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? "");
  const today = new Date().toISOString().slice(0, 10);

  // Load HOD department for current user
  useEffect(() => {
    if (!user?.email) return;
    setPermLoading(true);
    fetch(`${BASE}/api/user-permissions`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ email: string; hodDept?: string | null }>) => {
        if (isAdmin) {
          setHodDept(null); // admin sees all
        } else {
          const me = data.find(d => d.email?.toLowerCase() === user.email?.toLowerCase());
          setHodDept(me?.hodDept ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [user?.email, isAdmin]);

  const loadActivity = useCallback(() => {
    setActLoading(true);
    fetch(`${BASE}/api/activity/live?date=${today}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setActivity(Array.isArray(data) ? data : []);
        setLastRefresh(new Date());
      })
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [today]);

  const loadCheckins = useCallback(() => {
    fetch(`${BASE}/api/activity/checkins-today?date=${today}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setErpCheckinMap(typeof data === "object" && data !== null ? data : {}))
      .catch(() => {});
  }, [today]);

  useEffect(() => {
    if (permLoading) return;
    loadActivity();
    loadCheckins();
    intervalRef.current = setInterval(() => { loadActivity(); loadCheckins(); }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [permLoading, loadActivity, loadCheckins]);

  // Filter to HOD's dept (or all for admin)
  const deptFiltered = activity.filter(a => {
    if (isAdmin) return true;
    if (!hodDept) return false;
    return (a.department || "").toLowerCase() === hodDept.toLowerCase();
  });

  const filtered = deptFiltered.filter(a => {
    const name = (a.fullName || a.deviceUsername || a.email).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    const st = activityStatus(a);
    if (statusFilter !== "all" && st !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    const order: Record<string, number> = { active: 0, idle: 1, offline: 2 };
    return order[activityStatus(a)] - order[activityStatus(b)];
  });

  const activeCount  = deptFiltered.filter(a => activityStatus(a) === "active").length;
  const idleCount    = deptFiltered.filter(a => activityStatus(a) === "idle").length;
  const offlineCount = deptFiltered.filter(a => activityStatus(a) === "offline").length;

  if (permLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin && !hodDept) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
          <Shield className="w-12 h-12 text-gray-300" />
          <div>
            <h2 className="text-lg font-bold text-gray-700">Not assigned as HOD</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              You need to be assigned as a Head of Department in User Management to access Team Pulse.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Team Pulse</h1>
                <p className="text-xs text-gray-500">
                  {hodDept ? `${hodDept} Department · Real-time monitoring` : "All Departments · Real-time monitoring"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <button
                onClick={() => { loadActivity(); loadCheckins(); }}
                disabled={actLoading}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-4">
            {[
              { label: "Active",  count: activeCount,  color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
              { label: "Idle",    count: idleCount,    color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
              { label: "Offline", count: offlineCount, color: "bg-gray-50 text-gray-500 border-gray-200",    dot: "bg-gray-300" },
              { label: "Total",   count: deptFiltered.length, color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${s.color}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-lg font-black leading-none">{s.count}</span>
                <span className="font-medium opacity-70">{s.label}</span>
              </div>
            ))}

            {/* Search + filters */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-0.5">
                {(["all", "active", "idle", "offline"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${statusFilter === s
                      ? s === "active" ? "bg-green-500 text-white" : s === "idle" ? "bg-amber-400 text-white" : s === "offline" ? "bg-gray-400 text-white" : "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 w-44 bg-gray-50 focus:bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Employee Grid */}
        <div className="flex-1 overflow-auto p-6">
          {actLoading && activity.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <Users className="w-10 h-10 text-gray-300" />
              <div>
                <p className="text-sm font-semibold text-gray-500">No employees found</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {search || statusFilter !== "all" ? "Try adjusting your filters" : "No activity data yet for this department"}
                </p>
              </div>
              {(search || statusFilter !== "all") && (
                <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                  className="text-xs text-violet-600 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {hodDept && (
                    <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200">
                      {hodDept}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                  Auto-refreshes every 30s
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(row => (
                  <EmployeeCard
                    key={row.deviceUsername || row.email}
                    row={row}
                    erpCheckin={row.erpEmployeeId ? erpCheckinMap[row.erpEmployeeId] : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
