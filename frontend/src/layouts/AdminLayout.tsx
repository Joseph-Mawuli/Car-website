import { useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { ExternalLink, FileClock, Gauge, Inbox, LogOut, Menu, Settings, ShieldAlert, Users, CarFront } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PreviewModeBanner } from '@/components/layout/PreviewModeBanner';
import { Dialog } from '@/components/ui/Dialog';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/States';
import { useAuth } from '@/features/admin/AuthProvider';
import { ROLE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/format';
import type { Permission } from '@/types';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const ADMIN_NAV: { to: string; label: string; icon: typeof Gauge; permission: Permission; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: Gauge, permission: 'dashboard:read', end: true },
  { to: '/admin/inventory', label: 'Inventory', icon: CarFront, permission: 'vehicles:read' },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, permission: 'enquiries:read' },
  { to: '/admin/team', label: 'Team', icon: Users, permission: 'staff:manage' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings:manage' },
  { to: '/admin/audit', label: 'Audit Log', icon: FileClock, permission: 'audit:read' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Redirects to the login page unless an active staff member is signed in. */
export function AdminLayout() {
  const { status, staff, can, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useDocumentMeta({ title: 'Admin', noIndex: true });

  if (status === 'loading') return <PageLoader label="Checking your session" />;
  if (status !== 'signedIn' || !staff) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const nav = ADMIN_NAV.filter((item) => can(item.permission));
  const bottomNav = nav.slice(0, 4);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
      isActive ? 'bg-brand-500/12 text-brand-700 dark:text-brand-300' : 'text-fg-soft hover:bg-surface-2 hover:text-fg',
    );

  const userCard = (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white" aria-hidden>
        {initials(staff.displayName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{staff.displayName}</span>
        <span className="block truncate text-xs text-muted">{ROLE_LABELS[staff.role]}</span>
      </span>
    </div>
  );

  const navList = (onNavigate?: () => void) => (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
          <Icon className="h-5 w-5" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <PreviewModeBanner />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Link to="/admin" className="mb-6 px-2 pt-1">
          <Logo />
        </Link>
        {navList()}
        <div className="mt-auto space-y-3">
          <a href="/" target="_blank" rel="noopener" className="flex min-h-10 items-center gap-2 px-3 text-sm font-semibold text-muted hover:text-fg">
            <ExternalLink className="h-4 w-4" aria-hidden /> View website
          </a>
          {userCard}
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-fg-soft hover:bg-surface-2 hover:text-fg"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur lg:hidden">
        <Link to="/admin" aria-label="Dashboard">
          <Logo className="[&_svg]:h-7" />
        </Link>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
          <button type="button" onClick={() => setMenuOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-surface-2" aria-label="Open admin menu">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin menu" variant="drawer">
        <div className="space-y-5">
          {userCard}
          {navList(() => setMenuOpen(false))}
          <div className="space-y-1 border-t border-line pt-4">
            <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-fg-soft hover:bg-surface-2">
              <ExternalLink className="h-5 w-5" aria-hidden /> View website
            </a>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 font-semibold text-fg-soft hover:bg-surface-2"
            >
              <LogOut className="h-5 w-5" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </Dialog>

      <main className="pb-24 lg:ml-64 lg:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Admin quick navigation" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottomNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted')
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">You don't have access to this page</h1>
        <p className="mt-2 text-sm text-muted">Your role doesn't include this area. Ask the dealership owner if you need access.</p>
        <ButtonLink to="/admin" className="mt-6">
          Back to dashboard
        </ButtonLink>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
