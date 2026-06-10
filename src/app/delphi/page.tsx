/**
 * /delphi — Avena DELPHI, the daily AI panel on European property.
 *
 * The world's first daily, longitudinal, resolvable survey where the
 * panelists are frontier AI models. The Delphi method, with machines.
 *
 * Flagship design treatment: sentiment meter, per-question belief
 * spectra, auto-generated split-of-the-day callout, gradient drift
 * chart. Server-rendered, zero client JS.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { indexHistory, latestPanel, type DelphiDailyRow } from '@/lib/delphi';
import { DELPHI_QUESTIONS, DELPHI_VERSION, type DelphiQuestion } from '@/lib/delphi-questions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DELPHI · the daily AI panel on European property · Avena Terminal',
  description: 'The world\'s first daily AI-panel survey of a real asset class. Frontier models answer the same forward questions on European property every day — consensus, disagreement, drift, and future resolution scoring. The ZEW survey, with machine panelists.',
  alternates: { canonical: 'https://avenaterminal.com/delphi' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena DELPHI — the daily AI panel on European property',
  description: 'Daily longitudinal survey of frontier AI models\' quantitative beliefs about European residential property: consensus index, disagreement index, per-question per-model panel, future resolution scoring.',
  url: 'https://avenaterminal.com/delphi',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: { '@type': 'Organization', name: 'Avena Terminal' },
};

/* Marker styles per panelist — shape-differentiated, not colour-chaos. */
const MARKERS: Array<{ match: string; label: string; style: React.CSSProperties; cls: string }> = [
  { match: 'Sonnet',     label: 'Claude Sonnet 4.5', cls: 'rounded-full',     style: { background: 'hsl(40 35% 95% / 0.85)' } },
  { match: 'Haiku',      label: 'Claude Haiku 4.5',  cls: 'rounded-full',     style: { background: 'transparent', border: '1.5px solid hsl(40 35% 95% / 0.8)' } },
  { match: 'Perplexity', label: 'Perplexity Sonar',  cls: 'rounded-[1px]',    style: { background: 'hsl(190 60% 60% / 0.85)' } },
];

function markerFor(label: string) {
  return MARKERS.find(m => label.includes(m.match)) ?? MARKERS[0];
}

function scaleFor(q: DelphiQuestion): { min: number; max: number; left: string; right: string } {
  if (q.kind === 'pct') return { min: -10, max: 10, left: '−10%', right: '+10%' };
  return { min: 0, max: 100, left: '0', right: '100' };
}

function pos(v: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  return ((clamped - min) / (max - min)) * 100;
}

/** Deepest split of the day — auto-generated, quote-ready. */
function deepestSplit(panel: DelphiDailyRow[], qMap: Map<string, DelphiQuestion>) {
  let best: { q: DelphiQuestion; row: DelphiDailyRow; lo: [string, number]; hi: [string, number] } | null = null;
  for (const row of panel) {
    const q = qMap.get(row.question_id);
    if (!q) continue;
    const entries = Object.entries(row.per_model ?? {});
    if (entries.length < 2) continue;
    const sorted = entries.slice().sort((a, b) => a[1] - b[1]);
    if (!best || Number(row.dispersion) > Number(best.row.dispersion)) {
      best = { q, row, lo: sorted[0] as [string, number], hi: sorted[sorted.length - 1] as [string, number] };
    }
  }
  return best;
}

export default async function DelphiPage() {
  const [history, panel] = await Promise.all([indexHistory(60), latestPanel()]);
  const latest = history[0] ?? null;
  const qMap = new Map(DELPHI_QUESTIONS.map(q => [q.id, q]));
  const split = deepestSplit(panel, qMap);

  // Drift chart geometry
  const points = history.slice().reverse();
  const W = 1000, H = 130, PAD = 6;
  const xy = (i: number, v: number) => ({
    x: PAD + (i * (W - 2 * PAD)) / Math.max(1, points.length - 1),
    y: H - PAD - ((v / 100) * (H - 2 * PAD)),
  });
  const linePath = points.map((p, i) => {
    const { x, y } = xy(i, Number(p.consensus_index));
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const areaPath = points.length > 1
    ? `${linePath} L ${xy(points.length - 1, 0).x.toFixed(1)} ${H - PAD} L ${PAD} ${H - PAD} Z`
    : '';

  const ci = latest ? Number(latest.consensus_index) : null;
  const di = latest ? Number(latest.disagreement_index) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        {/* Hero */}
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.32em]"
              style={{ borderColor: 'hsl(var(--av-primary) / 0.5)', background: 'hsl(var(--av-primary) / 0.08)', color: 'hsl(var(--av-primary))' }}
            >
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              World first · record began 2026-06-10
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              DELPHI v{DELPHI_VERSION} · {DELPHI_QUESTIONS.length} questions · daily 06:00 UTC
            </span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-foreground mb-5 leading-[1.04] tracking-tight max-w-[1000px]">
            What the machines believe about European property.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every day, the same fixed panel of forward questions is put to every major AI model. Panelists never see each other&apos;s answers. We publish the consensus, the disagreement, the drift — and when each horizon arrives, the machines are scored against reality. The ZEW survey, with machine panelists.
          </p>
        </section>

        {/* Sentiment meter — the number of the day */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10">
          <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>
            <div className="p-6 sm:p-10" style={{ background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.07) 0%, transparent 60%)' }}>
              <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-center">
                {/* Consensus */}
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
                    DELPHI Consensus Index {latest ? `· ${latest.run_date}` : ''}
                  </div>
                  <div className="flex items-baseline gap-4 mb-6">
                    <span className="font-serif text-7xl sm:text-8xl font-light text-foreground tabular leading-none tracking-tight">
                      {ci != null ? ci.toFixed(1) : '—'}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">/ 100</span>
                  </div>
                  {/* Meter */}
                  <div className="relative">
                    <div
                      className="h-2 rounded-full"
                      style={{ background: 'linear-gradient(90deg, hsl(0 60% 45% / 0.55) 0%, hsl(38 60% 50% / 0.5) 50%, hsl(150 50% 42% / 0.55) 100%)' }}
                    />
                    {ci != null && (
                      <div
                        className="absolute -top-[7px] h-[22px] w-[3px] rounded-full"
                        style={{ left: `calc(${ci}% - 1.5px)`, background: 'hsl(var(--av-primary))', boxShadow: '0 0 12px hsl(var(--av-primary) / 0.8)' }}
                      />
                    )}
                    <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/80">
                      <span>Bearish</span><span>Neutral</span><span>Bullish</span>
                    </div>
                  </div>
                </div>
                {/* Secondary stats */}
                <div className="grid grid-cols-2 gap-6 lg:gap-8">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Disagreement</div>
                    <div className="font-serif text-4xl sm:text-5xl font-light text-foreground tabular leading-none">
                      {di != null ? di.toFixed(1) : '—'}
                    </div>
                    <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80 leading-relaxed">
                      mean panelist spread
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Panel</div>
                    <div className="font-serif text-4xl sm:text-5xl font-light text-foreground tabular leading-none">
                      {latest ? latest.n_panelists : '—'}
                    </div>
                    <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80 leading-relaxed">
                      {latest ? `models · ${latest.n_questions} questions` : 'convenes 06:00 UTC'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Split of the day — quote-ready, auto-generated */}
            {split && (
              <div className="border-t px-6 sm:px-10 py-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.35)' }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold">Today&apos;s deepest split</span>
                <span className="font-serif text-base sm:text-lg text-foreground">
                  {split.q.short_label}: <span className="text-muted-foreground">{split.lo[0]}</span> says <span className="tabular">{Number(split.lo[1]).toFixed(0)}</span> · <span className="text-muted-foreground">{split.hi[0]}</span> says <span className="tabular">{Number(split.hi[1]).toFixed(0)}</span>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Drift chart */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10">
          <div className="rounded-sm border p-5 sm:p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="flex items-baseline justify-between mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Consensus drift · 60 days</div>
              {latest && <div className="font-mono text-[10px] text-gold tabular">{Number(latest.consensus_index).toFixed(1)} today</div>}
            </div>
            {points.length <= 1 ? (
              <div className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                Day one of the record. Drift appears from day two — the longitudinal series is the asset no one can rebuild retroactively.
              </div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="delphiArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(42 85% 64%)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(42 85% 64%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1={PAD} y1={H - PAD - (H - 2 * PAD) / 2} x2={W - PAD} y2={H - PAD - (H - 2 * PAD) / 2} stroke="hsl(var(--av-border) / 0.5)" strokeDasharray="4 4" />
                <path d={areaPath} fill="url(#delphiArea)" />
                <path d={linePath} stroke="hsl(var(--av-primary))" strokeWidth="2" fill="none" />
                {points.map((p, i) => {
                  const { x, y } = xy(i, Number(p.consensus_index));
                  return <circle key={p.run_date} cx={x} cy={y} r={3} fill="hsl(var(--av-primary))"><title>{`${p.run_date}: ${Number(p.consensus_index).toFixed(1)}`}</title></circle>;
                })}
              </svg>
            )}
          </div>
        </section>

        {/* The panel — belief spectra */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground tracking-tight">Today&apos;s panel</h2>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4">
              {MARKERS.map(m => (
                <span key={m.label} className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className={`inline-block h-2 w-2 ${m.cls}`} style={m.style} />
                  {m.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                <span className="inline-block h-2 w-2 rotate-45" style={{ background: 'hsl(var(--av-primary))' }} />
                Consensus
              </span>
            </div>
          </div>

          {panel.length === 0 ? (
            <div className="rounded-sm border p-10 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
              The first panel convenes at 06:00 UTC. Beliefs appear here the same morning.
            </div>
          ) : (
            <div className="rounded-sm border divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              {DELPHI_QUESTIONS.map(q => {
                const row = panel.find(r => r.question_id === q.id);
                if (!row) return null;
                const s = scaleFor(q);
                const spreadHot = Number(row.dispersion) >= 30;
                return (
                  <div key={q.id} className="px-4 sm:px-6 py-4 grid sm:grid-cols-[230px_1fr_120px] gap-x-6 gap-y-2 items-center" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    {/* Label */}
                    <div title={q.question}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[9px] text-gold tabular">{q.id}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">{q.horizon_months}m</span>
                      </div>
                      <div className="text-sm text-foreground/90 leading-snug mt-0.5">{q.short_label}</div>
                    </div>
                    {/* Belief spectrum */}
                    <div>
                      <div className="relative h-6">
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px" style={{ background: 'hsl(var(--av-border) / 0.7)' }} />
                        {/* range band */}
                        {(() => {
                          const vals = Object.values(row.per_model ?? {});
                          if (vals.length < 2) return null;
                          const lo = pos(Math.min(...vals), s.min, s.max);
                          const hi = pos(Math.max(...vals), s.min, s.max);
                          return (
                            <div className="absolute top-1/2 -translate-y-1/2 h-[5px] rounded-full" style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%`, background: 'hsl(var(--av-primary) / 0.15)' }} />
                          );
                        })()}
                        {/* model dots */}
                        {Object.entries(row.per_model ?? {}).map(([label, v]) => {
                          const m = markerFor(label);
                          return (
                            <span
                              key={label}
                              title={`${label}: ${Number(v).toFixed(0)}`}
                              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 ${m.cls}`}
                              style={{ left: `${pos(Number(v), s.min, s.max)}%`, ...m.style }}
                            />
                          );
                        })}
                        {/* consensus diamond */}
                        <span
                          title={`Consensus: ${Number(row.consensus).toFixed(0)}`}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rotate-45"
                          style={{ left: `${pos(Number(row.consensus), s.min, s.max)}%`, background: 'hsl(var(--av-primary))', boxShadow: '0 0 8px hsl(var(--av-primary) / 0.6)' }}
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground/60 mt-0.5">
                        <span>{s.left}</span><span>{s.right}</span>
                      </div>
                    </div>
                    {/* Numbers */}
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-3 sm:gap-0.5">
                      <span className="font-serif text-2xl font-light tabular text-foreground leading-none">{Number(row.consensus).toFixed(0)}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] tabular" style={{ color: spreadHot ? 'hsl(var(--av-warning))' : 'hsl(var(--av-muted-foreground) / 0.7)' }}>
                        spread {Number(row.dispersion).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Question set */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10">
          <details className="rounded-sm border p-4 sm:p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <summary className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Show the full question set — wording, horizons, resolution sources
            </summary>
            <div className="mt-5 space-y-4">
              {DELPHI_QUESTIONS.map(q => (
                <div key={q.id} className="border-b pb-4 last:border-b-0 last:pb-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <span className="font-mono text-[9px] text-gold tabular">{q.id}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{q.kind} · {q.horizon_months}m horizon</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{q.question}</p>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">Resolves against: {q.resolution_source}</div>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* Methodology */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-16 sm:pb-20">
          <div className="rounded-sm border p-6 sm:p-8" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Why this has never existed</div>
            <p className="text-sm sm:text-base text-foreground/85 leading-relaxed max-w-3xl">
              Surveys of human experts are a century old — ZEW polls economists, the SPF polls forecasters, prediction markets aggregate bettors. DELPHI is the first daily, longitudinal, resolvable panel survey where the respondents are frontier AI models. PLAB (<Link href="/benchmark" className="text-primary hover:underline">/benchmark</Link>) measures what the machines <em>know</em>; DELPHI records what they <em>believe</em> — and because every question carries a horizon and a public resolution source, the machines will eventually be scored on judgment, not just recall. Every response is stored verbatim, every run is event-sourced and replayable, and the accumulating record is published under CC BY 4.0 (DOI 10.5281/zenodo.19520064) for any researcher to study.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/api/v1/delphi" className="text-foreground/85 hover:text-primary transition-colors">JSON API →</Link>
              <Link href="/benchmark" className="text-foreground/85 hover:text-primary transition-colors">PLAB leaderboard →</Link>
              <Link href="/predictions" className="text-foreground/85 hover:text-primary transition-colors">Avena&apos;s own predictions →</Link>
              <Link href="/methodology" className="text-foreground/85 hover:text-primary transition-colors">Methodology →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
