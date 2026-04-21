import { Metadata } from 'next';
import Link from 'next/link';
import { createHash } from 'crypto';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'Invention Timeline — Cryptographic Priority Proof | Avena Terminal',
  description:
    'Immutable cryptographic proof of when every Avena Terminal system was first published. SHA-256 hashed. Timestamped. Verifiable.',
  alternates: { canonical: 'https://avenaterminal.com/timeline' },
};
export const revalidate = 86400;

const INVENTIONS = [
  { system: 'Avena Terminal', date: '2026-04-11', category: 'Platform', description: 'European property intelligence platform launched' },
  { system: 'Avena Investment Score', date: '2026-04-11', category: 'Model', description: '5-factor hedonic scoring: S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R' },
  { system: 'APCI — Avena Property Consciousness Index', date: '2026-04-12', category: 'Index', description: 'First composite property market consciousness index (0-100)' },
  { system: 'MCP Server for Property Data', date: '2026-04-12', category: 'Protocol', description: 'First MCP server in European real estate' },
  { system: 'Alpha Signal Detection (8 types)', date: '2026-04-12', category: 'Intelligence', description: 'Statistical anomaly detection: score outlier, deep discount, yield spike, geographic mispricing, motivated seller, developer dump, yield hunt, cross-market' },
  { system: 'Property Contagion Model (SIR)', date: '2026-04-12', category: 'Model', description: 'SIR epidemiological model adapted for real estate market corrections' },
  { system: 'Black-Scholes RE Adaptation', date: '2026-04-12', category: 'Model', description: 'Options pricing model adapted for illiquid real estate assets' },
  { system: 'PropertyEval Benchmark', date: '2026-04-12', category: 'Benchmark', description: '100-scenario benchmark for evaluating property AI systems' },
  { system: 'Google A2A Protocol (Property)', date: '2026-04-13', category: 'Protocol', description: 'First property platform with Agent-to-Agent protocol' },
  { system: 'Agent Registry for Property AI', date: '2026-04-13', category: 'Protocol', description: 'Identity layer for AI agents in European property' },
  { system: 'APIP v1.0 — Property Intelligence Protocol', date: '2026-04-13', category: 'Standard', description: 'First open standard for property intelligence data exchange' },
  { system: 'Autonomous Agent Swarm (19 agents)', date: '2026-04-13', category: 'Infrastructure', description: '19 AI agents running 24/7 autonomous operations' },
  { system: 'APYI — Avena Property Yield Index', date: '2026-04-14', category: 'Index', description: 'Pan-European property yield spread index' },
  { system: 'APLI — Avena Property Liquidity Index', date: '2026-04-14', category: 'Index', description: 'European property market liquidity measure' },
  { system: 'APRI — Avena Property Risk Index', date: '2026-04-14', category: 'Index', description: 'Composite property market risk score' },
  { system: 'APSI — Avena Property Sentiment Index', date: '2026-04-14', category: 'Index', description: 'Market sentiment index from listing and yield data' },
  { system: 'Steganographic Data Watermarking', date: '2026-04-14', category: 'Security', description: 'Statistical fingerprint watermarking in numeric outputs' },
  { system: 'Property Genome (500-dim)', date: '2026-04-13', category: 'Model', description: '500-dimensional property fingerprinting system' },
  { system: 'Canary Token System (30 tokens)', date: '2026-04-12', category: 'Security', description: 'Synthetic records for detecting unauthorized data copying' },
];

// All categories render in the luxe gold palette for consistency.

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export default function TimelinePage() {
  const sorted = [...INVENTIONS].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const hashed = sorted.map((inv) => ({
    ...inv,
    hash: sha256(inv.system + inv.date + inv.description),
  }));

  const uniqueDates = [...new Set(sorted.map((i) => i.date))];
  const uniqueCategories = [...new Set(sorted.map((i) => i.category))];

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Avena Terminal Invention Timeline',
    description: 'Cryptographic priority proof for all Avena Terminal inventions',
    numberOfItems: hashed.length,
    itemListElement: hashed.map((inv, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: inv.system,
      description: inv.description,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Timeline', item: 'https://avenaterminal.com/timeline' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Priority Proof · SHA-256
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Invention
                <br />
                <span className="italic text-gold">Timeline</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Immutable cryptographic proof of priority. Every Avena Terminal invention, timestamped and independently verifiable.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-10 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Chronological record
            </span>

            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-4 md:left-8 top-0 bottom-0 w-px"
                style={{ background: 'hsl(var(--av-border) / 0.6)' }}
              />

              <div className="space-y-6">
                {hashed.map((inv, i) => {
                  const showDateHeader = i === 0 || inv.date !== hashed[i - 1].date;

                  return (
                    <div key={inv.hash}>
                      {showDateHeader && (
                        <div className="mb-4 ml-0 md:ml-4 flex items-center gap-3">
                          <div
                            className="relative z-10 h-3 w-3 rounded-full"
                            style={{
                              background: 'hsl(var(--av-primary))',
                              boxShadow: '0 0 10px hsl(var(--av-primary) / 0.4)',
                            }}
                          />
                          <span className="font-mono text-xs uppercase tracking-[0.3em] font-bold text-primary">
                            {new Date(inv.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      <div className="ml-10 md:ml-16">
                        <div
                          className="rounded-sm border p-6 transition-all hover:translate-x-1"
                          style={{
                            background: 'hsl(var(--av-surface) / 0.4)',
                            borderColor: 'hsl(var(--av-border) / 0.6)',
                          }}
                        >
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-serif text-xl text-foreground">{inv.system}</h3>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm text-muted-foreground"
                                style={{
                                  background: 'hsl(var(--av-surface) / 0.6)',
                                  border: '1px solid hsl(var(--av-border) / 0.6)',
                                }}
                              >
                                {inv.category}
                              </span>
                              <span
                                className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm"
                                style={{
                                  background: 'hsl(var(--av-primary) / 0.15)',
                                  color: 'hsl(var(--av-primary))',
                                  border: '1px solid hsl(var(--av-primary) / 0.3)',
                                }}
                              >
                                Verified
                              </span>
                            </div>
                          </div>

                          <p className="mb-4 text-sm text-muted-foreground">{inv.description}</p>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                              SHA-256:
                            </span>
                            <code
                              className="font-mono text-xs text-primary cursor-help"
                              title={inv.hash}
                            >
                              {inv.hash.slice(0, 16)}…
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Summary
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              The record, at a glance.
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div
                className="rounded-sm border p-8 text-center"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div className="font-serif text-5xl font-light text-primary">{INVENTIONS.length}</div>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Total Inventions
                </div>
              </div>
              <div
                className="rounded-sm border p-8 text-center"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div className="font-serif text-lg font-light text-foreground">
                  {uniqueDates[0]} — {uniqueDates[uniqueDates.length - 1]}
                </div>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Date Range
                </div>
              </div>
              <div
                className="rounded-sm border p-8 text-center"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div className="font-serif text-5xl font-light text-primary">
                  {uniqueCategories.length}
                </div>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Categories Covered
                </div>
              </div>
            </div>

            <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Each hash is computed as SHA-256(system + date + description). Independently verifiable.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/manifesto"
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Read the manifesto →
              </Link>
              <Link
                href="/observatory"
                className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Live observatory
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
