import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { getItem, setItem, removeItem, KEYS } from '@/lib/storage';
import { apiPost } from '@/lib/api';

export type UserRole = 'crm_agent' | 'hrms_employee';

export interface AgentUser {
  token: string;
  role: UserRole;
  erp_name?: string;
  agent_name?: string;
  agent_login_id?: string;
  lead_ids?: string[];
  erp_employee_id?: string;
  employee_name?: string;
  department?: string;
  designation?: string;
  login_id?: string;
  employee_image_url?: string;
  date_of_joining?: string;
  date_of_birth?: string;
  display_name: string;
}

interface AuthContextValue {
  user: AgentUser | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalise(raw: any): AgentUser {
  const role: UserRole = raw.role === 'hrms_employee' ? 'hrms_employee' : 'crm_agent';
  return {
    ...raw,
    role,
    display_name: raw.employee_name || raw.agent_name || raw.login_id || raw.agent_login_id || 'User',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AgentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getItem<AgentUser>(KEYS.AUTH_USER);
      if (stored) setUser(normalise(stored));
      setIsLoading(false);
    })();
  }, []);

  const login = async (loginId: string, password: string) => {
    const data = await apiPost<any>('/api/mobile/login', { login_id: loginId.trim(), password });
    const normalised = normalise(data);
    await setItem(KEYS.AUTH_USER, normalised);
    await setItem(KEYS.AUTH_TOKEN, normalised.token);
    setUser(normalised);
  };

  const logout = async () => {
    await removeItem(KEYS.AUTH_USER);
    await removeItem(KEYS.AUTH_TOKEN);
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
