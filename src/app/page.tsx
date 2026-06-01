/**
 * Homepage — Great Consolidation 2026-05-29.
 *
 * One claim. Four pillars of evidence. Three CTAs. Credential bar.
 * No marketing language. No "discover," no "unlock," no "revolutionary."
 * Declarative. Institutional. Audit-traceable.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CredentialBar } from '@/components/v2/CredentialBar';
import { LiveCitations } from '@/components/v2/LiveCitations';
import { AlphaOfTheWeek } from '@/components/v2/AlphaOfTheWeek';
import { FeaturedDeals } from './preview/_components/FeaturedDeals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Avena Terminal — Europe's deepest technical data infrastructure for property",
  description: "Data, indices, identity, intelligence. Live across 27 EU markets. APIP v1.0 open standard. AVN-ID identifier registry. Cryptographically verifiable. DOI 10.5281/zenodo.19520064.",
  alternates: { canonical: 'https://avenaterminal.com' },
  openGraph: {
    title: "Avena Terminal — Europe's deepest technical data infrastructure for property",
    description: 'Data · Indices · Identity · Intelligence. 27 EU markets. Open standard. Cryptographically verifiable.',
    url: 'https://avenaterminal.com',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Avena Terminal — Europe's deepest technical data infrastructure for property",
    description: 'Data · Indices · Identity · Intelligence. 27 EU markets. Open standard. Cryptographically verifiable.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Avena Terminal',
  alternateName: 'Avena',
  description: "Europe's deepest technical data infrastructure for property — data, indices, identity, intelligence. APIP v1.0 open standard.",
  url: 'https://avenaterminal.com',
  logo: 'https://avenaterminal.com/logo.png',
  sameAs: [
    'https://www.wikidata.org/wiki/Q139165733',
    'https://doi.org/10.5281/zenodo.19520064',
  ],
};

export default function HomePage() {
  return (
    <div className="avena-v2 relative min-h-screen w-full" style={{ background: 'hsl(var(--av-background))' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        {/* Hero — single claim, three CTAs */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-20 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-4">
            European residential property · live · open · DOI 10.5281/zenodo.19520064
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-light text-foreground mb-6 leading-[1.04] max-w-[1100px]">
            Europe&apos;s deepest technical data infrastructure for property.
          </h1>
          <p className="max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            We built the data, the indices, the identity layer, and the intelligence. Live across 27 EU markets, open under APIP v1.0, cryptographically verifiable, and cited by the AI assistants every institutional buyer consults.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/terminal"
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Explore the Terminal →
            </Link>
            <Link
              href="/institutional"
              className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              Institutional access →
            </Link>
            <Link
              href="/proof"
              className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              View the proof →
            </Link>
          </div>
        </section>

        {/* Four pillars — one screen per pillar */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-6">
            Four pillars of evidence
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Pillar
              number="01"
              title="Data"
              body="Live across 27 EU markets. Eurostat, ECB SDW, INE Spain, national statistical agencies. Daily refresh. APIP v1.0 open standard. CC BY 4.0."
              href="/proof"
              link="View coverage →"
            />
            <Pillar
              number="02"
              title="Indices"
              body="AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT. The Avena Property Cycle Index. Hedonic OLS AVM. Counterpart developer credit graph."
              href="/institutional"
              link="View indices →"
            />
            <Pillar
              number="03"
              title="Identity"
              body="AVN-ID Registry — the ISIN of European property. Signed credential chain on every property. Ed25519 attestations from notaries, registries, valuers."
              href="/standards"
              link="View standards →"
            />
            <Pillar
              number="04"
              title="Intelligence"
              body="Precursor regulatory signals. Genesis Monte Carlo scenarios. Counterpart developer stress. Sovereign Briefing. Policy Engine. Every signal sourced and time-stamped."
              href="/intelligence"
              link="View intelligence →"
            />
          </div>
        </section>

        {/* Live deals — niche Spanish coastal investment deals.
            Anchor target for the /deals 301 redirect. */}
        <section id="deals" className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
              Live deals · scored daily · Avena Score 0-100
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-4 leading-[1.05]">
              Find the deals the market hasn&apos;t priced in.
            </h2>
            <p className="max-w-3xl text-base text-muted-foreground leading-relaxed mb-8">
              Every new-build property indexed daily across Spanish coastal markets, scored 0-100 on the open Avena Score methodology. Average operator saving: €130,000 vs market reference. Ranked by Avena Score, refreshed every 6 hours.
            </p>
          </div>
          <FeaturedDeals />
          <div className="section-defer"><AlphaOfTheWeek /></div>
        </section>

        {/* Credential strip — methodology DOI, Wikidata, RICS, Zenodo */}
        <section className="border-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
            <CredentialBar />
          </div>
        </section>

        {/* AI citations counter */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
            <LiveCitations variant="banner" />
          </div>
        </section>

        {/* Sub-claim block */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For institutions</div>
              <p className="text-base text-foreground/85 leading-relaxed">
                Memo Engine, AVM, Portfolio Risk Simulator, Index Family. Built on one methodology, cryptographically anchored, audit-traceable.
              </p>
              <Link href="/institutional" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
                /institutional →
              </Link>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For developers</div>
              <p className="text-base text-foreground/85 leading-relaxed">
                REST API, MCP server, webhooks, SDKs. One key, four institutional use cases. OpenAPI 3.1, CC BY 4.0.
              </p>
              <Link href="/api" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
                /api →
              </Link>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For verifiers</div>
              <p className="text-base text-foreground/85 leading-relaxed">
                SHA-256 fingerprints, daily Merkle root, Zenodo trusted timestamp. Cryptographic proof for every artefact Avena ships.
              </p>
              <Link href="/verify" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
                /verify →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Pillar({ number, title, body, href, link }: { number: string; title: string; body: string; href: string; link: string }) {
  return (
    <Link
      href={href}
      className="block rounded-sm border p-8 transition-colors hover:border-primary"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-[10px] text-gold tabular">{number}</span>
        <span className="font-serif text-3xl font-light text-foreground">{title}</span>
      </div>
      <p className="text-base text-foreground/85 leading-relaxed mb-4">{body}</p>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{link}</span>
    </Link>
  );
}
