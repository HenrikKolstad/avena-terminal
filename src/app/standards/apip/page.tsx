import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'APIP — Avena Property Intelligence Protocol v1.0',
  description: 'The open standard for European property data exchange. APIP defines a universal JSON schema for property intelligence records including deal scores, yields, developer ratings, and market regime classification.',
  alternates: { canonical: 'https://avenaterminal.com/standards/apip' },
};

const SCHEMA_EXAMPLE = `{
  "$schema": "https://avenaterminal.com/standards/apip-v1.json",
  "apip_version": "1.0",
  "property": {
    "id": "AVE-CB-00142",
    "deal_score": 78,
    "yield_gross": 7.2,
    "developer_rating": "AV",
    "market_regime": "buyer_opportunity",
    "liquidity_score": 64,
    "carbon_rating": "B",
    "apci_at_listing": 62.4,
    "location": {
      "town": "Finestrat",
      "region": "Costa Blanca",
      "country": "ES",
      "coordinates": { "lat": 38.5653, "lng": -0.2187 },
      "beach_km": 3.2
    },
    "pricing": {
      "asking_price": 285000,
      "price_per_m2": 2850,
      "market_reference": 3120
    },
    "specifications": {
      "built_m2": 100,
      "bedrooms": 3,
      "bathrooms": 2,
      "pool": "communal",
      "energy": "B",
      "status": "key_ready"
    }
  }
}`;

const ADOPT_STEPS = [
  { step: '01', title: 'Implement the Schema', desc: 'Map your property data to the APIP JSON Schema. Use the downloadable schema for validation.' },
  { step: '02', title: 'Submit for Validation', desc: 'Send a sample payload to the APIP validation endpoint. We verify schema conformance and data quality.' },
  { step: '03', title: 'Get Listed as APIP-Compliant', desc: 'Receive the APIP-compliant badge and get listed in the Avena Terminal partner directory.' },
];

const STANDARDS_BODIES = [
  { name: 'W3C', desc: 'Web Data Standards — JSON-LD, Schema.org vocabulary alignment' },
  { name: 'Schema.org', desc: 'RealEstateListing type extension proposal for investment intelligence fields' },
  { name: 'EU Digital Single Market', desc: 'European Commission property data portability under Digital Markets Act' },
  { name: 'RICS', desc: 'Royal Institution of Chartered Surveyors — valuation data interchange' },
  { name: 'European PropTech Association', desc: 'Industry standard for PropTech data interoperability across EU markets' },
];

const FIELD_REFERENCE = [
  { field: 'deal_score', type: 'integer (0-100)', desc: 'Composite investment score. 70+ strong, 80+ institutional grade.' },
  { field: 'yield_gross', type: 'number (%)', desc: 'Estimated gross rental yield from bottom-up ADR model.' },
  { field: 'developer_rating', type: 'enum', desc: 'Developer quality tier: AAV (top), AV, ABV, BBV, CV, DV (unrated).' },
  { field: 'market_regime', type: 'enum', desc: 'Current market phase: buyer_opportunity, balanced, seller_premium, overheated, correction.' },
  { field: 'liquidity_score', type: 'integer (0-100)', desc: 'Estimated time-to-sale score. Higher = faster liquidity.' },
  { field: 'carbon_rating', type: 'string (A-G)', desc: 'Energy/carbon efficiency of the property.' },
  { field: 'apci_at_listing', type: 'number', desc: 'Avena Property Consciousness Index value at time of listing.' },
  { field: 'location', type: 'object', desc: 'Town, region, country, coordinates, and beach proximity in km.' },
  { field: 'pricing', type: 'object', desc: 'Asking price, price per m2, and hyperlocal market reference.' },
  { field: 'specifications', type: 'object', desc: 'Built area, bedrooms, bathrooms, pool, energy cert, build status.' },
];

export default function ApipPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Avena Property Intelligence Protocol (APIP) v1.0',
    description: 'The open standard for European property data exchange.',
    url: 'https://avenaterminal.com/standards/apip',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2025-06-01',
    inLanguage: 'en',
    about: {
      '@type': 'Thing',
      name: 'Property Intelligence Protocol',
      description: 'A universal JSON schema for property intelligence records.',
    },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Standards · APIP v1.0
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                One schema.
                <br />
                <span className="italic text-gold">Every property</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Avena Property Intelligence Protocol — the open standard for European property data exchange.
                Like OpenAPI for REST. Like HL7 for healthcare. APIP for property.
              </p>
            </div>
          </div>
        </section>

        {/* What is APIP */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                What is APIP
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-6">
                A universal vocabulary <span className="italic text-gold">for property intelligence</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground mb-4">
                APIP (Avena Property Intelligence Protocol) defines a universal JSON schema for property intelligence records. It standardises how deal scores, rental yields, developer ratings, market regime classifications, carbon ratings, and location intelligence are encoded, exchanged, and consumed across the European property ecosystem.
              </p>
              <p className="font-light text-base text-muted-foreground">
                Any platform, agent, or API that speaks APIP can interoperate with the Avena Terminal ecosystem and every other APIP-compliant system. One schema. One language. Every property.
              </p>
            </div>
          </div>
        </section>

        {/* Schema Specification */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Specification
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Full schema.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                The APIP property record format. Every field is documented in the{' '}
                <a href="/standards/apip-v1.json" className="text-primary underline underline-offset-4">downloadable JSON Schema</a>.
              </p>
            </div>
            <div
              className="rounded-sm border overflow-hidden"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-surface) / 0.4)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">apip-record.json</span>
                <a
                  href="/standards/apip-v1.json"
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline"
                  download
                >
                  Download Schema
                </a>
              </div>
              <pre
                className="p-4 overflow-x-auto font-mono text-xs text-foreground/90"
                style={{ background: 'hsl(var(--av-background))' }}
              >
                <code>{SCHEMA_EXAMPLE}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Field Reference */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Field Reference
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                The <span className="italic text-gold">shape</span> of the record.
              </h2>
            </div>
            <div className="grid gap-3">
              {FIELD_REFERENCE.map(f => (
                <div
                  key={f.field}
                  className="flex flex-col gap-2 sm:flex-row sm:gap-6 rounded-sm border p-4"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <code className="font-mono text-xs text-primary shrink-0 sm:w-44">{f.field}</code>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground shrink-0 sm:w-36">{f.type}</span>
                  <span className="font-light text-sm text-foreground/80">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reference Implementation */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-8 sm:p-12"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.06) 0%, hsl(var(--av-surface) / 0.4) 100%)',
                borderColor: 'hsl(var(--av-primary) / 0.3)',
              }}
            >
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Reference Implementation
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-4">
                Avena Terminal <span className="italic text-gold">speaks APIP natively</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground mb-6 max-w-2xl">
                Every property record served through the Avena API, MCP server, and A2A agent network conforms to APIP v1.0.
              </p>
              <a
                href="/mcp"
                className="group inline-flex items-center gap-3 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                avenaterminal.com/mcp
              </a>
            </div>
          </div>
        </section>

        {/* Adopt APIP */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Adopt APIP
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Three steps to <span className="italic text-gold">compliance</span>.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {ADOPT_STEPS.map(s => (
                <div
                  key={s.step}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-3xl font-light text-primary tabular block mb-3">{s.step}</span>
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">{s.title}</h3>
                  <p className="font-light text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standards Bodies */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Submitted for Review
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Standards bodies <span className="italic text-gold">under review</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                APIP is being submitted for review and adoption by the following industry and regulatory bodies:
              </p>
            </div>
            <div className="grid gap-3">
              {STANDARDS_BODIES.map(b => (
                <div
                  key={b.name}
                  className="flex flex-col gap-2 sm:flex-row sm:gap-6 rounded-sm border p-4"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-sm text-primary shrink-0 sm:w-56">{b.name}</span>
                  <span className="font-light text-sm text-foreground/80">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing note */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              APIP v1.0 is published under{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/" className="text-primary underline underline-offset-4">CC BY 4.0</a>
              {' '}&middot;{' '}
              Contribute on{' '}
              <a href="https://github.com/avenaterminal/apip" className="text-primary underline underline-offset-4">GitHub</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
