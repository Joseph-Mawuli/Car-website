import { describe, expect, it } from 'vitest';
import { activeFilterChips, listedPriceRange, listedPriceRangeHint, priceFilterNote, queryFromSearchParams } from './filters';

describe('queryFromSearchParams', () => {
  it('parses filters from the URL', () => {
    const q = queryFromSearchParams(new URLSearchParams('make=Toyota&bodyType=suv&minPrice=100000&sort=price_asc&page=2'), 12);
    expect(q).toMatchObject({ make: 'Toyota', bodyType: 'suv', minPrice: 100000, sort: 'price_asc', page: 2, limit: 12 });
  });

  it('ignores invalid values instead of passing them to the API', () => {
    const q = queryFromSearchParams(new URLSearchParams('sort=hack&availability=nope&minPrice=-5&page=abc'), 12);
    expect(q.sort).toBe('newest');
    expect(q.availability).toBeUndefined();
    expect(q.minPrice).toBeUndefined();
    expect(q.page).toBe(1);
  });

  it('passes the price-range currency only alongside a valid range', () => {
    expect(queryFromSearchParams(new URLSearchParams('maxPrice=9000&priceCurrency=USD'), 12)).toMatchObject({ maxPrice: 9000, priceCurrency: 'USD' });
    expect(queryFromSearchParams(new URLSearchParams('priceCurrency=USD'), 12).priceCurrency).toBeUndefined();
    expect(queryFromSearchParams(new URLSearchParams('maxPrice=9000&priceCurrency=XYZ'), 12).priceCurrency).toBeUndefined();
  });

  it('caps the keyword length', () => {
    const q = queryFromSearchParams(new URLSearchParams(`q=${'a'.repeat(200)}`), 12);
    expect(q.q).toHaveLength(60);
  });
});

describe('priceFilterNote', () => {
  it('explains that other currencies are matched by an estimate', () => {
    const note = priceFilterNote('GHS', { base: 'GHS', rates: { USD: 0.0625 }, updatedAt: '2026-10-01T00:00:00.000Z' });
    expect(note).toMatch(/other currencies are compared by an estimated price using the dealership's exchange rates/);
    expect(note).toMatch(/1 Oct 2026/);
  });

  it('mentions live rates when they come from the market feed', () => {
    const note = priceFilterNote('GHS', { base: 'GHS', rates: { USD: 0.085 }, sourceUrl: 'https://www.exchangerate-api.com' });
    expect(note).toMatch(/using live exchange rates/);
  });

  it('says only default-currency cars are included when no rates exist', () => {
    expect(priceFilterNote('GHS', undefined)).toBe('Only cars priced in GHS are included when a price range is set.');
  });
});

describe('listedPriceRange', () => {
  const facets = { makes: [], bodyTypes: [], fuelTypes: [], transmissions: [], conditions: [], years: { min: null, max: null }, price: { min: 85000, max: 410000 } };
  const rates = { base: 'GHS' as const, rates: { USD: 0.0625 } };

  it('uses the cheapest and dearest listings from the database', () => {
    expect(listedPriceRange(facets, 'GHS', 'GHS', rates)).toEqual({ min: 85000, max: 410000 });
    expect(listedPriceRangeHint({ min: 85000, max: 410000 }, 'GHS')).toBe('Cars currently range from GHS 85,000 to GHS 410,000.');
  });

  it('converts the range into the visitor’s currency', () => {
    expect(listedPriceRange(facets, 'GHS', 'USD', rates)).toEqual({ min: 5312, max: 25625 });
  });

  it('gives no range when there are no listings or no rate', () => {
    expect(listedPriceRange({ ...facets, price: { min: null, max: null } }, 'GHS', 'GHS', rates)).toBeNull();
    expect(listedPriceRange(facets, 'GHS', 'EUR', rates)).toBeNull();
    expect(listedPriceRangeHint(null, 'GHS')).toBeUndefined();
  });
});

describe('activeFilterChips', () => {
  it('produces readable labels for active filters', () => {
    const chips = activeFilterChips(new URLSearchParams('bodyType=suv&maxPrice=300000&minYear=2019'), 'GHS');
    expect(chips.map((c) => c.label)).toEqual(['SUV', 'Up to GHS 300,000', '2019 or newer']);
  });

  it('labels price chips in the currency the range was entered in', () => {
    expect(activeFilterChips(new URLSearchParams('maxPrice=9000'), 'USD').map((c) => c.label)).toEqual(['Up to USD 9,000']);
  });
});
