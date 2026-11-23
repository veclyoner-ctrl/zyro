import React, { useState } from 'react';
import { Edit3, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { createAddress, deleteAddress, getAddresses, updateAddress } from '../services/orderService';
import { getUserReviews, updateReview } from '../services/reviewService';
import { formatDate } from '../lib/commerce';
import { cn } from '../lib/utils';
import type { Address, Review } from '../types';
import { StarRating } from '../components/common/StarRating';

type ProfileTab = 'info' | 'password' | 'addresses' | 'reviews';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ProfileTab>('info');

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewComment, setEditReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const { data: addressesRaw = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: getAddresses,
  });
  const addresses = Array.isArray(addressesRaw) ? addressesRaw : [];

  const { data: reviewsRaw = [] } = useQuery({
    queryKey: ['user-reviews', user?.id],
    queryFn: () => getUserReviews(user!.id),
    enabled: Boolean(user?.id),
  });
  const reviews = Array.isArray(reviewsRaw) ? reviewsRaw : [];

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      if (isSupabaseConfigured) {
        if (!user?.email) throw new Error('Authentication required');
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (signInErr) throw new Error('Current password is incorrect.');
        const { error: updErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updErr) throw new Error(updErr.message);
      } else {
        await apiRequest('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      }
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update password');
    } finally {
      setSavingPw(false);
    }
  }

  function openNewAddressForm() {
    setEditingAddrId(null);
    setAddrName(user?.full_name || fullName);
    setAddrPhone(user?.phone || phone);
    setAddrLine('');
    setAddrCity('');
    setAddrArea('');
    setAddrPostal('');
    setShowAddrForm(true);
  }

  function openEditAddressForm(addr: Address) {
    setEditingAddrId(addr.id);
    setAddrName(addr.full_name || user?.full_name || fullName);
    setAddrPhone(addr.phone || user?.phone || phone);
    setAddrLine(addr.address_line1);
    setAddrCity(addr.city);
    setAddrArea(addr.area || '');
    setAddrPostal(addr.postal_code || '');
    setShowAddrForm(true);
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddr(true);
    try {
      if (editingAddrId) {
        await updateAddress(editingAddrId, {
          full_name: addrName.trim() || user?.full_name || fullName,
          phone: addrPhone.trim() || user?.phone || phone,
          address_line1: addrLine.trim(),
          city: addrCity.trim(),
          area: addrArea.trim(),
          postal_code: addrPostal.trim(),
        });
        toast.success('Address updated');
      } else {
        await createAddress({
          full_name: addrName.trim() || user?.full_name || fullName,
          phone: addrPhone.trim() || user?.phone || phone,
          address_line1: addrLine.trim(),
          city: addrCity.trim(),
          area: addrArea.trim(),
          postal_code: addrPostal.trim(),
          is_default: addresses.length === 0,
        });
        toast.success('Address saved');
      }
      setEditingAddrId(null);
      setAddrName('');
      setAddrPhone('');
      setAddrLine('');
      setAddrCity('');
      setAddrArea('');
      setAddrPostal('');
      setShowAddrForm(false);
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save address');
    } finally {
      setSavingAddr(false);
    }
  }

  function startEditReview(rev: Review) {
    setEditingReviewId(rev.id);
    setEditReviewRating(rev.rating);
    setEditReviewComment(rev.comment);
  }

  async function handleSaveReview(e: React.FormEvent, rev: Review) {
    e.preventDefault();
    if (!editReviewComment.trim()) {
      toast.error('Review comment cannot be empty.');
      return;
    }
    setSavingReview(true);
    try {
      await updateReview(rev.id, {
        rating: editReviewRating,
        comment: editReviewComment.trim(),
      });
      toast.success('Review updated');
      setEditingReviewId(null);
      queryClient.invalidateQueries({ queryKey: ['user-reviews', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['reviews', rev.product_id] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', rev.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update review');
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
        Account &amp; Profile
      </h1>

      <div className="flex flex-wrap gap-2 border-b border-[#E8E8E8] mb-6" role="tablist">
        {(
          [
            ['info', 'Personal Info'],
            ['password', 'Change Password'],
            ['addresses', 'Saved Addresses'],
            ['reviews', 'My Reviews'],
          ] as Array<[ProfileTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px cursor-pointer whitespace-nowrap',
              tab === key
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-[#6B7280] hover:text-[#1A1A1A]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <form
          onSubmit={handleSaveInfo}
          className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4 max-w-xl"
        >
          <div>
            <label htmlFor="prof-email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Email Address
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] bg-[#F8F8F8] text-sm text-[#6B7280]"
            />
          </div>
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Phone Number
            </label>
            <input
              id="prof-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'password' && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4 max-w-xl"
        >
          <div>
            <label htmlFor="cur-pw" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Current Password
            </label>
            <input
              id="cur-pw"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              New Password (min 8 chars)
            </label>
            <input
              id="new-pw"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label htmlFor="conf-pw" className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Confirm New Password
            </label>
            <input
              id="conf-pw"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
            />
          </div>
          <button
            type="submit"
            disabled={savingPw}
            className="px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}

      {tab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (showAddrForm && !editingAddrId) setShowAddrForm(false);
                else openNewAddressForm();
              }}
              className="px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>
          </div>

          {showAddrForm && (
            <form
              onSubmit={handleSaveAddress}
              className="bg-white border border-[#E8E8E8] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="sm:col-span-2 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#1A1A1A]">
                  {editingAddrId ? 'Edit Saved Address' : 'Add New Address'}
                </h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Recipient Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Area</label>
                <input
                  type="text"
                  value={addrArea}
                  onChange={(e) => setAddrArea(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddrForm(false);
                    setEditingAddrId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingAddr && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingAddr ? 'Saving...' : editingAddrId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(addresses ?? []).map((addr) => (
              <div
                key={addr.id}
                className="bg-white border border-[#E8E8E8] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A1A1A]">
                      <MapPin className="w-4 h-4 text-[#FF6B35]" />
                      {addr.city}
                    </span>
                    {addr.is_default && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#6B7280] mb-0.5">{addr.full_name}</p>
                  <p className="text-sm text-[#1A1A1A]">{addr.address_line1}</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {addr.area} {addr.postal_code} · {addr.phone}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E8E8E8]">
                  {!addr.is_default ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await updateAddress(addr.id, { is_default: true });
                        queryClient.invalidateQueries({ queryKey: ['addresses'] });
                        toast.success('Default address updated');
                      }}
                      className="text-xs font-semibold text-[#FF6B35] hover:underline cursor-pointer"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditAddressForm(addr)}
                      aria-label={`Edit address ${addr.address_line1}`}
                      className="text-xs text-[#6B7280] hover:text-[#FF6B35] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAddress(addr.id);
                        queryClient.invalidateQueries({ queryKey: ['addresses'] });
                        toast.success('Address deleted');
                      }}
                      aria-label={`Delete address ${addr.address_line1}`}
                      className="text-xs text-[#6B7280] hover:text-[#EF4444] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
          {reviews.length === 0 ? (
            <p className="p-6 text-sm text-[#6B7280]">You have not written any reviews yet.</p>
          ) : (
            (reviews ?? []).map((rev) => (
              <div key={rev.id} className="p-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {rev.product_title || 'Product'}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#9CA3AF]">{formatDate(rev.created_at)}</span>
                    {editingReviewId !== rev.id && (
                      <button
                        type="button"
                        onClick={() => startEditReview(rev)}
                        aria-label={`Edit review for ${rev.product_title || 'product'}`}
                        className="text-xs font-semibold text-[#FF6B35] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editingReviewId === rev.id ? (
                  <form onSubmit={(e) => handleSaveReview(e, rev)} className="mt-3 space-y-3">
                    <div>
                      <span className="block text-xs text-[#6B7280] mb-1">Rating</span>
                      <StarRating
                        rating={editReviewRating}
                        interactive
                        size="md"
                        onChange={setEditReviewRating}
                      />
                    </div>
                    <textarea
                      rows={3}
                      value={editReviewComment}
                      onChange={(e) => setEditReviewComment(e.target.value)}
                      className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingReview}
                        className="px-4 py-1.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {savingReview ? 'Saving...' : 'Save Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReviewId(null)}
                        className="px-4 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <StarRating rating={rev.rating} />
                    <p className="text-sm text-[#1A1A1A] mt-2">{rev.comment}</p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
