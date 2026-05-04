import { Layout } from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle, AlertCircle, ArrowLeft, RefreshCw, Loader2, Search,
  Filter, X, Calendar, User, Building2, ExternalLink, CheckCircle2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

type Stage = "kickoff" | "design" | "purchase" | "workshop" | "shipment" | "commissioning";
type Status = "pending" | "in_progress" | "completed" | "delayed" | "blocked";

interface Milestone {
  id: number;
  project: string;
  stage: Stage;
  department: string;
  title: string;
  description: string;
  status: Status;
  planned_date: string | null;
  actual_date: string | null;
  owner: string;
  challenges: string;
  sort_order: number;
  updated_at: string;
}

interface Stats {
  total: number;
  projects: number;
  delayed: number;
  blocked: number;
  challenges: number;
  completed: number;
  in_progress: number;
  pending: number;
}

interface ProjectOption { name: string; project_name: string }

const STAGE_LABEL: Record<Stage, string> = {
  kickoff: "Kickoff", design: "Design", purchase: "Purchase",
  workshop: "Workshop", shipment: "Shipment", commissioning: "Commissioning",
};

const STATUS_META: Record<Status, { label: string; pill: string }> = {
  pending:     { label: "Pending",     pill: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In progress", pill: "bg-blue-100 text-blue-700" },
  completed:   { label: "Completed",   pill: "bg-emerald-100 text-emerald-700" },
  delayed:     { label: "Delayed",     pill: "bg-red-100 text-red-700" },
  blocked:     { label: "Blocked",     pill: "bg-purple-100 text-purple-700" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function delayInfo(m: Milestone) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const planned = m.planned_date ? new Date(m.planned_date) : null;
  const actual  = m.actual_date  ? new Date(m.actual_date)  : null;
  if (m.status === "completed" && planned && actual) {
    const days = Math.max(0, Math.floor((actual.getTime() - planned.getTime()) / 86400000));
    return { isDelayed: days > 0, daysLate: days, kind: "late_finish" as const };
  }
  if (planned && !actual && planned < today && m.status !== "completed") {
    const days = Math.floor((today.getTime() - planned.getTime()) / 86400000);
    return { isDelayed: true, daysLate: days, kind: "overdue" as const };
  }
  if (m.status === "delayed") {
    return { isDelayed: true, daysLate: 0, kind: "marked" as const };
  }
  return { isDelayed: false, daysLate: 0, kind: "ontrack" as const };
}

export default function ProjectInsights() {
  const [, navigate] = useLocation();
  const initialQS = new URLSearchParams(window.location.search);

  const [tab, setTab] = useState<"delays" | "challenges">(
    (initialQS.get("tab") as any) === "challenges" ? "challenges" : "delays",
  );
  const [project, setProject] = useState<string>(initialQS.get("project") || "");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [items, setItems] = useState<Milestone[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage | "">("");
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"all" | "critical" | "high" | "watch">("all");

  // Load projects (for picker + display name resolution)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const list: ProjectOption[] = Array.isArray(data)
          ? data.map((p: any) => ({
              name: p.erpnextName ?? p.name,
              project_name: p.project_name ?? p.name,
            }))
          : [];
        setProjects(list);
      } catch {/* ignore */}
    })();
  }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (project) qs.set("project", project);
      const res = await fetch(`${API}/meeting-discussions/insights?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data?.milestones) ? data.milestones : []);
      setStats(data?.stats || null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setItems([]); setStats(null);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => { load(); }, [load]);

  const projectName = (code: string) =>
    projects.find((p) => p.name === code)?.project_name || code;

  // Build option lists from current data
  const departments = useMemo(() => {
    const s = new Set<string>();
    items.forEach((m) => m.department && s.add(m.department));
    return Array.from(s).sort();
  }, [items]);
  const owners = useMemo(() => {
    const s = new Set<string>();
    items.forEach((m) => m.owner && s.add(m.owner));
    return Array.from(s).sort();
  }, [items]);

  // Tab base filter
  const tabFiltered = useMemo(() => {
    if (tab === "delays") {
      return items
        .map((m) => ({ m, info: delayInfo(m) }))
        .filter((x) => x.info.isDelayed);
    }
    return items
      .filter((m) => (m.challenges || "").trim().length > 0)
      .map((m) => ({ m, info: delayInfo(m) }));
  }, [items, tab]);

  const rows = useMemo(() => {
    let list = tabFiltered;
    if (stage)      list = list.filter((x) => x.m.stage === stage);
    if (department) list = list.filter((x) => x.m.department === department);
    if (owner)      list = list.filter((x) => x.m.owner === owner);
    if (status)     list = list.filter((x) => x.m.status === status);
    if (severity !== "all" && tab === "delays") {
      list = list.filter((x) => {
        const d = x.info.daysLate;
        if (severity === "critical") return d >= 30;
        if (severity === "high")     return d >= 14 && d < 30;
        return d >= 1 && d < 14;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) =>
        x.m.title.toLowerCase().includes(q) ||
        (x.m.challenges || "").toLowerCase().includes(q) ||
        (x.m.owner || "").toLowerCase().includes(q) ||
        (x.m.department || "").toLowerCase().includes(q) ||
        projectName(x.m.project).toLowerCase().includes(q) ||
        x.m.project.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (a.info.daysLate !== b.info.daysLate) return b.info.daysLate - a.info.daysLate;
      return a.m.project.localeCompare(b.m.project);
    });
  }, [tabFiltered, stage, department, owner, status, severity, search, tab, projects]);

  const clear = () => {
    setStage(""); setDepartment(""); setOwner(""); setStatus("");
    setSearch(""); setSeverity("all");
  };

  const activeFilters =
    (stage ? 1 : 0) + (department ? 1 : 0) + (owner ? 1 : 0) +
    (status ? 1 : 0) + (severity !== "all" ? 1 : 0) + (search ? 1 : 0);

  const headerColor = tab === "delays"
    ? "from-red-500 to-rose-600"
    : "from-amber-500 to-orange-600";
  const HeaderIcon = tab === "delays" ? AlertTriangle : AlertCircle;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/meeting-discussion")}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
              title="Back to Meeting Discussion"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${headerColor} flex items-center justify-center shadow-sm`}>
              <HeaderIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Project Insights</h1>
              <p className="text-xs text-gray-500">
                Cross-project view of delayed milestones and raised challenges
                {project && (<> · <span className="font-semibold text-gray-700">{projectName(project)}</span></>)}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          <TabButton active={tab === "delays"} onClick={() => setTab("delays")}
            color="red" icon={<AlertTriangle className="w-4 h-4" />}
            label="Delay Spotlight"
            count={items.filter((m) => delayInfo(m).isDelayed).length}
          />
          <TabButton active={tab === "challenges"} onClick={() => setTab("challenges")}
            color="amber" icon={<AlertCircle className="w-4 h-4" />}
            label="Challenges & Notes"
            count={items.filter((m) => (m.challenges || "").trim().length > 0).length}
          />
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <StatTile label="Projects"    value={stats.projects}    tone="gray" />
            <StatTile label="Milestones"  value={stats.total}       tone="gray" />
            <StatTile label="Delayed"     value={stats.delayed}     tone="red"
              onClick={() => { setTab("delays"); clear(); }} />
            <StatTile label="Blocked"     value={stats.blocked}     tone="purple"
              onClick={() => { setTab("delays"); clear(); setStatus("blocked"); }} />
            <StatTile label="Challenges raised" value={stats.challenges} tone="amber"
              onClick={() => { setTab("challenges"); clear(); }} />
            <StatTile label="In progress" value={stats.in_progress} tone="blue" />
            <StatTile label="Completed"   value={stats.completed}   tone="emerald" />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilters > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                  {activeFilters}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, owner, project, challenge…"
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {activeFilters > 0 && (
              <button
                onClick={clear}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1 text-gray-600"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <Select label="Project" value={project} onChange={setProject}
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.name, label: `${p.project_name} (${p.name})` }))]}
            />
            <Select label="Stage" value={stage} onChange={(v) => setStage(v as any)}
              options={[
                { value: "", label: "All stages" },
                ...(Object.keys(STAGE_LABEL) as Stage[]).map((s) => ({ value: s, label: STAGE_LABEL[s] })),
              ]}
            />
            <Select label="Department" value={department} onChange={setDepartment}
              options={[{ value: "", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]}
            />
            <Select label="Owner" value={owner} onChange={setOwner}
              options={[{ value: "", label: "All owners" }, ...owners.map((o) => ({ value: o, label: o }))]}
            />
            <Select label="Status" value={status} onChange={(v) => setStatus(v as any)}
              options={[
                { value: "", label: "Any status" },
                ...(Object.keys(STATUS_META) as Status[]).map((s) => ({ value: s, label: STATUS_META[s].label })),
              ]}
            />
            {tab === "delays" ? (
              <Select label="Severity" value={severity} onChange={(v) => setSeverity(v as any)}
                options={[
                  { value: "all",      label: "Any delay" },
                  { value: "critical", label: "Critical (30+ days)" },
                  { value: "high",     label: "High (14–29 days)" },
                  { value: "watch",    label: "Watch (1–13 days)" },
                ]}
              />
            ) : <div />}
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between text-xs">
            <div className="text-gray-600">
              Showing <span className="font-bold text-gray-900">{rows.length}</span>
              {tabFiltered.length > rows.length && (
                <> of <span className="font-semibold">{tabFiltered.length}</span></>
              )} {tab === "delays" ? "delayed milestone" : "challenge"}{rows.length === 1 ? "" : "s"}
            </div>
            {loading && <span className="text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>}
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50">Failed to load: {error}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
              {tab === "delays"
                ? "No delayed milestones match the current filters."
                : "No challenges raised under these filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="text-left px-3 py-2 font-semibold">Project</th>
                    <th className="text-left px-3 py-2 font-semibold">Stage</th>
                    <th className="text-left px-3 py-2 font-semibold">Milestone</th>
                    <th className="text-left px-3 py-2 font-semibold">Owner</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                    <th className="text-left px-3 py-2 font-semibold">Planned</th>
                    <th className="text-right px-3 py-2 font-semibold">Late</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(({ m, info }) => {
                    const sm = STATUS_META[m.status];
                    return (
                      <tr key={m.id} className={tab === "delays" ? "hover:bg-red-50/30" : "hover:bg-amber-50/30"}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={projectName(m.project)}>
                            {projectName(m.project)}
                          </div>
                          <div className="text-[10px] text-gray-400">{m.project}</div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {STAGE_LABEL[m.stage]}
                          {m.department && <div className="text-[10px] text-gray-400">{m.department}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-gray-900 max-w-[260px]">{m.title}</div>
                          {m.challenges && (
                            <div className="text-[11px] text-gray-600 italic mt-0.5 line-clamp-2 max-w-[260px]">
                              "{m.challenges}"
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 truncate max-w-[160px]">
                          {m.owner ? (
                            <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> {m.owner}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sm.pill}`}>
                            {sm.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                          <Calendar className="inline w-3 h-3 text-gray-400 mr-1" />
                          {fmtDate(m.planned_date)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {info.isDelayed && info.daysLate > 0 ? (
                            <span className={`font-bold ${info.daysLate >= 30 ? "text-red-600" : info.daysLate >= 14 ? "text-orange-600" : "text-amber-600"}`}>
                              {info.daysLate}d
                            </span>
                          ) : info.isDelayed ? (
                            <span className="text-red-600 font-bold">!</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => navigate(`/meeting-discussion`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                            title="Open in Meeting Discussion"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TabButton({
  active, onClick, color, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  color: "red" | "amber";
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  const tones = {
    red:   { active: "border-red-500 text-red-700",     pill: "bg-red-100 text-red-700"     },
    amber: { active: "border-amber-500 text-amber-700", pill: "bg-amber-100 text-amber-700" },
  } as const;
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 transition ${
        active ? tones[color].active : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon} {label}
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? tones[color].pill : "bg-gray-100 text-gray-600"}`}>
        {count}
      </span>
    </button>
  );
}

function StatTile({
  label, value, tone, onClick,
}: {
  label: string;
  value: number | string;
  tone: "gray" | "red" | "amber" | "blue" | "purple" | "emerald";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    gray:    "bg-gray-50 border-gray-200 text-gray-900",
    red:     "bg-red-50 border-red-200 text-red-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    purple:  "bg-purple-50 border-purple-200 text-purple-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${tones[tone]} ${onClick ? "hover:shadow-sm hover:-translate-y-0.5" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
    </Tag>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
