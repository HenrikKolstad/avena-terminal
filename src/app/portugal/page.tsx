import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Portugal Property Intelligence | Avena Terminal',
  description:
    'Portugal property market data, NHR tax regime analysis, Golden Visa updates, and regional price intelligence for Algarve, Lisbon Coast, Silver Coast, Porto, and Madeira.',
  openGraph: {
    title: 'Portugal Property Intelligence | Avena Terminal',
    description:
      'Portugal property market data, NHR tax regime analysis, and regional price intelligence across 5 key regions.',
    url: 'https://avenaterminal.com/portugal',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const REGIONS = [
  {
    name: 'Algarve',
    priceRange: '\u20AC2,500\u20134,000/m\u00B2',
    yield: '4\u20136%',
    buyers: 'British, Dutch, German',
    highlight: 'Golden cliffs, 300 days of sun, mature rental market',
  },
  {
    name: 'Lisbon Coast',
    priceRange: '\u20AC4,000\u20137,000/m\u00B2',
    yield: '3\u20135%',
    buyers: 'Global demand',
    highlight: 'Capital appreciation leader, Cascais to Comporta corridor',
  },
  {
    name: 'Silver Coast',
    priceRange: '\u20AC1,500\u20132,500/m\u00B2',
    yield: '5\u20137%',
    buyers: 'British, Scandinavian, Belgian',
    highlight: 'Value play \u2014 Peniche to Nazar\u00E9, surf culture, medieval villages',
  },
  {
    name: 'Porto Metro',
    priceRange: '\u20AC2,800\u20134,500/m\u00B2',
    yield: '4\u20135%',
    buyers: 'French, Brazilian, American',
    highlight: 'Growing tech hub, UNESCO centre, Douro wine tourism',
  },
  {
    name: 'Madeira',
    priceRange: '\u20AC2,000\u20133,500/m\u00B2',
    yield: '5\u20137%',
    buyers: 'Digital nomads, German, Scandinavian',
    highlight: 'Digital nomad hub, subtropical climate, year-round demand',
  },
];

const TAX_BRACKETS: { bracket: string; rate: string }[] = [
  { bracket: 'Up to \u20AC97,064', rate: '0%' },
  { bracket: '\u20AC97,064 \u2013 \u20AC132,774', rate: '2%' },
  { bracket: '\u20AC132,774 \u2013 \u20AC181,034', rate: '5%' },
  { bracket: '\u20AC181,034 \u2013 \u20AC301,688', rate: '7%' },
  { bracket: '\u20AC301,688 \u2013 \u20AC603,289', rate: '8%' },
  { bracket: 'Over \u20AC603,289', rate: '6% (flat on total)' },
];

const BUYING_STEPS = [
  { step: '1', title: 'Get NIF', desc: 'Obtain your N\u00FAmero de Identifica\u00E7\u00E3o Fiscal at a local tax office or via representative. Required for all transactions.' },
  { step: '2', title: 'Hire a Lawyer', desc: 'Independent Portuguese lawyer to review contracts, verify title, and handle due diligence. Budget 1\u20131.5% of purchase price.' },
  { step: '3', title: 'CPCV Contract', desc: 'Contrato Promessa de Compra e Venda \u2014 binding preliminary contract with 10\u201330% deposit. Sets completion date and terms.' },
  { step: '4', title: 'Escritura at Notary', desc: 'Final deed signed before a public notary. Balance paid, ownership legally transfers. IMT and stamp duty paid before signing.' },
  { step: '5', title: 'Register at Conservat\u00F3ria', desc: 'Register the property at the Land Registry (Conservat\u00F3ria do Registo Predial). Final legal step to confirm ownership.' },
];

const COMPARISON_ROWS: { metric: string; spain: string; portugal: string }[] = [
  { metric: 'Avg Price/m\u00B2 (Coast)', spain: '\u20AC2,800', portugal: '\u20AC3,200' },
  { metric: 'Gross Rental Yield', spain: '5.2\u20137.8%', portugal: '4.5\u20136.5%' },
  { metric: 'Non-Resident Tax Rate', spain: '24% (19% EU)', portugal: '28% (NHR: 20% flat)' },
  { metric: 'Golden Visa', spain: 'RE closed (Apr 2025)', portugal: 'RE closed (2023), funds \u20AC500k' },
  { metric: 'Capital Gains Tax', spain: '19\u201326%', portugal: '28% non-residents' },
  { metric: 'Annual Property Tax', spain: '0.4\u20131.1% (IBI)', portugal: '0.3\u20130.45% (IMI)' },
  { metric: 'Transfer Tax', spain: '6\u201310% (varies)', portugal: '0\u20138% (IMT)' },
  { metric: 'Digital Nomad Visa', spain: 'Available (2023)', portugal: 'Available (2022)' },
  { metric: 'English Proficiency', spain: 'Moderate', portugal: 'High' },
  { metric: 'Language Barrier', spain: 'Higher for English speakers', portugal: 'Lower \u2014 widespread English' },
  { metric: 'EU Citizenship Path', spain: '10 years', portugal: '5 years' },
  { metric: 'Infrastructure', spain: 'Extensive rail + road', portugal: 'Improving, Lisbon-Porto fast rail' },
  { metric: 'Lifestyle', spain: 'Vibrant nightlife, large cities', portugal: 'Relaxed, coastal, community-driven' },
];

const PORTUGAL_ANSWERS = [
  { slug: 'portugal-nhr-tax-regime-2026', question: 'What is the NHR tax regime in Portugal in 2026?' },
  { slug: 'portugal-golden-visa-property-2026', question: 'Can you get a Golden Visa through property in Portugal in 2026?' },
  { slug: 'buying-property-algarve', question: 'How do I buy property in the Algarve?' },
  { slug: 'portugal-vs-spain-property-investment', question: 'Is Portugal or Spain better for property investment?' },
  { slug: 'rental-yield-lisbon-porto', question: 'What are rental yields in Lisbon and Porto?' },
];

/* ------------------------------------------------------------------ */
/*  Email capture form                                                 */
/* ------------------------------------------------------------------ */

function EmailForm() {
  return (
    <form
      action="/api/email-capture"
      method="POST"
      className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
    >
      <input type="hidden" name="source" value="portugal" />
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 rounded-sm border px-4 py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
      />
      <button
        type="submit"
        className="rounded-sm px-6 py-3 text-sm font-mono uppercase tracking-[0.2em] text-background whitespace-nowrap"
        style={{ background: 'hsl(var(--av-primary))' }}
      >
        Get Portugal Alerts
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortugalPage() {
  const placeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Portugal',
    description:
      'Portugal property market intelligence covering Algarve, Lisbon Coast, Silver Coast, Porto Metro, and Madeira.',
    url: 'https://avenaterminal.com/portugal',
    geo: { '@type': 'GeoCoordinates', latitude: 39.3999, longitude: -8.2245 },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the NHR tax regime in Portugal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Non-Habitual Resident regime offers a 20% flat tax rate on qualifying Portuguese-sourced income for eligible professions. Modified in 2024, crypto and pension benefits were reduced. Available for 10 years to new tax residents.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can you get a Golden Visa through property in Portugal in 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. The real estate route for Portugal Golden Visa was closed in 2023. The fund investment route remains open at a minimum of 500,000 euros. Alternatives include the D7 passive income visa and the digital nomad visa.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are property prices in the Algarve?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Algarve property prices range from 2,500 to 4,000 euros per square metre, with gross rental yields of 4-6%. Key buyer nationalities are British, Dutch, and German.',
        },
      },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Portugal</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Market Intelligence
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Portugal Property
                <br />
                <span className="italic text-gold">Intelligence</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Portugal is one of Europe&apos;s fastest-growing property markets — driven by lifestyle migration,
                digital nomad demand, and a tax regime that still favours international buyers. Explore regional
                pricing, tax frameworks, and investment routes across five key markets.
              </p>
            </div>
          </div>
        </section>

        {/* Market Data by Region */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Regions
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Market Data by Region
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {REGIONS.map((r) => (
                <div
                  key={r.name}
                  className="rounded-sm border p-6 flex flex-col"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <h3 className="font-serif text-xl font-light tracking-tight text-foreground mb-3">{r.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 font-light">
                    {r.highlight}
                  </p>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Price Range</span>
                      <span className="text-primary">{r.priceRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Gross Yield</span>
                      <span className="text-foreground">{r.yield}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Key Buyers</span>
                      <span className="text-foreground">{r.buyers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tax & Legal Framework */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Fiscal
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
                Tax &amp; Legal Framework
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                Key taxes and rates for property buyers and investors in Portugal (2026).
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <h3 className="font-serif text-lg font-light text-foreground mb-3">NHR Regime (Modified 2024)</h3>
                <ul className="text-sm text-muted-foreground font-light space-y-2 leading-relaxed">
                  <li><span className="text-primary">20% flat rate</span> on Portuguese-sourced income for qualifying professions</li>
                  <li>Available for 10 years to new Portuguese tax residents</li>
                  <li>Crypto and pension tax benefits reduced under 2024 reform</li>
                  <li>Foreign-sourced income may be exempt if taxed at source</li>
                </ul>
              </div>
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <h3 className="font-serif text-lg font-light text-foreground mb-3">Property Taxes</h3>
                <ul className="text-sm text-muted-foreground font-light space-y-2 leading-relaxed">
                  <li><span className="text-primary">IMI</span> (annual property tax): 0.3&ndash;0.45% of tax value</li>
                  <li><span className="text-primary">CGT</span>: 28% for non-residents on gains</li>
                  <li><span className="text-primary">Rental income</span>: 28% flat rate for non-residents</li>
                  <li><span className="text-primary">Stamp Duty</span>: 0.8% on purchase price</li>
                </ul>
              </div>
            </div>

            {/* IMT brackets */}
            <div className="overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div
                className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b"
                style={{ background: 'hsl(var(--av-surface) / 0.6)', borderColor: 'hsl(var(--av-border))' }}
              >
                IMT Transfer Tax Brackets (Urban Residential, Permanent Home)
              </div>
              {TAX_BRACKETS.map((row) => (
                <div
                  key={row.bracket}
                  className="grid grid-cols-2 px-4 py-3 border-b text-sm font-mono"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <div className="text-muted-foreground">{row.bracket}</div>
                  <div className="text-foreground text-right">{row.rate}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-2 text-right uppercase tracking-[0.2em]">
              IMT rates vary by property type and purpose. Secondary homes attract higher rates. Sources: AT (Autoridade Tribut&aacute;ria), 2026.
            </p>
          </div>
        </section>

        {/* Buying Process */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Process
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Buying Process
              </h2>
            </div>
            <div className="space-y-4">
              {BUYING_STEPS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-sm border p-5 flex gap-4 items-start"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm flex-shrink-0"
                    style={{ background: 'hsl(var(--av-primary) / 0.15)', color: 'hsl(var(--av-primary))' }}
                  >
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-light text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm font-light text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Golden Visa 2026 */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Residency
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
                Golden Visa 2026
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                The landscape has shifted since the 2023 real estate route closure.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-2">Closed</div>
                <h3 className="font-serif text-lg font-light text-foreground mb-2">Real Estate Route</h3>
                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                  Direct property purchases no longer qualify for Golden Visa residency. Closed since October 2023.
                </p>
              </div>
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Open</div>
                <h3 className="font-serif text-lg font-light text-foreground mb-2">Fund Investment</h3>
                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                  Minimum &euro;500,000 investment in qualifying Portuguese investment funds. Funds may include real estate exposure indirectly.
                </p>
              </div>
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Alternatives</div>
                <h3 className="font-serif text-lg font-light text-foreground mb-2">D7 &amp; Digital Nomad</h3>
                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                  D7 visa for passive income holders. Digital nomad visa for remote workers earning &euro;3,040+/month. Both lead to residency.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Spain vs Portugal */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Comparison
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
                Spain vs Portugal &mdash; At a Glance
              </h2>
              <p className="text-sm font-light text-muted-foreground">
                How the two Iberian markets compare for international property buyers in 2026.
              </p>
            </div>
            <div className="overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Metric</th>
                    <th className="text-center px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Spain</th>
                    <th className="text-center px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Portugal</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.metric} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-4 py-3 text-muted-foreground">{row.metric}</td>
                      <td className="px-4 py-3 text-center text-foreground">{row.spain}</td>
                      <td className="px-4 py-3 text-center text-foreground">{row.portugal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-3 text-right uppercase tracking-[0.2em]">
              Sources: INE (Spain), INE (Portugal), Banco de Portugal, DBRS, Avena Terminal research. Data as of Q1 2026.
            </p>
          </div>
        </section>

        {/* Bubble Scanner CTA */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <h2 className="font-serif text-3xl font-light text-foreground mb-3">
                European <span className="italic text-gold">Bubble Scanner</span>
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-6 max-w-2xl mx-auto">
                See Portugal cities in the European Bubble Scanner &mdash; track overvaluation risk, price momentum, and yield compression across the continent.
              </p>
              <Link
                href="/bubble-scanner"
                className="inline-block rounded-sm px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-background"
                style={{ background: 'hsl(var(--av-primary))' }}
              >
                Open Bubble Scanner
              </Link>
            </div>
          </div>
        </section>

        {/* Related Answers */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8">
              <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Library
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Portugal Property Answers
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {PORTUGAL_ANSWERS.map((a) => (
                <Link
                  key={a.slug}
                  href={`/answers/${a.slug}`}
                  className="block rounded-sm border p-4 transition-all hover:border-primary/40"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <span className="text-primary mr-2">&rarr;</span>
                  <span className="text-sm font-light text-foreground">{a.question}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Email Capture */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <h2 className="font-serif text-3xl font-light text-foreground mb-3">
                Get <span className="italic text-gold">Portugal</span> Alerts
              </h2>
              <p className="text-sm font-light text-muted-foreground mb-6 max-w-2xl mx-auto">
                Regional price movements, tax changes, and new investment opportunities delivered to your inbox.
              </p>
              <EmailForm />
            </div>
          </div>
        </section>

        {/* Deep-dive CTA */}
        <section className="relative border-t py-16 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Link
            href="/compare/es-vs-pt"
            className="inline-block rounded-sm px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-background"
            style={{ background: 'hsl(var(--av-primary))' }}
          >
            Deep Dive: Spain vs Portugal Comparison
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
