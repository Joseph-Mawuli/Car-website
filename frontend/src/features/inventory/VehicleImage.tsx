import { useState } from 'react';
import { CarFront } from 'lucide-react';
import type { VehicleImage as VehicleImageRecord } from '@/types';
import { cn } from '@/lib/format';

interface Props {
  image?: VehicleImageRecord;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Prefer the largest variant (gallery / lightbox). */
  large?: boolean;
}

function buildSrcSet(image: VehicleImageRecord): string | undefined {
  const variants = image.variants;
  if (!variants) return undefined;
  const entries = [variants.thumb, variants.medium, variants.large]
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .map((v) => `${v.url} ${v.width}w`);
  return entries.length ? entries.join(', ') : undefined;
}

/**
 * Responsive, lazy-loaded vehicle photo. Callers wrap it in an aspect-ratio box
 * so space is reserved before the image arrives (no layout shift).
 */
export function VehicleImage({ image, alt, sizes, priority, className, large }: Props) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <div
        role="img"
        aria-label={failed ? `${alt} (photo unavailable)` : `${alt} (no photo yet)`}
        className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-3 text-muted', className)}
      >
        <CarFront className="h-10 w-10 opacity-60" aria-hidden />
        <span className="text-xs font-semibold">{failed ? 'Photo unavailable' : 'Photo coming soon'}</span>
      </div>
    );
  }

  const fallbackSrc = large
    ? (image.variants?.large?.url ?? image.url)
    : (image.variants?.medium?.url ?? image.url);

  return (
    <img
      src={fallbackSrc}
      srcSet={buildSrcSet(image)}
      sizes={sizes}
      alt={image.alt || alt}
      width={image.variants?.medium?.width ?? image.width ?? 1200}
      height={image.variants?.medium?.height ?? image.height ?? 900}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
