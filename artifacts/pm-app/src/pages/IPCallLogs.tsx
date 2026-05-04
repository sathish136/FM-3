import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Search, Loader2, XCircle, Mic, Sparkles, RefreshCw,
  Calendar, Clock, Hash, ChevronDown, ChevronUp,
  Play, Download, User, X, Filter, TrendingUp, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";

const API_BASE    = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

const OWNERS = ["Preethi", "Praveen", "Sri Vatsan"];

type FlatCall = {
  contact_name: string;
  phone_number: string;
  call_date?: string;
  call_time?: string;
  call_type?: string;
  extension?: string;
  extension_owner?: string;
  recording?: string;
  call_transcript?: string;
  summary?: string;
  row_name?: string;
};

type Stats = {
  total: number;
  incoming: number;
  outgoing: number;
  transcribed: number;
  recorded: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s.replace(" ", "T")).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

function fmtDateShort(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s.replace(" ", "T"));
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch { return s; }
}

function fmtTimeOnly(s?: string) {
  if (!s) return "";
  try {
    return new Date(s.replace(" ", "T")).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function timeAgo(s?: string) {
  if (!s) return "";
  try {
    const ms = Date.now() - new Date(s.replace(" ", "T")).getTime();
    const m  = Math.floor(ms / 60000);
    if (m < 1)   return "just now";
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ""; }
}

function todayStr()     { return new Date().toISOString().slice(0, 10); }
function addDays(d: number) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}
function mondayStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type DatePreset = "today" | "yesterday" | "week" | "month" | "all";
function presetRange(p: DatePreset): [string, string] {
  const today = todayStr();
  switch (p) {
    case "today":     return [today, today];
    case "yesterday": { const y = addDays(-1); return [y, y]; }
    case "week":      return [mondayStr(), today];
    case "month":     return [firstOfMonth(), today];
    case "all":       return ["", ""];
  }
}

function ownerColor(owner?: string) {
  const m: Record<string, string> = {
    Preethi:      "bg-pink-100 text-pink-700 border-pink-200",
    Praveen:      "bg-purple-100 text-purple-700 border-purple-200",
    "Sri Vatsan": "bg-teal-100 text-teal-700 border-teal-200",
  };
  return m[owner || ""] || "bg-gray-100 text-gray-600 border-gray-200";
}

function typeStyle(type?: string) {
  if (type === "Incoming")  return { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  Icon: PhoneIncoming,  dot: "bg-green-500" };
  if (type === "Outgoing")  return { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   Icon: PhoneOutgoing,  dot: "bg-blue-500"  };
  return { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", Icon: PhoneMissed, dot: "bg-gray-400" };
}

function firstLine(transcript?: string) {
  if (!transcript) return "";
  const lines = transcript.split("\n").filter(l => l.trim());
  return lines[0]?.slice(0, 80) || "";
}

// ─── Call List Row ─────────────────────────────────────────────────────────────
function CallRow({ call, selected, onClick }: { call: FlatCall; selected: boolean; onClick: () => void }) {
  const ts = typeStyle(call.call_type);
  const hasTranscript = !!(call.call_transcript?.trim());
  const hasRecording  = !!(call.recording?.trim());

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-gray-50 flex gap-3 hover:bg-gray-50/80 transition-all group",
        selected && "bg-indigo-50/60 border-l-2 border-l-indigo-500 !border-b-gray-100"
      )}
    >
      {/* Type indicator */}
      <div className={cn("mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border", ts.bg, ts.border)}>
        <ts.Icon className={cn("w-3.5 h-3.5", ts.text)} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Row 1: phone + time */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-900 font-mono">{call.phone_number}</span>
          <span className="text-[10px] text-gray-400 shrink-0">{fmtDateShort(call.call_time)} {fmtTimeOnly(call.call_time)}</span>
        </div>
        {/* Row 2: owner + extension + badges */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {call.extension_owner && (
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", ownerColor(call.extension_owner))}>
              {call.extension_owner}
            </span>
          )}
          {call.extension && (
            <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
              <Hash className="w-2 h-2" />Ext {call.extension}
            </span>
          )}
          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", ts.bg, ts.text, ts.border)}>
            {call.call_type}
          </span>
          {hasTranscript && (
            <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Mic className="w-2 h-2" />Transcript
            </span>
          )}
          {hasRecording && (
            <span className="text-[9px] text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Play className="w-2 h-2" />Rec
            </span>
          )}
        </div>
        {/* Row 3: preview of transcript */}
        {hasTranscript && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate leading-tight">{firstLine(call.call_transcript)}</p>
        )}
      </div>
    </button>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ call, allCalls, onClose }: { call: FlatCall; allCalls: FlatCall[]; onClose: () => void }) {
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [summaryOpen,    setSummaryOpen]    = useState(true);

  const ts = typeStyle(call.call_type);
  const hasTranscript = !!(call.call_transcript?.trim());
  const hasSummary    = !!(call.summary?.trim());

  const related = allCalls.filter(
    c => c.phone_number === call.phone_number && c !== call && (c.call_time || "") !== (call.call_time || "")
  ).slice(0, 5);

  const summaryHtml = call.summary
    ? call.summary
        .split("\n")
        .filter(l => l.trim())
        .map(l => `<p class="mb-1.5 leading-relaxed">${l.replace(/^[•\-]\s*/, "• ").replace(/<b>/g, "<strong>").replace(/<\/b>/g, "</strong>")}</p>`)
        .join("")
    : "";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-white shrink-0">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0", ts.bg, ts.border)}>
          <ts.Icon className={cn("w-5 h-5", ts.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Call Detail</p>
          <p className="text-base font-bold text-gray-900 font-mono">{call.phone_number}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Meta cards */}
        <div className="px-5 py-4 border-b border-gray-50 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Call Type</p>
            <p className={cn("text-xs font-bold mt-0.5", ts.text)}>{call.call_type || "Unknown"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Date & Time</p>
            <p className="text-xs font-bold text-gray-800 mt-0.5">{fmtDateTime(call.call_time)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Handled By</p>
            <p className="text-xs font-bold text-gray-800 mt-0.5">{call.extension_owner || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Extension</p>
            <p className="text-xs font-bold text-gray-800 mt-0.5">{call.extension ? `Ext ${call.extension}` : "—"}</p>
          </div>
        </div>

        {/* Recording */}
        {call.recording && (
          <div className="px-5 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-violet-800">Recording Available</p>
                <p className="text-[10px] text-violet-500 truncate">{call.recording}</p>
              </div>
              <a href={call.recording} target="_blank" rel="noreferrer"
                className="shrink-0 w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 hover:bg-violet-200 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="px-5 py-3 border-b border-gray-50">
          <button
            onClick={() => setTranscriptOpen(p => !p)}
            className="w-full flex items-center justify-between gap-2 mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Transcript</span>
              {!hasTranscript && <span className="text-[9px] text-gray-400 font-normal">(not available)</span>}
            </div>
            {hasTranscript && (transcriptOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />)}
          </button>
          {hasTranscript && transcriptOpen && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 max-h-72 overflow-y-auto">
              {call.call_transcript!.split("\n").map((line, i) => {
                const isSpeaker = /^Speaker\s*\d+\s*:/i.test(line.trim());
                return line.trim() ? (
                  <p key={i} className={cn("text-[11px] leading-relaxed mb-1", isSpeaker ? "font-bold text-indigo-600 mt-2" : "text-gray-700 pl-3")}>
                    {line}
                  </p>
                ) : <div key={i} className="h-1" />;
              })}
            </div>
          )}
          {!hasTranscript && (
            <div className="text-[10px] text-gray-400 italic bg-gray-50 rounded-xl px-3 py-2">
              No transcript recorded for this call.
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="px-5 py-3 border-b border-gray-50">
          <button
            onClick={() => setSummaryOpen(p => !p)}
            className="w-full flex items-center justify-between gap-2 mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">AI Analysis</span>
              {!hasSummary && <span className="text-[9px] text-gray-400 font-normal">(not available)</span>}
            </div>
            {hasSummary && (summaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />)}
          </button>
          {hasSummary && summaryOpen && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
              <div
                className="text-[11px] text-gray-700 leading-relaxed [&_strong]:font-bold [&_strong]:text-amber-900"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            </div>
          )}
          {!hasSummary && (
            <div className="text-[10px] text-gray-400 italic bg-gray-50 rounded-xl px-3 py-2">
              No AI analysis available for this call.
            </div>
          )}
        </div>

        {/* Related calls from same number */}
        {related.length > 0 && (
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Other calls from this number ({related.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {related.map((c, i) => {
                const rt = typeStyle(c.call_type);
                return (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                    <rt.Icon className={cn("w-3 h-3 shrink-0", rt.text)} />
                    <span className="text-[10px] text-gray-500 font-mono flex-1">{fmtDateTime(c.call_time)}</span>
                    {c.extension_owner && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", ownerColor(c.extension_owner))}>
                        {c.extension_owner}
                      </span>
                    )}
                    {c.call_transcript?.trim() && <Mic className="w-2.5 h-2.5 text-indigo-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Department Followups ───────────────────────────────────────────────────────
const DEPT_LINKS = [
  {
    key: "hr",
    label: "HR Recruitment",
    url: "https://erp.wttint.com/app/hr-call-logs",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    activeBg: "bg-emerald-600",
    dot: "bg-emerald-500",
  },
  {
    key: "project",
    label: "Project Followups",
    url: "https://erp.wttint.com/app/project-call-logs",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBg: "bg-blue-600",
    dot: "bg-blue-500",
  },
  {
    key: "purchase",
    label: "Purchase Followups",
    url: "https://erp.wttint.com/app/purchase-call-logs",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBg: "bg-amber-600",
    dot: "bg-amber-500",
  },
  {
    key: "marketing",
    label: "Marketing Followups",
    url: "https://erp.wttint.com/app/marketing-call-logs",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    activeBg: "bg-violet-600",
    dot: "bg-violet-500",
  },
];

type DeptCall = {
  contact_name: string;
  phone_number: string;
  call_date?: string;
  call_time?: string;
  call_type?: string;
  extension?: string;
  extension_owner?: string;
  recording?: string;
  call_transcript?: string;
  summary?: string;
  status?: string;
  followup_date?: string;
  remarks?: string;
  row_name?: string;
};

function DepartmentPanel({ initialDept, hideTabs }: { initialDept?: string; hideTabs?: boolean }) {
  const [activeDept, setActiveDept] = useState(initialDept || DEPT_LINKS[0].key);
  const [calls, setCalls] = useState<DeptCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCall, setSelectedCall] = useState<DeptCall | null>(null);

  const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

  const loadCalls = useCallback((dept: string, forceRefresh = false) => {
    setLoading(true);
    setError("");
    setCalls([]);
    setSelectedCall(null);
    const params = new URLSearchParams({ dept, limit: "500" });
    if (forceRefresh) params.set("refresh", "1");
    fetch(`${API_BASE}/dept-call-logs?${params}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(data => setCalls(data.calls || []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [API_BASE]);

  useEffect(() => { loadCalls(activeDept); }, [activeDept, loadCalls]);

  const active = DEPT_LINKS.find(d => d.key === activeDept) ?? DEPT_LINKS[0];

  const filtered = useMemo(() => {
    if (!search.trim()) return calls;
    const q = search.toLowerCase();
    return calls.filter(c =>
      (c.phone_number || "").includes(q) ||
      (c.contact_name || "").toLowerCase().includes(q) ||
      (c.extension_owner || "").toLowerCase().includes(q) ||
      (c.remarks || "").toLowerCase().includes(q) ||
      (c.call_transcript || "").toLowerCase().includes(q)
    );
  }, [calls, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab bar — hidden when navigated directly from sidebar */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-2 flex-wrap">
        {!hideTabs && (
          <>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mr-1">Department:</span>
            {DEPT_LINKS.map(d => (
              <button
                key={d.key}
                onClick={() => { setActiveDept(d.key); setSearch(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  activeDept === d.key
                    ? `${d.activeBg} text-white border-transparent shadow-sm`
                    : `${d.bg} ${d.color} ${d.border} hover:opacity-80`
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", activeDept === d.key ? "bg-white/70" : d.dot)} />
                {d.label}
              </button>
            ))}
          </>
        )}
        <div className={cn("flex items-center gap-2", hideTabs ? "" : "ml-auto")}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search records..."
              className="pl-7 pr-3 py-1.5 text-[10px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-48"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => loadCalls(activeDept, true)} disabled={loading}
            title="Refresh"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in ERP"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Records table */}
      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          "flex flex-col overflow-hidden bg-white transition-all duration-300",
          selectedCall ? "w-[380px] shrink-0 border-r border-gray-100" : "flex-1"
        )}>
          <div className="shrink-0 grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Date & Time</div>
            <div className="col-span-2">Handled By</div>
            <div className="col-span-2">Status / Remarks</div>
            <div className="col-span-1">Rec</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs text-gray-400">Loading {active.label} records…</p>
              </div>
            )}
            {error && (
              <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <Phone className="w-10 h-10 text-gray-100" />
                <p className="text-sm font-bold text-gray-400">No records found</p>
                <p className="text-xs text-gray-300">{search ? "Try different search terms" : "No data available"}</p>
                {!search && (
                  <a
                    href={active.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                  >
                    <ExternalLink className="w-3 h-3" /> View in ERP
                  </a>
                )}
              </div>
            )}
            {!loading && filtered.map((call, i) => {
              const ts = typeStyle(call.call_type);
              const isSelected = selectedCall === call;
              return (
                <button
                  key={`${call.phone_number}-${call.call_time}-${i}`}
                  onClick={() => setSelectedCall(isSelected ? null : call)}
                  className={cn(
                    "w-full text-left grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50/80 transition-all items-center text-xs",
                    isSelected && "bg-indigo-50/60 border-l-2 border-l-indigo-500"
                  )}
                >
                  <div className="col-span-1">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border", ts.bg, ts.border)}>
                      <ts.Icon className={cn("w-3 h-3", ts.text)} />
                    </div>
                  </div>
                  <div className="col-span-2 font-mono font-bold text-gray-900 text-[10px] truncate">{call.phone_number}</div>
                  <div className="col-span-2 text-gray-600 text-[10px] truncate">{call.contact_name || "—"}</div>
                  <div className="col-span-2 text-gray-500 text-[10px]">
                    <div>{fmtDateShort(call.call_time || call.call_date)}</div>
                    <div className="text-gray-300">{fmtTimeOnly(call.call_time)}</div>
                  </div>
                  <div className="col-span-2">
                    {call.extension_owner && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", ownerColor(call.extension_owner))}>
                        {call.extension_owner}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-[10px] text-gray-500 truncate">
                    {call.status && <span className="font-semibold text-indigo-600">{call.status} </span>}
                    {call.remarks || "—"}
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    {call.recording?.trim() && <Play className="w-3 h-3 text-violet-400" />}
                    {call.call_transcript?.trim() && <Mic className="w-3 h-3 text-indigo-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="shrink-0 px-4 py-2 border-t border-gray-50 bg-gray-50/30 flex items-center gap-2">
              <span className={cn("w-1.5 h-1.5 rounded-full", active.dot)} />
              <span className="text-[10px] font-bold text-gray-400">{active.label}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-[10px] text-gray-500">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open in ERP
              </a>
            </div>
          )}
        </div>

        {selectedCall ? (
          <div className="flex-1 overflow-hidden border-l border-gray-100">
            <DetailPanel call={selectedCall as FlatCall} allCalls={calls as FlatCall[]} onClose={() => setSelectedCall(null)} />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50/30 text-center p-12">
            <div className="w-20 h-20 rounded-3xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
              <Phone className="w-8 h-8 text-gray-200" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Select a record to view details</p>
              <p className="text-xs text-gray-300 mt-1">Transcript · AI analysis · Related calls</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const DEPT_KEY_MAP: Record<string, string> = {
  hr:       "ip-call-logs-hr",
  project:  "ip-call-logs-project",
  purchase: "ip-call-logs-purchase",
  marketing:"ip-call-logs-marketing",
};

export default function IPCallLogs() {
  const { user, loading: authLoading } = useAuth();
  const [loc, navigate] = useLocation();

  // Detect department from URL path e.g. /ip-call-logs/hr → "hr"
  const urlDept = (() => {
    const m = loc.match(/\/ip-call-logs\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const showDept = !!urlDept;

  const [allCalls,   setAllCalls]   = useState<FlatCall[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [hasAccess,  setHasAccess]  = useState<boolean | null>(null);
  const [selected,   setSelected]   = useState<FlatCall | null>(null);

  // Filters
  const [preset,      setPreset]     = useState<DatePreset>("all");
  const [fromDate,    setFromDate]   = useState("");
  const [toDate,      setToDate]     = useState("");
  const [ownerFilter, setOwnerFilter]= useState("");
  const [typeFilter,  setTypeFilter] = useState("");
  const [search,      setSearch]     = useState("");

  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");
  const isAgent = user?.isAgent === true;

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (isAdmin) { setHasAccess(true); return; }
    // Agents get access to marketing call logs only
    if (isAgent) {
      const agentOk = !urlDept || urlDept === "marketing";
      setHasAccess(agentOk);
      return;
    }
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/user-modules?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const roles = data?.modules || {};
        // Check the specific dept key or the parent ip-call-logs key
        const parentOk = roles["ip-call-logs"] === "read" || roles["ip-call-logs"] === "write";
        if (showDept && urlDept) {
          const deptKey = DEPT_KEY_MAP[urlDept];
          const deptOk = deptKey ? (roles[deptKey] === "read" || roles[deptKey] === "write") : false;
          setHasAccess(parentOk || deptOk);
        } else {
          setHasAccess(parentOk);
        }
      })
      .catch(() => setHasAccess(false));
  }, [user, authLoading, isAdmin, isAgent, navigate, showDept, urlDept]);

  // ── Load calls ────────────────────────────────────────────────────────────
  const load = useCallback((forceRefresh = false) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ limit: "500" });
    if (forceRefresh) params.set("refresh", "1");
    if (fromDate) params.set("from_date", fromDate);
    if (toDate)   params.set("to_date", toDate);
    if (ownerFilter) params.set("owner", ownerFilter);
    if (typeFilter)  params.set("call_type", typeFilter);

    fetch(`${API_BASE}/call-logs?${params}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(data => {
        setAllCalls(data.calls || []);
        setStats(data.stats || null);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, ownerFilter, typeFilter]);

  useEffect(() => { if (hasAccess) load(); }, [hasAccess, load]);

  // ── Apply preset ──────────────────────────────────────────────────────────
  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const [f, t] = presetRange(p);
    setFromDate(f); setToDate(t);
  };

  // ── Client-side search filter ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return allCalls;
    const q = search.toLowerCase();
    return allCalls.filter(c =>
      (c.phone_number || "").includes(q) ||
      (c.extension_owner || "").toLowerCase().includes(q) ||
      (c.call_transcript || "").toLowerCase().includes(q) ||
      (c.summary || "").toLowerCase().includes(q)
    );
  }, [allCalls, search]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!authLoading && hasAccess === false) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <Phone className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-sm font-bold text-gray-700">Access Denied</p>
          <p className="text-xs text-gray-400">You don't have permission to view IP Call Logs.</p>
        </div>
      </Layout>
    );
  }
  if (authLoading || hasAccess === null) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div></Layout>;
  }

  const PRESETS: { key: DatePreset; label: string }[] = [
    { key: "today",     label: "Today"     },
    { key: "yesterday", label: "Yesterday" },
    { key: "week",      label: "This Week" },
    { key: "month",     label: "This Month"},
    { key: "all",       label: "All Time"  },
  ];

  return (
    <Layout>
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/30">

      {showDept ? (
        <DepartmentPanel initialDept={urlDept ?? undefined} hideTabs />
      ) : (
      <>
      {/* ── Top header + stats ── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">IP Call Logs</h1>
            <p className="text-[10px] text-gray-400">HR Extensions · Transcripts · AI Analysis</p>
          </div>
          <button
            onClick={() => load(true)} disabled={loading} title="Refresh data"
            className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Total",       value: stats.total,       color: "text-gray-700",  bg: "bg-gray-100"    },
              { label: "Incoming",    value: stats.incoming,    color: "text-green-700", bg: "bg-green-50"    },
              { label: "Outgoing",    value: stats.outgoing,    color: "text-blue-700",  bg: "bg-blue-50"     },
              { label: "Transcribed", value: stats.transcribed, color: "text-indigo-700",bg: "bg-indigo-50"   },
              { label: "Recorded",    value: stats.recorded,    color: "text-violet-700",bg: "bg-violet-50"   },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl px-3 py-2 text-center border border-gray-100", s.bg)}>
                <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

          {/* ── Filter bar ── */}
          <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
              {PRESETS.map(p => (
                <button key={p.key} onClick={() => applyPreset(p.key)}
                  className={cn("px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors",
                    preset === p.key ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  {p.label}
                </button>
              ))}
            </div>

            {preset === "all" && (
              <>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPreset("all"); }}
                  className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700" />
                <span className="text-[10px] text-gray-400">to</span>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPreset("all"); }}
                  className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700" />
              </>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">By:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setOwnerFilter("")}
                  className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors",
                    ownerFilter === "" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
                  All
                </button>
                {OWNERS.map(o => (
                  <button key={o} onClick={() => setOwnerFilter(ownerFilter === o ? "" : o)}
                    className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors",
                      ownerFilter === o ? "bg-indigo-600 text-white border-indigo-600" : cn("bg-white border", ownerColor(o).replace(/bg-\S+ /, "").replace(/text-\S+ /, "")))}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <div className="flex items-center gap-1">
              {[["", "All"], ["Incoming", "↓ In"], ["Outgoing", "↑ Out"]].map(([val, label]) => (
                <button key={val} onClick={() => setTypeFilter(val)}
                  className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors",
                    typeFilter === val ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
                  {label}
                </button>
              ))}
            </div>

            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search phone / owner / transcript..."
                className="pl-7 pr-3 py-1.5 text-[10px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-64"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ── Main body: list + detail ── */}
          <div className="flex flex-1 overflow-hidden">
            <div className={cn(
              "flex flex-col overflow-hidden border-r border-gray-100 bg-white transition-all duration-300",
              selected ? "w-80 shrink-0" : "flex-1"
            )}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 bg-gray-50/50 shrink-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  {filtered.length} call{filtered.length !== 1 ? "s" : ""}
                </span>
                {(ownerFilter || typeFilter || search || fromDate || toDate) && (
                  <button onClick={() => { setOwnerFilter(""); setTypeFilter(""); setSearch(""); setFromDate(""); setToDate(""); setPreset("all"); }}
                    className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5">
                    <X className="w-2.5 h-2.5" />Clear filters
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-xs text-gray-400">Loading calls from ERPNext…</p>
                    <p className="text-[10px] text-gray-300">This may take a moment on first load</p>
                  </div>
                )}
                {error && (
                  <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <Phone className="w-10 h-10 text-gray-100" />
                    <p className="text-sm font-bold text-gray-400">No calls found</p>
                    <p className="text-xs text-gray-300">{search ? "Try different search terms" : "Try adjusting filters"}</p>
                  </div>
                )}
                {!loading && filtered.map((call, i) => (
                  <CallRow
                    key={`${call.phone_number}-${call.call_time}-${i}`}
                    call={call}
                    selected={selected === call}
                    onClick={() => setSelected(selected === call ? null : call)}
                  />
                ))}
              </div>
            </div>

            {selected ? (
              <div className="flex-1 overflow-hidden border-l border-gray-100">
                <DetailPanel call={selected} allCalls={allCalls} onClose={() => setSelected(null)} />
              </div>
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50/30 text-center p-12">
                <div className="w-20 h-20 rounded-3xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                  <Phone className="w-8 h-8 text-gray-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">Select a call to view details</p>
                  <p className="text-xs text-gray-300 mt-1">Transcript · AI analysis · Related calls</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </Layout>
  );
}
