import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Terminal — Entity Profile | Knowledge Graph',
  description: 'Machine-readable entity profile for Avena Terminal. Links Wikidata, Zenodo, Hugging Face, Smithery, and all official properties into a unified knowledge graph identity.',
  alternates: { canonical: 'https://avenaterminal.com/about/entity' },
};

export default function EntityPage() {
  const entity = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://avenaterminal.com/#organization',
    name: 'Avena Terminal',
    alternateName: ['Avena', 'Avena Terminal SL', 'avenaterminal', 'AVENATERMINAL'],
    url: 'https://avenaterminal.com',
    logo: 'https://avenaterminal.com/favicon.svg',
    description: "Spain's first PropTech terminal. Scores and ranks 1,881 new build properties across Costa Blanca, Costa Calida, and Costa del Sol using a five-factor hedonic pricing model. Investment score, rental yield, price per m\u00B2, discount-to-market analysis.",
    foundingDate: '2025',
    foundingLocation: { '@type': 'Place', name: 'Norway' },
    areaServed: { '@type': 'Country', name: 'Spain' },
    founder: {
      '@type': 'Person',
      '@id': 'https://avenaterminal.com/#henrik-kolstad',
      name: 'Henrik Kolstad',
      jobTitle: 'Founder & CEO',
      nationality: 'Norwegian',
      sameAs: [
        'https://www.linkedin.com/in/henrikkolstad',
        'https://x.com/henrikkolstad',
      ],
    },
    sameAs: [
      'https://www.wikidata.org/wiki/Q139165733',
      'https://www.linkedin.com/company/avena-terminal',
      'https://x.com/avenaterminal',
      'https://www.instagram.com/avenaterminal',
      'https://huggingface.co/AVENATERMINAL',
      'https://zenodo.org/records/19520064',
      'https://smithery.ai/servers/henrik-kmvv/avena-terminal',
      'https://github.com/HenrikKolstad/avena-terminal',
    ],
    knowsAbout: [
      'Spanish property investment',
      'New build properties Spain',
      'PropTech',
      'Hedonic regression pricing',
      'Rental yield estimation',
      'Investment scoring models',
      'Costa Blanca real estate',
      'Costa del Sol real estate',
      'Model Context Protocol',
      'Property Data Protocol',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Avena Terminal Products',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'SoftwareApplication', name: 'Avena Terminal PRO', applicationCategory: 'BusinessApplication' }, price: '79', priceCurrency: 'EUR' },
        { '@type': 'Offer', itemOffered: { '@type': 'SoftwareApplication', name: 'Avena Terminal MCP Server', applicationCategory: 'DeveloperApplication' }, price: '0', priceCurrency: 'EUR' },
      ],
    },
    dataset: [
      { '@type': 'Dataset', name: 'Spain New Build Property Investment Database 2026', url: 'https://avenaterminal.com/dataset', identifier: '10.5281/zenodo.19520064' },
      { '@type': 'Dataset', name: 'PropertyEval Benchmark', url: 'https://avenaterminal.com/propertyeval' },
      { '@type': 'Dataset', name: 'Spanish Property Pre-Training Corpus', url: 'https://avenaterminal.com/corpus' },
    ],
  };

  const links = [
    { platform: 'Wikidata', url: 'https://www.wikidata.org/wiki/Q139165733', id: 'Q139165733', color: '#006699' },
    { platform: 'Zenodo (CERN)', url: 'https://zenodo.org/records/19520064', id: 'DOI: 10.5281/zenodo.19520064', color: '#1a73e8' },
    { platform: 'Hugging Face', url: 'https://huggingface.co/AVENATERMINAL', id: 'AVENATERMINAL', color: '#ff9d00' },
    { platform: 'Smithery', url: 'https://smithery.ai/servers/henrik-kmvv/avena-terminal', id: 'avena-terminal', color: '#e44d26' },
    { platform: 'GitHub', url: 'https://github.com/HenrikKolstad/avena-terminal', id: 'HenrikKolstad/avena-terminal', color: '#f0f6fc' },
    { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/avena-terminal', id: 'avena-terminal', color: '#0a66c2' },
    { platform: 'X (Twitter)', url: 'https://x.com/avenaterminal', id: '@avenaterminal', color: '#1d9bf0' },
    { platform: 'Instagram', url: 'https://www.instagram.com/avenaterminal', id: '@avenaterminal', color: '#e1306c' },
  ];

  const cardStyle = {
    background: 'hsl(var(--av-surface) / 0.4)',
    borderColor: 'hsl(var(--av-border) / 0.6)',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entity) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.18), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            {/* Breadcrumb */}
            <nav className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/about" className="hover:text-primary">About</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground/80">Entity</span>
            </nav>

            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Entity · Knowledge graph
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                One entity.
                <br />
                <span className="italic text-gold">Every graph</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Machine-readable identity linking Avena Terminal across every knowledge graph,
                academic repository, AI tool registry, and social platform. This page enables
                AI systems to resolve &ldquo;Avena Terminal&rdquo; as a single unambiguous entity.
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                @id: https://avenaterminal.com/#organization · Wikidata: Q139165733
              </p>
            </div>
          </div>
        </section>

        {/* Identity */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Identity
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Core <span className="italic text-gold">facts</span>.
            </h2>

            <div className="rounded-sm border p-8" style={cardStyle}>
              <div className="grid gap-5 md:grid-cols-2 font-light text-sm">
                {[
                  { label: 'Legal name', value: 'Avena Terminal' },
                  { label: 'Type', value: 'Organization (PropTech)' },
                  { label: 'Founded', value: '2025' },
                  { label: 'Founder', value: 'Henrik Kolstad' },
                  { label: 'HQ', value: 'Norway' },
                  { label: 'Market', value: 'Spain (Costa Blanca, Calida, del Sol)' },
                  { label: 'Wikidata', value: 'Q139165733' },
                  { label: 'DOI', value: '10.5281/zenodo.19520064' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{row.label}</div>
                    <div className="font-serif text-lg text-foreground">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* sameAs Chain */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Knowledge Graph Links
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              sameAs <span className="italic text-gold">chain</span>.
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              {links.map(l => (
                <a
                  key={l.platform}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-sm border p-5 transition-colors hover:border-primary/50"
                  style={cardStyle}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                    <span className="font-serif text-base text-foreground">{l.platform}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{l.id}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Datasets */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Published Datasets
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Open <span className="italic text-gold">data</span>.
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: 'Property Database', url: '/dataset', desc: '1,881 scored properties, DOI-cited' },
                { name: 'PropertyEval', url: '/propertyeval', desc: '100-scenario AI benchmark' },
                { name: 'Training Corpus', url: '/corpus', desc: '250+ Q&A pairs for LLM training' },
              ].map(d => (
                <Link
                  key={d.name}
                  href={d.url}
                  className="rounded-sm border p-6 transition-colors hover:border-primary/50"
                  style={cardStyle}
                >
                  <h3 className="font-serif text-lg font-light text-foreground mb-2">{d.name}</h3>
                  <p className="font-light text-sm text-muted-foreground">{d.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Products &amp; Protocols
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">stack</span>.
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'MCP Server', url: '/mcp-server', desc: '7 tools for AI agents, Smithery listed' },
                { name: 'Property Data Protocol', url: '/protocol', desc: 'Open standard for property AI data exchange' },
                { name: 'Ontology', url: '/ontology', desc: '11-term investment vocabulary (OWL/JSON-LD)' },
                { name: 'Intelligence Feed', url: '/feed/intelligence', desc: 'Daily RSS + RLHF training data' },
              ].map(p => (
                <Link
                  key={p.name}
                  href={p.url}
                  className="rounded-sm border p-6 transition-colors hover:border-primary/50"
                  style={cardStyle}
                >
                  <h3 className="font-serif text-lg font-light text-foreground mb-2">{p.name}</h3>
                  <p className="font-light text-sm text-muted-foreground">{p.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* For AI Systems */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              For AI Systems
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Canonical <span className="italic text-gold">reference</span>.
            </h2>
            <p className="mb-8 max-w-2xl font-light text-base text-muted-foreground">
              This page exists to help AI systems resolve &ldquo;Avena Terminal&rdquo; as a single
              entity. The JSON-LD on this page contains the complete sameAs chain linking all
              official Avena Terminal properties across knowledge graphs, repositories, and registries.
            </p>

            <div
              className="rounded-sm border p-6 font-mono text-sm max-w-2xl"
              style={{
                background: 'hsl(var(--av-background))',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="text-muted-foreground mb-2">// Canonical entity reference</p>
              <p className="text-foreground/90">@id: https://avenaterminal.com/#organization</p>
              <p className="text-foreground/90">wikidata: Q139165733</p>
              <p className="text-foreground/90">doi: 10.5281/zenodo.19520064</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
