import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const BLUE = '#1a3fbd';
const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Loss of Pay'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function HrmsLeaveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [halfDay,   setHalfDay]   = useState(false);
  const [reason,    setReason]    = useState('');
  const [loading,   setLoading]   = useState(false);

  const submit = async () => {
    if (!fromDate || !toDate) { Alert.alert('Required', 'Please fill From and To dates.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/leave', { leave_type: leaveType, from_date: fromDate, to_date: toDate, half_day: halfDay, reason });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your leave application has been submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: '#7c3aed', paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Apply Leave</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Submit a leave application</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Field label="Leave Type">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {LEAVE_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setLeaveType(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: leaveType === t ? '#7c3aed' : colors.muted, borderWidth: 1, borderColor: leaveType === t ? '#7c3aed' : colors.border }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: leaveType === t ? '#fff' : colors.mutedForeground }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="From Date">
          <TextInput style={inputStyle} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="To Date">
          <TextInput style={inputStyle} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Options">
          <TouchableOpacity onPress={() => setHalfDay(h => !h)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: halfDay ? '#7c3aed' : colors.muted, borderWidth: 1.5, borderColor: halfDay ? '#7c3aed' : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              {halfDay && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground }}>Half Day</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Reason">
          <TextInput style={[inputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} value={reason} onChangeText={setReason} placeholder="Reason for leave…" placeholderTextColor={colors.mutedForeground} multiline />
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Submit Application</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
