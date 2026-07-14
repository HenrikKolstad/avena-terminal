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
  title: 'Underpriced Spanish coastal property, scored daily — Avena',
  description: 'Every new-build on the Costa Blanca, Cálida and del Sol, scored on discount-to-market, yield and developer quality. The underpriced ones, surfaced first — with the data to prove it.',
  alternates: { canonical: 'https://avenaterminal.com' },
  openGraph: {
    title: 'Underpriced Spanish coastal property, scored daily — Avena',
    description: 'Every new-build on the Costa Blanca, Cálida and del Sol, scored on discount-to-market, yield and developer quality. The underpriced ones, surfaced first.',
    url: 'https://avenaterminal.com',
    siteName: 'Avena',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Underpriced Spanish coastal property, scored daily — Avena',
    description: 'Every new-build on the Costa Blanca, Cálida and del Sol, scored daily. The underpriced ones, surfaced first.',
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
                Find the coastal homes the market hasn&apos;t priced in.
              </h1>
              <p className="max-w-2xl text-[15px] sm:text-lg text-muted-foreground leading-relaxed mb-7 sm:mb-8">
                Every new-build on the Costa Blanca, Cálida and del Sol, scored on discount-to-market, yield, and developer quality. The underpriced ones, surfaced first — with the data to prove it.
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3">
                <a
                  href="#deals"
                  className="inline-flex items-center justify-center gap-2 rounded-sm px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-gold"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  See this week&apos;s deals →
                </a>
                <Link
                  href="/enquire"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  Enquire →
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 sm:px-6 py-3 sm:py-3.5 font-mono text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  How it works
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

        {/* The engine hook — one confident line, one door. The full
            cathedral (methodology, DELPHI, PLAB, standards, stack) lives
            untouched behind /engine. */}
        <section className="section-tinted">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
                  Why trust the number
                </div>
                <h2 className="font-serif text-[1.6rem] sm:text-3xl md:text-4xl font-light text-foreground mb-4 leading-[1.1] tracking-tight max-w-[820px]">
                  Every score is built on a signed, audited data engine.
                </h2>
                <p className="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Open methodology down to the last weight, cryptographic proof on every artefact, and two world-first AI instruments checking the market daily — Europe&apos;s deepest technical data infrastructure for property, working for one purpose: making the number on each deal trustworthy.
                </p>
              </div>
              <div className="flex lg:justify-end">
                <Link
                  href="/engine"
                  className="group inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-gold transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.35)' }}
                >
                  See how the engine works
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quiet trust markers — credentials + live AI citations */}
        <section className="border-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
            <CredentialBar />
          </div>
        </section>
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
            <LiveCitations variant="banner" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
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

