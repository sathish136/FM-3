import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface LeaveApp {
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
  description?: string;
}

interface LeaveType {
  name: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  approved: { color: "#16a34a", bg: "#16a34a18" },
  rejected: { color: "#dc2626", bg: "#dc262618" },
  open: { color: "#d97706", bg: "#d9770618" },
  cancelled: { color: "#6b7a90", bg: "#6b7a9018" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function LeaveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveApp[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ leave_type: "", from_date: "", to_date: "", description: "" });
  const s = styles(colors, insets);

  async function load() {
    try {
      const [leavesData, typesData] = await Promise.all([
        apiFetch<LeaveApp[]>("/api/hrms/leave-applications"),
        apiFetch<LeaveType[]>("/api/hrms/leave-types").catch(() => []),
      ]);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
      setLeaveTypes(Array.isArray(typesData) ? typesData : []);
    } catch { setLeaves([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function applyLeave() {
    if (!form.from_date || !form.to_date || !form.leave_type) return;
    setApplying(true);
    try {
      await apiFetch("/api/hrms/leave-applications", {
        method: "POST",
        body: JSON.stringify({ ...form, employee_email: user?.email }),
      });
      setShowModal(false);
      setForm({ leave_type: "", from_date: "", to_date: "", description: "" });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch (e: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setApplying(false); }
  }

  const summary = {
    total: leaves.length,
    approved: leaves.filter(l => l.status.toLowerCase() === "approved").length,
    pending: leaves.filter(l => l.status.toLowerCase() === "open").length,
  };

  return (
    <View style={s.root}>
      <FlatList
        data={leaves}
        keyExtractor={l => l.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              {[
                { label: "Total", value: summary.total, color: colors.primary },
                { label: "Approved", value: summary.approved, color: "#16a34a" },
                { label: "Pending", value: summary.pending, color: "#d97706" },
              ].map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <Pressable style={({ pressed }) => [s.applyBtn, pressed && { opacity: 0.85 }]} onPress={() => setShowModal(true)}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={s.applyText}>Apply Leave</Text>
            </Pressable>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}
          </View>
        }
        renderItem={({ item: l }) => {
          const sc = STATUS_CONFIG[l.status.toLowerCase()] || STATUS_CONFIG.open;
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.leaveType}>{l.leave_type}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.color }]}>{l.status}</Text>
                </View>
              </View>
              <Text style={s.empName}>{l.employee_name}</Text>
              <View style={s.dateRow}>
                <Feather name="calendar" size={13} color={colors.mutedForeground} />
                <Text style={s.dateText}>{fmtDate(l.from_date)} → {fmtDate(l.to_date)}</Text>
                <Text style={s.daysText}>· {l.total_leave_days} day{l.total_leave_days !== 1 ? "s" : ""}</Text>
              </View>
              {!!l.description && <Text style={s.desc} numberOfLines={2}>{l.description}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="calendar" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No leave applications</Text>
          </View>
        ) : null}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: 24 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Apply Leave</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.fieldLabel}>Leave Type</Text>
            <View style={s.fieldBox}>
              <TextInput style={s.fieldInput} placeholder="e.g. Sick Leave" placeholderTextColor={colors.mutedForeground} value={form.leave_type} onChangeText={t => setForm(f => ({ ...f, leave_type: t }))} />
            </View>
            <Text style={s.fieldLabel}>From Date (YYYY-MM-DD)</Text>
            <View style={s.fieldBox}>
              <TextInput style={s.fieldInput} placeholder="2026-04-01" placeholderTextColor={colors.mutedForeground} value={form.from_date} onChangeText={t => setForm(f => ({ ...f, from_date: t }))} />
            </View>
            <Text style={s.fieldLabel}>To Date (YYYY-MM-DD)</Text>
            <View style={s.fieldBox}>
              <TextInput style={s.fieldInput} placeholder="2026-04-03" placeholderTextColor={colors.mutedForeground} value={form.to_date} onChangeText={t => setForm(f => ({ ...f, to_date: t }))} />
            </View>
            <Text style={s.fieldLabel}>Reason (optional)</Text>
            <View style={[s.fieldBox, { height: 80 }]}>
              <TextInput style={[s.fieldInput, { height: 70 }]} placeholder="Reason for leave..." placeholderTextColor={colors.mutedForeground} value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} multiline />
            </View>
            <Pressable style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]} onPress={applyLeave} disabled={applying}>
              {applying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Submit Application</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    list: { padding: 16, paddingBottom: insets.bottom + 40 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.primary, borderRadius: c.radius + 2, padding: 14, marginBottom: 16 },
    applyText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    leaveType: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    empName: { fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateText: { fontSize: 13, color: c.foreground, fontFamily: "Inter_400Regular" },
    daysText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    desc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    modal: { flex: 1, backgroundColor: c.background },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    modalBody: { padding: 20 },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 6 },
    fieldBox: { backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 48, justifyContent: "center", marginBottom: 16 },
    fieldInput: { fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    submitBtn: { backgroundColor: c.primary, borderRadius: c.radius + 2, padding: 16, alignItems: "center", marginTop: 8 },
    submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
