import { useEffect, useMemo, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import {
  ChatSession,
  createSession,
  deleteMessages,
  getActiveSessionId,
  loadSessions,
  saveSessions,
  saveMessages,
  setActiveSessionId,
} from '../lib/chatStore';

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeId, setActiveId] = useState<string | null>(() => getActiveSessionId());
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (sessions.length === 0) {
      const s = createSession();
      const next = [s];
      saveSessions(next);
      setActiveSessionId(s.id);
      setSessions(next);
      setActiveId(s.id);
      return;
    }
    if (!activeId || !sessions.some((s) => s.id === activeId)) {
      setActiveId(sessions[0].id);
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeId]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sessions]
  );

  function newSession() {
    const s = createSession();
    const next = [s, ...sessions];
    saveSessions(next);
    setSessions(next);
    setActiveId(s.id);
    setActiveSessionId(s.id);
  }

  function selectSession(id: string) {
    setActiveId(id);
    setActiveSessionId(id);
  }

  function clearCurrent() {
    if (!activeId) return;
    saveMessages(activeId, []);
    const next = sessions.map((s) =>
      s.id === activeId
        ? { ...s, title: 'New chat', messageCount: 0, updatedAt: new Date().toISOString() }
        : s
    );
    saveSessions(next);
    setSessions(next);
    setRefreshTick((t) => t + 1);
  }

  function removeSession(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    saveSessions(next);
    deleteMessages(id);
    setSessions(next);
    if (activeId === id) {
      const fallback = next[0]?.id ?? null;
      setActiveId(fallback);
      setActiveSessionId(fallback);
    }
  }

  const activeSession = sortedSessions.find((s) => s.id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-9rem)]">
      <aside className="lg:col-span-1 card flex flex-col min-h-[320px]">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="section-title">Sessions</div>
          <button
            type="button"
            onClick={newSession}
            className="btn-ghost !px-2 !py-1 !border !border-neutral-200 text-xs"
            title="New session"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedSessions.length === 0 ? (
            <div className="p-4 text-xs text-neutral-500">No sessions yet.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {sortedSessions.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                      isActive ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'
                    }`}
                    onClick={() => selectSession(s.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium truncate ${
                          isActive ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {s.title}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isActive ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {new Date(s.updatedAt).toLocaleString()} · {s.messageCount} msg
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this session?')) removeSession(s.id);
                      }}
                      className={`text-xs px-1 ${
                        isActive ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-red-600'
                      }`}
                      aria-label="Delete session"
                      title="Delete session"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="lg:col-span-3 min-h-[420px] h-full">
        {activeSession ? (
          <ChatPanel
            key={activeSession.id + ':' + refreshTick}
            sessionId={activeSession.id}
            heightClass="h-full"
            showDateRange
            onMessagesChange={(msgs) => {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === activeSession.id ? { ...s, messageCount: msgs.length } : s
                )
              );
            }}
            headerExtras={
              <button
                type="button"
                onClick={clearCurrent}
                className="btn-ghost !px-2 !py-1 !border !border-neutral-200 text-xs"
                title="Clear current chat"
              >
                Clear chat
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
