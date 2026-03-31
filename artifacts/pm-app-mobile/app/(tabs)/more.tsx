import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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
}

const MODULES: Module[] = [
  { icon: "users", label: "HRMS", desc: "HR management", color: "#7C3AED" },
  { icon: "mic", label: "Meeting Minutes", desc: "Voice recording", color: "#0EA5E9" },
  { icon: "message-circle", label: "Chat", desc: "Team messaging", color: "#16A34A" },
  { icon: "bar-chart-2", label: "Reports", desc: "MIS & analytics", color: "#D97706" },
  { icon: "shopping-cart", label: "Purchase", desc: "Orders & vendors", color: "#EA580C" },
  { icon: "box", label: "Stores", desc: "Inventory", color: "#0D9488" },
  { icon: "credit-card", label: "Payments", desc: "Payment tracker", color: "#DC2626" },
  { icon: "map-pin", label: "Site Data", desc: "Field reports", color: "#7C3AED" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const s = styles(colors, insets);
  const firstName = user?.full_name?.split(" ")[0] || "User";

  function handleModulePress(label: string) {
    Haptics.selectionAsync();
    Alert.alert(label, `${label} module — available in the full web app.`, [{ text: "OK" }]);
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
      {/* Profile */}
      <View style={s.profileCard}>
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarText}>{firstName[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{user?.full_name || "User"}</Text>
          <Text style={s.profileEmail}>{user?.email || ""}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>WTT International</Text>
          </View>
        </View>
      </View>

      {/* Modules */}
      <Text style={s.section}>Modules</Text>
      <View style={s.grid}>
        {MODULES.map((m) => (
          <Pressable
            key={m.label}
            style={({ pressed }) => [s.tile, pressed && { opacity: 0.75 }]}
            onPress={() => handleModulePress(m.label)}
          >
            <View style={[s.tileIcon, { backgroundColor: m.color + "18" }]}>
              <Feather name={m.icon} size={24} color={m.color} />
            </View>
            <Text style={s.tileLabel}>{m.label}</Text>
            <Text style={s.tileDesc}>{m.desc}</Text>
          </Pressable>
        ))}
      </View>

      {/* Settings group */}
      <Text style={s.section}>Account</Text>
      <View style={s.listGroup}>
        {[
          { icon: "settings" as const, label: "Settings" },
          { icon: "shield" as const, label: "Security" },
          { icon: "help-circle" as const, label: "Help & Support" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [s.listItem, pressed && { opacity: 0.7 }]}
            onPress={() => handleModulePress(item.label)}
          >
            <Feather name={item.icon} size={18} color={colors.mutedForeground} />
            <Text style={s.listItemText}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
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
    profileCard: {
      backgroundColor: c.card,
      borderRadius: c.radius + 4,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 24,
      gap: 14,
    },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    avatarFallback: { backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.primary },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.foreground },
    profileEmail: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: c.primary + "18",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 6,
    },
    badgeText: { fontSize: 11, color: c.primary, fontFamily: "Inter_500Medium" },
    section: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: c.mutedForeground,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 12,
    },
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
    tileDesc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    listGroup: {
      backgroundColor: c.card,
      borderRadius: c.radius + 2,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      marginBottom: 20,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    listItemText: { flex: 1, fontSize: 15, color: c.foreground, fontFamily: "Inter_400Regular" },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.destructive + "12",
      borderRadius: c.radius + 2,
      borderWidth: 1,
      borderColor: c.destructive + "30",
      padding: 14,
      marginBottom: 20,
    },
    logoutText: { fontSize: 15, color: c.destructive, fontFamily: "Inter_600SemiBold" },
    version: { textAlign: "center", fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
