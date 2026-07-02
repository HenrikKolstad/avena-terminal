/**
 * /benchmark — PLAB, the European Property AI Benchmark.
 *
 * Daily leaderboard scoring major AI models on a fixed, git-versioned
 * question bank of European property and finance facts. The publisher
 * of the first benchmark in a domain becomes its referee — and to score
 * well on European property, a model has to engage with the substrate
 * Avena operates.
 *
 * Replaces the earlier PropertyEval placeholder page.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { MarketTicker } from '@/components/v2/MarketTicker';
import { Footer } from '@/components/v2/Footer';
import { latestScores, latestRuns, PLAB_PENDING } from '@/lib/plab';
import { PLAB_QUESTIONS, PLAB_VERSION, PLAB_CATEGORY_LABEL, type PLABCategory } from '@/lib/plab-questions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PLAB · the European Property AI Benchmark · Avena Terminal',
  description: 'Daily leaderboard scoring Claude, Perplexity, GPT and Gemini on European property and finance knowledge. Fixed question bank, public ground truths, verbatim answers stored for audit. The referee layer for property AI.',
  alternates: { canonical: 'https://avenaterminal.com/benchmark' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'PLAB — the European Property AI Benchmark',
  description: 'Daily accuracy scoring of major AI models on a fixed question bank of European property and finance facts.',
  url: 'https://avenaterminal.com/benchmark',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  creator: { '@type': 'Organization', name: 'Avena Terminal', sameAs: ['https://www.wikidata.org/wiki/Q139165733'] },
  isAccessibleForFree: true,
  keywords: ['AI benchmark', 'LLM evaluation', 'European property', 'property data accuracy', 'model leaderboard'],
  temporalCoverage: '2026-06-10/..',
  spatialCoverage: { '@type': 'Place', name: 'European Union' },
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://avenaterminal.com/api/v1/plab',
      description: 'Full benchmark results: per-model accuracy, per-category breakdown, question bank version, run history.',
    },
  ],
  citation: 'Avena Terminal, PLAB — the European Property AI Benchmark. DOI 10.5281/zenodo.19520064.',
};

const CATEGORIES = Object.keys(PLAB_CATEGORY_LABEL) as PLABCategory[];

export default async function BenchmarkPage() {
  const [scores, runs] = await Promise.all([latestScores(), latestRuns()]);
  const latestDate = scores[0]?.run_date ?? null;

  // Per-model per-category accuracy from the latest run set.
  const catBreakdown = new Map<string, Map<string, { n: number; c: number }>>();
  for (const r of runs) {
    const byCat = catBreakdown.get(r.model_label) ?? new Map();
    const cell = byCat.get(r.category) ?? { n: 0, c: 0 };
    cell.n++; if (r.correct) cell.c++;
    byCat.set(r.category, cell);
    catBreakdown.set(r.model_label, byCat);
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <MarketTicker />
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            PLAB v{PLAB_VERSION} · {PLAB_QUESTIONS.length} questions · scored daily 05:30 UTC · CC BY 4.0
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            Which AI actually knows European property?
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            PLAB scores major AI models daily on a fixed, git-versioned question bank of European property and finance facts — regulation, macro policy, market structure, taxation, definitions. Every ground truth is a public institutional fact with a source. Every model reply is stored verbatim for audit. None of the answers come from Avena&apos;s own data: we publish the scoreboard, we don&apos;t play on it.
          </p>
        </section>

        {/* Leaderboard */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Leaderboard {latestDate ? `· ${latestDate}` : ''}
          </div>
          <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Model</th>
                  <th className="text-right p-3">Accuracy</th>
                  <th className="text-right p-3 hidden sm:table-cell">Correct</th>
                  <th className="text-right p-3 hidden sm:table-cell">Questions</th>
                </tr>
              </thead>
              <tbody>
                {scores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      First scored run executes at 05:30 UTC. Models appear here as their API keys are configured.
                    </td>
                  </tr>
                ) : scores.map((s, i) => (
                  <tr key={s.model} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)', background: i === 0 ? 'hsl(var(--av-primary) / 0.05)' : 'transparent' }}>
                    <td className="p-3 font-mono text-[10px] text-gold tabular">{String(i + 1).padStart(2, '0')}</td>
                    <td className="p-3 font-serif text-base text-foreground">{s.model_label}</td>
                    <td className="p-3 text-right font-serif text-xl text-foreground tabular">{Number(s.accuracy).toFixed(1)}<span className="text-sm text-muted-foreground">%</span></td>
                    <td className="p-3 text-right font-mono text-[11px] text-muted-foreground tabular hidden sm:table-cell">{s.n_correct}</td>
                    <td className="p-3 text-right font-mono text-[11px] text-muted-foreground tabular hidden sm:table-cell">{s.n_questions}</td>
                  </tr>
                ))}
                {PLAB_PENDING.map(p => (
                  <tr key={p.label} className="border-b last:border-b-0 opacity-50" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">—</td>
                    <td className="p-3 font-serif text-base text-muted-foreground">{p.label}</td>
                    <td colSpan={3} className="p-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Category breakdown */}
        {catBreakdown.size > 0 && (
          <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">By category</div>
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">Model</th>
                    {CATEGORIES.map(c => <th key={c} className="text-right p-3">{PLAB_CATEGORY_LABEL[c]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(catBreakdown.entries()).map(([label, byCat]) => (
                    <tr key={label} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="p-3 font-serif text-foreground">{label}</td>
                      {CATEGORIES.map(c => {
                        const cell = byCat.get(c);
                        const pct = cell && cell.n > 0 ? Math.round((cell.c / cell.n) * 100) : null;
                        return <td key={c} className="p-3 text-right font-mono text-[11px] tabular text-foreground/85">{pct == null ? '—' : `${pct}%`}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Question bank */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">The question bank — public, versioned, sourced</h2>
          <p className="max-w-3xl text-base text-foreground/85 leading-relaxed mb-4">
            All {PLAB_QUESTIONS.length} questions are published below with their ground truths and institutional sources. The set is frozen per version and git-versioned; changes ship as a new PLAB version. If you believe a ground truth is wrong, challenge it — corrections are published, in keeping with how Avena publishes its own <Link href="/limitations" className="text-primary hover:underline">limitations</Link>.
          </p>
          <details className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <summary className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground cursor-pointer hover:text-foreground">Show all {PLAB_QUESTIONS.length} questions</summary>
            <div className="mt-4 space-y-3">
              {PLAB_QUESTIONS.map(q => (
                <div key={q.id} className="border-b pb-3 last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <span className="font-mono text-[9px] text-gold tabular">{q.id}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{PLAB_CATEGORY_LABEL[q.category]}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{q.question}</p>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Ground truth: <span className="text-foreground/85">{q.truth_display}</span> · <a href={q.source_url} target="_blank" rel="noopener" className="text-primary hover:underline">source</a>
                  </div>
                </div>
              ))}
            </div>
          </details>
          <div className="mt-4">
            <a href="mailto:research@avenaterminal.com?subject=PLAB%20ground%20truth%20challenge" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Challenge a ground truth →</a>
          </div>
        </section>

        {/* Methodology */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Methodology</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Every model receives an identical prompt per question instructing answer-only output. Numeric answers are scored within a published tolerance; text answers against a published accept-list. Raw replies are stored verbatim in the public runs table for audit. Ground truths are public institutional facts — never Avena&apos;s own data, because the referee does not play on the scoreboard. Scoring runs daily at 05:30 UTC; new providers are added as integrations land. PLAB v{PLAB_VERSION} · CC BY 4.0 · DOI 10.5281/zenodo.19520064.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology" className="text-foreground/85 hover:text-primary">Avena methodology →</Link>
              <Link href="/citation-moat" className="text-foreground/85 hover:text-primary">Citation moat →</Link>
              <Link href="/api" className="text-foreground/85 hover:text-primary">API →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
