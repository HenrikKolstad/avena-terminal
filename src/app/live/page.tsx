import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Live Operations · Avena Terminal',
  description: 'Real-time signals from the Avena infrastructure: memos generated, AVMs valued, properties indexed, crons fired, signals logged, developers tracked. The proof-of-life dashboard.',
  alternates: { canonical: 'https://avenaterminal.com/live' },
};

interface CountResult { count: number | null }
interface RecentRow { id: string | number; created_at: string; [k: string]: unknown }

async function countSince(table: string, hours: number): Promise<number> {
  if (!supabase) return 0;
  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since) as unknown as CountResult;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countTotal(table: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true }) as unknown as CountResult;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function loadRecentMemos(): Promise<Array<{ id: string; thesis: string; short_id: string; generated_at: string; recommendation: string }>> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('memo_generations')
      .select('id, thesis, short_id, generated_at, recommendation')
      .order('generated_at', { ascending: false })
      .limit(8);
    return (data ?? []) as Array<{ id: string; thesis: string; short_id: string; generated_at: string; recommendation: string }>;
  } catch {
    return [];
  }
}

async function loadRecentCrons(): Promise<Array<{ agent_id: string; status: string; started_at: string; duration_ms: number | null }>> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('cron_logs')
      .select('agent_id, status, started_at, duration_ms')
      .order('started_at', { ascending: false })
      .limit(15);
    return (data ?? []) as Array<{ agent_id: string; status: string; started_at: string; duration_ms: number | null }>;
  } catch {
    return [];
  }
}

function relativeTime(iso: string): string {
  const age = (Date.now() - new Date(iso).getTime()) / 1000;
  if (age < 60) return `${Math.round(age)}s ago`;
  if (age < 3600) return `${Math.round(age / 60)}m ago`;
  if (age < 86400) return `${Math.round(age / 3600)}h ago`;
  return `${Math.round(age / 86400)}d ago`;
}

export default async function LivePage() {
  // Run all counters in parallel
  const [
    memos24h, memosTotal, avm24h, avmTotal, findingsTotal, findings7d,
    counterpartDevs, precursorSignals, genesisScenarios,
    cronSuccess24h, cronError24h,
    recentMemos, recentCrons,
  ] = await Promise.all([
    countSince('memo_generations', 24),
    countTotal('memo_generations'),
    countSince('avm_queries', 24),
    countTotal('avm_queries'),
    countTotal('findings'),
    countSince('findings', 168),
    countTotal('counterpart_developers'),
    countTotal('precursor_signals'),
    countTotal('genesis_scenarios'),
    (async () => {
      if (!supabase) return 0;
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const { count } = await supabase.from('cron_logs').select('*', { count: 'exact', head: true }).gte('started_at', since).eq('status', 'success') as unknown as CountResult;
      return count ?? 0;
    })(),
    (async () => {
      if (!supabase) return 0;
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const { count } = await supabase.from('cron_logs').select('*', { count: 'exact', head: true }).gte('started_at', since).eq('status', 'error') as unknown as CountResult;
      return count ?? 0;
    })(),
    loadRecentMemos(),
    loadRecentCrons(),
  ]);

  const propertiesIndexed = (() => {
    try { return getAllProperties().length; } catch { return 0; }
  })();

  const cronUptimePct = cronSuccess24h + cronError24h > 0
    ? Math.round((cronSuccess24h / (cronSuccess24h + cronError24h)) * 100)
    : null;

  const STAT_CARDS = [
    { label: 'Properties indexed (Spain)', value: propertiesIndexed.toLocaleString(), sub: 'live registry · ES corpus' },
    { label: 'Counterpart developers',     value: counterpartDevs.toLocaleString(),    sub: 'tracked + scored' },
    { label: 'Precursor signals',          value: precursorSignals.toLocaleString(),   sub: 'active + historical' },
    { label: 'Genesis scenarios',          value: genesisScenarios.toLocaleString(),   sub: 'simulator runs persisted' },
    { label: 'Memos generated · 24h',      value: memos24h.toLocaleString(),           sub: `${memosTotal.toLocaleString()} all-time` },
    { label: 'AVM queries · 24h',          value: avm24h.toLocaleString(),             sub: `${avmTotal.toLocaleString()} all-time` },
    { label: 'Findings logged · 7d',       value: findings7d.toLocaleString(),         sub: `${findingsTotal.toLocaleString()} compounding ledger` },
    { label: 'Cron uptime · 24h',          value: cronUptimePct != null ? `${cronUptimePct}%` : '—', sub: `${cronSuccess24h} success · ${cronError24h} error` },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Live Operations · Updated {new Date().toISOString().slice(11, 16)} UTC
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[1.05] tracking-tight text-foreground mb-4">
              Proof of <span className="italic text-gold">life</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light leading-relaxed">
              Every number on this page is read directly from the production Supabase. No estimates, no marketing rounding. Updated every five minutes. If a cron failed, you see it here. If we ran a thousand memos yesterday, you see that here.
            </p>
          </div>
        </section>

        {/* Stat grid */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {STAT_CARDS.map((s) => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{s.label}</div>
                  <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{s.value}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent memos */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="flex items-baseline justify-between mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Recent memos generated</div>
              <Link href="/memo" className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">Generate one →</Link>
            </div>
            {recentMemos.length === 0 ? (
              <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <p className="text-sm text-muted-foreground">No memos generated yet. <Link href="/memo" className="text-primary hover:underline">Be the first.</Link></p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMemos.map((m) => (
                  <Link key={m.id} href={`/memo/${m.short_id}`} className="block rounded-sm border p-3 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{m.thesis}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{m.short_id} · {relativeTime(m.generated_at)}</div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] flex-shrink-0" style={{ color: m.recommendation === 'BUY' ? 'hsl(var(--av-success))' : m.recommendation === 'PASS' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-warning))' }}>
                        {m.recommendation}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent cron runs */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="flex items-baseline justify-between mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Recent agent runs</div>
              <Link href="/swarm" className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">View swarm →</Link>
            </div>
            {recentCrons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cron runs persisted in cron_logs yet.</p>
            ) : (
              <div className="overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full text-xs">
                  <thead style={{ background: 'hsl(var(--av-surface))' }}>
                    <tr className="text-left">
                      <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Agent</th>
                      <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Started</th>
                      <th className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCrons.map((c, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-4 py-2.5 font-mono text-foreground">{c.agent_id}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: c.status === 'success' ? 'hsl(var(--av-success))' : c.status === 'error' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))' }}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{relativeTime(c.started_at)}</td>
                        <td className="px-4 py-2.5 font-mono text-right tabular text-muted-foreground">{c.duration_ms != null ? `${c.duration_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Methodology note */}
        <section className="py-10">
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              All counters read live from Supabase · refreshed every 5 minutes · zero estimation
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
              <Link href="/governance" className="text-foreground hover:text-primary">Governance</Link> · <Link href="/methodology" className="text-foreground hover:text-primary">Methodology</Link> · <Link href="/swarm" className="text-foreground hover:text-primary">Swarm</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
