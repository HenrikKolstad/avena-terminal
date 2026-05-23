import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import {
  loadIndicators,
  groupByCategory,
  rollupNetSignal,
  latestChainForMarket,
  latestMarketDebate,
  type CausalIndicator,
  type CausalChainStep,
  type ChainNetSignal,
} from '@/lib/causal-engine';
import RefreshDebateButton from './_components/RefreshDebateButton';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'The Causal Intelligence Engine | Avena Terminal',
  description: 'Every other platform shows what happened. This shows what is coming — and why. 15+ leading indicators, measured causal chains, adversarial Bull vs Bear debate, actuarial probabilities.',
  alternates: { canonical: 'https://avenaterminal.com/intelligence' },
  openGraph: {
    title: 'The Causal Intelligence Engine',
    description: 'Quantified leading indicators. Measured causal chains. Adversarial debate. The war room.',
    url: 'https://avenaterminal.com/intelligence',
    siteName: 'Avena Terminal',
  },
};

const SIGNAL_COLORS: Record<ChainNetSignal, string> = {
  strongly_bullish: 'text-primary',
  bullish: 'text-primary',
  neutral: 'text-foreground',
  bearish: 'text-destructive',
  strongly_bearish: 'text-destructive',
};

const SIGNAL_LABEL: Record<ChainNetSignal, string> = {
  strongly_bullish: 'Strongly bullish',
  bullish: 'Bullish',
  neutral: 'Neutral',
  bearish: 'Bearish',
  strongly_bearish: 'Strongly bearish',
};

const DEBATE_SIGNAL_LABEL: Record<string, string> = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  avoid: 'Avoid',
  strong_avoid: 'Strong Avoid',
};

const DEBATE_SIGNAL_COLOR: Record<string, string> = {
  strong_buy: 'text-primary',
  buy: 'text-primary',
  hold: 'text-foreground',
  avoid: 'text-destructive',
  strong_avoid: 'text-destructive',
};

const CATEGORY_LABEL: Record<string, string> = {
  macro: 'Macro',
  demand: 'Demand',
  supply: 'Supply',
  sentiment: 'Sentiment',
  flow: 'Flow',
};

function fmtIndicatorValue(v: number | null, name: string): string {
  if (v == null) return '—';
  if (name.toLowerCase().includes('rate') && v < 20) return `${v.toFixed(2)}%`;
  if (name.toLowerCase().includes('eur/')) return v.toFixed(4);
  if (v >= 1000) return v.toLocaleString('en-GB');
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function fmtChange(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function IndicatorCard({ indicator }: { indicator: CausalIndicator }) {
  const isBull = indicator.signal === 'bullish';
  const isBear = indicator.signal === 'bearish';
  const signalColor = isBull ? 'text-primary' : isBear ? 'text-destructive' : 'text-muted-foreground';
  const changeColor = indicator.change_pct == null ? 'text-muted-foreground' : indicator.change_pct >= 0 ? 'text-primary' : 'text-destructive';

  return (
    <div
      className="p-5"
      style={{ background: 'hsl(var(--av-background))' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-serif text-base text-foreground leading-tight mb-1">{indicator.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">Leads {indicator.lead_time_days}d · Strength {indicator.causal_strength.toFixed(2)}</p>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-[0.22em] ${signalColor}`}>{indicator.signal || 'neutral'}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-3xl font-light tabular text-foreground">{fmtIndicatorValue(indicator.current_value, indicator.name)}</span>
        <span className={`font-mono text-xs tabular ${changeColor}`}>{fmtChange(indicator.change_pct)}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground/80 font-light leading-relaxed line-clamp-2">{indicator.description}</p>
    </div>
  );
}

function CausalStep({ step, last }: { step: CausalChainStep; last: boolean }) {
  const color = step.signal === 'bullish' ? 'text-primary' : step.signal === 'bearish' ? 'text-destructive' : 'text-foreground';
  const border = step.signal === 'bullish' ? 'hsl(var(--av-primary) / 0.4)' : step.signal === 'bearish' ? 'hsl(var(--av-destructive) / 0.4)' : 'hsl(var(--av-border) / 0.6)';
  return (
    <div className="relative flex-1 min-w-[240px]">
      <div
        className="rounded-sm border p-5 h-full"
        style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: border }}
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Lag {step.lag_days}d · Strength {step.strength.toFixed(2)}
        </div>
        <h4 className={`font-serif text-lg ${color} mb-2 leading-tight`}>{step.indicator}</h4>
        <p className="text-sm text-muted-foreground font-light leading-relaxed">{step.mechanism}</p>
      </div>
      {!last && (
        <div className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 items-center justify-center">
          <span className="font-mono text-xl text-primary">→</span>
        </div>
      )}
      {!last && (
        <div className="lg:hidden flex justify-center my-2">
          <span className="font-mono text-xl text-primary">↓</span>
        </div>
      )}
    </div>
  );
}

export default async function IntelligencePage() {
  const market = 'costa_blanca';
  const indicators = await loadIndicators(market);
  const grouped = groupByCategory(indicators);
  const rollup = rollupNetSignal(indicators);
  const chain = await latestChainForMarket(market);
  const debate = await latestMarketDebate(market);

  const marketLabel = 'Costa Blanca';
  const signalColor = SIGNAL_COLORS[rollup.net];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Avena Causal Intelligence Engine',
    description: 'Quantified leading indicators, measured causal chains, adversarial Bull vs Bear market debate, actuarial probability distributions.',
    url: 'https://avenaterminal.com/intelligence',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: new Date().toISOString(),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* HERO */}
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
                Causal Intelligence · The Engine
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
                What&apos;s coming.
                <br />
                <span className="italic text-gold">And why</span>.
              </h1>
              <p className="mt-8 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Every other platform shows what happened. This shows what&apos;s coming —
                and why. {indicators.length} leading indicators. Measured causal relationships.
                Probability distributions, not guesses.
              </p>
            </div>
          </div>
        </section>

        {/* THE SIGNAL — the dominant element */}
        <section className="relative border-t py-16 sm:py-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
              <div>
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Market signal · {marketLabel}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                  Rollup across all indicators.
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Updated {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
              </span>
            </div>

            <div
              className="rounded-sm border p-10 sm:p-16 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.06) 0%, hsl(var(--av-surface) / 0.3) 100%)',
                borderColor: 'hsl(var(--av-primary) / 0.3)',
                boxShadow: 'var(--av-shadow-gold)',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground block mb-4">
                Net signal · confidence {rollup.confidence}%
              </span>
              <div className={`font-serif text-6xl sm:text-8xl lg:text-9xl font-light leading-[0.9] ${signalColor} tracking-tight`}>
                {SIGNAL_LABEL[rollup.net]}
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div>
                  <div className="font-serif text-3xl font-light tabular text-primary">{rollup.bull_count}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Bullish signals</div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-light tabular text-destructive">{rollup.bear_count}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Bearish signals</div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-light tabular text-foreground">{rollup.neutral_count}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Neutral</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAUSAL CHAIN */}
        {chain && (
          <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
              <div className="mb-8">
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Active causal chain · {chain.market.replace(/_/g, ' ')}
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                  {chain.chain_name}.
                </h2>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Net · {SIGNAL_LABEL[chain.net_signal]} · Confidence {chain.confidence}% · Horizon {chain.horizon_days}d
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                {chain.steps.map((step, i) => (
                  <CausalStep key={i} step={step as CausalChainStep} last={i === chain.steps.length - 1} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* LEADING INDICATORS DASHBOARD */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8">
              <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Leading indicators · grouped by category
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                The <span className="italic text-gold">instrument panel</span>.
              </h2>
            </div>

            <div className="space-y-10">
              {(['macro', 'demand', 'supply', 'sentiment', 'flow'] as const).map(cat => {
                const rows = grouped[cat];
                if (!rows || rows.length === 0) return null;
                return (
                  <div key={cat}>
                    <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                      {CATEGORY_LABEL[cat]} · {rows.length}
                    </h3>
                    <div
                      className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-3"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      {rows.map(r => (
                        <IndicatorCard key={r.id} indicator={r} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* THE DEBATE */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
              <div>
                <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Adversarial debate · Agent Bull vs Agent Bear vs Agent Socrates
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                  Both sides <span className="italic text-gold">fully argued</span>.
                </h2>
              </div>
              <RefreshDebateButton market={market} />
            </div>

            {!debate ? (
              <div className="rounded-sm border p-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderStyle: 'dashed', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                No debate yet — hit refresh above, or cron fires 06:30 UTC daily
              </div>
            ) : (
              <div className="space-y-6">
                {/* Verdict strip */}
                <div
                  className="rounded-sm border p-6 flex items-center justify-between gap-6 flex-wrap"
                  style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.3)' }}
                >
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-1">Socrates verdict</span>
                    <span className={`font-serif text-4xl font-light ${DEBATE_SIGNAL_COLOR[debate.final_signal] || 'text-foreground'}`}>
                      {DEBATE_SIGNAL_LABEL[debate.final_signal] || debate.final_signal}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-[11px] tabular">
                    <div className="flex flex-col items-center">
                      <span className="text-primary text-2xl">{debate.bull_score}</span>
                      <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Bull</span>
                    </div>
                    <div className="h-10 w-px" style={{ background: 'hsl(var(--av-border))' }} />
                    <div className="flex flex-col items-center">
                      <span className="text-destructive text-2xl">{debate.bear_score}</span>
                      <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Bear</span>
                    </div>
                    <div className="h-10 w-px" style={{ background: 'hsl(var(--av-border))' }} />
                    <div className="flex flex-col items-center">
                      <span className="text-foreground text-2xl">{debate.confidence}</span>
                      <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Confidence</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Bull */}
                  <div
                    className="rounded-sm border p-6"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.3)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">Agent Bull</span>
                      <span className="font-mono text-[10px] text-muted-foreground">· the case for</span>
                    </div>
                    <p className="font-light leading-relaxed text-foreground/90">{debate.bull_case}</p>
                  </div>
                  {/* Bear */}
                  <div
                    className="rounded-sm border p-6"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-destructive) / 0.3)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-destructive">Agent Bear</span>
                      <span className="font-mono text-[10px] text-muted-foreground">· the case against</span>
                    </div>
                    <p className="font-light leading-relaxed text-foreground/90">{debate.bear_case}</p>
                  </div>
                </div>

                {/* Socrates verdict text */}
                <div
                  className="rounded-sm border p-6"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">Agent Socrates</span>
                    <span className="font-mono text-[10px] text-muted-foreground">· the synthesis</span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-foreground">{debate.arbiter_verdict}</p>
                </div>

                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Debate ID {debate.id} · recorded {new Date(debate.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC · immutable
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Methodology footer */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              What makes this different
            </span>
            <div
              className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-3"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                {
                  title: 'Causation, not correlation',
                  body: 'Every indicator has a measured lead time and causal strength. We track the mechanism chain, not the statistical shadow.',
                },
                {
                  title: 'Adversarial, not promotional',
                  body: 'Every market call is built by Bull arguing for it, Bear arguing against it, and Socrates synthesising. No side of the argument goes missing.',
                },
                {
                  title: 'Actuarial, not anecdotal',
                  body: 'Property-level probabilities are returned as distributions. Yield, capital gain, developer delay, liquidity — all quantified.',
                },
              ].map(b => (
                <div key={b.title} className="p-8" style={{ background: 'hsl(var(--av-background))' }}>
                  <h3 className="font-serif text-xl font-light text-foreground mb-3">{b.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Agents · Bull · Bear · Socrates · Causal · Source · Avena Terminal · DOI 10.5281/zenodo.19520064
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/swarm"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                See all 19 agents →
              </Link>
              <Link
                href="/predictions"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Prediction Ledger →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
