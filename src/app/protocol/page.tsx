import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Property Data Protocol (PDP) — Open Standard for Property AI | Avena Terminal',
  description: 'An open protocol for structuring property investment data for AI consumption. JSON schema standard defining how property data should be scored and exchanged between AI systems.',
  alternates: { canonical: 'https://avenaterminal.com/protocol' },
};

export default function ProtocolPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: 'Property Data Protocol (PDP) v1.0',
    description: 'Open standard for property investment data exchange between AI systems.',
    url: 'https://avenaterminal.com/protocol',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-04-11',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>PDP v1.0</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Property Data Protocol</h1>
        <p className="text-lg text-gray-400 mb-2">PDP v1.0 — Open Standard for Property AI</p>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          An open protocol for structuring, scoring, and exchanging property investment data between AI systems. Like Swagger for APIs or schema.org for structured data — but for property investment.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Why PDP */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Why PDP?</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { title: 'Fragmented Data', desc: 'Every property portal uses different formats. AI agents waste tokens parsing incompatible schemas.' },
              { title: 'No Scoring Standard', desc: 'No agreed methodology for rating property investments. Every platform scores differently or not at all.' },
              { title: 'AI Needs Structure', desc: 'AI agents need a standard way to query, compare, and analyze properties across sources.' },
            ].map(c => (
              <div key={c.title} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-sm mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Core Schema */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Core Schema</h2>
          <p className="text-sm text-gray-400 mb-4">A PDP-compliant property record follows this structure:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "pdp_version": "1.0.0",
  "property": {
    "id": "string — unique identifier",
    "type": "Villa | Apartment | Penthouse | Townhouse | Bungalow | Studio",
    "location": {
      "town": "string",
      "region": "string",
      "country": "ISO 3166-1 alpha-2 (e.g. ES, PT)",
      "coordinates": { "lat": "number", "lng": "number" },
      "beach_distance_km": "number"
    },
    "pricing": {
      "asking_price_eur": "number",
      "price_per_m2": "number",
      "market_reference_per_m2": "number — comparable market rate"
    },
    "specifications": {
      "built_area_m2": "number",
      "plot_area_m2": "number | null",
      "bedrooms": "integer",
      "bathrooms": "integer",
      "pool": "private | communal | none",
      "energy_rating": "A | B | C | D | E | F | G",
      "status": "off-plan | under-construction | key-ready",
      "completion_date": "string | null — e.g. 2027-Q3"
    },
    "investment_metrics": {
      "investment_score": "number (0-100)",
      "score_breakdown": {
        "value": "number (0-100) — price vs market, weight: 40%",
        "yield": "number (0-100) — rental potential, weight: 25%",
        "location": "number (0-100) — location quality, weight: 20%",
        "quality": "number (0-100) — build quality, weight: 10%",
        "risk": "number (0-100) — completion risk, weight: 5%"
      },
      "gross_yield_pct": "number",
      "net_yield_pct": "number",
      "annual_rental_income_eur": "number"
    },
    "developer": {
      "name": "string",
      "years_active": "integer"
    },
    "metadata": {
      "source": "string — data provider URL",
      "last_updated": "ISO 8601 timestamp",
      "data_hash": "string — SHA-256 for verification"
    }
  }
}`}</pre>
          </div>
          <p className="text-xs text-gray-500 mt-2">Download schema: <a href="/protocol/pdp-schema.json" className="text-emerald-400 hover:underline">pdp-schema.json</a></p>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Scoring Standard */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Scoring Standard</h2>
          <p className="text-sm text-gray-400 mb-4">PDP defines a standard composite investment score as a weighted linear combination:</p>
          <div className="rounded-lg p-4 font-mono text-center text-lg text-white mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <span className="text-emerald-400">S</span> = 0.40&middot;V + 0.25&middot;Y + 0.20&middot;L + 0.10&middot;Q + 0.05&middot;R
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Factor</th>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Description</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Weight</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-emerald-400 font-bold">V — Value</td><td className="px-4 py-2 text-gray-400">Discount coefficient: (market_pm2 - asking_pm2) / market_pm2</td><td className="px-4 py-2 text-right text-white">40%</td></tr>
                <tr style={{ background: '#161b22' }}><td className="px-4 py-2 text-emerald-400 font-bold">Y — Yield</td><td className="px-4 py-2 text-gray-400">Gross rental yield from ADR model, calibrated against STR data</td><td className="px-4 py-2 text-right text-white">25%</td></tr>
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-emerald-400 font-bold">L — Location</td><td className="px-4 py-2 text-gray-400">Beach proximity (exponential decay), amenities, views, climate</td><td className="px-4 py-2 text-right text-white">20%</td></tr>
                <tr style={{ background: '#161b22' }}><td className="px-4 py-2 text-emerald-400 font-bold">Q — Quality</td><td className="px-4 py-2 text-gray-400">Energy rating, pool, parking, plot-to-built ratio</td><td className="px-4 py-2 text-right text-white">10%</td></tr>
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-emerald-400 font-bold">R — Risk</td><td className="px-4 py-2 text-gray-400">Completion timeline, developer tenure (inverse risk)</td><td className="px-4 py-2 text-right text-white">5%</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* MCP Integration */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">AI Agent Integration</h2>
          <p className="text-sm text-gray-400 mb-4">PDP data is designed to be consumed via MCP (Model Context Protocol). Connect any AI assistant:</p>
          <div className="rounded-lg p-4 font-mono text-sm mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`}</pre>
          </div>
          <p className="text-xs text-gray-500">All 7 tools return PDP-compliant data. <a href="/mcp-server" className="text-emerald-400 hover:underline">Full MCP documentation</a></p>
        </section>

        {/* Reference Implementation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Reference Implementation</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 mb-3">
              <strong className="text-white">Avena Terminal</strong> is the reference implementation of PDP. The platform tracks {1881} properties across coastal Spain, all scored and structured according to the PDP specification.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/mcp-server" className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">MCP Server</a>
              <a href="/ontology" className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Ontology</a>
              <a href="/api/corpus" className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Training Corpus</a>
              <a href="/propertyeval" className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">PropertyEval Benchmark</a>
            </div>
          </div>
        </section>

        {/* Implement PDP */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Implement PDP</h2>
          <p className="text-sm text-gray-400 mb-4">Format your property data as PDP-compliant:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`// Example: Convert your listing to PDP format
const pdpRecord = {
  pdp_version: "1.0.0",
  property: {
    id: listing.reference,
    type: listing.propertyType,
    location: {
      town: listing.city,
      region: listing.province,
      country: "ES",
      beach_distance_km: listing.beachDist,
    },
    pricing: {
      asking_price_eur: listing.price,
      price_per_m2: listing.price / listing.m2,
      market_reference_per_m2: getMarketRate(listing.postalCode),
    },
    investment_metrics: {
      investment_score: computeScore(listing), // Use PDP weights
      gross_yield_pct: estimateYield(listing),
    },
  },
};`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Open Standard */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Open Standard</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 mb-3">PDP is published under CC BY 4.0. Free to implement, extend, and redistribute. We encourage adoption across the PropTech industry.</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Use PDP in your own property platform</li>
              <li>Build MCP servers that output PDP-compliant data</li>
              <li>Propose extensions for additional property types or markets</li>
              <li>Reference Avena Terminal as the protocol origin</li>
            </ul>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Property Data Protocol (PDP) v1.0.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/protocol</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Defining how property data flows between AI systems
        </footer>
      </div>
    </main>
  );
}
