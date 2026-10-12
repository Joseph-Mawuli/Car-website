import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { CURRENCIES, type CurrencyCode } from '../types/domain.js';

/**
 * Daily market exchange rates from ExchangeRate-API's open endpoint (no key needed; their
 * terms require a visible attribution link, which the site footer shows as `sourceUrl`).
 * Rates are cached in memory, refreshed every few hours, and never guessed: if the
 * provider can't be reached and the last good rates are too old, callers get `null`.
 */
export interface LiveRates {
  base: CurrencyCode;
  /** 1 base = rate × currency */
  rates: Partial<Record<CurrencyCode, number>>;
  /** When the provider last updated the rates (not when we fetched them). */
  updatedAt: string;
  source: string;
  sourceUrl: string;
}

export const LIVE_RATES_SOURCE = 'ExchangeRate-API';
export const LIVE_RATES_SOURCE_URL = 'https://www.exchangerate-api.com';

const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
/** Older provider data than this is treated as unreliable and not shown. */
const MAX_RATE_AGE_MS = 4 * 24 * 60 * 60 * 1000;

const responseSchema = z.object({
  result: z.literal('success'),
  base_code: z.string(),
  time_last_update_unix: z.number().int().positive(),
  rates: z.record(z.string(), z.number()),
});

type Fetcher = (base: CurrencyCode) => Promise<unknown>;

const defaultFetcher: Fetcher = async (base) => {
  if (env.NODE_ENV === 'test') throw new Error('Live exchange rates are disabled in tests');
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Exchange rate provider responded ${res.status}`);
  return res.json();
};

let fetcher: Fetcher = defaultFetcher;

interface CacheEntry {
  value: LiveRates | null;
  fetchedAt: number;
  failedAt?: number;
}
const cache = new Map<CurrencyCode, CacheEntry>();
const inFlight = new Map<CurrencyCode, Promise<void>>();

function parse(base: CurrencyCode, body: unknown): LiveRates {
  const data = responseSchema.parse(body);
  if (data.base_code !== base) throw new Error(`Provider returned rates for ${data.base_code}, expected ${base}`);
  const rates: LiveRates['rates'] = {};
  for (const code of CURRENCIES) {
    const rate = data.rates[code];
    if (code !== base && typeof rate === 'number' && Number.isFinite(rate) && rate > 0) rates[code] = rate;
  }
  if (Object.keys(rates).length === 0) throw new Error('Provider returned no usable rates');
  return {
    base,
    rates,
    updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
    source: LIVE_RATES_SOURCE,
    sourceUrl: LIVE_RATES_SOURCE_URL,
  };
}

async function refresh(base: CurrencyCode): Promise<void> {
  const previous = cache.get(base);
  try {
    const value = parse(base, await fetcher(base));
    cache.set(base, { value, fetchedAt: Date.now() });
  } catch (error) {
    logger.warn('Could not refresh live exchange rates', { base, error: (error as Error).message });
    cache.set(base, { value: previous?.value ?? null, fetchedAt: previous?.fetchedAt ?? 0, failedAt: Date.now() });
  }
}

function usable(entry: CacheEntry | undefined): LiveRates | null {
  if (!entry?.value) return null;
  return Date.now() - Date.parse(entry.value.updatedAt) <= MAX_RATE_AGE_MS ? entry.value : null;
}

export async function getLiveRates(base: CurrencyCode): Promise<LiveRates | null> {
  const now = Date.now();
  const entry = cache.get(base);
  const stale = !entry || now - entry.fetchedAt > REFRESH_AFTER_MS;
  const backingOff = entry?.failedAt !== undefined && now - entry.failedAt < RETRY_AFTER_FAILURE_MS;

  if (stale && !backingOff) {
    let pending = inFlight.get(base);
    if (!pending) {
      pending = refresh(base).finally(() => inFlight.delete(base));
      inFlight.set(base, pending);
    }
    // Only wait when there's nothing to serve yet; otherwise refresh in the background.
    if (!usable(entry)) await pending;
  }
  return usable(cache.get(base));
}

/** Test hook: replace the network call, or pass `null` to restore it. Also clears the cache. */
export function setLiveRatesFetcher(next: Fetcher | null): void {
  fetcher = next ?? defaultFetcher;
  cache.clear();
  inFlight.clear();
}
