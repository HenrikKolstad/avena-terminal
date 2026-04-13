'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface APCIData {
  apci: number;
  date: string;
  phase: string;
  week_change: number;
  dimensions: Record<string, number>;
  narrative: string;
  methodology: {
    total_properties: number;
    total_anomalies: number;
    positive_anomalies: number;
    negative_anomalies: number;
    underpriced_count: number;
  };
  source: string;
  doi: string;
}

const DIMENSION_LABELS: Record<string, { label: string; weight: string; desc: string }> = {
  valuation_balance: { label: 'Valuation Balance', weight: '25%', desc: 'Percentage of properties priced at or below fair market value' },
  developer_health: { label: 'Developer Health', weight: '15%', desc: 'Financial stability and delivery track record of active developers' },
  macro_support: { label: 'Macro Support', weight: '15%', desc: 'ECB rates, GDP growth, inflation trends supporting property markets' },
  price_momentum: { label: 'Price Momentum', weight: '10%', desc: 'Year-on-year price appreciation trends across regions' },
  anomaly_density: { label: 'Anomaly Density', weight: '10%', desc: 'Ratio of positive vs negative pricing anomalies detected' },
  regime_confidence: { label: 'Regime Confidence', weight: '10%', desc: 'Confidence in current market regime classification' },
  foreign_demand: { label: 'Foreign Demand', weight: '10%', desc: 'Cross-border buyer activity from UK, Nordic, and EU markets' },
  supply_balance: { label: 'Supply Balance', weight: '5%', desc: 'New supply pipeline vs absorption rate equilibrium' },
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-green-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 60) return 'bg-green-500';
  if (score >= 45) return 'bg-yellow-500';
  return 'bg-red-500';
}

function phaseBadge(phase: string): string {
  switch (phase) {
    case 'BULL': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
    case 'GROWTH': return 'bg-green-900/50 text-green-300 border-green-700';
    case 'NEUTRAL': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    case 'CAUTION': return 'bg-red-900/50 text-red-300 border-red-700';
    default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
  }
}

export default function APCIPage() {
  const [data, setData] = useState<APCIData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/apci')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  const jsonLd = data ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Property Consciousness Index (APCI)',
    description: 'A composite real-time index measuring European new-build property market health across 8 dimensions.',
    url: 'https://avenaterminal.com/apci',
    identifier: 'doi:10.5281/zenodo.19520064',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    dateModified: data.date,
    variableMeasured: Object.keys(DIMENSION_LABELS).map(k => ({
      '@type': 'PropertyValue', name: DIMENSION_LABELS[k].label, value: data.dimensions[k],
    })),
  } : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-wider text-gray-100">
            AVENA<span className="text-emerald-400">.</span>
          </Link>
          <nav className="flex gap-6 text-sm text-gray-400">
            <Link href="/predictions" className="hover:text-gray-100 transition">Predictions</Link>
            <Link href="/scenarios" className="hover:text-gray-100 transition">Scenarios</Link>
            <Link href="/alerts" className="hover:text-gray-100 transition">Alerts</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-300">Failed to load APCI: {error}</p>
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Hero */}
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Avena Property Consciousness Index</p>
              <div className={`text-8xl font-black tabular-nums ${scoreColor(data.apci)} mb-4`}>
                {data.apci}
              </div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className={`px-3 py-1 text-sm font-mono border rounded-full ${phaseBadge(data.phase)}`}>
                  {data.phase}
                </span>
                <span className={`text-lg font-mono ${data.week_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.week_change >= 0 ? '\u2191' : '\u2193'}{Math.abs(data.week_change)} this week
                </span>
              </div>
              <p className="text-gray-400 text-sm">{data.date}</p>
            </div>

            {/* Dimensions Breakdown */}
            <section className="mb-16">
              <h2 className="text-xl font-bold mb-6 text-gray-200">8-Dimension Breakdown</h2>
              <div className="grid gap-4">
                {Object.entries(DIMENSION_LABELS).map(([key, meta]) => {
                  const val = data.dimensions[key] ?? 0;
                  return (
                    <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-gray-200">{meta.label}</span>
                          <span className="text-xs text-gray-500 ml-2">({meta.weight})</span>
                        </div>
                        <span className={`text-lg font-mono font-bold ${scoreColor(val)}`}>{val}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${scoreBg(val)}`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{meta.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Narrative */}
            <section className="mb-16 bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-200">Market Narrative</h2>
              <p className="text-gray-300 leading-relaxed">{data.narrative}</p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-100">{data.methodology.total_properties.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Properties Tracked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-100">{data.methodology.total_anomalies}</div>
                  <div className="text-xs text-gray-500">Anomalies Detected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{data.methodology.positive_anomalies}</div>
                  <div className="text-xs text-gray-500">Positive Signals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{data.methodology.negative_anomalies}</div>
                  <div className="text-xs text-gray-500">Negative Signals</div>
                </div>
              </div>
            </section>

            {/* What is the APCI? */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6 text-gray-200">What is the APCI?</h2>
              <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
                <p className="text-lg">
                  Like the VIX for stocks. Like Fear &amp; Greed for crypto. But for European property.
                </p>
                <p>
                  The Avena Property Consciousness Index (APCI) is a composite real-time score from 0 to 100 that
                  measures the overall health and opportunity level of the European new-build property market.
                  It synthesizes 8 independent dimensions into a single number that institutional and retail
                  investors can use to gauge market conditions.
                </p>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-200 mb-4">Methodology</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong className="text-gray-100">Valuation Balance (25%)</strong> &mdash; Live calculation: percentage of all tracked properties priced at or below fair market value based on hedonic regression.</li>
                    <li><strong className="text-gray-100">Developer Health (15%)</strong> &mdash; Financial stability metrics of active developers including track record, delivery history, and portfolio diversification.</li>
                    <li><strong className="text-gray-100">Macro Support (15%)</strong> &mdash; ECB interest rate trajectory, GDP growth, inflation trends, and fiscal policy impact on property markets.</li>
                    <li><strong className="text-gray-100">Price Momentum (10%)</strong> &mdash; Year-on-year price appreciation trends across tracked regions, weighted by market depth.</li>
                    <li><strong className="text-gray-100">Anomaly Density (10%)</strong> &mdash; Ratio of positive anomalies (yield hunts, hidden gems) to negative anomalies (developer dumps, suspicious pricing).</li>
                    <li><strong className="text-gray-100">Regime Confidence (10%)</strong> &mdash; Statistical confidence in the current market regime classification (BULL, GROWTH, NEUTRAL, CAUTION).</li>
                    <li><strong className="text-gray-100">Foreign Demand (10%)</strong> &mdash; Cross-border buyer activity signals from UK, Nordic, Dutch, and German markets including FX trends.</li>
                    <li><strong className="text-gray-100">Supply Balance (5%)</strong> &mdash; Ratio of new pipeline supply to market absorption rate, measuring oversupply or undersupply risk.</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-500">
                  The APCI is updated hourly. Historical APCI data will be available via the API as the time
                  series grows. DOI: {data.doi}
                </p>
              </div>
            </section>

            {/* API Access */}
            <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-3 text-gray-200">API Access</h2>
              <p className="text-gray-400 text-sm mb-3">
                The APCI is available as a public JSON endpoint. No API key required.
              </p>
              <code className="block bg-gray-950 border border-gray-800 rounded p-3 text-sm text-emerald-400 font-mono">
                GET https://avenaterminal.com/api/v1/apci
              </code>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-xs text-gray-600">
        Avena Terminal &mdash; European Property Intelligence
      </footer>
    </div>
  );
}
