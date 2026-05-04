import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Hash, Plus, X, Send, Smile, Paperclip,
  Search, Loader2, MessageSquare, Sparkles, MoreHorizontal, Trash2,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  AtSign, Bold, Italic, Underline, Link2, Pin, BookmarkPlus,
  Video, Phone, Settings, Maximize2, Flag, Calendar, Award,
  BarChart2, Image, List, AlignLeft, Strikethrough, Code,
  Clock, Users, Zap,
} from "lucide-react";

const BASE = "/api";
const WS_BASE = typeof window !== "undefined"
  ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
  : "";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];
const GIF_OPTIONS = ["🎉 Congrats!", "👋 Hello!", "🚀 Launched!", "✅ Done!", "🔥 On fire!", "💯 Perfect!", "😂 lol", "🎊 Celebrate!"];
const PRIORITY_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };

const ACCENT = "#7C5CFC";
const ACCENT_LIGHT = "#9D7FFF";
const ACCENT_GLOW = "rgba(124,92,252,0.18)";
const SIDEBAR_BG = "#13111C";
const SIDEBAR_HOVER = "rgba(255,255,255,0.06)";
const SIDEBAR_ACTIVE = "rgba(124,92,252,0.22)";
const MAIN_BG = "#F8F7FF";
const MSG_BG = "#FFFFFF";

const AVATAR_COLORS = [
  ["#7C5CFC", "#5B3FD8"], ["#2563EB", "#1D4ED8"], ["#DB2777", "#9D174D"],
  ["#D97706", "#B45309"], ["#059669", "#065F46"], ["#0891B2", "#0E7490"],
  ["#8B5CF6", "#6D28D9"], ["#DC2626", "#991B1B"],
];

function avatarGrad(s: string) {
  let n = 0; for (const c of s) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string) {
  const d = new Date(iso), now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

type Channel = { id: number; name: string; description: string; type: string };
type ChatMessage = {
  id: number; channel_id: number; user_email: string; user_name: string;
  content: string; attachment_name: string | null;
  created_at: string; reactions: { emoji: string; userEmail: string }[];
};

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function Avatar({ name, email, size = "md", showStatus = false, online = false }:
  { name: string; email: string; size?: "xs"|"sm"|"md"|"lg"; showStatus?: boolean; online?: boolean }) {
  const [c1, c2] = avatarGrad(email);
  const sz = { xs: 24, sm: 28, md: 32, lg: 40 }[size];
  const fs = { xs: 9, sm: 10, md: 11, lg: 14 }[size];
  const dotSz = { xs: 6, sm: 7, md: 9, lg: 10 }[size];
  return (
    <div style={{ position: "relative", width: sz, height: sz, flexShrink: 0 }}>
      <div style={{
        width: sz, height: sz, borderRadius: "50%",
        background: `linear-gradient(135deg,${c1},${c2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: fs,
        boxShadow: `0 2px 8px ${c1}55`,
      }}>
        {initials(name)}
      </div>
      {showStatus && <div style={{
        position: "absolute", bottom: 0, right: 0, width: dotSz, height: dotSz,
        borderRadius: "50%", background: online ? "#22C55E" : "#6B7280",
        border: `2px solid ${SIDEBAR_BG}`,
        boxShadow: online ? "0 0 6px #22C55E88" : "none",
      }}/>}
    </div>
  );
}

function ContentAvatar({ name, email }: { name: string; email: string }) {
  const [c1, c2] = avatarGrad(email);
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 11,
      boxShadow: `0 2px 8px ${c1}44`,
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Modal Base ──────────────────────────────── */
function ModalBase({ onClose, children, title, width = 400 }: {
  onClose: () => void; children: React.ReactNode; title: string; width?: number;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(13,11,28,0.65)",
      backdropFilter: "blur(6px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#FFFFFF", borderRadius: 16, padding: 28, width,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(124,92,252,0.12)",
        position: "relative",
        animation: "modalIn 0.18s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1035" }}>{title}</div>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 8,
            padding: "4px 6px", cursor: "pointer", color: "#6B7280", display: "flex",
          }}><X size={14}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInputStyle: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "9px 12px", fontSize: 13.5, boxSizing: "border-box",
  outline: "none", transition: "border-color 0.15s",
  fontFamily: "inherit", color: "#1A1035", background: "#F9F8FF",
};
const modalBtnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`,
  border: "none", borderRadius: 8, padding: "9px 18px",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
  boxShadow: `0 4px 14px ${ACCENT}44`,
  transition: "box-shadow 0.15s, transform 0.15s",
};
const modalBtnSecondary: React.CSSProperties = {
  background: "none", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "9px 18px", fontSize: 13, cursor: "pointer", color: "#6B7280",
};

/* ─── Poll Modal ──────────────────────────────── */
function PollModal({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const submit = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    const text = `📊 Poll: ${question}\n${options.filter(o => o.trim()).map((o, i) => `  ${["1️⃣","2️⃣","3️⃣","4️⃣"][i]} ${o}`).join("\n")}`;
    onSend(text); onClose();
  };
  return (
    <ModalBase onClose={onClose} title="📊 Create a Poll" width={400}>
      <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What's your question?"
        style={{ ...modalInputStyle, marginBottom: 12 }}/>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 28, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
            {["1️⃣","2️⃣","3️⃣","4️⃣"][i]}
          </div>
          <input value={opt} onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
            placeholder={`Option ${i + 1}`} style={{ ...modalInputStyle, flex: 1 }}/>
          {i >= 2 && <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: "0 4px" }}><X size={14}/></button>}
        </div>
      ))}
      {options.length < 4 && (
        <button onClick={() => setOptions(prev => [...prev, ""])}
          style={{ background: "none", border: "1.5px dashed #D1D5DB", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, color: "#9CA3AF", cursor: "pointer", marginBottom: 16, width: "100%", fontFamily: "inherit" }}>
          + Add option
        </button>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onClose} style={modalBtnSecondary}>Cancel</button>
        <button onClick={submit} style={modalBtnPrimary}>Send Poll</button>
      </div>
    </ModalBase>
  );
}

/* ─── Meet Now Modal ──────────────────────────── */
function MeetModal({ channelName, onClose, onSend }: { channelName: string; onClose: () => void; onSend: (text: string) => void }) {
  const link = `${window.location.origin}/meet/${Math.random().toString(36).slice(2, 8)}`;
  return (
    <ModalBase onClose={onClose} title="📹 Meet Now" width={380}>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Start an instant meeting in <b>#{channelName}</b></div>
      <div style={{
        background: "linear-gradient(135deg,#F3F0FF,#EDE9FE)", borderRadius: 10,
        padding: "12px 14px", fontSize: 12.5, color: ACCENT,
        fontFamily: "monospace", wordBreak: "break-all", marginBottom: 16,
        border: `1.5px solid ${ACCENT}22`,
      }}>{link}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={modalBtnSecondary}>Cancel</button>
        <button onClick={() => { onSend(`📹 Meeting started! Join here: ${link}`); onClose(); }}
          style={{ ...modalBtnPrimary, display: "flex", alignItems: "center", gap: 6 }}>
          <Video size={13}/> Start Meeting
        </button>
      </div>
    </ModalBase>
  );
}

/* ─── Schedule Modal ──────────────────────────── */
function ScheduleModal({ onClose, onSchedule }: { onClose: () => void; onSchedule: (dt: string) => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  return (
    <ModalBase onClose={onClose} title="📅 Schedule Send" width={320}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={modalInputStyle}/>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Time</label>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={modalInputStyle}/>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={modalBtnSecondary}>Cancel</button>
        <button onClick={() => { onSchedule(`${date} at ${time}`); onClose(); }} style={modalBtnPrimary}>Schedule</button>
      </div>
    </ModalBase>
  );
}

/* ─── Praise Modal ────────────────────────────── */
const PRAISE_BADGES = [
  { emoji: "🏆", label: "Champion" }, { emoji: "💡", label: "Innovator" },
  { emoji: "🎯", label: "Goal Crusher" }, { emoji: "🤝", label: "Team Player" },
  { emoji: "⭐", label: "Star" }, { emoji: "🚀", label: "Go-Getter" },
];
function PraiseModal({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const [badge, setBadge] = useState(PRAISE_BADGES[0]);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  return (
    <ModalBase onClose={onClose} title="🏆 Send Praise" width={400}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PRAISE_BADGES.map(b => (
          <button key={b.label} onClick={() => setBadge(b)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "10px 14px", borderRadius: 12,
            border: badge.label === b.label ? `2px solid ${ACCENT}` : "1.5px solid #E5E7EB",
            background: badge.label === b.label ? `linear-gradient(135deg,#F3F0FF,#EDE9FE)` : "#F9FAFB",
            cursor: "pointer", transition: "all 0.15s",
            boxShadow: badge.label === b.label ? `0 4px 14px ${ACCENT}22` : "none",
          }}>
            <span style={{ fontSize: 24 }}>{b.emoji}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.label === b.label ? ACCENT : "#6B7280" }}>{b.label}</span>
          </button>
        ))}
      </div>
      <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@recipient name"
        style={{ ...modalInputStyle, marginBottom: 10 }}/>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a personal note..." rows={2}
        style={{ ...modalInputStyle, resize: "none", marginBottom: 16 }}/>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={modalBtnSecondary}>Cancel</button>
        <button onClick={() => { onSend(`${badge.emoji} Praise for ${recipient || "the team"} — ${badge.label}!${note ? "\n" + note : ""}`); onClose(); }}
          style={modalBtnPrimary}>Send Praise ✨</button>
      </div>
    </ModalBase>
  );
}

/* ─── Main Chat Component ─────────────────────── */
const isPopOut = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("popout") === "true";

export default function Chat() {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = user?.full_name || userEmail.split("@")[0];

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showMeet, setShowMeet] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPraise, setShowPraise] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [search, setSearch] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);
  const [priority, setPriority] = useState<"none"|"high"|"medium"|"low">("none");
  const [scheduledFor, setScheduledFor] = useState<string|null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { apiFetch("/chat/channels").then(setChannels).catch(() => {}); }, []);
  useEffect(() => { if (channels.length > 0 && !activeChannel) setActiveChannel(channels[0]); }, [channels]);

  useEffect(() => {
    if (!activeChannel || !userEmail) return;
    setMessages([]); setLoading(true); setConnecting(true);
    setOnlineUsers(new Set()); setTypingUsers([]);
    apiFetch(`/chat/${activeChannel.id}/messages`)
      .then(msgs => { setMessages(msgs); setLoading(false); setTimeout(scrollToBottom, 50); })
      .catch(() => setLoading(false));
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const wsUrl = `${WS_BASE}/api/chat-ws?channel=${activeChannel.id}&user=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setConnecting(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, { ...data, reactions: data.reactions || [] }]);
        setTimeout(scrollToBottom, 50);
      }
      if (data.type === "typing") {
        setTypingUsers(prev => prev.includes(data.userName) ? prev : [...prev, data.userName]);
        setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== data.userName)), 3000);
      }
      if (data.type === "online") setOnlineUsers(prev => new Set([...prev, data.userEmail]));
      if (data.type === "offline") setOnlineUsers(prev => { const n = new Set(prev); n.delete(data.userEmail); return n; });
      if (data.type === "reaction") {
        setMessages(prev => prev.map(m => {
          if (m.id !== data.messageId) return m;
          const has = m.reactions.find(r => r.emoji === data.emoji && r.userEmail === data.userEmail);
          return { ...m, reactions: has ? m.reactions.filter(r => !(r.emoji === data.emoji && r.userEmail === data.userEmail)) : [...m.reactions, { emoji: data.emoji, userEmail: data.userEmail }] };
        }));
      }
    };
    ws.onclose = () => setConnecting(false);
    return () => { ws.close(); };
  }, [activeChannel?.id, userEmail]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const prefix = priority !== "none" ? `🚩 [${priority.toUpperCase()} PRIORITY] ` : "";
    const suffix = scheduledFor ? ` [Scheduled for ${scheduledFor}]` : "";
    wsRef.current.send(JSON.stringify({ type: "message", content: prefix + text.trim() + suffix }));
    setInput(""); setShowEmoji(false); setShowGif(false); setPriority("none"); setScheduledFor(null);
  };

  const sendTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "typing" }));
  };

  const handleReact = (messageId: number, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "reaction", messageId, emoji }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendMessage(`📎 ${file.name}`);
    e.target.value = "";
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const ch = await apiFetch("/chat/channels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newChannelName, description: newChannelDesc }) });
      setChannels(prev => [...prev, ch]);
      setActiveChannel(ch);
      setNewChannelName(""); setNewChannelDesc(""); setShowNewChannel(false);
    } catch {}
  };

  const handleDeleteMessage = async (msgId: number) => {
    await apiFetch(`/chat/messages/${msgId}?userEmail=${encodeURIComponent(userEmail)}`, { method: "DELETE" });
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const groupedReactions = (reactions: { emoji: string; userEmail: string }[]) => {
    const map: Record<string, string[]> = {};
    for (const r of reactions) { if (!map[r.emoji]) map[r.emoji] = []; map[r.emoji].push(r.userEmail); }
    return map;
  };

  const filteredMessages = search.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(search.toLowerCase()) || m.user_name.toLowerCase().includes(search.toLowerCase()))
    : messages;

  const dayGroups: { day: string; msgs: ChatMessage[] }[] = [];
  for (const msg of filteredMessages) {
    const day = formatDay(msg.created_at);
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.day === day) last.msgs.push(msg);
    else dayGroups.push({ day, msgs: [msg] });
  }

  const allOnline = [userEmail, ...[...onlineUsers].filter(e => e !== userEmail)];

  const popOut = () => {
    const url = window.location.href.split("?")[0] + "?popout=true";
    window.open(url, "chat-popout", "width=1100,height=720,resizable=yes,scrollbars=yes");
  };

  const chatContent = (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes msgIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spinAnim { to { transform:rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .ft-sidebar { width:264px; min-width:264px; transition:width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1); overflow:hidden; }
        .ft-sidebar.collapsed { width:0; min-width:0; }
        .ft-sidebar-inner { width:264px; }

        .ft-ch-btn { transition:background 0.13s, color 0.13s; border-radius:8px; }
        .ft-ch-btn:hover { background:${SIDEBAR_HOVER} !important; }
        .ft-ch-btn.active {
          background:${SIDEBAR_ACTIVE} !important;
          box-shadow: inset 3px 0 0 ${ACCENT};
        }

        .ft-msg-row { transition:background 0.1s; border-radius:10px; }
        .ft-msg-row:hover { background:rgba(124,92,252,0.04); }

        .ft-input-wrap { transition:border-color 0.18s, box-shadow 0.18s; }
        .ft-input-wrap.focused { border-color:${ACCENT} !important; box-shadow:0 0 0 3px ${ACCENT_GLOW} !important; }

        .ft-scrollbar::-webkit-scrollbar { width:5px; }
        .ft-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .ft-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:99px; }
        .ft-scrollbar::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.22); }

        .ft-msg-scrollbar::-webkit-scrollbar { width:5px; }
        .ft-msg-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .ft-msg-scrollbar::-webkit-scrollbar-thumb { background:#E0DBFF; border-radius:99px; }
        .ft-msg-scrollbar::-webkit-scrollbar-thumb:hover { background:#C4B8FF; }

        .ft-reaction { transition:background 0.12s, transform 0.12s; }
        .ft-reaction:hover { background:#EDE9FE !important; transform:scale(1.08); }

        .ft-action-btn { transition:background 0.1s, color 0.1s; }
        .ft-action-btn:hover { background:rgba(124,92,252,0.1) !important; color:${ACCENT} !important; }

        .ft-tool-btn { transition:background 0.12s, color 0.12s; }
        .ft-tool-btn:hover { background:rgba(124,92,252,0.06) !important; color:${ACCENT} !important; }
        .ft-tool-btn.active-tool { background:rgba(124,92,252,0.12) !important; color:${ACCENT} !important; }

        .ft-dot { animation:bounce 1.3s infinite; display:inline-block; }
        .ft-dot:nth-child(2) { animation-delay:0.16s; }
        .ft-dot:nth-child(3) { animation-delay:0.32s; }

        .ft-skeleton { background:linear-gradient(90deg,#EEEAF8 25%,#E5E0F5 50%,#EEEAF8 75%); background-size:800px 100%; animation:shimmer 1.5s infinite; border-radius:6px; }

        .ft-icon-btn { transition:background 0.12s, color 0.12s; border-radius:8px; }
        .ft-icon-btn:hover { background:rgba(124,92,252,0.1) !important; color:${ACCENT} !important; }

        .ft-send-btn { transition:background 0.15s, box-shadow 0.15s, transform 0.12s; }
        .ft-send-btn:hover:not(:disabled) { box-shadow:0 4px 16px ${ACCENT}55 !important; transform:scale(1.06); }
        .ft-send-btn:active:not(:disabled) { transform:scale(0.96); }

        .ft-msg-anim { animation:msgIn 0.2s ease; }

        .ft-header-btn:hover { background:rgba(124,92,252,0.1) !important; color:${ACCENT} !important; }
      `}</style>

      <div style={{ display: "flex", height: isPopOut ? "100vh" : "calc(100vh - 48px)", background: MAIN_BG, overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <div className={`ft-sidebar${sidebarOpen ? "" : " collapsed"}`}
          style={{
            background: SIDEBAR_BG,
            display: "flex", flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.04)",
          }}>
          <div className="ft-sidebar-inner" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* Header */}
            <div style={{
              padding: "14px 12px 10px",
              flexShrink: 0,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.02)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 14px ${ACCENT}55`,
                }}>
                  <Zap size={16} color="#fff"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>FlowTalk</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Team Communication</div>
                </div>
                <button onClick={() => setSidebarOpen(false)} style={{
                  background: "rgba(255,255,255,0.06)", border: "none", padding: "5px 6px",
                  cursor: "pointer", color: "rgba(255,255,255,0.4)", borderRadius: 7, display: "flex",
                }} title="Collapse">
                  <PanelLeftClose size={13}/>
                </button>
              </div>
              <div style={{
                marginTop: 12, display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.06)", borderRadius: 8,
                padding: "7px 10px", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Search size={12} color="rgba(255,255,255,0.35)"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12.5, color: "#fff", minWidth: 0, fontFamily: "inherit" }}/>
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={11} color="rgba(255,255,255,0.4)"/></button>}
              </div>
            </div>

            {/* Nav */}
            <div className="ft-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 8px 0" }}>

              {/* Channels section */}
              <div style={{ display: "flex", alignItems: "center", padding: "8px 6px 5px" }}>
                <div onClick={() => setChannelsOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, cursor: "pointer" }}>
                  {channelsOpen
                    ? <ChevronDown size={11} color="rgba(255,255,255,0.4)"/>
                    : <ChevronRight size={11} color="rgba(255,255,255,0.4)"/>}
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Channels</span>
                </div>
                <button onClick={e => { e.stopPropagation(); setShowNewChannel(true); }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", padding: "3px 4px", borderRadius: 5 }}
                  title="Add channel">
                  <Plus size={12}/>
                </button>
              </div>

              {channelsOpen && channels.map(ch => {
                const active = activeChannel?.id === ch.id;
                return (
                  <button key={ch.id} onClick={() => setActiveChannel(ch)}
                    className={`ft-ch-btn${active ? " active" : ""}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", border: "none",
                      background: active ? SIDEBAR_ACTIVE : "transparent",
                      cursor: "pointer", marginBottom: 2,
                    }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: active ? `linear-gradient(135deg,${ACCENT}33,${ACCENT}22)` : "rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: active ? `1px solid ${ACCENT}44` : "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <Hash size={12} color={active ? ACCENT_LIGHT : "rgba(255,255,255,0.4)"}/>
                    </div>
                    <span style={{
                      flex: 1, textAlign: "left", fontSize: 13, fontWeight: active ? 700 : 400,
                      color: active ? "#fff" : "rgba(255,255,255,0.6)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{ch.name}</span>
                  </button>
                );
              })}

              {showNewChannel && (
                <div style={{ margin: "4px 4px 8px", padding: 12, background: "rgba(124,92,252,0.08)", borderRadius: 10, border: `1px solid ${ACCENT}22` }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT_LIGHT, marginBottom: 8 }}>Create a Channel</div>
                  <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateChannel()} placeholder="Channel name" autoFocus
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 9px", fontSize: 12.5, color: "#fff", marginBottom: 6, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}/>
                  <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Description (optional)"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 9px", fontSize: 12.5, color: "#fff", marginBottom: 8, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}/>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={handleCreateChannel}
                      style={{ flex: 1, background: `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`, border: "none", borderRadius: 6, padding: "6px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                      Create
                    </button>
                    <button onClick={() => setShowNewChannel(false)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, padding: "6px 9px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center" }}>
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              )}

              {/* Members section */}
              <button onClick={() => setMembersOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 5, padding: "12px 6px 5px", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>
                {membersOpen ? <ChevronDown size={11} color="rgba(255,255,255,0.4)"/> : <ChevronRight size={11} color="rgba(255,255,255,0.4)"/>}
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", flex: 1, textAlign: "left" }}>Members</span>
                <span style={{ fontSize: 10, color: ACCENT_LIGHT, background: `${ACCENT}22`, borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>{allOnline.length}</span>
              </button>

              {membersOpen && allOnline.map(email => {
                const name = email === userEmail ? userName : email.split("@")[0];
                const isMe = email === userEmail;
                return (
                  <div key={email} className="ft-ch-btn" style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 8px", borderRadius: 8, marginBottom: 2 }}>
                    <Avatar name={name} email={email} size="sm" showStatus online/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: isMe ? "#fff" : "rgba(255,255,255,0.65)", fontWeight: isMe ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                        {isMe && <span style={{ fontSize: 9.5, color: ACCENT_LIGHT, background: `${ACCENT}22`, borderRadius: 4, padding: "1px 5px", marginLeft: 5, fontWeight: 700 }}>You</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ height: 14 }}/>
            </div>

            {/* User footer */}
            <div style={{
              padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
              background: "rgba(0,0,0,0.25)",
            }}>
              <Avatar name={userName} email={userEmail} size="sm" showStatus online/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
                <div style={{ fontSize: 10, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", flexShrink: 0, boxShadow: "0 0 4px #22C55E" }}/>
                  Available
                </div>
              </div>
              <button style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "5px 6px", borderRadius: 7, display: "flex" }}
                title="Settings">
                <Settings size={13}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: MAIN_BG }}>
          {!activeChannel ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 18px",
                  boxShadow: `0 8px 32px ${ACCENT}44`,
                }}>
                  <MessageSquare size={32} color="#fff"/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1035", marginBottom: 6 }}>Select a channel</div>
                <div style={{ fontSize: 13.5, color: "#9CA3AF" }}>Choose a channel to start chatting</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Channel Header ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
                height: 52, borderBottom: "1px solid rgba(124,92,252,0.1)",
                background: MSG_BG, flexShrink: 0,
                boxShadow: "0 2px 12px rgba(124,92,252,0.06)",
              }}>
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", padding: "5px 7px", borderRadius: 7 }}
                    title="Open sidebar">
                    <PanelLeftOpen size={15}/>
                  </button>
                )}

                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `linear-gradient(135deg,${ACCENT}18,${ACCENT}0C)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${ACCENT}22`,
                }}>
                  <Hash size={14} color={ACCENT}/>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#1A1035", letterSpacing: "-0.02em" }}>{activeChannel.name}</span>
                    {connecting && <Loader2 size={12} color={ACCENT} style={{ animation: "spinAnim 1s linear infinite" }}/>}
                    {activeChannel.description && (
                      <>
                        <span style={{ color: "#E0DBFF", fontSize: 14 }}>·</span>
                        <span style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{activeChannel.description}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginRight: 8, padding: "4px 10px", background: "rgba(34,197,94,0.08)", borderRadius: 20, border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 5px #22C55E" }}/>
                    <span style={{ fontSize: 11.5, color: "#059669", fontWeight: 700 }}>{allOnline.length} online</span>
                  </div>
                  {[
                    { icon: <Video size={15}/>, title: "Meet now", onClick: () => setShowMeet(true) },
                    { icon: <Phone size={15}/>, title: "Call" },
                    { icon: <Search size={15}/>, title: "Search in channel" },
                    ...(!isPopOut ? [{ icon: <Maximize2 size={15}/>, title: "Pop out", onClick: popOut }] : []),
                    { icon: <MoreHorizontal size={15}/>, title: "More" },
                  ].map((btn, i) => (
                    <button key={i} onClick={(btn as any).onClick} title={btn.title}
                      className="ft-icon-btn ft-header-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "6px 7px", display: "flex", transition: "all 0.12s" }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="ft-msg-scrollbar" onClick={() => { setShowEmoji(false); setShowGif(false); }}
                style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px", display: "flex", flexDirection: "column", background: MAIN_BG }}>

                {loading && (
                  <div style={{ padding: "12px 0" }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 22 }}>
                        <div className="ft-skeleton" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }}/>
                        <div style={{ flex: 1 }}>
                          <div className="ft-skeleton" style={{ height: 11, width: `${45 + i * 10}%`, marginBottom: 8, borderRadius: 6 }}/>
                          <div className="ft-skeleton" style={{ height: 10, width: `${30 + i * 7}%`, borderRadius: 6 }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 22,
                      background: `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 18, boxShadow: `0 12px 36px ${ACCENT}44`,
                    }}>
                      <Hash size={34} color="#fff"/>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1035", marginBottom: 8, letterSpacing: "-0.02em" }}>Welcome to #{activeChannel.name}!</div>
                    <div style={{ fontSize: 13.5, color: "#9CA3AF", maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>
                      {activeChannel.description || "This is the beginning of the conversation. Say hello! 👋"}
                    </div>
                  </div>
                )}

                {dayGroups.map(({ day, msgs }) => (
                  <div key={day}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 10px" }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,transparent,rgba(124,92,252,0.15))" }}/>
                      <span style={{
                        fontSize: 11, color: ACCENT, fontWeight: 700,
                        padding: "3px 12px", whiteSpace: "nowrap",
                        background: `${ACCENT}0E`, borderRadius: 20,
                        border: `1px solid ${ACCENT}22`, letterSpacing: "0.02em",
                      }}>{day}</span>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left,transparent,rgba(124,92,252,0.15))" }}/>
                    </div>

                    {msgs.map((msg, i) => {
                      const prevMsg = i > 0 ? msgs[i - 1] : null;
                      const isGrouped = !!(prevMsg && prevMsg.user_email === msg.user_email &&
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000));
                      const isOwn = msg.user_email === userEmail;
                      const reactions = groupedReactions(msg.reactions);
                      const hasReactions = Object.keys(reactions).length > 0;

                      return (
                        <div key={msg.id} className="ft-msg-row ft-msg-anim"
                          style={{
                            display: "flex", gap: 12,
                            padding: isGrouped ? "2px 10px 2px 12px" : "10px 10px 3px 12px",
                            borderRadius: 10, position: "relative", cursor: "default",
                          }}
                          onMouseEnter={() => setHoveredMsg(msg.id)}
                          onMouseLeave={() => setHoveredMsg(null)}>

                          <div style={{ width: 34, flexShrink: 0, paddingTop: isGrouped ? 0 : 2 }}>
                            {!isGrouped
                              ? <ContentAvatar name={msg.user_name} email={msg.user_email}/>
                              : <span style={{ display: "block", fontSize: 9.5, color: "#C4B8FF", textAlign: "right", marginTop: 6, userSelect: "none", opacity: hoveredMsg === msg.id ? 1 : 0, transition: "opacity 0.1s" }}>{formatTime(msg.created_at)}</span>}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!isGrouped && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#1A1035", letterSpacing: "-0.01em" }}>{msg.user_name}</span>
                                {isOwn && (
                                  <span style={{ fontSize: 9.5, color: ACCENT, background: `${ACCENT}12`, borderRadius: 5, padding: "1px 6px", fontWeight: 700 }}>You</span>
                                )}
                                <span style={{ fontSize: 11, color: "#C4B8FF", fontWeight: 500 }}>{formatTime(msg.created_at)}</span>
                              </div>
                            )}
                            <div style={{
                              fontSize: 13.5, color: "#2D1F5E", lineHeight: 1.6,
                              wordBreak: "break-word", whiteSpace: "pre-wrap", fontWeight: 400,
                            }}>{msg.content}</div>
                            {msg.attachment_name && (
                              <div style={{
                                marginTop: 6, display: "inline-flex", alignItems: "center", gap: 7,
                                background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`,
                                borderRadius: 8, padding: "5px 12px", fontSize: 12.5, color: ACCENT,
                              }}>
                                <Paperclip size={12}/>{msg.attachment_name}
                              </div>
                            )}
                            {hasReactions && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {Object.entries(reactions).map(([emoji, users]) => {
                                  const mine = users.includes(userEmail);
                                  return (
                                    <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="ft-reaction"
                                      style={{
                                        display: "flex", alignItems: "center", gap: 5, padding: "3px 9px",
                                        borderRadius: 20,
                                        background: mine ? `${ACCENT}12` : "rgba(255,255,255,0.7)",
                                        border: mine ? `1.5px solid ${ACCENT}44` : "1.5px solid #E5E0FF",
                                        cursor: "pointer", fontSize: 14, transition: "all 0.12s",
                                        boxShadow: mine ? `0 2px 8px ${ACCENT}22` : "none",
                                      }}>
                                      {emoji}
                                      <span style={{ fontSize: 11.5, fontWeight: 700, color: mine ? ACCENT : "#7C6EAF" }}>{users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {hoveredMsg === msg.id && (
                            <div style={{
                              position: "absolute", top: -22, right: 10,
                              display: "flex", alignItems: "center", gap: 1,
                              background: "#FFFFFF", border: "1.5px solid #E5E0FF",
                              borderRadius: 10, padding: "4px 6px",
                              boxShadow: "0 8px 24px rgba(124,92,252,0.16)",
                              zIndex: 20,
                            }}>
                              {QUICK_REACTIONS.slice(0, 6).map(emoji => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="ft-action-btn"
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "3px 4px", borderRadius: 7, transition: "all 0.12s" }}>
                                  {emoji}
                                </button>
                              ))}
                              <div style={{ width: 1, height: 18, background: "#E5E0FF", margin: "0 3px" }}/>
                              {[
                                { icon: <AtSign size={12}/>, title: "Mention" },
                                { icon: <Pin size={12}/>, title: "Pin" },
                                { icon: <BookmarkPlus size={12}/>, title: "Bookmark" },
                              ].map(({ icon, title }) => (
                                <button key={title} title={title} className="ft-action-btn"
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: 7, color: "#9CA3AF", display: "flex", transition: "all 0.12s" }}>
                                  {icon}
                                </button>
                              ))}
                              {isOwn && (
                                <>
                                  <div style={{ width: 1, height: 18, background: "#E5E0FF", margin: "0 3px" }}/>
                                  <button onClick={() => handleDeleteMessage(msg.id)} title="Delete" className="ft-action-btn"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: 7, color: "#F87171", display: "flex", transition: "all 0.12s" }}>
                                    <Trash2 size={12}/>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {typingUsers.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px" }}>
                    <div style={{ width: 34, flexShrink: 0 }}/>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.8)", borderRadius: 20, padding: "5px 12px", border: "1px solid #E5E0FF" }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {[1,2,3].map(n => (
                          <span key={n} className="ft-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, display: "inline-block" }}/>
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                        {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* ── Message Input ── */}
              <div style={{ padding: "8px 16px 14px", background: MAIN_BG, flexShrink: 0 }}>

                {/* Emoji picker */}
                {showEmoji && (
                  <div style={{ marginBottom: 8, padding: 12, background: "#fff", border: "1.5px solid #E5E0FF", borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 4, boxShadow: "0 8px 24px rgba(124,92,252,0.12)" }}>
                    {QUICK_REACTIONS.map(e => (
                      <button key={e} onClick={() => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: "5px 7px", borderRadius: 8, transition: "background 0.1s" }}
                        onMouseEnter={el => (el.currentTarget.style.background = "#F3F0FF")}
                        onMouseLeave={el => (el.currentTarget.style.background = "none")}>{e}</button>
                    ))}
                  </div>
                )}

                {/* GIF picker */}
                {showGif && (
                  <div style={{ marginBottom: 8, padding: 12, background: "#fff", border: "1.5px solid #E5E0FF", borderRadius: 12, boxShadow: "0 8px 24px rgba(124,92,252,0.12)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>GIF Reactions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {GIF_OPTIONS.map(g => (
                        <button key={g} onClick={() => { sendMessage(g); setShowGif(false); }}
                          style={{ background: "#F3F0FF", border: `1px solid ${ACCENT}22`, borderRadius: 8, padding: "7px 13px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: ACCENT, transition: "all 0.12s" }}
                          onMouseEnter={el => { el.currentTarget.style.background = ACCENT; el.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={el => { el.currentTarget.style.background = "#F3F0FF"; el.currentTarget.style.color = ACCENT; }}>{g}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Priority + schedule indicator */}
                {(priority !== "none" || scheduledFor) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "5px 12px", background: "#FFF8F0", borderRadius: 8, fontSize: 12.5, border: "1px solid #FDE68A" }}>
                    {priority !== "none" && <span style={{ color: PRIORITY_COLORS[priority], fontWeight: 700 }}>🚩 {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority</span>}
                    {scheduledFor && <span style={{ color: "#92400E" }}>📅 Scheduled for {scheduledFor}</span>}
                    <button onClick={() => { setPriority("none"); setScheduledFor(null); }} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: "#D1D5DB", display: "flex" }}><X size={12}/></button>
                  </div>
                )}

                <div className={`ft-input-wrap${inputFocused ? " focused" : ""}`}
                  style={{
                    background: "#FFFFFF", border: "1.5px solid #E5E0FF",
                    borderRadius: 12, overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(124,92,252,0.06)",
                  }}>

                  {/* Formatting toolbar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "5px 10px", borderBottom: "1px solid #F0EBFF" }}>
                    {[
                      { icon: <Bold size={13}/>, title: "Bold", action: () => setInput(p => `**${p}**`) },
                      { icon: <Italic size={13}/>, title: "Italic", action: () => setInput(p => `_${p}_`) },
                      { icon: <Underline size={13}/>, title: "Underline", action: () => setInput(p => `<u>${p}</u>`) },
                      { icon: <Strikethrough size={13}/>, title: "Strikethrough", action: () => setInput(p => `~~${p}~~`) },
                      { icon: <Code size={13}/>, title: "Code", action: () => setInput(p => `\`${p}\``) },
                      { icon: <Link2 size={13}/>, title: "Link" },
                      { icon: <List size={13}/>, title: "Bullet list", action: () => setInput(p => `• ${p}`) },
                      { icon: <AlignLeft size={13}/>, title: "Quote", action: () => setInput(p => `> ${p}`) },
                    ].map(({ icon, title, action }) => (
                      <button key={title} onClick={action} title={title} className="ft-action-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#A78BFA", display: "flex", transition: "all 0.12s" }}>
                        {icon}
                      </button>
                    ))}
                  </div>

                  {/* Text area */}
                  <div style={{ display: "flex", alignItems: "flex-end", padding: "8px 10px 8px" }}>
                    <textarea ref={inputRef} value={input}
                      onChange={e => { setInput(e.target.value); sendTyping(); }}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                      placeholder={`Message #${activeChannel.name}…`} rows={1}
                      style={{
                        flex: 1, background: "none", border: "none", outline: "none",
                        fontSize: 14, color: "#1A1035", resize: "none",
                        fontFamily: "inherit", lineHeight: 1.55, maxHeight: 130,
                        overflow: "auto", padding: 0,
                      }}/>
                    <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="ft-send-btn"
                      style={{
                        marginLeft: 10, width: 34, height: 34, borderRadius: 9, border: "none",
                        background: input.trim()
                          ? `linear-gradient(135deg,${ACCENT},${ACCENT_LIGHT})`
                          : "#EDE9FE",
                        color: input.trim() ? "#fff" : "#C4B8FF",
                        cursor: input.trim() ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: input.trim() ? `0 4px 14px ${ACCENT}44` : "none",
                      }}>
                      <Send size={14}/>
                    </button>
                  </div>

                  {/* Bottom toolbar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "5px 10px 6px", borderTop: "1px solid #F0EBFF", flexWrap: "wrap" }}>
                    {[
                      { icon: <Smile size={14}/>, label: "Emoji", onClick: () => setShowEmoji(v => !v), active: showEmoji },
                      { icon: <Image size={14}/>, label: "GIF", onClick: () => { setShowGif(v => !v); setShowEmoji(false); }, active: showGif },
                      { icon: <BarChart2 size={14}/>, label: "Poll", onClick: () => setShowPoll(true) },
                      { icon: <Flag size={14}/>, label: "Priority", onClick: () => setPriority(p => p === "none" ? "high" : p === "high" ? "medium" : p === "medium" ? "low" : "none"), active: priority !== "none", color: priority !== "none" ? PRIORITY_COLORS[priority] : undefined },
                      { icon: <Award size={14}/>, label: "Praise", onClick: () => setShowPraise(true) },
                      { icon: <AtSign size={14}/>, label: "Mention", onClick: () => { setInput(p => p + "@"); inputRef.current?.focus(); } },
                      { icon: <Clock size={14}/>, label: "Schedule", onClick: () => setShowSchedule(true), active: !!scheduledFor },
                      { icon: <Paperclip size={14}/>, label: "Attach", onClick: () => fileInputRef.current?.click() },
                      { icon: <Video size={14}/>, label: "Meet", onClick: () => setShowMeet(true) },
                      { icon: <Sparkles size={14}/>, label: "AI", color: ACCENT },
                    ].map(({ icon, label, onClick, active, color }) => (
                      <button key={label} onClick={onClick} title={label}
                        className={`ft-tool-btn${active ? " active-tool" : ""}`}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          padding: "4px 8px", borderRadius: 7,
                          color: color || (active ? ACCENT : "#A78BFA"),
                          display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          transition: "all 0.12s",
                        }}>
                        {icon}<span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange}/>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showPoll && <PollModal onClose={() => setShowPoll(false)} onSend={sendMessage}/>}
      {showMeet && activeChannel && <MeetModal channelName={activeChannel.name} onClose={() => setShowMeet(false)} onSend={sendMessage}/>}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSchedule={dt => setScheduledFor(dt)}/>}
      {showPraise && <PraiseModal onClose={() => setShowPraise(false)} onSend={sendMessage}/>}
    </>
  );

  if (isPopOut) return <div style={{ height: "100vh", overflow: "hidden" }}>{chatContent}</div>;
  return <Layout>{chatContent}</Layout>;
}
