import { ArrowRight } from 'lucide-react';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildWhatsAppLink } from '@/lib/contact';

/** Cinematic hero — intentionally dark in both light and dark themes. */
export function Hero() {
  const { settings } = useSettings();
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <picture>
        <source
          type="image/webp"
          srcSet="/images/goddel-hero-768.webp 768w, /images/goddel-hero-1280.webp 1280w, /images/goddel-hero-1920.webp 1920w"
          sizes="100vw"
        />
        <img
          src="/images/goddel-hero-1600.jpg"
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-90 sm:object-[65%_center]"
        />
      </picture>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10 md:bg-gradient-to-r md:from-ink-950 md:via-ink-950/65 md:to-transparent"
      />

      <div className="container-page flex min-h-[540px] flex-col justify-end pb-24 pt-28 sm:min-h-[580px] md:min-h-[620px] md:justify-center md:pb-32 md:pt-16">
        <p className="eyebrow !text-brand-300">{settings.dealershipName}</p>
        <h1 className="mt-3 max-w-xl text-[2.25rem] font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
          Find Your Next Car at <span className="text-brand-400">Goddel Motors</span>
        </h1>
        <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
          Browse our available vehicles with clear prices, photos and specifications — then talk to us directly.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/cars" size="lg">
            Browse Inventory <ArrowRight className="h-5 w-5" aria-hidden />
          </ButtonLink>
          {settings.whatsapp && (
            <AnchorButton
              href={buildWhatsAppLink(settings.whatsapp, 'Hello Goddel Motors, I would like to enquire about your vehicles.')}
              target="_blank"
              rel="noopener noreferrer"
              variant="onDark"
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
            </AnchorButton>
          )}
        </div>
      </div>
    </section>
  );
}
