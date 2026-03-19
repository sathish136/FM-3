import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Hash, Plus, X, Send, Smile, Paperclip, ChevronDown,
  Users, Search, Bell, BellOff, Circle, Loader2,
  MessageSquare, Sparkles, MoreHorizontal, Trash2,
  ChevronRight,
} from "lucide-react";

const BASE = "/api";
const WS_BASE = typeof window !== "undefined"
  ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
  : "";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "✅"];
const COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-sky-600",
];

function avatarColor(s: string) {
  let n = 0;
  for (const c of s) n += c.charCodeAt(0);
  return COLORS[n % COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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

function Avatar({ name, email, size = "md" }: { name: string; email: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-10 h-10 text-sm" : size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${avatarColor(email)} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials(name)}
    </div>
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
  const [channelsOpen, setChannelsOpen] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    apiFetch("/chat/channels").then(setChannels).catch(() => {});
  }, []);

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) {
      setActiveChannel(channels[0]);
    }
  }, [channels]);

  useEffect(() => {
    if (!activeChannel || !userEmail) return;
    setMessages([]);
    setLoading(true);
    setConnecting(true);
    setOnlineUsers(new Set());
    setTypingUsers([]);

    apiFetch(`/chat/${activeChannel.id}/messages`)
      .then(msgs => { setMessages(msgs); setLoading(false); setTimeout(scrollToBottom, 50); })
      .catch(() => setLoading(false));

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${WS_BASE}/api/chat-ws?channel=${activeChannel.id}&user=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnecting(false);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        setMessages(prev => {
          const exists = prev.find(m => m.id === data.id);
          if (exists) return prev;
          return [...prev, { ...data, reactions: data.reactions || [] }];
        });
        setTimeout(scrollToBottom, 50);
      }
      if (data.type === "typing") {
        setTypingUsers(prev => {
          if (prev.includes(data.userName)) return prev;
          return [...prev, data.userName];
        });
        setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== data.userName)), 3000);
      }
      if (data.type === "online") {
        setOnlineUsers(prev => new Set([...prev, data.userEmail]));
      }
      if (data.type === "offline") {
        setOnlineUsers(prev => { const n = new Set(prev); n.delete(data.userEmail); return n; });
      }
      if (data.type === "reaction") {
        setMessages(prev => prev.map(m => {
          if (m.id !== data.messageId) return m;
          const alreadyHas = m.reactions.find(r => r.emoji === data.emoji && r.userEmail === data.userEmail);
          const reactions = alreadyHas
            ? m.reactions.filter(r => !(r.emoji === data.emoji && r.userEmail === data.userEmail))
            : [...m.reactions, { emoji: data.emoji, userEmail: data.userEmail }];
          return { ...m, reactions };
        }));
      }
    };

    ws.onclose = () => setConnecting(false);

    return () => { ws.close(); };
  }, [activeChannel?.id, userEmail]);

  const sendMessage = (text: string, attachmentName?: string) => {
    if ((!text.trim() && !attachmentName) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: text.trim() || attachmentName, attachmentName }));
    setInput("");
    setShowEmoji(false);
  };

  const sendTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing" }));
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const handleReact = (messageId: number, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reaction", messageId, emoji }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendMessage(`📎 ${file.name}`, file.name);
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
    for (const r of reactions) {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r.userEmail);
    }
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

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)] bg-[#1a1d21] overflow-hidden">

        {/* ── Channel Sidebar ── */}
        <div className="w-60 shrink-0 bg-[#19171D] flex flex-col border-r border-white/5">
          {/* Workspace header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">FlowTalk</p>
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <Circle className="w-1.5 h-1.5 fill-current"/> {onlineUsers.size + 1} online
              </p>
            </div>
          </div>

          {/* Channel search */}
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
              <Search className="w-3 h-3 text-gray-500 shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…"
                className="flex-1 bg-transparent text-xs text-gray-300 outline-none placeholder-gray-600"/>
            </div>
          </div>

          {/* Channels section */}
          <div className="flex-1 overflow-y-auto px-1 pb-4">
            <div className="flex items-center gap-1 px-2 py-1 mt-1">
              <button onClick={() => setChannelsOpen(v => !v)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition-colors flex-1">
                {channelsOpen ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                Channels
              </button>
              <button onClick={() => setShowNewChannel(true)} title="New channel" className="p-0.5 text-gray-500 hover:text-gray-200 transition-colors">
                <Plus className="w-3.5 h-3.5"/>
              </button>
            </div>

            {channelsOpen && channels.map(ch => (
              <button key={ch.id} onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeChannel?.id === ch.id
                    ? "bg-violet-600/30 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}>
                <Hash className="w-3.5 h-3.5 shrink-0"/>
                <span className="truncate">{ch.name}</span>
              </button>
            ))}

            {/* New channel form */}
            {showNewChannel && (
              <div className="mx-1 mt-1 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="channel-name" onKeyDown={e => e.key === "Enter" && handleCreateChannel()}
                  className="w-full bg-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none placeholder-gray-500 mb-1.5"/>
                <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none placeholder-gray-500 mb-2"/>
                <div className="flex gap-1">
                  <button onClick={handleCreateChannel}
                    className="flex-1 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    Create
                  </button>
                  <button onClick={() => setShowNewChannel(false)}
                    className="px-2 py-1 text-gray-400 hover:bg-white/10 rounded-lg text-xs transition-colors">
                    <X className="w-3 h-3"/>
                  </button>
                </div>
              </div>
            )}

            {/* Online members */}
            <div className="px-2 py-1 mt-3">
              <p className="text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3"/> Members
              </p>
              <div className="flex items-center gap-2 py-1">
                <Avatar name={userName} email={userEmail} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-medium">{userName} <span className="text-[10px] text-gray-500">(you)</span></p>
                </div>
                <Circle className="w-2 h-2 text-green-400 fill-current shrink-0"/>
              </div>
              {[...onlineUsers].filter(e => e !== userEmail).map(email => (
                <div key={email} className="flex items-center gap-2 py-1">
                  <Avatar name={email.split("@")[0]} email={email} size="sm"/>
                  <p className="text-xs text-gray-300 flex-1 truncate">{email.split("@")[0]}</p>
                  <Circle className="w-2 h-2 text-green-400 fill-current shrink-0"/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeChannel ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3"/>
                <p className="text-gray-400 font-medium">Select a channel to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Channel header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1d21] border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Hash className="w-4 h-4 text-gray-400 shrink-0"/>
                  <span className="font-bold text-white text-sm">{activeChannel.name}</span>
                  {activeChannel.description && (
                    <>
                      <div className="w-px h-4 bg-white/10 mx-1"/>
                      <span className="text-xs text-gray-500 truncate">{activeChannel.description}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {connecting && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin"/>}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3"/>
                    {onlineUsers.size + 1}
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
                    <Bell className="w-3.5 h-3.5"/>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5" onClick={() => setShowEmoji(false)}>
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin"/>
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-3 border border-violet-500/20">
                      <Hash className="w-7 h-7 text-violet-400"/>
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Welcome to #{activeChannel.name}!</p>
                    <p className="text-gray-500 text-sm">{activeChannel.description || "Start the conversation."}</p>
                  </div>
                )}

                {dayGroups.map(({ day, msgs }) => (
                  <div key={day}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-white/5"/>
                      <span className="text-[11px] text-gray-500 font-medium px-2">{day}</span>
                      <div className="flex-1 h-px bg-white/5"/>
                    </div>

                    {msgs.map((msg, i) => {
                      const prevMsg = i > 0 ? msgs[i - 1] : null;
                      const isGrouped = prevMsg && prevMsg.user_email === msg.user_email &&
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);
                      const isOwn = msg.user_email === userEmail;
                      const reactions = groupedReactions(msg.reactions);

                      return (
                        <div key={msg.id}
                          className={`group relative flex gap-3 ${isGrouped ? "mt-0.5 pl-11" : "mt-3"} hover:bg-white/[0.02] rounded-lg px-2 py-0.5 -mx-2`}
                          onMouseEnter={() => setHoveredMsg(msg.id)}
                          onMouseLeave={() => setHoveredMsg(null)}
                        >
                          {!isGrouped && (
                            <div className="shrink-0 mt-0.5">
                              <Avatar name={msg.user_name} email={msg.user_email}/>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {!isGrouped && (
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className={`text-sm font-bold ${isOwn ? "text-violet-400" : "text-white"}`}>{msg.user_name}</span>
                                <span className="text-[10px] text-gray-600">{formatTime(msg.created_at)}</span>
                              </div>
                            )}

                            <p className="text-sm text-gray-200 leading-relaxed break-words">{msg.content}</p>

                            {msg.attachment_name && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1 w-fit">
                                <Paperclip className="w-3 h-3"/> {msg.attachment_name}
                              </div>
                            )}

                            {/* Reactions */}
                            {Object.keys(reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(reactions).map(([emoji, users]) => (
                                  <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                      users.includes(userEmail)
                                        ? "bg-violet-600/30 border border-violet-500/50 text-white"
                                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                                    }`}>
                                    {emoji} <span>{users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hover actions */}
                          {hoveredMsg === msg.id && (
                            <div className="absolute right-2 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-[#2a2d35] border border-white/10 rounded-xl px-1.5 py-1 shadow-xl z-10">
                              {QUICK_REACTIONS.map(emoji => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                  className="text-sm hover:scale-125 transition-transform p-0.5">{emoji}</button>
                              ))}
                              {isOwn && (
                                <button onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 text-gray-500 hover:text-red-400 transition-colors ml-1">
                                  <Trash2 className="w-3 h-3"/>
                                </button>
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
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}/>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 italic">
                      {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef}/>
              </div>

              {/* Message Input */}
              <div className="px-4 pb-4 shrink-0">
                <div className="bg-[#2a2d35] rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <input ref={inputRef}
                      value={input}
                      onChange={e => { setInput(e.target.value); sendTyping(); }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                      }}
                      placeholder={`Message #${activeChannel.name}`}
                      className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 px-2 pb-2 pt-0">
                    {/* Emoji picker */}
                    <div className="relative">
                      <button onClick={e => { e.stopPropagation(); setShowEmoji(v => !v); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                        <Smile className="w-4 h-4"/>
                      </button>
                      {showEmoji && (
                        <div className="absolute bottom-full left-0 mb-2 bg-[#2a2d35] border border-white/10 rounded-xl shadow-2xl p-2 z-20 w-48"
                          onClick={e => e.stopPropagation()}>
                          <div className="grid grid-cols-8 gap-0.5">
                            {["😊","😂","❤️","👍","🎉","🙏","😍","🔥","✅","💯","👋","🤔","😅","🙌","💪","📧","👏","🚀","💡","⚡",
                              "🎯","📊","✨","🔔","💬","🤝","⭐","🏆","🎊","👀","😎","🤩"].map(e => (
                              <button key={e} onClick={() => { setInput(v => v + e); setShowEmoji(false); inputRef.current?.focus(); }}
                                className="text-lg hover:bg-white/10 rounded p-0.5 transition-colors leading-none">{e}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}/>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                      <Paperclip className="w-4 h-4"/>
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors" title="AI assist">
                      <Sparkles className="w-4 h-4"/>
                    </button>

                    <div className="flex-1"/>

                    <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors">
                      <Send className="w-3.5 h-3.5"/> Send
                    </button>
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
