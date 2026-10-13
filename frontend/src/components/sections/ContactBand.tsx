import { Mail, Phone } from 'lucide-react';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildTelLink, buildGeneralWhatsAppMessage, buildWhatsAppLink } from '@/lib/contact';

export function ContactBand({ title = 'Get in touch', body = 'Have a question about a vehicle or want to arrange a viewing? Reach us directly.' }: { title?: string; body?: string }) {
  const { settings } = useSettings();
  return (
    <section aria-labelledby="contact-band-title" className="container-page">
      <div className="relative isolate overflow-hidden rounded-3xl border border-brand-500/25 bg-ink-900 px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div aria-hidden className="hero-streaks pointer-events-none absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-24 -z-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div className="relative max-w-xl">
          <h2 id="contact-band-title" className="text-2xl font-bold text-brand-500 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-white/75">{body}</p>
        </div>
        <div className="relative mt-6 flex flex-col gap-3 whitespace-nowrap sm:flex-row sm:flex-wrap lg:mt-0 lg:shrink-0 lg:flex-nowrap">
          <ButtonLink to="/contact" size="lg">
            <Mail className="h-5 w-5" aria-hidden /> Enquire Now
          </ButtonLink>
          {settings.whatsapp && (
            <AnchorButton
              href={buildWhatsAppLink(settings.whatsapp, buildGeneralWhatsAppMessage(settings.dealershipName))}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp us
            </AnchorButton>
          )}
          {settings.phone && (
            <AnchorButton href={buildTelLink(settings.phone)} variant="onDark" size="lg">
              <Phone className="h-5 w-5" aria-hidden /> Call now
            </AnchorButton>
          )}
        </div>
      </div>
    </section>
  );
}
