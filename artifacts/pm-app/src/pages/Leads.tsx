import { useState, useMemo } from "react";
import {
  useListLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  getListLeadsQueryKey,
  LeadStatus,
  Lead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Plus, Trash2, Edit2, Mail, Phone, Building, Search, X,
  Users, TrendingUp, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, User, StickyNote, CalendarPlus,
} from "lucide-react";

// ── Types & constants ────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string; icon: any }> = {
  new:       { label: "New",       bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500",    icon: AlertCircle },
  qualified: { label: "Qualified", bg: "bg-primary/10", text: "text-primary",     border: "border-primary/20",  dot: "bg-primary",     icon: TrendingUp },
  converted: { label: "Converted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  lost:      { label: "Lost",      bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500",     icon: XCircle },
};

const AVATAR_COLORS = [
  "bg-primary","bg-indigo-500","bg-blue-500","bg-cyan-500",
  "bg-teal-500","bg-emerald-500","bg-amber-500","bg-orange-500","bg-rose-500",
];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", m.bg, m.text, m.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Lead Form ────────────────────────────────────────────────────────────────

function LeadForm({ onSubmit, onCancel, isPending, defaultValues }: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<Lead>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name *</label>
          <input name="name" defaultValue={defaultValues?.name} required
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground"
            placeholder="John Smith" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Email *</label>
          <input name="email" type="email" defaultValue={defaultValues?.email} required
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground"
            placeholder="john@company.com" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Phone</label>
          <input name="phone" defaultValue={defaultValues?.phone ?? ""}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground"
            placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Company</label>
          <input name="company" defaultValue={defaultValues?.company ?? ""}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground"
            placeholder="Acme Corp" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "new"}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground">
            {Object.values(LeadStatus).map(s => (
              <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Notes</label>
          <textarea name="notes" defaultValue={defaultValues?.notes ?? ""} rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background text-foreground resize-none"
            placeholder="Any additional info…" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : defaultValues ? "Save Changes" : "Add Lead"}
        </button>
      </div>
    </form>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function LeadPanel({ lead, onEdit, onClose }: { lead: Lead; onEdit: () => void; onClose: () => void }) {
  const m = STATUS_META[lead.status] ?? STATUS_META.new;
  const Icon = m.icon;
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-bold text-card-foreground text-sm">Lead Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0", avatarColor(lead.name))}>
            {initials(lead.name)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-card-foreground leading-tight">{lead.name}</h2>
            {lead.company && <p className="text-sm text-muted-foreground mt-0.5">{lead.company}</p>}
            <div className="mt-2">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", m.bg, m.text, m.border)}>
                <Icon className="w-3 h-3" /> {m.label}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{lead.phone}</span>
            </div>
          )}
          {lead.company && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Building className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{lead.company}</span>
            </div>
          )}
        </div>

        {lead.notes && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">{lead.notes}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Added {formatDate(lead.createdAt)}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-border">
        <button onClick={onEdit}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          <Edit2 className="w-4 h-4" /> Edit Lead
        </button>
      </div>
    </div>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 border border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "all",       label: "All Leads" },
  { key: "new",       label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "converted", label: "Converted" },
  { key: "lost",      label: "Lost" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Leads() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useListLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const l of leads) { c[l.status] = (c[l.status] ?? 0) + 1; }
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? leads : leads.filter(l => l.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, tab, search]);

  function invalidate() { qc.invalidateQueries({ queryKey: getListLeadsQueryKey() }); }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createLead.mutate({
      data: {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        status: fd.get("status") as LeadStatus,
        company: (fd.get("company") as string) || null,
        phone: (fd.get("phone") as string) || null,
        notes: (fd.get("notes") as string) || null,
      }
    }, { onSuccess: () => { invalidate(); setShowCreate(false); } });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    updateLead.mutate({
      id: editing.id,
      data: {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        status: fd.get("status") as LeadStatus,
        company: (fd.get("company") as string) || null,
        phone: (fd.get("phone") as string) || null,
        notes: (fd.get("notes") as string) || null,
      }
    }, { onSuccess: () => { invalidate(); setEditing(null); setSelected(null); } });
  }

  function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    deleteLead.mutate({ id: lead.id }, { onSuccess: () => { invalidate(); if (selected?.id === lead.id) setSelected(null); } });
  }

  return (
    <Layout>
      <div className="h-full flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lead Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and track your sales leads</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 shrink-0">
          <KpiCard label="Total Leads" value={counts.all ?? 0} color="bg-primary" icon={Users} />
          <KpiCard label="New" value={counts.new ?? 0} color="bg-blue-500" icon={AlertCircle} />
          <KpiCard label="Qualified" value={counts.qualified ?? 0} color="bg-amber-500" icon={TrendingUp} />
          <KpiCard label="Converted" value={counts.converted ?? 0} color="bg-emerald-500" icon={CheckCircle2} />
        </div>

        {/* Main panel */}
        <div className="flex-1 min-h-0 flex gap-0 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Table column */}
          <div className={cn("flex flex-col min-h-0 transition-all", selected ? "w-[58%]" : "w-full")}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search leads…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {t.label}
                    <span className={cn("ml-1.5 text-[10px] font-bold", tab === t.key ? "text-primary" : "text-muted-foreground")}>
                      {counts[t.key] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                  <User className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium">No leads found</p>
                  <p className="text-sm mt-1">Try changing your filter or add a new lead</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Lead</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Company</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Added</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map(lead => (
                      <tr key={lead.id}
                        onClick={() => setSelected(s => s?.id === lead.id ? null : lead)}
                        className={cn("group cursor-pointer transition-colors",
                          selected?.id === lead.id ? "bg-accent" : "hover:bg-muted/50")}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor(lead.name))}>
                              {initials(lead.name)}
                            </div>
                            <span className="font-semibold text-foreground">{lead.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {lead.email}</div>
                            {lead.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {lead.phone}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground/70">
                          {lead.company ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => setEditing(lead)}
                              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(lead)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/calendar?title=${encodeURIComponent("Follow-up: " + lead.name)}&type=followup&related=Lead&relatedId=${lead.id}`)}
                              title="Add Follow-up to Calendar"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors">
                              <CalendarPlus className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-[42%] shrink-0 border-l border-border">
              <LeadPanel
                lead={selected}
                onEdit={() => setEditing(selected)}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Lead">
        <LeadForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} isPending={createLead.isPending} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Lead">
        {editing && (
          <LeadForm onSubmit={handleEdit} onCancel={() => setEditing(null)} isPending={updateLead.isPending} defaultValues={editing} />
        )}
      </Modal>
    </Layout>
  );
}
