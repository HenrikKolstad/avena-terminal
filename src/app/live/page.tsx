import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Market Feed — Avena Terminal',
  description: 'Real-time Spain new build property market feed. All properties scored and ranked live with updated timestamps. Always fresh, never cached.',
  openGraph: {
    title: 'Live Market Feed — Avena Terminal',
    description: 'Real-time Spain new build property market feed. All properties scored and ranked live.',
    url: 'https://avenaterminal.com/live',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function LiveMarketFeedPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const now = new Date();
  const timestamp = now.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Madrid' });

  const scored = all.filter(p => p._sc).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const prices = all.map(p => p.pf);
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const scores = scored.map(p => p._sc!);

  const stats = {
    totalProperties: all.length,
    totalTowns: towns.length,
    avgPrice: Math.round(avg(prices)),
    medianPrice: Math.round(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || 0),
    avgScore: Math.round(avg(scores)),
    avgYield: Number(avg(yields).toFixed(1)),
    topScore: scores[0] ?? 0,
  };

  const statGrid = [
    { label: 'Properties', value: stats.totalProperties.toLocaleString() },
    { label: 'Towns', value: stats.totalTowns.toString() },
    { label: 'Avg Price', value: `€${stats.avgPrice.toLocaleString()}` },
    { label: 'Median Price', value: `€${stats.medianPrice.toLocaleString()}` },
    { label: 'Avg Score', value: stats.avgScore.toString() },
    { label: 'Avg Yield', value: `${stats.avgYield}%` },
    { label: 'Top Score', value: stats.topScore.toString() },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--av-primary))' }} />
                Live · Force-dynamic
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                The live feed.
                <br />
                <span className="italic text-gold">Nothing stale</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Real-time feed of every tracked Spanish new build, scored and ranked. Server-rendered on every request. 0s cache.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Rendered {timestamp} CET
              </p>
            </div>
          </div>
        </section>

        {/* Market Summary */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Market Summary
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {statGrid.map(s => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-serif text-xl md:text-2xl font-light tabular text-foreground">{s.value}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Property List */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                All Properties by Score · {scored.length}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Every property, ranked.
              </h2>
            </div>

            <div className="space-y-2">
              {scored.map((p, i) => (
                <Link
                  key={p.ref ?? `${p.p}-${i}`}
                  href={p.ref ? `/property/${encodeURIComponent(p.ref)}` : '#'}
                  className="flex items-center gap-4 rounded-sm border px-4 py-3 transition-colors hover:border-primary/40"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <span className="text-muted-foreground font-mono text-xs w-10 text-right shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm font-medium truncate">{p.p}</span>
                      <span className="text-muted-foreground font-mono text-[10px] shrink-0">{p.t}</span>
                    </div>
                    <div className="text-muted-foreground text-xs truncate">{p.l} · {p.d}</div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-xs">
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Price</div>
                      <div className="text-foreground font-mono tabular">€{p.pf.toLocaleString()}</div>
                    </div>
                    {p._yield && (
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Yield</div>
                        <div className="text-primary font-mono tabular">{p._yield.gross.toFixed(1)}%</div>
                      </div>
                    )}
                    <div className="text-right w-12">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Score</div>
                      <div className={`font-mono tabular font-semibold ${(p._sc ?? 0) >= 70 ? 'text-primary' : (p._sc ?? 0) >= 50 ? 'text-accent' : 'text-muted-foreground'}`}>
                        {p._sc}
                      </div>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-[10px] font-mono shrink-0 w-20 text-right">
                    {p._added ?? now.toISOString().slice(0, 10)}
                  </span>
                </Link>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-right mt-6 font-mono">Feed generated: {now.toISOString()}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
