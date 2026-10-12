import { useId, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { CURRENCY_NAMES, type CurrencyCode } from '@/types';
import { convertPrice } from '@/lib/currency';
import { formatDate, formatPrice } from '@/lib/format';
import { useSettings } from '@/providers/SettingsProvider';
import { useDisplayCurrency } from '@/providers/CurrencyProvider';

const MAX_AMOUNT = 1_000_000_000_000;

function formatRate(value: number): string {
  return new Intl.NumberFormat('en-GH', { maximumSignificantDigits: 5 }).format(value);
}

/** Instant conversion between the currencies the site has rates for. Hidden when there are none. */
export function CurrencyConverter({ className }: { className?: string }) {
  const id = useId();
  const { settings } = useSettings();
  const { displayCurrency, currencies } = useDisplayCurrency();
  const [amount, setAmount] = useState('10000');
  const [from, setFrom] = useState<CurrencyCode | null>(null);
  const [to, setTo] = useState<CurrencyCode | null>(null);

  if (currencies.length < 2) return null;

  // Choices made before rates loaded (or for a currency since disabled) fall back sensibly.
  const fromCur = from && currencies.includes(from) ? from : settings.defaultCurrency;
  const toCur =
    to && currencies.includes(to) && to !== fromCur ? to : displayCurrency !== fromCur ? displayCurrency : currencies.find((c) => c !== fromCur)!;

  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT;
  const result = valid ? convertPrice(value, fromCur, toCur, settings.exchangeRates) : null;
  const unit = convertPrice(1, fromCur, toCur, settings.exchangeRates);
  const rates = settings.exchangeRates;

  const options = currencies.map((c) => (
    <option key={c} value={c}>
      {c} — {CURRENCY_NAMES[c]}
    </option>
  ));

  const swap = () => {
    setFrom(toCur);
    setTo(fromCur);
    if (result) setAmount(String(Math.round(result.amount * 100) / 100));
  };

  return (
    <section className={className} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-base font-semibold">
        Currency converter
      </h2>
      <p className="mt-0.5 text-xs text-muted">Type an amount to convert it instantly.</p>

      <div className="mt-3 space-y-2">
        <div className="space-y-2">
          <label htmlFor={`${id}-from`} className="sr-only">
            From currency
          </label>
          <select id={`${id}-from`} value={fromCur} onChange={(e) => setFrom(e.target.value as CurrencyCode)} className="field-input font-semibold">
            {options}
          </select>
          <label htmlFor={`${id}-amount`} className="sr-only">
            Amount
          </label>
          <input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={(amount !== '' && !valid) || undefined}
            className="field-input text-lg font-semibold"
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Swap currencies"
            title="Swap currencies"
          >
            <ArrowUpDown className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor={`${id}-to`} className="sr-only">
            To currency
          </label>
          <select id={`${id}-to`} value={toCur} onChange={(e) => setTo(e.target.value as CurrencyCode)} className="field-input font-semibold">
            {options.filter((o) => o.key !== fromCur)}
          </select>
          <output
            htmlFor={`${id}-amount ${id}-from ${id}-to`}
            aria-live="polite"
            className="block break-words rounded-xl bg-surface-2 px-3.5 py-2.5 font-display text-lg font-bold text-brand-600 dark:text-brand-400"
          >
            {result ? `≈ ${formatPrice(result.amount, toCur)}` : '—'}
          </output>
        </div>
      </div>

      {amount !== '' && !valid ? (
        <p className="field-error">Enter an amount of 0 or more.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {[
            unit && `1 ${fromCur} = ${formatRate(unit.amount)} ${toCur}`,
            rates?.updatedAt && `${rates.sourceUrl ? 'Live rate' : 'Rate'} updated ${formatDate(rates.updatedAt)}`,
            'Estimate only',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
