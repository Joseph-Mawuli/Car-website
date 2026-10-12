import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, ENQUIRY_ID, IMAGE_ID, STAFF_ID, VEHICLE_ID } from './helpers.js';

const fakeVehicle = {
  id: VEHICLE_ID,
  title: '2020 Test Car',
  price: 1,
  currency: 'GHS',
  availabilityStatus: 'available',
  visibility: 'published',
};

vi.mock('../src/services/vehicleService.js', () => ({
  listAdminVehicles: vi.fn(async () => ({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 })),
  getAdminVehicle: vi.fn(async () => fakeVehicle),
  createVehicle: vi.fn(async () => fakeVehicle),
  updateVehicle: vi.fn(async () => fakeVehicle),
  setVisibility: vi.fn(async () => fakeVehicle),
  deleteVehicle: vi.fn(async () => ({ title: '2020 Test Car' })),
  vehicleCounts: vi.fn(async () => ({ total: 0, available: 0, reserved: 0, sold: 0, draft: 0, archived: 0 })),
  recentVehicleUpdates: vi.fn(async () => []),
}));

vi.mock('../src/services/imageService.js', () => ({
  uploadVehicleImages: vi.fn(async () => []),
  replaceVehicleImage: vi.fn(async () => ({})),
  deleteVehicleImage: vi.fn(async () => undefined),
  reorderVehicleImages: vi.fn(async () => undefined),
  updateImageAlt: vi.fn(async () => undefined),
}));

const fakeEnquiry = { id: ENQUIRY_ID, status: 'new', notes: [] };
vi.mock('../src/services/enquiryService.js', () => ({
  listEnquiries: vi.fn(async () => ({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 })),
  getEnquiry: vi.fn(async () => fakeEnquiry),
  updateEnquiry: vi.fn(async () => fakeEnquiry),
  addEnquiryNote: vi.fn(async () => fakeEnquiry),
  enquiryCounts: vi.fn(async () => ({ new: 0, total: 0 })),
  recentEnquiries: vi.fn(async () => []),
  createEnquiry: vi.fn(async () => ({ id: ENQUIRY_ID })),
}));

const fakeStaff = { id: STAFF_ID, email: 'x@test.local', displayName: 'X', role: 'sales_assistant', status: 'active', createdAt: new Date().toISOString() };
vi.mock('../src/services/staffService.js', () => ({
  touchLastLogin: vi.fn(async () => undefined),
  getStaffMember: vi.fn(async () => fakeStaff),
  listStaff: vi.fn(async () => []),
  inviteStaff: vi.fn(async () => ({ staff: fakeStaff, delivery: { method: 'smtp', emailed: true } })),
  updateStaff: vi.fn(async () => ({ before: fakeStaff, after: fakeStaff })),
  resendSetupLink: vi.fn(async () => ({ email: fakeStaff.email, delivery: { method: 'smtp', emailed: true } })),
  assignableStaff: vi.fn(async () => []),
}));

vi.mock('../src/services/settingsService.js', () => ({
  getSettingsRecord: vi.fn(async () => ({ dealershipName: 'Goddel Motors', defaultCurrency: 'GHS', supportedCurrencies: ['GHS'] })),
  serializeAdminSettings: vi.fn(async (s: object) => s),
  serializePublicSettings: vi.fn(async (s: object) => s),
  defaultSettingsRecord: vi.fn(() => ({ dealershipName: 'Goddel Motors', defaultCurrency: 'GHS', supportedCurrencies: ['GHS'] })),
  updateSettings: vi.fn(async () => ({ settings: {}, ratesChanged: false, modeChanged: false })),
}));

vi.mock('../src/services/auditService.js', () => ({
  recordAudit: vi.fn(async () => undefined),
  listAuditLogs: vi.fn(async () => ({ items: [], page: 1, limit: 30, total: 0, totalPages: 1 })),
}));

const vehicleService = await import('../src/services/vehicleService.js');
const imageService = await import('../src/services/imageService.js');
const enquiryService = await import('../src/services/enquiryService.js');
const staffService = await import('../src/services/staffService.js');

const app = buildTestApp();
const validVehicle = { make: 'Toyota', model: 'Corolla', year: 2020, price: 150000, currency: 'GHS' };
const settingsBody = { dealershipName: 'Goddel Motors', defaultCurrency: 'GHS', supportedCurrencies: ['GHS'] };

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
interface Case {
  method: Method;
  path: string;
  body?: object;
}

const CASES: Record<string, Case> = {
  dashboard: { method: 'get', path: '/api/v1/admin/dashboard' },
  listVehicles: { method: 'get', path: '/api/v1/admin/vehicles' },
  createVehicle: { method: 'post', path: '/api/v1/admin/vehicles', body: validVehicle },
  updateVehicle: { method: 'patch', path: `/api/v1/admin/vehicles/${VEHICLE_ID}`, body: { price: 1, version: 0 } },
  archiveViaPatch: { method: 'patch', path: `/api/v1/admin/vehicles/${VEHICLE_ID}`, body: { visibility: 'archived', version: 0 } },
  archiveVehicle: { method: 'post', path: `/api/v1/admin/vehicles/${VEHICLE_ID}/archive` },
  deleteVehicle: { method: 'delete', path: `/api/v1/admin/vehicles/${VEHICLE_ID}` },
  reorderImages: { method: 'put', path: `/api/v1/admin/vehicles/${VEHICLE_ID}/images/order`, body: { imageIds: [IMAGE_ID] } },
  deleteImage: { method: 'delete', path: `/api/v1/admin/vehicles/${VEHICLE_ID}/images/${IMAGE_ID}` },
  listEnquiries: { method: 'get', path: '/api/v1/admin/enquiries' },
  updateEnquiryStatus: { method: 'patch', path: `/api/v1/admin/enquiries/${ENQUIRY_ID}`, body: { status: 'contacted' } },
  assignEnquiry: { method: 'patch', path: `/api/v1/admin/enquiries/${ENQUIRY_ID}`, body: { assignedTo: STAFF_ID } },
  addNote: { method: 'post', path: `/api/v1/admin/enquiries/${ENQUIRY_ID}/notes`, body: { body: 'Called back' } },
  listStaff: { method: 'get', path: '/api/v1/admin/staff' },
  inviteStaff: { method: 'post', path: '/api/v1/admin/staff', body: { email: 'new@test.local', displayName: 'New Person', role: 'sales_assistant' } },
  changeRole: { method: 'patch', path: `/api/v1/admin/staff/${STAFF_ID}`, body: { role: 'owner' } },
  getSettings: { method: 'get', path: '/api/v1/admin/settings' },
  putSettings: { method: 'put', path: '/api/v1/admin/settings', body: settingsBody },
  auditLogs: { method: 'get', path: '/api/v1/admin/audit-logs' },
};

/** Expected access per role — mirrors the spec's role definitions. */
const MATRIX: Record<'owner-token' | 'inventory-token' | 'sales-token', (keyof typeof CASES)[]> = {
  'owner-token': Object.keys(CASES) as (keyof typeof CASES)[],
  'inventory-token': ['dashboard', 'listVehicles', 'createVehicle', 'updateVehicle', 'reorderImages', 'deleteImage'],
  'sales-token': ['dashboard', 'listVehicles', 'listEnquiries', 'updateEnquiryStatus', 'addNote'],
};

function send(c: Case, token?: string) {
  let req = request(app)[c.method](c.path);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  return c.body ? req.send(c.body) : req;
}

beforeEach(() => vi.clearAllMocks());

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/admin/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('rejects malformed authorization headers', async () => {
    const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('rejects invalid tokens', async () => {
    const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer forged.token.value');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
  });

  it('reports expired sessions distinctly', async () => {
    const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer expired-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('session_expired');
  });

  it('rejects valid Firebase users who are not staff', async () => {
    const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer stranger-token');
    expect(res.status).toBe(403);
  });

  it('rejects disabled staff even with a valid token', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', 'Bearer disabled-token');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/disabled/i);
  });

  it('returns the profile and role permissions for active staff', async () => {
    const res = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer sales-token');
    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('enquiries:read');
    expect(res.body.permissions).not.toContain('vehicles:write');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it.each(Object.entries(CASES))('blocks anonymous access to %s', async (_name, c) => {
    const res = await send(c);
    expect(res.status).toBe(401);
  });
});

describe('role-based authorization', () => {
  for (const [token, allowed] of Object.entries(MATRIX)) {
    for (const [name, c] of Object.entries(CASES)) {
      const shouldAllow = allowed.includes(name as keyof typeof CASES);
      it(`${token.replace('-token', '')} ${shouldAllow ? 'CAN' : 'cannot'} ${name}`, async () => {
        const res = await send(c, token);
        if (shouldAllow) {
          expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
        } else {
          expect(res.status).toBe(403);
        }
      });
    }
  }

  it('does not run write services when access is denied', async () => {
    await send(CASES.createVehicle, 'sales-token');
    await send(CASES.deleteVehicle, 'inventory-token');
    await send(CASES.inviteStaff, 'inventory-token');
    expect(vehicleService.createVehicle).not.toHaveBeenCalled();
    expect(vehicleService.deleteVehicle).not.toHaveBeenCalled();
    expect(staffService.inviteStaff).not.toHaveBeenCalled();
  });

  it('rejects photo uploads from sales assistants before parsing any file', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/vehicles/${VEHICLE_ID}/images`)
      .set('Authorization', 'Bearer sales-token')
      .attach('photos', Buffer.from('not really an image'), 'car.jpg');
    expect(res.status).toBe(403);
    expect(imageService.uploadVehicleImages).not.toHaveBeenCalled();
  });

  it('allows inventory managers to upload photos', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/vehicles/${VEHICLE_ID}/images`)
      .set('Authorization', 'Bearer inventory-token')
      .attach('photos', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'car.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    expect(imageService.uploadVehicleImages).toHaveBeenCalledOnce();
  });

  it('accepts iPhone HEIC uploads, including ones sent with a generic MIME type', async () => {
    for (const contentType of ['image/heic', 'application/octet-stream']) {
      const res = await request(app)
        .post(`/api/v1/admin/vehicles/${VEHICLE_ID}/images`)
        .set('Authorization', 'Bearer inventory-token')
        .attach('photos', Buffer.from('....ftypheic'), { filename: 'IMG_0001.HEIC', contentType });
      expect(res.status).toBe(201);
    }
  });

  it('does not accept generic binary uploads without a photo file name', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/vehicles/${VEHICLE_ID}/images`)
      .set('Authorization', 'Bearer owner-token')
      .attach('photos', Buffer.from('MZ'), { filename: 'tool.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
  });

  it('rejects non-image uploads by MIME type', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/vehicles/${VEHICLE_ID}/images`)
      .set('Authorization', 'Bearer owner-token')
      .attach('photos', Buffer.from('<?php echo 1; ?>'), { filename: 'shell.php', contentType: 'application/x-php' });
    expect(res.status).toBe(400);
    expect(imageService.uploadVehicleImages).not.toHaveBeenCalled();
  });

  it('only lets sales assistants change status, not assignment, in one request', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${ENQUIRY_ID}`)
      .set('Authorization', 'Bearer sales-token')
      .send({ status: 'closed', assignedTo: null });
    expect(res.status).toBe(403);
    expect(enquiryService.updateEnquiry).not.toHaveBeenCalled();
  });
});

describe('admin input validation', () => {
  it('rejects invalid vehicle data with field details', async () => {
    const res = await request(app)
      .post('/api/v1/admin/vehicles')
      .set('Authorization', 'Bearer owner-token')
      .send({ make: '', model: 'X', year: 1800, price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('make');
    expect(res.body.error.details).toHaveProperty('year');
    expect(res.body.error.details).toHaveProperty('price');
  });

  it('requires a version for vehicle updates (optimistic concurrency)', async () => {
    const res = await request(app).patch(`/api/v1/admin/vehicles/${VEHICLE_ID}`).set('Authorization', 'Bearer owner-token').send({ price: 10 });
    expect(res.status).toBe(400);
  });

  it('rejects malformed IDs', async () => {
    const res = await request(app).get('/api/v1/admin/vehicles/not-an-id').set('Authorization', 'Bearer owner-token');
    expect(res.status).toBe(400);
  });

  it('rejects NoSQL operator injection in IDs and bodies', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${ENQUIRY_ID}`)
      .set('Authorization', 'Bearer owner-token')
      .send({ status: { $ne: 'closed' } });
    expect(res.status).toBe(400);
  });
});
