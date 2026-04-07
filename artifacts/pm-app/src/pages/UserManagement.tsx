import { Layout } from "@/components/Layout";
import {
  Users, Search, Shield, ShieldOff, Save,
  RefreshCw, ChevronRight, Loader2, Lock, Unlock, Eye, Pencil, Ban,
  KeyRound, SunMedium, Moon, Monitor, LayoutDashboard, PanelLeftClose, Layers, Copy, LayoutGrid, FolderOpen,
  Tag, Plus, Trash2, Edit2, X, Check, ChevronDown, Wand2, ChevronLeft, ArrowRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── All app modules ───────────────────────────────────────────────────────────
const APP_MODULES = [
  { key: "dashboard",              label: "Dashboard",            group: "Core" },
  { key: "calendar",               label: "Calendar",             group: "Core" },
  { key: "tasks",                  label: "Tasks (Kanban)",       group: "Core" },
  { key: "projects",               label: "Projects",             group: "Project Management" },
  { key: "project-board",          label: "Project Board",        group: "Project Management" },
  { key: "project-timeline",       label: "Project Timeline",     group: "Project Management" },
  { key: "meeting-minutes",        label: "Meeting Minutes",      group: "Project Management" },
  { key: "project-drawings",       label: "Project Drawings",     group: "Project Management" },
  { key: "presentation",           label: "Presentation",         group: "Project Management" },
  { key: "drawings",               label: "Drawings",             group: "Design & Engineering" },
  { key: "design-2d",              label: "Design 2D",            group: "Design & Engineering" },
  { key: "design-3d",              label: "Design 3D",            group: "Design & Engineering" },
  { key: "pid",                    label: "P&ID Process",         group: "Design & Engineering" },
  { key: "nesting",                label: "Nesting",              group: "Design & Engineering" },
  { key: "material-request",       label: "Material Request",     group: "Procurement" },
  { key: "purchase-order",         label: "Purchase Order",       group: "Procurement" },
  { key: "purchase-dashboard",     label: "Purchase Dashboard",   group: "Procurement" },
  { key: "stores-dashboard",       label: "Stores Dashboard",     group: "Procurement" },
  { key: "logistics-dashboard",    label: "Logistics Dashboard",  group: "Procurement" },
  { key: "process-proposal",       label: "Process & Proposal",   group: "Procurement" },
  { key: "finance-dashboard",      label: "Finance Dashboard",    group: "Procurement" },
  { key: "email",                  label: "Email",                group: "Communication" },
  { key: "smart-inbox",            label: "Smart Inbox (AI)",     group: "Communication" },
  { key: "chat",                   label: "FlowTalk",             group: "Communication" },
  { key: "sheets",                 label: "Sheets",               group: "Communication" },
  { key: "marketing",              label: "Marketing",            group: "Marketing & CRM" },
  { key: "leads",                  label: "Leads",                group: "Marketing & CRM" },
  { key: "campaigns",              label: "Campaigns",            group: "Marketing & CRM" },
  { key: "hrms",                   label: "HRMS",                 group: "HR" },
  { key: "hrms-checkin",           label: "Attendance",           group: "HR" },
  { key: "hrms-leave-request",     label: "Leave Request",        group: "HR" },
  { key: "hrms-claims",            label: "Claims",               group: "HR" },
  { key: "hrms-recruitment",       label: "Recruitment",          group: "HR" },
  { key: "hrms-incidents",         label: "HR Incidents",         group: "HR" },
  { key: "hrms-analytics",         label: "HR Analytics",         group: "HR" },
  { key: "hrms-performance",       label: "Performance",          group: "HR" },
  { key: "hrms-team-performance",  label: "Team Dashboard",       group: "HR" },
  { key: "hrms-task-summary",      label: "Task Summary",         group: "HR" },
  { key: "hrms-daily-reporting",   label: "Daily Reporting",      group: "HR" },
  { key: "site-data",              label: "Site Data",            group: "Monitoring" },
  { key: "cctv",                   label: "CCTV",                 group: "Monitoring" },
  { key: "mis-report",             label: "MD Dashboard",         group: "Executive" },
  { key: "payment-tracker",        label: "Bill & Recharge",      group: "Admin" },
  { key: "user-management",        label: "User Management",      group: "Admin" },
  { key: "settings",               label: "Settings",             group: "Admin" },
  { key: "email-settings",         label: "Email Settings",       group: "Admin" },
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
type NavbarStyleOption = "full" | "mini" | "auto" | "launcher";

interface Permission {
  email: string;
  fullName: string | null;
  hasAccess: boolean;
  modules: string;
  moduleRoles: string;
  roleType: string | null;
  allowedProjects: string;
  allowedDrawingDepts: string;
  hodDept: string | null;
  twoFaEnabled: boolean;
  theme: ThemeOption;
  navbarStyle: NavbarStyleOption;
  updatedAt: string;
}

interface Project { name: string; erpnextName?: string }

interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  color: string;
  moduleRoles: string;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_COLORS: { value: string; label: string; bg: string; border: string; text: string; dot: string }[] = [
  { value: "violet",  label: "Violet",  bg: "bg-violet-50",  border: "border-violet-300",  text: "text-violet-700",  dot: "bg-violet-500" },
  { value: "blue",    label: "Blue",    bg: "bg-blue-50",    border: "border-blue-300",    text: "text-blue-700",    dot: "bg-blue-500" },
  { value: "emerald", label: "Green",   bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-500" },
  { value: "amber",   label: "Amber",   bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-700",   dot: "bg-amber-500" },
  { value: "rose",    label: "Rose",    bg: "bg-rose-50",    border: "border-rose-300",    text: "text-rose-700",    dot: "bg-rose-500" },
  { value: "cyan",    label: "Cyan",    bg: "bg-cyan-50",    border: "border-cyan-300",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  { value: "orange",  label: "Orange",  bg: "bg-orange-50",  border: "border-orange-300",  text: "text-orange-700",  dot: "bg-orange-500" },
  { value: "slate",   label: "Slate",   bg: "bg-slate-50",   border: "border-slate-300",   text: "text-slate-700",   dot: "bg-slate-500" },
];

function getTemplateColor(color: string) {
  return TEMPLATE_COLORS.find(c => c.value === color) ?? TEMPLATE_COLORS[0];
}

const DEFAULT_ROLE_TEMPLATES: Omit<RoleTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Admin",
    description: "Full access to all modules",
    color: "rose",
    moduleRoles: JSON.stringify(Object.fromEntries(
      ["dashboard","calendar","tasks","projects","project-board","project-timeline","meeting-minutes","project-drawings","presentation",
       "drawings","design-2d","design-3d","pid","nesting","material-request","purchase-order","purchase-dashboard","stores-dashboard",
       "logistics-dashboard","process-proposal","finance-dashboard","email","smart-inbox","chat","sheets","marketing","leads","campaigns",
       "hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-recruitment","hrms-incidents","hrms-analytics","hrms-performance",
       "hrms-team-performance","hrms-task-summary","hrms-daily-reporting","site-data","cctv","mis-report","payment-tracker",
       "user-management","settings","email-settings"].map(k => [k, "write"])
    )),
  },
  {
    name: "Project Manager",
    description: "Full access to project management modules, read-only for others",
    color: "violet",
    moduleRoles: JSON.stringify(Object.fromEntries([
      ...["dashboard","calendar","tasks","projects","project-board","project-timeline","meeting-minutes","project-drawings","presentation",
         "material-request","email","chat","sheets"].map(k => [k, "write"]),
      ...["purchase-order","purchase-dashboard","stores-dashboard","logistics-dashboard","process-proposal","finance-dashboard",
         "drawings","design-2d","design-3d","pid","nesting","hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-analytics",
         "hrms-performance","hrms-team-performance","hrms-task-summary","hrms-daily-reporting"].map(k => [k, "read"]),
      ...["marketing","leads","campaigns","hrms-recruitment","hrms-incidents","site-data","cctv","mis-report","payment-tracker",
         "user-management","settings","email-settings","smart-inbox"].map(k => [k, "none"]),
    ])),
  },
  {
    name: "Engineer",
    description: "Full access to design & engineering modules",
    color: "blue",
    moduleRoles: JSON.stringify(Object.fromEntries([
      ...["dashboard","calendar","tasks","drawings","design-2d","design-3d","pid","nesting","project-drawings","email","chat"].map(k => [k, "write"]),
      ...["projects","project-board","project-timeline","meeting-minutes","material-request","presentation"].map(k => [k, "read"]),
      ...["purchase-order","purchase-dashboard","stores-dashboard","logistics-dashboard","process-proposal","finance-dashboard",
         "marketing","leads","campaigns","hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-recruitment","hrms-incidents",
         "hrms-analytics","hrms-performance","hrms-team-performance","hrms-task-summary","hrms-daily-reporting","site-data","cctv",
         "mis-report","payment-tracker","user-management","settings","email-settings","smart-inbox","sheets"].map(k => [k, "none"]),
    ])),
  },
  {
    name: "HR Manager",
    description: "Full access to HR modules",
    color: "emerald",
    moduleRoles: JSON.stringify(Object.fromEntries([
      ...["dashboard","calendar","hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-recruitment","hrms-incidents",
         "hrms-analytics","hrms-performance","hrms-team-performance","hrms-task-summary","hrms-daily-reporting","email","chat"].map(k => [k, "write"]),
      ...["tasks","projects","project-board","project-timeline","meeting-minutes"].map(k => [k, "read"]),
      ...["project-drawings","presentation","drawings","design-2d","design-3d","pid","nesting","material-request","purchase-order",
         "purchase-dashboard","stores-dashboard","logistics-dashboard","process-proposal","finance-dashboard","marketing","leads",
         "campaigns","site-data","cctv","mis-report","payment-tracker","user-management","settings","email-settings","smart-inbox","sheets"].map(k => [k, "none"]),
    ])),
  },
  {
    name: "Finance",
    description: "Access to finance and procurement modules",
    color: "amber",
    moduleRoles: JSON.stringify(Object.fromEntries([
      ...["dashboard","calendar","finance-dashboard","purchase-order","purchase-dashboard","stores-dashboard","logistics-dashboard",
         "material-request","email","chat"].map(k => [k, "write"]),
      ...["tasks","projects","project-board","process-proposal","mis-report"].map(k => [k, "read"]),
      ...["project-timeline","meeting-minutes","project-drawings","presentation","drawings","design-2d","design-3d","pid","nesting",
         "marketing","leads","campaigns","hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-recruitment","hrms-incidents",
         "hrms-analytics","hrms-performance","hrms-team-performance","hrms-task-summary","hrms-daily-reporting","site-data","cctv",
         "payment-tracker","user-management","settings","email-settings","smart-inbox","sheets"].map(k => [k, "none"]),
    ])),
  },
  {
    name: "Viewer",
    description: "Read-only access to core modules",
    color: "slate",
    moduleRoles: JSON.stringify(Object.fromEntries([
      ...["dashboard","calendar","tasks","projects","project-board","project-timeline","meeting-minutes"].map(k => [k, "read"]),
      ...["project-drawings","presentation","drawings","design-2d","design-3d","pid","nesting","material-request","purchase-order",
         "purchase-dashboard","stores-dashboard","logistics-dashboard","process-proposal","finance-dashboard","email","smart-inbox","chat",
         "sheets","marketing","leads","campaigns","hrms","hrms-checkin","hrms-leave-request","hrms-claims","hrms-recruitment","hrms-incidents",
         "hrms-analytics","hrms-performance","hrms-team-performance","hrms-task-summary","hrms-daily-reporting","site-data","cctv","mis-report",
         "payment-tracker","user-management","settings","email-settings"].map(k => [k, "none"]),
    ])),
  },
];

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
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-primary" : "bg-muted"}`}
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
      active: "bg-muted-foreground text-background border-muted-foreground",
      inactive: "text-muted-foreground border-border hover:border-border/80 hover:text-foreground",
    },
    {
      value: "read",
      label: "Read",
      icon: <Eye className="w-2.5 h-2.5" />,
      active: "bg-blue-500 text-white border-blue-500",
      inactive: "text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600",
    },
    {
      value: "write",
      label: "Write",
      icon: <Pencil className="w-2.5 h-2.5" />,
      active: "bg-emerald-500 text-white border-emerald-500",
      inactive: "text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-600",
    },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-all border-r last:border-r-0 border-border ${
            role === opt.value ? opt.active : `bg-card ${opt.inactive}`
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
  try {
    const stored = JSON.parse(p.moduleRoles || "{}") as Record<string, ModuleRole>;
    if (Object.keys(stored).length > 0) {
      const full: Record<string, ModuleRole> = {};
      APP_MODULES.forEach(m => { full[m.key] = stored[m.key] ?? "none"; });
      return full;
    }
  } catch {}
  try {
    const mods = JSON.parse(p.modules || "[]") as string[];
    const full: Record<string, ModuleRole> = {};
    APP_MODULES.forEach(m => { full[m.key] = mods.includes(m.key) ? "write" : "none"; });
    return full;
  } catch {}
  return buildDefaultRoles("none");
}

// ── Wizard step definitions ───────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, label: "Role & Access",       icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 2, label: "Module Permissions",  icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 3, label: "Projects & Drawings", icon: <FolderOpen className="w-3.5 h-3.5" /> },
  { id: 4, label: "Preferences",         icon: <SunMedium className="w-3.5 h-3.5" /> },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export function UserManagementContent() {
  const { toast } = useToast();
  const [view, setView]           = useState<"users" | "templates">("users");
  const [users, setUsers]         = useState<ErpUser[]>([]);
  const [perms, setPerms]         = useState<Record<string, Permission>>({});
  const [projects, setProjects]   = useState<Project[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<ErpUser | null>(null);
  const [hideDisabled, setHideDisabled] = useState(true);

  // Wizard step
  const [wizardStep, setWizardStep] = useState(1);

  // Draft state
  const [draftAccess, setDraftAccess]         = useState(true);
  const [draftRoles, setDraftRoles]           = useState<Record<string, ModuleRole>>({});
  const [draftRoleType, setDraftRoleType]     = useState<string | null>(null);
  const [draftProjects, setDraftProjects]         = useState<string[]>([]);
  const [draftDrawingDepts, setDraftDrawingDepts] = useState<string[]>([]);
  const [draftHodDept, setDraftHodDept]           = useState<string | null>(null);
  const [draftTwoFa, setDraftTwoFa]               = useState(false);
  const [draftTheme, setDraftTheme]               = useState<ThemeOption>("system");
  const [draftNavbarStyle, setDraftNavbarStyle]   = useState<NavbarStyleOption>("full");
  const [projSearch, setProjSearch]               = useState("");
  const [copyFromOpen, setCopyFromOpen]       = useState(false);
  const [copyFromSearch, setCopyFromSearch]   = useState("");
  const [togglingEnabled, setTogglingEnabled] = useState(false);

  // Role template editor state
  const [tmplEditing, setTmplEditing]         = useState<RoleTemplate | null>(null);
  const [tmplCreating, setTmplCreating]       = useState(false);
  const [tmplName, setTmplName]               = useState("");
  const [tmplDesc, setTmplDesc]               = useState("");
  const [tmplColor, setTmplColor]             = useState("violet");
  const [tmplRoles, setTmplRoles]             = useState<Record<string, ModuleRole>>({});
  const [tmplSaving, setTmplSaving]           = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes, prRes, tRes, dRes] = await Promise.all([
        fetch(`${BASE}/api/erpnext-users`),
        fetch(`${BASE}/api/user-permissions`),
        fetch(`${BASE}/api/projects`),
        fetch(`${BASE}/api/role-templates`),
        fetch(`${BASE}/api/departments`),
      ]);
      const uData: ErpUser[]       = uRes.ok  ? await uRes.json()  : [];
      const pData: Permission[]    = pRes.ok  ? await pRes.json()  : [];
      const prData: Project[]      = prRes.ok ? await prRes.json() : [];
      const tData: RoleTemplate[]  = tRes.ok  ? await tRes.json()  : [];
      const dData: { name: string; department_name: string }[] = dRes.ok ? await dRes.json() : [];
      setUsers(uData);
      setProjects(prData);
      setTemplates(tData);
      setDepartments(
        dData.length > 0
          ? dData.map(d => d.name).filter(n => n && n !== "All Departments").sort()
          : ["Mechanical","Electrical","Civil","Instrumentation","Process","Project","Quality","HSE"]
      );
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
    setWizardStep(1);
    const p = perms[u.email];
    setDraftAccess(p ? p.hasAccess : true);
    setDraftRoles(p ? rolesFromPermission(p) : buildDefaultRoles("write"));
    setDraftRoleType(p ? (p.roleType ?? null) : null);
    setDraftProjects(p ? JSON.parse(p.allowedProjects || "[]") : []);
    setDraftDrawingDepts(p ? (() => { try { return JSON.parse(p.allowedDrawingDepts || "[]"); } catch { return []; } })() : []);
    setDraftHodDept(p ? (p.hodDept ?? null) : null);
    setDraftTwoFa(p ? (p.twoFaEnabled ?? false) : false);
    setDraftTheme(p ? (p.theme ?? "system") : "system");
    setDraftNavbarStyle(p ? (p.navbarStyle ?? "full") : "full");
    setProjSearch("");
    setCopyFromOpen(false);
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
          roleType: draftRoleType,
          allowedProjects: draftProjects,
          allowedDrawingDepts: draftDrawingDepts,
          hodDept: draftHodDept,
          twoFaEnabled: draftTwoFa,
          theme: draftTheme,
          navbarStyle: draftNavbarStyle,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const row: Permission = await res.json();
      setPerms(prev => ({ ...prev, [selected.email]: row }));
      toast({ title: "Permissions saved successfully" });
    } catch (e) {
      toast({ title: "Failed to save", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(tmpl: RoleTemplate) {
    try {
      const roles = JSON.parse(tmpl.moduleRoles || "{}") as Record<string, ModuleRole>;
      const full: Record<string, ModuleRole> = {};
      APP_MODULES.forEach(m => { full[m.key] = roles[m.key] ?? "none"; });
      setDraftRoles(full);
      setDraftRoleType(tmpl.name);
      toast({ title: `Applied: ${tmpl.name}`, description: "Module permissions updated from template." });
    } catch {
      toast({ title: "Failed to apply template", variant: "destructive" });
    }
  }

  async function saveTmpl() {
    setTmplSaving(true);
    try {
      const isNew = !tmplEditing;
      const url = isNew ? `${BASE}/api/role-templates` : `${BASE}/api/role-templates/${tmplEditing!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tmplName, description: tmplDesc, color: tmplColor, moduleRoles: tmplRoles }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: RoleTemplate = await res.json();
      setTemplates(prev => isNew ? [...prev, saved] : prev.map(t => t.id === saved.id ? saved : t));
      setTmplEditing(null);
      setTmplCreating(false);
      toast({ title: isNew ? "Role template created" : "Role template updated" });
    } catch (e) {
      toast({ title: "Failed to save template", description: String(e), variant: "destructive" });
    } finally {
      setTmplSaving(false);
    }
  }

  async function deleteTmpl(id: number) {
    try {
      const res = await fetch(`${BASE}/api/role-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: "Template deleted" });
    } catch (e) {
      toast({ title: "Failed to delete template", description: String(e), variant: "destructive" });
    }
  }

  async function seedDefaultTemplates() {
    for (const tmpl of DEFAULT_ROLE_TEMPLATES) {
      const existing = templates.find(t => t.name === tmpl.name);
      if (!existing) {
        try {
          const res = await fetch(`${BASE}/api/role-templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: tmpl.name, description: tmpl.description, color: tmpl.color, moduleRoles: JSON.parse(tmpl.moduleRoles) }),
          });
          if (res.ok) {
            const saved: RoleTemplate = await res.json();
            setTemplates(prev => [...prev, saved]);
          }
        } catch {}
      }
    }
    toast({ title: "Default role templates added" });
  }

  function openCreateTmpl() {
    setTmplEditing(null);
    setTmplCreating(true);
    setTmplName(""); setTmplDesc(""); setTmplColor("violet");
    setTmplRoles(buildDefaultRoles("none"));
  }

  function openEditTmpl(t: RoleTemplate) {
    setTmplCreating(false);
    setTmplEditing(t);
    setTmplName(t.name); setTmplDesc(t.description); setTmplColor(t.color);
    try {
      const roles = JSON.parse(t.moduleRoles || "{}") as Record<string, ModuleRole>;
      const full: Record<string, ModuleRole> = {};
      APP_MODULES.forEach(m => { full[m.key] = roles[m.key] ?? "none"; });
      setTmplRoles(full);
    } catch {
      setTmplRoles(buildDefaultRoles("none"));
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

  function toggleDrawingDept(dept: string) {
    setDraftDrawingDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  }

  function copyFromUser(email: string) {
    const p = perms[email];
    if (!p) return;
    setDraftAccess(p.hasAccess);
    setDraftRoles(rolesFromPermission(p));
    setDraftProjects((() => { try { return JSON.parse(p.allowedProjects || "[]"); } catch { return []; } })());
    setDraftDrawingDepts((() => { try { return JSON.parse(p.allowedDrawingDepts || "[]"); } catch { return []; } })());
    setDraftHodDept(p.hodDept ?? null);
    setDraftTwoFa(p.twoFaEnabled ?? false);
    setDraftTheme(p.theme ?? "system");
    setDraftNavbarStyle(p.navbarStyle ?? "full");
    setCopyFromOpen(false);
    setCopyFromSearch("");
    toast({ title: `Copied settings from ${p.fullName || email}` });
  }

  async function toggleErpEnabled(u: ErpUser) {
    const newEnabled = u.enabled === 0 ? 1 : 0;
    setTogglingEnabled(true);
    try {
      const res = await fetch(`${BASE}/api/erpnext-users/${encodeURIComponent(u.email)}/enabled`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled === 1 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.map(x => x.email === u.email ? { ...x, enabled: newEnabled } : x));
      if (selected?.email === u.email) setSelected(prev => prev ? { ...prev, enabled: newEnabled } : prev);
      toast({ title: newEnabled === 1 ? `${u.full_name} enabled in ERPNext` : `${u.full_name} disabled in ERPNext` });
    } catch (e) {
      toast({ title: "Failed to update ERPNext user", description: String(e), variant: "destructive" });
    } finally {
      setTogglingEnabled(false);
    }
  }

  const filtered = users.filter(u => {
    if (hideDisabled && u.enabled === 0) return false;
    return (
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  });

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

  const writeCount = Object.values(draftRoles).filter(r => r === "write").length;
  const readCount  = Object.values(draftRoles).filter(r => r === "read").length;
  const noneCount  = Object.values(draftRoles).filter(r => r === "none").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <h1 className="text-sm font-bold text-card-foreground">User Management</h1>
          <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">Control module access & roles per user</span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setView("users")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              view === "users" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          <button
            onClick={() => setView("templates")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              view === "templates" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Role Templates
            {templates.length > 0 && (
              <span className="ml-0.5 text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{templates.length}</span>
            )}
          </button>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Templates view ──────────────────────────────────────────────── */}
        {view === "templates" && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="w-80 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">Role Templates</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-1.5">
                  {templates.length === 0 && (
                    <button onClick={seedDefaultTemplates}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Wand2 className="w-3 h-3" /> Seed defaults
                    </button>
                  )}
                  <button onClick={openCreateTmpl}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                    <Tag className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No role templates yet</p>
                    <p className="text-xs text-muted-foreground/60">Create templates to quickly assign permissions to users.</p>
                    <button onClick={seedDefaultTemplates}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Wand2 className="w-3.5 h-3.5" /> Seed default templates
                    </button>
                  </div>
                ) : templates.map(t => {
                  const c = getTemplateColor(t.color);
                  const isEditing = tmplEditing?.id === t.id;
                  return (
                    <button key={t.id} onClick={() => openEditTmpl(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 text-left transition-colors ${isEditing ? "bg-accent" : "hover:bg-muted/50"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{t.name}</p>
                        {t.description && <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template editor */}
            {(tmplCreating || tmplEditing) ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{tmplCreating ? "New Role Template" : `Edit: ${tmplEditing?.name}`}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Configure module permissions for this template</p>
                  </div>
                  {tmplEditing && (
                    <button onClick={() => deleteTmpl(tmplEditing.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                  <button onClick={() => { setTmplEditing(null); setTmplCreating(false); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
                      <input value={tmplName} onChange={e => setTmplName(e.target.value)}
                        placeholder="e.g. Site Engineer"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Color</label>
                      <div className="flex flex-wrap gap-1.5">
                        {TEMPLATE_COLORS.map(c => (
                          <button key={c.value} onClick={() => setTmplColor(c.value)}
                            className={`w-6 h-6 rounded-full ${c.dot} transition-transform ${tmplColor === c.value ? "scale-125 ring-2 ring-offset-1 ring-current" : "hover:scale-110"}`}
                            title={c.label} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                    <input value={tmplDesc} onChange={e => setTmplDesc(e.target.value)}
                      placeholder="Brief description of this role"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module Permissions</label>
                      <div className="flex gap-1.5">
                        <button onClick={() => setTmplRoles(buildDefaultRoles("write"))}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200">All Write</button>
                        <button onClick={() => setTmplRoles(buildDefaultRoles("read"))}
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200">All Read</button>
                        <button onClick={() => setTmplRoles(buildDefaultRoles("none"))}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors border border-border">All None</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {MODULE_GROUPS.map(group => (
                        <div key={group}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{group}</p>
                          <div className="space-y-1">
                            {APP_MODULES.filter(m => m.group === group).map(mod => {
                              const role = tmplRoles[mod.key] ?? "none";
                              return (
                                <div key={mod.key} className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                                  role === "write" ? "bg-emerald-50 border-emerald-200" : role === "read" ? "bg-blue-50 border-blue-200" : "bg-card border-border"
                                }`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${role === "write" ? "bg-emerald-500" : role === "read" ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                                  <span className={`text-xs font-medium flex-1 ${role === "write" ? "text-emerald-800" : role === "read" ? "text-blue-800" : "text-muted-foreground"}`}>{mod.label}</span>
                                  <RolePicker role={role} onChange={r => setTmplRoles(prev => ({ ...prev, [mod.key]: r }))} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border bg-card flex justify-end gap-2">
                  <button onClick={() => { setTmplEditing(null); setTmplCreating(false); }}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveTmpl} disabled={tmplSaving || !tmplName.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60">
                    {tmplSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {tmplCreating ? "Create Template" : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Edit2 className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  <p className="text-sm font-medium">Select a template to edit</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users view ──────────────────────────────────────────────────── */}
        {view === "users" && (<>
          {/* User list */}
          <div className="w-72 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <button
                onClick={() => setHideDisabled(p => !p)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${hideDisabled ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
              >
                {hideDisabled ? "Showing active users only" : "Showing all users"}
                <span className="opacity-50">· {hideDisabled ? "show disabled" : "hide disabled"}</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.map(u => {
                const summary = getAccessSummary(u.email);
                const isBlocked = summary === "blocked";
                const isNoAccess = summary === "no-access";
                const isSel = selected?.email === u.email;
                return (
                  <button key={u.email} onClick={() => selectUser(u)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 text-left transition-colors ${
                      isSel ? "bg-accent border-primary/10" : "hover:bg-muted/50"
                    } ${u.enabled === 0 ? "opacity-60" : ""}`}
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-semibold truncate ${isSel ? "text-primary" : "text-foreground"}`}>
                          {u.full_name}
                        </p>
                        {u.enabled === 0 && (
                          <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1 py-0.5 rounded shrink-0">OFF</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      {(() => {
                        const roleType = perms[u.email]?.roleType;
                        if (roleType) {
                          const tmpl = templates.find(t => t.name === roleType);
                          const c = getTemplateColor(tmpl?.color ?? "violet");
                          return (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                              {roleType}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {perms[u.email]?.hodDept && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          HOD · {perms[u.email]!.hodDept}
                        </span>
                      )}
                      {!summary ? (
                        <span className="text-[9px] text-muted-foreground/40">Default</span>
                      ) : isBlocked ? (
                        <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Blocked</span>
                      ) : isNoAccess ? (
                        <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">No access</span>
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
                      <ChevronRight className={`w-3 h-3 ${isSel ? "text-primary/60" : "text-muted-foreground/30"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">{users.length} users from ERPNext</p>
            </div>
          </div>

          {/* ── Right: Wizard ─────────────────────────────────────────────── */}
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
              <Users className="w-12 h-12 opacity-10" />
              <p className="text-sm font-semibold">Select a user to configure permissions</p>
              <p className="text-xs opacity-50">Users are loaded from ERPNext</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">

              {/* User banner */}
              <div className="bg-card border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
                <UserAvatar user={selected} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-card-foreground">{selected.full_name}</h2>
                    {selected.enabled === 0 && (
                      <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200">ERPNext disabled</span>
                    )}
                    {draftRoleType && (() => {
                      const tmpl = templates.find(t => t.name === draftRoleType);
                      const c = getTemplateColor(tmpl?.color ?? "violet");
                      return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{draftRoleType}</span>;
                    })()}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{selected.email}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold shrink-0">
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">
                    <Pencil className="w-3 h-3" /> {writeCount}W
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">
                    <Eye className="w-3 h-3" /> {readCount}R
                  </span>
                  <span className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-lg border border-border">
                    <Ban className="w-3 h-3" /> {noneCount}
                  </span>
                </div>
              </div>

              {/* Wizard step progress */}
              <div className="bg-card border-b border-border px-6 py-3 shrink-0">
                <div className="flex items-center gap-0">
                  {WIZARD_STEPS.map((step, idx) => {
                    const isActive = wizardStep === step.id;
                    const isDone = wizardStep > step.id;
                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <button
                          onClick={() => setWizardStep(step.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all w-full ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isDone
                              ? "text-emerald-700 hover:bg-emerald-50"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {isDone ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                              isActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              {step.id}
                            </span>
                          )}
                          <span className="truncate hidden sm:block">{step.label}</span>
                        </button>
                        {idx < WIZARD_STEPS.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mx-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto">

                {/* ── Step 1: Role & Access ─────────────────────────────── */}
                {wizardStep === 1 && (
                  <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Role & Access</h3>
                      <p className="text-sm text-muted-foreground">Choose a role template and set this user's access level.</p>
                    </div>

                    {/* App Access */}
                    <div className={`rounded-2xl border-2 p-5 transition-all ${
                      draftAccess ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {draftAccess
                            ? <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Unlock className="w-5 h-5 text-emerald-600" /></div>
                            : <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Lock className="w-5 h-5 text-red-600" /></div>
                          }
                          <div>
                            <p className={`text-sm font-bold ${draftAccess ? "text-emerald-800" : "text-red-800"}`}>
                              {draftAccess ? "Access Granted" : "Access Blocked"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {draftAccess ? "User can log in to FlowMatrix" : "User is blocked from FlowMatrix entirely"}
                            </p>
                          </div>
                        </div>
                        <Toggle on={draftAccess} onChange={setDraftAccess} />
                      </div>
                    </div>

                    {/* Role Templates */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-foreground">Apply Role Template</p>
                        {draftRoleType && (
                          <button onClick={() => setDraftRoleType(null)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>
                      {templates.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-6 text-center">
                          <p className="text-sm text-muted-foreground mb-3">No role templates configured yet</p>
                          <button onClick={() => setView("templates")}
                            className="text-xs text-primary hover:underline font-semibold">
                            Go to Role Templates to create some →
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {templates.map(t => {
                            const c = getTemplateColor(t.color);
                            const isActive = draftRoleType === t.name;
                            return (
                              <button key={t.id} onClick={() => applyTemplate(t)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                                  isActive
                                    ? `${c.bg} ${c.border} shadow-sm`
                                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
                                }`}>
                                <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${isActive ? c.text : "text-foreground"}`}>{t.name}</p>
                                  {t.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.description}</p>}
                                </div>
                                {isActive && <Check className={`w-4 h-4 shrink-0 ${c.text}`} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Copy from user + ERPNext toggle */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <button onClick={() => { setCopyFromOpen(o => !o); setCopyFromSearch(""); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors">
                          <Copy className="w-4 h-4 text-violet-500" />
                          Copy from user…
                        </button>
                        {copyFromOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setCopyFromOpen(false)} />
                            <div className="absolute left-0 top-full mt-2 w-72 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                              <div className="p-2 border-b border-border">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input autoFocus value={copyFromSearch} onChange={e => setCopyFromSearch(e.target.value)}
                                    placeholder="Search users…"
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
                                </div>
                              </div>
                              <div className="max-h-56 overflow-y-auto">
                                {users.filter(u => u.email !== selected?.email && perms[u.email] && (
                                  u.full_name.toLowerCase().includes(copyFromSearch.toLowerCase()) ||
                                  u.email.toLowerCase().includes(copyFromSearch.toLowerCase())
                                )).map(u => (
                                  <button key={u.email} onClick={() => copyFromUser(u.email)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors">
                                    <UserAvatar user={u} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate text-foreground">{u.full_name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => toggleErpEnabled(selected)}
                        disabled={togglingEnabled}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60 ${
                          selected.enabled === 0
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {togglingEnabled ? <Loader2 className="w-4 h-4 animate-spin" /> : selected.enabled === 0 ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {selected.enabled === 0 ? "Enable in ERPNext" : "Disable in ERPNext"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Module Permissions ────────────────────────── */}
                {wizardStep === 2 && (
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold text-foreground mb-1">Module Permissions</h3>
                        <p className="text-sm text-muted-foreground">Fine-tune access for each module.</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDraftRoles(buildDefaultRoles("write"))}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200">
                          <Pencil className="w-2.5 h-2.5" /> All Write
                        </button>
                        <button onClick={() => setDraftRoles(buildDefaultRoles("read"))}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200">
                          <Eye className="w-2.5 h-2.5" /> All Read
                        </button>
                        <button onClick={() => setDraftRoles(buildDefaultRoles("none"))}
                          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border">
                          <Ban className="w-2.5 h-2.5" /> All None
                        </button>
                      </div>
                    </div>

                    {!draftAccess && (
                      <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
                        <ShieldOff className="w-4 h-4 shrink-0" />
                        This user is blocked — module permissions won't apply until access is granted.
                      </div>
                    )}

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
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">{group}</p>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setGroupRole(group, "write")}
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${groupSummary === "write" ? "bg-emerald-100 text-emerald-700" : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"}`}>W</button>
                                <button onClick={() => setGroupRole(group, "read")}
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${groupSummary === "read" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"}`}>R</button>
                                <button onClick={() => setGroupRole(group, "none")}
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${groupSummary === "none" ? "bg-muted text-foreground/70" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>—</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {groupMods.map(mod => {
                                const role = draftRoles[mod.key] ?? "none";
                                return (
                                  <div key={mod.key} className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                                    role === "write" ? "bg-emerald-50 border-emerald-200" : role === "read" ? "bg-blue-50 border-blue-200" : "bg-card border-border"
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${role === "write" ? "bg-emerald-500" : role === "read" ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                                    <span className={`text-xs font-medium flex-1 ${role === "write" ? "text-emerald-800" : role === "read" ? "text-blue-800" : "text-muted-foreground"}`}>{mod.label}</span>
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
                )}

                {/* ── Step 3: Projects & Drawings ───────────────────────── */}
                {wizardStep === 3 && (
                  <div className="max-w-4xl mx-auto px-6 py-8">
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-foreground mb-1">Projects & Drawings</h3>
                      <p className="text-sm text-muted-foreground">Restrict which projects and drawing categories this user can access.</p>
                    </div>

                    {/* Team HOD */}
                    <div className={`mb-6 rounded-2xl border-2 p-5 transition-all ${draftHodDept ? "border-emerald-200 bg-emerald-50/40" : "border-border bg-card"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${draftHodDept ? "bg-emerald-100" : "bg-muted"}`}>
                          <Users className={`w-4.5 h-4.5 ${draftHodDept ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${draftHodDept ? "text-emerald-800" : "text-foreground"}`}>Team HOD (Head of Department)</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Assign this user as HOD for a team — grants department-level visibility in HRMS.</p>
                        </div>
                        {draftHodDept && (
                          <button onClick={() => setDraftHodDept(null)}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {departments.map(dept => {
                          const active = draftHodDept === dept;
                          return (
                            <button key={dept} onClick={() => setDraftHodDept(active ? null : dept)}
                              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                                active
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                  : "bg-card border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
                              }`}>
                              {dept}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Project access */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-violet-500" />
                          <p className="text-sm font-bold text-foreground">Project Access</p>
                          {draftProjects.length > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                              {draftProjects.length} selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3">If none are selected, user can see all projects.</p>
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <input value={projSearch} onChange={e => setProjSearch(e.target.value)}
                            placeholder="Search projects…"
                            className="w-full pl-7 pr-3 py-2 text-[11px] rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                          {filteredProjects.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-4">No projects found</p>
                          ) : filteredProjects.map(p => {
                            const name = p.name;
                            const on = draftProjects.includes(name) || draftProjects.includes(p.erpnextName || "");
                            return (
                              <button key={name} onClick={() => toggleProject(name)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                  on ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-card border-border text-muted-foreground hover:border-border/60"
                                }`}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                                  {on && <span className="w-2 h-2 bg-white rounded-sm" />}
                                </div>
                                <span className="text-xs font-medium truncate flex-1">{p.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Drawing categories */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FolderOpen className="w-4 h-4 text-orange-500" />
                          <p className="text-sm font-bold text-foreground">Drawing Categories</p>
                          {draftDrawingDepts.length > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {draftDrawingDepts.length} selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-3">If none are selected, user cannot view any drawings.</p>
                        <div className="space-y-2">
                          {departments.map(dept => {
                            const on = draftDrawingDepts.includes(dept);
                            return (
                              <button key={dept} onClick={() => toggleDrawingDept(dept)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                  on ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-card border-border text-muted-foreground hover:border-orange-200/50"
                                }`}>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${on ? "bg-orange-500 border-orange-500" : "border-border"}`}>
                                  {on && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm font-medium flex-1">{dept}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Preferences ───────────────────────────────── */}
                {wizardStep === 4 && (
                  <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Preferences</h3>
                      <p className="text-sm text-muted-foreground">Set UI preferences and security options for this user.</p>
                    </div>

                    {/* 2FA */}
                    <div className={`rounded-2xl border-2 p-5 transition-all ${draftTwoFa ? "border-amber-200 bg-amber-50/50" : "border-border bg-card"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draftTwoFa ? "bg-amber-100" : "bg-muted"}`}>
                            <KeyRound className={`w-5 h-5 ${draftTwoFa ? "text-amber-600" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${draftTwoFa ? "text-amber-800" : "text-foreground"}`}>Two-Factor Authentication</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{draftTwoFa ? "OTP required at every login" : "No OTP required"}</p>
                          </div>
                        </div>
                        <Toggle on={draftTwoFa} onChange={setDraftTwoFa} />
                      </div>
                    </div>

                    {/* Theme */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <SunMedium className="w-4 h-4 text-orange-400" />
                        <p className="text-sm font-bold text-foreground">Theme</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { value: "light", label: "Light", icon: <SunMedium className="w-5 h-5" />, active: "bg-orange-50 border-orange-300 text-orange-700" },
                          { value: "dark",  label: "Dark",  icon: <Moon className="w-5 h-5" />,      active: "bg-zinc-800 border-zinc-600 text-zinc-100" },
                          { value: "system",label: "System",icon: <Monitor className="w-5 h-5" />,   active: "bg-primary/10 border-primary/30 text-primary" },
                        ] as { value: ThemeOption; label: string; icon: React.ReactNode; active: string }[]).map(opt => (
                          <button key={opt.value} onClick={() => setDraftTheme(opt.value)}
                            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all ${
                              draftTheme === opt.value ? `${opt.active} shadow-sm` : "bg-card border-border text-muted-foreground hover:border-border/60 hover:bg-muted/50"
                            }`}>
                            {opt.icon}
                            <span className="text-sm font-semibold">{opt.label}</span>
                            {draftTheme === opt.value && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Navbar Style */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <LayoutDashboard className="w-4 h-4 text-teal-500" />
                        <p className="text-sm font-bold text-foreground">Sidebar Style</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { value: "full",     label: "Full Sidebar",  desc: "Expanded with labels",       icon: <Layers className="w-5 h-5" />,       active: "bg-teal-50 border-teal-300 text-teal-700" },
                          { value: "mini",     label: "Mini Sidebar",  desc: "Icons only, compact",        icon: <PanelLeftClose className="w-5 h-5" />,active: "bg-teal-50 border-teal-300 text-teal-700" },
                          { value: "auto",     label: "Auto",          desc: "Collapses on small screens", icon: <Monitor className="w-5 h-5" />,       active: "bg-teal-50 border-teal-300 text-teal-700" },
                          { value: "launcher", label: "Launcher",      desc: "App icon grid, no sidebar",  icon: <LayoutGrid className="w-5 h-5" />,    active: "bg-violet-50 border-violet-300 text-violet-700" },
                        ] as { value: NavbarStyleOption; label: string; desc: string; icon: React.ReactNode; active: string }[]).map(opt => (
                          <button key={opt.value} onClick={() => setDraftNavbarStyle(opt.value)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                              draftNavbarStyle === opt.value ? `${opt.active} shadow-sm` : "bg-card border-border text-muted-foreground hover:border-border/60 hover:bg-muted/50"
                            }`}>
                            {opt.icon}
                            <div>
                              <p className="text-sm font-semibold">{opt.label}</p>
                              <p className="text-[11px] opacity-60">{opt.desc}</p>
                            </div>
                            {draftNavbarStyle === opt.value && <Check className="w-4 h-4 ml-auto shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard footer navigation */}
              <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  {wizardStep > 1 ? (
                    <button onClick={() => setWizardStep(s => s - 1)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {WIZARD_STEPS.map(s => (
                    <button key={s.id} onClick={() => setWizardStep(s.id)}
                      className={`w-2 h-2 rounded-full transition-all ${wizardStep === s.id ? "bg-primary w-5" : wizardStep > s.id ? "bg-emerald-400" : "bg-muted-foreground/20"}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {wizardStep < WIZARD_STEPS.length ? (
                    <button onClick={() => setWizardStep(s => s + 1)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-sm transition-colors">
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={save} disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Permissions
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>)}
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
