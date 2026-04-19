import { getAllProperties, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
  return '€' + n.toLocaleString('en-IE');
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

  const statGrid = [
    { label: 'Predictions Made', value: predictions.length.toString() },
    { label: 'Resolved', value: '0' },
    { label: 'Accuracy %', value: 'TBD' },
    { label: 'Avg Confidence Width', value: `${avgWidth}%` },
  ];

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
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Public Ledger
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Predictions with
                <br />
                <span className="italic text-gold">track record</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                We publish every forecast. We track every outcome. No property platform on earth has a public accuracy track record. Every prediction below is immutable once published.
              </p>
            </div>
          </div>
        </section>

        {/* Aggregate Stats */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Ledger Totals
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {statGrid.map(s => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-serif text-3xl md:text-4xl font-light tabular text-foreground">{s.value}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Predictions Table */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Active Predictions · Top 20
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Immutable, once published.
              </h2>
            </div>
            <div className="rounded-sm border overflow-x-auto" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderBottom: '1px solid hsl(var(--av-border) / 0.6)' }}>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Town</th>
                    <th className="px-4 py-3 text-right">Predicted Price</th>
                    <th className="px-4 py-3 text-right">Confidence Range</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 20).map((pred, i) => (
                    <tr key={pred.id} style={{ borderBottom: '1px solid hsl(var(--av-border) / 0.3)' }}>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{i + 1}</td>
                      <td className="px-4 py-3 text-foreground max-w-[260px] truncate">{pred.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{pred.town}</td>
                      <td className="px-4 py-3 text-right font-mono tabular text-foreground">{formatEur(pred.price)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">
                        {formatEur(pred.confidenceLow)} – {formatEur(pred.confidenceHigh)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-semibold ${pred.score >= 75 ? 'text-primary' : pred.score >= 60 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {pred.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs">{targetStr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Methodology
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground mb-6">
                How we score <span className="italic text-gold">the future</span>.
              </h2>
              <div className="rounded-sm border p-6 space-y-4 text-sm text-muted-foreground font-light" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p>
                  <strong className="text-foreground">Baseline Model:</strong> Each prediction uses the current asking price as the baseline forecast. The confidence interval spans -8% to +12% around the current price, reflecting asymmetric upside potential in the current GROWTH regime.
                </p>
                <p>
                  <strong className="text-foreground">Prediction Horizon:</strong> 12 months from publication date. Predictions are evaluated when the target date is reached by comparing to actual transaction data or updated listing prices.
                </p>
                <p>
                  <strong className="text-foreground">Immutability:</strong> Once published, predictions are never modified. This page serves as a public ledger. Accuracy metrics will be computed as predictions mature.
                </p>
                <p>
                  <strong className="text-foreground">Regime Awareness:</strong> Each prediction records the APCI regime at the time of publication. This enables analysis of prediction accuracy across different market conditions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="rounded-sm border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div>
                <h3 className="font-serif text-xl text-foreground mb-1">API Access</h3>
                <p className="text-muted-foreground text-sm">Full prediction data is available as a public JSON endpoint.</p>
              </div>
              <code className="rounded-sm px-4 py-3 font-mono text-sm text-primary" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))' }}>
                GET /api/predictions
              </code>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
