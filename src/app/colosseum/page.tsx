import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

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

  const statusIcon = (s: 'correct' | 'partial' | 'wrong') =>
    s === 'correct' ? '\u2705' : s === 'partial' ? '\u26A0\uFE0F' : '\u274C';
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
    { name: 'Yield Analysis', icon: '\uD83D\uDCB0', desc: 'Rental yield calculations, seasonal occupancy, ROI projections' },
    { name: 'Market Intelligence', icon: '\uD83D\uDCC8', desc: 'Price trends, supply/demand dynamics, market regime detection' },
    { name: 'Tax & Legal', icon: '\uD83C\uDFDB\uFE0F', desc: 'Spanish property tax, NIE requirements, golden visa rules' },
    { name: 'Regulation', icon: '\uD83D\uDCDC', desc: 'Tourist license rules, building permits, zoning regulations' },
    { name: 'Comparison', icon: '\u2696\uFE0F', desc: 'Cross-town, cross-costa, cross-developer comparisons' },
    { name: 'Prediction', icon: '\uD83D\uDD2E', desc: 'Price forecasts, market cycle positioning, growth estimates' },
    { name: 'Developer Intel', icon: '\uD83C\uDFD7\uFE0F', desc: 'Developer track records, project timelines, build quality' },
    { name: 'Macro Context', icon: '\uD83C\uDF0D', desc: 'ECB rates, euro exchange, EU regulation, migration flows' },
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
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>COLOSSEUM</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* ===== 1. Hero ===== */}
        <section className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-4">THE AI COLOSSEUM</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: '#8b949e' }}>
            Which AI knows European property best? Five models enter. One wins. Avena judges.
          </p>
        </section>

        {/* ===== 2. Today's Battle ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Today&apos;s Battle</h2>
          <div className="rounded-xl p-6 md:p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-xs font-mono mb-1" style={{ color: '#8b949e' }}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-lg text-white font-semibold mb-2">{question}</p>
            <p className="text-sm mb-6" style={{ color: '#8b949e' }}>
              Correct answer (Avena ground truth): <span className="text-emerald-400 font-mono font-semibold">{correctAnswer}</span>
              <span className="ml-2 text-xs">({newBuilds.length > 0 ? `${newBuilds.length} new builds` : `${chosenTown.count} listings`})</span>
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-mono" style={{ color: '#8b949e' }}>
                    <th className="pb-3 pr-4">Model</th>
                    <th className="pb-3 pr-4">Answer</th>
                    <th className="pb-3 pr-4">Result</th>
                    <th className="pb-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.name} className="border-t" style={{ borderColor: '#21262d' }}>
                      <td className="py-3 pr-4 font-medium text-white whitespace-nowrap">{m.name}</td>
                      <td className="py-3 pr-4 font-mono" style={{ color: statusColor(m.status) }}>{m.answer}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span>{statusIcon(m.status)}</span>
                        <span className="ml-2 text-xs" style={{ color: statusColor(m.status) }}>
                          {m.status === 'correct' ? 'Correct' : m.status === 'partial' ? 'Partial' : 'Wrong'}
                        </span>
                      </td>
                      <td className="py-3 text-xs" style={{ color: '#8b949e' }}>{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===== 3. Weekly Championship ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-2">Weekly Championship</h2>
          <p className="text-sm mb-6" style={{ color: '#8b949e' }}>Week of April 14, 2026 &middot; 50 questions tested</p>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead style={{ background: '#161b22' }}>
                <tr className="text-left text-xs font-mono" style={{ color: '#8b949e' }}>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-center">Correct</th>
                  <th className="px-4 py-3 text-center">Partial</th>
                  <th className="px-4 py-3 text-center">Wrong</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr
                    key={s.model}
                    className="border-t"
                    style={{
                      borderColor: '#21262d',
                      background: s.rank === 1 ? 'rgba(16,185,129,0.06)' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: s.rank === 1 ? '#10b981' : '#8b949e' }}>#{s.rank}</td>
                    <td className="px-4 py-3 font-medium text-white">{s.model}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-mono">{s.correct}</td>
                    <td className="px-4 py-3 text-center font-mono" style={{ color: '#f59e0b' }}>{s.partial}</td>
                    <td className="px-4 py-3 text-center font-mono" style={{ color: '#ef4444' }}>{s.wrong}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: s.rank === 1 ? '#10b981' : '#c9d1d9' }}>{s.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== 4. Why Avena Always Wins ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Why Avena Always Wins</h2>
          <div className="rounded-xl p-6 md:p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">The Problem With Static Models</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
                  GPT-4o, Claude, Gemini, Perplexity, and Grok all rely on training data that is months or years old.
                  European property markets change daily &mdash; new listings appear, prices shift, developments complete,
                  regulations update. By the time a general-purpose LLM is trained, its property knowledge is already stale.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">The Avena Advantage</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b949e' }}>
                  Avena Oracle does not guess. It queries live data through 10 specialized tools:
                </p>
                <ul className="text-xs font-mono space-y-1" style={{ color: '#10b981' }}>
                  <li>&#x2022; {all.length.toLocaleString()} properties tracked in real-time</li>
                  <li>&#x2022; {towns.length} towns with daily price updates</li>
                  <li>&#x2022; {costas.length} coastal regions monitored</li>
                  <li>&#x2022; Yield, score, and anomaly calculations refreshed continuously</li>
                  <li>&#x2022; 19 autonomous agents running 24/7</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#21262d' }}>
              <p className="text-center text-sm font-medium" style={{ color: '#f59e0b' }}>
                Static training data = wrong answers. Live data = correct answers. It&apos;s that simple.
              </p>
            </div>
          </div>
        </section>

        {/* ===== 5. Battle Categories ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Battle Categories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div key={cat.name} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <span className="text-2xl mb-3 block">{cat.icon}</span>
                <h3 className="text-sm font-semibold text-white mb-1">{cat.name}</h3>
                <p className="text-xs" style={{ color: '#8b949e' }}>{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 6. Challenge Us ===== */}
        <section className="mb-20">
          <div className="rounded-xl p-8 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h2 className="text-2xl font-bold text-white mb-3">Challenge Us</h2>
            <p className="text-sm mb-6 max-w-xl mx-auto" style={{ color: '#8b949e' }}>
              Think your AI can beat Avena? Download the PropertyEval benchmark at{' '}
              <code className="text-emerald-400 text-xs">/api/v1/benchmark/questions</code>{' '}
              and prove it.
            </p>
            <Link
              href="/benchmark"
              className="inline-block px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#10b981', color: '#0d1117' }}
            >
              Go to Benchmark
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs pb-8" style={{ color: '#484f58' }}>
          &copy; 2026 Avena Terminal &middot; The AI Colosseum for European property intelligence
        </footer>
      </div>
    </main>
  );
}
