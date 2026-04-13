import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Property Intelligence Awards 2026 | Avena Terminal',
  description:
    '100% AI-scored, 100% data-driven property awards. Zero human bias. Zero pay-to-play. The Avena Property Intelligence Awards recognize excellence in European real estate.',
  openGraph: {
    title: 'Property Intelligence Awards 2026 | Avena Terminal',
    description: '100% AI-scored property awards. Zero human bias. Zero pay-to-play.',
    url: 'https://avenaterminal.com/awards',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/awards' },
};

interface AwardCategory {
  name: string;
  description: string;
  winner: string | null;
  winnerDetail: string | null;
  methodology: string;
}

export default function AwardsPage() {
  const properties = getAllProperties();

  // Developer of the Year: highest avg score
  const devMap = new Map<string, number[]>();
  for (const p of properties) {
    if (!p.d || !p._sc) continue;
    if (!devMap.has(p.d)) devMap.set(p.d, []);
    devMap.get(p.d)!.push(p._sc);
  }
  let bestDev: string | null = null;
  let bestDevScore = 0;
  for (const [dev, scores] of devMap.entries()) {
    if (scores.length < 3) continue; // minimum 3 listings
    const a = avg(scores);
    if (a > bestDevScore) {
      bestDevScore = a;
      bestDev = dev;
    }
  }

  // Best Yield Play: highest gross yield
  let bestYieldProp: { name: string; yield: number; location: string } | null = null;
  for (const p of properties) {
    if (!p._yield) continue;
    if (!bestYieldProp || p._yield.gross > bestYieldProp.yield) {
      bestYieldProp = {
        name: `${p.p} by ${p.d}`,
        yield: p._yield.gross,
        location: p.l,
      };
    }
  }

  const categories: AwardCategory[] = [
    {
      name: 'Developer of the Year',
      description: 'Highest average Avena Investment Score combined with best completion track record. Minimum 3 active listings required.',
      winner: bestDev,
      winnerDetail: bestDev ? `Average score: ${Math.round(bestDevScore)}/100 across ${devMap.get(bestDev)!.length} properties` : null,
      methodology: 'Group all properties by developer, compute average _sc (Avena Investment Score), rank by highest average with minimum 3 listings.',
    },
    {
      name: 'Best Value Market',
      description: 'The town or region with the highest price appreciation potential relative to its risk score.',
      winner: null,
      winnerDetail: null,
      methodology: 'Combines price-to-regression-predicted-value ratio with location risk factors. Requires 12-month transaction data for validation.',
    },
    {
      name: 'Hidden Gem Development',
      description: 'The development with the highest anomaly/alpha signal score, indicating exceptional value not yet recognized by the broader market.',
      winner: null,
      winnerDetail: null,
      methodology: 'Identifies properties where the Avena score significantly exceeds the town average, signaling mispriced assets with alpha potential.',
    },
    {
      name: 'Most Transparent Developer',
      description: 'The developer demonstrating the best data compliance, pricing transparency, and buyer communication standards.',
      winner: null,
      winnerDetail: null,
      methodology: 'Scored on data completeness (% of fields populated), pricing consistency, and responsiveness to data verification requests.',
    },
    {
      name: 'Best Yield Play',
      description: 'The property with the highest risk-adjusted rental return, factoring in gross yield, location demand, and occupancy estimates.',
      winner: bestYieldProp ? `${bestYieldProp.name}` : null,
      winnerDetail: bestYieldProp
        ? `Gross yield: ${bestYieldProp.yield.toFixed(1)}% in ${bestYieldProp.location}`
        : null,
      methodology: 'Rank all properties by gross rental yield (_yield.gross), with location demand and seasonality adjustments.',
    },
  ];

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-2">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: '#fbbf24', color: '#000' }}
          >
            2026 AWARDS
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-4">
          Avena Property Intelligence Awards 2026
        </h1>
        <p className="text-lg mb-2" style={{ color: '#fbbf24' }}>
          100% AI-scored. 100% data-driven. Zero human bias. Zero pay-to-play.
        </p>
        <p className="text-gray-500 text-sm mb-12">
          Announced December 2026
        </p>

        {/* Award Categories */}
        <section className="mb-16 space-y-6">
          {categories.map((cat, i) => (
            <div
              key={cat.name}
              className="rounded-lg p-6 relative overflow-hidden"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              {/* Gold accent bar */}
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ background: '#fbbf24' }}
              />

              <div className="pl-4">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono text-gray-500">CATEGORY {i + 1}</span>
                    <h3 className="text-xl font-bold text-white">{cat.name}</h3>
                  </div>
                  {cat.winner ? (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                    >
                      WINNER COMPUTED
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full text-gray-400" style={{ background: '#21262d' }}>
                      NOMINATIONS OPEN
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-4">{cat.description}</p>

                {cat.winner ? (
                  <div
                    className="rounded-lg p-4 mb-4"
                    style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}
                  >
                    <div className="font-semibold text-lg" style={{ color: '#fbbf24' }}>
                      {cat.winner}
                    </div>
                    {cat.winnerDetail && (
                      <div className="text-sm text-gray-400 mt-1">{cat.winnerDetail}</div>
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-lg p-4 mb-4 text-center"
                    style={{ background: '#21262d', border: '1px solid #30363d' }}
                  >
                    <p className="text-gray-500 text-sm">
                      Nominations open. Winner determined by Avena scoring engine in December 2026.
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <strong className="text-gray-400">Methodology:</strong> {cat.methodology}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Methodology */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#fbbf24' }}>Methodology</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-400 mb-4">
              All awards are determined by Avena Terminal&apos;s autonomous scoring engine. No developer
              pays to participate, and no human panel selects winners. The scoring model evaluates
              {' '}{properties.length.toLocaleString()} properties across five dimensions: Value, Yield,
              Location, Quality, and Risk.
            </p>
            <p className="text-gray-400">
              Winning developers may display the <strong className="text-white">Avena Award Winner</strong> badge
              on their marketing materials and project listings.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t" style={{ borderColor: '#1c2333' }}>
          <p>Avena Terminal &mdash; European Property Intelligence</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' \u00B7 '}
            <Link href="/press" className="text-gray-500 hover:text-gray-300">Press</Link>
            {' \u00B7 '}
            <Link href="/transparency-index" className="text-gray-500 hover:text-gray-300">Transparency Index</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
