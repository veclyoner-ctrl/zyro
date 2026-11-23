import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import type { DataQualitySeverity } from '../../lib/commerce';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { cn } from '../../lib/utils';

const ISSUES_PER_PAGE = 25;

export default function AdminDataQuality() {
  const [severityFilter, setSeverityFilter] = useState<'all' | DataQualitySeverity>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'data-quality'],
    queryFn: adminService.getDataQuality,
  });

  const issues = Array.isArray(data?.issues) ? data.issues : [];

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !issue.productTitle.toLowerCase().includes(q) &&
          !issue.sku.toLowerCase().includes(q) &&
          !issue.label.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [issues, severityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / ISSUES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedIssues = filteredIssues.slice(
    (safePage - 1) * ISSUES_PER_PAGE,
    safePage * ISSUES_PER_PAGE
  );

  if (isLoading) return <SkeletonTablePage columns={6} />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const { summary, storeReadiness } = data;
  const healthPct =
    summary.totalProducts > 0
      ? Math.round((summary.healthyProducts / summary.totalProducts) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Data Quality Audit</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Live verification of images, SKUs, categories, partner businesses, stock levels, and discount pricing across {summary.totalProducts} products.
          </p>
        </div>
        <Link
          to="/admin/products"
          className="px-4 py-2 rounded-lg border border-[#E8E8E8] bg-white hover:border-[#FF6B35] text-sm font-semibold text-[#1A1A1A]"
        >
          Manage Catalog
        </Link>
      </div>

      {/* KPI Row (4 max per rule) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B7280] mb-1">
            <span>Catalog Health Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-[#1A1A1A] tabular-nums">{healthPct}%</p>
          <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
            {summary.healthyProducts} of {summary.totalProducts} products healthy
          </p>
        </div>

        <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B7280] mb-1">
            <span>Critical &amp; Warning Alerts</span>
            <ShieldAlert className="w-4 h-4 text-[#FF6B35]" />
          </div>
          <p className="font-display text-2xl font-bold text-[#1A1A1A] tabular-nums">
            {summary.criticalCount + summary.warningCount}
          </p>
          <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
            {summary.criticalCount} critical · {summary.warningCount} warnings
          </p>
        </div>

        <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B7280] mb-1">
            <span>Discounted Catalog</span>
            <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" />
          </div>
          <p className="font-display text-2xl font-bold text-[#1A1A1A] tabular-nums">
            {summary.discountedProducts}
          </p>
          <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
            Items showing strikethrough savings
          </p>
        </div>

        <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B7280] mb-1">
            <span>Business Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-[#1A1A1A] tabular-nums">
            {summary.businessLinkedProducts}
          </p>
          <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
            Across {summary.activeBusinesses} active businesses · {summary.activeCategories} categories
          </p>
        </div>
      </div>

      {/* Storefront Readiness Strip */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
        <h2 className="font-display text-sm font-bold text-[#1A1A1A] mb-3">
          Storefront &amp; Portal Readiness
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
            <span className="font-medium text-[#1A1A1A]">WhatsApp Booking Number</span>
            <span
              className={cn(
                'font-semibold',
                storeReadiness.hasWhatsappNumber ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {storeReadiness.hasWhatsappNumber ? 'Configured' : 'Missing'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
            <span className="font-medium text-[#1A1A1A]">Admin Welcome Poster</span>
            <span
              className={cn(
                'font-semibold',
                storeReadiness.hasAdminPoster ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              {storeReadiness.hasAdminPoster ? 'Active' : 'Missing'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8]">
            <span className="font-medium text-[#1A1A1A]">Storefront Hero &amp; Promo Banners</span>
            <span className="font-semibold text-emerald-600 tabular-nums">
              {storeReadiness.activeBannersCount} active
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: `All (${issues.length})` },
              { key: 'critical', label: `Critical (${summary.criticalCount})` },
              { key: 'warning', label: `Warnings (${summary.warningCount})` },
              { key: 'info', label: `Info (${summary.infoCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSeverityFilter(tab.key);
                setPage(1);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                severityFilter === tab.key
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-[#F8F8F8] text-[#6B7280] hover:text-[#1A1A1A]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Filter issues by SKU or title..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E8E8E8] text-xs focus:outline-none focus:border-[#FF6B35]"
          />
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F8F8] border-b border-[#E8E8E8] text-xs font-semibold text-[#6B7280]">
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Issue</th>
              <th className="py-3 px-4">Recommended Fix</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {paginatedIssues.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  No data quality issues match your current filter.
                </td>
              </tr>
            ) : (
              (paginatedIssues ?? []).map((issue) => (
                <tr key={issue.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize',
                        issue.severity === 'critical'
                          ? 'bg-red-50 text-[#EF4444]'
                          : issue.severity === 'warning'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {issue.severity === 'critical' ? (
                        <ShieldAlert className="w-3 h-3" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Info className="w-3 h-3" />
                      )}
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1A1A1A]">{issue.productTitle}</td>
                  <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">{issue.sku}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-[#1A1A1A]">{issue.label}</td>
                  <td className="py-3 px-4 text-xs text-[#6B7280]">{issue.suggestion}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/products/${issue.productId}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] text-xs font-semibold text-[#1A1A1A] whitespace-nowrap"
                    >
                      Fix Product
                      <ExternalLink className="w-3 h-3 text-[#FF6B35]" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
