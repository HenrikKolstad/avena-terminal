import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'LangChain Tool — Spanish Property Data for AI Agents | Avena Terminal',
  description: 'Add Avena Terminal as a LangChain tool. Search 1,881 scored new build properties in Spain from your LangChain agent. Free, no auth required.',
  alternates: { canonical: 'https://avenaterminal.com/langchain-tool' },
};

export default function LangChainToolPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal LangChain Tool',
    applicationCategory: 'DeveloperApplication',
    description: 'LangChain tool wrapper for Avena Terminal property investment data. 7 tools for searching, scoring, and analyzing Spanish new builds.',
    url: 'https://avenaterminal.com/langchain-tool',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>LANGCHAIN</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">LangChain Tool</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl">
          Add Avena Terminal as a tool in your LangChain agent. Search, score, and analyze 1,881 new build properties in Spain directly from your AI pipeline. Free, no API key required.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Quick Start */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
          <p className="text-sm text-gray-400 mb-4">Install the MCP adapter for LangChain:</p>
          <div className="rounded-lg p-4 font-mono text-sm mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">pip install langchain-mcp-adapters</pre>
          </div>
          <p className="text-sm text-gray-400 mb-4">Connect to Avena Terminal&apos;s MCP server:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

model = ChatAnthropic(model="claude-sonnet-4-20250514")

async with MultiServerMCPClient(
    {
        "avena-terminal": {
            "url": "https://avenaterminal.com/mcp",
            "transport": "streamable_http",
        }
    }
) as client:
    tools = client.get_tools()
    agent = create_react_agent(model, tools)

    result = await agent.ainvoke({
        "messages": [
            {"role": "user", "content": "Find me the top 5 villas under €300k in Costa Blanca"}
        ]
    })
    print(result["messages"][-1].content)`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Available Tools</h2>
          <div className="space-y-3">
            {[
              { name: 'search_properties', desc: 'Search and filter properties by region, price, score, type, bedrooms. Returns top 10-25 ranked by investment score.' },
              { name: 'get_property', desc: 'Get full details for a specific property including score breakdown, yield estimates, and developer info.' },
              { name: 'get_market_stats', desc: 'Regional market statistics — median prices, yields, inventory counts, top towns.' },
              { name: 'get_top_deals', desc: "Today's best investment deals ranked by composite score with reasoning." },
              { name: 'estimate_roi', desc: 'Project ROI over a holding period — capital appreciation, rental income, buying costs.' },
              { name: 'compare_alternatives', desc: 'Find similar properties with score and price differentials.' },
              { name: 'market_timing', desc: "Market phase assessment — buyer's market, seller's market, or neutral." },
            ].map(tool => (
              <div key={tool.name} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <code className="text-emerald-400 font-bold text-sm">{tool.name}</code>
                <p className="text-xs text-gray-500 mt-1">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Custom Tool Definition */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Custom HTTP Tool (No MCP)</h2>
          <p className="text-sm text-gray-400 mb-4">If you prefer direct HTTP calls without MCP, use a custom LangChain tool:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`from langchain.tools import tool
import requests

@tool
def search_spain_properties(
    region: str = "all",
    max_price: int = None,
    min_score: int = None,
    property_type: str = None,
    min_beds: int = None,
    limit: int = 10
) -> str:
    """Search Avena Terminal's database of 1,881 scored new build
    properties in Spain. Returns investment-ranked results filtered
    by region (costa-blanca, costa-calida, costa-del-sol), maximum
    price in EUR, minimum investment score (0-100), property type,
    and minimum bedrooms."""

    # Use the semantic URL pattern
    type_slug = property_type.lower() if property_type else "all"
    price_slug = f"under-{max_price//1000}k" if max_price else "all"

    url = f"https://avenaterminal.com/data/{region}/{type_slug}/{price_slug}/top-scored"
    # Or use the MCP endpoint directly:
    # POST https://avenaterminal.com/mcp

    response = requests.get(url)
    return response.text

@tool
def get_spain_market_stats(region: str = "all") -> str:
    """Get live market statistics for Spanish new build regions.
    Returns median price per m2, average rental yield, total
    active inventory, and top-performing towns."""

    url = f"https://avenaterminal.com/data/{region}/all/all/top-scored"
    response = requests.get(url)
    return response.text`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* CrewAI */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">CrewAI Integration</h2>
          <p className="text-sm text-gray-400 mb-4">Use Avena Terminal tools in your CrewAI agents:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`from crewai import Agent, Task, Crew
from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient(
    {"avena": {"url": "https://avenaterminal.com/mcp", "transport": "streamable_http"}}
) as client:
    tools = client.get_tools()

    analyst = Agent(
        role="Property Investment Analyst",
        goal="Find the best new build investments in Spain",
        tools=tools,
        llm="claude-sonnet-4-20250514"
    )

    task = Task(
        description="Analyze Costa Blanca for villas under €400k. Compare top 3 options.",
        agent=analyst
    )

    crew = Crew(agents=[analyst], tasks=[task])
    result = crew.kickoff()`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Also Available */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Also Available</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <a href="/mcp-server" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Server</h3>
              <p className="text-xs text-gray-500">Native MCP for Claude Desktop, Cursor, Windsurf</p>
            </a>
            <a href="/protocol" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">PDP Protocol</h3>
              <p className="text-xs text-gray-500">Open standard for property data exchange</p>
            </a>
            <a href="/api/corpus" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Training Corpus</h3>
              <p className="text-xs text-gray-500">250+ Q&A pairs for fine-tuning</p>
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Property data for every AI framework
        </footer>
      </div>
    </main>
  );
}
