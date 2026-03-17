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
import { Plus, MoreVertical, Calendar, CheckCircle2, Circle, Clock, Trash2, Edit2 } from "lucide-react";

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
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Circle };
      case 'completed': return { color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle2 };
      case 'on_hold': return { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock };
      default: return { color: 'text-gray-400 bg-gray-400/10 border-gray-400/20', icon: Circle };
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track your team's ongoing initiatives.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects?.map(project => {
            const StatusIcon = getStatusConfig(project.status).icon;
            return (
              <div key={project.id} className="bg-card border border-border rounded-2xl p-6 hover:border-white/10 transition-all hover:shadow-xl hover:shadow-black/50 group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusConfig(project.status).color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {project.status.replace('_', ' ')}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingProject(project)} className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="p-1.5 text-destructive hover:text-red-400 hover:bg-destructive/10 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-display font-bold text-white mb-2 line-clamp-1">{project.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[40px]">
                  {project.description || "No description provided."}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-white font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(project.dueDate)}
                    </div>
                    {project.priority && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${
                        project.priority === 'high' ? 'bg-destructive/20 text-red-400' :
                        project.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-gray-300'
                      }`}>
                        {project.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {projects?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-2xl border border-dashed border-border">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No projects found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Project Name</label>
            <input name="name" required className="glass-input w-full" placeholder="e.g. Website Redesign" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Description</label>
            <textarea name="description" rows={3} className="glass-input w-full resize-none" placeholder="Brief details about the project..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Status</label>
              <select name="status" className="glass-input w-full appearance-none">
                {Object.values(ProjectStatus).map(s => (
                  <option key={s} value={s} className="bg-card text-white">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Priority</label>
              <select name="priority" className="glass-input w-full appearance-none">
                <option value="" className="bg-card text-white">None</option>
                {Object.values(ProjectPriority).map(p => (
                  <option key={p} value={p || ''} className="bg-card text-white">{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Due Date</label>
            <input type="date" name="dueDate" className="glass-input w-full color-scheme-dark" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
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
              <label className="block text-sm font-medium text-white mb-1.5">Project Name</label>
              <input name="name" defaultValue={editingProject.name} required className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Description</label>
              <textarea name="description" defaultValue={editingProject.description || ""} rows={3} className="glass-input w-full resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Status</label>
                <select name="status" defaultValue={editingProject.status} className="glass-input w-full appearance-none">
                  {Object.values(ProjectStatus).map(s => (
                    <option key={s} value={s} className="bg-card text-white">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Priority</label>
                <select name="priority" defaultValue={editingProject.priority || ""} className="glass-input w-full appearance-none">
                  <option value="" className="bg-card text-white">None</option>
                  {Object.values(ProjectPriority).map(p => (
                    <option key={p} value={p || ''} className="bg-card text-white">{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Progress (%)</label>
                <input type="number" min="0" max="100" name="progress" defaultValue={editingProject.progress} required className="glass-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Due Date</label>
                <input type="date" name="dueDate" defaultValue={editingProject.dueDate ? editingProject.dueDate.split('T')[0] : ""} className="glass-input w-full color-scheme-dark" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingProject(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={updateProject.isPending} className="btn-primary">
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
