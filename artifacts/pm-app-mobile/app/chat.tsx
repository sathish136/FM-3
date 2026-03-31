import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Room {
  id: number;
  name: string;
  description?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

interface Message {
  id: number;
  room_id: number;
  sender_email: string;
  sender_name: string;
  message: string;
  created_at: string;
}

const AVATAR_COLORS = ["#6366f1","#3b82f6","#0d9488","#16a34a","#d97706","#7c3aed"];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

function timeAgo(d?: string): string {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const flatRef = useRef<FlatList>(null);
  const s = styles(colors, insets);

  async function loadRooms() {
    try {
      const data = await apiFetch<Room[]>("/api/chat/rooms");
      setRooms(Array.isArray(data) ? data : []);
    } catch { setRooms([]); } finally { setLoading(false); }
  }

  async function loadMessages(room: Room) {
    setActiveRoom(room);
    setMessages([]);
    try {
      const data = await apiFetch<Message[]>(`/api/chat/rooms/${room.id}/messages`);
      setMessages(Array.isArray(data) ? data.slice(-50) : []);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    } catch { setMessages([]); }
  }

  async function sendMessage() {
    if (!text.trim() || !activeRoom) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await apiFetch(`/api/chat/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: msg, sender_email: user?.email, sender_name: user?.full_name }),
      });
      await Haptics.selectionAsync();
      loadMessages(activeRoom);
    } catch { setText(msg); }
    finally { setSending(false); }
  }

  useEffect(() => { loadRooms(); }, []);

  if (activeRoom) {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.msgHeader}>
          <Pressable onPress={() => setActiveRoom(null)} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={[s.roomIcon, { backgroundColor: avatarColor(activeRoom.name) + "25" }]}>
            <Text style={[s.roomIconText, { color: avatarColor(activeRoom.name) }]}>{activeRoom.name[0]?.toUpperCase()}</Text>
          </View>
          <Text style={s.roomHeaderName} numberOfLines={1}>{activeRoom.name}</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: m }) => {
            const isMe = m.sender_email === user?.email;
            const ac = avatarColor(m.sender_name || m.sender_email);
            return (
              <View style={[s.msgRow, isMe && s.msgRowMe]}>
                {!isMe && (
                  <View style={[s.msgAvatar, { backgroundColor: ac + "25" }]}>
                    <Text style={[s.msgAvatarText, { color: ac }]}>{(m.sender_name || m.sender_email)[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  {!isMe && <Text style={s.senderName}>{m.sender_name || m.sender_email}</Text>}
                  <Text style={[s.bubbleText, isMe && { color: "#fff" }]}>{m.message}</Text>
                  <Text style={[s.bubbleTime, isMe && { color: "rgba(255,255,255,0.7)" }]}>{timeAgo(m.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyMsgs}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={s.emptyMsgsText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={s.msgInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]} onPress={sendMessage} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={s.root}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={s.roomsList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadRooms} tintColor={colors.primary} />}
          renderItem={({ item: r }) => {
            const ac = avatarColor(r.name);
            return (
              <Pressable style={({ pressed }) => [s.roomCard, pressed && { opacity: 0.8 }]} onPress={() => loadMessages(r)}>
                <View style={[s.roomIcon, { backgroundColor: ac + "22" }]}>
                  <Text style={[s.roomIconText, { color: ac }]}>{r.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={s.roomInfo}>
                  <View style={s.roomRow}>
                    <Text style={s.roomName} numberOfLines={1}>{r.name}</Text>
                    {!!r.last_message_at && <Text style={s.roomTime}>{timeAgo(r.last_message_at)}</Text>}
                  </View>
                  {!!r.last_message && <Text style={s.roomPreview} numberOfLines={1}>{r.last_message}</Text>}
                  {!!r.description && !r.last_message && <Text style={s.roomDesc} numberOfLines={1}>{r.description}</Text>}
                </View>
                {!!r.unread_count && r.unread_count > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadCount}>{r.unread_count}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No rooms yet</Text>
              <Text style={s.emptyText}>Chat rooms will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    roomsList: { padding: 16, paddingBottom: insets.bottom + 40 },
    roomCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 8 },
    roomIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    roomIconText: { fontSize: 20, fontFamily: "Inter_700Bold" },
    roomInfo: { flex: 1 },
    roomRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    roomName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1 },
    roomTime: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    roomPreview: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    roomDesc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    unreadBadge: { backgroundColor: c.primary, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    unreadCount: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    emptyText: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    msgHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
    backBtn: { padding: 4 },
    roomHeaderName: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    msgList: { padding: 16, paddingBottom: 8 },
    msgRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-end" },
    msgRowMe: { flexDirection: "row-reverse" },
    msgAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    msgAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
    bubble: { maxWidth: "75%", borderRadius: 16, padding: 10 },
    bubbleMe: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
    senderName: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    bubbleText: { fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    bubbleTime: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.card },
    msgInput: { flex: 1, backgroundColor: c.muted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular", maxHeight: 100 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    emptyMsgs: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyMsgsText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
