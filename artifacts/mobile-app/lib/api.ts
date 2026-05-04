import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './storage';

async function getBase(): Promise<string> {
  if (Platform.OS === 'web') return '';
  try {
    const stored = await AsyncStorage.getItem(KEYS.API_URL);
    if (stored) return JSON.parse(stored).replace(/\/$/, '');
  } catch {}
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080';
}

async function getToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-agent-token': token } : {}),
    ...extra,
  };
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const base = await getBase();
  const headers = await buildHeaders();
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const base = await getBase();
  const headers = await buildHeaders();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
