import { Metadata } from 'next';
import Link from 'next/link';
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
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>DIRECTORY</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Agent Directory</h1>
        <p className="text-gray-400 text-sm mb-2">
          {totalAgents} registered AI agent{totalAgents !== 1 ? 's' : ''} using Avena Terminal for European property intelligence
        </p>
        <p className="text-xs text-gray-600 font-mono mb-8">Updated in real-time &middot; <Link href="/agents/registry" className="text-emerald-400 hover:underline">Register your agent</Link></p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {agents.length > 0 ? (
          <div className="space-y-3">
            {agents.map((agent, i) => (
              <div key={i} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold">{agent.agent_name}</h3>
                    <p className="text-xs text-gray-500">by {agent.developer_name}</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">{agent.queries_total.toLocaleString()} queries</span>
                </div>
                {agent.use_case && <p className="text-sm text-gray-400 mb-2">{agent.use_case}</p>}
                <div className="flex items-center gap-3 text-[10px] text-gray-600">
                  <span>Registered {new Date(agent.registered_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                  {agent.website && <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{agent.website.replace('https://', '')}</a>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg p-10 text-center" style={{ background: '#161b22', border: '1px dashed #30363d' }}>
            <p className="text-gray-400 mb-2">No agents registered yet</p>
            <p className="text-xs text-gray-600 mb-4">Be the first to register your AI agent with the European property data layer</p>
            <Link href="/agents/registry" className="text-xs px-4 py-2 rounded-lg inline-block" style={{ background: '#10b981', color: '#0d1117' }}>Register Now</Link>
          </div>
        )}

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; The identity layer for European property AI
        </footer>
      </div>
    </main>
  );
}
