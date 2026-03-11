import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export function ResetPasswordPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(
        'Password must be at least 8 characters and include uppercase, lowercase, digit, and special character (@$!%*?&#).',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="animate-rise w-full max-w-md rounded-3xl border border-white/10 bg-slatewave-900/75 p-8 shadow-glass backdrop-blur-xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-tide-300">Reset Password</h1>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
              Your password has been reset successfully.
            </div>
            <Link to="/login" className="inline-block text-sm text-tide-300 hover:underline">
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field w-full"
                placeholder="Min 8 chars, upper/lower/digit/special"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm text-slate-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field w-full"
                placeholder="Repeat your password"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
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
