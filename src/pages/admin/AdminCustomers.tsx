import { useEffect, useState } from 'react';
import { Ban, CheckCircle, Eye, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminCustomer } from '../../services/adminService';
import { formatDate, formatPrice } from '../../lib/commerce';
import { SkeletonPage, SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/Pagination';
import { OrderStatusBadge } from '../../components/common/StatusBadge';

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<AdminCustomer | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: adminService.getCustomers,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin', 'customer', selectedCustomerId],
    queryFn: () => adminService.getCustomerDetail(selectedCustomerId!),
    enabled: Boolean(selectedCustomerId),
  });

  useEffect(() => {
    if (!selectedCustomerId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCustomerId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCustomerId]);

  async function handleToggleBlock() {
    if (!target) return;
    setUpdating(true);
    try {
      await adminService.toggleCustomerBlock(target.id, !target.is_blocked);
      toast.success(target.is_blocked ? 'Customer unblocked' : 'Customer blocked');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      if (selectedCustomerId === target.id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'customer', target.id] });
      }
      setTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update customer');
    } finally {
      setUpdating(false);
    }
  }

  if (isLoading) return <SkeletonTablePage columns={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Customers</h1>

      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Orders</th>
              <th className="py-3 px-4">Total Spent</th>
              <th className="py-3 px-4">Joined</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  No customer accounts registered yet.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#1A1A1A]">{c.full_name}</p>
                    <p className="text-xs text-[#6B7280]">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-[#6B7280]">{c.phone}</td>
                  <td className="py-3 px-4 tabular-nums">{c.orders_count}</td>
                  <td className="py-3 px-4 font-semibold tabular-nums">
                    {formatPrice(c.total_spent)}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280]">{formatDate(c.created_at)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md border text-xs font-medium ${
                        c.is_blocked
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {c.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold hover:border-[#FF6B35] hover:text-[#FF6B35] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setTarget(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold hover:border-[#FF6B35] cursor-pointer"
                      >
                        {c.is_blocked ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5 text-red-600" /> Block
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Profile & Order History Modal */}
      {selectedCustomerId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer profile details"
          onClick={() => setSelectedCustomerId(null)}
        >
          <div
            className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 shadow-xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E8E8] pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#1A1A1A]">
                  {detail?.customer.full_name || 'Customer Profile'}
                </h2>
                {detail && (
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {detail.customer.email} · {detail.customer.phone} · Joined{' '}
                    {formatDate(detail.customer.created_at)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                aria-label="Close customer profile"
                className="p-1.5 rounded-md text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail || !detail ? (
              <SkeletonPage cards={2} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
                    <p className="text-xs text-[#6B7280]">Total Orders</p>
                    <p className="font-display text-lg font-bold text-[#1A1A1A] tabular-nums">
                      {detail.customer.orders_count}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
                    <p className="text-xs text-[#6B7280]">Total Spent</p>
                    <p className="font-display text-lg font-bold text-[#1A1A1A] tabular-nums">
                      {formatPrice(detail.customer.total_spent)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
                    <p className="text-xs text-[#6B7280]">Saved Addresses</p>
                    <p className="font-display text-lg font-bold text-[#1A1A1A] tabular-nums">
                      {detail.addresses.length}
                    </p>
                  </div>
                </div>

                {detail.addresses.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-2">
                      Saved Addresses
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {detail.addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-3 rounded-lg border border-[#E8E8E8] text-xs space-y-1"
                        >
                          <p className="font-semibold text-[#1A1A1A] inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
                            {addr.city}
                            {addr.is_default ? ' (Default)' : ''}
                          </p>
                          <p className="text-[#1A1A1A]">{addr.address_line1}</p>
                          <p className="text-[#6B7280]">
                            {addr.area} {addr.postal_code} · {addr.phone}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-display text-sm font-semibold text-[#1A1A1A] mb-2">
                    Order History
                  </h3>
                  {detail.orders.length === 0 ? (
                    <p className="text-xs text-[#6B7280] py-3">No orders placed yet.</p>
                  ) : (
                    <div className="border border-[#E8E8E8] rounded-lg overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-[#6B7280]">
                            <th className="py-2.5 px-3">Order #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Total</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {detail.orders.map((o) => (
                            <tr key={o.id}>
                              <td className="py-2.5 px-3 font-mono font-semibold">{o.order_number}</td>
                              <td className="py-2.5 px-3 text-[#6B7280]">{formatDate(o.created_at)}</td>
                              <td className="py-2.5 px-3 font-semibold tabular-nums">
                                {formatPrice(o.total)}
                              </td>
                              <td className="py-2.5 px-3">
                                <OrderStatusBadge status={o.status} />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Link
                                  to={`/admin/orders/${o.id}`}
                                  onClick={() => setSelectedCustomerId(null)}
                                  className="text-[#FF6B35] font-semibold hover:underline"
                                >
                                  View Order
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(target)}
        title={target?.is_blocked ? `Unblock ${target.full_name}?` : `Block ${target?.full_name}?`}
        description={
          target?.is_blocked
            ? 'This customer will regain access to login and checkout.'
            : 'Blocked customers cannot sign in or place orders.'
        }
        confirmLabel={target?.is_blocked ? 'Unblock' : 'Block Customer'}
        destructive={!target?.is_blocked}
        isLoading={updating}
        onConfirm={handleToggleBlock}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
