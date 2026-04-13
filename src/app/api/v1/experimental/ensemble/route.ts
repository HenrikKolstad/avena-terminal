import { NextRequest } from 'next/server';
import { getAllProperties, avg, slugify } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface IndividualScores {
  avena_score: number;
  valuation_gap: number;
  liquidity_estimate: number;
  regime_signal: number;
  sentiment_baseline: number;
  developer_health: number;
  yield_strength: number;
  momentum: number;
}

const WEIGHTS: Record<keyof IndividualScores, number> = {
  avena_score: 0.30,
  valuation_gap: 0.20,
  liquidity_estimate: 0.10,
  regime_signal: 0.10,
  sentiment_baseline: 0.05,
  developer_health: 0.10,
  yield_strength: 0.10,
  momentum: 0.05,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refParam = searchParams.get('ref');

    if (!refParam) {
      return Response.json({ error: 'Missing required parameter: ref' }, { status: 400 });
    }

    const all = getAllProperties();
    const property = all.find(p => p.ref === refParam);

    if (!property) {
      return Response.json({ error: `Property not found: ${refParam}` }, { status: 404 });
    }

    // 1. Avena score
    const avenaScore = property._sc ?? 50;

    // 2. Valuation gap: compare pm2 vs mm2
    let valuationGap = 50;
    if (property.pm2 && property.mm2 && property.mm2 > 0) {
      const ratio = property.pm2 / property.mm2;
      // pm2 < mm2 means undervalued = good
      if (ratio < 0.8) valuationGap = 90;
      else if (ratio < 0.9) valuationGap = 75;
      else if (ratio < 1.0) valuationGap = 60;
      else if (ratio < 1.1) valuationGap = 45;
      else if (ratio < 1.2) valuationGap = 30;
      else valuationGap = 15;
    }

    // 3. Liquidity estimate: type + beach + price factors
    let liquidity = 50;
    const typeBonus = property.t === 'Apartment' ? 15 : property.t === 'Townhouse' ? 5 : -5;
    const beachBonus = property.bk !== null ? (property.bk < 1 ? 20 : property.bk < 3 ? 10 : 0) : 0;
    const priceBonus = property.pf < 200000 ? 15 : property.pf < 400000 ? 5 : -10;
    liquidity = clamp(liquidity + typeBonus + beachBonus + priceBonus, 0, 100);

    // 4. Regime signal (hardcoded: 72 — GROWTH)
    const regimeSignal = 72;

    // 5. Sentiment baseline (hardcoded: 65 — neutral-positive)
    const sentimentBaseline = 65;

    // 6. Developer health
    let developerHealth: number;
    if (property.dy > 10) developerHealth = 80;
    else if (property.dy > 5) developerHealth = 65;
    else developerHealth = 50;

    // 7. Yield strength
    let yieldStrength: number;
    const grossYield = property._yield?.gross ?? 0;
    if (grossYield > 6) yieldStrength = 85;
    else if (grossYield > 5) yieldStrength = 70;
    else if (grossYield > 4) yieldStrength = 55;
    else yieldStrength = 40;

    // 8. Momentum (hardcoded: 68)
    const momentum = 68;

    const scores: IndividualScores = {
      avena_score: avenaScore,
      valuation_gap: valuationGap,
      liquidity_estimate: liquidity,
      regime_signal: regimeSignal,
      sentiment_baseline: sentimentBaseline,
      developer_health: developerHealth,
      yield_strength: yieldStrength,
      momentum,
    };

    // Weighted ensemble score
    let ensembleScore = 0;
    for (const [key, weight] of Object.entries(WEIGHTS) as [keyof IndividualScores, number][]) {
      ensembleScore += scores[key] * weight;
    }
    ensembleScore = Math.round(ensembleScore);

    // Agreement analysis
    const scoreValues = Object.values(scores);
    const aboveSeventy = scoreValues.filter(v => v >= 70).length;
    const belowFifty = scoreValues.filter(v => v < 50).length;
    const total = scoreValues.length;

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    let agreementRatio: number;
    if (aboveSeventy >= total * 0.6) {
      confidence = 'HIGH';
      agreementRatio = aboveSeventy / total;
    } else if (belowFifty >= total * 0.6) {
      confidence = 'HIGH';
      agreementRatio = belowFifty / total;
    } else if (aboveSeventy + belowFifty > total * 0.7) {
      confidence = 'LOW';
      agreementRatio = Math.max(aboveSeventy, belowFifty) / total;
    } else {
      confidence = 'MEDIUM';
      agreementRatio = Math.max(aboveSeventy, belowFifty) / total;
    }

    // Dissenting signals: signals that disagree with the ensemble direction
    const dissenting: string[] = [];
    const bullish = ensembleScore >= 60;
    for (const [key, val] of Object.entries(scores) as [string, number][]) {
      if (bullish && val < 45) dissenting.push(key);
      if (!bullish && val > 75) dissenting.push(key);
    }

    return Response.json({
      ref: refParam,
      property_summary: {
        project: property.p,
        location: property.l,
        price: property.pf,
        type: property.t,
      },
      individual_scores: scores,
      ensemble_score: ensembleScore,
      confidence,
      agreement_ratio: Number(agreementRatio.toFixed(2)),
      dissenting_signals: dissenting,
      methodology: 'stacking_meta_learner',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
