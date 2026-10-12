import { useSearchParams } from 'react-router';
import { FileClock } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useQuery } from '@/hooks/useQuery';
import { formatDate } from '@/lib/format';

function actionLabel(action: string): string {
  const text = action.replace(/[._]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const { data, error, isLoading, reload } = useQuery(`audit:${page}`, (signal) => adminApi.auditLogs(page, signal));

  return (
    <>
      <AdminPageHeader title="Audit log" description="A record of security-sensitive and inventory actions by staff." />
      {error ? (
        <ErrorState error={error} onRetry={reload} title="Could not load the audit log" />
      ) : !data ? (
        <PageLoader />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<FileClock className="h-7 w-7" aria-hidden />} title="No activity recorded yet" />
      ) : (
        <div className={isLoading ? 'opacity-60' : undefined}>
          <ol className="card divide-y divide-line">
            {data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-4">
                <time dateTime={entry.createdAt} className="shrink-0 text-xs text-muted sm:w-40 sm:pt-0.5">
                  {formatDate(entry.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </time>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{actionLabel(entry.action)}</p>
                  {entry.summary && <p className="text-sm text-fg-soft">{entry.summary}</p>}
                  <p className="truncate text-xs text-muted">{entry.actorEmail}</p>
                </div>
              </li>
            ))}
          </ol>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
        </div>
      )}
    </>
  );
}
