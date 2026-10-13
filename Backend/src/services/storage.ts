import type { Readable } from 'node:stream';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import { activeStorageDriver, env, isR2Configured, publicApiUrl } from '../config/env.js';
import { serviceUnavailable } from '../lib/errors.js';

type GridFSBucket = mongoose.mongo.GridFSBucket;

export type StorageSource = 'r2' | 'mongodb';

export interface ObjectStorage {
  readonly source: StorageSource;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteMany(keys: string[]): Promise<{ failed: string[] }>;
  publicUrl(key: string): string;
}

/** Cloudflare R2 through its S3-compatible API. Credentials stay on the server. */
class R2Storage implements ObjectStorage {
  readonly source = 'r2' as const;
  private client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
    });
    this.bucket = env.R2_BUCKET!;
    this.baseUrl = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '');
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are unique per upload, so objects never change and can be cached indefinitely.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async deleteMany(keys: string[]): Promise<{ failed: string[] }> {
    if (keys.length === 0) return { failed: [] };
    const failed: string[] = [];
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      try {
        const res = await this.client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
        );
        for (const e of res.Errors ?? []) if (e.Key) failed.push(e.Key);
      } catch {
        failed.push(...batch);
      }
    }
    return { failed };
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

export const MEDIA_ROUTE_PREFIX = '/api/v1/media';

export function mongoMediaUrl(key: string): string {
  return `${publicApiUrl}${MEDIA_ROUTE_PREFIX}/${key}`;
}

/**
 * Photos stored in MongoDB GridFS and served by this API at `/api/v1/media/<key>`.
 * Uses the existing database connection, so it works wherever the database does.
 */
export class MongoStorage implements ObjectStorage {
  readonly source = 'mongodb' as const;

  private bucket(): GridFSBucket {
    const db = mongoose.connection.db;
    if (!db) throw serviceUnavailable('The database is not connected.', 'database_unavailable');
    return new mongoose.mongo.GridFSBucket(db, { bucketName: 'vehicleImages' });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const bucket = this.bucket();
    this.forget(key);
    for (const existing of await bucket.find({ filename: key }, { projection: { _id: 1 } }).toArray()) {
      await bucket.delete(existing._id);
    }
    await new Promise<void>((resolve, reject) => {
      const upload = bucket.openUploadStream(key, { metadata: { contentType } });
      upload.once('finish', () => resolve());
      upload.once('error', reject);
      upload.end(body);
    });
  }

  async deleteMany(keys: string[]): Promise<{ failed: string[] }> {
    if (keys.length === 0) return { failed: [] };
    for (const key of keys) this.forget(key);
    const failed: string[] = [];
    let bucket: GridFSBucket;
    try {
      bucket = this.bucket();
    } catch {
      return { failed: [...keys] };
    }
    const files = await bucket
      .find({ filename: { $in: keys } }, { projection: { _id: 1, filename: 1 } })
      .toArray()
      .catch(() => null);
    if (!files) return { failed: [...keys] };
    if (files.length === 0) return { failed };
    // Two bulk deletes instead of two round trips per file. Chunks go first so a failure
    // leaves the file record in place and the retry job can still find it.
    const db = mongoose.connection.db!;
    const ids = files.map((f) => f._id);
    try {
      await db.collection('vehicleImages.chunks').deleteMany({ files_id: { $in: ids } });
      await db.collection('vehicleImages.files').deleteMany({ _id: { $in: ids } });
    } catch {
      failed.push(...files.map((f) => f.filename));
    }
    return { failed };
  }

  publicUrl(key: string): string {
    return mongoMediaUrl(key);
  }

  /**
   * Keys are unique per upload, so a stored photo never changes and can be kept in memory.
   * Without this every view costs several database round trips.
   */
  private cache = new Map<string, StoredFile>();
  private cachedBytes = 0;

  private remember(key: string, file: StoredFile) {
    if (file.data.length > MEDIA_CACHE_MAX_FILE_BYTES) return;
    this.cache.set(key, file);
    this.cachedBytes += file.data.length;
    for (const [oldKey, old] of this.cache) {
      if (this.cachedBytes <= MEDIA_CACHE_MAX_BYTES) break;
      this.cache.delete(oldKey);
      this.cachedBytes -= old.data.length;
    }
  }

  private forget(key: string) {
    const old = this.cache.get(key);
    if (!old) return;
    this.cache.delete(key);
    this.cachedBytes -= old.data.length;
  }

  /** Returns the stored file, or null when it doesn't exist. */
  async open(key: string): Promise<StoredFile | null> {
    const hit = this.cache.get(key);
    if (hit) {
      // Re-insert so the Map's insertion order tracks recent use.
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const bucket = this.bucket();
    const file = await bucket.find({ filename: key }).sort({ uploadDate: -1 }).limit(1).next();
    if (!file) return null;
    const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
    const data = await streamToBuffer(bucket.openDownloadStream(file._id));
    const stored = { contentType, data };
    this.remember(key, stored);
    return stored;
  }
}

export interface StoredFile {
  contentType: string;
  data: Buffer;
}

const MEDIA_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const MEDIA_CACHE_MAX_FILE_BYTES = 8 * 1024 * 1024;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

const instances: Partial<Record<StorageSource, ObjectStorage>> = {};

function create(source: StorageSource): ObjectStorage {
  if (source === 'mongodb') return new MongoStorage();
  if (!isR2Configured) {
    throw serviceUnavailable('Photo storage is not configured on the server yet. Add the Cloudflare R2 settings to enable uploads.', 'storage_not_configured');
  }
  return new R2Storage();
}

/**
 * Storage for `source` (where an existing photo lives), or for new uploads when omitted.
 * Photos keep working after switching drivers because each one records its own source.
 */
export function getStorage(source?: StorageSource): ObjectStorage {
  const target = source ?? activeStorageDriver;
  if (!target) {
    throw serviceUnavailable(
      'Photo storage is not configured on the server yet. Add the Cloudflare R2 settings (or set STORAGE_DRIVER=mongodb) to enable uploads.',
      'storage_not_configured',
    );
  }
  return (instances[target] ??= create(target));
}

/** Test hook: replaces the storage used for `source` (defaults to R2). */
export function setStorage(custom: ObjectStorage | null, source: StorageSource = 'r2'): void {
  if (custom) instances[source] = custom;
  else delete instances[source];
}
