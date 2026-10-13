import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FileClock, Trash2 } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AuditLogEntry } from '@/types';

function actionLabel(action: string): string {
  const text = action.replace(/[._]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AuditLogPage() {
  const { can } = useAuth();
  const { notify } = useToast();
  const canDelete = can('audit:delete');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const { data, error, isLoading, reload, setData } = useQuery(`audit:${page}`, (signal) => adminApi.auditLogs(page, signal));
  const [confirm, setConfirm] = useState<{ kind: 'one'; entry: AuditLogEntry } | { kind: 'all' } | null>(null);

  // The list updates as soon as the owner confirms; the server catches up in the background.
  const onConfirm = async () => {
    if (!confirm || !data) return;
    const action = confirm;
    const previous = data;
    setConfirm(null);
    try {
      if (action.kind === 'one') {
        setData((d) => (d ? { ...d, items: d.items.filter((i) => i.id !== action.entry.id), total: Math.max(0, d.total - 1) } : d!));
        await adminApi.deleteAuditLog(action.entry.id);
        notify('Audit entry deleted');
        if (previous.items.length === 1 && page > 1) setParams(page - 1 > 1 ? { page: String(page - 1) } : {});
      } else {
        setData((d) => ({ ...d!, items: [], total: 0, page: 1, totalPages: 1 }));
        const { removed } = await adminApi.clearAuditLog();
        notify(`Audit log cleared — ${removed} ${removed === 1 ? 'entry' : 'entries'} removed`);
        if (page > 1) setParams({});
        else reload();
      }
    } catch (err) {
      setData(previous);
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="A record of security-sensitive and inventory actions by staff."
        actions={
          canDelete && data && data.total > 0 ? (
            <Button variant="outline" onClick={() => setConfirm({ kind: 'all' })} leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}>
              Clear all
            </Button>
          ) : undefined
        }
      />
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
              <li key={entry.id} className="flex items-start gap-3 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                  <time dateTime={entry.createdAt} className="shrink-0 text-xs text-muted sm:w-40 sm:pt-0.5">
                    {formatDate(entry.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </time>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{actionLabel(entry.action)}</p>
                    {entry.summary && <p className="text-sm text-fg-soft">{entry.summary}</p>}
                    <p className="truncate text-xs text-muted">{entry.actorEmail}</p>
                  </div>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete audit entry: ${actionLabel(entry.action)}`}
                    title="Delete entry"
                    onClick={() => setConfirm({ kind: 'one', entry })}
                    className="-my-1 shrink-0 text-muted hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ol>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'all' ? 'Clear the entire audit log?' : 'Delete this audit entry?'}
        description={
          confirm?.kind === 'all' ? (
            <>
              This permanently removes all {data?.total ?? ''} entries and can't be undone. A single entry will be kept showing that you cleared the log.
            </>
          ) : confirm?.kind === 'one' ? (
            <>
              “{actionLabel(confirm.entry.action)}”{confirm.entry.summary ? ` — ${confirm.entry.summary}` : ''} will be permanently removed.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={confirm?.kind === 'all' ? 'Clear all' : 'Delete entry'}
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
