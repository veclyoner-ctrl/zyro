import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAppUrl } from '../lib/utils';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: `${getAppUrl()}/reset-password` }
        );
        if (resetErr) throw new Error(resetErr.message);
        setSentMessage(
          'If an account exists for that email, a password reset link has been sent to your inbox.'
        );
        setResetUrl('');
      } else {
        const res = await apiRequest<{ message: string; resetUrl?: string }>(
          '/api/auth/forgot-password',
          {
            method: 'POST',
            body: JSON.stringify({ email }),
          }
        );
        setSentMessage(res.message);
        setResetUrl(res.resetUrl || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">Reset Password</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Enter your registered email and we will send password reset instructions.
        </p>

        {sentMessage ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Check your email
            </div>
            <p>{sentMessage}</p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {resetUrl && (
                <Link
                  to={resetUrl}
                  className="inline-block px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-xs font-semibold"
                >
                  Open Password Reset Page
                </Link>
              )}
              <Link
                to="/login"
                className="inline-block text-xs font-semibold text-[#FF6B35] underline"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="reset-email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
