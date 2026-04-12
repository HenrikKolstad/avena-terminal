import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

/**
 * GET /api/cron/regime-check
 * Daily cron at 6am. Calls regime detection, stores to regime_history,
 * creates alpha signal if regime changed.
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
    // Call the regime detection endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const res = await fetch(`${baseUrl}/api/intelligence/regime`);
    if (!res.ok) {
      return Response.json({ error: 'Regime endpoint failed' }, { status: 502 });
    }
    const regime = await res.json();

    // Get previous regime from history
    const { data: prev } = await supabase
      .from('regime_history')
      .select('regime')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const previousRegime = prev?.regime || null;
    const regimeChanged = previousRegime !== null && previousRegime !== regime.regime;

    // Store current regime to history
    const { error: insertError } = await supabase.from('regime_history').insert({
      regime: regime.regime,
      regime_score: regime.regime_score,
      confidence: regime.confidence,
      indicators: regime.indicators,
      narrative: regime.narrative,
      property_count: regime.property_count,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to insert regime history:', insertError.message);
    }

    // If regime changed, create an alpha signal
    if (regimeChanged) {
      const { error: signalError } = await supabase.from('alpha_signals').insert({
        signal_type: 'regime_change',
        title: `Regime shift: ${previousRegime} -> ${regime.regime}`,
        description: regime.narrative,
        severity: regime.regime_score <= 2 ? 'high' : 'medium',
        data: {
          from: previousRegime,
          to: regime.regime,
          score: regime.regime_score,
          confidence: regime.confidence,
        },
        created_at: new Date().toISOString(),
      });

      if (signalError) {
        console.error('Failed to create alpha signal:', signalError.message);
      }
    }

    return Response.json({
      regime: regime.regime,
      regime_score: regime.regime_score,
      previous_regime: previousRegime,
      regime_changed: regimeChanged,
      stored: !insertError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regime check cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
