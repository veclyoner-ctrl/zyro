import { CheckCircle2, Package, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrderById } from '../services/orderService';
import { formatPrice } from '../lib/commerce';
import { SkeletonPage } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/EmptyState';

export default function OrderConfirmation() {
  const { orderId = '' } = useParams();
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: Boolean(orderId),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <SkeletonPage cards={2} />
      </div>
    );
  }
  if (isError || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <ErrorState title="Order not found" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
          Thank you, {order.shipping_address.full_name.split(' ')[0]}!
        </h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Your order <span className="font-mono font-semibold text-[#1A1A1A]">{order.order_number}</span>{' '}
          is confirmed. Estimated delivery: <strong>3–5 business days</strong>.
        </p>

        <div className="text-left bg-[#F8F8F8] border border-[#E8E8E8] rounded-xl p-4 mb-6 space-y-3">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span className="text-[#1A1A1A]">
                {item.product_title} <span className="text-[#6B7280]">× {item.quantity}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(item.total_price)}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-[#E8E8E8] flex justify-between font-bold text-[#1A1A1A]">
            <span>Total Paid / Payable ({order.payment_method.toUpperCase()})</span>
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/orders/${order.id}`}
            className="px-6 py-3 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Track Order
          </Link>
          <Link
            to="/products"
            className="px-6 py-3 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold text-[#1A1A1A] inline-flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
