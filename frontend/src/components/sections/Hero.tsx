import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useSettings } from '@/providers/SettingsProvider';
import { buildWhatsAppLink } from '@/lib/contact';

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
          className="hero-photo absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center] sm:object-[65%_center]"
        />
      </picture>
      <div aria-hidden className="hero-streaks absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/10 md:bg-gradient-to-r md:from-ink-950 md:via-ink-950/70 md:to-transparent"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-bg to-transparent" />

      <div className="container-page flex min-h-[560px] flex-col justify-end pb-24 pt-28 sm:min-h-[600px] md:min-h-[640px] md:justify-center md:pb-32 md:pt-16">
        <p className="eyebrow">Premium cars. Trusted dealership.</p>
        <h1 className="mt-4 max-w-2xl text-[2.5rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
          Find Your Dream <span className="text-gold">Car Today</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
          Quality vehicles with clear prices, real photos and full specifications at {settings.dealershipName}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink to="/cars" size="lg">
            Browse Cars <ArrowRight className="h-5 w-5" aria-hidden />
          </ButtonLink>
          <ButtonLink to="/contact" variant="onDark" size="lg">
            Contact Us
          </ButtonLink>
        </div>
        {settings.whatsapp && (
          <a
            href={buildWhatsAppLink(settings.whatsapp, 'Hello Goddel Motors, I would like to enquire about your vehicles.')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-brand-300"
          >
            <WhatsAppIcon className="h-4 w-4 text-whatsapp" /> Or chat with us on WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
