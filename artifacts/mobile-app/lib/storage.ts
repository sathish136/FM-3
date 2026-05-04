import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_USER: '@flowmatrix/auth_user',
  AUTH_TOKEN: '@flowmatrix/auth_token',
  API_URL: '@flowmatrix/api_url',
  ENQUIRIES: '@flowmatrix/enquiries',
};

export { KEYS };

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

// Plant Enquiry storage
export interface LocalEnquiry {
  id: string;
  form_data: Record<string, unknown>;
  sync_status: 'pending' | 'synced' | 'error';
  created_at: string;
  updated_at: string;
  company_name?: string;
}

export async function loadEnquiries(): Promise<LocalEnquiry[]> {
  return (await getItem<LocalEnquiry[]>(KEYS.ENQUIRIES)) ?? [];
}

export async function saveEnquiry(enquiry: LocalEnquiry): Promise<void> {
  const list = await loadEnquiries();
  const idx = list.findIndex(e => e.id === enquiry.id);
  if (idx >= 0) list[idx] = enquiry;
  else list.unshift(enquiry);
  await setItem(KEYS.ENQUIRIES, list);
}

export async function deleteEnquiry(id: string): Promise<void> {
  const list = await loadEnquiries();
  await setItem(KEYS.ENQUIRIES, list.filter(e => e.id !== id));
}

export async function getApiUrl(): Promise<string> {
  const stored = await getItem<string>(KEYS.API_URL);
  return stored || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
}

export async function setApiUrl(url: string): Promise<void> {
  await setItem(KEYS.API_URL, url.replace(/\/$/, ''));
}
