import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface Meeting {
  id?: number;
  name?: string;
  title?: string;
  date?: string;
  meeting_date?: string;
  attendees?: string | number;
  status?: string;
  location?: string;
  agenda?: string;
}

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  completed: { fg: "#16a34a", bg: "#dcfce7" },
  scheduled: { fg: "#2563eb", bg: "#dbeafe" },
  cancelled: { fg: "#dc2626", bg: "#fee2e2" },
  pending: { fg: "#d97706", bg: "#fef3c7" },
};

function StatusBadge({ status }: { status?: string }) {
  const key = (status || "scheduled").toLowerCase();
  const cfg = STATUS_COLORS[key] || STATUS_COLORS.scheduled;
  return (
    <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ color: cfg.fg, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>{status || "Scheduled"}</Text>
    </View>
  );
}

export default function MeetingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", location: "", agenda: "" });
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Meeting[]>("/api/meeting-minutes").catch(() => []);
      setMeetings(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = meetings.filter((m) => {
    const q = search.toLowerCase();
    return !q || (m.title || m.name || "").toLowerCase().includes(q) || (m.location || "").toLowerCase().includes(q);
  });

  async function createMeeting() {
    if (!form.title.trim()) return;
    try {
      await apiFetch("/api/meeting-minutes", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({ title: "", date: "", location: "", agenda: "" });
      load();
    } catch (_) {}
  }

  return (
    <View style={s.root}>
      {/* Search + Action bar */}
      <View style={s.topBar}>
        <View style={s.searchBox}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            placeholder="Search meetings…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={s.addBtn} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No meetings found</Text>
            </View>
          ) : (
            filtered.map((m, i) => (
              <View key={m.id ?? i} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.iconBox}>
                    <Feather name="calendar" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={1}>{m.title || m.name || "Meeting"}</Text>
                    <Text style={s.cardDate}>{m.meeting_date || m.date || "—"}</Text>
                  </View>
                  <StatusBadge status={m.status} />
                </View>
                {m.location ? (
                  <View style={s.metaRow}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={s.metaText}>{m.location}</Text>
                  </View>
                ) : null}
                {m.attendees ? (
                  <View style={s.metaRow}>
                    <Feather name="users" size={12} color={colors.mutedForeground} />
                    <Text style={s.metaText}>{m.attendees} attendees</Text>
                  </View>
                ) : null}
                {m.agenda ? (
                  <Text style={s.agenda} numberOfLines={2}>{m.agenda}</Text>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Meeting</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            {[
              { key: "title", label: "Title *", ph: "Meeting title" },
              { key: "date", label: "Date", ph: "YYYY-MM-DD" },
              { key: "location", label: "Location", ph: "Room / Online" },
              { key: "agenda", label: "Agenda", ph: "Topics to discuss" },
            ].map((f) => (
              <View key={f.key} style={s.field}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder={f.ph}
                  placeholderTextColor={colors.mutedForeground}
                  value={(form as any)[f.key]}
                  onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                />
              </View>
            ))}
            <Pressable style={[s.submitBtn, !form.title.trim() && { opacity: 0.5 }]} onPress={createMeeting} disabled={!form.title.trim()}>
              <Text style={s.submitText}>Create Meeting</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    topBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: c.card, borderBottomWidth: 1, borderColor: c.border },
    searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.muted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, gap: 8 },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primary + "18", alignItems: "center", justifyContent: "center" },
    cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.foreground, flex: 1 },
    cardDate: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    agenda: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18, borderTopWidth: 1, borderColor: c.border, paddingTop: 8, marginTop: 2 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyText: { color: c.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" },
    overlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
    modal: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground },
    field: { gap: 4 },
    fieldLabel: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_500Medium" },
    fieldInput: { backgroundColor: c.muted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: c.border },
    submitBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
