import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogPage } from './AuditLogPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { AuditLogEntry, Permission } from '@/types';

let permissions: Permission[] = [];
vi.mock('@/features/admin/AuthProvider', () => ({ useAuth: () => ({ staff: null, can: (p: Permission) => permissions.includes(p) }) }));

const entry: AuditLogEntry = { id: 'a1', action: 'vehicle.update', actorEmail: 'ama@example.com', summary: 'Changed price', createdAt: '2026-10-01T10:00:00Z' };

function api(calls: { path: string; method?: string; body?: unknown }[]) {
  return async (path: string, options: { method?: string; body?: unknown }) => {
    calls.push({ path, method: options.method, body: options.body });
    if (options.method === 'DELETE') return path === '/admin/audit-logs' ? { removed: 1 } : undefined;
    return { items: [entry], page: 1, limit: 30, total: 1, totalPages: 1 };
  };
}

describe('AuditLogPage', () => {
  it('hides delete controls from staff without permission', async () => {
    permissions = ['audit:read'];
    renderWithProviders(<AuditLogPage />, { api: api([]) });
    expect(await screen.findByText('Changed price')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete audit entry/i })).not.toBeInTheDocument();
  });

  it('lets owners delete one entry after confirming', async () => {
    permissions = ['audit:read', 'audit:delete'];
    const calls: { path: string; method?: string; body?: unknown }[] = [];
    renderWithProviders(<AuditLogPage />, { api: api(calls) });

    await userEvent.click(await screen.findByRole('button', { name: /delete audit entry/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(calls).toContainEqual({ path: '/admin/audit-logs/a1', method: 'DELETE', body: undefined }));
    expect(await screen.findByText('Audit entry deleted')).toBeInTheDocument();
  });

  it('lets owners clear everything after confirming', async () => {
    permissions = ['audit:read', 'audit:delete'];
    const calls: { path: string; method?: string; body?: unknown }[] = [];
    renderWithProviders(<AuditLogPage />, { api: api(calls) });

    await userEvent.click(await screen.findByRole('button', { name: /clear all/i }));
    expect(screen.getByText(/can't be undone/i)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear all' }).at(-1)!);
    await waitFor(() => expect(calls).toContainEqual({ path: '/admin/audit-logs', method: 'DELETE', body: { confirm: true } }));
  });

  it('empties the list as soon as the owner confirms, and restores it if the server refuses', async () => {
    permissions = ['audit:read', 'audit:delete'];
    let fail: (e: Error) => void = () => {};
    renderWithProviders(<AuditLogPage />, {
      api: (_path, options) =>
        options.method === 'DELETE'
          ? new Promise((_resolve, reject) => (fail = reject))
          : Promise.resolve({ items: [entry], page: 1, limit: 30, total: 1, totalPages: 1 }),
    });

    await userEvent.click(await screen.findByRole('button', { name: /clear all/i }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear all' }).at(-1)!);
    expect(screen.queryByText('Changed price')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fail(new Error('Server unavailable'));
    expect(await screen.findByText('Changed price')).toBeInTheDocument();
    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
  });
});
