import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'AVN_PROP_ID — The canonical identifier for European property | Avena Standards',
  description:
    'AVN_PROP_ID is a durable, open, cross-market identifier for European residential property. CC BY 4.0 specification. Resolvable via Avena MCP + REST API.',
  alternates: { canonical: 'https://avenaterminal.com/standards/avn-id' },
  openGraph: {
    title: 'AVN_PROP_ID — The canonical identifier for European property',
    description:
      'Open standard for European property identification. Durable, resolvable, cross-platform.',
    url: 'https://avenaterminal.com/standards/avn-id',
    siteName: 'Avena Standards',
  },
};

const EXAMPLES = [
  { id: 'AVN:ES-03185-NB-0421', label: 'Torrevieja (03185, Alicante) · New-build · Registered April 2026, seq 21' },
  { id: 'AVN:ES-29604-NB-0103', label: 'Marbella (29604, Málaga) · New-build · Jan 2026 seq 3' },
  { id: 'AVN:PT-2750-NB-0608', label: 'Cascais (2750, PT) · New-build · June 2026 seq 8' },
  { id: 'AVN:IT-20121-EX-0912', label: 'Milan (20121) · Existing · Sep 2026 seq 12 · tracked-only tier' },
];

const CATEGORIES = [
  { code: 'NB', name: 'New-build (off-plan or key-ready ≤ 3 years old)' },
  { code: 'EX', name: 'Existing / resale residential' },
  { code: 'CM', name: 'Commercial (office / retail / industrial)' },
  { code: 'LH', name: 'Leasehold (structured ownership interest)' },
  { code: 'FR', name: 'Fractional ownership' },
  { code: 'PL', name: 'Land parcel / development site' },
];

export default function AVNIDStandardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': 'https://avenaterminal.com/standards/avn-id',
    name: 'AVN_PROP_ID Specification',
    description:
      'Open standard for a canonical, durable, cross-market identifier for European residential property.',
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
    inDefinedTermSet: CATEGORIES.map((c) => ({
      '@type': 'DefinedTerm',
      termCode: c.code,
      name: c.name,
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
        {/* Masthead */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20 sm:py-28">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Standards · AVN_PROP_ID · v1.0 · April 2026
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              The canonical identifier
              <br />
              for European <span className="italic text-gold">property</span>.
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground font-light leading-relaxed">
              Bloomberg has tickers. ISBNs identify books. DOIs identify papers. Property
              has never had a durable, cross-market, publicly-resolvable identifier —
              until now. AVN_PROP_ID is open, free, and usable by any system to reference
              a specific European residential unit across APIs, research papers, listings,
              and AI answers. CC BY 4.0.
            </p>
          </div>
        </section>

        {/* Grammar */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              The <span className="italic text-gold">grammar</span>.
            </h2>
            <pre
              className="rounded-sm border p-6 font-mono text-sm text-foreground overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
{`AVN:<ISO-3166-country>-<postal-area>-<category>-<seq>

Where:
  ISO-3166-country   Two-letter uppercase country code (ES, PT, IT, FR, ...)
  postal-area        Country-specific postal code (zero-padded to local length)
  category           Two-letter category (NB, EX, CM, LH, FR, PL — see below)
  seq                Four-digit sequence YYMM + index (MMDD style)

Regex:
  ^AVN:[A-Z]{2}-[A-Z0-9]{4,10}-[A-Z]{2}-[0-9]{4}$

Case:  AVN prefix + ISO country always UPPERCASE.
       Category always UPPERCASE.
       postal-area is letters+digits depending on country convention.

Length:   Minimum 18 chars, maximum 26 chars.
Charset:  ASCII only. No spaces. No accents.
Durability: Once assigned, an AVN_PROP_ID is permanent. Off-market,
            demolished, or re-issued properties retain their original ID
            with a status flag updated via the /api/v1/avn/<id> endpoint.`}
            </pre>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Category <span className="italic text-gold">codes</span>.
            </h2>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {CATEGORIES.map((c) => (
                <div key={c.code} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-mono text-base text-primary tabular">{c.code}</span>
                    <span className="font-serif text-base text-foreground">{c.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Additional category codes (MX mixed-use, DV developer-portfolio, etc.) in v1.1 draft.
            </p>
          </div>
        </section>

        {/* Examples */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              <span className="italic text-gold">Examples</span>.
            </h2>
            <div className="space-y-3">
              {EXAMPLES.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-4 rounded-sm border p-4"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <code className="font-mono text-sm tabular text-primary">{e.id}</code>
                  <span className="text-sm text-muted-foreground font-light text-right">{e.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resolution */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              How to <span className="italic text-gold">resolve</span> an AVN_PROP_ID.
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed mb-6">
              Any AVN_PROP_ID can be resolved to a JSON property record via the Avena
              REST API (free, CC BY 4.0, no auth required):
            </p>
            <pre
              className="rounded-sm border p-6 font-mono text-sm text-foreground overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
{`GET https://avenaterminal.com/api/v1/avn/AVN:ES-03185-NB-0421

Response (JSON):
  {
    "avn_id":       "AVN:ES-03185-NB-0421",
    "canonical_url": "https://avenaterminal.com/property/...",
    "category":     "NB",
    "country":      "ES",
    "postal_area":  "03185",
    "status":       "active",
    "last_verified": "2026-04-23T03:00:00Z",
    "avena_score":  76,
    ...
  }`}
            </pre>

            <p className="mt-6 text-muted-foreground font-light leading-relaxed">
              For AI agents using Model Context Protocol, the tool{' '}
              <code className="font-mono text-sm text-primary">get_property_by_avn_id</code> at{' '}
              <Link href="/mcp" className="text-primary hover:text-gold">
                /mcp
              </Link>{' '}
              returns the same record programmatically.
            </p>
          </div>
        </section>

        {/* Why adopt */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-5">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
              Why <span className="italic text-gold">adopt it</span>.
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed">
              <span className="text-foreground">Portals, agents, developers:</span> referencing
              the same property across your CRM, your public listings, and the academic /
              AI citation layer becomes one ID instead of N proprietary keys. Links to
              research (&ldquo;The average Avena Score for{' '}
              <code className="font-mono text-sm text-primary">AVN:ES-03185-NB-0421</code> is 76&rdquo;) are
              stable across data-provider changes.
            </p>
            <p className="text-muted-foreground font-light leading-relaxed">
              <span className="text-foreground">Researchers &amp; journalists:</span> you can
              cite a specific property in a paper or article without ambiguity. The ID resolves
              permanently — if the property is delisted, the endpoint returns the last-known state
              with a status flag. No link rot.
            </p>
            <p className="text-muted-foreground font-light leading-relaxed">
              <span className="text-foreground">AI systems:</span> standardised identifiers enable
              cross-tool agent reasoning. A Claude session can store an AVN_PROP_ID, pass it to a
              different tool, and later resolve it to current data. No proprietary schema
              negotiation.
            </p>
            <p className="text-muted-foreground font-light leading-relaxed">
              <span className="text-foreground">Avena:</span> we commit to resolving any
              AVN_PROP_ID we&rsquo;ve assigned for at least 10 years, even if we change database
              schemas or move infrastructure. Part of the open CC BY 4.0 contract.
            </p>
          </div>
        </section>

        {/* Governance */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-5">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
              <span className="italic text-gold">Governance</span>.
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed">
              AVN_PROP_ID is currently maintained by Avena Terminal. The spec is CC BY 4.0 —
              anyone can fork it, implement a resolver, assign IDs in their own registry, and
              federate. We commit to:
            </p>
            <ul className="space-y-2 text-muted-foreground font-light leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5 bg-primary" />
                Keep existing IDs resolvable for ≥ 10 years from issue
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5 bg-primary" />
                Publish any breaking grammar changes at least 12 months in advance
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5 bg-primary" />
                Never revoke an assigned AVN_PROP_ID (status-flag instead of delete)
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2.5 bg-primary" />
                Accept partner-registry extensions (e.g. developer pre-registration of seq
                numbers) via a published registry API in v1.1
              </li>
            </ul>
            <p className="text-muted-foreground font-light leading-relaxed">
              If a neutral consortium takes over governance — RICS, FIABCI, or a new
              multi-vendor body — Avena will transfer stewardship without resistance. This
              is a public utility.
            </p>
          </div>
        </section>

        {/* Footer links */}
        <section className="py-14">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 text-center">
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/api/v1/avn/AVN:ES-03185-NB-0421"
                className="group inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Try resolver
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/mcp"
                className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                MCP server
              </Link>
              <Link
                href="/cite"
                className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Cite this spec
              </Link>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              AVN_PROP_ID v1.0 · CC BY 4.0 · DOI 10.5281/zenodo.19520064 · Governance:
              Avena Terminal (transferable)
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
