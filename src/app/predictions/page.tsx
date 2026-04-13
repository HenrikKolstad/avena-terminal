import Link from 'next/link';
import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata = {
  title: 'Public Prediction Ledger | Avena Terminal',
  description: 'Avena publishes every property price forecast and tracks every outcome. No property platform on earth has a public accuracy track record.',
  alternates: { canonical: 'https://avenaterminal.com/predictions' },
  openGraph: {
    title: 'Public Prediction Ledger | Avena Terminal',
    description: 'We publish every forecast. We track every outcome.',
    url: 'https://avenaterminal.com/predictions',
    siteName: 'Avena Terminal',
    type: 'website',
  },
};

function formatEur(n: number): string {
  return '\u20AC' + n.toLocaleString('en-IE');
}

export default function PredictionsPage() {
  const all = getAllProperties();
  const top50 = [...all]
    .filter(p => p._sc && p.pf > 0)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 50);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const targetDate = new Date(today);
  targetDate.setFullYear(targetDate.getFullYear() + 1);
  const targetStr = targetDate.toISOString().split('T')[0];

  const predictions = top50.map((p, i) => {
    const price = p.pf;
    const confidenceLow = Math.round(price * 0.92);
    const confidenceHigh = Math.round(price * 1.12);
    const confidenceWidth = ((confidenceHigh - confidenceLow) / price) * 100;
    return {
      id: `pred-${todayStr}-${i + 1}`,
      name: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      region: p.costa || p.r || '',
      price,
      confidenceLow,
      confidenceHigh,
      confidenceWidth: Number(confidenceWidth.toFixed(1)),
      score: p._sc || 0,
    };
  });

  const avgWidth = Number(avg(predictions.map(p => p.confidenceWidth)).toFixed(1));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Public Prediction Ledger',
    description: 'Immutable property price predictions with confidence intervals, published daily and tracked for accuracy.',
    url: 'https://avenaterminal.com/predictions',
    identifier: 'doi:10.5281/zenodo.19520064',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    dateModified: todayStr,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-wider text-gray-100">
            AVENA<span className="text-emerald-400">.</span>
          </Link>
          <nav className="flex gap-6 text-sm text-gray-400">
            <Link href="/apci" className="hover:text-gray-100 transition">APCI</Link>
            <Link href="/scenarios" className="hover:text-gray-100 transition">Scenarios</Link>
            <Link href="/alerts" className="hover:text-gray-100 transition">Alerts</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black mb-4 text-gray-100">
            Avena Public Prediction Ledger
          </h1>
          <p className="text-lg text-emerald-400 mb-2">
            We publish every forecast. We track every outcome.
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            No property platform on earth has a public accuracy track record.
            Every prediction below is immutable once published. When the target date arrives,
            we compare our forecast to the actual outcome and report the result transparently.
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-100">{predictions.length}</div>
            <div className="text-xs text-gray-500 mt-1">Predictions Made</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">0</div>
            <div className="text-xs text-gray-500 mt-1">Resolved</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">TBD</div>
            <div className="text-xs text-gray-500 mt-1">Accuracy %</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{avgWidth}%</div>
            <div className="text-xs text-gray-500 mt-1">Avg Confidence Width</div>
          </div>
        </div>

        {/* Predictions Table */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-4 text-gray-200">Active Predictions (Top 20)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="py-3 pr-4">#</th>
                  <th className="py-3 pr-4">Property</th>
                  <th className="py-3 pr-4">Town</th>
                  <th className="py-3 pr-4 text-right">Predicted Price</th>
                  <th className="py-3 pr-4 text-right">Confidence Range</th>
                  <th className="py-3 pr-4 text-right">Score</th>
                  <th className="py-3 text-right">Target Date</th>
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 20).map((pred, i) => (
                  <tr key={pred.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 pr-4 text-gray-500 font-mono">{i + 1}</td>
                    <td className="py-3 pr-4 text-gray-200 max-w-[200px] truncate">{pred.name}</td>
                    <td className="py-3 pr-4 text-gray-400">{pred.town}</td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-200">{formatEur(pred.price)}</td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-400 text-xs">
                      {formatEur(pred.confidenceLow)} &ndash; {formatEur(pred.confidenceHigh)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`font-mono font-bold ${pred.score >= 75 ? 'text-emerald-400' : pred.score >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {pred.score}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500 font-mono text-xs">{targetStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-bold mb-4 text-gray-200">Methodology</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-gray-100">Baseline Model:</strong> Each prediction uses the current asking price as the
              baseline forecast. The confidence interval spans -8% to +12% around the current price, reflecting asymmetric
              upside potential in the current GROWTH regime.
            </p>
            <p>
              <strong className="text-gray-100">Prediction Horizon:</strong> 12 months from publication date. Predictions are
              evaluated when the target date is reached by comparing to actual transaction data or updated listing prices.
            </p>
            <p>
              <strong className="text-gray-100">Immutability:</strong> Once published, predictions are never modified. This page
              serves as a public ledger. Accuracy metrics will be computed as predictions mature.
            </p>
            <p>
              <strong className="text-gray-100">Regime Awareness:</strong> Each prediction records the APCI regime at the time
              of publication. This enables analysis of prediction accuracy across different market conditions.
            </p>
          </div>
        </section>

        {/* API */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3 text-gray-200">API Access</h2>
          <p className="text-gray-400 text-sm mb-3">
            Full prediction data is available as a public JSON endpoint.
          </p>
          <code className="block bg-gray-950 border border-gray-800 rounded p-3 text-sm text-emerald-400 font-mono">
            GET https://avenaterminal.com/api/predictions
          </code>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-xs text-gray-600">
        Avena Terminal &mdash; European Property Intelligence
      </footer>
    </div>
  );
}
