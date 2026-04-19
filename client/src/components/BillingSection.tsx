import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, getToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';

function planName(plan: string): string {
  if (plan === 'business') return 'Business';
  if (plan === 'pro') return 'Pro';
  return 'Free';
}

function statusLabel(plan: string, status: string, hasProAccess: boolean): string {
  const name = planName(plan);
  if (!hasProAccess && plan === 'free') return 'Free';
  if (hasProAccess && status === 'trialing') return `${name} · Trial`;
  if (hasProAccess && status === 'active') return `${name} · Active`;
  if (status === 'past_due') return `${name} · Payment failed`;
  if (status === 'canceled') return `${name} · Canceled`;
  return name;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function downloadExport(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BillingSection() {
  const { business, setBusiness } = useAuth();
  const navigate = useNavigate();
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sub = business?.subscription;
  const [exporting, setExporting] = useState<string | null>(null);
  if (!sub) return null;

  const onPro = sub.hasProAccess;
  const onBusiness = onPro && sub.plan === 'business';

  async function onExport(kind: 'all' | 'products' | 'sales') {
    setError(null);
    setExporting(kind);
    try {
      if (kind === 'all') await downloadExport('/export/all.json', `askly-export-${Date.now()}.json`);
      if (kind === 'products') await downloadExport('/export/products.csv', 'products.csv');
      if (kind === 'sales') await downloadExport('/export/sales.csv', 'sales.csv');
    } catch (e) {
      setError((e as Error).message || 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  async function refresh() {
    try {
      const b = await api<any>('/business');
      if (business && b?.id) setBusiness({ ...business, ...b, subscription: b.subscription });
    } catch {
      // non-fatal
    }
  }

  async function onCancel() {
    const name = sub ? planName(sub.plan) : 'Pro';
    if (!confirm(`Cancel your ${name} subscription? You'll keep access until the end of the current billing period.`)) return;
    setCanceling(true);
    setError(null);
    try {
      await api('/billing/cancel', { method: 'POST' });
      setNotice('Subscription set to cancel at period end.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-neutral-200 section-title">Billing</div>
      <div className="p-5 space-y-4">
        {error && <div className="text-sm text-red-700">{error}</div>}
        {notice && <div className="text-sm text-neutral-700">{notice}</div>}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Current plan</div>
            <div className="text-lg font-semibold text-neutral-900 mt-1">
              {statusLabel(sub.plan, sub.status, sub.hasProAccess)}
            </div>
            <div className="text-xs text-neutral-500 mt-1 space-y-0.5">
              {sub.status === 'trialing' && sub.trialEndsAt && (
                <div>Trial ends {formatDate(sub.trialEndsAt)}</div>
              )}
              {sub.status === 'active' && sub.currentPeriodEnd && (
                <div>
                  {sub.cancelAtPeriodEnd ? 'Cancels on ' : 'Renews on '}
                  {formatDate(sub.currentPeriodEnd)}
                </div>
              )}
              {!onPro && <div>Upgrade for AI Assistant, Reports, imports and unlimited records.</div>}
            </div>
          </div>

          <div className="flex gap-2">
            {!onPro && (
              <button type="button" onClick={() => navigate('/pricing')} className="btn-primary">
                Upgrade to Pro
              </button>
            )}
            {onPro && !sub.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={onCancel}
                disabled={canceling}
                className="btn-ghost !border !border-neutral-200 disabled:opacity-50"
              >
                {canceling ? 'Canceling…' : 'Cancel subscription'}
              </button>
            )}
            {onPro && sub.cancelAtPeriodEnd && (
              <button type="button" onClick={() => navigate('/pricing')} className="btn-primary">
                Resume Pro
              </button>
            )}
          </div>
        </div>

        {onBusiness && (
          <div className="border-t border-neutral-200 pt-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Data export</div>
            <div className="text-xs text-neutral-500 mt-1">
              Download everything in your account. CSVs open in Excel or Sheets.
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => onExport('all')}
                disabled={exporting !== null}
                className="btn-ghost !border !border-neutral-200 disabled:opacity-50"
              >
                {exporting === 'all' ? 'Preparing…' : 'Full export (JSON)'}
              </button>
              <button
                type="button"
                onClick={() => onExport('products')}
                disabled={exporting !== null}
                className="btn-ghost !border !border-neutral-200 disabled:opacity-50"
              >
                {exporting === 'products' ? 'Preparing…' : 'Products (CSV)'}
              </button>
              <button
                type="button"
                onClick={() => onExport('sales')}
                disabled={exporting !== null}
                className="btn-ghost !border !border-neutral-200 disabled:opacity-50"
              >
                {exporting === 'sales' ? 'Preparing…' : 'Sales (CSV)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
