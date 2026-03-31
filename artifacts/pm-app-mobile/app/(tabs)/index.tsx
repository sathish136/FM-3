import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  progress?: number;
  tasks_count?: number;
}

interface AnalyticsSummary {
  projects?: number;
  active_tasks?: number;
  campaigns?: number;
  leads?: number;
  employees?: number;
  revenue?: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active: { color: "#16a34a", bg: "#16a34a18" },
  planning: { color: "#7c3aed", bg: "#7c3aed18" },
  on_hold: { color: "#d97706", bg: "#d9770618" },
  completed: { color: "#6b7a90", bg: "#6b7a9018" },
};

const QUICK_LINKS = [
  { icon: "layout" as const, label: "Board", color: "#6366f1", route: "/kanban" },
  { icon: "message-circle" as const, label: "Chat", color: "#16a34a", route: "/chat" },
  { icon: "users" as const, label: "HRMS", color: "#7c3aed", route: "/hrms" },
  { icon: "target" as const, label: "Leads", color: "#ec4899", route: "/leads" },
  { icon: "shopping-cart" as const, label: "Purchase", color: "#ea580c", route: "/purchase" },
  { icon: "bar-chart-2" as const, label: "Reports", color: "#d97706", route: "/reports" },
  { icon: "credit-card" as const, label: "Payments", color: "#dc2626", route: "/payments" },
  { icon: "box" as const, label: "Stores", color: "#0d9488", route: "/stores" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const initials = (user?.full_name || "U").split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  const s = styles(colors, insets);

  async function load() {
    try {
      const [sum, projs] = await Promise.all([
        apiFetch<AnalyticsSummary>("/api/analytics/summary").catch(() => ({})),
        apiFetch<ProjectSummary[]>("/api/projects").catch(() => []),
      ]);
      setAnalytics(sum as AnalyticsSummary);
      setProjects(Array.isArray(projs) ? projs.slice(0, 5) : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function goTo(route: string) {
    await Haptics.selectionAsync();
    router.push(route as any);
  }

  const stats = [
    { icon: "folder" as const, label: "Projects", value: analytics?.projects ?? projects.length, color: colors.primary },
    { icon: "check-square" as const, label: "Active Tasks", value: analytics?.active_tasks ?? 0, color: "#16a34a" },
    { icon: "users" as const, label: "Employees", value: analytics?.employees ?? 0, color: "#7c3aed" },
    { icon: "target" as const, label: "Leads", value: analytics?.leads ?? 0, color: "#ec4899" },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <LinearGradient colors={[colors.primary + "18", colors.primary + "05"]} style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{firstName} 👋</Text>
            <View style={s.orgBadge}>
              <Feather name="building" size={10} color={colors.primary} />
              <Text style={s.orgText}>WTT International India</Text>
            </View>
          </View>
          <Pressable onPress={() => goTo("/profile")} style={({ pressed }) => pressed && { opacity: 0.8 }}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
          </Pressable>
        </LinearGradient>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={s.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: stat.color + "18" }]}>
                  <Feather name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Access */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Quick Access</Text>
        </View>
        <View style={s.quickGrid}>
          {QUICK_LINKS.map((ql) => (
            <Pressable
              key={ql.label}
              style={({ pressed }) => [s.quickTile, pressed && { opacity: 0.7 }]}
              onPress={() => goTo(ql.route)}
            >
              <View style={[s.quickIcon, { backgroundColor: ql.color + "15" }]}>
                <Feather name={ql.icon} size={20} color={ql.color} />
              </View>
              <Text style={s.quickLabel}>{ql.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Projects */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Recent Projects</Text>
          <Pressable onPress={() => goTo("/(tabs)/projects")}>
            <Text style={s.seeAll}>See all</Text>
          </Pressable>
        </View>

        {projects.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="folder" size={32} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No projects yet</Text>
          </View>
        ) : (
          projects.map((p) => {
            const sc = STATUS_CONFIG[(p.status || "").toLowerCase().replace(/[\s-]/g, "_")] || STATUS_CONFIG.planning;
            const progress = p.progress ?? 0;
            return (
              <View key={p.id} style={s.projCard}>
                <View style={s.projRow}>
                  <View style={[s.projDot, { backgroundColor: sc.color }]} />
                  <Text style={s.projName} numberOfLines={1}>{p.name}</Text>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.color }]}>{p.status}</Text>
                  </View>
                </View>
                {progress > 0 && (
                  <View style={s.progressRow}>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: sc.color }]} />
                    </View>
                    <Text style={[s.progressText, { color: sc.color }]}>{progress}%</Text>
                  </View>
                )}
                {p.tasks_count !== undefined && (
                  <Text style={s.projMeta}>{p.tasks_count} tasks</Text>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number }) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      paddingTop: isWeb ? insets.top + 67 : insets.top + 8,
      paddingBottom: 100,
    },
    hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    heroLeft: { flex: 1 },
    greeting: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    name: { fontSize: 26, color: c.foreground, fontFamily: "Inter_700Bold", marginTop: 2 },
    orgBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-start", backgroundColor: c.primary + "18", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    orgText: { fontSize: 10, color: c.primary, fontFamily: "Inter_500Medium" },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: { backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.primary },
    statsGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20, marginTop: 12 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 12, borderWidth: 1, borderColor: c.border },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.foreground },
    statLabel: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground },
    seeAll: { fontSize: 13, color: c.primary, fontFamily: "Inter_500Medium" },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginBottom: 24 },
    quickTile: { width: "22%", alignItems: "center", gap: 6 },
    quickIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    quickLabel: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_500Medium", textAlign: "center" },
    projCard: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginHorizontal: 16, marginBottom: 10 },
    projRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    projDot: { width: 8, height: 8, borderRadius: 4 },
    projName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1 },
    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    progressTrack: { flex: 1, height: 6, backgroundColor: c.muted, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 3 },
    progressText: { fontSize: 11, fontFamily: "Inter_600SemiBold", width: 32, textAlign: "right" },
    projMeta: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8, paddingHorizontal: 16 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
