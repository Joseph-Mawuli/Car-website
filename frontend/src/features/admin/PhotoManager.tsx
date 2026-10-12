import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, RefreshCw, Star, Trash2, UploadCloud } from 'lucide-react';
import { adminApi } from './api';
import type { VehicleImage as VehicleImageRecord } from '@/types';
import { VehicleImage } from '@/features/inventory/VehicleImage';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/format';
import { MAX_PHOTO_MB, MAX_PHOTOS, PHOTO_ACCEPT, validatePhotoFiles } from './photoFiles';


interface Props {
  vehicleId: string;
  vehicleTitle: string;
  images: VehicleImageRecord[];
  onChange: (images: VehicleImageRecord[]) => void;
  readOnly?: boolean;
}


export function PhotoManager({ vehicleId, vehicleTitle, images, onChange, readOnly }: Props) {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VehicleImageRecord | null>(null);
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  const upload = async (files: File[]) => {
    setError(null);
    const problem = validatePhotoFiles(files, images.length);
    if (problem) {
      setError(problem);
      return;
    }
    setProgress(0);
    try {
      // Upload in small batches so progress is meaningful and one bad file doesn't sink a huge batch.
      let all = [...images];
      for (let i = 0; i < files.length; i += 4) {
        const batch = files.slice(i, i + 4);
        const res = await adminApi.uploadImages(vehicleId, batch, (f) => setProgress((i + f * batch.length) / files.length));
        all = [...all, ...res.images];
        onChange(all);
      }
      notify(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) void upload(files);
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((img, i) => ({ ...img, sortOrder: i }));
    const previous = images;
    onChange(reordered);
    try {
      await adminApi.reorderImages(vehicleId, reordered.map((i) => i.id));
    } catch (err) {
      onChange(previous);
      notify(errorMessage(err), 'error');
    }
  };

  const replace = async (img: VehicleImageRecord, file: File) => {
    const problem = validatePhotoFiles([file], 0);
    if (problem) {
      setError(problem);
      return;
    }
    setBusyId(img.id);
    try {
      const updated = await adminApi.replaceImage(vehicleId, img.id, file);
      onChange(images.map((i) => (i.id === img.id ? { ...updated, sortOrder: i.sortOrder, alt: i.alt } : i)));
      notify('Photo replaced');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await adminApi.deleteImage(vehicleId, confirmDelete.id);
      onChange(images.filter((i) => i.id !== confirmDelete.id));
      notify('Photo deleted');
      setConfirmDelete(null);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const saveAlt = async (img: VehicleImageRecord, alt: string) => {
    if (alt === img.alt) return;
    try {
      await adminApi.updateImageAlt(vehicleId, img.id, alt);
      onChange(images.map((i) => (i.id === img.id ? { ...i, alt } : i)));
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <div>
      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!readOnly && (
        <div className="mb-5">
          <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} multiple className="sr-only" id="photo-upload" onChange={onPick} disabled={progress !== null} />
          <label
            htmlFor="photo-upload"
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-8 text-center transition-colors hover:border-brand-500 hover:bg-brand-500/5',
              progress !== null && 'pointer-events-none opacity-70',
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length) void upload(files);
            }}
          >
            <UploadCloud className="h-8 w-8 text-brand-500" aria-hidden />
            <span className="font-semibold">Tap to add photos</span>
            <span className="text-xs text-muted">
              JPEG, PNG, WebP or iPhone HEIC · up to {MAX_PHOTO_MB} MB each · {images.length}/{MAX_PHOTOS} used
            </span>
          </label>
          {progress !== null && (
            <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Upload progress">
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full bg-brand-500 transition-[width]" style={{ width: `${Math.max(4, progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">Uploading and optimising… {Math.round(progress * 100)}%</p>
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface-2 px-4 py-10 text-center text-muted">
          <ImagePlus className="h-8 w-8" aria-hidden />
          <p className="mt-2 text-sm">No photos yet. Listings with clear photos get far more enquiries.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((img, index) => (
            <li key={img.id} className={cn('overflow-hidden rounded-2xl border border-line bg-surface', busyId === img.id && 'opacity-60')}>
              <div className="relative aspect-[4/3] bg-surface-3">
                <VehicleImage image={img} alt={img.alt || `${vehicleTitle} photo ${index + 1}`} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 40vw, 90vw" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-brand-500 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                    <Star className="h-3 w-3" aria-hidden /> Cover
                  </span>
                )}
              </div>
              <div className="space-y-2 p-3">
                <label className="sr-only" htmlFor={`alt-${img.id}`}>
                  Photo description (alt text)
                </label>
                <input
                  id={`alt-${img.id}`}
                  defaultValue={img.alt}
                  maxLength={200}
                  placeholder="Describe this photo, e.g. Front view"
                  className="field-input min-h-10 py-2 text-sm"
                  onBlur={(e) => saveAlt(img, e.target.value.trim())}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move photo earlier">
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === sorted.length - 1} aria-label="Move photo later">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                    {index !== 0 && (
                      <Button variant="ghost" size="sm" onClick={() => move(index, -index)} aria-label="Make this the cover photo">
                        <Star className="h-4 w-4" aria-hidden /> Cover
                      </Button>
                    )}
                    <label className="ml-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-fg-soft hover:bg-surface-2" title="Replace photo">
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Replace photo</span>
                      <input
                        type="file"
                        accept={PHOTO_ACCEPT}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void replace(img, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(img)} aria-label="Delete photo" className="hover:!bg-red-500/10 hover:!text-danger">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this photo?"
        description="The photo will be removed from the listing and deleted from storage. This cannot be undone."
        confirmLabel="Delete photo"
        loading={busyId !== null}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
