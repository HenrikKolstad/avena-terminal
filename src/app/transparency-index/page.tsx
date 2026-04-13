import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'European Property Transparency Index 2026 | Avena Terminal',
  description:
    'The first AI-generated property transparency index for Europe. 10 countries scored across 6 dimensions including data availability, market liquidity, and AI-readiness.',
  openGraph: {
    title: 'European Property Transparency Index 2026 | Avena Terminal',
    description: 'AI-generated transparency rankings for 10 European property markets across 6 dimensions.',
    url: 'https://avenaterminal.com/transparency-index',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/transparency-index' },
};

interface CountryScores {
  country: string;
  dataAvailability: number;
  marketLiquidity: number;
  regulatoryClarity: number;
  aiReadiness: number;
  developerAccountability: number;
  priceDiscovery: number;
}

const countries: CountryScores[] = [
  { country: 'Netherlands', dataAvailability: 92, marketLiquidity: 88, regulatoryClarity: 90, aiReadiness: 85, developerAccountability: 87, priceDiscovery: 91 },
  { country: 'Germany', dataAvailability: 88, marketLiquidity: 82, regulatoryClarity: 91, aiReadiness: 80, developerAccountability: 86, priceDiscovery: 84 },
  { country: 'France', dataAvailability: 84, marketLiquidity: 80, regulatoryClarity: 87, aiReadiness: 78, developerAccountability: 82, priceDiscovery: 81 },
  { country: 'Spain', dataAvailability: 72, marketLiquidity: 85, regulatoryClarity: 74, aiReadiness: 76, developerAccountability: 68, priceDiscovery: 79 },
  { country: 'Portugal', dataAvailability: 68, marketLiquidity: 74, regulatoryClarity: 72, aiReadiness: 70, developerAccountability: 65, priceDiscovery: 73 },
  { country: 'Italy', dataAvailability: 62, marketLiquidity: 70, regulatoryClarity: 65, aiReadiness: 58, developerAccountability: 60, priceDiscovery: 68 },
  { country: 'Greece', dataAvailability: 55, marketLiquidity: 62, regulatoryClarity: 58, aiReadiness: 50, developerAccountability: 52, priceDiscovery: 60 },
  { country: 'Croatia', dataAvailability: 50, marketLiquidity: 55, regulatoryClarity: 60, aiReadiness: 45, developerAccountability: 48, priceDiscovery: 53 },
  { country: 'Cyprus', dataAvailability: 48, marketLiquidity: 58, regulatoryClarity: 55, aiReadiness: 42, developerAccountability: 45, priceDiscovery: 50 },
  { country: 'Malta', dataAvailability: 45, marketLiquidity: 50, regulatoryClarity: 52, aiReadiness: 38, developerAccountability: 42, priceDiscovery: 48 },
];

function overallScore(c: CountryScores): number {
  return Math.round(
    (c.dataAvailability + c.marketLiquidity + c.regulatoryClarity + c.aiReadiness + c.developerAccountability + c.priceDiscovery) / 6
  );
}

const ranked = [...countries].sort((a, b) => overallScore(b) - overallScore(a));

const dimensions = [
  {
    name: 'Data Availability',
    key: 'dataAvailability' as const,
    description: 'Measures the breadth and depth of publicly accessible property transaction data, listing data, and cadastral records.',
  },
  {
    name: 'Market Liquidity',
    key: 'marketLiquidity' as const,
    description: 'Assesses transaction volumes, time-on-market, and the ease of buying and selling property in each market.',
  },
  {
    name: 'Regulatory Clarity',
    key: 'regulatoryClarity' as const,
    description: 'Evaluates the clarity and predictability of property laws, foreign ownership rules, taxation, and planning regulations.',
  },
  {
    name: 'AI-Readiness',
    key: 'aiReadiness' as const,
    description: 'Scores the availability of structured, machine-readable property data suitable for automated valuation models and AI analysis.',
  },
  {
    name: 'Developer Accountability',
    key: 'developerAccountability' as const,
    description: 'Rates the enforceability of developer guarantees, bank guarantee requirements, build quality inspections, and completion track records.',
  },
  {
    name: 'Price Discovery Efficiency',
    key: 'priceDiscovery' as const,
    description: 'Measures how accurately asking prices reflect true market value, based on bid-ask spreads, appraisal accuracy, and price index reliability.',
  },
];

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#fbbf24';
  return '#ef4444';
}

export default function TransparencyIndexPage() {
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena European Property Transparency Index 2026',
    description: 'AI-generated transparency index scoring 10 European countries across 6 dimensions of property market transparency.',
    creator: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    datePublished: '2026-01-15',
    dateModified: '2026-04-01',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    url: 'https://avenaterminal.com/transparency-index',
    keywords: ['property transparency', 'European real estate', 'transparency index', 'AI-generated'],
    temporalCoverage: '2026',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Europe',
    },
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
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
        {/* Hero */}
        <div className="mb-2">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: '#10b981', color: '#000' }}
          >
            2026 EDITION
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-4">
          Avena European Property Transparency Index 2026
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          The first AI-generated property transparency index for Europe
        </p>

        {/* Rankings Table */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Rankings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Country</th>
                  <th className="px-3 py-3 font-medium text-center">Overall</th>
                  <th className="px-3 py-3 font-medium text-center">Data</th>
                  <th className="px-3 py-3 font-medium text-center">Liquidity</th>
                  <th className="px-3 py-3 font-medium text-center">Regulatory</th>
                  <th className="px-3 py-3 font-medium text-center">AI-Ready</th>
                  <th className="px-3 py-3 font-medium text-center">Developer</th>
                  <th className="px-3 py-3 font-medium text-center">Price Disc.</th>
                  <th className="px-3 py-3 font-medium text-center">YoY</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => {
                  const overall = overallScore(c);
                  const isTop3 = i < 3;
                  return (
                    <tr
                      key={c.country}
                      className="border-t"
                      style={{
                        borderColor: '#1c2333',
                        background: isTop3 ? 'rgba(16,185,129,0.05)' : 'transparent',
                      }}
                    >
                      <td className="px-3 py-3 font-bold" style={{ color: isTop3 ? '#10b981' : '#9ca3af' }}>
                        {i + 1}
                      </td>
                      <td className="px-3 py-3 font-semibold text-white">
                        {c.country}
                        {i === 0 && <span className="ml-2 text-xs" title="Top ranked">&#x1f947;</span>}
                        {i === 1 && <span className="ml-2 text-xs" title="Second place">&#x1f948;</span>}
                        {i === 2 && <span className="ml-2 text-xs" title="Third place">&#x1f949;</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-bold" style={{ color: scoreColor(overall) }}>
                        {overall}
                      </td>
                      {[c.dataAvailability, c.marketLiquidity, c.regulatoryClarity, c.aiReadiness, c.developerAccountability, c.priceDiscovery].map(
                        (score, j) => (
                          <td key={j} className="px-3 py-3 text-center" style={{ color: scoreColor(score) }}>
                            {score}
                          </td>
                        )
                      )}
                      <td className="px-3 py-3 text-center text-xs text-gray-500">NEW</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Scores 0&ndash;100. Higher is better. Color coding: green (&ge;80), yellow (&ge;60), red (&lt;60).
          </p>
        </section>

        {/* Methodology */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Methodology</h2>
          <p className="text-gray-400 mb-6">
            Each country is scored 0&ndash;100 on six dimensions. The overall transparency score is the
            unweighted average of all six dimensions.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {dimensions.map((dim) => (
              <div
                key={dim.key}
                className="rounded-lg p-5"
                style={{ background: '#161b22', border: '1px solid #1c2333' }}
              >
                <div className="font-semibold text-white mb-2">{dim.name}</div>
                <p className="text-sm text-gray-400">{dim.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Schedule */}
        <section className="mb-16">
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-400">
              Published annually. Next update: <strong className="text-white">January 2027</strong>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Methodology and data sources are reviewed each cycle. Suggestions welcome at henrik@xaviaestate.com.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t" style={{ borderColor: '#1c2333' }}>
          <p>Avena Terminal &mdash; European Property Intelligence</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' \u00B7 '}
            <Link href="/press" className="text-gray-500 hover:text-gray-300">Press</Link>
            {' \u00B7 '}
            <Link href="/dataset" className="text-gray-500 hover:text-gray-300">Dataset</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
