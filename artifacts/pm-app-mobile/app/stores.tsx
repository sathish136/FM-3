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

interface StoreItem {
  item_code?: string;
  item_name?: string;
  item_group?: string;
  warehouse?: string;
  actual_qty?: number;
  reserved_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
}

export default function StoresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<StoreItem[]>("/api/stores-dashboard/stock");
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => (i.item_name || "").toLowerCase().includes(q) || (i.item_code || "").toLowerCase().includes(q));
  }, [items, search]);

  const totalValue = items.reduce((sum, i) => sum + (i.stock_value || 0), 0);
  const lowStock = items.filter(i => (i.actual_qty || 0) < 10).length;

  function getStockLevel(qty?: number): { color: string; label: string } {
    if (!qty || qty < 5) return { color: "#dc2626", label: "Critical" };
    if (qty < 20) return { color: "#d97706", label: "Low" };
    if (qty < 100) return { color: "#3b82f6", label: "Normal" };
    return { color: "#16a34a", label: "High" };
  }

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.item_code || String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: colors.primary }]}>{items.length}</Text>
                <Text style={s.statLbl}>Total Items</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#dc2626" }]}>{lowStock}</Text>
                <Text style={s.statLbl}>Low Stock</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#16a34a", fontSize: 14 }]}>₹{(totalValue / 100000).toFixed(1)}L</Text>
                <Text style={s.statLbl}>Total Value</Text>
              </View>
            </View>

            <View style={s.searchBar}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.searchInput} placeholder="Search items..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
              {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
            </View>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item }) => {
          const level = getStockLevel(item.actual_qty);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.iconBox, { backgroundColor: level.color + "18" }]}>
                  <Feather name="package" size={20} color={level.color} />
                </View>
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={1}>{item.item_name || item.item_code}</Text>
                  {!!item.item_code && item.item_name && <Text style={s.itemCode}>{item.item_code}</Text>}
                  {!!item.item_group && <Text style={s.itemGroup}>{item.item_group}</Text>}
                </View>
                <View style={s.qtyBox}>
                  <Text style={[s.qtyNum, { color: level.color }]}>{(item.actual_qty || 0).toFixed(0)}</Text>
                  <Text style={s.qtyLabel}>units</Text>
                </View>
              </View>
              <View style={s.cardFooter}>
                {!!item.warehouse && (
                  <View style={s.warehouseTag}>
                    <Feather name="home" size={11} color={colors.mutedForeground} />
                    <Text style={s.warehouseText}>{item.warehouse}</Text>
                  </View>
                )}
                {item.valuation_rate !== undefined && (
                  <Text style={s.rate}>₹{item.valuation_rate?.toLocaleString("en-IN")} / unit</Text>
                )}
                <View style={[s.levelBadge, { backgroundColor: level.color + "18" }]}>
                  <Text style={[s.levelText, { color: level.color }]}>{level.label}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="box" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No inventory items</Text>
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
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground },
    itemCode: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    itemGroup: { fontSize: 11, color: c.primary, fontFamily: "Inter_500Medium", marginTop: 2 },
    qtyBox: { alignItems: "center" },
    qtyNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
    qtyLabel: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    cardFooter: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    warehouseTag: { flexDirection: "row", alignItems: "center", gap: 4 },
    warehouseText: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    rate: { fontSize: 12, color: c.foreground, fontFamily: "Inter_500Medium", flex: 1 },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    levelText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
