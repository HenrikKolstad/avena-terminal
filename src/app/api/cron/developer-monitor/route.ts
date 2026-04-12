import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

/**
 * GET /api/cron/developer-monitor
 * Weekly cron Monday 4am. Calls stress monitor, stores to developer_stress_history.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabase) {
    return Response.json({ error: 'No Supabase' }, { status: 503 });
  }

  try {
    // Call the stress monitor endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const res = await fetch(`${baseUrl}/api/developer/stress-monitor`);
    if (!res.ok) {
      return Response.json({ error: 'Stress monitor endpoint failed' }, { status: 502 });
    }
    const data = await res.json();

    // Store snapshot to developer_stress_history
    const { error: insertError } = await supabase.from('developer_stress_history').insert({
      market_health: data.market_health,
      total_developers: data.total_developers,
      flagged_count: data.flagged.length,
      flagged_developers: data.flagged,
      top_stressed: data.developers.slice(0, 10).map((d: { developer: string; stress_score: number; level: string }) => ({
        developer: d.developer,
        stress_score: d.stress_score,
        level: d.level,
      })),
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to insert developer stress history:', insertError.message);
    }

    return Response.json({
      stored: !insertError,
      market_health: data.market_health,
      total_developers: data.total_developers,
      flagged_count: data.flagged.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Developer monitor cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
