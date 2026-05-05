import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Users, CalendarCheck, CalendarClock, Flame, Zap, Sun,
  Snowflake, UserCog, Building2, PhoneCall, Search, Paperclip, X, Download,
  TrendingUp, LayoutDashboard, ArrowUpRight, Star, Activity, Target,
  ThermometerSun, Mail, Phone, MessageCircle, Calendar, Hash, MessageSquare,
  Inbox, Eye, MapPin, Globe, Briefcase, FileText, User as UserIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ApiResp = { total_count: number; data: any[] };
type Key =
  | "open_leads" | "today_followup" | "yest_followup"
  | "red_hot" | "hot_lead" | "warm_lead" | "cold_lead"
  | "total_agents" | "customer_details" | "call_logs";

export type Theme = {
  label: string;
  icon: React.ElementType;
  /** tailwind text color */ text: string;
  /** tailwind bg-50 tint for header */ tint: string;
  /** tailwind dot bg-500 */ dot: string;
  /** tailwind border-100 */ border: string;
};

const META: Record<Key, Theme> = {
  open_leads:       { label: "Open Leads",           icon: Users,         text: "text-emerald-700", tint: "bg-emerald-50/60", dot: "bg-emerald-500", border: "border-emerald-100" },
  today_followup:   { label: "Today's Followup",     icon: CalendarCheck, text: "text-sky-700",     tint: "bg-sky-50/60",     dot: "bg-sky-500",     border: "border-sky-100" },
  yest_followup:    { label: "Yesterday's Followup", icon: CalendarClock, text: "text-violet-700",  tint: "bg-violet-50/60",  dot: "bg-violet-500",  border: "border-violet-100" },
  red_hot:          { label: "Red Hot Leads",        icon: Flame,         text: "text-rose-700",    tint: "bg-rose-50/60",    dot: "bg-rose-500",    border: "border-rose-100" },
  hot_lead:         { label: "Hot Leads",            icon: Zap,           text: "text-orange-700",  tint: "bg-orange-50/60",  dot: "bg-orange-500",  border: "border-orange-100" },
  warm_lead:        { label: "Warm Leads",           icon: Sun,           text: "text-amber-700",   tint: "bg-amber-50/60",   dot: "bg-amber-500",   border: "border-amber-100" },
  cold_lead:        { label: "Cold Leads",           icon: Snowflake,     text: "text-slate-700",   tint: "bg-slate-50/60",   dot: "bg-slate-500",   border: "border-slate-100" },
  total_agents:     { label: "Total Agents",         icon: UserCog,       text: "text-teal-700",    tint: "bg-teal-50/60",    dot: "bg-teal-500",    border: "border-teal-100" },
  customer_details: { label: "Customer Details",     icon: Building2,     text: "text-blue-700",    tint: "bg-blue-50/60",    dot: "bg-blue-500",    border: "border-blue-100" },
  call_logs:        { label: "Call Logs",            icon: PhoneCall,     text: "text-cyan-700",    tint: "bg-cyan-50/60",    dot: "bg-cyan-500",    border: "border-cyan-100" },
};

function useSales(key: Key) {
  return useQuery<ApiResp>({
    queryKey: ["sales-dashboard", key],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/sales-dashboard/${key}`);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    staleTime: 60_000,
  });
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function useFilter<T extends Record<string, any>>(rows: T[], q: string, cols: string[]) {
  return useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter((r) => cols.some((c) => String(r[c] ?? "").toLowerCase().includes(n)));
  }, [rows, q, cols]);
}

/* ── Column defs ───────────────────────────────────────────────────────── */
const FOLLOWUP_COLS = [
  { key: "priority",      label: "Priority" },
  { key: "lead_id",       label: "Lead ID" },
  { key: "lead_name",     label: "Lead Name" },
  { key: "date",          label: "Date" },
  { key: "mode_of_comm",  label: "Mode" },
  { key: "employee_name", label: "Employee" },
  { key: "represent_name",label: "Representative" },
  { key: "sentiment",     label: "Tone" },
  { key: "conversation",  label: "Conversation" },
  { key: "next_followup", label: "Next" },
];

const LEAD_COLS = [
  { key: "date",          label: "Date" },
  { key: "company_name",  label: "Company" },
  { key: "email_id",      label: "Email" },
  { key: "contact_no_1",  label: "Contact 1" },
  { key: "contact_no_2",  label: "Contact 2" },
  { key: "capacity",      label: "Capacity" },
  { key: "requirement",   label: "Requirement" },
  { key: "next_followup", label: "Next" },
];

export const OPEN_LEAD_COLS = [
  { key: "name",           label: "Lead ID" },
  { key: "company_name",   label: "Company Name" },
  { key: "email_id",       label: "Email ID" },
  { key: "contact_no_1",   label: "Contact 1" },
  { key: "contact_no_2",   label: "Contact 2" },
  { key: "capacity",       label: "Capacity" },
  { key: "country",        label: "Country" },
  { key: "state",          label: "State" },
  { key: "next_follow_up", label: "Next Followup" },
];

const AGENT_COLS = [
  { key: "agent_name",   label: "Agent" },
  { key: "company_name", label: "Company" },
  { key: "region",       label: "Region" },
  { key: "email_id",     label: "Email" },
  { key: "contact_1",    label: "Contact 1" },
  { key: "contact_2",    label: "Contact 2" },
  { key: "contact_3",    label: "Contact 3" },
];

const CUSTOMER_COLS = [
  { key: "proposal_req_no", label: "Proposal Req" },
  { key: "customer_name",   label: "Customer" },
  { key: "email",           label: "Email" },
  { key: "phone",           label: "Phone" },
  { key: "capacity",        label: "Capacity" },
  { key: "attachments",     label: "Files" },
];

const CALL_COLS = [
  { key: "phone",       label: "Phone" },
  { key: "person_name", label: "Person" },
  { key: "call_date",   label: "Call Date" },
  { key: "call_type",   label: "Type" },
  { key: "summary",     label: "Summary" },
];

/* ── Cell building blocks ──────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",     "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",   "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",     "bg-sky-100 text-sky-700",
  "bg-blue-100 text-blue-700",     "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700", "bg-pink-100 text-pink-700",
];
function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < (s ?? "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(s: string): string {
  const parts = (s ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function Avatar({ name, size = 6 }: { name: string; size?: 5 | 6 | 7 }) {
  const cls = colorFor(name);
  const px = size === 5 ? "w-5 h-5 text-[8px]" : size === 7 ? "w-7 h-7 text-[10px]" : "w-6 h-6 text-[9px]";
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full font-bold shrink-0", cls, px)}>
      {initials(name)}
    </span>
  );
}
function NameCell({ name, sub }: { name: string; sub?: string }) {
  if (!name || name === "—") return <span className="text-gray-300">—</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Avatar name={name} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-gray-800 truncate">{name}</div>
        {sub && <div className="text-[9px] text-gray-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}
function IdBadge({ id }: { id: string }) {
  if (!id || id === "—") return <span className="text-gray-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-bold font-mono border border-indigo-100">
      <Hash className="w-2.5 h-2.5" /> {id}
    </span>
  );
}
function EmailCell({ email }: { email: string }) {
  if (!email || email === "—") return <span className="text-gray-300">—</span>;
  return (
    <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[180px]">
      <Mail className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{email}</span>
    </a>
  );
}
function PhoneCell({ phone }: { phone: string }) {
  if (!phone || phone === "—") return <span className="text-gray-300">—</span>;
  const clean = String(phone).replace(/[^\d+]/g, "");
  return (
    <a href={`tel:${clean}`} className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-mono">
      <Phone className="w-2.5 h-2.5" /> {phone}
    </a>
  );
}
function DateCell({ date }: { date?: string }) {
  if (!date) return <span className="text-gray-300">—</span>;
  const d = new Date(date);
  if (isNaN(d.getTime())) return <span className="text-gray-500 text-[10px]">{String(date)}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
      <Calendar className="w-2.5 h-2.5 text-gray-400" />
      {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
    </span>
  );
}
function ModeCell({ mode }: { mode?: string }) {
  if (!mode) return <span className="text-gray-300">—</span>;
  const m = mode.toLowerCase();
  let Icon = MessageCircle, cls = "bg-gray-50 text-gray-600 border-gray-200";
  if (m.includes("call") || m.includes("phone")) { Icon = Phone; cls = "bg-emerald-50 text-emerald-700 border-emerald-200"; }
  else if (m.includes("mail")) { Icon = Mail; cls = "bg-blue-50 text-blue-700 border-blue-200"; }
  else if (m.includes("whatsapp") || m.includes("chat") || m.includes("message")) { Icon = MessageSquare; cls = "bg-teal-50 text-teal-700 border-teal-200"; }
  else if (m.includes("visit") || m.includes("meet")) { Icon = Users; cls = "bg-violet-50 text-violet-700 border-violet-200"; }
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold", cls)}>
      <Icon className="w-2.5 h-2.5" /> {mode}
    </span>
  );
}
function CompanyCell({ name }: { name: string }) {
  if (!name || name === "—") return <span className="text-gray-300">—</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={cn("inline-flex items-center justify-center rounded-md w-6 h-6 shrink-0", colorFor(name))}>
        <Building2 className="w-3 h-3" />
      </span>
      <span className="text-[11px] font-semibold text-gray-800 truncate">{name}</span>
    </div>
  );
}
function CapacityCell({ cap }: { cap?: string }) {
  if (!cap) return <span className="text-gray-300">—</span>;
  return (
    <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-100">
      {cap}
    </span>
  );
}
function RegionCell({ region }: { region?: string }) {
  if (!region) return <span className="text-gray-300">—</span>;
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold", colorFor(region))}>
      {region}
    </span>
  );
}
function CallTypeCell({ t }: { t?: string }) {
  if (!t) return <span className="text-gray-300">—</span>;
  const tl = t.toLowerCase();
  const cls = tl.includes("incoming") || tl.includes("in") ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : tl.includes("outgoing") || tl.includes("out") ? "bg-blue-50 text-blue-700 border-blue-200"
            : tl.includes("missed") ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase", cls)}>
      {t}
    </span>
  );
}

/* ── Smart auto cell renderer (used by all panels by default) ──────────── */
function smartCell(col: string, row: any): any {
  const v = row[col];
  if (v === undefined || v === null || v === "") return <span className="text-gray-300">—</span>;
  const c = col.toLowerCase();
  if (c === "name" || c === "lead_id" || c.endsWith("_id") || c === "proposal_req_no") return <IdBadge id={String(v)} />;
  if (c.includes("company") || c === "customer_name") return <CompanyCell name={String(v)} />;
  if (c === "lead_name" || c === "person_name" || c === "agent_name" || c === "employee_name" || c === "represent_name") return <NameCell name={String(v)} />;
  if (c.includes("email")) return <EmailCell email={String(v)} />;
  if (c.includes("contact") || c.includes("phone")) return <PhoneCell phone={String(v)} />;
  if (c === "date" || c.endsWith("_date") || c === "next_followup" || c === "next_follow_up") return <DateCell date={String(v)} />;
  if (c === "mode_of_comm" || c === "mode") return <ModeCell mode={String(v)} />;
  if (c === "capacity") return <CapacityCell cap={String(v)} />;
  if (c === "region") return <RegionCell region={String(v)} />;
  if (c === "call_type") return <CallTypeCell t={String(v)} />;
  if (c === "summary" || c === "remarks" || c === "notes" || c === "description") return <RichSummaryCell text={String(v)} />;
  return <span className="text-[11px] text-gray-700">{String(v)}</span>;
}

/* ── Rich summary cell: parses <b>, line breaks, bullet dashes ─────────── */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderInline(s: string): { __html: string } {
  // escape, then re-enable <b>/<strong>/<i>/<em>
  let h = escapeHtml(s);
  h = h.replace(/&lt;(\/?)(b|strong)&gt;/gi, "<$1strong>");
  h = h.replace(/&lt;(\/?)(i|em)&gt;/gi, "<$1em>");
  h = h.replace(/&lt;br\s*\/?&gt;/gi, "<br/>");
  return { __html: h };
}
function RichSummaryCell({ text }: { text: string }) {
  if (!text || text === "—") return <span className="text-gray-300">—</span>;
  // Split on " - " or newline bullets into items
  const cleaned = text.replace(/\s+-\s+/g, "\n- ").trim();
  const lines = cleaned.split(/\n+/).map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
  const isMulti = lines.length > 1;

  return (
    <div className={cn(
      "rounded-md border border-gray-100 bg-gradient-to-br from-gray-50 to-white px-2 py-1.5 max-w-[420px]",
      "text-[10.5px] leading-snug text-gray-700"
    )}>
      {isMulti ? (
        <ul className="space-y-1">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              <span
                className="[&>strong]:font-bold [&>strong]:text-gray-900 [&>em]:italic"
                dangerouslySetInnerHTML={renderInline(l)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <span
          className="[&>strong]:font-bold [&>strong]:text-gray-900 [&>em]:italic"
          dangerouslySetInnerHTML={renderInline(lines[0] ?? text)}
        />
      )}
    </div>
  );
}

/* ── Followup priority rating (0–5 stars based on next-followup proximity) */
function followupRating(next?: string | null): number {
  if (!next) return 1;
  const days = Math.ceil((new Date(next).getTime() - Date.now()) / 86400000);
  if (days < 0) return 5;       // overdue
  if (days === 0) return 5;     // today
  if (days <= 1) return 4;
  if (days <= 3) return 3;
  if (days <= 7) return 2;
  return 1;
}
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn("w-2.5 h-2.5", i < value ? "fill-amber-400 text-amber-400" : "text-gray-200")}
        />
      ))}
    </div>
  );
}

/* ── Tiny sparkline-style mini bar ─────────────────────────────────────── */
function MiniProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-bold text-gray-500 w-7 text-right tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

/* ── Temperature pill for lead conversation tone ───────────────────────── */
function ConversationTemp({ text }: { text?: string }) {
  const t = (text ?? "").toLowerCase();
  let kind: "hot" | "warm" | "cool" | "neutral" = "neutral";
  if (/(positive|interest|order|confirm|approved|ready|finalis|finaliz|good|yes)/.test(t)) kind = "hot";
  else if (/(discuss|review|consider|maybe|share|send|will|follow)/.test(t)) kind = "warm";
  else if (/(no|not interested|busy|later|reject|hold|delay|unavail)/.test(t)) kind = "cool";
  const cfg = {
    hot:     { dot: "bg-emerald-500", label: "Positive", text: "text-emerald-700", bg: "bg-emerald-50" },
    warm:    { dot: "bg-amber-500",   label: "Neutral",  text: "text-amber-700",   bg: "bg-amber-50" },
    cool:    { dot: "bg-rose-500",    label: "Negative", text: "text-rose-700",    bg: "bg-rose-50" },
    neutral: { dot: "bg-gray-400",    label: "—",        text: "text-gray-500",    bg: "bg-gray-50" },
  }[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/* ── Attachments mini-modal ────────────────────────────────────────────── */
function CustomerAttachments({ files }: { files?: { name: string; url: string }[] }) {
  const [open, setOpen] = useState(false);
  const list = files ?? [];
  if (list.length === 0) return <span className="text-gray-300">—</span>;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
      >
        <Paperclip className="w-3 h-3" /> {list.length}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-full max-h-[80vh] overflow-hidden border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/60">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-800 flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" /> Attachments
              </span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[60vh] space-y-1">
              {list.map((f, i) => (
                <a
                  key={i}
                  href={f.url ? `https://erp.wttint.com${f.url}` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-blue-50/40 text-[11px] text-gray-700"
                >
                  <span className="truncate">{f.name}</span>
                  <Download className="w-3 h-3 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Card panel matching Marketing dashboard ───────────────────────────── */
export function Panel({
  k, cols, renderCell, height = 320, enableLocationFilter = false, enableDetailsView = false, size = "compact",
}: {
  k: Key;
  cols: { key: string; label: string }[];
  renderCell?: (col: string, row: any) => React.ReactNode;
  height?: number;
  enableLocationFilter?: boolean;
  enableDetailsView?: boolean;
  size?: "compact" | "comfortable";
}) {
  const isComfy = size === "comfortable";
  const T = {
    headerCellPad: isComfy ? "px-4 py-3"          : "px-3 py-2.5",
    headerLabel:   isComfy ? "text-[11px]"        : "text-[9px]",
    bodyCellPad:   isComfy ? "px-4 py-3"          : "px-3 py-2",
    bodyText:      isComfy ? "text-[13px]"        : "text-[11px]",
    bodyTextWide:  isComfy ? "max-w-[360px]"      : "max-w-[280px]",
    rowNumBox:     isComfy ? "w-7 h-7 text-[11px]" : "w-5 h-5 text-[9px]",
    actionBtn:     isComfy ? "px-3 py-1.5 text-[12px]" : "px-2.5 py-1 text-[10px]",
    actionIcon:    isComfy ? "w-3.5 h-3.5"        : "w-3 h-3",
    actionTd:      isComfy ? "px-3 py-2"          : "px-2 py-1.5",
    actionColW:    isComfy ? "w-36"               : "w-32",
  };
  const m = META[k];
  const Icon = m.icon;
  const q = useSales(k);
  const rows = q.data?.data ?? [];
  const total = q.data?.total_count ?? 0;
  const [, navigate] = useLocation();
  const [s, setS] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [remarksRow, setRemarksRow] = useState<any | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const hasColFilters = Object.values(colFilters).some((v) => String(v ?? "").trim() !== "");

  // Build country & state option lists from data
  const countries = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r: any) => { const c = String(r.country ?? "").trim(); if (c) set.add(c); });
    return Array.from(set).sort();
  }, [rows]);
  const states = useMemo(() => {
    const set = new Set<string>();
    rows
      .filter((r: any) => !country || String(r.country ?? "").trim() === country)
      .forEach((r: any) => { const st = String(r.state ?? "").trim(); if (st) set.add(st); });
    return Array.from(set).sort();
  }, [rows, country]);

  // Reset state filter if not present in current country
  useMemo(() => {
    if (state && !states.includes(state)) setState("");
  }, [states, state]);

  // Apply location filter first, then text search
  const locFiltered = useMemo(() => {
    if (!country && !state) return rows;
    return rows.filter((r: any) =>
      (!country || String(r.country ?? "").trim() === country) &&
      (!state   || String(r.state   ?? "").trim() === state)
    );
  }, [rows, country, state]);
  // Apply per-column filters next
  const colFiltered = useMemo(() => {
    const active = Object.entries(colFilters).filter(([, v]) => String(v ?? "").trim() !== "");
    if (active.length === 0) return locFiltered;
    return locFiltered.filter((r: any) =>
      active.every(([key, v]) =>
        String(r[key] ?? "").toLowerCase().includes(String(v).toLowerCase())
      )
    );
  }, [locFiltered, colFilters]);
  const filtered = useFilter(colFiltered, s, cols.map((c) => c.key));
  const PAGE = 50;
  const [visible, setVisible] = useState(PAGE);
  // reset paging when search/filters change
  useMemo(() => { setVisible(PAGE); }, [s, country, state, colFilters]);
  const pageRows = filtered.slice(0, visible);
  const hasActiveLocFilter = !!(country || state);

  return (
    <>
    <div className={cn(
      "bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col",
      isComfy ? "rounded-2xl" : "rounded-xl",
    )}>
      <div className={cn(
        "flex items-center gap-2 border-b border-gray-100",
        isComfy ? "px-5 py-3" : "px-4 py-2.5",
        m.tint,
      )}>
        <Icon className={cn("shrink-0", isComfy ? "w-4 h-4" : "w-3.5 h-3.5", m.text)} />
        <span className={cn(
          "font-bold uppercase tracking-wide",
          isComfy ? "text-[13px]" : "text-xs",
          m.text,
        )}>{m.label}</span>
        <span className={cn(
          "ml-1 font-bold text-white rounded-full",
          isComfy ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5",
          m.dot,
        )}>
          {q.isLoading ? "…" : total}
        </span>
        <div className="flex-1" />
        <div className="relative">
          <Search className={cn(
            "absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400",
            isComfy ? "w-3.5 h-3.5" : "w-3 h-3",
          )} />
          <input
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="Search"
            className={cn(
              "rounded-md border border-gray-200 bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-emerald-100",
              isComfy ? "pl-8 pr-3 py-1.5 text-[12px] w-56" : "pl-6 pr-2 py-1 text-[10px] w-32",
            )}
          />
        </div>
        <button
          onClick={() => q.refetch()}
          className={cn(
            "rounded-md text-gray-400 hover:text-gray-700 hover:bg-white transition-colors",
            isComfy ? "p-1.5" : "p-1",
          )}
          title="Refresh"
        >
          <RefreshCw className={cn(isComfy ? "w-3.5 h-3.5" : "w-3 h-3", q.isFetching && "animate-spin")} />
        </button>
      </div>
      {enableLocationFilter && !q.isLoading && (countries.length > 0 || hasActiveLocFilter || hasColFilters) && (
        <div className={cn(
          "flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 flex-wrap",
          isComfy ? "px-5 py-2.5" : "px-4 py-2",
        )}>
          <Globe className={cn("text-gray-500", isComfy ? "w-3.5 h-3.5" : "w-3 h-3")} />
          <span className={cn(
            "font-semibold uppercase tracking-wider text-gray-500",
            isComfy ? "text-[11px]" : "text-[10px]",
          )}>Location</span>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setState(""); }}
            className={cn(
              "rounded-md border border-gray-200 bg-white focus:outline-none focus:border-gray-400",
              isComfy ? "text-[12px] px-2.5 py-1.5 max-w-[180px]" : "text-[10px] px-2 py-1 max-w-[140px]",
            )}
          >
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={states.length === 0}
            className={cn(
              "rounded-md border border-gray-200 bg-white focus:outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400",
              isComfy ? "text-[12px] px-2.5 py-1.5 max-w-[180px]" : "text-[10px] px-2 py-1 max-w-[140px]",
            )}
          >
            <option value="">All States</option>
            {states.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          {(hasActiveLocFilter || hasColFilters || s) && (
            <button
              onClick={() => { setCountry(""); setState(""); setColFilters({}); setS(""); }}
              className={cn(
                "rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 font-semibold",
                isComfy ? "text-[12px] px-2.5 py-1.5" : "text-[10px] px-2 py-1",
              )}
            >
              Clear All
            </button>
          )}
          <span className={cn(
            "ml-auto text-gray-500 tabular-nums",
            isComfy ? "text-[12px]" : "text-[10px]",
          )}>
            <span className="font-bold text-gray-700">{filtered.length}</span> of <span className="font-bold text-gray-700">{rows.length}</span>
          </span>
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight: height }}>
        {q.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 text-xs">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", m.tint)}>
              <RefreshCw className={cn("w-4 h-4 animate-spin", m.text)} />
            </div>
            <span>Loading {m.label.toLowerCase()}…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs gap-2">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", m.tint)}>
              <Inbox className={cn("w-4 h-4", m.text)} />
            </div>
            <span className="font-semibold">No records to show</span>
          </div>
        ) : (
          <table className={cn("w-full border-separate border-spacing-0", isComfy ? "text-sm" : "text-xs")}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={cn(T.headerCellPad, "text-left font-extrabold uppercase tracking-widest w-12 border-b backdrop-blur-sm", T.headerLabel, m.tint, m.border, m.text)}>#</th>
                {cols.map((c) => (
                  <th key={c.key} className={cn(T.headerCellPad, "text-left font-extrabold uppercase tracking-widest whitespace-nowrap border-b backdrop-blur-sm", T.headerLabel, m.tint, m.border, m.text)}>
                    {c.label}
                  </th>
                ))}
                {enableDetailsView && (
                  <th className={cn(T.headerCellPad, "text-center font-extrabold uppercase tracking-widest border-b backdrop-blur-sm", T.actionColW, T.headerLabel, m.tint, m.border, m.text)}>
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => {
                const goToView = () => navigate(`/sales-dashboard/lead/${encodeURIComponent(String(r.name ?? ""))}`);
                return (
                <tr
                  key={i}
                  onClick={enableDetailsView ? goToView : undefined}
                  className={cn(
                    "group transition-all align-middle",
                    "hover:shadow-[inset_3px_0_0_0_rgb(99,102,241)] hover:bg-indigo-50/30",
                    enableDetailsView && "cursor-pointer",
                    i % 2 !== 0 && "bg-gray-50/40"
                  )}
                >
                  <td className={cn(T.bodyCellPad, "border-b border-gray-100")}>
                    <span className={cn(
                      "inline-flex items-center justify-center rounded-md font-bold tabular-nums",
                      T.rowNumBox,
                      "bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors"
                    )}>{i + 1}</span>
                  </td>
                  {cols.map((c) => {
                    const custom = renderCell ? renderCell(c.key, r) : undefined;
                    const content = custom !== undefined ? custom : smartCell(c.key, r);
                    return (
                      <td key={c.key} className={cn(T.bodyCellPad, "border-b border-gray-100 text-gray-700", T.bodyText, T.bodyTextWide)}>
                        <div className="truncate" title={String(r[c.key] ?? "")}>
                          {content}
                        </div>
                      </td>
                    );
                  })}
                  {enableDetailsView && (
                    <td className={cn(T.actionTd, "border-b border-gray-100 text-center")} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); goToView(); }}
                        title="Open lead view"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white shadow-sm font-semibold text-sky-700 hover:bg-sky-50 hover:border-sky-200 transition-colors",
                          T.actionBtn,
                        )}
                      >
                        <Eye className={T.actionIcon} />
                        <span className="hidden lg:inline">View</span>
                      </button>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {!q.isLoading && filtered.length > visible && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 flex items-center justify-between text-[10px]">
          <span className="text-gray-500">
            Showing <span className="font-bold text-gray-700 tabular-nums">{visible}</span> of <span className="font-bold text-gray-700 tabular-nums">{filtered.length}</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className={cn("px-2 py-1 rounded-md font-bold text-white", m.dot, "hover:opacity-90 transition-opacity")}
            >
              Show {Math.min(PAGE, filtered.length - visible)} more
            </button>
            <button
              onClick={() => setVisible(filtered.length)}
              className="px-2 py-1 rounded-md font-bold border border-gray-200 text-gray-600 hover:bg-white"
            >
              All
            </button>
          </div>
        </div>
      )}
    </div>
    {detailRow && <LeadDetailsModal row={detailRow} theme={m} onClose={() => setDetailRow(null)} />}
    {remarksRow && <RemarksModal row={remarksRow} theme={m} onClose={() => setRemarksRow(null)} />}
    </>
  );
}

/* ── Remarks-only modal ───────────────────────────────────────────────── */
function RemarksModal({ row, theme, onClose }: { row: any; theme: Theme; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-center gap-3 px-5 py-3 border-b border-gray-100", theme.tint)}>
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">Remarks</div>
            <div className="text-sm font-bold text-gray-900 truncate">
              {row.company_name || "—"}{" "}
              {row.name && <span className="text-gray-400 font-normal text-xs">· {row.name}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:bg-white hover:text-gray-700 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className={cn(
            "text-[12px] rounded-lg p-4 border whitespace-pre-wrap leading-relaxed min-h-[120px]",
            row.remarks ? "bg-amber-50/50 border-amber-100 text-gray-800" : "bg-gray-50 border-gray-100 text-gray-400 italic"
          )}>
            {row.remarks ? String(row.remarks) : "No remarks recorded for this lead."}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Lead Details Modal (eye-icon view) ───────────────────────────────── */
export function LeadDetailsModal({ row, theme, onClose }: { row: any; theme: Theme; onClose: () => void }) {
  const fields: { label: string; value: any; icon?: React.ElementType; full?: boolean }[] = [
    { label: "Lead ID",         value: row.name,            icon: Hash },
    { label: "Status",          value: row.lead_status,     icon: Activity },
    { label: "Company",         value: row.company_name,    icon: Building2 },
    { label: "Contact Person",  value: row.contact_person,  icon: UserIcon },
    { label: "Designation",     value: row.designation,     icon: Briefcase },
    { label: "Industry",        value: row.industry,        icon: Briefcase },
    { label: "Email",           value: row.email_id,        icon: Mail },
    { label: "Contact 1",       value: row.contact_no_1,    icon: Phone },
    { label: "Contact 2",       value: row.contact_no_2,    icon: Phone },
    { label: "Website",         value: row.website,         icon: Globe },
    { label: "Country",         value: row.country,         icon: Globe },
    { label: "State",           value: row.state,           icon: MapPin },
    { label: "City",            value: row.city,            icon: MapPin },
    { label: "Address",         value: row.address,         icon: MapPin, full: true },
    { label: "Capacity",        value: row.capacity,        icon: Activity },
    { label: "Requirement",     value: row.requirement,     icon: FileText, full: true },
    { label: "Source",          value: row.source,          icon: ArrowUpRight },
    { label: "Lead Owner",      value: row.lead_owner,      icon: UserIcon },
    { label: "Created",         value: row.date,            icon: Calendar },
    { label: "Next Followup",   value: row.next_follow_up ?? row.next_followup, icon: CalendarCheck },
  ];

  const dash = (v: any) => {
    const s = String(v ?? "").trim();
    return s ? s : "—";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-center gap-3 px-5 py-3 border-b border-gray-100", theme.tint)}>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-white border", theme.border)}>
            <Eye className={cn("w-4 h-4", theme.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("text-[10px] font-extrabold uppercase tracking-widest", theme.text)}>Lead Details</div>
            <div className="text-sm font-bold text-gray-900 truncate">
              {dash(row.company_name)} {row.name && <span className="text-gray-400 font-normal text-xs">· {row.name}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:bg-white hover:text-gray-700 transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {fields.map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.label} className={cn(f.full && "sm:col-span-2")}>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
                    {FIcon && <FIcon className="w-3 h-3" />}
                    {f.label}
                  </div>
                  <div className="text-[12px] text-gray-800 break-words">{dash(f.value)}</div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              <MessageSquare className="w-3 h-3" />
              Remarks
            </div>
            <div className={cn(
              "text-[12px] rounded-lg p-3 border whitespace-pre-wrap leading-relaxed",
              row.remarks ? "bg-amber-50/50 border-amber-100 text-gray-800" : "bg-gray-50 border-gray-100 text-gray-400 italic"
            )}>
              {row.remarks ? String(row.remarks) : "No remarks recorded for this lead."}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── KPI tile (matches Marketing's top stat panel) ─────────────────────── */
function KpiTile({ k, value, total, loading, active, onClick }: { k: Key; value: number; total: number; loading: boolean; active: boolean; onClick: () => void }) {
  const m = META[k];
  const Icon = m.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white border rounded-xl shadow-sm overflow-hidden text-left transition-all hover:shadow-md hover:-translate-y-0.5",
        active ? cn(m.border, "ring-2 ring-offset-1", m.text.replace("text-", "ring-").replace("-700", "-300")) : "border-gray-200"
      )}
    >
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100", m.tint)}>
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", m.dot)} />
        <span className={cn("text-[9px] font-extrabold uppercase tracking-widest truncate", m.text)}>{m.label}</span>
      </div>
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="text-[20px] leading-none font-black text-gray-900 tabular-nums">
          {loading ? "…" : value.toLocaleString()}
        </div>
        <Icon className={cn("w-7 h-7 opacity-30", m.text)} />
      </div>
      <div className="px-3 pb-2">
        <MiniProgress value={value} max={total || value} color={m.dot} />
      </div>
    </button>
  );
}

/* ── Cell renderer for followup tables ─────────────────────────────────── */
function followupRenderCell(col: string, row: any): any {
  if (col === "priority") return <StarRating value={followupRating(row.next_followup)} />;
  if (col === "sentiment") return <ConversationTemp text={row.conversation} />;
  if (col === "next_followup") {
    const next = row.next_followup;
    if (!next) return <span className="text-gray-300">—</span>;
    const days = Math.ceil((new Date(next).getTime() - Date.now()) / 86400000);
    const cfg =
      days < 0 ? { bg: "bg-rose-100", text: "text-rose-700", label: `${Math.abs(days)}d overdue` } :
      days === 0 ? { bg: "bg-emerald-100", text: "text-emerald-700", label: "Today" } :
      days <= 3 ? { bg: "bg-amber-100", text: "text-amber-700", label: `In ${days}d` } :
      { bg: "bg-gray-100", text: "text-gray-600", label: `In ${days}d` };
    return <span className={cn("inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold", cfg.bg, cfg.text)}>{cfg.label}</span>;
  }
  return smartCell(col, row);
}

/* ── Conversion Probability (weighted pipeline) ───────────────────────── */
const PROB: { key: Key; label: string; pct: number; color: string; chip: string }[] = [
  { key: "red_hot",    label: "Red Hot",  pct: 90, color: "bg-rose-500",    chip: "text-rose-700 bg-rose-50" },
  { key: "hot_lead",   label: "Hot",      pct: 70, color: "bg-orange-500",  chip: "text-orange-700 bg-orange-50" },
  { key: "warm_lead",  label: "Warm",     pct: 45, color: "bg-amber-500",   chip: "text-amber-700 bg-amber-50" },
  { key: "open_leads", label: "Open",     pct: 35, color: "bg-emerald-500", chip: "text-emerald-700 bg-emerald-50" },
  { key: "cold_lead",  label: "Cold",     pct: 15, color: "bg-slate-500",   chip: "text-slate-700 bg-slate-50" },
];

function ConversionProbability({ counts }: { counts: Record<Key, { data?: ApiResp }> }) {
  const rows = PROB.map((p) => {
    const total = counts[p.key].data?.total_count ?? 0;
    const expected = Math.round((total * p.pct) / 100);
    return { ...p, total, expected };
  });
  const totalLeads = rows.reduce((a, r) => a + r.total, 0);
  const expectedConversions = rows.reduce((a, r) => a + r.expected, 0);
  const overallPct = totalLeads > 0 ? Math.round((expectedConversions / totalLeads) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-emerald-50/60">
        <Target className="w-3.5 h-3.5 text-emerald-700" />
        <span className="font-bold text-emerald-700 text-xs uppercase tracking-wide">Conversion Probability</span>
        <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          {expectedConversions} / {totalLeads} ≈ {overallPct}%
        </span>
      </div>
      <div className="p-3 space-y-2">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", r.chip)}>{r.label}</span>
              <span className="text-[10px] text-gray-500">{r.pct}% likely</span>
              <span className="ml-auto text-[10px] text-gray-500">
                <span className="font-bold text-gray-800 tabular-nums">{r.total}</span> leads → <span className="font-bold text-emerald-700 tabular-nums">{r.expected}</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", r.color)} style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Marketing Rep Performance (rating from followup volume + sentiment) ─ */
function detectTone(text: string): "pos" | "neg" | "neu" {
  const t = (text ?? "").toLowerCase();
  if (/(positive|interest|order|confirm|approved|ready|finalis|finaliz|good|yes)/.test(t)) return "pos";
  if (/(no|not interested|busy|later|reject|hold|delay|unavail)/.test(t)) return "neg";
  return "neu";
}

function RepRatingPanel({ today, yesterday }: { today: any[]; yesterday: any[] }) {
  const all = [...today, ...yesterday];
  const map: Record<string, { name: string; total: number; today: number; pos: number; neg: number }> = {};
  all.forEach((r, idx) => {
    const name = r.represent_name || r.employee_name || "Unassigned";
    if (!map[name]) map[name] = { name, total: 0, today: 0, pos: 0, neg: 0 };
    map[name].total++;
    if (idx < today.length) map[name].today++;
    const tone = detectTone(r.conversation || "");
    if (tone === "pos") map[name].pos++;
    if (tone === "neg") map[name].neg++;
  });
  const list = Object.values(map);
  const maxTotal = Math.max(1, ...list.map((r) => r.total));
  // score: 50% activity + 50% positive ratio
  const scored = list
    .map((r) => {
      const activity = r.total / maxTotal;
      const posRatio = r.total > 0 ? r.pos / r.total : 0;
      const score = activity * 0.5 + posRatio * 0.5;
      const stars = Math.max(1, Math.round(score * 5));
      return { ...r, score, stars };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-violet-50/60">
        <Star className="w-3.5 h-3.5 text-violet-700" />
        <span className="font-bold text-violet-700 text-xs uppercase tracking-wide">Marketing Rep Approach Rating</span>
        <span className="ml-auto text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
          {list.length} reps
        </span>
      </div>
      <div className="p-3 space-y-1.5 overflow-auto" style={{ maxHeight: 280 }}>
        {scored.length === 0 ? (
          <p className="text-[10px] text-gray-400 text-center py-6">No followup data</p>
        ) : scored.map((r, i) => (
          <div key={r.name} className="border border-gray-100 rounded-lg px-2 py-1.5 hover:bg-violet-50/40">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{r.name}</span>
              <StarRating value={r.stars} />
            </div>
            <div className="flex items-center gap-2 text-[9px] text-gray-500 ml-6">
              <span>Total <span className="font-bold text-gray-700 tabular-nums">{r.total}</span></span>
              <span className="text-emerald-600">+{r.pos}</span>
              <span className="text-rose-600">-{r.neg}</span>
              <span className="ml-auto text-violet-700 font-bold">{Math.round(r.score * 100)}</span>
            </div>
            <div className="ml-6 mt-1">
              <MiniProgress value={r.total} max={maxTotal} color="bg-violet-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Agent Rating (based on contact completeness & region) ─────────────── */
function AgentRatingPanel({ agents }: { agents: any[] }) {
  // Score = how many contact fields are filled (0–5)
  const scored = agents
    .map((a) => {
      const fields = [a.contact_1, a.contact_2, a.contact_3, a.email_id, a.region];
      const filled = fields.filter((f) => f && String(f).trim() && String(f).trim() !== "—").length;
      return { ...a, filled, stars: Math.max(1, filled) };
    })
    .sort((a, b) => b.filled - a.filled)
    .slice(0, 8);

  // Region breakdown
  const regionMap: Record<string, number> = {};
  agents.forEach((a) => {
    const r = (a.region || "Unknown").trim() || "Unknown";
    regionMap[r] = (regionMap[r] || 0) + 1;
  });
  const regions = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxRegion = regions[0]?.[1] ?? 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-teal-50/60">
        <UserCog className="w-3.5 h-3.5 text-teal-700" />
        <span className="font-bold text-teal-700 text-xs uppercase tracking-wide">Agent Rating & Coverage</span>
        <span className="ml-auto text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
          {agents.length} agents
        </span>
      </div>
      <div className="p-3 space-y-2 overflow-auto" style={{ maxHeight: 280 }}>
        {/* Region coverage */}
        <div>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">Regional Coverage</p>
          <div className="space-y-1">
            {regions.map(([r, n]) => (
              <div key={r}>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-gray-700 font-semibold truncate">{r}</span>
                  <span className="text-teal-700 font-bold tabular-nums">{n}</span>
                </div>
                <MiniProgress value={n} max={maxRegion} color="bg-teal-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Top agents */}
        <div className="pt-1 border-t border-gray-100">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1 mt-1">Top Agents (by completeness)</p>
          <div className="space-y-1">
            {scored.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-2">No agents</p>
            ) : scored.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{a.agent_name || "—"}</span>
                <span className="text-[9px] text-gray-400 truncate max-w-[60px]">{a.region || "—"}</span>
                <StarRating value={a.stars} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
type Tab = "Overview" | "Followups" | "Leads" | "Open Leads" | "Agents" | "Customers" | "Call Logs";
const TABS: Tab[] = ["Overview", "Followups", "Leads", "Open Leads", "Agents", "Customers", "Call Logs"];

export default function SalesDashboard() {
  const counts = {
    open_leads:       useSales("open_leads"),
    today_followup:   useSales("today_followup"),
    yest_followup:    useSales("yest_followup"),
    red_hot:          useSales("red_hot"),
    hot_lead:         useSales("hot_lead"),
    warm_lead:        useSales("warm_lead"),
    cold_lead:        useSales("cold_lead"),
    total_agents:     useSales("total_agents"),
    customer_details: useSales("customer_details"),
    call_logs:        useSales("call_logs"),
  };
  const allLoading = Object.values(counts).some((q) => q.isFetching);
  const refreshAll = () => Object.values(counts).forEach((q) => q.refetch());

  const [tab, setTab] = useState<Tab>("Overview");

  const totalLeads =
    (counts.open_leads.data?.total_count ?? 0) +
    (counts.red_hot.data?.total_count ?? 0) +
    (counts.hot_lead.data?.total_count ?? 0) +
    (counts.warm_lead.data?.total_count ?? 0) +
    (counts.cold_lead.data?.total_count ?? 0);

  const TILE_ORDER: Key[] = [
    "open_leads", "red_hot", "hot_lead", "warm_lead", "cold_lead",
    "today_followup", "yest_followup", "total_agents", "customer_details", "call_logs",
  ];

  return (
    <Layout>
      <div className="p-4 space-y-3 max-w-[1800px] mx-auto bg-gray-50/40 min-h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Sales Dashboard</h1>
              <p className="text-[11px] text-gray-500">Live ERP view of leads, followups, agents and customers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-700">Total Leads:</span>
              <span className="text-sm font-extrabold text-indigo-900 tabular-nums">{allLoading ? "…" : totalLeads.toLocaleString()}</span>
            </div>
            <button
              onClick={refreshAll}
              className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
            >
              <RefreshCw className={cn("w-3 h-3", allLoading && "animate-spin")} /> Refresh All
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all",
                tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "Overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {TILE_ORDER.map((k) => (
                <KpiTile
                  key={k}
                  k={k}
                  value={counts[k].data?.total_count ?? 0}
                  total={totalLeads}
                  loading={counts[k].isLoading}
                  active={false}
                  onClick={() => {
                    if (k === "today_followup" || k === "yest_followup") setTab("Followups");
                    else if (k === "open_leads") setTab("Open Leads");
                    else if (["red_hot","hot_lead","warm_lead","cold_lead"].includes(k)) setTab("Leads");
                    else if (k === "total_agents") setTab("Agents");
                    else if (k === "customer_details") setTab("Customers");
                    else if (k === "call_logs") setTab("Call Logs");
                  }}
                />
              ))}
            </div>

            {/* ── Visual Insights ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Lead Temperature donut */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-rose-50/60">
                  <ThermometerSun className="w-3.5 h-3.5 text-rose-700" />
                  <span className="font-bold text-rose-700 text-xs uppercase tracking-wide">Lead Temperature Mix</span>
                </div>
                <div className="p-3">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Red Hot", value: counts.red_hot.data?.total_count ?? 0, color: "#f43f5e" },
                          { name: "Hot",     value: counts.hot_lead.data?.total_count ?? 0, color: "#f97316" },
                          { name: "Warm",    value: counts.warm_lead.data?.total_count ?? 0, color: "#f59e0b" },
                          { name: "Cold",    value: counts.cold_lead.data?.total_count ?? 0, color: "#64748b" },
                          { name: "Open",    value: counts.open_leads.data?.total_count ?? 0, color: "#10b981" },
                        ]}
                        dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}
                      >
                        {["#f43f5e","#f97316","#f59e0b","#64748b","#10b981"].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {[
                      { n: "Red Hot",  v: counts.red_hot.data?.total_count ?? 0, c: "bg-rose-500" },
                      { n: "Hot",      v: counts.hot_lead.data?.total_count ?? 0, c: "bg-orange-500" },
                      { n: "Warm",     v: counts.warm_lead.data?.total_count ?? 0, c: "bg-amber-500" },
                      { n: "Cold",     v: counts.cold_lead.data?.total_count ?? 0, c: "bg-slate-500" },
                      { n: "Open",     v: counts.open_leads.data?.total_count ?? 0, c: "bg-emerald-500" },
                    ].map(x => (
                      <div key={x.n} className="flex items-center gap-1.5 text-[10px]">
                        <span className={cn("w-2 h-2 rounded-sm", x.c)} />
                        <span className="text-gray-600 flex-1">{x.n}</span>
                        <span className="font-bold text-gray-800 tabular-nums">{x.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sales Funnel bar chart */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden lg:col-span-2">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-indigo-50/60">
                  <Target className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="font-bold text-indigo-700 text-xs uppercase tracking-wide">Sales Funnel — Lead → Customer</span>
                </div>
                <div className="p-3">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart
                      layout="vertical"
                      data={[
                        { stage: "Open",       v: counts.open_leads.data?.total_count ?? 0, f: "#10b981" },
                        { stage: "Cold",       v: counts.cold_lead.data?.total_count ?? 0, f: "#64748b" },
                        { stage: "Warm",       v: counts.warm_lead.data?.total_count ?? 0, f: "#f59e0b" },
                        { stage: "Hot",        v: counts.hot_lead.data?.total_count ?? 0, f: "#f97316" },
                        { stage: "Red Hot",    v: counts.red_hot.data?.total_count ?? 0, f: "#f43f5e" },
                        { stage: "Customers",  v: counts.customer_details.data?.total_count ?? 0, f: "#3b82f6" },
                      ]}
                      margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} width={70} />
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} cursor={{ fill: "#f1f5f9" }} />
                      <Bar dataKey="v" radius={[0, 6, 6, 0]}>
                        {[
                          "#10b981","#64748b","#f59e0b","#f97316","#f43f5e","#3b82f6",
                        ].map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Followup activity & top reps ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Followup activity area */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden lg:col-span-2">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-sky-50/60">
                  <Activity className="w-3.5 h-3.5 text-sky-700" />
                  <span className="font-bold text-sky-700 text-xs uppercase tracking-wide">Followup Activity (Yesterday vs Today)</span>
                </div>
                <div className="p-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={[
                      { d: "Yesterday", v: counts.yest_followup.data?.total_count ?? 0 },
                      { d: "Today",     v: counts.today_followup.data?.total_count ?? 0 },
                    ]}>
                      <defs>
                        <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#475569" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="v" stroke="#0284c7" strokeWidth={2} fill="url(#sg1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top representatives by today's followups */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-teal-50/60">
                  <UserCog className="w-3.5 h-3.5 text-teal-700" />
                  <span className="font-bold text-teal-700 text-xs uppercase tracking-wide">Top Reps Today</span>
                </div>
                <div className="p-3 space-y-1.5 overflow-auto" style={{ maxHeight: 200 }}>
                  {(() => {
                    const rows = (counts.today_followup.data?.data ?? []) as any[];
                    const map: Record<string, number> = {};
                    rows.forEach(r => {
                      const n = r.represent_name || r.employee_name || "Unassigned";
                      map[n] = (map[n] || 0) + 1;
                    });
                    const list = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
                    const max = list[0]?.[1] || 1;
                    if (list.length === 0) return <p className="text-[10px] text-gray-400 text-center py-6">No followups today</p>;
                    return list.map(([name, n]) => (
                      <div key={name}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-gray-700 font-semibold truncate">{name}</span>
                          <span className="text-teal-700 font-bold tabular-nums">{n}</span>
                        </div>
                        <MiniProgress value={n} max={max} color="bg-teal-500" />
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* ── Probability + Rep Rating + Agent Rating ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <ConversionProbability counts={counts} />
              <RepRatingPanel
                today={(counts.today_followup.data?.data ?? []) as any[]}
                yesterday={(counts.yest_followup.data?.data ?? []) as any[]}
              />
              <AgentRatingPanel agents={(counts.total_agents.data?.data ?? []) as any[]} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <Panel k="today_followup" cols={FOLLOWUP_COLS} height={300} renderCell={followupRenderCell} />
              <Panel k="red_hot"        cols={LEAD_COLS}     height={300} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <Panel k="open_leads"     cols={OPEN_LEAD_COLS} height={300} enableLocationFilter enableDetailsView />
              <Panel k="call_logs"      cols={CALL_COLS}      height={300} />
            </div>
          </>
        )}

        {/* ── FOLLOWUPS TAB ── */}
        {tab === "Followups" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Panel k="today_followup" cols={FOLLOWUP_COLS} height={620} renderCell={followupRenderCell} />
            <Panel k="yest_followup"  cols={FOLLOWUP_COLS} height={620} renderCell={followupRenderCell} />
          </div>
        )}

        {/* ── LEADS TAB ── */}
        {tab === "Leads" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Panel k="red_hot"   cols={LEAD_COLS} height={420} />
            <Panel k="hot_lead"  cols={LEAD_COLS} height={420} />
            <Panel k="warm_lead" cols={LEAD_COLS} height={420} />
            <Panel k="cold_lead" cols={LEAD_COLS} height={420} />
          </div>
        )}

        {/* ── OPEN LEADS TAB ── */}
        {tab === "Open Leads" && (
          <Panel k="open_leads" cols={OPEN_LEAD_COLS} height={680} enableLocationFilter enableDetailsView />
        )}

        {/* ── AGENTS TAB ── */}
        {tab === "Agents" && (
          <Panel k="total_agents" cols={AGENT_COLS} height={680} />
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === "Customers" && (
          <Panel
            k="customer_details"
            cols={CUSTOMER_COLS}
            height={680}
            renderCell={(col, row) =>
              col === "attachments"
                ? <CustomerAttachments files={row.attachment_files} />
                : (String(row[col] ?? "—") || "—")
            }
          />
        )}

        {/* ── CALL LOGS TAB ── */}
        {tab === "Call Logs" && (
          <Panel k="call_logs" cols={CALL_COLS} height={680} />
        )}
      </div>
    </Layout>
  );
}
