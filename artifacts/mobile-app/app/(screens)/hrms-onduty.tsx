import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function HrmsOnDutyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [purpose,  setPurpose]  = useState('');
  const [location, setLocation] = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    if (!fromDate || !toDate || !purpose) { Alert.alert('Required', 'Please fill all required fields.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/onduty', { from_date: fromDate, to_date: toDate, purpose, location });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'On Duty request submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: '#0891b2', paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>On Duty Request</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Request on duty approval</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Field label="From Date *">
          <TextInput style={inputStyle} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>
        <Field label="To Date *">
          <TextInput style={inputStyle} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>
        <Field label="Purpose *">
          <TextInput style={[inputStyle, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]} value={purpose} onChangeText={setPurpose} placeholder="Reason for on duty…" placeholderTextColor={colors.mutedForeground} multiline />
        </Field>
        <Field label="Location / Site">
          <TextInput style={inputStyle} value={location} onChangeText={setLocation} placeholder="Work location or site name" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#0891b2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Submit Request</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
