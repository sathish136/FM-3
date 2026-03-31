import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface MisReport {
  month?: string;
  year?: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  orders?: number;
  projects?: number;
  employees?: number;
}

interface SummaryItem {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  sub?: string;
}

function fmtAmount(n?: number) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<MisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("This Month");
  const s = styles(colors, insets);

  const periods = ["This Month", "Last Month", "This Quarter", "This Year"];

  async function load() {
    try {
      const data = await apiFetch<MisReport>("/api/mis-report");
      setReport(data);
    } catch { setReport(null); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const items: SummaryItem[] = report ? [
    { label: "Revenue", value: fmtAmount(report.revenue), icon: "trending-up", color: "#16a34a", sub: "Total revenue" },
    { label: "Expenses", value: fmtAmount(report.expenses), icon: "trending-down", color: "#dc2626", sub: "Total expenses" },
    { label: "Profit", value: fmtAmount(report.profit), icon: "bar-chart-2", color: "#7c3aed", sub: "Net profit" },
    { label: "Orders", value: report.orders ?? 0, icon: "shopping-cart", color: "#d97706", sub: "Purchase orders" },
    { label: "Projects", value: report.projects ?? 0, icon: "folder", color: "#3b82f6", sub: "Active projects" },
    { label: "Employees", value: report.employees ?? 0, icon: "users", color: "#0d9488", sub: "Total staff" },
  ] : [];

  const profitMargin = report?.revenue && report?.profit ? Math.round((report.profit / report.revenue) * 100) : 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={s.periodRow}>
        {periods.map(p => (
          <Pressable key={p} style={[s.periodChip, selectedPeriod === p && { backgroundColor: colors.primary }]} onPress={() => setSelectedPeriod(p)}>
            <Text style={[s.periodText, selectedPeriod === p && { color: "#fff" }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : !report ? (
        <View style={s.empty}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>No report data</Text>
          <Text style={s.emptyText}>Report data unavailable for this period</Text>
        </View>
      ) : (
        <>
          {report.revenue && report.expenses ? (
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>Financial Overview</Text>
              <View style={s.profitBar}>
                <View style={[s.profitFill, { width: `${Math.min(profitMargin, 100)}%` as any, backgroundColor: profitMargin > 0 ? "#16a34a" : "#dc2626" }]} />
              </View>
              <Text style={[s.profitLabel, { color: profitMargin > 0 ? "#16a34a" : "#dc2626" }]}>
                {profitMargin > 0 ? "+" : ""}{profitMargin}% profit margin
              </Text>
            </View>
          ) : null}

          <View style={s.grid}>
            {items.map(item => (
              <View key={item.label} style={s.metricCard}>
                <View style={[s.metricIcon, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={s.metricValue}>{item.value}</Text>
                <Text style={s.metricLabel}>{item.label}</Text>
                {!!item.sub && <Text style={s.metricSub}>{item.sub}</Text>}
              </View>
            ))}
          </View>

          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Revenue vs Expenses</Text>
            {[
              { label: "Revenue", value: report.revenue || 0, color: "#16a34a", max: Math.max(report.revenue || 0, report.expenses || 0) },
              { label: "Expenses", value: report.expenses || 0, color: "#dc2626", max: Math.max(report.revenue || 0, report.expenses || 0) },
              { label: "Profit", value: report.profit || 0, color: "#7c3aed", max: Math.max(report.revenue || 0, report.expenses || 0) },
            ].map(bar => (
              <View key={bar.label} style={s.barRow}>
                <Text style={s.barLabel}>{bar.label}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${bar.max ? (bar.value / bar.max) * 100 : 0}%` as any, backgroundColor: bar.color }]} />
                </View>
                <Text style={[s.barValue, { color: bar.color }]}>{fmtAmount(bar.value)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <View style={{ height: insets.bottom + 40 }} />
    </ScrollView>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 16 },
    periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    periodChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: c.muted },
    periodText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    summaryCard: { backgroundColor: c.card, borderRadius: c.radius + 4, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
    summaryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 12 },
    profitBar: { height: 10, backgroundColor: c.muted, borderRadius: 5, overflow: "hidden", marginBottom: 6 },
    profitFill: { height: "100%", borderRadius: 5 },
    profitLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    metricCard: { width: "47%", backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border },
    metricIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    metricValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.foreground },
    metricLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground, marginTop: 2 },
    metricSub: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    chartCard: { backgroundColor: c.card, borderRadius: c.radius + 4, padding: 16, borderWidth: 1, borderColor: c.border },
    chartTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 16 },
    barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
    barLabel: { width: 64, fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_500Medium" },
    barTrack: { flex: 1, height: 8, backgroundColor: c.muted, borderRadius: 4, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 4 },
    barValue: { width: 60, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    emptyText: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
