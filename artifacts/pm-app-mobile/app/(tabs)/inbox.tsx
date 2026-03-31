import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Email {
  id: number;
  subject: string;
  from_name?: string;
  from_email?: string;
  preview?: string;
  snippet?: string;
  date?: string;
  received_at?: string;
  category?: string;
  is_read?: boolean;
  unread?: boolean;
}

const CATEGORIES = ["All", "Project", "Supplier", "Other"];

const CAT_COLOR: Record<string, string> = {
  project: "#2563EB",
  supplier: "#16A34A",
  other: "#6B7A90",
  all: "#7C3AED",
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Email[]>("/api/emails");
      setEmails(Array.isArray(data) ? data : []);
    } catch { setEmails([]); } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = emails;
    if (category !== "All") {
      list = list.filter((e) => (e.category || "").toLowerCase() === category.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.subject || "").toLowerCase().includes(q) ||
        (e.from_name || "").toLowerCase().includes(q) ||
        (e.from_email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [emails, category, search]);

  function renderItem({ item: e }: { item: Email }) {
    const unread = e.unread || !e.is_read;
    const cat = (e.category || "other").toLowerCase();
    const catColor = CAT_COLOR[cat] || colors.mutedForeground;
    const sender = e.from_name || e.from_email || "Unknown";
    const preview = e.preview || e.snippet || "";
    const date = e.date || e.received_at;
    return (
      <Pressable
        style={({ pressed }) => [s.emailCard, pressed && { opacity: 0.8 }, unread && { borderLeftWidth: 3, borderLeftColor: colors.primary }]}
      >
        <View style={s.emailTop}>
          <View style={s.senderAvatar}>
            <Text style={s.senderInitial}>{sender[0]?.toUpperCase() || "?"}</Text>
          </View>
          <View style={s.emailBody}>
            <View style={s.emailRow1}>
              <Text style={[s.sender, unread && { fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
                {sender}
              </Text>
              <Text style={s.time}>{timeAgo(date)}</Text>
            </View>
            <Text style={[s.subject, unread && { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {e.subject}
            </Text>
            {!!preview && (
              <Text style={s.preview} numberOfLines={1}>{preview}</Text>
            )}
            <View style={[s.catBadge, { backgroundColor: catColor + "18" }]}>
              <Text style={[s.catText, { color: catColor }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={s.root}>
      {/* Search */}
      <View style={s.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search emails..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
      </View>

      {/* Category chips */}
      <View style={s.catRow}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[s.catChip, category === c && { backgroundColor: colors.primary }]}
            onPress={async () => { setCategory(c); await Haptics.selectionAsync(); }}
          >
            <Text style={[s.catChipText, category === c && { color: "#fff" }]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No emails</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number }) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      marginHorizontal: 16,
      marginTop: isWeb ? 67 : 12,
      marginBottom: 10,
      borderRadius: c.radius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    catRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.muted },
    catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    emailCard: {
      backgroundColor: c.card,
      borderRadius: c.radius,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
    },
    emailTop: { flexDirection: "row", gap: 10 },
    senderAvatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primary + "20",
      alignItems: "center", justifyContent: "center",
    },
    senderInitial: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.primary },
    emailBody: { flex: 1 },
    emailRow1: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    sender: { fontSize: 14, color: c.foreground, fontFamily: "Inter_500Medium", flex: 1, marginRight: 8 },
    time: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    subject: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 4 },
    preview: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 6 },
    catBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    catText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
