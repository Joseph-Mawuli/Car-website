import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DeliveryNotice } from './TeamPage';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/features/admin/AuthProvider', () => ({ useAuth: () => ({ staff: null, can: () => true }) }));

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
