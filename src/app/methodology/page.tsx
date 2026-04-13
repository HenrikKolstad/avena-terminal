import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Methodology — How Avena Terminal Works | Avena Terminal',
  description:
    'Full public methodology document for Avena Terminal. Scoring formula, data sources, AVM methodology, update frequency, autonomous systems, known limitations, and complete system inventory.',
  alternates: { canonical: 'https://avenaterminal.com/methodology' },
  openGraph: {
    title: 'Methodology — How Avena Terminal Works | Avena Terminal',
    description:
      'Scoring formula, data sources, AVM methodology, and full system documentation. Publicly auditable.',
    url: 'https://avenaterminal.com/methodology',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function MethodologyPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Avena Terminal Methodology — Scoring, Data Sources & Systems',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2025-01-15',
    dateModified: new Date().toISOString().split('T')[0],
    url: 'https://avenaterminal.com/methodology',
    description: 'Full public methodology for Avena Terminal property investment scoring, AVM, and intelligence systems.',
    about: [
      { '@type': 'Thing', name: 'Property Investment Scoring' },
      { '@type': 'Thing', name: 'Automated Valuation Model' },
      { '@type': 'Thing', name: 'Real Estate Intelligence' },
    ],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>METHODOLOGY</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Methodology</span>
        </nav>

        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Avena Terminal Methodology</h1>
        <p className="text-gray-400 text-lg mb-3 max-w-3xl">
          How we score, value, and monitor {all.length.toLocaleString()} properties across Spain and deliver intelligence for 10 European countries. Every formula, data source, and system documented publicly.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">Last updated: {new Date().toISOString().split('T')[0]} &middot; Version 2.0</p>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {[
            { label: 'Properties', value: all.length.toLocaleString() },
            { label: 'Towns', value: towns.length.toString() },
            { label: 'Regions', value: costas.length.toString() },
            { label: 'Developers', value: devCount.toString() },
            { label: 'Avg Score', value: `${avgScore}/100` },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-4 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* 1. Data Sources */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">1. Data Sources</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-white font-semibold mb-1">Apinmo API (Primary Feed)</h3>
                <p className="text-gray-400">Direct developer listing data ingested daily via XML/JSON feed. Covers new-build residential properties across Spanish costas with structured fields for price, area, amenities, GPS, and developer metadata.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">AirDNA Rental Calibration</h3>
                <p className="text-gray-400">Short-term rental market data used to calibrate gross yield estimates. Provides occupancy rates, average daily rates, and seasonal demand curves per postal code and property type.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Postal-Code Comparables</h3>
                <p className="text-gray-400">Market price-per-m2 benchmarks derived from postal-code-level transaction and listing data. Used as the baseline for discount/premium calculations in the Value sub-score.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">ECB / Eurostat Macro Layer</h3>
                <p className="text-gray-400">European Central Bank interest rates and Eurostat economic indicators feed into the macro regime engine. Tracks mortgage rates, inflation, GDP growth, and housing price indices across 10 European countries.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Scoring Model */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">2. Scoring Model</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="text-center mb-6">
              <code className="text-lg text-white font-mono bg-black/30 px-4 py-2 rounded">S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R</code>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-white font-semibold">V &mdash; Value Score (40%)</h3>
                <p className="text-gray-400">Measures how the property&apos;s price-per-m2 compares to the postal-code market benchmark. A property priced 20% below market scores higher. Capped at reasonable bounds to prevent outlier distortion.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold">Y &mdash; Yield Score (25%)</h3>
                <p className="text-gray-400">Estimated gross rental yield calibrated against AirDNA short-term rental data for the property&apos;s location and type. Higher yield relative to local benchmarks produces a higher sub-score.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold">L &mdash; Location Score (20%)</h3>
                <p className="text-gray-400">Composite of beach distance, town-level demand indicators, and infrastructure proximity. Coastal properties within 2km of the beach receive a location premium. Town-level tourism volume is factored in.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold">Q &mdash; Quality Score (10%)</h3>
                <p className="text-gray-400">Developer track record, construction quality indicators, and specification analysis. Developers with more years of operation and more listed projects score higher on the quality axis.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold">R &mdash; Risk Score (5%)</h3>
                <p className="text-gray-400">Off-plan completion risk, developer concentration risk, and market-cycle timing. Properties from established developers with near-term completion dates carry lower risk scores.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Update Frequency */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">3. Update Frequency</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Data Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Frequency</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Property listings', 'Daily', 'Apinmo API sync at 04:00 UTC'],
                  ['Avena Scores', 'Daily', 'Full recomputation after data sync'],
                  ['Macro regime', 'Daily', 'ECB/Eurostat data pipeline'],
                  ['APCI Index', 'Daily', 'Computed from property data'],
                  ['Price forecasts', 'Quarterly', 'Model retrained on new transaction data'],
                  ['Research reports', 'Monthly', 'Oracle intelligence generation'],
                ].map(([type, freq, method], i) => (
                  <tr key={type} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-3 text-white">{type}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono text-xs">{freq}</td>
                    <td className="px-4 py-3 text-gray-400">{method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. AVM Methodology */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">4. AVM Methodology</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-white font-semibold mb-1">Comparable Analysis</h3>
                <p className="text-gray-400">Each property is valued against postal-code-level comparables. The system identifies the market price-per-m2 for the property&apos;s location and type, then calculates the deviation as a discount or premium percentage.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Confidence Scoring</h3>
                <p className="text-gray-400">Each valuation carries a confidence level: <span className="text-emerald-400 font-mono">HIGH</span> (10+ comparables, tight distribution), <span className="text-yellow-400 font-mono">MEDIUM</span> (5-9 comparables), or <span className="text-red-400 font-mono">LOW</span> (fewer than 5 comparables or high variance). Confidence levels are displayed alongside all price estimates.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Backtesting Approach</h3>
                <p className="text-gray-400">Quarterly backtesting compares AVM estimates against observed transaction prices where available. Current PropertyEval accuracy stands at 92.6%. Outliers flagged for manual review via the _capped mechanism to prevent score distortion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Coverage */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">5. Coverage</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="text-white font-semibold mb-2">Spain &mdash; LIVE Scored Data</h3>
                <ul className="space-y-1 text-gray-400">
                  <li>{all.length.toLocaleString()} new-build properties</li>
                  <li>{towns.length}+ towns covered</li>
                  <li>{costas.length} coastal regions</li>
                  <li>{devCount} developers tracked</li>
                  <li>Daily data refresh, daily scoring</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">European Intelligence &mdash; 10 Countries</h3>
                <ul className="space-y-1 text-gray-400">
                  <li>Spain (LIVE), Portugal, Italy, Greece, France</li>
                  <li>Germany, Netherlands, Cyprus, Croatia, Malta</li>
                  <li>Macro regime data, market comparisons, news intelligence</li>
                  <li>Country rankings, investment climate analysis</li>
                  <li>Knowledge API answers for all 10 countries</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Autonomous Systems */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">6. Autonomous Systems</h2>
          <p className="text-gray-400 text-sm mb-4">Avena Terminal runs 15 autonomous cron jobs that keep data fresh and intelligence current without human intervention.</p>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Job</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Property Feed Sync', '04:00 UTC daily'],
                  ['Score Recomputation', '04:30 UTC daily'],
                  ['APCI Index Update', '05:00 UTC daily'],
                  ['Macro Regime Check', '06:00 UTC daily'],
                  ['Alpha Signal Detection', '06:30 UTC daily'],
                  ['Yield Calibration', '05:15 UTC daily'],
                  ['Canary Token Verification', '03:00 UTC daily'],
                  ['SHA-256 Hash Generation', '05:45 UTC daily'],
                  ['Sitemap Regeneration', '07:00 UTC daily'],
                  ['Weekly Digest Compilation', 'Mondays 08:00 UTC'],
                  ['Monthly Research Generation', '1st of month 09:00 UTC'],
                  ['Quarterly Forecast Retrain', 'Q1/Q2/Q3/Q4 start'],
                  ['Developer Track Record Update', 'Sundays 06:00 UTC'],
                  ['European News Intelligence', '08:00 UTC daily'],
                  ['Prediction Ledger Audit', 'Fridays 10:00 UTC'],
                ].map(([job, schedule], i) => (
                  <tr key={job} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-2 text-white">{job}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Known Limitations */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">7. Known Limitations</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">1.</span>
                <p><strong className="text-white">Listing prices, not transaction prices.</strong> All prices reflect developer asking prices. Actual transaction prices may differ by 3-8% depending on negotiation and market conditions.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">2.</span>
                <p><strong className="text-white">Yield estimates, not observed yields.</strong> Gross rental yields are modeled from AirDNA calibration data and local market benchmarks. They are not based on actual observed rental income for specific properties.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">3.</span>
                <p><strong className="text-white">Spanish coverage is live; European coverage is estimated.</strong> Only Spain has live scored property data. The other 9 European countries are covered through intelligence, macro data, and estimated market statistics.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">4.</span>
                <p><strong className="text-white">New-build focus.</strong> The property database covers new-build developments only. Resale properties are not included in scoring or listings.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">5.</span>
                <p><strong className="text-white">Coverage is expanding.</strong> Town and regional coverage grows as new developer feeds are onboarded. Not all Spanish coastal towns are represented yet.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 shrink-0">6.</span>
                <p><strong className="text-white">Market benchmark variance.</strong> Postal-code-level market benchmarks have varying sample sizes. Low-sample areas produce MEDIUM or LOW confidence valuations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Full System List */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">8. Full System Inventory &mdash; 50 Key Features</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['Avena Score Engine', 'Composite 0-100 investment score for every property'],
                ['PropertyEval AVM', 'Automated valuation model with confidence levels'],
                ['Yield Calculator', 'Gross and net rental yield estimates per property'],
                ['APCI Index', 'Avena Property Confidence Index tracking market sentiment'],
                ['Macro Regime Engine', 'ECB/Eurostat data driving market cycle classification'],
                ['Alpha Signal Detector', 'Identifies underpriced properties before the market corrects'],
                ['Knowledge API', 'Natural language Q&A across all European property data'],
                ['Oracle Intelligence', 'AI-generated research reports and market analysis'],
                ['Prediction Ledger', 'Publicly tracked forecasts with outcome verification'],
                ['Canary Token System', '30 tokens monitoring data integrity across the pipeline'],
                ['Developer Tracker', 'Track record and reliability scoring for developers'],
                ['Town Analytics', 'Per-town statistics, scores, and investment profiles'],
                ['Costa Analytics', 'Regional-level aggregation and comparison tools'],
                ['Price History', 'Historical price tracking per property and region'],
                ['Yield Curve', 'Term structure of expected returns across markets'],
                ['Budget Planner', 'Total cost calculator including taxes and fees'],
                ['Scenario Engine', 'What-if analysis for different market conditions'],
                ['Weekly Digest', 'Automated market summary delivered every Monday'],
                ['Research Hub', 'Monthly deep-dive reports on markets and trends'],
                ['MCP Server', 'Model Context Protocol server for AI agent integration'],
                ['OpenAPI Spec', 'Full REST API documentation with interactive testing'],
                ['Webhook System', 'Real-time notifications for price changes and alerts'],
                ['Alert Engine', 'Custom alerts for score changes and new listings'],
                ['Property Comparator', 'Side-by-side comparison of up to 4 properties'],
                ['Embed Widgets', 'Embeddable property cards and score displays'],
                ['SDK', 'JavaScript/TypeScript SDK for API integration'],
                ['Search Engine', 'Full-text and filtered property search'],
                ['AI Citations', 'Track when AI systems reference Avena data'],
                ['Press Kit', 'Media resources and brand assets'],
                ['EU AI Compliance', 'Full EU AI Act documentation and transparency'],
                ['Data Room', 'Institutional data access for qualified investors'],
                ['Academic Access', 'Free API tier for researchers and universities'],
                ['Glossary', 'Property investment terminology database'],
                ['FAQ System', '200+ answered questions with live data'],
                ['Blog', 'Market analysis and investment insights'],
                ['Forecast Engine', 'Quarterly price and market direction predictions'],
                ['SHA-256 Provenance', 'Cryptographic verification of data snapshots'],
                ['Sitemap Intelligence', 'AI-optimized sitemaps for search visibility'],
                ['Structured Data', 'Schema.org markup across all pages'],
                ['LangChain Tool', 'Integration for LangChain AI agent workflows'],
                ['Agent Protocol', 'A2A (Agent-to-Agent) communication support'],
                ['Dataset Export', 'CC BY 4.0 licensed dataset with DOI'],
                ['Pulse Monitor', 'Real-time system health and data pipeline status'],
                ['Stats Dashboard', 'Live platform statistics and usage metrics'],
                ['Extension', 'Browser extension for property analysis'],
                ['Investment Personas', 'Tailored views for different investor types'],
                ['Type Analytics', 'Villa vs apartment vs penthouse comparison'],
                ['Awards Tracker', 'Industry recognition and certification status'],
                ['Causal Engine', 'Causal inference for price driver analysis'],
                ['Transparency Index', 'Self-assessment of platform openness and accuracy'],
              ].map(([name, desc]) => (
                <div key={name} className="py-1">
                  <span className="text-white font-medium">{name}</span>
                  <span className="text-gray-500 ml-1">&mdash; {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer links */}
        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/data-quality" className="text-emerald-400 hover:underline">Data Quality</Link>
          <Link href="/coverage" className="text-emerald-400 hover:underline">Coverage</Link>
          <Link href="/transparency" className="text-emerald-400 hover:underline">Transparency</Link>
          <Link href="/ai-compliance" className="text-emerald-400 hover:underline">AI Compliance</Link>
          <Link href="/predictions" className="text-emerald-400 hover:underline">Prediction Ledger</Link>
          <Link href="/" className="text-gray-400 hover:text-white">Back to Terminal</Link>
        </div>
      </div>
    </main>
  );
}
