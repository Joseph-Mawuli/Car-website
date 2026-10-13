import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Inbox, Search } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { EnquiryStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useQuery } from '@/hooks/useQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ENQUIRY_STATUS_LABELS } from '@/lib/labels';
import { formatRelative, cn } from '@/lib/format';
import type { EnquiryStatus } from '@/types';

const TABS: { value: EnquiryStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  ...(Object.keys(ENQUIRY_STATUS_LABELS) as EnquiryStatus[]).map((s) => ({ value: s, label: ENQUIRY_STATUS_LABELS[s] })),
];

export function EnquiriesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const status = (params.get('status') as EnquiryStatus | null) ?? undefined;
  const assigned = params.get('assigned') ?? undefined;
  const page = Number(params.get('page') ?? 1) || 1;

  const query = { q: debouncedQ || undefined, status, assigned, page };
  const { data, error, isLoading, reload } = useQuery(`admin-enquiries:${JSON.stringify(query)}`, (signal) => adminApi.listEnquiries(query, signal));

  const setParam = (key: string, value?: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });

  return (
    <>
      <AdminPageHeader title="Enquiries" description="Customer messages from the website. Contact details are confidential." />

      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button
            key={t.value || 'all'}
            type="button"
            role="tab"
            aria-selected={(status ?? '') === t.value}
            onClick={() => setParam('status', t.value || undefined)}
            className={cn(
              'min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold',
              (status ?? '') === t.value ? 'border-brand-500 bg-brand-500 text-ink-950' : 'border-line bg-surface text-fg-soft hover:border-brand-500',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="enq-search" className="sr-only">
            Search enquiries
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="enq-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email or vehicle" className="field-input pl-10" />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-fg-soft">
          <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={assigned === 'me'} onChange={(e) => setParam('assigned', e.target.checked ? 'me' : undefined)} />
          Assigned to me
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} title="Could not load enquiries" />
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-7 w-7" aria-hidden />} title="No enquiries found" description={status || debouncedQ || assigned ? 'Try a different filter.' : 'New website enquiries will appear here.'} />
      ) : (
        <div className={isLoading ? 'opacity-60' : undefined}>
          <ul className="space-y-3 md:hidden">
            {data.items.map((e) => (
              <li key={e.id}>
                <Link to={`/admin/enquiries/${e.id}`} className="card block p-4 hover:border-brand-500/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.name}</p>
                      <p className="truncate text-sm text-muted">{e.vehicle?.title ?? 'General enquiry'}</p>
                    </div>
                    <EnquiryStatusBadge status={e.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-fg-soft">{e.message}</p>
                  <p className="mt-2 text-xs text-muted">
                    {formatRelative(e.createdAt)}
                    {e.assignedTo && ` · ${e.assignedTo.name}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vehicle</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Assigned</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/enquiries/${e.id}`} className="font-semibold hover:underline">
                        {e.name}
                      </Link>
                      <p className="text-xs text-muted">{e.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-fg-soft">{e.vehicle?.title ?? <span className="text-muted">General</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatRelative(e.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">{e.assignedTo?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EnquiryStatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setParam('page', p > 1 ? String(p) : undefined)} />
        </div>
      )}
    </>
  );
}
