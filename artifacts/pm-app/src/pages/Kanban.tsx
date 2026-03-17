import { useState } from "react";
import { 
  useListTasks, 
  useCreateTask, 
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  TaskStatus,
  TaskPriority,
  Task
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, GripVertical, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: TaskStatus.todo, title: "To Do", color: "bg-gray-500/20 text-gray-300 border-gray-500/20" },
  { id: TaskStatus.in_progress, title: "In Progress", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
  { id: TaskStatus.review, title: "Review", color: "bg-amber-500/20 text-amber-300 border-amber-500/20" },
  { id: TaskStatus.done, title: "Done", color: "bg-green-500/20 text-green-300 border-green-500/20" },
];

export default function Kanban() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTask.mutate({
      data: {
        title: fd.get("title") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as TaskStatus,
        priority: fd.get("priority") as TaskPriority,
        assignee: fd.get("assignee") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsCreateModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    const fd = new FormData(e.currentTarget);
    updateTask.mutate({
      id: editingTask.id,
      data: {
        title: fd.get("title") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as TaskStatus,
        priority: fd.get("priority") as TaskPriority,
        assignee: fd.get("assignee") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setEditingTask(null);
      }
    });
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!draggingId) return;
    
    // Optimistic UI update could go here, but simple invalidate is safer
    updateTask.mutate({
      id: draggingId,
      data: { status }
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
    setDraggingId(null);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">Drag and drop tasks to update their status.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar min-h-[60vh]">
        {COLUMNS.map(col => (
          <div 
            key={col.id} 
            className="flex-1 min-w-[300px] max-w-[350px] bg-card/50 rounded-2xl border border-border flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", col.color.split(' ')[0].replace('/20', ''))}></span>
                {col.title}
              </h3>
              <span className="bg-black/30 text-muted-foreground text-xs px-2 py-1 rounded-md font-medium">
                {tasks?.filter(t => t.status === col.id).length || 0}
              </span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {isLoading && <div className="h-24 bg-white/5 rounded-xl animate-pulse"></div>}
              
              {tasks?.filter(t => t.status === col.id).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(task.id);
                    // Add a tiny delay to allow the drag image to generate before adding opacity
                    setTimeout(() => e.currentTarget.classList.add('opacity-50'), 0);
                  }}
                  onDragEnd={(e) => {
                    setDraggingId(null);
                    e.currentTarget.classList.remove('opacity-50');
                  }}
                  className="bg-[#1e1e24] border border-border p-4 rounded-xl shadow-md cursor-grab active:cursor-grabbing hover:border-white/10 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm",
                      task.priority === 'high' ? 'bg-destructive/20 text-red-400' :
                      task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/10 text-gray-300'
                    )}>
                      {task.priority}
                    </span>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingTask(task)} className="p-1 text-muted-foreground hover:text-white rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm("Delete task?")) deleteTask.mutate({id: task.id}, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })})
                        }} 
                        className="p-1 text-destructive hover:text-red-400 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-medium text-white mb-1 leading-snug">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                  )}
                  
                  {task.assignee && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                        {task.assignee.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{task.assignee}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Forms for Create/Edit map to standard patterns... */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Task">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Task Title</label>
            <input name="title" required className="glass-input w-full" placeholder="e.g. Design landing page" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Description</label>
            <textarea name="description" rows={3} className="glass-input w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Status</label>
              <select name="status" className="glass-input w-full appearance-none">
                {Object.values(TaskStatus).map(s => (
                  <option key={s} value={s} className="bg-card text-white">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Priority</label>
              <select name="priority" className="glass-input w-full appearance-none">
                {Object.values(TaskPriority).map(p => (
                  <option key={p} value={p} className="bg-card text-white">{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Assignee</label>
            <input name="assignee" className="glass-input w-full" placeholder="Name or email" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createTask.isPending} className="btn-primary">Create Task</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        {editingTask && (
           <form onSubmit={handleEdit} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-white mb-1.5">Task Title</label>
             <input name="title" defaultValue={editingTask.title} required className="glass-input w-full" />
           </div>
           <div>
             <label className="block text-sm font-medium text-white mb-1.5">Description</label>
             <textarea name="description" defaultValue={editingTask.description || ''} rows={3} className="glass-input w-full resize-none" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">Status</label>
               <select name="status" defaultValue={editingTask.status} className="glass-input w-full appearance-none">
                 {Object.values(TaskStatus).map(s => (
                   <option key={s} value={s} className="bg-card text-white">{s.replace('_', ' ')}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">Priority</label>
               <select name="priority" defaultValue={editingTask.priority} className="glass-input w-full appearance-none">
                 {Object.values(TaskPriority).map(p => (
                   <option key={p} value={p} className="bg-card text-white">{p}</option>
                 ))}
               </select>
             </div>
           </div>
           <div>
             <label className="block text-sm font-medium text-white mb-1.5">Assignee</label>
             <input name="assignee" defaultValue={editingTask.assignee || ''} className="glass-input w-full" />
           </div>
           <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => setEditingTask(null)} className="btn-secondary">Cancel</button>
             <button type="submit" disabled={updateTask.isPending} className="btn-primary">Save Changes</button>
           </div>
         </form>
        )}
      </Modal>
    </Layout>
  );
}
