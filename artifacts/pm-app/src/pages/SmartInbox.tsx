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
  snippet: string | null;
}

interface Stats {
  unread: string; important: string; information: string; promotion: string;
  projects: string; suppliers: string; internal: string;
  needs_reply: string; auto_replied_count: string; total: string;
}

interface ProjectCount { project_name: string; count: string; }
interface SupplierCount { supplier_name: string; count: string; }

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

type FilterKey = "all"|"important"|"information"|"promotion"|"internal"|"project"|"supplier"|"unread"|"high"|"drafts"|string;

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
        await api("/smart-email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject: `Re: ${subject}`, html: body.replace(/\n/g, "<br/>"), userEmail }),
        });
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[70vh]">
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
          className="flex-1 p-4 text-sm text-gray-800 outline-none resize-none font-sans leading-relaxed"
          placeholder="Type your reply…"
        />
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
          <button onClick={onClose} className="ml-auto p-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Detail Pane ────────────────────────────────────────────────────────
function EmailDetail({ email, onClose, onDeleted, userEmail }: {
  email: SmartEmail; onClose: () => void; onDeleted: () => void; userEmail?: string;
}) {
  const [body, setBody] = useState<{ html: string | null; text: string | null } | null>(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [replies, setReplies] = useState<{ tone: string; text: string }[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [tab, setTab] = useState<"mail"|"summary"|"reply">("mail");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyIsDraft, setReplyIsDraft] = useState(false);
  const [autoReplying, setAutoReplying] = useState(false);
  const [autoReplied, setAutoReplied] = useState(email.auto_replied);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftText, setDraftText] = useState("");
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
    api(`/smart-email/draft/${email.uid}`)
      .then(d => { if (d) { setHasDraft(true); setDraftText(d.draft_text); } })
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

  const loadReplies = async () => {
    setRepliesLoading(true);
    try {
      const r = await api("/smart-email/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: email.uid }),
      });
      setReplies(r.replies || []);
    } catch {}
    setRepliesLoading(false);
  };

  const handleTabChange = (t: "mail"|"summary"|"reply") => {
    setTab(t);
    if (t === "summary" && !summary && !summaryLoading) loadSummary();
    if (t === "reply" && replies.length === 0 && !repliesLoading) loadReplies();
  };

  const handleAutoReply = async () => {
    setAutoReplying(true);
    try {
      const res = await api(`/smart-email/auto-reply/${email.uid}`, { method: "POST" });
      const text = res.draft?.draft_text || "";
      setDraftText(text);
      setHasDraft(true);
      setReplyDraft(text);
      setReplyIsDraft(true);
      setReplyOpen(true);
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

  const typeConf = currentClassification.type ? TYPE_CONFIG[currentClassification.type] : null;
  const catConf = currentClassification.cat ? CAT_CONFIG[currentClassification.cat] : null;
  const CatIcon = catConf?.icon || Mail;

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-gray-100">
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
            <button onClick={() => { setReplyDraft(""); setReplyOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A5E] text-white text-xs font-semibold rounded-lg hover:opacity-90">
              <Reply className="w-3.5 h-3.5" />Reply
            </button>
            {!autoReplied && !hasDraft && (
              <button onClick={handleAutoReply} disabled={autoReplying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-60">
                {autoReplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                {autoReplying ? "Drafting…" : "Generate Draft Reply"}
              </button>
            )}
            {!autoReplied && hasDraft && (
              <button onClick={() => { setReplyDraft(draftText); setReplyIsDraft(true); setReplyOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 ring-2 ring-orange-300 animate-pulse">
                <Eye className="w-3.5 h-3.5" />
                Review &amp; Send Draft
              </button>
            )}
            {autoReplied && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />Sent
              </span>
            )}
            <button onClick={handleReclassify} disabled={classifying}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50">
              {classifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Reclassify
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 gap-1">
          {[
            { key: "mail",    label: "Email",    icon: Mail },
            { key: "summary", label: "AI Summary", icon: Sparkles },
            { key: "reply",   label: "Smart Replies", icon: Wand2 },
          ].map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
                tab === t.key
                  ? "border-[#1B2A5E] text-[#1B2A5E]"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              )}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "mail" && (
            <div className="p-5">
              {bodyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                </div>
              ) : body?.html ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: body.html }}
                  style={{ fontFamily: "inherit" }}
                />
              ) : (
                <pre className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {body?.text || email.snippet || "(no content)"}
                </pre>
              )}
            </div>
          )}

          {tab === "summary" && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">AI Email Summary</span>
              </div>
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />Generating summary…
                </div>
              ) : summary ? (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
                </div>
              ) : (
                <button onClick={loadSummary} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
                  <Sparkles className="w-4 h-4" />Generate Summary
                </button>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: currentClassification.type || "—", icon: typeConf?.icon || Info, color: typeConf?.color || "text-gray-500" },
                  { label: "Category", value: email.project_name || email.supplier_name || currentClassification.cat || "—", icon: CatIcon, color: catConf?.color || "text-gray-500" },
                  { label: "Priority", value: currentClassification.priority || "—", icon: AlertTriangle, color: currentClassification.priority === "high" ? "text-red-600" : "text-gray-500" },
                  { label: "Auto-Replied", value: autoReplied ? "Yes" : "No", icon: Bot, color: autoReplied ? "text-green-600" : "text-gray-400" },
                ].map(item => (
                  <div key={item.label} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2.5">
                    <item.icon className={cn("w-4 h-4 shrink-0", item.color)} />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-xs font-semibold text-gray-800 capitalize">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "reply" && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">AI Smart Replies</span>
                <span className="text-[10px] text-gray-400 ml-1">Click to use as reply draft</span>
              </div>

              {repliesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />Generating smart replies…
                </div>
              ) : replies.length > 0 ? (
                replies.map((r, i) => (
                  <div key={i}
                    className="border border-gray-100 rounded-xl p-4 hover:border-[#1B2A5E] hover:bg-[#f8f9ff] cursor-pointer transition-all group"
                    onClick={() => { setReplyDraft(r.text || r as any); setReplyOpen(true); }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {r.tone || ["Brief & Direct", "Professional", "Friendly"][i] || `Option ${i + 1}`}
                      </span>
                      <span className="text-[10px] text-[#1B2A5E] opacity-0 group-hover:opacity-100 font-medium transition-opacity flex items-center gap-1">
                        <Reply className="w-2.5 h-2.5" />Use this
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{r.text || String(r)}</p>
                  </div>
                ))
              ) : (
                <button onClick={loadReplies}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                  <Wand2 className="w-4 h-4" />Generate Smart Replies
                </button>
              )}

              <div className="pt-2">
                <button onClick={() => { setReplyDraft(""); setReplyOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 w-full justify-center">
                  <Reply className="w-3.5 h-3.5" />Write Custom Reply
                </button>
              </div>
            </div>
          )}
        </div>
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
  const [emails, setEmails] = useState<SmartEmail[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<ProjectCount[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCount[]>([]);
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
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEmails = useCallback(async (filter: FilterKey = activeFilter, value?: string, q?: string) => {
    setLoading(true);
    try {
      let url = `/smart-email/messages?`;
      if (filter !== "all") url += `filter=${filter}&`;
      if (value) url += `value=${encodeURIComponent(value)}&`;
      if (q) url += `search=${encodeURIComponent(q)}&`;
      const data = await api(url);
      setEmails(data);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [activeFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/smart-email/stats");
      setStats(data.stats);
      setProjects(data.projects || []);
      setSuppliers(data.suppliers || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadEmails("all");
    loadStats();
  }, []);

  const handleFilter = (key: FilterKey, value?: string) => {
    setActiveFilter(key);
    setFilterValue(value);
    setSelected(null);
    loadEmails(key, value, search || undefined);
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
    try {
      await api("/smart-email/ingest", { method: "POST" });
      await loadEmails(activeFilter, filterValue, search || undefined);
      await loadStats();
    } catch (e: any) { setError(e.message); }
    setSyncing(false);
  };

  const handleClassifyAll = async () => {
    setClassifying(true);
    try {
      await api("/smart-email/classify-batch", { method: "POST" });
      setTimeout(async () => {
        await loadEmails(activeFilter, filterValue, search || undefined);
        await loadStats();
        setClassifying(false);
      }, 4000);
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

  const n = (v?: string) => parseInt(v || "0");

  const navGroups = [
    {
      key: "type",
      label: "By Type",
      items: [
        { key: "all",         label: "All Emails",    icon: Inbox,         color: "text-gray-600",   count: n(stats?.total) },
        { key: "important",   label: "Important",     icon: AlertTriangle, color: "text-red-600",    count: n(stats?.important) },
        { key: "information", label: "Information",   icon: Info,          color: "text-blue-600",   count: n(stats?.information) },
        { key: "promotion",   label: "Promotion",     icon: Megaphone,     color: "text-purple-600", count: n(stats?.promotion) },
        { key: "unread",      label: "Unread",        icon: Eye,           color: "text-amber-600",  count: n(stats?.unread) },
        { key: "high",        label: "Needs Reply",   icon: Zap,           color: "text-rose-600",   count: n(stats?.needs_reply) },
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
            <button onClick={handleSync} disabled={syncing}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[#1B2A5E] text-white text-[11px] font-semibold rounded-lg hover:bg-[#243870] active:scale-[0.98] transition-all disabled:opacity-50">
              {syncing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                : <RefreshCw className="w-3.5 h-3.5 shrink-0" />}
              <span>{syncing ? "Syncing…" : "Sync Emails"}</span>
            </button>
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
            <div className="grid grid-cols-3 gap-0 border-b border-gray-100 shrink-0">
              {[
                { label: "Unread",     value: n(stats.unread),         color: "text-[#1B2A5E]" },
                { label: "Important",  value: n(stats.important),      color: "text-red-600" },
                { label: "Auto-Reply", value: n(stats.auto_replied_count), color: "text-green-600" },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-2.5 border-r last:border-r-0 border-gray-100">
                  <span className={cn("text-lg font-black", s.color)}>{s.value}</span>
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
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50 shrink-0">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {emails.length} email{emails.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => loadEmails(activeFilter, filterValue, search || undefined)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {error && (
              <div className="m-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                {error} — Click "Sync Emails" to load emails from your mailbox.
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
                <p className="text-xs text-gray-400">Click "Sync Emails" in the sidebar to load your mailbox</p>
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B2A5E] text-white text-xs font-semibold rounded-lg hover:bg-[#243870] transition-colors mt-1 disabled:opacity-50">
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {syncing ? "Syncing…" : "Sync Now"}
                </button>
              </div>
            ) : emails.map(email => {
              const isSelected = selected?.uid === email.uid;
              const typeConf = email.email_type ? TYPE_CONFIG[email.email_type] : null;
              const CatIcon = email.category ? CAT_CONFIG[email.category]?.icon : Mail;
              const catColor = email.category ? CAT_CONFIG[email.category]?.color : "text-gray-400";

              return (
                <div key={email.uid}
                  onClick={() => setSelected(email)}
                  className={cn(
                    "group flex items-stretch border-b border-gray-50 cursor-pointer transition-colors relative",
                    isSelected
                      ? "bg-[#edf2fb] border-[#c8d6ef]"
                      : email.seen
                        ? "bg-white hover:bg-[#f8f9ff]"
                        : "bg-white hover:bg-[#f0f4ff]"
                  )}>
                  {/* Priority stripe */}
                  {email.priority === "high" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-r" />
                  )}
                  {!email.seen && email.priority !== "high" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1B2A5E] rounded-r" />
                  )}

                  {/* Avatar */}
                  <div className="flex items-start pl-3 pt-3 shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px]"
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

              {/* Sync CTA */}
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-2 px-5 py-2 bg-[#1B2A5E] text-white text-xs font-semibold rounded-lg hover:bg-[#243870] transition-colors disabled:opacity-50">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {syncing ? "Syncing…" : "Sync Emails"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
