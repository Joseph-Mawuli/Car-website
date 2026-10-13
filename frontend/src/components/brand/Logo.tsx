import { useId } from 'react';
import { cn } from '@/lib/format';

/**
 * Vector rendition of the Goddel Motors emblem (speedometer arc, needle and car
 * silhouette) based on the supplied logo mockup at
 * `public/images/brand/goddel-logo-mockup.jpg`. When the official vector logo is
 * available, export it as `public/images/brand/goddel-logo.svg` and swap the
 * <svg> below for an <img> of that file, keeping the same aspect ratio.
 */
export function LogoEmblem({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 120 84"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <LogoEmblemPaths />
    </svg>
  );
}

/** Emblem with the arched "GODDEL MOTORS" wordmark, as in the official logo. */
export function LogoBadge({ className }: { className?: string }) {
  const arcId = useId();
  return (
    <svg viewBox="0 0 160 120" className={className} role="img" aria-label="Goddel Motors">
      <defs>
        <path id={arcId} d="M28 76 A52 52 0 0 1 132 76" />
      </defs>
      <text
        fill="currentColor"
        fontFamily="Sora, Manrope, sans-serif"
        fontWeight={700}
        fontSize="13.5"
        letterSpacing="2.2"
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          GODDEL MOTORS
        </textPath>
      </text>
      <g transform="translate(20 34)">
        <LogoEmblemPaths />
      </g>
    </svg>
  );
}

function LogoEmblemPaths() {
  return (
    <g fill="currentColor">
      {/* Speedometer arc, needle, then the car silhouette strokes */}
      <path d="M26 58 A34 34 0 0 1 94 58 L87 58 A27 27 0 0 0 33 58 Z" />
      <path d="M58.6 50 L60 20 L61.4 50 Z" className="text-fg" fill="currentColor" />
      <circle cx="60" cy="51" r="4.2" />
      <path d="M22 63 C36 56 50 53.5 63 55 C73 56.2 80 60.5 87 61.6 C96 62.8 104 63.4 107 66 L103.5 66.2 C97 64.8 90 64.6 82.5 64.4 C75 64 70 60.4 62 58.9 C49 56.8 36 58.6 22 63 Z" />
      <path d="M8 66.5 C25 63 43 63.6 60 67 C43 67.2 27 68.6 8 66.5 Z" />
      <ellipse cx="9.5" cy="70.5" rx="4" ry="1.8" />
      <path d="M74 73 C78 66.5 89 66 94 72.5 C89 69.6 80 69.6 74 73 Z" />
      <path d="M103 66.6 L108.5 66.4 L104.6 79 Z" />
    </g>
  );
}

export const BRAND_SLOGAN = 'Perfect ride, just for you';

/** Header lockup: emblem + stacked wordmark + slogan. */
export function Logo({ className, showSlogan = true }: { className?: string; showSlogan?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-brand-500', className)}>
      <LogoEmblem className="h-8 w-auto shrink-0 sm:h-9" />
      <span className="flex flex-col font-display leading-none">
        <span className="text-[15px] font-extrabold tracking-[0.14em] sm:text-base">GODDEL</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-[0.42em] text-brand-300 sm:text-[11px]">
          MOTORS
        </span>
        {showSlogan && (
          <span className="mt-1 whitespace-nowrap font-sans text-[9px] font-medium italic tracking-wide text-fg-soft/80 sm:text-[10px]">
            {BRAND_SLOGAN}
          </span>
        )}
      </span>
    </span>
  );
}
