import { Link } from 'react-router';
import { CarFront, CheckCircle2, Clock, Inbox, Plus, Settings, Tag, Users } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { AvailabilityBadge, EnquiryStatusBadge, VisibilityBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { useQuery } from '@/hooks/useQuery';
import { formatRelative, cn } from '@/lib/format';

function StatCard({ label, value, icon: Icon, tone, to }: { label: string; value: number | undefined; icon: typeof CarFront; tone: string; to?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-muted sm:text-sm">{label}</span>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl', tone)}>
          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden />
        </span>
      </div>
      {value === undefined ? (
        <div className="skeleton mt-2 h-7 w-10 sm:mt-3 sm:h-8 sm:w-12" />
      ) : (
        <p className="mt-1 font-display text-2xl font-bold leading-tight sm:mt-2 sm:text-3xl">{value}</p>
      )}
    </>
  );
  const className = 'card block px-3.5 py-3 last:odd:col-span-2 sm:p-5 sm:last:odd:col-span-1';
  return to ? (
    <Link to={to} className={cn(className, 'transition-colors hover:border-brand-500/50')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function DashboardPage() {
  const { staff, can } = useAuth();
  const { data, error, reload } = useQuery('admin-dashboard', (signal) => adminApi.dashboard(signal));

  if (error) return <ErrorState error={error} title="Could not load the dashboard" onRetry={reload} />;
  const v = data?.vehicles;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Welcome back${staff ? `, ${staff.displayName.split(' ')[0]}` : ''}.`}
        actions={
          can('vehicles:write') && (
            <ButtonLink to="/admin/inventory/new">
              <Plus className="h-4 w-4" aria-hidden /> Add vehicle
            </ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total vehicles" value={v?.total} icon={CarFront} tone="bg-brand-500/12 text-brand-500" to="/admin/inventory" />
        <StatCard label="Available" value={v?.available} icon={CheckCircle2} tone="bg-emerald-500/12 text-success" to="/admin/inventory?availability=available" />
        <StatCard label="Reserved" value={v?.reserved} icon={Clock} tone="bg-warning/14 text-warning" to="/admin/inventory?availability=reserved" />
        <StatCard label="Sold" value={v?.sold} icon={Tag} tone="bg-red-500/12 text-danger" to="/admin/inventory?availability=sold" />
        {can('enquiries:read') && (
          <StatCard label="New enquiries" value={data?.enquiries?.new} icon={Inbox} tone="bg-violet-500/12 text-violet-600" to="/admin/enquiries?status=new" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {can('enquiries:read') ? (
          <section className="card overflow-hidden" aria-labelledby="recent-enquiries">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="recent-enquiries" className="font-semibold">
                Recent enquiries
              </h2>
              <Link to="/admin/enquiries" className="text-sm font-semibold text-brand-500 hover:text-brand-300 hover:underline">
                View all
              </Link>
            </div>
            {!data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton h-10" />
                ))}
              </div>
            ) : data.recentEnquiries && data.recentEnquiries.length > 0 ? (
              <ul className="divide-y divide-line">
                {data.recentEnquiries.map((e) => (
                  <li key={e.id}>
                    <Link to={`/admin/enquiries/${e.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.name}</p>
                        <p className="truncate text-sm text-muted">{e.vehicle?.title ?? 'General enquiry'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <EnquiryStatusBadge status={e.status} />
                        <span className="text-xs text-muted">{formatRelative(e.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">No enquiries yet.</p>
            )}
          </section>
        ) : (
          <section className="card overflow-hidden" aria-labelledby="recent-updates-main">
            <h2 id="recent-updates-main" className="border-b border-line px-5 py-4 font-semibold">
              Inventory overview
            </h2>
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div>
                <dt className="text-muted">Drafts (not public)</dt>
                <dd className="mt-1 font-display text-2xl font-bold">{v?.draft ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Archived</dt>
                <dd className="mt-1 font-display text-2xl font-bold">{v?.archived ?? '—'}</dd>
              </div>
            </dl>
          </section>
        )}

        <div className="space-y-6">
          <section className="card overflow-hidden" aria-labelledby="recent-updates">
            <h2 id="recent-updates" className="border-b border-line px-5 py-4 font-semibold">
              Recent inventory updates
            </h2>
            {!data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="skeleton h-9" />
                ))}
              </div>
            ) : data.recentVehicles.length ? (
              <ul className="divide-y divide-line">
                {data.recentVehicles.map((r) => (
                  <li key={r.id}>
                    <Link to={`/admin/inventory/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        <p className="text-xs text-muted">Updated {formatRelative(r.updatedAt)}</p>
                      </div>
                      {r.visibility !== 'published' ? <VisibilityBadge visibility={r.visibility} /> : <AvailabilityBadge status={r.availabilityStatus} />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">No vehicles yet.</p>
            )}
          </section>

          <section className="card p-5" aria-labelledby="quick-actions">
            <h2 id="quick-actions" className="font-semibold">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-2">
              {can('vehicles:write') && (
                <ButtonLink to="/admin/inventory/new" variant="secondary" className="justify-start">
                  <Plus className="h-4 w-4" aria-hidden /> Add new vehicle
                </ButtonLink>
              )}
              {can('enquiries:read') && (
                <ButtonLink to="/admin/enquiries?assigned=me" variant="secondary" className="justify-start">
                  <Inbox className="h-4 w-4" aria-hidden /> My assigned enquiries
                </ButtonLink>
              )}
              {can('staff:manage') && (
                <ButtonLink to="/admin/team" variant="secondary" className="justify-start">
                  <Users className="h-4 w-4" aria-hidden /> Manage team
                </ButtonLink>
              )}
              {can('settings:manage') && (
                <ButtonLink to="/admin/settings" variant="secondary" className="justify-start">
                  <Settings className="h-4 w-4" aria-hidden /> Site settings
                </ButtonLink>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
