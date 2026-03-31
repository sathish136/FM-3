import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface UserProfile {
  email: string;
  full_name: string;
  photo?: string | null;
  designation?: string;
  department?: string;
  mobile_no?: string;
  company?: string;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const s = styles(colors, insets);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    apiFetch<UserProfile>(`/api/auth/me?email=${encodeURIComponent(user.email)}`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  const displayName = profile?.full_name || user?.full_name || "User";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  const photo = user?.photo || null;

  async function handleLogout() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  const infoRows = [
    { icon: "mail" as const, label: "Email", value: profile?.email || user?.email },
    { icon: "briefcase" as const, label: "Designation", value: profile?.designation },
    { icon: "layers" as const, label: "Department", value: profile?.department },
    { icon: "phone" as const, label: "Mobile", value: profile?.mobile_no },
    { icon: "building" as const, label: "Company", value: profile?.company || "WTT International India" },
  ].filter(r => r.value);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.primary + "30", colors.primary + "08"]}
        style={s.heroBg}
      >
        <View style={s.heroContent}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.orgBadge}>
            <Feather name="building" size={11} color={colors.primary} />
            <Text style={s.orgText}>WTT International India</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Profile Information</Text>
          <View style={s.card}>
            {infoRows.map((row, i) => (
              <View key={row.label} style={[s.row, i < infoRows.length - 1 && s.rowBorder]}>
                <View style={[s.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name={row.icon} size={16} color={colors.primary} />
                </View>
                <View style={s.rowContent}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  <Text style={s.rowValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.card}>
          {[
            { icon: "settings" as const, label: "Settings", onPress: () => router.push("/settings") },
            { icon: "bell" as const, label: "Notifications", onPress: () => router.push("/notifications") },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [s.row, i === 0 && s.rowBorder, pressed && { opacity: 0.7 }]}
              onPress={item.onPress}
            >
              <View style={[s.rowIcon, { backgroundColor: colors.muted }]}>
                <Feather name={item.icon} size={16} color={colors.mutedForeground} />
              </View>
              <Text style={[s.rowValue, { flex: 1 }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </Pressable>

      <Text style={s.version}>FlowMatriX · WTT International India</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingBottom: insets.bottom + 40 },
    heroBg: { paddingTop: 32, paddingBottom: 32 },
    heroContent: { alignItems: "center", paddingHorizontal: 24 },
    avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
    avatarFallback: { backgroundColor: c.primary + "25", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: c.primary },
    name: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.foreground, textAlign: "center" },
    email: { fontSize: 14, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
    orgBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.primary + "15", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 12 },
    orgText: { fontSize: 12, color: c.primary, fontFamily: "Inter_500Medium" },
    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
    card: { backgroundColor: c.card, borderRadius: c.radius + 4, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.mutedForeground, marginBottom: 2 },
    rowValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: c.destructive + "12", borderRadius: c.radius + 4, borderWidth: 1, borderColor: c.destructive + "30", padding: 14, marginHorizontal: 16, marginTop: 24 },
    logoutText: { fontSize: 15, color: c.destructive, fontFamily: "Inter_600SemiBold" },
    version: { textAlign: "center", fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 20 },
  });
}
