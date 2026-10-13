import { useId } from 'react';
import { cn } from '@/lib/format';
import { useSettings } from '@/providers/SettingsProvider';

/** Shown under the logo when no motto is set in Admin › Settings. */
export const DEFAULT_MOTTO = 'Trust In Every Drive';

/**
 * Vector rendition of the Goddel Motors emblem (speedometer arc, needle and car
 * silhouette) based on the supplied logo mockup at
 * `public/images/brand/goddel-logo-mockup.jpg`. Used until a logo is uploaded in
 * Admin › Settings › Branding.
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

/** Large login-screen mark: the uploaded logo, or the emblem with the business name arched above it. */
export function LogoBadge({ className }: { className?: string }) {
  const arcId = useId();
  const { settings } = useSettings();
  const name = settings.dealershipName;
  if (settings.logoUrl) {
    return <img src={settings.logoUrl} alt={name} className={cn('object-contain', className)} />;
  }
  return (
    <svg viewBox="0 0 160 120" className={className} role="img" aria-label={name}>
      <defs>
        <path id={arcId} d="M28 76 A52 52 0 0 1 132 76" />
      </defs>
      <text
        fill="currentColor"
        fontFamily="Sora, Manrope, sans-serif"
        fontWeight={700}
        fontSize={name.length > 16 ? 10 : 13.5}
        letterSpacing={name.length > 16 ? 1.2 : 2.2}
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {name.toUpperCase()}
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

/** "Goddel Motors" → ["GODDEL", "MOTORS"]: first word large, the rest spaced out beneath. */
function splitName(name: string): [string, string] {
  const [first = '', ...rest] = name.trim().toUpperCase().split(/\s+/);
  return [first, rest.join(' ')];
}

/** Header lockup: logo (uploaded or emblem) + business name + motto, all from Admin › Settings. */
export function Logo({ className, showSlogan = true }: { className?: string; showSlogan?: boolean }) {
  const { settings } = useSettings();
  const motto = settings.motto || DEFAULT_MOTTO;
  const [first, rest] = splitName(settings.dealershipName);
  const showName = !(settings.logoUrl && settings.logoIncludesName);

  return (
    <span className={cn('inline-flex items-center gap-2 text-brand-500', className)}>
      {settings.logoUrl ? (
        <img
          src={settings.logoUrl}
          alt={showName ? '' : settings.dealershipName}
          className={cn('w-auto shrink-0 object-contain', showName ? 'h-9 max-w-16 sm:h-10' : 'h-9 max-w-40 sm:h-10 sm:max-w-48')}
        />
      ) : (
        <LogoEmblem className="h-8 w-auto shrink-0 sm:h-9" />
      )}
      {(showName || showSlogan) && (
        <span className="flex min-w-0 flex-col font-display leading-none">
          {showName && (
            <>
              <span className="truncate text-[15px] font-extrabold tracking-[0.14em] sm:text-base">{first}</span>
              {rest && <span className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.42em] text-brand-300 sm:text-[11px]">{rest}</span>}
            </>
          )}
          {showSlogan && (
            <span className="mt-1 whitespace-nowrap font-sans text-[9px] font-medium italic tracking-wide text-fg-soft/80 sm:text-[10px]">{motto}</span>
          )}
        </span>
      )}
    </span>
  );
}
