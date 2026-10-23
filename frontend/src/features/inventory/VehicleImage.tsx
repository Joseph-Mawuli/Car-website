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

/** Phones never need more than the medium size: high-density iPhone screens would otherwise pick the largest file every time. */
const LARGE_MEDIA = '(min-width: 1024px)';

function buildSrcSet(image: VehicleImageRecord, includeLarge: boolean): string | undefined {
  const variants = image.variants;
  if (!variants) return undefined;
  const entries = [variants.thumb, variants.medium, includeLarge ? variants.large : undefined]
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

  const fallbackSrc = image.variants?.medium?.url ?? image.url;
  const srcSet = buildSrcSet(image, false);
  const largeSrcSet = large && image.variants?.large ? buildSrcSet(image, true) : undefined;

  const img = (
    <img
      src={fallbackSrc}
      srcSet={srcSet}
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
  if (!largeSrcSet) return img;
  return (
    <picture className="contents">
      <source media={LARGE_MEDIA} srcSet={largeSrcSet} sizes={sizes} />
      {img}
    </picture>
  );
}
