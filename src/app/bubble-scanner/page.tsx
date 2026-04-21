import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CITIES } from '@/lib/bubble-data';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'European Property Bubble Scanner 2026 — Every Major City Rated | Avena Terminal',
  description: 'Is your city in a bubble? Live bubble risk scores for 30 European cities. Price per m², year-on-year change, affordability rating. Free, open, updated daily.',
  keywords: ['property bubble', 'european property bubble', 'housing bubble europe', 'property bubble scanner', 'real estate bubble 2026', 'property prices europe'],
  alternates: { canonical: 'https://avenaterminal.com/bubble-scanner' },
  openGraph: {
    title: 'European Property Bubble Scanner 2026',
    description: 'Is your city in a bubble? 30 European cities rated. Price/m², YoY change, bubble risk score.',
    url: 'https://avenaterminal.com/bubble-scanner',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'European Property Bubble Scanner 2026',
    description: 'Is your city in a bubble? 30 European cities rated.',
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const sorted = [...CITIES].sort((a, b) => b.bubbleScore - a.bubbleScore);

const STATUS_CONFIG = {
  bubble:      { label: 'Bubble',      tone: 'destructive' },
  overheating: { label: 'Overheating', tone: 'warning' },
  warming:     { label: 'Warming',     tone: 'warning-soft' },
  healthy:     { label: 'Healthy',     tone: 'primary' },
} as const;

type Tone = 'destructive' | 'warning' | 'warning-soft' | 'primary';

function toneColor(tone: Tone): string {
  switch (tone) {
    case 'destructive': return 'hsl(var(--av-destructive))';
    case 'warning':     return 'hsl(var(--av-warning))';
    case 'warning-soft':return 'hsl(var(--av-warning) / 0.75)';
    case 'primary':     return 'hsl(var(--av-primary))';
  }
}

function bubbleBarTone(score: number): Tone {
  if (score >= 70) return 'destructive';
  if (score >= 50) return 'warning';
  if (score >= 30) return 'warning-soft';
  return 'primary';
}

function fmtPrice(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('en-EU');
}

const counts = {
  bubble:      sorted.filter(c => c.status === 'bubble').length,
  overheating: sorted.filter(c => c.status === 'overheating').length,
  warming:     sorted.filter(c => c.status === 'warming').length,
  healthy:     sorted.filter(c => c.status === 'healthy').length,
};

const shareText = `European Property Bubble Scanner 2026 — ${counts.bubble} cities in bubble territory, ${counts.overheating} overheating. Is your city at risk?\n\nhttps://avenaterminal.com/bubble-scanner`;

/* ------------------------------------------------------------------ */
/*  JSON-LD                                                            */
/* ------------------------------------------------------------------ */

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      name: 'European Property Bubble Scanner 2026',
      description: 'Bubble risk scores, price per m², YoY change, and affordability ratings for 30 major European cities.',
      url: 'https://avenaterminal.com/bubble-scanner',
      creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
      temporalCoverage: '2026',
      spatialCoverage: { '@type': 'Place', name: 'Europe' },
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'Bubble Score', minValue: 0, maxValue: 100 },
        { '@type': 'PropertyValue', name: 'Price per m²', unitCode: 'EUR' },
        { '@type': 'PropertyValue', name: 'Year-on-Year Change', unitCode: 'P1' },
      ],
      license: 'https://creativecommons.org/licenses/by/4.0/',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Europe in a property bubble in 2026?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `As of April 2026, ${counts.bubble} major European cities show bubble-level risk scores (70+/100), including Zurich, Munich, Luxembourg, and Amsterdam. ${counts.overheating} cities are classified as overheating (50-70), while ${counts.healthy} remain in healthy territory. The picture is mixed: some markets are cooling from 2022-23 peaks while others, particularly in Southern Europe and the Netherlands, are accelerating.`,
          },
        },
        {
          '@type': 'Question',
          name: 'How is the bubble score calculated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The Avena Bubble Score (0-100) is a composite of price-to-income ratio (40% weight), year-on-year price acceleration (30%), credit growth proxy (15%), and affordability gap (15%). Scores above 70 indicate bubble territory, 50-70 overheating, 30-50 warming, and below 30 healthy.',
          },
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BubbleScannerPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      <main className="pt-16">

        {/* ---- HERO ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Live Data &middot; {sorted.length} cities &middot; Updated daily
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              Is your city in a
              <br />
              <span className="italic text-gold">property bubble</span>?
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              {sorted.length} European cities rated by price, growth, and risk.
              Composite bubble score 0&ndash;100. Refreshed daily. Source-verified.
            </p>
          </div>
        </section>

        {/* ---- SUMMARY STATS ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {([
                { label: 'Bubble Territory', count: counts.bubble,      tone: 'destructive' as Tone },
                { label: 'Overheating',      count: counts.overheating, tone: 'warning' as Tone },
                { label: 'Warming',          count: counts.warming,     tone: 'warning-soft' as Tone },
                { label: 'Healthy',          count: counts.healthy,     tone: 'primary' as Tone },
              ]).map((s) => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {s.label}
                  </span>
                  <div
                    className="mt-3 font-serif font-light tabular text-5xl"
                    style={{ color: toneColor(s.tone) }}
                  >
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- DATA TABLE ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground">
                All 30 cities <span className="italic text-gold">ranked</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Sorted by bubble score &middot; highest first
              </span>
            </div>

            <div
              className="rounded-sm border overflow-x-auto"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr
                    className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                    style={{ borderBottom: '1px solid hsl(var(--av-border) / 0.6)' }}
                  >
                    <th className="py-4 pl-5 pr-3" style={{ width: 40 }}>#</th>
                    <th className="py-4 px-3">City</th>
                    <th className="py-4 px-3 text-right">Price/m&sup2;</th>
                    <th className="py-4 px-3 text-right">YoY</th>
                    <th className="py-4 px-3">Bubble Score</th>
                    <th className="py-4 px-3 text-right">Affordability</th>
                    <th className="py-4 px-3 text-right">P/I Ratio</th>
                    <th className="py-4 px-3 text-center">Status</th>
                    <th className="py-4 pr-5 pl-3" style={{ width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((city, i) => {
                    const sc = STATUS_CONFIG[city.status];
                    const barTone = bubbleBarTone(city.bubbleScore);
                    return (
                      <tr
                        key={city.slug}
                        style={{
                          borderBottom: i < sorted.length - 1 ? '1px solid hsl(var(--av-border) / 0.3)' : 'none',
                        }}
                      >
                        {/* rank */}
                        <td className="py-3 pl-5 pr-3 font-mono tabular text-[11px] text-muted-foreground">
                          {i + 1}
                        </td>

                        {/* city */}
                        <td className="py-3 px-3">
                          <Link
                            href={`/bubble-scanner/${city.slug}`}
                            className="text-foreground font-light transition-colors hover:text-primary"
                          >
                            <span className="mr-2">{city.flag}</span>
                            {city.name}
                            <span className="ml-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                              {city.country}
                            </span>
                          </Link>
                        </td>

                        {/* price */}
                        <td className="py-3 px-3 text-right font-mono tabular text-foreground">
                          &euro;{fmtPrice(city.pricePerM2)}
                        </td>

                        {/* yoy */}
                        <td
                          className="py-3 px-3 text-right font-mono tabular"
                          style={{
                            color: city.yoyChange >= 0 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))',
                          }}
                        >
                          {city.yoyChange >= 0 ? '+' : ''}{city.yoyChange.toFixed(1)}%
                        </td>

                        {/* bubble score bar */}
                        <td className="py-3 px-3" style={{ minWidth: 160 }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: 'hsl(var(--av-border) / 0.6)' }}
                            >
                              <div
                                style={{
                                  width: `${city.bubbleScore}%`,
                                  height: '100%',
                                  background: toneColor(barTone),
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                            <span
                              className="font-mono tabular text-[12px]"
                              style={{ color: toneColor(barTone), minWidth: 28, textAlign: 'right' }}
                            >
                              {city.bubbleScore}
                            </span>
                          </div>
                        </td>

                        {/* affordability */}
                        <td
                          className="py-3 px-3 text-right font-mono tabular"
                          style={{
                            color:
                              city.affordability >= 40 ? 'hsl(var(--av-primary))' :
                              city.affordability >= 25 ? 'hsl(var(--av-warning))' :
                              'hsl(var(--av-destructive))',
                          }}
                        >
                          {city.affordability}/100
                        </td>

                        {/* P/I ratio */}
                        <td className="py-3 px-3 text-right font-mono tabular text-muted-foreground">
                          {city.priceToIncome.toFixed(1)}x
                        </td>

                        {/* status badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className="inline-block font-mono text-[10px] uppercase tracking-[0.18em] whitespace-nowrap"
                            style={{
                              padding: '3px 10px',
                              borderRadius: 2,
                              color: toneColor(sc.tone as Tone),
                              background: `${toneColor(sc.tone as Tone).replace(')', ' / 0.12)')}`,
                              border: `1px solid ${toneColor(sc.tone as Tone).replace(')', ' / 0.35)')}`,
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>

                        {/* arrow */}
                        <td className="py-3 pr-5 pl-3">
                          <Link
                            href={`/bubble-scanner/${city.slug}`}
                            aria-label={`View ${city.name} details`}
                            className="text-muted-foreground transition-colors hover:text-primary"
                          >
                            &rsaquo;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- HOW WE SCORE + RISK SCALE ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div
                className="rounded-sm border p-8"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  Methodology
                </span>
                <h2 className="mt-3 mb-5 font-serif text-3xl font-light text-foreground">
                  How we <span className="italic text-gold">score</span>.
                </h2>
                <p className="mb-6 font-light text-muted-foreground leading-relaxed">
                  The <span className="text-foreground">Avena Bubble Score</span> (0&ndash;100)
                  is a composite index reflecting how stretched a city&apos;s housing market is
                  relative to fundamentals.
                </p>
                <ul className="flex flex-col gap-4">
                  {([
                    { w: '40%', label: 'Price-to-Income Ratio', desc: 'How many years of local median income to buy a median flat' },
                    { w: '30%', label: 'YoY Price Acceleration', desc: 'Speed of price growth compared to long-term trend' },
                    { w: '15%', label: 'Credit Growth Proxy', desc: 'Mortgage lending growth relative to GDP' },
                    { w: '15%', label: 'Affordability Gap', desc: 'Rent-to-own spread adjusted for local rates' },
                  ] as const).map((item) => (
                    <li key={item.label} className="flex gap-4 items-start">
                      <span
                        className="font-mono tabular text-primary text-right"
                        style={{ minWidth: 44 }}
                      >
                        {item.w}
                      </span>
                      <span className="text-sm">
                        <span className="text-foreground font-light">{item.label}</span>
                        <br />
                        <span className="text-muted-foreground font-light">{item.desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="rounded-sm border p-8"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  Reference
                </span>
                <h2 className="mt-3 mb-5 font-serif text-3xl font-light text-foreground">
                  Risk <span className="italic text-gold">scale</span>.
                </h2>
                <div className="flex flex-col gap-4">
                  {([
                    { range: '0 \u2013 30',   label: 'Healthy',           tone: 'primary' as Tone,     desc: 'Prices are in line with incomes and historical norms.' },
                    { range: '30 \u2013 50',  label: 'Warming',           tone: 'warning-soft' as Tone, desc: 'Growth is above trend. Monitor closely.' },
                    { range: '50 \u2013 70',  label: 'Overheating',       tone: 'warning' as Tone,     desc: 'Prices are significantly detached from fundamentals.' },
                    { range: '70 \u2013 100', label: 'Bubble Territory',  tone: 'destructive' as Tone, desc: 'Extreme risk. Correction likely within 12\u201324 months.' },
                  ]).map((item) => (
                    <div key={item.range} className="flex items-start gap-4">
                      <div
                        className="mt-2 rounded-full flex-shrink-0"
                        style={{ width: 8, height: 8, background: toneColor(item.tone) }}
                      />
                      <div className="text-sm">
                        <span className="font-mono tabular" style={{ color: toneColor(item.tone) }}>
                          {item.range}
                        </span>
                        <span className="ml-3 text-foreground font-light">{item.label}</span>
                        <br />
                        <span className="text-muted-foreground font-light">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- METHODOLOGY NOTE ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Sources
              </span>
              <h2 className="mt-3 mb-4 font-serif text-3xl font-light text-foreground">
                Data <span className="italic text-gold">provenance</span>.
              </h2>
              <p className="max-w-3xl font-light text-muted-foreground leading-relaxed">
                Data is sourced from Eurostat housing price indices, ECB credit and monetary statistics,
                national land registries, and Avena Terminal proprietary transaction feeds. Prices reflect
                median asking prices for existing apartments in the city proper (not metro area). The
                bubble score is recalculated daily and the methodology is fully documented on our{' '}
                <Link href="/methodology" className="text-primary underline underline-offset-4 transition-colors hover:text-foreground">
                  methodology page
                </Link>
                . For academic citations, see{' '}
                <Link href="/cite" className="text-primary underline underline-offset-4 transition-colors hover:text-foreground">
                  how to cite
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* ---- SHARE ---- */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Share
            </span>
            <h2 className="mt-3 mb-4 font-serif text-3xl sm:text-4xl font-light text-foreground">
              Spread the <span className="italic text-gold">signal</span>.
            </h2>
            <p className="mb-8 font-light text-muted-foreground">
              Think someone should see their city&apos;s score?
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border-strong))',
                }}
              >
                Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://avenaterminal.com/bubble-scanner')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border-strong))',
                }}
              >
                Share on LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* ---- SOURCE LINE ---- */}
        <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Sources: Eurostat &middot; ECB &middot; National Land Registries
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
