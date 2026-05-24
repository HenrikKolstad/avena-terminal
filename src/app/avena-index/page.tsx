import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { IndexChart } from './IndexChart';
import { TickerStrip } from './TickerStrip';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'The Avena Index Family · Avena Terminal',
  description: 'Four daily-published institutional indices tracking European coastal property: AVENA Coastal Composite, Value, Score, and Depth. Citable DOI, CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/avena-index' },
  openGraph: {
    title: 'Avena Index Family — daily property benchmarks for Europe',
    description: 'Four published indices · daily close · CC BY 4.0 · DOI 10.5281/zenodo.19520064',
    url: 'https://avenaterminal.com/avena-index',
  },
};

interface HistoryRow {
  snapshot_date: string;
  value: number;
  median_pm2: number | null;
  mean_score: number | null;
  count: number | null;
  value_index: number | null;
  score_index: number | null;
  depth_index: number | null;
}

async function loadHistory(): Promise<HistoryRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('avena_history')
      .select('snapshot_date, value, median_pm2, mean_score, count, value_index, score_index, depth_index')
      .order('snapshot_date', { ascending: true })
      .limit(365);
    return (data ?? []) as HistoryRow[];
  } catch {
    return [];
  }
}

export interface IndexCard {
  code: string;
  name: string;
  description: string;
  level: number;
  base: number;
  base_date: string;
  change_1d_pct: number;
  change_7d_pct: number;
  change_30d_pct: number;
  change_ytd_pct: number;
  sparkline: number[];
  source_column: 'value' | 'value_index' | 'score_index' | 'depth_index';
}

function pct(now: number | null | undefined, then: number | null | undefined): number {
  if (now == null || then == null || then === 0) return 0;
  // Cross-scale safety — the index was re-based at some point during the
  // history (legacy 100-base → 1000-base methodology), so naively dividing
  // current value (~1556) by an old base (~107) yields a bogus +1352%
  // figure. Suppress when the ratio implies a methodology break rather
  // than a real return.
  const ratio = now / then;
  if (ratio > 3 || ratio < 0.33) return 0;
  return Number((((now - then) / then) * 100).toFixed(2));
}

function buildIndexCard(
  history: HistoryRow[],
  code: string,
  name: string,
  description: string,
  col: IndexCard['source_column']
): IndexCard {
  const series = history.map((r) => Number(r[col] ?? r.value) || 0).filter((v) => v > 0);
  const dates = history.map((r) => r.snapshot_date);
  const level = series[series.length - 1] ?? 100;
  const base = series[0] ?? 100;
  const base_date = dates[0] ?? '';

  const ytdStart = (() => {
    const yearStart = new Date(new Date().getUTCFullYear(), 0, 1).toISOString().slice(0, 10);
    for (let i = 0; i < dates.length; i++) if (dates[i] >= yearStart) return series[i];
    return base;
  })();

  return {
    code, name, description,
    level,
    base, base_date,
    change_1d_pct:  pct(level, series[series.length - 2]),
    change_7d_pct:  pct(level, series[series.length - 8]),
    change_30d_pct: pct(level, series[series.length - 31]),
    change_ytd_pct: pct(level, ytdStart),
    sparkline: series.slice(-60),
    source_column: col,
  };
}

const FAMILY_DEFS: Array<{ code: string; name: string; description: string; col: IndexCard['source_column'] }> = [
  { code: 'AVENA-CC',  name: 'AVENA Coastal Composite', description: 'The master index. Composite of price (€/m²), aggregate score, and inventory depth across all scored Spanish coastal markets.', col: 'value' },
  { code: 'AVENA-VAL', name: 'AVENA Value Index',       description: 'Price-only index — median €/m² across the corpus, rebased to base date.',                                                     col: 'value_index' },
  { code: 'AVENA-SCR', name: 'AVENA Score Index',       description: 'Mean Avena Score across the corpus, rebased. Tracks aggregate quality of available inventory.',                              col: 'score_index' },
  { code: 'AVENA-DPT', name: 'AVENA Depth Index',       description: 'Inventory depth — count of scored properties available, rebased. Rising = liquidity expansion.',                              col: 'depth_index' },
];

export default async function AvenaIndexPage() {
  const history = await loadHistory();
  const indices = FAMILY_DEFS.map((def) => buildIndexCard(history, def.code, def.name, def.description, def.col));

  const latest = history[history.length - 1];
  const asOf = latest?.snapshot_date ?? new Date().toISOString().slice(0, 10);

  // Last 90 days, all 4 series on the same x-axis
  const chartSlice = history.slice(-90);
  const chartData = chartSlice.map((r) => ({
    date: r.snapshot_date,
    'AVENA-CC':  Number(r.value) || null,
    'AVENA-VAL': Number(r.value_index) || null,
    'AVENA-SCR': Number(r.score_index) || null,
    'AVENA-DPT': Number(r.depth_index) || null,
  }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Bloomberg-style ticker strip */}
        <TickerStrip indices={indices} />

        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Avena Index Family · Daily Close · As Of {asOf}
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Daily-published property benchmarks<br />
              for <span className="italic text-gold">institutional</span> Europe.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light leading-relaxed">
              Four published indices closing every UTC day. Base period {indices[0]?.base_date || '—'} = 100. Methodology is open (CC BY 4.0), the dataset is citable (DOI 10.5281/zenodo.19520064), and every level is computed from the live Avena corpus, timestamped, and audit-logged.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Close <span className="text-foreground">23:50 UTC daily</span></span>
              <span>·</span>
              <span>Methodology <Link href="/methodology" className="text-foreground hover:text-primary">/methodology</Link></span>
              <span>·</span>
              <span>Governance <Link href="/governance" className="text-foreground hover:text-primary">/governance</Link></span>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">90-day history · all four series</div>
            <div className="rounded-sm border p-4 sm:p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
              <IndexChart data={chartData} indices={indices} />
            </div>
          </div>
        </section>

        {/* Index cards */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">Constituents</div>
            <div className="grid sm:grid-cols-2 gap-4">
              {indices.map((idx) => <IndexCardComponent key={idx.code} idx={idx} />)}
            </div>
          </div>
        </section>

        {/* Methodology + citation */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12 grid md:grid-cols-2 gap-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology</div>
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-3">How each index is computed.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">AVENA-CC</strong> blends the three sub-indices (Value 40% / Score 35% / Depth 25%) for a single composite benchmark.<br />
                <strong className="text-foreground">AVENA-VAL</strong> tracks the median €/m² across the scored corpus.<br />
                <strong className="text-foreground">AVENA-SCR</strong> tracks the mean Avena Score (composite quality).<br />
                <strong className="text-foreground">AVENA-DPT</strong> tracks the count of scored inventory available.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Every level is the close of one UTC day, computed by <code className="font-mono text-foreground">/api/cron/curator</code> at 23:50 UTC and persisted to <code className="font-mono text-foreground">avena_history</code>. Methodology changes are announced 30 days in advance at <Link href="/changelog" className="text-primary hover:underline">/changelog</Link>.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite as</div>
              <div className="rounded-sm border p-4 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
                <div className="text-muted-foreground">Avena Terminal (2026).</div>
                <div className="text-foreground">The Avena Coastal Composite Index family.</div>
                <div className="text-muted-foreground">Avena Terminal. avenaterminal.com/avena-index</div>
                <div className="text-primary mt-2">DOI: 10.5281/zenodo.19520064</div>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Indices are CC BY 4.0. Commercial reuse permitted with attribution. <Link href="/institutional" className="text-primary hover:underline">/institutional</Link> for derivatives licensing.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Designed for tradability · published daily · APIP v1.0 · CC BY 4.0
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function IndexCardComponent({ idx }: { idx: IndexCard }) {
  const arrowColor = (n: number) => n > 0 ? 'text-success' : n < 0 ? 'text-destructive' : 'text-muted-foreground';
  const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{idx.code}</div>
          <h3 className="font-serif text-lg text-foreground leading-tight mt-0.5">{idx.name}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-serif text-4xl font-light text-gold tabular leading-none">{idx.level.toFixed(2)}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Base {idx.base.toFixed(2)}</div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{idx.description}</p>

      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-sm" style={{ background: 'hsl(var(--av-border) / 0.4)' }}>
        {[
          { label: '1d',  v: idx.change_1d_pct },
          { label: '7d',  v: idx.change_7d_pct },
          { label: '30d', v: idx.change_30d_pct },
          { label: 'YTD', v: idx.change_ytd_pct },
        ].map((c) => (
          <div key={c.label} className="p-2.5" style={{ background: 'hsl(var(--av-background))' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</div>
            <div className={`font-mono text-sm tabular ${arrowColor(c.v)}`}>{fmtPct(c.v)}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Sparkline data={idx.sparkline} />
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 280;
  const h = 36;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="hsl(42 85% 64% / 0.7)" strokeWidth="1.5" />
    </svg>
  );
}
