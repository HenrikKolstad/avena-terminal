/**
 * Homepage — the MARE rollout (2026-07-20).
 *
 * The luxury marketside as the front door: cinematic hero with living
 * pool water, the live ticker, this week's ranked deals, the method
 * statement, the collection plates, the three coasts, and the Private
 * Office (the real enquiry wire). Every number is live from the
 * dataset; every Enquire lands in the agent's inbox.
 */

import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { MarketTicker } from '@/components/v2/MarketTicker';
import { CineHero } from '@/components/mare/CineHero';
import { LuxuryRankings } from '@/components/mare/LuxuryRankings';
import { TownMarquee, Statement, LuxuryCollection, CoastPanels, PrivateOffice } from '@/components/mare/Sections';
import { getTopDeals } from '@/lib/deals';
import { getAllProperties } from '@/lib/properties';

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
  name: 'Avena',
  alternateName: 'Avena Terminal',
  description: 'A deal-finder for underpriced Spanish coastal property, built on Europe\'s deepest technical data infrastructure for property.',
  url: 'https://avenaterminal.com',
  logo: 'https://avenaterminal.com/logo.png',
  sameAs: [
    'https://www.wikidata.org/wiki/Q139165733',
    'https://doi.org/10.5281/zenodo.19520064',
  ],
};

export default function HomePage() {
  const deals = getTopDeals(50);
  const total = getAllProperties().length;

  return (
    <div className="avena-v2 relative min-h-screen w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <CineHero />
        <MarketTicker />
        <LuxuryRankings deals={deals.slice(0, 5)} total={total} seeAllHref="/deals" />
        <TownMarquee />
        <Statement />
        <LuxuryCollection deals={deals.slice(0, 4)} />
        <CoastPanels />
        <PrivateOffice />
      </main>
      <Footer />
    </div>
  );
}
