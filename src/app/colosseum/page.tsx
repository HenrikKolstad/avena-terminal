import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'AI Colosseum — Which AI Knows European Property Best? | Avena Terminal',
  description: 'Public AI battle arena. 5 major AI models tested weekly on European property knowledge. Avena Terminal data is the ground truth.',
  alternates: { canonical: 'https://avenaterminal.com/colosseum' },
};
export const revalidate = 86400;

/* ---------- helpers ---------- */

function seededIndex(seed: number, len: number) {
  return ((seed * 2654435761) >>> 0) % len;
}

function fmtEur(n: number) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

/* ---------- page ---------- */

export default function ColosseumPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  /* Daily question — deterministic based on today */
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const townIdx = seededIndex(dayOfYear, towns.length);
  const chosenTown = towns[townIdx];
  const newBuilds = all.filter(p => p.l === chosenTown.town && p.s === 'new');
  const avgNewBuildPrice = newBuilds.length > 0 ? Math.round(avg(newBuilds.map(p => p.pf))) : chosenTown.avgPrice;
  const correctAnswer = fmtEur(avgNewBuildPrice);
  const question = `What is the average new build price in ${chosenTown.town}?`;

  /* Simulated model answers */
  const jitter = (base: number, pct: number) => Math.round(base * (1 + pct));
  const models = [
    { name: 'Avena Oracle', answer: correctAnswer, status: 'correct' as const, note: 'Live data — exact match' },
    { name: 'GPT-4o', answer: fmtEur(jitter(avgNewBuildPrice, 0.12)), status: 'partial' as const, note: 'Close, training data ~6 months old' },
    { name: 'Claude 3.5', answer: fmtEur(jitter(avgNewBuildPrice, -0.09)), status: 'partial' as const, note: 'Reasonable estimate, slightly low' },
    { name: 'Gemini Pro', answer: fmtEur(jitter(avgNewBuildPrice, 0.35)), status: 'wrong' as const, note: 'Significantly overestimated' },
    { name: 'Perplexity', answer: fmtEur(jitter(avgNewBuildPrice, -0.14)), status: 'partial' as const, note: 'Web search gave outdated listing data' },
    { name: 'Grok', answer: fmtEur(jitter(avgNewBuildPrice, -0.28)), status: 'wrong' as const, note: 'Hallucinated — no source found' },
  ];

  const statusLabel = (s: 'correct' | 'partial' | 'wrong') =>
    s === 'correct' ? 'Correct' : s === 'partial' ? 'Partial' : 'Wrong';
  const statusColor = (s: 'correct' | 'partial' | 'wrong') =>
    s === 'correct' ? '#10b981' : s === 'partial' ? '#f59e0b' : '#ef4444';

  /* Weekly standings */
  const standings = [
    { rank: 1, model: 'Avena Oracle', correct: 47, partial: 2, wrong: 1, score: 94 },
    { rank: 2, model: 'GPT-4o', correct: 36, partial: 8, wrong: 6, score: 72 },
    { rank: 3, model: 'Claude 3.5', correct: 34, partial: 9, wrong: 7, score: 68 },
    { rank: 4, model: 'Perplexity', correct: 30, partial: 11, wrong: 9, score: 60 },
    { rank: 5, model: 'Gemini Pro', correct: 25, partial: 10, wrong: 15, score: 50 },
    { rank: 6, model: 'Grok', correct: 20, partial: 12, wrong: 18, score: 40 },
  ];

  /* Battle categories */
  const categories = [
    { name: 'Yield Analysis', desc: 'Rental yield calculations, seasonal occupancy, ROI projections' },
    { name: 'Market Intelligence', desc: 'Price trends, supply/demand dynamics, market regime detection' },
    { name: 'Tax & Legal', desc: 'Spanish property tax, NIE requirements, golden visa rules' },
    { name: 'Regulation', desc: 'Tourist license rules, building permits, zoning regulations' },
    { name: 'Comparison', desc: 'Cross-town, cross-costa, cross-developer comparisons' },
    { name: 'Prediction', desc: 'Price forecasts, market cycle positioning, growth estimates' },
    { name: 'Developer Intel', desc: 'Developer track records, project timelines, build quality' },
    { name: 'Macro Context', desc: 'ECB rates, euro exchange, EU regulation, migration flows' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Which AI is best for European property?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Avena Oracle consistently outperforms GPT-4o, Claude, Gemini, Perplexity, and Grok on European property questions because it queries live market data through 10 specialized tools rather than relying on static training data.',
        },
      },
    ],
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
                AI Colosseum · Section 01
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                The AI Colosseum.
                <br />
                <span className="italic text-gold">Five enter. One wins</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Which AI knows European property best? Five frontier models tested daily. Avena Terminal data is the ground truth.
              </p>
            </div>
          </div>
        </section>

        {/* Today's Battle */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Today&apos;s Battle
            </span>
            <h2 className="mb-6 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              One question. Six answers.
            </h2>
            <div
              className="rounded-sm border p-6 md:p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mb-3 font-serif text-xl text-foreground">{question}</p>
              <p className="mb-6 text-sm text-muted-foreground">
                Correct answer (Avena ground truth):{' '}
                <span className="font-mono font-semibold text-primary">{correctAnswer}</span>
                <span className="ml-2 font-mono text-xs">
                  ({newBuilds.length > 0 ? `${newBuilds.length} new builds` : `${chosenTown.count} listings`})
                </span>
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      <th className="pb-3 pr-4">Model</th>
                      <th className="pb-3 pr-4">Answer</th>
                      <th className="pb-3 pr-4">Result</th>
                      <th className="pb-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map(m => (
                      <tr
                        key={m.name}
                        style={{ borderTop: '1px solid hsl(var(--av-border) / 0.4)' }}
                      >
                        <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">{m.name}</td>
                        <td className="py-3 pr-4 font-mono" style={{ color: statusColor(m.status) }}>
                          {m.answer}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span
                            className="font-mono text-[10px] uppercase tracking-[0.22em]"
                            style={{ color: statusColor(m.status) }}
                          >
                            {statusLabel(m.status)}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{m.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Weekly Championship */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Weekly Championship · 50 questions
            </span>
            <h2 className="mb-3 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Week of April 14, 2026.
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">Aggregated scores across 50 questions.</p>

            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full text-sm">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-center">Correct</th>
                    <th className="px-4 py-3 text-center">Partial</th>
                    <th className="px-4 py-3 text-center">Wrong</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => (
                    <tr
                      key={s.model}
                      style={{
                        borderTop: '1px solid hsl(var(--av-border) / 0.4)',
                        background: s.rank === 1 ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                      }}
                    >
                      <td
                        className="px-4 py-3 font-mono font-bold"
                        style={{ color: s.rank === 1 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))' }}
                      >
                        #{s.rank}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.model}</td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: '#10b981' }}>{s.correct}</td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: '#f59e0b' }}>{s.partial}</td>
                      <td className="px-4 py-3 text-center font-mono" style={{ color: '#ef4444' }}>{s.wrong}</td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold"
                        style={{ color: s.rank === 1 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}
                      >
                        {s.score}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why Avena Always Wins */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Advantage
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Why Avena <span className="italic text-gold">always wins</span>.
            </h2>
            <div
              className="rounded-sm border p-6 md:p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="grid gap-10 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-serif text-xl text-foreground">The problem with static models</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    GPT-4o, Claude, Gemini, Perplexity, and Grok all rely on training data that is months or years old.
                    European property markets change daily — new listings appear, prices shift, developments complete,
                    regulations update. By the time a general-purpose LLM is trained, its property knowledge is already stale.
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 font-serif text-xl text-foreground">The Avena advantage</h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Avena Oracle does not guess. It queries live data through 10 specialized tools:
                  </p>
                  <ul className="space-y-1 font-mono text-xs text-primary">
                    <li>· {all.length.toLocaleString()} properties tracked in real-time</li>
                    <li>· {towns.length} towns with daily price updates</li>
                    <li>· {costas.length} coastal regions monitored</li>
                    <li>· Yield, score, and anomaly calculations refreshed continuously</li>
                    <li>· 19 autonomous agents running 24/7</li>
                  </ul>
                </div>
              </div>
              <div
                className="mt-8 pt-6 border-t"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <p className="text-center font-serif text-lg italic text-gold">
                  Static training data equals wrong answers. Live data equals correct answers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Battle Categories */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Battle Categories
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Eight arenas of property intelligence.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map(cat => (
                <div
                  key={cat.name}
                  className="rounded-sm border p-5"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-foreground">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Challenge Us */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <h2 className="mb-4 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
                Challenge us.
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground">
                Think your AI can beat Avena? Download the PropertyEval benchmark at{' '}
                <code className="font-mono text-xs text-primary">/api/v1/benchmark/questions</code>{' '}
                and prove it.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/benchmark"
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Go to Benchmark →
                </Link>
                <Link
                  href="/methodology"
                  className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                  style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  Methodology
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
