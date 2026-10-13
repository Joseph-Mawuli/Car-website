import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Logo } from './Logo';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PublicSettings } from '@/types';

describe('Logo', () => {
  it('shows the business name and the default motto until settings provide one', () => {
    renderWithProviders(<Logo />);
    expect(screen.getByText('GODDEL')).toBeInTheDocument();
    expect(screen.getByText('MOTORS')).toBeInTheDocument();
    expect(screen.getByText('Trust In Every Drive')).toBeInTheDocument();
  });

  it('uses the business name and motto saved in settings', async () => {
    const settings: Partial<PublicSettings> = {
      dealershipName: 'Accra Auto Hub',
      motto: 'Drive with confidence',
    };
    renderWithProviders(<Logo />, { api: async () => settings });
    expect(await screen.findByText('Drive with confidence')).toBeInTheDocument();
    expect(screen.getByText('ACCRA')).toBeInTheDocument();
    expect(screen.getByText('AUTO HUB')).toBeInTheDocument();
  });

  it('shows an uploaded logo on its own when it already includes the name', async () => {
    const settings: Partial<PublicSettings> = {
      dealershipName: 'Accra Auto Hub',
      logoUrl: 'https://cdn.example.com/logo.webp',
      logoIncludesName: true,
    };
    renderWithProviders(<Logo />, { api: async () => settings });
    expect(await screen.findByRole('img', { name: 'Accra Auto Hub' })).toHaveAttribute('src', 'https://cdn.example.com/logo.webp');
    expect(screen.queryByText('ACCRA')).not.toBeInTheDocument();
    expect(screen.getByText('Trust In Every Drive')).toBeInTheDocument();
  });
});
