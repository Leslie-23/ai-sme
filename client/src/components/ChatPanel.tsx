import { FormEvent, useRef, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import {
  ChatMessage,
  loadMessages,
  saveMessages,
  loadSessions,
  saveSessions,
  deriveTitle,
} from '../lib/chatStore';
import {
  AttachedFile,
  AttachmentChips,
  FileAttach,
  formatAttachmentsForPrompt,
} from './FileAttach';

interface ChatPanelProps {
  sessionId: string;
  heightClass?: string;
  showDateRange?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  headerExtras?: React.ReactNode;
}

export function ChatPanel({
  sessionId,
  heightClass = 'h-[480px]',
  showDateRange = false,
  placeholder = 'Ask about your business…',
  suggestions = [
    'What were my top 3 products this month?',
    'Which payment method drives the most revenue?',
    'Am I running low on any stock?',
    'How does this week compare to last?',
  ],
  onMessagesChange,
  headerExtras,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(sessionId));
  const [input, setInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState<AttachedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadMessages(sessionId));
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    saveMessages(sessionId, messages);
    onMessagesChange?.(messages);
  }, [messages, sessionId, onMessagesChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const touchSessionMeta = useCallback(
    (firstUserText?: string) => {
      const sessions = loadSessions();
      const idx = sessions.findIndex((s) => s.id === sessionId);
      const now = new Date().toISOString();
      if (idx === -1) return;
      const current = sessions[idx];
      const shouldRename =
        firstUserText && (current.title === 'New chat' || current.messageCount === 0);
      sessions[idx] = {
        ...current,
        title: shouldRename ? deriveTitle(firstUserText!) : current.title,
        updatedAt: now,
        messageCount: current.messageCount + (firstUserText ? 1 : 0),
      };
      saveSessions(sessions);
    },
    [sessionId]
  );

  async function send(query: string) {
    const trimmed = query.trim();
    if (!trimmed && attached.length === 0) return;
    const fileLabels = attached.length > 0 ? `\n\n(attached: ${attached.map((a) => a.name).join(', ')})` : '';
    const displayText = (trimmed || '(files attached)') + fileLabels;
    const fullQuery = trimmed + formatAttachmentsForPrompt(attached);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: displayText,
      timestamp: new Date().toISOString(),
    };
    const isFirstUserMsg = messages.every((m) => m.role !== 'user');
    setMessages((m) => [...m, userMsg]);
    touchSessionMeta(isFirstUserMsg ? userMsg.text : undefined);
    setInput('');
    setAttached([]);
    setSending(true);
    setError(null);
    try {
      const payload: { userQuery: string; dateRange?: { from?: string; to?: string } } = {
        userQuery: fullQuery,
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className={`card flex flex-col ${heightClass}`}>
      <div className="px-4 sm:px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="section-title">AI Assistant</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Grounded on your live business data
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {showDateRange && (
            <>
              <input
                type="date"
                className="input !py-1 !px-2 text-xs flex-1 sm:w-36 sm:flex-none"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-neutral-400 text-xs">→</span>
              <input
                type="date"
                className="input !py-1 !px-2 text-xs flex-1 sm:w-36 sm:flex-none"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          )}
          {headerExtras}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-sm text-neutral-500 mb-4">
              Start a conversation with your business data.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-neutral-700 border border-neutral-200 px-3 py-2 hover:border-neutral-900 hover:bg-white transition-colors bg-neutral-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap border ${
                  m.role === 'user'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-900 border-neutral-200'
                }`}
              >
                {m.text}
                {m.modelUsed && (
                  <div className="text-[10px] uppercase tracking-wider mt-2 opacity-60">
                    {m.modelUsed}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-500">
              <span className="inline-block animate-pulse">thinking…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
        )}
      </div>

      <div className="border-t border-neutral-200">
        <AttachmentChips attached={attached} onRemove={(n) => setAttached(attached.filter((f) => f.name !== n))} />
        <form onSubmit={onSubmit} className="p-3 flex gap-2">
          <FileAttach attached={attached} onChange={setAttached} disabled={sending} onError={setError} />
          <input
            className="input flex-1"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={sending || (!input.trim() && attached.length === 0)}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
