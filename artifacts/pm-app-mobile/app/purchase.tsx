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

interface PurchaseOrder {
  name?: string;
  supplier?: string;
  status?: string;
  transaction_date?: string;
  grand_total?: number;
  currency?: string;
  items_count?: number;
  per_received?: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  draft: { color: "#6b7a90", bg: "#6b7a9018" },
  "to receive and bill": { color: "#d97706", bg: "#d9770618" },
  "to bill": { color: "#3b82f6", bg: "#3b82f618" },
  completed: { color: "#16a34a", bg: "#16a34a18" },
  cancelled: { color: "#dc2626", bg: "#dc262618" },
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function PurchaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<PurchaseOrder[]>("/api/purchase-dashboard/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => (o.name || "").toLowerCase().includes(q) || (o.supplier || "").toLowerCase().includes(q));
  }, [orders, search]);

  const totalValue = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
  const pending = orders.filter(o => ["to receive and bill", "to bill"].includes((o.status || "").toLowerCase())).length;

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={(o, i) => o.name || String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: colors.primary }]}>{orders.length}</Text>
                <Text style={s.statLbl}>Total Orders</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#d97706" }]}>{pending}</Text>
                <Text style={s.statLbl}>Pending</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#16a34a", fontSize: 14 }]}>₹{(totalValue / 100000).toFixed(1)}L</Text>
                <Text style={s.statLbl}>Total Value</Text>
              </View>
            </View>
            <View style={s.searchBar}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.searchInput} placeholder="Search orders or suppliers..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
              {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
            </View>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item: o }) => {
          const sc = STATUS_CONFIG[(o.status || "draft").toLowerCase()] || STATUS_CONFIG.draft;
          const pct = o.per_received ?? 0;
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.orderInfo}>
                  <Text style={s.orderName} numberOfLines={1}>{o.name || "Purchase Order"}</Text>
                  <Text style={s.supplier} numberOfLines={1}>{o.supplier || "Unknown Supplier"}</Text>
                </View>
                <View>
                  <Text style={s.amount}>₹{(o.grand_total || 0).toLocaleString("en-IN")}</Text>
                  <View style={[s.badge, { backgroundColor: sc.bg, alignSelf: "flex-end", marginTop: 4 }]}>
                    <Text style={[s.badgeText, { color: sc.color }]}>{o.status || "Draft"}</Text>
                  </View>
                </View>
              </View>
              {pct > 0 && (
                <View style={s.progressRow}>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={s.progressText}>{pct}% received</Text>
                </View>
              )}
              <View style={s.cardFooter}>
                <View style={s.dateRow}>
                  <Feather name="calendar" size={12} color={colors.mutedForeground} />
                  <Text style={s.date}>{fmtDate(o.transaction_date)}</Text>
                </View>
                {o.items_count !== undefined && (
                  <View style={s.itemsRow}>
                    <Feather name="package" size={12} color={colors.mutedForeground} />
                    <Text style={s.itemsText}>{o.items_count} item{o.items_count !== 1 ? "s" : ""}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="shopping-cart" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No purchase orders</Text>
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
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, marginBottom: 12, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    orderInfo: { flex: 1, marginRight: 10 },
    orderName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground },
    supplier: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    amount: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.primary, textAlign: "right" },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    progressTrack: { flex: 1, height: 6, backgroundColor: c.muted, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 3 },
    progressText: { fontSize: 11, color: "#16a34a", fontFamily: "Inter_500Medium" },
    cardFooter: { flexDirection: "row", gap: 16 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    date: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    itemsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    itemsText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
