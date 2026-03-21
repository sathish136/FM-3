import { Layout } from "@/components/Layout";
import {
  Users, Search, Shield, ShieldOff, Check, X, Save,
  RefreshCw, ChevronRight, AlertCircle, Loader2, Lock, Unlock,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── All app modules ───────────────────────────────────────────────────────────
const APP_MODULES = [
  { key: "dashboard",        label: "Dashboard",        group: "Core" },
  { key: "drawings",         label: "Drawings",          group: "Design & Engineering" },
  { key: "design-2d",        label: "Design 2D",         group: "Design & Engineering" },
  { key: "design-3d",        label: "Design 3D",         group: "Design & Engineering" },
  { key: "pid",              label: "P&ID Process",      group: "Design & Engineering" },
  { key: "presentation",     label: "Presentation",      group: "Workspace" },
  { key: "projects",         label: "Projects",          group: "Workspace" },
  { key: "project-board",    label: "Project Board",     group: "Workspace" },
  { key: "meeting-minutes",  label: "Meeting Minutes",   group: "Workspace" },
  { key: "sheets",           label: "Sheets",            group: "Workspace" },
  { key: "material-request", label: "Material Request",  group: "Procurement" },
  { key: "hrms",             label: "HRMS",              group: "HR" },
];

const MODULE_GROUPS = [...new Set(APP_MODULES.map(m => m.group))];

// ── Types ─────────────────────────────────────────────────────────────────────
interface ErpUser {
  email: string;
  full_name: string;
  user_image: string | null;
  enabled: number;
}

interface Permission {
  email: string;
  fullName: string | null;
  hasAccess: boolean;
  modules: string;
  allowedProjects: string;
  updatedAt: string;
}

interface Project { name: string; erpnextName?: string }

// ── Avatar helpers ────────────────────────────────────────────────────────────
const COLORS = [
  "bg-violet-500","bg-indigo-500","bg-blue-500","bg-cyan-500",
  "bg-teal-500","bg-emerald-500","bg-amber-500","bg-orange-500",
  "bg-rose-500","bg-pink-500",
];
function avatarColor(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function UserAvatar({ user, size = "md" }: { user: ErpUser; size?: "sm" | "md" | "lg" }) {
  const [imgErr, setImgErr] = useState(false);
  const dim = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-sm";
  if (user.user_image && !imgErr) {
    return (
      <img
        src={user.user_image.startsWith("http") ? user.user_image : `https://erp.wttint.com${user.user_image}`}
        alt={user.full_name}
        onError={() => setImgErr(true)}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} ${avatarColor(user.email)} rounded-full flex items-center justify-center shrink-0 font-bold text-white`}>
      {initials(user.full_name || user.email)}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function UserManagementContent() {
  const { toast } = useToast();
  const [users, setUsers]         = useState<ErpUser[]>([]);
  const [perms, setPerms]         = useState<Record<string, Permission>>({});
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<ErpUser | null>(null);

  // Draft state for selected user
  const [draftAccess, setDraftAccess]     = useState(true);
  const [draftModules, setDraftModules]   = useState<string[]>([]);
  const [draftProjects, setDraftProjects] = useState<string[]>([]);
  const [projSearch, setProjSearch]       = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes, prRes] = await Promise.all([
        fetch(`${BASE}/api/erpnext-users`),
        fetch(`${BASE}/api/user-permissions`),
        fetch(`${BASE}/api/projects`),
      ]);
      const uData: ErpUser[]      = uRes.ok  ? await uRes.json()  : [];
      const pData: Permission[]   = pRes.ok  ? await pRes.json()  : [];
      const prData: Project[]     = prRes.ok ? await prRes.json() : [];
      setUsers(uData);
      setProjects(prData);
      const map: Record<string, Permission> = {};
      pData.forEach(p => { map[p.email] = p; });
      setPerms(map);
    } catch (e) {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function selectUser(u: ErpUser) {
    setSelected(u);
    const p = perms[u.email];
    setDraftAccess(p ? p.hasAccess : true);
    setDraftModules(p ? JSON.parse(p.modules || "[]") : APP_MODULES.map(m => m.key));
    setDraftProjects(p ? JSON.parse(p.allowedProjects || "[]") : []);
    setProjSearch("");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/user-permissions/${encodeURIComponent(selected.email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: selected.full_name,
          hasAccess: draftAccess,
          modules: draftModules,
          allowedProjects: draftProjects,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const row: Permission = await res.json();
      setPerms(prev => ({ ...prev, [selected.email]: row }));
      toast({ title: "Permissions saved" });
    } catch (e) {
      toast({ title: "Failed to save", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function toggleModule(key: string) {
    setDraftModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function toggleProject(name: string) {
    setDraftProjects(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  function allModulesOn() { setDraftModules(APP_MODULES.map(m => m.key)); }
  function allModulesOff() { setDraftModules([]); }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    (p.name || p.erpnextName || "").toLowerCase().includes(projSearch.toLowerCase())
  );

  function getAccessSummary(email: string) {
    const p = perms[email];
    if (!p) return null;
    if (!p.hasAccess) return "blocked";
    const mods = JSON.parse(p.modules || "[]") as string[];
    return `${mods.length}/${APP_MODULES.length} modules`;
  }

  return (
      <div className="h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">User Management</h1>
            <span className="text-xs text-gray-400 ml-1">Control module & project access per user</span>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ── Left: user list ─────────────────────────────────────────────── */}
          <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">No users found</div>
              ) : filtered.map(u => {
                const summary = getAccessSummary(u.email);
                const isBlocked = summary === "blocked";
                const isSel = selected?.email === u.email;
                return (
                  <button key={u.email} onClick={() => selectUser(u)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors ${
                      isSel ? "bg-indigo-50 border-indigo-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSel ? "text-indigo-700" : "text-gray-800"}`}>
                        {u.full_name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {summary ? (
                        isBlocked ? (
                          <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Blocked</span>
                        ) : (
                          <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{summary}</span>
                        )
                      ) : (
                        <span className="text-[9px] text-gray-300">Default</span>
                      )}
                      <ChevronRight className={`w-3 h-3 ${isSel ? "text-indigo-400" : "text-gray-300"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">{users.length} users from ERPNext</p>
            </div>
          </div>

          {/* ── Right: permission editor ─────────────────────────────────────── */}
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Select a user to configure permissions</p>
              <p className="text-xs opacity-60">Users are loaded from ERPNext</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* User info header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
                <UserAvatar user={selected} size="lg" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900">{selected.full_name}</h2>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>

                {/* Access toggle */}
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                  {draftAccess
                    ? <Unlock className="w-4 h-4 text-emerald-500" />
                    : <Lock className="w-4 h-4 text-red-500" />}
                  <span className="text-xs font-semibold text-gray-700">
                    {draftAccess ? "Access Granted" : "Access Blocked"}
                  </span>
                  <Toggle on={draftAccess} onChange={setDraftAccess} />
                </div>

                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>

              {!draftAccess && (
                <div className="mx-6 mt-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl shrink-0">
                  <ShieldOff className="w-4 h-4 shrink-0" />
                  This user is blocked from accessing FlowMatrix entirely.
                </div>
              )}

              <div className={`flex-1 overflow-y-auto px-6 py-5 flex gap-6 min-h-0 ${!draftAccess ? "opacity-40 pointer-events-none" : ""}`}>

                {/* Module permissions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Module Access</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={allModulesOn}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
                        All on
                      </button>
                      <button onClick={allModulesOff}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                        All off
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {MODULE_GROUPS.map(group => (
                      <div key={group}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{group}</p>
                        <div className="space-y-1">
                          {APP_MODULES.filter(m => m.group === group).map(mod => {
                            const on = draftModules.includes(mod.key);
                            return (
                              <button key={mod.key} onClick={() => toggleModule(mod.key)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                                  on
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  on ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                                }`}>
                                  {on && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-xs font-medium flex-1">{mod.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project access */}
                <div className="w-64 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-violet-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Project Access</h3>
                  </div>

                  <div className="mb-2 bg-violet-50 border border-violet-100 text-violet-700 text-[10px] px-3 py-2 rounded-lg">
                    Leave all unchecked to grant access to all projects.
                  </div>

                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input value={projSearch} onChange={e => setProjSearch(e.target.value)}
                      placeholder="Search projects…"
                      className="w-full pl-7 pr-3 py-2 text-[11px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                    />
                  </div>

                  <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                    {filteredProjects.length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-4">No projects found</p>
                    ) : filteredProjects.map(p => {
                      const name = p.erpnextName || p.name;
                      const on = draftProjects.includes(name);
                      return (
                        <button key={name} onClick={() => toggleProject(name)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                            on
                              ? "bg-violet-50 border-violet-200 text-violet-700"
                              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            on ? "bg-violet-600 border-violet-600" : "border-gray-300"
                          }`}>
                            {on && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="text-[11px] font-medium truncate flex-1">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {draftProjects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-500 font-semibold mb-1.5">
                        Restricted to {draftProjects.length} project{draftProjects.length !== 1 ? "s" : ""}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {draftProjects.map(p => (
                          <span key={p} className="inline-flex items-center gap-1 text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                            {p}
                            <button onClick={() => toggleProject(p)}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

export default function UserManagement() {
  return (
    <Layout>
      <UserManagementContent />
    </Layout>
  );
}
