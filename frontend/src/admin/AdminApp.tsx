import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { AuthProvider } from '@/features/admin/AuthProvider';
import { AdminLayout, RequirePermission } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { InventoryPage } from '@/pages/admin/InventoryPage';
import { VehicleEditorPage } from '@/pages/admin/VehicleEditorPage';
import { EnquiriesPage } from '@/pages/admin/EnquiriesPage';
import { EnquiryDetailPage } from '@/pages/admin/EnquiryDetailPage';
import { TeamPage } from '@/pages/admin/TeamPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { ButtonLink } from '@/components/ui/Button';
import type { Permission } from '@/types';

/** UI-level gating only; every endpoint re-checks permissions on the server. */
function gate(permission: Permission, page: ReactNode) {
  return <RequirePermission permission={permission}>{page}</RequirePermission>;
}

function AdminNotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This admin page doesn't exist.</p>
      <ButtonLink to="/admin" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={gate('dashboard:read', <DashboardPage />)} />
          <Route path="inventory" element={gate('vehicles:read', <InventoryPage />)} />
          <Route path="inventory/new" element={gate('vehicles:write', <VehicleEditorPage />)} />
          <Route path="inventory/:id" element={gate('vehicles:read', <VehicleEditorPage />)} />
          <Route path="enquiries" element={gate('enquiries:read', <EnquiriesPage />)} />
          <Route path="enquiries/:id" element={gate('enquiries:read', <EnquiryDetailPage />)} />
          <Route path="team" element={gate('staff:manage', <TeamPage />)} />
          <Route path="settings" element={gate('settings:manage', <SettingsPage />)} />
          <Route path="audit" element={gate('audit:read', <AuditLogPage />)} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
