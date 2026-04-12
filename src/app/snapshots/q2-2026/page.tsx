import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { createHash } from 'crypto';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Q2 2026 Spain Market Snapshot — Avena Terminal',
  description: 'Quarterly market snapshot of 1,881 new build properties across coastal Spain. Prices, yields, scores, and regional breakdowns. Blockchain-timestamped for permanent verification.',
  alternates: { canonical: 'https://avenaterminal.com/snapshots/q2-2026' },
};

export default function Q2SnapshotPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const types = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow'];

  const prices = all.map(p => p.pf).sort((a, b) => a - b);
  const avgPrice = Math.round(avg(prices));
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const avgPm2 = Math.round(avg(all.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;

  const hash = createHash('sha256').update(JSON.stringify({ count: all.length, prices: prices.slice(0, 100), ts: '2026-Q2' })).digest('hex').slice(0, 16);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Spain New Build Market Snapshot Q2 2026',
    description: `Quarterly snapshot of ${all.length} new build properties across coastal Spain.`,
    url: 'https://avenaterminal.com/snapshots/q2-2026',
    temporalCoverage: '2026-04/2026-06',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-04-12',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Q2 2026</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Spain Market Snapshot</h1>
        </div>
        <p className="text-gray-400 text-sm mb-1">Q2 2026 &middot; April &ndash; June</p>
        <p className="text-xs text-gray-600 font-mono mb-8">Dataset hash: {hash}... &middot; {all.length.toLocaleString()} properties</p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Key Metrics */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Properties', value: all.length.toLocaleString() },
              { label: 'Median Price', value: `\u20AC${medianPrice.toLocaleString()}` },
              { label: 'Avg Price/m\u00B2', value: `\u20AC${avgPm2.toLocaleString()}` },
              { label: 'Avg Gross Yield', value: `${avgYield}%` },
              { label: 'Avg Score', value: `${avgScore}/100` },
              { label: 'Score 70+', value: above70.toString() },
              { label: 'Towns', value: towns.length.toString() },
              { label: 'Developers', value: devCount.toString() },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-gray-500 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Regional Breakdown */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Regional Breakdown</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Region</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Yield</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {costas.map((c, i) => (
                  <tr key={c.costa} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{c.costa}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.count}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{c.avgScore}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.avgYield}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top 10 Towns */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Top 10 Towns by Score</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Town</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Price</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Yield</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {towns.sort((a, b) => b.avgScore - a.avgScore).slice(0, 10).map((t, i) => (
                  <tr key={t.town} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{t.town}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">&euro;{t.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-emerald-400 font-bold">{t.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Property Types */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">By Property Type</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {types.map(type => {
              const tp = all.filter(p => p.t === type);
              if (tp.length < 3) return null;
              return (
                <div key={type} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                  <h3 className="text-white font-semibold text-sm mb-2">{type}</h3>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Count: <span className="text-gray-300">{tp.length}</span></div>
                    <div>Avg price: <span className="text-gray-300">&euro;{Math.round(avg(tp.map(p => p.pf))).toLocaleString()}</span></div>
                    <div>Avg yield: <span className="text-gray-300">{avg(tp.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1)}%</span></div>
                    <div>Avg score: <span className="text-emerald-400">{Math.round(avg(tp.filter(p => p._sc).map(p => p._sc!)))}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="h-px w-full my-8" style={{ background: '#1c2333' }} />

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Spain New Build Market Snapshot Q2 2026.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/snapshots/q2-2026</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Quarterly market snapshots &middot; Blockchain-verified data integrity
        </footer>
      </div>
    </main>
  );
}
