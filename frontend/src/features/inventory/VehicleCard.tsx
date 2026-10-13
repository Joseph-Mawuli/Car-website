import { Link } from 'react-router';
import { ArrowRight, CalendarDays, CarFront, Fuel, Gauge, Send, Settings2 } from 'lucide-react';
import type { VehicleSummary } from '@/types';
import { AvailabilityBadge } from '@/components/ui/Badge';
import { VehicleImage } from './VehicleImage';
import { Price } from './Price';
import { BODY_TYPE_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from '@/lib/labels';
import { formatMileage, cn } from '@/lib/format';

interface Props {
  vehicle: VehicleSummary;
  priority?: boolean;
  sizes?: string;
  compact?: boolean;
}

export function VehicleCard({ vehicle, priority, compact, sizes = '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' }: Props) {
  const specs = [
    { icon: CalendarDays, value: vehicle.year ? String(vehicle.year) : undefined, label: 'Year' },
    { icon: Fuel, value: vehicle.fuelType && FUEL_LABELS[vehicle.fuelType], label: 'Fuel' },
    { icon: CarFront, value: vehicle.bodyType && BODY_TYPE_LABELS[vehicle.bodyType], label: 'Body type' },
    { icon: Gauge, value: formatMileage(vehicle.mileage, vehicle.mileageUnit), label: 'Mileage' },
    { icon: Settings2, value: vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission], label: 'Transmission' },
  ].filter((s) => Boolean(s.value));

  const subtitle = [vehicle.trim, vehicle.condition && CONDITION_LABELS[vehicle.condition]].filter(Boolean).join(' · ');
  const isSold = vehicle.availabilityStatus === 'sold';

  return (
    <article className="group card relative flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand-500/60 hover:shadow-[0_18px_40px_-20px_rgb(245_185_35_/_0.35)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
        <VehicleImage
          image={vehicle.primaryImage}
          alt={`${vehicle.title} photo`}
          sizes={sizes}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/70 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <AvailabilityBadge status={vehicle.availabilityStatus} solid />
          {vehicle.isDemo && (
            <span className="rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-inset ring-brand-500/40">
              Demo
            </span>
          )}
        </div>
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-4')}>
        <h3 className={cn('font-semibold leading-snug text-fg', compact ? 'text-[15px]' : 'text-base')}>
          <Link to={`/cars/${vehicle.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {vehicle.title}
          </Link>
        </h3>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{subtitle}</p>}

        {specs.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-fg-soft">
            {specs.map(({ icon: Icon, value, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-brand-500/80" aria-hidden />
                <span className="sr-only">{label}: </span>
                {value}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-line pt-3.5">
            <Price
              amount={vehicle.price}
              currency={vehicle.currency}
              className={cn(compact ? 'text-lg' : 'text-xl', isSold && 'text-muted line-through decoration-1')}
            />
            <span
              aria-hidden
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-brand-500/70 px-3 text-xs font-semibold text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-ink-950"
            >
              View Details <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          {!compact && (
            <Link
              to={`/cars/${vehicle.slug}#enquire`}
              aria-label={`Enquire about ${vehicle.title}`}
              className="relative z-10 mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg-soft ring-1 ring-inset ring-line transition-colors hover:bg-brand-500/10 hover:text-brand-300 hover:ring-brand-500/50"
            >
              <Send className="h-4 w-4" aria-hidden /> Enquire Now
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="flex items-center justify-between border-t border-line pt-3.5">
          <div className="skeleton h-6 w-2/5" />
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
