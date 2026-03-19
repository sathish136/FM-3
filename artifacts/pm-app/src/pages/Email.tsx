import { Layout } from "@/components/Layout";
import {
  Mail, Send, Inbox, Pencil, X, ChevronLeft, Loader2,
  RefreshCw, AlertCircle, Reply, Forward, Trash2, Star,
  Paperclip, ChevronDown, Search, CornerUpLeft,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const BASE = "/api";

type EmailItem = {
  uid: number;
  seq: number;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string | null;
  seen: boolean;
  size: number;
};

type EmailBody = { html: string | null; text: string | null };

type Folder = "inbox" | "sent";

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

function senderName(from: string) {
  const match = from.match(/^(.+?)\s*</) ;
  return match ? match[1].trim().replace(/^"/, "").replace(/"$/, "") : from.split("@")[0];
}

function senderInitial(from: string) {
  return senderName(from).charAt(0).toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600", "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600", "from-cyan-500 to-sky-600",
];
function avatarColor(str: string) {
  let n = 0;
  for (const c of str) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({
  onClose,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  onSent,
}: {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
}) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) { setError("To and Subject are required."); return; }
    setSending(true); setError("");
    try {
      await apiFetch("/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc: cc || undefined, subject, body }),
      });
      setSent(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1200);
    } catch (e: any) {
      setError(e.message || "Failed to send email");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-2xl">
          <span className="font-semibold text-sm">New Message</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col divide-y divide-gray-100 flex-1 overflow-hidden">
          <div className="flex items-center px-4 py-2.5 gap-2">
            <span className="text-xs text-gray-400 w-10 shrink-0">To</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipients@example.com"
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300" />
            <button onClick={() => setShowCc(v => !v)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Cc</button>
          </div>
          {showCc && (
            <div className="flex items-center px-4 py-2.5 gap-2">
              <span className="text-xs text-gray-400 w-10 shrink-0">Cc</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300" />
            </div>
          )}
          <div className="flex items-center px-4 py-2.5 gap-2">
            <span className="text-xs text-gray-400 w-10 shrink-0">Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
              className="flex-1 text-sm font-medium text-gray-800 outline-none bg-transparent placeholder-gray-300" />
          </div>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Write your message here…"
            className="flex-1 px-4 py-3 text-sm text-gray-700 outline-none resize-none bg-white min-h-[180px]" />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {sent && <p className="text-xs text-green-600 font-semibold">✓ Message sent!</p>}
          {!error && !sent && <span />}
          <button onClick={handleSend} disabled={sending || sent}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow transition-colors">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : sent ? "Sent!" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Detail ─────────────────────────────────────────────────────────────
function EmailDetail({
  email,
  folder,
  onBack,
  onReply,
}: {
  email: EmailItem;
  folder: Folder;
  onBack: () => void;
  onReply: (to: string, subject: string) => void;
}) {
  const [body, setBody] = useState<EmailBody | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true); setBody(null);
    const mailbox = folder === "sent" ? "[Gmail]/Sent Mail" : "INBOX";
    apiFetch(`/email/${email.uid}/body?mailbox=${encodeURIComponent(mailbox)}`)
      .then(d => { setBody(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [email.uid, folder]);

  useEffect(() => {
    if (body?.html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;font-size:14px;margin:16px;color:#374151;line-height:1.6}a{color:#2563eb}img{max-width:100%}</style></head><body>${body.html}</body></html>`);
        doc.close();
      }
    }
  }, [body]);

  const senderAvatar = avatarColor(email.from);
  const name = senderName(email.from);
  const initial = senderInitial(email.from);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={() => onReply(email.from, `Re: ${email.subject}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <CornerUpLeft className="w-3.5 h-3.5" /> Reply
        </button>
        <button onClick={() => onReply("", `Fwd: ${email.subject}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Forward className="w-3.5 h-3.5" /> Forward
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Subject */}
        <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug">{email.subject}</h1>

        {/* Sender row */}
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${senderAvatar} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm">{name}</p>
              <span className="text-xs text-gray-400 shrink-0">{email.date ? new Date(email.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">To: {email.to}</p>
            {email.cc && <p className="text-xs text-gray-400">Cc: {email.cc}</p>}
          </div>
        </div>

        {/* Body */}
        <div className="border-t border-gray-100 pt-5">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading message…
            </div>
          )}
          {!loading && body?.html && (
            <iframe ref={iframeRef} className="w-full border-0 min-h-[400px]" title="email-body"
              sandbox="allow-same-origin" />
          )}
          {!loading && !body?.html && body?.text && (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{body.text}</pre>
          )}
          {!loading && !body?.html && !body?.text && (
            <p className="text-sm text-gray-400 italic">No content available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Email Page ──────────────────────────────────────────────────────────
export default function Email() {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState({ to: "", subject: "" });
  const [search, setSearch] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  const load = async (f: Folder) => {
    setLoading(true); setError(""); setEmails([]); setSelected(null);
    try {
      const data = await apiFetch(`/email/${f}`);
      setEmails(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load emails");
    }
    setLoading(false);
  };

  useEffect(() => {
    apiFetch("/email/check").then(d => setConfigured(d.configured)).catch(() => setConfigured(false));
    load("inbox");
  }, []);

  useEffect(() => { load(folder); }, [folder]);

  const handleReply = (to: string, subject: string) => {
    setComposeDefaults({ to, subject });
    setComposing(true);
  };

  const filtered = search.trim()
    ? emails.filter(e =>
        e.subject.toLowerCase().includes(search.toLowerCase()) ||
        e.from.toLowerCase().includes(search.toLowerCase()) ||
        e.to.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)] bg-[#f8fafc]">

        {/* ── Left Folders Panel ── */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={() => { setComposing(true); setComposeDefaults({ to: "", subject: "" }); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Compose
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {([
              { id: "inbox", label: "Inbox", icon: Inbox },
              { id: "sent", label: "Sent", icon: Send },
            ] as { id: Folder; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => setFolder(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${folder === id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Credential status */}
          {configured === false && (
            <div className="mx-3 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-[10px] text-amber-700 font-semibold leading-snug">
                Set GMAIL_USER and GMAIL_APP_PASSWORD in Secrets to enable email.
              </p>
            </div>
          )}
        </div>

        {/* ── Email List ── */}
        <div className={`flex flex-col border-r border-gray-100 bg-white transition-all ${selected ? "w-80 flex-shrink-0" : "flex-1"}`}>
          {/* Search + refresh */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search emails…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400" />
            </div>
            <button onClick={() => load(folder)} disabled={loading}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-50 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Could not load emails</p>
                <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mail className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">{search ? "No results found" : "No emails"}</p>
              </div>
            )}

            {!loading && filtered.map(email => {
              const isSelected = selected?.uid === email.uid;
              const name = senderName(email.from);
              const initial = senderInitial(email.from);
              const color = avatarColor(email.from);

              return (
                <button key={email.uid}
                  onClick={() => setSelected(email)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 flex gap-3 transition-colors ${isSelected ? "bg-blue-50" : email.seen ? "bg-white hover:bg-gray-50" : "bg-blue-50/30 hover:bg-blue-50/60"}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5`}>
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <span className={`text-sm truncate ${email.seen ? "text-gray-700" : "text-gray-900 font-semibold"}`}>{name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatDate(email.date)}</span>
                    </div>
                    <p className={`text-xs truncate ${email.seen ? "text-gray-500" : "text-gray-800 font-medium"}`}>{email.subject}</p>
                    {!email.seen && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Email Detail ── */}
        {selected ? (
          <div className="flex-1 min-w-0">
            <EmailDetail
              email={selected}
              folder={folder}
              onBack={() => setSelected(null)}
              onReply={handleReply}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center px-8 bg-[#f8fafc]">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-base font-bold text-gray-800">Select an email to read</h2>
            <p className="text-xs text-gray-400 mt-1">Or compose a new message</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {composing && (
        <ComposeModal
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          onClose={() => setComposing(false)}
          onSent={() => { if (folder === "sent") load("sent"); }}
        />
      )}
    </Layout>
  );
}
