import { PageHero } from '@/components/sections/PageHero';
import { ContactBand } from '@/components/sections/ContactBand';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { DEFAULT_WHY_CHOOSE_US, WHY_CHOOSE_US_ICONS } from '@/lib/whyChooseUs';
import { TEAM, type TeamMember } from '@/lib/team';
import { buildGeneralWhatsAppMessage, buildMailtoLink, buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { FacebookIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { Mail, MapPin, Phone } from 'lucide-react';

/** Neutral placeholder shown until the owner adds the dealership's own story in Settings. */
const PLACEHOLDER_BODY =
  'Goddel Motors is a car dealership helping customers find the right vehicle. Browse our current inventory online, check the details and photos for each car, then contact our team to ask questions or arrange a viewing.';

export function AboutPage() {
  const { settings } = useSettings();
  useDocumentMeta({ title: 'About Us', description: 'Learn about Goddel Motors and how to buy your next vehicle with us.', path: '/about' });

  const values = settings.whyChooseUs.length ? settings.whyChooseUs : DEFAULT_WHY_CHOOSE_US;

  return (
    <>
      <PageHero eyebrow="About us" title={`About ${settings.dealershipName}`}>
        Your trusted partner in finding your next vehicle.
      </PageHero>

      <section className="container-page mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Our story</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{settings.aboutHeading || 'Who we are'}</h2>
          <div className="mt-4 max-w-prose space-y-4 whitespace-pre-line leading-relaxed text-fg-soft">{settings.aboutBody || PLACEHOLDER_BODY}</div>
          <ButtonLink to="/cars" className="mt-6">
            Browse our inventory
          </ButtonLink>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-ink-950">
          <img
            src="/images/goddel-hero-1600.jpg"
            alt="A dark vehicle with blue accent lighting in a studio setting"
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover object-[70%_center]"
          />
        </div>
      </section>

      <section className="container-page mt-16" aria-labelledby="team-title">
        <p className="eyebrow">Our people</p>
        <h2 id="team-title" className="mt-1 text-2xl font-bold sm:text-3xl">
          Meet the team
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:max-w-4xl">
          {TEAM.map((member) => (
            <li key={member.name} className="card self-start overflow-hidden">
              <img
                src={member.photo.src}
                srcSet={member.photo.srcSet}
                sizes="(min-width: 1024px) 28rem, (min-width: 640px) 45vw, 92vw"
                alt={`${member.name}, ${member.role}`}
                width={member.photo.width}
                height={member.photo.height}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full bg-ink-950 object-cover object-top"
              />
              <div className="p-5 sm:p-6">
                <h3 className="text-lg font-bold">{member.name}</h3>
                <p className="text-sm font-semibold text-brand-500">{member.role}</p>
                <TeamContacts member={member} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-16" aria-labelledby="values-title">
        <h2 id="values-title" className="text-2xl font-bold sm:text-3xl">
          What you can expect
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((item, i) => {
            const Icon = WHY_CHOOSE_US_ICONS[i % WHY_CHOOSE_US_ICONS.length];
            return (
              <li key={item.title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-16">
        <ContactBand />
      </div>
    </>
  );
}

function TeamContacts({ member }: { member: TeamMember }) {
  const { settings } = useSettings();
  const greeting = buildGeneralWhatsAppMessage(settings.dealershipName);
  const row = 'flex items-center gap-2.5 text-sm text-fg-soft';
  const link = 'font-semibold text-fg hover:text-brand-500 hover:underline';
  if (!member.phones?.length && !member.email && !member.locations && !member.instagram && !member.facebook) return null;

  return (
    <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
      {member.phones?.map((phone) => (
        <li key={phone} className={row}>
          <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
          <a href={buildWhatsAppLink(phone, greeting)} target="_blank" rel="noopener noreferrer" className={link} aria-label={`WhatsApp ${member.name} on ${phone}`}>
            {phone}
          </a>
          <a href={buildTelLink(phone)} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Call ${member.name} on ${phone}`}>
            <Phone className="h-4 w-4" aria-hidden />
          </a>
        </li>
      ))}
      {member.email && (
        <li className={row}>
          <Mail className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
          <a href={buildMailtoLink(member.email)} className={`${link} break-all`}>
            {member.email}
          </a>
        </li>
      )}
      {member.locations && (
        <li className={row}>
          <MapPin className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
          <span>{member.locations}</span>
        </li>
      )}
      {member.instagram && (
        <li className={row}>
          <InstagramIcon className="h-4 w-4 shrink-0 text-brand-500" />
          <a href={`https://www.instagram.com/${member.instagram}/`} target="_blank" rel="noopener noreferrer" className={link}>
            @{member.instagram}
          </a>
        </li>
      )}
      {member.facebook && (
        <li className={row}>
          <FacebookIcon className="h-4 w-4 shrink-0 text-brand-500" />
          <a href={member.facebook.url} target="_blank" rel="noopener noreferrer" className={link}>
            {member.facebook.label}
          </a>
        </li>
      )}
    </ul>
  );
}
