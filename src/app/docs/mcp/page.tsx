import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'MCP Integration Guide — Connect AI to Property Data | Avena Terminal',
  description: 'Complete guide to connecting Avena Terminal via MCP (Model Context Protocol). Setup for Claude Desktop, Cursor, Windsurf, Cline. Python, JavaScript, and curl examples.',
  alternates: { canonical: 'https://avenaterminal.com/docs/mcp' },
};

const TOOLS = [
  {
    name: 'search_properties',
    description: 'Search and filter properties across the 27 EU markets by country, region, price range, property type, minimum score, bedroom count, and beach distance. Returns APIP v1 format when format="apip".',
    params: [
      { name: 'country', type: 'string', desc: 'ISO 3166-1 alpha-2 country code (e.g. "ES", "PT", "FR", "DE", "NL", "IT")' },
      { name: 'region', type: 'string', desc: 'Costa/region slug (e.g. "costa-blanca", "costa-del-sol")' },
      { name: 'town', type: 'string', desc: 'Town name or slug' },
      { name: 'type', type: 'string', desc: 'Property type: villa, apartment, penthouse, townhouse, bungalow' },
      { name: 'min_price', type: 'number', desc: 'Minimum price in EUR' },
      { name: 'max_price', type: 'number', desc: 'Maximum price in EUR' },
      { name: 'min_score', type: 'number', desc: 'Minimum Avena Score (0-100)' },
      { name: 'min_beds', type: 'number', desc: 'Minimum bedrooms' },
      { name: 'max_beach_km', type: 'number', desc: 'Maximum distance to beach in km' },
    ],
  },
  {
    name: 'get_property',
    description: 'Get full details for a specific property including Avena Score breakdown, yield estimate, developer info, and images.',
    params: [
      { name: 'ref', type: 'string', desc: 'Property reference ID' },
    ],
  },
  {
    name: 'get_market_stats',
    description: 'Get aggregate market statistics for a region or the entire market. Includes averages, distributions, and top towns.',
    params: [
      { name: 'region', type: 'string', desc: 'Optional costa slug to filter by region' },
    ],
  },
  {
    name: 'get_top_deals',
    description: 'Get the highest-scoring properties currently available, ranked by Avena Score.',
    params: [
      { name: 'limit', type: 'number', desc: 'Number of results (default 10)' },
      { name: 'type', type: 'string', desc: 'Optional property type filter' },
    ],
  },
  {
    name: 'estimate_roi',
    description: 'Project returns over a holding period, accounting for rental income, appreciation, and costs.',
    params: [
      { name: 'ref', type: 'string', desc: 'Property reference ID' },
      { name: 'hold_years', type: 'number', desc: 'Holding period in years (default 5)' },
      { name: 'appreciation_pct', type: 'number', desc: 'Annual appreciation assumption (default 3%)' },
    ],
  },
  {
    name: 'compare_alternatives',
    description: 'Find and compare similar properties to a given reference, showing side-by-side metrics.',
    params: [
      { name: 'ref', type: 'string', desc: 'Property reference ID to compare against' },
      { name: 'limit', type: 'number', desc: 'Number of alternatives (default 5)' },
    ],
  },
  {
    name: 'market_timing',
    description: 'Assess whether current conditions in a region favour buyers or sellers based on inventory, pricing, and demand.',
    params: [
      { name: 'region', type: 'string', desc: 'Costa slug to analyse' },
    ],
  },
];

const SETUP_GUIDES = [
  {
    name: 'Claude Desktop',
    file: 'claude_desktop_config.json',
    path: '~/Library/Application Support/Claude/ (Mac) or %APPDATA%\\Claude\\ (Windows)',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`,
    steps: [
      'Open Claude Desktop settings',
      'Click "Developer" then "Edit Config"',
      'Paste the JSON below into your config file',
      'Restart Claude Desktop',
      'Ask Claude: "Search for villas under 300k on Costa Blanca"',
    ],
  },
  {
    name: 'Cursor',
    file: '.cursor/mcp.json',
    path: 'Project root or ~/.cursor/',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}`,
    steps: [
      'Create or edit .cursor/mcp.json in your project root',
      'Paste the config below',
      'Restart Cursor or reload the window',
      'Use Avena tools in Cursor chat or Composer',
    ],
  },
  {
    name: 'Windsurf',
    file: 'mcp_config.json',
    path: '~/.codeium/windsurf/',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "serverUrl": "https://avenaterminal.com/mcp"
    }
  }
}`,
    steps: [
      'Navigate to ~/.codeium/windsurf/',
      'Create or edit mcp_config.json',
      'Paste the config below',
      'Restart Windsurf',
      'Avena tools will be available in Cascade',
    ],
  },
  {
    name: 'Cline (VS Code)',
    file: 'Cline MCP Settings',
    path: 'VS Code > Cline Extension > MCP Servers',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transportType": "streamable-http"
    }
  }
}`,
    steps: [
      'Open VS Code with Cline extension installed',
      'Go to Cline settings > MCP Servers',
      'Add a new server with the config below',
      'Save and the tools will appear in Cline',
    ],
  },
];

const TROUBLESHOOTING = [
  { issue: 'Connection refused or timeout', solution: 'Verify https://avenaterminal.com/mcp returns JSON with a GET request. Check your internet connection and any firewall/proxy settings.' },
  { issue: 'Tools not appearing in Claude Desktop', solution: 'Ensure your claude_desktop_config.json is valid JSON. Restart Claude Desktop completely (quit and reopen, not just close the window).' },
  { issue: 'Transport error in Cursor', solution: 'Make sure transport is set to "http" (not "sse" or "stdio"). Cursor uses HTTP transport for remote MCP servers.' },
  { issue: 'Empty results from search', solution: 'Broaden your search criteria. Try removing filters one at a time. Use get_market_stats first to understand available data ranges.' },
  { issue: 'CORS errors in browser', solution: 'The MCP endpoint supports CORS with Access-Control-Allow-Origin: *. If using from a browser, ensure you are making POST requests to /mcp.' },
  { issue: 'Invalid JSON-RPC response', solution: 'Ensure your request follows JSON-RPC 2.0 format with jsonrpc, method, params, and id fields. The method should be "tools/call" or "tools/list".' },
  { issue: 'Smithery installation fails', solution: 'Try: npx @anthropic-ai/create-mcp-server or install directly via the JSON config instead of Smithery CLI.' },
  { issue: 'Rate limiting', solution: 'The Avena Terminal MCP endpoint has generous rate limits. If you hit limits, add a small delay between calls. No API key needed.' },
];

export default function McpGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: 'Avena Terminal MCP Integration Guide',
    description: 'Complete guide to connecting AI tools to Avena Terminal via Model Context Protocol (MCP).',
    url: 'https://avenaterminal.com/docs/mcp',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: 'hsl(var(--av-border))', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: 'hsl(var(--av-background))' }}>MCP GUIDE</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">MCP Integration Guide</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl">
          Complete guide to connecting AI tools to Avena Terminal via the Model Context Protocol. Setup instructions, code examples, tool documentation, and troubleshooting.
        </p>

        {/* Table of contents */}
        <nav className="rounded-lg p-4 mb-10" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
          <h2 className="text-sm font-bold text-white mb-2">Contents</h2>
          <div className="grid md:grid-cols-2 gap-1 text-xs">
            {[
              { label: 'What is MCP?', href: '#what-is-mcp' },
              { label: 'Available Tools', href: '#tools' },
              { label: 'Claude Desktop Setup', href: '#claude-desktop' },
              { label: 'Cursor Setup', href: '#cursor' },
              { label: 'Windsurf Setup', href: '#windsurf' },
              { label: 'Cline Setup', href: '#cline-vs-code' },
              { label: 'Python Examples', href: '#python' },
              { label: 'JavaScript Examples', href: '#javascript' },
              { label: 'curl Examples', href: '#curl' },
              { label: 'Example Tool Calls', href: '#example-calls' },
              { label: 'Troubleshooting', href: '#troubleshooting' },
              { label: 'Smithery Listing', href: '#smithery' },
            ].map(item => (
              <a key={item.href} href={item.href} className="text-primary hover:text-primary py-0.5">{item.label}</a>
            ))}
          </div>
        </nav>

        <div className="h-px w-full mb-10" style={{ background: 'hsl(var(--av-border))' }} />

        {/* What is MCP */}
        <section id="what-is-mcp" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">What is MCP?</h2>
          <div className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <p className="text-sm text-gray-300 leading-relaxed">
              The Model Context Protocol (MCP) is an open standard created by Anthropic that allows AI assistants to connect to external data sources and tools. It works like a USB-C port for AI: a universal interface that lets any compatible AI tool access any compatible data source. Avena Terminal implements MCP via Streamable HTTP transport at <span className="text-primary font-mono">avenaterminal.com/mcp</span>, providing 7 property intelligence tools with no authentication required. Any MCP-compatible client can connect and immediately access live scored data for new build properties across Spain.
            </p>
          </div>
        </section>

        {/* Available Tools */}
        <section id="tools" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Available Tools ({TOOLS.length})</h2>
          <div className="space-y-4">
            {TOOLS.map(tool => (
              <div key={tool.name} className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
                <h3 className="text-primary font-mono font-bold text-sm mb-1">{tool.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{tool.description}</p>
                {tool.params.length > 0 && (
                  <div className="rounded p-3" style={{ background: 'hsl(var(--av-background))' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 text-left">
                          <th className="pb-1 pr-4">Parameter</th>
                          <th className="pb-1 pr-4">Type</th>
                          <th className="pb-1">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-400">
                        {tool.params.map(p => (
                          <tr key={p.name}>
                            <td className="py-0.5 pr-4 font-mono text-primary/70">{p.name}</td>
                            <td className="py-0.5 pr-4 text-gray-500">{p.type}</td>
                            <td className="py-0.5">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Setup Guides */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Step-by-Step Setup</h2>
          <div className="space-y-6">
            {SETUP_GUIDES.map(guide => (
              <div key={guide.name} id={guide.name.toLowerCase().replace(/[\s()]/g, '-')} className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
                <h3 className="text-lg text-white font-bold mb-1">{guide.name}</h3>
                <p className="text-[10px] text-gray-500 font-mono mb-4">File: {guide.file} &middot; Path: {guide.path}</p>

                <div className="mb-4">
                  <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Steps</h4>
                  <ol className="space-y-1">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Config</h4>
                <div className="rounded p-4 font-mono text-xs overflow-x-auto" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
                  <pre className="text-gray-300 whitespace-pre-wrap">{guide.config}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Code Examples</h2>

          {/* Python */}
          <div id="python" className="rounded-lg p-5 mb-4" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <h3 className="text-lg text-white font-bold mb-1">Python</h3>
            <p className="text-xs text-gray-500 mb-3">pip install langchain-mcp-adapters langchain-anthropic</p>
            <div className="rounded p-4 font-mono text-xs overflow-x-auto" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
              <pre className="text-gray-300 whitespace-pre-wrap">{`import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

async def main():
    model = ChatAnthropic(model="claude-sonnet-4-20250514")

    async with MultiServerMCPClient({
        "avena-terminal": {
            "url": "https://avenaterminal.com/mcp",
            "transport": "streamable_http",
        }
    }) as client:
        # List available tools
        tools = client.get_tools()
        print(f"Connected! {len(tools)} tools available")

        # Create agent and query
        agent = create_react_agent(model, tools)
        result = await agent.ainvoke({
            "messages": [{
                "role": "user",
                "content": "Find the top 5 villas under 350k with highest Avena Score"
            }]
        })
        print(result["messages"][-1].content)

asyncio.run(main())`}</pre>
            </div>
          </div>

          {/* JavaScript */}
          <div id="javascript" className="rounded-lg p-5 mb-4" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <h3 className="text-lg text-white font-bold mb-1">JavaScript / TypeScript</h3>
            <p className="text-xs text-gray-500 mb-3">npm install @modelcontextprotocol/sdk</p>
            <div className="rounded p-4 font-mono text-xs overflow-x-auto" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
              <pre className="text-gray-300 whitespace-pre-wrap">{`import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({ name: "my-app", version: "1.0.0" });

const transport = new StreamableHTTPClientTransport(
  new URL("https://avenaterminal.com/mcp")
);

await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log(\`Connected! \${tools.length} tools available\`);

// Search properties
const result = await client.callTool({
  name: "search_properties",
  arguments: {
    region: "costa-blanca",
    max_price: 300000,
    min_score: 60,
    type: "villa"
  }
});
console.log(result.content);

// Get market stats
const stats = await client.callTool({
  name: "get_market_stats",
  arguments: { region: "costa-blanca" }
});
console.log(stats.content);

// Estimate ROI
const roi = await client.callTool({
  name: "estimate_roi",
  arguments: { ref: "PROP-001", hold_years: 5 }
});
console.log(roi.content);`}</pre>
            </div>
          </div>

          {/* curl */}
          <div id="curl" className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <h3 className="text-lg text-white font-bold mb-1">curl</h3>
            <p className="text-xs text-gray-500 mb-3">No dependencies required</p>
            <div className="rounded p-4 font-mono text-xs overflow-x-auto" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
              <pre className="text-gray-300 whitespace-pre-wrap">{`# List available tools
curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Search properties
curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_properties",
      "arguments": {
        "region": "costa-blanca",
        "max_price": 300000,
        "min_score": 60
      }
    },
    "id": 2
  }'

# Get top deals
curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_top_deals",
      "arguments": { "limit": 5 }
    },
    "id": 3
  }'

# Get market stats
curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_market_stats",
      "arguments": { "region": "costa-del-sol" }
    },
    "id": 4
  }'

# Market timing assessment
curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "market_timing",
      "arguments": { "region": "costa-blanca" }
    },
    "id": 5
  }'`}</pre>
            </div>
          </div>
        </section>

        {/* Example Tool Calls with Responses */}
        <section id="example-calls" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Example Tool Calls &amp; Responses</h2>

          <div className="space-y-4">
            <div className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-sm text-white font-bold mb-2">search_properties</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Request</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "name": "search_properties",
  "arguments": {
    "region": "costa-blanca",
    "max_price": 250000,
    "type": "apartment",
    "min_score": 65
  }
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Response (abbreviated)</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "total": 42,
  "results": [
    {
      "ref": "CB-APT-1234",
      "type": "Apartment",
      "location": "Torrevieja",
      "price": 189000,
      "score": 78,
      "yield_gross": 6.8,
      "bedrooms": 2,
      "built_m2": 75,
      "beach_km": 0.8
    },
    ...
  ]
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-sm text-white font-bold mb-2">estimate_roi</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Request</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "name": "estimate_roi",
  "arguments": {
    "ref": "CB-APT-1234",
    "hold_years": 5,
    "appreciation_pct": 3
  }
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Response (abbreviated)</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "property": "CB-APT-1234",
  "purchase_price": 189000,
  "hold_years": 5,
  "gross_rental_5yr": 64260,
  "appreciation_5yr": 29925,
  "total_return_pct": 49.8,
  "annualised_return": 8.4,
  "estimated_exit_price": 218925
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-sm text-white font-bold mb-2">market_timing</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Request</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "name": "market_timing",
  "arguments": {
    "region": "costa-blanca"
  }
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Response (abbreviated)</p>
                  <div className="rounded p-3 font-mono text-xs" style={{ background: 'hsl(var(--av-background))' }}>
                    <pre className="text-gray-300 whitespace-pre-wrap">{`{
  "region": "Costa Blanca",
  "assessment": "balanced",
  "buyer_score": 62,
  "inventory_level": "adequate",
  "price_trend": "stable",
  "demand_indicator": "moderate",
  "recommendation": "Selective buying recommended. Focus on properties scoring 70+ on the Avena Score."
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Troubleshooting</h2>
          <div className="space-y-2">
            {TROUBLESHOOTING.map((item, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
                <h3 className="text-sm text-white font-semibold mb-1">{item.issue}</h3>
                <p className="text-xs text-gray-400">{item.solution}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Smithery */}
        <section id="smithery" className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Smithery Listing</h2>
          <div className="rounded-lg p-5" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
            <p className="text-sm text-gray-300 mb-3">
              Avena Terminal is listed on Smithery, the MCP server registry. Install with one command:
            </p>
            <div className="rounded p-4 font-mono text-xs mb-3" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
              <pre className="text-gray-300">smithery mcp add henrik-kmvv/avena-terminal</pre>
            </div>
            <p className="text-xs text-gray-500">
              View the listing at{' '}
              <a href="https://smithery.ai/server/@henrik-kmvv/avena-terminal" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary underline">
                smithery.ai/server/@henrik-kmvv/avena-terminal
              </a>
            </p>
          </div>
        </section>

        <div className="h-px w-full my-10" style={{ background: 'hsl(var(--av-border))' }} />

        {/* Related pages */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/integrate" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Quick Setup</h3>
              <p className="text-[10px] text-gray-500">One-click configs for all AI tools</p>
            </Link>
            <Link href="/docs/integrations" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">All Integrations</h3>
              <p className="text-[10px] text-gray-500">LlamaIndex, LangChain, AutoGPT, CrewAI, ChatGPT</p>
            </Link>
            <Link href="/langchain-tool" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">LangChain Guide</h3>
              <p className="text-[10px] text-gray-500">Detailed Python agent integration</p>
            </Link>
            <Link href="/mcp-server" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Server Docs</h3>
              <p className="text-[10px] text-gray-500">Full tool documentation</p>
            </Link>
            <Link href="/training-data" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Training Data</h3>
              <p className="text-[10px] text-gray-500">JSONL datasets for LLM fine-tuning</p>
            </Link>
            <Link href="/protocol" className="rounded-lg p-4 hover:border-primary/50 transition-colors" style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}>
              <h3 className="text-white font-semibold text-sm mb-1">PDP Protocol</h3>
              <p className="text-[10px] text-gray-500">Property data exchange standard</p>
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Connect once. Property data everywhere.
        </footer>
      </div>
    </main>
  );
}
