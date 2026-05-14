import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  Ticket, Search, RefreshCw, ExternalLink, Plus, Loader2,
  AlertCircle, Clock, CheckCircle2, Flame, ArrowUpCircle,
  Minus, X, Save, User, StickyNote, ChevronDown, UserCheck,
  Calendar, Hash, Info, Paperclip, ImageIcon, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Theme ─────────────────────────────────────────────────────────────────────
// Navy blue palette matching company theme
const NAV = {
  solid:       "bg-[#1a3068]",
  solidHover:  "hover:bg-[#152554]",
  solidText:   "text-white",
  light:       "bg-blue-50",
  lightBorder: "border-blue-200",
  lightText:   "text-[#1a3068]",
  ring:        "focus:ring-[#1a3068]/30 focus:border-[#1a3068]",
  badge:       "bg-[#1a3068] text-white",
  pill:        "bg-blue-100 text-[#1a3068]",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project { code: string; name: string; label: string; status?: string }

interface TicketImage { name: string; data: string }

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
  images?: TicketImage[] | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, { color: string; bg: string; ring: string; border: string; icon: typeof Flame }> = {
  Critical: { color: "text-red-700",    bg: "bg-red-50",    ring: "ring-red-400",    border: "border-red-300",    icon: Flame         },
  High:     { color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-300", border: "border-orange-300", icon: ArrowUpCircle },
  Medium:   { color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-300",  border: "border-amber-200",  icon: Minus         },
  Low:      { color: "text-gray-500",   bg: "bg-gray-100",  ring: "ring-gray-300",   border: "border-gray-200",   icon: Minus         },
};

const STATUS_CFG: Record<string, {
  label: string; col: string; header: string; badge: string; empty: string; icon: typeof CheckCircle2;
}> = {
  Open:          { label: "Open",        col: "bg-red-50 border-red-200",      header: "text-red-800 bg-red-100",     badge: "bg-red-600",       empty: "No open tickets",  icon: AlertCircle  },
  "In Progress": { label: "In Progress", col: "bg-amber-50 border-amber-200",  header: "text-amber-900 bg-amber-100", badge: "bg-amber-500",     empty: "None in progress", icon: Clock        },
  Closed:        { label: "Closed",      col: "bg-slate-50 border-slate-200",  header: "text-slate-700 bg-slate-100", badge: "bg-[#1a3068]",     empty: "No closed tickets",icon: CheckCircle2 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ERP Project Dropdown ──────────────────────────────────────────────────────

function ProjectDropdown({ value, projectName, onChange }: {
  value: string; projectName: string; onChange: (p: Project) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [q, setQ]               = useState(value || projectName || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(false);
  const [erpFailed, setErpFailed] = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/workshop/erp-projects`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); if (!(d.projects ?? []).length) setErpFailed(true); })
      .catch(() => setErpFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = q.trim() ? projects.filter(p => p.label.toLowerCase().includes(q.toLowerCase())) : projects;

  const pick = (p: Project) => { picked.current = true; onChange(p); setQ(p.label); setOpen(false); };

  const commitFreeText = () => {
    if (picked.current) { picked.current = false; return; }
    if (q.trim()) {
      const parts = q.trim().split(" - ");
      const code = parts.length > 1 ? parts[0].trim() : "";
      const name = parts.length > 1 ? parts.slice(1).join(" - ").trim() : q.trim();
      onChange({ code, name, label: q.trim() });
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className={cn("flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#1a3068]/30 focus-within:border-[#1a3068] bg-white")}>
        <input
          className="flex-1 px-3 py-2.5 text-sm bg-white outline-none"
          placeholder={erpFailed ? "Type: WTT-001 - Project Name…" : "Search ERP project…"}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange({ code: "", name: e.target.value, label: e.target.value }); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(commitFreeText, 150)}
          onKeyDown={e => { if (e.key === "Enter") commitFreeText(); }}
        />
        <button type="button" onClick={() => setOpen(v => !v)} className="px-3 text-gray-400 hover:text-gray-600">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
          {filtered.map(p => (
            <button key={p.code} type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
              onMouseDown={() => { picked.current = true; }} onClick={() => pick(p)}
            >
              <span className="font-mono text-xs text-[#1a3068] shrink-0 font-bold">{p.code}</span>
              <span className="text-gray-800 truncate">{p.name}</span>
              {p.status === "Completed" && (
                <span className="ml-auto text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">Done</span>
              )}
            </button>
          ))}
        </div>
      )}
      {erpFailed && !open && (
        <p className="text-[10px] text-amber-600 mt-1">ERP unavailable — type project details manually</p>
      )}
    </div>
  );
}

// ── Priority Pill ─────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", c.color, c.bg, c.border)}>
      <Icon className="w-2.5 h-2.5" /> {priority}
    </span>
  );
}

// ── Image Attachment Strip ─────────────────────────────────────────────────────

function ImagePicker({ images, onChange }: { images: TicketImage[]; onChange: (imgs: TicketImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const newImgs: TicketImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const data = await fileToBase64(file);
      newImgs.push({ name: file.name, data });
    }
    onChange([...images, ...newImgs]);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-[#1a3068]/30 text-[#1a3068] text-xs font-semibold hover:bg-blue-50 transition-colors")}>
          <Paperclip className="w-3.5 h-3.5" />
          Attach Images
        </button>
        {images.length > 0 && (
          <span className="text-xs text-gray-500">{images.length} image{images.length > 1 ? "s" : ""} selected</span>
        )}
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
              <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
              <button type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => addFiles(e.target.files)} />
    </div>
  );
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick, active }: { ticket: SupportTicket; onClick: () => void; active: boolean }) {
  const callAssigned = attendedNames(ticket.call_attended_by);
  const hasImages = ticket.images && ticket.images.length > 0;
  return (
    <div onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all",
        active ? "ring-2 ring-[#1a3068] border-[#1a3068]/40 shadow-md" : "border-gray-200 hover:border-[#1a3068]/30"
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <span className="font-mono text-[10px] font-bold text-[#1a3068] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
          {ticket.ticket_no}
        </span>
        <PriorityDot priority={ticket.priority} />
      </div>

      {ticket.project_name && (
        <p className="text-[11px] font-bold text-gray-800 truncate mb-0.5">{ticket.project_name}</p>
      )}
      {ticket.project_number && (
        <p className="text-[10px] text-gray-400 font-mono mb-1">{ticket.project_number}</p>
      )}

      <p className="text-xs text-gray-700 leading-snug line-clamp-2 mb-2">
        {ticket.title || <span className="text-gray-400 italic">No description</span>}
      </p>

      <div className="flex flex-col gap-0.5">
        {ticket.created_by && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-500 truncate">By: {ticket.created_by}</span>
          </div>
        )}
        {callAssigned && (
          <div className="flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-[#1a3068] shrink-0" />
            <span className="text-[10px] text-[#1a3068] font-semibold truncate">{callAssigned}</span>
          </div>
        )}
        {ticket.call_no && (
          <div className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-gray-300 shrink-0" />
            <span className="text-[10px] text-gray-400 truncate">{ticket.call_no}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-300 shrink-0" />
            <span className="text-[10px] text-gray-400">{fmtDate(ticket.created_at)}</span>
          </div>
          {hasImages && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <ImageIcon className="w-3 h-3" /> {ticket.images!.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function Column({ status, tickets, selected, onSelect }: {
  status: string; tickets: SupportTicket[]; selected: SupportTicket | null; onSelect: (t: SupportTicket) => void;
}) {
  const cfg = STATUS_CFG[status]!;
  const Icon = cfg.icon;
  return (
    <div className={cn("flex flex-col rounded-2xl border overflow-hidden h-full", cfg.col)}>
      <div className={cn("flex items-center gap-2 px-3 py-2.5 shrink-0 border-b border-black/5 font-semibold text-sm", cfg.header)}>
        <Icon className="w-4 h-4" />
        {cfg.label}
        <span className={cn("ml-auto text-white text-xs font-bold px-2 py-0.5 rounded-full", cfg.badge)}>{tickets.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tickets.length === 0
          ? <p className="text-center text-xs text-gray-400 py-8 italic">{cfg.empty}</p>
          : tickets.map(t => <TicketCard key={t.id} ticket={t} active={selected?.id === t.id} onClick={() => onSelect(t)} />)
        }
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

const BLANK = { project_number: "", project_name: "", title: "", priority: "Medium", notes: "" };

function CreateModal({ createdBy, onClose, onCreated }: {
  createdBy: string; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm]       = useState({ ...BLANK });
  const [images, setImages]   = useState<TicketImage[]>([]);
  const [saving, setSaving]   = useState(false);
  const [existing, setExisting] = useState<SupportTicket[]>([]);
  const [checking, setChecking] = useState(false);

  const onProjectPick = async (p: Project) => {
    setForm(prev => ({ ...prev, project_number: p.code, project_name: p.name }));
    const q = p.name || p.code;
    if (!q) { setExisting([]); return; }
    setChecking(true);
    try {
      const res  = await fetch(`${BASE}/api/plc/support-tickets?search=${encodeURIComponent(q)}`);
      const json = await res.json();
      setExisting((json.data ?? []).filter((t: SupportTicket) => t.status !== "Closed"));
    } catch { setExisting([]); }
    setChecking(false);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/plc/support-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, created_by: createdBy, images }),
      });
      if (res.ok) { onCreated(); onClose(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm", NAV.solid)}>
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">New Support Ticket</h2>
              <p className="text-xs text-gray-500">Raise a request for the PLC team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Created By — auto */}
          <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border", NAV.light, NAV.lightBorder)}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", NAV.solid)}>
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#1a3068]/70 uppercase tracking-wider">Created By</p>
              <p className="text-sm font-bold text-[#1a3068]">{createdBy || "Unknown User"}</p>
            </div>
            <span className="text-[10px] font-semibold text-[#1a3068]/60 bg-[#1a3068]/10 px-2 py-0.5 rounded-full shrink-0">Auto</span>
          </div>

          {/* Issue Summary */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Issue Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              rows={4}
              placeholder="Describe the problem clearly — what failed, when it started, what error or symptom is visible…"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Project</label>
            <ProjectDropdown value={form.project_number} projectName={form.project_name} onChange={onProjectPick} />

            {checking && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking existing tickets…
              </div>
            )}
            {!checking && existing.length > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-800">{existing.length} active ticket(s) already exist for this project</p>
                </div>
                <div className="space-y-1.5">
                  {existing.map(t => (
                    <div key={t.id} className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2">
                      <span className="font-mono text-[10px] font-bold text-[#1a3068] shrink-0">{t.ticket_no}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                        t.status === "Open" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>{t.status}</span>
                      <PriorityDot priority={t.priority} />
                      <span className="text-xs text-gray-600 truncate">{t.title || "—"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-2">You can still create a new ticket if this is a different issue.</p>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {["Critical", "High", "Medium", "Low"].map(p => {
                const c = PRIORITY_CFG[p];
                const active = form.priority === p;
                return (
                  <button key={p} type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1.5",
                      active ? `${c.bg} ${c.color} ${c.border} ring-2 ${c.ring}` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <c.icon className="w-4 h-4" />
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Any additional context, urgency, previous call references…"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Attach Images <span className="text-gray-400 font-normal normal-case">(photos of issue, error screens, etc.)</span>
            </label>
            <ImagePicker images={images} onChange={setImages} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.title.trim()}
            className={cn("flex-[2] flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl disabled:opacity-50 shadow-sm", NAV.solid, NAV.solidHover, NAV.solidText)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
            {saving ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Image Viewer ──────────────────────────────────────────────────────────────

function ImageViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <img src={src} alt={name} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        <button onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full">
          <X className="w-4 h-4" />
        </button>
        <p className="text-center text-white text-xs mt-2 opacity-70">{name}</p>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ ticket, onClose, onSaved }: {
  ticket: SupportTicket;
  onClose: () => void;
  onSaved: (updates: Partial<SupportTicket>) => void;
}) {
  const [, navigate]       = useLocation();
  const [editPriority, setEditPriority] = useState(ticket.priority);
  const [editNotes,    setEditNotes]    = useState(ticket.notes ?? "");
  const [editImages,   setEditImages]   = useState<TicketImage[]>(ticket.images ?? []);
  const [saving,       setSaving]       = useState(false);
  const [lightboxImg,  setLightboxImg]  = useState<TicketImage | null>(null);
  const callAssigned = attendedNames(ticket.call_attended_by);

  useEffect(() => {
    setEditPriority(ticket.priority);
    setEditNotes(ticket.notes ?? "");
    setEditImages(ticket.images ?? []);
  }, [ticket.id, ticket.priority, ticket.notes, ticket.images]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/plc/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: editPriority, notes: editNotes, images: editImages }),
      });
      onSaved({ priority: editPriority, notes: editNotes, images: editImages });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const statusColor = ticket.status === "Open" ? "text-red-700 bg-red-100"
    : ticket.status === "In Progress" ? "text-amber-800 bg-amber-100"
    : "text-[#1a3068] bg-blue-100";
  const StatusIcon = ticket.status === "Open" ? AlertCircle : ticket.status === "In Progress" ? Clock : CheckCircle2;

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between shrink-0 bg-gray-50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-[#1a3068]">{ticket.ticket_no}</span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", statusColor)}>
                <StatusIcon className="w-2.5 h-2.5" /> {ticket.status}
              </span>
              <PriorityDot priority={editPriority} />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Updated {fmt(ticket.updated_at)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg shrink-0 ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Project */}
          {(ticket.project_name || ticket.project_number) && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Project</p>
              <p className="font-bold text-gray-900 text-sm">{ticket.project_name || "—"}</p>
              {ticket.project_number && <p className="text-xs text-gray-400 font-mono">{ticket.project_number}</p>}
            </section>
          )}

          {/* Issue */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Issue Summary</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.title || "—"}</p>
          </section>

          {/* People */}
          <section className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2.5">
            {ticket.created_by && (
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-[#1a3068]/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-[#1a3068]/60 uppercase tracking-wide font-bold">Created By</p>
                  <p className="text-xs font-bold text-[#1a3068]">{ticket.created_by}</p>
                </div>
              </div>
            )}
            {callAssigned ? (
              <div className="flex items-start gap-2">
                <UserCheck className="w-3.5 h-3.5 text-[#1a3068] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-[#1a3068]/60 uppercase tracking-wide font-bold">Assigned (from Site Call)</p>
                  <p className="text-xs font-bold text-[#1a3068]">{callAssigned}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 opacity-60">
                <UserCheck className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Assigned To</p>
                  <p className="text-xs text-gray-400 italic">Will be assigned when PLC team starts site call</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Created</p>
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
                  <p className="font-mono font-bold text-[#1a3068] text-sm">{ticket.call_no || `SC-${ticket.site_call_id}`}</p>
                  <p className="text-[10px] text-[#1a3068]/60">{ticket.call_status ?? ticket.call_type ?? "Online Support"}</p>
                </div>
                <button onClick={() => navigate("/plc-automation/site-calls")}
                  className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg", NAV.lightText, "hover:bg-blue-100")}>
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </section>
          )}

          {/* Edit: Priority */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority</p>
            <div className="flex gap-1.5">
              {["Critical", "High", "Medium", "Low"].map(p => {
                const c = PRIORITY_CFG[p];
                return (
                  <button key={p} onClick={() => setEditPriority(p)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                      editPriority === p ? `${c.bg} ${c.color} ${c.border} ring-2 ${c.ring}` : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                    )}>
                    {p}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Edit: Notes */}
          <section>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</span>
            </label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
              placeholder="Follow-up actions, observations…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none"
            />
          </section>

          {/* Images */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Attached Images
            </p>
            {editImages.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {editImages.map((img, i) => (
                  <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                    <img src={img.data} alt={img.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxImg(img)}
                    />
                    <button
                      onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic mb-2">No images attached</p>
            )}
            <ImagePicker images={editImages} onChange={setEditImages} />
          </section>

          {!ticket.site_call_id && (
            <div className={cn("p-3 rounded-xl border", NAV.light, NAV.lightBorder)}>
              <p className="text-xs text-[#1a3068] leading-relaxed">
                Status updates automatically when the PLC team starts a site call linked to this ticket.
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button onClick={save} disabled={saving}
            className={cn("w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl disabled:opacity-50", NAV.solid, NAV.solidHover, NAV.solidText)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {lightboxImg && <ImageViewer src={lightboxImg.data} name={lightboxImg.name} onClose={() => setLightboxImg(null)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PLCSupportTickets() {
  const { user }  = useAuth();
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected]   = useState<SupportTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const createdBy = user?.full_name || user?.email || "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search);
      const res  = await fetch(`${BASE}/api/plc/support-tickets?${params}`);
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const byStatus = (s: string) => tickets.filter(t => t.status === s);
  const counts = { open: byStatus("Open").length, inProgress: byStatus("In Progress").length, closed: byStatus("Closed").length };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shadow-sm", NAV.solid)}>
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Support Tickets</h1>
                <p className="text-[11px] text-gray-500">PLC team tracking board</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">{counts.open} Open</span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">{counts.inProgress} In Progress</span>
                <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", NAV.pill)}>{counts.closed} Closed</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] w-44" />
              </div>
              <button onClick={load} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button onClick={() => setShowCreate(true)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg", NAV.solid, NAV.solidHover, NAV.solidText)}>
                <Plus className="w-4 h-4" /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex gap-3 p-3 overflow-hidden flex-1">

            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <Column status="Open" tickets={byStatus("Open")} selected={selected} onSelect={setSelected} />
            </div>

            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <Column status="In Progress" tickets={byStatus("In Progress")} selected={selected} onSelect={setSelected} />
            </div>

            {/* Closed — collapsible */}
            <div className={cn("flex flex-col min-w-0 min-h-0 transition-all duration-200", showClosed ? "flex-1" : "w-9 shrink-0")}>
              {showClosed ? (
                <div className="flex flex-col h-full min-h-0 gap-2">
                  <Column status="Closed" tickets={byStatus("Closed")} selected={selected} onSelect={setSelected} />
                  <button onClick={() => setShowClosed(false)}
                    className="text-[10px] text-[#1a3068] hover:text-[#152554] underline text-center shrink-0">
                    Collapse closed
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowClosed(true)}
                  className={cn("h-full w-9 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-colors", NAV.light, NAV.lightBorder, "hover:bg-blue-100")}
                  title={`Show ${counts.closed} closed tickets`}>
                  <ChevronDown className="w-4 h-4 text-[#1a3068] -rotate-90" />
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", NAV.pill)}>{counts.closed}</span>
                  <span className="text-[9px] font-bold text-[#1a3068] uppercase tracking-widest [writing-mode:vertical-lr]">Closed</span>
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

        {showCreate && (
          <CreateModal
            createdBy={createdBy}
            onClose={() => setShowCreate(false)}
            onCreated={() => load()}
          />
        )}
      </div>
    </Layout>
  );
}
