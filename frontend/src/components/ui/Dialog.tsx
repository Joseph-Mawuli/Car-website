import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/format';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `sheet` = bottom sheet on mobile / centered on desktop; `drawer` = side panel. */
  variant?: 'sheet' | 'drawer' | 'fullscreen';
  side?: 'left' | 'right';
  className?: string;
  hideTitle?: boolean;
}

/**
 * Built on the native <dialog> element so focus trapping, Escape handling and the
 * inert backdrop come from the browser rather than custom code.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'sheet',
  side = 'right',
  className,
  hideTitle,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!open && el.open) {
      el.close();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const layout = {
    sheet:
      'm-0 mt-auto w-full max-w-none rounded-t-3xl sm:m-auto sm:max-w-lg sm:rounded-2xl max-h-[92dvh] backdrop:bg-black/60',
    drawer: cn(
      'm-0 h-dvh max-h-none w-[min(88vw,380px)] max-w-none backdrop:bg-black/60',
      side === 'right' ? 'ml-auto rounded-l-2xl' : 'mr-auto rounded-r-2xl',
    ),
    fullscreen: 'm-0 h-dvh max-h-none w-screen max-w-none bg-ink-950 text-white backdrop:bg-black',
  }[variant];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={cn(
        'border border-line bg-surface p-0 text-fg shadow-2xl backdrop:backdrop-blur-[2px] open:flex open:flex-col',
        layout,
        className,
      )}
    >
      {open && (
        <>
          <div className={cn('flex items-start gap-3 px-5 pt-5', hideTitle && 'sr-only')}>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2">
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'danger', loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onCancel()}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] text-fg-soft">{description}</div>
    </Dialog>
  );
}
