import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function extractSupabaseRecoveryToken(): string {
  if (typeof window === 'undefined' || !window.location.hash) return '';
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hashParams.get('access_token') || '';
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const accessToken = useMemo(() => extractSupabaseRecoveryToken(), []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasValidLink = Boolean(token || accessToken || isSupabaseConfigured);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: updErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updErr) throw new Error(updErr.message);
        setSuccessMessage('Your password has been updated. You can now sign in.');
      } else {
        const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            ...(token ? { token } : {}),
            ...(accessToken ? { accessToken } : {}),
            newPassword,
          }),
        });
        setSuccessMessage(res.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8">
        <div className="w-10 h-10 rounded-lg bg-[#FFF0EA] text-[#FF6B35] flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">Set New Password</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Choose a strong password of at least 8 characters for your Zyro Mall account.
        </p>

        {successMessage ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Password Updated
            </div>
            <p>{successMessage}</p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-xs font-semibold"
            >
              Sign In Now
            </Link>
          </div>
        ) : !hasValidLink ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-3">
            <p>This password reset link is missing or invalid.</p>
            <Link
              to="/forgot-password"
              className="inline-block text-xs font-semibold text-[#FF6B35] underline"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                New Password *
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Confirm New Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
