import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, businessName, currency });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setError(err instanceof ApiError ? err.message : 'We are working to fix this issue. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-neutral-950 text-white p-12">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">AI-SME</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            Business intelligence,
            <br />
            grounded in your data.
          </div>
        </div>
        <div className="space-y-3">
          {[
            'Real-time sales, inventory, and expense tracking',
            'Natural-language answers from your own numbers',
            'Pluggable AI — pick from seven providers',
          ].map((t) => (
            <div key={t} className="flex items-start gap-3 text-sm text-neutral-300">
              <span className="mt-1 block h-1.5 w-1.5 bg-white" />
              {t}
            </div>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">
          © {new Date().getFullYear()}
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1 lg:hidden">
            AI-SME
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-neutral-500 mt-1 mb-6">
            {mode === 'login'
              ? 'Welcome back to your dashboard.'
              : 'Register your business in less than a minute.'}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input mt-1.5"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <input
                    className="input mt-1.5"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
              />
            </div>
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            className="mt-4 text-xs text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
