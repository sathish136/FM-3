import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  email: string;
  full_name: string;
  photo: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (usr: string, pwd: string) => Promise<{ twoFaRequired: true; email: string; maskedEmail: string }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "wtt_auth_user";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        }
      } catch { }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (usr: string, pwd: string): Promise<{ twoFaRequired: true; email: string; maskedEmail: string }> => {
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
