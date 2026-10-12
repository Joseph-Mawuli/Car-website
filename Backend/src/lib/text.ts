import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Short random suffix keeps slugs unique without exposing database IDs. */
export function vehicleSlug(parts: { year: number; make: string; model: string; trim?: string | null }): string {
  const base = slugify([parts.year, parts.make, parts.model, parts.trim].filter(Boolean).join(' ')) || 'vehicle';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function vehicleTitle(v: { year: number; make: string; model: string }): string {
  return `${v.year} ${v.make} ${v.model}`;
}
