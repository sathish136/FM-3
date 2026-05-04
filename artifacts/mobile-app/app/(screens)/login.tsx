import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';

const C = {
  bg:           '#f1f5f9',
  card:         '#ffffff',
  border:       '#e2e8f0',
  foreground:   '#0e1929',
  muted:        '#f8fafc',
  mutedText:    '#64748b',
  primary:      '#1a3fbd',
  primaryX:     '#1a3fbd',
  inputBorder:  '#cbd5e1',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [loginId, setLoginId]   = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!loginId.trim() || !password) {
      setError('Please enter your Login ID and Password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(loginId, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 107 : insets.top + 40;
  const botPad = Platform.OS === 'web' ? 58  : insets.bottom + 24;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad, paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={s.header}>
          <Image
            source={{ uri: 'https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png' }}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.brandRow}>
            <Text style={s.brandName}>FlowMatri</Text>
            <Text style={s.brandX}>x</Text>
          </View>
          <Text style={s.brandSub}>Water Treatment Technologies</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sign In</Text>
          <Text style={s.cardSub}>Enter your FlowMatriX credentials</Text>

          {/* Login ID */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Login ID</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={18} color={C.mutedText} style={s.icon} />
              <TextInput
                style={s.input}
                placeholder="Your login ID"
                placeholderTextColor={C.mutedText}
                value={loginId}
                onChangeText={v => { setLoginId(v); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={C.mutedText} style={s.icon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={C.mutedText}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={s.eye}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.mutedText} />
              </TouchableOpacity>
            </View>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.foot}>FlowMatriX · Water Treatment Technologies</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  scroll:    { flexGrow: 1, paddingHorizontal: 24, alignItems: 'center' },
  header:    { alignItems: 'center', marginBottom: 32 },
  logo:      { width: 110, height: 110, marginBottom: 12 },
  brandRow:  { flexDirection: 'row', alignItems: 'flex-end' },
  brandName: { fontSize: 32, fontFamily: 'Inter_700Bold', color: C.foreground, letterSpacing: -0.5, lineHeight: 36 },
  brandX:    { fontSize: 44, fontFamily: 'Inter_700Bold', color: C.primaryX,   letterSpacing: -0.5, lineHeight: 48 },
  brandSub:  { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: C.mutedText, marginTop: 6, textTransform: 'uppercase', letterSpacing: 2 },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: C.card,
    borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontFamily: 'Inter_700Bold',    color: C.foreground, marginBottom: 4 },
  cardSub:   { fontSize: 13, fontFamily: 'Inter_400Regular', color: C.mutedText,  marginBottom: 24 },
  fieldWrap: { marginBottom: 16 },
  label:     { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.mutedText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.inputBorder,
    borderRadius: 10, backgroundColor: C.muted,
    paddingHorizontal: 12, height: 48,
  },
  icon:      { marginRight: 8 },
  input:     { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: C.foreground },
  eye:       { padding: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#ef4444', flex: 1 },
  btn: {
    height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primary, marginTop: 8,
  },
  btnText:   { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#ffffff' },
  foot:      { marginTop: 32, fontSize: 11, fontFamily: 'Inter_400Regular', color: C.mutedText, textAlign: 'center' },
});
