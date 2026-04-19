import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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

  const steps = [
    { step: '1', title: 'Register', desc: 'POST your agent details to the registry API' },
    { step: '2', title: 'Get Credentials', desc: 'Receive agent_id + api_key + identity token' },
    { step: '3', title: 'Connect', desc: 'Include your agent_id in MCP requests' },
    { step: '4', title: 'Get Intelligence', desc: 'Access data, signals, analytics on your usage' },
  ];

  const accessItems = [
    { title: '7 MCP Tools', desc: 'Search, details, market stats, top deals, ROI, compare, timing', link: '/mcp-server' },
    { title: 'Daily Intelligence', desc: '25+ market facts + 20 RLHF pairs refreshed every day', link: '/feed/intelligence' },
    { title: 'Alpha Signals', desc: 'AI-detected anomalies: score outliers, deep discounts, yield spikes', link: '/intelligence/signals' },
    { title: 'Weekly Reports', desc: 'Auto-generated market analysis every Monday', link: '/intelligence/signals' },
    { title: '1,881 Scored Properties', desc: 'Complete dataset with hedonic investment scoring', link: '/data/key-stats' },
    { title: 'Multi-Currency', desc: 'EUR, GBP, NOK, SEK, USD in every response', link: '/mcp-server' },
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
                Agent Registry
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                The agent registry.
                <br />
                <span className="italic text-gold">Every node</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                The identity layer for AI agents in European real estate. Register your agent, get a verified identity token, access scored property data for 1,881 new builds, market intelligence, and alpha signals. Free tier available.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                How It Works
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Four steps. Zero friction.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {steps.map(s => (
                <div key={s.step} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <span className="font-serif text-3xl font-light text-primary block mb-3">{s.step}</span>
                  <h3 className="font-serif text-lg text-foreground mb-2">{s.title}</h3>
                  <p className="text-xs text-muted-foreground font-light">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Registration */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Register Your Agent
              </span>
            </div>
            <pre className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 mb-4" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}>
              <code>{`curl -X POST https://avenaterminal.com/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_name": "My Property Assistant",
    "developer_name": "Your Name",
    "developer_email": "you@example.com",
    "use_case": "Property investment advisor for British buyers",
    "website": "https://your-app.com"
  }'`}</code>
            </pre>
            <p className="text-sm text-muted-foreground mb-4 font-mono text-[10px] uppercase tracking-[0.22em]">Response</p>
            <pre className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}>
              <code>{`{
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
}`}</code>
            </pre>
          </div>
        </section>

        {/* Using Your Token */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Using Your Identity
              </span>
              <p className="text-sm text-muted-foreground mt-3">Include your agent ID in MCP requests for tracked analytics:</p>
            </div>
            <pre className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}>
              <code>{`{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "headers": {
        "x-avena-agent-id": "avena-agent-a1b2c3d4"
      }
    }
  }
}`}</code>
            </pre>
          </div>
        </section>

        {/* Tiers */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Tiers
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Free to start. <span className="italic text-gold">Scale</span> when ready.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-2">Free</span>
                <p className="font-serif text-4xl font-light text-foreground mb-4">€0</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>✓ 100 queries/day</li>
                  <li>✓ All 7 MCP tools</li>
                  <li>✓ Intelligence feed</li>
                  <li>✓ Alpha signals</li>
                  <li>✓ RLHF training data</li>
                  <li>✓ Public directory listing</li>
                </ul>
              </div>
              <div className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.6)' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary block mb-2">Pro Agent</span>
                <p className="font-serif text-4xl font-light text-foreground mb-4">€79<span className="text-sm text-muted-foreground font-mono">/mo</span></p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>✓ Unlimited queries</li>
                  <li>✓ Everything in Free</li>
                  <li>✓ Agent analytics dashboard</li>
                  <li>✓ Query pattern intelligence</li>
                  <li>✓ Priority support</li>
                  <li>✓ Custom market alerts</li>
                </ul>
              </div>
              <div className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-2">Enterprise</span>
                <p className="font-serif text-4xl font-light text-foreground mb-4">Custom</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>✓ Everything in Pro</li>
                  <li>✓ White-label data</li>
                  <li>✓ Bulk data exports</li>
                  <li>✓ Historical data access</li>
                  <li>✓ SLA guarantee</li>
                  <li>✓ Custom scoring models</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                What Registered Agents Access
              </span>
            </div>
            <div className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {accessItems.map(item => (
                <Link key={item.title} href={item.link} className="p-5 transition-colors hover:text-primary block" style={{ background: 'hsl(var(--av-background))' }}>
                  <h3 className="font-serif text-lg text-foreground mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground font-light">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                The Vision
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground mb-6">
                The <span className="italic text-gold">Plaid</span> of property AI.
              </h2>
              <div className="rounded-sm border p-6 space-y-3 text-sm text-muted-foreground font-light" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p>
                  Avena Terminal Agent Registry is the identity and trust layer for AI agents operating in European real estate. Like Stripe for payments or Plaid for financial data — we&apos;re building the infrastructure layer that every property AI agent connects through.
                </p>
                <p>
                  Today: Spain (1,881 properties). Tomorrow: Portugal, France, Italy, Greece. Every AI agent touching European property investment, verified and connected through one registry.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/agents/directory" className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-background))' }}>
                  Agent Directory →
                </Link>
                <Link href="/agents/leaderboard" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                  Leaderboard
                </Link>
                <Link href="/integrate" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                  Integration Guide
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
