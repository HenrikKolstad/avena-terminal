import { ArrowDown, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden">
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
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pb-24 pt-32 sm:px-12 sm:pb-32">
        {/* Top meta line */}
        <div className="absolute left-5 right-5 top-24 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:left-12 sm:right-12">
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
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
            <span
              className="h-px w-10"
              style={{ background: 'hsl(var(--av-primary))' }}
            />
            European Property Intelligence · Est. 2026
          </span>

          <h1 className="font-serif text-[15vw] font-light leading-[0.92] tracking-tight text-foreground sm:text-[10vw] lg:text-[8.2rem] xl:text-[9.5rem]">
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
