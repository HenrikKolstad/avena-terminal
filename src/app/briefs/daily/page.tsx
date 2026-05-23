import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { DataFreshness } from '@/components/v2/DataFreshness';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { renderBrief, getTodayISO } from './_brief';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Daily brief — European property intelligence | Avena Terminal',
  description: 'Fresh every morning: the top-scored deal, the day\'s alpha signal, the market regime. Auto-generated from live data. Publicly licensed.',
  alternates: { canonical: 'https://avenaterminal.com/briefs/daily' },
  openGraph: {
    title: 'Avena Terminal — Daily brief',
    description: 'Fresh every morning: the top-scored deal, the day\'s alpha signal.',
    url: 'https://avenaterminal.com/briefs/daily',
  },
};

export default function DailyBriefPage() {
  const today = getTodayISO();
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const brief = renderBrief(all, towns, today);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: brief.headline,
    description: brief.lede,
    datePublished: `${today}T07:00:00Z`,
    dateModified: new Date().toISOString(),
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    mainEntityOfPage: `https://avenaterminal.com/briefs/daily`,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <article className="mx-auto max-w-[820px] px-5 sm:px-12 py-20">
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Daily brief
              </span>
              <span className="h-px flex-1" style={{ background: 'hsl(var(--av-border))' }} />
              <DataFreshness label={`Published ${today}`} updatedAt={new Date(today)} />
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[1.02] tracking-tight text-foreground mb-6">
              {brief.headline}
            </h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed max-w-[720px]">
              {brief.lede}
            </p>
          </header>

          {/* Big numbers */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-sm border mb-10"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
          >
            {brief.metrics.map((m) => (
              <div key={m.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{m.label}</div>
                <div className="font-serif text-3xl sm:text-4xl font-light tabular text-foreground leading-none">{m.value}</div>
                {m.sub && <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">{m.sub}</div>}
              </div>
            ))}
          </div>

          {/* Featured of the day */}
          {brief.featured && (
            <section className="mb-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Today&apos;s alpha</div>
              <Link
                href={brief.featured.url}
                className="block rounded-sm border p-6 hover:border-primary/50 transition-colors"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-serif text-2xl text-foreground leading-tight hover:text-primary transition-colors">
                      {brief.featured.title}
                    </h3>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
                      {brief.featured.meta}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-serif text-5xl font-light text-gold tabular leading-none">{brief.featured.score}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Avena Score</div>
                  </div>
                </div>
                <p className="text-sm text-foreground/90 font-light leading-relaxed mt-4">
                  {brief.featured.narrative}
                </p>
              </Link>
            </section>
          )}

          {/* Top towns */}
          <section className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Ranking</div>
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              Top 5 towns by average score
            </h2>
            <div
              className="overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {brief.topTowns.map((t, i) => (
                <div
                  key={t.name}
                  className="px-4 py-3 border-b flex items-center justify-between gap-3"
                  style={{ borderColor: i < brief.topTowns.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular text-[10px] text-muted-foreground w-5">{i + 1}</span>
                    <Link href={`/towns/${t.slug}`} className="font-serif text-base text-foreground hover:text-primary transition-colors">
                      {t.name}
                    </Link>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{t.count} props</span>
                  </div>
                  <span className="font-mono tabular text-sm text-gold">{t.avgScore}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Call to action */}
          <section className="mb-10 py-8 border-t border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
            <p className="text-base text-foreground font-light mb-4">
              Get the brief delivered each morning — plus deal alerts when properties
              matching your filters go live.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/#deals"
                className="inline-flex items-center rounded-sm px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Deal alerts →
              </Link>
              <Link
                href="/terminal"
                className="inline-flex items-center rounded-sm border px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Open terminal →
              </Link>
            </div>
          </section>

          <footer className="text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Brief auto-generated from live data · CC BY 4.0 · DOI 10.5281/zenodo.19520064
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </div>
  );
}
