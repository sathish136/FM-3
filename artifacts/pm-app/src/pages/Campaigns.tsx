import { useState, useMemo } from "react";
import {
  useListCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  getListCampaignsQueryKey,
  CampaignStatus,
  CampaignType,
  Campaign,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit2, Megaphone, Target, Users, DollarSign,
  TrendingUp, BarChart3, X, Search, Zap, Mail, Globe,
  FileText, Mic, ShoppingBag, Calendar, ChevronRight,
} from "lucide-react";

// ── Types & constants ─────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
  active:    { label: "Active",    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  paused:    { label: "Paused",    bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  completed: { label: "Completed", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
};

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  email:   { label: "Email",    icon: Mail,       color: "text-indigo-600", bg: "bg-indigo-50" },
  social:  { label: "Social",   icon: Globe,      color: "text-sky-600",    bg: "bg-sky-50" },
  ppc:     { label: "PPC",      icon: Zap,        color: "text-amber-600",  bg: "bg-amber-50" },
  content: { label: "Content",  icon: FileText,   color: "text-violet-600", bg: "bg-violet-50" },
  event:   { label: "Event",    icon: Mic,        color: "text-rose-600",   bg: "bg-rose-50" },
  other:   { label: "Other",    icon: ShoppingBag,color: "text-gray-600",   bg: "bg-gray-50" },
};

const TABS = [
  { key: "all",       label: "All" },
  { key: "active",    label: "Active" },
  { key: "draft",     label: "Draft" },
  { key: "paused",    label: "Paused" },
  { key: "completed", label: "Completed" },
] as const;
type TabKey = typeof TABS[number]["key"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", m.bg, m.text, m.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META.other;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold", m.bg, m.color)}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Budget Used</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{fmt(spent)} spent</span>
        <span>{fmt(budget)} total</span>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Campaign Form ─────────────────────────────────────────────────────────────

function CampaignForm({ onSubmit, onCancel, isPending, defaultValues }: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<Campaign>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Campaign Name *</label>
        <input name="name" defaultValue={defaultValues?.name} required
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          placeholder="Summer Promo 2026" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
        <textarea name="description" defaultValue={defaultValues?.description ?? ""} rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white resize-none"
          placeholder="What is this campaign about?" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
          <select name="type" defaultValue={defaultValues?.type ?? "email"}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
            {Object.values(CampaignType).map(t => (
              <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "draft"}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
            {Object.values(CampaignStatus).map(s => (
              <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Budget (₹)</label>
          <input type="number" name="budget" defaultValue={defaultValues?.budget ?? ""} required min="0" step="1"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            placeholder="50000" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Spent (₹)</label>
          <input type="number" name="spent" defaultValue={defaultValues?.spent ?? 0} min="0" step="1"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Leads Generated</label>
          <input type="number" name="leads" defaultValue={defaultValues?.leads ?? 0} min="0"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Conversions</label>
          <input type="number" name="conversions" defaultValue={defaultValues?.conversions ?? 0} min="0"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date</label>
          <input type="date" name="startDate"
            defaultValue={defaultValues?.startDate ? defaultValues.startDate.split("T")[0] : ""}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
          <input type="date" name="endDate"
            defaultValue={defaultValues?.endDate ? defaultValues.endDate.split("T")[0] : ""}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : defaultValues ? "Save Changes" : "Create Campaign"}
        </button>
      </div>
    </form>
  );
}

// ── Campaign Card ──────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onEdit, onDelete }: { campaign: Campaign; onEdit: () => void; onDelete: () => void }) {
  const tm = TYPE_META[campaign.type] ?? TYPE_META.other;
  const Icon = tm.icon;
  const roi = campaign.spent > 0 && campaign.conversions > 0
    ? ((campaign.conversions / campaign.spent) * 10000).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tm.bg)}>
            <Icon className={cn("w-5 h-5", tm.color)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{campaign.name}</h3>
            {campaign.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={campaign.status} />
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Type */}
      <TypeBadge type={campaign.type} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Leads</p>
          <p className="text-base font-bold text-gray-900">{campaign.leads ?? 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Converted</p>
          <p className="text-base font-bold text-gray-900">{campaign.conversions ?? 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">ROI</p>
          <p className={cn("text-base font-bold", roi ? "text-emerald-600" : "text-gray-300")}>
            {roi ? `${roi}×` : "—"}
          </p>
        </div>
      </div>

      {/* Budget bar */}
      <BudgetBar spent={Number(campaign.spent) || 0} budget={Number(campaign.budget) || 0} />

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-50 pt-3">
        <Calendar className="w-3 h-3" />
        <span>{fmtDate(campaign.startDate)}</span>
        <ChevronRight className="w-3 h-3" />
        <span>{fmtDate(campaign.endDate)}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Campaigns() {
  const qc = useQueryClient();
  const { data: campaigns = [], isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const stats = useMemo(() => {
    const totalBudget = campaigns.reduce((s, c) => s + (Number(c.budget) || 0), 0);
    const totalSpent  = campaigns.reduce((s, c) => s + (Number(c.spent) || 0), 0);
    const totalLeads  = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalConv   = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    return { totalBudget, totalSpent, totalLeads, totalConv };
  }, [campaigns]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: campaigns.length };
    for (const camp of campaigns) { c[camp.status] = (c[camp.status] ?? 0) + 1; }
    return c;
  }, [campaigns]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? campaigns : campaigns.filter(c => c.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, tab, search]);

  function invalidate() { qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }); }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCampaign.mutate({
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as CampaignStatus,
        type: fd.get("type") as CampaignType,
        budget: parseFloat(fd.get("budget") as string),
        startDate: (fd.get("startDate") as string) || null,
        endDate: (fd.get("endDate") as string) || null,
      }
    }, { onSuccess: () => { invalidate(); setShowCreate(false); } });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    updateCampaign.mutate({
      id: editing.id,
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        status: fd.get("status") as CampaignStatus,
        type: fd.get("type") as CampaignType,
        budget: parseFloat(fd.get("budget") as string),
        spent: parseFloat(fd.get("spent") as string) || 0,
        leads: parseInt(fd.get("leads") as string) || 0,
        conversions: parseInt(fd.get("conversions") as string) || 0,
        startDate: (fd.get("startDate") as string) || null,
        endDate: (fd.get("endDate") as string) || null,
      }
    }, { onSuccess: () => { invalidate(); setEditing(null); } });
  }

  function handleDelete(c: Campaign) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    deleteCampaign.mutate({ id: c.id }, { onSuccess: invalidate });
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track ROI, budget spend, and lead generation</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Budget" value={fmt(stats.totalBudget)} color="bg-violet-500" icon={DollarSign} />
          <KpiCard label="Total Spent" value={fmt(stats.totalSpent)} sub={`${stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(0) : 0}% of budget`} color="bg-amber-500" icon={TrendingUp} />
          <KpiCard label="Leads Generated" value={String(stats.totalLeads)} color="bg-blue-500" icon={Users} />
          <KpiCard label="Conversions" value={String(stats.totalConv)} sub={stats.totalLeads > 0 ? `${((stats.totalConv / stats.totalLeads) * 100).toFixed(0)}% conversion rate` : undefined} color="bg-emerald-500" icon={Target} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                {t.label}
                <span className={cn("ml-1.5 text-[10px] font-bold", tab === t.key ? "text-violet-600" : "text-gray-400")}>
                  {counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Campaign grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Megaphone className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-semibold text-gray-500">No campaigns found</p>
            <p className="text-sm mt-1">Create your first marketing campaign to get started</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => (
              <CampaignCard key={c.id} campaign={c}
                onEdit={() => setEditing(c)}
                onDelete={() => handleDelete(c)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Campaign">
        <CampaignForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} isPending={createCampaign.isPending} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Campaign">
        {editing && (
          <CampaignForm onSubmit={handleEdit} onCancel={() => setEditing(null)} isPending={updateCampaign.isPending} defaultValues={editing} />
        )}
      </Modal>
    </Layout>
  );
}
