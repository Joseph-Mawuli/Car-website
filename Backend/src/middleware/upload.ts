import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../lib/errors.js';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

/** Some browsers (notably on Windows) report HEIC files with an empty or generic MIME type. */
function looksLikeHeicName(name: string): boolean {
  return /\.(heic|heif)$/i.test(name);
}

/**
 * Files are held in memory only long enough to validate and process them;
 * the declared MIME type is a first filter and the real format is re-checked from the bytes.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 10, fields: 10, parts: 20 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype) ||
      (['', 'application/octet-stream'].includes(file.mimetype) && looksLikeHeicName(file.originalname));
    if (allowed) cb(null, true);
    else cb(badRequest('Only JPEG, PNG, WebP or HEIC photos can be uploaded.'));
  },
});
