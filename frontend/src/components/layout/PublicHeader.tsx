import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Menu, Phone, Search } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from './ThemeToggle';
import { CurrencySwitcher } from './CurrencySwitcher';
import { Dialog } from '@/components/ui/Dialog';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { cn } from '@/lib/format';

export const PUBLIC_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Browse Cars', end: false },
  { to: '/about', label: 'About', end: true },
  { to: '/contact', label: 'Contact', end: true },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div className="container-page flex h-16 items-center gap-3 md:h-[72px]">
        <Link to="/" className="rounded-lg" aria-label="Goddel Motors home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="ml-8 hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors',
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-fg-soft hover:text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/cars?focus=search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-soft hover:bg-surface-2 hover:text-fg"
            aria-label="Search cars"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <CurrencySwitcher />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {settings.whatsapp && (
            <AnchorButton
              href={buildWhatsAppLink(settings.whatsapp, 'Hello Goddel Motors, I would like to enquire about your vehicles.')}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              size="sm"
              className="ml-1 hidden lg:inline-flex"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </AnchorButton>
          )}
          <ButtonLink to="/cars" size="sm" className="ml-1 hidden md:inline-flex">
            Browse Cars
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg hover:bg-surface-2 md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" variant="drawer">
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-4 py-3.5 text-base font-semibold',
                  isActive ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-fg hover:bg-surface-2',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
          {settings.whatsapp && (
            <AnchorButton href={buildWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" variant="whatsapp">
              <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
            </AnchorButton>
          )}
          {settings.phone && (
            <AnchorButton href={buildTelLink(settings.phone)} variant="outline">
              <Phone className="h-5 w-5" aria-hidden /> Call {settings.phone}
            </AnchorButton>
          )}
          <ThemeToggle showLabel className="justify-start" />
        </div>
      </Dialog>
    </header>
  );
}
