import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
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
  tasks_count?: number;
  completion_percentage?: number;
}

interface AnalyticsSummary {
  projects?: number;
  active_tasks?: number;
  campaigns?: number;
  leads?: number;
}

const STATUS_COLOR: Record<string, string> = {
  active: "#16A34A",
  "in-progress": "#0EA5E9",
  completed: "#6B7A90",
  "on-hold": "#D97706",
  planning: "#7C3AED",
};

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

  async function load() {
    try {
      const [sum, projs] = await Promise.all([
        apiFetch<AnalyticsSummary>("/api/analytics/summary").catch(() => ({})),
        apiFetch<ProjectSummary[]>("/api/projects").catch(() => []),
      ]);
      setAnalytics(sum);
      setProjects(Array.isArray(projs) ? projs.slice(0, 5) : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const s = styles(colors, insets);

  const stats = [
    { icon: "folder" as const, label: "Projects", value: analytics?.projects ?? projects.length, color: colors.primary },
    { icon: "check-square" as const, label: "Active Tasks", value: analytics?.active_tasks ?? 0, color: "#16A34A" },
    { icon: "users" as const, label: "Campaigns", value: analytics?.campaigns ?? 0, color: "#7C3AED" },
    { icon: "target" as const, label: "Leads", value: analytics?.leads ?? 0, color: "#D97706" },
  ];

  const quickActions = [
    { icon: "folder-plus" as const, label: "New Project", color: colors.primary, route: "/projects" },
    { icon: "calendar" as const, label: "Calendar", color: "#16A34A", route: "/calendar" },
    { icon: "mail" as const, label: "Inbox", color: "#0EA5E9", route: "/inbox" },
    { icon: "more-horizontal" as const, label: "More", color: "#7C3AED", route: "/more" },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{firstName}</Text>
          </View>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatar, { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: colors.primary, fontSize: 18, fontFamily: "Inter_700Bold" }}>
                {firstName[0]?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={s.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: stat.color + "18" }]}>
                  <Feather name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Access</Text>
        <View style={s.actionsRow}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(a.route as any)}
            >
              <View style={[s.actionIcon, { backgroundColor: a.color + "18" }]}>
                <Feather name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Projects */}
        <Text style={s.sectionTitle}>Recent Projects</Text>
        {projects.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="folder" size={32} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No projects yet</Text>
          </View>
        ) : (
          projects.map((p) => (
            <View key={p.id} style={s.projCard}>
              <View style={s.projRow}>
                <Text style={s.projName} numberOfLines={1}>{p.name}</Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLOR[p.status?.toLowerCase()] || colors.muted) + "22" }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[p.status?.toLowerCase()] || colors.mutedForeground }]}>
                    {p.status || "Unknown"}
                  </Text>
                </View>
              </View>
              {p.tasks_count !== undefined && (
                <Text style={s.projMeta}>{p.tasks_count} tasks</Text>
              )}
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number }) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      paddingTop: isWeb ? insets.top + 67 : insets.top + 16,
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    greeting: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    name: { fontSize: 24, color: c.foreground, fontFamily: "Inter_700Bold", marginTop: 2 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: "44%",
      backgroundColor: c.card,
      borderRadius: c.radius + 2,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: c.foreground },
    statLabel: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    sectionTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: c.foreground,
      marginBottom: 12,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    actionBtn: { alignItems: "center", flex: 1 },
    actionIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    actionLabel: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_500Medium", textAlign: "center" },
    projCard: {
      backgroundColor: c.card,
      borderRadius: c.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    projRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    projName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    projMeta: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
