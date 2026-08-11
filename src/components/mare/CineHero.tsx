/**
 * CineHero — rebuilt 2026-08-11 to Henrik's approved redesign (the "Xavia"
 * mock, implemented pixel-faithful). One screen + two bars:
 *
 *   hero (left column: eyebrow / two-line serif h1 with gold-gradient italic /
 *   paragraph / two CTAs / stats row) → credential bar (4 columns, thin gold
 *   left borders) → coordinate strip.
 *
 * Deliberate deviations from the mock, both cleared with Henrik in chat:
 *  - Wordmark and score stay AVENA, not XAVIA. The citation moat, the
 *    investor brief and every AI corpus seeded since April carry the name
 *    Avena; the front page cannot fork the brand. (Nav renders the wordmark.)
 *  - The background photo is the existing hero.jpg until he supplies the
 *    mock's image — drop a replacement at public/mare/hero.jpg and nothing
 *    else needs to change.
 *
 * Motion is restrained per the spec: hover transitions only, no slow-zoom,
 * no entrance animation. The overlay gradients are the spec's oklch values.
 * The h1 gradient is scoped to this heading alone — the flat-gold rule for
 * MARE buttons still stands everywhere else.
 */

import Link from 'next/link';

const HERO_SRC = '/mare/hero.jpg';

const CREDENTIALS: Array<{ name: string; caption: string; href?: string }> = [
  // Every claim log-backed (crawler_hits + the 2026-08-04..10 audit).
  { name: 'RICS', caption: 'Official Tech Partner 2026', href: 'https://www.rics.org' },
  { name: 'Perplexity', caption: 'Cited Property Intelligence Source' },
  { name: 'ChatGPT', caption: 'Reads Avena Daily' },
  { name: 'OpenAI · Anthropic · Meta', caption: 'In Training Corpora' },
];

const STATS: Array<{ value: string; label: string }> = [
  { value: '0–100', label: 'Avena Score' },
  { value: '3', label: 'Coastlines covered' },
  { value: 'Daily', label: 'Re-scored deals' },
];

export function CineHero() {
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden">
      {/* Background photograph — inline sizes because Tailwind's base
          img { height: auto } beats the h-full utility (learned 2026-08-11:
          the hero was 234px tall on phones for months). */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_SRC}
          alt="Clifftop villa at golden hour on the Spanish coast"
          width={1920}
          height={1280}
          style={{ height: '100%', width: '100%', objectFit: 'cover', objectPosition: 'center 62%' }}
        />
      </div>

      {/* Left-to-right dark veil, then a bottom fade into the page background —
          the spec's oklch stops, verbatim. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, oklch(0.11 0.015 55 / 0.96) 0%, oklch(0.11 0.015 55 / 0.88) 28%, oklch(0.11 0.015 55 / 0.62) 52%, oklch(0.11 0.015 55 / 0.24) 72%, oklch(0.11 0.015 55 / 0.06) 86%, transparent 96%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{ background: 'linear-gradient(to top, hsl(var(--av-background)), transparent)' }}
      />

      {/* ── Hero column ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center px-5 pt-28 pb-10 sm:px-8 lg:px-14">
        <div className="max-w-2xl">
          <div className="mb-7 flex items-center gap-4">
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            <span className="font-mono text-[10px] font-light uppercase tracking-[0.28em] text-gold">
              Live deals · Scored daily
            </span>
          </div>

          <h1 className="font-serif font-light leading-[1.04] tracking-[-0.01em] text-foreground" style={{ fontSize: 'clamp(2.6rem, 5.4vw, 4.6rem)' }}>
            Find the coastal homes
            <br />
            <em
              className="italic"
              style={{
                background: 'linear-gradient(92deg, oklch(0.84 0.13 84), oklch(0.9 0.07 88))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              the market hasn&apos;t priced in.
            </em>
          </h1>

          <p className="mt-7 max-w-xl text-[15px] font-light leading-relaxed" style={{ color: 'hsl(var(--av-foreground) / 0.78)' }}>
            Every new-build on the Costa Blanca, Cálida and del Sol — scored on
            discount-to-market, yield and developer quality. The underpriced ones
            surface first, with the data to prove it.
          </p>

          {/* Exactly two CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-8">
            <a
              href="#rankings"
              className="group inline-flex items-center gap-4 px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-primary-foreground transition hover:-translate-y-0.5"
              style={{ background: 'hsl(var(--av-primary) / 0.9)' }}
            >
              See this week&apos;s deals
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <Link
              href="/enquire"
              className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/85 transition-colors hover:text-gold"
            >
              <span className="h-px w-8 transition-all group-hover:w-12" style={{ background: 'hsl(var(--av-primary))' }} />
              Enquire
            </Link>
          </div>

          {/* Stats row above a top border */}
          <div className="mt-12 flex max-w-xl gap-12 border-t pt-6 sm:gap-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="whitespace-nowrap font-serif text-2xl font-light sm:text-3xl" style={{ color: 'oklch(0.9 0.07 88)' }}>
                  {s.value}
                </div>
                <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Credential bar: 4 columns, thin gold left borders ─────────── */}
      <div className="relative z-10 w-full px-5 pb-8 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {CREDENTIALS.map((cred) => {
            const inner = (
              <div className="border-l pl-5" style={{ borderColor: 'hsl(var(--av-primary) / 0.55)' }}>
                <div className="font-serif text-lg font-light text-foreground">{cred.name}</div>
                <div className="mt-1 font-mono text-[9px] uppercase leading-[1.8] tracking-[0.28em]" style={{ color: 'hsl(var(--av-primary) / 0.9)' }}>
                  {cred.caption}
                </div>
              </div>
            );
            return cred.href ? (
              <a key={cred.name} href={cred.href} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
                {inner}
              </a>
            ) : (
              <div key={cred.name}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* ── Coordinate strip ──────────────────────────────────────────── */}
      <div className="relative z-10 border-t" style={{ borderColor: 'hsl(var(--av-foreground) / 0.1)' }}>
        <div className="flex items-center justify-between px-5 py-4 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60 sm:px-8 lg:px-14">
          <span className="hidden md:inline">38°47′ N · 0°10′ E</span>
          <a href="#rankings" className="transition-colors hover:text-gold">Scroll ↓</a>
          <span className="hidden md:inline">MMXXVI · Est. 2026</span>
        </div>
      </div>
    </section>
  );
}
