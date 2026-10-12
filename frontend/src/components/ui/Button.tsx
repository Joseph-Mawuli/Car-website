import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/format';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp' | 'danger' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-primary hover:bg-brand-600 active:bg-brand-700',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
  outline: 'border border-line-strong bg-transparent text-fg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400',
  ghost: 'bg-transparent text-fg-soft hover:bg-surface-2 hover:text-fg',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-dark',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  onDark: 'border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/15',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'min-h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'min-h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-11 w-11 rounded-xl',
};

/** Unprefixed display utilities; when a caller passes one, the default `inline-flex` must be dropped or it wins in the generated CSS. */
const DISPLAY_OVERRIDE = /(^|\s)(hidden|flex|block|grid|inline-block)(\s|$)/;

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    !className || !DISPLAY_OVERRIDE.test(className) ? 'inline-flex' : false,
    'items-center justify-center font-semibold transition-colors duration-150 select-none',
    'disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, leftIcon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

interface AnchorButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function AnchorButton({ variant, size, className, ...rest }: AnchorButtonProps) {
  return <a className={buttonClasses(variant, size, className)} {...rest} />;
}
