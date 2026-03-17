import { useState } from "react";
import { 
  useListTeamMembers, 
  useCreateTeamMember,
  getListTeamMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Mail, Shield } from "lucide-react";

export default function Team() {
  const queryClient = useQueryClient();
  const { data: team, isLoading } = useListTeamMembers();
  const createTeamMember = useCreateTeamMember();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTeamMember.mutate({
      data: {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        role: fd.get("role") as string,
        department: fd.get("department") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
        setIsCreateModalOpen(false);
      }
    });
  };

  const gradients = [
    "from-indigo-500 to-purple-500",
    "from-emerald-400 to-cyan-400",
    "from-rose-400 to-red-500",
    "from-amber-400 to-orange-500",
    "from-blue-400 to-indigo-500"
  ];

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Team Directory</h1>
          <p className="text-muted-foreground mt-1">People in your workspace.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading && Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse"></div>)}
        
        {team?.map((member, i) => (
          <div key={member.id} className="bg-card border border-border rounded-2xl p-6 hover:border-white/10 transition-colors group flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${gradients[i % gradients.length]} flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg ring-4 ring-background`}>
              {member.name.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-1">{member.name}</h3>
            <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full mt-auto">
              <Mail className="w-3.5 h-3.5" />
              {member.email}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Name</label>
            <input name="name" required className="glass-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Email</label>
            <input name="email" type="email" required className="glass-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Role</label>
              <input name="role" required className="glass-input w-full" placeholder="e.g. Developer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Department</label>
              <input name="department" className="glass-input w-full" placeholder="e.g. Engineering" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createTeamMember.isPending} className="btn-primary">Send Invite</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
