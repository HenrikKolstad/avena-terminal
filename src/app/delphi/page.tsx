/**
 * /delphi — Avena DELPHI, the daily AI panel on European property.
 *
 * The world's first daily, longitudinal, resolvable survey where the
 * panelists are frontier AI models. The Delphi method, with machines.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { indexHistory, latestPanel } from '@/lib/delphi';
import { DELPHI_QUESTIONS, DELPHI_VERSION } from '@/lib/delphi-questions';

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

export default async function DelphiPage() {
  const [history, panel] = await Promise.all([indexHistory(60), latestPanel()]);
  const latest = history[0] ?? null;
  const qMap = new Map(DELPHI_QUESTIONS.map(q => [q.id, q]));
  const panelistLabels = Array.from(
    new Set(panel.flatMap(r => Object.keys(r.per_model ?? {})))
  ).sort();

  // Sparkline for consensus index
  const points = history.slice().reverse();
  const W = 1000, H = 110, PAD = 4;
  const sparkPath = points.length > 1
    ? points.map((p, i) => {
        const x = PAD + (i * (W - 2 * PAD)) / (points.length - 1);
        const y = H - PAD - ((Number(p.consensus_index) / 100) * (H - 2 * PAD));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            DELPHI v{DELPHI_VERSION} · {DELPHI_QUESTIONS.length} questions · daily 06:00 UTC · world first
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            What the machines believe about European property.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every day, the same fixed panel of forward questions is put to every major AI model — probabilities, expected changes, valuation judgments. Panelists never see each other&apos;s answers. We publish the consensus, the disagreement, the drift over time — and when each question&apos;s horizon arrives, we score the machines against reality. The ZEW survey, with machine panelists. Nothing like it has existed before.
          </p>
        </section>

        {/* Hero indices */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <div className="rounded-sm border p-6 sm:p-8" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'hsl(var(--av-primary) / 0.05)' }}>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Consensus Index</div>
                <div className="font-serif text-5xl sm:text-6xl font-light text-foreground tabular leading-none">
                  {latest ? Number(latest.consensus_index).toFixed(1) : '—'}
                </div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">0 = maximally bearish · 100 = maximally bullish</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Disagreement Index</div>
                <div className="font-serif text-5xl sm:text-6xl font-light text-foreground tabular leading-none">
                  {latest ? Number(latest.disagreement_index).toFixed(1) : '—'}
                </div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">mean spread between most bullish and most bearish panelist</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Panel</div>
                <div className="font-serif text-5xl sm:text-6xl font-light text-foreground tabular leading-none">
                  {latest ? latest.n_panelists : '—'}
                </div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {latest ? `${latest.n_questions} questions aggregated · ${latest.run_date}` : 'first panel convenes 06:00 UTC'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Drift sparkline */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Consensus drift — 60 days</div>
            {points.length <= 1 ? (
              <div className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Drift appears from day two — the longitudinal record is the asset.
              </div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
                <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="hsl(var(--av-border) / 0.5)" strokeDasharray="4 4" />
                <path d={sparkPath} stroke="hsl(var(--av-primary))" strokeWidth="2" fill="none" />
              </svg>
            )}
          </div>
        </section>

        {/* The panel table */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">Today&apos;s panel</h2>
          {panel.length === 0 ? (
            <div className="rounded-sm border p-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
              The first panel convenes at 06:00 UTC. Beliefs appear here the same morning.
            </div>
          ) : (
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">Question</th>
                    {panelistLabels.map(l => <th key={l} className="text-right p-3">{l}</th>)}
                    <th className="text-right p-3">Consensus</th>
                    <th className="text-right p-3">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {DELPHI_QUESTIONS.map(q => {
                    const row = panel.find(r => r.question_id === q.id);
                    if (!row) return null;
                    return (
                      <tr key={q.id} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="p-3">
                          <span className="font-mono text-[9px] text-gold tabular mr-2">{q.id}</span>
                          <span className="text-foreground/90" title={q.question}>{q.short_label}</span>
                        </td>
                        {panelistLabels.map(l => (
                          <td key={l} className="p-3 text-right font-mono text-[11px] tabular text-foreground/85">
                            {row.per_model?.[l] != null ? Number(row.per_model[l]).toFixed(0) : '—'}
                          </td>
                        ))}
                        <td className="p-3 text-right font-serif text-base tabular text-foreground">{Number(row.consensus).toFixed(0)}</td>
                        <td className="p-3 text-right font-mono text-[11px] tabular" style={{ color: Number(row.dispersion) >= 30 ? 'hsl(var(--av-warning))' : 'hsl(var(--av-muted-foreground))' }}>
                          {Number(row.dispersion).toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Question set */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10">
          <details className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <summary className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground cursor-pointer hover:text-foreground">
              Show the full question set — wording, horizons, resolution sources
            </summary>
            <div className="mt-4 space-y-3">
              {DELPHI_QUESTIONS.map(q => (
                <div key={q.id} className="border-b pb-3 last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
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
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Why this has never existed</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Surveys of human experts are a century old — ZEW polls economists, the SPF polls forecasters, prediction markets aggregate bettors. DELPHI is the first daily, longitudinal, resolvable panel survey where the respondents are frontier AI models. PLAB (<Link href="/benchmark" className="text-primary hover:underline">/benchmark</Link>) measures what the machines <em>know</em>; DELPHI records what they <em>believe</em> — and because every question carries a horizon and a public resolution source, the machines will eventually be scored on judgment, not just recall. Every response is stored verbatim, every run is event-sourced and replayable, and the accumulating record is published under CC BY 4.0 (DOI 10.5281/zenodo.19520064) for any researcher to study. JSON: <Link href="/api/v1/delphi" className="text-primary hover:underline">/api/v1/delphi</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
