import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { VehicleFacets } from '@/types';
import { SelectField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { BODY_TYPE_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from '@/lib/labels';
import { AVAILABILITY_OPTIONS, listedPriceRange, listedPriceRangeHint, PRICE_CURRENCY_KEY, priceFilterNote, type FilterKey } from './filters';
import { useSettings } from '@/providers/SettingsProvider';
import { CurrencySwitcher } from '@/components/layout/CurrencySwitcher';
import type { CurrencyCode } from '@/types';

interface Props {
  params: URLSearchParams;
  facets?: VehicleFacets;
  /** Currency the price range is entered in. */
  currency: CurrencyCode;
  onChange: (updates: Partial<Record<FilterKey | typeof PRICE_CURRENCY_KEY, string | undefined>>) => void;
  onReset: () => void;
}

export function FilterPanel({ params, facets, currency, onChange, onReset }: Props) {
  const { settings } = useSettings();
  const select = (key: FilterKey) => ({
    value: params.get(key) ?? '',
    onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange({ [key]: e.target.value || undefined }),
  });

  const years: { value: string; label: string }[] = [];
  if (facets?.years.min && facets.years.max) {
    for (let y = facets.years.max; y >= facets.years.min; y--) years.push({ value: String(y), label: String(y) });
  }

  return (
    <div className="space-y-4">
      <CurrencySwitcher variant="field" />
      <PriceRange
        key={`${params.get('minPrice')}-${params.get('maxPrice')}-${currency}`}
        currency={currency}
        rangeHint={listedPriceRangeHint(listedPriceRange(facets, settings.defaultCurrency, currency, settings.exchangeRates), currency)}
        initialMin={params.get('minPrice') ?? ''}
        initialMax={params.get('maxPrice') ?? ''}
        onApply={(min, max) =>
          onChange({
            minPrice: min || undefined,
            maxPrice: max || undefined,
            [PRICE_CURRENCY_KEY]: (min || max) && currency !== settings.defaultCurrency ? currency : undefined,
          })
        }
      />
      <SelectField label="Make" placeholder="All makes" options={(facets?.makes ?? []).map((m) => ({ value: m, label: m }))} {...select('make')} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Year from" placeholder="Any" options={years} {...select('minYear')} />
        <SelectField label="Year to" placeholder="Any" options={years} {...select('maxYear')} />
      </div>
      <SelectField
        label="Body type"
        placeholder="Any type"
        options={(facets?.bodyTypes ?? []).map((b) => ({ value: b, label: BODY_TYPE_LABELS[b] }))}
        {...select('bodyType')}
      />
      <SelectField
        label="Fuel type"
        placeholder="Any fuel"
        options={(facets?.fuelTypes ?? []).map((f) => ({ value: f, label: FUEL_LABELS[f] }))}
        {...select('fuelType')}
      />
      <SelectField
        label="Transmission"
        placeholder="Any transmission"
        options={(facets?.transmissions ?? []).map((t) => ({ value: t, label: TRANSMISSION_LABELS[t] }))}
        {...select('transmission')}
      />
      <SelectField
        label="Condition"
        placeholder="Any condition"
        options={(facets?.conditions ?? []).map((c) => ({ value: c, label: CONDITION_LABELS[c] }))}
        {...select('condition')}
      />
      <SelectField
        label="Availability"
        options={AVAILABILITY_OPTIONS}
        value={params.get('availability') ?? 'in_stock'}
        onChange={(e) => onChange({ availability: e.target.value === 'in_stock' ? undefined : e.target.value })}
      />
      <Button variant="outline" className="w-full" onClick={onReset}>
        Reset all filters
      </Button>
    </div>
  );
}

function PriceRange({
  currency,
  rangeHint,
  initialMin,
  initialMax,
  onApply,
}: {
  currency: CurrencyCode;
  rangeHint?: string;
  initialMin: string;
  initialMax: string;
  onApply: (min: string, max: string) => void;
}) {
  const { settings } = useSettings();
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  const invalid = min !== '' && max !== '' && Number(min) > Number(max);

  const applyIfChanged = () => {
    if (!invalid && (min !== initialMin || max !== initialMax)) onApply(min, max);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    applyIfChanged();
  };

  return (
    <form onSubmit={submit} aria-label="Price range">
      <fieldset>
        <legend className="field-label">Price range ({currency})</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="sr-only" htmlFor="price-min">
            Minimum price
          </label>
          <input
            id="price-min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            onBlur={applyIfChanged}
            className="field-input"
          />
          <label className="sr-only" htmlFor="price-max">
            Maximum price
          </label>
          <input
            id="price-max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            onBlur={applyIfChanged}
            aria-invalid={invalid || undefined}
            className="field-input"
          />
        </div>
        {invalid ? (
          <p className="field-error">Minimum price must be lower than maximum.</p>
        ) : (
          <>
            {rangeHint && <p className="mt-1.5 text-xs font-semibold text-fg-soft">{rangeHint}</p>}
            <p className="mt-1 text-xs text-muted">{priceFilterNote(settings.defaultCurrency, settings.exchangeRates)}</p>
          </>
        )}
        <button type="submit" className="sr-only">
          Apply price range
        </button>
      </fieldset>
    </form>
  );
}
