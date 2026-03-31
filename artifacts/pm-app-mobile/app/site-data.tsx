import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface SiteReport {
  id?: number;
  site_name?: string;
  site?: string;
  report_date?: string;
  date?: string;
  status?: string;
  weather?: string;
  manpower?: number;
  progress_notes?: string;
  notes?: string;
  submitted_by?: string;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }); }
  catch { return d; }
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  submitted: { color: "#16a34a", bg: "#16a34a18" },
  draft: { color: "#d97706", bg: "#d9770618" },
  approved: { color: "#3b82f6", bg: "#3b82f618" },
};

const WEATHER_ICON: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  sunny: "sun",
  cloudy: "cloud",
  rainy: "cloud-rain",
  windy: "wind",
};

export default function SiteDataScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<SiteReport[]>("/api/site-data");
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={s.root}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r, i) => String(r.id || i)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={s.summaryCard}>
              <Feather name="activity" size={28} color={colors.primary} />
              <View>
                <Text style={s.summaryNum}>{reports.length}</Text>
                <Text style={s.summaryLbl}>Total Reports</Text>
              </View>
              <View>
                <Text style={[s.summaryNum, { color: "#16a34a" }]}>{reports.filter(r => (r.status || "").toLowerCase() === "submitted").length}</Text>
                <Text style={s.summaryLbl}>Submitted</Text>
              </View>
            </View>
          }
          renderItem={({ item: r }) => {
            const siteName = r.site_name || r.site || "Site Report";
            const date = r.report_date || r.date;
            const notes = r.progress_notes || r.notes;
            const sc = STATUS_CONFIG[(r.status || "draft").toLowerCase()] || STATUS_CONFIG.draft;
            const weatherKey = (r.weather || "").toLowerCase();
            const weatherIcon = WEATHER_ICON[weatherKey] || "sun";
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.siteInfo}>
                    <Text style={s.siteName} numberOfLines={1}>{siteName}</Text>
                    <Text style={s.date}>{fmtDate(date)}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.color }]}>{r.status || "Draft"}</Text>
                  </View>
                </View>

                <View style={s.metricsRow}>
                  {r.weather && (
                    <View style={s.metric}>
                      <Feather name={weatherIcon} size={14} color={colors.mutedForeground} />
                      <Text style={s.metricText}>{r.weather}</Text>
                    </View>
                  )}
                  {r.manpower !== undefined && (
                    <View style={s.metric}>
                      <Feather name="users" size={14} color={colors.mutedForeground} />
                      <Text style={s.metricText}>{r.manpower} workers</Text>
                    </View>
                  )}
                  {r.submitted_by && (
                    <View style={s.metric}>
                      <Feather name="user" size={14} color={colors.mutedForeground} />
                      <Text style={s.metricText}>{r.submitted_by}</Text>
                    </View>
                  )}
                </View>

                {!!notes && <Text style={s.notes} numberOfLines={3}>{notes}</Text>}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="map-pin" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No site reports found</Text>
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
    summaryCard: { flexDirection: "row", alignItems: "center", gap: 20, backgroundColor: c.card, borderRadius: c.radius + 4, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
    summaryNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.primary },
    summaryLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    siteInfo: { flex: 1, marginRight: 10 },
    siteName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    date: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    metricsRow: { flexDirection: "row", gap: 16, marginBottom: 10, flexWrap: "wrap" },
    metric: { flexDirection: "row", alignItems: "center", gap: 5 },
    metricText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    notes: { fontSize: 13, color: c.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
