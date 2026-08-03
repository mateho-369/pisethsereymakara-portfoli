import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthUser } from '../lib/api';

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: true, isAdmin: false, refresh: async () => undefined, signOut: async () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'admin',
    refresh,
    signOut,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
