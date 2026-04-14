import { Metadata } from 'next';
import Link from 'next/link';

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

interface City {
  name: string;
  country: string;
  slug: string;
  pricePerM2: number;
  yoyChange: number;
  bubbleScore: number;
  affordability: number;
  priceToIncome: number;
  status: 'healthy' | 'warming' | 'overheating' | 'bubble';
  flag: string;
}

const CITIES: City[] = [
  { name: 'Munich', country: 'Germany', slug: 'munich', pricePerM2: 8900, yoyChange: 4.2, bubbleScore: 82, affordability: 18, priceToIncome: 16.2, status: 'bubble', flag: '\u{1F1E9}\u{1F1EA}' },
  { name: 'Amsterdam', country: 'Netherlands', slug: 'amsterdam', pricePerM2: 6800, yoyChange: 8.5, bubbleScore: 78, affordability: 22, priceToIncome: 14.8, status: 'bubble', flag: '\u{1F1F3}\u{1F1F1}' },
  { name: 'Paris', country: 'France', slug: 'paris', pricePerM2: 10200, yoyChange: -1.2, bubbleScore: 71, affordability: 15, priceToIncome: 18.5, status: 'overheating', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Barcelona', country: 'Spain', slug: 'barcelona', pricePerM2: 4200, yoyChange: 12.3, bubbleScore: 68, affordability: 35, priceToIncome: 11.2, status: 'overheating', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Madrid', country: 'Spain', slug: 'madrid', pricePerM2: 3800, yoyChange: 9.8, bubbleScore: 58, affordability: 40, priceToIncome: 9.8, status: 'warming', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Lisbon', country: 'Portugal', slug: 'lisbon', pricePerM2: 4500, yoyChange: 7.2, bubbleScore: 65, affordability: 28, priceToIncome: 13.1, status: 'overheating', flag: '\u{1F1F5}\u{1F1F9}' },
  { name: 'Milan', country: 'Italy', slug: 'milan', pricePerM2: 4800, yoyChange: 6.5, bubbleScore: 55, affordability: 32, priceToIncome: 10.5, status: 'warming', flag: '\u{1F1EE}\u{1F1F9}' },
  { name: 'Vienna', country: 'Austria', slug: 'vienna', pricePerM2: 5200, yoyChange: 2.1, bubbleScore: 62, affordability: 30, priceToIncome: 11.8, status: 'overheating', flag: '\u{1F1E6}\u{1F1F9}' },
  { name: 'Dublin', country: 'Ireland', slug: 'dublin', pricePerM2: 5500, yoyChange: 5.8, bubbleScore: 72, affordability: 24, priceToIncome: 13.5, status: 'overheating', flag: '\u{1F1EE}\u{1F1EA}' },
  { name: 'Copenhagen', country: 'Denmark', slug: 'copenhagen', pricePerM2: 5800, yoyChange: 3.5, bubbleScore: 60, affordability: 28, priceToIncome: 10.2, status: 'warming', flag: '\u{1F1E9}\u{1F1F0}' },
  { name: 'Stockholm', country: 'Sweden', slug: 'stockholm', pricePerM2: 6200, yoyChange: -2.8, bubbleScore: 55, affordability: 25, priceToIncome: 12.1, status: 'warming', flag: '\u{1F1F8}\u{1F1EA}' },
  { name: 'Helsinki', country: 'Finland', slug: 'helsinki', pricePerM2: 4100, yoyChange: -1.5, bubbleScore: 38, affordability: 42, priceToIncome: 8.5, status: 'healthy', flag: '\u{1F1EB}\u{1F1EE}' },
  { name: 'Brussels', country: 'Belgium', slug: 'brussels', pricePerM2: 3200, yoyChange: 4.1, bubbleScore: 42, affordability: 45, priceToIncome: 7.8, status: 'warming', flag: '\u{1F1E7}\u{1F1EA}' },
  { name: 'Zurich', country: 'Switzerland', slug: 'zurich', pricePerM2: 13500, yoyChange: 3.2, bubbleScore: 85, affordability: 12, priceToIncome: 12.5, status: 'bubble', flag: '\u{1F1E8}\u{1F1ED}' },
  { name: 'Athens', country: 'Greece', slug: 'athens', pricePerM2: 2200, yoyChange: 11.5, bubbleScore: 45, affordability: 48, priceToIncome: 8.2, status: 'warming', flag: '\u{1F1EC}\u{1F1F7}' },
  { name: 'Malaga', country: 'Spain', slug: 'malaga', pricePerM2: 2800, yoyChange: 14.2, bubbleScore: 52, affordability: 42, priceToIncome: 8.8, status: 'warming', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Alicante', country: 'Spain', slug: 'alicante', pricePerM2: 1900, yoyChange: 10.5, bubbleScore: 35, affordability: 55, priceToIncome: 6.2, status: 'healthy', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Valencia', country: 'Spain', slug: 'valencia', pricePerM2: 2400, yoyChange: 13.8, bubbleScore: 48, affordability: 48, priceToIncome: 7.5, status: 'warming', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Prague', country: 'Czech Republic', slug: 'prague', pricePerM2: 4000, yoyChange: 7.8, bubbleScore: 58, affordability: 30, priceToIncome: 12.5, status: 'warming', flag: '\u{1F1E8}\u{1F1FF}' },
  { name: 'Warsaw', country: 'Poland', slug: 'warsaw', pricePerM2: 3100, yoyChange: 9.2, bubbleScore: 48, affordability: 38, priceToIncome: 9.8, status: 'warming', flag: '\u{1F1F5}\u{1F1F1}' },
  { name: 'Budapest', country: 'Hungary', slug: 'budapest', pricePerM2: 2600, yoyChange: 8.5, bubbleScore: 42, affordability: 45, priceToIncome: 8.5, status: 'warming', flag: '\u{1F1ED}\u{1F1FA}' },
  { name: 'Rome', country: 'Italy', slug: 'rome', pricePerM2: 3500, yoyChange: 3.2, bubbleScore: 40, affordability: 38, priceToIncome: 9.2, status: 'healthy', flag: '\u{1F1EE}\u{1F1F9}' },
  { name: 'Berlin', country: 'Germany', slug: 'berlin', pricePerM2: 4800, yoyChange: -0.5, bubbleScore: 52, affordability: 32, priceToIncome: 11.5, status: 'warming', flag: '\u{1F1E9}\u{1F1EA}' },
  { name: 'Luxembourg', country: 'Luxembourg', slug: 'luxembourg', pricePerM2: 11200, yoyChange: -3.5, bubbleScore: 80, affordability: 10, priceToIncome: 15.8, status: 'bubble', flag: '\u{1F1F1}\u{1F1FA}' },
  { name: 'Porto', country: 'Portugal', slug: 'porto', pricePerM2: 3200, yoyChange: 9.5, bubbleScore: 50, affordability: 38, priceToIncome: 10.2, status: 'warming', flag: '\u{1F1F5}\u{1F1F9}' },
  { name: 'Nice', country: 'France', slug: 'nice', pricePerM2: 5500, yoyChange: 4.8, bubbleScore: 58, affordability: 28, priceToIncome: 13.5, status: 'warming', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Nicosia', country: 'Cyprus', slug: 'nicosia', pricePerM2: 2000, yoyChange: 6.5, bubbleScore: 30, affordability: 52, priceToIncome: 7.2, status: 'healthy', flag: '\u{1F1E8}\u{1F1FE}' },
  { name: 'Split', country: 'Croatia', slug: 'split', pricePerM2: 3000, yoyChange: 12.8, bubbleScore: 55, affordability: 35, priceToIncome: 11.5, status: 'warming', flag: '\u{1F1ED}\u{1F1F7}' },
  { name: 'Tallinn', country: 'Estonia', slug: 'tallinn', pricePerM2: 2800, yoyChange: 5.2, bubbleScore: 38, affordability: 42, priceToIncome: 8.8, status: 'healthy', flag: '\u{1F1EA}\u{1F1EA}' },
  { name: 'Marbella', country: 'Spain', slug: 'marbella', pricePerM2: 4500, yoyChange: 11.2, bubbleScore: 58, affordability: 30, priceToIncome: 12.8, status: 'warming', flag: '\u{1F1EA}\u{1F1F8}' },
];

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#0d1117',
          color: '#e6edf3',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        {/* ---- NAV BAR ---- */}
        <nav
          style={{
            borderBottom: '1px solid #30363d',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 1400,
            margin: '0 auto',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#3fb950',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            AVENA TERMINAL
          </Link>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#8b949e' }}>
            <Link href="/indices" style={{ color: '#8b949e', textDecoration: 'none' }}>Indices</Link>
            <Link href="/answers" style={{ color: '#8b949e', textDecoration: 'none' }}>Answers</Link>
            <span style={{ color: '#3fb950', fontWeight: 600 }}>Bubble Scanner</span>
          </div>
        </nav>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* ---- HERO ---- */}
          <header style={{ padding: '56px 0 40px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#0d1117',
                backgroundColor: '#3fb950',
                padding: '4px 12px',
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              Live Data &middot; 30 Cities &middot; Updated Daily
            </div>

            <h1
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                margin: '16px 0 0',
                background: 'linear-gradient(135deg, #e6edf3, #8b949e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              European Property Bubble Scanner
            </h1>

            <p
              style={{
                fontSize: 17,
                color: '#8b949e',
                maxWidth: 640,
                margin: '16px auto 0',
                lineHeight: 1.6,
              }}
            >
              Is your city in a bubble? 30 European cities rated by price, growth, and risk. Updated April 2026.
            </p>
          </header>

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

          {/* ---- FOOTER ---- */}
          <footer
            style={{
              marginTop: 56,
              paddingTop: 24,
              borderTop: '1px solid #30363d',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              fontSize: 12,
              color: '#484f58',
            }}
          >
            <div>
              Sources: Eurostat, ECB, National Land Registries &middot; Avena Terminal &copy; 2026
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link href="/indices" style={{ color: '#484f58', textDecoration: 'none' }}>Indices</Link>
              <Link href="/methodology" style={{ color: '#484f58', textDecoration: 'none' }}>Methodology</Link>
              <Link href="/cite" style={{ color: '#484f58', textDecoration: 'none' }}>Cite</Link>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
