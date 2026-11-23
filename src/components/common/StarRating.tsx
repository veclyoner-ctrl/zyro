import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StarRatingProps {
  rating: number;
  count?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}

export function StarRating({
  rating,
  count,
  interactive = false,
  onChange,
  size = 'sm',
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? rating;
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="inline-flex items-center gap-0.5"
        role={interactive ? 'radiogroup' : undefined}
        aria-label={`Rated ${rating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(displayValue);
          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange?.(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                className="p-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] rounded"
              >
                <Star
                  className={cn(
                    iconSize,
                    filled ? 'fill-[#FF6B35] text-[#FF6B35]' : 'fill-transparent text-[#D1D5DB]'
                  )}
                />
              </button>
            );
          }
          return (
            <Star
              key={star}
              className={cn(
                iconSize,
                filled ? 'fill-[#FF6B35] text-[#FF6B35]' : 'fill-transparent text-[#D1D5DB]'
              )}
            />
          );
        })}
      </div>
      {count !== undefined && (
        <span className="text-xs text-[#6B7280] tabular-nums">
          {rating > 0 ? rating.toFixed(1) : 'New'} · {count} {count === 1 ? 'review' : 'reviews'}
        </span>
      )}
    </div>
  );
}
