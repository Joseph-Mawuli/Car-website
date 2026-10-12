import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setLiveRatesFetcher } from '../src/services/liveRates.js';
import { serializePublicSettings } from '../src/services/settingsService.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { SiteSettings } from '../src/models/SiteSettings.js';
import { getPublicFacets, listPublicVehicles } from '../src/services/vehicleService.js';
import { publicVehicleQuery } from '../src/schemas/vehicle.js';
import { priceInBase, pricingContext } from '../src/lib/pricing.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

const car = (slug: string, price: number, currency: string, createdAt: string) => ({
  slug,
  make: 'Test',
  model: slug,
  year: 2020,
  price,
  currency,
  availabilityStatus: 'available',
  visibility: 'published',
  createdAt: new Date(createdAt),
});

async function setRates(rates: Record<string, number> | null, exchangeRateMode: 'live' | 'manual' = 'manual') {
  await SiteSettings.deleteMany({});
  await SiteSettings.create({
    key: 'site',
    defaultCurrency: 'GHS',
    supportedCurrencies: ['GHS', 'USD', 'EUR'],
    exchangeRateMode,
    ...(rates ? { exchangeRates: { base: 'GHS', rates, updatedAt: new Date() } } : {}),
  });
}

afterEach(() => setLiveRatesFetcher(null));

const list = async (params: Record<string, string>) =>
  (await listPublicVehicles(publicVehicleQuery.parse(params))).items.map((v) => (v as { slug: string }).slug);

describe('price filters across currencies (real MongoDB)', () => {
  beforeEach(async () => {
    await Vehicle.deleteMany({});
    await Vehicle.insertMany([
      car('ghs-150k', 150_000, 'GHS', '2026-01-04'),
      car('usd-10k', 10_000, 'USD', '2026-01-03'), // = GHS 160,000 at 1 GHS = 0.0625 USD
      car('eur-9k', 9_000, 'EUR', '2026-01-02'), // no EUR rate configured
      car('ghs-300k', 300_000, 'GHS', '2026-01-01'),
    ]);
    await setRates({ USD: 0.0625 });
  });

  it('matches foreign-currency listings by their converted price', async () => {
    expect(await list({ maxPrice: '200000' })).toEqual(['ghs-150k', 'usd-10k']);
    expect(await list({ minPrice: '155000' })).toEqual(['usd-10k', 'ghs-300k']);
  });

  it('never guesses a price for currencies without a configured rate', async () => {
    expect(await list({ minPrice: '0' })).not.toContain('eur-9k');
    await setRates(null);
    expect(await list({ maxPrice: '1000000' })).toEqual(['ghs-150k', 'ghs-300k']);
  });

  it('sorts by comparable price, with unconvertible listings last', async () => {
    expect(await list({ sort: 'price_asc' })).toEqual(['ghs-150k', 'usd-10k', 'ghs-300k', 'eur-9k']);
    expect(await list({ sort: 'price_desc' })).toEqual(['ghs-300k', 'usd-10k', 'ghs-150k', 'eur-9k']);
  });

  it('paginates and counts filtered results', async () => {
    const page = await listPublicVehicles(publicVehicleQuery.parse({ maxPrice: '200000', limit: '1', page: '2' }));
    expect(page.total).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.items.map((v) => (v as { slug: string }).slug)).toEqual(['usd-10k']);
  });

  it('keeps the newest-first listing unchanged when no price is involved', async () => {
    expect(await list({})).toEqual(['ghs-150k', 'usd-10k', 'eur-9k', 'ghs-300k']);
  });

  it('reports the facet price range in the default currency', async () => {
    const facets = await getPublicFacets();
    expect(facets.price).toEqual({ min: 150_000, max: 300_000 });
  });

  it('accepts a price range typed in the visitor’s currency', async () => {
    // USD 9,500 = GHS 152,000, so the USD 10k car (GHS 160,000) is just out of range.
    expect(await list({ maxPrice: '9500', priceCurrency: 'USD' })).toEqual(['ghs-150k']);
    expect(await list({ minPrice: '9500', maxPrice: '10000', priceCurrency: 'USD' })).toEqual(['usd-10k']);
  });

  it('refuses a range in a currency it has no rate for instead of guessing', async () => {
    await expect(listPublicVehicles(publicVehicleQuery.parse({ maxPrice: '9000', priceCurrency: 'EUR' }))).rejects.toMatchObject({ status: 400 });
  });
});

describe('live exchange rates', () => {
  const liveResponse = (rates: Record<string, number>) => ({
    result: 'success',
    base_code: 'GHS',
    time_last_update_unix: Math.floor(Date.now() / 1000) - 3600,
    rates: { GHS: 1, ...rates, JPY: 10 },
  });

  beforeEach(async () => {
    await Vehicle.deleteMany({});
    await Vehicle.insertMany([car('ghs-150k', 150_000, 'GHS', '2026-01-04'), car('usd-10k', 10_000, 'USD', '2026-01-03'), car('eur-9k', 9_000, 'EUR', '2026-01-02')]);
  });

  it('uses market rates for filters and the public settings in live mode', async () => {
    setLiveRatesFetcher(async () => liveResponse({ USD: 0.05, EUR: 0.045 }));
    await setRates({ USD: 0.0625 }, 'live');
    // Live: USD 10k = GHS 200,000; EUR 9k = GHS 200,000. The owner's 0.0625 is not used.
    expect(await list({ maxPrice: '180000' })).toEqual(['ghs-150k']);
    expect(await list({ minPrice: '190000' })).toEqual(['usd-10k', 'eur-9k']);

    const settings = await serializePublicSettings((await SiteSettings.findOne().lean())!);
    expect(settings.exchangeRates).toMatchObject({ base: 'GHS', rates: { USD: 0.05, EUR: 0.045 }, source: 'ExchangeRate-API' });
    expect(settings.exchangeRates?.rates).not.toHaveProperty('JPY');
    expect(settings.exchangeRates?.updatedAt).toBeDefined();
  });

  it('falls back to the owner’s rates while the provider is down', async () => {
    setLiveRatesFetcher(async () => {
      throw new Error('offline');
    });
    await setRates({ USD: 0.0625 }, 'live');
    expect(await list({ maxPrice: '170000' })).toEqual(['ghs-150k', 'usd-10k']);
    await setRates(null, 'live');
    expect((await serializePublicSettings((await SiteSettings.findOne().lean())!)).exchangeRates).toBeUndefined();
  });

  it('rejects malformed or stale provider data', async () => {
    setLiveRatesFetcher(async () => ({ result: 'error', 'error-type': 'unsupported-code' }));
    await setRates(null, 'live');
    expect((await serializePublicSettings((await SiteSettings.findOne().lean())!)).exchangeRates).toBeUndefined();

    setLiveRatesFetcher(async () => ({ ...liveResponse({ USD: 0.05 }), time_last_update_unix: Math.floor(Date.now() / 1000) - 10 * 86400 }));
    expect((await serializePublicSettings((await SiteSettings.findOne().lean())!)).exchangeRates).toBeUndefined();
  });

  it('ignores live rates in manual mode', async () => {
    setLiveRatesFetcher(async () => liveResponse({ USD: 0.05 }));
    await setRates({ USD: 0.0625 }, 'manual');
    const settings = await serializePublicSettings((await SiteSettings.findOne().lean())!);
    expect(settings.exchangeRates?.rates).toEqual({ USD: 0.0625 });
  });

  it('fetches once and serves from cache', async () => {
    let calls = 0;
    setLiveRatesFetcher(async () => {
      calls += 1;
      return liveResponse({ USD: 0.05 });
    });
    await setRates(null, 'live');
    await Promise.all([list({ maxPrice: '300000' }), list({ sort: 'price_asc' }), getPublicFacets()]);
    expect(calls).toBe(1);
  });
});

describe('pricingContext', () => {
  it('ignores rates saved against a different base currency', () => {
    const ctx = pricingContext({ defaultCurrency: 'USD', exchangeRates: { base: 'GHS', rates: new Map([['USD', 0.0625]]) } });
    expect(ctx.rates).toEqual({});
    expect(priceInBase(100, 'GHS', ctx)).toBeNull();
    expect(priceInBase(100, 'USD', ctx)).toBe(100);
  });
});
