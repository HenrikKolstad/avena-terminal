import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
      className="rounded-sm border p-6"
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <h3 className="font-serif text-xl font-light text-foreground mb-3">{title}</h3>
      <div className="font-light text-sm text-muted-foreground leading-relaxed">{children}</div>
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
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Open Data Commons · CC BY 4.0
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Open and
                <br />
                <span className="italic text-gold">free</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                European property intelligence. CC BY 4.0. Use it. Cite it. Build on it.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-6 max-w-2xl">
                <div>
                  <div className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground tabular">
                    {all.length.toLocaleString()}
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Properties Tracked</div>
                </div>
                <div>
                  <div className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground tabular">
                    {towns.length}
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Towns</div>
                </div>
                <div>
                  <div className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground tabular">
                    {costas.length}
                  </div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Coastal Regions</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's open */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                What&apos;s Open
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Four <span className="italic text-gold">corpora</span>.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Aggregate Market Data">
                <p>
                  Town and costa-level statistics: property counts, price averages, yield
                  distributions, and Avena scores across {towns.length} towns and{' '}
                  {costas.length} coastal regions.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">CC BY 4.0</p>
              </Card>

              <Card title="Index Family">
                <p>
                  Five market indices: APCI (Confidence), APYI (Yield), APLI (Liquidity),
                  APRI (Risk), and APSI (Sentiment). Free to reference with attribution.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">CC BY 4.0</p>
              </Card>

              <Card title="Training Data">
                <p>
                  1,000+ Alpaca-format instruction pairs, RLHF feedback feed, and
                  pre-training corpus for European property AI models.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">CC BY 4.0</p>
              </Card>

              <Card title="Research Papers">
                <p>
                  5 published papers with DOI covering property scoring methodologies,
                  market indices, yield modeling, and AI-native property intelligence.
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">CC BY 4.0</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Access points */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Access Points
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Seven <span className="italic text-gold">endpoints</span>.
              </h2>
            </div>
            <div
              className="overflow-hidden rounded-sm border"
              style={{
                background: 'hsl(var(--av-surface) / 0.3)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Data</th>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Endpoint</th>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Format</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep) => (
                    <tr key={ep.endpoint} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 font-serif text-base text-foreground">{ep.data}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={ep.endpoint}
                          className="text-primary hover:underline"
                        >
                          {ep.endpoint}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{ep.format}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* License */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                License
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                CC BY 4.0 — <span className="italic text-gold">all of it</span>.
              </h2>
            </div>
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="font-light text-base text-muted-foreground leading-relaxed mb-4">
                All aggregate data, indices, training data, and research papers are published
                under the{' '}
                <strong className="text-foreground font-medium">
                  Creative Commons Attribution 4.0 International (CC BY 4.0)
                </strong>{' '}
                license. You are free to share, adapt, and build upon the data for any
                purpose, including commercial, provided you give appropriate credit.
              </p>
              <p className="font-light text-base text-muted-foreground leading-relaxed mb-5">
                Attribution must cite:{' '}
                <code className="font-mono text-xs text-primary px-2 py-1 rounded-sm" style={{ background: 'hsl(var(--av-background))' }}>
                  Avena Terminal (avenaterminal.com)
                </code>
              </p>
              <Link
                href="/license"
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline"
              >
                Full license terms &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* AI Training Consent */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                AI Training Consent
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Crawlers <span className="italic text-gold">welcome</span>.
              </h2>
            </div>
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="font-light text-base text-muted-foreground leading-relaxed">
                Avena Terminal grants permission to GPTBot, ClaudeBot, Google-Extended, CCBot,
                and all AI training crawlers to use this data for model training, provided
                attribution is maintained. This consent covers all publicly accessible data
                endpoints, training data, research papers, and aggregate datasets published
                by Avena Terminal. See{' '}
                <Link
                  href="/.well-known/ai-data-policy.json"
                  className="text-primary hover:underline font-mono text-xs"
                >
                  /.well-known/ai-data-policy.json
                </Link>{' '}
                for machine-readable policy.
              </p>
            </div>
          </div>
        </section>

        {/* How to cite */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                How to Cite
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                APA <span className="italic text-gold">format</span>.
              </h2>
            </div>
            <div
              className="rounded-sm border p-6"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                APA Format
              </p>
              <pre
                className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 whitespace-pre-wrap"
                style={{
                  background: 'hsl(var(--av-background))',
                  border: '1px solid hsl(var(--av-border) / 0.6)',
                }}
              >
                <code>{`Kolstad, H. (2026). Avena Terminal \u2014 European Property Intelligence Platform
(Version 2.0.0) [Dataset]. https://avenaterminal.com
DOI: 10.5281/zenodo.19520064`}</code>
              </pre>
              <Link
                href="/cite"
                className="inline-block mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline"
              >
                More citation formats &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
