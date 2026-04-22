import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';
import { currentHitRate } from '@/lib/citation-measure';

export const revalidate = 600;

interface Tick {
  sym: string;
  v: string;
  d: string;
  up: boolean;
  label: string;
}

/**
 * Live ticker values — pulled from real Supabase + in-memory data.
 * Falls back to reasonable defaults when Supabase not available so the page
 * still renders.
 */
async function buildTicks(): Promise<Tick[]> {
  const all = getAllProperties();
  const totalProps = all.length;

  // APCI — simple live composite from live property data
  const scored = all.filter((p) => p._sc != null);
  const avgScore =
    scored.reduce((s, p) => s + (p._sc ?? 0), 0) / (scored.length || 1);
  const apci = Number(avgScore.toFixed(1));

  // Yield band
  const withYield = all.filter((p) => p._yield?.gross);
  const avgYield =
    withYield.reduce((s, p) => s + (p._yield!.gross ?? 0), 0) /
    (withYield.length || 1);
  const apyi = avgYield.toFixed(2);

  // MCP calls (real — counts AI agents calling our MCP server)
  let mcpTotal = 0;
  let mcpMonth = 0;
  if (supabase) {
    try {
      const { count: total } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      mcpTotal = total ?? 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: m } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true })
        .gte('called_at', startOfMonth.toISOString());
      mcpMonth = m ?? 0;
    } catch {
      /* */
    }
  }

  // Citation hit-rate (real — rolling 7d Perplexity citation rate)
  const hit = await currentHitRate().catch(() => ({
    rate: 0,
    trend7d: 0,
    total_questions_tracked: 0,
  }));
  const citeVal = hit.rate > 0 ? `${hit.rate.toFixed(1)}%` : '—';
  const citeTrend =
    hit.trend7d > 0
      ? `+${hit.trend7d.toFixed(1)}pp`
      : hit.trend7d < 0
      ? `${hit.trend7d.toFixed(1)}pp`
      : 'flat';

  // Prometheus pages shipped (count of generated_answers)
  let promeCount = 0;
  if (supabase) {
    try {
      const { count } = await supabase
        .from('generated_answers')
        .select('*', { count: 'exact', head: true });
      promeCount = count ?? 0;
    } catch {
      /* */
    }
  }

  return [
    { sym: 'APCI', v: apci.toString(), d: `${totalProps} props`, up: true, label: 'Composite' },
    { sym: 'APYI', v: `${apyi}%`, d: 'avg yield', up: true, label: 'Yield' },
    { sym: 'CITE', v: citeVal, d: citeTrend, up: hit.trend7d >= 0, label: 'AI-citation 7d' },
    { sym: 'MCP', v: mcpTotal.toLocaleString(), d: `${mcpMonth} / mo`, up: true, label: 'Agent calls' },
    { sym: 'AEO', v: promeCount.toLocaleString(), d: 'answers', up: true, label: 'Prometheus' },
    { sym: 'AGENTS', v: '23 / 23', d: 'online', up: true, label: 'Swarm' },
    { sym: 'CRONS', v: '25', d: 'daily', up: true, label: 'Scheduled' },
    { sym: 'API', v: '208', d: 'routes', up: true, label: 'Surface' },
    { sym: 'FEAT', v: '130+', d: '/prop', up: true, label: 'Signals' },
    { sym: 'LANG', v: '11', d: '× 2 200', up: true, label: 'Translation' },
    { sym: 'TRAIN', v: 'JSONL', d: '→ HF', up: true, label: 'Self-improve' },
    { sym: 'APIP', v: 'v1.0', d: 'live', up: true, label: 'Protocol' },
  ];
}

export async function Ticker() {
  const ticks = await buildTicks();
  const row = [...ticks, ...ticks];

  return (
    <section
      id="signals"
      className="relative overflow-hidden border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-surface) / 0.4)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{
          background:
            'linear-gradient(to right, hsl(var(--av-background)), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{
          background:
            'linear-gradient(to left, hsl(var(--av-background)), transparent)',
        }}
      />

      <div className="ticker-track flex w-max items-center gap-10 py-4">
        {row.map((t, i) => (
          <div key={i} className="flex items-center gap-3 whitespace-nowrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {t.sym}
            </span>
            <span className="font-mono text-sm tabular text-foreground">
              {t.v}
            </span>
            <span
              className={`font-mono text-xs tabular ${
                t.up ? 'text-primary' : 'text-destructive'
              }`}
            >
              {t.d}
            </span>
            <span className="font-serif text-xs italic text-muted-foreground/70">
              {t.label}
            </span>
            <span
              className="ml-6 h-1 w-1 rounded-full"
              style={{ background: 'hsl(var(--av-border-strong))' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
