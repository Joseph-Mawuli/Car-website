import type { CurrencyCode, MileageUnit } from '@/types';

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  GHS: 'en-GH',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  NGN: 'en-NG',
  CNY: 'en-US',
  AED: 'en-AE',
};

/** Formats as e.g. "GHS 280,000" — the code prefix is clearer than ambiguous symbols. */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-GH', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${currency} ${formatted}`;
}

export function formatMileage(mileage: number | undefined, unit: MileageUnit | undefined): string | undefined {
  if (mileage === undefined || mileage === null) return undefined;
  return `${new Intl.NumberFormat('en-GH').format(mileage)} ${unit ?? 'km'}`;
}

export function formatDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', opts).format(d);
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
