import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import type { ReactNode } from "react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Rocket, PenTool, ShoppingCart, Wrench, Truck, Cpu, Plus, Trash2,
  Calendar, AlertTriangle, CheckCircle2, Clock, Loader2, X,
  Search, ChevronDown, ChevronRight, RefreshCw, MessageSquare, Sparkles, FileText,
  User, UserCheck, AlertCircle, TrendingUp, Activity, Flag, Target, Zap,
  PlayCircle, Hourglass, IndianRupee, Building2, Brain, Copy, Download, Printer,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;
const ERP_BASE = "https://erp.wttint.com";

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage = "kickoff" | "design" | "purchase" | "workshop" | "shipment" | "commissioning";
type Status = "pending" | "in_progress" | "completed" | "delayed";

interface Milestone {
  id: number;
  project: string;
  stage: Stage;
  department: string;
  title: string;
  description: string;
  status: Status;
  planned_date: string | null;
  actual_date: string | null;
  owner: string;
  created_by: string;
  responsible_person: string;
  challenges: string;
  sort_order: number;
  created_at?: string;
  updated_at: string;
}

interface DiscussionNote {
  id: number;
  project: string;
  meeting_date: string | null;
  title: string;
  body: string;
  created_at: string;
}

interface ProjectOption {
  name: string;
  project_name?: string;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
  estimatedCosting?: number;
  actualExpense?: number;
  progress?: number;
  status?: string;
  department?: string | null;
  createdAt?: string | null;
}

interface ErpUser {
  email: string;
  full_name: string;
  user_image: string | null;
  enabled?: number;
}

// ─── Stage metadata ──────────────────────────────────────────────────────────

const STAGES: Array<{
  key: Stage;
  label: string;
  short: string;
  icon: typeof Rocket;
  color: string;
  bg: string;
  border: string;
  ring: string;
  hex: string;     // for inline styles (gantt, pipeline)
  hexLight: string;
  desc: string;
}> = [
  { key: "kickoff",       label: "Project Kickoff",  short: "Kickoff",       icon: Rocket,       color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    ring: "ring-blue-300",    hex: "#2563eb", hexLight: "#dbeafe", desc: "Scope freeze, customer PO, kickoff meeting" },
  { key: "design",        label: "Design",           short: "Design",        icon: PenTool,      color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  ring: "ring-violet-300",  hex: "#7c3aed", hexLight: "#ede9fe", desc: "Process · Mechanical · Electrical · Instrument" },
  { key: "purchase",      label: "Purchase",         short: "Purchase",      icon: ShoppingCart, color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   ring: "ring-amber-300",   hex: "#d97706", hexLight: "#fef3c7", desc: "MR, PO, vendor follow-up, payments" },
  { key: "workshop",      label: "Workshop",         short: "Workshop",      icon: Wrench,       color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200",  ring: "ring-orange-300",  hex: "#ea580c", hexLight: "#ffedd5", desc: "Fabrication, fit-up, painting, inspection" },
  { key: "shipment",      label: "Shipment",         short: "Shipment",      icon: Truck,        color: "text-cyan-700",    bg: "bg-cyan-50",    border: "border-cyan-200",    ring: "ring-cyan-300",    hex: "#0891b2", hexLight: "#cffafe", desc: "Pre-dispatch, packing, dispatch, site receipt" },
  { key: "commissioning", label: "Commissioning",    short: "Commission",    icon: Cpu,          color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-300", hex: "#059669", hexLight: "#d1fae5", desc: "Erection, panel, PLC/SCADA, performance run, handover" },
];

const STAGE_META: Record<Stage, (typeof STAGES)[number]> = STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<Stage, (typeof STAGES)[number]>,
);

const STATUS_META: Record<Status, { label: string; pill: string; dot: string; icon: typeof Clock }> = {
  pending:     { label: "Pending",     pill: "bg-gray-100 text-gray-700 border-gray-200",       dot: "bg-gray-400",   icon: Clock },
  in_progress: { label: "In Progress", pill: "bg-blue-100 text-blue-800 border-blue-200",       dot: "bg-blue-500",   icon: PlayCircle },
  completed:   { label: "Completed",   pill: "bg-green-100 text-green-800 border-green-200",    dot: "bg-green-500",  icon: CheckCircle2 },
  delayed:     { label: "Delayed",     pill: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-500",    icon: AlertTriangle },
};

// ─── Date helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  return Math.round((bd - ad) / 86400000);
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtINR(n: number): string {
  if (!n || !isFinite(n)) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtINRFull(n: number): string {
  if (!n || !isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ─── User avatar helpers ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-red-500","bg-orange-500","bg-amber-500","bg-yellow-500","bg-lime-500",
  "bg-green-500","bg-emerald-500","bg-teal-500","bg-cyan-500","bg-sky-500",
  "bg-blue-500","bg-indigo-500","bg-violet-500","bg-purple-500","bg-fuchsia-500",
  "bg-pink-500","bg-rose-500",
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || "?").slice(0, 2).toUpperCase();
}

function UserAvatar({ user, size = "md" }: { user: ErpUser | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => { setImgErr(false); }, [user?.user_image]);
  const dim =
    size === "lg" ? "w-10 h-10 text-sm" :
    size === "md" ? "w-8 h-8 text-xs" :
    size === "sm" ? "w-6 h-6 text-[10px]" :
    "w-5 h-5 text-[9px]";
  if (!user) {
    return (
      <div className={`${dim} bg-gray-200 text-gray-500 rounded-full flex items-center justify-center shrink-0 font-semibold`}>
        <User className="w-3 h-3" />
      </div>
    );
  }
  const seed = user.email || user.full_name || "?";
  if (user.user_image && !imgErr) {
    const src = user.user_image.startsWith("http") ? user.user_image : `${ERP_BASE}${user.user_image}`;
    return (
      <img
        src={src}
        alt={user.full_name}
        onError={() => setImgErr(true)}
        className={`${dim} rounded-full object-cover shrink-0 ring-1 ring-white shadow-sm`}
      />
    );
  }
  return (
    <div className={`${dim} ${avatarColor(seed)} rounded-full flex items-center justify-center shrink-0 font-bold text-white ring-1 ring-white shadow-sm`}>
      {initials(user.full_name || user.email)}
    </div>
  );
}

// ─── Owner picker (autocomplete from ERPNext users) ──────────────────────────

function OwnerPicker({
  value, users, onChange, compact, placeholder = "Assign owner",
}: {
  value: string;
  users?: ErpUser[];
  onChange: (v: string) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const safeUsers = users || [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Resolve current user from value (which is stored as full_name OR email)
  const current = useMemo(() => {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    return safeUsers.find((u) =>
      u.full_name?.toLowerCase() === v || u.email?.toLowerCase() === v
    ) || null;
  }, [value, safeUsers]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return safeUsers.slice(0, 30);
    return safeUsers
      .filter((u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [safeUsers, query]);

  const display = current ? current.full_name : value;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left hover:bg-white/70 hover:ring-1 hover:ring-gray-300 transition ${
          compact ? "" : ""
        }`}
        title={current?.email || `Click to ${placeholder.toLowerCase()}`}
      >
        <UserAvatar user={current} size="sm" />
        <span className={`text-xs truncate flex-1 min-w-0 ${display ? "text-gray-800 font-medium" : "text-gray-400 italic"}`}>
          {display || placeholder}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-40 w-72 max-w-[90vw] rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team members…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {value && (
              <button
                onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-b border-gray-100"
              >
                <X className="w-3 h-3" /> Clear assignment
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">No matching users</div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.email}
                  onClick={() => { onChange(u.full_name || u.email); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center gap-2 ${
                    current?.email === u.email ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <UserAvatar user={u} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate font-medium ${current?.email === u.email ? "text-blue-700" : "text-gray-800"}`}>
                      {u.full_name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function delayInfo(m: Milestone): { isDelayed: boolean; daysLate: number; kind: "overdue" | "late_finish" | null } {
  if (!m.planned_date) return { isDelayed: false, daysLate: 0, kind: null };
  if (m.status === "completed" && m.actual_date) {
    const late = daysBetween(m.planned_date, m.actual_date);
    if (late > 0) return { isDelayed: true, daysLate: late, kind: "late_finish" };
    return { isDelayed: false, daysLate: 0, kind: null };
  }
  const late = daysBetween(m.planned_date, todayIso());
  if (late > 0 && m.status !== "completed") {
    return { isDelayed: true, daysLate: late, kind: "overdue" };
  }
  return { isDelayed: false, daysLate: 0, kind: null };
}

// ─── Inline editable cell ────────────────────────────────────────────────────

function EditableField({
  value, type = "text", placeholder, onSave, className = "", multiline,
}: {
  value: string;
  type?: "text" | "date";
  placeholder?: string;
  onSave: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value || "")) onSave(draft);
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          rows={3}
          placeholder={placeholder}
          className={`w-full px-2 py-1 text-xs rounded border border-blue-400 outline-none focus:ring-2 focus:ring-blue-300 bg-white ${className}`}
        />
      );
    }
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(value || ""); setEditing(false); }
        }}
        className={`w-full px-2 py-1 text-xs rounded border border-blue-400 outline-none focus:ring-2 focus:ring-blue-300 bg-white ${className}`}
      />
    );
  }

  const display = type === "date" ? fmtDate(value || null) : (value || placeholder || "—");
  const isPlaceholder = !value;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-left w-full px-2 py-1 rounded text-xs hover:bg-white/70 hover:ring-1 hover:ring-gray-300 transition cursor-text truncate ${
        isPlaceholder ? "text-gray-400 italic" : "text-gray-800"
      } ${className}`}
    >
      {display}
    </button>
  );
}

// ─── @mention textarea ──────────────────────────────────────────────────────
//
// Stores mentions as `@[Full Name](email)` so they're stable even if a user is
// renamed. On display, the same string is parsed back into styled chips. The
// editor itself is a plain textarea — when the user types "@" we capture the
// query that follows and pop a small employee picker right under the caret.

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

function renderMentions(text: string, users: ErpUser[]): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, "g");
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const name = m[1];
    const email = m[2];
    const u = users.find((x) => x.email === email);
    out.push(
      <span
        key={`mention-${i++}-${m.index}`}
        title={email}
        className="inline-flex items-center gap-1 px-1.5 py-px rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-semibold border border-indigo-200 align-baseline"
      >
        {u?.user_image ? (
          <img src={u.user_image} alt="" className="w-3 h-3 rounded-full object-cover" />
        ) : (
          <span className="w-3 h-3 rounded-full bg-indigo-500 text-white text-[7px] font-bold flex items-center justify-center">
            {(name[0] || "?").toUpperCase()}
          </span>
        )}
        @{name}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function MentionTextarea({
  value, onSave, users, placeholder, className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  users: ErpUser[];
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { setDraft(value || ""); }, [value]);

  // Detect "@query" immediately before the caret. We only show the picker
  // when the cursor is right after a partial mention (no whitespace between
  // the @ and the caret).
  const updateMentionState = (text: string, caret: number) => {
    const upToCaret = text.slice(0, caret);
    const m = /(?:^|\s)@([\w.\-]*)$/.exec(upToCaret);
    if (m) {
      setMentionQuery(m[1] || "");
      setActiveIdx(0);
    } else {
      setMentionQuery(null);
    }
  };

  const filtered = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return users
      .filter((u) => !q || (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [mentionQuery, users]);

  const insertMention = (u: ErpUser) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? draft.length;
    const upToCaret = draft.slice(0, caret);
    const after = draft.slice(caret);
    const replaced = upToCaret.replace(/(^|\s)@([\w.\-]*)$/, (_full, sp) => `${sp}@[${u.full_name}](${u.email}) `);
    const next = replaced + after;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const newCaret = replaced.length;
      ta.focus();
      ta.setSelectionRange(newCaret, newCaret);
    });
  };

  const commit = () => {
    setEditing(false);
    setMentionQuery(null);
    if (draft !== (value || "")) onSave(draft);
  };

  if (!editing) {
    const isEmpty = !value;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`text-left w-full px-2 py-1 rounded text-xs hover:bg-white/70 hover:ring-1 hover:ring-gray-300 transition cursor-text whitespace-pre-wrap break-words ${
          isEmpty ? "text-gray-400 italic" : "text-gray-800"
        } ${className}`}
      >
        {isEmpty ? (placeholder || "Click to add a note…") : <>{renderMentions(value, users)}</>}
      </button>
    );
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          updateMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (mentionQuery !== null && filtered.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(filtered.length - 1, i + 1)); return; }
            if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[activeIdx]); return; }
            if (e.key === "Escape")    { e.preventDefault(); setMentionQuery(null); return; }
          } else if (e.key === "Escape") {
            setDraft(value || ""); setEditing(false);
          }
        }}
        onClick={(e) => updateMentionState(draft, (e.target as HTMLTextAreaElement).selectionStart ?? draft.length)}
        onBlur={() => setTimeout(() => { if (mentionQuery === null) commit(); }, 120)}
        rows={3}
        placeholder={placeholder || "Type a note. Use @ to mention a teammate…"}
        className={`w-full px-2 py-1 text-xs rounded border border-blue-400 outline-none focus:ring-2 focus:ring-blue-300 bg-white ${className}`}
      />
      {mentionQuery !== null && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-gray-500 font-semibold border-b bg-gray-50">
            Mention a teammate {mentionQuery && <span className="text-indigo-600 normal-case font-normal">· "{mentionQuery}"</span>}
          </div>
          {filtered.map((u, i) => (
            <button
              key={u.email}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition ${
                i === activeIdx ? "bg-indigo-50 text-indigo-900" : "hover:bg-gray-50 text-gray-800"
              }`}
            >
              {u.user_image ? (
                <img src={u.user_image} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {(u.full_name?.[0] || "?").toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.full_name}</div>
                <div className="text-[10px] text-gray-500 truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Always-editing controlled variant used inside the Add Milestone modal.
// Same @ picker UX as MentionTextarea but without the click-to-edit gate.
function MentionChallengeTextarea({
  value, onChange, users, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  users: ErpUser[];
  placeholder?: string;
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const updateMentionState = (text: string, caret: number) => {
    const upToCaret = text.slice(0, caret);
    const m = /(?:^|\s)@([\w.\-]*)$/.exec(upToCaret);
    if (m) { setMentionQuery(m[1] || ""); setActiveIdx(0); }
    else setMentionQuery(null);
  };

  const filtered = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return users
      .filter((u) => !q || (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [mentionQuery, users]);

  const insertMention = (u: ErpUser) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    const upToCaret = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = upToCaret.replace(/(^|\s)@([\w.\-]*)$/, (_full, sp) => `${sp}@[${u.full_name}](${u.email}) `);
    const next = replaced + after;
    onChange(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const newCaret = replaced.length;
      ta.focus();
      ta.setSelectionRange(newCaret, newCaret);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updateMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (mentionQuery !== null && filtered.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(filtered.length - 1, i + 1)); return; }
            if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[activeIdx]); return; }
            if (e.key === "Escape")    { e.preventDefault(); setMentionQuery(null); return; }
          }
        }}
        onClick={(e) => updateMentionState(value, (e.target as HTMLTextAreaElement).selectionStart ?? value.length)}
        rows={3}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {mentionQuery !== null && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-gray-500 font-semibold border-b bg-gray-50">
            Mention a teammate {mentionQuery && <span className="text-indigo-600 normal-case font-normal">· "{mentionQuery}"</span>}
          </div>
          {filtered.map((u, i) => (
            <button
              key={u.email}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition ${
                i === activeIdx ? "bg-indigo-50 text-indigo-900" : "hover:bg-gray-50 text-gray-800"
              }`}
            >
              {u.user_image ? (
                <img src={u.user_image} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {(u.full_name?.[0] || "?").toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.full_name}</div>
                <div className="text-[10px] text-gray-500 truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {value && (
        <div className="mt-1.5 px-2 py-1 rounded bg-gray-50 border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap break-words">
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mr-1">Preview:</span>
          {renderMentions(value, users)}
        </div>
      )}
    </div>
  );
}

// ─── Milestone Card (compact, editable) ──────────────────────────────────────

function MilestoneCard({
  m, onUpdate, onDelete, highlightId, users,
}: {
  m: Milestone;
  onUpdate: (patch: Partial<Milestone>) => void;
  onDelete: () => void;
  highlightId?: number | null;
  users: ErpUser[];
}) {
  const delay = delayInfo(m);
  const status = STATUS_META[m.status];
  const StatusIcon = status.icon;
  const highlighted = highlightId === m.id;

  const borderClass = delay.isDelayed
    ? "border-red-300 ring-2 ring-red-200/60 bg-red-50/40"
    : m.status === "completed"
    ? "border-green-200 bg-green-50/30"
    : "border-gray-200 bg-white";

  // Status change handler: when a milestone is moved to "completed" and the
  // user hasn't already filled in an actual date, stamp today's date so the
  // delay calculation knows the milestone landed on time. Conversely, if the
  // user moves it back out of "completed" we don't auto-clear (their date may
  // still be meaningful).
  const handleStatusChange = (newStatus: Status) => {
    const patch: Partial<Milestone> = { status: newStatus };
    if (newStatus === "completed" && !m.actual_date) {
      patch.actual_date = new Date().toISOString().slice(0, 10);
    }
    onUpdate(patch);
  };

  return (
    <div
      data-milestone-id={m.id}
      className={`group relative rounded-xl border ${borderClass} p-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        highlighted ? "ring-4 ring-blue-400/60 shadow-lg scale-[1.02]" : ""
      }`}
    >
      {delay.isDelayed && (
        <div className="absolute -top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-md ring-2 ring-white">
          <AlertTriangle className="w-3 h-3" />
          {delay.daysLate}d {delay.kind === "late_finish" ? "late" : "overdue"}
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <EditableField
            value={m.title}
            placeholder="Milestone title"
            onSave={(v) => onUpdate({ title: v })}
            className="!text-sm !font-semibold !text-gray-900"
          />
          <div className="mt-0.5">
            <EditableField
              value={m.department}
              placeholder="Department"
              onSave={(v) => onUpdate({ department: v })}
              className="!text-[10px] !font-medium !uppercase !tracking-wider !text-gray-500"
            />
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
          title="Delete milestone"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <select
          value={m.status}
          onChange={(e) => handleStatusChange(e.target.value as Status)}
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border outline-none cursor-pointer ${status.pill}`}
        >
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <span className={`w-2 h-2 rounded-full ${status.dot} ${m.status === "in_progress" ? "animate-pulse" : ""}`} />
        <StatusIcon className={`w-3.5 h-3.5 ${status.dot.replace("bg-", "text-")}`} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="rounded-md bg-gray-50/80 px-2 py-1 border border-gray-100" title="The date this milestone was originally planned to finish on">
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Planned date
          </div>
          <EditableField
            value={m.planned_date || ""}
            type="date"
            placeholder="Pick target date"
            onSave={(v) => onUpdate({ planned_date: v || null })}
            className={`!text-xs !font-semibold ${
              delay.isDelayed && delay.kind === "overdue" ? "!text-red-700" : "!text-gray-800"
            }`}
          />
        </div>
        <div
          className={`rounded-md px-2 py-1 border ${
            delay.kind === "late_finish"
              ? "bg-red-50 border-red-200"
              : m.actual_date
              ? "bg-green-50 border-green-200"
              : "bg-gray-50/80 border-gray-100"
          }`}
          title="Auto-filled with today's date when you mark this milestone Completed. You can also edit it manually."
        >
          <div className={`text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1 ${
            delay.kind === "late_finish" ? "text-red-700" : m.actual_date ? "text-green-700" : "text-gray-500"
          }`}>
            <CheckCircle2 className="w-3 h-3" /> Completed on
          </div>
          <EditableField
            value={m.actual_date || ""}
            type="date"
            placeholder="Auto on complete"
            onSave={(v) => onUpdate({ actual_date: v || null })}
            className={`!text-xs !font-semibold ${
              delay.kind === "late_finish" ? "!text-red-700" : m.actual_date ? "!text-green-700" : "!text-gray-800"
            }`}
          />
        </div>
      </div>

      <div className="mb-2 space-y-1">
        <div className="rounded-md bg-indigo-50/50 border border-indigo-100 px-1.5 py-1">
          <div className="text-[9px] uppercase tracking-wider text-indigo-700 font-semibold flex items-center gap-1 mb-0.5 px-0.5">
            <User className="w-3 h-3" /> Owner
          </div>
          <OwnerPicker
            value={m.owner}
            users={users}
            onChange={(v) => onUpdate({ owner: v })}
            placeholder="Assign owner"
          />
        </div>
        <div className="rounded-md bg-emerald-50/50 border border-emerald-100 px-1.5 py-1">
          <div className="text-[9px] uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1 mb-0.5 px-0.5">
            <UserCheck className="w-3 h-3" /> Responsible
          </div>
          <OwnerPicker
            value={m.responsible_person || ""}
            users={users}
            onChange={(v) => onUpdate({ responsible_person: v })}
            placeholder="Assign responsible person"
          />
        </div>
      </div>

      <div className="rounded-md bg-amber-50/40 border border-amber-100 px-2 py-1.5">
        <div className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1 mb-0.5 justify-between">
          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Challenges / Notes</span>
          <span className="text-[8px] text-amber-600/80 normal-case font-normal">type @ to mention</span>
        </div>
        <MentionTextarea
          value={m.challenges}
          users={users}
          placeholder="Click to add a note. Use @ to mention a teammate…"
          onSave={(v) => onUpdate({ challenges: v })}
          className="!text-xs"
        />
      </div>

      {(m.created_by || m.created_at) && (
        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2 text-[9px] text-gray-400">
          {m.created_by ? (
            <span className="truncate flex items-center gap-1" title={`Created by ${m.created_by}`}>
              <Plus className="w-2.5 h-2.5" /> {m.created_by}
            </span>
          ) : <span />}
          {m.created_at && (
            <span className="whitespace-nowrap" title={new Date(m.created_at).toLocaleString()}>
              {fmtDateShort(m.created_at)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Milestone Modal ─────────────────────────────────────────────────────

function AddMilestoneModal({
  open, project, defaultStage, onClose, onCreated, users, currentUserName,
}: {
  open: boolean;
  project: string;
  defaultStage: Stage;
  onClose: () => void;
  onCreated: (m: Milestone) => void;
  users: ErpUser[];
  currentUserName: string;
}) {
  const [stage, setStage] = useState<Stage>(defaultStage);
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [responsible, setResponsible] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [challenges, setChallenges] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStage(defaultStage);
      setDepartment(""); setTitle(""); setOwner(""); setResponsible("");
      setPlanned(""); setActual(""); setStatus("pending"); setChallenges("");
      setErr(null);
      setDeptLoading(true);
      fetch(`${API}/meeting-discussions/milestone-departments`)
        .then((r) => r.json())
        .then((data: string[]) => { setDeptOptions(Array.isArray(data) ? data : []); })
        .catch(() => { setDeptOptions([]); })
        .finally(() => setDeptLoading(false));
    }
  }, [open, defaultStage]);

  // Auto-fill the actual date the moment the user picks "Completed" — same
  // behaviour as inline status edits on the milestone card.
  const handleStatusChange = (newStatus: Status) => {
    setStatus(newStatus);
    if (newStatus === "completed" && !actual) {
      setActual(new Date().toISOString().slice(0, 10));
    }
  };

  if (!open) return null;

  const submit = async () => {
    if (!title.trim()) { setErr("Title is required"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/meeting-discussions/milestone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project, stage, department: department.trim(), title: title.trim(),
          owner: owner.trim(),
          responsible_person: responsible.trim(),
          created_by: currentUserName,
          planned_date: planned || null, actual_date: actual || null,
          status, challenges,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);
      onCreated(data);
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to create");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add Milestone</h2>
              <p className="text-xs text-gray-500">{project}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Department</label>
            {deptLoading ? (
              <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading departments…
              </div>
            ) : deptOptions.length > 0 ? (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select department —</option>
                {deptOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Mechanical"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-500" /> Owner
              </label>
              <div className="border border-gray-200 rounded-lg px-1.5 py-1">
                <OwnerPicker value={owner} users={users} onChange={setOwner} placeholder="Assign owner" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-500" /> Responsible Person
              </label>
              <div className="border border-gray-200 rounded-lg px-1.5 py-1">
                <OwnerPicker value={responsible} users={users} onChange={setResponsible} placeholder="Assign responsible" />
              </div>
            </div>
          </div>

          {currentUserName && (
            <div className="text-[10px] text-gray-500 -mt-2 px-1">
              Will be created by: <span className="font-semibold text-gray-700">{currentUserName}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Material Requests Released"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Planned date
              </label>
              <input
                type="date"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Target date you commit to finish on.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Completed on
              </label>
              <input
                type="date"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Auto-fills with today when you choose Completed.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as Status)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(STATUS_META) as Status[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Challenges / Notes</span>
              <span className="text-[10px] text-gray-500 normal-case font-normal">type @ to mention a teammate</span>
            </label>
            <MentionChallengeTextarea
              value={challenges}
              users={users}
              onChange={setChallenges}
              placeholder="Blockers, follow-ups, supplier issues, etc. Use @ to tag a teammate."
            />
          </div>

          {err && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
            ) : (
              <><Plus className="w-4 h-4" /> Add Milestone</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Project picker ──────────────────────────────────────────────────────────

function ProjectPicker({
  value, options, onChange,
}: {
  value: string;
  options: ProjectOption[];
  onChange: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
    return options.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.project_name || "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const current = options.find((p) => p.name === value);
  const label = current ? (current.project_name || current.name) : "Select a project…";

  return (
    <div ref={ref} className="relative w-full sm:w-80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Project</div>
            <div className="text-sm font-semibold text-gray-900 truncate">{label}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-30 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">No projects</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { onChange(p.name); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    p.name === value ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="truncate">{p.project_name || p.name}</div>
                  {p.project_name && (
                    <div className="text-[10px] text-gray-400 truncate">{p.name}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Header (started · completion · where we are · delay cost) ──────

function ProjectHeader({
  project, milestones, stats,
}: {
  project: ProjectOption | undefined;
  milestones: Milestone[];
  stats: { delayed: number; total: number; pct: number };
}) {
  if (!project) return null;

  const today = todayIso();

  // Start: prefer ERP expected_start; else earliest planned milestone; else createdAt
  const milestoneStart = milestones
    .map((m) => m.planned_date)
    .filter(Boolean)
    .sort()[0] || null;
  const milestoneEnd = milestones
    .map((m) => m.planned_date)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  const startedDate = project.expectedStartDate || milestoneStart || (project.createdAt ? project.createdAt.slice(0, 10) : null);
  const completionDate = project.expectedEndDate || milestoneEnd || null;

  const totalProjectDays = (startedDate && completionDate) ? Math.max(1, daysBetween(startedDate, completionDate)) : 0;
  const elapsedDays = startedDate ? Math.max(0, daysBetween(startedDate, today)) : 0;
  const remainingDays = completionDate ? daysBetween(today, completionDate) : 0;
  const timePct = totalProjectDays > 0 ? Math.min(100, Math.max(0, (elapsedDays / totalProjectDays) * 100)) : 0;

  // Total delay days across all delayed milestones (sum of slip days)
  const totalDelayDays = milestones.reduce((sum, m) => {
    const d = delayInfo(m);
    return sum + (d.isDelayed ? d.daysLate : 0);
  }, 0);

  // Daily run-rate from estimated cost
  const dailyCost = (project.estimatedCosting && totalProjectDays > 0)
    ? (project.estimatedCosting / totalProjectDays)
    : 0;
  const delayCost = dailyCost * totalDelayDays;

  // Schedule status: ahead / on schedule / behind
  const scheduleDelta = stats.pct - timePct; // >0 = ahead, <0 = behind
  const scheduleLabel =
    Math.abs(scheduleDelta) < 5 ? "On Schedule" :
    scheduleDelta > 0 ? `${Math.round(scheduleDelta)}% Ahead of Plan` :
    `${Math.abs(Math.round(scheduleDelta))}% Behind Plan`;
  const scheduleColor =
    Math.abs(scheduleDelta) < 5 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    scheduleDelta > 0 ? "text-blue-700 bg-blue-50 border-blue-200" :
    "text-red-700 bg-red-50 border-red-200";

  const overdueProject = completionDate && completionDate < today && stats.pct < 100;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 shadow-sm p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Project name + dept + schedule badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {project.project_name || project.name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="font-mono">{project.name}</span>
                {project.department && (<><span>·</span><span>{project.department}</span></>)}
                {project.status && (<><span>·</span><span className="font-semibold text-gray-700">{project.status}</span></>)}
              </div>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${scheduleColor}`}>
            <Activity className="w-3 h-3" /> {scheduleLabel}
            <span className="text-[10px] font-normal opacity-75">· {stats.pct}% done · {Math.round(timePct)}% time used</span>
          </div>
        </div>

        {/* Timeline pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 lg:flex-shrink-0">
          {/* Started */}
          <TimelinePill
            icon={PlayCircle}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            label="Started"
            value={fmtDateShort(startedDate)}
            sub={startedDate ? `${elapsedDays}d ago` : "—"}
          />
          {/* Where we are */}
          <TimelinePill
            icon={Flag}
            iconColor="text-red-600"
            iconBg="bg-red-50"
            label="Today"
            value={fmtDateShort(today)}
            sub={
              totalProjectDays > 0
                ? `Day ${Math.min(elapsedDays, totalProjectDays)}/${totalProjectDays}`
                : "in progress"
            }
            highlight
          />
          {/* Completion */}
          <TimelinePill
            icon={Target}
            iconColor={overdueProject ? "text-red-600" : "text-emerald-600"}
            iconBg={overdueProject ? "bg-red-50" : "bg-emerald-50"}
            label="Completion"
            value={fmtDateShort(completionDate)}
            sub={
              completionDate
                ? remainingDays >= 0
                  ? `in ${remainingDays}d`
                  : `${Math.abs(remainingDays)}d overdue`
                : "—"
            }
            danger={overdueProject || false}
          />
          {/* Delay days + cost */}
          <TimelinePill
            icon={IndianRupee}
            iconColor={totalDelayDays > 0 ? "text-red-600" : "text-gray-400"}
            iconBg={totalDelayDays > 0 ? "bg-red-50" : "bg-gray-50"}
            label="Delay Cost"
            value={delayCost > 0 ? fmtINR(delayCost) : "₹0"}
            sub={totalDelayDays > 0 ? `${totalDelayDays}d × ${fmtINR(dailyCost)}/d` : "no delays"}
            danger={delayCost > 0}
            tooltip={delayCost > 0 ? fmtINRFull(delayCost) : undefined}
          />
        </div>
      </div>

      {/* Time-elapsed bar */}
      {totalProjectDays > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1 font-semibold">
            <span>{fmtDateShort(startedDate)}</span>
            <span className="flex items-center gap-1">
              <Hourglass className="w-3 h-3" />
              {Math.round(timePct)}% of project time elapsed
            </span>
            <span>{fmtDateShort(completionDate)}</span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
            {/* Time elapsed (gray) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-300 to-gray-400"
              style={{ width: `${timePct}%` }}
            />
            {/* Work completed (color) */}
            <div
              className={`absolute inset-y-0 left-0 ${
                stats.pct >= timePct ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-amber-400 to-red-500"
              }`}
              style={{ width: `${stats.pct}%`, opacity: 0.95 }}
            />
            {/* Today marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-600 shadow-md"
              style={{ left: `${timePct}%` }}
              title={`Today · ${fmtDate(today)}`}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1">
            <span className="text-gray-500">
              <span className="inline-block w-2 h-2 rounded-sm bg-gray-400 mr-1" /> Time used
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mx-1 ml-3" /> Work done
            </span>
            <span className={`font-bold ${
              Math.abs(scheduleDelta) < 5 ? "text-emerald-700" :
              scheduleDelta > 0 ? "text-blue-700" : "text-red-700"
            }`}>
              {scheduleDelta > 0 ? "+" : ""}{Math.round(scheduleDelta)} pts vs plan
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelinePill({
  icon: Icon, iconColor, iconBg, label, value, sub, highlight, danger, tooltip,
}: {
  icon: typeof Rocket;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  danger?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-white shadow-sm transition ${
        highlight ? "border-red-300 ring-2 ring-red-100" :
        danger ? "border-red-200" :
        "border-gray-200"
      }`}
      title={tooltip}
    >
      <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
        <div className={`text-sm font-bold leading-tight ${danger ? "text-red-700" : "text-gray-900"}`}>
          {value}
        </div>
        {sub && (
          <div className={`text-[10px] truncate ${danger ? "text-red-600 font-semibold" : "text-gray-500"}`}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Hero (progress ring + key numbers) ──────────────────────────────────

function ProgressRing({ pct, size = 88, stroke = 8, color = "#2563eb" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none"
        strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
    </svg>
  );
}

function KpiHero({ stats, healthLabel, healthColor, healthHex }: {
  stats: { total: number; completed: number; inProgress: number; delayed: number; pending: number; pct: number };
  healthLabel: string;
  healthColor: string;
  healthHex: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Progress ring */}
        <div className="flex items-center gap-4 lg:pr-6 lg:border-r lg:border-gray-100">
          <div className="relative">
            <ProgressRing pct={stats.pct} color={healthHex} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-gray-900 leading-none">{stats.pct}%</div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mt-0.5">Done</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Project Health</div>
            <div className={`text-lg font-bold ${healthColor}`}>{healthLabel}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stats.completed} of {stats.total} milestones complete</div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiTile icon={CheckCircle2} label="Completed"   value={stats.completed}   tint="emerald" />
          <KpiTile icon={Activity}     label="In Progress" value={stats.inProgress}  tint="blue" />
          <KpiTile icon={Clock}        label="Pending"     value={stats.pending}     tint="gray" />
          <KpiTile icon={AlertTriangle} label="Delayed"    value={stats.delayed}     tint="red" pulse={stats.delayed > 0} />
        </div>
      </div>
    </div>
  );
}

const TINT_MAP: Record<string, { bg: string; text: string; ring: string; iconBg: string; iconText: string }> = {
  emerald: { bg: "bg-emerald-50/60", text: "text-emerald-900", ring: "ring-emerald-100", iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
  blue:    { bg: "bg-blue-50/60",    text: "text-blue-900",    ring: "ring-blue-100",    iconBg: "bg-blue-100",    iconText: "text-blue-600" },
  gray:    { bg: "bg-gray-50",       text: "text-gray-900",    ring: "ring-gray-100",    iconBg: "bg-gray-200",    iconText: "text-gray-600" },
  orange:  { bg: "bg-orange-50/60",  text: "text-orange-900",  ring: "ring-orange-100",  iconBg: "bg-orange-100",  iconText: "text-orange-600" },
  red:     { bg: "bg-red-50/70",     text: "text-red-900",     ring: "ring-red-100",     iconBg: "bg-red-100",     iconText: "text-red-600" },
};

function KpiTile({ icon: Icon, label, value, tint, pulse }: {
  icon: typeof Rocket; label: string; value: number | string; tint: string; pulse?: boolean;
}) {
  const t = TINT_MAP[tint] || TINT_MAP.gray;
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${t.bg} ring-1 ${t.ring}`}>
      <div className={`w-8 h-8 rounded-lg ${t.iconBg} ${t.iconText} flex items-center justify-center flex-shrink-0 ${pulse ? "animate-pulse" : ""}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-tight ${t.text}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      </div>
    </div>
  );
}

// ─── Stage Pipeline (dependency flow) ────────────────────────────────────────

function StagePipeline({
  milestones, onJumpStage, activeStage,
}: {
  milestones: Milestone[];
  onJumpStage: (s: Stage) => void;
  activeStage: Stage | null;
}) {
  const perStage = useMemo(() => {
    const map = new Map<Stage, { total: number; done: number; delayed: number; inProgress: number; pct: number }>();
    for (const s of STAGES) map.set(s.key, { total: 0, done: 0, delayed: 0, inProgress: 0, pct: 0 });
    for (const m of milestones) {
      const e = map.get(m.stage); if (!e) continue;
      e.total += 1;
      if (m.status === "completed") e.done += 1;
      if (m.status === "in_progress") e.inProgress += 1;
      if (delayInfo(m).isDelayed) e.delayed += 1;
    }
    for (const [, v] of map) v.pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
    return map;
  }, [milestones]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Stage Pipeline · Department Dependencies</h3>
            <p className="text-[11px] text-gray-500">Each stage depends on the previous — click to jump to that section</p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {STAGES.map((stage, idx) => {
          const e = perStage.get(stage.key)!;
          const Icon = stage.icon;
          const isActive = activeStage === stage.key;
          const hasDelay = e.delayed > 0;
          const isDone = e.total > 0 && e.done === e.total;
          const isStarted = e.done > 0 || e.inProgress > 0;

          return (
            <div key={stage.key} className="flex items-stretch flex-1 min-w-[140px]">
              <button
                onClick={() => onJumpStage(stage.key)}
                className={`flex-1 text-left rounded-xl border p-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isActive ? "ring-2 ring-blue-400" : ""
                } ${
                  hasDelay
                    ? "border-red-300 bg-red-50/40"
                    : isDone
                    ? "border-green-300 bg-green-50/40"
                    : isStarted
                    ? `${stage.border} ${stage.bg}`
                    : "border-gray-200 bg-gray-50/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: stage.hexLight, color: stage.hex }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold truncate ${stage.color}`}>{stage.short}</div>
                    <div className="text-[9px] text-gray-500">{e.done}/{e.total} done</div>
                  </div>
                  {hasDelay && (
                    <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> {e.delayed}
                    </div>
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${e.pct}%`,
                      background: hasDelay ? "#dc2626" : isDone ? "#10b981" : stage.hex,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{e.pct}%</span>
                  {e.inProgress > 0 && (
                    <span className="text-[9px] font-semibold text-blue-600 flex items-center gap-0.5">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> {e.inProgress} live
                    </span>
                  )}
                </div>
              </button>

              {/* Dependency arrow */}
              {idx < STAGES.length - 1 && (
                <div className="flex items-center px-1 text-gray-300">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> On track</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> In progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Has delays</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Not started</span>
      </div>
    </div>
  );
}

// ─── Master Gantt Timeline ───────────────────────────────────────────────────

function GanttTimeline({
  milestones, onSelect,
}: {
  milestones: Milestone[];
  onSelect: (id: number) => void;
}) {
  const today = todayIso();

  const range = useMemo(() => {
    const dates: string[] = [];
    for (const m of milestones) {
      if (m.planned_date) dates.push(m.planned_date);
      if (m.actual_date) dates.push(m.actual_date);
    }
    dates.push(today);
    if (dates.length === 0) return null;
    let min = dates[0]; let max = dates[0];
    for (const d of dates) { if (d < min) min = d; if (d > max) max = d; }
    const start = addDays(min, -10);
    const end = addDays(max, 10);
    const total = Math.max(1, daysBetween(start, end));
    return { start, end, total };
  }, [milestones, today]);

  const pos = useCallback((d: string) => {
    if (!range) return 0;
    return Math.max(0, Math.min(100, (daysBetween(range.start, d) / range.total) * 100));
  }, [range]);

  // Month markers
  const months = useMemo(() => {
    if (!range) return [];
    const list: { date: string; label: string }[] = [];
    const cur = new Date(range.start);
    cur.setUTCDate(1);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    const endD = new Date(range.end);
    while (cur <= endD) {
      const iso = cur.toISOString().slice(0, 10);
      list.push({
        date: iso,
        label: cur.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return list;
  }, [range]);

  if (!range) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 mb-4 text-center text-sm text-gray-400">
        <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        Add planned dates to your milestones to see the timeline.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Master Timeline · Where We Are vs Plan</h3>
            <p className="text-[11px] text-gray-500">
              Each marker is a milestone. <span className="text-gray-400">Hollow</span> = planned ·
              <span className="text-emerald-600 font-semibold"> Solid</span> = actual ·
              <span className="text-red-600 font-semibold"> Red glow</span> = delayed
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-red-600 px-2 py-1 rounded-md bg-red-50 border border-red-200">
          <Flag className="w-3 h-3" /> TODAY · {fmtDateShort(today)}
        </div>
      </div>

      <div className="relative">
        {/* Time axis */}
        <div className="relative h-6 mb-1 border-b border-gray-200">
          {months.map((m) => (
            <div
              key={m.date}
              className="absolute top-0 h-full flex items-end pb-0.5"
              style={{ left: `${pos(m.date)}%` }}
            >
              <div className="w-px h-3 bg-gray-200" />
              <span className="ml-1 text-[10px] text-gray-500 font-semibold whitespace-nowrap">{m.label}</span>
            </div>
          ))}
          {/* Today marker label */}
          <div
            className="absolute -top-1 -translate-x-1/2 z-20"
            style={{ left: `${pos(today)}%` }}
          >
            <div className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-bold shadow whitespace-nowrap">
              TODAY
            </div>
          </div>
        </div>

        {/* Swim lanes */}
        <div className="space-y-1.5">
          {STAGES.map((stage) => {
            const stageMs = milestones
              .filter((m) => m.stage === stage.key && (m.planned_date || m.actual_date))
              .sort((a, b) => (a.planned_date || a.actual_date || "").localeCompare(b.planned_date || b.actual_date || ""));
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="flex items-stretch gap-2 group">
                <div
                  className="w-32 flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md border"
                  style={{ background: stage.hexLight, borderColor: stage.hex + "40" }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: stage.hex }} />
                  <span className="text-[11px] font-bold truncate" style={{ color: stage.hex }}>
                    {stage.short}
                  </span>
                  <span className="ml-auto text-[10px] font-semibold text-gray-500">{stageMs.length}</span>
                </div>

                <div
                  className="relative flex-1 h-9 rounded-md border border-gray-100"
                  style={{
                    background: `linear-gradient(to right, ${stage.hexLight}40, ${stage.hexLight}20)`,
                  }}
                >
                  {/* Today vertical line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500/70 z-10 pointer-events-none"
                    style={{ left: `${pos(today)}%` }}
                  />

                  {/* Milestones */}
                  {stageMs.map((m) => (
                    <MilestonePin key={m.id} m={m} pos={pos} stageHex={stage.hex} onSelect={onSelect} />
                  ))}

                  {stageMs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] italic text-gray-300">
                      no dated milestones
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MilestonePin({
  m, pos, stageHex, onSelect,
}: {
  m: Milestone;
  pos: (d: string) => number;
  stageHex: string;
  onSelect: (id: number) => void;
}) {
  const delay = delayInfo(m);
  const planned = m.planned_date;
  const actual = m.actual_date;
  const done = m.status === "completed";

  // Build a connector line from planned -> actual (or today if not done)
  const startIso = planned || actual!;
  const endIso = actual || (planned && delay.kind === "overdue" ? todayIso() : planned!);
  const startPct = pos(startIso);
  const endPct = pos(endIso);
  const left = Math.min(startPct, endPct);
  const width = Math.abs(endPct - startPct);

  const fillColor = delay.isDelayed
    ? "#dc2626"
    : done
    ? "#10b981"
    : m.status === "in_progress"
    ? stageHex
    : "#9ca3af";

  return (
    <>
      {/* Slip / progress connector */}
      {planned && (actual || delay.kind === "overdue") && width > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            background: delay.isDelayed
              ? "repeating-linear-gradient(90deg, #fecaca 0 4px, #dc2626 4px 8px)"
              : `${stageHex}60`,
          }}
          title={`Slip ${Math.abs(daysBetween(startIso, endIso))} days`}
        />
      )}

      {/* Planned marker (hollow) */}
      {planned && (
        <button
          onClick={() => onSelect(m.id)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group/pin"
          style={{ left: `${pos(planned)}%` }}
          title={`Planned: ${fmtDate(planned)} · ${m.title}`}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 bg-white transition-transform group-hover/pin:scale-150 ${
              delay.isDelayed ? "ring-2 ring-red-300/70" : ""
            }`}
            style={{ borderColor: stageHex }}
          />
        </button>
      )}

      {/* Actual marker (solid) — only if different from planned, or no planned */}
      {actual && actual !== planned && (
        <button
          onClick={() => onSelect(m.id)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group/pin"
          style={{ left: `${pos(actual)}%` }}
          title={`Actual: ${fmtDate(actual)} · ${m.title}`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/pin:scale-150 ${
              delay.kind === "late_finish" ? "ring-2 ring-red-400/70 animate-pulse" : ""
            }`}
            style={{ background: fillColor }}
          />
        </button>
      )}

      {/* Combined marker when planned == actual (or no actual + completed) */}
      {planned && actual === planned && (
        <button
          onClick={() => onSelect(m.id)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group/pin"
          style={{ left: `${pos(planned)}%` }}
          title={`On time: ${fmtDate(planned)} · ${m.title}`}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/pin:scale-150"
            style={{ background: fillColor }}
          />
        </button>
      )}

      {/* If overdue (no actual yet, planned in past), pulse a red flag at planned */}
      {delay.kind === "overdue" && (
        <div
          className="absolute top-0 -translate-x-1/2 z-10 pointer-events-none"
          style={{ left: `${pos(planned!)}%` }}
        >
          <AlertTriangle className="w-3 h-3 text-red-600 -mt-1 drop-shadow-md animate-pulse" />
        </div>
      )}
    </>
  );
}

// ─── Delays Spotlight ────────────────────────────────────────────────────────

function DelaysSpotlight({
  milestones, onSelect, onOpenDetail,
}: {
  milestones: Milestone[];
  onSelect: (id: number) => void;
  onOpenDetail?: () => void;
}) {
  const delayed = useMemo(() => {
    return milestones
      .map((m) => ({ m, info: delayInfo(m) }))
      .filter((x) => x.info.isDelayed)
      .sort((a, b) => b.info.daysLate - a.info.daysLate);
  }, [milestones]);

  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-100 bg-gradient-to-r from-red-50 to-rose-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
              Delay Spotlight
              {onOpenDetail && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </h3>
            <p className="text-[11px] text-gray-500">
              {delayed.length === 0 ? "Nothing is delayed — great job!" : `${delayed.length} item${delayed.length === 1 ? "" : "s"} need attention`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {delayed.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
            All milestones are on track.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {delayed.map(({ m, info }) => {
              const stage = STAGE_META[m.stage];
              const StageIcon = stage.icon;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelect(m.id)}
                    className="w-full text-left px-4 py-3 hover:bg-red-50/40 transition group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: stage.hexLight, color: stage.hex }}
                      >
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-red-700 transition">
                            {m.title}
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" /> {info.daysLate}d
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold uppercase tracking-wider" style={{ color: stage.hex }}>
                            {stage.short}
                          </span>
                          <span>·</span>
                          <span>{m.department || "—"}</span>
                          {m.owner && (<><span>·</span><span><User className="w-2.5 h-2.5 inline" /> {m.owner}</span></>)}
                        </div>
                        <div className="text-[10px] text-red-700 font-medium mt-0.5">
                          {info.kind === "overdue" ? "Overdue since " : "Finished late on "}
                          {fmtDate(info.kind === "overdue" ? m.planned_date : m.actual_date)}
                        </div>
                        {m.challenges && (
                          <div className="text-[11px] text-gray-600 mt-1 line-clamp-2 italic">
                            "{m.challenges}"
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {onOpenDetail && (
        <button
          onClick={onOpenDetail}
          className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-t border-red-200 flex items-center justify-center gap-1.5 transition"
        >
          Open detailed view with filters
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Challenges & Notes (per-milestone) side panel ──────────────────────────

function ChallengesPanel({
  milestones, users, onSelect, onOpenDetail,
}: {
  milestones: Milestone[];
  users: ErpUser[];
  onSelect: (id: number) => void;
  onOpenDetail?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    return milestones
      .filter((m) => (m.challenges || "").trim().length > 0)
      .map((m) => ({ m, info: delayInfo(m) }))
      .sort((a, b) => {
        // Delayed first, then by days late, then by stage order
        if (a.info.isDelayed !== b.info.isDelayed) return a.info.isDelayed ? -1 : 1;
        if (a.info.daysLate !== b.info.daysLate) return b.info.daysLate - a.info.daysLate;
        const order: Stage[] = ["kickoff", "design", "purchase", "workshop", "shipment", "commissioning"];
        return order.indexOf(a.m.stage) - order.indexOf(b.m.stage);
      });
  }, [milestones]);

  const visible = showAll ? items : items.slice(0, 6);
  const delayedCount = items.filter((x) => x.info.isDelayed).length;

  const findUser = (raw: string) => {
    const v = (raw || "").toLowerCase().trim();
    if (!v) return null;
    return users.find((u) =>
      u.full_name?.toLowerCase() === v || u.email?.toLowerCase() === v,
    ) || null;
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
              Challenges & Notes
              {onOpenDetail && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </h3>
            <p className="text-[11px] text-gray-500">
              {items.length === 0
                ? "No issues raised yet"
                : `${items.length} item${items.length === 1 ? "" : "s"}${
                    delayedCount > 0 ? ` · ${delayedCount} delayed` : ""
                  }`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
            No challenges noted on any milestone.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map(({ m, info }) => {
              const stage = STAGE_META[m.stage];
              const StageIcon = stage.icon;
              const ownerUser = findUser(m.owner);
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelect(m.id)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50/50 transition group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: stage.hexLight, color: stage.hex }}
                      >
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-amber-700 transition">
                            {m.title}
                          </div>
                          {info.isDelayed ? (
                            <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                              <AlertTriangle className="w-2.5 h-2.5" /> {info.daysLate}d
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="font-semibold uppercase tracking-wider" style={{ color: stage.hex }}>
                            {stage.short}
                          </span>
                          <span>·</span>
                          <span>{m.department || "—"}</span>
                          {m.owner && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <UserAvatar user={ownerUser} size="xs" />
                                <span>{ownerUser?.full_name || m.owner}</span>
                              </span>
                            </>
                          )}
                        </div>
                        <div className="rounded-md bg-amber-50/70 border border-amber-100 px-2 py-1.5 text-[11px] text-gray-700 italic leading-snug">
                          “{m.challenges}”
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 6 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full px-4 py-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 border-t border-amber-100 transition"
          >
            {showAll ? "Show less" : `Show all ${items.length}`}
          </button>
        )}
      </div>

      {onOpenDetail && (
        <button
          onClick={onOpenDetail}
          className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-t border-amber-200 flex items-center justify-center gap-1.5 transition"
        >
          Open detailed view with filters
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── @Mention employee/user types & helpers ──────────────────────────────────

interface MentionEmployee {
  id: string;            // ERPNext Employee doc name (e.g. WTT0123)
  name: string;          // Display name
  designation: string;
  department: string;
  user_id: string | null;
  avatar: string | null;
}

function useMentionEmployees(query: string, active: boolean) {
  const [items, setItems] = useState<MentionEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!active) { setItems([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    fetch(`${API}/erpnext-employees-mention?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setLoading(false); });
    return () => ctrl.abort();
  }, [query, active]);
  return { items, loading };
}

function getAtQuery(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const m = before.match(/@([^\s@]*)$/);
  if (!m) return null;
  return { query: m[1], start: before.lastIndexOf("@") };
}

// Render note body with @mentions highlighted as blue chips
function renderNoteBody(body: string) {
  if (!body) return null;
  const parts = body.split(/(@[A-Za-z][A-Za-z0-9 ._-]{0,40}?(?=[\s.,;:!?)\]]|$))/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="inline-flex items-center px-1 rounded bg-blue-50 text-blue-700 font-semibold text-[11px] mr-0.5">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Discussion notes panel ──────────────────────────────────────────────────

interface NoteAllocation {
  noteId: number;
  taskAllocationName: string;
  url: string;
  employeeName: string;
  taskName: string;
  expectedHours: number;
  expectedEndDate: string;
}

function DiscussionNotesPanel({
  project, notes, onCreated, onDeleted, openSignal,
}: {
  project: string;
  notes: DiscussionNote[];
  onCreated: (n: DiscussionNote) => void;
  onDeleted: (id: number) => void;
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Task Allocation toggle + fields
  const [taskOn, setTaskOn] = useState(false);
  const [assignee, setAssignee] = useState<MentionEmployee | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const { items: assigneeOptions, loading: assigneeLoading } = useMentionEmployees(assigneeQuery, assigneeOpen);
  const [hours, setHours] = useState<number>(2);
  const [dueDate, setDueDate] = useState(todayIso());

  // Local-only memory of allocations created with each note (per session)
  const [allocations, setAllocations] = useState<NoteAllocation[]>([]);

  // @-mention state for body textarea
  const [mention, setMention] = useState({ active: false, query: "", start: 0, idx: 0 });
  const { items: mentionUsers, loading: mentionLoading } = useMentionEmployees(mention.query, mention.active);
  const closeMention = () => setMention((m) => ({ ...m, active: false, idx: 0 }));

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    const r = getAtQuery(val, cursor);
    if (r) setMention({ active: true, query: r.query, start: r.start, idx: 0 });
    else closeMention();
  };

  const insertMention = (u: MentionEmployee) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? body.length;
    const before = body.slice(0, mention.start);
    const after = body.slice(cursor);
    const inserted = `@${u.name} `;
    setBody(before + inserted + after);
    closeMention();
    setTimeout(() => {
      ta.focus();
      const pos = before.length + inserted.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention.active || mentionUsers.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMention((m) => ({ ...m, idx: Math.min(m.idx + 1, mentionUsers.length - 1) })); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMention((m) => ({ ...m, idx: Math.max(m.idx - 1, 0) })); }
    else if (e.key === "Enter") { e.preventDefault(); insertMention(mentionUsers[mention.idx]); }
    else if (e.key === "Escape") { closeMention(); }
  };

  const reset = () => {
    setTitle(""); setBody(""); setDate(todayIso());
    setTaskOn(false); setAssignee(null); setAssigneeQuery(""); setHours(2); setDueDate(todayIso());
    setError(null); setOpen(false);
  };

  const submit = async () => {
    if (!body.trim() && !title.trim()) return;
    if (taskOn && !assignee) {
      setError("Pick an employee for the task allocation, or turn it off.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 1) Save the note (always)
      const noteRes = await fetch(`${API}/meeting-discussions/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, title: title.trim(), body: body.trim(), meeting_date: date }),
      });
      const note = await noteRes.json();
      if (!noteRes.ok) throw new Error(note?.error || "Failed to save note");
      onCreated(note);

      // 2) If task allocation requested, create it in ERPNext too
      if (taskOn && assignee) {
        const taRes = await fetch(`${API}/meeting-discussions/task-allocation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee: assignee.id,
            task_name: title.trim() || (body.trim().split(/\n/)[0] || "Action item").slice(0, 120),
            description: body.trim(),
            date,
            expected_end_date: dueDate,
            expected_hours: hours,
          }),
        });
        const ta = await taRes.json();
        if (!taRes.ok) {
          // Note already saved; surface partial error
          setError(`Note saved, but ERPNext task allocation failed: ${ta?.error || taRes.statusText}`);
        } else {
          setAllocations((prev) => [
            ...prev,
            {
              noteId: note.id,
              taskAllocationName: ta.name,
              url: ta.url,
              employeeName: assignee.name,
              taskName: ta.task_name,
              expectedHours: ta.expected_hours,
              expectedEndDate: ta.expected_end_date,
            },
          ]);
          reset();
          return;
        }
      }
      reset();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`${API}/meeting-discussions/note/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openSignal === undefined) return;
    setCollapsed(false);
    const el = wrapperRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openSignal]);

  return (
    <div
      ref={wrapperRef}
      id="meeting-notes-panel"
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Meeting Notes</h3>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <span className="text-xs font-semibold text-rose-600 tabular-nums">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100">
          <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-gray-50/40">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>

      <NoteDrawer
        open={open}
        onClose={reset}
        title={title} setTitle={setTitle}
        date={date} setDate={setDate}
        body={body}
        bodyRef={bodyRef}
        handleBodyChange={handleBodyChange}
        handleBodyKeyDown={handleBodyKeyDown}
        closeMention={closeMention}
        mention={mention} setMention={setMention}
        mentionUsers={mentionUsers} mentionLoading={mentionLoading}
        insertMention={insertMention}
        taskOn={taskOn} setTaskOn={setTaskOn}
        assignee={assignee} setAssignee={setAssignee}
        assigneeQuery={assigneeQuery} setAssigneeQuery={setAssigneeQuery}
        assigneeOpen={assigneeOpen} setAssigneeOpen={setAssigneeOpen}
        assigneeOptions={assigneeOptions} assigneeLoading={assigneeLoading}
        hours={hours} setHours={setHours}
        dueDate={dueDate} setDueDate={setDueDate}
        error={error}
        submit={submit}
        submitting={submitting}
      />

      <div className="max-h-[420px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            No meeting notes yet. Click <span className="font-semibold text-indigo-600">New Note</span> to add one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notes.map((n) => {
              const noteAllocs = allocations.filter((a) => a.noteId === n.id);
              return (
                <li key={n.id} className="group px-4 py-3 hover:bg-gray-50/50 transition">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-indigo-700">
                      <Calendar className="w-3 h-3" /> {fmtDate(n.meeting_date)}
                    </div>
                    <button
                      onClick={() => remove(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-600 transition"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {n.title && (
                    <div className="text-sm font-semibold text-gray-900 mb-0.5">{n.title}</div>
                  )}
                  {n.body && (
                    <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {renderNoteBody(n.body)}
                    </div>
                  )}
                  {noteAllocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {noteAllocs.map((a) => (
                        <a
                          key={a.taskAllocationName}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                          title="Open in ERPNext"
                        >
                          <Target className="w-3 h-3" />
                          <span className="truncate">Task → {a.employeeName}</span>
                          <span className="text-emerald-600 font-normal">· {a.expectedHours}h · due {fmtDateShort(a.expectedEndDate)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

// ─── Purchase Orders auto-discussion panel ────────────────────────────────────
// Shows ERPNext POs for the selected project as automatic talking points: PO
// date, supplier, schedule, received %, and a derived "what to discuss" line.
// Items are sorted with the most actionable (overdue / partial) at the top.

interface PurchaseOrderPoint {
  name: string;
  supplier: string;
  supplier_name: string | null;
  status: string;
  po_date: string | null;
  schedule_date: string | null;
  per_received: number;
  per_billed: number;
  grand_total: number;
  currency: string | null;
  days_overdue: number;
  stage: "ordered" | "in_transit" | "received" | "overdue" | "partial";
  discussion: string;
}

const PO_STAGE_META: Record<PurchaseOrderPoint["stage"], { label: string; tone: string; dot: string; pillBg: string; pillText: string }> = {
  overdue:    { label: "Overdue follow-up", tone: "border-red-200 bg-red-50/60",      dot: "bg-red-500",    pillBg: "bg-red-100",    pillText: "text-red-700" },
  partial:    { label: "Partial receipt",   tone: "border-amber-200 bg-amber-50/60",  dot: "bg-amber-500",  pillBg: "bg-amber-100",  pillText: "text-amber-700" },
  in_transit: { label: "Awaiting delivery", tone: "border-blue-200 bg-blue-50/60",    dot: "bg-blue-500",   pillBg: "bg-blue-100",   pillText: "text-blue-700" },
  ordered:    { label: "Recently released", tone: "border-indigo-200 bg-indigo-50/60",dot: "bg-indigo-500", pillBg: "bg-indigo-100", pillText: "text-indigo-700" },
  received:   { label: "Fully received",    tone: "border-emerald-200 bg-emerald-50/60",dot: "bg-emerald-500", pillBg: "bg-emerald-100", pillText: "text-emerald-700" },
};

function PurchaseOrdersPanel({
  orders, loading, totalPos = 0, onOpenDetail,
}: {
  orders: PurchaseOrderPoint[];
  loading: boolean;
  totalPos?: number;
  onOpenDetail?: () => void;
}) {
  const SHOW = 8;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? orders : orders.slice(0, SHOW);

  // Bucket by severity so the most urgent ones lead the list visually.
  const severity = (d: number) => (d >= 30 ? "critical" : d >= 14 ? "high" : "watch");
  const sevMeta = {
    critical: { dot: "bg-red-600",   pill: "bg-red-100 text-red-700"     },
    high:     { dot: "bg-orange-500",pill: "bg-orange-100 text-orange-700"},
    watch:    { dot: "bg-amber-500", pill: "bg-amber-100 text-amber-700" },
  } as const;

  const HeaderTag: any = onOpenDetail ? "button" : "div";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <HeaderTag
        onClick={onOpenDetail}
        className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50/40 text-left ${
          onOpenDetail ? "hover:from-amber-100 hover:to-orange-100/60 transition cursor-pointer" : ""
        }`}
        title={onOpenDetail ? "Open detailed view with filters" : undefined}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
              Vendor Follow-ups
              {onOpenDetail && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </h3>
            <p className="text-[11px] text-gray-500">
              {orders.length === 0
                ? (totalPos > 0 ? `All ${totalPos} POs on track` : "No pending POs")
                : `${orders.length} pending · long delay${totalPos ? ` · ${totalPos} total` : ""}`}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
      </HeaderTag>

      <div className="max-h-[440px] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            {loading ? "Checking purchase orders…" : "No long-delayed POs. Nothing to chase."}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {visible.map((po) => {
                const sev = sevMeta[severity(po.days_overdue)];
                return (
                  <li key={po.name} className="px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <a
                        href={`${ERP_BASE}/app/purchase-order/${encodeURIComponent(po.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-900 hover:text-blue-700 truncate"
                        title={po.name}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                        <span className="truncate">{po.name}</span>
                      </a>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${sev.pill}`}>
                        {po.days_overdue}d late
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 truncate pl-4">
                      {po.supplier_name || po.supplier}
                      {po.schedule_date && <span className="text-gray-400"> · due {fmtDate(po.schedule_date)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {orders.length > SHOW && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full px-4 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border-t border-gray-100"
              >
                {expanded ? "Show less" : `Show ${orders.length - SHOW} more`}
              </button>
            )}
          </>
        )}

        {onOpenDetail && (
          <button
            onClick={onOpenDetail}
            className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-t border-amber-200 flex items-center justify-center gap-1.5 transition"
          >
            Open detailed view with filters
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function MentionAvatar({ item }: { item: MentionEmployee }) {
  const [err, setErr] = useState(false);
  const src = item.avatar
    ? (item.avatar.startsWith("http") ? item.avatar : `${ERP_BASE}${item.avatar}`)
    : null;
  if (src && !err) {
    return (
      <img
        src={src}
        alt={item.name}
        onError={() => setErr(true)}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-white shadow-sm"
      />
    );
  }
  return (
    <div className={`w-7 h-7 rounded-full ${avatarColor(item.id || item.name)} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ring-1 ring-white shadow-sm`}>
      {initials(item.name)}
    </div>
  );
}

// ─── Right-side note drawer ─────────────────────────────────────────────────

interface NoteDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string; setTitle: (v: string) => void;
  date: string; setDate: (v: string) => void;
  body: string;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
  handleBodyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBodyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  closeMention: () => void;
  mention: { active: boolean; query: string; start: number; idx: number };
  setMention: React.Dispatch<React.SetStateAction<{ active: boolean; query: string; start: number; idx: number }>>;
  mentionUsers: MentionEmployee[];
  mentionLoading: boolean;
  insertMention: (u: MentionEmployee) => void;
  taskOn: boolean; setTaskOn: (v: boolean | ((p: boolean) => boolean)) => void;
  assignee: MentionEmployee | null; setAssignee: (v: MentionEmployee | null) => void;
  assigneeQuery: string; setAssigneeQuery: (v: string) => void;
  assigneeOpen: boolean; setAssigneeOpen: (v: boolean) => void;
  assigneeOptions: MentionEmployee[];
  assigneeLoading: boolean;
  hours: number; setHours: (v: number) => void;
  dueDate: string; setDueDate: (v: string) => void;
  error: string | null;
  submit: () => void;
  submitting: boolean;
}

function NoteDrawer(p: NoteDrawerProps) {
  // Esc to close
  useEffect(() => {
    if (!p.open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") p.onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [p.open, p.onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={p.onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          p.open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="New meeting note"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[460px] bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-out ${
          p.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">New Meeting Note</div>
              <div className="text-[10px] text-gray-500">Capture decisions, mentions & follow-ups</div>
            </div>
          </div>
          <button
            onClick={p.onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Date + Title */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Meeting date</label>
              <input
                type="date"
                value={p.date}
                onChange={(e) => p.setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Title</label>
              <input
                value={p.title}
                onChange={(e) => p.setTitle(e.target.value)}
                placeholder="e.g. Weekly review with Sachin"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Body with @mention */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Notes <span className="text-gray-400 font-normal normal-case">— type @ to mention</span>
            </label>
            <div className="relative">
              <textarea
                ref={p.bodyRef}
                value={p.body}
                onChange={p.handleBodyChange}
                onKeyDown={p.handleBodyKeyDown}
                onBlur={() => setTimeout(p.closeMention, 150)}
                rows={8}
                placeholder="Discussion summary, key decisions, action items…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
              {p.mention.active && (
                <div className="absolute left-2 right-2 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5 bg-blue-50/50">
                    <User className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mention employee</span>
                    {p.mentionLoading && <Loader2 className="w-2.5 h-2.5 text-gray-400 animate-spin ml-auto" />}
                  </div>
                  {p.mentionUsers.length === 0 && !p.mentionLoading ? (
                    <div className="px-3 py-3 text-xs text-gray-400 text-center">No employees found</div>
                  ) : (
                    p.mentionUsers.map((u, i) => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); p.insertMention(u); }}
                        onMouseEnter={() => p.setMention((m) => ({ ...m, idx: i }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                          i === p.mention.idx ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <MentionAvatar item={u} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                          {(u.designation || u.department) && (
                            <p className="text-[10px] text-gray-400 truncate">
                              {u.designation}{u.designation && u.department ? " · " : ""}{u.department}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                  <div className="px-3 py-1 border-t border-gray-100 bg-gray-50">
                    <p className="text-[9px] text-gray-400">↑↓ navigate · Enter select · Esc close</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Task Allocation toggle */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50">
            <button
              type="button"
              onClick={() => p.setTaskOn((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/70 rounded-xl"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.taskOn ? "bg-emerald-100 text-emerald-700" : "bg-white text-gray-400 border border-gray-200"}`}>
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Also create Task Allocation</div>
                  <div className="text-[10px] text-gray-500">Pushes a real Task Allocation into ERPNext</div>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full p-0.5 transition flex-shrink-0 ${p.taskOn ? "bg-emerald-500" : "bg-gray-300"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${p.taskOn ? "translate-x-5" : ""}`} />
              </div>
            </button>

            {p.taskOn && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-200 bg-white rounded-b-xl">
                {/* Assignee picker */}
                <div className="relative">
                  <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Assignee</label>
                  {p.assignee ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-emerald-200 bg-emerald-50/40">
                      <MentionAvatar item={p.assignee} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{p.assignee.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{p.assignee.id}{p.assignee.designation ? ` · ${p.assignee.designation}` : ""}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { p.setAssignee(null); p.setAssigneeQuery(""); }}
                        className="p-1 text-gray-400 hover:text-red-600 transition"
                        title="Change"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          value={p.assigneeQuery}
                          onFocus={() => p.setAssigneeOpen(true)}
                          onChange={(e) => { p.setAssigneeQuery(e.target.value); p.setAssigneeOpen(true); }}
                          onBlur={() => setTimeout(() => p.setAssigneeOpen(false), 150)}
                          placeholder="Search employees…"
                          className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        {p.assigneeLoading && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
                        )}
                      </div>
                      {p.assigneeOpen && (p.assigneeOptions.length > 0 || p.assigneeLoading) && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                          {p.assigneeOptions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); p.setAssignee(u); p.setAssigneeOpen(false); p.setAssigneeQuery(""); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 transition"
                            >
                              <MentionAvatar item={u} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{u.id}{u.department ? ` · ${u.department}` : ""}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Due date</label>
                    <input
                      type="date"
                      value={p.dueDate}
                      onChange={(e) => p.setDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={p.hours}
                      onChange={(e) => p.setHours(Number(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {p.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {p.error}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-gray-100 px-5 py-3 bg-white flex items-center justify-end gap-2">
          <button
            onClick={p.onClose}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={p.submit}
            disabled={p.submitting || (!p.body.trim() && !p.title.trim()) || (p.taskOn && !p.assignee)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            {p.submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.taskOn ? <Target className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {p.taskOn ? "Save & Allocate" : "Save Note"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── AI Status Summary Modal ─────────────────────────────────────────────────

interface AiSummaryData {
  project: string;
  summary: string;
  health: string;
  pct_complete?: number;
  stats?: { total: number; completed: number; in_progress: number; delayed: number; pending: number };
  delayed_count?: number;
  upcoming_count?: number;
  generated_at: string;
}

const HEALTH_BADGE: Record<string, { label: string; cls: string }> = {
  complete:  { label: "Complete",  cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  on_track:  { label: "On Track",  cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  at_risk:   { label: "At Risk",   cls: "bg-amber-100 text-amber-800 border-amber-200" },
  critical:  { label: "Critical",  cls: "bg-red-100 text-red-800 border-red-200" },
  no_data:   { label: "No Data",   cls: "bg-gray-100 text-gray-700 border-gray-200" },
};

// Minimal markdown renderer: converts ## headings, **bold**, *italic*, and
// bullet/number lists into styled HTML. Avoids pulling in a full markdown lib.
function renderSummaryMarkdown(md: string) {
  const lines = md.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const flushList = () => {
    if (listBuf.length === 0) return;
    const items = listBuf.map((t, i) => (
      <li key={i} className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(t) }} />
    ));
    blocks.push(
      listType === "ol"
        ? <ol key={`l${blocks.length}`} className="list-decimal ml-5 space-y-1 mb-3">{items}</ol>
        : <ul key={`l${blocks.length}`} className="list-disc ml-5 space-y-1 mb-3">{items}</ul>,
    );
    listBuf = []; listType = null;
  };
  function inline(t: string) {
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-gray-700">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 text-[12px] font-mono text-gray-800">$1</code>');
  }
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h3 key={`h${blocks.length}`} className="text-sm font-bold uppercase tracking-wider text-indigo-700 mt-4 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-indigo-500" />{line.slice(3)}
      </h3>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h2 key={`h${blocks.length}`} className="text-base font-bold text-gray-900 mt-4 mb-2">{line.slice(2)}</h2>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuf.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuf.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else if (!line.trim()) {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={`p${blocks.length}`} className="text-sm text-gray-700 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  }
  flushList();
  return <div className="ai-summary-md">{blocks}</div>;
}

function AiSummaryModal({
  open, project, projectDisplay, onClose,
}: {
  open: boolean;
  project: string;
  projectDisplay: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiSummaryData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!project) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const res = await fetch(`${API}/meeting-discussions/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      setData(json);
    } catch (e: any) {
      setErr(e.message || "Failed to generate AI summary");
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (open && project) generate();
  }, [open, project, generate]);

  if (!open) return null;

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`# AI Status Report — ${projectDisplay}\n\nGenerated: ${new Date(data.generated_at).toLocaleString()}\n\n${data.summary}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob(
      [`# AI Status Report — ${projectDisplay}\n\nGenerated: ${new Date(data.generated_at).toLocaleString()}\nHealth: ${HEALTH_BADGE[data.health]?.label || data.health}\nCompletion: ${data.pct_complete ?? 0}%\n\n${data.summary}\n`],
      { type: "text/markdown" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project}-ai-status-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const print = () => {
    if (!data) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>AI Status — ${projectDisplay}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 780px; margin: 24px auto; color: #111; line-height: 1.55; padding: 0 24px; }
        h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .08em; color: #4338ca; margin-top: 22px; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; }
        .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
        ul, ol { padding-left: 22px; } li { margin: 4px 0; }
        strong { color: #111; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef2ff; color: #4338ca; margin-right: 6px; }
      </style></head><body>
      <h1>AI Status Report</h1>
      <div class="meta">${projectDisplay} · Generated ${new Date(data.generated_at).toLocaleString()}</div>
      <div style="margin-bottom:18px">
        <span class="badge">Health: ${HEALTH_BADGE[data.health]?.label || data.health}</span>
        <span class="badge">${data.pct_complete ?? 0}% Complete</span>
        ${data.stats ? `<span class="badge">${data.stats.completed}/${data.stats.total} Done</span>` : ""}
        ${data.delayed_count ? `<span class="badge" style="background:#fee2e2;color:#991b1b">${data.delayed_count} Delayed</span>` : ""}
      </div>
      ${data.summary
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
        .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
        .replace(/\n\n/g, "<br/><br/>")
      }
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const badge = HEALTH_BADGE[data?.health || "no_data"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 truncate">AI Status Analysis</h2>
                {data && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge?.cls || ""}`}>
                    {badge?.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 truncate">{projectDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {data && (
              <>
                <button onClick={copy} title="Copy to clipboard" className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white transition">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={download} title="Download as Markdown" className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white transition">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={print} title="Print / Save as PDF" className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white transition">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={generate} disabled={loading} title="Regenerate" className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-50 transition">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        {data?.stats && (
          <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-gray-100 bg-gray-50/50">
            <div className="rounded-lg bg-white border border-gray-100 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Complete</div>
              <div className="text-sm font-bold text-gray-900">{data.pct_complete}% <span className="text-[10px] font-normal text-gray-500">({data.stats.completed}/{data.stats.total})</span></div>
            </div>
            <div className="rounded-lg bg-white border border-blue-100 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-blue-600 font-semibold">In Progress</div>
              <div className="text-sm font-bold text-blue-700">{data.stats.in_progress}</div>
            </div>
            <div className="rounded-lg bg-white border border-red-100 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-red-600 font-semibold">Delayed</div>
              <div className="text-sm font-bold text-red-700">{data.delayed_count ?? data.stats.delayed}</div>
            </div>
            <div className="rounded-lg bg-white border border-violet-100 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-violet-600 font-semibold">Upcoming 14d</div>
              <div className="text-sm font-bold text-violet-700">{data.upcoming_count ?? 0}</div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="relative mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg animate-pulse">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 w-4 h-4 text-indigo-600 animate-spin" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Analyzing milestones…</div>
              <div className="text-xs text-gray-500 mt-1">Reading status, delays, owners and challenges</div>
            </div>
          ) : err ? (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Failed to generate summary</div>
                <div className="text-xs mt-1">{err}</div>
                <button onClick={generate} className="mt-2 text-xs font-semibold underline">Try again</button>
              </div>
            </div>
          ) : data ? (
            <>
              {renderSummaryMarkdown(data.summary)}
              <div className="mt-6 pt-3 border-t border-gray-100 text-[10px] text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Generated {new Date(data.generated_at).toLocaleString()} · AI-assisted briefing — verify critical facts before action.
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MeetingDiscussion() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const currentUserName = user?.full_name || user?.email || "";
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [project, setProject] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notes, setNotes] = useState<DiscussionNote[]>([]);
  const [users, setUsers] = useState<ErpUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpenStage, setAddOpenStage] = useState<Stage | null>(null);
  const [filterDelayed, setFilterDelayed] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<Stage>>(new Set());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderPoint[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [poLoading, setPoLoading] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [notesOpenSignal, setNotesOpenSignal] = useState<number | undefined>(undefined);

  // ── Load projects (once)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const list: ProjectOption[] = Array.isArray(data)
          ? data.map((p: any) => {
              // ERP project code (e.g. "WTT-0675") is the canonical identifier
              // used everywhere in ERPNext (POs, MRs, etc). The display name
              // ("Vishveshwara Denim Private Limited") is what we show to users.
              const erpCode = p.erpnextName ?? p.erpnext_name ?? p.name;
              const display = p.project_name ?? p.name ?? erpCode;
              return {
                name: erpCode,
                project_name: display,
                expectedStartDate: p.expectedStartDate ?? p.expected_start_date ?? null,
                expectedEndDate: p.expectedEndDate ?? p.expected_end_date ?? p.dueDate ?? null,
                estimatedCosting: Number(p.estimatedCosting ?? p.estimated_costing ?? 0) || 0,
                actualExpense: Number(p.actualExpense ?? p.actual_expense ?? 0) || 0,
                progress: Number(p.progress ?? p.percent_complete ?? 0) || 0,
                status: p.status ?? null,
                department: p.department ?? null,
                createdAt: p.createdAt ?? null,
              };
            })
          : [];
        setProjects(list);

        // Default-pick logic:
        // 1) Saved last-used project
        // 2) Project matching "0528" or containing "sachin" + "25" (Sachin 25 MLD)
        // 3) First project
        const saved = localStorage.getItem("pm:lastDiscussionProject");
        if (saved && list.some((p) => p.name === saved)) {
          setProject(saved);
        } else {
          const findIt = (pred: (p: ProjectOption) => boolean) => list.find(pred)?.name;
          const def =
            findIt((p) => /0528/.test(p.project_name || "") || /0528/.test(p.name || "")) ||
            findIt((p) => /sachin/i.test(p.project_name || "") && /25/.test(p.project_name || "")) ||
            findIt((p) => /sachin/i.test(p.project_name || "")) ||
            (list[0]?.name);
          if (def) setProject(def);
        }
      } catch {
        // Non-blocking
      }
    })();
  }, []);

  // ── Load ERPNext users (for owner picker + avatars)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/erpnext-users?all=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(
            data
              .filter((u: any) => u.enabled !== 0)
              .map((u: any) => ({
                email: u.email,
                full_name: u.full_name || u.email,
                user_image: u.user_image || null,
                enabled: u.enabled,
              })),
          );
        }
      } catch {
        // Non-blocking — fall back to free-text owner
      }
    })();
  }, []);

  const loadMilestones = useCallback(async (proj: string, opts: { seedIfEmpty?: boolean } = {}) => {
    if (!proj) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/meeting-discussions?project=${encodeURIComponent(proj)}${opts.seedIfEmpty ? "&seed=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);
      setMilestones(data.milestones || []);
      setNotes(data.notes || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (project) {
      localStorage.setItem("pm:lastDiscussionProject", project);
      loadMilestones(project, { seedIfEmpty: true });
    }
  }, [project, loadMilestones]);

  // Auto-load Purchase Order discussion points whenever the project changes.
  useEffect(() => {
    if (!project) {
      setPurchaseOrders([]);
      setPoTotal(0);
      return;
    }
    const ctrl = new AbortController();
    setPoLoading(true);
    fetch(`${API}/meeting-discussions/purchase-orders?project=${encodeURIComponent(project)}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : { purchase_orders: [], total_pos: 0 })
      .then((data) => {
        setPurchaseOrders(Array.isArray(data?.purchase_orders) ? data.purchase_orders : []);
        setPoTotal(Number(data?.total_pos) || 0);
      })
      .catch(() => { setPurchaseOrders([]); setPoTotal(0); })
      .finally(() => setPoLoading(false));
    return () => ctrl.abort();
  }, [project]);

  const updateMilestone = useCallback(async (id: number, patch: Partial<Milestone>) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try {
      const res = await fetch(`${API}/meeting-discussions/milestone/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setMilestones((prev) => prev.map((m) => (m.id === id ? data : m)));
      }
    } catch {
      if (project) loadMilestones(project);
    }
  }, [project, loadMilestones]);

  const deleteMilestone = useCallback(async (id: number) => {
    if (!confirm("Delete this milestone?")) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    await fetch(`${API}/meeting-discussions/milestone/${id}`, { method: "DELETE" });
  }, []);

  const addMilestone = useCallback((m: Milestone) => {
    setMilestones((prev) => [...prev, m]);
  }, []);

  // Stats (overall) — status counts are independent of the delay flag, so a
  // milestone marked "in_progress" still increments inProgress even when its
  // planned date has passed (it ALSO counts as delayed). This keeps the
  // KPI tiles meaningful: setting status → "In Progress" always reflects.
  const stats = useMemo(() => {
    let completed = 0, inProgress = 0, delayed = 0, pending = 0;
    for (const m of milestones) {
      if (delayInfo(m).isDelayed && m.status !== "completed") delayed++;
      if (m.status === "completed") completed++;
      else if (m.status === "in_progress") inProgress++;
      else if (m.status === "delayed") {/* counted via delayed only */}
      else pending++;
    }
    const total = milestones.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, delayed, pending, pct };
  }, [milestones]);

  // Health classification
  const health = useMemo(() => {
    if (stats.total === 0) return { label: "No data", color: "text-gray-500", hex: "#9ca3af" };
    const delayRatio = stats.delayed / stats.total;
    if (delayRatio >= 0.25) return { label: "Critical", color: "text-red-600", hex: "#dc2626" };
    if (delayRatio > 0) return { label: "At Risk", color: "text-amber-600", hex: "#d97706" };
    if (stats.pct === 100) return { label: "Complete", color: "text-emerald-600", hex: "#10b981" };
    return { label: "On Track", color: "text-emerald-600", hex: "#10b981" };
  }, [stats]);

  // Group by stage (and within each stage, by department)
  const grouped = useMemo(() => {
    const map = new Map<Stage, Map<string, Milestone[]>>();
    for (const stage of STAGES) map.set(stage.key, new Map());
    for (const m of milestones) {
      if (filterDelayed && !delayInfo(m).isDelayed) continue;
      const byDept = map.get(m.stage);
      if (!byDept) continue;
      const dept = m.department || "General";
      const list = byDept.get(dept) || [];
      list.push(m);
      byDept.set(dept, list);
    }
    return map;
  }, [milestones, filterDelayed]);

  // Selection: scroll-into-view + highlight
  const selectMilestone = useCallback((id: number) => {
    setHighlightId(id);
    const m = milestones.find((x) => x.id === id);
    if (m) {
      // Make sure the stage section is expanded
      setCollapsedStages((prev) => {
        if (!prev.has(m.stage)) return prev;
        const next = new Set(prev); next.delete(m.stage); return next;
      });
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-milestone-id="${id}"]`) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    });
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2400);
  }, [milestones]);

  const jumpStage = useCallback((s: Stage) => {
    setActiveStage(s);
    setCollapsedStages((prev) => {
      if (!prev.has(s)) return prev;
      const next = new Set(prev); next.delete(s); return next;
    });
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-stage-section="${s}"]`) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
    setTimeout(() => setActiveStage((cur) => (cur === s ? null : cur)), 2000);
  }, []);

  const toggleStage = (s: Stage) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Project Meeting Discussion</h1>
                <p className="text-[11px] sm:text-xs text-gray-600">
                  Where we are · where we're delayed · who depends on whom — one page, every project.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ProjectPicker value={project} options={projects} onChange={setProject} />
            <button
              onClick={() => project && setAiSummaryOpen(true)}
              disabled={!project}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 border border-indigo-700/40 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-indigo-500/20"
              title="Generate an AI status summary report for this project"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI Summary</span>
              <Sparkles className="w-3 h-3 hidden sm:inline" />
            </button>
            <button
              onClick={() => setFilterDelayed((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition shadow-sm ${
                filterDelayed
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                  : "text-gray-700 bg-white border-gray-200 hover:border-red-300 hover:text-red-700"
              }`}
              title={filterDelayed ? "Showing delayed only — click to clear" : "Show only delayed milestones"}
            >
              <AlertTriangle className="w-4 h-4" />
              {filterDelayed ? "Delayed only" : "Delays"}
              {stats.delayed > 0 && !filterDelayed && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">{stats.delayed}</span>
              )}
            </button>
            <button
              onClick={() => project && loadMilestones(project)}
              disabled={!project || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Body */}
        {!project ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-10 text-center text-gray-500 flex flex-col items-center justify-center min-h-[420px]">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Pick a project to start tracking discussions</p>
              <p className="text-xs text-gray-500 mt-1">
                Use the project picker above to load milestones, delays, and challenges.
              </p>
            </div>
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <DelaysSpotlight
                milestones={[]}
                onSelect={() => {}}
                onOpenDetail={() => navigate("/project-insights?tab=delays")}
              />
              <ChallengesPanel
                milestones={[]}
                users={users}
                onSelect={() => {}}
                onOpenDetail={() => navigate("/project-insights?tab=challenges")}
              />
              <DiscussionNotesPanel
                project=""
                notes={[]}
                onCreated={() => {}}
                onDeleted={() => {}}
                openSignal={notesOpenSignal}
              />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : (
          <>
            {/* Project Header — start, today, completion, delay cost */}
            <ProjectHeader
              project={projects.find((p) => p.name === project)}
              milestones={milestones}
              stats={stats}
            />

            {/* KPI Hero */}
            <KpiHero stats={stats} healthLabel={health.label} healthColor={health.color} healthHex={health.hex} />

            {/* Stage Pipeline */}
            <StagePipeline milestones={milestones} onJumpStage={jumpStage} activeStage={activeStage} />

            {/* Master Timeline */}
            <GanttTimeline milestones={milestones} onSelect={selectMilestone} />

            {/* Two-column: Stage cards + Side rail (Delays + Notes) */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-bold text-gray-800">All Milestones — Inline Edit</h2>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Click any field to edit · auto-saves
                  </div>
                </div>

                {STAGES.map((stage) => {
                  const byDept = grouped.get(stage.key) || new Map<string, Milestone[]>();
                  const total = Array.from(byDept.values()).reduce((s, l) => s + l.length, 0);
                  const stageDelays = milestones
                    .filter((m) => m.stage === stage.key)
                    .filter((m) => delayInfo(m).isDelayed).length;
                  const collapsed = collapsedStages.has(stage.key);
                  const Icon = stage.icon;
                  const highlighted = activeStage === stage.key;

                  return (
                    <section
                      key={stage.key}
                      data-stage-section={stage.key}
                      className={`rounded-2xl border ${stage.border} ${stage.bg} shadow-sm overflow-hidden transition-all ${
                        highlighted ? "ring-2 ring-blue-400 shadow-lg" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStage(stage.key)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/60 bg-white/40 backdrop-blur-sm hover:bg-white/60 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition ${collapsed ? "" : "rotate-90"}`} />
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: stage.hexLight, color: stage.hex }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <h2 className={`text-sm font-bold ${stage.color} truncate`}>{stage.label}</h2>
                            <p className="text-[10px] text-gray-500 truncate">{stage.desc}</p>
                          </div>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${stage.color} bg-white border ${stage.border}`}>
                            {total}
                          </span>
                          {stageDelays > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> {stageDelays}
                            </span>
                          )}
                        </div>
                        <span
                          onClick={(e) => { e.stopPropagation(); setAddOpenStage(stage.key); }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${stage.color} bg-white border ${stage.border} hover:shadow-sm transition cursor-pointer`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </span>
                      </button>

                      {!collapsed && (
                        <div className="p-3">
                          {total === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-400 italic">
                              {filterDelayed ? "No delays in this stage." : "No milestones in this stage yet."}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {Array.from(byDept.entries()).map(([dept, list]) => (
                                <div key={dept}>
                                  <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <div className={`text-[10px] uppercase tracking-widest font-bold ${stage.color}`}>{dept}</div>
                                    <div className={`flex-1 h-px bg-gradient-to-r from-current to-transparent opacity-30 ${stage.color}`} />
                                    <div className="text-[10px] text-gray-500 font-semibold">{list.length}</div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {list.map((m) => (
                                      <MilestoneCard
                                        key={m.id}
                                        m={m}
                                        onUpdate={(patch) => updateMilestone(m.id, patch)}
                                        onDelete={() => deleteMilestone(m.id)}
                                        highlightId={highlightId}
                                        users={users}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {/* Right rail */}
              <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                <DelaysSpotlight
                  milestones={milestones}
                  onSelect={selectMilestone}
                  onOpenDetail={() =>
                    navigate(project ? `/project-insights?tab=delays&project=${encodeURIComponent(project)}` : "/project-insights?tab=delays")
                  }
                />
                <ChallengesPanel
                  milestones={milestones}
                  users={users}
                  onSelect={selectMilestone}
                  onOpenDetail={() =>
                    navigate(project ? `/project-insights?tab=challenges&project=${encodeURIComponent(project)}` : "/project-insights?tab=challenges")
                  }
                />
                <DiscussionNotesPanel
                  project={project}
                  notes={notes}
                  onCreated={(n) => setNotes((prev) => [n, ...prev])}
                  onDeleted={(id) => setNotes((prev) => prev.filter((x) => x.id !== id))}
                  openSignal={notesOpenSignal}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <AddMilestoneModal
        open={addOpenStage !== null}
        project={project}
        defaultStage={addOpenStage || "kickoff"}
        onClose={() => setAddOpenStage(null)}
        onCreated={addMilestone}
        users={users}
        currentUserName={currentUserName}
      />

      <AiSummaryModal
        open={aiSummaryOpen}
        project={project}
        projectDisplay={projects.find((p) => p.name === project)?.project_name || project}
        onClose={() => setAiSummaryOpen(false)}
      />

      {/* Fixed bottom-right shortcut: jump to & open Meeting Notes (this module only) */}
      <button
        type="button"
        onClick={() => setNotesOpenSignal(Date.now())}
        title="Open Meeting Notes"
        aria-label="Open Meeting Notes"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-700/20 transition"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-xs font-semibold">Notes</span>
        {notes.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold tabular-nums">
            {notes.length}
          </span>
        )}
      </button>
    </Layout>
  );
}
