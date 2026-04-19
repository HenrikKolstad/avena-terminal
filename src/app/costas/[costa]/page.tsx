import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueCostas, getPropertiesByCosta, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export async function generateStaticParams() {
  return getUniqueCostas().map((c) => ({ costa: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ costa: string }> }): Promise<Metadata> {
  const { costa } = await params;
  const data = getPropertiesByCosta(costa);
  if (!data) return { title: 'Costa Not Found | Avena Terminal' };
  const title = `New Build Investments on ${data.costa} — Ranked by Data | Avena Terminal`;
  const avgScoreMeta = Math.round(avg(data.properties.filter(p => p._sc).map(p => p._sc!)));
  const avgYieldMeta = avg(data.properties.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const description = `${data.costa} new builds: ${data.properties.length} properties, ${avgScoreMeta}/100 avg score, ${avgYieldMeta}% gross yield. Live data from Avena Terminal.`;
  return { title, description, openGraph: { title, description, url: `https://avenaterminal.com/costas/${costa}`, siteName: 'Avena Terminal', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] } };
}

export default async function CostaPage({ params }: { params: Promise<{ costa: string }> }) {
  const { costa } = await params;
  const data = getPropertiesByCosta(costa);
  if (!data) return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-light text-foreground mb-4">Costa Not Found</h1>
          <Link href="/costas" className="text-primary font-mono text-xs uppercase tracking-[0.22em]">Browse all costas</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  const { costa: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const top20 = props.slice(0, 20);
  const minPrice = Math.min(...props.map(p => p.pf));
  const maxPrice = Math.max(...props.map(p => p.pf));

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'ItemList', name: `New Builds on ${name}`, numberOfItems: top20.length, itemListElement: top20.slice(0, 5).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`, name: p.p })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' }, { '@type': 'ListItem', position: 2, name: 'Costas', item: 'https://avenaterminal.com/costas' }, { '@type': 'ListItem', position: 3, name }] },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/costas" className="hover:text-foreground">Costas</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{name}</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Costa Index
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {name}
                <br />
                <span className="italic text-gold">Intelligence</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                {name} has {props.length} scored new build properties with an average investment score of {avgScore}/100 and {avgYield}% average gross rental yield. Prices range from &euro;{minPrice.toLocaleString()} to &euro;{maxPrice.toLocaleString()}.
              </p>
            </div>
          </div>
        </section>

        {/* Stat grid */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {[
                { label: 'Properties', value: String(props.length) },
                { label: 'Avg Score', value: `${avgScore}/100` },
                { label: 'Avg Gross Yield', value: `${avgYield}%` },
                { label: 'Price Range', value: `\u20AC${minPrice.toLocaleString()} - \u20AC${maxPrice.toLocaleString()}` },
              ].map(s => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-serif text-2xl md:text-3xl font-light tabular text-foreground">{s.value}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Properties */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Leaderboard
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Top Properties by Score
              </h2>
            </div>
            <div className="space-y-2">
              {top20.map((p, i) => (
                <Link
                  key={p.ref}
                  href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                  className="flex items-center gap-4 rounded-sm border p-4 transition-all hover:border-primary/40"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <span
                    className="w-8 h-8 rounded-sm flex items-center justify-center font-mono text-xs flex-shrink-0"
                    style={i === 0
                      ? { background: 'hsl(var(--av-primary))', color: 'hsl(var(--av-background))' }
                      : { background: 'hsl(var(--av-surface) / 0.6)', color: 'hsl(var(--av-foreground))' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-base font-light text-foreground truncate">{p.p}</div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {p.l} &middot; {p.t} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-serif text-xl font-light text-primary">{Math.round(p._sc ?? 0)}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {p._yield ? `${p._yield.gross.toFixed(1)}% gross` : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground text-right mt-6">
              Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
