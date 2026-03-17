import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  email: string;
  full_name: string;
  photo: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (usr: string, pwd: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "wtt_auth_user";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (usr: string, pwd: string) => {
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

    const authUser: AuthUser = {
      email: (data.email as string) || usr,
      full_name: (data.full_name as string) || usr,
      photo: (data.photo as string | null) ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
