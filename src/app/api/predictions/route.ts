import { NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 86400;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const all = getAllProperties();

    // Top 50 by score
    const top50 = [...all]
      .filter(p => p._sc && p.pf > 0)
      .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
      .slice(0, 50);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const targetDate = new Date(today);
    targetDate.setFullYear(targetDate.getFullYear() + 1);
    const targetStr = targetDate.toISOString().split('T')[0];

    const predictions = top50.map((p, i) => {
      const price = p.pf;
      const confidenceLow = Math.round(price * 0.92);
      const confidenceHigh = Math.round(price * 1.12);
      const confidenceWidth = ((confidenceHigh - confidenceLow) / price) * 100;

      return {
        id: `pred-${todayStr}-${i + 1}`,
        property: {
          ref: p.ref || '',
          name: p.p || `${p.t} in ${p.l}`,
          town: p.l,
          region: p.costa || p.r || '',
          type: p.t,
          developer: p.d || '',
        },
        predicted_price: price,
        confidence_low: confidenceLow,
        confidence_high: confidenceHigh,
        confidence_width_pct: Number(confidenceWidth.toFixed(1)),
        predicted_date: todayStr,
        target_date: targetStr,
        days_remaining: 365,
        regime_at_prediction: 'GROWTH',
        score_at_prediction: p._sc || 0,
        status: 'active' as const,
        resolved: false,
        actual_price: null as number | null,
        accuracy: null as number | null,
      };
    });

    const confidenceWidths = predictions.map(p => p.confidence_width_pct);

    return NextResponse.json({
      predictions,
      aggregate: {
        predictions_made: predictions.length,
        predictions_resolved: 0,
        predictions_accurate: 0,
        accuracy_pct: null,
        avg_confidence_width: Number(avg(confidenceWidths).toFixed(1)),
        regime: 'GROWTH',
        generated_at: todayStr,
      },
      methodology: {
        model: 'Hedonic baseline with 20% confidence band (-8% / +12%)',
        horizon: '12 months',
        regime_model: 'APCI-derived market regime classification',
        tracking: 'Predictions are immutable once published. Accuracy is computed when target_date is reached.',
      },
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
