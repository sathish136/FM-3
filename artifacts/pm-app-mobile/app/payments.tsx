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

interface Payment {
  id?: number;
  name?: string;
  provider?: string;
  service?: string;
  amount?: number;
  due_date?: string;
  paid_date?: string;
  status?: string;
  category?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  paid: { color: "#16a34a", bg: "#16a34a18", icon: "check-circle" },
  pending: { color: "#d97706", bg: "#d9770618", icon: "clock" },
  overdue: { color: "#dc2626", bg: "#dc262618", icon: "alert-circle" },
  cancelled: { color: "#6b7a90", bg: "#6b7a9018", icon: "x-circle" },
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Payment[]>("/api/payment-tracker");
      setPayments(Array.isArray(data) ? data : []);
    } catch { setPayments([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = payments;
    if (filter !== "All") list = list.filter(p => (p.status || "pending").toLowerCase() === filter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.provider || p.service || p.name || "").toLowerCase().includes(q));
    }
    return list;
  }, [payments, filter, search]);

  const totalPaid = payments.filter(p => p.status?.toLowerCase() === "paid").reduce((a, p) => a + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status?.toLowerCase() === "pending").reduce((a, p) => a + (p.amount || 0), 0);
  const overdue = payments.filter(p => p.status?.toLowerCase() === "overdue").length;

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={(p, i) => String(p.id || i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftWidth: 3, borderLeftColor: "#16a34a" }]}>
                <Text style={[s.statNum, { color: "#16a34a" }]}>₹{(totalPaid / 1000).toFixed(0)}K</Text>
                <Text style={s.statLbl}>Paid</Text>
              </View>
              <View style={[s.statCard, { borderLeftWidth: 3, borderLeftColor: "#d97706" }]}>
                <Text style={[s.statNum, { color: "#d97706" }]}>₹{(totalPending / 1000).toFixed(0)}K</Text>
                <Text style={s.statLbl}>Pending</Text>
              </View>
              {overdue > 0 && (
                <View style={[s.statCard, { borderLeftWidth: 3, borderLeftColor: "#dc2626" }]}>
                  <Text style={[s.statNum, { color: "#dc2626" }]}>{overdue}</Text>
                  <Text style={s.statLbl}>Overdue</Text>
                </View>
              )}
            </View>

            <View style={s.searchBar}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.searchInput} placeholder="Search payments..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
            </View>

            <View style={s.filterRow}>
              {["All", "Pending", "Paid", "Overdue"].map(f => (
                <Pressable key={f} style={[s.filterChip, filter === f && { backgroundColor: colors.primary }]} onPress={() => setFilter(f)}>
                  <Text style={[s.filterText, filter === f && { color: "#fff" }]}>{f}</Text>
                </Pressable>
              ))}
            </View>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item: p }) => {
          const status = (p.status || "pending").toLowerCase();
          const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          const title = p.provider || p.service || p.name || "Payment";
          return (
            <View style={s.card}>
              <View style={[s.statusIcon, { backgroundColor: sc.bg }]}>
                <Feather name={sc.icon} size={20} color={sc.color} />
              </View>
              <View style={s.cardBody}>
                <View style={s.cardRow}>
                  <Text style={s.title} numberOfLines={1}>{title}</Text>
                  <Text style={s.amount}>₹{(p.amount || 0).toLocaleString("en-IN")}</Text>
                </View>
                {!!p.category && <Text style={s.category}>{p.category}</Text>}
                <View style={s.datesRow}>
                  <Text style={s.date}>Due: {fmtDate(p.due_date)}</Text>
                  {!!p.paid_date && <Text style={[s.date, { color: "#16a34a" }]}>Paid: {fmtDate(p.paid_date)}</Text>}
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.color }]}>{p.status || "Pending"}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="credit-card" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No payments found</Text>
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
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 12, borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, marginBottom: 10, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.muted },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    card: { flexDirection: "row", gap: 12, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    statusIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1 },
    cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    title: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1, marginRight: 8 },
    amount: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.foreground },
    category: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 6 },
    datesRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    date: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
