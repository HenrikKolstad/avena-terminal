import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Market Feed — Avena Terminal',
  description: 'Real-time Spain new build property market feed. All properties scored and ranked live with updated timestamps. Always fresh, never cached.',
  openGraph: {
    title: 'Live Market Feed — Avena Terminal',
    description: 'Real-time Spain new build property market feed. All properties scored and ranked live.',
    url: 'https://avenaterminal.com/live',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function LiveMarketFeedPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const now = new Date();
  const timestamp = now.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Madrid' });

  const scored = all.filter(p => p._sc).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const prices = all.map(p => p.pf);
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const scores = scored.map(p => p._sc!);

  const stats = {
    totalProperties: all.length,
    totalTowns: towns.length,
    avgPrice: Math.round(avg(prices)),
    medianPrice: Math.round(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || 0),
    avgScore: Math.round(avg(scores)),
    avgYield: Number(avg(yields).toFixed(1)),
    topScore: scores[0] ?? 0,
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Live Market Feed</h1>
            <p className="text-gray-500 text-xs mt-1 font-mono">Server-rendered {timestamp} CET</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Force-dynamic</span>
            <span className="text-[10px] text-gray-600 block">0s cache / always fresh</span>
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
          {[
            { label: 'Properties', value: stats.totalProperties.toLocaleString() },
            { label: 'Towns', value: stats.totalTowns.toString() },
            { label: 'Avg Price', value: `\u20AC${stats.avgPrice.toLocaleString()}` },
            { label: 'Median Price', value: `\u20AC${stats.medianPrice.toLocaleString()}` },
            { label: 'Avg Score', value: stats.avgScore.toString(), highlight: true },
            { label: 'Avg Yield', value: `${stats.avgYield}%`, highlight: true },
            { label: 'Top Score', value: stats.topScore.toString(), highlight: true },
          ].map((s) => (
            <div key={s.label} className="border rounded-lg p-3 text-center" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{s.label}</div>
              <div className={`text-lg font-bold font-mono ${s.highlight ? 'text-emerald-400' : 'text-white'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Property List */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">All Properties by Score ({scored.length})</h2>

        <div className="space-y-2">
          {scored.map((p, i) => (
            <Link
              key={p.ref ?? `${p.p}-${i}`}
              href={p.ref ? `/property/${encodeURIComponent(p.ref)}` : '#'}
              className="flex items-center gap-4 border rounded-lg px-4 py-3 hover:border-emerald-500/30 transition-all group"
              style={{ background: '#0f1419', borderColor: '#1c2333' }}
            >
              <span className="text-gray-600 font-mono text-xs w-8 text-right shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{p.p}</span>
                  <span className="text-gray-600 text-[10px] shrink-0">{p.t}</span>
                </div>
                <div className="text-gray-500 text-xs truncate">{p.l} &middot; {p.d}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs">
                <div className="text-right">
                  <div className="text-gray-500">Price</div>
                  <div className="text-white font-mono">&euro;{p.pf.toLocaleString()}</div>
                </div>
                {p._yield && (
                  <div className="text-right">
                    <div className="text-gray-500">Yield</div>
                    <div className="text-emerald-400 font-mono">{p._yield.gross.toFixed(1)}%</div>
                  </div>
                )}
                <div className="text-right w-12">
                  <div className="text-gray-500">Score</div>
                  <div className={`font-bold font-mono ${(p._sc ?? 0) >= 70 ? 'text-emerald-400' : (p._sc ?? 0) >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {p._sc}
                  </div>
                </div>
              </div>
              <span className="text-gray-700 text-[10px] font-mono shrink-0 w-20 text-right">
                {p._added ?? now.toISOString().slice(0, 10)}
              </span>
            </Link>
          ))}
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-6 font-mono">Feed generated: {now.toISOString()}</p>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}
