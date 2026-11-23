import { useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminService } from '../../services/adminService';
import { formatPrice } from '../../lib/commerce';
import { SkeletonDashboard } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { SmartCatalogAdvisor } from '../../components/product/SmartCatalogAdvisor';

const PIE_COLORS = ['#FF6B35', '#3B82F6', '#0EA5E9', '#6366F1', '#22C55E', '#9CA3AF'];

export default function AdminReports() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reports', fromDate, toDate],
    queryFn: () => adminService.getReports(fromDate || undefined, toDate || undefined),
  });

  function exportCsv() {
    if (!data?.orders) return;
    const rows = [
      ['Order Number', 'Date', 'Customer', 'Method', 'Status', 'Total PKR'].join(','),
      ...data.orders.map((o) =>
        [
          o.order_number,
          o.created_at.slice(0, 10),
          `"${(o.customer_name || o.shipping_address.full_name).replace(/"/g, '""')}"`,
          o.payment_method,
          o.status,
          o.total,
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zyro-mall-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <SkeletonDashboard />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Sales Reports</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Start date"
            className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="End date"
            className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="h-10 px-4 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Gemini Thinking Mode Merchandising & Inventory Analysis */}
      <SmartCatalogAdvisor
        mode="admin_report"
        title="Inventory & Merchandising Reasoning"
        subtitle="Run deep thinking analysis over live catalog stock, order volume, and pricing thresholds."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-[#E8E8E8] rounded-xl p-5">
          <h2 className="font-display text-base font-semibold text-[#1A1A1A] mb-4">
            Revenue Over Time
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip formatter={(val) => [formatPrice(Number(val ?? 0)), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E8E8E8] rounded-xl p-5">
          <h2 className="font-display text-base font-semibold text-[#1A1A1A] mb-4">
            Orders by Status
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.statusBreakdown.map((entry, idx) => (
                    <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E8E8]">
          <h2 className="font-display text-base font-semibold text-[#1A1A1A]">
            Best-Selling Products
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8] text-sm">
              {data.bestSellers.map((row) => (
                <tr key={row.product_title}>
                  <td className="py-3 px-4 font-medium text-[#1A1A1A]">{row.product_title}</td>
                  <td className="py-3 px-4 tabular-nums">{row.units}</td>
                  <td className="py-3 px-4 text-right font-bold tabular-nums">
                    {formatPrice(row.revenue)}
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
