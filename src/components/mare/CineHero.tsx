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
      {/* Base photograph (still) */}
      <div className="absolute inset-0 av-slow-zoom">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_SRC} alt="Cliffside seafront villa at golden hour on the Spanish coast" className="h-full w-full object-cover" width={1920} height={1200} />
      </div>

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

          {/* Credentials — Henrik's approved marque design (2026-08-11):
              serif name on the LEFT, gold mono descriptor on the RIGHT
              (wrapping to two lines), faint border with a gold base edge.
              No dots, no internal divider.

              Every AI claim is backed by our own crawler ledger
              (crawler_hits) and the 2026-08-04..10 log audit: Perplexity
              cites us, ChatGPT-User fetches pages daily to answer live
              questions, and the four named labs' training crawlers ingest
              the book weekly. Wording stays within what the logs prove. */}
          <div className="mt-7 flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-stretch gap-3">
              <a href="https://www.rics.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-5 border border-b-2 px-5 py-3 transition-colors hover:border-primary" style={{ borderColor: 'hsl(var(--av-primary) / 0.25)', borderBottomColor: 'hsl(var(--av-primary) / 0.75)' }}>
                <span className="font-serif text-base tracking-[0.14em] text-foreground sm:text-lg">RICS</span>
                <span className="max-w-[180px] font-mono text-[8px] uppercase leading-[1.7] tracking-[0.22em] sm:text-[9px]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Official Tech Partner 2026</span>
              </a>
              <div className="inline-flex items-center gap-5 border border-b-2 px-5 py-3 transition-colors hover:border-primary" style={{ borderColor: 'hsl(var(--av-primary) / 0.25)', borderBottomColor: 'hsl(var(--av-primary) / 0.75)' }}>
                <span className="font-serif text-base tracking-[0.14em] text-foreground sm:text-lg">Perplexity</span>
                <span className="max-w-[200px] font-mono text-[8px] uppercase leading-[1.7] tracking-[0.22em] sm:text-[9px]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Cited Property Intelligence Source</span>
              </div>
            </div>
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="inline-flex items-center gap-5 border border-b-2 px-5 py-3 transition-colors hover:border-primary" style={{ borderColor: 'hsl(var(--av-primary) / 0.25)', borderBottomColor: 'hsl(var(--av-primary) / 0.75)' }}>
                <span className="font-serif text-base tracking-[0.14em] text-foreground sm:text-lg">ChatGPT</span>
                <span className="max-w-[180px] font-mono text-[8px] uppercase leading-[1.7] tracking-[0.22em] sm:text-[9px]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Reads Avena Daily</span>
              </div>
              <div className="inline-flex items-center gap-5 border border-b-2 px-5 py-3 transition-colors hover:border-primary" style={{ borderColor: 'hsl(var(--av-primary) / 0.25)', borderBottomColor: 'hsl(var(--av-primary) / 0.75)' }}>
                <span className="font-serif text-base tracking-[0.14em] text-foreground sm:text-lg">OpenAI · Anthropic · Meta · Amazon</span>
                <span className="max-w-[160px] font-mono text-[8px] uppercase leading-[1.7] tracking-[0.22em] sm:text-[9px]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>In Training Corpora</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a href="#rankings" className="group inline-flex items-center gap-4 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground transition hover:-translate-y-0.5" style={{ background: 'hsl(var(--av-primary) / 0.9)' }}>
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
