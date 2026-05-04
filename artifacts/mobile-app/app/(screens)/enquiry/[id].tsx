import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useEnquiry } from '@/context/EnquiryContext';
import { LocalEnquiry } from '@/lib/storage';

export default function EnquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enquiries, removeEnquiry, syncAll, isOnline } = useEnquiry();
  const [deleting, setDeleting] = useState(false);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const enquiry = enquiries.find(e => e.id === id);
  const form = (enquiry?.form_data ?? {}) as Record<string, unknown>;

  if (!enquiry) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={{ marginTop: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Enquiry not found</Text>
      </View>
    );
  }

  const SYNC_META: Record<string, { icon: string; color: string; label: string; bg: string }> = {
    synced:  { icon: 'checkmark-circle', color: colors.success, label: 'Synced to server', bg: colors.successLight },
    pending: { icon: 'time-outline',     color: colors.warning,  label: 'Pending sync',    bg: colors.warningLight },
    error:   { icon: 'alert-circle',     color: colors.destructive, label: 'Sync failed',  bg: '#fee2e2' },
  };
  const sm = SYNC_META[enquiry.sync_status] || SYNC_META.pending;

  const handleDelete = async () => {
    setDeleting(true);
    await removeEnquiry(enquiry.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleSync = async () => {
    await syncAll();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  function Row({ label, value }: { label: string; value?: string | string[] }) {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const displayVal = Array.isArray(value) ? value.join(', ') : value;
    return (
      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, width: 120 }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.foreground, flex: 1 }}>{displayVal}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Enquiry Detail', headerBackTitle: 'Back' }} />
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
      {/* Sync status banner */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: sm.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name={sm.icon as any} size={20} color={sm.color} />
        <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', color: sm.color }}>{sm.label}</Text>
        {enquiry.sync_status !== 'synced' && isOnline && (
          <TouchableOpacity onPress={handleSync} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.primary }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Sync Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 4 }}>
          {String(form.industry_name || 'Unnamed Enquiry')}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginBottom: 20 }}>
          Saved {new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Contact */}
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 8 }}>Contact</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <Row label="Contact Person" value={String(form.contact_person || '')} />
          <Row label="Designation" value={String(form.designation || '')} />
          <Row label="Mobile" value={String(form.mobile_no || '')} />
          <Row label="Email" value={String(form.email || '')} />
          <Row label="Sector" value={String(form.sector || '')} />
          <Row label="Source" value={String(form.source || '')} />
        </View>

        {/* Location */}
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 8 }}>Location</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <Row label="Address" value={String(form.address || '')} />
          <Row label="District" value={String(form.district || '')} />
          <Row label="State" value={String(form.state || '')} />
          <Row label="Country" value={String(form.country || '')} />
          <Row label="Pincode" value={String(form.pincode || '')} />
          <Row label="GPS" value={(form.latitude && form.longitude) ? `${form.latitude}, ${form.longitude}` : ''} />
        </View>

        {/* Technical */}
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 8 }}>Technical</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          <Row label="Existing Plant" value={String(form.has_existing_plant || '')} />
          <Row label="Capacity" value={form.effluent_capacity ? `${form.effluent_capacity} m³/day` : ''} />
          <Row label="Treatment" value={Array.isArray(form.treatment_required) ? form.treatment_required as string[] : []} />
          <Row label="Discharge Norm" value={String(form.discharge_norm || '')} />
        </View>

        {/* Summary */}
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 8 }}>Notes</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
          <Row label="Budget" value={String(form.budget_range || '')} />
          <Row label="Target Date" value={String(form.commissioning_target || '')} />
          <Row label="Remarks" value={String(form.remarks || '')} />
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={{ height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.destructive, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
        >
          {deleting
            ? <ActivityIndicator color={colors.destructive} size="small" />
            : <><Ionicons name="trash-outline" size={18} color={colors.destructive} /><Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.destructive }}>Delete Enquiry</Text></>}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
}
