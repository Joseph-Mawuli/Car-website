import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

export const objectId = z.string().refine((v) => isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v), 'Invalid ID.');

export const idParams = z.object({ id: objectId });

export const pageQuery = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
};

/** Removes ASCII control characters except tab, line feed and carriage return. */
export function stripControlChars(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    const isControl = (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
    if (!isControl) out += ch;
  }
  return out;
}

/** Free text: trimmed, with control characters removed. */
export const cleanText = (max: number) =>
  z
    .string()
    .transform((v) => stripControlChars(v).trim())
    .pipe(z.string().max(max));

export const PHONE_PATTERN = /^\+?[\d\s\-()]{7,20}$/;
