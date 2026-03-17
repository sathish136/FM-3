import { useState } from "react";
import {
  useListTeamMembers,
  useCreateTeamMember,
  getListTeamMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Mail, Building2 } from "lucide-react";

const avatarColors = [
  "bg-blue-600", "bg-indigo-600", "bg-violet-600",
  "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-700",
];

const roleColors: Record<string, string> = {
  admin:     "bg-blue-50 text-blue-700 border border-blue-200",
  manager:   "bg-indigo-50 text-indigo-700 border border-indigo-200",
  developer: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  designer:  "bg-violet-50 text-violet-700 border border-violet-200",
  analyst:   "bg-amber-50 text-amber-700 border border-amber-200",
};

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

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Directory</h1>
            <p className="text-sm text-gray-500 mt-0.5">People in your workspace</p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Invite Member
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Members", value: team?.length ?? "—" },
            { label: "Departments", value: team ? new Set(team.map(m => m.department)).size : "—" },
            { label: "Active", value: team?.length ?? "—" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading && Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-44 bg-white border border-gray-200 rounded-lg animate-pulse" />
          ))}

          {team?.map((member, i) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-lg font-bold mb-3`}>
                {member.name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{member.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded font-medium mb-3 ${roleColors[member.role?.toLowerCase() ?? ""] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                {member.role}
              </span>
              {member.department && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <Building2 className="w-3 h-3" />
                  {member.department}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100 w-full justify-center">
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{member.email}</span>
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Invite Team Member">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <input name="name" required className="glass-input" placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input name="email" type="email" required className="glass-input" placeholder="jane@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Role</label>
                <input name="role" required className="glass-input" placeholder="e.g. Developer" />
              </div>
              <div>
                <label className="form-label">Department</label>
                <input name="department" className="glass-input" placeholder="e.g. Engineering" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createTeamMember.isPending} className="btn-primary">Send Invite</button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
