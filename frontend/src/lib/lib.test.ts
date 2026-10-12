import { describe, expect, it } from 'vitest';
import { availableDisplayCurrencies, convertPrice } from './currency';
import { buildTelLink, buildVehicleWhatsAppMessage, buildWhatsAppLink, normalizeWhatsAppNumber } from './contact';
import { formatMileage, formatPrice } from './format';
import type { ExchangeRates } from '@/types';

const rates: ExchangeRates = { base: 'GHS', rates: { USD: 0.0625 }, updatedAt: '2026-10-01T00:00:00.000Z' };

describe('convertPrice', () => {
  it('returns a labelled estimate using the configured rate', () => {
    expect(convertPrice(160000, 'GHS', 'USD', rates)).toEqual({ amount: 10000, currency: 'USD', isEstimate: true, rateUpdatedAt: rates.updatedAt });
  });

  it('converts from a non-base currency via the base', () => {
    expect(convertPrice(10000, 'USD', 'GHS', rates)?.amount).toBeCloseTo(160000);
  });

  it('never invents a rate when none is configured', () => {
    expect(convertPrice(1000, 'GHS', 'EUR', rates)).toBeNull();
    expect(convertPrice(1000, 'GHS', 'USD', undefined)).toBeNull();
  });

  it('does not "convert" to the same currency', () => {
    expect(convertPrice(1000, 'GHS', 'GHS', rates)).toBeNull();
  });

  it('only offers display currencies that have a rate', () => {
    expect(availableDisplayCurrencies('GHS', ['GHS', 'USD', 'EUR'], rates)).toEqual(['GHS', 'USD']);
  });
});

describe('contact links', () => {
  it('builds wa.me links with digits only and an encoded message', () => {
    expect(normalizeWhatsAppNumber('+233 (24) 123-4567')).toBe('233241234567');
    const link = buildWhatsAppLink('+233 24 123 4567', 'Hi & hello');
    expect(link).toBe('https://wa.me/233241234567?text=Hi%20%26%20hello');
  });

  it('includes the vehicle name and page URL in the WhatsApp message', () => {
    const msg = buildVehicleWhatsAppMessage('2021 Toyota RAV4', 'https://example.com/cars/rav4');
    expect(msg).toContain('2021 Toyota RAV4');
    expect(msg).toContain('https://example.com/cars/rav4');
  });

  it('builds tel links without formatting characters', () => {
    expect(buildTelLink('+233 24 123-4567')).toBe('tel:+233241234567');
  });
});

describe('formatting', () => {
  it('formats prices with the currency code', () => {
    expect(formatPrice(280000, 'GHS')).toBe('GHS 280,000');
  });

  it('omits mileage when unknown', () => {
    expect(formatMileage(undefined, 'km')).toBeUndefined();
    expect(formatMileage(45000, 'km')).toBe('45,000 km');
  });
});
