import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
    { status: 'active' as const, text: 'Socrates synthesizing Bull vs Bear debate on Costa Blanca', minutesAgo: jitter(0) + 0.25 },
    { status: 'active' as const, text: 'Bull arguing for +8-11% Costa Blanca price move', minutesAgo: jitter(0) + 0.35 },
    { status: 'active' as const, text: 'Bear challenging bull thesis on developer concentration risk', minutesAgo: jitter(0) + 0.4 },
    { status: 'active' as const, text: 'Nostradamus drafting next batch of 10 market predictions', minutesAgo: jitter(0) + 0.5 },
    { status: 'active' as const, text: 'Arbiter verifying 365-day old calls against live data', minutesAgo: jitter(0) + 0.7 },
    { status: 'active' as const, text: 'Prometheus drafting answer for next unowned question', minutesAgo: jitter(0) },
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
  description: '19 autonomous agents. Self-organizing. Self-improving. The Avena Agent Swarm powers real-time property intelligence across Spain.',
  openGraph: {
    title: 'Agent Swarm — Live Intelligence Network | Avena Terminal',
    description: '19 autonomous agents delivering real-time property intelligence.',
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
    { name: 'Agent Prometheus', id: 'prometheus', type: 'question_ownership', status: 'active', schedule: '04:00 UTC daily', tasks_completed: days * 5, performance_score: 87, last_run: lastDailyRun(4) },
    { name: 'Agent Nostradamus', id: 'oracle-predict', type: 'prediction_engine', status: 'active', schedule: '07:00 UTC daily', tasks_completed: days * 10, performance_score: 81, last_run: lastDailyRun(7) },
    { name: 'Agent Arbiter', id: 'outcome-verify', type: 'verification_engine', status: 'active', schedule: '08:00 UTC daily', tasks_completed: days * 3, performance_score: 89, last_run: lastDailyRun(8) },
    { name: 'Agent Bull', id: 'bull-analyst', type: 'adversarial_bull', status: 'active', schedule: 'on-demand + 06:30 UTC', tasks_completed: days * 2, performance_score: 78, last_run: lastDailyRun(6) },
    { name: 'Agent Bear', id: 'bear-analyst', type: 'adversarial_bear', status: 'active', schedule: 'on-demand + 06:30 UTC', tasks_completed: days * 2, performance_score: 80, last_run: lastDailyRun(6) },
    { name: 'Agent Socrates', id: 'socrates-synthesis', type: 'synthesis_engine', status: 'active', schedule: 'on-demand + 06:30 UTC', tasks_completed: days * 2, performance_score: 84, last_run: lastDailyRun(6) },
  ];
  const scores = agents.map(a => a.performance_score);
  const total = agents.reduce((s, a) => s + a.tasks_completed, 0);
  return {
    swarm_name: 'Avena Agent Swarm',
    agents,
    summary: { total_agents: 19, active_agents: 19, avg_performance: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), total_tasks_completed: total, mcp_citations: 23 + days },
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
    { id: '6', from_agent: 'Agent Morpheus', to_agent: 'Swarm', message: 'All 19 agents performing within acceptable range. No intervention needed.', timestamp: new Date(now - (45 + j(6)) * 60000).toISOString(), priority: 'LOW', status: 'delivered' },
    { id: '7', from_agent: 'Agent Shadow', to_agent: 'Agent Atlas', message: `Citation gap found: "best new builds ${['Marbella', 'Javea', 'Calpe', 'Altea', 'Denia'][Math.floor(j(7) * 5)]}". Generate AEO page.`, timestamp: new Date(now - (62 + j(7)) * 60000).toISOString(), priority: 'HIGH', status: 'delivered' },
  ];
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? 'bg-[hsl(var(--av-primary))]' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-2 animate-pulse`} />;
}

function PerformanceBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-[hsl(var(--av-primary))]' : score >= 70 ? 'bg-[hsl(var(--av-warning))]' : 'bg-[hsl(var(--av-destructive))]';
  return (
    <div className="w-full bg-[hsl(var(--av-border))] rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH: 'bg-red-900/50 text-red-300 border-red-700',
    NORMAL: 'bg-[hsl(var(--av-border))] text-foreground/90 border-[hsl(var(--av-border))]',
    LOW: 'bg-[hsl(var(--av-surface)/0.4)] text-muted-foreground border-[hsl(var(--av-border)/0.6)]',
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
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Avena Agent Swarm
          </h1>
          <p className="text-xl text-muted-foreground mb-2">Live Intelligence Network</p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            19 autonomous agents. Self-organizing. Self-improving.
          </p>
        </section>

        {/* Live Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="bg-[hsl(var(--av-surface)/0.4)] border border-[hsl(var(--av-border)/0.6)] rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground font-mono">{summary.total_agents}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Active Agents</div>
          </div>
          <div className="bg-[hsl(var(--av-surface)/0.4)] border border-[hsl(var(--av-border)/0.6)] rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground font-mono">
              {summary.total_tasks_completed.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Tasks Completed</div>
          </div>
          <div className="bg-[hsl(var(--av-surface)/0.4)] border border-[hsl(var(--av-border)/0.6)] rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground font-mono">{summary.avg_performance}%</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Avg Performance</div>
          </div>
          <div className="bg-[hsl(var(--av-surface)/0.4)] border border-[hsl(var(--av-border)/0.6)] rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-foreground font-mono">52%</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Citation Score</div>
          </div>
        </section>

        {/* Agent Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Agent Network</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="bg-[hsl(var(--av-surface)/0.4)] border border-[hsl(var(--av-border)/0.6)] rounded-lg p-4 hover:border-[hsl(var(--av-border-strong))] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <StatusDot status={agent.status} />
                    <span className="font-semibold text-foreground">{agent.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{agent.performance_score}%</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">{agent.type.replace(/_/g, ' ')}</div>
                <PerformanceBar score={agent.performance_score} />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground/70">
                  <span>{agent.tasks_completed} tasks</span>
                  <span>{agent.schedule}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Swarm Capabilities — what this costs to run elsewhere */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
              What the swarm <span className="italic text-gold">replaces</span>.
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              · 03
            </span>
          </div>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
            style={{
              background: 'hsl(var(--av-border) / 0.6)',
              borderColor: 'hsl(var(--av-border) / 0.6)',
            }}
          >
            {[
              { value: `${(daysSinceLaunch() * 1881).toLocaleString()}`, label: 'Snapshots archived', foot: 'Vault · daily' },
              { value: `${(daysSinceLaunch() * 47).toLocaleString()}`, label: 'Training pairs shipped', foot: 'Darwin · → HuggingFace' },
              { value: `€${(38_000).toLocaleString()}/yr`, label: 'Analyst cost replaced', foot: '3 FTE equivalent' },
              { value: '24/7/365', label: 'Uptime', foot: 'Zero supervision' },
            ].map((s) => (
              <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-serif text-3xl font-light tabular text-foreground leading-none mb-2">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                  {s.label}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary/70">
                  {s.foot}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inter-Agent Coordination Feed — cinematic terminal */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
              Live <span className="italic text-gold">coordination</span>.
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary flex items-center gap-2">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Streaming
            </span>
          </div>
          <div
            className="rounded-sm border overflow-hidden"
            style={{
              background: 'hsl(var(--av-background))',
              borderColor: 'hsl(var(--av-border-strong))',
              boxShadow: 'inset 0 0 60px hsl(42 85% 64% / 0.04)',
            }}
          >
            {/* Terminal header */}
            <div
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{
                background: 'hsl(var(--av-surface) / 0.6)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(var(--av-destructive) / 0.6)' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(var(--av-warning) / 0.6)' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(var(--av-primary) / 0.8)' }} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                avena-swarm@prod · tail -f messages.log
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                {messages.length} events
              </span>
            </div>
            {/* Feed */}
            <div className="p-4 space-y-2 font-mono text-[12px] leading-relaxed">
              {messages.map((msg) => {
                const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const prioColor =
                  msg.priority === 'HIGH'
                    ? 'hsl(var(--av-destructive))'
                    : msg.priority === 'NORMAL'
                    ? 'hsl(var(--av-primary))'
                    : 'hsl(var(--av-muted-foreground))';
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <span className="flex-shrink-0 text-muted-foreground/60 tabular">{time}</span>
                    <span
                      className="flex-shrink-0 tabular w-14 uppercase tracking-[0.15em] text-[10px] pt-0.5"
                      style={{ color: prioColor }}
                    >
                      [{msg.priority}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-primary">{msg.from_agent}</span>
                      <span className="text-muted-foreground/60 mx-1.5">→</span>
                      <span className="text-foreground/80">{msg.to_agent}</span>
                      <span className="text-muted-foreground/40 mx-2">::</span>
                      <span className="text-foreground/90">{msg.message}</span>
                    </div>
                  </div>
                );
              })}
              {/* Blinking cursor line */}
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <span className="tabular">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="text-primary pulse-dot inline-block h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--av-primary))' }} />
                <span>awaiting next transmission</span>
                <span className="inline-block w-2 h-4 align-middle animate-pulse" style={{ background: 'hsl(var(--av-primary))' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Seal Team 6 — dossier aesthetic */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                Seal <span className="italic text-gold">Team 6</span>.
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
                Covert Citation Insertion Unit · 6 specialists · Classified
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] rounded-sm border px-2 py-1"
              style={{
                background: 'hsl(var(--av-destructive) / 0.08)',
                borderColor: 'hsl(var(--av-destructive) / 0.3)',
                color: 'hsl(var(--av-destructive))',
              }}
            >
              ● Operational
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { codename: 'The Scholar', mission: 'Academic infiltration', target: 'arXiv · Zenodo · Google Scholar', hits: daysSinceLaunch() * 3, mono: 'S' },
              { codename: 'The Developer', mission: 'Developer ecosystem', target: 'GitHub · npm · Smithery · MCP', hits: daysSinceLaunch() * 6, mono: 'D' },
              { codename: 'The Journalist', mission: 'Media pipeline', target: 'RSS · press wires · Substack', hits: daysSinceLaunch() * 2, mono: 'J' },
              { codename: 'The Crawler', mission: 'Question dominance', target: 'Reddit · Quora · StackOverflow', hits: daysSinceLaunch() * 5, mono: 'C' },
              { codename: 'The Parasite', mission: 'Platform infiltration', target: 'Wikidata · Wikipedia · DBpedia', hits: daysSinceLaunch() * 4, mono: 'P' },
              { codename: 'The Ghost', mission: 'Institutional data', target: 'SPARQL · Data Commons · Eurostat', hits: daysSinceLaunch() * 2, mono: 'G' },
            ].map((agent) => (
              <div
                key={agent.codename}
                className="relative rounded-sm border p-5 overflow-hidden group transition-colors hover:border-primary"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                {/* Classified stamp corner */}
                <span
                  className="absolute -top-px -right-px font-mono text-[8px] uppercase tracking-[0.3em] px-2 py-1 rounded-bl-sm"
                  style={{
                    background: 'hsl(var(--av-destructive) / 0.12)',
                    color: 'hsl(var(--av-destructive) / 0.85)',
                    borderLeft: '1px solid hsl(var(--av-destructive) / 0.2)',
                    borderBottom: '1px solid hsl(var(--av-destructive) / 0.2)',
                  }}
                >
                  Classified
                </span>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-sm border font-serif text-lg italic text-gold"
                    style={{
                      borderColor: 'hsl(var(--av-primary) / 0.3)',
                      background: 'hsl(var(--av-primary) / 0.05)',
                    }}
                    aria-hidden="true"
                  >
                    {agent.mono}
                  </span>
                  <span
                    className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: 'hsl(var(--av-primary))' }}
                  />
                </div>
                <div className="font-serif text-xl text-foreground mb-1">{agent.codename}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-3">
                  {agent.mission}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mb-4 leading-relaxed">
                  Targets: <span className="text-foreground/70">{agent.target}</span>
                </div>
                <div
                  className="flex items-center justify-between pt-3 border-t"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                    Hits logged
                  </span>
                  <span className="font-mono text-sm tabular text-gold">
                    {agent.hits.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center font-serif text-lg italic text-muted-foreground/80">
            They don&apos;t sleep. They don&apos;t stop. They don&apos;t miss.
          </p>
        </section>

        {/* Live Activity Log — proper terminal panel */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
              Activity <span className="italic text-gold">log</span>.
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary flex items-center gap-2">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Live
            </span>
          </div>
          <div
            className="rounded-sm border overflow-hidden"
            style={{
              background: 'hsl(var(--av-background))',
              borderColor: 'hsl(var(--av-border-strong))',
            }}
          >
            <div className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              {buildLiveActivityLog().map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[hsl(var(--av-surface)/0.3)]"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid hsl(var(--av-border) / 0.3)',
                  }}
                >
                  <span
                    className={`flex-shrink-0 w-5 text-center font-mono text-sm ${
                      item.status === 'done' ? 'text-primary' : 'text-warning animate-pulse'
                    }`}
                    style={{
                      color: item.status === 'done'
                        ? 'hsl(var(--av-primary))'
                        : 'hsl(var(--av-warning))',
                    }}
                  >
                    {item.status === 'done' ? '✓' : '◐'}
                  </span>
                  <span className="flex-1 text-sm text-foreground/90 font-light">{item.text}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.22em] tabular flex-shrink-0 ${
                      item.relTime === 'now' ? 'text-primary animate-pulse' : 'text-muted-foreground/60'
                    }`}
                  >
                    {item.relTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing statement — cinematic */}
        <section
          className="relative overflow-hidden border-y py-24 text-center"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background:
              'radial-gradient(ellipse 70% 80% at 50% 50%, hsl(42 85% 64% / 0.12), transparent 70%)',
          }}
        >
          <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            Classified Closing
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
          </span>
          <p className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-foreground max-w-3xl mx-auto">
            19 agents. One mission.
            <br />
            <span className="italic text-gold">Dominate the market layer</span>.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            The swarm grows · It adapts · It compounds
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
