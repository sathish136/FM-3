import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  email: string;
  full_name: string;
  photo: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (usr: string, pwd: string) => Promise<{ twoFaRequired: true; email: string; maskedEmail: string } | { twoFaRequired: false; user: AuthUser }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "wtt_auth_user";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function applyUserSettingsFromDb(email: string) {
  try {
    const res = await fetch(`${BASE}/api/auth/user-settings?email=${encodeURIComponent(email)}`);
    if (!res.ok) return;
    const settings = await res.json();
    if (!settings) return;

    // Apply theme (light/dark/system → fm-dark-mode)
    if (settings.theme === "light") {
      localStorage.setItem("fm-dark-mode", "false");
      document.documentElement.classList.remove("dark");
    } else if (settings.theme === "dark") {
      localStorage.setItem("fm-dark-mode", "true");
      document.documentElement.classList.add("dark");
    }

    // Apply navbarStyle (full/auto → expanded, mini → collapsed)
    if (settings.navbarStyle === "mini") {
      localStorage.setItem("fm_sidebar_collapsed", "true");
    } else if (settings.navbarStyle === "full") {
      localStorage.setItem("fm_sidebar_collapsed", "false");
    }
  } catch {
    // Ignore errors applying DB settings — fall back to localStorage values
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: AuthUser = JSON.parse(stored);
          setUser(parsed);
          try {
            const res = await fetch(
              `${BASE}/api/auth/me?email=${encodeURIComponent(parsed.email)}`
            );
            if (res.ok) {
              const data = await res.json();
              const rawPhoto = (data.photo as string | null) ?? null;
              const proxyPhoto = rawPhoto
                ? `${BASE}/api/auth/photo?url=${encodeURIComponent(rawPhoto)}`
                : null;
              const refreshed: AuthUser = {
                email: data.email || parsed.email,
                full_name: data.full_name || parsed.full_name,
                photo: proxyPhoto,
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
              setUser(refreshed);
            }
          } catch { }
          // Apply user settings from DB (theme, navbarStyle) on session restore
          await applyUserSettingsFromDb(parsed.email);
        }
      } catch { }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (usr: string, pwd: string): Promise<{ twoFaRequired: true; email: string; maskedEmail: string } | { twoFaRequired: false; user: AuthUser }> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr, pwd }),
      });
    } catch {
      throw new Error("Unable to reach the server. Please check your connection.");
    }

    let data: Record<string, unknown> = {};
    try {
      const text = await res.text();
      if (text && text.trim()) data = JSON.parse(text);
    } catch {
      throw new Error("Unexpected server response. Please try again.");
    }

    if (!res.ok) {
      throw new Error((data.error as string) || "Invalid credentials");
    }

    // Direct login — 2FA is disabled for this user
    if (data.status === "success") {
      const rawPhoto = (data.photo as string | null) ?? null;
      const proxyPhoto = rawPhoto
        ? `${BASE}/api/auth/photo?url=${encodeURIComponent(rawPhoto)}`
        : null;
      const authUser: AuthUser = {
        email: (data.email as string),
        full_name: (data.full_name as string) || (data.email as string),
        photo: proxyPhoto,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      await applyUserSettingsFromDb(authUser.email);
      return { twoFaRequired: false, user: authUser };
    }

    // OTP required
    return { twoFaRequired: true, email: data.email as string, maskedEmail: data.maskedEmail as string };
  };

  const verifyOtp = async (email: string, otp: string): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
    } catch {
      throw new Error("Unable to reach the server. Please check your connection.");
    }

    let data: Record<string, unknown> = {};
    try {
      const text = await res.text();
      if (text && text.trim()) data = JSON.parse(text);
    } catch {
      throw new Error("Unexpected server response. Please try again.");
    }

    if (!res.ok) {
      throw new Error((data.error as string) || "Verification failed");
    }

    const rawPhoto = (data.photo as string | null) ?? null;
    const proxyPhoto = rawPhoto
      ? `${BASE}/api/auth/photo?url=${encodeURIComponent(rawPhoto)}`
      : null;

    const authUser: AuthUser = {
      email: (data.email as string) || email,
      full_name: (data.full_name as string) || email,
      photo: proxyPhoto,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
    await applyUserSettingsFromDb(authUser.email);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
