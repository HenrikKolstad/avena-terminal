import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CITIES, type City } from '@/lib/bubble-data';

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

/* City data imported from shared module */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const sorted = [...CITIES].sort((a, b) => b.bubbleScore - a.bubbleScore);

const STATUS_CONFIG = {
  bubble:      { label: 'Bubble',      bg: 'rgba(248,81,73,0.15)',  text: '#f85149',  border: '#f8514966' },
  overheating: { label: 'Overheating', bg: 'rgba(210,153,34,0.15)', text: '#d29922',  border: '#d2992266' },
  warming:     { label: 'Warming',     bg: 'rgba(187,128,9,0.10)',  text: '#bb8009',  border: '#bb800966' },
  healthy:     { label: 'Healthy',     bg: 'rgba(63,185,80,0.15)',  text: '#3fb950',  border: '#3fb95066' },
} as const;

function bubbleBarColor(score: number): string {
  if (score >= 70) return '#f85149';
  if (score >= 50) return '#d29922';
  if (score >= 30) return '#bb8009';
  return '#3fb950';
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

      <main className="pt-24">
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* ---- HERO ---- */}
          <section style={{ padding: '64px 0 40px', maxWidth: 900 }}>
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Live Data &middot; {sorted.length} cities &middot; Updated daily
            </span>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mt-4 mb-6">
              Is your city in a
              <br />
              <span className="italic text-gold">property bubble</span>?
            </h1>

            <p className="text-lg text-muted-foreground font-light max-w-xl">
              {sorted.length} European cities rated by price, growth, and risk.
              Composite bubble score 0&ndash;100. Refreshed daily. Source-verified.
            </p>
          </section>

          {/* ---- SUMMARY STATS ---- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 40,
            }}
          >
            {([
              { label: 'Bubble Territory', count: counts.bubble, color: '#f85149' },
              { label: 'Overheating', count: counts.overheating, color: '#d29922' },
              { label: 'Warming', count: counts.warming, color: '#bb8009' },
              { label: 'Healthy', count: counts.healthy, color: '#3fb950' },
            ] as const).map((s) => (
              <div
                key={s.label}
                style={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4, fontWeight: 500 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* ---- DATA TABLE ---- */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#e6edf3' }}>
                All 30 Cities &mdash; Ranked by Bubble Risk
              </h2>
              <span style={{ fontSize: 12, color: '#8b949e' }}>
                Sorted by Bubble Score (highest first)
              </span>
            </div>

            {/* table wrapper */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #30363d',
                      textAlign: 'left',
                      color: '#8b949e',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    <th style={{ padding: '14px 16px', width: 40 }}>#</th>
                    <th style={{ padding: '14px 12px' }}>City</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right' }}>Price/m&sup2;</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right' }}>YoY</th>
                    <th style={{ padding: '14px 12px' }}>Bubble Score</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right' }}>Affordability</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right' }}>P/I Ratio</th>
                    <th style={{ padding: '14px 12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 12px', width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((city, i) => {
                    const sc = STATUS_CONFIG[city.status];
                    return (
                      <tr
                        key={city.slug}
                        style={{
                          borderBottom: i < sorted.length - 1 ? '1px solid #21262d' : 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* rank */}
                        <td
                          style={{
                            padding: '12px 16px',
                            color: '#484f58',
                            fontWeight: 600,
                            fontSize: 12,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {i + 1}
                        </td>

                        {/* city */}
                        <td style={{ padding: '12px 12px' }}>
                          <Link
                            href={`/bubble-scanner/${city.slug}`}
                            style={{
                              color: '#e6edf3',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            <span style={{ marginRight: 8 }}>{city.flag}</span>
                            {city.name}
                            <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                              {city.country}
                            </span>
                          </Link>
                        </td>

                        {/* price */}
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 500,
                          }}
                        >
                          &euro;{fmtPrice(city.pricePerM2)}
                        </td>

                        {/* yoy */}
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            color: city.yoyChange >= 0 ? '#3fb950' : '#f85149',
                          }}
                        >
                          {city.yoyChange >= 0 ? '+' : ''}{city.yoyChange.toFixed(1)}%
                        </td>

                        {/* bubble score bar */}
                        <td style={{ padding: '12px 12px', minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 8,
                                backgroundColor: '#21262d',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${city.bubbleScore}%`,
                                  height: '100%',
                                  backgroundColor: bubbleBarColor(city.bubbleScore),
                                  borderRadius: 4,
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                fontVariantNumeric: 'tabular-nums',
                                color: bubbleBarColor(city.bubbleScore),
                                minWidth: 28,
                                textAlign: 'right',
                              }}
                            >
                              {city.bubbleScore}
                            </span>
                          </div>
                        </td>

                        {/* affordability */}
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            color: city.affordability >= 40 ? '#3fb950' : city.affordability >= 25 ? '#bb8009' : '#f85149',
                            fontWeight: 500,
                          }}
                        >
                          {city.affordability}/100
                        </td>

                        {/* P/I ratio */}
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            color: '#8b949e',
                            fontWeight: 500,
                          }}
                        >
                          {city.priceToIncome.toFixed(1)}x
                        </td>

                        {/* status badge */}
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 12,
                              backgroundColor: sc.bg,
                              color: sc.text,
                              border: `1px solid ${sc.border}`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>

                        {/* arrow */}
                        <td style={{ padding: '12px 12px' }}>
                          <Link
                            href={`/bubble-scanner/${city.slug}`}
                            aria-label={`View ${city.name} details`}
                            style={{ color: '#484f58', textDecoration: 'none', fontSize: 16 }}
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
          </section>

          {/* ---- HOW WE SCORE ---- */}
          <section
            style={{
              marginTop: 56,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: 28,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#e6edf3' }}>
                How We Score
              </h2>
              <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
                The <strong style={{ color: '#e6edf3' }}>Avena Bubble Score</strong> (0&ndash;100)
                is a composite index reflecting how stretched a city&apos;s housing market is
                relative to fundamentals.
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {([
                  { w: '40%', label: 'Price-to-Income Ratio', desc: 'How many years of local median income to buy a median flat' },
                  { w: '30%', label: 'YoY Price Acceleration', desc: 'Speed of price growth compared to long-term trend' },
                  { w: '15%', label: 'Credit Growth Proxy', desc: 'Mortgage lending growth relative to GDP' },
                  { w: '15%', label: 'Affordability Gap', desc: 'Rent-to-own spread adjusted for local rates' },
                ] as const).map((item) => (
                  <li
                    key={item.label}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#3fb950',
                        minWidth: 36,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.w}
                    </span>
                    <span>
                      <strong style={{ color: '#e6edf3' }}>{item.label}</strong>
                      <br />
                      <span style={{ color: '#8b949e' }}>{item.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: 28,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#e6edf3' }}>
                Risk Scale
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {([
                  { range: '0 \u2013 30', label: 'Healthy', color: '#3fb950', desc: 'Prices are in line with incomes and historical norms.' },
                  { range: '30 \u2013 50', label: 'Warming', color: '#bb8009', desc: 'Growth is above trend. Monitor closely.' },
                  { range: '50 \u2013 70', label: 'Overheating', color: '#d29922', desc: 'Prices are significantly detached from fundamentals.' },
                  { range: '70 \u2013 100', label: 'Bubble Territory', color: '#f85149', desc: 'Extreme risk. Correction likely within 12\u201324 months.' },
                ] as const).map((item) => (
                  <div key={item.range} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        marginTop: 5,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.range}</span>
                      <span style={{ color: '#e6edf3', fontWeight: 600, marginLeft: 8 }}>{item.label}</span>
                      <br />
                      <span style={{ color: '#8b949e' }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---- METHODOLOGY ---- */}
          <section
            style={{
              marginTop: 40,
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 28,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: '#e6edf3' }}>
              Methodology
            </h2>
            <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 800 }}>
              Data is sourced from Eurostat housing price indices, ECB credit and monetary statistics,
              national land registries, and Avena Terminal proprietary transaction feeds. Prices reflect
              median asking prices for existing apartments in the city proper (not metro area). The
              bubble score is recalculated daily and the methodology is fully documented on our{' '}
              <Link href="/methodology" style={{ color: '#3fb950', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                methodology page
              </Link>
              . For academic citations, see{' '}
              <Link href="/cite" style={{ color: '#3fb950', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                how to cite
              </Link>
              .
            </p>
          </section>

          {/* ---- SHARE ---- */}
          <section
            style={{
              marginTop: 40,
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 28,
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#e6edf3' }}>
              Share This Scanner
            </h2>
            <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 20, margin: '0 0 20px' }}>
              Think someone should see their city&apos;s score? Spread the word.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#21262d',
                  color: '#e6edf3',
                  border: '1px solid #30363d',
                  borderRadius: 6,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                Share on X / Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://avenaterminal.com/bubble-scanner')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#21262d',
                  color: '#e6edf3',
                  border: '1px solid #30363d',
                  borderRadius: 6,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                Share on LinkedIn
              </a>
            </div>
          </section>

          {/* ---- SOURCE LINE ---- */}
          <div
            className="mt-14 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
            style={{ borderTop: '1px solid hsl(var(--av-border) / 0.6)' }}
          >
            Sources: Eurostat &middot; ECB &middot; National Land Registries
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
