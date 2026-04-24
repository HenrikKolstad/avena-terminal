import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Avena Score Challenge 2026 — Beat the open engine on backtest',
  description: 'Public leaderboard. Open training data. MIT engine baseline. Submit your own property scoring model and compete on held-out Spanish new-build data.',
  alternates: { canonical: 'https://avenaterminal.com/challenge/score-2026' },
  openGraph: {
    title: 'Avena Score Challenge 2026',
    description: 'Beat the open scoring engine on backtest data. Public leaderboard.',
    url: 'https://avenaterminal.com/challenge/score-2026',
  },
};

export default function ChallengePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Avena Score Challenge 2026',
    description: 'Public property scoring leaderboard. Beat the MIT open-source Avena Score engine on held-out backtest data.',
    startDate: '2026-04-24',
    endDate: '2026-12-31',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: 'https://avenaterminal.com/challenge/score-2026' },
    organizer: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Public challenge · open until 2026-12-31
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Beat the <span className="italic text-gold">Avena Score</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              We open-sourced our property scoring engine. Now we&apos;re inviting
              the ML + PropTech community to beat it. Submit your own scoring
              model against the held-out 2026 backtest. Leaderboard is public,
              methodology is public, winning model will be cited in the next
              Avena Score release notes.
            </p>
          </div>
        </section>

        {/* Rules */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Rules of <span className="italic text-gold">engagement</span>.
            </h2>
            <ol className="space-y-4 text-base text-foreground/90 font-light leading-relaxed list-decimal pl-6">
              <li>
                <strong>Use the open data.</strong> Training set is{' '}
                <Link href="/api/v1/properties" className="text-primary hover:text-gold">/api/v1/properties</Link>
                {' '}(CC BY 4.0). Town medians at{' '}
                <Link href="/api/v1/market" className="text-primary hover:text-gold">/api/v1/market</Link>.
                Historical closes at{' '}
                <Link href="/api/v1/indices/avena?history=all&amp;format=csv" className="text-primary hover:text-gold">
                  /api/v1/indices/avena?history=all
                </Link>.
              </li>
              <li>
                <strong>Output a 0–100 score per property.</strong> Submissions
                return a JSON mapping <code className="font-mono text-primary">ref → score</code> for every ref in
                the holdout set. Your model can be anything — XGBoost, a
                transformer, another hedonic decomposition, pure heuristics.
              </li>
              <li>
                <strong>Evaluation.</strong> We rank submissions by
                Spearman rank correlation between your scores and realized
                12-month price change on the 2026 holdout set (published
                2026-12-31). Ties broken by mean absolute score-error vs. our
                v1.0 baseline.
              </li>
              <li>
                <strong>Submit.</strong> Open a PR to{' '}
                <code className="font-mono text-primary">github.com/avenaterminal/avena-score/tree/main/submissions/2026</code>
                {' '}with a directory named after your handle, containing a README, your code, and a <code className="font-mono text-primary">predictions.json</code>.
              </li>
              <li>
                <strong>Public leaderboard.</strong> Published at this URL. Updated on every accepted PR.
              </li>
              <li>
                <strong>Winner gets cited.</strong> Top submission is
                cited in the Avena Score v1.1 methodology paper and feature-released on{' '}
                <Link href="/changelog" className="text-primary hover:text-gold">/changelog</Link>.
                Additional recognition may include paid collaboration on the
                v2 model.
              </li>
            </ol>
          </div>
        </section>

        {/* Leaderboard placeholder */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Public <span className="italic text-gold">leaderboard</span>.
            </h2>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>#</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Submission</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Method</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Spearman ρ</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>MAE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-foreground">avena/baseline-v1.0</td>
                    <td className="px-4 py-3 text-muted-foreground">hedonic · MIT</td>
                    <td className="px-4 py-3 text-right text-gold">0.———</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono text-[11px] uppercase tracking-[0.22em]">
                      First submissions accepted now · holdout evaluation publishes 2026-12-31
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[800px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Common <span className="italic text-gold">questions</span>.
            </h2>
            <div className="space-y-6">
              {[
                { q: 'Do I need to open-source my submission?', a: 'Yes. Every accepted submission is MIT-licensed on merge. Private models can still query /api/v1/score but cannot claim the leaderboard spot.' },
                { q: 'Can I use the baseline engine as a starting point?', a: 'Absolutely. Fork github.com/avenaterminal/avena-score, improve it, submit the diff. Incremental improvements over v1.0 are the most common winning path.' },
                { q: 'How is the holdout selected?', a: 'A random 10% of the 1,881 Spanish working set is held out at the start of the challenge window (2026-04-24 snapshot). Holdout refs are revealed 2026-12-31 along with realized outcomes.' },
                { q: 'What counts as a "realized outcome"?', a: '12-month change in price/m² of the same property, or of nearest-neighbor properties if the specific unit has no observed resale. Computed by Agent Arbiter with source-of-truth comps from idealista/kyero/fotocasa.' },
                { q: 'Is there a prize?', a: 'Recognition + citation in v1.1 release notes + potential paid collaboration on v2. A cash prize may be added in future cycles.' },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="font-serif text-lg text-foreground mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
            Baseline engine: <a href="https://github.com/avenaterminal/avena-score" target="_blank" rel="noopener" className="text-primary hover:text-gold">github.com/avenaterminal/avena-score</a>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Questions? <a href="mailto:henrik@avenaterminal.com" className="text-primary hover:text-gold">henrik@avenaterminal.com</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
