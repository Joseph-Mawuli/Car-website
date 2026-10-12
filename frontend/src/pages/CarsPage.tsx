import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CarFront, Search, SlidersHorizontal, X } from 'lucide-react';
import { getVehicleFacets, listVehicles } from '@/features/inventory/api';
import { VehicleCard, VehicleCardSkeleton } from '@/features/inventory/VehicleCard';
import { FilterPanel } from '@/features/inventory/FilterPanel';
import { CurrencyConverter } from '@/features/inventory/CurrencyConverter';
import {
  activeFilterChips,
  FILTER_KEYS,
  PRICE_CURRENCY_KEY,
  priceRangeCurrency,
  queryFromSearchParams,
  SORT_OPTIONS,
  type FilterKey,
} from '@/features/inventory/filters';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useQuery } from '@/hooks/useQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';
import { convertPrice } from '@/lib/currency';

const PAGE_SIZE = 12;

export function CarsPage() {
  const [params, setParams] = useSearchParams();
  const { settings } = useSettings();
  const { displayCurrency } = useDisplayCurrency();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [keyword, setKeyword] = useState(params.get('q') ?? '');
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 400);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useDocumentMeta({
    title: 'Browse Cars',
    description: 'Search and filter vehicles for sale at Goddel Motors by make, price, year, body type, fuel and more.',
    path: '/cars',
  });

  useEffect(() => {
    if (params.get('focus') === 'search') {
      searchRef.current?.focus();
      const next = new URLSearchParams(params);
      next.delete('focus');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const updateParams = (updates: Partial<Record<FilterKey | typeof PRICE_CURRENCY_KEY | 'sort' | 'page', string | undefined>>, opts: { resetPage?: boolean } = { resetPage: true }) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (opts.resetPage) next.delete('page');
        return next;
      },
      { replace: false },
    );
  };

  // Push debounced keyword into the URL so searches are shareable and survive refresh.
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedKeyword) updateParams({ q: debouncedKeyword || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  const query = queryFromSearchParams(params, PAGE_SIZE);
  const queryKey = JSON.stringify(query);
  const results = useQuery(`vehicles:${queryKey}`, (signal) => listVehicles(query, signal));
  const facets = useQuery('facets', (signal) => getVehicleFacets(signal));

  const hasPriceRange = params.has('minPrice') || params.has('maxPrice');
  // A set range stays in the currency it was typed in; a new one uses the visitor's currency.
  const rangeCurrency = hasPriceRange ? priceRangeCurrency(params, settings.defaultCurrency) : displayCurrency;
  const chips = activeFilterChips(params, rangeCurrency).filter((c) => c.key !== 'q');

  // Switching currency converts an existing range so the same cars stay matched.
  useEffect(() => {
    if (!hasPriceRange || rangeCurrency === displayCurrency) return;
    const convert = (value: string | null) => {
      if (!value) return { ok: true, value: undefined };
      const c = convertPrice(Number(value), rangeCurrency, displayCurrency, settings.exchangeRates);
      return c ? { ok: true, value: String(Math.round(c.amount)) } : { ok: false, value: undefined };
    };
    const min = convert(params.get('minPrice'));
    const max = convert(params.get('maxPrice'));
    if (!min.ok || !max.ok) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of [['minPrice', min.value], ['maxPrice', max.value]] as const) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (displayCurrency === settings.defaultCurrency) next.delete(PRICE_CURRENCY_KEY);
        else next.set(PRICE_CURRENCY_KEY, displayCurrency);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency, settings.exchangeRates]);
  const activeCount = chips.length;

  const resetAll = () => {
    setKeyword('');
    setParams(new URLSearchParams());
  };

  const goToPage = (page: number) => {
    updateParams({ page: page > 1 ? String(page) : undefined }, { resetPage: false });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const data = results.data;

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="eyebrow">Inventory</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Browse Our Inventory</h1>
        <p className="mt-2 text-muted">Find the vehicle that suits you. Prices and details are shown exactly as recorded for each listing.</p>
      </header>

      {/* Search + sort bar (sticky on mobile for one-handed use) */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="inventory-search" className="sr-only">
              Search by make, model or keyword
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              ref={searchRef}
              id="inventory-search"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search make, model or keyword"
              maxLength={60}
              className="field-input pl-11"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 lg:hidden"
              onClick={() => setFiltersOpen(true)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
              aria-haspopup="dialog"
            >
              Filters{activeCount > 0 && ` (${activeCount})`}
            </Button>
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <label htmlFor="inventory-sort" className="sr-only">
                Sort vehicles
              </label>
              <select
                id="inventory-sort"
                value={query.sort}
                onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? undefined : e.target.value })}
                className="field-input appearance-none pr-9"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => updateParams({ [chip.key]: undefined })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-500/20 dark:text-brand-300"
            >
              {chip.label}
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button type="button" onClick={resetAll} className="min-h-9 px-2 text-sm font-semibold text-muted underline-offset-2 hover:text-fg hover:underline">
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden space-y-5 lg:block" aria-label="Filters">
          <div className="card p-5">
            <h2 className="mb-4 text-base font-semibold">Filters</h2>
            <FilterPanel params={params} facets={facets.data} currency={rangeCurrency} onChange={(u) => updateParams(u)} onReset={resetAll} />
          </div>
          <CurrencyConverter className="card p-5" />
        </aside>

        <div ref={resultsRef} className="scroll-mt-28 min-w-0">
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {results.isLoading && !data
              ? 'Loading vehicles…'
              : data
                ? `${data.total} vehicle${data.total === 1 ? '' : 's'} found`
                : ''}
          </p>

          {results.error ? (
            <ErrorState error={results.error} title="We couldn't load the inventory" onRetry={results.reload} />
          ) : !data ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <VehicleCardSkeleton key={i} />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            FILTER_KEYS.some((k) => params.get(k)) ? (
              <EmptyState
                icon={<Search className="h-7 w-7" aria-hidden />}
                title="No vehicles match your search"
                description="Try removing a filter or searching for a different make or model."
                action={<Button onClick={resetAll}>Reset filters</Button>}
              />
            ) : (
              <EmptyState
                icon={<CarFront className="h-7 w-7" aria-hidden />}
                title="No vehicles listed right now"
                description="Our inventory is being updated. Contact us and we'll tell you what's available or arriving soon."
                action={<ButtonLink to="/contact">Contact us</ButtonLink>}
              />
            )
          ) : (
            <div className={results.isLoading ? 'opacity-60 transition-opacity' : undefined} aria-busy={results.isLoading}>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} priority={i < 2} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter vehicles"
        variant="sheet"
        footer={
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            {data ? `Show ${data.total} result${data.total === 1 ? '' : 's'}` : 'Show results'}
          </Button>
        }
      >
        <FilterPanel params={params} facets={facets.data} currency={rangeCurrency} onChange={(u) => updateParams(u)} onReset={resetAll} />
        <CurrencyConverter className="mt-6 border-t border-line pt-6" />
      </Dialog>
    </div>
  );
}
