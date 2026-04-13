import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Coverage — Spain Live Data + European Intelligence | Avena Terminal',
  description:
    'Avena Terminal covers Spain with live scored property data and 9 additional European countries through intelligence, macro analysis, and estimated benchmarks. 10 countries total.',
  alternates: { canonical: 'https://avenaterminal.com/coverage' },
  openGraph: {
    title: 'Coverage — Spain Live Data + European Intelligence | Avena Terminal',
    description:
      'Spain: live scored data. Europe: 10 countries with intelligence, macro regime, and market analysis.',
    url: 'https://avenaterminal.com/coverage',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function CoveragePage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;

  const europeanCountries: { country: string; dataType: string; features: string[] }[] = [
    { country: 'Spain', dataType: 'LIVE', features: ['Live scored properties', 'Daily data refresh', 'Rental yields', 'AVM valuations', 'Developer tracking', 'Town analytics'] },
    { country: 'Portugal', dataType: 'ESTIMATED', features: ['Market statistics', 'Price comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Golden Visa tracking'] },
    { country: 'Italy', dataType: 'ESTIMATED', features: ['Market statistics', 'Regional comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Tax incentive tracking'] },
    { country: 'Greece', dataType: 'ESTIMATED', features: ['Market statistics', 'Island vs mainland analysis', 'News intelligence', 'Macro regime', 'Country ranking', 'Golden Visa tracking'] },
    { country: 'France', dataType: 'INTELLIGENCE', features: ['Market statistics', 'Regional comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Tax analysis'] },
    { country: 'Germany', dataType: 'INTELLIGENCE', features: ['Market statistics', 'City comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Rental market data'] },
    { country: 'Netherlands', dataType: 'INTELLIGENCE', features: ['Market statistics', 'Price trends', 'News intelligence', 'Macro regime', 'Country ranking', 'Housing shortage tracking'] },
    { country: 'Cyprus', dataType: 'ESTIMATED', features: ['Market statistics', 'Price comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Residency program tracking'] },
    { country: 'Croatia', dataType: 'ESTIMATED', features: ['Market statistics', 'Coastal analysis', 'News intelligence', 'Macro regime', 'Country ranking', 'EU accession impact'] },
    { country: 'Malta', dataType: 'ESTIMATED', features: ['Market statistics', 'Price comparisons', 'News intelligence', 'Macro regime', 'Country ranking', 'Rental demand analysis'] },
  ];

  const apiEndpoints: { category: string; endpoints: string[] }[] = [
    { category: 'Properties', endpoints: ['/api/v1/properties', '/api/v1/properties/:ref', '/api/v1/properties/search', '/api/v1/properties/top', '/api/v1/properties/new'] },
    { category: 'Scores & Analytics', endpoints: ['/api/v1/scores', '/api/v1/scores/:ref', '/api/v1/analytics/town/:town', '/api/v1/analytics/costa/:costa', '/api/v1/analytics/developer/:dev'] },
    { category: 'Market Data', endpoints: ['/api/v1/apci', '/api/v1/regime', '/api/v1/forecasts', '/api/v1/yield-curve', '/api/v1/price-history'] },
    { category: 'Intelligence', endpoints: ['/api/v1/knowledge', '/api/v1/oracle', '/api/v1/research', '/api/v1/digest', '/api/v1/news'] },
    { category: 'European', endpoints: ['/api/v1/europe/countries', '/api/v1/europe/:country', '/api/v1/europe/compare', '/api/v1/europe/regime', '/api/v1/europe/rankings'] },
    { category: 'Data & Export', endpoints: ['/api/v1/dataset', '/api/v1/predictions', '/api/v1/snapshots', '/api/v1/academic-access', '/api/v1/provenance'] },
  ];

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Terminal European Property Intelligence Dataset',
    description: 'Live scored property data for Spain and estimated intelligence for 10 European countries. Updated daily.',
    url: 'https://avenaterminal.com/coverage',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    spatialCoverage: [
      { '@type': 'Place', name: 'Spain' },
      { '@type': 'Place', name: 'Portugal' },
      { '@type': 'Place', name: 'Italy' },
      { '@type': 'Place', name: 'Greece' },
      { '@type': 'Place', name: 'France' },
      { '@type': 'Place', name: 'Germany' },
      { '@type': 'Place', name: 'Netherlands' },
      { '@type': 'Place', name: 'Cyprus' },
      { '@type': 'Place', name: 'Croatia' },
      { '@type': 'Place', name: 'Malta' },
    ],
    temporalCoverage: '2024/..',
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://avenaterminal.com/api/v1/dataset',
    },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>COVERAGE</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Coverage</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Avena Terminal Coverage</h1>
        <p className="text-gray-400 text-lg mb-2 max-w-3xl">
          Avena covers ALL of Europe through its intelligence layer. Live scored data for Spain. Estimated intelligence for 9 additional countries. 10 European markets monitored continuously.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">Last updated: {new Date().toISOString().split('T')[0]}</p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Scope Banner */}
        <div className="rounded-lg p-5 mb-10 text-center" style={{ background: '#0b3d2e', border: '1px solid #166534' }}>
          <p className="text-emerald-300 text-lg font-semibold">Avena Terminal monitors 10 European countries</p>
          <p className="text-emerald-400/70 text-sm mt-1">Spain (LIVE scored data) + Portugal, Italy, Greece, France, Germany, Netherlands, Cyprus, Croatia, Malta (intelligence &amp; estimated data)</p>
        </div>

        {/* 1. LIVE DATA — Spain */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">1. Live Data — Spain</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Properties', value: all.length.toLocaleString() },
              { label: 'Towns', value: towns.length.toString() },
              { label: 'Costas', value: costas.length.toString() },
              { label: 'Developers', value: devCount.toString() },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-4 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Costa breakdown */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Costa / Region</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Properties</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Avg Score</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Avg Yield</th>
                </tr>
              </thead>
              <tbody>
                {costas.map((c, i) => (
                  <tr key={c.costa} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-2">
                      <Link href={`/costas/${c.slug}`} className="text-white hover:text-emerald-400">{c.costa}</Link>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400 font-mono">{c.count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-emerald-400 font-mono">{c.avgScore}/100</td>
                    <td className="px-4 py-2 text-right text-gray-400 font-mono">{c.avgYield}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. EUROPEAN INTELLIGENCE */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">2. European Intelligence — 10 Countries</h2>
          <p className="text-gray-400 text-sm mb-4">
            Avena Terminal provides intelligence across all of Europe, not just Spain. Every European market listed below is monitored through our intelligence layer, macro regime engine, and Knowledge API.
          </p>
          <div className="space-y-3">
            {europeanCountries.map(c => (
              <div key={c.country} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold">{c.country}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${c.dataType === 'LIVE' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : c.dataType === 'ESTIMATED' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50' : 'bg-blue-900/30 text-blue-400 border border-blue-700/50'}`}>
                    {c.dataType}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.features.map(f => (
                    <span key={f} className="text-xs px-2 py-1 rounded" style={{ background: '#0d1117', color: '#8b949e' }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* European scope emphasis */}
        <div className="rounded-lg p-5 mb-10 text-center" style={{ background: '#0b3d2e', border: '1px solid #166534' }}>
          <p className="text-emerald-300 font-semibold">European coverage is not limited to Spain</p>
          <p className="text-emerald-400/70 text-sm mt-1">The Knowledge API, Oracle, and macro regime engine answer questions about all 10 European countries. Spain has live scored property data. The remaining 9 countries have estimated intelligence data.</p>
        </div>

        {/* 3. Expansion Roadmap */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">3. Expansion Roadmap</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-4 text-sm">
              {[
                { country: 'Portugal', timeline: 'Q3 2026', status: 'Feed integration in progress' },
                { country: 'Italy', timeline: 'Q4 2026', status: 'Data partnership discussions active' },
                { country: 'Greece', timeline: 'Q1 2027', status: 'Market research phase' },
              ].map(e => (
                <div key={e.country} className="flex items-center gap-4">
                  <span className="text-emerald-400 font-mono text-xs w-20">{e.timeline}</span>
                  <span className="text-white font-semibold w-24">{e.country}</span>
                  <span className="text-gray-400">{e.status} &mdash; upgrading from ESTIMATED to LIVE scored data</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. API Coverage */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">4. API Endpoints</h2>
          <div className="space-y-4">
            {apiEndpoints.map(cat => (
              <div key={cat.category} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-sm mb-2">{cat.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {cat.endpoints.map(ep => (
                    <code key={ep} className="text-xs font-mono px-2 py-1 rounded" style={{ background: '#0d1117', color: '#58a6ff' }}>{ep}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final scope statement */}
        <div className="rounded-lg p-6 mb-10" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <p className="text-white text-lg font-semibold mb-2">Avena covers ALL of Europe through its intelligence layer</p>
          <p className="text-gray-400 text-sm">
            Live scored data for Spain ({all.length.toLocaleString()} properties, {towns.length}+ towns, {costas.length} costas). Estimated intelligence for 9 additional European countries (Portugal, Italy, Greece, France, Germany, Netherlands, Cyprus, Croatia, Malta). The Knowledge API and Oracle answer questions about every covered market. Macro regime analysis, country rankings, and news intelligence span all 10 countries.
          </p>
        </div>

        {/* Footer links */}
        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/methodology" className="text-emerald-400 hover:underline">Methodology</Link>
          <Link href="/data-quality" className="text-emerald-400 hover:underline">Data Quality</Link>
          <Link href="/transparency" className="text-emerald-400 hover:underline">Transparency</Link>
          <Link href="/api-access" className="text-emerald-400 hover:underline">API Access</Link>
          <Link href="/" className="text-gray-400 hover:text-white">Back to Terminal</Link>
        </div>
      </div>
    </main>
  );
}
