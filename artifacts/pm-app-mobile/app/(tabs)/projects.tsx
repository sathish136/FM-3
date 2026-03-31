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

interface Project {
  id: number;
  name: string;
  status: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  tasks_count?: number;
  completion_percentage?: number;
  client?: string;
}

const STATUS_LABELS = ["All", "Active", "Completed", "Planning", "On Hold"];
const STATUS_MAP: Record<string, string[]> = {
  Active: ["active", "in-progress"],
  Completed: ["completed"],
  Planning: ["planning"],
  "On Hold": ["on-hold", "paused"],
};

const STATUS_COLOR: Record<string, string> = {
  active: "#16A34A",
  "in-progress": "#0EA5E9",
  completed: "#6B7A90",
  "on-hold": "#D97706",
  planning: "#7C3AED",
};

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Project[]>("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch { setProjects([]); } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = projects;
    if (filter !== "All" && STATUS_MAP[filter]) {
      list = list.filter((p) => STATUS_MAP[filter].includes((p.status || "").toLowerCase()));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || (p.client || "").toLowerCase().includes(q));
    }
    return list;
  }, [projects, filter, search]);

  function renderItem({ item: p }: { item: Project }) {
    const status = (p.status || "active").toLowerCase();
    const color = STATUS_COLOR[status] || colors.mutedForeground;
    const pct = p.completion_percentage ?? 0;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
          <View style={[s.badge, { backgroundColor: color + "18" }]}>
            <Text style={[s.badgeText, { color }]}>{p.status || "Active"}</Text>
          </View>
        </View>
        {!!p.client && <Text style={s.client}>{p.client}</Text>}
        {!!p.description && (
          <Text style={s.desc} numberOfLines={2}>{p.description}</Text>
        )}
        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={[s.pct, { color }]}>{pct}%</Text>
        </View>
        <View style={s.cardMeta}>
          {p.tasks_count !== undefined && (
            <View style={s.metaChip}>
              <Feather name="check-square" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>{p.tasks_count} tasks</Text>
            </View>
          )}
          {p.end_date && (
            <View style={s.metaChip}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>{p.end_date}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Search */}
      <View style={s.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search projects..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {STATUS_LABELS.map((f) => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && { backgroundColor: colors.primary }]}
            onPress={async () => { setFilter(f); await Haptics.selectionAsync(); }}
          >
            <Text style={[s.filterText, filter === f && { color: "#fff" }]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="folder" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No projects found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
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
    filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: "wrap" },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.muted,
    },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    card: {
      backgroundColor: c.card,
      borderRadius: c.radius + 2,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    client: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 6 },
    desc: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 10 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    progressTrack: { flex: 1, height: 6, backgroundColor: c.muted, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 3 },
    pct: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 32, textAlign: "right" },
    cardMeta: { flexDirection: "row", gap: 12 },
    metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
