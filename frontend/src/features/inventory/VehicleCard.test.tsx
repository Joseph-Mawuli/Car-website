import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { VehicleCard } from './VehicleCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PublicSettings, VehicleSummary } from '@/types';

const vehicle: VehicleSummary = {
  id: 'v1',
  slug: '2021-toyota-rav4-abc123',
  title: '2021 Toyota RAV4',
  make: 'Toyota',
  model: 'RAV4',
  year: 2021,
  price: 320000,
  currency: 'GHS',
  availabilityStatus: 'sold',
  transmission: 'automatic',
  createdAt: '2026-10-01T00:00:00.000Z',
};

const settings: Partial<PublicSettings> = {
  defaultCurrency: 'GHS',
  supportedCurrencies: ['GHS', 'USD'],
  exchangeRates: { base: 'GHS', rates: { USD: 0.0625 }, updatedAt: '2026-10-01T00:00:00.000Z' },
};

describe('VehicleCard', () => {
  beforeEach(() => localStorage.clear());

  it('links to the vehicle and shows its status, price and known specs only', () => {
    renderWithProviders(<VehicleCard vehicle={vehicle} />);
    expect(screen.getByRole('link', { name: '2021 Toyota RAV4' })).toHaveAttribute('href', '/cars/2021-toyota-rav4-abc123');
    expect(screen.getByText('Sold')).toBeInTheDocument();
    expect(screen.getByText('GHS 320,000')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(screen.queryByText(/mileage/i)).not.toBeInTheDocument();
  });

  it('shows a clearly labelled estimate only when the visitor picks another currency', async () => {
    localStorage.setItem('gm-display-currency', 'USD');
    renderWithProviders(<VehicleCard vehicle={vehicle} />, { api: async () => settings });
    expect(await screen.findByText('≈ USD 20,000')).toBeInTheDocument();
    expect(screen.getByText(/Estimate · listed at/)).toHaveTextContent('Estimate · listed at GHS 320,000');
  });

  it('marks demo listings', () => {
    renderWithProviders(<VehicleCard vehicle={{ ...vehicle, isDemo: true }} />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });
});
