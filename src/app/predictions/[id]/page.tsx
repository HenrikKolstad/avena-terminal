import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

interface PredictionRow {
  id: string;
  prediction_type: string;
  target: string;
  metric: string;
  current_value: number;
  predicted_value: number;
  predicted_change_pct: number;
  confidence: number;
  horizon_days: number;
  reasoning: string;
  submitter: string;
  submitter_type: string;
  status: string;
  published_at: string;
  verify_at: string;
}

interface OutcomeRow {
  prediction_id: string;
  actual_value: number;
  actual_change_pct: number;
  accuracy_score: number;
  within_tolerance: boolean;
  verified_at: string;
  notes: string | null;
}

async function fetchPrediction(id: string): Promise<{ prediction: PredictionRow | null; outcome: OutcomeRow | null }> {
  if (!supabase) return { prediction: null, outcome: null };
  try {
    const { data: prediction } = await supabase.from('predictions').select('*').eq('id', id).maybeSingle();
    if (!prediction) return { prediction: null, outcome: null };
    let outcome: OutcomeRow | null = null;
    if (prediction.status === 'verified') {
      const { data } = await supabase.from('prediction_outcomes').select('*').eq('prediction_id', id).maybeSingle();
      outcome = (data as OutcomeRow) || null;
    }
    return { prediction: prediction as PredictionRow, outcome };
  } catch {
    return { prediction: null, outcome: null };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { prediction } = await fetchPrediction(id);
  if (!prediction) return { title: 'Prediction Not Found | Avena Terminal' };
  const arrow = prediction.predicted_change_pct >= 0 ? '+' : '';
  const title = `${prediction.target} → ${arrow}${prediction.predicted_change_pct.toFixed(1)}% | Avena Prediction`;
  return {
    title,
    description: `${prediction.submitter} predicts ${prediction.target} ${prediction.metric} at ${prediction.predicted_value} (${arrow}${prediction.predicted_change_pct.toFixed(1)}%) over ${prediction.horizon_days} days. ${prediction.reasoning.slice(0, 140)}…`,
    alternates: { canonical: `https://avenaterminal.com/predictions/${id}` },
  };
}

function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function daysUntil(ts: string): number {
  const diff = new Date(ts).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 86400_000));
}

export default async function PredictionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { prediction, outcome } = await fetchPrediction(id);
  if (!prediction) notFound();

  const arrow = prediction.predicted_change_pct >= 0 ? '+' : '';
  const daysLeft = daysUntil(prediction.verify_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Claim',
    claimReviewed: `${prediction.target} ${prediction.metric} — predicted ${prediction.predicted_value}`,
    appearance: {
      '@type': 'CreativeWork',
      author: prediction.submitter,
      datePublished: prediction.published_at,
    },
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <nav className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/predictions" className="hover:text-primary">The Prediction Ledger</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground/80 break-all">{id.slice(0, 8)}…</span>
            </nav>

            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              {prediction.status === 'verified' ? 'Verified' : prediction.status === 'pending' ? 'Pending review' : 'Active call'}
              · {prediction.submitter_type}
              · {prediction.submitter}
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
              {prediction.target}
            </h1>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground">
              {prediction.prediction_type.replace(/_/g, ' ')} · {prediction.metric}
            </p>
          </div>
        </section>

        {/* Core numbers */}
        <section className="relative border-t py-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Current</div>
                <div className="font-serif text-4xl font-light tabular text-foreground">
                  {fmtNumber(prediction.current_value, prediction.current_value < 100 ? 2 : 0)}
                </div>
              </div>
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Predicted</div>
                <div className="font-serif text-4xl font-light tabular text-primary">
                  {fmtNumber(prediction.predicted_value, prediction.predicted_value < 100 ? 2 : 0)}
                </div>
              </div>
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Change</div>
                <div className={`font-serif text-4xl font-light tabular ${prediction.predicted_change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {arrow}{fmtNumber(prediction.predicted_change_pct, 1)}%
                </div>
              </div>
              <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Confidence</div>
                <div className="font-serif text-4xl font-light tabular text-foreground">{prediction.confidence}%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Outcome if verified */}
        {outcome && (
          <section className="relative border-t py-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
              <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Verified outcome · {new Date(outcome.verified_at).toISOString().slice(0, 10)}
              </span>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
                The market said <span className="italic text-gold">{fmtNumber(outcome.actual_value, outcome.actual_value < 100 ? 2 : 0)}</span>.
              </h2>
              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Actual</div>
                  <div className="font-serif text-3xl font-light tabular text-foreground">{fmtNumber(outcome.actual_value, outcome.actual_value < 100 ? 2 : 0)}</div>
                </div>
                <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Actual change</div>
                  <div className={`font-serif text-3xl font-light tabular ${outcome.actual_change_pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {outcome.actual_change_pct >= 0 ? '+' : ''}{fmtNumber(outcome.actual_change_pct, 1)}%
                  </div>
                </div>
                <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Accuracy</div>
                  <div className={`font-serif text-3xl font-light tabular ${outcome.accuracy_score >= 85 ? 'text-primary' : outcome.accuracy_score >= 40 ? 'text-foreground' : 'text-destructive'}`}>
                    {outcome.accuracy_score}/100
                  </div>
                </div>
                <div className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Within tolerance</div>
                  <div className={`font-serif text-3xl font-light tabular ${outcome.within_tolerance ? 'text-primary' : 'text-destructive'}`}>
                    {outcome.within_tolerance ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
              {outcome.notes && (
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {outcome.notes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Reasoning */}
        <section className="relative border-t py-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The thesis
            </span>
            <div
              className="rounded-sm border p-8"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <p className="font-serif text-xl font-light leading-relaxed text-foreground/90">{prediction.reasoning}</p>
            </div>
          </div>
        </section>

        {/* Metadata strip */}
        <section className="relative border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <dl className="grid sm:grid-cols-4 gap-6 font-mono text-[11px]">
              <div>
                <dt className="uppercase tracking-[0.22em] text-muted-foreground mb-1">Published</dt>
                <dd className="text-foreground tabular">{new Date(prediction.published_at).toISOString().slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.22em] text-muted-foreground mb-1">Verify at</dt>
                <dd className="text-foreground tabular">{new Date(prediction.verify_at).toISOString().slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.22em] text-muted-foreground mb-1">Horizon</dt>
                <dd className="text-foreground tabular">{prediction.horizon_days} days</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.22em] text-muted-foreground mb-1">Days left</dt>
                <dd className="text-foreground tabular">{prediction.status === 'verified' ? '—' : `${daysLeft}d`}</dd>
              </div>
            </dl>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Prediction ID {prediction.id} · immutable · DOI 10.5281/zenodo.19520064 · CC BY 4.0
            </p>

            <div className="mt-6">
              <Link href="/predictions" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">
                ← Back to the ledger
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
