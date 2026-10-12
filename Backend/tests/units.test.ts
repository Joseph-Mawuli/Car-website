import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/lib/permissions.js';
import { escapeHtml, escapeRegex, vehicleSlug } from '../src/lib/text.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isHeic, processImage } from '../src/services/imageService.js';

/** Public sample image from the libheif project (strukturag/libheif, examples/example.heic). */
const HEIC_FIXTURE = fileURLToPath(new URL('./fixtures/sample.heic', import.meta.url));
import { createEnquiry } from '../src/services/enquiryService.js';
import { createEnquirySchema } from '../src/schemas/enquiry.js';
import { updateSettingsSchema } from '../src/schemas/settings.js';
import { stripControlChars } from '../src/schemas/common.js';

describe('role permissions', () => {
  it('gives the owner every permission', () => {
    expect(ROLE_PERMISSIONS.owner).toContain('staff:manage');
    expect(ROLE_PERMISSIONS.owner).toContain('settings:manage');
    expect(ROLE_PERMISSIONS.owner).toContain('vehicles:delete');
  });

  it('keeps inventory managers away from staff, settings and enquiries', () => {
    for (const p of ['staff:manage', 'settings:manage', 'audit:read', 'enquiries:read', 'vehicles:delete', 'vehicles:archive'] as const) {
      expect(hasPermission('inventory_manager', p)).toBe(false);
    }
    expect(hasPermission('inventory_manager', 'vehicles:write')).toBe(true);
    expect(hasPermission('inventory_manager', 'vehicles:images')).toBe(true);
  });

  it('limits sales assistants to enquiries and read-only inventory', () => {
    expect(hasPermission('sales_assistant', 'enquiries:update')).toBe(true);
    expect(hasPermission('sales_assistant', 'enquiries:assign')).toBe(false);
    for (const p of ['vehicles:write', 'vehicles:images', 'staff:manage', 'settings:manage'] as const) {
      expect(hasPermission('sales_assistant', p)).toBe(false);
    }
  });
});

describe('text helpers', () => {
  it('creates readable, unique slugs', () => {
    const a = vehicleSlug({ year: 2022, make: 'Toyota', model: 'RAV4', trim: 'XLE Premium' });
    const b = vehicleSlug({ year: 2022, make: 'Toyota', model: 'RAV4', trim: 'XLE Premium' });
    expect(a).toMatch(/^2022-toyota-rav4-xle-premium-[a-f0-9]{6}$/);
    expect(a).not.toBe(b);
  });

  it('escapes regex and HTML', () => {
    expect(new RegExp(escapeRegex('a.*b')).test('aXXb')).toBe(false);
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });
});

describe('spam protection', () => {
  const base = createEnquirySchema.parse({ name: 'Bot', phone: '0241234567', message: 'Buy cheap things now!!', consent: true });

  it('silently discards honeypot submissions without touching the database', async () => {
    const res = await createEnquiry({ ...base, website: 'http://spam.example' }, '1.2.3.4');
    expect(res.id).toMatch(/^[a-f0-9]{24}$/);
  });

  it('silently discards forms submitted impossibly fast', async () => {
    const res = await createEnquiry({ ...base, startedAt: Date.now() - 200 }, '1.2.3.4');
    expect(res.id).toMatch(/^[a-f0-9]{24}$/);
  });
});

describe('free text cleaning', () => {
  it('strips control characters but keeps line breaks and tabs', () => {
    expect(stripControlChars('a\u0000b\u0007c\u007Fd\n\te')).toBe('abcd\n\te');
  });
});

describe('settings validation', () => {
  it('requires the default currency to be supported', () => {
    const r = updateSettingsSchema.safeParse({ dealershipName: 'G', defaultCurrency: 'USD', supportedCurrencies: ['GHS'] });
    expect(r.success).toBe(false);
  });

  it('rejects non-https social links and invalid rates', () => {
    expect(updateSettingsSchema.safeParse({ dealershipName: 'G', defaultCurrency: 'GHS', supportedCurrencies: ['GHS'], socialLinks: [{ label: 'X', url: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ dealershipName: 'G', defaultCurrency: 'GHS', supportedCurrencies: ['GHS', 'USD'], exchangeRates: { rates: { USD: -1 } } }).success).toBe(false);
  });

  it('accepts rates for only some currencies', () => {
    const r = updateSettingsSchema.safeParse({ dealershipName: 'G', defaultCurrency: 'GHS', supportedCurrencies: ['GHS', 'USD'], exchangeRates: { rates: { USD: 0.0625 } } });
    expect(r.success).toBe(true);
  });
});

describe('image processing', () => {
  it('rejects files that are not images', async () => {
    await expect(processImage(Buffer.from('definitely not an image'))).rejects.toThrow(/not a valid image/);
  });

  it('rejects photos that are too small to be useful', async () => {
    const tiny = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#888' } }).jpeg().toBuffer();
    await expect(processImage(tiny)).rejects.toThrow(/at least 400/);
  });

  it('creates an original plus responsive WebP variants without enlarging', async () => {
    const input = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#335577' } })
      .withMetadata({ exif: { IFD0: { Copyright: 'secret-location-test' } } })
      .jpeg()
      .toBuffer();
    const out = await processImage(input);
    expect(out.variants.thumb.width).toBe(480);
    expect(out.variants.medium.width).toBe(960);
    expect(out.variants.large.width).toBe(1200);
    const meta = await sharp(out.original.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined();
    expect((await sharp(out.variants.medium.buffer).metadata()).format).toBe('webp');
  });

  it('detects HEIC from the file bytes, not the name', async () => {
    expect(isHeic(await readFile(HEIC_FIXTURE))).toBe(true);
    expect(isHeic(await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer())).toBe(false);
    expect(isHeic(Buffer.from('....ftypisom....'))).toBe(false);
  });

  it('converts iPhone HEIC photos to JPEG + WebP with no metadata', async () => {
    const out = await processImage(await readFile(HEIC_FIXTURE));
    expect(out.original.width).toBe(1280);
    expect(out.original.height).toBe(854);
    const meta = await sharp(out.original.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.channels).toBe(3);
    expect(meta.exif).toBeUndefined();
    expect(out.variants.thumb.width).toBe(480);
    expect((await sharp(out.variants.large.buffer).metadata()).format).toBe('webp');
  }, 30_000);

  it('rejects corrupt HEIC files with a helpful message', async () => {
    const corrupt = Buffer.concat([(await readFile(HEIC_FIXTURE)).subarray(0, 64), Buffer.alloc(256)]);
    await expect(processImage(corrupt)).rejects.toThrow(/HEIC/);
  });
});
