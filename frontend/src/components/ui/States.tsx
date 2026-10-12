import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/format';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} className="[&_svg]:h-7 [&_svg]:w-7" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card flex flex-col items-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
  className,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('card flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'error' | 'warning'; children: ReactNode; className?: string }) {
  const tones = {
    info: 'border-brand-500/30 bg-brand-500/8 text-fg-soft',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
    error: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      {children}
    </div>
  );
}
