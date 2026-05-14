import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Ticket, Search, RefreshCw, ExternalLink, Plus, Loader2,
  AlertCircle, Clock, CheckCircle2, Flame, ArrowUpCircle,
  Minus, X, Save, User, StickyNote, ChevronDown, UserCheck,
  Calendar, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SupportTicket {
  id: number;
  ticket_no: string;
  site_call_id: number | null;
  project_number: string | null;
  project_name: string | null;
  title: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  call_no: string | null;
  call_type: string | null;
  call_status: string | null;
  call_attended_by?: Array<{ name: string }> | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, { color: string; bg: string; ring: string; icon: typeof Flame }> = {
  Critical: { color: "text-red-700",    bg: "bg-red-100",    ring: "ring-red-400",    icon: Flame         },
  High:     { color: "text-orange-700", bg: "bg-orange-100", ring: "ring-orange-400", icon: ArrowUpCircle },
  Medium:   { color: "text-amber-700",  bg: "bg-amber-100",  ring: "ring-amber-400",  icon: Minus         },
  Low:      { color: "text-gray-500",   bg: "bg-gray-100",   ring: "ring-gray-300",   icon: Minus         },
};

const STATUS_CFG: Record<string, { label: string; col: string; header: string; badge: string; empty: string; icon: typeof CheckCircle2 }> = {
  Open:          { label: "Open",        col: "bg-red-50 border-red-200",    header: "text-red-700 bg-red-100",    badge: "bg-red-600",    empty: "No open tickets", icon: AlertCircle  },
  "In Progress": { label: "In Progress", col: "bg-amber-50 border-amber-200",header: "text-amber-800 bg-amber-100",badge: "bg-amber-500", empty: "None in progress", icon: Clock        },
  Closed:        { label: "Closed",      col: "bg-green-50 border-green-200",header: "text-green-800 bg-green-100",badge: "bg-green-600",  empty: "No closed tickets", icon: CheckCircle2 },
};

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return dt ?? "—"; }
}

function fmtDate(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  catch { return dt ?? "—"; }
}

function attendedNames(raw: Array<{ name: string }> | null | undefined): string {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return "";
  return raw.map(e => e.name).filter(Boolean).join(", ");
}

function PriorityDot({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", c.color, c.bg)}>
      <Icon className="w-2.5 h-2.5" /> {priority}
    </span>
  );
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick, active }: { ticket: SupportTicket; onClick: () => void; active: boolean }) {
  const assigned = attendedNames(ticket.call_attended_by);
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all group",
        active ? "ring-2 ring-violet-500 border-violet-300 shadow-md" : "border-gray-200 hover:border-violet-300"
      )}
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <span className="font-mono text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
          {ticket.ticket_no}
        </span>
        <PriorityDot priority={ticket.priority} />
      </div>

      {/* project */}
      {ticket.project_name && (
        <p className="text-[11px] font-semibold text-gray-700 truncate mb-0.5">{ticket.project_name}</p>
      )}
      {ticket.project_number && (
        <p className="text-[10px] text-gray-400 mb-1">{ticket.project_number}</p>
      )}

      {/* title */}
      <p className="text-xs text-gray-700 leading-snug line-clamp-2 mb-2">
        {ticket.title || <span className="text-gray-400 italic">No description</span>}
      </p>

      {/* meta row */}
      <div className="flex flex-col gap-1">
        {/* created by */}
        {ticket.created_by && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-500 truncate">{ticket.created_by}</span>
          </div>
        )}
        {/* assigned from site call */}
        {assigned && (
          <div className="flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="text-[10px] text-violet-600 font-medium truncate">{assigned}</span>
          </div>
        )}
        {/* linked call */}
        {ticket.call_no && (
          <div className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="text-[10px] text-blue-500 truncate">{ticket.call_no}</span>
          </div>
        )}
        {/* date */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-[10px] text-gray-400">{fmtDate(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

function Column({
  status, tickets, selected, onSelect,
}: {
  status: string;
  tickets: SupportTicket[];
  selected: SupportTicket | null;
  onSelect: (t: SupportTicket) => void;
}) {
  const cfg = STATUS_CFG[status]!;
  const Icon = cfg.icon;
  return (
    <div className={cn("flex flex-col rounded-2xl border overflow-hidden min-h-0", cfg.col)}>
      <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-black/5", cfg.header)}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm">{cfg.label}</span>
        <span className={cn("ml-auto text-white text-xs font-bold px-2 py-0.5 rounded-full", cfg.badge)}>
          {tickets.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tickets.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6 italic">{cfg.empty}</p>
        ) : (
          tickets.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              active={selected?.id === t.id}
              onClick={() => onSelect(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────────

const BLANK = { project_number: "", project_name: "", title: "", priority: "Medium", assigned_to: "", notes: "", created_by: "" };

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/plc/support-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { onCreated(); onClose(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">New Support Ticket</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[65vh]">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Issue Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.title} onChange={f("title")} rows={3}
              placeholder="Describe the problem or support needed…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project No.</label>
              <input value={form.project_number} onChange={f("project_number")} placeholder="e.g. WTT-2025-042"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Name</label>
              <input value={form.project_name} onChange={f("project_name")} placeholder="Site / customer name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label>
            <div className="flex gap-1.5">
              {["Critical", "High", "Medium", "Low"].map(p => {
                const c = PRIORITY_CFG[p];
                return (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      form.priority === p ? `${c.bg} ${c.color} ring-2 ${c.ring}` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    )}
                  >{p}</button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Created By</label>
              <input value={form.created_by} onChange={f("created_by")} placeholder="Your name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assign To</label>
              <input value={form.assigned_to} onChange={f("assigned_to")} placeholder="PLC team member"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea value={form.notes} onChange={f("notes")} rows={2}
              placeholder="Any additional context…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
            {saving ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  ticket, onClose, onSaved,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onSaved: (updated: Partial<SupportTicket>) => void;
}) {
  const [, navigate] = useLocation();
  const [editPriority, setEditPriority] = useState(ticket.priority);
  const [editAssigned, setEditAssigned] = useState(ticket.assigned_to ?? "");
  const [editNotes, setEditNotes] = useState(ticket.notes ?? "");
  const [saving, setSaving] = useState(false);
  const assigned = attendedNames(ticket.call_attended_by);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/plc/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: editPriority, assigned_to: editAssigned, notes: editNotes }),
      });
      onSaved({ priority: editPriority, assigned_to: editAssigned, notes: editNotes });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Drawer header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-violet-700 text-sm">{ticket.ticket_no}</span>
            <PriorityDot priority={editPriority} />
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
              ticket.status === "Open" ? "text-red-700 bg-red-100" :
              ticket.status === "In Progress" ? "text-amber-700 bg-amber-100" : "text-green-700 bg-green-100"
            )}>
              {ticket.status === "Open" ? <AlertCircle className="w-2.5 h-2.5" /> :
               ticket.status === "In Progress" ? <Clock className="w-2.5 h-2.5" /> :
               <CheckCircle2 className="w-2.5 h-2.5" />}
              {ticket.status}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmt(ticket.updated_at)}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Project */}
        {(ticket.project_name || ticket.project_number) && (
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Project</p>
            <p className="font-semibold text-gray-800 text-sm">{ticket.project_name || "—"}</p>
            {ticket.project_number && <p className="text-xs text-gray-400">{ticket.project_number}</p>}
          </section>
        )}

        {/* Issue */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Issue</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.title || "—"}</p>
        </section>

        {/* Who & When */}
        <section className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Created By</p>
              <p className="text-xs font-medium text-gray-700">{ticket.created_by || "—"}</p>
            </div>
          </div>
          {assigned && (
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-violet-400" />
              <div>
                <p className="text-[10px] text-violet-500 uppercase tracking-wide font-semibold">Handled By (Site Call)</p>
                <p className="text-xs font-medium text-violet-700">{assigned}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Created</p>
              <p className="text-xs text-gray-600">{fmt(ticket.created_at)}</p>
            </div>
          </div>
        </section>

        {/* Linked site call */}
        {ticket.site_call_id && (
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Linked Site Call</p>
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <div>
                <p className="font-mono font-bold text-blue-800 text-sm">{ticket.call_no || `SC-${ticket.site_call_id}`}</p>
                <p className="text-[10px] text-blue-500">{ticket.call_status ?? ticket.call_type ?? "Online Support"}</p>
              </div>
              <button
                onClick={() => navigate("/plc-automation/site-calls")}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-100"
              >
                View <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </section>
        )}

        {/* Priority selector */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority</p>
          <div className="flex gap-1.5">
            {["Critical", "High", "Medium", "Low"].map(p => {
              const c = PRIORITY_CFG[p];
              return (
                <button key={p} onClick={() => setEditPriority(p)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    editPriority === p ? `${c.bg} ${c.color} ring-2 ${c.ring}` : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                  )}>
                  {p}
                </button>
              );
            })}
          </div>
        </section>

        {/* Assign to */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> Assign To</span>
          </label>
          <input value={editAssigned} onChange={e => setEditAssigned(e.target.value)}
            placeholder="Name or email…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </section>

        {/* Notes */}
        <section>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</span>
          </label>
          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
            placeholder="Follow-up actions, context…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </section>

        {/* Status note */}
        {!ticket.site_call_id && (
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <p className="text-xs text-violet-700 leading-relaxed">
              Status will automatically update when the PLC team starts a site call linked to this ticket.
            </p>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="px-4 py-3 border-t border-gray-200 shrink-0">
        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PLCSupportTickets() {
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected]   = useState<SupportTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search);
      const res = await fetch(`${BASE}/api/plc/support-tickets?${params}`);
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const byStatus = (status: string) => tickets.filter(t => t.status === status);

  const counts = {
    open:       byStatus("Open").length,
    inProgress: byStatus("In Progress").length,
    closed:     byStatus("Closed").length,
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

        {/* ── Top bar ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Support Tickets</h1>
                <p className="text-[11px] text-gray-500">PLC team tracking board</p>
              </div>
              {/* quick stats */}
              <div className="hidden sm:flex items-center gap-2 ml-3">
                <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {counts.open} Open
                </span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {counts.inProgress} In Progress
                </span>
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  {counts.closed} Closed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
                />
              </div>
              <button onClick={load} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg"
              >
                <Plus className="w-4 h-4" /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* ── Board ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Kanban columns */}
          <div className={cn(
            "flex gap-3 p-3 overflow-hidden flex-1",
            !showClosed ? "grid-cols-2" : "grid-cols-3"
          )}>
            {/* Open */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <Column status="Open" tickets={byStatus("Open")} selected={selected} onSelect={setSelected} />
            </div>

            {/* In Progress */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <Column status="In Progress" tickets={byStatus("In Progress")} selected={selected} onSelect={setSelected} />
            </div>

            {/* Closed — toggle */}
            <div className={cn("flex flex-col min-w-0 min-h-0 transition-all", showClosed ? "flex-1" : "w-9")}>
              {showClosed ? (
                <Column status="Closed" tickets={byStatus("Closed")} selected={selected} onSelect={setSelected} />
              ) : (
                <button
                  onClick={() => setShowClosed(true)}
                  className="h-full w-9 flex flex-col items-center justify-center gap-3 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition-colors"
                  title={`Show ${counts.closed} closed tickets`}
                >
                  <ChevronDown className="w-4 h-4 text-green-600 -rotate-90" />
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">{counts.closed}</span>
                  <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest [writing-mode:vertical-lr]">Closed</span>
                </button>
              )}
            </div>
          </div>

          {/* Detail drawer */}
          {selected && (
            <div className="w-72 shrink-0 border-l border-gray-200 flex flex-col overflow-hidden">
              <DetailDrawer
                ticket={selected}
                onClose={() => setSelected(null)}
                onSaved={updates => {
                  setSelected(prev => prev ? { ...prev, ...updates } : prev);
                  setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, ...updates } : t));
                }}
              />
            </div>
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={() => load()}
          />
        )}
      </div>
    </Layout>
  );
}
