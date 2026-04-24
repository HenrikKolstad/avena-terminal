import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { DataFreshness } from '@/components/v2/DataFreshness';
import { BEST_CATEGORIES, getCategory } from '../_categories';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

export function generateStaticParams() {
  return BEST_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return { title: 'Category not found' };
  return {
    title: `${cat.title} | Avena Terminal`,
    description: cat.description,
    alternates: { canonical: `https://avenaterminal.com/best/${cat.slug}` },
    keywords: cat.keywords.join(', '),
    openGraph: {
      title: cat.title,
      description: cat.description.slice(0, 160),
      url: `https://avenaterminal.com/best/${cat.slug}`,
      siteName: 'Avena Terminal',
    },
  };
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default async function BestCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  const all = getAllProperties();
  const filtered = all.filter(cat.filter);
  const sorted = [...filtered].sort(cat.sort ?? ((a, b) => (b._sc ?? 0) - (a._sc ?? 0)));
  const limit = cat.limit ?? 20;
  const top = sorted.slice(0, limit);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cat.title,
    description: cat.description,
    numberOfItems: top.length,
    itemListElement: top.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
      name: p.p || `${p.t} in ${p.l}`,
    })),
  };

  const otherCats = BEST_CATEGORIES.filter((c) => c.slug !== slug).slice(0, 6);

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <nav className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/best" className="hover:text-primary">Best of</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{cat.subtitle}</span>
            </nav>
            <span className="mb-5 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              {cat.subtitle} · {filtered.length.toLocaleString()} matches
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground mb-4">
              {cat.title}
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed mb-5">
              {cat.description}
            </p>
            <DataFreshness label="Ranking" updatedAt={new Date()} />
          </div>
        </section>

        {/* Ranked list */}
        <section className="py-12">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            {top.length === 0 ? (
              <div
                className="rounded-sm border p-10 text-center"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <p className="font-serif text-lg text-foreground mb-2">No matches right now.</p>
                <p className="text-sm text-muted-foreground font-light mb-4">
                  Inventory rotates daily. Try a different category or subscribe to deal alerts.
                </p>
                <Link
                  href="/best"
                  className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                >
                  All categories →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {top.map((p, i) => {
                  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
                  const mm2 = p.mm2 ? Math.round(p.mm2) : null;
                  const disc = pm2 && mm2 && mm2 > pm2 ? Math.min(Math.round((1 - pm2 / mm2) * 100), 35) : 0;
                  const score = Math.round(p._sc ?? 0);
                  const thumb = p.imgs?.[0];
                  return (
                    <Link
                      key={p.ref}
                      href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                      className="group grid grid-cols-[40px_96px_1fr_auto] gap-4 items-center rounded-sm border p-3 transition-colors hover:border-primary/50"
                      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      <div className="font-mono tabular text-sm text-muted-foreground text-center">{i + 1}</div>
                      <div className="relative w-24 h-16 rounded-sm overflow-hidden" style={{ background: 'hsl(var(--av-surface))' }}>
                        {thumb && (
                          <Image src={thumb} alt={p.p || ''} fill sizes="96px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif text-base text-foreground truncate group-hover:text-primary transition-colors">
                          {p.p || `${p.t} in ${p.l}`}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">
                          {p.l}{p.costa ? ` · ${p.costa}` : ''} · {p.t} · {p.bd}bed · {p.bm}m²{p._yield?.gross ? ` · yield ${p._yield.gross.toFixed(1)}%` : ''}
                          {disc > 0 ? ` · −${disc}% vs market` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-2xl text-gold tabular leading-none">{score}</div>
                        <div className="font-mono tabular text-xs text-foreground mt-1">€{fmt(p.pf)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Related */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">Related lists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherCats.map((c) => (
                <Link
                  key={c.slug}
                  href={`/best/${c.slug}`}
                  className="group rounded-sm border p-4 transition-colors hover:border-primary/50"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">{c.subtitle}</div>
                  <div className="font-serif text-base text-foreground leading-tight group-hover:text-primary transition-colors">
                    {c.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Data CC BY 4.0 · DOI 10.5281/zenodo.19520064 · <Link href="/best" className="text-primary hover:text-gold">All categories</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
