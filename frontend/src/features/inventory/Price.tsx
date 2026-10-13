import type { CurrencyCode } from '@/types';
import { convertPrice } from '@/lib/currency';
import { formatDate, formatPrice, cn } from '@/lib/format';
import { useSettings } from '@/providers/SettingsProvider';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';

interface Props {
  amount: number;
  currency: CurrencyCode;
  className?: string;
  estimateClassName?: string;
  /** Show the date the conversion rate was last updated. */
  showRateDate?: boolean;
}

/**
 * Shows the price in the visitor's chosen currency. When that differs from the listing's
 * currency, the converted figure leads (marked "≈", labelled as an estimate) and the
 * actual listed price is always shown beneath it. Without a rate, only the listed price shows.
 */
export function Price({ amount, currency, className, estimateClassName, showRateDate }: Props) {
  const { settings } = useSettings();
  const { displayCurrency } = useDisplayCurrency();
  const converted = convertPrice(amount, currency, displayCurrency, settings.exchangeRates);
  const listed = formatPrice(amount, currency);

  if (!converted) {
    return (
      <span className="inline-flex flex-col">
        <span className={cn('font-display font-bold text-brand-500', className)}>{listed}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col">
      <span className={cn('font-display font-bold text-brand-500', className)}>
        ≈ {formatPrice(converted.amount, converted.currency)}
      </span>
      <span className={cn('text-xs text-muted', estimateClassName)}>
        Estimate · listed at <span className="font-semibold text-fg-soft">{listed}</span>
        {showRateDate && converted.rateUpdatedAt ? ` · rate updated ${formatDate(converted.rateUpdatedAt)}` : ''}
      </span>
    </span>
  );
}
