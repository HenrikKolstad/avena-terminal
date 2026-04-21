import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CITIES, type City } from '@/lib/bubble-data';

export const revalidate = 86400;

/* ────────────────────────────────────────────────────────── */
/*  Metadata                                                 */
/* ────────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  return CITIES.map(c => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const c = CITIES.find(x => x.slug === city);
  if (!c) return { title: 'City Not Found | Avena Terminal' };
  const statusLbl = c.status === 'bubble' ? 'BUBBLE TERRITORY' : c.status === 'overheating' ? 'OVERHEATING' : c.status === 'warming' ? 'WARMING' : 'HEALTHY';
  return {
    title: `${c.name} Property Bubble Score: ${c.bubbleScore}/100 (${statusLbl}) | Avena Terminal`,
    description: `${c.name}, ${c.country}: \u20AC${c.pricePerM2.toLocaleString()}/m\u00B2, ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}% YoY, bubble risk ${c.bubbleScore}/100. Full European bubble scanner.`,
    alternates: { canonical: `https://avenaterminal.com/bubble-scanner/${city}` },
    openGraph: {
      title: `${c.name}: ${statusLbl} \u2014 \u20AC${c.pricePerM2.toLocaleString()}/m\u00B2`,
      description: `Bubble score ${c.bubbleScore}/100. ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}% year-on-year. Price-to-income: ${c.priceToIncome}x.`,
      url: `https://avenaterminal.com/bubble-scanner/${city}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${c.flag} ${c.name}: ${statusLbl} \u2014 Bubble Score ${c.bubbleScore}/100`,
    },
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ────────────────────────────────────────────────────────── */

type Tone = 'destructive' | 'warning' | 'warning-soft' | 'primary';

function toneColor(tone: Tone): string {
  switch (tone) {
    case 'destructive': return 'hsl(var(--av-destructive))';
    case 'warning':     return 'hsl(var(--av-warning))';
    case 'warning-soft':return 'hsl(var(--av-warning) / 0.75)';
    case 'primary':     return 'hsl(var(--av-primary))';
  }
}

function statusTone(s: City['status']): Tone {
  switch (s) {
    case 'bubble':      return 'destructive';
    case 'overheating': return 'warning';
    case 'warming':     return 'warning-soft';
    case 'healthy':     return 'primary';
  }
}

function statusLabel(s: City['status']) {
  switch (s) {
    case 'bubble':      return 'BUBBLE TERRITORY';
    case 'overheating': return 'OVERHEATING';
    case 'warming':     return 'WARMING';
    case 'healthy':     return 'HEALTHY';
  }
}

function bubbleBarTone(score: number): Tone {
  if (score >= 75) return 'destructive';
  if (score >= 60) return 'warning';
  if (score >= 45) return 'warning-soft';
  return 'primary';
}

function statusExplanation(c: City) {
  switch (c.status) {
    case 'bubble':
      return `${c.name} shows significant signs of a property bubble with a score of ${c.bubbleScore}/100. Price-to-income ratio of ${c.priceToIncome}x is well above sustainable levels, suggesting significant overvaluation risk.`;
    case 'overheating':
      return `${c.name} is showing overheating signals with a bubble score of ${c.bubbleScore}/100. While not yet in bubble territory, the price-to-income ratio of ${c.priceToIncome}x warrants caution for buyers and investors.`;
    case 'warming':
      return `${c.name} has a warming market with a bubble score of ${c.bubbleScore}/100. Prices are rising but remain within a range that could be supported by fundamentals. The price-to-income ratio of ${c.priceToIncome}x is elevated but manageable.`;
    case 'healthy':
      return `${c.name} currently shows a healthy market with a bubble score of ${c.bubbleScore}/100. The price-to-income ratio of ${c.priceToIncome}x suggests prices are broadly aligned with local incomes and economic fundamentals.`;
  }
}

function getNearbyMarkets(current: City): City[] {
  const sameCountry = CITIES.filter(c => c.country === current.country && c.slug !== current.slug);
  if (sameCountry.length >= 3) return sameCountry.slice(0, 4);

  const nearby = CITIES.filter(c => c.slug !== current.slug)
    .map(c => ({
      ...c,
      dist: Math.abs(c.lat - current.lat) + Math.abs(c.lng - current.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  return nearby;
}

/* ────────────────────────────────────────────────────────── */
/*  Page                                                     */
/* ────────────────────────────────────────────────────────── */

export default async function CityBubbleScannerPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = CITIES.find(c => c.slug === slug);

  if (!city) {
    return (
      <div className="avena-v2 min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 flex items-center justify-center pt-24">
          <div className="text-center">
            <h1 className="font-serif text-5xl font-light text-foreground mb-4">
              City <span className="italic text-gold">not found</span>.
            </h1>
            <p className="text-muted-foreground mb-8">This city is not in our bubble scanner yet.</p>
            <Link
              href="/bubble-scanner"
              className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              &larr; Back to Bubble Scanner
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const nearby = getNearbyMarkets(city);
  const label = statusLabel(city.status);
  const tone = statusTone(city.status);
  const barTone = bubbleBarTone(city.bubbleScore);
  const shareText = `${city.flag} ${city.name} bubble score: ${city.bubbleScore}/100 (${label}) \u2014 \u20AC${city.pricePerM2.toLocaleString()}/m\u00B2, ${city.yoyChange > 0 ? '+' : ''}${city.yoyChange}% YoY. See all 30 EU cities: avenaterminal.com/bubble-scanner`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: city.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: city.name,
          addressCountry: city.country,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: city.lat,
          longitude: city.lng,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Is ${city.name} in a property bubble?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: statusExplanation(city),
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      <main className="pt-16">

        {/* ── Breadcrumb ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-6">
            <nav className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-3">
              <Link href="/" className="transition-colors hover:text-primary">Home</Link>
              <span>/</span>
              <Link href="/bubble-scanner" className="transition-colors hover:text-primary">Bubble Scanner</Link>
              <span>/</span>
              <span className="text-foreground">{city.name}</span>
            </nav>
          </div>
        </section>

        {/* ── Hero ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              {city.country} &middot; Bubble Score {city.bubbleScore}/100
            </span>
            <div className="flex flex-wrap items-center gap-5 mb-5">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {city.flag} {city.name}
              </h1>
              <span
                className="inline-block font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap"
                style={{
                  padding: '4px 12px',
                  borderRadius: 2,
                  color: toneColor(tone),
                  background: `${toneColor(tone).replace(')', ' / 0.12)')}`,
                  border: `1px solid ${toneColor(tone).replace(')', ' / 0.35)')}`,
                }}
              >
                {label}
              </span>
            </div>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              {statusExplanation(city)}
            </p>
          </div>
        </section>

        {/* ── Key Metrics Grid ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {/* Price/m2 */}
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Price / m&sup2;
                </span>
                <div className="mt-3 font-serif text-4xl sm:text-5xl font-light tabular text-foreground">
                  &euro;{city.pricePerM2.toLocaleString()}
                </div>
              </div>

              {/* YoY */}
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  YoY Change
                </span>
                <div
                  className="mt-3 font-serif text-4xl sm:text-5xl font-light tabular"
                  style={{
                    color:
                      city.yoyChange > 0 ? 'hsl(var(--av-destructive))' :
                      city.yoyChange < 0 ? 'hsl(var(--av-primary))' :
                      'hsl(var(--av-foreground))',
                  }}
                >
                  {city.yoyChange > 0 ? '+' : ''}{city.yoyChange}%
                </div>
              </div>

              {/* Bubble Score */}
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Bubble Score
                </span>
                <div className="mt-3 font-serif text-4xl sm:text-5xl font-light tabular text-foreground">
                  {city.bubbleScore}
                  <span className="text-lg text-muted-foreground ml-1">/100</span>
                </div>
                <div
                  className="mt-3 w-full h-1 rounded-full overflow-hidden"
                  style={{ background: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div
                    style={{
                      width: `${city.bubbleScore}%`,
                      height: '100%',
                      background: toneColor(barTone),
                    }}
                  />
                </div>
              </div>

              {/* Affordability */}
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Affordability
                </span>
                <div className="mt-3 font-serif text-4xl sm:text-5xl font-light tabular text-foreground">
                  {city.affordability}
                  <span className="text-lg text-muted-foreground ml-1">/100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Risk Assessment ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Risk assessment
            </span>
            <h2 className="mt-3 mb-8 font-serif text-3xl sm:text-4xl font-light text-foreground">
              Inside the <span className="italic text-gold">score</span>.
            </h2>
            <div
              className="rounded-sm border p-8 space-y-6"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Price-to-Income Ratio
                </span>
                <div className="mt-2 font-serif text-5xl font-light tabular text-foreground">
                  {city.priceToIncome}
                  <span className="text-xl text-muted-foreground ml-1">x</span>
                </div>
              </div>
              <div
                className="pt-6"
                style={{ borderTop: '1px solid hsl(var(--av-border) / 0.6)' }}
              >
                <p className="text-foreground font-light leading-relaxed">
                  {statusExplanation(city)}
                </p>
              </div>
              <div
                className="pt-6"
                style={{ borderTop: '1px solid hsl(var(--av-border) / 0.6)' }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  What the bubble score means
                </span>
                <p className="mt-2 text-muted-foreground font-light leading-relaxed text-sm">
                  The bubble score (0&ndash;100) aggregates price-to-income ratio, year-on-year price changes,
                  affordability metrics, and macroeconomic indicators. Scores above 75 indicate bubble territory,
                  60&ndash;74 overheating, 45&ndash;59 warming, and below 45 a healthy market.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Nearby Markets ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Compare
            </span>
            <h2 className="mt-3 mb-8 font-serif text-3xl sm:text-4xl font-light text-foreground">
              Nearby <span className="italic text-gold">markets</span>.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearby.map(n => {
                const nTone = statusTone(n.status);
                return (
                  <Link
                    key={n.slug}
                    href={`/bubble-scanner/${n.slug}`}
                    className="rounded-sm border p-5 transition-colors hover:border-primary/50 group"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <p className="text-foreground font-light mb-1 transition-colors group-hover:text-primary">
                      {n.flag} {n.name}
                    </p>
                    <p className="font-mono tabular text-sm text-muted-foreground">
                      &euro;{n.pricePerM2.toLocaleString()}/m&sup2;
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{
                          padding: '2px 8px',
                          borderRadius: 2,
                          color: toneColor(nTone),
                          background: `${toneColor(nTone).replace(')', ' / 0.12)')}`,
                          border: `1px solid ${toneColor(nTone).replace(')', ' / 0.35)')}`,
                        }}
                      >
                        {n.bubbleScore}/100
                      </span>
                      <span
                        className="font-mono tabular text-xs"
                        style={{
                          color: n.yoyChange > 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-primary))',
                        }}
                      >
                        {n.yoyChange > 0 ? '+' : ''}{n.yoyChange}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Share ── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Share
            </span>
            <h2 className="mt-3 mb-8 font-serif text-3xl sm:text-4xl font-light text-foreground">
              Spread the <span className="italic text-gold">signal</span>.
            </h2>
            <div
              className="rounded-sm border p-6 space-y-5"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="font-mono text-xs text-muted-foreground break-all leading-relaxed">
                {shareText}
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                  style={{
                    background: 'hsl(var(--av-surface))',
                    borderColor: 'hsl(var(--av-border-strong))',
                  }}
                >
                  Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://avenaterminal.com/bubble-scanner/${city.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                  style={{
                    background: 'hsl(var(--av-surface))',
                    borderColor: 'hsl(var(--av-border-strong))',
                  }}
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Back link ── */}
        <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16 text-center">
          <Link
            href="/bubble-scanner"
            className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            &larr; View all 30 cities
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
