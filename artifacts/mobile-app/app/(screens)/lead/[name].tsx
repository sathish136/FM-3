import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/lib/api';

interface Lead {
  name: string; company_name: string; contact_person: string; lead_name: string;
  country: string; state: string; city: string; lead_status: string;
  mobile_no: string; email_id: string; website: string; industry: string;
  source: string; address_line1: string; notes: string; next_follow_up: string; modified: string;
}
interface FollowUp {
  name: string; date: string; description: string; follow_up_type: string; next_follow_up: string;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Open:        { bg: '#dbeafe', text: '#1e40af' },
  Converted:   { bg: '#d1fae5', text: '#065f46' },
  Opportunity: { bg: '#ede9fe', text: '#5b21b6' },
  Quotation:   { bg: '#fef3c7', text: '#92400e' },
  Replied:     { bg: '#ccfbf1', text: '#0f766e' },
};

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress?: () => void }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
      <Ionicons name={icon as any} size={15} color={colors.mutedForeground} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: onPress ? colors.primary : colors.foreground, marginTop: 2 }}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FollowUpCard({ item, colors }: { item: FollowUp; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chatbubble-outline" size={15} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{item.follow_up_type || 'Follow-up'}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>{item.date}</Text>
        </View>
      </View>
      {!!item.description && (
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.foreground, lineHeight: 19 }}>{item.description}</Text>
      )}
      {!!item.next_follow_up && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Ionicons name="calendar-outline" size={12} color={colors.warning} />
          <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.warning }}>Next: {item.next_follow_up}</Text>
        </View>
      )}
    </View>
  );
}

export default function LeadDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const leadQ = useQuery({
    queryKey: ['/api/mobile/lead', name],
    queryFn: () => apiGet<Lead>(`/api/mobile/lead/${encodeURIComponent(name ?? '')}`),
    enabled: !!name,
  });
  const fuQ = useQuery({
    queryKey: ['/api/mobile/lead', name, 'followups'],
    queryFn: () => apiGet<{ data: FollowUp[] }>(`/api/mobile/lead/${encodeURIComponent(name ?? '')}/followups`).then(r => r.data),
    enabled: !!name,
  });

  const lead = leadQ.data;
  const status = lead?.lead_status || '';
  const clr = STATUS_COLOR[status] || { bg: '#f3f4f6', text: '#6b7280' };

  if (leadQ.isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Lead Detail', headerBackTitle: 'Back' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </>
    );
  }
  if (leadQ.isError || !lead) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Lead Detail', headerBackTitle: 'Back' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={{ marginTop: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Lead not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: lead.company_name || lead.lead_name || 'Lead Detail', headerBackTitle: 'Back' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        <View style={{ backgroundColor: colors.primary, padding: 20, paddingTop: 24 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 4 }} numberOfLines={2}>
            {lead.company_name || lead.lead_name || lead.name}
          </Text>
          {!!lead.industry && (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>{lead.industry}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <View style={{ backgroundColor: clr.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: clr.text }}>{status || 'Unknown'}</Text>
            </View>
            {!!lead.country && (
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>
                {lead.city || lead.state || lead.country}
              </Text>
            )}
          </View>
        </View>

        <View style={{ margin: 16, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Contact</Text>
          <InfoRow icon="person-outline" label="Contact Person" value={lead.contact_person} />
          <InfoRow icon="call-outline" label="Mobile" value={lead.mobile_no} onPress={() => lead.mobile_no && Linking.openURL(`tel:${lead.mobile_no}`)} />
          <InfoRow icon="mail-outline" label="Email" value={lead.email_id} onPress={() => lead.email_id && Linking.openURL(`mailto:${lead.email_id}`)} />
          <InfoRow icon="globe-outline" label="Website" value={lead.website} onPress={() => lead.website && Linking.openURL(lead.website)} />
          <InfoRow icon="location-outline" label="Location" value={[lead.city, lead.state, lead.country].filter(Boolean).join(', ')} />
          <InfoRow icon="business-outline" label="Source" value={lead.source} />
          {!!lead.next_follow_up && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Ionicons name="calendar-outline" size={14} color={colors.warning} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.warning }}>Next follow-up: {lead.next_follow_up}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16 }}>
          {!!lead.mobile_no && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${lead.mobile_no}`)}
              style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Call</Text>
            </TouchableOpacity>
          )}
          {!!lead.email_id && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${lead.email_id}`)}
              style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="mail" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Email</Text>
            </TouchableOpacity>
          )}
          {!!lead.mobile_no && (
            <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${lead.mobile_no.replace(/\D/g, '')}`)}
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#25d366', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginHorizontal: 16 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 12 }}>
            Follow-ups {fuQ.data && fuQ.data.length > 0 ? `(${fuQ.data.length})` : ''}
          </Text>
          {fuQ.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !fuQ.data?.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.border} />
              <Text style={{ marginTop: 10, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>No follow-ups recorded yet</Text>
            </View>
          ) : (
            fuQ.data.map(fu => <FollowUpCard key={fu.name} item={fu} colors={colors} />)
          )}
        </View>
      </ScrollView>
    </>
  );
}
