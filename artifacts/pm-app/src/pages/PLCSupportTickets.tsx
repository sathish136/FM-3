import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  Ticket, Search, RefreshCw, ExternalLink, Plus, Loader2,
  AlertCircle, Clock, CheckCircle2, Flame, ArrowUpCircle,
  Minus, X, Save, User, StickyNote, ChevronDown, UserCheck,
  Calendar, Info, Paperclip, ImageIcon, Trash2, Filter,
  Building2, Link2, CalendarCheck, Wrench, Printer, ArrowLeft,
  Circle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_BASE = "https://erp.wttint.com";

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

interface Project { code: string; name: string; label: string; status?: string }
interface TicketImage { name: string; data: string }
interface SupportTicket {
  id: number;
  ticket_no: string;
  erp_name: string | null;
  source: string | null;
  site_call_id: number | null;
  project_number: string | null;
  project_name: string | null;
  title: string | null;
  priority: string;
  status: string;
  erp_status: string | null;
  assigned_to: string | null;
  assigned_person_name: string | null;
  assigned_person_dept: string | null;
  notes: string | null;
  ticket_date: string | null;
  expected_completion_date: string | null;
  root_cause: string | null;
  ticket_description: string | null;
  supplier: string | null;
  reference: string | null;
  attach_image_1: string | null;
  attach_image_2: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  call_no: string | null;
  call_type: string | null;
  call_status: string | null;
  call_attended_by?: Array<{ name: string }> | null;
  images?: TicketImage[] | null;
}

const PRIORITY_CFG: Record<string, { color: string; bg: string; ring: string; border: string; icon: typeof Flame }> = {
  Critical: { color: "text-red-700",    bg: "bg-red-50",    ring: "ring-red-400",    border: "border-red-300",    icon: Flame         },
  High:     { color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-300", border: "border-orange-300", icon: ArrowUpCircle },
  Medium:   { color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-300",  border: "border-amber-200",  icon: Minus         },
  Low:      { color: "text-gray-500",   bg: "bg-gray-100",  ring: "ring-gray-300",   border: "border-gray-200",   icon: Minus         },
};

const STATUS_CFG: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  Open:          { label: "Open",        badge: "bg-red-100 text-red-700",     icon: AlertCircle  },
  "In Progress": { label: "In Progress", badge: "bg-amber-100 text-amber-800", icon: Clock        },
  Closed:        { label: "Closed",      badge: "bg-blue-100 text-[#1a3068]",  icon: CheckCircle2 },
};

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return dt ?? "—"; }
}
function fmtDate(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
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

function PriorityPill({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority];
  if (!c) return <span className="text-gray-400 text-xs">—</span>;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", c.color, c.bg, c.border)}>
      <Icon className="w-2.5 h-2.5" /> {priority}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return <span className="text-gray-400 text-xs">{status}</span>;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", cfg.badge)}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function SourceBadge({ source, erpName }: { source: string | null; erpName: string | null }) {
  if (source === "erp" && erpName) {
    return (
      <a href={`${ERP_BASE}/app/site-ticket/${encodeURIComponent(erpName)}`} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 whitespace-nowrap">
        <Link2 className="w-2.5 h-2.5" /> ERP
      </a>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
      Local
    </span>
  );
}

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
          <Paperclip className="w-3.5 h-3.5" /> Attach Images
        </button>
        {images.length > 0 && <span className="text-xs text-gray-500">{images.length} image{images.length > 1 ? "s" : ""} selected</span>}
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
              <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
    </div>
  );
}

function ImageViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <img src={src} alt={name} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full">
          <X className="w-4 h-4" />
        </button>
        <p className="text-center text-white text-xs mt-2 opacity-70">{name}</p>
      </div>
    </div>
  );
}

// ── ERP Image link helper ──────────────────────────────────────────────────────
function ErpImageLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  const fullUrl = url.startsWith("http") ? url : `${ERP_BASE}${url}`;
  return (
    <a href={fullUrl} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-[#1a3068] underline hover:text-blue-700">
      <ImageIcon className="w-3 h-3" /> {label}
    </a>
  );
}

// ── Full-page Ticket Detail ────────────────────────────────────────────────────
function TicketDetailPage({ ticket, onBack, onSaved }: {
  ticket: SupportTicket;
  onBack: () => void;
  onSaved: (updates: Partial<SupportTicket>) => void;
}) {
  const [, navigate]       = useLocation();
  const [editPriority, setEditPriority] = useState(ticket.priority);
  const [editStatus,   setEditStatus]   = useState(ticket.status);
  const [editNotes,    setEditNotes]    = useState(ticket.notes ?? "");
  const [editImages,   setEditImages]   = useState<TicketImage[]>(ticket.images ?? []);
  const [saving,       setSaving]       = useState(false);
  const [lightboxImg,  setLightboxImg]  = useState<TicketImage | null>(null);
  const callAssigned = attendedNames(ticket.call_attended_by);
  const isErp = ticket.source === "erp";

  useEffect(() => {
    setEditPriority(ticket.priority);
    setEditStatus(ticket.status);
    setEditNotes(ticket.notes ?? "");
    setEditImages(ticket.images ?? []);
  }, [ticket.id]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/plc/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: editPriority, status: editStatus, notes: editNotes, images: editImages }),
      });
      onSaved({ priority: editPriority, status: editStatus, notes: editNotes, images: editImages });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const statusCfg: Record<string, { color: string; bg: string; border: string; icon: typeof Circle }> = {
    "Open":        { color: "text-red-700",   bg: "bg-red-100",    border: "border-red-300",   icon: AlertCircle  },
    "In Progress": { color: "text-amber-800", bg: "bg-amber-100",  border: "border-amber-300", icon: Clock        },
    "Closed":      { color: "text-[#1a3068]", bg: "bg-blue-100",   border: "border-blue-300",  icon: CheckCircle2 },
  };

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden">
      {/* Top action bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
          <span className="text-gray-300">|</span>
          <span className="font-mono font-bold text-[#1a3068]">{ticket.erp_name || ticket.ticket_no}</span>
          <SourceBadge source={ticket.source} erpName={ticket.erp_name} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={save} disabled={saving}
            className={cn("flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-lg disabled:opacity-50 shadow-sm", NAV.solid, NAV.solidHover, NAV.solidText)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">

          {/* Ticket header card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-bold text-[#1a3068] text-lg">{ticket.erp_name || ticket.ticket_no}</span>
                  <PriorityPill priority={editPriority} />
                  <SourceBadge source={ticket.source} erpName={ticket.erp_name} />
                </div>
                <h2 className="text-base font-bold text-gray-900 leading-snug mt-1">{ticket.title || "—"}</h2>
                {ticket.project_name && (
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-semibold text-gray-700">{ticket.project_name}</span>
                    {ticket.project_number && <span className="font-mono text-xs text-gray-400 ml-1">({ticket.project_number})</span>}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">Updated {fmt(ticket.updated_at)}</p>
              </div>
              {/* Status selector */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                <div className="flex gap-1.5">
                  {(["Open", "In Progress", "Closed"] as const).map(s => {
                    const cfg = statusCfg[s];
                    const Icon = cfg.icon;
                    const active = editStatus === s;
                    return (
                      <button key={s} onClick={() => setEditStatus(s)}
                        className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                          active ? cn(cfg.bg, cfg.color, cfg.border, "shadow-sm") : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50")}>
                        <Icon className="w-3.5 h-3.5" /> {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left: details (2/3) */}
            <div className="lg:col-span-2 space-y-5">

              {/* Description */}
              {ticket.ticket_description && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.ticket_description}</p>
                </div>
              )}

              {/* ERP Details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Ticket Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Ticket Date</p>
                    <p className="text-sm text-gray-800">{fmtDate(ticket.ticket_date || ticket.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Expected Completion</p>
                    <p className="text-sm text-gray-800">{ticket.expected_completion_date ? fmtDate(ticket.expected_completion_date) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Supplier</p>
                    <p className="text-sm text-gray-800">{ticket.supplier || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Reference</p>
                    <p className="text-sm text-gray-800">{ticket.reference || "—"}</p>
                  </div>
                  {ticket.root_cause && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Root Cause</p>
                      <p className="text-sm text-gray-800">{ticket.root_cause}</p>
                    </div>
                  )}
                </div>
                {(ticket.attach_image_1 || ticket.attach_image_2) && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <ErpImageLink url={ticket.attach_image_1} label="Attachment 1" />
                    <ErpImageLink url={ticket.attach_image_2} label="Attachment 2" />
                  </div>
                )}
              </div>

              {/* Priority editor */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Priority</p>
                <div className="grid grid-cols-4 gap-2">
                  {["Critical", "High", "Medium", "Low"].map(p => {
                    const c = PRIORITY_CFG[p];
                    return (
                      <button key={p} onClick={() => setEditPriority(p)}
                        className={cn("py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1.5",
                          editPriority === p ? `${c.bg} ${c.color} ${c.border} ring-2 ${c.ring}` : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50")}>
                        <c.icon className="w-4 h-4" /> {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes / Follow-up</span>
                </label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4}
                  placeholder="Follow-up actions, observations, internal notes…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none" />
              </div>

              {/* Images (local tickets) */}
              {!isErp && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Attached Images
                  </p>
                  {editImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editImages.map((img, i) => (
                        <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                          <img src={img.data} alt={img.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxImg(img)} />
                          <button onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ImagePicker images={editImages} onChange={setEditImages} />
                </div>
              )}
            </div>

            {/* Right: people + meta (1/3) */}
            <div className="space-y-5">

              {/* People */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">People</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-[#1a3068]/60 uppercase tracking-wide font-bold mb-0.5">Assigned To</p>
                    <p className="text-sm font-bold text-[#1a3068]">{ticket.assigned_person_name || ticket.assigned_to || "—"}</p>
                    {ticket.assigned_person_dept && <p className="text-xs text-gray-500">{ticket.assigned_person_dept}</p>}
                  </div>
                  {callAssigned && (
                    <div>
                      <p className="text-[10px] text-[#1a3068]/60 uppercase tracking-wide font-bold mb-0.5">Assigned (Site Call)</p>
                      <p className="text-sm font-bold text-[#1a3068]">{callAssigned}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-0.5">Created By</p>
                    <p className="text-sm text-gray-700">{ticket.created_by || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-0.5">Created</p>
                    <p className="text-sm text-gray-700">{fmt(ticket.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* ERP Status */}
              {ticket.erp_status && ticket.erp_status !== ticket.status && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">ERP Status</p>
                  <p className="text-sm font-bold text-emerald-800">{ticket.erp_status}</p>
                </div>
              )}

              {/* Linked site call */}
              {ticket.site_call_id && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Linked Site Call</p>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div>
                      <p className="font-mono font-bold text-[#1a3068] text-sm">{ticket.call_no || `SC-${ticket.site_call_id}`}</p>
                      <p className="text-[10px] text-[#1a3068]/60">{ticket.call_status ?? ticket.call_type ?? "Online Support"}</p>
                    </div>
                    <button onClick={() => navigate("/plc-automation/site-calls")}
                      className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg", NAV.lightText, "hover:bg-blue-100")}>
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* ERP attachments */}
              {isErp && (ticket.attach_image_1 || ticket.attach_image_2) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> ERP Attachments
                  </p>
                  <div className="space-y-1.5">
                    <ErpImageLink url={ticket.attach_image_1} label="Attachment 1" />
                    <ErpImageLink url={ticket.attach_image_2} label="Attachment 2" />
                  </div>
                </div>
              )}

              {!ticket.site_call_id && !isErp && (
                <div className={cn("p-4 rounded-2xl border", NAV.light, NAV.lightBorder)}>
                  <p className="text-xs text-[#1a3068] leading-relaxed">
                    Status updates automatically when the PLC team starts a site call linked to this ticket.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxImg && <ImageViewer src={lightboxImg.data} name={lightboxImg.name} onClose={() => setLightboxImg(null)} />}
    </div>
  );
}

// ── Project Dropdown ──────────────────────────────────────────────────────────
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
        <input className="flex-1 px-3 py-2.5 text-sm bg-white outline-none"
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
              onMouseDown={() => { picked.current = true; }} onClick={() => pick(p)}>
              <span className="font-mono text-xs text-[#1a3068] shrink-0 font-bold">{p.code}</span>
              <span className="text-gray-800 truncate">{p.name}</span>
              {p.status === "Completed" && <span className="ml-auto text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">Done</span>}
            </button>
          ))}
        </div>
      )}
      {erpFailed && !open && <p className="text-[10px] text-amber-600 mt-1">ERP unavailable — type project details manually</p>}
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
const BLANK = { project_number: "", project_name: "", title: "", priority: "Medium", notes: "" };

function CreateModal({ createdBy, onClose, onCreated }: { createdBy: string; onClose: () => void; onCreated: () => void }) {
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm", NAV.solid)}>
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">New Support Ticket</h2>
              <p className="text-xs text-gray-500">Raise a request for the IT team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
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

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Issue Summary <span className="text-red-500">*</span>
            </label>
            <textarea value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} rows={4}
              placeholder="Describe the problem clearly…"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Project</label>
            <ProjectDropdown value={form.project_number} projectName={form.project_name} onChange={onProjectPick} />
            {checking && <div className="mt-2 flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Checking existing tickets…</div>}
            {!checking && existing.length > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-800">{existing.length} active ticket(s) already exist for this project</p>
                </div>
                <div className="space-y-1.5">
                  {existing.map(t => (
                    <div key={t.id} className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2">
                      <span className="font-mono text-[10px] font-bold text-[#1a3068] shrink-0">{t.erp_name || t.ticket_no}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                        t.status === "Open" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{t.status}</span>
                      <PriorityPill priority={t.priority} />
                      <span className="text-xs text-gray-600 truncate">{t.title || "—"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-2">You can still create a new ticket if this is a different issue.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {["Critical", "High", "Medium", "Low"].map(p => {
                const c = PRIORITY_CFG[p];
                const active = form.priority === p;
                return (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={cn("py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1.5",
                      active ? `${c.bg} ${c.color} ${c.border} ring-2 ${c.ring}` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>
                    <c.icon className="w-4 h-4" /> {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Any additional context…"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Attach Images <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <ImagePicker images={images} onChange={setImages} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100">Cancel</button>
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

// ── Table Row ─────────────────────────────────────────────────────────────────
function TicketRow({ ticket, onClick, active }: { ticket: SupportTicket; onClick: () => void; active: boolean }) {
  const callAssigned = attendedNames(ticket.call_attended_by);
  const assignedDisplay = ticket.assigned_person_name || callAssigned || ticket.assigned_to || "";
  const hasImages = (ticket.images && ticket.images.length > 0) || ticket.attach_image_1 || ticket.attach_image_2;
  const imageCount = (ticket.images?.length ?? 0) + (ticket.attach_image_1 ? 1 : 0) + (ticket.attach_image_2 ? 1 : 0);

  return (
    <tr onClick={onClick}
      className={cn("cursor-pointer transition-colors border-b border-gray-100 last:border-0",
        active ? "bg-blue-50" : "hover:bg-gray-50")}>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-[#1a3068]">
            {ticket.erp_name || ticket.ticket_no}
          </span>
          <SourceBadge source={ticket.source} erpName={ticket.erp_name} />
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusPill status={ticket.status} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <PriorityPill priority={ticket.priority} />
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        <p className="text-sm text-gray-800 truncate">{ticket.title || <span className="text-gray-400 italic">No description</span>}</p>
        {ticket.ticket_description && ticket.ticket_description !== ticket.title && (
          <p className="text-[10px] text-gray-400 truncate">{ticket.ticket_description}</p>
        )}
      </td>
      <td className="px-4 py-3 max-w-[160px]">
        {ticket.project_name ? (
          <div>
            <p className="text-xs font-semibold text-gray-700 truncate">{ticket.project_name}</p>
            {ticket.project_number && <p className="text-[10px] text-gray-400 font-mono">{ticket.project_number}</p>}
          </div>
        ) : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {assignedDisplay ? (
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-[#1a3068] shrink-0" />
            <span className="text-xs text-[#1a3068] font-semibold truncate max-w-[110px]">{assignedDisplay}</span>
          </div>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {ticket.root_cause ? (
          <span className="text-xs text-gray-600 truncate max-w-[100px] block">{ticket.root_cause}</span>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Calendar className="w-3 h-3 shrink-0" />
            {fmtDate(ticket.ticket_date || ticket.created_at)}
          </div>
          {ticket.expected_completion_date && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600">
              <CalendarCheck className="w-3 h-3 shrink-0" />
              {fmtDate(ticket.expected_completion_date)}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {hasImages ? (
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <ImageIcon className="w-3.5 h-3.5" /> <span>{imageCount}</span>
          </div>
        ) : <span className="text-gray-200 text-xs">—</span>}
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const STATUS_FILTERS = ["All", "Open", "In Progress", "Closed"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];
const PRIORITY_FILTERS = ["All", "Critical", "High", "Medium", "Low"] as const;
type PriorityFilter = typeof PRIORITY_FILTERS[number];
const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Newest First" },
  { value: "created_at_asc",  label: "Oldest First" },
  { value: "priority_desc",   label: "Priority ↑" },
  { value: "status_asc",      label: "Status" },
] as const;
type SortOption = typeof SORT_OPTIONS[number]["value"];

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function PLCSupportTickets() {
  const { user }  = useAuth();
  const [tickets, setTickets]           = useState<SupportTicket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search,  setSearch]            = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [sortBy, setSortBy]             = useState<SortOption>("created_at_desc");
  const [selected, setSelected]         = useState<SupportTicket | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState<string | null>(null);

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

  // Auto-sync ERP on mount (silent)
  useEffect(() => {
    setSyncing(true);
    fetch(`${BASE}/api/plc/support-tickets/sync-erp`, { method: "POST" })
      .then(r => r.json())
      .then(json => { if (json.ok) load(); })
      .catch(() => {})
      .finally(() => setSyncing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = {
    all:        tickets.length,
    open:       tickets.filter(t => t.status === "Open").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    closed:     tickets.filter(t => t.status === "Closed").length,
  };

  const filtered = [...tickets]
    .filter(t => statusFilter === "All" || t.status === statusFilter)
    .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
    .sort((a, b) => {
      if (sortBy === "created_at_asc")  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "priority_desc")   return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (sortBy === "status_asc")      return (a.status ?? "").localeCompare(b.status ?? "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // default desc
    });

  // ── when a ticket is selected, show full-page detail (no modal) ──
  if (selected) {
    return (
      <Layout>
        <TicketDetailPage
          ticket={selected}
          onBack={() => setSelected(null)}
          onSaved={updates => {
            setSelected(prev => prev ? { ...prev, ...updates } : prev);
            setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, ...updates } : t));
          }}
        />
        {showCreate && <CreateModal createdBy={createdBy} onClose={() => setShowCreate(false)} onCreated={() => load()} />}
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shadow-sm", NAV.solid)}>
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">PLC &amp; Automation Tickets</h1>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  PLC &amp; Automation · Site Tickets
                  {syncing && <><Loader2 className="w-3 h-3 animate-spin text-emerald-500" /><span className="text-emerald-500">Syncing ERP…</span></>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3068]/30 focus:border-[#1a3068] w-44" />
              </div>
              <button onClick={load} title="Refresh" className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button onClick={() => setShowCreate(true)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg", NAV.solid, NAV.solidHover, NAV.solidText)}>
                <Plus className="w-4 h-4" /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Filter + Sort bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-2 shrink-0 flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400 mr-0.5" />
            {STATUS_FILTERS.map(s => {
              const count = s === "All" ? counts.all : s === "Open" ? counts.open : s === "In Progress" ? counts.inProgress : counts.closed;
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    active
                      ? s === "Open" ? "bg-red-100 text-red-700"
                        : s === "In Progress" ? "bg-amber-100 text-amber-800"
                        : s === "Closed" ? "bg-blue-100 text-[#1a3068]"
                        : cn(NAV.solid, NAV.solidText)
                      : "text-gray-500 hover:bg-gray-100")}>
                  {s}
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    active
                      ? s === "Open" ? "bg-red-200 text-red-800"
                        : s === "In Progress" ? "bg-amber-200 text-amber-900"
                        : s === "Closed" ? "bg-blue-200 text-[#1a3068]"
                        : "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500")}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Priority filter */}
          <div className="flex items-center gap-1">
            {PRIORITY_FILTERS.map(p => {
              const active = priorityFilter === p;
              const cfg = p !== "All" ? PRIORITY_CFG[p] : null;
              return (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                    active
                      ? p === "All" ? cn(NAV.solid, NAV.solidText)
                        : cn(cfg!.bg, cfg!.color, "border", cfg!.border)
                      : "text-gray-400 hover:bg-gray-100")}>
                  {p}
                </button>
              );
            })}
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1 ml-auto" />

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1a3068]/20 bg-white cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table — full width always */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading tickets…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
              <Ticket className="w-8 h-8 opacity-30" />
              <p className="text-sm">No tickets found</p>
              <p className="text-xs text-gray-300">Click "Sync ERP" to pull tickets from ERPNext</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> Assigned</span>
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Root Cause</span>
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date / ETA</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    <ImageIcon className="w-3 h-3 inline" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filtered.map(t => (
                  <TicketRow key={t.id} ticket={t} active={selected?.id === t.id}
                    onClick={() => setSelected(t)} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showCreate && (
          <CreateModal createdBy={createdBy} onClose={() => setShowCreate(false)} onCreated={() => load()} />
        )}
      </div>
    </Layout>
  );
}
