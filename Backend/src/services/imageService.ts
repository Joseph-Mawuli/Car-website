import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import heicDecode from 'heic-decode';
import { Types } from 'mongoose';
import { Vehicle, type ImageVariantRecord, type VehicleImageRecord } from '../models/Vehicle.js';
import { PendingDeletion } from '../models/PendingDeletion.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { vehicleTitle } from '../lib/text.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getStorage, type StorageSource } from './storage.js';
import type { StaffPrincipal } from '../middleware/auth.js';
import { serializeImage } from './serializers.js';

const VARIANTS = { thumb: 480, medium: 960, large: 1600 } as const;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 60_000_000;

interface ProcessedImage {
  original: { buffer: Buffer; width: number; height: number };
  variants: Record<keyof typeof VARIANTS, { buffer: Buffer; width: number; height: number }>;
}

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);

/** HEIC/HEIF (iPhone photos) is detected from the ISO-BMFF `ftyp` box, not the file name. */
export function isHeic(input: Buffer): boolean {
  return input.length >= 12 && input.toString('latin1', 4, 8) === 'ftyp' && HEIC_BRANDS.has(input.toString('latin1', 8, 12));
}

/**
 * sharp's prebuilt binaries can't decode HEVC, so HEIC is decoded with libheif (WebAssembly)
 * into raw pixels. Dimensions are checked before decoding to reject decompression bombs.
 * libheif applies the stored rotation/mirroring, and no metadata survives the raw step.
 */
async function decodeHeic(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  let images: Awaited<ReturnType<typeof heicDecode.all>>;
  try {
    images = await heicDecode.all({ buffer: input });
  } catch {
    throw badRequest('This HEIC photo could not be read. Try exporting it as JPEG.');
  }
  try {
    const first = images[0];
    if (!first) throw badRequest('This HEIC file does not contain a photo.');
    if (first.width * first.height > MAX_INPUT_PIXELS) throw badRequest('This photo is too large. Please use a photo under 60 megapixels.');
    let decoded: Awaited<ReturnType<typeof first.decode>>;
    try {
      decoded = await first.decode();
    } catch {
      throw badRequest('This HEIC photo could not be read. Try exporting it as JPEG.');
    }
    return { data: Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength), width: decoded.width, height: decoded.height };
  } finally {
    images.dispose();
  }
}

/**
 * Validates the real file format from its bytes, applies EXIF orientation and strips
 * metadata (including GPS location) before anything is stored.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let width: number | undefined;
  let height: number | undefined;
  let base: () => ReturnType<typeof sharp>;

  if (isHeic(input)) {
    const raw = await decodeHeic(input);
    ({ width, height } = raw);
    base = () => sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 }, limitInputPixels: MAX_INPUT_PIXELS }).removeAlpha();
  } else {
    let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
    try {
      meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
      throw badRequest('One of the files is not a valid image.');
    }
    if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw badRequest('Only JPEG, PNG, WebP or HEIC photos can be uploaded.');
    ({ width, height } = meta);
    base = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  }
  if (!width || !height || width < 400 || height < 300) {
    throw badRequest('Photos must be at least 400 × 300 pixels so buyers can see the vehicle clearly.');
  }

  const original = await base()
    .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const variants = {} as ProcessedImage['variants'];
  for (const [name, width] of Object.entries(VARIANTS) as [keyof typeof VARIANTS, number][]) {
    const out = await base().resize({ width, withoutEnlargement: true }).webp({ quality: name === 'thumb' ? 72 : 80 }).toBuffer({ resolveWithObject: true });
    variants[name] = { buffer: out.data, width: out.info.width, height: out.info.height };
  }
  return { original: { buffer: original.data, width: original.info.width, height: original.info.height }, variants };
}

function imageKeys(img: Pick<VehicleImageRecord, 'key' | 'variants'>): string[] {
  return [img.key, img.variants?.thumb?.key, img.variants?.medium?.key, img.variants?.large?.key].filter((k): k is string => Boolean(k));
}

export async function deleteStoredImages(images: Pick<VehicleImageRecord, 'key' | 'variants' | 'source'>[], reason: string): Promise<void> {
  for (const source of ['r2', 'mongodb'] as const) {
    await deleteKeys(images.filter((img) => img.source === source).flatMap(imageKeys), reason, source);
  }
}

/** Deletes objects from storage; failures are queued for retry rather than silently orphaned. */
async function deleteKeys(keys: string[], reason: string, source: StorageSource): Promise<void> {
  if (keys.length === 0) return;
  let failed: string[] = keys;
  try {
    ({ failed } = await getStorage(source).deleteMany(keys));
  } catch (error) {
    logger.warn('Storage unavailable during image deletion', { error, source });
  }
  if (failed.length) {
    logger.warn('Queued storage objects for deletion retry', { count: failed.length, source });
    await PendingDeletion.bulkWrite(
      failed.map((key) => ({
        updateOne: { filter: { key }, update: { $setOnInsert: { key, source, reason: reason.slice(0, 200) } }, upsert: true },
      })),
    ).catch((error) => logger.error('Failed to queue orphaned objects', { error, keys: failed }));
  }
}

async function storeProcessed(vehicleId: string, processed: ProcessedImage) {
  const storage = getStorage();
  const folder = `vehicles/${vehicleId}/${randomUUID()}`;
  const uploaded: string[] = [];
  try {
    const originalKey = `${folder}/original.jpg`;
    await storage.put(originalKey, processed.original.buffer, 'image/jpeg');
    uploaded.push(originalKey);
    const variants: Partial<Record<keyof typeof VARIANTS, ImageVariantRecord>> = {};
    for (const [name, v] of Object.entries(processed.variants) as [keyof typeof VARIANTS, ProcessedImage['variants']['thumb']][]) {
      const key = `${folder}/${v.width}.webp`;
      await storage.put(key, v.buffer, 'image/webp');
      uploaded.push(key);
      variants[name] = { key, url: storage.publicUrl(key), width: v.width, height: v.height };
    }
    return {
      key: originalKey,
      url: storage.publicUrl(originalKey),
      width: processed.original.width,
      height: processed.original.height,
      size: processed.original.buffer.length,
      mimeType: 'image/jpeg',
      variants,
      uploaded,
      source: storage.source,
    };
  } catch (err) {
    await deleteKeys(uploaded, 'partial upload', storage.source);
    throw err;
  }
}

export async function uploadVehicleImages(vehicleId: string, files: Express.Multer.File[], actor: StaffPrincipal) {
  if (!files.length) throw badRequest('Choose at least one photo to upload.');
  const vehicle = await Vehicle.findById(vehicleId, { images: 1, make: 1, model: 1, year: 1 }).lean();
  if (!vehicle) throw notFound('Vehicle not found.');
  const existing = vehicle.images.length;
  if (existing + files.length > env.MAX_IMAGES_PER_VEHICLE) {
    throw badRequest(`A vehicle can have up to ${env.MAX_IMAGES_PER_VEHICLE} photos. Remove some photos first.`);
  }

  // Process everything first so an invalid file rejects the batch before any upload.
  const processed = [];
  for (const file of files) processed.push(await processImage(file.buffer));

  const title = vehicleTitle(vehicle);
  const nextOrder = vehicle.images.reduce((max, img) => Math.max(max, img.sortOrder + 1), 0);
  const records: VehicleImageRecord[] = [];
  const allUploaded: string[] = [];
  const source = getStorage().source;
  try {
    for (const [i, p] of processed.entries()) {
      const stored = await storeProcessed(vehicleId, p);
      allUploaded.push(...stored.uploaded);
      records.push({
        _id: new Types.ObjectId(),
        key: stored.key,
        url: stored.url,
        alt: `${title} — photo ${existing + i + 1}`,
        sortOrder: nextOrder + i,
        width: stored.width,
        height: stored.height,
        size: stored.size,
        mimeType: stored.mimeType,
        variants: stored.variants,
        source: stored.source,
        uploadedAt: new Date(),
        uploadedBy: new Types.ObjectId(actor.id),
      });
    }

    // Atomic guard against concurrent uploads exceeding the photo limit.
    const updated = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, [`images.${env.MAX_IMAGES_PER_VEHICLE - records.length}`]: { $exists: false } },
      { $push: { images: { $each: records } }, $set: { updatedBy: new Types.ObjectId(actor.id) } },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) throw conflict('The photo limit was reached while uploading. Refresh and try again.');
    return records.map(serializeImage);
  } catch (err) {
    // Keep storage consistent with the database: remove anything we uploaded.
    await deleteKeys(allUploaded, 'upload rollback', source);
    throw err;
  }
}

export async function replaceVehicleImage(vehicleId: string, imageId: string, file: Express.Multer.File, actor: StaffPrincipal) {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, 'images._id': imageId }, { 'images.$': 1 }).lean();
  if (!vehicle) throw notFound('Photo not found.');
  const old = vehicle.images[0];

  const processed = await processImage(file.buffer);
  const stored = await storeProcessed(vehicleId, processed);

  const updated = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, 'images._id': imageId },
    {
      $set: {
        'images.$.key': stored.key,
        'images.$.url': stored.url,
        'images.$.width': stored.width,
        'images.$.height': stored.height,
        'images.$.size': stored.size,
        'images.$.mimeType': stored.mimeType,
        'images.$.variants': stored.variants,
        'images.$.source': stored.source,
        'images.$.uploadedAt': new Date(),
        'images.$.uploadedBy': new Types.ObjectId(actor.id),
        updatedBy: new Types.ObjectId(actor.id),
      },
    },
    { returnDocument: 'after', projection: { images: 1 } },
  ).lean();

  if (!updated) {
    await deleteKeys(stored.uploaded, 'replace rollback', stored.source);
    throw notFound('Photo was removed while uploading.');
  }
  await deleteStoredImages([old], `image ${imageId} replaced`);
  const img = updated.images.find((i) => i._id.toString() === imageId)!;
  return serializeImage(img);
}

export async function deleteVehicleImage(vehicleId: string, imageId: string, actor: StaffPrincipal) {
  const before = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, 'images._id': imageId },
    { $pull: { images: { _id: new Types.ObjectId(imageId) } }, $set: { updatedBy: new Types.ObjectId(actor.id) } },
    { returnDocument: 'before', projection: { images: 1 } },
  ).lean();
  if (!before) throw notFound('Photo not found.');
  const removed = before.images.find((i) => i._id.toString() === imageId);
  if (removed) await deleteStoredImages([removed], `image ${imageId} deleted`);
}

export async function reorderVehicleImages(vehicleId: string, imageIds: string[], actor: StaffPrincipal) {
  const vehicle = await Vehicle.findById(vehicleId, { images: 1 }).lean();
  if (!vehicle) throw notFound('Vehicle not found.');
  const current = new Set(vehicle.images.map((i) => i._id.toString()));
  if (imageIds.length !== current.size || new Set(imageIds).size !== imageIds.length || !imageIds.every((id) => current.has(id))) {
    throw conflict('The photo list has changed. Refresh and try again.');
  }
  const order = new Map(imageIds.map((id, i) => [id, i]));
  const reordered = vehicle.images.map((img) => ({ ...img, sortOrder: order.get(img._id.toString())! }));
  const res = await Vehicle.updateOne(
    { _id: vehicleId, images: { $size: current.size }, 'images._id': { $all: [...current].map((id) => new Types.ObjectId(id)) } },
    { $set: { images: reordered, updatedBy: new Types.ObjectId(actor.id) } },
  );
  if (res.matchedCount === 0) throw conflict('The photo list has changed. Refresh and try again.');
}

export async function updateImageAlt(vehicleId: string, imageId: string, alt: string, actor: StaffPrincipal) {
  const res = await Vehicle.updateOne(
    { _id: vehicleId, 'images._id': imageId },
    { $set: { 'images.$.alt': alt, updatedBy: new Types.ObjectId(actor.id) } },
  );
  if (res.matchedCount === 0) throw notFound('Photo not found.');
}
