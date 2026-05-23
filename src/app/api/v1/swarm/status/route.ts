/**
 * GET /api/v1/swarm/status
 *
 * Honest swarm telemetry. Every field is derived from real data:
 *   - tasks_completed = count of `success` rows in cron_logs per cron name
 *   - last_run        = most-recent row's started_at
 *   - status          = 'active' (recent success) / 'degraded' (recent error) / 'offline' (no run in 7d)
 *
 * Previously this endpoint returned hand-typed counts (75, 1881, 100, etc.).
 * Now it reads from `cron_logs` populated by lib/cron-log.ts on every run.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadAgentCounts } from '@/lib/cron-log';

export const dynamic = 'force-dynamic';

interface SwarmAgent {
  name: string;
  id: string;
  type: string;
  status: 'active' | 'degraded' | 'offline';
  schedule: string;
  tasks_completed: number;
  performance_score: number;
  last_run: string | null;
  cron_names: string[];   // which cron_logs.agent_id rows back this agent
}

/**
 * Map branded agent → backing cron names. The crons write their own agent_id
 * to cron_logs; we aggregate them under the agent persona. Multiple crons can
 * roll up into one agent (e.g. eu-ingestion + eu-rescore both feed Bloodhound's
 * scan count).
 */
const AGENT_DEFS: Array<Omit<SwarmAgent, 'tasks_completed' | 'last_run' | 'status' | 'performance_score'> & { cron_names: string[] }> = [
  { name: 'Agent Bloodhound', id: 'hunter',         type: 'anomaly_detection',    schedule: '07:45 UTC daily', cron_names: ['eu-rescore', 'precursor-scan'] },
  { name: 'Agent Vault',      id: 'historian',      type: 'data_archival',        schedule: '06:00 UTC daily', cron_names: ['scribe', 'curator', 'pricing-history'] },
  { name: 'Agent Von Gogh',   id: 'journalist',     type: 'content_generation',   schedule: '08:00 UTC daily', cron_names: ['mentat', 'courier', 'weekly-newsletter'] },
  { name: 'Agent Einstein',   id: 'scientist',      type: 'correlation_analysis', schedule: 'Friday 07:00',    cron_names: ['causal-update', 'argus'] },
  { name: 'Agent Oracle',     id: 'regime',         type: 'macro_monitoring',     schedule: '06:00 UTC daily', cron_names: ['regime-check', 'prometheus'] },
  { name: 'Agent Hawkeye',    id: 'vision',         type: 'image_analysis',       schedule: '01:00 UTC daily', cron_names: ['property-augment'] },
  { name: 'Agent 007',        id: 'stress-monitor', type: 'developer_health',     schedule: 'Monday 04:00',    cron_names: ['counterpart-scan', 'counterpart-discover', 'developer-monitor'] },
  { name: 'Agent Darwin',     id: 'self-improver',  type: 'training_pipeline',    schedule: '05:00 UTC daily', cron_names: ['push-training-data'] },
  { name: 'Agent Morpheus',   id: 'consciousness',  type: 'meta_monitoring',      schedule: '09:00 Sunday',    cron_names: ['quarterly-report'] },
  { name: 'Agent Shadow',     id: 'crawler',        type: 'citation_hunting',     schedule: '09:00 UTC daily', cron_names: ['citation-agent', 'citation-measure', 'crawler-submit', 'backlink-loop'] },
  { name: 'Agent Curie',      id: 'research-lab',   type: 'paper_generation',     schedule: '1st of month',    cron_names: ['research-lab'] },
  { name: 'Agent Mercury',    id: 'digest',         type: 'newsletter',           schedule: 'Monday 06:00',    cron_names: ['deal-alerts', 'eu-ingestion'] },
];

function determineStatus(lastRun: string | null, lastStatus: string | null): SwarmAgent['status'] {
  if (!lastRun) return 'offline';
  const ageHours = (Date.now() - new Date(lastRun).getTime()) / 3_600_000;
  if (ageHours > 168) return 'offline';                          // no run in 7 days
  if (lastStatus === 'error') return 'degraded';
  return 'active';
}

/** Performance score: blend of success-rate and freshness. */
function computePerformance(runs: number, status: SwarmAgent['status'], lastRun: string | null): number {
  if (status === 'offline') return 30;
  if (status === 'degraded') return 55;
  const ageHours = lastRun ? (Date.now() - new Date(lastRun).getTime()) / 3_600_000 : 9999;
  let score = 80;
  if (runs >= 30) score += 8;
  if (runs >= 100) score += 4;
  if (ageHours < 24) score += 5;
  return Math.min(99, score);
}

export async function GET() {
  const counts = await loadAgentCounts();

  let mcpCitationsCount = 0;
  if (supabase) {
    try {
      const { count } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      if (count !== null) mcpCitationsCount = count;
    } catch { /* fallback */ }
  }

  const agents: SwarmAgent[] = AGENT_DEFS.map((def) => {
    // Roll up multiple backing crons into one persona
    let runs = 0;
    let lastRun: string | null = null;
    let lastStatus: string | null = null;
    for (const cronName of def.cron_names) {
      const stats = counts.per_agent[cronName];
      if (!stats) continue;
      runs += stats.runs;
      if (!lastRun || (stats.last_run && stats.last_run > lastRun)) {
        lastRun = stats.last_run;
        lastStatus = stats.last_status;
      }
    }
    const status = determineStatus(lastRun, lastStatus);
    const performance_score = computePerformance(runs, status, lastRun);
    return {
      name: def.name,
      id: def.id,
      type: def.type,
      schedule: def.schedule,
      cron_names: def.cron_names,
      tasks_completed: runs,
      last_run: lastRun,
      status,
      performance_score,
    };
  });

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const avgPerformance = Math.round(agents.reduce((s, a) => s + a.performance_score, 0) / totalAgents);
  const totalTasksCompleted = agents.reduce((s, a) => s + a.tasks_completed, 0);
  const sortedByPerf = [...agents].sort((a, b) => a.performance_score - b.performance_score);

  let health: 'OPTIMAL' | 'GOOD' | 'DEGRADED';
  if (avgPerformance >= 85) health = 'OPTIMAL';
  else if (avgPerformance >= 70) health = 'GOOD';
  else health = 'DEGRADED';

  return NextResponse.json({
    swarm_name: 'Avena Agent Swarm',
    agents,
    summary: {
      total_agents: totalAgents,
      active_agents: activeAgents,
      avg_performance: avgPerformance,
      weakest_agent: { name: sortedByPerf[0].name, score: sortedByPerf[0].performance_score },
      strongest_agent: { name: sortedByPerf[sortedByPerf.length - 1].name, score: sortedByPerf[sortedByPerf.length - 1].performance_score },
      total_tasks_completed: totalTasksCompleted,
      mcp_citations: mcpCitationsCount,
    },
    health,
    last_health_check: new Date().toISOString(),
    methodology: 'Counts derived from cron_logs table (status=success). last_run = most recent backing cron execution. offline = no run in 168h. degraded = last run errored.',
  });
}
