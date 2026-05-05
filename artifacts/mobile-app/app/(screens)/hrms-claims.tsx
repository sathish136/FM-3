import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Platform,
  Alert, ActivityIndicator, Modal, Image, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost } from '@/lib/api';

const AMBER = '#d97706';
const BLUE  = '#1a3fbd';

const CLAIM_TYPES = [
  { label: 'Food',        icon: 'fast-food-outline' },
  { label: 'Travel',      icon: 'car-outline' },
  { label: 'Fuel (Bike)', icon: 'bicycle-outline' },
  { label: 'Fuel (Car)',  icon: 'speedometer-outline' },
  { label: 'Medical',     icon: 'medkit-outline' },
  { label: 'Calls',       icon: 'call-outline' },
  { label: 'Others',      icon: 'ellipsis-horizontal-circle-outline' },
];

const FUEL_TYPES = ['Fuel (Bike)', 'Fuel (Car)'];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: '#fef3c7', text: '#d97706' },
  Approved: { bg: '#d1fae5', text: '#059669' },
  Rejected: { bg: '#fee2e2', text: '#ef4444' },
  Cancelled:{ bg: '#f1f5f9', text: '#64748b' },
};

interface Claim {
  name?: string;
  id?: number;
  expense_type: string;
  claim_date: string;
  amount: number | string;
  description?: string;
  km_travel?: number | string;
  status: string;
  summary?: string;
  created_at?: string;
}

function formatClaimDate(d: string) {
  try { return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}

function buildMonthDays(year: number, month: number) {
  const days: number[] = [];
  const total = new Date(year, month, 0).getDate();
  for (let i = 1; i <= total; i++) days.push(i);
  return days;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function HrmsClaimsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const today = new Date();
  const [claimType,   setClaimType]   = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [kmTravel,    setKmTravel]    = useState('');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; base64?: string }[]>([]);
  const [loading,     setLoading]     = useState(false);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear,  setPickerYear]  = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth() + 1);
  const [pickerDay,   setPickerDay]   = useState(today.getDate());

  const isFuel = FUEL_TYPES.includes(claimType);

  const { data: claimsData, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ['/api/mobile/hrms/claims'],
    queryFn: () => apiGet<{ data: Claim[] }>('/api/mobile/hrms/claims').then(r => r.data ?? []),
  });
  const claims = claimsData ?? [];

  const confirmDate = () => {
    const m = String(pickerMonth).padStart(2, '0');
    const d = String(pickerDay).padStart(2, '0');
    setExpenseDate(`${pickerYear}-${m}-${d}`);
    setDatePickerOpen(false);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      const newItems = result.assets.map(a => ({ uri: a.uri, base64: a.base64 ?? undefined }));
      setAttachments(prev => [...prev, ...newItems].slice(0, 5));
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!claimType)     { Alert.alert('Required', 'Please select a claim type.'); return; }
    if (!expenseDate)   { Alert.alert('Required', 'Please select an expense date.'); return; }
    if (!amount)        { Alert.alert('Required', 'Please enter an amount.'); return; }
    if (isNaN(Number(amount))) { Alert.alert('Invalid', 'Amount must be a number.'); return; }
    if (isFuel && !kmTravel)  { Alert.alert('Required', 'Please enter KM traveled.'); return; }

    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/claim', {
        expense_type:      claimType,
        claim_date:        expenseDate,
        amount:            Number(amount),
        description:       description || undefined,
        km_travel:         isFuel && kmTravel ? Number(kmTravel) : undefined,
        attachment_base64: attachments[0]?.base64 ?? undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClaimType(''); setExpenseDate(''); setKmTravel('');
      setDescription(''); setAmount(''); setAttachments([]);
      refetchClaims();
      Alert.alert('Submitted', 'Claim request submitted successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontFamily: 'Inter_400Regular',
    color: colors.foreground, backgroundColor: colors.card,
  };

  const days = buildMonthDays(pickerYear, pickerMonth);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: AMBER, paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Claim Request</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Submit an expense reimbursement</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>

        {/* ── Form Card ─────────────────────────────── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 18 }}>New Claim Request</Text>

          {/* Expense Date */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7, flexDirection: 'row' }}>
              Expense Date
            </Text>
            <TouchableOpacity onPress={() => setDatePickerOpen(true)}
              style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: expenseDate ? colors.foreground : colors.mutedForeground }}>
                {expenseDate ? formatClaimDate(expenseDate) : 'Select expense date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={AMBER} />
            </TouchableOpacity>
          </View>

          {/* Claim Type */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7 }}>Claim Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CLAIM_TYPES.map(ct => {
                const active = claimType === ct.label;
                return (
                  <TouchableOpacity key={ct.label} onPress={() => { setClaimType(ct.label); if (!FUEL_TYPES.includes(ct.label)) setKmTravel(''); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? AMBER : colors.muted, borderWidth: 1.5, borderColor: active ? AMBER : colors.border }}>
                    <Ionicons name={ct.icon as any} size={14} color={active ? '#fff' : colors.mutedForeground} />
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: active ? '#fff' : colors.mutedForeground }}>{ct.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* KM Travel — only for Fuel */}
          {isFuel && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7 }}>KM Travel</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 13, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.muted }}>
                  <Ionicons name="map-outline" size={16} color={colors.mutedForeground} />
                </View>
                <TextInput
                  style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground }}
                  value={kmTravel}
                  onChangeText={setKmTravel}
                  placeholder="Enter kilometers traveled"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
                <Text style={{ paddingRight: 12, fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.mutedForeground }}>km</Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7 }}>Description</Text>
            <TextInput
              style={{ ...inputStyle, height: 90, textAlignVertical: 'top', paddingTop: 12 }}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </View>

          {/* Amount */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7 }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 13, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: '#fef3c7' }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: AMBER }}>₹</Text>
              </View>
              <TextInput
                style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Attachments */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 7 }}>Attachments</Text>
            <TouchableOpacity onPress={pickImages}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: AMBER, borderRadius: 12, borderStyle: 'dashed', padding: 14, backgroundColor: '#fef3c7' + '30' }}>
              <Ionicons name="add-circle-outline" size={20} color={AMBER} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: AMBER }}>
                {attachments.length > 0 ? `${attachments.length} file(s) selected — Add more` : 'Add Attachments'}
              </Text>
            </TouchableOpacity>
            {attachments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
                {attachments.map((a, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: a.uri }} style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: colors.border }} />
                    <TouchableOpacity onPress={() => removeAttachment(i)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
            style={{ height: 56, borderRadius: 14, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: loading ? 0.7 : 1, shadowColor: AMBER, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 5 }}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 }}>APPLY CLAIM</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── My Claim Reports ──────────────────────── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={16} color={AMBER} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.foreground }}>My Claim Reports</Text>
            </View>
            <TouchableOpacity onPress={() => refetchClaims()} style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {claimsLoading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator color={AMBER} />
              <Text style={{ marginTop: 10, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>Loading your claims…</Text>
            </View>
          ) : claims.length === 0 ? (
            <View style={{ padding: 36, alignItems: 'center' }}>
              <Ionicons name="inbox-outline" size={40} color={colors.border} />
              <Text style={{ marginTop: 12, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>No claims found</Text>
              <Text style={{ marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'center' }}>Your submitted claims will appear here.</Text>
            </View>
          ) : (
            <>
              {claims.map((c, i) => {
                const st = STATUS_STYLE[c.status] || { bg: colors.muted, text: colors.mutedForeground };
                const claimId = c.name ?? `#${c.id}`;
                return (
                  <View key={claimId} style={{ padding: 14, borderBottomWidth: i < claims.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{c.expense_type}</Text>
                          {c.km_travel && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#dbeafe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                              <Ionicons name="map-outline" size={10} color={BLUE} />
                              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: BLUE }}>{c.km_travel} km</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>
                          {formatClaimDate(c.claim_date)}  ·  {claimId}
                        </Text>
                        {!!c.description && (
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 3 }} numberOfLines={1}>{c.description}</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground }}>₹{Number(c.amount).toLocaleString()}</Text>
                        <View style={{ backgroundColor: st.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: st.text }}>{c.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground }}>Total Claims: {claims.length}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: AMBER }}>
                  ₹{claims.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Date Picker Modal ─────────────────────── */}
      <Modal visible={datePickerOpen} transparent animationType="slide" onRequestClose={() => setDatePickerOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setDatePickerOpen(false)} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Select Expense Date</Text>
            <TouchableOpacity onPress={() => setDatePickerOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Year + Month row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20 }}>
            <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, minWidth: 50, textAlign: 'center' }}>{pickerYear}</Text>
            <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <View style={{ width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 4 }} />

            <TouchableOpacity onPress={() => setPickerMonth(m => m === 1 ? 12 : m - 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, minWidth: 44, textAlign: 'center' }}>{MONTHS[pickerMonth - 1]}</Text>
            <TouchableOpacity onPress={() => setPickerMonth(m => m === 12 ? 1 : m + 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 6, justifyContent: 'center' }}>
            {days.map(d => {
              const active = d === pickerDay;
              return (
                <TouchableOpacity key={d} onPress={() => setPickerDay(d)}
                  style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: active ? AMBER : colors.muted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: active ? AMBER : colors.border }}>
                  <Text style={{ fontSize: 14, fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular', color: active ? '#fff' : colors.foreground }}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={confirmDate}
            style={{ margin: 16, height: 52, borderRadius: 14, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' }}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
