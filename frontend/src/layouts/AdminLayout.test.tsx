import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { Permission } from '@/types';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { setMockHandler } from '@/lib/api';

const authState = vi.hoisted(() => ({
  value: {
    status: 'signedIn' as string,
    staff: null as unknown,
    permissions: [] as Permission[],
  },
}));

vi.mock('@/features/admin/AuthProvider', () => ({
  useAuth: () => ({
    status: authState.value.status,
    staff: authState.value.staff,
    notice: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    sendPasswordReset: vi.fn(),
    refreshProfile: vi.fn(),
    can: (p: Permission) => authState.value.permissions.includes(p),
  }),
}));

import { AdminLayout, RequirePermission } from './AdminLayout';
function setRole(permissions: Permission[]) {
  authState.value = {
    status: 'signedIn',
    staff: { id: 's1', email: 'a@example.com', displayName: 'Test User', role: 'sales_assistant', status: 'active', createdAt: '', permissions },
    permissions,
  };
}

function renderAdmin(path: string) {
  setMockHandler(async () => ({}));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <Routes>
          <Route path="/admin/login" element={<p>Login screen</p>} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Dashboard</p>} />
            <Route
              path="team"
              element={
                <RequirePermission permission="staff:manage">
                  <p>Team management</p>
                </RequirePermission>
              }
            />
          </Route>
        </Routes>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('admin access (UI layer)', () => {
  beforeEach(() => setRole([]));

  it('redirects signed-out visitors to the login page', () => {
    authState.value = { status: 'signedOut', staff: null, permissions: [] };
    renderAdmin('/admin');
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('hides navigation items the role cannot use', () => {
    setRole(['dashboard:read', 'vehicles:read', 'enquiries:read', 'enquiries:update']);
    renderAdmin('/admin');
    const nav = screen.getAllByRole('navigation', { name: 'Admin' })[0];
    expect(nav).toHaveTextContent('Enquiries');
    expect(nav).not.toHaveTextContent('Team');
    expect(nav).not.toHaveTextContent('Settings');
  });

  it('blocks a page when the role lacks the permission, even via direct URL', () => {
    setRole(['dashboard:read', 'vehicles:read', 'vehicles:write']);
    renderAdmin('/admin/team');
    expect(screen.queryByText('Team management')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('shows the page for an owner', () => {
    setRole(['dashboard:read', 'staff:manage']);
    renderAdmin('/admin/team');
    expect(screen.getByText('Team management')).toBeInTheDocument();
  });
});
