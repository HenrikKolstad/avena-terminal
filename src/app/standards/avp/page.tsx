import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'AVP v1.0 — Avena Verified Protocol | Avena Terminal',
  description: 'Open protocol for European property data exchange. Canonical identifiers, verifiable provenance, federation layer. Published CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/standards/avp' },
  openGraph: {
    title: 'AVP v1.0 — Avena Verified Protocol',
    description: 'Open protocol for European property data. Bloomberg established it for finance. AVP does it for property.',
    url: 'https://avenaterminal.com/standards/avp',
  },
};

export default function AvpPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'AVP v1.0 — Avena Verified Protocol',
    name: 'Avena Verified Protocol v1.0',
    datePublished: '2026-04-24',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: 'AVP/1.0',
    url: 'https://avenaterminal.com/standards/avp',
    keywords: 'property data, open protocol, interoperability, real estate, proptech, AVP, avena, avn_prop_id',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <article className="mx-auto max-w-[860px] px-5 sm:px-12 py-20">
          <header className="mb-12">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              AVP · Avena Verified Protocol · v1.0 · CC BY 4.0
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-light leading-[1.04] tracking-tight text-foreground mb-4">
              The open protocol for <span className="italic text-gold">European property data</span>.
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Specification v1.0 · published 2026-04-24 · reference implementation open
            </p>
          </header>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">Why AVP exists</h2>
            <p>
              Bloomberg defined how financial data moves between institutions.
              There is no equivalent for property. Every portal ships its own
              schema; every aggregator rebuilds the same wheel; every LLM
              hallucinates listings because no canonical source exists. AVP is
              the open protocol that fixes this.
            </p>
            <p>
              AVP gives every European property three things: a canonical
              identifier (<Link href="/standards/avn-id" className="text-primary hover:text-gold">AVN_PROP_ID</Link>),
              a standard record schema, and a verifiable provenance chain so
              consumers can prove a listing hasn&apos;t been silently altered.
              Publishers, aggregators, AI agents, and buyers all speak the
              same language.
            </p>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">1. Record schema</h2>
            <pre
              className="rounded-sm border p-5 font-mono text-[12px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`{
  "@context": "https://avenaterminal.com/standards/avp/v1",
  "avp_version": "1.0",
  "avn_prop_id": "AVN:ES-03185-NB-0421",
  "issued_at": "2026-04-24T09:30:00Z",
  "issuer": {
    "name": "La Finca Group",
    "domain": "lafincagroup.com",
    "signature_key": "ed25519:..."
  },
  "listing": {
    "url": "https://lafincagroup.com/listings/N9171",
    "title": "Villa Bellaterra",
    "price_eur": 385000,
    "currency": "EUR",
    "built_m2": 176,
    "plot_m2": 320,
    "bedrooms": 3,
    "bathrooms": 2,
    "status": "off-plan",
    "completion_year": 2027,
    "location": {
      "town": "Jacarilla",
      "region": "Costa Blanca",
      "country": "ES",
      "lat": 37.973,
      "lng": -0.826
    }
  },
  "media": [
    { "type": "image", "url": "https://..." }
  ],
  "attestations": [
    { "type": "developer_verified", "by": "La Finca Group", "at": "2026-04-20T10:00:00Z" }
  ],
  "signature": "ed25519:HEX..."
}`}</pre>
            <p>
              Every field is typed. Arrays are unbounded. <code className="font-mono text-primary">signature</code>{' '}
              covers the canonical JSON representation per RFC 8785 (JSON Canonicalization Scheme). Consumers
              MUST reject records where the signature fails verification.
            </p>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">2. Federation layer</h2>
            <p>
              Any publisher (developer, brokerage, aggregator) exposes a feed at:
            </p>
            <pre
              className="rounded-sm border p-4 font-mono text-[12px]"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >{`GET  https://{publisher}/.well-known/avp/feed.json
GET  https://{publisher}/.well-known/avp/listing/{AVN_PROP_ID}`}</pre>
            <p>
              Consumers discover feeds by crawling <code className="font-mono text-primary">/.well-known/avp/</code>,
              verify the issuer&apos;s domain via ownership signal
              (<code className="font-mono text-primary">.well-known/avp/issuer.json</code> returns the signing
              key alongside a TXT record on the DNS apex), and ingest records.
              Federation is pull-based — no central registry is required, no
              Avena permission needed.
            </p>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">3. Provenance chain</h2>
            <p>
              Each AVP record carries an <code className="font-mono text-primary">attestations[]</code> array.
              Attestations are signed claims:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><code className="font-mono text-primary">developer_verified</code> — the developer directly confirms the listing.</li>
              <li><code className="font-mono text-primary">comp_verified</code> — an Avena-class auditor matched this listing to town-median data and found it consistent.</li>
              <li><code className="font-mono text-primary">price_fixed_at</code> — the listing price was attested unchanged at the given timestamp. Subsequent price changes require a new record.</li>
              <li><code className="font-mono text-primary">avena_score</code> — an Avena-class engine emitted a score. Signed by the scorer. Score methodology hash is carried in the attestation payload.</li>
            </ul>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">4. Reference implementation</h2>
            <p>
              Avena Terminal publishes a reference validator:{' '}
              <code className="font-mono text-primary">github.com/avenaterminal/avp</code>.
              It takes an AVP record and returns <code className="font-mono text-primary">{'{ valid: boolean, errors: [], warnings: [] }'}</code>.
              Run it as a library or as a CLI.
            </p>
            <pre
              className="rounded-sm border p-4 font-mono text-[12px]"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >{`npx @avena/avp validate <path-to-record.json>`}</pre>
            <p>
              Avena Terminal itself ships AVP-compliant records at{' '}
              <Link href="/api/v1/property/N9171/ai-summary" className="text-primary hover:text-gold">
                /api/v1/property/{'{ref}'}/ai-summary
              </Link> — these records carry an <code className="font-mono text-primary">avp_version</code> field
              and are signed with Avena&apos;s Ed25519 key (published alongside the validator).
            </p>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">5. Compliance badge</h2>
            <p>
              Sites implementing AVP v1.0 can display an AVP-verified badge
              on their listings. The badge links to the Avena validator,
              which checks the site&apos;s <code className="font-mono text-primary">.well-known/avp/</code>
              feed live.
            </p>
            <pre
              className="rounded-sm border p-4 font-mono text-[12px] whitespace-pre-wrap"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >{`<a href="https://avenaterminal.com/standards/avp/verify?domain=YOUR_DOMAIN">
  <img src="https://avenaterminal.com/standards/avp/badge.svg"
       alt="AVP v1.0 verified" />
</a>`}</pre>
          </section>

          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">6. Governance</h2>
            <p>
              AVP v1.0 is frozen. Minor additions land in v1.x via pull request
              to the reference repository with a 30-day open comment window.
              Breaking changes require v2.0 and a migration document. Avena Terminal
              commits to maintaining <code className="font-mono text-primary">{'/.well-known/avp/'}</code>{' '}
              endpoints for a minimum of 10 years.
            </p>
          </section>

          <footer className="pt-8 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              MIT (code) · CC BY 4.0 (spec) · DOI 10.5281/zenodo.19520064 · Cite as: AVP v1.0 — Avena Terminal (avenaterminal.com)
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </div>
  );
}
