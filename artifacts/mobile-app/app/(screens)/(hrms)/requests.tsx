import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

const BLUE = '#1a3fbd';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#fef3c7', text: '#d97706' },
  Approved: { bg: '#d1fae5', text: '#059669' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
  Open:     { bg: '#dbeafe', text: '#2563eb' },
  Closed:   { bg: '#f1f5f9', text: '#64748b' },
};

const TABS = [
  { key: 'leaves',       label: 'Leave',      icon: 'calendar-outline',      color: '#7c3aed', newRoute: '/hrms-leave' },
  { key: 'claims',       label: 'Claims',     icon: 'receipt-outline',       color: '#d97706', newRoute: '/hrms-claims' },
  { key: 'onduty',       label: 'On Duty',    icon: 'briefcase-outline',     color: '#0891b2', newRoute: '/hrms-onduty' },
  { key: 'tickets',      label: 'Tickets',    icon: 'airplane-outline',      color: '#059669', newRoute: '/hrms-ticket' },
  { key: 'site-tickets', label: 'Site',       icon: 'construct-outline',     color: '#dc2626', newRoute: '/hrms-site-ticket' },
  { key: 'grievances',   label: 'Grievance',  icon: 'megaphone-outline',     color: '#475569', newRoute: '/hrms-grievance' },
];

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

export default function RequestsScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const topPad     = Platform.OS === 'web' ? 67 : insets.top;
  const [activeTab, setActiveTab]  = useState('leaves');
  const [records,   setRecords]    = useState<any[]>([]);
  const [loading,   setLoading]    = useState(false);
  const [refreshing,setRefreshing] = useState(false);

  const tab = TABS.find(t => t.key === activeTab)!;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await apiGet<{ data: any[] }>(`/api/mobile/hrms/${activeTab}`);
      setRecords(r.data ?? []);
    } catch { setRecords([]); }
    setLoading(false); setRefreshing(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: any }) => {
    const sc = STATUS_COLOR[item.status] ?? { bg: '#f1f5f9', text: '#64748b' };
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: sc.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ionicons name={tab.icon as any} size={19} color={tab.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground, flex: 1 }} numberOfLines={1}>
              {item.summary || item.purpose || item.description || item.category || '—'}
            </Text>
            <View style={{ backgroundColor: sc.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginLeft: 8 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: sc.text }}>{item.status}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>{fmtDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: BLUE, paddingTop: topPad + 12, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' }}>My Requests</Text>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>All your submitted requests</Text>
      </View>

      {/* Tab pills */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <FlatList
          horizontal data={TABS} keyExtractor={t => t.key} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: t }) => (
            <TouchableOpacity onPress={() => setActiveTab(t.key)} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: activeTab === t.key ? BLUE : colors.muted, borderWidth: 1, borderColor: activeTab === t.key ? BLUE : colors.border }}>
              <Ionicons name={t.icon as any} size={13} color={activeTab === t.key ? '#fff' : colors.mutedForeground} />
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: activeTab === t.key ? '#fff' : colors.mutedForeground }}>{t.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* New button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
        <TouchableOpacity onPress={() => router.push(tab.newRoute as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tab.color, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, shadowColor: tab.color, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' }}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BLUE} size="large" />
        </View>
      ) : (
        <FlatList
          data={records} keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BLUE} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 52 }}>
              <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name={tab.icon as any} size={38} color={colors.border} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 6 }}>No {tab.label} yet</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
                Tap New to submit a request.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
