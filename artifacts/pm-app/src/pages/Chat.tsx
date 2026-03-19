import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Hash, Plus, X, Send, Smile, Paperclip,
  Users, Search, Bell, Circle, Loader2,
  MessageSquare, Sparkles, MoreHorizontal, Trash2,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  AtSign, Bold, Italic, Link2, Pin, BookmarkPlus,
} from "lucide-react";

const BASE = "/api";
const WS_BASE = typeof window !== "undefined"
  ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
  : "";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "💯"];

const AVATAR_COLORS = [
  ["#7C3AED", "#5B21B6"],
  ["#2563EB", "#1D4ED8"],
  ["#DB2777", "#9D174D"],
  ["#D97706", "#B45309"],
  ["#059669", "#065F46"],
  ["#0891B2", "#0E7490"],
  ["#7C3AED", "#4C1D95"],
  ["#DC2626", "#991B1B"],
];

function avatarGrad(s: string) {
  let n = 0; for (const c of s) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
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
  { name: string; email: string; size?: "xs" | "sm" | "md" | "lg"; showStatus?: boolean; online?: boolean }) {
  const [c1, c2] = avatarGrad(email);
  const sz = { xs: 24, sm: 28, md: 36, lg: 44 }[size];
  const fs = { xs: 9, sm: 10, md: 12, lg: 15 }[size];
  const dotSz = { xs: 6, sm: 7, md: 9, lg: 11 }[size];
  return (
    <div style={{ position: "relative", width: sz, height: sz, flexShrink: 0 }}>
      <div style={{
        width: sz, height: sz, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: fs, letterSpacing: "0.02em",
        boxShadow: `0 2px 8px ${c1}55`,
      }}>{initials(name)}</div>
      {showStatus && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: dotSz, height: dotSz, borderRadius: "50%",
          background: online ? "#22C55E" : "#6B7280",
          border: "2px solid #0f1018",
          boxShadow: online ? "0 0 6px #22C55E88" : "none",
        }}/>
      )}
    </div>
  );
}

function ChannelIcon({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 6, height: 6, borderRadius: "50%",
      background: active ? "linear-gradient(135deg,#A78BFA,#7C3AED)" : "transparent",
      border: active ? "none" : "1.5px solid #4B5563",
      flexShrink: 0, marginRight: 2,
    }}/>
  );
}

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
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [search, setSearch] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    apiFetch("/chat/channels").then(setChannels).catch(() => {});
  }, []);

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) setActiveChannel(channels[0]);
  }, [channels]);

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
    wsRef.current.send(JSON.stringify({ type: "message", content: text.trim() }));
    setInput(""); setShowEmoji(false);
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
      const ch = await apiFetch("/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName, description: newChannelDesc }),
      });
      setChannels(prev => [...prev, ch]);
      setActiveChannel(ch);
      setNewChannelName(""); setNewChannelDesc(""); setShowNewChannel(false);
    } catch { }
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

  return (
    <Layout>
      <style>{`
        .ft-sidebar {
          width: 260px;
          min-width: 260px;
          transition: width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1);
          overflow: hidden;
        }
        .ft-sidebar.collapsed {
          width: 0px;
          min-width: 0px;
        }
        .ft-sidebar-inner {
          width: 260px;
        }
        .ft-msg-hover:hover { background: rgba(139,92,246,0.04); }
        .ft-ch-btn { transition: background 0.12s, color 0.12s; }
        .ft-ch-btn:hover { background: rgba(139,92,246,0.12) !important; }
        .ft-ch-btn.active { background: rgba(139,92,246,0.18) !important; }
        .ft-input:focus { outline: none; }
        .ft-scrollbar::-webkit-scrollbar { width: 4px; }
        .ft-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .ft-scrollbar::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 99px; }
        .ft-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        .ft-reaction-pill { transition: background 0.12s, transform 0.1s; }
        .ft-reaction-pill:hover { transform: scale(1.08); }
        .ft-action-btn { transition: background 0.12s, color 0.12s, transform 0.1s; }
        .ft-action-btn:hover { transform: scale(1.12); }
        @keyframes ft-bounce {
          0%,80%,100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .ft-dot { animation: ft-bounce 1.2s infinite; display: inline-block; }
        @keyframes ft-pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { transform: scale(0.95); }
        }
        .ft-online-pulse { animation: ft-pulse-ring 2.5s infinite; }
        @keyframes ft-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .ft-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 800px 100%;
          animation: ft-shimmer 1.5s infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ display: "flex", height: "calc(100vh - 48px)", background: "#0d0e16", overflow: "hidden", position: "relative" }}>

        {/* ── SIDEBAR ── */}
        <div className={`ft-sidebar${sidebarOpen ? "" : " collapsed"}`}
          style={{ background: "#111220", borderRight: "1px solid rgba(139,92,246,0.08)", display: "flex", flexShrink: 0, position: "relative" }}>
          <div className="ft-sidebar-inner" style={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>

            {/* Brand header */}
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(139,92,246,0.08)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <MessageSquare size={16} color="#fff"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#F3F4F6", letterSpacing: "-0.01em" }}>FlowTalk</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                    <div className="ft-online-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }}/>
                    <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 600 }}>{allOnline.length} online</span>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "#6B7280", borderRadius: 6 }}
                  title="Collapse sidebar">
                  <PanelLeftClose size={15}/>
                </button>
              </div>

              {/* Search */}
              <div style={{
                marginTop: 10, display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.04)", borderRadius: 8,
                padding: "6px 10px", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Search size={12} color="#6B7280"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search messages…" className="ft-input"
                  style={{ flex: 1, background: "none", border: "none", fontSize: 12, color: "#D1D5DB", minWidth: 0 }}/>
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={11} color="#6B7280"/></button>}
              </div>
            </div>

            {/* Channels */}
            <div className="ft-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 4px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Channels</span>
                <button onClick={() => setShowNewChannel(true)}
                  style={{ background: "rgba(139,92,246,0.15)", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, color: "#A78BFA" }}
                  title="New channel">
                  <Plus size={11}/><span style={{ fontSize: 10, fontWeight: 600 }}>New</span>
                </button>
              </div>

              {channels.map(ch => {
                const active = activeChannel?.id === ch.id;
                return (
                  <button key={ch.id} onClick={() => setActiveChannel(ch)}
                    className={`ft-ch-btn${active ? " active" : ""}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 8px", borderRadius: 8, border: "none",
                      background: active ? "rgba(139,92,246,0.18)" : "transparent",
                      cursor: "pointer", marginBottom: 1,
                      boxShadow: active ? "inset 0 0 0 1px rgba(139,92,246,0.25)" : "none",
                    }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: active ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : "rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: active ? "0 2px 8px rgba(124,58,237,0.4)" : "none",
                    }}>
                      <Hash size={12} color={active ? "#fff" : "#9CA3AF"}/>
                    </div>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#F3F4F6" : "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ch.name}
                    </span>
                    {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA", flexShrink: 0 }}/>}
                  </button>
                );
              })}

              {/* New channel form */}
              {showNewChannel && (
                <div style={{ margin: "6px 4px", padding: 12, background: "rgba(139,92,246,0.08)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", marginBottom: 8 }}>Create Channel</div>
                  <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateChannel()}
                    placeholder="channel-name" className="ft-input"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#F3F4F6", marginBottom: 6, boxSizing: "border-box" }}/>
                  <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
                    placeholder="Description (optional)" className="ft-input"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#F3F4F6", marginBottom: 8, boxSizing: "border-box" }}/>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={handleCreateChannel}
                      style={{ flex: 1, background: "linear-gradient(135deg,#7C3AED,#4F46E5)", border: "none", borderRadius: 7, padding: "6px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 10px rgba(124,58,237,0.4)" }}>
                      Create
                    </button>
                    <button onClick={() => setShowNewChannel(false)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#9CA3AF" }}>
                      <X size={13}/>
                    </button>
                  </div>
                </div>
              )}

              {/* Members section */}
              <div style={{ marginTop: 16, paddingBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px 6px" }}>
                  Members
                </div>
                {allOnline.map(email => {
                  const name = email === userEmail ? userName : email.split("@")[0];
                  const isMe = email === userEmail;
                  return (
                    <div key={email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 8 }}>
                      <Avatar name={name} email={email} size="sm" showStatus online/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#D1D5DB", fontWeight: isMe ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {name}{isMe && <span style={{ fontSize: 10, color: "#6B7280", marginLeft: 4 }}>you</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current user footer */}
            <div style={{ padding: "10px 10px", borderTop: "1px solid rgba(139,92,246,0.08)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "#0d0e18" }}>
              <Avatar name={userName} email={userEmail} size="sm" showStatus online/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#F3F4F6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
                <div style={{ fontSize: 10, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E" }}/>
            </div>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

          {!activeChannel ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.2))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <MessageSquare size={28} color="#7C3AED"/>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6" }}>Select a channel</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Pick a channel from the sidebar to start chatting</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Channel Header ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "0 20px",
                height: 56, borderBottom: "1px solid rgba(139,92,246,0.08)",
                background: "rgba(13,14,22,0.95)", flexShrink: 0,
                backdropFilter: "blur(12px)",
              }}>
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)}
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "#A78BFA", display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}
                    title="Open sidebar">
                    <PanelLeftOpen size={14}/><span style={{ fontSize: 11, fontWeight: 600 }}>Channels</span>
                  </button>
                )}

                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(124,58,237,0.35)",
                }}>
                  <Hash size={14} color="#fff"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#F3F4F6", letterSpacing: "-0.01em" }}>{activeChannel.name}</span>
                    {connecting && <Loader2 size={12} color="#6B7280" style={{ animation: "spin 1s linear infinite" }}/>}
                  </div>
                  {activeChannel.description && (
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeChannel.description}</div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "4px 10px" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 5px #22C55E" }}/>
                    <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{allOnline.length} online</span>
                  </div>
                  <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#6B7280" }}>
                    <Bell size={14}/>
                  </button>
                  <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#6B7280" }}>
                    <MoreHorizontal size={14}/>
                  </button>
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="ft-scrollbar" onClick={() => setShowEmoji(false)}
                style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>

                {loading && (
                  <div style={{ padding: "20px 0" }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <div className="ft-skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }}/>
                        <div style={{ flex: 1 }}>
                          <div className="ft-skeleton" style={{ height: 12, width: `${60 + i * 8}%`, marginBottom: 8 }}/>
                          <div className="ft-skeleton" style={{ height: 10, width: `${40 + i * 5}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 22,
                      background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15))",
                      border: "1px solid rgba(124,58,237,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                      boxShadow: "0 8px 32px rgba(124,58,237,0.15)",
                    }}>
                      <Hash size={32} color="#7C3AED"/>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#F3F4F6", marginBottom: 6 }}>
                      Welcome to #{activeChannel.name}!
                    </div>
                    <div style={{ fontSize: 13, color: "#6B7280", maxWidth: 320, textAlign: "center" }}>
                      {activeChannel.description || "This is the beginning of a great conversation. Say hello!"}
                    </div>
                    <button onClick={() => inputRef.current?.focus()}
                      style={{ marginTop: 16, background: "linear-gradient(135deg,#7C3AED,#4F46E5)", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                      Start the conversation
                    </button>
                  </div>
                )}

                {dayGroups.map(({ day, msgs }) => (
                  <div key={day}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.15))" }}/>
                      <div style={{ padding: "3px 12px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 20, fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{day}</div>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(139,92,246,0.15),transparent)" }}/>
                    </div>

                    {msgs.map((msg, i) => {
                      const prevMsg = i > 0 ? msgs[i - 1] : null;
                      const isGrouped = !!(prevMsg && prevMsg.user_email === msg.user_email &&
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000));
                      const isOwn = msg.user_email === userEmail;
                      const reactions = groupedReactions(msg.reactions);
                      const hasReactions = Object.keys(reactions).length > 0;

                      return (
                        <div key={msg.id} className="ft-msg-hover"
                          style={{ display: "flex", gap: 12, padding: isGrouped ? "2px 8px 2px 12px" : "8px 8px 2px 12px", borderRadius: 10, marginBottom: 2, position: "relative", cursor: "default" }}
                          onMouseEnter={() => setHoveredMsg(msg.id)}
                          onMouseLeave={() => setHoveredMsg(null)}>

                          <div style={{ width: 36, flexShrink: 0 }}>
                            {!isGrouped
                              ? <Avatar name={msg.user_name} email={msg.user_email}/>
                              : <span style={{ display: "block", fontSize: 9, color: "transparent", userSelect: "none", marginTop: 8, textAlign: "right" }}>{formatTime(msg.created_at)}</span>
                            }
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!isGrouped && (
                              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                                <span style={{
                                  fontSize: 14, fontWeight: 700,
                                  color: isOwn ? "#A78BFA" : "#F3F4F6",
                                  letterSpacing: "-0.01em",
                                }}>{msg.user_name}</span>
                                <span style={{ fontSize: 10, color: "#4B5563", fontWeight: 500 }}>{formatTime(msg.created_at)}</span>
                                {isOwn && <span style={{ fontSize: 9, color: "#7C3AED", background: "rgba(124,58,237,0.12)", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>you</span>}
                              </div>
                            )}

                            <div style={{
                              fontSize: 13.5, color: "#D1D5DB", lineHeight: 1.6,
                              wordBreak: "break-word", whiteSpace: "pre-wrap",
                            }}>{msg.content}</div>

                            {msg.attachment_name && (
                              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#60A5FA" }}>
                                <Paperclip size={11}/>{msg.attachment_name}
                              </div>
                            )}

                            {hasReactions && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                {Object.entries(reactions).map(([emoji, users]) => {
                                  const mine = users.includes(userEmail);
                                  return (
                                    <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                      className="ft-reaction-pill"
                                      style={{
                                        display: "flex", alignItems: "center", gap: 4,
                                        padding: "3px 8px", borderRadius: 20, border: "none",
                                        background: mine ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                                        outline: mine ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                                        cursor: "pointer", fontSize: 13,
                                      }}>
                                      {emoji}
                                      <span style={{ fontSize: 11, fontWeight: 600, color: mine ? "#A78BFA" : "#9CA3AF" }}>{users.length}</span>
                                    </button>
                                  );
                                })}
                                <button onClick={() => setHoveredMsg(msg.id)}
                                  className="ft-reaction-pill"
                                  style={{ padding: "3px 8px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.03)", outline: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 13, color: "#6B7280" }}>
                                  <Smile size={12}/>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Hover action bar */}
                          {hoveredMsg === msg.id && (
                            <div style={{
                              position: "absolute", top: -18, right: 8,
                              display: "flex", alignItems: "center", gap: 2,
                              background: "#1a1b2e",
                              border: "1px solid rgba(139,92,246,0.2)",
                              borderRadius: 12, padding: "4px 6px",
                              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)",
                              zIndex: 20,
                            }}>
                              {QUICK_REACTIONS.map(emoji => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                  className="ft-action-btn"
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "0 2px", borderRadius: 6 }}>
                                  {emoji}
                                </button>
                              ))}
                              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)", margin: "0 3px" }}/>
                              <button title="Mention reply" className="ft-action-btn"
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 6, color: "#6B7280" }}>
                                <AtSign size={13}/>
                              </button>
                              <button title="Pin" className="ft-action-btn"
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 6, color: "#6B7280" }}>
                                <Pin size={13}/>
                              </button>
                              <button title="Bookmark" className="ft-action-btn"
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 6, color: "#6B7280" }}>
                                <BookmarkPlus size={13}/>
                              </button>
                              {isOwn && (
                                <>
                                  <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)", margin: "0 3px" }}/>
                                  <button onClick={() => handleDeleteMessage(msg.id)} title="Delete" className="ft-action-btn"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: 6, color: "#6B7280" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}>
                                    <Trash2 size={13}/>
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

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", marginTop: 4 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(i => (
                        <span key={i} className="ft-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", display: "block", animationDelay: `${i * 0.18}s` }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
                      <strong style={{ color: "#A78BFA" }}>{typingUsers.join(", ")}</strong> {typingUsers.length === 1 ? "is" : "are"} typing…
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef}/>
              </div>

              {/* ── Message Input ── */}
              <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: 14,
                  boxShadow: "0 0 0 0px rgba(124,58,237,0)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  overflow: "visible", position: "relative",
                }}
                  onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.5)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                  onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>

                  {/* Emoji picker */}
                  {showEmoji && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                      background: "#1a1b2e", border: "1px solid rgba(139,92,246,0.25)",
                      borderRadius: 14, padding: 12, zIndex: 50,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
                      width: 280,
                    }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Quick Reactions
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 3 }}>
                        {["😊","😂","❤️","👍","🎉","🙏","😍","🔥","✅","💯","👋","🤔","😅","🙌","💪","📧","👏","🚀","💡","⚡","🎯","📊","✨","🔔","💬","🤝","⭐","🏆","🎊","👀","😎","🤩","😁","😎","🥳","😤","😬","🤗","👑","🌟","💥","🛠","📌","🔗","📅","💼","🎨","🎯","🧩","🤖"].map(emoji => (
                          <button key={emoji} onClick={() => { setInput(v => v + emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 6, transition: "background 0.1s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
                    <Avatar name={userName} email={userEmail} size="sm"/>
                    <input ref={inputRef}
                      value={input}
                      onChange={e => { setInput(e.target.value); sendTyping(); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                      placeholder={`Message #${activeChannel.name}…`}
                      className="ft-input"
                      style={{ flex: 1, background: "none", border: "none", fontSize: 14, color: "#F3F4F6", minWidth: 0 }}/>
                  </div>

                  {/* Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 10px 8px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <button onClick={e => { e.stopPropagation(); setShowEmoji(v => !v); }}
                      style={{ background: showEmoji ? "rgba(124,58,237,0.2)" : "none", border: "none", borderRadius: 7, padding: "5px 6px", cursor: "pointer", color: showEmoji ? "#A78BFA" : "#6B7280", display: "flex" }}
                      title="Emoji">
                      <Smile size={16}/>
                    </button>
                    <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange}/>
                    <button onClick={() => fileInputRef.current?.click()}
                      style={{ background: "none", border: "none", borderRadius: 7, padding: "5px 6px", cursor: "pointer", color: "#6B7280", display: "flex" }}
                      title="Attach file">
                      <Paperclip size={16}/>
                    </button>
                    <button style={{ background: "none", border: "none", borderRadius: 7, padding: "5px 6px", cursor: "pointer", color: "#6B7280", display: "flex" }} title="AI assist">
                      <Sparkles size={16}/>
                    </button>
                    <button style={{ background: "none", border: "none", borderRadius: 7, padding: "5px 6px", cursor: "pointer", color: "#6B7280", display: "flex" }} title="Mention">
                      <AtSign size={16}/>
                    </button>
                    <div style={{ flex: 1 }}/>

                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 11, color: "#4B5563" }}>↵ Send</span>
                      <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                          background: input.trim() ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : "rgba(255,255,255,0.04)",
                          border: "none", borderRadius: 9, cursor: input.trim() ? "pointer" : "default",
                          fontSize: 13, fontWeight: 700, color: input.trim() ? "#fff" : "#4B5563",
                          boxShadow: input.trim() ? "0 2px 12px rgba(124,58,237,0.4)" : "none",
                          transition: "all 0.15s",
                        }}>
                        <Send size={13}/> Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
