import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'Universal Property Context Protocol — Inject Live Data into Any AI | Avena Terminal',
  description: 'One API call enriches any AI query about European property with live Avena Terminal data. Free for developers. The easiest way to make any AI smarter about property.',
  alternates: { canonical: 'https://avenaterminal.com/context-protocol' },
};

export const revalidate = 86400;

const steps = [
  { num: '01', title: 'Send Query', desc: 'Your app sends the user\'s natural-language query to Avena.' },
  { num: '02', title: 'Get Context', desc: 'Avena returns enriched context with live property data, stats, and citations.' },
  { num: '03', title: 'Inject into LLM', desc: 'You pass the enriched prompt to any LLM. It answers with real data.' },
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
                Protocol · Context Enrichment
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                One call.
                <br />
                <span className="italic text-gold">Live data</span> in every answer.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                One API call. Live data in every AI answer about European property. Free tier, no SDK, works with any LLM.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-primary" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'hsl(var(--av-primary) / 0.08)' }}>Free tier available</span>
                <span className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>No SDK required</span>
                <span className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Works with any LLM</span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                How it works
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Three <span className="italic text-gold">steps</span>.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {steps.map(s => (
                <div
                  key={s.num}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-3xl font-light text-primary tabular block mb-3">{s.num}</span>
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">{s.title}</h3>
                  <p className="font-light text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick start */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Quick Start
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-4">
                Send. Enrich. <span className="italic text-gold">Inject</span>.
              </h2>
              <p className="font-light text-base text-muted-foreground">
                Send a POST request. Get enriched context. Inject into your LLM.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Python</span>
                </div>
                <pre
                  className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90"
                  style={{
                    background: 'hsl(var(--av-background))',
                    border: '1px solid hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <code>{pythonCode}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">JavaScript</span>
                </div>
                <pre
                  className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90"
                  style={{
                    background: 'hsl(var(--av-background))',
                    border: '1px solid hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <code>{jsCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* What gets enriched */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Entity Detection
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                What gets <span className="italic text-gold">enriched</span>.
              </h2>
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
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Entity Type</th>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Example</th>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b hidden md:table-cell" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Detection</th>
                  </tr>
                </thead>
                <tbody>
                  {entityTypes.map((e) => (
                    <tr key={e.entity} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 font-serif text-base text-foreground">{e.entity}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{e.example}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs hidden md:table-cell">{e.detection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Pricing
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Four <span className="italic text-gold">tiers</span>.
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {pricingTiers.map(tier => (
                <div
                  key={tier.name}
                  className="rounded-sm border p-6 flex flex-col"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: tier.name === 'PRO' ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-2">
                    {tier.name}
                  </span>
                  <div className="font-serif text-4xl font-light tracking-tight text-foreground tabular mb-1">
                    {tier.price === 'Custom' ? 'Custom' : tier.price === '0' ? 'Free' : `€${tier.price}`}
                    {tier.price !== 'Custom' && tier.price !== '0' && (
                      <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground ml-1">/mo</span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-5">{tier.requests}</p>
                  <ul className="space-y-2 mt-auto">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 font-light text-sm text-foreground/80">
                        <span className="text-primary mt-0.5 shrink-0">&mdash;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why use this */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Why use this
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Three <span className="italic text-gold">reasons</span>.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {whyCards.map(c => (
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

        {/* CTA */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <p className="font-light text-base text-muted-foreground mb-6">
              Start enriching AI answers with live property data today.
            </p>
            <code
              className="inline-block rounded-sm px-6 py-4 font-mono text-sm text-primary"
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              POST https://avenaterminal.com/api/v1/context/enrich
            </code>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
