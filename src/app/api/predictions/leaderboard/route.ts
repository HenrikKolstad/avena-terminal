/**
 * GET /api/predictions/leaderboard — all submitters ranked by avg_accuracy desc
 */

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return Response.json({ leaderboard: [], count: 0, note: 'supabase unavailable' });
  }

  try {
    const { data, error } = await supabase
      .from('prediction_leaderboard')
      .select('*')
      .order('avg_accuracy', { ascending: false })
      .order('verified_predictions', { ascending: false })
      .order('total_predictions', { ascending: false })
      .limit(200);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json(
      {
        leaderboard: data || [],
        count: data?.length ?? 0,
        source: 'Avena Terminal Prediction Ledger',
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}
