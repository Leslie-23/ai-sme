import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PricingGrid } from '../components/PricingGrid';

interface VerifyResponse {
  ok: boolean;
  status?: string;
  plan?: string;
  currentPeriodEnd?: string;
}

export function PricingPage() {
  const { business, setBusiness } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  async function refreshBusiness() {
    try {
      const b = await api<any>('/business');
      if (business && b?.id) setBusiness({ ...business, ...b, subscription: b.subscription });
    } catch {
      // non-fatal
    }
  }

  // If Paystack redirected back with ?reference=… verify it and refresh state.
  useEffect(() => {
    const ref = params.get('reference') || params.get('trxref');
    if (!ref) return;
    setVerifyMsg('Confirming your payment…');
    api<VerifyResponse>('/billing/verify', { method: 'POST', body: { reference: ref } })
      .then(async (r) => {
        if (r.ok) {
          setVerifyMsg(`You're now on ${r.plan === 'business' ? 'Business' : 'Pro'} — welcome aboard.`);
          await refreshBusiness();
          setTimeout(() => navigate('/dashboard'), 1200);
        } else {
          setVerifyMsg(`Payment not completed (${r.status || 'unknown'}).`);
        }
      })
      .catch((e) => setVerifyMsg((e as Error).message))
      .finally(() => {
        params.delete('reference');
        params.delete('trxref');
        setParams(params, { replace: true });
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Pricing</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
          Choose the plan that fits your business
        </h1>
        <p className="text-sm text-neutral-600 max-w-xl mx-auto">
          Start free, unlock AI and unlimited records on Pro, or scale up to Business when your team
          grows. Cancel anytime.
        </p>
      </div>

      {verifyMsg && (
        <div className="card p-4 text-sm text-neutral-800 bg-neutral-50">{verifyMsg}</div>
      )}

      <PricingGrid callbackUrl={`${window.location.origin}/pricing`} />
    </div>
  );
}
