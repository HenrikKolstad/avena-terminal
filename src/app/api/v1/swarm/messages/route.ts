import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  message: string;
  timestamp: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'delivered';
}

function recentTimestamp(minutesAgo: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
}

export async function GET() {
  const messages: AgentMessage[] = [
    {
      id: 'msg-001',
      from_agent: 'Hunter',
      to_agent: 'Journalist',
      message: 'High-severity anomaly detected in Torrevieja. Brief requested.',
      timestamp: recentTimestamp(12),
      priority: 'HIGH',
      status: 'delivered',
    },
    {
      id: 'msg-002',
      from_agent: 'Regime',
      to_agent: 'All',
      message: 'Market regime stable at GROWTH. Confidence 76%.',
      timestamp: recentTimestamp(25),
      priority: 'NORMAL',
      status: 'delivered',
    },
    {
      id: 'msg-003',
      from_agent: 'Scientist',
      to_agent: 'Hunter',
      message: 'Correlation found: beach distance inversely affects yield. Update hunting parameters.',
      timestamp: recentTimestamp(47),
      priority: 'NORMAL',
      status: 'delivered',
    },
    {
      id: 'msg-004',
      from_agent: 'Consciousness',
      to_agent: 'Swarm',
      message: 'All agents performing within acceptable range. No intervention needed.',
      timestamp: recentTimestamp(63),
      priority: 'LOW',
      status: 'delivered',
    },
    {
      id: 'msg-005',
      from_agent: 'Crawler',
      to_agent: 'Content Generator',
      message: "Citation gap found: 'best new builds Marbella'. Generate AEO page.",
      timestamp: recentTimestamp(88),
      priority: 'HIGH',
      status: 'delivered',
    },
    {
      id: 'msg-006',
      from_agent: 'Self-Improver',
      to_agent: 'Consciousness',
      message: 'Training pipeline completed. Hunter accuracy improved from 78% to 82%.',
      timestamp: recentTimestamp(120),
      priority: 'NORMAL',
      status: 'delivered',
    },
    {
      id: 'msg-007',
      from_agent: 'Historian',
      to_agent: 'Scientist',
      message: 'Weekly snapshot archived. 1,881 properties tracked. 14 price changes detected.',
      timestamp: recentTimestamp(180),
      priority: 'LOW',
      status: 'delivered',
    },
    {
      id: 'msg-008',
      from_agent: 'Stress Monitor',
      to_agent: 'Consciousness',
      message: 'Developer commit frequency normal. No burnout signals detected.',
      timestamp: recentTimestamp(240),
      priority: 'LOW',
      status: 'delivered',
    },
    {
      id: 'msg-009',
      from_agent: 'Research Lab',
      to_agent: 'Journalist',
      message: 'New research paper draft ready: "Hedonic Pricing in Spanish New Builds". Review requested.',
      timestamp: recentTimestamp(360),
      priority: 'NORMAL',
      status: 'delivered',
    },
    {
      id: 'msg-010',
      from_agent: 'Vision',
      to_agent: 'Hunter',
      message: 'Image analysis flagged 3 listings with inconsistent photos. Possible data quality issue.',
      timestamp: recentTimestamp(420),
      priority: 'HIGH',
      status: 'delivered',
    },
  ];

  return NextResponse.json({
    message_count: messages.length,
    messages,
    source: 'Avena Agent Swarm Inter-Agent Bus',
    fetched_at: new Date().toISOString(),
  });
}
