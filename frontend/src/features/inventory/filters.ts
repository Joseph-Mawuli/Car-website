import type { AvailabilityFilter, VehicleQuery, VehicleSort } from './api';
import {
  BODY_TYPE_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from '@/lib/labels';
import { formatDate, formatPrice } from '@/lib/format';
import { convertPrice } from '@/lib/currency';
import { CURRENCIES, type BodyType, type CurrencyCode, type ExchangeRates, type FuelType, type Transmission, type VehicleCondition, type VehicleFacets } from '@/types';

export const FILTER_KEYS = [
  'q',
  'make',
  'bodyType',
  'fuelType',
  'transmission',
  'condition',
  'availability',
  'minPrice',
  'maxPrice',
  'minYear',
  'maxYear',
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const SORT_OPTIONS: { value: VehicleSort; label: string }[] = [
  { value: 'newest', label: 'Newest listings' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'in_stock', label: 'Available & reserved' },
  { value: 'available', label: 'Available only' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Recently sold' },
  { value: 'all', label: 'All vehicles' },
];

/** URL key for the currency the price range was typed in (absent = default currency). */
export const PRICE_CURRENCY_KEY = 'priceCurrency';
const CURRENCY_CODES: readonly CurrencyCode[] = CURRENCIES;

export function priceRangeCurrency(params: URLSearchParams, defaultCurrency: CurrencyCode): CurrencyCode {
  const code = params.get(PRICE_CURRENCY_KEY) as CurrencyCode | null;
  return code && CURRENCY_CODES.includes(code) ? code : defaultCurrency;
}

/**
 * The cheapest and dearest published listing, from the database, in the visitor's currency.
 * Used to guide what visitors type — never as a preset limit.
 */
export function listedPriceRange(
  facets: VehicleFacets | undefined,
  defaultCurrency: CurrencyCode,
  currency: CurrencyCode,
  rates: ExchangeRates | undefined,
): { min: number; max: number } | null {
  const { min, max } = facets?.price ?? {};
  if (min == null || max == null) return null;
  if (currency === defaultCurrency) return { min, max };
  const lo = convertPrice(min, defaultCurrency, currency, rates);
  const hi = convertPrice(max, defaultCurrency, currency, rates);
  return lo && hi ? { min: Math.floor(lo.amount), max: Math.ceil(hi.amount) } : null;
}

export function listedPriceRangeHint(range: { min: number; max: number } | null, currency: CurrencyCode): string | undefined {
  if (!range) return undefined;
  return range.min === range.max
    ? `Cars are currently listed at about ${formatPrice(range.min, currency)}.`
    : `Cars currently range from ${formatPrice(range.min, currency)} to ${formatPrice(range.max, currency)}.`;
}

function toInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function queryFromSearchParams(params: URLSearchParams, limit: number): VehicleQuery {
  const sort = params.get('sort');
  const availability = params.get('availability');
  const minPrice = toInt(params.get('minPrice'));
  const maxPrice = toInt(params.get('maxPrice'));
  const priceCurrency = params.get(PRICE_CURRENCY_KEY) as CurrencyCode | null;
  return {
    q: params.get('q')?.slice(0, 60) || undefined,
    make: params.get('make') || undefined,
    bodyType: params.get('bodyType') || undefined,
    fuelType: params.get('fuelType') || undefined,
    transmission: params.get('transmission') || undefined,
    condition: params.get('condition') || undefined,
    availability: AVAILABILITY_OPTIONS.some((o) => o.value === availability) ? (availability as AvailabilityFilter) : undefined,
    minPrice,
    maxPrice,
    priceCurrency:
      (minPrice !== undefined || maxPrice !== undefined) && priceCurrency && CURRENCY_CODES.includes(priceCurrency) ? priceCurrency : undefined,
    minYear: toInt(params.get('minYear')),
    maxYear: toInt(params.get('maxYear')),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as VehicleSort) : 'newest',
    page: Math.max(1, toInt(params.get('page')) ?? 1),
    limit,
  };
}

/**
 * Explains how the price filter treats cars listed in other currencies: they are matched
 * by an estimate using the current exchange rates, and left out when no rate is available.
 */
export function priceFilterNote(defaultCurrency: CurrencyCode, rates: ExchangeRates | undefined): string {
  const converted = rates?.base === defaultCurrency ? (Object.keys(rates.rates) as CurrencyCode[]).filter((c) => c !== defaultCurrency && rates.rates[c]) : [];
  if (converted.length === 0) return `Only cars priced in ${defaultCurrency} are included when a price range is set.`;
  const date = rates?.updatedAt ? ` (updated ${formatDate(rates.updatedAt)})` : '';
  const kind = rates?.sourceUrl ? 'live exchange rates' : "the dealership's exchange rates";
  return `Cars listed in other currencies are compared by an estimated price using ${kind}${date}.`;
}

export interface ActiveFilterChip {
  key: FilterKey;
  label: string;
}

export function activeFilterChips(params: URLSearchParams, currency: CurrencyCode): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    let label = value;
    switch (key) {
      case 'q':
        label = `“${value}”`;
        break;
      case 'bodyType':
        label = BODY_TYPE_LABELS[value as BodyType] ?? value;
        break;
      case 'fuelType':
        label = FUEL_LABELS[value as FuelType] ?? value;
        break;
      case 'transmission':
        label = TRANSMISSION_LABELS[value as Transmission] ?? value;
        break;
      case 'condition':
        label = CONDITION_LABELS[value as VehicleCondition] ?? value;
        break;
      case 'availability':
        label = AVAILABILITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
        break;
      case 'minPrice':
        label = `From ${formatPrice(Number(value), currency)}`;
        break;
      case 'maxPrice':
        label = `Up to ${formatPrice(Number(value), currency)}`;
        break;
      case 'minYear':
        label = `${value} or newer`;
        break;
      case 'maxYear':
        label = `${value} or older`;
        break;
    }
    chips.push({ key, label });
  }
  return chips;
}
