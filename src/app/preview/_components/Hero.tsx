import { ArrowDown, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative isolate min-h-[85svh] w-full overflow-hidden">
      {/* Background image */}
      <Image
        src="/assets/v2/hero-villa.jpg"
        alt="Mediterranean luxury villa at golden hour"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay — single gradient. Noise mix-blend-overlay removed (paint-heavy on mobile). */}
      <div className="absolute inset-0 hero-overlay pointer-events-none" />

      {/* Vertical edge ticks (terminal feel) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 flex-col items-center justify-between py-24 sm:flex">
        <span
          className="rotate-180 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl' }}
        >
          AVN · 042 · EU
        </span>
        <span
          className="rotate-180 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl' }}
        >
          LIVE FEED
        </span>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 flex-col items-center justify-between py-24 sm:flex">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl' }}
        >
          v2026.04
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary"
          style={{ writingMode: 'vertical-rl' }}
        >
          ● SYSTEM ONLINE
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[85svh] max-w-[1600px] flex-col justify-end px-5 pb-20 pt-14 sm:px-12 sm:pb-24 sm:pt-16">
        {/* Top meta line */}
        <div className="absolute left-5 right-5 top-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:left-12 sm:right-12 sm:top-8">
          <div className="flex items-center gap-3">
            <span
              className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'hsl(var(--av-primary))' }}
            />
            <span>Live · Europe</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <span>1,881 deals tracked</span>
            <span className="text-primary">scored daily</span>
          </div>
        </div>

        <div className="max-w-5xl fade-up">
          <span className="mb-6 hidden sm:inline-flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
            <span
              className="h-px w-10"
              style={{ background: 'hsl(var(--av-primary))' }}
            />
            <span>European Property Intelligence · Est. 2026</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground">10 markets · 30 cities · 1 881 scored new-builds</span>
          </span>

          <div className="mb-6">
            <a
              href="https://www.rics.org"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Official RICS Tech Partner · 2026"
              className="rics-badge group relative inline-flex items-stretch overflow-hidden rounded-sm border transition-all duration-300 hover:-translate-y-px"
              style={{
                borderImage: 'linear-gradient(135deg, hsl(42 85% 64% / 0.7) 0%, hsl(26 88% 62% / 0.4) 50%, hsl(42 85% 64% / 0.7) 100%) 1',
                borderColor: 'hsl(42 85% 64% / 0.55)',
                boxShadow: '0 8px 30px -10px hsl(42 85% 64% / 0.45), 0 0 0 1px hsl(42 85% 64% / 0.1) inset',
              }}
            >
              {/* RICS mark block — navy, serif, metallic sheen
                  TODO: drop official RICS lion at /public/rics-lion.svg and add <img src="/rics-lion.svg" /> here */}
              <span
                className="relative flex items-center px-3 py-2 border-r overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0B2240 0%, #1a3a6b 50%, #0B2240 100%)',
                  borderColor: 'hsl(42 85% 64% / 0.55)',
                }}
              >
                <span
                  className="font-serif font-bold leading-none"
                  style={{
                    fontSize: 13,
                    letterSpacing: '0.18em',
                    backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #d8d4cb 50%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  RICS
                </span>
              </span>

              {/* Partner block — gold gradient text, shimmer sweep */}
              <span
                className="relative flex items-center gap-2 px-3 py-2 font-mono uppercase overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(42 85% 64% / 0.14) 0%, hsl(26 88% 62% / 0.10) 100%)',
                  fontSize: 10,
                  letterSpacing: '0.32em',
                }}
              >
                {/* Shimmer sweep layer */}
                <span
                  aria-hidden="true"
                  className="rics-shimmer pointer-events-none absolute inset-0"
                />
                <span
                  className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: 'hsl(42 85% 64%)' }}
                />
                <span
                  className="relative font-bold"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, hsl(42 85% 70%) 0%, hsl(40 95% 78%) 35%, hsl(26 88% 62%) 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  Official Tech Partner
                </span>
                <span className="relative opacity-40" style={{ color: 'hsl(42 85% 64%)' }}>·</span>
                <span className="relative text-foreground/90 font-bold">2026</span>
                <span className="relative opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: 'hsl(42 85% 64%)' }}>↗</span>
              </span>
            </a>
          </div>

          <h1 className="font-serif text-[12vw] font-light leading-[0.95] tracking-tight text-foreground sm:text-[10vw] lg:text-[8.2rem] xl:text-[9.5rem]">
            The price
            <br />
            before the <span className="italic text-gold">pitch</span>.
          </h1>

          <p className="mt-8 max-w-xl font-light text-base text-muted-foreground sm:text-lg">
            Every new build in Spain, scored and ranked.
            <br />
            Average saving for Avena operators: <span className="text-gold font-medium">&euro;130,000</span>.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/#deals"
              className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Find your property
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/apci"
              className="group inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground backdrop-blur-sm transition-colors hover:text-primary"
              style={{
                borderColor: 'hsl(var(--av-border-strong))',
                background: 'hsl(var(--av-background) / 0.4)',
              }}
            >
              View APCI benchmark
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="mt-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <ArrowDown className="h-3 w-3 animate-bounce text-primary" />
            Scroll · explore signals
          </div>
          <div className="hidden items-end gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:flex">
            <div className="flex flex-col items-end gap-1">
              <span>Avg. Discount</span>
              <span className="font-serif text-2xl font-light tracking-tight text-foreground">
                23.8<span className="text-primary">%</span>
              </span>
            </div>
            <div
              className="h-12 w-px"
              style={{ background: 'hsl(var(--av-border))' }}
            />
            <div className="flex flex-col items-end gap-1">
              <span>Top Score</span>
              <span className="font-serif text-2xl font-light tracking-tight text-foreground">
                94<span className="text-primary">/100</span>
              </span>
            </div>
            <div
              className="h-12 w-px"
              style={{ background: 'hsl(var(--av-border))' }}
            />
            <div className="flex flex-col items-end gap-1">
              <span>Coverage</span>
              <span className="font-serif text-2xl font-light tracking-tight text-foreground">
                10<span className="text-primary"> EU</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
