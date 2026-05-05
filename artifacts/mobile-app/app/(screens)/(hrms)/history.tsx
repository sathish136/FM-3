import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  Platform, RefreshControl, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface AttendanceRecord {
  name: string;
  attendance_date: string;
  status: string;
  employee_name: string;
  department: string;
}

const BLUE = '#1a3fbd';

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  Present:          { bg: '#d1fae5', text: '#059669', icon: 'checkmark-circle-outline' },
  Absent:           { bg: '#fee2e2', text: '#ef4444', icon: 'close-circle-outline' },
  'Half Day':       { bg: '#fef3c7', text: '#d97706', icon: 'remove-circle-outline' },
  'On Leave':       { bg: '#ede9fe', text: '#7c3aed', icon: 'airplane-outline' },
  'Work From Home': { bg: '#dbeafe', text: '#2563eb', icon: 'home-outline' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildMonthOptions() {
  const now = new Date();
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      value: monthKey(d.getFullYear(), d.getMonth() + 1),
    });
  }
  return options;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const monthOptions = buildMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0].value);
  const [pickerVisible, setPickerVisible] = useState(false);

  const selectedLabel = monthOptions.find(m => m.value === selectedMonth)?.label ?? selectedMonth;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/mobile/hrms/attendance', selectedMonth],
    queryFn: () =>
      apiGet<{ data: AttendanceRecord[] }>(`/api/mobile/hrms/attendance?month=${selectedMonth}`)
        .then(r => r.data ?? []),
  });

  const records = data ?? [];

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: BLUE, paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' }}>Attendance History</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Monthly report
            </Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Month Picker Button */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>{selectedLabel}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Summary pills */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        {Object.entries(summary).map(([status, count]) => {
          const s = STATUS_STYLE[status] || { bg: colors.muted, text: colors.mutedForeground, icon: 'ellipse-outline' };
          return (
            <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Ionicons name={s.icon as any} size={12} color={s.text} />
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: s.text }}>{status}: {count}</Text>
            </View>
          );
        })}
        {records.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Ionicons name="list-outline" size={12} color="#64748b" />
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#64748b' }}>Total: {records.length}</Text>
          </View>
        )}
        {records.length === 0 && !isLoading && (
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>No records found</Text>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BLUE} size="large" />
          <Text style={{ marginTop: 12, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Loading attendance…</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.name}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BLUE} />}
          renderItem={({ item }) => {
            const s = STATUS_STYLE[item.status] || { bg: colors.muted, text: colors.mutedForeground, icon: 'ellipse-outline' };
            return (
              <View style={{
                backgroundColor: colors.card, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={s.icon as any} size={20} color={s.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{formatDate(item.attendance_date)}</Text>
                  {!!item.department && (
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>{item.department}</Text>
                  )}
                </View>
                <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: s.text }}>{item.status}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="calendar-outline" size={48} color={colors.border} />
              <Text style={{ marginTop: 16, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>No records for {selectedLabel}</Text>
              <Text style={{ marginTop: 6, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'center' }}>
                Try selecting a different month.
              </Text>
            </View>
          }
        />
      )}

      {/* Month Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Select Month</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ padding: 12, gap: 6 }}>
            {monthOptions.map(opt => {
              const active = opt.value === selectedMonth;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setSelectedMonth(opt.value); setPickerVisible(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
                    backgroundColor: active ? BLUE : colors.card,
                    borderWidth: 1, borderColor: active ? BLUE : colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="calendar" size={16} color={active ? '#fff' : colors.mutedForeground} />
                    <Text style={{ fontSize: 14, fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular', color: active ? '#fff' : colors.foreground }}>
                      {opt.label}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
