import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiPost } from '@/lib/api';

const ISSUE_TYPES  = ['Electrical', 'Mechanical', 'Civil', 'IT / Network', 'Plumbing', 'Safety', 'Chemical', 'Other'];
const PRIORITIES   = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_COLOR: Record<string, string> = { Low: '#059669', Medium: '#d97706', High: '#dc2626', Critical: '#7c2d12' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function HrmsSiteTicketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [siteName,   setSiteName]   = useState('');
  const [issueType,  setIssueType]  = useState('Electrical');
  const [priority,   setPriority]   = useState('Medium');
  const [description,setDescription]= useState('');
  const [loading,    setLoading]    = useState(false);

  const submit = async () => {
    if (!siteName || !description) { Alert.alert('Required', 'Please fill site name and description.'); return; }
    setLoading(true);
    try {
      await apiPost('/api/mobile/hrms/site-ticket', { site_name: siteName, issue_type: issueType, priority, description });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Site ticket raised successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Submission failed.');
    }
    setLoading(false);
  };

  const inputStyle = { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: '#dc2626', paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>Site Ticket</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }}>Raise a site issue or maintenance ticket</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Field label="Site Name *">
          <TextInput style={inputStyle} value={siteName} onChangeText={setSiteName} placeholder="Enter site / plant name" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Issue Type">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {ISSUE_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setIssueType(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: issueType === t ? '#dc2626' : colors.muted, borderWidth: 1, borderColor: issueType === t ? '#dc2626' : colors.border }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: issueType === t ? '#fff' : colors.mutedForeground }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Priority">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRIORITIES.map(p => (
              <TouchableOpacity key={p} onPress={() => setPriority(p)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: priority === p ? PRIORITY_COLOR[p] : colors.muted, borderWidth: 1, borderColor: priority === p ? PRIORITY_COLOR[p] : colors.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: priority === p ? '#fff' : colors.mutedForeground }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Description *">
          <TextInput style={[inputStyle, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]} value={description} onChangeText={setDescription} placeholder="Describe the issue in detail…" placeholderTextColor={colors.mutedForeground} multiline />
        </Field>

        <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Raise Ticket</Text></>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
