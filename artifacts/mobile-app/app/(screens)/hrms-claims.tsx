import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const EXPENSE_TYPES = ['Travel', 'Accommodation', 'Food', 'Fuel', 'Medical', 'Communication', 'Office Supplies', 'Other'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function HrmsClaimsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [expenseType, setExpenseType] = useState('Travel');
  const [claimDate,   setClaimDate]   = useState('');
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  const submit = async () => {
    if (!claimDate || !amount) { Alert.alert('Required', 'Please fill date and amount.'); return; }
    if (isNaN(Number(amount))) { Alert.alert('Invalid', 'Amount must be a number.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/claim', { expense_type: expenseType, claim_date: claimDate, amount: Number(amount), description });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Expense claim submitted successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: '#d97706', paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Expense Claim</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Submit an expense reimbursement</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Field label="Expense Type">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {EXPENSE_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setExpenseType(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: expenseType === t ? '#d97706' : colors.muted, borderWidth: 1, borderColor: expenseType === t ? '#d97706' : colors.border }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: expenseType === t ? '#fff' : colors.mutedForeground }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Claim Date">
          <TextInput style={inputStyle} value={claimDate} onChangeText={setClaimDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Amount (₹)">
          <TextInput style={inputStyle} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
        </Field>

        <Field label="Description">
          <TextInput style={[inputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} value={description} onChangeText={setDescription} placeholder="Describe the expense…" placeholderTextColor={colors.mutedForeground} multiline />
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Submit Claim</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
