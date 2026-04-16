import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
}

export interface AuthBusiness {
  id: string;
  name: string;
  currency: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  business: AuthBusiness | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    businessName: string;
    currency?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'ai_sme_session';

function loadSession(): { user: AuthUser; business: AuthBusiness } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser, business: AuthBusiness): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, business }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<AuthBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const sess = loadSession();
    if (token && sess) {
      setUser(sess.user);
      setBusiness(sess.business);
    }
    setLoading(false);
  }, []);

  async function doAuth(path: '/auth/login' | '/auth/register', body: unknown): Promise<void> {
    const data = await api<{ token: string; user: AuthUser; business: AuthBusiness }>(path, {
      method: 'POST',
      body,
    });
    setToken(data.token);
    saveSession(data.user, data.business);
    setUser(data.user);
    setBusiness(data.business);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      business,
      loading,
      login: (email, password) => doAuth('/auth/login', { email, password }),
      register: (input) => doAuth('/auth/register', input),
      logout: () => {
        clearToken();
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        setBusiness(null);
      },
    }),
    [user, business, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
