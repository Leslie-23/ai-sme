export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const KEY_PREFIX = 'ai_sme_chat_v2';
let scope: string | null = null;

export function setChatScope(userId: string | null): void {
  scope = userId;
}

function sessionsKey(): string {
  return `${KEY_PREFIX}:${scope ?? 'anon'}:sessions`;
}

function activeKey(): string {
  return `${KEY_PREFIX}:${scope ?? 'anon'}:active`;
}

function messagesKey(sessionId: string): string {
  return `${KEY_PREFIX}:${scope ?? 'anon'}:msg:${sessionId}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or disabled storage — silent fail */
  }
}

export function loadSessions(): ChatSession[] {
  return read<ChatSession[]>(sessionsKey(), []);
}

export function saveSessions(sessions: ChatSession[]): void {
  write(sessionsKey(), sessions);
}

export function loadMessages(sessionId: string): ChatMessage[] {
  return read<ChatMessage[]>(messagesKey(sessionId), []);
}

export function saveMessages(sessionId: string, messages: ChatMessage[]): void {
  write(messagesKey(sessionId), messages);
}

export function deleteMessages(sessionId: string): void {
  try {
    localStorage.removeItem(messagesKey(sessionId));
  } catch {
    /* ignore */
  }
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(activeKey());
}

export function setActiveSessionId(id: string | null): void {
  if (id) localStorage.setItem(activeKey(), id);
  else localStorage.removeItem(activeKey());
}

export function createSession(title = 'New chat'): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export function deriveTitle(text: string, max = 48): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s) return 'New chat';
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

export function clearAllChatData(): void {
  try {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(KEY_PREFIX) || k.startsWith('ai_sme_chat_sessions_v1') || k.startsWith('ai_sme_chat_active_v1') || k.startsWith('ai_sme_chat_messages_v1_'))) {
        drop.push(k);
      }
    }
    for (const k of drop) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
