import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import type { VehicleFacets } from '@/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { BODY_TYPE_LABELS, labelOf } from '@/lib/labels';
import { useSettings } from '@/providers/SettingsProvider';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';
import { CurrencySwitcher } from '@/components/layout/CurrencySwitcher';
import { listedPriceRange, listedPriceRangeHint, PRICE_CURRENCY_KEY } from './filters';

/** Every option here comes from published listings; prices are typed by the visitor. */
export function QuickSearch({ facets }: { facets?: VehicleFacets }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { displayCurrency, currencies } = useDisplayCurrency();
  const [keyword, setKeyword] = useState('');
  const [make, setMake] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');

  const range = listedPriceRange(facets, settings.defaultCurrency, displayCurrency, settings.exchangeRates);
  const invalidPrice = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  const yearOptions: { value: string; label: string }[] = [];
  if (facets?.years.min && facets.years.max) {
    for (let y = facets.years.max; y >= facets.years.min; y--) yearOptions.push({ value: String(y), label: `${y} or newer` });
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalidPrice) return;
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (make) params.set('make', make);
    if (bodyType) params.set('bodyType', bodyType);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if ((minPrice || maxPrice) && displayCurrency !== settings.defaultCurrency) params.set(PRICE_CURRENCY_KEY, displayCurrency);
    if (minYear) params.set('minYear', minYear);
    navigate(`/cars${params.toString() ? `?${params}` : ''}`);
  };

  const priceInput = (id: string, label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <>
      <label htmlFor={id} className="sr-only">
        {label} ({displayCurrency})
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalidPrice || undefined}
        aria-describedby="qs-price-hint"
        className="field-input"
      />
    </>
  );

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Quick vehicle search"
      className="card grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-[1.3fr_1fr_1fr_1.6fr_1fr_auto] lg:items-start"
    >
      <div className="col-span-2 lg:col-span-1">
        <label htmlFor="qs-keyword" className="field-label">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="qs-keyword"
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Make, model or keyword"
            className="field-input pl-10"
            maxLength={60}
          />
        </div>
      </div>
      <SelectField
        label="Make"
        value={make}
        onChange={(e) => setMake(e.target.value)}
        placeholder="Any make"
        options={(facets?.makes ?? []).map((m) => ({ value: m, label: m }))}
      />
      <SelectField
        label="Body type"
        value={bodyType}
        onChange={(e) => setBodyType(e.target.value)}
        placeholder="Any type"
        options={(facets?.bodyTypes ?? []).map((b) => ({ value: b, label: labelOf(BODY_TYPE_LABELS, b) }))}
      />
      <fieldset className="col-span-2 lg:col-span-1">
        <legend className="sr-only">Price ({displayCurrency})</legend>
        <div className="flex items-center justify-between gap-2">
          <span className="field-label" aria-hidden>
            Price{currencies.length < 2 ? ` (${displayCurrency})` : ''}
          </span>
          <CurrencySwitcher variant="inline" className="-mt-1.5 -mr-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {priceInput('qs-min-price', 'Minimum price', minPrice, setMinPrice, 'Min')}
          {priceInput('qs-max-price', 'Maximum price', maxPrice, setMaxPrice, 'Max')}
        </div>
        <p id="qs-price-hint" className={invalidPrice ? 'field-error' : 'mt-1.5 text-xs text-muted'}>
          {invalidPrice ? 'Minimum must be lower than maximum.' : listedPriceRangeHint(range, displayCurrency)}
        </p>
      </fieldset>
      <SelectField label="Year" value={minYear} onChange={(e) => setMinYear(e.target.value)} placeholder="Any year" options={yearOptions} />
      <Button type="submit" className="col-span-2 lg:col-span-1 lg:mt-7" leftIcon={<Search className="h-4 w-4" aria-hidden />}>
        Search
      </Button>
    </form>
  );
}
