import type { ReactNode } from 'react';
import type { AvailabilityStatus, EnquiryStatus, Visibility } from '@/types';
import { AVAILABILITY_LABELS, ENQUIRY_STATUS_LABELS, VISIBILITY_LABELS } from '@/lib/labels';
import { cn } from '@/lib/format';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'violet';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:bg-success/12 dark:text-success dark:ring-success/35',
  amber: 'bg-amber-500/14 text-amber-700 ring-amber-500/35 dark:bg-warning/12 dark:text-warning dark:ring-warning/35',
  red: 'bg-red-500/12 text-red-700 ring-red-500/30 dark:bg-danger/12 dark:text-danger dark:ring-danger/35',
  blue: 'bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  gray: 'bg-surface-3 text-fg-soft ring-line-strong',
  violet: 'bg-violet-500/12 text-violet-700 ring-violet-500/30 dark:text-violet-300',
};

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const AVAILABILITY_TONE: Record<AvailabilityStatus, Tone> = { available: 'green', reserved: 'amber', sold: 'red' };

export function AvailabilityBadge({ status, className, solid }: { status: AvailabilityStatus; className?: string; solid?: boolean }) {
  if (solid) {
    const solidTone: Record<AvailabilityStatus, string> = {
      available: 'bg-emerald-600 text-white',
      reserved: 'bg-amber-500 text-ink-950',
      sold: 'bg-red-600 text-white',
    };
    return (
      <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow', solidTone[status], className)}>
        {AVAILABILITY_LABELS[status]}
      </span>
    );
  }
  return (
    <Badge tone={AVAILABILITY_TONE[status]} className={className}>
      {AVAILABILITY_LABELS[status]}
    </Badge>
  );
}

const ENQUIRY_TONE: Record<EnquiryStatus, Tone> = { new: 'blue', contacted: 'green', follow_up: 'amber', closed: 'gray' };

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge tone={ENQUIRY_TONE[status]}>{ENQUIRY_STATUS_LABELS[status]}</Badge>;
}

const VISIBILITY_TONE: Record<Visibility, Tone> = { published: 'green', draft: 'violet', archived: 'gray' };

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return <Badge tone={VISIBILITY_TONE[visibility]}>{VISIBILITY_LABELS[visibility]}</Badge>;
}
