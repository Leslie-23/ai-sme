import { useState } from 'react';
import { api } from '../lib/api';
import { track } from '../lib/analytics';

type FeedbackRating = 'useful' | 'not_useful';

export function FeedbackBox({
  surface,
  compact = false,
}: {
  surface: string;
  compact?: boolean;
}) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextRating: FeedbackRating) {
    setRating(nextRating);
    setError(null);
    try {
      await api('/feedback', {
        method: 'POST',
        body: {
          surface,
          rating: nextRating,
          note: note.trim(),
        },
      });
      track(surface.startsWith('report:') ? 'report_feedback_submitted' : 'assistant_feedback_submitted', {
        surface,
        rating: nextRating,
        hasNote: note.trim().length > 0,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback failed');
    }
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
          Saved for pilot review.
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
