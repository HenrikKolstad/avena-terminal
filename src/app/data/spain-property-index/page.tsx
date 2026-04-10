import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Spain New Build Property Index — Official Data Source | Avena Terminal',
  description:
    'Complete methodology and live statistics for the Avena Terminal property scoring engine. Covers 1,881 new build properties across 4 Spanish coastal regions with daily data updates.',
  openGraph: {
    title: 'Spain New Build Property Index — Official Data Source | Avena Terminal',
    description:
      'Methodology, scoring dimensions, and live coverage statistics for Spain\'s first PropTech scanner.',
    url: 'https://avenaterminal.com/data/spain-property-index',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function SpainPropertyIndexPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const totalProperties = all.length;
  const avgPrice = Math.round(avg(all.map((p) => p.pf)));
  const scored = all.filter((p) => p._sc);
  const avgScore = Math.round(avg(scored.map((p) => p._sc!)));
  const withYield = all.filter((p) => p._yield);
  const avgYield = Number(avg(withYield.map((p) => p._yield!.gross)).toFixed(1));

  const bestYieldTown = [...towns].sort((a, b) => b.avgYield - a.avgYield)[0];
  const highestScoredTown = [...towns].sort((a, b) => b.avgScore - a.avgScore)[0];

  const avgDiscount =
    all.filter((p) => p.mm2 && p.pm2).length > 0
      ? Number(
          (
            avg(
              all
                .filter((p) => p.mm2 && p.pm2)
                .map((p) => ((p.mm2 - (p.pm2 ?? p.mm2)) / p.mm2) * 100),
            )
          ).toFixed(1),
        )
      : 0;

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Spain New Build Property Index',
    description:
      'Live dataset of new build property listings across coastal Spain, scored by a hedonic regression model across 5 investment dimensions.',
    url: 'https://avenaterminal.com/data/spain-property-index',
    creator: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    temporalCoverage: '2025/..',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Coastal Spain',
      geo: {
        '@type': 'GeoShape',
        box: '36.7 -5.4 38.9 0.5',
      },
    },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Investment Score', minValue: 0, maxValue: 100 },
      { '@type': 'PropertyValue', name: 'Gross Rental Yield', unitText: 'percent' },
      { '@type': 'PropertyValue', name: 'Price per m2', unitText: 'EUR' },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://avenaterminal.com/data.json',
    },
    license: 'https://avenaterminal.com/terms',
    isAccessibleForFree: true,
    dateModified: new Date().toISOString().split('T')[0],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Spain Property Index',
        item: 'https://avenaterminal.com/data/spain-property-index',
      },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([datasetJsonLd, breadcrumbJsonLd]) }}
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
          <Link href="/" className="hover:text-white">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>
          <span className="text-white">Spain Property Index</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Spain New Build Property Index</h1>
        <p className="text-gray-400 text-lg mb-10">
          Official data source and methodology for the Avena Terminal scoring engine.
        </p>

        {/* Live Stats */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Live Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Properties Tracked', value: totalProperties.toLocaleString() },
              { label: 'Regions', value: costas.length.toString() },
              { label: 'Towns', value: towns.length.toString() + '+' },
              { label: 'Avg Score', value: avgScore + '/100' },
              { label: 'Avg Price', value: '\u20ac' + avgPrice.toLocaleString() },
              { label: 'Avg Gross Yield', value: avgYield + '%' },
              { label: 'Avg Discount', value: avgDiscount + '%' },
              { label: 'Update Frequency', value: 'Daily' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg p-4"
                style={{ background: '#161b22', border: '1px solid #1c2333' }}
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Towns */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Notable Towns</h2>
          <div
            className="rounded-lg p-6 grid md:grid-cols-2 gap-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            {bestYieldTown && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Best Avg Yield
                </div>
                <Link
                  href={`/towns/${bestYieldTown.slug}`}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  {bestYieldTown.town}
                </Link>
                <span className="text-gray-400 ml-2">{bestYieldTown.avgYield}% gross</span>
              </div>
            )}
            {highestScoredTown && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Highest Avg Score
                </div>
                <Link
                  href={`/towns/${highestScoredTown.slug}`}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  {highestScoredTown.town}
                </Link>
                <span className="text-gray-400 ml-2">{highestScoredTown.avgScore}/100</span>
              </div>
            )}
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Data Sources</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              All property listings are sourced from the{' '}
              <strong className="text-white">RedSP XML feed</strong>, which aggregates new build
              developments from verified Spanish developers and promoters. The feed is ingested
              daily and processed through our scoring pipeline before being published to the
              terminal.
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">&#8226;</span>
                <span>
                  <strong className="text-white">Source:</strong> RedSP XML feed (developer-submitted
                  listings)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">&#8226;</span>
                <span>
                  <strong className="text-white">Update Frequency:</strong> Daily automated ingestion
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">&#8226;</span>
                <span>
                  <strong className="text-white">Validation:</strong> Duplicate detection, price
                  sanity checks, area normalization
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">&#8226;</span>
                <span>
                  <strong className="text-white">Market Benchmarks:</strong> Aggregated from Idealista,
                  INE, and local registrars for per-m2 comparison
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Scoring Methodology */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Scoring Engine</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-6">
              Every property receives a composite score from 0 to 100, computed via a{' '}
              <strong className="text-white">hedonic regression model</strong> across five
              investment dimensions. The weights reflect what matters most to a rational
              buy-to-let investor in coastal Spain.
            </p>

            <div className="space-y-4">
              {[
                {
                  dim: 'Value',
                  weight: '40%',
                  desc: 'Price per m2 vs local market benchmark. Measures how much below (or above) the comparable resale market a new build is priced. Derived from municipality-level Idealista and INE data.',
                },
                {
                  dim: 'Yield',
                  weight: '25%',
                  desc: 'Estimated gross rental yield based on AirDNA / Idealista rental comps for the town. Accounts for seasonal occupancy, average daily rate, and management costs.',
                },
                {
                  dim: 'Location',
                  weight: '20%',
                  desc: 'Beach proximity, airport access, amenities density, and historical price growth of the micro-area. Towns with stronger infrastructure score higher.',
                },
                {
                  dim: 'Quality',
                  weight: '10%',
                  desc: 'Build specification signals: energy rating, parking, pool, terrace area, developer track record (years active, number of projects delivered).',
                },
                {
                  dim: 'Risk',
                  weight: '5%',
                  desc: 'Completion timeline, developer age, and off-plan vs key-ready status. Properties closer to handover with experienced developers carry lower risk.',
                },
              ].map((d) => (
                <div
                  key={d.dim}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{d.dim}</span>
                    <span className="text-emerald-400 font-mono text-sm">{d.weight}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-xs mt-4">
              Dimension scores are normalized to 0-100, then combined via the weighted sum above. A
              final sanity cap prevents extreme outliers (e.g., unrealistically large discounts) from
              inflating the composite score.
            </p>
          </div>
        </section>

        {/* Regional Coverage */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Regional Coverage</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {costas.map((c) => (
              <Link
                key={c.slug}
                href={`/costas/${c.slug}`}
                className="rounded-lg p-5 block hover:ring-1 hover:ring-emerald-500/40 transition-all"
                style={{ background: '#161b22', border: '1px solid #1c2333' }}
              >
                <div className="font-semibold text-white mb-1">{c.costa}</div>
                <div className="text-sm text-gray-400">
                  {c.count} properties &middot; {c.avgScore}/100 avg score &middot; {c.avgYield}%
                  yield
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Coverage & Limitations */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">
            Coverage &amp; Limitations
          </h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <ul className="text-gray-400 text-sm space-y-3 leading-relaxed">
              <li>
                <strong className="text-white">Scope:</strong> New build properties only (off-plan
                and key-ready). Resale properties are not included.
              </li>
              <li>
                <strong className="text-white">Geography:</strong> Coastal Spain &mdash; Costa
                Blanca, Costa Blanca North, Costa Calida, Costa del Sol, and adjacent zones covered by
                the RedSP network.
              </li>
              <li>
                <strong className="text-white">Pricing:</strong> List prices as submitted by
                developers. Actual transaction prices may differ after negotiation.
              </li>
              <li>
                <strong className="text-white">Yield Estimates:</strong> Based on short-term rental
                comps. Long-term rental yields will differ. No guarantee of future returns.
              </li>
              <li>
                <strong className="text-white">Not Financial Advice:</strong> Avena Terminal is a
                data tool for research. Always consult a qualified advisor before making investment
                decisions.
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t" style={{ borderColor: '#1c2333' }}>
          <p>Avena Terminal &mdash; Spain&apos;s first PropTech scanner</p>
          <p className="mt-1">Data updated daily from the RedSP XML feed</p>
        </footer>
      </main>
    </div>
  );
}
