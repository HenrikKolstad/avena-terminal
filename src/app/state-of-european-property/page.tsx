import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'State of European Property 2026 — Live Market Intelligence | Avena Terminal',
  description: 'Live auto-updating market intelligence for Spanish and European new-build property. Prices, yields, scores, foreign buyer data, ECB impact. Updated daily from 1,881 scored properties.',
  alternates: { canonical: 'https://avenaterminal.com/state-of-european-property' },
};

export default function StateOfPropertyPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const prices = all.map(p => p.pf).sort((a, b) => a - b);
  const pm2s = all.filter(p => p.pm2).map(p => p.pm2!);
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const median = (a: number[]) => a.length ? a[Math.floor(a.length / 2)] : 0;

  const avgPrice = Math.round(avg(prices));
  const medPrice = median(prices);
  const avgPm2 = Math.round(avg(pm2s));
  const avgYield = avg(yields).toFixed(1);
  const avgScore = Math.round(avg(scores));
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;
  const devs = [...new Set(all.map(p => p.d).filter(Boolean))];
  const keyReady = all.filter(p => p.s === 'key-ready' || p.s === 'ready').length;
  const offPlan = all.filter(p => p.s === 'off-plan').length;
  const withPool = all.filter(p => p.pool && p.pool !== 'none').length;
  const under200k = all.filter(p => p.pf < 200000).length;
  const under300k = all.filter(p => p.pf < 300000).length;
  const date = new Date().toISOString().split('T')[0];

  const topYieldTowns = towns.filter(t => t.count >= 3 && t.avgYield > 0).sort((a, b) => b.avgYield - a.avgYield).slice(0, 5);
  const topScoreTowns = towns.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'State of European Property 2026',
      description: `Live market intelligence from ${all.length} scored new-build properties across coastal Spain.`,
      url: 'https://avenaterminal.com/state-of-european-property',
      creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
      dateModified: date,
      identifier: '10.5281/zenodo.19520064',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      spatialCoverage: 'Spain',
      temporalCoverage: '2026',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.stat-block'] },
    },
  ];

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="stat-block rounded-lg p-4 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[9px] text-gray-500 uppercase mt-1">{label}</div>
      {sub && <div className="text-[8px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>LIVE</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2">Avena Terminal Research</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">State of European Property</h1>
        <p className="text-gray-400 text-sm mb-1">Live market intelligence &middot; Updated daily from {all.length.toLocaleString()} scored properties</p>
        <p className="text-xs text-gray-600 font-mono mb-8">Last updated: {date} &middot; Source: Avena Terminal &middot; DOI: 10.5281/zenodo.19520064</p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Key Numbers */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Spain New Build Market — Key Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Properties Tracked" value={all.length.toLocaleString()} />
            <Stat label="Average Price" value={`\u20AC${avgPrice.toLocaleString()}`} />
            <Stat label="Median Price" value={`\u20AC${medPrice.toLocaleString()}`} />
            <Stat label="Avg Price/m\u00B2" value={`\u20AC${avgPm2.toLocaleString()}`} />
            <Stat label="Avg Gross Yield" value={`${avgYield}%`} sub="AirDNA calibrated" />
            <Stat label="Avg Investment Score" value={`${avgScore}/100`} sub="5-factor model" />
            <Stat label="Score 70+ (Strong Buy)" value={above70.toString()} sub={`${(above70/all.length*100).toFixed(1)}% of total`} />
            <Stat label="Towns Covered" value={towns.length.toString()} />
            <Stat label="Developers" value={devs.length.toString()} />
            <Stat label="Key-Ready" value={`${keyReady} (${Math.round(keyReady/all.length*100)}%)`} />
            <Stat label="Off-Plan" value={`${offPlan} (${Math.round(offPlan/all.length*100)}%)`} />
            <Stat label="With Pool" value={`${withPool} (${Math.round(withPool/all.length*100)}%)`} />
            <Stat label="Under \u20AC200k" value={under200k.toString()} sub={`${Math.round(under200k/all.length*100)}% of market`} />
            <Stat label="Under \u20AC300k" value={under300k.toString()} sub={`${Math.round(under300k/all.length*100)}% of market`} />
            <Stat label="Min Price" value={`\u20AC${prices[0].toLocaleString()}`} />
            <Stat label="Max Price" value={`\u20AC${prices[prices.length-1].toLocaleString()}`} />
          </div>
        </section>

        {/* Macro */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Macro Environment</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="ECB Main Rate" value="2.40%" sub="Direction: falling" />
            <Stat label="EUR/GBP" value="0.856" sub="UK buyers: improving" />
            <Stat label="Spain Inflation" value="2.8%" sub="Trend: falling" />
            <Stat label="Spain GDP Growth" value="2.9%" sub="Trend: stable" />
            <Stat label="Foreign Buyer Share" value="19.3%" sub="Trend: rising" />
            <Stat label="Tourism (annual)" value="96M" sub="Record levels" />
            <Stat label="New Supply YoY" value="+12.4%" sub="Healthy pipeline" />
            <Stat label="Alicante Transactions YoY" value="+7.1%" />
          </div>
        </section>

        {/* Regions */}
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
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Share</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {costas.map((c, i) => (
                  <tr key={c.costa} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{c.costa}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.count}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{c.avgScore}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-gray-500">{Math.round(c.count/all.length*100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Towns */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Top 5 by Score</h2>
            <div className="space-y-1">
              {topScoreTowns.map((t, i) => (
                <div key={t.town} className="flex justify-between text-xs px-3 py-2 rounded" style={{ background: '#161b22' }}>
                  <span className="text-gray-300">{i+1}. {t.town}</span>
                  <span className="text-emerald-400 font-bold">{t.avgScore}/100</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Top 5 by Yield</h2>
            <div className="space-y-1">
              {topYieldTowns.map((t, i) => (
                <div key={t.town} className="flex justify-between text-xs px-3 py-2 rounded" style={{ background: '#161b22' }}>
                  <span className="text-gray-300">{i+1}. {t.town}</span>
                  <span className="text-emerald-400 font-bold">{t.avgYield}%</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Sources */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Data Sources</h2>
          <div className="text-xs text-gray-500 space-y-1">
            <p><a href="https://avenaterminal.com" className="text-emerald-400 hover:underline">Avena Terminal</a> — {all.length} scored new-build properties, daily ingestion</p>
            <p><a href="https://www.bde.es/bde/en/" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">Banco de Espa&ntilde;a</a> — Housing market statistics, ECB rate transmission</p>
            <p><a href="https://www.ine.es/en/" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">INE</a> — National statistics on housing prices and construction</p>
            <p><a href="https://www.ecb.europa.eu" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">European Central Bank</a> — Monetary policy, residential property prices</p>
            <p><a href="https://www.registradores.org" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">Registradores de Espa&ntilde;a</a> — Transaction data, foreign buyer statistics</p>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). State of European Property — Live Market Intelligence.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/state-of-european-property</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064 &middot; License: CC BY 4.0</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; THE reference page for Spanish property market data
        </footer>
      </div>
    </main>
  );
}
