import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
      <div className="avena-v2 min-h-screen">
        <Nav />
        <main className="pt-16">
          <section className="relative overflow-hidden py-28 sm:py-40">
            <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                404
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
                System not <span className="italic text-gold">found</span>.
              </h1>
              <p className="font-light text-base text-muted-foreground mb-8">
                The system &quot;{system}&quot; is not in our citation database.
              </p>
              <Link
                href="/cite"
                className="group inline-flex items-center gap-3 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                View all citable systems
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
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
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlyJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Citation · {data.name}
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Cite:
                <br />
                <span className="italic text-gold">{data.name}</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                {data.description}
              </p>
            </div>
          </div>
        </section>

        {/* Citation formats */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Formats
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Five <span className="italic text-gold">formats</span>, one source.
              </h2>
            </div>
            <div className="flex flex-col gap-5">
              {formats.map((fmt) => (
                <div
                  key={fmt.label}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                      {fmt.label}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                      Select to copy
                    </span>
                  </div>
                  <pre
                    className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 whitespace-pre-wrap break-words"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <code>{fmt.value}</code>
                  </pre>
                </div>
              ))}
            </div>

            {/* Back link */}
            <div className="mt-12 text-center">
              <Link
                href="/cite"
                className="group inline-flex items-center gap-3 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                View all citable systems
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
