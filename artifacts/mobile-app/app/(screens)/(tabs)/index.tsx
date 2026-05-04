import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';

interface Lead {
  name: string;
  company_name: string;
  lead_name: string;
  country: string;
  state: string;
  city: string;
  lead_status: string;
  mobile_no: string;
  email_id: string;
  source: string;
  industry: string;
  modified: string;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Open:          { bg: '#dbeafe', text: '#1e40af' },
  Converted:     { bg: '#d1fae5', text: '#065f46' },
  Opportunity:   { bg: '#ede9fe', text: '#5b21b6' },
  Quotation:     { bg: '#fef3c7', text: '#92400e' },
  Replied:       { bg: '#ccfbf1', text: '#0f766e' },
  'Do Not Contact': { bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }: { status: string }) {
  const clr = STATUS_COLOR[status] || { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={{ backgroundColor: clr.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: clr.text }}>{status || 'Unknown'}</Text>
    </View>
  );
}

function LeadCard({ lead, colors }: { lead: Lead; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/lead/${encodeURIComponent(lead.name)}`);
      }}
      style={[s.card(colors), { shadowColor: '#000' }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={[s.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.primary }}>
            {(lead.company_name || lead.lead_name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.company(colors)} numberOfLines={1}>
            {lead.company_name || lead.lead_name || lead.name}
          </Text>
          {!!lead.lead_name && lead.lead_name !== lead.company_name && (
            <Text style={s.sub(colors)} numberOfLines={1}>
              <Ionicons name="person-outline" size={11} color={colors.mutedForeground} /> {lead.lead_name}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {!!lead.country && (
              <Text style={s.chip(colors)}>
                <Ionicons name="location-outline" size={10} color={colors.mutedForeground} /> {lead.city || lead.state || lead.country}
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={lead.lead_status} />
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
        </View>
      </View>
      {!!lead.industry && (
        <View style={[s.followRow, { borderTopColor: colors.border }]}>
          <Ionicons name="business-outline" size={12} color={colors.mutedForeground} />
          <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.mutedForeground }}>
            {lead.industry}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const STATUS_FILTERS = ['All', 'Open', 'Opportunity', 'Quotation', 'Replied', 'Converted'];

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/mobile/leads'],
    queryFn: () => apiGet<{ data: Lead[] }>('/api/mobile/leads').then(r => r.data),
    enabled: !!user,
  });

  const leads = data ?? [];
  const filtered = leads.filter(l => {
    const matchStatus = statusFilter === 'All' || l.lead_status === statusFilter;
    if (!search.trim()) return matchStatus;
    const q = search.toLowerCase();
    return matchStatus && (l.company_name + l.contact_person + l.country + l.lead_name).toLowerCase().includes(q);
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header(colors), { paddingTop: topPad + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' }}>My Leads</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {leads.length} assigned · {user?.agent_name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} disabled={isRefetching} style={s.iconBtn}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[s.searchBar, { marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.8)" />
          <TextInput
            style={{ flex: 1, marginLeft: 8, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#fff' }}
            placeholder="Search by company, contact…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filter pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={item => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        style={{ maxHeight: 50, flexGrow: 0, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
        renderItem={({ item }) => {
          const active = statusFilter === item;
          return (
            <TouchableOpacity
              onPress={() => { setStatusFilter(item); Haptics.selectionAsync(); }}
              style={{
                paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
                backgroundColor: active ? colors.primary : colors.muted,
                borderWidth: 1, borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: active ? '#fff' : colors.mutedForeground }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Loading leads…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="people-outline" size={48} color={colors.border} />
          <Text style={{ marginTop: 16, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
            {leads.length === 0 ? 'No leads assigned' : 'No results found'}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'center' }}>
            {leads.length === 0 ? 'Ask your admin to assign leads to your account.' : 'Try adjusting your search or filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.name}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => <LeadCard lead={item} colors={colors} />}
        />
      )}
    </View>
  );
}

const s = {
  header: (c: ReturnType<typeof useColors>) => ({
    backgroundColor: c.primary,
    paddingBottom: 12,
  }),
  card: (c: ReturnType<typeof useColors>) => ({
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  }),
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    flexShrink: 0,
  },
  company: (c: ReturnType<typeof useColors>) => ({
    fontSize: 14, fontFamily: 'Inter_600SemiBold' as const, color: c.foreground,
  }),
  sub: (c: ReturnType<typeof useColors>) => ({
    fontSize: 12, fontFamily: 'Inter_400Regular' as const, color: c.mutedForeground, marginTop: 2,
  }),
  chip: (c: ReturnType<typeof useColors>) => ({
    fontSize: 11, fontFamily: 'Inter_400Regular' as const, color: c.mutedForeground,
  }),
  followRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    marginTop: 10, paddingTop: 8, borderTopWidth: 1,
  },
  searchBar: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    borderRadius: 12, paddingHorizontal: 12, height: 42,
    marginBottom: 4,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};
