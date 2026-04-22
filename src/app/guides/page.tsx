import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { NATIONALITY_PROFILES } from '@/lib/nationality-guides';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Buyer Guides — Spanish Property by Nationality | Avena Terminal',
  description:
    'Data-driven buyer guides for every European nationality investing in Spanish new-build property. Tax, currency, regions, live inventory. 10 guides.',
  alternates: { canonical: 'https://avenaterminal.com/guides' },
};

export default function GuidesIndex() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Buyer Guides · By Nationality · 2026
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              Buy Spanish property,
              <br />
              in your <span className="italic text-gold">own</span> language.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Every major European nationality has different tax, currency friction,
              and regional preference. One guide each.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {NATIONALITY_PROFILES.map((p) => (
                <Link
                  key={p.code}
                  href={`/guides/${p.code}-buyers-spain-2026`}
                  className="group rounded-sm border p-6 transition-colors hover:border-primary"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                      {p.country}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h2 className="font-serif text-2xl text-foreground mb-2">
                    {p.nationality_adj} buyers
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    {p.preferred_regions[0] ?? 'Spain'} · {p.currency} · {p.irnr_rate}% IRNR
                  </p>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-3">
                    {p.typical_why}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
