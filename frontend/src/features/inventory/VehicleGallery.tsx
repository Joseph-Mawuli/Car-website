import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import type { VehicleImage as VehicleImageRecord } from '@/types';
import { VehicleImage } from './VehicleImage';
import { cn } from '@/lib/format';

interface Props {
  images: VehicleImageRecord[];
  title: string;
  overlay?: ReactNode;
}

function useSwipe(onPrev: () => void, onNext: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) (dx > 0 ? onPrev : onNext)();
      startX.current = null;
    },
  };
}

export function VehicleGallery({ images, title, overlay }: Props) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = images.length;

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const swipe = useSwipe(prev, next);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (lightbox && !el.open) el.showModal();
    if (!lightbox && el.open) el.close();
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, prev, next]);

  if (count === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
        <VehicleImage alt={title} sizes="100vw" />
        {overlay}
      </div>
    );
  }

  const current = images[Math.min(index, count - 1)];
  const navBtn =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur transition hover:bg-ink-950/80';

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-3" {...swipe}>
        <button type="button" onClick={() => setLightbox(true)} className="block h-full w-full cursor-zoom-in" aria-label={`View photo ${index + 1} of ${count} full screen`}>
          <VehicleImage
            key={current.id}
            image={current}
            alt={`${title} — photo ${index + 1} of ${count}`}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority={index === 0}
            large
          />
        </button>
        {overlay}
        {count > 1 && (
          <>
            <button type="button" onClick={prev} className={cn(navBtn, 'left-3')} aria-label="Previous photo">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={next} className={cn(navBtn, 'right-3')} aria-label="Next photo">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-semibold text-white">
          <Expand className="h-3.5 w-3.5" aria-hidden />
          {index + 1} / {count}
        </div>
      </div>

      {count > 1 && (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photo thumbnails">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'block h-16 w-20 overflow-hidden rounded-lg border-2 transition sm:h-[72px] sm:w-24',
                  i === index ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <VehicleImage image={{ ...img, variants: img.variants?.thumb ? { thumb: img.variants.thumb } : img.variants }} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setLightbox(false)}
        aria-label={`${title} photos`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink-950 p-0 text-white backdrop:bg-black open:flex open:flex-col"
      >
        {lightbox && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">
                {index + 1} / {count}
              </p>
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Close photo viewer"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center" {...swipe}>
              <VehicleImage
                key={`lb-${current.id}`}
                image={current}
                alt={`${title} — photo ${index + 1} of ${count}`}
                sizes="100vw"
                large
                className="!h-auto max-h-full !w-auto max-w-full object-contain"
              />
              {count > 1 && (
                <>
                  <button type="button" onClick={prev} className={cn(navBtn, 'left-2 sm:left-6')} aria-label="Previous photo">
                    <ChevronLeft className="h-6 w-6" aria-hidden />
                  </button>
                  <button type="button" onClick={next} className={cn(navBtn, 'right-2 sm:right-6')} aria-label="Next photo">
                    <ChevronRight className="h-6 w-6" aria-hidden />
                  </button>
                </>
              )}
            </div>
            {current.alt && <p className="px-4 py-3 text-center text-sm text-white/70">{current.alt}</p>}
          </>
        )}
      </dialog>
    </div>
  );
}
