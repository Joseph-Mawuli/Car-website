import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { PageHero } from '@/components/sections/PageHero';
import { EnquiryForm } from '@/features/enquiries/EnquiryForm';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { buildGeneralWhatsAppMessage, buildMailtoLink, buildTelLink, buildWhatsAppLink, contactNumbers } from '@/lib/contact';

const DEFAULT_PRIVACY =
  'We only use the details you submit (your name, phone number, optional email address and message) to respond to your enquiry about our vehicles. Your details are stored securely, are only accessible to authorised Goddel Motors staff, and are not sold or shared with third parties for marketing. Once your enquiry has been dealt with, we keep it for a limited period and then delete it automatically. To ask us to update or delete your details, contact us using the information on this page.';

function ContactItem({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">{icon}</div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-0.5 text-[15px] text-fg-soft">{children}</div>
      </div>
    </li>
  );
}

export function ContactPage() {
  const { settings } = useSettings();
  const { hash } = useLocation();
  useDocumentMeta({ title: 'Contact Us', description: 'Contact Goddel Motors by WhatsApp, phone or enquiry form.', path: '/contact' });

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const numbers = contactNumbers(settings);
  const whatsAppMessage = buildGeneralWhatsAppMessage(settings.dealershipName);
  const hasDirectContact = numbers.length > 0 || settings.email || settings.address;

  return (
    <>
      <PageHero eyebrow="Contact" title="Get in Touch">
        We're here to help. Reach out through any of the channels below.
      </PageHero>

      <div className="container-page mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-6" aria-labelledby="contact-info-title">
          <h2 id="contact-info-title" className="text-lg font-semibold">
            Contact information
          </h2>
          {hasDirectContact ? (
            <ul className="mt-6 space-y-6">
              {numbers.length > 0 && (
                <ContactItem icon={<WhatsAppIcon className="h-5 w-5" />} title="WhatsApp & phone">
                  <p className="text-sm text-muted">Tap a number to chat with us on WhatsApp.</p>
                  <ul className="mt-2 space-y-2">
                    {numbers.map((phone) => (
                      <li key={phone} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a
                          href={buildWhatsAppLink(phone, whatsAppMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 font-semibold text-fg hover:text-brand-300 hover:underline"
                          aria-label={`Chat on WhatsApp: ${phone}`}
                        >
                          <WhatsAppIcon className="h-4 w-4" /> {phone}
                        </a>
                        <a
                          href={buildTelLink(phone)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-300 hover:underline"
                          aria-label={`Call ${phone}`}
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden /> Call
                        </a>
                      </li>
                    ))}
                  </ul>
                </ContactItem>
              )}
              {settings.email && (
                <ContactItem icon={<Mail className="h-5 w-5" aria-hidden />} title="Email">
                  <a href={buildMailtoLink(settings.email, 'Vehicle enquiry')} className="break-all font-semibold hover:underline">
                    {settings.email}
                  </a>
                </ContactItem>
              )}
              {settings.address && (
                <ContactItem icon={<MapPin className="h-5 w-5" aria-hidden />} title="Location">
                  <p className="whitespace-pre-line">{settings.address}</p>
                  {settings.mapUrl && (
                    <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-300 hover:underline">
                      Open in maps <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </ContactItem>
              )}
              {settings.openingHours.length > 0 && (
                <ContactItem icon={<Clock className="h-5 w-5" aria-hidden />} title="Opening hours">
                  <ul className="space-y-0.5">
                    {settings.openingHours.map((h) => (
                      <li key={h.label}>
                        {h.label}: {h.hours}
                      </li>
                    ))}
                  </ul>
                </ContactItem>
              )}
            </ul>
          ) : (
            <p className="mt-4 text-muted">Use the form to send us a message and our team will get back to you.</p>
          )}
        </section>

        <section className="card p-6" aria-labelledby="message-title">
          <h2 id="message-title" className="text-lg font-semibold">
            Send us a message
          </h2>
          <p className="mt-1 text-sm text-muted">Ask about a vehicle, availability, or arranging a viewing.</p>
          <EnquiryForm className="mt-5" />
        </section>
      </div>

      <section id="privacy" className="container-page mt-12 scroll-mt-24" aria-labelledby="privacy-title">
        <div className="card max-w-3xl p-6">
          <h2 id="privacy-title" className="text-lg font-semibold">
            Privacy notice
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-soft">{settings.privacyNotice || DEFAULT_PRIVACY}</p>
        </div>
      </section>
    </>
  );
}
