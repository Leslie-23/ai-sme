import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
import { clearAllChatData, setChatScope } from '../lib/chatStore';

export interface AuthPermissions {
  recordSales: boolean;
  manageInventory: boolean;
  viewReports: boolean;
  managePayments: boolean;
  manageExpenses: boolean;
  useAI: boolean;
}

export const ALL_PERMISSIONS: AuthPermissions = {
  recordSales: true,
  manageInventory: true,
  viewReports: true,
  managePayments: true,
  manageExpenses: true,
  useAI: true,
};

export interface AuthUser {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  name?: string | null;
  roleLabel?: string | null;
  permissions: AuthPermissions;
}

function normalizeUser(raw: Partial<AuthUser> & { id: string; email: string; role: 'OWNER' | 'STAFF' }): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    role: raw.role,
    name: raw.name ?? null,
    roleLabel: raw.roleLabel ?? null,
    permissions: raw.permissions
      ? { ...ALL_PERMISSIONS, ...raw.permissions }
      : ALL_PERMISSIONS, // legacy session — assume everything until /auth/me refreshes it
  };
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

export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasProAccess: boolean;
}

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  plan: 'free',
  status: 'none',
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasProAccess: false,
};

export interface AuthBusiness {
  id: string;
  name: string;
  currency: string;
  features: BusinessFeatures;
  terminology: Terminology;
  categories: string[];
  subscription: SubscriptionInfo;
}

function normalizeBusiness(raw: Partial<AuthBusiness> & { id: string; name: string; currency: string }): AuthBusiness {
  return {
    id: raw.id,
    name: raw.name,
    currency: raw.currency,
    features: { ...DEFAULT_FEATURES, ...(raw.features || {}) },
    terminology: raw.terminology || 'product',
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    subscription: { ...DEFAULT_SUBSCRIPTION, ...(raw.subscription || {}) },
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
    return { user: normalizeUser(parsed.user), business: normalizeBusiness(parsed.business) };
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
      // Best-effort refresh of user + business from the server so permission
      // edits and plan changes take effect without a manual logout/login.
      api<{ user: AuthUser; business: AuthBusiness }>('/auth/me')
        .then((fresh) => {
          const normUser = normalizeUser(fresh.user);
          const normBiz = normalizeBusiness(fresh.business);
          setUser(normUser);
          setBusiness(normBiz);
          saveSession(normUser, normBiz);
        })
        .catch(() => {
          // 401 path already handled by the auth:unauthorized event in api.ts.
        });
    } else {
      setChatScope(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // api.ts dispatches this on any 401 response (missing/expired/invalid token).
    // We drop React state here; the fetch already cleared the stored token.
    function onUnauthorized() {
      clearAllChatData();
      setChatScope(null);
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      setBusiness(null);
    }
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  async function doAuth(path: '/auth/login' | '/auth/register', body: unknown): Promise<void> {
    const data = await api<{ token: string; user: AuthUser; business: AuthBusiness }>(path, {
      method: 'POST',
      body,
    });
    setToken(data.token);
    const normUser = normalizeUser(data.user);
    const biz = normalizeBusiness(data.business);
    saveSession(normUser, biz);
    setUser(normUser);
    setBusiness(biz);
    setChatScope(normUser.id);
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
