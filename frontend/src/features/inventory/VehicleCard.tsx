import { Link } from 'react-router';
import { Fuel, Gauge, Settings2 } from 'lucide-react';
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
    { icon: Gauge, value: formatMileage(vehicle.mileage, vehicle.mileageUnit), label: 'Mileage' },
    { icon: Settings2, value: vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission], label: 'Transmission' },
    { icon: Fuel, value: vehicle.fuelType && FUEL_LABELS[vehicle.fuelType], label: 'Fuel' },
  ].filter((s) => Boolean(s.value));

  const subtitle = [vehicle.trim, vehicle.bodyType && BODY_TYPE_LABELS[vehicle.bodyType], vehicle.condition && CONDITION_LABELS[vehicle.condition]]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group card relative flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
        <VehicleImage
          image={vehicle.primaryImage}
          alt={`${vehicle.title} photo`}
          sizes={sizes}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <AvailabilityBadge status={vehicle.availabilityStatus} solid />
          {vehicle.isDemo && (
            <span className="rounded-md bg-ink-950/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">
              Demo
            </span>
          )}
        </div>
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-4')}>
        <h3 className={cn('font-semibold leading-snug', compact ? 'text-[15px]' : 'text-base')}>
          <Link to={`/cars/${vehicle.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {vehicle.title}
          </Link>
        </h3>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{subtitle}</p>}

        <div className="mt-3">
          <Price
            amount={vehicle.price}
            currency={vehicle.currency}
            className={cn(compact ? 'text-lg' : 'text-xl', vehicle.availabilityStatus === 'sold' && 'text-muted line-through decoration-1 dark:text-muted')}
          />
        </div>

        {specs.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[13px] text-fg-soft [&:not(:first-child)]:mt-4">
            {specs.map(({ icon: Icon, value, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-muted" aria-hidden />
                <span className="sr-only">{label}: </span>
                {value}
              </li>
            ))}
          </ul>
        )}
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
        <div className="skeleton h-6 w-2/5" />
        <div className="skeleton h-4 w-full" />
      </div>
    </div>
  );
}
