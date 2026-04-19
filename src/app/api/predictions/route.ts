/**
 * GET  /api/predictions — list predictions, filterable
 *   ?status=active|verified|pending|all (default: active)
 *   ?submitter=avena|xyz
 *   ?limit=N (max 500, default 100)
 *
 * POST /api/predictions — external submission (status: 'pending' until reviewed)
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'active';
  const submitter = req.nextUrl.searchParams.get('submitter');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);

  if (!supabase) {
    return Response.json({ predictions: [], count: 0, note: 'supabase unavailable' });
  }

  try {
    let q = supabase
      .from('predictions')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (status && status !== 'all') q = q.eq('status', status);
    if (submitter) q = q.eq('submitter', submitter);
    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json(
      {
        predictions: data || [],
        count: data?.length ?? 0,
        source: 'Avena Terminal Prediction Ledger',
        doi: '10.5281/zenodo.19520064',
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = [
      'submitter',
      'target',
      'metric',
      'current_value',
      'predicted_value',
      'predicted_change_pct',
      'confidence',
      'reasoning',
    ];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return Response.json({ error: `missing field: ${k}` }, { status: 400 });
      }
    }

    const submitter = String(body.submitter).trim().toLowerCase();
    if (submitter === 'avena') {
      return Response.json({ error: 'submitter name "avena" is reserved' }, { status: 403 });
    }
    if (!supabase) return Response.json({ error: 'supabase unavailable' }, { status: 503 });

    const confidence = Math.max(0, Math.min(100, Math.round(Number(body.confidence))));
    const predictedChangePct = Number(Number(body.predicted_change_pct).toFixed(2));
    const horizonDays = Math.max(30, Math.min(730, parseInt(body.horizon_days || 365, 10)));
    const submitterType = body.submitter_type === 'ai_system' ? 'ai_system' : 'analyst';

    const { data, error } = await supabase
      .from('predictions')
      .insert({
        prediction_type: String(body.prediction_type || 'market_call'),
        target: String(body.target).slice(0, 200),
        metric: String(body.metric).slice(0, 100),
        current_value: Number(body.current_value),
        predicted_value: Number(body.predicted_value),
        predicted_change_pct: predictedChangePct,
        confidence,
        horizon_days: horizonDays,
        reasoning: String(body.reasoning).slice(0, 2000),
        submitter,
        submitter_type: submitterType,
        status: 'pending',
        verify_at: new Date(Date.now() + horizonDays * 86400_000).toISOString(),
      })
      .select('id')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Seed leaderboard row so challengers appear in the roster
    try {
      await supabase.from('prediction_leaderboard').upsert(
        {
          submitter_name: submitter,
          submitter_type: submitterType,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'submitter_name', ignoreDuplicates: true }
      );
    } catch { /* silent */ }

    return Response.json({
      ok: true,
      id: data?.id,
      status: 'pending',
      note: 'Submission received. Appears on the challenger ledger after review.',
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
