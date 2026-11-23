import { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { formatDate, formatPrice } from '../../lib/commerce';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/common/StatusBadge';

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: rawOrders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: adminService.getOrders,
  });
  const orders = Array.isArray(rawOrders) ? rawOrders : [];

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (paymentFilter && o.payment_method !== paymentFilter) return false;
      const orderDay = (o.created_at ?? '').slice(0, 10);
      if (fromDate && orderDay < fromDate) return false;
      if (toDate && orderDay > toDate) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchOrder = (o.order_number ?? '').toLowerCase().includes(q);
        const matchCust = (o.customer_name || o.shipping_address?.full_name || '')
          .toLowerCase()
          .includes(q);
        if (!matchOrder && !matchCust) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, fromDate, toDate, search]);

  if (isLoading) return <SkeletonTablePage columns={7} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Orders</h1>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer name..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#FF6B35]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter orders by status"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          aria-label="Filter orders by payment method"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Payment Methods</option>
          <option value="cod">COD</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">EasyPaisa</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="Filter orders from date"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="Filter orders to date"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        />
        {(search || statusFilter || paymentFilter || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPaymentFilter('');
              setFromDate('');
              setToDate('');
            }}
            className="h-10 px-3 rounded-lg border border-[#E8E8E8] text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Method</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  No orders match the selected filters.
                </td>
              </tr>
            ) : (
              (filtered ?? []).map((o) => (
                <tr key={o.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{o.order_number}</td>
                  <td className="py-3 px-4">{o.customer_name || o.shipping_address?.full_name || 'Customer'}</td>
                  <td className="py-3 px-4 text-[#6B7280]">{formatDate(o.created_at)}</td>
                  <td className="py-3 px-4 uppercase text-xs font-semibold">{o.payment_method}</td>
                  <td className="py-3 px-4">
                    <PaymentStatusBadge status={o.payment_status} />
                  </td>
                  <td className="py-3 px-4 font-bold tabular-nums">{formatPrice(o.total)}</td>
                  <td className="py-3 px-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-xs font-semibold hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
