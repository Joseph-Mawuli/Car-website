import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { AlertTriangle, CalendarDays, Check, ChevronLeft, Fuel, Gauge, MapPin, Phone, Send, Settings2, Share2 } from 'lucide-react';
import { getVehicle } from '@/features/inventory/api';
import { VehicleGallery } from '@/features/inventory/VehicleGallery';
import { VehicleCard } from '@/features/inventory/VehicleCard';
import { Price } from '@/features/inventory/Price';
import { EnquiryForm } from '@/features/enquiries/EnquiryForm';
import { AvailabilityBadge } from '@/components/ui/Badge';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Alert, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useQuery } from '@/hooks/useQuery';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';
import { ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { availableDisplayCurrencies } from '@/lib/currency';
import { buildTelLink, buildVehicleWhatsAppMessage, buildWhatsAppLink } from '@/lib/contact';
import { formatMileage, formatPrice, cn } from '@/lib/format';
import {
  BODY_TYPE_LABELS,
  CONDITION_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from '@/lib/labels';
import type { Vehicle, VehicleSummary } from '@/types';
import { NotFoundPage } from './NotFoundPage';

function specRows(v: Vehicle): { label: string; value: string }[] {
  const rows: [string, string | undefined][] = [
    ['Make', v.make],
    ['Model', v.model],
    ['Trim', v.trim],
    ['Year', String(v.year)],
    ['Condition', v.condition && CONDITION_LABELS[v.condition]],
    ['Body type', v.bodyType && BODY_TYPE_LABELS[v.bodyType]],
    ['Mileage', formatMileage(v.mileage, v.mileageUnit)],
    ['Engine', v.engineSize],
    ['Fuel type', v.fuelType && FUEL_LABELS[v.fuelType]],
    ['Transmission', v.transmission && TRANSMISSION_LABELS[v.transmission]],
    ['Drivetrain', v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain]],
    ['Exterior colour', v.exteriorColor],
    ['Interior colour', v.interiorColor],
    ['Location', v.location],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1])).map(([label, value]) => ({ label, value }));
}

export function VehicleDetailsPage() {
  const { slug = '' } = useParams();
  const { data, error, isLoading, reload } = useQuery(`vehicle:${slug}`, (signal) => getVehicle(slug, signal));
  const vehicle = data?.vehicle;

  useDocumentMeta({
    title: vehicle ? `${vehicle.title} for sale` : 'Vehicle details',
    description: vehicle
      ? `${vehicle.title} — ${formatPrice(vehicle.price, vehicle.currency)}. ${[vehicle.mileage !== undefined && formatMileage(vehicle.mileage, vehicle.mileageUnit), vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission], vehicle.fuelType && FUEL_LABELS[vehicle.fuelType]].filter(Boolean).join(', ')}. Available to view at Goddel Motors.`
      : undefined,
    image: vehicle?.images[0]?.variants?.large?.url ?? vehicle?.images[0]?.url,
    path: `/cars/${slug}`,
  });

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage message="This vehicle listing doesn't exist or is no longer published." />;

  if (error) {
    return (
      <div className="container-page py-10">
        <ErrorState error={error} title="We couldn't load this vehicle" onRetry={reload} />
      </div>
    );
  }

  if (isLoading || !vehicle || !data) return <VehicleDetailsSkeleton />;

  return <VehicleDetailsContent vehicle={vehicle} related={data.related} />;
}

function VehicleDetailsContent({ vehicle, related }: { vehicle: Vehicle; related: VehicleSummary[] }) {
  const { settings } = useSettings();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { notify } = useToast();
  const { hash } = useLocation();
  const pageUrl = `${config.siteUrl}/cars/${vehicle.slug}`;
  const isSold = vehicle.availabilityStatus === 'sold';
  const isReserved = vehicle.availabilityStatus === 'reserved';

  const whatsappHref = settings.whatsapp
    ? buildWhatsAppLink(settings.whatsapp, buildVehicleWhatsAppMessage(`${vehicle.title} (${formatPrice(vehicle.price, vehicle.currency)})`, pageUrl, settings.dealershipName))
    : undefined;
  const telHref = settings.phone ? buildTelLink(settings.phone) : undefined;
  const currencies = availableDisplayCurrencies(vehicle.currency, settings.supportedCurrencies, settings.exchangeRates);
  const specs = specRows(vehicle);

  useEffect(() => {
    if (hash === '#enquire') document.getElementById('enquire')?.scrollIntoView();
  }, [hash, vehicle.id]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: vehicle.title, url: pageUrl });
      } else {
        await navigator.clipboard.writeText(pageUrl);
        notify('Link copied to clipboard');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') notify('Could not share this link', 'error');
    }
  };

  const quickSpecs = [
    { icon: CalendarDays, label: 'Year', value: String(vehicle.year) },
    { icon: Gauge, label: 'Mileage', value: formatMileage(vehicle.mileage, vehicle.mileageUnit) },
    { icon: Settings2, label: 'Transmission', value: vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission] },
    { icon: Fuel, label: 'Fuel', value: vehicle.fuelType && FUEL_LABELS[vehicle.fuelType] },
  ].filter((s) => s.value);

  return (
    <>
      <div className="container-page py-5 sm:py-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted">
          <Link to="/cars" className="inline-flex min-h-9 items-center gap-1 font-semibold hover:text-fg">
            <ChevronLeft className="h-4 w-4" aria-hidden /> All cars
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-fg-soft" aria-current="page">
            {vehicle.title}
          </span>
        </nav>

        {vehicle.isDemo && (
          <Alert tone="warning" className="mb-4">
            This is a demonstration listing used to preview the website. It is not a real vehicle for sale.
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] lg:gap-10">
          <div className="min-w-0">
            <VehicleGallery
              images={vehicle.images}
              title={vehicle.title}
              overlay={
                <div className="pointer-events-none absolute left-3 top-3 z-10">
                  <AvailabilityBadge status={vehicle.availabilityStatus} solid />
                </div>
              }
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{vehicle.title}</h1>
                  {vehicle.trim && <p className="mt-1 text-muted">{vehicle.trim}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={share} aria-label="Share this vehicle" className="-mr-2 shrink-0">
                  <Share2 className="h-5 w-5" aria-hidden />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Price
                  amount={vehicle.price}
                  currency={vehicle.currency}
                  showRateDate
                  className={cn('text-3xl', isSold && 'text-muted line-through decoration-2')}
                  estimateClassName="text-sm"
                />
                <AvailabilityBadge status={vehicle.availabilityStatus} />
              </div>

              {currencies.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Display currency">
                  {currencies.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDisplayCurrency(code)}
                      aria-pressed={displayCurrency === code}
                      className={cn(
                        'min-h-9 rounded-lg border px-3 text-xs font-bold',
                        displayCurrency === code ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-line text-muted hover:text-fg',
                      )}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}

              {quickSpecs.length > 0 && (
                <ul className="mt-5 grid grid-cols-2 gap-2">
                  {quickSpecs.map(({ icon: Icon, label, value }) => (
                    <li key={label} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
                        <span className="block truncate text-sm font-semibold">{value}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {vehicle.location && (
                <p className="mt-4 flex items-center gap-2 text-sm text-fg-soft">
                  <MapPin className="h-4 w-4 text-muted" aria-hidden /> {vehicle.location}
                </p>
              )}

              {isSold && (
                <Alert tone="error" className="mt-5">
                  This vehicle has been sold and is no longer available. Contact us about similar vehicles.
                </Alert>
              )}
              {isReserved && (
                <Alert tone="warning" className="mt-5">
                  This vehicle is currently reserved. Contact us to ask if it becomes available again.
                </Alert>
              )}

              <div className="mt-5 hidden flex-col gap-3 md:flex">
                {whatsappHref && (
                  <AnchorButton href={whatsappHref} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg">
                    <WhatsAppIcon className="h-5 w-5" /> {isSold ? 'Ask about similar cars' : 'Enquire on WhatsApp'}
                  </AnchorButton>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {telHref && (
                    <AnchorButton href={telHref} variant="outline">
                      <Phone className="h-4 w-4" aria-hidden /> Call
                    </AnchorButton>
                  )}
                  <AnchorButton href="#enquire" variant="primary" className={telHref ? '' : 'col-span-2'}>
                    <Send className="h-4 w-4" aria-hidden /> Enquire Now
                  </AnchorButton>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] lg:gap-10">
          <div className="min-w-0 space-y-6">
            <section className="card p-5 sm:p-6" aria-labelledby="specs-title">
              <h2 id="specs-title" className="text-lg font-semibold">
                Key Specifications
              </h2>
              <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                {specs.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b border-line py-2.5 text-sm">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="text-right font-semibold">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {vehicle.description && (
              <section className="card p-5 sm:p-6" aria-labelledby="overview-title">
                <h2 id="overview-title" className="text-lg font-semibold">
                  Overview
                </h2>
                <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-fg-soft">{vehicle.description}</p>
              </section>
            )}

            {vehicle.features.length > 0 && (
              <section className="card p-5 sm:p-6" aria-labelledby="features-title">
                <h2 id="features-title" className="text-lg font-semibold">
                  Features &amp; Equipment
                </h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {vehicle.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-fg-soft">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(vehicle.conditionNotes || vehicle.knownDefects) && (
              <section className="card p-5 sm:p-6" aria-labelledby="condition-title">
                <h2 id="condition-title" className="text-lg font-semibold">
                  Condition
                </h2>
                {vehicle.conditionNotes && <p className="mt-3 whitespace-pre-line text-fg-soft">{vehicle.conditionNotes}</p>}
                {vehicle.knownDefects && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-brand-500/35 bg-brand-500/10 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                    <div>
                      <h3 className="text-sm font-semibold">Known defects</h3>
                      <p className="mt-1 whitespace-pre-line text-sm text-fg-soft">{vehicle.knownDefects}</p>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <section id="enquire" className="card scroll-mt-24 p-5 sm:p-6 lg:self-start" aria-labelledby="enquire-title">
            <h2 id="enquire-title" className="text-lg font-semibold">
              Enquire About This Vehicle
            </h2>
            <p className="mt-1 text-sm text-muted">Send your details and we'll get back to you.</p>
            <EnquiryForm vehicleId={vehicle.id} vehicleTitle={vehicle.title} className="mt-5" />
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="related-title">
            <h2 id="related-title" className="text-xl font-bold sm:text-2xl">
              Related Vehicles
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((v) => (
                <VehicleCard key={v.id} vehicle={v} compact />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky contact bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn('truncate font-display text-lg font-bold text-brand-500', isSold && 'text-muted line-through')}>
              {formatPrice(vehicle.price, vehicle.currency)}
            </p>
            <p className="truncate text-xs text-muted">{vehicle.title}</p>
          </div>
          {telHref && (
            <AnchorButton href={telHref} variant="outline" size="icon" aria-label="Call the dealership">
              <Phone className="h-5 w-5" aria-hidden />
            </AnchorButton>
          )}
          {whatsappHref ? (
            <AnchorButton href={whatsappHref} target="_blank" rel="noopener noreferrer" variant="whatsapp">
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp
            </AnchorButton>
          ) : (
            <AnchorButton href="#enquire">
              <Send className="h-4 w-4" aria-hidden /> Enquire Now
            </AnchorButton>
          )}
        </div>
      </div>
    </>
  );
}

function VehicleDetailsSkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Loading vehicle">
      <div className="skeleton mb-5 h-5 w-40" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] lg:gap-10">
        <div className="skeleton aspect-[4/3] rounded-2xl" />
        <div className="card space-y-4 p-6">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-9 w-1/2" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
