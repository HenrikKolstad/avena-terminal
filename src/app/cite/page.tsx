import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Research · Citation
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Cite Avena
                <br />
                <span className="italic text-gold">Terminal</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Citing Avena Terminal in your research, report, or publication? Select the system below to generate a perfect citation in APA, BibTeX, Chicago, Harvard, or MLA format.
              </p>
            </div>
          </div>
        </section>

        {/* Master citation */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Master Citation
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Cite <span className="italic text-gold">everything</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                Use this master citation to reference the entire Avena Terminal platform (APA).
              </p>
            </div>
            <pre
              className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 whitespace-pre-wrap break-words"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              <code>{MASTER_CITATION}</code>
            </pre>
          </div>
        </section>

        {/* Systems grid */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                All Systems
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Every citable <span className="italic text-gold">artefact</span>.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SYSTEMS.map((sys) => (
                <Link
                  key={sys.slug}
                  href={`/cite/${sys.slug}`}
                  className="group flex flex-col rounded-sm border p-6 transition-colors hover:border-primary/60"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-serif text-2xl font-light text-foreground mb-2">{sys.name}</span>
                  <span className="font-light text-sm text-muted-foreground leading-relaxed flex-1">{sys.description}</span>
                  <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                    Get citation
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
