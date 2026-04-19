import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Ratings — Independent Property & Developer Ratings | Avena Terminal',
  description: 'First independent AI-native property rating agency in Europe. Development ratings AAV to DV. Developer credit ratings. Market ratings. Data-driven. No developer money accepted.',
  alternates: { canonical: 'https://avenaterminal.com/ratings' },
};

function scoreToRating(score: number): { rating: string; label: string; color: string } {
  if (score >= 85) return { rating: 'AAV', label: 'Avena A Value — Institutional Grade', color: '#10b981' };
  if (score >= 75) return { rating: 'AV', label: 'A Value — Strong Investment', color: '#34d399' };
  if (score >= 65) return { rating: 'ABV', label: 'Above Value — Above Market', color: '#60a5fa' };
  if (score >= 55) return { rating: 'BBV', label: 'Below Value — Market Rate', color: '#fbbf24' };
  if (score >= 45) return { rating: 'CV', label: 'Caution Value — Below Average', color: '#f97316' };
  return { rating: 'DV', label: 'Distressed Value — Avoid', color: '#f87171' };
}

function marketRating(avgScore: number): string {
  if (avgScore >= 70) return 'A+';
  if (avgScore >= 65) return 'A';
  if (avgScore >= 60) return 'A-';
  if (avgScore >= 55) return 'BBB+';
  if (avgScore >= 50) return 'BBB';
  if (avgScore >= 45) return 'BBB-';
  return 'BB';
}

export default function RatingsPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  // Developer ratings
  const devMap = new Map<string, typeof all>();
  for (const p of all) {
    if (!p.d) continue;
    if (!devMap.has(p.d)) devMap.set(p.d, []);
    devMap.get(p.d)!.push(p);
  }

  const devRatings = [...devMap.entries()]
    .filter(([, props]) => props.length >= 3)
    .map(([name, props]) => {
      const dScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
      const r = scoreToRating(dScore);
      return { name, count: props.length, avgScore: dScore, ...r, years: props[0]?.dy || null };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // Market ratings
  const marketRatings = costas.map(c => ({
    market: c.costa,
    rating: marketRating(c.avgScore),
    score: c.avgScore,
    count: c.count,
    yield: c.avgYield,
  }));

  // Rating distribution
  const dist = { AAV: 0, AV: 0, ABV: 0, BBV: 0, CV: 0, DV: 0 };
  for (const p of all) {
    const r = scoreToRating(p._sc ?? 0);
    dist[r.rating as keyof typeof dist]++;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Independent Property Ratings',
    description: 'First independent AI-native property and developer rating system in Europe.',
    url: 'https://avenaterminal.com/ratings',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    identifier: '10.5281/zenodo.19520064',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Avena Ratings</h1>
        <p className="text-lg text-gray-400 mb-1">Independent Property Rating Agency</p>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          First AI-native property rating agency in Europe. Development ratings, developer credit ratings, and market ratings. Independent. Data-driven. No developer money accepted. We answer only to data.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Rating Scale */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Rating Scale</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {[
              { r: 'AAV', label: 'Institutional Grade', color: '#10b981', range: '85-100' },
              { r: 'AV', label: 'Strong Investment', color: '#34d399', range: '75-84' },
              { r: 'ABV', label: 'Above Market', color: '#60a5fa', range: '65-74' },
              { r: 'BBV', label: 'Market Rate', color: '#fbbf24', range: '55-64' },
              { r: 'CV', label: 'Below Average', color: '#f97316', range: '45-54' },
              { r: 'DV', label: 'Distressed/Avoid', color: '#f87171', range: '0-44' },
            ].map(item => (
              <div key={item.r} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: `1px solid ${item.color}40` }}>
                <div className="text-xl font-bold" style={{ color: item.color }}>{item.r}</div>
                <div className="text-[8px] text-gray-500 uppercase mt-1">{item.label}</div>
                <div className="text-[9px] text-gray-600 font-mono">{item.range}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Distribution */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Rating Distribution ({all.length} properties)</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(dist).map(([rating, count]) => {
              const r = scoreToRating(rating === 'AAV' ? 90 : rating === 'AV' ? 80 : rating === 'ABV' ? 70 : rating === 'BBV' ? 60 : rating === 'CV' ? 50 : 30);
              return (
                <div key={rating} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                  <div className="text-lg font-bold" style={{ color: r.color }}>{count}</div>
                  <div className="text-[9px] text-gray-500">{rating}</div>
                  <div className="text-[8px] text-gray-600">{Math.round(count / all.length * 100)}%</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Market Ratings */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Market Ratings</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {marketRatings.map(m => (
              <div key={m.market} className="rounded-lg p-4 flex items-center justify-between" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div>
                  <h3 className="text-white font-semibold">{m.market}</h3>
                  <p className="text-xs text-gray-500">{m.count} properties &middot; yield {m.yield}%</p>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{m.rating}</div>
              </div>
            ))}
            <div className="rounded-lg p-4 flex items-center justify-between opacity-60" style={{ background: '#161b22', border: '1px dashed #30363d' }}>
              <div>
                <h3 className="text-gray-400 font-semibold">Spain Overall</h3>
                <p className="text-xs text-gray-600">{all.length} properties</p>
              </div>
              <div className="text-2xl font-bold text-fbbf24" style={{ color: '#fbbf24' }}>BBB+</div>
            </div>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Developer Ratings */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Developer Ratings (3+ listings)</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Developer</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Listings</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Rating</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {devRatings.slice(0, 20).map((d, i) => (
                  <tr key={d.name} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{d.name}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{d.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{d.avgScore}</td>
                    <td className="px-4 py-2 text-right font-bold" style={{ color: d.color }}>{d.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Independence */}
        <section className="mb-10">
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h3 className="text-white font-bold mb-2">Independence Statement</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Avena Ratings operates independently of all developers, agents, and financial institutions. No developer pays for ratings. No advertiser influences scores. All ratings are computed algorithmically from the Avena Investment Score methodology (40% Value, 25% Yield, 20% Location, 10% Quality, 5% Risk). We answer only to data.
            </p>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Avena Terminal Independent Property Ratings. Published monthly.</p>
            <p className="text-gray-400">https://avenaterminal.com/ratings &middot; DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; First independent property rating agency in Europe &middot; We answer only to data
        </footer>
      </div>
          </main>
      <Footer />
    </div>
  );
}
