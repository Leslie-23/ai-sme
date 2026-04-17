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

const SESSIONS_KEY = 'ai_sme_chat_sessions_v1';
const ACTIVE_KEY = 'ai_sme_chat_active_v1';
const MESSAGES_PREFIX = 'ai_sme_chat_messages_v1_';

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
  return read<ChatSession[]>(SESSIONS_KEY, []);
}

export function saveSessions(sessions: ChatSession[]): void {
  write(SESSIONS_KEY, sessions);
}

export function loadMessages(sessionId: string): ChatMessage[] {
  return read<ChatMessage[]>(MESSAGES_PREFIX + sessionId, []);
}

export function saveMessages(sessionId: string, messages: ChatMessage[]): void {
  write(MESSAGES_PREFIX + sessionId, messages);
}

export function deleteMessages(sessionId: string): void {
  try {
    localStorage.removeItem(MESSAGES_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSessionId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
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
