import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CurrencyCode } from '@/types';
import { availableDisplayCurrencies } from '@/lib/currency';
import { useSettings } from './SettingsProvider';

interface CurrencyContextValue {
  /** Visitor's chosen currency; prices in other currencies show a converted estimate in it. */
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (code: CurrencyCode) => void;
  /** Currencies the visitor can switch to — only those a rate is available for. */
  currencies: CurrencyCode[];
}

const STORAGE_KEY = 'gm-display-currency';
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [preferred, setPreferred] = useState<CurrencyCode | null>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as CurrencyCode | null) ?? null;
    } catch {
      return null;
    }
  });

  const currencies = useMemo(
    () => availableDisplayCurrencies(settings.defaultCurrency, settings.supportedCurrencies, settings.exchangeRates),
    [settings.defaultCurrency, settings.supportedCurrencies, settings.exchangeRates],
  );
  const displayCurrency = preferred && currencies.includes(preferred) ? preferred : settings.defaultCurrency;

  const setDisplayCurrency = useCallback((code: CurrencyCode) => {
    setPreferred(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ displayCurrency, setDisplayCurrency, currencies }), [displayCurrency, setDisplayCurrency, currencies]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useDisplayCurrency must be used inside CurrencyProvider');
  return ctx;
}
