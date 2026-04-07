import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, Search, Loader2,
  XCircle, ChevronDown, ChevronUp, User, Mic, Sparkles,
  Calendar, Clock, Hash, RefreshCw, PhoneMissed, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

type Contact = {
  name: string;
  phone_number: string;
};

type CallRow = {
  name?: string;
  call_date?: string;
  call_time?: string;
  call_type?: string;
  extension?: string;
  extension_owner?: string;
  recording?: string;
  call_transcript?: string;
  summary?: string;
  phone_number?: string;
  [key: string]: any;
};

function fmtDateTime(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s.replace(" ", "T"));
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return s; }
}

function timeAgo(s?: string) {
  if (!s) return "";
  try {
    const d = new Date(s.replace(" ", "T"));
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function typeColor(type?: string) {
  if (type === "Incoming") return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: PhoneIncoming, dot: "bg-green-500" };
  if (type === "Outgoing") return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: PhoneOutgoing, dot: "bg-blue-500" };
  return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", icon: PhoneMissed, dot: "bg-gray-400" };
}

function ownerColor(owner?: string) {
  const colors: Record<string, string> = {
    "Preethi": "bg-pink-100 text-pink-700",
    "Praveen": "bg-purple-100 text-purple-700",
    "Sri Vatsan": "bg-teal-100 text-teal-700",
  };
  return colors[owner || ""] || "bg-gray-100 text-gray-700";
}

// ─── Call Card ─────────────────────────────────────────────────────────────────
function CallCard({ call, idx }: { call: CallRow; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const tc = typeColor(call.call_type);
  const TypeIcon = tc.icon;
  const hasTranscript = !!(call.call_transcript && call.call_transcript.trim());
  const hasSummary    = !!(call.summary && call.summary.trim());

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", tc.bg, tc.border, "border")}>
          <TypeIcon className={cn("w-3.5 h-3.5", tc.text)} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", tc.bg, tc.text, "border", tc.border)}>
              {call.call_type || "Unknown"}
            </span>
            {call.extension_owner && (
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", ownerColor(call.extension_owner))}>
                {call.extension_owner}
              </span>
            )}
            {call.extension && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Hash className="w-2.5 h-2.5" /> Ext {call.extension}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {fmtDateTime(call.call_time)}
          </p>
        </div>
        {(hasTranscript || hasSummary) && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Recording badge */}
      {call.recording && (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-medium">
            <Mic className="w-2.5 h-2.5" /> Recording available
          </span>
        </div>
      )}

      {/* Expanded: Transcript + Summary */}
      {expanded && (hasTranscript || hasSummary) && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {hasTranscript && (
            <div className="px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Mic className="w-3 h-3 text-indigo-400" />
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Transcript</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 max-h-60 overflow-y-auto">
                <pre className="text-[11px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {call.call_transcript}
                </pre>
              </div>
            </div>
          )}
          {hasSummary && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">AI Analysis</p>
              </div>
              <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-3">
                <div
                  className="text-[11px] text-gray-700 leading-relaxed [&_b]:font-bold [&_b]:text-amber-800"
                  dangerouslySetInnerHTML={{ __html: call.summary.replace(/•\s*/g, "").split("\n").filter(Boolean).map(l => `<p class="mb-1">• ${l.replace(/^•\s*/, "")}</p>`).join("") }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!hasTranscript && !hasSummary && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-gray-400 italic">No transcript or analysis available</p>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ phone, onClose }: { phone: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [calls, setCalls]     = useState<CallRow[]>([]);
  const [filter, setFilter]   = useState<"all" | "Incoming" | "Outgoing">("all");

  useEffect(() => {
    if (!phone) return;
    setLoading(true); setError(""); setCalls([]);
    fetch(`${API_BASE}/call-logs/${encodeURIComponent(phone)}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(data => setCalls(data.calls || []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [phone]);

  const filtered = filter === "all" ? calls : calls.filter(c => c.call_type === filter);
  const incoming  = calls.filter(c => c.call_type === "Incoming").length;
  const outgoing  = calls.filter(c => c.call_type === "Outgoing").length;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/60 to-white shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
          <Phone className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">IP Call Logs</p>
          <p className="text-sm font-bold text-gray-900 font-mono">{phone}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0">
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-[10px]">{calls.length}</span>
          <span className="text-gray-500">Total</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-[10px]">{incoming}</span>
          <span className="text-gray-500">In</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">{outgoing}</span>
          <span className="text-gray-500">Out</span>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {(["all", "Incoming", "Outgoing"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors",
                filter === f ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-100")}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Calls list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <PhoneMissed className="w-8 h-8 text-gray-200" />
            <p className="text-xs text-gray-400">No calls found</p>
          </div>
        )}
        {filtered.map((call, i) => (
          <CallCard key={call.name || i} call={call} idx={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Contact List Item ─────────────────────────────────────────────────────────
function ContactItem({ contact, selected, onClick, calls }: {
  contact: Contact; selected: boolean; onClick: () => void; calls?: CallRow[];
}) {
  const last = calls?.[0];
  const tc = last ? typeColor(last.call_type) : typeColor();
  const count = calls?.length || 0;
  const owners = [...new Set(calls?.map(c => c.extension_owner).filter(Boolean))];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-colors",
        selected && "bg-violet-50 border-l-2 border-l-violet-500"
      )}
    >
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0">
        <Phone className="w-4 h-4 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 font-mono">{contact.phone_number || contact.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {owners.slice(0, 2).map(o => (
            <span key={o} className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", ownerColor(o))}>{o}</span>
          ))}
          {last?.call_time && (
            <span className="text-[9px] text-gray-400">{timeAgo(last.call_time)}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function IPCallLogs() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [callCache, setCallCache] = useState<Record<string, CallRow[]>>({});
  const [selected,  setSelected]  = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");

  // ── Auth / permission check ────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (isAdmin) { setHasAccess(true); return; }
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/user-modules?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const roles = data?.modules || {};
        setHasAccess(roles["ip-call-logs"] === "read" || roles["ip-call-logs"] === "write");
      })
      .catch(() => setHasAccess(false));
  }, [user, authLoading, isAdmin, navigate]);

  // ── Load contact list ──────────────────────────────────────────────────────
  const loadContacts = useCallback(() => {
    setLoading(true); setError("");
    fetch(`${API_BASE}/call-logs`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(data => setContacts(data.contacts || []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (hasAccess) loadContacts(); }, [hasAccess, loadContacts]);

  // ── Load calls for a contact ───────────────────────────────────────────────
  const selectContact = useCallback((phone: string) => {
    setSelected(phone);
    if (callCache[phone]) return;
    fetch(`${API_BASE}/call-logs/${encodeURIComponent(phone)}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error || "Failed"); }))
      .then(data => setCallCache(prev => ({ ...prev, [phone]: data.calls || [] })))
      .catch(() => {});
  }, [callCache]);

  const filtered = contacts.filter(c =>
    (c.phone_number || c.name).toLowerCase().includes(search.toLowerCase())
  );

  // ── Access denied ──────────────────────────────────────────────────────────
  if (!authLoading && hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Phone className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm font-bold text-gray-700">Access Denied</p>
        <p className="text-xs text-gray-400">You don't have permission to view IP Call Logs.</p>
      </div>
    );
  }

  if (authLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Panel: Contact List ── */}
      <div className={cn(
        "flex flex-col bg-white border-r border-gray-200 overflow-hidden transition-all duration-300",
        selected ? "w-72 shrink-0" : "flex-1"
      )}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">IP Call Logs</h1>
                <p className="text-[10px] text-gray-400">{contacts.length} contacts</p>
              </div>
            </div>
            <button onClick={loadContacts} title="Refresh"
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search phone number..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          )}
          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Phone className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400">{search ? "No matching contacts" : "No call logs found"}</p>
            </div>
          )}
          {filtered.map(contact => (
            <ContactItem
              key={contact.name}
              contact={contact}
              selected={selected === (contact.phone_number || contact.name)}
              onClick={() => selectContact(contact.phone_number || contact.name)}
              calls={callCache[contact.phone_number || contact.name]}
            />
          ))}
        </div>
      </div>

      {/* ── Right Panel: Call Detail ── */}
      {selected ? (
        <div className="flex-1 overflow-hidden">
          <DetailPanel phone={selected} onClose={() => setSelected(null)} />
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-3 bg-gray-50/50 text-center p-8">
          <div className="w-16 h-16 rounded-3xl bg-violet-50 flex items-center justify-center">
            <Phone className="w-7 h-7 text-violet-300" />
          </div>
          <p className="text-sm font-bold text-gray-600">Select a contact</p>
          <p className="text-xs text-gray-400 max-w-xs">Click any contact on the left to view their full call history, transcripts, and AI analysis.</p>
        </div>
      )}
    </div>
  );
}
