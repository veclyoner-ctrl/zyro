import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrderById } from '../../services/orderService';
import { adminService } from '../../services/adminService';
import { formatDate, formatPrice } from '../../lib/commerce';
import type { OrderStatus, PaymentStatus } from '../../types';
import { SkeletonPage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/common/StatusBadge';
import { SafeImage } from '../../components/common/SafeImage';

export default function AdminOrderDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => getOrderById(id),
    enabled: Boolean(id),
  });

  const [status, setStatus] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.payment_status);
      setTrackingNumber(order.tracking_number || '');
      setAdminNotes(order.admin_notes || '');
      setCancelReason(order.cancel_reason || '');
    }
  }, [order]);

  if (isLoading) return <SkeletonPage cards={3} />;
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  async function handleSave() {
    setSaving(true);
    try {
      await adminService.updateOrder(order!.id, {
        status,
        payment_status: paymentStatus,
        tracking_number: trackingNumber.trim() || null,
        admin_notes: adminNotes.trim() || null,
        cancel_reason: status === 'cancelled' ? cancelReason.trim() || 'Cancelled by admin' : order!.cancel_reason,
      });
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      if (status === 'cancelled') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="p-2 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8]"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1A1A1A] flex items-center gap-3">
              <span className="font-mono">{order.order_number}</span>
              <OrderStatusBadge status={order.status} />
            </h1>
            <p className="text-xs text-[#6B7280]">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
        <PaymentStatusBadge status={order.payment_status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
            {(Array.isArray(order.items) ? order.items : []).map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                <SafeImage
                  src={item.product_image}
                  alt={item.product_title}
                  className="w-16 h-14 rounded-lg border border-[#E8E8E8] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{item.product_title}</p>
                  <p className="text-xs text-[#6B7280]">
                    Qty: {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
                <span className="font-bold text-sm tabular-nums">
                  {formatPrice(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 text-sm space-y-2">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-2">Customer &amp; Shipping</h2>
            <p className="font-semibold">{order.shipping_address.full_name}</p>
            <p className="text-[#6B7280]">
              {order.shipping_address.phone}
              {order.customer_email ? ` · ${order.customer_email}` : ''}
            </p>
            <p className="text-[#6B7280]">
              {order.shipping_address.address_line1}, {order.shipping_address.area}{' '}
              {order.shipping_address.city} {order.shipping_address.postal_code}
            </p>
            {order.payment_proof_url && (
              <div className="pt-3 border-t border-[#E8E8E8] mt-3">
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">
                  Uploaded Payment Proof ({order.payment_method.toUpperCase()})
                </p>
                <img
                  src={order.payment_proof_url}
                  alt="Customer payment proof"
                  className="max-h-48 rounded-lg border border-[#E8E8E8]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E8E8E8] rounded-xl p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-[#1A1A1A]">Fulfillment Controls</h2>

          <div>
            <label htmlFor="ord-status" className="block text-xs font-medium text-[#6B7280] mb-1">
              Order Status
            </label>
            <select
              id="ord-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="pay-status" className="block text-xs font-medium text-[#6B7280] mb-1">
              Payment Status
            </label>
            <select
              id="pay-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="ord-track" className="block text-xs font-medium text-[#6B7280] mb-1">
              Courier Tracking Number
            </label>
            <input
              id="ord-track"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TCS-98234122"
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm font-mono"
            />
          </div>

          {(status === 'cancelled' || order.cancel_reason) && (
            <div>
              <label htmlFor="ord-cancel-reason" className="block text-xs font-medium text-[#6B7280] mb-1">
                Cancellation Reason
              </label>
              <input
                id="ord-cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for order cancellation..."
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="ord-notes" className="block text-xs font-medium text-[#6B7280] mb-1">
              Internal Admin Notes
            </label>
            <textarea
              id="ord-notes"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {order.payment_status === 'pending' && (
              <button
                type="button"
                onClick={() => setPaymentStatus('confirmed')}
                className="w-full py-2 px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Payment Confirmed
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="w-full h-11 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
