import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

export async function generateStaticParams() {
  return getUniqueTowns().map(t => ({ town: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ town: string }> }): Promise<Metadata> {
  const { town: townSlug } = await params;
  const townData = getUniqueTowns().find(t => t.slug === townSlug);
  if (!townData) return { title: 'Location Not Found | Avena Terminal' };
  const all = getAllProperties();
  const props = all.filter(p => slugify(p.l) === townSlug);
  const region = props[0]?.r || '';
  const costa = props[0]?.costa || '';
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const title = `${townData.town}, ${region || costa} — New Build Investment Data | Avena Terminal`;
  const description = `${townData.town} investment guide: ${props.length} new builds scored, avg score ${avgScore}/100, ${avgYield}% gross yield. Live data from Avena Terminal.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/locations/${townSlug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

function scoreBand(sc: number): string {
  if (sc >= 80) return '80+';
  if (sc >= 70) return '70–79';
  if (sc >= 60) return '60–69';
  if (sc >= 50) return '50–59';
  return '<50';
}

function priceBand(pf: number): string {
  if (pf < 150000) return 'Under €150k';
  if (pf < 250000) return '€150k–€250k';
  if (pf < 400000) return '€250k–€400k';
  return '€400k+';
}

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

export default async function LocationPage({ params }: { params: Promise<{ town: string }> }) {
  const { town: townSlug } = await params;
  const townData = getUniqueTowns().find(t => t.slug === townSlug);

  if (!townData) {
    return (
      <div className="avena-v2 min-h-screen">
        <Nav />
        <main className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-light text-foreground mb-4">Location <span className="italic text-gold">not found</span>.</h1>
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">← Back to Terminal</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const all = getAllProperties();
  const props = all.filter(p => slugify(p.l) === townSlug).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const townName = townData.town;
  const region = props[0]?.r || '';
  const costaName = props[0]?.costa || '';

  // Key metrics
  const avgPrice = Math.round(avg(props.map(p => p.pf)));
  const avgPm2 = Math.round(avg(props.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross));
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const above70 = props.filter(p => (p._sc ?? 0) >= 70).length;

  // Score distribution
  const scoreDist: Record<string, number> = { '80+': 0, '70–79': 0, '60–69': 0, '50–59': 0, '<50': 0 };
  for (const p of props) {
    if (p._sc != null) scoreDist[scoreBand(p._sc)]++;
  }

  // Top 5 deals
  const top5 = props.slice(0, 5);

  // Type breakdown
  const typeMap = new Map<string, Property[]>();
  for (const p of props) {
    const key = p.t || 'Other';
    if (!typeMap.has(key)) typeMap.set(key, []);
    typeMap.get(key)!.push(p);
  }
  const typeBreakdown = [...typeMap.entries()]
    .map(([type, list]) => ({ type, count: list.length, avgPrice: Math.round(avg(list.map(p => p.pf))) }))
    .sort((a, b) => b.count - a.count);

  // Price distribution
  const priceDist: Record<string, number> = { 'Under €150k': 0, '€150k–€250k': 0, '€250k–€400k': 0, '€400k+': 0 };
  for (const p of props) priceDist[priceBand(p.pf)]++;

  // Developer activity
  const devMap = new Map<string, Property[]>();
  for (const p of props) {
    const key = p.d || 'Unknown';
    if (!devMap.has(key)) devMap.set(key, []);
    devMap.get(key)!.push(p);
  }
  const devActivity = [...devMap.entries()]
    .map(([dev, list]) => ({
      dev,
      count: list.length,
      avgScore: Math.round(avg(list.filter(p => p._sc).map(p => p._sc!))),
      years: list[0]?.dy ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Costa comparison
  const costaProps = costaName ? all.filter(p => p.costa === costaName) : [];
  const costaAvgScore = costaProps.length ? Math.round(avg(costaProps.filter(p => p._sc).map(p => p._sc!))) : 0;
  const costaAvgPrice = costaProps.length ? Math.round(avg(costaProps.map(p => p.pf))) : 0;
  const costaAvgYield = costaProps.length ? avg(costaProps.filter(p => p._yield).map(p => p._yield!.gross)) : 0;

  // Nearby towns (same costa)
  const nearbyTowns = costaName
    ? getUniqueTowns()
        .filter(t => {
          const tProps = all.filter(p => slugify(p.l) === t.slug);
          return tProps.some(p => p.costa === costaName) && t.slug !== townSlug;
        })
        .slice(0, 5)
    : [];

  // JSON-LD
  const firstWithCoords = props.find(p => p.lat && p.lng);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: townName,
    description: `New build property investment data for ${townName}. ${props.length} scored properties.`,
    url: `https://avenaterminal.com/locations/${townSlug}`,
    ...(firstWithCoords ? { geo: { '@type': 'GeoCoordinates', latitude: firstWithCoords.lat, longitude: firstWithCoords.lng } } : {}),
    ...(costaName ? { containedInPlace: { '@type': 'Place', name: costaName } } : {}),
  };

  const cardBg = '#161b22';
  const borderColor = '#30363d';

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          {costaName && (
            <>
              <Link href={`/costas/${slugify(costaName)}`} className="hover:text-white">{costaName}</Link>
              <span className="mx-1">/</span>
            </>
          )}
          <span className="text-white">{townName}</span>
        </nav>

        {/* Town header */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{townName}</h1>
        <p className="text-gray-400 text-sm mb-8">
          {[region, costaName].filter(Boolean).join(' · ')} · {props.length} new build properties
        </p>

        {/* 1. Key Metrics Grid */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Properties', value: String(props.length) },
              { label: 'Avg Price', value: `€${fmt(avgPrice)}` },
              { label: 'Avg €/m²', value: avgPm2 ? `€${fmt(avgPm2)}` : 'N/A' },
              { label: 'Avg Yield', value: `${avgYield.toFixed(1)}%` },
              { label: 'Avg Score', value: `${avgScore}/100` },
              { label: 'Score 70+', value: String(above70) },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-4 text-center border" style={{ background: cardBg, borderColor }}>
                <div className="text-white font-bold text-lg">{m.value}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Score Distribution */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Score Distribution</h2>
          <div className="grid grid-cols-5 gap-2">
            {(['80+', '70–79', '60–69', '50–59', '<50'] as const).map(band => {
              const count = scoreDist[band];
              const total = props.filter(p => p._sc != null).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={band} className="rounded-lg p-3 text-center border" style={{ background: cardBg, borderColor }}>
                  <div className="text-white font-bold text-lg">{count}</div>
                  <div className="text-gray-500 text-xs">{band}</div>
                  <div className="w-full rounded-full h-1.5 mt-2" style={{ background: borderColor }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: band === '80+' ? '#10b981' : band === '70–79' ? '#34d399' : band === '60–69' ? '#fbbf24' : band === '50–59' ? '#f97316' : '#ef4444' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Top 5 Deals */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Top 5 Deals</h2>
          <div className="space-y-2">
            {top5.map((p, i) => (
              <Link
                key={p.ref || i}
                href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all"
                style={{ background: cardBg, borderColor }}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'text-white'}`} style={i !== 0 ? { background: borderColor } : {}}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{p.p}</div>
                  <div className="text-gray-500 text-xs">
                    {p.t} · {p.bd} bed · €{fmt(p.pf)}
                    {p._yield ? ` · ${p._yield.gross.toFixed(1)}% yield` : ''}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                  <div className="text-gray-500 text-[10px]">SCORE</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Property Type Breakdown */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Property Type Breakdown</h2>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Count</th>
                  <th className="text-right px-4 py-3">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {typeBreakdown.map(row => (
                  <tr key={row.type} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 text-white">{row.type}</td>
                    <td className="px-4 py-3 text-right">{row.count}</td>
                    <td className="px-4 py-3 text-right">€{fmt(row.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Price Distribution */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Price Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['Under €150k', '€150k–€250k', '€250k–€400k', '€400k+'] as const).map(band => {
              const count = priceDist[band];
              return (
                <div key={band} className="rounded-lg p-4 text-center border" style={{ background: cardBg, borderColor }}>
                  <div className="text-white font-bold text-xl">{count}</div>
                  <div className="text-gray-500 text-xs mt-1">{band}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Developer Activity */}
        {devActivity.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Developer Activity</h2>
            <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th className="text-left px-4 py-3">Developer</th>
                    <th className="text-right px-4 py-3">Properties</th>
                    <th className="text-right px-4 py-3">Avg Score</th>
                    <th className="text-right px-4 py-3">Years Active</th>
                  </tr>
                </thead>
                <tbody>
                  {devActivity.map(row => (
                    <tr key={row.dev} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td className="px-4 py-3 text-white">
                        <Link href={`/developer/${slugify(row.dev)}`} className="hover:text-emerald-400 transition-colors">
                          {row.dev}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">{row.count}</td>
                      <td className="px-4 py-3 text-right">{row.avgScore}/100</td>
                      <td className="px-4 py-3 text-right">{row.years > 0 ? `${row.years}yr` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 7. Market Context — Costa Comparison */}
        {costaName && costaProps.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Market Context: {townName} vs {costaName}</h2>
            <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th className="text-left px-4 py-3">Metric</th>
                    <th className="text-right px-4 py-3">{townName}</th>
                    <th className="text-right px-4 py-3">{costaName} Avg</th>
                    <th className="text-right px-4 py-3">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Avg Score', town: avgScore, costa: costaAvgScore, fmt: (v: number) => `${v}/100` },
                    { metric: 'Avg Price', town: avgPrice, costa: costaAvgPrice, fmt: (v: number) => `€${v.toLocaleString('en-IE')}` },
                    { metric: 'Avg Yield', town: Number(avgYield.toFixed(1)), costa: Number(costaAvgYield.toFixed(1)), fmt: (v: number) => `${v.toFixed(1)}%` },
                  ].map(row => {
                    const diff = row.town - row.costa;
                    const isPositive = row.metric === 'Avg Price' ? diff < 0 : diff > 0;
                    return (
                      <tr key={row.metric} style={{ borderBottom: `1px solid ${borderColor}` }}>
                        <td className="px-4 py-3 text-white">{row.metric}</td>
                        <td className="px-4 py-3 text-right font-medium text-white">{row.fmt(row.town)}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{row.fmt(row.costa)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{row.metric === 'Avg Price' ? `€${diff.toLocaleString('en-IE')}` : row.metric === 'Avg Yield' ? `${diff.toFixed(1)}pp` : String(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 8. Nearby Towns */}
        {nearbyTowns.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Nearby Towns on {costaName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyTowns.map(t => (
                <Link
                  key={t.slug}
                  href={`/locations/${t.slug}`}
                  className="rounded-lg border p-4 hover:border-emerald-500/30 transition-all"
                  style={{ background: cardBg, borderColor }}
                >
                  <div className="text-white font-medium mb-1">{t.town}</div>
                  <div className="text-gray-500 text-xs">
                    {t.count} properties · Score {t.avgScore}/100 · Yield {t.avgYield}%
                  </div>
                  <div className="text-gray-500 text-xs mt-1">Avg €{fmt(t.avgPrice)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Data Sources */}
        <footer className="border-t pt-8 mt-12 text-xs text-gray-500" style={{ borderColor }}>
          <p className="mb-2">
            Data sources:{' '}
            <Link href="/" className="text-emerald-400 hover:underline">Avena Terminal</Link>,{' '}
            <a href="https://www.bde.es" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Banco de Espa&ntilde;a</a>,{' '}
            <a href="https://www.ine.es" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">INE (Instituto Nacional de Estad&iacute;stica)</a>
          </p>
          <p className="text-gray-600">
            Investment data updated daily. Scores reflect value, yield, location, quality, and risk factors.
          </p>
        </footer>
      </div>
      </main>
      <Footer />
    </div>
  );
}
