import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/format';

function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = 'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line px-3 text-sm font-semibold transition-colors';
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <button
        type="button"
        className={cn(btn, 'bg-surface hover:border-brand-500 disabled:opacity-40')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page ? 'border-brand-500 bg-brand-500 text-white' : 'bg-surface hover:border-brand-500', 'hidden sm:inline-flex', (p === page || p === 1 || p === totalPages) && 'inline-flex')}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(btn, 'bg-surface hover:border-brand-500 disabled:opacity-40')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
