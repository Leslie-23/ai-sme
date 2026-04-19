import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function daysBetween(future: string | null): number | null {
  if (!future) return null;
  const ms = new Date(future).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 3600 * 1000)));
}

export function SubscriptionBanner() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sub = business?.subscription;

  if (!sub) return null;
  if (location.pathname === '/pricing') return null;

  const planName = sub.plan === 'business' ? 'Business' : 'Pro';

  // Trialing + still has access: nudge about days remaining.
  if (sub.status === 'trialing' && sub.hasProAccess) {
    const days = daysBetween(sub.trialEndsAt);
    if (days == null) return null;
    return (
      <Banner
        tone="neutral"
        text={`${planName} trial: ${days} day${days === 1 ? '' : 's'} left.`}
        cta="Upgrade"
        onCta={() => navigate('/pricing')}
      />
    );
  }

  // Past-due — payment failed.
  if (sub.status === 'past_due') {
    return (
      <Banner
        tone="warn"
        text={`Your last payment failed. Update your card to keep ${planName} access.`}
        cta="Fix billing"
        onCta={() => navigate('/pricing')}
      />
    );
  }

  // Trial ended / canceled — gentle upsell, regardless of which paid plan they had.
  if (!sub.hasProAccess && (sub.status === 'canceled' || sub.status === 'trialing')) {
    return (
      <Banner
        tone="neutral"
        text="Your trial has ended. Upgrade to keep AI features and unlimited records."
        cta="Upgrade"
        onCta={() => navigate('/pricing')}
      />
    );
  }

  // Paid plan but marked to cancel.
  if (sub.hasProAccess && sub.cancelAtPeriodEnd && sub.currentPeriodEnd) {
    const days = daysBetween(sub.currentPeriodEnd);
    if (days != null) {
      return (
        <Banner
          tone="neutral"
          text={`${planName} cancels in ${days} day${days === 1 ? '' : 's'}. You can resume anytime.`}
          cta="Resume"
          onCta={() => navigate('/pricing')}
        />
      );
    }
  }

  return null;
}

function Banner({
  tone,
  text,
  cta,
  onCta,
}: {
  tone: 'neutral' | 'warn';
  text: string;
  cta: string;
  onCta: () => void;
}) {
  const bg = tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-neutral-100 border-neutral-200 text-neutral-800';
  return (
    <div className={`border-b ${bg} px-4 md:px-6 py-2 text-xs flex items-center justify-between gap-3`}>
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={onCta}
        className="text-xs font-medium underline underline-offset-2 hover:no-underline shrink-0"
      >
        {cta}
      </button>
    </div>
  );
}
