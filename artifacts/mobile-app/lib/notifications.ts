import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SEEN_KEY = 'hrms_seen_announcements_v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: true },
      trigger: null,
    });
  } catch {}
}

export async function notifyNewAnnouncements(announcements: { id: number; title: string; body: string; type: string }[]) {
  if (Platform.OS === 'web' || announcements.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    const seen: number[] = raw ? JSON.parse(raw) : [];
    const unseen = announcements.filter(a => !seen.includes(a.id));
    if (unseen.length === 0) return;

    if (unseen.length === 1) {
      const a = unseen[0];
      const prefix = a.type === 'urgent' ? '🚨' : a.type === 'warning' ? '⚠️' : a.type === 'success' ? '✅' : '📢';
      await sendLocalNotification(`${prefix} ${a.title}`, a.body, { announcement_id: a.id });
    } else {
      await sendLocalNotification(
        `📢 ${unseen.length} New Announcements`,
        unseen.map(a => `• ${a.title}`).join('\n'),
        { count: unseen.length }
      );
    }

    const allSeen = [...new Set([...seen, ...unseen.map(a => a.id)])];
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(allSeen));
  } catch {}
}

export async function clearSeenAnnouncements() {
  try { await AsyncStorage.removeItem(SEEN_KEY); } catch {}
}
