import { Layout } from "@/components/Layout";
import {
  Users, Search, Shield, ShieldOff, Save,
  RefreshCw, ChevronRight, Loader2, Lock, Unlock, Eye, Pencil, Ban,
  KeyRound, SunMedium, Moon, Monitor, LayoutDashboard, PanelLeftClose, Layers,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── All app modules ───────────────────────────────────────────────────────────
const APP_MODULES = [
  { key: "dashboard",          label: "Dashboard",            group: "Core" },
  { key: "projects",           label: "Projects",             group: "Project Management" },
  { key: "project-board",      label: "Project Board",        group: "Project Management" },
  { key: "project-timeline",   label: "Project Timeline",     group: "Project Management" },
  { key: "meeting-minutes",    label: "Meeting Minutes",      group: "Project Management" },
  { key: "material-request",   label: "Material Request",     group: "Project Management" },
  { key: "purchase-order",     label: "Purchase Order",       group: "Project Management" },
  { key: "presentation",       label: "Presentation",         group: "Project Management" },
  { key: "drawings",           label: "Drawings",             group: "Design & Engineering" },
  { key: "design-2d",          label: "Design 2D",            group: "Design & Engineering" },
  { key: "design-3d",          label: "Design 3D",            group: "Design & Engineering" },
  { key: "pid",                label: "P&ID Process",         group: "Design & Engineering" },
  { key: "nesting",            label: "Nesting",              group: "Design & Engineering" },
  { key: "project-drawings",   label: "Project Drawings",     group: "Design & Engineering" },
  { key: "email",              label: "Email",                group: "Communication" },
  { key: "smart-inbox",        label: "Smart Inbox (AI)",     group: "Communication" },
  { key: "chat",               label: "FlowTalk",             group: "Communication" },
  { key: "sheets",             label: "Sheets",               group: "Communication" },
  { key: "marketing",          label: "Marketing",            group: "Marketing" },
  { key: "leads",              label: "Leads",                group: "Marketing" },
  { key: "campaigns",          label: "Campaigns",            group: "Marketing" },
  { key: "purchase-dashboard", label: "Purchase Dashboard",   group: "Marketing" },
  { key: "stores-dashboard",   label: "Stores Dashboard",     group: "Marketing" },
  { key: "site-data",          label: "Site Data",            group: "Monitoring" },
  { key: "hrms",               label: "HRMS",                 group: "HR" },
  { key: "hrms-incidents",     label: "HR Incidents",         group: "HR" },
  { key: "user-management",    label: "User Management",      group: "Admin" },
  { key: "settings",           label: "Settings",             group: "Admin" },
];

const MODULE_GROUPS = [...new Set(APP_MODULES.map(m => m.group))];

type ModuleRole = "none" | "read" | "write";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ErpUser {
  email: string;
  full_name: string;
  user_image: string | null;
  enabled: number;
}

type ThemeOption = "light" | "dark" | "system";
type NavbarStyleOption = "full" | "mini" | "auto";

interface Permission {
  email: string;
  fullName: string | null;
  hasAccess: boolean;
  modules: string;
  moduleRoles: string;
  allowedProjects: string;
  twoFaEnabled: boolean;
  theme: ThemeOption;
  navbarStyle: NavbarStyleOption;
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

// ── Role picker: None | Read | Write ─────────────────────────────────────────
function RolePicker({ role, onChange }: { role: ModuleRole; onChange: (r: ModuleRole) => void }) {
  const options: { value: ModuleRole; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
    {
      value: "none",
      label: "None",
      icon: <Ban className="w-2.5 h-2.5" />,
      active: "bg-gray-500 text-white border-gray-500",
      inactive: "text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600",
    },
    {
      value: "read",
      label: "Read",
      icon: <Eye className="w-2.5 h-2.5" />,
      active: "bg-blue-500 text-white border-blue-500",
      inactive: "text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-600",
    },
    {
      value: "write",
      label: "Write",
      icon: <Pencil className="w-2.5 h-2.5" />,
      active: "bg-emerald-500 text-white border-emerald-500",
      inactive: "text-gray-400 border-gray-200 hover:border-emerald-300 hover:text-emerald-600",
    },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-all border-r last:border-r-0 border-gray-200 ${
            role === opt.value ? opt.active : `bg-white ${opt.inactive}`
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Helpers to build default role maps ───────────────────────────────────────
function buildDefaultRoles(defaultRole: ModuleRole = "write"): Record<string, ModuleRole> {
  return Object.fromEntries(APP_MODULES.map(m => [m.key, defaultRole]));
}

function rolesFromPermission(p: Permission): Record<string, ModuleRole> {
  // Prefer moduleRoles if it has data
  try {
    const stored = JSON.parse(p.moduleRoles || "{}") as Record<string, ModuleRole>;
    if (Object.keys(stored).length > 0) {
      // Ensure all modules are present, default missing ones to "none"
      const full: Record<string, ModuleRole> = {};
      APP_MODULES.forEach(m => { full[m.key] = stored[m.key] ?? "none"; });
      return full;
    }
  } catch {}
  // Fallback: derive from old modules array (all enabled = write, rest = none)
  try {
    const mods = JSON.parse(p.modules || "[]") as string[];
    const full: Record<string, ModuleRole> = {};
    APP_MODULES.forEach(m => { full[m.key] = mods.includes(m.key) ? "write" : "none"; });
    return full;
  } catch {}
  return buildDefaultRoles("none");
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

  // Draft state
  const [draftAccess, setDraftAccess]         = useState(true);
  const [draftRoles, setDraftRoles]           = useState<Record<string, ModuleRole>>({});
  const [draftProjects, setDraftProjects]     = useState<string[]>([]);
  const [draftTwoFa, setDraftTwoFa]           = useState(false);
  const [draftTheme, setDraftTheme]           = useState<ThemeOption>("system");
  const [draftNavbarStyle, setDraftNavbarStyle] = useState<NavbarStyleOption>("full");
  const [projSearch, setProjSearch]           = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes, prRes] = await Promise.all([
        fetch(`${BASE}/api/erpnext-users`),
        fetch(`${BASE}/api/user-permissions`),
        fetch(`${BASE}/api/projects`),
      ]);
      const uData: ErpUser[]    = uRes.ok  ? await uRes.json()  : [];
      const pData: Permission[] = pRes.ok  ? await pRes.json()  : [];
      const prData: Project[]   = prRes.ok ? await prRes.json() : [];
      setUsers(uData);
      setProjects(prData);
      const map: Record<string, Permission> = {};
      pData.forEach(p => { map[p.email] = p; });
      setPerms(map);
    } catch {
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
    setDraftRoles(p ? rolesFromPermission(p) : buildDefaultRoles("write"));
    setDraftProjects(p ? JSON.parse(p.allowedProjects || "[]") : []);
    setDraftTwoFa(p ? (p.twoFaEnabled ?? false) : false);
    setDraftTheme(p ? (p.theme ?? "system") : "system");
    setDraftNavbarStyle(p ? (p.navbarStyle ?? "full") : "full");
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
          moduleRoles: draftRoles,
          allowedProjects: draftProjects,
          twoFaEnabled: draftTwoFa,
          theme: draftTheme,
          navbarStyle: draftNavbarStyle,
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

  function setRole(key: string, role: ModuleRole) {
    setDraftRoles(prev => ({ ...prev, [key]: role }));
  }

  function setGroupRole(group: string, role: ModuleRole) {
    const keys = APP_MODULES.filter(m => m.group === group).map(m => m.key);
    setDraftRoles(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = role; });
      return next;
    });
  }

  function toggleProject(name: string) {
    setDraftProjects(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

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
    try {
      const roles = JSON.parse(p.moduleRoles || "{}") as Record<string, ModuleRole>;
      if (Object.keys(roles).length > 0) {
        const write = Object.values(roles).filter(r => r === "write").length;
        const read  = Object.values(roles).filter(r => r === "read").length;
        if (write === 0 && read === 0) return "no-access";
        return { write, read };
      }
    } catch {}
    try {
      const mods = JSON.parse(p.modules || "[]") as string[];
      return { write: mods.length, read: 0 };
    } catch {}
    return null;
  }

  // Draft stats
  const writeCount = Object.values(draftRoles).filter(r => r === "write").length;
  const readCount  = Object.values(draftRoles).filter(r => r === "read").length;
  const noneCount  = Object.values(draftRoles).filter(r => r === "none").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
          <h1 className="text-sm font-bold text-gray-900">User Management</h1>
          <span className="text-xs text-gray-400 ml-1 hidden sm:inline">Control module access & roles per user</span>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> None</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Read</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Write</span>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Left: user list ─────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
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
              const isNoAccess = summary === "no-access";
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
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    {!summary ? (
                      <span className="text-[9px] text-gray-300">Default</span>
                    ) : isBlocked ? (
                      <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Blocked</span>
                    ) : isNoAccess ? (
                      <span className="text-[9px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">No access</span>
                    ) : typeof summary === "object" ? (
                      <div className="flex items-center gap-1">
                        {summary.write > 0 && (
                          <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{summary.write}W</span>
                        )}
                        {summary.read > 0 && (
                          <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{summary.read}R</span>
                        )}
                      </div>
                    ) : null}
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
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0 flex-wrap gap-y-2">
              <UserAvatar user={selected} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900">{selected.full_name}</h2>
                <p className="text-xs text-gray-400">{selected.email}</p>
              </div>

              {/* Role stats */}
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">
                  <Pencil className="w-3 h-3" /> {writeCount} Write
                </span>
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">
                  <Eye className="w-3 h-3" /> {readCount} Read
                </span>
                <span className="flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-1 rounded-lg border border-gray-200">
                  <Ban className="w-3 h-3" /> {noneCount} None
                </span>
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

              {/* ── Module permissions ── */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Module Permissions</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setDraftRoles(buildDefaultRoles("write"))}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200">
                      <Pencil className="w-2.5 h-2.5" /> All Write
                    </button>
                    <button onClick={() => setDraftRoles(buildDefaultRoles("read"))}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200">
                      <Eye className="w-2.5 h-2.5" /> All Read
                    </button>
                    <button onClick={() => setDraftRoles(buildDefaultRoles("none"))}
                      className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                      <Ban className="w-2.5 h-2.5" /> All None
                    </button>
                  </div>
                </div>

                {/* Column header */}
                <div className="flex items-center gap-3 px-4 py-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-1">Module</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-[138px] text-center">Permission</span>
                </div>

                <div className="space-y-4">
                  {MODULE_GROUPS.map(group => {
                    const groupMods = APP_MODULES.filter(m => m.group === group);
                    const groupRoles = groupMods.map(m => draftRoles[m.key] ?? "none");
                    const allWrite = groupRoles.every(r => r === "write");
                    const allRead  = groupRoles.every(r => r === "read");
                    const allNone  = groupRoles.every(r => r === "none");
                    const groupSummary = allWrite ? "write" : allRead ? "read" : allNone ? "none" : "mixed";

                    return (
                      <div key={group}>
                        {/* Group header with bulk actions */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-1">{group}</p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setGroupRole(group, "write")}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                groupSummary === "write" ? "bg-emerald-100 text-emerald-700" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}>W</button>
                            <button onClick={() => setGroupRole(group, "read")}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                groupSummary === "read" ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              }`}>R</button>
                            <button onClick={() => setGroupRole(group, "none")}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                groupSummary === "none" ? "bg-gray-200 text-gray-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              }`}>—</button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {groupMods.map(mod => {
                            const role = draftRoles[mod.key] ?? "none";
                            return (
                              <div key={mod.key}
                                className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                                  role === "write"
                                    ? "bg-emerald-50 border-emerald-200"
                                    : role === "read"
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-white border-gray-200"
                                }`}
                              >
                                {/* Role indicator dot */}
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  role === "write" ? "bg-emerald-500" : role === "read" ? "bg-blue-500" : "bg-gray-300"
                                }`} />
                                <span className={`text-xs font-medium flex-1 ${
                                  role === "write" ? "text-emerald-800" : role === "read" ? "text-blue-800" : "text-gray-400"
                                }`}>{mod.label}</span>
                                <RolePicker role={role} onChange={r => setRole(mod.key, r)} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── User Settings (2FA, Theme, Navbar) ── */}
              <div className="w-56 shrink-0 space-y-5">

                {/* 2FA */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Security</h3>
                  </div>
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    draftTwoFa ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
                  }`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${draftTwoFa ? "text-amber-800" : "text-gray-700"}`}>
                        Two-Factor Auth
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {draftTwoFa ? "OTP required at login" : "OTP not required"}
                      </p>
                    </div>
                    <Toggle on={draftTwoFa} onChange={setDraftTwoFa} />
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <SunMedium className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Theme</h3>
                  </div>
                  <div className="space-y-1.5">
                    {([
                      { value: "light", label: "Light", icon: <SunMedium className="w-3.5 h-3.5" />, active: "bg-orange-50 border-orange-300 text-orange-700" },
                      { value: "dark",  label: "Dark",  icon: <Moon className="w-3.5 h-3.5" />,      active: "bg-gray-800 border-gray-700 text-gray-100" },
                      { value: "system",label: "System",icon: <Monitor className="w-3.5 h-3.5" />,   active: "bg-indigo-50 border-indigo-300 text-indigo-700" },
                    ] as { value: ThemeOption; label: string; icon: React.ReactNode; active: string }[]).map(opt => (
                      <button key={opt.value} onClick={() => setDraftTheme(opt.value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                          draftTheme === opt.value ? opt.active : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt.icon}
                        <span className="text-xs font-medium">{opt.label}</span>
                        {draftTheme === opt.value && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-current opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navbar Style */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LayoutDashboard className="w-4 h-4 text-teal-500" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Navbar Style</h3>
                  </div>
                  <div className="space-y-1.5">
                    {([
                      { value: "full", label: "Full Sidebar",  desc: "Expanded with labels",  icon: <Layers className="w-3.5 h-3.5" />,          active: "bg-teal-50 border-teal-300 text-teal-700" },
                      { value: "mini", label: "Mini Sidebar",  desc: "Icons only, compact",   icon: <PanelLeftClose className="w-3.5 h-3.5" />,   active: "bg-teal-50 border-teal-300 text-teal-700" },
                      { value: "auto", label: "Auto",          desc: "Collapses on small screens", icon: <Monitor className="w-3.5 h-3.5" />,      active: "bg-teal-50 border-teal-300 text-teal-700" },
                    ] as { value: NavbarStyleOption; label: string; desc: string; icon: React.ReactNode; active: string }[]).map(opt => (
                      <button key={opt.value} onClick={() => setDraftNavbarStyle(opt.value)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                          draftNavbarStyle === opt.value ? opt.active : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <span className="mt-0.5">{opt.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{opt.label}</p>
                          <p className="text-[10px] opacity-60 mt-0.5">{opt.desc}</p>
                        </div>
                        {draftNavbarStyle === opt.value && (
                          <span className="ml-auto mt-1 w-2 h-2 rounded-full bg-current opacity-60 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Project access ── */}
              <div className="w-64 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-violet-500" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Project Access</h3>
                </div>



                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input value={projSearch} onChange={e => setProjSearch(e.target.value)}
                    placeholder="Search projects…"
                    className="w-full pl-7 pr-3 py-2 text-[11px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                  />
                </div>

                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
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
                          {on && <span className="w-2 h-2 bg-white rounded-sm" />}
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
                          <button onClick={() => toggleProject(p)} className="hover:text-red-500 transition-colors">×</button>
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
