import { Metadata } from 'next';
import Link from 'next/link';

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
        className="flex-1 rounded-lg border px-4 py-3 text-sm bg-transparent text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
        style={{ borderColor: '#30363d' }}
      />
      <button
        type="submit"
        className="rounded-lg px-6 py-3 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors whitespace-nowrap"
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
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#30363d', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/compare" className="text-sm text-gray-400 hover:text-white transition-colors">
              Compare
            </Link>
            <Link href="/bubble-scanner" className="text-sm text-gray-400 hover:text-white transition-colors">
              Bubble Scanner
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to Terminal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Portugal</span>
        </nav>

        {/* -------------------------------------------------------- */}
        {/*  1. Hero                                                  */}
        {/* -------------------------------------------------------- */}
        <section className="text-center mb-14">
          <div className="text-4xl mb-4">&#127477;&#127481;</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Portugal Property Intelligence
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Portugal is one of Europe&apos;s fastest-growing property markets — driven by lifestyle migration,
            digital nomad demand, and a tax regime that still favours international buyers. Explore regional
            pricing, tax frameworks, and investment routes across five key markets.
          </p>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  2. Market Data by Region                                 */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Market Data by Region</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {REGIONS.map((r) => (
              <div
                key={r.name}
                className="rounded-xl border p-6 flex flex-col"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <h3 className="text-lg font-bold text-white mb-2">{r.name}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4 flex-1">
                  {r.highlight}
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price Range</span>
                    <span className="text-emerald-400 font-semibold">{r.priceRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Yield</span>
                    <span className="text-white font-semibold">{r.yield}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Key Buyers</span>
                    <span className="text-white">{r.buyers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  3. Tax & Legal Framework                                 */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-2">Tax &amp; Legal Framework</h2>
          <p className="text-sm text-gray-400 mb-6">
            Key taxes and rates for property buyers and investors in Portugal (2026).
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-6">
            {/* NHR */}
            <div
              className="rounded-xl border p-6"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <h3 className="text-base font-bold text-white mb-3">NHR Regime (Modified 2024)</h3>
              <ul className="text-sm text-gray-300 space-y-2 leading-relaxed">
                <li><span className="text-emerald-400 font-semibold">20% flat rate</span> on Portuguese-sourced income for qualifying professions</li>
                <li>Available for 10 years to new Portuguese tax residents</li>
                <li>Crypto and pension tax benefits reduced under 2024 reform</li>
                <li>Foreign-sourced income may be exempt if taxed at source</li>
              </ul>
            </div>
            {/* Other taxes */}
            <div
              className="rounded-xl border p-6"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <h3 className="text-base font-bold text-white mb-3">Property Taxes</h3>
              <ul className="text-sm text-gray-300 space-y-2 leading-relaxed">
                <li><span className="text-emerald-400 font-semibold">IMI</span> (annual property tax): 0.3&ndash;0.45% of tax value</li>
                <li><span className="text-emerald-400 font-semibold">CGT</span>: 28% for non-residents on gains</li>
                <li><span className="text-emerald-400 font-semibold">Rental income</span>: 28% flat rate for non-residents</li>
                <li><span className="text-emerald-400 font-semibold">Stamp Duty</span>: 0.8% on purchase price</li>
              </ul>
            </div>
          </div>

          {/* IMT brackets */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#30363d' }}>
            <div
              className="text-xs uppercase tracking-wider text-gray-500 px-4 py-3 font-semibold"
              style={{ background: '#161b22' }}
            >
              IMT Transfer Tax Brackets (Urban Residential, Permanent Home)
            </div>
            {TAX_BRACKETS.map((row, i) => (
              <div
                key={row.bracket}
                className="grid grid-cols-2 px-4 py-3 border-t text-sm"
                style={{ borderColor: '#30363d', background: i % 2 === 0 ? '#0d1117' : '#161b22' }}
              >
                <div className="text-gray-400">{row.bracket}</div>
                <div className="text-white font-semibold text-right">{row.rate}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-right">
            IMT rates vary by property type and purpose. Secondary homes attract higher rates. Sources: AT (Autoridade Tribut&aacute;ria), 2026.
          </p>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  4. Buying Process                                        */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Buying Process</h2>
          <div className="space-y-4">
            {BUYING_STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-xl border p-5 flex gap-4 items-start"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  5. Golden Visa 2026                                      */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-2">Golden Visa 2026</h2>
          <p className="text-sm text-gray-400 mb-6">
            The landscape has shifted since the 2023 real estate route closure.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            <div
              className="rounded-xl border p-6"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <div className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-2">Closed</div>
              <h3 className="text-base font-bold text-white mb-2">Real Estate Route</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Direct property purchases no longer qualify for Golden Visa residency. Closed since October 2023.
              </p>
            </div>
            <div
              className="rounded-xl border p-6"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Open</div>
              <h3 className="text-base font-bold text-white mb-2">Fund Investment</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Minimum &euro;500,000 investment in qualifying Portuguese investment funds. Funds may include real estate exposure indirectly.
              </p>
            </div>
            <div
              className="rounded-xl border p-6"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Alternatives</div>
              <h3 className="text-base font-bold text-white mb-2">D7 &amp; Digital Nomad</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                D7 visa for passive income holders. Digital nomad visa for remote workers earning &euro;3,040+/month. Both lead to residency.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  6. Spain vs Portugal                                     */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-2">Spain vs Portugal &mdash; At a Glance</h2>
          <p className="text-sm text-gray-400 mb-6">
            How the two Iberian markets compare for international property buyers in 2026.
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#30363d' }}>
            <div
              className="grid grid-cols-3 text-xs uppercase tracking-wider text-gray-500 px-4 py-3"
              style={{ background: '#161b22' }}
            >
              <div>Metric</div>
              <div className="text-center">&#127466;&#127480; Spain</div>
              <div className="text-center">&#127477;&#127481; Portugal</div>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={row.metric}
                className="grid grid-cols-3 px-4 py-3 border-t text-sm"
                style={{ borderColor: '#30363d', background: i % 2 === 0 ? '#0d1117' : '#161b22' }}
              >
                <div className="text-gray-400 font-medium">{row.metric}</div>
                <div className="text-center text-white">{row.spain}</div>
                <div className="text-center text-white">{row.portugal}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-3 text-right">
            Sources: INE (Spain), INE (Portugal), Banco de Portugal, DBRS, Avena Terminal research. Data as of Q1 2026.
          </p>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  7. Bubble Scanner CTA                                    */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <div
            className="rounded-xl border p-8 text-center"
            style={{ background: '#161b22', borderColor: '#30363d' }}
          >
            <h2 className="text-xl font-bold text-white mb-2">European Bubble Scanner</h2>
            <p className="text-sm text-gray-400 mb-5">
              See Portugal cities in the European Bubble Scanner &mdash; track overvaluation risk, price momentum, and yield compression across the continent.
            </p>
            <Link
              href="/bubble-scanner"
              className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              Open Bubble Scanner
            </Link>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  8. Related Answers                                       */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-4">Portugal Property Answers</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {PORTUGAL_ANSWERS.map((a) => (
              <Link
                key={a.slug}
                href={`/answers/${a.slug}`}
                className="block rounded-xl border p-4 hover:border-emerald-500/40 transition-all"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <span className="text-emerald-400 mr-2">&rarr;</span>
                <span className="text-sm text-gray-300">{a.question}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/*  9. Email Capture                                         */}
        {/* -------------------------------------------------------- */}
        <section
          className="rounded-xl border p-8 text-center mb-14"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <h2 className="text-xl font-bold text-white mb-2">Get Portugal Market Alerts</h2>
          <p className="text-gray-400 text-sm mb-5">
            Regional price movements, tax changes, and new investment opportunities delivered to your inbox.
          </p>
          <EmailForm />
        </section>

        {/* Deep-dive CTA */}
        <section className="text-center mb-10">
          <Link
            href="/compare/es-vs-pt"
            className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
          >
            Deep Dive: Spain vs Portugal Comparison
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12" style={{ borderColor: '#30363d' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <span className="font-serif tracking-[0.15em] text-gray-400">AVENA</span>
          <span>Data-driven property investment intelligence for Europe&apos;s coasts.</span>
          <div className="flex gap-4">
            <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
            <Link href="/towns" className="hover:text-white transition-colors">Towns</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
