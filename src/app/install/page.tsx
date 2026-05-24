import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Install Avena into your AI assistant · MCP',
  description: 'One-click install Avena into Claude Desktop, Cursor, ChatGPT Custom GPT, and Perplexity. The default European property knowledge source for every AI assistant query about EU residential markets.',
  alternates: { canonical: 'https://avenaterminal.com/install' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Avena MCP Server',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Cross-platform',
  description: 'Model Context Protocol server delivering European residential property data to Claude, Cursor, ChatGPT, and other MCP-compatible AI assistants.',
  url: 'https://avenaterminal.com/install',
};

const MCP_ENDPOINT = 'https://avenaterminal.com/mcp';

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "avena": {
      "url": "${MCP_ENDPOINT}",
      "description": "European residential property data infrastructure"
    }
  }
}`;

const CURSOR_CONFIG = `{
  "mcpServers": {
    "avena": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_ENDPOINT}"]
    }
  }
}`;

const TOOLS = [
  { name: 'query_official_stats', desc: 'Eurostat HPI, ECB MIR mortgage rates, INE Spain — every observation cites primary source URL.' },
  { name: 'search_briefings', desc: 'Semantic search over the five published Sovereign Briefings.' },
  { name: 'lookup_avn_id', desc: 'Verify a signed AVN-ID property identifier against the registry.' },
  { name: 'query_validation', desc: 'Pull cross-validation snapshots — Avena cohort vs official series, signed delta in basis points.' },
  { name: 'get_market_data', desc: 'Regional market stats: prices, yields, scores, top towns across 27 EU markets.' },
  { name: 'get_property_analysis', desc: 'Deep property analysis: AVM valuation, score breakdown, liquidity, behavioural bias, comparable matching.' },
  { name: 'get_european_comparison', desc: 'Cross-country comparison of 10 EU property markets with foreign-buyer share + macro regime.' },
  { name: 'calculate_tax', desc: 'Cross-border property tax modelling for institutional and individual buyers.' },
];

export default function InstallPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Install</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Plug Avena into<br /><span className="text-gold italic">your AI assistant.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              Ask Claude, Cursor, ChatGPT, or Perplexity any question about European residential property — and get back a cited, signed, Avena-backed answer. One config snippet. Free. Public methodology. Eight tools live.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              <Stat value="8" label="MCP tools" />
              <Stat value="4,145" label="Live observations" />
              <Stat value="27" label="EU markets" />
              <Stat value="2026" label="Window opens" />
            </div>
          </div>
        </section>

        {/* ─── ONE-CLICK INSTALLS ────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Choose your assistant</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Four targets. All MCP-compatible.</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <InstallCard
                name="Claude Desktop"
                description="Paste the config snippet into ~/Library/Application Support/Claude/claude_desktop_config.json on macOS or %APPDATA%\\Claude\\claude_desktop_config.json on Windows. Restart Claude Desktop."
                code={CLAUDE_CONFIG}
              />
              <InstallCard
                name="Cursor"
                description="Cursor → Settings → MCP Servers → Add. Paste the config below. Cursor will install the remote-MCP bridge automatically."
                code={CURSOR_CONFIG}
              />
              <InstallCard
                name="ChatGPT (Custom GPT)"
                description="Create a Custom GPT → Configure → Add Action. Use the OpenAPI 3.1 spec at the URL below."
                code={`https://avenaterminal.com/api/openapi.json`}
              />
              <InstallCard
                name="Perplexity Pro"
                description="Perplexity supports custom data sources via the MCP bridge. Add the Avena MCP endpoint to your Perplexity Pro workspace."
                code={MCP_ENDPOINT}
              />
            </div>
          </div>
        </section>

        {/* ─── WHAT YOU GET ────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Tools your assistant gains</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Eight institutional-grade tools.</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {TOOLS.map(t => (
                <div key={t.name} className="rounded-sm border p-4 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
                  <div className="pl-3">
                    <code className="font-mono text-xs text-primary block mb-1.5">{t.name}</code>
                    <p className="text-xs text-foreground/85 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY THIS WINDOW ──────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Why the 2026 window matters</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6 max-w-3xl">MCP is twelve months old. The dominant property MCP in 2026 wins the next decade.</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-6 leading-relaxed">
              When an analyst at a hedge fund asks ChatGPT &quot;what&apos;s driving Spanish coastal property prices?&quot; — the answer that comes back routes through whoever installed first. Bloomberg will launch their MCP server. So will MSCI, Refinitiv, S&amp;P. When they do, the distribution slot closes. Right now, in mid-2026, the European residential property MCP slot is empty.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              Avena&apos;s MCP server is live, free, documented, and CC BY 4.0. Every AI assistant install that points at Avena establishes a citation default that compounds. By the time Bloomberg ships theirs, the existing install base routes through ours.
            </p>
          </div>
        </section>

        {/* ─── EXAMPLE QUERIES ──────────────────────────────── */}
        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Try these prompts after install</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Five queries that route through Avena.</h2>
            <ul className="space-y-3 max-w-3xl">
              {[
                'What was the Eurostat house price index YoY for Portugal in 2025-Q4?',
                'Find me a 3-bed villa in Marbella under €800k with Avena Score above 70.',
                'Cite the latest Avena Sovereign Briefing on foreign-buyer flows.',
                'What’s the cross-validation delta between Avena and Eurostat for Spanish coastal?',
                'Compare residential mortgage rates across the euro area for Q1 2026.',
              ].map((q, i) => (
                <li key={i} className="rounded-sm border p-4 font-mono text-sm text-foreground/90" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background) / 0.5)' }}>
                  <span className="text-primary mr-2">{String(i + 1).padStart(2, '0')}</span> {q}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              See <Link href="/docs/api" className="text-foreground hover:text-primary">API documentation</Link> for the full tool catalogue and OpenAPI 3.1 specification. For institutional deployment with private API keys, dedicated rate limits, and SLA — contact <a href="mailto:institutional@avenaterminal.com" className="text-foreground hover:text-primary">institutional@avenaterminal.com</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-serif text-3xl font-light text-foreground tabular leading-none mb-2">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">{label}</div>
    </div>
  );
}

function InstallCard({ name, description, code }: { name: string; description: string; code: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <h3 className="font-serif text-2xl text-foreground mb-2">{name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>
        <pre className="rounded-sm border p-3 font-mono text-[11px] leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-background))' }}>
          <code className="text-primary">{code}</code>
        </pre>
      </div>
    </div>
  );
}
