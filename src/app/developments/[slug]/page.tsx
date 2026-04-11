import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function scoreColor(sc: number): string {
  if (sc >= 80) return '#10b981';   // emerald-500
  if (sc >= 70) return '#22c55e';   // green-500
  if (sc >= 60) return '#eab308';   // yellow-500
  return '#6b7280';                  // gray-500
}

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

function buildDevMap(all: Property[]): Map<string, Property[]> {
  const devMap = new Map<string, Property[]>();
  for (const p of all) {
    const key = p.p || `${p.t} in ${p.l}`;
    if (!devMap.has(key)) devMap.set(key, []);
    devMap.get(key)!.push(p);
  }
  return devMap;
}

function findDevBySlug(slug: string): { name: string; units: Property[] } | null {
  const all = getAllProperties();
  const devMap = buildDevMap(all);
  for (const [name, units] of devMap) {
    if (slugify(name) === slug) return { name, units };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Static params                                                             */
/* -------------------------------------------------------------------------- */
export async function generateStaticParams() {
  const all = getAllProperties();
  const devNames = [...new Set(all.map(p => p.p).filter(Boolean))];
  return devNames.map(name => ({ slug: slugify(name!) }));
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dev = findDevBySlug(slug);
  if (!dev) return { title: 'Development Not Found | Avena Terminal' };

  const { name: devName, units } = dev;
  const scores = units.filter(p => p._sc).map(p => p._sc!);
  const avgScore = Math.round(avg(scores));
  const prices = units.map(p => p.pf).filter(Boolean);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const town = units[0].l?.split(',')[0] || '';
  const costa = units[0].costa || '';

  const title = `${devName} — Score ${avgScore}/100 | Avena Terminal`;
  const description = `${units.length} new build units from \u20AC${fmt(minPrice)} to \u20AC${fmt(maxPrice)}. Avena Score ${avgScore}/100. ${town}, ${costa}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/developments/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default async function DevelopmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dev = findDevBySlug(slug);

  if (!dev) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Development Not Found</h1>
          <Link href="/towns" className="text-emerald-400 hover:underline">Browse all towns</Link>
        </div>
      </div>
    );
  }

  const { name: devName, units } = dev;
  const sorted = [...units].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));

  /* ---- Computed stats ---- */
  const scores = units.filter(p => p._sc).map(p => p._sc!);
  const avgScore = Math.round(avg(scores));
  const prices = units.map(p => p.pf).filter(Boolean);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round(avg(prices));

  const pm2Values = units.map(p => p.pm2).filter((v): v is number => v != null && v > 0);
  const avgPm2 = Math.round(avg(pm2Values));

  const town = units[0].l?.split(',')[0] || '';
  const costa = units[0].costa || '';
  const developer = units[0].d || '';
  const devYears = units[0].dy || 0;
  const region = units[0].r || '';

  /* ---- Score breakdown ---- */
  const scBreakdown = {
    value: Math.round(avg(units.filter(p => p._scores).map(p => p._scores!.value))),
    yield: Math.round(avg(units.filter(p => p._scores).map(p => p._scores!.yield))),
    location: Math.round(avg(units.filter(p => p._scores).map(p => p._scores!.location))),
    quality: Math.round(avg(units.filter(p => p._scores).map(p => p._scores!.quality))),
    risk: Math.round(avg(units.filter(p => p._scores).map(p => p._scores!.risk))),
  };

  /* ---- Beach distance ---- */
  const beachDists = units.map(p => p.bk).filter((v): v is number => v != null && v > 0);
  const avgBeach = beachDists.length ? avg(beachDists).toFixed(1) : null;

  /* ---- Market context ---- */
  const all = getAllProperties();
  const townProps = all.filter(p => p.l === units[0].l);
  const townAvgPm2 = Math.round(avg(townProps.map(p => p.pm2).filter((v): v is number => v != null && v > 0)));
  const costaProps = costa ? all.filter(p => p.costa === costa) : [];
  const costaAvgPm2 = Math.round(avg(costaProps.map(p => p.pm2).filter((v): v is number => v != null && v > 0)));

  /* ---- Yield ---- */
  const yieldValues = units.filter(p => p._yield).map(p => p._yield!.gross);
  const avgYield = yieldValues.length ? avg(yieldValues).toFixed(1) : null;

  /* ---- Geo ---- */
  const lats = units.map(p => p.lat).filter((v): v is number => v != null);
  const lngs = units.map(p => p.lng).filter((v): v is number => v != null);
  const hasGeo = lats.length > 0 && lngs.length > 0;
  const avgLat = hasGeo ? avg(lats) : null;
  const avgLng = hasGeo ? avg(lngs) : null;

  /* ---- JSON-LD ---- */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: devName,
    description: `${units.length} new build units in ${town}. Avena Score: ${avgScore}/100.`,
    url: `https://avenaterminal.com/developments/${slug}`,
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: minPrice,
      highPrice: maxPrice,
      priceCurrency: 'EUR',
      offerCount: units.length,
    },
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: avgLat, longitude: avgLng } } : {}),
    provider: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Developments', item: 'https://avenaterminal.com/developments' },
      { '@type': 'ListItem', position: 3, name: devName },
    ],
  };

  const scoreDimensions = [
    { label: 'Value', key: 'value' as const },
    { label: 'Yield', key: 'yield' as const },
    { label: 'Location', key: 'location' as const },
    { label: 'Quality', key: 'quality' as const },
    { label: 'Risk', key: 'risk' as const },
  ];

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/towns" className="hover:text-white">Developments</Link> <span className="mx-1">/</span>
          <span className="text-white">{devName}</span>
        </nav>

        {/* H1 + subtitle */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{devName}</h1>
        <p className="text-gray-400 text-sm mb-8">
          {town}{costa ? ` \u00B7 ${costa}` : ''}{region ? ` \u00B7 ${region}` : ''}{developer ? ` \u00B7 by ${developer}` : ''}
        </p>

        {/* ================================================================== */}
        {/*  SCORE CARD                                                        */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Big score */}
          <div className="md:col-span-1 rounded-xl border p-6 flex flex-col items-center justify-center" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Avena Score</div>
            <div className="text-5xl font-black" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
            {avgYield && <div className="text-xs mt-3" style={{ color: '#c9d1d9' }}>Avg Gross Yield: <span className="text-emerald-400 font-semibold">{avgYield}%</span></div>}
          </div>

          {/* Score breakdown */}
          <div className="md:col-span-2 rounded-xl border p-6" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Score Breakdown</div>
            <div className="space-y-3">
              {scoreDimensions.map(dim => {
                const val = scBreakdown[dim.key];
                return (
                  <div key={dim.key} className="flex items-center gap-3">
                    <span className="text-xs w-16 text-gray-400">{dim.label}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#21262d' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: scoreColor(val) }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right" style={{ color: scoreColor(val) }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/*  PRICE RANGE + STATS                                               */}
        {/* ================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Units', value: String(units.length) },
            { label: 'Price Range', value: `\u20AC${fmt(minPrice)} \u2013 \u20AC${fmt(maxPrice)}` },
            { label: 'Avg Price', value: `\u20AC${fmt(avgPrice)}` },
            { label: 'Avg \u20AC/m\u00B2', value: avgPm2 ? `\u20AC${fmt(avgPm2)}` : '\u2014' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#161b22', borderColor: '#30363d' }}>
              <div className="text-white font-bold text-sm md:text-base">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ================================================================== */}
        {/*  MARKET CONTEXT                                                    */}
        {/* ================================================================== */}
        {avgPm2 > 0 && (townAvgPm2 > 0 || costaAvgPm2 > 0) && (
          <div className="rounded-xl border p-6 mb-8" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Market Context &mdash; Price per m&sup2;</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">This Development</span>
                <span className="text-sm font-mono text-white">&euro;{fmt(avgPm2)}/m&sup2;</span>
              </div>
              {townAvgPm2 > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{town} Average</span>
                  <span className="text-sm font-mono text-gray-300">&euro;{fmt(townAvgPm2)}/m&sup2;</span>
                </div>
              )}
              {costaAvgPm2 > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{costa} Average</span>
                  <span className="text-sm font-mono text-gray-300">&euro;{fmt(costaAvgPm2)}/m&sup2;</span>
                </div>
              )}
              {townAvgPm2 > 0 && (
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#30363d' }}>
                  <span className="text-xs text-gray-500">vs Town Avg</span>
                  <span className={`text-sm font-mono font-semibold ${avgPm2 < townAvgPm2 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {avgPm2 < townAvgPm2 ? '' : '+'}{Math.round(((avgPm2 - townAvgPm2) / townAvgPm2) * 100)}%
                  </span>
                </div>
              )}
              {costaAvgPm2 > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">vs {costa} Avg</span>
                  <span className={`text-sm font-mono font-semibold ${avgPm2 < costaAvgPm2 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {avgPm2 < costaAvgPm2 ? '' : '+'}{Math.round(((avgPm2 - costaAvgPm2) / costaAvgPm2) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/*  DEVELOPER INFO + LOCATION                                         */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Developer */}
          {developer && (
            <div className="rounded-xl border p-5" style={{ background: '#161b22', borderColor: '#30363d' }}>
              <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Developer</h2>
              <Link href={`/developer/${slugify(developer)}`} className="text-white font-semibold hover:text-emerald-400 transition-colors">{developer}</Link>
              {devYears > 0 && <p className="text-xs text-gray-400 mt-1">{devYears} years of experience</p>}
            </div>
          )}

          {/* Location */}
          <div className="rounded-xl border p-5" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Location</h2>
            <p className="text-white font-semibold">{town}</p>
            {costa && <p className="text-xs text-gray-400 mt-1">{costa}</p>}
            {avgBeach && <p className="text-xs text-gray-400 mt-1">Avg beach distance: {avgBeach} km</p>}
          </div>
        </div>

        {/* ================================================================== */}
        {/*  PROPERTIES TABLE                                                  */}
        {/* ================================================================== */}
        <h2 className="text-lg font-bold text-white mb-4">All Units ({units.length})</h2>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border mb-8" style={{ borderColor: '#30363d' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#161b22' }}>
                {['#', 'Type', 'Beds', 'Baths', 'm\u00B2', 'Price', '\u20AC/m\u00B2', 'Score', 'Yield'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-left border-b" style={{ borderColor: '#30363d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.ref ?? `${p.p}-${i}`} className="hover:bg-[#1c2128] transition-colors" style={{ borderColor: '#30363d' }}>
                  <td className="px-3 py-2 text-gray-500 border-b text-xs" style={{ borderColor: '#21262d' }}>{i + 1}</td>
                  <td className="px-3 py-2 border-b" style={{ borderColor: '#21262d' }}>
                    <Link href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="text-white hover:text-emerald-400 transition-colors">{p.t}</Link>
                  </td>
                  <td className="px-3 py-2 text-gray-300 border-b" style={{ borderColor: '#21262d' }}>{p.bd}</td>
                  <td className="px-3 py-2 text-gray-300 border-b" style={{ borderColor: '#21262d' }}>{p.ba}</td>
                  <td className="px-3 py-2 text-gray-300 border-b font-mono" style={{ borderColor: '#21262d' }}>{p.bm}</td>
                  <td className="px-3 py-2 text-white border-b font-mono" style={{ borderColor: '#21262d' }}>&euro;{fmt(p.pf)}</td>
                  <td className="px-3 py-2 text-gray-300 border-b font-mono" style={{ borderColor: '#21262d' }}>{p.pm2 ? `\u20AC${fmt(p.pm2)}` : '\u2014'}</td>
                  <td className="px-3 py-2 border-b font-mono font-bold" style={{ borderColor: '#21262d', color: scoreColor(p._sc ?? 0) }}>{Math.round(p._sc ?? 0)}</td>
                  <td className="px-3 py-2 text-emerald-400 border-b font-mono" style={{ borderColor: '#21262d' }}>{p._yield ? `${p._yield.gross.toFixed(1)}%` : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2 mb-8">
          {sorted.map((p, i) => (
            <Link
              key={p.ref ?? `${p.p}-${i}`}
              href={`/property/${encodeURIComponent(p.ref ?? '')}`}
              className="flex items-center gap-3 border rounded-lg p-3 hover:border-emerald-500/30 transition-all"
              style={{ background: '#161b22', borderColor: '#30363d' }}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#21262d] text-white'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm">{p.t} &middot; {p.bd}bd/{p.ba}ba &middot; {p.bm}m&sup2;</div>
                <div className="text-gray-500 text-xs">&euro;{fmt(p.pf)}{p.pm2 ? ` \u00B7 \u20AC${fmt(p.pm2)}/m\u00B2` : ''}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-sm font-mono" style={{ color: scoreColor(p._sc ?? 0) }}>{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}%` : ''}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* ================================================================== */}
        {/*  LAST UPDATED                                                      */}
        {/* ================================================================== */}
        <p className="text-[9px] text-gray-600 text-right mt-4">
          Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}
