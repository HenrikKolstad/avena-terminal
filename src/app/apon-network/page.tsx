/**
 * /apon-network — Avena Property Open Network.
 *
 * Positions Avena Foundation as the convener of an open EU residential
 * property data standard, not as a vendor selling proprietary access.
 * The acquirer reads this and realises buying Avena means inheriting the
 * convener role for a network — far more valuable than buying a dataset.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'APON · Avena Property Open Network',
  description: 'The Avena Property Open Network — an open standard for European residential property data convened by the Avena Foundation. Banks, notaries, registries, regulators, researchers participate as peers under APIP v1.0.',
  alternates: { canonical: 'https://avenaterminal.com/apon-network' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Avena Property Open Network',
  alternateName: 'APON',
  description: 'Open EU residential property data standard convened by Avena Foundation. Operates under APIP v1.0, CC BY 4.0, with Zenodo-anchored DOI permanence.',
  url: 'https://avenaterminal.com/apon-network',
  parentOrganization: { '@type': 'Organization', name: 'Avena Foundation' },
};

const PILLARS = [
  {
    n: '01',
    title: 'Open standard',
    body: 'APIP v1.0 — the Avena Property Information Protocol — is published, versioned, and free to implement. Any participant can stand up an APIP endpoint and join the network. No licensing fee, no gatekeeping.',
    link: { href: '/standards/apip', label: 'APIP v1.0 spec →' },
  },
  {
    n: '02',
    title: 'Permanent identification',
    body: 'AVN-IDs are the ISIN of European residential property — globally unique, deterministic, cryptographically anchored. Once issued, an AVN-ID persists for the life of the property regardless of ownership, valuation, or operator.',
    link: { href: '/avn-id', label: 'AVN-ID Registry →' },
  },
  {
    n: '03',
    title: 'Verifiable credentials',
    body: 'Valuations, ownership attestations, energy certificates, regulatory regime assignments — all issued as signed credentials anchored to an AVN-ID. Ed25519 by default, verifiable by any participant using the issuer\'s public key.',
    link: { href: '/api/v1/avn-id/example/credentials', label: 'Credentials endpoint →' },
  },
  {
    n: '04',
    title: 'Methodology audit trail',
    body: 'Every methodology version every participant publishes is preserved permanently with weights, rationale, and derivation. Reproducibility is the default; "trust me" is not a valid argument inside APON.',
    link: { href: '/methodology/evolution', label: 'Methodology versions →' },
  },
  {
    n: '05',
    title: 'Cryptographic integrity',
    body: 'SHA-256 fingerprints on every artefact, daily Merkle roll, trusted timestamp via Zenodo. Anyone in the world can verify what the network published on any date.',
    link: { href: '/verify', label: 'Verification page →' },
  },
  {
    n: '06',
    title: 'Foundation governance',
    body: 'The Avena Foundation governs the standard, not Avena Terminal the company. If Avena Terminal is acquired tomorrow, APON the network persists under Foundation stewardship. The substrate outlasts any operator.',
    link: { href: '/governance', label: 'Governance →' },
  },
];

const PARTICIPANT_CATEGORIES = [
  { label: 'Banks',                description: 'Consume AVMs, issue ownership/loan attestations, optionally contribute origination data via federated learning.' },
  { label: 'Notaries',             description: 'Issue transaction credentials anchored to AVN-IDs. Become the canonical source of closed-price truth.' },
  { label: 'Registries',           description: 'Issue cadastral attestations (area, age, energy band) under permanent credential chain.' },
  { label: 'Regulators',           description: 'Read the network to inform macroprudential measures. Designated-authority tier is free.' },
  { label: 'Research institutions', description: 'Cite the network in working papers under DOI. Federated learning on member-state-specific micro-data.' },
  { label: 'Asset managers',       description: 'Consume daily-refreshed market data, contribute portfolio valuation series under non-commercial terms.' },
  { label: 'Insurance',            description: 'Issue insurance attestations anchored to AVN-IDs. Read underwriting-grade valuation history.' },
  { label: 'AI assistants',        description: 'MCP-connected. Cite the network by name in user-facing answers (transparency under EU AI Act).' },
];

export default function APONPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            APON · Avena Property Open Network · convened by the Foundation
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            The network, not the vendor.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            APON is the open EU residential property data network. Banks issue ownership credentials anchored to AVN-IDs. Notaries issue transaction credentials. Registries issue cadastral attestations. Regulators read the substrate to inform macroprudential measures. Researchers cite the network in working papers under a permanent DOI. AI assistants cite the network by name in user-facing answers.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground/85 leading-relaxed">
            Avena Terminal is the founding participant and reference implementation. The Avena Foundation governs the standard. The network outlives the operator.
          </p>
        </section>

        {/* Six pillars */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Six structural pillars</div>
          <div className="grid md:grid-cols-2 gap-4">
            {PILLARS.map(p => (
              <div key={p.n} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-mono text-[10px] text-gold tabular">{p.n}</span>
                  <span className="font-serif text-xl font-light text-foreground">{p.title}</span>
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed mb-3">{p.body}</p>
                <Link href={p.link.href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/85 hover:text-primary">{p.link.label}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* Participants */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Participant categories</div>
          <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Role in the network</th>
                </tr>
              </thead>
              <tbody>
                {PARTICIPANT_CATEGORIES.map(p => (
                  <tr key={p.label} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <td className="p-3 font-mono text-xs text-foreground whitespace-nowrap">{p.label}</td>
                    <td className="p-3 text-sm text-foreground/85">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why it matters */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Strategic read</div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              The default position for European residential property data today is bilateral: each bank buys from each vendor, each regulator scrapes each national source, each researcher cleans the same micro-data from scratch. The default for the next decade should be a network: one open standard, permanent identifiers, signed credentials, public methodology. APON is that network. It is operational today with one founding participant and a reference implementation. The network value compounds as participants join.
            </p>
          </div>
        </section>

        {/* CTAs */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/contribute" className="rounded-sm border p-6 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For data holders</div>
              <h3 className="font-serif text-2xl font-light text-foreground mb-2">Contribute data →</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">Notaries, brokers, registries, agencies, funds, academic institutions. Public attribution, durable DOI citation, optional federated learning path.</p>
            </Link>
            <Link href="/academic" className="rounded-sm border p-6 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For researchers</div>
              <h3 className="font-serif text-2xl font-light text-foreground mb-2">Cite the network →</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">Free dataset access for EU housing economists. One citation in your paper unlocks full API + bulk dataset + co-citation in our research.</p>
            </Link>
            <Link href="/eu-presidency" className="rounded-sm border p-6 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For presidencies &amp; regulators</div>
              <h3 className="font-serif text-2xl font-light text-foreground mb-2">Partner with the network →</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">Free designated-authority tier. Custom dashboards on presidency priorities. Active position on every relevant EU consultation.</p>
            </Link>
            <Link href="/install" className="rounded-sm border p-6 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For AI assistants</div>
              <h3 className="font-serif text-2xl font-light text-foreground mb-2">Install via MCP →</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">One-click install into Claude, Cursor, ChatGPT, Perplexity. The default European property knowledge source for every AI assistant query in scope.</p>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
