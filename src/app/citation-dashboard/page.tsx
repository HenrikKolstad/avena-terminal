import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { currentHitRate, loadMeasurements } from '@/lib/citation-measure';
import { supabase } from '@/lib/supabase';

export const revalidate = 600; // 10 min

export const metadata: Metadata = {
  title: 'Citation Dashboard — Avena Terminal',
  description:
    'Live measurement of how often AI answer engines cite Avena Terminal when asked about European property.',
  alternates: { canonical: 'https://avenaterminal.com/citation-dashboard' },
};

async function loadGaps() {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('citation_gaps')
      .select('question, priority, reason, date')
      .eq('resolved', false)
      .order('priority', { ascending: false })
      .limit(12);
    return data ?? [];
  } catch {
    return [];
  }
}

async function loadMcpCount() {
  if (!supabase) return { total: 0, month: 0 };
  try {
    const { count: total } = await supabase
      .from('mcp_calls')
      .select('*', { count: 'exact', head: true });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: month } = await supabase
      .from('mcp_calls')
      .select('*', { count: 'exact', head: true })
      .gte('called_at', startOfMonth.toISOString());
    return { total: total ?? 0, month: month ?? 0 };
  } catch {
    return { total: 0, month: 0 };
  }
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default async function CitationDashboardPage() {
  const [rate, measurements, gaps, mcp] = await Promise.all([
    currentHitRate(),
    loadMeasurements(30),
    loadGaps(),
    loadMcpCount(),
  ]);

  const maxRate = Math.max(20, ...measurements.map((m) => m.avena_rate));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              The moat · measured
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              Citations,
              <br />
              <span className="italic text-gold">measured daily</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              How often Perplexity, Google AI Overviews, ChatGPT Search, and Claude
              cite Avena Terminal when asked about European property. Updated every
              morning.
            </p>
          </div>
        </section>

        {/* Top stat band */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{
                background: 'hsl(var(--av-border) / 0.6)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {[
                {
                  label: '7-day hit rate',
                  value: formatPct(rate.rate),
                  foot:
                    rate.trend7d >= 0
                      ? `+${rate.trend7d.toFixed(1)} pp vs prior week`
                      : `${rate.trend7d.toFixed(1)} pp vs prior week`,
                  tone: rate.trend7d >= 0 ? 'good' : 'warn',
                },
                {
                  label: 'Questions tracked · 7d',
                  value: rate.total_questions_tracked.toLocaleString(),
                  foot: 'Perplexity polled',
                  tone: 'neutral',
                },
                {
                  label: 'MCP tool calls · total',
                  value: mcp.total.toLocaleString(),
                  foot: `${mcp.month.toLocaleString()} this month`,
                  tone: 'neutral',
                },
                {
                  label: 'Active gaps',
                  value: gaps.length.toString(),
                  foot: 'Unresolved opportunities',
                  tone: gaps.length > 10 ? 'warn' : 'good',
                },
              ].map((s) => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    {s.label}
                  </div>
                  <div className="font-serif text-5xl font-light tabular text-foreground leading-none mb-2">
                    {s.value}
                  </div>
                  <div
                    className="font-mono text-[9px] uppercase tracking-[0.22em]"
                    style={{
                      color:
                        s.tone === 'good'
                          ? 'hsl(var(--av-primary))'
                          : s.tone === 'warn'
                          ? 'hsl(var(--av-warning))'
                          : 'hsl(var(--av-muted-foreground))',
                    }}
                  >
                    {s.foot}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 30-day trend */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              30-day <span className="italic text-gold">citation rate</span>.
            </h2>

            {measurements.length === 0 ? (
              <div
                className="rounded-sm border p-8 text-center"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                  <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full mr-2" style={{ background: 'hsl(var(--av-primary))' }} />
                  Awaiting first rollup
                </p>
                <p className="mt-3 font-serif text-xl text-foreground">
                  Agent <span className="italic text-gold">Cassandra</span> rolls up the first data
                  point daily at 03:30 UTC.
                </p>
                <p className="mt-3 text-sm text-muted-foreground font-light max-w-lg mx-auto">
                  Atlas polls Perplexity with ~50 questions at 03:00 UTC; Cassandra aggregates
                  30 minutes later. Once the first row lands this chart fills in and the
                  homepage ticker shows real <span className="font-mono text-foreground">CITE %</span>.
                </p>
              </div>
            ) : (
              <div
                className="rounded-sm border p-6"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div className="flex items-end gap-1.5 h-48 overflow-x-auto">
                  {measurements
                    .slice()
                    .reverse()
                    .map((m) => {
                      const h = Math.max(4, (m.avena_rate / maxRate) * 180);
                      return (
                        <div key={m.date} className="flex-1 min-w-[12px] flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm transition-colors"
                            style={{
                              height: `${h}px`,
                              background:
                                m.avena_rate > 30
                                  ? 'var(--av-gradient-gold)'
                                  : 'hsl(var(--av-border-strong))',
                            }}
                            title={`${m.date}: ${m.avena_rate}% (${m.avena_hits}/${m.questions_asked})`}
                          />
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span>{measurements[measurements.length - 1]?.date}</span>
                  <span>Now</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Open gaps */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Where competitors <span className="italic text-gold">still win</span>.
            </h2>

            {gaps.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                No gaps on record yet. The citation-agent populates these daily.
              </p>
            ) : (
              <div className="space-y-2">
                {gaps.map((g, i) => (
                  <div
                    key={`${g.question}-${g.date}-${i}`}
                    className="flex items-center justify-between gap-4 rounded-sm border p-4"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono text-xs tabular text-muted-foreground flex-shrink-0">
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="font-serif text-base text-foreground truncate">
                          {g.question}
                        </div>
                        {g.reason && (
                          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate">
                            {g.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] rounded-sm border px-3 py-1"
                      style={{
                        background: 'hsl(var(--av-warning) / 0.1)',
                        borderColor: 'hsl(var(--av-warning) / 0.3)',
                        color: 'hsl(var(--av-warning))',
                      }}
                    >
                      Priority {g.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Method footer */}
        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 inline-block">
                Methodology
              </span>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Every day, the Avena citation-agent queries Perplexity with ~50 high-volume European
                property questions, recording every source cited in the answer. Rollup computes
                Avena&apos;s hit-rate, competitor share, and flags questions where agents/portals win
                but Avena doesn&apos;t. Raw data persists in{' '}
                <span className="text-foreground font-mono text-[11px]">citation_monitoring</span> and{' '}
                <span className="text-foreground font-mono text-[11px]">citation_measurements</span>,
                publicly readable under CC BY 4.0.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
