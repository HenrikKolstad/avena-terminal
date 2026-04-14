import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Cite Avena Terminal | Citation Generator',
  description:
    'Generate accurate academic citations for all Avena Terminal systems, indices, and datasets. APA, BibTeX, Chicago, Harvard, and MLA formats.',
  openGraph: {
    title: 'Cite Avena Terminal | Citation Generator',
    description: 'One-click citations for every Avena system. APA, BibTeX, Chicago, Harvard, MLA.',
    url: 'https://avenaterminal.com/cite',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/cite' },
};

const SYSTEMS: { slug: string; name: string; description: string }[] = [
  { slug: 'apci', name: 'APCI', description: 'Composite market health index for European property (0-100)' },
  { slug: 'apyi', name: 'APYI', description: 'Pan-European yield spread index' },
  { slug: 'apli', name: 'APLI', description: 'European property market liquidity measure' },
  { slug: 'apri', name: 'APRI', description: 'Composite property market risk score' },
  { slug: 'apsi', name: 'APSI', description: 'Market sentiment derived from listing and yield data' },
  { slug: 'dataset', name: 'Dataset', description: 'Scored new build property dataset for European coastal markets' },
  { slug: 'api', name: 'API', description: 'RESTful API for European property market intelligence' },
  { slug: 'yield-curve', name: 'Yield Curve', description: 'Rental yield term structure across European property markets' },
  { slug: 'contagion-model', name: 'Contagion Model', description: 'SIR epidemiological model adapted for property market corrections' },
  { slug: 'scoring-model', name: 'Scoring Model', description: '5-factor hedonic pricing model for European new builds' },
  { slug: 'mcp-server', name: 'MCP Server', description: 'Model Context Protocol server for AI property intelligence' },
  { slug: 'apip', name: 'APIP', description: 'Open standard for property intelligence data exchange' },
  { slug: 'propertyeval', name: 'PropertyEval', description: '100-scenario benchmark for evaluating property AI systems' },
  { slug: 'genome', name: 'Property Genome', description: '500-dimensional property fingerprinting system' },
];

const MASTER_CITATION = 'Avena Terminal. (2026). European Property Intelligence Platform. https://avenaterminal.com. DOI: 10.5281/zenodo.19520064';

export default function CitePage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Cite', item: 'https://avenaterminal.com/cite' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #30363d', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#c9d1d9' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>AVENA</span>
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>TERMINAL</span>
          </Link>
        </header>

        {/* Content */}
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Cite Avena Terminal
          </h1>
          <p style={{ color: '#8b949e', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Citing Avena Terminal in your research, report, or publication? Select the system below to generate a perfect citation in APA, BibTeX, Chicago, Harvard, or MLA format.
          </p>

          {/* Master citation */}
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#34d399' }}>
              Cite Everything
            </h2>
            <p style={{ color: '#8b949e', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Use this master citation to reference the entire Avena Terminal platform (APA):
            </p>
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '0.5rem',
                padding: '1.25rem',
              }}
            >
              <pre
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  color: '#c9d1d9',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {MASTER_CITATION}
              </pre>
            </div>
          </section>

          {/* Systems grid */}
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              All Citable Systems
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
                gap: '1rem',
              }}
            >
              {SYSTEMS.map((sys) => (
                <Link
                  key={sys.slug}
                  href={`/cite/${sys.slug}`}
                  style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    textDecoration: 'none',
                    color: '#c9d1d9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>{sys.name}</span>
                  <span style={{ fontSize: '0.8125rem', color: '#8b949e', lineHeight: 1.5 }}>
                    {sys.description}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    Get Citation &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
