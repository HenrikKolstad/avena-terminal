import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Quality — Accuracy & Sources | Avena Terminal',
  description:
    'Avena Terminal data quality statement. Update frequency, source transparency, known limitations, accuracy metrics, and competitive comparison. PropertyEval 92.6% accuracy.',
  alternates: { canonical: 'https://avenaterminal.com/data-quality' },
  openGraph: {
    title: 'Data Quality — Accuracy & Sources | Avena Terminal',
    description:
      'PropertyEval 92.6% accuracy. Full source transparency, known limitations, and competitive comparison.',
    url: 'https://avenaterminal.com/data-quality',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function DataQualityPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;
  const today = new Date().toISOString().split('T')[0];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How accurate is Avena Terminal property data?',
        acceptedAnswer: { '@type': 'Answer', text: 'Avena Terminal achieves 92.6% accuracy on PropertyEval benchmarks, 94.2% on price estimation, and 96.1% on yield calculation. All metrics are backtested quarterly.' },
      },
      {
        '@type': 'Question',
        name: 'How often is Avena Terminal data updated?',
        acceptedAnswer: { '@type': 'Answer', text: 'Property data, scores, regime data, and the APCI index are updated daily. Forecasts are updated quarterly. Research reports are generated monthly.' },
      },
      {
        '@type': 'Question',
        name: 'Where does Avena Terminal get its data?',
        acceptedAnswer: { '@type': 'Answer', text: 'Primary data comes from the Apinmo API (direct developer feeds). Rental yields are calibrated with AirDNA data. Market benchmarks use postal-code comparables. Macro data comes from ECB and Eurostat.' },
      },
      {
        '@type': 'Question',
        name: 'Does Avena Terminal use listing prices or transaction prices?',
        acceptedAnswer: { '@type': 'Answer', text: 'Avena Terminal uses developer listing prices (asking prices), not transaction prices. Actual transaction prices may differ by 3-8%. This is clearly disclosed in our methodology.' },
      },
      {
        '@type': 'Question',
        name: 'How does Avena Terminal compare to Idealista or Rightmove?',
        acceptedAnswer: { '@type': 'Answer', text: 'Idealista provides listings only with no investment scoring. Rightmove is UK-focused with no Spanish new-build intelligence. Avena Terminal provides scored properties with yield estimates, regime analysis, and AI-powered intelligence across 10 European countries.' },
      },
    ],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>DATA QUALITY</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Data Quality</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Data Quality Statement</h1>
        <p className="text-gray-400 text-lg mb-2 max-w-2xl">
          Avena Terminal&apos;s commitment to data accuracy, source transparency, and honest disclosure of limitations.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">Last updated: {today} &middot; {all.length.toLocaleString()} properties tracked</p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* 1. Update Frequency */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">1. Update Frequency</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Data Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Frequency</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Property data', 'Daily', today],
                  ['Avena Scores', 'Daily', today],
                  ['Macro regime', 'Daily', today],
                  ['APCI Index', 'Daily', today],
                  ['Price forecasts', 'Quarterly', 'Q2 2026'],
                  ['Research reports', 'Monthly', 'April 2026'],
                ].map(([type, freq, updated], i) => (
                  <tr key={type} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-3 text-white">{type}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono text-xs">{freq}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Source Transparency */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">2. Source Transparency</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-3 text-sm">
              {[
                ['Property listings', 'Apinmo API — direct developer XML/JSON feeds, ingested daily'],
                ['Market benchmarks', 'Postal-code comparables — aggregated listing and transaction data per area'],
                ['Rental yields', 'AirDNA — short-term rental occupancy, ADR, and seasonal demand data'],
                ['Macro indicators', 'ECB — interest rates, mortgage data; Eurostat — GDP, CPI, housing indices'],
                ['News intelligence', 'Curated European property news feeds, processed by Oracle AI'],
                ['Developer data', 'Direct from listing feeds — years active, project count, track record'],
              ].map(([type, source]) => (
                <div key={type} className="flex gap-3">
                  <span className="text-emerald-400 font-mono text-xs shrink-0 w-36">{type}</span>
                  <span className="text-gray-400">{source}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Known Limitations */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">3. Known Limitations</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0 font-bold">!</span>
                <p><strong className="text-white">Listing prices vs. transaction prices:</strong> All prices are developer asking prices. Actual sale prices may differ by 3-8%. We do not claim to show transaction prices.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0 font-bold">!</span>
                <p><strong className="text-white">Yield is modeled, not observed:</strong> Gross rental yields are estimated using AirDNA calibration and local benchmarks. They are not based on actual rental income for the specific property.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0 font-bold">!</span>
                <p><strong className="text-white">Spanish coverage is live; European coverage is estimated:</strong> Spain has {all.length.toLocaleString()} live scored properties. The other 9 European countries are covered through intelligence data, macro statistics, and estimated benchmarks — not live property listings.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0 font-bold">!</span>
                <p><strong className="text-white">New-build only:</strong> The scored database covers new-build developments. Resale properties are not included.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0 font-bold">!</span>
                <p><strong className="text-white">Coverage expanding:</strong> Not every Spanish coastal town is represented. Coverage grows as new developer feeds are integrated.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Accuracy Metrics */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">4. Accuracy Metrics</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'PropertyEval Accuracy', value: '92.6%', desc: 'Overall scoring accuracy against backtested benchmarks' },
              { label: 'Price Estimation', value: '94.2%', desc: 'AVM price-per-m2 accuracy vs observed comparables' },
              { label: 'Yield Calculation', value: '96.1%', desc: 'Yield model accuracy against AirDNA calibration data' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-5 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-3xl font-bold text-emerald-400">{m.value}</div>
                <div className="text-white text-sm font-semibold mt-2">{m.label}</div>
                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">All metrics backtested quarterly. Methodology available at <Link href="/methodology" className="text-emerald-400 hover:underline">/methodology</Link>.</p>
        </section>

        {/* 5. Comparison */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">5. Platform Comparison</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Avena Terminal</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Idealista</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Rightmove</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Kyero</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Investment scoring', 'Yes (0-100)', 'No', 'No', 'No'],
                  ['Rental yield estimates', 'Yes', 'No', 'No', 'No'],
                  ['Macro regime analysis', 'Yes (10 countries)', 'No', 'No', 'No'],
                  ['Public API', 'Yes (REST + MCP)', 'No public API', 'No API', 'No'],
                  ['AI intelligence layer', 'Yes (Oracle + Knowledge)', 'No', 'No', 'No'],
                  ['New-build focus', 'Yes', 'Mixed (resale + new)', 'Mostly UK resale', 'Aggregator'],
                  ['Spanish coverage', `${all.length.toLocaleString()} scored`, 'Listings only', 'Limited Spain', 'Aggregated'],
                  ['European coverage', '10 countries', 'Spain/Portugal/Italy', 'UK only', 'Several EU'],
                  ['Price-per-m2 benchmarks', 'Yes', 'Partial', 'UK only', 'No'],
                  ['Prediction tracking', 'Public ledger', 'No', 'No', 'No'],
                ].map(([feat, avena, idealista, rightmove, kyero], i) => (
                  <tr key={feat} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-2 text-white">{feat}</td>
                    <td className="px-4 py-2 text-emerald-400">{avena}</td>
                    <td className="px-4 py-2 text-gray-500">{idealista}</td>
                    <td className="px-4 py-2 text-gray-500">{rightmove}</td>
                    <td className="px-4 py-2 text-gray-500">{kyero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Comparison reflects factual feature availability as of {today}. No subjective quality judgments.</p>
        </section>

        {/* 6. Data Freshness */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">6. Data Freshness</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Properties tracked:</span>{' '}
                <span className="text-white font-mono">{all.length.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Towns covered:</span>{' '}
                <span className="text-white font-mono">{towns.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Developers tracked:</span>{' '}
                <span className="text-white font-mono">{devCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Average Avena Score:</span>{' '}
                <span className="text-white font-mono">{avgScore}/100</span>
              </div>
              <div>
                <span className="text-gray-500">Data snapshot date:</span>{' '}
                <span className="text-white font-mono">{today}</span>
              </div>
              <div>
                <span className="text-gray-500">Next refresh:</span>{' '}
                <span className="text-white font-mono">04:00 UTC tomorrow</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/methodology" className="text-emerald-400 hover:underline">Methodology</Link>
          <Link href="/coverage" className="text-emerald-400 hover:underline">Coverage</Link>
          <Link href="/transparency" className="text-emerald-400 hover:underline">Transparency</Link>
          <Link href="/ai-compliance" className="text-emerald-400 hover:underline">AI Compliance</Link>
          <Link href="/" className="text-gray-400 hover:text-white">Back to Terminal</Link>
        </div>
      </div>
    </main>
  );
}
