/**
 * GET /api/intelligence/regime — Spain market regime engine.
 *
 * Previously hardcoded all 20 macro indicators as literals. Now pulls live
 * values from ECB SDW (rates, FX) and the causal_indicators table (Spain
 * macro). Each indicator carries a `live: true|false` flag so consumers can
 * see when we're falling back to a literal.
 */
import { getAllProperties, avg } from '@/lib/properties';
import { loadMacroIndicators } from '@/lib/data-sources/macro';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type RegimeLabel = 'SUPER_BULL' | 'BULL' | 'GROWTH' | 'NEUTRAL' | 'CAUTION' | 'BEAR';

function scoreToRegime(score: number): RegimeLabel {
  if (score >= 9) return 'SUPER_BULL';
  if (score >= 7) return 'BULL';
  if (score >= 5) return 'GROWTH';
  if (score >= 3) return 'NEUTRAL';
  if (score >= 1) return 'CAUTION';
  return 'BEAR';
}

export async function GET() {
  try {
    const all = getAllProperties();

    // Live property metrics
    const withPm2 = all.filter((p) => p.pm2 && p.pm2 > 0 && p.mm2 > 0);
    const discounts = withPm2.map((p) => ((p.mm2 - p.pm2!) / p.mm2) * 100);
    const avgDiscount = avg(discounts);
    const scores = all.filter((p) => p._sc != null).map((p) => p._sc!);
    const avgScore = avg(scores);
    const highScoreCount = all.filter((p) => p._sc != null && p._sc >= 70).length;

    // Live macro indicators (ECB SDW + causal_indicators table)
    const macroIndicators = await loadMacroIndicators();

    // Look up specific indicators for scoring
    const find = (n: string) => macroIndicators.find((i) => i.name === n);
    const ecb               = find('ECB Rate');
    const costaBlancaYoy    = find('Costa Blanca YoY');
    const foreignBuyerShare = find('Foreign Buyer Share');
    const spainGdp          = find('Spain GDP');
    const euribor           = find('Euribor 3M');
    const unemployment      = find('Spain Unemployment');
    const mortgageYoy       = find('Spain Mortgage Approvals YoY');
    const consumerConfidence= find('Spain Consumer Confidence');
    const spainBond         = find('Spain 10Y Bond');
    const brent             = find('Brent Crude');

    // Compute regime score (10 bull conditions, 2 bear deductions)
    let regimeScore = 0;
    if (ecb?.direction === 'falling') regimeScore++;
    if ((costaBlancaYoy?.value ?? 0) > 5) regimeScore++;
    if ((foreignBuyerShare?.value ?? 0) > 15) regimeScore++;
    if (avgDiscount > 5) regimeScore++;
    if (highScoreCount > 50) regimeScore++;
    if ((spainGdp?.value ?? 0) > 2) regimeScore++;
    if ((euribor?.value ?? 99) < 3.0) regimeScore++;
    if ((unemployment?.value ?? 99) < 12) regimeScore++;
    if ((mortgageYoy?.value ?? 0) > 0) regimeScore++;
    if ((consumerConfidence?.value ?? 0) > 85) regimeScore++;
    if ((spainBond?.value ?? 0) > 4.5) regimeScore--;
    if ((brent?.value ?? 0) > 95) regimeScore--;

    regimeScore = Math.max(0, Math.min(10, regimeScore));
    const regime = scoreToRegime(regimeScore);

    // Append computed-from-properties indicators
    const indicators = [
      ...macroIndicators,
      { name: 'Avg Discount',     value: Number(avgDiscount.toFixed(1)), unit: '%',          direction: 'computed', bullish: avgDiscount > 5, live: true, source: 'avena.properties', fetched_at: new Date().toISOString() },
      { name: 'Avg Score',        value: Number(avgScore.toFixed(1)),    unit: '/100',       direction: 'computed', bullish: avgScore > 55,   live: true, source: 'avena.properties', fetched_at: new Date().toISOString() },
      { name: 'High Score Count', value: highScoreCount,                  unit: 'properties', direction: 'computed', bullish: highScoreCount > 50, live: true, source: 'avena.properties', fetched_at: new Date().toISOString() },
    ];

    const liveCount  = indicators.filter((i) => i.live).length;
    const totalCount = indicators.length;
    const bullCount  = indicators.filter((i) => i.bullish).length;
    const bearCount  = totalCount - bullCount;
    const dominance  = Math.abs(bullCount - bearCount) / totalCount;
    const confidence = Math.min(95, Math.round(40 + dominance * 55));

    // Narrative uses real values where available
    let narrative: string;
    if (regime === 'SUPER_BULL' || regime === 'BULL') {
      narrative = `The Spanish coastal property market is in a ${regime} regime with ${regimeScore}/10 bull signals firing. ECB rate at ${ecb?.value ?? '—'}% ${ecb?.direction === 'falling' ? '(cutting)' : ''}, foreign demand ${foreignBuyerShare?.value ?? '—'}%, Euribor ${euribor?.value ?? '—'}%, Costa Blanca YoY ${costaBlancaYoy?.value ?? '—'}%. Mortgage approvals ${(mortgageYoy?.value ?? 0) > 0 ? 'up' : 'down'} ${Math.abs(mortgageYoy?.value ?? 0)}%. Consumer confidence ${consumerConfidence?.value ?? '—'}. ${highScoreCount} high-scoring deals available.`;
    } else if (regime === 'GROWTH' || regime === 'NEUTRAL') {
      narrative = `The market shows ${regime} conditions with ${regimeScore}/10 indicators positive. Euribor ${euribor?.value ?? '—'}%, unemployment ${unemployment?.value ?? '—'}%, GDP ${spainGdp?.value ?? '—'}%. ${bullCount}/${totalCount} indicators bullish. Monitor ECB and mortgage trends for regime shifts.`;
    } else {
      narrative = `Market regime is ${regime} with only ${regimeScore}/10 bull signals active. Caution warranted. Spain 10Y bond ${spainBond?.value ?? '—'}%, Brent crude $${brent?.value ?? '—'}. Monitor ECB policy, unemployment, and foreign flows.`;
    }

    // Persist snapshot for the APCI momentum dimension to consume next run
    if (supabase) {
      try {
        await supabase.from('regime_history').insert({
          regime,
          regime_score: regimeScore,
          confidence,
          live_indicators: liveCount,
          total_indicators: totalCount,
          computed_at: new Date().toISOString(),
        });
      } catch { /* table may not exist — non-fatal */ }
    }

    return Response.json({
      regime,
      regime_score: regimeScore,
      regime_max: 10,
      confidence,
      indicators,
      narrative,
      data_freshness: {
        live_indicators: liveCount,
        fallback_indicators: totalCount - liveCount,
        total: totalCount,
      },
      computed_at: new Date().toISOString(),
      property_count: all.length,
      avg_discount: Number(avgDiscount.toFixed(1)),
      above_70: highScoreCount,
      methodology: 'ECB SDW for rates/FX, causal_indicators table for Spain macro, properties dataset for valuation primitives.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regime detection failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
