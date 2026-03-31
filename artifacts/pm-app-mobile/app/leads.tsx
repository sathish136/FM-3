import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Lead {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  notes?: string;
  created_at?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  new: { color: "#3b82f6", bg: "#3b82f618" },
  qualified: { color: "#7c3aed", bg: "#7c3aed18" },
  converted: { color: "#16a34a", bg: "#16a34a18" },
  lost: { color: "#dc2626", bg: "#dc262618" },
};

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", source: "", notes: "" });
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Lead[]>("/api/leads");
      setLeads(Array.isArray(data) ? data : []);
    } catch { setLeads([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = leads;
    if (statusFilter !== "All") list = list.filter(l => l.status?.toLowerCase() === statusFilter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
    }
    return list;
  }, [leads, statusFilter, search]);

  async function createLead() {
    if (!form.name) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/leads", { method: "POST", body: JSON.stringify({ ...form, status: "new" }) });
      setShowModal(false);
      setForm({ name: "", company: "", email: "", phone: "", source: "", notes: "" });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    finally { setSubmitting(false); }
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

  const AVATAR_COLORS = ["#6366f1","#3b82f6","#0d9488","#16a34a","#d97706","#dc2626","#7c3aed","#ec4899"];
  function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={l => String(l.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              {[
                { label: "Total", value: stats.total, color: colors.primary },
                { label: "New", value: stats.new, color: "#3b82f6" },
                { label: "Qualified", value: stats.qualified, color: "#7c3aed" },
                { label: "Converted", value: stats.converted, color: "#16a34a" },
              ].map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={s.searchRow}>
              <View style={s.searchBar}>
                <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput style={s.searchInput} placeholder="Search leads..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
              </View>
              <Pressable style={[s.addBtn]} onPress={() => setShowModal(true)}>
                <Feather name="plus" size={20} color="#fff" />
              </Pressable>
            </View>

            <FlatList
              data={["All", "New", "Qualified", "Converted", "Lost"]}
              keyExtractor={s => s}
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
              renderItem={({ item: f }) => (
                <Pressable style={[s.filterChip, statusFilter === f && { backgroundColor: colors.primary }]} onPress={() => setStatusFilter(f)}>
                  <Text style={[s.filterText, statusFilter === f && { color: "#fff" }]}>{f}</Text>
                </Pressable>
              )}
            />
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
          </View>
        }
        renderItem={({ item: l }) => {
          const sc = STATUS_CONFIG[l.status?.toLowerCase()] || STATUS_CONFIG.new;
          const ac = avatarColor(l.name);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: ac + "20" }]}>
                  <Text style={[s.avatarText, { color: ac }]}>{l.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.leadName} numberOfLines={1}>{l.name}</Text>
                  {!!l.company && <Text style={s.company} numberOfLines={1}>{l.company}</Text>}
                </View>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.color }]}>{l.status}</Text>
                </View>
              </View>
              <View style={s.contactRow}>
                {!!l.email && <View style={s.contactItem}><Feather name="mail" size={12} color={colors.mutedForeground} /><Text style={s.contactText} numberOfLines={1}>{l.email}</Text></View>}
                {!!l.phone && <View style={s.contactItem}><Feather name="phone" size={12} color={colors.mutedForeground} /><Text style={s.contactText}>{l.phone}</Text></View>}
              </View>
              {!!l.source && <Text style={s.source}>Source: {l.source}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="target" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No leads found</Text>
          </View>
        ) : null}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: 24 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add New Lead</Text>
            <Pressable onPress={() => setShowModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            {[
              { label: "Full Name *", key: "name", placeholder: "Contact name" },
              { label: "Company", key: "company", placeholder: "Company name" },
              { label: "Email", key: "email", placeholder: "email@example.com" },
              { label: "Phone", key: "phone", placeholder: "+91 99999 99999" },
              { label: "Source", key: "source", placeholder: "Website, Referral, etc." },
              { label: "Notes", key: "notes", placeholder: "Additional notes..." },
            ].map(field => (
              <View key={field.key}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <View style={s.fieldBox}>
                  <TextInput style={s.fieldInput} placeholder={field.placeholder} placeholderTextColor={colors.mutedForeground} value={(form as any)[field.key]} onChangeText={t => setForm(f => ({ ...f, [field.key]: t }))} />
                </View>
              </View>
            ))}
            <Pressable style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]} onPress={createLead} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Create Lead</Text>}
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
    statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 10, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
    statLbl: { fontSize: 10, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    addBtn: { width: 44, height: 44, backgroundColor: c.primary, borderRadius: c.radius, alignItems: "center", justifyContent: "center" },
    filterRow: { gap: 8, paddingBottom: 10 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.muted },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
    cardInfo: { flex: 1 },
    leadName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    company: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    contactRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
    contactItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    contactText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    source: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 6 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
    modal: { flex: 1, backgroundColor: c.background },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    modalBody: { padding: 20 },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 6 },
    fieldBox: { backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 48, justifyContent: "center", marginBottom: 14 },
    fieldInput: { fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    submitBtn: { backgroundColor: c.primary, borderRadius: c.radius + 2, padding: 16, alignItems: "center", marginTop: 8 },
    submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
