import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, VEHICLE_ID } from './helpers.js';

vi.mock('../src/services/enquiryService.js', () => ({
  createEnquiry: vi.fn(async () => ({ id: 'enquiry-1' })),
}));

vi.mock('../src/services/vehicleService.js', () => ({
  listPublicVehicles: vi.fn(async () => ({ items: [], page: 1, limit: 12, total: 0, totalPages: 1 })),
  getPublicFacets: vi.fn(async () => ({ makes: [] })),
  getPublicVehicleBySlug: vi.fn(async () => ({ vehicle: { id: VEHICLE_ID }, related: [] })),
}));

const enquiryService = await import('../src/services/enquiryService.js');
const vehicleService = await import('../src/services/vehicleService.js');

const valid = {
  name: 'Ama Mensah',
  phone: '+233 24 123 4567',
  email: 'ama@example.com',
  message: 'Is this vehicle still available for viewing?',
  consent: true,
};

beforeEach(() => vi.clearAllMocks());

describe('public enquiries', () => {
  it('accepts a valid enquiry', async () => {
    const res = await request(buildTestApp()).post('/api/v1/enquiries').send({ ...valid, vehicleId: VEHICLE_ID });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'enquiry-1' });
    expect(enquiryService.createEnquiry).toHaveBeenCalledOnce();
  });

  it('validates server-side regardless of the frontend', async () => {
    const res = await request(buildTestApp()).post('/api/v1/enquiries').send({ name: 'A', phone: 'abc', message: 'hi', consent: true });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['name', 'phone', 'message']));
    expect(enquiryService.createEnquiry).not.toHaveBeenCalled();
  });

  it('requires privacy consent', async () => {
    const res = await request(buildTestApp()).post('/api/v1/enquiries').send({ ...valid, consent: false });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('consent');
  });

  it('rejects an invalid vehicle reference', async () => {
    const res = await request(buildTestApp()).post('/api/v1/enquiries').send({ ...valid, vehicleId: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('rate-limits repeated submissions from one client', async () => {
    const app = buildTestApp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await request(app).post('/api/v1/enquiries').send(valid)).status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('rejects oversized JSON bodies', async () => {
    const res = await request(buildTestApp()).post('/api/v1/enquiries').send({ ...valid, message: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });
});

describe('public vehicle API', () => {
  it('validates query parameters', async () => {
    const res = await request(buildTestApp()).get('/api/v1/vehicles?sort=drop_table');
    expect(res.status).toBe(400);
  });

  it('caps page size', async () => {
    const res = await request(buildTestApp()).get('/api/v1/vehicles?limit=5000');
    expect(res.status).toBe(400);
  });

  it('passes valid filters to the service', async () => {
    const res = await request(buildTestApp()).get('/api/v1/vehicles?make=Toyota&minPrice=1000&sort=price_asc&availability=sold');
    expect(res.status).toBe(200);
    expect(vehicleService.listPublicVehicles).toHaveBeenCalledWith(expect.objectContaining({ make: 'Toyota', minPrice: 1000, sort: 'price_asc', availability: 'sold' }));
  });

  it('rejects slugs with unexpected characters', async () => {
    const res = await request(buildTestApp()).get('/api/v1/vehicles/..%2F..%2Fetc');
    expect(res.status).toBe(400);
  });

  it('does not expose admin data publicly', async () => {
    const app = buildTestApp();
    for (const path of ['/api/v1/admin/enquiries', '/api/v1/admin/staff', '/api/v1/admin/settings']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    expect((await request(app).get('/api/v1/enquiries')).status).toBe(404);
  });
});

describe('HTTP hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(buildTestApp()).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('only grants CORS to configured origins', async () => {
    const app = buildTestApp();
    const allowed = await request(app).get('/api/v1/vehicles').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app).get('/api/v1/vehicles').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 503 when the database is unavailable', async () => {
    const { createApp } = await import('../src/app.js');
    const app = createApp({ isDatabaseReady: () => false, auth: { verifyIdToken: async () => ({ uid: 'x' }), findStaffByUid: async () => null } });
    const res = await request(app).get('/api/v1/vehicles');
    expect(res.status).toBe(503);
  });

  it('still serves default settings with live rates while the database is down', async () => {
    const { createApp } = await import('../src/app.js');
    const { setLiveRatesFetcher } = await import('../src/services/liveRates.js');
    setLiveRatesFetcher(async () => ({
      result: 'success',
      base_code: 'GHS',
      time_last_update_unix: Math.floor(Date.now() / 1000),
      rates: { USD: 0.085, NGN: 130, AED: 0.31 },
    }));
    try {
      const app = createApp({ isDatabaseReady: () => false, auth: { verifyIdToken: async () => ({ uid: 'x' }), findStaffByUid: async () => null } });
      const res = await request(app).get('/api/v1/settings/public');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toMatchObject({ defaultCurrency: 'GHS', exchangeRateMode: 'live', exchangeRates: { base: 'GHS', rates: { USD: 0.085, NGN: 130, AED: 0.31 } } });
      expect(res.body.supportedCurrencies).toEqual(['GHS', 'USD', 'EUR', 'GBP', 'CAD', 'NGN', 'CNY', 'AED']);
    } finally {
      setLiveRatesFetcher(null);
    }
  });
});
