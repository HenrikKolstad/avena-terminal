import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agent Leaderboard — Top AI Agents | Avena Terminal',
  description: 'Leaderboard of the most active AI agents using Avena Terminal for European property intelligence. Ranked by query volume and activity.',
  alternates: { canonical: 'https://avenaterminal.com/agents/leaderboard' },
};

export default async function AgentLeaderboardPage() {
  let agents: { agent_name: string; developer_name: string; queries_total: number; queries_this_month: number; use_case: string; registered_at: string }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from('agent_registry')
      .select('agent_name, developer_name, queries_total, queries_this_month, use_case, registered_at')
      .eq('active', true)
      .order('queries_total', { ascending: false })
      .limit(25);
    if (data) agents = data;
  }

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Leaderboard · Live
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Top agents.
                <br />
                <span className="italic text-gold">Ranked by usage</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                The most active AI agents using Avena Terminal for European property intelligence. Ranked by query volume. Updated in real-time.
              </p>
            </div>
          </div>
        </section>

        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            {agents.length > 0 ? (
              <div className="overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>#</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Agent</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Developer</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-primary border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Total Queries</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>This Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 py-4">
                          {i === 0 ? <span className="text-xl">🥇</span> : i === 1 ? <span className="text-xl">🥈</span> : i === 2 ? <span className="text-xl">🥉</span> : <span className="text-muted-foreground">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-4 font-serif text-base text-foreground">{agent.agent_name}</td>
                        <td className="px-4 py-4 text-muted-foreground">{agent.developer_name}</td>
                        <td className="px-4 py-4 text-right text-primary tabular">{agent.queries_total.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-foreground/80 tabular">{(agent.queries_this_month || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-sm border p-12 text-center" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)', borderStyle: 'dashed' }}>
                <p className="font-serif text-2xl text-foreground mb-3">Leaderboard is empty.</p>
                <p className="text-sm text-muted-foreground font-light mb-6">Register your agent and start querying to claim the #1 spot.</p>
                <Link
                  href="/agents/registry"
                  className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Register your agent →
                </Link>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/agents/registry"
                className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold hover:-translate-y-0.5 transition-transform"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Register agent →
              </Link>
              <Link
                href="/agents/directory"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Full directory
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
