import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  priceLabel: string;
  priceSubunit: number;
  interval: string | null;
  highlight: boolean;
  tagline: string;
  features: string[];
}

interface PlansResponse {
  configured: boolean;
  currency: string;
  publicKey: string | null;
  plans: Plan[];
}

interface CheckoutResponse {
  authorizationUrl: string;
  reference: string;
}

interface PricingGridProps {
  onCheckoutError?: (msg: string) => void;
  // Where to send unauthenticated users when they click an upgrade CTA.
  loginRedirect?: string;
  // Where Paystack should redirect back to after payment.
  callbackUrl?: string;
  // Show a compact version (used inside landing page section).
  compact?: boolean;
}

export function PricingGrid({
  onCheckoutError,
  loginRedirect = '/login',
  callbackUrl,
  compact = false,
}: PricingGridProps) {
  const { user, business } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    api<PlansResponse>('/billing/plans')
      .then(setPlans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCtaClick(planId: 'free' | 'pro' | 'business') {
    if (planId === 'free') {
      navigate(user ? '/dashboard' : loginRedirect);
      return;
    }
    if (!user) {
      navigate(loginRedirect);
      return;
    }
    if (!plans?.configured) {
      const msg = 'Payments are not configured on this deployment yet.';
      setError(msg);
      onCheckoutError?.(msg);
      return;
    }
    setCheckingOut(planId);
    setError(null);
    try {
      const r = await api<CheckoutResponse>('/billing/checkout', {
        method: 'POST',
        body: {
          planId,
          callbackUrl: callbackUrl || `${window.location.origin}/pricing`,
        },
      });
      window.location.href = r.authorizationUrl;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
      onCheckoutError?.(msg);
      setCheckingOut(null);
    }
  }

  if (loading) {
    return <div className="text-neutral-500 text-sm text-center py-8">Loading plans…</div>;
  }
  if (!plans) {
    return <div className="text-red-600 text-sm text-center py-8">{error || 'Could not load plans.'}</div>;
  }

  const currentPlan = business?.subscription?.plan || 'free';
  const hasProAccess = business?.subscription?.hasProAccess ?? false;

  return (
    <div className="space-y-4">
      {error && <div className="card p-3 text-sm text-red-700 border-red-200">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.plans.map((p) => {
          const isCurrent = currentPlan === p.id && (p.id === 'free' ? !hasProAccess : hasProAccess);
          const isPaid = p.id !== 'free';
          const busy = checkingOut === p.id;

          let ctaLabel: string;
          if (isCurrent) ctaLabel = "You're on this plan";
          else if (!user && isPaid) ctaLabel = 'Start 14-day trial';
          else if (!user) ctaLabel = 'Get started';
          else if (isPaid && busy) ctaLabel = 'Redirecting…';
          else if (isPaid) ctaLabel = `Upgrade to ${p.name}`;
          else ctaLabel = 'Switch to Free';

          const highlight = p.highlight;

          return (
            <div
              key={p.id}
              className={`card p-6 flex flex-col bg-white ${
                highlight ? 'border-neutral-900 shadow-[0_4px_32px_rgba(0,0,0,0.06)]' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-neutral-500">{p.name}</div>
                  <div className="text-2xl md:text-3xl font-semibold text-neutral-900 mt-1 tabular-nums">
                    {p.priceLabel}
                  </div>
                </div>
                {highlight && <span className="chip">Most popular</span>}
                {isCurrent && !highlight && <span className="chip">Current</span>}
              </div>

              {p.tagline && !compact && (
                <p className="text-sm text-neutral-600 mt-3">{p.tagline}</p>
              )}

              <ul className="mt-5 space-y-2 text-sm text-neutral-700 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-neutral-900 mt-[2px]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => onCtaClick(p.id)}
                  disabled={isCurrent || busy}
                  className={`${
                    highlight ? 'btn-primary' : 'btn-ghost !border !border-neutral-200'
                  } w-full disabled:opacity-50`}
                >
                  {ctaLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-neutral-500 text-center">
        Prices in {plans.currency}. Secure payments by Paystack.
        {plans.plans.find((p) => p.id === 'pro')?.interval === 'monthly' &&
          ' Cancel anytime.'}
      </div>
    </div>
  );
}
