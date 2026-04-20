import Link from 'next/link';
import { TikTokBadge } from './TikTokBadge';

const cols: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Product',
    items: [
      ['Deals', '/#deals'],
      ['Yield', '/yield'],
      ['Oracle', '/chat'],
      ['Intelligence', '/intelligence'],
      ['Predictions', '/predictions'],
      ['Indices', '/indices'],
      ['APCI', '/apci'],
      ['PropertyEval', '/benchmark'],
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
      ['APIP v1.0', '/standards/apip'],
      ['MCP Server', '/mcp-server'],
      ['Context Protocol', '/context-protocol'],
      ['SPARQL', '/api/v1/sparql'],
      ['Data Commons', '/data-commons'],
    ],
  },
  {
    title: 'Avena',
    items: [
      ['Methodology', '/methodology'],
      ['Manifesto', '/manifesto'],
      ['Timeline', '/timeline'],
      ['Changelog', '/changelog'],
      ['Cite', '/cite'],
      ['Verify', '/verify'],
      ['Terms', '/terms'],
    ],
  },
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
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-sm text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                <span className="font-serif text-lg font-bold leading-none">A</span>
              </span>
              <span className="font-serif text-xl font-semibold tracking-wide text-foreground">
                Avena
              </span>
            </div>
            <p className="mt-6 max-w-sm font-serif text-2xl font-light leading-tight text-foreground">
              Where capital meets <span className="italic text-gold">conviction.</span>
            </p>
            <p className="mt-4 max-w-sm font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              European Property Intelligence · v2026.04
            </p>
            <div className="mt-5">
              <TikTokBadge />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-7">
            {cols.map(col => (
              <div key={col.title}>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.items.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
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

        <div
          className="mt-16 flex flex-col items-start justify-between gap-4 border-t pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <span>© 2026 Avena Terminal · All rights reserved</span>
          <span>DOI: 10.5281/zenodo.19520064 · CC BY 4.0</span>
        </div>
      </div>
    </footer>
  );
}
