import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Notification {
  id: number;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_ICON: Record<string, { name: React.ComponentProps<typeof Feather>["name"]; color: string }> = {
  project: { name: "folder", color: "#3b82f6" },
  task: { name: "check-square", color: "#16a34a" },
  leave: { name: "calendar", color: "#7c3aed" },
  payment: { name: "credit-card", color: "#dc2626" },
  system: { name: "bell", color: "#d97706" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const s = styles(colors, insets);

  async function load() {
    try {
      const email = user?.email || "";
      const data = await apiFetch<Notification[]>(`/api/notifications/in-app?email=${encodeURIComponent(email)}`);
      setNotifications(Array.isArray(data) ? data : []);
    } catch { setNotifications([]); } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function renderItem({ item: n }: { item: Notification }) {
    const typeKey = (n.type || "system").toLowerCase();
    const icon = TYPE_ICON[typeKey] || TYPE_ICON.system;
    return (
      <Pressable style={[s.card, !n.is_read && s.unreadCard]}>
        {!n.is_read && <View style={s.unreadDot} />}
        <View style={[s.iconBox, { backgroundColor: icon.color + "18" }]}>
          <Feather name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={s.content}>
          <View style={s.row}>
            <Text style={[s.title, !n.is_read && { fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{n.title}</Text>
            <Text style={s.time}>{timeAgo(n.created_at)}</Text>
          </View>
          <Text style={s.message} numberOfLines={2}>{n.message}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={s.root}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="bell-off" size={36} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptyText}>No notifications right now</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    list: { padding: 16, paddingBottom: insets.bottom + 40 },
    card: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 8 },
    unreadCard: { borderLeftWidth: 3, borderLeftColor: c.primary },
    unreadDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    content: { flex: 1 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    title: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1, marginRight: 8 },
    time: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    message: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    emptyText: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
