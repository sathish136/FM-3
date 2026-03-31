import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Employee {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  status?: string;
  cell_number?: string;
  gender?: string;
}

const AVATAR_COLORS = ["#6366f1","#3b82f6","#0d9488","#16a34a","#d97706","#dc2626","#7c3aed","#ec4899"];
function avatarColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function HRMSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Employee[]>("/api/hrms/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const departments = useMemo(() => {
    const depts = ["All", ...new Set(employees.map(e => e.department).filter(Boolean) as string[])];
    return depts;
  }, [employees]);

  const filtered = useMemo(() => {
    let list = employees;
    if (dept !== "All") list = list.filter(e => e.department === dept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.employee_name?.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q));
    }
    return list;
  }, [employees, dept, search]);

  const quickLinks = [
    { icon: "calendar" as const, label: "Leave", color: "#7c3aed", route: "/leave" },
    { icon: "clock" as const, label: "Attendance", color: "#0d9488", route: "/attendance" },
    { icon: "file-text" as const, label: "Claims", color: "#d97706", route: "/claims" },
    { icon: "users" as const, label: "Team", color: "#3b82f6", route: "/team" },
  ];

  function renderItem({ item: e }: { item: Employee }) {
    const color = avatarColor(e.name);
    const isActive = (e.status || "active").toLowerCase() === "active";
    return (
      <View style={s.empCard}>
        <View style={[s.empAvatar, { backgroundColor: color + "25" }]}>
          <Text style={[s.empInitials, { color }]}>{initials(e.employee_name)}</Text>
        </View>
        <View style={s.empInfo}>
          <Text style={s.empName} numberOfLines={1}>{e.employee_name}</Text>
          {!!e.designation && <Text style={s.empDesig} numberOfLines={1}>{e.designation}</Text>}
          {!!e.department && (
            <View style={s.deptBadge}>
              <Text style={s.deptText}>{e.department}</Text>
            </View>
          )}
        </View>
        <View style={[s.statusDot, { backgroundColor: isActive ? "#16a34a" : "#d97706" }]} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.name}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.quickRow}>
              {quickLinks.map(ql => (
                <Pressable key={ql.label} style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.7 }]} onPress={() => router.push(ql.route as any)}>
                  <View style={[s.quickIcon, { backgroundColor: ql.color + "18" }]}>
                    <Feather name={ql.icon} size={22} color={ql.color} />
                  </View>
                  <Text style={s.quickLabel}>{ql.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>{employees.length}</Text>
                <Text style={s.statLbl}>Total Staff</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#16a34a" }]}>{employees.filter(e => (e.status || "active").toLowerCase() === "active").length}</Text>
                <Text style={s.statLbl}>Active</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statNum, { color: "#7c3aed" }]}>{new Set(employees.map(e => e.department).filter(Boolean)).size}</Text>
                <Text style={s.statLbl}>Departments</Text>
              </View>
            </View>

            <View style={s.searchBar}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.searchInput} placeholder="Search employees..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
              {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
            </View>

            {departments.length > 2 && (
              <FlatList
                data={departments.slice(0, 8)}
                keyExtractor={d => d}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
                renderItem={({ item: d }) => (
                  <Pressable style={[s.filterChip, dept === d && { backgroundColor: colors.primary }]} onPress={() => setDept(d)}>
                    <Text style={[s.filterText, dept === d && { color: "#fff" }]}>{d}</Text>
                  </Pressable>
                )}
              />
            )}

            <Text style={s.listHeader}>{filtered.length} Employee{filtered.length !== 1 ? "s" : ""}</Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />}
          </View>
        }
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No employees found</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    list: { paddingBottom: insets.bottom + 40 },
    quickRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 0 },
    quickCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.border },
    quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    quickLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground },
    statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.border },
    statNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.primary },
    statLbl: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, marginHorizontal: 16, marginBottom: 10, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.muted },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    listHeader: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13, color: c.mutedForeground, fontFamily: "Inter_500Medium" },
    empCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: c.radius + 2, borderWidth: 1, borderColor: c.border },
    empAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
    empInitials: { fontSize: 17, fontFamily: "Inter_700Bold" },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    empDesig: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    deptBadge: { alignSelf: "flex-start", backgroundColor: c.primary + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    deptText: { fontSize: 10, color: c.primary, fontFamily: "Inter_500Medium" },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
