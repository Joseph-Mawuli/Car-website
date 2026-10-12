import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { CURRENCY_NAMES, type CurrencyCode } from '@/types';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';
import { SelectField } from '@/components/ui/Field';
import { cn } from '@/lib/format';

/**
 * Lets visitors view prices in another currency. Hidden when no exchange rate is available.
 * `compact` is the header control; `field` is a labelled select for filter forms.
 */
export function CurrencySwitcher({ className, variant = 'compact' }: { className?: string; variant?: 'compact' | 'inline' | 'field' }) {
  const id = useId();
  const { displayCurrency, setDisplayCurrency, currencies } = useDisplayCurrency();
  if (currencies.length < 2) return null;

  if (variant === 'field') {
    return (
      <SelectField
        label="Show prices in"
        wrapperClassName={className}
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
        options={currencies.map((code) => ({ value: code, label: `${code} — ${CURRENCY_NAMES[code]}` }))}
      />
    );
  }

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Show prices in
      </label>
      <select
        id={id}
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
        className={cn(
          'cursor-pointer appearance-none bg-transparent font-bold hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-500',
          variant === 'inline'
            ? 'h-7 rounded-lg pl-2 pr-6 text-xs text-brand-600 dark:text-brand-400'
            : 'h-11 rounded-xl pl-2 pr-6 text-sm text-fg-soft sm:pl-3 sm:pr-7',
        )}
      >
        {currencies.map((code) => (
          <option key={code} value={code} title={CURRENCY_NAMES[code]}>
            {code}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn('pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted', variant === 'inline' ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:right-2')}
        aria-hidden
      />
    </div>
  );
}
