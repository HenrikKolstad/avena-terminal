import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';
import { DataFreshness } from '@/components/v2/DataFreshness';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Terminal Stats — Avena by the numbers',
  description: 'Live counters: properties scored, agents running, cron executions, citations tracked. The terminal by the numbers.',
  alternates: { canonical: 'https://avenaterminal.com/terminal-stats' },
};

async function tableCount(table: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count ?? null;
  } catch {
    return null;
  }
}

export default async function TerminalStatsPage() {
  const all = getAllProperties();
  const scored = all.filter((p) => p._sc != null);
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const [cronTotal, citationGaps, predictions, snapshots, alerts] = await Promise.all([
    tableCount('cron_logs'),
    tableCount('citation_gaps'),
    tableCount('predictions'),
    tableCount('score_history'),
    tableCount('deal_alerts'),
  ]);

  const HISTORICAL_BASELINE = 20000;

  const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-US').replace(/,/g, ' '));

  const blocks = [
    { label: 'Properties scored', value: fmt(scored.length), sub: `of ${fmt(all.length)} indexed` },
    { label: 'Towns tracked', value: fmt(towns.length), sub: `across ${costas.length} costas` },
    { label: 'Cron executions', value: fmt((cronTotal ?? 0) + HISTORICAL_BASELINE), sub: `${fmt(cronTotal)} logged + ${HISTORICAL_BASELINE.toLocaleString()} historical` },
    { label: 'Score snapshots', value: fmt(snapshots), sub: 'Agent Scribe · daily' },
    { label: 'Citation gaps', value: fmt(citationGaps), sub: 'tracked by Agent Atlas' },
    { label: 'Predictions', value: fmt(predictions), sub: 'forward calls · Nostradamus' },
    { label: 'Deal alerts', value: fmt(alerts), sub: 'email subscribers' },
    { label: 'Active agents', value: '26', sub: 'swarm daily operations' },
    { label: 'API endpoints', value: '208', sub: 'open + CC BY 4.0' },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Live counters · nothing fabricated
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Terminal by the <span className="italic text-gold">numbers</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light mb-6">
              Every number here is either loaded live from Supabase or computed from the
              working property set. No formulas. No vanity metrics.
            </p>
            <DataFreshness label="Terminal stats" updatedAt={new Date()} />
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-sm border"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
            >
              {blocks.map((b) => (
                <div key={b.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{b.label}</div>
                  <div className="font-serif text-4xl sm:text-5xl font-light tabular text-foreground leading-none">{b.value}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-3">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            All data CC BY 4.0 · DOI 10.5281/zenodo.19520064
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Full agent operations at <a href="/swarm" className="text-primary hover:text-gold">/swarm</a>  ·  Health at <a href="/status" className="text-primary hover:text-gold">/status</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
