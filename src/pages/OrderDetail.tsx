import { useState } from 'react';
import { ChevronRight, Loader2, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, getOrderById, requestReturn } from '../services/orderService';
import { canCancelOrder, canRequestReturn, formatDate, formatPrice } from '../lib/commerce';
import { cn } from '../lib/utils';
import type { OrderStatus } from '../types';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/common/StatusBadge';
import { SkeletonPage } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/Pagination';
import { SafeImage } from '../components/common/SafeImage';

const TIMELINE_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

export default function OrderDetail() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: Boolean(orderId),
  });

  if (isLoading) return <SkeletonPage cards={3} />;
  if (isError || !order) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <ErrorState title="Order not found" onRetry={() => refetch()} />
      </div>
    );
  }

  const currentIdx = TIMELINE_STEPS.indexOf(order.status);

  async function handleConfirmCancel() {
    if (!order) return;
    setSubmitting(true);
    try {
      await cancelOrder(order.id, 'Cancelled by customer');
      toast.success('Order cancelled and stock restored.');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancelModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to cancel order.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReturn() {
    if (!order) return;
    const trimmedReason = returnReason.trim();
    if (!trimmedReason) {
      toast.error('Please enter a reason for your return request.');
      return;
    }
    setSubmitting(true);
    try {
      await requestReturn(order.id, trimmedReason);
      toast.success('Return request submitted.');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setReturnModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit return request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-5" aria-label="Breadcrumb">
        <Link to="/orders" className="hover:text-[#FF6B35]">
          My Orders
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-mono text-[#1A1A1A] font-medium">{order.order_number}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1A1A] flex items-center gap-3">
            <span className="font-mono">{order.order_number}</span>
            <OrderStatusBadge status={order.status} />
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">Placed on {formatDate(order.created_at)}</p>
        </div>

        <div className="flex items-center gap-3">
          {canCancelOrder(order.status) && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Cancel Order
            </button>
          )}
          {canRequestReturn(order.status, order.created_at) && !order.return_requested && (
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="px-4 py-2 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Request Return
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      {order.status !== 'cancelled' && (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 mb-6">
          <h2 className="font-display text-sm font-semibold text-[#1A1A1A] mb-4">
            Order Timeline
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TIMELINE_STEPS.map((stepStatus, i) => {
              const reached = currentIdx >= i;
              return (
                <div
                  key={stepStatus}
                  className={cn(
                    'p-3 rounded-lg border text-xs font-semibold capitalize',
                    reached
                      ? 'border-[#FF6B35] bg-[#FFF0EA] text-[#FF6B35]'
                      : 'border-[#E8E8E8] bg-[#F8F8F8] text-[#9CA3AF]'
                  )}
                >
                  {stepStatus}
                </div>
              );
            })}
          </div>
          {order.tracking_number && (
            <p className="text-xs text-[#6B7280] mt-4">
              Courier Tracking Number:{' '}
              <span className="font-mono font-semibold text-[#1A1A1A]">
                {order.tracking_number}
              </span>
            </p>
          )}
          {order.return_requested && (
            <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Return request submitted: {order.return_reason}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Items */}
        <div className="lg:col-span-8 bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="p-4 flex items-center gap-4">
              <SafeImage
                src={item.product_image}
                alt={item.product_title}
                className="w-16 h-14 rounded-lg border border-[#E8E8E8] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{item.product_title}</p>
                <p className="text-xs text-[#6B7280]">
                  Qty: {item.quantity} · {formatPrice(item.unit_price)} each
                  {item.variant_info ? ` · ${item.variant_info}` : ''}
                </p>
              </div>
              <span className="font-display text-sm font-bold text-[#1A1A1A] tabular-nums">
                {formatPrice(item.total_price)}
              </span>
            </div>
          ))}
        </div>

        {/* Address & Totals */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 text-sm">
            <h3 className="font-display font-semibold text-[#1A1A1A] mb-2">Delivery Address</h3>
            <p className="font-medium text-[#1A1A1A]">{order.shipping_address.full_name}</p>
            <p className="text-[#6B7280]">{order.shipping_address.phone}</p>
            <p className="text-[#6B7280] mt-1">
              {order.shipping_address.address_line1}, {order.shipping_address.area}{' '}
              {order.shipping_address.city} {order.shipping_address.postal_code}
            </p>
          </div>

          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 text-sm space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-[#1A1A1A]">Payment</h3>
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Method</span>
              <span className="uppercase font-medium text-[#1A1A1A]">{order.payment_method}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Shipping</span>
              <span className="tabular-nums">
                {order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span className="tabular-nums">-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[#E8E8E8] font-bold text-[#1A1A1A]">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={cancelModalOpen}
        title="Cancel this order?"
        description="Because this order is still pending, you can cancel it now and items will be restocked."
        confirmLabel="Yes, Cancel Order"
        destructive
        isLoading={submitting}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelModalOpen(false)}
      />

      {returnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md p-6">
            <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-2">
              Request Return / Refund
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Tell us why you would like to return items from order {order.order_number}.
            </p>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g., Size mismatch or damaged packaging..."
              className="w-full p-3 rounded-lg border border-[#E8E8E8] text-sm mb-4 focus:outline-none focus:border-[#FF6B35]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E8E8E8] text-sm font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReturn}
                className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
