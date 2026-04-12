import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Agent Registry — Identity Layer for European Property AI | Avena Terminal',
  description: 'Register your AI agent with Avena Terminal. Get verified access to scored property data, market intelligence, and alpha signals across European real estate. The Plaid of property AI.',
  alternates: { canonical: 'https://avenaterminal.com/agents/registry' },
};

export default function AgentRegistryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal Agent Registry',
    applicationCategory: 'DeveloperApplication',
    description: 'Identity and data layer for AI agents operating in European real estate. Register, verify, and connect AI agents to live scored property data.',
    url: 'https://avenaterminal.com/agents/registry',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>AGENT REGISTRY</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Agent Registry</h1>
        <p className="text-lg text-gray-400 mb-2">The identity layer for AI agents in European real estate</p>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          Register your AI agent with Avena Terminal. Get a verified identity token, access scored property data for 1,881 new builds, market intelligence feeds, and alpha signals. Free tier available.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Register', desc: 'POST your agent details to the registry API' },
              { step: '2', title: 'Get Credentials', desc: 'Receive agent_id + api_key + identity token' },
              { step: '3', title: 'Connect', desc: 'Include your agent_id in MCP requests' },
              { step: '4', title: 'Get Intelligence', desc: 'Access data, signals, analytics on your usage' },
            ].map(s => (
              <div key={s.step} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-2xl font-bold text-emerald-400 mb-2">{s.step}</div>
                <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-[10px] text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Registration */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Register Your Agent</h2>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`curl -X POST https://avenaterminal.com/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_name": "My Property Assistant",
    "developer_name": "Your Name",
    "developer_email": "you@example.com",
    "use_case": "Property investment advisor for British buyers",
    "website": "https://your-app.com"
  }'`}</pre>
          </div>
          <p className="text-sm text-gray-400 mb-4">Response:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "success": true,
  "credentials": {
    "agent_id": "avena-agent-a1b2c3d4",
    "api_key": "avt_abc123...",
    "identity_token": "avt_id_xyz789..."
  },
  "endpoints": {
    "mcp": "https://avenaterminal.com/mcp",
    "intelligence_feed": "https://avenaterminal.com/feed/intelligence.json",
    "alpha_signals": "https://avenaterminal.com/intelligence/signals",
    "rlhf_data": "https://avenaterminal.com/feed/rlhf.jsonl"
  }
}`}</pre>
          </div>
        </section>

        {/* Using Your Token */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Using Your Agent Identity</h2>
          <p className="text-sm text-gray-400 mb-4">Include your agent ID in MCP requests for tracked analytics:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`// Claude Desktop config with agent identity
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "headers": {
        "x-avena-agent-id": "avena-agent-a1b2c3d4"
      }
    }
  }
}`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Tiers */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Tiers</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-bold mb-1">Free</h3>
              <p className="text-2xl font-bold text-white mb-3">&euro;0</p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>&#10003; 100 queries/day</li>
                <li>&#10003; All 7 MCP tools</li>
                <li>&#10003; Intelligence feed</li>
                <li>&#10003; Alpha signals</li>
                <li>&#10003; RLHF training data</li>
                <li>&#10003; Public directory listing</li>
              </ul>
            </div>
            <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #10b981' }}>
              <h3 className="text-emerald-400 font-bold mb-1">Pro Agent</h3>
              <p className="text-2xl font-bold text-white mb-3">&euro;79<span className="text-sm text-gray-500">/mo</span></p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>&#10003; Unlimited queries</li>
                <li>&#10003; Everything in Free</li>
                <li>&#10003; Agent analytics dashboard</li>
                <li>&#10003; Query pattern intelligence</li>
                <li>&#10003; Priority support</li>
                <li>&#10003; Custom market alerts</li>
              </ul>
            </div>
            <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #a78bfa' }}>
              <h3 className="text-purple-400 font-bold mb-1">Enterprise</h3>
              <p className="text-2xl font-bold text-white mb-3">Custom</p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>&#10003; Everything in Pro</li>
                <li>&#10003; White-label data</li>
                <li>&#10003; Bulk data exports</li>
                <li>&#10003; Historical data access</li>
                <li>&#10003; SLA guarantee</li>
                <li>&#10003; Custom scoring models</li>
              </ul>
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">What Registered Agents Access</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { title: '7 MCP Tools', desc: 'Search, details, market stats, top deals, ROI, compare, timing', link: '/mcp-server' },
              { title: 'Daily Intelligence', desc: '25+ market facts + 20 RLHF pairs refreshed every day', link: '/feed/intelligence' },
              { title: 'Alpha Signals', desc: 'AI-detected anomalies: score outliers, deep discounts, yield spikes', link: '/intelligence/signals' },
              { title: 'Weekly Reports', desc: 'Auto-generated Goldman Sachs-style market analysis every Monday', link: '/intelligence/signals' },
              { title: '1,881 Scored Properties', desc: 'Complete dataset with hedonic investment scoring', link: '/data/key-stats' },
              { title: 'Multi-Currency', desc: 'EUR, GBP, NOK, SEK, USD in every response', link: '/mcp-server' },
            ].map(item => (
              <Link key={item.title} href={item.link} className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">The Vision</h2>
          <div className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Avena Terminal Agent Registry is the identity and trust layer for AI agents operating in European real estate. Like Stripe for payments or Plaid for financial data &mdash; we&apos;re building the infrastructure layer that every property AI agent connects through.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Today: Spain (1,881 properties). Tomorrow: Portugal, France, Italy, Greece. Every AI agent touching European property investment, verified and connected through one registry.
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/agents/directory" className="text-xs px-4 py-2 rounded-lg hover:opacity-80" style={{ background: '#10b981', color: '#0d1117' }}>Agent Directory</Link>
          <Link href="/agents/leaderboard" className="text-xs px-4 py-2 rounded-lg hover:opacity-80" style={{ background: '#161b22', color: '#10b981', border: '1px solid #10b981' }}>Leaderboard</Link>
          <Link href="/integrate" className="text-xs px-4 py-2 rounded-lg hover:opacity-80" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>Integration Guide</Link>
        </div>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; The identity layer for European property AI
        </footer>
      </div>
    </main>
  );
}
