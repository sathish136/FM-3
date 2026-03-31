import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface UserInfo {
  email: string;
  full_name: string;
  photo: string | null;
}

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  login: (user: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const STORAGE_KEY = "flowmatrix_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setUser(JSON.parse(val) as UserInfo);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (u: UserInfo) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
