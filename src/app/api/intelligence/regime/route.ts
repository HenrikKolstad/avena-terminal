import { getAllProperties, avg } from '@/lib/properties';

export const maxDuration = 60;

interface Indicator {
  name: string;
  value: number;
  unit: string;
  direction: string;
  bullish: boolean;
}

type RegimeLabel = 'SUPER_BULL' | 'BULL' | 'GROWTH' | 'NEUTRAL' | 'CAUTION' | 'BEAR';

function scoreToRegime(score: number): RegimeLabel {
  if (score >= 6) return 'SUPER_BULL';
  if (score >= 4) return 'BULL';
  if (score === 3) return 'GROWTH';
  if (score === 2) return 'NEUTRAL';
  if (score === 1) return 'CAUTION';
  return 'BEAR';
}

/**
 * GET /api/intelligence/regime
 * Market Regime Detection Engine.
 */
export async function GET() {
  try {
    const all = getAllProperties();

    // Compute live metrics from property data
    const withPm2 = all.filter((p) => p.pm2 && p.pm2 > 0 && p.mm2 > 0);
    const discounts = withPm2.map((p) => ((p.mm2 - p.pm2!) / p.mm2) * 100);
    const avgDiscount = avg(discounts);

    const scores = all.filter((p) => p._sc != null).map((p) => p._sc!);
    const avgScore = avg(scores);

    const highScoreCount = all.filter((p) => p._sc != null && p._sc >= 70).length;

    const dealVelocity = 830; // new listings per week (hardcoded)

    // Hardcoded macro indicators
    const ecbRate = 2.40;
    const ecbDirection = 'falling';
    const eurGbp = 0.856;
    const eurGbp30dChange = -0.012;
    const spainInflation = 2.8;
    const spainInflationTrend = 'falling';
    const spainGdp = 2.9;
    const spainGdpTrend = 'stable';
    const costaBlancaYoy = 9.4;
    const costaBlancaTrend = 'rising';
    const foreignBuyerShare = 19.3;
    const foreignBuyerTrend = 'rising';
    const alicanteTransYoy = 7.1;
    const alicanteTrend = 'stable';
    const newSupplyYoy = 12.4;
    const newSupplyTrend = 'rising';

    // Score regime: 6 bull conditions, each +1 point
    let regimeScore = 0;

    // 1. ECB rate falling (accommodative monetary policy)
    if (ecbDirection === 'falling') regimeScore++;

    // 2. Costa Blanca YoY price growth > 5%
    if (costaBlancaYoy > 5) regimeScore++;

    // 3. Foreign buyer share > 15%
    if (foreignBuyerShare > 15) regimeScore++;

    // 4. Average discount > 5% (deals available)
    if (avgDiscount > 5) regimeScore++;

    // 5. High-score properties > 50
    if (highScoreCount > 50) regimeScore++;

    // 6. Spain GDP growth > 2%
    if (spainGdp > 2) regimeScore++;

    const regime = scoreToRegime(regimeScore);
    const confidence = Math.min(95, 50 + regimeScore * 8);

    const indicators: Indicator[] = [
      { name: 'ECB Rate', value: ecbRate, unit: '%', direction: ecbDirection, bullish: ecbDirection === 'falling' },
      { name: 'EUR/GBP', value: eurGbp, unit: '', direction: `30d: ${eurGbp30dChange}`, bullish: eurGbp30dChange < 0 },
      { name: 'Spain Inflation', value: spainInflation, unit: '%', direction: spainInflationTrend, bullish: spainInflationTrend === 'falling' },
      { name: 'Spain GDP', value: spainGdp, unit: '%', direction: spainGdpTrend, bullish: spainGdp > 2 },
      { name: 'Costa Blanca YoY', value: costaBlancaYoy, unit: '%', direction: costaBlancaTrend, bullish: costaBlancaYoy > 5 },
      { name: 'Foreign Buyer Share', value: foreignBuyerShare, unit: '%', direction: foreignBuyerTrend, bullish: foreignBuyerShare > 15 },
      { name: 'Alicante Transactions YoY', value: alicanteTransYoy, unit: '%', direction: alicanteTrend, bullish: alicanteTransYoy > 0 },
      { name: 'New Supply YoY', value: newSupplyYoy, unit: '%', direction: newSupplyTrend, bullish: newSupplyYoy > 0 },
      { name: 'Avg Discount', value: Number(avgDiscount.toFixed(1)), unit: '%', direction: 'computed', bullish: avgDiscount > 5 },
      { name: 'Avg Score', value: Number(avgScore.toFixed(1)), unit: '/100', direction: 'computed', bullish: avgScore > 55 },
      { name: 'High Score Count', value: highScoreCount, unit: 'properties', direction: 'computed', bullish: highScoreCount > 50 },
      { name: 'Deal Velocity', value: dealVelocity, unit: 'new/week', direction: 'hardcoded', bullish: dealVelocity > 500 },
    ];

    // Generate narrative
    const bullCount = indicators.filter((i) => i.bullish).length;
    let narrative = '';
    if (regime === 'SUPER_BULL' || regime === 'BULL') {
      narrative = `The Spanish coastal property market is in a ${regime} regime with ${regimeScore}/6 bull signals firing. ECB rate cuts, strong foreign demand at ${foreignBuyerShare}%, and ${costaBlancaYoy}% YoY price growth in Costa Blanca are driving conditions. ${highScoreCount} high-scoring deals remain available.`;
    } else if (regime === 'GROWTH') {
      narrative = `The market shows GROWTH conditions with ${regimeScore}/6 indicators positive. Fundamentals are solid but some headwinds exist. ${bullCount}/12 detailed indicators are bullish.`;
    } else {
      narrative = `Market regime is ${regime} with only ${regimeScore}/6 bull signals active. Caution is warranted as macro conditions are mixed. Monitor ECB policy and foreign buyer flows for regime changes.`;
    }

    return Response.json({
      regime,
      regime_score: regimeScore,
      confidence,
      indicators,
      narrative,
      computed_at: new Date().toISOString(),
      property_count: all.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regime detection failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
