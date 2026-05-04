import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const TRAVEL_MODES = ['Flight', 'Train', 'Bus', 'Car', 'Other'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function HrmsTicketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [travelMode, setTravelMode]   = useState('Flight');
  const [travelDate, setTravelDate]   = useState('');
  const [from,       setFrom]         = useState('');
  const [to,         setTo]           = useState('');
  const [purpose,    setPurpose]      = useState('');
  const [loading,    setLoading]      = useState(false);

  const submit = async () => {
    if (!travelDate || !from || !to) { Alert.alert('Required', 'Please fill travel date, from and to.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/ticket', { travel_mode: travelMode, travel_date: travelDate, from_location: from, to_location: to, purpose });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Ticket booking request submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: '#059669', paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Ticket Booking</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Request travel ticket</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Field label="Travel Mode">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {TRAVEL_MODES.map(m => (
              <TouchableOpacity key={m} onPress={() => setTravelMode(m)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: travelMode === m ? '#059669' : colors.muted, borderWidth: 1, borderColor: travelMode === m ? '#059669' : colors.border }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: travelMode === m ? '#fff' : colors.mutedForeground }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Travel Date *">
          <TextInput style={inputStyle} value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>From *</Text>
            <TextInput style={inputStyle} value={from} onChangeText={setFrom} placeholder="Origin city" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>To *</Text>
            <TextInput style={inputStyle} value={to} onChangeText={setTo} placeholder="Destination" placeholderTextColor={colors.mutedForeground} />
          </View>
        </View>

        <Field label="Purpose">
          <TextInput style={[inputStyle, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]} value={purpose} onChangeText={setPurpose} placeholder="Purpose of travel…" placeholderTextColor={colors.mutedForeground} multiline />
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Submit Request</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
