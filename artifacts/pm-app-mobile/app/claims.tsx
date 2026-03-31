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

interface Claim {
  name: string;
  employee_name: string;
  expense_claim_type?: string;
  posting_date: string;
  total_claimed_amount: number;
  approval_status: string;
  remark?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  approved: { color: "#16a34a", bg: "#16a34a18" },
  rejected: { color: "#dc2626", bg: "#dc262618" },
  draft: { color: "#d97706", bg: "#d9770618" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtAmount(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ClaimsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ expense_type: "", amount: "", remark: "", date: new Date().toISOString().split("T")[0] });
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Claim[]>("/api/hrms/expense-claims");
      setClaims(Array.isArray(data) ? data : []);
    } catch { setClaims([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function submitClaim() {
    if (!form.expense_type || !form.amount) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/hrms/expense-claims", {
        method: "POST",
        body: JSON.stringify({ ...form, employee_email: user?.email, total_claimed_amount: parseFloat(form.amount) }),
      });
      setShowModal(false);
      setForm({ expense_type: "", amount: "", remark: "", date: new Date().toISOString().split("T")[0] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setSubmitting(false); }
  }

  const totalApproved = claims.filter(c => c.approval_status?.toLowerCase() === "approved").reduce((a, c) => a + (c.total_claimed_amount || 0), 0);
  const totalPending = claims.filter(c => c.approval_status?.toLowerCase() === "draft").reduce((a, c) => a + (c.total_claimed_amount || 0), 0);

  return (
    <View style={s.root}>
      <FlatList
        data={claims}
        keyExtractor={c => c.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#16a34a" }]}>{fmtAmount(totalApproved)}</Text>
                <Text style={s.statLbl}>Approved</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#d97706" }]}>{fmtAmount(totalPending)}</Text>
                <Text style={s.statLbl}>Pending</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]} onPress={() => setShowModal(true)}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={s.addText}>New Claim</Text>
            </Pressable>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}
          </View>
        }
        renderItem={({ item: c }) => {
          const sc = STATUS_CONFIG[c.approval_status?.toLowerCase()] || STATUS_CONFIG.draft;
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.claimType}>
                  <Feather name="file-text" size={16} color={colors.primary} />
                  <Text style={s.claimTypeText}>{c.expense_claim_type || "Expense"}</Text>
                </View>
                <Text style={s.amount}>{fmtAmount(c.total_claimed_amount || 0)}</Text>
              </View>
              <Text style={s.empName}>{c.employee_name}</Text>
              <View style={s.cardFooter}>
                <Text style={s.date}>{fmtDate(c.posting_date)}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.color }]}>{c.approval_status}</Text>
                </View>
              </View>
              {!!c.remark && <Text style={s.remark} numberOfLines={2}>{c.remark}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No expense claims</Text>
          </View>
        ) : null}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: 24 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Expense Claim</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            {[
              { label: "Expense Type", key: "expense_type", placeholder: "e.g. Travel, Food" },
              { label: "Amount (₹)", key: "amount", placeholder: "0.00" },
              { label: "Date (YYYY-MM-DD)", key: "date", placeholder: "2026-04-01" },
              { label: "Remarks", key: "remark", placeholder: "Description..." },
            ].map(field => (
              <View key={field.key}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <View style={s.fieldBox}>
                  <TextInput
                    style={s.fieldInput}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={(form as any)[field.key]}
                    onChangeText={t => setForm(f => ({ ...f, [field.key]: t }))}
                    keyboardType={field.key === "amount" ? "decimal-pad" : "default"}
                  />
                </View>
              </View>
            ))}
            <Pressable style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]} onPress={submitClaim} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Submit Claim</Text>}
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
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.primary, borderRadius: c.radius + 2, padding: 14, marginBottom: 16 },
    addText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    claimType: { flexDirection: "row", alignItems: "center", gap: 6 },
    claimTypeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground },
    amount: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.primary },
    empName: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    date: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    remark: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8, fontStyle: "italic" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
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
