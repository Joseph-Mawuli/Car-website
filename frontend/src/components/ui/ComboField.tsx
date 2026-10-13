import { forwardRef, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FieldWrapper } from './Field';
import { cn } from '@/lib/format';

interface ComboFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  /** Suggestions shown in the list; any other text can still be typed. */
  options: string[];
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
}

/** A text box with a pick list: choose a suggestion or type your own wording. */
export const ComboField = forwardRef<HTMLInputElement, ComboFieldProps>(function ComboField(
  { label, value, onChange, onBlur, name, options, placeholder, hint, error, className },
  ref,
) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const query = filter?.trim().toLowerCase() ?? '';
  const shown = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  const typedIsCustom = value.trim() !== '' && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());

  const show = (all: boolean) => {
    setFilter(all ? null : value);
    setActive(-1);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = (option: string) => {
    onChange(option);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show(true);
      if (shown.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + shown.length) % shown.length);
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (active >= 0 && shown[active]) pick(shown[active]);
      else close();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <div className="relative">
          <input
            ref={ref}
            id={id}
            name={name}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setFilter(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => show(true)}
            onClick={() => !open && show(true)}
            onBlur={() => {
              close();
              onBlur?.();
            }}
            onKeyDown={onKeyDown}
            className={cn('field-input pr-10', className)}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? `Close ${label} suggestions` : `Show ${label} suggestions`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus();
              if (open) close();
              else show(true);
            }}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-fg"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </button>
          {open && (shown.length > 0 || typedIsCustom) && (
            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-card"
            >
              {shown.map((option, i) => {
                const selected = option.toLowerCase() === value.trim().toLowerCase();
                return (
                  <li
                    key={option}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(option)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm', i === active && 'bg-surface-2', selected && 'font-semibold text-brand-500')}
                  >
                    {option}
                    {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                  </li>
                );
              })}
              {typedIsCustom && (
                <li role="presentation" className="border-t border-line px-3 py-2 text-xs text-muted">
                  “{value.trim()}” isn't in the list — it will be saved as you typed it.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </FieldWrapper>
  );
});
