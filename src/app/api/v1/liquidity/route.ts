import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_FACTORS: Record<string, number> = {
  Apartment: 85,
  Townhouse: 70,
  Bungalow: 65,
  Penthouse: 60,
  Villa: 50,
};

function daysOnMarket(p: Property): number | null {
  if (!p._added) return null;
  const added = new Date(p._added);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)));
}

function beachFactor(bk: number | null): number {
  if (bk == null) return 50;
  if (bk < 2) return 80;
  if (bk < 5) return 65;
  return 50;
}

function priceBandFactor(price: number): number {
  if (price < 200_000) return 85;
  if (price <= 400_000) return 75;
  return 55;
}

function marketDepthScore(count: number): number {
  if (count >= 50) return 90;
  if (count >= 20) return 70;
  if (count >= 10) return 55;
  if (count >= 5) return 40;
  return 25;
}

function comparableVelocityScore(avgDom: number | null): number {
  if (avgDom == null) return 50;
  if (avgDom < 30) return 85;
  if (avgDom < 60) return 70;
  if (avgDom < 120) return 50;
  return 30;
}

function computeLiquidity(property: Property, comparables: Property[]) {
  const dom = daysOnMarket(property);
  const compDoms = comparables.map(daysOnMarket).filter((d): d is number => d !== null);
  const compVelocity = compDoms.length > 0 ? avg(compDoms) : null;

  const typeFactor = TYPE_FACTORS[property.t] ?? 50;
  const bFactor = beachFactor(property.bk);
  const pbFactor = priceBandFactor(property.pf);
  const mdScore = marketDepthScore(comparables.length);
  const cvScore = comparableVelocityScore(compVelocity);

  const liquidityScore = Math.round(
    typeFactor * 0.25 +
    bFactor * 0.20 +
    pbFactor * 0.20 +
    mdScore * 0.20 +
    cvScore * 0.15
  );

  const daysToSellEstimate = Math.round(100 - liquidityScore) + 30;

  let liquidityTier: 'HIGH' | 'MEDIUM' | 'LOW';
  if (liquidityScore > 75) liquidityTier = 'HIGH';
  else if (liquidityScore > 50) liquidityTier = 'MEDIUM';
  else liquidityTier = 'LOW';

  const exitConfidence = liquidityScore > 75 ? 'Strong' : liquidityScore > 50 ? 'Moderate' : 'Weak';

  return {
    ref: property.ref ?? null,
    name: `${property.p} - ${property.l}`,
    liquidity_score: liquidityScore,
    days_to_sell_estimate: daysToSellEstimate,
    liquidity_tier: liquidityTier,
    factors: {
      type_factor: typeFactor,
      beach_factor: bFactor,
      price_band_factor: pbFactor,
      market_depth: { count: comparables.length, score: mdScore },
      comparable_velocity: { avg_days: compVelocity !== null ? Math.round(compVelocity) : null, score: cvScore },
      days_on_market: dom,
    },
    exit_confidence: exitConfidence,
  };
}

export async function GET(request: NextRequest) {
  try {
    const ref = request.nextUrl.searchParams.get('ref');
    const all = getAllProperties();

    if (ref) {
      const property = all.find(p => p.ref === ref);
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      const comparables = all.filter(
        p => p.ref !== ref && p.l === property.l && p.t === property.t
      );

      const result = computeLiquidity(property, comparables);
      return NextResponse.json(result);
    }

    // Aggregate liquidity by region
    const towns = getUniqueTowns();
    const regionStats = towns.map(town => {
      const townProps = all.filter(p => p.l === town.town);
      const scores = townProps.map(p => {
        const comps = townProps.filter(c => c.ref !== p.ref && c.t === p.t);
        return computeLiquidity(p, comps).liquidity_score;
      });
      return {
        region: town.town,
        slug: town.slug,
        property_count: town.count,
        avg_liquidity_score: scores.length > 0 ? Math.round(avg(scores)) : 0,
        high_liquidity_count: scores.filter(s => s > 75).length,
        medium_liquidity_count: scores.filter(s => s > 50 && s <= 75).length,
        low_liquidity_count: scores.filter(s => s <= 50).length,
      };
    });

    return NextResponse.json({
      total_properties: all.length,
      regions: regionStats.sort((a, b) => b.avg_liquidity_score - a.avg_liquidity_score),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
