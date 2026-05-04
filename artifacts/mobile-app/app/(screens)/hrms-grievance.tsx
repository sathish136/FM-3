import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const ACCENT = '#0f172a';
const CATEGORIES = ['HR Policy', 'Salary / Payroll', 'Leave Issue', 'Harassment', 'Workplace Safety', 'Management Issue', 'Discrimination', 'Other'];
const PRIORITIES  = ['Low', 'Medium', 'High', 'Urgent'];
const PRI_COLOR: Record<string, { color: string; bg: string }> = {
  Low:    { color: '#059669', bg: '#d1fae5' },
  Medium: { color: '#d97706', bg: '#fef3c7' },
  High:   { color: '#dc2626', bg: '#fee2e2' },
  Urgent: { color: '#7c2d12', bg: '#fde8e8' },
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}{required && <Text style={{ color: '#dc2626' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function HrmsGrievanceScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === 'web' ? 67 : insets.top;

  const [category,    setCategory]    = useState('HR Policy');
  const [priority,    setPriority]    = useState('Medium');
  const [description, setDescription] = useState('');
  const [anonymous,   setAnonymous]   = useState(false);
  const [loading,     setLoading]     = useState(false);

  const submit = async () => {
    if (!description.trim()) { Alert.alert('Required', 'Please describe your grievance.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/grievance', { category, priority, description: description.trim(), is_anonymous: anonymous });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your grievance has been submitted. It will be reviewed confidentially.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed. Please try again.');
    }
    setLoading(false);
  };

  const inputStyle = {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground,
    backgroundColor: colors.muted,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: ACCENT, paddingTop: topPad + 12, paddingBottom: 22, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <TouchableOpacity onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Raise a Grievance</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>All submissions are treated confidentially</Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="megaphone-outline" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={{ backgroundColor: '#e8effd', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24, borderWidth: 1, borderColor: '#c7d7fa' }}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#1a3fbd" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1a3fbd', lineHeight: 18 }}>
            Your grievance will be reviewed by the HR team. You may choose to submit anonymously. For urgent matters, call <Text style={{ fontFamily: 'Inter_700Bold' }}>0421 4414444</Text>.
          </Text>
        </View>

        <Field label="Category" required>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: category === c ? ACCENT : colors.muted, borderWidth: 1.5, borderColor: category === c ? ACCENT : colors.border }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: category === c ? '#fff' : colors.mutedForeground }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Priority">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRIORITIES.map(p => {
              const pc = PRI_COLOR[p];
              const sel = priority === p;
              return (
                <TouchableOpacity key={p} onPress={() => setPriority(p)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, backgroundColor: sel ? pc.color : colors.muted, borderWidth: 1.5, borderColor: sel ? pc.color : colors.border, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: sel ? '#fff' : colors.mutedForeground }}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="Description" required>
          <TextInput
            style={[inputStyle, { height: 140, textAlignVertical: 'top', paddingTop: 12 }]}
            value={description} onChangeText={setDescription}
            placeholder="Describe your grievance in detail. Include dates, names, and specific incidents where possible…"
            placeholderTextColor={colors.mutedForeground}
            multiline maxLength={1000}
          />
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 4, textAlign: 'right' }}>{description.length}/1000</Text>
        </Field>

        <Field label="Anonymity">
          <TouchableOpacity onPress={() => setAnonymous(a => !a)} activeOpacity={0.8}
            style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: anonymous ? ACCENT : colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: anonymous ? '#f1f5f9' : colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={anonymous ? 'eye-off-outline' : 'person-outline'} size={20} color={anonymous ? ACCENT : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                {anonymous ? 'Anonymous Submission' : 'Submit with My Name'}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>
                {anonymous ? 'Your name will not be visible to reviewers' : 'HR team will know this is from you'}
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: colors.border, true: ACCENT }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 56, borderRadius: 16, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' }}>Submit Grievance</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
