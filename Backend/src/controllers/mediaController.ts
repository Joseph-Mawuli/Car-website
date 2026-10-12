import type { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { getStorage, MongoStorage } from '../services/storage.js';

/** Only keys produced by the upload pipeline can be requested. */
const MEDIA_KEY = /^vehicles\/[a-f0-9]{24}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(?:original\.jpg|\d{2,5}\.webp)$/;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/webp']);

function notFound(res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Photo not found.' } });
}

/** Serves photos stored in MongoDB GridFS (STORAGE_DRIVER=mongodb). */
export async function getMedia(req: Request, res: Response) {
  const raw = (req.params as { key?: string | string[] }).key;
  const key = Array.isArray(raw) ? raw.join('/') : raw;
  if (!key || !MEDIA_KEY.test(key)) return notFound(res);

  const storage = getStorage('mongodb');
  if (!(storage instanceof MongoStorage)) return notFound(res);
  const file = await storage.open(key);
  if (!file || !ALLOWED_TYPES.has(file.contentType)) return notFound(res);

  res.set({
    'Content-Type': file.contentType,
    'Content-Length': String(file.length),
    // Keys are unique per upload, so a stored photo never changes.
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  file.stream.on('error', (error) => {
    logger.warn('Failed to stream stored photo', { key, error });
    if (!res.headersSent) notFound(res);
    else res.destroy();
  });
  file.stream.pipe(res);
}
