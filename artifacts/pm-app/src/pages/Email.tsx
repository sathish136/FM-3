import { Layout } from "@/components/Layout";
import {
  Mail, Send, Inbox, Pencil, X, ChevronLeft, Loader2,
  RefreshCw, AlertCircle, Trash2, Star, Paperclip, Search,
  Eye, EyeOff, CornerUpLeft, Forward, Archive, Tag, Bookmark,
  ShieldAlert, FileText, FolderOpen, ChevronDown, ChevronRight,
  Sparkles, Printer, Clock, Wand2, Users, Minimize2, Maximize2,
  Bold, Italic, Underline, Link, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Strikethrough, Quote, Smile, MoreHorizontal,
  Paperclip as AttachIcon, Image as ImageIcon, Type, Palette,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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
const COLORS = ["from-blue-500 to-indigo-600","from-violet-500 to-purple-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600","from-emerald-500 to-teal-600","from-cyan-500 to-sky-600"];
function avatarColor(s: string) { let n=0; for(const c of s)n+=c.charCodeAt(0); return COLORS[n%COLORS.length]; }

// ─── Folder meta ──────────────────────────────────────────────────────────────
const FOLDER_META: Record<string, { label: string; icon: any; color?: string }> = {
  "INBOX":               { label:"Inbox",     icon:Inbox },
  "[Gmail]/Starred":     { label:"Starred",   icon:Star,       color:"text-amber-400" },
  "[Gmail]/Sent Mail":   { label:"Sent",      icon:Send },
  "[Gmail]/Drafts":      { label:"Drafts",    icon:FileText },
  "[Gmail]/Spam":        { label:"Spam",      icon:ShieldAlert },
  "[Gmail]/Trash":       { label:"Trash",     icon:Trash2 },
  "[Gmail]/All Mail":    { label:"All Mail",  icon:Archive },
  "[Gmail]/Important":   { label:"Important", icon:Bookmark },
};
const PRIORITY = ["INBOX","[Gmail]/Starred","[Gmail]/Sent Mail","[Gmail]/Drafts","[Gmail]/Spam","[Gmail]/Trash","[Gmail]/All Mail","[Gmail]/Important"];

function folderLabel(path: string) { return FOLDER_META[path]?.label || path.split("/").pop() || path; }
function FolderIcon({ path, className }: { path: string; className?: string }) {
  const Icon = FOLDER_META[path]?.icon || Tag;
  return <Icon className={className} />;
}

function groupFolders(folders: ImapFolder[]) {
  const map = new Map(folders.map(f => [f.path, f]));
  const main = PRIORITY.filter(p => map.has(p)).map(p => map.get(p)!);
  const labels = folders.filter(f => !PRIORITY.includes(f.path) && !f.path.startsWith("[Gmail]"));
  return { main, labels };
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
const EMOJI_LIST = ["😊","😂","❤️","👍","🎉","🙏","😍","🔥","✅","💯","👋","🤔","😅","🙌","💪","📧","📎","🔗","⭐","✨"];

function ToolbarBtn({ onAction, title, active, children }: { onAction?: () => void; title?: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onAction?.(); }}
      title={title}
      className={`p-1.5 rounded transition-colors shrink-0 ${active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200 hover:text-gray-800"}`}
    >
      {children}
    </button>
  );
}

function ComposeModal({ onClose, defaultTo="", defaultCc="", defaultSubject="", defaultBody="", onSent, userEmail, mode="compose" }: {
  onClose: () => void;
  defaultTo?: string;
  defaultCc?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
  userEmail?: string;
  mode?: "compose" | "reply" | "replyAll" | "forward";
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
    if (editorRef.current && defaultBody) {
      editorRef.current.innerText = defaultBody;
      setBody(defaultBody);
    }
    if (userEmail) {
      apiFetch(`/auth/profile?email=${encodeURIComponent(userEmail)}`).then(p => setProfile(p)).catch(() => {});
    }
  }, []);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execCmd = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  const insertAtCursor = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertHTML", false, html);
  };

  const handleFontSize = (val: string) => {
    setFontSize(val);
    execCmd("fontSize", val);
  };

  const handleLink = () => {
    saveSelection();
    const url = window.prompt("Enter URL (include https://):");
    if (url) {
      restoreSelection();
      execCmd("createLink", url);
    }
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleImageInsert = () => {
    saveSelection();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      restoreSelection();
      insertAtCursor(`<img src="${src}" alt="${file.name}" style="max-width:100%;border-radius:4px;margin:4px 0;" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEmoji = (emoji: string) => {
    restoreSelection();
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const aiAssist = async () => {
    const currentBody = editorRef.current?.innerText || body;
    if (!subject && !currentBody) return;
    setAiWriting(true);
    try {
      const res = await apiFetch("/email/ai-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body: currentBody, to }),
      });
      if (res.draft && editorRef.current) {
        editorRef.current.innerText = res.draft;
        setBody(res.draft);
      }
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
    const signatureHtml = buildSignatureHtml();
    const fullBody = editorHtml + signatureHtml;
    if (!to.trim() || !subject.trim()) { setError("To and Subject are required."); return; }
    setSending(true); setError("");
    try {
      await apiFetch("/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc: cc || undefined, bcc: bcc || undefined, subject, body: fullBody, user: userEmail }),
      });
      setSent(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1500);
    } catch (e: any) { setError(e.message || "Failed to send"); }
    setSending(false);
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f4c8a] to-[#1565c0] text-white rounded-t-xl shadow-2xl cursor-pointer select-none min-w-[300px]"
          onClick={() => setMinimized(false)}
        >
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
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    : "fixed inset-0 z-50 flex items-end justify-end p-5 pointer-events-none";

  const windowCls = maximized ? "w-[92vw] h-[92vh] rounded-2xl" : "w-[660px] rounded-2xl";

  return (
    <div className={wrapperCls} onClick={() => setShowEmoji(false)}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange}/>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange}/>

      <div
        className={`pointer-events-auto bg-white flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.28)] border border-gray-200/80 overflow-hidden ${windowCls}`}
        style={maximized ? {} : { maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0d47a1] to-[#1976d2] text-white shrink-0 select-none">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{windowTitle}</p>
            {userEmail && <p className="text-[10px] text-blue-200 truncate">{userEmail}</p>}
          </div>
          <button onClick={() => setMinimized(true)} title="Minimize" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><Minimize2 className="w-3.5 h-3.5"/></button>
          <button onClick={() => setMaximized(v => !v)} title={maximized ? "Restore" : "Maximize"} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><Maximize2 className="w-3.5 h-3.5"/></button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/70 transition-colors"><X className="w-3.5 h-3.5"/></button>
        </div>

        {/* ── Address Fields ── */}
        <div className="shrink-0 bg-[#fafbfc] border-b border-gray-200">
          {userEmail && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 uppercase tracking-widest">From</span>
              <span className="text-sm text-gray-600 flex-1">{userEmail}</span>
            </div>
          )}
          <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2 focus-within:bg-blue-50/40 transition-colors">
            <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 uppercase tracking-widest">To</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="Add recipients"
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300 min-w-0"/>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setShowCc(v => !v)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-colors ${showCc ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-200 border border-gray-200"}`}>Cc</button>
              <button onClick={() => setShowBcc(v => !v)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-colors ${showBcc ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-200 border border-gray-200"}`}>Bcc</button>
            </div>
          </div>
          {showCc && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2 focus-within:bg-blue-50/40 transition-colors">
              <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 uppercase tracking-widest">Cc</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="Add Cc recipients"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
            </div>
          )}
          {showBcc && (
            <div className="flex items-center px-4 py-2 border-b border-gray-100 gap-2 focus-within:bg-blue-50/40 transition-colors">
              <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 uppercase tracking-widest">Bcc</span>
              <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="Add Bcc recipients"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
            </div>
          )}
          <div className="flex items-center px-4 py-2.5 gap-2 focus-within:bg-blue-50/40 transition-colors">
            <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 uppercase tracking-widest">Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Write a subject…"
              className="flex-1 text-sm font-semibold text-gray-800 outline-none bg-transparent placeholder-gray-300"/>
          </div>
        </div>

        {/* ── Formatting Toolbar ── */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#f0f3f7] border-b border-gray-200 shrink-0 flex-wrap">
          <select
            value={fontSize}
            onMouseDown={e => e.preventDefault()}
            onChange={e => handleFontSize(e.target.value)}
            className="text-xs text-gray-700 bg-white border border-gray-300 rounded px-1.5 py-1 outline-none cursor-pointer h-7 mr-1"
          >
            <option value="1">10</option>
            <option value="2">12</option>
            <option value="3">14</option>
            <option value="4">16</option>
            <option value="5">18</option>
            <option value="6">24</option>
            <option value="7">32</option>
          </select>

          <div className="w-px h-5 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("bold")} title="Bold"><Bold className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("italic")} title="Italic"><Italic className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("underline")} title="Underline"><Underline className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("strikeThrough")} title="Strikethrough"><Strikethrough className="w-3.5 h-3.5"/></ToolbarBtn>

          <div className="w-px h-5 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("justifyLeft")} title="Align Left"><AlignLeft className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("justifyCenter")} title="Align Center"><AlignCenter className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("justifyRight")} title="Align Right"><AlignRight className="w-3.5 h-3.5"/></ToolbarBtn>

          <div className="w-px h-5 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={() => execCmd("insertUnorderedList")} title="Bullet List"><List className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("insertOrderedList")} title="Numbered List"><ListOrdered className="w-3.5 h-3.5"/></ToolbarBtn>
          <ToolbarBtn onAction={() => execCmd("formatBlock", "blockquote")} title="Blockquote"><Quote className="w-3.5 h-3.5"/></ToolbarBtn>

          <div className="w-px h-5 bg-gray-300 mx-0.5"/>
          <ToolbarBtn onAction={handleLink} title="Insert Link"><Link className="w-3.5 h-3.5"/></ToolbarBtn>

          <ToolbarBtn onAction={handleImageInsert} title="Insert Image"><ImageIcon className="w-3.5 h-3.5"/></ToolbarBtn>

          {/* Emoji picker */}
          <div className="relative">
            <ToolbarBtn onAction={() => { saveSelection(); setShowEmoji(v => !v); }} title="Insert Emoji"><Smile className="w-3.5 h-3.5"/></ToolbarBtn>
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 w-52">
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJI_LIST.map(e => (
                    <button key={e} onMouseDown={ev => { ev.preventDefault(); handleEmoji(e); }}
                      className="text-base hover:bg-blue-50 rounded p-0.5 transition-colors leading-none">{e}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ToolbarBtn onAction={() => execCmd("removeFormat")} title="Clear Formatting"><Type className="w-3.5 h-3.5"/></ToolbarBtn>

          <div className="flex-1"/>

          {/* Attach file button in toolbar */}
          <button
            onMouseDown={e => { e.preventDefault(); handleAttach(); }}
            title="Attach File"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors font-medium"
          >
            <AttachIcon className="w-3.5 h-3.5"/> Attach
          </button>
        </div>

        {/* ── Editor Body ── */}
        <div className="flex-1 overflow-y-auto bg-white min-h-0">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => setBody(editorRef.current?.innerHTML || "")}
            onBlur={saveSelection}
            className="compose-editor w-full min-h-full px-6 py-4 text-sm text-gray-800 outline-none leading-relaxed"
            style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: maximized ? "360px" : "200px" }}
            data-placeholder="Write your message here…"
          />
        </div>

        {/* ── Attachments strip ── */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-[#f8fafc] border-t border-gray-100 flex flex-wrap gap-1.5 shrink-0">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                <AttachIcon className="w-3 h-3 text-blue-500 shrink-0"/>
                <span className="max-w-[120px] truncate font-medium">{f.name}</span>
                <span className="text-gray-400 shrink-0">({(f.size/1024).toFixed(0)} KB)</span>
                <button onClick={() => removeAttachment(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"><X className="w-3 h-3"/></button>
              </div>
            ))}
          </div>
        )}

        {/* ── Signature ── */}
        <div className="px-6 py-3 bg-white border-t border-dashed border-gray-200 shrink-0 select-none">
          <p className="text-xs text-gray-400 mb-2 italic">Best Regards,</p>
          {profile ? (
            <div className="flex flex-col gap-0.5">
              {profile.full_name && (
                <p className="text-sm font-bold text-gray-900 leading-tight">{profile.full_name}</p>
              )}
              {profile.designation && (
                <p className="text-xs font-semibold text-[#e05a00] leading-tight">{profile.designation}</p>
              )}
              {(profile.mobile_no || profile.phone) && (
                <p className="text-xs text-gray-600 leading-tight">{profile.mobile_no || profile.phone}</p>
              )}
              {profile.company && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wide leading-tight">{profile.company}</p>
                  {profile.branch && (
                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{profile.branch}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"/>
              <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse"/>
              <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse"/>
            </div>
          )}
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-[#f7f9fc] shrink-0">
          <div className="flex items-center shrink-0">
            <button onClick={handleSend} disabled={sending || sent}
              className="flex items-center gap-2 pl-4 pr-3 py-2 bg-[#1565c0] hover:bg-[#0d47a1] disabled:opacity-60 text-white rounded-l-lg text-sm font-semibold transition-colors shadow-sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
              {sending ? "Sending…" : sent ? "✓ Sent!" : "Send"}
            </button>
            <button className="flex items-center px-2 py-2 bg-[#1976d2] hover:bg-[#1565c0] text-white rounded-r-lg border-l border-blue-700/40 transition-colors shadow-sm">
              <ChevronDown className="w-4 h-4"/>
            </button>
          </div>

          <button onClick={aiAssist} disabled={aiWriting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border bg-white border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm transition-colors">
            {aiWriting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5"/>}
            AI Improve
          </button>

          <button className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            Save Draft
          </button>

          <div className="flex-1"/>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0"/> {error}
            </div>
          )}
          {sent && <p className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">✓ Message sent!</p>}

          <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors" title="More options"><MoreHorizontal className="w-4 h-4"/></button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-100 hover:text-red-500 text-gray-400 transition-colors" title="Discard draft"><Trash2 className="w-4 h-4"/></button>
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
  const [summary, setSummary] = useState(""); const [summaryLoading, setSummaryLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]); const [repliesLoading, setRepliesLoading] = useState(false);
  const [tab, setTab] = useState<"summary"|"reply">("summary");

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const r = await apiFetch(`/email/${uid}/ai-summary`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ bodyText:body?.text, bodyHtml:body?.html, subject }) });
      setSummary(r.summary||"");
    } catch { setSummary("Could not generate summary."); }
    setSummaryLoading(false);
  };

  const loadReplies = async () => {
    setRepliesLoading(true);
    try {
      const r = await apiFetch(`/email/${uid}/ai-reply`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ bodyText:body?.text, bodyHtml:body?.html, subject, from }) });
      setReplies(r.replies||[]);
    } catch { setReplies([]); }
    setRepliesLoading(false);
  };

  useEffect(() => { setSummary(""); setReplies([]); }, [uid]);

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200">
        <Sparkles className="w-3.5 h-3.5 text-blue-500"/>
        <span className="text-xs font-semibold text-gray-700">AI Assistant</span>
        <div className="flex ml-3 gap-1">
          {(["summary","reply"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${tab===t?"bg-blue-600 text-white":"text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}>
              {t==="summary"?"Summarize":"Smart Reply"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {tab==="summary" && (
          <>
            {!summary && !summaryLoading && (
              <button onClick={loadSummary} className="flex items-center gap-2 text-xs text-blue-600 font-semibold hover:underline">
                <Sparkles className="w-3 h-3"/> Generate AI Summary
              </button>
            )}
            {summaryLoading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin"/> Summarizing…</div>}
            {summary && (
              <div>
                <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
                <button onClick={loadSummary} className="mt-1.5 text-[10px] text-blue-500 hover:underline">Regenerate</button>
              </div>
            )}
          </>
        )}

        {tab==="reply" && (
          <>
            {replies.length===0 && !repliesLoading && (
              <button onClick={loadReplies} className="flex items-center gap-2 text-xs text-blue-600 font-semibold hover:underline">
                <Sparkles className="w-3 h-3"/> Generate Smart Replies
              </button>
            )}
            {repliesLoading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin"/> Generating replies…</div>}
            {replies.length>0 && (
              <div className="space-y-1.5">
                {replies.map((r,i)=>(
                  <button key={i} onClick={()=>onReply(r)}
                    className="w-full text-left text-xs text-gray-700 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors">
                    {r}
                  </button>
                ))}
                <button onClick={loadReplies} className="text-[10px] text-blue-500 hover:underline">Regenerate</button>
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
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";
  const isTrash = folderPath === "[Gmail]/Trash";

  useEffect(()=>{
    setLoading(true); setBody(null); setShowAI(false);
    apiFetch(`/email/${email.uid}/body?mailbox=${encodeURIComponent(folderPath)}${userParam}`)
      .then(d=>{setBody(d);setLoading(false);}).catch(()=>setLoading(false));
  },[email.uid, folderPath]);

  useEffect(()=>{
    if(body?.html && iframeRef.current){
      const doc=iframeRef.current.contentDocument;
      if(doc){ doc.open(); doc.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;font-size:13px;margin:16px;color:#374151;line-height:1.6}a{color:#2563eb}img{max-width:100%}blockquote{border-left:3px solid #e5e7eb;margin:8px 0;padding-left:12px;color:#6b7280}</style></head><body>${body.html}</body></html>`); doc.close(); }
    }
  },[body]);

  const buildQuoted = () => {
    const dateStr = email.date ? new Date(email.date).toLocaleString("en-IN") : "";
    const plain = body?.text || (body?.html ? body.html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim() : "");
    return `\n\n— On ${dateStr}, ${senderName(email.from)} wrote:\n${plain.split("\n").map(l=>`> ${l}`).join("\n")}`;
  };

  const buildReplyAllCc = () => {
    const allAddresses = [email.to, email.cc].filter(Boolean).join(",");
    const parts = allAddresses.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const filtered = parts.filter(addr => {
      if (!userEmail) return true;
      return !addr.toLowerCase().includes(userEmail.toLowerCase());
    });
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
      await apiFetch(`/email/${email.uid}?mailbox=${encodeURIComponent(folderPath)}${userParam}`,{method:"DELETE"});
      onDelete(email.uid);
    } catch { setDeleting(false); }
  };

  const handleArchive = async () => {
    try {
      await apiFetch(`/email/${email.uid}/archive?mailbox=${encodeURIComponent(folderPath)}${userParam}`,{method:"POST"});
      onArchive(email.uid);
    } catch { }
  };

  const handlePrint = () => {
    const w = window.open("","_blank");
    if(!w) return;
    w.document.write(`<html><head><title>${email.subject}</title></head><body><h2>${email.subject}</h2><p>From: ${email.from}</p><p>To: ${email.to}</p><p>Date: ${email.date}</p><hr/>${body?.html||`<pre>${body?.text||""}</pre>`}</body></html>`);
    w.print();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 mr-1"><ChevronLeft className="w-4 h-4"/></button>

        <button onClick={handleArchive} title="Archive" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"><Archive className="w-3.5 h-3.5"/></button>
        <button onClick={handleDelete} disabled={deleting} title={isTrash?"Delete Forever":"Move to Trash"} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
          {deleting?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Trash2 className="w-3.5 h-3.5"/>}
        </button>
        <button onClick={()=>onToggleSeen(email.uid, email.seen)} title={email.seen?"Mark unread":"Mark read"} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
          {email.seen?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
        </button>
        <button onClick={()=>onToggleStar(email.uid, email.starred)} title={email.starred?"Unstar":"Star"}
          className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${email.starred?"text-amber-400":"text-gray-500"}`}>
          <Star className={`w-3.5 h-3.5 ${email.starred?"fill-current":""}`}/>
        </button>
        <button title="Snooze" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"><Clock className="w-3.5 h-3.5"/></button>

        <div className="w-px h-4 bg-gray-200 mx-1"/>

        <button onClick={()=>setShowAI(v=>!v)} title="AI Tools"
          className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-semibold ${showAI?"bg-blue-100 text-blue-700":"hover:bg-gray-100 text-gray-500"}`}>
          <Sparkles className="w-3.5 h-3.5"/> AI
        </button>

        <div className="flex-1"/>

        <button
          onClick={()=>onReply(email.from, `Re: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        >
          <CornerUpLeft className="w-3.5 h-3.5"/> Reply
        </button>
        <button
          onClick={()=>onReplyAll(email.from, buildReplyAllCc(), `Re: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        >
          <Users className="w-3.5 h-3.5"/> Reply All
        </button>
        <button
          onClick={()=>onReply("", `Fwd: ${email.subject}`, buildQuoted())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        >
          <Forward className="w-3.5 h-3.5"/> Forward
        </button>
        <button onClick={handlePrint} title="Print" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors ml-1">
          <Printer className="w-3.5 h-3.5"/>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
            <span className="flex-1">{email.subject}</span>
            {email.hasAttachment && <Paperclip className="w-4 h-4 text-gray-400 shrink-0 mt-0.5"/>}
          </h1>

          {/* Sender card */}
          <div className="flex items-start gap-2.5 mb-4">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(email.from)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
              {senderInitial(email.from)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <button onClick={()=>setHeaderExpanded(v=>!v)} className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:underline">
                  {senderName(email.from)}
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${headerExpanded?"rotate-180":""}`}/>
                </button>
                <span className="text-xs text-gray-400 shrink-0">
                  {email.date ? new Date(email.date).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                </span>
              </div>
              {!headerExpanded
                ? <p className="text-xs text-gray-400">to {email.to?.split(",")[0]}</p>
                : <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                    <p><span className="text-gray-400 w-10 inline-block">From:</span> {email.from}</p>
                    <p><span className="text-gray-400 w-10 inline-block">To:</span> {email.to}</p>
                    {email.cc && <p><span className="text-gray-400 w-10 inline-block">Cc:</span> {email.cc}</p>}
                    <p><span className="text-gray-400 w-10 inline-block">Date:</span> {email.date ? new Date(email.date).toLocaleString("en-IN") : ""}</p>
                  </div>
              }
            </div>
          </div>

          {/* Body */}
          <div className="border-t border-gray-100 pt-4">
            {loading && <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> Loading…</div>}
            {!loading && body?.html && <iframe ref={iframeRef} className="w-full border-0 min-h-[300px]" title="email-body" sandbox="allow-same-origin allow-popups"/>}
            {!loading && !body?.html && body?.text && <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{body.text}</pre>}
            {!loading && !body?.html && !body?.text && <p className="text-sm text-gray-400 italic">No content available.</p>}
          </div>
        </div>

        {/* AI Panel */}
        {showAI && (
          <AIPanel uid={email.uid} body={body} subject={email.subject} from={email.from}
            onReply={draft=>onReply(email.from,`Re: ${email.subject}`,`\n\n${draft}${buildQuoted()}`)}/>
        )}

        {/* Quick reply bar */}
        {!loading && (
          <div className="px-6 py-3 border-t border-gray-100 flex gap-2 flex-wrap">
            <button
              onClick={()=>onReply(email.from, `Re: ${email.subject}`, buildQuoted())}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-full text-xs font-medium transition-colors"
            >
              <CornerUpLeft className="w-3 h-3"/> Reply
            </button>
            <button
              onClick={()=>onReplyAll(email.from, buildReplyAllCc(), `Re: ${email.subject}`, buildQuoted())}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-full text-xs font-medium transition-colors"
            >
              <Users className="w-3 h-3"/> Reply All
            </button>
            <button
              onClick={()=>onReply("", `Fwd: ${email.subject}`, buildQuoted())}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-full text-xs font-medium transition-colors"
            >
              <Forward className="w-3 h-3"/> Forward
            </button>
            <button
              onClick={()=>setShowAI(v=>!v)}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-purple-200 hover:border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-full text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3 h-3"/> Smart Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Email Page ──────────────────────────────────────────────────────────
export default function Email() {
  const { user } = useAuth();
  const userEmail = user?.email;
  const userParam = userEmail ? `&user=${encodeURIComponent(userEmail)}` : "";

  const [folders, setFolders] = useState<ImapFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [activeFolderPath, setActiveFolderPath] = useState("INBOX");
  const [labelsOpen, setLabelsOpen] = useState(false);

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date|null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EmailItem|null>(null);
  const [composing, setComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState({ to:"", cc:"", subject:"", body:"", mode:"compose" as "compose"|"reply"|"replyAll"|"forward" });
  const [search, setSearch] = useState("");
  const [checkedUids, setCheckedUids] = useState<Set<number>>(new Set());

  const loadFolders = async () => {
    if(!userEmail) return;
    setFoldersLoading(true);
    try {
      const data = await apiFetch(`/email/folders?user=${encodeURIComponent(userEmail)}`);
      setFolders(Array.isArray(data)?data:[]);
    } catch { setFolders([]); }
    setFoldersLoading(false);
  };

  const load = async (path: string, silent=false) => {
    if(!silent){setLoading(true);setError("");setSelected(null);}
    try {
      const data = await apiFetch(`/email/messages?mailbox=${encodeURIComponent(path)}${userParam}`);
      setEmails(Array.isArray(data)?data:[]);
      apiFetch(`/email/sync-status?mailbox=${encodeURIComponent(path)}${userParam}`)
        .then(s=>{if(s.lastSynced)setLastSynced(new Date(s.lastSynced));}).catch(()=>{});
    } catch(e:any) { if(!silent) setError(e.message||"Failed to load emails"); }
    if(!silent) setLoading(false);
  };

  const handleSync = async () => {
    if(!userEmail||syncing) return;
    setSyncing(true);
    try {
      const data = await apiFetch(`/email/sync?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`);
      setEmails(Array.isArray(data)?data:[]);
      setLastSynced(new Date()); setError("");
    } catch(e:any) { setError(e.message||"Sync failed"); }
    setSyncing(false);
  };

  useEffect(()=>{
    if(!userEmail) return;
    loadFolders();
    load("INBOX");
  },[userEmail]);

  useEffect(()=>{ load(activeFolderPath); setCheckedUids(new Set()); },[activeFolderPath]);

  const handleReply = (to: string, subject: string, body: string) => {
    setComposeDefaults({ to, cc:"", subject, body, mode: to ? "reply" : "forward" });
    setComposing(true);
  };

  const handleReplyAll = (to: string, cc: string, subject: string, body: string) => {
    setComposeDefaults({ to, cc, subject, body, mode: "replyAll" });
    setComposing(true);
  };

  const handleDelete = (uid: number) => { setEmails(p=>p.filter(e=>e.uid!==uid)); setSelected(null); };
  const handleArchive = (uid: number) => { setEmails(p=>p.filter(e=>e.uid!==uid)); setSelected(null); };

  const handleToggleStar = async (uid: number, cur: boolean) => {
    const v = !cur;
    setEmails(p=>p.map(e=>e.uid===uid?{...e,starred:v}:e));
    if(selected?.uid===uid) setSelected(s=>s?{...s,starred:v}:s);
    try { await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({starred:v})}); }
    catch { setEmails(p=>p.map(e=>e.uid===uid?{...e,starred:cur}:e)); }
  };

  const handleToggleSeen = async (uid: number, cur: boolean) => {
    const v = !cur;
    setEmails(p=>p.map(e=>e.uid===uid?{...e,seen:v}:e));
    if(selected?.uid===uid) setSelected(s=>s?{...s,seen:v}:s);
    try { await apiFetch(`/email/${uid}/flags?mailbox=${encodeURIComponent(activeFolderPath)}${userParam}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({seen:v})}); }
    catch { setEmails(p=>p.map(e=>e.uid===uid?{...e,seen:cur}:e)); }
  };

  const toggleCheck = (uid: number) => {
    setCheckedUids(prev=>{const n=new Set(prev); n.has(uid)?n.delete(uid):n.add(uid); return n;});
  };

  const unread = emails.filter(e=>!e.seen).length;
  const filtered = search.trim()
    ? emails.filter(e=>e.subject.toLowerCase().includes(search.toLowerCase())||e.from.toLowerCase().includes(search.toLowerCase()))
    : emails;

  const { main: mainFolders, labels } = groupFolders(folders);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)] bg-[#f8fafc] overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
          <div className="px-3 pt-3 pb-2">
            <button
              onClick={()=>{ setComposing(true); setComposeDefaults({to:"",cc:"",subject:"",body:"",mode:"compose"}); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1a6de0] hover:bg-[#1558c0] text-white rounded-2xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Pencil className="w-3.5 h-3.5"/> Compose
            </button>
          </div>

          {foldersLoading && <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-300"/></div>}

          <nav className="px-1.5 flex-1">
            {mainFolders.map(f=>{
              const isActive = activeFolderPath===f.path;
              const colorClass = isActive?"text-blue-700":FOLDER_META[f.path]?.color||"text-gray-500";
              return (
                <button key={f.path} onClick={()=>setActiveFolderPath(f.path)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${isActive?"bg-blue-50 text-blue-700":"text-gray-700 hover:bg-gray-50"}`}>
                  <FolderIcon path={f.path} className={`w-4 h-4 shrink-0 ${colorClass}`}/>
                  <span className="flex-1 text-left truncate">{folderLabel(f.path)}</span>
                  {f.path==="INBOX" && unread>0 && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-1.5 leading-5 min-w-[20px] text-center">
                      {unread>99?"99+":unread}
                    </span>
                  )}
                </button>
              );
            })}

            {labels.length>0 && (
              <>
                <button onClick={()=>setLabelsOpen(v=>!v)}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 mt-1">
                  {labelsOpen?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>} Labels
                </button>
                {labelsOpen && labels.map(f=>(
                  <button key={f.path} onClick={()=>setActiveFolderPath(f.path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${activeFolderPath===f.path?"bg-blue-50 text-blue-700":"text-gray-700 hover:bg-gray-50"}`}>
                    <Tag className="w-3.5 h-3.5 shrink-0 text-gray-400"/>
                    <span className="flex-1 text-left truncate text-xs">{folderLabel(f.path)}</span>
                  </button>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* ── Email List ── */}
        <div className={`flex flex-col border-r border-gray-100 bg-white transition-all ${selected?"w-72 flex-shrink-0":"flex-1"}`}>
          {/* Toolbar */}
          <div className="px-3 py-2 border-b border-gray-100 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                  className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"/>
                {search && <button onClick={()=>setSearch("")}><X className="w-3 h-3 text-gray-400"/></button>}
              </div>
              <button onClick={handleSync} disabled={syncing||loading} title="Sync"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-40 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing?"animate-spin":""}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-gray-800">{folderLabel(activeFolderPath)}</span>
              <span className="text-[10px] text-gray-400">
                {syncing?"Syncing…":lastSynced?`${lastSynced.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`:""}
              </span>
            </div>
          </div>

          {/* Bulk actions */}
          {checkedUids.size>0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b border-blue-100 text-xs">
              <span className="font-semibold text-blue-700">{checkedUids.size} selected</span>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900"><Archive className="w-3 h-3"/> Archive</button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900"><Trash2 className="w-3 h-3"/> Delete</button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900"><Eye className="w-3 h-3"/> Read</button>
              <button onClick={()=>setCheckedUids(new Set())} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-3 h-3"/></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading && Array.from({length:10}).map((_,i)=>(
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
                <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0"/>
                <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0"/>
                <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-100 animate-pulse rounded w-3/4"/>
                  <div className="h-2 bg-gray-100 animate-pulse rounded w-1/2"/>
                </div>
              </div>
            ))}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <AlertCircle className="w-7 h-7 text-red-400 mb-2"/>
                <p className="text-xs font-semibold text-gray-700 mb-1">Could not load emails</p>
                <p className="text-[10px] text-gray-400">{error}</p>
              </div>
            )}

            {!loading && !error && filtered.length===0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-7 h-7 text-gray-200 mb-2"/>
                <p className="text-xs text-gray-400">{search?"No results":"No emails"}</p>
              </div>
            )}

            {!loading && filtered.map(email=>{
              const isSelected = selected?.uid===email.uid;
              const isChecked = checkedUids.has(email.uid);
              return (
                <div key={email.uid}
                  className={`group flex items-center gap-0 border-b border-gray-50 cursor-pointer transition-colors
                    ${isSelected?"bg-blue-50":email.seen?"hover:bg-gray-50":"bg-blue-50/20 hover:bg-blue-50/40"}`}
                  onClick={()=>setSelected(email)}>

                  {/* Checkbox + Star */}
                  <div className="flex items-center gap-0.5 px-1.5 py-2 shrink-0" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>toggleCheck(email.uid)}
                      className={`w-4 h-4 rounded border transition-colors shrink-0 ${isChecked?"bg-blue-600 border-blue-600":"border-gray-300 hover:border-gray-500 bg-white"} flex items-center justify-center`}>
                      {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    <button onClick={()=>handleToggleStar(email.uid,email.starred)}
                      className={`p-0.5 ${email.starred?"text-amber-400":"text-gray-300 hover:text-amber-400"}`}>
                      <Star className={`w-3.5 h-3.5 ${email.starred?"fill-current":""}`}/>
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(email.from)} flex items-center justify-center text-white font-bold text-[10px] shrink-0 mr-2`}>
                    {senderInitial(email.from)}
                  </div>

                  {/* Content row */}
                  <div className="flex-1 min-w-0 py-2 pr-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xs truncate flex-1 ${email.seen?"text-gray-600":"text-gray-900 font-semibold"}`}>
                        {senderName(email.from)}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">{formatDate(email.date)}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[11px] truncate flex-1 ${email.seen?"text-gray-400":"text-gray-700 font-medium"}`}>
                        {email.subject}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!email.seen && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>}
                        {email.hasAttachment && <Paperclip className="w-2.5 h-2.5 text-gray-400"/>}
                      </div>
                    </div>
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
              onBack={()=>setSelected(null)}
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
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center px-8 bg-[#f8fafc]">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
              <Mail className="w-7 h-7 text-blue-400"/>
            </div>
            <h2 className="text-sm font-bold text-gray-800">Select an email to read</h2>
            <p className="text-xs text-gray-400 mt-0.5">Or compose a new message</p>
          </div>
        )}
      </div>

      {composing && (
        <ComposeModal
          defaultTo={composeDefaults.to}
          defaultCc={composeDefaults.cc}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          mode={composeDefaults.mode}
          onClose={()=>setComposing(false)}
          onSent={()=>{ if(activeFolderPath==="[Gmail]/Sent Mail") load(activeFolderPath); }}
          userEmail={userEmail}
        />
      )}
    </Layout>
  );
}
