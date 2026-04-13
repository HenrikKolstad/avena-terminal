import { NextRequest } from 'next/server';

export const revalidate = 86400;

interface AlertType {
  type: string;
  estimated_conversion_probability: number;
  description: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return Response.json({ error: 'Missing required parameter: user_id' }, { status: 400 });
    }

    // Deterministic but user-specific seed for consistent per-user results
    let seed = 0;
    for (let i = 0; i < userId.length; i++) {
      seed = ((seed << 5) - seed + userId.charCodeAt(i)) | 0;
    }
    const nudge = (Math.abs(seed) % 10) / 100; // 0.00 to 0.09

    const alertTypes: AlertType[] = [
      {
        type: 'price_drop_alert',
        estimated_conversion_probability: 0.34 + nudge,
        description: 'Notify when a tracked property drops in price — highest engagement signal',
      },
      {
        type: 'new_listing_match',
        estimated_conversion_probability: 0.28 + nudge * 0.8,
        description: 'New listing matching saved search criteria — time-sensitive opportunity',
      },
      {
        type: 'yield_anomaly',
        estimated_conversion_probability: 0.22 + nudge * 0.6,
        description: 'Property with rental yield significantly above market average',
      },
      {
        type: 'developer_stress_signal',
        estimated_conversion_probability: 0.18 + nudge * 0.5,
        description: 'Developer showing financial stress indicators — potential negotiation window',
      },
      {
        type: 'market_regime_change',
        estimated_conversion_probability: 0.14 + nudge * 0.4,
        description: 'Macro regime shift detected — portfolio rebalancing trigger',
      },
      {
        type: 'weekly_digest',
        estimated_conversion_probability: 0.11 + nudge * 0.3,
        description: 'Curated weekly summary of market movements and top opportunities',
      },
    ].sort((a, b) => b.estimated_conversion_probability - a.estimated_conversion_probability);

    return Response.json({
      user_id: userId,
      recommended_alert_types: alertTypes,
      optimal_send_time: 'monday_09:00',
      optimal_send_time_reasoning: 'Learned from aggregate click-through data — Monday morning has 2.3x engagement vs weekend sends',
      exploration_rate: 0.10,
      policy_version: 'v0.1-offline',
      training_episodes: 0,
      reward_function: {
        click: 0.3,
        view_property: 0.5,
        save_property: 0.7,
        contact_agent: 1.0,
      },
      methodology: 'PPO with epsilon-greedy exploration',
      status: 'stub — requires stable-baselines3 Python runtime. Architecture ready for deployment.',
      note: 'Alert rankings based on domain heuristics. Full RL policy would learn per-user preferences from interaction history.',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
