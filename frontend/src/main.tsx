import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { setMockHandler } from '@/lib/api';
import '@/styles/index.css';

async function start() {
  // The preview mock is dev-only: `import.meta.env.DEV` is statically false in production builds,
  // so the mock module is tree-shaken out and can never be enabled on the live site.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const mock = await import('@/mocks/mockApi');
    setMockHandler(mock.handle);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <SettingsProvider>
          <CurrencyProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CurrencyProvider>
        </SettingsProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

void start();
