import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import ChallengeForm from './_components/ChallengeForm';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'The Prediction Ledger — Every Call We Make | Avena Terminal',
  description: 'Every Avena prediction is timestamped, tracked, and verified against reality. Public accuracy score. Anyone can challenge.',
  alternates: { canonical: 'https://avenaterminal.com/predictions' },
  openGraph: {
    title: 'The Prediction Ledger — Every Call We Make',
    description: 'Public property-AI accuracy benchmark. Timestamped. Tracked. Verified.',
    url: 'https://avenaterminal.com/predictions',
    siteName: 'Avena Terminal',
    type: 'website',
  },
};

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
  id: string;
  prediction_id: string;
  actual_value: number;
  actual_change_pct: number;
  accuracy_score: number;
  within_tolerance: boolean;
  verified_at: string;
}

interface LeaderboardRow {
  submitter_name: string;
  submitter_type: string;
  total_predictions: number;
  verified_predictions: number;
  avg_accuracy: number;
  perfect_calls: number;
  close_calls: number;
}

async function loadData() {
  if (!supabase) return { active: [] as PredictionRow[], verified: [] as PredictionRow[], outcomes: [] as OutcomeRow[], leaderboard: [] as LeaderboardRow[], avenaStats: null as LeaderboardRow | null };

  const [activeRes, verifiedRes, leaderboardRes] = await Promise.all([
    supabase.from('predictions').select('*').eq('status', 'active').eq('submitter', 'avena').order('published_at', { ascending: false }).limit(50),
    supabase.from('predictions').select('*').eq('status', 'verified').order('verify_at', { ascending: false }).limit(50),
    supabase.from('prediction_leaderboard').select('*').order('avg_accuracy', { ascending: false }).order('verified_predictions', { ascending: false }).limit(50),
  ]);

  const verified = (verifiedRes.data as PredictionRow[]) || [];
  const verifiedIds = verified.map(p => p.id);
  let outcomes: OutcomeRow[] = [];
  if (verifiedIds.length > 0) {
    const { data } = await supabase.from('prediction_outcomes').select('*').in('prediction_id', verifiedIds);
    outcomes = (data as OutcomeRow[]) || [];
  }

  const leaderboard = (leaderboardRes.data as LeaderboardRow[]) || [];
  const avenaStats = leaderboard.find(l => l.submitter_name === 'avena') || null;

  return {
    active: (activeRes.data as PredictionRow[]) || [],
    verified,
    outcomes,
    leaderboard,
    avenaStats,
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

export default async function PredictionsPage() {
  const { active, verified, outcomes, leaderboard, avenaStats } = await loadData();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Prediction Ledger',
    description: 'Public property AI accuracy benchmark. Every Avena prediction is timestamped, tracked, and verified against reality.',
    url: 'https://avenaterminal.com/predictions',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: 'doi:10.5281/zenodo.19520064',
  };

  const outcomeMap = new Map<string, OutcomeRow>();
  for (const o of outcomes) outcomeMap.set(o.prediction_id, o);

  const avenaAccuracyReady = (avenaStats?.verified_predictions ?? 0) >= 5;

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'hsl(var(--av-primary))' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'hsl(var(--av-primary))' }} />
                </span>
                Public · Timestamped · Tracked
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
                The Prediction
                <br />
                <span className="italic text-gold">Ledger</span>.
              </h1>
              <p className="mt-8 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Every call we make. Public. Tracked. Verified.
                <br />
                No other property company does this.
              </p>

              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border w-fit" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="p-5 min-w-[180px]" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Avena accuracy</div>
                  <div className="font-serif text-3xl font-light tabular text-foreground">
                    {avenaAccuracyReady ? `${fmtNumber(avenaStats?.avg_accuracy, 1)}%` : 'Building…'}
                  </div>
                  {!avenaAccuracyReady && (
                    <div className="mt-1 font-mono text-[9px] text-muted-foreground">Need 5 verified</div>
                  )}
                </div>
                <div className="p-5 min-w-[180px]" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Active calls</div>
                  <div className="font-serif text-3xl font-light tabular text-primary">{active.length}</div>
                </div>
                <div className="p-5 min-w-[180px]" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Verified</div>
                  <div className="font-serif text-3xl font-light tabular text-foreground">{avenaStats?.verified_predictions ?? 0}</div>
                </div>
                <div className="p-5 min-w-[180px]" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Perfect calls</div>
                  <div className="font-serif text-3xl font-light tabular text-foreground">{avenaStats?.perfect_calls ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Active predictions */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
              <div>
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Active calls · Avena
                </span>
                <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                  On the <span className="italic text-gold">ledger</span>.
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Live · updates every 5 min
              </span>
            </div>

            {active.length === 0 ? (
              <div className="rounded-sm border p-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderStyle: 'dashed', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                No active predictions yet — Agent Nostradamus runs daily at 07:00 UTC
              </div>
            ) : (
              <div className="overflow-x-auto rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full font-mono text-sm min-w-[1000px]">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                      {['Target', 'Metric', 'Current', 'Predicted', 'Change', 'Confidence', 'Days left', 'Horizon'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(p => {
                      const daysLeft = daysUntil(p.verify_at);
                      const isPositive = p.predicted_change_pct >= 0;
                      return (
                        <tr key={p.id} className="border-b hover:bg-[hsl(var(--av-surface)/0.4)] transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                          <td className="px-4 py-4 font-serif text-base text-foreground">
                            <Link href={`/predictions/${p.id}`} className="hover:text-primary">
                              {p.target}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{p.metric}</td>
                          <td className="px-4 py-4 tabular text-foreground/90">{fmtNumber(p.current_value, p.current_value < 100 ? 2 : 0)}</td>
                          <td className="px-4 py-4 tabular text-foreground">{fmtNumber(p.predicted_value, p.predicted_value < 100 ? 2 : 0)}</td>
                          <td className={`px-4 py-4 tabular font-medium ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                            {isPositive ? '+' : ''}{fmtNumber(p.predicted_change_pct, 1)}%
                          </td>
                          <td className="px-4 py-4">
                            <span className={`tabular ${p.confidence >= 70 ? 'text-primary' : p.confidence >= 55 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {p.confidence}%
                            </span>
                          </td>
                          <td className="px-4 py-4 tabular text-muted-foreground">{daysLeft}d</td>
                          <td className="px-4 py-4 tabular text-muted-foreground/80">{p.horizon_days}d</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Verified outcomes */}
        {verified.length > 0 && (
          <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
              <div className="mb-8">
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Verified · {verified.length} resolved
                </span>
                <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                  The track <span className="italic text-gold">record</span>.
                </h2>
              </div>

              <div className="overflow-x-auto rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full font-mono text-sm min-w-[1100px]">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                      {['Target', 'Metric', 'Predicted', 'Actual', 'Delta', 'Accuracy', 'Submitter'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {verified.map(p => {
                      const o = outcomeMap.get(p.id);
                      if (!o) return null;
                      const absDelta = Math.abs(((p.predicted_value - o.actual_value) / o.actual_value) * 100);
                      return (
                        <tr key={p.id} className="border-b hover:bg-[hsl(var(--av-surface)/0.4)] transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                          <td className="px-4 py-4 font-serif text-base text-foreground">
                            <Link href={`/predictions/${p.id}`} className="hover:text-primary">
                              {p.target}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{p.metric}</td>
                          <td className="px-4 py-4 tabular text-foreground/90">{fmtNumber(p.predicted_value, p.predicted_value < 100 ? 2 : 0)}</td>
                          <td className="px-4 py-4 tabular text-foreground">{fmtNumber(o.actual_value, o.actual_value < 100 ? 2 : 0)}</td>
                          <td className="px-4 py-4 tabular text-muted-foreground">{fmtNumber(absDelta, 1)}%</td>
                          <td className={`px-4 py-4 tabular font-semibold ${o.accuracy_score >= 85 ? 'text-primary' : o.accuracy_score >= 40 ? 'text-foreground' : 'text-destructive'}`}>
                            {o.accuracy_score}/100
                          </td>
                          <td className="px-4 py-4 text-muted-foreground/80 uppercase tracking-[0.18em] text-[10px]">{p.submitter}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
              <div>
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Leaderboard · All submitters
                </span>
                <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                  Ranked by <span className="italic text-gold">accuracy</span>.
                </h2>
              </div>
              <Link href="/predictions/leaderboard" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">
                Full leaderboard →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full font-mono text-sm min-w-[800px]">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    {['#', 'Submitter', 'Type', 'Accuracy', 'Verified', 'Total', 'Perfect', 'Close'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground uppercase tracking-[0.22em] text-[10px]">Leaderboard populating — Agent Arbiter runs daily 08:00 UTC</td></tr>
                  ) : leaderboard.slice(0, 10).map((row, i) => (
                    <tr key={row.submitter_name} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-4 py-4 tabular text-muted-foreground">
                        {i === 0 ? <span className="text-xl">🥇</span> : i === 1 ? <span className="text-xl">🥈</span> : i === 2 ? <span className="text-xl">🥉</span> : i + 1}
                      </td>
                      <td className={`px-4 py-4 font-serif text-base ${row.submitter_name === 'avena' ? 'text-primary' : 'text-foreground'}`}>
                        {row.submitter_name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground text-[10px] uppercase tracking-[0.22em]">{row.submitter_type}</td>
                      <td className="px-4 py-4 tabular font-semibold text-primary">{fmtNumber(row.avg_accuracy, 1)}%</td>
                      <td className="px-4 py-4 tabular text-foreground/90">{row.verified_predictions}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.total_predictions}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.perfect_calls}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.close_calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Challenge form */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <div className="mb-8 max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Challenge Avena
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Make your <span className="italic text-gold">call</span>.
              </h2>
              <p className="mt-4 font-light text-base text-muted-foreground">
                Think you can beat Avena? Submit a prediction on the same targets. We verify on the same date, scored on the same metric. Your name goes on the leaderboard next to ours.
              </p>
            </div>
            <ChallengeForm />
          </div>
        </section>

        {/* Scoring */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Accuracy scoring
            </span>
            <h3 className="font-serif text-2xl font-light text-foreground mb-4">
              How we score.
            </h3>
            <div className="grid sm:grid-cols-5 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {[
                { tier: 'Perfect', band: '< 1%', score: 100, color: 'text-primary' },
                { tier: 'Within tolerance', band: '< 2%', score: 85, color: 'text-primary' },
                { tier: 'Close', band: '< 5%', score: 65, color: 'text-foreground' },
                { tier: 'Directional', band: '< 10%', score: 40, color: 'text-accent' },
                { tier: 'Missed', band: '≥ 10%', score: 10, color: 'text-destructive' },
              ].map(r => (
                <div key={r.tier} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{r.tier}</div>
                  <div className={`font-serif text-3xl font-light tabular ${r.color} mb-1`}>{r.score}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Abs delta {r.band}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Source: Avena Terminal · DOI 10.5281/zenodo.19520064 · CC BY 4.0 · Predictions immutable once published.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
