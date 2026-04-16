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

  if (!config) return <div className="text-slate-500">Loading settings…</div>;

  return (
    <div className="max-w-2xl">
      <form onSubmit={onSave} className="card space-y-4">
        <h2 className="font-semibold text-slate-800">AI provider</h2>
        {readOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Only the business owner can update these settings.
          </div>
        )}
        <div>
          <label className="label">Active provider</label>
          <select
            className="input mt-1"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            disabled={readOnly}
          >
            {config.providers.map((p) => (
              <option key={p} value={p}>
                {config.providerLabels[p]} (default: {config.defaultModels[p]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Model override (optional)</label>
          <input
            className="input mt-1"
            placeholder={config.defaultModels[provider]}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={readOnly}
          />
          <p className="text-xs text-slate-500 mt-1">Leave blank to use the provider default.</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-3">API keys</h3>
          <p className="text-xs text-slate-500 mb-3">
            Keys are encrypted at rest (AES-256-GCM). Leave a field blank to keep the existing key.
          </p>
          {config.providers.map((p) => (
            <div key={p} className="mb-3">
              <label className="label">{config.providerLabels[p]} API key</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="password"
                  className="input"
                  placeholder={config.apiKeyMasks[p] || 'Not set'}
                  value={keys[p] || ''}
                  onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                  disabled={readOnly}
                  autoComplete="off"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {status && <div className="text-sm text-green-600">{status}</div>}

        <button type="submit" className="btn-primary" disabled={saving || readOnly}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <div className="mt-6 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">Free-tier provider links:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Google Gemini — aistudio.google.com/app/apikey (use <code>gemini-1.5-flash</code> for highest free quota)</li>
          <li>Groq — console.groq.com/keys (Llama 3.3 70B, very fast)</li>
          <li>OpenRouter — openrouter.ai/keys (append <code>:free</code> to a model id)</li>
          <li>Mistral — console.mistral.ai (free tier on La Plateforme)</li>
          <li>Cohere — dashboard.cohere.com/api-keys (trial credits)</li>
        </ul>
      </div>
    </div>
  );
}
