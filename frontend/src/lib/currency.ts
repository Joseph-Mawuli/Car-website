import type { CurrencyCode, ExchangeRates } from '@/types';

export interface ConvertedPrice {
  amount: number;
  currency: CurrencyCode;
  isEstimate: true;
  rateUpdatedAt?: string;
}

/**
 * Converts a listing price into another display currency using the dealership's
 * current rates (live or owner-set). Returns `null` when no reliable rate exists, in which case callers must
 * show the original listing price only. The original price is never modified.
 */
export function convertPrice(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates | undefined,
): ConvertedPrice | null {
  if (from === to || !rates) return null;
  const rateFor = (code: CurrencyCode): number | undefined =>
    code === rates.base ? 1 : rates.rates[code];
  const fromRate = rateFor(from);
  const toRate = rateFor(to);
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null;
  const inBase = amount / fromRate;
  return { amount: inBase * toRate, currency: to, isEstimate: true, rateUpdatedAt: rates.updatedAt };
}

export function availableDisplayCurrencies(
  listingCurrency: CurrencyCode,
  supported: CurrencyCode[],
  rates: ExchangeRates | undefined,
): CurrencyCode[] {
  return supported.filter(
    (code) => code === listingCurrency || convertPrice(1, listingCurrency, code, rates) !== null,
  );
}