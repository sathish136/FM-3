import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Mail, Sparkles, Inbox, AlertTriangle, Info, Megaphone, Building2,
  FolderOpen, Truck, Users, RefreshCw, X, Send, Loader2, ChevronDown,
  ChevronRight, Bot, Wand2, Reply, Paperclip, Search, Shield,
  CheckCircle2, Clock, Zap, Star, Eye, Trash2, BarChart3, Settings,
  Plus, Download, Bell, BellOff, BrainCircuit, CloudDownload, MailCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const API = "/api";

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

type EmailType = "important" | "information" | "promotion";
type Category = "project" | "supplier" | "internal" | "other";
type Priority = "high" | "medium" | "low";

interface SmartEmail {
  uid: string;
  subject: string;
  from_addr: string;
  to_addr: string;
  cc_addr: string;
  email_date: string | null;
  seen: boolean;
  has_attachment: boolean;
  email_type: EmailType | null;
  category: Category | null;
  project_name: string | null;
  supplier_name: string | null;
  is_internal: boolean;
  priority: Priority | null;
  auto_replied: boolean;
  classified: boolean;
  department: string | null;
  snippet: string | null;
  has_draft: boolean;
}

interface Stats {
  unread: string; important: string; information: string; promotion: string;
  projects: string; suppliers: string; internal: string;
  needs_reply: string; auto_replied_count: string; total: string;
  drafts_count: string; trash_count: string;
}

interface ProjectCount { project_name: string; count: string; }
interface SupplierCount { supplier_name: string; count: string; }
interface DepartmentCount { department: string; count: string; }

function senderName(from: string) {
  const m = from.match(/^(.+?)\s*</);
  return m ? m[1].trim().replace(/"/g, "") : from.split("@")[0];
}
function senderInitial(from: string) { return senderName(from).charAt(0).toUpperCase(); }

const AVATAR_COLORS = [
  "#1B2A5E","#E05A00","#00897B","#6D4C41","#3949AB",
  "#8E24AA","#00ACC1","#43A047","#E53935","#FB8C00",
];
function avatarColor(s: string) {
  let n = 0; for (const c of s) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function formatDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString())
    return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (dt.getFullYear() === now.getFullYear())
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  important:   { label: "Important",   color: "text-red-700",    bg: "bg-red-50 border-red-200",    icon: AlertTriangle },
  information: { label: "Information", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",  icon: Info },
  promotion:   { label: "Promotion",   color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Megaphone },
};

const PRIORITY_CONFIG: Record<string, { dot: string; label: string }> = {
  high:   { dot: "bg-red-500",    label: "High Priority" },
  medium: { dot: "bg-amber-400",  label: "Medium" },
  low:    { dot: "bg-green-400",  label: "Low" },
};

const CAT_CONFIG: Record<string, { icon: any; color: string }> = {
  project:  { icon: FolderOpen, color: "text-indigo-600" },
  supplier: { icon: Truck,      color: "text-orange-600" },
  internal: { icon: Building2,  color: "text-teal-600" },
  other:    { icon: Mail,       color: "text-gray-500" },
};

type FilterKey = "all"|"important"|"information"|"promotion"|"internal"|"project"|"supplier"|"unread"|"high"|"drafts"|"dept"|"trash"|string;

interface NavItem { key: FilterKey; label: string; icon: any; color: string; count?: number; value?: string; indent?: boolean; }

function TypeBadge({ type }: { type: EmailType | null }) {
  if (!type || !TYPE_CONFIG[type]) return null;
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Priority | null }) {
  if (!priority || !PRIORITY_CONFIG[priority]) return null;
  return <span className={cn("w-2 h-2 rounded-full shrink-0 inline-block", PRIORITY_CONFIG[priority].dot)} title={PRIORITY_CONFIG[priority].label} />;
}

// ─── Compose / Reply Modal ────────────────────────────────────────────────────
function ReplyModal({ to, subject, defaultBody, onClose, onSent, userEmail, draftUid, isDraft }: {
  to: string; subject: string; defaultBody: string; onClose: () => void;
  onSent: () => void; userEmail?: string; draftUid?: string; isDraft?: boolean;
}) {
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [improving, setImproving] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    setSending(true); setError("");
    try {
      if (isDraft && draftUid) {
        await api(`/smart-email/send-draft/${draftUid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edited_text: body }),
        });
      } else {
        const fd = new FormData();
        fd.append("to", to);
        fd.append("subject", `Re: ${subject}`);
        fd.append("html", body.replace(/\n/g, "<br/>"));
        if (userEmail) fd.append("userEmail", userEmail);
        attachments.forEach(f => fd.append("attachments", f));
        await api("/smart-email/send", { method: "POST", body: fd });
      }
      onSent(); onClose();
    } catch (e: any) { setError(e.message); }
    setSending(false);
  };

  const handleImprove = async () => {
    setImproving(true);
    try {
      const res = await api("/email/ai-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, to }),
      });
      if (res.draft) setBody(res.draft);
    } catch {}
    setImproving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      <div className="pointer-events-auto w-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[75vh]">
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-t-2xl", isDraft ? "bg-orange-600" : "bg-[#1B2A5E]", "text-white")}>
          {isDraft ? <Eye className="w-4 h-4 opacity-70" /> : <Reply className="w-4 h-4 opacity-70" />}
          <span className="font-semibold text-sm flex-1 truncate">
            {isDraft ? "Review Draft Reply" : `Reply: ${subject}`}
          </span>
          {isDraft && <span className="text-[10px] bg-white/20 rounded px-2 py-0.5 font-medium">AI Draft — Edit before sending</span>}
          <button onClick={onClose} className="p-1 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
          <span className="font-medium text-gray-700">To:</span> {to}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="flex-1 p-4 text-sm text-gray-800 outline-none resize-none font-sans leading-relaxed min-h-[160px]"
          placeholder="Type your reply…"
        />
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                <Paperclip className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="max-w-[120px] truncate font-medium">{f.name}</span>
                <span className="text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                <button onClick={() => removeAttachment(i)} className="ml-0.5 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="px-4 text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
          <button onClick={handleSend} disabled={sending}
            className={cn("flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60", isDraft ? "bg-orange-600" : "bg-[#1B2A5E]")}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isDraft ? "Confirm & Send" : "Send Reply"}
          </button>
          <button onClick={handleImprove} disabled={improving}
            className="flex items-center gap-1.5 px-3 py-2 border border-purple-200 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition-colors">
            {improving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            AI Polish
          </button>
          {!isDraft && (
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              <Paperclip className="w-3.5 h-3.5" />
              Attach
              {attachments.length > 0 && <span className="ml-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 rounded-full">{attachments.length}</span>}
            </button>
          )}
          <button onClick={onClose} className="ml-auto p-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Detail Pane ────────────────────────────────────────────────────────
function EmailDetail({ email, onClose, onDeleted, userEmail, isTrash }: {
  email: SmartEmail; onClose: () => void; onDeleted: () => void; userEmail?: string; isTrash?: boolean;
}) {
  const [body, setBody] = useState<{ html: string | null; text: string | null } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const [attachments, setAttachments] = useState<{ index: number; filename: string; contentType: string; size: number }[]>([]);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPanelOpen, setSummaryPanelOpen] = useState(false);
  const [replies, setReplies] = useState<{ tone: string; text: string }[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState("");
  const [selectedReplyIdx, setSelectedReplyIdx] = useState<number | null>(null);
  const [tab, setTab] = useState<"mail"|"draft"|"reply">("mail");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyIsDraft, setReplyIsDraft] = useState(false);
  const [autoReplying, setAutoReplying] = useState(false);
  const [autoReplied, setAutoReplied] = useState(email.auto_replied);
  const [hasDraft, setHasDraft] = useState(email.has_draft || false);
  const [draftText, setDraftText] = useState("");
  const [draftEdited, setDraftEdited] = useState("");
  const [draftSending, setDraftSending] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [currentClassification, setCurrentClassification] = useState({ type: email.email_type, cat: email.category, priority: email.priority });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setBodyLoading(true);
    api(`/smart-email/body/${email.uid}`)
      .then(d => setBody(d))
      .catch(() => setBody({ html: null, text: email.snippet || "" }))
      .finally(() => setBodyLoading(false));
    api(`/smart-email/seen/${email.uid}`, { method: "POST" }).catch(() => {});
    setAttachments([]);
    if (email.has_attachment) {
      api(`/email/${email.uid}/attachments?mailbox=INBOX${userEmail ? `&user=${encodeURIComponent(userEmail)}` : ""}`)
        .then(d => setAttachments(d || []))
        .catch(() => {});
    }
    api(`/smart-email/draft/${email.uid}`)
      .then(d => {
        if (d) {
          setHasDraft(true);
          setDraftText(d.draft_text);
          setDraftEdited(d.draft_text);
          setTab("draft");
        }
      })
      .catch(() => {});
  }, [email.uid]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const r = await api(`/smart-email/ai-summary/${email.uid}`, { method: "POST" });
      setSummary(r.summary || "");
    } catch { setSummary("Could not generate summary."); }
    setSummaryLoading(false);
  };

  const toggleSummaryPanel = () => {
    const next = !summaryPanelOpen;
    setSummaryPanelOpen(next);
    if (next && !summary && !summaryLoading) loadSummary();
  };

  const loadReplies = async () => {
    setRepliesLoading(true);
    setRepliesError("");
    setSelectedReplyIdx(null);
    try {
      const r = await api("/smart-email/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: email.uid }),
      });
      setReplies(r.replies || []);
    } catch (e: any) {
      setRepliesError(e.message || "Failed to generate replies. Please try again.");
    }
    setRepliesLoading(false);
  };

  const handleTabChange = (t: "mail"|"draft"|"reply") => {
    setTab(t);
    if (t === "reply" && replies.length === 0 && !repliesLoading) loadReplies();
  };

  const handleSendDraft = async () => {
    setDraftSending(true);
    try {
      await api(`/smart-email/send-draft/${email.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_text: draftEdited, user_email: userEmail }),
      });
      setAutoReplied(true);
      setHasDraft(false);
      setTab("mail");
    } catch {}
    setDraftSending(false);
  };

  const handleDiscardDraft = async () => {
    if (!confirm("Discard this AI draft? This cannot be undone.")) return;
    setDiscardingDraft(true);
    try {
      await api(`/smart-email/draft/${email.uid}`, { method: "DELETE" });
      setHasDraft(false);
      setDraftText("");
      setDraftEdited("");
      setTab("mail");
    } catch {}
    setDiscardingDraft(false);
  };

  const handleAutoReply = async () => {
    setAutoReplying(true);
    try {
      const res = await api(`/smart-email/auto-reply/${email.uid}`, { method: "POST" });
      const text = res.draft?.draft_text || "";
      setDraftText(text);
      setDraftEdited(text);
      setHasDraft(true);
      setTab("draft");
    } catch {}
    setAutoReplying(false);
  };

  const handleReclassify = async () => {
    setClassifying(true);
    try {
      const r = await api(`/smart-email/classify/${email.uid}`, { method: "POST" });
      if (r.classification) {
        setCurrentClassification({
          type: r.classification.email_type,
          cat: r.classification.category,
          priority: r.classification.priority,
        });
      }
    } catch {}
    setClassifying(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api(`/smart-email/${email.uid}`, { method: "DELETE" }); onDeleted(); }
    catch {} setDeleting(false);
  };

  const handleRestore = async () => {
    setDeleting(true);
    try {
      await api("/smart-email/restore-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: [email.uid] }),
      });
      onDeleted();
    } catch {} setDeleting(false);
  };

  const handlePurge = async () => {
    if (!window.confirm("Permanently delete this email? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api("/smart-email/purge-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: [email.uid] }),
      });
      onDeleted();
    } catch {} setDeleting(false);
  };

  const typeConf = currentClassification.type ? TYPE_CONFIG[currentClassification.type] : null;
  const catConf = currentClassification.cat ? CAT_CONFIG[currentClassification.cat] : null;
  const CatIcon = catConf?.icon || Mail;

  return (
    <>
      <div className="flex h-full bg-white border-l border-gray-100 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0 mt-0.5"
              style={{ backgroundColor: avatarColor(email.from_addr) }}>
              {senderInitial(email.from_addr)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-bold text-gray-900 text-sm">{senderName(email.from_addr)}</span>
                <span className="text-[10px] text-gray-400">{email.from_addr}</span>
                <span className="ml-auto text-[11px] text-gray-400 shrink-0">{formatDate(email.email_date)}</span>
              </div>
              <h2 className="text-sm font-semibold text-gray-800 leading-tight mb-2">{email.subject}</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {typeConf && (
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", typeConf.bg, typeConf.color)}>
                    {currentClassification.priority && <PriorityDot priority={currentClassification.priority as Priority} />}
                    {typeConf.label}
                  </span>
                )}
                {currentClassification.cat && (
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200", catConf?.color)}>
                    <CatIcon className="w-2.5 h-2.5" />
                    {email.project_name || email.supplier_name || currentClassification.cat}
                  </span>
                )}
                {email.is_internal && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                    <Shield className="w-2.5 h-2.5" />Internal
                  </span>
                )}
                {autoReplied && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                    <CheckCircle2 className="w-2.5 h-2.5" />Auto-replied
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setReplyDraft(""); setReplyIsDraft(false); setReplyOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A5E] text-white text-xs font-semibold rounded-lg hover:opacity-90">
              <Reply className="w-3.5 h-3.5" />Reply
            </button>
            {!autoReplied && !hasDraft && (
              <button onClick={handleAutoReply} disabled={autoReplying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-60">
                {autoReplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                {autoReplying ? "Drafting…" : "Generate Draft"}
              </button>
            )}
            {!autoReplied && hasDraft && (
              <button onClick={() => setTab("draft")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 ring-2 ring-orange-300">
                <Bot className="w-3.5 h-3.5" />
                View Draft
              </button>
            )}
            {autoReplied && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />Sent
              </span>
            )}
            {!isTrash && (
              <button onClick={handleReclassify} disabled={classifying}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50">
                {classifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Reclassify
              </button>
            )}
            {isTrash ? (
              <>
                <button onClick={handleRestore} disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 ml-auto">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Restore
                </button>
                <button onClick={handlePurge} disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                </button>
              </>
            ) : (
              <button onClick={handleDelete} disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 gap-1">
          {([
            { key: "mail",  label: "Email",         icon: Mail },
            { key: "draft", label: hasDraft ? "Draft ●" : "Draft", icon: Bot, hidden: autoReplied },
            { key: "reply", label: "Smart Replies", icon: Wand2 },
          ] as { key: string; label: string; icon: any; hidden?: boolean }[]).filter(t => !t.hidden).map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap",
                tab === t.key
                  ? t.key === "draft"
                    ? "border-orange-500 text-orange-600"
                    : "border-[#1B2A5E] text-[#1B2A5E]"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              )}>
              <t.icon className={cn("w-3.5 h-3.5", tab === t.key && t.key === "draft" ? "text-orange-500" : "")} />
              {t.label}
            </button>
          ))}
          <button onClick={toggleSummaryPanel}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap",
              summaryPanelOpen
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            )}>
            <Sparkles className="w-3.5 h-3.5" />
            AI Summary
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "mail" && (
            <div className="p-5">
              {bodyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                </div>
              ) : (body?.html || body?.body_html) ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: body.html || body.body_html }}
                  style={{ fontFamily: "inherit" }}
                />
              ) : (
                <pre className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {body?.text || body?.body_text || email.snippet || "(no content)"}
                </pre>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500">{attachments.length} Attachment{attachments.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {attachments.map(att => {
                      const isImage = att.contentType.startsWith("image/");
                      const isPdf = att.contentType === "application/pdf";
                      const ext = att.filename.split(".").pop()?.toLowerCase() || "";
                      const icon = isPdf ? "📄" : isImage ? "🖼️" : ["xlsx","xls","csv"].includes(ext) ? "📊" : ["docx","doc"].includes(ext) ? "📝" : ["zip","rar","7z"].includes(ext) ? "🗜️" : "📎";
                      const kb = att.size ? (att.size / 1024).toFixed(1) + " KB" : "";
                      const href = `/api/email/${email.uid}/attachment/${att.index}?mailbox=INBOX${userEmail ? `&user=${encodeURIComponent(userEmail)}` : ""}`;
                      return (
                        <a key={att.index} href={href} download={att.filename} target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                          <span className="text-xl leading-none">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-700 truncate group-hover:text-blue-700">{att.filename}</p>
                            {kb && <p className="text-[10px] text-gray-400">{kb}</p>}
                          </div>
                          <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "draft" && (
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">AI Draft Reply</span>
                <span className="text-[10px] text-gray-400 ml-1">Review and edit before sending</span>
              </div>

              {hasDraft ? (
                <>
                  <div className="text-[11px] text-gray-500 mb-1">
                    <span className="font-semibold text-gray-600">To:</span> {email.from_addr}
                    <span className="ml-4 font-semibold text-gray-600">Subject:</span> Re: {email.subject}
                  </div>
                  <textarea
                    value={draftEdited}
                    onChange={e => setDraftEdited(e.target.value)}
                    rows={10}
                    className="w-full border border-orange-200 rounded-xl p-4 text-[13px] text-gray-700 leading-relaxed font-sans bg-orange-50/30 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                    placeholder="Draft content…"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleSendDraft}
                      disabled={draftSending || discardingDraft || !draftEdited.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
                      {draftSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {draftSending ? "Sending…" : "Confirm & Send"}
                    </button>
                    <button
                      onClick={() => setDraftEdited(draftText)}
                      disabled={draftSending || discardingDraft}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors">
                      Reset to original
                    </button>
                    <button
                      onClick={handleDiscardDraft}
                      disabled={draftSending || discardingDraft}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors ml-auto">
                      {discardingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {discardingDraft ? "Discarding…" : "Discard Draft"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-sm text-gray-500">No draft yet. Generate one below.</p>
                  <button onClick={handleAutoReply} disabled={autoReplying}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors">
                    {autoReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    {autoReplying ? "Generating draft…" : "Generate AI Draft"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "reply" && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">AI Smart Replies</span>
                <span className="text-[10px] text-gray-400 ml-1">Select one, then send</span>
                {replies.length > 0 && (
                  <button onClick={loadReplies} className="ml-auto text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />Regenerate
                  </button>
                )}
              </div>

              {repliesError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Could not generate replies</p>
                    <p className="text-red-500">{repliesError}</p>
                    <button onClick={loadReplies} className="mt-2 underline text-red-600 font-medium">Try again</button>
                  </div>
                </div>
              )}

              {repliesLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Generating smart replies…</span>
                </div>
              ) : replies.length > 0 ? (
                <>
                  {replies.map((r, i) => {
                    const isSelected = selectedReplyIdx === i;
                    return (
                      <div key={i}
                        onClick={() => setSelectedReplyIdx(isSelected ? null : i)}
                        className={cn(
                          "border-2 rounded-xl p-4 cursor-pointer transition-all",
                          isSelected
                            ? "border-[#1B2A5E] bg-[#edf2fb] shadow-sm"
                            : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                        )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isSelected ? "text-[#1B2A5E]" : "text-gray-400"
                          )}>
                            {r.tone || ["Brief & Direct", "Professional", "Friendly"][i] || `Option ${i + 1}`}
                          </span>
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "border-[#1B2A5E] bg-[#1B2A5E]" : "border-gray-300"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <p className="text-[13px] text-gray-700 leading-relaxed">{r.text || String(r)}</p>
                      </div>
                    );
                  })}

                  {selectedReplyIdx !== null && (
                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={() => {
                          setReplyDraft(replies[selectedReplyIdx].text);
                          setReplyIsDraft(false);
                          setReplyOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B2A5E] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                        <Send className="w-4 h-4" />
                        Send Selected Reply
                      </button>
                      <button
                        onClick={() => setSelectedReplyIdx(null)}
                        className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button onClick={loadReplies}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  <Wand2 className="w-4 h-4" />Generate Smart Replies
                </button>
              )}

              <div className="pt-1">
                <button onClick={() => { setReplyDraft(""); setReplyIsDraft(false); setReplyOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 w-full justify-center transition-colors">
                  <Reply className="w-3.5 h-3.5" />Write Custom Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary Side Panel */}
      {summaryPanelOpen && (
        <div className="w-[280px] shrink-0 border-l border-gray-100 flex flex-col bg-gradient-to-b from-purple-50/60 to-white overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-gray-800 flex-1">AI Summary</span>
            <button onClick={() => setSummaryPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {summaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Summarising…</span>
              </div>
            ) : summary ? (
              <>
                <div className="bg-white border border-purple-100 rounded-xl p-3 shadow-sm">
                  <p className="text-[13px] text-gray-700 leading-relaxed">{summary}</p>
                </div>
                <button onClick={loadSummary} disabled={summaryLoading}
                  className="flex items-center gap-1.5 text-[11px] text-purple-500 hover:text-purple-700 transition-colors">
                  <RefreshCw className="w-3 h-3" />Regenerate
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Get a quick AI summary of this email</p>
                <button onClick={loadSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />Generate Summary
                </button>
              </div>
            )}

            {/* Classification card */}
            <div className="space-y-2 pt-2 border-t border-purple-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Classification</p>
              {[
                { label: "Type",     value: currentClassification.type || "—",                                                icon: typeConf?.icon || Info,    color: typeConf?.color || "text-gray-500" },
                { label: "Category", value: email.project_name || email.supplier_name || currentClassification.cat || "—",   icon: CatIcon,                   color: catConf?.color  || "text-gray-500" },
                { label: "Priority", value: currentClassification.priority || "—",                                           icon: AlertTriangle,             color: currentClassification.priority === "high" ? "text-red-600" : "text-gray-500" },
              ].map(item => (
                <div key={item.label} className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center gap-2">
                  <item.icon className={cn("w-3.5 h-3.5 shrink-0", item.color)} />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-[11px] font-semibold text-gray-800 capitalize">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>

      {replyOpen && (
        <ReplyModal
          to={email.from_addr}
          subject={email.subject}
          defaultBody={replyDraft}
          userEmail={userEmail}
          draftUid={replyIsDraft ? email.uid : undefined}
          isDraft={replyIsDraft}
          onClose={() => { setReplyOpen(false); setReplyIsDraft(false); }}
          onSent={() => { setReplyOpen(false); setReplyIsDraft(false); if (replyIsDraft) { setAutoReplied(true); setHasDraft(false); } }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SmartInbox() {
  const { user } = useAuth();
  const userEmail = user?.email;

  const [emails, setEmails] = useState<SmartEmail[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<ProjectCount[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCount[]>([]);
  const [departments, setDepartments] = useState<DepartmentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [selected, setSelected] = useState<SmartEmail | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [filterValue, setFilterValue] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["type", "category"]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [error, setError] = useState("");
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEmails = useCallback(async (filter: FilterKey = activeFilter, value?: string, q?: string) => {
    setLoading(true);
    try {
      let url = `/smart-email/messages?`;
      if (filter !== "all") url += `filter=${filter}&`;
      if (value) url += `value=${encodeURIComponent(value)}&`;
      if (q) url += `search=${encodeURIComponent(q)}&`;
      if (userEmail) url += `user_email=${encodeURIComponent(userEmail)}&`;
      const data = await api(url);
      setEmails(data);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [activeFilter, userEmail]);

  const loadStats = useCallback(async () => {
    try {
      const url = userEmail ? `/smart-email/stats?user_email=${encodeURIComponent(userEmail)}` : "/smart-email/stats";
      const data = await api(url);
      setStats(data.stats);
      setProjects(data.projects || []);
      setSuppliers(data.suppliers || []);
      setDepartments(data.departments || []);
    } catch {}
  }, [userEmail]);

  useEffect(() => {
    loadEmails("all");
    loadStats();
  }, [userEmail]);

  // Auto-sync every 5 minutes while Smart Inbox is open
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const runSync = async () => {
      if (syncing) return;
      setSyncing(true);
      try {
        const syncUrl = `/email/sync?mailbox=INBOX${userEmail ? `&user=${encodeURIComponent(userEmail)}` : ""}`;
        await api(syncUrl);
        await api("/smart-email/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto_reply: autoReplyEnabled, user_email: userEmail }),
        });
        await loadEmails(activeFilter, filterValue, search || undefined);
        await loadStats();
      } catch {}
      setSyncing(false);
    };

    autoSyncRef.current = setInterval(runSync, 5 * 60 * 1000);
    return () => {
      if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    };
  }, [userEmail, autoReplyEnabled]);

  const handleFilter = (key: FilterKey, value?: string) => {
    setActiveFilter(key);
    setFilterValue(value);
    setSelected(null);
    setCheckedUids(new Set());
    loadEmails(key, value, search || undefined);
  };

  const toggleCheck = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedUids(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedUids.size === emails.length && emails.length > 0) {
      setCheckedUids(new Set());
    } else {
      setCheckedUids(new Set(emails.map(e => e.uid)));
    }
  };

  const handleBulkDelete = async () => {
    if (checkedUids.size === 0 || bulkWorking) return;
    setBulkWorking(true);
    try {
      await api("/smart-email/delete-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: Array.from(checkedUids) }),
      });
      setEmails(prev => prev.filter(e => !checkedUids.has(e.uid)));
      if (selected && checkedUids.has(selected.uid)) setSelected(null);
      setCheckedUids(new Set());
      loadStats();
    } catch {}
    setBulkWorking(false);
  };

  const handleBulkRestore = async () => {
    if (checkedUids.size === 0 || bulkWorking) return;
    setBulkWorking(true);
    try {
      await api("/smart-email/restore-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: Array.from(checkedUids) }),
      });
      setEmails(prev => prev.filter(e => !checkedUids.has(e.uid)));
      if (selected && checkedUids.has(selected.uid)) setSelected(null);
      setCheckedUids(new Set());
      loadStats();
    } catch {}
    setBulkWorking(false);
  };

  const handleBulkPurge = async () => {
    if (checkedUids.size === 0 || bulkWorking) return;
    if (!window.confirm(`Permanently delete ${checkedUids.size} email(s)? This cannot be undone.`)) return;
    setBulkWorking(true);
    try {
      await api("/smart-email/purge-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids: Array.from(checkedUids) }),
      });
      setEmails(prev => prev.filter(e => !checkedUids.has(e.uid)));
      if (selected && checkedUids.has(selected.uid)) setSelected(null);
      setCheckedUids(new Set());
      loadStats();
    } catch {}
    setBulkWorking(false);
  };

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setSearch(q);
      loadEmails(activeFilter, filterValue, q || undefined);
    }, 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      // Step 1: Pull fresh emails from Gmail IMAP → email_cache
      const syncUrl = `/email/sync?mailbox=INBOX${userEmail ? `&user=${encodeURIComponent(userEmail)}` : ""}`;
      await api(syncUrl);

      // Step 2: Move email_cache → smart_email_inbox and classify
      await api("/smart-email/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_reply: autoReplyEnabled, user_email: userEmail }),
      });

      await loadEmails(activeFilter, filterValue, search || undefined);
      await loadStats();
    } catch (e: any) { setError(e.message); }
    setSyncing(false);
  };

  const handleClassifyAll = async () => {
    setClassifying(true);
    try {
      await api("/smart-email/classify-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_reply: autoReplyEnabled, user_email: userEmail }),
      });
      setTimeout(async () => {
        await loadEmails(activeFilter, filterValue, search || undefined);
        await loadStats();
        setClassifying(false);
      }, 5000);
    } catch { setClassifying(false); }
  };

  const toggleSection = (s: string) => {
    setExpandedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleEmailDeleted = () => {
    setSelected(null);
    loadEmails(activeFilter, filterValue, search || undefined);
    loadStats();
  };

  const handleSelectEmail = (email: SmartEmail) => {
    setSelected(email);
    if (!email.seen) {
      setEmails(prev => prev.map(e => e.uid === email.uid ? { ...e, seen: true } : e));
    }
  };

  const n = (v?: string) => parseInt(v || "0");

  const navGroups = [
    {
      key: "type",
      label: "By Type",
      items: [
        { key: "all",         label: "All Emails",    icon: Inbox,         color: "text-gray-600",   count: n(stats?.total) },
        { key: "important",   label: "Important",     icon: AlertTriangle, color: "text-red-600",    count: n(stats?.important) },
        { key: "information", label: "Information",   icon: Info,          color: "text-blue-600",   count: n(stats?.information) },
        { key: "unread",      label: "Unread",        icon: Eye,           color: "text-amber-600",  count: n(stats?.unread) },
        { key: "high",        label: "Needs Reply",   icon: Zap,           color: "text-rose-600",   count: n(stats?.needs_reply) },
        { key: "drafts",      label: "Pending Drafts",icon: Bot,           color: "text-orange-600", count: n(stats?.drafts_count) },
        { key: "trash",       label: "Trash",         icon: Trash2,        color: "text-gray-500",   count: n(stats?.trash_count) },
      ] as NavItem[],
    },
    {
      key: "category",
      label: "By Source",
      items: [
        { key: "internal", label: "Internal (WTT)", icon: Shield,    color: "text-teal-600",   count: n(stats?.internal) },
        { key: "supplier", label: "All Suppliers",  icon: Truck,     color: "text-orange-600", count: n(stats?.suppliers) },
        { key: "project",  label: "All Projects",   icon: FolderOpen,color: "text-indigo-600", count: n(stats?.projects) },
      ] as NavItem[],
    },
  ];

  const unreadCount = n(stats?.unread);

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden bg-[#f4f6fb]" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>

        {/* ── Left Sidebar ── */}
        <aside className="w-[220px] shrink-0 flex flex-col bg-white border-r border-gray-100 h-full overflow-y-auto">
          {/* Brand */}
          <div className="px-4 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-[#1B2A5E] flex items-center justify-center shadow-sm">
                  <MailCheck className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#E05A00] border-2 border-white flex items-center justify-center">
                  <Zap className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1B2A5E] tracking-tight leading-none">Smart Inbox</p>
                <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide font-medium">AI-Powered · WTT</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-3 py-3 space-y-2 border-b border-gray-100">
            <button onClick={handleClassifyAll} disabled={classifying}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50">
              {classifying
                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                : <BrainCircuit className="w-3.5 h-3.5 shrink-0" />}
              <span>{classifying ? "Classifying…" : "AI Classify All"}</span>
            </button>
          </div>

          {/* Auto-reply toggle */}
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              onClick={() => setAutoReplyEnabled(v => !v)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                autoReplyEnabled
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-gray-50 border border-gray-200 text-gray-500"
              )}>
              {autoReplyEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              Auto-Reply {autoReplyEnabled ? "ON" : "OFF"}
              <div className={cn("ml-auto w-7 h-4 rounded-full transition-colors relative", autoReplyEnabled ? "bg-green-500" : "bg-gray-300")}>
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", autoReplyEnabled ? "left-3.5" : "left-0.5")} />
              </div>
            </button>
          </div>

          {/* Nav groups */}
          <nav className="flex-1 px-2 py-2 space-y-1">
            {navGroups.map(group => (
              <div key={group.key}>
                <button
                  onClick={() => toggleSection(group.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{group.label}</span>
                  {expandedSections.includes(group.key)
                    ? <ChevronDown className="w-3 h-3 text-gray-300" />
                    : <ChevronRight className="w-3 h-3 text-gray-300" />}
                </button>
                {expandedSections.includes(group.key) && group.items.map(item => {
                  const isActive = activeFilter === item.key && filterValue === item.value;
                  const Icon = item.icon;

                  if (item.key === "internal") {
                    const deptOpen = expandedSections.includes("departments");
                    return (
                      <div key="internal">
                        <div className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                          isActive ? "bg-[#1B2A5E] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                        )}>
                          <button
                            onClick={() => handleFilter("internal")}
                            className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                            <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : item.color)} />
                            <span className="flex-1 truncate">{item.label}</span>
                            {(item.count ?? 0) > 0 && (
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                                {item.count}
                              </span>
                            )}
                          </button>
                          {departments.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); toggleSection("departments"); }}
                              className={cn("shrink-0 p-0.5 rounded transition-colors", isActive ? "hover:bg-white/20" : "hover:bg-gray-200")}>
                              {deptOpen
                                ? <ChevronDown className="w-3 h-3" />
                                : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {deptOpen && departments.map(d => {
                          const isDeptActive = activeFilter === "dept" && filterValue === d.department;
                          return (
                            <button key={d.department}
                              onClick={() => handleFilter("dept", d.department)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all pl-7 mt-0.5",
                                isDeptActive ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-teal-50"
                              )}>
                              <Users className={cn("w-3 h-3 shrink-0", isDeptActive ? "text-white" : "text-teal-500")} />
                              <span className="flex-1 text-left truncate">{d.department}</span>
                              <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded-full", isDeptActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>{d.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <button key={item.key + (item.value || "")}
                      onClick={() => handleFilter(item.key, item.value)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                        isActive
                          ? "bg-[#1B2A5E] text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-50"
                      )}>
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : item.color)} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {(item.count ?? 0) > 0 && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Projects sub-list */}
            {projects.length > 0 && (
              <div>
                <button onClick={() => toggleSection("projects")} className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Projects</span>
                  {expandedSections.includes("projects") ? <ChevronDown className="w-3 h-3 text-gray-300" /> : <ChevronRight className="w-3 h-3 text-gray-300" />}
                </button>
                {expandedSections.includes("projects") && projects.slice(0, 10).map(p => {
                  const isActive = activeFilter === "project" && filterValue === p.project_name;
                  return (
                    <button key={p.project_name}
                      onClick={() => handleFilter("project", p.project_name)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all pl-5",
                        isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                      )}>
                      <FolderOpen className={cn("w-3 h-3 shrink-0", isActive ? "text-white" : "text-indigo-500")} />
                      <span className="flex-1 text-left truncate">{p.project_name}</span>
                      <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded-full", isActive ? "bg-white/20" : "bg-gray-100 text-gray-500")}>{p.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Suppliers sub-list */}
            {suppliers.length > 0 && (
              <div>
                <button onClick={() => toggleSection("suppliers")} className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Suppliers</span>
                  {expandedSections.includes("suppliers") ? <ChevronDown className="w-3 h-3 text-gray-300" /> : <ChevronRight className="w-3 h-3 text-gray-300" />}
                </button>
                {expandedSections.includes("suppliers") && suppliers.slice(0, 10).map(s => {
                  const isActive = activeFilter === "supplier" && filterValue === s.supplier_name;
                  return (
                    <button key={s.supplier_name}
                      onClick={() => handleFilter("supplier", s.supplier_name)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all pl-5",
                        isActive ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-50"
                      )}>
                      <Truck className={cn("w-3 h-3 shrink-0", isActive ? "text-white" : "text-orange-500")} />
                      <span className="flex-1 text-left truncate">{s.supplier_name}</span>
                      <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded-full", isActive ? "bg-white/20" : "bg-gray-100 text-gray-500")}>{s.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

          </nav>
        </aside>

        {/* ── Center: Email List ── */}
        <div className="flex flex-col w-[340px] shrink-0 border-r border-gray-100 bg-white h-full">
          {/* Stats bar */}
          {stats && (
            <div className="grid grid-cols-4 gap-0 border-b border-gray-100 shrink-0">
              {[
                { label: "Unread",     value: n(stats.unread),         color: "text-[#1B2A5E]" },
                { label: "Important",  value: n(stats.important),      color: "text-red-600" },
                { label: "Drafts",     value: n(stats.drafts_count),   color: "text-orange-600" },
                { label: "Replied",    value: n(stats.auto_replied_count), color: "text-green-600" },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-2 border-r last:border-r-0 border-gray-100">
                  <span className={cn("text-base font-black", s.color)}>{s.value}</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={searchInput}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search emails…"
                className="flex-1 text-xs text-gray-700 bg-transparent outline-none placeholder-gray-400"
              />
              {searchInput && (
                <button onClick={() => handleSearch("")} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List header */}
          <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-50 shrink-0">
            <button
              onClick={toggleCheckAll}
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                checkedUids.size > 0 && checkedUids.size === emails.length
                  ? "bg-[#1B2A5E] border-[#1B2A5E]"
                  : checkedUids.size > 0
                    ? "bg-[#1B2A5E]/30 border-[#1B2A5E]"
                    : "border-gray-300 bg-white hover:border-gray-500"
              )}>
              {checkedUids.size > 0 && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={checkedUids.size === emails.length ? "M5 13l4 4L19 7" : "M5 12h14"} />
                </svg>
              )}
            </button>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex-1">
              {checkedUids.size > 0 ? `${checkedUids.size} selected` : `${emails.length} email${emails.length !== 1 ? "s" : ""}`}
            </span>
            <button onClick={() => loadEmails(activeFilter, filterValue, search || undefined)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bulk action bar */}
          {checkedUids.size > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef2fb] border-b border-[#c8d6ef] shrink-0">
              {activeFilter === "trash" ? (
                <>
                  <button onClick={handleBulkRestore} disabled={bulkWorking}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50">
                    {bulkWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Restore
                  </button>
                  <button onClick={handleBulkPurge} disabled={bulkWorking}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">
                    <Trash2 className="w-3 h-3" /> Delete Forever
                  </button>
                </>
              ) : (
                <button onClick={handleBulkDelete} disabled={bulkWorking}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">
                  {bulkWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Move to Trash
                </button>
              )}
              <button onClick={() => setCheckedUids(new Set())}
                className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Email list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {error && (
              <div className="m-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                {error} — Your inbox will retry automatically on the next sync cycle.
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16 flex-col gap-3">
                <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No emails found</p>
                <p className="text-xs text-gray-400">Your inbox syncs automatically every 5 minutes</p>
              </div>
            ) : emails.map(email => {
              const isSelected = selected?.uid === email.uid;
              const isChecked = checkedUids.has(email.uid);
              const typeConf = email.email_type ? TYPE_CONFIG[email.email_type] : null;
              const CatIcon = email.category ? CAT_CONFIG[email.category]?.icon : Mail;
              const catColor = email.category ? CAT_CONFIG[email.category]?.color : "text-gray-400";

              return (
                <div key={email.uid}
                  onClick={() => handleSelectEmail(email)}
                  className={cn(
                    "group flex items-stretch border-b border-gray-50 cursor-pointer transition-colors relative",
                    isChecked
                      ? "bg-[#eef2fb]"
                      : isSelected
                        ? "bg-[#edf2fb] border-[#c8d6ef]"
                        : email.seen
                          ? "bg-white hover:bg-[#f8f9ff]"
                          : "bg-white hover:bg-[#f0f4ff]"
                  )}>
                  {/* Priority stripe */}
                  {email.priority === "high" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-r" />
                  )}
                  {!email.seen && email.priority !== "high" && !isChecked && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1B2A5E] rounded-r" />
                  )}

                  {/* Checkbox + Avatar */}
                  <div className="flex items-start pl-2 pt-2.5 pr-1 shrink-0 gap-1.5">
                    <button
                      onClick={e => toggleCheck(email.uid, e)}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                        isChecked
                          ? "bg-[#1B2A5E] border-[#1B2A5E]"
                          : "border-gray-300 bg-white hover:border-[#1B2A5E] opacity-0 group-hover:opacity-100"
                      )}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: avatarColor(email.from_addr) }}>
                      {senderInitial(email.from_addr)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-2.5 px-2.5 pr-3">
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <span className={cn("text-[12px] truncate", email.seen ? "text-gray-600 font-normal" : "text-gray-900 font-bold")}>
                        {senderName(email.from_addr)}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatDate(email.email_date)}</span>
                    </div>

                    <div className={cn("text-[11px] truncate mb-1", email.seen ? "text-gray-500" : "text-gray-800 font-semibold")}>
                      {email.subject}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {email.email_type && typeConf && (
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", typeConf.bg, typeConf.color)}>
                          {typeConf.label}
                        </span>
                      )}
                      {email.category && email.category !== "other" && (
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 flex items-center gap-0.5", catColor)}>
                          <CatIcon className="w-2 h-2" />
                          {email.project_name || email.supplier_name || email.category}
                        </span>
                      )}
                      {email.has_draft && !email.auto_replied && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 border border-orange-300 text-orange-700 flex items-center gap-0.5 animate-pulse">
                          <Bot className="w-2 h-2" />Draft Ready
                        </span>
                      )}
                      {email.auto_replied && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2 h-2" />Replied
                        </span>
                      )}
                      {!email.classified && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />Classifying…
                        </span>
                      )}
                      {email.has_attachment && <Paperclip className="w-2.5 h-2.5 text-gray-400 ml-auto" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Email Detail ── */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {selected ? (
            <EmailDetail
              key={selected.uid}
              email={selected}
              onClose={() => setSelected(null)}
              onDeleted={handleEmailDeleted}
              userEmail={userEmail}
              isTrash={activeFilter === "trash"}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#f4f6fb] gap-5">
              {/* Icon mark */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#1B2A5E] flex items-center justify-center shadow-md">
                  <MailCheck className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E05A00] border-2 border-[#f4f6fb] flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center">
                <h2 className="text-[15px] font-bold text-[#1B2A5E] mb-1">Smart Inbox</h2>
                <p className="text-[11px] text-gray-400 max-w-[260px] leading-relaxed">
                  Select an email to view its AI summary, classification, and smart reply options.
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2.5 max-w-[300px] w-full px-4">
                {[
                  { icon: AlertTriangle, label: "Important",  count: n(stats?.important),          color: "text-red-600",    bg: "bg-white border-gray-200" },
                  { icon: FolderOpen,   label: "Projects",   count: n(stats?.projects),            color: "text-indigo-600", bg: "bg-white border-gray-200" },
                  { icon: Truck,        label: "Suppliers",  count: n(stats?.suppliers),           color: "text-orange-500", bg: "bg-white border-gray-200" },
                  { icon: CheckCircle2, label: "Replied",    count: n(stats?.auto_replied_count),  color: "text-green-600",  bg: "bg-white border-gray-200" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-xl border p-3 flex items-center gap-3 shadow-sm", s.bg)}>
                    <div className={cn("w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0")}>
                      <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-800 leading-none">{s.count}</p>
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto-sync indicator */}
              {syncing && (
                <div className="flex items-center gap-2 px-5 py-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing…</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
