import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LoadingSpinner({
  className,
  label = 'Loading...',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 text-[#6B7280]', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-7 h-7 animate-spin text-[#FF6B35] mb-2" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
      <div className="aspect-[4/3] w-full skeleton-shimmer" />
      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="h-3 w-20 rounded skeleton-shimmer" />
        <div className="h-4 w-4/5 rounded skeleton-shimmer" />
        <div className="h-3 w-24 rounded skeleton-shimmer" />
        <div className="h-5 w-28 rounded skeleton-shimmer mt-2" />
        <div className="h-9 w-full rounded-lg skeleton-shimmer mt-3" />
      </div>
    </div>
  );
}

export function SkeletonTablePage({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="space-y-5" role="status" aria-label="Loading table">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-10 w-32 rounded-lg skeleton-shimmer" />
      </div>
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-wrap gap-3">
        <div className="h-10 flex-1 min-w-[200px] rounded-lg skeleton-shimmer" />
        <div className="h-10 w-36 rounded-lg skeleton-shimmer" />
        <div className="h-10 w-32 rounded-lg skeleton-shimmer" />
      </div>
      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
        <div className="h-11 bg-[#F8F8F8] border-b border-[#E8E8E8]" />
        <div className="divide-y divide-[#E8E8E8]">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="p-4 flex items-center gap-4">
              {Array.from({ length: columns }).map((__, cIdx) => (
                <div
                  key={cIdx}
                  className={cn(
                    'h-4 rounded skeleton-shimmer',
                    cIdx === 0 ? 'w-1/4' : 'flex-1'
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="h-44 w-full rounded-2xl skeleton-shimmer" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E8E8E8] rounded-xl p-5 space-y-3">
            <div className="h-3.5 w-24 rounded skeleton-shimmer" />
            <div className="h-8 w-32 rounded skeleton-shimmer" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
        <div className="h-5 w-48 rounded skeleton-shimmer mb-4" />
        <div className="h-64 w-full rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 space-y-8" role="status" aria-label="Loading details">
      <div className="h-4 w-56 rounded skeleton-shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-3">
          <div className="aspect-[4/3] w-full rounded-xl skeleton-shimmer" />
          <div className="flex gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-20 h-16 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-6 space-y-4">
          <div className="h-4 w-32 rounded skeleton-shimmer" />
          <div className="h-8 w-4/5 rounded skeleton-shimmer" />
          <div className="h-4 w-40 rounded skeleton-shimmer" />
          <div className="h-10 w-44 rounded skeleton-shimmer" />
          <div className="h-24 w-full rounded-lg skeleton-shimmer" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="h-12 rounded-lg skeleton-shimmer" />
            <div className="h-12 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCartPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8" role="status" aria-label="Loading cart">
      <div className="h-8 w-48 rounded skeleton-shimmer mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#E8E8E8]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 flex items-center gap-4">
              <div className="w-24 h-20 rounded-lg skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded skeleton-shimmer" />
                <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
              <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-4 bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
          <div className="h-6 w-36 rounded skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          <div className="h-24 w-full rounded-lg skeleton-shimmer" />
          <div className="h-12 w-full rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage({ cards = 4 }: { cards?: number }) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 space-y-6" role="status" aria-label="Loading page">
      <div className="h-8 w-56 rounded skeleton-shimmer" />
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E8E8E8] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded skeleton-shimmer" />
              <div className="h-5 w-24 rounded skeleton-shimmer" />
            </div>
            <div className="h-4 w-2/3 rounded skeleton-shimmer" />
            <div className="h-3 w-1/2 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
