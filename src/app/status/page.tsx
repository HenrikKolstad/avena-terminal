import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { DataFreshness } from '@/components/v2/DataFreshness';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'System Status — Avena Terminal',
  description: 'Live health of Avena Terminal data pipelines, AI integrations, and terminal commands.',
  alternates: { canonical: 'https://avenaterminal.com/status' },
};

interface HealthRow {
  command: string;
  endpoint: string;
  ok: boolean;
  status: number | null;
  duration_ms: number | null;
  checked_at: string;
}

interface CronSummary {
  agent_id: string;
  runs_24h: number;
  last_run: string | null;
  last_status: string | null;
}

async function loadHealth(): Promise<HealthRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('command_health')
      .select('command, endpoint, ok, status, duration_ms, checked_at')
      .order('checked_at', { ascending: false })
      .limit(50);
    return (data ?? []) as HealthRow[];
  } catch {
    return [];
  }
}

async function loadCronSummary(): Promise<CronSummary[]> {
  if (!supabase) return [];
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from('cron_logs')
      .select('agent_id, status, started_at')
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(2000);

    const per: Record<string, CronSummary> = {};
    for (const r of data ?? []) {
      const a = (r.agent_id as string) || 'unknown';
      if (!per[a]) per[a] = { agent_id: a, runs_24h: 0, last_run: null, last_status: null };
      if (r.status === 'success') per[a].runs_24h++;
      if (!per[a].last_run) {
        per[a].last_run = r.started_at as string;
        per[a].last_status = r.status as string;
      }
    }
    return Object.values(per).sort((a, b) => a.agent_id.localeCompare(b.agent_id));
  } catch {
    return [];
  }
}

export default async function StatusPage() {
  const [health, cron] = await Promise.all([loadHealth(), loadCronSummary()]);

  // Dedupe health by command, keep latest
  const latestPerCommand = new Map<string, HealthRow>();
  for (const h of health) {
    if (!latestPerCommand.has(h.command)) latestPerCommand.set(h.command, h);
  }
  const current = Array.from(latestPerCommand.values());
  const healthy = current.filter((h) => h.ok).length;
  const total = current.length;
  const allHealthy = total > 0 && healthy === total;
  const cronActive = cron.filter((c) => c.runs_24h > 0).length;

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="pulse-dot h-1.5 w-1.5 rounded-full"
                style={{ background: allHealthy ? 'hsl(var(--av-primary))' : 'hsl(var(--av-warning))' }}
              />
              System status
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              {allHealthy ? (
                <>All systems <span className="italic text-gold">operational</span>.</>
              ) : total === 0 ? (
                <>Live health <span className="italic text-gold">coming online</span>.</>
              ) : (
                <><span className="italic text-gold">Degraded</span> — {total - healthy} check failing.</>
              )}
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <DataFreshness label="Status check" updatedAt={new Date()} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {healthy}/{total || '—'} commands healthy · {cronActive} agents active 24h
              </span>
            </div>
          </div>
        </section>

        {/* Terminal commands */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Terminal <span className="italic text-gold">commands</span>.
            </h2>
            {current.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Agent Mentat has not fired yet — first health run at 02:15 UTC.
              </p>
            ) : (
              <div
                className="overflow-hidden rounded-sm border"
                style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Command</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Endpoint</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Status</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.map((h) => (
                      <tr key={h.command} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 py-3 text-foreground">{h.command}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[360px]">{h.endpoint}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className="font-mono text-[10px] uppercase tracking-[0.22em]"
                            style={{ color: h.ok ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))' }}
                          >
                            {h.ok ? 'OK' : 'FAIL'}{h.status ? ` · ${h.status}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{h.duration_ms != null ? `${h.duration_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Agent runs (24h) */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Agents <span className="italic text-gold">24h window</span>.
            </h2>
            {cron.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                No cron executions recorded in the last 24h.
              </p>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {cron.map((c) => (
                  <div
                    key={c.agent_id}
                    className="rounded-sm border p-4"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-serif text-base text-foreground capitalize">{c.agent_id}</div>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.22em]"
                        style={{
                          color:
                            c.last_status === 'success' ? 'hsl(var(--av-primary))' :
                            c.last_status === 'error' ? 'hsl(var(--av-destructive))' :
                            'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {c.last_status ?? '—'}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
                      {c.runs_24h} runs · last{' '}
                      {c.last_run
                        ? new Date(c.last_run).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Incidents? Email <a href="mailto:henrik@avenaterminal.com" className="text-primary hover:text-gold">henrik@avenaterminal.com</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
