import { Link } from 'react-router';
import { ArrowRight, BadgeCheck, CarFront, MessageCircle, ShieldCheck } from 'lucide-react';
import { Hero } from '@/components/sections/Hero';
import { ContactBand } from '@/components/sections/ContactBand';
import { QuickSearch } from '@/features/inventory/QuickSearch';
import { VehicleCard, VehicleCardSkeleton } from '@/features/inventory/VehicleCard';
import { BodyTypeIcon } from '@/features/inventory/bodyTypeIcons';
import { getVehicleFacets, listVehicles } from '@/features/inventory/api';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { useQuery } from '@/hooks/useQuery';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { BODY_TYPE_LABELS } from '@/lib/labels';

const WHY_ICONS = [BadgeCheck, MessageCircle, ShieldCheck, CarFront];

/** Neutral, editable defaults that describe how the site works rather than making business claims. */
const DEFAULT_WHY = [
  { title: 'Clear listings', body: 'Every listing shows the price and the details we have confirmed for that vehicle.' },
  { title: 'Talk to us directly', body: 'Reach the dealership by WhatsApp, phone or the enquiry form — no account needed.' },
  { title: 'Up-to-date availability', body: 'Vehicles are marked available, reserved or sold as soon as their status changes.' },
];

export function HomePage() {
  const { settings } = useSettings();
  useDocumentMeta({
    title: 'Goddel Motors — Find Your Next Car',
    description: 'Browse quality vehicles for sale at Goddel Motors. View photos, prices and specifications, then contact us by WhatsApp or phone.',
    image: '/images/goddel-hero-1600.jpg',
    path: '/',
  });

  const facets = useQuery('facets', (signal) => getVehicleFacets(signal));
  const featured = useQuery('featured', (signal) => listVehicles({ sort: 'newest', limit: 8, availability: 'in_stock' }, signal));

  const why = settings.whyChooseUs.length ? settings.whyChooseUs : DEFAULT_WHY;
  const bodyTypes = facets.data?.bodyTypes ?? [];

  return (
    <>
      <Hero />

      <div className="container-page relative z-10 -mt-14 md:-mt-16">
        <QuickSearch facets={facets.data} />
      </div>

      <section aria-labelledby="featured-title" className="container-page mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Recently added</p>
            <h2 id="featured-title" className="mt-1 text-2xl font-bold sm:text-3xl">
              Featured Vehicles
            </h2>
          </div>
          <Link to="/cars" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600 hover:underline dark:text-brand-400">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {featured.error ? (
          <ErrorState error={featured.error} title="We couldn't load vehicles" onRetry={featured.reload} />
        ) : featured.isLoading && !featured.data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.data && featured.data.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.items.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} priority={i < 2} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CarFront className="h-7 w-7" aria-hidden />}
            title="New stock is on the way"
            description="There are no vehicles listed right now. Contact us and we'll let you know what's arriving."
            action={<ButtonLink to="/contact">Contact us</ButtonLink>}
          />
        )}
      </section>

      {bodyTypes.length > 0 && (
        <section aria-labelledby="categories-title" className="container-page mt-16">
          <p className="eyebrow">Shop by type</p>
          <h2 id="categories-title" className="mt-1 text-2xl font-bold sm:text-3xl">
            Browse by Category
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {bodyTypes.map((type) => (
              <li key={type}>
                <Link
                  to={`/cars?bodyType=${type}`}
                  className="card flex flex-col items-center gap-2 px-3 py-5 text-center transition-colors hover:border-brand-500/60 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <BodyTypeIcon type={type} className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                  <span className="text-sm font-semibold">{BODY_TYPE_LABELS[type]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="why-title" className="container-page mt-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
          <div>
            <p className="eyebrow">Why us</p>
            <h2 id="why-title" className="mt-1 text-2xl font-bold sm:text-3xl">
              Why Choose Goddel Motors?
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {why.map((item, i) => {
              const Icon = WHY_ICONS[i % WHY_ICONS.length];
              return (
                <li key={item.title} className="card p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mt-16">
        <ContactBand />
      </div>
    </>
  );
}
