import { Metadata } from 'next';
import Link from 'next/link';

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
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>APIP v1.0</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          Avena Property Intelligence Protocol (APIP) v1.0
        </h1>
        <p className="text-lg text-emerald-400 font-medium mb-3">
          The Open Standard for European Property Data
        </p>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl italic">
          Like OpenAPI for REST. Like HL7 for healthcare. APIP for property.
        </p>

        {/* What is APIP */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">What is APIP?</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            APIP (Avena Property Intelligence Protocol) defines a universal JSON schema for property intelligence records. It standardises how deal scores, rental yields, developer ratings, market regime classifications, carbon ratings, and location intelligence are encoded, exchanged, and consumed across the European property ecosystem.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Any platform, agent, or API that speaks APIP can interoperate with the Avena Terminal ecosystem and every other APIP-compliant system. One schema. One language. Every property.
          </p>
        </section>

        {/* Schema Specification */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Full Schema Specification</h2>
          <p className="text-gray-400 text-sm mb-4">
            The APIP property record format. Every field is documented in the{' '}
            <a href="/standards/apip-v1.json" className="text-emerald-400 underline underline-offset-2">downloadable JSON Schema</a>.
          </p>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d', background: '#161b22' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: '#30363d', background: '#0d1117' }}>
              <span className="text-xs font-mono" style={{ color: '#8b949e' }}>apip-record.json</span>
              <a
                href="/standards/apip-v1.json"
                className="text-xs text-emerald-400 hover:underline"
                download
              >
                Download Schema
              </a>
            </div>
            <pre className="p-4 overflow-x-auto text-xs leading-relaxed" style={{ color: '#c9d1d9' }}>
              <code>{SCHEMA_EXAMPLE}</code>
            </pre>
          </div>
        </section>

        {/* Field Reference */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Field Reference</h2>
          <div className="grid gap-3">
            {[
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
            ].map(f => (
              <div key={f.field} className="flex gap-4 p-3 rounded-lg" style={{ background: '#161b22' }}>
                <code className="text-emerald-400 text-xs font-mono shrink-0 w-40">{f.field}</code>
                <span className="text-xs text-gray-500 shrink-0 w-32">{f.type}</span>
                <span className="text-xs text-gray-400">{f.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reference Implementation */}
        <section className="mb-12 p-6 rounded-lg border" style={{ borderColor: '#1f6feb33', background: '#161b22' }}>
          <h2 className="text-xl font-semibold text-white mb-3">Reference Implementation</h2>
          <p className="text-gray-400 text-sm mb-4">
            Avena Terminal is the reference implementation of APIP. Every property record served through the Avena API, MCP server, and A2A agent network conforms to APIP v1.0.
          </p>
          <a
            href="/mcp"
            className="inline-block text-sm font-medium px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            avenaterminal.com/mcp
          </a>
        </section>

        {/* Adopt APIP */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Adopt APIP</h2>
          <div className="grid gap-4">
            {ADOPT_STEPS.map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-lg border" style={{ borderColor: '#30363d', background: '#161b22' }}>
                <span className="text-2xl font-bold text-emerald-500 font-mono shrink-0">{s.step}</span>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Standards Bodies */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Submit to Standards Bodies</h2>
          <p className="text-gray-400 text-sm mb-4">
            APIP is being submitted for review and adoption by the following industry and regulatory bodies:
          </p>
          <div className="grid gap-3">
            {STANDARDS_BODIES.map(b => (
              <div key={b.name} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#161b22' }}>
                <span className="text-emerald-400 font-semibold text-sm shrink-0 w-48">{b.name}</span>
                <span className="text-gray-400 text-xs">{b.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 mt-12 text-center" style={{ borderColor: '#1c2333' }}>
          <p className="text-xs text-gray-500">
            APIP v1.0 is published under{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="text-emerald-400 underline underline-offset-2">CC BY 4.0</a>.
            Contribute or propose changes on{' '}
            <a href="https://github.com/avenaterminal/apip" className="text-emerald-400 underline underline-offset-2">GitHub</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
