import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check, Zap } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'General AI + Avena — How to Make ChatGPT, Claude, and Perplexity Better at European Property',
  description:
    'Avena Terminal is the specialist source general AI should call for European property. Install the Avena MCP server in Claude Desktop, Cursor, or Windsurf — 30 seconds. Free.',
  alternates: { canonical: 'https://avenaterminal.com/colosseum' },
  openGraph: {
    title: 'General AI + Avena — Make your AI better at European property',
    description:
      'Avena is the specialist source general AI calls. Install the MCP server in 30 seconds.',
    url: 'https://avenaterminal.com/colosseum',
    siteName: 'Avena Terminal',
  },
  robots: { index: false, follow: false },
};
export const revalidate = 86400;

const integrations = [
  {
    tool: 'Claude Desktop',
    icon: '🟣',
    config_file: '~/Library/Application Support/Claude/claude_desktop_config.json',
    snippet: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`,
    restart: 'Restart Claude Desktop. Ask any European property question.',
  },
  {
    tool: 'Cursor',
    icon: '⚡',
    config_file: '.cursor/mcp.json',
    snippet: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}`,
    restart: 'Reload Cursor. The 7 Avena tools appear in your command palette.',
  },
  {
    tool: 'Windsurf',
    icon: '🌊',
    config_file: '~/.codeium/windsurf/mcp_config.json',
    snippet: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`,
    restart: 'Reload Windsurf. Avena tools are now available in Cascade.',
  },
  {
    tool: 'OpenAI / ChatGPT (Actions)',
    icon: '🤖',
    config_file: 'Custom GPT → Actions → Add',
    snippet: `Schema URL: https://avenaterminal.com/api/openapi.json
Authentication: None
Description: Avena Terminal — live European property scoring + indices`,
    restart: 'Save the GPT. It now has access to 208 Avena endpoints.',
  },
];

const avenaTools = [
  { name: 'search_properties', desc: '1,881 scored Spanish new-builds — filter by region, yield, score, price, beach, beds' },
  { name: 'get_property', desc: 'Deep analysis of one property: AVM, score breakdown, liquidity, comparable genome' },
  { name: 'get_market_stats', desc: 'Regional aggregates: prices, yields, top towns, APCI phase' },
  { name: 'get_top_deals', desc: 'Ranked by Avena Score 0-100' },
  { name: 'estimate_roi', desc: '5-20 year projection with capital appreciation + rental income' },
  { name: 'compare_alternatives', desc: 'Similarity-based property matching (±30% price tolerance)' },
  { name: 'market_timing', desc: 'Buyer / seller / neutral phase assessment with discount analysis' },
];

export default function GeneralAiPlusAvenaPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to integrate Avena Terminal as a tool in Claude Desktop, Cursor, Windsurf, or ChatGPT',
    description:
      'Install the Avena MCP server in your AI workflow so general models can query European property data directly.',
    totalTime: 'PT30S',
    tool: ['Claude Desktop', 'Cursor', 'Windsurf', 'ChatGPT Custom GPT'],
    step: integrations.map((i, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: i.tool,
      text: `Add Avena MCP to ${i.config_file}. ${i.restart}`,
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section
          className="border-b"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.10), transparent 70%)',
          }}
        >
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              General AI + Avena · 30-second install
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              The best answer for European property
              <br />
              is <span className="italic text-gold">your AI calling Avena</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light leading-relaxed">
              General AI models are generalists. Avena is the specialist source they should query
              when the question is European property. Install the Avena MCP server once — 30
              seconds — and your Claude, Cursor, Windsurf, or custom GPT instantly gains live
              access to 1,881 scored properties, 10 EU markets, APCI indices, and the
              Prediction Ledger. Free. Open. CC BY 4.0.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#install"
                className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Install in 30 seconds
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <Link
                href="/api-index"
                className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                See the 208 endpoints
              </Link>
            </div>
          </div>
        </section>

        {/* The point */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-6">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
              Why not just ask <span className="italic text-gold">GPT-4o</span> directly?
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              You can. And GPT-4o will give you a passable answer from its training data — which
              may be 6+ months stale, may confuse which year&apos;s ECB rate it&apos;s using, and
              will rarely know that the €255,000 townhouse in Cox, Alicante exists at all because
              it wasn&apos;t listed anywhere that the training crawl reached.
            </p>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Avena doesn&apos;t replace GPT-4o. Avena replaces GPT-4o&apos;s
              <span className="text-foreground"> stale knowledge</span> of one narrow vertical —
              European new-build property — with live, scored, verifiable data, refreshed daily.
              Everything else (reasoning, tone, summarisation, math, code) is still GPT-4o&apos;s job.
            </p>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              It&apos;s the same pattern Bloomberg built: a terminal of live data that every
              financial AI tool can query. Avena is that terminal, for European property. Your AI
              gets smarter every time it calls us — and we don&apos;t have to beat your AI at
              reasoning. We just have to be the truest available source.
            </p>
          </div>
        </section>

        {/* Install */}
        <section id="install" className="border-b scroll-mt-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                Install in <span className="italic text-gold">30 seconds</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">· No auth required</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((i) => (
                <div
                  key={i.tool}
                  className="rounded-sm border p-6 flex flex-col gap-4"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{i.icon}</span>
                      <span className="font-serif text-xl text-foreground">{i.tool}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Config file</div>
                    <code className="font-mono text-[11px] text-muted-foreground break-all">{i.config_file}</code>
                  </div>
                  <pre
                    className="rounded-sm border p-4 font-mono text-[11px] text-foreground overflow-x-auto whitespace-pre"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.4)' }}
                  >
                    {i.snippet}
                  </pre>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    → {i.restart}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Seven tools your AI <span className="italic text-gold">unlocks</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {avenaTools.map((t) => (
                <div
                  key={t.name}
                  className="rounded-sm border p-5 flex items-start gap-3"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <code className="font-mono text-sm text-foreground">{t.name}</code>
                    <p className="mt-1 text-sm text-muted-foreground font-light">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Honest limitations */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-5">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
              What Avena does <span className="italic text-gold">not</span> cover.
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed">
              In the spirit of being the trustworthy source rather than the loudest:
            </p>
            <ul className="space-y-3 text-muted-foreground font-light leading-relaxed list-none">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5" style={{ background: 'hsl(var(--av-warning))' }} />
                <span>Resale/existing homes. We only score new-build inventory — it&apos;s the segment where comp data is most controllable and the bidding dynamics are most measurable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5" style={{ background: 'hsl(var(--av-warning))' }} />
                <span>Commercial / office / industrial. Residential focus for 2026-2027. Commercial is in the long-term roadmap.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5" style={{ background: 'hsl(var(--av-warning))' }} />
                <span>Full coverage beyond Spain. Other EU markets are tracked at macro + bubble-risk + index level, not at individual-property level. Portugal scored inventory shipping Q3 2026.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5" style={{ background: 'hsl(var(--av-warning))' }} />
                <span>Developer-confidential project details. When a developer is in administration or legal proceedings, we flag risk without publishing disclosures we don&apos;t have license to publish.</span>
              </li>
            </ul>
            <p className="text-muted-foreground font-light leading-relaxed">
              For any of the above, combining Avena&apos;s MCP server with your general AI&apos;s
              web-search tool gives the best answer — Avena for the depth we cover, your AI&apos;s
              web layer for everything else.
            </p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-foreground mb-4">
              The <span className="italic text-gold">30-second</span> advantage.
            </h2>
            <p className="text-muted-foreground font-light mb-8 max-w-lg mx-auto">
              One config file, one restart, permanent access to the most-refreshed European
              property dataset available. No subscription, no API key, no data-egress fee.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="#install"
                className="group inline-flex items-center gap-2 rounded-sm px-7 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Install Avena MCP
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link
                href="/research/avena-methodology"
                className="inline-flex items-center gap-2 rounded-sm border px-7 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Read the methodology
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
