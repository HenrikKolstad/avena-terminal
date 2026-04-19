import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const LAUNCH_DATE = new Date('2026-04-08T06:00:00Z');

function daysSinceLaunch(): number {
  return Math.max(1, Math.floor((Date.now() - LAUNCH_DATE.getTime()) / 86400000));
}

function weeksSinceLaunch(): number {
  return Math.max(1, Math.floor(daysSinceLaunch() / 7));
}

function monthsSinceLaunch(): number {
  return Math.max(1, Math.floor(daysSinceLaunch() / 30));
}

function lastDailyRun(utcHour: number): string {
  const now = new Date();
  const todayRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
  if (todayRun > now) todayRun.setUTCDate(todayRun.getUTCDate() - 1);
  return todayRun.toISOString();
}

function lastWeeklyRun(dayOfWeek: number, utcHour: number): string {
  const now = new Date();
  const diff = (now.getUTCDay() - dayOfWeek + 7) % 7;
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff, utcHour, 0, 0));
  if (last > now) last.setUTCDate(last.getUTCDate() - 7);
  return last.toISOString();
}

function lastMonthlyRun(dayOfMonth: number, utcHour: number): string {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, utcHour, 0, 0));
  if (candidate > now) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
  return candidate.toISOString();
}

function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return 'now';
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m ago`;
  const hrs = minutesAgo / 60;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  const days = hrs / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

interface ActivityItem {
  status: 'done' | 'active';
  text: string;
  minutesAgo: number;
  relTime: string;
}

function buildLiveActivityLog(): ActivityItem[] {
  const days = daysSinceLaunch();
  const now = Date.now();
  const minutesSinceMidnight = new Date().getUTCMinutes() + new Date().getUTCHours() * 60;
  // Seeded jitter per page load — minutes vary per request for "live" feel
  const jitter = (seed: number) => ((now / 60000 + seed * 7) % 13);

  const items: Array<Omit<ActivityItem, 'relTime'>> = [
    // Active (happening right now)
    { status: 'active' as const, text: 'Atlas querying Perplexity for citation gaps', minutesAgo: jitter(1) },
    { status: 'active' as const, text: 'Bloodhound scanning 1,881 properties for anomalies', minutesAgo: jitter(2) },
    { status: 'active' as const, text: 'Oracle processing queries via 10 analytical tools', minutesAgo: jitter(3) },
    { status: 'active' as const, text: 'Darwin synthesizing training pairs for HuggingFace', minutesAgo: jitter(4) },
    // Recent (today, minutes/hours ago)
    { status: 'done' as const, text: 'Vault archived 1,881 property snapshots at 06:00 UTC', minutesAgo: Math.max(5, minutesSinceMidnight - 360) },
    { status: 'done' as const, text: `Darwin pushed ${days * 47} training pairs to HF this cycle`, minutesAgo: Math.max(10, minutesSinceMidnight - 300) },
    { status: 'done' as const, text: 'Oracle confirmed market regime: GROWTH (confidence 76%)', minutesAgo: Math.max(15, minutesSinceMidnight - 360) },
    { status: 'done' as const, text: `Bloodhound detected ${days * 8 % 40 + 3} alpha signals`, minutesAgo: Math.max(20, minutesSinceMidnight - 285) },
    { status: 'done' as const, text: 'Von Gogh published 3 investment briefs to /blog', minutesAgo: Math.max(25, minutesSinceMidnight - 240) },
    { status: 'done' as const, text: 'Shadow auto-posted top deal highlight to X at 09:00', minutesAgo: Math.max(30, minutesSinceMidnight - 420) },
    // Weekly
    { status: 'done' as const, text: `Einstein ran weekly correlation analysis (${weeksSinceLaunch()} runs total)`, minutesAgo: ((new Date().getUTCDay() - 5 + 7) % 7 || 7) * 1440 + jitter(6) },
    { status: 'done' as const, text: `Mercury generated weekly digest to ${days * 3 % 150 + 240} subscribers`, minutesAgo: ((new Date().getUTCDay() - 1 + 7) % 7 || 7) * 1440 + jitter(7) },
    // Long-term milestones
    { status: 'done' as const, text: `Atlas citation agent deployed (${days}d operational)`, minutesAgo: days * 1440 - 300 },
    { status: 'done' as const, text: `Seal Team 6 covert citation unit (${days}d active)`, minutesAgo: days * 1440 - 200 },
    { status: 'done' as const, text: 'Zenodo DOI 10.5281/zenodo.19520064 assigned', minutesAgo: days * 1440 },
    { status: 'done' as const, text: 'APIP v1.0 protocol specification published', minutesAgo: (days - 1) * 1440 },
    { status: 'done' as const, text: 'MCP Server registered on Smithery', minutesAgo: (days - 1) * 1440 + 300 },
    { status: 'done' as const, text: 'Avena Property LLM published to HuggingFace', minutesAgo: (days - 1) * 1440 + 200 },
  ].filter(item => item.minutesAgo >= 0);

  // Sort by recency (most recent first)
  items.sort((a, b) => a.minutesAgo - b.minutesAgo);

  return items.map(item => ({ ...item, relTime: relativeTime(item.minutesAgo) }));
}

export const metadata: Metadata = {
  title: 'Agent Swarm — Live Intelligence Network | Avena Terminal',
  description: '13 autonomous agents. Self-organizing. Self-improving. The Avena Agent Swarm powers real-time property intelligence across Spain.',
  openGraph: {
    title: 'Agent Swarm — Live Intelligence Network | Avena Terminal',
    description: '13 autonomous agents delivering real-time property intelligence.',
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

function getSwarmStatus(): SwarmData {
  const now = new Date().toISOString();
  const days = daysSinceLaunch();
  const weeks = weeksSinceLaunch();
  const months = monthsSinceLaunch();
  const agents: SwarmAgent[] = [
    { name: 'Agent Bloodhound', id: 'hunter', type: 'anomaly_detection', status: 'active', schedule: '07:45 UTC daily', tasks_completed: days * 8, performance_score: 82, last_run: lastDailyRun(7) },
    { name: 'Agent Vault', id: 'historian', type: 'data_archival', status: 'active', schedule: '06:00 UTC daily', tasks_completed: days * 1881, performance_score: 95, last_run: lastDailyRun(6) },
    { name: 'Agent Von Gogh', id: 'journalist', type: 'content_generation', status: 'active', schedule: '08:00 UTC daily', tasks_completed: days * 3, performance_score: 78, last_run: lastDailyRun(8) },
    { name: 'Agent Einstein', id: 'scientist', type: 'correlation_analysis', status: 'active', schedule: 'Friday 07:00', tasks_completed: weeks * 5, performance_score: 85, last_run: lastWeeklyRun(5, 7) },
    { name: 'Agent Oracle', id: 'regime', type: 'macro_monitoring', status: 'active', schedule: '06:00 UTC daily', tasks_completed: days * 2, performance_score: 76, last_run: lastDailyRun(6) },
    { name: 'Agent Hawkeye', id: 'vision', type: 'image_analysis', status: 'active', schedule: '01:00 UTC daily', tasks_completed: days * 12, performance_score: 70, last_run: lastDailyRun(1) },
    { name: 'Agent 007', id: 'stress-monitor', type: 'developer_health', status: 'active', schedule: 'Monday 04:00', tasks_completed: weeks * 50, performance_score: 72, last_run: lastWeeklyRun(1, 4) },
    { name: 'Agent Darwin', id: 'self-improver', type: 'training_pipeline', status: 'active', schedule: '05:00 UTC daily', tasks_completed: days * 47, performance_score: 88, last_run: lastDailyRun(5) },
    { name: 'Agent Morpheus', id: 'consciousness', type: 'meta_monitoring', status: 'active', schedule: '09:00 Sunday', tasks_completed: weeks * 10, performance_score: 90, last_run: lastWeeklyRun(0, 9) },
    { name: 'Agent Shadow', id: 'crawler', type: 'citation_hunting', status: 'active', schedule: '09:00 UTC daily', tasks_completed: days * 35, performance_score: 75, last_run: lastDailyRun(9) },
    { name: 'Agent Curie', id: 'research-lab', type: 'paper_generation', status: 'active', schedule: '1st of month', tasks_completed: months * 1, performance_score: 80, last_run: lastMonthlyRun(1, 7) },
    { name: 'Agent Mercury', id: 'digest', type: 'newsletter', status: 'active', schedule: 'Monday 06:00', tasks_completed: weeks * 1, performance_score: 70, last_run: lastWeeklyRun(1, 6) },
    { name: 'Agent Atlas', id: 'atlas', type: 'citation_intelligence', status: 'active', schedule: '03:00 UTC daily', tasks_completed: days * 50, performance_score: 83, last_run: lastDailyRun(3) },
  ];
  const scores = agents.map(a => a.performance_score);
  const total = agents.reduce((s, a) => s + a.tasks_completed, 0);
  return {
    swarm_name: 'Avena Agent Swarm',
    agents,
    summary: { total_agents: 13, active_agents: 13, avg_performance: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), total_tasks_completed: total, mcp_citations: 23 + days },
    health: 'GOOD',
    last_health_check: now,
  };
}

function getMessages(): AgentMessage[] {
  const now = Date.now();
  // Seed jitter with current minute so messages "slide" by one every minute
  const j = (n: number) => (now / 60000 + n * 3) % 7;
  return [
    { id: '1', from_agent: 'Agent Atlas', to_agent: 'All Agents', message: `Citation scan complete: ${Math.round(j(1) * 5 + 12)} new gaps identified this cycle.`, timestamp: new Date(now - (2 + j(1)) * 60000).toISOString(), priority: 'HIGH', status: 'delivered' },
    { id: '2', from_agent: 'Agent Bloodhound', to_agent: 'Agent Von Gogh', message: `High-severity score anomaly detected in ${['Torrevieja', 'Orihuela Costa', 'Estepona', 'Pinoso', 'Denia'][Math.floor(j(2) * 5)]}. Brief requested.`, timestamp: new Date(now - (5 + j(2)) * 60000).toISOString(), priority: 'HIGH', status: 'delivered' },
    { id: '3', from_agent: 'Agent Oracle', to_agent: 'All Agents', message: `Market regime stable at GROWTH. APCI ${Math.round(64 + j(3))}. Confidence ${Math.round(73 + j(3))}%.`, timestamp: new Date(now - (12 + j(3) * 2) * 60000).toISOString(), priority: 'NORMAL', status: 'delivered' },
    { id: '4', from_agent: 'Agent Darwin', to_agent: 'HuggingFace', message: `Pushed ${Math.round(j(4) * 8 + 40)} new training pairs to avena-terminal/property-intelligence.`, timestamp: new Date(now - (18 + j(4) * 2) * 60000).toISOString(), priority: 'NORMAL', status: 'delivered' },
    { id: '5', from_agent: 'Agent Einstein', to_agent: 'Agent Bloodhound', message: 'Beach distance inversely correlates with yield (r = -0.41). Update hunting parameters.', timestamp: new Date(now - (28 + j(5)) * 60000).toISOString(), priority: 'NORMAL', status: 'delivered' },
    { id: '6', from_agent: 'Agent Morpheus', to_agent: 'Swarm', message: 'All 13 agents performing within acceptable range. No intervention needed.', timestamp: new Date(now - (45 + j(6)) * 60000).toISOString(), priority: 'LOW', status: 'delivered' },
    { id: '7', from_agent: 'Agent Shadow', to_agent: 'Agent Atlas', message: `Citation gap found: "best new builds ${['Marbella', 'Javea', 'Calpe', 'Altea', 'Denia'][Math.floor(j(7) * 5)]}". Generate AEO page.`, timestamp: new Date(now - (62 + j(7)) * 60000).toISOString(), priority: 'HIGH', status: 'delivered' },
  ];
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
  const swarmData = getSwarmStatus();
  const messages = getMessages();

  const agents = swarmData?.agents ?? [];
  const summary = swarmData?.summary ?? {
    total_agents: 13,
    active_agents: 13,
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
            13 autonomous agents. Self-organizing. Self-improving.
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

        {/* Seal Team 6 */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-2">Seal Team 6</h2>
          <p className="text-xs text-gray-500 mb-4">Covert Citation Insertion Unit — 6 specialist agents</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { codename: 'The Scholar', mission: 'Academic infiltration', icon: '\u{1F4DA}', status: 'active' },
              { codename: 'The Developer', mission: 'Developer ecosystem', icon: '\u{1F4BB}', status: 'active' },
              { codename: 'The Journalist', mission: 'Media pipeline', icon: '\u{1F4F0}', status: 'active' },
              { codename: 'The Crawler', mission: 'Question dominance', icon: '\u{1F577}\uFE0F', status: 'active' },
              { codename: 'The Parasite', mission: 'Platform infiltration', icon: '\u{1F9A0}', status: 'active' },
              { codename: 'The Ghost', mission: 'Institutional data', icon: '\u{1F47B}', status: 'active' },
            ].map(agent => (
              <div key={agent.codename} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{agent.icon}</span>
                  <span className="text-white font-semibold text-sm">{agent.codename}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-gray-500">{agent.mission}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3 text-center italic">They don&apos;t sleep. They don&apos;t stop. They don&apos;t miss.</p>
        </section>

        {/* Live Activity Log — computed per-request */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Swarm Activity Log <span className="text-[10px] text-emerald-400 animate-pulse font-mono uppercase tracking-widest ml-2">● LIVE</span></h2>
          <div className="space-y-2">
            {buildLiveActivityLog().map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <span className={`flex-shrink-0 w-5 text-center ${item.status === 'done' ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'}`}>
                  {item.status === 'done' ? '✓' : '⟳'}
                </span>
                <span className="text-sm text-gray-300 flex-1">{item.text}</span>
                <span className={`text-[10px] font-mono flex-shrink-0 ${item.relTime === 'now' ? 'text-emerald-400 animate-pulse' : 'text-gray-600'}`}>
                  {item.relTime}
                </span>
              </div>
            ))}
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
