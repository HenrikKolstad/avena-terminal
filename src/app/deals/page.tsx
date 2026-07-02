/**
 * /deals — the standalone deals page (restored 2026-06-24).
 *
 * The niche Spanish coastal new-build investment deals, scored daily on
 * the open Avena Score. Historically this lived only as the homepage
 * #deals section with /deals 301-redirecting to it; Henrik wanted the
 * dedicated page back, so /deals is now a real page (redirect removed)
 * reusing the same live FeaturedDeals + AlphaOfTheWeek surfaces.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { HeroBadge } from '@/components/v2/HeroInstrument';
import { MarketTicker } from '@/components/v2/MarketTicker';
import { AlphaOfTheWeek } from '@/components/v2/AlphaOfTheWeek';
import { FeaturedDeals } from '@/app/preview/_components/FeaturedDeals';

export const revalidate = 21600; // re-rendered through the day

export const metadata: Metadata = {
  title: 'Deals · scored Spanish coastal property, daily · Avena Terminal',
  description:
    'Live new-build property deals across Spanish coastal markets, each scored 0-100 on the open Avena Score. Discount-to-market, rental yield and six-figure savings surfaced daily. Find the deals the market has not priced in.',
  alternates: { canonical: 'https://avenaterminal.com/deals' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Avena Terminal — Live Property Deals',
  description:
    'Scored new-build investment deals across Spanish coastal markets, refreshed daily on the open Avena Score methodology.',
  url: 'https://avenaterminal.com/deals',
  isPartOf: { '@type': 'WebSite', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

export default function DealsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <MarketTicker />
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-6 sm:pb-10">
          <div className="mb-5">
            <HeroBadge>Live deals · scored daily · Avena Score 0–100</HeroBadge>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            Find the deals the market hasn&apos;t priced in.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every new-build property indexed daily across Spanish coastal markets and scored 0–100 on the open Avena Score methodology — discount-to-market, rental yield, developer quality and completion risk in a single number. Average operator saving: €130,000 vs market reference. Re-scored daily.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            <Link href="/methodology" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>How the score works →</Link>
            <Link href="/terminal" className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>Open the terminal →</Link>
          </div>
        </section>

        <FeaturedDeals />
        <div className="section-defer"><AlphaOfTheWeek /></div>
      </main>
      <Footer />
    </>
  );
}
