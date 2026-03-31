import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

interface Campaign {
  name?: string;
  campaign_name?: string;
  status?: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  description?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  planned: { color: "#3b82f6", bg: "#3b82f618" },
  active: { color: "#16a34a", bg: "#16a34a18" },
  completed: { color: "#6b7a90", bg: "#6b7a9018" },
  cancelled: { color: "#dc2626", bg: "#dc262618" },
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function CampaignsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Campaign[]>("/api/marketing/campaigns");
      setCampaigns(Array.isArray(data) ? data : []);
    } catch { setCampaigns([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(c => (c.campaign_name || c.name || "").toLowerCase().includes(q));
  }, [campaigns, search]);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => (c.status || "").toLowerCase() === "active").length,
    planned: campaigns.filter(c => (c.status || "").toLowerCase() === "planned").length,
  };

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={(c, i) => c.name || String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              {[
                { label: "Total", value: stats.total, color: colors.primary },
                { label: "Active", value: stats.active, color: "#16a34a" },
                { label: "Planned", value: stats.planned, color: "#3b82f6" },
              ].map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <View style={s.searchBar}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.searchInput} placeholder="Search campaigns..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
              {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
            </View>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item: c }) => {
          const name = c.campaign_name || c.name || "Untitled Campaign";
          const sc = STATUS_CONFIG[(c.status || "planned").toLowerCase()] || STATUS_CONFIG.planned;
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.iconBox}>
                  <Feather name="volume-2" size={20} color={colors.primary} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.campaignName} numberOfLines={1}>{name}</Text>
                  {!!c.campaign_type && <Text style={s.type}>{c.campaign_type}</Text>}
                </View>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.color }]}>{c.status || "Planned"}</Text>
                </View>
              </View>
              <View style={s.dateRow}>
                <Feather name="calendar" size={12} color={colors.mutedForeground} />
                <Text style={s.dateText}>{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</Text>
              </View>
              {!!c.budget && (
                <View style={s.budgetRow}>
                  <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                  <Text style={s.budgetText}>Budget: ₹{c.budget.toLocaleString("en-IN")}</Text>
                </View>
              )}
              {!!c.description && <Text style={s.desc} numberOfLines={2}>{c.description}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="megaphone" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No campaigns found</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    list: { padding: 16, paddingBottom: insets.bottom + 40 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, marginBottom: 12, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.primary + "15", alignItems: "center", justifyContent: "center" },
    cardInfo: { flex: 1 },
    campaignName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    type: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    dateText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    budgetRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    budgetText: { fontSize: 12, color: c.foreground, fontFamily: "Inter_500Medium" },
    desc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
