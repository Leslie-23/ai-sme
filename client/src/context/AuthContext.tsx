import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
import { clearAllChatData, setChatScope } from '../lib/chatStore';

export interface AuthUser {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
}

export type Terminology = 'product' | 'item' | 'service';

export interface BusinessFeatures {
  chat: boolean;
  imports: boolean;
  expenses: boolean;
  payments: boolean;
}

export const DEFAULT_FEATURES: BusinessFeatures = {
  chat: true,
  imports: true,
  expenses: true,
  payments: true,
};

export interface AuthBusiness {
  id: string;
  name: string;
  currency: string;
  features: BusinessFeatures;
  terminology: Terminology;
  categories: string[];
}

function normalizeBusiness(raw: Partial<AuthBusiness> & { id: string; name: string; currency: string }): AuthBusiness {
  return {
    id: raw.id,
    name: raw.name,
    currency: raw.currency,
    features: { ...DEFAULT_FEATURES, ...(raw.features || {}) },
    terminology: raw.terminology || 'product',
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  };
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
  setBusiness: (business: AuthBusiness) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'ai_sme_session';

function loadSession(): { user: AuthUser; business: AuthBusiness } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user || !parsed?.business) return null;
    return { user: parsed.user, business: normalizeBusiness(parsed.business) };
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
      setChatScope(sess.user.id);
    } else {
      setChatScope(null);
    }
    setLoading(false);
  }, []);

  async function doAuth(path: '/auth/login' | '/auth/register', body: unknown): Promise<void> {
    const data = await api<{ token: string; user: AuthUser; business: AuthBusiness }>(path, {
      method: 'POST',
      body,
    });
    setToken(data.token);
    const biz = normalizeBusiness(data.business);
    saveSession(data.user, biz);
    setUser(data.user);
    setBusiness(biz);
    setChatScope(data.user.id);
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
        clearAllChatData();
        setChatScope(null);
        setUser(null);
        setBusiness(null);
      },
      setBusiness: (next: AuthBusiness) => {
        const biz = normalizeBusiness(next);
        setBusiness(biz);
        if (user) saveSession(user, biz);
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
