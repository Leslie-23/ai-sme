import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PaywallProps {
  feature: string;
  blurb?: string;
  children: React.ReactNode;
}

// Wraps a Pro-only page. If the user has Pro access, renders children.
// Otherwise renders an upgrade card with a link to /pricing.
export function Paywall({ feature, blurb, children }: PaywallProps) {
  const { business } = useAuth();
  const navigate = useNavigate();
  const hasAccess = business?.subscription?.hasProAccess;

  if (hasAccess) return <>{children}</>;

  return (
    <div className="max-w-xl mx-auto card p-8 text-center space-y-4">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500">
        <span className="chip">Pro feature</span>
      </div>
      <h2 className="text-xl font-semibold text-neutral-900">{feature}</h2>
      <p className="text-sm text-neutral-600">
        {blurb || `${feature} is available on the Pro plan.`}
      </p>
      <div className="pt-2">
        <button type="button" onClick={() => navigate('/pricing')} className="btn-primary">
          See pricing
        </button>
      </div>
    </div>
  );
}
