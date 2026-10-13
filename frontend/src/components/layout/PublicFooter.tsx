import { Link } from 'react-router';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND_SLOGAN, Logo } from '@/components/brand/Logo';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { allPhones, buildMailtoLink, buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { PUBLIC_NAV } from './PublicHeader';

export function PublicFooter() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink-950 text-white/80">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo inverted showSlogan={false} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            {settings.tagline || `${BRAND_SLOGAN}.`}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-brand-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {allPhones(settings).map((phone) => (
              <li key={phone}>
                <a href={buildTelLink(phone)} className="inline-flex items-center gap-2 hover:text-brand-300">
                  <Phone className="h-4 w-4" aria-hidden /> {phone}
                </a>
              </li>
            ))}
            {settings.whatsapp && (
              <li>
                <a
                  href={buildWhatsAppLink(settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-brand-300"
                >
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={buildMailtoLink(settings.email)} className="inline-flex items-center gap-2 break-all hover:text-brand-300">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden /> {settings.email}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{settings.address}</span>
              </li>
            )}
            {!settings.phone && !settings.whatsapp && !settings.email && (
              <li>
                <Link to="/contact" className="hover:text-brand-300">
                  Send us an enquiry
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          {settings.openingHours.length > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Opening hours</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {settings.openingHours.map((entry) => (
                  <li key={entry.label} className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <span className="text-white">{entry.label}:</span> {entry.hours}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {settings.socialLinks.length > 0 && (
            <>
              <h2 className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-white">Follow us</h2>
              <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                {settings.socialLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-300">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Goddel Motors. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {settings.exchangeRates?.sourceUrl && (
              <a href={settings.exchangeRates.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/80">
                Rates by {settings.exchangeRates.source ?? 'Exchange Rate API'}
              </a>
            )}
            <Link to="/contact#privacy" className="hover:text-white/80">
              Privacy notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
