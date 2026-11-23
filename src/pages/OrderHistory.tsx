import { Eye, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserOrders } from '../services/orderService';
import { formatDate, formatPrice } from '../lib/commerce';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/common/StatusBadge';
import { SkeletonTablePage } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/EmptyState';

export default function OrderHistory() {
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: getUserOrders,
  });

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        <SkeletonTablePage columns={6} />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
        Order History
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No orders yet"
          description="Once you place an order, you can track shipping progress and download receipts here."
          ctaLabel="Start Shopping"
          ctaLink="/products"
        />
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F8F8F8] text-xs font-semibold text-[#6B7280]">
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8] text-sm">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1A1A1A]">
                    {order.order_number}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B7280] whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-[#1A1A1A] tabular-nums">
                    {(order.items ?? []).reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#1A1A1A] tabular-nums whitespace-nowrap">
                    {formatPrice(order.total)}
                  </td>
                  <td className="py-3.5 px-4">
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold text-[#1A1A1A] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
