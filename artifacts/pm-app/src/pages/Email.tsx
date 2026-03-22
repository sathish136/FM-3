import { Layout } from "@/components/Layout";
import { useTheme } from "@/hooks/useTheme";
import {
  Mail, Send, Inbox, Pencil, X, ChevronLeft, Loader2,
  RefreshCw, AlertCircle, Trash2, Star, Paperclip, Search,
  Eye, EyeOff, CornerUpLeft, Forward, Archive, Tag, Bookmark,
  ShieldAlert, FileText, FolderOpen, ChevronDown, ChevronRight,
  Sparkles, Printer, Clock, Wand2, Users, Minimize2, Maximize2,
  Bold, Italic, Underline, Link, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Strikethrough, Quote, Smile, MoreHorizontal,
  Paperclip as AttachIcon, Image as ImageIcon, Type,
  Filter, Calendar, Contact2, CheckSquare, StickyNote, Settings,
  ChevronUp, MoreVertical,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const BASE = "/api";

type EmailItem = {
  uid: number; seq: number; subject: string; from: string; to: string;
  cc?: string; date: string | null; seen: boolean; starred: boolean;
  size: number; hasAttachment: boolean;
};
type EmailBody = { html: string | null; text: string | null };
type ImapFolder = { path: string; name: string; flags: string[] };

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function senderName(from: string) {
  const m = from.match(/^(.+?)\s*</);
  return m ? m[1].trim().replace(/"/g, "") : from.split("@")[0];
}
function senderInitial(from: string) { return senderName(from).charAt(0).toUpperCase(); }
const AVATAR_COLORS = [
  "#E53935","#8E24AA","#1E88E5","#00897B","#FB8C00",
  "#6D4C41","#3949AB","#00ACC1","#43A047","#F4511E",
];
function avatarColor(s: string) {
  let n = 0; for (const c of s) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

const FOLDER_META: Record<string, { label: string; icon: any; color?: string }> = {
  "INBOX":               { label: "Inbox",     icon: Inbox },
  "[Gmail]/Starred":     { label: "Starred",   icon: Star,        color: "#F59E0B" },
  "[Gmail]/Sent Mail":   { label: "Sent",      icon: Send },
  "[Gmail]/Drafts":      { label: "Drafts",    icon: FileText },
  "[Gmail]/Spam":        { label: "Spam",      icon: ShieldAlert },
  "[Gmail]/Trash":       { label: "Trash",     icon: Trash2 },
  "[Gmail]/All Mail":    { label: "All Mail",  icon: Archive },
  "[Gmail]/Important":   { label: "Important", icon: Bookmark },
};
const PRIORITY = ["INBOX","[Gmail]/Starred","[Gmail]/Sent Mail","[Gmail]/Drafts","[Gmail]/Spam","[Gmail]/Trash","[Gmail]/All Mail","[Gmail]/Important"];

function folderLabel(path: string) { return FOLDER_META[path]?.label || path.split("/").pop() || path; }
function FolderIcon({ path, size = 15 }: { path: string; size?: number }) {
  const Icon = FOLDER_META[path]?.icon || Tag;
  return <Icon style={{ width: size, height: size }} />;
}

function groupFolders(folders: ImapFolder[]) {
  const map = new Map(folders.map(f => [f.path, f]));
  const main = PRIORITY.filter(p => map.has(p)).map(p => map.get(p)!);
  const labels = folders.filter(f => !PRIORITY.includes(f.path) && !f.path.startsWith("[Gmail]"));
  return { main, labels };
}

// ─── Emoji List ───────────────────────────────────────────────────────────────
const EMOJI_LIST = ["😊","😂","❤️","👍","🎉","🙏","😍","🔥","✅","💯","👋","🤔","😅","🙌","💪","📧","📎","🔗","⭐","✨"];

function ToolbarBtn({ onAction, title, active, children }: { onAction?: () => void; title?: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onAction?.(); }}
      title={title}
      className={`p-1.5 rounded transition-colors shrink-0 ${active ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
    >
      {children}
    </button>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ onClose, defaultTo="", defaultCc="", defaultSubject="", defaultBody="", onSent, userEmail, mode="compose" }: {
  onClose: () => void; defaultTo?: string; defaultCc?: string; defaultSubject?: string;
  defaultBody?: string; onSent?: () => void; userEmail?: string;
  mode?: "compose"|"reply"|"replyAll"|"forward";
}) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState(defaultCc);
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [showCc, setShowCc] = useState(!!defaultCc);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [fontSize, setFontSize] = useState("3");
  const [profile, setProfile] = useState<{
    full_name?: string; designation?: string; mobile_no?: string;
    phone?: string; company?: string; branch?: string;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const windowTitle = mode === "reply" ? `Re: ${defaultSubject}` :
    mode === "replyAll" ? `Re: ${defaultSubject}` :
    mode === "forward" ? `Fwd: ${defaultSubject}` : "New Message";

  useEffect(() => {
    if (editorRef.current && defaultBody) { editorRef.current.innerText = defaultBody; setBody(defaultBody); }
    if (userEmail) apiFetch(`/auth/profile?email=${encodeURIComponent(userEmail)}`).then(p => setProfile(p)).catch(() => {});
  }, []);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); }
  };
  const execCmd = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus(); document.execCommand(cmd, false, value);
  }, []);
  const insertAtCursor = (html: string) => {
    editorRef.current?.focus(); restoreSelection();
    document.execCommand("insertHTML", false, html);
  };
  const handleFontSize = (val: string) => { setFontSize(val); execCmd("fontSize", val); };
  const handleLink = () => {
    saveSelection();
    const url = window.prompt("Enter URL (include https://):");
    if (url) { restoreSelection(); execCmd("createLink", url); }
  };
  const handleAttach = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = "";
  };
  const handleImageInsert = () => { saveSelection(); imageInputRef.current?.click(); };
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { restoreSelection(); insertAtCursor(`<img src="${ev.target?.result}" alt="${file.name}" style="max-width:100%;border-radius:4px;margin:4px 0;" />`); };
    reader.readAsDataURL(file); e.target.value = "";
  };
  const handleEmoji = (emoji: string) => { restoreSelection(); insertAtCursor(emoji); setShowEmoji(false); };
  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const aiAssist = async () => {
    const currentBody = editorRef.current?.innerText || body;
    if (!subject && !currentBody) return;
    setAiWriting(true);
    try {
      const res = await apiFetch("/email/ai-compose", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subject, body: currentBody, to }) });
      if (res.draft && editorRef.current) { editorRef.current.innerText = res.draft; setBody(res.draft); }
    } catch { }
    setAiWriting(false);
  };

  const buildSignatureHtml = () => {
    if (!profile) return "";
    const lines: string[] = [];
    lines.push(`<p style="margin:0;font-size:12px;color:#6b7280;font-style:italic;">Best Regards,</p>`);
    if (profile.full_name) lines.push(`<p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${profile.full_name}</p>`);
    if (profile.designation) lines.push(`<p style="margin:0;font-size:12px;font-weight:600;color:#e05a00;">${profile.designation}</p>`);
    if (profile.mobile_no || profile.phone) lines.push(`<p style="margin:0;font-size:12px;color:#4b5563;">${profile.mobile_no || profile.phone}</p>`);
    if (profile.company) {
      lines.push(`<p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.05em;">${profile.company}</p>`);
      if (profile.branch) lines.push(`<p style="margin:0;font-size:11px;color:#6b7280;">${profile.branch}</p>`);
    }
    return `<br/><hr style="border:none;border-top:1px dashed #e5e7eb;margin:12px 0;"/><div style="font-family:'Inter','Segoe UI',sans-serif;">${lines.join("")}</div>`;
  };

  const handleSend = async () => {
    const editorHtml = editorRef.current?.innerHTML || body;
    const fullBody = editorHtml + buildSignatureHtml();
    if (!to.trim() || !subject.trim()) { setError("To and Subject are required."); return; }
    setSending(true); setError("");
    try {
      await apiFetch("/email/send", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ to, cc: cc||undefined, bcc: bcc||undefined, subject, html: fullBody, body: fullBody.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(), user: userEmail }) });
      setSent(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1500);
    } catch (e: any) { setError(e.message || "Failed to send"); }
    setSending(false);
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2A5E] text-white rounded-t-xl shadow-2xl cursor-pointer select-none min-w-[320px]">
          <Mail className="w-3.5 h-3.5 opacity-70"/>
          <span className="text-sm font-medium flex-1 truncate">{windowTitle}</span>
          {attachments.length > 0 && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{attachments.length} file{attachments.length>1?"s":""}</span>}
          <button onMouseDown={e=>{e.stopPropagation();setMinimized(false);}} className="p-1 hover:bg-white/20 rounded"><Maximize2 className="w-3.5 h-3.5"/></button>
          <button onMouseDown={e=>{e.stopPropagation();onClose();}} className="p-1 hover:bg-white/20 rounded"><X className="w-3.5 h-3.5"/></button>
        </div>
      </div>
    );
  }

  const wrapperCls = maximized
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    : "fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none";
  const windowCls = maximized ? "w-[90vw] h-[90vh] rounded-2xl" : "w-[680px] rounded-2xl";

  return (
    <div className={wrapperCls} onClick={() => setShowEmoji(false)}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange}/>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange}/>
      <div
        className={`pointer-events-auto bg-white flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.22)] border border-gray-200 overflow-hidden ${windowCls}`}
        style={maximized ? {} : { maxHeight: "88vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2A5E] text-white shrink-0 select-none">
          <Mail className="w-3.5 h-3.5 opacity-60 shrink-0"/>
          <p className="text-sm font-semibold flex-1 truncate">{windowTitle}</p>
          {userEmail && <p className="text-[10px] text-blue-300 truncate mr-2 hidden sm:block">{userEmail}</p>}
          <button onClick={() => setMinimized(true)} title="Minimize" className="p-1.5 rounded hover:bg-white/15 transition-colors"><Minimize2 className="w-3.5 h-3.5"/></button>
          <button onClick={() => setMaximized(v => !v)} title={maximized?"Restore":"Maximize"} className="p-1.5 rounded hover:bg-white/15 transition-colors"><Maximize2 className="w-3.5 h-3.5"/></button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-red-600 transition-colors"><X className="w-3.5 h-3.5"/></button>
        </div>

        {/* Address fields */}
        <div className="shrink-0 border-b border-gray-200 bg-white">
          {userEmail && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 shrink-0">From</span>
              <span className="text-sm text-gray-600 flex-1">{userEmail}</span>
            </div>
          )}
          <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 shrink-0">To</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="Recipients"
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300 min-w-0"/>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setShowCc(v=>!v)} className={`text-[10px] px-2 py-0.5 rounded font-semibold border transition-colors ${showCc?"bg-[#1B2A5E] text-white border-[#1B2A5E]":"text-gray-400 border-gray-200 hover:border-gray-400"}`}>Cc</button>
              <button onClick={() => setShowBcc(v=>!v)} className={`text-[10px] px-2 py-0.5 rounded font-semibold border transition-colors ${showBcc?"bg-[#1B2A5E] text-white border-[#1B2A5E]":"text-gray-400 border-gray-200 hover:border-gray-400"}`}>Bcc</button>
            </div>
          </div>
          {showCc && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 shrink-0">Cc</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc recipients"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
            </div>
          )}
          {showBcc && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 shrink-0">Bcc</span>
              <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Bcc recipients"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
            </div>
          )}
          <div className="flex items-center px-4 py-2 gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14 shrink-0">Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
              className="flex-1 text-sm font-medium text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 bg-[#f4f5f8] border-b border-gray-200 shrink-0 flex-wrap">
          <select value={fontSize} onMouseDown={e=>e.preventDefault()} onChange={e=>handleFontSize(e.target.value)}
            className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-1 py-0.5 outline-none cursor-pointer h-6 mr-1">
            <option value="1">10</option><option value="2">12</option><option value="3">14</option>
            <option value="4">16</option><option value="5">18</option><option value="6">24</option><option value="7">32</option>
          </select>
          <div className="w-px h-4 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("bold")} title="Bold"><Bold className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("italic")} title="Italic"><Italic className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("underline")} title="Underline"><Underline className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("strikeThrough")} title="Strikethrough"><Strikethrough className="w-3 h-3"/></ToolbarBtn>
          <div className="w-px h-4 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("justifyLeft")} title="Align Left"><AlignLeft className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("justifyCenter")} title="Center"><AlignCenter className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("justifyRight")} title="Align Right"><AlignRight className="w-3 h-3"/></ToolbarBtn>
          <div className="w-px h-4 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("insertUnorderedList")} title="Bullet List"><List className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("insertOrderedList")} title="Numbered List"><ListOrdered className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("formatBlock","blockquote")} title="Blockquote"><Quote className="w-3 h-3"/></ToolbarBtn>
          <div className="w-px h-4 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={handleLink} title="Insert Link"><Link className="w-3 h-3"/></ToolbarBtn>
          <ToolbarBtn onAction={handleImageInsert} title="Insert Image"><ImageIcon className="w-3 h-3"/></ToolbarBtn>
          <div className="relative">
            <ToolbarBtn onAction={() => { saveSelection(); setShowEmoji(v=>!v); }} title="Emoji"><Smile className="w-3 h-3"/></ToolbarBtn>
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 w-52">
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJI_LIST.map(e => (
                    <button key={e} onMouseDown={ev=>{ev.preventDefault();handleEmoji(e);}} className="text-base hover:bg-gray-100 rounded p-0.5">{e}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ToolbarBtn onAction={() => execCmd("removeFormat")} title="Clear Format"><Type className="w-3 h-3"/></ToolbarBtn>
          <div className="flex-1"/>
          <button onMouseDown={e=>{e.preventDefault();handleAttach();}} title="Attach File"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-500 hover:bg-gray-200 transition-colors font-medium">
            <AttachIcon className="w-3 h-3"/> Attach
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-white min-h-0">
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            onInput={() => setBody(editorRef.current?.innerHTML || "")}
            onBlur={saveSelection}
            className="compose-editor w-full min-h-full px-5 py-3 text-sm text-gray-800 outline-none leading-relaxed"
            style={{ fontFamily:"'Inter','Segoe UI',sans-serif", minHeight: maximized?"360px":"180px" }}
            data-placeholder="Write your message here…"/>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5 shrink-0">
            {attachments.map((f,i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                <AttachIcon className="w-3 h-3 text-blue-500 shrink-0"/>
                <span className="max-w-[120px] truncate font-medium">{f.name}</span>
                <span className="text-gray-400">({(f.size/1024).toFixed(0)} KB)</span>
                <button onClick={() => removeAttachment(i)} className="ml-0.5 text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
              </div>
            ))}
          </div>
        )}

        {/* Signature preview */}
        {profile && (
          <div className="px-5 py-2 bg-white border-t border-dashed border-gray-200 shrink-0 select-none">
            <p className="text-[11px] text-gray-400 italic mb-0.5">Best Regards,</p>
            <p className="text-xs font-bold text-gray-800">{profile.full_name}</p>
            {profile.designation && <p className="text-[11px] font-semibold text-orange-600">{profile.designation}</p>}
            {(profile.mobile_no || profile.phone) && <p className="text-[11px] text-gray-500">{profile.mobile_no || profile.phone}</p>}
            {profile.company && <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mt-0.5">{profile.company}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-t border-gray-200 shrink-0">
          <button onClick={handleSend} disabled={sending||sent}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: "#1B2A5E" }}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : sent ? <span>✓ Sent!</span> : <><Send className="w-3.5 h-3.5"/> Send</>}
          </button>
          <button onClick={aiAssist} disabled={aiWriting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">
            {aiWriting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5"/>}
            AI Improve
          </button>
          {error && (
            <div className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
              <AlertCircle className="w-3 h-3 shrink-0"/> {error}
            </div>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors" title="Discard">
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({ uid, body, subject, from, onReply }: {
  uid: number; body: EmailBody | null; subject: string; from: string;
  onReply: (draft: string) => void;
}) {
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [tab, setTab] = useState<"summary"|"reply">("summary");

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const r = await apiFetch(`/email/${uid}/ai-summary`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ bodyText: body?.text, bodyHtml: body?.html, subject }) });
      setSummary(r.summary || "");
    } catch { setSummary("Could not generate summary."); }
    setSummaryLoading(false);
  };

  const loadReplies = async () => {
    setRepliesLoading(true);
    try {
      const r = await apiFetch(`/email/${uid}/ai-reply`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ bodyText: body?.text, bodyHtml: body?.html, subject, from }) });
      setReplies(r.replies || []);
    } catch { setReplies([]); }
    setRepliesLoading(false);
  };

  useEffect(() => { setSummary(""); setReplies([]); }, [uid]);

  return (
    <div className="border-t border-gray-100 bg-gradient-to-b from-purple-50 to-white shrink-0">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-purple-100">
        <Sparkles className="w-3.5 h-3.5 text-purple-500"/>
        <span className="text-xs font-semibold text-purple-700">AI Assistant</span>
        <div className="flex ml-3 gap-1">
          {(["summary","reply"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${tab===t?"bg-purple-600 text-white":"text-purple-500 hover:bg-purple-100"}`}>
              {t==="summary" ? "Summarize" : "Smart Reply"}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3">
        {tab==="summary" && (
          <>
            {!summary && !summaryLoading && (
              <button onClick={loadSummary} className="flex items-center gap-2 text-xs text-purple-600 font-semibold hover:underline">
                <Sparkles className="w-3 h-3"/> Generate Summary
              </button>
            )}
            {summaryLoading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin"/> Summarizing…</div>}
            {summary && (
              <div>
                <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
                <button onClick={loadSummary} className="mt-1 text-[10px] text-purple-500 hover:underline">Regenerate</button>
              </div>
            )}
          </>
        )}
        {tab==="reply" && (
          <>
            {replies.length===0 && !repliesLoading && (
              <button onClick={loadReplies} className="flex items-center gap-2 text-xs text-purple-600 font-semibold hover:underline">
                <Sparkles className="w-3 h-3"/> Generate Smart Replies
              </button>
            )}
            {repliesLoading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin"/> Generating…</div>}
            {replies.length>0 && (
              <div className="space-y-1.5">
                {replies.map((r,i) => (
                  <button key={i} onClick={() => onReply(r)}
                    className="w-full text-left text-xs text-gray-700 bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg px-3 py-2 transition-colors">
                    {r}
                  </button>
                ))}
                <button onClick={loadReplies} className="text-[10px] text-purple-500 hover:underline">Regenerate</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Email Detail ─────────────────────────────────────────────────────────────
function EmailDetail({ email, folderPath, onBack, onReply, onReplyAll, onDelete, onToggleStar, onToggleSeen, onArchive, userEmail }: {
  email: EmailItem; folderPath: string; onBack: () => void;
  onReply: (to: string, subject: string, body: string) => void;
  onReplyAll: (to: string, cc: string, subject: string, body: string) => void;
  onDelete: (uid: number) => void; onToggleStar: (uid: number, cur: boolean) => void;
  onToggleSeen: (uid: number, cur: boolean) => void; onArchive: (uid: number) => void;
  userEmail?: string;
}) {
  const [body, setBody] = useState<EmailBody|null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [attachList, setAttachList] = useState<{ index: number; filename: string; contentType: string; size: number }[]>([]);
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
  const isTrash = folderPath === "[Gmail]/Trash";

  useEffect(() => {
    setLoading(true); setBody(null); setShowAI(false); setAttachList([]);
    apiFetch(`/email/${email.uid}/body?mailbox=${encodeURIComponent(folderPath)}${userParam}`)
      .then(d => { setBody(d); setLoading(false); }).catch(() => setLoading(false));
    if (email.hasAttachment) {
      apiFetch(`/email/${email.uid}/attachments?mailbox=${encodeURIComponent(folderPath)}${userParam}`)
        .then(d => setAttachList(d || []))
        .catch(() => {});
    }
  }, [email.uid, folderPath]);

  useEffect(() => {
    if (body?.html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:'Segoe UI',sans-serif;font-size:13px;margin:0;padding:16px;color:#374151;line-height:1.65}a{color:#1B2A5E}img{max-width:100%}blockquote{border-left:3px solid #e5e7eb;margin:8px 0;padding-left:12px;color:#6b7280}*{resize:none!important}</style></head><body>${body.html}</body></html>`);
        doc.close();
      }
    }
  }, [body]);

  const buildQuoted = () => {
    const dateStr = email.date ? new Date(email.date).toLocaleString("en-IN") : "";
    const plain = body?.text || (body?.html ? body.html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim() : "");
    return `\n\n— On ${dateStr}, ${senderName(email.from)} wrote:\n${plain.split("\n").map(l=>`> ${l}`).join("\n")}`;
  };

  const buildReplyAllCc = () => {
    const allAddresses = [email.to, email.cc].filter(Boolean).join(",");
    const parts = allAddresses.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
    const filtered = parts.filter(addr => !userEmail || !addr.toLowerCase().includes(userEmail.toLowerCase()));
    const fromEmail = email.from.match(/<(.+?)>/) ? email.from.match(/<(.+?)>/)![1] : email.from;
    const uniqueSet = new Set(filtered.filter(a => {
      const e = a.match(/<(.+?)>/) ? a.match(/<(.+?)>/)![1] : a;
      return e.toLowerCase() !== fromEmail.toLowerCase();
    }));
    return Array.from(uniqueSet).join(", ");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/email/${email.uid}?mailbox=${encodeURIComponent(folderPath)}${userParam}`, { method:"DELETE" });
      onDelete(email.uid);
    } catch { setDeleting(false); }
  };
  const handleArchive = async () => {
    try {
      await apiFetch(`/email/${email.uid}/archive?mailbox=${encodeURIComponent(folderPath)}${userParam}`, { method:"POST" });
      onArchive(email.uid);
    } catch { }
  };
  const handlePrint = () => {
    const w = window.open("","_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${email.subject}</title></head><body><h2>${email.subject}</h2><p>From: ${email.from}</p><p>Date: ${email.date}</p><hr/>${body?.html||`<pre>${body?.text||""}</pre>`}</body></html>`);
    w.print();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top action bar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 mr-2 transition-colors">
          <ChevronLeft className="w-4 h-4"/>
        </button>

        {/* Actions */}
        <button onClick={handleArchive} title="Archive" className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors font-medium">
          <Archive className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline">Archive</span>
        </button>
        <button onClick={handleDelete} disabled={deleting} title={isTrash?"Delete Forever":"Trash"} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-medium">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
          <span className="hidden sm:inline">{isTrash?"Delete Forever":"Trash"}</span>
        </button>
        <button onClick={() => onToggleSeen(email.uid, email.seen)} title={email.seen?"Mark Unread":"Mark Read"} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors font-medium">
          {email.seen ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
          <span className="hidden sm:inline">{email.seen?"Unread":"Read"}</span>
        </button>
        <button onClick={() => onToggleStar(email.uid, email.starred)} title={email.starred?"Unstar":"Star"}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors font-medium ${email.starred?"text-amber-500 bg-amber-50":"text-gray-600 hover:bg-gray-100"}`}>
          <Star className={`w-3.5 h-3.5 ${email.starred?"fill-current":""}`}/>
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1"/>

        <button onClick={() => setShowAI(v=>!v)} title="AI Tools"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${showAI?"bg-purple-100 text-purple-700":"text-gray-500 hover:bg-gray-100"}`}>
          <Sparkles className="w-3.5 h-3.5"/> AI
        </button>
        <button onClick={handlePrint} title="Print" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors">
          <Printer className="w-3.5 h-3.5"/>
        </button>

        <div className="flex-1"/>

        {/* Reply/Forward buttons */}
        <button onClick={() => onReply(email.from, `Re: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1B2A5E" }}>
          <CornerUpLeft className="w-3.5 h-3.5"/> Reply
        </button>
        <button onClick={() => onReplyAll(email.from, buildReplyAllCc(), `Re: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-1">
          <Users className="w-3.5 h-3.5"/> All
        </button>
        <button onClick={() => onReply("", `Fwd: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-1">
          <Forward className="w-3.5 h-3.5"/> Fwd
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          {/* Subject */}
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-start gap-2">
            <span className="flex-1">{email.subject}</span>
            {email.hasAttachment && <Paperclip className="w-4 h-4 text-gray-400 shrink-0 mt-1"/>}
          </h1>

          {/* Sender header */}
          <div className="flex items-start gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none"
              style={{ backgroundColor: avatarColor(email.from) }}>
              {senderInitial(email.from)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button onClick={() => setHeaderExpanded(v=>!v)} className="flex items-center gap-1 font-semibold text-sm text-gray-900 hover:text-[#1B2A5E] transition-colors">
                    {senderName(email.from)}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${headerExpanded?"rotate-180":""}`}/>
                  </button>
                  {!headerExpanded
                    ? <p className="text-xs text-gray-400 mt-0.5">to {email.to?.split(",")[0]}</p>
                    : <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                        <p><span className="text-gray-400 inline-block w-10">From:</span> {email.from}</p>
                        <p><span className="text-gray-400 inline-block w-10">To:</span> {email.to}</p>
                        {email.cc && <p><span className="text-gray-400 inline-block w-10">Cc:</span> {email.cc}</p>}
                      </div>
                  }
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {email.date ? new Date(email.date).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          {loading && <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin"/> Loading…</div>}
          {!loading && body?.html && <iframe ref={iframeRef} className="w-full border-0" style={{ minHeight:300, display:"block" }} title="email-body" sandbox="allow-same-origin allow-popups"/>}
          {!loading && !body?.html && body?.text && <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{body.text}</pre>}
          {!loading && !body?.html && !body?.text && <p className="text-sm text-gray-400 italic">No content available.</p>}

          {/* Attachments */}
          {!loading && attachList.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{attachList.length} Attachment{attachList.length > 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-col gap-2">
                {attachList.map(att => {
                  const isImage = att.contentType.startsWith("image/");
                  const isPdf = att.contentType === "application/pdf";
                  const ext = att.filename.split(".").pop()?.toLowerCase() || "";
                  const icon = isPdf ? "📄" : isImage ? "🖼️" : ["xlsx","xls","csv"].includes(ext) ? "📊" : ["docx","doc"].includes(ext) ? "📝" : ["zip","rar","7z"].includes(ext) ? "🗜️" : "📎";
                  const kb = att.size ? (att.size > 1048576 ? (att.size / 1048576).toFixed(1) + " MB" : (att.size / 1024).toFixed(1) + " KB") : "";
                  const href = `/api/email/${email.uid}/attachment/${att.index}?mailbox=${encodeURIComponent(folderPath)}${userParam}`;
                  return (
                    <a key={att.index} href={href} download={att.filename} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group w-full max-w-sm">
                      <span className="text-2xl leading-none">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-700 truncate group-hover:text-blue-700">{att.filename}</p>
                        {kb && <p className="text-[11px] text-gray-400">{kb}</p>}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick reply buttons at bottom */}
          {!loading && (
            <div className="mt-8 flex items-center gap-2 flex-wrap">
              <button onClick={() => onReply(email.from, `Re: ${email.subject}`, buildQuoted())}
                className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 hover:border-[#1B2A5E] hover:text-[#1B2A5E] text-gray-600 rounded-full text-xs font-semibold transition-colors">
                <CornerUpLeft className="w-3.5 h-3.5"/> Reply
              </button>
              <button onClick={() => onReplyAll(email.from, buildReplyAllCc(), `Re: ${email.subject}`, buildQuoted())}
                className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 hover:border-[#1B2A5E] hover:text-[#1B2A5E] text-gray-600 rounded-full text-xs font-semibold transition-colors">
                <Users className="w-3.5 h-3.5"/> Reply All
              </button>
              <button onClick={() => onReply("", `Fwd: ${email.subject}`, buildQuoted())}
                className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 hover:border-[#1B2A5E] hover:text-[#1B2A5E] text-gray-600 rounded-full text-xs font-semibold transition-colors">
                <Forward className="w-3.5 h-3.5"/> Forward
              </button>
              <button onClick={() => setShowAI(v=>!v)}
                className="flex items-center gap-1.5 px-5 py-2 border border-purple-200 text-purple-600 hover:bg-purple-50 rounded-full text-xs font-semibold transition-colors">
                <Sparkles className="w-3.5 h-3.5"/> Smart Reply
              </button>
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAI && (
          <div className="max-w-4xl mx-auto px-6 pb-6">
            <AIPanel uid={email.uid} body={body} subject={email.subject} from={email.from}
              onReply={draft => onReply(email.from, `Re: ${email.subject}`, `\n\n${draft}${buildQuoted()}`)}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Email Page ──────────────────────────────────────────────────────────
const PRIMARY_FOLDERS = ["INBOX","[Gmail]/Starred","[Gmail]/Sent Mail"];
const SECONDARY_FOLDERS = ["[Gmail]/Drafts","[Gmail]/Spam","[Gmail]/Trash","[Gmail]/All Mail","[Gmail]/Important"];

// Left nav rail icons (cosmetic app switcher like Zoho)
const NAV_RAIL = [
  { icon: Mail,         label: "Mail",     active: true  },
  { icon: Contact2,     label: "Contacts", active: false },
  { icon: Calendar,     label: "Calendar", active: false },
  { icon: CheckSquare,  label: "Tasks",    active: false },
  { icon: StickyNote,   label: "Notes",    active: false },
];

export default function Email() {
  const { user } = useAuth();
  const userEmail = user?.email;
  const { theme } = useTheme();
  const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";

  const [folders, setFolders] = useState<ImapFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [activeFolderPath, setActiveFolderPath] = useState("INBOX");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(true);

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date|null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmailItem|null>(null);
  const [composing, setComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState({
    to:"", cc:"", subject:"", body:"", mode:"compose" as "compose"|"reply"|"replyAll"|"forward"
  });
  const [search, setSearch] = useState("");
  const [checkedUids, setCheckedUids] = useState<Set<number>>(new Set());
  const [sortNewest, setSortNewest] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  const loadFolders = async () => {
    if (!userEmail) return;
    setFoldersLoading(true);
    try {
      const data = await apiFetch(`/email/folders?user=${encodeURIComponent(userEmail)}`);
      setFolders(Array.isArray(data) ? data : []);
    } catch { setFolders([]); }
    setFoldersLoading(false);
  };

  const load = async (path: string, silent = false) => {
    if (!silent) { setLoading(true); setError(""); setSelected(null); }
    try {
      const data = await apiFetch(`/email/messages?mailbox=${encodeURIComponent(path)}${userParam}`);
      setEmails(Array.isArray(data) ? data : []);
      apiFetch(`/email/sync-status?mailbox=${encodeURIComponent(path)}${userParam}`)
        .then(s => { if (s.lastSynced) setLastSynced(new Date(s.lastSynced)); }).catch(() => {});
    } catch(e: any) { if (!silent) setError(e.message || "Failed to load emails"); }
    if (!silent) setLoading(false);
  };

  const handleSync = async () => {
    if (!userEmail || syncing) return;
    setSyncing(true);
    try {
      const data = await apiFetch(`/email/sync?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`);
      setEmails(Array.isArray(data) ? data : []);
      setLastSynced(new Date()); setError("");
    } catch(e: any) { setError(e.message || "Sync failed"); }
    setSyncing(false);
  };

  useEffect(() => {
    if (!userEmail) return;
    loadFolders();
    load("INBOX");
  }, [userEmail]);

  useEffect(() => { load(activeFolderPath); setCheckedUids(new Set()); }, [activeFolderPath]);

  const handleReply = (to: string, subject: string, body: string) => {
    setComposeDefaults({ to, cc:"", subject, body, mode: to ? "reply" : "forward" });
    setComposing(true);
  };
  const handleReplyAll = (to: string, cc: string, subject: string, body: string) => {
    setComposeDefaults({ to, cc, subject, body, mode: "replyAll" });
    setComposing(true);
  };
  const handleDelete = (uid: number) => { setEmails(p => p.filter(e => e.uid!==uid)); setSelected(null); };
  const handleArchive = (uid: number) => { setEmails(p => p.filter(e => e.uid!==uid)); setSelected(null); };
  const handleToggleStar = async (uid: number, cur: boolean) => {
    const v = !cur;
    setEmails(p => p.map(e => e.uid===uid ? {...e,starred:v} : e));
    if (selected?.uid===uid) setSelected(s => s ? {...s,starred:v} : s);
    try { await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({starred:v}) }); }
    catch { setEmails(p => p.map(e => e.uid===uid ? {...e,starred:cur} : e)); }
  };
  const handleToggleSeen = async (uid: number, cur: boolean) => {
    const v = !cur;
    setEmails(p => p.map(e => e.uid===uid ? {...e,seen:v} : e));
    if (selected?.uid===uid) setSelected(s => s ? {...s,seen:v} : s);
    try { await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({seen:v}) }); }
    catch { setEmails(p => p.map(e => e.uid===uid ? {...e,seen:cur} : e)); }
  };
  const toggleCheck = (uid: number) => {
    setCheckedUids(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  };

  const toggleCheckAll = () => {
    if (checkedUids.size === filtered.length && filtered.length > 0) {
      setCheckedUids(new Set());
    } else {
      setCheckedUids(new Set(filtered.map(e => e.uid)));
    }
  };

  const [bulkWorking, setBulkWorking] = useState(false);

  const handleBulkTrash = async () => {
    if (checkedUids.size === 0 || bulkWorking) return;
    setBulkWorking(true);
    const uids = Array.from(checkedUids);
    try {
      await Promise.all(uids.map(uid =>
        apiFetch(`/email/${uid}?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, { method: "DELETE" }).catch(() => {})
      ));
      setEmails(prev => prev.filter(e => !checkedUids.has(e.uid)));
      if (selected && checkedUids.has(selected.uid)) setSelected(null);
      setCheckedUids(new Set());
    } catch {}
    setBulkWorking(false);
  };

  const handleBulkArchive = async () => {
    if (checkedUids.size === 0 || bulkWorking) return;
    setBulkWorking(true);
    const uids = Array.from(checkedUids);
    try {
      await Promise.all(uids.map(uid =>
        apiFetch(`/email/${uid}/archive?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`, { method: "POST" }).catch(() => {})
      ));
      setEmails(prev => prev.filter(e => !checkedUids.has(e.uid)));
      if (selected && checkedUids.has(selected.uid)) setSelected(null);
      setCheckedUids(new Set());
    } catch {}
    setBulkWorking(false);
  };

  const unread = emails.filter(e => !e.seen).length;
  let filtered = search.trim()
    ? emails.filter(e => e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()))
    : emails;
  if (filterUnread) filtered = filtered.filter(e => !e.seen);
  if (!sortNewest) filtered = [...filtered].reverse();

  const { main: mainFolders, labels } = groupFolders(folders);

  return (
    <Layout>
      {/* Full-height email client shell */}
      <div className="flex h-[calc(100vh-48px)] overflow-hidden bg-[#f0f2f5]">

        {/* ── Left App Rail (Zoho-style narrow icon bar) ── */}
        <div className="w-12 flex-shrink-0 flex flex-col items-center py-3 gap-1 border-r border-[#d0d5e0]" style={{ backgroundColor: "#1B2A5E" }}>
          {NAV_RAIL.map(({ icon: Icon, label, active }) => (
            <button key={label} title={label}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${active ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"}`}>
              <Icon style={{ width: 18, height: 18 }}/>
            </button>
          ))}
          <div className="flex-1"/>
          <button title="Settings" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors">
            <Settings style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        {/* ── Folder Sidebar ── */}
        <div className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-[#d8dde6] overflow-hidden">
          {/* Compose button */}
          <div className="px-3 pt-3 pb-2">
            <button
              onClick={() => { setComposing(true); setComposeDefaults({ to:"",cc:"",subject:"",body:"",mode:"compose" }); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#E05A00" }}>
              <Pencil className="w-3.5 h-3.5"/> New Mail
            </button>
          </div>

          {/* Folder nav */}
          <nav className="flex-1 overflow-y-auto px-1.5 pb-3 pt-1">
            {foldersLoading && <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300"/></div>}

            {/* Primary */}
            {mainFolders.filter(f => PRIMARY_FOLDERS.includes(f.path)).map(f => {
              const isActive = activeFolderPath === f.path;
              const color = FOLDER_META[f.path]?.color;
              return (
                <button key={f.path} onClick={() => setActiveFolderPath(f.path)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors mb-0.5 ${isActive ? "text-white" : "text-[#2e3d52] hover:bg-[#f0f4fa]"}`}
                  style={isActive ? { backgroundColor: "#1B2A5E" } : {}}>
                  <FolderIcon path={f.path} size={14}/>
                  <span className="flex-1 text-left truncate">{folderLabel(f.path)}</span>
                  {f.path==="INBOX" && unread>0 && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none ${isActive ? "bg-white/20 text-white" : "text-white"}`}
                      style={!isActive ? { backgroundColor: "#E05A00" } : {}}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Manage section */}
            {mainFolders.some(f => SECONDARY_FOLDERS.includes(f.path)) && (
              <>
                <button onClick={() => setManageOpen(v=>!v)}
                  className="w-full flex items-center gap-1 px-2.5 mt-3 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-left">Manage</span>
                  {manageOpen ? <ChevronDown className="w-3 h-3 text-gray-300"/> : <ChevronRight className="w-3 h-3 text-gray-300"/>}
                </button>
                {manageOpen && mainFolders.filter(f => SECONDARY_FOLDERS.includes(f.path)).map(f => {
                  const isActive = activeFolderPath === f.path;
                  return (
                    <button key={f.path} onClick={() => setActiveFolderPath(f.path)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors mb-0.5 ${isActive ? "text-white" : "text-[#3d5070] hover:bg-[#f0f4fa]"}`}
                      style={isActive ? { backgroundColor: "#1B2A5E" } : {}}>
                      <FolderIcon path={f.path} size={13}/>
                      <span className="flex-1 text-left truncate">{folderLabel(f.path)}</span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Extra folders */}
            {mainFolders.filter(f => !PRIMARY_FOLDERS.includes(f.path) && !SECONDARY_FOLDERS.includes(f.path)).map(f => {
              const isActive = activeFolderPath === f.path;
              return (
                <button key={f.path} onClick={() => setActiveFolderPath(f.path)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors mb-0.5 ${isActive?"text-white":"text-[#3d5070] hover:bg-[#f0f4fa]"}`}
                  style={isActive ? { backgroundColor:"#1B2A5E" } : {}}>
                  <FolderIcon path={f.path} size={13}/>
                  <span className="flex-1 text-left truncate">{folderLabel(f.path)}</span>
                </button>
              );
            })}

            {/* Labels */}
            {labels.length > 0 && (
              <>
                <div className="flex items-center gap-1 px-2.5 mt-3 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex-1">Labels</span>
                  <button onClick={() => setLabelsOpen(v=>!v)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    {labelsOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                  </button>
                </div>
                {labelsOpen && labels.map(f => {
                  const isActive = activeFolderPath === f.path;
                  return (
                    <button key={f.path} onClick={() => setActiveFolderPath(f.path)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors mb-0.5 ${isActive?"text-white":"text-[#3d5070] hover:bg-[#f0f4fa]"}`}
                      style={isActive ? { backgroundColor:"#1B2A5E" } : {}}>
                      <Tag className="w-3 h-3 text-gray-400 shrink-0"/>
                      <span className="flex-1 text-left truncate">{folderLabel(f.path)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Sync status at bottom */}
          <div className="px-3 py-2 border-t border-gray-100 bg-[#f8fafc]">
            <p className="text-[10px] text-gray-400 text-center">
              {syncing ? "Syncing…" : lastSynced ? `Synced ${lastSynced.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}` : ""}
            </p>
          </div>
        </div>

        {/* ── Email List Panel ── */}
        <div className={`flex flex-col border-r border-[#d8dde6] bg-white overflow-hidden flex-shrink-0 transition-all duration-200 ${selected ? "w-[320px]" : "flex-1 max-w-[520px]"}`}>
          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-1.5 border border-transparent focus-within:border-[#1B2A5E]/30 focus-within:bg-white transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${folderLabel(activeFolderPath)}…`}
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"/>
              {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-400 hover:text-gray-600"/></button>}
              <button onClick={handleSync} disabled={syncing||loading} title="Sync" className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing?"animate-spin":""}`}/>
              </button>
            </div>
          </div>

          {/* List toolbar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 bg-[#fafbfd] shrink-0">
            <button onClick={toggleCheckAll}
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                checkedUids.size > 0 && checkedUids.size === filtered.length
                  ? "bg-[#1B2A5E] border-[#1B2A5E]"
                  : checkedUids.size > 0
                    ? "bg-[#1B2A5E]/30 border-[#1B2A5E]"
                    : "border-gray-300 bg-white hover:border-gray-500"
              }`}>
              {checkedUids.size > 0 && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={checkedUids.size === filtered.length ? "M5 13l4 4L19 7" : "M5 12h14"} />
                </svg>
              )}
            </button>
            <span className="text-xs font-bold text-[#1B2A5E]">{folderLabel(activeFolderPath)}</span>
            {unread > 0 && <span className="text-[10px] font-bold text-white rounded-full px-1.5 leading-5" style={{ backgroundColor:"#E05A00" }}>{unread}</span>}
            <div className="flex-1"/>
            <button onClick={() => setFilterUnread(v=>!v)} title="Unread only"
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors ${filterUnread?"bg-[#1B2A5E] text-white border-[#1B2A5E]":"text-gray-500 border-gray-200 hover:border-gray-400"}`}>
              Unread
            </button>
            <button onClick={() => setSortNewest(v=>!v)} title="Sort"
              className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-700 transition-colors font-medium">
              <Filter className="w-3 h-3"/> {sortNewest?"Newest":"Oldest"}
            </button>
          </div>

          {/* Bulk actions bar */}
          {checkedUids.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#eef2fb] border-b border-[#c8d6ef] text-xs shrink-0">
              <span className="font-semibold text-[#1B2A5E]">{checkedUids.size} selected</span>
              <button onClick={handleBulkArchive} disabled={bulkWorking}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-50">
                {bulkWorking ? <Loader2 className="w-3 h-3 animate-spin"/> : <Archive className="w-3 h-3"/>} Archive
              </button>
              <button onClick={handleBulkTrash} disabled={bulkWorking}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50">
                {bulkWorking ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3"/>} Trash
              </button>
              <button onClick={() => setCheckedUids(new Set())} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-3 h-3"/></button>
            </div>
          )}

          {/* Email rows */}
          <div className="flex-1 overflow-y-auto">
            {loading && Array.from({length:12}).map((_,i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50">
                <div className="w-3.5 h-3.5 rounded bg-gray-100 animate-pulse shrink-0"/>
                <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse shrink-0"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-100 animate-pulse rounded w-2/3"/>
                  <div className="h-2 bg-gray-100 animate-pulse rounded w-1/2"/>
                </div>
                <div className="h-2 bg-gray-100 animate-pulse rounded w-8 shrink-0"/>
              </div>
            ))}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-400 mb-2"/>
                <p className="text-xs font-semibold text-gray-700 mb-1">Could not load emails</p>
                <p className="text-[10px] text-gray-400">{error}</p>
              </div>
            )}

            {!loading && !error && filtered.length===0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="w-8 h-8 text-gray-200 mb-2"/>
                <p className="text-xs text-gray-400">{search ? "No results found" : filterUnread ? "No unread emails" : "No emails"}</p>
              </div>
            )}

            {!loading && filtered.map(email => {
              const isSelected = selected?.uid === email.uid;
              const isChecked = checkedUids.has(email.uid);
              return (
                <div key={email.uid}
                  onClick={() => setSelected(email)}
                  className={`group flex items-stretch border-b cursor-pointer transition-colors relative
                    ${isSelected
                      ? "bg-[#edf2fb] border-[#c8d6ef]"
                      : email.seen
                        ? "bg-white border-gray-100 hover:bg-[#f5f7fb]"
                        : "bg-white border-gray-100 hover:bg-[#f0f4fb]"
                    }`}>
                  {/* Unread indicator bar */}
                  {!email.seen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1B2A5E] rounded-r"/>}

                  {/* Checkbox + Star */}
                  <div className="flex flex-col items-center justify-center gap-1 px-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleCheck(email.uid)}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isChecked ? "bg-[#1B2A5E] border-[#1B2A5E]" : "border-gray-300 bg-white hover:border-gray-500"}`}>
                      {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    <button onClick={() => handleToggleStar(email.uid, email.starred)}
                      className={`transition-colors ${email.starred ? "text-amber-400" : "text-gray-200 hover:text-amber-300"}`}>
                      <Star className={`w-3 h-3 ${email.starred ? "fill-current" : ""}`}/>
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="flex items-center py-2.5 pr-2 shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] select-none"
                      style={{ backgroundColor: avatarColor(email.from) }}>
                      {senderInitial(email.from)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-2.5 pr-3">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={`text-[13px] truncate ${email.seen ? "text-gray-600 font-normal" : "text-gray-900 font-semibold"}`}>
                        {senderName(email.from)}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">{formatDate(email.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] truncate flex-1 leading-snug ${email.seen ? "text-gray-400" : "text-gray-700 font-medium"}`}>
                        {email.subject}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {email.hasAttachment && <Paperclip className="w-2.5 h-2.5 text-gray-400"/>}
                        {!email.seen && <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A5E]"/>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Email Reading Pane ── */}
        {selected ? (
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <EmailDetail
              email={selected}
              folderPath={activeFolderPath}
              onBack={() => setSelected(null)}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onToggleStar={handleToggleStar}
              onToggleSeen={handleToggleSeen}
              userEmail={userEmail}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5]">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
              style={{ backgroundColor: "#1B2A5E" }}>
              <Mail className="w-8 h-8 text-white opacity-60"/>
            </div>
            <h2 className="text-sm font-bold text-gray-600">Select a message to read</h2>
            <p className="text-xs text-gray-400 mt-1">Or compose a new message</p>
            <button
              onClick={() => { setComposing(true); setComposeDefaults({ to:"",cc:"",subject:"",body:"",mode:"compose" }); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#E05A00" }}>
              <Pencil className="w-3.5 h-3.5"/> New Mail
            </button>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composing && (
        <ComposeModal
          defaultTo={composeDefaults.to}
          defaultCc={composeDefaults.cc}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          mode={composeDefaults.mode}
          onClose={() => setComposing(false)}
          onSent={() => { if (activeFolderPath==="[Gmail]/Sent Mail") load(activeFolderPath); }}
          userEmail={userEmail}
        />
      )}
    </Layout>
  );
}
