/**
 * GET /api/predictions/[id] — single prediction + outcome if verified
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) return Response.json({ error: 'supabase unavailable' }, { status: 503 });

  try {
    const { data: pred, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!pred) return Response.json({ error: 'not found' }, { status: 404 });

    let outcome = null;
    if (pred.status === 'verified') {
      const { data } = await supabase
        .from('prediction_outcomes')
        .select('*')
        .eq('prediction_id', id)
        .maybeSingle();
      outcome = data || null;
    }

    return Response.json(
      { prediction: pred, outcome },
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
