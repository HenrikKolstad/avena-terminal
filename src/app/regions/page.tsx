/**
 * /regions — browse deals by coast (2026-07-02).
 * Three coast groups computed live from the dataset; each links into the
 * existing /costas/[slug] pages (untouched).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueCostas } from '@/lib/properties';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Regions — Costa Blanca, Costa Cálida, Costa del Sol · Avena',
  description: 'Browse scored new-build deals by Spanish coast: Costa Blanca, Costa Cálida and Costa del Sol. Live average Avena Score, rental yield and tracked inventory per region.',
  alternates: { canonical: 'https://avenaterminal.com/regions' },
};

// Group the granular costa strings into three buyer-facing coasts.
const GROUPS: { name: string; match: (c: string) => boolean; blurb: string }[] = [
  {
    name: 'Costa Blanca',
    match: c => c.startsWith('Costa Blanca'),
    blurb: 'Jávea, Moraira, Torrevieja and the white coast — the deepest Northern-European rental demand in Spain, year-round lettability under the Montgó microclimate, and the strongest yield-to-price balance of the major costas.',
  },
  {
    name: 'Costa Cálida',
    match: c => c.startsWith('Costa Calida'),
    blurb: 'Mar Menor and the warm coast of Murcia — lower entry prices, Corvera airport connectivity, and the value frontier where discount-to-market runs widest.',
  },
  {
    name: 'Costa del Sol',
    match: c => c.startsWith('Costa del Sol') || c.startsWith('Costa Tropical'),
    blurb: 'Marbella to Málaga and the tropical coast — Spain’s prime international market: deepest resale liquidity, luxury short-let rates, and the strongest capital-preservation story.',
  },
];

export default function RegionsPage() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  const groups = GROUPS.map(g => {
    const props = all.filter(p => p.costa && g.match(p.costa));
    const scores = props.filter(p => p._sc != null).map(p => p._sc!);
    const yields = props.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const subCostas = costas.filter(c => g.match(c.costa));
    return {
      ...g,
      count: props.length,
      avgScore: Math.round(avg(scores)),
      avgYield: avg(yields),
      subCostas,
    };
  }).filter(g => g.count > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Avena Regions — Spanish coastal markets',
    url: 'https://avenaterminal.com/regions',
    hasPart: groups.map(g => ({ '@type': 'Place', name: g.name })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="av-clean min-h-screen pt-16">
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-10">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.44em] text-gold">The Coastline · scored daily</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-[-0.02em]">
            Three coasts,
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>one honest score.</em>
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every region below is tracked daily and scored on the same open methodology — so a 78 on the Costa Blanca means exactly what a 78 means on the Costa del Sol. Pick your coast.
          </p>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-16 sm:pb-24 space-y-5">
          {groups.map(g => (
            <div
              key={g.name}
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.25)' }}
            >
              <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 p-6 sm:p-8">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-2 tracking-tight">{g.name}</h2>
                  <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mb-4 max-w-xl">{g.blurb}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.subCostas.map(c => (
                      <Link
                        key={c.slug}
                        href={`/costas/${c.slug}`}
                        className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                        style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
                      >
                        {c.costa} · {c.count}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Avg score</div>
                      <div className="font-serif text-3xl font-light tabular text-gold">{g.avgScore}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Avg yield</div>
                      <div className="font-serif text-3xl font-light tabular text-foreground">{g.avgYield ? `${g.avgYield.toFixed(1)}%` : '—'}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Tracked</div>
                      <div className="font-serif text-3xl font-light tabular text-foreground">{g.count.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link
                      href="/deals"
                      className="inline-flex items-center justify-center rounded-sm px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                      style={{ background: 'var(--av-gradient-gold)' }}
                    >
                      See {g.name} deals →
                    </Link>
                    <Link
                      href={`/enquire?region=${encodeURIComponent(g.name)}`}
                      className="inline-flex items-center justify-center rounded-sm border px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                      style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                    >
                      Enquire
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <p className="pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Every score is built on a signed, audited data engine. <Link href="/engine" className="text-gold hover:underline">See how →</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
