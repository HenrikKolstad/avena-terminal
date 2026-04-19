'use client';

import { useState } from 'react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';

export default function SDKPage() {
  const [tab, setTab] = useState<'python' | 'javascript'>('python');
  const [email, setEmail] = useState('');
  const [sdk, setSdk] = useState<'python' | 'javascript'>('python');
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) return;
    try { await fetch('/api/sdk-waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, sdk }) }); } catch {}
    setSubmitted(true);
  };

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Avena Terminal SDK</h1>
        <p className="text-gray-400 text-sm mb-8">Use Avena&apos;s property intelligence in your own apps. Python and JavaScript packages coming soon.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('python')} className={`px-4 py-2 rounded-lg text-sm font-mono ${tab === 'python' ? 'text-black' : 'text-gray-400'}`} style={{ background: tab === 'python' ? '#10b981' : '#161b22', border: '1px solid #30363d' }}>Python</button>
          <button onClick={() => setTab('javascript')} className={`px-4 py-2 rounded-lg text-sm font-mono ${tab === 'javascript' ? 'text-black' : 'text-gray-400'}`} style={{ background: tab === 'javascript' ? '#fbbf24' : '#161b22', border: '1px solid #30363d' }}>JavaScript</button>
        </div>

        {tab === 'python' && (
          <div className="space-y-4 mb-10">
            <div className="rounded-lg p-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <span className="text-gray-500"># Install</span><br />
              <span className="text-emerald-400">pip install</span> <span className="text-white">avena-terminal</span>
            </div>
            <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <pre className="text-gray-300">{`from avena import AvenaClient

client = AvenaClient()

# Search properties
results = client.search(
    region="cb-south",
    max_price=300000,
    min_score=65
)
for prop in results:
    print(f"{prop.name} — €{prop.price:,} — Score {prop.score}")

# Get market data
market = client.market.summary(region="costa-blanca")
print(f"Avg yield: {market.avg_yield}%")
print(f"Properties above 70: {market.above_70}")

# Ask the LLM
answer = client.llm.ask(
    "Is now a good time to buy in Costa Blanca?"
)
print(answer)

# Get alpha signals
signals = client.intelligence.signals(severity="high")
for signal in signals:
    print(f"[{signal.severity}] {signal.headline}")

# Estimate ROI
roi = client.roi.estimate(ref="AP1-CB-12345", years=5)
print(f"Projected ROI: {roi.total_roi}%")`}</pre>
            </div>
          </div>
        )}

        {tab === 'javascript' && (
          <div className="space-y-4 mb-10">
            <div className="rounded-lg p-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <span className="text-gray-500">// Install</span><br />
              <span className="text-fbbf24">npm install</span> <span className="text-white">avena-terminal</span>
            </div>
            <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <pre className="text-gray-300">{`import { AvenaClient } from 'avena-terminal'

const client = new AvenaClient()

// Search properties
const results = await client.search({
  region: 'cb-south',
  maxPrice: 300000,
  minScore: 65
})
results.forEach(p => console.log(\`\${p.name} — €\${p.price} — Score \${p.score}\`))

// Get market data
const market = await client.market.summary({ region: 'costa-blanca' })
console.log(\`Avg yield: \${market.avgYield}%\`)

// Ask the LLM
const answer = await client.llm.ask(
  'Best value properties in Torrevieja?'
)
console.log(answer)

// Get alpha signals
const signals = await client.intelligence.signals({ severity: 'high' })

// Compare regions
const comparison = await client.compare('costa-blanca', 'costa-del-sol')`}</pre>
            </div>
          </div>
        )}

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Waitlist */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Join the Waitlist</h2>
          {!submitted ? (
            <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <p className="text-sm text-gray-400 mb-4">Get early access when the SDK launches.</p>
              <div className="flex flex-col md:flex-row gap-2">
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-gray-600" />
                <select value={sdk} onChange={e => setSdk(e.target.value as 'python' | 'javascript')} className="bg-[#0d1117] border border-[#1c2333] rounded-lg px-4 py-3 text-white text-sm">
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <button onClick={submit} className="px-5 py-3 rounded-lg font-bold text-sm flex-shrink-0" style={{ background: '#10b981', color: '#0d1117' }}>Join Waitlist</button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-5 text-center" style={{ background: '#161b22', border: '1px solid #10b981' }}>
              <p className="text-emerald-400 font-bold">You&apos;re on the list!</p>
              <p className="text-xs text-gray-500 mt-1">We&apos;ll email you when the {sdk === 'python' ? 'Python' : 'JavaScript'} SDK launches.</p>
            </div>
          )}
        </section>

        {/* Currently Available */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Available Now</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/mcp-server" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Server</h3>
              <p className="text-[10px] text-gray-500">7 tools for Claude, Cursor, Windsurf</p>
            </Link>
            <Link href="/integrate" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Integration Guide</h3>
              <p className="text-[10px] text-gray-500">Copy-paste configs for 8 platforms</p>
            </Link>
            <Link href="/langchain-tool" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">LangChain Tool</h3>
              <p className="text-[10px] text-gray-500">Python integration via MCP adapter</p>
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Property intelligence for every developer
        </footer>
      </div>
          </main>
      <Footer />
    </div>
  );
}
