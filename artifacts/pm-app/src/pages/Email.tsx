import { Layout } from "@/components/Layout";
import {
  Mail, Send, Inbox, Pencil, X, ChevronLeft, Loader2,
  RefreshCw, AlertCircle, Trash2, Star,
  Paperclip, Search, Eye, EyeOff,
  CornerUpLeft, Forward, Archive, Tag, Bookmark,
  ShieldAlert, FileText, FolderOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

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
  starred: boolean;
  size: number;
  hasAttachment: boolean;
};

type EmailBody = { html: string | null; text: string | null };

type ImapFolder = {
  path: string;
  name: string;
  flags: string[];
};

type FolderGroup = {
  label?: string;
  folders: ImapFolder[];
};

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
  const match = from.match(/^(.+?)\s*</);
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

// ─── Folder icon + label mapping ─────────────────────────────────────────────
const FOLDER_META: Record<string, { label: string; icon: any; colorClass?: string }> = {
  "INBOX":                  { label: "Inbox",    icon: Inbox },
  "[Gmail]/Starred":        { label: "Starred",  icon: Star,        colorClass: "text-amber-400" },
  "[Gmail]/Sent Mail":      { label: "Sent",     icon: Send },
  "[Gmail]/Drafts":         { label: "Drafts",   icon: FileText },
  "[Gmail]/Spam":           { label: "Spam",     icon: ShieldAlert },
  "[Gmail]/Trash":          { label: "Trash",    icon: Trash2 },
  "[Gmail]/All Mail":       { label: "All Mail", icon: Archive },
  "[Gmail]/Important":      { label: "Important",icon: Bookmark },
};

const PRIORITY_PATHS = [
  "INBOX",
  "[Gmail]/Starred",
  "[Gmail]/Sent Mail",
  "[Gmail]/Drafts",
  "[Gmail]/Spam",
  "[Gmail]/Trash",
  "[Gmail]/All Mail",
  "[Gmail]/Important",
];

function getFolderLabel(path: string): string {
  if (FOLDER_META[path]) return FOLDER_META[path].label;
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getFolderIcon(path: string) {
  if (FOLDER_META[path]) return FOLDER_META[path].icon;
  return Tag;
}

function getFolderColorClass(path: string, active: boolean): string {
  if (active) return "text-blue-700";
  if (FOLDER_META[path]?.colorClass) return FOLDER_META[path].colorClass!;
  return "text-gray-400";
}

function groupFolders(folders: ImapFolder[]): FolderGroup[] {
  const main: ImapFolder[] = [];
  const labels: ImapFolder[] = [];

  const byPath = new Map(folders.map(f => [f.path, f]));

  for (const path of PRIORITY_PATHS) {
    if (byPath.has(path)) main.push(byPath.get(path)!);
  }

  for (const f of folders) {
    if (!PRIORITY_PATHS.includes(f.path) && !f.path.startsWith("[Gmail]")) {
      labels.push(f);
    }
  }

  const groups: FolderGroup[] = [{ folders: main }];
  if (labels.length > 0) groups.push({ label: "Labels", folders: labels });
  return groups;
}

// ─── Compose Modal ─────────────────────────────────────────────────────────
function ComposeModal({
  onClose, defaultTo = "", defaultSubject = "", defaultBody = "", onSent, userEmail,
}: {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
  userEmail?: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
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
        body: JSON.stringify({ to, cc: cc || undefined, bcc: bcc || undefined, subject, body, user: userEmail }),
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
      <div className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "82vh" }}>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-2xl">
          <span className="font-semibold text-sm">New Message</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col divide-y divide-gray-100 overflow-hidden" style={{ flex: "1 1 auto" }}>
          <div className="flex items-center px-4 py-2.5 gap-2">
            <span className="text-xs text-gray-400 w-10 shrink-0">To</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipients@example.com"
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300" />
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowCc(v => !v)} className={`text-xs hover:text-gray-600 transition-colors ${showCc ? "text-blue-600 font-semibold" : "text-gray-400"}`}>Cc</button>
              <button onClick={() => setShowBcc(v => !v)} className={`text-xs hover:text-gray-600 transition-colors ${showBcc ? "text-blue-600 font-semibold" : "text-gray-400"}`}>Bcc</button>
            </div>
          </div>
          {showCc && (
            <div className="flex items-center px-4 py-2.5 gap-2">
              <span className="text-xs text-gray-400 w-10 shrink-0">Cc</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center px-4 py-2.5 gap-2">
              <span className="text-xs text-gray-400 w-10 shrink-0">Bcc</span>
              <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="bcc@example.com"
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
            className="flex-1 px-4 py-3 text-sm text-gray-700 outline-none resize-none bg-white min-h-[200px]" />
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {sent && <p className="text-xs text-green-600 font-semibold">✓ Message sent!</p>}
          {!error && !sent && <span className="text-xs text-gray-400">{body.length > 0 ? `${body.length} chars` : ""}</span>}
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

// ─── Email Detail ──────────────────────────────────────────────────────────
function EmailDetail({
  email, folderPath, onBack, onReply, onDelete, onToggleStar, onToggleSeen, userEmail,
}: {
  email: EmailItem;
  folderPath: string;
  onBack: () => void;
  onReply: (to: string, subject: string, quotedBody: string) => void;
  onDelete: (uid: number) => void;
  onToggleStar: (uid: number, current: boolean) => void;
  onToggleSeen: (uid: number, current: boolean) => void;
  userEmail?: string;
}) {
  const [body, setBody] = useState<EmailBody | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true); setBody(null);
    const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
    apiFetch(`/email/${email.uid}/body?mailbox=${encodeURIComponent(folderPath)}${userParam}`)
      .then(d => { setBody(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [email.uid, folderPath]);

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

  const buildQuotedReply = () => {
    const dateStr = email.date ? new Date(email.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    const plain = body?.text || (body?.html ? body.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
    return `\n\n\n— On ${dateStr}, ${senderName(email.from)} wrote:\n${plain.split("\n").map(l => `> ${l}`).join("\n")}`;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
      await apiFetch(`/email/${email.uid}?mailbox=${encodeURIComponent(folderPath)}${userParam}`, { method: "DELETE" });
      onDelete(email.uid);
    } catch {
      setDeleting(false);
    }
  };

  const senderAvatar = avatarColor(email.from);
  const name = senderName(email.from);
  const initial = senderInitial(email.from);
  const isTrash = folderPath === "[Gmail]/Trash";

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors mr-1">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onToggleStar(email.uid, email.starred)}
          className={`p-1.5 rounded-lg transition-colors ${email.starred ? "text-amber-400 hover:text-amber-500" : "text-gray-400 hover:text-amber-400 hover:bg-gray-100"}`}>
          <Star className={`w-4 h-4 ${email.starred ? "fill-current" : ""}`} />
        </button>
        <button onClick={() => onToggleSeen(email.uid, email.seen)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          {email.seen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <div className="flex-1" />
        <button onClick={() => onReply(email.from, `Re: ${email.subject}`, buildQuotedReply())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <CornerUpLeft className="w-3.5 h-3.5" /> Reply
        </button>
        <button onClick={() => onReply("", `Fwd: ${email.subject}`, buildQuotedReply())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Forward className="w-3.5 h-3.5" /> Forward
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {isTrash ? "Delete Forever" : "Trash"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug flex items-start gap-2">
          <span className="flex-1">{email.subject}</span>
          {email.hasAttachment && <span title="Has attachment"><Paperclip className="w-4 h-4 text-gray-400 shrink-0 mt-1" /></span>}
        </h1>
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
            <p className="text-xs text-gray-400">From: {email.from}</p>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-5">
          {loading && <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading message…</div>}
          {!loading && body?.html && <iframe ref={iframeRef} className="w-full border-0 min-h-[400px]" title="email-body" sandbox="allow-same-origin" />}
          {!loading && !body?.html && body?.text && <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{body.text}</pre>}
          {!loading && !body?.html && !body?.text && <p className="text-sm text-gray-400 italic">No content available.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Email Page ──────────────────────────────────────────────────────
export default function Email() {
  const { user } = useAuth();
  const userEmail = user?.email;

  const [folders, setFolders] = useState<ImapFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [activeFolderPath, setActiveFolderPath] = useState("INBOX");
  const [labelsExpanded, setLabelsExpanded] = useState(true);

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState({ to: "", subject: "", body: "" });
  const [search, setSearch] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  const loadFolders = async () => {
    if (!userEmail) return;
    setFoldersLoading(true);
    try {
      const data: ImapFolder[] = await apiFetch(`/email/folders?user=${encodeURIComponent(userEmail)}`);
      setFolders(data);
    } catch {
      setFolders([]);
    }
    setFoldersLoading(false);
  };

  const load = async (path: string) => {
    setLoading(true); setError(""); setSelected(null);
    try {
      const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
      const data = await apiFetch(`/email/messages?mailbox=${encodeURIComponent(path)}${userParam}`);
      setEmails(Array.isArray(data) ? data : []);
      // Check sync status for last synced time
      apiFetch(`/email/sync-status?mailbox=${encodeURIComponent(path)}${userParam}`)
        .then(s => { if (s.lastSynced) setLastSynced(new Date(s.lastSynced)); })
        .catch(() => {});
    } catch (e: any) {
      setError(e.message || "Failed to load emails");
    }
    setLoading(false);
  };

  const handleSync = async () => {
    if (!userEmail || syncing) return;
    setSyncing(true);
    try {
      const userParam = `&user=${encodeURIComponent(userEmail)}`;
      const data = await apiFetch(`/email/sync?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`);
      setEmails(Array.isArray(data) ? data : []);
      setLastSynced(new Date());
      setError("");
    } catch (e: any) {
      setError(e.message || "Sync failed");
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (!userEmail) return;
    const userParam = `?user=${encodeURIComponent(userEmail)}`;
    apiFetch(`/email/check${userParam}`).then(d => setConfigured(d.configured)).catch(() => setConfigured(false));
    loadFolders();
    load("INBOX");
  }, [userEmail]);

  useEffect(() => { load(activeFolderPath); }, [activeFolderPath]);

  const handleFolderClick = (path: string) => {
    setActiveFolderPath(path);
    setSelected(null);
    setSearch("");
  };

  const handleReply = (to: string, subject: string, quotedBody: string = "") => {
    setComposeDefaults({ to, subject, body: quotedBody });
    setComposing(true);
  };

  const handleToggleStar = async (uid: number, current: boolean) => {
    const newVal = !current;
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, starred: newVal } : e));
    if (selected?.uid === uid) setSelected(s => s ? { ...s, starred: newVal } : s);
    try {
      const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
      await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: newVal }),
      });
    } catch {
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, starred: current } : e));
      if (selected?.uid === uid) setSelected(s => s ? { ...s, starred: current } : s);
    }
  };

  const handleToggleSeen = async (uid: number, current: boolean) => {
    const newVal = !current;
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: newVal } : e));
    if (selected?.uid === uid) setSelected(s => s ? { ...s, seen: newVal } : s);
    try {
      const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
      await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seen: newVal }),
      });
    } catch {
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: current } : e));
      if (selected?.uid === uid) setSelected(s => s ? { ...s, seen: current } : s);
    }
  };

  const handleDelete = (uid: number) => {
    setEmails(prev => prev.filter(e => e.uid !== uid));
    setSelected(null);
  };

  const unreadCount = emails.filter(e => !e.seen).length;

  const filtered = search.trim()
    ? emails.filter(e =>
        e.subject.toLowerCase().includes(search.toLowerCase()) ||
        e.from.toLowerCase().includes(search.toLowerCase()) ||
        e.to.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  const folderGroups = groupFolders(folders);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)] bg-[#f8fafc]">

        {/* ── Folder Sidebar ── */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={() => { setComposing(true); setComposeDefaults({ to: "", subject: "", body: "" }); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Compose
            </button>
          </div>

          {foldersLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}

          {!foldersLoading && folders.length === 0 && configured === false && (
            <div className="mx-3 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-[10px] text-amber-700 font-semibold leading-snug">
                No email account found. Add one in Email Settings.
              </p>
            </div>
          )}

          {!foldersLoading && folderGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && (
                <button
                  onClick={() => setLabelsExpanded(v => !v)}
                  className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors">
                  {labelsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {group.label}
                </button>
              )}
              {(!group.label || labelsExpanded) && group.folders.map(f => {
                const Icon = getFolderIcon(f.path);
                const isActive = activeFolderPath === f.path;
                const label = getFolderLabel(f.path);
                const iconColor = getFolderColorClass(f.path, isActive);
                return (
                  <button key={f.path}
                    onClick={() => handleFolderClick(f.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                    style={{ width: "calc(100% - 8px)" }}>
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <span className="flex-1 text-left truncate">{label}</span>
                    {f.path === "INBOX" && unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-tight">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Email List ── */}
        <div className={`flex flex-col border-r border-gray-100 bg-white transition-all ${selected ? "w-80 flex-shrink-0" : "flex-1"}`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search emails…"
                  className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400" />
                {search && (
                  <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button onClick={handleSync} disabled={syncing || loading}
                title="Sync from Gmail"
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs font-semibold text-gray-700">{getFolderLabel(activeFolderPath)}</span>
              <span className="text-[10px] text-gray-400">
                {syncing ? "Syncing…" : search ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : lastSynced ? `Synced ${lastSynced.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            </div>
          </div>

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
                <FolderOpen className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">{search ? "No results found" : "No emails"}</p>
              </div>
            )}

            {!loading && filtered.map(email => {
              const isSelected = selected?.uid === email.uid;
              const name = senderName(email.from);
              const initial = senderInitial(email.from);
              const color = avatarColor(email.from);
              return (
                <div key={email.uid} className="relative group">
                  <button
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
                      <div className="flex items-center gap-1.5 mt-1">
                        {!email.seen && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        {email.hasAttachment && <Paperclip className="w-3 h-3 text-gray-400" />}
                        {email.starred && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                      </div>
                    </div>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white border border-gray-100 rounded-lg shadow-sm px-1 py-0.5">
                    <button onClick={e => { e.stopPropagation(); handleToggleStar(email.uid, email.starred); }}
                      className={`p-1 rounded transition-colors ${email.starred ? "text-amber-400" : "text-gray-300 hover:text-amber-400"}`}>
                      <Star className={`w-3.5 h-3.5 ${email.starred ? "fill-current" : ""}`} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleToggleSeen(email.uid, email.seen); }}
                      className="p-1 rounded text-gray-300 hover:text-blue-500 transition-colors">
                      {email.seen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Email Detail ── */}
        {selected ? (
          <div className="flex-1 min-w-0">
            <EmailDetail
              email={selected}
              folderPath={activeFolderPath}
              onBack={() => setSelected(null)}
              onReply={handleReply}
              onDelete={handleDelete}
              onToggleStar={handleToggleStar}
              onToggleSeen={handleToggleSeen}
              userEmail={userEmail}
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

      {composing && (
        <ComposeModal
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          onClose={() => setComposing(false)}
          onSent={() => { if (activeFolderPath === "[Gmail]/Sent Mail") load(activeFolderPath); }}
          userEmail={userEmail}
        />
      )}
    </Layout>
  );
}
