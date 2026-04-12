import { Metadata } from 'next';
import Link from 'next/link';
import { detectAnomalies, AlphaSignal } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Alpha Signals — AI-Detected Property Anomalies | Avena Terminal',
  description: 'Live anomaly detection across 1,881 Spanish new builds. Score outliers, deep discounts, yield spikes, and geographic mispricing flagged by the Avena Intelligence Agent.',
  alternates: { canonical: 'https://avenaterminal.com/intelligence/signals' },
};

const SEVERITY_COLORS = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' };
const TYPE_LABELS: Record<string, string> = {
  price_anomaly: 'PRICE ANOMALY',
  score_outlier: 'SCORE OUTLIER',
  developer_discount: 'DEV DISCOUNT',
  geographic_mispricing: 'GEO MISPRICING',
  yield_spike: 'YIELD SPIKE',
  new_high_scorer: 'NEW HIGH SCORER',
};
const TYPE_COLORS: Record<string, string> = {
  price_anomaly: '#f87171',
  score_outlier: '#10b981',
  developer_discount: '#a78bfa',
  geographic_mispricing: '#f97316',
  yield_spike: '#06b6d4',
  new_high_scorer: '#34d399',
};

export default function AlphaSignalsPage() {
  const signals = detectAnomalies();
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const high = signals.filter(s => s.severity === 'high').length;
  const medium = signals.filter(s => s.severity === 'medium').length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Alpha Signals \u2014 ${date}`,
    description: `${signals.length} anomalies detected across the Spanish new build market.`,
    url: 'https://avenaterminal.com/intelligence/signals',
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: new Date().toISOString(),
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
            <span className="text-xs font-mono text-gray-400">ALPHA SIGNALS</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-1">Alpha Signals</h1>
        <p className="text-gray-400 text-sm mb-2">AI-detected market anomalies &middot; {date}</p>
        <p className="text-xs text-gray-600 font-mono mb-6">{signals.length} signals &middot; {high} high severity &middot; {medium} medium &middot; Auto-detected from {1881} properties</p>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="text-2xl font-bold text-white">{signals.length}</div>
            <div className="text-[9px] text-gray-500 uppercase">Signals</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #f8717130' }}>
            <div className="text-2xl font-bold" style={{ color: '#f87171' }}>{high}</div>
            <div className="text-[9px] text-gray-500 uppercase">High</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #fbbf2430' }}>
            <div className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{medium}</div>
            <div className="text-[9px] text-gray-500 uppercase">Medium</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="text-2xl font-bold text-white">{signals.filter(s => s.severity === 'low').length}</div>
            <div className="text-[9px] text-gray-500 uppercase">Low</div>
          </div>
        </div>

        <div className="h-px w-full mb-6" style={{ background: '#1c2333' }} />

        {/* Signals */}
        <div className="space-y-4">
          {signals.map(signal => (
            <div key={signal.id} className="rounded-lg p-5" style={{ background: '#161b22', border: `1px solid ${SEVERITY_COLORS[signal.severity]}30` }}>
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: TYPE_COLORS[signal.type] + '20', color: TYPE_COLORS[signal.type] }}>
                  {TYPE_LABELS[signal.type]}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: SEVERITY_COLORS[signal.severity] + '20', color: SEVERITY_COLORS[signal.severity] }}>
                  {signal.severity}
                </span>
                <span className="text-[10px] font-mono text-gray-600">Score {signal.property.score}</span>
                <span className="text-[10px] font-mono text-gray-600">&euro;{signal.property.price.toLocaleString()}</span>
              </div>

              {/* Headline */}
              <h3 className="text-white font-semibold mb-2">{signal.headline}</h3>
              <p className="text-sm text-gray-400 mb-4">{signal.detail}</p>

              {/* Analysis */}
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className="rounded p-3" style={{ background: '#0d1117' }}>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Why Anomalous</div>
                  <p className="text-xs text-gray-400">{signal.analysis.why_anomalous}</p>
                </div>
                <div className="rounded p-3" style={{ background: '#0d1117' }}>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Estimated Upside</div>
                  <p className="text-xs text-gray-400">{signal.analysis.estimated_upside}</p>
                </div>
              </div>

              {/* Risk + Action */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded p-3" style={{ background: '#0d1117' }}>
                  <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Risk Factors</div>
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    {signal.analysis.risk_factors.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
                <div className="rounded p-3" style={{ background: '#0d1117' }}>
                  <div className="text-[10px] text-blue-400 font-bold uppercase mb-1">Recommended Action</div>
                  <p className="text-xs text-gray-400">{signal.analysis.recommended_action}</p>
                </div>
              </div>

              {/* Property link */}
              {signal.property.ref && (
                <a href={`/property/${encodeURIComponent(signal.property.ref)}`} className="text-[10px] text-emerald-400 hover:underline mt-3 block">View property details &rarr;</a>
              )}
            </div>
          ))}
        </div>

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        {/* How it works */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">How Alpha Detection Works</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {[
              { title: 'Score Outliers', desc: 'Properties scoring 15+ points above their town average — statistically significant outperformance' },
              { title: 'Deep Discounts', desc: 'Properties priced 20%+ below local market rate — potential underpricing or distressed sale' },
              { title: 'Yield Spikes', desc: 'Gross yields above 8% — income opportunities above normal market returns' },
              { title: 'Geo Mispricing', desc: 'Beach properties priced below inland averages — violates proximity premium model' },
            ].map(c => (
              <div key={c.title} className="rounded-lg p-3" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-xs mb-1">{c.title}</h3>
                <p className="text-[10px] text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Avena Terminal Alpha Signals.</p>
            <p className="text-gray-400">https://avenaterminal.com/intelligence/signals</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Autonomous property anomaly detection &middot; Updated every refresh
        </footer>
      </div>
    </main>
  );
}
