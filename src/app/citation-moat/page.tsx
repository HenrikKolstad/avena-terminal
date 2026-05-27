/**
 * /citation-moat — live AI assistant citation rate.
 *
 * Reads from `citation_measurements` (populated daily by Agent Atlas).
 * Shows the rolling avena_rate, competitor share, 30-day history, and
 * the top current gap. Public, citable, time-stamped.
 *
 * The metric that actually matters for AI-distribution dominance.
 *
 * (Distinct from /citations which lists Avena's own data sources.)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { loadMeasurements, currentHitRate } from '@/lib/citation-measure';
import { TRACKED_QUESTIONS } from '@/lib/citation-agent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Citation Moat · live AI assistant citation rate',
  description: 'Daily Perplexity citation tracking across the European property question set. Live rolling 7-day Avena citation rate, competitor share, top gap questions. Public metric, not a marketing number.',
  alternates: { canonical: 'https://avenaterminal.com/citation-moat' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena Citation Moat Measurement',
  description: 'Daily measurement of how often AI answer engines cite avenaterminal.com when asked European property questions.',
  url: 'https://avenaterminal.com/citation-moat',
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

const COMPETITOR_LABEL: Record<string, string> = {
  idealista:        'Idealista',
  kyero:            'Kyero',
  rightmove:        'Rightmove',
  zoopla:           'Zoopla',
  fotocasa:         'Fotocasa',
  thinkspain:       'thinkSPAIN',
  aplaceinthesun:   'A Place in the Sun',
  numbeo:           'Numbeo',
  statista:         'Statista',
  eurostat:         'Eurostat',
};

export default async function CitationMoatPage() {
  const [history, hitRate] = await Promise.all([
    loadMeasurements(30),
    currentHitRate(),
  ]);

  const latest = history[0] ?? null;
  const prior = history[1] ?? null;

  const last7 = history.slice(0, 7);
  const competitorAgg: Record<string, number> = {};
  for (const m of last7) {
    for (const [k, v] of Object.entries(m.competitor_share ?? {})) {
      competitorAgg[k] = (competitorAgg[k] ?? 0) + v;
    }
  }
  const competitorRanking = Object.entries(competitorAgg).sort((a, b) => b[1] - a[1]);
  const totalCompetitorCitations7d = competitorRanking.reduce((s, [, v]) => s + v, 0);

  const sparkPoints = history.slice().reverse();
  const trendDoD = latest && prior
    ? Number((latest.avena_rate - prior.avena_rate).toFixed(2))
    : 0;

  const W = 1000;
  const H = 120;
  const PAD = 4;
  const maxRate = Math.max(20, ...sparkPoints.map(p => p.avena_rate));
  const sparkPath = sparkPoints.length > 1
    ? sparkPoints.map((p, i) => {
        const x = PAD + (i * (W - 2 * PAD)) / (sparkPoints.length - 1);
        const y = H - PAD - ((p.avena_rate / maxRate) * (H - 2 * PAD));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Citation moat · live · updated daily 03:30 UTC
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            How often AI cites Avena.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Every day at 03:00 UTC, Agent Atlas queries the Perplexity API on a curated set of European property questions and records whether avenaterminal.com appears in the cited sources. The rolling 7-day rate is the metric. This page is the public scoreboard — not a marketing number, not a constant, not a curated highlight reel. If the measurement breaks, the page shows the break.
          </p>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="rounded-sm border p-8" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'hsl(var(--av-primary) / 0.05)' }}>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Rolling 7-day citation rate</div>
                <div className="font-serif text-6xl font-light text-foreground tabular leading-none">{hitRate.rate.toFixed(1)}<span className="text-3xl text-muted-foreground">%</span></div>
                <div className="mt-2 font-mono text-[11px] tabular" style={{ color: hitRate.trend7d >= 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                  {hitRate.trend7d > 0 ? '+' : ''}{hitRate.trend7d.toFixed(1)}pp vs prior 7d
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Latest measurement</div>
                <div className="font-serif text-2xl font-light text-foreground tabular">
                  {latest ? `${latest.avena_rate.toFixed(1)}%` : '—'}
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground tabular">
                  {latest ? `${latest.date} · ${latest.questions_asked} questions · ${latest.avena_hits} hits` : 'no measurement yet'}
                </div>
                {trendDoD !== 0 && (
                  <div className="mt-1 font-mono text-[10px] tabular" style={{ color: trendDoD >= 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                    {trendDoD > 0 ? '+' : ''}{trendDoD.toFixed(2)}pp DoD
                  </div>
                )}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Questions tracked</div>
                <div className="font-serif text-2xl font-light text-foreground tabular">{TRACKED_QUESTIONS.length}</div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground tabular">
                  {hitRate.total_questions_tracked} Perplexity queries in last 7d
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">30-day citation rate</div>
              <div className="font-mono text-[10px] text-muted-foreground tabular">peak {maxRate.toFixed(1)}%</div>
            </div>
            {sparkPoints.length === 0 ? (
              <div className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                No measurements yet — Agent Atlas seeds at 03:00 UTC. The first data point appears tomorrow.
              </div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
                <path d={sparkPath} stroke="hsl(var(--av-primary))" strokeWidth="2" fill="none" />
                {sparkPoints.map((p, i) => {
                  const x = PAD + (i * (W - 2 * PAD)) / (Math.max(1, sparkPoints.length - 1));
                  const y = H - PAD - ((p.avena_rate / maxRate) * (H - 2 * PAD));
                  return <circle key={p.date} cx={x} cy={y} r={3} fill="hsl(var(--av-primary))"><title>{`${p.date}: ${p.avena_rate.toFixed(1)}%`}</title></circle>;
                })}
              </svg>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Who is cited instead · 7d</div>
              {competitorRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No competitor citations recorded in window.</p>
              ) : (
                <div className="space-y-2">
                  {competitorRanking.slice(0, 10).map(([name, count]) => {
                    const pct = totalCompetitorCitations7d > 0 ? (count / totalCompetitorCitations7d) * 100 : 0;
                    return (
                      <div key={name}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-mono text-[11px] text-foreground">{COMPETITOR_LABEL[name] ?? name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular">{count} citations · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 rounded-sm overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.3)' }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: 'hsl(var(--av-destructive) / 0.6)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Top gap question · latest day</div>
              {latest?.top_gap_question ? (
                <>
                  <p className="font-serif text-xl font-light text-foreground leading-snug mb-3">&ldquo;{latest.top_gap_question}&rdquo;</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Agent Atlas asked this question yesterday; Avena was not cited but competitors were. This is the single highest-leverage piece of content to ship next.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No gap recorded — either every tracked question cited Avena or the daily run has not yet completed.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">How this is measured</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Agent Atlas runs daily at 03:00 UTC. For each of the {TRACKED_QUESTIONS.length} tracked questions (market-level, brand-and-tool, city-specific, regulatory, EU-level institutional), Atlas queries the Perplexity API with the question verbatim, parses the cited sources, and records (a) whether avenaterminal.com is among them, (b) which named competitors appear. Raw results land in <span className="font-mono text-foreground">citation_monitoring</span>. At 03:30 UTC, Agent Demeter rolls the day&apos;s rows into <span className="font-mono text-foreground">citation_measurements</span> — the table this page reads. The full source lives at <span className="font-mono text-foreground">src/lib/citation-agent.ts</span> and <span className="font-mono text-foreground">src/lib/citation-measure.ts</span>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/api/v1/citation-score" className="text-foreground/85 hover:text-primary">JSON endpoint →</Link>
              <Link href="/api/v1/crawler-report" className="text-foreground/85 hover:text-primary">Crawler report →</Link>
              <Link href="/install" className="text-foreground/85 hover:text-primary">Install via MCP →</Link>
              <Link href="/citations" className="text-foreground/85 hover:text-primary">Our data sources →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
