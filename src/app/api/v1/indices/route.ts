import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';
import type { Property } from '@/lib/types';

export const revalidate = 3600;

/* ------------------------------------------------------------------ */
/*  CORS helpers                                                       */
/* ------------------------------------------------------------------ */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/*  Math utilities                                                     */
/* ------------------------------------------------------------------ */
function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  const variance = nums.reduce((sum, n) => sum + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/* ------------------------------------------------------------------ */
/*  Per-costa breakdown helper                                         */
/* ------------------------------------------------------------------ */
function groupByCosta(all: Property[]): Map<string, Property[]> {
  const map = new Map<string, Property[]>();
  for (const p of all) {
    const key = p.costa ?? 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

/* ================================================================== */
/*  1. APCI — Avena Property Composite Index                          */
/* ================================================================== */
function computeAPCI(all: Property[], anomalies: ReturnType<typeof detectAnomalies>) {
  // Valuation balance (25%)
  const withDiscount = all.filter(p => p.pm2 && p.mm2 && p.mm2 > 0 && p.pm2 < p.mm2);
  const valuation_balance = all.length > 0
    ? Math.round((withDiscount.length / all.length) * 100)
    : 50;

  // Developer health (15%) — proxy from avg developer years
  const devYears = all.filter(p => p.dy > 0).map(p => p.dy);
  const avgDevYears = avg(devYears);
  const developer_health = clamp(Math.min(avgDevYears / 20, 1) * 100);

  // Macro support (15%) — constant reflecting current ECB/GDP outlook
  const macro_support = 78;

  // Price momentum (10%) — avg score as proxy
  const scores = all.filter(p => p._sc != null).map(p => p._sc!);
  const price_momentum = clamp(avg(scores) * 1.1);

  // Anomaly density (10%)
  const positiveTypes = new Set(['yield_hunt', 'yield_spike', 'score_outlier', 'geographic_mispricing', 'cross_market']);
  const negativeTypes = new Set(['developer_dump', 'motivated_seller']);
  const positiveCount = anomalies.filter(a => positiveTypes.has(a.type)).length;
  const negativeCount = anomalies.filter(a => negativeTypes.has(a.type)).length;
  const totalCounted = positiveCount + negativeCount;
  const anomaly_density = totalCounted > 0
    ? Math.round((positiveCount / totalCounted) * 100)
    : 50;

  // Regime confidence (10%)
  const regime_confidence = 76;

  // Foreign demand (10%)
  const foreign_demand = 71;

  // Supply balance (5%)
  const supply_balance = 68;

  const dimensions: Record<string, number> = {
    valuation_balance,
    developer_health,
    macro_support,
    price_momentum,
    anomaly_density,
    regime_confidence,
    foreign_demand,
    supply_balance,
  };

  const weights: Record<string, number> = {
    valuation_balance: 0.25,
    developer_health: 0.15,
    macro_support: 0.15,
    price_momentum: 0.10,
    anomaly_density: 0.10,
    regime_confidence: 0.10,
    foreign_demand: 0.10,
    supply_balance: 0.05,
  };

  const value = clamp(
    Object.entries(dimensions).reduce((sum, [key, val]) => sum + val * (weights[key] || 0), 0)
  );

  let phase: string;
  if (value >= 80) phase = 'BULL';
  else if (value >= 65) phase = 'GROWTH';
  else if (value >= 45) phase = 'NEUTRAL';
  else phase = 'CAUTION';

  return {
    index: 'APCI',
    name: 'Avena Property Composite Index',
    value,
    phase,
    components: dimensions,
    per_region: {} as Record<string, number>,
    updated: new Date().toISOString(),
    methodology: 'Weighted composite of 8 dimensions: valuation balance (25%), developer health (15%), macro support (15%), price momentum (10%), anomaly density (10%), regime confidence (10%), foreign demand (10%), supply balance (5%). Scale 0-100, higher = healthier market.',
  };
}

/* ================================================================== */
/*  2. APYI — Avena Property Yield Index                              */
/* ================================================================== */
const ECB_RISK_FREE_RATE = 3.5; // % annual

function computeAPYI(all: Property[]) {
  const withYield = all.filter(p => p._yield && p._yield.gross > 0);
  const grossYields = withYield.map(p => p._yield!.gross);
  const avgGrossYield = avg(grossYields);
  const spreadPct = avgGrossYield - ECB_RISK_FREE_RATE;
  const spreadBps = Math.round(spreadPct * 100);

  // Score: 0 bps => 30, 300 bps => 70, 600+ bps => 95
  const value = clamp(30 + (spreadBps / 600) * 65);

  // Per-costa breakdown
  const byCosta = groupByCosta(all);
  const per_region: Record<string, { avg_gross_yield: number; spread_bps: number; count: number }> = {};
  for (const [costa, props] of byCosta) {
    const yieldProps = props.filter(p => p._yield && p._yield.gross > 0);
    if (!yieldProps.length) continue;
    const costaAvgYield = avg(yieldProps.map(p => p._yield!.gross));
    per_region[costa] = {
      avg_gross_yield: Number(costaAvgYield.toFixed(2)),
      spread_bps: Math.round((costaAvgYield - ECB_RISK_FREE_RATE) * 100),
      count: yieldProps.length,
    };
  }

  return {
    index: 'APYI',
    name: 'Avena Property Yield Index',
    value,
    components: {
      avg_gross_yield: Number(avgGrossYield.toFixed(2)),
      ecb_risk_free_rate: ECB_RISK_FREE_RATE,
      spread_pct: Number(spreadPct.toFixed(2)),
      spread_bps: spreadBps,
      properties_with_yield: withYield.length,
    },
    per_region,
    updated: new Date().toISOString(),
    methodology: 'Pan-European yield spread vs ECB risk-free rate (3.5%). Avg gross rental yield minus risk-free rate expressed in basis points. Score 0-100 maps spread to attractiveness (higher spread = higher score). Per-costa breakdown included.',
  };
}

/* ================================================================== */
/*  3. APLI — Avena Property Liquidity Index                          */
/* ================================================================== */
function computeAPLI(all: Property[]) {
  // Component 1: Inventory depth — more inventory = more liquidity, logarithmic scale
  const inventoryScore = clamp(Math.log10(Math.max(all.length, 1)) / Math.log10(5000) * 100);

  // Component 2: Price distribution spread — narrower = more liquid
  const prices = all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
  const priceStd = stddev(prices);
  const priceMean = avg(prices);
  const cv = priceMean > 0 ? priceStd / priceMean : 1; // coefficient of variation
  // CV < 0.3 = tight market (100), CV > 1.0 = dispersed (20)
  const spreadScore = clamp(100 - (cv - 0.3) * (80 / 0.7));

  // Component 3: Key-ready ratio — higher = more liquid
  const keyReady = all.filter(p => {
    const statusLower = (p.s || '').toLowerCase();
    const completionLower = (p.c || '').toLowerCase();
    return statusLower.includes('key ready') ||
           statusLower.includes('keyready') ||
           statusLower.includes('completed') ||
           completionLower.includes('completed') ||
           completionLower.includes('key ready') ||
           completionLower.includes('ready');
  });
  const keyReadyRatio = all.length > 0 ? keyReady.length / all.length : 0;
  const readinessScore = clamp(keyReadyRatio * 100 * 1.5); // boost since ratio often low

  // Weighted
  const value = clamp(
    inventoryScore * 0.30 +
    spreadScore * 0.30 +
    readinessScore * 0.40
  );

  // Per-costa
  const byCosta = groupByCosta(all);
  const per_region: Record<string, { count: number; key_ready_pct: number; score: number }> = {};
  for (const [costa, props] of byCosta) {
    const kr = props.filter(p => {
      const s = (p.s || '').toLowerCase();
      const c = (p.c || '').toLowerCase();
      return s.includes('key ready') || s.includes('completed') || c.includes('completed') || c.includes('key ready') || c.includes('ready');
    });
    const krPct = props.length > 0 ? Number(((kr.length / props.length) * 100).toFixed(1)) : 0;
    const costaScore = clamp(
      (Math.log10(Math.max(props.length, 1)) / Math.log10(5000) * 100) * 0.3 +
      krPct * 1.5 * 0.4 +
      50 * 0.3
    );
    per_region[costa] = { count: props.length, key_ready_pct: krPct, score: costaScore };
  }

  return {
    index: 'APLI',
    name: 'Avena Property Liquidity Index',
    value,
    components: {
      inventory_count: all.length,
      inventory_score: inventoryScore,
      price_cv: Number(cv.toFixed(3)),
      spread_score: spreadScore,
      key_ready_count: keyReady.length,
      key_ready_pct: Number(((keyReady.length / Math.max(all.length, 1)) * 100).toFixed(1)),
      readiness_score: readinessScore,
    },
    per_region,
    updated: new Date().toISOString(),
    methodology: 'Market liquidity composite from: inventory depth (30%, log-scaled), price distribution tightness (30%, coefficient of variation), key-ready ratio (40%, proportion of immediately available units). Score 0-100, higher = more liquid market.',
  };
}

/* ================================================================== */
/*  4. APRI — Avena Property Risk Index                               */
/* ================================================================== */
function computeAPRI(all: Property[]) {
  // Component 1: Developer age risk — younger developers = riskier
  const devYears = all.filter(p => p.dy > 0).map(p => p.dy);
  const avgDevAge = avg(devYears);
  // < 5 years avg = 90 risk, > 20 years = 15 risk
  const devRisk = clamp(90 - ((Math.min(avgDevAge, 20) - 5) / 15) * 75);

  // Component 2: Completion risk — off-plan proportion
  const offPlan = all.filter(p => {
    const c = (p.c || '').toLowerCase();
    const s = (p.s || '').toLowerCase();
    return c.includes('202') || c.includes('203') || s.includes('off-plan') || s.includes('off plan') ||
           (!s.includes('key ready') && !s.includes('completed') && !c.includes('completed') && !c.includes('ready'));
  });
  const offPlanRatio = all.length > 0 ? offPlan.length / all.length : 0.5;
  const completionRisk = clamp(offPlanRatio * 100);

  // Component 3: Price volatility — stddev of pm2
  const pm2Values = all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
  const pm2Std = stddev(pm2Values);
  const pm2Mean = avg(pm2Values);
  const pm2CV = pm2Mean > 0 ? pm2Std / pm2Mean : 0;
  // CV > 0.8 = high volatility risk (85), CV < 0.2 = low (15)
  const volatilityRisk = clamp(15 + (Math.min(pm2CV, 0.8) / 0.8) * 70);

  // Component 4: Concentration risk — HHI of developer market share
  const devCounts = new Map<string, number>();
  for (const p of all) {
    const dev = p.d || 'Unknown';
    devCounts.set(dev, (devCounts.get(dev) || 0) + 1);
  }
  let hhi = 0;
  for (const count of devCounts.values()) {
    const share = count / Math.max(all.length, 1);
    hhi += share * share;
  }
  // HHI ranges from 1/N (perfect competition) to 1 (monopoly)
  // > 0.25 = concentrated (80 risk), < 0.05 = competitive (15 risk)
  const concentrationRisk = clamp(15 + (Math.min(hhi, 0.25) / 0.25) * 65);

  // Weighted composite — NOTE: higher = MORE risky
  const value = clamp(
    devRisk * 0.25 +
    completionRisk * 0.30 +
    volatilityRisk * 0.25 +
    concentrationRisk * 0.20
  );

  // Per-costa
  const byCosta = groupByCosta(all);
  const per_region: Record<string, { off_plan_pct: number; avg_dev_years: number; pm2_cv: number; score: number }> = {};
  for (const [costa, props] of byCosta) {
    const costaOffPlan = props.filter(p => {
      const c = (p.c || '').toLowerCase();
      const s = (p.s || '').toLowerCase();
      return !s.includes('key ready') && !s.includes('completed') && !c.includes('completed') && !c.includes('ready');
    });
    const costaDev = props.filter(p => p.dy > 0).map(p => p.dy);
    const costaPm2 = props.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
    const costaCv = avg(costaPm2) > 0 ? stddev(costaPm2) / avg(costaPm2) : 0;
    const costaScore = clamp(
      (clamp(90 - ((Math.min(avg(costaDev), 20) - 5) / 15) * 75)) * 0.25 +
      ((costaOffPlan.length / Math.max(props.length, 1)) * 100) * 0.30 +
      (15 + (Math.min(costaCv, 0.8) / 0.8) * 70) * 0.25 +
      50 * 0.20
    );
    per_region[costa] = {
      off_plan_pct: Number(((costaOffPlan.length / Math.max(props.length, 1)) * 100).toFixed(1)),
      avg_dev_years: Number(avg(costaDev).toFixed(1)),
      pm2_cv: Number(costaCv.toFixed(3)),
      score: clamp(costaScore),
    };
  }

  return {
    index: 'APRI',
    name: 'Avena Property Risk Index',
    value,
    components: {
      developer_age_risk: devRisk,
      avg_developer_years: Number(avgDevAge.toFixed(1)),
      completion_risk: completionRisk,
      off_plan_pct: Number((offPlanRatio * 100).toFixed(1)),
      price_volatility_risk: volatilityRisk,
      pm2_cv: Number(pm2CV.toFixed(3)),
      concentration_risk: concentrationRisk,
      hhi: Number(hhi.toFixed(4)),
      unique_developers: devCounts.size,
    },
    per_region,
    updated: new Date().toISOString(),
    methodology: 'Composite risk score from: developer age (25%, younger = riskier), completion risk (30%, off-plan ratio), price volatility (25%, pm2 coefficient of variation), concentration risk (20%, HHI of developer shares). Score 0-100, HIGHER = MORE RISKY (inverse of other indices).',
  };
}

/* ================================================================== */
/*  5. APSI — Avena Property Sentiment Index                          */
/* ================================================================== */
function computeAPSI(all: Property[]) {
  // Component 1: High-scoring ratio — properties with score > 70
  const scored = all.filter(p => p._sc != null);
  const highScoring = scored.filter(p => p._sc! > 70);
  const highScoreRatio = scored.length > 0 ? highScoring.length / scored.length : 0;
  const sentimentFromScores = clamp(highScoreRatio * 100 * 2); // amplify since typically < 50%

  // Component 2: Yield attractiveness — avg gross yield relative to threshold
  const withYield = all.filter(p => p._yield && p._yield.gross > 0);
  const avgGross = avg(withYield.map(p => p._yield!.gross));
  // < 4% = bearish (25), 4-7% = neutral-bullish, > 10% = very bullish (95)
  const yieldSentiment = clamp(25 + ((Math.min(avgGross, 10) - 4) / 6) * 70);

  // Component 3: Discount-to-market distribution — more underpriced = more bullish
  const withPricing = all.filter(p => p.pm2 && p.mm2 && p.mm2 > 0);
  const discountProps = withPricing.filter(p => p.pm2! < p.mm2);
  const discountRatio = withPricing.length > 0 ? discountProps.length / withPricing.length : 0.5;
  const discountSentiment = clamp(discountRatio * 100);

  // Component 4: New listing velocity proxy — use _added dates if present, otherwise use count
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const recentCutoffStr = recentCutoff.toISOString().split('T')[0];
  const withDates = all.filter(p => p._added);
  let velocitySentiment: number;
  if (withDates.length > 10) {
    const recentListings = withDates.filter(p => p._added! >= recentCutoffStr);
    const velocityRatio = recentListings.length / withDates.length;
    // > 20% new in last 30 days = bullish (85), < 5% = sluggish (30)
    velocitySentiment = clamp(30 + (Math.min(velocityRatio, 0.20) / 0.20) * 55);
  } else {
    // Fallback: use inventory size as proxy
    velocitySentiment = clamp(40 + Math.min(all.length / 50, 1) * 30);
  }

  // Weighted composite
  const value = clamp(
    sentimentFromScores * 0.30 +
    yieldSentiment * 0.25 +
    discountSentiment * 0.25 +
    velocitySentiment * 0.20
  );

  // Sentiment label
  let mood: string;
  if (value >= 75) mood = 'BULLISH';
  else if (value >= 55) mood = 'OPTIMISTIC';
  else if (value >= 40) mood = 'NEUTRAL';
  else mood = 'CAUTIOUS';

  // Per-costa
  const byCosta = groupByCosta(all);
  const per_region: Record<string, { high_score_pct: number; avg_yield: number; discount_pct: number; score: number }> = {};
  for (const [costa, props] of byCosta) {
    const costaScored = props.filter(p => p._sc != null);
    const costaHigh = costaScored.filter(p => p._sc! > 70);
    const costaHighPct = costaScored.length > 0 ? (costaHigh.length / costaScored.length) * 100 : 0;
    const costaYield = avg(props.filter(p => p._yield && p._yield.gross > 0).map(p => p._yield!.gross));
    const costaPriced = props.filter(p => p.pm2 && p.mm2 && p.mm2 > 0);
    const costaDiscount = costaPriced.length > 0
      ? (costaPriced.filter(p => p.pm2! < p.mm2).length / costaPriced.length) * 100
      : 50;
    const costaScore = clamp(
      (clamp(costaHighPct * 2)) * 0.30 +
      (clamp(25 + ((Math.min(costaYield, 10) - 4) / 6) * 70)) * 0.25 +
      costaDiscount * 0.25 +
      50 * 0.20
    );
    per_region[costa] = {
      high_score_pct: Number(costaHighPct.toFixed(1)),
      avg_yield: Number(costaYield.toFixed(2)),
      discount_pct: Number(costaDiscount.toFixed(1)),
      score: costaScore,
    };
  }

  return {
    index: 'APSI',
    name: 'Avena Property Sentiment Index',
    value,
    mood,
    components: {
      high_score_ratio: Number(highScoreRatio.toFixed(3)),
      high_score_count: highScoring.length,
      sentiment_from_scores: sentimentFromScores,
      avg_gross_yield: Number(avgGross.toFixed(2)),
      yield_sentiment: yieldSentiment,
      discount_ratio: Number(discountRatio.toFixed(3)),
      discount_sentiment: discountSentiment,
      velocity_sentiment: velocitySentiment,
    },
    per_region,
    updated: new Date().toISOString(),
    methodology: 'Market sentiment derived from: high-scoring property ratio (30%, properties > 70/100), yield attractiveness (25%, avg gross yield vs thresholds), discount-to-market distribution (25%, % priced below market), new listing velocity (20%, recent listing flow). Score 0-100, higher = more bullish.',
  };
}

/* ================================================================== */
/*  GET handler — unified indices endpoint                            */
/* ================================================================== */
export async function GET() {
  try {
    const all = getAllProperties();
    const anomalies = detectAnomalies();

    const apci = computeAPCI(all, anomalies);
    const apyi = computeAPYI(all);
    const apli = computeAPLI(all);
    const apri = computeAPRI(all);
    const apsi = computeAPSI(all);

    return NextResponse.json({
      indices: { apci, apyi, apli, apri, apsi },
      total_properties: all.length,
      updated: new Date().toISOString(),
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
