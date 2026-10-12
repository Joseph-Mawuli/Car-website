import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/format';

export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl text-fg-soft transition-colors hover:bg-surface-2 hover:text-fg',
        showLabel && 'px-3',
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
      {showLabel && <span className="text-sm font-semibold">{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
