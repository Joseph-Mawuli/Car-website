import { ButtonLink } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export function NotFoundPage({ message = "The page you're looking for doesn't exist or has been moved." }: { message?: string }) {
  useDocumentMeta({ title: 'Page not found', noIndex: true });
  return (
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-ink-950 text-white">
      <img
        src="/images/goddel-hero-1600.jpg"
        alt=""
        width={1600}
        height={900}
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-30"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/40" />
      <div className="container-page py-20 text-center">
        <p className="font-display text-7xl font-extrabold text-brand-400 sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Page Not Found</h1>
        <p className="mx-auto mt-3 max-w-md text-white/70">{message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/" size="lg">
            Go home
          </ButtonLink>
          <ButtonLink to="/cars" variant="onDark" size="lg">
            Browse cars
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
