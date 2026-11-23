import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitCredentials(targetEmail: string, targetPassword: string) {
    setError('');
    setSubmitting(true);
    try {
      const user = await login(targetEmail, targetPassword);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      if (user.role === 'admin' && from === '/') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitCredentials(email, password);
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">Sign in to Zyro Mall</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Access your cart, wishlist, order tracking, and saved addresses.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-pw" className="text-xs font-medium text-[#6B7280]">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-[#FF6B35] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E8E8E8] space-y-2.5">
          <p className="text-xs font-medium text-[#6B7280]">Quick Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => submitCredentials('customer@zyromall.pk', 'Customer@123')}
              className="py-2 px-3 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] cursor-pointer"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => submitCredentials('admin@zyromall.pk', 'Admin@123')}
              className="py-2 px-3 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] cursor-pointer"
            >
              Demo Admin
            </button>
          </div>
        </div>

        <p className="text-xs text-[#6B7280] text-center mt-6">
          New to Zyro Mall?{' '}
          <Link to="/register" className="font-semibold text-[#FF6B35] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
