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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">AI-SME</h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'login' ? 'Sign in to your business' : 'Create your business account'}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input mt-1"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <input
                    className="input mt-1"
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
                className="input mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            className="mt-4 text-sm text-brand-600 hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
