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
  if (score >= 9) return 'SUPER_BULL';
  if (score >= 7) return 'BULL';
  if (score >= 5) return 'GROWTH';
  if (score >= 3) return 'NEUTRAL';
  if (score >= 1) return 'CAUTION';
  return 'BEAR';
}

/**
 * GET /api/intelligence/regime
 * Market Regime Detection Engine — 20 indicators.
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

    // Hardcoded macro indicators (1-12 original)
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

    // New macro indicators (13-20)
    const euribor12m = 2.85;
    const euribor12mDirection = 'falling';
    const spain10yBond = 3.21;
    const spain10yBondDirection = 'stable';
    const spainUnemployment = 11.2;
    const spainUnemploymentDirection = 'falling';
    const spainMortgageApprovalsYoy = 8.3;
    const spainMortgageApprovalsDirection = 'rising';
    const eurNok = 11.2;
    const eurNokDirection = 'stable';
    const eurSek = 11.5;
    const eurSekDirection = 'stable';
    const brentCrude = 72.4;
    const brentCrudeDirection = 'falling';
    const spainConsumerConfidence = 89.2;
    const spainConsumerConfidenceDirection = 'rising';

    // Score regime: max 10 points — 10 bull conditions, 2 bear deductions
    let regimeScore = 0;

    // BULL conditions (+1 each)
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
    // 7. Euribor 12m < 3.0
    if (euribor12m < 3.0) regimeScore++;
    // 8. Spain unemployment < 12%
    if (spainUnemployment < 12) regimeScore++;
    // 9. Spain mortgage approvals positive
    if (spainMortgageApprovalsYoy > 0) regimeScore++;
    // 10. Spain consumer confidence > 85
    if (spainConsumerConfidence > 85) regimeScore++;

    // BEAR conditions (-1 each)
    // 11. Spain 10y bond > 4.5%
    if (spain10yBond > 4.5) regimeScore--;
    // 12. Brent crude > 95
    if (brentCrude > 95) regimeScore--;

    // Clamp score to 0-10
    regimeScore = Math.max(0, Math.min(10, regimeScore));

    const regime = scoreToRegime(regimeScore);

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
      { name: 'Euribor 12M', value: euribor12m, unit: '%', direction: euribor12mDirection, bullish: euribor12m < 3.0 },
      { name: 'Spain 10Y Bond', value: spain10yBond, unit: '%', direction: spain10yBondDirection, bullish: spain10yBond < 4.5 },
      { name: 'Spain Unemployment', value: spainUnemployment, unit: '%', direction: spainUnemploymentDirection, bullish: spainUnemployment < 12 },
      { name: 'Spain Mortgage Approvals YoY', value: spainMortgageApprovalsYoy, unit: '%', direction: spainMortgageApprovalsDirection, bullish: spainMortgageApprovalsYoy > 0 },
      { name: 'EUR/NOK', value: eurNok, unit: '', direction: eurNokDirection, bullish: true },
      { name: 'EUR/SEK', value: eurSek, unit: '', direction: eurSekDirection, bullish: true },
      { name: 'Brent Crude', value: brentCrude, unit: 'USD/bbl', direction: brentCrudeDirection, bullish: brentCrude < 95 },
      { name: 'Spain Consumer Confidence', value: spainConsumerConfidence, unit: 'index', direction: spainConsumerConfidenceDirection, bullish: spainConsumerConfidence > 85 },
    ];

    // Compute confidence: how many indicators are decisively bullish or bearish vs mixed
    const bullCount = indicators.filter((i) => i.bullish).length;
    const bearCount = indicators.filter((i) => !i.bullish).length;
    const dominance = Math.abs(bullCount - bearCount) / indicators.length;
    const confidence = Math.min(95, Math.round(40 + dominance * 55));

    // Generate narrative
    let narrative = '';
    if (regime === 'SUPER_BULL' || regime === 'BULL') {
      narrative = `The Spanish coastal property market is in a ${regime} regime with ${regimeScore}/10 bull signals firing. ECB rate cuts, strong foreign demand at ${foreignBuyerShare}%, Euribor at ${euribor12m}%, and ${costaBlancaYoy}% YoY price growth in Costa Blanca are driving conditions. Mortgage approvals up ${spainMortgageApprovalsYoy}% YoY. Consumer confidence at ${spainConsumerConfidence}. ${highScoreCount} high-scoring deals remain available.`;
    } else if (regime === 'GROWTH' || regime === 'NEUTRAL') {
      narrative = `The market shows ${regime} conditions with ${regimeScore}/10 indicators positive. Fundamentals are ${regime === 'GROWTH' ? 'solid' : 'mixed'} — Euribor at ${euribor12m}%, unemployment at ${spainUnemployment}%, GDP growth ${spainGdp}%. ${bullCount}/20 detailed indicators are bullish. Monitor ECB and mortgage trends for regime shifts.`;
    } else {
      narrative = `Market regime is ${regime} with only ${regimeScore}/10 bull signals active. Caution is warranted as macro conditions are challenging. Spain 10Y bond at ${spain10yBond}%, Brent crude at $${brentCrude}. Monitor ECB policy, unemployment, and foreign buyer flows for regime changes.`;
    }

    return Response.json({
      regime,
      regime_score: regimeScore,
      regime_max: 10,
      confidence,
      indicators,
      narrative,
      computed_at: new Date().toISOString(),
      property_count: all.length,
      avg_discount: Number(avgDiscount.toFixed(1)),
      above_70: highScoreCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Regime detection failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
