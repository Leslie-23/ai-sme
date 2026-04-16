import { FormEvent, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  timestamp: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const payload: { userQuery: string; dateRange?: { from?: string; to?: string } } = {
        userQuery: userMsg.text,
      };
      if (from || to) {
        payload.dateRange = {
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined,
        };
      }
      const res = await api<{ response: string; modelUsed: string; timestamp: string }>('/ai/query', {
        method: 'POST',
        body: payload,
      });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: res.response,
          modelUsed: res.modelUsed,
          timestamp: res.timestamp,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI query failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="card lg:col-span-3 flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-20">
              Ask about your sales, products, expenses, or trends.
              <div className="text-xs mt-2">
                e.g. "What were my top 3 products last week?" · "How does this month compare to last?"
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white ml-auto'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.text}
                {m.modelUsed && (
                  <div className="text-[10px] uppercase tracking-wide mt-1 opacity-70">
                    {m.modelUsed}
                  </div>
                )}
              </div>
            ))
          )}
          {sending && <div className="text-xs text-slate-500">Thinking…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ask a question about your business…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-3">Context window</h2>
        <p className="text-xs text-slate-500 mb-3">Constrain the data the AI sees. Default: last 30 days.</p>
        <div className="space-y-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
