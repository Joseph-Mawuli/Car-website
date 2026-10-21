import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Enquiry } from '../src/models/Enquiry.js';
import { deleteEnquiry, purgeExpiredEnquiries } from '../src/services/enquiryService.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await Enquiry.deleteMany({});
});

const NOW = new Date('2026-10-21T12:00:00Z');
const monthsAgo = (n: number) => new Date(Date.UTC(2026, 9 - n, 21, 12));

/** Inserted directly so `updatedAt` can be backdated. */
async function seed(rows: { name: string; status: string; updatedAt: Date }[]) {
  await Enquiry.collection.insertMany(
    rows.map((r) => ({ ...r, phone: '0241234567', message: 'Is this still available?', consentAt: r.updatedAt, createdAt: r.updatedAt, notes: [] })),
  );
}

describe('enquiry retention (real MongoDB)', { timeout: 30_000 }, () => {
  it('removes only closed enquiries with no activity for longer than the retention period', async () => {
    await seed([
      { name: 'Old closed', status: 'closed', updatedAt: monthsAgo(13) },
      { name: 'Recent closed', status: 'closed', updatedAt: monthsAgo(11) },
      { name: 'Old but still open', status: 'follow_up', updatedAt: monthsAgo(24) },
      { name: 'Old new', status: 'new', updatedAt: monthsAgo(30) },
    ]);

    expect(await purgeExpiredEnquiries(12, NOW)).toBe(1);
    const left = (await Enquiry.find({}, { name: 1 }).lean()).map((e) => e.name).sort();
    expect(left).toEqual(['Old but still open', 'Old new', 'Recent closed']);
  });

  it('keeps everything when the retention period is 0 (keep forever)', async () => {
    await seed([{ name: 'Ancient closed', status: 'closed', updatedAt: monthsAgo(60) }]);
    expect(await purgeExpiredEnquiries(0, NOW)).toBe(0);
    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it('deletes a single enquiry and reports only what it was about', async () => {
    const doc = await Enquiry.create({
      name: 'Kofi Mensah',
      phone: '0241234567',
      message: 'Is this still available?',
      consentAt: new Date(),
      vehicleSnapshot: { title: '2020 Toyota Camry', slug: 'camry', price: 1, currency: 'GHS' },
    });
    expect(await deleteEnquiry(doc._id.toString())).toEqual({ vehicleTitle: '2020 Toyota Camry' });
    expect(await Enquiry.countDocuments()).toBe(0);
    await expect(deleteEnquiry(doc._id.toString())).rejects.toMatchObject({ status: 404 });
  });
});
