import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueCostas } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'New Build Investment by Costa — Spain | Avena Terminal',
  description: 'Compare new build property investments across Spain\'s costas. Costa Blanca, Costa del Sol, Costa Calida — ranked by score and rental yield.',
  openGraph: { title: 'New Build Investment by Costa — Spain | Avena Terminal', description: 'Compare new build property investments across Spain\'s costas.', url: 'https://avenaterminal.com/costas', siteName: 'Avena Terminal', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
};

export default function CostasPage() {
  const costas = getUniqueCostas();

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
              <span className="text-foreground">Costas</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                {costas.length} Costas
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Every costa.
                <br />
                <span className="italic text-gold">One intelligence layer</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Avena Terminal compares new build investment opportunities across {costas.length} costas in southern Spain, covering regions like Costa Blanca, Costa del Sol, and Costa Calida. Each costa is scored by average investment quality and gross rental yield using live market data.
              </p>
            </div>
          </div>
        </section>

        {/* Costas grid */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Index
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
                New Build Investment by Costa
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                {costas.length} costas with scored investment properties across southern Spain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {costas.map((c) => (
                <Link
                  key={c.slug}
                  href={`/costas/${c.slug}`}
                  className="block rounded-sm border p-6 transition-all hover:border-primary/40"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-serif text-xl font-light tracking-tight text-foreground">{c.costa}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.count} properties</span>
                  </div>
                  <div className="flex gap-6 font-mono text-sm">
                    <div>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Avg Score</span>
                      <span className="text-primary text-lg">{c.avgScore}</span>
                    </div>
                    <div>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Avg Gross Yield</span>
                      <span className="text-primary text-lg">{c.avgYield}%</span>
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
