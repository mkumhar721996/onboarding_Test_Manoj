import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../lib/authApi';

export interface SessionUser {
  name: string;
  email: string;
  rememberMe: boolean;
}

export type ExpiryReason = 'inactivity' | 'remember' | 'none';

interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  expiredReason: ExpiryReason | null;
  refresh: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  logout: () => Promise<boolean>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiredReason, setExpiredReason] = useState<ExpiryReason | null>(null);

  const refresh = useCallback(async () => {
    const res = await authApi.session();
    if (res.ok) {
      setUser(res.data as SessionUser);
      setExpiredReason(null);
    } else {
      setUser(null);
      setExpiredReason((res.data.reason as ExpiryReason) ?? 'none');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const logout = useCallback(async () => {
    const res = await authApi.logout();
    setUser(null);
    setExpiredReason(null);
    return Boolean(res.data.rememberMe);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, expiredReason, refresh, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
