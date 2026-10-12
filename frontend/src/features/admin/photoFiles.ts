export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
/** Extensions are listed too: some browsers report HEIC files with an empty MIME type. */
export const PHOTO_ACCEPT = [...PHOTO_MIME_TYPES, '.heic', '.heif'].join(',');
export const MAX_PHOTO_MB = 12;
export const MAX_PHOTOS = 24;

export function isAcceptedPhoto(file: Pick<File, 'name' | 'type'>): boolean {
  if (PHOTO_MIME_TYPES.includes(file.type)) return true;
  return (file.type === '' || file.type === 'application/octet-stream') && /\.(heic|heif)$/i.test(file.name);
}

export function validatePhotoFiles(files: Pick<File, 'name' | 'type' | 'size'>[], existing: number): string | null {
  if (existing + files.length > MAX_PHOTOS) return `A vehicle can have up to ${MAX_PHOTOS} photos. You can add ${Math.max(0, MAX_PHOTOS - existing)} more.`;
  for (const f of files) {
    if (!isAcceptedPhoto(f)) return `"${f.name}" is not a JPEG, PNG, WebP or HEIC photo.`;
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) return `"${f.name}" is larger than ${MAX_PHOTO_MB} MB.`;
  }
  return null;
}
