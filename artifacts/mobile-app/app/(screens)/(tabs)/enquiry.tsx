import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useEnquiry } from '@/context/EnquiryContext';
import { LocalEnquiry } from '@/lib/storage';

function SyncBanner({ pendingCount, isSyncing, isOnline, onSync }: {
  pendingCount: number; isSyncing: boolean; isOnline: boolean; onSync: () => void;
}) {
  if (pendingCount === 0 && isOnline) return null;
  return (
    <TouchableOpacity
      onPress={onSync}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: isOnline ? '#fef3c7' : '#fee2e2',
        borderBottomWidth: 1,
        borderBottomColor: isOnline ? '#fde68a' : '#fecaca',
      }}
    >
      <Ionicons
        name={!isOnline ? 'cloud-offline-outline' : isSyncing ? 'sync-outline' : 'cloud-upload-outline'}
        size={16}
        color={isOnline ? '#92400e' : '#991b1b'}
      />
      <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: isOnline ? '#92400e' : '#991b1b' }}>
        {!isOnline
          ? `Offline — ${pendingCount} enquir${pendingCount !== 1 ? 'ies' : 'y'} queued for sync`
          : isSyncing
            ? `Syncing ${pendingCount} enquir${pendingCount !== 1 ? 'ies' : 'y'}…`
            : `${pendingCount} pending — tap to sync now`}
      </Text>
      {isOnline && !isSyncing && (
        <Ionicons name="chevron-forward" size={14} color="#92400e" />
      )}
    </TouchableOpacity>
  );
}

const SYNC_ICONS: Record<string, { icon: string; color: string }> = {
  synced: { icon: 'checkmark-circle', color: '#10b981' },
  pending: { icon: 'time-outline', color: '#f59e0b' },
  error: { icon: 'alert-circle-outline', color: '#ef4444' },
};

function EnquiryCard({ item, colors, onPress }: { item: LocalEnquiry; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  const sync = SYNC_ICONS[item.sync_status] || SYNC_ICONS.pending;
  const form = item.form_data as Record<string, string>;
  const company = item.company_name || form.industry_name || 'Unnamed Enquiry';
  const sector = form.sector || '';
  const date = new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: colors.card, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8, elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="business-outline" size={20} color="#1a3fbd" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }} numberOfLines={1}>{company}</Text>
          {!!sector && (
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>{sector}</Text>
          )}
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 4 }}>{date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Ionicons name={sync.icon as any} size={18} color={sync.color} />
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: sync.color, textTransform: 'uppercase' }}>
            {item.sync_status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EnquiryListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enquiries, pendingCount, isOnline, isSyncing, syncAll, reload } = useEnquiry();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingTop: topPad + 12, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' }}>Plant Enquiries</Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {enquiries.length} saved · {pendingCount} pending sync
            </Text>
          </View>
          <TouchableOpacity onPress={() => reload()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync banner */}
      <SyncBanner pendingCount={pendingCount} isSyncing={isSyncing} isOnline={isOnline} onSync={syncAll} />

      {/* List */}
      <FlatList
        data={enquiries}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad + 80 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <Ionicons name="clipboard-outline" size={52} color={colors.border} />
            <Text style={{ marginTop: 16, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'center' }}>
              No Plant Enquiries Yet
            </Text>
            <Text style={{ marginTop: 6, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'center' }}>
              Tap + to create a new enquiry. It saves offline and syncs automatically when online.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <EnquiryCard
            item={item}
            colors={colors}
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/enquiry/${item.id}`);
            }}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/enquiry/new'); }}
        style={{
          position: 'absolute', right: 20,
          bottom: bottomPad + 16,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.primary, shadowOpacity: 0.4,
          shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
