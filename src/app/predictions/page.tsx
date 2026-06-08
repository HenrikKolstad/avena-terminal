/**
 * /predictions — published, time-stamped, falsifiable forecasts.
 *
 * Day-4 of the strategic execution brief. The credibility lever: most data
 * vendors curate accuracy retrospectively. Avena publishes calls BEFORE
 * they resolve, with reasoning, confidence band, and target date. The
 * audit trail is the asset.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { allPublishedPredictions } from '@/lib/published-predictions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Predictions · published, time-stamped, falsifiable',
  description: 'Ten specific calls on European residential property — published before they resolve, with reasoning, confidence band, target date, and methodology reference. Accuracy is auditable, not curated.',
  alternates: { canonical: 'https://avenaterminal.com/predictions' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena Published Predictions',
  description: 'Ten hand-curated, falsifiable, time-stamped predictions about European residential property markets, published with reasoning and methodology references.',
  url: 'https://avenaterminal.com/predictions',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: { '@type': 'Organization', name: 'Avena Terminal' },
};

const BAND_COLOR: Record<string, string> = {
  high:   'hsl(var(--av-success))',
  medium: 'hsl(var(--av-warning))',
  low:    'hsl(var(--av-muted-foreground))',
};

function fmtChange(p: number | null): string {
  if (p == null) return '—';
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}%`;
}

function fmtNumber(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) < 10) return n.toFixed(2);
  if (Math.abs(n) < 100) return n.toFixed(1);
  return Math.round(n).toLocaleString();
}

function daysUntil(target: string): number {
  return Math.ceil((new Date(target).getTime() - Date.now()) / 86_400_000);
}

export default async function PredictionsPage() {
  const all = await allPublishedPredictions();
  const unresolved = all.filter(p => !p.resolved);
  const resolved = all.filter(p => p.resolved);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Published predictions · time-stamped · falsifiable
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Ten calls. Published before they resolve.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Most data vendors curate accuracy retrospectively — quietly drop the misses, headline the hits. We do the opposite. Each prediction below is published before its target date, with the specific metric, the predicted value, the reasoning, the methodology version that produced it, and the public dataset that will resolve it. Every one is falsifiable against a citeable public source. The credibility is the audit trail, not the marketing.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground/85 leading-relaxed italic">
            Resolved predictions remain visible with their accuracy score. Methodology versions are linked to <Link href="/methodology/evolution" className="text-primary hover:underline">/methodology/evolution</Link>. Every state change writes to the event store at <Link href="/timetravel?type=prediction" className="text-primary hover:underline">/timetravel</Link>.
          </p>
        </section>

        {/* Active predictions */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Active · awaiting resolution · {unresolved.length}
          </div>
          {unresolved.length === 0 ? (
            <div className="rounded-sm border p-10" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              <p className="text-sm text-foreground/85">
                No active predictions are loaded. Run the seed migration <span className="font-mono text-foreground">20260526_epicenter_published_predictions.sql</span> to publish the initial ten.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unresolved.map(p => (
                <article key={p.id} id={p.short_id} className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground border rounded-sm px-2 py-1" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                        {p.short_id}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.32em]" style={{ color: BAND_COLOR[p.confidence_band] }}>
                        {p.confidence_band} confidence
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{p.target_segment}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground tabular whitespace-nowrap">
                      resolves {p.target_date} · in {daysUntil(p.target_date)}d
                    </span>
                  </div>

                  <p className="font-serif text-xl md:text-2xl font-light text-foreground leading-snug mb-4">{p.thesis}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <Cell label="Metric"      value={p.target_metric} />
                    <Cell label="Baseline"    value={fmtNumber(p.baseline_value)} />
                    <Cell label="Predicted"   value={fmtNumber(p.predicted_value)} />
                    <Cell label="Δ predicted" value={fmtChange(p.predicted_change_pct)} />
                  </div>

                  {p.reasoning && (
                    <details className="group">
                      <summary className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground cursor-pointer hover:text-foreground">Reasoning</summary>
                      <p className="mt-3 text-sm text-foreground/85 leading-relaxed">{p.reasoning}</p>
                    </details>
                  )}

                  <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <span><span className="text-foreground/70">methodology:</span> <Link href="/methodology/evolution" className="text-foreground hover:text-primary">{p.methodology_ref}</Link></span>
                    <span><span className="text-foreground/70">published:</span> <span className="text-foreground tabular">{p.published_at.slice(0, 10)}</span></span>
                    <Link href={`/api/v1/events?aggregate_id=${p.id}`} className="text-foreground/70 hover:text-primary">Event log →</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Resolved predictions */}
        {resolved.length > 0 && (
          <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
              Resolved · {resolved.length}
            </div>
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Thesis</th>
                    <th className="text-right p-3">Predicted</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map(p => (
                    <tr key={p.id} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="p-3 font-mono text-[10px] text-foreground whitespace-nowrap">{p.short_id}</td>
                      <td className="p-3 text-xs text-foreground/85 max-w-[600px] truncate" title={p.thesis}>{p.thesis}</td>
                      <td className="p-3 font-mono text-[10px] text-foreground tabular text-right">{fmtNumber(p.predicted_value)}</td>
                      <td className="p-3 font-mono text-[10px] text-foreground tabular text-right">{fmtNumber(p.actual_value)}</td>
                      <td className="p-3 font-mono text-[10px] tabular text-right" style={{ color: p.accuracy_score != null && p.accuracy_score >= 0.7 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                        {p.accuracy_score != null ? `${Math.round(p.accuracy_score * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Methodology footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">How resolution works</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Each prediction names a public dataset (Eurostat, ECB SDW, national stat office, or Avena&apos;s own index) and a specific date. When the target date arrives, the actual value is read from that source, the accuracy score is computed (1 - |predicted - actual| / |baseline - actual|, clamped to [0,1]), the prediction is marked resolved, and a `prediction.resolved` event lands in the event store. The audit trail is permanent — even predictions that miss badly remain visible at their original URL.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology/evolution" className="text-foreground/85 hover:text-primary">Methodology versions →</Link>
              <Link href="/track-record" className="text-foreground/85 hover:text-primary">Daily agent track record →</Link>
              <Link href="/timetravel?type=prediction" className="text-foreground/85 hover:text-primary">Replay history →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border p-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
      <div className="font-mono text-xs text-foreground tabular">{value}</div>
    </div>
  );
}
