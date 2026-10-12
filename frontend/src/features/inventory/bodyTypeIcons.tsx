import type { BodyType } from '@/types';

/** Simple side-profile line icons so categories are recognisable at a glance. */
const PATHS: Record<BodyType, string> = {
  suv: 'M3 16v-3.5l2.5-4.5h9l4 4H22v4M3 16h2m4 0h6m4 0h3M5.5 8 7 12h12',
  crossover: 'M3 16v-3l3-4h8l4 3.5H22V16M3 16h2m4 0h6m4 0h3M6 9l1 3.5h11',
  sedan: 'M2 16v-2.5l3-1 3-3.5h7l3.5 3.5 3.5 1V16M2 16h3m4 0h6m4 0h3M8 9l-1 3.5h11',
  hatchback: 'M3 16v-3l3-1 3-3.5h6l4 4.5h2v3M3 16h2m4 0h6m4 0h2M9 8.5 8 12h10',
  pickup: 'M2 16v-3.5h6V8h6l3 4.5h5V16M2 16h3m4 0h6m4 0h3M14 8v4.5',
  coupe: 'M2 16v-2.5l4-1.5 4-3h5l4 3.5 3 1V16M2 16h3m4 0h6m4 0h3',
  convertible: 'M2 16v-3l5-1 2-2m0 0h4m6 2 3 1V16M2 16h3m4 0h6m4 0h3M7 12h12',
  wagon: 'M2 16v-3l3-1 3-4h12l2 4v4M2 16h3m4 0h6m4 0h3M8 8l-1 4h14',
  van: 'M2 16V8h13l5 4h2v4M2 16h3m4 0h6m4 0h3M15 8v4h5',
  minibus: 'M2 16V7h15l4 5v4M2 16h3m4 0h6m4 0h3M2 11h19M7 7v4m5-4v4',
  other: 'M3 16v-3l3-1 3-3.5h6l4 4 2 .5V16M3 16h2m4 0h6m4 0h2',
};

export function BodyTypeIcon({ type, className }: { type: BodyType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[type]} />
      <circle cx="7" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
    </svg>
  );
}
