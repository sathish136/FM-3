import { Layout } from "@/components/Layout";
import {
  CheckCircle2,
  Download,
  Search,
  Filter,
  FolderOpen,
  Users,
  Building2,
  HardHat,
  Wrench,
  Eye,
  Share2,
  RefreshCw,
  FileText,
  Calendar,
  Tag,
  Loader2,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ApprovedDrawing {
  id: string;
  drawingNo: string;
  title: string;
  project: string;
  department: string;
  drawingType: string;
  systemName: string;
  uploadedAt: string;
  revisionLabel: string;
  fileName: string;
  uploadedBy: string;
  reviewerEmail: string | null;
  uploaderEmail: string | null;
  workflowStatus: string;
  assignedTeams: string[];
}

const TEAMS = [
  { key: "workshop", label: "Workshop Team", icon: Wrench, color: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "site", label: "Site Engineers", icon: HardHat, color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "production", label: "Production Team", icon: Building2, color: "bg-blue-100 text-blue-800 border-blue-300" },
];

function TeamBadge({ team }: { team: string }) {
  const t = TEAMS.find(t => t.key === team);
  if (!t) return null;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${t.color}`}>
      <Icon className="w-3 h-3" /> {t.label}
    </span>
  );
}

function AssignTeamDropdown({
  drawingId,
  current,
  onSaved,
}: {
  drawingId: string;
  current: string[];
  onSaved: (teams: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(current);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/project-drawings/${drawingId}/assign-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: selected }),
      });
      if (res.ok) {
        onSaved(selected);
        setOpen(false);
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Users className="w-3.5 h-3.5" /> Assign Teams <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-56 p-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Grant Access To</p>
          <div className="space-y-1.5 mb-3">
            {TEAMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selected.includes(key) ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {selected.includes(key) && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Access
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApprovedDrawings() {
  const { user } = useAuth();
  const [drawings, setDrawings] = useState<ApprovedDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/project-drawings`);
      if (!res.ok) throw new Error("Failed to load");
      const all: ApprovedDrawing[] = await res.json();
      setDrawings(all.filter(d => d.workflowStatus === "hod_approved"));
    } catch {
      showToast("Failed to load approved drawings", "error");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const projects = Array.from(new Set(drawings.map(d => d.project).filter(Boolean)));
  const departments = Array.from(new Set(drawings.map(d => d.department).filter(Boolean)));

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch = !q || d.drawingNo.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.project.toLowerCase().includes(q);
    const matchesProject = filterProject === "all" || d.project === filterProject;
    const matchesDept = filterDept === "all" || d.department === filterDept;
    const matchesTeam = filterTeam === "all" || (d.assignedTeams || []).includes(filterTeam);
    return matchesSearch && matchesProject && matchesDept && matchesTeam;
  });

  const handleDownload = async (drawing: ApprovedDrawing) => {
    try {
      const res = await fetch(`${BASE}/api/project-drawings/${drawing.id}/file`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = drawing.fileName || `${drawing.drawingNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to download drawing", "error");
    }
  };

  const handleTeamSaved = (drawingId: string, teams: string[]) => {
    setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, assignedTeams: teams } : d));
    showToast("Team access updated");
  };

  return (
    <Layout currentPage="approved-drawings">
      <div className="flex flex-col h-full bg-gray-50">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Approved Drawings</h1>
                <p className="text-xs text-gray-500">{filtered.length} of {drawings.length} HOD-approved drawings</p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search drawing no, title, project..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
              />
            </div>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white">
              <option value="all">All Teams</option>
              {TEAMS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">No approved drawings found</p>
              <p className="text-xs text-gray-400">Drawings appear here once the Design HOD approves them</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map(drawing => (
                <div key={drawing.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900">{drawing.drawingNo}</h3>
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{drawing.revisionLabel || "Draft"}</span>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">HOD Approved</span>
                          </div>
                          {drawing.title && <p className="text-sm text-gray-700 mt-0.5">{drawing.title}</p>}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(drawing)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                          <AssignTeamDropdown
                            drawingId={drawing.id}
                            current={drawing.assignedTeams || []}
                            onSaved={teams => handleTeamSaved(drawing.id, teams)}
                          />
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                        {drawing.project && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> {drawing.project}
                          </span>
                        )}
                        {drawing.department && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {drawing.department}
                          </span>
                        )}
                        {drawing.drawingType && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {drawing.drawingType}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {drawing.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(drawing.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>

                      {/* Assigned Teams */}
                      {(drawing.assignedTeams || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className="text-[11px] text-gray-400 font-medium self-center">Access:</span>
                          {(drawing.assignedTeams || []).map(team => (
                            <TeamBadge key={team} team={team} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
