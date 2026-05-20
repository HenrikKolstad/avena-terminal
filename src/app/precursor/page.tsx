import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { Radio, ArrowUpRight, AlertTriangle, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Avena Precursor — the signal before the signal | Avena Terminal',
  description: 'Alpha before the market sees it. Avena Precursor monitors public regulatory, infrastructure, demographic and policy signals across EU markets, translates them into property price implications with confidence scores and time lags.',
  alternates: { canonical: 'https://avenaterminal.com/precursor' },
  openGraph: {
    title: 'Avena Precursor — alpha before the market',
    description: 'Public signals translated into property price implications. Confidence scored, time-lagged, RICS-credentialed.',
    url: 'https://avenaterminal.com/precursor',
  },
};

interface Signal {
  signal_id: string;
  signal_type: string;
  title: string;
  description: string;
  affected_markets: string[];
  affected_regions: string[] | null;
  historical_price_impact_pct: number | null;
  historical_time_lag_days: number | null;
  historical_sample_size: number | null;
  confidence_score: number;
  magnitude_estimate: string | null;
  direction: string;
  current_apci: number | null;
  projected_apci_low: number | null;
  projected_apci_high: number | null;
  projection_horizon_days: number | null;
  claude_analysis: string;
  status: string;
  detected_at: string;
  signal_date: string | null;
}

interface Category {
  category: string;
  historical_accuracy_pct: number | null;
  avg_time_lag_days: number | null;
  avg_price_impact_pct: number | null;
  sample_size: number | null;
}

async function loadSignals(): Promise<{ signals: Signal[]; categories: Category[] }> {
  if (!supabase) return { signals: [], categories: [] };
  try {
    const [s, c] = await Promise.all([
      supabase.from('precursor_signals').select('*').eq('status', 'active').order('confidence_score', { ascending: false }).limit(50),
      supabase.from('precursor_categories').select('*').order('historical_accuracy_pct', { ascending: false }),
    ]);
    return { signals: (s.data ?? []) as Signal[], categories: (c.data ?? []) as Category[] };
  } catch {
    return { signals: [], categories: [] };
  }
}

const DIR_META: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  bullish: { icon: TrendingUp, color: 'hsl(var(--av-primary))', label: 'Bullish' },
  bearish: { icon: TrendingDown, color: 'hsl(var(--av-destructive))', label: 'Bearish' },
  neutral: { icon: Minus, color: 'hsl(var(--av-muted-foreground))', label: 'Neutral' },
};

const TYPE_LABELS: Record<string, string> = {
  infrastructure: 'Infrastructure',
  regulatory: 'Regulatory',
  demographic: 'Demographic',
  planning: 'Planning',
  transport: 'Transport',
  economic_policy: 'Economic policy',
  zoning: 'Zoning',
};

export default async function PrecursorPage() {
  const { signals, categories } = await loadSignals();
  const bullishCount = signals.filter((s) => s.direction === 'bullish').length;
  const bearishCount = signals.filter((s) => s.direction === 'bearish').length;
  const avgConfidence = signals.length ? Math.round(signals.reduce((sum, s) => sum + s.confidence_score, 0) / signals.length) : 0;

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        {/* Hero */}
        <section className="border-b relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'linear-gradient(180deg, hsl(32 14% 8%) 0%, hsl(32 14% 11%) 100%)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14 sm:py-20 min-w-0">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Precursor · institutional intelligence · live
            </span>
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
              The signal before <span className="italic text-gold">the signal</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light mb-10">
              Every major property price move was preceded by a public signal nobody connected to property — a planning permission filed quietly, an infrastructure budget allocation, a regulatory change. Avena reads them all, translates each into a price implication with time lag and confidence.
            </p>

            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Active signals</div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-primary leading-none">{signals.length}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Avg confidence</div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-foreground leading-none">{avgConfidence}%</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Bullish · Bearish</div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-foreground leading-none">
                  <span className="text-primary">{bullishCount}</span>
                  <span className="text-muted-foreground/40 mx-2">·</span>
                  <span style={{ color: 'hsl(var(--av-destructive))' }}>{bearishCount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Signals feed */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
              Live signal <span className="italic text-gold">feed</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-8">
              Sorted by confidence score · all signals are public-data derived · CC BY 4.0
            </p>

            {signals.length === 0 ? (
              <div className="rounded-sm border p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                No active signals — Precursor scan runs daily at 05:00 UTC
              </div>
            ) : (
              <div className="space-y-4">
                {signals.map((s) => {
                  const dir = DIR_META[s.direction] ?? DIR_META.neutral;
                  const DirIcon = dir.icon;
                  return (
                    <Link
                      key={s.signal_id}
                      href={`/precursor/${s.signal_id}`}
                      className="block rounded-sm border p-5 sm:p-6 hover:border-primary transition-colors group min-w-0"
                      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 border rounded-sm"
                            style={{ borderColor: 'hsl(var(--av-border-strong))', color: 'hsl(var(--av-muted-foreground))' }}>
                            {s.signal_id}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-sm"
                            style={{ background: 'hsl(var(--av-primary) / 0.1)', color: 'hsl(var(--av-primary))' }}>
                            {TYPE_LABELS[s.signal_type] ?? s.signal_type}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] flex items-center gap-1" style={{ color: dir.color }}>
                            <DirIcon className="h-3 w-3" />
                            {dir.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Confidence</div>
                            <div className="font-serif tabular text-2xl text-primary leading-none">{s.confidence_score}%</div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl text-foreground font-light mb-2 break-words" style={{ overflowWrap: 'anywhere' }}>
                        {s.title}
                      </h3>
                      <p className="text-sm text-foreground/75 font-light leading-relaxed mb-3 line-clamp-2">
                        {s.description}
                      </p>

                      <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        <span>Markets: <span className="text-foreground/85">{s.affected_markets.join(' · ')}</span></span>
                        {s.magnitude_estimate && <span>· Magnitude: <span className="text-foreground/85">{s.magnitude_estimate}</span></span>}
                        {s.historical_time_lag_days && <span>· Lag: <span className="text-foreground/85">{Math.round(s.historical_time_lag_days / 30)}mo</span></span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Category accuracy tracker */}
        {categories.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
              <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground mb-6">
                Historical accuracy by <span className="italic text-gold">signal type</span>.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map((c) => (
                  <div key={c.category} className="rounded-sm border p-4" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{TYPE_LABELS[c.category] ?? c.category}</div>
                    <div className="font-serif text-3xl text-primary tabular">{c.historical_accuracy_pct ?? '—'}%</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {c.sample_size ?? 0} signals · avg {c.avg_time_lag_days ? Math.round(c.avg_time_lag_days / 30) : '—'}mo lag · {c.avg_price_impact_pct ?? '—'}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Access */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14 min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground mb-5">
              Access <span className="italic text-gold">tiers</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5" /> PRO · €79/mo
                </div>
                <p className="text-sm text-foreground/85 font-light">Signal alerts for your target markets. Read-only access to the live feed.</p>
              </div>
              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" /> Desk · €2,500/mo
                </div>
                <p className="text-sm text-foreground/85 font-light">Full API access. Raw signal data. Custom market monitoring.</p>
              </div>
              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.4)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Fund · €12,000/mo
                </div>
                <p className="text-sm text-foreground/85 font-light">Custom signal categories for your mandate. Portfolio-level monitoring.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pro" className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold" style={{ background: 'var(--av-gradient-gold)' }}>
                Subscribe PRO →
              </Link>
              <Link href="/institutional" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Institutional access →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · RICS Tech Partner 2026 · Public-data sourced
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
