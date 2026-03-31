import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface AttendanceRecord {
  name: string;
  employee_name: string;
  attendance_date: string;
  status: string;
  department?: string;
}

interface CheckinLog {
  name: string;
  employee: string;
  time: string;
  log_type: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  present: { color: "#16a34a", bg: "#16a34a18", icon: "check-circle" },
  absent: { color: "#dc2626", bg: "#dc262618", icon: "x-circle" },
  "half day": { color: "#d97706", bg: "#d9770618", icon: "clock" },
  "on leave": { color: "#7c3aed", bg: "#7c3aed18", icon: "calendar" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }); }
  catch { return d; }
}
function fmtTime(d: string) {
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [checkins, setCheckins] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const s = styles(colors, insets);

  async function load() {
    try {
      const [attData, checkinData] = await Promise.all([
        apiFetch<AttendanceRecord[]>("/api/hrms/attendance"),
        apiFetch<CheckinLog[]>("/api/hrms/checkins").catch(() => []),
      ]);
      setAttendance(Array.isArray(attData) ? attData : []);
      setCheckins(Array.isArray(checkinData) ? checkinData : []);
    } catch { setAttendance([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCheckin(logType: "IN" | "OUT") {
    setCheckingIn(true);
    try {
      await apiFetch("/api/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ log_type: logType, employee_email: user?.email }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setCheckingIn(false); }
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecord = attendance.find(a => a.attendance_date === todayStr);
  const todayCheckins = checkins.filter(c => c.time?.startsWith(todayStr));
  const lastCheckin = todayCheckins[todayCheckins.length - 1];
  const isCheckedIn = lastCheckin?.log_type === "IN";

  return (
    <View style={s.root}>
      <FlatList
        data={attendance.slice(0, 30)}
        keyExtractor={a => a.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.checkinCard}>
              <View style={s.checkinInfo}>
                <Text style={s.checkinTitle}>Today's Attendance</Text>
                <Text style={s.checkinDate}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Text>
                {lastCheckin && (
                  <Text style={s.lastCheckin}>
                    Last: {lastCheckin.log_type === "IN" ? "Checked In" : "Checked Out"} at {fmtTime(lastCheckin.time)}
                  </Text>
                )}
              </View>
              <View style={s.checkinBtns}>
                <Pressable
                  style={({ pressed }) => [s.checkinBtn, { backgroundColor: "#16a34a" }, pressed && { opacity: 0.85 }]}
                  onPress={() => handleCheckin("IN")}
                  disabled={checkingIn || isCheckedIn}
                >
                  {checkingIn ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="log-in" size={18} color="#fff" />}
                  <Text style={s.checkinBtnText}>Check In</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.checkinBtn, { backgroundColor: "#dc2626" }, pressed && { opacity: 0.85 }]}
                  onPress={() => handleCheckin("OUT")}
                  disabled={checkingIn || !isCheckedIn}
                >
                  <Feather name="log-out" size={18} color="#fff" />
                  <Text style={s.checkinBtnText}>Check Out</Text>
                </Pressable>
              </View>
            </View>

            <View style={s.statsRow}>
              {[
                { label: "Present", value: attendance.filter(a => a.status.toLowerCase() === "present").length, color: "#16a34a" },
                { label: "Absent", value: attendance.filter(a => a.status.toLowerCase() === "absent").length, color: "#dc2626" },
                { label: "Leave", value: attendance.filter(a => a.status.toLowerCase() === "on leave").length, color: "#7c3aed" },
              ].map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>Recent Attendance</Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item: a }) => {
          const key = a.status.toLowerCase();
          const sc = STATUS_CONFIG[key] || STATUS_CONFIG.present;
          return (
            <View style={s.attCard}>
              <View style={[s.attIcon, { backgroundColor: sc.bg }]}>
                <Feather name={sc.icon} size={18} color={sc.color} />
              </View>
              <View style={s.attInfo}>
                <Text style={s.attName} numberOfLines={1}>{a.employee_name}</Text>
                <Text style={s.attDate}>{fmtDate(a.attendance_date)}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: sc.bg }]}>
                <Text style={[s.badgeText, { color: sc.color }]}>{a.status}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="clock" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No attendance records</Text>
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
    checkinCard: { backgroundColor: c.card, borderRadius: c.radius + 4, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
    checkinInfo: { marginBottom: 14 },
    checkinTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.foreground },
    checkinDate: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    lastCheckin: { fontSize: 12, color: c.primary, fontFamily: "Inter_500Medium", marginTop: 6 },
    checkinBtns: { flexDirection: "row", gap: 10 },
    checkinBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: c.radius + 2, padding: 12 },
    checkinBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 10 },
    attCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, marginBottom: 8, padding: 14, borderRadius: c.radius + 2, borderWidth: 1, borderColor: c.border },
    attIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    attInfo: { flex: 1 },
    attName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground },
    attDate: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
