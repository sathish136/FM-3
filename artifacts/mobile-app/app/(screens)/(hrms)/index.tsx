import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import { ProfileImage } from '@/components/ProfileImage';
import { notifyNewAnnouncements, requestNotificationPermission } from '@/lib/notifications';

const BLUE   = '#1a3fbd';
const BLUE_D = '#152fa8';

interface Dashboard {
  today_checked_in: boolean;
  last_checkin_time: string | null;
  month_present: number;
  month_absent: number;
  pending_leaves: number;
  pending_claims: number;
  pending_onduty: number;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

const TYPE_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  info:    { bg: '#e8effd', color: BLUE,      icon: 'information-circle-outline' },
  warning: { bg: '#fff7ed', color: '#ea580c', icon: 'warning-outline' },
  urgent:  { bg: '#fee2e2', color: '#dc2626', icon: 'alert-circle-outline' },
  success: { bg: '#d1fae5', color: '#059669', icon: 'checkmark-circle-outline' },
};

const MODULES = [
  { id: 'attendance', label: 'Attendance',    icon: 'finger-print-outline', color: '#1a3fbd', bg: '#dde6fb', route: '/(hrms)/attendance' },
  { id: 'leave',      label: 'Apply Leave',   icon: 'calendar-outline',     color: '#7c3aed', bg: '#ede9fe', route: '/hrms-leave' },
  { id: 'claims',     label: 'Expense Claim', icon: 'receipt-outline',      color: '#d97706', bg: '#fef3c7', route: '/hrms-claims' },
  { id: 'onduty',     label: 'On Duty',       icon: 'briefcase-outline',    color: '#0891b2', bg: '#cffafe', route: '/hrms-onduty' },
  { id: 'ticket',     label: 'Ticket Booking',icon: 'airplane-outline',     color: '#059669', bg: '#d1fae5', route: '/hrms-ticket' },
  { id: 'site',       label: 'Site Ticket',   icon: 'construct-outline',    color: '#dc2626', bg: '#fee2e2', route: '/hrms-site-ticket' },
];

function StatCard({ label, value, icon, color, bg }: { label: string; value: string | number; icon: string; color: string; bg: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: colors.foreground, lineHeight: 30 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, textAlign: 'center', lineHeight: 14 }}>{label}</Text>
    </View>
  );
}

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const colors = useColors();
  const s = TYPE_STYLE[ann.type] || TYPE_STYLE.info;
  const timeAgo = (() => {
    try {
      const diff = Math.floor((Date.now() - new Date(ann.created_at).getTime()) / 60000);
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return `${Math.floor(diff / 1440)}d ago`;
    } catch { return ''; }
  })();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: s.color, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ionicons name={s.icon as any} size={16} color={s.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, flex: 1 }}>{ann.title}</Text>
            {!!timeAgo && <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginLeft: 8 }}>{timeAgo}</Text>}
          </View>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, lineHeight: 17 }}>{ann.body}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HrmsDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [dash,         setDash]         = useState<Dashboard | null>(null);
  const [announcements,setAnnouncements]= useState<Announcement[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [now,          setNow]          = useState(new Date());

  const initials = (user?.employee_name || user?.display_name || 'E')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (isFirst = false) => {
    try { setDash(await apiGet<Dashboard>('/api/mobile/hrms/dashboard')); } catch {}
    try {
      const a = await apiGet<{ data: Announcement[] }>('/api/mobile/hrms/announcements');
      const list = a.data ?? [];
      setAnnouncements(list);
      if (isFirst && list.length > 0) {
        await requestNotificationPermission();
        await notifyNewAnnouncements(list);
      }
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(true); }, []);

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const today    = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const pendingTotal = (dash?.pending_leaves ?? 0) + (dash?.pending_claims ?? 0) + (dash?.pending_onduty ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: BLUE, paddingTop: topPad + 8, paddingBottom: 32, paddingHorizontal: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ position: 'absolute', bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <View style={{ position: 'absolute', top: 20, right: 80, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)' }} />

        {/* Greeting row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)' }}>{greeting} 👋</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{today}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dash?.today_checked_in ? '#22c55e' : '#f87171' }} />
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.9)' }}>
              {dash?.today_checked_in ? 'Active' : 'Not In'}
            </Text>
          </View>
        </View>

        {/* Employee row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ position: 'relative' }}>
            <ProfileImage size={62} initials={initials} role={user?.role} borderColor="rgba(255,255,255,0.4)" borderWidth={2.5} />
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7,
              backgroundColor: dash?.today_checked_in ? '#22c55e' : '#94a3b8', borderWidth: 2, borderColor: BLUE }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontFamily: 'Inter_700Bold', color: '#fff', lineHeight: 24, letterSpacing: -0.3 }} numberOfLines={1}>
              {user?.employee_name || user?.display_name}
            </Text>
            {!!user?.designation && (
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 }} numberOfLines={1}>{user.designation}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 7 }}>
              {!!user?.erp_employee_id && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.9)' }}>ID: {user.erp_employee_id}</Text>
                </View>
              )}
              {!!user?.department && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' }} numberOfLines={1}>{user.department}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── SCROLLABLE ─────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Attendance quick card (overlaps header) */}
        <View style={{ marginHorizontal: 16, marginTop: -18, marginBottom: 18, backgroundColor: colors.card, borderRadius: 20, padding: 16,
          flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.10,
          shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 6, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: dash?.today_checked_in ? '#e8effd' : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={dash?.today_checked_in ? 'checkmark-circle' : 'time-outline'} size={26} color={dash?.today_checked_in ? BLUE : '#ef4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
              {loading ? 'Checking…' : dash?.today_checked_in ? 'Checked In Today' : 'Not Checked In Yet'}
            </Text>
            {dash?.last_checkin_time ? (
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>
                Since {new Date(dash.last_checkin_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : (
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 }}>Tap Mark to start your day</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/(hrms)/attendance' as any)}
            style={{ backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, shadowColor: BLUE, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' }}>Mark</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 20, marginBottom: 10 }}>This Month</Text>
        {loading ? (
          <ActivityIndicator color={BLUE} style={{ marginVertical: 12 }} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24 }}>
            <StatCard label="Days Present" value={dash?.month_present ?? '—'} icon="checkmark-circle-outline" color={BLUE}     bg="#e8effd" />
            <StatCard label="Days Absent"  value={dash?.month_absent  ?? '—'} icon="close-circle-outline"     color="#ef4444" bg="#fee2e2" />
            <StatCard label="Pending Req." value={pendingTotal}                icon="document-text-outline"     color="#d97706" bg="#fef3c7" />
          </View>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8 }}>Announcements</Text>
                <View style={{ backgroundColor: BLUE, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' }}>{announcements.length}</Text>
                </View>
              </View>
            </View>
            <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
              {announcements.map(a => <AnnouncementCard key={a.id} ann={a} />)}
            </View>
          </>
        )}

        {/* Module grid */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 20, marginBottom: 12 }}>Quick Actions</Text>
        <View style={{ marginHorizontal: 16, gap: 12 }}>
          {[0, 2, 4].map(i => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              {[MODULES[i], MODULES[i + 1]].filter(Boolean).map(mod => (
                <TouchableOpacity key={mod.id} onPress={() => router.push(mod.route as any)} activeOpacity={0.82}
                  style={{ flex: 1, backgroundColor: colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: mod.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={mod.icon as any} size={26} color={mod.color} />
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'center', lineHeight: 17 }}>{mod.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Grievance — full width */}
          <TouchableOpacity onPress={() => router.push('/hrms-grievance' as any)} activeOpacity={0.82}
            style={{ backgroundColor: '#0f172a', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.14, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="megaphone-outline" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Raise a Grievance</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Report a workplace issue confidentially</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 28, marginBottom: 4, fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>
          FlowMatriX HRMS · Water Treatment Technologies
        </Text>
      </ScrollView>
    </View>
  );
}
