import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ImportProduct {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
}

interface ExtractResponse {
  reply: string;
  records: ImportProduct[];
  done: boolean;
  modelUsed: string;
}

const INTRO = `Hi! I'll help you get your products into the system. You can paste a list, describe items one by one, or copy a table straight from Excel or WhatsApp. Tell me about your first product (or paste everything at once).`;

export function ImportPage() {
  const { business } = useAuth();
  const currency = business?.currency || 'USD';

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: crypto.randomUUID(), role: 'assistant', text: INTRO },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<ImportProduct[]>([]);
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', text: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const res = await api<ExtractResponse>('/import/extract', {
        method: 'POST',
        body: {
          kind: 'products',
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          alreadyExtracted: pending.length,
        },
      });
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', text: res.reply },
      ]);
      if (res.records.length > 0) {
        setPending((prev) => mergeBySku(prev, res.records));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Extraction failed');
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function removePending(sku: string) {
    setPending((prev) => prev.filter((p) => p.sku !== sku));
  }

  function updatePending(sku: string, patch: Partial<ImportProduct>) {
    setPending((prev) => prev.map((p) => (p.sku === sku ? { ...p, ...patch } : p)));
  }

  async function apply() {
    if (pending.length === 0) return;
    setApplying(true);
    setError(null);
    setStatus(null);
    try {
      const res = await api<{ inserted: number; updated: number; matched: number }>(
        '/import/apply',
        { method: 'POST', body: { kind: 'products', records: pending } }
      );
      setStatus(`Imported — ${res.inserted} new, ${res.updated} updated.`);
      setPending([]);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Done. Saved ${res.inserted} new and updated ${res.updated}. Anything else to add?`,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 xl:h-[calc(100vh-9rem)]">
      <div className="xl:col-span-3 card flex flex-col h-full min-h-[420px]">
        <div className="px-5 py-3 border-b border-neutral-200">
          <div className="section-title">Import assistant</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Chat your products in — paste, type, or dictate. Review on the right before saving.
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap border ${
                  m.role === 'user'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-900 border-neutral-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-500">
                <span className="inline-block animate-pulse">thinking…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className="border-t border-neutral-200 p-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Paste a list or describe a product…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="xl:col-span-2 card flex flex-col h-full min-h-[420px]">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="section-title">Ready to save</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Edit or remove before committing. Saving upserts by SKU.
            </div>
          </div>
          <span className="chip">{pending.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pending.length === 0 ? (
            <div className="p-5 text-sm text-neutral-500">
              Extracted products will appear here once the assistant identifies them.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500 text-[10px] uppercase tracking-wider border-b border-neutral-200 sticky top-0 bg-white">
                  <th className="px-4 py-2 font-medium">Name / SKU</th>
                  <th className="py-2 font-medium text-right">Stock</th>
                  <th className="py-2 font-medium text-right">Cost</th>
                  <th className="py-2 font-medium text-right">Price</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pending.map((p) => (
                  <tr key={p.sku} className="align-top">
                    <td className="px-4 py-2">
                      <div className="font-medium text-neutral-900 truncate max-w-[180px]">{p.name}</div>
                      <div className="text-[10px] text-neutral-500">
                        {p.sku} · {p.category}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        className="input !py-1 !px-2 text-xs w-16 text-right"
                        value={p.currentStock}
                        onChange={(e) =>
                          updatePending(p.sku, { currentStock: parseInt(e.target.value || '0', 10) })
                        }
                      />
                    </td>
                    <td className="py-2 text-right tabular-nums text-neutral-600">
                      {formatMoney(p.costPrice, currency)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {formatMoney(p.unitPrice, currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removePending(p.sku)}
                        className="text-neutral-400 hover:text-red-600 text-xs"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-neutral-200 p-3 flex items-center justify-between gap-3">
          {status ? (
            <span className="text-xs text-green-700">{status}</span>
          ) : (
            <span className="text-xs text-neutral-500">
              {pending.length > 0 ? `${pending.length} product(s) queued` : 'Nothing to save yet'}
            </span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={apply}
            disabled={applying || pending.length === 0}
          >
            {applying ? 'Saving…' : `Save ${pending.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeBySku(existing: ImportProduct[], incoming: ImportProduct[]): ImportProduct[] {
  const map = new Map(existing.map((p) => [p.sku, p]));
  for (const p of incoming) map.set(p.sku, p);
  return Array.from(map.values());
}
