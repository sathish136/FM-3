import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  email: string;
  full_name: string;
  photo: string | null;
  username: string | null;
  designation: string | null;
  isAgent?: boolean;
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

async function applyUserSettingsFromDb(email: string): Promise<{ isAgent?: boolean }> {
  try {
    const res = await fetch(`${BASE}/api/auth/user-settings?email=${encodeURIComponent(email)}`);
    if (!res.ok) return {};
    const settings = await res.json();
    if (!settings) return {};

    // Apply theme (light/dark/system → fm-dark-mode)
    // Only apply if user hasn't already set a personal preference this session
    if (settings.theme === "light") {
      localStorage.setItem("fm-dark-mode", "false");
      document.documentElement.classList.remove("dark");
    } else if (settings.theme === "dark") {
      localStorage.setItem("fm-dark-mode", "true");
      document.documentElement.classList.add("dark");
    }

    // Always apply DB navbarStyle on login/session restore (admin-configured).
    // Dispatch custom events so Layout.tsx can update React state immediately.
    const sidebarKey = "fm_sidebar_collapsed";
    if (settings.navbarStyle === "launcher") {
      // Switch to launcher mode (icon grid nav)
      localStorage.setItem("fm_nav_style", "launcher");
      window.dispatchEvent(new CustomEvent("fm_nav_style_change", { detail: "launcher" }));
    } else if (settings.navbarStyle === "mini") {
      // Ensure sidebar mode, collapsed
      localStorage.setItem("fm_nav_style", "sidebar");
      window.dispatchEvent(new CustomEvent("fm_nav_style_change", { detail: "sidebar" }));
      localStorage.setItem(sidebarKey, "true");
      window.dispatchEvent(new CustomEvent("fm_sidebar_change", { detail: { collapsed: true } }));
    } else if (settings.navbarStyle === "full" || settings.navbarStyle === "auto") {
      // Ensure sidebar mode, expanded
      localStorage.setItem("fm_nav_style", "sidebar");
      window.dispatchEvent(new CustomEvent("fm_nav_style_change", { detail: "sidebar" }));
      localStorage.setItem(sidebarKey, "false");
      window.dispatchEvent(new CustomEvent("fm_sidebar_change", { detail: { collapsed: false } }));
    }
    return { isAgent: settings.isAgent === true };
  } catch {
    // Ignore errors applying DB settings — fall back to localStorage values
    return {};
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
              let designation: string | null = parsed.designation ?? null;
              try {
                const profRes = await fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(data.email || parsed.email)}`);
                if (profRes.ok) {
                  const prof = await profRes.json();
                  designation = prof.designation || null;
                }
              } catch { }
              const settings = await applyUserSettingsFromDb(data.email || parsed.email);
              const refreshed: AuthUser = {
                email: data.email || parsed.email,
                full_name: data.full_name || parsed.full_name,
                photo: proxyPhoto,
                username: (data.username as string | null) ?? parsed.username ?? null,
                designation,
                isAgent: settings.isAgent ?? parsed.isAgent ?? false,
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
              setUser(refreshed);
            }
          } catch { }
          if (!localStorage.getItem(STORAGE_KEY) || !JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").email) {
            await applyUserSettingsFromDb(parsed.email);
          }
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
      let designation: string | null = null;
      try {
        const profRes = await fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(data.email as string)}`);
        if (profRes.ok) {
          const prof = await profRes.json();
          designation = prof.designation || null;
        }
      } catch { }
      const dbSettings = await applyUserSettingsFromDb(data.email as string);
      const authUser: AuthUser = {
        email: (data.email as string),
        full_name: (data.full_name as string) || (data.email as string),
        photo: proxyPhoto,
        username: (data.username as string | null) ?? null,
        designation,
        isAgent: dbSettings.isAgent ?? false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
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

    let otpDesignation: string | null = null;
    try {
      const profRes = await fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent((data.email as string) || email)}`);
      if (profRes.ok) {
        const prof = await profRes.json();
        otpDesignation = prof.designation || null;
      }
    } catch { }
    const otpDbSettings = await applyUserSettingsFromDb((data.email as string) || email);
    const authUser: AuthUser = {
      email: (data.email as string) || email,
      full_name: (data.full_name as string) || email,
      photo: proxyPhoto,
      username: (data.username as string | null) ?? null,
      designation: otpDesignation,
      isAgent: otpDbSettings.isAgent ?? false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
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
