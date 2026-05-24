import Link from 'next/link';
import { TikTokBadge } from './TikTokBadge';

// Footer is the institutional credibility surface. Four-column structure
// (Products / Data & Standards / Company / Legal & Contact) mirrors how
// Bloomberg/Refinitiv/S&P organise the bottom of their data products.
// The credentials band underneath shows what a procurement officer
// expects to find: DOI, Wikidata, license, schema version, status.

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Products',
    links: [
      { label: 'Deals',         href: '/' },
      { label: 'Avena Index',   href: '/avena-index' },
      { label: 'Precursor',     href: '/precursor' },
      { label: 'Genesis',       href: '/genesis' },
      { label: 'Counterpart',   href: '/counterpart' },
      { label: 'Oracle',        href: '/chat' },
      { label: 'Swarm',         href: '/swarm' },
    ],
  },
  {
    heading: 'Data & Standards',
    links: [
      { label: 'EU Coverage',         href: '/eu-coverage' },
      { label: 'EU Official Stats',   href: '/eu-official' },
      { label: 'Macro Alerts',        href: '/alerts/macro' },
      { label: 'API Docs',            href: '/docs/api' },
      { label: 'Webhooks',            href: '/docs/webhooks' },
      { label: 'Wikidata Graph',      href: '/wikidata' },
      { label: 'Moat Archive',        href: '/archive' },
      { label: 'Live Ops',            href: '/live' },
      { label: 'Proof of Moat',       href: '/proof' },
      { label: 'The Stack',           href: '/stack' },
      { label: 'Sovereign Briefing',  href: '/sovereign-briefing' },
      { label: 'APON Oracle',         href: '/oracle' },
      { label: 'Health Index',        href: '/counterpart/health-index' },
      { label: 'AVN-ID Registry',     href: '/avn-id' },
      { label: 'Avena Index',         href: '/avena-index' },
      { label: 'Forecast',            href: '/forecast' },
      { label: 'Track Record',        href: '/track-record' },
      { label: 'APIP Standard',       href: '/standards/apip-v1.json' },
      { label: 'Open Dataset',        href: '/dataset' },
      { label: 'Methodology',         href: '/methodology' },
      { label: 'MCP Integration',     href: '/docs/mcp' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',          href: '/about' },
      { label: 'Institutional',  href: '/institutional' },
      { label: 'Data Partners',  href: '/data-partners' },
      { label: 'Press',          href: '/press' },
      { label: 'Awards',         href: '/awards' },
      { label: 'Roadmap',        href: '/roadmap' },
      { label: 'Changelog',      href: '/changelog' },
    ],
  },
  {
    heading: 'Legal & Contact',
    links: [
      { label: 'Governance',         href: '/governance' },
      { label: 'Terms of Service',   href: '/terms' },
      { label: 'License (CC BY 4.0)',href: '/license' },
      { label: 'Citations',          href: '/citations' },
      { label: 'Brand kit',          href: '/brand' },
      { label: 'Contact',            href: '/contact' },
    ],
  },
];

const credentials = [
  { label: 'Zenodo DOI',  value: '10.5281/zenodo.19520064' },
  { label: 'Wikidata',    value: 'Q139165733' },
  { label: 'Schema',      value: 'APIP v1.0' },
  { label: 'License',     value: 'CC BY 4.0' },
  { label: 'Data residency', value: 'EU (Frankfurt)' },
  { label: 'Version',     value: 'v2026.05' },
];

export function Footer() {
  return (
    <footer
      className="relative border-t"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}
    >
      {/* Top gold accent */}
      <div className="h-px w-full" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />

      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-12">
        {/* Masthead */}
        <div className="grid gap-12 lg:grid-cols-[1.3fr_3fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-sm border"
                style={{ borderColor: 'hsl(var(--av-primary) / 0.35)', background: 'hsl(var(--av-primary) / 0.06)' }}
              >
                <span className="font-serif text-xl italic text-gold leading-none">A</span>
              </span>
              <span className="font-serif text-2xl font-light tracking-wide text-foreground">Avena</span>
            </Link>

            <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
              European property intelligence infrastructure. Live data across 27 EU markets under the open APIP v1.0 standard. Refreshed daily. Cited as <span className="font-mono text-foreground/85">DOI 10.5281/zenodo.19520064</span>.
            </p>

            <div className="mt-6">
              <TikTokBadge />
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Frankfurt · Madrid · Oslo · Founded 2026
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.heading}>
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/85">
                  {col.heading}
                </div>
                <ul className="space-y-2">
                  {col.links.map((l) => {
                    const external = l.href.endsWith('.json') || l.href.startsWith('http');
                    return (
                      <li key={l.href}>
                        {external ? (
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener"
                            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link
                            href={l.href}
                            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {l.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials band */}
        <div
          className="mt-14 pt-8 border-t grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
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
          className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <span>© 2026 Avena Terminal · All rights reserved · Cite as <Link href="/governance" className="text-foreground/85 hover:text-primary">DOI 10.5281/zenodo.19520064</Link></span>
          <span className="flex items-center gap-2">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            System operational
          </span>
        </div>
      </div>
    </footer>
  );
}
