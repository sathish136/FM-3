import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
  user_id?: string;
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

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const s = styles(colors, insets);

  async function load() {
    try {
      const data = await apiFetch<Employee[]>("/api/hrms/employees");
      setEmployees(Array.isArray(data) ? data.filter(e => (e.status || "active").toLowerCase() === "active") : []);
    } catch { setEmployees([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.employee_name?.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
    }
    const map: Record<string, Employee[]> = {};
    list.forEach(e => {
      const dept = e.department || "Other";
      if (!map[dept]) map[dept] = [];
      map[dept].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [employees, search]);

  return (
    <View style={s.root}>
      <View style={s.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search team members..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
        {!!search && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} /> : (
        <FlatList
          data={grouped}
          keyExtractor={([dept]) => dept}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item: [dept, members] }) => (
            <View>
              <View style={s.deptHeader}>
                <View style={s.deptDot} />
                <Text style={s.deptName}>{dept}</Text>
                <View style={s.deptCount}>
                  <Text style={s.deptCountText}>{members.length}</Text>
                </View>
              </View>
              {members.map(emp => {
                const color = avatarColor(emp.name);
                return (
                  <View key={emp.name} style={s.empCard}>
                    <View style={[s.empAvatar, { backgroundColor: color + "22" }]}>
                      <Text style={[s.empInitials, { color }]}>{initials(emp.employee_name)}</Text>
                    </View>
                    <View style={s.empInfo}>
                      <Text style={s.empName} numberOfLines={1}>{emp.employee_name}</Text>
                      {!!emp.designation && <Text style={s.empDesig} numberOfLines={1}>{emp.designation}</Text>}
                      {!!emp.user_id && <Text style={s.empEmail} numberOfLines={1}>{emp.user_id}</Text>}
                    </View>
                    {!!emp.cell_number && (
                      <Pressable onPress={() => Linking.openURL(`tel:${emp.cell_number}`)} style={s.callBtn}>
                        <Feather name="phone" size={16} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No team members found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular" },
    list: { paddingHorizontal: 16, paddingBottom: insets.bottom + 40, paddingTop: 8 },
    deptHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, marginTop: 4 },
    deptDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    deptName: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold", color: c.foreground, letterSpacing: 0.3, textTransform: "uppercase" },
    deptCount: { backgroundColor: c.primary + "18", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    deptCountText: { fontSize: 12, color: c.primary, fontFamily: "Inter_600SemiBold" },
    empCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.card, marginBottom: 8, padding: 14, borderRadius: c.radius + 2, borderWidth: 1, borderColor: c.border },
    empAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
    empInitials: { fontSize: 17, fontFamily: "Inter_700Bold" },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    empDesig: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    empEmail: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primary + "15", alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
