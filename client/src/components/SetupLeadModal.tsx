import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { track } from '../lib/analytics';

const OWNER_EMAIL = 'lesliepaulajayi@gmail.com';
const OWNER_WHATSAPP_NUMBER = import.meta.env.VITE_OWNER_WHATSAPP_NUMBER?.replace(/\D/g, '');

type SetupForm = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  currentSystem: string;
  goal: string;
};

const INITIAL_FORM: SetupForm = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  businessType: 'retail',
  currentSystem: '',
  goal: '',
};

export function SetupLeadModal({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: 'landing' | 'dashboard';
}) {
  const [form, setForm] = useState<SetupForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setError(null);
    setSubmitting(false);
    setForm(INITIAL_FORM);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function buildMessage(data: SetupForm) {
    return [
      'Hi Leslie,',
      '',
      `A new assisted setup request came from the ${source === 'landing' ? 'landing page' : 'dashboard'}.`,
      '',
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone / WhatsApp: ${data.phone || '-'}`,
      `Business: ${data.businessName}`,
      `Business type: ${data.businessType}`,
      `Current system: ${data.currentSystem || '-'}`,
      `Goal: ${data.goal || '-'}`,
      '',
    ].join('\n');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);
    try {
      await api('/leads/setup', { method: 'POST', body: form });
      track('setup_lead_submitted', { source, businessType: form.businessType });

      const body = buildMessage(form);
      const emailUrl = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent('Intellexa assisted setup')}&body=${encodeURIComponent(body)}`;
      const whatsappText = encodeURIComponent(body);
      const whatsappUrl = OWNER_WHATSAPP_NUMBER
        ? `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${whatsappText}`
        : `https://wa.me/?text=${whatsappText}`;

      window.open(emailUrl, '_blank', 'noopener,noreferrer');
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setStatus('Request prepared for email and WhatsApp.');
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit setup request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay z-[70]">
      <div className="modal-panel max-w-2xl px-6 py-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Assisted setup</div>
        <div className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">Send your setup request</div>
        <p className="mt-2 text-sm text-neutral-600">
          Capture the basics here and we'll send the request to <span className="font-medium text-neutral-900">{OWNER_EMAIL}</span> by email and WhatsApp.
          {OWNER_WHATSAPP_NUMBER ? null : (
            <span className="block mt-1 text-xs text-amber-700">
              Set <code>VITE_OWNER_WHATSAPP_NUMBER</code> to route the WhatsApp draft directly.
            </span>
          )}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Your name</label>
              <input className="input mt-1.5" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input mt-1.5" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">WhatsApp / phone</label>
              <input className="input mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Business name</label>
              <input className="input mt-1.5" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Business type</label>
            <select className="input mt-1.5" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
              <option value="retail">Retail store</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="salon_beauty">Salon / beauty retail</option>
              <option value="restaurant_cafe">Restaurant / cafe</option>
              <option value="wholesaler">Wholesaler</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Current system</label>
            <textarea
              rows={2}
              className="input mt-1.5 min-h-20 resize-y"
              placeholder="Excel, POS export, notebook, WhatsApp, none..."
              value={form.currentSystem}
              onChange={(e) => setForm({ ...form, currentSystem: e.target.value })}
            />
          </div>
          <div>
            <label className="label">What do you want to understand first?</label>
            <textarea
              className="input mt-1.5 min-h-24 resize-y"
              placeholder="Restock list, weekly report, profit leaks, slow sellers..."
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </div>
          {status && <div className="text-sm text-emerald-700">{status}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-sm" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
