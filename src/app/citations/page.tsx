import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Sources & Citations | Avena Terminal',
  description:
    'All external data sources, academic references, and industry reports cited by Avena Terminal. Links to RedSP, AirDNA, Booking.com, INE, Registradores de Espana, and Banco de Espana.',
  openGraph: {
    title: 'Data Sources & Citations | Avena Terminal',
    description:
      'External data sources, academic references, and industry reports behind Avena Terminal\'s scoring engine.',
    url: 'https://avenaterminal.com/citations',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/citations' },
};

export default function CitationsPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Citations', item: 'https://avenaterminal.com/citations' },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Citations</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Data Sources &amp; Citations
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          External data providers, academic references, and industry reports used by Avena Terminal
        </p>

        {/* External Data Sources */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">External Data Sources</h2>
          <div className="space-y-4">
            {[
              {
                name: 'RedSP (Red de Servicios de Promociones)',
                url: 'https://www.redsp.com',
                desc: 'Primary new build listing feed. Provides structured property data (prices, specifications, GPS coordinates, developer details) for new developments across coastal Spain. Data ingested daily via XML feed.',
                usage: 'Listing prices, property specifications, developer information, availability status.',
              },
              {
                name: 'AirDNA',
                url: 'https://www.airdna.co',
                desc: 'Short-term rental analytics platform providing market-level performance data for Airbnb and Vrbo listings. Used to validate and supplement our comparable-based yield estimates.',
                usage: 'Rental market benchmarking, occupancy rate validation, average daily rate trends.',
              },
              {
                name: 'Booking.com',
                url: 'https://www.booking.com',
                desc: 'Global accommodation platform. Comparable property listings on Booking.com are used alongside Airbnb data to estimate achievable nightly rates for short-term rental yield calculations.',
                usage: 'Nightly rate comparables, seasonal pricing patterns, property type benchmarks.',
              },
              {
                name: 'INE (Instituto Nacional de Estadistica)',
                url: 'https://www.ine.es',
                desc: 'Spain\'s national statistics office. Publishes the official Housing Price Index (Indice de Precios de Vivienda) at provincial level, as well as population, tourism, and economic data.',
                usage: 'Provincial housing price index, CAGR calculations, macro-economic indicators, tourism statistics.',
              },
              {
                name: 'Registradores de Espana',
                url: 'https://www.registradores.org',
                desc: 'The association of Spanish property registrars. Publishes quarterly statistics on recorded property transactions including median prices, transaction volumes, and buyer nationality breakdowns at municipal level.',
                usage: 'Transaction-price benchmarks, municipal median price per m2, buyer demographics.',
              },
              {
                name: 'Banco de Espana',
                url: 'https://www.bde.es',
                desc: 'Spain\'s central bank. Publishes mortgage market data, housing market risk assessments, and financial stability indicators relevant to the residential property sector.',
                usage: 'Mortgage rate data, housing market indicators, financial stability context.',
              },
              {
                name: 'Idealista',
                url: 'https://www.idealista.com',
                desc: 'Spain\'s largest property portal. Listing-price data is used as a supplementary benchmark in municipalities where Registradores transaction data lacks granularity.',
                usage: 'Supplementary price benchmarks, listing-price indices, market coverage gaps.',
              },
              {
                name: 'Fotocasa',
                url: 'https://www.fotocasa.es',
                desc: 'Major Spanish property portal operated by Adevinta. Provides additional listing-price data for cross-referencing local market conditions.',
                usage: 'Secondary listing-price reference, market trend validation.',
              },
            ].map((source) => (
              <div
                key={source.name}
                className="rounded-lg p-6"
                style={{ background: '#161b22', border: '1px solid #1c2333' }}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-white">{source.name}</h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors shrink-0"
                  >
                    {source.url.replace('https://www.', '')} &rarr;
                  </a>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">{source.desc}</p>
                <p className="text-gray-500 text-xs">
                  <strong className="text-gray-400">Used for:</strong> {source.usage}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Academic References */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Academic References</h2>
          <p className="text-gray-400 mb-4 text-sm">
            The hedonic pricing model and valuation methodology used by Avena Terminal draw on established
            academic research in real estate economics.
          </p>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <ul className="space-y-4 text-gray-300 text-sm leading-relaxed">
              <li>
                <strong className="text-white">Rosen, S. (1974).</strong> &quot;Hedonic Prices and Implicit
                Markets: Product Differentiation in Pure Competition.&quot;{' '}
                <em>Journal of Political Economy</em>, 82(1), 34-55. &mdash; The foundational paper for
                hedonic pricing theory, establishing the framework for decomposing product prices into
                implicit attribute prices.
              </li>
              <li>
                <strong className="text-white">Sirmans, G.S., Macpherson, D.A., &amp; Zietz, E.N. (2005).</strong>{' '}
                &quot;The Composition of Hedonic Pricing Models.&quot;{' '}
                <em>Journal of Real Estate Literature</em>, 13(1), 1-44. &mdash; A meta-analysis of 125
                hedonic pricing studies identifying which property characteristics most consistently affect
                house prices.
              </li>
              <li>
                <strong className="text-white">Malpezzi, S. (2002).</strong> &quot;Hedonic Pricing Models:
                A Selective and Applied Review.&quot;{' '}
                <em>Housing Economics and Public Policy</em>, Blackwell. &mdash; A practical guide to
                implementing hedonic models in housing market analysis, including specification choices and
                data requirements.
              </li>
              <li>
                <strong className="text-white">Palmquist, R.B. (2005).</strong> &quot;Property Value Models.&quot;{' '}
                <em>Handbook of Environmental Economics</em>, Vol. 2, Elsevier. &mdash; Extends hedonic
                methods to incorporate environmental and location amenity variables, relevant to our
                Location dimension.
              </li>
              <li>
                <strong className="text-white">Hill, R.J. (2013).</strong> &quot;Hedonic Price Indexes for
                Residential Housing: A Survey, Evaluation and Taxonomy.&quot;{' '}
                <em>Journal of Economic Surveys</em>, 27(5), 879-914. &mdash; Comprehensive review of
                hedonic index construction methods used by statistical offices worldwide.
              </li>
              <li>
                <strong className="text-white">European Central Bank (2023).</strong> &quot;Residential
                Property Prices: Methodological Framework.&quot; ECB Statistics Paper Series. &mdash;
                Describes the ECB&apos;s hedonic-based approach to harmonised residential property price
                measurement across the eurozone.
              </li>
            </ul>
          </div>
        </section>

        {/* Industry Reports */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Industry Reports</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <ul className="space-y-4 text-gray-300 text-sm leading-relaxed">
              <li>
                <strong className="text-white">Banco de Espana (2024).</strong> &quot;Spanish Housing Market
                Monitor.&quot; Financial Stability Report. &mdash; Central bank assessment of Spanish
                housing market risks and price dynamics.{' '}
                <a
                  href="https://www.bde.es/bde/en/areas/estabilida/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  bde.es &rarr;
                </a>
              </li>
              <li>
                <strong className="text-white">Registradores de Espana (2024).</strong> &quot;Estadistica
                Registral Inmobiliaria.&quot; &mdash; Quarterly statistical bulletin on Spanish property
                transactions, prices, and mortgage activity.{' '}
                <a
                  href="https://www.registradores.org/actualidad/portal-estadistico-registral/estadisticas-de-propiedad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  registradores.org &rarr;
                </a>
              </li>
              <li>
                <strong className="text-white">INE (2024).</strong> &quot;Indice de Precios de Vivienda
                (IPV).&quot; &mdash; Official quarterly housing price index for Spain, disaggregated by
                autonomous community and property type.{' '}
                <a
                  href="https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736152838&menu=ultiDatos&idp=1254735976607"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  ine.es &rarr;
                </a>
              </li>
              <li>
                <strong className="text-white">AirDNA (2025).</strong> &quot;Spain Short-Term Rental Market
                Report.&quot; &mdash; Annual market performance report covering occupancy, ADR, and RevPAR
                across Spanish tourist regions.{' '}
                <a
                  href="https://www.airdna.co/vacation-rental-data/app/es/default/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  airdna.co &rarr;
                </a>
              </li>
              <li>
                <strong className="text-white">CaixaBank Research (2024).</strong> &quot;Spanish Real Estate
                Sector Report.&quot; &mdash; Comprehensive analysis of supply-demand dynamics, price
                forecasts, and construction activity in the Spanish residential market.
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center text-xs text-gray-600 py-8 border-t"
          style={{ borderColor: '#1c2333' }}
        >
          <p>Avena Terminal &mdash; Spain&apos;s first PropTech scanner</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' · '}
            <Link href="/about/methodology" className="text-gray-500 hover:text-gray-300">Methodology</Link>
            {' · '}
            <Link href="/about/data-sources" className="text-gray-500 hover:text-gray-300">Data Sources</Link>
            {' · '}
            <Link href="/about/accuracy" className="text-gray-500 hover:text-gray-300">Accuracy</Link>
            {' · '}
            <Link href="/citations" className="text-gray-500 hover:text-gray-300">Citations</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
