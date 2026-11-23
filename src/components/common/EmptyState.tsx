import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaLink?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaLink,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl py-16 px-6 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-[#FFF0EA] text-[#FF6B35] flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1.5">{title}</h3>
      <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">{description}</p>
      {ctaLabel && ctaLink && (
        <Link
          to={ctaLink}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onAction && !ctaLink && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load content',
  message = 'Something went wrong while fetching data. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="bg-white border border-[#E8E8E8] rounded-xl py-12 px-6 text-center max-w-lg mx-auto"
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#1A1A1A] mb-1.5">{title}</h3>
      <p className="text-sm text-[#6B7280] mb-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold text-[#1A1A1A] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
