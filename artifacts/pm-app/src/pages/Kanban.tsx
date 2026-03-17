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
import { Plus, Trash2, Edit2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TaskStatus; title: string; accent: string; badge: string; dot: string }[] = [
  { id: TaskStatus.todo,        title: "To Do",      accent: "border-t-gray-400",   badge: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  { id: TaskStatus.in_progress, title: "In Progress", accent: "border-t-blue-500",  badge: "bg-blue-50 text-blue-700",    dot: "bg-blue-500" },
  { id: TaskStatus.review,      title: "Review",     accent: "border-t-amber-500",  badge: "bg-amber-50 text-amber-700",  dot: "bg-amber-500" },
  { id: TaskStatus.done,        title: "Done",       accent: "border-t-emerald-500",badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
];

const priorityBadge: Record<string, string> = {
  high:   "bg-red-50 text-red-700 border border-red-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low:    "bg-gray-50 text-gray-600 border border-gray-200",
};

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
    updateTask.mutate({ id: draggingId, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
    setDraggingId(null);
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-5 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">P&ID Process Board</h1>
            <p className="text-sm text-gray-500 mt-0.5">Drag and drop tasks to update their status</p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {/* Kanban columns */}
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: "60vh" }}>
          {COLUMNS.map(col => {
            const colTasks = tasks?.filter(t => t.status === col.id) ?? [];
            return (
              <div
                key={col.id}
                className={cn("flex-1 min-w-[260px] max-w-[320px] bg-gray-50 rounded-lg border border-t-2 border-gray-200 flex flex-col", col.accent)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200 bg-white rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                    <h3 className="font-semibold text-gray-800 text-sm">{col.title}</h3>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", col.badge)}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                  {isLoading && <div className="h-20 bg-white border border-gray-200 rounded-lg animate-pulse" />}

                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => {
                        setDraggingId(task.id);
                        setTimeout(() => e.currentTarget.classList.add("opacity-40"), 0);
                      }}
                      onDragEnd={e => {
                        setDraggingId(null);
                        e.currentTarget.classList.remove("opacity-40");
                      }}
                      className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn("text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded", priorityBadge[task.priority ?? "low"])}>
                          {task.priority}
                        </span>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                          <button onClick={() => setEditingTask(task)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => {
                            if (confirm("Delete task?")) deleteTask.mutate({ id: task.id }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
                            });
                          }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 mb-1 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                      )}

                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                            {task.assignee.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-500 truncate">{task.assignee}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {colTasks.length === 0 && !isLoading && (
                    <div className="h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Modal */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Task">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="form-label">Task Title</label>
              <input name="title" required className="glass-input" placeholder="e.g. Design landing page" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea name="description" rows={3} className="glass-input resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="glass-input">
                  {Object.values(TaskStatus).map(s => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Priority</label>
                <select name="priority" className="glass-input">
                  {Object.values(TaskPriority).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Assignee</label>
              <input name="assignee" className="glass-input" placeholder="Name or email" />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createTask.isPending} className="btn-primary">Create Task</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
          {editingTask && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="form-label">Task Title</label>
                <input name="title" defaultValue={editingTask.title} required className="glass-input" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea name="description" defaultValue={editingTask.description || ""} rows={3} className="glass-input resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select name="status" defaultValue={editingTask.status} className="glass-input">
                    {Object.values(TaskStatus).map(s => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select name="priority" defaultValue={editingTask.priority} className="glass-input">
                    {Object.values(TaskPriority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Assignee</label>
                <input name="assignee" defaultValue={editingTask.assignee || ""} className="glass-input" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingTask(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updateTask.isPending} className="btn-primary">Save Changes</button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
