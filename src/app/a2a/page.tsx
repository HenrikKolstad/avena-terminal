import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'A2A Protocol — Agent-to-Agent Communication | Avena Terminal',
  description: "First property platform supporting Google's A2A (Agent-to-Agent) protocol. AI agents can discover and communicate with Avena Terminal autonomously for Spanish property intelligence.",
  alternates: { canonical: 'https://avenaterminal.com/a2a' },
  robots: { index: false, follow: false },
};

export default function A2APage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal A2A Agent',
    applicationCategory: 'DeveloperApplication',
    description: "A2A (Agent-to-Agent) endpoint for autonomous AI agent communication. Spanish property intelligence.",
    url: 'https://avenaterminal.com/a2a',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#f97316', color: '#f97316' }}>A2A PROTOCOL</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">A2A Protocol</h1>
        <p className="text-lg text-gray-400 mb-2">Agent-to-Agent Communication</p>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          Avena Terminal supports Google&apos;s A2A (Agent-to-Agent) protocol — the emerging standard for AI agents to discover and communicate with each other autonomously. First property platform in Europe to implement A2A.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* What is A2A */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">What is A2A?</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 leading-relaxed">
              A2A (Agent-to-Agent) is Google&apos;s open protocol that lets AI agents from different companies discover each other and collaborate on complex tasks. While MCP connects humans to AI tools, A2A connects AI agents to OTHER AI agents. When a financial planning agent needs property data for a client&apos;s portfolio, it discovers Avena Terminal&apos;s A2A endpoint automatically and requests data — no human involvement required.
            </p>
          </div>
        </section>

        {/* Endpoint */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Agent Endpoint</h2>
          <div className="rounded-lg p-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <span className="text-emerald-400">POST</span> <span className="text-white">https://avenaterminal.com/api/a2a</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Discovery: <a href="/.well-known/agent.json" className="text-emerald-400 hover:underline">/.well-known/agent.json</a> &middot; Protocol: JSON-RPC 2.0 &middot; Auth: None</p>
        </section>

        {/* Skills */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Agent Skills</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { id: 'property_search', name: 'Property Search', desc: 'Search 1,881+ scored properties by region, budget, type, score, yield', examples: ['Find villas under 300k in Costa Blanca', 'Beach apartments with 6%+ yield'] },
              { id: 'market_analysis', name: 'Market Analysis', desc: 'Regional price trends, avg price/m\u00B2, discount rates, market regime', examples: ['Costa Blanca market overview', 'Price trends by region'] },
              { id: 'investment_signals', name: 'Investment Signals', desc: 'Alpha signals: score outliers, deep discounts, yield spikes, mispricing', examples: ['Show current alpha signals', 'Any anomalies this week?'] },
              { id: 'yield_calculator', name: 'Yield Calculator', desc: 'Gross/net rental yield using AirDNA-calibrated STR data for 100+ towns', examples: ['Top yield towns', 'Rental income in Torrevieja'] },
            ].map(skill => (
              <div key={skill.id} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <code className="text-emerald-400 text-xs font-bold">{skill.id}</code>
                <h3 className="text-white font-semibold text-sm mt-1 mb-1">{skill.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{skill.desc}</p>
                <div className="text-[10px] text-gray-600">
                  {skill.examples.map(e => <div key={e} className="italic">&ldquo;{e}&rdquo;</div>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Code Example */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Connect Your Agent</h2>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`// Send a task to Avena Terminal via A2A
const response = await fetch('https://avenaterminal.com/api/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'tasks/send',
    params: {
      id: 'task-001',
      message: {
        role: 'user',
        parts: [{
          text: 'Find 3-bed villas under 300k in Costa Blanca with high yield'
        }]
      }
    }
  })
});

const data = await response.json();
console.log(data.result.artifacts[0].parts[0].text);`}</pre>
          </div>
        </section>

        {/* Also Available */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Also Available</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/mcp-server" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Server</h3>
              <p className="text-[10px] text-gray-500">7 tools for Claude, Cursor, Windsurf</p>
            </Link>
            <Link href="/agents/registry" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Agent Registry</h3>
              <p className="text-[10px] text-gray-500">Identity layer for property AI</p>
            </Link>
            <Link href="/integrate" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Integration Guide</h3>
              <p className="text-[10px] text-gray-500">Copy-paste configs for 8 platforms</p>
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; First property platform in Europe to support Google A2A protocol
        </footer>
      </div>
    </main>
  );
}
