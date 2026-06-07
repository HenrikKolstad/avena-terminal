/**
 * /api — developer canonical surface (Great Consolidation 2026-05-29).
 *
 * Absorbs: /docs, /docs/api, /docs/mcp, /docs/webhooks, /install,
 * /mcp-server, /webhooks, /cli, /dev, /developer, /products,
 * /products/bank-stress-api, /products/property-oracle,
 * /products/csrd-disclosure, /products/derivative-pricing.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'API · Avena Terminal · REST · MCP · webhooks · OpenAPI 3.1',
  description: 'REST API, MCP server, webhooks, SDKs. One key, four institutional use cases (Bank Stress, Property Oracle, CSRD Disclosure, Derivative Pricing). OpenAPI 3.1, CC BY 4.0, DOI-anchored.',
  alternates: { canonical: 'https://avenaterminal.com/api' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebAPI',
  name: 'Avena Terminal API',
  description: 'European residential property data API. REST, MCP, webhooks, OpenAPI 3.1.',
  url: 'https://avenaterminal.com/api',
  documentation: 'https://avenaterminal.com/api#docs',
  termsOfService: 'https://avenaterminal.com/terms',
};

const USE_CASES = [
  { id: 'bank-stress',     title: 'Bank Stress Testing',  buyers: 'Credit insurers · Tier-1 banks · ECB-supervised SIs', endpoint: '/api/v1/mortgage-stress', body: 'Portfolio in, AVM + regime + stress projection out. Backstops EBA AVM consultation requirements.' },
  { id: 'property-oracle', title: 'Property Oracle for DeFi RWA', buyers: 'Centrifuge · Goldfinch · Maple · Aave RWA',     endpoint: '/api/v1/oracle/*',           body: 'Verified property pricing for on-chain real-world-asset protocols. Signed integrity envelope.' },
  { id: 'csrd-disclosure', title: 'CSRD-Compliant Disclosure', buyers: 'Asset managers under CSRD Article 8',           endpoint: '/api/v1/explainable-avm', body: 'Machine-readable disclosure with methodology version + confidence intervals.' },
  { id: 'derivative-pricing', title: 'Derivative Pricing', buyers: 'Family offices · Structured product desks · RMBS',  endpoint: '/api/v1/options-pricing',    body: 'APCI-anchored derivative pricing for residential property instruments.' },
];

export default function APIPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            REST · MCP · webhooks · OpenAPI 3.1 · CC BY 4.0
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            One key. Four institutional use cases.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            REST API across every Avena surface — methodology, AVM, regulatory radar, identifier registry, event store. MCP server distributes the same endpoints into Claude / Cursor / ChatGPT / Perplexity. OpenAPI 3.1, CC BY 4.0, DOI-anchored.
          </p>
        </section>

        {/* Quick-jump anchors */}
        <div className="sticky top-16 z-30 backdrop-blur-md border-b" style={{ background: 'hsl(var(--av-background) / 0.85)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-2.5 sm:py-3 overflow-x-auto">
            <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">
              <a href="#use-cases" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Use cases</a>
              <a href="#docs" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Docs</a>
              <a href="#mcp" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>MCP</a>
              <a href="#webhooks" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Webhooks</a>
              <a href="#cli" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>CLI</a>
              <a href="#sdk" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>SDK</a>
              <a href="#embed" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Embed</a>
              <a href="#dataset" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Dataset</a>
              <a href="#pricing" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Pricing</a>
            </div>
          </div>
        </div>

        {/* Use cases (formerly /products/*) */}
        <section id="use-cases" className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Four institutional use cases · same endpoints</div>
          <h2 className="font-serif text-3xl font-light text-foreground mb-6">Built on one methodology.</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {USE_CASES.map(uc => (
              <div key={uc.id} className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">{uc.id}</div>
                <h3 className="font-serif text-xl font-light text-foreground mb-2">{uc.title}</h3>
                <div className="font-mono text-[10px] text-muted-foreground mb-2">{uc.buyers}</div>
                <p className="text-sm text-foreground/85 leading-relaxed mb-3">{uc.body}</p>
                <code className="block font-mono text-[11px] text-primary">{uc.endpoint}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Docs */}
        <Section id="docs" title="Documentation">
          <p className="mb-4">OpenAPI 3.1 specification for every public Avena endpoint. Curl-able. Try every endpoint with a single API key.</p>
          <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            <a href="/api/openapi.json" className="text-primary hover:text-foreground">OpenAPI 3.1 spec →</a>
            <a href="/api/v1/openapi.json" className="text-primary hover:text-foreground">v1 spec →</a>
          </div>
        </Section>

        {/* MCP */}
        <Section id="mcp" title="MCP server">
          <p className="mb-4">Plug Avena into Claude Desktop, Cursor, ChatGPT, Perplexity Pro. The same API endpoints, exposed via Model Context Protocol. One JSON paste; the MCP client picks up every method.</p>
          <pre className="rounded-sm border p-4 font-mono text-[11px] overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-background))' }}>
{`{ "mcpServers": {
    "avena": { "url": "https://avenaterminal.com/mcp" }
  } }`}
          </pre>
        </Section>

        <Section id="webhooks" title="Webhooks">
          <p>Subscribe to property score changes, regime classifications, Counterpart grade revisions, regulatory signals. HMAC-signed, replay-safe, idempotent.</p>
        </Section>

        <Section id="cli" title="CLI">
          <p>Avena CLI lets institutional ops teams query the API directly from terminal — bulk imports, watchlist sync, scheduled reports.</p>
        </Section>

        <Section id="sdk" title="SDKs">
          <p>TypeScript and Python SDKs wrap the REST API with full typing. LangChain tool integration for agentic workflows.</p>
        </Section>

        <Section id="embed" title="Embed widgets">
          <p>Score badges, regime stamps, deal-of-the-day tickers, yield curves. Drop into any page with a one-line iframe.</p>
        </Section>

        <Section id="dataset" title="Open dataset">
          <p>Full Avena dataset under CC BY 4.0, anchored at DOI 10.5281/zenodo.19520064. Daily refresh, parquet + JSONL + CSV.</p>
          <Link href="/dataset" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Download dataset →</Link>
        </Section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Pricing</div>
          <div className="grid md:grid-cols-4 gap-4">
            <Tier name="Free"          price="€0 / mo"     reqs="100 / day"    cta="Get API key" href="/login" />
            <Tier name="Starter"       price="€49 / mo"    reqs="1,000 / day"  cta="Subscribe"   href="/pro" />
            <Tier name="PRO"           price="€149 / mo"   reqs="10,000 / day" cta="Subscribe"   href="/pro" />
            <Tier name="Institutional" price="Custom"      reqs="Unlimited"    cta="Contact"     href="/contact" highlight />
          </div>
          <p className="mt-4 text-sm text-muted-foreground italic">Free designated-authority tier for ECB, EBA, ESMA, EIOPA, ESRB, national CBs, IMF, BIS, OECD. <Link href="/eu-presidency" className="text-primary hover:underline">Presidency partnership →</Link></p>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 scroll-mt-32 pt-8 sm:pt-10">
      <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-4 tracking-tight">{title}</h2>
      <div className="text-base text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}

function Tier({ name, price, reqs, cta, href, highlight }: { name: string; price: string; reqs: string; cta: string; href: string; highlight?: boolean }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: highlight ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)', background: highlight ? 'hsl(var(--av-primary) / 0.05)' : 'transparent' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground mb-2">{name}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular mb-1">{price}</div>
      <div className="font-mono text-[10px] text-muted-foreground mb-3">{reqs}</div>
      <Link href={href} className="block text-center rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))', color: highlight ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}>
        {cta}
      </Link>
    </div>
  );
}
