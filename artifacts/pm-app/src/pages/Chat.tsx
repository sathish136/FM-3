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
  Clock, Users,
} from "lucide-react";

const BASE = "/api";
const WS_BASE = typeof window !== "undefined"
  ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
  : "";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];
const GIF_OPTIONS = ["🎉 Congrats!", "👋 Hello!", "🚀 Launched!", "✅ Done!", "🔥 On fire!", "💯 Perfect!", "😂 lol", "🎊 Celebrate!"];
const PRIORITY_COLORS: Record<string, string> = { high: "#a80000", medium: "#d97706", low: "#059669" };

const TEAMS_PURPLE = "#6264A7";
const SIDEBAR_BG = "#201F2E";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.14)";

const AVATAR_COLORS = [
  ["#6264A7", "#464775"], ["#2563EB", "#1D4ED8"], ["#DB2777", "#9D174D"],
  ["#D97706", "#B45309"], ["#059669", "#065F46"], ["#0891B2", "#0E7490"],
  ["#7C3AED", "#4C1D95"], ["#DC2626", "#991B1B"],
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
      <div style={{ width: sz, height: sz, borderRadius: "50%", background: `linear-gradient(135deg,${c1},${c2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: fs }}>
        {initials(name)}
      </div>
      {showStatus && <div style={{ position: "absolute", bottom: 0, right: 0, width: dotSz, height: dotSz, borderRadius: "50%", background: online ? "#92C353" : "#8A8886", border: `2px solid ${SIDEBAR_BG}` }}/>}
    </div>
  );
}

function ContentAvatar({ name, email }: { name: string; email: string }) {
  const [c1, c2] = avatarGrad(email);
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11 }}>
      {initials(name)}
    </div>
  );
}

/* ─── Poll UI ─────────────────────────────────── */
function PollModal({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const submit = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    const text = `📊 Poll: ${question}\n${options.filter(o => o.trim()).map((o, i) => `  ${["1️⃣","2️⃣","3️⃣","4️⃣"][i]} ${o}`).join("\n")}`;
    onSend(text); onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#242424", marginBottom: 14 }}>Create a poll</div>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question"
          style={{ width: "100%", border: "1px solid #c8c6c4", borderRadius: 4, padding: "7px 10px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" }}/>
        {options.map((opt, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input value={opt} onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
              placeholder={`Option ${i + 1}`}
              style={{ flex: 1, border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 10px", fontSize: 13, outline: "none" }}/>
            {i >= 2 && <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a8a8" }}><X size={14}/></button>}
          </div>
        ))}
        {options.length < 4 && (
          <button onClick={() => setOptions(prev => [...prev, ""])} style={{ background: "none", border: "1px dashed #c8c6c4", borderRadius: 4, padding: "5px 12px", fontSize: 12, color: "#605e5c", cursor: "pointer", marginBottom: 12, width: "100%" }}>
            + Add option
          </button>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#605e5c" }}>Cancel</button>
          <button onClick={submit} style={{ background: TEAMS_PURPLE, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Send poll</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Meet Now Modal ──────────────────────────── */
function MeetModal({ channelName, onClose, onSend }: { channelName: string; onClose: () => void; onSend: (text: string) => void }) {
  const link = `${window.location.origin}/meet/${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#242424", marginBottom: 6 }}>Meet now</div>
        <div style={{ fontSize: 13, color: "#605e5c", marginBottom: 16 }}>Start an instant meeting in #{channelName}</div>
        <div style={{ background: "#f5f5f5", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#242424", marginBottom: 16, wordBreak: "break-all" }}>{link}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#605e5c" }}>Cancel</button>
          <button onClick={() => { onSend(`📹 Meeting started! Join here: ${link}`); onClose(); }}
            style={{ background: TEAMS_PURPLE, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Video size={13}/> Start meeting
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Schedule Modal ──────────────────────────── */
function ScheduleModal({ onClose, onSchedule }: { onClose: () => void; onSchedule: (dt: string) => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#242424", marginBottom: 14 }}>Schedule send</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#605e5c", display: "block", marginBottom: 4 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 10px", fontSize: 13, boxSizing: "border-box", outline: "none" }}/>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#605e5c", display: "block", marginBottom: 4 }}>Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 10px", fontSize: 13, boxSizing: "border-box", outline: "none" }}/>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#605e5c" }}>Cancel</button>
          <button onClick={() => { onSchedule(`${date} at ${time}`); onClose(); }}
            style={{ background: TEAMS_PURPLE, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            Schedule
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#242424", marginBottom: 14 }}>Send praise</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {PRAISE_BADGES.map(b => (
            <button key={b.label} onClick={() => setBadge(b)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 12px", borderRadius: 8, border: badge.label === b.label ? `2px solid ${TEAMS_PURPLE}` : "1px solid #edebe9", background: badge.label === b.label ? "#ede9fe" : "#f5f5f5", cursor: "pointer" }}>
              <span style={{ fontSize: 22 }}>{b.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#605e5c" }}>{b.label}</span>
            </button>
          ))}
        </div>
        <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@recipient name"
          style={{ width: "100%", border: "1px solid #c8c6c4", borderRadius: 4, padding: "7px 10px", fontSize: 13, marginBottom: 8, boxSizing: "border-box", outline: "none" }}/>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." rows={2}
          style={{ width: "100%", border: "1px solid #c8c6c4", borderRadius: 4, padding: "7px 10px", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }}/>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #c8c6c4", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#605e5c" }}>Cancel</button>
          <button onClick={() => { onSend(`${badge.emoji} Praise for ${recipient || "the team"} — ${badge.label}!${note ? "\n" + note : ""}`); onClose(); }}
            style={{ background: TEAMS_PURPLE, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            Send praise
          </button>
        </div>
      </div>
    </div>
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
        .teams-sidebar { width: 260px; min-width: 260px; transition: width 0.2s ease, min-width 0.2s ease; overflow: hidden; }
        .teams-sidebar.collapsed { width: 0; min-width: 0; }
        .teams-sidebar-inner { width: 260px; }
        .teams-ch-btn { transition: background 0.1s; border-radius: 4px; }
        .teams-ch-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .teams-ch-btn.active { background: ${SIDEBAR_ACTIVE} !important; }
        .teams-msg-row:hover { background: #f5f5f5; }
        .teams-input-box:focus-within { border-color: ${TEAMS_PURPLE} !important; box-shadow: 0 0 0 1px ${TEAMS_PURPLE}33; }
        .teams-scrollbar::-webkit-scrollbar { width: 6px; }
        .teams-scrollbar::-webkit-scrollbar-thumb { background: #d1d1d1; border-radius: 99px; }
        .teams-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        .teams-reaction:hover { background: #edebe9 !important; transform: scale(1.05); }
        .teams-action-btn:hover { background: #edebe9 !important; }
        .teams-tool-btn { transition: background 0.1s, color 0.1s; }
        .teams-tool-btn:hover { background: #f0f0f0 !important; }
        .teams-tool-btn.active-tool { background: #ede9fe !important; color: ${TEAMS_PURPLE} !important; }
        @keyframes teams-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        .teams-dot { animation: teams-bounce 1.2s infinite; display: inline-block; }
        .teams-dot:nth-child(2) { animation-delay: 0.15s; }
        .teams-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes teams-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .teams-skeleton { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size: 800px 100%; animation: teams-shimmer 1.5s infinite; border-radius: 4px; }
        .teams-icon-btn { transition: background 0.1s; border-radius: 4px; }
        .teams-icon-btn:hover { background: #edebe9; }
      `}</style>

      <div style={{ display: "flex", height: isPopOut ? "100vh" : "calc(100vh - 48px)", background: "#f5f5f5", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <div className={`teams-sidebar${sidebarOpen ? "" : " collapsed"}`}
          style={{ background: SIDEBAR_BG, display: "flex", flexShrink: 0 }}>
          <div className="teams-sidebar-inner" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* Header */}
            <div style={{ padding: "12px 12px 8px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, flexShrink: 0, background: TEAMS_PURPLE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={15} color="#fff"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>FlowTalk</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Team Chat</div>
                </div>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "rgba(255,255,255,0.5)", borderRadius: 4, display: "flex" }} title="Collapse">
                  <PanelLeftClose size={14}/>
                </button>
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "5px 9px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Search size={12} color="rgba(255,255,255,0.5)"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12, color: "#fff", minWidth: 0 }}/>
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={11} color="rgba(255,255,255,0.5)"/></button>}
              </div>
            </div>

            {/* Nav */}
            <div className="teams-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "6px 6px 0" }}>
              {/* Channels */}
              <div style={{ display: "flex", alignItems: "center", padding: "6px 6px 4px" }}>
                <div onClick={() => setChannelsOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, cursor: "pointer" }}>
                  {channelsOpen ? <ChevronDown size={12} color="rgba(255,255,255,0.5)"/> : <ChevronRight size={12} color="rgba(255,255,255,0.5)"/>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Channels</span>
                </div>
                <button onClick={e => { e.stopPropagation(); setShowNewChannel(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", padding: 2, borderRadius: 3 }} title="Add channel"><Plus size={13}/></button>
              </div>

              {channelsOpen && channels.map(ch => {
                const active = activeChannel?.id === ch.id;
                return (
                  <button key={ch.id} onClick={() => setActiveChannel(ch)} className={`teams-ch-btn${active ? " active" : ""}`}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "none", background: active ? SIDEBAR_ACTIVE : "transparent", cursor: "pointer", marginBottom: 1 }}>
                    <Hash size={14} color={active ? "#fff" : "rgba(255,255,255,0.55)"}/>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#fff" : "rgba(255,255,255,0.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.name}</span>
                  </button>
                );
              })}

              {showNewChannel && (
                <div style={{ margin: "4px 4px 8px", padding: 10, background: "rgba(255,255,255,0.06)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 7 }}>Create a channel</div>
                  <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateChannel()} placeholder="Channel name" autoFocus
                    style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "#fff", marginBottom: 5, boxSizing: "border-box", outline: "none" }}/>
                  <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Description (optional)"
                    style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "#fff", marginBottom: 7, boxSizing: "border-box", outline: "none" }}/>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={handleCreateChannel} style={{ flex: 1, background: TEAMS_PURPLE, border: "none", borderRadius: 4, padding: "5px", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Create</button>
                    <button onClick={() => setShowNewChannel(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 4, padding: "5px 8px", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center" }}><X size={12}/></button>
                  </div>
                </div>
              )}

              {/* Members */}
              <button onClick={() => setMembersOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 4, padding: "10px 6px 4px", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                {membersOpen ? <ChevronDown size={12} color="rgba(255,255,255,0.5)"/> : <ChevronRight size={12} color="rgba(255,255,255,0.5)"/>}
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", flex: 1, textAlign: "left" }}>Members</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "1px 6px" }}>{allOnline.length}</span>
              </button>

              {membersOpen && allOnline.map(email => {
                const name = email === userEmail ? userName : email.split("@")[0];
                const isMe = email === userEmail;
                return (
                  <div key={email} className="teams-ch-btn" style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 4, marginBottom: 1 }}>
                    <Avatar name={name} email={email} size="sm" showStatus online/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: isMe ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: isMe ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}{isMe && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 5 }}>You</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ height: 12 }}/>
            </div>

            {/* User footer */}
            <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
              <Avatar name={userName} email={userEmail} size="sm" showStatus online/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#92C353", flexShrink: 0 }}/>Available
                </div>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, borderRadius: 4, display: "flex" }}><Settings size={14}/></button>
            </div>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#fff" }}>
          {!activeChannel ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <MessageSquare size={26} color={TEAMS_PURPLE}/>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#242424" }}>Select a channel</div>
                <div style={{ fontSize: 13, color: "#605e5c", marginTop: 4 }}>Choose a channel to start chatting</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Channel Header ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 48, borderBottom: "1px solid #edebe9", background: "#fff", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", display: "flex", padding: "4px 6px", borderRadius: 4 }} title="Open sidebar">
                    <PanelLeftOpen size={16}/>
                  </button>
                )}
                <Hash size={16} color={TEAMS_PURPLE}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#242424" }}>{activeChannel.name}</span>
                    {connecting && <Loader2 size={12} color="#605e5c" style={{ animation: "spin 1s linear infinite" }}/>}
                    {activeChannel.description && <>
                      <span style={{ color: "#d1d1d1", fontSize: 12 }}>|</span>
                      <span style={{ fontSize: 12, color: "#605e5c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{activeChannel.description}</span>
                    </>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 6, padding: "3px 8px", background: "#f5f5f5", borderRadius: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#92C353" }}/>
                    <span style={{ fontSize: 11, color: "#605e5c", fontWeight: 600 }}>{allOnline.length} online</span>
                  </div>
                  <button className="teams-icon-btn" onClick={() => setShowMeet(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", padding: "5px 7px", display: "flex" }} title="Meet now"><Video size={15}/></button>
                  <button className="teams-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", padding: "5px 7px", display: "flex" }} title="Call"><Phone size={15}/></button>
                  <button className="teams-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", padding: "5px 7px", display: "flex" }} title="Search in channel"><Search size={15}/></button>
                  {!isPopOut && (
                    <button className="teams-icon-btn" onClick={popOut} style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", padding: "5px 7px", display: "flex" }} title="Pop out to separate window">
                      <Maximize2 size={15}/>
                    </button>
                  )}
                  <button className="teams-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "#605e5c", padding: "5px 7px", display: "flex" }} title="More"><MoreHorizontal size={15}/></button>
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="teams-scrollbar" onClick={() => { setShowEmoji(false); setShowGif(false); }}
                style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", background: "#fff" }}>

                {loading && (
                  <div style={{ padding: "12px 0" }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <div className="teams-skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }}/>
                        <div style={{ flex: 1 }}>
                          <div className="teams-skeleton" style={{ height: 11, width: `${50 + i * 9}%`, marginBottom: 7 }}/>
                          <div className="teams-skeleton" style={{ height: 10, width: `${35 + i * 6}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Hash size={28} color={TEAMS_PURPLE}/>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#242424", marginBottom: 6 }}>Welcome to #{activeChannel.name}!</div>
                    <div style={{ fontSize: 13, color: "#605e5c", maxWidth: 320, textAlign: "center" }}>
                      {activeChannel.description || "This is the beginning of the conversation."}
                    </div>
                  </div>
                )}

                {dayGroups.map(({ day, msgs }) => (
                  <div key={day}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "#edebe9" }}/>
                      <span style={{ fontSize: 11, color: "#605e5c", fontWeight: 600, padding: "0 10px", whiteSpace: "nowrap" }}>{day}</span>
                      <div style={{ flex: 1, height: 1, background: "#edebe9" }}/>
                    </div>

                    {msgs.map((msg, i) => {
                      const prevMsg = i > 0 ? msgs[i - 1] : null;
                      const isGrouped = !!(prevMsg && prevMsg.user_email === msg.user_email &&
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000));
                      const isOwn = msg.user_email === userEmail;
                      const reactions = groupedReactions(msg.reactions);
                      const hasReactions = Object.keys(reactions).length > 0;

                      return (
                        <div key={msg.id} className="teams-msg-row"
                          style={{ display: "flex", gap: 10, padding: isGrouped ? "1px 8px 1px 10px" : "8px 8px 2px 10px", borderRadius: 4, position: "relative", cursor: "default" }}
                          onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>

                          <div style={{ width: 32, flexShrink: 0, paddingTop: isGrouped ? 0 : 2 }}>
                            {!isGrouped ? <ContentAvatar name={msg.user_name} email={msg.user_email}/>
                              : <span style={{ display: "block", fontSize: 9, color: "#a8a8a8", textAlign: "right", marginTop: 5, userSelect: "none" }}>{formatTime(msg.created_at)}</span>}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!isGrouped && (
                              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#242424" }}>{msg.user_name}</span>
                                {isOwn && <span style={{ fontSize: 10, color: TEAMS_PURPLE, fontWeight: 600 }}>You</span>}
                                <span style={{ fontSize: 11, color: "#a8a8a8" }}>{formatTime(msg.created_at)}</span>
                              </div>
                            )}
                            <div style={{ fontSize: 13.5, color: "#242424", lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                            {msg.attachment_name && (
                              <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 6, background: "#f0f0f0", border: "1px solid #e0e0e0", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#424242" }}>
                                <Paperclip size={11}/>{msg.attachment_name}
                              </div>
                            )}
                            {hasReactions && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                                {Object.entries(reactions).map(([emoji, users]) => {
                                  const mine = users.includes(userEmail);
                                  return (
                                    <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="teams-reaction"
                                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: mine ? "#ede9fe" : "#f5f5f5", border: mine ? `1px solid ${TEAMS_PURPLE}55` : "1px solid #e8e8e8", cursor: "pointer", fontSize: 13, transition: "all 0.1s" }}>
                                      {emoji}<span style={{ fontSize: 11, fontWeight: 600, color: mine ? TEAMS_PURPLE : "#605e5c" }}>{users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {hoveredMsg === msg.id && (
                            <div style={{ position: "absolute", top: -20, right: 8, display: "flex", alignItems: "center", gap: 1, background: "#fff", border: "1px solid #edebe9", borderRadius: 6, padding: "3px 5px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20 }}>
                              {QUICK_REACTIONS.slice(0, 6).map(emoji => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="teams-action-btn"
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 3px", borderRadius: 4 }}>{emoji}</button>
                              ))}
                              <div style={{ width: 1, height: 16, background: "#edebe9", margin: "0 3px" }}/>
                              <button title="Mention" className="teams-action-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 4, color: "#605e5c", display: "flex" }}><AtSign size={13}/></button>
                              <button title="Pin" className="teams-action-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 4, color: "#605e5c", display: "flex" }}><Pin size={13}/></button>
                              <button title="Bookmark" className="teams-action-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 4, color: "#605e5c", display: "flex" }}><BookmarkPlus size={13}/></button>
                              {isOwn && <>
                                <div style={{ width: 1, height: 16, background: "#edebe9", margin: "0 3px" }}/>
                                <button onClick={() => handleDeleteMessage(msg.id)} title="Delete" className="teams-action-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 4, color: "#a80000", display: "flex" }}><Trash2 size={13}/></button>
                              </>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {typingUsers.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px" }}>
                    <div style={{ width: 32, flexShrink: 0 }}/>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {[1,2,3].map(n => <span key={n} className="teams-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#605e5c", display: "inline-block" }}/>)}
                      </div>
                      <span style={{ fontSize: 12, color: "#605e5c" }}>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* ── Message Input ── */}
              <div style={{ padding: "6px 14px 12px", background: "#fff", flexShrink: 0 }}>
                {/* Emoji picker */}
                {showEmoji && (
                  <div style={{ marginBottom: 6, padding: 10, background: "#fff", border: "1px solid #edebe9", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    {QUICK_REACTIONS.map(e => (
                      <button key={e} onClick={() => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "4px 6px", borderRadius: 4 }}
                        onMouseEnter={el => (el.currentTarget.style.background = "#f5f5f5")}
                        onMouseLeave={el => (el.currentTarget.style.background = "none")}>{e}</button>
                    ))}
                  </div>
                )}

                {/* GIF picker */}
                {showGif && (
                  <div style={{ marginBottom: 6, padding: 10, background: "#fff", border: "1px solid #edebe9", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#605e5c", marginBottom: 8 }}>GIF Reactions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {GIF_OPTIONS.map(g => (
                        <button key={g} onClick={() => { sendMessage(g); setShowGif(false); }}
                          style={{ background: "#f5f5f5", border: "1px solid #edebe9", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                          onMouseEnter={el => (el.currentTarget.style.background = "#ede9fe")}
                          onMouseLeave={el => (el.currentTarget.style.background = "#f5f5f5")}>{g}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Priority + schedule indicator */}
                {(priority !== "none" || scheduledFor) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, padding: "4px 10px", background: "#f5f5f5", borderRadius: 4, fontSize: 12 }}>
                    {priority !== "none" && <span style={{ color: PRIORITY_COLORS[priority], fontWeight: 600 }}>🚩 {priority.charAt(0).toUpperCase() + priority.slice(1)} priority</span>}
                    {scheduledFor && <span style={{ color: "#605e5c" }}>📅 Scheduled for {scheduledFor}</span>}
                    <button onClick={() => { setPriority("none"); setScheduledFor(null); }} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: "#a8a8a8", display: "flex" }}><X size={12}/></button>
                  </div>
                )}

                <div className="teams-input-box" style={{ background: "#fff", border: "1px solid #c8c6c4", borderRadius: 6, overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s" }}>
                  {/* Top toolbar: formatting */}
                  <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "4px 8px", borderBottom: "1px solid #f0f0f0" }}>
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
                      <button key={title} onClick={action} title={title} className="teams-action-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 5px", borderRadius: 4, color: "#605e5c", display: "flex" }}>{icon}</button>
                    ))}
                  </div>

                  {/* Bottom toolbar: tools + send */}
                  <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "4px 8px", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid transparent" }}>
                    <button onClick={() => setShowEmoji(v => !v)} title="Emoji" className={`teams-tool-btn${showEmoji ? " active-tool" : ""}`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Smile size={14}/><span>Emoji</span>
                    </button>
                    <button onClick={() => { setShowGif(v => !v); setShowEmoji(false); }} title="GIF" className={`teams-tool-btn${showGif ? " active-tool" : ""}`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Image size={14}/><span>GIF</span>
                    </button>
                    <button onClick={() => setShowPoll(true)} title="Create poll" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <BarChart2 size={14}/><span>Poll</span>
                    </button>
                    <button onClick={() => setPriority(p => p === "none" ? "high" : p === "high" ? "medium" : p === "medium" ? "low" : "none")} title="Priority" className={`teams-tool-btn${priority !== "none" ? " active-tool" : ""}`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: priority !== "none" ? PRIORITY_COLORS[priority] : "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Flag size={14}/><span>Priority</span>
                    </button>
                    <button onClick={() => setShowPraise(true)} title="Send praise" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Award size={14}/><span>Praise</span>
                    </button>
                    <button onClick={() => { setInput(p => p + "@"); inputRef.current?.focus(); }} title="Mention" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <AtSign size={14}/><span>Mention</span>
                    </button>
                    <button onClick={() => setShowSchedule(true)} title="Schedule send" className={`teams-tool-btn${scheduledFor ? " active-tool" : ""}`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: scheduledFor ? TEAMS_PURPLE : "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Clock size={14}/><span>Schedule</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} title="Attach file" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Paperclip size={14}/><span>Attach</span>
                    </button>
                    <button onClick={() => setShowMeet(true)} title="Meet now" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Video size={14}/><span>Meet</span>
                    </button>
                    <button title="AI assist" className="teams-tool-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, color: "#605e5c", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Sparkles size={14}/><span>AI</span>
                    </button>
                  </div>

                  {/* Text area */}
                  <div style={{ display: "flex", alignItems: "flex-end", padding: "6px 8px 6px" }}>
                    <textarea ref={inputRef} value={input}
                      onChange={e => { setInput(e.target.value); sendTyping(); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                      placeholder={`Message #${activeChannel.name}`} rows={1}
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13.5, color: "#242424", resize: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflow: "auto", padding: 0 }}/>
                    <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                      style={{ marginLeft: 8, width: 30, height: 30, borderRadius: 4, border: "none", background: input.trim() ? TEAMS_PURPLE : "#edebe9", color: input.trim() ? "#fff" : "#a8a8a8", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}>
                      <Send size={14}/>
                    </button>
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
