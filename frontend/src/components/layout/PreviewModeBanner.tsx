import { isMockApiActive } from '@/lib/api';

/** Makes it obvious when the dev-only sample API is serving data. */
export function PreviewModeBanner() {
  if (!isMockApiActive()) return null;
  return (
    <div className="bg-brand-500 px-4 py-1.5 text-center text-xs font-bold text-ink-950">
      Development preview — sample data only. Nothing is saved and these are not real listings.
    </div>
  );
}
