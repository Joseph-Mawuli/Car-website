import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/format';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp' | 'danger' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-ink-950 shadow-primary hover:bg-brand-300 active:bg-brand-600',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
  outline: 'border border-brand-500/70 bg-transparent text-fg hover:border-brand-300 hover:bg-brand-500/10 hover:text-brand-300',
  ghost: 'bg-transparent text-fg-soft hover:bg-surface-2 hover:text-fg',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-dark',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  onDark: 'border border-brand-500/60 bg-black/30 text-white backdrop-blur hover:border-brand-300 hover:bg-brand-500/10 hover:text-brand-300',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-4 text-sm gap-1.5 rounded-full',
  md: 'min-h-11 px-5 text-[15px] gap-2 rounded-full',
  lg: 'min-h-12 px-7 text-base gap-2 rounded-full',
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
