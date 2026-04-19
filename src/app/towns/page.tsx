import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueTowns } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'New Build Property Investment by Town — Spain | Avena Terminal',
  description: 'Browse new build investment properties by town across Spain\'s costas. Ranked by investment score and rental yield.',
  openGraph: {
    title: 'New Build Property Investment by Town — Spain | Avena Terminal',
    description: 'Browse new build investment properties by town across Spain\'s costas. Ranked by investment score and rental yield.',
    url: 'https://avenaterminal.com/towns',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function TownsPage() {
  const towns = getUniqueTowns();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Towns</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                {towns.length} Towns
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Every town.
                <br />
                <span className="italic text-gold">Scored</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Avena Terminal tracks new build investment properties across {towns.length} towns in Spain, each scored by value, rental yield, and location fundamentals. Towns are ranked by number of available properties with live investment scores updated weekly.
              </p>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Directory
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
                New Build Properties by Town
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                {towns.length} towns across Spain with scored investment properties.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {towns.map((t) => (
                <Link
                  key={t.slug}
                  href={`/towns/${t.slug}`}
                  className="block rounded-sm border p-5 transition-all hover:border-primary/40"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-serif text-lg font-light tracking-tight text-foreground">{t.town}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t.count}</span>
                  </div>
                  <div className="flex gap-4 font-mono text-xs">
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Score</span>
                      <span className="text-primary">{t.avgScore}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Yield</span>
                      <span className="text-primary">{t.avgYield}%</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Avg</span>
                      <span className="text-foreground">&euro;{t.avgPrice.toLocaleString()}</span>
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
