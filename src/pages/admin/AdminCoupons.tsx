import React, { useState } from 'react';
import { Edit, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { formatDate, formatPrice } from '../../lib/commerce';
import type { Coupon, CouponType } from '../../types';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('percentage');
  const [value, setValue] = useState('10');
  const [minOrder, setMinOrder] = useState('2000');
  const [maxUses, setMaxUses] = useState('100');
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [saving, setSaving] = useState(false);

  const { data: coupons = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: adminService.getCoupons,
  });

  function openCreateModal() {
    setEditingCoupon(null);
    setCode('');
    setType('percentage');
    setValue('10');
    setMinOrder('2000');
    setMaxUses('100');
    setExpiresAt('2027-12-31');
    setModalOpen(true);
  }

  function openEditModal(c: Coupon) {
    setEditingCoupon(c);
    setCode(c.code);
    setType(c.type);
    setValue(String(c.value));
    setMinOrder(String(c.min_order_amount));
    setMaxUses(c.max_uses !== null ? String(c.max_uses) : '');
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : '');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      min_order_amount: Number(minOrder) || 0,
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    setSaving(true);
    try {
      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        toast.success('Coupon updated');
      } else {
        await adminService.createCoupon(payload);
        toast.success('Coupon created');
      }
      setCode('');
      setEditingCoupon(null);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to save coupon');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <SkeletonTablePage columns={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Coupons</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Min Order</th>
              <th className="py-3 px-4">Usage</th>
              <th className="py-3 px-4">Expiry</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  No coupons created yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">{c.code}</td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.type === 'percentage' ? `${c.value}%` : formatPrice(c.value)}
                  </td>
                  <td className="py-3 px-4 tabular-nums">{formatPrice(c.min_order_amount)}</td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.used_count} / {c.max_uses ?? '∞'}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280]">
                    {c.expires_at ? formatDate(c.expires_at) : 'No expiry'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md border text-xs font-medium ${
                        c.is_active
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-gray-600 bg-gray-100 border-gray-200'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        aria-label={`Edit coupon ${c.code}`}
                        className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35] cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminService.toggleCoupon(c.id, !c.is_active);
                          queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
                          toast.success('Coupon status updated');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold hover:border-[#FF6B35] cursor-pointer"
                      >
                        {c.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                {editingCoupon ? `Edit Coupon (${editingCoupon.code})` : 'Create Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="EID20"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CouponType)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (PKR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Value *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">
                    Min Order (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Max Uses</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
