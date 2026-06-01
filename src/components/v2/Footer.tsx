import Link from 'next/link';
import { TikTokBadge } from './TikTokBadge';

// Footer is the institutional credibility surface. Four-column structure
// (Products / Data & Standards / Company / Legal & Contact) mirrors how
// Bloomberg/Refinitiv/S&P organise the bottom of their data products.
// The credentials band underneath shows what a procurement officer
// expects to find: DOI, Wikidata, license, schema version, status.

// ─── Footer columns (Great Consolidation 2026-05-29) ──────────────────────
// Five disciplined columns. Every link earns its place. The 7 top-nav
// pages are NOT duplicated here — they live in the header. The footer is
// where operational, governance, outreach, legal, and standards-credential
// links live.
const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'About',
    links: [
      { label: 'About Avena',     href: '/about' },
      { label: 'Careers',         href: '/careers' },
      { label: 'Co-Founder Search', href: '/careers/co-founder' },
      { label: 'Press',           href: '/press' },
      { label: 'Press Kit',       href: '/press/kit' },
      { label: 'Awards',          href: '/awards' },
      { label: 'Contact',         href: '/contact' },
      { label: 'FAQ',             href: '/faq' },
      { label: 'Glossary',        href: '/glossary' },
      { label: 'Blog',            href: '/blog' },
    ],
  },
  {
    heading: 'Governance',
    links: [
      { label: 'Governance',      href: '/governance' },
      { label: 'Methodology',     href: '/methodology' },
      { label: 'Verify',          href: '/verify' },
      { label: 'Defensibility',   href: '/defensibility' },
      { label: 'Limitations',     href: '/limitations' },
      { label: 'Roadmap',         href: '/roadmap' },
      { label: 'Changelog',       href: '/changelog' },
    ],
  },
  {
    heading: 'Outreach',
    links: [
      { label: 'EU Presidency',   href: '/eu-presidency' },
      { label: 'APON Network',    href: '/apon-network' },
      { label: 'Academic Access', href: '/academic' },
      { label: 'Contribute Data', href: '/contribute' },
      { label: 'Data Partners',   href: '/data-partners' },
      { label: 'EU Consultations', href: '/consultations' },
    ],
  },
  {
    heading: 'Data & Standards',
    links: [
      { label: 'APIP v1.0 Standard', href: '/standards' },
      { label: 'AVN-ID Registry',   href: '/standards#avn-id' },
      { label: 'Citations',         href: '/standards#citations' },
      { label: 'Open Dataset',      href: '/dataset' },
      { label: 'Zenodo DOI',        href: 'https://doi.org/10.5281/zenodo.19520064' },
      { label: 'Wikidata Q139165733', href: 'https://www.wikidata.org/wiki/Q139165733' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service',   href: '/terms' },
      { label: 'License (CC BY 4.0)',href: '/license' },
      { label: 'Brand Kit',          href: '/brand' },
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

      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12 py-12 sm:py-14 lg:py-16">
        {/* Masthead */}
        <div className="grid gap-10 lg:gap-12 lg:grid-cols-[1.3fr_3fr]">
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

            <p className="mt-5 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
              Europe&apos;s deepest technical data infrastructure for property. Live across 27 EU markets under the open APIP v1.0 standard. Refreshed daily. Cite as <span className="font-mono text-foreground/85">DOI 10.5281/zenodo.19520064</span>.
            </p>

            <div className="mt-5">
              <TikTokBadge />
            </div>

            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Frankfurt · Madrid · Oslo · Founded 2026
            </p>
          </div>

          {/* Link columns — 2 on mobile, 3 on tablet, 5 on desktop */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-5">
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
                            className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link
                            href={l.href}
                            className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
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
          className="mt-12 sm:mt-14 pt-6 sm:pt-8 border-t grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5"
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
          className="mt-8 sm:mt-10 flex flex-col items-start justify-between gap-3 border-t pt-5 sm:pt-6 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <span className="break-words">© 2026 Avena Terminal · All rights reserved · Cite as <Link href="/governance" className="text-foreground/85 hover:text-primary">DOI 10.5281/zenodo.19520064</Link></span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            System operational
          </span>
        </div>
      </div>
    </footer>
  );
}
