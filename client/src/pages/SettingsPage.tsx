import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'openrouter' | 'mistral' | 'cohere';

const TIMEZONES = [
  'UTC',
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'GHS', label: 'Ghanaian Cedi' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'XAF', label: 'Central African Franc' },
  { code: 'XOF', label: 'West African Franc' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'INR', label: 'Indian Rupee' },
];

interface ConfigResponse {
  provider: Provider;
  model: string | null;
  defaultModels: Record<Provider, string>;
  providerLabels: Record<Provider, string>;
  providers: Provider[];
  apiKeyMasks: Record<Provider, string | null>;
}

const FREE_TIER_HINTS: Record<Provider, string> = {
  openai: 'platform.openai.com/api-keys — paid after free trial',
  anthropic: 'console.anthropic.com — paid',
  google: 'aistudio.google.com/app/apikey — free (use gemini-1.5-flash for highest quota)',
  groq: 'console.groq.com/keys — free, very fast',
  openrouter: 'openrouter.ai/keys — free models end in ":free"',
  mistral: 'console.mistral.ai — free tier on La Plateforme',
  cohere: 'dashboard.cohere.com/api-keys — trial credits',
};

export function SettingsPage() {
  const { user, business, setBusiness } = useAuth();
  const readOnly = user?.role !== 'OWNER';
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bizName, setBizName] = useState(business?.name || '');
  const [bizCurrency, setBizCurrency] = useState(business?.currency || 'USD');
  const [bizTimezone, setBizTimezone] = useState('UTC');
  const [bizInfo, setBizInfo] = useState<{ id: string; createdAt: string; updatedAt: string } | null>(
    null
  );
  const [bizSaving, setBizSaving] = useState(false);
  const [bizStatus, setBizStatus] = useState<string | null>(null);
  const [bizError, setBizError] = useState<string | null>(null);

  useEffect(() => {
    api<{
      id: string;
      name: string;
      currency: string;
      timezone: string;
      createdAt: string;
      updatedAt: string;
    }>('/business')
      .then((b) => {
        setBizName(b.name);
        setBizCurrency(b.currency);
        setBizTimezone(b.timezone);
        setBizInfo({ id: b.id, createdAt: b.createdAt, updatedAt: b.updatedAt });
      })
      .catch((e) => setBizError(e.message));
  }, []);

  async function onSaveBusiness(e: FormEvent) {
    e.preventDefault();
    setBizError(null);
    setBizStatus(null);
    setBizSaving(true);
    try {
      const updated = await api<{
        id: string;
        name: string;
        currency: string;
        timezone: string;
        createdAt: string;
        updatedAt: string;
      }>('/business', {
        method: 'PUT',
        body: { name: bizName, currency: bizCurrency, timezone: bizTimezone },
      });
      setBusiness({ id: updated.id, name: updated.name, currency: updated.currency });
      setBizInfo({ id: updated.id, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
      setBizStatus('Saved.');
    } catch (err) {
      setBizError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBizSaving(false);
    }
  }

  async function refresh() {
    const c = await api<ConfigResponse>('/config');
    setConfig(c);
    setProvider(c.provider);
    setModel(c.model || '');
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      const apiKeys: Partial<Record<Provider, string>> = {};
      for (const [k, v] of Object.entries(keys)) {
        if (v) apiKeys[k as Provider] = v;
      }
      await api('/config', {
        method: 'PUT',
        body: {
          provider,
          model: model || undefined,
          apiKeys: Object.keys(apiKeys).length > 0 ? apiKeys : undefined,
        },
      });
      setKeys({});
      setStatus('Saved.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <div className="text-neutral-500 text-sm">Loading settings…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      {readOnly && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
          Only the business owner can update these settings.
        </div>
      )}

      <form onSubmit={onSaveBusiness} className="card">
        <div className="px-5 py-3 border-b border-neutral-200 section-title">Business</div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Business name</label>
            <input
              className="input mt-1.5"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Currency</label>
              <select
                className="input mt-1.5"
                value={bizCurrency}
                onChange={(e) => setBizCurrency(e.target.value)}
                disabled={readOnly}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1.5">
                Existing totals aren't converted — only the symbol changes.
              </p>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                className="input mt-1.5"
                value={bizTimezone}
                onChange={(e) => setBizTimezone(e.target.value)}
                disabled={readOnly}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1.5">
                Used for dashboard "today / this week" boundaries.
              </p>
            </div>
          </div>

          {bizInfo && (
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-neutral-200 [&>*]:p-3 [&>*]:border-neutral-200 sm:[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-b sm:[&>*:not(:last-child)]:border-b-0">
              <div>
                <dt className="label">Business ID</dt>
                <dd className="text-xs font-mono text-neutral-700 mt-1.5 truncate" title={bizInfo.id}>
                  {bizInfo.id}
                </dd>
              </div>
              <div>
                <dt className="label">Owner</dt>
                <dd className="text-xs text-neutral-700 mt-1.5 truncate" title={user?.email}>
                  {user?.email} <span className="text-neutral-400">· {user?.role}</span>
                </dd>
              </div>
              <div>
                <dt className="label">Created</dt>
                <dd className="text-xs text-neutral-700 mt-1.5">
                  {new Date(bizInfo.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          )}

          {bizError && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {bizError}
            </div>
          )}
          {bizStatus && (
            <div className="border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">
              {bizStatus}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={bizSaving || readOnly}>
            {bizSaving ? 'Saving…' : 'Save business'}
          </button>
        </div>
      </form>

      <form onSubmit={onSave} className="card">
        <div className="px-5 py-3 border-b border-neutral-200 section-title">Active provider</div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Provider</label>
            <select
              className="input mt-1.5"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              disabled={readOnly}
            >
              {config.providers.map((p) => (
                <option key={p} value={p}>
                  {config.providerLabels[p]} — default {config.defaultModels[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Model override (optional)</label>
            <input
              className="input mt-1.5"
              placeholder={config.defaultModels[provider]}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={readOnly}
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              Leave blank to use the provider default.
            </p>
          </div>
        </div>
      </form>

      <form onSubmit={onSave} className="card">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="section-title">API keys</div>
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
            AES-256-GCM at rest
          </span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-neutral-500">
            Leave a field blank to keep the existing key.
          </p>
          {config.providers.map((p) => (
            <div key={p}>
              <div className="flex items-baseline justify-between">
                <label className="label">{config.providerLabels[p]}</label>
                <span className="text-[10px] text-neutral-400">{FREE_TIER_HINTS[p]}</span>
              </div>
              <input
                type="password"
                className="input mt-1.5"
                placeholder={config.apiKeyMasks[p] || 'Not set'}
                value={keys[p] || ''}
                onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                disabled={readOnly}
                autoComplete="off"
              />
            </div>
          ))}

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
          {status && (
            <div className="border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">
              {status}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving || readOnly}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
