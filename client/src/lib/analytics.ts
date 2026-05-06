import { api } from './api';
import type { AuthBusiness, AuthUser } from '../context/AuthContext';

type AnalyticsProps = Record<string, unknown>;

let identity: {
  user: AuthUser | null;
  business: AuthBusiness | null;
} = { user: null, business: null };

export function identifyAnalytics(user: AuthUser | null, business: AuthBusiness | null): void {
  identity = { user, business };
}

export function track(event: string, properties: AnalyticsProps = {}): void {
  const enriched = {
    ...properties,
    userId: identity.user?.id || null,
    businessId: identity.business?.id || null,
    role: identity.user?.role || null,
    plan: identity.business?.subscription?.plan || null,
    businessType: identity.business?.businessType || null,
  };

  void api('/analytics/events', {
    method: 'POST',
    body: { name: event, properties: enriched },
  }).catch(() => {
    // Analytics must never block product workflows.
  });

  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  const host = (import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com').replace(/\/+$/, '');
  const distinctId = identity.user?.id || identity.business?.id || getAnonymousId();
  void fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: enriched,
    }),
    keepalive: true,
  }).catch(() => {
    // Best-effort external analytics.
  });
}

function getAnonymousId(): string {
  const key = 'ai_sme_anon_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
