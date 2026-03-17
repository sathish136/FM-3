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
  Trash2, Edit2, Briefcase, AlertCircle
} from "lucide-react";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":    return { badge: "bg-blue-50 text-blue-700 border border-blue-200",    icon: Circle,       bar: "bg-blue-500",   label: "Active" };
    case "completed": return { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2, bar: "bg-emerald-500", label: "Completed" };
    case "on_hold":   return { badge: "bg-amber-50 text-amber-700 border border-amber-200", icon: Clock,        bar: "bg-amber-400",  label: "On Hold" };
    case "planning":  return { badge: "bg-violet-50 text-violet-700 border border-violet-200", icon: AlertCircle, bar: "bg-violet-500", label: "Planning" };
    default:          return { badge: "bg-gray-100 text-gray-600 border border-gray-200",   icon: Circle,       bar: "bg-gray-400",   label: status };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "high":   return "bg-red-50 text-red-700 border border-red-200";
    case "medium": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "low":    return "bg-gray-50 text-gray-600 border border-gray-200";
    default:       return "bg-gray-50 text-gray-500 border border-gray-200";
  }
};

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track your team's ongoing initiatives</p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Summary row */}
        {!isLoading && projects && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: projects.length, color: "text-gray-900" },
              { label: "Active", value: projects.filter(p => p.status === "active").length, color: "text-blue-700" },
              { label: "Completed", value: projects.filter(p => p.status === "completed").length, color: "text-emerald-700" },
              { label: "On Hold", value: projects.filter(p => p.status === "on_hold").length, color: "text-amber-700" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Project Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-white border border-gray-200 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects?.map(project => {
              const cfg = getStatusConfig(project.status);
              const StatusIcon = cfg.icon;
              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.badge}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingProject(project)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
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
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-semibold text-gray-700">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.bar} rounded-full transition-all`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(project.dueDate)}
                      </div>
                      {project.priority && (
                        <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${getPriorityConfig(project.priority)}`}>
                          {project.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {projects?.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-lg border-2 border-dashed border-gray-200">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No projects yet. Create one to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Create Modal */}
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

        {/* Edit Modal */}
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
