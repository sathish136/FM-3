import { useState } from "react";
import { 
  useListLeads, 
  useCreateLead, 
  useUpdateLead,
  useDeleteLead,
  getListLeadsQueryKey,
  LeadStatus,
  Lead
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit2, Mail, Phone, Building } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Leads() {
  const queryClient = useQueryClient();
  const { data: leads, isLoading } = useListLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createLead.mutate({
      data: {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        status: fd.get("status") as LeadStatus,
        company: fd.get("company") as string || null,
        phone: fd.get("phone") as string || null,
        notes: fd.get("notes") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setIsCreateModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    const fd = new FormData(e.currentTarget);
    updateLead.mutate({
      id: editingLead.id,
      data: {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        status: fd.get("status") as LeadStatus,
        company: fd.get("company") as string || null,
        phone: fd.get("phone") as string || null,
        notes: fd.get("notes") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setEditingLead(null);
      }
    });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage inbound leads and track conversion.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Added</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-32"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-40"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-24"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-white/5 rounded-full w-20"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-20"></div></td>
                  <td className="px-6 py-4"></td>
                </tr>
              ))}
              
              {!isLoading && leads?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              )}

              {leads?.map(lead => (
                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer"><Mail className="w-3 h-3"/> {lead.email}</span>
                      {lead.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {lead.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {lead.company ? <span className="flex items-center gap-1.5"><Building className="w-3 h-3"/> {lead.company}</span> : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
                      lead.status === 'new' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      lead.status === 'qualified' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      lead.status === 'converted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    )}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingLead(lead)} className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(confirm("Delete lead?")) deleteLead.mutate({id: lead.id}, {onSuccess:()=>queryClient.invalidateQueries({queryKey: getListLeadsQueryKey()})}) }} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Lead">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Name</label>
            <input name="name" required className="glass-input w-full" placeholder="Full Name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Email</label>
            <input name="email" type="email" required className="glass-input w-full" placeholder="email@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Phone</label>
              <input name="phone" className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Company</label>
              <input name="company" className="glass-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Status</label>
            <select name="status" className="glass-input w-full appearance-none">
              {Object.values(LeadStatus).map(s => <option key={s} value={s} className="bg-card text-white">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Notes</label>
            <textarea name="notes" rows={3} className="glass-input w-full resize-none" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createLead.isPending} className="btn-primary">Add Lead</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingLead} onClose={() => setEditingLead(null)} title="Edit Lead">
        {editingLead && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Name</label>
              <input name="name" defaultValue={editingLead.name} required className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Email</label>
              <input name="email" type="email" defaultValue={editingLead.email} required className="glass-input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Phone</label>
                <input name="phone" defaultValue={editingLead.phone || ''} className="glass-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Company</label>
                <input name="company" defaultValue={editingLead.company || ''} className="glass-input w-full" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Status</label>
              <select name="status" defaultValue={editingLead.status} className="glass-input w-full appearance-none">
                {Object.values(LeadStatus).map(s => <option key={s} value={s} className="bg-card text-white">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Notes</label>
              <textarea name="notes" defaultValue={editingLead.notes || ''} rows={3} className="glass-input w-full resize-none" />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingLead(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={updateLead.isPending} className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
