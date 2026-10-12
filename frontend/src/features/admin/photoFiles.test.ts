import { describe, expect, it } from 'vitest';
import { isAcceptedPhoto, validatePhotoFiles } from './photoFiles';

describe('photo file checks', () => {
  it('accepts iPhone HEIC photos, including when the browser reports no MIME type', () => {
    expect(isAcceptedPhoto({ name: 'IMG_0001.HEIC', type: 'image/heic' })).toBe(true);
    expect(isAcceptedPhoto({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
    expect(isAcceptedPhoto({ name: 'photo.heif', type: 'application/octet-stream' })).toBe(true);
  });

  it('rejects other files', () => {
    expect(isAcceptedPhoto({ name: 'doc.pdf', type: 'application/pdf' })).toBe(false);
    expect(isAcceptedPhoto({ name: 'tool.exe', type: '' })).toBe(false);
    expect(validatePhotoFiles([{ name: 'x.gif', type: 'image/gif', size: 10 }], 0)).toMatch(/JPEG, PNG, WebP or HEIC/);
  });

  it('enforces size and count limits', () => {
    expect(validatePhotoFiles([{ name: 'a.jpg', type: 'image/jpeg', size: 13 * 1024 * 1024 }], 0)).toMatch(/larger than 12 MB/);
    expect(validatePhotoFiles([{ name: 'a.jpg', type: 'image/jpeg', size: 10 }], 24)).toMatch(/up to 24 photos/);
    expect(validatePhotoFiles([{ name: 'a.heic', type: '', size: 10 }], 0)).toBeNull();
  });
});
