import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CurrencySwitcher } from './CurrencySwitcher';
import { Price } from '@/features/inventory/Price';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PublicSettings } from '@/types';

const liveSettings: Partial<PublicSettings> = {
  defaultCurrency: 'GHS',
  supportedCurrencies: ['GHS', 'USD', 'GBP', 'EUR'],
  exchangeRateMode: 'live',
  exchangeRates: { base: 'GHS', rates: { USD: 0.08, GBP: 0.064 }, updatedAt: '2026-10-12T00:00:00.000Z', sourceUrl: 'https://www.exchangerate-api.com' },
};

describe('CurrencySwitcher', () => {
  beforeEach(() => localStorage.clear());

  it('lets visitors switch every price on the page and remembers the choice', async () => {
    renderWithProviders(
      <>
        <CurrencySwitcher />
        <Price amount={150000} currency="GHS" />
      </>,
      { api: async () => liveSettings },
    );
    const select = await screen.findByLabelText('Show prices in');
    // EUR is supported but has no rate, so it isn't offered.
    expect([...(select as HTMLSelectElement).options].map((o) => o.value)).toEqual(['GHS', 'USD', 'GBP']);
    expect(screen.getByText('GHS 150,000')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'USD' } });
    expect(screen.getByText('≈ USD 12,000')).toBeInTheDocument();
    expect(screen.getByText(/Estimate · listed at/)).toHaveTextContent('GHS 150,000');
    expect(localStorage.getItem('gm-display-currency')).toBe('USD');
  });

  it('is hidden when no exchange rates are available', () => {
    renderWithProviders(<CurrencySwitcher />);
    expect(screen.queryByLabelText('Show prices in')).not.toBeInTheDocument();
  });
});
