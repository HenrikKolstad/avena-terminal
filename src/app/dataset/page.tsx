import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Spanish New Build Property Dataset 2026 | Avena Terminal',
  description:
    'Open structured dataset tracking new build properties across coastal Spain. Prices, yields, scores, specifications, and 24 data points per listing. Updated daily.',
  openGraph: {
    title: 'Spanish New Build Property Dataset 2026 | Avena Terminal',
    description: 'Structured property dataset with 24 data points per listing across Costa Blanca, Costa Calida, and Costa del Sol.',
    url: 'https://avenaterminal.com/dataset',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/dataset' },
};

const DATA_DICTIONARY: { field: string; type: string; description: string }[] = [
  { field: 'pf', type: 'number', description: 'Asking price (EUR), lower bound' },
  { field: 'pt', type: 'number', description: 'Asking price (EUR), upper bound' },
  { field: 'pm2', type: 'number', description: 'Price per square metre (EUR/m2)' },
  { field: 'mm2', type: 'number', description: 'Local market resale price per m2 benchmark' },
  { field: 'bm', type: 'number', description: 'Built area in square metres' },
  { field: 'pl', type: 'number | null', description: 'Plot area in square metres (villas only)' },
  { field: 'bd', type: 'number', description: 'Number of bedrooms' },
  { field: 'ba', type: 'number', description: 'Number of bathrooms' },
  { field: 'bk', type: 'number | null', description: 'Distance to nearest beach in km' },
  { field: 't', type: 'string', description: 'Property type: villa, apartment, penthouse, townhouse, bungalow, studio' },
  { field: 'l', type: 'string', description: 'Town / municipality name' },
  { field: 'costa', type: 'string', description: 'Coastal region: Costa Blanca, Costa Calida, Costa del Sol' },
  { field: 'd', type: 'string', description: 'Developer / promoter name' },
  { field: 's', type: 'string', description: 'Build status: key-ready, under-construction, off-plan' },
  { field: 'c', type: 'string', description: 'Expected completion date' },
  { field: '_sc', type: 'number', description: 'Composite investment score (0-100)' },
  { field: '_yield.gross', type: 'number', description: 'Estimated gross annual rental yield (%)' },
  { field: '_yield.net', type: 'number', description: 'Estimated net annual rental yield (%)' },
  { field: 'lat', type: 'number | null', description: 'GPS latitude (WGS84)' },
  { field: 'lng', type: 'number | null', description: 'GPS longitude (WGS84)' },
  { field: 'energy', type: 'string | null', description: 'Energy efficiency rating (A-G)' },
  { field: 'pool', type: 'string', description: 'Pool type: private, communal, yes, no' },
  { field: 'parking', type: 'number', description: 'Number of parking spaces' },
  { field: 'ref', type: 'string', description: 'Unique property reference identifier' },
];

export default function DatasetPage() {
  const properties = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const sample = properties.slice(0, 10);

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Spanish New Build Property Dataset 2026',
    description: `Structured dataset of ${properties.length.toLocaleString()} new build properties across coastal Spain.`,
    url: 'https://avenaterminal.com/dataset',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: new Date().toISOString().split('T')[0],
    license: 'https://avenaterminal.com/terms',
    keywords: ['Spanish property data', 'new build Spain', 'rental yield', 'PropTech dataset'],
    spatialCoverage: { '@type': 'Place', name: 'Coastal Spain' },
    temporalCoverage: '2025-01-01/..',
    speakableSpecification: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.dataset-summary'],
    },
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: 'hsl(var(--av-background))' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: 'hsl(var(--av-border))', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Spanish New Build Property Dataset
          </h1>
          <p className="dataset-summary text-gray-400 text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            {properties.length.toLocaleString()} properties tracked across {towns.length} towns in coastal Spain.
            24 structured data points per listing. Updated daily.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/api/dataset"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-black"
              style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
            >
              Download JSON-LD
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              Explore Terminal
            </Link>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: 'Total Properties', value: properties.length.toLocaleString() },
            { label: 'Regions Covered', value: costas.length.toString() },
            { label: 'Data Points / Listing', value: '24' },
            { label: 'Update Frequency', value: 'Daily' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-6 text-center"
              style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
            >
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Methodology */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Methodology</h2>
          <div className="rounded-lg p-6" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <p className="text-gray-300 leading-relaxed mb-4">
              Every property is scored using a hedonic regression model estimated via Ordinary Least Squares
              (OLS). The dependent variable is the natural logarithm of price per square metre. Independent
              variables include town dummy variables (one per municipality), property type controls (apartment,
              villa, townhouse, penthouse, bungalow, studio), bedroom count, beach distance, and a set of
              premium multipliers for amenities such as pools, parking, and energy ratings.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              The regression residual for each property indicates whether it is under- or over-priced relative
              to comparable stock. This residual feeds the Value dimension (40% weight), which is combined with
              Yield (25%), Location (20%), Quality (10%), and Risk (5%) sub-scores to produce a composite 0-100
              investment score.
            </p>
            <p className="text-gray-300 leading-relaxed">
              The model is re-estimated monthly on rolling 12-month resale transaction data from the
              Registradores de Espana. See the{' '}
              <Link href="/about/methodology" className="text-primary hover:underline">
                full methodology
              </Link>{' '}
              for academic references and confidence intervals.
            </p>
          </div>
        </section>

        {/* Sample Data */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Sample Data (10 rows)</h2>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid hsl(var(--av-border))' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'hsl(var(--av-surface))' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Town</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Price</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Gross Yield %</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Score</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">EUR/m2</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((p, i) => (
                  <tr
                    key={p.ref ?? i}
                    className="border-t"
                    style={{ borderColor: 'hsl(var(--av-border))', background: i % 2 === 0 ? 'hsl(var(--av-background))' : 'hsl(var(--av-surface))' }}
                  >
                    <td className="px-4 py-3 text-gray-200">{p.l}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{p.t}</td>
                    <td className="px-4 py-3 text-right text-gray-200">
                      {p.pf.toLocaleString('en', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-primary">
                      {p._yield ? `${p._yield.gross.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{p._sc ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {p.pm2 ? `${Math.round(p.pm2).toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Dictionary */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Data Dictionary</h2>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid hsl(var(--av-border))' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'hsl(var(--av-surface))' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Field</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {DATA_DICTIONARY.map((row, i) => (
                  <tr
                    key={row.field}
                    className="border-t"
                    style={{ borderColor: 'hsl(var(--av-border))', background: i % 2 === 0 ? 'hsl(var(--av-background))' : 'hsl(var(--av-surface))' }}
                  >
                    <td className="px-4 py-3 font-mono text-primary">{row.field}</td>
                    <td className="px-4 py-3 text-gray-400">{row.type}</td>
                    <td className="px-4 py-3 text-gray-300">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Citation</h2>
          <div className="rounded-lg p-6" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <p className="text-gray-400 text-sm mb-3">If you use this dataset in academic or commercial work, please cite:</p>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed bg-black/30 rounded p-4 select-all">
{`Kolstad, H. (2026). Spanish New Build Property Dataset.
Avena Terminal. https://avenaterminal.com/dataset.
Accessed ${new Date().toISOString().split('T')[0]}.`}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t" style={{ borderColor: 'hsl(var(--av-border))' }}>
          <p>Avena Terminal &mdash; Spain&apos;s first PropTech scanner</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' · '}
            <Link href="/about/methodology" className="text-gray-500 hover:text-gray-300">Methodology</Link>
            {' · '}
            <Link href="/press" className="text-gray-500 hover:text-gray-300">Press</Link>
            {' · '}
            <Link href="/data-partners" className="text-gray-500 hover:text-gray-300">Data Partners</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
