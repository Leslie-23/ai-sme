import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'openrouter' | 'mistral' | 'cohere';

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
  const { user } = useAuth();
  const readOnly = user?.role !== 'OWNER';
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
