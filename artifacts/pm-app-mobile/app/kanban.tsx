import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/utils/api";

interface Task {
  id: number;
  title: string;
  status: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
  project?: string;
  project_name?: string;
  description?: string;
}

interface Project {
  id: number;
  name: string;
}

const COLUMNS = [
  { key: "todo", label: "To Do", color: "#6b7a90" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "review", label: "Review", color: "#d97706" },
  { key: "done", label: "Done", color: "#16a34a" },
];

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "#16a34a", label: "Low" },
  medium: { color: "#d97706", label: "Medium" },
  high: { color: "#dc2626", label: "High" },
  urgent: { color: "#7c3aed", label: "Urgent" },
};

function fmtDate(d?: string) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
  catch { return d; }
}

export default function KanbanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeColumn, setActiveColumn] = useState("in_progress");
  const s = styles(colors, insets);

  async function load() {
    try {
      const [tasksData, projs] = await Promise.all([
        apiFetch<Task[]>("/api/pm/tasks"),
        apiFetch<Project[]>("/api/projects").catch(() => []),
      ]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setProjects(Array.isArray(projs) ? projs : []);
    } catch { setTasks([]); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const columnTasks = useMemo(() => {
    let list = tasks;
    if (selectedProject !== null) list = list.filter(t => t.project === String(selectedProject));
    const col = COLUMNS.find(c => c.key === activeColumn);
    if (!col) return [];
    return list.filter(t => {
      const s = (t.status || "").toLowerCase().replace(/\s+/g, "_");
      return s === col.key || (col.key === "todo" && ["todo", "open", "new", "backlog"].includes(s))
        || (col.key === "in_progress" && ["in_progress", "in progress", "wip"].includes(s))
        || (col.key === "done" && ["done", "completed", "closed"].includes(s));
    });
  }, [tasks, activeColumn, selectedProject]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    COLUMNS.forEach(col => {
      map[col.key] = tasks.filter(t => {
        const s = (t.status || "").toLowerCase().replace(/\s+/g, "_");
        return s === col.key || (col.key === "todo" && ["todo", "open", "new", "backlog"].includes(s))
          || (col.key === "in_progress" && ["in_progress", "in progress", "wip"].includes(s))
          || (col.key === "done" && ["done", "completed", "closed"].includes(s));
      }).length;
    });
    return map;
  }, [tasks]);

  return (
    <View style={s.root}>
      {projects.length > 0 && (
        <FlatList
          data={[{ id: -1, name: "All Projects" }, ...projects]}
          keyExtractor={p => String(p.id)}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.projectsRow}
          renderItem={({ item: p }) => {
            const isSelected = p.id === -1 ? selectedProject === null : selectedProject === p.id;
            return (
              <Pressable
                style={[s.projectChip, isSelected && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedProject(p.id === -1 ? null : p.id)}
              >
                <Text style={[s.projectChipText, isSelected && { color: "#fff" }]} numberOfLines={1}>{p.name}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.columnsRow}>
          {COLUMNS.map(col => (
            <Pressable key={col.key} style={[s.columnTab, activeColumn === col.key && { borderBottomColor: col.color, borderBottomWidth: 2 }]} onPress={() => setActiveColumn(col.key)}>
              <Text style={[s.columnTabText, activeColumn === col.key && { color: col.color, fontFamily: "Inter_700Bold" }]}>{col.label}</Text>
              <View style={[s.countBadge, { backgroundColor: col.color + "20" }]}>
                <Text style={[s.countText, { color: col.color }]}>{counts[col.key] || 0}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={columnTasks}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={s.taskList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          renderItem={({ item: t }) => {
            const col = COLUMNS.find(c => c.key === activeColumn)!;
            const pr = (t.priority || "medium").toLowerCase();
            const prConfig = PRIORITY_CONFIG[pr] || PRIORITY_CONFIG.medium;
            const dueDate = fmtDate(t.due_date);
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && activeColumn !== "done";
            return (
              <View style={s.taskCard}>
                <View style={s.taskHeader}>
                  <View style={[s.taskPriority, { backgroundColor: prConfig.color + "18" }]}>
                    <Text style={[s.taskPriorityText, { color: prConfig.color }]}>{prConfig.label}</Text>
                  </View>
                  {dueDate && (
                    <View style={[s.dueDate, isOverdue && { backgroundColor: "#dc262618" }]}>
                      <Feather name="calendar" size={11} color={isOverdue ? "#dc2626" : colors.mutedForeground} />
                      <Text style={[s.dueDateText, isOverdue && { color: "#dc2626" }]}>{dueDate}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.taskTitle} numberOfLines={2}>{t.title}</Text>
                {!!t.project_name && <Text style={s.taskProject} numberOfLines={1}>{t.project_name}</Text>}
                {!!t.description && <Text style={s.taskDesc} numberOfLines={2}>{t.description}</Text>}
                {!!t.assigned_to && (
                  <View style={s.assignee}>
                    <View style={[s.assigneeAvatar, { backgroundColor: col.color + "20" }]}>
                      <Text style={[s.assigneeInitial, { color: col.color }]}>{t.assigned_to[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={s.assigneeName} numberOfLines={1}>{t.assigned_to}</Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="check-square" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No tasks in this column</Text>
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
    projectsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    projectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.muted, maxWidth: 160 },
    projectChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    columnsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
    columnTab: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6 },
    columnTabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.mutedForeground },
    countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    taskList: { padding: 16, paddingBottom: insets.bottom + 40 },
    taskCard: { backgroundColor: c.card, borderRadius: c.radius + 2, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    taskPriority: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    taskPriorityText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    dueDate: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.muted },
    dueDateText: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_500Medium" },
    taskTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 4 },
    taskProject: { fontSize: 11, color: c.primary, fontFamily: "Inter_500Medium", marginBottom: 6 },
    taskDesc: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 10 },
    assignee: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    assigneeAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    assigneeInitial: { fontSize: 11, fontFamily: "Inter_700Bold" },
    assigneeName: { fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: c.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
