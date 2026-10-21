import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryDetailPage } from './EnquiryDetailPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Enquiry, Permission } from '@/types';

let permissions: Permission[] = [];
vi.mock('@/features/admin/AuthProvider', () => ({ useAuth: () => ({ staff: null, can: (p: Permission) => permissions.includes(p) }) }));

const enquiry: Enquiry = {
  id: 'e1',
  name: 'Kofi Mensah',
  phone: '0241234567',
  message: 'Is the Camry still available?',
  status: 'closed',
  notes: [],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

function api(calls: { path: string; method?: string }[]) {
  return async (path: string, options: { method?: string }) => {
    calls.push({ path, method: options.method });
    return options.method === 'DELETE' ? undefined : enquiry;
  };
}

describe('EnquiryDetailPage', () => {
  it('hides the delete option from staff who are not owners', async () => {
    permissions = ['enquiries:read', 'enquiries:update'];
    renderWithProviders(<EnquiryDetailPage />, { api: api([]) });
    expect(await screen.findByText('Kofi Mensah')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete enquiry/i })).not.toBeInTheDocument();
  });

  it('lets owners permanently delete an enquiry after confirming', async () => {
    permissions = ['enquiries:read', 'enquiries:update', 'enquiries:delete'];
    const calls: { path: string; method?: string }[] = [];
    renderWithProviders(<EnquiryDetailPage />, { api: api(calls) });

    await userEvent.click(await screen.findByRole('button', { name: /delete enquiry/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/permanently deleted/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete enquiry' }));
    await waitFor(() => expect(calls).toContainEqual({ path: '/admin/enquiries/e1', method: 'DELETE' }));
    expect(await screen.findByText('Enquiry deleted')).toBeInTheDocument();
  });
});
