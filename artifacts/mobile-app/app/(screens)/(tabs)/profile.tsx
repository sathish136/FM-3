import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useEnquiry } from '@/context/EnquiryContext';
import { getApiUrl, setApiUrl } from '@/lib/storage';

function Row({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: danger ? '#fee2e2' : colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={danger ? '#ef4444' : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: danger ? '#ef4444' : colors.foreground }}>{label}</Text>
        {!!value && <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 1 }}>{value}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { enquiries, pendingCount, isOnline, syncAll, isSyncing } = useEnquiry();

  const [apiUrl, setApiUrlState] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    getApiUrl().then(url => { setApiUrlState(url); setUrlInput(url); });
  }, []);

  const handleSaveUrl = async () => {
    const cleaned = urlInput.trim().replace(/\/$/, '');
    await setApiUrl(cleaned);
    setApiUrlState(cleaned);
    setEditingUrl(false);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout().then(() => router.replace('/login'));
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout().then(() => router.replace('/login')) },
      ]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const initials = (user?.agent_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>
        {/* Header */}
        <View style={{ backgroundColor: colors.primary, paddingTop: topPad + 12, paddingBottom: 32, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff' }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>{user?.agent_name || 'Agent'}</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>@{user?.agent_login_id}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOnline ? '#34d399' : '#f87171' }} />
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.9)' }}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: -16, gap: 10 }}>
          {[
            { label: 'Enquiries', value: String(enquiries.length), icon: 'clipboard-outline' },
            { label: 'Pending Sync', value: String(pendingCount), icon: 'cloud-upload-outline' },
            { label: 'Leads', value: String(user?.lead_ids?.length ?? 0), icon: 'people-outline' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 }}>
              <Ionicons name={stat.icon as any} size={20} color={colors.primary} />
              <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 6 }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.mutedForeground, marginTop: 2, textAlign: 'center' }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 6, marginHorizontal: 20 }}>Account</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <Row icon="person-outline" label="Agent Name" value={user?.agent_name} />
          <Row icon="at-outline" label="Login ID" value={user?.agent_login_id} />
          <Row icon="id-card-outline" label="ERP Reference" value={user?.erp_name} />
        </View>

        {/* Sync */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 6, marginHorizontal: 20 }}>Sync</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <Row
            icon="sync-outline"
            label={isSyncing ? 'Syncing…' : 'Sync Pending Enquiries'}
            value={pendingCount > 0 ? `${pendingCount} pending` : 'All up to date'}
            onPress={isOnline ? syncAll : undefined}
          />
        </View>

        {/* Server Config */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 6, marginHorizontal: 20 }}>Server</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {editingUrl ? (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginBottom: 8 }}>API SERVER URL</Text>
              <TextInput
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://your-api-url.replit.dev"
                placeholderTextColor={colors.mutedForeground}
                style={{ borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.foreground, backgroundColor: colors.muted }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity onPress={() => setEditingUrl(false)} style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveUrl} style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Row icon="server-outline" label="API URL" value={apiUrl || 'Not configured'} onPress={() => setEditingUrl(true)} />
          )}
        </View>

        {/* Sign Out */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, marginTop: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <Row icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </View>

        <Text style={{ textAlign: 'center', marginTop: 28, fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>FlowMatriX CRM · Water Treatment Technologies</Text>
      </ScrollView>
    </View>
  );
}
