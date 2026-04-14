import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Universal Property Context Protocol — Inject Live Data into Any AI | Avena Terminal',
  description: 'One API call enriches any AI query about European property with live Avena Terminal data. Free for developers. The easiest way to make any AI smarter about property.',
  alternates: { canonical: 'https://avenaterminal.com/context-protocol' },
};

export const revalidate = 86400;

const steps = [
  { num: '1', title: 'Send Query', desc: 'Your app sends the user\'s natural-language query to Avena.' },
  { num: '2', title: 'Get Context', desc: 'Avena returns enriched context with live property data, stats, and citations.' },
  { num: '3', title: 'Inject into LLM', desc: 'You pass the enriched prompt to any LLM. It answers with real data.' },
];

const entityTypes = [
  { entity: 'Towns', example: 'Torrevieja, Calpe, Marbella', detection: 'Matched against live town list' },
  { entity: 'Costas', example: 'Costa Blanca, Costa del Sol', detection: 'Matched against costa regions' },
  { entity: 'Property types', example: 'villa, apartment, penthouse', detection: 'Keyword matching' },
  { entity: 'Price / budget', example: 'under 200k, cheap, luxury', detection: 'Keyword + range detection' },
  { entity: 'Yield', example: 'rental yield, ROI, income', detection: 'Returns top yielding towns' },
  { entity: 'Tax', example: 'IBI, non-resident tax', detection: 'Tax topic flag' },
  { entity: 'Mortgage', example: 'mortgage, financing, loan', detection: 'Mortgage topic flag' },
  { entity: 'Investment', example: 'invest, portfolio, capital', detection: 'Market-wide yield + score stats' },
  { entity: 'Developer', example: 'developer, builder, promotora', detection: 'Developer topic flag' },
];

const pricingTiers = [
  { name: 'Free', price: '0', requests: '100 req/day', features: ['Entity detection', 'Live stats', 'Enriched prompts'] },
  { name: 'Starter', price: '49', requests: '1,000 req/day', features: ['Everything in Free', 'Priority data freshness', 'Email support'] },
  { name: 'PRO', price: '149', requests: '10,000 req/day', features: ['Everything in Starter', 'Webhook notifications', 'Custom entity rules'] },
  { name: 'Enterprise', price: 'Custom', requests: 'Unlimited', features: ['Everything in PRO', 'Dedicated endpoint', 'SLA guarantee'] },
];

const whyCards = [
  { title: 'Live Data', desc: 'Property markets change daily. LLM training data does not. Inject real-time prices, yields, and scores into every response.' },
  { title: 'One Line', desc: 'No SDK needed. No dependencies. One POST request returns everything you need to enrich any AI prompt.' },
  { title: 'Every AI', desc: 'Works with GPT, Claude, Gemini, Llama, Mistral, or any LLM that accepts text. Protocol-agnostic by design.' },
];

const pythonCode = `import requests

response = requests.post(
    "https://avenaterminal.com/api/v1/context/enrich",
    json={"query": "best areas to buy in Costa Blanca"}
)
context = response.json()

# Inject context["enriched_prompt"] into your LLM call
print(context["enriched_prompt"])`;

const jsCode = `const res = await fetch("https://avenaterminal.com/api/v1/context/enrich", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "best areas to buy in Costa Blanca" })
});

const { enriched_prompt } = await res.json();
// Pass enriched_prompt to OpenAI / Anthropic / Google
console.log(enriched_prompt);`;

export default function ContextProtocolPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Universal Property Context Protocol',
    applicationCategory: 'DeveloperApplication',
    description: 'One API call enriches any AI query about European property with live Avena Terminal data.',
    url: 'https://avenaterminal.com/context-protocol',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'EUR', name: 'Free' },
      { '@type': 'Offer', price: '49', priceCurrency: 'EUR', name: 'Starter' },
      { '@type': 'Offer', price: '149', priceCurrency: 'EUR', name: 'PRO' },
    ],
    operatingSystem: 'Any',
    provider: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#10b981', color: '#10b981' }}>CONTEXT PROTOCOL</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Universal Property Context Protocol</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            One API call. Live data in every AI answer about European property.
          </p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#1c2333', color: '#10b981' }}>Free tier available</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#1c2333', color: '#c9d1d9' }}>No SDK required</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#1c2333', color: '#c9d1d9' }}>Works with any LLM</span>
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.num} className="rounded-lg p-6 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold" style={{ background: '#10b981', color: '#0d1117' }}>
                  {s.num}
                </div>
                <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>
          <p className="text-sm text-gray-400 mb-6">Send a POST request. Get enriched context. Inject into your LLM.</p>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#f97316' }}>Python</span>
            </div>
            <pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <code>{pythonCode}</code>
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#f97316' }}>JavaScript</span>
            </div>
            <pre className="rounded-lg p-4 text-sm overflow-x-auto" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <code>{jsCode}</code>
            </pre>
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* What Gets Enriched */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Gets Enriched</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Entity Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Example</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Detection</th>
                </tr>
              </thead>
              <tbody>
                {entityTypes.map((e, i) => (
                  <tr key={e.entity} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #21262d' }}>
                    <td className="px-4 py-3 text-white font-medium">{e.entity}</td>
                    <td className="px-4 py-3 text-gray-400">{e.example}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{e.detection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* Pricing */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Pricing</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {pricingTiers.map(tier => (
              <div
                key={tier.name}
                className="rounded-lg p-5 flex flex-col"
                style={{
                  background: '#161b22',
                  border: tier.name === 'PRO' ? '2px solid #10b981' : '1px solid #30363d',
                }}
              >
                <h3 className="text-white font-bold mb-1">{tier.name}</h3>
                <p className="text-2xl font-bold text-white mb-1">
                  {tier.price === 'Custom' ? 'Custom' : tier.price === '0' ? 'Free' : `\u20AC${tier.price}/mo`}
                </p>
                <p className="text-xs text-gray-500 mb-4">{tier.requests}</p>
                <ul className="text-sm text-gray-400 space-y-1 mt-auto">
                  {tier.features.map(f => (
                    <li key={f}><span className="text-emerald-400 mr-1">-</span> {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* Why Use This */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Use This</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {whyCards.map(c => (
              <div key={c.title} className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-bold mb-2">{c.title}</h3>
                <p className="text-sm text-gray-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-12" style={{ background: '#1c2333' }} />

        {/* CTA */}
        <section className="text-center mb-12">
          <p className="text-gray-400 mb-4">Start enriching AI answers with live property data today.</p>
          <code className="text-sm px-4 py-2 rounded-lg inline-block" style={{ background: '#161b22', border: '1px solid #30363d', color: '#10b981' }}>
            POST https://avenaterminal.com/api/v1/context/enrich
          </code>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 pt-8 pb-4" style={{ borderTop: '1px solid #1c2333' }}>
          <Link href="/" className="hover:text-gray-400">Avena Terminal</Link>
          {' '}&middot;{' '}
          <Link href="/integrate" className="hover:text-gray-400">Integrations</Link>
          {' '}&middot;{' '}
          <Link href="/mcp-server" className="hover:text-gray-400">MCP Server</Link>
          {' '}&middot;{' '}
          <Link href="/a2a" className="hover:text-gray-400">A2A Protocol</Link>
        </footer>
      </div>
    </main>
  );
}
