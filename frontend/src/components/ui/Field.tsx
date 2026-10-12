import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
  hideLabel?: boolean;
}

export function FieldWrapper({ label, error, hint, required, children, className, hideLabel }: FieldWrapperProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn('field-label', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode; hideLabel?: boolean; wrapperClassName?: string };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, required, hideLabel, wrapperClassName, className, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} hideLabel={hideLabel} className={wrapperClassName}>
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn('field-input', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode; wrapperClassName?: string };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaProps>(function TextAreaField(
  { label, error, hint, required, wrapperClassName, className, rows = 4, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn('field-input resize-y', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  hideLabel?: boolean;
  wrapperClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, hint, required, hideLabel, wrapperClassName, className, options, placeholder, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} hideLabel={hideLabel} className={wrapperClassName}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn('field-input appearance-none pr-10', className)}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      )}
    </FieldWrapper>
  );
});

export function Checkbox({
  label,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-fg-soft">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong accent-brand-500"
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
