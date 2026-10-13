import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { SiteSettings, type SiteLogoRecord } from '../models/SiteSettings.js';
import { badRequest } from '../lib/errors.js';
import { deleteStoredImages, isHeic } from './imageService.js';
import { getSettingsRecord, serializeAdminSettings } from './settingsService.js';
import { getStorage } from './storage.js';

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 400;
const MIN_SIDE = 48;

/**
 * Logos keep their transparency, so they're stored as lossless-alpha WebP rather than JPEG.
 * The real format is checked from the bytes and all metadata is stripped.
 */
export async function processLogo(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (isHeic(input)) throw badRequest('Logos must be PNG, JPEG or WebP. PNG with a transparent background works best.');
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw badRequest('This file is not a valid image.');
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw badRequest('Logos must be PNG, JPEG or WebP. PNG with a transparent background works best.');
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE) {
    throw badRequest(`The logo must be at least ${MIN_SIDE} pixels tall and wide.`);
  }
  const out = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, width: out.info.width, height: out.info.height };
}

function logoFiles(logo: SiteLogoRecord) {
  return [{ key: logo.key, source: logo.source, variants: {} }];
}

export async function setLogo(file: Express.Multer.File) {
  const processed = await processLogo(file.buffer);
  const previous = (await getSettingsRecord()).logo;

  const storage = getStorage();
  const key = `branding/logo-${randomUUID()}.webp`;
  await storage.put(key, processed.buffer, 'image/webp');
  const logo: SiteLogoRecord = {
    key,
    url: storage.publicUrl(key),
    source: storage.source,
    width: processed.width,
    height: processed.height,
    uploadedAt: new Date(),
  };

  let doc;
  try {
    doc = await SiteSettings.findOneAndUpdate({ key: 'site' }, { $set: { logo } }, { returnDocument: 'after', upsert: true }).lean();
  } catch (err) {
    await deleteStoredImages(logoFiles(logo), 'logo upload rollback');
    throw err;
  }
  if (previous) await deleteStoredImages(logoFiles(previous), 'logo replaced');
  return serializeAdminSettings(doc!);
}

export async function removeLogo() {
  const previous = (await getSettingsRecord()).logo;
  const doc = await SiteSettings.findOneAndUpdate(
    { key: 'site' },
    { $unset: { logo: '' }, $set: { logoIncludesName: false } },
    { returnDocument: 'after', upsert: true },
  ).lean();
  if (previous) await deleteStoredImages(logoFiles(previous), 'logo removed');
  return serializeAdminSettings(doc!);
}
