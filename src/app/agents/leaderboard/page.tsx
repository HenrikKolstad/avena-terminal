import { Metadata } from 'next';
import Link from 'next/link';
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
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#fbbf24', color: '#fbbf24' }}>LEADERBOARD</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Agent Leaderboard</h1>
        <p className="text-gray-400 text-sm mb-8">Top AI agents by query volume &middot; Updated in real-time</p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {agents.length > 0 ? (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">#</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Agent</th>
                  <th className="text-left px-4 py-3 text-xs uppercase text-gray-500">Developer</th>
                  <th className="text-right px-4 py-3 text-xs uppercase text-gray-500">Total Queries</th>
                  <th className="text-right px-4 py-3 text-xs uppercase text-gray-500">This Month</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {agents.map((agent, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-3">
                      {i === 0 ? <span className="text-lg">&#x1F947;</span> : i === 1 ? <span className="text-lg">&#x1F948;</span> : i === 2 ? <span className="text-lg">&#x1F949;</span> : <span className="text-gray-500">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{agent.agent_name}</td>
                    <td className="px-4 py-3 text-gray-400">{agent.developer_name}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{agent.queries_total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{(agent.queries_this_month || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg p-10 text-center" style={{ background: '#161b22', border: '1px dashed #30363d' }}>
            <p className="text-4xl mb-4">&#x1F3C6;</p>
            <p className="text-gray-400 mb-2">Leaderboard is empty</p>
            <p className="text-xs text-gray-600 mb-4">Register your agent and start querying to claim the #1 spot</p>
            <Link href="/agents/registry" className="text-xs px-4 py-2 rounded-lg inline-block" style={{ background: '#10b981', color: '#0d1117' }}>Register Your Agent</Link>
          </div>
        )}

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        <div className="flex flex-wrap gap-3">
          <Link href="/agents/registry" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#10b981', color: '#0d1117' }}>Register Agent</Link>
          <Link href="/agents/directory" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>Full Directory</Link>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; The identity layer for European property AI
        </footer>
      </div>
    </main>
  );
}
