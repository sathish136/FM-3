import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, Linking, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useCallback } from 'react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { ProfileImage } from '@/components/ProfileImage';
import { apiGet } from '@/lib/api';
import { requestNotificationPermission, getNotificationPermissionStatus, sendLocalNotification } from '@/lib/notifications';

const BLUE = '#1a3fbd';

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

function InfoRow({ icon, label, value, accent }: { icon: string; label: string; value?: string | null; accent?: string }) {
  const colors = useColors();
  if (!value) return null;
  const ac = accent || BLUE;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: ac + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={17} color={ac} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

interface ErpProfile {
  date_of_joining?: string;
  date_of_birth?: string;
  cell_number?: string;
}

export default function HrmsProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [erpProfile, setErpProfile] = useState<ErpProfile>({});
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const initials = (user?.employee_name || user?.display_name || 'E')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    apiGet<ErpProfile>('/api/mobile/hrms/profile')
      .then(setErpProfile).catch(() => {});
    getNotificationPermissionStatus().then(s => {
      setNotifStatus(s);
      setNotifEnabled(s === 'granted');
    });
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (Platform.OS === 'web') { setNotifEnabled(v => !v); return; }
    Haptics.selectionAsync();
    if (notifStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setNotifEnabled(granted);
      setNotifStatus(granted ? 'granted' : 'denied');
      if (granted) {
        await sendLocalNotification('🔔 Notifications Enabled', 'You will now receive HR alerts and announcements.');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications for FlowMatriX in your device Settings.', [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    } else {
      Alert.alert('Manage Notifications', 'To disable notifications, go to your device Settings.', [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [notifStatus]);

  const handleLogout = () => {
    if (Platform.OS === 'web') { logout().then(() => router.replace('/login')); return; }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout().then(() => router.replace('/login')) },
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const doj = fmtDate(erpProfile.date_of_joining || user?.date_of_joining);
  const dob = fmtDate(erpProfile.date_of_birth  || user?.date_of_birth);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 28 }} showsVerticalScrollIndicator={false}>

        {/* Blue Header */}
        <View style={{ backgroundColor: BLUE, paddingTop: topPad + 12, paddingBottom: 48, alignItems: 'center', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <View style={{ position: 'absolute', top: 30, left: 40, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)' }} />

          <ProfileImage size={88} initials={initials} role={user?.role} borderWidth={3} borderColor="rgba(255,255,255,0.45)" textSize={30} />
          <Text style={{ fontSize: 21, fontFamily: 'Inter_700Bold', color: '#fff', marginTop: 14, letterSpacing: -0.3 }}>
            {user?.employee_name || user?.display_name}
          </Text>
          {!!user?.designation && (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{user.designation}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 }}>
            {!!user?.department && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                <Ionicons name="business-outline" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.9)' }}>{user.department}</Text>
              </View>
            )}
            {!!user?.erp_employee_id && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                <Ionicons name="id-card-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' }}>{user.erp_employee_id}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Card overlapping header */}
        <View style={{ marginHorizontal: 16, marginTop: -24, marginBottom: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 6 }}>
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8 }}>Employee Details</Text>
            </View>
            <InfoRow icon="person-outline"    label="Full Name"      value={user?.employee_name} />
            <InfoRow icon="briefcase-outline" label="Designation"    value={user?.designation} />
            <InfoRow icon="at-outline"        label="Login ID"       value={user?.login_id} />
            {!!doj && <InfoRow icon="calendar-outline"  label="Date of Joining" value={doj} accent="#059669" />}
            {!!dob && <InfoRow icon="gift-outline"      label="Date of Birth"   value={dob}   accent="#7c3aed" />}
            <View style={{ height: 4 }} />
          </View>
        </View>

        {/* Notifications */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginHorizontal: 20 }}>Notifications</Text>
        <View style={{ marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: notifEnabled ? '#e8effd' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={notifEnabled ? 'notifications' : 'notifications-off-outline'} size={20} color={notifEnabled ? BLUE : '#94a3b8'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Push Notifications</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 1 }}>
                {notifEnabled ? 'Enabled — receiving HR alerts' : 'Tap to enable HR notifications'}
              </Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#e2e8f0', true: '#bfcef8' }}
              thumbColor={notifEnabled ? BLUE : '#94a3b8'}
            />
          </View>
          {[
            { icon: 'calendar-outline', label: 'Leave approvals', enabled: notifEnabled },
            { icon: 'receipt-outline',  label: 'Claim status updates', enabled: notifEnabled },
            { icon: 'megaphone-outline', label: 'Announcements', enabled: notifEnabled },
          ].map((n, i, arr) => (
            <View key={n.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Ionicons name={n.icon as any} size={15} color={n.enabled ? BLUE : '#94a3b8'} />
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: n.enabled ? colors.foreground : colors.mutedForeground }}>{n.label}</Text>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: n.enabled ? '#22c55e' : '#cbd5e1' }} />
            </View>
          ))}
        </View>

        {/* Help & Support */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginHorizontal: 20 }}>Help & Support</Text>
        <View style={{ marginHorizontal: 16 }}>
          {/* Single HR contact card */}
          <TouchableOpacity onPress={() => Linking.openURL('tel:04214414444')} activeOpacity={0.8}
            style={{ backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 }}>
            <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: '#e8effd', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="people" size={24} color={BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.mutedForeground }}>HR Department</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 1 }}>0421 4414444</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 1 }}>Water Treatment Technologies</Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Quick links */}
          <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 }}>
            <TouchableOpacity onPress={() => router.push('/hrms-grievance' as any)} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="megaphone-outline" size={17} color="#475569" />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground }}>Raise a Grievance</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}
            style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#fecaca' }}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#dc2626' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 24, fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>
          FlowMatriX HRMS v2.0 · Water Treatment Technologies
        </Text>
      </ScrollView>
    </View>
  );
}
