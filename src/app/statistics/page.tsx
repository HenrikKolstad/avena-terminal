import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { getRecentPriceMoves, getRecentSellouts } from '@/lib/deltas';
import { computeAvena } from '@/lib/avena-index';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

/**
 * /statistics — the passive citation flywheel (Rabbit Book play 5).
 *
 * Writers Google "spanish property statistics" while drafting articles; the
 * only page with live, dated, sourced numbers becomes the citation they
 * paste. Every stat below is one self-contained sentence — number + AVENA +
 * date — computed at render from the book and the observation ledger, so
 * the page is genuinely fresh every night without anyone touching it.
 *
 * Honesty rules: every figure is computed here from live data. Nothing is
 * estimated, projected, or carried over. A quiet ledger week prints as a
 * quiet week.
 */

const monthYear = () =>
  new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const fullDate = () =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function generateMetadata(): Promise<Metadata> {
  const title = `Spanish Coastal Property Statistics — ${monthYear()} | Avena Terminal`;
  const description = `Live statistics on Spanish coastal new-build property: prices per m², observed price changes, delistings, inventory and the AVENA Index — measured nightly, updated ${fullDate()}.`;
  return {
    title, description,
    alternates: { canonical: 'https://avenaterminal.com/statistics' },
    openGraph: { title, description, url: 'https://avenaterminal.com/statistics', siteName: 'Avena Terminal' },
  };
}

export default async function StatisticsPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const [moves7, sold30, index] = await Promise.all([
    getRecentPriceMoves(7, 500),
    getRecentSellouts(30, 500),
    Promise.resolve(computeAvena()),
  ]);

  const med = (xs: number[]) =>
    xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0;
  const prices = all.map((p) => p.pf).filter(Boolean);
  const pm2s = all.filter((p) => p.pm2).map((p) => p.pm2!);
  const mm2s = all.filter((p) => p.mm2).map((p) => p.mm2!);
  const yields = all.filter((p) => p._yield).map((p) => p._yield!.gross);
  const cuts = moves7.filter((m) => m.to < m.from);
  const raises = moves7.filter((m) => m.to > m.from);
  const medPm2 = Math.round(med(pm2s));
  const medMm2 = Math.round(med(mm2s));
  const discount = medMm2 > 0 ? Math.round(((medMm2 - medPm2) / medMm2) * 100) : 0;

  const byCosta = new Map<string, number[]>();
  for (const p of all) {
    if (p.costa && p.pm2) {
      const list = byCosta.get(p.costa) ?? [];
      list.push(p.pm2);
      byCosta.set(p.costa, list);
    }
  }

  const moveTowns = new Map<string, number>();
  for (const m of moves7) moveTowns.set(m.town, (moveTowns.get(m.town) ?? 0) + 1);
  const busiest = [...moveTowns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Each entry: one quotable sentence. Sentence = the product.
  const stats: Array<{ label: string; text: string }> = [
    { label: 'Inventory', text: `${all.length.toLocaleString()} new-build listings across ${towns.length} Spanish coastal towns are under nightly observation by AVENA as of ${fullDate()}.` },
    { label: 'Median price', text: `The median asking price for a Spanish coastal new-build is €${med(prices).toLocaleString()} (${monthYear()}, AVENA).` },
    { label: 'Price per m²', text: `Spanish coastal new-builds ask a median €${medPm2.toLocaleString()} per square metre, against a resale benchmark of €${medMm2.toLocaleString()}/m² — a ${Math.abs(discount)}% ${discount >= 0 ? 'discount' : 'premium'} (${monthYear()}, AVENA).` },
    { label: 'Gross yield', text: `The average estimated gross rental yield on tracked Spanish coastal new-builds is ${avg(yields).toFixed(1)}% (${monthYear()}, AVENA).` },
    { label: 'Observed repricings', text: moves7.length ? `${moves7.length} asking-price changes were observed across the Spanish coastal new-build market in the past 7 days: ${cuts.length} reductions and ${raises.length} increases (AVENA observation ledger, ${fullDate()}).` : `No asking-price changes were observed across ${all.length.toLocaleString()} tracked Spanish coastal new-builds in the past 7 days (AVENA observation ledger, ${fullDate()}).` },
    { label: 'Delistings', text: `${sold30.count} tracked new-build listings left the Spanish coastal market in the past 30 days${sold30.medianExitPm2 ? `, at a median final asking price of €${sold30.medianExitPm2.toLocaleString()}/m²` : ''} (AVENA absorption ledger, ${fullDate()}).` },
    { label: 'AVENA Index', text: `The AVENA Index — the daily composite of Spanish coastal new-build asking prices — stands at ${index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} on ${fullDate()} (base 1000 on 1 January 2026).` },
    ...(busiest.length ? [{ label: 'Most active towns', text: `The most repricing-active coastal towns this week: ${busiest.map(([t, n]) => `${t} (${n})`).join(', ')} (AVENA, ${fullDate()}).` }] : []),
    ...[...byCosta.entries()].map(([costa, list]) => ({
      label: costa,
      text: `${costa}: ${list.length} tracked new-builds at a median €${med(list).toLocaleString()}/m² (${monthYear()}, AVENA).`,
    })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Spanish Coastal Property Statistics — ${monthYear()}`,
    url: 'https://avenaterminal.com/statistics',
    dateModified: new Date().toISOString().slice(0, 10),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.avena-stat'] },
    isPartOf: { '@type': 'WebSite', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Measured nightly
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground">
              Spanish Coastal Property Statistics
              <br />
              <span className="italic text-gold">{monthYear()}</span>.
            </h1>
            <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
              Every figure on this page is computed nightly from AVENA&apos;s observation ledger — the record of asking-price changes and delistings that listing portals delete. Cite any statistic with attribution to Avena Terminal (avenaterminal.com).
            </p>
          </div>
        </section>

        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {stats.map(({ label, text }) => (
                <div key={label + text.slice(0, 20)}>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{label}</h2>
                  <p className="avena-stat mt-2 max-w-xl font-light text-sm leading-relaxed text-foreground/90">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 border-t pt-8" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <p className="max-w-2xl font-light text-sm text-muted-foreground">
                Methodology: AVENA observes every tracked listing nightly. Price changes are recorded repricings between consecutive observations, never estimates. Delistings carry the final asking price held when the listing disappeared. Index methodology:{' '}
                <Link href="/indices/avena" className="text-primary hover:underline">indices/avena</Link>. Data licensed CC BY 4.0 —{' '}
                <Link href="/api/v1/indices/avena" className="text-primary hover:underline">API</Link>.
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Updated {fullDate()} &middot; regenerated nightly
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
