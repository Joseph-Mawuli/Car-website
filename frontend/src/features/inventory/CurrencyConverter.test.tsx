import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CurrencyConverter } from './CurrencyConverter';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PublicSettings } from '@/types';

const settings: Partial<PublicSettings> = {
  defaultCurrency: 'GHS',
  supportedCurrencies: ['GHS', 'USD', 'NGN', 'EUR'],
  exchangeRates: { base: 'GHS', rates: { USD: 0.08, NGN: 120 }, updatedAt: '2026-10-12T00:00:00.000Z', sourceUrl: 'https://www.exchangerate-api.com' },
};

describe('CurrencyConverter', () => {
  beforeEach(() => localStorage.clear());

  it('converts instantly as the visitor types and changes currencies', async () => {
    renderWithProviders(<CurrencyConverter />, { api: async () => settings });
    expect(await screen.findByText('≈ USD 800')).toBeInTheDocument();
    expect(screen.getByText(/1 GHS = 0\.08 USD · Live rate updated 12 Oct 2026 · Estimate only/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2500' } });
    expect(screen.getByText('≈ USD 200')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('To currency'), { target: { value: 'NGN' } });
    expect(screen.getByText('≈ NGN 300,000')).toBeInTheDocument();

    // EUR is supported but has no rate, so it isn't offered.
    expect([...(screen.getByLabelText('From currency') as HTMLSelectElement).options].map((o) => o.value)).toEqual(['GHS', 'USD', 'NGN']);
  });

  it('converts between two foreign currencies and swaps direction', async () => {
    renderWithProviders(<CurrencyConverter />, { api: async () => settings });
    await screen.findByText('≈ USD 800');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('From currency'), { target: { value: 'USD' } });
    fireEvent.change(screen.getByLabelText('To currency'), { target: { value: 'NGN' } });
    expect(screen.getByText('≈ NGN 150,000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Swap currencies' }));
    expect(screen.getByLabelText('From currency')).toHaveValue('NGN');
    expect(screen.getByLabelText('Amount')).toHaveValue(150000);
    expect(screen.getByText('≈ USD 100')).toBeInTheDocument();
  });

  it('rejects negative amounts and hides itself without rates', async () => {
    const { unmount } = renderWithProviders(<CurrencyConverter />, { api: async () => settings });
    await screen.findByText('≈ USD 800');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '-5' } });
    expect(screen.getByText('Enter an amount of 0 or more.')).toBeInTheDocument();
    unmount();

    renderWithProviders(<CurrencyConverter />);
    expect(screen.queryByText('Currency converter')).not.toBeInTheDocument();
  });
});
