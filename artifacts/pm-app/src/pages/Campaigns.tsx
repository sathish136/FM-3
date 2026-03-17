import { useState } from "react";
import { 
  useListCampaigns, 
  useCreateCampaign, 
  useUpdateCampaign,
  useDeleteCampaign,
  getListCampaignsQueryKey,
  CampaignStatus,
  CampaignType,
  Campaign
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Megaphone, Trash2, Edit2, BarChart2, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCampaign.mutate({
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as CampaignStatus,
        type: fd.get("type") as CampaignType,
        budget: parseFloat(fd.get("budget") as string),
        startDate: fd.get("startDate") as string || null,
        endDate: fd.get("endDate") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setIsCreateModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCampaign) return;
    const fd = new FormData(e.currentTarget);
    updateCampaign.mutate({
      id: editingCampaign.id,
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as CampaignStatus,
        type: fd.get("type") as CampaignType,
        budget: parseFloat(fd.get("budget") as string),
        startDate: fd.get("startDate") as string || null,
        endDate: fd.get("endDate") as string || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setEditingCampaign(null);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/20';
      case 'paused': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Marketing Campaigns</h1>
          <p className="text-muted-foreground mt-1">Track ROI, budget, and leads from your marketing efforts.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns?.map(campaign => (
            <div key={campaign.id} className="bg-card border border-border rounded-2xl p-6 hover:border-white/10 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white leading-tight">{campaign.name}</h3>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{campaign.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm border", getStatusColor(campaign.status))}>
                    {campaign.status}
                  </span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button onClick={() => setEditingCampaign(campaign)} className="p-1 text-muted-foreground hover:text-white rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(confirm("Delete?")) deleteCampaign.mutate({id: campaign.id}, {onSuccess:()=>queryClient.invalidateQueries({queryKey: getListCampaignsQueryKey()})}) }} className="p-1 text-destructive hover:text-red-400 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 my-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Budget</p>
                  <p className="text-lg font-medium text-white">{formatCurrency(campaign.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Spent</p>
                  <p className="text-lg font-medium text-white">{formatCurrency(campaign.spent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Leads</p>
                  <p className="text-lg font-medium text-white">{campaign.leads || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Conversions</p>
                  <p className="text-lg font-medium text-white">{campaign.conversions || 0}</p>
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start: {formatDate(campaign.startDate)}</span>
                <span>End: {formatDate(campaign.endDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals omitted for brevity but they follow the exact same pattern as Projects/Kanban */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Campaign">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Campaign Name</label>
            <input name="name" required className="glass-input w-full" placeholder="Summer Promo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Type</label>
              <select name="type" className="glass-input w-full appearance-none">
                {Object.values(CampaignType).map(t => <option key={t} value={t} className="bg-card text-white">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Status</label>
              <select name="status" className="glass-input w-full appearance-none">
                {Object.values(CampaignStatus).map(s => <option key={s} value={s} className="bg-card text-white">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Budget ($)</label>
            <input type="number" name="budget" required min="0" step="0.01" className="glass-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Start Date</label>
              <input type="date" name="startDate" className="glass-input w-full color-scheme-dark" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">End Date</label>
              <input type="date" name="endDate" className="glass-input w-full color-scheme-dark" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createCampaign.isPending} className="btn-primary">Create Campaign</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingCampaign} onClose={() => setEditingCampaign(null)} title="Edit Campaign">
        {editingCampaign && (
           <form onSubmit={handleEdit} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-white mb-1.5">Campaign Name</label>
             <input name="name" defaultValue={editingCampaign.name} required className="glass-input w-full" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">Type</label>
               <select name="type" defaultValue={editingCampaign.type} className="glass-input w-full appearance-none">
                 {Object.values(CampaignType).map(t => <option key={t} value={t} className="bg-card text-white">{t}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">Status</label>
               <select name="status" defaultValue={editingCampaign.status} className="glass-input w-full appearance-none">
                 {Object.values(CampaignStatus).map(s => <option key={s} value={s} className="bg-card text-white">{s}</option>)}
               </select>
             </div>
           </div>
           <div>
             <label className="block text-sm font-medium text-white mb-1.5">Budget ($)</label>
             <input type="number" name="budget" defaultValue={editingCampaign.budget} required min="0" step="0.01" className="glass-input w-full" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">Start Date</label>
               <input type="date" name="startDate" defaultValue={editingCampaign.startDate ? editingCampaign.startDate.split('T')[0] : ''} className="glass-input w-full color-scheme-dark" />
             </div>
             <div>
               <label className="block text-sm font-medium text-white mb-1.5">End Date</label>
               <input type="date" name="endDate" defaultValue={editingCampaign.endDate ? editingCampaign.endDate.split('T')[0] : ''} className="glass-input w-full color-scheme-dark" />
             </div>
           </div>
           <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => setEditingCampaign(null)} className="btn-secondary">Cancel</button>
             <button type="submit" disabled={updateCampaign.isPending} className="btn-primary">Save Changes</button>
           </div>
         </form>
        )}
      </Modal>

    </Layout>
  );
}
