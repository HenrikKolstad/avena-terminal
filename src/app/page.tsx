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
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-20 lg:pt-24 pb-10 sm:pb-16">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] text-gold mb-3 sm:mb-4 break-words leading-relaxed">
            European residential property · live · open · DOI 10.5281/zenodo.19520064
          </div>

          {/* RICS Tech Partner badge — hand-crafted, restored 2026-06-07 */}
          <RICSBadge />

          <h1 className="font-serif text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-light text-foreground mb-5 sm:mb-6 leading-[1.06] max-w-[1100px] tracking-tight">
            Europe&apos;s deepest technical data infrastructure for property.
          </h1>
          <p className="max-w-3xl text-[15px] sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-7 sm:mb-8">
            We built the data, the indices, the identity layer, and the intelligence. Live across 27 EU markets, open under APIP v1.0, cryptographically verifiable, and cited by the AI assistants every institutional buyer consults.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3">
            <Link
              href="/terminal"
              className="inline-flex items-center justify-center gap-2 rounded-sm px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Explore the Terminal →
            </Link>
            <Link
              href="/institutional"
              className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              Institutional access →
            </Link>
            <Link
              href="/proof"
              className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              View the proof →
            </Link>
          </div>

          {/* Subtle gold accent line */}
          <div className="mt-10 sm:mt-16 h-px w-20 sm:w-24" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
        </section>

        {/* Four pillars — one screen per pillar */}
        <section className="section-tinted">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-20">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-4 sm:mb-6">
            Four pillars of evidence
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-4">
            <Pillar
              number="01"
              title="Data"
              body="Live across 27 EU markets. Eurostat, ECB SDW, INE Spain, national statistical agencies. Daily refresh. APIP v1.0 open standard. CC BY 4.0."
              href="/proof"
              link="View coverage"
            />
            <Pillar
              number="02"
              title="Indices"
              body="AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT. The Avena Property Cycle Index. Hedonic OLS AVM. Counterpart developer credit graph."
              href="/institutional"
              link="View indices"
            />
            <Pillar
              number="03"
              title="Identity"
              body="AVN-ID Registry — the ISIN of European property. Signed credential chain on every property. Ed25519 attestations from notaries, registries, valuers."
              href="/standards"
              link="View standards"
            />
            <Pillar
              number="04"
              title="Intelligence"
              body="Precursor regulatory signals. Genesis Monte Carlo scenarios. Counterpart developer stress. Sovereign Briefing. Policy Engine. Every signal sourced and time-stamped."
              href="/intelligence"
              link="View intelligence"
            />
          </div>
        </div>
        </section>

        {/* Live deals — niche Spanish coastal investment deals.
            Anchor target for the /deals 301 redirect. */}
        <section id="deals" className="border-t scroll-mt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-16 pb-6 sm:pb-10">
            <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
              Live deals · scored daily · Avena Score 0-100
            </div>
            <h2 className="font-serif text-[1.75rem] sm:text-4xl md:text-5xl font-light text-foreground mb-3 sm:mb-4 leading-[1.06] tracking-tight">
              Find the deals the market hasn&apos;t priced in.
            </h2>
            <p className="max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every new-build property indexed daily across Spanish coastal markets, scored 0-100 on the open Avena Score methodology. Average operator saving: €130,000 vs market reference. Refreshed every 6 hours.
            </p>
          </div>
          <FeaturedDeals />
          <div className="section-defer"><AlphaOfTheWeek /></div>
        </section>

        {/* Credential strip — methodology DOI, Wikidata, RICS, Zenodo */}
        <section className="border-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
            <CredentialBar />
          </div>
        </section>

        {/* AI citations counter */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
            <LiveCitations variant="banner" />
          </div>
        </section>

        {/* Sub-claim block — three audiences */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            <AudienceBlock
              label="For institutions"
              body="Memo Engine, AVM, Portfolio Risk Simulator, Index Family. Built on one methodology, cryptographically anchored, audit-traceable."
              href="/institutional"
              hrefLabel="/institutional →"
            />
            <AudienceBlock
              label="For developers"
              body="REST API, MCP server, webhooks, SDKs. One key, four institutional use cases. OpenAPI 3.1, CC BY 4.0."
              href="/api"
              hrefLabel="/api →"
            />
            <AudienceBlock
              label="For verifiers"
              body="SHA-256 fingerprints, daily Merkle root, Zenodo trusted timestamp. Cryptographic proof for every artefact Avena ships."
              href="/verify"
              hrefLabel="/verify →"
            />
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
      className="group block rounded-sm border p-5 sm:p-7 lg:p-8 transition-all hover:border-primary hover:-translate-y-0.5 active:translate-y-0"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}
    >
      <div className="flex items-baseline gap-3 mb-2 sm:mb-3">
        <span className="font-mono text-[10px] text-gold tabular">{number}</span>
        <span className="font-serif text-2xl sm:text-3xl font-light text-foreground tracking-tight">{title}</span>
      </div>
      <p className="text-[13.5px] sm:text-base text-foreground/85 leading-relaxed mb-3 sm:mb-4">{body}</p>
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
        {link} <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

/**
 * RICS Tech Partner badge — restored from the original Hero component.
 * Navy serif-metallic-sheen "RICS" block + gold-gradient shimmer
 * "Official Tech Partner · 2026" block with pulse dot and ↗ icon.
 * Links out to rics.org. Hover lifts subtly. Mobile-friendly sizing.
 */
function RICSBadge() {
  return (
    <div className="mb-6">
      <a
        href="https://www.rics.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Official RICS Tech Partner · 2026"
        className="rics-badge group relative inline-flex items-stretch overflow-hidden rounded-sm border transition-all duration-300 hover:-translate-y-px"
        style={{
          borderImage: 'linear-gradient(135deg, hsl(42 85% 64% / 0.7) 0%, hsl(26 88% 62% / 0.4) 50%, hsl(42 85% 64% / 0.7) 100%) 1',
          borderColor: 'hsl(42 85% 64% / 0.55)',
          boxShadow: '0 8px 30px -10px hsl(42 85% 64% / 0.45), 0 0 0 1px hsl(42 85% 64% / 0.1) inset',
        }}
      >
        {/* RICS mark block — navy, serif, metallic sheen */}
        <span
          className="relative flex items-center px-3 py-2 border-r overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0B2240 0%, #1a3a6b 50%, #0B2240 100%)',
            borderColor: 'hsl(42 85% 64% / 0.55)',
          }}
        >
          <span
            className="font-serif font-bold leading-none"
            style={{
              fontSize: 13,
              letterSpacing: '0.18em',
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #d8d4cb 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            RICS
          </span>
        </span>

        {/* Partner block — gold gradient text, shimmer sweep */}
        <span
          className="relative flex items-center gap-2 px-3 py-2 font-mono uppercase overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(42 85% 64% / 0.14) 0%, hsl(26 88% 62% / 0.10) 100%)',
            fontSize: 10,
            letterSpacing: '0.32em',
          }}
        >
          <span
            aria-hidden="true"
            className="rics-shimmer pointer-events-none absolute inset-0"
          />
          <span
            className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: 'hsl(42 85% 64%)' }}
          />
          <span
            className="relative font-bold"
            style={{
              backgroundImage: 'linear-gradient(135deg, hsl(42 85% 70%) 0%, hsl(40 95% 78%) 35%, hsl(26 88% 62%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            Official Tech Partner
          </span>
          <span className="relative opacity-40" style={{ color: 'hsl(42 85% 64%)' }}>·</span>
          <span className="relative text-foreground/90 font-bold">2026</span>
          <span className="relative opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: 'hsl(42 85% 64%)' }}>↗</span>
        </span>
      </a>
    </div>
  );
}

function AudienceBlock({ label, body, href, hrefLabel }: { label: string; body: string; href: string; hrefLabel: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-2">{label}</div>
      <p className="text-sm sm:text-base text-foreground/85 leading-relaxed mb-3">{body}</p>
      <Link href={href} className="inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
        {hrefLabel}
      </Link>
    </div>
  );
}
