import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueTowns, getPropertiesByTown, avg, slugify } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export async function generateStaticParams() {
  return getUniqueTowns().map((t) => ({ town: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ town: string }> }): Promise<Metadata> {
  const { town } = await params;
  const data = getPropertiesByTown(town);
  if (!data) return { title: 'Town Not Found | Avena Terminal' };
  const { town: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const title = `New Build Properties in ${name} — Investment Scores & Rental Yield | Avena Terminal`;
  const avgPm2Meta = Math.round(avg(props.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYieldMeta = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const description = `${name} new builds: avg \u20AC${avgPm2Meta.toLocaleString()}/m\u00B2, ${avgScore}/100 score, ${avgYieldMeta}% gross yield. Live data from Avena Terminal.`;
  return {
    title, description,
    openGraph: { title, description, url: `https://avenaterminal.com/towns/${town}`, siteName: 'Avena Terminal', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  };
}

export default async function TownPage({ params }: { params: Promise<{ town: string }> }) {
  const { town } = await params;
  const data = getPropertiesByTown(town);
  if (!data) return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-light text-foreground mb-4">Town Not Found</h1>
          <Link href="/towns" className="text-primary font-mono text-xs uppercase tracking-[0.22em]">Browse all towns</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  const { town: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgPm2 = Math.round(avg(props.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const costa = props.find(p => p.costa)?.costa;
  const top10 = props.slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `New Build Properties in ${name}`,
    numberOfItems: top10.length,
    itemListElement: top10.slice(0, 5).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
      name: p.p,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avenaterminal.com/towns' },
      { '@type': 'ListItem', position: 3, name },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/towns" className="hover:text-foreground">Towns</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{name}</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                {costa ?? 'Spain'}
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {name}
                <br />
                <span className="italic text-gold">{costa ?? 'Spain'}</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                {name} has {props.length} scored new build properties averaging &euro;{avgPm2.toLocaleString()}/m&sup2; with a {avgYield}% gross rental yield. The average investment score is {avgScore}/100, ranking properties by value, rental income, and location fundamentals.
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
                { label: 'Avg Price/m\u00B2', value: `\u20AC${avgPm2.toLocaleString()}` },
                { label: 'Avg Gross Yield', value: `${avgYield}%` },
              ].map(s => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-serif text-3xl md:text-4xl font-light tabular text-foreground">{s.value}</div>
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
                Top Properties by Investment Score
              </h2>
            </div>
            <div className="space-y-2">
              {top10.map((p, i) => (
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
                      {p.t} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}
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

            {costa && (
              <div className="mt-8 text-center">
                <Link
                  href={`/costas/${slugify(costa)}`}
                  className="inline-block font-mono text-xs uppercase tracking-[0.22em] text-primary hover:underline"
                >
                  View all {costa} properties &rarr;
                </Link>
              </div>
            )}

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
