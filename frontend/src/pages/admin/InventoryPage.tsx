import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Archive, ArchiveRestore, CarFront, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { AvailabilityBadge, Badge, VisibilityBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { VehicleImage } from '@/features/inventory/VehicleImage';
import { useQuery } from '@/hooks/useQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage } from '@/lib/api';
import { AVAILABILITY_LABELS, VISIBILITY_LABELS, optionsFrom } from '@/lib/labels';
import { formatPrice, formatRelative } from '@/lib/format';
import type { AdminVehicle, AvailabilityStatus, Visibility } from '@/types';

type PendingAction = { kind: 'archive' | 'restore' | 'delete'; vehicle: AdminVehicle } | null;

export function InventoryPage() {
  const { can } = useAuth();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const availability = (params.get('availability') as AvailabilityStatus | null) ?? undefined;
  const visibility = (params.get('visibility') as Visibility | null) ?? undefined;
  const page = Number(params.get('page') ?? 1) || 1;
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const query = { q: debouncedQ || undefined, availability, visibility, page, limit: 20 };
  const { data, error, isLoading, reload } = useQuery(`admin-vehicles:${JSON.stringify(query)}`, (signal) => adminApi.listVehicles(query, signal));

  const setParam = (key: string, value?: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'archive') await adminApi.archiveVehicle(pending.vehicle.id);
      if (pending.kind === 'restore') await adminApi.restoreVehicle(pending.vehicle.id);
      if (pending.kind === 'delete') await adminApi.deleteVehicle(pending.vehicle.id);
      notify(
        pending.kind === 'delete'
          ? `${pending.vehicle.title} was deleted`
          : pending.kind === 'archive'
            ? `${pending.vehicle.title} was archived`
            : `${pending.vehicle.title} was restored as a draft`,
      );
      setPending(null);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const visibilityOptions = optionsFrom(VISIBILITY_LABELS).filter((o) => o.value !== 'archived' || can('vehicles:archive'));

  const rowActions = (v: AdminVehicle) => (
    <div className="flex items-center justify-end gap-1">
      {v.visibility === 'published' && (
        <a href={`/cars/${v.slug}`} target="_blank" rel="noopener" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`View ${v.title} on the website`}>
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
      <Link to={`/admin/inventory/${v.id}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`${can('vehicles:write') ? 'Edit' : 'View'} ${v.title}`}>
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
      {can('vehicles:archive') &&
        (v.visibility === 'archived' ? (
          <button type="button" onClick={() => setPending({ kind: 'restore', vehicle: v })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Restore ${v.title}`}>
            <ArchiveRestore className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={() => setPending({ kind: 'archive', vehicle: v })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Archive ${v.title}`}>
            <Archive className="h-4 w-4" aria-hidden />
          </button>
        ))}
      {can('vehicles:delete') && (
        <button type="button" onClick={() => setPending({ kind: 'delete', vehicle: v })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-red-500/10 hover:text-danger" aria-label={`Delete ${v.title}`}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description={data ? `${data.total} vehicle${data.total === 1 ? '' : 's'}` : 'Manage vehicle listings'}
        actions={
          can('vehicles:write') && (
            <ButtonLink to="/admin/inventory/new">
              <Plus className="h-4 w-4" aria-hidden /> Add vehicle
            </ButtonLink>
          )
        }
      />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <label htmlFor="inv-search" className="sr-only">
            Search inventory
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="inv-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (params.get('page')) setParam('page');
            }}
            placeholder="Search make, model, trim…"
            className="field-input pl-10"
          />
        </div>
        <label className="sr-only" htmlFor="inv-availability">
          Availability
        </label>
        <select id="inv-availability" className="field-input" value={availability ?? ''} onChange={(e) => setParam('availability', e.target.value || undefined)}>
          <option value="">All availability</option>
          {optionsFrom(AVAILABILITY_LABELS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="inv-visibility">
          Visibility
        </label>
        <select id="inv-visibility" className="field-input" value={visibility ?? ''} onChange={(e) => setParam('visibility', e.target.value || undefined)}>
          <option value="">Published &amp; drafts</option>
          {visibilityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} title="Could not load inventory" />
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<CarFront className="h-7 w-7" aria-hidden />}
          title={debouncedQ || availability || visibility ? 'No vehicles match these filters' : 'No vehicles yet'}
          description={can('vehicles:write') ? 'Add your first vehicle to start building the inventory.' : undefined}
          action={
            can('vehicles:write') && !(debouncedQ || availability || visibility) ? <ButtonLink to="/admin/inventory/new">Add vehicle</ButtonLink> : undefined
          }
        />
      ) : (
        <div className={isLoading ? 'opacity-60' : undefined}>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((v) => (
              <li key={v.id} className="card p-3">
                <div className="flex gap-3">
                  <Link to={`/admin/inventory/${v.id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-3">
                    <VehicleImage image={v.images[0]} alt={v.title} sizes="96px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/inventory/${v.id}`} className="line-clamp-2 font-semibold leading-snug">
                      {v.title}
                    </Link>
                    <p className="mt-0.5 whitespace-nowrap text-sm font-bold text-brand-500">{formatPrice(v.price, v.currency)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <AvailabilityBadge status={v.availabilityStatus} />
                      {v.visibility !== 'published' && <VisibilityBadge visibility={v.visibility} />}
                      {v.isDemo && <Badge tone="amber">Demo</Badge>}
                    </div>
                  </div>
                </div>
                <div className="-mb-1 mt-2 border-t border-line pt-1">{rowActions(v)}</div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Vehicle
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Photos
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                          <VehicleImage image={v.images[0]} alt={v.title} sizes="64px" />
                        </div>
                        <div className="min-w-0">
                          <Link to={`/admin/inventory/${v.id}`} className="font-semibold hover:underline">
                            {v.title}
                          </Link>
                          {v.trim && <p className="text-xs text-muted">{v.trim}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatPrice(v.price, v.currency)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <AvailabilityBadge status={v.availabilityStatus} />
                        {v.visibility !== 'published' && <VisibilityBadge visibility={v.visibility} />}
                        {v.isDemo && <Badge tone="amber">Demo</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{v.images.length}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatRelative(v.updatedAt)}</td>
                    <td className="px-4 py-3">{rowActions(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setParam('page', p > 1 ? String(p) : undefined)} />
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? 'Delete vehicle permanently?' : pending?.kind === 'archive' ? 'Archive vehicle?' : 'Restore vehicle?'}
        description={
          pending?.kind === 'delete' ? (
            <>
              <strong>{pending.vehicle.title}</strong> and all of its photos will be permanently deleted. This cannot be undone. Consider archiving instead if you may need
              the record later.
            </>
          ) : pending?.kind === 'archive' ? (
            <>
              <strong>{pending.vehicle.title}</strong> will be hidden from the public website. You can restore it later.
            </>
          ) : (
            <>
              <strong>{pending?.vehicle.title}</strong> will be restored as a draft. Publish it from the edit page when ready.
            </>
          )
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete permanently' : pending?.kind === 'archive' ? 'Archive' : 'Restore'}
        tone={pending?.kind === 'delete' ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
