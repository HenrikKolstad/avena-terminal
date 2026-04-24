/**
 * Avena Score Engine — public, reproducible property scoring pipeline.
 *
 * Scores ANY property given enough extractable features. The same formula
 * that powers /api/v1/properties. Open-source: github.com/avenaterminal/avena-score.
 *
 * Formula (v1.0):
 *   S = 100 × (0.40·V + 0.25·Y + 0.20·L + 0.10·Q + 0.05·R)   (capped 0–100)
 *
 *   V = Valuation (discount vs town/regional median €/m²)
 *   Y = Yield (gross rental yield normalized to 0–1 on 0–8% scale)
 *   L = Location (region tier + beach proximity)
 *   Q = Quality (property type + beds + built m² band)
 *   R = Risk (macro + liquidity — static 0.6 default in public engine)
 *
 * License: MIT
 * Reproduce: each component returns a 0–1 sub-score with its reasoning,
 * so the final Avena Score is fully auditable.
 */

export interface ScoreInput {
  price_eur: number;
  built_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  beach_km?: number | null;
  property_type?: string;   // villa | apartment | penthouse | townhouse | bungalow
  town?: string;
  region?: string;          // 'Costa Blanca', 'Costa del Sol', etc
  country?: string;         // ISO country name
  town_median_m2?: number | null; // €/m² in this town (if known)
  regional_median_m2?: number | null; // €/m² in region (fallback)
  status?: string;          // ready | under-construction | off-plan
  completion_year?: number;
}

export interface ScoreComponent {
  code: 'V' | 'Y' | 'L' | 'Q' | 'R';
  weight: number;
  value: number;               // 0–1 normalized
  reasoning: string;
}

export interface ScoreResult {
  score: number;                // 0–100
  components: ScoreComponent[];
  pm2: number | null;           // €/m²
  discount_vs_market_pct: number | null;
  yield_gross_pct: number | null;
  verdict: string;              // human-readable verdict
  methodology: 'v1.0';
  engine_version: 'v1.0';
  warnings: string[];
}

const REGION_TIER: Record<string, number> = {
  'costa blanca':       0.78,
  'costa del sol':      0.82,
  'costa calida':       0.68,
  'costa brava':        0.80,
  'balearics':          0.88,
  'canary islands':     0.78,
  'algarve':            0.82,
  'lisbon':             0.86,
  'madrid metro':       0.80,
  'valencia':           0.72,
  'paris':              0.92,
  'côte d\'azur':       0.92,
  'milan':              0.82,
  'cote d\'azur':       0.92,
  'riviera':            0.88,
};

const TYPE_QUALITY: Record<string, number> = {
  villa:       0.75,
  penthouse:   0.78,
  apartment:   0.62,
  townhouse:   0.68,
  bungalow:    0.60,
  studio:      0.55,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round(n: number, dp = 4): number {
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}

function formatPct(n: number): string {
  return (n * 100).toFixed(0) + '%';
}

export function scoreProperty(input: ScoreInput): ScoreResult {
  const warnings: string[] = [];
  const pm2 = input.built_m2 > 0 ? Math.round(input.price_eur / input.built_m2) : null;

  // V — valuation
  const marketPm2 = input.town_median_m2 ?? input.regional_median_m2 ?? null;
  let V = 0.5;
  let discount_vs_market_pct: number | null = null;
  if (pm2 != null && marketPm2 && marketPm2 > 0) {
    const gap = (marketPm2 - pm2) / marketPm2; // positive = below market
    discount_vs_market_pct = Math.round(gap * 100);
    // Map 0% → 0.5, +20% → 0.9, −20% → 0.1 (clamped)
    V = clamp01(0.5 + gap * 2);
  } else {
    warnings.push('No local €/m² comp available — V defaulted to 0.5.');
  }

  // Y — yield
  let Y = 0.5;
  let yield_gross_pct: number | null = null;
  if (input.built_m2 > 0 && input.price_eur > 0) {
    // Back-of-envelope yield: estimate monthly rent from €/m² × rent-ratio.
    // Rent ratio 0.4% of price/m² per month is a reasonable European new-build baseline.
    const estMonthlyRent = pm2 != null ? Math.max(400, pm2 * input.built_m2 * 0.0004) : 0;
    const annualRent = estMonthlyRent * 12;
    yield_gross_pct = Math.round((annualRent / input.price_eur) * 1000) / 10;
    // Map 3% → 0.3, 5% → 0.65, 7% → 0.95
    Y = clamp01((yield_gross_pct - 2) / 6);
  } else {
    warnings.push('Insufficient price/m² data — Y defaulted to 0.5.');
  }

  // L — location
  let L = 0.6;
  if (input.region) {
    const tier = REGION_TIER[input.region.toLowerCase().trim()];
    if (tier != null) L = tier;
    else warnings.push(`Region "${input.region}" not in tier table — L defaulted to 0.6.`);
  }
  if (input.beach_km != null) {
    if (input.beach_km <= 0.5) L = Math.min(0.95, L + 0.12);
    else if (input.beach_km <= 1.5) L = Math.min(0.95, L + 0.06);
    else if (input.beach_km > 10) L = Math.max(0.3, L - 0.08);
  }

  // Q — quality
  let Q = 0.6;
  if (input.property_type) {
    const typeVal = TYPE_QUALITY[input.property_type.toLowerCase().trim()];
    if (typeVal != null) Q = typeVal;
  }
  // Size band bump: 120–250 m² is the sweet spot for new-build families.
  if (input.built_m2 >= 120 && input.built_m2 <= 250) Q = Math.min(0.95, Q + 0.05);
  if (input.bedrooms && input.bedrooms >= 3) Q = Math.min(0.95, Q + 0.03);

  // R — risk (static in the public engine; internal Avena uses 20-feature regime)
  const R = 0.6;

  const components: ScoreComponent[] = [
    { code: 'V', weight: 0.40, value: round(V), reasoning: discount_vs_market_pct != null ? `${discount_vs_market_pct}% vs comp median (${formatPct(V)})` : 'no comp available' },
    { code: 'Y', weight: 0.25, value: round(Y), reasoning: yield_gross_pct != null ? `est. ${yield_gross_pct}% gross yield (${formatPct(Y)})` : 'insufficient data' },
    { code: 'L', weight: 0.20, value: round(L), reasoning: `${input.region ?? 'unknown region'}${input.beach_km != null ? ` · ${input.beach_km}km beach` : ''} (${formatPct(L)})` },
    { code: 'Q', weight: 0.10, value: round(Q), reasoning: `${input.property_type ?? 'unknown'} · ${input.bedrooms ?? '?'}bed · ${input.built_m2}m² (${formatPct(Q)})` },
    { code: 'R', weight: 0.05, value: round(R), reasoning: `public engine default — regime not modeled (${formatPct(R)})` },
  ];

  const composite = components.reduce((s, c) => s + c.value * c.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(composite * 100)));

  // Verdict
  let verdict = '';
  if (score >= 80) verdict = 'Alpha territory — top decile of scored European new-builds. Strong valuation, yield, and location triangulation.';
  else if (score >= 70) verdict = 'High conviction. Multiple components above market, worth contacting.';
  else if (score >= 60) verdict = 'Solid. Average-plus across the board, no single standout.';
  else if (score >= 45) verdict = 'Below threshold. Either mispriced, weak location, or both — worth negotiating hard.';
  else verdict = 'Avoid at current terms. Priced above comp with no compensating yield/location.';

  return {
    score,
    components,
    pm2,
    discount_vs_market_pct,
    yield_gross_pct,
    verdict,
    methodology: 'v1.0',
    engine_version: 'v1.0',
    warnings,
  };
}
