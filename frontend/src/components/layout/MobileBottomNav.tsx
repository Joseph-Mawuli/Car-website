import { NavLink } from 'react-router';
import { Car, Home, Mail, Phone } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { cn } from '@/lib/format';

const itemClass = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold';

/** Thumb-reachable primary navigation for phones. Hidden from tablet width up. */
export function MobileBottomNav() {
  const { settings } = useSettings();
  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="flex">
        {[
          { to: '/', label: 'Home', icon: Home, end: true },
          { to: '/cars', label: 'Cars', icon: Car, end: false },
          { to: '/contact', label: 'Contact', icon: Mail, end: true },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(itemClass, isActive ? 'text-brand-500' : 'text-muted')}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
        {settings.phone && (
          <a href={buildTelLink(settings.phone)} className={cn(itemClass, 'text-muted')}>
            <Phone className="h-5 w-5" aria-hidden />
            Call
          </a>
        )}
        {settings.whatsapp && (
          <a
            href={buildWhatsAppLink(settings.whatsapp, 'Hello Goddel Motors, I would like to enquire about your vehicles.')}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(itemClass, 'text-whatsapp')}
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
        )}
      </div>
    </nav>
  );
}
