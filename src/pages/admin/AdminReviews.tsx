import { useMemo, useState } from 'react';
import { Check, EyeOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../lib/commerce';
import { SkeletonTablePage } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/EmptyState';
import { StarRating } from '../../components/common/StarRating';

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'hidden'>('all');
  const [productFilter, setProductFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const { data: rawReviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: adminService.getReviews,
  });
  const reviews = Array.isArray(rawReviews) ? rawReviews : [];

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reviews) {
      map.set(r.product_id, r.product_title || r.product_id);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter === 'approved' && !r.is_approved) return false;
      if (statusFilter === 'hidden' && r.is_approved) return false;
      if (productFilter && r.product_id !== productFilter) return false;
      if (ratingFilter && r.rating !== Number(ratingFilter)) return false;
      return true;
    });
  }, [reviews, statusFilter, productFilter, ratingFilter]);

  function invalidateReviewQueries() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  }

  if (isLoading) return <SkeletonTablePage columns={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">Review Moderation</h1>

      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'hidden')}
          aria-label="Filter reviews by approval status"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="hidden">Hidden</option>
        </select>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label="Filter reviews by product"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm max-w-xs"
        >
          <option value="">All Products</option>
          {(productOptions ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          aria-label="Filter reviews by rating"
          className="h-10 px-3 rounded-lg border border-[#E8E8E8] bg-white text-sm"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} ★
            </option>
          ))}
        </select>

        {(statusFilter !== 'all' || productFilter || ratingFilter) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setProductFilter('');
              setRatingFilter('');
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
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Rating</th>
              <th className="py-3 px-4">Comment</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E8] text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center text-sm text-[#6B7280]">
                  No reviews match the selected filters.
                </td>
              </tr>
            ) : (
              (filtered ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-[#F8F8F8]/60">
                  <td className="py-3 px-4 font-medium text-[#1A1A1A] max-w-[200px] truncate">
                    {r.product_title || r.product_id}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280]">{r.user_name || 'Customer'}</td>
                  <td className="py-3 px-4">
                    <StarRating rating={r.rating} />
                  </td>
                  <td className="py-3 px-4 text-[#1A1A1A] max-w-xs truncate">{r.comment}</td>
                  <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${
                        r.is_approved
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}
                    >
                      {r.is_approved ? 'Approved' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminService.moderateReview(r.id, !r.is_approved);
                          invalidateReviewQueries();
                          toast.success(r.is_approved ? 'Review hidden' : 'Review approved');
                        }}
                        aria-label={r.is_approved ? 'Hide review' : 'Approve review'}
                        className="p-1.5 rounded-lg border border-[#E8E8E8] hover:border-[#FF6B35] cursor-pointer"
                      >
                        {r.is_approved ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminService.deleteReview(r.id);
                          invalidateReviewQueries();
                          toast.success('Review deleted');
                        }}
                        aria-label="Delete review"
                        className="p-1.5 rounded-lg border border-[#E8E8E8] text-[#EF4444] hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
