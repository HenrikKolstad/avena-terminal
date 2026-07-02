/**
 * Homepage — deals-first (restored 2026-06-24).
 *
 * Henrik wanted the deals experience back as the homepage: the scored
 * Spanish coastal new-build deals are the FIRST thing a visitor sees,
 * as they were before the Great Consolidation. The institutional proof
 * (the one claim, four pillars, DELPHI/PLAB, credential bar) is retained
 * below the fold — the homepage still carries the site's link equity and
 * positioning, just under the deals that hook the visitor.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CredentialBar } from '@/components/v2/CredentialBar';
import { LiveCitations } from '@/components/v2/LiveCitations';
import { AlphaOfTheWeek } from '@/components/v2/AlphaOfTheWeek';
import { MarketTicker } from '@/components/v2/MarketTicker';
import { HeroSpotlight } from '@/components/v2/HeroSpotlight';
import { FeaturedDeals } from './preview/_components/FeaturedDeals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Avena Terminal — Live scored European property deals, daily',
  description: "Find the property deals the market hasn't priced in: new builds across Spanish coastal markets scored 0-100 on the open Avena Score, refreshed daily. Built on Europe's deepest technical data infrastructure for property. DOI 10.5281/zenodo.19520064.",
  alternates: { canonical: 'https://avenaterminal.com' },
  openGraph: {
    title: 'Avena Terminal — Live scored European property deals, daily',
    description: "Scored Spanish coastal new-build deals, refreshed daily on the open Avena Score. Built on Europe's deepest technical property data infrastructure.",
    url: 'https://avenaterminal.com',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Avena Terminal — Live scored European property deals, daily',
    description: "Scored Spanish coastal new-build deals, refreshed daily. Built on Europe's deepest technical property data infrastructure.",
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
    <div className="avena-v2 relative min-h-screen w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        {/* Live market strip — real DELPHI/PLAB/regional figures */}
        <MarketTicker />

        {/* Deals hero — the first thing every visitor sees (restored 2026-06-24) */}
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-16 pb-6 sm:pb-10">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] text-gold mb-3 sm:mb-4 break-words leading-relaxed">
                Live deals · scored daily · Avena Score 0–100 · DOI 10.5281/zenodo.19520064
              </div>

              {/* RICS Tech Partner badge — hand-crafted, restored 2026-06-07 */}
              <RICSBadge />

              <h1 className="font-serif text-[2rem] sm:text-5xl md:text-6xl lg:text-[4.2rem] font-light text-foreground mb-5 sm:mb-6 leading-[1.06] tracking-tight">
                Find the deals the market hasn&apos;t priced in.
              </h1>
              <p className="max-w-2xl text-[15px] sm:text-lg text-muted-foreground leading-relaxed mb-7 sm:mb-8">
                Every new-build property indexed daily across Spanish coastal markets and scored 0–100 on the open Avena Score — discount-to-market, rental yield, developer quality and completion risk in a single number. Average operator saving: €130,000 vs market reference. Re-scored daily.
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
                  href="/methodology"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  How the score works →
                </Link>
                <Link
                  href="/institutional"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  Institutional access →
                </Link>
              </div>
            </div>

            {/* Today's #1 deal — the product itself, in the hero */}
            <div>
              <HeroSpotlight />
            </div>
          </div>
        </section>

        {/* The deals themselves — top-50 scored new builds (component owns id="deals") */}
        <FeaturedDeals />
        <div className="section-defer"><AlphaOfTheWeek /></div>

        {/* Institutional positioning — the one claim, four pillars (now below the deals) */}
        <section className="section-tinted">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-20">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-3 sm:mb-4">
            What sits beneath the deals
          </div>
          <h2 className="font-serif text-[1.75rem] sm:text-4xl md:text-5xl font-light text-foreground mb-3 sm:mb-4 leading-[1.06] tracking-tight max-w-[1000px]">
            Europe&apos;s deepest technical data infrastructure for property.
          </h2>
          <p className="max-w-3xl text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-8 sm:mb-10">
            Every score above is computed on data, indices, an identity layer and an intelligence stack we built ourselves. Live across 27 EU markets, open under APIP v1.0, cryptographically verifiable, and cited by the AI assistants every institutional buyer consults.
          </p>
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

        {/* Two world firsts — PLAB + DELPHI. The homepage carries the
            site's highest link equity; the instruments no one else has
            belong on it. */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold">Two world firsts · live daily</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-4">
              <Link
                href="/delphi"
                className="group rounded-sm border p-5 sm:p-7 transition-colors hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-primary) / 0.35)', background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.06) 0%, transparent 60%)' }}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mb-2">DELPHI</div>
                <div className="font-serif text-xl sm:text-2xl font-light text-foreground leading-snug mb-2">The daily AI panel on European property</div>
                <p className="text-sm text-muted-foreground leading-relaxed">Every day, frontier AI models answer the same forward questions. Consensus, disagreement, drift — the first longitudinal record of machine beliefs about a real asset class. No one can rebuild it retroactively.</p>
                <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-gold group-hover:translate-x-1 transition-transform">View today&apos;s panel →</span>
              </Link>
              <Link
                href="/benchmark"
                className="group rounded-sm border p-5 sm:p-7 transition-colors hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mb-2">PLAB</div>
                <div className="font-serif text-xl sm:text-2xl font-light text-foreground leading-snug mb-2">The European Property AI Benchmark</div>
                <p className="text-sm text-muted-foreground leading-relaxed">Major AI models scored daily on a fixed bank of European property and finance facts, against public institutional ground truths. Avena publishes the scoreboard — and never plays on it.</p>
                <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-gold group-hover:translate-x-1 transition-transform">View the leaderboard →</span>
              </Link>
            </div>
          </div>
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
