import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/event-store';

export const maxDuration = 60;

/**
 * GET /api/cron/regime-check
 * Daily cron at 6am. Calls regime detection, stores to regime_history,
 * creates alpha signal if regime changed.
 */
export const GET = withCronLog('regime-check', '/api/cron/regime-check', isAuthorizedCron, async () => {
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

    // Event sourcing (Architectural Commitment 1): every regime classification
    // becomes an immutable event regardless of whether the regime changed.
    await recordEvent({
      event_type: regimeChanged ? 'regime.changed' : 'regime.classified',
      aggregate_id: 'spain',
      aggregate_type: 'regime',
      payload: {
        regime: regime.regime,
        regime_score: regime.regime_score,
        confidence: regime.confidence,
        previous_regime: previousRegime,
        property_count: regime.property_count,
      },
      metadata: { source: 'cron/regime-check' },
    });

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

    // The row this job exists to write. Failing to write it is a failed
    // run, not a successful one carrying a false flag.
    if (insertError) {
      return Response.json(
        { error: `regime_history insert failed: ${insertError.message}`, regime: regime.regime, stored: false },
        { status: 500 },
      );
    }

    return Response.json({
      regime: regime.regime,
      regime_score: regime.regime_score,
      previous_regime: previousRegime,
      regime_changed: regimeChanged,
      stored: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regime check cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
});
