import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryNotice, TeamPage } from './TeamPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { StaffMember } from '@/types';

vi.mock('@/features/admin/AuthProvider', () => ({ useAuth: () => ({ staff: null, can: () => true, refreshProfile: vi.fn() }) }));

describe('DeliveryNotice', () => {
  it('confirms the email and never shows the link when it was emailed', () => {
    renderWithProviders(<DeliveryNotice email="ama@example.com" delivery={{ method: 'smtp', emailed: true }} onDone={() => {}} />);
    expect(screen.getByText(/emailed a password setup link/i)).toHaveTextContent('ama@example.com');
    expect(screen.queryByLabelText(/setup link/i)).not.toBeInTheDocument();
  });

  it('explains Firebase-sent emails', () => {
    renderWithProviders(<DeliveryNotice email="ama@example.com" delivery={{ method: 'firebase', emailed: true }} onDone={() => {}} />);
    expect(screen.getByText(/Reset your password/)).toBeInTheDocument();
  });

  it('shows a copyable link with the reason when email failed', () => {
    renderWithProviders(
      <DeliveryNotice
        email="ama@example.com"
        delivery={{ method: 'manual', emailed: false, setupLink: 'https://example.test/link', notice: "The email couldn't be sent." }}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(/couldn't be sent/)).toBeInTheDocument();
    expect(screen.getByLabelText(/setup link/i)).toHaveValue('https://example.test/link');
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });
});

describe('TeamPage', () => {
  it('lets a team member be renamed', async () => {
    const member: StaffMember = { id: 's1', email: 'kofi@example.com', displayName: 'Kofi', role: 'sales_assistant', status: 'active', createdAt: '2026-01-01T00:00:00Z' };
    const calls: { path: string; method?: string; body?: unknown }[] = [];
    renderWithProviders(<TeamPage />, {
      api: async (path, options) => {
        calls.push({ path, method: options.method, body: options.body });
        if (path === '/admin/staff') return [member];
        if (path === '/admin/staff/s1') return { ...member, ...(options.body as object) };
        return {};
      },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Edit name for Kofi' }));
    const input = screen.getByRole('textbox', { name: /full name/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Kofi Mensah');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(calls).toContainEqual({ path: '/admin/staff/s1', method: 'PATCH', body: { displayName: 'Kofi Mensah' } }));
    expect(await screen.findByText('Kofi Mensah')).toBeInTheDocument();
  });
});
