import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Ticket, Search, RefreshCw, ExternalLink, ChevronRight,
  AlertCircle, Clock, CheckCircle2, Flame, ArrowUpCircle,
  Minus, X, Save, User, StickyNote, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  call_issue_details?: string | null;
  call_status?: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  Open:        { label: "Open",        color: "text-red-700",    bg: "bg-red-50 border-red-200",    icon: AlertCircle   },
  "In Progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock         },
  Closed:      { label: "Closed",      color: "text-green-700",  bg: "bg-green-50 border-green-200", icon: CheckCircle2  },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; icon: typeof Flame }> = {
  Critical: { label: "Critical", color: "text-red-700",    bg: "bg-red-50 border-red-200",      icon: Flame         },
  High:     { label: "High",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: ArrowUpCircle },
  Medium:   { label: "Medium",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: Minus         },
  Low:      { label: "Low",      color: "text-gray-600",   bg: "bg-gray-50 border-gray-200",     icon: Minus         },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Minus };
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", m.color, m.bg)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority] ?? { label: priority, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Minus };
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", m.color, m.bg)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return dt; }
}

export default function PLCSupportTickets() {
  const [, navigate] = useLocation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPriority, setEditPriority] = useState("");
  const [editAssigned, setEditAssigned] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (priorityFilter !== "All") params.set("priority", priorityFilter);
      const res = await fetch(`${BASE}/api/plc/support-tickets?${params}`);
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openDetail = async (ticket: SupportTicket) => {
    setSelected(ticket);
    setEditPriority(ticket.priority);
    setEditAssigned(ticket.assigned_to ?? "");
    setEditNotes(ticket.notes ?? "");
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/plc/support-tickets/${ticket.id}`);
      if (res.ok) {
        const full = await res.json();
        setSelected(full);
        setEditPriority(full.priority);
        setEditAssigned(full.assigned_to ?? "");
        setEditNotes(full.notes ?? "");
      }
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/plc/support-tickets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: editPriority, assigned_to: editAssigned, notes: editNotes }),
      });
      setTickets(prev => prev.map(t =>
        t.id === selected.id ? { ...t, priority: editPriority, assigned_to: editAssigned, notes: editNotes } : t
      ));
      setSelected(prev => prev ? { ...prev, priority: editPriority, assigned_to: editAssigned, notes: editNotes } : prev);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    closed: tickets.filter(t => t.status === "Closed").length,
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Support Tickets</h1>
              <p className="text-xs text-gray-500">Auto-linked from Online Support Calls — status synced automatically</p>
            </div>
          </div>
          <button
            onClick={fetchTickets}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Total", value: counts.total,      color: "text-gray-700",   bg: "bg-gray-100"   },
            { label: "Open",  value: counts.open,       color: "text-red-700",    bg: "bg-red-50"     },
            { label: "In Progress", value: counts.inProgress, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Closed", value: counts.closed,    color: "text-green-700",  bg: "bg-green-50"   },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl px-4 py-3 flex items-center justify-between", s.bg)}>
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
              <span className={cn("text-xl font-bold", s.color)}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={cn("flex flex-col overflow-hidden transition-all", selected ? "w-[55%]" : "w-full")}>
          {/* Filter bar */}
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets, projects, issues…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {["All", "Open", "In Progress", "Closed"].map(s => <option key={s}>{s}</option>)}
              </select>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {["All", "Critical", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                <Ticket className="w-10 h-10 opacity-30" />
                <p className="text-sm">No support tickets found</p>
                <p className="text-xs">Tickets are created automatically when a site support call is logged</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Ticket No</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Project</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Issue</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Priority</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Created</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => openDetail(t)}
                      className={cn(
                        "cursor-pointer hover:bg-violet-50 transition-colors",
                        selected?.id === t.id && "bg-violet-50 border-l-2 border-l-violet-500"
                      )}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-violet-700 text-xs">{t.ticket_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 truncate max-w-[140px]">{t.project_name || "—"}</div>
                        <div className="text-xs text-gray-400">{t.project_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 line-clamp-1 max-w-[200px]">{t.title || "—"}</p>
                        {t.call_no && (
                          <span className="text-xs text-gray-400">Ref: {t.call_no}</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(t.created_at)}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-[45%] border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-violet-700">{selected.ticket_no}</span>
                  <StatusBadge status={selected.status} />
                  <PriorityBadge priority={editPriority || selected.priority} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Updated {fmt(selected.updated_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {detailLoading ? (
                <div className="text-center text-gray-400 text-sm py-8">Loading details…</div>
              ) : (
                <>
                  {/* Project info */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project</h3>
                    <p className="font-semibold text-gray-800">{selected.project_name || "—"}</p>
                    <p className="text-sm text-gray-500">{selected.project_number || ""}</p>
                  </section>

                  {/* Issue / Title */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Issue Summary</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selected.title || selected.call_issue_details || "—"}
                    </p>
                  </section>

                  {/* Linked site call */}
                  {selected.site_call_id && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Linked Site Call</h3>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                          <p className="font-mono font-semibold text-gray-800 text-sm">{selected.call_no || `SC-${selected.site_call_id}`}</p>
                          <p className="text-xs text-gray-500">{selected.call_type || "Online Support"}</p>
                        </div>
                        <button
                          onClick={() => navigate("/plc-automation/site-calls")}
                          className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-50"
                        >
                          View Call <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Editable: Priority */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</h3>
                    <div className="flex gap-2 flex-wrap">
                      {["Critical", "High", "Medium", "Low"].map(p => (
                        <button
                          key={p}
                          onClick={() => setEditPriority(p)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            editPriority === p
                              ? (PRIORITY_META[p]?.bg ?? "bg-gray-100") + " " + (PRIORITY_META[p]?.color ?? "text-gray-700") + " ring-2 ring-violet-400"
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Editable: Assigned to */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" /> Assigned To
                    </h3>
                    <input
                      value={editAssigned}
                      onChange={e => setEditAssigned(e.target.value)}
                      placeholder="Enter name or email…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </section>

                  {/* Editable: Notes */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <StickyNote className="w-3 h-3" /> Notes
                    </h3>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={4}
                      placeholder="Add internal notes, follow-up actions…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                  </section>

                  {/* Status info (read-only — driven by site call) */}
                  <section className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                    <p className="text-xs text-violet-700 font-medium">
                      Status is automatically synced from the linked Online Support Call.
                      To change the status, update it on the{" "}
                      <button
                        onClick={() => navigate("/plc-automation/site-calls")}
                        className="underline hover:text-violet-900"
                      >
                        Site Calls page
                      </button>.
                    </p>
                  </section>
                </>
              )}
            </div>

            {/* Save button */}
            <div className="px-5 py-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
