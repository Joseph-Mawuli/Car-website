import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { setMockHandler, type MockHandler } from '@/lib/api';

export function renderWithProviders(ui: ReactElement, { api, route = '/' }: { api?: MockHandler; route?: string } = {}) {
  setMockHandler(api ?? (async () => ({})));
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <CurrencyProvider>
          <ToastProvider>{ui}</ToastProvider>
        </CurrencyProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}
