import { PageHero } from '@/components/sections/PageHero';
import { ContactBand } from '@/components/sections/ContactBand';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettings } from '@/providers/SettingsProvider';
import { DEFAULT_WHY_CHOOSE_US, WHY_CHOOSE_US_ICONS } from '@/lib/whyChooseUs';

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
