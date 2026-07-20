/**
 * CineHero (2026-07-20) — the cinematic homepage hero.
 *
 * Henrik's dusk-villa photograph with the pool-water treatment that
 * earned its keep in the Lovable study: an SVG turbulence displacement
 * applied to a duplicate of the image, masked to the lower half, plus
 * drifting caustics. The upper image stays still; the water below it
 * breathes. Pure CSS/SVG — no WebGL, nothing to glitch.
 */

import Link from 'next/link';

const HERO_SRC = '/mare/hero.jpg';

export function CineHero() {
  return (
    <section className="relative h-[100svh] min-h-[680px] w-full overflow-hidden">
      {/* SVG filter for living pool water */}
      <svg className="absolute -z-10 h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="av-pool-water" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.045" numOctaves="2" seed="7" result="fine">
              <animate attributeName="baseFrequency" dur="7s" values="0.9 0.045;0.95 0.05;0.9 0.045" repeatCount="indefinite" />
            </feTurbulence>
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.006" numOctaves="2" seed="3" result="swell">
              <animate attributeName="baseFrequency" dur="22s" values="0.018 0.006;0.022 0.008;0.018 0.006" repeatCount="indefinite" />
            </feTurbulence>
            <feComposite in="fine" in2="swell" operator="arithmetic" k1="0" k2="0.55" k3="0.55" k4="0" result="waves" />
            <feGaussianBlur in="waves" stdDeviation="0.6" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Base photograph (still) */}
      <div className="absolute inset-0 av-slow-zoom">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_SRC} alt="Cliffside seafront villa at golden hour on the Spanish coast" className="h-full w-full object-cover" width={1920} height={1200} />
      </div>

      {/* Living pool water — displaced duplicate, masked to the lower half */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 45%, black 68%, black 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 45%, black 68%, black 100%)',
        }}
      >
        <div className="absolute inset-0 av-slow-zoom" style={{ filter: 'url(#av-pool-water)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_SRC} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Drifting light on the water */}
      <div className="av-caustics" />
      <div className="av-caustics av-caustics-2" />

      {/* Cinematic scrims */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(var(--av-background) / 0.72) 0%, hsl(var(--av-background) / 0.08) 38%, hsl(var(--av-background)) 100%)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, hsl(var(--av-background) / 0.62) 0%, transparent 55%, hsl(var(--av-background) / 0.25) 100%)' }} />

      {/* Copy */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-24 pt-28 sm:px-8 lg:px-12 md:pb-28">
        <div className="av-fade-up max-w-3xl">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-gold">
              Live deals · scored daily · Avena Score 0–100
            </span>
          </div>

          <h1 className="font-serif font-light leading-[1.02] tracking-[-0.02em] text-foreground" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>
            Find the coastal homes
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>the market hasn&apos;t priced in.</em>
          </h1>

          <p className="mt-7 max-w-xl font-serif text-base font-light leading-relaxed text-foreground/85 md:text-lg">
            Every new-build on the Costa Blanca, Cálida and del Sol, scored on discount-to-market, yield, and developer quality. The underpriced ones, surfaced first — with the data to prove it.
          </p>

          {/* RICS marque */}
          <a href="https://www.rics.org" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-stretch overflow-hidden border transition-opacity hover:opacity-90" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>
            <span className="flex items-center justify-center px-4 py-2.5 font-serif text-base tracking-[0.18em] text-foreground" style={{ background: 'hsl(var(--av-foreground) / 0.04)' }}>RICS</span>
            <span className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'hsl(var(--av-primary) / 0.1)' }}>
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.35em]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Official Tech Partner · 2026</span>
            </span>
          </a>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a href="#rankings" className="group inline-flex items-center gap-4 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground shadow-gold transition hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
              See this week&apos;s deals
              <span className="transition group-hover:translate-x-1">→</span>
            </a>
            <Link href="/enquire" className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-foreground/85 transition-colors hover:text-gold">
              <span className="h-px w-6 transition-all group-hover:w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Enquire
            </Link>
          </div>
        </div>
      </div>

      {/* Coordinate strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t backdrop-blur-sm" style={{ borderColor: 'hsl(var(--av-foreground) / 0.1)', background: 'hsl(var(--av-background) / 0.4)' }}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 font-mono text-[10px] uppercase tracking-[0.35em] text-foreground/60 sm:px-8 lg:px-12">
          <span className="hidden md:inline">38°47′ N · 0°10′ E</span>
          <a href="#rankings" className="transition-colors hover:text-gold">Scroll ↓</a>
          <span className="hidden md:inline">MMXXVI · Est. 2026</span>
        </div>
      </div>
    </section>
  );
}
