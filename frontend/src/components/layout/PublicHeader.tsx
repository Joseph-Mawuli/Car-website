import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Menu, Phone, Search } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { CurrencySwitcher } from './CurrencySwitcher';
import { Dialog } from '@/components/ui/Dialog';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { cn } from '@/lib/format';

export const PUBLIC_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Cars', end: false },
  { to: '/about', label: 'About Us', end: true },
  { to: '/contact', label: 'Contact', end: true },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3 md:h-[76px]">
        <Link to="/" className="rounded-lg" aria-label={`${settings.dealershipName} home`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="mx-auto hidden items-center gap-2 md:flex">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-2 text-[15px] font-semibold transition-colors',
                  'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-500 after:transition-transform after:duration-200',
                  isActive ? 'text-brand-500 after:scale-x-100' : 'text-fg-soft after:scale-x-0 hover:text-brand-300',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            to="/cars?focus=search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-soft transition-colors hover:bg-surface-2 hover:text-brand-300"
            aria-label="Search cars"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <CurrencySwitcher />
          <ButtonLink to="/contact" size="sm" className="ml-2 hidden md:inline-flex">
            Enquire Now
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-brand-500 hover:bg-surface-2 md:hidden"
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
                  'rounded-xl border-l-2 px-4 py-3.5 text-base font-semibold transition-colors',
                  isActive ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-transparent text-fg hover:bg-surface-2 hover:text-brand-300',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
          <ButtonLink to="/contact" onClick={() => setMenuOpen(false)}>
            Enquire Now
          </ButtonLink>
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
        </div>
      </Dialog>
    </header>
  );
}
