import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { BEST_CATEGORIES } from './_categories';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best of — curated rankings from the Avena Terminal',
  description: 'Live-ranked curated lists of the best European new-build properties. Sub-€200k. Alpha score. High yield. Beachfront. Updated daily from live data.',
  alternates: { canonical: 'https://avenaterminal.com/best' },
};

export default function BestIndexPage() {
  const all = getAllProperties();

  const cats = BEST_CATEGORIES.map((c) => ({
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    count: all.filter(c.filter).length,
  }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Curated · live-ranked · updated daily
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Best <span className="italic text-gold">of</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              Curated cuts of the European new-build market — sliced by score,
              yield, discount, location, budget. Every list ranked by the
              Avena Score and refreshed from live data.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map((c) => (
              <Link
                key={c.slug}
                href={`/best/${c.slug}`}
                className="group rounded-sm border p-5 transition-colors hover:border-primary/50 flex flex-col justify-between"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">{c.subtitle}</div>
                  <h2 className="font-serif text-lg text-foreground leading-tight group-hover:text-primary transition-colors">{c.title}</h2>
                </div>
                <div className="mt-5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em]">
                  <span className="text-muted-foreground">{c.count.toLocaleString()} properties</span>
                  <span className="text-primary">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
