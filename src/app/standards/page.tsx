/**
 * /standards — open standards canonical (Great Consolidation 2026-05-29).
 *
 * Absorbs: /standards/apip, /standards/avn-id, /standards/avp,
 * /avn-id, /registry, /apon-network, /citations, /wikidata.
 *
 * The page positions the Avena Foundation as convener of an open EU
 * residential property data standard, not as a vendor.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Standards · APIP v1.0 · AVN-ID · APON · Wikidata · DOI · Avena Terminal',
  description: 'APIP v1.0 open data standard. AVN-ID identifier registry (the ISIN of European property). APON Network. Wikidata Q139165733. DOI 10.5281/zenodo.19520064. RICS Tech Partner.',
  alternates: { canonical: 'https://avenaterminal.com/standards' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: 'Avena Standards Stack',
  description: 'Open standards for European residential property: APIP v1.0 data exchange, AVN-ID identifier registry, APON Network, Wikidata entity, Zenodo DOI.',
  url: 'https://avenaterminal.com/standards',
};

export default function StandardsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Open standards · convened by Avena Foundation · CC BY 4.0
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            The standards layer.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Avena Terminal is the reference implementation of four open standards for European residential property: APIP for data exchange, AVN-ID for permanent identification, APON for network governance, and AVP for verifiable property attestations. The standards are governed by the Avena Foundation. The substrate outlives any single operator.
          </p>
        </section>

        {/* Anchor jump */}
        <div className="sticky top-16 z-30 backdrop-blur-md border-b" style={{ background: 'hsl(var(--av-background) / 0.85)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-3 overflow-x-auto">
            <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">
              <a href="#apip" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>APIP v1.0</a>
              <a href="#avn-id" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>AVN-ID</a>
              <a href="#registry" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Registry</a>
              <a href="#avp" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>AVP</a>
              <a href="#apon" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>APON Network</a>
              <a href="#citations" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Citations</a>
              <a href="#wikidata" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Wikidata</a>
            </div>
          </div>
        </div>

        <Section id="apip" title="APIP v1.0 — Avena Property Information Protocol">
          <p className="mb-3">Open data-exchange standard for European residential property. JSON-LD, schema.org-compatible. CC BY 4.0. The protocol every Avena endpoint speaks; the protocol any APON Network participant implements.</p>
          <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            <a href="/standards/apip-v1.json" target="_blank" rel="noopener" className="text-primary hover:text-foreground">Spec JSON →</a>
          </div>
        </Section>

        <Section id="avn-id" title="AVN-ID — The ISIN of European Property">
          <p className="mb-3">Permanent, globally-unique, deterministic identifier for any European residential property. Cryptographically anchored. Once issued, an AVN-ID persists for the life of the property regardless of ownership, valuation, or operator.</p>
        </Section>

        <Section id="registry" title="AVN-ID Registry">
          <p className="mb-3">The canonical registry of issued AVN-IDs. Public, queryable, signed. The reference implementation of the identifier standard.</p>
          <Link href="/avn-id" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Browse registry →</Link>
        </Section>

        <Section id="avp" title="AVP — Avena Verifiable Property attestation">
          <p className="mb-3">Signed credentials anchored to AVN-IDs. Valuations, ownership, insurance, energy certificates, regulatory regime. Ed25519 by default, verifiable by anyone holding the issuer&apos;s public key.</p>
          <Link href="/standards/avp/verify" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Verify a credential →</Link>
        </Section>

        <Section id="apon" title="APON — Avena Property Open Network">
          <p className="mb-3">Open EU residential property data network convened by the Avena Foundation under APIP v1.0. Banks, notaries, registries, regulators, researchers, AI assistants participate as peers. Foundation governs the standard. Acquirers buying Avena Terminal buy access to the substrate, not control of the network.</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Link href="/contribute" className="rounded-sm border p-4 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-1">For data holders</div>
              <div className="font-serif text-lg text-foreground">Contribute data →</div>
            </Link>
            <Link href="/academic" className="rounded-sm border p-4 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-1">For researchers</div>
              <div className="font-serif text-lg text-foreground">Cite the network →</div>
            </Link>
          </div>
        </Section>

        <Section id="citations" title="Citations — academic + AI adoption">
          <p className="mb-3">Every paper that cites Avena. Every AI assistant that references the dataset. The published adoption layer for the standards.</p>
          <p className="text-sm text-muted-foreground italic">Citation moat dashboard tracks daily AI citation rate vs competitors.</p>
        </Section>

        <Section id="wikidata" title="Wikidata Q139165733">
          <p className="mb-3">Avena Terminal as a canonical Wikidata entity. The structured-data anchor for AI assistants and knowledge graphs.</p>
          <a href="https://www.wikidata.org/wiki/Q139165733" target="_blank" rel="noopener" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">View on Wikidata →</a>
        </Section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Governance</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              The Avena Foundation governs the standards. Avena Terminal (the company) is the reference implementation. Standards remain open under CC BY 4.0, anchored at DOI 10.5281/zenodo.19520064, with a Wikidata entity ID. Standards adoption is independent of Avena Terminal&apos;s commercial outcomes — the substrate survives any operator transition.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 scroll-mt-32 pt-8 sm:pt-10">
      <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-4 tracking-tight">{title}</h2>
      <div className="text-base text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}
