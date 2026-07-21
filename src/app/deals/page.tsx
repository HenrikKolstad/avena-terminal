/**
 * /deals — the full ranked book, MARE register (2026-07-20).
 *
 * A shorter cinematic band, the live ticker, then the complete top-50
 * table with the same PRO gating economics as before (first rows clear,
 * the rest behind the unlock). Same shared math as every other surface.
 */

import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LuxuryRankings } from '@/components/mare/LuxuryRankings';
import { PrivateOffice } from '@/components/mare/Sections';
import { getTopDeals } from '@/lib/deals';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Deals · the week\'s underpriced coastal homes, ranked · Avena',
  description: 'The complete ranked book: every top-scored new-build on the Spanish coast with discount-to-market, market value and savings. Re-scored daily on the open Avena Score.',
  alternates: { canonical: 'https://avenaterminal.com/deals' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Avena — Ranked Coastal Property Deals',
  description: 'Scored new-build investment deals across Spanish coastal markets, ranked daily on the open Avena Score methodology.',
  url: 'https://avenaterminal.com/deals',
  isPartOf: { '@type': 'WebSite', name: 'Avena', url: 'https://avenaterminal.com' },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

export default function DealsPage() {
  const deals = getTopDeals(50);
  const total = getAllProperties().length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="av-clean min-h-screen pt-16">
        {/* Cinematic band */}
        <section className="relative h-[72svh] min-h-[520px] overflow-hidden">
          <div className="absolute inset-0 av-slow-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mare/hero.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(var(--av-background) / 0.75), hsl(var(--av-background) / 0.25) 45%, hsl(var(--av-background)) 100%)' }} />
          <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-20 sm:px-8 lg:px-12">
            <div className="av-fade-up">
              <div className="mb-5 flex items-center gap-4">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-gold">The full book · re-scored daily</span>
              </div>
              <h1 className="font-serif font-light leading-[1.04] tracking-[-0.02em] text-foreground" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
                Every ranked deal, <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>in one ledger.</em>
              </h1>
            </div>
          </div>
        </section>


        <LuxuryRankings
          deals={deals}
          total={total}
          freeVisible={3}
          eyebrow="Live rankings · the complete top 50"
          titleA="The"
          titleEm="underpriced"
          titleB="fifty."
        />

        <PrivateOffice />
      </main>
      <Footer />
    </>
  );
}
