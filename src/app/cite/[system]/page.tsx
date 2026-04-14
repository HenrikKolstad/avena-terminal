import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

const CITATIONS: Record<string, { name: string; title: string; year: number; url: string; description: string }> = {
  'apci': { name: 'APCI', title: 'Avena Property Consciousness Index', year: 2026, url: 'https://avenaterminal.com/apci', description: 'Composite market health index for European property (0-100)' },
  'apyi': { name: 'APYI', title: 'Avena Property Yield Index', year: 2026, url: 'https://avenaterminal.com/indices', description: 'Pan-European yield spread index' },
  'apli': { name: 'APLI', title: 'Avena Property Liquidity Index', year: 2026, url: 'https://avenaterminal.com/indices', description: 'European property market liquidity measure' },
  'apri': { name: 'APRI', title: 'Avena Property Risk Index', year: 2026, url: 'https://avenaterminal.com/indices', description: 'Composite property market risk score' },
  'apsi': { name: 'APSI', title: 'Avena Property Sentiment Index', year: 2026, url: 'https://avenaterminal.com/indices', description: 'Market sentiment derived from listing and yield data' },
  'dataset': { name: 'Dataset', title: 'European Property Intelligence Dataset', year: 2026, url: 'https://avenaterminal.com/dataset', description: 'Scored new build property dataset for European coastal markets' },
  'api': { name: 'API', title: 'Avena Terminal Property Intelligence API', year: 2026, url: 'https://avenaterminal.com/api/v1/docs', description: 'RESTful API for European property market intelligence' },
  'yield-curve': { name: 'Yield Curve', title: 'Avena Terminal Yield Curve', year: 2026, url: 'https://avenaterminal.com/yield-curve', description: 'Rental yield term structure across European property markets' },
  'contagion-model': { name: 'Contagion Model', title: 'Property Contagion Model: SIR Adaptation for Real Estate', year: 2026, url: 'https://avenaterminal.com/api/v1/contagion', description: 'SIR epidemiological model adapted for property market corrections' },
  'scoring-model': { name: 'Scoring Model', title: 'Hedonic Regression Scoring Model for European New Builds', year: 2026, url: 'https://avenaterminal.com/methodology', description: '5-factor hedonic pricing model: S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R' },
  'mcp-server': { name: 'MCP Server', title: 'Avena Terminal MCP Server', year: 2026, url: 'https://avenaterminal.com/mcp-server', description: 'Model Context Protocol server for AI property intelligence' },
  'apip': { name: 'APIP', title: 'Avena Property Intelligence Protocol v1.0', year: 2026, url: 'https://avenaterminal.com/standards/apip', description: 'Open standard for property intelligence data exchange' },
  'propertyeval': { name: 'PropertyEval', title: 'PropertyEval Benchmark', year: 2026, url: 'https://avenaterminal.com/propertyeval', description: '100-scenario benchmark for evaluating property AI systems' },
  'genome': { name: 'Property Genome', title: 'The Avena Property Genome', year: 2026, url: 'https://avenaterminal.com/api/v1/genome', description: '500-dimensional property fingerprinting system' },
};

const DOI = '10.5281/zenodo.19520064';

function generateCitations(slug: string, data: typeof CITATIONS[string]) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    apa: `Avena Terminal. (${data.year}). ${data.title}. avenaterminal.com. DOI: ${DOI}`,
    bibtex: `@misc{avenaterminal_${slug}_${data.year},\n  title={${data.title}},\n  author={Avena Terminal},\n  year={${data.year}},\n  url={${data.url}},\n  doi={${DOI}}\n}`,
    chicago: `Avena Terminal. "${data.title}." ${data.year}. ${data.url}.`,
    harvard: `Avena Terminal (${data.year}) ${data.title}. Available at: ${data.url} (Accessed: ${today}).`,
    mla: `Avena Terminal. "${data.title}." Avena Terminal, ${data.year}, ${data.url}.`,
  };
}

export async function generateStaticParams() {
  return Object.keys(CITATIONS).map((system) => ({ system }));
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  const data = CITATIONS[system];
  if (!data) {
    return { title: 'System Not Found | Avena Terminal' };
  }
  return {
    title: `Cite ${data.name} | Avena Terminal`,
    description: `Generate academic citations for ${data.title}. APA, BibTeX, Chicago, Harvard, and MLA formats.`,
    openGraph: {
      title: `Cite ${data.name} | Avena Terminal`,
      description: `Citation generator for ${data.title}.`,
      url: `https://avenaterminal.com/cite/${system}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    alternates: { canonical: `https://avenaterminal.com/cite/${system}` },
  };
}

export default async function CiteSystemPage({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const data = CITATIONS[system];

  if (!data) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>System Not Found</h1>
          <p style={{ color: '#8b949e', marginBottom: '2rem' }}>The system &quot;{system}&quot; is not in our citation database.</p>
          <Link href="/cite" style={{ color: '#34d399', textDecoration: 'underline' }}>View all citable systems</Link>
        </div>
      </main>
    );
  }

  const citations = generateCitations(system, data);
  const formats = [
    { label: 'APA', value: citations.apa },
    { label: 'BibTeX', value: citations.bibtex },
    { label: 'Chicago', value: citations.chicago },
    { label: 'Harvard', value: citations.harvard },
    { label: 'MLA', value: citations.mla },
  ];

  const scholarlyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    name: data.title,
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: `${data.year}`,
    url: data.url,
    description: data.description,
    publisher: { '@type': 'Organization', name: 'Avena Terminal' },
    identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: DOI },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Cite', item: 'https://avenaterminal.com/cite' },
      { '@type': 'ListItem', position: 3, name: data.name, item: `https://avenaterminal.com/cite/${system}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlyJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #30363d', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#c9d1d9' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>AVENA</span>
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>TERMINAL</span>
          </Link>
          <Link href="/cite" style={{ color: '#34d399', fontSize: '0.875rem', textDecoration: 'none' }}>
            All Citations
          </Link>
        </header>

        {/* Content */}
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Cite: {data.name}
          </h1>
          <p style={{ color: '#8b949e', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            {data.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {formats.map((fmt) => (
              <div
                key={fmt.label}
                style={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#34d399' }}>
                    {fmt.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#8b949e', cursor: 'pointer' }}>
                    Copy
                  </span>
                </div>
                <pre
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    color: '#c9d1d9',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    backgroundColor: '#0d1117',
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #30363d',
                  }}
                >
                  {fmt.value}
                </pre>
              </div>
            ))}
          </div>

          {/* Back link */}
          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Link
              href="/cite"
              style={{
                color: '#34d399',
                textDecoration: 'none',
                fontSize: '0.875rem',
                padding: '0.5rem 1.5rem',
                border: '1px solid #30363d',
                borderRadius: '0.375rem',
              }}
            >
              View all citable systems
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
