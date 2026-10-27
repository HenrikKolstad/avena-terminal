/**
 * /prices/[town] — one town: the spread of asking €/m² by type, and the
 * check form prefilled so a buyer can test a listing here in one step.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FrontNav, FrontFooter } from '@/components/front/FrontNav';
import { CheckForm } from '@/components/front/CheckForm';
import { getAllProperties, slugify } from '@/lib/properties';
import { buildTownAggregates } from '@/lib/open-dataset';
import { fmtEur, listTownsForClient } from '@/lib/check';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ town: string }> };

function findTown(slug: string) {
  return buildTownAggregates(getAllProperties(), 5).find((t) => slugify(t.town) === slug) ?? null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { town } = await params;
  const t = findTown(town);
  if (!t) return { title: 'Prices · Avena' };
  return {
    title: `${t.town} new-build prices — ${fmtEur(t.median_pm2_eur)}/m² · Avena`,
    description: `Median asking price for new-builds in ${t.town}: ${fmtEur(t.median_pm2_eur)} per m² across ${t.n_listings} listings. Check any listing in ${t.town} for free.`,
    alternates: { canonical: `https://avenaterminal.com/prices/${town}` },
  };
}

export default async function TownPricesPage({ params }: Props) {
  const { town } = await params;
  const t = findTown(town);
  if (!t) notFound();

  const props = getAllProperties().filter((p) => (p.l || '').split(',')[0].trim() === t.town);
  const byType = new Map<string, number[]>();
  for (const p of props) {
    if (!p.pm2 || p.pm2 <= 0) continue;
    if (!byType.has(p.t)) byType.set(p.t, []);
    byType.get(p.t)!.push(p.pm2);
  }
  const typeRows = [...byType.entries()]
    .filter(([, v]) => v.length >= 3)
    .map(([type, v]) => ({ type, n: v.length, pm2: Math.round(median(v)) }))
    .sort((a, b) => b.n - a.n);

  const muted = 'hsl(var(--av-muted-foreground))';
  const gold = 'hsl(var(--av-primary))';

  return (
    <div className="avena-v2 min-h-screen">
      <FrontNav />
      <main className="av-clean mx-auto max-w-[760px] px-4 sm:px-6 pt-24 pb-16">
        <Link href="/prices" className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: muted }}>← All towns</Link>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-light tracking-[-0.02em] text-foreground">{t.town}</h1>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: muted }}>{t.costa} · {t.n_listings} new-build listings</div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Median €/m²', fmtEur(t.median_pm2_eur)],
            ['Typical range', `${fmtEur(t.p25_pm2_eur)} – ${fmtEur(t.p75_pm2_eur)}`],
            ['Median price', fmtEur(t.median_price_eur)],
            ['Median size', `${t.median_built_m2} m²`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border p-4" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: muted }}>{k}</div>
              <div className="mt-1 font-mono text-[15px] text-foreground">{v}</div>
            </div>
          ))}
        </div>

        {typeRows.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8" style={{ background: gold }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: gold }}>By type</span>
            </div>
            <ul className="divide-y" style={{ borderColor: 'hsl(var(--av-border))' }}>
              {typeRows.map((r) => (
                <li key={r.type} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-foreground">{r.type} <span className="font-mono text-[11px]" style={{ color: muted }}>· {r.n}</span></span>
                  <span className="font-mono text-foreground">{fmtEur(r.pm2)}/m²</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 rounded-xl border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-card) / 0.5)' }}>
          <h2 className="font-serif text-2xl font-light text-foreground mb-4">Check a listing in {t.town}</h2>
          <CheckForm towns={listTownsForClient()} prefillTown={t.town} compact />
        </div>
      </main>
      <FrontFooter />
    </div>
  );
}
