import type { CurrencyCode } from '../types/domain.js';

/**
 * Prices are compared in the dealership's default currency. A listing priced in another
 * currency is compared using the effective rate (1 base = rate × foreign); listings
 * whose currency has no rate are never guessed at — they are left out of price filters and
 * sorted after priced matches.
 */
export interface PricingContext {
  base: CurrencyCode;
  rates: Partial<Record<CurrencyCode, number>>;
}

export function pricingContext(settings: {
  defaultCurrency: CurrencyCode;
  exchangeRates?: { base?: CurrencyCode; rates?: Map<string, number> | Partial<Record<CurrencyCode, number>> };
}): PricingContext {
  const base = settings.defaultCurrency;
  const rates: PricingContext['rates'] = {};
  const configured = settings.exchangeRates;
  if (configured?.base === base && configured.rates) {
    const entries = configured.rates instanceof Map ? [...configured.rates.entries()] : Object.entries(configured.rates as Record<string, number>);
    for (const [code, rate] of entries) {
      if (code !== base && typeof rate === 'number' && Number.isFinite(rate) && rate > 0) rates[code as CurrencyCode] = rate;
    }
  }
  return { base, rates };
}

export function priceInBase(price: number, currency: CurrencyCode, ctx: PricingContext): number | null {
  if (currency === ctx.base) return price;
  const rate = ctx.rates[currency];
  return rate ? price / rate : null;
}

/** Aggregation-expression equivalent of `priceInBase` for use inside MongoDB queries. */
export function priceInBaseExpression(ctx: PricingContext) {
  return {
    $switch: {
      branches: [
        { case: { $eq: ['$currency', ctx.base] }, then: '$price' },
        ...Object.entries(ctx.rates).map(([code, rate]) => ({ case: { $eq: ['$currency', code] }, then: { $divide: ['$price', rate] } })),
      ],
      default: null,
    },
  };
}
