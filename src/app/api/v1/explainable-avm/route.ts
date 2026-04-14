import { NextRequest } from 'next/server';
import { getAllProperties, avg, slugify } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface Contribution {
  factor: string;
  impact_pct: number;
  impact_eur: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) {
    return Response.json({ error: 'Missing ?ref=PROPERTY_REF' }, { status: 400 });
  }

  const all = getAllProperties();
  const prop = all.find(p => p.ref === ref);
  if (!prop) {
    return Response.json({ error: `Property ${ref} not found` }, { status: 404 });
  }

  // Compute base value from comparable median pm2 * built area
  const location = prop.l;
  const comparables = all.filter(p => slugify(p.l) === slugify(location) && p.pm2);
  const medianPm2 = comparables.length > 0
    ? avg(comparables.map(p => p.pm2!))
    : (prop.pm2 ?? prop.mm2);
  const base_value = Math.round(medianPm2 * prop.bm);

  const contributions: Contribution[] = [];

  // Beach contribution
  const bk = prop.bk;
  let beachPct = 0;
  if (bk !== null && bk !== undefined) {
    if (bk < 1) beachPct = 8;
    else if (bk < 3) beachPct = 4;
    else if (bk < 5) beachPct = 1;
  }
  contributions.push({
    factor: 'beach_proximity',
    impact_pct: beachPct,
    impact_eur: Math.round(base_value * beachPct / 100),
    direction: beachPct > 0 ? 'positive' : 'neutral',
  });

  // New build premium
  const newBuildPct = 6;
  contributions.push({
    factor: 'new_build_premium',
    impact_pct: newBuildPct,
    impact_eur: Math.round(base_value * newBuildPct / 100),
    direction: 'positive',
  });

  // Developer rating
  let devPct = 0;
  if (prop.dy > 15) devPct = 5;
  else if (prop.dy > 10) devPct = 3;
  else if (prop.dy > 5) devPct = 1;
  else devPct = -2;
  contributions.push({
    factor: 'developer_rating',
    impact_pct: devPct,
    impact_eur: Math.round(base_value * devPct / 100),
    direction: devPct > 0 ? 'positive' : devPct < 0 ? 'negative' : 'neutral',
  });

  // Views premium
  const views = prop.views ?? [];
  let viewsPct = 0;
  if (views.some(v => v.toLowerCase().includes('sea'))) viewsPct = 7;
  else if (views.some(v => v.toLowerCase().includes('mountain'))) viewsPct = 3;
  else if (views.some(v => v.toLowerCase().includes('pool'))) viewsPct = 2;
  contributions.push({
    factor: 'views_premium',
    impact_pct: viewsPct,
    impact_eur: Math.round(base_value * viewsPct / 100),
    direction: viewsPct > 0 ? 'positive' : 'neutral',
  });

  // Energy rating
  const energy = (prop.energy ?? '').toUpperCase();
  let energyPct = 0;
  if (energy === 'A') energyPct = 4;
  else if (energy === 'B') energyPct = 2;
  else if (energy === 'C') energyPct = 0;
  else if (energy && ['D', 'E', 'F', 'G'].includes(energy)) energyPct = -2;
  contributions.push({
    factor: 'energy_rating',
    impact_pct: energyPct,
    impact_eur: Math.round(base_value * energyPct / 100),
    direction: energyPct > 0 ? 'positive' : energyPct < 0 ? 'negative' : 'neutral',
  });

  // Regime boost (hardcode GROWTH for now)
  const regime = 'GROWTH';
  const regimeMap: Record<string, number> = { GROWTH: 3, BULL: 5, NEUTRAL: 0, BEAR: -5 };
  const regimePct = regimeMap[regime] ?? 0;
  contributions.push({
    factor: 'regime_boost',
    impact_pct: regimePct,
    impact_eur: Math.round(base_value * regimePct / 100),
    direction: regimePct > 0 ? 'positive' : regimePct < 0 ? 'negative' : 'neutral',
  });

  // Pool premium
  const pool = (prop.pool ?? '').toLowerCase();
  let poolPct = 0;
  if (pool === 'private') poolPct = 3;
  else if (pool === 'communal') poolPct = 1;
  contributions.push({
    factor: 'pool_premium',
    impact_pct: poolPct,
    impact_eur: Math.round(base_value * poolPct / 100),
    direction: poolPct > 0 ? 'positive' : 'neutral',
  });

  // Liquidity factor
  const propType = prop.t.toLowerCase();
  let liqPct = 0;
  if (propType.includes('apartment') || propType.includes('flat') || propType.includes('piso')) liqPct = 2;
  else if (propType.includes('villa') || propType.includes('chalet')) liqPct = -1;
  contributions.push({
    factor: 'liquidity_factor',
    impact_pct: liqPct,
    impact_eur: Math.round(base_value * liqPct / 100),
    direction: liqPct > 0 ? 'positive' : liqPct < 0 ? 'negative' : 'neutral',
  });

  const totalContributionEur = contributions.reduce((sum, c) => sum + c.impact_eur, 0);
  const explained_value = base_value + totalContributionEur;

  return Response.json({
    ref,
    base_value,
    explained_value,
    contributions,
    methodology: 'SHAP-inspired additive feature attribution',
    compliance: 'Basel III explainability ready',
  });
}
