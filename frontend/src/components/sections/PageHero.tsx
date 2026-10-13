import type { ReactNode } from 'react';

/** Compact banner used on inner pages, echoing the homepage hero. */
export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <img
        src="/images/goddel-hero-1600.jpg"
        alt=""
        width={1600}
        height={900}
        loading="eager"
        decoding="async"
        className="hero-photo absolute inset-0 -z-20 h-full w-full object-cover object-[75%_55%] opacity-50"
      />
      <div aria-hidden className="hero-streaks absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/30" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
      <div className="container-page py-14 sm:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold text-white sm:text-5xl">{title}</h1>
        {children && <div className="mt-3 max-w-xl text-white/75 sm:text-lg">{children}</div>}
      </div>
    </section>
  );
}
