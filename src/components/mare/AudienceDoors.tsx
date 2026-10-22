/**
 * AudienceDoors (2026-10-21) — three entry points directly under the hero, so
 * a buyer, a fund and a bank each find their door in one glance. The luxury
 * front stays the buyer's; institutions get a direct path to the data.
 *
 * MARE language: hairline gold left borders, mono eyebrows, light serif,
 * hover-only motion. Copy describes what each destination already does; it
 * makes no new claims.
 */

import Link from 'next/link';

const DOORS: Array<{ eyebrow: string; title: string; body: string; cta: string; href: string }> = [
  {
    eyebrow: 'For buyers',
    title: "I'm buying a home",
    body: 'Every coastal new-build, scored daily on discount-to-market, yield and developer quality. The underpriced ones first.',
    cta: "See this week's deals",
    href: '/deals',
  },
  {
    eyebrow: 'For funds',
    title: 'I manage a fund',
    body: 'Memos, valuations, portfolio screening and indices on the Spanish coastal new-build market.',
    cta: 'Institutional access',
    href: '/institutional',
  },
  {
    eyebrow: 'For banks',
    title: "I'm at a bank",
    body: 'Check an asking price against the price history and market benchmarks the engine captures every night.',
    cta: 'See the engine',
    href: '/engine',
  },
];

export function AudienceDoors() {
  return (
    <section aria-label="Choose your path" className="relative">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-px px-5 py-14 sm:px-8 md:grid-cols-3 md:py-20 lg:px-14">
        {DOORS.map((d) => (
          <Link
            key={d.href + d.title}
            href={d.href}
            data-testid="audience-door"
            className="group flex flex-col border-l py-6 pl-6 pr-6 transition-colors md:py-4 md:pr-10"
            style={{ borderColor: 'hsl(var(--av-primary) / 0.55)' }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">{d.eyebrow}</span>
            <span className="mt-4 font-serif text-3xl font-light leading-tight tracking-[-0.01em] text-foreground transition-colors group-hover:text-gold md:text-[2rem]">
              {d.title}
            </span>
            <span className="mt-4 max-w-sm text-[14px] font-light leading-relaxed" style={{ color: 'hsl(var(--av-foreground) / 0.7)' }}>
              {d.body}
            </span>
            <span className="mt-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/80 transition-colors group-hover:text-gold">
              <span className="h-px w-8 transition-all group-hover:w-12" style={{ background: 'hsl(var(--av-primary))' }} />
              {d.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
