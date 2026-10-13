import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getStorage, MongoStorage } from '../src/services/storage.js';
import { deleteStoredImages, processImage } from '../src/services/imageService.js';
import { PendingDeletion } from '../src/models/PendingDeletion.js';
import { serializeImage } from '../src/services/serializers.js';
import { buildTestApp } from './helpers.js';

let mongo: MongoMemoryServer;
const app = buildTestApp();
const storage = getStorage('mongodb') as MongoStorage;

const FOLDER = 'vehicles/64c000000000000000000001/1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const files = () => mongoose.connection.db!.collection('vehicleImages.files');

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await files().deleteMany({});
  await mongoose.connection.db!.collection('vehicleImages.chunks').deleteMany({});
});

// The first GridFS write builds its indexes and sharp warms up, which is slow while other suites run in parallel.
describe('MongoDB photo storage (GridFS)', { timeout: 30_000 }, () => {
  it('is used for photos recorded with source "mongodb" and builds links to the media route', () => {
    expect(storage).toBeInstanceOf(MongoStorage);
    expect(storage.publicUrl(`${FOLDER}/960.webp`)).toBe(`http://localhost:4000/api/v1/media/${FOLDER}/960.webp`);
  });

  it('stores processed photos and serves them with long-lived caching', async () => {
    const input = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#336699' } }).jpeg().toBuffer();
    const processed = await processImage(input);
    await storage.put(`${FOLDER}/original.jpg`, processed.original.buffer, 'image/jpeg');
    await storage.put(`${FOLDER}/960.webp`, processed.variants.medium.buffer, 'image/webp');

    const res = await request(app).get(`/api/v1/media/${FOLDER}/960.webp`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toContain('immutable');
    expect((res.body as Buffer).equals(processed.variants.medium.buffer)).toBe(true);
    expect((await sharp(res.body as Buffer).metadata()).width).toBe(960);
  });

  it('replaces a file stored under the same key instead of keeping duplicates', async () => {
    await storage.put(`${FOLDER}/480.webp`, Buffer.from('first'), 'image/webp');
    expect((await storage.open(`${FOLDER}/480.webp`))?.data.toString()).toBe('first');
    await storage.put(`${FOLDER}/480.webp`, Buffer.from('second'), 'image/webp');
    expect(await files().countDocuments({ filename: `${FOLDER}/480.webp` })).toBe(1);
    expect((await storage.open(`${FOLDER}/480.webp`))?.data.toString()).toBe('second');
  });

  it('serves repeat requests from memory and stops serving a photo once it is deleted', async () => {
    const key = `${FOLDER}/960.webp`;
    await storage.put(key, Buffer.from('cached'), 'image/webp');
    expect((await storage.open(key))?.data.toString()).toBe('cached');
    await files().deleteMany({});
    expect((await storage.open(key))?.data.toString()).toBe('cached');
    await storage.deleteMany([key]);
    expect(await storage.open(key)).toBeNull();
  });

  it('returns 404 for unknown photos and for paths the upload pipeline never creates', async () => {
    expect((await request(app).get(`/api/v1/media/${FOLDER}/1600.webp`)).status).toBe(404);
    for (const path of ['vehicles/../../etc/passwd', `${FOLDER}/original.png`, 'staff/secret.json', `${FOLDER}/960.webp/extra`]) {
      expect((await request(app).get(`/api/v1/media/${path}`)).status).toBe(404);
    }
  });

  it('builds photo links from the current API URL, not the link saved at upload time', () => {
    const img = serializeImage({
      _id: new mongoose.Types.ObjectId(),
      key: `${FOLDER}/original.jpg`,
      url: 'http://some-old-host:4000/api/v1/media/old.jpg',
      alt: '',
      sortOrder: 0,
      variants: { thumb: { key: `${FOLDER}/480.webp`, url: 'http://some-old-host:4000/x.webp', width: 480, height: 320 } },
      source: 'mongodb',
      uploadedAt: new Date(),
    });
    expect(img.url).toBe(`http://localhost:4000/api/v1/media/${FOLDER}/original.jpg`);
    expect(img.variants.thumb?.url).toBe(`http://localhost:4000/api/v1/media/${FOLDER}/480.webp`);
  });

  it('builds demo photo links from the current website URL', () => {
    const img = serializeImage({
      _id: new mongoose.Types.ObjectId(),
      key: 'static/demo/demo-suv-1600.webp',
      url: 'http://old-site:5173/images/vehicles/demo/demo-suv-1600.webp',
      alt: '',
      sortOrder: 0,
      variants: { thumb: { key: 'static/demo/demo-suv-480.webp', url: 'http://old-site:5173/x.webp', width: 480, height: 360 } },
      source: 'static',
      uploadedAt: new Date(),
    });
    expect(img.url).toBe('http://localhost:5173/images/vehicles/demo/demo-suv-1600.webp');
    expect(img.variants.thumb?.url).toBe('http://localhost:5173/images/vehicles/demo/demo-suv-480.webp');
  });

  it('deletes photos from MongoDB when they are removed, without touching R2', async () => {
    await storage.put(`${FOLDER}/original.jpg`, Buffer.from('a'), 'image/jpeg');
    await storage.put(`${FOLDER}/480.webp`, Buffer.from('b'), 'image/webp');
    await deleteStoredImages(
      [{ key: `${FOLDER}/original.jpg`, variants: { thumb: { key: `${FOLDER}/480.webp`, url: '', width: 480, height: 320 } }, source: 'mongodb' }],
      'test',
    );
    expect(await files().countDocuments()).toBe(0);
    expect(await PendingDeletion.countDocuments()).toBe(0);
  });
});
