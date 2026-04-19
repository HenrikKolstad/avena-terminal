import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agent Directory — Registered AI Agents | Avena Terminal',
  description: 'Public directory of AI agents registered with Avena Terminal Agent Registry. See which agents are using European property data for investment analysis.',
  alternates: { canonical: 'https://avenaterminal.com/agents/directory' },
};

export default async function AgentDirectoryPage() {
  let agents: { agent_name: string; developer_name: string; use_case: string; queries_total: number; registered_at: string; website: string }[] = [];
  let totalAgents = 0;

  if (supabase) {
    const { data, count } = await supabase
      .from('agent_registry')
      .select('agent_name, developer_name, use_case, queries_total, registered_at, website', { count: 'exact' })
      .eq('active', true)
      .order('queries_total', { ascending: false });
    if (data) agents = data;
    totalAgents = count || 0;
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
                Directory · {totalAgents} registered
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Every agent.
                <br />
                <span className="italic text-gold">Public record</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                {totalAgents} registered AI agent{totalAgents !== 1 ? 's' : ''} using Avena Terminal for European property intelligence.
                Updated in real-time. <Link href="/agents/registry" className="text-primary underline-offset-4 hover:underline">Register your agent →</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            {agents.length > 0 ? (
              <div className="grid gap-3">
                {agents.map((agent, i) => (
                  <div key={i} className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-serif text-xl text-foreground">{agent.agent_name}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">by {agent.developer_name}</p>
                      </div>
                      <span className="font-mono text-sm tabular text-primary">{agent.queries_total.toLocaleString()} queries</span>
                    </div>
                    {agent.use_case && <p className="text-sm text-muted-foreground font-light mb-3">{agent.use_case}</p>}
                    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                      <span>Registered {new Date(agent.registered_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                      {agent.website && <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">{agent.website.replace('https://', '')}</a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-sm border p-12 text-center" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)', borderStyle: 'dashed' }}>
                <p className="font-serif text-2xl text-foreground mb-3">No agents registered yet.</p>
                <p className="text-sm text-muted-foreground font-light mb-6">Be the first to register your AI agent with the European property data layer.</p>
                <Link
                  href="/agents/registry"
                  className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Register now →
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
