import { useState } from "react";
import {
  useListProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  ProjectStatus,
  ProjectPriority,
  Project
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/utils";
import {
  Plus, Calendar, CheckCircle2, Circle, Clock,
  Trash2, Edit2, Briefcase, AlertCircle,
  ChevronDown, ChevronRight, LayoutGrid, List,
  TrendingUp, Layers
} from "lucide-react";

const STATUS_ORDER = ["active", "planning", "on_hold", "completed"];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":    return { badge: "bg-blue-50 text-blue-700 border border-blue-200",    icon: Circle,       bar: "bg-blue-500",   label: "Active",    dot: "bg-blue-500",    section: "border-blue-200 bg-blue-50/30" };
    case "completed": return { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2, bar: "bg-emerald-500", label: "Completed", dot: "bg-emerald-500", section: "border-emerald-200 bg-emerald-50/30" };
    case "on_hold":   return { badge: "bg-amber-50 text-amber-700 border border-amber-200", icon: Clock,        bar: "bg-amber-400",  label: "On Hold",   dot: "bg-amber-400",   section: "border-amber-200 bg-amber-50/30" };
    case "planning":  return { badge: "bg-violet-50 text-violet-700 border border-violet-200", icon: AlertCircle, bar: "bg-violet-500", label: "Planning",  dot: "bg-violet-500",  section: "border-violet-200 bg-violet-50/30" };
    default:          return { badge: "bg-gray-100 text-gray-600 border border-gray-200",   icon: Circle,       bar: "bg-gray-400",   label: status,      dot: "bg-gray-400",    section: "border-gray-200 bg-gray-50/30" };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "high":   return { cls: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" };
    case "medium": return { cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-400" };
    case "low":    return { cls: "bg-gray-50 text-gray-600 border border-gray-200", dot: "bg-gray-400" };
    default:       return { cls: "bg-gray-50 text-gray-500 border border-gray-200", dot: "bg-gray-300" };
  }
};

function ProjectCardGrid({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const cfg = getStatusConfig(project.status);
  const StatusIcon = cfg.icon;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: `var(--tw-${cfg.bar})` }}>
        <div className={`w-full h-full ${cfg.bar}`} />
      </div>
      <div className="pl-2">
        <div className="flex justify-between items-start mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-1">{project.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[32px]">
          {project.description || "No description provided."}
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Progress</span>
              <span className="font-bold text-gray-700">{project.progress}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${cfg.bar} rounded-full transition-all duration-500`} style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(project.dueDate)}
            </div>
            {project.priority && (
              <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${getPriorityConfig(project.priority).cls}`}>
                {project.priority}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRowList({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const cfg = getStatusConfig(project.status);
  const pri = project.priority ? getPriorityConfig(project.priority) : null;
  const StatusIcon = cfg.icon;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-gray-200 hover:-translate-y-px transition-all duration-200 group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{project.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{project.description || "No description"}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
          <StatusIcon className="w-3 h-3" />{cfg.label}
        </span>
      </div>
      {project.priority && pri && (
        <span className={`hidden md:inline-flex text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pri.cls}`}>
          {project.priority}
        </span>
      )}
      <div className="w-32 hidden lg:block flex-shrink-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{project.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 hidden xl:flex flex-shrink-0 w-24">
        <Calendar className="w-3.5 h-3.5" />
        {formatDate(project.dueDate)}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusGroup({
  status, projects, viewMode, onEdit, onDelete, defaultOpen = true
}: {
  status: string;
  projects: Project[];
  viewMode: "grid" | "list";
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = getStatusConfig(status);

  return (
    <div className={`rounded-xl border ${cfg.section} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className="font-semibold text-gray-800 text-sm">{cfg.label}</span>
          <span className="bg-white/80 border border-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {open && projects.length > 0 && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Avg {Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)}% complete
            </span>
          )}
          <div className={`p-1 rounded-lg text-gray-500 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {open && (
        <div className={`px-4 pb-4 ${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-2"}`}>
          {projects.map(project => (
            viewMode === "grid"
              ? <ProjectCardGrid key={project.id} project={project} onEdit={() => onEdit(project)} onDelete={() => onDelete(project.id)} />
              : <ProjectRowList key={project.id} project={project} onEdit={() => onEdit(project)} onDelete={() => onDelete(project.id)} />
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-6 text-center text-gray-400 text-sm">
              No {cfg.label.toLowerCase()} projects.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createProject.mutate({
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as ProjectStatus,
        priority: fd.get("priority") as ProjectPriority,
        dueDate: fd.get("dueDate") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsCreateModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;
    const fd = new FormData(e.currentTarget);
    updateProject.mutate({
      id: editingProject.id,
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as ProjectStatus,
        priority: fd.get("priority") as ProjectPriority,
        progress: parseInt(fd.get("progress") as string),
        dueDate: fd.get("dueDate") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setEditingProject(null);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this project?")) {
      deleteProject.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      });
    }
  };

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = (projects || []).filter(p => p.status === s);
    return acc;
  }, {} as Record<string, Project[]>);

  const stats = [
    { label: "Total", value: projects?.length ?? 0, color: "text-gray-900", bg: "bg-gray-50" },
    { label: "Active", value: projects?.filter(p => p.status === "active").length ?? 0, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Completed", value: projects?.filter(p => p.status === "completed").length ?? 0, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "On Hold", value: projects?.filter(p => p.status === "on_hold").length ?? 0, color: "text-amber-700", bg: "bg-amber-50" },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              Projects
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track your team's ongoing initiatives</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {!isLoading && projects && (
          <div className="grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-3 text-center shadow-sm`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-36 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {STATUS_ORDER.filter(s => grouped[s].length > 0).map((status, idx) => (
              <StatusGroup
                key={status}
                status={status}
                projects={grouped[status]}
                viewMode={viewMode}
                onEdit={setEditingProject}
                onDelete={handleDelete}
                defaultOpen={idx === 0}
              />
            ))}

            {(!projects || projects.length === 0) && (
              <div className="py-16 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs mt-1">Create your first project to get started.</p>
              </div>
            )}
          </div>
        )}

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Project">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="form-label">Project Name</label>
              <input name="name" required className="glass-input" placeholder="e.g. Website Redesign" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea name="description" rows={3} className="glass-input resize-none" placeholder="Brief details about the project..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="glass-input">
                  {Object.values(ProjectStatus).map(s => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Priority</label>
                <select name="priority" className="glass-input">
                  <option value="">None</option>
                  {Object.values(ProjectPriority).map(p => (
                    <option key={p} value={p ?? ""}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" name="dueDate" className="glass-input" />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createProject.isPending} className="btn-primary">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
          {editingProject && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="form-label">Project Name</label>
                <input name="name" defaultValue={editingProject.name} required className="glass-input" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea name="description" defaultValue={editingProject.description || ""} rows={3} className="glass-input resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select name="status" defaultValue={editingProject.status} className="glass-input">
                    {Object.values(ProjectStatus).map(s => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select name="priority" defaultValue={editingProject.priority || ""} className="glass-input">
                    <option value="">None</option>
                    {Object.values(ProjectPriority).map(p => (
                      <option key={p} value={p ?? ""}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Progress (%)</label>
                  <input type="number" min="0" max="100" name="progress" defaultValue={editingProject.progress} required className="glass-input" />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" name="dueDate" defaultValue={editingProject.dueDate ? editingProject.dueDate.split("T")[0] : ""} className="glass-input" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingProject(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateProject.isPending} className="btn-primary">
                  {updateProject.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
