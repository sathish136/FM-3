import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const s = styles(colors, insets);

  const sections = [
    {
      title: "Notifications",
      items: [
        { icon: "bell" as const, label: "Push Notifications", toggle: true, value: notifications, onToggle: setNotifications },
        { icon: "mail" as const, label: "Email Alerts", toggle: true, value: emailAlerts, onToggle: setEmailAlerts },
      ],
    },
    {
      title: "Security",
      items: [
        { icon: "fingerprint" as const, label: "Biometric Login", toggle: true, value: biometric, onToggle: setBiometric },
        { icon: "lock" as const, label: "Change Password", toggle: false, onPress: () => {} },
        { icon: "shield" as const, label: "Two-Factor Auth", toggle: false, onPress: () => {} },
      ],
    },
    {
      title: "Appearance",
      items: [
        { icon: "layout" as const, label: "Compact View", toggle: true, value: compactView, onToggle: setCompactView },
      ],
    },
    {
      title: "Data & Privacy",
      items: [
        { icon: "download" as const, label: "Export My Data", toggle: false, onPress: () => {} },
        { icon: "trash-2" as const, label: "Clear Cache", toggle: false, onPress: () => {} },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle" as const, label: "Help & FAQ", toggle: false, onPress: () => {} },
        { icon: "message-circle" as const, label: "Contact Support", toggle: false, onPress: () => {} },
        { icon: "info" as const, label: "About FlowMatriX", toggle: false, onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {sections.map(section => (
        <View key={section.title} style={s.section}>
          <Text style={s.sectionTitle}>{section.title}</Text>
          <View style={s.card}>
            {section.items.map((item, i) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [s.row, i < section.items.length - 1 && s.rowBorder, !item.toggle && pressed && { opacity: 0.7 }]}
                onPress={item.toggle ? undefined : item.onPress}
              >
                <View style={[s.rowIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Feather name={item.icon} size={16} color={colors.primary} />
                </View>
                <Text style={s.rowLabel}>{item.label}</Text>
                {item.toggle ? (
                  <Switch
                    value={item.value}
                    onValueChange={async (v) => {
                      item.onToggle?.(v);
                      await Haptics.selectionAsync();
                    }}
                    trackColor={{ false: colors.muted, true: colors.primary + "80" }}
                    thumbColor={item.value ? colors.primary : colors.mutedForeground}
                  />
                ) : (
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={s.versionBox}>
        <Text style={s.versionText}>FlowMatriX v1.0.0</Text>
        <Text style={s.versionSub}>© 2026 WTT International India</Text>
      </View>
      <View style={{ height: insets.bottom + 40 }} />
    </ScrollView>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
    card: { backgroundColor: c.card, borderRadius: c.radius + 4, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: c.foreground },
    versionBox: { alignItems: "center", paddingVertical: 16 },
    versionText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    versionSub: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
  });
}
