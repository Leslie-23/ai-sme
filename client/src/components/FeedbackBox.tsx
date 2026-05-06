import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type FeedbackRating = 'useful' | 'not_useful';

interface StoredFeedback {
  id: string;
  businessId: string | null;
  userId: string | null;
  surface: string;
  rating: FeedbackRating;
  note: string;
  createdAt: string;
}

const FEEDBACK_KEY = 'ai_sme_feedback';

function loadFeedback(): StoredFeedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFeedback(item: StoredFeedback): void {
  const next = [item, ...loadFeedback()].slice(0, 100);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
}

export function FeedbackBox({
  surface,
  compact = false,
}: {
  surface: string;
  compact?: boolean;
}) {
  const { user, business } = useAuth();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  function submit(nextRating: FeedbackRating) {
    setRating(nextRating);
    saveFeedback({
      id: crypto.randomUUID(),
      businessId: business?.id || null,
      userId: user?.id || null,
      surface,
      rating: nextRating,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  }

  return (
    <div className={compact ? 'text-xs text-neutral-500' : 'card p-4 space-y-3'}>
      <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-2'}>
        <div className={compact ? 'text-xs text-neutral-500' : 'section-title'}>
          Was this useful?
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn-ghost !px-2 !py-1 !border text-xs ${
              rating === 'useful' ? '!border-neutral-900 !text-neutral-900' : '!border-neutral-200'
            }`}
            onClick={() => submit('useful')}
          >
            Yes
          </button>
          <button
            type="button"
            className={`btn-ghost !px-2 !py-1 !border text-xs ${
              rating === 'not_useful' ? '!border-neutral-900 !text-neutral-900' : '!border-neutral-200'
            }`}
            onClick={() => submit('not_useful')}
          >
            Not yet
          </button>
        </div>
      </div>
      {!compact && (
        <textarea
          className="input min-h-20 resize-y"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What question did you want answered, or what action was missing?"
        />
      )}
      {saved && (
        <div className="text-xs text-emerald-700">
          Saved locally for pilot review.
        </div>
      )}
    </div>
  );
}
