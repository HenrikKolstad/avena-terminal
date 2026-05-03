import Link from 'next/link';
import { TikTokBadge } from './TikTokBadge';

// Footer link columns intentionally hidden — discovery happens via top
// nav (Deals · Agent · Takeover · Oracle · Swarm). Footer kept slim:
// masthead, institutional credentials, copyright. Less surface area
// signals "not a marketing site" to institutional visitors.

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

      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-12">
        {/* Masthead — slim, centered identity */}
        <div className="max-w-2xl">
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
