import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ForgotPasswordPage() {
  const { api } = useAuth();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.forgotPassword(email);
    } catch {
      // Always show success to avoid revealing if account exists
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="animate-rise w-full max-w-md rounded-3xl border border-white/10 bg-slatewave-900/75 p-8 shadow-glass backdrop-blur-xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-tide-300">Forgot Password</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
              If an account with that email exists, a password reset link has been sent. Please check your inbox.
            </div>
            <Link to="/login" className="inline-block text-sm text-tide-300 hover:underline">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field w-full"
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-slate-400">
              <Link to="/login" className="text-tide-300 hover:underline">
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
