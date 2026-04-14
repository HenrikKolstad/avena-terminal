import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';

export const metadata: Metadata = {
  title: 'Open Data Commons | Avena Terminal',
  description:
    'European property intelligence, open and free. Aggregate market data, indices, training data, and research papers under CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/data-commons' },
};
export const revalidate = 86400;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      <h3 className="text-lg font-semibold text-emerald-400 mb-3">{title}</h3>
      <div className="text-sm text-[#8b949e] leading-relaxed">{children}</div>
    </div>
  );
}

export default function DataCommonsPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const endpoints = [
    { data: 'Aggregate Dataset', endpoint: '/api/v1/open-dataset', format: 'JSON' },
    { data: 'Training Pairs', endpoint: '/api/model/training-data', format: 'JSON' },
    { data: 'RLHF Feed', endpoint: '/feed/rlhf.jsonl', format: 'JSONL' },
    { data: 'All Indices', endpoint: '/api/v1/indices', format: 'JSON' },
    { data: 'RDF/Turtle', endpoint: '/api/v1/rdf', format: 'Turtle' },
    { data: 'SPARQL', endpoint: '/api/v1/sparql', format: 'SPARQL JSON' },
    { data: 'NUTS Data', endpoint: '/api/v1/nuts', format: 'JSON' },
  ];

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Avena Open Data Commons',
    description:
      'European property intelligence data catalog. Aggregate market data, indices, AI training data, and research papers.',
    url: 'https://avenaterminal.com/data-commons',
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    dataset: [
      {
        '@type': 'Dataset',
        name: 'Avena Aggregate Market Data',
        description: `Aggregate property market statistics across ${towns.length} towns and ${costas.length} coastal regions in Spain.`,
        url: 'https://avenaterminal.com/api/v1/open-dataset',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: 'https://avenaterminal.com/api/v1/open-dataset',
        },
        creator: {
          '@type': 'Organization',
          name: 'Avena Terminal',
        },
      },
      {
        '@type': 'Dataset',
        name: 'Avena AI Training Data',
        description:
          '1,000+ Alpaca-format instruction pairs, RLHF feed, and pre-training corpus for European property AI models.',
        url: 'https://avenaterminal.com/api/model/training-data',
        license: 'https://creativecommons.org/licenses/by/4.0/',
      },
    ],
  };

  return (
    <div className="min-h-screen text-[#c9d1d9]" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
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
            AVENA TERMINAL
          </Link>
          <nav className="flex gap-4 text-sm text-[#8b949e]">
            <Link href="/license" className="hover:text-emerald-400 transition-colors">
              License
            </Link>
            <Link href="/cite" className="hover:text-emerald-400 transition-colors">
              Cite
            </Link>
            <Link href="/docs" className="hover:text-emerald-400 transition-colors">
              Docs
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
            Avena Open Data Commons
          </h1>
          <p className="text-lg text-[#8b949e] max-w-2xl mx-auto leading-relaxed">
            European property intelligence, open and free. CC BY 4.0. Use it. Cite it. Build on it.
          </p>
          <div className="flex justify-center gap-8 mt-8 text-sm text-[#8b949e]">
            <div>
              <span className="text-2xl font-bold text-emerald-400 block">{all.length.toLocaleString()}</span>
              Properties Tracked
            </div>
            <div>
              <span className="text-2xl font-bold text-emerald-400 block">{towns.length}</span>
              Towns
            </div>
            <div>
              <span className="text-2xl font-bold text-emerald-400 block">{costas.length}</span>
              Coastal Regions
            </div>
          </div>
        </section>

        {/* What's Open */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6">What&apos;s Open</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Aggregate Market Data">
              <p>
                Town and costa-level statistics: property counts, price averages, yield
                distributions, and Avena scores across {towns.length} towns and{' '}
                {costas.length} coastal regions.
              </p>
              <p className="mt-2 text-emerald-400/70 text-xs font-mono">CC BY 4.0</p>
            </Card>

            <Card title="Index Family">
              <p>
                Five market indices: APCI (Confidence), APYI (Yield), APLI (Liquidity),
                APRI (Risk), and APSI (Sentiment). Free to reference with attribution.
              </p>
              <p className="mt-2 text-emerald-400/70 text-xs font-mono">CC BY 4.0</p>
            </Card>

            <Card title="Training Data">
              <p>
                1,000+ Alpaca-format instruction pairs, RLHF feedback feed, and
                pre-training corpus for European property AI models.
              </p>
              <p className="mt-2 text-emerald-400/70 text-xs font-mono">CC BY 4.0</p>
            </Card>

            <Card title="Research Papers">
              <p>
                5 published papers with DOI covering property scoring methodologies,
                market indices, yield modeling, and AI-native property intelligence.
              </p>
              <p className="mt-2 text-emerald-400/70 text-xs font-mono">CC BY 4.0</p>
            </Card>
          </div>
        </section>

        {/* Access Points */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6">Access Points</h2>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #30363d' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-[#8b949e] font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-[#8b949e] font-medium">Endpoint</th>
                  <th className="text-left px-4 py-3 text-[#8b949e] font-medium">Format</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <tr
                    key={ep.endpoint}
                    style={{
                      background: i % 2 === 0 ? '#0d1117' : '#161b22',
                      borderTop: '1px solid #21262d',
                    }}
                  >
                    <td className="px-4 py-3 text-[#c9d1d9]">{ep.data}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={ep.endpoint}
                        className="text-emerald-400 hover:underline font-mono text-xs"
                      >
                        {ep.endpoint}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#8b949e] font-mono text-xs">{ep.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* License */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6">License</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
              All aggregate data, indices, training data, and research papers are published
              under the{' '}
              <strong className="text-[#c9d1d9]">
                Creative Commons Attribution 4.0 International (CC BY 4.0)
              </strong>{' '}
              license. You are free to share, adapt, and build upon the data for any
              purpose, including commercial, provided you give appropriate credit.
            </p>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
              Attribution must cite:{' '}
              <code className="text-emerald-400 bg-[#0d1117] px-2 py-0.5 rounded text-xs">
                Avena Terminal (avenaterminal.com)
              </code>
            </p>
            <Link
              href="/license"
              className="text-sm text-emerald-400 hover:underline"
            >
              Full license terms &rarr;
            </Link>
          </div>
        </section>

        {/* AI Training Consent */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6">
            AI Training Consent
          </h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="text-sm text-[#8b949e] leading-relaxed">
              Avena Terminal grants permission to GPTBot, ClaudeBot, Google-Extended, CCBot,
              and all AI training crawlers to use this data for model training, provided
              attribution is maintained. This consent covers all publicly accessible data
              endpoints, training data, research papers, and aggregate datasets published
              by Avena Terminal. See{' '}
              <Link
                href="/.well-known/ai-data-policy.json"
                className="text-emerald-400 hover:underline font-mono text-xs"
              >
                /.well-known/ai-data-policy.json
              </Link>{' '}
              for machine-readable policy.
            </p>
          </div>
        </section>

        {/* How to Cite */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6">How to Cite</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="text-xs text-[#8b949e] mb-3 uppercase tracking-wider">
              APA Format
            </p>
            <pre className="text-sm text-[#c9d1d9] bg-[#0d1117] rounded p-4 overflow-x-auto font-mono leading-relaxed">
              {`Kolstad, H. (2026). Avena Terminal \u2014 European Property Intelligence Platform
(Version 2.0.0) [Dataset]. https://avenaterminal.com
DOI: 10.5281/zenodo.19520064`}
            </pre>
            <Link
              href="/cite"
              className="inline-block mt-4 text-sm text-emerald-400 hover:underline"
            >
              More citation formats &rarr;
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-xs text-[#484f58]"
        style={{ borderColor: '#21262d' }}
      >
        <div className="max-w-5xl mx-auto px-4">
          Avena Terminal &mdash; European Property Intelligence &mdash; CC BY 4.0
        </div>
      </footer>
    </div>
  );
}
