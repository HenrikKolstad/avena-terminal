import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Counterpart Health Index · Avena Terminal',
  description: 'The public European Developer Health Index. Monthly NAV-weighted stress measure across every tracked residential developer. Open access; CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/counterpart/health-index' },
  openGraph: {
    title: 'European Developer Health Index — Avena Counterpart',
    description: 'Public stress index across tracked European residential developers. Live, monthly, citable.',
    url: 'https://avenaterminal.com/counterpart/health-index',
  },
};

interface HealthRow {
  snapshot_date: string;
  index_level: number;
  developers_tracked: number;
  developers_distressed: number;
  developers_aav: number;
  developers_av: number;
  developers_abv: number;
  developers_bbv: number;
  developers_cv: number;
  developers_dv: number;
  alerts_active: number;
}

interface DeveloperRow {
  name: string;
  counterpart_score: number;
  score_grade: string;
  score_trend: string | null;
  total_projects: number;
  country: string;
}

async function loadHistory(): Promise<HealthRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('counterpart_health_history')
      .select('*')
      .order('snapshot_date', { ascending: true })
      .limit(365);
    return (data ?? []) as HealthRow[];
  } catch { return []; }
}

async function loadStressedDevelopers(): Promise<DeveloperRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('counterpart_developers')
      .select('name, counterpart_score, score_grade, score_trend, total_projects, country')
      .lte('counterpart_score', 60)
      .order('counterpart_score', { ascending: true })
      .limit(5);
    return (data ?? []) as DeveloperRow[];
  } catch { return []; }
}

function pctChange(now: number | undefined, then: number | undefined): number {
  if (now == null || then == null || then === 0) return 0;
  return Number((((now - then) / then) * 100).toFixed(2));
}

function Sparkline({ data, height = 80 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 1200;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="hi-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(42 85% 64% / 0.4)" />
          <stop offset="100%" stopColor="hsl(42 85% 64% / 0)" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill="url(#hi-grad)"
        stroke="none"
      />
      <polyline points={points} fill="none" stroke="hsl(42 85% 64%)" strokeWidth="1.8" />
    </svg>
  );
}

export default async function CounterpartHealthIndexPage() {
  const [history, stressed] = await Promise.all([loadHistory(), loadStressedDevelopers()]);
  const latest = history[history.length - 1];
  const prior30 = history.length >= 31 ? history[history.length - 31] : undefined;
  const prior90 = history.length >= 91 ? history[history.length - 91] : history[0];

  const grades = latest ? [
    { code: 'AAV', n: latest.developers_aav, color: 'hsl(var(--av-success))' },
    { code: 'AV',  n: latest.developers_av,  color: 'hsl(var(--av-success) / 0.7)' },
    { code: 'ABV', n: latest.developers_abv, color: 'hsl(var(--av-primary))' },
    { code: 'BBV', n: latest.developers_bbv, color: 'hsl(var(--av-primary) / 0.5)' },
    { code: 'CV',  n: latest.developers_cv,  color: 'hsl(var(--av-warning))' },
    { code: 'DV',  n: latest.developers_dv,  color: 'hsl(var(--av-destructive))' },
  ] : [];

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              European Developer Health Index · Public · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Where the <span className="italic text-gold">cracks</span> show first.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed">
              The public Counterpart Health Index measures NAV-weighted aggregate stress across every European residential developer in the Avena Counterpart Network. When the index falls, capital is becoming counterpart-constrained — defaults follow. We publish the index because the only way to demonstrate the predictive power of the Counterpart graph is to publish it before the events it foresees.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Cadence <span className="text-foreground">daily</span></span>
              <span>·</span>
              <span>Universe <span className="text-foreground">tracked developers · EU residential</span></span>
              <span>·</span>
              <span>License <span className="text-foreground">CC BY 4.0</span></span>
              <span>·</span>
              <span>Methodology <Link href="/methodology" className="text-foreground hover:text-primary">/methodology</Link></span>
            </div>
          </div>
        </section>

        {/* Headline */}
        {latest && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
              <div className="grid lg:grid-cols-[2fr_1fr] gap-8 items-end">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">As of {latest.snapshot_date}</div>
                  <div className="font-serif text-[7rem] sm:text-[9rem] font-light text-gold tabular leading-[0.85]">
                    {Number(latest.index_level).toFixed(1)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <span>30d <span className={pctChange(latest.index_level, prior30?.index_level) >= 0 ? 'text-success' : 'text-destructive'}>{pctChange(latest.index_level, prior30?.index_level) >= 0 ? '+' : ''}{pctChange(latest.index_level, prior30?.index_level)}%</span></span>
                    <span>90d <span className={pctChange(latest.index_level, prior90?.index_level) >= 0 ? 'text-success' : 'text-destructive'}>{pctChange(latest.index_level, prior90?.index_level) >= 0 ? '+' : ''}{pctChange(latest.index_level, prior90?.index_level)}%</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
                  <div className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
                    <div className="font-serif text-3xl font-light text-foreground tabular">{latest.developers_tracked}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Tracked</div>
                  </div>
                  <div className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
                    <div className={`font-serif text-3xl font-light tabular ${latest.developers_distressed > 0 ? 'text-destructive' : 'text-foreground'}`}>{latest.developers_distressed}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Distressed (&lt;50)</div>
                  </div>
                  <div className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
                    <div className="font-serif text-3xl font-light text-foreground tabular">{latest.alerts_active}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Active alerts</div>
                  </div>
                  <div className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
                    <div className="font-serif text-3xl font-light text-foreground tabular">{history.length}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Days of history</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Index chart */}
        {history.length > 1 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">90-day index history</div>
              <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <Sparkline data={history.map((h) => Number(h.index_level))} height={140} />
                <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span>{history[0]?.snapshot_date}</span>
                  <span>{history[history.length - 1]?.snapshot_date}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Grade distribution */}
        {grades.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Developer grade distribution · latest snapshot</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
                {grades.map((g) => (
                  <div key={g.code} className="p-4 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                    <div className="font-serif text-3xl font-light tabular leading-none" style={{ color: g.color }}>{g.n}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] mt-2" style={{ color: g.color }}>{g.code}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                AAV / AV / ABV = investment-grade · BBV = monitor · CV / DV = distressed
              </p>
            </div>
          </section>
        )}

        {/* Stressed developers */}
        {stressed.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Most stressed in the universe</div>
              <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full text-sm min-w-[640px]">
                  <thead style={{ background: 'hsl(var(--av-surface))' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Developer</th>
                      <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Country</th>
                      <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Score</th>
                      <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Grade</th>
                      <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Trend</th>
                      <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Projects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressed.map((d) => (
                      <tr key={d.name} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-4 py-2.5 text-foreground">{d.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.country}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular text-destructive">{d.counterpart_score}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.score_grade}</td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: d.score_trend === 'deteriorating' ? 'hsl(var(--av-destructive))' : d.score_trend === 'improving' ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>{d.score_trend ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular text-muted-foreground">{d.total_projects}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Methodology */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12 grid md:grid-cols-2 gap-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology</div>
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-3">How the index is computed.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                NAV-weighted average of <code className="font-mono text-foreground">counterpart_score</code> across every tracked developer in the Avena Counterpart Network. NAV weighting prevents small under-resourced developers from dominating the signal; large incumbents move the index more.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Each developer&apos;s underlying score is updated daily by drift from: active legal disputes, court judgements, payment-delay signals, delayed/cancelled projects, financial-stress score. Snapshots persist to <code className="font-mono text-foreground">counterpart_health_history</code> at month-end UTC.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Six grades map to the score:<br />
                <span className="font-mono text-foreground">AAV ≥85 · AV 75-84 · ABV 67-74 · BBV 55-66 · CV 42-54 · DV &lt;42</span>
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Why we publish this</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Counterpart graph&apos;s value depends entirely on whether it flags stress before it happens. Publishing the index — with a permanent URL, daily snapshots, and the underlying score-grade distribution — creates an irreversible public record. When a developer in the universe defaults, the score history is already written.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Credit insurers, mortgage lenders, REIT analysts, and sovereign desks can subscribe to monthly published cuts at <a href="mailto:research@avenaterminal.com" className="text-primary hover:underline">research@avenaterminal.com</a>. The public index is free; institutional cuts (developer-level deep dives, contagion-modelling outputs, custom universe definitions) are part of the <Link href="/institutional" className="text-primary hover:underline">institutional tier</Link>.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Counterpart Network · <Link href="/counterpart" className="text-foreground hover:text-primary">/counterpart</Link> · CC BY 4.0 · cite DOI 10.5281/zenodo.19520064
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
