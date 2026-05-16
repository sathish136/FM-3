import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS } from "./storage";

async function getBase(): Promise<string> {
  // Check for a user-saved API URL first (works on all platforms)
  try {
    const stored = await AsyncStorage.getItem(KEYS.API_URL);
    if (stored) return JSON.parse(stored).replace(/\/$/, "");
  } catch {}

  // Explicit env override (set EXPO_PUBLIC_API_URL in .env to force a URL)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // Web: use same-origin so Metro/serve-web proxy forwards /api/* to API_TARGET.
  // The browser never needs direct access to the API port — works on any LAN IP.
  if (Platform.OS === "web") return "";

  // Native (Android / iOS): default to api-server dev port
  return "http://localhost:3000";
}

async function getToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function buildHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-agent-token": token } : {}),
    ...extra,
  };
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const base = await getBase();
  const headers = await buildHeaders();
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const base = await getBase();
  const headers = await buildHeaders();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
