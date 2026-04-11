import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'MCP Server — Spanish Property Data for AI Agents | Avena Terminal',
  description: 'Connect your AI assistant to live scored data for 1,881 new build properties in Spain via Model Context Protocol. Free, no auth required. Search, filter, and analyze properties by investment score, rental yield, and region.',
  openGraph: {
    title: 'Avena Terminal MCP Server — Spanish Property Data for AI Agents',
    description: 'The first MCP server for European real estate. Connect Claude, Cursor, or any MCP-compatible AI to live Spanish property investment data.',
    url: 'https://avenaterminal.com/mcp-server',
    siteName: 'Avena Terminal',
    type: 'website',
  },
  alternates: { canonical: 'https://avenaterminal.com/mcp-server' },
};

export default function McpServerPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal MCP Server',
    applicationCategory: 'DeveloperApplication',
    description: 'Model Context Protocol server for live Spanish new build property data. 4 tools: search, details, market stats, top deals.',
    url: 'https://avenaterminal.com/mcp',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>MCP SERVER</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Avena Terminal MCP Server</h1>
          <p className="text-lg text-gray-400 mb-6 max-w-2xl">
            Connect your AI assistant to live investment-scored data for {all.length.toLocaleString()} new build properties across Spain.
            Free. No authentication required.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded text-xs font-mono" style={{ background: '#1c2333', color: '#10b981' }}>{all.length.toLocaleString()} properties</span>
            <span className="px-3 py-1 rounded text-xs font-mono" style={{ background: '#1c2333', color: '#10b981' }}>{towns.length} towns</span>
            <span className="px-3 py-1 rounded text-xs font-mono" style={{ background: '#1c2333', color: '#10b981' }}>{costas.length} regions</span>
            <span className="px-3 py-1 rounded text-xs font-mono" style={{ background: '#1c2333', color: '#10b981' }}>avg score {avgScore}/100</span>
            <span className="px-3 py-1 rounded text-xs font-mono" style={{ background: '#1c2333', color: '#10b981' }}>avg yield {avgYield}%</span>
          </div>
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
          <p className="text-sm text-gray-400 mb-4">Add Avena Terminal to your Claude Desktop configuration:</p>
          <div className="rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`// claude_desktop_config.json
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`}</pre>
          </div>
          <p className="text-sm text-gray-400 mb-4">Or for clients that require explicit transport:</p>
          <div className="rounded-lg p-4 font-mono text-sm overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}`}</pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Endpoint</h2>
          <div className="rounded-lg p-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <span className="text-emerald-400">POST</span> <span className="text-white">https://avenaterminal.com/mcp</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Transport: Streamable HTTP | Auth: None (public read-only) | Protocol: MCP 2025-03-26</p>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Tools */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Available Tools</h2>

          {/* search_properties */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">search_properties</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Search {all.length.toLocaleString()} scored new build properties. Filter by region, price, score, type, bedrooms. Returns ranked results with scores, yields, and pricing data.
            </p>
            <div className="text-xs font-mono text-gray-500 mb-3">Parameters:</div>
            <div className="grid gap-1 text-xs font-mono mb-4">
              <div><span className="text-emerald-400">region</span> <span className="text-gray-600">string, optional</span> — costa-blanca, costa-calida, costa-del-sol</div>
              <div><span className="text-emerald-400">max_price</span> <span className="text-gray-600">number, optional</span> — Maximum price in EUR</div>
              <div><span className="text-emerald-400">min_score</span> <span className="text-gray-600">number, optional</span> — Minimum investment score (0-100)</div>
              <div><span className="text-emerald-400">type</span> <span className="text-gray-600">string, optional</span> — Villa, Apartment, Penthouse, Townhouse, Bungalow, Studio</div>
              <div><span className="text-emerald-400">min_beds</span> <span className="text-gray-600">number, optional</span> — Minimum bedrooms</div>
              <div><span className="text-emerald-400">limit</span> <span className="text-gray-600">number, optional</span> — Results count (default 10, max 25)</div>
            </div>
            <details>
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Example response</summary>
              <div className="mt-2 rounded p-3 text-xs font-mono overflow-x-auto" style={{ background: '#090d12' }}>
                <pre className="text-gray-400">{`{
  "total_matching": 342,
  "showing": 3,
  "source": "Avena Terminal (avenaterminal.com)",
  "properties": [
    {
      "ref": "AP1-CB-12345",
      "name": "Villa in Torrevieja, Alicante",
      "type": "Villa",
      "price": 249000,
      "score": 82,
      "yield_gross": 7.2,
      "price_per_m2": 2180,
      "beach_km": 1.5,
      "bedrooms": 3,
      "developer": "Premium Homes"
    }
  ]
}`}</pre>
              </div>
            </details>
          </div>

          {/* get_property */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">get_property</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Full property details with investment score breakdown (value, yield, location, quality, risk components).
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">ref</span> <span className="text-red-400">required</span> — Property reference ID</div>
            </div>
          </div>

          {/* get_market_stats */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">get_market_stats</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Live market statistics: median price/m2, average yields, inventory counts, top towns, and regional breakdowns.
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">region</span> <span className="text-gray-600">string, optional</span> — costa-blanca, costa-calida, costa-del-sol, or &quot;all&quot;</div>
            </div>
          </div>

          {/* get_top_deals */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">get_top_deals</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Today&apos;s best investment opportunities ranked by composite score with human-readable reasoning and multi-currency pricing.
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">region</span> <span className="text-gray-600">string, optional</span> — Region filter</div>
              <div><span className="text-emerald-400">limit</span> <span className="text-gray-600">number, optional</span> — Number of deals (default 5, max 15)</div>
              <div><span className="text-emerald-400">max_price</span> <span className="text-gray-600">number, optional</span> — Maximum price in EUR</div>
            </div>
          </div>

          {/* estimate_roi */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">estimate_roi</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Project ROI over a holding period. Includes capital appreciation, rental income, buying costs, and annualized return in EUR/GBP/NOK/SEK/USD.
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">ref</span> <span className="text-red-400">required</span> — Property reference ID</div>
              <div><span className="text-emerald-400">hold_years</span> <span className="text-gray-600">number, optional</span> — Holding period (default 5, max 20)</div>
            </div>
          </div>

          {/* compare_alternatives */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">compare_alternatives</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Find similar properties to compare against a listing. Returns alternatives with score and price differentials.
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">ref</span> <span className="text-red-400">required</span> — Property reference ID to compare</div>
              <div><span className="text-emerald-400">limit</span> <span className="text-gray-600">number, optional</span> — Alternatives count (default 5, max 10)</div>
            </div>
          </div>

          {/* market_timing */}
          <div className="rounded-lg p-6 mb-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-emerald-400 font-bold">market_timing</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>read-only</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Market timing indicators: phase assessment (buyer&apos;s/seller&apos;s/neutral), discount analysis, inventory levels, and actionable recommendation.
            </p>
            <div className="grid gap-1 text-xs font-mono">
              <div><span className="text-emerald-400">region</span> <span className="text-gray-600">string, optional</span> — costa-blanca, costa-calida, costa-del-sol, or &quot;all&quot;</div>
            </div>
          </div>

          {/* Portugal Coming Soon */}
          <div className="rounded-lg p-6 mb-6 opacity-60" style={{ background: '#161b22', border: '1px dashed #30363d' }}>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-gray-500 font-bold">search_properties_portugal</code>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#f59e0b' }}>coming Q3 2026</span>
            </div>
            <p className="text-sm text-gray-500">
              Search scored new build properties across Portugal&apos;s Algarve, Lisbon Coast, and Silver Coast.
            </p>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Data Coverage */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Data Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Properties', value: all.length.toLocaleString() },
              { label: 'Towns', value: towns.length.toString() },
              { label: 'Regions', value: costas.length.toString() },
              { label: 'Developers', value: [...new Set(all.map(p => p.d).filter(Boolean))].length.toString() },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg p-4 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring Model */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Investment Score Model</h2>
          <p className="text-sm text-gray-400 mb-4">
            Every property receives a composite score from 0&ndash;100 based on five weighted factors:
          </p>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Factor</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Weight</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-gray-300">Price vs Market (discount coefficient)</td><td className="px-4 py-2 text-right text-emerald-400">40%</td></tr>
                <tr style={{ background: '#161b22' }}><td className="px-4 py-2 text-gray-300">Rental Yield Potential (gross &amp; net)</td><td className="px-4 py-2 text-right text-emerald-400">25%</td></tr>
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-gray-300">Location Quality (beach, amenities)</td><td className="px-4 py-2 text-right text-emerald-400">20%</td></tr>
                <tr style={{ background: '#161b22' }}><td className="px-4 py-2 text-gray-300">Build Quality (energy, pool, parking)</td><td className="px-4 py-2 text-right text-emerald-400">10%</td></tr>
                <tr style={{ background: '#0d1117' }}><td className="px-4 py-2 text-gray-300">Completion Risk (timeline, developer)</td><td className="px-4 py-2 text-right text-emerald-400">5%</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Use Cases */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'AI Property Assistant', desc: 'Build a chatbot that answers questions about Spanish new builds with live scored data.' },
              { title: 'Investment Analysis', desc: 'Let your AI agent compare regions, analyze yields, and find underpriced properties.' },
              { title: 'Market Research', desc: 'Pull aggregate statistics for reports, dashboards, or academic research.' },
              { title: 'Portfolio Screening', desc: 'Screen properties against criteria and get ranked recommendations.' },
            ].map(c => (
              <div key={c.title} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Citation */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Spain New Build Property Investment Dataset.</p>
            <p className="text-gray-400">Avena Terminal. DOI: 10.5281/zenodo.19520064</p>
            <p className="text-gray-400">https://avenaterminal.com</p>
          </div>
        </section>

        {/* Footer */}
        <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, #10b98140, transparent)' }} />
        <footer className="text-center text-xs text-gray-600 pb-8">
          <p>&copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a></p>
          <p className="mt-1">First MCP server for European real estate</p>
        </footer>
      </div>
    </main>
  );
}
