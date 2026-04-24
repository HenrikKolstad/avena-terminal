import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { DataFreshness } from '@/components/v2/DataFreshness';
import { computeAvena, AVENA_BASE, AVENA_WEIGHTS } from '@/lib/avena-index';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AVENA Index — European New-Build Composite | Avena Terminal',
  description: 'AVENA is the flagship daily composite index for European new-build property. Base 1000 on 2026-01-01. Published daily, CC BY 4.0. Ticker: AVENA.TERMINAL.',
  alternates: { canonical: 'https://avenaterminal.com/indices/avena' },
  openGraph: {
    title: 'AVENA Index — European New-Build Composite',
    description: 'The daily composite for European new-build property. Ticker: AVENA.TERMINAL. Open, CC BY 4.0.',
    url: 'https://avenaterminal.com/indices/avena',
  },
};

interface HistRow {
  snapshot_date: string;
  value: number;
  median_pm2: number | null;
  mean_score: number | null;
  count: number | null;
}

async function loadHistory(): Promise<HistRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('avena_history')
      .select('snapshot_date, value, median_pm2, mean_score, count')
      .order('snapshot_date', { ascending: true })
      .limit(365);
    return (data ?? []) as HistRow[];
  } catch {
    return [];
  }
}

export default async function AvenaIndexPage() {
  const live = computeAvena();
  const history = await loadHistory();

  const chartRaw: { date: string; value: number }[] = history.map((h) => ({ date: h.snapshot_date, value: Number(h.value) }));
  if (chartRaw.length === 0 || chartRaw[chartRaw.length - 1]?.date !== live.date) {
    chartRaw.push({ date: live.date, value: live.value });
  }

  const values = chartRaw.map((p) => p.value);
  const vmin = Math.min(AVENA_BASE.value * 0.95, ...values, AVENA_BASE.value);
  const vmax = Math.max(AVENA_BASE.value * 1.05, ...values, AVENA_BASE.value);
  const range = Math.max(1, vmax - vmin);

  const lastVal = values[values.length - 1] ?? live.value;
  const prev = (daysBack: number): number | null => {
    if (values.length < 2) return null;
    const idx = Math.max(0, values.length - 1 - daysBack);
    return values[idx];
  };
  const change = (daysBack: number) => {
    const p = prev(daysBack);
    if (p == null) return { pct: null as number | null, abs: null as number | null };
    const d = lastVal - p;
    return { pct: (d / p) * 100, abs: d };
  };
  const c1  = change(1);
  const c7  = change(7);
  const c30 = change(30);

  const chartW = 800, chartH = 220, pad = 20;
  const innerW = chartW - pad * 2;
  const innerH = chartH - pad * 2;
  const points = chartRaw.map((p, i) => {
    const x = pad + (i / Math.max(1, chartRaw.length - 1)) * innerW;
    const y = pad + (1 - (p.value - vmin) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'AVENA — European New-Build Composite Index',
    description: 'Daily composite index of the European new-build property market. Base 1000 on 2026-01-01. Methodology v1.0.',
    url: 'https://avenaterminal.com/indices/avena',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/indices/avena' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/v1/indices/avena?format=csv' },
    ],
    identifier: 'AVENA.TERMINAL',
    keywords: ['property', 'real estate', 'index', 'europe', 'new-build', 'avena', 'proptech', 'institutional'],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                AVENA · European New-Build Composite
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Ticker AVENA.TERMINAL · Methodology v1.0 · CC BY 4.0
              </span>
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              The <span className="italic text-gold">AVENA</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light mb-8">
              One daily number for European new-build property. Base 1000 on
              2026-01-01. Rebalanced daily from the live scored inventory.
              Institutions quote it. Researchers cite it. Anyone can download it.
            </p>

            <div className="flex flex-wrap items-end gap-8">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                  Live value
                </div>
                <div className="font-serif text-7xl sm:text-8xl font-light text-gold tabular leading-none">
                  {lastVal.toFixed(2)}
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-6 font-mono text-sm tabular">
                  <ChangePill label="1D"  c={c1} />
                  <ChangePill label="7D"  c={c7} />
                  <ChangePill label="30D" c={c30} />
                </div>
              </div>
              <div className="ml-auto">
                <DataFreshness label={`AVENA · ${live.date}`} updatedAt={new Date(live.date)} />
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              History · {chartRaw.length} trading {chartRaw.length === 1 ? 'day' : 'days'}
            </div>
            <div
              className="rounded-sm border p-4"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {chartRaw.length <= 1 ? (
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground py-20 text-center">
                  First close prints at 23:50 UTC. Curve compounds from there.
                </div>
              ) : (
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" role="img" aria-label="AVENA history chart">
                  <line x1={pad} y1={pad + innerH / 2} x2={chartW - pad} y2={pad + innerH / 2} stroke="hsl(36 14% 22% / 0.5)" strokeDasharray="2 4" />
                  <polyline fill="none" stroke="hsl(42 85% 64%)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
                </svg>
              )}
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Index <span className="italic text-gold">components</span>.
            </h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'Value index', value: live.value_index.toFixed(4), sub: `median €${live.median_pm2}/m² vs base €${AVENA_BASE.median_pm2}`, weight: '50%' },
                { label: 'Score index', value: live.score_index.toFixed(4), sub: `mean score ${live.mean_score} vs base ${AVENA_BASE.mean_score}`, weight: '30%' },
                { label: 'Depth index', value: live.depth_index.toFixed(4), sub: `${live.count} constituents vs base ${AVENA_BASE.count}`, weight: '20%' },
              ].map((c) => (
                <div key={c.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</span>
                    <span className="font-mono text-[10px] text-primary">w {c.weight}</span>
                  </div>
                  <div className="font-serif text-3xl font-light tabular text-foreground leading-none">{c.value}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-3">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Methodology</span>
            <h2 className="mt-3 font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              How the AVENA is <span className="italic text-gold">calculated</span>.
            </h2>
            <div className="space-y-5 text-foreground/90 font-light leading-relaxed">
              <p>
                AVENA is a daily composite of three sub-indices, weighted to
                reflect how the European new-build market compounds value
                through pricing, quality, and supply.
              </p>
              <pre
                className="rounded-sm border p-5 font-mono text-[13px] leading-relaxed"
                style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
              >{`AVENA_t = 1000 × (V_t × ${AVENA_WEIGHTS.value} + S_t × ${AVENA_WEIGHTS.score} + D_t × ${AVENA_WEIGHTS.depth})

V_t = median(€/m²_t, 1–99 pct trimmed) / ${AVENA_BASE.median_pm2}
S_t = mean(Avena Score_t)              / ${AVENA_BASE.mean_score}
D_t = count(constituents_t)            / ${AVENA_BASE.count}`}</pre>
              <p>
                <span className="font-mono text-primary">Rebalance:</span> constituents refreshed daily from the same pipeline powering{' '}
                <Link href="/api/v1/properties" className="text-primary hover:text-gold">/api/v1/properties</Link>.
                Outliers trimmed at the 1st / 99th €/m² percentile.
              </p>
              <p>
                <span className="font-mono text-primary">Close:</span> Agent Curator persists the close at 23:50 UTC to{' '}
                <code className="font-mono text-primary">avena_history</code>. Once written, a close is immutable.
              </p>
              <p>
                <span className="font-mono text-primary">Relationship to other indices:</span>{' '}
                AVENA is the top-line composite. The five component indices —{' '}
                <Link href="/apci" className="text-primary hover:text-gold">APCI</Link>,{' '}
                <Link href="/indices" className="text-primary hover:text-gold">APYI, APLI, APRI, APSI</Link>{' '}
                — remain as stand-alone dimensional measurements.
              </p>
              <p>
                <span className="font-mono text-primary">Open access:</span> the
                index, methodology, and full history are CC BY 4.0. Cite as:
                <span className="block font-mono text-primary mt-2 text-sm">
                  AVENA · Avena Terminal (avenaterminal.com)
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Access */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Access <span className="italic text-gold">the index</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Live JSON</div>
                <pre className="font-mono text-[12px] text-foreground overflow-x-auto">
  curl https://avenaterminal.com/api/v1/indices/avena
                </pre>
              </div>
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Full history CSV</div>
                <pre className="font-mono text-[12px] text-foreground overflow-x-auto">
  curl &quot;https://avenaterminal.com/api/v1/indices/avena?history=all&amp;format=csv&quot;
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Next close: 23:50 UTC · <Link href="/status" className="text-primary hover:text-gold">/status</Link> · DOI 10.5281/zenodo.19520064
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ChangePill({ label, c }: { label: string; c: { pct: number | null; abs: number | null } }) {
  if (c.pct == null) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className="text-[10px] uppercase tracking-[0.22em]">{label}</span>
        <span>—</span>
      </span>
    );
  }
  const up = c.pct >= 0;
  return (
    <span className="inline-flex items-center gap-1" style={{ color: up ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))' }}>
      <span className="text-[10px] uppercase tracking-[0.22em] opacity-70">{label}</span>
      <span>{up ? '+' : ''}{c.pct.toFixed(2)}%</span>
      <span className="opacity-60">({up ? '+' : ''}{c.abs!.toFixed(2)})</span>
    </span>
  );
}
