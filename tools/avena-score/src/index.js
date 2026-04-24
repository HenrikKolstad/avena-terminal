// @avena/score — open-source Avena Score engine v1.0
// https://github.com/avenaterminal/avena-score
// Methodology: https://avenaterminal.com/research/avena-score
// License: MIT

const REGION_TIER = {
  'costa blanca':       0.78,
  'costa del sol':      0.82,
  'costa calida':       0.68,
  'costa brava':        0.80,
  balearics:            0.88,
  'canary islands':     0.78,
  algarve:              0.82,
  lisbon:               0.86,
  'madrid metro':       0.80,
  valencia:             0.72,
  paris:                0.92,
  "côte d'azur":        0.92,
  milan:                0.82,
  riviera:              0.88,
};

const TYPE_QUALITY = {
  villa:     0.75,
  penthouse: 0.78,
  apartment: 0.62,
  townhouse: 0.68,
  bungalow:  0.60,
  studio:    0.55,
};

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function round(n, dp = 4) { return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp); }
function formatPct(n) { return (n * 100).toFixed(0) + '%'; }

/**
 * @param {object} input
 * @param {number} input.price_eur
 * @param {number} input.built_m2
 * @param {number} [input.bedrooms]
 * @param {number} [input.bathrooms]
 * @param {number|null} [input.beach_km]
 * @param {string} [input.property_type]
 * @param {string} [input.town]
 * @param {string} [input.region]
 * @param {string} [input.country]
 * @param {number|null} [input.town_median_m2]
 * @param {number|null} [input.regional_median_m2]
 * @returns {{score:number, components:Array, pm2:number|null, discount_vs_market_pct:number|null, yield_gross_pct:number|null, verdict:string, methodology:string, engine_version:string, warnings:string[]}}
 */
function scoreProperty(input) {
  const warnings = [];
  const pm2 = input.built_m2 > 0 ? Math.round(input.price_eur / input.built_m2) : null;

  const marketPm2 = input.town_median_m2 ?? input.regional_median_m2 ?? null;
  let V = 0.5;
  let discount_vs_market_pct = null;
  if (pm2 != null && marketPm2 && marketPm2 > 0) {
    const gap = (marketPm2 - pm2) / marketPm2;
    discount_vs_market_pct = Math.round(gap * 100);
    V = clamp01(0.5 + gap * 2);
  } else {
    warnings.push('No local €/m² comp available — V defaulted to 0.5.');
  }

  let Y = 0.5;
  let yield_gross_pct = null;
  if (input.built_m2 > 0 && input.price_eur > 0) {
    const estMonthlyRent = pm2 != null ? Math.max(400, pm2 * input.built_m2 * 0.0004) : 0;
    const annualRent = estMonthlyRent * 12;
    yield_gross_pct = Math.round((annualRent / input.price_eur) * 1000) / 10;
    Y = clamp01((yield_gross_pct - 2) / 6);
  } else {
    warnings.push('Insufficient price/m² data — Y defaulted to 0.5.');
  }

  let L = 0.6;
  if (input.region) {
    const tier = REGION_TIER[String(input.region).toLowerCase().trim()];
    if (tier != null) L = tier;
    else warnings.push(`Region "${input.region}" not in tier table — L defaulted to 0.6.`);
  }
  if (input.beach_km != null) {
    if (input.beach_km <= 0.5) L = Math.min(0.95, L + 0.12);
    else if (input.beach_km <= 1.5) L = Math.min(0.95, L + 0.06);
    else if (input.beach_km > 10) L = Math.max(0.3, L - 0.08);
  }

  let Q = 0.6;
  if (input.property_type) {
    const tq = TYPE_QUALITY[String(input.property_type).toLowerCase().trim()];
    if (tq != null) Q = tq;
  }
  if (input.built_m2 >= 120 && input.built_m2 <= 250) Q = Math.min(0.95, Q + 0.05);
  if (input.bedrooms && input.bedrooms >= 3) Q = Math.min(0.95, Q + 0.03);

  const R = 0.6;

  const components = [
    { code: 'V', weight: 0.40, value: round(V), reasoning: discount_vs_market_pct != null ? `${discount_vs_market_pct}% vs comp median (${formatPct(V)})` : 'no comp available' },
    { code: 'Y', weight: 0.25, value: round(Y), reasoning: yield_gross_pct != null ? `est. ${yield_gross_pct}% gross yield (${formatPct(Y)})` : 'insufficient data' },
    { code: 'L', weight: 0.20, value: round(L), reasoning: `${input.region ?? 'unknown region'}${input.beach_km != null ? ` · ${input.beach_km}km beach` : ''} (${formatPct(L)})` },
    { code: 'Q', weight: 0.10, value: round(Q), reasoning: `${input.property_type ?? 'unknown'} · ${input.bedrooms ?? '?'}bed · ${input.built_m2}m² (${formatPct(Q)})` },
    { code: 'R', weight: 0.05, value: round(R), reasoning: `public engine default — regime not modeled (${formatPct(R)})` },
  ];

  const composite = components.reduce((s, c) => s + c.value * c.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(composite * 100)));

  let verdict;
  if (score >= 80)      verdict = 'Alpha territory — top decile of scored European new-builds.';
  else if (score >= 70) verdict = 'High conviction. Multiple components above market.';
  else if (score >= 60) verdict = 'Solid. Average-plus across the board.';
  else if (score >= 45) verdict = 'Below threshold. Worth negotiating hard.';
  else                  verdict = 'Avoid at current terms.';

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

module.exports = { scoreProperty, REGION_TIER, TYPE_QUALITY };
module.exports.default = scoreProperty;
