import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';

export const revalidate = 86400;

export function generateStaticParams() {
  const params: { year: string; week: string }[] = [];
  for (let w = 1; w <= 15; w++) {
    params.push({ year: '2026', week: String(w) });
  }
  return params;
}

export function generateMetadata({ params }: { params: { year: string; week: string } }): Metadata {
  const title = `Spain Property Market Week ${params.week} ${params.year} | Avena Terminal`;
  const description = `Weekly snapshot of Spain new build property market for week ${params.week}, ${params.year}. Top deals, average prices, yields, and investment scores from Avena Terminal.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/weekly/${params.year}/${params.week}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default function WeeklySnapshotPage({ params }: { params: { year: string; week: string } }) {
  const { year, week } = params;
  const weekNum = parseInt(week, 10);

  const all = getAllProperties();
  const towns = getUniqueTowns();
  const scored = all.filter(p => p._sc).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const top10 = scored.slice(0, 10);

  const prices = all.map(p => p.pf);
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const topTown = towns[0];

  const stats = {
    totalProperties: all.length,
    avgPrice: Math.round(avg(prices)),
    avgYield: Number(avg(yields).toFixed(1)),
    avgScore: Math.round(avg(scored.map(p => p._sc!))),
    topTown: topTown?.town ?? 'N/A',
    topTownCount: topTown?.count ?? 0,
  };

  const now = new Date();

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-400">Weekly</span>
          <span className="mx-1">/</span>
          <span className="text-gray-400">{year}</span>
          <span className="mx-1">/</span>
          <span className="text-white">Week {weekNum}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Spain Property Market &mdash; Week {weekNum}, {year}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Weekly market snapshot powered by Avena Terminal live data. Revalidated every 24 hours.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {[
            { label: 'Total Properties', value: stats.totalProperties.toLocaleString() },
            { label: 'Avg Price', value: `\u20AC${stats.avgPrice.toLocaleString()}` },
            { label: 'Avg Yield', value: `${stats.avgYield}%`, highlight: true },
            { label: 'Avg Score', value: stats.avgScore.toString(), highlight: true },
            { label: 'Top Town', value: stats.topTown },
            { label: 'Top Town Listings', value: stats.topTownCount.toString() },
          ].map((s) => (
            <div key={s.label} className="border rounded-lg p-3 text-center" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{s.label}</div>
              <div className={`text-lg font-bold font-mono ${s.highlight ? 'text-emerald-400' : 'text-white'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Top 10 Deals */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top 10 Deals of Week {weekNum}</h2>

        <div className="space-y-2 mb-10">
          {top10.map((p, i) => (
            <Link
              key={p.ref ?? `${p.p}-${i}`}
              href={p.ref ? `/property/${encodeURIComponent(p.ref)}` : '#'}
              className="flex items-center gap-4 border rounded-lg px-4 py-3 hover:border-emerald-500/30 transition-all"
              style={{ background: '#0f1419', borderColor: '#1c2333' }}
            >
              <span className="text-emerald-400 font-bold font-mono text-sm w-6 text-right shrink-0">#{i + 1}</span>
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
            </Link>
          ))}
        </div>

        {/* Navigation between weeks */}
        <div className="flex justify-between items-center border-t pt-6" style={{ borderColor: '#1c2333' }}>
          {weekNum > 1 ? (
            <Link href={`/weekly/${year}/${weekNum - 1}`} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              &larr; Week {weekNum - 1}
            </Link>
          ) : <span />}
          {weekNum < 52 ? (
            <Link href={`/weekly/${year}/${weekNum + 1}`} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Week {weekNum + 1} &rarr;
            </Link>
          ) : <span />}
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-6">Snapshot generated: {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}
