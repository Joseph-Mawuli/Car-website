import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { useQuery } from '@/hooks/useQuery';
import type { PublicSettings } from '@/types';

const env = import.meta.env;

/**
 * Used until the API responds, or if it is unreachable. Contact details fall back to
 * optional build-time values so WhatsApp/call buttons still work during an API outage.
 */
export const FALLBACK_SETTINGS: PublicSettings = {
  dealershipName: 'Goddel Motors',
  phone: env.VITE_PUBLIC_PHONE || undefined,
  whatsapp: env.VITE_PUBLIC_WHATSAPP || undefined,
  email: env.VITE_PUBLIC_EMAIL || undefined,
  openingHours: [],
  socialLinks: [],
  defaultCurrency: 'GHS',
  supportedCurrencies: ['GHS'],
  exchangeRateMode: 'live',
  whyChooseUs: [],
};

interface SettingsContextValue {
  settings: PublicSettings;
  isLoading: boolean;
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, reload } = useQuery('public-settings', (signal) =>
    apiRequest<PublicSettings>('/settings/public', { signal }),
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: data ? { ...FALLBACK_SETTINGS, ...stripEmpty(data) } : FALLBACK_SETTINGS,
      isLoading,
      reload,
    }),
    [data, isLoading, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function stripEmpty<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as Partial<T>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
