import { useEffect } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PreviewModeBanner } from '@/components/layout/PreviewModeBanner';

export function PublicLayout() {
  const { pathname, hash } = useLocation();
  // Vehicle pages render their own sticky WhatsApp/Call bar on mobile.
  const onVehiclePage = useMatch('/cars/:slug');

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand-500 px-4 py-2 font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <PreviewModeBanner />
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <div className={onVehiclePage ? 'pb-24 md:pb-0' : 'pb-16 md:pb-0'}>
        <PublicFooter />
      </div>
      {!onVehiclePage && <MobileBottomNav />}
    </div>
  );
}
