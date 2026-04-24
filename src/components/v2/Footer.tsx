import Link from 'next/link';
import { TikTokBadge } from './TikTokBadge';

const cols: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Product',
    items: [
      ['Deals', '/#deals'],
      ['Terminal v2', '/terminal-v2'],
      ['Compare deals', '/compare/deals'],
      ['Watchlist', '/watchlist'],
      ['Coverage', '/coverage'],
      ['Yield Analyzer', '/yield'],
      ['Oracle AI', '/chat'],
      ['Causal Intelligence', '/intelligence'],
      ['Prediction Ledger', '/predictions'],
      ['Track record', '/track-record'],
      ['Indices', '/indices'],
      ['APCI', '/apci'],
      ['PropertyEval', '/benchmark'],
      ['General AI + Avena', '/colosseum'],
    ],
  },
  {
    title: 'Markets',
    items: [
      ['Spain', '/costas'],
      ['Portugal', '/portugal'],
      ['Bubble Scanner', '/bubble-scanner'],
      ['Javea Hub', '/locations/javea'],
      ['Observatory', '/observatory'],
    ],
  },
  {
    title: 'Protocol',
    items: [
      ['Avena Agent', '/agent'],
      ['AVP v1.0 · protocol', '/standards/avp'],
      ['Radar · map', '/radar'],
      ['Score any property', '/score'],
      ['Open engine · GitHub', 'https://github.com/avenaterminal/avena-score'],
      ['Research paper', '/research/avena-score'],
      ['Score Challenge 2026', '/challenge/score-2026'],
      ['AVENA Index', '/indices/avena'],
      ['APIP v1.0', '/standards/apip'],
      ['AVN_PROP_ID', '/standards/avn-id'],
      ['CLI', '/cli'],
      ['API Playground', '/playground'],
      ['Browser Extension', '/extension'],
      ['MCP Server', '/mcp-server'],
      ['Context Protocol', '/context-protocol'],
      ['SPARQL Endpoint', '/api/v1/sparql'],
      ['OpenAPI Spec', '/api/openapi.json'],
      ['Data Commons', '/data-commons'],
      ['Integrate', '/integrate'],
    ],
  },
  {
    title: 'Avena',
    items: [
      ['About', '/about'],
      ['Institutional', '/institutional'],
      ['Daily brief', '/briefs/daily'],
      ['Methodology', '/methodology'],
      ['Manifesto', '/manifesto'],
      ['Changelog', '/changelog'],
      ['Press kit', '/press/kit'],
      ['Brand guide', '/brand'],
      ['Status', '/status'],
      ['Terminal stats', '/terminal-stats'],
      ['Contact', '/contact'],
      ['Cite', '/cite'],
      ['Terms', '/terms'],
    ],
  },
];

const credentials = [
  { label: 'Zenodo DOI', value: '10.5281/zenodo.19520064' },
  { label: 'Wikidata', value: 'Q139165733' },
  { label: 'License', value: 'CC BY 4.0' },
  { label: 'Version', value: 'v2026.04' },
];

export function Footer() {
  return (
    <footer
      className="relative border-t"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      {/* Top accent line */}
      <div className="h-px w-full" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />

      <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-12">
        {/* Masthead + columns */}
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-sm border"
                style={{
                  borderColor: 'hsl(var(--av-primary) / 0.35)',
                  background: 'hsl(var(--av-primary) / 0.06)',
                }}
              >
                <span className="font-serif text-xl italic text-gold leading-none">A</span>
              </span>
              <span className="font-serif text-2xl font-light tracking-wide text-foreground">
                Avena
              </span>
            </Link>

            <p className="mt-8 max-w-md font-serif text-3xl font-light leading-[1.1] text-foreground">
              Where capital meets{' '}
              <span className="italic text-gold">conviction.</span>
            </p>

            <p className="mt-5 max-w-md text-sm font-light text-muted-foreground leading-relaxed">
              A private terminal for European property. Scored, ranked, and
              stress-tested daily by an autonomous agent swarm. Editorial by
              design, institutional by data.
            </p>

            <div className="mt-6">
              <TikTokBadge />
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Costa Blanca · Spain · Founded 2026
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-7">
            {cols.map((col) => (
              <div key={col.title}>
                <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-3">
                  {col.items.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials band */}
        <div
          className="mt-16 pt-10 border-t grid grid-cols-2 md:grid-cols-4 gap-6"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          {credentials.map((c) => (
            <div key={c.label}>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-1">
                {c.label}
              </div>
              <div className="font-mono text-[11px] tabular text-foreground/85 break-all">
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <span>© 2026 Avena Terminal · All rights reserved</span>
          <span className="flex items-center gap-2">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            System operational
          </span>
        </div>
      </div>
    </footer>
  );
}
