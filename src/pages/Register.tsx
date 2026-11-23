import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      await register({ full_name: fullName, email, phone, password });
      toast.success('Welcome to Zyro Mall! Your account is ready.');
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">
          Create an Account
        </h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Shop across Pakistan with fast checkout and live order tracking.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Bilal Ahmed"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Phone Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="reg-pw" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Password (minimum 8 characters)
            </label>
            <input
              id="reg-pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-[#6B7280] text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#FF6B35] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
