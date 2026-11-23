import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className, fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] text-[#6B7280] select-none p-4 text-center',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <Package className="w-7 h-7 mb-1.5 text-[#9CA3AF]" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#6B7280] line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
