import { AlertTriangle, Eye, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminService } from '../../services/adminService';
import { formatDate, formatPrice } from '../../lib/commerce';
import { SkeletonDashboard } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { OrderStatusBadge } from '../../components/common/StatusBadge';

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminService.getOverview,
  });

  if (isLoading) return <SkeletonDashboard />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const kpis = [
    {
      label: 'Total Revenue',
      value: formatPrice(data.stats.totalRevenue),
      sub: `Today ${formatPrice(data.stats.todaySales ?? 0)} · Month ${formatPrice(data.stats.monthSales ?? data.stats.totalRevenue)}`,
      icon: TrendingUp,
    },
    {
      label: 'Total Orders',
      value: String(data.stats.totalOrders),
      sub: `7-day sales: ${formatPrice(data.stats.weekSales ?? data.stats.totalRevenue)}`,
      icon: ShoppingBag,
    },
    {
      label: 'Customers',
      value: String(data.stats.totalCustomers),
      sub: 'Registered accounts',
      icon: Users,
    },
    {
      label: 'Pending Orders',
      value: String(data.stats.pendingOrders),
      sub: `Delivered: ${data.stats.ordersByStatus?.delivered ?? 0} · Shipped: ${data.stats.ordersByStatus?.shipped ?? 0}`,
      icon: Package,
    },
  ];

  const statusEntries = Object.entries(data.stats.ordersByStatus ?? {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Dashboard Overview</h1>
        <Link
          to="/admin/products/new"
          className="px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold whitespace-nowrap"
        >
          + Add Product
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white border border-[#E8E8E8] rounded-xl p-5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6B7280] mb-1">{kpi.label}</p>
                <p className="font-display text-2xl font-bold text-[#1A1A1A] tabular-nums">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-1 tabular-nums leading-snug">
                  {kpi.sub}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#FFF0EA] text-[#FF6B35] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {statusEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusEntries.map(([statusKey, count]) => (
            <Link
              key={statusKey}
              to="/admin/orders"
              className="bg-white border border-[#E8E8E8] hover:border-[#FF6B35] rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
            >
              <span className="text-xs font-medium text-[#6B7280] capitalize">{statusKey}</span>
              <span className="font-display text-sm font-bold text-[#1A1A1A] tabular-nums">
                {count}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Revenue Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-[#E8E8E8] rounded-xl p-5">
          <h2 className="font-display text-base font-semibold text-[#1A1A1A] mb-4">
            Revenue (Last 30 Days)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value ?? 0)), 'Revenue']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E8E8E8',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6B35"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </h2>
            <Link to="/admin/products" className="text-xs font-semibold text-[#FF6B35]">
              Manage
            </Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">All active products are well stocked.</p>
          ) : (
            <div className="divide-y divide-[#E8E8E8]">
              {data.lowStockProducts.map((p) => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      className="text-sm font-medium text-[#1A1A1A] hover:text-[#FF6B35] truncate block"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs font-mono text-[#6B7280]">{p.sku}</p>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded border ${
                      p.stock_quantity === 0
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}
                  >
                    {p.stock_quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Orders */}
      <section className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#1A1A1A]">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs font-semibold text-[#FF6B35]">
            View All Orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8] text-sm">
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{o.order_number}</td>
                  <td className="py-3 px-4 text-[#1A1A1A]">
                    {o.customer_name || o.shipping_address.full_name}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280]">{formatDate(o.created_at)}</td>
                  <td className="py-3 px-4 font-semibold tabular-nums">{formatPrice(o.total)}</td>
                  <td className="py-3 px-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A1A1A] hover:text-[#FF6B35]"
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
      </section>
    </div>
  );
}
