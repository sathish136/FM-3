import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Module {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  desc: string;
  color: string;
  route: string;
}

const MODULES: Module[] = [
  { icon: "users", label: "HRMS", desc: "HR & employees", color: "#7c3aed", route: "/hrms" },
  { icon: "message-circle", label: "FlowTalk", desc: "Team chat", color: "#16a34a", route: "/chat" },
  { icon: "layout", label: "Project Board", desc: "Kanban tasks", color: "#6366f1", route: "/kanban" },
  { icon: "bar-chart-2", label: "Reports", desc: "MIS & analytics", color: "#d97706", route: "/reports" },
  { icon: "shopping-cart", label: "Purchase", desc: "Orders & vendors", color: "#ea580c", route: "/purchase" },
  { icon: "box", label: "Stores", desc: "Inventory", color: "#0d9488", route: "/stores" },
  { icon: "credit-card", label: "Payments", desc: "Payment tracker", color: "#dc2626", route: "/payments" },
  { icon: "map-pin", label: "Site Data", desc: "Field reports", color: "#7c3aed", route: "/site-data" },
  { icon: "target", label: "Leads", desc: "CRM", color: "#ec4899", route: "/leads" },
  { icon: "radio", label: "Campaigns", desc: "Marketing", color: "#8b5cf6", route: "/campaigns" },
];

const HR_QUICK: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; color: string; route: string }[] = [
  { icon: "calendar", label: "Leave", color: "#7c3aed", route: "/leave" },
  { icon: "clock", label: "Attendance", color: "#0d9488", route: "/attendance" },
  { icon: "file-text", label: "Claims", color: "#d97706", route: "/claims" },
  { icon: "users", label: "Team", color: "#3b82f6", route: "/team" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const s = styles(colors, insets);
  const firstName = user?.full_name?.split(" ")[0] || "User";
  const initials = (user?.full_name || "U").split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();

  async function go(route: string) {
    await Haptics.selectionAsync();
    router.push(route as any);
  }

  async function handleLogout() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <Pressable
        style={({ pressed }) => [s.profileCard, pressed && { opacity: 0.9 }]}
        onPress={() => go("/profile")}
      >
        <LinearGradient
          colors={[colors.primary + "22", colors.primary + "08"]}
          style={s.profileGradient}
        >
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.full_name || "User"}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{user?.email || ""}</Text>
            <View style={s.orgBadge}>
              <Text style={s.orgText}>WTT International India</Text>
            </View>
          </View>
          <View style={s.chevronBox}>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </View>
        </LinearGradient>
      </Pressable>

      {/* HR Quick Access */}
      <View style={s.sectionHeader}>
        <Feather name="users" size={14} color={colors.mutedForeground} />
        <Text style={s.section}>HR Quick Access</Text>
      </View>
      <View style={s.quickRow}>
        {HR_QUICK.map(ql => (
          <Pressable
            key={ql.label}
            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.7 }]}
            onPress={() => go(ql.route)}
          >
            <View style={[s.quickIcon, { backgroundColor: ql.color + "18" }]}>
              <Feather name={ql.icon} size={20} color={ql.color} />
            </View>
            <Text style={s.quickLabel}>{ql.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Modules */}
      <View style={s.sectionHeader}>
        <Feather name="grid" size={14} color={colors.mutedForeground} />
        <Text style={s.section}>Modules</Text>
      </View>
      <View style={s.grid}>
        {MODULES.map((m) => (
          <Pressable
            key={m.label}
            style={({ pressed }) => [s.tile, pressed && { opacity: 0.75 }]}
            onPress={() => go(m.route)}
          >
            <View style={[s.tileIcon, { backgroundColor: m.color + "15" }]}>
              <Feather name={m.icon} size={22} color={m.color} />
            </View>
            <Text style={s.tileLabel}>{m.label}</Text>
            <Text style={s.tileDesc}>{m.desc}</Text>
          </Pressable>
        ))}
      </View>

      {/* Account settings */}
      <View style={s.sectionHeader}>
        <Feather name="user" size={14} color={colors.mutedForeground} />
        <Text style={s.section}>Account</Text>
      </View>
      <View style={s.listGroup}>
        {[
          { icon: "bell" as const, label: "Notifications", route: "/notifications" },
          { icon: "settings" as const, label: "Settings", route: "/settings" },
          { icon: "shield" as const, label: "Security", route: "/settings" },
        ].map((item, i, arr) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [s.listItem, i < arr.length - 1 && s.listItemBorder, pressed && { opacity: 0.7 }]}
            onPress={() => go(item.route)}
          >
            <View style={[s.listItemIcon, { backgroundColor: colors.primary + "12" }]}>
              <Feather name={item.icon} size={16} color={colors.primary} />
            </View>
            <Text style={s.listItemText}>{item.label}</Text>
            <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={17} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </Pressable>

      <Text style={s.version}>FlowMatriX v1.0 · WTT International India</Text>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      paddingTop: isWeb ? insets.top + 67 : 16,
      paddingHorizontal: 16,
      paddingBottom: isWeb ? insets.bottom + 34 : 100,
    },
    profileCard: { borderRadius: c.radius + 6, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: c.border },
    profileGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
    avatar: { width: 58, height: 58, borderRadius: 29 },
    avatarFallback: { backgroundColor: c.primary + "25", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.primary },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.foreground },
    profileEmail: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    orgBadge: { alignSelf: "flex-start", backgroundColor: c.primary + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
    orgText: { fontSize: 10, color: c.primary, fontFamily: "Inter_500Medium" },
    chevronBox: { padding: 4 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    section: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: c.mutedForeground,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    quickCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.border },
    quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
    quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.foreground },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    tile: {
      width: "47%",
      backgroundColor: c.card,
      borderRadius: c.radius + 2,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    tileLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 2 },
    tileDesc: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    listGroup: {
      backgroundColor: c.card,
      borderRadius: c.radius + 4,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      marginBottom: 20,
    },
    listItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    listItemBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    listItemIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    listItemText: { flex: 1, fontSize: 15, color: c.foreground, fontFamily: "Inter_400Regular" },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.destructive + "10",
      borderRadius: c.radius + 4,
      borderWidth: 1,
      borderColor: c.destructive + "25",
      padding: 14,
      marginBottom: 20,
    },
    logoutText: { fontSize: 15, color: c.destructive, fontFamily: "Inter_600SemiBold" },
    version: { textAlign: "center", fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 },
  });
}
