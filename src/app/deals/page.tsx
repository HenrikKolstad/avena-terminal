/**
 * /deals — the full ranked book, MARE register (2026-07-20).
 *
 * A shorter cinematic band, the live ticker, then the complete top-50
 * table with the same PRO gating economics as before (first rows clear,
 * the rest behind the unlock). Same shared math as every other surface.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LuxuryRankings } from '@/components/mare/LuxuryRankings';
import { PrivateOffice } from '@/components/mare/Sections';
import { getTopDeals } from '@/lib/deals';
import { getAllProperties } from '@/lib/properties';
import { getRecentPriceMoves } from '@/lib/deltas';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Deals · the week\'s underpriced coastal homes, ranked · Avena',
  description: 'The complete ranked book: every top-scored new-build on the Spanish coast, plus this week\'s new listings and real price reductions from Avena\'s daily price history. Re-scored every night.',
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

export default async function DealsPage() {
  const deals = getTopDeals(50);
  const all = getAllProperties();
  const total = all.length;

  // Living-market data on the EXISTING page (Henrik: no new public URLs).
  // "New this week" from the feed's real first-seen dates; price movements
  // from the nightly ledger — content no competitor can reproduce, changing
  // daily on the site's most-linked commercial page.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const newThisWeek = all
    .filter((p) => p.ref && p._added && p._added >= weekAgo)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const priceMoves = await getRecentPriceMoves(7, 6);
  const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="av-clean min-h-screen">
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
                <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-gold">Live Rankings · Top by Avena Score</span>
              </div>
              <h1 className="font-serif font-light leading-[1.04] tracking-[-0.02em] text-foreground" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
                The week's <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>underpriced</em> homes.
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

        {/* New this week — real first-seen dates from the feed */}
        {newThisWeek.length > 0 && (
          <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
                New this week · {newThisWeek.length} listings entered the feed
              </span>
              <h2 className="mt-5 font-serif text-3xl font-light tracking-[-0.02em] text-foreground md:text-4xl">
                Fresh on the market.
              </h2>
              <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {newThisWeek.slice(0, 9).map((p) => (
                  <li key={p.ref}>
                    <Link
                      href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                      className="flex items-baseline justify-between gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-[hsl(var(--av-surface)/0.5)]"
                    >
                      <span className="min-w-0 truncate font-serif text-sm font-light text-foreground/85">{p.p}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular text-muted-foreground">
                        {(p.l || '').split(',')[0]} · €{fmt(Math.round(p.pf))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Price movements — from the nightly price-history ledger */}
        {priceMoves.length > 0 && (
          <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
                Price movements · last 7 days · from Avena&apos;s daily price history
              </span>
              <h2 className="mt-5 font-serif text-3xl font-light tracking-[-0.02em] text-foreground md:text-4xl">
                What moved this week.
              </h2>
              <div className="mt-8 overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
                {priceMoves.map((m, i) => {
                  const pct = Math.round(((m.to - m.from) / m.from) * 100);
                  return (
                    <Link
                      key={m.ref}
                      href={`/property/${encodeURIComponent(m.ref)}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--av-surface)/0.5)] sm:grid-cols-[1fr_1fr_auto_auto]"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{m.town}</span>
                      <span className="hidden font-serif text-sm font-light text-foreground/85 sm:block">
                        €{fmt(m.from)} → €{fmt(m.to)}
                      </span>
                      <span className="font-mono text-sm" style={{ color: pct < 0 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground) / 0.6)' }}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">{m.date ?? 'logged'}</span>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Recorded nightly by the Avena Engine — the source feeds keep no price history.{' '}
                <Link href="/engine" className="text-gold hover:underline">How it works →</Link>
              </p>
            </div>
          </section>
        )}

        <PrivateOffice />
      </main>
      <Footer />
    </>
  );
}
