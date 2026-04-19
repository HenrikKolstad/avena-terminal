import { Metadata } from 'next';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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

const desktopConfig = `// claude_desktop_config.json
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`;

const httpConfig = `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}`;

const searchResponseExample = `{
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
}`;

function ToolCard({ name, desc, params, children }: { name: string; desc: string; params: Array<{ name: string; type: string; desc: string }>; children?: React.ReactNode }) {
  return (
    <div
      className="rounded-sm border p-6"
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <code className="font-mono text-sm text-primary">{name}</code>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground px-2 py-1 rounded-sm"
          style={{ background: 'hsl(var(--av-background))' }}
        >
          read-only
        </span>
      </div>
      <p className="font-light text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Parameters</div>
      <div className="flex flex-col gap-1.5">
        {params.map(p => (
          <div key={p.name} className="font-mono text-xs">
            <span className="text-primary">{p.name}</span>{' '}
            <span className="text-muted-foreground">{p.type}</span>{' '}
            <span className="text-foreground/70">— {p.desc}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

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

  const statPills = [
    { label: 'Properties', value: all.length.toLocaleString() },
    { label: 'Towns', value: towns.length.toString() },
    { label: 'Regions', value: costas.length.toString() },
    { label: 'Avg score', value: `${avgScore}/100` },
    { label: 'Avg yield', value: `${avgYield}%` },
  ];

  const coverageStats = [
    { label: 'Properties', value: all.length.toLocaleString() },
    { label: 'Towns', value: towns.length.toString() },
    { label: 'Regions', value: costas.length.toString() },
    { label: 'Developers', value: [...new Set(all.map(p => p.d).filter(Boolean))].length.toString() },
  ];

  const scoringFactors = [
    { factor: 'Price vs Market (discount coefficient)', weight: '40%' },
    { factor: 'Rental Yield Potential (gross & net)', weight: '25%' },
    { factor: 'Location Quality (beach, amenities)', weight: '20%' },
    { factor: 'Build Quality (energy, pool, parking)', weight: '10%' },
    { factor: 'Completion Risk (timeline, developer)', weight: '5%' },
  ];

  const useCases = [
    { title: 'AI Property Assistant', desc: 'Build a chatbot that answers questions about Spanish new builds with live scored data.' },
    { title: 'Investment Analysis', desc: 'Let your AI agent compare regions, analyze yields, and find underpriced properties.' },
    { title: 'Market Research', desc: 'Pull aggregate statistics for reports, dashboards, or academic research.' },
    { title: 'Portfolio Screening', desc: 'Screen properties against criteria and get ranked recommendations.' },
  ];

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
                Protocol · MCP Server
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Property data,
                <br />
                <span className="italic text-gold">native to AI</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Connect your AI assistant to live investment-scored data for {all.length.toLocaleString()} new build properties across Spain.
                Free. No authentication required.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {statPills.map(pill => (
                  <span
                    key={pill.label}
                    className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-primary"
                    style={{ background: 'hsl(var(--av-primary) / 0.08)', borderColor: 'hsl(var(--av-primary) / 0.4)' }}
                  >
                    {pill.value} {pill.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Quick Start
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Paste into <span className="italic text-gold">config</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                Add Avena Terminal to your Claude Desktop configuration:
              </p>
            </div>
            <pre
              className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 mb-6"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              <code>{desktopConfig}</code>
            </pre>
            <p className="font-light text-base text-muted-foreground mb-4">
              Or for clients that require explicit transport:
            </p>
            <pre
              className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              <code>{httpConfig}</code>
            </pre>
          </div>
        </section>

        {/* Endpoint */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Endpoint
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                One <span className="italic text-gold">URL</span>.
              </h2>
            </div>
            <pre
              className="rounded-sm p-4 overflow-x-auto font-mono text-sm text-foreground/90"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              <code><span className="text-primary">POST</span> https://avenaterminal.com/mcp</code>
            </pre>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Transport: Streamable HTTP &middot; Auth: None (public read-only) &middot; Protocol: MCP 2025-03-26
            </p>
          </div>
        </section>

        {/* Tools */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Tools
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Available <span className="italic text-gold">capabilities</span>.
              </h2>
            </div>

            <div className="space-y-4">
              <ToolCard
                name="search_properties"
                desc={`Search ${all.length.toLocaleString()} scored new build properties. Filter by region, price, score, type, bedrooms. Returns ranked results with scores, yields, and pricing data.`}
                params={[
                  { name: 'region', type: 'string, optional', desc: 'costa-blanca, costa-calida, costa-del-sol' },
                  { name: 'max_price', type: 'number, optional', desc: 'Maximum price in EUR' },
                  { name: 'min_score', type: 'number, optional', desc: 'Minimum investment score (0-100)' },
                  { name: 'type', type: 'string, optional', desc: 'Villa, Apartment, Penthouse, Townhouse, Bungalow, Studio' },
                  { name: 'min_beds', type: 'number, optional', desc: 'Minimum bedrooms' },
                  { name: 'limit', type: 'number, optional', desc: 'Results count (default 10, max 25)' },
                ]}
              >
                <details className="mt-5">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-primary">
                    Example response
                  </summary>
                  <pre
                    className="mt-3 rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <code>{searchResponseExample}</code>
                  </pre>
                </details>
              </ToolCard>

              <ToolCard
                name="get_property"
                desc="Full property details with investment score breakdown (value, yield, location, quality, risk components)."
                params={[
                  { name: 'ref', type: 'required', desc: 'Property reference ID' },
                ]}
              />

              <ToolCard
                name="get_market_stats"
                desc="Live market statistics: median price/m2, average yields, inventory counts, top towns, and regional breakdowns."
                params={[
                  { name: 'region', type: 'string, optional', desc: 'costa-blanca, costa-calida, costa-del-sol, or "all"' },
                ]}
              />

              <ToolCard
                name="get_top_deals"
                desc="Today's best investment opportunities ranked by composite score with human-readable reasoning and multi-currency pricing."
                params={[
                  { name: 'region', type: 'string, optional', desc: 'Region filter' },
                  { name: 'limit', type: 'number, optional', desc: 'Number of deals (default 5, max 15)' },
                  { name: 'max_price', type: 'number, optional', desc: 'Maximum price in EUR' },
                ]}
              />

              <ToolCard
                name="estimate_roi"
                desc="Project ROI over a holding period. Includes capital appreciation, rental income, buying costs, and annualized return in EUR/GBP/NOK/SEK/USD."
                params={[
                  { name: 'ref', type: 'required', desc: 'Property reference ID' },
                  { name: 'hold_years', type: 'number, optional', desc: 'Holding period (default 5, max 20)' },
                ]}
              />

              <ToolCard
                name="compare_alternatives"
                desc="Find similar properties to compare against a listing. Returns alternatives with score and price differentials."
                params={[
                  { name: 'ref', type: 'required', desc: 'Property reference ID to compare' },
                  { name: 'limit', type: 'number, optional', desc: 'Alternatives count (default 5, max 10)' },
                ]}
              />

              <ToolCard
                name="market_timing"
                desc="Market timing indicators: phase assessment (buyer's/seller's/neutral), discount analysis, inventory levels, and actionable recommendation."
                params={[
                  { name: 'region', type: 'string, optional', desc: 'costa-blanca, costa-calida, costa-del-sol, or "all"' },
                ]}
              />

              {/* Portugal Coming Soon */}
              <div
                className="rounded-sm border p-6 opacity-60"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.4)',
                  borderStyle: 'dashed',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <code className="font-mono text-sm text-muted-foreground">search_properties_portugal</code>
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 rounded-sm"
                    style={{ background: 'hsl(var(--av-background))', color: 'hsl(42 85% 64%)' }}
                  >
                    coming Q3 2026
                  </span>
                </div>
                <p className="font-light text-sm text-muted-foreground">
                  Search scored new build properties across Portugal&apos;s Algarve, Lisbon Coast, and Silver Coast.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data coverage */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Coverage
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                The <span className="italic text-gold">footprint</span>.
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {coverageStats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-sm border p-6 text-center"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="font-serif text-4xl font-light tracking-tight text-foreground tabular">{stat.value}</div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scoring model */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Investment Score Model
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Five weighted <span className="italic text-gold">factors</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                Every property receives a composite score from 0&ndash;100 based on five weighted factors:
              </p>
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
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Factor</th>
                    <th className="text-right px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {scoringFactors.map(row => (
                    <tr key={row.factor} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 font-serif text-base text-foreground">{row.factor}</td>
                      <td className="px-5 py-4 text-right text-primary font-medium">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Use cases
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Build <span className="italic text-gold">with it</span>.
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {useCases.map(c => (
                <div
                  key={c.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">{c.title}</h3>
                  <p className="font-light text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Citation */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Citation
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Cite <span className="italic text-gold">properly</span>.
              </h2>
            </div>
            <pre
              className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              <code>{`Kolstad, H. (2026). Spain New Build Property Investment Dataset.
Avena Terminal. DOI: 10.5281/zenodo.19520064
https://avenaterminal.com`}</code>
            </pre>
          </div>
        </section>

        {/* Closing note */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              First MCP server for European real estate
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70 mt-3">
              &copy; 2026 Avena Terminal &middot; avenaterminal.com
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
