/**
 * /prices — the data, in buyer language. One row per town: what things
 * actually ask per m², how many listings, median price. Tap a town to see
 * the spread and check a property there.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { FrontNav, FrontFooter } from '@/components/front/FrontNav';
import { getAllProperties, slugify } from '@/lib/properties';
import { buildTownAggregates } from '@/lib/open-dataset';
import { fmtEur } from '@/lib/check';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Prices by town — Spanish coast new-builds · Avena',
  description: 'Median asking price per m² for new-builds in every town on the Costa Blanca, Costa Cálida and Costa del Sol, updated daily.',
  alternates: { canonical: 'https://avenaterminal.com/prices' },
};

export default function PricesPage() {
  const towns = buildTownAggregates(getAllProperties(), 5).sort((a, b) => b.n_listings - a.n_listings);
  const muted = 'hsl(var(--av-muted-foreground))';
  const gold = 'hsl(var(--av-primary))';

  return (
    <div className="avena-v2 min-h-screen">
      <FrontNav />
      <main className="av-clean mx-auto max-w-[900px] px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px w-10" style={{ background: gold }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: gold }}>Asking prices · new-builds · updated daily</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-[-0.02em] text-foreground mb-2">Prices by town</h1>
        <p className="mb-8 text-sm" style={{ color: muted }}>Median asking price per m². Tap a town for the spread and to check a property there.</p>

        {/* Desktop table */}
        <table className="hidden lg:table w-full text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: muted }}>
              <th className="py-2 text-left font-normal">Town</th>
              <th className="py-2 text-left font-normal">Coast</th>
              <th className="py-2 text-right font-normal">€/m²</th>
              <th className="py-2 text-right font-normal">Range</th>
              <th className="py-2 text-right font-normal">Median price</th>
              <th className="py-2 text-right font-normal">Listings</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'hsl(var(--av-border))' }}>
            {towns.map((t) => (
              <tr key={t.town} className="hover:bg-[hsl(var(--av-card)/0.5)]">
                <td className="py-3"><Link href={`/prices/${slugify(t.town)}`} className="text-foreground underline-offset-4 hover:underline">{t.town}</Link></td>
                <td className="py-3" style={{ color: muted }}>{t.costa}</td>
                <td className="py-3 text-right font-mono text-foreground">{fmtEur(t.median_pm2_eur)}</td>
                <td className="py-3 text-right font-mono" style={{ color: muted }}>{fmtEur(t.p25_pm2_eur)} – {fmtEur(t.p75_pm2_eur)}</td>
                <td className="py-3 text-right font-mono text-foreground">{fmtEur(t.median_price_eur)}</td>
                <td className="py-3 text-right font-mono" style={{ color: muted }}>{t.n_listings}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <ul className="lg:hidden space-y-3">
          {towns.map((t) => (
            <li key={t.town}>
              <Link href={`/prices/${slugify(t.town)}`} className="block rounded-lg border p-4" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-xl text-foreground">{t.town}</span>
                  <span className="font-mono text-sm text-foreground">{fmtEur(t.median_pm2_eur)}/m²</span>
                </div>
                <div className="mt-1 font-mono text-[11px]" style={{ color: muted }}>{t.costa} · {t.n_listings} listings · median {fmtEur(t.median_price_eur)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <FrontFooter />
    </div>
  );
}
