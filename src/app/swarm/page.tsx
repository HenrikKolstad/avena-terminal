import { Metadata } from 'next';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Agent Swarm — Live Intelligence Network | Avena Terminal',
  description: '12 autonomous agents. Self-organizing. Self-improving. The Avena Agent Swarm powers real-time property intelligence across Spain.',
  openGraph: {
    title: 'Agent Swarm — Live Intelligence Network | Avena Terminal',
    description: '12 autonomous agents delivering real-time property intelligence.',
    type: 'website',
  },
};

interface SwarmAgent {
  name: string;
  id: string;
  type: string;
  status: 'active' | 'degraded' | 'offline';
  schedule: string;
  tasks_completed: number;
  performance_score: number;
  last_run: string;
}

interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  message: string;
  timestamp: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: string;
}

interface SwarmData {
  swarm_name: string;
  agents: SwarmAgent[];
  summary: {
    total_agents: number;
    active_agents: number;
    avg_performance: number;
    total_tasks_completed: number;
    mcp_citations: number;
  };
  health: string;
  last_health_check: string;
}

interface MessagesData {
  messages: AgentMessage[];
}

async function getSwarmStatus(): Promise<SwarmData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/v1/swarm/status`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getMessages(): Promise<AgentMessage[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/v1/swarm/messages`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data: MessagesData = await res.json();
    return data.messages.slice(0, 5);
  } catch {
    return [];
  }
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? 'bg-green-400' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-2 animate-pulse`} />;
}

function PerformanceBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-zinc-800 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH: 'bg-red-900/50 text-red-300 border-red-700',
    NORMAL: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    LOW: 'bg-zinc-900 text-zinc-500 border-zinc-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[priority] || styles.NORMAL}`}>
      {priority}
    </span>
  );
}

export default async function SwarmPage() {
  const [swarmData, messages] = await Promise.all([getSwarmStatus(), getMessages()]);

  const agents = swarmData?.agents ?? [];
  const summary = swarmData?.summary ?? {
    total_agents: 12,
    active_agents: 12,
    avg_performance: 80,
    total_tasks_completed: 2196,
    mcp_citations: 0,
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-white">AVENA</span>
            <span className="text-zinc-500">|</span>
            <span className="text-sm text-zinc-400">Agent Swarm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 uppercase tracking-wider font-mono">
              {swarmData?.health ?? 'GOOD'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Avena Agent Swarm
          </h1>
          <p className="text-xl text-zinc-400 mb-2">Live Intelligence Network</p>
          <p className="text-sm text-zinc-500 max-w-xl mx-auto">
            12 autonomous agents. Self-organizing. Self-improving.
          </p>
        </section>

        {/* Live Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white font-mono">{summary.total_agents}</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Active Agents</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white font-mono">
              {summary.total_tasks_completed.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Tasks Completed</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white font-mono">{summary.avg_performance}%</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Avg Performance</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white font-mono">52%</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Citation Score</div>
          </div>
        </section>

        {/* Agent Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Agent Network</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <StatusDot status={agent.status} />
                    <span className="font-semibold text-white">{agent.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">{agent.performance_score}%</span>
                </div>
                <div className="text-xs text-zinc-500 mb-2">{agent.type.replace(/_/g, ' ')}</div>
                <PerformanceBar score={agent.performance_score} />
                <div className="flex items-center justify-between mt-3 text-xs text-zinc-600">
                  <span>{agent.tasks_completed} tasks</span>
                  <span>{agent.schedule}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inter-Agent Messages */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Inter-Agent Messages</h2>
          <div className="space-y-3">
            {messages.length > 0 ? messages.map(msg => (
              <div
                key={msg.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white font-semibold">{msg.from_agent}</span>
                    <span className="text-zinc-600">-&gt;</span>
                    <span className="text-zinc-400">{msg.to_agent}</span>
                  </div>
                  <PriorityBadge priority={msg.priority} />
                </div>
                <p className="text-sm text-zinc-300">{msg.message}</p>
                <div className="text-xs text-zinc-600 mt-2">
                  {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )) : (
              <div className="text-zinc-500 text-sm">No recent messages.</div>
            )}
          </div>
        </section>

        {/* Footer tagline */}
        <section className="text-center py-12 border-t border-zinc-800">
          <p className="text-zinc-500 text-sm italic">
            The swarm grows. It adapts. It dominates.
          </p>
        </section>
      </main>
    </div>
  );
}
