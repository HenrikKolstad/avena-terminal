import { NextRequest } from 'next/server';
import { detectAnomalies } from '@/lib/anomaly';
import { supabase } from '@/lib/supabase';
import { pingIndexNow } from '@/lib/indexnow';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const signals = detectAnomalies();
    const date = new Date().toISOString().split('T')[0];

    if (!supabase) {
      return Response.json({ error: 'No Supabase connection' }, { status: 500 });
    }

    // Store signals to Supabase
    const records = signals.slice(0, 20).map(s => ({
      signal_id: s.id,
      type: s.type,
      severity: s.severity,
      headline: s.headline,
      detail: s.detail,
      property_ref: s.property.ref,
      property_name: s.property.name,
      town: s.property.town,
      region: s.property.region,
      price: s.property.price,
      score: s.property.score,
      discount_pct: s.property.discount_pct,
      yield_gross: s.property.yield_gross,
      analysis: s.analysis,
      detected_at: new Date().toISOString(),
    }));

    // Upsert signals (avoid duplicates by signal_id)
    const { error } = await supabase
      .from('alpha_signals')
      .upsert(records, { onConflict: 'signal_id' });

    if (error) {
      console.error('Failed to store signals:', error);
    }

    // Check for subscriber alerts
    const highSignals = signals.filter(s => s.severity === 'high');
    if (highSignals.length > 0) {
      // Fetch subscribers with matching criteria
      const { data: alerts } = await supabase
        .from('deal_alerts')
        .select('*')
        .eq('active', true);

      if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
          const matching = highSignals.filter(s => {
            if (alert.region && alert.region !== 'all' && !s.property.region.toLowerCase().includes(alert.region.toLowerCase())) return false;
            if (alert.max_price && s.property.price > alert.max_price) return false;
            if (alert.min_score && s.property.score < alert.min_score) return false;
            if (alert.property_type && alert.property_type !== 'all' && s.property.type.toLowerCase() !== alert.property_type.toLowerCase()) return false;
            return true;
          });

          if (matching.length > 0) {
            // Store matched alerts for email sending
            await supabase.from('alert_matches').insert(matching.map(m => ({
              alert_id: alert.id,
              user_email: alert.email,
              signal_id: m.id,
              headline: m.headline,
              detail: m.detail,
              property_ref: m.property.ref,
              price: m.property.price,
              score: m.property.score,
              matched_at: new Date().toISOString(),
            })));
          }
        }
      }
    }

    // Ping IndexNow for the signals page
    try {
      await pingIndexNow([`https://avenaterminal.com/intelligence/signals`]);
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      date,
      total_signals: signals.length,
      high: signals.filter(s => s.severity === 'high').length,
      medium: signals.filter(s => s.severity === 'medium').length,
      low: signals.filter(s => s.severity === 'low').length,
      stored: records.length,
    });
  } catch (err) {
    console.error('Anomaly detection error:', err);
    return Response.json({ error: 'Detection failed' }, { status: 500 });
  }
}
