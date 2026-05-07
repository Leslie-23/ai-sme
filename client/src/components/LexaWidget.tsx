import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { MarkdownText } from './MarkdownText';
import { track } from '../lib/analytics';

type LexaMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: { id: string; title: string }[];
};

const STORAGE_KEY = 'ai_sme_lexa_messages_v1';

const STARTER_MESSAGES: LexaMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hi, I am Lexa. Ask me about setup, imports, sample data, reports, billing, permissions, or anything that is not working as expected.',
  },
];

const QUICK_PROMPTS = [
  'How do I start with real business data?',
  'Why is Intellexa saying data is missing?',
  'How do I import products?',
  'I have a complaint or bug',
];

export function LexaWidget({ hideLauncher = false, position = 'left' }: { hideLauncher?: boolean; position?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LexaMessage[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Support chat history is best-effort.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages, sending]);

  useEffect(() => {
    function openLexa() {
      setOpen(true);
    }
    window.addEventListener('lexa:open', openLexa);
    return () => window.removeEventListener('lexa:open', openLexa);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: LexaMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    track('lexa_question_asked');

    try {
      const res = await api<{
        response: string;
        modelUsed: string;
        sources: { id: string; title: string }[];
      }>('/support/query', {
        method: 'POST',
        body: { userQuery: trimmed },
      });
      track('lexa_answer_received', { modelUsed: res.modelUsed, sourceCount: res.sources.length });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: res.response,
          sources: res.sources,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lexa could not answer right now');
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    void send(input);
  }

  function clear() {
    const next = STARTER_MESSAGES;
    setMessages(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return (
    <div className={`fixed bottom-5 z-50 ${position === 'right' ? 'right-5' : 'left-5'}`}>
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[520px] max-h-[calc(100dvh-6rem)] bg-white border border-neutral-200 shadow-xl flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <img src="/lexa-avatar.svg" alt="" className="h-8 w-8 object-cover border border-neutral-200" />
                <div>
                  <div className="section-title">Lexa</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Help, complaints, and setup support</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={clear}>
                Clear
              </button>
              <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOpen(false)} aria-label="Close Lexa">
                x
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] border px-3 py-2 text-sm break-words ${
                    m.role === 'user'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-900 border-neutral-200'
                  }`}
                >
                  {m.role === 'assistant' ? <MarkdownText text={m.text} /> : <div className="whitespace-pre-wrap">{m.text}</div>}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-400">
                      Used: {m.sources.map((s) => s.title).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="text-left text-xs text-neutral-700 border border-neutral-200 px-3 py-2 hover:border-neutral-900"
                    onClick={() => void send(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {sending && <div className="text-sm text-neutral-500 animate-pulse">Lexa is checking the help docs...</div>}
            {error && <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}
          </div>

          <form onSubmit={onSubmit} className="border-t border-neutral-200 p-3 flex gap-2">
            <textarea
              rows={1}
              className="input flex-1 min-h-10 max-h-24 resize-none"
              placeholder="Tell Lexa what you need help with..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <button type="submit" className="btn-primary !px-3" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      {!hideLauncher && (
        <button
          type="button"
          className="h-11 w-11 border border-neutral-900 bg-neutral-950 text-white shadow-xl hover:bg-neutral-800 animate-help-icon-in"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="text-lg font-black italic leading-none">i</span>
        </button>
      )}
    </div>
  );
}

function loadMessages(): LexaMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LexaMessage[]) : STARTER_MESSAGES;
  } catch {
    return STARTER_MESSAGES;
  }
}
