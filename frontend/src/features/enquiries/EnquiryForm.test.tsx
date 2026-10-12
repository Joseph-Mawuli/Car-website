import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryForm } from './EnquiryForm';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ApiError, type MockHandler } from '@/lib/api';

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Ama Mensah');
  await user.type(screen.getByLabelText(/phone \/ whatsapp/i), '+233 24 123 4567');
  await user.click(screen.getByRole('checkbox'));
}

describe('EnquiryForm', () => {
  it('shows validation errors and does not submit invalid data', async () => {
    const api = vi.fn<MockHandler>(async () => ({}));
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />, { api });
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/agree to the privacy notice/i)).toBeInTheDocument();
    expect(api.mock.calls.filter(([path]) => path === '/enquiries')).toHaveLength(0);
  });

  it('prefills the message with the vehicle and submits it with the vehicle id', async () => {
    const api = vi.fn<MockHandler>(async (path) => (path === '/enquiries' ? { id: 'e1' } : {}));
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm vehicleId="v1" vehicleTitle="2021 Toyota RAV4" />, { api });

    expect(screen.getByLabelText(/message/i)).toHaveValue("I'm interested in the 2021 Toyota RAV4. Is it still available?");
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByText(/your enquiry has been sent/i)).toBeInTheDocument();
    const call = api.mock.calls.find(([path]) => path === '/enquiries');
    expect(call?.[1].method).toBe('POST');
    expect(call?.[1].body).toMatchObject({ name: 'Ama Mensah', vehicleId: 'v1', consent: true, website: '' });
  });

  it('shows a friendly message when rate limited', async () => {
    const api = vi.fn<MockHandler>(async (path) => {
      if (path === '/enquiries') throw new ApiError(429, 'rate_limited', 'Too many requests');
      return {};
    });
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm vehicleTitle="Test car" />, { api });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/several enquiries in a short time/i));
  });
});
